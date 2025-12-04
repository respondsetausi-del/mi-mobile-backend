import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.backendUrl || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';

interface Broker {
  _id: string;
  broker_name: string;
  description?: string;
  affiliate_link?: string;
  broker_image?: string;
}

export default function BrokersScreen() {
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBrokers = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch(`${API_URL}/api/user/brokers`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Brokers data:', data);
        setBrokers(data.brokers || []);
      }
    } catch (error) {
      console.error('Error fetching brokers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBrokers();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBrokers();
  };

  const handleBrokerPress = (broker: Broker) => {
    if (broker.affiliate_link) {
      Linking.openURL(broker.affiliate_link);
    } else {
      Alert.alert('No Link', 'This broker has no affiliate link available.');
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
          <Ionicons name="business" size={28} color="#00D9FF" />
          <Text style={styles.headerTitle}>Recommended Brokers</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          Trusted partners for your trading journey
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
        {brokers.length > 0 ? (
          brokers.map((broker) => (
            <TouchableOpacity
              key={broker._id}
              style={styles.brokerCard}
              onPress={() => handleBrokerPress(broker)}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['rgba(0, 217, 255, 0.1)', 'rgba(0, 217, 255, 0.05)']}
                style={styles.brokerGradient}
              >
                <View style={styles.brokerHeader}>
                  <View style={styles.brokerIconContainer}>
                    <Ionicons name="briefcase" size={32} color="#00D9FF" />
                  </View>
                  <View style={styles.brokerInfo}>
                    <Text style={styles.brokerName}>{broker.broker_name}</Text>
                    {broker.description && (
                      <Text style={styles.brokerDescription} numberOfLines={2}>
                        {broker.description}
                      </Text>
                    )}
                  </View>
                </View>

                {broker.affiliate_link && (
                  <View style={styles.brokerFooter}>
                    <Ionicons name="link" size={16} color="#00D9FF" />
                    <Text style={styles.brokerLink} numberOfLines={1}>
                      {broker.affiliate_link.replace(/^https?:\/\//, '')}
                    </Text>
                    <Ionicons name="chevron-forward" size={20} color="#00D9FF" />
                  </View>
                )}

                <View style={styles.tapHint}>
                  <Ionicons name="hand-left-outline" size={14} color="rgba(0, 217, 255, 0.6)" />
                  <Text style={styles.tapHintText}>Tap to visit broker website</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="briefcase-outline" size={80} color="rgba(0, 217, 255, 0.3)" />
            <Text style={styles.emptyTitle}>No Brokers Available</Text>
            <Text style={styles.emptySubtitle}>
              Check back later for broker recommendations
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
  brokerCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.3)',
  },
  brokerGradient: {
    padding: 20,
  },
  brokerHeader: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  brokerIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 217, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0, 217, 255, 0.4)',
  },
  brokerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  brokerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  brokerDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20,
  },
  brokerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  brokerLink: {
    flex: 1,
    fontSize: 12,
    color: '#00D9FF',
  },
  tapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 217, 255, 0.1)',
  },
  tapHintText: {
    fontSize: 12,
    color: 'rgba(0, 217, 255, 0.6)',
    fontStyle: 'italic',
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
