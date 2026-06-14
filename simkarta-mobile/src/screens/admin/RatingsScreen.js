import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../api';
import { useTheme } from '../../ThemeContext';
import DateRangePicker from '../../components/DateRangePicker';

const MEDAL = ['🥇', '🥈', '🥉'];
const MEDAL_ACCENT = ['#F59E0B', '#9CA3AF', '#B45309'];

function RankList({ title, icon, data, color, theme, isDark }) {
  if (!data || data.length === 0) {
    return (
      <View style={styles.section}>
        <View style={[
          styles.sectionHeader,
          { backgroundColor: theme.surface },
          isDark && { borderWidth: 1, borderColor: theme.border },
        ]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{icon}  {title}</Text>
        </View>
        <View style={[
          styles.emptyBox,
          { backgroundColor: theme.surface },
          isDark && { borderWidth: 1, borderColor: theme.border },
        ]}>
          <Text style={[styles.emptyText, { color: theme.textSub }]}>Ma'lumot yo'q</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <View style={[
        styles.sectionHeader,
        { backgroundColor: theme.surface },
        isDark && { borderWidth: 1, borderColor: theme.border },
      ]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{icon}  {title}</Text>
      </View>
      <View style={[
        styles.listCard,
        { backgroundColor: theme.surface },
        isDark && { borderWidth: 1, borderColor: theme.border },
      ]}>
        {data.map((item, i) => {
          const isTop3 = i < 3;
          const accentColor = isTop3 ? MEDAL_ACCENT[i] : null;
          return (
            <View
              key={item.id}
              style={[
                styles.rankRow,
                i < data.length - 1 && [styles.rowBorder, { borderBottomColor: theme.border }],
                isTop3 && { backgroundColor: accentColor + '10' },
                i === 0 && styles.rankRowFirst,
              ]}
            >
              {isTop3 ? (
                <Text style={[styles.medal, i === 0 && styles.medalFirst]}>{MEDAL[i]}</Text>
              ) : (
                <View style={[styles.rankNumWrap, { backgroundColor: theme.surfaceAlt }]}>
                  <Text style={[styles.rankNum, { color: theme.textSub }]}>{i + 1}</Text>
                </View>
              )}
              <Text
                style={[
                  styles.rankName,
                  { color: theme.text },
                  i === 0 && styles.rankNameFirst,
                ]}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              <View style={[styles.countBadge, { backgroundColor: color + '20' }]}>
                <Text style={[styles.countText, { color }]}>{item.count} ta</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function RatingsScreen({ route }) {
  const { theme, isDark } = useTheme();
  const sellerMode = route?.params?.sellerMode ?? false;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState({ preset: 'all', dateFrom: null, dateTo: null });

  const fetchRatings = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter.dateFrom) params.append('date_from', filter.dateFrom);
      if (filter.dateTo) params.append('date_to', filter.dateTo);
      const res = await api.get(`/analytics/ratings?${params.toString()}`);
      setData(res.data);
    } catch {
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
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: theme.bg }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchRatings(); }}
          tintColor={theme.primary}
        />
      }
    >
      <LinearGradient colors={theme.headerGrad} style={styles.header}>
        <Text style={styles.headerTitle}>Reyting</Text>
        <Text style={styles.headerSub}>Eng ko'p sotuv bo'yicha</Text>
      </LinearGradient>

      <DateRangePicker value={filter} onChange={onFilterChange} />

      {!sellerMode && (
        <>
          <RankList
            title="Sotuvchilar"
            icon="👤"
            data={data?.sellers}
            color="#8B2FC9"
            theme={theme}
            isDark={isDark}
          />
          <RankList
            title="Agentlar (tochkadan sotuvlar)"
            icon="🏢"
            data={data?.agents}
            color={theme.primary}
            theme={theme}
            isDark={isDark}
          />
        </>
      )}
      <RankList
        title="Tochkalar reytingi"
        icon="📍"
        data={data?.points}
        color="#0066CC"
        theme={theme}
        isDark={isDark}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll:  { flex: 1 },
  content: { paddingBottom: 90 },
  center:  { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    paddingTop: 52, paddingBottom: 18, paddingHorizontal: 20,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

  section: { marginHorizontal: 16, marginTop: 16 },

  sectionHeader: {
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: 6,
    elevation: 1, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700' },

  listCard: {
    borderRadius: 12, overflow: 'hidden',
    elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4,
  },
  rowBorder:     { borderBottomWidth: 1 },
  rankRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  rankRowFirst:  { paddingVertical: 16 },
  medal:         { fontSize: 20, minWidth: 30, textAlign: 'center' },
  medalFirst:    { fontSize: 24 },
  rankNumWrap:   { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rankNum:       { fontSize: 12, fontWeight: '700' },
  rankName:      { flex: 1, fontSize: 14, fontWeight: '600' },
  rankNameFirst: { fontSize: 15, fontWeight: '700' },
  countBadge:    { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  countText:     { fontSize: 13, fontWeight: '700' },

  emptyBox:  { borderRadius: 12, padding: 24, alignItems: 'center' },
  emptyText: { fontSize: 14 },
});
