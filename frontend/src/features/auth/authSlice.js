import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import authService from './authService';

// Get user from localStorage
const user = JSON.parse(localStorage.getItem('user'));

const initialState = {
  user: user || null,
  tempUserId: null,
  isAuthenticated: !!user,
  isLoading: false,
  isSuccess: false,
  isError: false,
  message: '',
  otpSent: false,
  otpVerified: !!user
};

// Register user
export const register = createAsyncThunk(
  'auth/register',
  async (userData, thunkAPI) => {
    try {
      return await authService.register(userData);
    } catch (error) {
      const message = error.response?.data?.error || 'Registration failed';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Verify OTP
export const verifyOtp = createAsyncThunk(
  'auth/verifyOtp',
  async (data, thunkAPI) => {
    try {
      return await authService.verifyOtp(data);
    } catch (error) {
      const message = error.response?.data?.error || 'OTP verification failed';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Login user
export const login = createAsyncThunk(
  'auth/login',
  async (userData, thunkAPI) => {
    try {
      return await authService.login(userData);
    } catch (error) {
      const message = error.response?.data?.error || 'Login failed';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Resend OTP
export const resendOtp = createAsyncThunk(
  'auth/resendOtp',
  async (userId, thunkAPI) => {
    try {
      return await authService.resendOtp(userId);
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to resend OTP';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Change password
export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async (passwordData, thunkAPI) => {
    try {
      return await authService.changePassword(passwordData);
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to change password';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Logout user
export const logout = createAsyncThunk(
  'auth/logout',
  async () => {
    authService.logout();
  }
);

// Check authentication status
export const checkAuth = createAsyncThunk(
  'auth/checkAuth',
  async (_, thunkAPI) => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const token = localStorage.getItem('token');
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (!user || !token || !refreshToken) {
        return thunkAPI.rejectWithValue('Not authenticated');
      }
      
      return { user };
    } catch (error) {
      return thunkAPI.rejectWithValue('Authentication check failed');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    reset: (state) => {
      state.isLoading = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = '';
    },
    resetAuth: (state) => {
      state.user = null;
      state.tempUserId = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = '';
      state.otpSent = false;
      state.otpVerified = false;
    }
  },
  extraReducers: (builder) => {
    builder
      // Register
      .addCase(register.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.otpSent = true;
        state.tempUserId = action.payload.user_id;
        state.message = action.payload.message;
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Verify OTP
      .addCase(verifyOtp.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(verifyOtp.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.otpVerified = true;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.message = action.payload.message;
      })
      .addCase(verifyOtp.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Login
      .addCase(login.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.otpSent = true;
        state.tempUserId = action.payload.user_id;
        state.message = action.payload.message;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Resend OTP
      .addCase(resendOtp.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(resendOtp.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.message = action.payload.message;
      })
      .addCase(resendOtp.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Change password
      .addCase(changePassword.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(changePassword.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.message = action.payload.message;
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.otpVerified = false;
      })
      // Check Authentication
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.otpVerified = true;
      })
      .addCase(checkAuth.rejected, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.otpVerified = false;
      });
  }
});

export const { reset, resetAuth } = authSlice.actions;
export default authSlice.reducer;