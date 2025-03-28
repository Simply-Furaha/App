import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getInvestments, createInvestment, updateInvestment, reset } from '../features/admin/adminSlice';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import DataTable from '../components/common/DataTable';
import Input from '../components/common/Input';
import Alert from '../components/common/Alert';
import Modal from '../components/common/Modal';
import { formatCurrency, formatDate } from '../utils/formatters';

const AdminInvestments = () => {
  const [showAlert, setShowAlert] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [currentInvestment, setCurrentInvestment] = useState(null);
  
  const dispatch = useDispatch();
  const { investments, isLoading, isSuccess, isError, message } = useSelector((state) => state.admin);
  
  useEffect(() => {
    dispatch(getInvestments());
    
    return () => {
      dispatch(reset());
    };
  }, [dispatch]);
  
  useEffect(() => {
    if (isError) {
      setShowAlert(true);
    }
    
    if (isSuccess && (showCreateModal || showUpdateModal)) {
      setShowCreateModal(false);
      setShowUpdateModal(false);
    }
  }, [isError, isSuccess, showCreateModal, showUpdateModal]);
  
  const handleCreateInvestment = (values) => {
    dispatch(createInvestment({
      amount: parseFloat(values.amount),
      description: values.description,
      expected_return: values.expected_return ? parseFloat(values.expected_return) : null,
      expected_return_date: values.expected_return_date || null
    }));
  };
  
  const handleUpdateInvestment = (values) => {
    dispatch(updateInvestment({
      id: currentInvestment.id,
      investmentData: {
        description: values.description,
        expected_return: values.expected_return ? parseFloat(values.expected_return) : null,
        expected_return_date: values.expected_return_date || null,
        status: values.status
      }
    }));
  };
  
  const handleUpdateClick = (investment) => {
    setCurrentInvestment(investment);
    setShowUpdateModal(true);
  };
  
  const columns = [
    {
      header: 'Date',
      accessor: 'investment_date',
      render: (investment) => formatDate(investment.investment_date)
    },
    {
      header: 'Description',
      accessor: 'description'
    },
    {
      header: 'Amount',
      accessor: 'amount',
      render: (investment) => formatCurrency(investment.amount)
    },
    {
      header: 'Expected Return',
      accessor: 'expected_return',
      render: (investment) => investment.expected_return ? formatCurrency(investment.expected_return) : '-'
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (investment) => {
        const statusColors = {
          active: 'bg-green-100 text-green-800',
          completed: 'bg-blue-100 text-blue-800',
          cancelled: 'bg-red-100 text-red-800'
        };
        
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[investment.status]}`}>
            {investment.status.charAt(0).toUpperCase() + investment.status.slice(1)}
          </span>
        );
      }
    },
    {
      header: 'Actions',
      render: (investment) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleUpdateClick(investment)}
        >
          Update
        </Button>
      )
    }
  ];
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">External Investments</h1>
          <p className="mt-1 text-gray-600">
            Manage external investments
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowCreateModal(true)}
        >
          New Investment
        </Button>
      </div>
      
      {showAlert && isError && (
        <Alert
          type="error"
          message={message}
          onClose={() => setShowAlert(false)}
          autoClose={true}
        />
      )}
      
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">Investment Records</h2>
            <div className="text-gray-600">
              Total: {investments ? investments.length : 0} investments
            </div>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={investments || []}
            emptyMessage="No investment records found"
            pagination={true}
          />
        )}
      </div>
      
      {/* Create Investment Modal */}
      <Modal
        isOpen={showCreateModal}
        title="Create New Investment"
        onClose={() => setShowCreateModal(false)}
      >
        <div className="p-6">
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const values = Object.fromEntries(formData.entries());
            handleCreateInvestment(values);
          }}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount (KES)
              </label>
              <input
                type="number"
                name="amount"
                required
                className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border-gray-300"
                placeholder="Enter investment amount"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                required
                rows="3"
                className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border-gray-300"
                placeholder="Enter investment description"
              ></textarea>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expected Return (KES)
              </label>
              <input
                type="number"
                name="expected_return"
                className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border-gray-300"
                placeholder="Enter expected return amount"
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expected Return Date
              </label>
              <input
                type="date"
                name="expected_return_date"
                className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border-gray-300"
              />
            </div>
            
            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isLoading}
              >
                {isLoading ? 'Creating...' : 'Create Investment'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
      
      {/* Update Investment Modal */}
      <Modal
        isOpen={showUpdateModal}
        title="Update Investment"
        onClose={() => setShowUpdateModal(false)}
      >
        {currentInvestment && (
          <div className="p-6">
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const values = Object.fromEntries(formData.entries());
              handleUpdateInvestment(values);
            }}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  required
                  rows="3"
                  defaultValue={currentInvestment.description}
                  className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border-gray-300"
                ></textarea>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expected Return (KES)
                </label>
                <input
                  type="number"
                  name="expected_return"
                  defaultValue={currentInvestment.expected_return}
                  className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border-gray-300"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expected Return Date
                </label>
                <input
                  type="date"
                  name="expected_return_date"
                  defaultValue={currentInvestment.expected_return_date ? new Date(currentInvestment.expected_return_date).toISOString().split('T')[0] : ''}
                  className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border-gray-300"
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  name="status"
                  defaultValue={currentInvestment.status}
                  className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border-gray-300"
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              
              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowUpdateModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isLoading}
                >
                  {isLoading ? 'Updating...' : 'Update Investment'}
                </Button>
              </div>
            </form>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminInvestments;