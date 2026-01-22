import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../services/api';

export default function MCPAuthorize() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  
  const [status, setStatus] = useState('loading'); // loading, ready, success, error, denied
  const [error, setError] = useState(null);
  
  const code = searchParams.get('code');

  useEffect(() => {
    if (!code) {
      setStatus('error');
      setError('Invalid authorization link. No code provided.');
      return;
    }

    if (!isAuthenticated) {
      // Redirect to login with return URL
      navigate(`/login?redirect=/mcp-authorize?code=${code}`);
      return;
    }

    setStatus('ready');
  }, [code, isAuthenticated, navigate]);

  const handleApprove = async () => {
    try {
      setStatus('loading');
      
      await api.post('/mcp-auth/approve', { code });
      
      setStatus('success');
      
      // Auto-close after 3 seconds
      setTimeout(() => {
        window.close();
      }, 3000);
      
    } catch (err) {
      setStatus('error');
      setError(err.response?.data?.message || 'Failed to authorize. Please try again.');
    }
  };

  const handleDeny = async () => {
    try {
      await api.post('/mcp-auth/deny', { code });
      setStatus('denied');
      
      setTimeout(() => {
        window.close();
      }, 2000);
      
    } catch (err) {
      // Even if deny fails, show denied status
      setStatus('denied');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        {/* Logo/Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-2xl flex items-center justify-center shadow-lg">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>

        {/* Loading State */}
        {status === 'loading' && (
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Processing...</p>
          </div>
        )}

        {/* Ready State - Show Authorization Request */}
        {status === 'ready' && (
          <>
            <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">
              Authorize Cursor AI
            </h1>
            <p className="text-gray-500 text-center mb-6">
              Cursor AI wants to access your Flipkart Minutes account
            </p>

            {/* User Info */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-gray-500 mb-1">Logged in as</p>
              <p className="font-semibold text-gray-800">{user?.name}</p>
              <p className="text-sm text-gray-600">{user?.email}</p>
            </div>

            {/* Permissions */}
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-3">This will allow Cursor to:</p>
              <ul className="space-y-2">
                {[
                  'Search products in your area',
                  'Add items to your cart',
                  'View your saved addresses',
                  'Place orders on your behalf',
                ].map((permission, i) => (
                  <li key={i} className="flex items-center text-sm text-gray-600">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {permission}
                  </li>
                ))}
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleApprove}
                className="w-full py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-xl transition-colors"
              >
                Authorize
              </button>
              <button
                onClick={handleDeny}
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
              >
                Deny
              </button>
            </div>

            <p className="text-xs text-gray-400 text-center mt-4">
              You can revoke access anytime from your account settings
            </p>
          </>
        )}

        {/* Success State */}
        {status === 'success' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Authorized!</h2>
            <p className="text-gray-600 mb-4">
              Cursor AI is now connected to your account.
            </p>
            <p className="text-sm text-gray-400">This window will close automatically...</p>
          </div>
        )}

        {/* Denied State */}
        {status === 'denied' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Access Denied</h2>
            <p className="text-gray-600">
              You denied the authorization request.
            </p>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => window.close()}
              className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
            >
              Close Window
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
