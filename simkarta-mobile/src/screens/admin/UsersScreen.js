import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator,
  RefreshControl, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../api';
import { useTheme } from '../../ThemeContext';

const ROLES = [
  { key: 'agent',  label: 'Agent' },
  { key: 'seller', label: 'Sotuvchi' },
];

const OPERATORS = ['beeline', 'ucell', 'uzmobile', 'mobiuz', 'oq'];

const OP_COLOR = {
  beeline: '#FFCC00', ucell: '#8B2FC9',
  uzmobile: '#0066CC', mobiuz: '#E32119', oq: '#1a1a1a',
};

const ROLE_COLOR = { agent: null, seller: '#8B2FC9' };

export default function UsersScreen() {
  const { theme, isDark } = useTheme();
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving]     = useState(false);
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
      <LinearGradient colors={theme.headerGrad} style={styles.header}>
        <Text style={styles.headerTitle}>Xodimlar</Text>
        <TouchableOpacity activeOpacity={0.75} style={styles.addBtn} onPress={openModal}>
          <Text style={styles.addBtnText}>+ Qo'shish</Text>
        </TouchableOpacity>
      </LinearGradient>

      <FlatList
        data={users}
        keyExtractor={u => u.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        contentContainerStyle={[styles.list, users.length === 0 && styles.listEmpty]}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Xodimlar yo'q</Text>
            <Text style={[styles.emptySub, { color: theme.textMuted }]}>Yangi xodim qo'shish uchun yuqoridagi tugmani bosing</Text>
          </View>
        }
        renderItem={({ item }) => {
          const roleColor = item.role === 'agent' ? theme.primary : '#8B2FC9';
          return (
            <View style={[styles.card, { backgroundColor: theme.surface }, cardShadow]}>
              <View style={styles.cardTop}>
                <View style={[styles.avatar, { backgroundColor: roleColor }]}>
                  <Text style={styles.avatarText}>{item.full_name[0]?.toUpperCase()}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={[styles.cardName, { color: theme.text }]}>{item.full_name}</Text>
                  <Text style={[styles.cardPhone, { color: theme.textSub }]}>{item.phone}</Text>
                </View>
                <View style={[styles.roleBadge, { backgroundColor: roleColor + '20' }]}>
                  <Text style={[styles.roleText, { color: roleColor }]}>
                    {item.role === 'agent' ? 'Agent' : 'Sotuvchi'}
                  </Text>
                </View>
              </View>

              <View style={[styles.stockDivider, { backgroundColor: theme.border }]} />

              <View style={styles.stockRow}>
                {(item.stock || []).map(s => (
                  <View key={s.operator} style={[styles.stockChip, { borderColor: OP_COLOR[s.operator] + '60', backgroundColor: OP_COLOR[s.operator] + '12' }]}>
                    <View style={[styles.stockDot, { backgroundColor: OP_COLOR[s.operator] }]} />
                    <Text style={[styles.stockQty, { color: theme.text }]}>{s.qty}</Text>
                  </View>
                ))}
                <Text style={[styles.totalStock, { color: theme.textMuted }]}>
                  Jami: {totalStock(item.stock || [])} ta
                </Text>
              </View>
            </View>
          );
        }}
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[styles.modalBox, { backgroundColor: theme.surface }]}>
            <View style={[styles.modalHandle, { backgroundColor: theme.border }]} />
            <Text style={[styles.modalTitle, { color: theme.text }]}>Yangi xodim</Text>

            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
              placeholder="To'liq ism (masalan: Akmal Karimov)"
              placeholderTextColor={theme.textMuted}
              value={form.full_name}
              onChangeText={v => setForm(f => ({ ...f, full_name: v }))}
            />
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
              placeholder="+998 90 123 45 67"
              placeholderTextColor={theme.textMuted}
              value={form.phone}
              onChangeText={v => setForm(f => ({ ...f, phone: v }))}
              keyboardType="phone-pad"
            />
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
              placeholder="Parol (kamida 4 ta belgi)"
              placeholderTextColor={theme.textMuted}
              value={form.password}
              onChangeText={v => setForm(f => ({ ...f, password: v }))}
              secureTextEntry
            />

            <Text style={[styles.roleLabel, { color: theme.textSub }]}>Lavozim</Text>
            <View style={styles.roleRow}>
              {ROLES.map(r => {
                const active = form.role === r.key;
                const rColor = r.key === 'agent' ? theme.primary : '#8B2FC9';
                return (
                  <TouchableOpacity
                    key={r.key}
                    activeOpacity={0.75}
                    style={[
                      styles.roleOption,
                      { borderColor: active ? rColor : theme.border, backgroundColor: active ? rColor + '18' : theme.surfaceAlt },
                    ]}
                    onPress={() => setForm(f => ({ ...f, role: r.key }))}
                  >
                    <Text style={[styles.roleOptionText, { color: active ? rColor : theme.textSub }]}>
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.modalBtns}>
              <TouchableOpacity
                activeOpacity={0.75}
                style={[styles.cancelBtn, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.cancelBtnText, { color: theme.textSub }]}>Bekor</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.75}
                style={[styles.saveBtn, { backgroundColor: theme.primary }]}
                onPress={handleCreate}
                disabled={saving}
              >
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
  container: { flex: 1 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    paddingTop: 52,
    paddingBottom: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#fff' },
  addBtn: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  list:      { padding: 14, gap: 10, paddingBottom: 90 },
  listEmpty: { flex: 1 },

  card: {
    borderRadius: 14,
    padding: 16,
  },
  cardTop:    { flexDirection: 'row', alignItems: 'center' },
  avatar:     { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  cardInfo:   { flex: 1, marginLeft: 12 },
  cardName:   { fontSize: 16, fontWeight: '700' },
  cardPhone:  { fontSize: 13, marginTop: 2 },
  roleBadge:  { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  roleText:   { fontSize: 12, fontWeight: '700' },

  stockDivider: { height: 1, marginVertical: 12 },
  stockRow:     { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  stockChip:    {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: 8,
    paddingHorizontal: 9, paddingVertical: 4,
  },
  stockDot:  { width: 7, height: 7, borderRadius: 4, marginRight: 5 },
  stockQty:  { fontSize: 13, fontWeight: '700' },
  totalStock:{ marginLeft: 'auto', fontSize: 12, fontWeight: '600' },

  emptyState:  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIcon:   { fontSize: 56, marginBottom: 16 },
  emptyTitle:  { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptySub:    { fontSize: 14, textAlign: 'center', paddingHorizontal: 40, lineHeight: 20 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle:  { fontSize: 20, fontWeight: '700', marginBottom: 20 },

  input: {
    borderWidth: 1.5, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, marginBottom: 12,
  },

  roleLabel:  { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 },
  roleRow:    { flexDirection: 'row', gap: 10, marginBottom: 24 },
  roleOption: {
    flex: 1, borderWidth: 1.5, borderRadius: 12,
    paddingVertical: 13, alignItems: 'center',
  },
  roleOptionText: { fontSize: 14, fontWeight: '700' },

  modalBtns:    { flexDirection: 'row', gap: 10 },
  cancelBtn:    { flex: 1, borderWidth: 1.5, borderRadius: 12, padding: 14, alignItems: 'center' },
  cancelBtnText:{ fontWeight: '600', fontSize: 15 },
  saveBtn:      { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
  saveBtnText:  { color: '#fff', fontWeight: '700', fontSize: 15 },
});
