# SkilledProz Hirer — React Native (Expo) App

The Hirer-side mobile app for SkilledProz. Mirrors the website's design system, supports dark/light themes, multi-language (i18n), and multi-currency.

Talks to the same backend as the website: `https://skilledpro-backend-production.up.railway.app/api`.

---

## Setup

```bash
cd SkilledProzHirer
npm install
npx expo start
```

Press `i` for iOS simulator, `a` for Android emulator, or scan the QR with **Expo Go**.

The API URL is read from `app.json → expo.extra.API_URL`. Override it for local dev by editing that file or using `EXPO_PUBLIC_*` env vars.

---

## Project structure

```
src/
  api/client.js              # axios + token refresh + tokenStore (SecureStore)
  components/                # AppText, AppButton, AppInput, AppScreen, AppCurrency, etc.
  constants/                 # theme tokens, currency list, language list
  contexts/                  # ThemeContext, CurrencyContext, ToastContext
  i18n/                      # i18next config + locale JSON files
  navigation/                # Root, Auth, Hirer stacks
  screens/auth/              # Login, Welcome, Register, ForgotPassword, VerifyEmail
  screens/main/              # HomeScreen (placeholder for the Hirer dashboard)
  store/authStore.js         # Zustand store mirroring the website's auth shape
  utils/validators.js
App.js                       # providers + font loading + i18n init
```

---

## The four pillars (use these everywhere)

### 1. Theming — `useTheme()`

Mirrors the website's CSS variables one-to-one.

```jsx
import { useTheme } from "../contexts/ThemeContext";

const { theme, mode, setMode, effectiveMode } = useTheme();
// theme.colors.bg, theme.colors.text, theme.colors.orange, etc.
// mode = "light" | "dark" | "system" (persisted in AsyncStorage)
```

The status bar style and react-navigation theme update automatically.

### 2. i18n — `useTranslation()`

```jsx
import { useTranslation } from "react-i18next";
import { changeLanguage } from "../i18n";

const { t, i18n } = useTranslation();
t("auth.signIn");                    // → "Sign In" / "Se connecter" / etc.
t("auth.verifyEmailBody", { email }); // interpolation
await changeLanguage("es");           // persisted, takes effect immediately
```

Locales shipped: **en, es, fr, ar (RTL), pt**. Add a new locale by dropping a JSON file in `src/i18n/locales/` and importing it from `src/i18n/index.js`.

### 3. Currency — `useCurrency()`

```jsx
import { useCurrency } from "../contexts/CurrencyContext";
import AppCurrency from "../components/AppCurrency";

const { currency, format, setCurrencyCode } = useCurrency();

// Component-friendly:
<AppCurrency amount={1500} />                     // global currency
<AppCurrency amount={1500} currencyCode="NGN" />  // per-instance override

// Imperative:
format(1500);                                     // global
format(1500, { currencyCode: "EUR" });            // override
```

26 currencies pre-loaded with symbols and flags. The selected currency is persisted across sessions.

### 4. Toast — `useToast()` (NEVER use `Alert.alert`)

```jsx
import { useToast } from "../contexts/ToastContext";

const { toast } = useToast();
toast.success("Logged in");
toast.error("Invalid credentials");
toast.warning("Are you sure?");
toast.info("Heads up");
```

The toast is animated, themed, dismissable, and auto-stacks if multiple fire.

---

## Global components

Always reach for these instead of raw RN primitives:

| Use this        | Instead of           | Why                                                 |
| --------------- | -------------------- | --------------------------------------------------- |
| `AppText`       | `Text`               | applies theme color + correct font + a11y font cap  |
| `AppButton`     | `TouchableOpacity`   | matches website CTA, supports loading state         |
| `AppInput`      | `TextInput`          | matches website input, password eye toggle, errors  |
| `AppScreen`     | `SafeAreaView` etc.  | safe areas + theme bg + keyboard avoidance + status |
| `AppCurrency`   | manual `${sym}{amt}` | locale-aware formatting, currency override          |
| `useToast`      | `Alert.alert`        | non-blocking, themed, doesn't break the flow        |

---

## Auth flow

```
                      ┌──────────────┐
                      │ App launches │
                      └──────┬───────┘
                             ▼
                  authStore.hydrate()
                             │
              ┌──────────────┴──────────────┐
              ▼                             ▼
         user found                    no user
              │                             │
              ▼                             ▼
       HirerNavigator               AuthNavigator
        (Home, etc.)            (Login → Welcome → Register
                                 → ForgotPassword → VerifyEmail)
```

Tokens live in **SecureStore** (`expo-secure-store`); user object is cached in **AsyncStorage** for instant rehydration. The axios client auto-refreshes on 401.

---

## Adding a new screen

1. Create `src/screens/main/YourScreen.js`. Wrap with `<AppScreen>`. Use `AppText`, `AppButton`, `AppInput`, `AppCurrency`.
2. All strings must come from `t(...)`. Add keys to **every** locale JSON.
3. All money must go through `<AppCurrency>` or `format()`.
4. All user feedback via `useToast()`.
5. Add it to `HirerNavigator.js`.

---

## Backend contract (auth)

Endpoints used by this app today (full controller code lives server-side):

| Method | Path                          | Purpose                  |
| ------ | ----------------------------- | ------------------------ |
| POST   | `/auth/register`              | Create Hirer account     |
| POST   | `/auth/login`                 | Login                    |
| POST   | `/auth/logout`                | Logout (auth required)   |
| GET    | `/auth/me`                    | Current user             |
| POST   | `/auth/refresh`               | Refresh access token     |
| POST   | `/auth/forgot-password`       | Send reset email         |
| POST   | `/auth/reset-password`        | Reset with token         |
| POST   | `/auth/resend-verification`   | Resend verify email      |
| GET    | `/auth/verify-email?token=x`  | Verify email (web link)  |

Email verification is link-based — tap the link in the email and the website handles the GET. After verification the user can sign in normally.

---

## Next up

Auth is wired. The natural next batches:

1. **Search & worker discovery** (`search.controller.js`)
2. **Job posts + applications** (`job.controller.js`)
3. **Bookings + escrow + check-in** (`booking.controller.js`, `payment.controller.js`)
4. **Messaging + video call** (`message.controller.js`, `videocall.controller.js`)
5. **Settings, profile, subscription, featured listings**
