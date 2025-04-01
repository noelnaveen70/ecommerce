const Product = require('../model/productModel');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('../config/cloudinary');

// Configure multer storage for temporary file upload
const storage = multer.memoryStorage(); // Use memory storage instead of disk

// File filter for images
const fileFilter = (req, file, cb) => {
  // Accept image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

// Configure multer upload
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

// Middleware to handle single file upload
exports.uploadProductImage = upload.single('image');

// Get all products with filtering, sorting, and pagination
exports.getAllProducts = async (req, res) => {
  try {
    const { 
      category, 
      subcategory,
      sort = 'createdAt', 
      order = 'desc', 
      page = 1, 
      limit = 12,
      minPrice,
      maxPrice,
      tag,
      search,
      rating
    } = req.query;
    
    // Build filter object
    const filter = {};
    
    if (category) {
      filter.category = category.toLowerCase();
    }
    
    if (subcategory) {
      filter.subcategory = subcategory.toLowerCase();
    }
    
    if (tag) {
      filter.tag = tag;
    }
    
    // Price range filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined) filter.price.$gte = Number(minPrice);
      if (maxPrice !== undefined) filter.price.$lte = Number(maxPrice);
    }
    
    // Rating filter
    if (rating) {
      filter.averageRating = { $gte: Number(rating) };
    }
    
    // Search by name or description
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit);
    
    // Determine sort order
    const sortOptions = {};
    if (sort === 'price-low') {
      sortOptions.price = 1;
    } else if (sort === 'price-high') {
      sortOptions.price = -1;
    } else if (sort === 'bestsellers') {
      sortOptions.averageRating = -1;
    } else {
      sortOptions[sort] = order === 'asc' ? 1 : -1;
    }
    
    // Execute query with pagination
    const products = await Product.find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit))
      .populate('seller', 'name');
    
    // Get total count for pagination
    const total = await Product.countDocuments(filter);
    
    res.status(200).json({
      success: true,
      count: products.length,
      total,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      products
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching products',
      error: error.message
    });
  }
};

// Get product by ID
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('seller', 'name')
      .populate('ratings.user', 'name');
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching product',
      error: error.message
    });
  }
};

// Create new product
exports.createProduct = async (req, res) => {
  try {
    // Add seller ID from authenticated user
    req.body.seller = req.user._id;
    
    // If subcategory is provided but empty, set to null
    if (req.body.subcategory === '') {
      req.body.subcategory = null;
    }
    
    // Convert category and subcategory to lowercase
    if (req.body.category) {
      req.body.category = req.body.category.toLowerCase();
    }
    
    if (req.body.subcategory) {
      req.body.subcategory = req.body.subcategory.toLowerCase();
    }
    
    // If file was uploaded, upload it to Cloudinary
    if (req.file) {
      try {
        // Convert buffer to data URL
        const dataURI = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        
        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(dataURI, {
          folder: 'handcraft/products',
          resource_type: 'image'
        });
        
        // Add the Cloudinary URL and public ID to the product data
        req.body.image = result.secure_url;
        req.body.cloudinary_id = result.public_id;
        console.log('Image uploaded to Cloudinary:', result.secure_url);
      } catch (cloudinaryError) {
        console.error('Cloudinary upload error:', cloudinaryError);
        return res.status(500).json({
          success: false,
          message: 'Error uploading image to Cloudinary',
          error: cloudinaryError.message
        });
      }
    } else {
      // If no image was provided and it's required
      if (!req.body.image) {
        return res.status(400).json({
          success: false,
          message: 'Product image is required'
        });
      }
    }
    
    const product = await Product.create(req.body);
    
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(400).json({
      success: false,
      message: 'Error creating product',
      error: error.message
    });
  }
};

// Update product
exports.updateProduct = async (req, res) => {
  try {
    let product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Check if user is the seller or an admin
    if (product.seller.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this product'
      });
    }
    
    // If subcategory is provided but empty, set to null
    if (req.body.subcategory === '') {
      req.body.subcategory = null;
    }
    
    // Convert category and subcategory to lowercase
    if (req.body.category) {
      req.body.category = req.body.category.toLowerCase();
    }
    
    if (req.body.subcategory) {
      req.body.subcategory = req.body.subcategory.toLowerCase();
    }
    
    // If file was uploaded, update the image on Cloudinary
    if (req.file) {
      try {
        // Delete previous image from Cloudinary if it exists
        if (product.cloudinary_id) {
          try {
            await cloudinary.uploader.destroy(product.cloudinary_id);
            console.log('Previous image deleted from Cloudinary:', product.cloudinary_id);
          } catch (destroyError) {
            console.error('Error deleting previous image from Cloudinary:', destroyError);
            // Continue with the update even if deletion fails
          }
        }
        
        // Convert buffer to data URL
        const dataURI = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        
        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(dataURI, {
          folder: 'handcraft/products',
          resource_type: 'image'
        });
        
        // Add the Cloudinary URL and public ID to the product data
        req.body.image = result.secure_url;
        req.body.cloudinary_id = result.public_id;
        console.log('Updated image uploaded to Cloudinary:', result.secure_url);
      } catch (cloudinaryError) {
        console.error('Cloudinary upload error during update:', cloudinaryError);
        return res.status(500).json({
          success: false,
          message: 'Error uploading image to Cloudinary',
          error: cloudinaryError.message
        });
      }
    }
    
    // Update the product
    product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );
    
    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(400).json({
      success: false,
      message: 'Error updating product',
      error: error.message
    });
  }
};

// Delete product
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Check if user is the seller or an admin
    if (product.seller.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this product'
      });
    }
    
    // Delete image from Cloudinary if it exists
    if (product.cloudinary_id) {
      try {
        await cloudinary.uploader.destroy(product.cloudinary_id);
        console.log('Image deleted from Cloudinary:', product.cloudinary_id);
      } catch (cloudinaryError) {
        console.error('Error deleting image from Cloudinary:', cloudinaryError);
        // Continue with product deletion even if image deletion fails
        // This prevents orphaned products if Cloudinary deletion fails
      }
    }
    
    // Delete the product
    await product.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting product',
      error: error.message
    });
  }
};

// Get seller products
exports.getSellerProducts = async (req, res) => {
  try {
    const sellerId = req.params.sellerId || req.user._id;
    
    const products = await Product.find({ seller: sellerId });
    
    res.status(200).json({
      success: true,
      count: products.length,
      products
    });
  } catch (error) {
    console.error('Error fetching seller products:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching seller products',
      error: error.message
    });
  }
};

// Add product rating
exports.addProductRating = async (req, res) => {
  try {
    const { rating, review } = req.body;
    const userId = req.user._id;
    const productId = req.params.id;
    
    // Check if user is admin or seller - prevent these roles from reviewing products
    if (req.user.role === 'admin' || req.user.role === 'seller') {
      return res.status(403).json({
        success: false,
        message: req.user.role === 'admin' 
          ? 'Admin accounts cannot submit reviews' 
          : 'Seller accounts cannot submit reviews'
      });
    }
    
    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }
    
    const product = await Product.findById(productId);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Check if user has already rated this product
    const existingRating = product.ratings.find(
      r => r.user.toString() === userId.toString()
    );
    
    if (existingRating) {
      // Verify again that user is not admin or seller
      if (req.user.role === 'admin' || req.user.role === 'seller') {
        return res.status(403).json({
          success: false,
          message: req.user.role === 'admin' 
            ? 'Admin accounts cannot update reviews' 
            : 'Seller accounts cannot update reviews'
        });
      }
      
      // Update existing rating
      existingRating.rating = rating;
      existingRating.review = review || existingRating.review;
      existingRating.date = Date.now();
      
      // Calculate average rating
      product.calculateAverageRating();
      
      await product.save();
      
      // Get populated product to return
      const populatedProduct = await Product.findById(productId)
        .populate('ratings.user', 'name email profileImage')
        .populate('seller', 'name');
      
      return res.status(200).json({
        success: true,
        message: 'Rating updated successfully',
        product: populatedProduct
      });
    }
    
    // For new reviews, you can optionally check if user has purchased the product
    // This check is commented out for now, but can be enabled if purchase history exists
    /*
    const Order = require('../model/orderModel');
    const hasPurchased = await Order.exists({
      user: userId,
      'items.product': productId,
      status: 'delivered'
    });
    
    if (!hasPurchased) {
      return res.status(403).json({
        success: false,
        message: 'You need to purchase this product before reviewing it'
      });
    }
    */
    
    // Add new rating
    product.ratings.push({
      user: userId,
      rating,
      review,
      date: Date.now()
    });
    
    // Calculate average rating
    product.calculateAverageRating();
    
    await product.save();
    
    // Get populated product to return
    const populatedProduct = await Product.findById(productId)
      .populate('ratings.user', 'name email profileImage')
      .populate('seller', 'name');
    
    res.status(200).json({
      success: true,
      message: 'Rating added successfully',
      product: populatedProduct
    });
  } catch (error) {
    console.error('Error adding rating:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding rating',
      error: error.message
    });
  }
};

// Get product categories
exports.getProductCategories = async (req, res) => {
  try {
    const categories = await Product.distinct('category');
    
    res.status(200).json({
      success: true,
      categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: error.message
    });
  }
};

// Get subcategories for a specific category
exports.getProductSubcategories = async (req, res) => {
  try {
    const { category } = req.params;
    
    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Category parameter is required'
      });
    }
    
    const subcategories = await Product.distinct('subcategory', { 
      category: category.toLowerCase(),
      subcategory: { $exists: true, $ne: null, $ne: "" }  // Exclude null or empty subcategories
    });
    
    // Filter out any null or undefined values that might have slipped through
    const filteredSubcategories = subcategories.filter(subcat => subcat !== null && subcat !== undefined);
    
    res.status(200).json({
      success: true,
      category,
      subcategories: filteredSubcategories
    });
  } catch (error) {
    console.error('Error fetching subcategories:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching subcategories',
      error: error.message
    });
  }
}; 