const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: '../.env' }); // Apuntamos al archivo .env en la raíz

const authRoutes = require('./routes/authRoutes');
const usuarioRoutes = require('./routes/usuarioRoutes');
const inventarioRoutes = require('./routes/inventarioRoutes');
const ventasRoutes = require('./routes/ventasRoutes');
const app = express();

// Middlewares globales
app.use(cors()); // Permite que Vue y Flutter se conecten sin bloqueos
app.use(express.json()); // Permite recibir datos en formato JSON

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/ventas', ventasRoutes);

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor POS corriendo en el puerto ${PORT}`);
});