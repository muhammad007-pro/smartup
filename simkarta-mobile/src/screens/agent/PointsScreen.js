import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, Alert, ActivityIndicator, RefreshControl,
  KeyboardAvoidingView, Platform, TextInput, ScrollView,
} from 'react-native';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import api, { uploadPhoto } from '../../api';
import { getUser } from '../../auth';
import { useTheme } from '../../ThemeContext';
import { OPERATORS } from '../../theme';
import PhotoPicker from '../../components/PhotoPicker';

async function getCurrentLocation() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') throw new Error('Joylashuv ruxsati berilmagan');
  const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  return { lat: loc.coords.latitude, lng: loc.coords.longitude };
}

const EMPTY_FORM = {
  name: '', location: '', phone: '', lat: null, lng: null,
  photos: { outside: null, inside: null, ad: null },
  stock: { beeline: '', ucell: '', uzmobile: '', mobiuz: '', oq: '' },
};

export default function PointsScreen() {
  const { theme, isDark } = useTheme();

  const [points, setPoints]         = useState([]);
  const [myId, setMyId]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [createModal, setCreateModal]       = useState(false);
  const [creating, setCreating]             = useState(false);
  const [gpsLoading, setGpsLoading]         = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(null);
  const [form, setForm]                     = useState(EMPTY_FORM);

  const [addModal, setAddModal]   = useState(false);
  const [addPoint, setAddPoint]   = useState(null);
  const [addSaving, setAddSaving] = useState(false);
  const [addStock, setAddStock]   = useState({ beeline: '', ucell: '', uzmobile: '', mobiuz: '', oq: '' });
  const [addPhotos, setAddPhotos]     = useState({ outside: null, inside: null, ad: null });
  const [addPhotoIds, setAddPhotoIds] = useState({ outside: null, inside: null, ad: null });
  const [addUploading, setAddUploading] = useState(null);

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
      const { url } = await uploadPhoto(localUri);
      setForm(f => ({ ...f, photos: { ...f.photos, [key]: url } }));
    } catch {
    } finally {
      setUploadingPhoto(null);
    }
  };

  // Mavjud tochkaga SIM qo'shish — tashrif rasmi (kamera, Cloudinary)
  const handleAddPhoto = async (key, localUri) => {
    setAddPhotos(p => ({ ...p, [key]: localUri }));
    setAddUploading(key);
    try {
      const { url, public_id } = await uploadPhoto(localUri);
      setAddPhotos(p => ({ ...p, [key]: url }));
      setAddPhotoIds(p => ({ ...p, [key]: public_id }));
    } catch {
      setAddPhotos(p => ({ ...p, [key]: null }));
      Alert.alert('Xato', 'Rasm yuklanmadi, qayta urinib ko\'ring');
    } finally {
      setAddUploading(null);
    }
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.location.trim()) {
      Alert.alert('Xato', 'Ism va manzilni kiriting'); return;
    }
    if (!form.lat) {
      Alert.alert('Xato', 'GPS koordinatani oling'); return;
    }
    if (!form.photos.outside || !form.photos.inside || !form.photos.ad) {
      Alert.alert('Xato', 'Barcha 3 ta rasm majburiy (tashqi, ichki, reklama)'); return;
    }
    const stockEntries = OPERATORS
      .filter(op => parseInt(form.stock[op.key], 10) > 0)
      .map(op => ({ operator: op.key, qty: parseInt(form.stock[op.key], 10) }));

    setCreating(true);
    try {
      await api.post('/points', {
        name: form.name.trim(),
        location: form.location.trim(),
        phone: form.phone.trim() || null,
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
    setAddPhotos({ outside: null, inside: null, ad: null });
    setAddPhotoIds({ outside: null, inside: null, ad: null });
    setAddModal(true);
  };

  // Rasm tayyor = yuklab bo'lingan (http url). Suratga olinayotgan paytda file:// bo'ladi.
  const photoReady = (k) => typeof addPhotos[k] === 'string' && addPhotos[k].startsWith('http');
  const addPhotosReady = photoReady('outside') && photoReady('inside') && photoReady('ad');

  const handleAddStock = async () => {
    const entries = OPERATORS
      .filter(op => parseInt(addStock[op.key], 10) > 0)
      .map(op => ({ operator: op.key, qty: parseInt(addStock[op.key], 10) }));
    if (!entries.length) { Alert.alert('Xato', 'Kamida bitta miqdor kiriting'); return; }
    if (!addPhotosReady) {
      Alert.alert('Rasm kerak', '3 ta rasm ham suratga olinishi shart (tashqi, ichki, reklama)');
      return;
    }

    setAddSaving(true);
    try {
      const loc = await getCurrentLocation();
      await api.patch(`/points/${addPoint.id}`, {
        current_lat: loc.lat, current_lng: loc.lng, stock: entries,
        photo_outside: addPhotos.outside,
        photo_inside:  addPhotos.inside,
        photo_ad:      addPhotos.ad,
        photo_outside_id: addPhotoIds.outside,
        photo_inside_id:  addPhotoIds.inside,
        photo_ad_id:      addPhotoIds.ad,
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
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const cardStyle = [
    styles.card,
    { backgroundColor: theme.surface },
    isDark && { borderWidth: 1, borderColor: theme.border },
    theme.card,
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <LinearGradient colors={theme.headerGrad} style={styles.header}>
        <Text style={styles.headerTitle}>Tochkalar</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => { setForm(EMPTY_FORM); setCreateModal(true); }}>
          <Text style={styles.addBtnText}>+ Yangi</Text>
        </TouchableOpacity>
      </LinearGradient>

      <FlatList
        data={points}
        keyExtractor={p => p.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📍</Text>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Tochkalar yo'q</Text>
            <Text style={[styles.emptySub, { color: theme.textSub }]}>"+ Yangi" tugmasini bosing</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={cardStyle}>
            <View style={styles.cardTop}>
              <View style={styles.cardTitleRow}>
                <Text style={[styles.cardName, { color: theme.text }]}>{item.name}</Text>
                <View style={styles.totalBadge}>
                  <Text style={[styles.totalNum, { color: theme.primary }]}>{pointTotal(item)}</Text>
                  <Text style={[styles.totalLabel, { color: theme.textSub }]}> ta</Text>
                </View>
              </View>
              <Text style={[styles.cardLocation, { color: theme.textSub }]}>📍 {item.location}</Text>
            </View>
            <View style={styles.opGrid}>
              {OPERATORS.map(op => (
                <View key={op.key} style={styles.opCell}>
                  <View style={[styles.opDot, { backgroundColor: op.color }]} />
                  <Text style={[styles.opName, { color: theme.textSub }]}>{op.label}</Text>
                  <Text style={[styles.opQty, { color: theme.text }]}>{stockOf(item, op.key)}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.stockBtn, { backgroundColor: theme.surfaceAlt }]}
              onPress={() => openAddStock(item)}
            >
              <Text style={[styles.stockBtnText, { color: theme.primary }]}>+ Simkarta qo'shish</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <Modal visible={createModal} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[styles.modalBox, { backgroundColor: theme.surface }]}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={[styles.modalTitle, { color: theme.text }]}>Yangi tochka</Text>

              <TextInput
                style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.bg }]}
                placeholder="Tochka nomi (masalan: Yunusobod bozori)"
                placeholderTextColor={theme.textMuted}
                value={form.name}
                onChangeText={v => setForm(f => ({ ...f, name: v }))}
              />
              <TextInput
                style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.bg }]}
                placeholder="Manzil (ko'cha, tuman, shahar)"
                placeholderTextColor={theme.textMuted}
                value={form.location}
                onChangeText={v => setForm(f => ({ ...f, location: v }))}
              />
              <TextInput
                style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.bg }]}
                placeholder="+998 90 123 45 67"
                placeholderTextColor={theme.textMuted}
                value={form.phone}
                onChangeText={v => setForm(f => ({ ...f, phone: v }))}
                keyboardType="phone-pad"
              />

              <TouchableOpacity
                style={[styles.gpsBtn, { borderColor: theme.primary }]}
                onPress={getGps}
                disabled={gpsLoading}
              >
                {gpsLoading
                  ? <ActivityIndicator color={theme.primary} />
                  : <Text style={[styles.gpsBtnText, { color: theme.primary }]}>
                      {form.lat ? `✅ GPS: ${form.lat.toFixed(4)}, ${form.lng.toFixed(4)}` : '📍 GPS olish'}
                    </Text>
                }
              </TouchableOpacity>

              <Text style={[styles.fieldLabel, { color: theme.textSub }]}>RASMLAR (MAJBURIY)</Text>
              <PhotoPicker label="Tashqi ko'rinish" uri={form.photos.outside}
                onPicked={uri => handlePhoto('outside', uri)} uploading={uploadingPhoto === 'outside'} />
              <PhotoPicker label="Ichki ko'rinish" uri={form.photos.inside}
                onPicked={uri => handlePhoto('inside', uri)} uploading={uploadingPhoto === 'inside'} />
              <PhotoPicker label="Reklama materiali" uri={form.photos.ad}
                onPicked={uri => handlePhoto('ad', uri)} uploading={uploadingPhoto === 'ad'} />

              <Text style={[styles.fieldLabel, { marginTop: 4, color: theme.textSub }]}>Boshlang'ich simkartalar</Text>
              {OPERATORS.map(op => (
                <View key={op.key} style={styles.opInputRow}>
                  <View style={[styles.opMini, { backgroundColor: op.color }]}>
                    <Text style={[styles.opMiniText, { color: op.text }]}>{op.label}</Text>
                  </View>
                  <TextInput
                    style={[styles.opInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.bg }]}
                    placeholder="0"
                    placeholderTextColor={theme.textMuted}
                    value={form.stock[op.key]}
                    keyboardType="number-pad"
                    onChangeText={v => setForm(f => ({ ...f, stock: { ...f.stock, [op.key]: v } }))}
                  />
                </View>
              ))}

              <View style={styles.modalBtns}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: theme.border }]}
                  onPress={() => setCreateModal(false)}
                >
                  <Text style={[styles.cancelText, { color: theme.textSub }]}>Bekor</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmBtn, { backgroundColor: theme.primary }]}
                  onPress={handleCreate}
                  disabled={creating || !!uploadingPhoto}
                >
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

      <Modal visible={addModal} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[styles.modalBox, { backgroundColor: theme.surface }]}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={[styles.modalTitle, { color: theme.text }]}>Simkarta qo'shish</Text>
              {addPoint && <Text style={[styles.modalSub, { color: theme.textSub }]}>{addPoint.name}</Text>}
              <Text style={[styles.modalNote, { color: theme.error }]}>GPS avtomatik olinadi — tochka yaqinida bo'ling (100 m)</Text>

              <Text style={[styles.fieldLabel, { color: theme.textSub }]}>3 TA RASM (MAJBURIY, KAMERADAN)</Text>
              <PhotoPicker label="Tashqi ko'rinish" uri={addPhotos.outside}
                onPicked={uri => handleAddPhoto('outside', uri)} uploading={addUploading === 'outside'} />
              <PhotoPicker label="Ichki / SIM joyi" uri={addPhotos.inside}
                onPicked={uri => handleAddPhoto('inside', uri)} uploading={addUploading === 'inside'} />
              <PhotoPicker label="Reklama materiali" uri={addPhotos.ad}
                onPicked={uri => handleAddPhoto('ad', uri)} uploading={addUploading === 'ad'} />

              <Text style={[styles.fieldLabel, { marginTop: 4, color: theme.textSub }]}>Qo'shiladigan simkartalar</Text>
              {OPERATORS.map(op => (
                <View key={op.key} style={styles.opInputRow}>
                  <View style={[styles.opMini, { backgroundColor: op.color }]}>
                    <Text style={[styles.opMiniText, { color: op.text }]}>{op.label}</Text>
                  </View>
                  <TextInput
                    style={[styles.opInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.bg }]}
                    placeholder="0"
                    placeholderTextColor={theme.textMuted}
                    value={addStock[op.key]}
                    keyboardType="number-pad"
                    onChangeText={v => setAddStock(s => ({ ...s, [op.key]: v }))}
                  />
                </View>
              ))}

              {!addPhotosReady && (
                <Text style={[styles.modalNote, { color: theme.textMuted, marginTop: 8 }]}>
                  Qo'shish uchun 3 ta rasm ham suratga olinishi shart
                </Text>
              )}

              <View style={[styles.modalBtns, { marginTop: 8 }]}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: theme.border }]}
                  onPress={() => setAddModal(false)}
                >
                  <Text style={[styles.cancelText, { color: theme.textSub }]}>Bekor</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.confirmBtn,
                    { backgroundColor: theme.primary },
                    (!addPhotosReady || !!addUploading) && { opacity: 0.5 },
                  ]}
                  onPress={handleAddStock}
                  disabled={addSaving || !!addUploading || !addPhotosReady}
                >
                  {addSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmText}>Qo'shish</Text>}
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    paddingTop: 52, paddingBottom: 16, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  addBtn:      { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  addBtnText:  { color: '#fff', fontWeight: '600', fontSize: 14 },

  list: { padding: 12, gap: 10, paddingBottom: 90 },

  empty:      { alignItems: 'center', paddingTop: 80 },
  emptyIcon:  { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '600' },
  emptySub:   { fontSize: 13, marginTop: 4 },

  card:         { borderRadius: 12, padding: 14 },
  cardTop:      { marginBottom: 12 },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardName:     { fontSize: 15, fontWeight: '700', flex: 1 },
  totalBadge:   { flexDirection: 'row', alignItems: 'baseline' },
  totalNum:     { fontSize: 20, fontWeight: '700' },
  totalLabel:   { fontSize: 13 },
  cardLocation: { fontSize: 12, marginTop: 3 },

  opGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  opCell: { alignItems: 'center', flex: 1 },
  opDot:  { width: 10, height: 10, borderRadius: 5, marginBottom: 3 },
  opName: { fontSize: 9, fontWeight: '500' },
  opQty:  { fontSize: 14, fontWeight: '700' },

  stockBtn:     { borderRadius: 8, padding: 10, alignItems: 'center' },
  stockBtnText: { fontWeight: '600', fontSize: 13 },

  overlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalBox: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: 40, maxHeight: '92%',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  modalSub:   { fontSize: 14, marginBottom: 8 },
  modalNote:  { fontSize: 12, marginBottom: 14, lineHeight: 17 },

  input: {
    borderWidth: 1, borderRadius: 10,
    padding: 13, fontSize: 15, marginBottom: 12,
  },
  gpsBtn: {
    borderWidth: 1.5, borderRadius: 10,
    padding: 12, alignItems: 'center', marginBottom: 16,
  },
  gpsBtnText: { fontWeight: '600', fontSize: 14 },

  fieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 10, textTransform: 'uppercase' },

  opInputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 },
  opMini:     { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5, minWidth: 72, alignItems: 'center' },
  opMiniText: { fontSize: 12, fontWeight: '700' },
  opInput:    { flex: 1, borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 15 },

  modalBtns:  { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn:  { flex: 1, borderWidth: 1.5, borderRadius: 10, padding: 14, alignItems: 'center' },
  cancelText: { fontWeight: '600' },
  confirmBtn: { flex: 1, borderRadius: 10, padding: 14, alignItems: 'center' },
  confirmText:{ color: '#fff', fontWeight: '700', fontSize: 15 },
});
