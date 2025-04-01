const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  relatedDispute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dispute',
    required: true
  },
  summary: {
    type: String,
    required: true,
    trim: true
  },
  details: {
    type: String,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userType: {
    type: String,
    enum: ['user', 'seller'],
    required: true
  },
  resolution: {
    type: String,
    enum: ['refund', 'replacement', 'information', 'no-action', 'other'],
    required: true
  },
  adminNotes: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['completed', 'needs-feedback', 'reopened'],
    default: 'completed'
  },
  category: {
    type: String,
    enum: ['order', 'payment', 'product', 'account', 'other'],
    default: 'other'
  },
  feedback: {
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    comment: {
      type: String,
      default: null
    },
    submittedAt: {
      type: Date,
      default: null
    }
  },
  attachments: [{
    url: String,
    filename: String,
    contentType: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Report = mongoose.model('Report', reportSchema);

module.exports = Report; 