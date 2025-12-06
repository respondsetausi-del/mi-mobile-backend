import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Slider from '@react-native-community/slider';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || '';

export default function MentorBranding() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mentorData, setMentorData] = useState(null);
  
  // Branding states
  const [companyName, setCompanyName] = useState('');
  const [systemName, setSystemName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [backgroundImage, setBackgroundImage] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#00D9FF');
  const [colorPreview, setColorPreview] = useState('#00D9FF');
  
  // RGB Color overlay for background
  const [rgbColor, setRgbColor] = useState({ r: 10, g: 14, b: 39 });
  
  // Broker states
  const [brokers, setBrokers] = useState([]);
  const [newBroker, setNewBroker] = useState({ name: '', url: '' });

  useEffect(() => {
    loadBranding();
  }, []);

  const loadBranding = async () => {
    try {
      const token = await AsyncStorage.getItem('mentorToken');
      const response = await fetch(`${API_URL}/api/mentor/profile`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setMentorData(data);
        setCompanyName(data.company_name || '');
        setSystemName(data.branding?.system_name || '');
        setLogoUrl(data.branding?.logo_url || '');
        setBackgroundImage(data.branding?.background_image || '');
        setPrimaryColor(data.branding?.primary_color || '#00D9FF');
        setColorPreview(data.branding?.primary_color || '#00D9FF');
        
        // Load RGB color if exists
        if (data.branding?.rgb_overlay) {
          setRgbColor(data.branding.rgb_overlay);
        }
        
        setBrokers(data.brokers || []);
      }
    } catch (error) {
      console.error('Error loading branding:', error);
    } finally {
      setLoading(false);
    }
  };

  const pickLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setLogoUrl(result.assets[0].uri);
    }
  };

  const pickBackgroundImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      setBackgroundImage(result.assets[0].uri);
    }
  };

  const saveBranding = async () => {
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('mentorToken');
      const response = await fetch(`${API_URL}/api/mentor/branding`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_name: companyName,
          system_name: systemName,
          logo_url: logoUrl,
          background_image: backgroundImage,
          primary_color: primaryColor,
          rgb_overlay: rgbColor,
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Branding saved successfully');
        loadBranding();
      } else {
        Alert.alert('Error', 'Failed to save branding');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save branding');
    } finally {
      setSaving(false);
    }
  };

  const addBroker = async () => {
    if (!newBroker.name || !newBroker.url) {
      Alert.alert('Error', 'Please fill in both broker name and URL');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('mentorToken');
      const response = await fetch(`${API_URL}/api/mentor/brokers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newBroker),
      });

      if (response.ok) {
        Alert.alert('Success', 'Broker added successfully');
        setNewBroker({ name: '', url: '' });
        loadBranding();
      } else {
        Alert.alert('Error', 'Failed to add broker');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add broker');
    }
  };

  const deleteBroker = async (brokerId) => {
    try {
      const token = await AsyncStorage.getItem('mentorToken');
      const response = await fetch(`${API_URL}/api/mentor/brokers/${brokerId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        Alert.alert('Success', 'Broker removed');
        loadBranding();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to remove broker');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#00D9FF" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Branding</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Logo Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Company Logo</Text>
          <TouchableOpacity style={styles.logoContainer} onPress={pickLogo}>
            {logoUrl ? (
              <Image source={{ uri: logoUrl }} style={styles.logoImage} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Ionicons name="camera" size={40} color="#666" />
                <Text style={styles.logoPlaceholderText}>Tap to upload logo</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Company Name */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Company Name</Text>
          <TextInput
            style={styles.input}
            value={companyName}
            onChangeText={setCompanyName}
            placeholder="Enter company name"
            placeholderTextColor="#666"
          />
        </View>

        {/* System Name */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Name</Text>
          <TextInput
            style={styles.input}
            value={systemName}
            onChangeText={setSystemName}
            placeholder="Enter system name"
            placeholderTextColor="#666"
          />
          <Text style={styles.helperText}>Displayed to your users in the app</Text>
        </View>

        {/* Background Image */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Background Image</Text>
          <TouchableOpacity style={styles.uploadButton} onPress={pickBackgroundImage}>
            <Ionicons name="cloud-upload" size={24} color="#00D9FF" />
            <Text style={styles.uploadButtonText}>Choose Background Image</Text>
          </TouchableOpacity>
          
          {backgroundImage ? (
            <View style={styles.backgroundPreview}>
              <Image source={{ uri: backgroundImage }} style={styles.backgroundImage} />
              <TouchableOpacity 
                style={styles.removeImageButton}
                onPress={() => setBackgroundImage('')}
              >
                <Ionicons name="close-circle" size={28} color="#ff4444" />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {/* RGB Color Overlay */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Color Overlay (RGB)</Text>
          <Text style={styles.helperText}>Background tint color for better text visibility</Text>
          
          <View style={styles.sliderSection}>
            <View style={styles.sliderRow}>
              <Text style={styles.sliderLabel}>Red: {rgbColor.r}</Text>
              <Slider
                style={styles.rgbSlider}
                minimumValue={0}
                maximumValue={255}
                step={1}
                value={rgbColor.r}
                onValueChange={(v) => setRgbColor({ ...rgbColor, r: Math.round(v) })}
                minimumTrackTintColor="#ff0000"
                maximumTrackTintColor="#333"
                thumbTintColor="#ff0000"
              />
            </View>
            
            <View style={styles.sliderRow}>
              <Text style={styles.sliderLabel}>Green: {rgbColor.g}</Text>
              <Slider
                style={styles.rgbSlider}
                minimumValue={0}
                maximumValue={255}
                step={1}
                value={rgbColor.g}
                onValueChange={(v) => setRgbColor({ ...rgbColor, g: Math.round(v) })}
                minimumTrackTintColor="#00ff00"
                maximumTrackTintColor="#333"
                thumbTintColor="#00ff00"
              />
            </View>
            
            <View style={styles.sliderRow}>
              <Text style={styles.sliderLabel}>Blue: {rgbColor.b}</Text>
              <Slider
                style={styles.rgbSlider}
                minimumValue={0}
                maximumValue={255}
                step={1}
                value={rgbColor.b}
                onValueChange={(v) => setRgbColor({ ...rgbColor, b: Math.round(v) })}
                minimumTrackTintColor="#0000ff"
                maximumTrackTintColor="#333"
                thumbTintColor="#0000ff"
              />
            </View>
            
            <View style={[
              styles.rgbPreview,
              { backgroundColor: `rgb(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b})` }
            ]}>
              <Text style={styles.rgbPreviewText}>Color Preview</Text>
            </View>
          </View>
        </View>

        {/* Primary Color */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Primary Color</Text>
          <View style={styles.colorSection}>
            <View style={styles.colorPreviewContainer}>
              <View style={[styles.colorPreview, { backgroundColor: colorPreview }]} />
              <Text style={styles.colorValue}>{colorPreview}</Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={360}
              value={parseInt(colorPreview.substring(1), 16) % 360}
              onValueChange={(value) => {
                const hue = Math.round(value);
                const color = hslToHex(hue, 100, 50);
                setColorPreview(color);
              }}
              onSlidingComplete={(value) => {
                setPrimaryColor(colorPreview);
              }}
              minimumTrackTintColor="#00D9FF"
              maximumTrackTintColor="#666"
              thumbTintColor="#00D9FF"
            />
          </View>
        </View>

        {/* Brokers Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Broker Affiliates</Text>
          
          {brokers.map((broker, index) => (
            <View key={index} style={styles.brokerItem}>
              <View style={styles.brokerInfo}>
                <Ionicons name="briefcase" size={20} color="#00D9FF" />
                <View style={styles.brokerText}>
                  <Text style={styles.brokerName}>{broker.name}</Text>
                  <Text style={styles.brokerUrl}>{broker.url}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => deleteBroker(broker._id)}>
                <Ionicons name="trash-outline" size={20} color="#ff4444" />
              </TouchableOpacity>
            </View>
          ))}

          <View style={styles.addBrokerContainer}>
            <TextInput
              style={styles.brokerInput}
              value={newBroker.name}
              onChangeText={(text) => setNewBroker({ ...newBroker, name: text })}
              placeholder="Broker name"
              placeholderTextColor="#666"
            />
            <TextInput
              style={styles.brokerInput}
              value={newBroker.url}
              onChangeText={(text) => setNewBroker({ ...newBroker, url: text })}
              placeholder="Broker URL"
              placeholderTextColor="#666"
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.addBrokerButton} onPress={addBroker}>
              <Ionicons name="add" size={24} color="#000" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={saveBranding}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.saveButtonText}>Save Branding</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// Helper function to convert HSL to Hex
function hslToHex(h, s, l) {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00D9FF',
    marginBottom: 12,
  },
  logoContainer: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 2,
    borderColor: '#00D9FF',
    alignSelf: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  logoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111',
  },
  logoPlaceholderText: {
    color: '#666',
    marginTop: 8,
    fontSize: 12,
  },
  input: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
  },
  colorSection: {
    gap: 16,
  },
  colorPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  colorPreview: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#fff',
  },
  colorValue: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'monospace',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  brokerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  brokerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  brokerText: {
    flex: 1,
  },
  brokerName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  brokerUrl: {
    color: '#666',
    fontSize: 12,
  },
  addBrokerContainer: {
    gap: 8,
    marginTop: 12,
  },
  brokerInput: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 14,
  },
  addBrokerButton: {
    backgroundColor: '#00D9FF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#00D9FF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  helperText: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#111',
    borderWidth: 2,
    borderColor: '#00D9FF',
    borderStyle: 'dashed',
    padding: 16,
    borderRadius: 8,
  },
  uploadButtonText: {
    color: '#00D9FF',
    fontSize: 16,
    fontWeight: '600',
  },
  backgroundPreview: {
    marginTop: 12,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  backgroundImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 14,
  },
  sliderSection: {
    gap: 16,
    marginTop: 12,
  },
  sliderRow: {
    gap: 8,
  },
  sliderLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  rgbSlider: {
    width: '100%',
    height: 40,
  },
  rgbPreview: {
    height: 60,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 2,
    borderColor: '#333',
  },
  rgbPreviewText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
});
