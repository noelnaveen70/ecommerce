// import React, { useState, useRef, useEffect } from "react";
import { useState, useRef, useEffect } from "react";
import { 
  FaArrowLeft, 
  FaSave, 
  FaUpload, 
  FaExclamationTriangle,
  FaSpinner,
  FaCheckCircle
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import "./AddProduct.css"; // Import CSS for animations
import axiosInstance from "../../axiosInstance";
import { getAuthToken } from "../../utils/auth";

// Define categories and their subcategories with exact backend values
const categoriesWithSubcategories = {
  "home-living": {
    displayName: "Home & Living",
    subcategories: ["Home Decor", "Bedding and Pillows", "Kitchen & Dining", "Storage & Organization"],
    backendValues: {
      "Home Decor": "home-decor",
      "Bedding and Pillows": "bedding-and-pillows",
      "Kitchen & Dining": "kitchen-dining", 
      "Storage & Organization": "storage-organization"
    }
  },
  "clothing": {
    displayName: "Clothing",
    subcategories: ["Shirt", "Saree", "Kurthi sets", "Pants", "Dhoti", "Dupatta"],
    backendValues: {
      "Shirt": "shirt",
      "Saree": "saree",
      "Kurthi sets": "kurthi-sets",
      "Pants": "pants",
      "Dhoti": "dhoti",
      "Dupatta": "dupatta"
    }
  },
  "handmade-gifts": {
    displayName: "Handmade Gifts & Personalized Items",
    subcategories: ["Custom Nameplates & Signs", "Engraved Jewelry & Accessories", "Handmade Greeting Cards", "Photo Frames & Personalized Art"],
    backendValues: {
      "Custom Nameplates & Signs": "custom-nameplates",
      "Engraved Jewelry & Accessories": "engraved-jewelry",
      "Handmade Greeting Cards": "handmade-greeting-cards",
      "Photo Frames & Personalized Art": "photo-frames"
    }
  },
  "jewellery": {
    displayName: "Jewellery",
    subcategories: ["Necklaces", "Earrings", "Bracelets", "Rings"],
    backendValues: {
      "Necklaces": "necklaces",
      "Earrings": "earrings",
      "Bracelets": "bracelets",
      "Rings": "rings"
    }
  },
  "toys": {
    displayName: "Toys",
    subcategories: ["Action Figures", "Educational Toys", "Stuffed Animals", "Puzzles"],
    backendValues: {
      "Action Figures": "action-figures",
      "Educational Toys": "educational-toys",
      "Stuffed Animals": "stuffed-animals",
      "Puzzles": "puzzles"
    }
  },
  "bath-beauty": {
    displayName: "Bath & Beauty",
    subcategories: ["Handmade Soaps", "Skincare Products", "Haircare Products", "Aromatherapy & Essential Oils"],
    backendValues: {
      "Handmade Soaps": "handmade-soaps",
      "Skincare Products": "skincare-products",
      "Haircare Products": "haircare-products",
      "Aromatherapy & Essential Oils": "aromatherapy-essential-oils"
    }
  },
  "art": {
    displayName: "Art",
    subcategories: ["Paintings & Drawings", "Sculptures", "Handmade Prints", "Handcrafted Cards & Stationery"],
    backendValues: {
      "Paintings & Drawings": "paintings-drawings",
      "Sculptures": "sculptures",
      "Handmade Prints": "handmade-prints",
      "Handcrafted Cards & Stationery": "handcrafted-cards-stationery"
    }
  },
  "accessories": {
    displayName: "Accessories",
    subcategories: ["Bags & Purses", "Footwear", "Hats & Hair Accessories"],
    backendValues: {
      "Bags & Purses": "bags-purses",
      "Footwear": "footwear",
      "Hats & Hair Accessories": "hats-hair-accessories"
    }
  },
};

const AddProduct = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    description: "",
    category: "",
    subcategory: "",
    tag: "",
    stock: 10,
    image: null
  });
  
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [snackbar, setSnackbar] = useState({ show: false, message: "", type: "success" });
  const [subcategories, setSubcategories] = useState([]);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);

  // Categories for dropdown
  const categories = Object.keys(categoriesWithSubcategories).map(key => ({
    value: key,
    label: categoriesWithSubcategories[key].displayName
  }));

  // Tags from the product model
  const tags = [
    { value: "New", label: "New" },
    { value: "Bestseller", label: "Bestseller" },
    { value: "Trending", label: "Trending" },
    { value: "Limited", label: "Limited Edition" }
  ];

  // Fetch subcategories when category changes
  useEffect(() => {
    if (formData.category) {
      fetchSubcategories(formData.category);
    } else {
      setSubcategories([]);
      // Reset subcategory when category is cleared
      setFormData(prev => ({ ...prev, subcategory: "" }));
    }
  }, [formData.category]);

  // Get subcategories from the categoryMapping
  const fetchSubcategories = async (category) => {
    setLoadingSubcategories(true);
    try {
      // First attempt to get the subcategories from our mapping
      if (categoriesWithSubcategories[category] && categoriesWithSubcategories[category].subcategories) {
        const mappedSubcategories = categoriesWithSubcategories[category].subcategories;
        setSubcategories(mappedSubcategories);
      } else {
        // Fallback to API call if not in our mapping
        const response = await axiosInstance.get(`/api/products/categories/${category}/subcategories`);
        
        if (response.data.success && response.data.subcategories.length > 0) {
          // Filter out any null values
          const filteredSubcategories = response.data.subcategories.filter(subcat => subcat);
          setSubcategories(filteredSubcategories);
        }
      }
    } catch (error) {
      console.error("Error fetching subcategories:", error);
      // If API call fails, use empty array
      setSubcategories([]);
    } finally {
      setLoadingSubcategories(false);
    }
  };

  // Get backend value for a subcategory
  const getBackendSubcategoryValue = (category, subcategory) => {
    if (!category || !subcategory) return '';
    
    const categoryData = categoriesWithSubcategories[category];
    if (categoryData && categoryData.backendValues && categoryData.backendValues[subcategory]) {
      return categoryData.backendValues[subcategory];
    }
    
    // Log a warning if mapping not found
    console.warn(`No exact mapping found for subcategory "${subcategory}" in category "${category}"`);
    
    // Fallback to the old formatting logic if mapping not found
    return subcategory
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/&/g, '-')
      .replace(/\/+/g, '-');
  };

  // Show snackbar notification
  const showSnackbar = (message, type = "success") => {
    setSnackbar({ show: true, message, type });
    setTimeout(() => {
      setSnackbar({ show: false, message: "", type: "success" });
    }, 3000);
  };

  // Auto-navigate after successful submission
  useEffect(() => {
    let timer;
    if (snackbar.show && snackbar.type === "success") {
      timer = setTimeout(() => {
        navigate("/seller");
      }, 2000);
    }
    return () => clearTimeout(timer);
  }, [snackbar, navigate]);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Convert price and stock to numbers
    if (name === "price" || name === "stock") {
      setFormData({
        ...formData,
        [name]: value === "" ? "" : parseFloat(value)
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
    
    // Clear error for this field if it exists
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null
      });
    }
  };

  // Handle image upload
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setErrors({
        ...errors,
        image: "Only JPG/JPEG images are allowed"
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors({
        ...errors,
        image: "Image size should be less than 5MB"
      });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);

    // Update form data
    setFormData({
      ...formData,
      image: file
    });
    
    // Clear error
    if (errors.image) {
      setErrors({
        ...errors,
        image: null
      });
    }
  };

  // Trigger file input click
  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) newErrors.name = "Product name is required";
    if (!formData.price || formData.price <= 0) newErrors.price = "Valid price is required";
    if (!formData.description.trim()) newErrors.description = "Description is required";
    if (!formData.category) newErrors.category = "Category is required";
    if (!formData.subcategory) newErrors.subcategory = "Subcategory is required";
    if (!formData.tag) newErrors.tag = "Tag is required";
    if (!formData.stock || formData.stock < 0) newErrors.stock = "Valid stock quantity is required";
    if (!formData.image) newErrors.image = "Product image is required";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      // Check if user is authenticated
      const token = getAuthToken();
      if (!token) {
        setSubmitError("Authentication required. Please login to add products.");
        setIsSubmitting(false);
        return;
      }
      
      // Get selected category and subcategory
      const selectedCategoryKey = formData.category;
      const selectedSubcategoryDisplay = formData.subcategory;
      
      // Get the correct backend enum value for the selected subcategory
      const backendSubcategoryValue = getBackendSubcategoryValue(selectedCategoryKey, selectedSubcategoryDisplay);
      
      // Log subcategory mapping for debugging
      console.log('Subcategory mapping:', {
        categoryKey: selectedCategoryKey,
        originalSubcategory: selectedSubcategoryDisplay,
        mappedValue: backendSubcategoryValue
      });
      
      // Create FormData object for file upload
      const productData = new FormData();
      productData.append("name", formData.name);
      productData.append("price", formData.price);
      productData.append("description", formData.description);
      
      // Use the category key directly (already in correct format)
      productData.append("category", selectedCategoryKey);
      
      // Use the mapped subcategory value
      productData.append("subcategory", backendSubcategoryValue);
      
      productData.append("tag", formData.tag);
      productData.append("stock", formData.stock);
      
      if (formData.image) {
        // Use 'image' as the field name to match the backend expectation
        productData.append("image", formData.image);
        console.log('Image appended to form:', formData.image.name, formData.image.type, formData.image.size);
      } else {
        console.warn('No image provided for product');
      }
      
      // Log form data for debugging
      console.log('Submitting product data with fields:', 
        Array.from(productData.entries()).map(entry => `${entry[0]}: ${entry[0] === 'image' ? '[File]' : entry[1]}`));
      
      // Send data to backend API
      const response = await axiosInstance.post('/api/products', productData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      console.log('Product added successfully:', response.data);
      
      // Show success message
      showSnackbar(`${formData.name} added successfully`);
      
      // Navigation will happen automatically after the snackbar is shown (see useEffect)
      
    } catch (error) {
      console.error("Error adding product:", error);
      
      // Provide more specific error messages based on the error
      let errorMessage = "Failed to add product. Please try again.";
      
      if (error.response) {
        // Server responded with an error
        console.error('Server error response:', error.response.data);
        
        if (error.response.status === 400) {
          if (error.response.data.error && error.response.data.error.includes('Validation failed')) {
            errorMessage = `Validation error: ${error.response.data.error}`;
          } else {
            errorMessage = "Invalid product data. Please check all fields and try again.";
          }
        } else if (error.response.status === 401) {
          errorMessage = "Authentication error. Please log in again.";
        } else if (error.response.status === 413) {
          errorMessage = "The image file is too large. Please use a smaller image (max 5MB).";
        } else if (error.response.status === 500 && error.response.data.message) {
          // Include specific server error message
          errorMessage = `Server error: ${error.response.data.message}`;
          
          // Handle Multer errors specifically
          if (error.response.data.message.includes("Unexpected field")) {
            errorMessage = "Image upload failed. There was an issue with the file field name.";
          }
        }
      } else if (error.request) {
        // Request was made but no response
        errorMessage = "Network error. The server is not responding.";
      }
      
      setSubmitError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-50 p-6 dark:bg-gray-900 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-8">
          <button 
            onClick={() => navigate("/seller")}
            className="p-2 rounded-full dark:hover:bg-gray-700 hover:bg-gray-200 mr-4 transition-colors"
          >
            <FaArrowLeft className="text-gray-600 dark:text-gray-300" />
          </button>
          <h1 className="text-2xl text-gray-800 dark:text-white font-bold">Add New Product</h1>
        </div>
        
        {/* Form */}
        <div className="bg-white p-6 rounded-lg shadow-sm dark:bg-gray-800">
          {submitError && (
            <div className="flex bg-red-50 p-4 rounded-lg dark:bg-red-900/20 items-start mb-6">
              <FaExclamationTriangle className="flex-shrink-0 text-red-500 mr-3 mt-0.5" />
              <p className="text-red-600 dark:text-red-400">{submitError}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Product Name */}
                <div>
                  <label className="text-gray-700 text-sm block dark:text-gray-300 font-medium mb-1">
                    Product Name*
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border ${errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'} rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white`}
                  />
                  {errors.name && (
                    <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                  )}
                </div>
                
                {/* Price */}
                <div>
                  <label className="text-gray-700 text-sm block dark:text-gray-300 font-medium mb-1">
                    Price ($)*
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    min="0.01"
                    step="0.01"
                    className={`w-full px-3 py-2 border ${errors.price ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'} rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white`}
                  />
                  {errors.price && (
                    <p className="text-red-500 text-sm mt-1">{errors.price}</p>
                  )}
                </div>
                
                {/* Category */}
                <div>
                  <label className="text-gray-700 text-sm block dark:text-gray-300 font-medium mb-1">
                    Category*
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border ${errors.category ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'} rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white`}
                  >
                    <option value="">Select a category</option>
                    {categories.map(category => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                  {errors.category && (
                    <p className="text-red-500 text-sm mt-1">{errors.category}</p>
                  )}
                </div>
                
                {/* Subcategory - Only show when category is selected */}
                {formData.category && (
                  <div>
                    <label className="text-gray-700 text-sm block dark:text-gray-300 font-medium mb-1">
                      Subcategory*
                    </label>
                    <select
                      name="subcategory"
                      value={formData.subcategory}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border ${errors.subcategory ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'} rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white`}
                      disabled={loadingSubcategories}
                      required
                    >
                      <option value="">Select a subcategory</option>
                      {loadingSubcategories ? (
                        <option disabled>Loading subcategories...</option>
                      ) : (
                        subcategories.map((subcategory, index) => {
                          // Store the original subcategory for display
                          const displayValue = typeof subcategory === 'string' 
                            ? subcategory 
                            : subcategory?.name || subcategory?.value || subcategory || '';
                          
                          // Show the formatted value in option's title to help debugging
                          const formattedValue = displayValue
                            .toLowerCase()
                            .replace(/\s+/g, '-')
                            .replace(/&/g, '-')
                            .replace(/\/+/g, '-')
                            .replace(/\s*and\s*/g, '-')
                            .replace(/--+/g, '-');
                          
                          return (
                            <option 
                              key={index} 
                              value={displayValue}
                              title={`Will be sent as: ${formattedValue}`}
                            >
                              {displayValue}
                            </option>
                          );
                        })
                      )}
                    </select>
                    {errors.subcategory && (
                      <p className="text-red-500 text-sm mt-1">{errors.subcategory}</p>
                    )}
                  </div>
                )}
                
                {/* Tag */}
                <div>
                  <label className="text-gray-700 text-sm block dark:text-gray-300 font-medium mb-1">
                    Tag*
                  </label>
                  <select
                    name="tag"
                    value={formData.tag}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border ${errors.tag ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'} rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white`}
                    required
                  >
                    <option value="">Select a tag</option>
                    {tags.map(tag => (
                      <option key={tag.value} value={tag.value}>
                        {tag.label}
                      </option>
                    ))}
                  </select>
                  {errors.tag && (
                    <p className="text-red-500 text-sm mt-1">{errors.tag}</p>
                  )}
                </div>
                
                {/* Stock */}
                <div>
                  <label className="text-gray-700 text-sm block dark:text-gray-300 font-medium mb-1">
                    Stock*
                  </label>
                  <input
                    type="number"
                    name="stock"
                    value={formData.stock}
                    onChange={handleInputChange}
                    min="0"
                    className={`w-full px-3 py-2 border ${errors.stock ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'} rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white`}
                  />
                  {errors.stock && (
                    <p className="text-red-500 text-sm mt-1">{errors.stock}</p>
                  )}
                </div>
              </div>
              
              {/* Right Column */}
              <div className="space-y-6">
                {/* Image Upload */}
                <div>
                  <label className="text-gray-700 text-sm block dark:text-gray-300 font-medium mb-1">
                    Product Image* (JPG/JPEG only)
                  </label>
                  <div 
                    className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md ${
                      errors.image 
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/10' 
                        : 'border-gray-300 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-600'
                    } cursor-pointer transition-colors`}
                    onClick={handleUploadClick}
                  >
                    <div className="text-center space-y-1">
                      {imagePreview ? (
                        <div className="relative">
                          <img 
                            src={imagePreview} 
                            alt="Product preview" 
                            className="h-64 w-auto mx-auto object-contain"
                          />
                        </div>
                      ) : (
                        <>
                          <FaUpload className="h-12 text-gray-400 w-12 mx-auto" />
                          <div className="flex text-gray-600 text-sm dark:text-gray-400">
                            <p className="pl-1">Click to upload a product image</p>
                          </div>
                          <p className="text-gray-500 text-xs dark:text-gray-500">
                            JPG, JPEG up to 5MB
                          </p>
                        </>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        name="image"
                        accept=".jpg,.jpeg,image/jpeg,image/jpg"
                        onChange={handleImageChange}
                        className="sr-only"
                      />
                    </div>
                  </div>
                  {errors.image && (
                    <p className="text-red-500 text-sm mt-1">{errors.image}</p>
                  )}
                </div>
                
                {/* Description */}
                <div>
                  <label className="text-gray-700 text-sm block dark:text-gray-300 font-medium mb-1">
                    Description*
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows="8"
                    className={`w-full px-3 py-2 border ${errors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'} rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white`}
                    placeholder="Describe your product in detail..."
                  ></textarea>
                  {errors.description && (
                    <p className="text-red-500 text-sm mt-1">{errors.description}</p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Submit Button */}
            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={() => navigate("/seller")}
                className="border border-gray-300 rounded-md text-gray-700 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-gray-300 hover:bg-gray-50 mr-4 px-4 py-2 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex bg-indigo-600 rounded-md text-white disabled:opacity-70 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 hover:bg-indigo-700 items-center px-6 py-2 transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <FaSpinner className="animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <FaSave className="mr-2" />
                    Save Product
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Snackbar */}
      {snackbar.show && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 flex items-center p-4 rounded-md shadow-lg ${
          snackbar.type === "success" 
            ? "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100" 
            : "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100"
        } animate-fade-in-down`}>
          {snackbar.type === "success" ? (
            <FaCheckCircle className="text-green-500 dark:text-green-300 mr-2" />
          ) : (
            <FaExclamationTriangle className="text-red-500 dark:text-red-300 mr-2" />
          )}
          <p className="font-medium">{snackbar.message}</p>
        </div>
      )}
    </div>
  );
};

export default AddProduct; 