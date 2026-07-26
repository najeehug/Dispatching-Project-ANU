const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const prisma = require('../lib/db');
const { authenticate, requireRole } = require('../middleware/auth');
const notify = require('../services/notifications');

router.use(authenticate, requireRole('DISPATCHER'));

// GET /api/dispatch/dashboard
router.get('/dashboard', async (_req, res) => {
  const [byStatus, avgCustoms, driversActive] = await Promise.all([
    prisma.package.groupBy({ by: ['status'], _count: { id: true } }),
    prisma.$queryRaw`
      SELECT AVG(
        EXTRACT(EPOCH FROM ("customsClearedAt" - "customsEntryAt")) / 3600
      )::float AS avg_hours
      FROM packages
      WHERE "customsEntryAt" IS NOT NULL AND "customsClearedAt" IS NOT NULL
    `,
    prisma.user.count({
      where: {
        role: 'DRIVER',
        driverAssignments: {
          some: { package: { status: { in: ['ASSIGNED', 'OUT_FOR_DELIVERY'] } } },
        },
      },
    }),
  ]);

  const statusMap = {};
  byStatus.forEach(({ status, _count }) => { statusMap[status] = _count.id; });

  res.json({
    statusMap,
    avgCustomsHours: avgCustoms[0]?.avg_hours ?? null,
    driversActive,
  });
});

// PATCH /api/dispatch/packages/:id/customs-entry
router.patch('/packages/:id/customs-entry', async (req, res) => {
  const { id } = req.params;
  const { officerName, entryAt } = req.body;

  const pkg = await prisma.package.findUnique({ where: { id } });
  if (!pkg) return res.status(404).json({ error: 'Package not found' });

  const updated = await prisma.package.update({
    where: { id },
    data: {
      status:              'AT_CUSTOMS',
      customsEntryAt:      entryAt ? new Date(entryAt) : new Date(),
      customsOfficerName:  officerName || null,
      customsEntryLoggedBy: req.user.id,
    },
  });

  await prisma.dispatchLog.create({
    data: {
      packageId:    id,
      dispatcherId: req.user.id,
      action:       'CUSTOMS_ENTRY',
      metadata:     { officerName },
    },
  });

  res.json(updated);
});

// PATCH /api/dispatch/packages/:id/customs-cleared
router.patch('/packages/:id/customs-cleared', async (req, res) => {
  const { id } = req.params;
  const pkg = await prisma.package.findUnique({ where: { id } });
  if (!pkg) return res.status(404).json({ error: 'Package not found' });
  if (!pkg.customsEntryAt) {
    return res.status(400).json({ error: 'Log customs entry time first' });
  }

  const updated = await prisma.package.update({
    where: { id },
    data: {
      status:              'CUSTOMS_CLEARED',
      customsClearedAt:    req.body.clearedAt ? new Date(req.body.clearedAt) : new Date(),
      customsClearLoggedBy: req.user.id,
    },
  });

  await prisma.dispatchLog.create({
    data: { packageId: id, dispatcherId: req.user.id, action: 'CUSTOMS_CLEARED' },
  });

  await notify.sendCustomsClearedNotification(updated).catch(console.error);
  res.json(updated);
});

// POST /api/dispatch/packages/:id/assign-driver
router.post('/packages/:id/assign-driver', [
  body('driverId').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  const { id } = req.params;
  const { driverId } = req.body;

  const [pkg, driver] = await Promise.all([
    prisma.package.findUnique({ where: { id }, include: { assignment: true } }),
    prisma.user.findUnique({ where: { id: driverId } }),
  ]);

  if (!pkg)    return res.status(404).json({ error: 'Package not found' });
  if (!driver || driver.role !== 'DRIVER') return res.status(400).json({ error: 'Invalid driver' });
  if (!pkg.pinLatitude || !pkg.pinLongitude) {
    return res.status(400).json({ error: 'Customer has not set a delivery pin yet' });
  }

  const assignment = await prisma.packageAssignment.upsert({
    where:  { packageId: id },
    create: { packageId: id, driverId, assignedBy: req.user.id },
    update: { driverId, assignedBy: req.user.id, assignedAt: new Date() },
  });

  await prisma.package.update({
    where: { id },
    data:  { status: 'ASSIGNED', assignedAt: new Date() },
  });

  await prisma.dispatchLog.create({
    data: {
      packageId:    id,
      dispatcherId: req.user.id,
      action:       'DRIVER_ASSIGNED',
      metadata:     { driverId, driverName: driver.name },
    },
  });

  await notify.sendDriverAssignment(pkg, driver).catch(console.error);
  res.json(assignment);
});

// POST /api/dispatch/packages/:id/send-pin-reminder
router.post('/packages/:id/send-pin-reminder', async (req, res) => {
  const pkg = await prisma.package.findUnique({
    where:   { id: req.params.id },
    include: { customer: true },
  });
  if (!pkg) return res.status(404).json({ error: 'Package not found' });

  await notify.sendPinRequest(pkg).catch(console.error);

  await prisma.dispatchLog.create({
    data: { packageId: pkg.id, dispatcherId: req.user.id, action: 'PIN_REMINDER_SENT' },
  });

  res.json({ message: 'Pin reminder sent' });
});

// GET /api/dispatch/drivers
router.get('/drivers', async (_req, res) => {
  const drivers = await prisma.user.findMany({
    where: { role: 'DRIVER' },
    select: {
      id: true, name: true, phone: true,
      driverLat: true, driverLng: true, driverLocationAt: true,
      driverAssignments: {
        where: { package: { status: { in: ['ASSIGNED', 'OUT_FOR_DELIVERY'] } } },
        select: { packageId: true },
      },
    },
  });

  res.json(drivers.map(d => ({
    id:              d.id,
    name:            d.name,
    phone:           d.phone,
    activeDeliveries: d.driverAssignments.length,
    lat:             d.driverLat,
    lng:             d.driverLng,
    locationAt:      d.driverLocationAt,
  })));
});

// GET /api/dispatch/packages/:id/logs
router.get('/packages/:id/logs', async (req, res) => {
  const logs = await prisma.dispatchLog.findMany({
    where:   { packageId: req.params.id },
    include: { dispatcher: { select: { name: true } } },
    orderBy: { createdAt: 'asc' },
  });
  res.json(logs);
});

module.exports = router;
