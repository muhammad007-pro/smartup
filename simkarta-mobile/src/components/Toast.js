import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function Toast({ visible, message, type = 'success', duration = 2800 }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    if (!visible) return;
    Animated.parallel([
      Animated.spring(opacity, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 0 }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 4 }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity,     { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(translateY,  { toValue: -20, duration: 300, useNativeDriver: true }),
      ]).start();
    }, duration - 300);

    return () => clearTimeout(timer);
  }, [visible, message]);

  if (!visible) return null;

  const isError = type === 'error';
  const bg    = isError ? '#dc2626' : '#16a34a';
  const icon  = isError ? 'alert-circle' : 'checkmark-circle';

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: bg, opacity, transform: [{ translateY }] },
      ]}
    >
      <Ionicons name={icon} size={20} color="#fff" />
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 48,
    left: 20,
    right: 20,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  text: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
