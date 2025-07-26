// src/pages/AdminDashboard.jsx - Enhanced with new features
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { getDashboard } from '../features/admin/adminSlice';
import StatCard from '../components/dashboard/StatCard';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import Alert from '../components/common/Alert';
import { formatCurrency, formatDate } from '../utils/formatters';
import adminService from '../features/admin/adminService';

const AdminDashboard = () => {
  const dispatch = useDispatch();
  const { dashboard, isLoading } = useSelector((state) => state.admin);
  const { users } = useSelector((state) => state.admin);
  
  // New state for additional features
  const [showLoanModifyModal, setShowLoanModifyModal] = useState(false);
  const [showAdminContributionModal, setShowAdminContributionModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [loanModifyForm, setLoanModifyForm] = useState({
    new_amount: '',
    new_unpaid_balance: '',
    new_interest_rate: ''
  });
  const [adminContributionForm, setAdminContributionForm] = useState({
    admin_id: '',
    amount: '',
    month: new Date().toISOString().slice(0, 7) // YYYY-MM format
  });
  const [operationInProgress, setOperationInProgress] = useState(false);
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });
  
  useEffect(() => {
    dispatch(getDashboard());
  }, [dispatch]);

  const showAlert = (type, message) => {
    setAlert({ show: true, type, message });
    setTimeout(() => setAlert({ show: false, type: '', message: '' }), 5000);
  };

  const handleModifyLoanClick = (loan) => {
    setSelectedLoan(loan);
    setLoanModifyForm({
      new_amount: loan.amount.toString(),
      new_unpaid_balance: loan.unpaid_balance?.toString() || '0',
      new_interest_rate: loan.interest_rate?.toString() || '5'
    });
    setShowLoanModifyModal(true);
  };

  const handleModifyLoan = async () => {
    if (!selectedLoan) return;

    try {
      setOperationInProgress(true);
      
      const modifyData = {};
      
      if (loanModifyForm.new_amount !== selectedLoan.amount.toString()) {
        modifyData.new_amount = parseFloat(loanModifyForm.new_amount);
      }
      
      if (loanModifyForm.new_unpaid_balance !== (selectedLoan.unpaid_balance?.toString() || '0')) {
        modifyData.new_unpaid_balance = parseFloat(loanModifyForm.new_unpaid_balance);
      }
      
      if (loanModifyForm.new_interest_rate !== (selectedLoan.interest_rate?.toString() || '5')) {
        modifyData.new_interest_rate = parseFloat(loanModifyForm.new_interest_rate);
      }

      if (Object.keys(modifyData).length === 0) {
        showAlert('info', 'No changes detected');
        return;
      }

      await adminService.modifyLoanDebt(selectedLoan.id, modifyData);
      
      showAlert('success', 'Loan debt modified successfully');
      setShowLoanModifyModal(false);
      setSelectedLoan(null);
      
      // Refresh dashboard data
      dispatch(getDashboard());
      
    } catch (error) {
      console.error('Error modifying loan:', error);
      showAlert('error', error.response?.data?.error || 'Failed to modify loan');
    } finally {
      setOperationInProgress(false);
    }
  };

  const handleAddAdminContribution = async () => {
    try {
      setOperationInProgress(true);
      
      if (!adminContributionForm.admin_id || !adminContributionForm.amount || !adminContributionForm.month) {
        showAlert('error', 'All fields are required');
        return;
      }

      await adminService.addAdminContribution(adminContributionForm);
      
      showAlert('success', 'Admin contribution added successfully');
      setShowAdminContributionModal(false);
      setAdminContributionForm({
        admin_id: '',
        amount: '',
        month: new Date().toISOString().slice(0, 7)
      });
      
      // Refresh dashboard data
      dispatch(getDashboard());
      
    } catch (error) {
      console.error('Error adding admin contribution:', error);
      showAlert('error', error.response?.data?.error || 'Failed to add contribution');
    } finally {
      setOperationInProgress(false);
    }
  };

  const handleCloseLoanModal = () => {
    if (!operationInProgress) {
      setShowLoanModifyModal(false);
      setSelectedLoan(null);
    }
  };

  const handleCloseContributionModal = () => {
    if (!operationInProgress) {
      setShowAdminContributionModal(false);
    }
  };

  const loanColumns = [
    {
      header: 'Loan ID',
      accessor: 'id',
      render: (loan) => `#${loan.id}`
    },
    {
      header: 'Member',
      render: (loan) => loan.user ? `${loan.user.first_name} ${loan.user.last_name}` : 'Unknown'
    },
    {
      header: 'Amount',
      accessor: 'amount',
      render: (loan) => formatCurrency(loan.amount)
    },
    {
      header: 'Unpaid Balance',
      render: (loan) => (
        <span className="font-semibold text-red-600">
          {formatCurrency(loan.unpaid_balance || 0)}
        </span>
      )
    },
    {
      header: 'Interest',
      render: (loan) => `${loan.interest_rate || 5}%`
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (loan) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          loan.status === 'approved' ? 'bg-green-100 text-green-800' :
          loan.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
          loan.status === 'paid' ? 'bg-blue-100 text-blue-800' :
          'bg-red-100 text-red-800'
        }`}>
          {loan.status?.charAt(0).toUpperCase() + loan.status?.slice(1)}
        </span>
      )
    },
    {
      header: 'Date Requested',
      accessor: 'created_at',
      render: (loan) => formatDate(loan.created_at)
    },
    {
      header: 'Actions',
      render: (loan) => (
        <div className="flex space-x-2">
          {(loan.status === 'approved' || loan.status === 'paid') && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleModifyLoanClick(loan)}
            >
              Modify Debt
            </Button>
          )}
        </div>
      )
    }
  ];

  const recentActivityColumns = [
    {
      header: 'Time',
      accessor: 'created_at',
      render: (activity) => (
        <div className="text-sm">
          <div>{formatDate(activity.created_at, 'MMM dd')}</div>
          <div className="text-gray-500">{formatDate(activity.created_at, 'HH:mm')}</div>
        </div>
      )
    },
    {
      header: 'Admin',
      accessor: 'admin_name',
      render: (activity) => (
        <div className="text-sm font-medium">{activity.admin_name}</div>
      )
    },
    {
      header: 'Action',
      accessor: 'action',
      render: (activity) => (
        <span className="text-sm text-gray-900">
          {activity.action.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ')}
        </span>
      )
    },
    {
      header: 'Target',
      render: (activity) => (
        <div className="text-sm">
          <div className="font-medium">{activity.target_type}</div>
          {activity.target_name && (
            <div className="text-gray-500 truncate max-w-xs">{activity.target_name}</div>
          )}
        </div>
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

  const stats = dashboard.stats || {};
  const recentActivities = dashboard.recent_activities || [];
  const pendingLoans = dashboard.pending_loans || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Alert */}
      {alert.show && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert({ show: false, type: '', message: '' })}
          className="mb-6"
        />
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">
          Overview of system statistics and recent activities
        </p>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <Link to="/admin/users">
            <Button variant="primary">Manage Users</Button>
          </Link>
          <Link to="/admin/loans">
            <Button variant="primary">Manage Loans</Button>
          </Link>
          <Link to="/admin/activity-logs">
            <Button variant="secondary">Activity Logs</Button>
          </Link>
          <Link to="/admin/overpayments">
            <Button variant="secondary">Overpayments</Button>
          </Link>
          <Button 
            variant="outline" 
            onClick={() => setShowAdminContributionModal(true)}
          >
            Add Admin Contribution
          </Button>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Users"
          value={stats.total_users || 0}
          icon="👥"
          trend={null}
        />
        <StatCard
          title="Total Contributions"
          value={formatCurrency(stats.total_contributions || 0)}
          icon="💰"
          trend={null}
        />
        <StatCard
          title="Active Loans"
          value={stats.approved_loans || 0}
          icon="📋"
          trend={null}
        />
        <StatCard
          title="Pending Overpayments"
          value={stats.pending_overpayments || 0}
          subtitle={formatCurrency(stats.total_overpayment_amount || 0)}
          icon="⚠️"
          trend={null}
        />
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="This Month Contributions"
          value={formatCurrency(stats.this_month_contributions || 0)}
          icon="📈"
          trend={null}
        />
        <StatCard
          title="Total Investments"
          value={formatCurrency(stats.total_investments || 0)}
          icon="📊"
          trend={null}
        />
        <StatCard
          title="Pending Loans"
          value={stats.pending_loans || 0}
          icon="⏳"
          trend={null}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <Card>
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Recent Admin Activities</h3>
              <Link to="/admin/activity-logs">
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </Link>
            </div>
            
            {recentActivities.length > 0 ? (
              <DataTable
                data={recentActivities.slice(0, 5)}
                columns={recentActivityColumns}
                showPagination={false}
              />
            ) : (
              <p className="text-gray-500 text-center py-8">No recent activities</p>
            )}
          </div>
        </Card>

        {/* Pending Loans */}
        <Card>
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Recent Loans</h3>
              <Link to="/admin/loans">
                <Button variant="outline" size="sm">
                  Manage All
                </Button>
              </Link>
            </div>
            
            {pendingLoans && pendingLoans.length > 0 ? (
              <DataTable
                data={pendingLoans.slice(0, 5)}
                columns={loanColumns}
                showPagination={false}
              />
            ) : (
              <p className="text-gray-500 text-center py-8">No recent loans</p>
            )}
          </div>
        </Card>
      </div>

      {/* Loan Modification Modal */}
      <Modal
        isOpen={showLoanModifyModal}
        onClose={handleCloseLoanModal}
        title="Modify Loan Debt"
        size="lg"
      >
        {selectedLoan && (
          <div className="space-y-6">
            {/* Current Loan Details */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Current Loan Details</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Loan ID:</span> #{selectedLoan.id}
                </div>
                <div>
                  <span className="text-gray-500">User:</span> {selectedLoan.user?.first_name} {selectedLoan.user?.last_name}
                </div>
                <div>
                  <span className="text-gray-500">Current Amount:</span> {formatCurrency(selectedLoan.amount)}
                </div>
                <div>
                  <span className="text-gray-500">Unpaid Balance:</span> {formatCurrency(selectedLoan.unpaid_balance || 0)}
                </div>
              </div>
            </div>

            {/* Modification Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Loan Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={loanModifyForm.new_amount}
                  onChange={(e) => setLoanModifyForm(prev => ({ ...prev, new_amount: e.target.value }))}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Unpaid Balance
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={loanModifyForm.new_unpaid_balance}
                  onChange={(e) => setLoanModifyForm(prev => ({ ...prev, new_unpaid_balance: e.target.value }))}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Interest Rate (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={loanModifyForm.new_interest_rate}
                  onChange={(e) => setLoanModifyForm(prev => ({ ...prev, new_interest_rate: e.target.value }))}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-4">
              <Button
                variant="secondary"
                onClick={handleCloseLoanModal}
                disabled={operationInProgress}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleModifyLoan}
                disabled={operationInProgress}
                loading={operationInProgress}
              >
                {operationInProgress ? 'Modifying...' : 'Modify Loan'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Admin Contribution Modal */}
      <Modal
        isOpen={showAdminContributionModal}
        onClose={handleCloseContributionModal}
        title="Add Admin Contribution"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Admin
            </label>
            <select
              value={adminContributionForm.admin_id}
              onChange={(e) => setAdminContributionForm(prev => ({ ...prev, admin_id: e.target.value }))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Select an admin...</option>
              {users?.filter(user => user.is_admin).map((admin) => (
                <option key={admin.id} value={admin.id}>
                  {admin.first_name} {admin.last_name} ({admin.username})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount
            </label>
            <input
              type="number"
              step="0.01"
              value={adminContributionForm.amount}
              onChange={(e) => setAdminContributionForm(prev => ({ ...prev, amount: e.target.value }))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Enter contribution amount"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Month
            </label>
            <input
              type="month"
              value={adminContributionForm.month}
              onChange={(e) => setAdminContributionForm(prev => ({ ...prev, month: e.target.value }))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <Button
              variant="secondary"
              onClick={handleCloseContributionModal}
              disabled={operationInProgress}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAddAdminContribution}
              disabled={operationInProgress}
              loading={operationInProgress}
            >
              {operationInProgress ? 'Adding...' : 'Add Contribution'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminDashboard;