const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
    // 1. Leer el token de la cabecera (Header) de la petición
    const token = req.header('Authorization');

    // 2. Si no hay token, rechazamos el acceso
    if (!token) {
        return res.status(401).json({ mensaje: 'Acceso denegado. No hay token de seguridad.' });
    }

    try {
        // 3. Quitar la palabra "Bearer " si viene incluida en el token
        const tokenLimpio = token.replace('Bearer ', '');

        // 4. Verificar si el token es válido y no ha expirado usando nuestra clave secreta
        const decodificado = jwt.verify(tokenLimpio, process.env.JWT_SECRET);

        // 5. Guardar los datos del usuario (id, rol, permisos) en la petición para usarlos después
        req.usuario = decodificado;

        // 6. Dar permiso para continuar a la siguiente ruta
        next();
    } catch (error) {
        res.status(401).json({ mensaje: 'Token inválido o expirado.' });
    }
};

module.exports = { verificarToken };