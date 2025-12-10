import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform, Linking, Alert, NativeModules, PermissionsAndroid } from 'react-native';
import Constants from 'expo-constants';

const BACKGROUND_FETCH_TASK = 'MI_SIGNAL_FETCH_TASK';
const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || '';

// Configure notifications to show when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Define background task
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    console.log('[Background] Checking for new signals...');
    
    const token = await AsyncStorage.getItem('authToken');
    if (!token) {
      console.log('[Background] No auth token found');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Fetch signals
    const response = await fetch(`${API_URL}/api/user/signals`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      const data = await response.json();
      const signals = data.signals || [];
      
      // Check for new signals
      const lastChecked = await AsyncStorage.getItem('lastSignalCheck');
      const newSignals = signals.filter((s: any) => {
        if (!lastChecked) return true;
        return new Date(s.created_at) > new Date(lastChecked);
      });

      if (newSignals.length > 0) {
        console.log(`[Background] Found ${newSignals.length} new signal(s)`);
        
        // Send notification for each new signal
        for (const signal of newSignals) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `🚨 ${signal.signal_type} Signal - ${signal.symbol}`,
              body: `${signal.indicator || 'New trading signal'} on ${signal.timeframe}`,
              data: { signal },
              sound: true,
            },
            trigger: null, // Immediately
          });
        }
        
        await AsyncStorage.setItem('lastSignalCheck', new Date().toISOString());
        return BackgroundFetch.BackgroundFetchResult.NewData;
      }
    }

    return BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (error) {
    console.error('[Background] Error fetching signals:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Register background fetch task
export async function registerBackgroundFetch() {
  try {
    // Check if task is already registered
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
    
    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
        minimumInterval: 60 * 15, // 15 minutes (minimum on iOS)
        stopOnTerminate: false,
        startOnBoot: true,
      });
      console.log('✅ Background fetch registered');
    }
    
    // Set minimum interval for background fetch
    await BackgroundFetch.setMinimumIntervalAsync(60 * 15);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to register background fetch:', error);
    return false;
  }
}

// Unregister background fetch
export async function unregisterBackgroundFetch() {
  try {
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
    console.log('✅ Background fetch unregistered');
    return true;
  } catch (error) {
    console.error('❌ Failed to unregister background fetch:', error);
    return false;
  }
}

// Check and request overlay permission (Android only)
export async function requestOverlayPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true; // iOS doesn't need this permission
  }

  try {
    // Check if we have the permission
    const { canDrawOverlays } = NativeModules.OverlayPermission || {};
    
    if (canDrawOverlays) {
      const hasPermission = await canDrawOverlays();
      if (hasPermission) {
        console.log('✅ Overlay permission already granted');
        return true;
      }
    }

    // Request permission by opening settings
    Alert.alert(
      'Overlay Permission Required',
      'MI Mobile Indicator needs permission to display signals over other apps. Please enable "Display over other apps" in the next screen.',
      [
        {
          text: 'Open Settings',
          onPress: async () => {
            try {
              // Open Android overlay settings
              await Linking.openSettings();
            } catch (e) {
              // Fallback to generic settings
              await Linking.openURL('package:com.mimobile.indicator.fixed');
            }
          },
        },
        { text: 'Later', style: 'cancel' },
      ]
    );

    return false;
  } catch (error) {
    console.error('❌ Error checking overlay permission:', error);
    return false;
  }
}

// Request notification permission
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    
    if (existingStatus === 'granted') {
      return true;
    }

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('❌ Error requesting notification permission:', error);
    return false;
  }
}

// Initialize all background services
export async function initializeBackgroundServices() {
  console.log('🚀 Initializing background services...');
  
  // Request notification permission
  const notifPermission = await requestNotificationPermission();
  console.log('Notification permission:', notifPermission ? '✅' : '❌');
  
  // Register background fetch
  const bgFetchRegistered = await registerBackgroundFetch();
  console.log('Background fetch:', bgFetchRegistered ? '✅' : '❌');
  
  // Request overlay permission (Android)
  if (Platform.OS === 'android') {
    await requestOverlayPermission();
  }
  
  return {
    notifications: notifPermission,
    backgroundFetch: bgFetchRegistered,
  };
}

// Manual signal check (can be called from foreground)
export async function checkForNewSignals() {
  try {
    const token = await AsyncStorage.getItem('authToken');
    if (!token) return null;

    const response = await fetch(`${API_URL}/api/user/signals`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      const data = await response.json();
      return data.signals || [];
    }
    
    return null;
  } catch (error) {
    console.error('Error checking signals:', error);
    return null;
  }
}
