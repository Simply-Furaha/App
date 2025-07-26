// src/pages/AdminActivityLogs.jsx
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import DataTable from '../components/common/DataTable';
import { formatDate } from '../utils/formatters';
import adminService from '../features/admin/adminService';

const AdminActivityLogs = () => {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    page: 1,
    per_page: 20,
    admin_id: '',
    action: '',
    target_type: '',
    start_date: '',
    end_date: ''
  });

  const { users } = useSelector((state) => state.admin);

  useEffect(() => {
    fetchActivityLogs();
  }, [filters]);

  const fetchActivityLogs = async () => {
    try {
      setLoading(true);
      const response = await adminService.getActivityLogs(filters);
      setLogs(response.logs || []);
      setPagination(response.pagination || {});
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
      page: 1 // Reset to first page when filtering
    }));
  };

  const handlePageChange = (page) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const clearFilters = () => {
    setFilters({
      page: 1,
      per_page: 20,
      admin_id: '',
      action: '',
      target_type: '',
      start_date: '',
      end_date: ''
    });
  };

  const getActionBadgeColor = (action) => {
    const actionColors = {
      'user_created': 'bg-green-100 text-green-800',
      'user_deleted': 'bg-red-100 text-red-800',
      'user_suspended': 'bg-yellow-100 text-yellow-800',
      'user_unsuspended': 'bg-blue-100 text-blue-800',
      'loan_approved': 'bg-green-100 text-green-800',
      'loan_rejected': 'bg-red-100 text-red-800',
      'loan_payment_added': 'bg-blue-100 text-blue-800',
      'loan_debt_modified': 'bg-purple-100 text-purple-800',
      'contribution_added': 'bg-green-100 text-green-800',
      'investment_created': 'bg-indigo-100 text-indigo-800',
      'overpayment_allocated': 'bg-orange-100 text-orange-800',
      'admin_contribution_added': 'bg-purple-100 text-purple-800'
    };
    return actionColors[action] || 'bg-gray-100 text-gray-800';
  };

  const formatActionText = (action) => {
    return action.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const columns = [
    {
      header: 'Date & Time',
      accessor: 'created_at',
      render: (log) => (
        <div className="text-sm">
          <div className="font-medium">{formatDate(log.created_at, 'MMM dd, yyyy')}</div>
          <div className="text-gray-500">{formatDate(log.created_at, 'HH:mm:ss')}</div>
        </div>
      )
    },
    {
      header: 'Admin',
      accessor: 'admin_name',
      render: (log) => (
        <div className="text-sm font-medium text-gray-900">
          {log.admin_name}
        </div>
      )
    },
    {
      header: 'Action',
      accessor: 'action',
      render: (log) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionBadgeColor(log.action)}`}>
          {formatActionText(log.action)}
        </span>
      )
    },
    {
      header: 'Target',
      render: (log) => (
        <div className="text-sm">
          <div className="font-medium">{log.target_type}</div>
          {log.target_name && (
            <div className="text-gray-500 truncate max-w-xs">{log.target_name}</div>
          )}
        </div>
      )
    },
    {
      header: 'Description',
      accessor: 'description',
      render: (log) => (
        <div className="text-sm text-gray-900 max-w-md">
          <p className="truncate">{log.description}</p>
        </div>
      )
    },
    {
      header: 'IP Address',
      accessor: 'ip_address',
      render: (log) => (
        <span className="text-xs text-gray-500 font-mono">
          {log.ip_address || 'N/A'}
        </span>
      )
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Activity Logs</h1>
        <p className="mt-2 text-sm text-gray-600">
          Track all administrative activities and changes in the system
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Admin Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Admin
              </label>
              <select
                value={filters.admin_id}
                onChange={(e) => handleFilterChange('admin_id', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">All Admins</option>
                {users?.filter(user => user.is_admin).map((admin) => (
                  <option key={admin.id} value={admin.id}>
                    {admin.first_name} {admin.last_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Action Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Action
              </label>
              <select
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">All Actions</option>
                <option value="user_created">User Created</option>
                <option value="user_deleted">User Deleted</option>
                <option value="user_suspended">User Suspended</option>
                <option value="user_unsuspended">User Unsuspended</option>
                <option value="loan_approved">Loan Approved</option>
                <option value="loan_rejected">Loan Rejected</option>
                <option value="loan_payment_added">Loan Payment Added</option>
                <option value="loan_debt_modified">Loan Debt Modified</option>
                <option value="contribution_added">Contribution Added</option>
                <option value="investment_created">Investment Created</option>
                <option value="overpayment_allocated">Overpayment Allocated</option>
                <option value="admin_contribution_added">Admin Contribution Added</option>
              </select>
            </div>

            {/* Target Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Type
              </label>
              <select
                value={filters.target_type}
                onChange={(e) => handleFilterChange('target_type', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="user">User</option>
                <option value="loan">Loan</option>
                <option value="contribution">Contribution</option>
                <option value="investment">Investment</option>
                <option value="overpayment">Overpayment</option>
              </select>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={filters.start_date}
                onChange={(e) => handleFilterChange('start_date', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="lg:col-start-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={filters.end_date}
                onChange={(e) => handleFilterChange('end_date', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="mt-4 flex space-x-4">
            <Button 
              variant="secondary" 
              onClick={clearFilters}
              size="sm"
            >
              Clear Filters
            </Button>
            <Button 
              variant="primary" 
              onClick={fetchActivityLogs}
              size="sm"
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Activity Logs Table */}
      <Card>
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Activity History
            </h3>
            <div className="text-sm text-gray-500">
              {pagination.total ? `${pagination.total} total entries` : ''}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              <DataTable
                data={logs}
                columns={columns}
                loading={loading}
                emptyMessage="No activity logs found"
              />

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="mt-6 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing page {pagination.page} of {pagination.pages}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={!pagination.has_prev}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={!pagination.has_next}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Card>
    </div>
  );
};

export default AdminActivityLogs;