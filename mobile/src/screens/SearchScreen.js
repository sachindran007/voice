import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Search as SearchIcon, X, Calendar } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { searchRecordings } from '../services/api';
import { format } from 'date-fns';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    const timer = setTimeout(() => { if (query.length > 2) performSearch(); }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  const performSearch = async () => {
    setLoading(true);
    try {
      const data = await searchRecordings(query);
      setResults(data.results || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.item} onPress={() => navigation.navigate('Detail', { id: item.id })}>
      <Text style={styles.itemTitle}>{item.title}</Text>
      <View style={styles.meta}>
        <Calendar size={12} color="#94a3b8" />
        <Text style={styles.metaText}>{format(new Date(item.created_at), 'dd MMM')}</Text>
      </View>
      {item.summary && <Text style={styles.summary} numberOfLines={2}>{item.summary}</Text>}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <SearchIcon color="#94a3b8" size={20} />
        <TextInput
          style={styles.input}
          placeholder="Search transcripts..."
          placeholderTextColor="#475569"
          value={query}
          onChangeText={setQuery}
          autoFocus
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <X color="#94a3b8" size={20} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? <ActivityIndicator color="#7c3aed" style={{ marginTop: 40 }} /> : (
        <FlatList
          data={results}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          ListEmptyComponent={query.length > 2 && <Text style={styles.emptyText}>No results found</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a14', padding: 15 },
  searchBar: { flexDirection: 'row', backgroundColor: '#12121f', borderRadius: 12, padding: 12, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#1a1a2e' },
  input: { flex: 1, color: 'white', marginLeft: 10, fontSize: 16 },
  item: { backgroundColor: '#12121f', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#1a1a2e' },
  itemTitle: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  meta: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  metaText: { color: '#94a3b8', fontSize: 12, marginLeft: 4 },
  summary: { color: '#94a3b8', fontSize: 13, marginTop: 4 },
  emptyText: { color: '#475569', textAlign: 'center', marginTop: 40 }
});
