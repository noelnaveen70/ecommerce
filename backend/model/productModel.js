const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: 0
  },
  description: {
    type: String,
    required: [true, 'Product description is required']
  },
  image: {
    type: String,
    required: [true, 'Product image is required']
  },
  cloudinary_id: {
    type: String
  },
  category: {
    type: String,
    required: [true, 'Product category is required'],
    enum: [
      'home-living', 
      'clothing', 
      'handmade-gifts', 
      'jewellery', 
      'toys', 
      'bath-beauty', 
      'art', 
      'accessories'
    ],
    lowercase: true
  },
  subcategory: {
    type: String,
    trim: true,
    lowercase: true,
    enum: [
      'home-decor', 
      'bedding-and-pillows', 
      'kitchen-dining', 
      'storage-organization',
      'shirt', 
      'saree', 
      'kurthi-sets', 
      'pants', 
      'dhoti', 
      'dupatta',
      'custom-nameplates', 
      'engraved-jewelry', 
      'handmade-greeting-cards', 
      'photo-frames', 
      'necklaces', 
      'earrings', 
      'bracelets', 
      'rings',
      'action-figures',
      'educational-toys',
      'stuffed-animals',
      'puzzles',
      'handmade-soaps', 
      'skincare-products', 
      'haircare-products', 
      'aromatherapy-essential-oils',
      'paintings-drawings', 
      'sculptures', 
      'handmade-prints', 
      'handcrafted-cards-stationery',
      'bags-purses', 
      'footwear', 
      'hats-hair-accessories'
    ]
  },
  tag: {
    type: String,
    enum: ['New', 'Bestseller', 'Trending', 'Limited', ''],
    default: ''
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 10
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ratings: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    review: String,
    date: {
      type: Date,
      default: Date.now
    }
  }],
  averageRating: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Virtual for formatted price
productSchema.virtual('formattedPrice').get(function() {
  return this.price.toFixed(2);
});

// Method to calculate average rating
productSchema.methods.calculateAverageRating = function() {
  if (this.ratings.length === 0) {
    this.averageRating = 0;
    return;
  }
  
  const sum = this.ratings.reduce((total, rating) => total + rating.rating, 0);
  this.averageRating = sum / this.ratings.length;
};

// Pre-save hook to update averageRating
productSchema.pre('save', function(next) {
  this.calculateAverageRating();
  next();
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
