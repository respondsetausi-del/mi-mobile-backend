import { create } from 'zustand';
import axios, { AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Alert } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

// Helper to get auth headers
const getAuthHeaders = async () => {
  const token = await AsyncStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Helper to handle API errors
const handleApiError = async (error: any) => {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 403) {
      // Check if user has a token - if not, they intentionally logged out
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        // User logged out intentionally, don't show alert
        console.log('403 error but no token found - user logged out');
        return true;
      }
      
      // User is deactivated or account not active
      Alert.alert(
        'Account Inactive',
        'Your account has been deactivated. Please contact support.',
        [
          {
            text: 'OK',
            onPress: async () => {
              await AsyncStorage.clear();
              router.replace('/');
            },
          },
        ]
      );
      return true;
    }
  }
  return false;
};

interface IndicatorSettings {
  type: string;
  parameters: Record<string, any>;
}

interface EAConfig {
  symbol: string;
  timeframe: string;
  indicator: IndicatorSettings;
}

interface EA {
  _id: string;
  name: string;
  status: 'running' | 'stopped';
  config: EAConfig;
  current_signal?: string;
  last_price?: number;
  indicator_values?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface Quote {
  symbol: string;
  category: string;
  bid: number;
  ask: number;
  close: number;
  change: number;
  timestamp: string;
}

interface Symbols {
  forex: string[];
  crypto: string[];
  metals: string[];
  indices: string[];
}

interface EAStore {
  eas: EA[];
  quotes: Quote[];
  symbols: Symbols;
  selectedEAId: string | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchEAs: () => Promise<void>;
  fetchQuotes: (category?: string) => Promise<void>;
  fetchSymbols: () => Promise<void>;
  addEA: (data: { name: string; config: EAConfig }) => Promise<void>;
  deleteEA: (id: string) => Promise<void>;
  toggleEAStatus: (id: string) => Promise<void>;
  selectEA: (id: string) => void;
  reset: () => void;
}

export const useEAStore = create<EAStore>((set, get) => ({
  eas: [],
  quotes: [],
  symbols: { forex: [], crypto: [], metals: [], indices: [] },
  selectedEAId: null,
  loading: false,
  error: null,

  fetchEAs: async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.get(`${API_URL}/api/ea`, { headers });
      const eas = response.data;
      set({ eas, error: null });
      
      // Auto-select first EA if none selected
      if (!get().selectedEAId && eas.length > 0) {
        set({ selectedEAId: eas[0]._id });
      }
    } catch (error) {
      const handled = await handleApiError(error);
      if (!handled) {
        console.error('Error fetching EAs:', error);
        set({ error: 'Failed to fetch EAs' });
      }
    }
  },

  fetchQuotes: async (category?: string) => {
    try {
      const url = category ? `${API_URL}/api/quotes?category=${category}` : `${API_URL}/api/quotes`;
      const response = await axios.get(url);
      set({ quotes: response.data, error: null });
    } catch (error) {
      console.error('Error fetching quotes:', error);
    }
  },

  fetchSymbols: async () => {
    try {
      const response = await axios.get(`${API_URL}/api/symbols`);
      set({ symbols: response.data, error: null });
    } catch (error) {
      console.error('Error fetching symbols:', error);
    }
  },

  addEA: async (data) => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.post(`${API_URL}/api/ea`, data, { headers });
      const newEA = response.data;
      set((state) => ({
        eas: [...state.eas, newEA],
        selectedEAId: newEA._id,
        error: null,
      }));
    } catch (error) {
      console.error('Error adding EA:', error);
      set({ error: 'Failed to add EA' });
      throw error;
    }
  },

  deleteEA: async (id) => {
    try {
      const headers = await getAuthHeaders();
      await axios.delete(`${API_URL}/api/ea/${id}`, { headers });
      set((state) => {
        const newEAs = state.eas.filter((ea) => ea._id !== id);
        return {
          eas: newEAs,
          selectedEAId: newEAs.length > 0 ? newEAs[0]._id : null,
          error: null,
        };
      });
    } catch (error) {
      console.error('Error deleting EA:', error);
      set({ error: 'Failed to delete EA' });
      throw error;
    }
  },

  toggleEAStatus: async (id) => {
    try {
      const headers = await getAuthHeaders();
      const ea = get().eas.find((e) => e._id === id);
      if (!ea) return;

      const endpoint = ea.status === 'running' ? 'stop' : 'start';
      const response = await axios.post(`${API_URL}/api/ea/${id}/${endpoint}`, {}, { headers });
      const updatedEA = response.data;

      set((state) => ({
        eas: state.eas.map((e) => (e._id === id ? updatedEA : e)),
        error: null,
      }));
    } catch (error) {
      console.error('Error toggling EA status:', error);
      set({ error: 'Failed to toggle EA status' });
      throw error;
    }
  },

  selectEA: (id) => {
    set({ selectedEAId: id });
  },

  reset: () => {
    set({
      eas: [],
      quotes: [],
      symbols: { forex: [], crypto: [], metals: [], indices: [] },
      selectedEAId: null,
      loading: false,
      error: null,
    });
  },
}));
