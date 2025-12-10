import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEAStore } from '../store/eaStore';

export default function UserMenu() {
  const [menuVisible, setMenuVisible] = useState(false);
  const { user } = useAuth();
  const { reset } = useEAStore();

  const handleLogout = async () => {
    setMenuVisible(false);
    
    try {
      console.log('UserMenu: Starting forced logout...');
      
      // Reset EA store first to clear state and stop any pending API calls
      reset();
      console.log('UserMenu: EA store reset');
      
      // Clear all AsyncStorage immediately
      const allKeys = await AsyncStorage.getAllKeys();
      console.log('UserMenu: Found keys to clear:', allKeys);
      await AsyncStorage.multiRemove(allKeys);
      console.log('UserMenu: All AsyncStorage cleared');
      
      // Force immediate navigation to login
      console.log('UserMenu: Forcing navigation to login...');
      router.replace('/');
      
      console.log('UserMenu: Forced logout complete');
    } catch (error) {
      console.error('UserMenu: Logout error:', error);
      // Even if error occurs, force logout
      try {
        reset();
        await AsyncStorage.clear();
      } catch (e) {
        console.error('UserMenu: Final clear error:', e);
      }
      router.replace('/');
    }
  };

  return (
    <View style={styles.container}>
      {/* Menu Button */}
      <TouchableOpacity
        style={styles.menuButton}
        onPress={() => setMenuVisible(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="menu" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Dropdown Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuContainer}>
            <LinearGradient
              colors={['#1a1a2e', '#0a0a0a', '#000']}
              style={styles.menuGradient}
            >
              {/* User Info Section */}
              <View style={styles.userSection}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{user?.name || 'User'}</Text>
                  <Text style={styles.userEmail}>{user?.email || ''}</Text>
                  {user?.mentor_id && (
                    <Text style={styles.userMentor}>Mentor: {user.mentor_id}</Text>
                  )}
                </View>
              </View>

              <View style={styles.divider} />

              {/* Menu Items */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  router.push('/about');
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="information-circle-outline" size={24} color="#00D9FF" />
                <Text style={styles.menuItemText}>About & Legal</Text>
                <Ionicons name="chevron-forward" size={22} color="#666" />
              </TouchableOpacity>

              <View style={styles.divider} />

              {/* Logout Button */}
              <TouchableOpacity
                style={styles.logoutItem}
                onPress={handleLogout}
                activeOpacity={0.7}
              >
                <Ionicons name="log-out-outline" size={24} color="#FF4444" />
                <Text style={styles.logoutText}>Logout</Text>
                <Ionicons name="arrow-forward" size={22} color="#FF4444" />
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 1000,
    paddingTop: 40,
    paddingLeft: 8,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,217,255,0.2)',
    borderWidth: 2,
    borderColor: '#00D9FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00D9FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    paddingTop: 90,
    paddingLeft: 8,
  },
  menuContainer: {
    width: 280,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#00D9FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  menuGradient: {
    borderWidth: 1,
    borderColor: 'rgba(0,217,255,0.3)',
    borderRadius: 16,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(0,217,255,0.05)',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#00D9FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 13,
    color: '#888',
    marginBottom: 4,
  },
  userMentor: {
    fontSize: 11,
    color: '#666',
  },
  divider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingHorizontal: 20,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    marginLeft: 12,
    fontWeight: '600',
  },
  logoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255,68,68,0.1)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,68,68,0.3)',
  },
  logoutText: {
    flex: 1,
    fontSize: 16,
    color: '#FF4444',
    marginLeft: 12,
    fontWeight: 'bold',
  },
});
