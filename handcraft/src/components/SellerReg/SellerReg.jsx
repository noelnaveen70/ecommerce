import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FaStore, 
  FaUser, 
  FaEnvelope, 
  FaPhone, 
  FaBuilding, 
  FaMapMarkerAlt,
  FaCheckCircle,
  FaArrowLeft,
  FaLock,
  FaShieldAlt,
  FaBoxOpen,
  FaTruck,
  FaGem,
  FaCreditCard,
  FaTags,
  FaInfoCircle
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./SellerReg.module.css";
import axiosInstance from "../../axiosInstance";

const SellerReg = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    businessName: "",
    businessDescription: "",
    location: "",
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  const totalSteps = 2;
  
  // Field validation
  const validateField = (name, value) => {
    let error = "";
    
    switch(name) {
      case "name":
        if (!value.trim()) error = "Name is required";
        else if (value.length < 3) error = "Name must be at least 3 characters";
        break;
      case "email":
        if (!value) error = "Email is required";
        else if (!/\S+@\S+\.\S+/.test(value)) error = "Email is invalid";
        break;
      case "phone":
        if (!value) error = "Phone number is required";
        else if (!/^\d{10}$/.test(value.replace(/\D/g, ''))) 
          error = "Please enter a valid 10-digit phone number";
        break;
      case "password":
        if (!value) error = "Password is required";
        else if (value.length < 6) error = "Password must be at least 6 characters";
        else if (!/[A-Z]/.test(value)) error = "Password must contain at least one uppercase letter";
        else if (!/[0-9]/.test(value)) error = "Password must contain at least one number";
        break;
      case "confirmPassword":
        if (!value) error = "Please confirm your password";
        else if (value !== formData.password) error = "Passwords do not match";
        break;
      case "businessName":
        if (!value.trim()) error = "Business name is required";
        break;
      case "businessDescription":
        if (!value.trim()) error = "Business description is required";
        else if (value.length < 10) error = "Description must be at least 10 characters";
        break;
      case "location":
        if (!value.trim()) error = "Location is required";
        break;
      default:
        break;
    }
    
    return error;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Special case for confirmPassword - validate both fields
    if (name === "password") {
      const passwordError = validateField(name, value);
      const confirmError = formData.confirmPassword 
        ? validateField("confirmPassword", formData.confirmPassword) 
        : "";
      
      setErrors(prev => ({ 
        ...prev, 
        password: passwordError,
        confirmPassword: confirmError
      }));
    } else if (name === "confirmPassword") {
      const confirmError = validateField(name, value);
      setErrors(prev => ({ ...prev, confirmPassword: confirmError }));
    } else {
      // Validate field on change
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };
  
  const validateForm = () => {
    let valid = true;
    let newErrors = {};
    
    // Determine which fields to validate based on current step
    const fieldsToValidate = currentStep === 1 
      ? ["name", "email", "phone", "password", "confirmPassword"] 
      : ["businessName", "businessDescription", "location"];
    
    fieldsToValidate.forEach(field => {
      const error = validateField(field, formData[field]);
      if (error) {
        newErrors[field] = error;
        valid = false;
      }
    });
    
    setErrors(newErrors);
    return valid;
  };
  
  // Function to move to next step
  const handleNextStep = () => {
    if (validateForm()) {
      setCurrentStep(prev => prev + 1);
    }
  };
  
  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      // Format data according to the backend API structure
      const { confirmPassword, businessName, businessDescription, location, ...personalInfo } = formData;
      
      const dataToSubmit = {
        ...personalInfo,
        phone: personalInfo.phone.replace(/\D/g, ''), // Ensure phone is only digits
        sellerInfo: {
          businessName,
          description: businessDescription,
          location
        }
      };
      
      console.log("Sending seller registration data:", dataToSubmit);
      const response = await axiosInstance.post("/api/auth/seller-register", dataToSubmit);
      console.log("Seller registration successful:", response.data);
      
      // Show success message
      setShowSuccess(true);
      
      // Reset form data
      setFormData({
        name: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
        businessName: "",
        businessDescription: "",
        location: "",
      });
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
      
    } catch (error) {
      console.error("Error registering seller:", error);
      
      // More detailed error logging
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error("Error response data:", error.response.data);
        console.error("Error response status:", error.response.status);
        console.error("Error response headers:", error.response.headers);
      } else if (error.request) {
        // The request was made but no response was received
        console.error("Error request:", error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error("Error message:", error.message);
      }
      
      // Handle validation errors from server
      if (error.response && error.response.data) {
        if (error.response.data.errors) {
          setErrors(error.response.data.errors);
        } else {
          setErrors({ general: error.response.data.message || "Registration failed. Please try again." });
        }
      } else {
        setErrors({ general: "An unexpected error occurred. Please try again later." });
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Progress bar animation variants
  const progressVariants = {
    initial: { width: "0%" },
    animate: { width: `${(currentStep / totalSteps) * 100}%` }
  };
  
  // Form step variants
  const formVariants = {
    hidden: (direction) => ({
      x: direction > 0 ? 200 : -200,
      opacity: 0
    }),
    visible: {
      x: 0,
      opacity: 1,
      transition: { 
        type: "spring",
        stiffness: 300,
        damping: 30
      }
    },
    exit: (direction) => ({
      x: direction > 0 ? -200 : 200,
      opacity: 0,
      transition: { 
        duration: 0.3
      }
    })
  };
  
  // Success message variants
  const successVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { 
        duration: 0.5,
        type: "spring",
        stiffness: 500,
        damping: 25
      }
    }
  };

  // Benefit card variants
  const benefitCardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: 0.3 + (i * 0.1),
        duration: 0.5
      }
    })
  };

  return (
    <div className={styles.container}>
      <div className={styles.innerContainer}>
        <div className={styles.wrapper}>
        
          {/* Left side with gradient and illustration */}
          <motion.div 
            className={styles.leftPanel}
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className={styles.brandLogo}>
              <FaStore className={styles.storeLogo} />
              <h2>HandCraft Marketplace</h2>
            </div>
            
            <div className={styles.illustrationWrapper}>
              <motion.div 
                className={styles.illustration}
                animate={{ 
                  rotateZ: [0, 5, -5, 0],
                  y: [0, -10, 0]
                }}
                transition={{ 
                  duration: 5, 
                  repeat: Infinity,
                  repeatType: "mirror"
                }}
              >
                <FaStore className={styles.storeIcon} />
                <div className={styles.glowEffect}></div>
              </motion.div>
            </div>
            
            <div className={styles.textContent}>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
              >
                Grow Your Craft Business
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
              >
                Join thousands of artisans selling their unique handcrafted products worldwide
              </motion.p>
              
              <div className={styles.benefitsGrid}>
                {[
                  { icon: <FaTags />, text: "0% Commission Fee for First Month" },
                  { icon: <FaBoxOpen />, text: "Unlimited Product Listings" },
                  { icon: <FaCreditCard />, text: "Secure Payment Processing" },
                  { icon: <FaTruck />, text: "Shipping & Logistics Support" },
                  { icon: <FaGem />, text: "Premium Seller Dashboard" },
                  { icon: <FaShieldAlt />, text: "Fraud Protection & Support" }
                ].map((benefit, index) => (
                  <motion.div
                    key={index}
                    className={styles.benefitCard}
                    variants={benefitCardVariants}
                    initial="hidden"
                    animate="visible"
                    custom={index}
                  >
                    <div className={styles.benefitIcon}>
                      {benefit.icon}
                    </div>
                    <p>{benefit.text}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right side - Registration form */}
          <motion.div 
            className={styles.rightPanel}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className={styles.formHeader}>
              <motion.button 
                className={styles.backButton}
                onClick={() => navigate('/login')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FaArrowLeft />
              </motion.button>
              <h2>Seller Registration</h2>
            </div>
            
            {/* Progress bar */}
            <div className={styles.progressContainer}>
              <motion.div 
                className={styles.progressBar}
                variants={progressVariants}
                initial="initial"
                animate="animate"
                transition={{ duration: 0.5 }}
              ></motion.div>
              <div className={styles.steps}>
                <span className={currentStep >= 1 ? styles.activeStep : ''}>Personal Info</span>
                <span className={currentStep >= 2 ? styles.activeStep : ''}>Business Details</span>
              </div>
            </div>

            {/* Success message */}
            <AnimatePresence>
              {showSuccess ? (
                <motion.div 
                  className={styles.successMessage}
                  variants={successVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                >
                  <FaCheckCircle className={styles.successIcon} />
                  <h3>Registration Successful!</h3>
                  <p>Your seller account request has been submitted. We&apos;ll redirect you to login in a moment.</p>
                </motion.div>
              ) : (
                <div className={styles.formContainer}>
                  <form onSubmit={handleSubmit}>
                    <AnimatePresence mode="wait" initial={false}>
                      {currentStep === 1 && (
                        <motion.div 
                          className={styles.formStep}
                          key="step1"
                          custom={1}
                          variants={formVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                        >
                          <h3 className={styles.stepTitle}>Personal Information</h3>
                          
                          {errors.general && (
                            <div className={styles.errorMessage}>{errors.general}</div>
                          )}
                          
                          {[
                            { name: "name", type: "text", placeholder: "Full Name", icon: <FaUser /> },
                            { name: "email", type: "email", placeholder: "Email Address", icon: <FaEnvelope /> },
                            { name: "phone", type: "tel", placeholder: "Phone Number", icon: <FaPhone /> },
                            { name: "password", type: "password", placeholder: "Password", icon: <FaLock /> },
                            { name: "confirmPassword", type: "password", placeholder: "Confirm Password", icon: <FaLock /> },
                          ].map((field) => (
                            <div key={field.name} className={styles.inputGroup}>
                              <label className={styles.inputLabel}>{field.placeholder}</label>
                              <div className={styles.inputWrapper}>
                                <span className={styles.inputIcon}>{field.icon}</span>
                                <input
                                  type={field.type}
                                  name={field.name}
                                  value={formData[field.name]}
                                  onChange={handleChange}
                                  className={`${styles.inputField} ${errors[field.name] ? styles.inputError : ''}`}
                                  placeholder={field.placeholder}
                                />
                              </div>
                              {errors[field.name] && (
                                <p className={styles.errorText}>{errors[field.name]}</p>
                              )}
                            </div>
                          ))}
                          
                          <motion.button
                            type="button"
                            className={`${styles.actionButton} ${styles.continueBtn}`}
                            onClick={handleNextStep}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            Continue to Business Details
                          </motion.button>
                        </motion.div>
                      )}
                      
                      {currentStep === 2 && (
                        <motion.div 
                          className={styles.formStep}
                          key="step2"
                          custom={-1}
                          variants={formVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                        >
                          <h3 className={styles.stepTitle}>Business Details</h3>
                          
                          <div className={styles.inputGroup}>
                            <label className={styles.inputLabel}>Business Name</label>
                            <div className={styles.inputWrapper}>
                              <span className={styles.inputIcon}><FaBuilding /></span>
                              <input
                                type="text"
                                name="businessName"
                                value={formData.businessName}
                                onChange={handleChange}
                                className={`${styles.inputField} ${errors.businessName ? styles.inputError : ''}`}
                                placeholder="Business Name"
                              />
                            </div>
                            {errors.businessName && (
                              <p className={styles.errorText}>{errors.businessName}</p>
                            )}
                          </div>
                          
                          <div className={styles.inputGroup}>
                            <label className={styles.inputLabel}>Business Description</label>
                            <div className={styles.textareaWrapper}>
                              <span className={styles.inputIcon}><FaInfoCircle /></span>
                              <textarea
                                name="businessDescription"
                                value={formData.businessDescription}
                                onChange={handleChange}
                                className={`${styles.textareaField} ${errors.businessDescription ? styles.inputError : ''}`}
                                placeholder="Describe your business and products..."
                                rows={4}
                              ></textarea>
                            </div>
                            {errors.businessDescription && (
                              <p className={styles.errorText}>{errors.businessDescription}</p>
                            )}
                          </div>
                          
                          <div className={styles.inputGroup}>
                            <label className={styles.inputLabel}>Location</label>
                            <div className={styles.inputWrapper}>
                              <span className={styles.inputIcon}><FaMapMarkerAlt /></span>
                              <input
                                type="text"
                                name="location"
                                value={formData.location}
                                onChange={handleChange}
                                className={`${styles.inputField} ${errors.location ? styles.inputError : ''}`}
                                placeholder="Location"
                              />
                            </div>
                            {errors.location && (
                              <p className={styles.errorText}>{errors.location}</p>
                            )}
                          </div>
                          
                          <div className={styles.buttonGroup}>
                            <motion.button
                              type="button"
                              className={`${styles.actionButton} ${styles.continueBtn}`}
                              onClick={prevStep}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              Back
                            </motion.button>
                            
                            <motion.button
                              type="submit"
                              className={`${styles.actionButton} ${styles.continueBtn}`}
                              disabled={isSubmitting}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              {isSubmitting ? "Registering..." : "Register"}
                            </motion.button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </form>
                </div>
              )}
            </AnimatePresence>
            
            <div className={styles.formFooter}>
              <p>
                Already have an account?{' '}
                <motion.a 
                  href="/login" 
                  className={styles.loginLink}
                  whileHover={{ scale: 1.03 }}
                >
                  Login
                </motion.a>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default SellerReg;