import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Animated, 
  TouchableOpacity, 
  Dimensions,
  PanResponder,
  Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
const TAP_THRESHOLD = 10; // Pixels moved to distinguish tap from drag

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
  // State management
  const [expanded, setExpanded] = useState(false);
  
  // Animations
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  
  // Position tracking
  const position = useRef(new Animated.ValueXY({
    x: SCREEN_WIDTH - BUBBLE_SIZE - 20,
    y: SCREEN_HEIGHT / 2 - BUBBLE_SIZE / 2
  })).current;
  
  // Drag tracking
  const dragStart = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  
  // Get color based on signal
  const getColor = () => {
    if (signal === 'BUY') return '#00FF88';
    if (signal === 'SELL') return '#FF4444';
    return '#00D9FF';
  };
  
  const color = getColor();

  // Entrance animation
  useEffect(() => {
    if (isVisible) {
      console.log('🎈 Floating bubble appearing with signal:', signal);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible]);

  // Pulse animation
  useEffect(() => {
    if (signal !== 'NEUTRAL') {
      const pulse = Animated.loop(
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
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [signal]);

  // Pan responder for drag and tap
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      
      onPanResponderGrant: (evt) => {
        try {
          console.log('👆 Touch started');
          dragStart.current = {
            x: evt.nativeEvent.pageX,
            y: evt.nativeEvent.pageY
          };
          isDragging.current = false;
          
          // Set offset for smooth dragging
          position.setOffset({
            x: position.x._value,
            y: position.y._value,
          });
          position.setValue({ x: 0, y: 0 });
        } catch (error) {
          console.error('❌ Error in onPanResponderGrant:', error);
        }
      },

      onPanResponderMove: (evt, gestureState) => {
        try {
          const distance = Math.sqrt(
            Math.pow(gestureState.dx, 2) + Math.pow(gestureState.dy, 2)
          );
          
          if (distance > TAP_THRESHOLD) {
            isDragging.current = true;
            console.log('🖐️ Dragging detected, distance:', distance.toFixed(0));
          }
          
          // Update position during drag
          if (isDragging.current) {
            position.setValue({
              x: gestureState.dx,
              y: gestureState.dy,
            });
          }
        } catch (error) {
          console.error('❌ Error in onPanResponderMove:', error);
        }
      },

      onPanResponderRelease: (evt, gestureState) => {
        try {
          const distance = Math.sqrt(
            Math.pow(gestureState.dx, 2) + Math.pow(gestureState.dy, 2)
          );
          
          console.log('🔓 Touch released, distance:', distance.toFixed(0));
          
          if (distance < TAP_THRESHOLD) {
            // It's a TAP
            console.log('👆 TAP detected - expanding/collapsing bubble');
            handleTap();
            
            // Reset position (no movement)
            position.flattenOffset();
          } else {
            // It's a DRAG
            console.log('🖐️ DRAG completed - saving position');
            
            // Calculate final position
            position.flattenOffset();
            const finalX = position.x._value + gestureState.dx;
            const finalY = position.y._value + gestureState.dy;
            
            // Constrain to screen bounds
            const maxX = SCREEN_WIDTH - BUBBLE_SIZE - 10;
            const maxY = SCREEN_HEIGHT - BUBBLE_SIZE - 100;
            const constrainedX = Math.max(10, Math.min(finalX, maxX));
            const constrainedY = Math.max(50, Math.min(finalY, maxY));
            
            // Animate to constrained position
            Animated.spring(position, {
              toValue: { x: constrainedX, y: constrainedY },
              friction: 7,
              tension: 40,
              useNativeDriver: false,
            }).start(() => {
              console.log('📍 Final position:', constrainedX.toFixed(0), constrainedY.toFixed(0));
            });
          }
        } catch (error) {
          console.error('❌ Error in onPanResponderRelease:', error);
          // Silently handle error - don't show alert to user
        }
      },

      onPanResponderTerminate: () => {
        try {
          console.log('⚠️ Gesture terminated');
          position.flattenOffset();
        } catch (error) {
          console.error('❌ Error in onPanResponderTerminate:', error);
        }
      },
    })
  ).current;

  // Handle tap (expand/collapse)
  const handleTap = () => {
    try {
      const newExpanded = !expanded;
      console.log('💬 Toggling expanded:', newExpanded);
      setExpanded(newExpanded);
      
      // Bounce animation
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 3,
          useNativeDriver: true,
        }),
      ]).start();
    } catch (error) {
      console.error('❌ Error in handleTap:', error);
      // Silently handle error - continue working
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { translateX: position.x },
            { translateY: position.y },
            { scale: scaleAnim },
          ],
          opacity: opacityAnim,
        },
      ]}
      {...panResponder.panHandlers}
    >
      {/* Main Bubble */}
      <Animated.View
        style={[
          styles.bubble,
          {
            backgroundColor: color,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        <Text style={styles.logoText}>MI</Text>
        {signal !== 'NEUTRAL' && (
          <View style={[styles.signalDot, { backgroundColor: '#fff' }]} />
        )}
      </Animated.View>

      {/* Expanded Info Card */}
      {expanded && signal !== 'NEUTRAL' && (
        <View style={[styles.infoCard, { borderColor: color }]}>
          <View style={styles.infoHeader}>
            <Ionicons 
              name={signal === 'BUY' ? 'trending-up' : 'trending-down'} 
              size={24} 
              color={color} 
            />
            <Text style={[styles.signalText, { color }]}>{signal}</Text>
          </View>
          
          {symbol && <Text style={styles.symbolText}>{symbol}</Text>}
          {/* Only show indicator if it's not "Admin Signal", "Mentor Signal" or "Manual" */}
          {indicator && !indicator.toLowerCase().includes('admin') && !indicator.toLowerCase().includes('mentor') && indicator.toLowerCase() !== 'manual' && indicator.toLowerCase() !== 'manual signal' && (
            <Text style={styles.indicatorText}>{indicator}</Text>
          )}
          {price > 0 && <Text style={styles.priceText}>Price: ${price.toFixed(5)}</Text>}
          {/* Only show candle pattern if it's not about admin/mentor */}
          {candle_pattern && !candle_pattern.toLowerCase().includes('admin') && !candle_pattern.toLowerCase().includes('mentor') && (
            <Text style={styles.candlePatternText}>📊 {candle_pattern}</Text>
          )}
          
          <Text style={styles.dragHint}>Tap to close • Drag to move</Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 9999,
    elevation: 9999,
  },
  bubble: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoText: {
    color: '#000',
    fontSize: 20,
    fontWeight: 'bold',
    textShadowColor: 'rgba(255, 255, 255, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  signalDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#000',
  },
  infoCard: {
    position: 'absolute',
    top: BUBBLE_SIZE + 10,
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 10,
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
  },
  symbolText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  indicatorText: {
    color: '#aaa',
    fontSize: 13,
    marginBottom: 4,
  },
  priceText: {
    color: '#ddd',
    fontSize: 14,
    marginBottom: 4,
  },
  candlePatternText: {
    color: '#ccc',
    fontSize: 12,
    marginBottom: 8,
  },
  dragHint: {
    color: '#666',
    fontSize: 10,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 4,
  },
});
