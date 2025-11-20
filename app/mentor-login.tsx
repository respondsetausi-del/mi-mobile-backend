import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ImageBackground,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 
                'https://mi-indicator.preview.emergentagent.com';

export default function MentorLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);

    try {
      console.log('=== MENTOR LOGIN ATTEMPT ===');
      console.log('API_URL:', API_URL);
      console.log('Email:', email);
      
      const loginUrl = `${API_URL}/api/mentor/login`;
      console.log('Full URL:', loginUrl);
      
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password: password,
        }),
      });

      console.log('Response status:', response.status);

      const data = await response.json();
      console.log('Response data:', data);

      if (response.ok) {
        console.log('Login successful, storing token...');
        
        // Store mentor token and data
        await AsyncStorage.setItem('mentorToken', data.access_token);
        await AsyncStorage.setItem('mentorData', JSON.stringify(data.mentor));
        await AsyncStorage.setItem('userRole', 'mentor');
        
        console.log('Token stored successfully');
        console.log('Redirecting to mentor-dashboard...');
        
        // Direct redirect without alert (alert can block on web)
        router.replace('/mentor-dashboard');
        
      } else {
        console.log('Login failed:', data.detail);
        setLoading(false);
        Alert.alert('Login Failed', data.detail || 'Invalid email or password');
      }
    } catch (error) {
      console.error('Login error:', error);
      console.error('Error message:', error.message);
      setLoading(false);
      Alert.alert('Error', `Connection failed: ${error.message}\n\nPlease check your internet connection.`);
    }
  };

  const handleRegister = () => {
    router.push('/mentor-register');
  };

  const handleBackToMain = () => {
    router.push('/');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=1200' }}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.85)', 'rgba(0,0,0,0.95)']}
          style={styles.gradient}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Back Button */}
              <TouchableOpacity 
                style={styles.backButton}
                onPress={handleBackToMain}
              >
                <Ionicons name="arrow-back" size={24} color="#00D9FF" />
                <Text style={styles.backText}>Back</Text>
              </TouchableOpacity>

              {/* Logo Section */}
              <View style={styles.logoSection}>
                <View style={styles.logoCircle}>
                  <Ionicons name="business" size={60} color="#00D9FF" />
                </View>
                <Text style={styles.logoTitle}>Mentor Portal</Text>
                <Text style={styles.logoSubtitle}>Manage Your Trading Community</Text>
              </View>

              {/* Login Form */}
              <View style={styles.formContainer}>
                <Text style={styles.formTitle}>Welcome Back</Text>
                <Text style={styles.formSubtitle}>Sign in to your mentor account</Text>

                {/* Email Input */}
                <View style={styles.inputContainer}>
                  <Ionicons name="mail" size={20} color="#00D9FF" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Email Address"
                    placeholderTextColor="#666"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                {/* Password Input */}
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed" size={20} color="#00D9FF" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#666"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIcon}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={20}
                      color="#666"
                    />
                  </TouchableOpacity>
                </View>

                {/* Forgot Password */}
                <TouchableOpacity style={styles.forgotPassword}>
                  <Text style={styles.forgotText}>Forgot Password?</Text>
                </TouchableOpacity>

                {/* Login Button */}
                <TouchableOpacity
                  style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                  onPress={handleLogin}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={['#00D9FF', '#0099CC']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.loginGradient}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Text style={styles.loginButtonText}>Sign In</Text>
                        <Ionicons name="arrow-forward" size={20} color="#fff" />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OR</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Register Link */}
                <TouchableOpacity 
                  style={styles.registerLink}
                  onPress={handleRegister}
                >
                  <Text style={styles.registerText}>
                    Don't have an account?{' '}
                    <Text style={styles.registerTextBold}>Apply as Mentor</Text>
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Features Section */}
              <View style={styles.featuresSection}>
                <Text style={styles.featuresTitle}>Mentor Dashboard Features:</Text>
                <View style={styles.featuresList}>
                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                    <Text style={styles.featureText}>Manage Your Users</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                    <Text style={styles.featureText}>Generate License Keys</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                    <Text style={styles.featureText}>Custom Branding</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                    <Text style={styles.featureText}>Real-time Analytics</Text>
                  </View>
                </View>
              </View>

              {/* Footer */}
              <Text style={styles.footer}>
                © 2024 EA Trading Platform. All rights reserved.
              </Text>
            </ScrollView>
          </KeyboardAvoidingView>
        </LinearGradient>
      </ImageBackground>
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
  gradient: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 50,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backText: {
    color: '#00D9FF',
    fontSize: 16,
    marginLeft: 8,
    fontWeight: '600',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0,217,255,0.1)',
    borderWidth: 2,
    borderColor: '#00D9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  logoSubtitle: {
    fontSize: 16,
    color: '#00D9FF',
    opacity: 0.8,
  },
  formContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 25,
    borderWidth: 1,
    borderColor: 'rgba(0,217,255,0.2)',
    marginBottom: 30,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  formSubtitle: {
    fontSize: 14,
    color: '#999',
    marginBottom: 25,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,217,255,0.3)',
    marginBottom: 15,
    paddingHorizontal: 15,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    color: '#fff',
    fontSize: 16,
  },
  eyeIcon: {
    padding: 5,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotText: {
    color: '#00D9FF',
    fontSize: 14,
  },
  loginButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 10,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dividerText: {
    color: '#666',
    paddingHorizontal: 15,
    fontSize: 14,
  },
  registerLink: {
    alignItems: 'center',
  },
  registerText: {
    color: '#999',
    fontSize: 14,
  },
  registerTextBold: {
    color: '#00D9FF',
    fontWeight: 'bold',
  },
  featuresSection: {
    backgroundColor: 'rgba(0,217,255,0.05)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(0,217,255,0.2)',
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00D9FF',
    marginBottom: 15,
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    color: '#fff',
    fontSize: 15,
  },
  footer: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 20,
  },
});
