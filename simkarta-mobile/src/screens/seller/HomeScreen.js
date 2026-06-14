import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme';

export default function SellerHome() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Sotuvchi — Bosh sahifa</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  text: { fontSize: 18, color: colors.text },
});
