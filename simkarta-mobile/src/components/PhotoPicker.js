import React from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';

export default function PhotoPicker({ label, uri, onPicked, uploading }) {
  const { theme } = useTheme();

  const pick = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Xato', 'Kamera ruxsati kerak'); return; }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true });
    if (!res.canceled) onPicked(res.assets[0].uri);
  };

  return (
    <TouchableOpacity
      style={[
        styles.box,
        {
          backgroundColor: theme.surface,
          borderColor: uri ? theme.primary : theme.border,
        },
      ]}
      onPress={pick}
      disabled={uploading}
      activeOpacity={0.8}
    >
      {uri ? (
        <>
          <Image source={{ uri }} style={styles.preview} />

          {/* Upload spinner overlay */}
          {uploading && (
            <View style={styles.uploadOverlay}>
              <ActivityIndicator color="#fff" size="large" />
            </View>
          )}

          {/* Change label at bottom */}
          <View style={styles.changeBtn}>
            <Text style={styles.changeBtnText}>O'zgartirish</Text>
          </View>
        </>
      ) : (
        <View style={styles.placeholder}>
          <Ionicons name="camera-outline" size={30} color={theme.textMuted} />
          <Text style={[styles.placeholderLabel, { color: theme.text }]}>{label}</Text>
          <Text style={[styles.placeholderSub, { color: theme.textMuted }]}>
            Bosib suratga oling
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 12,
    overflow: 'hidden',
    height: 120,
    marginBottom: 10,
  },
  preview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  changeBtn: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingVertical: 5,
    alignItems: 'center',
  },
  changeBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  placeholderLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  placeholderSub: {
    fontSize: 11,
  },
});
