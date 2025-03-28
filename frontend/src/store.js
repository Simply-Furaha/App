import { configureStore } from '@reduxjs/toolkit';
import authReducer from './features/auth/authSlice';
import userReducer from './features/user/userSlice';
import loansReducer from './features/loans/loansSlice';
import contributionsReducer from './features/contributions/contributionsSlice';
import adminReducer from './features/admin/adminSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    user: userReducer,
    loans: loansReducer,
    contributions: contributionsReducer,
    admin: adminReducer
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({
    serializableCheck: false
  })
});

export default store;