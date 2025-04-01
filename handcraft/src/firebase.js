// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCs7aSrKju58bfnBEXwiohTjXZ6MJYWUM8",
  authDomain: "ecommerce-platform-f7fd7.firebaseapp.com",
  projectId: "ecommerce-platform-f7fd7",
  storageBucket: "ecommerce-platform-f7fd7.firebasestorage.app",
  messagingSenderId: "44951406651",
  appId: "1:44951406651:web:bc197afe19f04939a6b41e",
  measurementId: "G-K87REZ4WXV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export default app; 