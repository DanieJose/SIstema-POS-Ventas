const db = require('../config/db');

exports.crearApartado = async (req, res) => {
    // 1. Recibimos el cliente, los artículos y el dinero que deja como anticipo
    const { cliente_id, abono_inicial = 0, detalles } = req.body;
    const usuario_id = req.usuario.id; // El cajero que está haciendo el trámite

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction(); // ¡Protección activada!

        let totalApartado = 0;

        // 2. Verificar que haya stock de las joyas solicitadas
        for (let item of detalles) {
            const [varianteBD] = await connection.query('SELECT precio_venta, stock_actual FROM variantes WHERE id = ?', [item.variante_id]);
            
            if (varianteBD.length === 0) throw new Error(`El artículo ID ${item.variante_id} no existe.`);
            if (varianteBD[0].stock_actual < item.cantidad) throw new Error(`Stock insuficiente para el artículo ID ${item.variante_id}.`);
            
            // Calculamos cuánto vale esta línea
            item.precio_unitario = varianteBD[0].precio_venta;
            item.subtotal = item.precio_unitario * item.cantidad;
            totalApartado += item.subtotal;
        }

        // 3. Calcular lo que queda debiendo
        const saldoPendiente = totalApartado - abono_inicial;
        if (saldoPendiente < 0) throw new Error('El abono no puede ser mayor al total del producto.');

        // 4. Crear el Apartado (Usamos MySQL para calcular los 8 días de plazo exactos)
        const queryApartado = `
            INSERT INTO apartados (cliente_id, usuario_id, total, saldo_pendiente, fecha_vencimiento, estado) 
            VALUES (?, ?, ?, ?, DATE_ADD(CURRENT_DATE, INTERVAL 8 DAY), 'activo')
        `;
        const [resultadoApartado] = await connection.query(queryApartado, [cliente_id, usuario_id, totalApartado, saldoPendiente]);
        const apartadoId = resultadoApartado.insertId;

        // 5. Guardar el detalle y RESTAR EL INVENTARIO
        for (let item of detalles) {
            await connection.query(
                'INSERT INTO detalle_apartados (apartado_id, variante_id, cantidad, precio_unitario, subtotal) VALUES (?, ?, ?, ?, ?)',
                [apartadoId, item.variante_id, item.cantidad, item.precio_unitario, item.subtotal]
            );
            
            // ¡Quitamos la joya de la vitrina virtual!
            await connection.query(
                'UPDATE variantes SET stock_actual = stock_actual - ? WHERE id = ?',
                [item.cantidad, item.variante_id]
            );
        }

        // 6. ¡Todo salió bien! Guardamos los cambios
        await connection.commit();

        // 7. Extraemos la fecha exacta de vencimiento para mostrársela al cliente
        const [fechaBD] = await connection.query('SELECT DATE_ADD(CURRENT_DATE, INTERVAL 8 DAY) AS vencimiento');

        res.status(201).json({
            mensaje: 'Joyas apartadas con éxito',
            numero_apartado: apartadoId,
            total_factura: `L. ${totalApartado.toFixed(2)}`,
            abono_dejado: `L. ${parseFloat(abono_inicial).toFixed(2)}`,
            saldo_pendiente: `L. ${saldoPendiente.toFixed(2)}`,
            fecha_limite_pago: fechaBD[0].vencimiento
        });

    } catch (error) {
        await connection.rollback(); // Si algo falla, las joyas regresan a la vitrina
        console.error('Error al crear apartado:', error);
        res.status(400).json({ mensaje: error.message });
    } finally {
        connection.release();
    }
};

exports.pagarApartado = async (req, res) => {
    const apartadoId = req.params.id; // Tomamos el ID del apartado desde la URL
    const { monto_pago } = req.body;  // Cuánto dinero trae el cliente hoy

    if (!monto_pago || monto_pago <= 0) {
        return res.status(400).json({ mensaje: 'El monto de pago debe ser mayor a 0.' });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction(); // Protegemos el dinero

        // 1. Buscar el apartado en la base de datos
        const [apartados] = await connection.query('SELECT * FROM apartados WHERE id = ?', [apartadoId]);

        if (apartados.length === 0) throw new Error('Apartado no encontrado.');
        const apartado = apartados[0];

        // 2. Validaciones de seguridad
        if (apartado.estado !== 'activo') {
            throw new Error(`No se puede recibir dinero. El estado actual de este apartado es: ${apartado.estado}`);
        }

        if (monto_pago > apartado.saldo_pendiente) {
            throw new Error(`El pago (L. ${monto_pago}) es mayor a lo que debe (L. ${apartado.saldo_pendiente}). Por favor, da el cambio correcto.`);
        }

        // 3. Restar el pago a la deuda
        const nuevoSaldo = apartado.saldo_pendiente - monto_pago;
        let nuevoEstado = 'activo';

        // Si la deuda llega a cero, ¡el apartado está oficialmente pagado!
        if (nuevoSaldo === 0) {
            nuevoEstado = 'pagado';
        }

        // 4. Actualizar el registro en MySQL
        await connection.query(
            'UPDATE apartados SET saldo_pendiente = ?, estado = ? WHERE id = ?',
            [nuevoSaldo, nuevoEstado, apartadoId]
        );

        // Confirmamos los cambios
        await connection.commit();

        // 5. Respondemos a Postman / App
        res.status(200).json({
            mensaje: nuevoEstado === 'pagado' ? '¡Liquidación completada! Puedes entregar la joyería al cliente.' : 'Abono parcial registrado correctamente.',
            abono_recibido: `L. ${parseFloat(monto_pago).toFixed(2)}`,
            saldo_restante: `L. ${nuevoSaldo.toFixed(2)}`,
            estado_apartado: nuevoEstado
        });

    } catch (error) {
        await connection.rollback(); // Si hay error, deshacemos el cobro
        console.error('Error al procesar pago de apartado:', error);
        res.status(400).json({ mensaje: error.message });
    } finally {
        connection.release();
    }
};