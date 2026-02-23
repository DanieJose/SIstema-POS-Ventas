const db = require('../config/db');

exports.obtenerDashboard = async (req, res) => {
    try {
        // 1. Calcular las ventas de HOY (Suma de dinero y cantidad de tickets)
        const queryVentasHoy = `
            SELECT 
                IFNULL(SUM(total), 0) AS total_vendido,
                COUNT(id) AS cantidad_facturas
            FROM facturas 
            WHERE DATE(fecha_emision) = CURRENT_DATE
        `;
        const [ventasHoy] = await db.query(queryVentasHoy);

        // 2. Alerta de Inventario (Joyas o Skincare con 10 o menos unidades)
        const queryStockBajo = `
            SELECT 
                p.nombre AS producto, 
                v.color, 
                v.stock_actual 
            FROM variantes v
            INNER JOIN productos p ON v.producto_id = p.id
            WHERE v.stock_actual <= 10
            ORDER BY v.stock_actual ASC
        `;
        const [stockBajo] = await db.query(queryStockBajo);

        // 3. Resumen de Apartados (Saber cuánto dinero está pendiente de cobro)
        const queryApartados = `
            SELECT 
                COUNT(id) AS apartados_activos, 
                IFNULL(SUM(saldo_pendiente), 0) AS dinero_en_calle
            FROM apartados
            WHERE estado = 'activo'
        `;
        const [apartados] = await db.query(queryApartados);

        // 4. Empaquetamos todo en un JSON hermoso para el frontend
        res.status(200).json({
            mensaje: 'Dashboard cargado exitosamente',
            resumen_hoy: {
                fecha: new Date().toLocaleDateString(),
                total_ingresos: `L. ${parseFloat(ventasHoy[0].total_vendido).toFixed(2)}`,
                facturas_emitidas: ventasHoy[0].cantidad_facturas
            },
            alertas_inventario: stockBajo,
            apartados: {
                activos: apartados[0].apartados_activos,
                dinero_pendiente: `L. ${parseFloat(apartados[0].dinero_en_calle).toFixed(2)}`
            }
        });

    } catch (error) {
        console.error('Error al cargar el dashboard:', error);
        res.status(500).json({ mensaje: 'Error interno al generar las estadísticas' });
    }
};