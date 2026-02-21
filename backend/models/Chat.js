const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  isGroup:     { type: Boolean, default: false },
  name:        { type: String, trim: true },
  members:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  admin:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  avatar:      { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Chat', chatSchema);