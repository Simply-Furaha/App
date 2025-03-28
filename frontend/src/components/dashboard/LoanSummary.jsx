import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../common/Card';
import { formatCurrency } from '../../utils/formatters';

const LoanSummary = ({ loans, loanLimit, availableLimit }) => {
  // Calculate loan statistics
  const totalLoanAmount = loans?.reduce((sum, loan) => sum + loan.amount, 0) || 0;
  const totalOutstanding = loans?.filter(loan => loan.status === 'approved')
    .reduce((sum, loan) => sum + loan.unpaid_balance, 0) || 0;
  const pendingLoans = loans?.filter(loan => loan.status === 'pending') || [];
  
  // Get active loans (approved but not fully paid)
  const activeLoans = loans?.filter(loan => 
    loan.status === 'approved' && loan.unpaid_balance > 0
  ) || [];
  
  return (
    <Card 
      title="Loan Summary" 
      subtitle="Overview of your loan status and limits"
      footer={
        <Link to="/loans" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
          View all loans →
        </Link>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm font-medium text-blue-700">Loan Limit</p>
          <p className="mt-1 text-2xl font-semibold text-blue-900">{formatCurrency(loanLimit || 0)}</p>
          <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-600 rounded-full" 
              style={{ 
                width: `${Math.min(100, loanLimit ? (totalOutstanding / loanLimit) * 100 : 0)}%`
              }}
            ></div>
          </div>
          <div className="mt-1 flex justify-between text-xs text-gray-500">
            <span>Used: {formatCurrency(totalOutstanding)}</span>
            <span>Available: {formatCurrency(availableLimit || 0)}</span>
          </div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm font-medium text-gray-700">Loan Status</p>
          <div className="mt-3 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Active Loans:</span>
              <span className="font-medium text-gray-900">{activeLoans.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pending Approvals:</span>
              <span className="font-medium text-gray-900">{pendingLoans.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Outstanding:</span>
              <span className="font-medium text-gray-900">{formatCurrency(totalOutstanding)}</span>
            </div>
          </div>
        </div>
      </div>
      
      {activeLoans.length > 0 ? (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Active Loans</h4>
          <div className="space-y-3">
            {activeLoans.map(loan => (
              <div 
                key={loan.id}
                className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-gray-900 font-medium">Loan #{loan.id}</p>
                    <p className="text-sm text-gray-500">
                      Borrowed on {new Date(loan.borrowed_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-gray-900">
                      {formatCurrency(loan.unpaid_balance)}
                    </p>
                    <p className="text-xs text-gray-500">
                      Due on {new Date(loan.due_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="mt-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Repayment Progress</span>
                    <span className="text-gray-900">
                      {Math.round((loan.paid_amount / loan.amount_due) * 100)}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full" 
                      style={{ width: `${(loan.paid_amount / loan.amount_due) * 100}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="mt-4">
                  <Link
                    to={`/loans/${loan.id}`}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    View Details →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-4 text-gray-500">
          <p>You have no active loans</p>
        </div>
      )}
    </Card>
  );
};

export default LoanSummary;