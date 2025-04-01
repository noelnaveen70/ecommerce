// Load environment variables first
require('dotenv').config();

// Validate required environment variables
const requiredEnvVars = ['EMAIL_USERNAME', 'EMAIL_PASSWORD', 'MONGO_URI', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars.join(', '));
  process.exit(1);
}

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes');
// const userRoutes = require('./routes/user');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const chatRoutes = require('./routes/chatRoutes');
const disputeRoutes = require('./routes/disputeRoutes');
const sellerRoutes = require('./routes/sellerRoutes');
const adminRoutes = require('./routes/adminRoutes');
const http = require('http');
const morgan = require('morgan');
const socketIo = require('socket.io');
const { verifyToken } = require('./middleware/auth');
const path = require('path');
const jwt = require('jsonwebtoken');
const Chat = require('./models/chatModel');

dotenv.config();
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || ['http://localhost:3000', 'http://localhost:5173'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(morgan('dev'));
app.use(cors());
app.use(express.json());

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
// app.use('/api/users', authRoutes); // Remove this duplicate route - all user routes should be accessed through /api/auth
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/disputes', disputeRoutes);
app.use('/api/seller', sellerRoutes);
app.use('/api/admin', adminRoutes);

// Socket.io setup for real-time chat
const activeUsers = new Map();
const typingUsers = new Map(); // Track who is typing in which chat

// Socket.io middleware for authentication
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    const userId = socket.handshake.auth.userId;
    const role = socket.handshake.auth.role;

    if (!token || !userId || !role) {
      return next(new Error('Authentication error: Missing required credentials'));
    }

    // Verify JWT token
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return next(new Error('Authentication error: Invalid token'));
      }
      
      // Verify user ID matches
      if (decoded.id !== userId) {
        return next(new Error('Authentication error: User ID mismatch'));
      }

      // Verify role matches
      if (decoded.role !== role) {
        return next(new Error('Authentication error: Role mismatch'));
      }
      
      // Store user info in socket object
      socket.userId = userId;
      socket.userName = decoded.name;
      socket.userRole = role;
      next();
    });
  } catch (error) {
    return next(new Error('Authentication error'));
  }
});

// Socket.io event handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.userId} (${socket.userRole})`);
  
  // Add user to active users map
  activeUsers.set(socket.userId, socket.id);
  
  // Broadcast user's online status to relevant chats
  broadcastUserStatus(socket.userId, true);
  
  // Authenticate user
  socket.on('authenticate', async (token) => {
    try {
      // Verify JWT token
      jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
          socket.emit('authenticated', { 
            success: false, 
            error: 'Invalid authentication token' 
          });
          return;
        }
        
        // Verify user ID matches
        if (decoded.id !== socket.userId) {
          socket.emit('authenticated', {
            success: false,
            error: 'User ID mismatch'
          });
          return;
        }

        // Verify role matches
        if (decoded.role !== socket.userRole) {
          socket.emit('authenticated', {
            success: false,
            error: 'Role mismatch'
          });
          return;
        }
        
        // Confirm authentication
        socket.emit('authenticated', { 
          success: true,
          userId: decoded.id,
          userName: decoded.name,
          role: decoded.role
        });
        
        // Send online users list
        socket.emit('onlineUsers', Array.from(activeUsers.keys()));
        
        console.log(`User authenticated: ${decoded.name} (${decoded.id}) - ${decoded.role}`);
      });
    } catch (error) {
      socket.emit('authenticated', { 
        success: false, 
        error: 'Authentication failed' 
      });
    }
  });
  
  // Join a chat room
  socket.on('joinChat', async (chatId) => {
    try {
      socket.join(chatId);
      console.log(`User ${socket.userId} joined chat ${chatId}`);
      
      // Get chat participants to notify them
      const Chat = require('./models/chatModel');
      const chat = await Chat.findById(chatId);
      
      if (chat) {
        // Notify other participants that this user joined
        const otherParticipants = [chat.buyer.toString(), chat.seller.toString()]
          .filter(id => id !== socket.userId);
          
        otherParticipants.forEach(participantId => {
          if (activeUsers.has(participantId)) {
            io.to(activeUsers.get(participantId)).emit('userJoinedChat', {
              chatId,
              userId: socket.userId
            });
          }
        });
      }
    } catch (error) {
      console.error('Error joining chat:', error);
      socket.emit('error', 'Error joining chat room');
    }
  });
  
  // Handle typing indicators
  socket.on('typing', (chatId) => {
    if (!socket.userId) return;
    
    // Store typing status with auto-expiry
    if (!typingUsers.has(chatId)) {
      typingUsers.set(chatId, new Set());
    }
    typingUsers.get(chatId).add(socket.userId);
    
    // Broadcast to chat room that user is typing
    socket.to(chatId).emit('userTyping', {
      chatId,
      userId: socket.userId,
      userName: socket.userName
    });
    
    // Auto-remove typing status after 3 seconds of inactivity
    setTimeout(() => {
      if (typingUsers.has(chatId)) {
        typingUsers.get(chatId).delete(socket.userId);
        
        // If empty, remove the chat from typing users map
        if (typingUsers.get(chatId).size === 0) {
          typingUsers.delete(chatId);
        }
        
        // Broadcast that user stopped typing
        socket.to(chatId).emit('userStoppedTyping', {
          chatId,
          userId: socket.userId
        });
      }
    }, 3000);
  });
  
  // Send a message
  socket.on('sendMessage', async (data) => {
    try {
      if (!socket.userId) {
        socket.emit('error', 'You are not authenticated');
        return;
      }
      
      const { chatId, content } = data;
      
      // Validate inputs
      if (!chatId || !content) {
        socket.emit('error', 'Chat ID and message content are required');
        return;
      }
      
      // Remove user from typing indicators if they were typing
      if (typingUsers.has(chatId)) {
        typingUsers.get(chatId).delete(socket.userId);
        
        // Broadcast that user stopped typing since they sent a message
        socket.to(chatId).emit('userStoppedTyping', {
          chatId,
          userId: socket.userId
        });
      }
      
      // Save message to database via the controller
      const Chat = require('./models/chatModel');
      const chat = await Chat.findOne({
        _id: chatId,
        $or: [
          { buyer: socket.userId },
          { seller: socket.userId }
        ]
      }).populate('product', 'name price image')
      .populate('buyer', 'name email profileImage')
      .populate('seller', 'name email profileImage');
      
      if (!chat) {
        socket.emit('error', 'Chat not found or you are not a participant');
        return;
      }
      
      // Determine the recipient
      const isBuyer = chat.buyer._id.toString() === socket.userId;
      const recipientId = isBuyer ? chat.seller._id.toString() : chat.buyer._id.toString();
      
      // Create the new message
      const newMessage = {
        sender: socket.userId,
        content,
        readBy: [socket.userId],
        createdAt: new Date()
      };
      
      // Add message to chat
      chat.messages.push(newMessage);
      
      // Update unread count for recipient
      const recipientField = isBuyer ? 'seller' : 'buyer';
      chat.unreadCount[recipientField] += 1;
      
      // Update timestamp
      chat.updatedAt = new Date();
      
      await chat.save();
      
      // Send message to all users in the chat room
      io.to(chatId).emit('newMessage', {
        chat,
        message: newMessage
      });
      
      // If recipient is online, send notification
      if (activeUsers.has(recipientId)) {
        const recipientSocketId = activeUsers.get(recipientId);
        io.to(recipientSocketId).emit('messageNotification', {
          chatId,
          sender: {
            _id: socket.userId,
            name: socket.userName
          },
          message: newMessage,
          product: chat.product
        });
      }
      
      console.log(`Message sent in chat ${chatId} by user ${socket.userId}`);
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', 'Error sending message');
    }
  });
  
  // Mark messages as read
  socket.on('markAsRead', async (chatId) => {
    try {
      if (!socket.userId) {
        socket.emit('error', 'You are not authenticated');
        return;
      }
      
      const Chat = require('./models/chatModel');
      const chat = await Chat.findOne({
        _id: chatId,
        $or: [
          { buyer: socket.userId },
          { seller: socket.userId }
        ]
      });
      
      if (!chat) {
        socket.emit('error', 'Chat not found or you are not a participant');
        return;
      }
      
      // Determine if user is buyer or seller
      const isBuyer = chat.buyer.toString() === socket.userId;
      
      // Mark messages as read
      let updated = false;
      const updatedMessages = chat.messages.map(msg => {
        if (!msg.readBy.includes(socket.userId)) {
          msg.readBy.push(socket.userId);
          updated = true;
        }
        return msg;
      });
      
      if (updated) {
        chat.messages = updatedMessages;
        
        // Reset unread count
        chat.unreadCount[isBuyer ? 'buyer' : 'seller'] = 0;
        
        await chat.save();
        
        // Notify other participants
        io.to(chatId).emit('messagesRead', {
          chatId,
          userId: socket.userId
        });
        
        console.log(`Messages marked as read in chat ${chatId} by user ${socket.userId}`);
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
      socket.emit('error', 'Error marking messages as read');
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    if (socket.userId) {
      activeUsers.delete(socket.userId);
      
      // Remove user from all typing indicators
      for (const [chatId, users] of typingUsers.entries()) {
        if (users.has(socket.userId)) {
          users.delete(socket.userId);
          
          // Broadcast that user stopped typing
          socket.to(chatId).emit('userStoppedTyping', {
            chatId,
            userId: socket.userId
          });
          
          // If empty, remove the chat
          if (users.size === 0) {
            typingUsers.delete(chatId);
          }
        }
      }
      
      // Broadcast user's offline status
      broadcastUserStatus(socket.userId, false);
      
      console.log(`User disconnected: ${socket.userId}`);
    }
    });
});

// Helper function to broadcast user's online/offline status
async function broadcastUserStatus(userId, isOnline) {
  try {
    // Find all chats where this user is a participant
    const Chat = require('./models/chatModel');
    const chats = await Chat.find({
      $or: [
        { buyer: userId },
        { seller: userId }
      ]
    });
    
    // For each chat, notify the other participant about this user's status
    chats.forEach(chat => {
      const otherUserId = chat.buyer.toString() === userId ? 
        chat.seller.toString() : chat.buyer.toString();
      
      // If other user is online, send them this user's status
      if (activeUsers.has(otherUserId)) {
        io.to(activeUsers.get(otherUserId)).emit('userStatus', {
          userId,
          isOnline
        });
      }
    });
  } catch (error) {
    console.error('Error broadcasting user status:', error);
  }
}

require('./db/connection');

const PORT = process.env.PORT;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});