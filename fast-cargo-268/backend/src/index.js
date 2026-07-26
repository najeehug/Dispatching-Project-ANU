require('dotenv').config();
require('express-async-errors');

const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const morgan    = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes     = require('./routes/auth');
const packageRoutes  = require('./routes/packages');
const dispatchRoutes = require('./routes/dispatch');
const driverRoutes   = require('./routes/drivers');
const customerRoutes = require('./routes/customers');
const locationRoutes = require('./routes/location');
const { errorHandler } = require('./middleware/errorHandler');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

// ── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/packages',  packageRoutes);
app.use('/api/dispatch',  dispatchRoutes);
app.use('/api/drivers',   driverRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/location',  locationRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'FastCargo 268' }));

// ── Error handler ──────────────────────────────────────────────────────────
app.use(errorHandler);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`FastCargo 268 API → http://localhost:${PORT}`);
});

module.exports = app;
