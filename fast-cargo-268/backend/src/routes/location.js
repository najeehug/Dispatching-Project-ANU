// Driver location tracking — completely free using browser Geolocation API
const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const prisma = require('../lib/db');
const { authenticate, requireRole } = require('../middleware/auth');

// POST /api/location — driver updates their live location (called every 15s by driver app)
router.post('/', authenticate, requireRole('DRIVER'), [
  body('lat').isFloat({ min: -90,  max: 90  }),
  body('lng').isFloat({ min: -180, max: 180 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  const { lat, lng } = req.body;

  await prisma.user.update({
    where: { id: req.user.id },
    data: {
      driverLat:        lat,
      driverLng:        lng,
      driverLocationAt: new Date(),
    },
  });

  res.json({ ok: true });
});

// GET /api/location/drivers — dispatcher gets all active driver locations
router.get('/drivers', authenticate, requireRole('DISPATCHER'), async (_req, res) => {
  const drivers = await prisma.user.findMany({
    where: {
      role: 'DRIVER',
      driverLat: { not: null },
      driverLng: { not: null },
    },
    select: {
      id:              true,
      name:            true,
      driverLat:       true,
      driverLng:       true,
      driverLocationAt: true,
      driverAssignments: {
        where: {
          package: { status: { in: ['ASSIGNED', 'OUT_FOR_DELIVERY'] } },
        },
        select: {
          package: {
            select: {
              trackingNumber: true,
              status:         true,
              customer:       { select: { name: true } },
            },
          },
        },
      },
    },
  });

  // Mark drivers as stale if location is older than 2 minutes
  const now = Date.now();
  const result = drivers.map(d => ({
    ...d,
    isActive: d.driverLocationAt
      ? (now - new Date(d.driverLocationAt).getTime()) < 2 * 60 * 1000
      : false,
  }));

  res.json(result);
});

module.exports = router;
