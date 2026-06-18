// src/i18n/useAppLocale.js
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
