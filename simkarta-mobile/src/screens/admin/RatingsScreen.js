import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl, TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api';
import { colors } from '../../theme';
import DateRangePicker from '../../components/DateRangePicker';

const MEDAL = ['🥇', '🥈', '🥉'];

function RankList({ title, icon, data, color }) {
  if (!data || data.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{icon} {title}</Text>
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>Ma'lumot yo'q</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{icon} {title}</Text>
      <View style={styles.listCard}>
        {data.map((item, i) => (
          <View key={item.id} style={[styles.rankRow, i < data.length - 1 && styles.rowBorder]}>
            <Text style={styles.medal}>{MEDAL[i] || `${i + 1}.`}</Text>
            <Text style={styles.rankName} numberOfLines={1}>{item.name}</Text>
            <View style={[styles.countBadge, { backgroundColor: color + '20' }]}>
              <Text style={[styles.countText, { color }]}>{item.count} ta</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function RatingsScreen() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter]   = useState({ preset: 'all', dateFrom: null, dateTo: null });

  const fetchRatings = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter.dateFrom) params.append('date_from', filter.dateFrom);
      if (filter.dateTo)   params.append('date_to',   filter.dateTo);
      const res = await api.get(`/analytics/ratings?${params.toString()}`);
      setData(res.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useFocusEffect(useCallback(() => { fetchRatings(); }, [fetchRatings]));

  const onFilterChange = (f) => {
    setFilter(f);
    setLoading(true);
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRatings(); }} tintColor={colors.primary} />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reyting</Text>
        <Text style={styles.headerSub}>Eng ko'p sotuv bo'yicha</Text>
      </View>

      <DateRangePicker value={filter} onChange={onFilterChange} />

      <RankList
        title="Sotuvchilar"
        icon="👤"
        data={data?.sellers}
        color="#8B2FC9"
      />
      <RankList
        title="Agentlar (tochkadan sotuvlar)"
        icon="🏢"
        data={data?.agents}
        color={colors.primary}
      />
      <RankList
        title="Tochkalar"
        icon="📍"
        data={data?.points}
        color="#0066CC"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll:  { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 90 },
  center:  { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    backgroundColor: colors.primary,
    paddingTop: 52, paddingBottom: 16, paddingHorizontal: 20,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

  section:      { marginHorizontal: 16, marginTop: 16 },
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: colors.text,
    marginBottom: 8,
  },

  listCard: {
    backgroundColor: colors.white, borderRadius: 12, overflow: 'hidden',
    elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rankRow:   { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  medal:     { fontSize: 20, minWidth: 28, textAlign: 'center' },
  rankName:  { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  countBadge:{ borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  countText: { fontSize: 13, fontWeight: '700' },

  emptyBox:  { backgroundColor: colors.white, borderRadius: 12, padding: 20, alignItems: 'center' },
  emptyText: { color: colors.textSecondary, fontSize: 14 },
});
