const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {
    const { usuario, password } = req.body;

    try {
        // 1. Buscar al usuario en MySQL
        const [users] = await db.query('SELECT * FROM usuarios WHERE usuario = ? AND estado = "activo"', [usuario]);
        
        if (users.length === 0) {
            return res.status(401).json({ mensaje: 'Credenciales inválidas o usuario inactivo' });
        }

        const user = users[0];

        // 2. Verificar la contraseña encriptada
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ mensaje: 'Credenciales inválidas' });
        }

        // 3. Consultar los permisos dinámicos asignados al Rol de este usuario
        const queryPermisos = `
            SELECT p.nombre_permiso 
            FROM rol_permisos rp 
            INNER JOIN permisos p ON rp.permiso_id = p.id 
            WHERE rp.rol_id = ?
        `;
        const [permisosResult] = await db.query(queryPermisos, [user.rol_id]);
        
        // Convertimos el resultado en un arreglo simple, ej: ['acceso_pos', 'anular_factura']
        const permisos = permisosResult.map(p => p.nombre_permiso);

        // 4. Generar el Token JWT
        const token = jwt.sign(
            { 
                id: user.id, 
                rol_id: user.rol_id, 
                permisos: permisos 
            },
            process.env.JWT_SECRET,
            { expiresIn: '8h' } // El turno normal de un cajero
        );

        // 5. Responder al frontend (Vue o Flutter)
        res.status(200).json({
            mensaje: 'Login exitoso',
            token: token,
            usuario: {
                nombre: user.nombre_completo,
                rol_id: user.rol_id,
                permisos: permisos
            }
        });

    } catch (error) {
        console.error('Error en el login:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
};