import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import loansService from './loansService';

const initialState = {
  loans: [],
  loan: null,
  payments: [],
  isLoading: false,
  isSuccess: false,
  isError: false,
  message: ''
};

// Get all loans for current user
export const getLoans = createAsyncThunk(
  'loans/getAll',
  async (_, thunkAPI) => {
    try {
      return await loansService.getLoans();
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to get loans';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get loan details
export const getLoanDetails = createAsyncThunk(
  'loans/getDetails',
  async (loanId, thunkAPI) => {
    try {
      return await loansService.getLoanDetails(loanId);
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to get loan details';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Apply for a loan
export const applyForLoan = createAsyncThunk(
  'loans/apply',
  async (loanData, thunkAPI) => {
    try {
      return await loansService.applyForLoan(loanData);
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to apply for loan';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Repay loan
export const repayLoan = createAsyncThunk(
  'loans/repay',
  async (repaymentData, thunkAPI) => {
    try {
      return await loansService.repayLoan(repaymentData);
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to process repayment';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

const loansSlice = createSlice({
  name: 'loans',
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
      // Get all loans
      .addCase(getLoans.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getLoans.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.loans = action.payload.loans;
      })
      .addCase(getLoans.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Get loan details
      .addCase(getLoanDetails.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getLoanDetails.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.loan = action.payload.loan;
        state.payments = action.payload.payments || [];
      })
      .addCase(getLoanDetails.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Apply for loan
      .addCase(applyForLoan.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(applyForLoan.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.loans = state.loans ? [...state.loans, action.payload.loan] : [action.payload.loan];
      })
      .addCase(applyForLoan.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Repay loan
      .addCase(repayLoan.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(repayLoan.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.message = 'Payment initiated successfully';
      })
      .addCase(repayLoan.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      });
  }
});

export const { reset, resetAll } = loansSlice.actions;
export default loansSlice.reducer;