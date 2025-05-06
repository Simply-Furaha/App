import axios from '../../utils/axiosConfig';

// Get current user profile
const getUserProfile = async () => {
  try {
    console.log('Fetching user profile');
    const response = await axios.get('/users/me');
    console.log('User profile fetched successfully');
    return response.data;
  } catch (error) {
    console.error('Error fetching user profile:', error.response?.data || error.message);
    throw error;
  }
};

// Update user profile
const updateProfile = async (userData) => {
  try {
    console.log('Updating user profile');
    const response = await axios.put('/users/me', userData);
    console.log('Profile updated successfully');
    return response.data;
  } catch (error) {
    console.error('Error updating profile:', error.response?.data || error.message);
    throw error;
  }
};

// Get user dashboard data
const getDashboard = async () => {
  try {
    console.log('Fetching dashboard data');
    const token = localStorage.getItem('token');
    console.log('Using token:', token ? 'Token exists' : 'No token');
    
    try {
      const response = await axios.get('/users/me/dashboard');
      console.log('Dashboard data fetched successfully');
      return response.data;
    } catch (error) {
      if (error.response?.data?.details === 'Subject must be a string') {
        console.warn('Token format issue detected, trying public endpoint as fallback');
        // Try the public endpoint as a fallback
        const publicResponse = await axios.get('/users/me/dashboard-public');
        console.log('Dashboard data fetched from public endpoint');
        return publicResponse.data;
      }
      throw error;
    }
  } catch (error) {
    console.error('Error fetching dashboard:', error.response?.data || error.message);
    throw error;
  }
};

// Get user contributions
const getContributions = async () => {
  try {
    console.log('Fetching contributions');
    const response = await axios.get('/users/me/contributions');
    console.log('Contributions fetched successfully');
    return response.data;
  } catch (error) {
    console.error('Error fetching contributions:', error.response?.data || error.message);
    throw error;
  }
};

// Get user loan limit
const getLoanLimit = async () => {
  try {
    console.log('Fetching loan limit');
    const response = await axios.get('/users/me/loan-limit');
    console.log('Loan limit fetched successfully');
    return response.data;
  } catch (error) {
    console.error('Error fetching loan limit:', error.response?.data || error.message);
    throw error;
  }
};

const userService = {
  getUserProfile,
  updateProfile,
  getDashboard,
  getContributions,
  getLoanLimit
};

export default userService;