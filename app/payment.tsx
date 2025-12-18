import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { StripeProvider, useStripe } from '@stripe/stripe-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';

const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || '';
const STRIPE_PUBLISHABLE_KEY = Constants.expoConfig?.extra?.STRIPE_PUBLISHABLE_KEY || process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

// Debug logging
console.log('Payment Screen - Stripe Key:', STRIPE_PUBLISHABLE_KEY ? `${STRIPE_PUBLISHABLE_KEY.substring(0, 20)}...` : 'NOT SET');
console.log('Payment Screen - Backend URL:', BACKEND_URL);

function PaymentContent() {
  const router = useRouter();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  const initializePaymentSheet = async () => {
    try {
      setLoading(true);
      
      // Get token
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Please login first');
        router.replace('/');
        return;
      }

      // Create payment intent on backend
      const response = await fetch(`${BACKEND_URL}/api/payment/create-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to initialize payment');
      }

      const data = await response.json();

      // Initialize payment sheet
      const { error } = await initPaymentSheet({
        merchantDisplayName: 'MI Mobile Indicator',
        paymentIntentClientSecret: data.client_secret,
        defaultBillingDetails: {
          email: data.customer_email
        },
        returnURL: 'mi-mobile-indicator://payment-success',
        appearance: {
          colors: {
            primary: '#6366f1',
            background: '#ffffff',
            componentBackground: '#f9fafb',
          },
          shapes: {
            borderRadius: 12,
          },
        }
      });

      if (error) {
        console.error('Error initializing payment sheet:', error);
        Alert.alert('Error', error.message);
        return;
      }

      setReady(true);
    } catch (error: any) {
      console.error('Payment initialization error:', error);
      Alert.alert('Error', error.message || 'Failed to initialize payment');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initializePaymentSheet();
  }, []);

  const handlePayment = async () => {
    if (!ready) {
      Alert.alert('Please wait', 'Payment is still initializing...');
      return;
    }

    setLoading(true);

    const { error } = await presentPaymentSheet();

    if (error) {
      setLoading(false);
      if (error.code !== 'Canceled') {
        Alert.alert('Payment Failed', error.message);
      }
      return;
    }

    // Payment successful
    Alert.alert(
      'Payment Successful! 🎉',
      'Your account has been activated. You now have full access to all features!',
      [
        {
          text: 'Continue',
          onPress: () => {
            router.replace('/payment-verification');
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment</Text>
        <View style={styles.backButton} />
      </View>

      {/* Plan Card */}
      <View style={styles.planCard}>
        <View style={styles.planHeader}>
          <Ionicons name="star" size={32} color="#f59e0b" />
          <Text style={styles.planTitle}>Lifetime Access</Text>
        </View>
        
        <View style={styles.priceContainer}>
          <Text style={styles.currency}>$</Text>
          <Text style={styles.price}>35</Text>
          <Text style={styles.pricePeriod}>.00</Text>
        </View>

        <View style={styles.featuresContainer}>
          <Text style={styles.featuresTitle}>What's Included:</Text>
          
          <View style={styles.feature}>
            <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            <Text style={styles.featureText}>Real-time forex trading signals</Text>
          </View>
          
          <View style={styles.feature}>
            <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            <Text style={styles.featureText}>Economic news & calendar</Text>
          </View>
          
          <View style={styles.feature}>
            <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            <Text style={styles.featureText}>Recommended broker links</Text>
          </View>
          
          <View style={styles.feature}>
            <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            <Text style={styles.featureText}>Priority support</Text>
          </View>
          
          <View style={styles.feature}>
            <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            <Text style={styles.featureText}>Lifetime updates</Text>
          </View>
        </View>
      </View>

      {/* Security Badge */}
      <View style={styles.securityBadge}>
        <Ionicons name="shield-checkmark" size={20} color="#6366f1" />
        <Text style={styles.securityText}>Secured by Stripe</Text>
      </View>

      {/* Pay Button */}
      <TouchableOpacity
        style={[styles.payButton, (!ready || loading) && styles.payButtonDisabled]}
        onPress={handlePayment}
        disabled={!ready || loading}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <>
            <Ionicons name="card" size={20} color="#ffffff" />
            <Text style={styles.payButtonText}>
              {ready ? 'Pay Now - $35.00' : 'Initializing...'}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* Terms */}
      <Text style={styles.terms}>
        By completing this purchase, you agree to our Terms of Service and Privacy Policy. 
        Payment is processed securely through Stripe.
      </Text>
    </ScrollView>
  );
}

export default function PaymentNativeScreen() {
  if (!STRIPE_PUBLISHABLE_KEY) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#ef4444" />
        <Text style={styles.errorText}>Stripe configuration missing</Text>
      </View>
    );
  }

  return (
    <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
      <PaymentContent />
    </StripeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  contentContainer: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  planCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  planTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  currency: {
    fontSize: 32,
    fontWeight: '700',
    color: '#6366f1',
    marginTop: 8,
  },
  price: {
    fontSize: 64,
    fontWeight: '800',
    color: '#6366f1',
    lineHeight: 64,
  },
  pricePeriod: {
    fontSize: 24,
    fontWeight: '600',
    color: '#6366f1',
    marginTop: 8,
  },
  featuresContainer: {
    gap: 12,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 15,
    color: '#4b5563',
    flex: 1,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  securityText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
  },
  payButton: {
    backgroundColor: '#6366f1',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  payButtonDisabled: {
    backgroundColor: '#9ca3af',
    shadowColor: '#9ca3af',
  },
  payButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  terms: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 18,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    fontWeight: '600',
  },
});
