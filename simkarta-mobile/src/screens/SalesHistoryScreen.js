import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import api from '../api';
import { getToken } from '../auth';
import { useTheme } from '../ThemeContext';
import DateRangePicker from '../components/DateRangePicker';

const BASE_URL = 'https://smartup-production.up.railway.app';
const PAGE = 25;

const OP_COLOR = {
  beeline: '#FFCC00', ucell: '#8B2FC9',
  uzmobile: '#0066CC', mobiuz: '#E32119', oq: '#2d2d2d',
};
const OP_TEXT = {
  beeline: '#1a1a1a', ucell: '#fff', uzmobile: '#fff', mobiuz: '#fff', oq: '#fff',
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
  const [items,       setItems]       = useState([]);
  const [total,       setTotal]       = useState(0);
  const [hasMore,     setHasMore]     = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing,  setRefreshing]  = useState(false);
  const [exporting,   setExporting]   = useState(false);

  // Cursor ref to track current position without stale closures
  const skipRef = useRef(0);

  const fetchSales = useCallback(async (reset = false) => {
    const skip = reset ? 0 : skipRef.current;
    if (reset) { setLoading(true); skipRef.current = 0; }
    else { setLoadingMore(true); }

    try {
      const params = { skip, limit: PAGE };
      if (dateFilter.dateFrom) params.date_from = dateFilter.dateFrom;
      if (dateFilter.dateTo)   params.date_to   = dateFilter.dateTo;
      const endpoint = sellerMode ? '/sales/me' : '/sales';
      const res = await api.get(endpoint, { params });
      const data = res.data;
      const newItems = data.items || [];

      if (reset) {
        setItems(newItems);
      } else {
        setItems(prev => [...prev, ...newItems]);
      }
      skipRef.current = skip + newItems.length;
      setTotal(data.total || 0);
      setHasMore(data.has_more || false);
    } catch {
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [dateFilter, sellerMode]);

  useFocusEffect(useCallback(() => {
    fetchSales(true);
  }, [fetchSales]));

  const onRefresh = () => { setRefreshing(true); fetchSales(true); };
  const onEndReached = () => { if (hasMore && !loadingMore && !loading) fetchSales(false); };

  const handleFilterChange = (f) => { setDateFilter(f); };

  // Excel export (admin only)
  const handleExport = async () => {
    setExporting(true);
    try {
      const token = await getToken();
      const params = [];
      if (dateFilter.dateFrom) params.push(`date_from=${dateFilter.dateFrom}`);
      if (dateFilter.dateTo)   params.push(`date_to=${dateFilter.dateTo}`);
      const qs = params.length ? `?${params.join('&')}` : '';
      const url = `${BASE_URL}/export/sales${qs}`;
      const fileUri = FileSystem.documentDirectory + 'sotuvlar.xlsx';
      const res = await FileSystem.downloadAsync(url, fileUri, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status !== 200) throw new Error('Server xatosi');
      await Sharing.shareAsync(res.uri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Sotuvlar hisoboti',
        UTI: 'com.microsoft.excel.xlsx',
      });
    } catch (e) {
      Alert.alert('Xato', e.message || 'Eksport muvaffaqiyatsiz');
    } finally {
      setExporting(false);
    }
  };

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
        style={[styles.row, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}
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
          <Text style={[styles.srcText, { color: theme.textSub }]}>
            {item.source === 'point' ? 'Tochka' : 'Ofis'}
          </Text>
        </View>
        {item.point_id && <Text style={[styles.chevron, { color: theme.textSub }]}>›</Text>}
      </TouchableOpacity>
    );
  };

  const ListFooter = () => {
    if (loadingMore) {
      return (
        <View style={styles.footer}>
          <ActivityIndicator size="small" color={theme.primary} />
        </View>
      );
    }
    if (!hasMore && items.length > 0) {
      return (
        <Text style={[styles.footerText, { color: theme.textMuted }]}>
          Barchasi yuklandi ({total} ta)
        </Text>
      );
    }
    return null;
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <LinearGradient colors={theme.headerGrad} style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            {navigation.canGoBack() && (
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.75}>
                <Ionicons name="arrow-back" size={22} color="#fff" />
              </TouchableOpacity>
            )}
            <View>
              <Text style={styles.headerTitle}>
                {sellerMode ? 'Sotuvlarim' : 'Barcha sotuvlar'}
              </Text>
              {total > 0 && (
                <Text style={styles.headerSub}>{total} ta sotuv</Text>
              )}
            </View>
          </View>
          {!sellerMode && (
            <TouchableOpacity
              style={styles.exportBtn}
              onPress={handleExport}
              disabled={exporting}
              activeOpacity={0.8}
            >
              {exporting
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="download-outline" size={20} color="#fff" />
              }
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      <DateRangePicker value={dateFilter} onChange={handleFilterChange} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={s => s.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
          }
          ListFooterComponent={<ListFooter />}
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
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  exportBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },

  list: { paddingBottom: 90 },

  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  opBadge:    { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5, minWidth: 68, alignItems: 'center' },
  opText:     { fontSize: 11, fontWeight: '700' },
  rowInfo:    { flex: 1 },
  sellerName: { fontSize: 13, fontWeight: '600' },
  pointName:  { fontSize: 12, marginTop: 1 },
  rowDate:    { fontSize: 11, marginTop: 2 },
  sourceBadge:{ borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  srcText:    { fontSize: 10, fontWeight: '600' },
  chevron:    { fontSize: 20, marginLeft: 2 },

  footer:     { paddingVertical: 20, alignItems: 'center' },
  footerText: { textAlign: 'center', fontSize: 12, paddingVertical: 16 },

  empty:     { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyText: { fontSize: 16 },
});
