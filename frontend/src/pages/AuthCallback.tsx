import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { setTokens, clearTokens, getAccess } from '../lib/auth'; // Import auth utilities
import { useAuth } from '@/contexts/AuthContext';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    // Assuming 'refresh' token might also be passed if needed in the future
    // const refreshToken = params.get('refresh');

    if (token) {
      setTokens(token); // Store access token
      login(); // Update auth state
      console.log('saved', getAccess()); // Defensive logging
      navigate('/'); // Redirect to home page
    } else {
      // Handle error or no token case
      console.error('No token found in callback URL');
      clearTokens(); // Clear any partial tokens
      navigate('/login-error'); // Or some error page
    }
  }, [location, navigate, login]);

  return (
    <div>
      <p>로그인 처리 중...</p>
    </div>
  );
};

export default AuthCallback;
