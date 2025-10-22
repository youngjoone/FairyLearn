import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import useApi from '@/hooks/useApi';
import { clearTokens, setTokens } from '../lib/auth';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

interface AuthContextType {
  isLoggedIn: boolean;
  profile: UserProfile | null;
  login: () => void;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

interface UserProfile {
  id: number;
  email: string;
  nickname: string;
  provider: string;
  role: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const { fetchWithErrorHandler } = useApi();

  const loadProfile = useCallback(async () => {
    try {
      const data = await fetchWithErrorHandler<UserProfile>('/me');
      setProfile(data);
    } catch (error) {
      console.error('Failed to fetch user profile', error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        clearTokens();
        setIsLoggedIn(false);
        setProfile(null);
      }
    }
  }, [fetchWithErrorHandler]);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const { data } = await axios.post(
          `${API_BASE}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        if (data?.accessToken) {
          setTokens(data.accessToken);
          setIsLoggedIn(true);
          await loadProfile();
        } else {
          clearTokens();
          setIsLoggedIn(false);
          setProfile(null);
        }
      } catch (error) {
        clearTokens();
        setIsLoggedIn(false);
        setProfile(null);
      }
    };
    bootstrap();
  }, [loadProfile]);

  const login = useCallback(() => {
    setIsLoggedIn(true);
    loadProfile();
  }, [loadProfile]);

  const logout = useCallback(async () => {
    try {
      await axios.post(`${API_BASE}/auth/logout`, {}, { withCredentials: true });
    } catch (error) {
      console.warn('Failed to revoke refresh token on logout', error);
    } finally {
      clearTokens();
      setIsLoggedIn(false);
      setProfile(null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    await loadProfile();
  }, [loadProfile]);

  return (
    <AuthContext.Provider value={{ isLoggedIn, profile, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
