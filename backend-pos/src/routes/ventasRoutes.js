const express = require('express');
const router = express.Router();
const ventasController = require('../controllers/ventasController');
const { verificarToken } = require('../middlewares/authMiddleware');

// Endpoint Protegido: POST /api/ventas
// Usamos el token para saber qué cajero está cobrando
router.post('/', verificarToken, ventasController.crearVenta);
router.get('/factura/:id', verificarToken, ventasController.generarFacturaPDF);
module.exports = router;