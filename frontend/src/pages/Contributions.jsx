import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getContributions } from '../features/contributions/contributionsSlice';
import ContributionForm from '../components/contributions/ContributionForm';
import ContributionChart from '../components/dashboard/ContributionChart';
import Card from '../components/common/Card';
import DataTable from '../components/common/DataTable';
import { formatCurrency, formatDate } from '../utils/formatters';

const Contributions = () => {
  const dispatch = useDispatch();
  const { contributions, isLoading } = useSelector((state) => state.contributions);
  
  useEffect(() => {
    dispatch(getContributions());
  }, [dispatch]);
  
  const columns = [
    {
      header: 'Month',
      accessor: 'month',
      render: (contribution) => formatDate(contribution.month)
    },
    {
      header: 'Amount',
      accessor: 'amount',
      render: (contribution) => formatCurrency(contribution.amount)
    },
    {
      header: 'Payment Method',
      accessor: 'payment_method',
      render: (contribution) => contribution.payment_method.toUpperCase()
    },
    {
      header: 'Transaction ID',
      accessor: 'transaction_id',
      render: (contribution) => contribution.transaction_id || '-'
    },
    {
      header: 'Date',
      accessor: 'created_at',
      render: (contribution) => formatDate(contribution.created_at)
    }
  ];
  
  // Calculate total contribution
  const totalContribution = contributions?.reduce((total, contribution) => total + contribution.amount, 0) || 0;
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Contributions</h1>
        <p className="mt-1 text-gray-600">
          Manage your monthly contributions
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <ContributionChart 
            contributions={contributions}
            title="Contribution History"
          />
        </div>
        
        <div>
          <ContributionForm />
        </div>
      </div>
      
      <div className="mt-8">
        <Card>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Contribution Records</h2>
            <div className="bg-blue-50 px-4 py-2 rounded-lg">
              <span className="text-gray-600 text-sm">Total Contribution:</span>
              <span className="ml-2 text-lg font-bold text-blue-600">{formatCurrency(totalContribution)}</span>
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={contributions}
              emptyMessage="No contribution records found"
              pagination={true}
              itemsPerPage={10}
            />
          )}
        </Card>
      </div>
    </div>
  );
};

export default Contributions;