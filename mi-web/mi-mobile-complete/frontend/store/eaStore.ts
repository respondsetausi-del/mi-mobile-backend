import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { mockApi, MOCK_MODE } from '../services/mockApi';

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
  symbols: { [key: string]: string[] };
  loading: boolean;
  error: string | null;
  selectedEAId: string | null;
  fetchEAs: () => Promise<void>;
  fetchQuotes: () => Promise<void>;
  fetchSymbols: () => Promise<void>;
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
  symbols: {
    forex: ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'NZD/USD', 'EUR/GBP'],
    crypto: ['BTC/USD', 'ETH/USD', 'XRP/USD', 'ADA/USD'],
    stocks: ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA'],
    commodities: ['GOLD', 'SILVER', 'OIL'],
  },
  loading: false,
  error: null,
  selectedEAId: null,

  fetchEAs: async () => {
    try {
      console.log('📤 Fetching EAs/Signal Monitors from API...');
      set({ loading: true, error: null });

      if (MOCK_MODE) {
        // Use mock data
        console.log('🎭 Using MOCK data for EAs');
        
        // Trigger signal change simulation
        const { changeSignalRandomly } = await import('../services/mockApi');
        changeSignalRandomly();
        
        const mockEAs = await mockApi.getEAs();
        console.log('✅ Received MOCK EAs:', mockEAs.length, 'items');
        console.log('📊 Current EA signals:', mockEAs.map(ea => `${ea.name}: ${ea.current_signal}`).join(', '));
        set({ eas: mockEAs as any[], loading: false });
        return;
      }

      const token = await AsyncStorage.getItem('authToken');
      
      if (!token) {
        console.log('❌ No auth token found');
        set({ eas: [], loading: false });
        return;
      }

      console.log('📤 Calling GET /api/ea');
      const response = await fetch(`${API_URL}/api/ea`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('📥 Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Received EAs/Signal Monitors:', data.length, 'items');
        console.log('📊 EAs data:', JSON.stringify(data.slice(0, 2))); // Log first 2 for reference
        set({ eas: data, loading: false });
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to fetch EAs. Status:', response.status, 'Error:', errorText);
        throw new Error('Failed to fetch EAs');
      }
    } catch (error) {
      console.error('❌ Exception in fetchEAs:', error);
      set({ error: 'Failed to fetch EAs', loading: false });
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

  addEA: async (eaData: any) => {
    try {
      set({ loading: true, error: null });
      const token = await AsyncStorage.getItem('authToken');

      console.log('📤 Sending EA create request:', {
        name: eaData.name || `${eaData.config.symbol} Monitor`,
        config: eaData.config
      });

      const response = await fetch(`${API_URL}/api/ea`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: eaData.name || `${eaData.config.symbol} Monitor`,
          config: eaData.config,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ EA created successfully:', result);
        await get().fetchEAs();
      } else {
        const error = await response.text();
        console.error('❌ Failed to create EA. Status:', response.status, 'Error:', error);
        throw new Error(`Failed to add EA: ${error}`);
      }
    } catch (error) {
      console.error('❌ Exception in addEA:', error);
      set({ error: 'Failed to add EA' });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  deleteEA: async (id: string) => {
    try {
      set({ loading: true, error: null });
      const token = await AsyncStorage.getItem('authToken');

      console.log(`🗑️ Deleting EA with ID: ${id}`);
      const response = await fetch(`${API_URL}/api/ea/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log(`📥 Delete response status: ${response.status}`);

      if (response.ok) {
        console.log(`✅ Successfully deleted EA ${id} from backend`);
        set((state) => ({
          eas: state.eas.filter((ea) => ea._id !== id),
          loading: false,
        }));
        console.log(`✅ EA ${id} removed from local state`);
      } else {
        const errorText = await response.text();
        console.error(`❌ Failed to delete EA. Status: ${response.status}, Error: ${errorText}`);
        throw new Error('Failed to delete EA');
      }
    } catch (error) {
      console.error('❌ Exception in deleteEA:', error);
      set({ error: 'Failed to delete EA', loading: false });
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

  fetchSymbols: async () => {
    // Symbols are already initialized in the store
    // This function is kept for compatibility with AddEA component
    console.log('Symbols already available in store');
  },

  selectEA: (id: string) => {
    set({ selectedEAId: id });
  },

  reset: () => {
    set({ eas: [], quotes: [], loading: false, error: null, selectedEAId: null });
  },
}));
