const Order = require('../model/orderModel');
const Product = require('../model/productModel');
const User = require('../model/userModel');

// Get seller analytics data
exports.getSellerAnalytics = async (req, res) => {
  try {
    const sellerId = req.user._id;
    const { timeRange } = req.query;
    
    // Calculate date range based on timeRange
    const now = new Date();
    let startDate = new Date();
    
    // Set default timeRange to month if not specified
    const range = timeRange || 'month';
    
    if (range === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (range === 'month') {
      startDate.setMonth(now.getMonth() - 1);
    } else if (range === 'year') {
      startDate.setFullYear(now.getFullYear() - 1);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid time range. Use week, month, or year.'
      });
    }
    
    // Find orders for this seller within the date range - exclude cancelled orders
    const orders = await Order.find({
      'items.seller': sellerId,
      status: { $ne: 'cancelled' }, // Exclude cancelled orders
      createdAt: { $gte: startDate, $lte: now }
    }).populate('items.product');
    
    // Calculate total sales, revenue, and order count
    let totalSales = 0;
    let totalRevenue = 0;
    let totalOrders = new Set();
    let salesByDay = {};
    let salesByCategory = {};
    let topProducts = {};
    
    // Process only non-cancelled orders
    orders.forEach(order => {
      totalOrders.add(order._id.toString());
      
      // Process only items from this seller
      order.items.forEach(item => {
        if (item.seller && item.seller.toString() === sellerId.toString()) {
          const itemTotal = item.price * item.quantity;
          const shippingCost = order.shippingCost || 99;
          const taxAmount = order.taxAmount || Math.round(itemTotal * 0.18);
          const totalWithExtras = itemTotal + shippingCost + taxAmount;
          
          totalSales += item.quantity;
          totalRevenue += totalWithExtras;
          
          // Track sales by date
          const orderDate = new Date(order.createdAt);
          const dateKey = orderDate.toISOString().split('T')[0];
          
          if (!salesByDay[dateKey]) {
            salesByDay[dateKey] = {
              date: dateKey,
              sales: 0,
              revenue: 0
            };
          }
          
          salesByDay[dateKey].sales += item.quantity;
          salesByDay[dateKey].revenue += totalWithExtras;
          
          // Track sales by category
          if (item.product && item.product.category) {
            const category = item.product.category;
            
            if (!salesByCategory[category]) {
              salesByCategory[category] = 0;
            }
            
            salesByCategory[category] += item.quantity;
            console.log(`Added ${item.quantity} to category ${category}, new total: ${salesByCategory[category]}`);
          }
          
          // Track top products
          if (item.product) {
            const productId = item.product._id.toString();
            
            if (!topProducts[productId]) {
              topProducts[productId] = {
                id: productId,
                name: item.product.name,
                unitsSold: 0,
                revenue: 0,
                image: item.product.image
              };
            }
            
            topProducts[productId].unitsSold += item.quantity;
            topProducts[productId].revenue += totalWithExtras;
          }
        }
      });
    });
    
    // Convert salesByDay object to array and sort by date
    const salesGrowth = Object.values(salesByDay).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );
    
    // Convert salesByCategory object to pie chart data
    const categoryData = Object.entries(salesByCategory).map(([category, count]) => ({
      category,
      count
    }));
    
    console.log('Raw category data from orders:', categoryData);
    
    // Get all products for this seller to extract categories
    const sellerProducts = await Product.find({ seller: sellerId });
    console.log(`DEBUG: Found ${sellerProducts.length} products for seller ${sellerId}`);
    
    // Extract unique categories from seller's products with details
    const uniqueCategories = [...new Set(sellerProducts.map(p => p.category))];
    console.log('DEBUG: Unique categories from seller products:', uniqueCategories);
    
    // Make sure all categories are represented even if they have no sales
    const existingCategories = categoryData.map(item => item.category);
    console.log('DEBUG: Existing categories from sales:', existingCategories);
    
    const missingCategories = uniqueCategories.filter(category => !existingCategories.includes(category));
    console.log('DEBUG: Missing categories (adding placeholders):', missingCategories);
    
    // Add placeholder data for missing categories
    missingCategories.forEach(category => {
      categoryData.push({
        category,
        count: 0 // No sales yet
      });
    });
    
    // Ensure we have at least some categories for display
    if (categoryData.length === 0) {
      // If the seller has products but no categories detected, add from products
      if (sellerProducts.length > 0) {
        console.log('DEBUG: Adding categories from seller products as placeholders');
        uniqueCategories.forEach(category => {
          categoryData.push({
            category,
            count: 0
          });
        });
      } 
      // If no products found, add default categories
      else {
        console.log('DEBUG: No products or categories found, adding default placeholders');
        ['home-living', 'clothing', 'jewellery', 'toys', 'art'].forEach(category => {
          categoryData.push({
            category,
            count: 0
          });
        });
      }
    }
    
    console.log('DEBUG: Final category data being sent:', JSON.stringify(categoryData));
    
    // Convert topProducts object to array and sort by units sold (descending)
    const topProductsArray = Object.values(topProducts)
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, 5); // Get top 5
    
    // Calculate total inventory value and units
    const products = await Product.find({ seller: sellerId });
    let totalInventoryValue = 0;
    let totalInventoryUnits = 0;
    let lowStockItems = 0;
    let outOfStockItems = 0;
    
    products.forEach(product => {
      totalInventoryValue += product.price * product.stock;
      totalInventoryUnits += product.stock;
      
      if (product.stock === 0) {
        outOfStockItems++;
      } else if (product.stock <= 5) {
        lowStockItems++;
      }
    });
    
    // Calculate performance metrics (growth rates, conversion, etc.)
    // Get previous period data for comparison
    let previousStartDate = new Date(startDate);
    if (range === 'week') {
      previousStartDate.setDate(previousStartDate.getDate() - 7);
    } else if (range === 'month') {
      previousStartDate.setMonth(previousStartDate.getMonth() - 1);
    } else if (range === 'year') {
      previousStartDate.setFullYear(previousStartDate.getFullYear() - 1);
    }
    
    // Exclude cancelled orders from previous period too
    const previousPeriodOrders = await Order.find({
      'items.seller': sellerId,
      status: { $ne: 'cancelled' }, // Exclude cancelled orders
      createdAt: { $gte: previousStartDate, $lt: startDate }
    });
    
    // Calculate previous period metrics
    let previousSales = 0;
    let previousRevenue = 0;
    let previousOrders = new Set();
    
    previousPeriodOrders.forEach(order => {
      previousOrders.add(order._id.toString());
      
      order.items.forEach(item => {
        if (item.seller && item.seller.toString() === sellerId.toString()) {
          const itemTotal = item.price * item.quantity;
          const shippingCost = order.shippingCost || 99;
          const taxAmount = order.taxAmount || Math.round(itemTotal * 0.18);
          const totalWithExtras = itemTotal + shippingCost + taxAmount;
          
          previousSales += item.quantity;
          previousRevenue += totalWithExtras;
        }
      });
    });
    
    // Calculate growth rates
    const salesGrowthRate = previousSales === 0 
      ? 100 
      : ((totalSales - previousSales) / previousSales) * 100;
      
    const revenueGrowthRate = previousRevenue === 0 
      ? 100 
      : ((totalRevenue - previousRevenue) / previousRevenue) * 100;
    
    // Create inventory alerts
    const inventoryAlerts = [];
    products.forEach(product => {
      if (product.stock === 0) {
        inventoryAlerts.push({
          product: product.name,
          message: 'Out of stock'
        });
      } else if (product.stock <= 5) {
        inventoryAlerts.push({
          product: product.name,
          message: `Only ${product.stock} items left in stock`
        });
      }
    });
    
    // Calculate average order value
    const averageOrderValue = totalOrders.size === 0 
      ? 0 
      : totalRevenue / totalOrders.size;
    
    // Get conversion rate (from previous seller interaction data)
    // This is a simplified approximation - in a real app you'd track page views
    const conversionRate = 3.2; // Placeholder for now
    
    // Prepare response data
    const analyticsData = {
      timeRange: range,
      totalSales,
      totalRevenue,
      totalOrders: totalOrders.size,
      totalProducts: products.length,
      totalInventoryValue,
      totalInventoryUnits,
      lowStockItems,
      outOfStockItems,
      salesGrowth,
      topProducts: topProductsArray,
      categoryData,
      inventoryAlerts,
      performanceMetrics: {
        salesGrowth: parseFloat(salesGrowthRate.toFixed(1)),
        revenueGrowth: parseFloat(revenueGrowthRate.toFixed(1)),
        averageOrderValue: parseFloat(averageOrderValue.toFixed(2)),
        conversionRate
      }
    };
    
    res.status(200).json({
      success: true,
      data: analyticsData
    });
  } catch (error) {
    console.error('Error fetching seller analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics data',
      error: error.message
    });
  }
}; 