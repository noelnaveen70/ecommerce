import React, { useState, useEffect } from 'react';
import { FaQuestion, FaComments, FaHistory, FaFileAlt, FaPaperPlane, FaPlus, FaFilter } from 'react-icons/fa';
import axiosInstance from '../../axiosInstance';
import { useNavigate } from 'react-router-dom';
import { getAuthToken } from '../../utils/auth';

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

const ContactUs = () => {
  const [activeTab, setActiveTab] = useState('create');
  const [disputes, setDisputes] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const navigate = useNavigate();
  
  // Form state for new dispute
  const [newDispute, setNewDispute] = useState({
    title: '',
    description: '',
    category: 'order'
  });
  
  // State for expanded dispute
  const [expandedDispute, setExpandedDispute] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  
  // Filter state
  const [statusFilter, setStatusFilter] = useState('all');
  
  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      navigate('/login?redirect=contact-us');
      return;
    }
    
    // Remove order ID handling from URL parameters
    fetchDisputesAndReports();
  }, [navigate]);
  
  const fetchDisputesAndReports = async () => {
    try {
      setLoading(true);
      const [disputesRes, reportsRes] = await Promise.all([
        axiosInstance.get('/api/disputes/my-disputes'),
        axiosInstance.get('/api/disputes/reports/my-reports')
      ]);
      
      if (disputesRes.data.success) {
        // Process disputes to avoid resolution validation errors
        const processedDisputes = disputesRes.data.disputes.map(processDisputeData);
        setDisputes(processedDisputes);
      }
      
      if (reportsRes.data.success) {
        setReports(reportsRes.data.reports);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load your disputes and reports. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewDispute(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmitDispute = async (e) => {
    e.preventDefault();
    
    try {
      // Reset any previous errors
      setError(null);
      
      // Form validation
      if (!newDispute.title.trim()) {
        showNotification('Please provide a title for your dispute', 'error');
        return;
      }
      
      if (!newDispute.description.trim()) {
        showNotification('Please provide a description of your issue', 'error');
        return;
      }
      
      setLoading(true);
      
      // Create a clean request body with minimal required fields
      const requestBody = {
        title: newDispute.title.trim(),
        description: newDispute.description.trim(),
        category: newDispute.category,
        // Explicitly set resolution to undefined to ensure it's not included in the request
        resolution: undefined
      };
      
      // Remove relatedOrderId handling
      
      // Remove any fields with undefined values before sending
      Object.keys(requestBody).forEach(key => 
        requestBody[key] === undefined && delete requestBody[key]
      );
      
      console.log('Submitting dispute with data:', requestBody);
      
      // Display a temporary notification to show that we're processing
      showNotification('Processing your dispute submission...', 'success');
      
      const response = await axiosInstance.post('/api/disputes/create', requestBody);
      
      if (response.data.success) {
        // Reset form
        setNewDispute({
          title: '',
          description: '',
          category: 'order'
        });
        
        // Process the dispute object to avoid resolution validation errors
        const processedDispute = processDisputeData(response.data.dispute);
        
        // Update disputes list
        setDisputes(prev => [processedDispute, ...prev]);
        
        // Show success message and switch to active tab
        showNotification('Dispute submitted successfully!', 'success');
        setActiveTab('active');
      } else {
        showNotification(response.data.message || 'Failed to submit dispute', 'error');
      }
    } catch (err) {
      console.error('Error submitting dispute:', err);
      
      // Provide more specific error messages based on the server response
      let errorMessage = 'An error occurred while submitting your dispute. Please try again.';
      
      if (err.response) {
        console.log('Error response:', err.response);
        
        // Order ID error handling
        const isOrderIdError = 
          err.response.data?.message?.includes('Order ID') || 
          err.response.data?.message?.includes('ObjectId');
        
        if (isOrderIdError && newDispute.category === 'order' && newDispute.relatedOrderId) {
          // Try again without the order ID
          try {
            showNotification('Retrying without Order ID...', 'success');
            
            const simplifiedBody = {
              title: newDispute.title.trim(),
              description: newDispute.description.trim(),
              category: newDispute.category
            };
            
            const retryResponse = await axiosInstance.post('/api/disputes/create', simplifiedBody);
            
            if (retryResponse.data.success) {
              // Reset form
              setNewDispute({
                title: '',
                description: '',
                category: 'order'
              });
              
              // Update disputes list
              setDisputes(prev => [retryResponse.data.dispute, ...prev]);
              
              // Show success message and switch to active tab
              showNotification('Dispute submitted successfully without Order ID!', 'success');
              setActiveTab('active');
              return;
            }
          } catch (retryError) {
            console.error('Retry also failed:', retryError);
            errorMessage = 'Failed to create dispute even without Order ID. Please try again later.';
          }
        } else {
          // Server responded with an error
          if (err.response.status === 400) {
            errorMessage = err.response.data.message || 'Missing or invalid fields. Please check your input.';
          } else if (err.response.status === 401) {
            errorMessage = 'You need to be logged in to submit a dispute.';
            // Redirect to login
            setTimeout(() => navigate('/login?redirect=contact-us'), 2000);
          } else if (err.response.status === 500) {
            errorMessage = 'Server error. Please try again with minimal information or contact support if the issue persists.';
          }
        }
      } else if (err.request) {
        // No response received
        errorMessage = 'Could not connect to the server. Please check your internet connection.';
      }
      
      showNotification(errorMessage, 'error');
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
        setDisputes(prev => 
          prev.map(dispute => 
            dispute._id === disputeId ? response.data.dispute : dispute
          )
        );
        setMessageInput('');
        showNotification('Message sent successfully!', 'success');
      } else {
        showNotification(response.data.message || 'Failed to send message', 'error');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      showNotification(err.response?.data?.message || 'An error occurred while sending your message', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmitFeedback = async (reportId, rating) => {
    try {
      setLoading(true);
      const response = await axiosInstance.post(`/api/disputes/reports/${reportId}/feedback`, {
        rating
      });
      
      if (response.data.success) {
        setReports(prev => 
          prev.map(report => 
            report._id === reportId ? response.data.report : report
          )
        );
        showNotification('Feedback submitted successfully!', 'success');
      } else {
        showNotification(response.data.message || 'Failed to submit feedback', 'error');
      }
    } catch (err) {
      console.error('Error submitting feedback:', err);
      showNotification(err.response?.data?.message || 'An error occurred while submitting your feedback', 'error');
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
  
  // Helper function to format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };
  
  // Filter disputes based on status
  const filteredDisputes = disputes.filter(dispute => 
    statusFilter === 'all' ? true : dispute.status === statusFilter
  );
  
  if (loading && !disputes.length && !reports.length) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Contact & Support</h1>
          <p className="text-gray-600 mt-2">Get help or report issues with your orders</p>
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
        
        {/* Tabs */}
        <div className="flex border-b mb-6">
          <button 
            className={`flex items-center px-6 py-3 ${activeTab === 'create' 
              ? 'text-primary border-b-2 border-primary font-medium' 
              : 'text-gray-600 hover:text-primary'}`}
            onClick={() => setActiveTab('create')}
          >
            <FaPlus className="mr-2" />
            Create Dispute
          </button>
          <button 
            className={`flex items-center px-6 py-3 ${activeTab === 'active' 
              ? 'text-primary border-b-2 border-primary font-medium' 
              : 'text-gray-600 hover:text-primary'}`}
            onClick={() => setActiveTab('active')}
          >
            <FaComments className="mr-2" />
            Active Disputes {disputes.filter(d => d.status !== 'resolved' && d.status !== 'rejected').length > 0 && 
              <span className="ml-2 bg-primary text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                {disputes.filter(d => d.status !== 'resolved' && d.status !== 'rejected').length}
              </span>
            }
          </button>
          <button 
            className={`flex items-center px-6 py-3 ${activeTab === 'history' 
              ? 'text-primary border-b-2 border-primary font-medium' 
              : 'text-gray-600 hover:text-primary'}`}
            onClick={() => setActiveTab('history')}
          >
            <FaHistory className="mr-2" />
            History
          </button>
          <button 
            className={`flex items-center px-6 py-3 ${activeTab === 'reports' 
              ? 'text-primary border-b-2 border-primary font-medium' 
              : 'text-gray-600 hover:text-primary'}`}
            onClick={() => setActiveTab('reports')}
          >
            <FaFileAlt className="mr-2" />
            Reports {reports.length > 0 && 
              <span className="ml-2 bg-primary text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                {reports.length}
              </span>
            }
          </button>
        </div>
        
        {/* Create New Dispute Form */}
        {activeTab === 'create' && (
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
            <h2 className="text-xl font-semibold mb-6 flex items-center text-gray-800">
              <span className="bg-blue-100 text-blue-600 p-2 rounded-full mr-3">
                <FaPlus className="text-sm" />
              </span>
              Submit a New Dispute
            </h2>
            <form onSubmit={handleSubmitDispute} className="space-y-5">
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="title">
                  Title
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  value={newDispute.title}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                  placeholder="Brief title of your issue"
                />
                <p className="mt-1 text-xs text-gray-500">Provide a clear, concise title describing your issue</p>
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="category">
                  Category
                </label>
                <div className="relative">
                  <select
                    id="category"
                    name="category"
                    value={newDispute.category}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent appearance-none shadow-sm"
                  >
                    <option value="order">Order Issue</option>
                    <option value="payment">Payment Issue</option>
                    <option value="product">Product Issue</option>
                    <option value="account">Account Issue</option>
                    <option value="other">Other</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                    </svg>
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-500">Select the category that best matches your issue</p>
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={newDispute.description}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent h-36 shadow-sm"
                  placeholder="Describe your issue in detail"
                ></textarea>
                <p className="mt-1 text-xs text-gray-500">
                  Please provide as much detail as possible to help us resolve your issue quickly
                </p>
              </div>
              
              <div className="flex items-center text-sm text-gray-600 mb-4 bg-blue-50 p-4 rounded-lg">
                <svg className="w-5 h-5 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span>Our support team typically responds within 24-48 hours during business days.</span>
              </div>
              
              <button
                type="submit"
                className="w-full bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary-dark transition-colors flex items-center justify-center font-medium shadow-md"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="animate-spin mr-2">
                      <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </span>
                    Processing...
                  </>
                ) : (
                  <>
                    <FaPaperPlane className="mr-2" />
                    Submit Dispute
                  </>
                )}
              </button>
            </form>
          </div>
        )}
        
        {/* Active Disputes */}
        {activeTab === 'active' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Active Disputes</h2>
              <div className="flex items-center bg-white p-2 rounded-lg shadow-sm">
                <FaFilter className="text-gray-500 mr-2" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border-none text-sm focus:outline-none bg-transparent"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                </select>
              </div>
            </div>
            
            {filteredDisputes.filter(d => d.status !== 'resolved' && d.status !== 'rejected').length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center border border-gray-100">
                <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <FaQuestion className="text-2xl text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">No active disputes</h3>
                <p className="text-gray-600 mb-5">You don't have any active disputes at the moment.</p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="bg-primary text-white px-5 py-2 rounded-lg hover:bg-primary-dark transition-colors inline-flex items-center shadow-sm"
                >
                  <FaPlus className="mr-2" />
                  Create New Dispute
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {filteredDisputes
                  .filter(d => d.status !== 'resolved' && d.status !== 'rejected')
                  .map(dispute => (
                    <div key={dispute._id} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-100">
                      <div className="p-6">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">{dispute.title}</h3>
                            <div className="flex items-center text-sm text-gray-500 mb-3">
                              <span className="flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"></path>
                                </svg>
                                {formatDate(dispute.createdAt)}
                              </span>
                              <span className="mx-2">•</span>
                              <span className="capitalize">{dispute.category}</span>
                            </div>
                          </div>
                          <div>
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              dispute.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              dispute.status === 'in-progress' ? 'bg-blue-100 text-blue-800' : 
                              dispute.status === 'resolved' ? 'bg-green-100 text-green-800' : 
                              'bg-red-100 text-red-800'
                            }`}>
                              {capitalizeFirstLetter(dispute.status.replace('-', ' '))}
                            </span>
                          </div>
                        </div>
                        
                        <p className="text-gray-700 mt-2 mb-4 bg-gray-50 p-4 rounded-lg">
                          {dispute.description.length > 150 
                            ? `${dispute.description.substring(0, 150)}...` 
                            : dispute.description}
                        </p>
                        
                        {/* Resolution data if available */}
                        {(dispute.status === 'resolved' || dispute.status === 'rejected') && (
                          <div className="mt-4 border-t pt-4">
                            {/* Handle both data structures (nested and flat) */}
                            {(dispute.resolution?.outcome || dispute.resolutionOutcome) && (
                              <p className="text-sm font-medium text-gray-700">
                                Resolution: {capitalizeFirstLetter(dispute.resolution?.outcome || dispute.resolutionOutcome)}
                              </p>
                            )}
                            
                            {/* Notes - handle both structures */}
                            {(dispute.resolution?.notes || dispute.resolutionNotes) && (
                              <p className="text-sm text-gray-600 mt-2">
                                {dispute.resolution?.notes || dispute.resolutionNotes}
                              </p>
                            )}
                            
                            {/* Completed date - handle both structures */}
                            {(dispute.resolution?.completedAt || dispute.resolutionCompletedAt) && (
                              <p className="text-xs text-gray-500 mt-1">
                                Resolved on {formatDate(dispute.resolution?.completedAt || dispute.resolutionCompletedAt)}
                              </p>
                            )}
                          </div>
                        )}
                        
                        <button
                          onClick={() => setExpandedDispute(expandedDispute === dispute._id ? null : dispute._id)}
                          className="mt-3 text-primary hover:text-primary-dark transition-colors text-sm font-medium flex items-center"
                        >
                          {expandedDispute === dispute._id ? (
                            <>
                              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd"></path>
                              </svg>
                              Hide Conversation
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd"></path>
                              </svg>
                              View Conversation
                            </>
                          )}
                        </button>
                      </div>
                      
                      {expandedDispute === dispute._id && (
                        <div className="border-t p-6 bg-gray-50">
                          <h4 className="font-medium text-gray-900 mb-4">Conversation</h4>
                          
                          <div className="space-y-4 mb-4 max-h-96 overflow-y-auto p-2">
                            {dispute.messages.map((msg, idx) => (
                              <div 
                                key={idx} 
                                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                              >
                                <div 
                                  className={`px-4 py-3 rounded-lg max-w-[75%] ${
                                    msg.sender === 'user' 
                                      ? 'bg-primary text-white shadow-sm' 
                                      : 'bg-white border border-gray-200 text-gray-800 shadow-sm'
                                  }`}
                                >
                                  <p className="text-sm">{msg.content}</p>
                                  <p className="text-xs opacity-75 mt-1 text-right">
                                    {formatDate(msg.timestamp)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          <div className="flex mt-4">
                            <input
                              type="text"
                              value={messageInput}
                              onChange={(e) => setMessageInput(e.target.value)}
                              placeholder="Type your message..."
                              className="flex-1 px-4 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                            />
                            <button
                              onClick={() => handleSendMessage(dispute._id)}
                              disabled={!messageInput.trim() || loading}
                              className="bg-primary text-white px-4 py-2 rounded-r-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
                            >
                              <FaPaperPlane />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
        
        {/* History */}
        {activeTab === 'history' && (
          <div>
            <h2 className="text-xl font-semibold mb-6 text-gray-800">Dispute History</h2>
            
            {filteredDisputes.filter(d => d.status === 'resolved' || d.status === 'rejected').length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center border border-gray-100">
                <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <FaHistory className="text-2xl text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">No dispute history</h3>
                <p className="text-gray-600 mb-3">You don't have any resolved or rejected disputes.</p>
                <div className="p-4 bg-blue-50 text-blue-700 rounded-lg inline-block mt-2 text-sm">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    Completed disputes will be shown here for your reference.
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {filteredDisputes
                  .filter(d => d.status === 'resolved' || d.status === 'rejected')
                  .map(dispute => (
                    <div key={dispute._id} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-100">
                      <div className="p-6">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">{dispute.title}</h3>
                            <div className="flex items-center text-sm text-gray-500 mb-3">
                              <span className="flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"></path>
                                </svg>
                                {formatDate(dispute.createdAt)}
                              </span>
                              <span className="mx-2">•</span>
                              <span className="capitalize">{dispute.category}</span>
                            </div>
                          </div>
                          <div>
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              dispute.status === 'resolved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {capitalizeFirstLetter(dispute.status.replace('-', ' '))}
                            </span>
                          </div>
                        </div>
                        
                        {dispute.resolution && dispute.resolution.outcome && (
                          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center mb-2">
                              <svg className="w-5 h-5 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              <p className="text-sm font-medium text-gray-700">
                                Resolution: {capitalizeFirstLetter(dispute.resolution.outcome)}
                              </p>
                            </div>
                            {dispute.resolution.notes && (
                              <div className="ml-7">
                                <p className="text-sm text-gray-600 mb-2">
                                  {dispute.resolution.notes}
                                </p>
                              </div>
                            )}
                            {dispute.resolution.completedAt && (
                              <p className="text-xs text-gray-500 mt-2 ml-7 flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 0116 0zm1-12a1 1 0 10-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                                Resolved on {formatDate(dispute.resolution.completedAt)}
                              </p>
                            )}
                          </div>
                        )}
                        
                        <button
                          onClick={() => setExpandedDispute(expandedDispute === dispute._id ? null : dispute._id)}
                          className="mt-4 text-primary hover:text-primary-dark transition-colors text-sm font-medium flex items-center"
                        >
                          {expandedDispute === dispute._id ? (
                            <>
                              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd"></path>
                              </svg>
                              Hide Conversation
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd"></path>
                              </svg>
                              View Conversation History
                            </>
                          )}
                        </button>
                      </div>
                      
                      {expandedDispute === dispute._id && (
                        <div className="border-t p-6 bg-gray-50">
                          <h4 className="font-medium text-gray-900 mb-4 flex items-center">
                            <svg className="w-4 h-4 mr-2 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z" clipRule="evenodd" />
                            </svg>
                            Conversation History
                          </h4>
                          
                          <div className="space-y-4 mb-4 max-h-96 overflow-y-auto p-2">
                            {dispute.messages.map((msg, idx) => (
                              <div 
                                key={idx} 
                                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                              >
                                <div 
                                  className={`px-4 py-3 rounded-lg max-w-[75%] ${
                                    msg.sender === 'user' 
                                      ? 'bg-primary text-white shadow-sm' 
                                      : 'bg-white border border-gray-200 text-gray-800 shadow-sm'
                                  }`}
                                >
                                  <p className="text-sm">{msg.content}</p>
                                  <p className="text-xs opacity-75 mt-1 text-right">
                                    {formatDate(msg.timestamp)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
        
        {/* Reports */}
        {activeTab === 'reports' && (
          <div>
            <h2 className="text-xl font-semibold mb-6 text-gray-800">Support Reports</h2>
            
            {reports.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center border border-gray-100">
                <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <FaFileAlt className="text-2xl text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">No reports available</h3>
                <p className="text-gray-600 mb-3">You don't have any support reports yet. Reports are generated after resolving a dispute.</p>
                <div className="p-4 bg-blue-50 text-blue-700 rounded-lg inline-block mt-2 text-sm">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    Once your dispute is resolved, you'll see a report here.
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {reports.map(report => (
                  <div key={report._id} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-100">
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 mb-2">{report.title}</h3>
                          <div className="flex items-center text-sm text-gray-500">
                            <span className="flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"></path>
                              </svg>
                              {formatDate(report.createdAt)}
                            </span>
                            <span className="mx-2">•</span>
                            <span className="capitalize">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
                                {capitalizeFirstLetter(report.resolution)}
                              </span>
                            </span>
                          </div>
                        </div>
                        <div>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            report.status === 'completed' ? 'bg-green-100 text-green-800' :
                            report.status === 'needs-feedback' ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {capitalizeFirstLetter(report.status.replace('-', ' '))}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <div className="mb-3">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Summary</h4>
                          <p className="text-sm font-medium text-gray-700 bg-gray-50 p-3 rounded-lg">{report.summary}</p>
                        </div>
                        <div className="mb-3">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Details</h4>
                          <div className="mt-1 p-3 bg-gray-50 rounded-lg text-sm text-gray-600 max-h-32 overflow-y-auto">
                            {report.details}
                          </div>
                        </div>
                      </div>
                      
                      {report.status === 'needs-feedback' && !report.feedback.rating && (
                        <div className="mt-6 border-t pt-4">
                          <h4 className="text-base font-medium mb-3 flex items-center text-gray-800">
                            <svg className="w-4 h-4 mr-1 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            Please provide feedback
                          </h4>
                          <div className="flex flex-col space-y-4">
                            <div>
                              <p className="text-sm text-gray-700 mb-3">How would you rate this resolution?</p>
                              <div className="flex space-x-3">
                                {[1, 2, 3, 4, 5].map(rating => (
                                  <button
                                    key={rating}
                                    onClick={() => handleSubmitFeedback(report._id, rating)}
                                    className="w-10 h-10 rounded-full flex items-center justify-center border-2 border-gray-300 hover:bg-gray-100 hover:border-primary transition-colors"
                                  >
                                    {rating}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {report.feedback && report.feedback.rating && (
                        <div className="mt-6 border-t pt-4">
                          <h4 className="text-base font-medium mb-3 flex items-center text-gray-800">
                            <svg className="w-4 h-4 mr-1 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            Your Feedback
                          </h4>
                          <div className="flex items-center space-x-1 mb-3">
                            {[...Array(5)].map((_, i) => (
                              <span 
                                key={i} 
                                className={`text-xl ${i < report.feedback.rating ? 'text-yellow-500' : 'text-gray-300'}`}
                              >
                                ★
                              </span>
                            ))}
                            <span className="ml-2 text-sm text-gray-600">
                              {report.feedback.submittedAt && `Submitted on ${formatDate(report.feedback.submittedAt)}`}
                            </span>
                          </div>
                          {report.feedback.comment && (
                            <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-700 italic">
                              "{report.feedback.comment}"
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactUs; 