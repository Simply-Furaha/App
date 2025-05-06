import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { makeContribution, reset } from '../../features/contributions/contributionsSlice';
import Input from '../common/Input';
import Button from '../common/Button';
import Alert from '../common/Alert';
import Card from '../common/Card';

const ContributionForm = () => {
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('error');
  
  const dispatch = useDispatch();
  
  const { isLoading, isSuccess, isError, message } = useSelector((state) => state.contributions);
  const { user } = useSelector((state) => state.auth);
  
  // Clear any previous states when component mounts
  useEffect(() => {
    dispatch(reset());
  }, [dispatch]);
  
  // Handle success or error states
  useEffect(() => {
    if (isError) {
      setShowAlert(true);
      setAlertMessage(message || 'An error occurred while processing your request');
      setAlertType('error');
    }
    
    if (isSuccess) {
      setShowAlert(true);
      setAlertMessage('Payment request sent to your phone. Please check your phone and enter your M-PESA PIN to complete the transaction.');
      setAlertType('success');
    }
  }, [isError, isSuccess, message]);
  
  // Initialize phone number with user's number if available
  const initialValues = {
    amount: 2000,
    phone_number: user?.phone_number || ''
  };
  
  const phoneRegExp = /^(\+\d{1,3})?0?\d{9,10}$/;
  
  const validationSchema = Yup.object({
    amount: Yup.number()
      .required('Contribution amount is required')
      .min(500, 'Minimum contribution is KES 500'),
    phone_number: Yup.string()
      .required('Phone number is required')
      .matches(phoneRegExp, 'Invalid phone number format. Use format: +254XXXXXXXXX or 07XXXXXXXX')
  });
  
  const handleSubmit = (values, { resetForm }) => {
    // Format phone number to ensure it's in the correct format
    let formattedPhone = values.phone_number;
    
    // Remove any spaces
    formattedPhone = formattedPhone.replace(/\s+/g, '');
    
    // If number starts with 0, replace with 254
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.substring(1);
    }
    
    // If number doesn't have country code, add it
    if (!formattedPhone.startsWith('+') && !formattedPhone.startsWith('254')) {
      formattedPhone = '254' + formattedPhone;
    }
    
    // Remove + sign if present as backend might expect numeric format
    if (formattedPhone.startsWith('+')) {
      formattedPhone = formattedPhone.substring(1);
    }
    
    console.log('Submitting contribution with phone:', formattedPhone);
    
    dispatch(makeContribution({
      amount: parseFloat(values.amount),
      phone_number: formattedPhone
    }));
  };
  
  return (
    <Card title="Make Monthly Contribution">
      {showAlert && (
        <Alert
          type={alertType}
          message={alertMessage}
          onClose={() => setShowAlert(false)}
          autoClose={false}
        />
      )}
      
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
            
            <Input
              label="M-PESA Phone Number"
              name="phone_number"
              type="text"
              placeholder="Enter phone number e.g. 07XXXXXXXX"
              value={values.phone_number}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.phone_number}
              touched={touched.phone_number}
              required
              helpText="Enter the phone number that will receive the M-PESA payment request"
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
                    <p>This will initiate an M-PESA payment request to the phone number provided. You will need to confirm the payment using your M-PESA PIN when prompted on your phone.</p>
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