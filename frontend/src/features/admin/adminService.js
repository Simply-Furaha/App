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
  getAllLoans,
  getPendingLoans,
  approveLoan,
  getInvestments,
  createInvestment,
  updateInvestment
};

export default adminService;