import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface BrokersModalProps {
  visible: boolean;
  onClose: () => void;
  brokers: any[];
}

export default function BrokersModal({ visible, onClose, brokers }: BrokersModalProps) {
  const handleBrokerPress = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        console.log("Don't know how to open URI: " + url);
      }
    } catch (error) {
      console.error('Error opening broker link:', error);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <LinearGradient colors={['#000', '#0a0a0a']} style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>RECOMMENDED BROKERS</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close-circle" size={32} color="#FF4444" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {brokers.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="briefcase-outline" size={64} color="#666" />
                <Text style={styles.emptyText}>No brokers available</Text>
                <Text style={styles.emptySubtext}>Check back later for broker recommendations</Text>
              </View>
            ) : (
              brokers.map((broker, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.brokerCard}
                  onPress={() => handleBrokerPress(broker.affiliate_url)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['rgba(0,217,255,0.1)', 'rgba(0,217,255,0.05)']}
                    style={styles.brokerGradient}
                  >
                    <View style={styles.brokerHeader}>
                      <View style={styles.brokerIcon}>
                        <Ionicons name="briefcase" size={24} color="#00D9FF" />
                      </View>
                      <View style={styles.brokerInfo}>
                        <Text style={styles.brokerName}>{broker.name}</Text>
                        {broker.description && (
                          <Text style={styles.brokerDescription}>{broker.description}</Text>
                        )}
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#00D9FF" />
                    </View>
                    
                    {broker.features && broker.features.length > 0 && (
                      <View style={styles.featuresContainer}>
                        {broker.features.slice(0, 3).map((feature: string, featureIndex: number) => (
                          <View key={featureIndex} style={styles.featureTag}>
                            <Text style={styles.featureText}>{feature}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Tap any broker to visit their website and learn more
            </Text>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,217,255,0.3)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,217,255,0.2)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00D9FF',
    letterSpacing: 1,
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  brokerCard: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,217,255,0.2)',
  },
  brokerGradient: {
    padding: 16,
  },
  brokerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brokerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,217,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  brokerInfo: {
    flex: 1,
  },
  brokerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  brokerDescription: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 18,
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  featureTag: {
    backgroundColor: 'rgba(0,217,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,217,255,0.3)',
  },
  featureText: {
    fontSize: 12,
    color: '#00D9FF',
    fontWeight: '600',
  },
  footer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,217,255,0.2)',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});