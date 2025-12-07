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

export default function CustomizeBranding() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // States
  const [systemNameInput, setSystemNameInput] = useState('');
  const [selectedBgImage, setSelectedBgImage] = useState(null);
  const [selectedBgColor, setSelectedBgColor] = useState({ r: 0, g: 217, b: 255 });
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    loadBrandingData();
  }, []);

  const loadBrandingData = async () => {
    try {
      const token = await AsyncStorage.getItem('mentorToken');
      const response = await fetch(`${API_URL}/api/mentor/branding`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setSystemNameInput(data.system_name || '');
        setSelectedBgImage(data.background_image || null);
        if (data.background_color) {
          const match = data.background_color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
          if (match) {
            setSelectedBgColor({
              r: parseInt(match[1]),
              g: parseInt(match[2]),
              b: parseInt(match[3]),
            });
          }
        }
      }
    } catch (error) {
      console.error('Error loading branding:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSystemName = async () => {
    try {
      const token = await AsyncStorage.getItem('mentorToken');
      const response = await fetch(`${API_URL}/api/mentor/branding/system-name`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ system_name: systemNameInput }),
      });

      if (response.ok) {
        Alert.alert('Success', 'System name updated successfully');
      } else {
        Alert.alert('Error', 'Failed to update system name');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update system name');
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedBgImage(result.assets[0].uri);
    }
  };

  const saveBackground = async () => {
    setUploadingImage(true);
    try {
      const token = await AsyncStorage.getItem('mentorToken');
      
      const payload = {
        background_color: `rgb(${selectedBgColor.r}, ${selectedBgColor.g}, ${selectedBgColor.b})`,
      };

      if (selectedBgImage) {
        payload.background_image = selectedBgImage;
      }

      const response = await fetch(`${API_URL}/api/mentor/branding/background`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        Alert.alert('Success', 'Background settings saved successfully');
        router.back();
      } else {
        Alert.alert('Error', 'Failed to save background settings');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save background settings');
    } finally {
      setUploadingImage(false);
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
        <Text style={styles.headerTitle}>Customize Branding</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* System Name */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Name</Text>
          <TextInput
            style={styles.input}
            value={systemNameInput}
            onChangeText={setSystemNameInput}
            placeholder="Enter system name"
            placeholderTextColor="#666"
          />
          <TouchableOpacity style={styles.saveSmallBtn} onPress={updateSystemName}>
            <Text style={styles.btnText}>Save Name</Text>
          </TouchableOpacity>
        </View>

        {/* Background Image */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Background Image</Text>
          <TouchableOpacity style={styles.uploadBtn} onPress={pickImage}>
            <Ionicons name="cloud-upload" size={24} color="#00D9FF" />
            <Text style={styles.uploadText}>Choose Image</Text>
          </TouchableOpacity>

          {selectedBgImage && (
            <View style={styles.imagePreview}>
              <Image source={{ uri: selectedBgImage }} style={styles.previewImg} />
              <TouchableOpacity 
                style={styles.removeImageBtn}
                onPress={() => setSelectedBgImage(null)}
              >
                <Ionicons name="close-circle" size={24} color="#ff4444" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Color Sliders */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Color Overlay (RGB)</Text>
          
          <Text style={styles.colorLabel}>Red: {selectedBgColor.r}</Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={255}
            step={1}
            value={selectedBgColor.r}
            onValueChange={(v) => setSelectedBgColor({ ...selectedBgColor, r: Math.round(v) })}
            minimumTrackTintColor="#ff0000"
            maximumTrackTintColor="#333"
          />
          
          <Text style={styles.colorLabel}>Green: {selectedBgColor.g}</Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={255}
            step={1}
            value={selectedBgColor.g}
            onValueChange={(v) => setSelectedBgColor({ ...selectedBgColor, g: Math.round(v) })}
            minimumTrackTintColor="#00ff00"
            maximumTrackTintColor="#333"
          />
          
          <Text style={styles.colorLabel}>Blue: {selectedBgColor.b}</Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={255}
            step={1}
            value={selectedBgColor.b}
            onValueChange={(v) => setSelectedBgColor({ ...selectedBgColor, b: Math.round(v) })}
            minimumTrackTintColor="#0000ff"
            maximumTrackTintColor="#333"
          />
          
          <View style={[
            styles.colorPreview, 
            { backgroundColor: `rgb(${selectedBgColor.r}, ${selectedBgColor.g}, ${selectedBgColor.b})` }
          ]}>
            <Text style={styles.colorPreviewText}>Preview</Text>
          </View>
        </View>

        {/* Save/Cancel Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.saveBigBtn} onPress={saveBackground} disabled={uploadingImage}>
            {uploadingImage ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Save All Changes</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.cancelBigBtn} 
            onPress={() => router.back()}
          >
            <Text style={styles.btnText}>Cancel</Text>
          </TouchableOpacity>
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
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00D9FF',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    marginBottom: 12,
  },
  saveSmallBtn: {
    backgroundColor: '#00D9FF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#00D9FF',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 24,
    gap: 12,
  },
  uploadText: {
    color: '#00D9FF',
    fontSize: 16,
    fontWeight: '600',
  },
  imagePreview: {
    marginTop: 16,
    position: 'relative',
  },
  previewImg: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
  },
  colorLabel: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  colorPreview: {
    height: 100,
    borderRadius: 8,
    marginTop: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorPreviewText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  actions: {
    gap: 16,
    marginBottom: 32,
  },
  saveBigBtn: {
    backgroundColor: '#00D9FF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelBigBtn: {
    backgroundColor: '#ff4444',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
