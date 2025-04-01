import { useState, useEffect, useRef } from "react";
import {
  FaShoppingCart,
  FaLock,
  FaBars,
  FaTimes,
  FaUserShield,
  FaStore,
  FaBell,
  FaSignOutAlt,
  FaUser,
  FaAngleDown,
  FaShoppingBag,
  FaUserCircle,
  FaExclamationCircle,
} from "react-icons/fa";
import { FiShoppingBag } from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
import DarkMode from "./DarkMode";
import { removeAuthToken, getAuthToken } from "../../utils/auth";
import axiosInstance from "../../axiosInstance";
import styles from './Navbar.module.css';

const Navbar = () => {
  const [mobileMenu, setMobileMenu] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [userRole, setUserRole] = useState('');
  const [profileDropdown, setProfileDropdown] = useState(false);
  const [userName, setUserName] = useState('');
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileDropdown(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Check login status on component mount and when token changes
  useEffect(() => {
    const checkLoginStatus = async () => {
      console.log('Checking login status...');
      const token = getAuthToken();
      console.log('Token:', token);
      setIsLoggedIn(!!token);

      if (token) {
        try {
          const response = await axiosInstance.get('/api/auth/profile');
          if (response.data.success) {
            setUserRole(response.data.user.role);
            setUserName(response.data.user.name || 'User');
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      }
    };

    // Check initial login status
    checkLoginStatus();

    // Listen for login state changes
    window.addEventListener('loginStateChanged', checkLoginStatus);

    // Cleanup event listener
    return () => {
      window.removeEventListener('loginStateChanged', checkLoginStatus);
    };
  }, []);

  // Fetch unread messages count
  useEffect(() => {
    const fetchUnreadMessagesCount = async () => {
      if (!isLoggedIn) {
        setUnreadMessages(0);
        return;
      }
      
      try {
        const response = await axiosInstance.get('/api/chat/unread');
        if (response.data.success) {
          setUnreadMessages(response.data.count);
        }
      } catch (error) {
        console.error('Error fetching unread messages count:', error);
      }
    };
    
    fetchUnreadMessagesCount();
    
    // Setup listener for message updates
    window.addEventListener('messagesUpdated', fetchUnreadMessagesCount);
    
    return () => {
      window.removeEventListener('messagesUpdated', fetchUnreadMessagesCount);
    };
  }, [isLoggedIn]);

  // Fetch cart count
  useEffect(() => {
    const fetchCartCount = async () => {
      if (!isLoggedIn) {
        // For guests, get count from localStorage
        try {
          const guestCart = JSON.parse(localStorage.getItem('guestCartItems') || '[]');
          setCartCount(guestCart.length);
        } catch (error) {
          console.error('Error reading from localStorage:', error);
          setCartCount(0);
        }
        return;
      }
      
      try {
        const response = await axiosInstance.get('/api/cart/count');
        if (response.data.success) {
          setCartCount(response.data.count);
        }
      } catch (error) {
        console.error('Error fetching cart count:', error);
        // If there's a network error, check localStorage for pending items
        if (error.message && error.message.includes('Network Error')) {
          try {
            const guestCart = JSON.parse(localStorage.getItem('guestCartItems') || '[]');
            setCartCount(guestCart.length);
          } catch (localStorageError) {
            console.error('Error reading from localStorage:', localStorageError);
          }
        }
      }
    };
    
    fetchCartCount();
    
    // Setup listener for cart updates
    window.addEventListener('cartUpdated', fetchCartCount);
    
    // Add session expired event listener
    const handleSessionExpired = () => {
      setProfileDropdown(false);
      // Clear user data if session expired
      setUserName("");
      setIsLoggedIn(false);
    };

    window.addEventListener('session-expired', handleSessionExpired);
    
    return () => {
      window.removeEventListener('cartUpdated', fetchCartCount);
      window.removeEventListener('session-expired', handleSessionExpired);
    };
  }, [isLoggedIn]);

  const handleLogout = () => {
    // Use the removeAuthToken utility function to clear all tokens
    removeAuthToken();
    
    setIsLoggedIn(false);
    setUserRole(''); // Clear user role on logout
    setProfileDropdown(false); // Close dropdown
    // Dispatch login state change event
    window.dispatchEvent(new Event('loginStateChanged'));
    // Reset cart count
    setCartCount(0);
    // Redirect to home page
    navigate('/');
  };

  const toggleMenu = () => {
    setMobileMenu(!mobileMenu);
  };

  const toggleProfileDropdown = () => {
    setProfileDropdown(!profileDropdown);
  };

  return (
    <div className="relative z-50">
      <div className="bg-white shadow-md dark:bg-slate-800 dark:text-white duration-200">
        <div className="bg-primary/40 py-2">
          <div className="container flex justify-between items-center mx-auto px-4">
            <div className="flex gap-4 items-center">
              <Link to="/" className="flex text-xl font-bold gap-1 items-center">
                <FiShoppingBag size="30" />
                HandCraft Store
              </Link>
            </div>

            <div className="gap-6 hidden items-center sm:flex">
              {userRole !== 'admin' && userRole !== 'seller' && (
                <Link to="/cart" className="flex gap-2 hover:text-primary items-center">
                  <div className="relative">
                    <FaShoppingCart className="text-xl" />
                    {cartCount > 0 && (
                      <span className="flex bg-red-500 border border-white h-5 justify-center rounded-full shadow-sm text-white text-xs w-5 -left-2 -top-2 absolute font-medium items-center">
                        {cartCount > 99 ? '99+' : cartCount}
                      </span>
                    )}
                  </div>
                  <span>Cart</span>
                </Link>
              )}

              {userRole !== 'admin' && (
                <Link to="/messages" className="flex cursor-pointer items-center relative">
                  <div className={`${styles.navIcon} ${unreadMessages > 0 ? styles.hasNewMessage : ''}`}>
                    <FaBell size="20" className="hover:text-primary" />
                    {unreadMessages > 0 && (
                      <span className={styles.unreadBadge}>
                        {unreadMessages > 9 ? '9+' : unreadMessages}
                      </span>
                    )}
                  </div>
                </Link>
              )}

              {isLoggedIn ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={toggleProfileDropdown}
                    className="flex items-center gap-1 hover:text-primary transition-colors"
                  >
                    <FaUserCircle size={20} />
                    <span className="max-w-[100px] truncate">{userName}</span>
                    <FaAngleDown className={`transition-transform duration-200 ${profileDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {/* Profile Dropdown */}
                  {profileDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg overflow-hidden z-20 border border-gray-200 dark:bg-slate-700 dark:border-slate-600">
                      <div className="py-2">
                        <Link 
                          to={userRole === 'seller' ? "/seller/account" : userRole === 'admin' ? "/admin-account" : "/account"} 
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-slate-600"
                          onClick={() => setProfileDropdown(false)}
                        >
                          <FaUser className="mr-2" />
                          Your Account
                        </Link>
                        
                        {userRole !== 'admin' && (
                          <>
                            <Link 
                              to={userRole === 'seller' ? "/seller/orders" : "/orders"} 
                              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-slate-600"
                              onClick={() => setProfileDropdown(false)}
                            >
                              <FaShoppingBag className="mr-2" />
                              {userRole === 'seller' ? 'Manage Orders' : 'Your Orders'}
                            </Link>
                            <Link 
                              to="/contact-us" 
                              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-slate-600"
                              onClick={() => setProfileDropdown(false)}
                            >
                              <FaExclamationCircle className="mr-2" />
                              Contact Support
                            </Link>
                          </>
                        )}
                        
                        <div className="border-t border-gray-200 dark:border-slate-600 my-1"></div>
                        <button
                          onClick={handleLogout}
                          className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:text-red-400 dark:hover:bg-slate-600"
                        >
                          <FaSignOutAlt className="mr-2" />
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link to="/login" className="flex gap-2 hover:text-primary items-center">
                  <FaLock /> Login
                </Link>
              )}
              
              {userRole === 'admin' && (
                <Link to="/Adminpanel" className="flex gap-2 hover:text-primary items-center">
                  <FaUserShield /> Admin
                </Link>
              )}
              {userRole === 'seller' && (
                <Link to="/Seller" className="flex gap-2 hover:text-primary items-center">
                  <FaStore /> Seller
                </Link>
              )}

              <DarkMode />
            </div>

            <button className="text-xl sm:hidden" onClick={toggleMenu}>
              {mobileMenu ? <FaTimes /> : <FaBars />}
            </button>
          </div>
        </div>
      </div>

      {mobileMenu && (
        <div className="bg-white p-4 shadow-md w-full absolute block dark:bg-slate-800 left-0 sm:hidden top-full z-50">
          <ul className="flex flex-col gap-4">
            {userRole !== 'admin' && userRole !== 'seller' && (
              <li>
                <Link to="/cart" className="flex gap-2 hover:text-primary items-center px-4">
                  <div className="flex items-center relative">
                    <FaShoppingCart className="text-lg" />
                    {cartCount > 0 && (
                      <span className="flex bg-red-500 border border-white h-5 justify-center rounded-full shadow-sm text-white text-xs w-5 -left-2 -top-2 absolute font-medium items-center">
                        {cartCount > 99 ? '99+' : cartCount}
                      </span>
                    )}
                    <span className="ml-2">Cart</span>
                  </div>
                </Link>
              </li>
            )}
            
            {isLoggedIn ? (
              <>
                <li>
                  <Link 
                    to={userRole === 'seller' ? "/seller/account" : userRole === 'admin' ? "/admin-account" : "/account"} 
                    className="flex w-full gap-2 hover:text-primary items-center px-4"
                  >
                    <FaUser /> Your Account
                  </Link>
                </li>
                
                {userRole !== 'admin' && (
                  <>
                    <li>
                      <Link 
                        to={userRole === 'seller' ? "/seller/orders" : "/orders"} 
                        className="flex w-full gap-2 hover:text-primary items-center px-4"
                      >
                        <FaShoppingBag /> {userRole === 'seller' ? 'Manage Orders' : 'Your Orders'}
                      </Link>
                    </li>
                    <li>
                      <Link 
                        to="/contact-us" 
                        className="flex w-full gap-2 hover:text-primary items-center px-4"
                      >
                        <FaExclamationCircle /> Contact Support
                      </Link>
                    </li>
                  </>
                )}
                
                <li>
                  <button
                    onClick={handleLogout}
                    className="flex w-full gap-2 text-red-600 dark:text-red-400 items-center px-4"
                  >
                    <FaSignOutAlt /> Logout
                  </button>
                </li>
              </>
            ) : (
              <li>
                <Link to="/login" className="flex gap-2 hover:text-primary items-center px-4">
                  <FaLock /> Login
                </Link>
              </li>
            )}
            
            {userRole === 'admin' && (
              <li>
                <Link to="/Adminpanel" className="flex gap-2 hover:text-primary items-center px-4">
                  <FaUserShield /> Admin
                </Link>
              </li>
            )}
            {userRole === 'seller' && (
              <li>
                <Link to="/Seller" className="flex gap-2 hover:text-primary items-center px-4">
                  <FaStore /> Seller
                </Link>
              </li>
            )}

            <li className="flex gap-2 items-center px-4">
              {userRole !== 'admin' && (
                <Link to="/messages" className="flex w-full gap-2 items-center">
                  <div className={`${styles.navIcon} ${unreadMessages > 0 ? styles.hasNewMessage : ''}`}>
                    <FaBell />
                    {unreadMessages > 0 && (
                      <span className={styles.unreadBadge}>
                        {unreadMessages}
                      </span>
                    )}
                  </div>
                  <span className="ml-2">Messages</span>
                </Link>
              )}
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default Navbar;