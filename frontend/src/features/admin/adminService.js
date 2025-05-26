// src/features/admin/adminService.js
import axios from '../../utils/axiosConfig';

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

const adminService = {
  getDashboard,
  getUsers,
  createUser,
  deleteUser,
  getAllLoans,
  getPendingLoans,
  approveLoan,
  rejectLoan,
  addLoanPayment,
  addContribution,
  getInvestments,
  createInvestment,
  updateInvestment
};

export default adminService;