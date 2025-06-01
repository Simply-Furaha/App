import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getUsers, createUser, deleteUser, suspendUser, addContribution, reset } from '../features/admin/adminSlice';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import DataTable from '../components/common/DataTable';
import Alert from '../components/common/Alert';
import Modal from '../components/common/Modal';
import { formatDate, formatCurrency } from '../utils/formatters';

const AdminUsers = () => {
  const [showAlert, setShowAlert] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showContributionModal, setShowContributionModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [contributionMode, setContributionMode] = useState('single'); // 'single' or 'multiple'
  const [operationInProgress, setOperationInProgress] = useState(false);
  
  // Contribution form state
  const [contributionForm, setContributionForm] = useState({
    amount: '',
    month: new Date().toISOString().slice(0, 7), // YYYY-MM format
    transaction_id: '',
    payment_method: 'manual'
  });
  
  const dispatch = useDispatch();
  const { users, isLoading, isSuccess, isError, message } = useSelector((state) => state.admin);
  
  useEffect(() => {
    dispatch(getUsers());
    
    return () => {
      dispatch(reset());
    };
  }, [dispatch]);
  
  useEffect(() => {
    if (isError) {
      setShowAlert(true);
      setOperationInProgress(false);
    }
    
    if (isSuccess && operationInProgress) {
      if (showCreateModal) {
        setShowCreateModal(false);
      }
      if (showDeleteModal) {
        setShowDeleteModal(false);
        setSelectedUser(null);
      }
      if (showSuspendModal) {
        setShowSuspendModal(false);
        setSelectedUser(null);
      }
      if (showContributionModal) {
        setShowContributionModal(false);
        setSelectedUser(null);
        setSelectedUsers([]);
        setContributionForm({
          amount: '',
          month: new Date().toISOString().slice(0, 7),
          transaction_id: '',
          payment_method: 'manual'
        });
      }
      setOperationInProgress(false);
      
      // Refresh users after successful operation to update contribution totals
      dispatch(getUsers());
    }
  }, [isError, isSuccess, operationInProgress, showCreateModal, showDeleteModal, showSuspendModal, showContributionModal, dispatch]);
  
  const handleCreateUser = (values) => {
    setOperationInProgress(true);
    console.log("Creating user:", values);
    dispatch(createUser({
      username: values.username,
      email: values.email,
      password: values.password,
      first_name: values.first_name,
      last_name: values.last_name,
      phone_number: values.phone_number,
      is_admin: values.is_admin === 'true'
    }));
  };
  
  const handleDeleteUser = (user) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };
  
  const confirmDeleteUser = () => {
    if (selectedUser) {
      setOperationInProgress(true);
      dispatch(deleteUser(selectedUser.id));
    }
  };
  
  const handleSuspendUser = (user) => {
    setSelectedUser(user);
    setShowSuspendModal(true);
  };
  
  const confirmSuspendUser = () => {
    if (selectedUser) {
      setOperationInProgress(true);
      dispatch(suspendUser({
        userId: selectedUser.id,
        suspend: !selectedUser.is_suspended // Toggle suspension status
      }));
    }
  };
  
  // Contribution handlers
  const handleAddContributionSingle = (user) => {
    setSelectedUser(user);
    setContributionMode('single');
    setContributionForm({
      amount: '',
      month: new Date().toISOString().slice(0, 7),
      transaction_id: '',
      payment_method: 'manual'
    });
    setShowContributionModal(true);
  };
  
  const handleAddContributionMultiple = () => {
    setContributionMode('multiple');
    setSelectedUsers([]);
    setContributionForm({
      amount: '',
      month: new Date().toISOString().slice(0, 7),
      transaction_id: '',
      payment_method: 'manual'
    });
    setShowContributionModal(true);
  };
  
  const handleUserSelectionChange = (userId, isSelected) => {
    if (isSelected) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };
  
  const handleSelectAllUsers = (selectAll) => {
    if (selectAll) {
      const regularUsers = users.filter(user => !user.is_admin);
      setSelectedUsers(regularUsers.map(user => user.id));
    } else {
      setSelectedUsers([]);
    }
  };
  
  const handleContributionSubmit = async () => {
    if (!contributionForm.amount || parseFloat(contributionForm.amount) <= 0) {
      return;
    }
    
    setOperationInProgress(true);
    
    try {
      if (contributionMode === 'single' && selectedUser) {
        // Add contribution for single user
        await dispatch(addContribution({
          user_id: selectedUser.id,
          amount: parseFloat(contributionForm.amount),
          month: contributionForm.month + '-01', // Convert YYYY-MM to YYYY-MM-DD
          transaction_id: contributionForm.transaction_id || `MANUAL-${Date.now()}`,
          payment_method: contributionForm.payment_method
        })).unwrap();
      } else if (contributionMode === 'multiple' && selectedUsers.length > 0) {
        // Add contributions for multiple users sequentially
        for (const userId of selectedUsers) {
          await dispatch(addContribution({
            user_id: userId,
            amount: parseFloat(contributionForm.amount),
            month: contributionForm.month + '-01',
            transaction_id: contributionForm.transaction_id ? 
              `${contributionForm.transaction_id}-${userId}` : 
              `MANUAL-${Date.now()}-${userId}`,
            payment_method: contributionForm.payment_method
          })).unwrap();
        }
      }
    } catch (error) {
      // Error handling is done by Redux, just stop the operation
      setOperationInProgress(false);
    }
  };
  
  const handleCloseCreateModal = () => {
    if (!operationInProgress) {
      setShowCreateModal(false);
    }
  };

  const handleCloseDeleteModal = () => {
    if (!operationInProgress) {
      setShowDeleteModal(false);
      setSelectedUser(null);
    }
  };

  const handleCloseSuspendModal = () => {
    if (!operationInProgress) {
      setShowSuspendModal(false);
      setSelectedUser(null);
    }
  };
  
  const handleCloseContributionModal = () => {
    if (!operationInProgress) {
      setShowContributionModal(false);
      setSelectedUser(null);
      setSelectedUsers([]);
      setContributionForm({
        amount: '',
        month: new Date().toISOString().slice(0, 7),
        transaction_id: '',
        payment_method: 'manual'
      });
    }
  };
  
  const columns = [
    {
      header: 'ID',
      accessor: 'id',
      width: '60px'
    },
    {
      header: 'Name',
      render: (user) => `${user.first_name} ${user.last_name}`
    },
    {
      header: 'Username',
      accessor: 'username'
    },
    {
      header: 'Email',
      accessor: 'email'
    },
    {
      header: 'Phone',
      accessor: 'phone_number'
    },
    {
      header: 'Role',
      render: (user) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          user.is_admin 
            ? 'bg-purple-100 text-purple-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {user.is_admin ? 'Admin' : 'Member'}
        </span>
      )
    },
    {
      header: 'Status',
      render: (user) => {
        if (user.is_suspended) {
          return (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
              Suspended
            </span>
          );
        }
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            user.is_verified 
              ? 'bg-green-100 text-green-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {user.is_verified ? 'Active' : 'Unverified'}
          </span>
        );
      }
    },
    {
      header: 'Total Contributions',
      render: (user) => formatCurrency(user.total_contribution || 0)
    },
    {
      header: 'Loan Limit',
      render: (user) => formatCurrency(user.loan_limit || 0)
    },
    {
      header: 'Joined',
      accessor: 'created_at',
      render: (user) => formatDate(user.created_at)
    },
    {
      header: 'Actions',
      render: (user) => (
        <div className="flex space-x-2">
          {!user.is_admin && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleAddContributionSingle(user)}
              className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1"
            >
              Add Contribution
            </Button>
          )}
          <Button
            variant={user.is_suspended ? "success" : "secondary"}
            size="sm"
            onClick={() => handleSuspendUser(user)}
            className={`text-xs px-2 py-1 ${user.is_suspended 
              ? "text-green-600 hover:text-green-800" 
              : "text-yellow-600 hover:text-yellow-800"
            }`}
          >
            {user.is_suspended ? 'Unsuspend' : 'Suspend'}
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => handleDeleteUser(user)}
            className="text-red-600 hover:text-red-800 text-xs px-2 py-1"
          >
            Delete
          </Button>
        </div>
      )
    }
  ];
  
  // Calculate statistics
  const totalUsers = users ? users.length : 0;
  const regularMembers = users ? users.filter(user => !user.is_admin).length : 0;
  const administrators = users ? users.filter(user => user.is_admin).length : 0;
  const activeUsers = users ? users.filter(user => user.is_verified && !user.is_suspended).length : 0;
  const suspendedUsers = users ? users.filter(user => user.is_suspended).length : 0;
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="mt-1 text-gray-600">
            View and manage all users in the system
          </p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="secondary"
            onClick={handleAddContributionMultiple}
            disabled={operationInProgress}
          >
            Bulk Add Contributions
          </Button>
          <Button
            variant="primary"
            onClick={() => setShowCreateModal(true)}
            disabled={operationInProgress}
          >
            Add New User
          </Button>
        </div>
      </div>
      
      {showAlert && isError && (
        <Alert
          type="error"
          message={message}
          onClose={() => setShowAlert(false)}
          autoClose={true}
        />
      )}
      
      {showAlert && isSuccess && message && (
        <Alert
          type="success"
          message={message}
          onClose={() => setShowAlert(false)}
          autoClose={true}
        />
      )}
      
      <div className="bg-white shadow rounded-lg overflow-hidden mb-8">
        <div className="px-6 py-5 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">User Statistics</h2>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-gray-700">Total Users</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{totalUsers}</p>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-blue-700">Regular Members</p>
              <p className="mt-1 text-2xl font-semibold text-blue-600">{regularMembers}</p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-purple-700">Administrators</p>
              <p className="mt-1 text-2xl font-semibold text-purple-600">{administrators}</p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-green-700">Active Users</p>
              <p className="mt-1 text-2xl font-semibold text-green-600">{activeUsers}</p>
            </div>
            
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-red-700">Suspended Users</p>
              <p className="mt-1 text-2xl font-semibold text-red-600">{suspendedUsers}</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">User List</h2>
            <div className="text-gray-600">
              Total: {totalUsers} users
            </div>
          </div>
        </div>
        
        {isLoading && !operationInProgress ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={users || []}
            emptyMessage="No users found"
            pagination={true}
          />
        )}
      </div>
      
      {/* Create User Modal */}
      <Modal
        isOpen={showCreateModal}
        title="Add New User"
        onClose={handleCloseCreateModal}
      >
        <div className="p-6">
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const values = Object.fromEntries(formData.entries());
            handleCreateUser(values);
          }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  name="first_name"
                  required
                  className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border-gray-300"
                  placeholder="Enter first name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  name="last_name"
                  required
                  className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border-gray-300"
                  placeholder="Enter last name"
                />
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                name="username"
                required
                className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border-gray-300"
                placeholder="Enter username"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                required
                className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border-gray-300"
                placeholder="Enter email address"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone_number"
                required
                className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border-gray-300"
                placeholder="Enter phone number (e.g., +254712345678)"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                name="password"
                required
                className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border-gray-300"
                placeholder="Enter password"
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <select
                name="is_admin"
                className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border-gray-300"
              >
                <option value="false">Member</option>
                <option value="true">Admin</option>
              </select>
            </div>
            
            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="secondary"
                onClick={handleCloseCreateModal}
                disabled={operationInProgress || isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={operationInProgress || isLoading}
              >
                {(operationInProgress || isLoading) ? 'Creating...' : 'Create User'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
      
      {/* Add Contribution Modal */}
      <Modal
        isOpen={showContributionModal}
        title={contributionMode === 'single' ? 'Add Contribution' : 'Bulk Add Contributions'}
        onClose={handleCloseContributionModal}
      >
        <div className="p-6">
          {contributionMode === 'single' && selectedUser && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                Adding contribution for: <span className="font-semibold">{selectedUser.first_name} {selectedUser.last_name}</span>
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Current total: {formatCurrency(selectedUser.total_contribution || 0)}
              </p>
            </div>
          )}
          
          {contributionMode === 'multiple' && (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-medium text-gray-700">Select Members</h3>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => handleSelectAllUsers(true)}
                    className="text-xs text-blue-600 hover:text-blue-800"
                    disabled={operationInProgress}
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectAllUsers(false)}
                    className="text-xs text-gray-600 hover:text-gray-800"
                    disabled={operationInProgress}
                  >
                    Clear All
                  </button>
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3 bg-gray-50">
                {users?.filter(user => !user.is_admin).map(user => (
                  <label key={user.id} className="flex items-center justify-between py-2 hover:bg-white rounded px-2">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={(e) => handleUserSelectionChange(user.id, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        disabled={operationInProgress}
                      />
                      <span className="text-sm font-medium">{user.first_name} {user.last_name}</span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatCurrency(user.total_contribution || 0)}
                    </span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {selectedUsers.length} member(s) selected
              </p>
            </div>
          )}
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contribution Amount (KSh) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={contributionForm.amount}
              onChange={(e) => setContributionForm(prev => ({ ...prev, amount: e.target.value }))}
              className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border-gray-300"
              placeholder="Enter amount (e.g., 2000)"
              required
              disabled={operationInProgress}
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contribution Month *
            </label>
            <input
              type="month"
              value={contributionForm.month}
              onChange={(e) => setContributionForm(prev => ({ ...prev, month: e.target.value }))}
              className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border-gray-300"
              required
              disabled={operationInProgress}
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              M-PESA Transaction Code (Optional)
            </label>
            <input
              type="text"
              value={contributionForm.transaction_id}
              onChange={(e) => setContributionForm(prev => ({ ...prev, transaction_id: e.target.value }))}
              className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border-gray-300"
              placeholder="Enter M-PESA transaction code (e.g., QHX12345)"
              disabled={operationInProgress}
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty for auto-generated reference
            </p>
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Method
            </label>
            <select
              value={contributionForm.payment_method}
              onChange={(e) => setContributionForm(prev => ({ ...prev, payment_method: e.target.value }))}
              className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border-gray-300"
              disabled={operationInProgress}
            >
              <option value="manual">Manual Entry</option>
              <option value="mpesa">M-PESA</option>
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
            </select>
          </div>
          
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="secondary"
              onClick={handleCloseContributionModal}
              disabled={operationInProgress || isLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleContributionSubmit}
              disabled={
                operationInProgress || 
                isLoading || 
                !contributionForm.amount || 
                parseFloat(contributionForm.amount) <= 0 ||
                (contributionMode === 'multiple' && selectedUsers.length === 0)
              }
            >
              {(operationInProgress || isLoading) 
                ? 'Adding...' 
                : contributionMode === 'single' 
                  ? 'Add Contribution' 
                  : `Add Contributions (${selectedUsers.length})`
              }
            </Button>
          </div>
          
          {contributionMode === 'multiple' && selectedUsers.length > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
              <p className="text-xs text-yellow-700">
                <strong>Note:</strong> This will add {formatCurrency(parseFloat(contributionForm.amount) || 0)} 
                contribution for {selectedUsers.length} selected member(s) for {contributionForm.month}.
                Total amount: {formatCurrency((parseFloat(contributionForm.amount) || 0) * selectedUsers.length)}
              </p>
            </div>
          )}
        </div>
      </Modal>
      
      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        title="Confirm Delete User"
        onClose={handleCloseDeleteModal}
      >
        {selectedUser && (
          <div className="p-6">
            <div className="mb-4">
              <p className="text-gray-600">
                Are you sure you want to delete the user account for{' '}
                <span className="font-semibold">
                  {selectedUser.first_name} {selectedUser.last_name} ({selectedUser.username})
                </span>?
              </p>
              <p className="text-red-600 text-sm mt-2">
                This action cannot be undone and will permanently remove all user data including contributions and loans.
              </p>
            </div>
            
            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="secondary"
                onClick={handleCloseDeleteModal}
                disabled={operationInProgress || isLoading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={confirmDeleteUser}
                disabled={operationInProgress || isLoading}
              >
                {(operationInProgress || isLoading) ? 'Deleting...' : 'Delete User'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
      
      {/* Suspend/Unsuspend Confirmation Modal */}
      <Modal
        isOpen={showSuspendModal}
        title={selectedUser?.is_suspended ? "Confirm Unsuspend User" : "Confirm Suspend User"}
        onClose={handleCloseSuspendModal}
      >
        {selectedUser && (
          <div className="p-6">
            <div className="mb-4">
              <p className="text-gray-600">
                Are you sure you want to {selectedUser.is_suspended ? 'unsuspend' : 'suspend'} the user account for{' '}
                <span className="font-semibold">
                  {selectedUser.first_name} {selectedUser.last_name} ({selectedUser.username})
                </span>?
              </p>
              <p className={`text-sm mt-2 ${selectedUser.is_suspended ? 'text-green-600' : 'text-yellow-600'}`}>
                {selectedUser.is_suspended 
                  ? 'This will reactivate the user account and restore access to all features.'
                  : 'This will temporarily disable the user account and prevent login access.'
                }
              </p>
            </div>
            
            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="secondary"
                onClick={handleCloseSuspendModal}
                disabled={operationInProgress || isLoading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant={selectedUser.is_suspended ? "success" : "warning"}
                onClick={confirmSuspendUser}
                disabled={operationInProgress || isLoading}
              >
                {(operationInProgress || isLoading) 
                  ? (selectedUser.is_suspended ? 'Unsuspending...' : 'Suspending...') 
                  : (selectedUser.is_suspended ? 'Unsuspend User' : 'Suspend User')
                }
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminUsers;