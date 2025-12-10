import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || '';

interface User {
  _id: string;
  email: string;
  name: string;
  mentor_id: string;
  status: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, mentorId: string, licenseKey: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      console.log('🔐 Checking for stored authentication...');
      const storedToken = await AsyncStorage.getItem('authToken');
      const storedUser = await AsyncStorage.getItem('user');
      
      if (storedToken && storedUser) {
        console.log('✅ Found stored credentials, auto-logging in');
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        console.log('✅ Auto-login successful!');
      } else {
        console.log('ℹ️ No stored credentials found');
      }
    } catch (error) {
      console.error('❌ Error loading stored auth:', error);
      // Clear invalid data
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      console.log('Attempting login for:', email);
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        email,
        password,
      });

      console.log('Login response:', response.data);
      const { access_token, user: userData } = response.data;
      
      await AsyncStorage.setItem('authToken', access_token);
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      
      console.log('Token and user saved, updating state');
      setToken(access_token);
      setUser(userData);
      
      console.log('Login successful!');
    } catch (error: any) {
      console.error('Login error:', error);
      console.error('Error response:', error.response?.data);
      throw new Error(error.response?.data?.detail || 'Login failed');
    }
  };

  const register = async (
    email: string,
    password: string,
    name: string,
    mentorId: string,
    licenseKey: string
  ) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/register`, {
        email,
        password,
        name,
        mentor_id: mentorId,
        license_key: licenseKey,
      });

      const { access_token, user: userData, payment_required, payment_status } = response.data;
      
      await AsyncStorage.setItem('authToken', access_token);
      await AsyncStorage.setItem('token', access_token); // Also store as 'token' for payment endpoints
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      
      setToken(access_token);
      setUser(userData);
      
      // Return response data so register screen can handle payment redirect
      return {
        payment_required,
        payment_status,
        user: userData
      };
    } catch (error: any) {
      console.error('Registration error:', error);
      throw new Error(error.response?.data?.detail || 'Registration failed');
    }
  };

  const logout = async () => {
    try {
      console.log('AuthContext: Starting logout...');
      
      // Clear all storage - get all keys and remove them
      const allKeys = await AsyncStorage.getAllKeys();
      console.log('AuthContext: Found keys:', allKeys);
      await AsyncStorage.multiRemove(allKeys);
      console.log('AuthContext: Cleared all AsyncStorage');
      
      // Clear state
      setToken(null);
      setUser(null);
      console.log('AuthContext: Cleared state');
      
      console.log('AuthContext: Logout complete');
    } catch (error) {
      console.error('AuthContext: Logout error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!token && !!user,
      }}
    >
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
