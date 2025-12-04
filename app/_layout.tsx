import { Stack, Slot, router } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, ActivityIndicator, Platform } from 'react-native';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

function RootLayoutNav() {
  const [showSplash, setShowSplash] = useState(true);
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return (
      <View style={styles.splashContainer}>
        <Animated.View style={[styles.splashContent, { opacity: fadeAnim }]}>
          <Text style={styles.logo}>MI</Text>
          <Text style={styles.slogan}>Mobile Indicator</Text>
          <ActivityIndicator size="large" color="#00D9FF" style={styles.loader} />
        </Animated.View>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="admin" />
      <Stack.Screen name="register" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashContent: {
    alignItems: 'center',
  },
  logo: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#00D9FF',
    marginBottom: 8,
    letterSpacing: 12,
  },
  slogan: {
    fontSize: 20,
    fontWeight: '300',
    color: '#8892b0',
    marginBottom: 30,
    letterSpacing: 2,
  },
  loader: {
    marginTop: 20,
  },
});
