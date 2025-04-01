import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Image1 from "../../assets/front/login.png"; 
import Image2 from "../../assets/front/signup.png";
import styles from "./Login.module.css"; 
import "@fortawesome/fontawesome-free/css/all.min.css";
import axiosInstance from "../../axiosInstance";
import Snackbar from "../Snackbar/Snackbar";
import { setAuthToken } from "../../utils/auth";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../../firebase";
import { FaStore } from "react-icons/fa";
import { motion } from "framer-motion";

const Login = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const [snackbar, setSnackbar] = useState({ show: false, message: "", type: "" });

  // Check for pre-filled email from registration
  useEffect(() => {
    const state = location.state;
    if (state?.registeredEmail) {
      setEmail(state.registeredEmail);
      setIsSignUp(false);
    }
  }, [location]);

  const showSnackbar = (message, type) => {
    setSnackbar({ show: true, message, type });
  };

  // Handler for redirecting to seller registration
  const handleSellerRegRedirect = () => {
    navigate('/seller-registration');
  };

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Extract relevant user info
      const userData = {
        username: user.displayName || user.email.split('@')[0],
        email: user.email,
        profilePicture: user.photoURL,
        googleId: user.uid
      };
      
      try {
        // Send user data to backend
        const response = await axiosInstance.post("/api/auth/google-login", userData);
        
        if (response.data.success) {
          // Store the token
          setAuthToken(response.data.token, false);
          
          // Dispatch login state change event
          window.dispatchEvent(new Event('loginStateChanged'));
          
          // Attempt to sync guest cart with user cart
          try {
            const guestCartItems = JSON.parse(localStorage.getItem('cart') || '[]');
            if (guestCartItems.length > 0) {
              await axiosInstance.post('/api/cart/sync', { guestCartItems });
              localStorage.removeItem('cart');
            }
          } catch (syncError) {
            console.error("Cart sync error:", syncError);
          }
          
          showSnackbar("Google login successful!", "success");
          
          // Check if we need to redirect to checkout
          const redirectToCheckout = localStorage.getItem('redirectToCheckout');
          if (redirectToCheckout === 'true') {
            localStorage.removeItem('redirectToCheckout');
            navigate('/checkout');
          } else {
            navigate('/');
          }
        } else {
          showSnackbar(response.data.message || "Login failed. Please try again.", "error");
        }
      } catch (dbError) {
        console.error("Error during Google login:", dbError);
        
        let errorMessage = "Login failed. Please try again.";
        if (dbError.response?.data?.message) {
          errorMessage = dbError.response.data.message;
          if (dbError.response.data.reason) {
            errorMessage += `\nReason: ${dbError.response.data.reason}`;
          }
        }
        
        showSnackbar(errorMessage, "error");
      }
    } catch (error) {
      console.error("Google sign in error:", error);
      
      // Handle specific Firebase errors
      let errorMessage = "Google login failed. Please try again.";
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = "Login cancelled. Please try again.";
      } else if (error.code === 'auth/cancelled-popup-request') {
        errorMessage = "Another login popup is already open.";
      }
      
      showSnackbar(errorMessage, "error");
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axiosInstance.post("/api/auth/login", { email, password });
      
      if (response.data && response.data.token) {
        setAuthToken(response.data.token);
        
        // Attempt to sync guest cart with user cart
        try {
          const guestCartItems = JSON.parse(localStorage.getItem('cart') || '[]');
          if (guestCartItems.length > 0) {
            await axiosInstance.post('/api/cart/sync', { guestCartItems });
            // Clear guest cart after successful sync
            localStorage.removeItem('cart');
          }
        } catch (syncError) {
          console.error("Cart sync error:", syncError);
          // Continue with login process even if sync fails
        }
        
        // Notify components that login state changed
        window.dispatchEvent(new Event('loginStateChanged'));
        showSnackbar("Login successful!", "success");
        
        // Check if we need to redirect to checkout
        const redirectToCheckout = localStorage.getItem('redirectToCheckout');
        if (redirectToCheckout === 'true') {
          localStorage.removeItem('redirectToCheckout');
          navigate('/checkout');
        } else {
          navigate('/');
        }
      }
    } catch (err) {
      console.error("Login error:", err);
      let errorMessage = "Invalid login credentials";
      let errorDetails = null;
      
      if (err.response && err.response.data) {
        // Check if there's a specific message
        if (err.response.data.message) {
          errorMessage = err.response.data.message;
          
          // If there's a reason field as well (for suspension or rejection)
          if (err.response.data.reason) {
            errorDetails = err.response.data.reason;
          }
        }
      }
      
      // Show error with formatted details if available
      if (errorDetails) {
        showSnackbar(`${errorMessage}\nReason: ${errorDetails}`, "error");
      } else {
        showSnackbar(errorMessage, "error");
      }
    }
  };
  
  const handleSignUp = async (e) => {
    e.preventDefault();
    try {
      // Validate password length before sending to server
      if (password.length < 6) {
        showSnackbar("Password must be at least 6 characters", "error");
        return;
      }
      
      const response = await axiosInstance.post("/api/auth/register", { name: username, email, password });
      if (response.data.token) {
        setAuthToken(response.data.token, false);
        window.dispatchEvent(new Event('loginStateChanged'));
        showSnackbar("Registration successful! Please login.", "success");
        setUsername("");
        setPassword("");
        navigate("/login", { state: { registeredEmail: email } });
      }
    } catch (error) {
      console.error("Registration error:", error);
      // Extract and display specific error message from the server response
      let errorMessage = "Registration failed. Please try again.";
      
      if (error.response && error.response.data) {
        // Check for the new error format
        if (error.response.data.errors && Object.keys(error.response.data.errors).length > 0) {
          // Get the first validation error
          const firstErrorKey = Object.keys(error.response.data.errors)[0];
          errorMessage = error.response.data.errors[firstErrorKey];
        }
        // Check for message field
        else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        }
        // Fall back to the error field
        else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        }
      }
      
      showSnackbar(errorMessage, "error");
    }
  };

  return (
    <div className={`${styles.container} ${isSignUp ? styles["sign-up-mode"] : ""}`}>
      {snackbar.show && (
        <Snackbar
          message={snackbar.message}
          type={snackbar.type}
          onClose={() => setSnackbar({ ...snackbar, show: false })}
        />
      )}
      <div className={styles["forms-container"]}>
        <div className={styles["signin-signup"]}>
          {/* Sign In Form */}
          <form onSubmit={handleLogin} className={styles["sign-in-form"]}>
            <h2 className={styles.title}>Sign in</h2>
            <div className={styles["input-field"]}>
              <i className="fa-user fas"></i>
              <input type="email" placeholder="Email ID" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className={styles["input-field"]}>
              <i className="fa-lock fas"></i>
              <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <input type="submit" value="Login" className={`${styles.btn} ${styles.solid}`} />
            
            <p className={styles["social-text"]}>Or Sign in with social platforms</p>
            <div className={styles["social-media"]}>
              <button type="button" onClick={handleGoogleSignIn} className={styles["social-icon"]}>
                <i className="fa-google fab"></i>
              </button>
            </div>

            <p className={styles["forgot-password"]}>
              <Link to="/forgot">Forgot Password?</Link>
            </p>
            
            {/* Improved Seller Registration Button */}
            <motion.button
              type="button"
              onClick={handleSellerRegRedirect}
              className={styles["seller-button"]}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
              <FaStore className={styles["seller-icon"]} />
              <span>Register as Seller</span>
            </motion.button>
          </form>

          {/* Sign Up Form */}
          <form onSubmit={handleSignUp} className={styles["sign-up-form"]}>
            <h2 className={styles.title}>Sign up</h2>
            <div className={styles["input-field"]}>
              <i className="fa-user fas"></i>
              <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>
            <div className={styles["input-field"]}>
              <i className="fa-envelope fas"></i>
              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className={styles["input-field"]}>
              <i className="fa-lock fas"></i>
              <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <input type="submit" className={styles.btn} value="Sign up" />
            
            <p className={styles["social-text"]}>Or Sign up with social platforms</p>
            <div className={styles["social-media"]}>
              <button type="button" onClick={handleGoogleSignIn} className={styles["social-icon"]}>
                <i className="fa-google fab"></i>
              </button>
            </div>
            
            {/* Improved Seller Registration Button */}
            <motion.button
              type="button"
              onClick={handleSellerRegRedirect}
              className={styles["seller-button"]}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
              <FaStore className={styles["seller-icon"]} />
              <span>Register as Seller</span>
            </motion.button>
          </form>
        </div>
      </div>

      {/* Panels Section */}
      <div className={styles["panels-container"]}>
        <div className={`${styles.panel} ${styles["left-panel"]}`}>
          <div className={styles.content}>
            <h3>New here?</h3>
            <p>Join us today and explore great opportunities!</p>
            <button className={`${styles.btn} ${styles.transparent}`} onClick={() => setIsSignUp(true)}>
              Sign up
            </button>
          </div>
          <img src={Image1} className={styles.image} alt="Sign Up Illustration" />
        </div>
        <div className={`${styles.panel} ${styles["right-panel"]}`}>
          <div className={styles.content}>
            <h3>One of us?</h3>
            <p>Welcome back! Sign in to continue.</p>
            <button className={`${styles.btn} ${styles.transparent}`} onClick={() => setIsSignUp(false)}>
              Sign in
            </button>
          </div>
          <img src={Image2} className={styles.image} alt="Sign In Illustration" />
        </div>
      </div>
    </div>
  );
};

export default Login;
