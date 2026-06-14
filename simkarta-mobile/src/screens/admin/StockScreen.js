import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, Alert, ActivityIndicator, RefreshControl,
  KeyboardAvoidingView, Platform, TextInput,
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

export default function StockScreen() {
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal]       = useState(false);
  const [saving, setSaving]     = useState(false);

  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedOp, setSelectedOp]     = useState('beeline');
  const [qty, setQty]                   = useState('');

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
    setSelectedOp('beeline');
    setQty('');
    setModal(true);
  };

  const handleIssue = async () => {
    const n = parseInt(qty, 10);
    if (!n || n <= 0) {
      Alert.alert('Xato', "To'g'ri miqdor kiriting");
      return;
    }
    setSaving(true);
    try {
      await api.post('/stock/issue', {
        to_user_id: selectedUser.id,
        operator: selectedOp,
        qty: n,
      });
      setModal(false);
      Alert.alert('Muvaffaqiyatli', `${selectedUser.full_name}ga ${n} ta ${selectedOp} berildi`);
      fetchUsers();
    } catch (e) {
      Alert.alert('Xato', e.response?.data?.detail || "Berib bo'lmadi");
    } finally {
      setSaving(false);
    }
  };

  const stockOf = (user, op) => (user.stock || []).find(s => s.operator === op)?.qty ?? 0;

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ombor</Text>
        <Text style={styles.headerSub}>Hodimga simkarta berish</Text>
      </View>

      {/* Operator ranglari izoh */}
      <View style={styles.legend}>
        {OPERATORS.map(op => (
          <View key={op.key} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: op.color }]} />
            <Text style={styles.legendLabel}>{op.label}</Text>
          </View>
        ))}
      </View>

      <FlatList
        data={users}
        keyExtractor={u => u.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}><Text style={styles.emptyText}>Xodimlar yo'q</Text></View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardName}>{item.full_name}</Text>
                <Text style={styles.cardRole}>{item.role === 'agent' ? 'Agent' : 'Sotuvchi'} · {item.phone}</Text>
              </View>
              <TouchableOpacity style={styles.issueBtn} onPress={() => openIssue(item)}>
                <Text style={styles.issueBtnText}>Berish</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.opGrid}>
              {OPERATORS.map(op => (
                <View key={op.key} style={styles.opCell}>
                  <View style={[styles.opDot, { backgroundColor: op.color }]} />
                  <Text style={styles.opQty}>{stockOf(item, op.key)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      />

      {/* Berish modali */}
      <Modal visible={modal} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Simkarta berish</Text>
            {selectedUser && (
              <Text style={styles.modalSub}>{selectedUser.full_name}</Text>
            )}

            <Text style={styles.fieldLabel}>Operator</Text>
            <View style={styles.opSelector}>
              {OPERATORS.map(op => (
                <TouchableOpacity
                  key={op.key}
                  style={[
                    styles.opOption,
                    { borderColor: op.color },
                    selectedOp === op.key && { backgroundColor: op.color },
                  ]}
                  onPress={() => setSelectedOp(op.key)}
                >
                  <Text style={[
                    styles.opOptionText,
                    selectedOp === op.key && { color: op.textColor },
                  ]}>
                    {op.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Miqdor</Text>
            <TextInput
              style={styles.input}
              placeholder="Nechta? (masalan: 50)"
              placeholderTextColor={colors.textSecondary}
              value={qty}
              onChangeText={setQty}
              keyboardType="number-pad"
              returnKeyType="done"
            />

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(false)}>
                <Text style={styles.cancelText}>Bekor</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleIssue} disabled={saving}>
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.confirmText}>Berish</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    backgroundColor: colors.primary,
    paddingTop: 52,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.white,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot:   { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '500' },

  list: { padding: 12, gap: 10, paddingBottom: 90 },

  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  cardName:   { fontSize: 15, fontWeight: '600', color: colors.text },
  cardRole:   { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  issueBtn:   { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  issueBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  opGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  opCell: { alignItems: 'center', flex: 1 },
  opDot:  { width: 10, height: 10, borderRadius: 5, marginBottom: 4 },
  opQty:  { fontSize: 13, fontWeight: '700', color: colors.text },

  empty:     { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: colors.textSecondary, fontSize: 16 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: 40,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  modalSub:   { fontSize: 14, color: colors.textSecondary, marginTop: 2, marginBottom: 16 },

  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase' },

  opSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  opOption: {
    borderWidth: 2, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  opOptionText: { fontSize: 13, fontWeight: '700', color: colors.text },

  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    padding: 13, fontSize: 16, color: colors.text,
    backgroundColor: colors.background, marginBottom: 20,
  },

  modalBtns:  { flexDirection: 'row', gap: 10 },
  cancelBtn:  { flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, padding: 14, alignItems: 'center' },
  cancelText: { fontWeight: '600', color: colors.textSecondary },
  confirmBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 10, padding: 14, alignItems: 'center' },
  confirmText:{ color: '#fff', fontWeight: '700', fontSize: 15 },
});
