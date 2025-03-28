import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import adminService from './adminService';

const initialState = {
  dashboard: null,
  users: [],
  loans: [],
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