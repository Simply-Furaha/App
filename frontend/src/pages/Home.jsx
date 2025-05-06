import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Button from '../components/common/Button';

const Home = () => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="md:w-2/3">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Invest Together, Achieve More with NineFund
            </h1>
            <p className="text-xl mb-8">
              A secure platform for group contributions, loans, and investments. 
              Empower your financial future with our collaborative approach.
            </p>
            {isAuthenticated ? (
              <Link to="/dashboard">
                <Button variant="outline" size="lg">
                  Go to Dashboard
                </Button>
              </Link>
            ) : (
              <div className="space-x-4">
                <Link to="/login">
                  <Button size="lg">
                    Sign In
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
        
        {/* Decorative Wave - Extended further to ensure buttons are visible */}
        <div className="absolute bottom-0 left-0 right-0" style={{ transform: 'translateY(25%)' }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" className="w-full h-auto" style={{ minHeight: '140px' }}>
            <path fill="#ffffff" fillOpacity="1" d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,112C672,96,768,96,864,106.7C960,117,1056,139,1152,133.3C1248,128,1344,96,1392,80L1440,64L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
          </svg>
        </div>
      </div>
      
      {/* Features Section - Increased padding at the top to accommodate extended wave */}
      <div className="py-16 md:py-24 bg-white" style={{ paddingTop: '8rem' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need in One Platform
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our comprehensive solution provides all the tools you need to manage your contributions and loans.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-lg shadow-md text-center">
              <div className="flex justify-center mb-4">
                <div className="bg-blue-100 p-3 rounded-full">
                  <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Monthly Contributions</h3>
              <p className="text-gray-600">
                Easily contribute to your investment pool on a monthly basis with secure payment options.
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-lg shadow-md text-center">
              <div className="flex justify-center mb-4">
                <div className="bg-green-100 p-3 rounded-full">
                  <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Member Loans</h3>
              <p className="text-gray-600">
                Apply for loans based on your contribution history with transparent terms and approval processes.
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-lg shadow-md text-center">
              <div className="flex justify-center mb-4">
                <div className="bg-purple-100 p-3 rounded-full">
                  <svg className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">External Investments</h3>
              <p className="text-gray-600">
                Grow your group's wealth through strategic external investments managed by trusted administrators.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* How It Works Section */}
      <div className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How NineFund Works
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our simple yet powerful process makes group investment manageable and secure.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-600 font-bold text-xl mb-4">
                1
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Register</h3>
              <p className="text-gray-600">
                Create your account with secure two-factor authentication.
              </p>
            </div>
            
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-600 font-bold text-xl mb-4">
                2
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Contribute</h3>
              <p className="text-gray-600">
                Make monthly contributions using M-Pesa for seamless transactions.
              </p>
            </div>
            
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-600 font-bold text-xl mb-4">
                3
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Apply for Loans</h3>
              <p className="text-gray-600">
                Request loans up to 80% of your total contributions with just a few clicks.
              </p>
            </div>
            
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-600 font-bold text-xl mb-4">
                4
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Track Growth</h3>
              <p className="text-gray-600">
                Monitor your investments, contributions, and loans with detailed analytics.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* CTA Section */}
      <div className="py-16 md:py-24 bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Begin Your Investment Journey?
          </h2>
          <p className="text-xl mb-8 max-w-3xl mx-auto">
            Join NineFund today and take control of your financial future with our collaborative investment platform.
          </p>
          {isAuthenticated ? (
            <Link to="/dashboard">
              <Button variant="outline" size="lg">
                Go to Dashboard
              </Button>
            </Link>
          ) : (
            <Link to="/login">
              <Button variant="outline" size="lg">
                Get Started
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;