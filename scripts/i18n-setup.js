#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// i18n-setup.js — Generates the i18n config files for the Expo app
// ─────────────────────────────────────────────────────────────────────────────
// Run ONCE to scaffold the i18n infrastructure.
// Creates:
//   src/i18n/index.js         ← i18next config (import this in App.js)
//   src/i18n/useAppLocale.js  ← hook to get/set locale + persist to AsyncStorage
//   locales/en.json           ← (created by scan-i18n.js — don't overwrite)
//
// USAGE:  node scripts/i18n-setup.js
// ─────────────────────────────────────────────────────────────────────────────

import fs from "fs";
import path from "path";

const ROOT = path.resolve(".");
const I18N_DIR = path.join(ROOT, "src", "i18n");
fs.mkdirSync(I18N_DIR, { recursive: true });

// ── src/i18n/index.js ─────────────────────────────────────────────────────────
const I18N_CONFIG = `// src/i18n/index.js
// i18next configuration for SkilledProz Expo app
// Supports 9 locales: en, fr, ar, yo, ha, ig, sw, pt, es

import i18n             from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

// Import all locale JSON files
import en from '../../locales/en.json';
import fr from '../../locales/fr.json';
import ar from '../../locales/ar.json';
import yo from '../../locales/yo.json';
import ha from '../../locales/ha.json';
import ig from '../../locales/ig.json';
import sw from '../../locales/sw.json';
import pt from '../../locales/pt.json';
import es from '../../locales/es.json';

export const LOCALES = [
  { code: 'en', name: 'English',     nativeName: 'English',    rtl: false },
  { code: 'fr', name: 'French',      nativeName: 'Français',   rtl: false },
  { code: 'ar', name: 'Arabic',      nativeName: 'العربية',    rtl: true  },
  { code: 'yo', name: 'Yoruba',      nativeName: 'Yorùbá',     rtl: false },
  { code: 'ha', name: 'Hausa',       nativeName: 'Hausa',      rtl: false },
  { code: 'ig', name: 'Igbo',        nativeName: 'Igbo',       rtl: false },
  { code: 'sw', name: 'Swahili',     nativeName: 'Kiswahili',  rtl: false },
  { code: 'pt', name: 'Portuguese',  nativeName: 'Português',  rtl: false },
  { code: 'es', name: 'Spanish',     nativeName: 'Español',    rtl: false },
];

const resources = { en, fr, ar, yo, ha, ig, sw, pt, es };

// Device locale → our supported locale (fallback: 'en')
function resolveLocale() {
  const deviceLocale = Localization.getLocales?.()?.[0]?.languageCode ?? 'en';
  return resources[deviceLocale] ? deviceLocale : 'en';
}

i18n
  .use(initReactI18next)
  .init({
    resources: Object.fromEntries(
      Object.entries(resources).map(([code, translations]) => [
        code,
        { translation: translations },
      ])
    ),
    lng:           resolveLocale(),
    fallbackLng:   'en',
    interpolation: { escapeValue: false },
    // RTL support — set I18nManager.allowRTL in App.js based on this
    compatibilityJSON: 'v4',
  });

export default i18n;
`;

// ── src/i18n/useAppLocale.js ──────────────────────────────────────────────────
const USE_LOCALE = `// src/i18n/useAppLocale.js
// Hook to read and change the app locale, persisted in AsyncStorage

import { useCallback }      from 'react';
import { useTranslation }   from 'react-i18next';
import { I18nManager }      from 'react-native';
import AsyncStorage         from '@react-native-async-storage/async-storage';
import * as Updates         from 'expo-updates';
import { LOCALES }          from './index';

const STORAGE_KEY = '@skilledproz_locale';

export function useAppLocale() {
  const { i18n } = useTranslation();

  const currentLocale = LOCALES.find((l) => l.code === i18n.language) ?? LOCALES[0];
  const isRTL = currentLocale.rtl;

  const changeLocale = useCallback(async (code) => {
    const locale = LOCALES.find((l) => l.code === code);
    if (!locale) return;

    await i18n.changeLanguage(code);
    await AsyncStorage.setItem(STORAGE_KEY, code);

    // RTL languages (Arabic) need a full restart to flip layout
    if (locale.rtl !== I18nManager.isRTL) {
      I18nManager.allowRTL(locale.rtl);
      I18nManager.forceRTL(locale.rtl);
      await Updates.reloadAsync().catch(() => {});
    }
  }, [i18n]);

  const loadSavedLocale = useCallback(async () => {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved && saved !== i18n.language) {
      await i18n.changeLanguage(saved);
    }
  }, [i18n]);

  return { currentLocale, isRTL, changeLocale, loadSavedLocale, locales: LOCALES };
}
`;

// ── App.js snippet ────────────────────────────────────────────────────────────
const APP_SNIPPET = `// ── Add to your App.js (or _layout.tsx for Expo Router) ──────────────────────
// 1. Import i18n before anything else:
import './src/i18n/index.js';

// 2. Load saved locale on startup:
import { useAppLocale } from './src/i18n/useAppLocale';

export default function App() {
  const { loadSavedLocale } = useAppLocale();

  useEffect(() => {
    loadSavedLocale();
  }, []);

  // ... rest of your App
}
`;

// ── Language picker component ─────────────────────────────────────────────────
const LANG_PICKER = `// src/components/LanguagePicker.jsx
// Drop anywhere in settings screen

import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { useAppLocale } from '../i18n/useAppLocale';

export default function LanguagePicker() {
  const { currentLocale, changeLocale, locales } = useAppLocale();

  return (
    <FlatList
      data={locales}
      keyExtractor={(item) => item.code}
      renderItem={({ item }) => {
        const active = item.code === currentLocale.code;
        return (
          <TouchableOpacity
            style={[styles.item, active && styles.itemActive]}
            onPress={() => changeLocale(item.code)}
          >
            <Text style={[styles.name, active && styles.nameActive]}>
              {item.nativeName}
            </Text>
            <Text style={styles.sub}>{item.name}</Text>
            {active && <Text style={styles.check}>✓</Text>}
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  item:       { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 0.5, borderColor: '#222' },
  itemActive: { backgroundColor: 'rgba(249,115,22,0.1)' },
  name:       { flex: 1, fontSize: 15, fontWeight: '600', color: '#fff' },
  nameActive: { color: '#f97316' },
  sub:        { fontSize: 12, color: '#888', marginRight: 8 },
  check:      { color: '#f97316', fontWeight: '800' },
});
`;

// ── Write files ───────────────────────────────────────────────────────────────
const filesToWrite = [
  [path.join(I18N_DIR, "index.js"), I18N_CONFIG],
  [path.join(I18N_DIR, "useAppLocale.js"), USE_LOCALE],
  [path.join(ROOT, "src", "i18n", "App.snippet.js"), APP_SNIPPET],
  [path.join(ROOT, "src", "components", "LanguagePicker.jsx"), LANG_PICKER],
];

for (const [fp, content] of filesToWrite) {
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  if (!fs.existsSync(fp)) {
    fs.writeFileSync(fp, content, "utf8");
    console.log(`✅  Created: ${path.relative(ROOT, fp)}`);
  } else {
    console.log(`⏭️   Skipped (already exists): ${path.relative(ROOT, fp)}`);
  }
}

console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅  i18n SCAFFOLD COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Next steps:
  1. npx expo install expo-localization i18next react-i18next @react-native-async-storage/async-storage
  2. node scripts/scan-i18n.js      → find all hardcoded strings
  3. Fill in locales/fr.json etc.   → add translations
  4. node scripts/wrap-i18n.js      → dry run (preview replacements)
  5. node scripts/wrap-i18n.js --write → apply replacements
  6. Add import './src/i18n/index.js' to App.js
  7. npx expo start
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
