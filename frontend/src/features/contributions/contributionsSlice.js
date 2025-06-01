import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import contributionsService from './contributionsService';

const initialState = {
  contributions: [],
  pendingPayments: [],
  paymentStatus: null,
  checkoutRequestId: null,
  merchantRequestId: null,
  mpesaInstructions: [],
  isLoading: false,
  isSuccess: false,
  isError: false,
  message: '',
  // M-PESA specific states
  mpesaLoading: false,
  mpesaSuccess: false,
  mpesaError: false,
  mpesaMessage: ''
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

// Make a contribution via M-PESA
export const makeContribution = createAsyncThunk(
  'contributions/make',
  async (contributionData, thunkAPI) => {
    try {
      console.log('🚀 Redux: Making M-PESA contribution');
      const result = await contributionsService.makeContribution(contributionData);
      
      // If successful, also refresh contributions after a delay
      if (result.checkout_request_id || result.test_mode) {
        setTimeout(() => {
          thunkAPI.dispatch(getContributions());
        }, 2000);
      }
      
      return result;
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to make contribution';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Check M-PESA payment status
export const checkPaymentStatus = createAsyncThunk(
  'contributions/checkPaymentStatus',
  async (checkoutRequestId, thunkAPI) => {
    try {
      return await contributionsService.checkPaymentStatus(checkoutRequestId);
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to check payment status';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get pending M-PESA payments
export const getPendingPayments = createAsyncThunk(
  'contributions/getPendingPayments',
  async (_, thunkAPI) => {
    try {
      return await contributionsService.getPendingPayments();
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to get pending payments';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Test contribution (development)
export const testContribution = createAsyncThunk(
  'contributions/test',
  async (contributionData, thunkAPI) => {
    try {
      const result = await contributionsService.testContribution(contributionData);
      
      // Refresh contributions after test
      setTimeout(() => {
        thunkAPI.dispatch(getContributions());
      }, 1000);
      
      return result;
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to create test contribution';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Legacy action (for backward compatibility)
export const checkTransactionStatus = createAsyncThunk(
  'contributions/checkStatus',
  async (checkoutRequestId, thunkAPI) => {
    console.warn('⚠️ checkTransactionStatus is deprecated, use checkPaymentStatus instead');
    return thunkAPI.dispatch(checkPaymentStatus(checkoutRequestId));
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
      state.mpesaLoading = false;
      state.mpesaSuccess = false;
      state.mpesaError = false;
      state.mpesaMessage = '';
    },
    resetAll: (state) => initialState,
    resetMpesa: (state) => {
      state.mpesaLoading = false;
      state.mpesaSuccess = false;
      state.mpesaError = false;
      state.mpesaMessage = '';
      state.checkoutRequestId = null;
      state.merchantRequestId = null;
      state.mpesaInstructions = [];
    },
    clearPaymentStatus: (state) => {
      state.paymentStatus = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Get contributions
      .addCase(getContributions.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
      })
      .addCase(getContributions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.contributions = action.payload.contributions || [];
      })
      .addCase(getContributions.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      
      // Make contribution (M-PESA)
      .addCase(makeContribution.pending, (state) => {
        state.mpesaLoading = true;
        state.mpesaError = false;
        state.mpesaSuccess = false;
        state.mpesaMessage = '';
      })
      .addCase(makeContribution.fulfilled, (state, action) => {
        state.mpesaLoading = false;
        state.mpesaSuccess = true;
        
        if (action.payload.test_mode) {
          state.mpesaMessage = 'Test contribution created successfully!';
          // Add the new contribution to the list
          if (action.payload.contribution) {
            state.contributions = [action.payload.contribution, ...(state.contributions || [])];
          }
        } else {
          state.mpesaMessage = action.payload.message || 'M-PESA request sent to your phone';
          state.checkoutRequestId = action.payload.checkout_request_id;
          state.merchantRequestId = action.payload.merchant_request_id;
          state.mpesaInstructions = action.payload.instructions || [];
        }
      })
      .addCase(makeContribution.rejected, (state, action) => {
        state.mpesaLoading = false;
        state.mpesaError = true;
        state.mpesaMessage = action.payload;
      })
      
      // Check payment status
      .addCase(checkPaymentStatus.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(checkPaymentStatus.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.paymentStatus = action.payload.payment_status;
        
        // If payment is successful, refresh contributions
        if (action.payload.payment_status?.status === 'success') {
          state.mpesaSuccess = true;
          state.mpesaMessage = 'Payment completed successfully!';
        } else if (action.payload.payment_status?.status === 'failed') {
          state.mpesaError = true;
          state.mpesaMessage = action.payload.payment_status.failure_reason || 'Payment failed';
        }
      })
      .addCase(checkPaymentStatus.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      
      // Get pending payments
      .addCase(getPendingPayments.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getPendingPayments.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.pendingPayments = action.payload.pending_payments || [];
      })
      .addCase(getPendingPayments.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      
      // Test contribution
      .addCase(testContribution.pending, (state) => {
        state.mpesaLoading = true;
        state.mpesaError = false;
      })
      .addCase(testContribution.fulfilled, (state, action) => {
        state.mpesaLoading = false;
        state.mpesaSuccess = true;
        state.mpesaMessage = 'Test contribution created successfully!';
        
        // Add the test contribution to the list
        if (action.payload.contribution) {
          state.contributions = [action.payload.contribution, ...(state.contributions || [])];
        }
      })
      .addCase(testContribution.rejected, (state, action) => {
        state.mpesaLoading = false;
        state.mpesaError = true;
        state.mpesaMessage = action.payload;
      });
  }
});

export const { reset, resetAll, resetMpesa, clearPaymentStatus } = contributionsSlice.actions;
export default contributionsSlice.reducer;