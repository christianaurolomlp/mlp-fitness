require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./src/db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/rutinas', require('./src/routes/rutinas'));
app.use('/api/ejercicios', require('./src/routes/ejercicios'));
app.use('/api/entrenos', require('./src/routes/entrenos'));
app.use('/api/stats', require('./src/routes/stats'));
app.use('/api/campanas', require('./src/routes/campanas'));

// Servir frontend compilado en producción
const distPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const start = async () => {
  try {
    await initDB();
    app.listen(PORT, () => {
      console.log(`🚀 MLP FITNESS corriendo en puerto ${PORT}`);
    });
  } catch (err) {
    console.error('❌ Error al iniciar:', err);
    process.exit(1);
  }
};

start();
