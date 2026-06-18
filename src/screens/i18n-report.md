# i18n Scan Report

> Generated: 2026-06-03T00:03:06.957Z
> Root: `/Users/onwukwennamdi/Desktop/SkilledProzHirer/src/screens`

## Summary

| Metric | Value |
|--------|-------|
| Files scanned | 51 |
| Files with hardcoded strings | 1 |
| Total hardcoded strings found | 3 |
| Unique translation keys | 3 |
| Target locales | 9 |

## Target Locales

- `en` — English
- `fr` — French
- `ar` — Arabic
- `yo` — Yoruba
- `ha` — Hausa
- `ig` — Igbo
- `sw` — Swahili
- `pt` — Portuguese
- `es` — Spanish

## Files Requiring i18n Work

### `main/SettingsScreen.js`

| Line | Pattern | String |
|------|---------|--------|
| 949 | `prop` | Company Size |
| 1014 | `prop` | Dashboard Currency |
| 1024 | `prop` | Payment Currency |

**Suggested keys:**
```js
// Line 949
t('company_size')  // "Company Size"
// Line 1014
t('dashboard_currency')  // "Dashboard Currency"
// Line 1024
t('payment_currency')  // "Payment Currency"
```

## All Translation Keys

These keys were added to `locales/en.json`. Fill in the other locale files.

| Key | English Value |
|-----|--------------|
| `company_size` | Company Size |
| `dashboard_currency` | Dashboard Currency |
| `payment_currency` | Payment Currency |

## Next Steps

1. Review `locales/en.json` — remove any false positives
2. Fill in translations in `fr.json`, `ar.json`, `yo.json`, `ha.json`, `ig.json`, `sw.json`, `pt.json`, `es.json`
3. Install i18n library: `npx expo install expo-localization i18next react-i18next`
4. Run `node scripts/wrap-i18n.js` to auto-wrap found strings with `t()`
5. Test each locale with `expo start --locale ar`