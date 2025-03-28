import axios from '../../utils/axiosConfig';

// Get all loans for current user
const getLoans = async () => {
  const response = await axios.get('/loans');
  return response.data;
};

// Get loan details
const getLoanDetails = async (loanId) => {
  const response = await axios.get(`/loans/${loanId}`);
  return response.data;
};

// Apply for a loan
const applyForLoan = async (loanData) => {
  const response = await axios.post('/loans', loanData);
  return response.data;
};

// Repay loan
const repayLoan = async (repaymentData) => {
  const response = await axios.post(`/loans/${repaymentData.loan_id}/repay`, {
    amount: repaymentData.amount
  });
  return response.data;
};

const loansService = {
  getLoans,
  getLoanDetails,
  applyForLoan,
  repayLoan
};

export default loansService;