const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

// ── Register ────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, phone, password } = req.body;

    if (!name || !phone || !password)
      return res.status(400).json({ message: 'Name, phone and password are required' });

    if (password.length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const exists = await User.findOne({ phone: phone.trim() });
    if (exists)
      return res.status(400).json({ message: 'This phone number is already registered' });

    const hashed = await bcrypt.hash(password, 12);

    // Generate unique username from name + random number
    const baseUsername = '@' + name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    let username = baseUsername + Math.floor(Math.random() * 9999);
    // Make sure username is unique
    while (await User.findOne({ username })) {
      username = baseUsername + Math.floor(Math.random() * 99999);
    }

    const user = await User.create({
      name: name.trim(),
      phone: phone.trim(),
      username,
      password: hashed,
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.status(201).json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        username: user.username,
        bio: user.bio,
      },
    });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// ── Login ───────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password)
      return res.status(400).json({ message: 'Phone and password are required' });

    const user = await User.findOne({ phone: phone.trim() });
    if (!user)
      return res.status(400).json({ message: 'No account found with this phone number' });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(400).json({ message: 'Incorrect password' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        username: user.username,
        bio: user.bio,
      },
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// ── Get My Profile ──────────────────────────────────
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Search by PHONE NUMBER (WhatsApp style) ─────────
router.get('/search/phone/:phone', auth, async (req, res) => {
  try {
    const phone = req.params.phone.trim();
    if (phone.length < 5)
      return res.json([]);

    const users = await User.find({
      phone: { $regex: phone, $options: 'i' },
      _id: { $ne: req.user.id }, // exclude self
    }).select('-password').limit(10);

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Search by USERNAME / USER ID (Telegram style) ───
router.get('/search/userid/:query', auth, async (req, res) => {
  try {
    const query = req.params.query.trim();
    if (query.length < 2)
      return res.json([]);

    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { name: { $regex: query, $options: 'i' } },
      ],
      _id: { $ne: req.user.id }, // exclude self
    }).select('-password').limit(10);

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Update Profile ──────────────────────────────────
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, bio, username } = req.body;
    const updates = {};
    if (name) updates.name = name.trim();
    if (bio !== undefined) updates.bio = bio;
    if (username) {
      const taken = await User.findOne({ username, _id: { $ne: req.user.id } });
      if (taken) return res.status(400).json({ message: 'Username already taken' });
      updates.username = username;
    }
    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;