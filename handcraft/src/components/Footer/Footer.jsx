import React from "react";
import { useNavigate } from "react-router-dom";  // ✅ Import useNavigate
import { FiShoppingBag } from "react-icons/fi";
import { FaMapLocationDot } from "react-icons/fa6";
import { FaFacebook, FaInstagram, FaLinkedin, FaInfoCircle } from "react-icons/fa";
import { IoCall } from "react-icons/io5";
import { IoChatbubblesSharp } from "react-icons/io5";
import { MdContactMail } from "react-icons/md";

const Footer = () => {
  const navigate = useNavigate();  // ✅ Initialize useNavigate

  return (
    <footer id="footer" className="text-white bg-[#212529]">
      <div className="container">
        <div data-aos="zoom-in" className="grid md:grid-cols-4 pb-20 pt-5">
          
          {/* Company Details */}
          <div className="py-8 px-4">
            <h1 className="sm:text-3xl text-xl font-bold flex items-center gap-1 mb-3">
              <FiShoppingBag size="30" />
              HandCraft Store
            </h1>
            <p>
              Explore a wide range of handcrafted products made by skilled artisans. Our collection includes home decor, accessories, gifts, and more – all crafted with love and creativity.
            </p>
          </div>
          
          {/* About Us */}
          <div className="py-8 px-4">
            <h1 className="sm:text-xl text-xl font-bold mb-3 flex items-center gap-2">
              <FaInfoCircle size="24" />
              About Us
            </h1>
            <p>
              HandCraft Store is a platform dedicated to promoting handmade crafts and supporting artisans across the country. We believe in preserving traditional crafts while providing artisans with a global marketplace.
            </p>
            <a href="#about" className="mt-3 inline-block text-primary hover:underline transition">
              Learn more about us
            </a>
          </div>

          {/* Chat With Us */}
          <div className="py-8 px-4">
            <h1 className="sm:text-xl text-xl font-bold mb-3 flex items-center gap-2">
              <IoChatbubblesSharp size="24" />
              Chat With Us
            </h1>
            <p>Need help? Our support team is available to assist you with your orders and inquiries.</p>
            <br />
            {/* Redirect to Seller Registration Page */}
            <button 
              onClick={() => navigate("/seller-registration")} 
              className="mt-3 inline-block bg-primary px-4 py-2 text-white rounded-md hover:bg-opacity-80 transition"
            >
              Seller Registration
            </button>
          </div>

          {/* Contact Us */}
          <div className="py-8 px-4">
            <h1 className="sm:text-xl text-xl font-bold mb-3 flex items-center gap-2">
              <MdContactMail size="24" />
              Contact Us
            </h1>
            <p>Have questions or feedback? We'd love to hear from you!</p>
            <div className="mt-3">
              <div className="flex items-center gap-3">
                <FaMapLocationDot />
                <p>ICT, Kerala</p>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <IoCall />
                <p>+91 2255660434 </p>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <a href="#" aria-label="Instagram">
                <FaInstagram className="text-2xl hover:text-primary transition" />
              </a>
              <a href="#" aria-label="Facebook">
                <FaFacebook className="text-2xl hover:text-primary transition" />
              </a>
              <a href="#" aria-label="LinkedIn">
                <FaLinkedin className="text-2xl hover:text-primary transition" />
              </a>
            </div>
          </div>
        </div>
        {/* Copyright */}
        <div className="text-center py-4 border-t border-gray-700">
          <p>© 2025 HandCraft Store. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;