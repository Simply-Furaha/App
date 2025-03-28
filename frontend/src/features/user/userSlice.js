import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import userService from './userService';

const initialState = {
  profile: null,
  dashboard: null,
  contributions: [],
  loanLimit: null,
  isLoading: false,
  isSuccess: false,
  isError: false,
  message: ''
};

// Get user profile
export const getUserProfile = createAsyncThunk(
  'user/getProfile',
  async (_, thunkAPI) => {
    try {
      return await userService.getUserProfile();
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to get profile';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Update user profile
export const updateProfile = createAsyncThunk(
  'user/updateProfile',
  async (userData, thunkAPI) => {
    try {
      return await userService.updateProfile(userData);
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to update profile';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get user dashboard
export const getDashboard = createAsyncThunk(
  'user/getDashboard',
  async (_, thunkAPI) => {
    try {
      return await userService.getDashboard();
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to get dashboard data';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get user contributions
export const getContributions = createAsyncThunk(
  'user/getContributions',
  async (_, thunkAPI) => {
    try {
      return await userService.getContributions();
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to get contributions';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get user loan limit
export const getLoanLimit = createAsyncThunk(
  'user/getLoanLimit',
  async (_, thunkAPI) => {
    try {
      return await userService.getLoanLimit();
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to get loan limit';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    reset: (state) => {
      state.isLoading = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = '';
    },
    resetAll: (state) => initialState
  },
  extraReducers: (builder) => {
    builder
      // Get user profile
      .addCase(getUserProfile.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getUserProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.profile = action.payload;
      })
      .addCase(getUserProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Update user profile
      .addCase(updateProfile.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.profile = action.payload.user;
        state.message = action.payload.message;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Get user dashboard
      .addCase(getDashboard.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getDashboard.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.dashboard = action.payload;
      })
      .addCase(getDashboard.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Get user contributions
      .addCase(getContributions.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getContributions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.contributions = action.payload.contributions;
      })
      .addCase(getContributions.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Get user loan limit
      .addCase(getLoanLimit.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getLoanLimit.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.loanLimit = action.payload;
      })
      .addCase(getLoanLimit.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      });
  }
});

export const { reset, resetAll } = userSlice.actions;
export default userSlice.reducer;