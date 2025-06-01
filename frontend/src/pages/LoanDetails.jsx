import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, Link } from 'react-router-dom';
import { getLoanDetails, repayLoanMpesa, reset, resetMpesa, checkLoanPaymentStatus } from '../features/loans/loansSlice';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import Modal from '../components/common/Modal';
import DataTable from '../components/common/DataTable';
import { formatCurrency, formatDate, formatDateTime, formatLoanStatus } from '../utils/formatters';

const LoanDetails = () => {
  const [showRepayModal, setShowRepayModal] = useState(false);
  const [repayAmount, setRepayAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showAlert, setShowAlert] = useState(false);
  const [paymentInProgress, setPaymentInProgress] = useState(false);
  
  const { loanId } = useParams();
  const dispatch = useDispatch();
  
  const { 
    loan, 
    payments, 
    isLoading, 
    mpesaLoading, 
    mpesaSuccess, 
    mpesaError, 
    mpesaMessage,
    checkoutRequestId,
    mpesaInstructions 
  } = useSelector((state) => state.loans);
  const { user } = useSelector((state) => state.auth);
  
  useEffect(() => {
    dispatch(getLoanDetails(loanId));
    return () => dispatch(reset());
  }, [dispatch, loanId]);
  
  useEffect(() => {
    if (mpesaError || mpesaSuccess) {
      setShowAlert(true);
      setPaymentInProgress(false);
    }
    
    // Auto-check payment status
    if (checkoutRequestId && !mpesaSuccess && !mpesaError) {
      setPaymentInProgress(true);
      const interval = setInterval(() => {
        dispatch(checkLoanPaymentStatus(checkoutRequestId));
      }, 5000);
      
      setTimeout(() => clearInterval(interval), 120000);
      return () => clearInterval(interval);
    }
  }, [mpesaError, mpesaSuccess, checkoutRequestId, dispatch]);
  
  const handleOpenRepayModal = () => {
    setRepayAmount(loan?.unpaid_balance || '');
    setPhoneNumber(user?.phone_number || '');
    setShowRepayModal(true);
  };
  
  const handleRepayment = () => {
    const amount = parseFloat(repayAmount);
    const formattedPhone = formatPhone(phoneNumber);
    
    if (amount > 0 && amount <= loan?.unpaid_balance) {
      dispatch(resetMpesa());
      dispatch(repayLoanMpesa({
        loan_id: loan.id,
        amount,
        phone_number: formattedPhone
      }));
      setShowRepayModal(false);
    }
  };
  
  const formatPhone = (phone) => {
    let formatted = phone.replace(/\s+/g, '');
    if (formatted.startsWith('0')) {
      formatted = '254' + formatted.substring(1);
    }
    if (formatted.startsWith('+')) {
      formatted = formatted.substring(1);
    }
    if (!formatted.startsWith('254')) {
      formatted = '254' + formatted;
    }
    return formatted;
  };
  
  const paymentColumns = [
    {
      header: 'Date',
      accessor: 'payment_date',
      render: (payment) => formatDateTime(payment.payment_date)
    },
    {
      header: 'Amount',
      accessor: 'amount',
      render: (payment) => formatCurrency(payment.amount)
    },
    {
      header: 'Method',
      accessor: 'payment_method',
      render: (payment) => payment.payment_method.toUpperCase()
    },
    {
      header: 'Transaction ID',
      accessor: 'transaction_id',
      render: (payment) => payment.transaction_id || '-'
    }
  ];
  
  if (isLoading || !loan) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }
  
  const { label: statusLabel, color: statusColor } = formatLoanStatus(loan.status);
  const repaymentProgress = loan.amount_due > 0 ? (loan.paid_amount / loan.amount_due) * 100 : 0;
  
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {showAlert && (mpesaError || mpesaSuccess) && (
        <Alert
          type={mpesaError ? 'error' : 'success'}
          message={mpesaMessage}
          onClose={() => setShowAlert(false)}
          autoClose={true}
        />
      )}
      
      {paymentInProgress && (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            <span className="text-blue-700">Processing M-PESA repayment...</span>
          </div>
        </div>
      )}
      
      {mpesaInstructions.length > 0 && (
        <div className="mb-4 p-4 bg-green-50 rounded-lg">
          <h4 className="font-medium text-green-800 mb-2">Payment Instructions:</h4>
          <ul className="text-sm text-green-700 space-y-1">
            {mpesaInstructions.map((instruction, index) => (
              <li key={index}>• {instruction}</li>
            ))}
          </ul>
        </div>
      )}
      
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Loan #{loan.id}</h1>
          <p className="mt-1 text-gray-600">
            {loan.borrowed_date ? `Borrowed on ${formatDate(loan.borrowed_date)}` : 'Application submitted'}
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-4">
          <Link to="/loans">
            <Button variant="secondary">Back to Loans</Button>
          </Link>
          
          {loan.status === 'approved' && loan.unpaid_balance > 0 && (
            <Button 
              variant="primary" 
              onClick={handleOpenRepayModal}
              disabled={mpesaLoading || paymentInProgress}
            >
              {mpesaLoading ? 'Processing...' : 'Repay via M-PESA'}
            </Button>
          )}
        </div>
      </div>
      
      <div className="bg-white shadow rounded-lg overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">Loan Details</h2>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor}`}>
              {statusLabel}
            </span>
          </div>
        </div>
        
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600">Loan Amount</p>
              <p className="text-lg font-semibold">{formatCurrency(loan.amount)}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600">Interest Rate</p>
              <p className="text-lg font-semibold">{loan.interest_rate}%</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600">Total Amount Due</p>
              <p className="text-lg font-semibold">{formatCurrency(loan.amount_due)}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600">Outstanding Balance</p>
              <p className="text-lg font-semibold text-red-600">{formatCurrency(loan.unpaid_balance)}</p>
            </div>
          </div>
          
          {loan.status === 'approved' && (
            <div className="mt-6">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Repayment Progress</span>
                <span className="text-gray-900">{Math.round(repaymentProgress)}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 rounded-full" 
                  style={{ width: `${repaymentProgress}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {payments && payments.length > 0 && (
        <Card title="Payment History">
          <DataTable
            columns={paymentColumns}
            data={payments}
            emptyMessage="No payment records found"
          />
        </Card>
      )}
      
      {/* M-PESA Repayment Modal */}
      <Modal
        isOpen={showRepayModal}
        title="Repay Loan via M-PESA"
        onClose={() => setShowRepayModal(false)}
      >
        <div className="p-6">
          <div className="mb-4">
            <p className="text-sm text-gray-600">Outstanding Balance</p>
            <p className="text-xl font-semibold">{formatCurrency(loan.unpaid_balance)}</p>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Amount (KES)
            </label>
            <input
              type="number"
              value={repayAmount}
              onChange={(e) => setRepayAmount(e.target.value)}
              min="1"
              max={loan.unpaid_balance}
              className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border-gray-300"
              placeholder="Enter payment amount"
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              M-PESA Phone Number
            </label>
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border-gray-300"
              placeholder="0712345678"
            />
          </div>
          
          <div className="bg-yellow-50 p-4 mb-6 rounded-md">
            <p className="text-sm text-yellow-700">
              💡 You'll receive an M-PESA payment request on your phone. Enter your PIN to complete the repayment.
            </p>
          </div>
          
          <div className="flex justify-end space-x-4">
            <Button
              variant="secondary"
              onClick={() => setShowRepayModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleRepayment}
              disabled={!repayAmount || parseFloat(repayAmount) <= 0 || parseFloat(repayAmount) > loan.unpaid_balance || !phoneNumber}
            >
              Send M-PESA Request
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default LoanDetails;