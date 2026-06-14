import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  RefreshControl, TouchableOpacity, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api';
import { colors } from '../../theme';
import DateRangePicker from '../../components/DateRangePicker';

const OP_COLOR = {
  beeline: '#FFCC00', ucell: '#8B2FC9',
  uzmobile: '#0066CC', mobiuz: '#E32119', oq: '#1a1a1a',
};
const OP_TEXT = {
  beeline: '#1a1a1a', ucell: '#fff', uzmobile: '#fff', mobiuz: '#fff', oq: '#fff',
};

function formatDt(iso) {
  const d = new Date(iso);
  const today = new Date().toISOString().slice(0, 10);
  const date  = iso.slice(0, 10) === today ? 'Bugun' : d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' });
  const time  = d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
  return `${date} ${time}`;
}

export default function PointDetailScreen({ route, navigation }) {
  const { pointId, pointName } = route.params;

  const [detail, setDetail]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter]     = useState({ preset: 'all', dateFrom: null, dateTo: null });

  const fetchDetail = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter.dateFrom) params.append('date_from', filter.dateFrom);
      if (filter.dateTo)   params.append('date_to',   filter.dateTo);
      const res = await api.get(`/points/${pointId}/detail?${params.toString()}`);
      setDetail(res.data);
    } catch (e) {
      Alert.alert('Xato', e.response?.data?.detail || 'Ma\'lumot yuklanmadi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [pointId, filter]);

  useFocusEffect(useCallback(() => { fetchDetail(); }, [fetchDetail]));

  const handleArchive = () => {
    const total = (detail?.point_stock || []).reduce((s, ps) => s + ps.qty, 0);
    const msg = total > 0
      ? `Bu tochkada ${total} ta SIM qoldig'i bor va ${detail.total_sales} ta sotuv tarixi mavjud. Baribir arxivlansinmi?`
      : `"${detail.name}" tochkasini arxivlashni xohlaysizmi?`;

    Alert.alert('Tochkani arxivlash', msg, [
      { text: 'Yo\'q', style: 'cancel' },
      {
        text: 'Ha, arxivla', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/points/${pointId}`);
            navigation.goBack();
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

  const d = detail || {};
  const stockTotal = (d.point_stock || []).reduce((s, ps) => s + ps.qty, 0);

  return (
    <View style={styles.container}>
      <FlatList
        data={d.sales || []}
        keyExtractor={s => s.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDetail(); }} tintColor={colors.primary} />}
        ListHeaderComponent={() => (
          <View>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerName}>{d.name}</Text>
              <Text style={styles.headerLocation}>📍 {d.location}</Text>
              {d.agent_name && <Text style={styles.headerAgent}>Agent: {d.agent_name}</Text>}
              {d.is_archived && (
                <View style={styles.archivedBanner}>
                  <Text style={styles.archivedBannerText}>🗂 Arxivlangan tochka</Text>
                </View>
              )}
            </View>

            {/* Statistika */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statNum}>{stockTotal}</Text>
                <Text style={styles.statLabel}>SIM qoldig'i</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statNum, { color: '#8B2FC9' }]}>{d.total_sales}</Text>
                <Text style={styles.statLabel}>Jami sotuvlar</Text>
              </View>
            </View>

            {/* Operator qoldiqlari */}
            <View style={styles.stockSection}>
              <Text style={styles.sectionTitle}>SIM qoldig'i (operator bo'yicha)</Text>
              <View style={styles.stockRow}>
                {(d.point_stock || []).map(s => (
                  <View key={s.operator} style={[styles.stockChip, { borderColor: OP_COLOR[s.operator] || '#ccc' }]}>
                    <View style={[styles.opBadge, { backgroundColor: OP_COLOR[s.operator] || '#ccc' }]}>
                      <Text style={[styles.opBadgeText, { color: OP_TEXT[s.operator] || '#fff' }]}>
                        {s.operator}
                      </Text>
                    </View>
                    <Text style={styles.stockQty}>{s.qty} ta</Text>
                  </View>
                ))}
                {(d.point_stock || []).length === 0 && (
                  <Text style={styles.noStock}>Qoldiq yo'q</Text>
                )}
              </View>
            </View>

            {/* Sana filtri */}
            <Text style={styles.sectionTitle2}>Sotuv tarixi</Text>
            <DateRangePicker
              value={filter}
              onChange={(f) => { setFilter(f); setLoading(true); }}
            />
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Bu tochkada sotuvlar yo'q</Text>
          </View>
        )}
        renderItem={({ item, index }) => {
          const prevDate = index > 0 ? d.sales[index - 1].created_at.slice(0, 10) : null;
          const showDate = index === 0 || item.created_at.slice(0, 10) !== prevDate;
          return (
            <View>
              {showDate && (
                <View style={styles.dateDivider}>
                  <View style={styles.dateLine} />
                  <Text style={styles.dateText}>
                    {item.created_at.slice(0, 10) === new Date().toISOString().slice(0, 10)
                      ? 'Bugun'
                      : new Date(item.created_at).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long' })
                    }
                  </Text>
                  <View style={styles.dateLine} />
                </View>
              )}
              <View style={styles.saleRow}>
                <View style={[styles.opBadgeSmall, { backgroundColor: OP_COLOR[item.operator] || '#ccc' }]}>
                  <Text style={[styles.opBadgeSmallText, { color: OP_TEXT[item.operator] || '#fff' }]}>
                    {item.operator}
                  </Text>
                </View>
                <View style={styles.saleInfo}>
                  <Text style={styles.saleSeller}>{item.seller_name}</Text>
                  <Text style={styles.saleSource}>{item.source === 'point' ? 'Tochkadan' : 'Ofisdan'}</Text>
                </View>
                <Text style={styles.saleTime}>
                  {new Date(item.created_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
          );
        }}
        ListFooterComponent={() => (
          !d.is_archived ? (
            <TouchableOpacity style={styles.archiveBtn} onPress={handleArchive}>
              <Text style={styles.archiveBtnText}>🗂  Tochkani arxivlash</Text>
            </TouchableOpacity>
          ) : null
        )}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    backgroundColor: colors.primary,
    paddingTop: 16, paddingBottom: 20, paddingHorizontal: 20,
  },
  headerName:     { fontSize: 20, fontWeight: '700', color: '#fff' },
  headerLocation: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  headerAgent:    { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  archivedBanner: {
    backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 4,
    alignSelf: 'flex-start', marginTop: 8,
  },
  archivedBannerText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  statsRow: { flexDirection: 'row', margin: 16, gap: 10 },
  statCard: {
    flex: 1, backgroundColor: colors.white, borderRadius: 12,
    padding: 16, alignItems: 'center',
    elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4,
  },
  statNum:   { fontSize: 28, fontWeight: '800', color: colors.primary },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 4, textAlign: 'center' },

  stockSection: { marginHorizontal: 16, marginBottom: 8 },
  sectionTitle: {
    fontSize: 12, fontWeight: '700', color: colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8,
  },
  sectionTitle2: {
    fontSize: 12, fontWeight: '700', color: colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginHorizontal: 16, marginTop: 8, marginBottom: 0,
  },
  stockRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stockChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.white, borderRadius: 10, padding: 8,
    borderWidth: 1.5,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  opBadge:     { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  opBadgeText: { fontSize: 11, fontWeight: '700' },
  stockQty:    { fontSize: 13, fontWeight: '700', color: colors.text },
  noStock:     { color: colors.textSecondary, fontSize: 14 },

  list: { paddingBottom: 30 },

  dateDivider: { flexDirection: 'row', alignItems: 'center', marginVertical: 8, marginHorizontal: 16, gap: 8 },
  dateLine:    { flex: 1, height: 1, backgroundColor: colors.border },
  dateText:    { fontSize: 12, fontWeight: '600', color: colors.textSecondary },

  saleRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.white, marginHorizontal: 16, marginBottom: 6,
    borderRadius: 10, padding: 12,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  opBadgeSmall:     { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  opBadgeSmallText: { fontSize: 11, fontWeight: '700' },
  saleInfo:   { flex: 1, marginLeft: 10 },
  saleSeller: { fontSize: 13, fontWeight: '600', color: colors.text },
  saleSource: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  saleTime:   { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },

  empty: { alignItems: 'center', paddingTop: 40 },
  emptyText: { color: colors.textSecondary, fontSize: 15 },

  archiveBtn: {
    margin: 16, marginTop: 20,
    backgroundColor: '#fff3f3', borderRadius: 10, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: '#ffcccc',
  },
  archiveBtnText: { color: '#E32119', fontWeight: '700', fontSize: 15 },
});
