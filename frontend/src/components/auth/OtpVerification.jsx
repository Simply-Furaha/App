import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { verifyOtp, resendOtp, reset } from '../../features/auth/authSlice';
import Button from '../common/Button';
import Alert from '../common/Alert';

const OtpVerification = () => {
  const [showAlert, setShowAlert] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const { tempUserId, isLoading, isSuccess, isError, message, otpVerified, isAuthenticated } = useSelector(
    (state) => state.auth
  );
  
  useEffect(() => {
    if (!tempUserId) {
      navigate('/login');
    }
    
    if (isError) {
      setShowAlert(true);
    }
    
    if (isSuccess && otpVerified && isAuthenticated) {
      navigate('/dashboard');
    }
    
    return () => {
      dispatch(reset());
    };
  }, [tempUserId, isError, isSuccess, otpVerified, isAuthenticated, message, navigate, dispatch]);
  
  // Timer for OTP resend
  useEffect(() => {
    if (timer > 0) {
      const countdown = setInterval(() => {
        setTimer((prevTimer) => prevTimer - 1);
      }, 1000);
      
      return () => clearInterval(countdown);
    } else {
      setCanResend(true);
    }
  }, [timer]);
  
  const handleResendOtp = () => {
    if (canResend && tempUserId) {
      dispatch(resendOtp(tempUserId));
      setCanResend(false);
      setTimer(60);
    }
  };
  
  const handleOtpChange = (e, index) => {
    const value = e.target.value;
    if (value === '' || /^[0-9]$/.test(value)) {
      // Update the current digit
      const newOtpDigits = [...otpDigits];
      newOtpDigits[index] = value;
      setOtpDigits(newOtpDigits);
      
      // Auto focus to next input
      if (value !== '' && index < 5) {
        const nextInput = document.getElementById(`otp-${index + 1}`);
        if (nextInput) {
          nextInput.focus();
        }
      }
    }
  };
  
  const handleKeyDown = (e, index) => {
    // Handle backspace
    if (e.key === 'Backspace') {
      if (otpDigits[index] === '' && index > 0) {
        const prevInput = document.getElementById(`otp-${index - 1}`);
        if (prevInput) {
          prevInput.focus();
        }
      }
    }
  };
  
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').trim();
    
    // Only proceed if the pasted content is 6 digits
    if (/^\d{6}$/.test(pastedData)) {
      const newOtpDigits = pastedData.split('');
      setOtpDigits(newOtpDigits);
      
      // Focus on the last input after paste
      const lastInput = document.getElementById('otp-5');
      if (lastInput) {
        lastInput.focus();
      }
    }
  };
  
  const handleSubmit = () => {
    const otpCode = otpDigits.join('');
    
    if (otpCode.length === 6 && /^\d{6}$/.test(otpCode)) {
      dispatch(verifyOtp({
        user_id: tempUserId,
        otp_code: otpCode
      }));
    }
  };
  
  return (
    <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800">Verify OTP</h2>
        <p className="text-gray-600 mt-2">Enter the verification code sent to your email</p>
      </div>
      
      {showAlert && isError && (
        <Alert
          type="error"
          message={message}
          onClose={() => setShowAlert(false)}
          autoClose={true}
        />
      )}
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Verification Code</label>
        <div className="flex space-x-2 justify-between">
          {otpDigits.map((digit, index) => (
            <input
              key={index}
              id={`otp-${index}`}
              type="text"
              maxLength="1"
              value={digit}
              onChange={(e) => handleOtpChange(e, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              onPaste={index === 0 ? handlePaste : undefined}
              className="w-12 h-12 text-center text-xl font-semibold border rounded-md shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          ))}
        </div>
      </div>
      
      <Button
        type="button"
        variant="primary"
        fullWidth
        onClick={handleSubmit}
        disabled={isLoading || otpDigits.join('').length !== 6}
      >
        {isLoading ? 'Verifying...' : 'Verify Code'}
      </Button>
      
      <div className="text-center mt-6">
        <p className="text-sm text-gray-600">
          Didn't receive the code?{' '}
          {canResend ? (
            <button
              type="button"
              onClick={handleResendOtp}
              className="text-blue-600 hover:text-blue-500"
            >
              Resend Code
            </button>
          ) : (
            <span className="text-gray-500">
              Resend in {timer} seconds
            </span>
          )}
        </p>
      </div>
    </div>
  );
};

export default OtpVerification;