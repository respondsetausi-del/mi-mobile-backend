import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEAStore } from '../store/eaStore';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || '';

const INDICATOR_TYPES = [
  { label: 'RSI', value: 'RSI', description: 'Relative Strength Index' },
  { label: 'MA Cross', value: 'MA_CROSSOVER', description: 'Moving Average Crossover' },
  { label: 'MACD', value: 'MACD', description: 'MACD Indicator' },
  { label: 'Bollinger', value: 'BOLLINGER_BANDS', description: 'Bollinger Bands' },
  { label: 'Stochastic', value: 'STOCHASTIC', description: 'Stochastic Oscillator' },
];

const TIMEFRAMES = [
  { label: '1m', value: '1m', description: '1 Minute' },
  { label: '5m', value: '5m', description: '5 Minutes' },
  { label: '15m', value: '15m', description: '15 Minutes' },
  { label: '30m', value: '30m', description: '30 Minutes' },
  { label: '1h', value: '1h', description: '1 Hour' },
  { label: '4h', value: '4h', description: '4 Hours' },
  { label: '1d', value: '1d', description: '1 Day' },
  { label: '1w', value: '1w', description: '1 Week' },
];

interface AddEAModalProps {
  visible: boolean;
  symbol: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddEAModal({ visible, symbol, onClose, onSuccess }: AddEAModalProps) {
  const { addEA } = useEAStore();
  const [loading, setLoading] = useState(false);
  const [timeframe, setTimeframe] = useState('1h');
  const [indicatorType, setIndicatorType] = useState('RSI');
  const [indicatorParams, setIndicatorParams] = useState<any>({});
  const [customIndicators, setCustomIndicators] = useState<any[]>([]);

  useEffect(() => {
    if (visible) {
      setDefaultIndicatorParams(indicatorType);
      fetchCustomIndicators();
    }
  }, [visible, indicatorType]);

  const fetchCustomIndicators = async () => {
    try {
      console.log('📊 FETCHING CUSTOM INDICATORS...');
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        console.log('❌ No auth token found');
        return;
      }

      console.log('🔑 Token found, calling API...');
      const response = await fetch(`${API_URL}/api/user/mentor-indicators`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      console.log('📡 Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Custom indicators received:', data);
        console.log('📋 Number of indicators:', data.indicators?.length || 0);
        console.log('📋 Indicator names:', data.indicators?.map(i => i.name));
        setCustomIndicators(data.indicators || []);
        console.log('✅ State updated with', data.indicators?.length || 0, 'indicators');
      } else {
        console.log('❌ API returned error:', response.status);
      }
    } catch (error) {
      console.error('❌ Error fetching custom indicators:', error);
    }
  };

  const setDefaultIndicatorParams = (type: string) => {
    let params = {};
    switch (type) {
      case 'MA_CROSSOVER':
        params = { fast_period: 10, slow_period: 20 };
        break;
      case 'RSI':
        params = { period: 14, oversold: 30, overbought: 70 };
        break;
      case 'MACD':
        params = { fast: 12, slow: 26, signal: 9 };
        break;
      case 'BOLLINGER_BANDS':
        params = { period: 20, std_dev: 2.0 };
        break;
      case 'STOCHASTIC':
        params = { period: 14, k_smooth: 3, oversold: 20, overbought: 80 };
        break;
    }
    setIndicatorParams(params);
  };

  const updateIndicatorParam = (key: string, value: any) => {
    setIndicatorParams((prev: any) => ({
      ...prev,
      [key]: parseFloat(value) || value,
    }));
  };

  const handleAdd = async () => {
    try {
      setLoading(true);
      
      // Check if this is a custom mentor indicator
      const isMentorIndicator = customIndicators.find(ind => ind.id === indicatorType);
      
      if (isMentorIndicator) {
        // Subscribe to mentor indicator
        await subscribeToIndicator(isMentorIndicator.id, symbol, timeframe);
      } else {
        // Add regular EA
        await addEA({
          name: `${symbol} ${indicatorType} Bot`,
          config: {
            symbol,
            timeframe,
            indicator: {
              type: indicatorType,
              parameters: indicatorParams,
            },
          },
        });
      }
      
      Alert.alert('Success', `${symbol} ${isMentorIndicator ? 'indicator subscribed' : 'EA added'} successfully!`);
      onSuccess();
      onClose();
    } catch (error) {
      Alert.alert('Error', `Failed to ${customIndicators.find(ind => ind.id === indicatorType) ? 'subscribe to indicator' : 'add EA'}. Please try again.`);
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToIndicator = async (indicatorId: string, symbol: string, timeframe: string) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) throw new Error('No auth token');

      const response = await fetch(`${API_URL}/api/user/subscribe-to-indicator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          indicator_id: indicatorId,
          symbol: symbol,
          timeframe: timeframe,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to subscribe');
      }

      console.log('✅ Subscribed to mentor indicator');
    } catch (error) {
      console.error('Error subscribing:', error);
      throw error;
    }
  };

  const renderIndicatorSettings = () => {
    switch (indicatorType) {
      case 'MA_CROSSOVER':
        return (
          <>
            <View style={styles.paramRow}>
              <Text style={styles.paramLabel}>Fast Period:</Text>
              <TextInput
                style={styles.paramInput}
                value={indicatorParams.fast_period?.toString()}
                onChangeText={(v) => updateIndicatorParam('fast_period', v)}
                keyboardType="numeric"
                placeholderTextColor="#555"
              />
            </View>
            <View style={styles.paramRow}>
              <Text style={styles.paramLabel}>Slow Period:</Text>
              <TextInput
                style={styles.paramInput}
                value={indicatorParams.slow_period?.toString()}
                onChangeText={(v) => updateIndicatorParam('slow_period', v)}
                keyboardType="numeric"
                placeholderTextColor="#555"
              />
            </View>
          </>
        );
      case 'RSI':
        return (
          <>
            <View style={styles.paramRow}>
              <Text style={styles.paramLabel}>Period:</Text>
              <TextInput
                style={styles.paramInput}
                value={indicatorParams.period?.toString()}
                onChangeText={(v) => updateIndicatorParam('period', v)}
                keyboardType="numeric"
                placeholderTextColor="#555"
              />
            </View>
            <View style={styles.paramRow}>
              <Text style={styles.paramLabel}>Oversold:</Text>
              <TextInput
                style={styles.paramInput}
                value={indicatorParams.oversold?.toString()}
                onChangeText={(v) => updateIndicatorParam('oversold', v)}
                keyboardType="numeric"
                placeholderTextColor="#555"
              />
            </View>
            <View style={styles.paramRow}>
              <Text style={styles.paramLabel}>Overbought:</Text>
              <TextInput
                style={styles.paramInput}
                value={indicatorParams.overbought?.toString()}
                onChangeText={(v) => updateIndicatorParam('overbought', v)}
                keyboardType="numeric"
                placeholderTextColor="#555"
              />
            </View>
          </>
        );
      case 'MACD':
        return (
          <>
            <View style={styles.paramRow}>
              <Text style={styles.paramLabel}>Fast:</Text>
              <TextInput
                style={styles.paramInput}
                value={indicatorParams.fast?.toString()}
                onChangeText={(v) => updateIndicatorParam('fast', v)}
                keyboardType="numeric"
                placeholderTextColor="#555"
              />
            </View>
            <View style={styles.paramRow}>
              <Text style={styles.paramLabel}>Slow:</Text>
              <TextInput
                style={styles.paramInput}
                value={indicatorParams.slow?.toString()}
                onChangeText={(v) => updateIndicatorParam('slow', v)}
                keyboardType="numeric"
                placeholderTextColor="#555"
              />
            </View>
            <View style={styles.paramRow}>
              <Text style={styles.paramLabel}>Signal:</Text>
              <TextInput
                style={styles.paramInput}
                value={indicatorParams.signal?.toString()}
                onChangeText={(v) => updateIndicatorParam('signal', v)}
                keyboardType="numeric"
                placeholderTextColor="#555"
              />
            </View>
          </>
        );
      case 'BOLLINGER_BANDS':
        return (
          <>
            <View style={styles.paramRow}>
              <Text style={styles.paramLabel}>Period:</Text>
              <TextInput
                style={styles.paramInput}
                value={indicatorParams.period?.toString()}
                onChangeText={(v) => updateIndicatorParam('period', v)}
                keyboardType="numeric"
                placeholderTextColor="#555"
              />
            </View>
            <View style={styles.paramRow}>
              <Text style={styles.paramLabel}>Std Dev:</Text>
              <TextInput
                style={styles.paramInput}
                value={indicatorParams.std_dev?.toString()}
                onChangeText={(v) => updateIndicatorParam('std_dev', v)}
                keyboardType="numeric"
                placeholderTextColor="#555"
              />
            </View>
          </>
        );
      case 'STOCHASTIC':
        return (
          <>
            <View style={styles.paramRow}>
              <Text style={styles.paramLabel}>Period:</Text>
              <TextInput
                style={styles.paramInput}
                value={indicatorParams.period?.toString()}
                onChangeText={(v) => updateIndicatorParam('period', v)}
                keyboardType="numeric"
                placeholderTextColor="#555"
              />
            </View>
            <View style={styles.paramRow}>
              <Text style={styles.paramLabel}>K Smooth:</Text>
              <TextInput
                style={styles.paramInput}
                value={indicatorParams.k_smooth?.toString()}
                onChangeText={(v) => updateIndicatorParam('k_smooth', v)}
                keyboardType="numeric"
                placeholderTextColor="#555"
              />
            </View>
            <View style={styles.paramRow}>
              <Text style={styles.paramLabel}>Oversold:</Text>
              <TextInput
                style={styles.paramInput}
                value={indicatorParams.oversold?.toString()}
                onChangeText={(v) => updateIndicatorParam('oversold', v)}
                keyboardType="numeric"
                placeholderTextColor="#555"
              />
            </View>
            <View style={styles.paramRow}>
              <Text style={styles.paramLabel}>Overbought:</Text>
              <TextInput
                style={styles.paramInput}
                value={indicatorParams.overbought?.toString()}
                onChangeText={(v) => updateIndicatorParam('overbought', v)}
                keyboardType="numeric"
                placeholderTextColor="#555"
              />
            </View>
          </>
        );
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <LinearGradient colors={['#000', '#0a0a0a']} style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{symbol}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close-circle" size={32} color="#FF4444" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>SELECT TIMEFRAME</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollSelector}>
              {TIMEFRAMES.map((tf) => (
                <TouchableOpacity
                  key={tf.value}
                  style={[styles.selectorItem, timeframe === tf.value && styles.selectorItemSelected]}
                  onPress={() => setTimeframe(tf.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.selectorLabel, timeframe === tf.value && styles.selectorLabelSelected]}>
                    {tf.label}
                  </Text>
                  <Text style={[styles.selectorDescription, timeframe === tf.value && styles.selectorDescriptionSelected]}>
                    {tf.description}
                  </Text>
                  {timeframe === tf.value && (
                    <Ionicons name="checkmark-circle" size={20} color="#00FF88" style={styles.checkmark} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.sectionTitle}>SELECT INDICATOR</Text>
            <View style={styles.indicatorGrid}>
              {INDICATOR_TYPES.map((ind) => (
                <TouchableOpacity
                  key={ind.value}
                  style={[styles.indicatorCard, indicatorType === ind.value && styles.indicatorCardSelected]}
                  onPress={() => setIndicatorType(ind.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.indicatorLabel, indicatorType === ind.value && styles.indicatorLabelSelected]}>
                    {ind.label}
                  </Text>
                  <Text style={[styles.indicatorDescription, indicatorType === ind.value && styles.indicatorDescriptionSelected]}>
                    {ind.description}
                  </Text>
                  {indicatorType === ind.value && (
                    <View style={styles.selectedBadge}>
                      <Ionicons name="checkmark-circle" size={24} color="#00FF88" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
              
              {/* Mentor's Custom Indicators */}
              {customIndicators.map((ind) => (
                <TouchableOpacity
                  key={ind.id}
                  style={[styles.indicatorCard, styles.mentorIndicatorCard, indicatorType === ind.id && styles.indicatorCardSelected]}
                  onPress={() => setIndicatorType(ind.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.indicatorLabel, styles.mentorIndicatorLabel, indicatorType === ind.id && styles.indicatorLabelSelected]}>
                    {ind.name}
                  </Text>
                  <Text style={[styles.indicatorDescription, indicatorType === ind.id && styles.indicatorDescriptionSelected]}>
                    {ind.current_signal === 'BUY' ? '📈 BUY' : ind.current_signal === 'SELL' ? '📉 SELL' : '⏸️ NO SIGNAL'}
                  </Text>
                  {indicatorType === ind.id && (
                    <View style={styles.selectedBadge}>
                      <Ionicons name="checkmark-circle" size={24} color="#00FF88" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Only show settings for built-in indicators */}
            {!customIndicators.find(ind => ind.id === indicatorType) && (
              <>
                <Text style={styles.sectionTitle}>INDICATOR SETTINGS</Text>
                <View style={styles.settingsContainer}>
                  {renderIndicatorSettings()}
                </View>
              </>
            )}
          </ScrollView>

          <TouchableOpacity
            style={[styles.addButton, loading && styles.addButtonDisabled]}
            onPress={handleAdd}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <Ionicons name="add-circle" size={24} color="#000" />
                <Text style={styles.addButtonText}>ADD TO SIGNALS</Text>
              </>
            )}
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'flex-end' },
  modalContent: { height: '90%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 28, fontWeight: 'bold', color: '#00D9FF', letterSpacing: 2 },
  modalBody: { flex: 1, marginBottom: 20 },
  
  sectionTitle: { fontSize: 12, color: '#00D9FF', fontWeight: 'bold', marginTop: 20, marginBottom: 12, letterSpacing: 1 },
  
  scrollSelector: { marginBottom: 8 },
  selectorItem: { 
    backgroundColor: 'rgba(255,255,255,0.05)', 
    borderWidth: 2, 
    borderColor: '#333', 
    borderRadius: 12, 
    padding: 16, 
    marginRight: 12, 
    minWidth: 100,
    alignItems: 'center',
    position: 'relative',
  },
  selectorItemSelected: { 
    backgroundColor: 'rgba(0,255,136,0.15)', 
    borderColor: '#00FF88', 
    borderWidth: 3,
    shadowColor: '#00FF88',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  selectorLabel: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  selectorLabelSelected: { color: '#00FF88' },
  selectorDescription: { fontSize: 11, color: '#666' },
  selectorDescriptionSelected: { color: '#00D9FF' },
  checkmark: { position: 'absolute', top: 8, right: 8 },
  
  indicatorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  indicatorCard: { 
    backgroundColor: 'rgba(255,255,255,0.05)', 
    borderWidth: 2, 
    borderColor: '#333', 
    borderRadius: 12, 
    padding: 16, 
    width: '48%',
    minHeight: 90,
    position: 'relative',
  },
  indicatorCardSelected: { 
    backgroundColor: 'rgba(0,255,136,0.15)', 
    borderColor: '#00FF88', 
    borderWidth: 3,
    shadowColor: '#00FF88',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  indicatorLabel: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 6 },
  indicatorLabelSelected: { color: '#00FF88' },
  indicatorDescription: { fontSize: 11, color: '#666', lineHeight: 16 },
  indicatorDescriptionSelected: { color: '#00D9FF' },
  selectedBadge: { position: 'absolute', top: 8, right: 8 },
  
  mentorIndicatorCard: {
    borderColor: '#00FF88',
    borderWidth: 2,
    backgroundColor: 'rgba(0,255,136,0.05)',
  },
  mentorIndicatorLabel: {
    color: '#00FF88',
  },
  
  settingsContainer: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#222', marginBottom: 20 },
  paramRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  paramLabel: { color: '#888', fontSize: 14, flex: 1 },
  paramInput: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: '#333', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, color: '#fff', fontSize: 14, width: 80, textAlign: 'center' },
  
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#00FF88', paddingVertical: 16, borderRadius: 12, gap: 8, shadowColor: '#00FF88', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 8 },
  addButtonDisabled: { opacity: 0.6 },
  addButtonText: { color: '#000', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
});
