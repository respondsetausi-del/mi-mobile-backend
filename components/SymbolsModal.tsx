import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEAStore } from '../store/eaStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || '';

interface SymbolsModalProps {
  visible: boolean;
  onClose: () => void;
  onSymbolSelect: (symbol: string) => void;
}

export default function SymbolsModal({ visible, onClose, onSymbolSelect }: SymbolsModalProps) {
  const { quotes, fetchQuotes } = useEAStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [customIndicators, setCustomIndicators] = useState<any[]>([]);

  useEffect(() => {
    if (visible) {
      fetchQuotes();
      fetchCustomIndicators();
    }
  }, [visible]);

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

  const categories = ['all', 'forex', 'crypto', 'metals', 'indices', 'indicators'];

  // Combine regular symbols and mentor's custom indicators
  const allItems = [
    ...quotes,
    ...customIndicators.map(ind => ({
      symbol: ind.name,
      category: 'indicators',
      bid: 0,
      ask: 0,
      close: 0,
      change: 0,
      changePercent: 0,
      isIndicator: true,
      indicatorData: ind
    }))
  ];

  const filteredQuotes = allItems.filter(item => {
    const matchesSearch = item.symbol.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>QUOTES</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close-circle" size={32} color="#00D9FF" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#00D9FF" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search symbols..."
              placeholderTextColor="#666"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
            {categories.map(category => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryTab,
                  selectedCategory === category && styles.categoryTabActive
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text style={[
                  styles.categoryTabText,
                  selectedCategory === category && styles.categoryTabTextActive
                ]}>
                  {category.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Single-step: All Symbols and Indicators */}
          <ScrollView style={styles.symbolsList} showsVerticalScrollIndicator={false}>
            {filteredQuotes.map((item, index) => {
              if (item.isIndicator) {
                // Render mentor's custom indicator
                return (
                  <TouchableOpacity
                    key={`indicator-${item.indicatorData.id}`}
                    style={[styles.symbolRow, styles.indicatorHighlight]}
                    onPress={() => {
                      onSymbolSelect(item.symbol);
                      onClose();
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.symbolLeft}>
                      <View style={styles.indicatorBadgeContainer}>
                        <Ionicons name="analytics" size={16} color="#00FF88" />
                        <Text style={[styles.symbolName, { color: '#00FF88' }]}>{item.symbol}</Text>
                      </View>
                      <Text style={styles.symbolCategory}>
                        MENTOR INDICATOR • {item.indicatorData.current_signal === 'BUY' ? '📈 BUY' :
                        item.indicatorData.current_signal === 'SELL' ? '📉 SELL' : '⏸️ NO SIGNAL'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#00FF88" style={{ marginLeft: 12 }} />
                  </TouchableOpacity>
                );
              } else {
                // Render regular symbol/quote
                return (
                  <TouchableOpacity
                    key={`symbol-${index}`}
                    style={styles.symbolRow}
                    onPress={() => {
                      onSymbolSelect(item.symbol);
                      onClose();
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.symbolLeft}>
                      <Text style={styles.symbolName}>{item.symbol}</Text>
                      <Text style={styles.symbolCategory}>{item.category.toUpperCase()}</Text>
                    </View>
                    <View style={styles.symbolRight}>
                      <Text style={styles.symbolPrice}>{(item.close || item.bid || 0).toFixed(5)}</Text>
                      <Text style={[styles.symbolChange, { color: (item.change || 0) >= 0 ? '#00FF88' : '#FF4444' }]}>
                        {(item.change || 0) >= 0 ? '+' : ''}{(item.change || 0).toFixed(2)}%
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#00D9FF" style={{ marginLeft: 12 }} />
                  </TouchableOpacity>
                );
              }
            })}
          </ScrollView>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {filteredQuotes.length} items available
              {customIndicators.length > 0 && ` (${customIndicators.length} mentor indicators)`}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' },
  modalContent: { flex: 1, paddingTop: 60, paddingHorizontal: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#00D9FF', letterSpacing: 2 },
  
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: '#333', borderRadius: 12, paddingHorizontal: 12, marginBottom: 16 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: '#fff', fontSize: 15, paddingVertical: 12 },
  
  categoriesContainer: { marginBottom: 16, maxHeight: 50 },
  categoryTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: '#333', marginRight: 8 },
  categoryTabActive: { backgroundColor: '#00D9FF', borderColor: '#00D9FF' },
  categoryTabText: { fontSize: 11, color: '#666', fontWeight: '600', letterSpacing: 0.5 },
  categoryTabTextActive: { color: '#000' },
  
  symbolsList: { flex: 1, marginBottom: 16 },
  symbolRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 2, borderColor: '#00D9FF', borderRadius: 12, padding: 16, marginBottom: 10, shadowColor: '#00D9FF', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 },
  symbolLeft: { flex: 1 },
  symbolRight: { alignItems: 'flex-end', marginRight: 8 },
  symbolName: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  symbolCategory: { fontSize: 10, color: '#666', letterSpacing: 0.5 },
  symbolPrice: { fontSize: 15, fontWeight: 'bold', color: '#fff', marginBottom: 2 },
  symbolChange: { fontSize: 12, fontWeight: '600' },
  
  indicatorHighlight: {
    borderColor: '#00FF88',
    backgroundColor: 'rgba(0,255,136,0.05)',
    shadowColor: '#00FF88',
  },
  indicatorBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  
  footer: { paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#222', alignItems: 'center' },
  footerText: { color: '#666', fontSize: 12 },
});
