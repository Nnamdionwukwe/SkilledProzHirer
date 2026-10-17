// src/contexts/ThemeContext.js
//
// Exposes theme, mode, setMode, fonts, radii, spacing, AND
// fontScale / systemFontScale / effectiveFontScale. AppText and
// any consumer that needs proportional sizing multiplies by
// effectiveFontScale.

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
} from "react";
import { Appearance, useWindowDimensions, PixelRatio } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  THEMES,
  FONTS,
  RADII,
  SPACING,
  fontScaleFor,
} from "../constants/theme";

const STORAGE_KEY = "@skilledproz:theme";
const ThemeContext = createContext({
  theme: THEMES.dark,
  mode: "system",
  setMode: () => {},
});

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState("system");
  const [systemScheme, setSystemScheme] = useState(
    Appearance.getColorScheme() || "dark",
  );

  // Reactive width so fontScale updates on rotation / foldables
  const { width } = useWindowDimensions();

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved === "light" || saved === "dark" || saved === "system")
          setModeState(saved);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme || "dark");
    });
    return () => sub.remove();
  }, []);

  const setMode = async (next) => {
    setModeState(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, next);
    } catch {}
  };

  const effectiveMode = mode === "system" ? systemScheme : mode;
  const theme = effectiveMode === "light" ? THEMES.light : THEMES.dark;

  // Font scale — combines our breakpoint scale with the OS accessibility scale
  const fontScale = fontScaleFor(width);
  const systemFontScale = PixelRatio.getFontScale() || 1.0;
  const effectiveFontScale = fontScale * systemFontScale;

  const value = useMemo(
    () => ({
      theme,
      mode,
      effectiveMode,
      setMode,
      fonts: FONTS,
      radii: RADII,
      spacing: SPACING,
      fontScale,
      systemFontScale,
      effectiveFontScale,
    }),
    [
      theme,
      mode,
      effectiveMode,
      fontScale,
      systemFontScale,
      effectiveFontScale,
    ],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
