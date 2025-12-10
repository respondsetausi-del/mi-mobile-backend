import { useState, useEffect, useRef } from 'react';

export interface QueuedSignal {
  id: string;
  signal: string;
  symbol: string;
  indicator: string;
  price: number;
  candle_pattern: string;
  duration?: number; // in seconds, default 30
  timestamp: number;
}

export const useSignalQueue = () => {
  const [queue, setQueue] = useState<QueuedSignal[]>([]);
  const [currentSignal, setCurrentSignal] = useState<QueuedSignal | null>(null);
  const [isDisplaying, setIsDisplaying] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Add signal to queue
  const addSignal = (signal: Omit<QueuedSignal, 'id' | 'timestamp'>) => {
    const newSignal: QueuedSignal = {
      ...signal,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      duration: signal.duration || 30, // Default 30 seconds
    };

    console.log('📥 Adding signal to queue:', newSignal);
    setQueue(prev => [...prev, newSignal]);
  };

  // Process queue - show next signal
  useEffect(() => {
    if (!isDisplaying && queue.length > 0) {
      const nextSignal = queue[0];
      console.log('▶️ Displaying signal:', nextSignal);
      
      setCurrentSignal(nextSignal);
      setIsDisplaying(true);
      
      // Remove from queue
      setQueue(prev => prev.slice(1));

      // Set timer for signal duration
      const duration = nextSignal.duration || 30;
      timerRef.current = setTimeout(() => {
        console.log('⏱️ Signal duration expired:', duration, 'seconds');
        setIsDisplaying(false);
        setCurrentSignal(null);
      }, duration * 1000);
    }

    // Cleanup timer on unmount
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [queue, isDisplaying]);

  // Manual close signal
  const closeCurrentSignal = () => {
    console.log('👆 User manually closed signal');
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setIsDisplaying(false);
    setCurrentSignal(null);
  };

  // Clear entire queue
  const clearQueue = () => {
    console.log('🗑️ Clearing signal queue');
    setQueue([]);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setIsDisplaying(false);
    setCurrentSignal(null);
  };

  return {
    currentSignal,
    queueLength: queue.length,
    isDisplaying,
    addSignal,
    closeCurrentSignal,
    clearQueue,
  };
};
