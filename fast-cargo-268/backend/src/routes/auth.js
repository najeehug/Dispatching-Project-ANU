const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const prisma = require('../lib/db');
const { authenticate } = require('../middleware/auth');

const signToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// POST /api/auth/register — customer self-registration
router.post('/register', [
  body('phone').notEmpty().withMessage('Phone required'),
  body('name').trim().notEmpty(),
  body('password').isLength({ min: 6 }),
  body('email').optional().isEmail(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  const { phone, name, email, password } = req.body;
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { phone, name, email: email || null, passwordHash, role: 'CUSTOMER' },
    select: { id: true, phone: true, name: true, email: true, role: true },
  });

  res.status(201).json({ token: signToken(user.id), user });
});

// POST /api/auth/login
router.post('/login', [
  body('phone').notEmpty(),
  body('password').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  const { phone, password } = req.body;
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user || !user.passwordHash) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  res.json({
    token: signToken(user.id),
    user: { id: user.id, phone: user.phone, name: user.name, email: user.email, role: user.role },
  });
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  const { id, phone, name, email, role } = req.user;
  res.json({ id, phone, name, email, role });
});

module.exports = router;
