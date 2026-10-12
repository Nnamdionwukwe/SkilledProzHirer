// src/i18n/index.js
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";

import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import ar from "./locales/ar.json";
import pt from "./locales/pt.json";
import zh from "./locales/zh.json";
import ha from "./locales/ha.json";
import yo from "./locales/yo.json";
import ig from "./locales/ig.json";
import de from "./locales/de.json";
import it from "./locales/it.json";
import hi from "./locales/hi.json";

const resources = {
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
  ar: { translation: ar },
  pt: { translation: pt },
  zh: { translation: zh },
  ha: { translation: ha },
  yo: { translation: yo },
  ig: { translation: ig },
  de: { translation: de },
  it: { translation: it },
  hi: { translation: hi },
};

const LANG_KEY = "@skilledproz:lang";

export async function initI18n() {
  let savedLang = null;
  try {
    savedLang = await AsyncStorage.getItem(LANG_KEY);
  } catch {}

  const deviceLang = Localization.getLocales()[0]?.languageCode || "en";
  // Fall back to "en" if device language has no locale file
  const supported = Object.keys(resources);
  const lng =
    savedLang && supported.includes(savedLang)
      ? savedLang
      : supported.includes(deviceLang)
        ? deviceLang
        : "en";

  await i18n.use(initReactI18next).init({
    resources,
    lng,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
    compatibilityJSON: "v3",
  });

  return i18n;
}

export async function changeLanguage(code) {
  await i18n.changeLanguage(code);
  try {
    await AsyncStorage.setItem(LANG_KEY, code);
  } catch {}
}

export default i18n;
