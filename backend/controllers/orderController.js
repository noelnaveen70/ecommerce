const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../model/orderModel');
const Cart = require('../model/cartModel');
const Product = require('../model/productModel');
const mongoose = require('mongoose');
const User = require('../model/userModel');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create order
exports.createOrder = async (req, res) => {
  try {
    const { items, shippingAddress, totalAmount } = req.body;

    // Log the entire request body for debugging
    console.log('Received order request:', {
      items,
      shippingAddress,
      totalAmount,
      user: req.user._id
    });

    // Validate the items array
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid items'
      });
    }

    // Validate shipping address
    if (!shippingAddress || 
        !shippingAddress.street || 
        !shippingAddress.city || 
        !shippingAddress.state || 
        !shippingAddress.zipCode || 
        !shippingAddress.country ||
        !shippingAddress.phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Complete shipping address is required',
        details: 'Please provide street, city, state, zipCode, country, and phone number'
      });
    }

    // Get product details and validate stock
    const itemsWithDetails = await Promise.all(items.map(async (item) => {
      // Check if product ID exists (handle both productId and product fields)
      const productId = item.productId || item.product?._id || item.product;
      if (!productId) {
        throw new Error('Product ID is missing in cart item');
      }

      const product = await Product.findById(productId);
      if (!product) {
        throw new Error(`Product not found: ${productId}`);
      }

      // Validate stock
      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for product: ${product.name}`);
      }

      return {
        product: productId,
        seller: product.seller,
        quantity: item.quantity,
        price: item.price || product.price,
        status: 'pending'
      };
    }));

    // Calculate amounts
    const subtotal = itemsWithDetails.reduce((total, item) => 
      total + (item.price * item.quantity), 0
    );
    const shippingCost = 99;
    const taxAmount = Math.round(subtotal * 0.18); // 18% GST
    const discount = subtotal > 5000 ? 500 : 0; // Apply discount if subtotal > 5000
    const finalAmount = subtotal + shippingCost + taxAmount - discount;

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(finalAmount * 100), // Convert to paise
      currency: 'INR',
      receipt: `order_${Date.now()}`
    });

    // Create the order
    const orderData = {
      user: req.user._id,
      items: itemsWithDetails,
      shippingAddress: {
        street: shippingAddress.street,
        city: shippingAddress.city,
        state: shippingAddress.state,
        zipCode: shippingAddress.zipCode,
        country: shippingAddress.country,
        phoneNumber: shippingAddress.phoneNumber,
        label: shippingAddress.label || 'Default'
      },
      totalAmount: finalAmount,
      subtotal: subtotal,
      shippingCost: shippingCost,
      taxAmount: taxAmount,
      discount: discount,
      razorpayOrderId: razorpayOrder.id,
      status: 'pending',
      orderDate: new Date(),
      estimatedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    };

    const order = await Order.create(orderData);

    // Populate necessary fields
    await order.populate([
      { 
        path: 'items.product',
        select: 'name image price'
      },
      {
        path: 'items.seller',
        select: 'name email phone'
      },
      { 
        path: 'user',
        select: 'name email phone'
      }
    ]);

    // Clear the user's cart after successful order creation
    await Cart.findOneAndDelete({ user: req.user._id });

    res.status(201).json({
      success: true,
      order,
      razorpayOrder: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency
      }
    });
  } catch (error) {
    console.error('Error in createOrder:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating order',
      error: error.stack
    });
  }
};

// Verify payment
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Log the received data for debugging
    console.log('Received payment verification data:', {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    });

    // Verify signature
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    // Log the signature verification details
    console.log('Signature verification:', {
      generatedSign: expectedSign,
      receivedSign: razorpay_signature,
      matches: expectedSign === razorpay_signature
    });

    if (expectedSign !== razorpay_signature) {
      console.error('Signature verification failed');
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature',
        details: {
          expected: expectedSign,
          received: razorpay_signature
        }
      });
    }

    // Find the order
    const order = await Order.findOne({ razorpayOrderId: razorpay_order_id });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Start a session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Update order status
      order.status = 'processing';
      order.razorpayPaymentId = razorpay_payment_id;
      order.paidAt = new Date();
      await order.save({ session });

      // Update product stock for each item
      for (const item of order.items) {
        const product = await Product.findById(item.product);
        if (!product) {
          throw new Error(`Product ${item.product} not found`);
        }

        if (product.stock < item.quantity) {
          throw new Error(`Insufficient stock for product ${product.name}`);
        }

        product.stock -= item.quantity;
        await product.save({ session });
      }

      // Commit the transaction
      await session.commitTransaction();

      res.json({
        success: true,
        order
      });
    } catch (error) {
      // If an error occurred, abort the transaction
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error verifying payment'
    });
  }
};

// Helper function to check if status transition is valid
const isValidStatusTransition = (currentStatus, newStatus) => {
  const statusFlow = {
    pending: ['processing', 'cancelled'],
    processing: ['shipped', 'cancelled'],
    shipped: ['delivered', 'cancelled'],
    delivered: [],
    cancelled: []
  };
  
  return statusFlow[currentStatus.toLowerCase()]?.includes(newStatus.toLowerCase()) || false;
};

// Helper function to check if automatic status transition is needed
const checkAutomaticStatusTransition = (order) => {
  const now = new Date();
  const orderDate = new Date(order.createdAt);
  const hoursSinceOrder = (now - orderDate) / (1000 * 60 * 60);
  
  // Define time thresholds for status transitions (in hours)
  const STATUS_THRESHOLDS = {
    pending: 2,      // Move from pending after 2 hours
    processing: 12,  // Move from processing after 12 hours
    shipped: 48,     // Move from shipped after 48 hours
  };
  
  let newStatus = order.status;
  
  // Only update if the order is not cancelled or delivered
  if (!['cancelled', 'delivered'].includes(order.status.toLowerCase())) {
    if (order.status === 'pending' && hoursSinceOrder >= STATUS_THRESHOLDS.pending) {
      newStatus = 'processing';
    } else if (order.status === 'processing' && hoursSinceOrder >= STATUS_THRESHOLDS.processing) {
      newStatus = 'shipped';
    } else if (order.status === 'shipped' && hoursSinceOrder >= STATUS_THRESHOLDS.shipped) {
      newStatus = 'delivered';
    }
  }
  
  return newStatus;
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    // Find the order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user is seller and has permission
    const isSeller = req.user.role === 'seller';
    if (isSeller) {
      const hasPermission = order.items.some(item => 
        item.seller.toString() === req.user._id.toString()
      );
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to update this order'
        });
      }
    }

    // Check if the status transition is valid
    if (!isValidStatusTransition(order.status, status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition from ${order.status} to ${status}`
      });
    }

    // Update order status
    order.status = status;
    
    // Update individual item status for the seller's items
    if (isSeller) {
      order.items = order.items.map(item => {
        if (item.seller.toString() === req.user._id.toString()) {
          item.status = status;
        }
        return item;
      });
    }

    // If all items have the same status, update the main order status
    const allItemsHaveStatus = order.items.every(item => item.status === status);
    if (allItemsHaveStatus) {
      order.status = status;
    }

    // Handle automatic transitions
    if (status === 'delivered') {
      order.paidAt = order.paidAt || new Date(); // Set paid date if not set
      order.deliveredAt = new Date();
      
      // Update seller statistics
      for (const item of order.items) {
        await User.findByIdAndUpdate(
          item.seller,
          {
            $inc: {
              'sellerInfo.totalSales': item.quantity,
              'sellerInfo.revenue': item.price * item.quantity
            }
          }
        );
      }
    }

    await order.save();

    // Populate necessary fields
    await order.populate([
      { 
        path: 'items.product',
        select: 'name image price'
      },
      {
        path: 'items.seller',
        select: 'name email phone'
      },
      { 
        path: 'user',
        select: 'name email phone'
      }
    ]);

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      order
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating order status',
      error: error.message
    });
  }
};

// Get user orders with automatic status updates
exports.getUserOrders = async (req, res) => {
  try {
    let orders = await Order.find({ user: req.user._id })
      .populate('items.product')
      .sort({ createdAt: -1 });

    // Check and apply automatic status transitions
    for (let order of orders) {
      const newStatus = checkAutomaticStatusTransition(order);
      if (newStatus !== order.status) {
        order.status = newStatus;
        if (newStatus === 'delivered') {
          order.deliveredAt = new Date();
        }
        await order.save();
      }
    }

    res.json({
      success: true,
      orders
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching orders'
    });
  }
};

// @desc    Get seller's orders
// @route   GET /api/orders/seller-orders
// @access  Private/Seller
exports.getSellerOrders = async (req, res) => {
  try {
    // Check if user is a seller
    if (req.user.role !== 'seller') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only sellers can view seller orders.'
      });
    }

    // Find all orders that contain products from this seller
    let orders = await Order.find({
      'items.seller': req.user._id
    })
    .populate({
      path: 'items.product',
      select: 'name image price'
    })
    .populate({
      path: 'user',
      select: 'name email phone',
      model: 'User'
    })
    .sort('-createdAt');

    // Check and apply automatic status transitions
    for (let order of orders) {
      const newStatus = checkAutomaticStatusTransition(order);
      if (newStatus !== order.status) {
        order.status = newStatus;
        if (newStatus === 'delivered') {
          order.deliveredAt = new Date();
          // Update seller statistics for delivered orders
          for (const item of order.items) {
            if (item.seller.toString() === req.user._id.toString()) {
              await User.findByIdAndUpdate(
                req.user._id,
                {
                  $inc: {
                    'sellerInfo.totalSales': item.quantity,
                    'sellerInfo.revenue': item.price * item.quantity
                  }
                }
              );
            }
          }
        }
        await order.save();
      }
    }

    // Filter and format orders for seller view
    const sellerOrders = orders.map(order => {
      const sellerItems = order.items.filter(item => 
        item.seller.toString() === req.user._id.toString()
      );

      const itemsTotal = sellerItems.reduce((total, item) => total + (item.price * item.quantity), 0);
      const shippingCost = order.shippingCost || 99;
      const taxAmount = order.taxAmount || Math.round(itemsTotal * 0.18);
      const totalWithExtras = itemsTotal + shippingCost + taxAmount;

      return {
        _id: order._id,
        orderNumber: order.razorpayOrderId,
        customer: {
          name: order.user.name || 'Unknown Customer',
          email: order.user.email || 'No email',
          phone: order.user.phone || 'No phone'
        },
        status: order.status,
        createdAt: order.createdAt,
        deliveredAt: order.deliveredAt,
        items: sellerItems.map(item => ({
          ...item.toObject(),
          product: {
            _id: item.product._id,
            name: item.product.name,
            image: item.product.image,
            price: item.price
          }
        })),
        subtotal: itemsTotal,
        shippingCost: shippingCost,
        taxAmount: taxAmount,
        totalAmount: totalWithExtras,
        shippingAddress: order.shippingAddress,
        paymentId: order.razorpayPaymentId,
        paymentMethod: 'Razorpay',
        paymentStatus: order.paidAt ? 'completed' : 'pending'
      };
    });

    res.status(200).json({
      success: true,
      role: req.user.role,
      orders: sellerOrders
    });
  } catch (error) {
    console.error('Error in getSellerOrders:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching seller orders'
    });
  }
};

// @desc    Update seller's order status
// @route   PUT /api/orders/seller-orders/:orderId/status
// @access  Private/Seller
exports.updateSellerOrderStatus = async (req, res) => {
  try {
    // Check if user is a seller
    if (req.user.role !== 'seller') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only sellers can update order status.'
      });
    }

    const { orderId } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    // Find the order and verify seller owns the items
    const order = await Order.findOne({
      _id: orderId,
      'items.seller': req.user._id
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or you do not have permission to update it'
      });
    }

    // Update status for this seller's items only
    order.items.forEach(item => {
      if (item.seller.toString() === req.user._id.toString()) {
        item.status = status;
      }
    });

    // Save the updated order
    await order.save();

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully'
    });
  } catch (error) {
    console.error('Error in updateSellerOrderStatus:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating order status'
    });
  }
};

// @desc    Cancel seller's order
// @route   PUT /api/orders/seller-orders/:orderId/cancel
// @access  Private/Seller
exports.cancelSellerOrder = async (req, res) => {
  try {
    // Check if user is a seller
    if (req.user.role !== 'seller') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only sellers can cancel orders.'
      });
    }

    const { orderId } = req.params;

    // Find the order and verify seller owns the items
    const order = await Order.findOne({
      _id: orderId,
      'items.seller': req.user._id
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or you do not have permission to cancel it'
      });
    }

    // Only allow cancellation if order is not already cancelled or delivered
    if (order.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Order is already cancelled'
      });
    }

    if (order.status === 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a delivered order'
      });
    }

    // Start a session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Update status for this seller's items to cancelled and restore stock
      for (const item of order.items) {
        if (item.seller.toString() === req.user._id.toString()) {
          item.status = 'cancelled';
          
          // Restore stock for the product
          const product = await Product.findById(item.product);
          if (product) {
            product.stock += item.quantity;
            await product.save({ session });
          }
        }
      }

      // If all items are cancelled, update the main order status
      const allItemsCancelled = order.items.every(item => item.status === 'cancelled');
      if (allItemsCancelled) {
        order.status = 'cancelled';
      }

      // Save the updated order
      await order.save({ session });

      // Commit the transaction
      await session.commitTransaction();

      // Populate necessary fields
      await order.populate([
        { 
          path: 'items.product',
          select: 'name image price'
        },
        {
          path: 'items.seller',
          select: 'name email phone'
        },
        { 
          path: 'user',
          select: 'name email phone'
        }
      ]);

      // Format the response to match the frontend expectations
      const formattedOrder = {
        _id: order._id,
        orderNumber: order.razorpayOrderId,
        customer: {
          name: order.user.name || 'Unknown Customer',
          email: order.user.email || 'No email',
          phone: order.user.phone || 'No phone'
        },
        status: order.status,
        createdAt: order.createdAt,
        deliveredAt: order.deliveredAt,
        items: order.items.filter(item => item.seller.toString() === req.user._id.toString())
          .map(item => ({
            ...item.toObject(),
            product: {
              _id: item.product._id,
              name: item.product.name,
              image: item.product.image,
              price: item.price
            }
          })),
        subtotal: order.items
          .filter(item => item.seller.toString() === req.user._id.toString())
          .reduce((total, item) => total + (item.price * item.quantity), 0),
        shippingCost: order.shippingCost || 99,
        taxAmount: order.taxAmount || Math.round(order.items
          .filter(item => item.seller.toString() === req.user._id.toString())
          .reduce((total, item) => total + (item.price * item.quantity), 0) * 0.18),
        totalAmount: (order.items
          .filter(item => item.seller.toString() === req.user._id.toString())
          .reduce((total, item) => total + (item.price * item.quantity), 0)) + 
          (order.shippingCost || 99) + 
          (order.taxAmount || Math.round(order.items
            .filter(item => item.seller.toString() === req.user._id.toString())
            .reduce((total, item) => total + (item.price * item.quantity), 0) * 0.18)),
        shippingAddress: order.shippingAddress,
        paymentId: order.razorpayPaymentId,
        paymentMethod: 'Razorpay',
        paymentStatus: order.paidAt ? 'completed' : 'pending'
      };

      res.status(200).json({
        success: true,
        message: 'Order cancelled successfully',
        order: formattedOrder
      });
    } catch (error) {
      // If an error occurred, abort the transaction
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error('Error in cancelSellerOrder:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling order'
    });
  }
};

// Add a new function for generating invoices
exports.generateInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Verify the order belongs to the user
    const order = await Order.findById(orderId)
      .populate('items.product')
      .populate('user', 'name email phone')
      .populate('items.seller', 'name email phone address sellerInfo');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Check if order belongs to the user or if user is admin
    if (req.user.role !== 'admin' && order.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to access this invoice'
      });
    }
    
    // Check if order is cancelled
    if (order.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot generate invoice for cancelled orders'
      });
    }
    
    // Create a PDF document
    const doc = new PDFDocument({ 
      margin: 50,
      size: 'A4',
      info: {
        Title: `Invoice-${orderId}`,
        Author: 'HandCraft Store',
      }
    });
    
    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${orderId}.pdf`);
    
    // Pipe the PDF to the response
    doc.pipe(res);
    
    // Helper function for drawing borders
    const drawRect = (x, y, width, height, fillColor, strokeColor) => {
      doc.rect(x, y, width, height)
        .fillAndStroke(fillColor || 'white', strokeColor || '#e6e6e6');
    };
    
    // Helper function for creating the invoice header
    const createHeader = () => {
      // Draw header background
      drawRect(50, 50, 500, 100, '#ffffff', '#e6e6e6');
      
      // Add company logo/header
      doc.fontSize(24).fillColor('#333333').font('Helvetica-Bold').text('HandCraft Store', 70, 70);
      doc.fontSize(12).fillColor('#666666').font('Helvetica').text('Premium Artisan Products', 70, 100);
      
      // Add invoice text on the right
      doc.fontSize(28).fillColor('#333333').font('Helvetica-Bold').text('INVOICE', 400, 70, { align: 'right' });
      
      // Add invoice number with a special styled box
      doc.roundedRect(400, 100, 150, 30, 5).fillAndStroke('#f9f9f9', '#e6e6e6');
      doc.fontSize(10).fillColor('#666666').text('INVOICE NUMBER', 410, 105);
      doc.fontSize(12).fillColor('#333333').font('Helvetica-Bold').text(`INV-${orderId.substring(0, 8).toUpperCase()}`, 410, 120);
    };
    
    // Helper function for adding customer and order info
    const addOrderInfo = (y) => {
      // Draw info background
      drawRect(50, y, 500, 140, '#f9f9f9', '#e6e6e6');
      
      // Order details - left side
      doc.fontSize(12).fillColor('#333333').font('Helvetica-Bold').text('ORDER INFORMATION', 70, y + 15);
      doc.moveTo(70, y + 30).lineTo(270, y + 30).stroke('#e6e6e6');
      
      doc.fontSize(10).fillColor('#666666').font('Helvetica').text('Order ID:', 70, y + 40);
      doc.fontSize(10).fillColor('#333333').font('Helvetica-Bold').text(order.razorpayOrderId || orderId, 160, y + 40);
      
      doc.fontSize(10).fillColor('#666666').font('Helvetica').text('Order Date:', 70, y + 60);
      doc.fontSize(10).fillColor('#333333').text(new Date(order.createdAt).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      }), 160, y + 60);
      
      doc.fontSize(10).fillColor('#666666').font('Helvetica').text('Payment Method:', 70, y + 80);
      doc.fontSize(10).fillColor('#333333').text('Razorpay', 160, y + 80);
      
      doc.fontSize(10).fillColor('#666666').font('Helvetica').text('Payment ID:', 70, y + 100);
      doc.fontSize(10).fillColor('#333333').text(order.razorpayPaymentId || 'Pending', 160, y + 100);
      
      // Draw status badge
      const statusColor = getStatusColor(order.status);
      doc.roundedRect(70, y + 120, 80, 20, 3).fill(statusColor);
      doc.fontSize(10).fillColor('white').text(order.status.toUpperCase(), 75, y + 125);
      
      // Customer info - right side
      doc.fontSize(12).fillColor('#333333').font('Helvetica-Bold').text('CUSTOMER INFORMATION', 290, y + 15);
      doc.moveTo(290, y + 30).lineTo(530, y + 30).stroke('#e6e6e6');
      
      doc.fontSize(10).fillColor('#666666').font('Helvetica').text('Name:', 290, y + 40);
      doc.fontSize(10).fillColor('#333333').font('Helvetica-Bold').text(order.user.name || 'Not Available', 370, y + 40);
      
      doc.fontSize(10).fillColor('#666666').font('Helvetica').text('Email:', 290, y + 60);
      doc.fontSize(10).fillColor('#333333').text(order.user.email || 'Not Available', 370, y + 60);
      
      doc.fontSize(10).fillColor('#666666').font('Helvetica').text('Phone:', 290, y + 80);
      doc.fontSize(10).fillColor('#333333').text(order.shippingAddress.phoneNumber || 'Not Available', 370, y + 80);
      
      // Add shipping address
      doc.fontSize(10).fillColor('#666666').font('Helvetica').text('Ship To:', 290, y + 100);
      doc.fontSize(10).fillColor('#333333').text(`${order.shippingAddress.street || ''}`, 370, y + 100);
      doc.text(`${order.shippingAddress.city || ''}, ${order.shippingAddress.state || ''} ${order.shippingAddress.zipCode || ''}`, 370);
      doc.text(`${order.shippingAddress.country || ''}`, 370);
    };
    
    // Helper function for adding items table
    const addItemsTable = (y) => {
      // Table header
      drawRect(50, y, 500, 30, '#f1f1f1', '#e6e6e6');
      
      doc.fontSize(10).fillColor('#333333').font('Helvetica-Bold').text('ITEM', 70, y + 10);
      doc.text('SELLER', 220, y + 10);
      doc.text('QTY', 340, y + 10, { width: 50, align: 'center' });
      doc.text('PRICE', 390, y + 10, { width: 70, align: 'right' });
      doc.text('TOTAL', 460, y + 10, { width: 70, align: 'right' });
      
      let tableRow = y + 30;
      
      // Add items
      for (const item of order.items) {
        const product = item.product;
        const seller = item.seller;
        const productName = product.name || 'Unknown Product';
        const sellerName = seller ? seller.name : 'Unknown Seller';
        const unitPrice = formatCurrency(item.price);
        const totalPrice = formatCurrency(item.price * item.quantity);
        
        // Draw row background (alternating colors)
        drawRect(50, tableRow, 500, 40, order.items.indexOf(item) % 2 === 0 ? 'white' : '#f9f9f9', '#e6e6e6');
        
        // Item details
        doc.fontSize(10).fillColor('#333333').font('Helvetica').text(productName, 70, tableRow + 10, { width: 140 });
        
        // Seller details
        doc.fontSize(9).fillColor('#666666').text(sellerName, 220, tableRow + 10, { width: 120 });
        if (seller && seller.sellerInfo && seller.sellerInfo.location) {
          doc.fontSize(8).fillColor('#999999').text(seller.sellerInfo.location, 220, tableRow + 22, { width: 120 });
        }
        
        // Quantity, price, total
        doc.fontSize(10).fillColor('#333333').text(item.quantity.toString(), 340, tableRow + 15, { width: 50, align: 'center' });
        doc.text(unitPrice, 390, tableRow + 15, { width: 70, align: 'right' });
        doc.text(totalPrice, 460, tableRow + 15, { width: 70, align: 'right' });
        
        tableRow += 40;
        
        // Check if we need a new page
        if (tableRow > 680) {
          doc.addPage();
          tableRow = 50;
          
          // Add table header to new page
          drawRect(50, tableRow, 500, 30, '#f1f1f1', '#e6e6e6');
          
          doc.fontSize(10).fillColor('#333333').font('Helvetica-Bold').text('ITEM', 70, tableRow + 10);
          doc.text('SELLER', 220, tableRow + 10);
          doc.text('QTY', 340, tableRow + 10, { width: 50, align: 'center' });
          doc.text('PRICE', 390, tableRow + 10, { width: 70, align: 'right' });
          doc.text('TOTAL', 460, tableRow + 10, { width: 70, align: 'right' });
          
          tableRow += 30;
        }
      }
      
      return tableRow;
    };
    
    // Helper function for adding total section
    const addTotals = (y) => {
      // Background for totals
      drawRect(300, y, 250, 120, '#f9f9f9', '#e6e6e6');
      
      // Totals
      doc.fontSize(10).fillColor('#666666').font('Helvetica').text('Subtotal:', 350, y + 20);
      doc.fontSize(10).fillColor('#333333').font('Helvetica-Bold').text(
        formatCurrency(order.totalAmount - (order.taxAmount || 0) - (order.shippingCost || 0)), 
        480, y + 20, { width: 50, align: 'right' }
      );
      
      doc.fontSize(10).fillColor('#666666').font('Helvetica').text('Shipping:', 350, y + 40);
      doc.fontSize(10).fillColor('#333333').font('Helvetica-Bold').text(
        formatCurrency(order.shippingCost || 99), 
        480, y + 40, { width: 50, align: 'right' }
      );
      
      doc.fontSize(10).fillColor('#666666').font('Helvetica').text('GST (18%):', 350, y + 60);
      doc.fontSize(10).fillColor('#333333').font('Helvetica-Bold').text(
        formatCurrency(order.taxAmount || (order.totalAmount * 0.18)), 
        480, y + 60, { width: 50, align: 'right' }
      );
      
      // Total with background highlight
      doc.rect(300, y + 90, 250, 30).fill('#333333');
      doc.fontSize(12).fillColor('white').font('Helvetica-Bold').text('TOTAL:', 350, y + 100);
      doc.text(formatCurrency(order.totalAmount), 480, y + 100, { width: 50, align: 'right' });
    };
    
    // Helper function for adding footer
    const addFooter = (y) => {
      // Thank you note
      doc.roundedRect(50, y, 500, 60, 5).fillAndStroke('#f9f9f9', '#e6e6e6');
      doc.fontSize(12).fillColor('#333333').font('Helvetica-Bold').text('Thank you for your business!', 70, y + 15, { align: 'center' });
      doc.fontSize(10).fillColor('#666666').font('Helvetica').text(
        'If you have any questions about this invoice, please contact our customer support at support@handcraft.com',
        70, y + 35, { width: 460, align: 'center' }
      );
      
      // Final footer with terms
      doc.fontSize(8).fillColor('#999999').text(
        'This is a computer generated invoice and does not require a physical signature. ' +
        'Terms & Conditions apply. All items are subject to our return policy.',
        50, y + 80, { align: 'center' }
      );
      
      doc.fontSize(8).fillColor('#333333').font('Helvetica-Bold').text(
        'HandCraft Store | premium artisan products',
        50, y + 95, { align: 'center' }
      );
    };
    
    // Helper function for status colors
    const getStatusColor = (status) => {
      const colors = {
        'pending': '#f39c12',
        'processing': '#3498db',
        'shipped': '#9b59b6',
        'delivered': '#2ecc71',
        'cancelled': '#e74c3c'
      };
      return colors[status.toLowerCase()] || '#95a5a6';
    };
    
    // Start building the PDF
    createHeader();
    addOrderInfo(170);
    const tableEndY = addItemsTable(330);
    addTotals(tableEndY + 20);
    addFooter(tableEndY + 160);
    
    // End the document
    doc.end();
  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating invoice'
    });
  }
};

// Helper function to format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
} 