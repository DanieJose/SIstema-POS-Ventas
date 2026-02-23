const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/authMiddleware');

// Endpoint Protegido: GET /api/usuarios/perfil
// Fíjate cómo ponemos "verificarToken" en el medio
router.get('/perfil', verificarToken, (req, res) => {
    // Si el middleware lo dejó pasar, respondemos con los datos que venían ocultos en el token
    res.status(200).json({
        mensaje: '¡Bienvenido a la zona segura!',
        datos_del_token: req.usuario
    });
});

module.exports = router;