import axios from '../../utils/axiosConfig';

// Get user contributions
const getContributions = async () => {
  const response = await axios.get('/users/me/contributions');
  return response.data;
};

// Make a contribution
const makeContribution = async (contributionData) => {
  const response = await axios.post('/mpesa/initiate-contribution', contributionData);
  return response.data;
};

const contributionsService = {
  getContributions,
  makeContribution
};

export default contributionsService;