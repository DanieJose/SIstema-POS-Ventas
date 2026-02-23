const db = require('../config/db');

exports.recargarWallet = async (req, res) => {
    // 1. Recibimos quién es el cliente, cuánto deposita y el comprobante
    const { cliente_id, monto, referencia } = req.body;

    // Validamos que no nos manden recargas en cero o negativas
    if (!cliente_id || !monto || monto <= 0) {
        return res.status(400).json({ mensaje: 'El cliente y un monto mayor a 0 son requeridos.' });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction(); // Iniciamos la protección "Todo o Nada"

        // 2. Verificar que el cliente tenga una Wallet activa
        const [wallets] = await connection.query('SELECT * FROM wallets WHERE cliente_id = ? AND estado = "activa"', [cliente_id]);
        
        if (wallets.length === 0) {
            throw new Error('Wallet no encontrada o bloqueada para este cliente.');
        }

        const wallet = wallets[0];

        // 3. Sumar el dinero real al saldo de la Wallet
        await connection.query('UPDATE wallets SET saldo = saldo + ? WHERE id = ?', [monto, wallet.id]);

        // 4. Registrar la transacción en el Historial (El "Estado de Cuenta")
        const queryHistorial = `
            INSERT INTO transacciones_wallet (wallet_id, tipo, monto, referencia) 
            VALUES (?, 'recarga', ?, ?)
        `;
        const refTexto = referencia ? referencia : 'Recarga en efectivo en Caja';
        await connection.query(queryHistorial, [wallet.id, monto, refTexto]);

        // 5. Confirmar los cambios en MySQL
        await connection.commit();

        // 6. Consultar el nuevo saldo para mostrárselo al cliente en la App
        const [walletActualizada] = await connection.query('SELECT saldo FROM wallets WHERE id = ?', [wallet.id]);

        res.status(200).json({
            mensaje: 'Recarga digital exitosa',
            recarga: `L. ${parseFloat(monto).toFixed(2)}`,
            nuevo_saldo: `L. ${parseFloat(walletActualizada[0].saldo).toFixed(2)}`,
            referencia: refTexto
        });

    } catch (error) {
        await connection.rollback(); // Si algo falla, el dinero no se suma por error
        console.error('Error al recargar wallet:', error);
        res.status(400).json({ mensaje: error.message });
    } finally {
        connection.release();
    }
};

exports.consultarWallet = async (req, res) => {
    const clienteId = req.params.id; // Tomamos el ID del cliente desde la URL

    try {
        // 1. Buscar la billetera de este cliente en MySQL
        const [wallets] = await db.query('SELECT * FROM wallets WHERE cliente_id = ?', [clienteId]);

        if (wallets.length === 0) {
            return res.status(404).json({ mensaje: 'Este cliente no tiene una Wallet activa.' });
        }

        const wallet = wallets[0];

        // 2. Obtener el historial de transacciones (Mostramos solo los últimos 5 movimientos)
        const queryHistorial = `
            SELECT tipo, monto, referencia, fecha 
            FROM transacciones_wallet 
            WHERE wallet_id = ? 
            ORDER BY fecha DESC LIMIT 5
        `;
        const [historial] = await db.query(queryHistorial, [wallet.id]);

        // 3. Formatear la respuesta para que Flutter o Vue la lean fácilmente
        res.status(200).json({
            mensaje: 'Perfil financiero recuperado con éxito',
            cliente_id: parseInt(clienteId),
            saldo_actual: `L. ${parseFloat(wallet.saldo).toFixed(2)}`,
            estado_cuenta: wallet.estado,
            ultimos_movimientos: historial.map(mov => ({
                tipo: mov.tipo.toUpperCase(),
                monto: `L. ${parseFloat(mov.monto).toFixed(2)}`,
                referencia: mov.referencia,
                fecha: new Date(mov.fecha).toLocaleString()
            }))
        });

    } catch (error) {
        console.error('Error al consultar wallet:', error);
        res.status(500).json({ mensaje: 'Error interno al consultar la cuenta.' });
    }
};