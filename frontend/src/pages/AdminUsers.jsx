import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getUsers, reset } from '../features/admin/adminSlice';
import Card from '../components/common/Card';
import DataTable from '../components/common/DataTable';
import Alert from '../components/common/Alert';
import { formatDate } from '../utils/formatters';

const AdminUsers = () => {
  const [showAlert, setShowAlert] = useState(false);
  
  const dispatch = useDispatch();
  const { users, isLoading, isError, message } = useSelector((state) => state.admin);
  
  useEffect(() => {
    dispatch(getUsers());
    
    return () => {
      dispatch(reset());
    };
  }, [dispatch]);
  
  useEffect(() => {
    if (isError) {
      setShowAlert(true);
    }
  }, [isError]);
  
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
      accessor: 'is_admin',
      render: (user) => user.is_admin ? 'Admin' : 'Member'
    },
    {
      header: 'Status',
      accessor: 'is_verified',
      render: (user) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          user.is_verified 
            ? 'bg-green-100 text-green-800' 
            : 'bg-yellow-100 text-yellow-800'
        }`}>
          {user.is_verified ? 'Verified' : 'Unverified'}
        </span>
      )
    },
    {
      header: 'Joined',
      accessor: 'created_at',
      render: (user) => formatDate(user.created_at)
    }
  ];
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <p className="mt-1 text-gray-600">
          View and manage all users in the system
        </p>
      </div>
      
      {showAlert && isError && (
        <Alert
          type="error"
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-gray-700">Total Users</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{users ? users.length : 0}</p>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-blue-700">Regular Members</p>
              <p className="mt-1 text-2xl font-semibold text-blue-600">
                {users ? users.filter(user => !user.is_admin).length : 0}
              </p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-purple-700">Administrators</p>
              <p className="mt-1 text-2xl font-semibold text-purple-600">
                {users ? users.filter(user => user.is_admin).length : 0}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">User List</h2>
            <div className="text-gray-600">
              Total: {users ? users.length : 0} users
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
            data={users || []}
            emptyMessage="No users found"
            pagination={true}
          />
        )}
      </div>
    </div>
  );
};

export default AdminUsers;