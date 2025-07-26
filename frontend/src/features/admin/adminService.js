// src/features/admin/adminService.js - Enhanced with new features
import axios from '../../utils/axiosConfig';

// ============= EXISTING SERVICES =============

// Get admin dashboard data
const getDashboard = async () => {
  const response = await axios.get('/admin/dashboard');
  return response.data;
};

// Get all users
const getUsers = async () => {
  const response = await axios.get('/admin/users');
  return response.data;
};

// Create a new user (admin only)
const createUser = async (userData) => {
  const response = await axios.post('/admin/users', userData);
  return response.data;
};

// Delete user (admin only)
const deleteUser = async (userId) => {
  const response = await axios.delete(`/admin/users/${userId}`);
  return response.data;
};

// Suspend/Unsuspend user (admin only)
const suspendUser = async (userId, suspendData) => {
  const response = await axios.put(`/admin/users/${userId}/suspend`, suspendData);
  return response.data;
};

// Get all loans
const getAllLoans = async () => {
  const response = await axios.get('/admin/loans');
  return response.data;
};

// Get pending loans
const getPendingLoans = async () => {
  const response = await axios.get('/admin/loans/pending');
  return response.data;
};

// Approve loan
const approveLoan = async (loanId) => {
  const response = await axios.put(`/admin/loans/${loanId}/approve`);
  return response.data;
};

// Reject loan
const rejectLoan = async (loanId) => {
  const response = await axios.put(`/admin/loans/${loanId}/reject`);
  return response.data;
};

// Add loan payment
const addLoanPayment = async (loanId, paymentData) => {
  const response = await axios.post(`/admin/loans/${loanId}/payment`, paymentData);
  return response.data;
};

// Add user contribution
const addContribution = async (contributionData) => {
  const response = await axios.post('/admin/contributions', contributionData);
  return response.data;
};

// Get all investments
const getInvestments = async () => {
  const response = await axios.get('/admin/investments');
  return response.data;
};

// Create investment
const createInvestment = async (investmentData) => {
  const response = await axios.post('/admin/investments', investmentData);
  return response.data;
};

// Update investment
const updateInvestment = async (investmentId, investmentData) => {
  const response = await axios.put(`/admin/investments/${investmentId}`, investmentData);
  return response.data;
};

// ============= NEW FEATURES =============

// Get admin activity logs
const getActivityLogs = async (params = {}) => {
  const response = await axios.get('/admin/activity-logs', { params });
  return response.data;
};

// Get overpayments
const getOverpayments = async () => {
  const response = await axios.get('/admin/overpayments');
  return response.data;
};

// Allocate overpayment
const allocateOverpayment = async (overpaymentId, allocationData) => {
  const response = await axios.put(`/admin/overpayments/${overpaymentId}/allocate`, allocationData);
  return response.data;
};

// Modify loan debt
const modifyLoanDebt = async (loanId, debtData) => {
  const response = await axios.put(`/admin/loans/${loanId}/modify-debt`, debtData);
  return response.data;
};

// Add contribution for another admin
const addAdminContribution = async (contributionData) => {
  const response = await axios.post('/admin/admin-contribution', contributionData);
  return response.data;
};

// Get user's active loans (for overpayment allocation)
const getUserActiveLoans = async (userId) => {
  const response = await axios.get(`/admin/users/${userId}/active-loans`);
  return response.data;
};

const adminService = {
  // Existing services
  getDashboard,
  getUsers,
  createUser,
  deleteUser,
  suspendUser,
  getAllLoans,
  getPendingLoans,
  approveLoan,
  rejectLoan,
  addLoanPayment,
  addContribution,
  getInvestments,
  createInvestment,
  updateInvestment,
  
  // New services
  getActivityLogs,
  getOverpayments,
  allocateOverpayment,
  modifyLoanDebt,
  addAdminContribution,
  getUserActiveLoans
};

export default adminService;