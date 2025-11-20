import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || '';

interface Quote {
  symbol: string;
  bid: number;
  ask: number;
  close: number;
  change: number;
  changePercent: number;
  category: string;
}

interface EA {
  _id: string;
  name: string;
  status: 'running' | 'stopped';
  config: {
    symbol: string;
    timeframe: string;
    indicator: any;
  };
  current_signal: string;
  last_price: number;
}

interface EAStore {
  eas: EA[];
  quotes: Quote[];
  loading: boolean;
  error: string | null;
  selectedEAId: string | null;
  fetchEAs: () => Promise<void>;
  fetchQuotes: () => Promise<void>;
  addEA: (symbol: string, timeframe: string, indicatorType: string, indicatorParams: any) => Promise<void>;
  deleteEA: (id: string) => Promise<void>;
  startEA: (id: string) => Promise<void>;
  stopEA: (id: string) => Promise<void>;
  toggleEAStatus: (id: string) => Promise<void>;
  selectEA: (id: string) => void;
  reset: () => void;
}

export const useEAStore = create<EAStore>((set, get) => ({
  eas: [],
  quotes: [],
  loading: false,
  error: null,
  selectedEAId: null,

  fetchEAs: async () => {
    try {
      set({ loading: true, error: null });
      const token = await AsyncStorage.getItem('authToken');
      
      if (!token) {
        set({ eas: [], loading: false });
        return;
      }

      const response = await fetch(`${API_URL}/api/ea`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        set({ eas: data, loading: false });
      } else {
        throw new Error('Failed to fetch EAs');
      }
    } catch (error) {
      set({ error: 'Failed to fetch EAs', loading: false });
      throw error;
    }
  },

  fetchQuotes: async () => {
    try {
      const response = await fetch(`${API_URL}/api/quotes`);
      if (response.ok) {
        const data = await response.json();
        set({ quotes: data });
      }
    } catch (error) {
      console.error('Error fetching quotes:', error);
    }
  },

  addEA: async (symbol: string, timeframe: string, indicatorType: string, indicatorParams: any) => {
    try {
      set({ loading: true, error: null });
      const token = await AsyncStorage.getItem('authToken');

      const response = await fetch(`${API_URL}/api/ea`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: `${symbol} ${indicatorType}`,
          config: {
            symbol,
            timeframe,
            indicator: {
              type: indicatorType,
              parameters: indicatorParams,
            },
          },
        }),
      });

      if (response.ok) {
        await get().fetchEAs();
      } else {
        throw new Error('Failed to add EA');
      }
    } catch (error) {
      set({ error: 'Failed to add EA' });
      throw error;
    }
  },

  deleteEA: async (id: string) => {
    try {
      set({ loading: true, error: null });
      const token = await AsyncStorage.getItem('authToken');

      const response = await fetch(`${API_URL}/api/ea/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        set((state) => ({
          eas: state.eas.filter((ea) => ea._id !== id),
          loading: false,
        }));
      } else {
        throw new Error('Failed to delete EA');
      }
    } catch (error) {
      set({ error: 'Failed to delete EA' });
      throw error;
    }
  },

  startEA: async (id: string) => {
    try {
      const token = await AsyncStorage.getItem('authToken');

      const response = await fetch(`${API_URL}/api/ea/${id}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const updatedEA = await response.json();
        set((state) => ({
          eas: state.eas.map((ea) => (ea._id === id ? updatedEA : ea)),
        }));
      } else {
        throw new Error('Failed to start EA');
      }
    } catch (error) {
      set({ error: 'Failed to start EA' });
      throw error;
    }
  },

  stopEA: async (id: string) => {
    try {
      const token = await AsyncStorage.getItem('authToken');

      const response = await fetch(`${API_URL}/api/ea/${id}/stop`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const updatedEA = await response.json();
        set((state) => ({
          eas: state.eas.map((ea) => (ea._id === id ? updatedEA : ea)),
        }));
      } else {
        throw new Error('Failed to stop EA');
      }
    } catch (error) {
      set({ error: 'Failed to stop EA' });
      throw error;
    }
  },

  toggleEAStatus: async (id: string) => {
    try {
      const ea = get().eas.find((e) => e._id === id);
      if (!ea) return;

      if (ea.status === 'running') {
        await get().stopEA(id);
      } else {
        await get().startEA(id);
      }
      
      // Refresh EAs to get updated status
      await get().fetchEAs();
    } catch (error) {
      console.error('Error toggling EA status:', error);
      throw error;
    }
  },

  selectEA: (id: string) => {
    set({ selectedEAId: id });
  },

  reset: () => {
    set({ eas: [], quotes: [], loading: false, error: null, selectedEAId: null });
  },
}));
