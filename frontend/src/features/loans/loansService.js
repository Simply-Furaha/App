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

// Repay loan via M-PESA
const repayLoanMpesa = async (repaymentData) => {
  try {
    console.log('🚀 Initiating M-PESA loan repayment:', repaymentData);
    const response = await axios.post('/mpesa/initiate-loan-repayment', {
      loan_id: repaymentData.loan_id,
      amount: repaymentData.amount,
      phone_number: repaymentData.phone_number
    });
    console.log('✅ M-PESA loan repayment response:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error initiating loan repayment:', error.response?.data || error.message);
    throw error;
  }
};

// Legacy repay loan function (for backward compatibility)
const repayLoan = async (repaymentData) => {
  console.warn('⚠️ repayLoan is deprecated, use repayLoanMpesa instead');
  return repayLoanMpesa(repaymentData);
};

// Check M-PESA payment status for loan repayment
const checkLoanPaymentStatus = async (checkoutRequestId) => {
  try {
    console.log('🔍 Checking M-PESA loan payment status for:', checkoutRequestId);
    const response = await axios.get(`/mpesa/payment-status/${checkoutRequestId}`);
    console.log('📊 Loan payment status response:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error checking loan payment status:', error.response?.data || error.message);
    throw error;
  }
};

// Get user's pending loan payments
const getPendingLoanPayments = async () => {
  try {
    console.log('📋 Fetching pending M-PESA loan payments');
    const response = await axios.get('/mpesa/user-payments');
    console.log('✅ Pending loan payments fetched:', response.data);
    // Filter for loan repayment payments only
    const data = response.data;
    return {
      ...data,
      pending_payments: data.pending_payments?.filter(payment => payment.transaction_type === 'loan_repayment') || []
    };
  } catch (error) {
    console.error('❌ Error fetching pending loan payments:', error.response?.data || error.message);
    throw error;
  }
};

// Test loan repayment (development only)
const testLoanRepayment = async (repaymentData) => {
  try {
    console.log('🧪 Creating test loan repayment:', repaymentData);
    const response = await axios.post('/mpesa/test-loan-repayment', repaymentData);
    console.log('✅ Test loan repayment response:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error creating test loan repayment:', error.response?.data || error.message);
    throw error;
  }
};

const loansService = {
  getLoans,
  getLoanDetails,
  applyForLoan,
  repayLoanMpesa,
  checkLoanPaymentStatus,
  getPendingLoanPayments,
  testLoanRepayment,
  repayLoan 
};

export default loansService;