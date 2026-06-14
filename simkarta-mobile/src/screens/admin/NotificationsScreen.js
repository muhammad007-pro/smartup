import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api';
import { useTheme } from '../../ThemeContext';

function pad(n) { return String(n).padStart(2, '0'); }
function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const TYPE_META = {
  point_open:   { icon: 'storefront',  color: '#1b8a5a', label: 'Yangi tochka' },
  point_update: { icon: 'refresh-circle', color: '#0066CC', label: 'Tochka yangilandi' },
};

export default function NotificationsScreen({ navigation }) {
  const { theme, isDark } = useTheme();

  const [items,      setItems]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get('/notifications');
      setItems(res.data || []);
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]));

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const markAllRead = async () => {
    try {
      await api.post('/notifications/read_all');
      setItems(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch {}
  };

  const markRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setItems(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch {}
  };

  const openPoint = (item) => {
    if (item.point_id) {
      navigation.navigate('AdminPointDetail', { pointId: item.point_id, pointName: item.title });
    }
    if (!item.is_read) markRead(item.id);
  };

  const cardStyle = isDark
    ? { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }
    : { backgroundColor: theme.surface, ...theme.card };

  const renderItem = ({ item }) => {
    const meta = TYPE_META[item.type] || { icon: 'notifications', color: theme.primary, label: item.type };
    return (
      <TouchableOpacity
        style={[styles.card, cardStyle, !item.is_read && { borderLeftWidth: 3, borderLeftColor: meta.color }]}
        onPress={() => openPoint(item)}
        activeOpacity={0.75}
      >
        <View style={[styles.iconWrap, { backgroundColor: meta.color + '18' }]}>
          <Ionicons name={meta.icon + '-outline'} size={22} color={meta.color} />
        </View>
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
              {item.title}
            </Text>
            {!item.is_read && (
              <View style={[styles.dot, { backgroundColor: meta.color }]} />
            )}
          </View>
          <Text style={[styles.cardBody2, { color: theme.textSub }]} numberOfLines={2}>
            {item.body}
          </Text>
          <Text style={[styles.cardDate, { color: theme.textMuted }]}>{fmtDate(item.created_at)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const unread = items.filter(n => !n.is_read).length;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <LinearGradient colors={theme.headerGrad} style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Bildirishnomalar</Text>
            {unread > 0 && (
              <Text style={styles.headerSub}>{unread} ta yangi</Text>
            )}
          </View>
          {unread > 0 && (
            <TouchableOpacity style={styles.readAllBtn} onPress={markAllRead} activeOpacity={0.8}>
              <Text style={styles.readAllText}>Barchasini o'qildi</Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={n => n.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="notifications-off-outline" size={48} color={theme.textMuted} />
              <Text style={[styles.emptyText, { color: theme.textSub }]}>Bildirishnomalar yo'q</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 52, paddingBottom: 16, paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  readAllBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  readAllText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  list: { padding: 12, gap: 10, paddingBottom: 90 },
  card: {
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  cardTitle: { fontSize: 14, fontWeight: '700', flex: 1 },
  cardBody2: { fontSize: 13, lineHeight: 18 },
  cardDate: { fontSize: 11, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15 },
});
