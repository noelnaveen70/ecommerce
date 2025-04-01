import React, { useEffect, useState } from "react";
import { 
  FaUsers, FaChartLine, FaShoppingCart, FaRupeeSign, FaEye, 
  FaExclamationTriangle, FaCalendarAlt, FaBoxOpen, 
  FaFileInvoiceDollar, FaChartPie, FaChartBar, FaExchangeAlt,
  FaSpinner, FaInfoCircle, FaArrowUp, FaArrowDown, FaPercentage,
  FaStore, FaShippingFast, FaTags
} from "react-icons/fa";
import { Line, Bar, Pie, Doughnut } from "react-chartjs-2";
import axiosInstance from "../../axiosInstance";
import "chart.js/auto";
import { Link } from "react-router-dom";

// Custom Spinner component
const Spinner = ({ size = 24, color = "#4F46E5" }) => {
  return (
    <FaSpinner
      size={size}
      color={color}
      className="animate-spin"
    />
  );
};

// Custom tooltip component
const InfoTooltip = ({ text }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  return (
    <div className="relative inline-block ml-2">
      <FaInfoCircle 
        className="text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        size={16}
      />
      {showTooltip && (
        <div className="absolute z-10 w-64 p-2 bg-black bg-opacity-80 text-white text-xs rounded shadow-lg -left-28 -top-1 transform -translate-y-full">
          {text}
        </div>
      )}
    </div>
  );
};

const PlatformAnalytics = () => {
  const [analytics, setAnalytics] = useState({
    totalUsers: 0,
    totalSales: 0,
    totalEarnings: 0,
    dailyViews: 0,
    reports: 0,
    userGrowth: [],
    revenueGrowth: [],
    categoryData: [],
    topProducts: [],
    disputes: { open: 0, resolved: 0 },
    growth: {
      users: 0,
      sales: 0,
      earnings: 0,
      views: 0,
      reports: 0
    }
  });
  
  const [timeRange, setTimeRange] = useState("month");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axiosInstance.get(`/api/admin/analytics?timeRange=${timeRange}`);
      
      if (response.data.success) {
        console.log("Analytics data:", response.data.data);
        setAnalytics(response.data.data);
      } else {
        setError("Failed to fetch analytics data");
      }
    } catch (err) {
      console.error("Error fetching analytics:", err);
      setError("Error connecting to server. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    // Set up auto-refresh every 5 minutes
    const interval = setInterval(fetchAnalytics, 300000);
    return () => clearInterval(interval);
  }, [timeRange]);

  // Prepare data for user growth chart
  const userGrowthData = {
    labels: analytics.userGrowth.map((entry) => entry.date),
    datasets: [
      {
        label: "New Users",
        data: analytics.userGrowth.map((entry) => entry.count),
        borderColor: "#4F46E5",
        backgroundColor: "rgba(79, 70, 229, 0.2)",
        fill: true,
        tension: 0.4
      },
    ],
  };
  
  // Prepare data for revenue growth chart
  const revenueGrowthData = {
    labels: analytics.revenueGrowth?.map((entry) => entry.date) || [],
    datasets: [
      {
        type: 'line',
        label: "Revenue (₹)",
        data: analytics.revenueGrowth?.map((entry) => entry.revenue) || [],
        borderColor: "#047857",
        backgroundColor: "rgba(4, 120, 87, 0.2)",
        fill: true,
        tension: 0.4,
        yAxisID: 'y'
      },
      {
        type: 'bar',
        label: "Orders",
        data: analytics.revenueGrowth?.map((entry) => entry.count) || [],
        backgroundColor: "rgba(79, 70, 229, 0.6)",
        borderColor: "rgba(79, 70, 229, 1)",
        borderWidth: 1,
        yAxisID: 'y1'
      }
    ],
  };
  
  // Configure revenue chart options
  const revenueChartOptions = {
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Revenue (₹)'
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        grid: {
          drawOnChartArea: false
        },
        title: {
          display: true,
          text: 'Order Count'
        }
      }
    },
    plugins: {
      legend: {
        position: 'top'
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              if (context.dataset.label === "Revenue (₹)") {
                label += new Intl.NumberFormat('en-IN', { 
                  style: 'currency', 
                  currency: 'INR',
                  maximumFractionDigits: 0
                }).format(context.parsed.y);
              } else {
                label += context.parsed.y;
              }
            }
            return label;
          }
        }
      }
    }
  };
  
  // Prepare data for category sales chart
  const categorySalesData = {
    labels: analytics.categoryData?.map((entry) => entry.category) || [],
    datasets: [
      {
        data: analytics.categoryData?.map((entry) => entry.sales) || [],
        backgroundColor: [
          "#4F46E5", "#047857", "#F59E0B", "#DB2777", "#7C3AED", 
          "#10B981", "#6366F1", "#D97706", "#DC2626"
        ],
        borderColor: "#fff",
        borderWidth: 2
      },
    ],
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };
  
  // Format percentage
  const formatGrowth = (value) => {
    const isPositive = value >= 0;
    return `${isPositive ? '+' : ''}${value.toFixed(1)}%`;
  };
  
  // Handle time range change
  const handleTimeRangeChange = (range) => {
    setTimeRange(range);
  };

  if (loading && analytics.totalUsers === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="mb-4">
            <Spinner size={60} />
          </div>
          <p className="text-gray-600">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="font-bold">Error</p>
          <p>{error}</p>
          <button 
            onClick={fetchAnalytics}
            className="mt-2 bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Back button */}
      <div className="mb-4">
        <Link 
          to="/Adminpanel" 
          className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors shadow-md"
        >
          <FaChartBar className="mr-2" /> Back to Admin Dashboard
        </Link>
      </div>

      {/* Header with title and time range filter */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent">
              Platform Analytics Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Performance metrics for the {timeRange === 'week' ? 'past week' : timeRange === 'month' ? 'past month' : 'past year'}
            </p>
          </div>
          
          <div className="flex items-center space-x-2 bg-gray-100 p-1 border rounded-lg">
            <button 
              onClick={() => handleTimeRangeChange("week")}
              className={`px-4 py-2 rounded-md font-medium transition-all ${
                timeRange === "week" 
                  ? "bg-indigo-600 text-white shadow-md" 
                  : "hover:bg-gray-200"
              }`}
            >
              Week
            </button>
            <button 
              onClick={() => handleTimeRangeChange("month")}
              className={`px-4 py-2 rounded-md font-medium transition-all ${
                timeRange === "month" 
                  ? "bg-indigo-600 text-white shadow-md" 
                  : "hover:bg-gray-200"
              }`}
            >
              Month
            </button>
            <button 
              onClick={() => handleTimeRangeChange("year")}
              className={`px-4 py-2 rounded-md font-medium transition-all ${
                timeRange === "year" 
                  ? "bg-indigo-600 text-white shadow-md" 
                  : "hover:bg-gray-200"
              }`}
            >
              Year
            </button>
          </div>
        </div>
      </div>

      {/* Key metrics section - now with 3 cards instead of 4 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard 
          title="Total Users" 
          value={analytics.totalUsers.toLocaleString()} 
          icon={<FaUsers />} 
          color="blue" 
          growth={formatGrowth(analytics.growth.users)}
          tooltip="Total number of registered users on the platform"
          timeRange={timeRange}
        />
        <StatCard 
          title="Total Sales" 
          value={analytics.totalSales.toLocaleString()} 
          icon={<FaShoppingCart />} 
          color="yellow" 
          growth={formatGrowth(analytics.growth.sales)}
          tooltip="Total number of items sold in the selected period"
          timeRange={timeRange}
        />
        <StatCard 
          title="Total Revenue" 
          value={formatCurrency(analytics.totalEarnings)} 
          icon={<FaRupeeSign />} 
          color="green" 
          growth={formatGrowth(analytics.growth.earnings)}
          tooltip="Total revenue generated in the selected period"
          timeRange={timeRange}
        />
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <StatCard 
          title="Daily Platform Views" 
          value={analytics.dailyViews.toLocaleString()} 
          icon={<FaEye />} 
          color="indigo" 
          growth={formatGrowth(analytics.growth.views)}
          tooltip="Average daily views across the platform" 
          timeRange={timeRange}
        />
        <StatCard 
          title="Reports & Issues" 
          value={analytics.reports.toLocaleString()} 
          icon={<FaExclamationTriangle />} 
          color="red" 
          growth={formatGrowth(analytics.growth.reports)} 
          reverse={true}
          tooltip="Total number of reports and issues submitted by users"
          timeRange={timeRange}
        />
      </div>

      {/* Main dashboard sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Charts section */}
        <div className="bg-white shadow-lg rounded-xl p-6 overflow-hidden">
          <h3 className="text-xl font-semibold mb-4 flex items-center text-gray-800">
            <FaUsers className="mr-2 text-indigo-600" /> User Growth Trend
          </h3>
          <div className="h-80">
            {analytics.userGrowth?.length > 0 ? (
              <Line 
                data={userGrowthData} 
                options={{ 
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top'
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                      }
                    },
                    x: {
                      grid: {
                        display: false
                      }
                    }
                  }
                }} 
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full">
                <FaChartLine className="text-gray-300 mb-2" size={48} />
                <p className="text-gray-500">No user growth data available</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white shadow-lg rounded-xl p-6 overflow-hidden">
          <h3 className="text-xl font-semibold mb-4 flex items-center text-gray-800">
            <FaFileInvoiceDollar className="mr-2 text-green-600" /> Revenue & Orders
          </h3>
          <div className="h-80">
            {analytics.revenueGrowth?.length > 0 ? (
              <Line 
                data={revenueGrowthData} 
                options={{ 
                  ...revenueChartOptions,
                  maintainAspectRatio: false
                }} 
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full">
                <FaFileInvoiceDollar className="text-gray-300 mb-2" size={48} />
                <p className="text-gray-500">No revenue data available</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lower sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Dispute Resolution Panel */}
        <div className="bg-white shadow-lg rounded-xl p-6 overflow-hidden">
          <h3 className="text-xl font-semibold mb-6 flex items-center text-gray-800">
            <FaExchangeAlt className="mr-2 text-indigo-600" /> Dispute Resolution Status
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-red-50 rounded-lg p-4 text-center">
              <h4 className="text-sm font-medium text-gray-500 mb-1">Open Disputes</h4>
              <p className="text-3xl font-bold text-red-500">{analytics.disputes?.open || 0}</p>
              <p className="text-xs text-gray-500 mt-1">
                Requiring attention
              </p>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <h4 className="text-sm font-medium text-gray-500 mb-1">Resolved</h4>
              <p className="text-3xl font-bold text-green-500">{analytics.disputes?.resolved || 0}</p>
              <p className="text-xs text-gray-500 mt-1">
                Successfully closed
              </p>
            </div>
            
            <div className="bg-indigo-50 rounded-lg p-4 text-center">
              <h4 className="text-sm font-medium text-gray-500 mb-1">Resolution Rate</h4>
              <p className="text-3xl font-bold text-indigo-500">
                {analytics.disputes?.open + analytics.disputes?.resolved > 0 
                  ? Math.round((analytics.disputes?.resolved / (analytics.disputes?.open + analytics.disputes?.resolved)) * 100) 
                  : 0}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Overall efficiency
              </p>
            </div>
          </div>
          
          <div className="mt-6 bg-gray-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium mb-2 flex items-center">
              <FaInfoCircle className="text-indigo-400 mr-2" /> Resolution Tips
            </h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li className="flex items-start">
                <span className="text-indigo-500 mr-2">•</span>
                <span>Address high-priority disputes first</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-500 mr-2">•</span>
                <span>Aim for same-day resolution when possible</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-500 mr-2">•</span>
                <span>Follow up with both parties after resolution</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Category Sales Distribution */}
        <div className="bg-white shadow-lg rounded-xl p-6 overflow-hidden">
          <h3 className="text-xl font-semibold mb-4 flex items-center text-gray-800">
            <FaChartPie className="mr-2 text-indigo-600" /> Category Distribution
          </h3>
          <div className="h-80">
            {analytics.categoryData?.length > 0 ? (
              <Doughnut 
                data={categorySalesData} 
                options={{ 
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'right',
                      labels: {
                        boxWidth: 15,
                        padding: 15,
                        usePointStyle: true,
                        pointStyle: 'circle'
                      }
                    },
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          const label = context.label || '';
                          const value = context.raw || 0;
                          const total = context.dataset.data.reduce((a, b) => a + b, 0);
                          const percentage = ((value / total) * 100).toFixed(1);
                          return `${label}: ${value} (${percentage}%)`;
                        }
                      }
                    }
                  }
                }} 
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full">
                <FaChartPie className="text-gray-300 mb-2" size={48} />
                <p className="text-gray-500">No category data available</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top products section */}
      {analytics.topProducts?.length > 0 && (
        <div className="bg-white shadow-lg rounded-xl p-6 mb-8">
          <h3 className="text-xl font-semibold mb-4 flex items-center text-gray-800">
            <FaBoxOpen className="mr-2 text-indigo-600" /> Top Selling Products
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Units Sold
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analytics.topProducts.map((product, index) => (
                  <tr key={product.id || index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <img 
                            src={product.image || "https://via.placeholder.com/40"} 
                            alt={product.name}
                            className="h-10 w-10 rounded-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = "https://via.placeholder.com/40?text=NA";
                            }}
                          />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 line-clamp-1">
                            {product.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                      {product.totalSales.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Last updated timestamp */}
      <div className="bg-white shadow-sm rounded-lg p-4 text-right text-sm text-gray-500">
        <p className="flex items-center justify-end">
          <FaCalendarAlt className="mr-2" /> 
          Last updated: {new Date().toLocaleString()}
          {loading && (
            <span className="ml-2">
              <Spinner size={14} />
            </span>
          )}
        </p>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, color, growth, reverse = false, tooltip, timeRange }) => {
  const colors = {
    blue: "from-blue-500 to-blue-400 text-blue-50",
    green: "from-green-500 to-green-400 text-green-50",
    yellow: "from-yellow-500 to-yellow-400 text-yellow-50",
    purple: "from-purple-500 to-purple-400 text-purple-50",
    red: "from-red-500 to-red-400 text-red-50",
    indigo: "from-indigo-500 to-indigo-400 text-indigo-50",
  };

  // Determine if growth is positive or negative
  const isPositive = growth && !reverse ? growth.startsWith('+') : growth && reverse ? growth.startsWith('-') : false;
  const isNegative = growth && !reverse ? growth.startsWith('-') : growth && reverse ? growth.startsWith('+') : false;

  // CSS classes for growth indicators
  const growthClass = isPositive 
    ? "text-green-500 bg-green-50" 
    : isNegative 
      ? "text-red-500 bg-red-50" 
      : "text-gray-500 bg-gray-50";

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg transform hover:scale-[1.01]">
      <div className={`bg-gradient-to-r ${colors[color]} p-4 flex justify-between items-center`}>
        <h3 className="text-lg font-semibold flex items-center">
          {title}
          {tooltip && <InfoTooltip text={tooltip} />}
        </h3>
        <div className="text-3xl opacity-80">{icon}</div>
      </div>
      
      <div className="p-6">
        <p className="text-4xl font-bold text-gray-800">{value}</p>
        
        {growth && (
          <div className="mt-4 flex items-center">
            <span className={`px-2 py-1 rounded-full ${growthClass} text-xs font-medium flex items-center`}>
              {isPositive ? (
                <FaArrowUp className="mr-1" size={10} />
              ) : isNegative ? (
                <FaArrowDown className="mr-1" size={10} />
              ) : (
                <FaPercentage className="mr-1" size={10} />
              )}
              {growth}
            </span>
            <span className="text-xs text-gray-500 ml-2">
              vs previous {timeRange}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlatformAnalytics;
