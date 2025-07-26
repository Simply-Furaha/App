// src/features/admin/adminSlice.js - Enhanced with new features
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import adminService from './adminService';

const initialState = {
  dashboard: null,
  users: [],
  loans: [],
  pendingLoans: [],
  investments: [],
  activityLogs: [],
  overpayments: [],
  pagination: null,
  isLoading: false,
  isSuccess: false,
  isError: false,
  message: ''
};

// ============= EXISTING THUNKS =============

// Get admin dashboard
export const getDashboard = createAsyncThunk(
  'admin/getDashboard',
  async (_, thunkAPI) => {
    try {
      return await adminService.getDashboard();
    } catch (error) {
      const message = error.response?.data?.error || error.message || error.toString();
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
      const message = error.response?.data?.error || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Create user
export const createUser = createAsyncThunk(
  'admin/createUser',
  async (userData, thunkAPI) => {
    try {
      return await adminService.createUser(userData);
    } catch (error) {
      const message = error.response?.data?.error || error.message || error.toString();
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
      const message = error.response?.data?.error || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Suspend user
export const suspendUser = createAsyncThunk(
  'admin/suspendUser',
  async ({ userId, suspendData }, thunkAPI) => {
    try {
      return await adminService.suspendUser(userId, suspendData);
    } catch (error) {
      const message = error.response?.data?.error || error.message || error.toString();
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
      const message = error.response?.data?.error || error.message || error.toString();
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
      const message = error.response?.data?.error || error.message || error.toString();
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
      const message = error.response?.data?.error || error.message || error.toString();
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
      const message = error.response?.data?.error || error.message || error.toString();
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
      const message = error.response?.data?.error || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Add contribution
export const addContribution = createAsyncThunk(
  'admin/addContribution',
  async (contributionData, thunkAPI) => {
    try {
      return await adminService.addContribution(contributionData);
    } catch (error) {
      const message = error.response?.data?.error || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get investments
export const getInvestments = createAsyncThunk(
  'admin/getInvestments',
  async (_, thunkAPI) => {
    try {
      return await adminService.getInvestments();
    } catch (error) {
      const message = error.response?.data?.error || error.message || error.toString();
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
      const message = error.response?.data?.error || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Update investment
export const updateInvestment = createAsyncThunk(
  'admin/updateInvestment',
  async ({ investmentId, investmentData }, thunkAPI) => {
    try {
      return await adminService.updateInvestment(investmentId, investmentData);
    } catch (error) {
      const message = error.response?.data?.error || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// ============= NEW THUNKS FOR NEW FEATURES =============

// Get activity logs
export const getActivityLogs = createAsyncThunk(
  'admin/getActivityLogs',
  async (params, thunkAPI) => {
    try {
      return await adminService.getActivityLogs(params);
    } catch (error) {
      const message = error.response?.data?.error || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get overpayments
export const getOverpayments = createAsyncThunk(
  'admin/getOverpayments',
  async (_, thunkAPI) => {
    try {
      return await adminService.getOverpayments();
    } catch (error) {
      const message = error.response?.data?.error || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Allocate overpayment
export const allocateOverpayment = createAsyncThunk(
  'admin/allocateOverpayment',
  async ({ overpaymentId, allocationData }, thunkAPI) => {
    try {
      return await adminService.allocateOverpayment(overpaymentId, allocationData);
    } catch (error) {
      const message = error.response?.data?.error || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Modify loan debt
export const modifyLoanDebt = createAsyncThunk(
  'admin/modifyLoanDebt',
  async ({ loanId, debtData }, thunkAPI) => {
    try {
      return await adminService.modifyLoanDebt(loanId, debtData);
    } catch (error) {
      const message = error.response?.data?.error || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Add admin contribution
export const addAdminContribution = createAsyncThunk(
  'admin/addAdminContribution',
  async (contributionData, thunkAPI) => {
    try {
      return await adminService.addAdminContribution(contributionData);
    } catch (error) {
      const message = error.response?.data?.error || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get user active loans
export const getUserActiveLoans = createAsyncThunk(
  'admin/getUserActiveLoans',
  async (userId, thunkAPI) => {
    try {
      return await adminService.getUserActiveLoans(userId);
    } catch (error) {
      const message = error.response?.data?.error || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// ============= SLICE DEFINITION =============

export const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    reset: (state) => {
      state.isLoading = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = '';
    },
    clearMessage: (state) => {
      state.message = '';
      state.isError = false;
      state.isSuccess = false;
    }
  },
  extraReducers: (builder) => {
    builder
      // Dashboard
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
      
      // Users
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
      
      // Create User
      .addCase(createUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.message = action.payload.message;
        // Add new user to the list
        state.users.push(action.payload.user);
      })
      .addCase(createUser.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      
      // Delete User
      .addCase(deleteUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.message = action.payload.message;
      })
      .addCase(deleteUser.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      
      // Suspend User
      .addCase(suspendUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(suspendUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.message = action.payload.message;
        // Update user in the list
        const userIndex = state.users.findIndex(user => user.id === action.payload.user.id);
        if (userIndex !== -1) {
          state.users[userIndex] = action.payload.user;
        }
      })
      .addCase(suspendUser.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      
      // Loans
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
      
      // Pending Loans
      .addCase(getPendingLoans.fulfilled, (state, action) => {
        state.pendingLoans = action.payload.loans;
      })
      
      // Approve Loan
      .addCase(approveLoan.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(approveLoan.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.message = action.payload.message;
      })
      .addCase(approveLoan.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      
      // Reject Loan
      .addCase(rejectLoan.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(rejectLoan.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.message = action.payload.message;
      })
      .addCase(rejectLoan.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      
      // Add Loan Payment
      .addCase(addLoanPayment.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(addLoanPayment.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.message = action.payload.message;
      })
      .addCase(addLoanPayment.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      
      // Add Contribution
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
      
      // Investments
      .addCase(getInvestments.fulfilled, (state, action) => {
        state.investments = action.payload.investments;
      })
      .addCase(createInvestment.fulfilled, (state, action) => {
        state.isSuccess = true;
        state.message = action.payload.message;
        state.investments.push(action.payload.investment);
      })
      .addCase(updateInvestment.fulfilled, (state, action) => {
        state.isSuccess = true;
        state.message = action.payload.message;
      })
      
      // ============= NEW FEATURE REDUCERS =============
      
      // Activity Logs
      .addCase(getActivityLogs.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getActivityLogs.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.activityLogs = action.payload.logs;
        state.pagination = action.payload.pagination;
      })
      .addCase(getActivityLogs.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      
      // Overpayments
      .addCase(getOverpayments.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getOverpayments.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.overpayments = action.payload.overpayments;
      })
      .addCase(getOverpayments.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      
      // Allocate Overpayment
      .addCase(allocateOverpayment.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(allocateOverpayment.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.message = action.payload.message;
        // Update overpayment in the list
        const overpaymentIndex = state.overpayments.findIndex(op => op.id === action.payload.overpayment.id);
        if (overpaymentIndex !== -1) {
          state.overpayments[overpaymentIndex] = action.payload.overpayment;
        }
      })
      .addCase(allocateOverpayment.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      
      // Modify Loan Debt
      .addCase(modifyLoanDebt.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(modifyLoanDebt.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.message = action.payload.message;
        // Update loan in the list
        const loanIndex = state.loans.findIndex(loan => loan.id === action.payload.loan.id);
        if (loanIndex !== -1) {
          state.loans[loanIndex] = action.payload.loan;
        }
      })
      .addCase(modifyLoanDebt.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      
      // Add Admin Contribution
      .addCase(addAdminContribution.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(addAdminContribution.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.message = action.payload.message;
      })
      .addCase(addAdminContribution.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      
      // Get User Active Loans
      .addCase(getUserActiveLoans.fulfilled, (state, action) => {
        state.isSuccess = true;
        // This is typically used in components, not stored in global state
      })
      .addCase(getUserActiveLoans.rejected, (state, action) => {
        state.isError = true;
        state.message = action.payload;
      });
  }
});

export const { reset, clearMessage } = adminSlice.actions;
export default adminSlice.reducer;