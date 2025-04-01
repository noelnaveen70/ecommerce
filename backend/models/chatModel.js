const mongoose = require('mongoose');

// Message Schema (Sub-document)
const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
});

// Chat Schema
const chatSchema = new mongoose.Schema({
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  messages: [messageSchema],
  lastMessage: {
    type: Date,
    default: Date.now
  },
  unreadCount: {
    buyer: {
      type: Number,
      default: 0
    },
    seller: {
      type: Number,
      default: 0
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Compound index to ensure a buyer-seller-product combo is unique
chatSchema.index({ buyer: 1, seller: 1, product: 1 }, { unique: true });

// Method to mark messages as read
chatSchema.methods.markAsRead = function(userId) {
  // Mark all unread messages as read for this user
  this.messages.forEach(message => {
    if (!message.readBy.includes(userId)) {
      message.readBy.push(userId);
    }
  });
  
  // Reset unread count for the user
  if (userId.equals(this.buyer)) {
    this.unreadCount.buyer = 0;
  } else if (userId.equals(this.seller)) {
    this.unreadCount.seller = 0;
  }
  
  return this.save();
};

// Method to add a new message
chatSchema.methods.addMessage = function(senderId, content) {
  const receiverId = senderId.equals(this.buyer) ? this.seller : this.buyer;
  
  // Create new message
  this.messages.push({
    sender: senderId,
    content,
    readBy: [senderId] // Mark as read by sender
  });
  
  // Update last message timestamp
  this.lastMessage = Date.now();
  
  // Increment unread count for receiver
  if (receiverId.equals(this.buyer)) {
    this.unreadCount.buyer += 1;
  } else {
    this.unreadCount.seller += 1;
  }
  
  return this.save();
};

const Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat; 