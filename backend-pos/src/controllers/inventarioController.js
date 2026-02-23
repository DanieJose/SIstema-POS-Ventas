const db = require('../config/db');
const bwipjs = require('bwip-js');
const PDFDocument = require('pdfkit');


exports.generarEtiquetaPDF = async (req, res) => {
    const varianteId = req.params.id; // Tomamos el ID de la URL

    try {
        // 1. Buscar los datos exactos del producto en MySQL
        const query = `
            SELECT p.nombre, v.codigo_barras, v.precio_venta 
            FROM variantes v
            INNER JOIN productos p ON v.producto_id = p.id
            WHERE v.id = ?
        `;
        const [variantes] = await db.query(query, [varianteId]);

        if (variantes.length === 0) {
            return res.status(404).json({ mensaje: 'Producto no encontrado' });
        }

        const articulo = variantes[0];

        // 2. Dibujar el Código de Barras (Formato Code128)
        const codigoBarrasBuffer = await bwipjs.toBuffer({
            bcid: 'code128',       // Tipo de código de barras universal
            text: articulo.codigo_barras, // El número de nuestra base de datos
            scale: 3,              // Tamaño
            height: 10,            // Altura de las barras
            includetext: true,     // Mostrar los números abajo de las barras
            textxalign: 'center',  // Centrar los números
        });

        // 3. Crear el lienzo del PDF (Tamaño de una etiqueta adhesiva estándar)
        const doc = new PDFDocument({ size: [200, 120], margin: 10 });

        // 4. Configurar la respuesta de Express para que sepa que es un PDF descargable
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=etiqueta-${articulo.codigo_barras}.pdf`);

        // Conectar el documento PDF a la respuesta de Postman/Navegador
        doc.pipe(res);

        // 5. Escribir y dibujar en la etiqueta
        // Nombre del producto
        doc.fontSize(10).text(articulo.nombre, { align: 'center' });
        
        // Precio en Lempiras
        doc.fontSize(12).font('Helvetica-Bold').text(`L. ${articulo.precio_venta}`, { align: 'center' });
        
        // Un pequeño espacio
        doc.moveDown(0.5);

        // Pegar la imagen del código de barras centrada
        doc.image(codigoBarrasBuffer, 25, 55, { width: 150 });

        // 6. Cerrar el documento (Esto envía el PDF al usuario)
        doc.end();

    } catch (error) {
        console.error('Error al generar PDF:', error);
        res.status(500).json({ mensaje: 'Error interno al crear la etiqueta' });
    }
};

exports.obtenerInventario = async (req, res) => {
    try {
        // Hacemos un JOIN para unir el producto, su categoría y los detalles de la variante
        const query = `
            SELECT 
                v.id AS variante_id,
                p.nombre AS producto,
                c.nombre AS categoria,
                v.sku,
                v.codigo_barras,
                v.precio_venta,
                v.stock_actual,
                v.color,
                v.material
            FROM variantes v
            INNER JOIN productos p ON v.producto_id = p.id
            INNER JOIN categorias c ON p.categoria_id = c.id
            WHERE p.estado = 'activo'
        `;
        
        const [inventario] = await db.query(query);
        
        // Respondemos con los datos en formato JSON
        res.status(200).json({
            mensaje: 'Inventario recuperado exitosamente',
            total_articulos: inventario.length,
            datos: inventario
        });

    } catch (error) {
        console.error('Error al obtener inventario:', error);
        res.status(500).json({ mensaje: 'Error interno al cargar el inventario' });
    }
};