import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
} from "react";
import { Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { THEMES, FONTS, RADII, SPACING } from "../constants/theme";

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

  const value = useMemo(
    () => ({
      theme,
      mode,
      effectiveMode,
      setMode,
      fonts: FONTS,
      radii: RADII,
      spacing: SPACING,
    }),
    [theme, mode, effectiveMode],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
