import { useState, useEffect } from "react";
import { FaLock, FaArrowLeft, FaCreditCard, FaCheckCircle, FaSpinner, FaPlus, FaMapMarkerAlt, FaPhone, FaCheck } from "react-icons/fa";
import styles from "./Checkout.module.css";
import axiosInstance from "../../axiosInstance";
import { useNavigate } from "react-router-dom";
import AddressForm from "../../components/AddressForm/AddressForm";

const Checkout = () => {
  const navigate = useNavigate();
  const [shippingDifferent, setShippingDifferent] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addresses, setAddresses] = useState([]);
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    zipCode: "",
    phoneNumber: "",
    // Shipping fields (if different)
    shippingFirstName: "",
    shippingLastName: "",
    shippingAddress1: "",
    shippingAddress2: "",
    shippingCity: "",
    shippingState: "",
    shippingZipCode: "",
    shippingPhoneNumber: "",
  });
  
  // Fetch cart items when component mounts
  useEffect(() => {
    const fetchCartItems = async () => {
      try {
        // First check if user is logged in
        const checkResponse = await axiosInstance.get('/api/cart/checkout-allowed');
        
        // If not authenticated, redirect to login
        if (!checkResponse.data.success || !checkResponse.data.allowed) {
          // Store a flag to redirect back to checkout after login
          localStorage.setItem('redirectToCheckout', 'true');
          navigate('/login');
          return;
        }
        
        setLoading(true);
        const response = await axiosInstance.get('/api/cart');
        if (response.data.success) {
          setCartItems(response.data.items);
        } else {
          setError("Could not fetch cart items");
        }
      } catch (err) {
        console.error('Error fetching cart:', err);
        if (err.response && err.response.status === 401) {
          // Store a flag to redirect back to checkout after login
          localStorage.setItem('redirectToCheckout', 'true');
          navigate('/login');
        } else {
          setError("Error loading your cart. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchCartItems();
  }, [navigate]);
  
  // Fetch user's addresses
  useEffect(() => {
    const fetchAddresses = async () => {
      try {
        const response = await axiosInstance.get('/api/auth/addresses');
        if (response.data.success) {
          setAddresses(response.data.addresses);
          // Select default address if exists
          const defaultAddress = response.data.addresses.find(addr => addr.isDefault);
          setSelectedAddress(defaultAddress || response.data.addresses[0]);
        }
      } catch (err) {
        console.error('Error fetching addresses:', err);
      }
    };

    fetchAddresses();
  }, []);
  
  // Calculate order totals
  const subtotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  const shipping = subtotal > 0 ? 99 : 0; // Fixed shipping at ₹99
  const tax = Math.round(subtotal * 0.18 * 100) / 100; // 18% GST
  const discount = subtotal > 5000 ? 500 : 0;
  const total = subtotal + shipping + tax - discount;
  
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  // Handle back to cart
  const backToCart = () => {
    navigate('/cart');
  };
  
  // Validate form
  const validateForm = () => {
    const requiredFields = ['firstName', 'lastName', 'email', 'address1', 'city', 'state', 'zipCode', 'phoneNumber'];
    
    if (shippingDifferent) {
      requiredFields.push('shippingFirstName', 'shippingLastName', 'shippingAddress1', 'shippingCity', 'shippingState', 'shippingZipCode', 'shippingPhoneNumber');
    }
    
    for (const field of requiredFields) {
      if (!formData[field]) {
        setError(`Please fill in all required fields`);
        return false;
      }
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address");
      return false;
    }
    
    // Validate phone number
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(formData.phoneNumber.replace(/\D/g, ''))) {
      setError("Please enter a valid 10-digit phone number");
      return false;
    }
    
    return true;
  };

  const handleProceedToPayment = async () => {
    try {
      if (!selectedAddress) {
        setError('Please select a delivery address');
        return;
      }

      setLoading(true);
      setError(null);

      // Format the shipping address
      const formattedAddress = {
        street: selectedAddress.street,
        city: selectedAddress.city,
        state: selectedAddress.state,
        zipCode: selectedAddress.zipCode,
        country: selectedAddress.country,
        phoneNumber: selectedAddress.phoneNumber,
        label: selectedAddress.label
      };

      // Calculate order details with discount
      const orderDetails = {
        items: cartItems.map(item => ({
          productId: item.productId || item._id,
          quantity: item.quantity,
          price: item.price
        })),
        shippingAddress: formattedAddress,
        subtotal: subtotal,
        shipping: shipping,
        tax: tax,
        discount: discount,  // Include discount in order details
        totalAmount: total   // Use the total that includes discount
      };

      console.log('Sending order details:', orderDetails); // Debug log

      // Create order on backend
      const { data } = await axiosInstance.post('/api/orders/create', orderDetails);
      
      if (!data.success || !data.razorpayOrder) {
        throw new Error(data.message || 'Failed to create order');
      }

      // Ensure Razorpay amount matches our calculated total (in paise)
      const razorpayAmount = Math.round(total * 100); // Convert to paise
      if (data.razorpayOrder.amount !== razorpayAmount) {
        console.warn('Amount mismatch:', {
          expected: razorpayAmount,
          received: data.razorpayOrder.amount
        });
      }

      // Configure Razorpay payment options
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: razorpayAmount, // Use our calculated total instead of server amount
        currency: data.razorpayOrder.currency,
        name: 'Handcraft',
        description: `Payment for order (Includes ₹${discount} discount)`,
        order_id: data.razorpayOrder.id,
        handler: async function (response) {
          try {
            setLoading(true);
            // Verify payment
            const verificationResponse = await axiosInstance.post('/api/orders/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              amount: razorpayAmount // Include the amount for verification
            });

            if (verificationResponse.data.success) {
              // Clear cart and show success message
              clearCart();
              setPaymentSuccess(true);
              navigate('/orders');
            } else {
              setError('Payment verification failed. Please contact support.');
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            setError(error.response?.data?.message || 'Payment verification failed');
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: `${selectedAddress.label}`,
          contact: selectedAddress.phoneNumber,
        },
        theme: {
          color: '#3399cc'
        }
      };

      // Initialize Razorpay
      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Payment error:', error);
      setError(error.response?.data?.message || 'Failed to process payment');
    } finally {
      setLoading(false);
    }
  };
  
  // Clear cart after successful order
  const clearCart = async () => {
    try {
      await axiosInstance.delete('/api/cart');
      // Notify cart update
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (err) {
      console.error('Error clearing cart:', err);
    }
  };

  // Display success message and redirect
  useEffect(() => {
    if (paymentSuccess) {
      const timer = setTimeout(() => {
        navigate('/');
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [paymentSuccess, navigate]);

  // Handle address selection
  const handleAddressSelect = (address) => {
    setSelectedAddress(address);
    setShowAddressForm(false);
  };

  // Handle address update
  const handleAddressUpdate = (newAddresses) => {
    setAddresses(newAddresses);
    // Select the most recently added address
    const newAddress = newAddresses[newAddresses.length - 1];
    setSelectedAddress(newAddress);
    setShowAddressForm(false);
  };

  if (paymentSuccess) {
    return (
      <div className={styles.successContainer}>
        <div className={styles.successBox}>
          <FaCheckCircle className={styles.successIcon} />
          <h2>Order Placed Successfully!</h2>
          <p>Thank you for your purchase. Your order has been placed successfully.</p>
          <p>You will be redirected to the home page in a few seconds...</p>
          <button 
            onClick={() => navigate('/')}
            className={styles.continueBtn}
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {loading ? (
        <div className={styles.loadingContainer}>
          <FaSpinner className={styles.spinner} />
          <p>Loading your order details...</p>
        </div>
      ) : error ? (
        <div className={styles.errorContainer}>
          <p className={styles.errorMessage}>{error}</p>
          <button 
            onClick={backToCart}
            className={styles.backButton}
          >
            Back to Cart
          </button>
        </div>
      ) : cartItems.length === 0 ? (
        <div className={styles.emptyCartContainer}>
          <h2>Your cart is empty</h2>
          <p>Please add items to your cart before proceeding to checkout.</p>
          <button 
            onClick={() => navigate('/products/art')}
            className={styles.continueBtn}
          >
            Continue Shopping
          </button>
        </div>
      ) : (
        <div className={styles.checkoutBox}>
          <div className={styles.header}>
            <button 
              onClick={backToCart}
              className={styles.backBtn}
            >
              <FaArrowLeft /> Back to Cart
            </button>
            <h2 className={styles.title}>Secure Checkout</h2>
          </div>
          
          <div className={styles.checkoutGrid}>
            {/* Shipping Section */}
            <div className={styles.formSection}>
              <div className={styles.section}>
                <h3>Shipping Address</h3>
                
                {!showAddressForm ? (
                  <div className="space-y-4">
                    {/* Address Selection */}
                    {addresses.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {addresses.map((address) => (
                          <div 
                            key={address._id}
                            onClick={() => handleAddressSelect(address)}
                            className={`relative p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                              selectedAddress?._id === address._id 
                                ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary/20' 
                                : 'border-gray-200 hover:border-primary/50 hover:shadow-sm'
                            }`}
                          >
                            {/* Selected Address Indicator */}
                            {selectedAddress?._id === address._id && (
                              <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center shadow-sm">
                                <FaCheck size={12} />
                              </div>
                            )}
                            
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                                  selectedAddress?._id === address._id 
                                    ? 'bg-primary/10 text-primary' 
                                    : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {address.label}
                                </span>
                                {address.isDefault && (
                                  <span className="text-sm text-primary bg-primary/5 px-2 py-1 rounded-full">
                                    Default
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="space-y-2 mt-3">
                              <p className="flex items-center gap-2 text-gray-700">
                                <FaMapMarkerAlt className={`${
                                  selectedAddress?._id === address._id ? 'text-primary' : 'text-gray-400'
                                }`} />
                                <span className="font-medium">{address.street}</span>
                              </p>
                              <p className="ml-6 text-gray-600">
                                {address.city}, {address.state} {address.zipCode}
                              </p>
                              <p className="ml-6 text-gray-600">{address.country}</p>
                              <p className="flex items-center gap-2 text-gray-700 mt-2">
                                <FaPhone className={`${
                                  selectedAddress?._id === address._id ? 'text-primary' : 'text-gray-400'
                                }`} />
                                <span>{address.phoneNumber}</span>
                              </p>
                            </div>

                            {/* Selected for Delivery Badge */}
                            {selectedAddress?._id === address._id && (
                              <div className="mt-3 pt-3 border-t border-primary/20">
                                <p className="text-primary text-sm flex items-center gap-2">
                                  <FaCheckCircle />
                                  Selected for Delivery
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 px-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                        <FaMapMarkerAlt className="mx-auto text-gray-400 text-3xl mb-3" />
                        <p className="text-gray-600 font-medium mb-1">No addresses saved yet.</p>
                        <p className="text-sm text-gray-500 mb-4">Please add a new address to continue.</p>
                        <button
                          onClick={() => setShowAddressForm(true)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                        >
                          <FaPlus /> Add New Address
                        </button>
                      </div>
                    )}
                    
                    {/* Add New Address Button - Only show if addresses exist */}
                    {addresses.length > 0 && (
                      <button
                        onClick={() => setShowAddressForm(true)}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white border-2 border-dashed border-gray-300 rounded-lg text-primary hover:border-primary hover:bg-primary/5 transition-all duration-200"
                      >
                        <FaPlus /> Add New Address
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="bg-white rounded-lg p-4">
                    <AddressForm
                      addresses={addresses}
                      onAddressUpdate={handleAddressUpdate}
                      showCancel={true}
                    />
                  </div>
                )}
              </div>
            </div>
            
            {/* Order Summary Section */}
            <div className={styles.orderSection}>
              <div className={styles.summarySection}>
                <h3>Order Summary</h3>
                
                <div className={styles.productList}>
                  {cartItems.map((item) => (
                    <div key={item.productId} className={styles.productItem}>
                      <div className={styles.productImage}>
                        <img src={item.image} alt={item.name} />
                      </div>
                      <div className={styles.productInfo}>
                        <h4>{item.name}</h4>
                        <div className={styles.productMeta}>
                          <span className={styles.productCategory}>
                            {item.category && item.subcategory && 
                              `${item.category.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} - 
                              ${item.subcategory.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}`
                            }
                          </span>
                        </div>
                        <div className={styles.productPrice}>
                          <span>₹{item.price.toFixed(2)} × {item.quantity}</span>
                          <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className={styles.orderSummary}>
                  <div className={styles.summaryRow}>
                    <span>Subtotal:</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>Shipping:</span>
                    <span>₹{shipping.toFixed(2)}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>GST (18%):</span>
                    <span>₹{tax.toFixed(2)}</span>
                  </div>
                  {discount > 0 && (
                    <div className={styles.summaryRow}>
                      <span className={styles.discount}>Discount:</span>
                      <span className={styles.discount}>-₹{discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className={`${styles.summaryRow} ${styles.total}`}>
                    <span>Total:</span>
                    <span>₹{total.toFixed(2)}</span>
                  </div>
                </div>
                
                <button 
                  className={styles.proceedBtn}
                  onClick={handleProceedToPayment}
                  disabled={processing || !selectedAddress}
                >
                  {processing ? (
                    <>
                      <FaSpinner className={styles.spinnerIcon} /> Processing...
                    </>
                  ) : (
                    <>
                      <FaCreditCard className={styles.cardIcon} /> Pay ₹{total.toFixed(2)}
                    </>
                  )}
                </button>
                
                {!selectedAddress && (
                  <p className="text-red-500 text-sm text-center mt-2">
                    Please select or add a shipping address to continue
                  </p>
                )}
                
                <div className={styles.securePayment}>
                  <FaLock className={styles.lockIcon} />
                  <span>Secure payment - Your data is protected</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;
