import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEAStore } from '../store/eaStore';
import { LinearGradient } from 'expo-linear-gradient';

interface RemoveEAModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RemoveEAModal({ visible, onClose, onSuccess }: RemoveEAModalProps) {
  const { eas, deleteEA, fetchEAs } = useEAStore();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reset selection when modal opens
  useEffect(() => {
    if (visible) {
      console.log('📋 RemoveEAModal opened');
      console.log('📊 Available EAs:', eas.length);
      setSelectedIds([]);
      setIsDeleting(false);
    }
  }, [visible]);

  const toggleSelection = (id: string) => {
    console.log('🔘 Toggle selection for EA ID:', id);
    setSelectedIds(prevIds => {
      if (prevIds.includes(id)) {
        console.log('➖ Removing from selection');
        return prevIds.filter(selectedId => selectedId !== id);
      } else {
        console.log('➕ Adding to selection');
        return [...prevIds, id];
      }
    });
  };

  const handleRemove = () => {
    console.log('🗑️ ========== REMOVE BUTTON PRESSED ==========');
    console.log('📊 Selected IDs:', selectedIds);
    console.log('📊 Selected count:', selectedIds.length);
    console.log('📊 Is Deleting:', isDeleting);
    
    if (isDeleting) {
      console.log('⏳ Already deleting, ignoring click');
      return;
    }
    
    if (selectedIds.length === 0) {
      console.log('⚠️ No selection made');
      Alert.alert('No Selection', 'Please select at least one Signal Monitor to remove.');
      return;
    }

    // Show confirmation alert
    Alert.alert(
      'Confirm Removal',
      `Are you sure you want to remove ${selectedIds.length} Signal Monitor(s)?\n\nThis action cannot be undone.`,
      [
        { 
          text: 'Cancel', 
          style: 'cancel',
          onPress: () => console.log('❌ User cancelled removal')
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => performDeletion(),
        },
      ]
    );
  };

  const performDeletion = async () => {
    console.log('🚀 ========== STARTING DELETION PROCESS ==========');
    setIsDeleting(true);
    
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];
    
    try {
      for (let i = 0; i < selectedIds.length; i++) {
        const id = selectedIds[i];
        console.log(`\n🔄 [${i + 1}/${selectedIds.length}] Attempting to delete EA ID: ${id}`);
        
        try {
          await deleteEA(id);
          successCount++;
          console.log(`✅ [${i + 1}/${selectedIds.length}] Successfully deleted EA ID: ${id}`);
        } catch (error: any) {
          failCount++;
          const errorMsg = error?.message || 'Unknown error';
          errors.push(`EA ${id}: ${errorMsg}`);
          console.error(`❌ [${i + 1}/${selectedIds.length}] Failed to delete EA ID: ${id}`, error);
        }
      }
      
      console.log('\n📊 ========== DELETION SUMMARY ==========');
      console.log(`✅ Success: ${successCount}`);
      console.log(`❌ Failed: ${failCount}`);
      console.log(`📝 Errors:`, errors);
      
      // Refresh the EA list
      console.log('🔄 Refreshing EA list...');
      await fetchEAs();
      
      // Clear selection
      setSelectedIds([]);
      
      // Show result
      if (successCount > 0 && failCount === 0) {
        Alert.alert(
          'Success!', 
          `Successfully removed ${successCount} Signal Monitor(s).`,
          [{ text: 'OK', onPress: () => {
            onSuccess();
            onClose();
          }}]
        );
      } else if (successCount > 0 && failCount > 0) {
        Alert.alert(
          'Partial Success', 
          `Removed ${successCount} Signal Monitor(s).\n${failCount} failed to remove.`,
          [{ text: 'OK', onPress: () => {
            onSuccess();
            onClose();
          }}]
        );
      } else {
        Alert.alert(
          'Error', 
          `Failed to remove Signal Monitors.\n\n${errors.join('\n')}`,
          [{ text: 'OK' }]
        );
      }
      
    } catch (error) {
      console.error('❌ Unexpected error during deletion:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsDeleting(false);
      console.log('🏁 ========== DELETION PROCESS COMPLETE ==========\n');
    }
  };

  const getSignalColor = (signal?: string) => {
    if (signal === 'BUY') return '#00FF88';
    if (signal === 'SELL') return '#FF4444';
    return '#888';
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <LinearGradient colors={['#000', '#0a0a0a']} style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>REMOVE EAs</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close-circle" size={32} color="#FF4444" />
            </TouchableOpacity>
          </View>

          <Text style={styles.instructions}>Select EAs to remove</Text>

          <ScrollView style={styles.eaList} showsVerticalScrollIndicator={false}>
            {eas.map((ea) => {
              const isSelected = selectedIds.includes(ea._id);
              const signalColor = getSignalColor(ea.current_signal);
              
              return (
                <TouchableOpacity
                  key={ea._id}
                  style={[styles.eaItem, isSelected && styles.eaItemSelected]}
                  onPress={() => toggleSelection(ea._id)}
                  activeOpacity={0.6}
                >
                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && <Ionicons name="checkmark" size={22} color="#fff" />}
                  </View>
                  
                  <View style={styles.eaDetails}>
                    <Text style={styles.eaName}>{ea.name}</Text>
                    <View style={styles.eaInfo}>
                      <Text style={styles.eaSymbol}>{ea.config?.symbol || 'Unknown'}</Text>
                      <Text style={styles.eaIndicator}> • {ea.config?.indicator?.type || 'N/A'}</Text>
                      <Text style={styles.eaTimeframe}> • {ea.config?.timeframe || 'N/A'}</Text>
                    </View>
                    {ea.current_signal && ea.current_signal !== 'NEUTRAL' && (
                      <View style={[styles.signalBadge, { borderColor: signalColor, backgroundColor: `${signalColor}20` }]}>
                        <Text style={[styles.signalText, { color: signalColor }]}>{ea.current_signal}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.footer}>
            <Text style={styles.selectedCount}>
              {selectedIds.length} selected
            </Text>
            <TouchableOpacity
              style={[
                styles.removeButton, 
                (selectedIds.length === 0 || isDeleting) && styles.removeButtonDisabled
              ]}
              onPress={handleRemove}
              disabled={selectedIds.length === 0 || isDeleting}
              activeOpacity={0.7}
            >
              {isDeleting ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.removeButtonText}>REMOVING...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="trash" size={20} color="#fff" />
                  <Text style={styles.removeButtonText}>REMOVE SELECTED</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' },
  modalContent: { height: '80%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#FF4444', letterSpacing: 2 },
  instructions: { fontSize: 13, color: '#888', marginBottom: 16 },
  eaList: { flex: 1, marginBottom: 20 },
  eaItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 2, borderColor: '#333', borderRadius: 12, padding: 14, marginBottom: 12, shadowColor: '#333', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 },
  eaItemSelected: { borderColor: '#00D9FF', borderWidth: 3, backgroundColor: 'rgba(0,217,255,0.15)', shadowColor: '#00D9FF', shadowOpacity: 0.5 },
  checkbox: { width: 32, height: 32, borderRadius: 8, borderWidth: 2, borderColor: '#555', alignItems: 'center', justifyContent: 'center', marginRight: 14, backgroundColor: 'rgba(0,0,0,0.3)' },
  checkboxSelected: { borderColor: '#00D9FF', backgroundColor: '#00D9FF', borderWidth: 2 },
  eaDetails: { flex: 1 },
  eaName: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 6 },
  eaInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  eaSymbol: { fontSize: 12, color: '#00D9FF', fontWeight: '600' },
  eaIndicator: { fontSize: 11, color: '#888' },
  eaTimeframe: { fontSize: 11, color: '#666' },
  signalBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1.5, marginTop: 4 },
  signalText: { fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },
  footer: { borderTopWidth: 1, borderTopColor: '#222', paddingTop: 16 },
  selectedCount: { color: '#888', fontSize: 13, marginBottom: 12, textAlign: 'center' },
  removeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF4444', paddingVertical: 14, borderRadius: 12, gap: 8 },
  removeButtonDisabled: { opacity: 0.4 },
  removeButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
});
