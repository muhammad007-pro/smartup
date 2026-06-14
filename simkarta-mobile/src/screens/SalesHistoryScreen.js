import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../api';
import { useTheme } from '../ThemeContext';
import DateRangePicker from '../components/DateRangePicker';

const OP_COLOR = {
  beeline:  '#FFCC00',
  ucell:    '#8B2FC9',
  uzmobile: '#0066CC',
  mobiuz:   '#E32119',
  oq:       '#2d2d2d',
};
const OP_TEXT = {
  beeline: '#1a1a1a',
  ucell: '#fff', uzmobile: '#fff', mobiuz: '#fff', oq: '#fff',
};

function pad(n) { return String(n).padStart(2, '0'); }
function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function presetToRange(key) {
  const now = new Date();
  const toISO = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const today = toISO(now);
  if (key === 'today') return { dateFrom: today, dateTo: today };
  if (key === 'week') {
    const dow = now.getDay() || 7;
    const mon = new Date(now); mon.setDate(now.getDate() - dow + 1);
    return { dateFrom: toISO(mon), dateTo: today };
  }
  if (key === 'month') {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    return { dateFrom: toISO(first), dateTo: today };
  }
  return { dateFrom: null, dateTo: null };
}

export default function SalesHistoryScreen({ navigation, route }) {
  const { theme, isDark } = useTheme();

  const sellerMode    = route?.params?.sellerMode ?? false;
  const initialPreset = route?.params?.preset     ?? 'all';

  const [dateFilter, setDateFilter] = useState(() => ({
    preset: initialPreset,
    ...presetToRange(initialPreset),
  }));
  const [sales,   setSales]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSales = useCallback(async () => {
    try {
      const params = {};
      if (dateFilter.dateFrom) params.date_from = dateFilter.dateFrom;
      if (dateFilter.dateTo)   params.date_to   = dateFilter.dateTo;

      const endpoint = sellerMode ? '/sales/me' : '/sales';
      const res = await api.get(endpoint, { params });
      setSales(res.data || []);
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateFilter, sellerMode]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchSales();
    }, [fetchSales])
  );

  const onRefresh = () => { setRefreshing(true); fetchSales(); };

  const openPoint = (sale) => {
    if (!sale.point_id) return;
    navigation.navigate('AdminPointDetail', {
      pointId: sale.point_id,
      pointName: sale.point_name || 'Tochka',
      readOnly: true,
    });
  };

  const renderItem = ({ item }) => {
    const bg = OP_COLOR[item.operator] || '#999';
    const tc = OP_TEXT[item.operator]  || '#fff';
    return (
      <TouchableOpacity
        style={[
          styles.row,
          { backgroundColor: theme.surface, borderBottomColor: theme.border },
        ]}
        onPress={() => openPoint(item)}
        activeOpacity={item.point_id ? 0.7 : 1}
      >
        <View style={[styles.opBadge, { backgroundColor: bg }]}>
          <Text style={[styles.opText, { color: tc }]}>{item.operator?.toUpperCase()}</Text>
        </View>
        <View style={styles.rowInfo}>
          {!sellerMode && item.seller_name && (
            <Text style={[styles.sellerName, { color: theme.text }]}>{item.seller_name}</Text>
          )}
          <Text style={[styles.pointName, { color: theme.textSub }]} numberOfLines={1}>
            {item.point_name ? `📍 ${item.point_name}` : 'Ofis'}
          </Text>
          <Text style={[styles.rowDate, { color: theme.textMuted }]}>{fmtDate(item.created_at)}</Text>
        </View>
        <View style={[
          styles.sourceBadge,
          item.source === 'point'
            ? { backgroundColor: isDark ? theme.surfaceAlt : '#e8f5ee' }
            : { backgroundColor: isDark ? theme.surfaceAlt : '#f0f0f0' },
        ]}>
          <Text style={[styles.srcText, { color: theme.textSub }]}>{item.source === 'point' ? 'Tochka' : 'Ofis'}</Text>
        </View>
        {item.point_id && (
          <Text style={[styles.chevron, { color: theme.textSub }]}>›</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <LinearGradient colors={theme.headerGrad} style={styles.header}>
        <Text style={styles.headerTitle}>{sellerMode ? 'Sotuvlarim' : 'Barcha sotuvlar'}</Text>
      </LinearGradient>

      <DateRangePicker value={dateFilter} onChange={setDateFilter} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={sales}
          keyExtractor={s => s.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
          ListHeaderComponent={
            <Text style={[styles.count, { color: theme.textSub }]}>{sales.length} ta sotuv</Text>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={[styles.emptyText, { color: theme.textSub }]}>Sotuvlar yo'q</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: { paddingTop: 52, paddingBottom: 16, paddingHorizontal: 20 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },

  count: { fontSize: 12, fontWeight: '600', paddingHorizontal: 16, paddingVertical: 6 },
  list:  { paddingBottom: 90 },

  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  opBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5, minWidth: 68, alignItems: 'center' },
  opText:  { fontSize: 11, fontWeight: '700' },
  rowInfo: { flex: 1 },
  sellerName: { fontSize: 13, fontWeight: '600' },
  pointName:  { fontSize: 12, marginTop: 1 },
  rowDate:    { fontSize: 11, marginTop: 2 },

  sourceBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  srcText:     { fontSize: 10, fontWeight: '600' },

  chevron: { fontSize: 20, marginLeft: 2 },

  empty:     { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyText: { fontSize: 16 },
});
