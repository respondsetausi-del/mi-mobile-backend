import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';

interface FloatingBubbleProps {
  signal: string;
  systemName?: string;
  isVisible?: boolean;
  onClose?: () => void;
  symbol?: string;
  indicator?: string;
  price?: number;
  candle_pattern?: string;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const BUBBLE_SIZE = 60;

export default function FloatingBubble({ 
  signal, 
  systemName, 
  isVisible = true, 
  onClose, 
  symbol = '', 
  indicator = '', 
  price = 0, 
  candle_pattern = '' 
}: FloatingBubbleProps) {
  const [expanded, setExpanded] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(1));
  const [pulseAnim] = useState(new Animated.Value(1));
  
  // Position tracking for dragging
  const translateX = useRef(new Animated.Value(SCREEN_WIDTH - BUBBLE_SIZE - 20)).current;
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT - 160)).current; // Align with bottom nav (160px from bottom)
  
  const lastOffset = useRef({ x: SCREEN_WIDTH - BUBBLE_SIZE - 20, y: SCREEN_HEIGHT - 160 });

  useEffect(() => {
    // Pulse animation when signal changes
    if (signal !== 'NEUTRAL') {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Continuous pulse for active signals
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [signal]);

  const onGestureEvent = Animated.event(
    [
      {
        nativeEvent: {
          translationX: translateX,
          translationY: translateY,
        },
      },
    ],
    { useNativeDriver: false } // Changed to false for better performance
  );

  const onHandlerStateChange = (event: any) => {
    const { oldState, translationX: dx, translationY: dy } = event.nativeEvent;
    
    // State 4 = END, State 5 = CANCELLED
    if (oldState === 4 || oldState === 5) {
      // Calculate distance moved
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // If movement is less than 10 pixels, treat as tap (not drag)
      if (distance < 10) {
        console.log('👆 Detected tap (not drag), distance:', distance);
        // Reset position values to prevent jump
        translateX.setValue(0);
        translateY.setValue(0);
        return; // Don't update position for taps
      }
      
      console.log('🖐️ Detected drag, distance:', distance);
      
      // Gesture ended - calculate final position
      const newX = lastOffset.current.x + dx;
      const newY = lastOffset.current.y + dy;

      // Constrain to screen bounds
      const maxX = SCREEN_WIDTH - BUBBLE_SIZE - 10;
      const maxY = SCREEN_HEIGHT - BUBBLE_SIZE - 10;
      
      const constrainedX = Math.max(10, Math.min(newX, maxX));
      const constrainedY = Math.max(10, Math.min(newY, maxY));

      // Update last offset
      lastOffset.current = {
        x: constrainedX,
        y: constrainedY,
      };

      // Smoothly animate to final position
      translateX.flattenOffset();
      translateY.flattenOffset();
      
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: constrainedX,
          useNativeDriver: false,
          friction: 7,
          tension: 40,
        }),
        Animated.spring(translateY, {
          toValue: constrainedY,
          useNativeDriver: false,
          friction: 7,
          tension: 40,
        }),
      ]).start(() => {
        // Set offset after animation completes
        translateX.setOffset(constrainedX);
        translateX.setValue(0);
        
        translateY.setOffset(constrainedY);
        translateY.setValue(0);
      });
    }
  };

  const getSignalColor = () => {
    if (signal === 'BUY') return '#00FF88';
    if (signal === 'SELL') return '#FF4444';
    return '#00D9FF';
  };

  const color = getSignalColor();

  // Don't render if not visible or signal is neutral
  if (!isVisible || !signal || signal === 'NEUTRAL') {
    return null;
  }

  // Handle tap separately from drag to prevent conflicts
  const handleTap = () => {
    try {
      console.log('🔘 Bubble tapped, expanding:', !expanded);
      setExpanded(!expanded);
    } catch (error) {
      console.error('❌ Error in bubble tap:', error);
    }
  };

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          transform: [
            { translateX },
            { translateY },
            { scale: scaleAnim }
          ] 
        }
      ]}
    >
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
      >
        <Animated.View>
          <TouchableOpacity 
            style={[styles.bubble, { backgroundColor: color, transform: [{ scale: pulseAnim }] }]}
            onPress={handleTap}
            activeOpacity={0.9}
          >
            <Text style={styles.logoText}>MI</Text>
            {signal !== 'NEUTRAL' && (
              <View style={styles.signalDot} />
            )}
          </TouchableOpacity>
        </Animated.View>
      </PanGestureHandler>

      {expanded && signal !== 'NEUTRAL' && (
        <Animated.View style={[styles.infoCard, { borderColor: color }]}>
          <View style={styles.infoHeader}>
            <Ionicons 
              name={signal === 'BUY' ? 'trending-up' : 'trending-down'} 
              size={24} 
              color={color} 
            />
            <Text style={[styles.signalText, { color }]}>{signal}</Text>
          </View>
          <Text style={styles.symbolText}>{symbol}</Text>
          {candle_pattern && <Text style={styles.candlePatternText}>📊 {candle_pattern}</Text>}
          <Text style={styles.indicatorText}>{indicator}</Text>
          {price > 0 && <Text style={styles.priceText}>Price: ${price.toFixed(5)}</Text>}
          <Text style={styles.dragHint}>Drag to move</Text>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 9999,
    alignItems: 'flex-end',
  },
  bubble: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: 3,
    borderColor: '#fff',
  },
  logoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    letterSpacing: 2,
  },
  signalDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#000',
  },
  infoCard: {
    backgroundColor: 'rgba(0,0,0,0.95)',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    marginRight: 0,
    borderWidth: 2,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 8,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  signalText: {
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  symbolText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  candlePatternText: {
    color: '#00D9FF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  indicatorText: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
  },
  priceText: {
    fontSize: 14,
    color: '#00D9FF',
    fontWeight: '600',
  },
  dragHint: {
    fontSize: 10,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
