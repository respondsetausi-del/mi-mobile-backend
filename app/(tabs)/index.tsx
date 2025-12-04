import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Animated,
  Modal,
  Linking,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useEAStore } from '../../store/eaStore';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import AddEAModal from '../../components/AddEAModal';
import RemoveEAModal from '../../components/RemoveEAModal';
import SymbolsModal from '../../components/SymbolsModal';
import BrokersModal from '../../components/BrokersModal';
import { showSignalNotification, useNotifications } from '../../hooks/useNotifications';
import FloatingBubble from '../../components/FloatingBubble';
import { useSignalQueue } from '../../hooks/useSignalQueue';
import * as TaskManager from 'expo-task-manager';
import { registerBackgroundFetch, unregisterBackgroundFetch, sendTestNotification } from '../../services/backgroundService';
import * as BackgroundFetch from 'expo-background-fetch';
import UserMenu from '../../components/UserMenu';

const SIGNAL_TASK = 'background-signal-task';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || '';

export default function HomeScreen() {
  console.log('🏠 HomeScreen rendering...');
  const { eas, selectedEAId, fetchEAs, fetchQuotes, toggleEAStatus } = useEAStore();
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');
  const [showFloatingBubble, setShowFloatingBubble] = useState(false);
  
  // Signal queue for floating bubble
  const { currentSignal, queueLength, addSignal, closeCurrentSignal, clearQueue } = useSignalQueue();
  
  // Timeout for loading to prevent infinite loading
  useEffect(() => {
    const loadingTimeout = setTimeout(() => {
      if (loading) {
        console.log('⚠️ Loading timeout - forcing load complete');
        setLoading(false);
        setInitialLoad(false);
      }
    }, 10000); // 10 second timeout
    
    return () => clearTimeout(loadingTimeout);
  }, [loading]);
  const [showSymbolsModal, setShowSymbolsModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [previousSignal, setPreviousSignal] = useState<string>('NEUTRAL');
  const [systemName, setSystemName] = useState('MI');
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [backgroundColor, setBackgroundColor] = useState<string | null>(null);
  const [backgroundKey, setBackgroundKey] = useState(Date.now()); // For forcing image reload
  
  // Manual signals from mentor/admin
  const [manualSignal, setManualSignal] = useState<any>(null);
  
  // Broker affiliates
  const [brokers, setBrokers] = useState<any[]>([]);
  const [showBrokers, setShowBrokers] = useState(false);

  // Custom Indicators from mentor
  const [customIndicators, setCustomIndicators] = useState<any[]>([]);
  const [selectedIndicatorId, setSelectedIndicatorId] = useState<string | null>(null);
  const [showIndicatorsModal, setShowIndicatorsModal] = useState(false);
  const [loadingIndicators, setLoadingIndicators] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false); // Track if user is actively monitoring indicator
  
  // Load monitoring state and selected symbol on mount
  useEffect(() => {
    const loadSavedState = async () => {
      try {
        const savedMonitoring = await AsyncStorage.getItem('isMonitoring');
        const savedSymbol = await AsyncStorage.getItem('selectedSymbol');
        
        if (savedMonitoring !== null) {
          const monitoring = JSON.parse(savedMonitoring);
          console.log('📱 Restored monitoring state:', monitoring);
          setIsMonitoring(monitoring);
        }
        
        if (savedSymbol !== null) {
          console.log('📱 Restored selected symbol:', savedSymbol);
          setSelectedSymbol(savedSymbol);
        }
      } catch (error) {
        console.error('Error loading saved state:', error);
      }
    };
    loadSavedState();
  }, []);
  
  // Market news
  const [news, setNews] = useState<any[]>([]);
  const [showNews, setShowNews] = useState(false);
  const [upcomingNewsAlert, setUpcomingNewsAlert] = useState<any>(null); // For 10-min alerts
  
  const [glowAnimation] = useState(new Animated.Value(0));
  const { expoPushToken, notification } = useNotifications();

  useEffect(() => {
    const initializeApp = async () => {
      console.log('🚀 Starting app initialization...');
      setLoadingMessage('Loading profile...');
      
      try {
        // Fast initialization with timeout
        const initPromise = Promise.all([
          fetchQuotes().catch(err => console.log('Quotes failed, continuing...')),
          fetchUserProfile().catch(err => console.log('Profile failed, continuing...')),
        ]);
        
        // Race between initialization and timeout
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Initialization timeout')), 8000)
        );
        
        await Promise.race([initPromise, timeoutPromise]);
        console.log('✅ App initialized successfully');
        
      } catch (error) {
        console.log('⚠️ Initialization timeout, loading app anyway');
      } finally {
        setLoading(false);
        setInitialLoad(false);
      }
    };

    if (initialLoad) {
      initializeApp();
    }
  }, [initialLoad]);

  useEffect(() => {
    if (!initialLoad) {
      loadData();
      fetchSystemName();
      fetchManualSignals(); // Fetch manual signals on mount
      fetchBrokers(); // Fetch brokers on mount
      fetchNews(); // Fetch news on mount
      fetchUpcomingNewsAlerts(); // Fetch news alerts on mount
      fetchCustomIndicators(); // Fetch custom indicators on mount
      
      // Fast refresh for critical data (EAs and quotes)
      const fastInterval = setInterval(() => {
        fetchEAs();
        fetchQuotes();
      }, 5000); // Every 5 seconds
      
      // Medium refresh for signals and alerts
      const mediumInterval = setInterval(() => {
        fetchManualSignals();
        fetchUpcomingNewsAlerts(); // Check for upcoming news alerts
        fetchCustomIndicators(); // Refresh indicators and their signals
      }, 10000); // Every 10 seconds
      
      // Slow refresh for less critical data
      const slowInterval = setInterval(() => {
        fetchSystemName();
        fetchBrokers();
        fetchNews();
      }, 30000); // Every 30 seconds
      
      return () => {
        clearInterval(fastInterval);
        clearInterval(mediumInterval);
        clearInterval(slowInterval);
      };
    }
  }, [initialLoad]);

  const fetchManualSignals = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch(`${API_URL}/api/user/signals/latest`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.signal) {
          console.log('🔴 Manual signal received:', data.signal.signal_type, 'for', data.signal.symbol);
          setManualSignal(data.signal);
          
          // Add manual signal to queue (high priority, higher duration if specified)
          addSignal({
            signal: data.signal.signal_type,
            symbol: data.signal.symbol,
            indicator: data.signal.indicator || 'Manual',
            price: 0,
            candle_pattern: data.signal.candle_pattern || '',
            duration: data.signal.duration || 45, // Manual signals get 45 seconds by default
          });
        } else {
          console.log('🟢 No manual signals active');
          setManualSignal(null);
        }
      }
    } catch (error) {
      console.error('Error fetching manual signals:', error);
    }
  };

  const fetchBrokers = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch(`${API_URL}/api/user/brokers`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🔗 Brokers received:', data.brokers?.length || 0);
        setBrokers(data.brokers || []);
      }
    } catch (error) {
      console.error('Error fetching brokers:', error);
    }
  };

  const fetchNews = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch(`${API_URL}/api/user/news`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📰 News received:', data.news?.length || 0);
        setNews(data.news || []);
      }
    } catch (error) {
      console.error('Error fetching news:', error);
    }
  };


  const fetchCustomIndicators = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch(`${API_URL}/api/user/mentor-indicators`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📊 Custom indicators received:', data.indicators?.length || 0);
        setCustomIndicators(data.indicators || []);
        setSelectedIndicatorId(data.selected_indicator_id || null);
      }
    } catch (error) {
      console.error('Error fetching custom indicators:', error);
    }
  };

  const selectIndicator = async (indicatorId: string) => {
    setLoadingIndicators(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch(`${API_URL}/api/user/select-indicator`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ indicator_id: indicatorId }),
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedIndicatorId(indicatorId);
        Alert.alert('Success', `Now following: ${data.indicator_name}\nCurrent signal: ${data.current_signal}`);
        setShowIndicatorsModal(false);
      } else {
        const error = await response.json();
        Alert.alert('Error', error.detail || 'Failed to select indicator');
      }
    } catch (error) {
      console.error('Error selecting indicator:', error);
      Alert.alert('Error', 'Failed to select indicator');
    } finally {
      setLoadingIndicators(false);
    }
  };



  const fetchUpcomingNewsAlerts = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch(`${API_URL}/api/user/upcoming-news-alerts`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const alerts = data.alerts || [];
        
        if (alerts.length > 0) {
          // Show the first upcoming alert (highest priority)
          const alert = alerts[0];
          console.log('🚨 News Alert:', alert.title, '-', alert.minutes_until, 'min');
          setUpcomingNewsAlert(alert);
        } else {
          setUpcomingNewsAlert(null);
        }
      }
    } catch (error) {
      console.error('Error fetching news alerts:', error);
    }
  };


  const fetchSystemName = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      
      console.log('=== FETCHING SYSTEM NAME & BACKGROUND ===');
      console.log('Has token:', !!token);
      console.log('API_URL:', API_URL);
      
      if (token) {
        const url = `${API_URL}/api/user/mentor-info`;
        console.log('Fetching from:', url);
        
        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        
        console.log('Mentor info response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('=== MENTOR INFO DATA ===');
          console.log('Full response:', JSON.stringify(data, null, 2));
          console.log('system_name:', data.system_name);
          console.log('background_image type:', typeof data.background_image);
          console.log('background_image length:', data.background_image ? data.background_image.length : 0);
          console.log('background_image preview:', data.background_image ? data.background_image.substring(0, 100) + '...' : 'null');
          console.log('background_color:', data.background_color);
          
          if (data.system_name) {
            const newName = data.system_name;
            console.log('Current system name:', systemName);
            console.log('New system name:', newName);
            
            // Force update even if the same
            if (systemName !== newName) {
              console.log('⚡ System name changed! Updating to:', newName);
              setSystemName(newName);
            } else {
              console.log('✓ System name unchanged:', newName);
            }
          } else {
            console.log('No system name set, using default');
            setSystemName('MI Mobile Indicator');
          }
          
          // Update background settings
          if (data.background_image) {
            console.log('🖼️ Background image found!');
            console.log('   - Current backgroundImage:', backgroundImage ? 'SET' : 'NULL');
            console.log('   - New backgroundImage length:', data.background_image.length);
            // Force update if image changed
            if (backgroundImage !== data.background_image) {
              console.log('⚡⚡⚡ BACKGROUND IMAGE CHANGED! Updating...');
              setBackgroundImage(data.background_image);
              setBackgroundKey(Date.now()); // Force image reload
              console.log('   - New key:', Date.now());
            } else {
              console.log('✓ Background image unchanged');
            }
          } else {
            console.log('🖼️ No background image in response (will use default)');
            if (backgroundImage !== null) {
              console.log('⚡⚡⚡ BACKGROUND IMAGE REMOVED! Reverting to default...');
              setBackgroundImage(null);
              setBackgroundKey(Date.now()); // Force reload to default image
              console.log('   - Cleared custom image, using default');
            } else {
              console.log('✓ Already using default image');
            }
          }
          
          if (data.background_color) {
            console.log('🎨 Background color found:', data.background_color);
            if (backgroundColor !== data.background_color) {
              console.log('⚡ Background color changed!');
              setBackgroundColor(data.background_color);
            }
          } else {
            console.log('🎨 No background color in response');
            if (backgroundColor !== null) {
              console.log('⚡ Background color cleared');
              setBackgroundColor(null);
            }
          }
        } else {
          console.log('Failed to fetch mentor info, status:', response.status);
          const errorText = await response.text();
          console.log('Error response:', errorText);
        }
      } else {
        console.log('No auth token found');
      }
    } catch (error) {
      console.log('Error fetching system name:', error);
      console.log('Error details:', JSON.stringify(error));
      // Keep default "MI Mobile Indicator" if fetch fails
    }
  };

  const fetchUserProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch(`${API_URL}/api/user/profile`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ User profile loaded:', data.username || 'Unknown');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  // Use EA signals filtered by selected symbol (from Signals tab)
  // Match both "EUR/USD" and "EURUSD" formats
  const normalizeSymbol = (symbol: string) => symbol?.replace(/[\/\-]/g, '').toUpperCase();
  const selectedEA = eas.find(ea => {
    const eaSymbol = normalizeSymbol(ea.config?.symbol);
    const selected = normalizeSymbol(selectedSymbol);
    return eaSymbol === selected;
  });
  const symbolSignal = selectedEA?.current_signal || 'NEUTRAL';
  
  // Active signal comes from the selected EA
  const activeSignal = selectedEA?.current_signal || 'NEUTRAL';

  // Log when floating bubble data changes
  useEffect(() => {
    if (selectedEA && isMonitoring && symbolSignal !== 'NEUTRAL') {
      console.log('🔴 FLOATING BUBBLE: Showing EA signal -', symbolSignal, 'for', selectedEA.config?.symbol);
    } else if (selectedEA && isMonitoring) {
      console.log('🟡 EA selected but signal is NEUTRAL:', selectedEA.config?.symbol);
    } else {
      console.log('⚫ FLOATING BUBBLE: Hidden (no monitoring or no EA selected)');
    }
  }, [selectedEA, isMonitoring, symbolSignal]);

  // Detect signal changes and add to queue (now using EA signals)
  useEffect(() => {
    // Only detect signal changes when monitoring is ACTIVE
    if (isMonitoring && selectedSymbol && selectedEA) {
      const signalType = selectedEA.current_signal;
      
      console.log('🔍 Checking signal:', {
        current: signalType,
        previous: previousSignal,
        ea: selectedEA.name,
        monitoring: isMonitoring,
        timestamp: new Date().toLocaleTimeString()
      });
      
      // Check if this is a new signal (different from previous)
      if (signalType !== previousSignal) {
        console.log('🔔 NEW SIGNAL DETECTED! Changed from', previousSignal, 'to', signalType);
        
        // If signal changed TO NEUTRAL while monitoring, clear bubbles
        if (signalType === 'NEUTRAL') {
          console.log('⚪ Signal changed to NEUTRAL - clearing bubble and queue');
          closeCurrentSignal(); // Close current bubble
          clearQueue(); // Clear all queued signals
        } else {
          // Add BUY/SELL signal to queue
          try {
            // Add to signal queue
            addSignal({
              signal: signalType,
              symbol: selectedEA.config?.symbol || selectedSymbol,
              indicator: selectedEA.name || '',
              price: selectedEA.last_price || 0,
              candle_pattern: '',
              duration: 30,
            });
            
            console.log('✅ Signal added to queue:', signalType);
            
            // Show push notification
            showSignalNotification(signalType, selectedEA.config?.symbol || selectedSymbol);
            triggerGlowAnimation();
          } catch (error) {
            console.error('❌ Error processing signal:', error);
          }
        }
        
        // Always update previous signal
        setPreviousSignal(signalType);
      }
    }
  }, [selectedEA?.current_signal, selectedEA?.id, isMonitoring, selectedSymbol]);
  
  // Poll for EA updates every 10 seconds when monitoring
  useEffect(() => {
    if (isMonitoring && selectedSymbol && selectedEA) {
      console.log('🔄 Starting real-time signal polling (every 10 seconds)');
      console.log('📊 Current monitoring state:', { isMonitoring, selectedSymbol, selectedEA: selectedEA?.name });
      
      // Function to fetch latest signal calculation
      const fetchLatestSignal = async () => {
        try {
          const token = await AsyncStorage.getItem('authToken');
          if (!token) {
            console.log('⚠️ No auth token for signal polling');
            return;
          }
          
          console.log('📤 Fetching real-time signal for EA:', selectedEA._id);
          const response = await fetch(`${API_URL}/api/ea/${selectedEA._id}/calculate`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('✅ Real-time signal data received:', {
              signal: data.signal,
              price: data.price,
              timestamp: new Date().toLocaleTimeString()
            });
            
            // Refresh the EA list to update UI with new signal
            await fetchEAs();
          } else {
            console.error('❌ Failed to fetch signal:', response.status);
          }
        } catch (error) {
          console.error('❌ Error fetching real-time signal:', error);
        }
      };
      
      // Fetch immediately on start
      fetchLatestSignal();
      
      // Then poll every 10 seconds
      const pollInterval = setInterval(() => {
        console.log('🔄 Polling for real-time signal update...', { 
          time: new Date().toLocaleTimeString() 
        });
        fetchLatestSignal();
      }, 10000); // Poll every 10 seconds
      
      return () => {
        console.log('⏹️ Stopping real-time signal polling');
        clearInterval(pollInterval);
      };
    }
  }, [isMonitoring, selectedSymbol, selectedEA?._id]);
  
  // Log monitoring state changes for debugging
  useEffect(() => {
    console.log('🔔 Monitoring state changed:', {
      isMonitoring,
      selectedSymbol,
      selectedEA: selectedEA?.name,
      hasCurrentSignal: !!currentSignal,
      time: new Date().toLocaleTimeString()
    });
  }, [isMonitoring]);

  useEffect(() => {
    if (notification) {
      const data = notification.request.content.data;
      Alert.alert(
        notification.request.content.title || 'Trading Signal',
        notification.request.content.body || '',
        [{ text: 'OK' }]
      );
    }
  }, [notification]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchEAs(), fetchQuotes()]);
    setLoading(false);
  };

  const getThemeColors = () => {
    // Use more transparent gradients when custom background image is set
    const hasCustomBg = !!backgroundImage;
    
    // ONLY apply color themes when monitoring is ACTIVE
    if (isMonitoring && activeSignal === 'BUY') {
      return {
        primary: '#00FF88',
        gradient: hasCustomBg 
          ? ['rgba(0,255,136,0.1)', 'rgba(0,255,136,0.05)', 'rgba(0,255,136,0.15)']
          : ['rgba(0,255,136,0.3)', 'rgba(0,255,136,0.15)', 'rgba(0,255,136,0.4)'],
        glow: '#00FF88',
        accent: '#00FF88',
      };
    } else if (isMonitoring && activeSignal === 'SELL') {
      return {
        primary: '#FF4444',
        gradient: hasCustomBg
          ? ['rgba(255,68,68,0.1)', 'rgba(255,68,68,0.05)', 'rgba(255,68,68,0.15)']
          : ['rgba(255,68,68,0.3)', 'rgba(255,68,68,0.15)', 'rgba(255,68,68,0.4)'],
        glow: '#FF4444',
        accent: '#FF4444',
      };
    }
    return {
      primary: '#00D9FF',
      gradient: hasCustomBg
        ? ['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.3)']
        : ['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.8)'],
      glow: '#00D9FF',
      accent: '#00D9FF',
    };
  };

  const theme = getThemeColors();

  const triggerGlowAnimation = () => {
    Animated.sequence([
      Animated.timing(glowAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(glowAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handleStartStop = async () => {
    console.log('🎯 START/STOP button clicked');
    console.log('📊 Current state:', {
      selectedSymbol: selectedSymbol || 'none',
      isMonitoring,
      availableEAs: eas.length,
      selectedEA: selectedEA?.name || 'none'
    });

    try {
      // If no symbol selected, check if there's at least one EA and auto-select it
      if (!selectedSymbol && eas.length > 0) {
        const firstEA = eas[0];
        const autoSymbol = normalizeSymbol(firstEA.config?.symbol);
        console.log('🔄 Auto-selecting symbol from first EA:', autoSymbol);
        setSelectedSymbol(autoSymbol);
        // Continue with monitoring
      } else if (!selectedSymbol && eas.length === 0) {
        console.log('⚠️ No EAs created');
        Alert.alert(
          'No Signal Monitors', 
          'Please create a signal monitor in the Signals tab first.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      // Toggle monitoring state
      const newMonitoringState = !isMonitoring;
      setIsMonitoring(newMonitoringState);
      
      // Persist monitoring state
      await AsyncStorage.setItem('isMonitoring', JSON.stringify(newMonitoringState));
      await AsyncStorage.setItem('selectedSymbol', selectedSymbol);
      console.log('💾 Saved monitoring state:', newMonitoringState, 'for symbol:', selectedSymbol);
      
      if (newMonitoringState) {
        // Started monitoring
        const finalSymbol = selectedSymbol || normalizeSymbol(eas[0]?.config?.symbol);
        const finalEA = selectedEA || eas[0];
        const currentSignal = finalEA?.current_signal || 'NEUTRAL';
        
        console.log('✅ Started monitoring:');
        console.log('  - Symbol:', finalSymbol);
        console.log('  - EA:', finalEA?.name);
        console.log('  - Current Signal:', currentSignal);
        
        // Store selected EA ID for background task
        if (finalEA?._id) {
          await AsyncStorage.setItem('selectedEAId', finalEA._id);
        }
        
        // Register background fetch for notifications
        const registered = await registerBackgroundFetch();
        if (registered) {
          console.log('📱 Background monitoring registered successfully');
          // Send test notification
          await sendTestNotification();
        } else {
          console.log('⚠️ Background monitoring registration failed');
        }
        
        Alert.alert(
          '🔔 Monitoring Active',
          `Now monitoring:\n"${finalSymbol}"\n\nEA: ${finalEA?.name || 'Unknown'}\nCurrent Signal: ${currentSignal}\n\n✅ Background notifications enabled\n✅ Floating bubble overlay active\n\nYou'll receive push notifications even when the app is closed!`,
          [{ text: 'Got it!' }]
        );
        
        // Show floating bubble immediately if there's an active signal
        if (finalEA && currentSignal !== 'NEUTRAL') {
          console.log('🟢 Showing floating bubble immediately with signal:', currentSignal);
          
          // Add initial signal to queue
          addSignal({
            signal: currentSignal,
            symbol: finalEA.config?.symbol || finalSymbol,
            indicator: finalEA.name || '',
            price: finalEA.last_price || 0,
            candle_pattern: '',
            duration: 30,
          });
          
          // Set initial previousSignal to current signal
          setPreviousSignal(currentSignal);
          
          console.log('📊 Initial signal added to queue:', currentSignal);
          triggerGlowAnimation();
        } else {
          console.log('🟡 No active signal yet, bubble will appear when signal changes');
        }
      } else {
        // Stopped monitoring
        console.log('⏹️ Stopped monitoring symbol:', selectedSymbol);
        
        // Unregister background fetch
        await unregisterBackgroundFetch();
        console.log('📴 Background monitoring stopped');
        
        // Clear all active signals and bubbles
        console.log('🔵 Clearing all signals - NO BUBBLES when stopped');
        closeCurrentSignal();
        clearQueue();
        
        // Reset previous signal to neutral
        setPreviousSignal('NEUTRAL');
        
        console.log('✅ Monitoring stopped - all signals cleared');
      }
    } catch (error) {
      console.error('❌ Error in handleStartStop:', error);
      Alert.alert('Error', 'Failed to toggle monitoring. Please try again.');
    }
  };

  const handleSymbolSelect = (symbol: string) => {
    console.log('📍 Symbol selected:', symbol);
    setSelectedSymbol(symbol);
    setShowSymbolsModal(false);
    setShowAddModal(true);
  };

  // NEW: Handle custom indicator selection (different from symbol selection)
  const handleIndicatorSelect = async (indicatorId: string, indicatorName: string) => {
    console.log('📊 Indicator selected:', indicatorName, 'ID:', indicatorId);
    setShowSymbolsModal(false);
    
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('Error', 'Please log in again');
        return;
      }

      console.log('🔄 Selecting indicator via API...');
      const response = await fetch(`${API_URL}/api/user/select-indicator`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ indicator_id: indicatorId }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Indicator selected successfully:', data);
        setSelectedIndicatorId(indicatorId);
        await fetchCustomIndicators(); // Refresh to get updated data
        Alert.alert(
          '✅ Indicator Selected', 
          `Now following: ${data.indicator_name}\n\nCurrent Signal: ${data.current_signal}\n\nTap START to begin monitoring!`,
          [{ text: 'OK' }]
        );
      } else {
        const error = await response.json();
        console.error('❌ Failed to select indicator:', error);
        Alert.alert('Error', error.detail || 'Failed to select indicator');
      }
    } catch (error) {
      console.error('❌ Error selecting indicator:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    }
  };

  const handleRemove = () => {
    try {
      console.log('🗑️ REMOVE button clicked');
      console.log('Current EAs count:', eas.length);
      
      if (eas.length === 0) {
        Alert.alert('No Signals', 'You have no signal sources configured.');
        return;
      }
      
      console.log('Opening remove modal');
      setShowRemoveModal(true);
    } catch (error) {
      console.error('❌ Error in handleRemove:', error);
      Alert.alert('Error', 'Failed to open remove dialog. Please try again.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00D9FF" />
      </View>
    );
  }

  const eyeGlowColor = glowAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [`${theme.glow}80`, theme.glow],
  });

  const eyeGlowRadius = glowAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 30],
  });

  // Render function - use background image if available, otherwise use gradient
  const renderBackground = (children: React.ReactNode) => {
    if (backgroundImage) {
      return (
        <ImageBackground
          key={backgroundKey}
          source={{ uri: backgroundImage }}
          style={styles.backgroundImage}
          resizeMode="cover"
        >
          <LinearGradient colors={theme.gradient} style={styles.gradient}>
            {children}
          </LinearGradient>
        </ImageBackground>
      );
    } else {
      return (
        <LinearGradient colors={['#0a0e27', '#1a1f3a', '#0a0e27']} style={styles.gradient}>
          {children}
        </LinearGradient>
      );
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {renderBackground(
        <SafeAreaView style={styles.safeArea}>
            {/* User Menu - positioned at top-left edge */}
            <UserMenu />
            
            <View style={styles.content}>
              {/* Top Section - System Name and Status */}
              <View style={styles.topSection}>
                <View style={styles.titleSection}>
                  <View style={styles.logoContainer}>
                    {/* Logo and system name removed as requested */}
                  </View>
                </View>
              </View>

              {/* Main Content Section */}
              <View style={styles.mainContent}>
                {/* Signal Banner */}
                {symbolSignal !== 'NEUTRAL' && isMonitoring && selectedSymbol && (
                  <View style={[styles.signalBanner, { backgroundColor: `${theme.primary}20`, borderColor: theme.primary }]}>
                    <Ionicons 
                      name={symbolSignal === 'BUY' ? 'arrow-up-circle' : 'arrow-down-circle'} 
                      size={32} 
                      color={theme.primary} 
                    />
                    <Text style={[styles.signalBannerText, { color: theme.primary }]}>
                      {symbolSignal} SIGNAL - {selectedSymbol}
                    </Text>
                  </View>
                )}

                {/* Control Buttons */}
                <View style={styles.buttonsSection}>
                  {/* START/STOP Button - Prominent at top */}
                  <TouchableOpacity
                    style={[styles.button, styles.startStopButton, isMonitoring && styles.stopButton]}
                    onPress={handleStartStop}
                    disabled={false}
                    activeOpacity={0.7}
                  >
                    <Ionicons 
                      name={isMonitoring ? 'stop' : 'play'} 
                      size={20} 
                      color={isMonitoring ? '#fff' : '#000'} 
                    />
                    <Text style={[styles.buttonText, isMonitoring && { color: '#fff' }]}>
                      {isMonitoring ? 'STOP' : 'START'}
                    </Text>
                  </TouchableOpacity>

                  {/* Secondary Buttons */}
                  <TouchableOpacity
                    style={[styles.button, styles.quotesButton, { borderColor: theme.accent, backgroundColor: `${theme.accent}20` }]}
                    onPress={() => setShowSymbolsModal(true)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="stats-chart" size={22} color={theme.accent} />
                    <Text style={[styles.buttonText, { color: theme.accent }]}>QUOTES</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.button, styles.removeButton]}
                    onPress={handleRemove}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={22} color="#FF4444" />
                    <Text style={[styles.buttonText, { color: '#FF4444' }]}>REMOVE</Text>
                  </TouchableOpacity>
                </View>

                {/* Info Box removed as requested */}

              </View>
            </View>
          </SafeAreaView>
      )}

      {/* Floating Bubble Overlay - Show News Alert + Manual Signals/EA */}
      {upcomingNewsAlert && (
        <View style={styles.newsAlertBubble}>
          <View style={styles.newsAlertHeader}>
            <Ionicons name="alarm" size={20} color="#ff4444" />
            <Text style={styles.newsAlertTime}>
              {Math.floor(upcomingNewsAlert.minutes_until)} MIN
            </Text>
          </View>
          <Text style={styles.newsAlertTitle} numberOfLines={2}>
            {upcomingNewsAlert.title}
          </Text>
          <View style={styles.newsAlertFooter}>
            <Text style={styles.newsAlertCurrency}>{upcomingNewsAlert.currency}</Text>
            {upcomingNewsAlert.signal && (
              <View style={[
                styles.newsSignalBadge,
                { backgroundColor: upcomingNewsAlert.signal === 'BUY' ? '#00FF88' : '#ff4444' }
              ]}>
                <Text style={styles.newsSignalText}>{upcomingNewsAlert.signal}</Text>
              </View>
            )}
          </View>
        </View>
      )}
      
      {/* Floating Bubble - Display current signal from queue */}
      {currentSignal && (
        <FloatingBubble 
          signal={currentSignal.signal}
          symbol={currentSignal.symbol}
          indicator={currentSignal.indicator}
          price={currentSignal.price}
          candle_pattern={currentSignal.candle_pattern}
          onClose={closeCurrentSignal}
        />
      )}

      <SymbolsModal
        visible={showSymbolsModal}
        onClose={() => setShowSymbolsModal(false)}
        onSymbolSelect={handleSymbolSelect}
        onIndicatorSelect={handleIndicatorSelect}
      />

      <AddEAModal
        visible={showAddModal}
        symbol={selectedSymbol}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          setShowAddModal(false);
          loadData();
        }}
      />

      <RemoveEAModal
        visible={showRemoveModal}
        onClose={() => setShowRemoveModal(false)}
        onSuccess={() => {
          setShowRemoveModal(false);
          loadData();
        }}
      />

      {/* Brokers Modal with Enhanced Glass Design */}
      <Modal
        visible={showBrokers}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBrokers(false)}
      >
        <View style={styles.brokersModalOverlay}>
          <View style={styles.brokersModalContainer}>
            {/* Header with Glass Effect */}
            <View style={styles.brokersHeader}>
              <Ionicons name="briefcase" size={24} color="#00D9FF" />
              <Text style={styles.brokersTitle}>Brokers</Text>
              <TouchableOpacity 
                onPress={() => setShowBrokers(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Broker List */}
            <ScrollView 
              style={styles.brokersScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              {brokers.length > 0 ? (
                brokers.map((broker, index) => (
                  <TouchableOpacity
                    key={broker._id || index}
                    style={styles.brokerCard}
                    activeOpacity={0.7}
                    onPress={() => {
                      if (broker.affiliate_link) {
                        Linking.openURL(broker.affiliate_link);
                        setShowBrokers(false);
                      } else {
                        Alert.alert('No Link', 'This broker has no affiliate link available.');
                      }
                    }}
                  >
                    <View style={styles.brokerContent}>
                      <View style={styles.brokerIconContainer}>
                        <Ionicons name="business" size={32} color="#00D9FF" />
                      </View>
                      <View style={styles.brokerInfo}>
                        <Text style={styles.brokerName}>{broker.broker_name}</Text>
                        {broker.description && (
                          <Text style={styles.brokerDescription} numberOfLines={2}>
                            {broker.description}
                          </Text>
                        )}
                        {broker.affiliate_link && (
                          <View style={styles.brokerLinkContainer}>
                            <Ionicons name="link" size={14} color="#00D9FF" />
                            <Text style={styles.brokerLink} numberOfLines={1}>
                              {broker.affiliate_link.replace(/^https?:\/\//, '')}
                            </Text>
                          </View>
                        )}
                        <View style={styles.tapHintContainer}>
                          <Text style={styles.tapHint}>Tap to open link</Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={24} color="#00D9FF" />
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="briefcase-outline" size={64} color="rgba(0, 217, 255, 0.3)" />
                  <Text style={styles.emptyStateText}>No brokers available</Text>
                  <Text style={styles.emptyStateSubtext}>Check back later for broker recommendations</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>


      {/* News Modal with Enhanced Glass Design */}
      <Modal
        visible={showNews}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNews(false)}
      >
        <View style={styles.brokersModalOverlay}>
          <View style={styles.brokersModalContainer}>
            {/* Header with Glass Effect */}
            <View style={styles.brokersHeader}>
              <Ionicons name="newspaper" size={24} color="#00D9FF" />
              <Text style={styles.brokersTitle}>Market News</Text>
              <TouchableOpacity 
                onPress={() => setShowNews(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* News List */}
            <ScrollView 
              style={styles.brokersScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              {news.length > 0 ? (
                news.map((item, index) => (
                  <View key={item.id || index} style={styles.newsCard}>
                    <View style={styles.newsHeaderRow}>
                      <View style={styles.newsTimeContainer}>
                        <Ionicons name="time-outline" size={16} color="#00D9FF" />
                        <Text style={styles.newsTime}>{item.event_time}</Text>
                      </View>
                      <View style={[styles.currencyBadge, { 
                        backgroundColor: item.impact === 'High' ? 'rgba(255, 68, 68, 0.2)' : 
                                       item.impact === 'Medium' ? 'rgba(255, 165, 0, 0.2)' : 
                                       'rgba(136, 136, 136, 0.2)',
                        borderWidth: 1,
                        borderColor: item.impact === 'High' ? '#ff4444' : 
                                    item.impact === 'Medium' ? '#ffa500' : '#888'
                      }]}>
                        <Text style={[styles.currencyText, {
                          color: item.impact === 'High' ? '#ff4444' : 
                                item.impact === 'Medium' ? '#ffa500' : '#888'
                        }]}>{item.currency}</Text>
                      </View>
                    </View>
                    <Text style={styles.newsEventTitle} numberOfLines={2}>{item.title}</Text>
                    {item.description && (
                      <Text style={styles.newsDescription} numberOfLines={2}>{item.description}</Text>
                    )}
                    <View style={styles.newsFooter}>
                      <View style={[styles.impactBadge, {
                        backgroundColor: item.impact === 'High' ? 'rgba(255, 68, 68, 0.15)' : 
                                       item.impact === 'Medium' ? 'rgba(255, 165, 0, 0.15)' : 
                                       'rgba(136, 136, 136, 0.15)',
                        borderColor: item.impact === 'High' ? '#ff4444' : 
                                    item.impact === 'Medium' ? '#ffa500' : '#888'
                      }]}>
                        <Ionicons 
                          name={item.impact === 'High' ? 'alert-circle' : item.impact === 'Medium' ? 'alert' : 'information-circle'} 
                          size={12} 
                          color={item.impact === 'High' ? '#ff4444' : item.impact === 'Medium' ? '#ffa500' : '#888'} 
                        />
                        <Text style={[styles.impactText, { 
                          color: item.impact === 'High' ? '#ff4444' : 
                                item.impact === 'Medium' ? '#ffa500' : '#888' 
                        }]}>
                          {item.impact} Impact
                        </Text>
                      </View>
                      {item.signal && (
                        <View style={[styles.newsSignalBadge, { 
                          backgroundColor: item.signal === 'BUY' ? 'rgba(0, 255, 136, 0.15)' : 'rgba(255, 68, 68, 0.15)',
                          borderColor: item.signal === 'BUY' ? '#00FF88' : '#ff4444'
                        }]}>
                          <Ionicons 
                            name={item.signal === 'BUY' ? 'trending-up' : 'trending-down'} 
                            size={12} 
                            color={item.signal === 'BUY' ? '#00FF88' : '#ff4444'} 
                          />
                          <Text style={[styles.newsSignalText, {
                            color: item.signal === 'BUY' ? '#00FF88' : '#ff4444'
                          }]}>{item.signal}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="newspaper-outline" size={64} color="rgba(0, 217, 255, 0.3)" />
                  <Text style={styles.emptyStateText}>No news available</Text>
                  <Text style={styles.emptyStateSubtext}>Check back later for market updates</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
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
  backgroundImage: { 
    flex: 1, 
    width: '100%', 
    height: '100%' 
  },
  colorOverlay: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    opacity: 0.6,
    zIndex: 1 
  },
  gradient: { 
    flex: 1, 
    zIndex: 2 
  },
  safeArea: { 
    flex: 1,
    paddingHorizontal: 16 
  },
  content: { 
    flex: 1,
    paddingTop: 8 
  },
  
  // Layout styles
  topSection: {
    paddingTop: 40, // Further reduced to move buttons down
    paddingBottom: 10, // Further reduced
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  mainContent: {
    flex: 1,
    paddingHorizontal: 4,
    paddingBottom: 24,
    justifyContent: 'flex-end', // Keep buttons at bottom when no signal banner
  },
  
  titleSection: { 
    alignItems: 'center', 
    zIndex: 10,
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  systemNameContainer: {
    alignItems: 'center',
    gap: 4,
  },
  systemNameMain: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 2,
  },
  systemNameSub: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    opacity: 0.9,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    letterSpacing: 1,
  },
  logoImage: {
    width: 120,
    height: 120,
    marginBottom: 8,
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00D9FF',
    textAlign: 'center',
    textShadowColor: '#00D9FF',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
    letterSpacing: 2,
  },
  eaInfo: { 
    marginTop: 24, 
    alignItems: 'center',
    gap: 10 
  },
  statusBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(0,0,0,0.85)', 
    paddingHorizontal: 14, 
    paddingVertical: 6, 
    borderRadius: 18, 
    borderWidth: 1.5 
  },
  statusDot: { 
    width: 8, 
    height: 8, 
    borderRadius: 4, 
    marginRight: 8 
  },
  statusText: { 
    color: '#fff', 
    fontSize: 11, 
    fontWeight: '600', 
    letterSpacing: 1 
  },
  notificationBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 12, 
    borderWidth: 1, 
    gap: 4 
  },
  notificationText: { 
    fontSize: 10, 
    fontWeight: 'bold', 
    letterSpacing: 0.5 
  },

  bottomHalf: { 
    flex: 1, 
    paddingHorizontal: 4, 
    paddingBottom: 24, 
    justifyContent: 'flex-end' 
  },
  signalBanner: { 
    paddingVertical: 16, // Reduced from 18 to save space
    paddingHorizontal: 20, // Reduced from 24
    borderRadius: 16, 
    marginBottom: 32, // Increased from 24 to create more space between banner and buttons
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 12, // Reduced from 14
    borderWidth: 2.5,
    backgroundColor: 'rgba(0,0,0,0.7)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 10 
  },
  signalBannerText: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    letterSpacing: 2.5 
  },
  buttonsSection: { 
    gap: 10, 
    marginBottom: 10,
    marginTop: 20, // Add margin to push buttons down
  },
  button: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 14, // Reduced from 22
    borderRadius: 12, // Reduced from 14
    gap: 10, // Reduced from 14
    borderWidth: 2, // Reduced from 2.5
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, // Reduced from 6
    shadowOpacity: 0.5, // Reduced from 0.6
    shadowRadius: 8, // Reduced from 10
    elevation: 10, // Reduced from 12
    minHeight: 56 // Reduced from 72
  },
  startStopButton: { 
    backgroundColor: '#fff', 
    borderColor: '#fff',
    paddingVertical: 14, // Reduced from 18
    minHeight: 52, // Reduced from 65
    marginBottom: 10, // Reduced from 14
    borderWidth: 2,
  },
  stopButton: { 
    backgroundColor: '#FF4444', 
    borderColor: '#FF4444' 
  },
  quotesButton: {
    backgroundColor: 'rgba(0,0,0,0.7)'
  },
  removeButton: { 
    backgroundColor: 'rgba(255,68,68,0.2)', 
    borderColor: '#FF4444' 
  },
  buttonText: { 
    fontSize: 16, // Reduced from 19
    fontWeight: 'bold', 
    color: '#000', 
    letterSpacing: 2 // Reduced from 2.5
  },
  infoBox: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 18, 
    borderRadius: 14, 
    gap: 14, 
    borderWidth: 2,
    backgroundColor: 'rgba(0,0,0,0.7)' 
  },
  infoText: { 
    flex: 1, 
    fontSize: 14,
    color: '#fff',
    lineHeight: 20 
  },
  
  // Indicator Selector styles
  indicatorSelector: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 16,
    borderWidth: 2,
    padding: 16,
    marginTop: 16,
  },
  indicatorSelectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  indicatorSelectorTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  indicatorsList: {
    flexDirection: 'row',
  },
  indicatorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    borderWidth: 1,
    borderColor: '#00D9FF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
    gap: 6,
  },
  indicatorChipSelected: {
    backgroundColor: 'rgba(0, 255, 136, 0.2)',
    borderColor: '#00FF88',
    borderWidth: 2,
  },
  indicatorChipText: {
    color: '#00D9FF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  indicatorChipTextSelected: {
    color: '#00FF88',
  },
  indicatorSignalDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 4,
  },

  
  // Top action buttons styles
  topActionsContainer: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 100,
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    // Individual button container
  },
  actionGlass: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.3)',
    gap: 6,
  },
  actionButtonText: {
    color: '#00D9FF',
    fontSize: 12,
    fontWeight: '600',
  },
  actionBadge: {
    backgroundColor: '#00D9FF',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  actionBadgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: 'bold',
  },
  
  // Brokers Modal Styles
  brokersModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  brokersModalContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.3)',
    overflow: 'hidden',
  },
  brokersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 217, 255, 0.2)',
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
  },
  brokersTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginLeft: -28, // Compensate for close button
  },
  brokersScroll: {
    flex: 1,
    padding: 16,
  },
  brokerCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.2)',
    overflow: 'hidden',
  },
  brokerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  brokerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.3)',
  },
  brokerInfo: {
    flex: 1,
    gap: 4,
  },
  brokerName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  brokerDescription: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    lineHeight: 16,
  },
  brokerLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  brokerLink: {
    color: '#00D9FF',
    fontSize: 11,
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  tapHintContainer: {
    marginTop: 4,
  },
  tapHint: {
    color: 'rgba(0, 217, 255, 0.6)',
    fontSize: 10,
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyStateText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },

  // Indicators Modal Styles
  indicatorCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.2)',
  },
  indicatorCardSelected: {
    borderColor: '#4CAF50',
    borderWidth: 2,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  indicatorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  indicatorIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 217, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  indicatorInfo: {
    flex: 1,
  },
  indicatorName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  indicatorUpdated: {
    color: '#888',
    fontSize: 11,
  },
  selectedBadge: {
    marginLeft: 8,
  },
  signalDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderLeftWidth: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 6,
    marginBottom: 8,
  },
  signalDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  signalText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  selectText: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
  },
  // Duplicate styles removed
  

  // News Modal Styles
  newsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  newsModalContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.3)',
    overflow: 'hidden',
  },
  newsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 217, 255, 0.2)',
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
  },
  newsTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginLeft: -28, // Compensate for close button
  },
  newsScroll: {
    flex: 1,
    padding: 16,
  },
  newsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.2)',
    overflow: 'hidden',
  },
  newsContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    gap: 12,
  },
  newsIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.3)',
    marginTop: 4,
  },
  newsInfo: {
    flex: 1,
    gap: 6,
  },
  newsHeadline: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  newsSummary: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    lineHeight: 18,
  },
  newsMetaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  newsDate: {
    color: '#00D9FF',
    fontSize: 11,
  },
  
  // Enhanced News Modal Styles - duplicate removed
  newsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  newsTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  newsTime: {
    color: '#00D9FF',
    fontSize: 12,
    fontWeight: '600',
  },
  currencyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  currencyText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  newsEventTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    lineHeight: 20,
    marginBottom: 8,
  },
  newsDescription: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  newsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  impactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  impactText: {
    fontSize: 11,
    fontWeight: '600',
  },
  newsSignalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  newsSignalText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  newsTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    lineHeight: 20,
  },
  signalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  signalBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  // News Alert Bubble styles
  newsAlertBubble: {
    position: 'absolute',
    top: 80,
    left: 10,
    width: 160,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 2,
    borderColor: '#ff4444',
    shadowColor: '#ff4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  newsAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    gap: 6,
  },
  newsAlertTime: {
    color: '#ff4444',
    fontSize: 14,
    fontWeight: 'bold',
  },
  newsAlertTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 16,
  },
  newsAlertFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  newsAlertCurrency: {
    color: '#00D9FF',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
