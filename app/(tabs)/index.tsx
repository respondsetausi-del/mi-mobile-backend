import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
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
import { useNotifications, showSignalNotification } from '../../hooks/useNotifications';
import FloatingBubble from '../../components/FloatingBubble';
import UserMenu from '../../components/UserMenu';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || '';

export default function HomeScreen() {
  const { eas, selectedEAId, fetchEAs, fetchQuotes, toggleEAStatus } = useEAStore();
  const [loading, setLoading] = useState(true);
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
  
  // Market news
  const [news, setNews] = useState<any[]>([]);
  const [showNews, setShowNews] = useState(false);
  const [upcomingNewsAlert, setUpcomingNewsAlert] = useState<any>(null); // For 10-min alerts
  
  const [glowAnimation] = useState(new Animated.Value(0));
  const { expoPushToken, notification } = useNotifications();

  useEffect(() => {
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
  }, []);

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
          console.log('🔴 FLOATING BUBBLE UPDATE - Manual signal:', data.signal.signal_type, 'for', data.signal.symbol);
          setManualSignal(data.signal);
        } else {
          console.log('🟢 FLOATING BUBBLE UPDATE - No manual signals, using EA signal');
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

  const selectedEA = eas.find(ea => ea._id === selectedEAId) || eas[0];
  const currentSignal = selectedEA?.current_signal || 'NEUTRAL';

  // Prioritize manual signal for theme, fallback to EA signal
  const activeSignal = manualSignal?.signal_type || currentSignal;

  // Log when floating bubble data changes
  useEffect(() => {
    if (manualSignal) {
      console.log('🔴 FLOATING BUBBLE: Showing MANUAL signal -', manualSignal.signal_type, 'for', manualSignal.symbol);
    } else if (selectedEA?.status === 'running') {
      console.log('🔵 FLOATING BUBBLE: Showing EA signal -', currentSignal, 'for', selectedEA.config?.symbol);
    } else {
      console.log('⚫ FLOATING BUBBLE: Hidden (no signal)');
    }
  }, [manualSignal, currentSignal, selectedEA?.status]);

  // Detect signal changes and show floating notification
  useEffect(() => {
    if (selectedEA && selectedEA.status === 'running') {
      if (currentSignal !== previousSignal && currentSignal !== 'NEUTRAL') {
        // Signal changed! Show floating notification
        const symbol = selectedEA.config?.symbol || 'Unknown';
        const indicator = selectedEA.config?.indicator?.type || 'Unknown';
        const price = selectedEA.last_price || 0;
        
        showSignalNotification(symbol, currentSignal, indicator, price);
        triggerGlowAnimation();
      }
      setPreviousSignal(currentSignal);
    }
  }, [currentSignal, selectedEA]);

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
    
    if (activeSignal === 'BUY') {
      return {
        primary: '#00FF88',
        gradient: hasCustomBg 
          ? ['rgba(0,255,136,0.1)', 'rgba(0,255,136,0.05)', 'rgba(0,255,136,0.15)']
          : ['rgba(0,255,136,0.3)', 'rgba(0,255,136,0.15)', 'rgba(0,255,136,0.4)'],
        glow: '#00FF88',
        accent: '#00FF88',
      };
    } else if (activeSignal === 'SELL') {
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
    if (!selectedEA) {
      Alert.alert('No EA Configured', 'Please tap QUOTES to add an EA first.');
      return;
    }
    
    await toggleEAStatus(selectedEA._id);
    
    if (selectedEA.status === 'stopped') {
      Alert.alert(
        '🔔 Floating Alerts Active',
        'You will receive floating bubble notifications when trading signals are detected, even when app is closed!',
        [{ text: 'Got it!' }]
      );
    }
  };

  const handleSymbolSelect = (symbol: string) => {
    setSelectedSymbol(symbol);
    setShowSymbolsModal(false);
    setShowAddModal(true);
  };

  const handleRemove = () => {
    if (eas.length === 0) {
      Alert.alert('No EAs', 'You have no EAs configured.');
      return;
    }
    setShowRemoveModal(true);
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

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ImageBackground
        key={backgroundKey}
        source={{ uri: backgroundImage || 'https://customer-assets.emergentagent.com/job_quotetracker-2/artifacts/0xgohmqy_download.jpg' }}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* Only show color overlay if NO custom image, otherwise skip it */}
        {backgroundColor && !backgroundImage && (
          <View style={[styles.colorOverlay, { backgroundColor: backgroundColor }]} />
        )}
        <LinearGradient colors={theme.gradient} style={styles.gradient}>
          <SafeAreaView style={styles.safeArea}>
            {/* User Menu - positioned at top-left edge */}
            <UserMenu />
            
            {/* Top Action Buttons Container */}
            <View style={styles.topActionsContainer}>
              {/* Brokers Glass Button */}
              {brokers.length > 0 && (
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => setShowBrokers(true)}
                >
                  <View style={styles.actionGlass}>
                    <Ionicons name="briefcase" size={18} color="#00D9FF" />
                    <Text style={styles.actionButtonText}>Brokers</Text>
                    <View style={styles.actionBadge}>
                      <Text style={styles.actionBadgeText}>{brokers.length}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}


              {/* News Glass Button */}
              {news.length > 0 && (
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => setShowNews(true)}
                >
                  <View style={styles.actionGlass}>
                    <Ionicons name="newspaper" size={18} color="#00D9FF" />
                    <Text style={styles.actionButtonText}>News</Text>
                    <View style={styles.actionBadge}>
                      <Text style={styles.actionBadgeText}>{news.length}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
            </View>
            
            <View style={styles.content}>
              {/* Top Section - System Name and Status */}
              <View style={styles.topSection}>
                <View style={styles.titleSection}>
                  <View style={styles.logoContainer}>
                    <Text style={[styles.logoText, { textShadowColor: theme.accent }]}>{systemName}</Text>
                  </View>
                  
                  {selectedEA && (
                    <View style={styles.eaInfo}>
                      <View style={[styles.statusBadge, { borderColor: theme.accent }]}>
                        <View style={[styles.statusDot, { backgroundColor: selectedEA.status === 'running' ? '#00FF88' : '#FF4444' }]} />
                        <Text style={styles.statusText}>{selectedEA.status === 'running' ? 'RUNNING' : 'STOPPED'}</Text>
                      </View>
                      {selectedEA.status === 'running' && (
                        <View style={[styles.notificationBadge, { borderColor: theme.accent, backgroundColor: `${theme.accent}40` }]}>
                          <Ionicons name="notifications" size={12} color={theme.accent} />
                          <Text style={[styles.notificationText, { color: theme.accent }]}>ALERTS ON</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </View>

              {/* Main Content Section */}
              <View style={styles.mainContent}>
                {/* Signal Banner */}
                {currentSignal !== 'NEUTRAL' && selectedEA?.status === 'running' && (
                  <View style={[styles.signalBanner, { backgroundColor: `${theme.primary}20`, borderColor: theme.primary }]}>
                    <Ionicons 
                      name={currentSignal === 'BUY' ? 'arrow-up-circle' : 'arrow-down-circle'} 
                      size={32} 
                      color={theme.primary} 
                    />
                    <Text style={[styles.signalBannerText, { color: theme.primary }]}>
                      {currentSignal} SIGNAL ACTIVE
                    </Text>
                  </View>
                )}

                {/* Control Buttons */}
                <View style={styles.buttonsSection}>
                  {/* START/STOP Button - Prominent at top */}
                  <TouchableOpacity
                    style={[styles.button, styles.startStopButton, selectedEA?.status === 'running' && styles.stopButton]}
                    onPress={handleStartStop}
                    disabled={!selectedEA}
                    activeOpacity={0.8}
                  >
                    <Ionicons 
                      name={selectedEA?.status === 'running' ? 'stop' : 'play'} 
                      size={24} 
                      color={selectedEA?.status === 'running' ? '#fff' : '#000'} 
                    />
                    <Text style={[styles.buttonText, selectedEA?.status === 'running' && { color: '#fff' }]}>
                      {selectedEA?.status === 'running' ? 'STOP' : 'START'}
                    </Text>
                  </TouchableOpacity>

                  {/* Secondary Buttons */}
                  <TouchableOpacity
                    style={[styles.button, styles.quotesButton, { borderColor: theme.accent, backgroundColor: `${theme.accent}20` }]}
                    onPress={() => setShowSymbolsModal(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="stats-chart" size={28} color={theme.accent} />
                    <Text style={[styles.buttonText, { color: theme.accent }]}>QUOTES</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.button, styles.removeButton]}
                    onPress={handleRemove}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="trash-outline" size={28} color="#FF4444" />
                    <Text style={[styles.buttonText, { color: '#FF4444' }]}>REMOVE</Text>
                  </TouchableOpacity>
                </View>

                {/* Info Box */}
                {!selectedEA && (
                  <View style={[styles.infoBox, { borderColor: theme.accent, backgroundColor: `${theme.accent}20` }]}>
                    <Ionicons name="information-circle" size={24} color={theme.accent} />
                    <Text style={[styles.infoText, { color: '#fff' }]}>
                      Tap QUOTES to add your first EA and start trading
                    </Text>
                  </View>
                )}

              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </ImageBackground>

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
      
      {manualSignal ? (
        <FloatingBubble 
          signal={manualSignal.signal_type}
          symbol={manualSignal.symbol}
          indicator={manualSignal.indicator || ''}
          price={0}
          candle_pattern={manualSignal.candle_pattern || ''}
        />
      ) : selectedEA && selectedEA.status === 'running' && (
        <FloatingBubble 
          signal={currentSignal}
          symbol={selectedEA.config?.symbol || ''}
          indicator={selectedEA.config?.indicator?.type || ''}
          price={selectedEA.last_price || 0}
          candle_pattern=""
        />
      )}

      <SymbolsModal
        visible={showSymbolsModal}
        onClose={() => setShowSymbolsModal(false)}
        onSymbolSelect={handleSymbolSelect}
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

      {/* Brokers Modal with Glass Design */}
      <Modal
        visible={showBrokers}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBrokers(false)}
      >
        <View style={styles.brokersModalOverlay}>
          <View style={styles.brokersModalContainer}>
            {/* Header with Glass Effect */}
            <View style={styles.brokersHeader}>
              <Ionicons name="briefcase" size={24} color="#00D9FF" />
              <Text style={styles.brokersTitle}>Brokers</Text>
              <TouchableOpacity onPress={() => setShowBrokers(false)}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Broker List */}
            <ScrollView style={styles.brokersScroll}>
              {brokers.map((broker) => (
                <TouchableOpacity
                  key={broker._id}
                  style={styles.brokerCard}
                  onPress={() => {
                    if (broker.affiliate_link) {
                      Linking.openURL(broker.affiliate_link);
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
                        <Text style={styles.brokerDescription}>{broker.description}</Text>
                      )}
                      <View style={styles.brokerLinkContainer}>
                        <Ionicons name="link" size={14} color="#00D9FF" />
                        <Text style={styles.brokerLink} numberOfLines={1}>
                          {broker.affiliate_link}
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#00D9FF" />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>


      {/* News Modal with Glass Design */}
      <Modal
        visible={showNews}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNews(false)}
      >
        <View style={styles.brokersModalOverlay}>
          <View style={styles.brokersModalContainer}>
            {/* Header with Glass Effect */}
            <View style={styles.brokersHeader}>
              <Ionicons name="newspaper" size={24} color="#00D9FF" />
              <Text style={styles.brokersTitle}>Market News</Text>
              <TouchableOpacity onPress={() => setShowNews(false)}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* News List */}
            <ScrollView style={styles.brokersScroll}>
              {news.map((item) => (
                <View key={item.id} style={styles.newsCard}>
                  <View style={styles.newsHeader}>
                    <View style={styles.newsTimeContainer}>
                      <Ionicons name="time" size={16} color="#00D9FF" />
                      <Text style={styles.newsTime}>{item.event_time}</Text>
                    </View>
                    <View style={[styles.currencyBadge, { backgroundColor: item.impact === 'High' ? '#ff4444' : item.impact === 'Medium' ? '#ffa500' : '#888' }]}>
                      <Text style={styles.currencyText}>{item.currency}</Text>
                    </View>
                  </View>
                  <Text style={styles.newsTitle}>{item.title}</Text>
                  <View style={styles.newsFooter}>
                    <Text style={[styles.impactText, { color: item.impact === 'High' ? '#ff4444' : item.impact === 'Medium' ? '#ffa500' : '#888' }]}>
                      Impact: {item.impact}
                    </Text>
                    {item.signal && (
                      <View style={[styles.signalBadge, { backgroundColor: item.signal === 'BUY' ? '#00FF88' : '#ff4444' }]}>
                        <Text style={styles.signalBadgeText}>{item.signal}</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
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
    paddingTop: 80,
    paddingBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  mainContent: {
    flex: 1,
    paddingHorizontal: 4,
    paddingBottom: 24,
    justifyContent: 'flex-end',
  },
  
  titleSection: { 
    alignItems: 'center', 
    zIndex: 10,
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  logoText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#00D9FF',
    textAlign: 'center',
    textShadowColor: '#00D9FF',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 25,
    letterSpacing: 3,
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
    paddingVertical: 18, 
    paddingHorizontal: 24, 
    borderRadius: 16, 
    marginBottom: 24, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 14, 
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
    gap: 14, 
    marginBottom: 14 
  },
  button: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 22, 
    borderRadius: 14, 
    gap: 14, 
    borderWidth: 2.5, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 6 }, 
    shadowOpacity: 0.6, 
    shadowRadius: 10, 
    elevation: 12,
    minHeight: 72 
  },
  startStopButton: { 
    backgroundColor: '#fff', 
    borderColor: '#fff',
    paddingVertical: 18,
    minHeight: 65,
    marginBottom: 14,
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
    fontSize: 19, 
    fontWeight: 'bold', 
    color: '#000', 
    letterSpacing: 2.5 
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateText: {
    color: '#888',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptyStateSubtext: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  

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
  
  // Additional News Modal Styles for new format
  newsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.2)',
    padding: 16,
  },
  newsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  newsTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  newsTime: {
    color: '#00D9FF',
    fontSize: 12,
    fontWeight: '500',
  },
  currencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  currencyText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  newsTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    lineHeight: 20,
  },
  newsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  impactText: {
    fontSize: 12,
    fontWeight: '600',
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
  newsSignalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  newsSignalText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
