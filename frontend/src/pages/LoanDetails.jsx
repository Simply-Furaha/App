import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getLoanDetails, repayLoan, reset } from '../features/loans/loansSlice';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import Input from '../components/common/Input';
import Modal from '../components/common/Modal';
import DataTable from '../components/common/DataTable';
import { formatCurrency, formatDate, formatDateTime, formatLoanStatus } from '../utils/formatters';

const LoanDetails = () => {
  const [showRepayModal, setShowRepayModal] = useState(false);
  const [repayAmount, setRepayAmount] = useState('');
  const [showAlert, setShowAlert] = useState(false);
  
  const { loanId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const { loan, payments, isLoading, isSuccess, isError, message } = useSelector((state) => state.loans);
  
  useEffect(() => {
    dispatch(getLoanDetails(loanId));
    
    return () => {
      dispatch(reset());
    };
  }, [dispatch, loanId]);
  
  useEffect(() => {
    if (isError) {
      setShowAlert(true);
    }
  }, [isError]);
  
  const handleOpenRepayModal = () => {
    setRepayAmount(loan?.unpaid_balance || '');
    setShowRepayModal(true);
  };
  
  const handleRepayment = () => {
    const amount = parseFloat(repayAmount);
    
    if (amount > 0 && amount <= loan?.unpaid_balance) {
      dispatch(repayLoan({
        loan_id: loan.id,
        amount
      }));
      setShowRepayModal(false);
    }
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
      {showAlert && isError && (
        <Alert
          type="error"
          message={message}
          onClose={() => setShowAlert(false)}
          autoClose={true}
        />
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
            <Button variant="secondary">
              Back to Loans
            </Button>
          </Link>
          
          {loan.status === 'approved' && loan.unpaid_balance > 0 && (
            <Button variant="primary" onClick={handleOpenRepayModal}>
              Make Payment
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
              <p className="text-sm text-gray-600">Borrowed Date</p>
              <p className="text-lg font-semibold">
                {loan.borrowed_date ? formatDate(loan.borrowed_date) : 'Pending approval'}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600">Due Date</p>
              <p className="text-lg font-semibold">
                {loan.due_date ? formatDate(loan.due_date) : '-'}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600">Days Remaining</p>
              <p className="text-lg font-semibold">
                {loan.days_remaining > 0 ? `${loan.days_remaining} days` : 'Overdue'}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600">Paid Amount</p>
              <p className="text-lg font-semibold">{formatCurrency(loan.paid_amount)}</p>
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
      
      {/* Repayment Modal */}
      <Modal
        isOpen={showRepayModal}
        title="Make Loan Payment"
        onClose={() => setShowRepayModal(false)}
      >
        <div className="p-6">
          <div className="mb-4">
            <p className="text-sm text-gray-600">Outstanding Balance</p>
            <p className="text-xl font-semibold">{formatCurrency(loan.unpaid_balance)}</p>
          </div>
          
          <div className="mb-6">
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
            <p className="mt-1 text-sm text-gray-500">
              You can pay any amount up to the full outstanding balance.
            </p>
          </div>
          
          <div className="bg-yellow-50 p-4 mb-6 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Payment Notice</h3>
                <div className="mt-1 text-sm text-yellow-700">
                  <p>This will initiate an M-PESA payment request to your registered phone number. You will need to confirm the payment using your M-PESA PIN.</p>
                </div>
              </div>
            </div>
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
              disabled={!repayAmount || parseFloat(repayAmount) <= 0 || parseFloat(repayAmount) > loan.unpaid_balance}
            >
              Proceed to Pay
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default LoanDetails;