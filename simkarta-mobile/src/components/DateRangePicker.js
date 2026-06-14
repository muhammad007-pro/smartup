import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  TextInput, Platform, KeyboardAvoidingView,
} from 'react-native';
import { colors } from '../theme';

const PRESETS = [
  { key: 'all',   label: 'Hammasi' },
  { key: 'today', label: 'Bugun' },
  { key: 'week',  label: 'Bu hafta' },
  { key: 'month', label: 'Bu oy' },
  { key: 'custom', label: 'Maxsus' },
];

function toISO(ddmmyyyy) {
  if (!ddmmyyyy || ddmmyyyy.length !== 10) return null;
  const [d, m, y] = ddmmyyyy.split('.');
  if (!d || !m || !y) return null;
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function toDisplay(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  return `${d}.${m}.${y}`;
}

function getRangeDates(preset) {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const fmt = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = fmt(now);

  if (preset === 'today') return { dateFrom: today, dateTo: today };
  if (preset === 'week') {
    const dow = now.getDay() || 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - dow + 1);
    return { dateFrom: fmt(monday), dateTo: today };
  }
  if (preset === 'month') {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    return { dateFrom: fmt(first), dateTo: today };
  }
  return { dateFrom: null, dateTo: null };
}

export default function DateRangePicker({ value, onChange }) {
  const [showCustom, setShowCustom] = useState(false);
  const [fromInput, setFromInput] = useState(toDisplay(value?.dateFrom));
  const [toInput, setToInput]   = useState(toDisplay(value?.dateTo));

  const activePreset = value?.preset || 'all';

  const selectPreset = (key) => {
    if (key === 'custom') {
      setFromInput(toDisplay(value?.dateFrom));
      setToInput(toDisplay(value?.dateTo));
      setShowCustom(true);
      return;
    }
    const range = getRangeDates(key);
    onChange({ preset: key, ...range });
  };

  const applyCustom = () => {
    const df = toISO(fromInput);
    const dt = toISO(toInput);
    onChange({ preset: 'custom', dateFrom: df || null, dateTo: dt || null });
    setShowCustom(false);
  };

  return (
    <View>
      <View style={styles.row}>
        {PRESETS.map(p => (
          <TouchableOpacity
            key={p.key}
            style={[styles.chip, activePreset === p.key && styles.chipActive]}
            onPress={() => selectPreset(p.key)}
          >
            <Text style={[styles.chipText, activePreset === p.key && styles.chipTextActive]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activePreset === 'custom' && value?.dateFrom && (
        <Text style={styles.rangeLabel}>
          {toDisplay(value.dateFrom)}{value.dateTo ? ` — ${toDisplay(value.dateTo)}` : ''}
        </Text>
      )}

      <Modal visible={showCustom} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Sana oralig'i</Text>
            <Text style={styles.modalLabel}>Dan (KK.OO.YYYY)</Text>
            <TextInput
              style={styles.input}
              placeholder="01.01.2026"
              placeholderTextColor={colors.textSecondary}
              value={fromInput}
              onChangeText={setFromInput}
              keyboardType="number-pad"
            />
            <Text style={styles.modalLabel}>Gacha (KK.OO.YYYY)</Text>
            <TextInput
              style={styles.input}
              placeholder="31.12.2026"
              placeholderTextColor={colors.textSecondary}
              value={toInput}
              onChangeText={setToInput}
              keyboardType="number-pad"
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCustom(false)}>
                <Text style={styles.cancelText}>Bekor</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={applyCustom}>
                <Text style={styles.applyText}>Qo'llash</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 16, paddingVertical: 10 },
  chip: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
    backgroundColor: colors.white,
  },
  chipActive:     { borderColor: colors.primary, backgroundColor: '#e8f5ee' },
  chipText:       { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: colors.primary },
  rangeLabel:     { fontSize: 12, color: colors.primary, fontWeight: '600', paddingHorizontal: 16, marginBottom: 4 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: 40,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 16 },
  modalLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 6, textTransform: 'uppercase' },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    padding: 13, fontSize: 15, color: colors.text,
    backgroundColor: colors.background, marginBottom: 14,
  },
  modalBtns:  { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn:  { flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, padding: 14, alignItems: 'center' },
  cancelText: { fontWeight: '600', color: colors.textSecondary },
  applyBtn:   { flex: 1, backgroundColor: colors.primary, borderRadius: 10, padding: 14, alignItems: 'center' },
  applyText:  { color: '#fff', fontWeight: '700', fontSize: 15 },
});
