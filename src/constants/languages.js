// src/constants/languages.js
// Languages supported across the SkilledProz ecosystem.
// `rtl: true` flips layouts via I18nManager.

export const LANGUAGES = [
  {
    code: "en",
    name: "English",
    nativeName: "English",
    flag: "🇬🇧",
    rtl: false,
  },
  {
    code: "es",
    name: "Spanish",
    nativeName: "Español",
    flag: "🇪🇸",
    rtl: false,
  },
  {
    code: "fr",
    name: "French",
    nativeName: "Français",
    flag: "🇫🇷",
    rtl: false,
  },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪", rtl: false },
  {
    code: "pt",
    name: "Portuguese",
    nativeName: "Português",
    flag: "🇵🇹",
    rtl: false,
  },
  // {
  //   code: "it",
  //   name: "Italian",
  //   nativeName: "Italiano",
  //   flag: "🇮🇹",
  //   rtl: false,
  // },
  // { code: "ar", name: "Arabic", nativeName: "العربية", flag: "🇸🇦", rtl: true },
  // { code: "he", name: "Hebrew", nativeName: "עברית", flag: "🇮🇱", rtl: true },
  // { code: "ur", name: "Urdu", nativeName: "اردو", flag: "🇵🇰", rtl: true },
  // { code: "hi", name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳", rtl: false },
  // { code: "bn", name: "Bengali", nativeName: "বাংলা", flag: "🇧🇩", rtl: false },
  // { code: "ja", name: "Japanese", nativeName: "日本語", flag: "🇯🇵", rtl: false },
  // { code: "ko", name: "Korean", nativeName: "한국어", flag: "🇰🇷", rtl: false },
  // { code: "ru", name: "Russian", nativeName: "Русский", flag: "🇷🇺", rtl: false },
  // { code: "tr", name: "Turkish", nativeName: "Türkçe", flag: "🇹🇷", rtl: false },
  // { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia", flag: "🇮🇩", rtl: false },
  // { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt", flag: "🇻🇳", rtl: false },
  // { code: "sw", name: "Swahili", nativeName: "Kiswahili", flag: "🇰🇪", rtl: false },
  { code: "zh", name: "Chinese", nativeName: "中文", flag: "🇨🇳", rtl: false },
  { code: "yo", name: "Yoruba", nativeName: "Yorùbá", flag: "🇳🇬", rtl: false },
  { code: "ig", name: "Igbo", nativeName: "Igbo", flag: "🇳🇬", rtl: false },
  { code: "ha", name: "Hausa", nativeName: "Hausa", flag: "🇳🇬", rtl: false },
];

export const getLanguage = (code) =>
  LANGUAGES.find((l) => l.code === code) || LANGUAGES[0];
