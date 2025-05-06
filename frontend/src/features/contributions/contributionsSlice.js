import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import contributionsService from './contributionsService';

const initialState = {
  contributions: [],
  transactionStatus: null,
  checkoutRequestId: null,
  isLoading: false,
  isSuccess: false,
  isError: false,
  message: ''
};

// Get user contributions
export const getContributions = createAsyncThunk(
  'contributions/getAll',
  async (_, thunkAPI) => {
    try {
      return await contributionsService.getContributions();
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to get contributions';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Make a contribution
export const makeContribution = createAsyncThunk(
  'contributions/make',
  async (contributionData, thunkAPI) => {
    try {
      return await contributionsService.makeContribution(contributionData);
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to make contribution';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Check transaction status
export const checkTransactionStatus = createAsyncThunk(
  'contributions/checkStatus',
  async (checkoutRequestId, thunkAPI) => {
    try {
      return await contributionsService.checkTransactionStatus(checkoutRequestId);
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to check transaction status';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

const contributionsSlice = createSlice({
  name: 'contributions',
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
      // Get contributions
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
      // Make contribution
      .addCase(makeContribution.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(makeContribution.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.message = 'Contribution initiated successfully';
        state.checkoutRequestId = action.payload.checkout_request_id;
      })
      .addCase(makeContribution.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Check transaction status
      .addCase(checkTransactionStatus.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(checkTransactionStatus.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.transactionStatus = action.payload.status;
      })
      .addCase(checkTransactionStatus.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      });
  }
});

export const { reset, resetAll } = contributionsSlice.actions;
export default contributionsSlice.reducer;