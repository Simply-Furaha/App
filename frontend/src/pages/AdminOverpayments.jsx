// src/pages/AdminOverpayments.jsx
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import Alert from '../components/common/Alert';
import { formatCurrency, formatDate } from '../utils/formatters';
import adminService from '../features/admin/adminService';

const AdminOverpayments = () => {
  const [overpayments, setOverpayments] = useState([]);
  const [userLoans, setUserLoans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [selectedOverpayment, setSelectedOverpayment] = useState(null);
  const [allocationType, setAllocationType] = useState('future_contribution');
  const [selectedLoanId, setSelectedLoanId] = useState('');
  const [allocationNotes, setAllocationNotes] = useState('');
  const [operationInProgress, setOperationInProgress] = useState(false);
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });

  useEffect(() => {
    fetchOverpayments();
  }, []);

  const fetchOverpayments = async () => {
    try {
      setLoading(true);
      const response = await adminService.getOverpayments();
      setOverpayments(response.overpayments || []);
    } catch (error) {
      console.error('Error fetching overpayments:', error);
      showAlert('error', 'Failed to fetch overpayments');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserLoans = async (userId) => {
    try {
      const response = await adminService.getUserActiveLoans(userId);
      setUserLoans(response.loans || []);
    } catch (error) {
      console.error('Error fetching user loans:', error);
      setUserLoans([]);
    }
  };

  const showAlert = (type, message) => {
    setAlert({ show: true, type, message });
    setTimeout(() => setAlert({ show: false, type: '', message: '' }), 5000);
  };

  const handleAllocateClick = async (overpayment) => {
    setSelectedOverpayment(overpayment);
    setAllocationType('future_contribution');
    setSelectedLoanId('');
    setAllocationNotes('');
    
    // Fetch user's active loans for potential allocation
    await fetchUserLoans(overpayment.user_id);
    setShowAllocationModal(true);
  };

  const handleAllocateOverpayment = async () => {
    if (!selectedOverpayment) return;

    try {
      setOperationInProgress(true);

      const allocationData = {
        allocation_type: allocationType,
        notes: allocationNotes
      };

      if (allocationType === 'loan_payment') {
        if (!selectedLoanId) {
          showAlert('error', 'Please select a loan for payment allocation');
          return;
        }
        allocationData.loan_id = parseInt(selectedLoanId);
      }

      await adminService.allocateOverpayment(selectedOverpayment.id, allocationData);
      
      showAlert('success', 'Overpayment allocated successfully');
      setShowAllocationModal(false);
      setSelectedOverpayment(null);
      
      // Refresh overpayments list
      await fetchOverpayments();
      
    } catch (error) {
      console.error('Error allocating overpayment:', error);
      showAlert('error', error.response?.data?.error || 'Failed to allocate overpayment');
    } finally {
      setOperationInProgress(false);
    }
  };

  const handleCloseModal = () => {
    if (!operationInProgress) {
      setShowAllocationModal(false);
      setSelectedOverpayment(null);
      setUserLoans([]);
    }
  };

  const columns = [
    {
      header: 'Date',
      accessor: 'created_at',
      render: (overpayment) => formatDate(overpayment.created_at)
    },
    {
      header: 'User',
      accessor: 'user_name',
      render: (overpayment) => (
        <div className="font-medium text-gray-900">
          {overpayment.user_name}
        </div>
      )
    },
    {
      header: 'Payment Type',
      accessor: 'original_payment_type',
      render: (overpayment) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          overpayment.original_payment_type === 'contribution' 
            ? 'bg-blue-100 text-blue-800' 
            : 'bg-green-100 text-green-800'
        }`}>
          {overpayment.original_payment_type === 'contribution' ? 'Contribution' : 'Loan Payment'}
        </span>
      )
    },
    {
      header: 'Expected Amount',
      accessor: 'expected_amount',
      render: (overpayment) => formatCurrency(overpayment.expected_amount)
    },
    {
      header: 'Actual Amount',
      accessor: 'actual_amount',
      render: (overpayment) => formatCurrency(overpayment.actual_amount)
    },
    {
      header: 'Overpayment',
      accessor: 'overpayment_amount',
      render: (overpayment) => (
        <span className="font-semibold text-orange-600">
          {formatCurrency(overpayment.overpayment_amount)}
        </span>
      )
    },
    {
      header: 'Remaining',
      accessor: 'remaining_amount',
      render: (overpayment) => (
        <span className="font-semibold text-red-600">
          {formatCurrency(overpayment.remaining_amount)}
        </span>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (overpayment) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          overpayment.status === 'pending' 
            ? 'bg-yellow-100 text-yellow-800' 
            : overpayment.status === 'allocated'
            ? 'bg-green-100 text-green-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {overpayment.status.charAt(0).toUpperCase() + overpayment.status.slice(1)}
        </span>
      )
    },
    {
      header: 'Actions',
      render: (overpayment) => (
        <div className="flex space-x-2">
          {overpayment.status === 'pending' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleAllocateClick(overpayment)}
            >
              Allocate
            </Button>
          )}
        </div>
      )
    }
  ];

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
        <h1 className="text-3xl font-bold text-gray-900">Overpayment Management</h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage and allocate user overpayments to future contributions or loan payments
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <div className="p-6">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900">Pending Overpayments</h3>
              <p className="text-3xl font-bold text-orange-600 mt-2">
                {overpayments.filter(op => op.status === 'pending').length}
              </p>
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="p-6">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900">Total Pending Amount</h3>
              <p className="text-3xl font-bold text-red-600 mt-2">
                {formatCurrency(
                  overpayments
                    .filter(op => op.status === 'pending')
                    .reduce((sum, op) => sum + op.remaining_amount, 0)
                )}
              </p>
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="p-6">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900">Allocated This Month</h3>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {overpayments.filter(op => 
                  op.status === 'allocated' && 
                  new Date(op.allocated_at).getMonth() === new Date().getMonth()
                ).length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Overpayments Table */}
      <Card>
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Overpayments</h3>
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchOverpayments}
            >
              Refresh
            </Button>
          </div>

          <DataTable
            data={overpayments}
            columns={columns}
            loading={loading}
            emptyMessage="No overpayments found"
          />
        </div>
      </Card>

      {/* Allocation Modal */}
      <Modal
        isOpen={showAllocationModal}
        onClose={handleCloseModal}
        title="Allocate Overpayment"
        size="lg"
      >
        {selectedOverpayment && (
          <div className="space-y-6">
            {/* Overpayment Details */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Overpayment Details</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">User:</span> {selectedOverpayment.user_name}
                </div>
                <div>
                  <span className="text-gray-500">Amount:</span> {formatCurrency(selectedOverpayment.overpayment_amount)}
                </div>
                <div>
                  <span className="text-gray-500">Date:</span> {formatDate(selectedOverpayment.created_at)}
                </div>
                <div>
                  <span className="text-gray-500">Original Payment:</span> {selectedOverpayment.original_payment_type}
                </div>
              </div>
            </div>

            {/* Allocation Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Allocation Type
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="future_contribution"
                    checked={allocationType === 'future_contribution'}
                    onChange={(e) => setAllocationType(e.target.value)}
                    className="mr-2"
                  />
                  <span>Apply to Future Contributions</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="loan_payment"
                    checked={allocationType === 'loan_payment'}
                    onChange={(e) => setAllocationType(e.target.value)}
                    className="mr-2"
                  />
                  <span>Apply to Loan Payment</span>
                </label>
              </div>
            </div>

            {/* Loan Selection */}
            {allocationType === 'loan_payment' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Loan
                </label>
                <select
                  value={selectedLoanId}
                  onChange={(e) => setSelectedLoanId(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Select a loan...</option>
                  {userLoans.map((loan) => (
                    <option key={loan.id} value={loan.id}>
                      Loan #{loan.id} - {formatCurrency(loan.unpaid_balance)} remaining
                    </option>
                  ))}
                </select>
                {userLoans.length === 0 && (
                  <p className="text-sm text-gray-500 mt-1">No active loans found for this user</p>
                )}
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={allocationNotes}
                onChange={(e) => setAllocationNotes(e.target.value)}
                rows={3}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Add any notes about this allocation..."
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-4">
              <Button
                variant="secondary"
                onClick={handleCloseModal}
                disabled={operationInProgress}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleAllocateOverpayment}
                disabled={operationInProgress || (allocationType === 'loan_payment' && !selectedLoanId)}
                loading={operationInProgress}
              >
                {operationInProgress ? 'Allocating...' : 'Allocate Overpayment'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminOverpayments;