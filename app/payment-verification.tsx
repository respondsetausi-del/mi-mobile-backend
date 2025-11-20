import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || '';

export default function PaymentVerification() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'checking' | 'success' | 'pending' | 'failed'>('checking');
  const [attempts, setAttempts] = useState(0);
  const maxAttempts = 10;

  useEffect(() => {
    checkPaymentStatus();
  }, []);

  const checkPaymentStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const sessionId = await AsyncStorage.getItem('payment_session_id');

      if (!token || !sessionId) {
        setStatus('failed');
        setLoading(false);
        return;
      }

      const response = await fetch(`${BACKEND_URL}/payment/status/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.payment_status === 'paid') {
        setStatus('success');
        setLoading(false);
        
        // Clear session ID
        await AsyncStorage.removeItem('payment_session_id');
        
        // Redirect to home after 2 seconds
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 2000);
      } else if (attempts < maxAttempts) {
        // Continue polling
        setAttempts(prev => prev + 1);
        setTimeout(checkPaymentStatus, 3000); // Poll every 3 seconds
      } else {
        setStatus('pending');
        setLoading(false);
      }

    } catch (error) {
      console.error('Payment verification error:', error);
      if (attempts < maxAttempts) {
        setAttempts(prev => prev + 1);
        setTimeout(checkPaymentStatus, 3000);
      } else {
        setStatus('failed');
        setLoading(false);
      }
    }
  };

  const handleRetry = () => {
    setLoading(true);
    setStatus('checking');
    setAttempts(0);
    checkPaymentStatus();
  };

  const handleGoBack = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {status === 'checking' && (
          <>
            <ActivityIndicator size="large" color="#00ff88" />
            <Text style={styles.title}>Verifying Payment...</Text>
            <Text style={styles.subtitle}>
              Please wait while we confirm your payment
            </Text>
            <Text style={styles.attemptText}>
              Attempt {attempts + 1} of {maxAttempts}
            </Text>
          </>
        )}

        {status === 'success' && (
          <>
            <Text style={styles.successIcon}>✓</Text>
            <Text style={styles.title}>Payment Successful!</Text>
            <Text style={styles.subtitle}>
              Thank you for your purchase. Redirecting to app...
            </Text>
          </>
        )}

        {status === 'pending' && (
          <>
            <Text style={styles.pendingIcon}>⏳</Text>
            <Text style={styles.title}>Payment Pending</Text>
            <Text style={styles.subtitle}>
              Your payment is being processed. This may take a few moments.
            </Text>
            <TouchableOpacity style={styles.button} onPress={handleRetry}>
              <Text style={styles.buttonText}>Check Again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkButton} onPress={handleGoBack}>
              <Text style={styles.linkText}>Go Back</Text>
            </TouchableOpacity>
          </>
        )}

        {status === 'failed' && (
          <>
            <Text style={styles.errorIcon}>✕</Text>
            <Text style={styles.title}>Verification Failed</Text>
            <Text style={styles.subtitle}>
              Unable to verify your payment. Please try again.
            </Text>
            <TouchableOpacity style={styles.button} onPress={handleRetry}>
              <Text style={styles.buttonText}>Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkButton} onPress={handleGoBack}>
              <Text style={styles.linkText}>Go Back</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e27',
    padding: 20,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#1a1f3a',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#8892b0',
    textAlign: 'center',
    marginBottom: 20,
  },
  attemptText: {
    fontSize: 14,
    color: '#00ff88',
    marginTop: 10,
  },
  successIcon: {
    fontSize: 80,
    color: '#00ff88',
  },
  pendingIcon: {
    fontSize: 80,
    color: '#ffa500',
  },
  errorIcon: {
    fontSize: 80,
    color: '#ff4444',
  },
  button: {
    backgroundColor: '#00ff88',
    paddingVertical: 15,
    paddingHorizontal: 50,
    borderRadius: 12,
    marginTop: 10,
  },
  buttonText: {
    color: '#0a0e27',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkButton: {
    marginTop: 15,
  },
  linkText: {
    color: '#8892b0',
    fontSize: 16,
  },
});
