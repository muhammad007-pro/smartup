import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator,
  RefreshControl, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import api from '../../api';
import { colors } from '../../theme';

const ROLES = [
  { key: 'agent',  label: 'Agent' },
  { key: 'seller', label: 'Sotuvchi' },
];

const OPERATORS = ['beeline', 'ucell', 'uzmobile', 'mobiuz', 'oq'];

const OP_COLOR = {
  beeline: '#FFCC00', ucell: '#8B2FC9',
  uzmobile: '#0066CC', mobiuz: '#E32119', oq: '#1a1a1a',
};

export default function UsersScreen() {
  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving]       = useState(false);

  const [form, setForm] = useState({ full_name: '', phone: '', password: '', role: 'agent' });

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

  const openModal = () => {
    setForm({ full_name: '', phone: '', password: '', role: 'agent' });
    setModalVisible(true);
  };

  const handleCreate = async () => {
    if (!form.full_name.trim() || !form.phone.trim() || !form.password.trim()) {
      Alert.alert('Xato', 'Barcha maydonlarni to\'ldiring');
      return;
    }
    setSaving(true);
    try {
      await api.post('/users', form);
      setModalVisible(false);
      fetchUsers();
    } catch (e) {
      Alert.alert('Xato', e.response?.data?.detail || 'Xodim qo\'shib bo\'lmadi');
    } finally {
      setSaving(false);
    }
  };

  const totalStock = (stock) => stock.reduce((s, i) => s + i.qty, 0);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Xodimlar</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openModal}>
          <Text style={styles.addBtnText}>+ Qo'shish</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={users}
        keyExtractor={u => u.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Xodimlar yo'q</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={[styles.avatar, { backgroundColor: item.role === 'agent' ? colors.primary : '#8B2FC9' }]}>
                <Text style={styles.avatarText}>{item.full_name[0]?.toUpperCase()}</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{item.full_name}</Text>
                <Text style={styles.cardPhone}>{item.phone}</Text>
              </View>
              <View style={[styles.roleBadge, { backgroundColor: item.role === 'agent' ? colors.primary : '#8B2FC9' }]}>
                <Text style={styles.roleText}>{item.role === 'agent' ? 'Agent' : 'Sotuvchi'}</Text>
              </View>
            </View>

            {/* Operator qoldiqlari */}
            <View style={styles.stockRow}>
              {(item.stock || []).map(s => (
                <View key={s.operator} style={[styles.stockChip, { borderColor: OP_COLOR[s.operator] }]}>
                  <View style={[styles.stockDot, { backgroundColor: OP_COLOR[s.operator] }]} />
                  <Text style={styles.stockQty}>{s.qty}</Text>
                </View>
              ))}
              <Text style={styles.totalStock}>Jami: {totalStock(item.stock || [])} ta</Text>
            </View>
          </View>
        )}
      />

      {/* Xodim qo'shish modali */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Yangi xodim</Text>

            <TextInput
              style={styles.input}
              placeholder="To'liq ism (masalan: Akmal Karimov)"
              placeholderTextColor={colors.textSecondary}
              value={form.full_name}
              onChangeText={v => setForm(f => ({ ...f, full_name: v }))}
            />
            <TextInput
              style={styles.input}
              placeholder="+998 90 123 45 67"
              placeholderTextColor={colors.textSecondary}
              value={form.phone}
              onChangeText={v => setForm(f => ({ ...f, phone: v }))}
              keyboardType="phone-pad"
            />
            <TextInput
              style={styles.input}
              placeholder="Parol (kamida 4 ta belgi)"
              placeholderTextColor={colors.textSecondary}
              value={form.password}
              onChangeText={v => setForm(f => ({ ...f, password: v }))}
              secureTextEntry
            />

            {/* Rol tanlash */}
            <View style={styles.roleRow}>
              {ROLES.map(r => (
                <TouchableOpacity
                  key={r.key}
                  style={[styles.roleOption, form.role === r.key && styles.roleOptionActive]}
                  onPress={() => setForm(f => ({ ...f, role: r.key }))}
                >
                  <Text style={[styles.roleOptionText, form.role === r.key && styles.roleOptionTextActive]}>
                    {r.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Bekor</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleCreate} disabled={saving}>
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.saveBtnText}>Saqlash</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  addBtn:      { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  addBtnText:  { color: '#fff', fontWeight: '600', fontSize: 14 },

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
  cardTop:   { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar:    { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  avatarText:{ color: '#fff', fontSize: 18, fontWeight: '700' },
  cardInfo:  { flex: 1, marginLeft: 12 },
  cardName:  { fontSize: 15, fontWeight: '600', color: colors.text },
  cardPhone: { fontSize: 13, color: colors.textSecondary, marginTop: 1 },
  roleBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  roleText:  { color: '#fff', fontSize: 11, fontWeight: '700' },

  stockRow:  { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  stockChip: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  stockDot:  { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
  stockQty:  { fontSize: 12, fontWeight: '600', color: colors.text },
  totalStock:{ marginLeft: 'auto', fontSize: 12, fontWeight: '600', color: colors.textSecondary },

  empty:     { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: colors.textSecondary, fontSize: 16 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: 36,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16 },

  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    padding: 13, fontSize: 15, color: colors.text,
    backgroundColor: colors.background, marginBottom: 12,
  },

  roleRow:    { flexDirection: 'row', gap: 10, marginBottom: 20 },
  roleOption: {
    flex: 1, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 10, paddingVertical: 11, alignItems: 'center',
  },
  roleOptionActive:     { borderColor: colors.primary, backgroundColor: '#e8f5ee' },
  roleOptionText:       { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  roleOptionTextActive: { color: colors.primary },

  modalBtns:   { flexDirection: 'row', gap: 10 },
  cancelBtn:   { flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, padding: 14, alignItems: 'center' },
  cancelBtnText: { fontWeight: '600', color: colors.textSecondary },
  saveBtn:     { flex: 1, backgroundColor: colors.primary, borderRadius: 10, padding: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
