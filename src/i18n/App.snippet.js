// ── Add to your App.js (or _layout.tsx for Expo Router) ──────────────────────
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
