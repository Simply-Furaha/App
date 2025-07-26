// src/components/payments/MPESAPayment.jsx
import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import Card from '../common/Card';
import Button from '../common/Button';
import Modal from '../common/Modal';
import Alert from '../common/Alert';
import { formatCurrency } from '../../utils/formatters';
import mpesaService from '../../services/mpesaService';

const MPESAPayment = ({ 
  type = 'contribution', // 'contribution' or 'loan_repayment'
  amount = '',
  loanId = null,
  onSuccess = () => {},
  onError = () => {},
  disabled = false
}) => {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(amount);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [checkoutRequestId, setCheckoutRequestId] = useState(null);
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });
  const [statusCheckInterval, setStatusCheckInterval] = useState(null);

  const { user } = useSelector((state) => state.auth);

  // Initialize phone number with user's number when modal opens
  useEffect(() => {
    if (showPaymentModal && user?.phone_number && !phoneNumber) {
      setPhoneNumber(user.phone_number);
    }
  }, [showPaymentModal, user?.phone_number, phoneNumber]);

  useEffect(() => {
    // Cleanup interval on unmount
    return () => {
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
    };
  }, [statusCheckInterval]);

  const showAlert = (type, message) => {
    setAlert({ show: true, type, message });
    setTimeout(() => setAlert({ show: false, type: '', message: '' }), 5000);
  };

  const validatePayment = () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      showAlert('error', 'Please enter a valid amount');
      return false;
    }

    if (parseFloat(paymentAmount) > 70000) {
      showAlert('error', 'Maximum amount is KES 70,000');
      return false;
    }

    if (!phoneNumber) {
      showAlert('error', 'Please enter a phone number');
      return false;
    }

    // Validate phone number format
    const cleanedPhone = phoneNumber.replace(/\s+/g, '');
    const phoneRegex = /^(?:254|0)?[17]\d{8}$/;
    if (!phoneRegex.test(cleanedPhone)) {
      showAlert('error', 'Please enter a valid Kenyan phone number (e.g., 0712345678 or 254712345678)');
      return false;
    }

    return true;
  };

  const initiatePayment = async () => {
    if (!validatePayment()) return;

    try {
      setIsProcessing(true);
      setPaymentStatus('initiating');

      let result;
      
      if (type === 'contribution') {
        result = await mpesaService.initiateContribution({
          amount: parseFloat(paymentAmount),
          month: new Date().toISOString().slice(0, 7), // YYYY-MM format
          phone_number: phoneNumber // Include custom phone number
        });
      } else if (type === 'loan_repayment') {
        if (!loanId) {
          throw new Error('Loan ID is required for loan repayment');
        }
        result = await mpesaService.initiateLoanRepayment({
          loan_id: loanId,
          amount: parseFloat(paymentAmount),
          phone_number: phoneNumber // Include custom phone number
        });
      }

      if (result.success) {
        setCheckoutRequestId(result.checkout_request_id);
        setPaymentStatus('pending');
        showAlert('info', 'Payment request sent to your phone. Please enter your M-PESA PIN.');
        
        // Start checking payment status
        startStatusCheck(result.checkout_request_id);
      } else {
        throw new Error(result.error || 'Payment initiation failed');
      }
    } catch (error) {
      console.error('Payment initiation error:', error);
      showAlert('error', error.message || 'Failed to initiate payment');
      setPaymentStatus('failed');
      onError(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const startStatusCheck = (checkoutId) => {
    const interval = setInterval(async () => {
      try {
        const status = await mpesaService.getPaymentStatus(checkoutId);
        
        if (status.payment_status.status === 'success') {
          clearInterval(interval);
          setPaymentStatus('success');
          showAlert('success', 'Payment completed successfully!');
          onSuccess(status.payment_status);
          setTimeout(() => {
            setShowPaymentModal(false);
            resetPayment();
          }, 2000);
        } else if (status.payment_status.status === 'failed') {
          clearInterval(interval);
          setPaymentStatus('failed');
          showAlert('error', status.payment_status.failure_reason || 'Payment failed');
          onError(new Error(status.payment_status.failure_reason));
        }
        // If still pending, continue checking
      } catch (error) {
        console.error('Status check error:', error);
        // Continue checking even if there's an error
      }
    }, 3000); // Check every 3 seconds

    setStatusCheckInterval(interval);

    // Stop checking after 5 minutes
    setTimeout(() => {
      clearInterval(interval);
      if (paymentStatus === 'pending') {
        setPaymentStatus('timeout');
        showAlert('warning', 'Payment status check timed out. Please check your M-PESA messages.');
      }
    }, 300000); // 5 minutes
  };

  const resetPayment = () => {
    setPaymentStatus(null);
    setCheckoutRequestId(null);
    setPaymentAmount(amount);
    setPhoneNumber(user?.phone_number || '');
    if (statusCheckInterval) {
      clearInterval(statusCheckInterval);
      setStatusCheckInterval(null);
    }
  };

  const handleCloseModal = () => {
    if (!isProcessing && paymentStatus !== 'pending') {
      setShowPaymentModal(false);
      resetPayment();
    }
  };

  const getStatusIcon = () => {
    switch (paymentStatus) {
      case 'initiating':
        return '⏳';
      case 'pending':
        return '📱';
      case 'success':
        return '✅';
      case 'failed':
        return '❌';
      case 'timeout':
        return '⏰';
      default:
        return '💳';
    }
  };

  const getStatusMessage = () => {
    switch (paymentStatus) {
      case 'initiating':
        return 'Initiating payment...';
      case 'pending':
        return 'Check your phone for M-PESA prompt';
      case 'success':
        return 'Payment successful!';
      case 'failed':
        return 'Payment failed';
      case 'timeout':
        return 'Payment status check timed out';
      default:
        return `Pay ${formatCurrency(paymentAmount)} via M-PESA`;
    }
  };

  return (
    <>
      <Button
        variant="primary"
        onClick={() => setShowPaymentModal(true)}
        disabled={disabled}
        className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center space-x-2"
      >
        <span>📱</span>
        <span>Pay with M-PESA</span>
      </Button>

      <Modal
        isOpen={showPaymentModal}
        onClose={handleCloseModal}
        title="M-PESA Payment"
        size="md"
      >
        <div className="space-y-6">
          {/* Alert */}
          {alert.show && (
            <Alert
              type={alert.type}
              message={alert.message}
              onClose={() => setAlert({ show: false, type: '', message: '' })}
            />
          )}

          {/* Payment Details */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Payment Details</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Type:</span>
                <span className="font-medium">
                  {type === 'contribution' ? 'Monthly Contribution' : 'Loan Repayment'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Phone Number:</span>
                <span className="font-medium">{phoneNumber || user?.phone_number}</span>
              </div>
              {loanId && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Loan ID:</span>
                  <span className="font-medium">#{loanId}</span>
                </div>
              )}
            </div>
          </div>

          {/* Phone Number Input */}
          {!paymentStatus && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="e.g., 0712345678 or 254712345678"
                disabled={isProcessing}
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the phone number that will receive the M-PESA prompt
              </p>
            </div>
          )}

          {/* Amount Input */}
          {!paymentStatus && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (KES)
              </label>
              <input
                type="number"
                min="1"
                max="70000"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter amount"
                disabled={isProcessing}
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum: KES 1 | Maximum: KES 70,000
              </p>
            </div>
          )}

          {/* Payment Status */}
          {paymentStatus && (
            <div className="text-center p-6">
              <div className="text-6xl mb-4">{getStatusIcon()}</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {getStatusMessage()}
              </h3>
              {paymentStatus === 'pending' && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    Amount: {formatCurrency(paymentAmount)}
                  </p>
                  <p className="text-sm text-gray-600">
                    Phone: {phoneNumber}
                  </p>
                  <p className="text-sm text-gray-600">
                    Enter your M-PESA PIN on your phone to complete the payment
                  </p>
                  <div className="animate-pulse text-green-600">
                    Waiting for payment confirmation...
                  </div>
                </div>
              )}
              {paymentStatus === 'success' && (
                <p className="text-sm text-green-600">
                  Payment of {formatCurrency(paymentAmount)} completed successfully!
                </p>
              )}
              {paymentStatus === 'failed' && (
                <p className="text-sm text-red-600">
                  Payment failed. Please try again.
                </p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4">
            <Button
              variant="secondary"
              onClick={handleCloseModal}
              disabled={isProcessing || paymentStatus === 'pending'}
            >
              {paymentStatus === 'pending' ? 'Please Complete Payment' : 'Cancel'}
            </Button>
            
            {!paymentStatus && (
              <Button
                variant="primary"
                onClick={initiatePayment}
                disabled={isProcessing || !paymentAmount || !phoneNumber}
                loading={isProcessing}
                className="bg-green-600 hover:bg-green-700"
              >
                {isProcessing ? 'Initiating...' : `Pay ${formatCurrency(paymentAmount || 0)}`}
              </Button>
            )}

            {paymentStatus === 'failed' && (
              <Button
                variant="primary"
                onClick={() => {
                  setPaymentStatus(null);
                  setCheckoutRequestId(null);
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                Try Again
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
};

export default MPESAPayment;