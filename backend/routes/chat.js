const router = require('express').Router();
const auth = require('../middleware/auth');
const Chat = require('../models/Chat');
const Message = require('../models/Message');

// ── Get all chats for logged-in user ───────────────
router.get('/', auth, async (req, res) => {
  try {
    const chats = await Chat.find({ members: req.user.id })
      .populate('members', '-password')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'name username' },
      })
      .sort({ updatedAt: -1 });
    res.json(chats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Open or create 1-to-1 chat ─────────────────────
router.post('/open', auth, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: 'userId is required' });
    if (userId === req.user.id)
      return res.status(400).json({ message: 'Cannot chat with yourself' });

    // Find existing chat between these two users
    let chat = await Chat.findOne({
      isGroup: false,
      members: { $all: [req.user.id, userId], $size: 2 },
    }).populate('members', '-password').populate('lastMessage');

    if (!chat) {
      chat = await Chat.create({ members: [req.user.id, userId], isGroup: false });
      await chat.populate('members', '-password');
    }

    res.json(chat);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Get messages for a chat ─────────────────────────
router.get('/:chatId/messages', auth, async (req, res) => {
  try {
    // Verify user is member of this chat
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      members: req.user.id,
    });
    if (!chat) return res.status(403).json({ message: 'Access denied' });

    const messages = await Message.find({ chatId: req.params.chatId })
      .populate('sender', 'name username phone')
      .populate('replyTo', 'text sender')
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Create group chat ───────────────────────────────
router.post('/group', auth, async (req, res) => {
  try {
    const { name, members } = req.body;
    if (!name) return res.status(400).json({ message: 'Group name is required' });

    const allMembers = [...new Set([...members, req.user.id])];
    const chat = await Chat.create({
      isGroup: true,
      name,
      members: allMembers,
      admin: req.user.id,
    });
    await chat.populate('members', '-password');
    res.json(chat);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── React to a message ──────────────────────────────
router.post('/message/:msgId/react', auth, async (req, res) => {
  try {
    const { emoji } = req.body;
    const message = await Message.findById(req.params.msgId);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    const reactions = message.reactions || [];
    const existing = reactions.find(r => r.emoji === emoji);
    if (existing) {
      existing.count += 1;
    } else {
      reactions.push({ emoji, count: 1, userId: req.user.id });
    }
    message.reactions = reactions;
    await message.save();

    res.json(message);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Delete a message ────────────────────────────────
router.delete('/message/:msgId', auth, async (req, res) => {
  try {
    const message = await Message.findOne({
      _id: req.params.msgId,
      sender: req.user.id,
    });
    if (!message) return res.status(403).json({ message: 'Not allowed' });
    await message.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;