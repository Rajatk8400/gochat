const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  username: { type: String, unique: true, trim: true },
  phone:    { type: String, unique: true, trim: true, required: true },
  email:    { type: String, trim: true },
  password: { type: String, required: true },
  avatar:   { type: String, default: '' },
  bio:      { type: String, default: 'Hey! I am using GoChat 👋' },
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
  contacts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

// Index for fast phone and username search
userSchema.index({ phone: 1 });
userSchema.index({ username: 1 });

module.exports = mongoose.model('User', userSchema);