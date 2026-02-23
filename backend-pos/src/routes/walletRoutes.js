const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const { verificarToken } = require('../middlewares/authMiddleware');

// Endpoint Protegido: POST /api/wallet/recarga
router.post('/recarga', verificarToken, walletController.recargarWallet);
// Ideal para que la App móvil muestre el saldo al iniciar sesión
router.get('/consulta/:id', verificarToken, walletController.consultarWallet);
module.exports = router;