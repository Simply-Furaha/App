import axios from '../../utils/axiosConfig';

// Get user contributions
const getContributions = async () => {
  const response = await axios.get('/users/me/contributions');
  return response.data;
};

// Make a contribution
const makeContribution = async (contributionData) => {
  try {
    console.log('Sending contribution request with data:', contributionData);
    const response = await axios.post('/mpesa/initiate-contribution', contributionData);
    console.log('Contribution response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error making contribution:', error.response?.data || error.message);
    throw error;
  }
};

// Check transaction status
const checkTransactionStatus = async (checkoutRequestId) => {
  try {
    console.log('Checking transaction status for:', checkoutRequestId);
    const response = await axios.get(`/mpesa/check-transaction/${checkoutRequestId}`);
    console.log('Transaction status response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error checking transaction status:', error.response?.data || error.message);
    throw error;
  }
};

const contributionsService = {
  getContributions,
  makeContribution,
  checkTransactionStatus
};

export default contributionsService;