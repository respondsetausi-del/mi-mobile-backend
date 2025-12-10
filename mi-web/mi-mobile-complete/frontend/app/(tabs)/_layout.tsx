import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AccountStatusGuard from '../../components/AccountStatusGuard';

export default function TabLayout() {
  return (
    <AccountStatusGuard>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#000',
            borderTopColor: '#333',
            height: 70,
            paddingBottom: 10,
          },
          tabBarActiveTintColor: '#00D9FF',
          tabBarInactiveTintColor: '#666',
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'HOME',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="signals"
          options={{
            title: 'SIGNALS',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="pulse" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="news"
          options={{
            title: 'NEWS',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="newspaper" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="brokers"
          options={{
            title: 'BROKERS',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="business" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </AccountStatusGuard>
  );
}
