import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { makeContribution, reset, resetMpesa, checkPaymentStatus } from '../../features/contributions/contributionsSlice';
import Input from '../common/Input';
import Button from '../common/Button';
import Alert from '../common/Alert';
import Card from '../common/Card';

const ContributionForm = () => {
  const [showAlert, setShowAlert] = useState(false);
  const [paymentInProgress, setPaymentInProgress] = useState(false);
  
  const dispatch = useDispatch();
  
  const { 
    mpesaLoading, 
    mpesaSuccess, 
    mpesaError, 
    mpesaMessage,
    checkoutRequestId,
    mpesaInstructions 
  } = useSelector((state) => state.contributions);
  const { user } = useSelector((state) => state.auth);
  
  useEffect(() => {
    dispatch(reset());
  }, [dispatch]);
  
  useEffect(() => {
    if (mpesaError || mpesaSuccess) {
      setShowAlert(true);
      setPaymentInProgress(false);
    }
    
    // Auto-check payment status after M-PESA request
    if (checkoutRequestId && !mpesaSuccess && !mpesaError) {
      setPaymentInProgress(true);
      const interval = setInterval(() => {
        dispatch(checkPaymentStatus(checkoutRequestId));
      }, 5000);
      
      // Stop checking after 2 minutes
      setTimeout(() => clearInterval(interval), 120000);
      
      return () => clearInterval(interval);
    }
  }, [mpesaError, mpesaSuccess, checkoutRequestId, dispatch]);
  
  const initialValues = {
    amount: 2000,
    phone_number: user?.phone_number || ''
  };
  
  const validationSchema = Yup.object({
    amount: Yup.number()
      .required('Amount required')
      .min(1, 'Minimum KES 1')
      .max(70000, 'Maximum KES 70,000'),
    phone_number: Yup.string()
      .required('Phone number required')
      .matches(/^(\+?254|0)?[7][0-9]{8}$/, 'Invalid Kenyan phone number')
  });
  
  const formatPhone = (phone) => {
    let formatted = phone.replace(/\s+/g, '');
    if (formatted.startsWith('0')) {
      formatted = '254' + formatted.substring(1);
    }
    if (formatted.startsWith('+')) {
      formatted = formatted.substring(1);
    }
    if (!formatted.startsWith('254')) {
      formatted = '254' + formatted;
    }
    return formatted;
  };
  
  const handleSubmit = (values, { resetForm }) => {
    dispatch(resetMpesa());
    const formattedPhone = formatPhone(values.phone_number);
    
    dispatch(makeContribution({
      amount: parseFloat(values.amount),
      phone_number: formattedPhone
    }));
    
    if (!mpesaError) {
      resetForm();
    }
  };
  
  return (
    <Card title="Make Monthly Contribution">
      {showAlert && (mpesaError || mpesaSuccess) && (
        <Alert
          type={mpesaError ? 'error' : 'success'}
          message={mpesaMessage}
          onClose={() => setShowAlert(false)}
          autoClose={true}
        />
      )}
      
      {paymentInProgress && (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            <span className="text-blue-700">Waiting for M-PESA confirmation...</span>
          </div>
        </div>
      )}
      
      {mpesaInstructions.length > 0 && (
        <div className="mb-4 p-4 bg-green-50 rounded-lg">
          <h4 className="font-medium text-green-800 mb-2">Next Steps:</h4>
          <ul className="text-sm text-green-700 space-y-1">
            {mpesaInstructions.map((instruction, index) => (
              <li key={index}>• {instruction}</li>
            ))}
          </ul>
        </div>
      )}
      
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
        enableReinitialize
      >
        {({ values, errors, touched, handleChange, handleBlur }) => (
          <Form>
            <Input
              label="Amount (KES)"
              name="amount"
              type="number"
              placeholder="2000"
              value={values.amount}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.amount}
              touched={touched.amount}
              required
            />
            
            <Input
              label="M-PESA Phone"
              name="phone_number"
              type="text"
              placeholder="0712345678"
              value={values.phone_number}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.phone_number}
              touched={touched.phone_number}
              required
            />
            
            <div className="bg-yellow-50 p-3 mb-4 rounded text-sm text-yellow-700">
              💡 You'll receive an M-PESA prompt on your phone. Enter your PIN to complete payment.
            </div>
            
            <Button
              type="submit"
              variant="primary"
              disabled={mpesaLoading || paymentInProgress}
              className="w-full"
            >
              {mpesaLoading ? 'Sending Request...' : 
               paymentInProgress ? 'Waiting for Payment...' : 
               'Pay via M-PESA'}
            </Button>
          </Form>
        )}
      </Formik>
    </Card>
  );
};

export default ContributionForm;