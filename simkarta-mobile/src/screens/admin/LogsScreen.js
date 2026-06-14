import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../api';
import { useTheme } from '../../ThemeContext';

const TYPE_META = {
  point_open:   { icon: '📍', label: 'Tochka ochildi',    color: '#1b8a5a' },
  point_update: { icon: '🔄', label: 'Tochka yangilandi', color: '#0066CC' },
  sale:         { icon: '💚', label: 'Sotuv',              color: '#2e7d32' },
  issue:        { icon: '📦', label: 'Simkarta berildi',   color: '#8B2FC9' },
};

function formatDt(iso) {
  const d = new Date(iso);
  const today = new Date().toISOString().slice(0, 10);
  const date  = iso.slice(0, 10) === today
    ? 'Bugun'
    : d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' });
  const time  = d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
  return { date, time };
}

export default function LogsScreen() {
  const { theme, isDark } = useTheme();
  const [logs, setLogs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await api.get('/logs?limit=200');
      setLogs(res.data || []);
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  const onRefresh = () => { setRefreshing(true); fetchLogs(); };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const rowShadow = isDark
    ? { borderWidth: 1, borderColor: theme.border }
    : theme.card;

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <LinearGradient colors={theme.headerGrad} style={styles.header}>
        <Text style={styles.headerTitle}>Harakatlar tarixi</Text>
        <Text style={styles.headerSub}>{logs.length} ta yozuv</Text>
      </LinearGradient>

      <FlatList
        data={logs}
        keyExtractor={l => l.id}
        contentContainerStyle={[styles.list, logs.length === 0 && styles.listEmpty]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Harakatlar yo'q</Text>
            <Text style={[styles.emptySub, { color: theme.textMuted }]}>Tizim faoliyati bu yerda ko'rinadi</Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const meta = TYPE_META[item.type] || { icon: '📋', label: item.type, color: theme.textSub };
          const { date, time } = formatDt(item.created_at);
          const isFirst  = index === 0;
          const prevDate = index > 0 ? logs[index - 1].created_at.slice(0, 10) : null;
          const showDate = isFirst || item.created_at.slice(0, 10) !== prevDate;

          return (
            <>
              {showDate && (
                <View style={styles.dateDivider}>
                  <View style={[styles.dateLine, { backgroundColor: theme.border }]} />
                  <Text style={[styles.dateText, { color: theme.textSub, backgroundColor: theme.bg }]}>
                    {date}
                  </Text>
                  <View style={[styles.dateLine, { backgroundColor: theme.border }]} />
                </View>
              )}
              <View style={[styles.logRow, { backgroundColor: theme.surface }, rowShadow]}>
                <View style={[styles.iconBubble, { backgroundColor: meta.color + '1a' }]}>
                  <Text style={styles.iconText}>{meta.icon}</Text>
                </View>
                <View style={styles.logInfo}>
                  <View style={styles.logTopRow}>
                    <Text style={[styles.logType, { color: meta.color }]}>{meta.label}</Text>
                    <Text style={[styles.logTime, { color: theme.textMuted }]}>{time}</Text>
                  </View>
                  <Text style={[styles.logUser, { color: theme.text }]}>{item.user_name}</Text>
                  <Text style={[styles.logText, { color: theme.textSub }]} numberOfLines={2}>
                    {item.text}
                  </Text>
                </View>
              </View>
            </>
          );
        }}
      />
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

  list:      { paddingVertical: 10, paddingHorizontal: 14, paddingBottom: 90 },
  listEmpty: { flex: 1 },

  dateDivider: {
    flexDirection: 'row', alignItems: 'center',
    marginVertical: 12, gap: 8,
  },
  dateLine: { flex: 1, height: 1 },
  dateText: {
    fontSize: 12, fontWeight: '700',
    paddingHorizontal: 8,
  },

  logRow: {
    flexDirection: 'row',
    borderRadius: 12, padding: 13, marginBottom: 6,
  },
  iconBubble: {
    width: 42, height: 42, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  iconText:   { fontSize: 20 },
  logInfo:    { flex: 1 },
  logTopRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  logType:    { fontSize: 12, fontWeight: '800' },
  logTime:    { fontSize: 11 },
  logUser:    { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  logText:    { fontSize: 12, lineHeight: 17 },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIcon:  { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptySub:   { fontSize: 14, textAlign: 'center', paddingHorizontal: 40, lineHeight: 20 },
});
