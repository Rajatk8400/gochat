const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());

// ── Routes ─────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/chat', require('./routes/chat'));
app.get('/', (req, res) => res.send('GoChat Server Running ✅'));

// ── Socket.io ──────────────────────────────────────
const onlineUsers = {}; // { userId: socketId }

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  // User comes online
  socket.on('user_online', (userId) => {
    onlineUsers[userId] = socket.id;
    io.emit('online_users', Object.keys(onlineUsers));
    console.log(`✅ ${userId} is online`);
  });

  // Join a specific chat room
  socket.on('join_chat', (chatId) => {
    socket.join(chatId);
    console.log(`Joined room: ${chatId}`);
  });

  // Send & broadcast message
  socket.on('send_message', async (data) => {
    try {
      const Message = require('./models/Message');
      const Chat = require('./models/Chat');
      const User = require('./models/User');

      const message = await Message.create({
        chatId: data.chatId,
        sender: data.senderId,
        text: data.text,
        replyTo: data.replyTo || null,
      });

      await message.populate('sender', 'name username phone');
      await Chat.findByIdAndUpdate(data.chatId, {
        lastMessage: message._id,
        updatedAt: new Date(),
      });

      // Emit to everyone in the chat room (including sender)
      io.to(data.chatId).emit('receive_message', message);
      console.log(`Message sent in chat ${data.chatId}`);
    } catch (err) {
      console.error('Message error:', err.message);
      socket.emit('error', { message: err.message });
    }
  });

  // Typing indicators
  socket.on('typing', ({ chatId, userId, name }) => {
    socket.to(chatId).emit('user_typing', { chatId, userId, name });
  });

  socket.on('stop_typing', ({ chatId, userId }) => {
    socket.to(chatId).emit('user_stop_typing', { chatId, userId });
  });

  // Disconnect
  socket.on('disconnect', () => {
    const userId = Object.keys(onlineUsers).find(k => onlineUsers[k] === socket.id);
    if (userId) {
      delete onlineUsers[userId];
      io.emit('online_users', Object.keys(onlineUsers));
      console.log(`❌ ${userId} went offline`);
    }
  });
});

// ── Start ──────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    server.listen(process.env.PORT || 5000, () => {
      console.log(`🚀 GoChat running on port ${process.env.PORT || 5000}`);
    });
  })
  .catch(err => console.error('❌ DB Error:', err.message));