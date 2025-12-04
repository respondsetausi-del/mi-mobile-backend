import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, ScrollView, Modal, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useEAStore } from '../../store/eaStore';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || '';

const getSignalColor = (signal?: string) => {
  if (signal === 'BUY') return '#00FF88';
  if (signal === 'SELL') return '#FF4444';
  return '#888';
};

const getSignalIcon = (signal?: string) => {
  if (signal === 'BUY') return 'arrow-up-circle';
  if (signal === 'SELL') return 'arrow-down-circle';
  return 'pause-circle';
};

export default function SignalsScreen() {
  const router = useRouter();
  const { eas, selectedEAId, fetchEAs, selectEA, toggleEAStatus } = useEAStore();
  const [loading, setLoading] = useState(true);
  
  // Mentor Indicators Modal States
  const [showIndicatorModal, setShowIndicatorModal] = useState(false);
  const [customIndicators, setCustomIndicators] = useState<any[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState('EURUSD');
  const [selectedTimeframe, setSelectedTimeframe] = useState('1H');
  const [selectedIndicator, setSelectedIndicator] = useState<string | null>(null);
  const [addingIndicator, setAddingIndicator] = useState(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      fetchEAs();
      fetchCustomIndicators();
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const fetchCustomIndicators = async () => {
    try {
      console.log('🔵 Fetching custom indicators from API...');
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        console.log('❌ No auth token found');
        return;
      }

      console.log('📤 Request URL:', `${API_URL}/api/user/mentor-indicators`);
      const response = await fetch(`${API_URL}/api/user/mentor-indicators`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      console.log('📥 Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Received indicators data:', JSON.stringify(data));
        console.log('📊 Number of indicators:', data.indicators?.length || 0);
        setCustomIndicators(data.indicators || []);
        console.log('✅ Custom indicators state updated');
      } else {
        console.error('❌ Failed to fetch indicators. Status:', response.status);
      }
    } catch (error) {
      console.error('❌ Error fetching indicators:', error);
    }
  };

  const addIndicatorToSignals = async () => {
    try {
      console.log('🔴🔴🔴 BUTTON CLICKED! ADD TO SIGNALS function called');
      console.log('📍 Current selectedIndicator:', selectedIndicator);
      console.log('📍 Current API_URL:', API_URL);
      
      if (!selectedIndicator) {
        console.log('❌ No indicator selected');
        Alert.alert('Error', 'Please select an indicator first');
        return;
      }

      console.log('📤 Starting API call to add indicator:', selectedIndicator);
      setAddingIndicator(true);
      
      const token = await AsyncStorage.getItem('authToken');
      console.log('🔑 Token retrieved:', token ? 'exists (length: ' + token.length + ')' : 'MISSING!');
      
      const requestBody = { indicator_id: selectedIndicator };
      console.log('📤 Request body:', JSON.stringify(requestBody));
      
      const url = `${API_URL}/api/user/select-indicator`;
      console.log('📤 Request URL:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📥 Response status:', response.status);
      console.log('📥 Response headers:', JSON.stringify(Object.fromEntries(response.headers.entries())));

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Indicator added successfully! Response:', JSON.stringify(data));
        Alert.alert('✅ Success', `Added ${data.indicator_name} to your signals!`);
        setShowIndicatorModal(false);
        setSelectedIndicator(null);
        fetchEAs(); // Refresh to show new indicator
      } else {
        const errorText = await response.text();
        console.error('❌ API returned error status:', response.status);
        console.error('❌ Error response body:', errorText);
        try {
          const error = JSON.parse(errorText);
          Alert.alert('Error', error.detail || 'Failed to add indicator');
        } catch (e) {
          Alert.alert('Error', `Failed to add indicator. Status: ${response.status}`);
        }
      }
    } catch (error) {
      console.error('❌❌❌ CRITICAL EXCEPTION in addIndicatorToSignals:');
      console.error('Error type:', error?.constructor?.name);
      console.error('Error message:', error?.message);
      console.error('Full error:', error);
      Alert.alert('Error', `Failed to add indicator: ${error?.message || 'Unknown error'}`);
    } finally {
      console.log('🏁 Finally block - setting addingIndicator to false');
      setAddingIndicator(false);
    }
  };


  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchEAs(), fetchCustomIndicators()]);
    setLoading(false);
  };

  const renderEAItem = ({ item }: any) => {
    const signal = item.current_signal || item.signal || 'NEUTRAL';
    const signalColor = getSignalColor(signal);
    const isIndicator = item.type === 'indicator';

    return (
      <TouchableOpacity
        style={[
          styles.eaCard, 
          selectedEAId === item._id && styles.eaCardSelected,
          isIndicator && styles.indicatorCard
        ]}
        onPress={() => !isIndicator && selectEA(item._id)}
      >
        <View style={styles.eaCardHeader}>
          <View style={styles.eaCardInfo}>
            <Text style={styles.eaName}>
              {isIndicator && <Ionicons name="analytics" size={16} color="#00D9FF" />}
              {' '}{item.name}
            </Text>
            <Text style={styles.eaSymbol}>
              {isIndicator ? 'Custom Indicator' : (item.config?.symbol || 'N/A')}
            </Text>
          </View>
          <View style={[styles.statusIndicator, { backgroundColor: item.status === 'running' ? '#00FF88' : '#FF4444' }]} />
        </View>
        
        {/* Signal Display */}
        {item.status === 'running' && (
          <View style={styles.signalSection}>
            <View style={[styles.signalBadge, { borderColor: signalColor }]}>
              <Ionicons name={getSignalIcon(signal)} size={24} color={signalColor} />
              <Text style={[styles.signalText, { color: signalColor }]}>{signal}</Text>
            </View>
            {item.last_price > 0 && (
              <Text style={styles.lastPrice}>{item.last_price.toFixed(5)}</Text>
            )}
          </View>
        )}

        {/* Indicator Values */}
        {item.indicator_values && Object.keys(item.indicator_values).length > 0 && (
          <View style={styles.indicatorValues}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {Object.entries(item.indicator_values).map(([key, value]) => (
                <View key={key} style={styles.indicatorItem}>
                  <Text style={styles.indicatorKey}>{key.replace('_', ' ').toUpperCase()}</Text>
                  <Text style={styles.indicatorValue}>
                    {typeof value === 'number' ? value.toFixed(2) : value}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.eaCardFooter}>
          <View style={styles.eaDetails}>
            <Text style={styles.eaIndicator}>
              {item.type === 'indicator' ? '📊 Custom Indicator' : (item.config?.indicator?.type || 'N/A')}
            </Text>
            <Text style={styles.eaTimeframe}>
              {item.type === 'indicator' ? 'Real-time' : (item.config?.timeframe || 'N/A')}
            </Text>
          </View>
          {item.type !== 'indicator' && (
            <TouchableOpacity
              style={[styles.toggleButton, item.status === 'running' ? styles.runningButton : styles.stoppedButton]}
              onPress={(e) => {
                e.stopPropagation();
                toggleEAStatus(item._id);
              }}
            >
              <Ionicons name={item.status === 'running' ? 'stop-circle' : 'play-circle'} size={20} color="#fff" />
              <Text style={styles.toggleButtonText}>
                {item.status === 'running' ? 'STOP' : 'START'}
              </Text>
            </TouchableOpacity>
          )}
          {item.type === 'indicator' && (
            <View style={[styles.toggleButton, styles.runningButton]}>
              <Ionicons name="analytics" size={20} color="#fff" />
              <Text style={styles.toggleButtonText}>ACTIVE</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00D9FF" />
      </View>
    );
  }

  return (
    <LinearGradient colors={['#000', '#0a0a0a', '#000']} style={styles.container}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Ionicons name="pulse" size={32} color="#00D9FF" />
          <Text style={styles.headerTitle}>Trading Signals</Text>
        </View>

        {eas.length === 0 && customIndicators.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="pulse-outline" size={64} color="#333" />
            <Text style={styles.emptyText}>No Signal Monitors configured</Text>
            <Text style={styles.emptySubtext}>Add a signal monitor to start tracking market signals</Text>
            <TouchableOpacity style={styles.addButton} onPress={() => router.push('/add-ea')}>
              <Ionicons name="add-circle" size={24} color="#fff" />
              <Text style={styles.addButtonText}>Add Your First Monitor</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={[
              ...eas.map(ea => ({ ...ea, type: 'ea' })),
              ...customIndicators.map(ind => ({
                  _id: ind.id,
                  type: 'indicator',
                  name: ind.name,
                  symbol: 'N/A',
                  status: 'running',
                  signal: ind.current_signal || 'NONE',
                  config: {},
                  indicator_values: {}
                }))
            ]}
            renderItem={renderEAItem}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Removed floating add button - only show existing signals */}

        {/* Indicator Selection Modal */}
        <Modal
          visible={showIndicatorModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowIndicatorModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalSymbol}>{selectedSymbol}</Text>
                <TouchableOpacity onPress={() => setShowIndicatorModal(false)}>
                  <Ionicons name="close" size={28} color="#FF4444" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Timeframe Selection */}
                <View style={styles.selectionSection}>
                  <Text style={styles.selectionLabel}>SELECT TIMEFRAME</Text>
                  <View style={styles.timeframeRow}>
                    {['1m', '5m', '15m', '1H', '4H', '1D'].map((tf) => (
                      <TouchableOpacity
                        key={tf}
                        style={[
                          styles.timeframeButton,
                          selectedTimeframe === tf && styles.timeframeButtonActive
                        ]}
                        onPress={() => setSelectedTimeframe(tf)}
                      >
                        <Text style={[
                          styles.timeframeText,
                          selectedTimeframe === tf && styles.timeframeTextActive
                        ]}>
                          {tf}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Indicator Selection */}
                <View style={styles.selectionSection}>
                  <Text style={styles.selectionLabel}>SELECT INDICATOR</Text>
                  
                  {/* Mentor's Custom Indicators - Show First */}
                  {customIndicators.length > 0 && (
                    <>
                      <Text style={[styles.selectionLabel, { fontSize: 10, marginTop: 8, marginBottom: 8, color: '#00FF88' }]}>
                        MENTOR'S INDICATORS
                      </Text>
                      {customIndicators.map((indicator) => {
                        const isSelected = selectedIndicator === indicator.id;
                        return (
                          <TouchableOpacity
                            key={indicator.id}
                            style={[
                              styles.indicatorOption,
                              isSelected && styles.indicatorOptionSelected,
                              { borderLeftWidth: 4, borderLeftColor: '#00FF88' }
                            ]}
                            onPress={() => setSelectedIndicator(indicator.id)}
                          >
                            <View style={styles.indicatorContent}>
                              <Text style={styles.indicatorTitle}>{indicator.name}</Text>
                              <Text style={styles.indicatorSubtitle}>
                                {indicator.current_signal === 'BUY' ? 'Currently BUY' : 
                                 indicator.current_signal === 'SELL' ? 'Currently SELL' : 'No Signal'}
                              </Text>
                            </View>
                            {isSelected && (
                              <View style={styles.checkmark}>
                                <Ionicons name="checkmark-circle" size={24} color="#00FF88" />
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </>
                  )}
                </View>
              </ScrollView>

              {/* Add Button */}
              <TouchableOpacity
                style={[styles.addToSignalsButton, addingIndicator && styles.buttonDisabled]}
                onPress={addIndicatorToSignals}
                disabled={addingIndicator}
              >
                {addingIndicator ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <>
                    <Ionicons name="add-circle" size={24} color="#000" />
                    <Text style={styles.addToSignalsText}>ADD TO SIGNALS</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#222' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginLeft: 12, letterSpacing: 1 },
  listContent: { padding: 20, paddingBottom: 100 },
  
  eaCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: '#333', borderRadius: 12, padding: 16, marginBottom: 16 },
  eaCardSelected: { borderColor: '#00D9FF', borderWidth: 2, backgroundColor: 'rgba(0,217,255,0.1)' },
  indicatorCard: { borderColor: '#00D9FF', backgroundColor: 'rgba(0,217,255,0.05)' },
  eaCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  eaCardInfo: { flex: 1 },
  eaName: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  eaSymbol: { fontSize: 14, color: '#00D9FF', fontWeight: '600' },
  statusIndicator: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  
  signalSection: { alignItems: 'center', marginVertical: 12, paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#222' },
  signalBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 2, backgroundColor: 'rgba(0,0,0,0.5)' },
  signalText: { fontSize: 18, fontWeight: 'bold', letterSpacing: 2 },
  lastPrice: { fontSize: 14, color: '#888', marginTop: 6, fontWeight: '600' },
  
  indicatorValues: { marginBottom: 12 },
  indicatorItem: { backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginRight: 8, alignItems: 'center', minWidth: 80 },
  indicatorKey: { fontSize: 9, color: '#888', marginBottom: 4 },
  indicatorValue: { fontSize: 13, color: '#fff', fontWeight: 'bold' },
  
  eaCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eaDetails: { flex: 1 },
  eaIndicator: { fontSize: 11, color: '#888', marginBottom: 2 },
  eaTimeframe: { fontSize: 11, color: '#666' },
  toggleButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, gap: 4 },
  runningButton: { backgroundColor: '#FF4444' },
  stoppedButton: { backgroundColor: '#00FF88' },
  toggleButtonText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyText: { color: '#666', fontSize: 20, marginTop: 20, fontWeight: 'bold' },
  emptySubtext: { color: '#555', fontSize: 14, marginTop: 8, marginBottom: 32, textAlign: 'center' },
  addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#00D9FF', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, gap: 8 },
  addButtonText: { color: '#000', fontSize: 16, fontWeight: 'bold' },
  floatingAddButton: { position: 'absolute', right: 20, bottom: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: '#00D9FF', justifyContent: 'center', alignItems: 'center', shadowColor: '#00D9FF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 8 },
  buttonDisabled: { opacity: 0.5 },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#0a0a0a', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 20, paddingBottom: 40, maxHeight: '80%', borderTopWidth: 2, borderTopColor: '#00D9FF' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 20 },
  modalSymbol: { fontSize: 32, fontWeight: 'bold', color: '#00D9FF', letterSpacing: 2 },
  selectionSection: { paddingHorizontal: 24, marginBottom: 24 },
  selectionLabel: { fontSize: 12, color: '#00D9FF', fontWeight: 'bold', marginBottom: 12, letterSpacing: 1 },
  timeframeRow: { flexDirection: 'row', gap: 12 },
  timeframeButton: { flex: 1, paddingVertical: 12, backgroundColor: '#1a1a1a', borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  timeframeButtonActive: { backgroundColor: '#00D9FF', borderColor: '#00D9FF' },
  timeframeText: { color: '#666', fontSize: 14, fontWeight: 'bold' },
  timeframeTextActive: { color: '#000' },
  indicatorOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1a1a1a', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 2, borderColor: '#333' },
  indicatorOptionSelected: { borderColor: '#00FF88', backgroundColor: 'rgba(0,255,136,0.1)' },
  indicatorContent: { flex: 1 },
  indicatorTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  indicatorSubtitle: { fontSize: 12, color: '#888' },
  checkmark: { marginLeft: 12 },
  addToSignalsButton: { backgroundColor: '#00FF88', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 24, paddingVertical: 16, borderRadius: 12, marginTop: 12, gap: 8 },
  addToSignalsText: { color: '#000', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
});
