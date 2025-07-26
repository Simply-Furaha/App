// src/pages/Contributions.jsx - Enhanced with M-PESA payment
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getContributions, makeContribution, reset } from '../features/contributions/contributionsSlice';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import DataTable from '../components/common/DataTable';
import Alert from '../components/common/Alert';
import Modal from '../components/common/Modal';
import MPESAPayment from '../components/payments/MPESAPayment';
import { formatCurrency, formatDate } from '../utils/formatters';

const Contributions = () => {
  const [showAlert, setShowAlert] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMPESAModal, setShowMPESAModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('mpesa');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [contributionAmount, setContributionAmount] = useState('3000'); // Default monthly contribution
  const [customPhoneNumber, setCustomPhoneNumber] = useState(''); // Added missing state variable
  
  const dispatch = useDispatch();
  const { 
    contributions, 
    isLoading, 
    isSuccess, 
    isError, 
    message 
  } = useSelector((state) => state.contributions);

  // Get user from auth state to access phone number
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(getContributions());
    
    return () => {
      dispatch(reset());
    };
  }, [dispatch]);

  useEffect(() => {
    if (isError) {
      setShowAlert(true);
    }
    
    if (isSuccess && message) {
      setShowAlert(true);
      setShowAddModal(false);
      setShowMPESAModal(false);
      // Refresh contributions after successful payment
      dispatch(getContributions());
    }
  }, [isError, isSuccess, message, dispatch]);

  const handleMPESASuccess = (paymentData) => {
    console.log('M-PESA payment successful:', paymentData);
    setShowAlert(true);
    // Refresh contributions
    dispatch(getContributions());
  };

  const handleMPESAError = (error) => {
    console.error('M-PESA payment error:', error);
    setShowAlert(true);
  };

  const handleManualContribution = async () => {
    const contributionData = {
      amount: parseFloat(contributionAmount),
      month: selectedMonth,
      payment_method: 'manual'
    };
    
    dispatch(addContribution(contributionData));
  };

  const getCurrentMonthStatus = () => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentMonthContribution = contributions?.find(
      contribution => contribution.month?.slice(0, 7) === currentMonth
    );
    
    return {
      hasPaid: !!currentMonthContribution,
      contribution: currentMonthContribution
    };
  };

  const getMonthlyStats = () => {
    if (!contributions || contributions.length === 0) {
      return {
        totalContributions: 0,
        averageMonthly: 0,
        thisMonth: 0,
        lastSixMonths: 0
      };
    }

    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    const thisMonth = now.toISOString().slice(0, 7);

    const totalContributions = contributions.reduce((sum, c) => sum + c.amount, 0);
    const thisMonthContribution = contributions.find(c => c.month?.slice(0, 7) === thisMonth);
    const lastSixMonthsContributions = contributions.filter(c => {
      const contributionDate = new Date(c.month);
      return contributionDate >= sixMonthsAgo;
    });

    return {
      totalContributions,
      averageMonthly: contributions.length > 0 ? totalContributions / contributions.length : 0,
      thisMonth: thisMonthContribution?.amount || 0,
      lastSixMonths: lastSixMonthsContributions.reduce((sum, c) => sum + c.amount, 0)
    };
  };

  const columns = [
    {
      header: 'Month',
      accessor: 'month',
      render: (contribution) => {
        const date = new Date(contribution.month);
        return date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long' 
        });
      }
    },
    {
      header: 'Amount',
      accessor: 'amount',
      render: (contribution) => (
        <span className="font-semibold text-green-600">
          {formatCurrency(contribution.amount)}
        </span>
      )
    },
    {
      header: 'Payment Method',
      accessor: 'payment_method',
      render: (contribution) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          contribution.payment_method === 'mpesa' 
            ? 'bg-green-100 text-green-800' 
            : contribution.payment_method === 'manual'
            ? 'bg-blue-100 text-blue-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {contribution.payment_method === 'mpesa' ? 'M-PESA' :
           contribution.payment_method === 'manual' ? 'Manual' : 
           contribution.payment_method?.toUpperCase()}
        </span>
      )
    },
    {
      header: 'Transaction ID',
      accessor: 'transaction_id',
      render: (contribution) => (
        <span className="text-xs text-gray-500 font-mono">
          {contribution.transaction_id || 'N/A'}
        </span>
      )
    },
    {
      header: 'Date Added',
      accessor: 'created_at',
      render: (contribution) => formatDate(contribution.created_at)
    }
  ];

  const stats = getMonthlyStats();
  const currentMonthStatus = getCurrentMonthStatus();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
        <h1 className="text-3xl font-bold text-gray-900">My Contributions</h1>
        <p className="mt-2 text-sm text-gray-600">
          Track your monthly contributions and make payments
        </p>
      </div>

      {/* Current Month Status */}
      <Card className="mb-6">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} Status
          </h3>
          
          {currentMonthStatus.hasPaid ? (
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-green-600">
                <span className="text-2xl mr-2">✅</span>
                <span className="font-medium">Contribution Paid</span>
              </div>
              <div className="text-sm text-gray-600">
                Amount: {formatCurrency(currentMonthStatus.contribution.amount)}
              </div>
              <div className="text-sm text-gray-600">
                Method: {currentMonthStatus.contribution.payment_method?.toUpperCase()}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center text-orange-600">
                  <span className="text-2xl mr-2">⏳</span>
                  <span className="font-medium">Payment Pending</span>
                </div>
                <div className="text-sm text-gray-600">
                  Monthly contribution: {formatCurrency(3000)}
                </div>
              </div>
              
              {/* Payment Options */}
              <div className="flex space-x-4">
                <div className="w-64">
                  <MPESAPayment
                    type="contribution"
                    amount="3000"
                    onSuccess={handleMPESASuccess}
                    onError={handleMPESAError}
                  />
                </div>
                <Button
                  variant="secondary"
                  onClick={() => setShowAddModal(true)}
                >
                  Record Manual Payment
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <div className="p-6 text-center">
            <h3 className="text-sm font-medium text-gray-500">Total Contributions</h3>
            <p className="text-2xl font-bold text-blue-600 mt-2">
              {formatCurrency(stats.totalContributions)}
            </p>
          </div>
        </Card>
        
        <Card>
          <div className="p-6 text-center">
            <h3 className="text-sm font-medium text-gray-500">Average Monthly</h3>
            <p className="text-2xl font-bold text-green-600 mt-2">
              {formatCurrency(stats.averageMonthly)}
            </p>
          </div>
        </Card>
        
        <Card>
          <div className="p-6 text-center">
            <h3 className="text-sm font-medium text-gray-500">This Month</h3>
            <p className="text-2xl font-bold text-purple-600 mt-2">
              {formatCurrency(stats.thisMonth)}
            </p>
          </div>
        </Card>
        
        <Card>
          <div className="p-6 text-center">
            <h3 className="text-sm font-medium text-gray-500">Last 6 Months</h3>
            <p className="text-2xl font-bold text-orange-600 mt-2">
              {formatCurrency(stats.lastSixMonths)}
            </p>
          </div>
        </Card>
      </div>

      {/* Contributions History */}
      <Card>
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Contribution History</h3>
            <div className="flex space-x-4">
              <Button
                variant="primary"
                onClick={() => setShowMPESAModal(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                📱 Pay with M-PESA
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowAddModal(true)}
              >
                Record Manual Payment
              </Button>
            </div>
          </div>

          <DataTable
            data={contributions || []}
            columns={columns}
            loading={isLoading}
            emptyMessage="No contributions found. Make your first contribution today!"
          />
        </div>
      </Card>

      {/* M-PESA Payment Modal */}
      <Modal
        isOpen={showMPESAModal}
        onClose={() => setShowMPESAModal(false)}
        title="Make Contribution via M-PESA"
        size="md"
      >
        <div className="space-y-6">
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-medium text-green-900 mb-2">M-PESA Payment</h4>
            <p className="text-sm text-green-700">
              Pay your monthly contribution securely using M-PESA. 
              You'll receive a prompt on your phone to complete the payment.
            </p>
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
              Month
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount (KES)
            </label>
            <input
              type="number"
              min="1"
              step="0.01"
              value={contributionAmount}
              onChange={(e) => setContributionAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Enter contribution amount"
            />
          </div>

          <div className="pt-4">
            <MPESAPayment
              type="contribution"
              amount={contributionAmount}
              phoneNumber={customPhoneNumber || user?.phone_number}
              month={selectedMonth}
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
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Record Manual Contribution"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Manual Payment</h4>
            <p className="text-sm text-blue-700">
              Record a contribution that was made through cash, bank transfer, or other means.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Month
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount (KES)
            </label>
            <input
              type="number"
              min="1"
              step="0.01"
              value={contributionAmount}
              onChange={(e) => setContributionAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter contribution amount"
            />
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <Button
              variant="secondary"
              onClick={() => setShowAddModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleManualContribution}
              disabled={!contributionAmount || !selectedMonth}
            >
              Record Contribution
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Contributions;