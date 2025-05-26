// src/features/admin/adminSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import adminService from './adminService';

const initialState = {
  dashboard: null,
  users: [],
  loans: [],
  pendingLoans: [],
  investments: [],
  isLoading: false,
  isSuccess: false,
  isError: false,
  message: ''
};

// Get admin dashboard data
export const getDashboard = createAsyncThunk(
  'admin/getDashboard',
  async (_, thunkAPI) => {
    try {
      return await adminService.getDashboard();
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to get dashboard data';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get all users
export const getUsers = createAsyncThunk(
  'admin/getUsers',
  async (_, thunkAPI) => {
    try {
      return await adminService.getUsers();
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to get users';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Create a new user
export const createUser = createAsyncThunk(
  'admin/createUser',
  async (userData, thunkAPI) => {
    try {
      return await adminService.createUser(userData);
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to create user';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Delete user
export const deleteUser = createAsyncThunk(
  'admin/deleteUser',
  async (userId, thunkAPI) => {
    try {
      return await adminService.deleteUser(userId);
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to delete user';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get all loans
export const getAllLoans = createAsyncThunk(
  'admin/getAllLoans',
  async (_, thunkAPI) => {
    try {
      return await adminService.getAllLoans();
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to get loans';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get pending loans
export const getPendingLoans = createAsyncThunk(
  'admin/getPendingLoans',
  async (_, thunkAPI) => {
    try {
      return await adminService.getPendingLoans();
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to get pending loans';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Approve loan
export const approveLoan = createAsyncThunk(
  'admin/approveLoan',
  async (loanId, thunkAPI) => {
    try {
      return await adminService.approveLoan(loanId);
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to approve loan';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Reject loan
export const rejectLoan = createAsyncThunk(
  'admin/rejectLoan',
  async (loanId, thunkAPI) => {
    try {
      return await adminService.rejectLoan(loanId);
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to reject loan';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Add loan payment
export const addLoanPayment = createAsyncThunk(
  'admin/addLoanPayment',
  async ({ loanId, paymentData }, thunkAPI) => {
    try {
      return await adminService.addLoanPayment(loanId, paymentData);
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to add loan payment';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Add user contribution
export const addContribution = createAsyncThunk(
  'admin/addContribution',
  async (contributionData, thunkAPI) => {
    try {
      return await adminService.addContribution(contributionData);
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to add contribution';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get all investments
export const getInvestments = createAsyncThunk(
  'admin/getInvestments',
  async (_, thunkAPI) => {
    try {
      return await adminService.getInvestments();
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to get investments';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Create investment
export const createInvestment = createAsyncThunk(
  'admin/createInvestment',
  async (investmentData, thunkAPI) => {
    try {
      return await adminService.createInvestment(investmentData);
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to create investment';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Update investment
export const updateInvestment = createAsyncThunk(
  'admin/updateInvestment',
  async (data, thunkAPI) => {
    try {
      return await adminService.updateInvestment(data.id, data.investmentData);
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to update investment';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

const adminSlice = createSlice({
  name: 'admin',
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
      // Get dashboard
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
      // Get users
      .addCase(getUsers.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getUsers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.users = action.payload.users;
      })
      .addCase(getUsers.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Create user
      .addCase(createUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.message = action.payload.message;
        state.users.push(action.payload.user);
      })
      .addCase(createUser.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Delete user
      .addCase(deleteUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.message = action.payload.message;
        state.users = state.users.filter(user => user.id !== action.meta.arg);
      })
      .addCase(deleteUser.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Get all loans
      .addCase(getAllLoans.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getAllLoans.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.loans = action.payload.loans;
      })
      .addCase(getAllLoans.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Get pending loans
      .addCase(getPendingLoans.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getPendingLoans.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.pendingLoans = action.payload.pending_loans;
      })
      .addCase(getPendingLoans.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Approve loan
      .addCase(approveLoan.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(approveLoan.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.message = action.payload.message;
        
        // Update the loans list if it exists
        if (state.loans) {
          state.loans = state.loans.map(loan => 
            loan.id === action.payload.loan.id ? action.payload.loan : loan
          );
        }
        
        // Update pending loans list if it exists
        if (state.pendingLoans) {
          state.pendingLoans = state.pendingLoans.filter(
            loan => loan.id !== action.payload.loan.id
          );
        }
      })
      .addCase(approveLoan.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Reject loan
      .addCase(rejectLoan.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(rejectLoan.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.message = action.payload.message;
        
        // Update the loans list if it exists
        if (state.loans) {
          state.loans = state.loans.map(loan => 
            loan.id === action.payload.loan.id ? action.payload.loan : loan
          );
        }
        
        // Update pending loans list if it exists
        if (state.pendingLoans) {
          state.pendingLoans = state.pendingLoans.filter(
            loan => loan.id !== action.payload.loan.id
          );
        }
      })
      .addCase(rejectLoan.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Add loan payment
      .addCase(addLoanPayment.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(addLoanPayment.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.message = action.payload.message;
        
        // Update the loan in the loans array
        if (state.loans) {
          state.loans = state.loans.map(loan => 
            loan.id === action.payload.loan.id ? action.payload.loan : loan
          );
        }
      })
      .addCase(addLoanPayment.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Add contribution
      .addCase(addContribution.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(addContribution.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.message = action.payload.message;
      })
      .addCase(addContribution.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Get investments
      .addCase(getInvestments.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getInvestments.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.investments = action.payload.investments;
      })
      .addCase(getInvestments.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Create investment
      .addCase(createInvestment.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createInvestment.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.message = action.payload.message;
        if (state.investments) {
          state.investments = [...state.investments, action.payload.investment];
        } else {
          state.investments = [action.payload.investment];
        }
      })
      .addCase(createInvestment.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Update investment
      .addCase(updateInvestment.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateInvestment.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.message = action.payload.message;
        if (state.investments) {
          state.investments = state.investments.map(investment => 
            investment.id === action.payload.investment.id 
              ? action.payload.investment 
              : investment
          );
        }
      })
      .addCase(updateInvestment.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      });
  }
});

export const { reset, resetAll } = adminSlice.actions;
export default adminSlice.reducer;