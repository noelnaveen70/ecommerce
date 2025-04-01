import axios from 'axios';
import { getAuthToken, removeAuthToken } from './utils/auth';

// Create axios instance with base URL
const axiosInstance = axios.create({
  baseURL: 'http://localhost:7777/',
  timeout: 10000, // 10 second timeout
});

// Keep track of retry attempts
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    // Try to get the token from storage
    try {
      const token = getAuthToken();
      
      // If we have a token, add it to the request
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('Token found and added to request.');
      } else {
        console.log('No authentication token found.');
      }
    } catch (error) {
      console.error('Error accessing auth token:', error);
    }
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Check if error is due to unauthorized (401) and we haven't already tried to refresh
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      // If we're not already refreshing tokens, try to refresh
      if (!isRefreshing) {
        isRefreshing = true;
        originalRequest._retry = true;
        
        // For now, we'll just clear the token and reject
        // In a real implementation, you would try to refresh the token here
        console.log('Unauthorized request. Clearing auth token.');
        removeAuthToken();
        
        // Notify user of session expiration
        if (window && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('session-expired'));
        }
        
        // Process failed requests
        processQueue(new Error('Session expired'));
        isRefreshing = false;
        
        // Redirect to login if not already there
        if (window.location.pathname !== '/login') {
          const redirectPath = window.location.pathname;
          window.location.href = `/login?redirect=${encodeURIComponent(redirectPath)}`;
        }
        
        return Promise.reject(error);
      } else {
        // If we're already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return axiosInstance(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;