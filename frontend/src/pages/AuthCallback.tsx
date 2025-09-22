import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { setTokens, clearTokens } from '../lib/auth'; // Import auth utilities
import { useAuth } from '@/contexts/AuthContext';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');

    if (accessToken && refreshToken) {
      setTokens(accessToken, refreshToken); // Store both tokens
      login(); // Update auth state
      navigate('/'); // Redirect to home page
    } else {
      // Handle error or no token case
      console.error('Access token or refresh token not found in callback URL query parameters');
      clearTokens(); // Clear any partial tokens
      navigate('/login'); // Redirect to login page on error
    }
  }, [location, navigate, login]);

  return (
    <div>
      <p>로그인 처리 중...</p>
    </div>
  );
};

export default AuthCallback;
