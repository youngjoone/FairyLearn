import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import useApi from '@/hooks/useApi';
import { getAccess, clearTokens } from '../lib/auth';

interface AuthContextType {
  isLoggedIn: boolean;
  profile: UserProfile | null;
  login: () => void;
  logout: () => void;
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
    const token = getAccess();
    setIsLoggedIn(!!token);
    if (token) {
      loadProfile();
    }
  }, [loadProfile]);

  const login = useCallback(() => {
    setIsLoggedIn(true);
    loadProfile();
  }, [loadProfile]);

  const logout = useCallback(() => {
    clearTokens();
    setIsLoggedIn(false);
    setProfile(null);
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
