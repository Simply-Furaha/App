import React from 'react';
import LoanApplicationForm from '../components/loans/LoanApplicationForm';

const LoanApplication = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Apply for a Loan</h1>
        <p className="mt-1 text-gray-600">
          Submit your loan application based on your contribution history
        </p>
      </div>
      
      <LoanApplicationForm />
    </div>
  );
};

export default LoanApplication;