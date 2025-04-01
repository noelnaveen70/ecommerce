const CartItem = require('../model/cartModel');
const Product = require('../model/productModel');

/**
 * Get user's cart count
 */
exports.getCartCount = async (req, res) => {
  try {
    // If user is authenticated, get cart count from database
    if (req.user) {
      const count = await CartItem.countDocuments({ user: req.user.id });
      return res.json({
        success: true,
        count
      });
    }
    
    // For non-authenticated users, return success with count 0
    // Frontend will handle showing localStorage cart count
    return res.json({
      success: true,
      count: 0
    });
  } catch (err) {
    console.error('Error fetching cart count:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Get user's cart items
 */
exports.getCart = async (req, res) => {
  try {
    // If user is authenticated, get cart items from database
    if (req.user) {
      const cartItems = await CartItem.find({ user: req.user.id })
        .populate('product', 'name price image category subcategory');

      // Format cart items for frontend
      const items = cartItems.map(item => ({
        productId: item.product._id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
        image: item.product.image,
        category: item.product.category,
        subcategory: item.product.subcategory
      }));

      return res.json({
        success: true,
        items,
        isGuest: false
      });
    }
    
    // For non-authenticated users, return empty array with isGuest flag
    // Frontend will use localStorage for guest carts
    return res.json({
      success: true,
      items: [],
      isGuest: true
    });
  } catch (err) {
    console.error('Error fetching cart:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Add product to cart
 */
exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    // Check if user is a seller or admin
    if (req.user && (req.user.role === 'seller' || req.user.role === 'admin')) {
      return res.status(403).json({
        success: false,
        message: req.user.role === 'admin' ? 
          'Admin accounts cannot add items to cart' : 
          'Sellers cannot add items to cart'
      });
    }

    // Validate input
    if (!productId || !quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product or quantity'
      });
    }

    // Check if product exists and has sufficient stock
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check stock availability
    if (product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.stock} items available in stock`,
        availableStock: product.stock
      });
    }

    // If user is authenticated, save to database
    if (req.user) {
      // Check if product is already in cart
      let cartItem = await CartItem.findOne({
        user: req.user.id,
        product: productId
      });

      if (cartItem) {
        // Check if adding more would exceed stock
        const newQuantity = cartItem.quantity + parseInt(quantity);
        if (product.stock < newQuantity) {
          return res.status(400).json({
            success: false,
            message: `Only ${product.stock} items available in stock`,
            availableStock: product.stock
          });
        }
        // Update quantity if already in cart
        cartItem.quantity = newQuantity;
        await cartItem.save();
      } else {
        // Add new item to cart
        cartItem = new CartItem({
          user: req.user.id,
          product: productId,
          quantity: parseInt(quantity)
        });
        await cartItem.save();
      }

      return res.json({
        success: true,
        message: 'Product added to cart',
        isGuest: false
      });
    }
    
    // For non-authenticated users, return success with isGuest flag
    // Frontend will handle saving to localStorage
    return res.json({
      success: true,
      message: 'Product added to guest cart',
      product: {
        productId: product._id,
        name: product.name,
        price: product.price,
        image: product.image,
        category: product.category,
        subcategory: product.subcategory,
        stock: product.stock // Include stock information
      },
      isGuest: true
    });
  } catch (err) {
    console.error('Error adding to cart:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Update cart item quantity
 */
exports.updateCartItem = async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    // Check if user is a seller or admin
    if (req.user && (req.user.role === 'seller' || req.user.role === 'admin')) {
      return res.status(403).json({
        success: false,
        message: req.user.role === 'admin' ? 
          'Admin accounts cannot update cart items' : 
          'Sellers cannot update cart items'
      });
    }

    // Validate input
    if (!productId || !quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product or quantity'
      });
    }

    // Check product stock
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if requested quantity exceeds stock
    if (product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.stock} items available in stock`,
        availableStock: product.stock
      });
    }

    // If user is authenticated, update in database
    if (req.user) {
      // Find and update cart item
      const cartItem = await CartItem.findOne({
        user: req.user.id,
        product: productId
      });

      if (!cartItem) {
        return res.status(404).json({
          success: false,
          message: 'Item not in cart'
        });
      }

      // Update quantity
      cartItem.quantity = parseInt(quantity);
      await cartItem.save();

      return res.json({
        success: true,
        message: 'Cart updated',
        isGuest: false
      });
    }
    
    // For non-authenticated users, return success with isGuest flag
    // Frontend will handle updating localStorage
    return res.json({
      success: true,
      message: 'Guest cart updated',
      isGuest: true
    });
  } catch (err) {
    console.error('Error updating cart:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Remove item from cart
 */
exports.removeFromCart = async (req, res) => {
  try {
    const productId = req.params.productId;

    // Check if user is a seller or admin
    if (req.user && (req.user.role === 'seller' || req.user.role === 'admin')) {
      return res.status(403).json({
        success: false,
        message: req.user.role === 'admin' ? 
          'Admin accounts cannot remove items from cart' : 
          'Sellers cannot remove items from cart'
      });
    }

    // If user is authenticated, remove from database
    if (req.user) {
      // Find and remove cart item
      const result = await CartItem.findOneAndDelete({
        user: req.user.id,
        product: productId
      });

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Item not in cart'
        });
      }

      return res.json({
        success: true,
        message: 'Item removed from cart',
        isGuest: false
      });
    }
    
    // For non-authenticated users, return success with isGuest flag
    // Frontend will handle removing from localStorage
    return res.json({
      success: true,
      message: 'Item removed from guest cart',
      isGuest: true
    });
  } catch (err) {
    console.error('Error removing from cart:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Clear entire cart
 */
exports.clearCart = async (req, res) => {
  try {
    // Check if user is a seller or admin
    if (req.user && (req.user.role === 'seller' || req.user.role === 'admin')) {
      return res.status(403).json({
        success: false,
        message: req.user.role === 'admin' ? 
          'Admin accounts cannot clear cart' : 
          'Sellers cannot clear cart'
      });
    }
    
    // If user is authenticated, clear database cart
    if (req.user) {
      await CartItem.deleteMany({ user: req.user.id });

      return res.json({
        success: true,
        message: 'Cart cleared',
        isGuest: false
      });
    }
    
    // For non-authenticated users, return success with isGuest flag
    // Frontend will handle clearing localStorage
    return res.json({
      success: true,
      message: 'Guest cart cleared',
      isGuest: true
    });
  } catch (err) {
    console.error('Error clearing cart:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Sync guest cart to user cart after login
 * Takes items stored in localStorage and adds them to the user's database cart
 */
exports.syncGuestCart = async (req, res) => {
  try {
    // Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    // Check if user is a seller or admin
    if (req.user.role === 'seller' || req.user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: req.user.role === 'admin' ? 
          'Admin accounts cannot have shopping carts' : 
          'Seller accounts cannot have shopping carts'
      });
    }
    
    const { guestCartItems } = req.body;
    
    // Validate input
    if (!guestCartItems || !Array.isArray(guestCartItems) || guestCartItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No guest cart items provided'
      });
    }
    
    // Process each item in the guest cart
    const results = [];
    for (const item of guestCartItems) {
      const { productId, quantity } = item;
      
      if (!productId || !quantity) continue;
      
      try {
        // Check if product exists
        const product = await Product.findById(productId);
        if (!product) {
          results.push({
            productId,
            status: 'failed',
            reason: 'Product not found'
          });
          continue;
        }
        
        // Check if product is already in user's cart
        let cartItem = await CartItem.findOne({
          user: req.user.id,
          product: productId
        });
        
        if (cartItem) {
          // Update quantity if already in cart
          cartItem.quantity += parseInt(quantity);
          await cartItem.save();
        } else {
          // Add new item to cart
          cartItem = new CartItem({
            user: req.user.id,
            product: productId,
            quantity: parseInt(quantity)
          });
          await cartItem.save();
        }
        
        results.push({
          productId,
          status: 'success'
        });
      } catch (err) {
        console.error(`Error syncing item ${productId}:`, err);
        results.push({
          productId,
          status: 'failed',
          reason: 'Server error'
        });
      }
    }
    
    res.json({
      success: true,
      message: 'Guest cart synced with user cart',
      results
    });
  } catch (err) {
    console.error('Error syncing guest cart:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};