import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function NewAdmin() {
  const [mentors, setMentors] = useState([]);
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingMentor, setGeneratingMentor] = useState(false);
  const [generatingLicense, setGeneratingLicense] = useState(false);
  const [lastGeneratedMentor, setLastGeneratedMentor] = useState('');
  const [lastGeneratedLicense, setLastGeneratedLicense] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        router.replace('/');
        return;
      }

      const [mentorsRes, licensesRes] = await Promise.all([
        axios.get(`${API_URL}/api/admin/mentors`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_URL}/api/admin/licenses`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setMentors(mentorsRes.data.mentors || []);
      setLicenses(licensesRes.data.licenses || []);
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const generateMentor = async () => {
    setGeneratingMentor(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await axios.post(
        `${API_URL}/api/admin/mentors/create`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const mentorId = response.data.mentor_id;
      setLastGeneratedMentor(mentorId);
      await loadData();
      Alert.alert('✅ Generated!', `Mentor ID: ${mentorId}\n\nSaved to database. You can copy it below.`);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to generate');
    }
    setGeneratingMentor(false);
  };

  const generateLicense = async () => {
    setGeneratingLicense(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await axios.post(
        `${API_URL}/api/admin/licenses/generate?count=1`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const licenseKey = response.data.keys[0];
      setLastGeneratedLicense(licenseKey);
      await loadData();
      Alert.alert('✅ Generated!', `License Key: ${licenseKey}\n\nSaved to database. You can copy it below.`);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to generate');
    }
    setGeneratingLicense(false);
  };

  const logout = async () => {
    await AsyncStorage.removeItem('authToken');
    router.replace('/');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#00D9FF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Dashboard</Text>
        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color="#ff4444" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* MENTOR IDs SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👥 Mentor IDs ({mentors.length})</Text>

          {/* Generation Area */}
          <View style={styles.generateBox}>
            <TouchableOpacity
              style={[styles.generateButton, generatingMentor && styles.buttonDisabled]}
              onPress={generateMentor}
              disabled={generatingMentor}
            >
              <Ionicons name="add-circle" size={24} color="#000" />
              <Text style={styles.generateButtonText}>
                {generatingMentor ? 'Generating...' : 'Generate Mentor ID'}
              </Text>
            </TouchableOpacity>

            {lastGeneratedMentor && (
              <View style={styles.lastGenerated}>
                <Text style={styles.label}>Last Generated:</Text>
                <TextInput
                  style={styles.copyableText}
                  value={lastGeneratedMentor}
                  editable={false}
                  selectTextOnFocus={true}
                />
                <Text style={styles.hint}>👆 Tap to select & copy</Text>
              </View>
            )}
          </View>

          {/* Mentor List */}
          <View style={styles.listContainer}>
            {mentors.map((mentor, index) => (
              <View key={index} style={styles.listItem}>
                <Ionicons name="person" size={16} color="#00D9FF" />
                <Text style={styles.listItemText}>{mentor}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* LICENSE KEYS SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔑 License Keys ({licenses.length})</Text>

          {/* Generation Area */}
          <View style={styles.generateBox}>
            <TouchableOpacity
              style={[styles.generateButton, generatingLicense && styles.buttonDisabled]}
              onPress={generateLicense}
              disabled={generatingLicense}
            >
              <Ionicons name="add-circle" size={24} color="#000" />
              <Text style={styles.generateButtonText}>
                {generatingLicense ? 'Generating...' : 'Generate License Key'}
              </Text>
            </TouchableOpacity>

            {lastGeneratedLicense && (
              <View style={styles.lastGenerated}>
                <Text style={styles.label}>Last Generated:</Text>
                <TextInput
                  style={styles.copyableText}
                  value={lastGeneratedLicense}
                  editable={false}
                  selectTextOnFocus={true}
                />
                <Text style={styles.hint}>👆 Tap to select & copy</Text>
              </View>
            )}
          </View>

          {/* License List */}
          <View style={styles.listContainer}>
            {licenses.slice(0, 20).map((license, index) => (
              <View key={index} style={styles.listItem}>
                <Ionicons name="key" size={16} color="#00D9FF" />
                <Text style={styles.listItemText}>{license}</Text>
              </View>
            ))}
            {licenses.length > 20 && (
              <Text style={styles.moreText}>... and {licenses.length - 20} more</Text>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00D9FF',
  },
  logoutButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  generateBox: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#00D9FF',
  },
  generateButton: {
    backgroundColor: '#00D9FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    gap: 10,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  generateButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  lastGenerated: {
    marginTop: 15,
  },
  label: {
    color: '#00D9FF',
    fontSize: 12,
    marginBottom: 5,
    fontWeight: '600',
  },
  copyableText: {
    backgroundColor: '#000',
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00D9FF',
    textAlign: 'center',
  },
  hint: {
    color: '#888',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 5,
  },
  listContainer: {
    gap: 8,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 8,
    gap: 10,
  },
  listItemText: {
    color: '#fff',
    fontSize: 14,
  },
  moreText: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
});
