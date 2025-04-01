import { useState, useEffect } from "react";
import PropTypes from 'prop-types';
import { ShoppingCart, ChevronRight, Tag, Star, Filter } from "lucide-react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import Footer from "../Footer/Footer";
import { productService } from "../../services/api";
import axiosInstance from "../../axiosInstance";

// Add animation CSS
const fadeInAnimation = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in {
    animation: fadeIn 0.4s ease-out forwards;
  }
`;

// Category mapping for sidebar and display
const categoryMapping = {
  'home-living': {
    title: "Home & Living",
    sidebar: [
      "Home Decor",
      "Bedding and Pillows",
      "Kitchen & Dining",
      "Storage & Organization"
    ],
    description: "Explore our collection of home and living products that enhance your space."
  },
  clothing: {
    title: "Clothing",
    sidebar: [
      "Shirt",
      "Saree",
      "Kurthi sets",
      "Pants",
      "Dhoti",
      "Dupatta"
    ],
    description: "Discover our range of handcrafted clothing made with love."
  },
  'handmade-gifts': {
    title: "Handmade Gifts & Personalized Items",
    sidebar: [
      "Custom Nameplates & Signs",
      "Engraved Jewelry & Accessories",
      "Handmade Greeting Cards",
      "Photo Frames & Personalized Art"
    ],
    description: "Find the perfect personalized gift for your loved ones."
  },
  jewellery: {
    title: "Jewellery",
    sidebar: [
      "Necklaces",
      "Earrings",
      "Bracelets",
      "Rings"
    ],
    description: "Adorn yourself with our exquisite jewellery collection."
  },
  toys: {
    title: "Toys",
    sidebar: [
      "Action Figures",
      "Educational Toys",
      "Stuffed Animals",
      "Puzzles"
    ],
    description: "Explore our fun and educational toys for children."
  },
  'bath-beauty': {
    title: "Bath & Beauty",
    sidebar: [
      "Handmade Soaps",
      "Skincare Products",
      "Haircare Products",
      "Aromatherapy & Essential Oils"
    ],
    description: "Pamper yourself with our natural bath and beauty products."
  },
  art: {
    title: "Art",
    sidebar: [
      "Paintings & Drawings",
      "Sculptures",
      "Handmade Prints",
      "Handcrafted Cards & Stationery"
    ],
    description: "Discover unique art pieces created by talented artisans."
  },
  accessories: {
    title: "Accessories",
    sidebar: [
      "Bags & Purses",
      "Footwear",
      "Hats & Hair Accessories"
    ],
    description: "Complete your look with our stylish accessories."
  }
};

const Navbar = () => {
  const { category } = useParams();
  return (
    <nav className="bg-gray-100 p-4 shadow-md">
      <div className="container flex justify-between items-center mx-auto">
        <div className="flex justify-between w-full">
          {Object.keys(categoryMapping).map((key) => (
            <a
              key={key}
              href={`/products/${key}`}
              className={`text-gray-600 font-medium hover:text-gray-700 transition-all duration-300 ease-in-out transform hover:scale-105 ${
                category === key ? 'border-b-2 border-indigo-500' : ''
              }`}
            >
              {categoryMapping[key].title}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
};

const Sidebar = ({ category, onFilterChange, initialSubcategory, categoryTitle }) => {
  const categoryInfo = categoryMapping[category] || categoryMapping.art;
  const [activeSubcategory, setActiveSubcategory] = useState(
    initialSubcategory || "All"
  );
  const [filters, setFilters] = useState({ 
    rating: null, 
    tags: [], 
    price: [0, 5000],
    subcategory: initialSubcategory || "All"
  });
  
  // Update filters when category or initialSubcategory changes
  useEffect(() => {
    const newSubcategory = initialSubcategory || "All";
    setActiveSubcategory(newSubcategory);
    setFilters(prev => ({
      ...prev,
      subcategory: newSubcategory
    }));
  }, [category, initialSubcategory, categoryInfo.sidebar]);

  const handleSubcategoryClick = (subcategory) => {
    setActiveSubcategory(subcategory);
    const newFilters = { ...filters, subcategory };
    setFilters(newFilters);
    
    // Force immediate refresh by calling onFilterChange with the new filters
    onFilterChange(newFilters);
  };

  const handleFilterChange = (filterType, value) => {
    // Create a copy of the current filters
    const newFilters = { ...filters };
    
    // Update the specific filter
    newFilters[filterType] = value;
    
    // Update local state
    setFilters(newFilters);
    
    // Notify parent component
    onFilterChange(newFilters);
  };

  return (
    <div className="bg-gray-100 border-r shadow-sm p-6 w-1/4 duration-300 ease-in-out min-h-screen transition-all">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">Browse {categoryTitle}</h2>
        <p className="text-gray-600 text-sm">
          {activeSubcategory === "All" 
            ? `Showing all ${categoryTitle} items` 
            : `Browsing ${activeSubcategory}`}
        </p>
      </div>
      
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center text-gray-800">
            <Filter size={16} className="mr-2 text-indigo-500" />
            Subcategories
          </h3>
          <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">
            {activeSubcategory}
          </span>
        </div>
        
        <ul className="text-gray-700 font-medium space-y-2 border-l border-gray-300 ml-1">
          <li 
            className={`cursor-pointer hover:text-black transition-colors duration-200 pl-4 border-l-2 -ml-[1px] py-2 ${
              activeSubcategory === "All" 
                ? "border-indigo-500 text-indigo-700 font-semibold" 
                : "border-transparent hover:border-gray-300"
            }`}
            onClick={() => handleSubcategoryClick("All")}
          >
            <div className="flex items-center">
              {activeSubcategory === "All" && <ChevronRight size={16} className="mr-1 text-indigo-500" />}
              All Items
            </div>
          </li>
          {categoryInfo.sidebar.map((item, index) => (
            <li 
              key={index} 
              className={`cursor-pointer hover:text-black transition-colors duration-200 pl-4 border-l-2 -ml-[1px] py-2 ${
                activeSubcategory === item 
                  ? "border-indigo-500 text-indigo-700 font-semibold" 
                  : "border-transparent hover:border-gray-300"
              }`}
              onClick={() => handleSubcategoryClick(item)}
            >
              <div className="flex items-center">
                {activeSubcategory === item && <ChevronRight size={16} className="mr-1 text-indigo-500" />}
                {item}
              </div>
            </li>
          ))}
        </ul>
      </div>
      
      <div className="mb-6">
        <div className="flex items-center mb-3">
          <Star size={16} className="mr-2 text-yellow-500" />
          <h3 className="font-semibold text-gray-800">Rating</h3>
        </div>
        <select 
          onChange={(e) => handleFilterChange('rating', e.target.value)} 
          className="border p-2 rounded w-full focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All Ratings</option>
          <option value="4">4 Stars & Up</option>
          <option value="3">3 Stars & Up</option>
          <option value="2">2 Stars & Up</option>
          <option value="1">1 Star & Up</option>
        </select>
      </div>
      
      <div className="mb-6">
        <div className="flex items-center mb-3">
          <Tag size={16} className="mr-2 text-green-500" />
          <h3 className="font-semibold text-gray-800">Tags</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {["New", "Trending", "Sale", "Limited"].map(tag => (
            <button 
              key={tag}
              onClick={() => {
                // Toggle tag selection
                const updatedTags = filters.tags.includes(tag)
                  ? filters.tags.filter(t => t !== tag)
                  : [...filters.tags, tag];
                handleFilterChange('tags', updatedTags);
              }}
              className={`px-3 py-1 rounded-full border transition-all ${
                filters.tags.includes(tag) 
                  ? 'bg-indigo-500 text-white border-indigo-500' 
                  : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-300'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
      
      <div className="mb-6">
        <h3 className="font-semibold mb-3 text-gray-800">Price Range</h3>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">₹0</span>
          <span className="text-sm font-medium text-gray-700">₹{filters.price[1]}</span>
        </div>
        <input 
          type="range" 
          min="0" 
          max="5000" 
          value={filters.price[1]} 
          onChange={(e) => handleFilterChange('price', [0, e.target.value])} 
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
        />
        <div className="mt-2 text-center">
          <span className="text-sm bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">
            Up to ₹{filters.price[1]}
          </span>
        </div>
      </div>
      
      <button 
        onClick={() => {
          // Reset all filters
          const resetFilters = {
            rating: null,
            tags: [],
            price: [0, 5000],
            subcategory: "All"
          };
          setFilters(resetFilters);
          setActiveSubcategory("All");
          onFilterChange(resetFilters);
        }}
        className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded transition-colors"
      >
        Reset All Filters
      </button>
    </div>
  );
};

Sidebar.propTypes = {
  category: PropTypes.string.isRequired,
  onFilterChange: PropTypes.func.isRequired,
  initialSubcategory: PropTypes.string,
  categoryTitle: PropTypes.string.isRequired
};

const ProductCard = ({ product }) => {
  const navigate = useNavigate();
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [error, setError] = useState(null);
  const userRole = localStorage.getItem('userRole');

  // Function to show success notification
  const showSuccessNotification = () => {
    // Create temporary success message element that fades out
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-500 text-white py-2 px-4 rounded-lg shadow-lg z-50 flex items-center';
    notification.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>Added to cart';
    
    document.body.appendChild(notification);
    
    // Fade in
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.3s ease-in-out';
    
    setTimeout(() => {
      notification.style.opacity = '1';
    }, 10);
    
    // Fade out and remove
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 2000);
  };

  const handleViewProduct = () => {
    // Navigate to product detail page
    navigate(`/product/${product._id || product.id}`);
  };

  const handleAddToCart = async () => {
    // Prevent admin and seller from adding to cart
    if (userRole === 'admin' || userRole === 'seller') {
      setError(userRole === 'admin' ? 
        'Admin accounts cannot add items to cart' : 
        'Seller accounts cannot add items to cart');
      return;
    }

    try {
      setIsAddingToCart(true);
      setError(null);
      
      const response = await axiosInstance.post('/api/cart/add', {
        productId: product._id || product.id,
        quantity: 1
      });
      
      if (response.data.success) {
        // If guest cart, save to localStorage
        if (response.data.isGuest) {
          try {
            // Get current guest cart
            const guestCart = JSON.parse(localStorage.getItem('guestCartItems') || '[]');
            
            // Check if product already exists in cart
            const existingItemIndex = guestCart.findIndex(item => 
              item.productId === (product._id || product.id)
            );
            
            if (existingItemIndex >= 0) {
              // Update quantity if already in cart
              guestCart[existingItemIndex].quantity += 1;
            } else {
              // Add new item with all required details
              guestCart.push({
                productId: product._id || product.id,
                name: product.name,
                price: product.price,
                quantity: 1,
                image: product.image,
                category: product.category,
                subcategory: product.subcategory,
                stock: product.stock
              });
            }
            
            // Save updated cart
            localStorage.setItem('guestCartItems', JSON.stringify(guestCart));
          } catch (localStorageErr) {
            console.error('Error saving to localStorage:', localStorageErr);
          }
        }
        
        // Notify cart updated for cart badge counter
        window.dispatchEvent(new Event('cartUpdated'));
        
        // Show success message
        setError(null);
        showSuccessNotification();
      } else {
        setError('Failed to add product to cart');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      
      // Handle stock validation error
      if (error.response?.data?.message?.includes('Only')) {
        setError(error.response.data.message);
        return;
      }
      
      setError('Only Users Can Access');
    } finally {
      setIsAddingToCart(false);
    }
  };

  return (
    <div className="bg-white border p-5 rounded-xl shadow-sm duration-300 hover:shadow-md transition">
      <div className="relative">
        {product.tag && (
          <span className="bg-black rounded-full text-white text-xs absolute left-2 px-2 py-1 top-2 z-10">
            {product.tag}
          </span>
        )}
        <div className="flex bg-gray-50 h-48 justify-center rounded-md w-full items-center mb-3 overflow-hidden">
          <img
            src={product.image}
            alt={product.name}
            className="max-h-48 max-w-full object-contain"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://via.placeholder.com/300x200?text=Image+Not+Available';
            }}
          />
        </div>
      </div>
      <div className="flex flex-col h-28">
        <h3 className="text-lg font-semibold line-clamp-1">{product.name}</h3>
        <p className="text-gray-600 text-sm line-clamp-2 mb-auto mt-1">{product.description}</p>
        <p className="text-black text-xl font-bold mt-2">₹{parseFloat(product.price).toFixed(2)}</p>
      </div>
      <div className="flex gap-2 mt-3">
        {userRole !== 'admin' && userRole !== 'seller' ? (
          <button 
            className="flex flex-1 justify-center rounded-lg text-white items-center px-5 py-2 transition bg-black hover:bg-gray-800"
            onClick={handleAddToCart}
            disabled={isAddingToCart}
            aria-label={`Add ${product.name} to cart`}
          >
            {isAddingToCart ? (
              <span className="animate-pulse">Adding...</span>
            ) : (
              <>
                <ShoppingCart className="h-5 w-5 mr-2" />
                Add to Cart
              </>
            )}
          </button>
        ) : (
          <button 
            className="flex flex-1 justify-center rounded-lg text-gray-500 bg-gray-200 items-center px-5 py-2 cursor-not-allowed"
            onClick={() => setError(userRole === 'admin' ? 
              'Admin accounts cannot add items to cart' : 
              'Seller accounts cannot add items to cart')}
            aria-label="Not available for your account type"
          >
            <ShoppingCart className="h-5 w-5 mr-2" />
            Not Available
          </button>
        )}
        <button 
          onClick={handleViewProduct}
          className="border border-black rounded-lg text-black hover:bg-gray-100 px-3 py-2 transition"
          aria-label={`View ${product.name} details`}
        >
          View
        </button>
      </div>
      {error && (
        <div className="text-red-500 text-sm mt-2">{error}</div>
      )}
    </div>
  );
};

ProductCard.propTypes = {
  product: PropTypes.shape({
    _id: PropTypes.string,
    id: PropTypes.string,
    tag: PropTypes.string,
    image: PropTypes.string,
    name: PropTypes.string,
    description: PropTypes.string,
    price: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    category: PropTypes.string,
    subcategory: PropTypes.string,
    stock: PropTypes.number
  }).isRequired,
};

const ProductPage = () => {
  const { category } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const subcategory = queryParams.get('subcategory');
  
  const [sortBy, setSortBy] = useState("bestsellers");
  const [itemsToShow, setItemsToShow] = useState(12);
  const [currentPage, setCurrentPage] = useState(1);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalPages, setTotalPages] = useState(1);
  
  // Determine the current category from URL or props
  let currentCategory;
  
  // Check if we're using a direct route like /Art or /Clothing
  if (!category) {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('art')) currentCategory = 'art';
    else if (path.includes('clothing')) currentCategory = 'clothing';
    else if (path.includes('ceramics')) currentCategory = 'ceramics';
    else if (path.includes('jewellery') || path.includes('jewelry')) currentCategory = 'jewellery';
    else if (path.includes('wooden')) currentCategory = 'wooden';
    else if (path.includes('clay')) currentCategory = 'clay';
    else if (path.includes('decor')) currentCategory = 'decor';
    else currentCategory = 'art'; // Default
  } else {
    currentCategory = category.toLowerCase();
  }
  
  const categoryTitle = categoryMapping[currentCategory]?.title || "Products";

  const handleFilterChange = (filters) => {
    // Reset to page 1 when changing filters
    setCurrentPage(1);
    
    // Update URL if subcategory changed and it's not "All"
    if (filters.subcategory) {
      if (filters.subcategory === "All") {
        // If "All" is selected, remove subcategory from URL
        navigate(`/products/${currentCategory}`, { replace: true });
      } else if (!subcategory || 
          filters.subcategory.toLowerCase().replace(/\s+/g, '-') !== subcategory.toLowerCase()) {
        // Otherwise update URL with the new subcategory
        const formattedSubcategory = filters.subcategory
          .toLowerCase()
          .trim()
          .replace(/\s+/g, '-');
        navigate(`/products/${currentCategory}?subcategory=${formattedSubcategory}`, { replace: true });
      }
    }
    
    // Fetch products with updated filters
    fetchProducts(filters);
  };

  // Fetch products from API
  const fetchProducts = async (filters = {}) => {
    try {
      setLoading(true);
      
      // Prepare query parameters
      const params = {
        category: currentCategory,
        page: currentPage,
        limit: itemsToShow,
        sort: sortBy
      };
      
      // Handle subcategory - format it properly
      if (subcategory && subcategory.toLowerCase() !== "all") {
        params.subcategory = subcategory.toLowerCase().trim();
      } else if (filters.subcategory && filters.subcategory !== "All") {
        // Format subcategory value for API (replace spaces with hyphens, lowercase)
        const formattedSubcategory = filters.subcategory
          .toLowerCase()
          .trim()
          .replace(/\s+/g, '-');
        params.subcategory = formattedSubcategory;
      }
      
      // Add price range filter if present
      if (filters.price && Array.isArray(filters.price) && filters.price.length === 2) {
        params.minPrice = filters.price[0];
        params.maxPrice = filters.price[1];
      }
      
      // Add rating filter if present
      if (filters.rating) {
        params.rating = filters.rating;
      }
      
      // Add tag filter if present
      if (filters.tags && filters.tags.length > 0) {
        params.tag = filters.tags.join(',');
      }
      
      // Log the params for debugging
      console.log("API request params:", params);
      
      const response = await productService.getAllProducts(params);
      
      if (response.data.success) {
        setProducts(response.data.products);
        setTotalPages(response.data.totalPages || 1);
      } else {
        setError('Failed to fetch products');
        setProducts([]);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Error fetching products. Please try again later.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchProducts();
  }, [currentCategory, currentPage, itemsToShow, sortBy, subcategory]);

  // Handle category not found
  useEffect(() => {
    if (!categoryMapping[currentCategory]) {
      navigate("/products/art");
    }
  }, [currentCategory, navigate]);

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  return (
    <>
      {/* Add animation styles */}
      <style>{fadeInAnimation}</style>
      <Navbar />
      <div className="flex bg-gray-50 min-h-screen">
        <Sidebar 
          category={currentCategory} 
          onFilterChange={handleFilterChange} 
          initialSubcategory={subcategory}
          categoryTitle={categoryTitle}
        />
        <div className="p-8 w-3/4">
          {/* Breadcrumb navigation */}
          <nav className="flex text-sm mb-4" aria-label="Breadcrumb">
            <ol className="inline-flex items-center md:space-x-3 space-x-1">
              <li className="inline-flex items-center">
                <span className="text-gray-600">Home</span>
              </li>
              <li>
                <div className="flex items-center">
                  <span className="text-gray-400 mx-2">/</span>
                  <span className="text-gray-600">Products</span>
                </div>
              </li>
              <li>
                <div className="flex items-center">
                  <span className="text-gray-400 mx-2">/</span>
                  <span className="text-gray-800 font-medium">{categoryTitle}</span>
                </div>
              </li>
              {subcategory && (
                <li>
                  <div className="flex items-center">
                    <span className="text-gray-400 mx-2">/</span>
                    <span className="text-gray-800 font-medium">
                      {subcategory.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </div>
                </li>
              )}
            </ol>
          </nav>
          
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl text-gray-900 font-extrabold">{categoryTitle}</h1>
              {subcategory && subcategory.toLowerCase() !== "all" && (
                <p className="text-indigo-600 text-lg mt-1">
                  {subcategory.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </p>
              )}
            </div>
            <div className="flex space-x-4">
              <select 
                className="border p-2 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="bestsellers">Sort by: Best Sellers</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="newest">Newest First</option>
              </select>
              <select 
                className="border p-2 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                value={itemsToShow}
                onChange={(e) => setItemsToShow(Number(e.target.value))}
              >
                <option value="12">Show: 12</option>
                <option value="24">24</option>
                <option value="36">36</option>
              </select>
            </div>
          </div>
          
          {/* Product count and results summary */}
          {!loading && !error && (
            <div className="bg-white p-4 rounded-lg shadow-sm mb-6 flex justify-between items-center">
              <div>
                <p className="text-gray-600">
                  <span className="font-medium text-gray-800">{products.length}</span> products found
                  {subcategory && subcategory.toLowerCase() !== "all" && (
                    <span> in <span className="font-medium text-indigo-600">
                      {subcategory.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span></span>
                  )}
                </p>
              </div>
              <div>
                <span className="text-sm bg-gray-100 text-gray-700 px-2 py-1 rounded">
                  Page {currentPage} of {totalPages}
                </span>
              </div>
            </div>
          )}
          
          {/* Product description */}
          <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
            <p className="text-gray-600">
              {categoryMapping[currentCategory]?.description || 
                `Explore our collection of authentic ${categoryTitle.toLowerCase()} handcrafted by skilled artisans 
                using traditional techniques. Each piece is unique and tells a story of cultural heritage and craftsmanship.`}
            </p>
          </div>
          
          {/* Loading state */}
          {loading && (
            <div className="flex h-64 justify-center items-center">
              <div className="border-b-2 border-black border-t-2 h-12 rounded-full w-12 animate-spin"></div>
            </div>
          )}
          
          {/* Error state */}
          {error && !loading && (
            <div className="bg-red-100 border border-red-400 rounded text-red-700 mb-4 px-4 py-3">
              <p>{error}</p>
            </div>
          )}
          
          {/* No products found */}
          {!loading && !error && products.length === 0 && (
            <div className="text-center py-10">
              <p className="text-gray-500 text-lg">No products found in this category.</p>
            </div>
          )}
          
          {/* Product cards with animation */}
          {!loading && !error && products.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
              {products.map((product) => (
                <ProductCard key={product._id || product.id} product={product} />
              ))}
            </div>
          )}
          
          {/* Pagination */}
          <div className="mt-8 flex justify-center">
            <nav className="inline-flex rounded-md shadow">
              <a
                href="#"
                className={`px-4 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                  currentPage === 1 
                    ? 'text-gray-300 cursor-not-allowed' 
                    : 'text-gray-500 hover:bg-gray-50'
                } focus:z-10`}
                onClick={(e) => { 
                  e.preventDefault(); 
                  if (currentPage > 1) handlePageChange(currentPage - 1); 
                }}
                aria-label="Previous"
                aria-disabled={currentPage === 1}
              >
                Previous
              </a>
              {Array.from({ length: totalPages }, (_, i) => (
                <a
                  key={i + 1}
                  href="#"
                  className={`px-4 py-2 border-t border-b border-gray-300 bg-white text-sm font-medium ${
                    currentPage === i + 1 
                      ? 'bg-indigo-50 text-indigo-600 font-bold' 
                      : 'text-gray-500 hover:bg-gray-50'
                  } focus:z-10`}
                  onClick={(e) => { e.preventDefault(); handlePageChange(i + 1); }}
                >
                  {i + 1}
                </a>
              ))}
              <a
                href="#"
                className={`px-4 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                  currentPage === totalPages 
                    ? 'text-gray-300 cursor-not-allowed' 
                    : 'text-gray-500 hover:bg-gray-50'
                } focus:z-10`}
                onClick={(e) => { 
                  e.preventDefault(); 
                  if (currentPage < totalPages) handlePageChange(currentPage + 1); 
                }}
                aria-label="Next"
                aria-disabled={currentPage === totalPages}
              >
                Next
              </a>
            </nav>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default ProductPage;