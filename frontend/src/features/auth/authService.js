import axios from '../../utils/axiosConfig';

// Register user
const register = async (userData) => {
  try {
    console.log('Registering user:', userData.username);
    const response = await axios.post('/auth/register', userData);
    console.log('Registration successful, user_id:', response.data.user_id);
    return response.data;
  } catch (error) {
    console.error('Registration error:', error.response?.data || error.message);
    throw error;
  }
};

// Verify OTP
const verifyOtp = async (data) => {
  try {
    console.log('Verifying OTP for user_id:', data.user_id);
    const response = await axios.post('/auth/verify-otp', data);
    
    console.log('OTP verification successful, storing tokens');
    if (response.data && response.data.access_token && response.data.refresh_token) {
      // Store the tokens
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('refreshToken', response.data.refresh_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      // Verify tokens were stored correctly
      const storedToken = localStorage.getItem('token');
      const storedRefreshToken = localStorage.getItem('refreshToken');
      
      console.log('Tokens stored successfully:', 
        storedToken ? 'Access token set' : 'No access token', 
        storedRefreshToken ? 'Refresh token set' : 'No refresh token');
      
      // Debug the token format if needed
      try {
        const tokenParts = storedToken.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          console.log('Token subject type:', typeof payload.sub);
          console.log('Token expiry:', new Date(payload.exp * 1000).toLocaleString());
        }
      } catch (e) {
        console.error('Error debugging token:', e);
      }
    } else {
      console.error('Missing tokens in response:', response.data);
    }
    
    return response.data;
  } catch (error) {
    console.error('OTP verification error:', error.response?.data || error.message);
    throw error;
  }
};

// Login user (first step)
const login = async (userData) => {
  try {
    console.log('Logging in user:', userData.username);
    const response = await axios.post('/auth/login', userData);
    console.log('Login successful, user_id:', response.data.user_id);
    return response.data;
  } catch (error) {
    console.error('Login error:', error.response?.data || error.message);
    throw error;
  }
};

// Resend OTP
const resendOtp = async (userId) => {
  try {
    console.log('Resending OTP for user_id:', userId);
    const response = await axios.post('/auth/resend-otp', { user_id: userId });
    console.log('OTP resent successfully');
    return response.data;
  } catch (error) {
    console.error('Resend OTP error:', error.response?.data || error.message);
    throw error;
  }
};

// Change password
const changePassword = async (passwordData) => {
  try {
    console.log('Changing password');
    const response = await axios.put('/auth/change-password', passwordData);
    console.log('Password changed successfully');
    return response.data;
  } catch (error) {
    console.error('Change password error:', error.response?.data || error.message);
    throw error;
  }
};

// Logout user
const logout = () => {
  console.log('Logging out user');
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  console.log('User logged out, storage cleared');
};

const authService = {
  register,
  verifyOtp,
  login,
  resendOtp,
  changePassword,
  logout
};

export default authService;