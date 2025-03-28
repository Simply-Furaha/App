import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { makeContribution } from '../../features/contributions/contributionsSlice';
import Input from '../common/Input';
import Button from '../common/Button';
import Alert from '../common/Alert';
import Card from '../common/Card';

const ContributionForm = () => {
  const [showAlert, setShowAlert] = useState(false);
  const dispatch = useDispatch();
  
  const { isLoading, isSuccess, isError, message } = useSelector((state) => state.contributions);
  
  const initialValues = {
    amount: 2000
  };
  
  const validationSchema = Yup.object({
    amount: Yup.number()
      .required('Contribution amount is required')
      .min(500, 'Minimum contribution is KES 500')
  });
  
  const handleSubmit = (values, { resetForm }) => {
    dispatch(makeContribution({
      amount: parseFloat(values.amount)
    }));
    
    if (isSuccess) {
      resetForm();
    }
  };
  
  return (
    <Card title="Make Monthly Contribution">
      {showAlert && isError && (
        <Alert
          type="error"
          message={message}
          onClose={() => setShowAlert(false)}
          autoClose={true}
        />
      )}
      
      {isSuccess && (
        <Alert
          type="success"
          message="Contribution initiated. Please check your phone to complete the payment."
          onClose={() => {}}
          autoClose={true}
        />
      )}
      
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({
          values,
          errors,
          touched,
          handleChange,
          handleBlur,
          isSubmitting,
        }) => (
          <Form>
            <Input
              label="Contribution Amount (KES)"
              name="amount"
              type="number"
              placeholder="Enter contribution amount"
              value={values.amount}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.amount}
              touched={touched.amount}
              required
            />
            
            <div className="bg-yellow-50 p-4 mb-6 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">Payment Information</h3>
                  <div className="mt-1 text-sm text-yellow-700">
                    <p>This will initiate an M-PESA payment request to your registered phone number. You will need to confirm the payment using your M-PESA PIN.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button
                type="submit"
                variant="primary"
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : 'Make Contribution'}
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    </Card>
  );
};

export default ContributionForm;