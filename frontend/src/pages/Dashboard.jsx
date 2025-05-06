import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getDashboard } from '../features/user/userSlice';
import StatCard from '../components/dashboard/StatCard';
import ContributionChart from '../components/dashboard/ContributionChart';
import LoanSummary from '../components/dashboard/LoanSummary';
import LoanApplicationForm from '../components/loans/LoanApplicationForm';
import ContributionSharesChart from './ContributionSharesChart';
import { formatCurrency } from '../utils/formatters';

const Dashboard = () => {
  const dispatch = useDispatch();
  const { dashboard, isLoading } = useSelector((state) => state.user);
  const { user } = useSelector((state) => state.auth);
  
  useEffect(() => {
    dispatch(getDashboard());
  }, [dispatch]);
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };
  
  if (isLoading || !dashboard) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  // Calculate share percentage safely
  const calculateSharePercentage = () => {
    const total = dashboard.total_fund_value || 0;
    const userTotal = dashboard.contributions?.total || 0;
    
    if (total <= 0) return "0.00%";
    
    const percentage = (userTotal / total) * 100;
    return `${percentage.toFixed(2)}%`;
  };
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {getGreeting()}, {dashboard.user.first_name}
        </h1>
        <p className="mt-1 text-gray-600">
          Here's an overview of your investment and loan status
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Contribution"
          value={formatCurrency(dashboard.contributions.total)}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="blue"
        />
        
        <StatCard
          title="Loan Limit"
          value={formatCurrency(dashboard.loans.limit)}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
          color="green"
        />
        
        <StatCard
          title="Available Limit"
          value={formatCurrency(dashboard.loans.available)}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="yellow"
        />
        
        <StatCard
          title="Your Shares"
          value={calculateSharePercentage()}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
          }
          color="purple"
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <ContributionChart contributions={dashboard.contributions.recent} />
        <LoanSummary 
          loans={[...dashboard.loans.active, ...dashboard.loans.pending]} 
          loanLimit={dashboard.loans.limit}
          availableLimit={dashboard.loans.available}
        />
      </div>
      
      <div className="mb-8">
        <ContributionSharesChart 
          userContribution={dashboard.contributions.total || 0} 
          totalContributions={dashboard.total_fund_value || 0} 
        />
      </div>
    </div>
  );
};

export default Dashboard;