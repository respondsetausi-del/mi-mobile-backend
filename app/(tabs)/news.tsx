import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || '';

export default function NewsScreen() {
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchNews();
    const interval = setInterval(fetchNews, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchNews = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch(`${API_URL}/api/user/news`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setNews(data.news || []);
      }
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchNews();
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'High':
        return '#ff4444';
      case 'Medium':
        return '#ffa500';
      case 'Low':
        return '#888';
      default:
        return '#888';
    }
  };

  const getSignalColor = (signal: string) => {
    return signal === 'BUY' ? '#00FF88' : '#ff4444';
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#000000', '#0a0a0a', '#000000']} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <Ionicons name="newspaper" size={32} color="#00D9FF" />
            <Text style={styles.headerTitle}>Market News</Text>
          </View>

          {/* News List */}
          <ScrollView
            style={styles.scrollView}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#00D9FF"
              />
            }
          >
            {loading ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Loading news...</Text>
              </View>
            ) : news.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="newspaper-outline" size={64} color="#333" />
                <Text style={styles.emptyText}>No news events available</Text>
                <Text style={styles.emptySubtext}>
                  Your mentor will post market events here
                </Text>
              </View>
            ) : (
              news.map((item, index) => (
                <View key={item.id || index} style={styles.newsCard}>
                  {/* Header with Time and Currency */}
                  <View style={styles.newsCardHeader}>
                    <View style={styles.timeContainer}>
                      <Ionicons name="time" size={18} color="#00D9FF" />
                      <Text style={styles.timeText}>{item.event_time}</Text>
                    </View>
                    <View style={styles.badgesContainer}>
                      {item.source === 'mentor' && (
                        <View style={styles.sourceBadge}>
                          <Ionicons name="person" size={12} color="#00D9FF" />
                          <Text style={styles.sourceText}>Mentor</Text>
                        </View>
                      )}
                      {item.source === 'calendar' && (
                        <View style={[styles.sourceBadge, { backgroundColor: 'rgba(0, 255, 136, 0.2)' }]}>
                          <Ionicons name="calendar" size={12} color="#00FF88" />
                          <Text style={[styles.sourceText, { color: '#00FF88' }]}>Live</Text>
                        </View>
                      )}
                      <View
                        style={[
                          styles.currencyBadge,
                          { backgroundColor: getImpactColor(item.impact) },
                        ]}
                      >
                        <Text style={styles.currencyText}>{item.currency}</Text>
                      </View>
                    </View>
                  </View>

                  {/* News Title */}
                  <Text style={styles.newsTitle}>{item.title}</Text>

                  {/* Footer with Impact and Signal */}
                  <View style={styles.newsCardFooter}>
                    <View style={styles.impactContainer}>
                      <Ionicons
                        name="alert-circle"
                        size={16}
                        color={getImpactColor(item.impact)}
                      />
                      <Text
                        style={[
                          styles.impactText,
                          { color: getImpactColor(item.impact) },
                        ]}
                      >
                        {item.impact} Impact
                      </Text>
                    </View>

                    {item.signal && (
                      <View
                        style={[
                          styles.signalBadge,
                          { backgroundColor: getSignalColor(item.signal) },
                        ]}
                      >
                        <Ionicons
                          name={
                            item.signal === 'BUY' ? 'trending-up' : 'trending-down'
                          }
                          size={14}
                          color="#fff"
                        />
                        <Text style={styles.signalText}>{item.signal}</Text>
                      </View>
                    )}
                  </View>

                  {/* Timestamp */}
                  <Text style={styles.timestamp}>
                    Posted: {new Date(item.created_at).toLocaleString()}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    color: '#888',
    fontSize: 18,
    marginTop: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  newsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.2)',
  },
  newsCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
    color: '#00D9FF',
    fontSize: 14,
    fontWeight: '600',
  },
  badgesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 217, 255, 0.2)',
  },
  sourceText: {
    color: '#00D9FF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  currencyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currencyText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  newsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    lineHeight: 24,
  },
  newsCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  impactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  impactText: {
    fontSize: 13,
    fontWeight: '600',
  },
  signalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  signalText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  timestamp: {
    color: '#666',
    fontSize: 11,
    marginTop: 8,
    fontStyle: 'italic',
  },
});
