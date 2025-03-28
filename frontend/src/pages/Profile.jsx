import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { getUserProfile, updateProfile, reset } from '../features/user/userSlice';
import { changePassword } from '../features/auth/authSlice';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';

const Profile = () => {
  const [showProfileAlert, setShowProfileAlert] = useState(false);
  const [showPasswordAlert, setShowPasswordAlert] = useState(false);
  const dispatch = useDispatch();
  
  const { profile, isLoading, isSuccess, isError, message } = useSelector((state) => state.user);
  const { isLoading: isPasswordLoading, isSuccess: isPasswordSuccess, isError: isPasswordError, message: passwordMessage } = useSelector((state) => state.auth);
  
  useEffect(() => {
    dispatch(getUserProfile());
    
    return () => {
      dispatch(reset());
    };
  }, [dispatch]);
  
  useEffect(() => {
    if (isError) {
      setShowProfileAlert(true);
    }
    
    if (isPasswordError) {
      setShowPasswordAlert(true);
    }
  }, [isError, isPasswordError]);
  
  const profileInitialValues = {
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
    email: profile?.email || '',
    phone_number: profile?.phone_number || ''
  };
  
  const profileValidationSchema = Yup.object({
    first_name: Yup.string().required('First name is required'),
    last_name: Yup.string().required('Last name is required'),
    email: Yup.string().email('Invalid email address').required('Email is required'),
    phone_number: Yup.string().matches(/^(\+\d{1,3})?0?\d{9,10}$/, 'Invalid phone number format').required('Phone number is required')
  });
  
  const passwordInitialValues = {
    current_password: '',
    new_password: '',
    confirm_password: ''
  };
  
  const passwordValidationSchema = Yup.object({
    current_password: Yup.string().required('Current password is required'),
    new_password: Yup.string().min(8, 'Password must be at least 8 characters').required('New password is required'),
    confirm_password: Yup.string().oneOf([Yup.ref('new_password'), null], 'Passwords must match').required('Confirm password is required')
  });
  
  const handleProfileSubmit = (values) => {
    dispatch(updateProfile(values));
  };
  
  const handlePasswordSubmit = (values, { resetForm }) => {
    dispatch(changePassword({
      current_password: values.current_password,
      new_password: values.new_password
    }));
    
    if (isPasswordSuccess) {
      resetForm();
    }
  };
  
  if (isLoading && !profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Your Profile</h1>
        <p className="mt-1 text-gray-600">
          Manage your account information and settings
        </p>
      </div>
      
      <div className="space-y-8">
        {/* Profile Information */}
        <Card title="Profile Information">
          {showProfileAlert && isError && (
            <Alert
              type="error"
              message={message}
              onClose={() => setShowProfileAlert(false)}
              autoClose={true}
            />
          )}
          
          {isSuccess && (
            <Alert
              type="success"
              message="Profile updated successfully"
              onClose={() => {}}
              autoClose={true}
            />
          )}
          
          <Formik
            initialValues={profileInitialValues}
            validationSchema={profileValidationSchema}
            onSubmit={handleProfileSubmit}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="First Name"
                    name="first_name"
                    type="text"
                    placeholder="Enter your first name"
                    value={values.first_name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={errors.first_name}
                    touched={touched.first_name}
                    required
                  />
                  
                  <Input
                    label="Last Name"
                    name="last_name"
                    type="text"
                    placeholder="Enter your last name"
                    value={values.last_name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={errors.last_name}
                    touched={touched.last_name}
                    required
                  />
                </div>
                
                <Input
                  label="Email Address"
                  name="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={values.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={errors.email}
                  touched={touched.email}
                  required
                />
                
                <Input
                  label="Phone Number"
                  name="phone_number"
                  type="tel"
                  placeholder="Enter your phone number"
                  value={values.phone_number}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={errors.phone_number}
                  touched={touched.phone_number}
                  required
                />
                
                <div className="flex justify-end mt-4">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </Form>
            )}
          </Formik>
        </Card>
        
        {/* Change Password */}
        <Card title="Change Password">
          {showPasswordAlert && isPasswordError && (
            <Alert
              type="error"
              message={passwordMessage}
              onClose={() => setShowPasswordAlert(false)}
              autoClose={true}
            />
          )}
          
          {isPasswordSuccess && (
            <Alert
              type="success"
              message="Password changed successfully"
              onClose={() => {}}
              autoClose={true}
            />
          )}
          
          <Formik
            initialValues={passwordInitialValues}
            validationSchema={passwordValidationSchema}
            onSubmit={handlePasswordSubmit}
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
                  label="Current Password"
                  name="current_password"
                  type="password"
                  placeholder="Enter your current password"
                  value={values.current_password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={errors.current_password}
                  touched={touched.current_password}
                  required
                />
                
                <Input
                  label="New Password"
                  name="new_password"
                  type="password"
                  placeholder="Enter your new password"
                  value={values.new_password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={errors.new_password}
                  touched={touched.new_password}
                  required
                />
                
                <Input
                  label="Confirm New Password"
                  name="confirm_password"
                  type="password"
                  placeholder="Confirm your new password"
                  value={values.confirm_password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={errors.confirm_password}
                  touched={touched.confirm_password}
                  required
                />
                
                <div className="flex justify-end mt-4">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isPasswordLoading}
                  >
                    {isPasswordLoading ? 'Changing...' : 'Change Password'}
                  </Button>
                </div>
              </Form>
            )}
          </Formik>
        </Card>
        
        {/* Account Information */}
        <Card title="Account Information">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600">Username</p>
              <p className="text-lg font-semibold">{profile?.username}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600">Member Since</p>
              <p className="text-lg font-semibold">
                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '-'}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600">Account Type</p>
              <p className="text-lg font-semibold">
                {profile?.is_admin ? 'Administrator' : 'Regular Member'}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600">Account Status</p>
              <p className="text-lg font-semibold">
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Active
                </span>
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Profile;