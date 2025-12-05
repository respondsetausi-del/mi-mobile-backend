import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  Image,
  FlatList,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Slider from '@react-native-community/slider';
import Constants from 'expo-constants';
import * as Clipboard from 'expo-clipboard';
import InputModal from '../components/InputModal';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || '';

export default function MentorDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mentorData, setMentorData] = useState(null);
  const [users, setUsers] = useState([]);
  const [licenses, setLicenses] = useState([]);
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [buttonLoading, setButtonLoading] = useState({});
  
  // Password reset modal states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [tempPasswordData, setTempPasswordData] = useState({ email: '', password: '' });
  
  // License generation modal state
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  
  // Branding states
  const [editingSystemName, setEditingSystemName] = useState(false);
  const [systemNameInput, setSystemNameInput] = useState('');
  const [editingBackground, setEditingBackground] = useState(false);
  const [selectedBgImage, setSelectedBgImage] = useState(null);
  const [selectedBgColor, setSelectedBgColor] = useState({ r: 0, g: 0, b: 0 });
  const [uploadingImage, setUploadingImage] = useState(false);

  // Manual Signal Sending states
  const [showSignalForm, setShowSignalForm] = useState(false);
  const [signalForm, setSignalForm] = useState({
    symbol: '',
    signal_type: 'BUY',
    indicator: '',
    candle_pattern: '',
    timeframe: '1H',
    notes: '',
    duration_seconds: 30, // Default 30 seconds
  });
  const [sendingSignal, setSendingSignal] = useState(false);

  // Manual News Event states
  const [showNewsForm, setShowNewsForm] = useState(false);
  const [newsForm, setNewsForm] = useState({
    title: '',
    event_time: '',
    currency: '',
    impact: 'High',
    description: '',
    signal: '',
  });
  const [sendingNews, setSendingNews] = useState(false);

  // News Management states
  const [upcomingNews, setUpcomingNews] = useState([]);
  const [loadingNews, setLoadingNews] = useState(false);
  const [updatingSignal, setUpdatingSignal] = useState({});

  // Custom Indicator states
  const [showIndicatorSection, setShowIndicatorSection] = useState(false);
  const [customIndicators, setCustomIndicators] = useState([]);
  const [loadingIndicators, setLoadingIndicators] = useState(false);
  const [showAddIndicator, setShowAddIndicator] = useState(false);
  const [newIndicator, setNewIndicator] = useState({
    name: '',
    description: '',
    symbol: 'EURUSD',
    timeframe: '1H',
    indicators: [],
    buy_conditions: [],
    sell_conditions: [],
  });
  const [creatingIndicator, setCreatingIndicator] = useState(false);
  const [updatingIndicatorSignal, setUpdatingIndicatorSignal] = useState({});
  
  // Indicator configuration states
  const [selectedIndicatorType, setSelectedIndicatorType] = useState('');
  const [indicatorParams, setIndicatorParams] = useState({});
  const [showIndicatorConfig, setShowIndicatorConfig] = useState(false);

  useEffect(() => {
    checkAuth();
    
    // Check status every 3 seconds
    const interval = setInterval(() => {
      checkMentorStatus();
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);
  
  const checkMentorStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('mentorToken');
      if (!token) return;
      
      const response = await fetch(`${API_URL}/api/mentor/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (response.status === 403) {
        // Mentor deactivated
        Alert.alert(
          '🚫 Account Deactivated',
          'Your mentor account has been deactivated by an administrator. You will be logged out.',
          [
            {
              text: 'OK',
              onPress: async () => {
                await AsyncStorage.removeItem('mentorToken');
                router.replace('/mentor-login');
              }
            }
          ]
        );
      } else if (response.status === 401) {
        // Token expired
        await AsyncStorage.removeItem('mentorToken');
        router.replace('/mentor-login');
      }
    } catch (error) {
      console.error('Error checking mentor status:', error);
    }
  };

  const checkAuth = async () => {
    const token = await AsyncStorage.getItem('mentorToken');
    if (!token) {
      router.replace('/mentor-login');
      return;
    }
    loadDashboard();
  };

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('mentorToken');

      // Load dashboard stats and mentor info
      const statsResponse = await fetch(`${API_URL}/api/mentor/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!statsResponse.ok) {
        if (statsResponse.status === 401 || statsResponse.status === 403) {
          await AsyncStorage.removeItem('mentorToken');
          router.replace('/mentor-login');
          return;
        }
        throw new Error('Failed to load dashboard');
      }

      const statsData = await statsResponse.json();
      setMentorData(statsData);
      setSystemNameInput(statsData.mentor?.system_name || '');
      
      // Load background settings
      const mentor = statsData.mentor;
      if (mentor?.background_image) {
        setSelectedBgImage(mentor.background_image);
      }
      if (mentor?.background_color) {
        const match = mentor.background_color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (match) {
          setSelectedBgColor({
            r: parseInt(match[1]),
            g: parseInt(match[2]),
            b: parseInt(match[3])
          });
        }
      }

      // Load users
      const usersResponse = await fetch(`${API_URL}/api/mentor/users`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData.users || []);
      }

      // Load licenses
      const licensesResponse = await fetch(`${API_URL}/api/mentor/licenses`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (licensesResponse.ok) {
        const licensesData = await licensesResponse.json();
        setLicenses(licensesData.licenses || []);
      }

      // Load upcoming news
      fetchUpcomingNews();

      // Load custom indicators
      loadCustomIndicators();

    } catch (error) {
      console.error('Error loading dashboard:', error);
      Alert.alert('Error', 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('mentorToken');
    await AsyncStorage.removeItem('mentorData');
    router.replace('/mentor-login');
  };

  // Send Manual Signal (to mentor's users only)
  const sendSignal = async () => {
    if (!signalForm.symbol || !signalForm.indicator || !signalForm.candle_pattern) {
      Alert.alert('Validation Error', 'Please fill in all required fields (Symbol, Indicator, Candle Pattern)');
      return;
    }

    setSendingSignal(true);
    try {
      const token = await AsyncStorage.getItem('mentorToken');
      const response = await fetch(`${API_URL}/api/mentor/send-signal`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(signalForm),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Success', `Signal sent successfully to ${data.recipient_count} of your users!`);
        setShowSignalForm(false);
        setSignalForm({
          symbol: '',
          signal_type: 'BUY',
          indicator: '',
          candle_pattern: '',
          timeframe: '1H',
          notes: '',
          duration_seconds: 30,
        });
      } else {
        throw new Error(data.detail || 'Failed to send signal');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to send signal');
    } finally {
      setSendingSignal(false);
    }
  };

  // Send Manual News (to mentor's users only)
  const sendManualNews = async () => {
    if (!newsForm.title.trim()) {
      Alert.alert('Validation Error', 'Please enter a news title');
      return;
    }

    setSendingNews(true);
    try {
      const token = await AsyncStorage.getItem('mentorToken');
      
      // Only include non-empty fields in the payload
      const payload = { title: newsForm.title.trim() };
      
      if (newsForm.event_time.trim()) payload.event_time = newsForm.event_time.trim();
      if (newsForm.currency.trim()) payload.currency = newsForm.currency.trim();
      if (newsForm.impact) payload.impact = newsForm.impact;
      if (newsForm.description.trim()) payload.description = newsForm.description.trim();
      if (newsForm.signal) payload.signal = newsForm.signal;

      const response = await fetch(`${API_URL}/api/mentor/send-manual-news`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Success', `News event sent successfully to ${data.recipient_count} of your users!`);
        setShowNewsForm(false);
        setNewsForm({
          title: '',
          event_time: '',
          currency: '',
          impact: 'High',
          description: '',
          signal: '',
        });
      } else {
        throw new Error(data.detail || 'Failed to send news event');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to send news event');
    } finally {
      setSendingNews(false);
    }
  };

  // Custom Indicator Functions
  const loadCustomIndicators = async () => {
    setLoadingIndicators(true);
    try {
      const token = await AsyncStorage.getItem('mentorToken');
      const response = await fetch(`${API_URL}/api/mentor/indicators`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (response.ok) {
        setCustomIndicators(data.indicators || []);
      } else {
        throw new Error(data.detail || 'Failed to load indicators');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to load indicators');
    } finally {
      setLoadingIndicators(false);
    }
  };

  const createIndicator = async () => {
    if (!newIndicator.name.trim()) {
      Alert.alert('Validation Error', 'Please enter an indicator name');
      return;
    }

    if (!selectedIndicatorType) {
      Alert.alert('Validation Error', 'Please select an indicator type');
      return;
    }

    setCreatingIndicator(true);
    try {
      const token = await AsyncStorage.getItem('mentorToken');
      
      // Build indicator configuration
      const indicatorConfig = {
        indicator_type: selectedIndicatorType,
        ...indicatorParams
      };

      // Build buy/sell conditions based on indicator type
      let buyConditions = [];
      let sellConditions = [];

      if (selectedIndicatorType === 'RSI') {
        buyConditions.push({
          condition_type: 'BELOW',
          indicator_ref: 'RSI',
          value: indicatorParams.oversold || 30
        });
        sellConditions.push({
          condition_type: 'ABOVE',
          indicator_ref: 'RSI',
          value: indicatorParams.overbought || 70
        });
      } else if (selectedIndicatorType === 'MACD') {
        buyConditions.push({
          condition_type: 'CROSS_ABOVE',
          indicator_ref: 'MACD',
          value: 0
        });
        sellConditions.push({
          condition_type: 'CROSS_BELOW',
          indicator_ref: 'MACD',
          value: 0
        });
      } else if (selectedIndicatorType === 'MA' || selectedIndicatorType === 'EMA') {
        buyConditions.push({
          condition_type: 'CROSS_ABOVE',
          indicator_ref: selectedIndicatorType,
          value: 0
        });
        sellConditions.push({
          condition_type: 'CROSS_BELOW',
          indicator_ref: selectedIndicatorType,
          value: 0
        });
      } else if (selectedIndicatorType === 'BOLLINGER') {
        buyConditions.push({
          condition_type: 'BELOW',
          indicator_ref: 'BOLLINGER_LOWER',
          value: 0
        });
        sellConditions.push({
          condition_type: 'ABOVE',
          indicator_ref: 'BOLLINGER_UPPER',
          value: 0
        });
      } else if (selectedIndicatorType === 'STOCHASTIC') {
        buyConditions.push({
          condition_type: 'BELOW',
          indicator_ref: 'STOCHASTIC',
          value: indicatorParams.oversold || 20
        });
        sellConditions.push({
          condition_type: 'ABOVE',
          indicator_ref: 'STOCHASTIC',
          value: indicatorParams.overbought || 80
        });
      }

      const payload = {
        name: newIndicator.name.trim(),
        description: newIndicator.description.trim(),
        symbol: newIndicator.symbol,
        timeframe: newIndicator.timeframe,
        indicators: [indicatorConfig],
        buy_conditions: buyConditions,
        sell_conditions: sellConditions
      };

      const response = await fetch(`${API_URL}/api/mentor/create-indicator`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (response.ok) {
        Alert.alert('Success', 'Indicator created successfully! Click START to begin monitoring.');
        setNewIndicator({ name: '', description: '', symbol: 'EURUSD', timeframe: '1H', indicators: [], buy_conditions: [], sell_conditions: [] });
        setSelectedIndicatorType('');
        setIndicatorParams({});
        setShowAddIndicator(false);
        loadCustomIndicators(); // Reload list
      } else {
        throw new Error(data.detail || 'Failed to create indicator');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to create indicator');
    } finally {
      setCreatingIndicator(false);
    }
  };

  const updateIndicatorSignal = async (indicatorId, signal) => {
    setUpdatingIndicatorSignal(prev => ({ ...prev, [indicatorId]: true }));
    try {
      const token = await AsyncStorage.getItem('mentorToken');
      const response = await fetch(`${API_URL}/api/mentor/update-indicator-signal`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ indicator_id: indicatorId, signal }),
      });

      const data = await response.json();
      if (response.ok) {
        Alert.alert('Success', `Signal updated to ${signal}. Notified ${data.users_notified} users.`);
        loadCustomIndicators(); // Reload to show updated signal
      } else {
        throw new Error(data.detail || 'Failed to update signal');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update signal');
    } finally {
      setUpdatingIndicatorSignal(prev => ({ ...prev, [indicatorId]: false }));
    }
  };

  const sendManualOverride = async (indicatorId, signal, indicatorName) => {
    Alert.alert(
      'Confirm Manual Override',
      `Send ${signal} signal to ALL users subscribed to "${indicatorName}"?\n\nThis will override automatic signal generation.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Send ${signal}`,
          style: 'default',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('mentorToken');
              const response = await fetch(`${API_URL}/api/mentor/manual-override-signal`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                  indicator_id: indicatorId, 
                  signal: signal 
                }),
              });

              const data = await response.json();
              if (response.ok) {
                Alert.alert(
                  'Success!', 
                  `${signal} signal sent to ${data.users_notified} subscriber(s)!\n\n${data.subscriptions_affected} subscription(s) affected.`
                );
              } else {
                throw new Error(data.detail || 'Failed to send override signal');
              }
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to send override signal');
            }
          },
        },
      ]
    );
  };

  const deleteIndicator = async (indicatorId) => {
    console.log('🗑️ Delete button clicked for indicator:', indicatorId);
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this indicator? Users following it will be unlinked.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️ Confirmed delete for:', indicatorId);
              const token = await AsyncStorage.getItem('mentorToken');
              console.log('🗑️ Token retrieved:', token ? 'exists' : 'missing');
              
              const url = `${API_URL}/api/mentor/delete-indicator/${indicatorId}`;
              console.log('🗑️ DELETE URL:', url);
              
              const response = await fetch(url, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
              });

              console.log('🗑️ Response status:', response.status);
              const data = await response.json();
              console.log('🗑️ Response data:', data);
              
              if (response.ok) {
                Alert.alert('Success', 'Indicator deleted successfully');
                await loadCustomIndicators(); // Reload list
              } else {
                throw new Error(data.detail || 'Failed to delete indicator');
              }
            } catch (error) {
              console.error('🗑️ Delete error:', error);
              Alert.alert('Error', error.message || 'Failed to delete indicator');
            }
          },
        },
      ]
    );
  };

  const toggleIndicatorRunning = async (indicatorId, currentStatus) => {
    try {
      const token = await AsyncStorage.getItem('mentorToken');
      const response = await fetch(`${API_URL}/api/mentor/toggle-indicator/${indicatorId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (response.ok) {
        const statusText = data.is_running ? 'STARTED' : 'STOPPED';
        Alert.alert('Success', `Indicator ${statusText}. ${data.is_running ? 'Now visible to users.' : 'Hidden from users.'}`);
        loadCustomIndicators(); // Reload list
      } else {
        throw new Error(data.detail || 'Failed to toggle indicator');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to toggle indicator');
    }
  };




  // Broker functions removed


  // Fetch Upcoming News for mentor to add signals
  const fetchUpcomingNews = async () => {
    setLoadingNews(true);
    try {
      const token = await AsyncStorage.getItem('mentorToken');
      const response = await fetch(`${API_URL}/api/mentor/upcoming-news`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setUpcomingNews(data.news || []);
      }
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setLoadingNews(false);
    }
  };

  // Update signal on a news event
  const updateNewsSignal = async (newsId, signal) => {
    setUpdatingSignal(prev => ({ ...prev, [newsId]: true }));
    try {
      const token = await AsyncStorage.getItem('mentorToken');
      const response = await fetch(`${API_URL}/api/mentor/news/${newsId}/signal`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ signal }),
      });

      if (response.ok) {
        Alert.alert('✅ Success', `Signal ${signal || 'removed'} updated successfully`);
        await fetchUpcomingNews(); // Refresh news list
      } else {
        Alert.alert('Error', 'Failed to update signal');
      }
    } catch (error) {
      console.error('Error updating signal:', error);
      Alert.alert('Error', 'Failed to update signal');
    } finally {
      setUpdatingSignal(prev => ({ ...prev, [newsId]: false }));
    }
  };

  // Broker-related functions removed

  const activateUser = async (userId, userName) => {
    console.log('Activate user button pressed:', userId, userName);
    
    Alert.alert(
      'Activate User?',
      `Activate ${userName} to grant them access to the app?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Activate',
          onPress: async () => {
            try {
              console.log('Proceeding with user activation...');
              const token = await AsyncStorage.getItem('mentorToken');
              
              const response = await fetch(`${API_URL}/api/mentor/users/${userId}/activate`, {
                method: 'POST',
                headers: { 
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
              });

              console.log('Activate response status:', response.status);

              if (response.ok) {
                Alert.alert('✅ Success', `${userName} has been activated`);
                loadDashboard();
              } else {
                const errorData = await response.json().catch(() => ({}));
                console.error('Activation failed:', errorData);
                Alert.alert('Failed', errorData.detail || 'Failed to activate user');
              }
            } catch (error) {
              console.error('Error activating user:', error);
              Alert.alert('Error', `Failed to activate user: ${error.message}`);
            }
          }
        }
      ]
    );
  };

  const deactivateUser = async (userId, userName) => {
    console.log('Deactivate user button pressed:', userId, userName);
    
    Alert.alert(
      'Deactivate User?',
      `Deactivate ${userName}? They will lose access to the app.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Proceeding with user deactivation...');
              const token = await AsyncStorage.getItem('mentorToken');
              
              const response = await fetch(`${API_URL}/api/mentor/users/${userId}/deactivate`, {
                method: 'POST',
                headers: { 
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
              });

              console.log('Deactivate response status:', response.status);

              if (response.ok) {
                Alert.alert('✅ Success', `${userName} has been deactivated`);
                loadDashboard();
              } else {
                const errorData = await response.json().catch(() => ({}));
                console.error('Deactivation failed:', errorData);
                Alert.alert('Failed', errorData.detail || 'Failed to deactivate user');
              }
            } catch (error) {
              console.error('Error deactivating user:', error);
              Alert.alert('Error', `Failed to deactivate user: ${error.message}`);
            }
          }
        }
      ]
    );
  };

  const resetPassword = async (userId, userName, userEmail) => {
    console.log('Reset password button pressed for user:', userId, userName);
    
    const buttonKey = `reset-${userId}`;
    setButtonLoading(prev => ({...prev, [buttonKey]: true}));
    
    try {
      console.log('Proceeding with password reset...');
      const token = await AsyncStorage.getItem('mentorToken');
      
      if (!token) {
        Alert.alert('❌ Error', 'Authentication token not found. Please login again.');
        setButtonLoading(prev => ({...prev, [buttonKey]: false}));
        return;
      }
      
      console.log('Calling reset password API for user:', userId);
      const response = await fetch(`${API_URL}/api/mentor/users/${userId}/reset-password`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      console.log('Reset password response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Password reset successful:', data);
        
        // Show temporary password in modal
        setTempPasswordData({
          email: userEmail || data.user_email,
          password: data.temporary_password,
          userName: userName
        });
        setShowPasswordModal(true);
        
        loadDashboard(); // Refresh dashboard
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Password reset failed:', response.status, errorData);
        Alert.alert(
          '❌ Reset Failed',
          errorData.detail || `Failed with status ${response.status}. Please try again.`
        );
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      Alert.alert('❌ Network Error', `Failed to reset password: ${error.message}\n\nPlease check your connection and try again.`);
    } finally {
      setButtonLoading(prev => ({...prev, [buttonKey]: false}));
    }
  };

  const generateLicenses = async (countStr: string) => {
    try {
      const count = parseInt(countStr) || 10;
      if (count < 1 || count > 100) {
        Alert.alert('Error', 'Please enter a number between 1 and 100');
        return;
      }

      const token = await AsyncStorage.getItem('mentorToken');
      const response = await fetch(`${API_URL}/api/mentor/licenses/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ count }),
      });

      if (response.ok) {
        Alert.alert('Success', `Generated ${count} license keys`);
        loadDashboard();
      } else {
        const error = await response.json();
        Alert.alert('Error', error.detail || 'Failed to generate licenses');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to generate licenses');
    }
  };

  const updateSystemName = async () => {
    try {
      const token = await AsyncStorage.getItem('mentorToken');
      const response = await fetch(`${API_URL}/api/mentor/branding/system-name`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ system_name: systemNameInput }),
      });

      if (response.ok) {
        Alert.alert('Success', 'System name updated');
        setEditingSystemName(false);
        loadDashboard();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update system name');
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant photo library permissions');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const base64Image = `data:${result.assets[0].mimeType || 'image/jpeg'};base64,${result.assets[0].base64}`;
      setSelectedBgImage(base64Image);
    }
  };

  const saveBackground = async () => {
    try {
      setUploadingImage(true);
      const token = await AsyncStorage.getItem('mentorToken');
      
      const bgColorString = `rgb(${selectedBgColor.r}, ${selectedBgColor.g}, ${selectedBgColor.b})`;
      
      const response = await fetch(`${API_URL}/api/mentor/branding/background`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          background_image: selectedBgImage,
          background_color: bgColorString
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Background settings saved');
        setEditingBackground(false);
        loadDashboard();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save background');
    } finally {
      setUploadingImage(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00D9FF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Mentor ID */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Mentor Portal</Text>
          <View style={styles.mentorIdBadge}>
            <Ionicons name="business" size={16} color="#00D9FF" />
            <Text style={styles.mentorIdText}>{mentorData?.mentor?.mentor_id || '...'}</Text>
          </View>
          <Text style={styles.companyName}>{mentorData?.mentor?.company_name}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out" size={24} color="#ff4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadDashboard} tintColor="#00D9FF" />
        }
      >
        {/* Stats Summary */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Ionicons name="people" size={24} color="#00D9FF" />
            <Text style={styles.statNumber}>{mentorData?.total_users || 0}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </View>
          <View style={styles.statBox}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            <Text style={styles.statNumber}>{mentorData?.active_users || 0}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statBox}>
            <Ionicons name="time" size={24} color="#FF9800" />
            <Text style={styles.statNumber}>{mentorData?.pending_users || 0}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statBox}>
            <Ionicons name="key" size={24} color="#9C27B0" />
            <Text style={styles.statNumber}>
              {mentorData?.used_licenses}/{mentorData?.total_licenses}
            </Text>
            <Text style={styles.statLabel}>Licenses</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionButton} onPress={() => setShowLicenseModal(true)}>
            <Ionicons name="add-circle" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Generate Keys</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#9C27B0' }]} 
            onPress={() => setEditingBackground(true)}
          >
            <Ionicons name="brush" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Branding</Text>
          </TouchableOpacity>
        </View>

        {/* Users List */}
        <View style={styles.usersSection}>
          <Text style={styles.sectionTitle}>
            📋 Registered Users ({users.length})
          </Text>

          {users.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={64} color="#333" />
              <Text style={styles.emptyStateText}>No users registered yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Share your Mentor ID and License Keys to onboard users
              </Text>
            </View>
          ) : (
            users.map((user) => (
              <View key={user._id} style={styles.userCard}>
                <TouchableOpacity
                  onPress={() => setExpandedUserId(expandedUserId === user._id ? null : user._id)}
                  style={styles.userCardHeader}
                >
                  <View style={styles.userInfo}>
                    <View style={styles.userNameRow}>
                      <Text style={styles.userName}>{user.name}</Text>
                      <View style={[
                        styles.statusBadge, 
                        { 
                          backgroundColor: 
                            user.status === 'active' ? '#4CAF50' : 
                            user.status === 'pending' ? '#FF9800' : '#666'
                        }
                      ]}>
                        <Text style={styles.statusText}>{user.status}</Text>
                      </View>
                    </View>
                    <Text style={styles.userEmail}>{user.email}</Text>
                  </View>
                  <Ionicons 
                    name={expandedUserId === user._id ? 'chevron-up' : 'chevron-down'} 
                    size={24} 
                    color="#00D9FF" 
                  />
                </TouchableOpacity>
                
                {expandedUserId === user._id && (
                  <View style={styles.userDetails}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Email:</Text>
                      <Text style={styles.detailValue}>{user.email}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>License Key:</Text>
                      <Text style={styles.detailValue}>{user.license_key || 'N/A'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Status:</Text>
                      <Text style={[
                        styles.detailValue,
                        { color: user.status === 'active' ? '#4CAF50' : '#FF9800' }
                      ]}>
                        {user.status}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Registered:</Text>
                      <Text style={styles.detailValue}>
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                      </Text>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.userActions}>
                      {user.status === 'pending' && (
                        <TouchableOpacity
                          style={styles.activateBtn}
                          onPress={() => activateUser(user._id, user.name)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="checkmark-circle" size={18} color="#fff" />
                          <Text style={styles.actionBtnText}>Activate</Text>
                        </TouchableOpacity>
                      )}
                      {user.status === 'active' && (
                        <TouchableOpacity
                          style={styles.deactivateBtn}
                          onPress={() => deactivateUser(user._id, user.name)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="close-circle" size={18} color="#fff" />
                          <Text style={styles.actionBtnText}>Deactivate</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={[styles.resetBtn, buttonLoading[`reset-${user._id}`] && styles.buttonDisabled]}
                        onPress={() => resetPassword(user._id, user.name, user.email)}
                        disabled={buttonLoading[`reset-${user._id}`]}
                        activeOpacity={0.7}
                      >
                        {buttonLoading[`reset-${user._id}`] ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <Ionicons name="key" size={18} color="#fff" />
                            <Text style={styles.actionBtnText}>Reset Password</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            ))
          )}
        </View>

        {/* License Keys Section */}
        <View style={styles.licensesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🔑 License Keys</Text>
            <Text style={styles.licensesCount}>
              {mentorData?.used_licenses || 0} / {mentorData?.total_licenses || 0} Used
            </Text>
          </View>
          
          <View style={styles.licensesList}>
            {licenses.slice(0, 5).map((license) => (
              <View key={license._id} style={styles.licenseItem}>
                <Text style={styles.licenseKey}>{license.key}</Text>
                <View style={styles.licenseActions}>
                  <TouchableOpacity
                    style={styles.licenseCopyButton}
                    onPress={async () => {
                      await Clipboard.setStringAsync(license.key);
                      Alert.alert('✅ Copied', 'License key copied to clipboard!');
                    }}
                  >
                    <Ionicons name="copy-outline" size={18} color="#00D9FF" />
                  </TouchableOpacity>
                  <View style={[
                    styles.licenseBadge,
                    { backgroundColor: license.used ? '#4CAF50' : '#333' }
                  ]}>
                    <Text style={styles.licenseBadgeText}>
                      {license.used ? 'Used' : 'Available'}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
          
          {licenses.length > 5 && (
            <Text style={styles.moreText}>
              + {licenses.length - 5} more licenses
            </Text>
          )}
        </View>

        {/* MANUAL SIGNAL SENDING */}
        <View style={[styles.section, { paddingLeft: 20 }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📊 Send Trading Signal</Text>
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => setShowSignalForm(!showSignalForm)}
            >
              <Ionicons 
                name={showSignalForm ? "chevron-up" : "chevron-down"} 
                size={20} 
                color="#00D9FF" 
              />
            </TouchableOpacity>
          </View>

          {showSignalForm && (
            <View style={styles.formContainer}>
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Symbol *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. EURUSD"
                  placeholderTextColor="#666"
                  value={signalForm.symbol}
                  onChangeText={(text) => setSignalForm(prev => ({ ...prev, symbol: text.toUpperCase() }))}
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Signal Type *</Text>
                <View style={styles.segmentedControl}>
                  <TouchableOpacity
                    style={[styles.segmentButton, signalForm.signal_type === 'BUY' && styles.segmentButtonActive]}
                    onPress={() => setSignalForm(prev => ({ ...prev, signal_type: 'BUY' }))}
                  >
                    <Text style={[styles.segmentText, signalForm.signal_type === 'BUY' && styles.segmentTextActive]}>
                      BUY
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.segmentButton, signalForm.signal_type === 'SELL' && styles.segmentButtonActive]}
                    onPress={() => setSignalForm(prev => ({ ...prev, signal_type: 'SELL' }))}
                  >
                    <Text style={[styles.segmentText, signalForm.signal_type === 'SELL' && styles.segmentTextActive]}>
                      SELL
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Indicator *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. RSI, MACD, MA"
                  placeholderTextColor="#666"
                  value={signalForm.indicator}
                  onChangeText={(text) => setSignalForm(prev => ({ ...prev, indicator: text }))}
                />
              </View>

              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Candle Pattern *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Doji, Hammer"
                  placeholderTextColor="#666"
                  value={signalForm.candle_pattern}
                  onChangeText={(text) => setSignalForm(prev => ({ ...prev, candle_pattern: text }))}
                />
              </View>

              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Timeframe</Text>
                <View style={styles.timeframeButtons}>
                  {['1H', '4H', '1D', '1W'].map(tf => (
                    <TouchableOpacity
                      key={tf}
                      style={[styles.timeframeBtn, signalForm.timeframe === tf && styles.timeframeBtnActive]}
                      onPress={() => setSignalForm(prev => ({ ...prev, timeframe: tf }))}
                    >
                      <Text style={[styles.timeframeText, signalForm.timeframe === tf && styles.timeframeTextActive]}>
                        {tf}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Notes (Optional)</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Additional information..."
                  placeholderTextColor="#666"
                  value={signalForm.notes}
                  onChangeText={(text) => setSignalForm(prev => ({ ...prev, notes: text }))}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <TouchableOpacity
                style={[styles.sendSignalBtn, sendingSignal && styles.buttonDisabled]}
                onPress={sendSignal}
                disabled={sendingSignal}
              >
                {sendingSignal ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="paper-plane" size={20} color="#fff" />
                    <Text style={styles.sendSignalBtnText}>Send Signal to My Users</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* MANUAL NEWS EVENT */}
        <View style={[styles.section, { paddingLeft: 20 }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📰 Send News Event</Text>
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => setShowNewsForm(!showNewsForm)}
            >
              <Ionicons 
                name={showNewsForm ? "chevron-up" : "chevron-down"} 
                size={20} 
                color="#00D9FF" 
              />
            </TouchableOpacity>
          </View>

          {showNewsForm && (
            <View style={styles.formContainer}>
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Title *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. US NFP Data Release"
                  placeholderTextColor="#666"
                  value={newsForm.title}
                  onChangeText={(text) => setNewsForm(prev => ({ ...prev, title: text }))}
                />
              </View>

              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Event Time (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 14:30 UTC, 3:00 PM EST"
                  placeholderTextColor="#666"
                  value={newsForm.event_time}
                  onChangeText={(text) => setNewsForm(prev => ({ ...prev, event_time: text }))}
                />
              </View>

              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Currency Pair (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. USD, EUR, GBP"
                  placeholderTextColor="#666"
                  value={newsForm.currency}
                  onChangeText={(text) => setNewsForm(prev => ({ ...prev, currency: text.toUpperCase() }))}
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Impact (Optional)</Text>
                <View style={styles.impactButtons}>
                  {['High', 'Medium', 'Low'].map(level => (
                    <TouchableOpacity
                      key={level}
                      style={[
                        styles.impactBtn,
                        newsForm.impact === level && styles.impactBtnActive,
                        level === 'High' && newsForm.impact === level && styles.impactBtnHigh,
                        level === 'Medium' && newsForm.impact === level && styles.impactBtnMedium,
                        level === 'Low' && newsForm.impact === level && styles.impactBtnLow,
                      ]}
                      onPress={() => setNewsForm(prev => ({ ...prev, impact: level }))}
                    >
                      <Text style={[
                        styles.impactText,
                        newsForm.impact === level && styles.impactTextActive
                      ]}>
                        {level}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Signal (Optional)</Text>
                <View style={styles.segmentedControl}>
                  <TouchableOpacity
                    style={[
                      styles.segmentButton, 
                      newsForm.signal === '' && styles.segmentButtonActive
                    ]}
                    onPress={() => setNewsForm(prev => ({ ...prev, signal: '' }))}
                  >
                    <Text style={[
                      styles.segmentText, 
                      newsForm.signal === '' && styles.segmentTextActive
                    ]}>
                      None
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.segmentButton, 
                      newsForm.signal === 'BUY' && styles.segmentButtonActive
                    ]}
                    onPress={() => setNewsForm(prev => ({ ...prev, signal: 'BUY' }))}
                  >
                    <Text style={[
                      styles.segmentText, 
                      newsForm.signal === 'BUY' && styles.segmentTextActive
                    ]}>
                      BUY
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.segmentButton, 
                      newsForm.signal === 'SELL' && styles.segmentButtonActive
                    ]}
                    onPress={() => setNewsForm(prev => ({ ...prev, signal: 'SELL' }))}
                  >
                    <Text style={[
                      styles.segmentText, 
                      newsForm.signal === 'SELL' && styles.segmentTextActive
                    ]}>
                      SELL
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Description (Optional)</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Additional information about this event..."
                  placeholderTextColor="#666"
                  value={newsForm.description}
                  onChangeText={(text) => setNewsForm(prev => ({ ...prev, description: text }))}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <TouchableOpacity
                style={[styles.sendSignalBtn, sendingNews && styles.buttonDisabled]}
                onPress={sendManualNews}
                disabled={sendingNews}
              >
                {sendingNews ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="megaphone" size={20} color="#fff" />
                    <Text style={styles.sendSignalBtnText}>Send News to My Users</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* CUSTOM INDICATORS MANAGEMENT */}
        <View style={[styles.section, { paddingLeft: 20 }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📊 Custom Indicators ({customIndicators.length})</Text>
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => setShowIndicatorSection(!showIndicatorSection)}
            >
              <Ionicons 
                name={showIndicatorSection ? "chevron-up" : "chevron-down"} 
                size={20} 
                color="#00D9FF" 
              />
            </TouchableOpacity>
          </View>

          {showIndicatorSection && (
            <View style={styles.formContainer}>
              {/* Add New Indicator Button */}
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowAddIndicator(!showAddIndicator)}
              >
                <Ionicons name="add-circle" size={24} color="#00D9FF" />
                <Text style={styles.addButtonText}>Create New Indicator</Text>
              </TouchableOpacity>

              {/* Add Indicator Form */}
              {showAddIndicator && (
                <View style={[styles.formContainer, { marginTop: 16, padding: 16, backgroundColor: '#0a0e27', borderRadius: 8, borderWidth: 1, borderColor: '#00D9FF' }]}>
                  <Text style={[styles.sectionTitle, { fontSize: 16, marginBottom: 12 }]}>📊 Configure Trading Indicator</Text>
                  
                  {/* Basic Info */}
                  <View style={styles.inputRow}>
                    <Text style={styles.inputLabel}>Indicator Name *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. RSI Oversold Strategy"
                      placeholderTextColor="#666"
                      value={newIndicator.name}
                      onChangeText={(text) => setNewIndicator(prev => ({ ...prev, name: text }))}
                    />
                  </View>

                  <View style={styles.inputRow}>
                    <Text style={styles.inputLabel}>Description (Optional)</Text>
                    <TextInput
                      style={[styles.textInput, styles.textArea]}
                      placeholder="Describe your strategy..."
                      placeholderTextColor="#666"
                      value={newIndicator.description}
                      onChangeText={(text) => setNewIndicator(prev => ({ ...prev, description: text }))}
                      multiline
                      numberOfLines={2}
                    />
                  </View>

                  {/* Symbol Selection */}
                  <View style={styles.inputRow}>
                    <Text style={styles.inputLabel}>Trading Symbol *</Text>
                    <View style={styles.symbolButtons}>
                      {['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD'].map(symbol => (
                        <TouchableOpacity
                          key={symbol}
                          style={[
                            styles.symbolBtn,
                            newIndicator.symbol === symbol && styles.symbolBtnActive
                          ]}
                          onPress={() => setNewIndicator(prev => ({ ...prev, symbol }))}
                        >
                          <Text style={[
                            styles.symbolText,
                            newIndicator.symbol === symbol && styles.symbolTextActive
                          ]}>
                            {symbol}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Timeframe Selection */}
                  <View style={styles.inputRow}>
                    <Text style={styles.inputLabel}>Timeframe *</Text>
                    <View style={styles.timeframeButtons}>
                      {['5M', '15M', '1H', '4H', '1D'].map(tf => (
                        <TouchableOpacity
                          key={tf}
                          style={[
                            styles.timeframeBtn,
                            newIndicator.timeframe === tf && styles.timeframeBtnActive
                          ]}
                          onPress={() => setNewIndicator(prev => ({ ...prev, timeframe: tf }))}
                        >
                          <Text style={[
                            styles.timeframeText,
                            newIndicator.timeframe === tf && styles.timeframeTextActive
                          ]}>
                            {tf}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Indicator Type Selection */}
                  <View style={styles.inputRow}>
                    <Text style={styles.inputLabel}>Select Indicator Type *</Text>
                    <View style={styles.indicatorTypeGrid}>
                      {['RSI', 'MACD', 'MA', 'EMA', 'BOLLINGER', 'STOCHASTIC'].map(type => (
                        <TouchableOpacity
                          key={type}
                          style={[
                            styles.indicatorTypeBtn,
                            selectedIndicatorType === type && styles.indicatorTypeBtnActive
                          ]}
                          onPress={() => setSelectedIndicatorType(type)}
                        >
                          <Text style={[
                            styles.indicatorTypeText,
                            selectedIndicatorType === type && styles.indicatorTypeTextActive
                          ]}>
                            {type}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* RSI Configuration */}
                  {selectedIndicatorType === 'RSI' && (
                    <View style={[styles.configSection, { marginTop: 12 }]}>
                      <Text style={styles.configTitle}>RSI Settings</Text>
                      <View style={styles.inputRow}>
                        <Text style={styles.inputLabel}>Period</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="14"
                          placeholderTextColor="#666"
                          keyboardType="numeric"
                          value={indicatorParams.period?.toString() || '14'}
                          onChangeText={(text) => setIndicatorParams(prev => ({ ...prev, period: parseInt(text) || 14 }))}
                        />
                      </View>
                      <View style={styles.inputRow}>
                        <Text style={styles.inputLabel}>Oversold Level (BUY below)</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="30"
                          placeholderTextColor="#666"
                          keyboardType="numeric"
                          value={indicatorParams.oversold?.toString() || '30'}
                          onChangeText={(text) => setIndicatorParams(prev => ({ ...prev, oversold: parseInt(text) || 30 }))}
                        />
                      </View>
                      <View style={styles.inputRow}>
                        <Text style={styles.inputLabel}>Overbought Level (SELL above)</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="70"
                          placeholderTextColor="#666"
                          keyboardType="numeric"
                          value={indicatorParams.overbought?.toString() || '70'}
                          onChangeText={(text) => setIndicatorParams(prev => ({ ...prev, overbought: parseInt(text) || 70 }))}
                        />
                      </View>
                    </View>
                  )}

                  {/* MACD Configuration */}
                  {selectedIndicatorType === 'MACD' && (
                    <View style={[styles.configSection, { marginTop: 12 }]}>
                      <Text style={styles.configTitle}>MACD Settings</Text>
                      <View style={styles.inputRow}>
                        <Text style={styles.inputLabel}>Fast Period</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="12"
                          placeholderTextColor="#666"
                          keyboardType="numeric"
                          value={indicatorParams.fastPeriod?.toString() || '12'}
                          onChangeText={(text) => setIndicatorParams(prev => ({ ...prev, fastPeriod: parseInt(text) || 12 }))}
                        />
                      </View>
                      <View style={styles.inputRow}>
                        <Text style={styles.inputLabel}>Slow Period</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="26"
                          placeholderTextColor="#666"
                          keyboardType="numeric"
                          value={indicatorParams.slowPeriod?.toString() || '26'}
                          onChangeText={(text) => setIndicatorParams(prev => ({ ...prev, slowPeriod: parseInt(text) || 26 }))}
                        />
                      </View>
                      <View style={styles.inputRow}>
                        <Text style={styles.inputLabel}>Signal Period</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="9"
                          placeholderTextColor="#666"
                          keyboardType="numeric"
                          value={indicatorParams.signalPeriod?.toString() || '9'}
                          onChangeText={(text) => setIndicatorParams(prev => ({ ...prev, signalPeriod: parseInt(text) || 9 }))}
                        />
                      </View>
                      <Text style={[styles.inputLabel, { marginTop: 8, fontSize: 12, color: '#888' }]}>
                        BUY: MACD crosses above signal line{'\n'}
                        SELL: MACD crosses below signal line
                      </Text>
                    </View>
                  )}

                  {/* MA/EMA Configuration */}
                  {(selectedIndicatorType === 'MA' || selectedIndicatorType === 'EMA') && (
                    <View style={[styles.configSection, { marginTop: 12 }]}>
                      <Text style={styles.configTitle}>{selectedIndicatorType} Settings</Text>
                      <View style={styles.inputRow}>
                        <Text style={styles.inputLabel}>Period</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="50"
                          placeholderTextColor="#666"
                          keyboardType="numeric"
                          value={indicatorParams.period?.toString() || '50'}
                          onChangeText={(text) => setIndicatorParams(prev => ({ ...prev, period: parseInt(text) || 50 }))}
                        />
                      </View>
                      <Text style={[styles.inputLabel, { marginTop: 8, fontSize: 12, color: '#888' }]}>
                        BUY: Price crosses above {selectedIndicatorType}{'\n'}
                        SELL: Price crosses below {selectedIndicatorType}
                      </Text>
                    </View>
                  )}

                  {/* Bollinger Bands Configuration */}
                  {selectedIndicatorType === 'BOLLINGER' && (
                    <View style={[styles.configSection, { marginTop: 12 }]}>
                      <Text style={styles.configTitle}>Bollinger Bands Settings</Text>
                      <View style={styles.inputRow}>
                        <Text style={styles.inputLabel}>Period</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="20"
                          placeholderTextColor="#666"
                          keyboardType="numeric"
                          value={indicatorParams.period?.toString() || '20'}
                          onChangeText={(text) => setIndicatorParams(prev => ({ ...prev, period: parseInt(text) || 20 }))}
                        />
                      </View>
                      <View style={styles.inputRow}>
                        <Text style={styles.inputLabel}>Standard Deviation</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="2"
                          placeholderTextColor="#666"
                          keyboardType="numeric"
                          value={indicatorParams.stdDev?.toString() || '2'}
                          onChangeText={(text) => setIndicatorParams(prev => ({ ...prev, stdDev: parseInt(text) || 2 }))}
                        />
                      </View>
                      <Text style={[styles.inputLabel, { marginTop: 8, fontSize: 12, color: '#888' }]}>
                        BUY: Price touches lower band{'\n'}
                        SELL: Price touches upper band
                      </Text>
                    </View>
                  )}

                  {/* Stochastic Configuration */}
                  {selectedIndicatorType === 'STOCHASTIC' && (
                    <View style={[styles.configSection, { marginTop: 12 }]}>
                      <Text style={styles.configTitle}>Stochastic Settings</Text>
                      <View style={styles.inputRow}>
                        <Text style={styles.inputLabel}>K Period</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="14"
                          placeholderTextColor="#666"
                          keyboardType="numeric"
                          value={indicatorParams.kPeriod?.toString() || '14'}
                          onChangeText={(text) => setIndicatorParams(prev => ({ ...prev, kPeriod: parseInt(text) || 14 }))}
                        />
                      </View>
                      <View style={styles.inputRow}>
                        <Text style={styles.inputLabel}>D Period</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="3"
                          placeholderTextColor="#666"
                          keyboardType="numeric"
                          value={indicatorParams.dPeriod?.toString() || '3'}
                          onChangeText={(text) => setIndicatorParams(prev => ({ ...prev, dPeriod: parseInt(text) || 3 }))}
                        />
                      </View>
                      <View style={styles.inputRow}>
                        <Text style={styles.inputLabel}>Oversold Level</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="20"
                          placeholderTextColor="#666"
                          keyboardType="numeric"
                          value={indicatorParams.oversold?.toString() || '20'}
                          onChangeText={(text) => setIndicatorParams(prev => ({ ...prev, oversold: parseInt(text) || 20 }))}
                        />
                      </View>
                      <View style={styles.inputRow}>
                        <Text style={styles.inputLabel}>Overbought Level</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="80"
                          placeholderTextColor="#666"
                          keyboardType="numeric"
                          value={indicatorParams.overbought?.toString() || '80'}
                          onChangeText={(text) => setIndicatorParams(prev => ({ ...prev, overbought: parseInt(text) || 80 }))}
                        />
                      </View>
                    </View>
                  )}

                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
                    <TouchableOpacity
                      style={[styles.sendSignalBtn, { flex: 1 }, creatingIndicator && styles.buttonDisabled]}
                      onPress={createIndicator}
                      disabled={creatingIndicator}
                    >
                      {creatingIndicator ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.sendSignalBtnText}>Create Indicator</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.cancelButton, { flex: 1 }]}
                      onPress={() => {
                        setShowAddIndicator(false);
                        setNewIndicator({ name: '', description: '', symbol: 'EURUSD', timeframe: '1H', indicators: [], buy_conditions: [], sell_conditions: [] });
                        setSelectedIndicatorType('');
                        setIndicatorParams({});
                      }}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Indicators List */}
              {loadingIndicators ? (
                <ActivityIndicator color="#00D9FF" style={{ marginTop: 20 }} />
              ) : customIndicators.length === 0 ? (
                <View style={{ alignItems: 'center', marginTop: 20 }}>
                  <Text style={{ color: '#888', fontSize: 14 }}>No indicators created yet</Text>
                  <Text style={{ color: '#666', fontSize: 12, marginTop: 4 }}>Create your first custom indicator above</Text>
                </View>
              ) : (
                <View style={{ marginTop: 16 }}>
                  <Text style={{ color: '#0f0', marginBottom: 8 }}>DEBUG: Found {customIndicators.length} indicators</Text>
                  {customIndicators.map((indicator, index) => {
                    console.log(`📊 Rendering indicator ${index}:`, indicator.id, indicator.name);
                    return (
                    <View key={indicator.id} style={styles.indicatorCard}>
                      <View style={styles.indicatorHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.indicatorName}>{indicator.name}</Text>
                          {indicator.description && (
                            <Text style={styles.indicatorDescription}>{indicator.description}</Text>
                          )}
                          <Text style={styles.indicatorUpdated}>
                            Updated: {new Date(indicator.updated_at).toLocaleString()}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => {
                            console.log('🗑️ Trash button pressed!', indicator.id);
                            Alert.alert('Test', 'Button clicked! ID: ' + indicator.id);
                            deleteIndicator(indicator.id);
                          }}
                          style={styles.deleteIconButton}
                          activeOpacity={0.6}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Ionicons name="trash" size={20} color="#FF4444" />
                        </TouchableOpacity>
                      </View>

                      {/* START/STOP Toggle */}
                      <TouchableOpacity
                        style={[
                          styles.startStopButton,
                          indicator.is_running ? styles.stopButton : styles.startButton
                        ]}
                        onPress={() => toggleIndicatorRunning(indicator.id, indicator.is_running)}
                      >
                        <Ionicons 
                          name={indicator.is_running ? "stop-circle" : "play-circle"} 
                          size={20} 
                          color="#fff" 
                        />
                        <Text style={styles.startStopButtonText}>
                          {indicator.is_running ? 'STOP' : 'START'}
                        </Text>
                        {indicator.is_running && (
                          <View style={styles.runningIndicator} />
                        )}
                      </TouchableOpacity>

                      <View style={styles.signalButtonContainer}>
                        <Text style={styles.signalLabel}>Current Signal:</Text>
                        <View style={styles.signalButtons}>
                          <TouchableOpacity
                            style={[
                              styles.signalButton,
                              indicator.current_signal === 'BUY' && styles.signalButtonBuy,
                              updatingIndicatorSignal[indicator.id] && styles.buttonDisabled
                            ]}
                            onPress={() => updateIndicatorSignal(indicator.id, 'BUY')}
                            disabled={updatingIndicatorSignal[indicator.id]}
                          >
                            {updatingIndicatorSignal[indicator.id] && indicator.current_signal !== 'BUY' ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <Text style={[
                                styles.signalButtonText,
                                indicator.current_signal === 'BUY' && styles.signalButtonTextActive
                              ]}>
                                BUY
                              </Text>
                            )}
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[
                              styles.signalButton,
                              indicator.current_signal === 'SELL' && styles.signalButtonSell,
                              updatingIndicatorSignal[indicator.id] && styles.buttonDisabled
                            ]}
                            onPress={() => updateIndicatorSignal(indicator.id, 'SELL')}
                            disabled={updatingIndicatorSignal[indicator.id]}
                          >
                            {updatingIndicatorSignal[indicator.id] && indicator.current_signal !== 'SELL' ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <Text style={[
                                styles.signalButtonText,
                                indicator.current_signal === 'SELL' && styles.signalButtonTextActive
                              ]}>
                                SELL
                              </Text>
                            )}
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[
                              styles.signalButton,
                              indicator.current_signal === 'NONE' && styles.signalButtonNone,
                              updatingIndicatorSignal[indicator.id] && styles.buttonDisabled
                            ]}
                            onPress={() => updateIndicatorSignal(indicator.id, 'NONE')}
                            disabled={updatingIndicatorSignal[indicator.id]}
                          >
                            {updatingIndicatorSignal[indicator.id] && indicator.current_signal !== 'NONE' ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <Text style={[
                                styles.signalButtonText,
                                indicator.current_signal === 'NONE' && styles.signalButtonTextActive
                              ]}>
                                NONE
                              </Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* MANUAL OVERRIDE - Send to all subscribers */}
                      {indicator.is_running && (
                        <View style={styles.manualOverrideContainer}>
                          <View style={styles.overrideHeader}>
                            <Ionicons name="megaphone" size={18} color="#00FF88" />
                            <Text style={styles.overrideLabel}>Manual Override (All Subscribers)</Text>
                          </View>
                          <View style={styles.overrideButtons}>
                            <TouchableOpacity
                              style={styles.overrideBuyButton}
                              onPress={() => sendManualOverride(indicator.id, 'BUY', indicator.name)}
                            >
                              <Text style={styles.overrideButtonText}>📈 Send BUY to All</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.overrideSellButton}
                              onPress={() => sendManualOverride(indicator.id, 'SELL', indicator.name)}
                            >
                              <Text style={styles.overrideButtonText}>📉 Send SELL to All</Text>
                            </TouchableOpacity>
                          </View>
                          <Text style={styles.overrideWarning}>
                            ⚠️ This sends signals to ALL users subscribed to this indicator
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                  })}
                </View>
              )}
            </View>
          )}
        </View>



        {/* NEWS MANAGEMENT - Give Signals on News Events */}
        <View style={[styles.section, { paddingLeft: 20 }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📰 Upcoming News Events (24-48hrs)</Text>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={fetchUpcomingNews}
            >
              <Ionicons name="refresh" size={24} color="#00D9FF" />
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionSubtitle}>
            Add BUY/SELL signals to alert your users before important news events
          </Text>

          {loadingNews ? (
            <ActivityIndicator color="#00D9FF" style={{ marginTop: 16 }} />
          ) : upcomingNews.length === 0 ? (
            <View style={styles.emptyNewsContainer}>
              <Ionicons name="newspaper-outline" size={48} color="#666" />
              <Text style={styles.emptyNewsText}>No upcoming news events</Text>
            </View>
          ) : (
            upcomingNews.map((news, index) => (
              <View key={news.id || index} style={styles.newsEventCard}>
                {/* News Header */}
                <View style={styles.newsEventHeader}>
                  <View style={styles.newsTimeInfo}>
                    <Ionicons name="time" size={16} color="#00D9FF" />
                    <Text style={styles.newsEventTime}>{news.event_time}</Text>
                    {news.hours_until !== undefined && (
                      <Text style={styles.hoursUntil}>({news.hours_until}h)</Text>
                    )}
                  </View>
                  <View style={[styles.currencyBadgeSmall, { backgroundColor: news.impact === 'High' ? '#ff4444' : '#ffa500' }]}>
                    <Text style={styles.currencyBadgeText}>{news.currency}</Text>
                  </View>
                </View>

                {/* News Title */}
                <Text style={styles.newsEventTitle}>{news.title}</Text>

                {/* Impact Badge */}
                <View style={styles.impactBadgeContainer}>
                  <View style={[styles.impactBadge, { backgroundColor: news.impact === 'High' ? 'rgba(255, 68, 68, 0.2)' : 'rgba(255, 165, 0, 0.2)' }]}>
                    <Text style={[styles.impactBadgeText, { color: news.impact === 'High' ? '#ff4444' : '#ffa500' }]}>
                      {news.impact} Impact
                    </Text>
                  </View>
                  {news.is_live && (
                    <View style={styles.liveBadge}>
                      <Ionicons name="radio" size={12} color="#00FF88" />
                      <Text style={styles.liveBadgeText}>LIVE</Text>
                    </View>
                  )}
                </View>

                {/* Signal Buttons */}
                <View style={styles.signalButtonsRow}>
                  <TouchableOpacity
                    style={[
                      styles.signalButton,
                      styles.buyButton,
                      news.signal === 'BUY' && styles.signalButtonActive
                    ]}
                    onPress={() => updateNewsSignal(news.id, news.signal === 'BUY' ? null : 'BUY')}
                    disabled={updatingSignal[news.id]}
                  >
                    {updatingSignal[news.id] ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="trending-up" size={18} color="#fff" />
                        <Text style={styles.signalButtonText}>
                          {news.signal === 'BUY' ? '✓ BUY' : 'BUY'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.signalButton,
                      styles.sellButton,
                      news.signal === 'SELL' && styles.signalButtonActive
                    ]}
                    onPress={() => updateNewsSignal(news.id, news.signal === 'SELL' ? null : 'SELL')}
                    disabled={updatingSignal[news.id]}
                  >
                    {updatingSignal[news.id] ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="trending-down" size={18} color="#fff" />
                        <Text style={styles.signalButtonText}>
                          {news.signal === 'SELL' ? '✓ SELL' : 'SELL'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {news.signal && (
                    <TouchableOpacity
                      style={[styles.signalButton, styles.clearButton]}
                      onPress={() => updateNewsSignal(news.id, null)}
                      disabled={updatingSignal[news.id]}
                    >
                      <Ionicons name="close-circle" size={18} color="#fff" />
                      <Text style={styles.signalButtonText}>Clear</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}
        </View>

      </ScrollView>

      {/* Branding Modal */}
      {editingBackground && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Customize Branding</Text>
              <TouchableOpacity onPress={() => setEditingBackground(false)}>
                <Ionicons name="close-circle" size={32} color="#ff4444" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {/* System Name */}
              <View style={styles.brandingSection}>
                <Text style={styles.brandingLabel}>System Name</Text>
                <TextInput
                  style={styles.input}
                  value={systemNameInput}
                  onChangeText={setSystemNameInput}
                  placeholder="Enter system name"
                  placeholderTextColor="#666"
                />
                <TouchableOpacity style={styles.saveSmallBtn} onPress={updateSystemName}>
                  <Text style={styles.btnText}>Save Name</Text>
                </TouchableOpacity>
              </View>

              {/* Background Image */}
              <View style={styles.brandingSection}>
                <Text style={styles.brandingLabel}>Background Image</Text>
                <TouchableOpacity style={styles.uploadBtn} onPress={pickImage}>
                  <Ionicons name="cloud-upload" size={24} color="#00D9FF" />
                  <Text style={styles.uploadText}>Choose Image</Text>
                </TouchableOpacity>

                {selectedBgImage && (
                  <View style={styles.imagePreview}>
                    <Image source={{ uri: selectedBgImage }} style={styles.previewImg} />
                    <TouchableOpacity 
                      style={styles.removeImageBtn}
                      onPress={() => setSelectedBgImage(null)}
                    >
                      <Ionicons name="close-circle" size={24} color="#ff4444" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Color Sliders */}
              <View style={styles.brandingSection}>
                <Text style={styles.brandingLabel}>Color Overlay (RGB)</Text>
                <Text style={styles.colorLabel}>Red: {selectedBgColor.r}</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={255}
                  step={1}
                  value={selectedBgColor.r}
                  onValueChange={(v) => setSelectedBgColor({ ...selectedBgColor, r: Math.round(v) })}
                  minimumTrackTintColor="#ff0000"
                  maximumTrackTintColor="#333"
                />
                <Text style={styles.colorLabel}>Green: {selectedBgColor.g}</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={255}
                  step={1}
                  value={selectedBgColor.g}
                  onValueChange={(v) => setSelectedBgColor({ ...selectedBgColor, g: Math.round(v) })}
                  minimumTrackTintColor="#00ff00"
                  maximumTrackTintColor="#333"
                />
                <Text style={styles.colorLabel}>Blue: {selectedBgColor.b}</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={255}
                  step={1}
                  value={selectedBgColor.b}
                  onValueChange={(v) => setSelectedBgColor({ ...selectedBgColor, b: Math.round(v) })}
                  minimumTrackTintColor="#0000ff"
                  maximumTrackTintColor="#333"
                />
                <View style={[
                  styles.colorPreview, 
                  { backgroundColor: `rgb(${selectedBgColor.r}, ${selectedBgColor.g}, ${selectedBgColor.b})` }
                ]}>
                  <Text style={styles.colorPreviewText}>Preview</Text>
                </View>
              </View>

              {/* Save/Cancel Buttons */}
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.saveBigBtn} onPress={saveBackground}>
                  {uploadingImage ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.btnText}>Save All Changes</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.cancelBigBtn} 
                  onPress={() => setEditingBackground(false)}
                >
                  <Text style={styles.btnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      )}

      {/* Temporary Password Modal */}
      <Modal
        visible={showPasswordModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.passwordModal}>
            <View style={styles.modalHeader}>
              <Ionicons name="key" size={48} color="#00D9FF" />
              <Text style={styles.modalTitle}>🔑 Temporary Password Generated</Text>
            </View>
            
            <View style={styles.passwordContainer}>
              <Text style={styles.passwordLabel}>User:</Text>
              <Text style={styles.userEmail}>{tempPasswordData.email}</Text>
              
              <Text style={styles.passwordLabel}>Temporary Password:</Text>
              <View style={styles.passwordBoxContainer}>
                <View style={styles.passwordBox}>
                  <Text style={styles.passwordText}>{tempPasswordData.password}</Text>
                </View>
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={async () => {
                    await Clipboard.setStringAsync(tempPasswordData.password);
                    Alert.alert('✅ Copied', 'Password copied to clipboard!');
                  }}
                >
                  <Ionicons name="copy-outline" size={20} color="#00D9FF" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.warningBox}>
                <Ionicons name="warning" size={20} color="#FFA500" />
                <Text style={styles.warningText}>
                  User {tempPasswordData.userName} must change this password on first login.
                </Text>
              </View>
              
              <Text style={styles.instructionText}>
                ⚠️ This password is shown only once. Please share it with the user now.
              </Text>
            </View>
            
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowPasswordModal(false)}
            >
              <Text style={styles.modalButtonText}>Got It</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* License Generation Modal */}
      <InputModal
        visible={showLicenseModal}
        title="Generate License Keys"
        message="How many keys to generate? (1-100)"
        placeholder="10"
        defaultValue="10"
        keyboardType="numeric"
        onConfirm={(value) => {
          setShowLicenseModal(false);
          generateLicenses(value);
        }}
        onCancel={() => setShowLicenseModal(false)}
      />

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="speedometer" size={24} color="#00D9FF" />
          <Text style={styles.navItemTextActive}>Dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push('/mentor-branding')}
        >
          <Ionicons name="brush-outline" size={24} color="#666" />
          <Text style={styles.navItemText}>Branding</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#000' 
  },
  loadingContainer: { 
    flex: 1, 
    backgroundColor: '#000', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    padding: 24, 
    backgroundColor: '#0a0a0a', 
    borderBottomWidth: 2, 
    borderBottomColor: '#00D9FF',
    shadowColor: '#00D9FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8
  },
  headerLeft: { 
    flex: 1 
  },
  headerTitle: { 
    fontSize: 32, 
    fontWeight: 'bold', 
    color: '#fff', 
    marginBottom: 12,
    letterSpacing: 1 
  },
  mentorIdBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#00D9FF', 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 24, 
    alignSelf: 'flex-start', 
    marginBottom: 6, 
    gap: 8,
    shadowColor: '#00D9FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4
  },
  mentorIdText: { 
    fontSize: 17, 
    fontWeight: 'bold', 
    color: '#000',
    letterSpacing: 0.5 
  },
  companyName: { 
    fontSize: 15, 
    color: '#999', 
    marginTop: 4,
    fontWeight: '500' 
  },
  logoutBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6,
    backgroundColor: 'rgba(255,68,68,0.1)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ff4444'
  },
  logoutText: { 
    color: '#ff4444', 
    fontSize: 15, 
    fontWeight: '700' 
  },
  content: { 
    flex: 1 
  },
  statsContainer: { 
    flexDirection: 'row', 
    padding: 18, 
    gap: 12 
  },
  statBox: { 
    flex: 1, 
    backgroundColor: '#0f0f0f', 
    padding: 18, 
    borderRadius: 14, 
    alignItems: 'center', 
    borderWidth: 1.5, 
    borderColor: '#1a1a1a',
    minHeight: 100,
    justifyContent: 'center'
  },
  statNumber: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#00D9FF', 
    marginVertical: 6 
  },
  statLabel: { 
    fontSize: 11, 
    color: '#666', 
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.5 
  },
  actionsRow: { 
    flexDirection: 'row', 
    padding: 18, 
    gap: 12 
  },
  actionButton: { 
    flex: 1, 
    flexDirection: 'row', 
    backgroundColor: '#00D9FF', 
    paddingVertical: 18, 
    paddingHorizontal: 12, 
    borderRadius: 14, 
    justifyContent: 'center', 
    alignItems: 'center', 
    gap: 10,
    shadowColor: '#00D9FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
    minHeight: 60
  },
  actionButtonText: { 
    color: '#000', 
    fontSize: 15, 
    fontWeight: 'bold',
    letterSpacing: 0.5 
  },
  usersSection: { 
    padding: 18 
  },
  sectionTitle: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#fff', 
    marginBottom: 18,
    letterSpacing: 0.5 
  },
  emptyState: { 
    alignItems: 'center', 
    paddingVertical: 70, 
    backgroundColor: '#0f0f0f', 
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: '#1a1a1a' 
  },
  emptyStateText: { 
    fontSize: 20, 
    color: '#666', 
    marginTop: 18,
    fontWeight: '600' 
  },
  emptyStateSubtext: { 
    fontSize: 15, 
    color: '#444', 
    marginTop: 8, 
    textAlign: 'center', 
    paddingHorizontal: 40,
    lineHeight: 22 
  },
  userCard: { 
    backgroundColor: '#0f0f0f', 
    borderRadius: 14, 
    marginBottom: 14, 
    borderWidth: 1.5, 
    borderColor: '#00D9FF',
    shadowColor: '#00D9FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4
  },
  userCardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 18 
  },
  userInfo: { 
    flex: 1 
  },
  userNameRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12, 
    marginBottom: 8 
  },
  userName: { 
    fontSize: 19, 
    fontWeight: 'bold', 
    color: '#fff',
    letterSpacing: 0.3 
  },
  statusBadge: { 
    paddingHorizontal: 12, 
    paddingVertical: 5, 
    borderRadius: 14 
  },
  statusText: { 
    fontSize: 11, 
    color: '#fff', 
    fontWeight: 'bold',
    letterSpacing: 0.5 
  },
  userEmail: { 
    fontSize: 15, 
    color: '#999',
    fontWeight: '500' 
  },
  userDetails: { 
    padding: 18, 
    borderTopWidth: 1, 
    borderTopColor: '#222',
    backgroundColor: '#0a0a0a' 
  },
  detailRow: { 
    flexDirection: 'row', 
    marginBottom: 12 
  },
  detailLabel: { 
    width: 110, 
    fontSize: 14, 
    color: '#666', 
    fontWeight: '600',
    letterSpacing: 0.3 
  },
  detailValue: { 
    flex: 1, 
    fontSize: 14, 
    color: '#fff',
    fontWeight: '500' 
  },
  userActions: { 
    flexDirection: 'row', 
    gap: 10, 
    marginTop: 14 
  },
  activateBtn: { 
    flex: 1, 
    flexDirection: 'row', 
    backgroundColor: '#4CAF50', 
    paddingVertical: 14, 
    paddingHorizontal: 10, 
    borderRadius: 10, 
    justifyContent: 'center', 
    alignItems: 'center', 
    gap: 6,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4
  },
  deactivateBtn: { 
    flex: 1, 
    flexDirection: 'row', 
    backgroundColor: '#ff4444', 
    paddingVertical: 14, 
    paddingHorizontal: 10, 
    borderRadius: 10, 
    justifyContent: 'center', 
    alignItems: 'center', 
    gap: 6,
    shadowColor: '#ff4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4
  },
  resetBtn: { 
    flex: 1, 
    flexDirection: 'row', 
    backgroundColor: '#FF9800', 
    paddingVertical: 14, 
    paddingHorizontal: 10, 
    borderRadius: 10, 
    justifyContent: 'center', 
    alignItems: 'center', 
    gap: 6,
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  actionBtnText: { 
    color: '#fff', 
    fontSize: 13, 
    fontWeight: 'bold',
    letterSpacing: 0.5 
  },
  licensesSection: { padding: 15, marginTop: 10 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  licensesCount: { fontSize: 14, color: '#00D9FF', fontWeight: '600' },
  licensesList: { gap: 8 },
  licenseItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#111', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#333' },
  licenseKey: { fontSize: 14, color: '#fff', fontFamily: 'monospace', flex: 1 },
  licenseActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  licenseCopyButton: { padding: 6, borderRadius: 6, backgroundColor: 'rgba(0, 217, 255, 0.1)' },
  licenseBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  licenseBadgeText: { fontSize: 11, color: '#fff', fontWeight: 'bold' },
  moreText: { textAlign: 'center', color: '#666', marginTop: 10, fontSize: 13 },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  modalContent: { width: '90%', maxHeight: '80%', backgroundColor: '#1a1a1a', borderRadius: 20, borderWidth: 2, borderColor: '#00D9FF' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#333' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  modalScroll: { padding: 20 },
  brandingSection: { marginBottom: 20, backgroundColor: '#111', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#333' },
  brandingLabel: { fontSize: 16, fontWeight: 'bold', color: '#00D9FF', marginBottom: 10 },
  input: { backgroundColor: '#000', color: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#00D9FF', fontSize: 16, marginBottom: 10 },
  saveSmallBtn: { backgroundColor: '#4CAF50', padding: 12, borderRadius: 8, alignItems: 'center' },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#222', padding: 15, borderRadius: 10, borderWidth: 2, borderColor: '#00D9FF', borderStyle: 'dashed', gap: 10 },
  uploadText: { color: '#00D9FF', fontSize: 16, fontWeight: 'bold' },
  imagePreview: { position: 'relative', marginTop: 15 },
  previewImg: { width: '100%', height: 180, borderRadius: 10 },
  removeImageBtn: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 20, padding: 5 },
  colorLabel: { fontSize: 13, color: '#888', fontWeight: '600', marginTop: 10 },
  slider: { width: '100%', height: 40 },
  colorPreview: { height: 60, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 15 },
  colorPreviewText: { color: '#fff', fontSize: 14, fontWeight: 'bold', textShadowColor: '#000', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 5 },
  modalActions: { gap: 10, marginTop: 10 },
  saveBigBtn: { backgroundColor: '#4CAF50', padding: 16, borderRadius: 10, alignItems: 'center' },
  cancelBigBtn: { backgroundColor: '#666', padding: 16, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  // Manual Signal styles
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  toggleButton: { padding: 8 },
  formContainer: { backgroundColor: '#1a1f3a', padding: 16, borderRadius: 12, marginTop: 8 },
  inputRow: { marginBottom: 16 },
  inputLabel: { color: '#888', fontSize: 14, marginBottom: 8, fontWeight: '600' },
  textInput: { backgroundColor: '#0a0e27', borderWidth: 1, borderColor: '#333', borderRadius: 8, padding: 12, color: '#fff', fontSize: 14 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  segmentedControl: { flexDirection: 'row', backgroundColor: '#0a0e27', borderRadius: 8, padding: 4 },
  segmentButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
  segmentButtonActive: { backgroundColor: '#00D9FF' },
  segmentText: { color: '#888', fontSize: 14, fontWeight: 'bold' },
  segmentTextActive: { color: '#0a0e27' },
  timeframeButtons: { flexDirection: 'row', gap: 8 },
  timeframeBtn: { flex: 1, paddingVertical: 10, backgroundColor: '#0a0e27', borderWidth: 1, borderColor: '#333', borderRadius: 8, alignItems: 'center' },
  timeframeBtnActive: { backgroundColor: '#00D9FF', borderColor: '#00D9FF' },
  timeframeText: { color: '#888', fontSize: 14, fontWeight: 'bold' },
  timeframeTextActive: { color: '#0a0e27' },
  sendSignalBtn: { backgroundColor: '#00D9FF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 8, gap: 8, marginTop: 8 },
  sendSignalBtnText: { color: '#0a0e27', fontSize: 16, fontWeight: 'bold' },
  // Broker styles removed
  buttonDisabled: { opacity: 0.5 },
  // Manual News styles
  impactButtons: { flexDirection: 'row', gap: 8 },
  impactBtn: { flex: 1, paddingVertical: 12, backgroundColor: '#0a0e27', borderWidth: 1, borderColor: '#333', borderRadius: 8, alignItems: 'center' },
  impactBtnActive: { borderColor: '#00D9FF' },
  impactBtnHigh: { backgroundColor: '#FF4444', borderColor: '#FF4444' },
  impactBtnMedium: { backgroundColor: '#FFA500', borderColor: '#FFA500' },
  impactBtnLow: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  impactText: { color: '#888', fontSize: 14, fontWeight: 'bold' },
  impactTextActive: { color: '#fff' },
  // Custom Indicator styles
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: '#0f1425', borderRadius: 8, borderWidth: 1, borderColor: '#00D9FF' },
  addButtonText: { color: '#00D9FF', fontSize: 14, fontWeight: 'bold' },
  cancelButton: { padding: 14, backgroundColor: '#333', borderRadius: 8, alignItems: 'center' },
  cancelButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  indicatorCard: { backgroundColor: '#0f1425', padding: 16, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#333' },
  indicatorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  indicatorName: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  indicatorDescription: { color: '#888', fontSize: 13, marginBottom: 4 },
  indicatorUpdated: { color: '#666', fontSize: 11 },
  deleteIconButton: { 
    padding: 8,
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderRadius: 6,
    minWidth: 36,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signalButtonContainer: { marginTop: 8 },
  signalLabel: { color: '#888', fontSize: 13, marginBottom: 8 },
  signalButtons: { flexDirection: 'row', gap: 8 },
  signalButton: { flex: 1, paddingVertical: 12, backgroundColor: '#0a0e27', borderWidth: 1, borderColor: '#333', borderRadius: 8, alignItems: 'center' },
  signalButtonBuy: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  signalButtonSell: { backgroundColor: '#FF4444', borderColor: '#FF4444' },
  signalButtonNone: { backgroundColor: '#666', borderColor: '#666' },
  signalButtonText: { color: '#888', fontSize: 14, fontWeight: 'bold' },
  signalButtonTextActive: { color: '#fff' },
  
  // Manual Override styles
  manualOverrideContainer: { 
    marginTop: 16, 
    padding: 12, 
    backgroundColor: 'rgba(0, 255, 136, 0.05)', 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: '#00FF88' 
  },
  overrideHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    marginBottom: 8 
  },
  overrideLabel: { 
    color: '#00FF88', 
    fontSize: 13, 
    fontWeight: 'bold' 
  },
  overrideButtons: { 
    flexDirection: 'row', 
    gap: 8, 
    marginBottom: 8 
  },
  overrideBuyButton: { 
    flex: 1, 
    backgroundColor: '#4CAF50', 
    padding: 12, 
    borderRadius: 8, 
    alignItems: 'center' 
  },
  overrideSellButton: { 
    flex: 1, 
    backgroundColor: '#FF4444', 
    padding: 12, 
    borderRadius: 8, 
    alignItems: 'center' 
  },
  overrideButtonText: { 
    color: '#fff', 
    fontSize: 13, 
    fontWeight: 'bold' 
  },
  overrideWarning: { 
    color: '#FF9800', 
    fontSize: 11, 
    fontStyle: 'italic', 
    textAlign: 'center' 
  },
  
  startStopButton: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 8, marginTop: 12, marginBottom: 8, justifyContent: 'center' },
  startButton: { backgroundColor: '#4CAF50', borderColor: '#4CAF50', borderWidth: 1 },
  stopButton: { backgroundColor: '#FF4444', borderColor: '#FF4444', borderWidth: 1 },
  startStopButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  runningIndicator: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff', marginLeft: 4 },
  // Indicator configuration styles
  symbolButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  symbolBtn: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#0a0e27', borderWidth: 1, borderColor: '#333', borderRadius: 6 },
  symbolBtnActive: { backgroundColor: '#00D9FF', borderColor: '#00D9FF' },
  symbolText: { color: '#888', fontSize: 12, fontWeight: 'bold' },
  symbolTextActive: { color: '#0a0e27' },
  timeframeButtons: { flexDirection: 'row', gap: 8 },
  timeframeBtn: { flex: 1, paddingVertical: 10, backgroundColor: '#0a0e27', borderWidth: 1, borderColor: '#333', borderRadius: 6, alignItems: 'center' },
  timeframeBtnActive: { backgroundColor: '#00D9FF', borderColor: '#00D9FF' },
  timeframeText: { color: '#888', fontSize: 12, fontWeight: 'bold' },
  timeframeTextActive: { color: '#0a0e27' },
  indicatorTypeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  indicatorTypeBtn: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#0a0e27', borderWidth: 1, borderColor: '#333', borderRadius: 6 },
  indicatorTypeBtnActive: { backgroundColor: '#00D9FF', borderColor: '#00D9FF' },
  indicatorTypeText: { color: '#888', fontSize: 13, fontWeight: 'bold' },
  indicatorTypeTextActive: { color: '#0a0e27' },
  configSection: { backgroundColor: '#0f1425', padding: 12, borderRadius: 6, borderWidth: 1, borderColor: '#00D9FF' },
  configTitle: { color: '#00D9FF', fontSize: 14, fontWeight: 'bold', marginBottom: 8 },

  
  // News Management styles
  refreshButton: { padding: 8, borderRadius: 8, backgroundColor: 'rgba(0, 217, 255, 0.1)' },
  sectionSubtitle: { color: '#888', fontSize: 13, marginTop: 4, marginBottom: 12, fontStyle: 'italic' },
  emptyNewsContainer: { alignItems: 'center', padding: 40, marginTop: 16 },
  emptyNewsText: { color: '#666', fontSize: 14, marginTop: 12 },
  newsEventCard: { backgroundColor: '#1a1f3a', padding: 16, borderRadius: 12, marginTop: 12, borderWidth: 1, borderColor: 'rgba(0, 217, 255, 0.2)' },
  newsEventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  newsTimeInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  newsEventTime: { color: '#00D9FF', fontSize: 13, fontWeight: '600' },
  hoursUntil: { color: '#888', fontSize: 12, fontStyle: 'italic', marginLeft: 4 },
  currencyBadgeSmall: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  currencyBadgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  newsEventTitle: { color: '#fff', fontSize: 15, fontWeight: 'bold', marginBottom: 10, lineHeight: 20 },
  impactBadgeContainer: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  impactBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  impactBadgeText: { fontSize: 11, fontWeight: '600' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(0, 255, 136, 0.2)' },
  liveBadgeText: { color: '#00FF88', fontSize: 10, fontWeight: 'bold' },
  signalButtonsRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  signalButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, gap: 6 },
  buyButton: { backgroundColor: '#00FF88' },
  sellButton: { backgroundColor: '#ff4444' },
  clearButton: { backgroundColor: '#666', flex: 0.5 },
  signalButtonActive: { opacity: 1, borderWidth: 2, borderColor: '#fff' },
  signalButtonText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  
  // Password Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  passwordModal: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 500,
    borderWidth: 2,
    borderColor: '#00D9FF',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
    textAlign: 'center',
  },
  passwordContainer: {
    marginBottom: 24,
  },
  passwordLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
    marginTop: 12,
  },
  userEmail: {
    fontSize: 16,
    color: '#00D9FF',
    fontWeight: '600',
    marginBottom: 8,
  },
  passwordBoxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  passwordBox: {
    backgroundColor: '#0f0f1e',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#00D9FF',
    flex: 1,
  },
  passwordText: {
    fontSize: 22,
    color: '#00FF88',
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  copyButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    marginLeft: 12,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 165, 0, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#FFA500',
    lineHeight: 18,
  },
  instructionText: {
    fontSize: 13,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 18,
  },
  modalButton: {
    backgroundColor: '#00D9FF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#0a0e27',
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  navItemTextActive: {
    color: '#00D9FF',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  navItemText: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
});
