import * as React from 'react';
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Image,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import Slider from '@react-native-community/slider';
import Constants from 'expo-constants';
import ConfirmModal from '../components/ConfirmModal';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 
                'https://mi-indicator-live.preview.emergentagent.com';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [mentors, setMentors] = useState<string[]>([]);
  const [licenses, setLicenses] = useState<string[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [pendingMentors, setPendingMentors] = useState<any[]>([]);
  const [allMentors, setAllMentors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastGenerated, setLastGenerated] = useState({ mentor: '', license: '', accessKeys: [] as string[] });
  const [selectedMentor, setSelectedMentor] = useState<string | null>(null);
  const [mentorDetails, setMentorDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [mentorsWithUsers, setMentorsWithUsers] = useState<string[]>([]);
  const [mentorsWithoutUsers, setMentorsWithoutUsers] = useState<string[]>([]);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [editingSystemName, setEditingSystemName] = useState(false);
  const [systemNameInput, setSystemNameInput] = useState('');
  const [tempPassword, setTempPassword] = useState<{userId: string, password: string} | null>(null);
  const [buttonLoading, setButtonLoading] = useState<{[key: string]: boolean}>({});
  
  // Password reset modal states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [tempPasswordData, setTempPasswordData] = useState({ 
    email: '', 
    password: '', 
    userName: '', 
    userType: 'user' 
  });
  
  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState({
    visible: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    confirmStyle: 'default' as 'default' | 'destructive',
    onConfirm: () => {},
  });
  
  // Background customization states
  const [editingBackground, setEditingBackground] = useState(false);
  const [selectedBgImage, setSelectedBgImage] = useState<string | null>(null);
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

  // Broker Affiliate states
  const [showBrokerForm, setShowBrokerForm] = useState(false);
  const [brokerForm, setBrokerForm] = useState({
    broker_name: '',
    broker_image: '',
    affiliate_link: '',
    description: '',
  });
  const [brokers, setBrokers] = useState<any[]>([]);
  const [addingBroker, setAddingBroker] = useState(false);
  const [loadingBrokers, setLoadingBrokers] = useState(false);

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

  useEffect(() => {
    loadData();
    
    // Auto-refresh every 3 seconds
    const interval = setInterval(() => {
      loadData();
    }, 3000);
    
    // Cleanup on unmount
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      console.log('=== ADMIN: loadData called ===');
      const token = await AsyncStorage.getItem('authToken');
      console.log('ADMIN: Token found:', token ? 'YES' : 'NO');
      
      if (!token) {
        console.log('ADMIN: No token found, redirecting to login');
        router.replace('/');
        return;
      }
      
      console.log('ADMIN: Token verified, fetching data...');

      const headers = { 'Authorization': `Bearer ${token}` };

      const [statsRes, mentorsRes, licensesRes, usersRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/stats`, { headers }),
        fetch(`${API_URL}/api/admin/mentors`, { headers }),
        fetch(`${API_URL}/api/admin/licenses`, { headers }),
        fetch(`${API_URL}/api/admin/users`, { headers }),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      let mentorsData = [];
      let allUsers = [];
      
      if (mentorsRes.ok) {
        mentorsData = await mentorsRes.json();
        console.log('=== ADMIN: Received mentors data ===');
        console.log('Total mentors:', mentorsData.length);
        
        setAllMentors(mentorsData); // Store all mentor objects
        
        // Separate pending mentors
        const pending = mentorsData.filter((m: any) => m.status === 'pending');
        console.log('Pending mentors count:', pending.length);
        setPendingMentors(pending);
        
        // Active mentors with mentor_id
        const activeMentors = mentorsData
          .filter((m: any) => m.status === 'active' && m.mentor_id)
          .map((m: any) => m.mentor_id);
        console.log('Active mentor IDs:', activeMentors);
        console.log('Active mentor IDs count:', activeMentors.length);
        setMentors(activeMentors);
      }
      
      if (licensesRes.ok) {
        const data = await licensesRes.json();
        setLicenses(data.licenses || []);
      }
      
      if (usersRes.ok) {
        const data = await usersRes.json();
        allUsers = data.users || [];
        setUsers(allUsers);
        setPendingUsers(allUsers.filter((u: any) => u.status === 'pending'));
        
        // Get unique mentor IDs that have users
        const uniqueMentorsWithUsers = [...new Set(allUsers.map((u: any) => u.mentor_id).filter(Boolean))];
        setMentorsWithUsers(uniqueMentorsWithUsers);
      }

      // Calculate mentors without users using already parsed data
      if (mentorsRes.ok && usersRes.ok) {
        // Get active mentors with mentor_id
        const activeMentorsList = mentorsData
          .filter((m: any) => m.status === 'active' && m.mentor_id)
          .map((m: any) => m.mentor_id);
          
        const mentorsWithUsersList = [...new Set(allUsers.map((u: any) => u.mentor_id).filter(Boolean))];
        const emptyMentors = activeMentorsList.filter((m: string) => !mentorsWithUsersList.includes(m));
        
        console.log('=== CALCULATING MENTORS WITHOUT USERS ===');
        console.log('Active mentor IDs list:', activeMentorsList);
        console.log('Mentors with users list:', mentorsWithUsersList);
        console.log('Mentors without users (calculated):', emptyMentors);
        console.log('Count:', emptyMentors.length);
        
        setMentorsWithoutUsers(emptyMentors);
      }

      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const generateMentor = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/admin/mentors/create`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setLastGenerated({ ...lastGenerated, mentor: data.mentor_id });
        Alert.alert('✅ Success', `Mentor ID: ${data.mentor_id}\n\nSaved to database!`);
        loadData();
      } else {
        Alert.alert('Error', 'Failed to generate Mentor ID');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to generate Mentor ID');
    }
  };

  const generateMentorAccessKeys = async () => {
    Alert.prompt(
      'Generate Mentor Access Keys',
      'How many keys to generate? (1-50)',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          onPress: async (count) => {
            const numCount = parseInt(count || '5');
            if (isNaN(numCount) || numCount < 1 || numCount > 50) {
              Alert.alert('Error', 'Please enter a number between 1 and 50');
              return;
            }

            try {
              const token = await AsyncStorage.getItem('authToken');
              const response = await fetch(`${API_URL}/api/admin/mentor-access-keys/generate`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ count: numCount }),
              });

              if (response.ok) {
                const data = await response.json();
                setLastGenerated({ ...lastGenerated, accessKeys: data.keys });
                Alert.alert('✅ Success', `Generated ${data.keys.length} mentor access keys!`);
                loadData();
              } else {
                Alert.alert('Error', 'Failed to generate access keys');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to generate access keys');
            }
          },
        },
      ],
      'plain-text',
      '5'
    );
  };

  const generateLicense = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/admin/licenses/generate?count=1`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const newLicenseKey = data.keys[0];
        setLastGenerated({ ...lastGenerated, license: newLicenseKey });
        
        // Auto-copy to clipboard
        await Clipboard.setStringAsync(newLicenseKey);
        
        Alert.alert('✅ Success', `License Key: ${newLicenseKey}\n\nSaved to database and copied to clipboard!`);
        loadData();
      } else {
        Alert.alert('Error', 'Failed to generate License Key');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to generate License Key');
    }
  };

  const approveUser = async (userId: string) => {
    const buttonKey = `approve-${userId}`;
    setButtonLoading(prev => ({...prev, [buttonKey]: true}));
    
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/admin/users/${userId}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        Alert.alert('✅ Success', 'User approved successfully!', [{text: 'OK'}]);
        await loadData();
      } else {
        const error = await response.json().catch(() => ({}));
        Alert.alert('❌ Failed', error.detail || 'Failed to approve user');
      }
    } catch (error) {
      Alert.alert('❌ Error', 'Network error. Please try again.');
    } finally {
      setButtonLoading(prev => ({...prev, [buttonKey]: false}));
    }
  };

  const declineUser = async (userId: string) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/admin/users/${userId}/decline`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        Alert.alert('✅ Declined', 'User declined');
        loadData();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to decline user');
    }
  };

  const approveMentor = async (mentorDbId: string) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/admin/mentors/${mentorDbId}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        Alert.alert(
          '✅ Mentor Approved!',
          `Mentor ID: ${data.mentor_id}\nEmail: ${data.email}\n\nMentor can now login!`,
          [{ text: 'OK' }]
        );
        loadData();
      } else {
        Alert.alert('Error', 'Failed to approve mentor');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to approve mentor');
    }
  };

  const declineMentor = async (mentorDbId: string) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/admin/mentors/${mentorDbId}/decline`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        Alert.alert('✅ Declined', 'Mentor registration declined');
        loadData();
      } else {
        Alert.alert('Error', 'Failed to decline mentor');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to decline mentor');
    }
  };

  const activateUser = async (userId: string) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/admin/users/${userId}/activate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        Alert.alert('✅ Activated', 'User account activated successfully');
        loadData();
      } else {
        Alert.alert('Error', 'Failed to activate user');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to activate user');
    }
  };

  const deactivateUser = async (userId: string) => {
    Alert.alert(
      'Deactivate User',
      'Are you sure you want to deactivate this user account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('authToken');
              console.log('Deactivating user:', userId);
              console.log('API URL:', `${API_URL}/api/admin/users/${userId}/deactivate`);
              
              const response = await fetch(`${API_URL}/api/admin/users/${userId}/deactivate`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
              });

              console.log('Deactivate response status:', response.status);
              const responseData = await response.json();
              console.log('Deactivate response:', responseData);

              if (response.ok) {
                Alert.alert('✅ Deactivated', 'User account deactivated successfully');
                loadData();
              } else {
                Alert.alert('Error', `Failed to deactivate user: ${responseData.detail || 'Unknown error'}`);
              }
            } catch (error: any) {
              console.error('Deactivate error:', error);
              Alert.alert('Error', `Failed to deactivate user: ${error.message}`);
            }
          },
        },
      ]
    );
  };

  const deleteUser = async (userId: string, userEmail: string) => {
    console.log('Delete user function called for:', userId, userEmail);
    
    setConfirmModal({
      visible: true,
      title: '⚠️ Delete User',
      message: `Are you sure you want to permanently DELETE this user?\n\nEmail: ${userEmail}\n\nThis action CANNOT be undone!\n\nThe user will be immediately logged out and unable to access the system.`,
      confirmText: 'Delete Permanently',
      confirmStyle: 'destructive',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, visible: false }));
        
        const buttonKey = `delete-user-${userId}`;
        setButtonLoading(prev => ({...prev, [buttonKey]: true}));
        
        try {
          console.log('Proceeding with user deletion...');
          const token = await AsyncStorage.getItem('authToken');
          console.log('Token retrieved:', token ? 'YES' : 'NO');
          
          const deleteUrl = `${API_URL}/api/admin/users/${userId}`;
          console.log('DELETE URL:', deleteUrl);
          
          const response = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
          });

          console.log('Delete response status:', response.status);

          if (response.ok) {
            const result = await response.json();
            console.log('✅ Delete successful:', result);
            // Show success modal
            setConfirmModal({
              visible: true,
              title: '✅ Success',
              message: 'User permanently deleted',
              confirmText: 'OK',
              confirmStyle: 'default',
              onConfirm: () => {
                setConfirmModal(prev => ({ ...prev, visible: false }));
                loadData();
              },
            });
          } else {
            const errorText = await response.text();
            console.error('Delete failed:', errorText);
            setConfirmModal({
              visible: true,
              title: '❌ Error',
              message: 'Failed to delete user',
              confirmText: 'OK',
              confirmStyle: 'default',
              onConfirm: () => setConfirmModal(prev => ({ ...prev, visible: false })),
            });
          }
        } catch (error) {
          console.error('Delete user error:', error);
          setConfirmModal({
            visible: true,
            title: '❌ Error',
            message: 'Failed to delete user',
            confirmText: 'OK',
            confirmStyle: 'default',
            onConfirm: () => setConfirmModal(prev => ({ ...prev, visible: false })),
          });
        } finally {
          setButtonLoading(prev => ({...prev, [buttonKey]: false}));
        }
      },
    });
  };

  const deactivateMentor = async (mentorDbId: string, mentorEmail: string) => {
    Alert.alert(
      'Deactivate Mentor',
      `Are you sure you want to deactivate this mentor?\n\nEmail: ${mentorEmail}\n\nThey will be immediately logged out and unable to access the system.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Deactivating mentor:', mentorDbId);
              const token = await AsyncStorage.getItem('authToken');
              const response = await fetch(`${API_URL}/api/admin/mentors/${mentorDbId}/deactivate`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
              });

              console.log('Deactivate response:', response.status);

              if (response.ok) {
                Alert.alert('✅ Deactivated', 'Mentor account deactivated successfully');
                loadData();
              } else {
                const errorText = await response.text();
                console.error('Deactivate error:', errorText);
                Alert.alert('Error', 'Failed to deactivate mentor');
              }
            } catch (error) {
              console.error('Deactivate mentor error:', error);
              Alert.alert('Error', 'Failed to deactivate mentor');
            }
          },
        },
      ]
    );
  };

  const deleteMentor = async (mentorDbId: string, mentorEmail: string) => {
    console.log('=== DELETE MENTOR FUNCTION CALLED ===');
    console.log('Mentor DB ID:', mentorDbId);
    console.log('Mentor Email:', mentorEmail);
    
    Alert.alert(
      '⚠️ Delete Mentor',
      `Are you sure you want to permanently DELETE this mentor?\n\nEmail: ${mentorEmail}\n\nThis will also remove all their users and licenses!\n\nThis action CANNOT be undone!`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            const buttonKey = `delete-mentor-${mentorDbId}`;
            setButtonLoading(prev => ({...prev, [buttonKey]: true}));
            
            try {
              const token = await AsyncStorage.getItem('authToken');
              const response = await fetch(`${API_URL}/api/admin/mentors/${mentorDbId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
              });

              if (response.ok) {
                const result = await response.json();
                console.log('✅ Mentor deleted:', result);
                Alert.alert(
                  '✅ Deleted Successfully',
                  `Mentor "${mentorEmail}" has been permanently deleted.`,
                  [{ text: 'OK' }]
                );
                await loadData();
              } else {
                const errorData = await response.json().catch(() => ({}));
                Alert.alert('❌ Delete Failed', errorData.detail || 'Failed to delete mentor');
              }
            } catch (error: any) {
              console.error('Delete mentor error:', error);
              Alert.alert('❌ Network Error', `Failed to delete mentor: ${error.message}`);
            } finally {
              setButtonLoading(prev => ({...prev, [buttonKey]: false}));
            }
          },
        },
      ]
    );
  };

  const logout = async () => {
    await AsyncStorage.removeItem('authToken');
    router.replace('/');
  };

  // Send Manual Signal
  const sendSignal = async () => {
    if (!signalForm.symbol || !signalForm.indicator || !signalForm.candle_pattern) {
      setConfirmModal({
        visible: true,
        title: 'Validation Error',
        message: 'Please fill in all required fields (Symbol, Indicator, Candle Pattern)',
        confirmText: 'OK',
        confirmStyle: 'default',
        onConfirm: () => setConfirmModal(prev => ({ ...prev, visible: false })),
      });
      return;
    }

    setSendingSignal(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/admin/send-signal`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(signalForm),
      });

      const data = await response.json();

      if (response.ok) {
        setConfirmModal({
          visible: true,
          title: 'Success',
          message: `Signal sent successfully to ${data.recipient_count} users!`,
          confirmText: 'OK',
          confirmStyle: 'default',
          onConfirm: () => {
            setConfirmModal(prev => ({ ...prev, visible: false }));
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
          },
        });
      } else {
        throw new Error(data.detail || 'Failed to send signal');
      }
    } catch (error: any) {
      setConfirmModal({
        visible: true,
        title: 'Error',
        message: error.message || 'Failed to send signal',
        confirmText: 'OK',
        confirmStyle: 'destructive',
        onConfirm: () => setConfirmModal(prev => ({ ...prev, visible: false })),
      });
    } finally {
      setSendingSignal(false);
    }
  };

  // Send Manual News
  const sendManualNews = async () => {
    if (!newsForm.title.trim()) {
      setConfirmModal({
        visible: true,
        title: 'Validation Error',
        message: 'Please enter a news title',
        confirmText: 'OK',
        confirmStyle: 'default',
        onConfirm: () => setConfirmModal(prev => ({ ...prev, visible: false })),
      });
      return;
    }

    setSendingNews(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      
      // Only include non-empty fields in the payload
      const payload: any = { title: newsForm.title.trim() };
      
      if (newsForm.event_time.trim()) payload.event_time = newsForm.event_time.trim();
      if (newsForm.currency.trim()) payload.currency = newsForm.currency.trim();
      if (newsForm.impact) payload.impact = newsForm.impact;
      if (newsForm.description.trim()) payload.description = newsForm.description.trim();
      if (newsForm.signal) payload.signal = newsForm.signal;

      const response = await fetch(`${API_URL}/api/admin/send-manual-news`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        setConfirmModal({
          visible: true,
          title: 'Success',
          message: `News event sent successfully to ${data.recipient_count} users!`,
          confirmText: 'OK',
          confirmStyle: 'default',
          onConfirm: () => {
            setConfirmModal(prev => ({ ...prev, visible: false }));
            setShowNewsForm(false);
            setNewsForm({
              title: '',
              event_time: '',
              currency: '',
              impact: 'High',
              description: '',
              signal: '',
            });
          },
        });
      } else {
        throw new Error(data.detail || 'Failed to send news event');
      }
    } catch (error: any) {
      setConfirmModal({
        visible: true,
        title: 'Error',
        message: error.message || 'Failed to send news event',
        confirmText: 'OK',
        confirmStyle: 'destructive',
        onConfirm: () => setConfirmModal(prev => ({ ...prev, visible: false })),
      });
    } finally {
      setSendingNews(false);
    }
  };


  // Load Brokers
  const loadBrokers = async () => {
    setLoadingBrokers(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/admin/brokers`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setBrokers(data.brokers || []);
      }
    } catch (error) {
      console.error('Error loading brokers:', error);
    } finally {
      setLoadingBrokers(false);
    }
  };

  // Add Broker
  const addBroker = async () => {
    if (!brokerForm.broker_name || !brokerForm.affiliate_link) {
      setConfirmModal({
        visible: true,
        title: 'Validation Error',
        message: 'Please fill in Broker Name and Affiliate Link',
        confirmText: 'OK',
        confirmStyle: 'default',
        onConfirm: () => setConfirmModal(prev => ({ ...prev, visible: false })),
      });
      return;
    }

    setAddingBroker(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/admin/brokers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(brokerForm),
      });

      const data = await response.json();

      if (response.ok) {
        setConfirmModal({
          visible: true,
          title: 'Success',
          message: `Broker added successfully! Notified ${data.notified_users} users.`,
          confirmText: 'OK',
          confirmStyle: 'default',
          onConfirm: () => {
            setConfirmModal(prev => ({ ...prev, visible: false }));
            setShowBrokerForm(false);
            setBrokerForm({
              broker_name: '',
              broker_image: '',
              affiliate_link: '',
              description: '',
            });
            loadBrokers();
          },
        });
      } else {
        throw new Error(data.detail || 'Failed to add broker');
      }
    } catch (error: any) {
      setConfirmModal({
        visible: true,
        title: 'Error',
        message: error.message || 'Failed to add broker',
        confirmText: 'OK',
        confirmStyle: 'destructive',
        onConfirm: () => setConfirmModal(prev => ({ ...prev, visible: false })),
      });
    } finally {
      setAddingBroker(false);
    }
  };

  // Delete Broker
  const deleteBroker = async (brokerId: string, brokerName: string) => {
    setConfirmModal({
      visible: true,
      title: 'Delete Broker',
      message: `Are you sure you want to delete "${brokerName}"?`,
      confirmText: 'Delete',
      confirmStyle: 'destructive',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, visible: false }));
        
        try {
          const token = await AsyncStorage.getItem('authToken');
          const response = await fetch(`${API_URL}/api/admin/brokers/${brokerId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
          });

          if (response.ok) {
            loadBrokers();
          } else {
            throw new Error('Failed to delete broker');
          }
        } catch (error) {
          console.error('Error deleting broker:', error);
        }
      },
    });
  };

  // Pick broker image
  const pickBrokerImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setBrokerForm(prev => ({ ...prev, broker_image: base64Image }));
    }
  };

  // Load brokers when component mounts
  React.useEffect(() => {
    loadBrokers();
  }, []);

  const fetchMentorDetails = async (mentorId: string) => {
    setSelectedMentor(mentorId);
    setLoadingDetails(true);
    setEditingSystemName(false);
    setEditingBackground(false);

    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const mentorUsers = (data.users || []).filter((u: any) => u.mentor_id === mentorId);
        
        // Get mentor info including system_name, background_image, and background_color
        const mentorsResponse = await fetch(`${API_URL}/api/admin/mentors`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        
        let system_name = null;
        let background_image = null;
        let background_color = null;
        if (mentorsResponse.ok) {
          const mentorsData = await mentorsResponse.json();
          const mentorInfo = mentorsData.mentors_data?.find((m: any) => m.mentor_id === mentorId);
          system_name = mentorInfo?.system_name || null;
          background_image = mentorInfo?.background_image || null;
          background_color = mentorInfo?.background_color || null;
        }

        setMentorDetails({
          userCount: mentorUsers.length,
          users: mentorUsers,
          system_name: system_name,
          background_image: background_image,
          background_color: background_color
        });
        setSystemNameInput(system_name || '');
        setSelectedBgImage(background_image);
        
        // Parse color if exists
        if (background_color) {
          const match = background_color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
          if (match) {
            setSelectedBgColor({
              r: parseInt(match[1]),
              g: parseInt(match[2]),
              b: parseInt(match[3])
            });
          }
        } else {
          setSelectedBgColor({ r: 0, g: 0, b: 0 });
        }
      }
    } catch (error) {
      console.error('Error fetching mentor details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const closeMentorDetails = () => {
    setSelectedMentor(null);
    setMentorDetails(null);
  };

  const toggleUserDetails = (userId: string) => {
    setExpandedUserId(expandedUserId === userId ? null : userId);
  };

  const updateSystemName = async (mentorId: string) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/admin/mentors/${mentorId}/system-name`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ system_name: systemNameInput }),
      });

      if (response.ok) {
        Alert.alert('✅ Success', 'System name updated successfully');
        setEditingSystemName(false);
        // Refresh mentor details
        fetchMentorDetails(mentorId);
        loadData();
      } else {
        const error = await response.json();
        Alert.alert('Error', error.detail || 'Failed to update system name');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update system name');
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant photo library permissions to upload images.');
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
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const saveBackgroundSettings = async (mentorId: string) => {
    try {
      setUploadingImage(true);
      const token = await AsyncStorage.getItem('authToken');
      
      const bgColorString = `rgb(${selectedBgColor.r}, ${selectedBgColor.g}, ${selectedBgColor.b})`;
      
      const payload: any = {
        background_color: bgColorString,
        background_image: selectedBgImage  // Always send, even if null (to delete)
      };

      console.log('Saving background settings:', {
        has_image: !!selectedBgImage,
        image_length: selectedBgImage ? selectedBgImage.length : 0,
        color: bgColorString
      });

      const response = await fetch(`${API_URL}/api/admin/mentors/${mentorId}/background`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        Alert.alert('✅ Success', 'Background settings saved successfully');
        setEditingBackground(false);
        fetchMentorDetails(mentorId);
        loadData();
      } else {
        const error = await response.json();
        Alert.alert('Error', error.detail || 'Failed to save background settings');
      }
    } catch (error) {
      console.error('Error saving background:', error);
      Alert.alert('Error', 'Failed to save background settings');
    } finally {
      setUploadingImage(false);
    }
  };

  const resetBackground = async (mentorId: string) => {
    Alert.alert(
      'Reset Background',
      'This will remove the custom background image and color. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('authToken');
              const response = await fetch(`${API_URL}/api/admin/mentors/${mentorId}/background`, {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  background_image: null,
                  background_color: null
                }),
              });

              if (response.ok) {
                Alert.alert('✅ Reset Complete', 'Background settings have been reset to default');
                setSelectedBgImage(null);
                setSelectedBgColor({ r: 0, g: 0, b: 0 });
                fetchMentorDetails(mentorId);
                loadData();
              } else {
                Alert.alert('Error', 'Failed to reset background');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to reset background');
            }
          },
        },
      ]
    );
  };

  const resetUserPassword = async (userId: string, userEmail: string, userName: string) => {
    const buttonKey = `reset-user-${userId}`;
    setButtonLoading(prev => ({...prev, [buttonKey]: true}));
    
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        
        // Show temporary password in modal
        setTempPasswordData({
          email: userEmail,
          password: data.temporary_password,
          userName: userName,
          userType: 'user'
        });
        setShowPasswordModal(true);
        
        loadData();
      } else {
        Alert.alert('Error', 'Failed to reset password');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to reset password');
    } finally {
      setButtonLoading(prev => ({...prev, [buttonKey]: false}));
    }
  };

  const resetMentorPassword = async (mentorId: string, mentorEmail: string, mentorName: string) => {
    const buttonKey = `reset-mentor-${mentorId}`;
    setButtonLoading(prev => ({...prev, [buttonKey]: true}));
    
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/admin/mentors/${mentorId}/reset-password`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        
        // Show temporary password in modal
        setTempPasswordData({
          email: mentorEmail,
          password: data.temporary_password,
          userName: mentorName,
          userType: 'mentor'
        });
        setShowPasswordModal(true);
        
        loadData();
      } else {
        Alert.alert('Error', 'Failed to reset mentor password');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to reset mentor password');
    } finally {
      setButtonLoading(prev => ({...prev, [buttonKey]: false}));
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={24} color="#ff4444" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
      >
        {/* STATS */}
        {stats && (
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{stats.total_users || 0}</Text>
              <Text style={styles.statLabel}>Total Users</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{stats.active_users || 0}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{stats.pending_approvals || 0}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
          </View>
        )}

        {/* REGISTERED USERS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👤 Registered Users ({users.length})</Text>
          
          {users.length > 0 ? (
            <View style={styles.list}>
              {users.map((user, idx) => {
                const isExpanded = expandedUserId === user._id;
                return (
                  <View key={idx} style={styles.userInfoCard}>
                    {/* Delete Button - Absolutely positioned to prevent parent interference */}
                    <Pressable
                      style={[
                        styles.quickDeleteBtn,
                        buttonLoading[`delete-user-${user._id}`] && styles.buttonDisabled
                      ]}
                      onPress={() => {
                        console.log('🔴 onPress FIRED:', user.email, user._id);
                        if (!buttonLoading[`delete-user-${user._id}`]) {
                          deleteUser(user._id, user.email);
                        }
                      }}
                      onPressIn={() => console.log('🟡 onPressIn FIRED:', user.email)}
                      onPressOut={() => console.log('🟢 onPressOut FIRED:', user.email)}
                      onLongPress={() => {
                        console.log('🔵 onLongPress FIRED:', user.email, user._id);
                        if (!buttonLoading[`delete-user-${user._id}`]) {
                          deleteUser(user._id, user.email);
                        }
                      }}
                      disabled={buttonLoading[`delete-user-${user._id}`]}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      pressRetentionOffset={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      android_ripple={{ color: '#fff', radius: 22 }}
                    >
                      {buttonLoading[`delete-user-${user._id}`] ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Ionicons name="trash" size={20} color="#fff" />
                      )}
                    </Pressable>
                    
                    <TouchableOpacity 
                      style={styles.userInfoHeader}
                      onPress={() => toggleUserDetails(user._id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="person-circle" size={20} color="#00D9FF" />
                      <View style={styles.userNameEmailContainer}>
                        {user.name && (
                          <Text style={styles.userInfoName}>{user.name}</Text>
                        )}
                        <Text style={styles.userInfoEmail}>{user.email}</Text>
                      </View>
                      <View style={[
                        styles.statusBadge,
                        { backgroundColor: 
                          user.status === 'active' ? '#4CAF50' : 
                          user.status === 'inactive' ? '#666' : '#ff9800' 
                        }
                      ]}>
                        <Text style={styles.statusBadgeText}>{user.status}</Text>
                      </View>
                      <Ionicons 
                        name={isExpanded ? "chevron-up" : "chevron-down"} 
                        size={20} 
                        color="#888" 
                        style={{ marginLeft: 8 }}
                      />
                    </TouchableOpacity>
                    
                    {isExpanded && (
                      <View style={styles.expandedContent}>
                        <View style={styles.userInfoRow}>
                          <Ionicons name="people" size={16} color="#888" />
                          <Text style={styles.userInfoLabel}>Mentor ID:</Text>
                          <Text style={styles.userInfoValue}>{user.mentor_id || 'N/A'}</Text>
                        </View>
                        
                        <View style={styles.userInfoRow}>
                          <Ionicons name="key" size={16} color="#888" />
                          <Text style={styles.userInfoLabel}>License Key:</Text>
                          <Text style={styles.userInfoValue}>{user.license_key || 'N/A'}</Text>
                        </View>
                        
                        {user.created_at && (
                          <View style={styles.userInfoRow}>
                            <Ionicons name="calendar" size={16} color="#888" />
                            <Text style={styles.userInfoLabel}>Joined:</Text>
                            <Text style={styles.userInfoValue}>
                              {new Date(user.created_at).toLocaleDateString()}
                            </Text>
                          </View>
                        )}
                        
                        <View style={styles.userInfoRow}>
                          <Ionicons name="card" size={16} color="#888" />
                          <Text style={styles.userInfoLabel}>Payment:</Text>
                          <View style={[
                            styles.paymentBadge,
                            { backgroundColor: user.payment_status === 'paid' ? '#4CAF50' : '#ff9800' }
                          ]}>
                            <Text style={styles.paymentBadgeText}>
                              {user.payment_status === 'paid' ? '✓ Paid' : 'Pending'}
                            </Text>
                          </View>
                        </View>
                        
                        {user.payment_date && (
                          <View style={styles.userInfoRow}>
                            <Ionicons name="time" size={16} color="#888" />
                            <Text style={styles.userInfoLabel}>Paid On:</Text>
                            <Text style={styles.userInfoValue}>
                              {new Date(user.payment_date).toLocaleDateString()}
                            </Text>
                          </View>
                        )}

                        {/* Account Actions */}
                        <View style={styles.userActions}>
                          {/* Reset Password Button */}
                          <Pressable
                            style={[styles.resetPasswordBtn, buttonLoading[`reset-user-${user._id}`] && styles.buttonDisabled]}
                            onPress={() => {
                              console.log('🔑 RESET PASSWORD BUTTON CLICKED for user:', user.email, user._id);
                              resetUserPassword(user._id, user.email, user.name);
                            }}
                            disabled={buttonLoading[`reset-user-${user._id}`]}
                          >
                            {buttonLoading[`reset-user-${user._id}`] ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <>
                                <Ionicons name="key" size={16} color="#fff" />
                                <Text style={styles.resetPasswordBtnText}>Reset Password</Text>
                              </>
                            )}
                          </Pressable>

                          {/* Delete User Button */}
                          <Pressable
                            style={({ pressed }) => [
                              styles.deleteBtn,
                              buttonLoading[`delete-user-${user._id}`] && styles.buttonDisabled,
                              pressed && styles.buttonPressed
                            ]}
                            onPress={() => {
                              console.log('🔴 DELETE BUTTON CLICKED for user:', user.email, user._id);
                              deleteUser(user._id, user.email);
                            }}
                            disabled={buttonLoading[`delete-user-${user._id}`]}
                          >
                            {buttonLoading[`delete-user-${user._id}`] ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <>
                                <Ionicons name="trash" size={16} color="#fff" />
                                <Text style={styles.deleteBtnText}>Delete User</Text>
                              </>
                            )}
                          </Pressable>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.noUsersText}>No registered users yet</Text>
          )}
        </View>

        {/* MENTOR IDs WITH USERS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            👥 Mentors with Users ({mentorsWithUsers.length})
          </Text>
          
          <TouchableOpacity style={styles.genBtn} onPress={generateMentor}>
            <Ionicons name="add-circle" size={24} color="#000" />
            <Text style={styles.genBtnText}>Generate Mentor ID</Text>
          </TouchableOpacity>

          {lastGenerated.mentor && (
            <View style={styles.lastGen}>
              <Text style={styles.lastGenLabel}>Last Generated:</Text>
              <TextInput
                style={styles.lastGenText}
                value={lastGenerated.mentor}
                editable={false}
                selectTextOnFocus={true}
              />
              <Text style={styles.hint}>👆 Tap to select & copy</Text>
            </View>
          )}

          {mentorsWithUsers.length > 0 ? (
            <View style={styles.list}>
              {mentorsWithUsers.slice(0, 10).map((mentor, idx) => (
                <TouchableOpacity 
                  key={idx} 
                  style={styles.listItem}
                  onPress={() => fetchMentorDetails(mentor)}
                >
                  <Ionicons name="person" size={16} color="#00D9FF" />
                  <Text style={styles.listItemText}>{mentor}</Text>
                  <View style={styles.userCountBadge}>
                    <Text style={styles.userCountText}>
                      {users.filter(u => u.mentor_id === mentor).length}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#888" style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>
              ))}
              {mentorsWithUsers.length > 10 && (
                <Text style={styles.moreText}>+ {mentorsWithUsers.length - 10} more</Text>
              )}
            </View>
          ) : (
            <Text style={styles.noUsersText}>No mentors with users yet</Text>
          )}
        </View>

        {/* PENDING MENTORS */}
        {pendingMentors.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⏳ Pending Mentor Approvals ({pendingMentors.length})</Text>
            {pendingMentors.map((mentor) => (
              <View key={mentor._id} style={styles.pendingMentorCard}>
                <View style={styles.pendingMentorInfo}>
                  <Text style={styles.pendingMentorName}>👤 {mentor.name}</Text>
                  <Text style={styles.pendingMentorDetail}>Company: {mentor.company_name}</Text>
                  <Text style={styles.pendingMentorDetail}>Email: {mentor.email}</Text>
                  <Text style={styles.pendingMentorDetail}>Phone: {mentor.phone}</Text>
                  <Text style={styles.pendingMentorDetail}>Social: {mentor.social_media}</Text>
                  <Text style={styles.pendingMentorDetail}>License Key: {mentor.license_key}</Text>
                </View>
                <View style={styles.pendingMentorActions}>
                  <TouchableOpacity
                    style={styles.approveBtn}
                    onPress={() => approveMentor(mentor._id)}
                  >
                    <Text style={styles.approveBtnText}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.declineBtn}
                    onPress={() => declineMentor(mentor._id)}
                  >
                    <Text style={styles.declineBtnText}>Decline</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteMentorBtn}
                    onPress={() => deleteMentor(mentor._id, mentor.email)}
                  >
                    <Ionicons name="trash" size={16} color="#fff" />
                    <Text style={styles.deleteMentorBtnText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* MENTORS WITHOUT USERS - DETAILED VIEW */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            📋 Mentors Without Users ({mentorsWithoutUsers.length})
          </Text>
          <Text style={styles.sectionSubtitle}>
            These mentors are approved and ready to have users assigned
          </Text>

          {mentorsWithoutUsers.length > 0 ? (
            <View style={styles.list}>
              {mentorsWithoutUsers.map((mentorId, idx) => {
                // Find the full mentor details from allMentors
                const currentMentor = allMentors.find((m: any) => m.mentor_id === mentorId);
                
                console.log(`Rendering mentor ${idx + 1}:`, mentorId, currentMentor ? 'FOUND' : 'NOT FOUND');
                
                if (!currentMentor) {
                  console.warn(`No details found for mentor: ${mentorId}`);
                  return null;
                }
                
                return (
                  <View key={idx} style={styles.mentorCard}>
                    <View style={styles.mentorCardHeader}>
                      <View style={styles.mentorIconContainer}>
                        <Ionicons name="person-outline" size={24} color="#00D9FF" />
                      </View>
                      <View style={styles.mentorCardInfo}>
                        <Text style={styles.mentorCardTitle}>{currentMentor.name || 'Unknown'}</Text>
                        <Text style={styles.mentorIdBadge}>{mentorId}</Text>
                      </View>
                      <View style={styles.emptyStatusBadge}>
                        <Text style={styles.emptyStatusText}>No Users</Text>
                      </View>
                    </View>
                    
                    <View style={styles.mentorCardDetails}>
                      <View style={styles.mentorDetailRow}>
                        <Ionicons name="mail-outline" size={14} color="#888" />
                        <Text style={styles.mentorDetailText}>{currentMentor.email || 'N/A'}</Text>
                      </View>
                      <View style={styles.mentorDetailRow}>
                        <Ionicons name="call-outline" size={14} color="#888" />
                        <Text style={styles.mentorDetailText}>{currentMentor.phone || 'N/A'}</Text>
                      </View>
                      <View style={styles.mentorDetailRow}>
                        <Ionicons name="logo-instagram" size={14} color="#888" />
                        <Text style={styles.mentorDetailText}>{currentMentor.social_media || 'N/A'}</Text>
                      </View>
                    </View>

                    <View style={styles.mentorActionButtons}>
                      {/* Reset Password Button */}
                      <TouchableOpacity 
                        style={[styles.actionButton, styles.resetPasswordButton, buttonLoading[`reset-mentor-${currentMentor._id}`] && styles.buttonDisabled]}
                        onPress={() => {
                          console.log('🔑 RESET PASSWORD PRESSED for mentor:', currentMentor.email);
                          console.log('Mentor ID:', currentMentor._id);
                          resetMentorPassword(currentMentor._id, currentMentor.email, currentMentor.name);
                        }}
                        disabled={buttonLoading[`reset-mentor-${currentMentor._id}`]}
                        activeOpacity={0.7}
                      >
                        {buttonLoading[`reset-mentor-${currentMentor._id}`] ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <Ionicons name="key-outline" size={18} color="#00D9FF" />
                            <Text style={[styles.actionButtonText, { color: '#00D9FF' }]}>Reset Password</Text>
                          </>
                        )}
                      </TouchableOpacity>

                      {/* Delete Mentor Button */}
                      <TouchableOpacity 
                        style={[styles.actionButton, styles.deleteButton, buttonLoading[`delete-mentor-${currentMentor._id}`] && styles.buttonDisabled]}
                        onPress={() => {
                          console.log('DELETE PRESSED for:', currentMentor.email);
                          console.log('Mentor ID:', currentMentor._id);
                          deleteMentor(currentMentor._id, currentMentor.email);
                        }}
                        disabled={buttonLoading[`delete-mentor-${currentMentor._id}`]}
                        activeOpacity={0.7}
                      >
                        {buttonLoading[`delete-mentor-${currentMentor._id}`] ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <Ionicons name="trash-outline" size={18} color="#FF4444" />
                            <Text style={[styles.actionButtonText, { color: '#FF4444' }]}>Delete Mentor</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.noUsersText}>All mentors have users assigned</Text>
          )}
        </View>

        {/* LICENSE KEYS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔑 License Keys ({licenses.length})</Text>
          
          <TouchableOpacity style={styles.genBtn} onPress={generateLicense}>
            <Ionicons name="add-circle" size={24} color="#000" />
            <Text style={styles.genBtnText}>Generate License Key</Text>
          </TouchableOpacity>

          {lastGenerated.license && (
            <View style={styles.lastGen}>
              <Text style={styles.lastGenLabel}>Last Generated:</Text>
              <TextInput
                style={styles.lastGenText}
                value={lastGenerated.license}
                editable={false}
                selectTextOnFocus={true}
              />
              <Text style={styles.hint}>👆 Tap to select & copy</Text>
            </View>
          )}

          <View style={styles.list}>
            {licenses.slice(0, 10).map((license, idx) => (
              <View key={idx} style={styles.listItem}>
                <Ionicons name="key" size={16} color="#00D9FF" />
                <Text style={styles.listItemText}>{license}</Text>
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={async () => {
                    await Clipboard.setStringAsync(license);
                    Alert.alert('Copied!', 'License key copied to clipboard');
                  }}
                >
                  <Ionicons name="copy-outline" size={18} color="#00D9FF" />
                </TouchableOpacity>
              </View>
            ))}
            {licenses.length > 10 && (
              <Text style={styles.moreText}>+ {licenses.length - 10} more</Text>
            )}
          </View>
        </View>

        {/* PENDING USERS */}
        {pendingUsers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⏳ Pending Approvals ({pendingUsers.length})</Text>
            {pendingUsers.map((user) => (
              <View key={user._id} style={styles.userCard}>
                <Text style={styles.userEmail}>{user.email}</Text>
                <View style={styles.userActions}>
                  <TouchableOpacity
                    style={styles.approveBtn}
                    onPress={() => approveUser(user._id)}
                  >
                    <Text style={styles.approveBtnText}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.declineBtn}
                    onPress={() => declineUser(user._id)}
                  >
                    <Text style={styles.declineBtnText}>Decline</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* MANUAL SIGNAL SENDING */}
        <View style={styles.section}>
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

              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Signal Duration *</Text>
                <View style={styles.durationButtons}>
                  {[
                    { label: '30 Sec', value: 30 },
                    { label: '1 Min', value: 60 },
                    { label: '5 Min', value: 300 },
                    { label: '15 Min', value: 900 },
                  ].map(duration => (
                    <TouchableOpacity
                      key={duration.value}
                      style={[
                        styles.durationBtn, 
                        signalForm.duration_seconds === duration.value && styles.durationBtnActive
                      ]}
                      onPress={() => setSignalForm(prev => ({ ...prev, duration_seconds: duration.value }))}
                    >
                      <Text style={[
                        styles.durationText, 
                        signalForm.duration_seconds === duration.value && styles.durationTextActive
                      ]}>
                        {duration.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
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
                    <Text style={styles.sendSignalBtnText}>Send Signal to All Users</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* MANUAL NEWS EVENT */}
        <View style={styles.section}>
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
                    <Text style={styles.sendSignalBtnText}>Send News to All Users</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>


        {/* BROKER AFFILIATE MANAGEMENT */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🔗 Broker Affiliates ({brokers.length})</Text>
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => setShowBrokerForm(!showBrokerForm)}
            >
              <Ionicons name={showBrokerForm ? "close" : "add"} size={24} color="#00D9FF" />
            </TouchableOpacity>
          </View>

          {showBrokerForm && (
            <View style={styles.formContainer}>
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Broker Name *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Exness, IC Markets"
                  placeholderTextColor="#666"
                  value={brokerForm.broker_name}
                  onChangeText={(text) => setBrokerForm(prev => ({ ...prev, broker_name: text }))}
                />
              </View>

              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Affiliate Link *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="https://..."
                  placeholderTextColor="#666"
                  value={brokerForm.affiliate_link}
                  onChangeText={(text) => setBrokerForm(prev => ({ ...prev, affiliate_link: text }))}
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>

              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Description (Optional)</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Broker benefits, special offers..."
                  placeholderTextColor="#666"
                  value={brokerForm.description}
                  onChangeText={(text) => setBrokerForm(prev => ({ ...prev, description: text }))}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <TouchableOpacity
                style={styles.pickImageBtn}
                onPress={pickBrokerImage}
              >
                <Ionicons name="image" size={20} color="#00D9FF" />
                <Text style={styles.pickImageText}>
                  {brokerForm.broker_image ? 'Image Selected' : 'Pick Broker Logo (Optional)'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sendSignalBtn, addingBroker && styles.buttonDisabled]}
                onPress={addBroker}
                disabled={addingBroker}
              >
                {addingBroker ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="add-circle" size={20} color="#fff" />
                    <Text style={styles.sendSignalBtnText}>Add Broker & Notify Users</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* List of existing brokers */}
          {loadingBrokers ? (
            <ActivityIndicator color="#00D9FF" style={{ marginTop: 16 }} />
          ) : (
            brokers.map((broker) => (
              <View key={broker._id} style={styles.brokerCard}>
                <View style={styles.brokerHeader}>
                  <View>
                    <Text style={styles.brokerName}>{broker.broker_name}</Text>
                    <Text style={styles.brokerLink} numberOfLines={1}>
                      {broker.affiliate_link}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => deleteBroker(broker._id, broker.broker_name)}
                  >
                    <Ionicons name="trash" size={20} color="#ff4444" />
                  </TouchableOpacity>
                </View>
                {broker.description && (
                  <Text style={styles.brokerDescription}>{broker.description}</Text>
                )}
                <Text style={styles.brokerDate}>
                  Added: {new Date(broker.created_at).toLocaleDateString()}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* MENTOR DETAILS MODAL */}
      {selectedMentor && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>👤 {selectedMentor}</Text>
              <TouchableOpacity onPress={closeMentorDetails}>
                <Ionicons name="close-circle" size={32} color="#ff4444" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalScrollView}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={styles.modalScrollContent}
            >
            {/* Mentor Information */}
            <View style={styles.mentorInfoSection}>
              <Text style={styles.sectionHeaderText}>📋 Mentor Information</Text>
              
              {mentorDetails && (
                <View style={styles.mentorInfoDisplay}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Mentor ID:</Text>
                    <Text style={styles.infoValue}>{mentorDetails.mentor_id || 'Not assigned yet'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Name:</Text>
                    <Text style={styles.infoValue}>{mentorDetails.name || 'N/A'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Email:</Text>
                    <Text style={styles.infoValue}>{mentorDetails.email || 'N/A'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Phone:</Text>
                    <Text style={styles.infoValue}>{mentorDetails.phone || 'N/A'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Social Media:</Text>
                    <Text style={styles.infoValue}>{mentorDetails.social_media || 'N/A'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Status:</Text>
                    <Text style={styles.infoValue}>{mentorDetails.status || 'N/A'}</Text>
                  </View>
                </View>
              )}
            </View>

            {loadingDetails ? (
              <ActivityIndicator size="large" color="#00D9FF" style={{ marginVertical: 20 }} />
            ) : mentorDetails ? (
              <ScrollView style={styles.modalScroll}>
                <View style={styles.modalStat}>
                  <Text style={styles.modalStatLabel}>Total Users:</Text>
                  <Text style={styles.modalStatValue}>{mentorDetails.userCount}</Text>
                </View>

                {mentorDetails.userCount > 0 ? (
                  <View style={styles.usersSection}>
                    <Text style={styles.usersSectionTitle}>Users & License Keys:</Text>
                    {mentorDetails.users.map((user: any, idx: number) => (
                      <View key={idx} style={styles.userDetailCard}>
                        <View style={styles.userDetailRow}>
                          <Ionicons name="mail" size={14} color="#00D9FF" />
                          <Text style={styles.userDetailText}>{user.email}</Text>
                        </View>
                        <View style={styles.userDetailRow}>
                          <Ionicons name="key" size={14} color="#FFD700" />
                          <Text style={styles.userDetailKey}>{user.license_key}</Text>
                        </View>
                        <View style={styles.userDetailRow}>
                          <Ionicons name="checkmark-circle" size={14} color={user.status === 'active' ? '#4CAF50' : '#ff9800'} />
                          <Text style={styles.userDetailStatus}>{user.status}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.noUsersText}>No users registered with this mentor ID yet.</Text>
                )}
                
                {/* Action Buttons */}
                {mentorDetails && (
                  <View style={styles.mentorModalActions}>
                    {/* Reset Password Button */}
                    <TouchableOpacity 
                      style={[styles.modalActionBtn, styles.resetPasswordActionBtn, buttonLoading[`reset-mentor-${mentorDetails._id}`] && styles.buttonDisabled]}
                      onPress={() => {
                        resetMentorPassword(mentorDetails._id, mentorDetails.email, mentorDetails.name);
                        closeMentorDetails();
                      }}
                      disabled={buttonLoading[`reset-mentor-${mentorDetails._id}`]}
                    >
                      {buttonLoading[`reset-mentor-${mentorDetails._id}`] ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="key" size={20} color="#fff" />
                          <Text style={styles.modalActionBtnText}>Reset Password</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    {/* Deactivate Button */}
                    <TouchableOpacity 
                      style={[styles.modalActionBtn, styles.deactivateActionBtn, buttonLoading[`deactivate-mentor-${mentorDetails._id}`] && styles.buttonDisabled]}
                      onPress={() => {
                        deactivateMentor(mentorDetails._id, mentorDetails.email);
                        closeMentorDetails();
                      }}
                      disabled={buttonLoading[`deactivate-mentor-${mentorDetails._id}`]}
                    >
                      {buttonLoading[`deactivate-mentor-${mentorDetails._id}`] ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="ban" size={20} color="#fff" />
                          <Text style={styles.modalActionBtnText}>Deactivate</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    {/* Delete Button */}
                    <TouchableOpacity 
                      style={[styles.modalActionBtn, styles.deleteActionBtn, buttonLoading[`delete-mentor-${mentorDetails._id}`] && styles.buttonDisabled]}
                      onPress={() => {
                        deleteMentor(mentorDetails._id, mentorDetails.email);
                        closeMentorDetails();
                      }}
                      disabled={buttonLoading[`delete-mentor-${mentorDetails._id}`]}
                    >
                      {buttonLoading[`delete-mentor-${mentorDetails._id}`] ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="trash" size={20} color="#fff" />
                          <Text style={styles.modalActionBtnText}>Delete Mentor</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            ) : null}
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
              <Text style={styles.passwordLabel}>{tempPasswordData.userType === 'mentor' ? 'Mentor' : 'User'}:</Text>
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
                  {tempPasswordData.userType === 'mentor' ? 'Mentor' : 'User'} {tempPasswordData.userName} must change this password on first login.
                </Text>
              </View>
              
              <Text style={styles.instructionText}>
                ⚠️ This password is shown only once. Please share it with the {tempPasswordData.userType} now.
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

      {/* Confirmation Modal */}
      <ConfirmModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        confirmStyle={confirmModal.confirmStyle}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, visible: false }))}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00D9FF',
  },
  logoutBtn: {
    padding: 8,
  },
  scroll: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#00D9FF',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 5,
  },
  section: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  toggleBtn: {
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#00D9FF',
  },
  toggleBtnText: {
    color: '#00D9FF',
    fontSize: 12,
    fontWeight: '600',
  },
  genBtn: {
    backgroundColor: '#00D9FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    gap: 10,
    marginBottom: 15,
  },
  genBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  lastGen: {
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#00D9FF',
  },
  lastGenLabel: {
    color: '#00D9FF',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  lastGenText: {
    backgroundColor: '#000',
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    padding: 12,
    borderRadius: 8,
    textAlign: 'center',
  },
  hint: {
    color: '#888',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 5,
  },
  list: {
    gap: 8,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 8,
    gap: 10,
  },
  listItemText: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  copyButton: {
    padding: 8,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#00D9FF',
  },
  userCountBadge: {
    backgroundColor: '#00D9FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  userCountText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyMentorItem: {
    opacity: 0.7,
  },
  emptyMentorText: {
    color: '#888',
  },
  emptyBadge: {
    backgroundColor: '#333',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#555',
  },
  emptyBadgeText: {
    color: '#888',
    fontSize: 11,
    fontWeight: '600',
  },
  moreText: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
  userCard: {
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  userEmail: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 10,
  },
  userActions: {
    flexDirection: 'row',
    gap: 10,
  },
  pendingMentorCard: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  pendingMentorInfo: {
    marginBottom: 12,
  },
  pendingMentorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  pendingMentorDetail: {
    fontSize: 14,
    color: '#888',
    marginBottom: 4,
  },
  pendingMentorActions: {
    flexDirection: 'row',
    gap: 10,
  },
  approveBtn: {
    flex: 1,
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  approveBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  declineBtn: {
    flex: 1,
    backgroundColor: '#ff4444',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  declineBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  deleteMentorBtn: {
    flex: 1,
    backgroundColor: '#b71c1c',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  deleteMentorBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  userInfoCard: {
    position: 'relative',
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 10,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#00D9FF',
  },
  userInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  userInfoHeaderMain: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  quickDeleteBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#dc3545',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#dc3545',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 10,
    zIndex: 999,
  },
  expandedContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  userNameEmailContainer: {
    flex: 1,
    marginLeft: 8,
  },
  userInfoName: {
    color: '#00D9FF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  userInfoEmail: {
    color: '#aaa',
    fontSize: 13,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  paymentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  paymentBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  userInfoLabel: {
    color: '#888',
    fontSize: 13,
    width: 100,
  },
  userInfoValue: {
    color: '#fff',
    fontSize: 13,
    flex: 1,
    fontFamily: 'monospace',
  },
  userActions: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
    gap: 10,
    flexWrap: 'wrap',
  },
  activateBtn: {
    flex: 1,
    minWidth: 120,
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 6,
  },
  activateBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  deactivateBtn: {
    flex: 1,
    minWidth: 120,
    backgroundColor: '#ff4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 6,
  },
  deactivateBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  resetPasswordBtn: {
    flex: 1,
    minWidth: 120,
    backgroundColor: '#FF9800',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 6,
  },
  resetPasswordBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  deleteBtn: {
    flex: 1,
    minWidth: 100,
    backgroundColor: '#d32f2f',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 6,
  },
  deleteBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
    borderWidth: 2,
    borderColor: '#00D9FF',
  },
  modalScrollView: {
    maxHeight: '100%',
  },
  modalScrollContent: {
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00D9FF',
    flex: 1,
  },
  modalScroll: {
    maxHeight: 400,
  },
  modalStat: {
    backgroundColor: '#000',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalStatLabel: {
    color: '#888',
    fontSize: 16,
  },
  modalStatValue: {
    color: '#00D9FF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  usersSection: {
    marginTop: 10,
  },
  usersSectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  userDetailCard: {
    backgroundColor: '#000',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#00D9FF',
  },
  userDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  userDetailText: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  userDetailKey: {
    color: '#FFD700',
    fontSize: 13,
    fontFamily: 'monospace',
    flex: 1,
  },
  userDetailStatus: {
    color: '#4CAF50',
    fontSize: 13,
    textTransform: 'capitalize',
  },
  noUsersText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
  systemNameSection: {
    marginBottom: 15,
    padding: 15,
    backgroundColor: '#111',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#00D9FF',
  },
  systemNameLabel: {
    color: '#888',
    fontSize: 14,
    marginBottom: 8,
  },
  systemNameDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  systemNameValue: {
    color: '#00D9FF',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  systemNameEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#222',
    borderRadius: 6,
  },
  systemNameEditText: {
    color: '#00D9FF',
    fontSize: 13,
    fontWeight: '600',
  },
  systemNameEdit: {
    flexDirection: 'column',
    gap: 10,
  },
  systemNameInput: {
    backgroundColor: '#000',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00D9FF',
    fontSize: 16,
  },
  systemNameActions: {
    flexDirection: 'row',
    gap: 10,
  },
  systemNameSaveBtn: {
    flex: 1,
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  systemNameCancelBtn: {
    flex: 1,
    backgroundColor: '#666',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backgroundSection: {
    marginBottom: 15,
    padding: 15,
    backgroundColor: '#111',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  backgroundHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  backgroundLabel: {
    color: '#FF9800',
    fontSize: 16,
    fontWeight: 'bold',
  },
  editBackgroundBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#222',
    borderRadius: 6,
  },
  editBackgroundText: {
    color: '#00D9FF',
    fontSize: 13,
    fontWeight: '600',
  },
  backgroundEdit: {
    gap: 15,
  },
  imageUploadSection: {
    gap: 10,
  },
  imageUploadLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#222',
    padding: 15,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#00D9FF',
    borderStyle: 'dashed',
    gap: 10,
  },
  uploadBtnText: {
    color: '#00D9FF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  imagePreview: {
    position: 'relative',
    marginTop: 10,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 20,
  },
  colorPickerSection: {
    gap: 10,
  },
  colorPickerLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  colorSliders: {
    gap: 15,
  },
  colorSliderRow: {
    gap: 5,
  },
  colorLabel: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  colorPreview: {
    height: 60,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 5,
  },
  colorPreviewText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
  },
  backgroundActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  backgroundSaveBtn: {
    flex: 1,
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 6,
  },
  backgroundSaveBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  backgroundResetBtn: {
    flex: 1,
    backgroundColor: '#FF9800',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 6,
  },
  backgroundResetBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  backgroundCancelBtn: {
    flex: 1,
    backgroundColor: '#666',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 6,
  },
  backgroundCancelBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  backgroundDisplay: {
    gap: 10,
  },
  currentBgPreview: {
    gap: 8,
  },
  currentBgImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
  },
  currentBgLabel: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
  },
  noBgText: {
    color: '#666',
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  currentColorDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    backgroundColor: '#000',
    borderRadius: 8,
  },
  currentColorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  currentColorText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'monospace',
  },
  accessKeySection: {
    marginTop: 20,
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  subSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF9800',
    marginBottom: 12,
  },
  accessKeyBtn: {
    backgroundColor: '#FF9800',
  },
  accessKeysDisplay: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#0a0a0a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  accessKeysTitle: {
    fontSize: 14,
    color: '#FF9800',
    fontWeight: '600',
    marginBottom: 12,
  },
  accessKeyText: {
    backgroundColor: '#1a1a1a',
    color: '#00D9FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    fontSize: 13,
    fontFamily: 'monospace',
    borderWidth: 1,
    borderColor: '#333',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  mentorCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'visible',
  },
  mentorCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  mentorIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  mentorCardInfo: {
    flex: 1,
  },
  mentorCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  mentorIdBadge: {
    fontSize: 12,
    color: '#00D9FF',
    fontWeight: '600',
  },
  emptyStatusBadge: {
    backgroundColor: 'rgba(136, 136, 136, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  emptyStatusText: {
    color: '#888',
    fontSize: 11,
    fontWeight: '600',
  },
  mentorCardDetails: {
    marginBottom: 12,
  },
  mentorDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  mentorDetailText: {
    color: '#ccc',
    fontSize: 13,
    marginLeft: 8,
  },
  actionButton: {
    backgroundColor: '#222',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#00D9FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewDetailsButton: {
    borderColor: '#00D9FF',
  },
  deactivateButton: {
    borderColor: '#FF9800',
  },
  deleteButton: {
    borderColor: '#FF4444',
  },
  actionButtonText: {
    color: '#00D9FF',
    fontSize: 15,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  mentorActionButtons: {
    marginTop: 16,
  },
  // Manual Signal & Broker styles
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  toggleButton: {
    padding: 8,
  },
  formContainer: {
    backgroundColor: '#1a1f3a',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  inputRow: {
    marginBottom: 16,
  },
  inputLabel: {
    color: '#888',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: '#0a0e27',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 14,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#0a0e27',
    borderRadius: 8,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  segmentButtonActive: {
    backgroundColor: '#00D9FF',
  },
  segmentText: {
    color: '#888',
    fontSize: 14,
    fontWeight: 'bold',
  },
  segmentTextActive: {
    color: '#0a0e27',
  },
  timeframeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  timeframeBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#0a0e27',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    alignItems: 'center',
  },
  timeframeBtnActive: {
    backgroundColor: '#00D9FF',
    borderColor: '#00D9FF',
  },
  timeframeText: {
    color: '#888',
    fontSize: 14,
    fontWeight: 'bold',
  },
  timeframeTextActive: {
    color: '#0a0e27',
  },
  durationButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  durationBtn: {
    flex: 1,
    minWidth: '48%',
    paddingVertical: 12,
    backgroundColor: '#0a0e27',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    alignItems: 'center',
  },
  durationBtnActive: {
    backgroundColor: '#00D9FF',
    borderColor: '#00D9FF',
  },
  durationText: {
    color: '#888',
    fontSize: 14,
    fontWeight: 'bold',
  },
  durationTextActive: {
    color: '#0a0e27',
  },
  impactButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  impactBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#0a0e27',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    alignItems: 'center',
  },
  impactBtnActive: {
    borderColor: '#00D9FF',
  },
  impactBtnHigh: {
    backgroundColor: '#FF4444',
    borderColor: '#FF4444',
  },
  impactBtnMedium: {
    backgroundColor: '#FFA500',
    borderColor: '#FFA500',
  },
  impactBtnLow: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  impactText: {
    color: '#888',
    fontSize: 14,
    fontWeight: 'bold',
  },
  impactTextActive: {
    color: '#fff',
  },

  sendSignalBtn: {
    backgroundColor: '#00D9FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  sendSignalBtnText: {
    color: '#0a0e27',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pickImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#00D9FF',
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  pickImageText: {
    color: '#00D9FF',
    fontSize: 14,
    fontWeight: '600',
  },
  brokerCard: {
    backgroundColor: '#1a1f3a',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  brokerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  brokerName: {
    color: '#00D9FF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  brokerLink: {
    color: '#888',
    fontSize: 12,
    maxWidth: 250,
  },
  brokerDescription: {
    color: '#aaa',
    fontSize: 13,
    marginTop: 8,
    lineHeight: 18,
  },
  brokerDate: {
    color: '#666',
    fontSize: 11,
    marginTop: 8,
    fontStyle: 'italic',
  },
  
  // Password Modal styles (same as mentor dashboard)
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
  
  // Mentor Modal Action Buttons
  mentorModalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  modalActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  resetPasswordActionBtn: {
    backgroundColor: '#00D9FF',
  },
  deactivateActionBtn: {
    backgroundColor: '#FFA500',
  },
  deleteActionBtn: {
    backgroundColor: '#FF4444',
  },
  modalActionBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
