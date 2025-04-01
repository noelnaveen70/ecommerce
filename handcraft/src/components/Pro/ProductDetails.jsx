import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ShoppingCart, 
  Heart, 
  Share2, 
  Star, 
  ArrowLeft, 
  Plus, 
  Minus, 
  Check,
  Info,
  Truck,
  RefreshCw,
  Shield,
  MessageCircle
} from "lucide-react";
import Footer from "../Footer/Footer";
import { productService } from "../../services/api";
import axiosInstance from "../../axiosInstance";
import { getAuthToken } from "../../utils/auth";

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // State variables
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [inWishlist, setInWishlist] = useState(false);
  const [inCart, setInCart] = useState(false);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [notification, setNotification] = useState({ show: false, message: "", type: "" });
  const [addingToCart, setAddingToCart] = useState(false);
  const [contactingSellerLoading, setContactingSellerLoading] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [userRole, setUserRole] = useState('');
  
  // Image gallery (will use product.image as primary and these as additional)
  const [images, setImages] = useState([]);
  
  // Fetch product data
  useEffect(() => {
    // Get user role from localStorage
    const role = localStorage.getItem('userRole');
    setUserRole(role || '');
    
    const fetchProductDetails = async () => {
      try {
        setLoading(true);
        const response = await productService.getProductById(id);
        
        if (response.data.success) {
          setProduct(response.data.product);
          
          // Set up image gallery with main image and additional images
          // In a real app, you'd have multiple images from the backend
          const productImage = response.data.product.image;
          setImages([
            productImage,
            // Simulate additional product images for the gallery
            // In a real app, these would come from the backend
            productImage, 
            productImage
          ]);
          
          // Fetch related products by same category
          fetchRelatedProducts(response.data.product.category);
        } else {
          setError('Failed to fetch product details');
        }
      } catch (err) {
        console.error('Error fetching product details:', err);
        setError('Error fetching product details. Please try again later.');
        
        // For development/demo: Use mock data if API fails
        fetchMockProductData();
      } finally {
        setLoading(false);
      }
    };
    
    fetchProductDetails();
  }, [id]);
  
  // Fetch related products
  const fetchRelatedProducts = async (category) => {
    try {
      const response = await productService.getProductsByCategory(category, { limit: 4 });
      
      if (response.data.success) {
        // Filter out the current product
        const related = response.data.products.filter(p => p._id !== id);
        setRelatedProducts(related.slice(0, 4)); // Limit to 4 related products
      }
    } catch (err) {
      console.error('Error fetching related products:', err);
      // Silently fail - related products are not critical
    }
  };
  
  // For development/demo: Use mock data if API fails
  const fetchMockProductData = () => {
    // Mock product with all fields that would be expected from API
    const mockProduct = {
      _id: id,
      name: "Handcrafted Wooden Sculpture",
      price: 129.99,
      description: "Beautifully hand-carved wooden sculpture made by skilled artisans using traditional techniques. Each piece is unique and showcases the natural beauty of the wood.",
      image: "https://5.imimg.com/data5/SELLER/Default/2021/8/UT/BZ/OD/11746368/wooden-chess-set.jpg",
      category: "wooden",
      tag: "Bestseller",
      stock: 15,
      seller: { _id: "seller123", name: "Artisan Crafts" },
      ratings: [
        { 
          user: { _id: "user1", name: "Sarah Johnson" },
          rating: 5,
          review: "Absolutely beautiful craftsmanship! The attention to detail is amazing.",
          date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) // 15 days ago
        },
        {
          user: { _id: "user2", name: "Michael Chen" },
          rating: 4,
          review: "Great quality and beautiful design. Shipping was fast too.",
          date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
        }
      ],
      averageRating: 4.5,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
    };
    
    setProduct(mockProduct);
    
    // Set mock images
    setImages([mockProduct.image, mockProduct.image, mockProduct.image]);
    
    // Set mock related products
    setRelatedProducts([
      {
        _id: "rel1",
        name: "Wooden Wall Hanging",
        price: 65.0,
        image: "https://5.imimg.com/data5/SELLER/Default/2022/2/YZ/DP/WC/148971249/wooden-wall-hanging.jpg",
        tag: "Bestseller",
        averageRating: 4.2
      },
      {
        _id: "rel2",
        name: "Wooden Coaster Set",
        price: 25.0,
        image: "https://m.media-amazon.com/images/I/71JKkwKFbIL._AC_UF1000,1000_QL80_.jpg",
        tag: "Trending",
        averageRating: 4.0
      },
      {
        _id: "rel3",
        name: "Wooden Chess Set",
        price: 120.0,
        image: "https://5.imimg.com/data5/SELLER/Default/2021/8/UT/BZ/OD/11746368/wooden-chess-set.jpg",
        tag: "Limited",
        averageRating: 4.8
      }
    ]);
  };
  
  // Handle quantity change
  const handleQuantityChange = (newQuantity) => {
    // Ensure quantity is within valid range
    if (newQuantity > 0 && newQuantity <= (product?.stock || 10)) {
      setQuantity(newQuantity);
    }
  };
  
  // Toggle wishlist status
  const toggleWishlist = () => {
    // In a real app, this would call an API to add/remove from wishlist
    setInWishlist(!inWishlist);
    showNotification(
      !inWishlist 
        ? "Product added to wishlist" 
        : "Product removed from wishlist", 
      "success"
    );
  };
  
  // After successfully adding to cart, update the cart count
  const notifyCartUpdated = () => {
    window.dispatchEvent(new Event('cartUpdated'));
  };
  
  // Add to cart
  const addToCart = async () => {
    try {
      // Check if user is a seller or admin
      const userRole = localStorage.getItem('userRole');
      if (userRole === 'seller' || userRole === 'admin') {
        showNotification(userRole === 'seller' ? 
          "Sellers cannot add items to cart" : 
          "Admins cannot add items to cart", "error");
        return;
      }

      // Show loading state
      setInCart(true);
      setAddingToCart(true);
      setError(null);
      
      // Add the product to the cart
      const response = await axiosInstance.post('/api/cart/add', {
        productId: product._id,
        quantity: parseInt(quantity)
      });
      
      if (response.data.success) {
        // If guest cart, save item to localStorage
        if (response.data.isGuest) {
          try {
            // Get current guest cart
            const guestCart = JSON.parse(localStorage.getItem('guestCartItems') || '[]');
            
            // Check if product already exists in cart
            const existingItemIndex = guestCart.findIndex(item => item.productId === product._id);
            
            if (existingItemIndex >= 0) {
              // Update quantity if already in cart
              guestCart[existingItemIndex].quantity += parseInt(quantity);
            } else {
              // Add new item
              guestCart.push({
                productId: product._id,
                name: product.name,
                price: product.price,
                quantity: parseInt(quantity),
                image: product.image,
                category: product.category,
                subcategory: product.subcategory,
                stock: product.stock // Include stock information
              });
            }
            
            // Save updated cart
            localStorage.setItem('guestCartItems', JSON.stringify(guestCart));
          } catch (localStorageErr) {
            console.error('Error saving to localStorage:', localStorageErr);
          }
        }
        
        // Notify navbar and other components about cart update
        notifyCartUpdated();
        
        // Show success notification
        showNotification("Added to cart successfully", "success");
      } else {
        setError('Failed to add to cart');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      
      // Handle stock validation error
      if (error.response?.data?.message?.includes('Only')) {
        setError(error.response.data.message);
        // Update quantity input to max available stock
        setQuantity(error.response.data.availableStock);
        return;
      }
      
      // Handle different error scenarios
      if (error.message && error.message.includes('Network Error')) {
        // Store in localStorage for offline support
        try {
          const guestCart = JSON.parse(localStorage.getItem('guestCartItems') || '[]');
          
          // Check if product already exists in cart
          const existingItemIndex = guestCart.findIndex(item => item.productId === product._id);
          
          if (existingItemIndex >= 0) {
            // Update quantity if already in cart
            guestCart[existingItemIndex].quantity += parseInt(quantity);
          } else {
            // Add new item
            guestCart.push({
              productId: product._id,
              name: product.name,
              price: product.price,
              quantity: parseInt(quantity),
              image: product.image,
              category: product.category,
              subcategory: product.subcategory,
              stock: product.stock // Include stock information
            });
          }
          
          // Save updated cart
          localStorage.setItem('guestCartItems', JSON.stringify(guestCart));
          
          // Notify other components
          notifyCartUpdated();
          
          showNotification("Added to offline cart. Will sync when you're back online.", "success");
        } catch (localStorageErr) {
          console.error('Error saving to localStorage:', localStorageErr);
          showNotification("Couldn't save to cart. Please try again.", "error");
        }
      } else {
        setError('Only Users Can Access.');
      }
    } finally {
      setAddingToCart(false);
    }
  };
  
  // Submit a review
  const submitReview = async (e) => {
    e.preventDefault();
    
    // Check if user is admin or seller
    if (userRole === 'admin' || userRole === 'seller') {
      showNotification(
        userRole === 'admin' 
          ? "Admin accounts cannot submit reviews" 
          : "Seller accounts cannot submit reviews", 
        "error"
      );
      return;
    }
    
    // Check if user is logged in
    const token = getAuthToken();
    if (!token) {
      showNotification("Please login to submit a review", "error");
      // Save review data to session storage so we can use it after login
      sessionStorage.setItem('pendingReview', JSON.stringify({
        productId: id,
        rating,
        review
      }));
      // Redirect to login page with return URL
      setTimeout(() => {
        navigate(`/login?redirect=product/${id}`);
      }, 1500);
      return;
    }
    
    // Validate rating
    if (rating === 0) {
      showNotification("Please select a rating", "error");
      return;
    }
    
    try {
      setSubmittingReview(true);
      
      const response = await productService.addProductRating(id, { 
        rating, 
        review: review.trim() 
      });
      
      if (response.data.success) {
        // Update the product with new rating/review
        setProduct(response.data.product);
        showNotification("Thank you for your review!", "success");
        
        // Reset form
        setRating(0);
        setReview("");
        setShowReviewForm(false);
        
        // Dispatch event to update product ratings elsewhere if needed
        window.dispatchEvent(new CustomEvent('productReviewAdded', {
          detail: { productId: id }
        }));
      } else {
        showNotification(response.data.message || "Failed to submit review", "error");
      }
    } catch (err) {
      console.error('Error submitting review:', err);
      
      const errorMessage = err.response?.data?.message || "Error submitting review. Please try again.";
      showNotification(errorMessage, "error");
      
      // Check for specific error cases
      if (err.response?.status === 400 && err.response?.data?.message?.includes('already reviewed')) {
        showNotification("You have already reviewed this product", "error");
      } else if (err.response?.status === 403) {
        showNotification("You need to purchase this product before reviewing", "error");
      }
    } finally {
      setSubmittingReview(false);
    }
  };
  
  // Display notification
  const showNotification = (message, type) => {
    setNotification({ show: true, message, type });
    
    // Hide notification after 3 seconds
    setTimeout(() => {
      setNotification({ show: false, message: "", type: "" });
    }, 3000);
  };
  
  // Handle back navigation
  const handleBack = () => {
    navigate(-1);
  };
  
  // Navigate to a related product
  const goToRelatedProduct = (productId) => {
    navigate(`/product/${productId}`);
    // Scroll to top
    window.scrollTo(0, 0);
  };
  
  // Share product
  const shareProduct = () => {
    // In a real app, this would open native share dialog or copy link
    if (navigator.share) {
      navigator.share({
        title: product?.name,
        text: product?.description,
        url: window.location.href,
      });
    } else {
      // Fallback - copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      showNotification("Link copied to clipboard", "success");
    }
  };
  
  // Contact seller
  const handleContactSeller = async () => {
    // Check if user is admin
    if (userRole === 'admin') {
      showNotification("Admin accounts cannot contact sellers", "error");
      return;
    }
    
    // Check if user is logged in
    try {
      setContactingSellerLoading(true);
      
      // Create a new chat or get existing one
      const response = await axiosInstance.post("/api/chat", {
        productId: id
      });

      if (response.data.success) {
        // Navigate to messages page with the chat ID
        navigate(`/messages?chatId=${response.data.chatId}`);
        showNotification("Chat created with seller", "success");
      } else {
        showNotification("Failed to start chat with seller", "error");
      }
    } catch (err) {
      console.error("Error contacting seller:", err);
      
      if (err.response && err.response.status === 401) {
        // User needs to login
        showNotification("Please login to contact the seller", "error");
        // Redirect to login with return URL
        setTimeout(() => {
          navigate(`/login?redirect=product/${id}`);
        }, 1500);
      } else {
        showNotification(err.response?.data?.message || "Error contacting seller", "error");
      }
    } finally {
      setContactingSellerLoading(false);
    }
  };
  
  // Render star rating component
  const renderStarRating = (rating) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={18}
            className={`${
              star <= rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };
  
  // Format date
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  // Check for pending review after login redirect
  useEffect(() => {
    const pendingReview = sessionStorage.getItem('pendingReview');
    if (pendingReview) {
      try {
        const reviewData = JSON.parse(pendingReview);
        if (reviewData.productId === id) {
          setRating(reviewData.rating);
          setReview(reviewData.review);
          setShowReviewForm(true);
          // Clear the pending review
          sessionStorage.removeItem('pendingReview');
        }
      } catch (err) {
        console.error('Error processing pending review:', err);
        sessionStorage.removeItem('pendingReview');
      }
    }
  }, [id]);
  
  if (loading) {
    return (
      <div className="flex bg-gray-50 justify-center items-center min-h-screen">
        <div className="border-b-4 border-black border-t-4 h-16 rounded-full w-16 animate-spin"></div>
      </div>
    );
  }
  
  if (error || !product) {
    return (
      <div className="flex flex-col bg-gray-50 justify-center p-6 items-center min-h-screen">
        <Info size={48} className="text-red-500 mb-4" />
        <h1 className="text-2xl text-gray-800 font-bold mb-2">Product Not Found</h1>
        <p className="text-gray-600 mb-6">{error || "We couldn't find the product you're looking for."}</p>
        <button 
          onClick={handleBack}
          className="flex bg-black rounded-lg text-white hover:bg-gray-800 items-center px-6 py-2 transition"
        >
          <ArrowLeft size={18} className="mr-2" />
          Go Back
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Notification */}
      {notification.show && (
        <div className={`fixed top-6 right-6 z-50 px-6 py-3 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white flex items-center`}>
          {notification.type === 'success' ? <Check size={18} className="mr-2" /> : <Info size={18} className="mr-2" />}
          <p>{notification.message}</p>
        </div>
      )}
      
      <div className="bg-gray-50 min-h-screen">
        {/* Breadcrumb */}
        <div className="container mx-auto px-4 py-6">
          <div className="flex text-gray-600 text-sm items-center mb-6">
            <button 
              onClick={handleBack} 
              className="flex hover:text-black items-center mr-4 transition"
            >
              <ArrowLeft size={16} className="mr-1" />
              Back
            </button>
            <a href="/" className="hover:text-black transition">Home</a>
            <span className="mx-2">/</span>
            <a href="/products" className="hover:text-black transition">Products</a>
            <span className="mx-2">/</span>
            <a 
              href={`/products/${product.category}`} 
              className="hover:text-black transition"
            >
              {product.category.charAt(0).toUpperCase() + product.category.slice(1)}
            </a>
            <span className="mx-2">/</span>
            <span className="text-gray-800 font-medium">{product.name}</span>
          </div>
          
          {/* Product details section */}
          <div className="flex flex-col bg-white rounded-xl shadow-sm lg:flex-row overflow-hidden">
            {/* Product images */}
            <div className="p-6 lg:w-1/2">
              <div className="flex bg-gray-100 h-[400px] justify-center rounded-lg items-center overflow-hidden relative">
                {product.tag && (
                  <span className="bg-black rounded-full text-white text-xs absolute left-4 px-3 py-1 top-4 z-10">
                    {product.tag}
                  </span>
                )}
                <img 
                  src={images[selectedImage]} 
                  alt={product.name}
                  className="max-h-[350px] max-w-full object-contain"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://via.placeholder.com/400x400?text=Image+Not+Available';
                  }}
                />
              </div>
              
              {/* Image thumbnails */}
              <div className="flex justify-center mt-4 space-x-2">
                {images.map((img, index) => (
                  <div
                    key={index}
                    className={`w-20 h-20 rounded-md overflow-hidden cursor-pointer border-2 ${
                      selectedImage === index ? 'border-black' : 'border-transparent'
                    }`}
                    onClick={() => setSelectedImage(index)}
                  >
                    <img 
                      src={img} 
                      alt={`Thumbnail ${index + 1}`} 
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
            
            {/* Product info */}
            <div className="flex flex-col p-8 lg:w-1/2">
              <div className="mb-auto">
                <h1 className="text-3xl text-gray-900 font-bold mb-2">{product.name}</h1>
                
                {/* Rating summary */}
                <div className="flex items-center mb-4">
                  {renderStarRating(product.averageRating)}
                  <span className="text-gray-600 ml-2">
                    {product.averageRating.toFixed(1)} ({product.ratings.length} reviews)
                  </span>
                </div>
                
                {/* Price */}
                <p className="text-3xl text-gray-900 font-bold mb-6">₹{parseFloat(product.price).toFixed(2)}</p>
                
                {/* Description */}
                <div className="mb-6">
                  <h2 className="text-lg font-semibold mb-2">Description</h2>
                  <p className="text-gray-600">{product.description}</p>
                </div>
                
                {/* Stock status */}
                <div className="mb-6">
                  <span className={`${
                    product.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  } px-3 py-1 rounded-full text-sm font-medium`}>
                    {product.stock > 0 ? `In Stock (${product.stock} available)` : 'Out of Stock'}
                  </span>
                </div>
                
                {/* Seller info */}
                <div className="mb-6">
                  <h2 className="text-lg font-semibold mb-2">Seller</h2>
                  <p className="text-gray-600">{product.seller.name}</p>
                </div>
              </div>
              
              {/* Quantity selector */}
              <div className="flex items-center mb-6">
                <span className="text-gray-700 mr-4">Quantity:</span>
                <div className="flex border rounded-lg">
                  <button 
                    className="border-r hover:bg-gray-100 px-3 py-1"
                    onClick={() => handleQuantityChange(quantity - 1)}
                    disabled={quantity <= 1}
                  >
                    <Minus size={16} />
                  </button>
                  <span className="flex justify-center items-center min-w-[40px] px-4 py-1">
                    {quantity}
                  </span>
                  <button 
                    className="border-l hover:bg-gray-100 px-3 py-1"
                    onClick={() => handleQuantityChange(quantity + 1)}
                    disabled={quantity >= product.stock}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
              
              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row sm:space-x-3 sm:space-y-0 space-y-3">
                {userRole !== 'admin' && userRole !== 'seller' ? (
                  <>
                    <button 
                      className={`flex-1 bg-black text-white py-3 px-6 rounded-lg flex items-center justify-center ${
                        inCart ? 'bg-green-600' : 'hover:bg-gray-800'
                      } transition duration-300`}
                      onClick={addToCart}
                      disabled={inCart || product.stock <= 0 || addingToCart}
                    >
                      {addingToCart ? (
                        <>
                          <div className="border-2 border-t-transparent border-white h-5 rounded-full w-5 animate-spin mr-2"></div>
                          Adding...
                        </>
                      ) : inCart ? (
                        <>
                          <Check size={20} className="mr-2" />
                          Added to Cart
                        </>
                      ) : (
                        <>
                          <ShoppingCart size={20} className="mr-2" />
                          Add to Cart
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <div className="flex-1 bg-gray-100 text-gray-600 py-3 px-6 rounded-lg flex items-center justify-center">
                    <Info size={20} className="mr-2" />
                    {userRole === 'admin' ? 'Admin accounts cannot purchase products' : 'Seller accounts cannot purchase products'}
                  </div>
                )}
                
                <button 
                  className="flex flex-1 bg-green-600 justify-center rounded-lg text-white duration-300 hover:bg-green-700 items-center px-6 py-3 transition"
                  onClick={handleContactSeller}
                  disabled={contactingSellerLoading || userRole === 'admin'}
                >
                  {contactingSellerLoading ? (
                    <>
                      <div className="border-2 border-t-transparent border-white h-5 rounded-full w-5 animate-spin mr-2"></div>
                      Connecting...
                    </>
                  ) : userRole === 'admin' ? (
                    <>
                      <MessageCircle size={20} className="mr-2" />
                      Admin Cannot Contact
                    </>
                  ) : (
                    <>
                      <MessageCircle size={20} className="mr-2" />
                      Contact Seller
                    </>
                  )}
                </button>
                
                <button 
                  className={`flex-none py-3 px-4 rounded-lg border ${
                    inWishlist 
                      ? 'bg-pink-50 border-pink-300 text-pink-500' 
                      : 'border-gray-300 hover:bg-gray-50'
                  } transition duration-300`}
                  onClick={toggleWishlist}
                >
                  <Heart 
                    size={20} 
                    className={inWishlist ? 'fill-pink-500 text-pink-500' : ''} 
                  />
                </button>
                
                <button 
                  className="flex-none border border-gray-300 rounded-lg duration-300 hover:bg-gray-50 px-4 py-3 transition"
                  onClick={shareProduct}
                >
                  <Share2 size={20} />
                </button>
              </div>
            </div>
          </div>
          
          {/* Additional information */}
          <div className="bg-white p-6 rounded-xl shadow-sm mt-8">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="flex items-start">
                <Truck className="flex-shrink-0 text-gray-700 mr-3" />
                <div>
                  <h3 className="text-gray-900 font-bold">Free Shipping</h3>
                  <p className="text-gray-600 text-sm">On orders over $100</p>
                </div>
              </div>
              <div className="flex items-start">
                <RefreshCw className="flex-shrink-0 text-gray-700 mr-3" />
                <div>
                  <h3 className="text-gray-900 font-bold">Easy Returns</h3>
                  <p className="text-gray-600 text-sm">30 day return policy</p>
                </div>
              </div>
              <div className="flex items-start">
                <Shield className="flex-shrink-0 text-gray-700 mr-3" />
                <div>
                  <h3 className="text-gray-900 font-bold">Secure Checkout</h3>
                  <p className="text-gray-600 text-sm">SSL encrypted payment</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Reviews section */}
          <div className="bg-white p-6 rounded-xl shadow-sm mt-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Customer Reviews</h2>
              {userRole !== 'admin' && userRole !== 'seller' ? (
                <button 
                  className="bg-black rounded-lg text-white hover:bg-gray-800 px-4 py-2 transition"
                  onClick={() => setShowReviewForm(!showReviewForm)}
                >
                  Write a Review
                </button>
              ) : (
                <div className="text-gray-500 italic text-sm">
                  {userRole === 'admin' ? 'Admin accounts' : 'Seller accounts'} cannot write reviews
                </div>
              )}
            </div>
            
            {/* Review form */}
            {showReviewForm && userRole !== 'admin' && userRole !== 'seller' && (
              <div className="bg-gray-50 p-6 rounded-lg mb-8">
                <h3 className="text-lg font-semibold mb-4">Share Your Experience</h3>
                <form onSubmit={submitReview}>
                  <div className="mb-4">
                    <label className="text-gray-700 block mb-2">Rating <span className="text-red-500">*</span></label>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={24}
                          className={`cursor-pointer mr-1 ${
                            star <= rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"
                          }`}
                          onClick={() => setRating(star)}
                        />
                      ))}
                    </div>
                    {rating === 0 && (
                      <p className="text-red-500 text-sm mt-1">Please select a rating</p>
                    )}
                  </div>
                  <div className="mb-4">
                    <label className="text-gray-700 block mb-2">Review</label>
                    <textarea
                      className="border p-3 rounded-lg text-gray-700 w-full focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      rows={4}
                      value={review}
                      onChange={(e) => setReview(e.target.value)}
                      placeholder="Share your thoughts about this product..."
                    />
                  </div>
                  <div className="text-gray-500 text-sm italic mb-4">
                    <div className="flex items-start">
                      <Info size={14} className="flex-shrink-0 mr-1 mt-0.5" />
                      <span>Your review will be visible to other customers and will help them make better purchasing decisions.</span>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button 
                      type="button"
                      className="border border-gray-300 rounded-lg hover:bg-gray-50 mr-3 px-4 py-2"
                      onClick={() => setShowReviewForm(false)}
                      disabled={submittingReview}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className={`${
                        submittingReview 
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : 'bg-black hover:bg-gray-800'
                      } rounded-lg text-white px-6 py-2 transition flex items-center`}
                      disabled={submittingReview || rating === 0}
                    >
                      {submittingReview ? (
                        <>
                          <div className="border-2 border-t-transparent border-white h-4 rounded-full w-4 animate-spin mr-2"></div>
                          Submitting...
                        </>
                      ) : (
                        'Submit Review'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
            
            {/* Reviews list */}
            {product.ratings.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <p>No reviews yet. Be the first to review this product!</p>
              </div>
            ) : (
              <div className="space-y-6">
                {product.ratings.map((rating, index) => (
                  <div key={index} className="border-b last:border-b-0 pb-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">{rating.user.name}</p>
                        <div className="flex items-center mt-1">
                          {renderStarRating(rating.rating)}
                          <span className="text-gray-500 text-sm ml-2">
                            {formatDate(rating.date)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {rating.review && (
                      <p className="text-gray-700 mt-3">{rating.review}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Related products section */}
          {relatedProducts.length > 0 && (
            <div className="mt-12">
              <h2 className="text-2xl font-bold mb-6">You Might Also Like</h2>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-4 md:grid-cols-3 sm:grid-cols-2">
                {relatedProducts.map((relProduct) => (
                  <div 
                    key={relProduct._id} 
                    className="bg-white border rounded-xl shadow-sm cursor-pointer duration-300 hover:shadow-md transition"
                    onClick={() => goToRelatedProduct(relProduct._id)}
                  >
                    <div className="relative">
                      {relProduct.tag && (
                        <span className="bg-black rounded-full text-white text-xs absolute left-2 px-2 py-1 top-2 z-10">
                          {relProduct.tag}
                        </span>
                      )}
                      <div className="flex bg-gray-50 h-48 justify-center rounded-t-md w-full items-center overflow-hidden">
                        <img
                          src={relProduct.image}
                          alt={relProduct.name}
                          className="max-h-48 max-w-full object-contain"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://via.placeholder.com/300x200?text=Image+Not+Available';
                          }}
                        />
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="text-lg font-semibold line-clamp-1">{relProduct.name}</h3>
                      <div className="flex items-center mb-2 mt-1">
                        {renderStarRating(relProduct.averageRating || 0)}
                      </div>
                      <p className="text-black font-bold">₹{parseFloat(relProduct.price).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default ProductDetails; 