import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import api from '../../api';
import { colors } from '../../theme';

const OPERATORS = [
  { key: 'beeline',  label: 'Beeline',  color: '#FFCC00', textColor: '#1a1a1a' },
  { key: 'ucell',    label: 'Ucell',    color: '#8B2FC9', textColor: '#ffffff' },
  { key: 'uzmobile', label: 'Uzmobile', color: '#0066CC', textColor: '#ffffff' },
  { key: 'mobiuz',   label: 'Mobiuz',   color: '#E32119', textColor: '#ffffff' },
  { key: 'oq',       label: 'OQ',       color: '#1a1a1a', textColor: '#ffffff' },
];

export default function SellScreen() {
  const [mode, setMode]           = useState('office'); // 'office' | 'point'
  const [stock, setStock]         = useState([]);
  const [points, setPoints]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedOp, setSelectedOp]     = useState(null);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [selling, setSelling]           = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [stockRes, pointsRes] = await Promise.all([
        api.get('/stock/me'),
        api.get('/points'),
      ]);
      setStock(stockRes.data.items || []);
      setPoints(pointsRes.data || []);
    } catch {
      Alert.alert('Xato', 'Ma\'lumotlarni yuklashda xatolik');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    setSelectedOp(null);
    setSelectedPoint(null);
    fetchData();
  };

  const switchMode = (m) => {
    setMode(m);
    setSelectedOp(null);
    setSelectedPoint(null);
  };

  const stockQty = (opKey) => (stock.find(s => s.operator === opKey)?.qty ?? 0);
  const pointStockQty = (point, opKey) => (point?.point_stock || []).find(s => s.operator === opKey)?.qty ?? 0;

  const handleSell = async () => {
    if (!selectedOp) {
      Alert.alert('Xato', 'Operator tanlang');
      return;
    }
    if (mode === 'point' && !selectedPoint) {
      Alert.alert('Xato', 'Tochka tanlang');
      return;
    }

    setSelling(true);
    try {
      if (mode === 'office') {
        await api.post('/sales/office', { operator: selectedOp });
        Alert.alert('✅ Sotildi', `${OPERATORS.find(o => o.key === selectedOp)?.label} — ofisdan`);
      } else {
        await api.post('/sales/point', { point_id: selectedPoint.id, operator: selectedOp });
        Alert.alert('✅ Sotildi', `${OPERATORS.find(o => o.key === selectedOp)?.label} — ${selectedPoint.name}`);
      }
      setSelectedOp(null);
      setSelectedPoint(null);
      fetchData();
    } catch (e) {
      Alert.alert('Xato', e.response?.data?.detail || 'Sotib bo\'lmadi');
    } finally {
      setSelling(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  const canSell = selectedOp && (mode === 'office' || selectedPoint);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sotish</Text>
        <Text style={styles.headerSub}>1 ta simkarta sotish</Text>
      </View>

      {/* Rejim tanlash */}
      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'office' && styles.modeBtnActive]}
          onPress={() => switchMode('office')}
        >
          <Text style={[styles.modeBtnText, mode === 'office' && styles.modeBtnTextActive]}>🏢 Ofis</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'point' && styles.modeBtnActive]}
          onPress={() => switchMode('point')}
        >
          <Text style={[styles.modeBtnText, mode === 'point' && styles.modeBtnTextActive]}>📍 Tochka</Text>
        </TouchableOpacity>
      </View>

      {/* Tochka tanlash (faqat "Tochka" rejimida) */}
      {mode === 'point' && (
        <>
          <Text style={styles.sectionLabel}>Tochka tanlang</Text>
          {points.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>Tochkalar yo'q</Text>
            </View>
          ) : (
            <View style={styles.listCard}>
              {points.map((p, i) => {
                const total = (p.point_stock || []).reduce((s, ps) => s + ps.qty, 0);
                const isSelected = selectedPoint?.id === p.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[
                      styles.pointRow,
                      i < points.length - 1 && styles.rowBorder,
                      isSelected && styles.pointRowActive,
                    ]}
                    onPress={() => { setSelectedPoint(p); setSelectedOp(null); }}
                  >
                    <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                      {isSelected && <View style={styles.radioDot} />}
                    </View>
                    <View style={styles.pointInfo}>
                      <Text style={[styles.pointName, isSelected && { color: colors.primary }]}>{p.name}</Text>
                      <Text style={styles.pointLoc}>{p.location}</Text>
                    </View>
                    <Text style={styles.pointTotal}>{total} ta</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </>
      )}

      {/* Operator tanlash */}
      <Text style={styles.sectionLabel}>Operator tanlang</Text>
      <View style={styles.listCard}>
        {OPERATORS.map((op, i) => {
          const qty = mode === 'office'
            ? stockQty(op.key)
            : (selectedPoint ? pointStockQty(selectedPoint, op.key) : null);
          const available = qty === null ? null : qty > 0;
          const isSelected = selectedOp === op.key;
          const disabled = available === false;

          return (
            <TouchableOpacity
              key={op.key}
              style={[
                styles.opRow,
                i < OPERATORS.length - 1 && styles.rowBorder,
                isSelected && styles.opRowActive,
                disabled && styles.opRowDisabled,
              ]}
              onPress={() => !disabled && setSelectedOp(op.key)}
              disabled={disabled}
            >
              <View style={[styles.opBadge, { backgroundColor: disabled ? '#ddd' : op.color }]}>
                <Text style={[styles.opBadgeText, { color: disabled ? '#aaa' : op.textColor }]}>
                  {op.label}
                </Text>
              </View>
              <View style={styles.opMeta}>
                {qty !== null && (
                  <Text style={[styles.opStock, disabled && { color: colors.border }]}>
                    {qty} ta mavjud
                  </Text>
                )}
                {disabled && <Text style={styles.opEmpty}>Qoldiq yo'q</Text>}
              </View>
              <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                {isSelected && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Sotish tugmasi */}
      <TouchableOpacity
        style={[styles.sellBtn, !canSell && styles.sellBtnDisabled]}
        onPress={handleSell}
        disabled={!canSell || selling}
      >
        {selling
          ? <ActivityIndicator color="#fff" />
          : (
            <Text style={styles.sellBtnText}>
              {canSell
                ? `✓ Sotish — ${OPERATORS.find(o => o.key === selectedOp)?.label}`
                : 'Operator tanlang'}
            </Text>
          )
        }
      </TouchableOpacity>

      {/* Eslatma */}
      <Text style={styles.hint}>
        {mode === 'office'
          ? 'Ofis rejimi: shaxsiy zaxiradan 1 ta simkarta sotiladi'
          : 'Tochka rejimi: tanlangan tochkadan 1 ta simkarta sotiladi'}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll:  { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 40 },
  center:  { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    backgroundColor: colors.primary,
    paddingTop: 52, paddingBottom: 20, paddingHorizontal: 20,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

  modeRow: { flexDirection: 'row', margin: 16, gap: 10 },
  modeBtn: {
    flex: 1, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 10, paddingVertical: 12, alignItems: 'center',
    backgroundColor: colors.white,
  },
  modeBtnActive:     { borderColor: colors.primary, backgroundColor: '#e8f5ee' },
  modeBtnText:       { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  modeBtnTextActive: { color: colors.primary },

  sectionLabel: {
    fontSize: 13, fontWeight: '600', color: colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: 8, marginHorizontal: 16,
  },

  listCard: {
    marginHorizontal: 16, marginBottom: 16, backgroundColor: colors.white,
    borderRadius: 12, overflow: 'hidden', elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4,
  },

  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },

  pointRow: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
  },
  pointRowActive: { backgroundColor: '#f0faf5' },
  pointInfo: { flex: 1, marginLeft: 12 },
  pointName: { fontSize: 14, fontWeight: '600', color: colors.text },
  pointLoc:  { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  pointTotal:{ fontSize: 13, fontWeight: '600', color: colors.primary },

  opRow: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
  },
  opRowActive:   { backgroundColor: '#f0faf5' },
  opRowDisabled: { opacity: 0.5 },
  opBadge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5, minWidth: 72, alignItems: 'center' },
  opBadgeText: { fontSize: 12, fontWeight: '700' },
  opMeta:  { flex: 1, marginLeft: 12 },
  opStock: { fontSize: 13, fontWeight: '500', color: colors.text },
  opEmpty: { fontSize: 12, color: colors.border },

  radioCircle: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  radioCircleActive: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },

  emptyBox:  { marginHorizontal: 16, marginBottom: 16, padding: 20, backgroundColor: colors.white, borderRadius: 12, alignItems: 'center' },
  emptyText: { color: colors.textSecondary },

  sellBtn: {
    marginHorizontal: 16, marginTop: 4, marginBottom: 12,
    backgroundColor: colors.primary, borderRadius: 12,
    padding: 16, alignItems: 'center',
    elevation: 3, shadowColor: colors.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6,
  },
  sellBtnDisabled: { backgroundColor: colors.border, elevation: 0, shadowOpacity: 0 },
  sellBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  hint: { textAlign: 'center', fontSize: 12, color: colors.textSecondary, marginHorizontal: 20 },
});
