// src/pages/LoanDetails.jsx - Enhanced with M-PESA repayment
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { getLoanDetails, repayLoanMpesa, reset } from '../features/loans/loansSlice';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import Modal from '../components/common/Modal';
import MPESAPayment from '../components/payments/MPESAPayment';
import { formatCurrency, formatDate, formatLoanStatus } from '../utils/formatters';

const LoanDetails = () => {
  const { loanId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const [showAlert, setShowAlert] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showMPESAModal, setShowMPESAModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('mpesa');

  const { loan, isLoading, isSuccess, isError, message } = useSelector(
    (state) => state.loans
  );

  useEffect(() => {
    if (loanId) {
      dispatch(getLoanDetails(loanId));
    }
    
    return () => {
      dispatch(reset());
    };
  }, [dispatch, loanId]);

  useEffect(() => {
    if (isError) {
      setShowAlert(true);
    }
    
    if (isSuccess && message) {
      setShowAlert(true);
      setShowPaymentModal(false);
      setShowMPESAModal(false);
      // Refresh loan details after payment
      dispatch(getLoanDetails(loanId));
    }
  }, [isError, isSuccess, message, dispatch, loanId]);

  const handleMPESASuccess = (paymentData) => {
    console.log('M-PESA loan payment successful:', paymentData);
    setShowAlert(true);
    // Refresh loan details
    dispatch(getLoanDetails(loanId));
  };

  const handleMPESAError = (error) => {
    console.error('M-PESA loan payment error:', error);
    setShowAlert(true);
  };

  const handleManualPayment = async () => {
    const paymentData = {
      loanId: parseInt(loanId),
      amount: parseFloat(paymentAmount),
      payment_method: 'manual'
    };
    
    dispatch(makePayment(paymentData));
  };

  const calculatePaymentSummary = () => {
    if (!loan) return null;

    const remainingBalance = loan.unpaid_balance || (loan.amount_due - loan.paid_amount);
    const paymentPercentage = loan.amount_due > 0 ? (loan.paid_amount / loan.amount_due) * 100 : 0;
    
    return {
      remainingBalance,
      paymentPercentage,
      isFullyPaid: remainingBalance <= 0,
      nextPaymentSuggestion: Math.min(remainingBalance, 5000) // Suggest payment up to 5000 or remaining balance
    };
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'paid':
        return 'bg-blue-100 text-blue-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDaysRemaining = () => {
    if (!loan?.due_date) return null;
    
    const dueDate = new Date(loan.due_date);
    const today = new Date();
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Loan Not Found</h2>
          <p className="mt-2 text-gray-600">The requested loan could not be found.</p>
          <Button
            variant="primary"
            onClick={() => navigate('/loans')}
            className="mt-4"
          >
            Back to Loans
          </Button>
        </div>
      </div>
    );
  }

  const paymentSummary = calculatePaymentSummary();
  const daysRemaining = getDaysRemaining();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Alert */}
      {showAlert && (
        <Alert
          type={isError ? 'error' : 'success'}
          message={message}
          onClose={() => setShowAlert(false)}
          className="mb-6"
        />
      )}

      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Loan #{loan.id}
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Loan details and payment information
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => navigate('/loans')}
          >
            ← Back to Loans
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Loan Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Loan Details */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Loan Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Loan Amount</label>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatCurrency(loan.amount)}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-500">Interest Rate</label>
                  <p className="text-lg font-semibold text-gray-900">
                    {loan.interest_rate || 5}%
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-500">Amount Due</label>
                  <p className="text-lg font-semibold text-red-600">
                    {formatCurrency(loan.amount_due)}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-500">Status</label>
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(loan.status)}`}>
                    {formatLoanStatus(loan.status)}
                  </span>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-500">Application Date</label>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatDate(loan.created_at)}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-500">Due Date</label>
                  <p className="text-lg font-semibold text-gray-900">
                    {loan.due_date ? formatDate(loan.due_date) : 'Not set'}
                  </p>
                </div>
              </div>

              {/* Days Remaining Alert */}
              {daysRemaining !== null && loan.status === 'approved' && !paymentSummary.isFullyPaid && (
                <div className={`mt-4 p-3 rounded-lg ${
                  daysRemaining < 0 ? 'bg-red-50 text-red-800' :
                  daysRemaining <= 7 ? 'bg-yellow-50 text-yellow-800' :
                  'bg-blue-50 text-blue-800'
                }`}>
                  <p className="text-sm font-medium">
                    {daysRemaining < 0 
                      ? `Overdue by ${Math.abs(daysRemaining)} days`
                      : daysRemaining === 0 
                      ? 'Due today!'
                      : `${daysRemaining} days remaining`
                    }
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Payment History */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Payment History</h3>
              
              {loan.payments && loan.payments.length > 0 ? (
                <div className="space-y-3">
                  {loan.payments.map((payment, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">
                          {formatCurrency(payment.amount)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {formatDate(payment.payment_date)} • {payment.payment_method?.toUpperCase()}
                        </p>
                        {payment.transaction_id && (
                          <p className="text-xs text-gray-500 font-mono">
                            {payment.transaction_id}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Paid
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  No payments made yet
                </p>
              )}
            </div>
          </Card>
        </div>

        {/* Payment Section */}
        <div className="space-y-6">
          {/* Payment Summary */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Summary</h3>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm">
                    <span>Paid Amount</span>
                    <span className="font-medium">{formatCurrency(loan.paid_amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Remaining Balance</span>
                    <span className="font-medium text-red-600">
                      {formatCurrency(paymentSummary.remainingBalance)}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Progress</span>
                    <span>{paymentSummary.paymentPercentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(paymentSummary.paymentPercentage, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Payment Status */}
                {paymentSummary.isFullyPaid ? (
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-green-600 text-2xl mb-2">✅</div>
                    <p className="text-green-800 font-medium">Loan Fully Paid!</p>
                    <p className="text-green-600 text-sm">
                      Congratulations on completing your loan
                    </p>
                  </div>
                ) : loan.status === 'approved' ? (
                  <div className="space-y-3">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-blue-800 font-medium">Make a Payment</p>
                      <p className="text-blue-600 text-sm">
                        Suggested: {formatCurrency(paymentSummary.nextPaymentSuggestion)}
                      </p>
                    </div>
                    
                    {/* M-PESA Payment Button */}
                    <div className="space-y-2">
                      <MPESAPayment
                        type="loan_repayment"
                        amount={paymentSummary.nextPaymentSuggestion.toString()}
                        loanId={loan.id}
                        onSuccess={handleMPESASuccess}
                        onError={handleMPESAError}
                      />
                      
                      <Button
                        variant="secondary"
                        onClick={() => setShowMPESAModal(true)}
                        className="w-full"
                      >
                        Custom Amount Payment
                      </Button>
                      
                      <Button
                        variant="outline"
                        onClick={() => setShowPaymentModal(true)}
                        className="w-full"
                      >
                        Record Manual Payment
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-gray-600">
                      {loan.status === 'pending' ? 'Loan pending approval' :
                       loan.status === 'rejected' ? 'Loan was rejected' :
                       'Payment not available'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Quick Actions */}
          {loan.status === 'approved' && !paymentSummary.isFullyPaid && (
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Payments</h3>
                
                <div className="space-y-2">
                  {[1000, 2000, 5000].map((amount) => (
                    <Button
                      key={amount}
                      variant="outline"
                      onClick={() => {
                        setPaymentAmount(amount.toString());
                        setShowMPESAModal(true);
                      }}
                      className="w-full"
                      disabled={amount > paymentSummary.remainingBalance}
                    >
                      Pay {formatCurrency(amount)}
                    </Button>
                  ))}
                  
                  <Button
                    variant="primary"
                    onClick={() => {
                      setPaymentAmount(paymentSummary.remainingBalance.toString());
                      setShowMPESAModal(true);
                    }}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    Pay Full Balance ({formatCurrency(paymentSummary.remainingBalance)})
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Custom M-PESA Payment Modal */}
      <Modal
        isOpen={showMPESAModal}
        onClose={() => setShowMPESAModal(false)}
        title="Make Loan Payment via M-PESA"
        size="md"
      >
        <div className="space-y-6">
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-medium text-green-900 mb-2">M-PESA Loan Payment</h4>
            <p className="text-sm text-green-700">
              Pay your loan repayment securely using M-PESA. 
              You'll receive a prompt on your phone to complete the payment.
            </p>
            <div className="mt-2 text-sm text-green-600">
              <p>Remaining Balance: {formatCurrency(paymentSummary?.remainingBalance || 0)}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={customPhoneNumber || user?.phone_number || ''}
              onChange={(e) => setCustomPhoneNumber(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="e.g., 0712345678 or 254712345678"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the phone number that will receive the M-PESA prompt
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Amount (KES)
            </label>
            <input
              type="number"
              min="1"
              max={paymentSummary?.remainingBalance || 0}
              step="0.01"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Enter payment amount"
            />
            <p className="text-xs text-gray-500 mt-1">
              Maximum: {formatCurrency(paymentSummary?.remainingBalance || 0)}
            </p>
          </div>

          <div className="pt-4">
            <MPESAPayment
              type="loan_repayment"
              amount={paymentAmount}
              loanId={loan.id}
              onSuccess={(paymentData) => {
                handleMPESASuccess(paymentData);
                setShowMPESAModal(false);
              }}
              onError={handleMPESAError}
            />
          </div>
        </div>
      </Modal>

      {/* Manual Payment Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Record Manual Loan Payment"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Manual Payment</h4>
            <p className="text-sm text-blue-700">
              Record a loan payment that was made through cash, bank transfer, or other means.
            </p>
            <div className="mt-2 text-sm text-blue-600">
              <p>Remaining Balance: {formatCurrency(paymentSummary?.remainingBalance || 0)}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Amount (KES)
            </label>
            <input
              type="number"
              min="1"
              max={paymentSummary?.remainingBalance || 0}
              step="0.01"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter payment amount"
            />
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <Button
              variant="secondary"
              onClick={() => setShowPaymentModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleManualPayment}
              disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
            >
              Record Payment
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default LoanDetails;