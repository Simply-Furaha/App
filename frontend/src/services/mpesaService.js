// src/services/mpesaService.js
import axios from '../utils/axiosConfig';

// M-PESA Payment Services
const initiateContribution = async (contributionData) => {
  const response = await axios.post('/mpesa/contribute', contributionData);
  return response.data;
};

const initiateLoanRepayment = async (repaymentData) => {
  const response = await axios.post('/mpesa/repay-loan', repaymentData);
  return response.data;
};

const getPaymentStatus = async (checkoutRequestId) => {
  const response = await axios.get(`/mpesa/payment-status/${checkoutRequestId}`);
  return response.data;
};

const getPaymentHistory = async (params = {}) => {
  const response = await axios.get('/mpesa/payment-history', { params });
  return response.data;
};

// Admin M-PESA Services
const getAllPayments = async (params = {}) => {
  const response = await axios.get('/mpesa/admin/payment-status', { params });
  return response.data;
};

// Test and Debug Services
const testPayment = async (testData) => {
  const response = await axios.post('/mpesa/test-payment', testData);
  return response.data;
};

const getConfigStatus = async () => {
  const response = await axios.get('/mpesa/config-status');
  return response.data;
};

const mpesaService = {
  initiateContribution,
  initiateLoanRepayment,
  getPaymentStatus,
  getPaymentHistory,
  getAllPayments,
  testPayment,
  getConfigStatus
};

export default mpesaService;