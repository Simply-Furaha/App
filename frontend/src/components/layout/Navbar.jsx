import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { logout } from '../../features/auth/authSlice';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { user, isAuthenticated } = useSelector(state => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <nav className="bg-blue-600 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link to="/" className="text-white font-bold text-xl">NineFund</Link>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                {isAuthenticated ? (
                  <>
                    <Link to="/dashboard" className="text-white hover:bg-blue-500 px-3 py-2 rounded-md font-medium">
                      Dashboard
                    </Link>
                    <Link to="/loans" className="text-white hover:bg-blue-500 px-3 py-2 rounded-md font-medium">
                      Loans
                    </Link>
                    <Link to="/contributions" className="text-white hover:bg-blue-500 px-3 py-2 rounded-md font-medium">
                      Contributions
                    </Link>
                    {user?.is_admin && (
                      <Link to="/admin" className="text-white hover:bg-blue-500 px-3 py-2 rounded-md font-medium">
                        Admin Panel
                      </Link>
                    )}
                  </>
                ) : (
                  <>
                    <Link to="/login" className="text-white hover:bg-blue-500 px-3 py-2 rounded-md font-medium">
                      Login
                    </Link>
                    <Link to="/#" className="text-white hover:bg-blue-500 px-3 py-2 rounded-md font-medium">
                      Contact Admin to Register
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {isAuthenticated && (
            <div className="hidden md:block">
              <div className="ml-4 flex items-center md:ml-6">
                <div className="ml-3 relative">
                  <div>
                    <button
                      onClick={() => setIsProfileOpen(!isProfileOpen)}
                      className="max-w-xs bg-blue-500 rounded-full flex items-center text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-blue-600 focus:ring-white"
                    >
                      <span className="sr-only">Open user menu</span>
                      <div className="h-8 w-8 rounded-full bg-blue-300 flex items-center justify-center text-blue-700 font-semibold">
                        {user?.first_name?.charAt(0) || 'U'}
                      </div>
                    </button>
                  </div>
                  
                  {isProfileOpen && (
                    <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                      <div className="px-4 py-2 text-xs text-gray-500">
                        Signed in as <span className="font-semibold">{user?.username}</span>
                      </div>
                      <Link
                        to="/profile"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        Your Profile
                      </Link>
                      <button
                        onClick={() => {
                          setIsProfileOpen(false);
                          handleLogout();
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <div className="-mr-2 flex md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="bg-blue-500 inline-flex items-center justify-center p-2 rounded-md text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-blue-600 focus:ring-white"
            >
              <span className="sr-only">Open main menu</span>
              <svg
                className={`${isMenuOpen ? 'hidden' : 'block'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <svg
                className={`${isMenuOpen ? 'block' : 'hidden'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      <div className={`${isMenuOpen ? 'block' : 'hidden'} md:hidden`}>
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          {isAuthenticated ? (
            <>
              <Link 
                to="/dashboard" 
                className="text-white hover:bg-blue-500 block px-3 py-2 rounded-md font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link 
                to="/loans" 
                className="text-white hover:bg-blue-500 block px-3 py-2 rounded-md font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Loans
              </Link>
              <Link 
                to="/contributions" 
                className="text-white hover:bg-blue-500 block px-3 py-2 rounded-md font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Contributions
              </Link>
              {user?.is_admin && (
                <Link 
                  to="/admin" 
                  className="text-white hover:bg-blue-500 block px-3 py-2 rounded-md font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Admin Panel
                </Link>
              )}
            </>
          ) : (
            <>
              <Link 
                to="/login" 
                className="text-white hover:bg-blue-500 block px-3 py-2 rounded-md font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Login
              </Link>
              <Link 
                to="/" 
                className="text-white hover:bg-blue-500 block px-3 py-2 rounded-md font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Contact Admin to Register
              </Link>
            </>
          )}
        </div>
        
        {isAuthenticated && (
          <div className="pt-4 pb-3 border-t border-blue-700">
            <div className="flex items-center px-5">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-blue-300 flex items-center justify-center text-blue-700 font-semibold">
                  {user?.first_name?.charAt(0) || 'U'}
                </div>
              </div>
              <div className="ml-3">
                <div className="text-base font-medium leading-none text-white">
                  {user?.first_name} {user?.last_name}
                </div>
                <div className="text-sm font-medium leading-none text-blue-200">
                  {user?.email}
                </div>
              </div>
            </div>
            <div className="mt-3 px-2 space-y-1">
              <Link
                to="/profile"
                className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-blue-500"
                onClick={() => setIsMenuOpen(false)}
              >
                Your Profile
              </Link>
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  handleLogout();
                }}
                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-white hover:bg-blue-500"
              >
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;