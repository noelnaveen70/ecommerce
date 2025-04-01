import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FaShoppingBag, 
  FaInfoCircle, 
  FaMapMarkerAlt, 
  FaCalendarAlt, 
  FaCheck, 
  FaSpinner, 
  FaTruck, 
  FaRedo,
  FaSearch,
  FaCreditCard
} from "react-icons/fa";
import axiosInstance from "../axiosInstance";
import { getAuthToken } from "../utils/auth";
import Footer from "../components/Footer/Footer";

const SellerOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: "", type: "" });
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    processingOrders: 0,
    shippedOrders: 0,
    deliveredOrders: 0,
    totalRevenue: 0,
    cancelledOrders: 0
  });
  
  // Function to check and update order status based on time
  const checkAndUpdateOrderStatus = async (order) => {
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
      
      // If status needs to be updated
      if (newStatus !== order.status) {
        try {
          const response = await axiosInstance.put(`/api/orders/seller-orders/${order._id}/status`, {
            status: newStatus
          });
          
          if (response.data.success) {
            showNotification(`Order #${order.orderNumber} automatically updated to ${newStatus}`, "success");
            return {
              ...order,
              status: newStatus,
              lastUpdated: now.toISOString()
            };
          }
        } catch (error) {
          console.error(`Error auto-updating order ${order._id} status:`, error);
        }
      }
    }
    
    return order;
  };
  
  // Function to fetch and update orders with stats
  const fetchAndUpdateOrders = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get("/api/orders/seller-orders");
      
      if (response.data.success) {
        // Check if user is a seller
        if (response.data.role !== 'seller') {
          navigate('/orders');
          return;
        }
        
        // Process orders and update statuses
        const ordersToUpdate = response.data.orders;
        const updatedOrders = await Promise.all(
          ordersToUpdate.map(checkAndUpdateOrderStatus)
        );
        
        setOrders(updatedOrders);
        
        // Recalculate stats with updated orders
        const newStats = updatedOrders.reduce((acc, order) => {
          // Don't count cancelled orders in stats
          if (order.status.toLowerCase() !== 'cancelled') {
            // Always count total orders that are not cancelled
            acc.totalOrders++;
            
            // Add all non-cancelled orders to total revenue
            acc.totalRevenue += order.totalAmount;
            
            // Count orders by status
            switch(order.status.toLowerCase()) {
              case 'pending':
                acc.pendingOrders++;
                break;
              case 'processing':
                acc.processingOrders++;
                break;
              case 'shipped':
                acc.shippedOrders++;
                break;
              case 'delivered':
                acc.deliveredOrders++;
                break;
            }
          } else {
            // Track cancelled orders separately
            acc.cancelledOrders++;
          }
          
          return acc;
        }, {
          totalOrders: 0,
          pendingOrders: 0,
          processingOrders: 0,
          shippedOrders: 0,
          deliveredOrders: 0,
          totalRevenue: 0,
          cancelledOrders: 0
        });
        
        setStats(newStats);
        setError(null);
      } else {
        setError("Failed to load orders: " + (response.data.message || "Unknown error"));
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
      if (err.response?.status === 401) {
        setError("Your session has expired. Please log in again.");
        setTimeout(() => navigate("/login?redirect=seller-orders"), 2000);
        return;
      }
      setError("Unable to load your orders. Please try again later.");
    } finally {
      setLoading(false);
    }
  };
  
  // Set up polling for order updates
  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      navigate("/login?redirect=seller-orders");
      return;
    }
    
    // Initial fetch
    fetchAndUpdateOrders();
    
    // Set up polling interval (every 5 minutes)
    const pollInterval = setInterval(fetchAndUpdateOrders, 5 * 60 * 1000);
    
    // Cleanup
    return () => clearInterval(pollInterval);
  }, [navigate]);
  
  // Format date
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  // Format time
  const formatTime = (dateString) => {
    const options = { hour: 'numeric', minute: 'numeric' };
    return new Date(dateString).toLocaleTimeString(undefined, options);
  };
  
  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };
  
  // Handle order cancellation
  const handleCancelOrder = async (orderId) => {
    try {
      setLoading(true);
      const response = await axiosInstance.put(`/api/orders/seller-orders/${orderId}/cancel`);
      
      if (response.data.success) {
        // Get the old order before updating it in state
        const oldOrder = orders.find(o => o._id === orderId);
        const oldStatus = oldOrder.status.toLowerCase();
        
        // Update the order in state
        setOrders(prevOrders =>
          prevOrders.map(order =>
            order._id === orderId ? response.data.order : order
          )
        );

        // Update stats
        setStats(prevStats => {
          // Create a new stats object
          const newStats = { ...prevStats };
          
          // Decrease count for old status
          newStats[`${oldStatus}Orders`] = prevStats[`${oldStatus}Orders`] - 1;
          
          // If the order wasn't already cancelled, adjust the total orders and revenue
          if (oldStatus !== 'cancelled') {
            newStats.totalOrders = prevStats.totalOrders - 1;
            newStats.totalRevenue = prevStats.totalRevenue - oldOrder.totalAmount;
          }
          
          // Increase cancelled orders count
          newStats.cancelledOrders = (prevStats.cancelledOrders || 0) + 1;
          
          return newStats;
        });

        showNotification('Order cancelled successfully', "success");
      } else {
        showNotification(response.data.message || "Failed to cancel order", "error");
      }
    } catch (err) {
      console.error("Error cancelling order:", err);
      showNotification(err.response?.data?.message || "An error occurred while cancelling the order", "error");
    } finally {
      setLoading(false);
    }
  };
  
  // Render status badge and cancel button
  const renderStatusAndActions = (order) => {
    const canCancel = !['cancelled', 'delivered'].includes(order.status.toLowerCase());
    
    return (
      <div className="flex flex-col space-y-2">
        <div className="flex items-center space-x-2">
          {getStatusBadge(order.status)}
        </div>
        {canCancel && (
          <button
            onClick={() => handleCancelOrder(order._id)}
            className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded text-red-800 bg-red-100 hover:bg-red-200 transition-all duration-200"
          >
            <FaRedo className="mr-1 text-xs" />
            Cancel
          </button>
        )}
      </div>
    );
  };

  // Get status badge component
  const getStatusBadge = (status) => {
    const statusConfig = {
      "pending": { 
        color: "bg-yellow-100 text-yellow-800", 
        icon: <FaSpinner className="mr-1 animate-spin" />,
        label: "Payment Pending"
      },
      "processing": { 
        color: "bg-blue-100 text-blue-800", 
        icon: <FaSpinner className="mr-1 animate-spin" />,
        label: "Processing"
      },
      "shipped": { 
        color: "bg-indigo-100 text-indigo-800", 
        icon: <FaTruck className="mr-1" />,
        label: "Shipped"
      },
      "delivered": { 
        color: "bg-green-100 text-green-800", 
        icon: <FaCheck className="mr-1" />,
        label: "Delivered"
      },
      "cancelled": { 
        color: "bg-red-100 text-red-800", 
        icon: <FaRedo className="mr-1" />,
        label: "Cancelled"
      }
    };
    
    const config = statusConfig[status.toLowerCase()] || { 
      color: "bg-gray-100 text-gray-800", 
      icon: <FaInfoCircle className="mr-1" />,
      label: status
    };
    
    return (
      <span className={`flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full ${config.color}`}>
        {config.icon}
        {config.label}
      </span>
    );
  };
  
  // Show notification
  const showNotification = (message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: "", type: "" });
    }, 3000);
  };
  
  // Filter orders based on search term and filter status
  const filteredOrders = orders.filter(order => {
    const matchesStatus = filterStatus === "all" || order.status.toLowerCase() === filterStatus;
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
      order.orderNumber.toLowerCase().includes(searchLower) ||
      (order.customer?.name || '').toLowerCase().includes(searchLower) ||
      (order.customer?.email || '').toLowerCase().includes(searchLower) ||
      order.items.some(item => item.product.name.toLowerCase().includes(searchLower));
    
    return matchesStatus && matchesSearch;
  });
  
  // Render shipping address
  const renderShippingAddress = (address) => {
    if (typeof address === 'string') {
      return address.split(',').map((line, index) => (
        <p key={index} className="text-sm text-gray-600">{line.trim()}</p>
      ));
    }
    
    return (
      <>
        <p className="text-sm text-gray-600 font-medium">{address.label}</p>
        <p className="text-sm text-gray-600">{address.street}</p>
        <p className="text-sm text-gray-600">
          {address.city}, {address.state} {address.zipCode}
        </p>
        <p className="text-sm text-gray-600">{address.country}</p>
        <p className="text-sm text-gray-600 mt-1">
          <span className="font-medium">Phone:</span> {address.phoneNumber}
        </p>
      </>
    );
  };

  if (loading && !orders.length) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-gray-50 min-h-screen py-8">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800">Order Management</h1>
            <p className="text-gray-600 mt-2">Track and manage your orders</p>
          </div>
          
          {notification.show && (
            <div className={`mb-6 p-4 rounded-lg ${
              notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {notification.message}
            </div>
          )}
          
          {error && (
            <div className="mb-6 p-4 bg-red-100 text-red-800 rounded-lg">
              {error}
            </div>
          )}
          
          {/* Order Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="text-sm font-medium text-gray-500">Total Orders</h3>
              <p className="text-2xl font-bold text-gray-900 mt-2">{stats.totalOrders}</p>
            </div>
            <div className="bg-yellow-50 rounded-lg shadow-sm p-4">
              <h3 className="text-sm font-medium text-yellow-700">Pending</h3>
              <p className="text-2xl font-bold text-yellow-900 mt-2">{stats.pendingOrders}</p>
            </div>
            <div className="bg-blue-50 rounded-lg shadow-sm p-4">
              <h3 className="text-sm font-medium text-blue-700">Processing</h3>
              <p className="text-2xl font-bold text-blue-900 mt-2">{stats.processingOrders}</p>
            </div>
            <div className="bg-indigo-50 rounded-lg shadow-sm p-4">
              <h3 className="text-sm font-medium text-indigo-700">Shipped</h3>
              <p className="text-2xl font-bold text-indigo-900 mt-2">{stats.shippedOrders}</p>
            </div>
            <div className="bg-green-50 rounded-lg shadow-sm p-4">
              <h3 className="text-sm font-medium text-green-700">Delivered</h3>
              <p className="text-2xl font-bold text-green-900 mt-2">{stats.deliveredOrders}</p>
            </div>
            <div className="bg-purple-50 rounded-lg shadow-sm p-4">
              <h3 className="text-sm font-medium text-purple-700">Total Revenue</h3>
              <p className="text-2xl font-bold text-purple-900 mt-2">{formatCurrency(stats.totalRevenue)}</p>
            </div>
          </div>
          
          {/* Filters & Search */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaSearch className="text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search by order number, customer name, or product..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              
              <div className="min-w-[200px]">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="all">All Orders</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Orders List */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading orders...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="p-8 text-center">
                <FaShoppingBag className="mx-auto text-gray-300 text-5xl mb-4" />
                <h2 className="text-xl font-medium text-gray-800 mb-2">No orders found</h2>
                <p className="text-gray-600">
                  {orders.length === 0 
                    ? "You haven't received any orders yet."
                    : "No orders match your current filters."
                  }
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                    <tr>
                      <th className="px-6 py-3">Order Details</th>
                      <th className="px-6 py-3">Customer</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Amount</th>
                      <th className="px-6 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredOrders.map((order) => (
                      <React.Fragment key={order._id}>
                        <tr className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <p className="font-medium text-gray-800">#{order.orderNumber}</p>
                            <p className="text-sm text-gray-500">{formatDate(order.createdAt)}</p>
                            <p className="text-xs text-gray-400">{formatTime(order.createdAt)}</p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <p className="font-medium text-gray-800">{order.customer?.name || 'Unknown Customer'}</p>
                              <p className="text-sm text-gray-500">{order.customer?.email || 'No email'}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {renderStatusAndActions(order)}
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-medium text-gray-800">{formatCurrency(order.totalAmount)}</p>
                            <p className="text-xs text-gray-500">{order.items.length} items</p>
                          </td>
                          <td className="px-6 py-4">
                            <button 
                              onClick={() => setExpandedOrder(expandedOrder === order._id ? null : order._id)}
                              className="text-primary hover:text-primary-dark transition-colors"
                            >
                              {expandedOrder === order._id ? "Hide Details" : "View Details"}
                            </button>
                          </td>
                        </tr>
                        
                        {/* Expanded Order Details */}
                        {expandedOrder === order._id && (
                          <tr>
                            <td colSpan="5" className="px-6 py-4 bg-gray-50">
                              <div className="space-y-6">
                                {/* Order Items */}
                                <div>
                                  <h3 className="text-lg font-medium text-gray-900 mb-4">Order Items</h3>
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {order.items.map((item, idx) => (
                                      <div key={idx} className="bg-white rounded-lg shadow-sm overflow-hidden">
                                        <div className="aspect-w-16 aspect-h-9">
                                          <img 
                                            src={item.product.image} 
                                            alt={item.product.name}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                              e.target.onerror = null;
                                              e.target.src = 'https://via.placeholder.com/300x200?text=No+Image';
                                            }}
                                          />
                                        </div>
                                        <div className="p-4">
                                          <h4 className="font-medium text-gray-900 mb-2">
                                            {item.product.name}
                                          </h4>
                                          <div className="space-y-2">
                                            <p className="text-sm text-gray-500">
                                              Quantity: <span className="font-medium text-gray-900">{item.quantity}</span>
                                            </p>
                                            <p className="text-sm text-gray-500">
                                              Price: <span className="font-medium text-gray-900">{formatCurrency(item.price)}</span>
                                            </p>
                                            <p className="text-sm text-gray-500">
                                              Total: <span className="font-medium text-gray-900">{formatCurrency(item.quantity * item.price)}</span>
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Order Details Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                  {/* Shipping Information */}
                                  <div className="bg-white rounded-lg shadow-sm p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                      <FaMapMarkerAlt className="text-primary" />
                                      <h3 className="text-lg font-medium text-gray-900">Shipping Information</h3>
                                    </div>
                                    <div className="space-y-1">
                                      {renderShippingAddress(order.shippingAddress)}
                                    </div>
                                  </div>

                                  {/* Payment Information */}
                                  <div className="bg-white rounded-lg shadow-sm p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                      <FaCreditCard className="text-primary" />
                                      <h3 className="text-lg font-medium text-gray-900">Payment Information</h3>
                                    </div>
                                    <div className="space-y-2">
                                      <p className="text-sm text-gray-600">
                                        <span className="font-medium">Payment ID:</span><br />
                                        {order.paymentId || 'N/A'}
                                      </p>
                                      <p className="text-sm text-gray-600">
                                        <span className="font-medium">Method:</span><br />
                                        {order.paymentMethod || 'Online Payment'}
                                      </p>
                                      <p className="text-sm text-gray-600">
                                        <span className="font-medium">Status:</span><br />
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                          order.paymentStatus === 'completed' 
                                            ? 'bg-green-100 text-green-800' 
                                            : 'bg-yellow-100 text-yellow-800'
                                        }`}>
                                          {order.paymentStatus || 'Pending'}
                                        </span>
                                      </p>
                                    </div>
                                  </div>

                                  {/* Order Summary */}
                                  <div className="bg-white rounded-lg shadow-sm p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                      <FaShoppingBag className="text-primary" />
                                      <h3 className="text-lg font-medium text-gray-900">Order Summary</h3>
                                    </div>
                                    <div className="space-y-2">
                                      <div className="flex justify-between text-sm text-gray-600">
                                        <span>Subtotal:</span>
                                        <span className="font-medium">{formatCurrency(order.subtotal)}</span>
                                      </div>
                                      <div className="flex justify-between text-sm text-gray-600">
                                        <span>Shipping:</span>
                                        <span className="font-medium">{formatCurrency(order.shippingCost || 99)}</span>
                                      </div>
                                      <div className="flex justify-between text-sm text-gray-600">
                                        <span>Tax (18%):</span>
                                        <span className="font-medium">{formatCurrency(order.taxAmount || order.subtotal * 0.18)}</span>
                                      </div>
                                      <div className="h-px bg-gray-200 my-2"></div>
                                      <div className="flex justify-between text-base font-medium text-gray-900">
                                        <span>Total:</span>
                                        <span>{formatCurrency(
                                          order.subtotal + 
                                          (order.shippingCost || 99) + 
                                          (order.taxAmount || order.subtotal * 0.18)
                                        )}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Order Timeline */}
                                <div className="bg-white rounded-lg shadow-sm p-4">
                                  <div className="flex items-center gap-2 mb-4">
                                    <FaCalendarAlt className="text-primary" />
                                    <h3 className="text-lg font-medium text-gray-900">Order Timeline</h3>
                                  </div>
                                  <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                      <div className="flex-shrink-0">
                                        <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">
                                          <FaShoppingBag size={14} />
                                        </div>
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium text-gray-900">Order Placed</p>
                                        <p className="text-xs text-gray-500">{formatDate(order.createdAt)} at {formatTime(order.createdAt)}</p>
                                      </div>
                                    </div>
                                    {order.paidAt && (
                                      <div className="flex items-center gap-4">
                                        <div className="flex-shrink-0">
                                          <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center">
                                            <FaCheck size={14} />
                                          </div>
                                        </div>
                                        <div>
                                          <p className="text-sm font-medium text-gray-900">Payment Confirmed</p>
                                          <p className="text-xs text-gray-500">{formatDate(order.paidAt)} at {formatTime(order.paidAt)}</p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default SellerOrders; 