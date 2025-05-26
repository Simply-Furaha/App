// src/pages/AdminLoans.jsx
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  getAllLoans, 
  getPendingLoans, 
  approveLoan, 
  rejectLoan,
  addLoanPayment,
  reset 
} from '../features/admin/adminSlice';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import DataTable from '../components/common/DataTable';
import Alert from '../components/common/Alert';
import Modal from '../components/common/Modal';
import { formatCurrency, formatDate, formatLoanStatus } from '../utils/formatters';

const AdminLoans = () => {
  const [showAlert, setShowAlert] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [currentLoan, setCurrentLoan] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'pending', 'approved', 'paid'
  const [operationInProgress, setOperationInProgress] = useState(false);
  
  const dispatch = useDispatch();
  const { loans, pendingLoans, isLoading, isSuccess, isError, message } = useSelector((state) => state.admin);
  
  useEffect(() => {
    dispatch(getAllLoans());
    dispatch(getPendingLoans());
    
    return () => {
      dispatch(reset());
    };
  }, [dispatch]);
  
  // Only reset modals when an operation completes
  useEffect(() => {
    if (isError) {
      setShowAlert(true);
      setOperationInProgress(false);
    }
    
    if (isSuccess && operationInProgress) {
      // Only close modals if an operation was in progress
      if (showApproveModal) {
        setShowApproveModal(false);
      }
      if (showRejectModal) {
        setShowRejectModal(false);
      }
      if (showPaymentModal) {
        setShowPaymentModal(false);
        setPaymentAmount('');
        setTransactionId('');
      }
      setCurrentLoan(null);
      setOperationInProgress(false);
      
      // Refresh data after an operation succeeds
      dispatch(getAllLoans());
      dispatch(getPendingLoans());
    }
  }, [isError, isSuccess, operationInProgress, showApproveModal, showRejectModal, showPaymentModal, dispatch]);
  
  const handleApproveClick = (loan) => {
    setCurrentLoan(loan);
    setShowApproveModal(true);
  };
  
  const handleRejectClick = (loan) => {
    setCurrentLoan(loan);
    setShowRejectModal(true);
  };
  
  const handlePaymentClick = (loan) => {
    setCurrentLoan(loan);
    setPaymentAmount('');
    setTransactionId('');
    setShowPaymentModal(true);
  };
  
  const handleApproveLoan = () => {
    if (currentLoan) {
      setOperationInProgress(true);
      console.log("Approving loan:", currentLoan.id);
      dispatch(approveLoan(currentLoan.id));
    }
  };
  
  const handleRejectLoan = () => {
    if (currentLoan) {
      setOperationInProgress(true);
      console.log("Rejecting loan:", currentLoan.id);
      dispatch(rejectLoan(currentLoan.id));
    }
  };
  
  const handleAddPayment = () => {
    if (currentLoan && paymentAmount) {
      setOperationInProgress(true);
      console.log("Adding payment:", { loanId: currentLoan.id, amount: paymentAmount });
      dispatch(addLoanPayment({
        loanId: currentLoan.id,
        paymentData: {
          amount: parseFloat(paymentAmount),
          transaction_id: transactionId || `MANUAL-${Date.now()}`,
          payment_method: 'manual'
        }
      }));
    }
  };
  
  // Close modal handlers that don't dispatch actions
  const handleCloseApproveModal = () => {
    if (!operationInProgress) {
      setShowApproveModal(false);
      setCurrentLoan(null);
    }
  };

  const handleCloseRejectModal = () => {
    if (!operationInProgress) {
      setShowRejectModal(false);
      setCurrentLoan(null);
    }
  };

  const handleClosePaymentModal = () => {
    if (!operationInProgress) {
      setShowPaymentModal(false);
      setCurrentLoan(null);
      setPaymentAmount('');
      setTransactionId('');
    }
  };
  
  const columns = [
    {
      header: 'Loan ID',
      accessor: 'id',
      render: (loan) => `#${loan.id}`
    },
    {
      header: 'Member',
      render: (loan) => loan.user ? `${loan.user.first_name} ${loan.user.last_name}` : '-'
    },
    {
      header: 'Amount',
      accessor: 'amount',
      render: (loan) => formatCurrency(loan.amount)
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (loan) => {
        const { label, color } = formatLoanStatus(loan.status);
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
            {label}
          </span>
        );
      }
    },
    {
      header: 'Date',
      accessor: 'created_at',
      render: (loan) => formatDate(loan.created_at)
    },
    {
      header: 'Due Date',
      accessor: 'due_date',
      render: (loan) => loan.due_date ? formatDate(loan.due_date) : '-'
    },
    {
      header: 'Actions',
      render: (loan) => (
        <div className="space-x-2">
          {loan.status === 'pending' && (
            <>
              <Button
                variant="success"
                size="sm"
                onClick={() => handleApproveClick(loan)}
              >
                Approve
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleRejectClick(loan)}
              >
                Reject
              </Button>
            </>
          )}
          {loan.status === 'approved' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handlePaymentClick(loan)}
            >
              Add Payment
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={() => {/* View details */}}
          >
            Details
          </Button>
        </div>
      )
    }
  ];
  
  const filteredLoans = () => {
    if (!loans) return [];
    
    switch (activeTab) {
      case 'pending':
        return loans.filter(loan => loan.status === 'pending');
      case 'approved':
        return loans.filter(loan => loan.status === 'approved');
      case 'paid':
        return loans.filter(loan => loan.status === 'paid');
      case 'rejected':
        return loans.filter(loan => loan.status === 'rejected');
      default:
        return loans;
    }
  };
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Loan Management</h1>
        <p className="mt-1 text-gray-600">
          View and manage all loan applications
        </p>
      </div>
      
      {showAlert && isError && (
        <Alert
          type="error"
          message={message}
          onClose={() => setShowAlert(false)}
          autoClose={true}
        />
      )}
      
      <div className="bg-white shadow rounded-lg overflow-hidden mb-8">
        <div className="px-6 py-5 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">Loan Statistics</h2>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-gray-700">Total Loans</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{loans ? loans.length : 0}</p>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-yellow-700">Pending Loans</p>
              <p className="mt-1 text-2xl font-semibold text-yellow-600">
                {loans ? loans.filter(loan => loan.status === 'pending').length : 0}
              </p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-green-700">Approved Loans</p>
              <p className="mt-1 text-2xl font-semibold text-green-600">
                {loans ? loans.filter(loan => loan.status === 'approved').length : 0}
              </p>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-blue-700">Paid Loans</p>
              <p className="mt-1 text-2xl font-semibold text-blue-600">
                {loans ? loans.filter(loan => loan.status === 'paid').length : 0}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">Loans</h2>
            <div className="text-gray-600">
              Total: {loans ? loans.length : 0} loans
            </div>
          </div>
        </div>
        
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex space-x-4">
            <button
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                activeTab === 'all'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => setActiveTab('all')}
            >
              All Loans
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                activeTab === 'pending'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => setActiveTab('pending')}
            >
              Pending
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                activeTab === 'approved'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => setActiveTab('approved')}
            >
              Approved
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                activeTab === 'paid'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => setActiveTab('paid')}
            >
              Paid
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                activeTab === 'rejected'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => setActiveTab('rejected')}
            >
              Rejected
            </button>
          </div>
        </div>
        
        {isLoading && !operationInProgress ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredLoans()}
            emptyMessage="No loan records found"
            pagination={true}
          />
        )}
      </div>
      
      {/* Approve Loan Modal */}
      <Modal
        isOpen={showApproveModal}
        title="Approve Loan"
        onClose={handleCloseApproveModal}
      >
        {currentLoan && (
          <div className="p-6">
            <p className="mb-4">
              Are you sure you want to approve this loan application?
            </p>
            
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Loan ID</p>
                  <p className="font-semibold">#{currentLoan.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Applicant</p>
                  <p className="font-semibold">
                    {currentLoan.user ? `${currentLoan.user.first_name} ${currentLoan.user.last_name}` : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Amount</p>
                  <p className="font-semibold">{formatCurrency(currentLoan.amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Date Applied</p>
                  <p className="font-semibold">{formatDate(currentLoan.created_at)}</p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="secondary"
                onClick={handleCloseApproveModal}
                disabled={operationInProgress || isLoading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleApproveLoan}
                disabled={operationInProgress || isLoading}
              >
                {(operationInProgress || isLoading) ? 'Processing...' : 'Approve Loan'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
      
      {/* Reject Loan Modal */}
      <Modal
        isOpen={showRejectModal}
        title="Reject Loan"
        onClose={handleCloseRejectModal}
      >
        {currentLoan && (
          <div className="p-6">
            <p className="mb-4 text-red-600 font-medium">
              Are you sure you want to reject this loan application?
            </p>
            
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Loan ID</p>
                  <p className="font-semibold">#{currentLoan.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Applicant</p>
                  <p className="font-semibold">
                    {currentLoan.user ? `${currentLoan.user.first_name} ${currentLoan.user.last_name}` : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Amount</p>
                  <p className="font-semibold">{formatCurrency(currentLoan.amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Date Applied</p>
                  <p className="font-semibold">{formatDate(currentLoan.created_at)}</p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="secondary"
                onClick={handleCloseRejectModal}
                disabled={operationInProgress || isLoading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={handleRejectLoan}
                disabled={operationInProgress || isLoading}
              >
                {(operationInProgress || isLoading) ? 'Processing...' : 'Reject Loan'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
      
      {/* Add Payment Modal */}
      <Modal
        isOpen={showPaymentModal}
        title="Add Loan Payment"
        onClose={handleClosePaymentModal}
      >
        {currentLoan && (
          <div className="p-6">
            <div className="mb-4">
              <p className="text-sm text-gray-600">Loan ID</p>
              <p className="font-semibold">#{currentLoan.id}</p>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600">Borrower</p>
              <p className="font-semibold">
                {currentLoan.user ? `${currentLoan.user.first_name} ${currentLoan.user.last_name}` : '-'}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-600">Loan Amount</p>
                <p className="font-semibold">{formatCurrency(currentLoan.amount)}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Outstanding Balance</p>
                <p className="font-semibold text-red-600">{formatCurrency(currentLoan.unpaid_balance)}</p>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Amount
              </label>
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border-gray-300"
                placeholder="Enter payment amount"
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transaction ID (optional)
              </label>
              <input
                type="text"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border-gray-300"
                placeholder="Enter transaction ID"
              />
              <p className="mt-1 text-xs text-gray-500">
                If left empty, a system-generated ID will be used
              </p>
            </div>
            
            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="secondary"
                onClick={handleClosePaymentModal}
                disabled={operationInProgress || isLoading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleAddPayment}
                disabled={operationInProgress || isLoading || !paymentAmount || parseFloat(paymentAmount) <= 0}
              >
                {(operationInProgress || isLoading) ? 'Processing...' : 'Add Payment'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminLoans;