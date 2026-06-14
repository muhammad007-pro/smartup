import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../ThemeContext';

const PRESETS = [
  { key: 'all',    label: 'Hammasi' },
  { key: 'today',  label: 'Bugun' },
  { key: 'week',   label: 'Bu hafta' },
  { key: 'month',  label: 'Bu oy' },
  { key: 'custom', label: 'Maxsus' },
];

const pad = n => String(n).padStart(2, '0');
const toISO  = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const toDisp = d => d ? `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()}` : '—';
const fromISO = s => s ? new Date(s + 'T00:00:00') : new Date();

function getPresetRange(key) {
  const now = new Date();
  const today = toISO(now);
  if (key === 'today') return { dateFrom: today, dateTo: today };
  if (key === 'week') {
    const dow = now.getDay() || 7;
    const mon = new Date(now); mon.setDate(now.getDate() - dow + 1);
    return { dateFrom: toISO(mon), dateTo: today };
  }
  if (key === 'month') {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    return { dateFrom: toISO(first), dateTo: today };
  }
  return { dateFrom: null, dateTo: null };
}

export default function DateRangePicker({ value, onChange }) {
  const { theme } = useTheme();
  const activePreset = value?.preset || 'all';

  const [showPicker, setShowPicker] = useState(null); // 'from' | 'to' | null
  const [customFrom, setCustomFrom] = useState(fromISO(value?.dateFrom));
  const [customTo,   setCustomTo]   = useState(fromISO(value?.dateTo));

  const selectPreset = (key) => {
    if (key === 'custom') {
      onChange({ preset: 'custom', dateFrom: toISO(customFrom), dateTo: toISO(customTo) });
      return;
    }
    onChange({ preset: key, ...getPresetRange(key) });
  };

  const onPickerChange = (event, date) => {
    if (Platform.OS === 'android') setShowPicker(null);
    if (!date || event.type === 'dismissed') return;

    if (showPicker === 'from') {
      setCustomFrom(date);
      const df = toISO(date);
      const dt = toISO(customTo);
      onChange({ preset: 'custom', dateFrom: df, dateTo: dt >= df ? dt : df });
    } else {
      setCustomTo(date);
      onChange({ preset: 'custom', dateFrom: toISO(customFrom), dateTo: toISO(date) });
    }
    if (Platform.OS === 'ios') setShowPicker(null);
  };

  return (
    <View>
      {/* Preset chips — horizontal scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {PRESETS.map(p => {
          const isActive = activePreset === p.key;
          return (
            <TouchableOpacity
              key={p.key}
              style={[
                styles.chip,
                {
                  backgroundColor: isActive ? theme.primary : theme.surface,
                  borderColor: isActive ? theme.primary : theme.border,
                },
              ]}
              onPress={() => selectPreset(p.key)}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: isActive ? '#ffffff' : theme.textSub },
                ]}
              >
                {p.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Maxsus sana tanlash */}
      {activePreset === 'custom' && (
        <View style={styles.customRow}>
          <TouchableOpacity
            style={[
              styles.dateBtn,
              { backgroundColor: theme.surface, borderColor: theme.primary },
            ]}
            onPress={() => setShowPicker('from')}
            activeOpacity={0.75}
          >
            <Text style={[styles.dateBtnLabel, { color: theme.textSub }]}>Dan:</Text>
            <Text style={[styles.dateBtnValue, { color: theme.primary }]}>
              {toDisp(customFrom)}
            </Text>
          </TouchableOpacity>

          <Text style={[styles.dateSep, { color: theme.textMuted }]}>→</Text>

          <TouchableOpacity
            style={[
              styles.dateBtn,
              { backgroundColor: theme.surface, borderColor: theme.primary },
            ]}
            onPress={() => setShowPicker('to')}
            activeOpacity={0.75}
          >
            <Text style={[styles.dateBtnLabel, { color: theme.textSub }]}>Gacha:</Text>
            <Text style={[styles.dateBtnValue, { color: theme.primary }]}>
              {toDisp(customTo)}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* DateTimePicker */}
      {showPicker && (
        <DateTimePicker
          value={showPicker === 'from' ? customFrom : customTo}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={new Date()}
          onChange={onPickerChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },

  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  dateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  dateBtnLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  dateBtnValue: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  dateSep: {
    fontSize: 16,
  },
});
