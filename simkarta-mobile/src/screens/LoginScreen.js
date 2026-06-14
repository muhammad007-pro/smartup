import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import api from '../api';
import { saveToken, saveUser } from '../auth';
import { useTheme } from '../ThemeContext';

export default function LoginScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);

  async function handleLogin() {
    if (!phone.trim() || !password.trim()) {
      Alert.alert('Xato', 'Telefon va parolni kiriting');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { phone, password });
      await saveToken(res.data.access_token);
      await saveUser(res.data.user);

      const role = res.data.user.role;
      if (role === 'admin') navigation.replace('AdminTabs');
      else if (role === 'agent') navigation.replace('AgentTabs');
      else navigation.replace('SellerTabs');
    } catch (err) {
      const msg = err.response?.data?.detail || 'Ulanishda xatolik';
      Alert.alert('Kirish xatosi', msg);
    } finally {
      setLoading(false);
    }
  }

  const cardStyle = [
    styles.card,
    { backgroundColor: theme.surface },
    isDark
      ? { borderWidth: 1, borderColor: theme.border }
      : theme.cardLg,
  ];

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.primary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoArea}>
          <View style={[styles.logoCircle, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
            <Text style={styles.logoEmoji}>📶</Text>
          </View>
          <Text style={styles.logoTitle}>SimKarta</Text>
          <Text style={styles.logoSub}>SIM karta boshqaruv tizimi</Text>
        </View>

        <View style={cardStyle}>
          <Text style={[styles.cardHeading, { color: theme.text }]}>Tizimga kirish</Text>
          <Text style={[styles.cardSubheading, { color: theme.textMuted }]}>
            Hisobingizga kiring
          </Text>

          <View style={styles.fieldWrapper}>
            <Text style={[styles.label, { color: theme.textSub }]}>Telefon raqam</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.surfaceAlt,
                  borderColor: phoneFocused ? theme.borderFocus : theme.border,
                  color: theme.text,
                },
              ]}
              placeholder="+998 90 123 45 67"
              placeholderTextColor={theme.textMuted}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              autoCapitalize="none"
              onFocus={() => setPhoneFocused(true)}
              onBlur={() => setPhoneFocused(false)}
            />
          </View>

          <View style={styles.fieldWrapper}>
            <Text style={[styles.label, { color: theme.textSub }]}>Parol</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.surfaceAlt,
                  borderColor: passFocused ? theme.borderFocus : theme.border,
                  color: theme.text,
                },
              ]}
              placeholder="Parolni kiriting"
              placeholderTextColor={theme.textMuted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              onFocus={() => setPassFocused(true)}
              onBlur={() => setPassFocused(false)}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: theme.primary },
              loading && styles.buttonDisabled,
            ]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.75}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Kirish</Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  logoEmoji: {
    fontSize: 34,
  },
  logoTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  logoSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  card: {
    borderRadius: 20,
    padding: 28,
  },
  cardHeading: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardSubheading: {
    fontSize: 14,
    marginBottom: 24,
  },
  fieldWrapper: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
