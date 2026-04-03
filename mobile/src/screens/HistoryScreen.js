import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Calendar, Clock, ChevronRight } from 'lucide-react-native';
import { getRecordings } from '../services/api';
import { format } from 'date-fns';

export default function HistoryScreen() {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  const fetchRecordings = async () => {
    setLoading(true);
    try {
      const data = await getRecordings();
      setRecordings(data.recordings || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchRecordings(); }, []);

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.item} 
      onPress={() => navigation.navigate('Detail', { id: item.id })}
    >
      <View style={styles.itemHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.itemTitle}>{item.title}</Text>
          <View style={styles.meta}>
            <View style={styles.metaItem}><Calendar size={12} color="#94a3b8" /><Text style={styles.metaText}>{format(new Date(item.created_at), 'dd MMM')}</Text></View>
            <View style={styles.metaItem}><Clock size={12} color="#94a3b8" /><Text style={styles.metaText}>{Math.floor(item.duration / 60)}m {item.duration % 60}s</Text></View>
          </View>
        </View>
        <ChevronRight size={20} color="#475569" />
      </View>
      {item.summaries?.summary && <Text style={styles.summary} numberOfLines={2}>{item.summaries.summary}</Text>}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={recordings}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchRecordings} tintColor="#7c3aed" />}
        ListEmptyComponent={!loading && <View style={styles.empty}><Text style={styles.emptyText}>No recordings yet</Text></TouchableOpacity>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a14', padding: 10 },
  item: { backgroundColor: '#12121f', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#1a1a2e' },
  itemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  itemTitle: { color: 'white', fontWeight: 'bold', fontSize: 16, flex: 1 },
  meta: { flexDirection: 'row', marginTop: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', marginRight: 12 },
  metaText: { color: '#94a3b8', fontSize: 12, marginLeft: 4 },
  summary: { color: '#94a3b8', fontSize: 13, lineHeight: 18, marginTop: 4 },
  empty: { flex: 1, alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#475569', fontSize: 16 }
});
