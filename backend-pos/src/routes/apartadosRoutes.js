const express = require('express');
const router = express.Router();
const apartadosController = require('../controllers/apartadosController');
const { verificarToken } = require('../middlewares/authMiddleware');

// Endpoint Protegido: POST /api/apartados
router.post('/', verificarToken, apartadosController.crearApartado);
router.post('/:id/pagar', verificarToken, apartadosController.pagarApartado);

module.exports = router;