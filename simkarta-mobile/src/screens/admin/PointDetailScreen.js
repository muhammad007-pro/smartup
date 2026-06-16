import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  RefreshControl, TouchableOpacity, Alert, Linking, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api';
import { useTheme } from '../../ThemeContext';
import DateRangePicker from '../../components/DateRangePicker';

const OP_COLOR = {
  beeline: '#FFCC00', ucell: '#8B2FC9',
  uzmobile: '#0066CC', mobiuz: '#E32119', oq: '#2d2d2d',
};
const OP_TEXT = {
  beeline: '#1a1a1a', ucell: '#fff', uzmobile: '#fff', mobiuz: '#fff', oq: '#fff',
};

function formatDt(iso) {
  const d = new Date(iso);
  const today = new Date().toISOString().slice(0, 10);
  const date = iso.slice(0, 10) === today ? 'Bugun' : d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' });
  const time = d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
  return `${date} ${time}`;
}

export default function PointDetailScreen({ route, navigation }) {
  const { theme, isDark } = useTheme();
  const { pointId, pointName, readOnly = false } = route.params;

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState({ preset: 'all', dateFrom: null, dateTo: null });

  const fetchDetail = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter.dateFrom) params.append('date_from', filter.dateFrom);
      if (filter.dateTo) params.append('date_to', filter.dateTo);
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
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const d = detail || {};
  const stockTotal = (d.point_stock || []).reduce((s, ps) => s + ps.qty, 0);

  const openPhone = (phone) => {
    Linking.openURL(`tel:${phone.replace(/\s/g, '')}`);
  };

  const openMap = (lat, lng, name) => {
    const url = Platform.OS === 'ios'
      ? `maps://app?daddr=${lat},${lng}`
      : `https://maps.google.com/maps?daddr=${lat},${lng}`;
    Linking.openURL(url).catch(() =>
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`)
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <FlatList
        data={d.sales || []}
        keyExtractor={s => s.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchDetail(); }}
            tintColor={theme.primary}
          />
        }
        ListHeaderComponent={() => (
          <View>
            <View style={[
              styles.infoCard,
              { backgroundColor: theme.surface },
              isDark && { borderWidth: 1, borderColor: theme.border },
            ]}>
              <Text style={[styles.infoLocation, { color: theme.textSub }]}>📍 {d.location}</Text>
              {d.agent_name && (
                <Text style={[styles.infoAgent, { color: theme.primary }]}>Agent: {d.agent_name}</Text>
              )}
              {d.phone && (
                <TouchableOpacity onPress={() => openPhone(d.phone)} style={styles.phoneRow} activeOpacity={0.75}>
                  <Ionicons name="call-outline" size={14} color={theme.primary} />
                  <Text style={[styles.phoneText, { color: theme.primary }]}>{d.phone}</Text>
                </TouchableOpacity>
              )}
              {d.lat && d.lng && (
                <TouchableOpacity onPress={() => openMap(d.lat, d.lng, d.name)} style={styles.mapRow} activeOpacity={0.75}>
                  <Ionicons name="navigate-outline" size={14} color='#0066CC' />
                  <Text style={[styles.mapText, { color: '#0066CC' }]}>Xaritada ochish / Yo'l ko'rsatish</Text>
                </TouchableOpacity>
              )}
              {d.lat && d.lng && (
                <Text style={[styles.coordsText, { color: theme.textMuted }]}>
                  {d.lat.toFixed(5)}, {d.lng.toFixed(5)}
                </Text>
              )}
              {d.is_archived && (
                <View style={styles.archivedBanner}>
                  <Text style={styles.archivedBannerText}>🗂 Arxivlangan tochka</Text>
                </View>
              )}
            </View>

            <View style={styles.statsRow}>
              <View style={[
                styles.statCard,
                { backgroundColor: theme.surface },
                isDark && { borderWidth: 1, borderColor: theme.border },
              ]}>
                <Text style={[styles.statNum, { color: theme.primary }]}>{stockTotal}</Text>
                <Text style={[styles.statLabel, { color: theme.textSub }]}>SIM qoldig'i</Text>
              </View>
              <View style={[
                styles.statCard,
                { backgroundColor: theme.surface },
                isDark && { borderWidth: 1, borderColor: theme.border },
              ]}>
                <Text style={[styles.statNum, { color: '#8B2FC9' }]}>{d.total_sales}</Text>
                <Text style={[styles.statLabel, { color: theme.textSub }]}>Jami sotuvlar</Text>
              </View>
            </View>

            <View style={styles.stockSection}>
              <Text style={[styles.sectionTitle, { color: theme.textSub }]}>SIM qoldig'i (operator bo'yicha)</Text>
              <View style={styles.stockRow}>
                {(d.point_stock || []).map(s => (
                  <View key={s.operator} style={[
                    styles.stockChip,
                    { backgroundColor: theme.surface, borderColor: OP_COLOR[s.operator] || '#ccc' },
                    isDark && { borderWidth: 1.5 },
                  ]}>
                    <View style={[styles.opBadge, { backgroundColor: OP_COLOR[s.operator] || '#ccc' }]}>
                      <Text style={[styles.opBadgeText, { color: OP_TEXT[s.operator] || '#fff' }]}>
                        {s.operator}
                      </Text>
                    </View>
                    <Text style={[styles.stockQty, { color: theme.text }]}>{s.qty} ta</Text>
                  </View>
                ))}
                {(d.point_stock || []).length === 0 && (
                  <Text style={[styles.noStock, { color: theme.textMuted }]}>Qoldiq yo'q</Text>
                )}
              </View>
            </View>

            <Text style={[styles.sectionTitle2, { color: theme.textSub }]}>Sotuv tarixi</Text>
            <DateRangePicker
              value={filter}
              onChange={(f) => { setFilter(f); setLoading(true); }}
            />
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: theme.textSub }]}>Bu tochkada sotuvlar yo'q</Text>
          </View>
        )}
        renderItem={({ item, index }) => {
          const prevDate = index > 0 ? d.sales[index - 1].created_at.slice(0, 10) : null;
          const showDate = index === 0 || item.created_at.slice(0, 10) !== prevDate;
          return (
            <View>
              {showDate && (
                <View style={styles.dateDivider}>
                  <View style={[styles.dateLine, { backgroundColor: theme.border }]} />
                  <Text style={[styles.dateText, { color: theme.textSub }]}>
                    {item.created_at.slice(0, 10) === new Date().toISOString().slice(0, 10)
                      ? 'Bugun'
                      : new Date(item.created_at).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long' })}
                  </Text>
                  <View style={[styles.dateLine, { backgroundColor: theme.border }]} />
                </View>
              )}
              <View style={[
                styles.saleRow,
                { backgroundColor: theme.surface },
                isDark && { borderWidth: 1, borderColor: theme.border },
              ]}>
                <View style={[styles.opBadgeSmall, { backgroundColor: OP_COLOR[item.operator] || '#ccc' }]}>
                  <Text style={[styles.opBadgeSmallText, { color: OP_TEXT[item.operator] || '#fff' }]}>
                    {item.operator}
                  </Text>
                </View>
                <View style={styles.saleInfo}>
                  <Text style={[styles.saleSeller, { color: theme.text }]}>{item.seller_name}</Text>
                  <Text style={[styles.saleSource, { color: theme.textSub }]}>
                    {item.source === 'point' ? 'Tochkadan' : 'Ofisdan'}
                  </Text>
                </View>
                <Text style={[styles.saleTime, { color: theme.textSub }]}>
                  {new Date(item.created_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
          );
        }}
        ListFooterComponent={() => (
          (!readOnly && !d.is_archived) ? (
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
  container: { flex: 1 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },

  infoCard: {
    marginHorizontal: 16, marginTop: 14, marginBottom: 4,
    borderRadius: 12, padding: 14,
    elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4,
  },
  infoLocation: { fontSize: 13, marginBottom: 3 },
  infoAgent:    { fontSize: 12, fontWeight: '500', marginBottom: 4 },
  phoneRow:     { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  phoneText:    { fontSize: 13, fontWeight: '600' },
  mapRow:       { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  mapText:      { fontSize: 13, fontWeight: '600' },
  coordsText:   { fontSize: 11, marginTop: 3, marginLeft: 19 },
  archivedBanner: {
    backgroundColor: 'rgba(227,33,25,0.12)', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 4,
    alignSelf: 'flex-start', marginTop: 8,
    borderWidth: 1, borderColor: 'rgba(227,33,25,0.25)',
  },
  archivedBannerText: { color: '#E32119', fontSize: 12, fontWeight: '700' },

  statsRow: { flexDirection: 'row', marginHorizontal: 16, marginTop: 12, gap: 10 },
  statCard: {
    flex: 1, borderRadius: 12, padding: 16, alignItems: 'center',
    elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4,
  },
  statNum:   { fontSize: 28, fontWeight: '800' },
  statLabel: { fontSize: 12, marginTop: 4, textAlign: 'center' },

  stockSection:  { marginHorizontal: 16, marginTop: 14, marginBottom: 8 },
  sectionTitle: {
    fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8,
  },
  sectionTitle2: {
    fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginHorizontal: 16, marginTop: 8, marginBottom: 0,
  },
  stockRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stockChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 10, padding: 8, borderWidth: 1.5,
    elevation: 1, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  opBadge:     { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  opBadgeText: { fontSize: 11, fontWeight: '700' },
  stockQty:    { fontSize: 13, fontWeight: '700' },
  noStock:     { fontSize: 14 },

  list: { paddingBottom: 30 },

  dateDivider: { flexDirection: 'row', alignItems: 'center', marginVertical: 8, marginHorizontal: 16, gap: 8 },
  dateLine:    { flex: 1, height: 1 },
  dateText:    { fontSize: 12, fontWeight: '600' },

  saleRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 6,
    borderRadius: 10, padding: 12,
    elevation: 1, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  opBadgeSmall:     { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  opBadgeSmallText: { fontSize: 11, fontWeight: '700' },
  saleInfo:   { flex: 1, marginLeft: 10 },
  saleSeller: { fontSize: 13, fontWeight: '600' },
  saleSource: { fontSize: 11, marginTop: 1 },
  saleTime:   { fontSize: 12, fontWeight: '500' },

  empty:     { alignItems: 'center', paddingTop: 40 },
  emptyText: { fontSize: 15 },

  archiveBtn: {
    margin: 16, marginTop: 20,
    backgroundColor: '#fff3f3', borderRadius: 10, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: '#ffcccc',
  },
  archiveBtnText: { color: '#E32119', fontWeight: '700', fontSize: 15 },
});
