const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const { connectDB } = require('./config/db');

const app = express();

const fs = require('fs');

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files when running locally
if (!process.env.VERCEL) {
  app.use(express.static(path.join(__dirname, '..')));
}

// ─── Database Middleware (Ensures connection before API calls) ────────────────
app.use(async (req, res, next) => {
  if (req.path.startsWith('/api') && req.path !== '/api/health') {
    try {
      await connectDB();
    } catch (err) {
      console.error('DB connect error:', err.message);
    }
  }
  next();
});

// ─── Health Check & API Status ────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  const { getDBStatus } = require('./config/db');
  res.json({
    success: true,
    message: '✅ Fitora API is live and running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    database: getDBStatus() ? 'Connected' : 'Disconnected (configure MONGO_URI in Vercel)',
    isVercel: !!process.env.VERCEL
  });
});

app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Fitora API root is operational',
    version: '1.0.0'
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',       require('./routes/authRoutes'));
app.use('/api/profile',    require('./routes/profileRoutes'));
app.use('/api/dashboard',  require('./routes/dashboardRoutes'));
app.use('/api/gym',        require('./routes/gymRoutes'));
app.use('/api/cricket',    require('./routes/cricketRoutes'));
app.use('/api/badminton',  require('./routes/badmintonRoutes'));
app.use('/api/diet',       require('./routes/dietRoutes'));
app.use('/api/progress',   require('./routes/progressRoutes'));
app.use('/api/calendar',   require('./routes/calendarRoutes'));
app.use('/api/steps',      require('./routes/stepRoutes'));

// ─── Catch-all: serve index.html for non-API route in local environment ONLY ─
if (!process.env.VERCEL) {
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ success: false, message: `API route not found: ${req.path}` });
    }
    const indexPath = path.join(__dirname, '..', 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      next();
    }
  });
}

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('🔴 Server Error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const { seedDefaultData } = require('./utils/seedData');

const startServer = async () => {
  await connectDB();
  await seedDefaultData();
  app.listen(PORT, () => {
    console.log('\n🏋️  ══════════════════════════════════════════════');
    console.log(`🚀  Fitora API Server running on http://localhost:${PORT}`);
    console.log(`🌐  Frontend available at  http://localhost:${PORT}`);
    console.log(`🔗  API Base URL           http://localhost:${PORT}/api`);
    console.log('🏋️  ══════════════════════════════════════════════\n');
  });
};

if (!process.env.VERCEL) {
  startServer();
}

module.exports = app;
