import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  RefreshControl, TouchableOpacity, Alert, Linking, Platform, Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api';
import { getUser } from '../../auth';
import { useTheme } from '../../ThemeContext';
import DateRangePicker from '../../components/DateRangePicker';

const OPERATOR_ORDER = ['beeline', 'ucell', 'uzmobile', 'mobiuz', 'oq'];

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
  const [me, setMe] = useState(null);
  const [scope, setScope] = useState('all'); // 'all' | 'mine'
  const [visits, setVisits] = useState([]);

  useEffect(() => { getUser().then(setMe); }, []);

  const fetchDetail = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter.dateFrom) params.append('date_from', filter.dateFrom);
      if (filter.dateTo) params.append('date_to', filter.dateTo);
      const [res, visitsRes] = await Promise.all([
        api.get(`/points/${pointId}/detail?${params.toString()}`),
        api.get(`/points/${pointId}/visits`),
      ]);
      setDetail(res.data);
      setVisits(visitsRes.data || []);
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

  const allSales = d.sales || [];
  const isSeller = me?.role === 'seller';
  // Sotuvchi "Mening sotuvlarim" ni tanlasa — faqat o'zining sotuvlari
  const shownSales = (isSeller && scope === 'mine')
    ? allSales.filter(s => s.seller_id === me?.id)
    : allSales;

  // Operator bo'yicha taqsimot (tanlangan sana oralig'i va scope bo'yicha)
  const byOperator = OPERATOR_ORDER
    .map(op => ({ op, count: shownSales.filter(s => s.operator === op).length }))
    .filter(x => x.count > 0);

  // Sotuvchi bo'yicha taqsimot (kim qancha) — "Hamma" ko'rinishida foydali
  const bySellerMap = {};
  shownSales.forEach(s => {
    bySellerMap[s.seller_name] = (bySellerMap[s.seller_name] || 0) + 1;
  });
  const bySeller = Object.entries(bySellerMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

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
        data={shownSales}
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
                <Text style={[styles.statNum, { color: '#8B2FC9' }]}>{shownSales.length}</Text>
                <Text style={[styles.statLabel, { color: theme.textSub }]}>
                  {isSeller && scope === 'mine' ? 'Mening sotuvlarim' : 'Jami sotuvlar'}
                </Text>
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

            {visits.length > 0 && (
              <View style={styles.visitsSection}>
                <Text style={[styles.sectionTitle, { color: theme.textSub }]}>
                  Tashriflar (SIM qo'shish isboti) · oxirgi {visits.length}
                </Text>
                {visits.map(v => (
                  <View
                    key={v.id}
                    style={[
                      styles.visitCard,
                      { backgroundColor: theme.surface },
                      isDark && { borderWidth: 1, borderColor: theme.border },
                    ]}
                  >
                    <View style={styles.visitHead}>
                      <Text style={[styles.visitAgent, { color: theme.text }]}>{v.agent_name || 'Agent'}</Text>
                      <Text style={[styles.visitDate, { color: theme.textSub }]}>{formatDt(v.created_at)}</Text>
                    </View>
                    <View style={styles.visitPhotos}>
                      {[v.photo_outside, v.photo_inside, v.photo_ad].map((url, idx) => (
                        url ? (
                          <TouchableOpacity
                            key={idx}
                            style={styles.visitThumbWrap}
                            onPress={() => Linking.openURL(url)}
                            activeOpacity={0.85}
                          >
                            <Image source={{ uri: url }} style={styles.visitThumb} />
                          </TouchableOpacity>
                        ) : (
                          <View
                            key={idx}
                            style={[styles.visitThumbWrap, styles.visitThumbEmpty, { backgroundColor: theme.surfaceAlt }]}
                          />
                        )
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            )}

            <Text style={[styles.sectionTitle2, { color: theme.textSub }]}>Sotuv tarixi</Text>

            {isSeller && (
              <View style={styles.scopeRow}>
                {[
                  { key: 'all',  label: 'Hamma sotuvchilar' },
                  { key: 'mine', label: 'Mening sotuvlarim' },
                ].map(opt => {
                  const on = scope === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      style={[
                        styles.scopeBtn,
                        { borderColor: on ? theme.primary : theme.border },
                        on && { backgroundColor: theme.primary },
                      ]}
                      onPress={() => setScope(opt.key)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.scopeText, { color: on ? '#fff' : theme.textSub }]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <DateRangePicker
              value={filter}
              onChange={(f) => { setFilter(f); setLoading(true); }}
            />

            {byOperator.length > 0 && (
              <View style={styles.breakdownRow}>
                {byOperator.map(({ op, count }) => (
                  <View
                    key={op}
                    style={[
                      styles.opCountChip,
                      { backgroundColor: theme.surface, borderColor: OP_COLOR[op] || '#ccc' },
                      isDark && { borderWidth: 1.5 },
                    ]}
                  >
                    <View style={[styles.opCountDot, { backgroundColor: OP_COLOR[op] || '#ccc' }]} />
                    <Text style={[styles.opCountText, { color: theme.text }]}>{op} · {count}</Text>
                  </View>
                ))}
              </View>
            )}

            {scope === 'all' && bySeller.length > 1 && (
              <View style={[
                styles.sellerBreakdown,
                { backgroundColor: theme.surface },
                isDark && { borderWidth: 1, borderColor: theme.border },
              ]}>
                <Text style={[styles.sellerBreakTitle, { color: theme.textSub }]}>
                  Sotuvchilar bo'yicha
                </Text>
                {bySeller.map(({ name, count }) => (
                  <View key={name} style={styles.sellerRow}>
                    <Text style={[styles.sellerName, { color: theme.text }]} numberOfLines={1}>{name}</Text>
                    <Text style={[styles.sellerCount, { color: theme.primary }]}>{count} ta</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: theme.textSub }]}>
              {isSeller && scope === 'mine'
                ? 'Siz bu tochkadan hali sotmadingiz'
                : 'Bu davrda sotuvlar yo\'q'}
            </Text>
          </View>
        )}
        renderItem={({ item, index }) => {
          const prevDate = index > 0 ? shownSales[index - 1].created_at.slice(0, 10) : null;
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

  visitsSection: { marginHorizontal: 16, marginTop: 14 },
  visitCard: {
    borderRadius: 12, padding: 12, marginBottom: 10,
    elevation: 1, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3,
  },
  visitHead: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  visitAgent: { fontSize: 13, fontWeight: '700' },
  visitDate:  { fontSize: 12 },
  visitPhotos: { flexDirection: 'row', gap: 8 },
  visitThumbWrap: { flex: 1, aspectRatio: 1, borderRadius: 8, overflow: 'hidden' },
  visitThumb: { width: '100%', height: '100%', resizeMode: 'cover' },
  visitThumbEmpty: { },

  scopeRow: { flexDirection: 'row', gap: 8, marginHorizontal: 16, marginTop: 10 },
  scopeBtn: {
    flex: 1, borderWidth: 1.5, borderRadius: 10,
    paddingVertical: 9, alignItems: 'center',
  },
  scopeText: { fontSize: 13, fontWeight: '700' },

  breakdownRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
    marginHorizontal: 16, marginTop: 4, marginBottom: 2,
  },
  opCountChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4,
  },
  opCountDot:  { width: 8, height: 8, borderRadius: 4 },
  opCountText: { fontSize: 12, fontWeight: '700' },

  sellerBreakdown: {
    marginHorizontal: 16, marginTop: 8, borderRadius: 10, padding: 12,
    elevation: 1, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3,
  },
  sellerBreakTitle: {
    fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6,
  },
  sellerRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 4,
  },
  sellerName:  { fontSize: 13, fontWeight: '600', flex: 1, marginRight: 10 },
  sellerCount: { fontSize: 13, fontWeight: '700' },

  archiveBtn: {
    margin: 16, marginTop: 20,
    backgroundColor: '#fff3f3', borderRadius: 10, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: '#ffcccc',
  },
  archiveBtnText: { color: '#E32119', fontWeight: '700', fontSize: 15 },
});
