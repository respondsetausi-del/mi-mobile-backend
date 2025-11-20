import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ConfirmModal from '../components/ConfirmModal';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || '';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState<'success' | 'error'>('error');
  const [redirectAfterModal, setRedirectAfterModal] = useState(false);
  const [redirectPath, setRedirectPath] = useState('/');

  const showModal = (title: string, message: string, type: 'success' | 'error', redirect = false, path = '/') => {
    setModalTitle(title);
    setModalMessage(message);
    setModalType(type);
    setRedirectAfterModal(redirect);
    setRedirectPath(path);
    setModalVisible(true);
  };

  const handleModalClose = () => {
    setModalVisible(false);
    if (redirectAfterModal) {
      router.replace(redirectPath as any);
    }
  };

  const handleResetPassword = async () => {
    // Validation
    if (!email.trim()) {
      showModal('Error', 'Please enter your email address', 'error');
      return;
    }

    if (!licenseKey.trim()) {
      showModal('Error', 'Please enter your license key', 'error');
      return;
    }

    if (!newPassword) {
      showModal('Error', 'Please enter a new password', 'error');
      return;
    }

    if (newPassword.length < 8) {
      showModal('Error', 'Password must be at least 8 characters long', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showModal('Error', 'Passwords do not match', 'error');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showModal('Error', 'Please enter a valid email address', 'error');
      return;
    }

    try {
      setLoading(true);
      console.log('Resetting password for:', email);

      const response = await fetch(`${API_URL}/api/auth/reset-password-license-only`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: email.trim().toLowerCase(),
          license_key: licenseKey.trim().toUpperCase(),
          new_password: newPassword
        }),
      });

      console.log('Password reset response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.access_token) {
          // Store auth data for auto-login
          await AsyncStorage.setItem('authToken', data.access_token);
          await AsyncStorage.setItem('user', JSON.stringify(data.user));
          
          console.log('Auto-login successful, user type:', data.user.user_type);
          
          // Determine redirect path
          const path = data.user.user_type === 'mentor' ? '/mentor-dashboard' : '/(tabs)';
          
          showModal(
            '✅ Password Reset Successful',
            'Your password has been updated. You are now logged in!',
            'success',
            true,
            path
          );
        } else {
          showModal('Error', 'Invalid email or license key combination. Please check and try again.', 'error');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Password reset failed:', errorData);
        showModal('Error', errorData.detail || 'Invalid email or license key. Please verify your credentials.', 'error');
      }
    } catch (error) {
      console.error('Error requesting password reset:', error);
      showModal('Error', 'Failed to connect to server. Please check your connection.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#00D9FF" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <Ionicons name="key-outline" size={80} color="#00D9FF" />
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              Enter your email and license key to verify your identity, then choose a new password.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email Address"
                placeholderTextColor="#666"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                editable={!loading}
              />
            </View>

            {/* License Key Input */}
            <View style={styles.inputContainer}>
              <Ionicons name="key-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="License Key (e.g., XXXX-XXXX-XXXX-XXXX)"
                placeholderTextColor="#666"
                value={licenseKey}
                onChangeText={setLicenseKey}
                autoCapitalize="characters"
                autoComplete="off"
                editable={!loading}
              />
            </View>

            {/* New Password Input */}
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="New Password (min 8 characters)"
                placeholderTextColor="#666"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirm New Password"
                placeholderTextColor="#666"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <Ionicons
                  name={showConfirmPassword ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleResetPassword}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <Ionicons name="shield-checkmark" size={20} color="#000" />
                  <Text style={styles.buttonText}>Reset Password</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Info Box */}
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={24} color="#00D9FF" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoTitle}>How it works:</Text>
                <Text style={styles.infoText}>
                  1. Enter your email address{'\n'}
                  2. Enter your license key (for security){'\n'}
                  3. Choose a new password (min 8 characters){'\n'}
                  4. Confirm your new password{'\n'}
                  5. You'll be automatically logged in!
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Confirmation Modal */}
      <ConfirmModal
        visible={modalVisible}
        title={modalTitle}
        message={modalMessage}
        confirmText="OK"
        cancelText=""
        onConfirm={handleModalClose}
        onCancel={handleModalClose}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
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
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#333',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 56,
    color: '#fff',
    fontSize: 16,
  },
  button: {
    flexDirection: 'row',
    backgroundColor: '#00D9FF',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#00D9FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00D9FF',
  },
  infoTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    color: '#00D9FF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoText: {
    color: '#888',
    fontSize: 14,
    lineHeight: 22,
  },
});
