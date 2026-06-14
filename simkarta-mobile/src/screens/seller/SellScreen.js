import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../api';
import { useTheme } from '../../ThemeContext';
import { OPERATORS } from '../../theme';

export default function SellScreen() {
  const { theme, isDark } = useTheme();

  const [mode, setMode]             = useState('office');
  const [stock, setStock]           = useState([]);
  const [points, setPoints]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedOp, setSelectedOp]       = useState(null);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [selling, setSelling]             = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [stockRes, pointsRes] = await Promise.all([
        api.get('/stock/me'),
        api.get('/points'),
      ]);
      setStock(stockRes.data.items || []);
      setPoints(pointsRes.data || []);
    } catch {
      Alert.alert('Xato', "Ma'lumotlarni yuklashda xatolik");
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
        Alert.alert('Sotildi', `${OPERATORS.find(o => o.key === selectedOp)?.label} — ofisdan`);
      } else {
        await api.post('/sales/point', { point_id: selectedPoint.id, operator: selectedOp });
        Alert.alert('Sotildi', `${OPERATORS.find(o => o.key === selectedOp)?.label} — ${selectedPoint.name}`);
      }
      setSelectedOp(null);
      setSelectedPoint(null);
      fetchData();
    } catch (e) {
      Alert.alert('Xato', e.response?.data?.detail || "Sotib bo'lmadi");
    } finally {
      setSelling(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const canSell = selectedOp && (mode === 'office' || selectedPoint);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ paddingBottom: 90 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
    >
      <LinearGradient colors={theme.headerGrad} style={styles.header}>
        <Text style={styles.headerTitle}>Sotish</Text>
        <Text style={styles.headerSub}>1 ta simkarta sotish</Text>
      </LinearGradient>

      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[
            styles.modeBtn,
            { borderColor: theme.border, backgroundColor: theme.surface },
            mode === 'office' && { borderColor: theme.primary, backgroundColor: isDark ? theme.surfaceAlt : '#e8f5ee' },
          ]}
          onPress={() => switchMode('office')}
        >
          <Text style={[
            styles.modeBtnText,
            { color: theme.textSub },
            mode === 'office' && { color: theme.primary },
          ]}>Ofis</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.modeBtn,
            { borderColor: theme.border, backgroundColor: theme.surface },
            mode === 'point' && { borderColor: theme.primary, backgroundColor: isDark ? theme.surfaceAlt : '#e8f5ee' },
          ]}
          onPress={() => switchMode('point')}
        >
          <Text style={[
            styles.modeBtnText,
            { color: theme.textSub },
            mode === 'point' && { color: theme.primary },
          ]}>Tochka</Text>
        </TouchableOpacity>
      </View>

      {mode === 'point' && (
        <>
          <Text style={[styles.sectionLabel, { color: theme.textSub }]}>Tochka tanlang</Text>
          {points.length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: theme.surface }, isDark && { borderWidth: 1, borderColor: theme.border }]}>
              <Text style={[styles.emptyText, { color: theme.textSub }]}>Tochkalar yo'q</Text>
            </View>
          ) : (
            <View style={[
              styles.listCard,
              { backgroundColor: theme.surface },
              isDark && { borderWidth: 1, borderColor: theme.border },
              theme.card,
            ]}>
              {points.map((p, i) => {
                const total = (p.point_stock || []).reduce((s, ps) => s + ps.qty, 0);
                const isSelected = selectedPoint?.id === p.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[
                      styles.pointRow,
                      i < points.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
                      isSelected && { backgroundColor: isDark ? theme.surfaceAlt : '#f0faf5' },
                    ]}
                    onPress={() => { setSelectedPoint(p); setSelectedOp(null); }}
                  >
                    <View style={[
                      styles.radioCircle,
                      { borderColor: theme.border },
                      isSelected && { borderColor: theme.primary },
                    ]}>
                      {isSelected && <View style={[styles.radioDot, { backgroundColor: theme.primary }]} />}
                    </View>
                    <View style={styles.pointInfo}>
                      <Text style={[styles.pointName, { color: isSelected ? theme.primary : theme.text }]}>{p.name}</Text>
                      <Text style={[styles.pointLoc, { color: theme.textSub }]}>{p.location}</Text>
                    </View>
                    <Text style={[styles.pointTotal, { color: theme.primary }]}>{total} ta</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </>
      )}

      <Text style={[styles.sectionLabel, { color: theme.textSub }]}>Operator tanlang</Text>
      <View style={[
        styles.listCard,
        { backgroundColor: theme.surface },
        isDark && { borderWidth: 1, borderColor: theme.border },
        theme.card,
      ]}>
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
                i < OPERATORS.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
                isSelected && { backgroundColor: isDark ? theme.surfaceAlt : '#f0faf5' },
                disabled && styles.opRowDisabled,
              ]}
              onPress={() => !disabled && setSelectedOp(op.key)}
              disabled={disabled}
            >
              <View style={[styles.opBadge, { backgroundColor: disabled ? theme.border : op.color }]}>
                <Text style={[styles.opBadgeText, { color: disabled ? theme.textMuted : op.text }]}>
                  {op.label}
                </Text>
              </View>
              <View style={styles.opMeta}>
                {qty !== null && (
                  <Text style={[styles.opStock, { color: disabled ? theme.textMuted : theme.text }]}>
                    {qty} ta mavjud
                  </Text>
                )}
                {disabled && <Text style={[styles.opEmpty, { color: theme.textMuted }]}>Qoldiq yo'q</Text>}
              </View>
              <View style={[
                styles.radioCircle,
                { borderColor: theme.border },
                isSelected && { borderColor: theme.primary },
              ]}>
                {isSelected && <View style={[styles.radioDot, { backgroundColor: theme.primary }]} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={[
          styles.sellBtn,
          { backgroundColor: theme.primary },
          !canSell && { backgroundColor: theme.border },
        ]}
        onPress={handleSell}
        disabled={!canSell || selling}
      >
        {selling
          ? <ActivityIndicator color="#fff" />
          : (
            <Text style={styles.sellBtnText}>
              {canSell
                ? `Sotish — ${OPERATORS.find(o => o.key === selectedOp)?.label}`
                : 'Operator tanlang'}
            </Text>
          )
        }
      </TouchableOpacity>

      <Text style={[styles.hint, { color: theme.textSub }]}>
        {mode === 'office'
          ? 'Ofis rejimi: shaxsiy zaxiradan 1 ta simkarta sotiladi'
          : 'Tochka rejimi: tanlangan tochkadan 1 ta simkarta sotiladi'}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: { paddingTop: 52, paddingBottom: 20, paddingHorizontal: 20 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

  modeRow: { flexDirection: 'row', margin: 16, gap: 10 },
  modeBtn: {
    flex: 1, borderWidth: 1.5,
    borderRadius: 10, paddingVertical: 12, alignItems: 'center',
  },
  modeBtnText: { fontSize: 14, fontWeight: '600' },

  sectionLabel: {
    fontSize: 13, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: 8, marginHorizontal: 16,
  },

  listCard: {
    marginHorizontal: 16, marginBottom: 16,
    borderRadius: 12, overflow: 'hidden',
  },

  pointRow:   { flexDirection: 'row', alignItems: 'center', padding: 14 },
  pointInfo:  { flex: 1, marginLeft: 12 },
  pointName:  { fontSize: 14, fontWeight: '600' },
  pointLoc:   { fontSize: 12, marginTop: 1 },
  pointTotal: { fontSize: 13, fontWeight: '600' },

  opRow:         { flexDirection: 'row', alignItems: 'center', padding: 14 },
  opRowDisabled: { opacity: 0.5 },
  opBadge:       { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5, minWidth: 72, alignItems: 'center' },
  opBadgeText:   { fontSize: 12, fontWeight: '700' },
  opMeta:        { flex: 1, marginLeft: 12 },
  opStock:       { fontSize: 13, fontWeight: '500' },
  opEmpty:       { fontSize: 12 },

  radioCircle:       { width: 20, height: 20, borderRadius: 10, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  radioDot:          { width: 10, height: 10, borderRadius: 5 },

  emptyBox:  { marginHorizontal: 16, marginBottom: 16, padding: 20, borderRadius: 12, alignItems: 'center' },
  emptyText: { },

  sellBtn: {
    marginHorizontal: 16, marginTop: 4, marginBottom: 12,
    borderRadius: 12, padding: 16, alignItems: 'center',
  },
  sellBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  hint: { textAlign: 'center', fontSize: 12, marginHorizontal: 20 },
});
