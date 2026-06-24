import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, Alert, ActivityIndicator, RefreshControl,
  KeyboardAvoidingView, Platform, TextInput, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../api';
import { useTheme } from '../../ThemeContext';
import Toast from '../../components/Toast';

const OPERATORS = [
  { key: 'beeline',  label: 'Beeline',  color: '#FFCC00', textColor: '#1a1a1a' },
  { key: 'ucell',    label: 'Ucell',    color: '#8B2FC9', textColor: '#ffffff' },
  { key: 'uzmobile', label: 'Uzmobile', color: '#0066CC', textColor: '#ffffff' },
  { key: 'mobiuz',   label: 'Mobiuz',   color: '#E32119', textColor: '#ffffff' },
  { key: 'oq',       label: 'OQ',       color: '#1a1a1a', textColor: '#ffffff' },
];

const EMPTY_QTY = { beeline: '', ucell: '', uzmobile: '', mobiuz: '', oq: '' };

export default function StockScreen() {
  const { theme, isDark } = useTheme();
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal]       = useState(false);
  const [saving, setSaving]     = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [qtys, setQtys]         = useState(EMPTY_QTY);

  const [reduceModal, setReduceModal]   = useState(false);
  const [reduceUser, setReduceUser]     = useState(null);
  const [reduceOp, setReduceOp]         = useState(null);
  const [reduceQty, setReduceQty]       = useState('');
  const [reduceSaving, setReduceSaving] = useState(false);

  const [toast, setToast]       = useState({ visible: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 2800);
  };

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch {
      Alert.alert('Xato', 'Xodimlarni yuklashda xatolik');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  const onRefresh = () => { setRefreshing(true); fetchUsers(); };

  const openIssue = (user) => {
    setSelectedUser(user);
    setQtys(EMPTY_QTY);
    setModal(true);
  };

  const openReduce = (user) => {
    setReduceUser(user);
    setReduceOp(null);
    setReduceQty('');
    setReduceModal(true);
  };

  const handleReduce = () => {
    if (!reduceOp) { Alert.alert('Xato', 'Operator tanlang'); return; }
    const qty = parseInt(reduceQty, 10);
    if (!qty || qty <= 0) { Alert.alert('Xato', 'Miqdorni kiriting'); return; }
    const current = stockOf(reduceUser, reduceOp);
    if (qty > current) {
      Alert.alert('Xato', `${reduceUser.full_name}da ${reduceOp} dan faqat ${current} ta mavjud`);
      return;
    }
    const opLabel = OPERATORS.find(o => o.key === reduceOp)?.label || reduceOp;
    Alert.alert(
      'Tasdiqlang',
      `${reduceUser.full_name}dan ${qty} ta ${opLabel} olib tashlansinmi?`,
      [
        { text: 'Yo\'q', style: 'cancel' },
        { text: 'Ha, olish', style: 'destructive', onPress: doReduce },
      ]
    );
  };

  const doReduce = async () => {
    const qty = parseInt(reduceQty, 10);
    setReduceSaving(true);
    try {
      await api.post('/stock/reduce', {
        to_user_id: reduceUser.id,
        operator: reduceOp,
        qty,
      });
      setReduceModal(false);
      const opLabel = OPERATORS.find(o => o.key === reduceOp)?.label || reduceOp;
      showToast(`${reduceUser.full_name}dan ${qty} ta ${opLabel} olindi`);
      fetchUsers();
    } catch (e) {
      Alert.alert('Xato', e.response?.data?.detail || 'Amalga oshmadi');
    } finally {
      setReduceSaving(false);
    }
  };

  const handleIssueAll = () => {
    const entries = OPERATORS.filter(op => parseInt(qtys[op.key], 10) > 0)
      .map(op => ({ operator: op.key, qty: parseInt(qtys[op.key], 10) }));

    if (entries.length === 0) {
      Alert.alert('Xato', 'Kamida bitta operator uchun miqdor kiriting');
      return;
    }

    const summary = entries.map(e => `${e.qty} ta ${e.operator}`).join(', ');
    Alert.alert(
      'Tasdiqlang',
      `${selectedUser.full_name}ga ${summary} berilsinmi?`,
      [
        { text: 'Bekor', style: 'cancel' },
        { text: 'Ha, berish', style: 'default', onPress: () => doIssue(entries) },
      ]
    );
  };

  const doIssue = async (entries) => {
    setSaving(true);
    const errors = [];
    let successCount = 0;
    try {
      for (const { operator, qty } of entries) {
        try {
          await api.post('/stock/issue', { to_user_id: selectedUser.id, operator, qty });
          successCount++;
        } catch (e) {
          errors.push(`${operator}: ${e.response?.data?.detail || 'xato'}`);
        }
      }
      setModal(false);
      if (errors.length === 0) {
        const summary = entries.map(e => `${e.qty} ta ${e.operator}`).join(', ');
        showToast(`${selectedUser.full_name}ga ${summary} berildi`);
      } else {
        Alert.alert('Qisman muvaffaqiyat', `${successCount} ta berildi.\nXatolar:\n${errors.join('\n')}`);
      }
      fetchUsers();
    } finally {
      setSaving(false);
    }
  };

  const stockOf = (user, op) => (user.stock || []).find(s => s.operator === op)?.qty ?? 0;

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const cardShadow = isDark
    ? { borderWidth: 1, borderColor: theme.border }
    : theme.card;

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} />

      <LinearGradient colors={theme.headerGrad} style={styles.header}>
        <Text style={styles.headerTitle}>Ombor</Text>
        <Text style={styles.headerSub}>Simkarta berish</Text>
      </LinearGradient>

      <View style={[styles.legend, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        {OPERATORS.map(op => (
          <View key={op.key} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: op.color }]} />
            <Text style={[styles.legendLabel, { color: theme.text }]}>{op.label}</Text>
          </View>
        ))}
      </View>

      <FlatList
        data={users}
        keyExtractor={u => u.id}
        contentContainerStyle={[styles.list, users.length === 0 && styles.listEmpty]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Xodimlar yo'q</Text>
            <Text style={[styles.emptySub, { color: theme.textMuted }]}>Xodimlar qo'shilgach bu yerda ko'rinadi</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: theme.surface }, cardShadow]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardLeft}>
                <Text style={[styles.cardName, { color: theme.text }]}>{item.full_name}</Text>
                <Text style={[styles.cardRole, { color: theme.textSub }]}>
                  {item.role === 'agent' ? 'Agent' : 'Sotuvchi'} · {item.phone}
                </Text>
              </View>
              <View style={styles.cardBtns}>
                <TouchableOpacity
                  activeOpacity={0.75}
                  style={[styles.issueBtn, { backgroundColor: theme.primary }]}
                  onPress={() => openIssue(item)}
                >
                  <Text style={styles.issueBtnText}>Berish</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.75}
                  style={[styles.reduceBtn, { borderColor: theme.error || '#E32119' }]}
                  onPress={() => openReduce(item)}
                >
                  <Text style={[styles.reduceBtnText, { color: theme.error || '#E32119' }]}>Kamaytirish</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.opGridDivider, { backgroundColor: theme.border }]} />

            <View style={styles.opGrid}>
              {OPERATORS.map(op => (
                <View key={op.key} style={styles.opCell}>
                  <View style={[styles.opDot, { backgroundColor: op.color }]} />
                  <Text style={[styles.opQty, { color: theme.text }]}>{stockOf(item, op.key)}</Text>
                  <Text style={[styles.opLabel, { color: theme.textSub }]}>{op.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      />

      {/* Kamaytirish modali */}
      <Modal visible={reduceModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modalBox, { backgroundColor: theme.surface }]}>
            <View style={[styles.modalHandle, { backgroundColor: theme.border }]} />
            <Text style={[styles.modalTitle, { color: theme.text }]}>Kamaytirish</Text>
            {reduceUser && (
              <Text style={[styles.modalSub, { color: theme.textSub }]}>
                {reduceUser.full_name} · {reduceUser.phone}
              </Text>
            )}
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Operator tanlang</Text>
              <View style={styles.opChipRow}>
                {OPERATORS.map(op => {
                  const current = reduceUser ? stockOf(reduceUser, op.key) : 0;
                  const selected = reduceOp === op.key;
                  return (
                    <TouchableOpacity
                      key={op.key}
                      style={[
                        styles.opChip,
                        { borderColor: selected ? op.color : theme.border, backgroundColor: selected ? op.color : theme.surfaceAlt },
                      ]}
                      onPress={() => { setReduceOp(op.key); setReduceQty(''); }}
                    >
                      <Text style={[styles.opChipLabel, { color: selected ? op.textColor : theme.text }]}>{op.label}</Text>
                      <Text style={[styles.opChipQty, { color: selected ? op.textColor : theme.textSub }]}>{current} ta</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {reduceOp && (
                <>
                  <Text style={[styles.fieldLabel, { color: theme.textMuted, marginTop: 16 }]}>Nechta olish</Text>
                  <TextInput
                    style={[styles.opInput, { color: theme.text, backgroundColor: theme.surfaceAlt, borderColor: theme.border, textAlign: 'center', fontSize: 20, padding: 14 }]}
                    placeholder="0"
                    placeholderTextColor={theme.textMuted}
                    value={reduceQty}
                    onChangeText={setReduceQty}
                    keyboardType="number-pad"
                  />
                  {reduceUser && (
                    <Text style={[styles.fieldLabel, { color: theme.textMuted, textTransform: 'none', marginTop: 6 }]}>
                      Mavjud: {stockOf(reduceUser, reduceOp)} ta
                    </Text>
                  )}
                </>
              )}
              <View style={styles.modalBtns}>
                <TouchableOpacity
                  activeOpacity={0.75}
                  style={[styles.cancelBtn, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}
                  onPress={() => setReduceModal(false)}
                >
                  <Text style={[styles.cancelText, { color: theme.textSub }]}>Bekor</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.75}
                  style={[styles.confirmBtn, { backgroundColor: theme.error || '#E32119' }]}
                  onPress={handleReduce}
                  disabled={reduceSaving}
                >
                  {reduceSaving
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.confirmText}>Olish</Text>
                  }
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={modal} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modalBox, { backgroundColor: theme.surface }]}>
            <View style={[styles.modalHandle, { backgroundColor: theme.border }]} />
            <Text style={[styles.modalTitle, { color: theme.text }]}>Simkarta berish</Text>
            {selectedUser && (
              <Text style={[styles.modalSub, { color: theme.textSub }]}>
                {selectedUser.full_name} · {selectedUser.phone}
              </Text>
            )}

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Har operator uchun miqdor kiriting</Text>
              {OPERATORS.map(op => (
                <View key={op.key} style={styles.opRow}>
                  <View style={[styles.opBadge, { backgroundColor: op.color }]}>
                    <Text style={[styles.opBadgeText, { color: op.textColor }]}>{op.label}</Text>
                  </View>
                  <TextInput
                    style={[styles.opInput, { color: theme.text, backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
                    placeholder="0"
                    placeholderTextColor={theme.textMuted}
                    value={qtys[op.key]}
                    onChangeText={v => setQtys(q => ({ ...q, [op.key]: v }))}
                    keyboardType="number-pad"
                    returnKeyType="next"
                  />
                  <Text style={[styles.opUnit, { color: theme.textSub }]}>ta</Text>
                </View>
              ))}

              <View style={styles.modalBtns}>
                <TouchableOpacity
                  activeOpacity={0.75}
                  style={[styles.cancelBtn, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}
                  onPress={() => setModal(false)}
                >
                  <Text style={[styles.cancelText, { color: theme.textSub }]}>Bekor</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.75}
                  style={[styles.confirmBtn, { backgroundColor: theme.primary }]}
                  onPress={handleIssueAll}
                  disabled={saving}
                >
                  {saving
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.confirmText}>Berish</Text>
                  }
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    paddingTop: 52, paddingBottom: 18, paddingHorizontal: 20,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#fff' },
  headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.78)', marginTop: 3 },

  legend: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:   { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 11, fontWeight: '600' },

  list:      { padding: 14, gap: 10, paddingBottom: 90 },
  listEmpty: { flex: 1 },

  card: {
    borderRadius: 14, padding: 16,
  },
  cardHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardLeft:      { flex: 1, marginRight: 8 },
  cardName:      { fontSize: 16, fontWeight: '700' },
  cardRole:      { fontSize: 12, marginTop: 2 },
  cardBtns:      { flexDirection: 'column', gap: 6 },
  issueBtn:      { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  issueBtnText:  { color: '#fff', fontWeight: '700', fontSize: 12 },
  reduceBtn:     { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1.5, backgroundColor: 'transparent' },
  reduceBtnText: { fontWeight: '700', fontSize: 12 },

  opChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  opChip:    { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', minWidth: 72 },
  opChipLabel: { fontSize: 12, fontWeight: '700' },
  opChipQty:   { fontSize: 11, marginTop: 2 },

  opGridDivider: { height: 1, marginVertical: 12 },
  opGrid:        { flexDirection: 'row', justifyContent: 'space-between' },
  opCell:        { alignItems: 'center', flex: 1 },
  opDot:         { width: 10, height: 10, borderRadius: 5, marginBottom: 4 },
  opQty:         { fontSize: 15, fontWeight: '700' },
  opLabel:       { fontSize: 10, marginTop: 1 },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIcon:  { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptySub:   { fontSize: 14, textAlign: 'center', paddingHorizontal: 40, lineHeight: 20 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40, maxHeight: '85%',
  },
  modalHandle:  { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle:   { fontSize: 20, fontWeight: '700' },
  modalSub:     { fontSize: 13, marginTop: 3, marginBottom: 20 },
  fieldLabel:   { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 14, letterSpacing: 0.6 },

  opRow:      { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  opBadge:    { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, minWidth: 76, alignItems: 'center' },
  opBadgeText:{ fontSize: 12, fontWeight: '700' },
  opInput:    {
    flex: 1, borderWidth: 1.5, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 16, textAlign: 'center',
  },
  opUnit:     { fontSize: 13, minWidth: 20, fontWeight: '500' },

  modalBtns:   { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn:   { flex: 1, borderWidth: 1.5, borderRadius: 12, padding: 14, alignItems: 'center' },
  cancelText:  { fontWeight: '600', fontSize: 15 },
  confirmBtn:  { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
  confirmText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
