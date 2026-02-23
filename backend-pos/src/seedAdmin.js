const bcrypt = require('bcryptjs');
const db = require('./config/db');

async function crearSuperAdmin() {
    try {
        console.log('⏳ Generando Super Administradora...');

        // 1. Datos de la dueña
        const nombreCompleto = 'Maria Dueña'; // Puedes cambiarlo al nombre real
        const dni = '0101-1990-12345';
        const usuario = 'admin';
        const passwordPlana = 'CEUTEC2026!'; // Esta es la clave que usará en el Login
        const rolId = 1; // El ID que le dimos al Super Administrador en Workbench

        // 2. Encriptar la contraseña (Nivel de seguridad 10 saltos)
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(passwordPlana, salt);

        // 3. Insertar en MySQL
        const query = `
            INSERT INTO usuarios (nombre_completo, dni, usuario, password_hash, rol_id, estado)
            VALUES (?, ?, ?, ?, ?, 'activo')
        `;
        
        await db.query(query, [nombreCompleto, dni, usuario, passwordHash, rolId]);

        console.log('✅ ¡Super Administradora creada con éxito!');
        console.log(`👤 Usuario: ${usuario}`);
        console.log(`🔑 Contraseña: ${passwordPlana}`);
        
        process.exit(0); // Cierra el script correctamente
    } catch (error) {
        console.error('❌ Error al crear el usuario:', error.message);
        process.exit(1);
    }
}

crearSuperAdmin();