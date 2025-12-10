import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.backendUrl || 'http://localhost:8001';
const BACKGROUND_FETCH_TASK = 'background-signal-check';

// Configure how notifications should be displayed
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Define the background task
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    console.log('🔄 Background task running...');
    
    // Check if monitoring is active
    const isMonitoring = await AsyncStorage.getItem('isMonitoring');
    if (isMonitoring !== 'true') {
      console.log('⏹️ Monitoring not active, skipping');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Get stored EA ID
    const selectedEAId = await AsyncStorage.getItem('selectedEAId');
    if (!selectedEAId) {
      console.log('⚠️ No EA selected');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Get auth token
    const token = await AsyncStorage.getItem('authToken');
    if (!token) {
      console.log('⚠️ No auth token');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Fetch latest signal from backend
    const response = await fetch(`${API_URL}/api/ea/${selectedEAId}/calculate`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      const signal = data.signal;
      const price = data.price;

      console.log(`✅ Background fetch: ${signal} at ${price}`);

      // Get last signal to check if it changed
      const lastSignal = await AsyncStorage.getItem('lastSignal');
      
      if (signal !== lastSignal && signal !== 'NEUTRAL') {
        // Signal changed! Send notification
        await sendSignalNotification(signal, price, data.indicator_data);
        await AsyncStorage.setItem('lastSignal', signal);
      }

      return BackgroundFetch.BackgroundFetchResult.NewData;
    }

    return BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (error) {
    console.error('❌ Background task error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Send push notification
async function sendSignalNotification(signal: string, price: number, indicatorData: any) {
  try {
    const emoji = signal === 'BUY' ? '📈' : '📉';
    const color = signal === 'BUY' ? '#00FF88' : '#ff4444';
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${emoji} ${signal} Signal Detected!`,
        body: `${indicatorData?.symbol || 'Market'} at $${price.toFixed(4)}`,
        data: { signal, price, indicatorData },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        vibrate: [0, 250, 250, 250],
        badge: 1,
        color: color,
      },
      trigger: null, // Show immediately
    });
    
    console.log(`📬 Notification sent: ${signal}`);
  } catch (error) {
    console.error('❌ Error sending notification:', error);
  }
}

// Register background fetch
export async function registerBackgroundFetch() {
  try {
    // Request notification permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('❌ Notification permission denied');
      return false;
    }

    console.log('✅ Notification permissions granted');

    // Check if task is already registered
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
    
    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
        minimumInterval: 10, // 10 seconds (minimum allowed)
        stopOnTerminate: false, // Continue after app is closed
        startOnBoot: true, // Start on device boot
      });
      
      console.log('✅ Background fetch registered');
    } else {
      console.log('ℹ️ Background fetch already registered');
    }

    return true;
  } catch (error) {
    console.error('❌ Error registering background fetch:', error);
    return false;
  }
}

// Unregister background fetch
export async function unregisterBackgroundFetch() {
  try {
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
    console.log('✅ Background fetch unregistered');
  } catch (error) {
    console.error('❌ Error unregistering background fetch:', error);
  }
}

// Check if background fetch is available
export async function isBackgroundFetchAvailable() {
  const status = await BackgroundFetch.getStatusAsync();
  return status === BackgroundFetch.BackgroundFetchStatus.Available;
}

// Send immediate notification (for testing or manual triggers)
export async function sendTestNotification() {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '📊 MI Mobile Indicator',
        body: 'Background monitoring is active',
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null,
    });
    console.log('✅ Test notification sent');
  } catch (error) {
    console.error('❌ Error sending test notification:', error);
  }
}

// Get notification token (for push notifications from server)
export async function getNotificationToken() {
  try {
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    });
    console.log('📱 Push token:', token.data);
    return token.data;
  } catch (error) {
    console.error('❌ Error getting push token:', error);
    return null;
  }
}
