import { useState, useEffect } from "react";
import Img1 from "../../assets/shirt/silver.jpg";
import Img2 from "../../assets/shirt/gold.jpg";
import Img3 from "../../assets/shirt/kurthi.jpg";
import { FaStar } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const ProductsData = [
  {
    id: "67e58b1be3fb2e94970b0c05",
    img: Img1,
    title: "Grandmaster Wooden Chess Set",
    description: "A beautifully handcrafted wooden chess set with premium piece",
  },
  {
    id: "67e58bbbe3fb2e94970b0c56",
    img: Img2,
    title: "Royal Pearl Gold Necklace",
    description: "A luxurious gold necklace with intricate traditional Indian design",
  },
  {
    id: "67e3cea357f222e469f6e691",
    img: Img3,
    title: "Kurti Set With Dupatta",
    description: "Pink embroidered Kurti with Trousers with dupatta",
  },
];

const TopProducts = () => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleProductClick = (productId) => {
    navigate(`/product/${productId}`);
  };

  const renderStarRating = (count = 4) => {
    return (
      <div className="flex justify-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <FaStar 
            key={star}
            className={`${star <= count ? "text-yellow-500" : "text-gray-300"} text-lg`} 
          />
        ))}
      </div>
    );
  };

  return (
    <div className="py-20 bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-950">
      <div className="container mx-auto px-6">
        {/* Header section */}
        <div className="mb-16 max-w-3xl">
          <div className="inline-block px-3 py-1 bg-primary/10 rounded-full mb-2">
            <p data-aos="fade-up" className="text-sm text-primary font-medium">
              Handpicked for You
            </p>
          </div>
          <h1 
            data-aos="fade-up" 
            className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent"
          >
            Best Products
          </h1>
          <p data-aos="fade-up" className="text-gray-600 dark:text-gray-400 max-w-2xl leading-relaxed">
            Welcome to our handcrafted store, where tradition meets elegance. Discover unique, artisan-made pieces designed with precision and care
          </p>
        </div>

        {/* Body section */}
        <div 
          className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 transition-all duration-700 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
        >
          {ProductsData.map((data, index) => (
            <div
              key={data.id}
              data-aos="zoom-in"
              data-aos-delay={index * 100}
              className="rounded-2xl bg-white dark:bg-gray-800 hover:bg-gradient-to-br from-black/90 to-gray-800/90 dark:hover:bg-primary relative shadow-xl hover:shadow-2xl transition-all duration-500 group overflow-hidden cursor-pointer"
              onClick={() => handleProductClick(data.id)}
            >
              {/* Image container */}
              <div className="h-64 w-full relative overflow-hidden bg-gray-100 dark:bg-gray-700">
                <img
                  src={data.img}
                  alt={data.title}
                  className="w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-105"
                  style={{ objectPosition: 'center' }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://via.placeholder.com/300x300?text=Image+Not+Available';
                  }}
                />
              </div>

              {/* Details section */}
              <div className="p-6 text-center relative z-10">
                {/* Star rating */}
                {renderStarRating()}
                
                <h1 className="text-xl font-bold my-3 group-hover:text-white transition-colors duration-300">
                  {data.title}
                </h1>
                
                <p className="text-gray-500 group-hover:text-gray-300 transition-colors duration-300 text-sm leading-relaxed mb-6 line-clamp-2">
                  {data.description}
                </p>
                
                <button
                  className="bg-primary hover:scale-105 duration-300 text-white py-2 px-6 rounded-full group-hover:bg-white group-hover:text-primary transition-colors relative overflow-hidden shadow-md"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleProductClick(data.id);
                  }}
                >
                  <span className="relative z-10">View Details</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-primary to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </button>
              </div>
              
              {/* Bottom decorative accent */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/80 to-blue-600/80 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TopProducts;