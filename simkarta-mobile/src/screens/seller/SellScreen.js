import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api';
import { useTheme } from '../../ThemeContext';
import { OPERATORS } from '../../theme';
import Toast from '../../components/Toast';

// Matnni qidiruvga moslab "yumshatadi" (Admin/Agent ekrandagi bilan bir xil):
// kichik harf, apostrof variantlari olib tashlanadi, ortiqcha probel bittaga.
function fold(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[ʻʼ‘’'`´]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

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
  const [toast, setToast]                 = useState({ visible: false, message: '', type: 'success' });
  const [pointSearch, setPointSearch]     = useState('');

  // Tochkalarni nom yoki hudud bo'yicha real-time filtrlash (useMemo — qaltiramaydi)
  const filteredPoints = useMemo(() => {
    const q = fold(pointSearch);
    if (!q) return points;
    return points.filter(p => fold(p.name).includes(q) || fold(p.location).includes(q));
  }, [points, pointSearch]);

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 2800);
  };

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
    setPointSearch('');
  };

  const stockQty = (opKey) => (stock.find(s => s.operator === opKey)?.qty ?? 0);
  const pointStockQty = (point, opKey) => (point?.point_stock || []).find(s => s.operator === opKey)?.qty ?? 0;

  const handleSell = () => {
    if (!selectedOp) { Alert.alert('Xato', 'Operator tanlang'); return; }
    if (mode === 'point' && !selectedPoint) { Alert.alert('Xato', 'Tochka tanlang'); return; }

    const opLabel = OPERATORS.find(o => o.key === selectedOp)?.label || selectedOp;
    const where = mode === 'office' ? 'ofisdan' : `${selectedPoint.name} tochkasidan`;

    Alert.alert(
      'Tasdiqlang',
      `${opLabel} simkartasi ${where} sotilsinmi?`,
      [
        { text: 'Bekor', style: 'cancel' },
        { text: 'Ha, sotish', style: 'default', onPress: doSell },
      ]
    );
  };

  const doSell = async () => {
    setSelling(true);
    const opLabel = OPERATORS.find(o => o.key === selectedOp)?.label || selectedOp;

    // Optimistic update: immediately decrement local stock
    const prevStock  = stock;
    const prevPoints = points;
    setStock(stock.map(s =>
      s.operator === selectedOp ? { ...s, qty: Math.max(s.qty - 1, 0) } : s
    ));
    if (mode === 'point' && selectedPoint) {
      setPoints(points.map(p =>
        p.id === selectedPoint.id
          ? {
              ...p,
              point_stock: (p.point_stock || []).map(ps =>
                ps.operator === selectedOp ? { ...ps, qty: Math.max(ps.qty - 1, 0) } : ps
              ),
            }
          : p
      ));
    }

    try {
      if (mode === 'office') {
        await api.post('/sales/office', { operator: selectedOp });
        showToast(`${opLabel} — ofisdan sotildi`);
      } else {
        await api.post('/sales/point', { point_id: selectedPoint.id, operator: selectedOp });
        showToast(`${opLabel} — ${selectedPoint.name}dan sotildi`);
      }
      setSelectedOp(null);
      setSelectedPoint(null);
      fetchData(); // background refresh to sync server state
    } catch (e) {
      // Revert optimistic update on failure
      setStock(prevStock);
      setPoints(prevPoints);
      showToast(e.response?.data?.detail || "Sotib bo'lmadi", 'error');
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
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} />
      <ScrollView
        style={{ flex: 1 }}
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

            {points.length > 0 && (
              <View style={[
                styles.searchWrap,
                { backgroundColor: theme.surface, borderColor: theme.border },
                isDark && { borderWidth: 1 },
              ]}>
                <Ionicons name="search-outline" size={18} color={theme.textMuted} style={styles.searchIcon} />
                <TextInput
                  style={[styles.searchInput, { color: theme.text }]}
                  placeholder="Tochka nomi yoki hudud..."
                  placeholderTextColor={theme.textMuted}
                  value={pointSearch}
                  onChangeText={setPointSearch}
                  returnKeyType="search"
                  clearButtonMode="while-editing"
                />
                {pointSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setPointSearch('')} style={styles.clearBtn}>
                    <Ionicons name="close-circle" size={18} color={theme.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {points.length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: theme.surface }, isDark && { borderWidth: 1, borderColor: theme.border }]}>
                <Text style={[styles.emptyText, { color: theme.textSub }]}>Tochkalar yo'q</Text>
              </View>
            ) : filteredPoints.length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: theme.surface }, isDark && { borderWidth: 1, borderColor: theme.border }]}>
                <Text style={[styles.emptyText, { color: theme.textSub }]}>Natija topilmadi</Text>
              </View>
            ) : (
              <View style={[
                styles.listCard,
                { backgroundColor: theme.surface },
                isDark && { borderWidth: 1, borderColor: theme.border },
                theme.card,
              ]}>
                {filteredPoints.map((p, i) => {
                  const total = (p.point_stock || []).reduce((s, ps) => s + ps.qty, 0);
                  const isSelected = selectedPoint?.id === p.id;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[
                        styles.pointRow,
                        i < filteredPoints.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
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
    </View>
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

  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 10,
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 2,
    elevation: 1,
  },
  searchIcon:  { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 10 },
  clearBtn:    { padding: 4 },

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

  radioCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  radioDot:    { width: 10, height: 10, borderRadius: 5 },

  emptyBox:  { marginHorizontal: 16, marginBottom: 16, padding: 20, borderRadius: 12, alignItems: 'center' },
  emptyText: {},

  sellBtn: {
    marginHorizontal: 16, marginTop: 4, marginBottom: 12,
    borderRadius: 12, padding: 16, alignItems: 'center',
  },
  sellBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  hint: { textAlign: 'center', fontSize: 12, marginHorizontal: 20 },
});
