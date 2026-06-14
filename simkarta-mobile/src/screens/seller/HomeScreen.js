import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  RefreshControl, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api';
import { getUser } from '../../auth';
import { useTheme } from '../../ThemeContext';
import { OPERATORS } from '../../theme';
import { useLogout } from '../../navigation/AppNavigator';
import DateRangePicker from '../../components/DateRangePicker';

const OP_MAP = Object.fromEntries(OPERATORS.map(o => [o.key, o]));

function todayCount(sales) {
  const todayStr = new Date().toISOString().slice(0, 10);
  return sales.filter(s => s.created_at.slice(0, 10) === todayStr).length;
}

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso) {
  const d = new Date(iso);
  const today = new Date().toISOString().slice(0, 10);
  if (iso.slice(0, 10) === today) return 'Bugun';
  return d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' });
}

export default function SellerHome({ navigation }) {
  const { theme, isDark } = useTheme();
  const logout = useLogout(navigation);

  const [stock, setStock]       = useState([]);
  const [sales, setSales]       = useState([]);
  const [user, setUser]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter]     = useState({ preset: 'all', dateFrom: null, dateTo: null });

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter.dateFrom) params.append('date_from', filter.dateFrom);
      if (filter.dateTo)   params.append('date_to',   filter.dateTo);

      const [stockRes, salesRes, u] = await Promise.all([
        api.get('/stock/me'),
        api.get(`/sales/me?${params.toString()}`),
        getUser(),
      ]);
      setStock(stockRes.data.items || []);
      setSales(salesRes.data || []);
      setUser(u);
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const totalQty   = stock.reduce((s, i) => s + i.qty, 0);
  const stockMap   = Object.fromEntries(stock.map(s => [s.operator, s.qty]));
  const todaySales = todayCount(sales);
  const firstName  = user?.full_name?.split(' ')[0] ?? '';

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ paddingBottom: 90 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
    >
      <LinearGradient colors={theme.headerGrad} style={styles.header}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Salom, {firstName}!</Text>
            <Text style={styles.headerSub}>Sotuvchi hisobingiz</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="log-out-outline" size={24} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{totalQty}</Text>
            <Text style={styles.statLabel}>Qo'limdagi</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{todaySales}</Text>
            <Text style={styles.statLabel}>Bugun sotilgan</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{sales.length}</Text>
            <Text style={styles.statLabel}>Jami sotuvlar</Text>
          </View>
        </View>
      </LinearGradient>

      <Text style={[styles.sectionTitle, { color: theme.textSub }]}>Shaxsiy zaxira</Text>
      <View style={[
        styles.stockCard,
        { backgroundColor: theme.surface },
        isDark && { borderWidth: 1, borderColor: theme.border },
        theme.card,
      ]}>
        {OPERATORS.map((op, i) => {
          const qty = stockMap[op.key] ?? 0;
          return (
            <View
              key={op.key}
              style={[
                styles.opRow,
                i < OPERATORS.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
              ]}
            >
              <View style={[styles.opBadge, { backgroundColor: op.color }]}>
                <Text style={[styles.opLabel, { color: op.text }]}>{op.label}</Text>
              </View>
              <View style={[styles.barWrap, { backgroundColor: theme.border }]}>
                <View style={[
                  styles.barFill,
                  { width: qty > 0 ? `${Math.min((qty / Math.max(totalQty, 1)) * 100, 100)}%` : '1%', backgroundColor: op.color },
                ]} />
              </View>
              <Text style={[styles.opQty, { color: qty === 0 ? theme.textMuted : theme.text }]}>{qty} ta</Text>
            </View>
          );
        })}
      </View>

      <Text style={[styles.sectionTitle, { color: theme.textSub }]}>Sotuvlar</Text>
      <DateRangePicker
        value={filter}
        onChange={(f) => { setFilter(f); setLoading(true); }}
      />

      {sales.length > 0 && (
        <View style={[
          styles.salesCard,
          { backgroundColor: theme.surface },
          isDark && { borderWidth: 1, borderColor: theme.border },
          theme.card,
        ]}>
          {sales.slice(0, 20).map((sale, i) => {
            const op = OP_MAP[sale.operator];
            return (
              <View
                key={sale.id}
                style={[
                  styles.saleRow,
                  i < Math.min(sales.length, 20) - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
                ]}
              >
                <View style={[styles.saleOpDot, { backgroundColor: op?.color || '#ccc' }]} />
                <View style={styles.saleInfo}>
                  <Text style={[styles.saleOp, { color: theme.text }]}>{op?.label || sale.operator}</Text>
                  <Text style={[styles.saleSource, { color: theme.textSub }]}>{sale.source === 'office' ? 'Ofis' : 'Tochka'}</Text>
                </View>
                <View style={styles.saleTime}>
                  <Text style={[styles.saleDate, { color: theme.textSub }]}>{formatDate(sale.created_at)}</Text>
                  <Text style={[styles.saleHour, { color: theme.textMuted }]}>{formatTime(sale.created_at)}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {sales.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={[styles.emptyText, { color: theme.text }]}>
            {filter.preset === 'all' ? "Hali sotuvlar yo'q" : "Bu davrda sotuvlar yo'q"}
          </Text>
          {filter.preset === 'all' && (
            <Text style={[styles.emptySub, { color: theme.textSub }]}>"Sotish" tabiga o'ting</Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: { paddingTop: 52, paddingBottom: 20, paddingHorizontal: 20 },
  headerRow:   { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  logoutBtn:   { marginTop: 2 },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12, padding: 14,
  },
  statBox:     { flex: 1, alignItems: 'center' },
  statNum:     { fontSize: 24, fontWeight: '800', color: '#fff' },
  statLabel:   { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2, textAlign: 'center' },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginHorizontal: 8 },

  sectionTitle: {
    fontSize: 13, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginTop: 20, marginBottom: 10, marginHorizontal: 16,
  },

  stockCard: { marginHorizontal: 16, borderRadius: 12, overflow: 'hidden' },
  opRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14 },
  opBadge:   { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, minWidth: 72, alignItems: 'center' },
  opLabel:   { fontSize: 12, fontWeight: '700' },
  barWrap:   { flex: 1, height: 6, borderRadius: 3, marginHorizontal: 12, overflow: 'hidden' },
  barFill:   { height: '100%', borderRadius: 3 },
  opQty:     { fontSize: 14, fontWeight: '600', minWidth: 44, textAlign: 'right' },

  salesCard:  { marginHorizontal: 16, borderRadius: 12, overflow: 'hidden' },
  saleRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 14 },
  saleOpDot:  { width: 12, height: 12, borderRadius: 6 },
  saleInfo:   { flex: 1, marginLeft: 12 },
  saleOp:     { fontSize: 14, fontWeight: '600' },
  saleSource: { fontSize: 12, marginTop: 1 },
  saleTime:   { alignItems: 'flex-end' },
  saleDate:   { fontSize: 12, fontWeight: '600' },
  saleHour:   { fontSize: 11, marginTop: 1 },

  empty:     { alignItems: 'center', paddingTop: 40 },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyText: { fontSize: 16, fontWeight: '600' },
  emptySub:  { fontSize: 13, marginTop: 4 },
});
