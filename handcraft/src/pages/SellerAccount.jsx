import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { 
  FaUser, 
  FaEnvelope, 
  FaPhone, 
  FaMapMarkerAlt, 
  FaLock, 
  FaEdit, 
  FaSave, 
  FaTimes, 
  FaStore,
  FaBox,
  FaCheckCircle
} from "react-icons/fa";
import axiosInstance from "../axiosInstance";
import { getAuthToken } from "../utils/auth";
import Footer from "../components/Footer/Footer";

const SellerAccount = () => {
  const navigate = useNavigate();
  const [seller, setSeller] = useState({
    name: "",
    email: "",
    phone: "",
    role: "seller",
    avatar: "",
    sellerInfo: {
      businessName: "",
      location: "",
      description: "",
      isApproved: false,
      bankDetails: {
        accountName: "",
        accountNumber: "",
        bankName: "",
        ifscCode: ""
      }
    }
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editedSeller, setEditedSeller] = useState({});
  const [notification, setNotification] = useState({ show: false, message: "", type: "" });
  
  // Format phone number for display
  const formatPhoneNumber = (phone) => {
    if (!phone) return "Not provided";
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length !== 10) return phone;
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  };
  
  // Fetch seller profile
  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      navigate("/login?redirect=seller-account");
      return;
    }
    
    const fetchSellerProfile = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.get("/api/auth/seller-profile");
        
        if (response.data.success) {
          // Check if user is a seller
          if (response.data.user.role !== 'seller') {
            navigate('/account');
            return;
          }
          
          // Set default values for sellerInfo if not present
          const userData = {
            ...response.data.user,
            phone: response.data.user.phone || "",
            sellerInfo: {
              businessName: response.data.user.sellerInfo?.businessName || "Not provided",
              location: response.data.user.sellerInfo?.location || "Not provided",
              description: response.data.user.sellerInfo?.description || "No description provided",
              isApproved: response.data.user.sellerInfo?.isApproved || false,
              bankDetails: response.data.user.sellerInfo?.bankDetails || {
                accountName: "",
                accountNumber: "",
                bankName: "",
                ifscCode: ""
              }
            }
          };
          
          setSeller(userData);
          setEditedSeller(userData);
          setError(null);
        } else {
          setError("Failed to load profile data: " + (response.data.message || "Unknown error"));
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
        
        if (err.response?.status === 401) {
          setError("Your session has expired. Please log in again.");
          setTimeout(() => {
            navigate("/login?redirect=seller-account");
          }, 2000);
          return;
        }
        
        setError("Unable to load your profile. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchSellerProfile();
  }, [navigate]);
  
  // Handle edit mode toggle
  const toggleEditMode = () => {
    if (editMode) {
      setEditedSeller(seller);
    }
    setEditMode(!editMode);
  };
  
  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes(".")) {
      const [parent, child] = name.split(".");
      setEditedSeller(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setEditedSeller(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  // Handle profile update
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Format the data to match the schema structure
      const updateData = {
        name: editedSeller.name,
        email: editedSeller.email,
        phone: editedSeller.phone ? editedSeller.phone.replace(/\D/g, '') : '',
        sellerInfo: {
          businessName: editedSeller.sellerInfo.businessName === "Not provided" ? "" : editedSeller.sellerInfo.businessName,
          location: editedSeller.sellerInfo.location === "Not provided" ? "" : editedSeller.sellerInfo.location,
          description: editedSeller.sellerInfo.description === "No description provided" ? "" : editedSeller.sellerInfo.description,
          isApproved: seller.sellerInfo.isApproved,
          bankDetails: seller.sellerInfo.bankDetails || {}
        }
      };
      
      const response = await axiosInstance.put("/api/auth/seller-profile", updateData);
      
      if (response.data.success) {
        setSeller(response.data.user);
        setEditedSeller(response.data.user);
        setEditMode(false);
        showNotification("Profile updated successfully", "success");
      } else {
        showNotification(response.data.message || "Failed to update profile", "error");
      }
    } catch (err) {
      console.error("Error updating profile:", err);
      showNotification(err.response?.data?.message || "An error occurred while updating your profile", "error");
    } finally {
      setLoading(false);
    }
  };
  
  // Show notification
  const showNotification = (message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: "", type: "" });
    }, 3000);
  };

  if (loading && !seller.name) {
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
            <h1 className="text-3xl font-bold text-gray-800">Seller Dashboard</h1>
            <p className="text-gray-600 mt-2">Manage your seller account and business settings</p>
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
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="md:col-span-2">
              {/* Profile Information */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-800">Business Information</h2>
                  <button 
                    onClick={toggleEditMode}
                    className="flex items-center text-sm font-medium text-primary hover:text-primary-dark transition-colors"
                  >
                    {editMode ? (
                      <>
                        <FaTimes className="mr-1" /> Cancel
                      </>
                    ) : (
                      <>
                        <FaEdit className="mr-1" /> Edit Profile
                      </>
                    )}
                  </button>
                </div>
                
                {editMode ? (
                  <form onSubmit={handleProfileUpdate}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Business Name</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FaStore className="text-gray-400" />
                          </div>
                          <input 
                            type="text" 
                            name="sellerInfo.businessName" 
                            value={editedSeller.sellerInfo?.businessName || ''} 
                            onChange={handleInputChange}
                            className="pl-10 w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Enter your business name"
                            required
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Business Location</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FaMapMarkerAlt className="text-gray-400" />
                          </div>
                          <input 
                            type="text" 
                            name="sellerInfo.location" 
                            value={editedSeller.sellerInfo?.location || ''} 
                            onChange={handleInputChange}
                            className="pl-10 w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Enter your business location"
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Business Description</label>
                        <textarea 
                          name="sellerInfo.description" 
                          value={editedSeller.sellerInfo?.description || ''} 
                          onChange={handleInputChange}
                          className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                          rows={4}
                          placeholder="Describe your business"
                          required
                        ></textarea>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FaEnvelope className="text-gray-400" />
                          </div>
                          <input 
                            type="email" 
                            name="email" 
                            value={editedSeller.email || ''} 
                            onChange={handleInputChange}
                            className="pl-10 w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Enter your contact email"
                            required
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FaPhone className="text-gray-400" />
                          </div>
                          <input 
                            type="tel" 
                            name="phone" 
                            value={editedSeller.phone || ''} 
                            onChange={handleInputChange}
                            className="pl-10 w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Enter your phone number"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-6 flex justify-end">
                      <button 
                        type="submit" 
                        className="flex items-center bg-primary hover:bg-primary-dark text-white py-2 px-6 rounded-lg transition-colors"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div> Saving...
                          </>
                        ) : (
                          <>
                            <FaSave className="mr-2" /> Save Changes
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Business Name</h3>
                        <p className="mt-1 flex items-center">
                          <FaStore className="text-gray-400 mr-2" />
                          {seller.sellerInfo?.businessName || "Not provided"}
                        </p>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Business Location</h3>
                        <p className="mt-1 flex items-center">
                          <FaMapMarkerAlt className="text-gray-400 mr-2" />
                          {seller.sellerInfo?.location || "Not provided"}
                        </p>
                      </div>
                      
                      <div className="md:col-span-2">
                        <h3 className="text-sm font-medium text-gray-500">Business Description</h3>
                        <p className="mt-1">
                          {seller.sellerInfo?.description || "No description provided"}
                        </p>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Contact Email</h3>
                        <p className="mt-1 flex items-center">
                          <FaEnvelope className="text-gray-400 mr-2" />
                          {seller.email || "Not provided"}
                        </p>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Phone Number</h3>
                        <p className="mt-1 flex items-center">
                          <FaPhone className="text-gray-400 mr-2" />
                          {formatPhoneNumber(seller.phone)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Sidebar */}
            <div className="md:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex flex-col items-center">
                  <div className="h-24 w-24 bg-gray-200 rounded-full overflow-hidden mb-4">
                    {seller.avatar ? (
                      <img 
                        src={seller.avatar} 
                        alt={seller.name} 
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex justify-center items-center">
                        <FaUser className="text-gray-400 text-4xl" />
                      </div>
                    )}
                  </div>
                  <h3 className="text-lg font-medium">{seller.name}</h3>
                  <p className="text-gray-500 text-sm">{seller.email}</p>
                  
                  {seller.sellerInfo?.isApproved ? (
                    <span className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      <FaCheckCircle className="mr-1" /> Verified Seller
                    </span>
                  ) : (
                    <span className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                      Pending Approval
                    </span>
                  )}
                </div>
                
                <div className="mt-6 border-t pt-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-4">Quick Links</h3>
                  <ul className="space-y-3">
                    <li>
                      <a 
                        href="/Seller" 
                        className="flex items-center text-gray-600 hover:text-primary transition-colors"
                      >
                        <FaBox className="mr-2" />
                        Manage Products
                      </a>
                    </li>
                    <li>
                      <Link 
                        to="/forgot?from=profile" 
                        className="flex items-center text-gray-600 hover:text-primary transition-colors"
                      >
                        <FaLock className="mr-2" />
                        Change Password
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default SellerAccount;