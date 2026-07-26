const router = require('express').Router();
const prisma = require('../lib/db');
const { authenticate, requireRole } = require('../middleware/auth');

// GET /api/drivers/my-deliveries
router.get('/my-deliveries', authenticate, requireRole('DRIVER'), async (req, res) => {
  const packages = await prisma.package.findMany({
    where: {
      assignment: { driverId: req.user.id },
      status: { in: ['ASSIGNED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED_DELIVERY'] },
    },
    include: {
      customer:   { select: { name: true, phone: true, email: true } },
      assignment: true,
    },
    orderBy: { assignedAt: 'desc' },
  });
  res.json(packages);
});

// PATCH /api/drivers/packages/:id/start-delivery
router.patch('/packages/:id/start-delivery', authenticate, requireRole('DRIVER'), async (req, res) => {
  const pkg = await prisma.package.findUnique({
    where: { id: req.params.id }, include: { assignment: true },
  });
  if (!pkg) return res.status(404).json({ error: 'Package not found' });
  if (pkg.assignment?.driverId !== req.user.id) return res.status(403).json({ error: 'Not your package' });

  const updated = await prisma.package.update({
    where: { id: req.params.id },
    data:  { status: 'OUT_FOR_DELIVERY' },
  });
  res.json(updated);
});

module.exports = router;
