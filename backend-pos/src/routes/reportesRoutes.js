const express = require('express');
const router = express.Router();
const reportesController = require('../controllers/reportesController');
const { verificarToken } = require('../middlewares/authMiddleware');

// Endpoint Protegido: GET /api/reportes/dashboard
// Solo los administradores deberían ver esto (idealmente)
router.get('/dashboard', verificarToken, reportesController.obtenerDashboard);

module.exports = router;