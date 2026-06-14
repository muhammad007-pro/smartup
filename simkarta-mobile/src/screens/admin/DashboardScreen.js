import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  RefreshControl, ActivityIndicator, StatusBar, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../api';
import { getUser } from '../../auth';
import { useTheme } from '../../ThemeContext';
import { OPERATORS } from '../../theme';
import AnimatedPressable from '../../components/AnimatedPressable';
import { useLogout } from '../../navigation/AppNavigator';

const STAT_ACCENTS = ['#1b8a5a', '#0066CC', '#8B2FC9', '#E32119'];

export default function AdminDashboard({ navigation }) {
  const { theme, isDark, toggleDark } = useTheme();
  const logout = useLogout(navigation);

  const [data, setData]           = useState(null);
  const [user, setUser]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [res, u] = await Promise.all([
        api.get('/dashboard'),
        getUser(),
      ]);
      setData(res.data);
      setUser(u);
    } catch (e) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const d = data || {};

  const stats = [
    { label: 'Hodimlar',      value: d.total_users  ?? 0, icon: 'people',         screen: 'Users',        params: undefined },
    { label: 'Tochkalar',     value: d.total_points ?? 0, icon: 'location',       screen: 'AdminPoints',  params: undefined },
    { label: 'Jami sotuvlar', value: d.total_sales  ?? 0, icon: 'bag-handle',     screen: 'SalesHistory', params: undefined },
    { label: 'Bugun',         value: d.sales_today  ?? 0, icon: 'flash',          screen: 'SalesHistory', params: { preset: 'today' } },
  ];

  const cardBase = isDark
    ? { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }
    : { backgroundColor: theme.surface, ...theme.card };

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={theme.headerGrad} style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>SimKarta Admin</Text>
            <Text style={styles.headerSub}>{user?.full_name || 'Admin'}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconBtn} onPress={toggleDark} activeOpacity={0.75}>
              <Ionicons
                name={isDark ? 'sunny-outline' : 'moon-outline'}
                size={20}
                color="#fff"
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={logout} activeOpacity={0.75}>
              <Ionicons name="log-out-outline" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.opLegend}>
          {OPERATORS.map(op => (
            <View key={op.key} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: op.color }]} />
              <Text style={styles.legendLabel}>{op.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionTitle, { color: theme.textSub }]}>Umumiy statistika</Text>
        <View style={styles.statsGrid}>
          {stats.map((s, i) => (
            <AnimatedPressable
              key={s.label}
              style={[styles.statCard, cardBase, { borderTopColor: STAT_ACCENTS[i] }]}
              onPress={() => navigation.navigate(s.screen, s.params)}
            >
              <View style={[styles.statIconWrap, { backgroundColor: STAT_ACCENTS[i] + '18' }]}>
                <Ionicons name={s.icon + '-outline'} size={22} color={STAT_ACCENTS[i]} />
              </View>
              <Text style={[styles.statValue, { color: STAT_ACCENTS[i] }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: theme.textSub }]}>{s.label}</Text>
            </AnimatedPressable>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: theme.textSub }]}>Operator bo'yicha qoldiq</Text>
        <View style={[
          styles.operatorCard,
          isDark
            ? { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }
            : { backgroundColor: theme.surface, ...theme.card },
        ]}>
          {OPERATORS.map((op, idx) => {
            const qty = (d.stock_by_operator || {})[op.key] ?? 0;
            const maxBar = Math.max(...OPERATORS.map(o => (d.stock_by_operator || {})[o.key] ?? 0), 1);
            const pct = qty > 0 ? Math.max((qty / maxBar) * 100, 4) : 2;
            return (
              <View
                key={op.key}
                style={[
                  styles.opRow,
                  { borderBottomColor: theme.border },
                  idx === OPERATORS.length - 1 && styles.opRowLast,
                ]}
              >
                <View style={[styles.opBadge, { backgroundColor: op.color }]}>
                  <Text style={[styles.opBadgeText, { color: op.text }]}>{op.label}</Text>
                </View>
                <View style={[styles.opBar, { backgroundColor: theme.border }]}>
                  <View style={[styles.opFill, { width: `${pct}%`, backgroundColor: op.color }]} />
                </View>
                <Text style={[styles.opQty, { color: theme.text }]}>{qty} ta</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: 52,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  headerSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 2,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  opLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 14,
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingTop: 8,
    paddingBottom: 90,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 10,
    marginHorizontal: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 10,
  },
  statCard: {
    borderRadius: 14,
    padding: 16,
    width: '47%',
    borderTopWidth: 3,
    alignItems: 'center',
  },
  statIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 34,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
  operatorCard: {
    marginHorizontal: 16,
    borderRadius: 14,
    overflow: 'hidden',
  },
  opRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  opRowLast: {
    borderBottomWidth: 0,
  },
  opBadge: {
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 74,
    alignItems: 'center',
  },
  opBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  opBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  opFill: {
    height: '100%',
    borderRadius: 3,
  },
  opQty: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 44,
    textAlign: 'right',
  },
});
