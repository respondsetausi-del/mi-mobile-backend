import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || '';

export default function PaymentScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    try {
      setLoading(true);
      console.log('🔄 Starting payment process...');

      // Get token
      const token = await AsyncStorage.getItem('token');
      console.log('Token exists:', !!token);
      
      if (!token) {
        Alert.alert('Error', 'Please login first');
        router.replace('/');
        return;
      }

      // Construct proper URLs
      // BACKEND_URL is the base (e.g., https://mi-indicator.preview.emergentagent.com)
      const baseUrl = BACKEND_URL;
      const apiUrl = `${baseUrl}/api`;
      const originUrl = baseUrl; // For Stripe redirect URLs
      
      console.log('Base URL:', baseUrl);
      console.log('API URL:', apiUrl);
      console.log('Origin URL:', originUrl);

      // Call backend to create checkout session
      console.log('Creating checkout session...');
      const response = await fetch(`${apiUrl}/payment/create-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          origin_url: originUrl
        })
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const data = await response.json();
        console.error('Error response:', data);
        
        // Specific error handling
        if (response.status === 401) {
          Alert.alert(
            'Session Expired',
            'Your login session has expired. Please login again.',
            [
              {
                text: 'Login',
                onPress: async () => {
                  await AsyncStorage.clear();
                  router.replace('/');
                }
              }
            ]
          );
          return;
        }
        
        throw new Error(data.detail || 'Failed to create payment session');
      }
      
      const data = await response.json();

      console.log('Checkout URL:', data.url);
      console.log('Session ID:', data.session_id);

      // Open Stripe checkout in browser
      const supported = await Linking.canOpenURL(data.url);
      console.log('Can open URL:', supported);
      
      if (supported) {
        console.log('Opening Stripe checkout...');
        await Linking.openURL(data.url);
        
        // Store session ID for later verification
        await AsyncStorage.setItem('payment_session_id', data.session_id);
        console.log('Session ID stored');
        
        Alert.alert(
          'Payment Started ✅',
          'Complete your payment in the browser. Return to the app after payment.',
          [
            {
              text: 'Check Payment Status',
              onPress: () => router.push('/payment-verification')
            },
            {
              text: 'Cancel',
              style: 'cancel'
            }
          ]
        );
      } else {
        console.error('Cannot open URL');
        Alert.alert('Error', 'Cannot open payment URL');
      }

    } catch (error: any) {
      console.error('Payment error:', error);
      Alert.alert(
        'Payment Error',
        `${error.message || 'Failed to initiate payment'}\n\nPlease check the console for details.`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Required Payment Banner */}
      <View style={styles.requiredBanner}>
        <Text style={styles.requiredText}>⚠️ PAYMENT REQUIRED TO ACTIVATE ACCOUNT</Text>
      </View>
      
      <View style={styles.card}>
        <Text style={styles.title}>🔒 Lifetime Access</Text>
        <Text style={styles.subtitle}>Complete your payment to access the app</Text>
        
        <View style={styles.priceContainer}>
          <Text style={styles.currency}>$</Text>
          <Text style={styles.price}>35</Text>
          <Text style={styles.period}>one-time</Text>
        </View>

        <View style={styles.featuresContainer}>
          <Text style={styles.featureTitle}>What's Included:</Text>
          <View style={styles.feature}>
            <Text style={styles.checkmark}>✓</Text>
            <Text style={styles.featureText}>Unlimited EA Trading Access</Text>
          </View>
          <View style={styles.feature}>
            <Text style={styles.checkmark}>✓</Text>
            <Text style={styles.featureText}>Real-time Market Signals</Text>
          </View>
          <View style={styles.feature}>
            <Text style={styles.checkmark}>✓</Text>
            <Text style={styles.featureText}>Expert Advisor Configuration</Text>
          </View>
          <View style={styles.feature}>
            <Text style={styles.checkmark}>✓</Text>
            <Text style={styles.featureText}>Technical Indicators & Analysis</Text>
          </View>
          <View style={styles.feature}>
            <Text style={styles.checkmark}>✓</Text>
            <Text style={styles.featureText}>Lifetime Updates & Support</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.payButton, loading && styles.payButtonDisabled]}
          onPress={handlePayment}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.payButtonText}>Continue to Payment</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.secureText}>🔒 Secure payment powered by Stripe</Text>
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
  requiredBanner: {
    backgroundColor: '#ff4444',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#fff',
  },
  requiredText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#1a1f3a',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#8892b0',
    marginBottom: 30,
    textAlign: 'center',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 30,
  },
  currency: {
    fontSize: 36,
    color: '#00ff88',
    fontWeight: 'bold',
    marginTop: 5,
  },
  price: {
    fontSize: 72,
    color: '#00ff88',
    fontWeight: 'bold',
    marginHorizontal: 5,
  },
  period: {
    fontSize: 18,
    color: '#8892b0',
    alignSelf: 'flex-end',
    marginBottom: 10,
  },
  featuresContainer: {
    width: '100%',
    marginBottom: 30,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 15,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkmark: {
    fontSize: 20,
    color: '#00ff88',
    marginRight: 12,
    fontWeight: 'bold',
  },
  featureText: {
    fontSize: 16,
    color: '#ccd6f6',
  },
  payButton: {
    backgroundColor: '#00ff88',
    paddingVertical: 18,
    paddingHorizontal: 60,
    borderRadius: 12,
    marginBottom: 15,
    width: '100%',
    alignItems: 'center',
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    color: '#0a0e27',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secureText: {
    fontSize: 14,
    color: '#8892b0',
    marginTop: 10,
  },
});
