import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { LIGHT, DARK } from './theme';

const ThemeCtx = createContext({ theme: LIGHT, isDark: false, toggleDark: () => {} });

export function ThemeProvider({ children }) {
  const system = useColorScheme();
  const [isDark, setIsDark] = useState(system === 'dark');

  useEffect(() => {
    SecureStore.getItemAsync('simkarta_dark').then(val => {
      if (val !== null) setIsDark(val === '1');
      else setIsDark(system === 'dark');
    });
  }, []);

  const toggleDark = async () => {
    const next = !isDark;
    setIsDark(next);
    await SecureStore.setItemAsync('simkarta_dark', next ? '1' : '0');
  };

  return (
    <ThemeCtx.Provider value={{ theme: isDark ? DARK : LIGHT, isDark, toggleDark }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export const useTheme = () => useContext(ThemeCtx);
