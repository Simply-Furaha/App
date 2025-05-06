import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { applyForLoan, reset } from '../../features/loans/loansSlice';
import { getLoanLimit } from '../../features/user/userSlice';
import Input from '../common/Input';
import Button from '../common/Button';
import Alert from '../common/Alert';
import Card from '../common/Card';
import { formatCurrency } from '../../utils/formatters';

const LoanApplicationForm = () => {
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const { loanLimit, isLoading: isLimitLoading } = useSelector((state) => state.user);
  const { isLoading, isSuccess, isError, message } = useSelector((state) => state.loans);
  
  useEffect(() => {
    dispatch(getLoanLimit());
    
    return () => {
      dispatch(reset());
    };
  }, [dispatch]);
  
  useEffect(() => {
    if (isError) {
      setShowAlert(true);
      setAlertMessage(message);
    }
    
    if (isSuccess) {
      navigate('/loans');
    }
  }, [isError, isSuccess, navigate, message]);
  
  const initialValues = {
    amount: '',
    agree: false
  };
  
  const validationSchema = Yup.object({
    amount: Yup.number()
      .required('Loan amount is required')
      .positive('Amount must be positive')
      .max(
        loanLimit?.available_loan_limit || 0, 
        `Amount cannot exceed your available limit of ${formatCurrency(loanLimit?.available_loan_limit || 0)}`
      ),
    agree: Yup.boolean()
      .oneOf([true], 'You must agree to the terms')
  });
  
  const handleSubmit = (values) => {
    try {
      // Ensure amount is a valid number
      const amount = parseFloat(values.amount);
      
      if (isNaN(amount) || amount <= 0) {
        setShowAlert(true);
        setAlertMessage('Please enter a valid loan amount');
        return;
      }
      
      // Check if amount exceeds available limit
      if (amount > (loanLimit?.available_loan_limit || 0)) {
        setShowAlert(true);
        setAlertMessage('Loan amount exceeds your available limit');
        return;
      }
      
      console.log('Submitting loan application with amount:', amount);
      
      // Match your loansService.js implementation which expects just an amount
      dispatch(applyForLoan({ amount }));
    } catch (error) {
      setShowAlert(true);
      setAlertMessage('An error occurred while processing your application');
      console.error('Loan application error:', error);
    }
  };
  
  return (
    <Card title="Loan Application">
      {showAlert && (
        <Alert
          type="error"
          message={alertMessage || message}
          onClose={() => setShowAlert(false)}
          autoClose={true}
        />
      )}
      
      {isLimitLoading ? (
        <div className="flex justify-center py-6">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          <div className="mb-6 bg-blue-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Loan Limits</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total Contribution</p>
                <p className="text-xl font-semibold">{formatCurrency(loanLimit?.total_contribution || 0)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Your Maximum Loan Limit</p>
                <p className="text-xl font-semibold">{formatCurrency(loanLimit?.loan_limit || 0)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Available Loan Limit</p>
                <p className="text-xl font-semibold text-green-600">{formatCurrency(loanLimit?.available_loan_limit || 0)}</p>
              </div>
            </div>
          </div>
          
          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
            enableReinitialize
          >
            {({
              values,
              errors,
              touched,
              handleChange,
              handleBlur,
              setFieldValue,
              isSubmitting,
            }) => (
              <Form>
                <Input
                  label="Loan Amount (KES)"
                  name="amount"
                  type="number"
                  placeholder="Enter loan amount"
                  value={values.amount}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={errors.amount}
                  touched={touched.amount}
                  required
                />
                
                <div className="mb-6">
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="agree"
                        name="agree"
                        type="checkbox"
                        checked={values.agree}
                        onChange={handleChange}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="agree" className="font-medium text-gray-700">
                        I agree to the loan terms and conditions
                      </label>
                      <p className="text-gray-500">
                        I understand that this loan carries a 5% interest rate and must be repaid within 30 days.
                      </p>
                      {errors.agree && touched.agree && (
                        <p className="mt-1 text-sm text-red-600">{errors.agree}</p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => navigate('/loans')}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isLoading || loanLimit?.available_loan_limit <= 0}
                  >
                    {isLoading ? 'Submitting...' : 'Submit Application'}
                  </Button>
                </div>
              </Form>
            )}
          </Formik>
        </>
      )}
    </Card>
  );
};

export default LoanApplicationForm;