import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Play, Pause, Trash2, Calendar, Clock, MessageSquare, Zap, FileText } from 'lucide-react-native';
import { getRecording } from '../services/api';
import { format } from 'date-fns';

export default function DetailScreen({ route, navigation }) {
  const { id } = route.params;
  const [recording, setRecording] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getRecording(id);
      setRecording(data);
    } catch (err) {
      console.error(err);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color="#7c3aed" /></View>;
  if (!recording) return null;

  const { chunks = [], summaries = {} } = recording;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }}>
      <View style={styles.header}>
        <Text style={styles.title}>{recording.title}</Text>
        <View style={styles.meta}>
          <Text style={styles.metaText}>{format(new Date(recording.created_at), 'dd MMM yyyy, HH:mm')}</Text>
          <Text style={styles.metaText}> • </Text>
          <Text style={styles.metaText}>{Math.floor(recording.duration / 60)}m {recording.duration % 60}s</Text>
        </View>
      </View>

      {summaries.summary && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}><MessageSquare size={16} color="#475569" /><Text style={styles.sectionTitle}>SUMMARY</Text></View>
          <View style={styles.card}><Text style={styles.summaryText}>{summaries.summary}</Text></View>
        </View>
      )}

      {summaries.action_items?.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}><Zap size={16} color="#475569" /><Text style={styles.sectionTitle}>ACTION ITEMS</Text></View>
          {summaries.action_items.map((item, i) => (
            <View key={i} style={styles.actionItem}>
              <View style={styles.dot} />
              <Text style={styles.actionText}>{item}</Text>
            </View>
          ))}
        </View>
      )}

      {summaries.full_transcript && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}><FileText size={16} color="#475569" /><Text style={styles.sectionTitle}>TRANSCRIPT</Text></View>
          <View style={styles.transcriptCard}><Text style={styles.transcriptText}>{summaries.full_transcript}</Text></View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a14', padding: 15 },
  center: { flex: 1, backgroundColor: '#0a0a14', justifyContent: 'center', alignItems: 'center' },
  header: { marginBottom: 25 },
  title: { color: 'white', fontSize: 24, fontWeight: '800', marginBottom: 6 },
  meta: { flexDirection: 'row' },
  metaText: { color: '#94a3b8', fontSize: 13 },
  section: { marginBottom: 25 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { color: '#475569', fontSize: 12, fontWeight: 'bold', marginLeft: 8, letterSpacing: 1 },
  card: { backgroundColor: '#12121f', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(124, 58, 237, 0.2)' },
  summaryText: { color: '#f1f5f9', fontSize: 15, lineHeight: 22 },
  actionItem: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#12121f', borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#1a1a2e' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#7c3aed', marginRight: 12 },
  actionText: { color: '#94a3b8', fontSize: 14, flex: 1 },
  transcriptCard: { backgroundColor: '#12121f', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#1a1a2e', maxHeight: 300 },
  transcriptText: { color: '#94a3b8', fontSize: 14, lineHeight: 22 }
});
