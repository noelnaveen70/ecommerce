const Chat = require('../models/chatModel');
const User = require('../model/userModel');
const Product = require('../model/productModel');
const mongoose = require('mongoose');

/**
 * Get all chats for the current user
 */
exports.getChats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find all chats where the user is either a buyer or a seller
    const chats = await Chat.find({
      $or: [
        { buyer: userId },
        { seller: userId }
      ]
    })
    .populate('product', 'name price image category')
    .populate('buyer', 'name email profileImage')
    .populate('seller', 'name email profileImage')
    .populate({
      path: 'messages',
      options: { sort: { createdAt: 1 } }
    })
    .sort({ updatedAt: -1 });

    // Calculate total unread message count
    let totalUnread = 0;
    chats.forEach(chat => {
      const isBuyer = chat.buyer._id.toString() === userId;
      totalUnread += isBuyer ? chat.unreadCount.buyer : chat.unreadCount.seller;
    });

    return res.status(200).json({ 
      success: true, 
      chats,
      totalUnread
    });
  } catch (err) {
    console.error('Error getting chats:', err);
    return res.status(500).json({
      success: false,
      message: 'Error fetching chats'
    });
  }
};

/**
 * Get unread message count for the current user
 */
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all chats for the user
    const chats = await Chat.find({
      $or: [
        { buyer: userId },
        { seller: userId }
      ]
    });

    // Calculate total unread messages
    let unreadCount = 0;
    
    chats.forEach(chat => {
      const isBuyer = chat.buyer.toString() === userId;
      unreadCount += isBuyer ? chat.unreadCount.buyer : chat.unreadCount.seller;
    });

    return res.status(200).json({
      success: true,
      unreadCount
    });
  } catch (err) {
    console.error('Error getting unread count:', err);
    return res.status(500).json({
      success: false,
      message: 'Error fetching unread message count'
    });
  }
};

/**
 * Get a specific chat by ID
 */
exports.getChatById = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    // Find the chat and ensure the user is a participant
    const chat = await Chat.findOne({
      _id: chatId,
      $or: [
        { buyer: userId },
        { seller: userId }
      ]
    })
    .populate('product', 'name price image category')
    .populate('buyer', 'name email profileImage')
    .populate('seller', 'name email profileImage')
    .populate({
      path: 'messages',
      options: { sort: { createdAt: 1 } }
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    return res.status(200).json({
      success: true,
      chat
    });
  } catch (err) {
    console.error('Error getting chat by ID:', err);
    return res.status(500).json({
      success: false,
      message: 'Error fetching chat'
    });
  }
};

/**
 * Create a new chat between a buyer and seller about a product
 */
exports.createChat = async (req, res) => {
  try {
    const { productId } = req.body;
    const buyerId = req.user.id;

    // Check if user is an admin
    if (req.user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin accounts cannot contact sellers'
      });
    }

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }

    // Find the product to get the seller
    const product = await Product.findById(productId);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const sellerId = product.seller;

    // Ensure buyer is not the seller
    if (sellerId.toString() === buyerId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot create a chat about your own product'
      });
    }

    // Check if a chat already exists for this buyer-seller-product combination
    let chat = await Chat.findOne({
      buyer: buyerId,
      seller: sellerId,
      product: productId
    })
    .populate('product', 'name price image category')
    .populate('buyer', 'name email profileImage')
    .populate('seller', 'name email profileImage')
    .populate({
      path: 'messages',
      options: { sort: { createdAt: 1 } }
    });

    // If chat exists, return it
    if (chat) {
      return res.status(200).json({
        success: true,
        chat,
        chatId: chat._id,
        message: 'Chat already exists'
      });
    }

    // Create a new chat
    chat = new Chat({
      buyer: buyerId,
      seller: sellerId,
      product: productId,
      messages: [],
      unreadCount: {
        buyer: 0,
        seller: 0
      }
    });

    await chat.save();

    // Populate the chat details for the response
    chat = await Chat.findById(chat._id)
      .populate('product', 'name price image category')
      .populate('buyer', 'name email profileImage')
      .populate('seller', 'name email profileImage');

    return res.status(201).json({
      success: true,
      chat,
      chatId: chat._id,
      message: 'Chat created successfully'
    });
  } catch (err) {
    console.error('Error creating chat:', err);
    return res.status(500).json({
      success: false,
      message: 'Error creating chat'
    });
  }
};

/**
 * Send a message in a chat
 */
exports.sendMessage = async (req, res) => {
  try {
    const { chatId, content } = req.body;
    const userId = req.user.id;

    // Check if user is an admin
    if (req.user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin accounts cannot send messages'
      });
    }

    if (!chatId || !content) {
      return res.status(400).json({
        success: false,
        message: 'Chat ID and message content are required'
      });
    }

    // Find the chat and ensure the user is a participant
    const chat = await Chat.findOne({
      _id: chatId,
      $or: [
        { buyer: userId },
        { seller: userId }
      ]
    })
    .populate('product', 'name price image')
    .populate('buyer', 'name email profileImage')
    .populate('seller', 'name email profileImage');

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found or you are not a participant'
      });
    }

    // Create the new message
    const newMessage = {
      sender: userId,
      content,
      readBy: [userId], // Sender has automatically read the message
      createdAt: new Date()
    };

    // Add message to chat
    chat.messages.push(newMessage);

    // Update unread count for the recipient
    const isBuyer = chat.buyer._id.toString() === userId;
    const recipientField = isBuyer ? 'seller' : 'buyer';
    chat.unreadCount[recipientField] += 1;

    // Update the timestamp
    chat.updatedAt = new Date();

    await chat.save();

    // Return the updated chat
    const updatedChat = await Chat.findById(chatId)
      .populate('product', 'name price image category')
      .populate('buyer', 'name email profileImage')
      .populate('seller', 'name email profileImage')
      .populate({
        path: 'messages',
        options: { sort: { createdAt: 1 } }
      });

    return res.status(200).json({
      success: true,
      chat: updatedChat,
      message: 'Message sent successfully'
    });
  } catch (err) {
    console.error('Error sending message:', err);
    return res.status(500).json({
      success: false,
      message: 'Error sending message'
    });
  }
};

/**
 * Mark all messages in a chat as read by the current user
 */
exports.markChatAsRead = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    // Find the chat and ensure the user is a participant
    const chat = await Chat.findOne({
      _id: chatId,
      $or: [
        { buyer: userId },
        { seller: userId }
      ]
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found or you are not a participant'
      });
    }

    // Determine if user is buyer or seller
    const isBuyer = chat.buyer.toString() === userId;
    
    // Update all messages to mark them as read by this user
    const updatedMessages = chat.messages.map(msg => {
      if (!msg.readBy.includes(userId)) {
        msg.readBy.push(userId);
      }
      return msg;
    });
    
    chat.messages = updatedMessages;
    
    // Reset unread count for this user
    chat.unreadCount[isBuyer ? 'buyer' : 'seller'] = 0;
    
    await chat.save();

    return res.status(200).json({
      success: true,
      message: 'Chat marked as read'
    });
  } catch (err) {
    console.error('Error marking chat as read:', err);
    return res.status(500).json({
      success: false,
      message: 'Error marking chat as read'
    });
  }
}; 