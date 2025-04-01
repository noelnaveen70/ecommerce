// Add a notification function for cart updates
const notifyCartUpdated = () => {
  window.dispatchEvent(new Event('cartUpdated'));
};

// In the handleAddToCart function after successfully adding to cart
const handleAddToCart = async () => {
  // Check if user is a seller
  const userRole = localStorage.getItem('userRole');
  if (userRole === 'seller') {
    showNotification("Sellers cannot add items to cart", "error");
    return;
  }

  setLoading(true);
  setError(null);
  
  try {
    // Make API call to add product to cart
    const response = await axiosInstance.post('/api/cart/add', {
      productId: id,
      quantity: 1
    });
    
    if (response.data.success) {
      // Notify cart count update
      notifyCartUpdated();
      
      // Set success state
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } else {
      setError('Failed to add item to cart');
    }
  } catch (err) {
    // Handle error cases...
  }
}; 