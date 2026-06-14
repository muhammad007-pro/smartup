import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  RefreshControl, ActivityIndicator,
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

export default function AgentHome() {
  const [stock, setStock]       = useState([]);
  const [points, setPoints]     = useState([]);
  const [user, setUser]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [stockRes, pointsRes, u] = await Promise.all([
        api.get('/stock/me'),
        api.get('/points'),
        getUser(),
      ]);
      setStock(stockRes.data.items || []);
      setUser(u);
      // Faqat o'z tochkalarini ko'rsatish
      const myPoints = (pointsRes.data || []).filter(p => p.agent_id === u?.id);
      setPoints(myPoints);
    } catch {
      // tarmoq xatosi
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const totalQty = stock.reduce((s, i) => s + i.qty, 0);
  const stockMap = Object.fromEntries(stock.map(s => [s.operator, s.qty]));

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Salom, {user?.full_name?.split(' ')[0]}!</Text>
        <Text style={styles.headerSub}>Agent hisobingiz</Text>
        <View style={styles.totalBadge}>
          <Text style={styles.totalNum}>{totalQty}</Text>
          <Text style={styles.totalLabel}>ta simkarta qo'lingizda</Text>
        </View>
      </View>

      {/* Tochkalar xulosasi */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNum}>{points.length}</Text>
          <Text style={styles.summaryLabel}>Tochkalar</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNum}>
            {points.reduce((s, p) => s + (p.point_stock || []).reduce((a, b) => a + b.qty, 0), 0)}
          </Text>
          <Text style={styles.summaryLabel}>Tochkalardagi qoldiq</Text>
        </View>
      </View>

      {/* Shaxsiy zaxira */}
      <Text style={styles.sectionTitle}>Shaxsiy zaxira</Text>
      <View style={styles.stockCard}>
        {OPERATORS.map((op, i) => {
          const qty = stockMap[op.key] ?? 0;
          return (
            <View
              key={op.key}
              style={[styles.opRow, i < OPERATORS.length - 1 && styles.opRowBorder]}
            >
              <View style={[styles.opBadge, { backgroundColor: op.color }]}>
                <Text style={[styles.opLabel, { color: op.textColor }]}>{op.label}</Text>
              </View>
              <View style={styles.barWrap}>
                <View
                  style={[
                    styles.barFill,
                    { width: qty > 0 ? `${Math.min((qty / Math.max(totalQty, 1)) * 100, 100)}%` : '1%', backgroundColor: op.color },
                  ]}
                />
              </View>
              <Text style={styles.opQty}>{qty} ta</Text>
            </View>
          );
        })}
      </View>

      {/* Faol tochkalar */}
      {points.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Faol tochkalar</Text>
          <View style={styles.pointsList}>
            {points.map((p, i) => {
              const total = (p.point_stock || []).reduce((s, ps) => s + ps.qty, 0);
              return (
                <View key={p.id} style={[styles.pointRow, i < points.length - 1 && styles.pointRowBorder]}>
                  <View style={styles.pointIcon}>
                    <Text style={styles.pointIconText}>📍</Text>
                  </View>
                  <View style={styles.pointInfo}>
                    <Text style={styles.pointName}>{p.name}</Text>
                    <Text style={styles.pointLocation}>{p.location}</Text>
                  </View>
                  <View style={styles.pointQtyBadge}>
                    <Text style={styles.pointQtyNum}>{total}</Text>
                    <Text style={styles.pointQtyLabel}>ta</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll:   { flex: 1, backgroundColor: colors.background },
  content:  { paddingBottom: 90 },
  center:   { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    backgroundColor: colors.primary,
    paddingTop: 52,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  totalBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 14,
    alignSelf: 'flex-start',
    gap: 6,
  },
  totalNum:   { fontSize: 28, fontWeight: '800', color: '#fff' },
  totalLabel: { fontSize: 14, color: 'rgba(255,255,255,0.85)' },

  summaryRow: { flexDirection: 'row', margin: 16, gap: 10 },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  summaryNum:   { fontSize: 26, fontWeight: '700', color: colors.primary },
  summaryLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 4, textAlign: 'center' },

  sectionTitle: {
    fontSize: 13, fontWeight: '600', color: colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginTop: 4, marginBottom: 10, marginHorizontal: 16,
  },

  stockCard: {
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
  opRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14 },
  opRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  opBadge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, minWidth: 72, alignItems: 'center' },
  opLabel: { fontSize: 12, fontWeight: '700' },
  barWrap: { flex: 1, height: 6, backgroundColor: colors.border, borderRadius: 3, marginHorizontal: 12, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  opQty:  { fontSize: 14, fontWeight: '600', color: colors.text, minWidth: 44, textAlign: 'right' },

  pointsList: {
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
  pointRow:       { flexDirection: 'row', alignItems: 'center', padding: 14 },
  pointRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  pointIcon:      { width: 36, height: 36, borderRadius: 18, backgroundColor: '#e8f5ee', justifyContent: 'center', alignItems: 'center' },
  pointIconText:  { fontSize: 18 },
  pointInfo:      { flex: 1, marginLeft: 12 },
  pointName:      { fontSize: 14, fontWeight: '600', color: colors.text },
  pointLocation:  { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  pointQtyBadge:  { alignItems: 'center' },
  pointQtyNum:    { fontSize: 18, fontWeight: '700', color: colors.primary },
  pointQtyLabel:  { fontSize: 11, color: colors.textSecondary },
});
