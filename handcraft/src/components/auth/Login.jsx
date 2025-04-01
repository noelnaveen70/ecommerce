const handleLogin = async (e) => {
  e.preventDefault();
  // ... existing validation code ...
  
  try {
    // ... existing login API call code ...
    
    if (response.data.success) {
      // ... existing token saving code ...
      
      // Check if we need to sync guest cart with user cart
      const guestCart = JSON.parse(localStorage.getItem('guestCartItems') || '[]');
      if (guestCart.length > 0) {
        try {
          // Sync guest cart to user cart
          await axiosInstance.post('/api/cart/sync', {
            guestCartItems: guestCart
          });
          
          // Clear guest cart after successful sync
          localStorage.removeItem('guestCartItems');
        } catch (syncError) {
          console.error('Error syncing guest cart:', syncError);
          // Continue with login process even if sync fails
        }
      }
      
      // Check if we need to redirect to checkout
      const redirectToCheckout = localStorage.getItem('redirectToCheckout');
      if (redirectToCheckout === 'true') {
        localStorage.removeItem('redirectToCheckout');
        navigate('/checkout');
      } else {
        navigate('/');
      }
      
      // Notify components that login state changed
      window.dispatchEvent(new Event('loginStateChanged'));
    } else {
      // ... existing error handling code ...
    }
  } catch (err) {
    // ... existing error handling code ...
  }
}; 