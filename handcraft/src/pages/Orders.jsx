import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FaShoppingBag, 
  FaInfoCircle, 
  FaMapMarkerAlt, 
  FaCalendarAlt, 
  FaBox, 
  FaCheck, 
  FaSpinner, 
  FaTruck, 
  FaRedo,
  FaSearch,
  FaChevronDown,
  FaChevronUp,
  FaStar,
  FaShippingFast,
  FaWarehouse,
  FaRoute,
  FaHome,
  FaBoxOpen,
  FaCopy,
  FaIdCard,
  FaFileInvoice,
  FaDownload
} from "react-icons/fa";
import axiosInstance from "../axiosInstance";
import { getAuthToken } from "../utils/auth";
import Footer from "../components/Footer/Footer";

const Orders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const copyTimeoutRef = useRef(null);
  const [downloadingInvoice, setDownloadingInvoice] = useState(null);
  const [notification, setNotification] = useState({
    show: false,
    message: '',
    type: ''
  });
  
  // Function to check and update order status based on time
  const checkAndUpdateOrderStatus = (order) => {
    const now = new Date();
    const orderDate = new Date(order.createdAt);
    const estimatedDelivery = new Date(order.estimatedDeliveryDate);
    
    // If order is cancelled, keep it cancelled
    if (order.status.toLowerCase() === 'cancelled') {
      return order;
    }

    // If payment is completed (has razorpayPaymentId), start with processing
    if (order.razorpayPaymentId && order.status.toLowerCase() === 'pending') {
      return {
        ...order,
        status: 'processing',
        lastUpdated: now.toISOString()
      };
    }

    // If current time is past estimated delivery, mark as delivered
    if (now >= estimatedDelivery) {
      return {
        ...order,
        status: 'delivered',
        lastUpdated: now.toISOString()
      };
    }

    // Calculate progress percentage (0 to 1)
    const totalTime = estimatedDelivery.getTime() - orderDate.getTime();
    const elapsedTime = now.getTime() - orderDate.getTime();
    const progressPercentage = elapsedTime / totalTime;

    // Define status thresholds
    let newStatus;
    if (progressPercentage < 0.2) {
      newStatus = 'pending';
    } else if (progressPercentage < 0.4) {
      newStatus = 'processing';
    } else if (progressPercentage < 0.6) {
      newStatus = 'shipped';
    } else if (progressPercentage < 0.8) {
      newStatus = 'in transit';
    } else {
      newStatus = 'out for delivery';
    }

    // Only update if status has changed
    if (newStatus !== order.status) {
      return {
        ...order,
        status: newStatus,
        lastUpdated: now.toISOString()
      };
    }

    return order;
  };
  
  // Function to fetch and update orders
  const fetchAndUpdateOrders = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get("/api/orders/user");
      
      if (response.data.success) {
        // Update orders with time-based status changes
        const updatedOrders = response.data.orders.map(order => {
          // Ensure all required fields exist
          if (!order.items || !order.shippingAddress || !order.totalAmount) {
            console.error('Malformed order data:', order);
            return order;
          }
          return checkAndUpdateOrderStatus(order);
        }).filter(Boolean); // Remove any undefined orders
        
        setOrders(updatedOrders);
        setError(null);
      } else {
        setError("Failed to load orders: " + (response.data.message || "Unknown error"));
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
      if (err.response?.status === 401) {
        setError("Your session has expired. Please log in again.");
        setTimeout(() => navigate("/login?redirect=orders"), 2000);
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
      navigate("/login?redirect=orders");
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
  
  // Format price in Rupees
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };
  
  // Format Order ID to be more readable
  const formatOrderId = (orderId) => {
    if (!orderId) return "";
    // Format into groups of 4 for better readability
    return orderId.replace(/(.{4})/g, "$1 ").trim();
  };
  
  // Copy order ID to clipboard
  const copyToClipboard = (text) => {
    if (!text) return;
    
    // Ensure we're copying the raw ID without any formatting
    const cleanedText = text.trim();
    
    navigator.clipboard.writeText(cleanedText)
      .then(() => {
        // Show a small notification that copying was successful
        setNotification({
          show: true,
          message: 'Order ID copied to clipboard!',
          type: 'success'
        });
        
        // Hide notification after 3 seconds
        setTimeout(() => {
          setNotification({
            show: false,
            message: '',
            type: ''
          });
        }, 3000);
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
        setNotification({
          show: true,
          message: 'Failed to copy Order ID',
          type: 'error'
        });
        
        // Hide notification after 3 seconds
        setTimeout(() => {
          setNotification({
            show: false,
            message: '',
            type: ''
          });
        }, 3000);
      });
  };
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);
  
  // Get status badge component with improved status handling
  const getStatusBadge = (order) => {
    const statusConfig = {
      "pending": { 
        color: "bg-yellow-100 text-yellow-800", 
        icon: <FaSpinner className="mr-1 animate-spin" />,
        label: "Payment Pending"
      },
      "processing": { 
        color: "bg-blue-100 text-blue-800", 
        icon: <FaSpinner className="mr-1 animate-spin" />,
        label: "Order Processing"
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

    let config;
    // If payment is successful (has razorpayPaymentId), show processing instead of pending
    if (order.status.toLowerCase() === 'pending' && order.razorpayPaymentId) {
      config = statusConfig["processing"];
    } else {
      config = statusConfig[order.status.toLowerCase()] || { 
        color: "bg-gray-100 text-gray-800", 
        icon: <FaInfoCircle className="mr-1" />,
        label: order.status
      };
    }
    
    return (
      <span className={`flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full ${config.color}`}>
        {config.icon}
        {config.label}
      </span>
    );
  };
  
  // Toggle order details view
  const toggleOrderDetails = (order) => {
    if (selectedOrder && selectedOrder._id === order._id) {
      setShowOrderDetails(false);
      setSelectedOrder(null);
    } else {
      setSelectedOrder(order);
      setShowOrderDetails(true);
    }
  };
  
  // Update the delivery progress calculation
  const getDeliveryProgress = (orderDate, status, estimatedDeliveryDate) => {
    if (status.toLowerCase() === 'cancelled') return 0;
    if (status.toLowerCase() === 'delivered') return 100;
    
    const now = new Date();
    const start = new Date(orderDate);
    const end = new Date(estimatedDeliveryDate);
    
    // If past estimated delivery date, return 100%
    if (now >= end) return 100;
    
    // Calculate progress percentage
    const total = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    const percentage = Math.min((elapsed / total) * 100, 100);
    
    // Map status to minimum progress thresholds
    const statusThresholds = {
      'pending': 0,
      'processing': 20,
      'shipped': 40,
      'in transit': 60,
      'out for delivery': 80
    };
    
    // Get minimum progress for current status
    const minProgress = statusThresholds[status.toLowerCase()] || 0;
    
    // Return the higher of calculated progress or status minimum
    return Math.max(Math.round(percentage), minProgress);
  };

  // Update the delivery status calculation
  const getDeliveryStatus = (progress, status, estimatedDeliveryDate) => {
    const now = new Date();
    const delivery = new Date(estimatedDeliveryDate);
    
    if (status.toLowerCase() === 'cancelled') {
      return { text: "Cancelled", icon: <FaRedo className="text-red-500" /> };
    }
    
    // Only show as delivered if explicitly marked as delivered or past delivery date
    if (status.toLowerCase() === 'delivered' || now >= delivery) {
      return { text: "Delivered", icon: <FaHome className="text-green-500" /> };
    }
    
    const statusMap = {
      'pending': { text: "Pending", icon: <FaWarehouse className="text-yellow-500" /> },
      'processing': { text: "Processing", icon: <FaWarehouse className="text-yellow-500" /> },
      'shipped': { text: "Shipped", icon: <FaShippingFast className="text-purple-500" /> },
      'in transit': { text: "In Transit", icon: <FaRoute className="text-indigo-500" /> },
      'out for delivery': { text: "Out for Delivery", icon: <FaTruck className="text-blue-500" /> }
    };
    
    return statusMap[status.toLowerCase()] || { text: "Processing", icon: <FaWarehouse className="text-yellow-500" /> };
  };
  
  // Filter orders with improved search
  const filteredOrders = orders.filter(order => {
    const matchesStatus = filterStatus === "all" || order.status.toLowerCase() === filterStatus;
    const searchLower = searchTerm.toLowerCase();
    
    // Search in order ID, items, and shipping address
    const matchesSearch = !searchTerm || 
      order.razorpayOrderId?.toLowerCase().includes(searchLower) ||
      order.items?.some(item => 
        item.product?.name?.toLowerCase().includes(searchLower)
      ) ||
      order.shippingAddress?.street?.toLowerCase().includes(searchLower) ||
      order.shippingAddress?.city?.toLowerCase().includes(searchLower);
    
    return matchesStatus && matchesSearch;
  });
  
  // Calculate total items in an order
  const getTotalItems = (order) => {
    return order.items.reduce((total, item) => total + item.quantity, 0);
  };
  
  // Add downloadInvoice function
  const downloadInvoice = async (orderId) => {
    try {
      setDownloadingInvoice(orderId);
      
      // Request invoice generation from backend
      const response = await axiosInstance.get(`/api/orders/invoice/${orderId}`, {
        responseType: 'blob', // Important for handling binary data
      });
      
      // Create a blob URL for the PDF
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${orderId}.pdf`);
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      setNotification({
        show: true,
        message: 'Invoice downloaded successfully!',
        type: 'success'
      });
      
      // Hide notification after 3 seconds
      setTimeout(() => {
        setNotification({
          show: false,
          message: '',
          type: ''
        });
      }, 3000);
    } catch (err) {
      console.error('Error downloading invoice:', err);
      setNotification({
        show: true,
        message: 'Failed to download invoice. Please try again.',
        type: 'error'
      });
      
      // Hide notification after 3 seconds
      setTimeout(() => {
        setNotification({
          show: false,
          message: '',
          type: ''
        });
      }, 3000);
    } finally {
      setDownloadingInvoice(null);
    }
  };

  if (loading) {
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
            <h1 className="text-3xl font-bold text-gray-800">Your Orders</h1>
            <p className="text-gray-600 mt-2">View and manage your order history</p>
          </div>
          
          {error && (
            <div className="mb-6 p-4 bg-red-100 text-red-800 rounded-lg">
              {error}
            </div>
          )}
          
          {/* Filters & Search */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaSearch className="text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search orders by order ID or product name..."
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
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Orders List */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {filteredOrders.length === 0 ? (
              <div className="p-8 text-center">
                <FaShoppingBag className="mx-auto text-gray-300 text-5xl mb-4" />
                <h2 className="text-xl font-medium text-gray-800 mb-2">No orders found</h2>
                {orders.length === 0 ? (
                  <p className="text-gray-600">You haven't placed any orders yet.</p>
                ) : (
                  <p className="text-gray-600">No orders match your current filters.</p>
                )}
                <button
                  onClick={() => navigate("/products/all")}
                  className="mt-4 bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark transition-colors"
                >
                  Start Shopping
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                    <tr>
                      <th className="px-6 py-3">Order Details</th>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Estimated Delivery</th>
                      <th className="px-6 py-3">Total</th>
                      <th className="px-6 py-3">Invoice</th>
                      <th className="px-6 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredOrders.map((order) => (
                      <React.Fragment key={order._id}>
                        <tr className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <div className="flex items-center mb-1 group relative">
                                <div className="flex items-center">
                                  <FaIdCard className="text-primary mr-2" />
                                  <span className="font-medium text-gray-800">Order ID:</span>
                                </div>
                                <div className="relative ml-1">
                                  <div className="px-2 py-1 bg-gray-100 rounded text-sm font-mono border border-gray-200 inline-flex items-center">
                                    <div className="flex items-center">
                                      <span>{formatOrderId(order.razorpayOrderId)}</span>
                                      <button 
                                        onClick={() => copyToClipboard(order.razorpayOrderId)}
                                        className="ml-2 text-gray-500 hover:text-primary focus:outline-none"
                                        title="Copy Order ID"
                                      >
                                        <FaCopy size={14} />
                                      </button>
                                    </div>
                                  </div>
                                  <div className="absolute left-0 -bottom-8 z-10 w-48 px-2 py-1 bg-gray-800 rounded-lg text-xs text-white opacity-0 transition-opacity duration-300 pointer-events-none group-hover:opacity-100">
                                    Save this ID for reference or support inquiries
                                  </div>
                                </div>
                              </div>
                              <p className="text-sm text-gray-500">{getTotalItems(order)} items</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <p>{formatDate(order.createdAt)}</p>
                            <p className="text-sm text-gray-500">{formatTime(order.createdAt)}</p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(order)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <p className="font-medium text-gray-800">
                              {formatDate(order.estimatedDeliveryDate)}
                            </p>
                            <p className="text-sm text-gray-500 flex items-center">
                              {getDeliveryStatus(
                                getDeliveryProgress(order.createdAt, order.status, order.estimatedDeliveryDate),
                                order.status,
                                order.estimatedDeliveryDate
                              ).icon}
                              <span className="ml-1">
                                {getDeliveryStatus(
                                  getDeliveryProgress(order.createdAt, order.status, order.estimatedDeliveryDate),
                                  order.status,
                                  order.estimatedDeliveryDate
                                ).text}
                              </span>
                            </p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-medium">
                            {formatPrice(order.totalAmount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => downloadInvoice(order._id)}
                              disabled={downloadingInvoice === order._id || order.status === 'cancelled'}
                              className={`flex items-center ${
                                order.status === 'cancelled' 
                                  ? 'text-gray-400 cursor-not-allowed' 
                                  : 'text-primary hover:text-primary-dark'
                              }`}
                              title={order.status === 'cancelled' ? 'Cannot download invoice for cancelled orders' : 'Download Invoice'}
                            >
                              {downloadingInvoice === order._id ? (
                                <>
                                  <FaSpinner className="animate-spin mr-1" />
                                  <span>Downloading...</span>
                                </>
                              ) : (
                                <>
                                  <FaFileInvoice className="mr-1" />
                                  <span>Download</span>
                                </>
                              )}
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex gap-2">
                              <button 
                                onClick={() => toggleOrderDetails(order)}
                                className="text-primary hover:text-primary-dark font-medium text-sm"
                              >
                                View Details
                              </button>
                              <button 
                                onClick={() => setExpandedOrder(expandedOrder === order._id ? null : order._id)}
                                className="text-gray-500 hover:text-gray-700"
                              >
                                {expandedOrder === order._id ? <FaChevronUp /> : <FaChevronDown />}
                              </button>
                            </div>
                          </td>
                        </tr>
                        
                        {/* Expanded row with order items */}
                        {expandedOrder === order._id && (
                          <tr>
                            <td colSpan="7" className="px-6 py-4 bg-gray-50">
                              <div className="space-y-4">
                                {/* Order ID Information Box */}
                                <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
                                  <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                                    <FaIdCard className="mr-2 text-primary" />
                                    Order Identification
                                  </h4>
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                    <div className="flex-1">
                                      <p className="text-xs text-gray-500 mb-1">Order ID (Use for support inquiries):</p>
                                      <div className="flex items-center">
                                        <div className="bg-gray-100 px-3 py-2 rounded font-mono text-gray-800 text-sm flex-1 border border-gray-200">
                                          {formatOrderId(order.razorpayOrderId)}
                                        </div>
                                        <button 
                                          onClick={() => copyToClipboard(order.razorpayOrderId)}
                                          className="ml-2 p-2 text-gray-500 hover:text-primary bg-white border border-gray-200 rounded focus:outline-none hover:bg-gray-50"
                                          title="Copy Order ID"
                                        >
                                          <FaCopy size={14} />
                                        </button>
                                      </div>
                                    </div>
                                    {order.razorpayPaymentId && (
                                      <div className="flex-1">
                                        <p className="text-xs text-gray-500 mb-1">Payment ID:</p>
                                        <div className="bg-gray-100 px-3 py-2 rounded font-mono text-gray-800 text-sm border border-gray-200">
                                          {order.razorpayPaymentId}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500 mt-2 italic">
                                    Please save this Order ID. You will need it for any support requests, returns, or when contacting customer service.
                                  </p>
                                </div>
                                
                                <h3 className="text-sm font-medium text-gray-700">Order Items</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {order.items.map((item, idx) => (
                                    <div key={idx} className="flex space-x-4 p-3 border rounded-lg bg-white">
                                      <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-md overflow-hidden">
                                        <img 
                                          src={item.product.image} 
                                          alt={item.product.name}
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = 'https://via.placeholder.com/64?text=No+Image';
                                          }}
                                        />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-medium text-gray-900 truncate">
                                          {item.product.name}
                                        </h4>
                                        <p className="mt-1 text-sm text-gray-500">
                                          Qty: {item.quantity} × {formatPrice(item.product.price || item.price)}
                                        </p>
                                        <p className="mt-1 text-sm font-medium text-gray-900">
                                          {formatPrice((item.product.price || item.price) * item.quantity)}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                
                                <div className="flex justify-between pt-4 border-t">
                                  <div>
                                    <p className="text-sm font-medium text-gray-700">Shipping Address:</p>
                                    <p className="text-sm text-gray-600">
                                      {order.shippingAddress.street}, {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      Phone: {order.shippingAddress.phoneNumber}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm text-gray-600">Subtotal: {formatPrice(order.totalAmount - (order.taxAmount || 0) - (order.shippingCost || 0))}</p>
                                    <p className="text-sm text-gray-600">Shipping: {formatPrice(order.shippingCost || 99)}</p>
                                    <p className="text-sm text-gray-600">GST (18%): {formatPrice(order.taxAmount || (order.totalAmount * 0.18))}</p>
                                    <p className="text-sm font-medium text-gray-900">Total: {formatPrice(order.totalAmount)}</p>
                                  </div>
                                </div>

                                {order.status === 'completed' && (
                                  <div className="mt-4 pt-4 border-t">
                                    <h4 className="text-sm font-medium text-gray-700 mb-2">Payment Information</h4>
                                    <p className="text-sm text-gray-600">Payment ID: {order.razorpayPaymentId}</p>
                                    <p className="text-sm text-gray-600">Order ID: {order.razorpayOrderId}</p>
                                    <p className="text-sm text-gray-600">Paid at: {formatDate(order.paidAt)} {formatTime(order.paidAt)}</p>
                                  </div>
                                )}
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
      
      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">Order Details</h2>
              <button 
                onClick={() => setShowOrderDetails(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto" style={{maxHeight: 'calc(90vh - 60px)'}}>
              {/* Order ID highlight box at the top */}
              <div className="bg-primary bg-opacity-10 p-4 rounded-lg border border-primary border-opacity-20 mb-6">
                <h3 className="text-sm font-medium text-primary mb-2 flex items-center">
                  <FaIdCard className="mr-2" />
                  Order ID Information
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-600 mb-1">Use this ID when contacting support:</p>
                    <div className="bg-white px-3 py-2 rounded font-mono text-gray-800 text-sm border border-primary border-opacity-20 flex items-center justify-between">
                      <div className="flex items-center">
                        <span>{formatOrderId(selectedOrder.razorpayOrderId)}</span>
                        <button 
                          onClick={() => copyToClipboard(selectedOrder.razorpayOrderId)}
                          className="ml-2 text-gray-500 hover:text-primary focus:outline-none"
                          title="Copy Order ID"
                        >
                          <FaCopy size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                  {selectedOrder.razorpayPaymentId && (
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-600 mb-1">Payment ID:</p>
                      <div className="bg-white px-3 py-2 rounded font-mono text-gray-800 text-sm border border-gray-200">
                        {selectedOrder.razorpayPaymentId}
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => {
                      // Pass the raw ID (without spaces) to ensure it can be validated properly
                      const rawOrderId = selectedOrder.razorpayOrderId || "";
                      navigate(`/contact-us?orderId=${encodeURIComponent(rawOrderId)}`);
                    }}
                    className="text-xs bg-red-100 text-red-800 px-3 py-1 rounded-full flex items-center"
                  >
                    <FaInfoCircle className="mr-1" /> Report Issue with Order
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {/* Order Info */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                    <FaShoppingBag className="mr-2" />
                    Order Information
                  </h3>
                  <div className="space-y-2">
                    <p className="text-sm flex items-center">
                      <FaCalendarAlt className="mr-2 text-gray-400" />
                      <span className="font-medium">Date:</span> {formatDate(selectedOrder.createdAt)}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Status:</span> {getStatusBadge(selectedOrder)}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Payment Method:</span> {selectedOrder.razorpayPaymentId ? 'Razorpay' : 'Pending Payment'}
                    </p>
                    {selectedOrder.razorpayPaymentId && (
                      <p className="text-sm text-green-600">
                        <FaCheck className="inline mr-1" /> Payment Completed
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Shipping Info */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                    <FaMapMarkerAlt className="mr-2" />
                    Shipping Information
                  </h3>
                  <div className="space-y-2">
                    <p className="text-sm">
                      <span className="font-medium">Recipient:</span> {selectedOrder.shippingAddress.name}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Address:</span><br />
                      {selectedOrder.shippingAddress.street}<br />
                      {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} {selectedOrder.shippingAddress.zipCode}<br />
                      {selectedOrder.shippingAddress.country}
                    </p>
                    {selectedOrder.trackingNumber && (
                      <p className="text-sm">
                        <span className="font-medium">Tracking Number:</span> {selectedOrder.trackingNumber}
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Order Summary */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                    <FaBox className="mr-2" />
                    Order Summary
                  </h3>
                  <div className="space-y-2">
                    <p className="text-sm flex justify-between">
                      <span>Subtotal:</span>
                      <span>{formatPrice(selectedOrder.totalAmount - (selectedOrder.taxAmount || 0) - (selectedOrder.shippingCost || 0))}</span>
                    </p>
                    <p className="text-sm flex justify-between">
                      <span>Shipping:</span>
                      <span>{formatPrice(selectedOrder.shippingCost || 99)}</span>
                    </p>
                    <p className="text-sm flex justify-between">
                      <span>Tax:</span>
                      <span>{formatPrice(selectedOrder.taxAmount || (selectedOrder.totalAmount * 0.18))}</span>
                    </p>
                    <div className="border-t my-2"></div>
                    <p className="text-sm font-medium flex justify-between">
                      <span>Total:</span>
                      <span>{formatPrice(selectedOrder.totalAmount)}</span>
                    </p>

                    {/* Add Invoice Download Button */}
                    <div className="mt-4 pt-2 border-t">
                      <button
                        onClick={() => downloadInvoice(selectedOrder._id)}
                        disabled={downloadingInvoice === selectedOrder._id || selectedOrder.status === 'cancelled'}
                        className={`w-full flex items-center justify-center py-2 px-4 rounded-md ${
                          selectedOrder.status === 'cancelled' 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                            : 'bg-primary text-white hover:bg-primary-dark'
                        } transition-colors`}
                      >
                        {downloadingInvoice === selectedOrder._id ? (
                          <>
                            <FaSpinner className="animate-spin mr-2" />
                            <span>Generating Invoice...</span>
                          </>
                        ) : (
                          <>
                            <FaFileInvoice className="mr-2" />
                            <span>Download Invoice</span>
                          </>
                        )}
                      </button>
                      {selectedOrder.status === 'cancelled' && (
                        <p className="text-xs text-red-500 mt-1 text-center">
                          Invoice unavailable for cancelled orders
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Delivery Status */}
              <div className="mt-6 mb-4 p-6 border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow duration-300">
                <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                  <FaShippingFast className="mr-2 text-primary" />
                  Delivery Status
                </h3>
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <FaCalendarAlt className="text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">
                        Estimated Delivery: {formatDate(selectedOrder.estimatedDeliveryDate)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <FaBoxOpen className="text-primary" />
                      <span className="text-sm font-medium text-primary">
                        {getDeliveryProgress(selectedOrder.createdAt, selectedOrder.status, selectedOrder.estimatedDeliveryDate)}% Complete
                      </span>
                    </div>
                  </div>

                  {/* Enhanced Progress Bar */}
                  <div className="relative pt-6 pb-8">
                    {/* Progress Line */}
                    <div className="absolute left-0 top-1/2 w-full h-1 bg-gray-200 transform -translate-y-1/2">
                      <div 
                        className="h-full bg-gradient-to-r from-primary to-primary-dark transition-all duration-1000 ease-out"
                        style={{ 
                          width: (() => {
                            if (selectedOrder.status.toLowerCase() === 'cancelled') {
                              return '0%';
                            }
                            
                            if (selectedOrder.status.toLowerCase() === 'delivered') {
                              return '100%';
                            }
                            
                            const progress = getDeliveryProgress(
                              selectedOrder.createdAt,
                              selectedOrder.status,
                              selectedOrder.estimatedDeliveryDate
                            );
                            return `${progress}%`;
                          })()
                        }}
                      />
                    </div>

                    {/* Milestone Points */}
                    <div className="relative flex justify-between">
                      {[
                        { milestone: 0, icon: FaWarehouse, label: 'Processing', status: 'processing' },
                        { milestone: 25, icon: FaShippingFast, label: 'Shipped', status: 'shipped' },
                        { milestone: 50, icon: FaRoute, label: 'In Transit', status: 'in-transit' },
                        { milestone: 75, icon: FaTruck, label: 'Out for Delivery', status: 'out-for-delivery' },
                        { milestone: 100, icon: FaHome, label: 'Delivered', status: 'delivered' }
                      ].map(({ milestone, icon: Icon, label, status }) => {
                        // Determine if this milestone is active based on order status
                        let isCompleted = false;
                        let isActive = false;
                        
                        if (selectedOrder.status.toLowerCase() === 'cancelled') {
                          // No milestones are active or completed if order is cancelled
                          isCompleted = false;
                          isActive = false;
                        } else if (selectedOrder.status.toLowerCase() === 'delivered') {
                          // All milestones are completed if order is delivered
                          isCompleted = true;
                          isActive = status === 'delivered';
                        } else {
                          // Otherwise, determine based on progress percentage and status mapping
                          const progress = getDeliveryProgress(
                            selectedOrder.createdAt,
                            selectedOrder.status,
                            selectedOrder.estimatedDeliveryDate
                          );
                          const deliveryStatus = getDeliveryStatus(progress, selectedOrder.status, selectedOrder.estimatedDeliveryDate).text.toLowerCase().replace(/\s+/g, '-');
                          
                          if (status === 'processing') {
                            // Processing is always completed unless cancelled
                            isCompleted = true;
                            isActive = deliveryStatus === 'processing';
                          } else if (status === 'shipped') {
                            isCompleted = ['shipped', 'in-transit', 'out-for-delivery', 'delivered'].includes(deliveryStatus);
                            isActive = deliveryStatus === 'shipped';
                          } else if (status === 'in-transit') {
                            isCompleted = ['in-transit', 'out-for-delivery', 'delivered'].includes(deliveryStatus);
                            isActive = deliveryStatus === 'in-transit';
                          } else if (status === 'out-for-delivery') {
                            isCompleted = ['out-for-delivery', 'delivered'].includes(deliveryStatus);
                            isActive = deliveryStatus === 'out-for-delivery';
                          } else if (status === 'delivered') {
                            isCompleted = deliveryStatus === 'delivered';
                            isActive = deliveryStatus === 'delivered';
                          }
                        }
                        
                        return (
                          <div 
                            key={milestone}
                            className={`flex flex-col items-center ${milestone === 100 ? '-translate-x-full' : milestone === 0 ? 'translate-x-0' : '-translate-x-1/2'}`}
                            style={{ flex: '0 0 auto' }}
                          >
                            <div 
                              className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 transition-all duration-300 ${
                                isCompleted ? 'bg-primary text-white scale-110' : 
                                isActive ? 'bg-primary-light text-primary scale-105' : 
                                'bg-gray-200 text-gray-400'
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <span className={`text-xs font-medium whitespace-nowrap transition-colors duration-300 ${
                              isCompleted ? 'text-primary' : 
                              isActive ? 'text-primary-dark' : 
                              'text-gray-400'
                            }`}>
                              {label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Current Status */}
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">
                        {getDeliveryStatus(
                          getDeliveryProgress(selectedOrder.createdAt, selectedOrder.status, selectedOrder.estimatedDeliveryDate),
                          selectedOrder.status,
                          selectedOrder.estimatedDeliveryDate
                        ).icon}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {getDeliveryStatus(
                            getDeliveryProgress(selectedOrder.createdAt, selectedOrder.status, selectedOrder.estimatedDeliveryDate),
                            selectedOrder.status,
                            selectedOrder.estimatedDeliveryDate
                          ).text}
                        </p>
                        <p className="text-xs text-gray-500">
                          {getDeliveryProgress(selectedOrder.createdAt, selectedOrder.status, selectedOrder.estimatedDeliveryDate) === 100
                            ? "Your order has been delivered successfully"
                            : `Expected delivery by ${formatDate(selectedOrder.estimatedDeliveryDate)}`}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Order Items */}
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-800 mb-4">Order Items</h3>
                <div className="space-y-4">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="border rounded-lg p-4">
                      <div className="flex flex-col sm:flex-row">
                        <div className="sm:w-24 sm:h-24 h-32 w-full sm:mr-4 rounded-md overflow-hidden mb-4 sm:mb-0 bg-gray-100">
                          <img 
                            src={item.product.image} 
                            alt={item.product.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'https://via.placeholder.com/96?text=No+Image';
                            }}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <div>
                              <h4 className="text-md font-medium text-gray-900 hover:text-primary">
                                <a href={`/product/${item.product._id}`}>
                                  {item.product.name}
                                </a>
                              </h4>
                              <p className="text-sm text-gray-500 mt-1">
                                Quantity: {item.quantity}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-gray-900">
                                {formatPrice(item.product.price || item.price)}
                              </p>
                              <p className="text-sm text-gray-500 mt-1">
                                Total: {formatPrice((item.product.price || item.price) * item.quantity)}
                              </p>
                            </div>
                          </div>
                          
                          {/* Review Section */}
                          <div className="mt-4 flex items-center justify-between">
                            {!item.reviewed ? (
                              <button
                                onClick={() => navigate(`/product/${item.product._id}?review=true`)}
                                className="group relative inline-flex items-center justify-center px-6 py-2 text-sm font-medium text-white bg-primary rounded-lg overflow-hidden transition-all duration-300 ease-out hover:bg-primary-dark hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 hover-scale star-hover"
                              >
                                <span className="absolute inset-0 w-full h-full bg-gradient-to-br from-primary-light to-primary-dark opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-out"></span>
                                <FaStar className="mr-2 text-yellow-300 transform group-hover:rotate-180 transition-transform duration-300" />
                                <span className="relative">Write a Review</span>
                                <span className="absolute right-0 translate-x-full group-hover:translate-x-0 transition-transform duration-300">
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </span>
                              </button>
                            ) : (
                              <div className="flex items-center space-x-2 text-green-600 bg-green-50 px-4 py-2 rounded-lg animate-fadeIn">
                                <FaCheck className="text-green-500" />
                                <span className="text-sm">Review Submitted</span>
                                <button
                                  onClick={() => navigate(`/product/${item.product._id}`)}
                                  className="ml-2 text-primary hover:text-primary-dark transition-colors duration-200"
                                >
                                  View Review
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <Footer />
    </>
  );
};

export default Orders; 