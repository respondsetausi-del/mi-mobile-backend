import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || '';

interface AccountStatusGuardProps {
  children: React.ReactNode;
}

export default function AccountStatusGuard({ children }: AccountStatusGuardProps) {
  const [loading, setLoading] = useState(true);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    checkAccountStatus();
  }, []);

  const checkAccountStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      
      if (!token) {
        router.replace('/');
        return;
      }

      const response = await fetch(`${API_URL}/api/user/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        await AsyncStorage.removeItem('authToken');
        router.replace('/');
        return;
      }

      const data = await response.json();
      
      if (data.status !== 'active' || data.payment_status !== 'paid') {
        router.replace('/waiting-approval');
        return;
      }

      setIsValid(true);
    } catch (error) {
      console.error('Error checking account status:', error);
      router.replace('/');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#00D9FF" />
      </View>
    );
  }

  if (!isValid) {
    return null;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
});
