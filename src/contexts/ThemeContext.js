// src/contexts/ThemeContext.js
//
// Mobile theme context — EXTENDED with web's `language` + `changeTheme`
// + `changeLanguage` so SettingsScreen.js can port verbatim.
//
// Everything previously exposed (`theme`, `mode`, `effectiveMode`, `setMode`,
// `fonts`, `radii`, `spacing`, `fontScale`, `systemFontScale`,
// `effectiveFontScale`) is preserved. Added: `language`, `changeTheme`,
// `changeLanguage`.

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
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
import * as Localization from "expo-localization";
import client from "../api/client";
import { useAuthStore } from "../store/authStore";

const STORAGE_KEY = "@skilledproz:theme";
const LANG_KEY = "@skilledproz:language";

const ThemeContext = createContext({
  theme: THEMES.dark,
  mode: "system",
  setMode: () => {},
  language: "en",
  changeTheme: () => {},
  changeLanguage: () => {},
});

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState("system");
  const [systemScheme, setSystemScheme] = useState(
    Appearance.getColorScheme() || "dark",
  );
  const [language, setLanguage] = useState(
    () => Localization.getLocales()?.[0]?.languageCode || "en",
  );

  const { width } = useWindowDimensions();
  const { user, updateUser } = useAuthStore();

  // Hydrate stored mode + language
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem(LANG_KEY),
    ])
      .then(([storedMode, storedLang]) => {
        if (
          storedMode === "light" ||
          storedMode === "dark" ||
          storedMode === "system"
        ) {
          setModeState(storedMode);
        }
        if (storedLang) setLanguage(storedLang);
      })
      .catch(() => {});
  }, []);

  // React to OS theme changes
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme || "dark");
    });
    return () => sub.remove();
  }, []);

  // Sync from logged-in user
  useEffect(() => {
    if (!user?.id) return;
    if (
      user.theme &&
      (user.theme === "light" ||
        user.theme === "dark" ||
        user.theme === "system")
    ) {
      setModeState(user.theme);
    }
    if (user.language) {
      setLanguage(user.language);
      AsyncStorage.setItem(LANG_KEY, user.language).catch(() => {});
    }
  }, [user?.id]);

  const setMode = async (next) => {
    setModeState(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, next);
    } catch {}
  };

  // Alias used by SettingsScreen (web name)
  const changeTheme = useCallback(
    async (next) => {
      await setMode(next);
      if (user) {
        try {
          await client.patch("/settings/profile", { theme: next });
          updateUser?.({ theme: next });
        } catch {}
      }
    },
    [user, updateUser],
  );

  const changeLanguage = useCallback(
    async (lang) => {
      setLanguage(lang);
      try {
        await AsyncStorage.setItem(LANG_KEY, lang);
      } catch {}
      if (user) {
        try {
          await client.patch("/settings/profile", { language: lang });
          updateUser?.({ language: lang });
        } catch {}
      }
    },
    [user, updateUser],
  );

  const effectiveMode = mode === "system" ? systemScheme : mode;
  const theme = effectiveMode === "light" ? THEMES.light : THEMES.dark;

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
      // Web parity additions
      language,
      changeTheme,
      changeLanguage,
    }),
    [
      theme,
      mode,
      effectiveMode,
      fontScale,
      systemFontScale,
      effectiveFontScale,
      language,
      changeTheme,
      changeLanguage,
    ],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
