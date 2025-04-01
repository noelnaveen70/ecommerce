import React, { useState, useEffect } from "react";
import { FaStar } from "react-icons/fa6";
import { useNavigate, Link } from "react-router-dom";
import axiosInstance from "../../axiosInstance";
import { getAuthToken } from "../../utils/auth";

const Products = () => {
  const [userRole, setUserRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // Fetch featured products
        const response = await axiosInstance.get('/api/products', {
          params: {
            limit: 5,
            sort: 'rating'
          }
        });
        
        if (response.data.success) {
          setProducts(response.data.products);
        } else {
          setError('Failed to fetch products');
        }
      } catch (err) {
        console.error('Error fetching products:', err);
        setError('Error connecting to server');
      }
    };

    const checkUserRole = async () => {
      setIsLoading(true);
      const token = getAuthToken();
      
      if (token) {
        try {
          const response = await axiosInstance.get('/api/auth/profile');
          if (response.data.success) {
            const role = response.data.user.role;
            setUserRole(role);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          setUserRole(null);
        }
      } else {
        setUserRole(null);
      }
      
      // Fetch products after checking user role
      await fetchProducts();
      setIsLoading(false);
    };

    checkUserRole();

    // Listen for login state changes
    window.addEventListener('loginStateChanged', checkUserRole);
    return () => {
      window.removeEventListener('loginStateChanged', checkUserRole);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="mt-14 mb-12 py-16 flex justify-center items-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
          <div className="absolute top-0 left-0 h-16 w-16 flex justify-center items-center">
            <div className="h-8 w-8 bg-white rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  // Function to render star rating
  const renderStarRating = (rating) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <FaStar 
            key={star}
            className={`${star <= Math.round(rating || 0) ? "text-yellow-400" : "text-gray-300"} w-3 h-3`} 
          />
        ))}
      </div>
    );
  };

  return (
    <div className="mt-14 mb-12 py-8">
      <div className="container mx-auto px-4">
        {/* Header section */}
        <div className="text-center mb-12 max-w-[700px] mx-auto">
          <div className="inline-block px-3 py-1 bg-primary/10 rounded-full mb-2">
            <p data-aos="fade-up" className="text-sm text-primary font-medium">
              Handcrafted with Love
            </p>
          </div>
          <h1 data-aos="fade-up" className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            Featured Products
          </h1>
          <p data-aos="fade-up" className="text-gray-600">
            Explore unique handcrafted products, ethically made by skilled artisans. Shop authentic, eco-friendly, and timeless handmade treasures.
          </p>
        </div>
        
        {/* Display error message if any */}
        {error && (
          <div className="text-center text-red-500 mb-8 p-4 bg-red-50 rounded-lg">
            <p className="font-medium">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-2 text-sm underline text-primary"
            >
              Try again
            </button>
          </div>
        )}
        
        {/* Body section */}
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
            {/* card section */}
            {products.length > 0 ? (
              products.map((product, index) => (
                <div
                  data-aos="fade-up"
                  data-aos-delay={index * 100}
                  key={product._id}
                  className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
                  onClick={() => navigate(`/product/${product._id}`)}
                >
                  <div className="relative overflow-hidden group">
                    <div className="h-64 overflow-hidden bg-gray-100">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-110"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://via.placeholder.com/300x400?text=Image+Not+Available';
                        }}
                      />
                    </div>
                    
                    {/* Product tag */}
                    {product.tag && (
                      <span className="absolute top-3 left-3 bg-black text-white text-xs px-2 py-1 rounded-full uppercase tracking-wider font-semibold">
                        {product.tag}
                      </span>
                    )}
                    
                    {/* Quick view overlay on hover */}
                    <div className="absolute inset-0 bg-black bg-opacity-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <span className="bg-white text-primary font-medium py-2 px-4 rounded-full text-sm transform -translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                        View Details
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    {/* Category */}
                    <p className="text-xs text-primary font-medium uppercase tracking-wider mb-1">
                      {product.category}
                    </p>
                    
                    {/* Product name */}
                    <h3 className="font-bold text-gray-900 mb-1 line-clamp-1">{product.name}</h3>
                    
                    {/* Rating */}
                    <div className="flex items-center mb-2">
                      {renderStarRating(product.averageRating)}
                      <span className="text-xs text-gray-500 ml-1">
                        ({product.averageRating ? product.averageRating.toFixed(1) : '0.0'})
                      </span>
                    </div>
                    
                    {/* Price */}
                    <div className="font-bold text-lg">
                      ₹{parseFloat(product.price).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-16">
                <div className="bg-gray-50 rounded-lg p-8 max-w-md mx-auto">
                  <p className="text-gray-500 mb-4">No products found</p>
                  <Link 
                    to="/"
                    className="text-primary underline"
                  >
                    Go to homepage
                  </Link>
                </div>
              </div>
            )}
          </div>
          
          {/* view all button */}
          {products.length > 0 && (
            <div className="flex justify-center mt-12">
              <Link 
                to="/products/art"
                className="bg-gradient-to-r from-primary to-blue-600 text-white py-3 px-8 rounded-full hover:shadow-lg transition-all duration-300 flex items-center font-medium"
              >
                Explore All Products
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Products;
