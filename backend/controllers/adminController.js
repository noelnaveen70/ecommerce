const Order = require('../model/orderModel');
const Product = require('../model/productModel');
const User = require('../model/userModel');
const Dispute = require('../model/disputeModel');
const Report = require('../model/reportModel');

// Get platform analytics data for admin dashboard
exports.getPlatformAnalytics = async (req, res) => {
  try {
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

    // Get previous period start for growth calculations
    let previousStartDate = new Date(startDate);
    if (range === 'week') {
      previousStartDate.setDate(previousStartDate.getDate() - 7);
    } else if (range === 'month') {
      previousStartDate.setMonth(previousStartDate.getMonth() - 1);
    } else if (range === 'year') {
      previousStartDate.setFullYear(previousStartDate.getFullYear() - 1);
    }
    
    // Get user statistics
    const totalUsers = await User.countDocuments();
    
    // Get user growth data
    const userRegistrationData = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: now }
        }
      },
      {
        $group: {
          _id: { 
            $dateToString: { 
              format: "%Y-%m-%d", 
              date: "$createdAt" 
            }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { "_id": 1 }
      }
    ]);
    
    // Format user growth data for chart
    const userGrowth = userRegistrationData.map(item => ({
      date: item._id,
      count: item.count
    }));
    
    // Get previous period user count for growth calculation
    const previousPeriodUsers = await User.countDocuments({
      createdAt: { $gte: previousStartDate, $lt: startDate }
    });
    
    // Calculate user growth rate
    const userGrowthRate = previousPeriodUsers === 0 
      ? 100 
      : ((totalUsers - previousPeriodUsers) / previousPeriodUsers) * 100;
    
    // Get order statistics
    const orders = await Order.find({
      createdAt: { $gte: startDate, $lte: now },
      status: { $ne: 'cancelled' }
    });
    
    // Calculate total sales and earnings
    let totalSales = 0;
    let totalEarnings = 0;
    
    orders.forEach(order => {
      // Count total items sold
      order.items.forEach(item => {
        totalSales += item.quantity;
      });
      
      // Add to total earnings
      totalEarnings += order.totalAmount;
    });
    
    // Get previous period orders
    const previousPeriodOrders = await Order.find({
      createdAt: { $gte: previousStartDate, $lt: startDate },
      status: { $ne: 'cancelled' }
    });
    
    // Calculate previous period sales and earnings
    let previousSales = 0;
    let previousEarnings = 0;
    
    previousPeriodOrders.forEach(order => {
      order.items.forEach(item => {
        previousSales += item.quantity;
      });
      
      previousEarnings += order.totalAmount;
    });
    
    // Calculate growth rates
    const salesGrowthRate = previousSales === 0 
      ? 100 
      : ((totalSales - previousSales) / previousSales) * 100;
    
    const earningsGrowthRate = previousEarnings === 0 
      ? 100 
      : ((totalEarnings - previousEarnings) / previousEarnings) * 100;
    
    // Get daily views (simplified approximation)
    // In a real app you'd use analytics service like Google Analytics
    const dailyViews = Math.round(totalUsers * 1.8); // Approximation
    const dailyViewsGrowth = 8.3; // Placeholder
    
    // Get report counts
    const reports = await Report.countDocuments({
      createdAt: { $gte: startDate, $lte: now }
    });
    
    // Get previous period report count
    const previousReports = await Report.countDocuments({
      createdAt: { $gte: previousStartDate, $lt: startDate }
    });
    
    // Calculate report growth rate (negative growth is good)
    const reportGrowthRate = previousReports === 0 
      ? 0 
      : ((reports - previousReports) / previousReports) * 100;
    
    // Get order data for revenue chart
    const revenueData = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: now },
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: { 
            $dateToString: { 
              format: "%Y-%m-%d", 
              date: "$createdAt" 
            }
          },
          revenue: { $sum: "$totalAmount" },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { "_id": 1 }
      }
    ]);
    
    // Format revenue data for chart
    const revenueGrowth = revenueData.map(item => ({
      date: item._id,
      revenue: item.revenue,
      count: item.count
    }));
    
    // Get top categories by sales
    const topCategories = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: now },
          status: { $ne: 'cancelled' }
        }
      },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          localField: "items.product",
          foreignField: "_id",
          as: "productData"
        }
      },
      { $unwind: "$productData" },
      {
        $group: {
          _id: "$productData.category",
          totalSales: { $sum: "$items.quantity" },
          revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
        }
      },
      { $sort: { totalSales: -1 } },
      { $limit: 5 }
    ]);
    
    // Format category data for chart
    const categoryData = topCategories.map(item => ({
      category: item._id,
      sales: item.totalSales,
      revenue: item.revenue
    }));
    
    // Get top products by sales
    const topProducts = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: now },
          status: { $ne: 'cancelled' }
        }
      },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          localField: "items.product",
          foreignField: "_id",
          as: "productData"
        }
      },
      { $unwind: "$productData" },
      {
        $group: {
          _id: "$items.product",
          name: { $first: "$productData.name" },
          image: { $first: "$productData.image" },
          category: { $first: "$productData.category" },
          totalSales: { $sum: "$items.quantity" },
          revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
        }
      },
      { $sort: { totalSales: -1 } },
      { $limit: 5 }
    ]);
    
    // Get disputes data
    const openDisputes = await Dispute.countDocuments({ status: "open" });
    const resolvedDisputes = await Dispute.countDocuments({ status: "resolved" });
    
    // Prepare response data
    const analyticsData = {
      timeRange: range,
      totalUsers,
      totalSales,
      totalEarnings,
      dailyViews,
      reports,
      userGrowth,
      revenueGrowth,
      categoryData,
      topProducts,
      disputes: {
        open: openDisputes,
        resolved: resolvedDisputes
      },
      growth: {
        users: parseFloat(userGrowthRate.toFixed(1)),
        sales: parseFloat(salesGrowthRate.toFixed(1)),
        earnings: parseFloat(earningsGrowthRate.toFixed(1)),
        views: parseFloat(dailyViewsGrowth.toFixed(1)),
        reports: parseFloat(reportGrowthRate.toFixed(1))
      }
    };
    
    res.status(200).json({
      success: true,
      data: analyticsData
    });
  } catch (error) {
    console.error('Error fetching platform analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics data',
      error: error.message
    });
  }
}; 