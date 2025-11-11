import { useState, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert, AppState } from 'react-native';
import Constants from 'expo-constants';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

// Configure notification handler for floating heads-up style
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.MAX, // Heads-up notification
  }),
});

export function useNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string>('');
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    // Only register for push notifications on native platforms
    if (Platform.OS !== 'web') {
      registerForPushNotificationsAsync().then(token => {
        if (token) {
          setExpoPushToken(token);
          savePushToken(token);
        }
      });

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('signals', {
          name: 'Trading Signals',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#00D9FF',
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          bypassDnd: true,
        });
      }

      notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
        setNotification(notification);
      });

      responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('Notification tapped:', response);
      });
    }

    // Monitor app state changes (works on all platforms)
    const subscription = AppState.addEventListener('change', nextAppState => {
      appState.current = nextAppState;
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
      subscription.remove();
    };
  }, []);

  const savePushToken = async (token: string) => {
    try {
      await axios.post(`${API_URL}/api/push-token`, { token });
    } catch (error) {
      console.error('Error saving push token:', error);
    }
  };

  return {
    expoPushToken,
    notification,
  };
}

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('signals', {
      name: 'Trading Signals',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00D9FF',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      Alert.alert(
        'Notifications Disabled',
        'Enable notifications to receive trading signal alerts even when app is closed!',
        [{ text: 'OK' }]
      );
      return;
    }
    
    try {
      const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      console.log('Push token:', token);
    } catch (error) {
      console.error('Error getting push token:', error);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

// Local notification for floating bubble effect
export async function showSignalNotification(symbol: string, signal: string, indicator: string, price: number) {
  // Only show notifications on native platforms (iOS/Android)
  if (Platform.OS === 'web') {
    console.log(`Signal: ${signal} - ${symbol} (${indicator}) @ ${price}`);
    return;
  }

  const signalEmoji = signal === 'BUY' ? '📈' : '📉';
  const signalColor = signal === 'BUY' ? '#00FF88' : '#FF4444';
  
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${signalEmoji} ${signal} SIGNAL`,
        body: `${symbol} - ${indicator}\nPrice: ${price.toFixed(5)}`,
        data: { 
          symbol, 
          signal, 
          indicator, 
          price,
          type: 'signal',
        },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: [0, 250, 250, 250],
        badge: 1,
        categoryIdentifier: 'signal',
        color: signalColor,
      },
      trigger: null,
    });
  } catch (error) {
    console.log('Notification error (expected on web):', error);
  }
}
