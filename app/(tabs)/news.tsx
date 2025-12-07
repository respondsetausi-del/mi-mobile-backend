import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.backendUrl || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';

interface NewsItem {
  id: string;
  title: string;
  event_time: string;
  currency: string;
  impact: string;
  description?: string;
  signal?: string;
}

export default function NewsScreen() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNews = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch(`${API_URL}/api/user/news`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('News data:', data);
        
        // Filter to show only UPCOMING events (future dates)
        const now = new Date();
        const upcomingNews = (data.news || []).filter((item: NewsItem) => {
          try {
            const eventDate = new Date(item.event_time);
            return eventDate > now; // Only show future events
          } catch (e) {
            return false; // Skip invalid dates
          }
        });
        
        console.log('Filtered upcoming news:', upcomingNews.length);
        setNews(upcomingNews);
      }
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNews();
  };

  const getImpactColor = (impact: string) => {
    switch (impact?.toLowerCase()) {
      case 'high':
        return '#ff4444';
      case 'medium':
        return '#ffa500';
      default:
        return '#888';
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00D9FF" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Ionicons name="newspaper" size={28} color="#00D9FF" />
          <Text style={styles.headerTitle}>Market News</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          Stay updated with latest market events
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#00D9FF"
            colors={['#00D9FF']}
          />
        }
      >
        {news.length > 0 ? (
          news.map((item, index) => (
            <View key={item.id || index} style={styles.newsCard}>
              <LinearGradient
                colors={['rgba(0, 217, 255, 0.08)', 'rgba(0, 217, 255, 0.03)']}
                style={styles.newsGradient}
              >
                {/* Time and Currency Row */}
                <View style={styles.newsHeader}>
                  <View style={styles.timeContainer}>
                    <Ionicons name="time-outline" size={16} color="#00D9FF" />
                    <Text style={styles.timeText}>{item.event_time}</Text>
                  </View>
                  <View style={[styles.currencyBadge, { 
                    backgroundColor: `${getImpactColor(item.impact)}20`,
                    borderColor: getImpactColor(item.impact),
                  }]}>
                    <Text style={[styles.currencyText, { color: getImpactColor(item.impact) }]}>
                      {item.currency}
                    </Text>
                  </View>
                </View>

                {/* Title */}
                <Text style={styles.newsTitle} numberOfLines={2}>
                  {item.title}
                </Text>

                {/* Description */}
                {item.description && (
                  <Text style={styles.newsDescription} numberOfLines={3}>
                    {item.description}
                  </Text>
                )}

                {/* Footer with Impact and Signal */}
                <View style={styles.newsFooter}>
                  <View style={[styles.impactBadge, {
                    backgroundColor: `${getImpactColor(item.impact)}15`,
                    borderColor: getImpactColor(item.impact),
                  }]}>
                    <Ionicons 
                      name={item.impact?.toLowerCase() === 'high' ? 'alert-circle' : 
                            item.impact?.toLowerCase() === 'medium' ? 'alert' : 'information-circle'} 
                      size={12} 
                      color={getImpactColor(item.impact)} 
                    />
                    <Text style={[styles.impactText, { color: getImpactColor(item.impact) }]}>
                      {item.impact} Impact
                    </Text>
                  </View>

                  {item.signal && (
                    <View style={[styles.signalBadge, { 
                      backgroundColor: item.signal === 'BUY' ? 'rgba(0, 255, 136, 0.15)' : 'rgba(255, 68, 68, 0.15)',
                      borderColor: item.signal === 'BUY' ? '#00FF88' : '#ff4444',
                    }]}>
                      <Ionicons 
                        name={item.signal === 'BUY' ? 'trending-up' : 'trending-down'} 
                        size={12} 
                        color={item.signal === 'BUY' ? '#00FF88' : '#ff4444'} 
                      />
                      <Text style={[styles.signalText, {
                        color: item.signal === 'BUY' ? '#00FF88' : '#ff4444',
                      }]}>
                        {item.signal}
                      </Text>
                    </View>
                  )}
                </View>
              </LinearGradient>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="newspaper-outline" size={80} color="rgba(0, 217, 255, 0.3)" />
            <Text style={styles.emptyTitle}>No News Available</Text>
            <Text style={styles.emptySubtitle}>
              Check back later for market updates
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
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
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 217, 255, 0.2)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginLeft: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  newsCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.25)',
  },
  newsGradient: {
    padding: 16,
  },
  newsHeader: {
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
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  currencyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  currencyText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  newsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    lineHeight: 24,
  },
  newsDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20,
    marginBottom: 12,
  },
  newsFooter: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  impactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  impactText: {
    fontSize: 11,
    fontWeight: '600',
  },
  signalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  signalText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 20,
  },
});
