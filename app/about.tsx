import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const LEGAL_DOCUMENTS = [
  {
    id: 'privacy-policy',
    title: 'Privacy Policy',
    icon: 'shield-checkmark-outline' as const,
    description: 'How we collect, use, and protect your information',
  },
  {
    id: 'terms-and-conditions',
    title: 'Terms and Conditions',
    icon: 'document-text-outline' as const,
    description: 'Rules and guidelines for using Mobile Indicator',
  },
  {
    id: 'disclaimer',
    title: 'Trading Risk Disclaimer',
    icon: 'alert-circle-outline' as const,
    description: 'Important information about trading risks',
  },
  {
    id: 'copyright',
    title: 'Copyright Notice',
    icon: 'copy-outline' as const,
    description: 'Intellectual property rights and usage restrictions',
  },
  {
    id: 'trademark',
    title: 'Trademark Notice',
    icon: 'ribbon-outline' as const,
    description: 'Mobile Indicator trademark information',
  },
];

export default function AboutScreen() {
  const router = useRouter();

  const handleDocumentPress = (documentId: string) => {
    router.push(`/legal/${documentId}`);
  };

  const handleEmailPress = () => {
    Linking.openURL('mailto:mimobileindicator@gmail.com');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#00D9FF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About & Legal</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* App Info Section */}
        <View style={styles.appInfoSection}>
          <View style={styles.appIconContainer}>
            <LinearGradient
              colors={['#00D9FF', '#0099CC']}
              style={styles.appIconGradient}
            >
              <Text style={styles.appIconText}>MI</Text>
            </LinearGradient>
          </View>
          <Text style={styles.appName}>Mobile Indicator</Text>
          <Text style={styles.appVersion}>Version 1.0.0</Text>
          <Text style={styles.appDescription}>
            Professional trading signals and Expert Advisor management platform
          </Text>
        </View>

        {/* Legal Documents Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal Documents</Text>
          {LEGAL_DOCUMENTS.map((doc) => (
            <TouchableOpacity
              key={doc.id}
              style={styles.documentCard}
              onPress={() => handleDocumentPress(doc.id)}
              activeOpacity={0.7}
            >
              <View style={styles.documentIcon}>
                <Ionicons name={doc.icon} size={24} color="#00D9FF" />
              </View>
              <View style={styles.documentContent}>
                <Text style={styles.documentTitle}>{doc.title}</Text>
                <Text style={styles.documentDescription}>{doc.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Contact Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          <TouchableOpacity
            style={styles.contactCard}
            onPress={handleEmailPress}
            activeOpacity={0.7}
          >
            <View style={styles.contactIcon}>
              <Ionicons name="mail-outline" size={24} color="#00D9FF" />
            </View>
            <View style={styles.contactContent}>
              <Text style={styles.contactTitle}>Email Support</Text>
              <Text style={styles.contactText}>mimobileindicator@gmail.com</Text>
            </View>
            <Ionicons name="open-outline" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Copyright Footer */}
        <View style={styles.copyrightSection}>
          <Text style={styles.copyrightText}>© 2025 Mobile Indicator</Text>
          <Text style={styles.copyrightText}>All Rights Reserved</Text>
          <Text style={styles.copyrightSubtext}>Last Updated: June 1, 2025</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e27',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1a1f3a',
    borderBottomWidth: 1,
    borderBottomColor: '#00D9FF',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,217,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  appInfoSection: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: '#1a1f3a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  appIconContainer: {
    marginBottom: 16,
  },
  appIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00D9FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  appIconText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 14,
    color: '#00D9FF',
    marginBottom: 12,
  },
  appDescription: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1f3a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  documentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,217,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  documentContent: {
    flex: 1,
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  documentDescription: {
    fontSize: 13,
    color: '#888',
    lineHeight: 18,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1f3a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,217,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactContent: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  contactText: {
    fontSize: 13,
    color: '#00D9FF',
  },
  copyrightSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  copyrightText: {
    fontSize: 14,
    color: '#666',
    marginVertical: 2,
  },
  copyrightSubtext: {
    fontSize: 12,
    color: '#555',
    marginTop: 8,
  },
});