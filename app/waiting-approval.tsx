import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';

const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || '';

export default function WaitingApproval() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [checking, setChecking] = useState(true);
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    // First verify payment
    if (params.session_id) {
      verifyPayment(params.session_id as string);
    } else {
      checkApprovalStatus();
    }

    // Check approval status every 5 seconds
    const interval = setInterval(() => {
      checkApprovalStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const verifyPayment = async (sessionId: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${BACKEND_URL}/api/payment/status/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.payment_status === 'paid') {
        console.log('✅ Payment verified successfully! Granting immediate access...');
        setApproved(true);
        setChecking(false);
        
        // Show success message then redirect immediately
        Alert.alert(
          '🎉 Payment Successful!',
          'Your payment has been processed. Welcome to MI Mobile Indicator!',
          [
            {
              text: 'Continue',
              onPress: () => router.replace('/(tabs)')
            }
          ]
        );
      }
    } catch (error) {
      console.error('Payment verification error:', error);
    }
  };

  const checkApprovalStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/');
        return;
      }

      // Check user status by getting user profile
      const profileResponse = await fetch(`${BACKEND_URL}/api/user/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        
        // If payment is complete and status is active, grant immediate access
        if (profileData.payment_status === 'paid' && profileData.status === 'active') {
          console.log('✅ User has paid and is active - granting access');
          setApproved(true);
          setChecking(false);
          
          // Redirect to home after showing success message
          setTimeout(() => {
            router.replace('/(tabs)');
          }, 1500);
        }
      }
    } catch (error) {
      console.error('Approval check error:', error);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.clear();
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {!approved ? (
          <>
            <View style={styles.iconContainer}>
              <Ionicons name="hourglass-outline" size={80} color="#00D9FF" />
            </View>
            
            <Text style={styles.title}>Account Activation</Text>
            <Text style={styles.subtitle}>Verifying Your Access</Text>
            
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                Your payment has been successfully processed! 
              </Text>
              <Text style={styles.infoText} style={{marginTop: 16}}>
                Your account is being activated automatically. This usually takes just a few seconds.
              </Text>
              <Text style={styles.infoText} style={{marginTop: 16}}>
                ✅ Payment Confirmed
                {'\n'}🔄 Activating Account...
              </Text>
            </View>

            <View style={styles.statusContainer}>
              <ActivityIndicator size="small" color="#00D9FF" />
              <Text style={styles.statusText}>Checking approval status...</Text>
            </View>

            <View style={styles.stepContainer}>
              <View style={styles.step}>
                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                <Text style={styles.stepText}>✅ Payment Completed</Text>
              </View>
              <View style={styles.step}>
                <Ionicons name="refresh-circle" size={24} color="#00D9FF" />
                <Text style={styles.stepText}>🔄 Activating Account</Text>
              </View>
              <View style={styles.step}>
                <Ionicons name="home-outline" size={24} color="#666" />
                <Text style={styles.stepTextInactive}>Access App</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.iconContainer}>
              <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
            </View>
            
            <Text style={styles.successTitle}>Account Approved! 🎉</Text>
            <Text style={styles.successSubtitle}>
              Redirecting you to the app...
            </Text>
            
            <ActivityIndicator size="large" color="#4CAF50" style={{marginTop: 20}} />
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
    padding: 30,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#8892b0',
    marginBottom: 30,
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.3)',
  },
  infoText: {
    fontSize: 14,
    color: '#ccd6f6',
    lineHeight: 22,
    textAlign: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    gap: 10,
  },
  statusText: {
    fontSize: 14,
    color: '#8892b0',
  },
  stepContainer: {
    width: '100%',
    marginBottom: 30,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  stepText: {
    fontSize: 16,
    color: '#ccd6f6',
    fontWeight: '500',
  },
  stepTextInactive: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: '#333',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#555',
  },
  logoutButtonText: {
    color: '#ccd6f6',
    fontSize: 14,
    fontWeight: '600',
  },
  successTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 10,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 16,
    color: '#8892b0',
    textAlign: 'center',
  },
});
