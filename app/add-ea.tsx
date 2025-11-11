import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEAStore } from '../store/eaStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';

const INDICATOR_TYPES = [
  { label: 'Moving Average Crossover', value: 'MA_CROSSOVER' },
  { label: 'RSI (Relative Strength Index)', value: 'RSI' },
  { label: 'MACD', value: 'MACD' },
  { label: 'Bollinger Bands', value: 'BOLLINGER_BANDS' },
  { label: 'Stochastic Oscillator', value: 'STOCHASTIC' },
];

const TIMEFRAMES = [
  { label: '1 Minute', value: '1m' },
  { label: '5 Minutes', value: '5m' },
  { label: '15 Minutes', value: '15m' },
  { label: '30 Minutes', value: '30m' },
  { label: '1 Hour', value: '1h' },
  { label: '4 Hours', value: '4h' },
  { label: '1 Day', value: '1d' },
  { label: '1 Week', value: '1w' },
];

export default function AddEAScreen() {
  const router = useRouter();
  const { addEA, symbols, fetchSymbols } = useEAStore();
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('forex');
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    timeframe: '1h',
    indicatorType: 'RSI',
    indicatorParams: {},
  });

  useEffect(() => {
    fetchSymbols();
  }, []);

  useEffect(() => {
    // Set default indicator parameters
    setDefaultIndicatorParams(formData.indicatorType);
  }, [formData.indicatorType]);

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
    setFormData(prev => ({ ...prev, indicatorParams: params }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter EA name');
      return;
    }
    if (!formData.symbol) {
      Alert.alert('Error', 'Please select a trading symbol');
      return;
    }

    setLoading(true);
    try {
      await addEA({
        name: formData.name,
        config: {
          symbol: formData.symbol,
          timeframe: formData.timeframe,
          indicator: {
            type: formData.indicatorType,
            parameters: formData.indicatorParams,
          },
        },
      });
      Alert.alert('Success', 'EA configured successfully!');
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to add EA. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateIndicatorParam = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      indicatorParams: {
        ...prev.indicatorParams,
        [key]: parseFloat(value) || value,
      },
    }));
  };

  const renderIndicatorSettings = () => {
    switch (formData.indicatorType) {
      case 'MA_CROSSOVER':
        return (
          <>
            <View style={styles.paramRow}>
              <Text style={styles.paramLabel}>Fast Period:</Text>
              <TextInput
                style={styles.paramInput}
                value={formData.indicatorParams.fast_period?.toString()}
                onChangeText={(v) => updateIndicatorParam('fast_period', v)}
                keyboardType="numeric"
                placeholderTextColor="#555"
              />
            </View>
            <View style={styles.paramRow}>
              <Text style={styles.paramLabel}>Slow Period:</Text>
              <TextInput
                style={styles.paramInput}
                value={formData.indicatorParams.slow_period?.toString()}
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
                value={formData.indicatorParams.period?.toString()}
                onChangeText={(v) => updateIndicatorParam('period', v)}
                keyboardType="numeric"
                placeholderTextColor="#555"
              />
            </View>
            <View style={styles.paramRow}>
              <Text style={styles.paramLabel}>Oversold:</Text>
              <TextInput
                style={styles.paramInput}
                value={formData.indicatorParams.oversold?.toString()}
                onChangeText={(v) => updateIndicatorParam('oversold', v)}
                keyboardType="numeric"
                placeholderTextColor="#555"
              />
            </View>
            <View style={styles.paramRow}>
              <Text style={styles.paramLabel}>Overbought:</Text>
              <TextInput
                style={styles.paramInput}
                value={formData.indicatorParams.overbought?.toString()}
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
                value={formData.indicatorParams.fast?.toString()}
                onChangeText={(v) => updateIndicatorParam('fast', v)}
                keyboardType="numeric"
                placeholderTextColor="#555"
              />
            </View>
            <View style={styles.paramRow}>
              <Text style={styles.paramLabel}>Slow:</Text>
              <TextInput
                style={styles.paramInput}
                value={formData.indicatorParams.slow?.toString()}
                onChangeText={(v) => updateIndicatorParam('slow', v)}
                keyboardType="numeric"
                placeholderTextColor="#555"
              />
            </View>
            <View style={styles.paramRow}>
              <Text style={styles.paramLabel}>Signal:</Text>
              <TextInput
                style={styles.paramInput}
                value={formData.indicatorParams.signal?.toString()}
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
                value={formData.indicatorParams.period?.toString()}
                onChangeText={(v) => updateIndicatorParam('period', v)}
                keyboardType="numeric"
                placeholderTextColor="#555"
              />
            </View>
            <View style={styles.paramRow}>
              <Text style={styles.paramLabel}>Std Dev:</Text>
              <TextInput
                style={styles.paramInput}
                value={formData.indicatorParams.std_dev?.toString()}
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
                value={formData.indicatorParams.period?.toString()}
                onChangeText={(v) => updateIndicatorParam('period', v)}
                keyboardType="numeric"
                placeholderTextColor="#555"
              />
            </View>
            <View style={styles.paramRow}>
              <Text style={styles.paramLabel}>K Smooth:</Text>
              <TextInput
                style={styles.paramInput}
                value={formData.indicatorParams.k_smooth?.toString()}
                onChangeText={(v) => updateIndicatorParam('k_smooth', v)}
                keyboardType="numeric"
                placeholderTextColor="#555"
              />
            </View>
            <View style={styles.paramRow}>
              <Text style={styles.paramLabel}>Oversold:</Text>
              <TextInput
                style={styles.paramInput}
                value={formData.indicatorParams.oversold?.toString()}
                onChangeText={(v) => updateIndicatorParam('oversold', v)}
                keyboardType="numeric"
                placeholderTextColor="#555"
              />
            </View>
            <View style={styles.paramRow}>
              <Text style={styles.paramLabel}>Overbought:</Text>
              <TextInput
                style={styles.paramInput}
                value={formData.indicatorParams.overbought?.toString()}
                onChangeText={(v) => updateIndicatorParam('overbought', v)}
                keyboardType="numeric"
                placeholderTextColor="#555"
              />
            </View>
          </>
        );
    }
  };

  const categorySymbols = symbols[selectedCategory] || [];

  return (
    <LinearGradient colors={['#000', '#0a0a0a', '#000']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              <Ionicons name="settings" size={48} color="#00D9FF" />
              <Text style={styles.headerTitle}>Configure Trading Bot</Text>
              <Text style={styles.headerSubtitle}>Set up your EA with indicators</Text>
            </View>

            <View style={styles.form}>
              {/* EA Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>EA Name</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="cube-outline" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., EUR/USD RSI Bot"
                    placeholderTextColor="#555"
                    value={formData.name}
                    onChangeText={(text) => setFormData({ ...formData, name: text })}
                  />
                </View>
              </View>

              {/* Symbol Category */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Asset Category</Text>
                <View style={styles.categoryButtons}>
                  {['forex', 'crypto', 'metals', 'indices'].map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryButton,
                        selectedCategory === cat && styles.categoryButtonActive,
                      ]}
                      onPress={() => setSelectedCategory(cat)}
                    >
                      <Text
                        style={[
                          styles.categoryButtonText,
                          selectedCategory === cat && styles.categoryButtonTextActive,
                        ]}
                      >
                        {cat.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Symbol Selection */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Trading Symbol</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={formData.symbol}
                    onValueChange={(value) => setFormData({ ...formData, symbol: value })}
                    style={styles.picker}
                    dropdownIconColor="#00D9FF"
                  >
                    <Picker.Item label="Select Symbol" value="" color="#999" />
                    {categorySymbols.map((sym) => (
                      <Picker.Item key={sym} label={sym} value={sym} color="#fff" />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Timeframe */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Timeframe</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={formData.timeframe}
                    onValueChange={(value) => setFormData({ ...formData, timeframe: value })}
                    style={styles.picker}
                    dropdownIconColor="#00D9FF"
                  >
                    {TIMEFRAMES.map((tf) => (
                      <Picker.Item key={tf.value} label={tf.label} value={tf.value} color="#fff" />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Indicator Type */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Technical Indicator</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={formData.indicatorType}
                    onValueChange={(value) => setFormData({ ...formData, indicatorType: value })}
                    style={styles.picker}
                    dropdownIconColor="#00D9FF"
                  >
                    {INDICATOR_TYPES.map((ind) => (
                      <Picker.Item key={ind.value} label={ind.label} value={ind.value} color="#fff" />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Indicator Settings */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Indicator Settings</Text>
                <View style={styles.settingsContainer}>
                  {renderIndicatorSettings()}
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={24} color="#000" />
                  <Text style={styles.submitButtonText}>CREATE EA</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 6,
  },
  form: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: '#00D9FF',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    paddingVertical: 12,
  },
  categoryButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  categoryButtonActive: {
    backgroundColor: '#00D9FF',
    borderColor: '#00D9FF',
  },
  categoryButtonText: {
    color: '#666',
    fontSize: 11,
    fontWeight: '600',
  },
  categoryButtonTextActive: {
    color: '#000',
  },
  pickerContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    overflow: 'hidden',
  },
  picker: {
    color: '#fff',
    height: 50,
  },
  settingsContainer: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#222',
  },
  paramRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  paramLabel: {
    color: '#888',
    fontSize: 13,
    flex: 1,
  },
  paramInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#fff',
    fontSize: 14,
    width: 80,
    textAlign: 'center',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00D9FF',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 14,
  },
});
