import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, Alert, ActivityIndicator, RefreshControl,
  KeyboardAvoidingView, Platform, TextInput, ScrollView,
} from 'react-native';
import * as Location from 'expo-location';
import api, { uploadPhoto } from '../../api';
import { getUser } from '../../auth';
import { colors } from '../../theme';
import PhotoPicker from '../../components/PhotoPicker';

const OPERATORS = [
  { key: 'beeline',  label: 'Beeline',  color: '#FFCC00', textColor: '#1a1a1a' },
  { key: 'ucell',    label: 'Ucell',    color: '#8B2FC9', textColor: '#ffffff' },
  { key: 'uzmobile', label: 'Uzmobile', color: '#0066CC', textColor: '#ffffff' },
  { key: 'mobiuz',   label: 'Mobiuz',   color: '#E32119', textColor: '#ffffff' },
  { key: 'oq',       label: 'OQ',       color: '#1a1a1a', textColor: '#ffffff' },
];

async function getCurrentLocation() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') throw new Error('Joylashuv ruxsati berilmagan');
  const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  return { lat: loc.coords.latitude, lng: loc.coords.longitude };
}

const EMPTY_FORM = {
  name: '', location: '', lat: null, lng: null,
  photos: { outside: null, inside: null, ad: null },
  stock: { beeline: '', ucell: '', uzmobile: '', mobiuz: '', oq: '' },
};

export default function PointsScreen() {
  const [points, setPoints]       = useState([]);
  const [myId, setMyId]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [createModal, setCreateModal] = useState(false);
  const [creating, setCreating]       = useState(false);
  const [gpsLoading, setGpsLoading]   = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(null); // 'outside'|'inside'|'ad'
  const [form, setForm]               = useState(EMPTY_FORM);

  const [addModal, setAddModal]   = useState(false);
  const [addPoint, setAddPoint]   = useState(null);
  const [addSaving, setAddSaving] = useState(false);
  const [addStock, setAddStock]   = useState({ beeline: '', ucell: '', uzmobile: '', mobiuz: '', oq: '' });

  const fetchPoints = useCallback(async () => {
    try {
      const [res, u] = await Promise.all([api.get('/points'), getUser()]);
      setMyId(u?.id);
      setPoints((res.data || []).filter(p => p.agent_id === u?.id));
    } catch {
      Alert.alert('Xato', 'Tochkalarni yuklashda xatolik');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchPoints(); }, [fetchPoints]);
  const onRefresh = () => { setRefreshing(true); fetchPoints(); };

  const getGps = async () => {
    setGpsLoading(true);
    try {
      const loc = await getCurrentLocation();
      setForm(f => ({ ...f, lat: loc.lat, lng: loc.lng }));
    } catch (e) {
      Alert.alert('GPS xato', e.message);
    } finally {
      setGpsLoading(false);
    }
  };

  const handlePhoto = async (key, localUri) => {
    setForm(f => ({ ...f, photos: { ...f.photos, [key]: localUri } }));
    setUploadingPhoto(key);
    try {
      const url = await uploadPhoto(localUri);
      setForm(f => ({ ...f, photos: { ...f.photos, [key]: url } }));
    } catch {
      // Cloudinary yo'q bo'lsa URI ni saqlab qo'yamiz — qolgan hamma narsa ishlaydi
    } finally {
      setUploadingPhoto(null);
    }
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.location.trim()) {
      Alert.alert('Xato', 'Ism va manzilni kiriting'); return;
    }
    if (!form.lat) {
      Alert.alert('Xato', 'GPS koordinatani oling'); return;
    }
    const stockEntries = OPERATORS
      .filter(op => parseInt(form.stock[op.key], 10) > 0)
      .map(op => ({ operator: op.key, qty: parseInt(form.stock[op.key], 10) }));

    setCreating(true);
    try {
      await api.post('/points', {
        name: form.name.trim(),
        location: form.location.trim(),
        lat: form.lat,
        lng: form.lng,
        photo_outside: form.photos.outside,
        photo_inside:  form.photos.inside,
        photo_ad:      form.photos.ad,
        stock: stockEntries,
      });
      setCreateModal(false);
      setForm(EMPTY_FORM);
      fetchPoints();
    } catch (e) {
      Alert.alert('Xato', e.response?.data?.detail || "Tochka ochib bo'lmadi");
    } finally {
      setCreating(false);
    }
  };

  const openAddStock = (point) => {
    setAddPoint(point);
    setAddStock({ beeline: '', ucell: '', uzmobile: '', mobiuz: '', oq: '' });
    setAddModal(true);
  };

  const handleAddStock = async () => {
    const entries = OPERATORS
      .filter(op => parseInt(addStock[op.key], 10) > 0)
      .map(op => ({ operator: op.key, qty: parseInt(addStock[op.key], 10) }));
    if (!entries.length) { Alert.alert('Xato', 'Kamida bitta miqdor kiriting'); return; }

    setAddSaving(true);
    try {
      const loc = await getCurrentLocation();
      await api.patch(`/points/${addPoint.id}`, {
        current_lat: loc.lat, current_lng: loc.lng, stock: entries,
      });
      setAddModal(false);
      fetchPoints();
    } catch (e) {
      Alert.alert('Xato', e.response?.data?.detail || "Yangilab bo'lmadi");
    } finally {
      setAddSaving(false);
    }
  };

  const pointTotal = (p) => (p.point_stock || []).reduce((s, ps) => s + ps.qty, 0);
  const stockOf = (p, op) => (p.point_stock || []).find(s => s.operator === op)?.qty ?? 0;

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tochkalar</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => { setForm(EMPTY_FORM); setCreateModal(true); }}>
          <Text style={styles.addBtnText}>+ Yangi</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={points}
        keyExtractor={p => p.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📍</Text>
            <Text style={styles.emptyTitle}>Tochkalar yo'q</Text>
            <Text style={styles.emptySub}>"+ Yangi" tugmasini bosing</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardName}>{item.name}</Text>
                <View style={styles.totalBadge}>
                  <Text style={styles.totalNum}>{pointTotal(item)}</Text>
                  <Text style={styles.totalLabel}> ta</Text>
                </View>
              </View>
              <Text style={styles.cardLocation}>📍 {item.location}</Text>
            </View>
            <View style={styles.opGrid}>
              {OPERATORS.map(op => (
                <View key={op.key} style={styles.opCell}>
                  <View style={[styles.opDot, { backgroundColor: op.color }]} />
                  <Text style={styles.opName}>{op.label}</Text>
                  <Text style={styles.opQty}>{stockOf(item, op.key)}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity style={styles.stockBtn} onPress={() => openAddStock(item)}>
              <Text style={styles.stockBtnText}>+ Simkarta qo'shish</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* Yangi tochka modali */}
      <Modal visible={createModal} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalBox}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>Yangi tochka</Text>

              <TextInput style={styles.input} placeholder="Tochka nomi (masalan: Yunusobod bozori)"
                placeholderTextColor={colors.textSecondary}
                value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} />
              <TextInput style={styles.input} placeholder="Manzil (ko'cha, tuman, shahar)"
                placeholderTextColor={colors.textSecondary}
                value={form.location} onChangeText={v => setForm(f => ({ ...f, location: v }))} />

              <TouchableOpacity style={styles.gpsBtn} onPress={getGps} disabled={gpsLoading}>
                {gpsLoading
                  ? <ActivityIndicator color={colors.primary} />
                  : <Text style={styles.gpsBtnText}>
                      {form.lat ? `✅ GPS: ${form.lat.toFixed(4)}, ${form.lng.toFixed(4)}` : '📍 GPS olish'}
                    </Text>
                }
              </TouchableOpacity>

              <Text style={styles.fieldLabel}>Rasmlar (ixtiyoriy)</Text>
              <PhotoPicker label="Tashqi ko'rinish" uri={form.photos.outside}
                onPicked={uri => handlePhoto('outside', uri)} uploading={uploadingPhoto === 'outside'} />
              <PhotoPicker label="Ichki ko'rinish" uri={form.photos.inside}
                onPicked={uri => handlePhoto('inside', uri)} uploading={uploadingPhoto === 'inside'} />
              <PhotoPicker label="Reklama materiali" uri={form.photos.ad}
                onPicked={uri => handlePhoto('ad', uri)} uploading={uploadingPhoto === 'ad'} />

              <Text style={[styles.fieldLabel, { marginTop: 4 }]}>Boshlang'ich simkartalar</Text>
              {OPERATORS.map(op => (
                <View key={op.key} style={styles.opInputRow}>
                  <View style={[styles.opMini, { backgroundColor: op.color }]}>
                    <Text style={[styles.opMiniText, { color: op.textColor }]}>{op.label}</Text>
                  </View>
                  <TextInput style={styles.opInput} placeholder="0"
                    value={form.stock[op.key]} keyboardType="number-pad"
                    onChangeText={v => setForm(f => ({ ...f, stock: { ...f.stock, [op.key]: v } }))} />
                </View>
              ))}

              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setCreateModal(false)}>
                  <Text style={styles.cancelText}>Bekor</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmBtn} onPress={handleCreate} disabled={creating || !!uploadingPhoto}>
                  {creating
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.confirmText}>Ochish</Text>
                  }
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Simkarta qo'shish modali */}
      <Modal visible={addModal} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Simkarta qo'shish</Text>
            {addPoint && <Text style={styles.modalSub}>{addPoint.name}</Text>}
            <Text style={styles.modalNote}>GPS avtomatik olinadi — tochka yaqinida bo'ling (100 m)</Text>
            {OPERATORS.map(op => (
              <View key={op.key} style={styles.opInputRow}>
                <View style={[styles.opMini, { backgroundColor: op.color }]}>
                  <Text style={[styles.opMiniText, { color: op.textColor }]}>{op.label}</Text>
                </View>
                <TextInput style={styles.opInput} placeholder="0"
                  value={addStock[op.key]} keyboardType="number-pad"
                  onChangeText={v => setAddStock(s => ({ ...s, [op.key]: v }))} />
              </View>
            ))}
            <View style={[styles.modalBtns, { marginTop: 8 }]}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setAddModal(false)}>
                <Text style={styles.cancelText}>Bekor</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleAddStock} disabled={addSaving}>
                {addSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmText}>Qo'shish</Text>}
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
    paddingTop: 52, paddingBottom: 16, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  addBtn:      { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  addBtnText:  { color: '#fff', fontWeight: '600', fontSize: 14 },

  list: { padding: 12, gap: 10, paddingBottom: 90 },

  empty:      { alignItems: 'center', paddingTop: 80 },
  emptyIcon:  { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
  emptySub:   { fontSize: 13, color: colors.textSecondary, marginTop: 4 },

  card: {
    backgroundColor: colors.white, borderRadius: 12, padding: 14,
    elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4,
  },
  cardTop:      { marginBottom: 12 },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardName:     { fontSize: 15, fontWeight: '700', color: colors.text, flex: 1 },
  totalBadge:   { flexDirection: 'row', alignItems: 'baseline' },
  totalNum:     { fontSize: 20, fontWeight: '700', color: colors.primary },
  totalLabel:   { fontSize: 13, color: colors.textSecondary },
  cardLocation: { fontSize: 12, color: colors.textSecondary, marginTop: 3 },

  opGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  opCell: { alignItems: 'center', flex: 1 },
  opDot:  { width: 10, height: 10, borderRadius: 5, marginBottom: 3 },
  opName: { fontSize: 9, color: colors.textSecondary, fontWeight: '500' },
  opQty:  { fontSize: 14, fontWeight: '700', color: colors.text },

  stockBtn:     { backgroundColor: '#e8f5ee', borderRadius: 8, padding: 10, alignItems: 'center' },
  stockBtnText: { color: colors.primary, fontWeight: '600', fontSize: 13 },

  overlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: 40, maxHeight: '92%',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 4 },
  modalSub:   { fontSize: 14, color: colors.textSecondary, marginBottom: 8 },
  modalNote:  { fontSize: 12, color: '#E32119', marginBottom: 14, lineHeight: 17 },

  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    padding: 13, fontSize: 15, color: colors.text,
    backgroundColor: colors.background, marginBottom: 12,
  },
  gpsBtn: {
    borderWidth: 1.5, borderColor: colors.primary, borderRadius: 10,
    padding: 12, alignItems: 'center', marginBottom: 16,
  },
  gpsBtnText: { color: colors.primary, fontWeight: '600', fontSize: 14 },

  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 10, textTransform: 'uppercase' },

  opInputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 },
  opMini:     { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5, minWidth: 72, alignItems: 'center' },
  opMiniText: { fontSize: 12, fontWeight: '700' },
  opInput: {
    flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 8,
    padding: 10, fontSize: 15, color: colors.text, backgroundColor: colors.background,
  },

  modalBtns:  { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn:  { flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, padding: 14, alignItems: 'center' },
  cancelText: { fontWeight: '600', color: colors.textSecondary },
  confirmBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 10, padding: 14, alignItems: 'center' },
  confirmText:{ color: '#fff', fontWeight: '700', fontSize: 15 },
});
