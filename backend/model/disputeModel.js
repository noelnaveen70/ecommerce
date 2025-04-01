const mongoose = require('mongoose');

const disputeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a title for your dispute'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Please provide a description of your issue'],
    trim: true
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
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'resolved', 'rejected'],
    default: 'pending'
  },
  category: {
    type: String,
    enum: ['order', 'payment', 'product', 'account', 'other'],
    required: true
  },
  relatedOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },
  messages: [{
    sender: {
      type: String,
      enum: ['user', 'admin'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  resolution: {
    outcome: {
      type: String,
      enum: {
        values: ['refund', 'replacement', 'information', 'no-action', 'other'],
        message: props => `'${props.value}' is not a valid resolution outcome`
      },
      validate: {
        validator: function(v) {
          return v === null || v === undefined || 
            ['refund', 'replacement', 'information', 'no-action', 'other'].includes(v);
        },
        message: props => `'${props.value}' is not a valid resolution outcome`
      },
      required: false
    },
    notes: {
      type: String,
      required: false
    },
    completedAt: {
      type: Date,
      required: false
    }
  },
  files: [{
    url: String,
    filename: String,
    contentType: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
disputeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Check if resolution fields are null and set them to undefined to avoid validation errors
  if (this.resolution) {
    if (this.resolution.outcome === null) {
      this.resolution.outcome = undefined;
    }
    if (this.resolution.notes === null) {
      this.resolution.notes = undefined;
    }
    if (this.resolution.completedAt === null) {
      this.resolution.completedAt = undefined;
    }
    
    // If all resolution fields are undefined, remove the resolution object completely
    if (this.resolution.outcome === undefined && 
        this.resolution.notes === undefined && 
        this.resolution.completedAt === undefined) {
      this.resolution = undefined;
    }
  }
  
  next();
});

// Create index for faster querying
disputeSchema.index({ user: 1, status: 1 });
disputeSchema.index({ createdAt: -1 });

const Dispute = mongoose.model('Dispute', disputeSchema);

module.exports = Dispute; 