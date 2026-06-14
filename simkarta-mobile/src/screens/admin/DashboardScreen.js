import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  RefreshControl, ActivityIndicator, StatusBar, TouchableOpacity,
} from 'react-native';
import api from '../../api';
import { getUser } from '../../auth';
import { colors } from '../../theme';

const OPERATORS = [
  { key: 'beeline',  label: 'Beeline',  color: '#FFCC00', textColor: '#1a1a1a' },
  { key: 'ucell',    label: 'Ucell',    color: '#8B2FC9', textColor: '#ffffff' },
  { key: 'uzmobile', label: 'Uzmobile', color: '#0066CC', textColor: '#ffffff' },
  { key: 'mobiuz',   label: 'Mobiuz',   color: '#E32119', textColor: '#ffffff' },
  { key: 'oq',       label: 'OQ',       color: '#1a1a1a', textColor: '#ffffff' },
];

export default function AdminDashboard({ navigation }) {
  const [data, setData]       = useState(null);
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
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
      // tarmoq xatosi — mavjud ma'lumotlar saqlanadi
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const d = data || {};

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SimKarta Admin</Text>
        <Text style={styles.headerSub}>{user?.full_name || 'Admin'}</Text>
      </View>

      {/* Statistika kartalar */}
      <Text style={styles.sectionTitle}>Umumiy statistika</Text>
      <View style={styles.statsGrid}>
        <StatCard label="Hodimlar"      value={d.total_users  ?? 0} icon="👥" accent={colors.primary}
          onPress={() => navigation.navigate('Users')} />
        <StatCard label="Tochkalar"     value={d.total_points ?? 0} icon="📍" accent="#0066CC"
          onPress={() => navigation.navigate('AdminPoints')} />
        <StatCard label="Jami sotuvlar" value={d.total_sales  ?? 0} icon="📦" accent="#8B2FC9"
          onPress={() => navigation.navigate('SalesHistory')} />
        <StatCard label="Bugun"         value={d.sales_today  ?? 0} icon="⚡" accent="#E32119"
          onPress={() => navigation.navigate('SalesHistory', { preset: 'today' })} />
      </View>

      {/* Operator qoldiqlari */}
      <Text style={styles.sectionTitle}>Operator bo'yicha qoldiq</Text>
      <View style={styles.operatorList}>
        {OPERATORS.map(op => (
          <OperatorRow
            key={op.key}
            label={op.label}
            color={op.color}
            textColor={op.textColor}
            qty={(d.stock_by_operator || {})[op.key] ?? 0}
          />
        ))}
      </View>
    </ScrollView>
  );
}

function StatCard({ label, value, icon, accent, onPress }) {
  return (
    <TouchableOpacity style={[styles.statCard, { borderTopColor: accent }]} onPress={onPress} activeOpacity={0.75}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function OperatorRow({ label, color, textColor, qty }) {
  return (
    <View style={styles.opRow}>
      <View style={[styles.opBadge, { backgroundColor: color }]}>
        <Text style={[styles.opBadgeText, { color: textColor }]}>{label}</Text>
      </View>
      <View style={styles.opBar}>
        <View style={[styles.opFill, { width: qty > 0 ? `${Math.min(qty / 2, 100)}%` : '2%', backgroundColor: color }]} />
      </View>
      <Text style={styles.opQty}>{qty} ta</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 90 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    backgroundColor: colors.primary,
    paddingTop: 52,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  headerSub:   { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 20,
    marginBottom: 10,
    marginHorizontal: 16,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    gap: 8,
  },
  statCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    width: '47%',
    marginHorizontal: '1.5%',
    borderTopWidth: 3,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    alignItems: 'center',
  },
  statIcon:  { fontSize: 24, marginBottom: 6 },
  statValue: { fontSize: 28, fontWeight: '700' },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 2, textAlign: 'center' },

  operatorList: {
    marginHorizontal: 16,
    backgroundColor: colors.white,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  opRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  opBadge: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 72,
    alignItems: 'center',
  },
  opBadgeText: { fontSize: 12, fontWeight: '700' },
  opBar: {
    flex: 1,
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  opFill:    { height: '100%', borderRadius: 3 },
  opQty:     { fontSize: 14, fontWeight: '600', color: colors.text, minWidth: 40, textAlign: 'right' },
});
