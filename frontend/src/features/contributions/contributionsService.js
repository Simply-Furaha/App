import axios from '../../utils/axiosConfig';

// Get user contributions
const getContributions = async () => {
  const response = await axios.get('/users/me/contributions');
  return response.data;
};

// Make a contribution via M-PESA
const makeContribution = async (contributionData) => {
  try {
    console.log('🚀 Initiating M-PESA contribution:', contributionData);
    const response = await axios.post('/mpesa/initiate-contribution', contributionData);
    console.log('✅ M-PESA contribution response:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error making contribution:', error.response?.data || error.message);
    throw error;
  }
};

// Check M-PESA payment status
const checkPaymentStatus = async (checkoutRequestId) => {
  try {
    console.log('🔍 Checking M-PESA payment status for:', checkoutRequestId);
    const response = await axios.get(`/mpesa/payment-status/${checkoutRequestId}`);
    console.log('📊 Payment status response:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error checking payment status:', error.response?.data || error.message);
    throw error;
  }
};

// Get user's pending M-PESA payments
const getPendingPayments = async () => {
  try {
    console.log('📋 Fetching pending M-PESA payments');
    const response = await axios.get('/mpesa/user-payments');
    console.log('✅ Pending payments fetched:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching pending payments:', error.response?.data || error.message);
    throw error;
  }
};

// Test contribution (development only)
const testContribution = async (contributionData) => {
  try {
    console.log('🧪 Creating test contribution:', contributionData);
    const response = await axios.post('/mpesa/test-contribution', contributionData);
    console.log('✅ Test contribution response:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error creating test contribution:', error.response?.data || error.message);
    throw error;
  }
};

// Legacy transaction status check (for backward compatibility)
const checkTransactionStatus = async (checkoutRequestId) => {
  console.warn('⚠️ checkTransactionStatus is deprecated, use checkPaymentStatus instead');
  return checkPaymentStatus(checkoutRequestId);
};

const contributionsService = {
  getContributions,
  makeContribution,
  checkPaymentStatus,
  getPendingPayments,
  testContribution,
  checkTransactionStatus 
};

export default contributionsService;