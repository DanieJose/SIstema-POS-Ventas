const express = require('express');
const router = express.Router();
const inventarioController = require('../controllers/inventarioController');
const { verificarToken } = require('../middlewares/authMiddleware');

// Endpoint Protegido: GET /api/inventario
// Pasamos por el middleware verificarToken antes de llegar al controlador
router.get('/', verificarToken, inventarioController.obtenerInventario);
router.get('/etiquetas/:id', verificarToken, inventarioController.generarEtiquetaPDF);
module.exports = router;