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

export default function AgentHome({ navigation }) {
  const { theme, isDark } = useTheme();
  const logout = useLogout(navigation);

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
      const myPoints = (pointsRes.data || []).filter(p => p.agent_id === u?.id);
      setPoints(myPoints);
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const totalQty = stock.reduce((s, i) => s + i.qty, 0);
  const stockMap = Object.fromEntries(stock.map(s => [s.operator, s.qty]));
  const firstName = user?.full_name?.split(' ')[0] ?? '';

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
            <Text style={styles.headerSub}>Agent hisobingiz</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="log-out-outline" size={24} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>
        </View>
        <View style={styles.totalBadge}>
          <Text style={styles.totalNum}>{totalQty}</Text>
          <Text style={styles.totalLabel}> ta simkarta qo'lingizda</Text>
        </View>
      </LinearGradient>

      <View style={styles.summaryRow}>
        <View style={[
          styles.summaryCard,
          { backgroundColor: theme.surface },
          isDark && { borderWidth: 1, borderColor: theme.border },
          theme.card,
        ]}>
          <Text style={[styles.summaryNum, { color: theme.primary }]}>{points.length}</Text>
          <Text style={[styles.summaryLabel, { color: theme.textSub }]}>Tochkalar</Text>
        </View>
        <View style={[
          styles.summaryCard,
          { backgroundColor: theme.surface },
          isDark && { borderWidth: 1, borderColor: theme.border },
          theme.card,
        ]}>
          <Text style={[styles.summaryNum, { color: theme.primary }]}>
            {points.reduce((s, p) => s + (p.point_stock || []).reduce((a, b) => a + b.qty, 0), 0)}
          </Text>
          <Text style={[styles.summaryLabel, { color: theme.textSub }]}>Tochkalardagi qoldiq</Text>
        </View>
      </View>

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
                <View
                  style={[
                    styles.barFill,
                    { width: qty > 0 ? `${Math.min((qty / Math.max(totalQty, 1)) * 100, 100)}%` : '1%', backgroundColor: op.color },
                  ]}
                />
              </View>
              <Text style={[styles.opQty, { color: theme.text }]}>{qty} ta</Text>
            </View>
          );
        })}
      </View>

      {points.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: theme.textSub }]}>Faol tochkalar</Text>
          <View style={[
            styles.pointsList,
            { backgroundColor: theme.surface },
            isDark && { borderWidth: 1, borderColor: theme.border },
            theme.card,
          ]}>
            {points.map((p, i) => {
              const total = (p.point_stock || []).reduce((s, ps) => s + ps.qty, 0);
              return (
                <View
                  key={p.id}
                  style={[
                    styles.pointRow,
                    i < points.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
                  ]}
                >
                  <View style={[styles.pointIcon, { backgroundColor: theme.surfaceAlt }]}>
                    <Text style={styles.pointIconText}>📍</Text>
                  </View>
                  <View style={styles.pointInfo}>
                    <Text style={[styles.pointName, { color: theme.text }]}>{p.name}</Text>
                    <Text style={[styles.pointLocation, { color: theme.textSub }]}>{p.location}</Text>
                  </View>
                  <View style={styles.pointQtyBadge}>
                    <Text style={[styles.pointQtyNum, { color: theme.primary }]}>{total}</Text>
                    <Text style={[styles.pointQtyLabel, { color: theme.textSub }]}>ta</Text>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: { paddingTop: 52, paddingBottom: 24, paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  logoutBtn:   { marginTop: 2 },

  totalBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 14,
    alignSelf: 'flex-start',
  },
  totalNum:   { fontSize: 28, fontWeight: '800', color: '#fff' },
  totalLabel: { fontSize: 14, color: 'rgba(255,255,255,0.85)' },

  summaryRow:  { flexDirection: 'row', margin: 16, gap: 10 },
  summaryCard: { flex: 1, borderRadius: 12, padding: 16, alignItems: 'center' },
  summaryNum:  { fontSize: 26, fontWeight: '700' },
  summaryLabel:{ fontSize: 12, marginTop: 4, textAlign: 'center' },

  sectionTitle: {
    fontSize: 13, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginTop: 4, marginBottom: 10, marginHorizontal: 16,
  },

  stockCard:    { marginHorizontal: 16, borderRadius: 12, overflow: 'hidden' },
  opRow:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14 },
  opBadge:      { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, minWidth: 72, alignItems: 'center' },
  opLabel:      { fontSize: 12, fontWeight: '700' },
  barWrap:      { flex: 1, height: 6, borderRadius: 3, marginHorizontal: 12, overflow: 'hidden' },
  barFill:      { height: '100%', borderRadius: 3 },
  opQty:        { fontSize: 14, fontWeight: '600', minWidth: 44, textAlign: 'right' },

  pointsList:   { marginHorizontal: 16, borderRadius: 12, overflow: 'hidden' },
  pointRow:     { flexDirection: 'row', alignItems: 'center', padding: 14 },
  pointIcon:    { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  pointIconText:{ fontSize: 18 },
  pointInfo:    { flex: 1, marginLeft: 12 },
  pointName:    { fontSize: 14, fontWeight: '600' },
  pointLocation:{ fontSize: 12, marginTop: 1 },
  pointQtyBadge:{ alignItems: 'center' },
  pointQtyNum:  { fontSize: 18, fontWeight: '700' },
  pointQtyLabel:{ fontSize: 11 },
});
