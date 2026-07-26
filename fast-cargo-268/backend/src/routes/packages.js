const router  = require('express').Router();
const { body, validationResult } = require('express-validator');
const prisma  = require('../lib/db');
const { authenticate, requireRole } = require('../middleware/auth');
const notify  = require('../services/notifications');

// GET /api/packages
router.get('/', authenticate, async (req, res) => {
  const { user } = req;
  const { status, search } = req.query;
  const where = {};

  if (user.role === 'CUSTOMER') where.customerId = user.id;
  if (user.role === 'DRIVER')   where.assignment = { driverId: user.id };
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { trackingNumber: { contains: search, mode: 'insensitive' } },
      { customer: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const packages = await prisma.package.findMany({
    where,
    include: {
      customer:   { select: { id: true, name: true, phone: true, email: true } },
      assignment: { include: { driver: { select: { id: true, name: true, phone: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(packages);
});

// GET /api/packages/track/:trackingNumber — public, no auth
router.get('/track/:trackingNumber', async (req, res) => {
  const pkg = await prisma.package.findUnique({
    where: { trackingNumber: req.params.trackingNumber },
    select: {
      id: true, trackingNumber: true, status: true, description: true,
      pinLatitude: true, pinLongitude: true, pinSetAt: true,
      customsEntryAt: true, customsClearedAt: true,
      assignedAt: true, deliveredAt: true, createdAt: true,
      customer:   { select: { name: true } },
      assignment: { include: { driver: { select: { name: true } } } },
    },
  });
  if (!pkg) return res.status(404).json({ error: 'Tracking number not found' });
  res.json(pkg);
});

// GET /api/packages/:id
router.get('/:id', authenticate, async (req, res) => {
  const pkg = await prisma.package.findUnique({
    where: { id: req.params.id },
    include: {
      customer:    { select: { id: true, name: true, phone: true, email: true } },
      assignment:  { include: { driver: { select: { id: true, name: true, phone: true } } } },
      dispatchLogs:{ include: { dispatcher: { select: { name: true } } }, orderBy: { createdAt: 'asc' } },
      notifications: { orderBy: { sentAt: 'desc' }, take: 10 },
    },
  });
  if (!pkg) return res.status(404).json({ error: 'Package not found' });
  if (req.user.role === 'CUSTOMER' && pkg.customerId !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  res.json(pkg);
});

// POST /api/packages — dispatcher creates package
router.post('/', authenticate, requireRole('DISPATCHER'), [
  body('trackingNumber').trim().notEmpty(),
  body('customerId').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  const { trackingNumber, customerId, description, weightKg, declaredValue } = req.body;

  const pkg = await prisma.package.create({
    data: {
      trackingNumber,
      customerId,
      description:   description   || null,
      weightKg:      weightKg      ? parseFloat(weightKg)      : null,
      declaredValue: declaredValue ? parseFloat(declaredValue) : null,
      status: 'PENDING_PIN',
    },
    include: { customer: { select: { id: true, name: true, phone: true, email: true } } },
  });

  await prisma.dispatchLog.create({
    data: {
      packageId:   pkg.id,
      dispatcherId: req.user.id,
      action:      'PACKAGE_CREATED',
      metadata:    { trackingNumber },
    },
  });

  // Send pin request email to customer
  await notify.sendPinRequest(pkg).catch(console.error);

  res.status(201).json(pkg);
});

// PATCH /api/packages/:id/pin — customer (or dispatcher) sets delivery pin
router.patch('/:id/pin', authenticate, [
  body('latitude').isFloat({ min: -90, max: 90 }),
  body('longitude').isFloat({ min: -180, max: 180 }),
  body('deliveryNotes').optional().trim().isLength({ max: 300 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  const pkg = await prisma.package.findUnique({ where: { id: req.params.id } });
  if (!pkg) return res.status(404).json({ error: 'Package not found' });

  if (req.user.role === 'CUSTOMER' && pkg.customerId !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { latitude, longitude, deliveryNotes } = req.body;

  const updated = await prisma.package.update({
    where: { id: req.params.id },
    data: {
      pinLatitude:  latitude,
      pinLongitude: longitude,
      deliveryNotes: deliveryNotes ?? pkg.deliveryNotes,
      pinSetAt: new Date(),
      status: ['PENDING_PIN', 'PIN_REQUESTED'].includes(pkg.status) ? 'PIN_SET' : pkg.status,
    },
  });
  res.json(updated);
});

// PATCH /api/packages/:id/deliver — driver marks delivered
router.patch('/:id/deliver', authenticate, requireRole('DRIVER'), async (req, res) => {
  const pkg = await prisma.package.findUnique({
    where: { id: req.params.id }, include: { assignment: true },
  });
  if (!pkg) return res.status(404).json({ error: 'Package not found' });
  if (pkg.assignment?.driverId !== req.user.id) {
    return res.status(403).json({ error: 'Not your package' });
  }

  const { latitude, longitude } = req.body;

  const [updated] = await prisma.$transaction([
    prisma.package.update({
      where: { id: pkg.id },
      data:  { status: 'DELIVERED', deliveredAt: new Date() },
    }),
    prisma.packageAssignment.update({
      where: { packageId: pkg.id },
      data:  { driverLatAtDelivery: latitude || null, driverLngAtDelivery: longitude || null },
    }),
  ]);

  await notify.sendDeliveryConfirmation(pkg).catch(console.error);
  res.json(updated);
});

module.exports = router;
