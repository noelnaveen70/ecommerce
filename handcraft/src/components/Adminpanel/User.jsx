import React, { useState, useEffect } from "react";
import { FaUser, FaStore, FaCheck, FaTimes, FaBan, FaUndo, FaSearch, FaSpinner, FaArrowLeft, 
  FaPhone, FaEnvelope, FaUserTag, FaIdCard, FaMapMarkerAlt, FaBuilding, FaUsers, FaFilter } from "react-icons/fa";
import axiosInstance from "../../axiosInstance";
import { Link } from "react-router-dom";

const User = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [showSuspensionModal, setShowSuspensionModal] = useState(false);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    users: 0,
    sellers: 0,
    admins: 0,
    pending: 0,
    suspended: 0
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    // Calculate stats whenever users array changes
    if (users.length > 0) {
      const newStats = {
        total: users.length,
        users: users.filter(user => user.role === 'user').length,
        sellers: users.filter(user => user.role === 'seller').length,
        admins: users.filter(user => user.role === 'admin').length,
        pending: users.filter(user => user.role === 'seller' && user.sellerInfo && !user.sellerInfo.isApproved && !user.sellerInfo.rejectionReason).length,
        suspended: users.filter(user => user.status === 'Suspended').length
      };
      setStats(newStats);
    }
  }, [users]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get("/api/auth/users");
      
      if (response.data.success) {
        setUsers(response.data.users);
      } else {
        setError(response.data.message || "Failed to fetch users");
      }
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Failed to load users. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, actionType) => {
    try {
      setLoading(true);
      
      let response;
      
      if (actionType === 'reject') {
        if (!rejectionReason.trim()) {
          showNotification('Rejection reason is required', 'error');
          setLoading(false);
          return;
        }
        
        response = await axiosInstance.put(`/api/auth/users/${id}/reject`, {
          reason: rejectionReason
        });
        
        // Close the modal and reset form
        setShowRejectionModal(false);
        setRejectionReason('');
      } else if (actionType === 'suspend') {
        if (!suspensionReason.trim()) {
          showNotification('Suspension reason is required', 'error');
          setLoading(false);
          return;
        }
        
        response = await axiosInstance.put(`/api/auth/users/${id}/suspend`, {
          reason: suspensionReason
        });
        
        // Close the modal and reset form
        setShowSuspensionModal(false);
        setSuspensionReason('');
      } else if (actionType === 'approve') {
        // Check if the user has a phone number
        const user = users.find(u => u._id === id);
        if (!user.phone) {
          // Need phone number
          setSelectedUserId(id);
          setPhoneNumber('');
          setShowPhoneModal(true);
          setLoading(false);
          return;
        }
        
        response = await axiosInstance.put(`/api/auth/users/${id}/${actionType}`);
      } else {
        response = await axiosInstance.put(`/api/auth/users/${id}/${actionType}`);
      }
      
      if (response.data.success) {
        // Update the user in the state
        setUsers(users.map(user => 
          user._id === id ? response.data.user : user
        ));
        
        showNotification(`User successfully ${actionType}ed`, 'success');
      } else {
        showNotification(response.data.message || `Failed to ${actionType} user`, 'error');
      }
    } catch (err) {
      console.error(`Error ${actionType}ing user:`, err);
      showNotification(err.response?.data?.message || `An error occurred while ${actionType}ing user`, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle phone number submission
  const handlePhoneSubmit = async () => {
    try {
      if (!phoneNumber || phoneNumber.length !== 10 || !/^\d+$/.test(phoneNumber)) {
        showNotification('Please enter a valid 10-digit phone number', 'error');
        return;
      }
      
      setLoading(true);
      
      // First update the phone number
      const updateResponse = await axiosInstance.put(`/api/auth/users/${selectedUserId}/update-phone`, {
        phone: phoneNumber
      });
      
      if (!updateResponse.data.success) {
        showNotification('Failed to update phone number', 'error');
        setLoading(false);
        return;
      }
      
      // Then approve the seller
      const approveResponse = await axiosInstance.put(`/api/auth/users/${selectedUserId}/approve`);
      
      if (approveResponse.data.success) {
        // Update user in state
        setUsers(users.map(user => 
          user._id === selectedUserId ? approveResponse.data.user : user
        ));
        
        showNotification('Seller approved successfully', 'success');
      } else {
        showNotification(approveResponse.data.message || 'Failed to approve seller', 'error');
      }
      
      // Close modal
      setShowPhoneModal(false);
      setPhoneNumber('');
    } catch (err) {
      console.error('Error in phone submission:', err);
      showNotification(err.response?.data?.message || 'An error occurred', 'error');
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
  
  const openRejectionModal = (userId) => {
    setSelectedUserId(userId);
    setShowRejectionModal(true);
  };
  
  const openSuspensionModal = (userId) => {
    setSelectedUserId(userId);
    setShowSuspensionModal(true);
  };

  // Filter users based on search, role, and status
  const filteredUsers = users.filter((user) => {
    const matchesSearch = search.toLowerCase() === '' || 
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  if (loading && users.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center">
          <FaSpinner className="animate-spin text-5xl text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading users data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Link 
            to="/Adminpanel" 
            className="mr-4 flex items-center px-3 py-1.5 bg-white shadow-sm rounded-md text-blue-600 hover:bg-blue-50 transition-colors text-sm"
          >
            <FaArrowLeft className="mr-1.5" size={12} />
            <span>Back to Admin Panel</span>
          </Link>
          <h1 className="text-3xl font-bold">User & Seller Management</h1>
        </div>
      </div>

      {notification.show && (
        <div className={`mb-6 p-4 rounded-lg ${
          notification.type === 'success' ? 'bg-green-100 text-green-800 border-l-4 border-green-500' : 'bg-red-100 text-red-800 border-l-4 border-red-500'
        } flex items-center shadow-md`}>
          {notification.type === 'success' ? <FaCheck className="mr-2" /> : <FaTimes className="mr-2" />}
          {notification.message}
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-100 text-red-800 rounded-lg border-l-4 border-red-500 flex items-center shadow-md">
          <FaTimes className="mr-2" />
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-blue-500">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-full mr-4">
              <FaUsers className="text-blue-500" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Users</p>
              <p className="text-xl font-bold">{stats.total}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-green-500">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-full mr-4">
              <FaUser className="text-green-500" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Customers</p>
              <p className="text-xl font-bold">{stats.users}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-indigo-500">
          <div className="flex items-center">
            <div className="p-3 bg-indigo-100 rounded-full mr-4">
              <FaStore className="text-indigo-500" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Sellers</p>
              <p className="text-xl font-bold">{stats.sellers}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-purple-500">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-full mr-4">
              <FaUserTag className="text-purple-500" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Admins</p>
              <p className="text-xl font-bold">{stats.admins}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-yellow-500">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-full mr-4">
              <FaIdCard className="text-yellow-500" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-xl font-bold">{stats.pending}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-red-500">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 rounded-full mr-4">
              <FaBan className="text-red-500" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Suspended</p>
              <p className="text-xl font-bold">{stats.suspended}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and filters */}
      <div className="bg-white p-5 rounded-lg shadow-md mb-6 border border-gray-100">
        <div className="flex items-center mb-4">
          <FaFilter className="text-blue-500 mr-2" />
          <h2 className="text-lg font-semibold">Search & Filter</h2>
        </div>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="text-gray-400" />
            </div>
        <input
          type="text"
              placeholder="Search by name or email..."
              className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
          </div>

          <div className="w-full md:w-48">
            <div className="relative">
              <select
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm appearance-none"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="all">All Roles</option>
                <option value="user">Users</option>
                <option value="seller">Sellers</option>
                <option value="admin">Admins</option>
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
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Pending">Pending</option>
                <option value="Suspended">Suspended</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="mb-4">
        <p className="text-gray-600 font-medium">
          Showing {filteredUsers.length} of {users.length} users
        </p>
      </div>

      {/* User List */}
      <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredUsers.map((user) => (
          <div key={user._id} className="bg-white rounded-lg shadow-md overflow-hidden transform hover:shadow-xl transition-all duration-300">
            {/* Card Header - Role-based color */}
            <div className={`p-4 text-white flex items-center ${getRoleBgColor(user.role)}`}>
              {user.role === "seller" ? (
                <FaStore className="mr-2 text-xl" />
              ) : user.role === "admin" ? (
                <FaUserTag className="mr-2 text-xl" />
              ) : (
                <FaUser className="mr-2 text-xl" />
              )}
              <h2 className="text-xl font-semibold truncate">{user.name}</h2>
            </div>
            
            {/* Card Body */}
            <div className="p-4">
              <div className="mb-4">
                <div className="flex items-center mb-2">
                  <FaEnvelope className="text-gray-400 mr-2" />
                  <p className="text-gray-600 truncate">{user.email}</p>
                </div>
                {user.phone && (
                  <div className="flex items-center mb-2">
                    <FaPhone className="text-gray-400 mr-2" />
                    <p className="text-gray-600">{user.phone}</p>
                  </div>
                )}
                <div className="flex items-center">
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBgColor(user.status)}`}>
                    {user.status || 'Active'}
                  </div>
                </div>
              </div>
              
              {user.role === "seller" && user.sellerInfo && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-start mb-2">
                    <FaBuilding className="text-gray-400 mr-2 mt-1" />
                    <div>
                      <p className="text-xs text-gray-500">Business</p>
                      <p className="text-gray-700 font-medium">{user.sellerInfo.businessName}</p>
                    </div>
                  </div>
                  <div className="flex items-start mb-2">
                    <FaMapMarkerAlt className="text-gray-400 mr-2 mt-1" />
                    <div>
                      <p className="text-xs text-gray-500">Location</p>
                      <p className="text-gray-700 font-medium">{user.sellerInfo.location}</p>
                    </div>
                  </div>
                  <div className="mt-2">
                    {user.sellerInfo.isApproved ? (
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                        <span className="text-green-600 text-sm font-medium">Approved Seller</span>
                      </div>
                    ) : user.sellerInfo.rejectionReason ? (
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                        <span className="text-red-600 text-sm font-medium">Rejected</span>
                        <p className="text-xs text-red-500 ml-2">({user.sellerInfo.rejectionReason})</p>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                        <span className="text-yellow-600 text-sm font-medium">Pending Approval</span>
                        <p className="text-xs text-yellow-500 ml-2">(Cannot login until approved)</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

            {/* Actions */}
              <div className="mt-4 flex flex-wrap gap-2">
                {user.role === "seller" && !user.sellerInfo?.isApproved && !user.sellerInfo?.rejectionReason && (
                <>
                  <button
                      onClick={() => handleAction(user._id, "approve")}
                      className="px-3 py-1.5 bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center transition-colors"
                      disabled={loading}
                  >
                      <FaCheck className="mr-1" size={12} /> Approve
                  </button>
                  <button
                      onClick={() => openRejectionModal(user._id)}
                      className="px-3 py-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center transition-colors"
                      disabled={loading}
                  >
                      <FaTimes className="mr-1" size={12} /> Reject
                  </button>
                </>
              )}
              {user.status !== "Suspended" ? (
                <button
                    onClick={() => openSuspensionModal(user._id)}
                    className="px-3 py-1.5 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 flex items-center transition-colors"
                    disabled={loading}
                >
                    <FaBan className="mr-1" size={12} /> Suspend
                </button>
              ) : (
                <button
                    onClick={() => handleAction(user._id, "restore")}
                    className="px-3 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center transition-colors"
                    disabled={loading}
                >
                    <FaUndo className="mr-1" size={12} /> Restore
                </button>
              )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* No Users Found */}
      {filteredUsers.length === 0 && !loading && (
        <div className="text-center p-8 bg-white rounded-lg shadow-sm">
          <FaUsers className="text-gray-300 text-5xl mx-auto mb-4" />
          <p className="text-lg text-gray-500 font-medium">No users found matching your criteria.</p>
          <p className="text-gray-400 mt-2">Try adjusting your search filters.</p>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <h3 className="text-xl font-semibold mb-2">Reject Seller Application</h3>
            <p className="text-gray-500 mb-4">Please provide a reason for rejection:</p>
            <textarea
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              placeholder="Enter reason for rejection..."
              rows="4"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            ></textarea>
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors"
                onClick={() => {
                  setShowRejectionModal(false);
                  setRejectionReason('');
                }}
              >
                Cancel
              </button>
              <button
                className={`px-4 py-2 bg-red-500 text-white rounded-md transition-colors ${
                  !rejectionReason.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-600'
                }`}
                onClick={() => handleAction(selectedUserId, 'reject')}
                disabled={!rejectionReason.trim()}
              >
                Reject Application
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspension Modal */}
      {showSuspensionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <h3 className="text-xl font-semibold mb-2">Suspend User</h3>
            <p className="text-gray-500 mb-4">Please provide a reason for suspension:</p>
            <textarea
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              placeholder="Enter reason for suspension..."
              rows="4"
              value={suspensionReason}
              onChange={(e) => setSuspensionReason(e.target.value)}
            ></textarea>
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors"
                onClick={() => {
                  setShowSuspensionModal(false);
                  setSuspensionReason('');
                }}
              >
                Cancel
              </button>
              <button
                className={`px-4 py-2 bg-yellow-500 text-white rounded-md transition-colors ${
                  !suspensionReason.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-yellow-600'
                }`}
                onClick={() => handleAction(selectedUserId, 'suspend')}
                disabled={!suspensionReason.trim()}
              >
                Suspend User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Phone Number Modal */}
      {showPhoneModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <h3 className="text-xl font-semibold mb-2">Enter Seller's Phone Number</h3>
            <p className="text-gray-500 mb-4">A phone number is required to approve this seller:</p>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-medium mb-2">Phone Number</label>
              <input
                type="text"
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter 10-digit phone number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                maxLength={10}
              />
              <p className="text-xs text-gray-500 mt-1">Format: 10 digits without spaces or dashes</p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors"
                onClick={() => {
                  setShowPhoneModal(false);
                  setPhoneNumber('');
                }}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className={`px-4 py-2 bg-green-500 text-white rounded-md transition-colors ${
                  loading || !phoneNumber.trim() || phoneNumber.length !== 10 || !/^\d+$/.test(phoneNumber) 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:bg-green-600'
                }`}
                onClick={handlePhoneSubmit}
                disabled={loading || !phoneNumber.trim() || phoneNumber.length !== 10 || !/^\d+$/.test(phoneNumber)}
              >
                {loading ? 'Processing...' : 'Submit & Approve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Get Status Color
const getStatusColor = (status) => {
  switch (status) {
    case "Active":
      return "text-green-500";
    case "Pending":
      return "text-yellow-500";
    case "Suspended":
      return "text-red-500";
    default:
      return "text-gray-500";
  }
};

// Get Status Background Color
const getStatusBgColor = (status) => {
  switch (status) {
    case "Active":
      return "bg-green-100 text-green-800";
    case "Pending":
      return "bg-yellow-100 text-yellow-800";
    case "Suspended":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

// Get Role Background Color
const getRoleBgColor = (role) => {
  switch (role) {
    case "admin":
      return "bg-purple-600";
    case "seller":
      return "bg-indigo-600";
    case "user":
      return "bg-blue-600";
    default:
      return "bg-gray-600";
  }
};

export default User;
