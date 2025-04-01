import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import styles from "./Forget.module.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import axiosInstance from "../../axiosInstance";
import { motion, AnimatePresence } from "framer-motion";

const ForgetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [timer, setTimer] = useState(0);
  const [otpId, setOtpId] = useState("");
  const isFromProfile = location.search.includes("from=profile");

  // Request OTP
  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      const response = await axiosInstance.post("/api/auth/request-password-reset", { email });
      
      if (response.data.success) {
        setOtpId(response.data.otpId);
        setStep(2);
        setSuccess("OTP sent to your email address.");
        setTimer(180);
        const interval = setInterval(() => {
          setTimer(prevTimer => {
            if (prevTimer <= 1) {
              clearInterval(interval);
              return 0;
            }
            return prevTimer - 1;
          });
        }, 1000);
      } else {
        setError(response.data.message || "Failed to send OTP. Please try again.");
      }
    } catch (err) {
      console.error("Error requesting OTP:", err);
      setError(err.response?.data?.message || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      const response = await axiosInstance.post("/api/auth/verify-otp", { 
        email,
        otp,
        otpId
      });
      
      if (response.data.success) {
        setStep(3);
        setSuccess("OTP verified successfully. Set your new password.");
      } else {
        setError(response.data.message || "Invalid OTP. Please try again.");
      }
    } catch (err) {
      console.error("Error verifying OTP:", err);
      setError(err.response?.data?.message || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    
    setError("");
    setLoading(true);
    
    try {
      const response = await axiosInstance.post("/api/auth/reset-password", { 
        email,
        newPassword,
        otp,
        otpId
      });
      
      if (response.data.success) {
        setSuccess("Password reset successfully! Please login with your new password.");
        
        // Clear auth token and user data
        localStorage.removeItem('authToken');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userId');
        
        // Clear any other stored data
        sessionStorage.clear();
        
        // Redirect to login page after a short delay
        setTimeout(() => {
          navigate("/login", { 
            state: { 
              message: "Password reset successful. Please login with your new password.",
              from: "reset"
            }
          });
        }, 2000);
      } else {
        setError(response.data.message || "Failed to reset password. Please try again.");
      }
    } catch (err) {
      console.error("Error resetting password:", err);
      setError(err.response?.data?.message || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleResendOTP = () => {
    handleRequestOTP({ preventDefault: () => {} });
  };

  const formVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };

  return (
    <div className={styles.container}>
      <div className={styles["forms-container"]}>
        <div className={styles["form-header"]}>
          <h1 className={styles["brand-title"]}>HandCraft</h1>
          <p className={styles["brand-subtitle"]}>Reset Your Password</p>
        </div>
        
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            className={styles["form-wrapper"]}
            variants={formVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            {/* Step 1: Email Entry */}
            {step === 1 && (
              <form onSubmit={handleRequestOTP}>
                <h2 className={styles.title}>{isFromProfile ? "Change Password" : "Forgot Password?"}</h2>
                <p className={styles.description}>
                  {isFromProfile 
                    ? "To change your password, we'll send a verification code to your email." 
                    : "Enter your registered email address and we'll send you a verification code."}
                </p>
                
                {error && <div className={styles.error}>{error}</div>}
                {success && <div className={styles.success}>{success}</div>}
                
                <div className={styles["input-field"]}>
                  <i className="fas fa-envelope"></i>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                
                <button 
                  type="submit" 
                  className={styles.btn}
                  disabled={loading}
                >
                  {loading ? "Sending..." : "Send Verification Code"}
                </button>
                
                <div className={styles["back-to-login"]}>
                  <Link to="/login">Back to Login</Link>
                </div>
              </form>
            )}
            
            {/* Step 2: OTP Verification */}
            {step === 2 && (
              <form onSubmit={handleVerifyOTP}>
                <h2 className={styles.title}>Verify OTP</h2>
                <p className={styles.description}>
                  Enter the verification code sent to your email ({email}).
                  {timer > 0 && <span className={styles.timer}> Time remaining: {formatTime(timer)}</span>}
                </p>
                
                {error && <div className={styles.error}>{error}</div>}
                {success && <div className={styles.success}>{success}</div>}
                
                <div className={styles["input-field"]}>
                  <i className="fas fa-lock"></i>
                  <input
                    type="text"
                    placeholder="Enter verification code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                  />
                </div>
                
                <button 
                  type="submit" 
                  className={styles.btn}
                  disabled={loading || timer === 0}
                >
                  {loading ? "Verifying..." : "Verify Code"}
                </button>
                
                {timer === 0 && (
                  <button 
                    type="button" 
                    className={styles.linkBtn}
                    onClick={handleResendOTP}
                  >
                    Resend Code
                  </button>
                )}
                
                <div className={styles["back-to-login"]}>
                  <button 
                    type="button"
                    className={styles.linkBtn}
                    onClick={() => setStep(1)}
                  >
                    Change Email
                  </button>
                </div>
              </form>
            )}
            
            {/* Step 3: New Password */}
            {step === 3 && (
              <form onSubmit={handleResetPassword}>
                <h2 className={styles.title}>Reset Password</h2>
                <p className={styles.description}>
                  Create a new password for your account.
                </p>
                
                {error && <div className={styles.error}>{error}</div>}
                {success && <div className={styles.success}>{success}</div>}
                
                <div className={styles["input-field"]}>
                  <i className="fas fa-lock"></i>
                  <input
                    type="password"
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                
                <div className={styles["input-field"]}>
                  <i className="fas fa-lock"></i>
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                
                <button 
                  type="submit" 
                  className={styles.btn}
                  disabled={loading}
                >
                  {loading ? "Resetting..." : "Reset Password"}
                </button>
              </form>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ForgetPassword;
