const router = require('express').Router();
const bcrypt = require('bcryptjs');
const prisma = require('../lib/db');
const { authenticate, requireRole } = require('../middleware/auth');

// POST /api/customers — dispatcher creates customer
router.post('/', authenticate, requireRole('DISPATCHER'), async (req, res) => {
  const { phone, name, email } = req.body;
  if (!phone || !name) return res.status(422).json({ error: 'phone and name are required' });

  const tempPassword = Math.random().toString(36).slice(-8);
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const customer = await prisma.user.create({
    data: { phone, name, email: email || null, passwordHash, role: 'CUSTOMER' },
    select: { id: true, phone: true, name: true, email: true, role: true },
  });

  res.status(201).json({ ...customer, tempPassword });
});

// POST /api/customers/driver — dispatcher creates a driver account
router.post('/driver', authenticate, requireRole('DISPATCHER'), async (req, res) => {
  const { phone, name, email } = req.body;
  if (!phone || !name) return res.status(422).json({ error: 'phone and name are required' });

  const tempPassword = Math.random().toString(36).slice(-8);
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const driver = await prisma.user.create({
    data: { phone, name, email: email || null, passwordHash, role: 'DRIVER' },
    select: { id: true, phone: true, name: true, email: true, role: true },
  });

  res.status(201).json({ ...driver, tempPassword });
});

// GET /api/customers — list customers
router.get('/', authenticate, requireRole('DISPATCHER'), async (_req, res) => {
  const customers = await prisma.user.findMany({
    where: { role: 'CUSTOMER' },
    select: {
      id: true, name: true, phone: true, email: true, createdAt: true,
      _count: { select: { packages: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(customers);
});

module.exports = router;
