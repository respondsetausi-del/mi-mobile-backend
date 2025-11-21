import { useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || '';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function useNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>(undefined);
  const [notification, setNotification] = useState<Notifications.Notification | undefined>(undefined);
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  useEffect(() => {
    registerForPushNotificationsAsync();

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  async function registerForPushNotificationsAsync() {
    if (!Device.isDevice) {
      console.log('Must use physical device for Push Notifications');
      return;
    }

    // Set up Android notification channel FIRST (before requesting permissions)
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Trading Signals',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#00D9FF',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
      console.log('✅ Android notification channel created');
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    console.log('Current permission status:', existingStatus);

    if (existingStatus !== 'granted') {
      console.log('Requesting notification permissions...');
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      console.log('Permission request result:', status);
    }

    if (finalStatus !== 'granted') {
      console.log('❌ Failed to get push notification permissions!');
      alert('Please enable notifications in your device settings to receive trading signals.');
      return;
    }

    console.log('✅ Notification permissions granted');

    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      console.log('Getting Expo push token with projectId:', projectId);
      
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      });
      const token = tokenData.data;
      console.log('✅ Push token obtained:', token);
      setExpoPushToken(token);

      // Register token with backend
      try {
        const authToken = await AsyncStorage.getItem('authToken');
        if (authToken && API_URL) {
          console.log('Registering push token with backend...');
          const response = await fetch(`${API_URL}/api/push-token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify({ token }),
          });
          
          if (response.ok) {
            console.log('✅ Push token registered with backend');
          } else {
            console.error('❌ Failed to register push token:', response.status);
          }
        }
      } catch (error) {
        console.error('❌ Error registering push token with backend:', error);
      }
    } catch (error) {
      console.error('❌ Error getting push token:', error);
    }
  }

  return {
    expoPushToken,
    notification,
  };
}
