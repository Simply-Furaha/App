import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { getLoans, reset } from '../features/loans/loansSlice';
import { getLoanLimit } from '../features/user/userSlice';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import DataTable from '../components/common/DataTable';
import { formatCurrency, formatDate, formatLoanStatus } from '../utils/formatters';

const Loans = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loans, isLoading: isLoansLoading } = useSelector((state) => state.loans);
  const { loanLimit, isLoading: isLimitLoading } = useSelector((state) => state.user);
  const [isNavigating, setIsNavigating] = useState(false);
  
  useEffect(() => {
    // Fetch loans and loan limit when component mounts
    dispatch(getLoans());
    dispatch(getLoanLimit());
    
    return () => {
      dispatch(reset());
    };
  }, [dispatch]);
  
  // Debug output for loan limit
  useEffect(() => {
    console.log('Loan limit state:', loanLimit);
  }, [loanLimit]);
  
  const columns = [
    {
      header: 'Loan ID',
      accessor: 'id',
      render: (loan) => `#${loan.id}`
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
      accessor: 'borrowed_date',
      render: (loan) => formatDate(loan.borrowed_date || loan.created_at)
    },
    {
      header: 'Due Date',
      accessor: 'due_date',
      render: (loan) => loan.due_date ? formatDate(loan.due_date) : '-'
    },
    {
      header: 'Balance',
      accessor: 'unpaid_balance',
      render: (loan) => loan.status === 'approved' ? formatCurrency(loan.unpaid_balance) : '-'
    },
    {
      header: 'Actions',
      render: (loan) => (
        <button
          onClick={() => navigate(`/loans/${loan.id}`)}
          className="text-blue-600 hover:text-blue-800"
        >
          View
        </button>
      )
    }
  ];
  
  const pendingLoans = loans?.filter(loan => loan.status === 'pending') || [];
  const activeLoans = loans?.filter(loan => loan.status === 'approved') || [];
  const paidLoans = loans?.filter(loan => loan.status === 'paid') || [];
  
  const isLoading = isLoansLoading || isLimitLoading || isNavigating;
  
  // Handle apply loan button click
  const handleApplyLoan = () => {
    console.log('Apply loan button clicked');
    setIsNavigating(true);
    
    // Force navigation to apply-loan page
    setTimeout(() => {
      console.log('Navigating to /apply-loan');
      window.location.href = '/apply-loan';
      // Alternative to React Router's navigate which might be having issues
      // navigate('/apply-loan', { replace: true });
    }, 100);
  };
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Loans</h1>
          <p className="mt-1 text-gray-600">
            View and manage your loans
          </p>
        </div>
        <div className="mt-4 md:mt-0">
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={handleApplyLoan}
            disabled={isLoading}
          >
            Apply for Loan
          </button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <div className="text-center">
                <p className="text-gray-600 text-sm">Available Loan Limit</p>
                <p className="text-3xl font-bold text-blue-600">{formatCurrency(loanLimit?.available_loan_limit || 0)}</p>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    {loanLimit?.available_loan_limit > 0 
                      ? 'You can apply for a loan up to this amount' 
                      : 'You have reached your maximum loan limit'}
                  </p>
                </div>
              </div>
            </Card>
            
            <Card>
              <div className="text-center">
                <p className="text-gray-600 text-sm">Pending Applications</p>
                <p className="text-3xl font-bold text-yellow-500">{pendingLoans.length}</p>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    {pendingLoans.length > 0 
                      ? 'You have pending loan applications awaiting approval' 
                      : 'No pending loan applications'}
                  </p>
                </div>
              </div>
            </Card>
            
            <Card>
              <div className="text-center">
                <p className="text-gray-600 text-sm">Active Loans</p>
                <p className="text-3xl font-bold text-green-600">{activeLoans.length}</p>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    {activeLoans.length > 0 
                      ? 'You have active loans that need to be repaid' 
                      : 'No active loans'}
                  </p>
                </div>
              </div>
            </Card>
          </div>
          
          {pendingLoans.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Pending Applications</h2>
              <DataTable
                columns={columns}
                data={pendingLoans}
                emptyMessage="No pending loan applications"
              />
            </div>
          )}
          
          {activeLoans.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Active Loans</h2>
              <DataTable
                columns={columns}
                data={activeLoans}
                emptyMessage="No active loans"
              />
            </div>
          )}
          
          {paidLoans.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Loan History</h2>
              <DataTable
                columns={columns}
                data={paidLoans}
                emptyMessage="No loan history"
                pagination={true}
              />
            </div>
          )}
          
          {loans?.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900">No loans found</h3>
              <p className="mt-1 text-sm text-gray-500">
                You haven't applied for any loans yet.
              </p>
              <div className="mt-6">
                <button
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  onClick={handleApplyLoan}
                >
                  Apply for Your First Loan
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Loans;