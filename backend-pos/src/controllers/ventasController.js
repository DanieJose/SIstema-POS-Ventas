const db = require('../config/db');
const PDFDocument = require('pdfkit');

exports.generarFacturaPDF = async (req, res) => {
    const facturaId = req.params.id;

    try {
        // 1. Obtener el encabezado de la factura y datos del SAR
        const queryEncabezado = `
            SELECT f.numero_factura, f.fecha_emision, f.subtotal, f.isv, f.total, f.metodo_pago,
                   c.nombre AS cliente, c.rtn, u.nombre_completo AS cajero,
                   ps.cai, ps.rango_inicial, ps.rango_final, ps.fecha_limite_emision
            FROM facturas f
            INNER JOIN clientes c ON f.cliente_id = c.id
            INNER JOIN usuarios u ON f.usuario_id = u.id
            INNER JOIN parametros_sar ps ON f.cai_id = ps.id
            WHERE f.id = ?
        `;
        const [encabezado] = await db.query(queryEncabezado, [facturaId]);

        if (encabezado.length === 0) {
            return res.status(404).json({ mensaje: 'Factura no encontrada' });
        }

        const factura = encabezado[0];

        // 2. Obtener los detalles
        const queryDetalles = `
            SELECT p.nombre AS producto, df.cantidad, df.precio_unitario, df.subtotal
            FROM detalle_facturas df
            INNER JOIN variantes v ON df.variante_id = v.id
            INNER JOIN productos p ON v.producto_id = p.id
            WHERE df.factura_id = ?
        `;
        const [detalles] = await db.query(queryDetalles, [facturaId]);

        // 3. Crear el lienzo del PDF (Hicimos el ticket un poco más largo para que quepa todo)
        const doc = new PDFDocument({ margin: 15, size: [226, 650] });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Factura-${factura.numero_factura}.pdf`);
        
        doc.pipe(res);

        // --- DISEÑO DEL TICKET ---
        doc.fontSize(14).font('Helvetica-Bold').text('SISTEMA POS', { align: 'center' });
        doc.fontSize(9).font('Helvetica').text('La Ceiba, Atlántida', { align: 'center' });
        doc.text('RTN: 01019012345678', { align: 'center' });
        doc.moveDown();

        doc.fontSize(8).text(`CAI: ${factura.cai}`, { align: 'center' });
        doc.text(`Rango: ${factura.rango_inicial} al ${factura.rango_final}`, { align: 'center' });
        doc.text(`Límite: ${new Date(factura.fecha_limite_emision).toLocaleDateString()}`, { align: 'center' });
        doc.moveDown();

        doc.fontSize(9).font('Helvetica-Bold').text(`Factura: ${factura.numero_factura}`);
        doc.font('Helvetica').text(`Fecha: ${new Date(factura.fecha_emision).toLocaleString()}`);
        doc.text(`Cliente: ${factura.cliente}`);
        doc.text(`Cajero: ${factura.cajero}`);
        doc.text('------------------------------------------------');

        doc.font('Helvetica-Bold').text('CANT  DESCRIPCION          TOTAL');
        doc.font('Helvetica');
        
        detalles.forEach(item => {
            const nombreCorto = item.producto.substring(0, 15).padEnd(16, ' ');
            doc.text(`${item.cantidad}x   ${nombreCorto} L.${item.subtotal}`);
        });

        doc.text('------------------------------------------------');

        // --- SECCIÓN DE TOTALES SAR ACTUALIZADA ---
        doc.text(`Descuento: L. 0.00`, { align: 'right' });
        doc.text(`Exonerado: L. 0.00`, { align: 'right' });
        doc.text(`Subtotal: L. ${factura.subtotal}`, { align: 'right' });
        doc.text(`ISV (15%): L. ${factura.isv}`, { align: 'right' });
        doc.text(`ISV (18%): L. 0.00`, { align: 'right' });
        
        doc.moveDown(0.5);
        doc.font('Helvetica-Bold').fontSize(11).text(`TOTAL Pagar: L. ${factura.total}`, { align: 'right' });
        doc.moveDown(0.5);

        // --- SECCIÓN DE PAGO (EFECTIVO Y CAMBIO) ---
        doc.font('Helvetica').fontSize(9);
        // Si el pago es en efectivo, simulamos que nos dio el dinero exacto por ahora.
        const efectivoMostrado = factura.metodo_pago === 'efectivo' ? factura.total : '0.00';
        
        doc.text(`EFECTIVO: L. ${efectivoMostrado}`, { align: 'right' });
        doc.text(`CAMBIO: L. 0.00`, { align: 'right' });
        
        doc.moveDown();
        doc.fontSize(8).text(`Pago mediante: ${factura.metodo_pago.toUpperCase()}`, { align: 'center' });
        doc.moveDown();
        doc.text('¡Gracias por su compra!', { align: 'center' });
        doc.text('Exija su factura, es beneficio de todos', { align: 'center' });

        // 4. Cerrar el PDF
        doc.end();

    } catch (error) {
        console.error('Error detectado:', error);
        if (!res.headersSent) {
            res.status(500).json({ mensaje: 'Error al crear el recibo', detalle: error.message });
        } else {
            res.end(); 
        }
    }
};

exports.crearVenta = async (req, res) => {
    // 1. Recibimos los datos de la venta desde Postman (o la app)
    const { cliente_id = 1, metodo_pago, detalles } = req.body;
    const usuario_id = req.usuario.id; // El ID del cajero viene oculto en el Token JWT

    // 2. Iniciamos la conexión para la Transacción Segura
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction(); // ¡Inicia la magia "Todo o Nada"!

        // 3. Obtener el talonario SAR activo
        const [sarParams] = await connection.query('SELECT * FROM parametros_sar WHERE estado = "activo" LIMIT 1');
        if (sarParams.length === 0) throw new Error('No hay talonario SAR activo configurado.');
        const sar = sarParams[0];

        // Formatear el número de factura legal (Ej: 000-001-01-00000001)
        const correlativoAjustado = String(sar.correlativo_actual).padStart(8, '0');
        const numeroFactura = `${sar.rango_inicial.substring(0, 11)}${correlativoAjustado}`;

        // 4. Calcular los totales y verificar el inventario
        let subtotalVenta = 0;
        
        for (let item of detalles) {
            // Consultamos cuánto cuesta y cuánto stock hay de cada artículo
            const [varianteBD] = await connection.query('SELECT precio_venta, stock_actual FROM variantes WHERE id = ?', [item.variante_id]);
            
            if (varianteBD.length === 0) throw new Error(`El artículo con ID ${item.variante_id} no existe.`);
            if (varianteBD[0].stock_actual < item.cantidad) throw new Error(`Stock insuficiente para el artículo ID ${item.variante_id}.`);
            
            item.precio_unitario = varianteBD[0].precio_venta;
            item.subtotal_linea = item.precio_unitario * item.cantidad;
            subtotalVenta += item.subtotal_linea;
        }

        // 5. Cálculo de Impuestos (15% ISV)
        const isvVenta = subtotalVenta * 0.15;
        const totalVenta = subtotalVenta + isvVenta;

        // 6. Guardar la Factura (Encabezado)
        const queryFactura = `
            INSERT INTO facturas (numero_factura, cai_id, cliente_id, usuario_id, subtotal, isv, total, metodo_pago) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [resultadoFactura] = await connection.query(queryFactura, [
            numeroFactura, sar.id, cliente_id, usuario_id, subtotalVenta, isvVenta, totalVenta, metodo_pago
        ]);
        const facturaId = resultadoFactura.insertId;

        // 7. Guardar los Detalles y Restar el Inventario
        for (let item of detalles) {
            // Insertar línea de la factura
            await connection.query(
                'INSERT INTO detalle_facturas (factura_id, variante_id, cantidad, precio_unitario, subtotal) VALUES (?, ?, ?, ?, ?)',
                [facturaId, item.variante_id, item.cantidad, item.precio_unitario, item.subtotal_linea]
            );
            
            // ¡Restar el stock!
            await connection.query(
                'UPDATE variantes SET stock_actual = stock_actual - ? WHERE id = ?',
                [item.cantidad, item.variante_id]
            );
        }

        // 8. Actualizar el número de la siguiente factura del SAR
        await connection.query('UPDATE parametros_sar SET correlativo_actual = correlativo_actual + 1 WHERE id = ?', [sar.id]);

        // 9. Si todo salió perfecto, confirmamos los cambios en MySQL
        await connection.commit();
        
        res.status(201).json({ 
            mensaje: 'Factura emitida con éxito', 
            factura: numeroFactura, 
            total_pagar: `L. ${totalVenta.toFixed(2)}` 
        });

    } catch (error) {
        // Si CUALQUIER paso falla, revertimos todos los cambios
        await connection.rollback();
        console.error('Error en la venta:', error);
        res.status(400).json({ mensaje: error.message });
    } finally {
        connection.release(); // Soltamos la conexión para que otro cajero la pueda usar
    }
};