import axios from 'axios';

const API_URL = 'https://nine-c20e.onrender.com/api';
// const API_URL = 'http://127.0.0.1:5000/api'; // Local development URL

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Function to handle logout with enhanced security messaging
const handleLogout = () => {
  console.log('🔓 Session expired - logging user out for security');
  
  // Clear all stored data
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  
  // Show security-focused message
  const message = '🔒 Session expired for security. Please log in again.';
  
  // Create and show a security-focused alert
  const alertDiv = document.createElement('div');
  alertDiv.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      background: #fef3c7;
      border: 1px solid #f59e0b;
      color: #92400e;
      padding: 12px 16px;
      border-radius: 8px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      z-index: 9999;
      max-width: 320px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
    ">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 16px;">🔒</span>
        <span>Session expired for security. Redirecting...</span>
      </div>
    </div>
  `;
  document.body.appendChild(alertDiv);
  
  // Remove alert after 3 seconds
  setTimeout(() => {
    if (alertDiv && alertDiv.parentNode) {
      alertDiv.parentNode.removeChild(alertDiv);
    }
  }, 3000);
  
  // Redirect to login page
  setTimeout(() => {
    window.location.href = '/login';
  }, 1000);
};

// Track token expiry warnings
let tokenWarningShown = false;

// Function to show token expiry warning (5 minutes before expiry)
const showExpiryWarning = () => {  
  if (tokenWarningShown) return;
  tokenWarningShown = true;
  
  const warningDiv = document.createElement('div');
  warningDiv.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      background: #fef3c7;
      border: 1px solid #f59e0b;
      color: #92400e;
      padding: 12px 16px;
      border-radius: 8px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      z-index: 9999;
      max-width: 350px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
    ">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <span style="font-size: 16px;">⚠️</span>
        <span style="font-weight: 600;">Session Expiring Soon</span>
      </div>
      <div style="font-size: 12px; margin-bottom: 8px;">
        Your session will expire in 5 minutes for security.
      </div>
      <button onclick="this.parentElement.parentElement.remove()" 
              style="
                background: #f59e0b; 
                color: white; 
                border: none; 
                padding: 4px 8px; 
                border-radius: 4px; 
                font-size: 12px;
                cursor: pointer;
              ">
        OK
      </button>
    </div>
  `;
  document.body.appendChild(warningDiv);
  
  // Auto-remove after 10 seconds
  setTimeout(() => {
    if (warningDiv && warningDiv.parentNode) {
      warningDiv.parentNode.removeChild(warningDiv);
    }
  }, 10000);
};

// Check token expiry and show warnings
const checkTokenExpiry = () => {
  const token = localStorage.getItem('token');
  if (!token) return;
  
  try {
    // Decode JWT payload (simple base64 decode)
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiryTime = payload.exp * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    const timeUntilExpiry = expiryTime - currentTime;
    
    // Show warning 5 minutes (300,000 ms) before expiry
    if (timeUntilExpiry > 0 && timeUntilExpiry <= 300000 && !tokenWarningShown) {
      showExpiryWarning();
    }
  } catch (error) {
    console.log('Could not decode token for expiry check');
  }
};

// Check token expiry every minute
setInterval(checkTokenExpiry, 60000);

// Add a request interceptor to add auth token to requests
axiosInstance.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method.toUpperCase()} request to: ${config.url}`);
    
    // Skip auth header for auth routes except change-password and refresh
    const noAuthRoutes = ['/auth/login', '/auth/register', '/auth/verify-otp', '/auth/resend-otp'];
    if (noAuthRoutes.some(route => config.url.includes(route))) {
      console.log('Skipping auth header for auth route');
      return config;
    }
    
    const token = localStorage.getItem('token');
    if (token) {
      console.log('Adding token to request headers');
      config.headers['Authorization'] = `Bearer ${token}`;
    } else {
      console.log('No token available for request');
    }
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle token expiry and auto logout
axiosInstance.interceptors.response.use(
  (response) => {
    console.log(`Request to ${response.config.url} successful with status: ${response.status}`);
    return response;
  },
  async (error) => {
    if (!error.response) {
      console.error('Network error:', error.message);
      return Promise.reject(error);
    }
    
    console.log(`Error ${error.response.status} for request to: ${error.config.url}`);
    console.log('Error response data:', error.response.data);
    
    // Check for token expiry conditions - Enhanced for high security
    const status = error.response.status;
    const errorData = error.response.data || {};
    const errorMessage = (errorData.error || errorData.message || '').toLowerCase();
    const errorCode = errorData.code;
    
    // Multiple ways to detect token expiry (enhanced for 15-minute tokens):
    const isTokenExpired = 
      status === 401 && (
        // Direct token expiry messages
        errorMessage.includes('token has expired') ||
        errorMessage.includes('expired') ||
        errorMessage.includes('token is expired') ||
        errorCode === 'token_expired' ||
        // JWT specific errors
        errorMessage.includes('jwt expired') ||
        errorMessage.includes('token expired') ||
        // Authorization errors that likely mean expired token
        errorMessage.includes('authorization header is missing') ||
        errorMessage.includes('invalid token') ||
        errorMessage.includes('signature verification failed') ||
        // Security check failures
        errorMessage.includes('security check failed') ||
        // Generic unauthorized when we have a token (likely expired)
        (localStorage.getItem('token') && 
         (errorMessage.includes('unauthorized') || 
          errorMessage.includes('invalid') ||
          errorMessage === ''))
      );
    
    // Also check for rate limiting (429 status)
    if (status === 429) {
      const rateLimitMessage = errorData.error || 'Too many requests. Please try again later.';
      console.log('🚫 Rate limit hit:', rateLimitMessage);
      
      // Show rate limit warning
      const alertDiv = document.createElement('div');
      alertDiv.innerHTML = `
        <div style="
          position: fixed;
          top: 20px;
          right: 20px;
          background: #fecaca;
          border: 1px solid #f87171;
          color: #b91c1c;
          padding: 12px 16px;
          border-radius: 8px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          z-index: 9999;
          max-width: 300px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 14px;
        ">
          🚫 ${rateLimitMessage}
        </div>
      `;
      document.body.appendChild(alertDiv);
      
      setTimeout(() => {
        if (alertDiv && alertDiv.parentNode) {
          alertDiv.parentNode.removeChild(alertDiv);
        }
      }, 5000);
      
      return Promise.reject(error);
    }
    
    if (isTokenExpired) {
      console.log('🔓 Token expiry detected:', errorMessage);
      handleLogout();
      return Promise.reject(new Error('Session expired for security'));
    }
    
    // For token format errors, log the error but don't attempt to refresh
    if (errorData.details === 'Subject must be a string') {
      console.error('Token format error detected:', errorData);
      return Promise.reject(error);
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;