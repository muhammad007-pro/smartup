import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api';
import { colors } from '../../theme';

const OP_COLOR = {
  beeline: '#FFCC00', ucell: '#8B2FC9',
  uzmobile: '#0066CC', mobiuz: '#E32119', oq: '#1a1a1a',
};

export default function AdminPointsScreen({ navigation }) {
  const [points, setPoints]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPoints = useCallback(async () => {
    try {
      const res = await api.get('/points?include_archived=true');
      setPoints(res.data);
    } catch {
      Alert.alert('Xato', 'Tochkalarni yuklashda xatolik');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchPoints(); }, [fetchPoints]));

  const pointTotal = (p) => (p.point_stock || []).reduce((s, ps) => s + ps.qty, 0);

  const handleArchive = (item) => {
    const total = pointTotal(item);
    const msg = total > 0
      ? `Bu tochkada ${total} ta SIM qoldig'i bor va sotuv tarixi mavjud. Baribir arxivlansinmi?`
      : `"${item.name}" tochkasini arxivlashni xohlaysizmi? Sotuv tarixi saqlanib qoladi.`;

    Alert.alert('Tochkani arxivlash', msg, [
      { text: 'Yo\'q', style: 'cancel' },
      {
        text: 'Ha, arxivla', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/points/${item.id}`);
            fetchPoints();
          } catch (e) {
            Alert.alert('Xato', e.response?.data?.detail || 'Arxivlab bo\'lmadi');
          }
        },
      },
    ]);
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  const active   = points.filter(p => !p.is_archived);
  const archived = points.filter(p => p.is_archived);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tochkalar</Text>
        <Text style={styles.headerSub}>{active.length} faol · {archived.length} arxiv</Text>
      </View>

      <FlatList
        data={points}
        keyExtractor={p => p.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPoints(); }} tintColor={colors.primary} />}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>Tochkalar yo'q</Text></View>}
        renderItem={({ item }) => {
          const total = pointTotal(item);
          return (
            <TouchableOpacity
              style={[styles.card, item.is_archived && styles.cardArchived]}
              onPress={() => navigation.navigate('AdminPointDetail', { pointId: item.id, pointName: item.name })}
              activeOpacity={0.8}
            >
              <View style={styles.cardTop}>
                <View style={styles.cardInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.cardName}>{item.name}</Text>
                    {item.is_archived && (
                      <View style={styles.archivedBadge}>
                        <Text style={styles.archivedText}>Arxiv</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.cardLocation}>📍 {item.location}</Text>
                  {item.agent_name && (
                    <Text style={styles.cardAgent}>Agent: {item.agent_name}</Text>
                  )}
                </View>
                <View style={styles.totalBlock}>
                  <Text style={styles.totalNum}>{total}</Text>
                  <Text style={styles.totalLabel}>ta SIM</Text>
                  <Text style={styles.salesNum}>{item.total_sales} sotuv</Text>
                </View>
              </View>

              <View style={styles.stockRow}>
                {(item.point_stock || []).filter(s => s.qty > 0).map(s => (
                  <View key={s.operator} style={[styles.stockChip, { borderColor: OP_COLOR[s.operator] || '#ccc' }]}>
                    <View style={[styles.stockDot, { backgroundColor: OP_COLOR[s.operator] || '#ccc' }]} />
                    <Text style={styles.stockQty}>{s.qty}</Text>
                  </View>
                ))}
              </View>

              {!item.is_archived && (
                <TouchableOpacity
                  style={styles.archiveBtn}
                  onPress={() => handleArchive(item)}
                >
                  <Text style={styles.archiveBtnText}>🗂 Arxivlash</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    backgroundColor: colors.primary,
    paddingTop: 52, paddingBottom: 16, paddingHorizontal: 20,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

  list: { padding: 12, gap: 10, paddingBottom: 90 },

  card: {
    backgroundColor: colors.white, borderRadius: 12, padding: 14,
    elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4,
  },
  cardArchived: { opacity: 0.6, borderLeftWidth: 3, borderLeftColor: '#aaa' },

  cardTop:    { flexDirection: 'row', marginBottom: 10 },
  cardInfo:   { flex: 1 },
  nameRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  cardName:   { fontSize: 15, fontWeight: '700', color: colors.text },
  archivedBadge: { backgroundColor: '#e0e0e0', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  archivedText:  { fontSize: 10, fontWeight: '700', color: '#888' },
  cardLocation: { fontSize: 12, color: colors.textSecondary, marginTop: 3 },
  cardAgent:    { fontSize: 11, color: colors.primary, marginTop: 2, fontWeight: '500' },

  totalBlock: { alignItems: 'flex-end' },
  totalNum:   { fontSize: 22, fontWeight: '800', color: colors.primary },
  totalLabel: { fontSize: 11, color: colors.textSecondary },
  salesNum:   { fontSize: 11, color: '#8B2FC9', fontWeight: '600', marginTop: 2 },

  stockRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  stockChip: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  stockDot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
  stockQty: { fontSize: 12, fontWeight: '600', color: colors.text },

  archiveBtn: {
    backgroundColor: '#fff3f3', borderRadius: 8,
    paddingVertical: 8, alignItems: 'center',
    borderWidth: 1, borderColor: '#ffcccc',
  },
  archiveBtnText: { fontSize: 12, fontWeight: '600', color: '#E32119' },

  empty:     { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: colors.textSecondary, fontSize: 16 },
});
