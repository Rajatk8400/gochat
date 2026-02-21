const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  chatId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true, index: true },
  sender:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text:    { type: String, default: '' },
  fileUrl: { type: String },
  fileType:{ type: String },
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
  reactions: [{
    emoji:  { type: String },
    count:  { type: Number, default: 1 },
    userId: { type: String },
  }],
  readBy:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);