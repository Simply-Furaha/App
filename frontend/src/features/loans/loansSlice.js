import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import loansService from './loansService';

const initialState = {
  loans: [],
  loan: null,
  payments: [],
  pendingLoanPayments: [],
  loanPaymentStatus: null,
  checkoutRequestId: null,
  merchantRequestId: null,
  mpesaInstructions: [],
  isLoading: false,
  isSuccess: false,
  isError: false,
  message: '',
  // M-PESA specific states for loan repayments
  mpesaLoading: false,
  mpesaSuccess: false,
  mpesaError: false,
  mpesaMessage: ''
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
      const result = await loansService.applyForLoan(loanData);
      
      // Refresh loans list after successful application
      setTimeout(() => {
        thunkAPI.dispatch(getLoans());
      }, 1000);
      
      return result;
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to apply for loan';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Repay loan via M-PESA
export const repayLoanMpesa = createAsyncThunk(
  'loans/repayMpesa',
  async (repaymentData, thunkAPI) => {
    try {
      console.log('🚀 Redux: Making M-PESA loan repayment');
      const result = await loansService.repayLoanMpesa(repaymentData);
      
      // If successful, refresh loan details after a delay
      if (result.checkout_request_id || result.test_mode) {
        setTimeout(() => {
          if (repaymentData.loan_id) {
            thunkAPI.dispatch(getLoanDetails(repaymentData.loan_id));
          }
          thunkAPI.dispatch(getLoans());
        }, 2000);
      }
      
      return result;
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to process loan repayment';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Check M-PESA loan payment status
export const checkLoanPaymentStatus = createAsyncThunk(
  'loans/checkPaymentStatus',
  async (checkoutRequestId, thunkAPI) => {
    try {
      return await loansService.checkLoanPaymentStatus(checkoutRequestId);
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to check payment status';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get pending loan payments
export const getPendingLoanPayments = createAsyncThunk(
  'loans/getPendingPayments',
  async (_, thunkAPI) => {
    try {
      return await loansService.getPendingLoanPayments();
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to get pending payments';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Test loan repayment (development)
export const testLoanRepayment = createAsyncThunk(
  'loans/testRepayment',
  async (repaymentData, thunkAPI) => {
    try {
      const result = await loansService.testLoanRepayment(repaymentData);
      
      // Refresh loan details after test
      setTimeout(() => {
        if (repaymentData.loan_id) {
          thunkAPI.dispatch(getLoanDetails(repaymentData.loan_id));
        }
        thunkAPI.dispatch(getLoans());
      }, 1000);
      
      return result;
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to create test repayment';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Legacy repay loan action (for backward compatibility)
export const repayLoan = createAsyncThunk(
  'loans/repay',
  async (repaymentData, thunkAPI) => {
    console.warn('⚠️ repayLoan is deprecated, use repayLoanMpesa instead');
    return thunkAPI.dispatch(repayLoanMpesa(repaymentData));
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
    clearLoanPaymentStatus: (state) => {
      state.loanPaymentStatus = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Get all loans
      .addCase(getLoans.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
      })
      .addCase(getLoans.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.loans = action.payload.loans || [];
      })
      .addCase(getLoans.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      
      // Get loan details
      .addCase(getLoanDetails.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
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
        state.isError = false;
      })
      .addCase(applyForLoan.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.message = action.payload.message || 'Loan application submitted successfully';
        // Add new loan to the list
        if (action.payload.loan) {
          state.loans = [action.payload.loan, ...(state.loans || [])];
        }
      })
      .addCase(applyForLoan.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      
      // Repay loan via M-PESA
      .addCase(repayLoanMpesa.pending, (state) => {
        state.mpesaLoading = true;
        state.mpesaError = false;
        state.mpesaSuccess = false;
        state.mpesaMessage = '';
      })
      .addCase(repayLoanMpesa.fulfilled, (state, action) => {
        state.mpesaLoading = false;
        state.mpesaSuccess = true;
        
        if (action.payload.test_mode) {
          state.mpesaMessage = 'Test loan repayment processed successfully!';
          // Update the loan if provided
          if (action.payload.updated_loan) {
            state.loan = action.payload.updated_loan;
          }
        } else {
          state.mpesaMessage = action.payload.message || 'M-PESA repayment request sent to your phone';
          state.checkoutRequestId = action.payload.checkout_request_id;
          state.merchantRequestId = action.payload.merchant_request_id;
          state.mpesaInstructions = action.payload.instructions || [];
        }
      })
      .addCase(repayLoanMpesa.rejected, (state, action) => {
        state.mpesaLoading = false;
        state.mpesaError = true;
        state.mpesaMessage = action.payload;
      })
      
      // Check loan payment status
      .addCase(checkLoanPaymentStatus.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(checkLoanPaymentStatus.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.loanPaymentStatus = action.payload.payment_status;
        
        // If payment is successful, show success message
        if (action.payload.payment_status?.status === 'success') {
          state.mpesaSuccess = true;
          state.mpesaMessage = 'Loan repayment completed successfully!';
        } else if (action.payload.payment_status?.status === 'failed') {
          state.mpesaError = true;
          state.mpesaMessage = action.payload.payment_status.failure_reason || 'Payment failed';
        }
      })
      .addCase(checkLoanPaymentStatus.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      
      // Get pending loan payments
      .addCase(getPendingLoanPayments.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getPendingLoanPayments.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.pendingLoanPayments = action.payload.pending_payments || [];
      })
      .addCase(getPendingLoanPayments.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      
      // Test loan repayment
      .addCase(testLoanRepayment.pending, (state) => {
        state.mpesaLoading = true;
        state.mpesaError = false;
      })
      .addCase(testLoanRepayment.fulfilled, (state, action) => {
        state.mpesaLoading = false;
        state.mpesaSuccess = true;
        state.mpesaMessage = 'Test loan repayment created successfully!';
        
        // Update the loan if provided
        if (action.payload.updated_loan) {
          state.loan = action.payload.updated_loan;
        }
        // Add payment to payments list if provided
        if (action.payload.payment) {
          state.payments = [action.payload.payment, ...(state.payments || [])];
        }
      })
      .addCase(testLoanRepayment.rejected, (state, action) => {
        state.mpesaLoading = false;
        state.mpesaError = true;
        state.mpesaMessage = action.payload;
      });
  }
});

export const { reset, resetAll, resetMpesa, clearLoanPaymentStatus } = loansSlice.actions;
export default loansSlice.reducer;