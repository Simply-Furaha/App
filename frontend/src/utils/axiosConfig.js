import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add a request interceptor to add auth token to requests
axiosInstance.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method.toUpperCase()} request to: ${config.url}`);
    
    // Skip auth header for login/register/verify-otp routes
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

// Add a response interceptor to handle token expiry
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
    
    // Don't attempt token refresh for now to avoid login loops
    return Promise.reject(error);
  }
);

export default axiosInstance;