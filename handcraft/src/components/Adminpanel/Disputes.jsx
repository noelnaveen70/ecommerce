import React, { useEffect, useState } from "react";
import { FaExclamationCircle, FaCheckCircle, FaTimesCircle, FaFlag, FaComments, FaSearch, FaFilter, FaReply, FaPaperPlane, FaFileAlt, FaMoneyBillWave, FaExchangeAlt, FaInfoCircle, FaBan, FaEllipsisH, FaShoppingCart, FaCreditCard, FaBox, FaUser, FaQuestionCircle, FaArrowLeft } from "react-icons/fa";
import axiosInstance from "../../axiosInstance";
import { Link } from "react-router-dom";

// Helper function for handling dispute creation/processing
const processDisputeData = (dispute) => {
  // Ensure resolution field is properly structured to avoid validation errors
  if (!dispute.resolution || dispute.resolution.outcome === null) {
    return {
      ...dispute,
      resolution: undefined // Remove resolution field entirely to avoid validation errors
    };
  }
  return dispute;
};

// Helper function to capitalize first letter of a string
const capitalizeFirstLetter = (string) => {
  if (!string) return '';
  return string.charAt(0).toUpperCase() + string.slice(1);
};

const DisputesReports = () => {
  const [disputes, setDisputes] = useState([]);
  const [reports, setReports] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("disputes");
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [resolutionForm, setResolutionForm] = useState({
    resolutionOutcome: 'information',
    resolutionNotes: '',
    reportTitle: '',
    reportSummary: '',
    reportDetails: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [disputesRes, reportsRes] = await Promise.all([
        axiosInstance.get("/api/disputes/all"),
        axiosInstance.get("/api/disputes/reports/all")
      ]);

      if (disputesRes.data.success) {
        // Process each dispute to ensure resolution field is properly structured
        const formattedDisputes = disputesRes.data.disputes.map(dispute => {
          const processedDispute = processDisputeData(dispute);
          return processedDispute;
        });
        
        setDisputes(formattedDisputes);
      } else {
        setError(disputesRes.data.message || "Failed to fetch disputes");
      }
      
      if (reportsRes.data.success) {
        // Process reports to ensure all required fields exist
        const formattedReports = reportsRes.data.reports.map(report => {
          // Ensure report has all the fields we need
          return {
            ...report,
            status: report.status || 'pending',
            resolution: report.resolution || 'unknown'
          };
        });
        
        console.log('Reports fetched:', formattedReports);
        setReports(formattedReports);
      } else {
        setError(reportsRes.data.message || "Failed to fetch reports");
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load disputes and reports. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setResolutionForm(prev => ({ ...prev, [name]: value }));
  };

  const handleStatusChange = async (disputeId, newStatus) => {
    try {
      setLoading(true);
      const response = await axiosInstance.put(`/api/disputes/${disputeId}/status`, {
        status: newStatus
      });

      if (response.data.success) {
        setDisputes(disputes.map(dispute => 
          dispute._id === disputeId ? response.data.dispute : dispute
        ));
        showNotification(`Status updated to ${newStatus}`, 'success');
      } else {
        showNotification(response.data.message || 'Failed to update status', 'error');
      }
    } catch (err) {
      console.error("Error updating status:", err);
      showNotification(err.response?.data?.message || 'An error occurred while updating status', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (disputeId) => {
    if (!messageInput.trim()) return;

    try {
      setLoading(true);
      const response = await axiosInstance.post(`/api/disputes/${disputeId}/message`, {
        message: messageInput
      });

      if (response.data.success) {
        setDisputes(disputes.map(dispute => 
          dispute._id === disputeId ? response.data.dispute : dispute
        ));
        setMessageInput('');
        showNotification('Message sent successfully', 'success');
      } else {
        showNotification(response.data.message || 'Failed to send message', 'error');
      }
    } catch (err) {
      console.error("Error sending message:", err);
      showNotification(err.response?.data?.message || 'An error occurred while sending message', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResolveDispute = async (disputeId) => {
    try {
      setLoading(true);
      // Make sure we're sending valid data for resolution
      const dataToSend = {
        resolutionOutcome: resolutionForm.resolutionOutcome || 'information',
        resolutionNotes: resolutionForm.resolutionNotes || '',
        reportTitle: resolutionForm.reportTitle || `Resolution for dispute #${disputeId}`,
        reportSummary: resolutionForm.reportSummary || 'Dispute resolved by admin',
        reportDetails: resolutionForm.reportDetails || 'No additional details provided'
      };
      
      console.log('Sending resolution data:', dataToSend);
      
      const response = await axiosInstance.put(`/api/disputes/${disputeId}/resolve`, dataToSend);

      if (response.data.success) {
        // Process the returned dispute to ensure resolution field is properly structured
        const updatedDispute = processDisputeData(response.data.dispute);
        
        setDisputes(disputes.map(dispute => 
          dispute._id === disputeId ? updatedDispute : dispute
        ));
        
        // Add the new report to the reports list
        if (response.data.report) {
          setReports(prevReports => [response.data.report, ...prevReports]);
          console.log('Added report to state:', response.data.report);
        } else {
          console.warn('No report data in response');
        }
        
        setSelectedDispute(null);
        setResolutionForm({
          resolutionOutcome: 'information',
          resolutionNotes: '',
          reportTitle: '',
          reportSummary: '',
          reportDetails: ''
        });
        showNotification('Dispute resolved successfully', 'success');
      } else {
        showNotification(response.data.message || 'Failed to resolve dispute', 'error');
      }
    } catch (err) {
      console.error("Error resolving dispute:", err);
      showNotification(err.response?.data?.message || 'An error occurred while resolving dispute', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 3000);
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  // Filter disputes based on search, status, and category
  const filteredDisputes = disputes.filter((dispute) => {
    const matchesSearch = search.toLowerCase() === '' || 
      dispute.title.toLowerCase().includes(search.toLowerCase()) ||
      dispute.description.toLowerCase().includes(search.toLowerCase()) ||
      dispute.category.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || dispute.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || dispute.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Filter reports based on search
  const filteredReports = reports.filter((report) =>
    search.toLowerCase() === '' ||
    report.title?.toLowerCase().includes(search.toLowerCase()) ||
    report.summary?.toLowerCase().includes(search.toLowerCase()) ||
    (typeof report.resolution === 'string' && report.resolution.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading && disputes.length === 0 && reports.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Link 
            to="/Adminpanel" 
            className="mr-4 flex items-center px-3 py-1.5 bg-white shadow-sm rounded-md text-blue-600 hover:bg-blue-50 transition-colors text-sm"
          >
            <FaArrowLeft className="mr-1.5" size={12} />
            <span>Back to Admin Panel</span>
          </Link>
          <h1 className="text-3xl font-bold">Disputes & Reports Management</h1>
        </div>
      </div>

      {notification.show && (
        <div className={`mb-4 p-4 rounded-lg ${
          notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {notification.message}
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-800 rounded-lg">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b mb-6">
        <button
          className={`px-6 py-3 flex items-center ${
            activeTab === "disputes"
              ? "text-blue-600 border-b-2 border-blue-600 font-medium"
              : "text-gray-600 hover:text-blue-600"
          }`}
          onClick={() => setActiveTab("disputes")}
        >
          <FaExclamationCircle className="mr-2" />
          Disputes
        </button>
        <button
          className={`px-6 py-3 flex items-center ${
            activeTab === "reports"
              ? "text-blue-600 border-b-2 border-blue-600 font-medium"
              : "text-gray-600 hover:text-blue-600"
          }`}
          onClick={() => setActiveTab("reports")}
        >
          <FaFileAlt className="mr-2" />
          Reports
        </button>
      </div>

      {/* Search and filters */}
      <div className="bg-white p-5 rounded-lg shadow-md mb-6 border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {activeTab === "disputes" && (
            <>
              <div className="w-full md:w-48">
                <div className="relative">
                  <select
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm appearance-none"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="w-full md:w-48">
                <div className="relative">
                  <select
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm appearance-none"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                  >
                    <option value="all">All Categories</option>
                    <option value="order">Order</option>
                    <option value="payment">Payment</option>
                    <option value="product">Product</option>
                    <option value="account">Account</option>
                    <option value="other">Other</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                    </svg>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === "disputes" ? (
        <div>
      <h2 className="text-2xl font-semibold mb-4">Disputes</h2>
        {filteredDisputes.length > 0 ? (
            <div className="grid grid-cols-1 gap-6">
              {filteredDisputes.map((dispute) => (
                <DisputeCard 
                  key={dispute._id} 
                  dispute={dispute} 
                  isSelected={selectedDispute === dispute._id}
                  onSelect={() => setSelectedDispute(selectedDispute === dispute._id ? null : dispute._id)}
                  onStatusChange={handleStatusChange}
                  onSendMessage={(message) => {
                    setMessageInput(message);
                    handleSendMessage(dispute._id);
                  }}
                  messageInput={messageInput}
                  setMessageInput={setMessageInput}
                  handleSendMessage={() => handleSendMessage(dispute._id)}
                  resolutionForm={resolutionForm}
                  handleInputChange={handleInputChange}
                  handleResolveDispute={() => handleResolveDispute(dispute._id)}
                  formatDate={formatDate}
                />
              ))}
            </div>
          ) : (
            <p className="text-gray-500 bg-white p-8 rounded-lg shadow-sm text-center">
              No disputes found matching your criteria.
            </p>
        )}
      </div>
      ) : (
        <div>
      <h2 className="text-2xl font-semibold mb-4">Reports</h2>
          {filteredReports.length > 0 ? (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredReports.map((report) => (
                <ReportCard key={report._id} report={report} formatDate={formatDate} />
              ))}
            </div>
          ) : (
            <p className="text-gray-500 bg-white p-8 rounded-lg shadow-sm text-center">
              No reports found matching your search.
            </p>
        )}
      </div>
      )}
    </div>
  );
};

const DisputeCard = ({ 
  dispute, 
  isSelected, 
  onSelect, 
  onStatusChange, 
  messageInput, 
  setMessageInput, 
  handleSendMessage,
  resolutionForm,
  handleInputChange,
  handleResolveDispute,
  formatDate
}) => {
  const statusColors = {
    pending: "text-yellow-500 border-yellow-500",
    "in-progress": "text-blue-500 border-blue-500",
    resolved: "text-green-500 border-green-500",
    rejected: "text-red-500 border-red-500",
  };

  const statusIcons = {
    pending: <FaExclamationCircle />,
    "in-progress": <FaComments />,
    resolved: <FaCheckCircle />,
    rejected: <FaTimesCircle />,
  };

  return (
    <div className="bg-white shadow-lg rounded-lg border overflow-hidden">
      <div className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold mb-1">{dispute.title}</h3>
            <div className="flex items-center text-sm text-gray-600 space-x-2 mb-2">
              <span>Category: {dispute.category}</span>
              <span>•</span>
              <span>User: {dispute.user?.name || 'Unknown'}</span>
              <span>•</span>
              <span>Type: {dispute.userType}</span>
            </div>
            <p className="text-gray-600 mb-3">{dispute.description}</p>
            <p className="text-xs text-gray-500">Created: {formatDate(dispute.createdAt)}</p>
          </div>
          <div className={`flex items-center gap-2 text-lg font-semibold border-l-4 pl-2 ${statusColors[dispute.status]}`}>
            {statusIcons[dispute.status]} {capitalizeFirstLetter(dispute.status.replace("-", " "))}
          </div>
        </div>

        <div className="mt-4 flex justify-between">
          <button
            onClick={onSelect}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            {isSelected ? "Hide Details" : "Manage Dispute"}
          </button>
          {!isSelected && dispute.status !== 'resolved' && dispute.status !== 'rejected' && (
            <div className="flex space-x-2">
              {dispute.status === 'pending' && (
                <button
                  onClick={() => onStatusChange(dispute._id, 'in-progress')}
                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium hover:bg-blue-200"
                >
                  Start Working
                </button>
              )}
              <button
                onClick={() => onStatusChange(dispute._id, 'rejected')}
                className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium hover:bg-red-200"
              >
                Reject
              </button>
            </div>
          )}
        </div>
      </div>

      {isSelected && (
        <div className="border-t p-6 bg-gray-50">
          {/* Conversation */}
          <h4 className="font-medium text-gray-900 mb-4">Conversation</h4>
          <div className="max-h-80 overflow-y-auto mb-4 p-2 space-y-3">
            {dispute.messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.sender === 'admin' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`px-4 py-2 rounded-lg max-w-[75%] ${
                    message.sender === 'admin' ? 'bg-blue-600 text-white' : 'bg-white border'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <p className="text-xs opacity-75 mt-1 text-right">
                    {formatDate(message.timestamp)} - {message.sender}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Message Input */}
          {dispute.status !== 'resolved' && dispute.status !== 'rejected' && (
            <div className="flex mb-6">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Type your response..."
                className="flex-1 px-3 py-2 border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSendMessage}
                disabled={!messageInput.trim()}
                className="bg-blue-600 text-white px-4 py-2 rounded-r-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300"
              >
                <FaPaperPlane />
              </button>
            </div>
          )}

          {/* Status Actions */}
          {dispute.status !== 'resolved' && dispute.status !== 'rejected' && (
            <div className="border-t pt-4 mb-6">
              <h4 className="font-medium text-gray-900 mb-2">Change Status</h4>
              <div className="flex flex-wrap gap-2">
                {dispute.status !== 'pending' && (
                  <button
                    onClick={() => onStatusChange(dispute._id, 'pending')}
                    className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium hover:bg-yellow-200"
                  >
                    Mark as Pending
                  </button>
                )}
                {dispute.status !== 'in-progress' && (
                  <button
                    onClick={() => onStatusChange(dispute._id, 'in-progress')}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium hover:bg-blue-200"
                  >
                    Mark as In Progress
                  </button>
                )}
                <button
                  onClick={() => onStatusChange(dispute._id, 'rejected')}
                  className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium hover:bg-red-200"
                >
                  Reject Dispute
                </button>
              </div>
            </div>
          )}

          {/* Resolution Form */}
          {dispute.status !== 'resolved' && dispute.status !== 'rejected' && (
            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-4">Resolve Dispute with Report</h4>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Resolution Outcome
                  </label>
                  <select
                    name="resolutionOutcome"
                    value={resolutionForm.resolutionOutcome}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="refund">Refund</option>
                    <option value="replacement">Replacement</option>
                    <option value="information">Information Provided</option>
                    <option value="no-action">No Action Required</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Resolution Notes
                  </label>
                  <textarea
                    name="resolutionNotes"
                    value={resolutionForm.resolutionNotes}
                    onChange={handleInputChange}
                    rows="2"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Explain the resolution details..."
                  ></textarea>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Report Title
                  </label>
                  <input
                    type="text"
                    name="reportTitle"
                    value={resolutionForm.reportTitle}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="E.g. Resolution for Order Issue #12345"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Report Summary
                  </label>
                  <input
                    type="text"
                    name="reportSummary"
                    value={resolutionForm.reportSummary}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Brief summary of the resolution"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Report Details
                  </label>
                  <textarea
                    name="reportDetails"
                    value={resolutionForm.reportDetails}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Detailed explanation for the user..."
                  ></textarea>
                </div>
                
                <button
                  onClick={handleResolveDispute}
                  className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Resolve Dispute & Create Report
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ReportCard = ({ report, formatDate }) => {
  const resolutionColors = {
    refund: "bg-green-100 text-green-800",
    replacement: "bg-blue-100 text-blue-800",
    information: "bg-yellow-100 text-yellow-800",
    "no-action": "bg-gray-100 text-gray-800",
    other: "bg-purple-100 text-purple-800",
  };

  const resolutionIcons = {
    refund: <FaMoneyBillWave className="mr-1" />,
    replacement: <FaExchangeAlt className="mr-1" />,
    information: <FaInfoCircle className="mr-1" />,
    "no-action": <FaBan className="mr-1" />,
    other: <FaEllipsisH className="mr-1" />,
  };

  const categoryIcons = {
    order: <FaShoppingCart className="mr-1" />,
    payment: <FaCreditCard className="mr-1" />,
    product: <FaBox className="mr-1" />,
    account: <FaUser className="mr-1" />,
    other: <FaQuestionCircle className="mr-1" />,
  };

  // For debugging
  console.log('Rendering report with data:', report);

  if (!report) {
    return <div className="p-6 border rounded-lg bg-red-50 text-red-700">Invalid report data</div>;
  }

  return (
    <div className="p-6 shadow-lg rounded-lg border bg-white hover:shadow-xl transition-shadow">
      {/* Report Header with Title and Status Badge */}
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold">{report.title || 'Untitled Report'}</h3>
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
          report.status === 'completed' ? 'bg-green-100 text-green-800' :
          report.status === 'needs-feedback' ? 'bg-yellow-100 text-yellow-800' : 
          'bg-blue-100 text-blue-800'
        }`}>
          {capitalizeFirstLetter((report.status || 'pending').replace(/-/g, ' '))}
        </span>
      </div>
      
      {/* Category Badge */}
      {report.category && (
        <div className="mb-3">
          <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800`}>
            {categoryIcons[report.category] || null}
            {capitalizeFirstLetter(report.category)}
          </span>
        </div>
      )}
      
      {/* Summary */}
      <p className="text-gray-600 mb-4 border-b pb-3">{report.summary || 'No summary provided'}</p>
      
      {/* User Info and Related Dispute */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">User Information</h4>
          <div className="bg-gray-50 p-2 rounded text-sm">
            <p className="mb-1">
              <span className="font-medium">Name:</span> {report.user?.name || 'Unknown'}
            </p>
            <p>
              <span className="font-medium">Type:</span> {report.userType || 'user'}
            </p>
          </div>
        </div>
        
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Dispute Reference</h4>
          <div className="bg-gray-50 p-2 rounded text-sm">
            <p className="mb-1">
              <span className="font-medium">ID:</span> {report.relatedDispute?._id || 'N/A'}
            </p>
            <p className="mb-1">
              <span className="font-medium">Title:</span> {report.disputeTitle || report.relatedDispute?.title || 'N/A'}
            </p>
            <p>
              <span className="font-medium">Created:</span> {formatDate(report.createdAt)}
            </p>
          </div>
        </div>
      </div>
      
      {/* Resolution Information */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Resolution Details</h4>
        <div className="bg-gray-50 p-3 rounded">
          <div className="flex items-center mb-3">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium ${
              resolutionColors[report.resolution] || 'bg-gray-200 text-gray-800'
            }`}>
              {resolutionIcons[report.resolution] || null}
              {capitalizeFirstLetter((report.resolution || 'unknown').replace(/-/g, ' '))}
            </span>
            {report.createdAtFormatted && (
              <span className="ml-2 text-xs text-gray-500">
                on {report.createdAtFormatted}
              </span>
            )}
          </div>
          
          {report.details && (
            <div className="text-sm text-gray-700 border-t pt-2 mt-2">
              <p className="mb-1 font-medium">Details:</p>
              <p className="whitespace-pre-line">{report.details}</p>
            </div>
          )}
          
          {report.adminNotes && (
            <div className="text-sm text-gray-700 border-t pt-2 mt-2">
              <p className="mb-1 font-medium">Admin Notes:</p>
              <p className="italic">{report.adminNotes}</p>
            </div>
          )}
        </div>
      </div>
      
      {/* User Feedback Section */}
      {report.feedback ? (
        <div className="border-t pt-3 mt-3">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Customer Feedback</h4>
          <div className="flex items-center mb-2">
            <span className="mr-2">Rating:</span>
            <div className="flex text-yellow-400">
              {[...Array(5)].map((_, i) => (
                <span key={i} className={i < (report.feedback.rating || 0) ? "text-yellow-500" : "text-gray-300"}>★</span>
              ))}
            </div>
            <span className="ml-2 text-sm text-gray-600">
              ({report.feedback.rating || 0}/5)
            </span>
          </div>
          
          {report.feedback.comment && (
            <div className="bg-blue-50 p-3 rounded-lg text-sm italic">
              "{report.feedback.comment}"
            </div>
          )}
          
          {report.feedback.submittedAt && (
            <p className="text-xs text-gray-500 mt-2 text-right">
              Feedback submitted on {report.feedback.submittedAtFormatted || formatDate(report.feedback.submittedAt)}
            </p>
          )}
        </div>
      ) : report.status === 'needs-feedback' ? (
        <div className="border-t pt-3 mt-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-700">Awaiting Customer Feedback</h4>
            <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full">Pending</span>
          </div>
        </div>
      ) : null}
      
      <div className="flex items-center gap-2 text-gray-500 mt-4 pt-3 border-t">
        <FaFileAlt />
        <span className="font-medium">Report #{report._id?.substring(0, 8) || 'Unknown'}</span>
      </div>
    </div>
  );
};

export default DisputesReports;
