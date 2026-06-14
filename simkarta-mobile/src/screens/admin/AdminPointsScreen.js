import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../api';
import { useTheme } from '../../ThemeContext';

const OP_COLOR = {
  beeline: '#FFCC00', ucell: '#8B2FC9',
  uzmobile: '#0066CC', mobiuz: '#E32119', oq: '#2d2d2d',
};
const OP_TEXT = {
  beeline: '#1a1a1a', ucell: '#fff', uzmobile: '#fff', mobiuz: '#fff', oq: '#fff',
};

function normalizePhone(str) {
  return (str || '').replace(/[\s+\-()]/g, '');
}

function matchesSearch(point, query) {
  if (!query.trim()) return true;
  const q = query.toLowerCase().trim();
  const qPhone = normalizePhone(q);
  if (point.name.toLowerCase().includes(q)) return true;
  if (point.location.toLowerCase().includes(q)) return true;
  if (point.agent_name && point.agent_name.toLowerCase().includes(q)) return true;
  if (qPhone.length >= 3 && point.agent_phone && normalizePhone(point.agent_phone).includes(qPhone)) return true;
  return false;
}

export default function AdminPointsScreen({ navigation, route }) {
  const { theme, isDark } = useTheme();
  const readOnly = route?.params?.readOnly ?? false;

  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const fetchPoints = useCallback(async () => {
    try {
      const url = readOnly ? '/points' : '/points?include_archived=true';
      const res = await api.get(url);
      setPoints(res.data);
    } catch {
      Alert.alert('Xato', 'Tochkalarni yuklashda xatolik');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [readOnly]);

  useFocusEffect(useCallback(() => { fetchPoints(); }, [fetchPoints]));

  const filtered = useMemo(
    () => points.filter(p => matchesSearch(p, search)),
    [points, search],
  );

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
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const active = points.filter(p => !p.is_archived);
  const archived = points.filter(p => p.is_archived);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <LinearGradient colors={theme.headerGrad} style={styles.header}>
        <Text style={styles.headerTitle}>Tochkalar</Text>
        <Text style={styles.headerSub}>
          {readOnly
            ? `${active.length} ta faol tochka`
            : `${active.length} faol · ${archived.length} arxiv`}
        </Text>
      </LinearGradient>

      <View style={[
        styles.searchWrap,
        { backgroundColor: theme.surface, borderColor: theme.border },
        isDark && { borderWidth: 1 },
      ]}>
        <Ionicons name="search-outline" size={18} color={theme.textMuted} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Nomi, hudud yoki telefon raqami..."
          placeholderTextColor={theme.textMuted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={18} color={theme.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {search.length > 0 && (
        <Text style={[styles.searchResult, { color: theme.textSub }]}>
          {filtered.length} ta natija topildi
        </Text>
      )}

      <FlatList
        data={filtered}
        keyExtractor={p => p.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchPoints(); }}
            tintColor={theme.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📍</Text>
            <Text style={[styles.emptyText, { color: theme.textSub }]}>
              {search.length > 0 ? 'Natija topilmadi' : 'Tochkalar yo\'q'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const total = pointTotal(item);
          return (
            <TouchableOpacity
              style={[
                styles.card,
                { backgroundColor: theme.surface },
                isDark && { borderWidth: 1, borderColor: theme.border },
                item.is_archived && styles.cardArchived,
              ]}
              onPress={() => navigation.navigate('AdminPointDetail', {
                pointId: item.id,
                pointName: item.name,
                readOnly,
              })}
              activeOpacity={0.8}
            >
              <View style={styles.cardTop}>
                <View style={styles.cardInfo}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.cardName, { color: theme.text }]}>{item.name}</Text>
                    {item.is_archived && (
                      <View style={[styles.archivedBadge, { backgroundColor: theme.surfaceAlt }]}>
                        <Text style={[styles.archivedText, { color: theme.textSub }]}>Arxiv</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.cardLocation, { color: theme.textSub }]}>📍 {item.location}</Text>
                  {item.agent_name && (
                    <Text style={[styles.cardAgent, { color: theme.primary }]}>
                      Agent: {item.agent_name}
                      {item.agent_phone ? `  ·  ${item.agent_phone}` : ''}
                    </Text>
                  )}
                </View>
                <View style={styles.totalBlock}>
                  <Text style={[styles.totalNum, { color: theme.primary }]}>{total}</Text>
                  <Text style={[styles.totalLabel, { color: theme.textSub }]}>ta SIM</Text>
                  <View style={styles.salesBadge}>
                    <Text style={styles.salesNum}>{item.total_sales} sotuv</Text>
                  </View>
                </View>
              </View>

              <View style={styles.stockRow}>
                {(item.point_stock || []).filter(s => s.qty > 0).map(s => (
                  <View key={s.operator} style={[styles.stockChip, { borderColor: OP_COLOR[s.operator] || '#ccc' }]}>
                    <View style={[styles.stockDot, { backgroundColor: OP_COLOR[s.operator] || '#ccc' }]} />
                    <Text style={[styles.stockQty, { color: theme.text }]}>{s.qty}</Text>
                  </View>
                ))}
                {(item.point_stock || []).filter(s => s.qty > 0).length === 0 && (
                  <Text style={[styles.noStock, { color: theme.textMuted }]}>Qoldiq yo'q</Text>
                )}
              </View>

              {!readOnly && !item.is_archived && (
                <TouchableOpacity style={styles.archiveBtn} onPress={() => handleArchive(item)}>
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
  container: { flex: 1 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    paddingTop: 52, paddingBottom: 18, paddingHorizontal: 20,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 12, marginBottom: 4,
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 2,
    elevation: 1,
  },
  searchIcon:   { marginRight: 8 },
  searchInput:  { flex: 1, fontSize: 14, paddingVertical: 10 },
  clearBtn:     { padding: 4 },
  searchResult: {
    fontSize: 12, fontWeight: '500',
    marginHorizontal: 20, marginBottom: 4,
  },

  list: { padding: 12, gap: 10, paddingBottom: 90 },

  card: {
    borderRadius: 12, padding: 14,
    elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4,
  },
  cardArchived: { opacity: 0.6 },

  cardTop:  { flexDirection: 'row', marginBottom: 10 },
  cardInfo: { flex: 1 },
  nameRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  cardName:     { fontSize: 15, fontWeight: '700' },
  archivedBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  archivedText:  { fontSize: 10, fontWeight: '700' },
  cardLocation:  { fontSize: 12, marginTop: 3 },
  cardAgent:     { fontSize: 11, marginTop: 2, fontWeight: '500' },

  totalBlock: { alignItems: 'flex-end' },
  totalNum:   { fontSize: 24, fontWeight: '800' },
  totalLabel: { fontSize: 11 },
  salesBadge: {
    marginTop: 4, backgroundColor: 'rgba(139,47,201,0.12)',
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  salesNum: { fontSize: 11, color: '#8B2FC9', fontWeight: '600' },

  stockRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  stockChip: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3,
  },
  stockDot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
  stockQty: { fontSize: 12, fontWeight: '600' },
  noStock:  { fontSize: 12, fontStyle: 'italic' },

  archiveBtn: {
    backgroundColor: '#fff3f3', borderRadius: 8,
    paddingVertical: 8, alignItems: 'center',
    borderWidth: 1, borderColor: '#ffcccc',
  },
  archiveBtnText: { fontSize: 12, fontWeight: '600', color: '#E32119' },

  empty:     { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 16 },
});
