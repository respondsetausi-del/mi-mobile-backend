import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function SimpleGenerate() {
  const [mentorResult, setMentorResult] = useState('');
  const [licenseResult, setLicenseResult] = useState('');
  const [allMentors, setAllMentors] = useState([]);
  const [allLicenses, setAllLicenses] = useState([]);

  // Generate Mentor ID
  const doGenerateMentor = async () => {
    setMentorResult('⏳ Generating...');
    
    try {
      const token = await AsyncStorage.getItem('authToken');
      
      if (!token) {
        setMentorResult('❌ Not logged in');
        Alert.alert('Error', 'Please login first');
        return;
      }

      const response = await fetch(`${API_URL}/api/admin/mentors/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        setMentorResult(`❌ Error: ${response.status}`);
        return;
      }

      const data = await response.json();
      const mentorId = data.mentor_id;
      
      setMentorResult(`✅ ${mentorId}`);
      Alert.alert('Success!', `Mentor ID: ${mentorId}`);
      
      // Fetch all mentors
      fetchAllMentors();
      
    } catch (error) {
      setMentorResult(`❌ ${error.message}`);
    }
  };

  // Generate License Key
  const doGenerateLicense = async () => {
    setLicenseResult('⏳ Generating...');
    
    try {
      const token = await AsyncStorage.getItem('authToken');
      
      if (!token) {
        setLicenseResult('❌ Not logged in');
        Alert.alert('Error', 'Please login first');
        return;
      }

      const response = await fetch(`${API_URL}/api/admin/licenses/generate?count=1`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        setLicenseResult(`❌ Error: ${response.status}`);
        return;
      }

      const data = await response.json();
      const licenseKey = data.keys[0];
      
      setLicenseResult(`✅ ${licenseKey}`);
      Alert.alert('Success!', `License Key: ${licenseKey}`);
      
      // Fetch all licenses
      fetchAllLicenses();
      
    } catch (error) {
      setLicenseResult(`❌ ${error.message}`);
    }
  };

  // Fetch all mentors
  const fetchAllMentors = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/admin/mentors`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      setAllMentors(data.mentors || []);
    } catch (error) {
      console.error('Error fetching mentors:', error);
    }
  };

  // Fetch all licenses
  const fetchAllLicenses = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/admin/licenses`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      setAllLicenses(data.licenses || []);
    } catch (error) {
      console.error('Error fetching licenses:', error);
    }
  };

  // Load data on mount
  React.useEffect(() => {
    fetchAllMentors();
    fetchAllLicenses();
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll}>
        <Text style={styles.title}>🔑 ID Generator</Text>
        
        {/* MENTOR ID SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👥 Generate Mentor ID</Text>
          
          <TouchableOpacity 
            style={styles.button}
            onPress={doGenerateMentor}
          >
            <Text style={styles.buttonText}>GENERATE MENTOR ID</Text>
          </TouchableOpacity>

          {mentorResult ? (
            <View style={styles.resultBox}>
              <Text style={styles.resultLabel}>Result:</Text>
              <TextInput
                style={styles.resultText}
                value={mentorResult}
                editable={false}
                selectTextOnFocus={true}
              />
              <Text style={styles.hint}>👆 Tap to select & copy</Text>
            </View>
          ) : null}

          {allMentors.length > 0 && (
            <View style={styles.listBox}>
              <Text style={styles.listTitle}>All Mentor IDs ({allMentors.length}):</Text>
              {allMentors.slice(0, 10).map((id, idx) => (
                <Text key={idx} style={styles.listItem}>• {id}</Text>
              ))}
              {allMentors.length > 10 && (
                <Text style={styles.listItem}>... and {allMentors.length - 10} more</Text>
              )}
            </View>
          )}
        </View>

        {/* LICENSE KEY SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔑 Generate License Key</Text>
          
          <TouchableOpacity 
            style={styles.button}
            onPress={doGenerateLicense}
          >
            <Text style={styles.buttonText}>GENERATE LICENSE KEY</Text>
          </TouchableOpacity>

          {licenseResult ? (
            <View style={styles.resultBox}>
              <Text style={styles.resultLabel}>Result:</Text>
              <TextInput
                style={styles.resultText}
                value={licenseResult}
                editable={false}
                selectTextOnFocus={true}
              />
              <Text style={styles.hint}>👆 Tap to select & copy</Text>
            </View>
          ) : null}

          {allLicenses.length > 0 && (
            <View style={styles.listBox}>
              <Text style={styles.listTitle}>All License Keys ({allLicenses.length}):</Text>
              {allLicenses.slice(0, 10).map((key, idx) => (
                <Text key={idx} style={styles.listItem}>• {key}</Text>
              ))}
              {allLicenses.length > 10 && (
                <Text style={styles.listItem}>... and {allLicenses.length - 10} more</Text>
              )}
            </View>
          )}
        </View>

        <Text style={styles.footer}>Backend: {API_URL}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scroll: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00D9FF',
    textAlign: 'center',
    marginVertical: 20,
  },
  section: {
    marginBottom: 40,
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#00D9FF',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#00D9FF',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resultBox: {
    marginTop: 20,
    backgroundColor: '#000',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00D9FF',
  },
  resultLabel: {
    color: '#00D9FF',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '600',
  },
  resultText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 10,
    backgroundColor: '#1a1a1a',
    borderRadius: 5,
  },
  hint: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 5,
  },
  listBox: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#0a0a0a',
    borderRadius: 8,
  },
  listTitle: {
    color: '#00D9FF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  listItem: {
    color: '#ccc',
    fontSize: 13,
    marginBottom: 5,
  },
  footer: {
    color: '#666',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
});
