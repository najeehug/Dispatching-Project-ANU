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

// One-time setup endpoint — seeds the database with demo data
// Only works if no users exist yet. Hit: GET /api/setup
app.get('/api/setup', async (_req, res) => {
  try {
    const prisma = require('./lib/db');
    const count  = await prisma.user.count();
    if (count > 0) {
      return res.json({ message: 'Already set up', users: count });
    }
    // Dynamically require seed so it runs in this process
    const bcrypt = require('bcryptjs');
    const hash   = (pw) => bcrypt.hash(pw, 12);

    const dispatcher = await prisma.user.create({ data: { phone: '+12680000001', name: 'Port Dispatch', email: 'dispatch@fastcargo268.com', role: 'DISPATCHER', passwordHash: await hash('dispatch123') } });
    const driver1    = await prisma.user.create({ data: { phone: '+12680000002', name: 'Marcus Thomas',  email: 'marcus@fastcargo268.com',   role: 'DRIVER',     passwordHash: await hash('driver123'), driverLat: 17.1274, driverLng: -61.8468, driverLocationAt: new Date() } });
    await prisma.user.create({ data: { phone: '+12680000003', name: 'Sonia Clarke', email: 'sonia@fastcargo268.com', role: 'DRIVER', passwordHash: await hash('driver123'), driverLat: 17.0950, driverLng: -61.8500, driverLocationAt: new Date() } });
    const customer1  = await prisma.user.create({ data: { phone: '+12680000010', name: 'Keisha Williams', email: 'keisha@example.com', role: 'CUSTOMER', passwordHash: await hash('customer123') } });
    await prisma.user.create({ data: { phone: '+12680000011', name: 'Devon Charles',  email: 'devon@example.com',  role: 'CUSTOMER', passwordHash: await hash('customer123') } });
    await prisma.user.create({ data: { phone: '+12680000012', name: 'Sandra Jerome',  email: 'sandra@example.com', role: 'CUSTOMER', passwordHash: await hash('customer123') } });

    const pkg1 = await prisma.package.create({ data: { trackingNumber: 'FC268-2024-00841', customerId: customer1.id, description: 'Electronics — laptop', status: 'CUSTOMS_CLEARED', pinLatitude: 17.1274, pinLongitude: -61.8468, pinSetAt: new Date(), deliveryNotes: 'Blue gate, call on arrival', customsEntryAt: new Date(Date.now() - 5*3600000), customsClearedAt: new Date(Date.now() - 3600000), customsEntryLoggedBy: dispatcher.id, customsClearLoggedBy: dispatcher.id } });
    await prisma.package.create({ data: { trackingNumber: 'FC268-2024-00842', customerId: (await prisma.user.findUnique({ where: { phone: '+12680000011' } })).id, description: 'Clothing — 2 boxes', status: 'PIN_REQUESTED', customsEntryAt: new Date(Date.now() - 3*3600000) } });
    await prisma.packageAssignment.create({ data: { packageId: pkg1.id, driverId: driver1.id, assignedBy: dispatcher.id } });
    await prisma.package.update({ where: { id: pkg1.id }, data: { status: 'ASSIGNED', assignedAt: new Date() } });

    res.json({
      message: 'Database seeded successfully!',
      logins: {
        dispatcher: { phone: '+12680000001', password: 'dispatch123' },
        driver:     { phone: '+12680000002', password: 'driver123' },
        customer:   { phone: '+12680000010', password: 'customer123' },
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Error handler ──────────────────────────────────────────────────────────
app.use(errorHandler);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`FastCargo 268 API → http://0.0.0.0:${PORT}`);
});

module.exports = app;
