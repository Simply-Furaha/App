import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getAllLoans, getPendingLoans, approveLoan, reset } from '../features/admin/adminSlice';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import DataTable from '../components/common/DataTable';
import Alert from '../components/common/Alert';
import Modal from '../components/common/Modal';
import { formatCurrency, formatDate, formatLoanStatus } from '../utils/formatters';

const AdminLoans = () => {
  const [showAlert, setShowAlert] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [currentLoan, setCurrentLoan] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'pending', 'approved', 'paid'
  
  const dispatch = useDispatch();
  const { loans, pendingLoans, isLoading, isSuccess, isError, message } = useSelector((state) => state.admin);
  
  useEffect(() => {
    dispatch(getAllLoans());
    dispatch(getPendingLoans());
    
    return () => {
      dispatch(reset());
    };
  }, [dispatch]);
  
  useEffect(() => {
    if (isError) {
      setShowAlert(true);
    }
    
    if (isSuccess && showApproveModal) {
      setShowApproveModal(false);
      setCurrentLoan(null);
    }
  }, [isError, isSuccess, showApproveModal]);
  
  const handleApproveClick = (loan) => {
    setCurrentLoan(loan);
    setShowApproveModal(true);
  };
  
  const handleApproveLoan = () => {
    if (currentLoan) {
      dispatch(approveLoan(currentLoan.id));
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
            <Button
              variant="success"
              size="sm"
              onClick={() => handleApproveClick(loan)}
            >
              Approve
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
          </div>
        </div>
        
        {isLoading ? (
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
        onClose={() => setShowApproveModal(false)}
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
                onClick={() => setShowApproveModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleApproveLoan}
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : 'Approve Loan'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminLoans;