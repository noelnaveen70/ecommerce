import React, { useState, useRef, useEffect } from "react";
import Image1 from "../../assets/hero/women.png";
import Image2 from "../../assets/hero/shopping.png";
import Image3 from "../../assets/hero/sale.png";
import Slider from "react-slick";
import { Link, useLocation } from "react-router-dom";
import { FaPaintBrush, FaTshirt, FaGem, FaHome, FaGift, FaSoap, FaShoppingBag, FaPuzzlePiece } from "react-icons/fa";

// Define categories and subcategories with icons
const ProductCategories = [
  { 
    id: 1, 
    name: "Home & Living", 
    icon: <FaHome size={24} />,
    link: "/products/home-living",
    subcategories: ["Home Decor", "Bedding and Pillows", "Kitchen & Dining", "Storage & Organization"],
    // Mapping to exact backend enum values
    backendValues: {
      "Home Decor": "home-decor",
      "Bedding and Pillows": "bedding-and-pillows",
      "Kitchen & Dining": "kitchen-dining", 
      "Storage & Organization": "storage-organization"
    }
  },
  { 
    id: 2, 
    name: "Clothing", 
    icon: <FaTshirt size={24} />,
    link: "/products/clothing",
    subcategories: ["Shirt", "Saree", "Kurthi sets", "Pants", "Dhoti", "Dupatta"],
    // Mapping to exact backend enum values
    backendValues: {
      "Shirt": "shirt",
      "Saree": "saree",
      "Kurthi sets": "kurthi-sets",
      "Pants": "pants",
      "Dhoti": "dhoti",
      "Dupatta": "dupatta"
    }
  },
  { 
    id: 3, 
    name: "Handmade Gifts & Personalized Items", 
    icon: <FaGift size={24} />,
    link: "/products/handmade-gifts",
    subcategories: ["Custom Nameplates & Signs", "Engraved Jewelry & Accessories", "Handmade Greeting Cards", "Photo Frames & Personalized Art"],
    // Mapping to exact backend enum values
    backendValues: {
      "Custom Nameplates & Signs": "custom-nameplates",
      "Engraved Jewelry & Accessories": "engraved-jewelry",
      "Handmade Greeting Cards": "handmade-greeting-cards",
      "Photo Frames & Personalized Art": "photo-frames"
    }
  },
  { 
    id: 4, 
    name: "Jewellery", 
    icon: <FaGem size={24} />,
    link: "/products/jewellery",
    subcategories: ["Necklaces", "Earrings", "Bracelets", "Rings"],
    // Mapping to exact backend enum values
    backendValues: {
      "Necklaces": "necklaces",
      "Earrings": "earrings",
      "Bracelets": "bracelets",
      "Rings": "rings"
    }
  },
  { 
    id: 5, 
    name: "Toys", 
    icon: <FaPuzzlePiece size={24} />,
    link: "/products/toys",
    subcategories: ["Action Figures", "Educational Toys", "Stuffed Animals", "Puzzles"],
    // Mapping to exact backend enum values
    backendValues: {
      "Action Figures": "action-figures",
      "Educational Toys": "educational-toys",
      "Stuffed Animals": "stuffed-animals",
      "Puzzles": "puzzles"
    }
  },
  { 
    id: 6, 
    name: "Bath & Beauty", 
    icon: <FaSoap size={24} />,
    link: "/products/bath-beauty",
    subcategories: ["Handmade Soaps", "Skincare Products", "Haircare Products", "Aromatherapy & Essential Oils"],
    // Mapping to exact backend enum values
    backendValues: {
      "Handmade Soaps": "handmade-soaps",
      "Skincare Products": "skincare-products",
      "Haircare Products": "haircare-products",
      "Aromatherapy & Essential Oils": "aromatherapy-essential-oils"
    }
  },
  { 
    id: 7, 
    name: "Art", 
    icon: <FaPaintBrush size={24} />,
    link: "/products/art",
    subcategories: ["Paintings & Drawings", "Sculptures", "Handmade Prints", "Handcrafted Cards & Stationery"],
    // Mapping to exact backend enum values
    backendValues: {
      "Paintings & Drawings": "paintings-drawings",
      "Sculptures": "sculptures",
      "Handmade Prints": "handmade-prints",
      "Handcrafted Cards & Stationery": "handcrafted-cards-stationery"
    }
  },
  { 
    id: 8, 
    name: "Accessories", 
    icon: <FaShoppingBag size={24} />,
    link: "/products/accessories",
    subcategories: ["Bags & Purses", "Footwear", "Hats & Hair Accessories"],
    // Mapping to exact backend enum values
    backendValues: {
      "Bags & Purses": "bags-purses",
      "Footwear": "footwear",
      "Hats & Hair Accessories": "hats-hair-accessories"
    }
  },
];

const ImageList = [
  {
    id: 1,
    img: Image1,
    title: "Up to 50% Off on All Handcrafted Clothing!",
    description:
    "Discover the beauty of artisanal fashion with our handcrafted clothing collection. Shop now and enjoy exclusive discounts for a limited time!",
  },
  {
    id: 2,
    img: Image2,
    title: "30% off on all Handcrafted Items",
    description:
      "Elevate your style with unique handcrafted items. Shop now and enjoy 30% off for a limited time!",
  },
  {
    id: 3,
    img: Image3,
    title: "70% Off on All Handcrafted Jewellery",
    description:
      "Adorn yourself with exquisite handcrafted jewellery. Shop now and enjoy up to 70% off for a limited time!",
  },
];

const Hero = ({ handleOrderPopup }) => {
  const location = useLocation();
  const isHomePage = location.pathname === "/";
  const [activeCategory, setActiveCategory] = useState(null);
  const timeoutRef = useRef(null);
  
  // Clean up timeout on component unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleMouseEnter = (categoryId) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setActiveCategory(categoryId);
  };

  const handleMouseLeave = () => {
    // Set a delay of 300ms before closing the dropdown
    timeoutRef.current = setTimeout(() => {
      setActiveCategory(null);
    }, 300);
  };
  
  var settings = {
    dots: false,
    arrows: false,
    infinite: true,
    speed: 800,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 4000,
    cssEase: "ease-in-out",
    pauseOnHover: false,
    pauseOnFocus: true,
  };

  return (
    <div className="bg-gray-100 dark:bg-slate-950 dark:text-white duration-200 min-h-[550px] overflow-hidden relative sm:min-h-[650px]">
      {/* Category Icons at top */}
      {isHomePage && (
        <div className="bg-transparent absolute left-0 py-2 right-0 top-0 z-20">
          <div className="container mx-auto">
            <div className="flex justify-around items-center">
              {ProductCategories.map((category) => (
                <div 
                  key={category.id} 
                  className="relative"
                  onMouseEnter={() => handleMouseEnter(category.id)}
                  onMouseLeave={handleMouseLeave}
                >
                  <Link 
                    to={category.link} 
                    className="flex justify-center p-3 rounded-full dark:hover:bg-gray-700 duration-200 hover:bg-gray-100 items-center transition"
                    title={category.name}
                    aria-label={category.name}
                  >
                    <div className="text-2xl text-gray-700 dark:text-gray-300 hover:text-primary transition-colors">
                      {React.cloneElement(category.icon, { size: 28 })}
                    </div>
                  </Link>
                  
                  {activeCategory === category.id && (
                    <div 
                      className="bg-white border border-gray-100 rounded-md shadow-lg -translate-x-1/2 absolute dark:bg-gray-800 dark:border-gray-700 left-1/2 min-w-[220px] mt-2 top-full transform z-50"
                      onMouseEnter={() => handleMouseEnter(category.id)}
                      onMouseLeave={handleMouseLeave}
                    >
                      <div className="border-b border-gray-200 dark:border-gray-700 mb-1 px-4 py-2">
                        <span className="flex font-medium gap-2 items-center">
                          <span className="text-primary">{category.icon}</span>
                          {category.name}
                        </span>
                      </div>
                      <ul className="py-2">
                        {category.subcategories.map((subcategory, index) => {
                          // Get the exact backend enum value for the subcategory
                          const backendValue = category.backendValues[subcategory] || 
                            subcategory.toLowerCase().replace(/\s+/g, '-').replace(/&/g, '-').replace(/\//g, '-');

                          return (
                            <li key={index}>
                              <Link 
                                to={`${category.link}?subcategory=${backendValue}`}
                                className="text-sm block dark:hover:bg-gray-700 hover:bg-gray-100 px-4 py-2"
                              >
                                {subcategory}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Background pattern */}
      <div className="bg-primary/40 h-[700px] rounded-3xl w-[700px] -top-1/2 -z[8] absolute right-0 rotate-45"></div>

      {/* Hero section */}
      <div className="container flex h-full justify-center items-center pb-8 pt-20">
        <Slider {...settings} className="w-full">
          {ImageList.map((data) => (
            <div key={data.id}>
              <div className="grid grid-cols-1 sm:grid-cols-2">
                {/* Text content section */}
                <div className="flex flex-col order-2 justify-center text-center gap-4 pt-12 relative sm:order-1 sm:pt-0 sm:text-left z-10">
                  <h1
                    data-aos="zoom-out"
                    data-aos-duration="500"
                    data-aos-once="true"
                    className="text-5xl font-bold lg:text-7xl sm:text-6xl"
                  >
                    {data.title}
                  </h1>
                  <p
                    data-aos="fade-up"
                    data-aos-duration="500"
                    data-aos-delay="100"
                    className="text-sm"
                  >
                    {data.description}
                  </p>
                  <div
                    data-aos="fade-up"
                    data-aos-duration="500"
                    data-aos-delay="300"
                  >
                    <Link
                      to="/products/home-living"
                      className="bg-gradient-to-r rounded-full text-white duration-200 from-primary hover:scale-105 px-4 py-2 to-secondary inline-flex items-center"
                    >
                      View Details
                    </Link>
                  </div>
                </div>

                {/* Image section */}
                <div className="order-1 sm:order-2">
                  <div
                    data-aos="zoom-in"
                    data-aos-once="true"
                    className="relative z-10"
                  >
                    <img
                      src={data.img}
                      alt={data.title}
                      className="h-[300px] w-[300px] lg:scale-120 mx-auto object-contain sm:h-[450px] sm:scale-105 sm:w-[450px]"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </Slider>
      </div>
    </div>
  );
};

export default Hero;
