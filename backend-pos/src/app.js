const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: '../.env' }); // Apuntamos al archivo .env en la raíz

const authRoutes = require('./routes/authRoutes');
const usuarioRoutes = require('./routes/usuarioRoutes');
const inventarioRoutes = require('./routes/inventarioRoutes');
const ventasRoutes = require('./routes/ventasRoutes');
const walletRoutes = require('./routes/walletRoutes');
const apartadosRoutes = require('./routes/apartadosRoutes')
const reportesRoutes = require('./routes/reportesRoutes');

const app = express();

// Middlewares globales
app.use(cors()); // Permite que Vue y Flutter se conecten sin bloqueos
app.use(express.json()); // Permite recibir datos en formato JSON

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/apartados', apartadosRoutes);
app.use('/api/reportes', reportesRoutes);


// Iniciar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor POS corriendo y listo para Flutter/Vue en el puerto ${PORT}`);
});