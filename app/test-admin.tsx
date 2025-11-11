import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function TestAdmin() {
  const [result, setResult] = useState('');

  const testGenerateMentor = async () => {
    try {
      setResult('Getting token...');
      const token = await AsyncStorage.getItem('authToken');
      
      if (!token) {
        setResult('ERROR: No token found. Please login first.');
        Alert.alert('Error', 'No token. Please go back and login.');
        return;
      }

      setResult('Token found! Calling API...');
      
      const response = await axios.post(
        `${API_URL}/api/admin/mentors/create`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const mentorId = response.data.mentor_id;
      setResult(`SUCCESS! Created: ${mentorId}`);
      Alert.alert('Success!', `Mentor ID ${mentorId} created and saved!`);
      
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || error.message || 'Unknown error';
      setResult(`ERROR: ${errorMsg}`);
      Alert.alert('Error', errorMsg);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Test Admin Page</Text>
      
      <TouchableOpacity 
        style={styles.button}
        onPress={testGenerateMentor}
      >
        <Text style={styles.buttonText}>Generate Mentor ID</Text>
      </TouchableOpacity>

      <Text style={styles.result}>{result}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  title: {
    fontSize: 24,
    color: '#00D9FF',
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#00D9FF',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
  },
  buttonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  result: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
});
