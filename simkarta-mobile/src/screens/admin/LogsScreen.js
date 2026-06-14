import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import api from '../../api';
import { colors } from '../../theme';

const TYPE_META = {
  point_open:   { icon: '📍', label: 'Tochka ochildi',   color: colors.primary },
  point_update: { icon: '🔄', label: 'Tochka yangilandi', color: '#0066CC' },
  sale:         { icon: '💚', label: 'Sotuv',             color: '#2e7d32' },
  issue:        { icon: '📦', label: 'Simkarta berildi',  color: '#8B2FC9' },
};

function formatDt(iso) {
  const d = new Date(iso);
  const today = new Date().toISOString().slice(0, 10);
  const date  = iso.slice(0, 10) === today ? 'Bugun' : d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' });
  const time  = d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
  return { date, time };
}

export default function LogsScreen() {
  const [logs, setLogs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await api.get('/logs?limit=200');
      setLogs(res.data || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  const onRefresh = () => { setRefreshing(true); fetchLogs(); };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Harakatlar tarixi</Text>
        <Text style={styles.headerSub}>{logs.length} ta yozuv</Text>
      </View>

      <FlatList
        data={logs}
        keyExtractor={l => l.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}><Text style={styles.emptyText}>Harakatlar yo'q</Text></View>
        }
        renderItem={({ item, index }) => {
          const meta = TYPE_META[item.type] || { icon: '📋', label: item.type, color: colors.textSecondary };
          const { date, time } = formatDt(item.created_at);
          const isFirst = index === 0;
          const prevDate = index > 0 ? logs[index - 1].created_at.slice(0, 10) : null;
          const showDate = isFirst || item.created_at.slice(0, 10) !== prevDate;

          return (
            <>
              {showDate && (
                <View style={styles.dateDivider}>
                  <View style={styles.dateLine} />
                  <Text style={styles.dateText}>{date}</Text>
                  <View style={styles.dateLine} />
                </View>
              )}
              <View style={styles.logRow}>
                <View style={[styles.iconBox, { backgroundColor: meta.color + '18' }]}>
                  <Text style={styles.icon}>{meta.icon}</Text>
                </View>
                <View style={styles.logInfo}>
                  <View style={styles.logTop}>
                    <Text style={[styles.logType, { color: meta.color }]}>{meta.label}</Text>
                    <Text style={styles.logTime}>{time}</Text>
                  </View>
                  <Text style={styles.logUser}>{item.user_name}</Text>
                  <Text style={styles.logText} numberOfLines={2}>{item.text}</Text>
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
  container: { flex: 1, backgroundColor: colors.background },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    backgroundColor: colors.primary,
    paddingTop: 52, paddingBottom: 16, paddingHorizontal: 20,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

  list: { paddingVertical: 8, paddingHorizontal: 12, paddingBottom: 90 },

  dateDivider: {
    flexDirection: 'row', alignItems: 'center', marginVertical: 10, gap: 8,
  },
  dateLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dateText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },

  logRow: {
    flexDirection: 'row', backgroundColor: colors.white,
    borderRadius: 10, padding: 12, marginBottom: 6,
    elevation: 1, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2,
  },
  iconBox:  { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  icon:     { fontSize: 18 },
  logInfo:  { flex: 1 },
  logTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logType:  { fontSize: 12, fontWeight: '700' },
  logTime:  { fontSize: 11, color: colors.textSecondary },
  logUser:  { fontSize: 13, fontWeight: '600', color: colors.text, marginTop: 1 },
  logText:  { fontSize: 12, color: colors.textSecondary, marginTop: 2, lineHeight: 16 },

  empty:     { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: colors.textSecondary, fontSize: 16 },
});
