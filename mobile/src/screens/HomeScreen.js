import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Mic, Square, Loader2 } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

export default function HomeScreen() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [timer, setTimer] = useState("00:00");
  const navigation = useNavigation();

  const handlePress = () => {
    if (isRecording) {
      setIsRecording(false);
      setIsProcessing(true);
      // Simulate stop + processing
      setTimeout(() => {
        setIsProcessing(false);
        navigation.navigate('History');
      }, 2000);
    } else {
      setIsRecording(true);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.recordWrapper}>
        <TouchableOpacity 
          style={[styles.recordBtn, isRecording && styles.recordingBtn, isProcessing && styles.processingBtn]} 
          onPress={handlePress}
          activeOpacity={0.8}
        >
          {isProcessing ? (
            <Loader2 color="white" size={40} />
          ) : isRecording ? (
            <Square color="white" size={32} fill="white" />
          ) : (
            <Mic color="white" size={40} />
          )}
        </TouchableOpacity>
        <Text style={styles.timerText}>{timer}</Text>
        <Text style={styles.statusText}>{isRecording ? "Recording chunks..." : isProcessing ? "Finalizing AI summary..." : "Tap to record"}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Universal AI Sync</Text>
        <Text style={styles.cardText}>Record on mobile, view on web. Your AI transcripts are synced everywhere via Supabase.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a14', padding: 20, justifyContent: 'center' },
  recordWrapper: { alignItems: 'center', marginBottom: 60 },
  recordBtn: { 
    width: 120, height: 120, borderRadius: 60, 
    backgroundColor: '#7c3aed', 
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 10 }, 
    shadowOpacity: 0.5, shadowRadius: 20, elevation: 15,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.1)'
  },
  recordingBtn: { backgroundColor: '#ef4444', shadowColor: '#ef4444' },
  processingBtn: { backgroundColor: '#f97316', shadowColor: '#f97316' },
  timerText: { fontSize: 48, color: 'white', fontWeight: 'bold', marginVertical: 20 },
  statusText: { color: '#94a3b8', fontSize: 16, textTransform: 'uppercase', letterSpacing: 1 },
  card: { backgroundColor: '#12121f', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#1a1a2e' },
  cardTitle: { color: '#a855f7', fontWeight: 'bold', fontSize: 18, marginBottom: 8 },
  cardText: { color: '#94a3b8', lineHeight: 22 }
});
