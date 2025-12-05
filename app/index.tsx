import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  ImageBackground,
} from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import ConfirmModal from '../components/ConfirmModal';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || '';

// Axios instance with timeout for faster failures
const apiClient = axios.create({
  timeout: 15000, // 15 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState({ title: '', message: '' });
  const router = useRouter();

  // Debug logs in useEffect to prevent render loop
  useEffect(() => {
    console.log('=== LOGIN SCREEN LOADED ===');
    console.log('API_URL:', API_URL);
  }, []);

  const handleLogin = async () => {
    console.log('>>> handleLogin CALLED <<<');
    console.log('Email:', email);
    console.log('Password length:', password ? password.length : 0);
    console.log('isAdmin:', isAdmin);
    console.log('loading:', loading);
    
    // Trim email and password to remove any whitespace
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    
    if (!trimmedEmail || !trimmedPassword) {
      console.log('>>> Validation failed - missing fields <<<');
      setErrorMessage({ title: 'Error', message: 'Please fill in all fields' });
      setShowErrorModal(true);
      return;
    }

    console.log('>>> Setting loading = true <<<');
    setLoading(true);

    try {
      console.log('>>> Attempting login... <<<');
      console.log('Login type:', isAdmin ? 'admin' : 'user');
      console.log('Email (trimmed):', trimmedEmail);
      console.log('Password length (trimmed):', trimmedPassword.length);

      const endpoint = isAdmin ? '/api/admin/login' : '/api/auth/login';
      const url = `${API_URL}${endpoint}`;
      console.log('Login URL:', url);

      // Retry logic for backend wake-up (Render free tier)
      let response;
      let retryCount = 0;
      const maxRetries = 2;
      
      while (retryCount <= maxRetries) {
        try {
          response = await apiClient.post(url, {
            email: trimmedEmail,
            password: trimmedPassword,
          });
          // Success - break out of retry loop
          break;
        } catch (error: any) {
          retryCount++;
          console.log(`Login attempt ${retryCount} failed`);
          
          if (retryCount <= maxRetries && (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK' || error.message?.includes('timeout'))) {
            // Backend might be waking up, retry with longer timeout
            console.log('Backend may be sleeping, retrying with extended timeout...');
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
            
            // Create new client with longer timeout for retry
            const retryClient = axios.create({
              timeout: 60000, // 60 seconds for wake-up
              headers: { 'Content-Type': 'application/json' },
            });
            
            response = await retryClient.post(url, {
              email: trimmedEmail,
              password: trimmedPassword,
            });
            break;
          } else {
            // Not a timeout/network error or max retries reached
            throw error;
          }
        }
      }

      console.log('Login response:', response.status);
      console.log('Response data keys:', Object.keys(response.data));

      const { access_token, user_type, user, requires_password_change, requires_payment, status, payment_status } = response.data;
      
      console.log('Login response data:', { user_type, status, payment_status, requires_payment });
      
      // Store all auth data
      await AsyncStorage.setItem('authToken', access_token);
      await AsyncStorage.setItem('token', access_token);
      await AsyncStorage.setItem('userType', user_type || (isAdmin ? 'admin' : 'user'));
      
      if (user) {
        await AsyncStorage.setItem('userData', JSON.stringify(user));
      }
      
      // Ensure all data is persisted before navigation
      await AsyncStorage.flushGetRequests();
      
      if (requires_password_change && !isAdmin) {
        router.replace('/change-password');
        return;
      }
      
      console.log('User type check:', { user_type, isAdmin });
      
      if (user_type === 'admin' || isAdmin) {
        console.log('✓ Admin user detected - Token stored, navigating to /admin');
        
        // Small delay to ensure AsyncStorage has persisted
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Verify token is stored
        const verifyToken = await AsyncStorage.getItem('authToken');
        console.log('✓ Token verified before navigation:', verifyToken ? 'YES' : 'NO');
        
        try {
          router.replace('/admin');
          console.log('✓ Navigation to /admin called');
        } catch (navError) {
          console.error('✗ Navigation error:', navError);
        }
      } else {
        // User login - check payment and status
        console.log('=== USER LOGIN ROUTING DEBUG ===');
        console.log('status:', status, 'type:', typeof status);
        console.log('payment_status:', payment_status, 'type:', typeof payment_status);
        console.log('requires_payment:', requires_payment, 'type:', typeof requires_payment);
        
        // Priority 1: Check if user has paid (regardless of status)
        if (payment_status === 'paid') {
          console.log('✅ CONDITION MET: payment_status === "paid"');
          console.log('✅ Redirecting to home page /(tabs)');
          router.replace('/(tabs)');
        }
        // Priority 2: Check if payment is required
        else if (requires_payment === true || payment_status === 'unpaid') {
          console.log('💳 CONDITION MET: requires_payment or unpaid');
          console.log('💳 Redirecting to payment page');
          router.replace('/payment');
        }
        // Priority 3: Handle edge cases
        else {
          console.log('❌ NO CONDITIONS MET - Edge case');
          console.log('Status:', { status, payment_status, requires_payment });
          setErrorMessage({ title: 'Account Status', message: 'Your account is not active. Please contact support.' });
          setShowErrorModal(true);
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);
      console.error('Error response:', error.response?.data);
      setErrorMessage({
        title: 'Login Failed',
        message: error.response?.data?.detail || 'Invalid credentials'
      });
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const goToMentorLogin = () => {
    router.push('/mentor-login');
  };

  const goToRegister = () => {
    router.push('/register');
  };

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../assets/images/wallpaper.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover"
        imageStyle={{ opacity: 0.3 }}
      >
        <View style={styles.overlay} />
        <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>MI</Text>
          <Text style={styles.slogan}>Mobile Indicator</Text>
          <Text style={styles.subtitle}>EA Trading Management Platform</Text>
        </View>

        {/* Login Type Toggle */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, !isAdmin && styles.toggleButtonActive]}
            onPress={() => setIsAdmin(false)}
          >
            <Text style={[styles.toggleText, !isAdmin && styles.toggleTextActive]}>
              User Login
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, isAdmin && styles.toggleButtonActive]}
            onPress={() => setIsAdmin(true)}
          >
            <Text style={[styles.toggleText, isAdmin && styles.toggleTextActive]}>
              Admin Login
            </Text>
          </TouchableOpacity>
        </View>

        {/* Login Form */}
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#666"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#666"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? "eye-outline" : "eye-off-outline"}
                size={20}
                color="#666"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>Login</Text>
            )}
          </TouchableOpacity>

          {!isAdmin && (
            <>
              <TouchableOpacity 
                onPress={goToRegister}
                style={styles.createAccountButton}
              >
                <Text style={styles.createAccountText}>Create Account</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={goToMentorLogin}>
                <Text style={styles.mentorLinkText}>Mentor Portal →</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.legalLinks}>
            <TouchableOpacity onPress={() => router.push('/legal/privacy-policy')}>
              <Text style={styles.legalLinkText}>Privacy Policy</Text>
            </TouchableOpacity>
            <Text style={styles.legalSeparator}>•</Text>
            <TouchableOpacity onPress={() => router.push('/legal/terms-and-conditions')}>
              <Text style={styles.legalLinkText}>Terms & Conditions</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.footerText}>© 2025 MI. All rights reserved.</Text>
        </View>
      </View>
      </ImageBackground>

      {/* Error Modal */}
      <ConfirmModal
        visible={showErrorModal}
        title={errorMessage.title}
        message={errorMessage.message}
        onConfirm={() => setShowErrorModal(false)}
        confirmText="OK"
        showCancel={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#00D9FF',
    marginBottom: 4,
    letterSpacing: 8,
  },
  slogan: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8892b0',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
  },
  toggleContainer: {
    flexDirection: 'row',
    marginBottom: 30,
    backgroundColor: '#111',
    borderRadius: 8,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  toggleButtonActive: {
    backgroundColor: '#00D9FF',
  },
  toggleText: {
    color: '#8892b0',
    fontSize: 14,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#0a0e27',
  },
  form: {
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1f3a',
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 50,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  loginButton: {
    backgroundColor: '#00D9FF',
    borderRadius: 8,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  loginButtonText: {
    color: '#0a0e27',
    fontSize: 16,
    fontWeight: 'bold',
  },
  createAccountButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#00D9FF',
    borderRadius: 8,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  createAccountText: {
    color: '#00D9FF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  mentorLinkText: {
    color: '#00D9FF',
    textAlign: 'center',
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  legalLinkText: {
    color: '#00D9FF',
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  legalSeparator: {
    color: '#666',
    fontSize: 12,
    marginHorizontal: 8,
  },
  footerText: {
    color: '#666',
    fontSize: 12,
  },
});
