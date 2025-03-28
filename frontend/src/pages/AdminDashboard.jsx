import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { getDashboard } from '../features/admin/adminSlice';
import StatCard from '../components/dashboard/StatCard';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import DataTable from '../components/common/DataTable';
import { formatCurrency, formatDate, formatLoanStatus } from '../utils/formatters';

const AdminDashboard = () => {
  const dispatch = useDispatch();
  const { dashboard, isLoading } = useSelector((state) => state.admin);
  
  useEffect(() => {
    dispatch(getDashboard());
  }, [dispatch]);
  
  const loanColumns = [
    {
      header: 'Loan ID',
      accessor: 'id',
      render: (loan) => `#${loan.id}`
    },
    {
      header: 'Member',
      render: (loan) => `${loan.user.first_name} ${loan.user.last_name}`
    },
    {
      header: 'Amount',
      accessor: 'amount',
      render: (loan) => formatCurrency(loan.amount)
    },
    {
      header: 'Interest',
      render: (loan) => `${loan.interest_rate}%`
    },
    {
      header: 'Date Requested',
      accessor: 'created_at',
      render: (loan) => formatDate(loan.created_at)
    },
    {
      header: 'Actions',
      render: (loan) => (
        <Link to={`/admin/loans/${loan.id}`}>
          <Button variant="primary" size="sm">
            Review
          </Button>
        </Link>
      )
    }
  ];
  
  if (isLoading || !dashboard) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-1 text-gray-600">
          Overview of system statistics and pending actions
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Members"
          value={dashboard.users.total}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          }
          color="blue"
        />
        
        <StatCard
          title="Active Members"
          value={dashboard.users.active}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
          color="green"
        />
        
        <StatCard
          title="Pending Loans"
          value={dashboard.loans.pending}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
          color="yellow"
        />
        
        <StatCard
          title="Active Loans"
          value={dashboard.loans.approved}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
          color="purple"
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <Card 
          title="Financial Summary"
          footer={
            <Link to="/admin/investments" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              View All Investments →
            </Link>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-gray-700">Total Loan Amount</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{formatCurrency(dashboard.loans.total_amount)}</p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-gray-700">External Investments</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{formatCurrency(dashboard.investments.total)}</p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-gray-700">Active Investments</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{formatCurrency(dashboard.investments.active)}</p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-gray-700">Completed Investments</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{formatCurrency(dashboard.investments.completed)}</p>
            </div>
          </div>
        </Card>
        
        <Card 
          title="Loan Statistics"
          footer={
            <Link to="/admin/loans" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              View All Loans →
            </Link>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-gray-700">Total Loans</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{dashboard.loans.total}</p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-gray-700">Pending Approvals</p>
              <p className="mt-1 text-2xl font-semibold text-text-yellow-600">{dashboard.loans.pending}</p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-gray-700">Approved Loans</p>
              <p className="mt-1 text-2xl font-semibold text-green-600">{dashboard.loans.approved}</p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-gray-700">Paid Loans</p>
              <p className="mt-1 text-2xl font-semibold text-blue-600">{dashboard.loans.paid}</p>
            </div>
          </div>
        </Card>
      </div>
      
      <Card 
        title="Pending Loan Applications"
        subtitle={`${dashboard.loans.pending_loans.length} loan(s) pending approval`}
        footer={
          dashboard.loans.pending_loans.length > 0 ? (
            <Link to="/admin/loans/pending" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              View All Pending Loans →
            </Link>
          ) : null
        }
      >
        {dashboard.loans.pending_loans.length > 0 ? (
          <DataTable
            columns={loanColumns}
            data={dashboard.loans.pending_loans}
            emptyMessage="No pending loan applications"
          />
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No pending loan applications at the moment</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AdminDashboard;