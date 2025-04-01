const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { verifyToken } = require('../middleware/auth');

// Apply authentication middleware to all chat routes
router.use(verifyToken);

// Get all chats for the current user
router.get('/', chatController.getChats);

// Get unread message count
router.get('/unread', chatController.getUnreadCount);

// Get specific chat by ID
router.get('/:chatId', chatController.getChatById);

// Create a new chat
router.post('/', chatController.createChat);

// Send a message
router.post('/message', chatController.sendMessage);

// Mark chat as read
router.put('/:chatId/read', chatController.markChatAsRead);

module.exports = router; 