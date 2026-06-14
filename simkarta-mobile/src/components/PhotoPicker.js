import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../theme';

export default function PhotoPicker({ label, uri, onPicked, uploading }) {
  const pick = async () => {
    Alert.alert(label, 'Rasm qayerdan olinsin?', [
      {
        text: 'Kamera',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') { Alert.alert('Xato', 'Kamera ruxsati kerak'); return; }
          const res = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true });
          if (!res.canceled) onPicked(res.assets[0].uri);
        },
      },
      {
        text: 'Galereya',
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') { Alert.alert('Xato', 'Galereya ruxsati kerak'); return; }
          const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: true });
          if (!res.canceled) onPicked(res.assets[0].uri);
        },
      },
      { text: 'Bekor', style: 'cancel' },
    ]);
  };

  return (
    <TouchableOpacity style={styles.box} onPress={pick} disabled={uploading}>
      {uri ? (
        <>
          <Image source={{ uri }} style={styles.preview} />
          {uploading && (
            <View style={styles.uploadOverlay}>
              <ActivityIndicator color="#fff" />
            </View>
          )}
          <View style={styles.changeBtn}>
            <Text style={styles.changeBtnText}>O'zgartirish</Text>
          </View>
        </>
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderIcon}>📷</Text>
          <Text style={styles.placeholderLabel}>{label}</Text>
          <Text style={styles.placeholderSub}>Bosing</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 10,
    overflow: 'hidden',
    height: 110,
    marginBottom: 10,
  },
  preview: { width: '100%', height: '100%', resizeMode: 'cover' },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  changeBtn: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)', padding: 4, alignItems: 'center',
  },
  changeBtnText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 2 },
  placeholderIcon:  { fontSize: 26 },
  placeholderLabel: { fontSize: 13, fontWeight: '600', color: colors.text },
  placeholderSub:   { fontSize: 11, color: colors.textSecondary },
});
