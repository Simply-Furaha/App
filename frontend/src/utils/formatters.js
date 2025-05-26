// Format currency
export const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };
  
  // Format date
  export const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };
  
  // Format date with time
  export const formatDateTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    }).format(date);
  };
  
  // Format percentage
  export const formatPercentage = (value) => {
    return `${value.toFixed(1)}%`;
  };
  
  // Format phone number for display
  export const formatPhoneNumber = (phoneNumber) => {
    if (!phoneNumber) return '';
    
    // If it doesn't start with +254, format it
    if (!phoneNumber.startsWith('+254')) {
      // If it starts with 0, replace with +254
      if (phoneNumber.startsWith('0')) {
        return '+254' + phoneNumber.substring(1);
      }
      // If it starts with 254, add +
      if (phoneNumber.startsWith('254')) {
        return '+' + phoneNumber;
      }
      // Otherwise, assume it's a local number and add +254
      return '+254' + phoneNumber;
    }
    
    return phoneNumber;
  };
  
  // Format loan status
  export const formatLoanStatus = (status) => {
    switch (status) {
      case 'pending':
        return { label: 'Pending Approval', color: 'bg-yellow-100 text-yellow-800' };
      case 'approved':
        return { label: 'Approved', color: 'bg-green-100 text-green-800' };
      case 'paid':
        return { label: 'Paid', color: 'bg-blue-100 text-blue-800' };
      case 'rejected':
        return { label: 'Rejected', color: 'bg-red-100 text-red-800' };
      default:
        return { label: status, color: 'bg-gray-100 text-gray-800' };
    }
  };