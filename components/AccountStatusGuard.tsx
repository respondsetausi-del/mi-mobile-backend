import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://mi-mobile.preview.emergentagent.com';

export default function AccountStatusGuard({ children }: { children: React.ReactNode }) {
  const [isDeactivated, setIsDeactivated] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  const checkAccountStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const userType = await AsyncStorage.getItem('userType');

      // Only check for regular users, not admins
      if (!token || userType === 'admin') {
        setChecking(false);
        return;
      }

      // Try to fetch user profile to check status
      const response = await fetch(`${API_URL}/api/user/profile`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.status === 403) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.detail || '';
        
        // Check if it's a payment required error
        if (errorMessage.includes('Payment required') || response.headers.get('X-Payment-Required')) {
          console.log('⚠️ Payment required - redirecting to payment page');
          await AsyncStorage.clear();
          router.replace('/payment');
          return;
        }
        
        // Otherwise it's account deactivation
        setIsDeactivated(true);
        setChecking(false);
      } else if (response.ok) {
        const data = await response.json();
        const wasDeactivated = isDeactivated;
        
        // Check payment status
        const paymentStatus = data.payment_status || 'unpaid';
        if (paymentStatus !== 'paid') {
          console.log('⚠️ User not paid - redirecting to payment page');
          await AsyncStorage.clear();
          router.replace('/payment');
          return;
        }
        
        // Check account status
        if (data.status === 'inactive') {
          setIsDeactivated(true);
        } else {
          setIsDeactivated(false);
          
          // If was deactivated and now active, force refresh
          if (wasDeactivated) {
            console.log('Account reactivated! Refreshing...');
            // Small delay to ensure state updates
            setTimeout(() => {
              setChecking(false);
            }, 100);
          }
        }
        setChecking(false);
      } else if (response.status === 401) {
        // Token expired or invalid, logout
        console.log('Token invalid - logging out');
        await AsyncStorage.clear();
        router.replace('/');
      } else if (response.status === 404) {
        // User not found (deleted by admin), force logout
        console.log('⚠️ User account deleted by admin - logging out');
        Alert.alert(
          'Account Deleted',
          'Your account has been deleted by an administrator. Please contact support if this is an error.',
          [
            {
              text: 'OK',
              onPress: async () => {
                await AsyncStorage.clear();
                router.replace('/');
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error checking account status:', error);
      setChecking(false);
    }
  };

  useEffect(() => {
    // Initial check
    checkAccountStatus();

    // Check status every 2 seconds (faster response)
    const interval = setInterval(() => {
      checkAccountStatus();
    }, 2000);

    return () => clearInterval(interval);
  }, [isDeactivated]); // Add isDeactivated to dependencies

  if (checking) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00D9FF" />
      </View>
    );
  }

  if (isDeactivated) {
    return (
      <View style={styles.container}>
        {/* Grayed out content in background */}
        <View style={styles.grayedContent}>
          {children}
        </View>
        
        {/* Overlay with deactivated message */}
        <View style={styles.overlay}>
          <View style={styles.messageBox}>
            <Text style={styles.icon}>🚫</Text>
            <Text style={styles.title}>Account Deactivated</Text>
            <Text style={styles.message}>
              Your account has been deactivated by an administrator.
            </Text>
            <Text style={styles.submessage}>
              Please contact support for assistance.
            </Text>
            <View style={styles.statusIndicator}>
              <ActivityIndicator size="small" color="#888" />
              <Text style={styles.statusText}>Checking status...</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  grayedContent: {
    flex: 1,
    opacity: 0.3,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  messageBox: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ff4444',
    maxWidth: 400,
    width: '100%',
  },
  icon: {
    fontSize: 60,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ff4444',
    marginBottom: 15,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 24,
  },
  submessage: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 30,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
    width: '100%',
    justifyContent: 'center',
  },
  statusText: {
    color: '#888',
    fontSize: 12,
  },
});
