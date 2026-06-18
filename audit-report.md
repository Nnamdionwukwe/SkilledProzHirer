# SkilledProz Expo App — Full Project Audit

> Generated: 2026-06-03T00:14:51.750Z
> Root: `/Users/onwukwennamdi/Desktop/SkilledProzHirer`


## §1  Project Structure

```
📄 App.js
📄 README.md
📄 app.json
📄 babel.config.js
📁 bin
📄 codebase_snapshot.txt
📄 full_snapshot.txt
📄 i18n-todo.json
📁 locales
📄 package-lock.json
📄 package.json
📄 project-audit.txt
📄 read_full_project.sh
📄 read_skilledproz.sh
📁 scripts
📄 snapshot.sh
📁 src
```

| Folder | Code Files |
|--------|-----------|
| `src` | 106 |
| `scripts` | 15 |
| `(root)` | 2 |

## §2  package.json Analysis

✅ package.json found — name: `skilledproz-hirer`, version: `1.0.0`

### Required Dependencies

✅ expo
✅ react
✅ react-native
❌ `react-navigation` is MISSING — run: npm install react-navigation
✅ @react-navigation/native
✅ i18next
✅ react-i18next
✅ expo-localization
✅ @react-native-async-storage/async-storage

### Recommended Dependencies

✅ expo-image-picker
✅ expo-document-picker
✅ expo-clipboard
✅ @vitalets/google-translate-api
⚠️  `expo-updates` not found

⚠️  `"type": "module"` missing in package.json — Node shows ESM warning on every script run. Add it.

### All Dependencies

41 total packages installed.

<details><summary>Show all</summary>

```
@expo-google-fonts/dm-sans: ^0.4.1
@expo-google-fonts/syne: ^0.4.1
@expo/metro-runtime: ~6.1.2
@expo/vector-icons: ^15.0.2
@react-native-async-storage/async-storage: 2.2.0
@react-native-community/datetimepicker: 8.4.4
@react-navigation/bottom-tabs: ^7.4.7
@react-navigation/drawer: ^7.10.2
@react-navigation/native: ^7.1.21
@react-navigation/native-stack: ^7.3.31
@vitalets/google-translate-api: ^9.2.1
axios: ^1.7.7
expo: ~54.0.0
expo-clipboard: ~8.0.8
expo-constants: ~18.0.4
expo-document-picker: ~14.0.8
expo-font: ~14.0.4
expo-image-picker: ~17.0.11
expo-linking: ~8.0.4
expo-localization: ~17.0.9
expo-location: ~19.0.8
expo-print: ~15.0.8
expo-secure-store: ~15.0.4
expo-sharing: ~14.0.8
expo-splash-screen: ~31.0.6
expo-status-bar: ~3.0.4
expo-system-ui: ~6.0.4
i18next: ^23.16.8
react: 19.1.0
react-dom: 19.1.0
react-i18next: ^15.7.4
react-native: 0.81.5
react-native-gesture-handler: ~2.28.0
react-native-reanimated: ~4.1.2
react-native-safe-area-context: ~5.6.0
react-native-screens: ~4.16.0
react-native-web: ^0.21.0
react-native-worklets: 0.5.1
stack: ^0.1.0
zustand: ^4.5.5
@babel/core: ^7.25.2
```

</details>

## §3  i18n Completeness

English base has **3** translation keys.

| Locale | Code | Keys Filled | % Complete | Status |
|--------|------|-------------|------------|--------|
| English | `en` | 3/3 | 100% | ✅ Complete |
| French | `fr` | 3/3 | 100% | ✅ Complete |
| Arabic | `ar` | 3/3 | 100% | ✅ Complete |
| Yoruba | `yo` | 3/3 | 100% | ✅ Complete |
| Hausa | `ha` | 3/3 | 100% | ✅ Complete |
| Igbo | `ig` | 3/3 | 100% | ✅ Complete |
| Swahili | `sw` | 3/3 | 100% | ✅ Complete |
| Portuguese | `pt` | 3/3 | 100% | ✅ Complete |
| Spanish | `es` | 3/3 | 100% | ✅ Complete |

### Missing Translation Keys

❌ 865 t() keys used in code but MISSING from en.json:
```
key
...
some.key
accepted
disputed
mark_job_as_filled
common.currency
common.search
dashboard
toast.unknownError
nav.hirerPortal
common.hirer
nav.settings
nav.logout
write_a_comment
recent_bookings
your_work_at_a_glance
my_bookings
manage_your_bookings
jobs_assigned_to_you
browse_jobs
find_your_next_opportunity
my_profile
your_public_profile
earnings
track_your_income
wallet
earnings_payouts
applications
jobs_you
reviews
feedback_from_hirers
portfolio
your_work_gallery
certifications
your_trade_certifications
categories
your_trade_categories
availability
set_your_weekly_schedule
disputes
active_disputes
verification
trust_safety
subscriptions
plans_billing
boost_listing
stand_out_in_search
create_booking
book_a_worker
… and 815 more
```

## §4  Broken / Suspicious Imports

❌ 3 potentially broken imports:
| File | Import |
|------|--------|
| `scripts/i18n-setup.js` | `./src/i18n/index.js` |
| `scripts/i18n-setup.js` | `./src/i18n/index.js` |
| `src/i18n/App.snippet.js` | `./src/i18n/index.js` |

## §5  t() Called Outside React Component (Hook Violations)

❌ 138 t() calls found OUTSIDE React components — these will crash:
| File | Line | Code |
|------|------|------|
| `scripts/check-locales.js` | 49 | `/** Extract all t("...") / t('...') / t(`...`) keys from source */` |
| `src/components/ConfirmModal.js` | 27 | `*     title: t('mark_job_as_filled'),` |
| `src/components/TopBar.js` | 26 | `Dashboard: { title: t('dashboard'), subtitle: t('your_work_at_a_glance') },` |
| `src/components/TopBar.js` | 27 | `Bookings: { title: t('my_bookings'), subtitle: t('manage_your_bookings') },` |
| `src/components/TopBar.js` | 28 | `WorkerBookings: { title: t('my_bookings'), subtitle: t('jobs_assigned_to_you') }` |
| `src/components/TopBar.js` | 29 | `WorkerJobs: { title: t('browse_jobs'), subtitle: t('find_your_next_opportunity')` |
| `src/components/TopBar.js` | 30 | `WorkerProfile: { title: t('my_profile'), subtitle: t('your_public_profile') },` |
| `src/components/TopBar.js` | 31 | `WorkerEarnings: { title: t('earnings'), subtitle: t('track_your_income') },` |
| `src/components/TopBar.js` | 32 | `WorkerWithdrawals: { title: t('wallet'), subtitle: t('earnings_payouts') },` |
| `src/components/TopBar.js` | 34 | `title: t('applications'),` |
| `src/components/TopBar.js` | 35 | `subtitle: t('jobs_you')ve applied to",` |
| `src/components/TopBar.js` | 37 | `WorkerReviews: { title: t('reviews'), subtitle: t('feedback_from_hirers') },` |
| `src/components/TopBar.js` | 38 | `WorkerPortfolio: { title: t('portfolio'), subtitle: t('your_work_gallery') },` |
| `src/components/TopBar.js` | 40 | `title: t('certifications'),` |
| `src/components/TopBar.js` | 41 | `subtitle: t('your_trade_certifications'),` |
| `src/components/TopBar.js` | 43 | `WorkerCategories: { title: t('categories'), subtitle: t('your_trade_categories')` |
| `src/components/TopBar.js` | 45 | `title: t('availability'),` |
| `src/components/TopBar.js` | 46 | `subtitle: t('set_your_weekly_schedule'),` |
| `src/components/TopBar.js` | 48 | `WorkerDisputes: { title: t('disputes'), subtitle: t('active_disputes') },` |
| `src/components/TopBar.js` | 49 | `WorkerVerification: { title: t('verification'), subtitle: t('trust_safety') },` |
| … | | and 118 more |

> **Fix:** Convert module-level arrays/objects that use `t()` into functions that accept `t` as a parameter, called inside the component body.

## §6  Remaining Hardcoded Strings

⚠️  6 hardcoded strings still in JSX (not yet wrapped with t()):
| File | Line | Text |
|------|------|------|
| `scripts/check-hardcoded.js` | 21 | Some text |
| `scripts/check-styling.js` | 275 | from react-native — replace with |
| `scripts/check-styling.js` | 481 | i.msg.includes(" |
| `scripts/project-audit.js` | 235 | Show all |
| `scripts/project-audit.js` | 598 | Show all |
| `scripts/scan-i18n.js` | 108 | Some text |

## §7  TODO / FIXME / HACK / COMING SOON Comments

Found **0** annotated issues.


## §8  console.log / console.error in Production Code

⚠️  178 console statements found (remove before production):
<details><summary>Show all</summary>

| File | Line | Code |
|------|------|------|
| `scripts/audit-project.js` | 257 | `console.log("🔍  Scanning project...");` |
| `scripts/audit-project.js` | 269 | `console.log(`✅  Audit complete — ${analyzed.length} files analyzed`);` |
| `scripts/audit-project.js` | 270 | `console.log(`📋  Report saved to: ${OUT}`);` |
| `scripts/audit-project.js` | 271 | `console.log("\nPaste the contents of project-audit.txt into Claude.\n");` |
| `scripts/check-hardcoded.js` | 227 | `console.log("\n🔍  SkilledProzHirer — Hardcoded String Audit\n");` |
| `scripts/check-hardcoded.js` | 228 | `console.log("=".repeat(65));` |
| `scripts/check-hardcoded.js` | 229 | `console.log(`\n📁  Scanned ${files.length} source files`);` |
| `scripts/check-hardcoded.js` | 230 | `console.log(` |
| `scripts/check-hardcoded.js` | 233 | `console.log("=".repeat(65));` |
| `scripts/check-hardcoded.js` | 236 | `console.log("\n📊  Files ranked by hardcoded string count:\n");` |
| `scripts/check-hardcoded.js` | 237 | `console.log("  File".padEnd(52) + "i18n?  High  Med  Total");` |
| `scripts/check-hardcoded.js` | 238 | `console.log("  " + "─".repeat(62));` |
| `scripts/check-hardcoded.js` | 246 | `console.log(` |
| `scripts/check-hardcoded.js` | 252 | `console.log("\n" + "=".repeat(65));` |
| `scripts/check-hardcoded.js` | 253 | `console.log("\n📋  Detailed findings:\n");` |
| `scripts/check-hardcoded.js` | 259 | `console.log(`\n── ${rel}`);` |
| `scripts/check-hardcoded.js` | 260 | `console.log(` |
| `scripts/check-hardcoded.js` | 263 | `console.log(` |
| `scripts/check-hardcoded.js` | 269 | `console.log(`   ${icon} Line ${String(line).padStart(4)}  [${desc}]`);` |
| `scripts/check-hardcoded.js` | 270 | `console.log(`          Text: "${text}"`);` |
| `scripts/check-hardcoded.js` | 271 | `console.log(`          Code: ${lineText.slice(0, 80)}`);` |
| `scripts/check-hardcoded.js` | 272 | `console.log();` |
| `scripts/check-hardcoded.js` | 277 | `console.log("=".repeat(65));` |
| `scripts/check-hardcoded.js` | 278 | `console.log("\n✍️   Priority rewrite list (files with NO i18n + high hits):\n");` |
| `scripts/check-hardcoded.js` | 284 | `console.log("  🎉 All files already import useTranslation!");` |
| `scripts/check-hardcoded.js` | 289 | `console.log(`  🔴 ${rel}  (${high} high-priority strings)`);` |
| `scripts/check-hardcoded.js` | 291 | `console.log(`       • "${h.text}"`);` |
| `scripts/check-hardcoded.js` | 296 | `console.log("\n" + "=".repeat(65));` |
| `scripts/check-hardcoded.js` | 297 | `console.log("\n✍️   Already using i18n but still has hardcoded strings:\n");` |
| `scripts/check-hardcoded.js` | 303 | `console.log("  🎉 No partially-translated files found!");` |
| `scripts/check-hardcoded.js` | 308 | `console.log(`  🟡 ${rel}  (${high} strings still hardcoded)`);` |
| `scripts/check-hardcoded.js` | 310 | `console.log(`       Line ${h.line}: "${h.text}"`);` |
| `scripts/check-hardcoded.js` | 315 | `console.log("\n" + "=".repeat(65));` |
| `scripts/check-hardcoded.js` | 316 | `console.log("\n✅  Audit complete.\n");` |
| `scripts/check-locales.js` | 74 | `console.log("\n🔍  SkilledProzHirer — Locale Completeness Check\n");` |
| `scripts/check-locales.js` | 75 | `console.log("=".repeat(60));` |
| `scripts/check-locales.js` | 92 | `console.log(`\n📁  Scanned ${files.length} source files`);` |
| `scripts/check-locales.js` | 93 | `console.log(` |
| `scripts/check-locales.js` | 96 | `console.log("=".repeat(60));` |
| `scripts/check-locales.js` | 127 | `console.log("\n📊  Per-locale status:\n");` |
| `scripts/check-locales.js` | 143 | `console.log(` |
| `scripts/check-locales.js` | 149 | `console.log("\n" + "=".repeat(60));` |
| `scripts/check-locales.js` | 150 | `console.log("\n📋  Missing keys by locale:\n");` |
| `scripts/check-locales.js` | 156 | `console.log(` |
| `scripts/check-locales.js` | 161 | `console.log(`  ⚠️  Locale file not found: src/i18n/locales/${locale}.json`);` |
| `scripts/check-locales.js` | 162 | `console.log(`  All ${allUsedKeys.size} keys need to be added.\n`);` |
| `scripts/check-locales.js` | 166 | `console.log("  ✅ No missing keys");` |
| `scripts/check-locales.js` | 179 | `console.log(`\n  [${ns}]  (${keys.length} missing)`);` |
| `scripts/check-locales.js` | 181 | `console.log(`    • ${key}`);` |
| `scripts/check-locales.js` | 187 | `console.log("\n" + "=".repeat(60));` |
| … | | and 128 more |

</details>

## §9  Empty / Placeholder Screens

⚠️  30 screens appear to be placeholders or stubs:
| File | Lines | Reason |
|------|-------|--------|
| `src/screens/auth/ForgotPasswordScreen.js` | 96 | contains 'coming soon' |
| `src/screens/auth/LoginScreen.js` | 103 | contains 'coming soon' |
| `src/screens/auth/RegisterScreen.js` | 271 | contains 'coming soon' |
| `src/screens/auth/WorkerRegisterScreen.js` | 1483 | contains 'coming soon' |
| `src/screens/main/BookingDetailScreen.js` | 2410 | contains 'coming soon' |
| `src/screens/main/BrowseByCategoriesScreen.js` | 535 | contains 'coming soon' |
| `src/screens/main/BrowseWorkersScreen.js` | 1155 | contains 'coming soon' |
| `src/screens/main/CampaignDashboardScreen.js` | 2056 | contains 'coming soon' |
| `src/screens/main/ChatScreen.js` | 656 | contains 'coming soon' |
| `src/screens/main/CommunityFeedScreen.js` | 717 | contains 'coming soon' |
| `src/screens/main/CreateBookingScreen.js` | 1685 | contains 'coming soon' |
| `src/screens/main/DisputesScreen.js` | 991 | contains 'coming soon' |
| `src/screens/main/HirerPublicProfileScreen.js` | 807 | contains 'coming soon' |
| `src/screens/main/MessagesScreen.js` | 305 | contains 'coming soon' |
| `src/screens/main/MyPostsScreen.js` | 523 | contains 'coming soon' |
| `src/screens/main/MyReportsScreen.js` | 1685 | contains 'coming soon' |
| `src/screens/main/PaymentHistoryScreen.js` | 1176 | contains 'coming soon' |
| `src/screens/main/PlaceholderScreen.js` | 74 | contains 'coming soon' |
| `src/screens/main/PostJobScreen.js` | 1583 | contains 'coming soon' |
| `src/screens/main/ReferralDashboardScreen.js` | 1708 | contains 'coming soon' |
| `src/screens/main/SettingsScreen.js` | 1883 | contains 'coming soon' |
| `src/screens/main/VerificationScreen.js` | 933 | contains 'coming soon' |
| `src/screens/main/worker/WorkerCategoriesScreen.js` | 807 | contains 'coming soon' |
| `src/screens/main/worker/WorkerCertificationsScreen.js` | 544 | contains 'coming soon' |
| `src/screens/main/worker/WorkerEarningsScreen.js` | 559 | contains 'coming soon' |
| `src/screens/main/worker/WorkerJobDetailScreen.js` | 1261 | contains 'coming soon' |
| `src/screens/main/worker/WorkerJobsScreen.js` | 983 | contains 'coming soon' |
| `src/screens/main/worker/WorkerPortfolioScreen.js` | 663 | contains 'coming soon' |
| `src/screens/main/worker/WorkerProfileScreen.js` | 1128 | contains 'coming soon' |
| `src/screens/main/worker/WorkerWithdrawalsScreen.js` | 1236 | contains 'coming soon' |

## §10  API Endpoint Inventory

**22** unique API endpoints called across the app.

| Method + Endpoint | Called From |
|---|---|
| `DELETE /settings/account` | src/api/settings.js |
| `GET /auth/me` | src/store/authStore.js |
| `GET /categories` | src/api/categories.js |
| `GET /categories/${slug}` | src/api/categories.js |
| `GET /settings/activity` | src/api/settings.js |
| `GET /settings/notifications` | src/api/settings.js |
| `GET /settings/privacy` | src/api/settings.js |
| `GET /settings/profile` | src/api/settings.js |
| `GET /settings/security` | src/api/settings.js |
| `PATCH /settings/hirer-profile` | src/api/settings.js |
| `PATCH /settings/notifications` | src/api/settings.js |
| `PATCH /settings/password` | src/api/settings.js |
| `PATCH /settings/privacy` | src/api/settings.js |
| `PATCH /settings/profile` | src/api/settings.js |
| `POST /auth/forgot-password` | src/store/authStore.js |
| `POST /auth/login` | src/store/authStore.js |
| `POST /auth/logout` | src/store/authStore.js |
| `POST /auth/register` | src/store/authStore.js |
| `POST /auth/resend-verification` | src/store/authStore.js |
| `POST /auth/reset-password` | src/store/authStore.js |
| `POST /categories/suggest` | src/api/categories.js |
| `POST /settings/avatar` | src/api/settings.js |

## §11  Navigation Screen Inventory

**52** screens registered · **48** navigation targets found


### Registered Screens

`BookingDetail` · `Bookings` · `BrowseByCategories` · `BrowseWorkers` · `Campaign` · `CategoryDetail` · `Chat` · `CommunityFeed` · `CreateBooking` · `Dashboard` · `FeaturedBoost` · `ForgotPassword` · `HirerDetail` · `HirerPublicProfile` · `JobApplications` · `JobDetail` · `JobsManagement` · `Login` · `Messages` · `MyPosts` · `MyReports` · `Notifications` · `PaymentHistory` · `PostJob` · `Profile` · `ReferralDashboard` · `Register` · `ReviewsGiven` · `ReviewsReceived` · `SavedWorkers` · `Settings` · `VerifyEmail` · `Welcome` · `WorkerApplications` · `WorkerAvailability` · `WorkerBookings` · `WorkerBoost` · `WorkerCategories` · `WorkerCertifications` · `WorkerDetail` · `WorkerDisputes` · `WorkerEarnings` · `WorkerHome` · `WorkerJobDetail` · `WorkerJobs` · `WorkerPortfolio` · `WorkerProfile` · `WorkerRegister` · `WorkerReviews` · `WorkerSubscriptions` · `WorkerVerification` · `WorkerWithdrawals`

### ⚠️  Navigated To But Not Registered

⚠️  2 screens navigated to but not found in navigator:
- `_`
- `hasFollowed`

### ℹ️  Registered But Never Navigated To

ℹ️  6 screens registered but no navigate() call found (may be initial routes):
- `PaymentHistory`
- `CommunityFeed`
- `FeaturedBoost`
- `WorkerDetail`
- `VerifyEmail`
- `WorkerHome`

## §12  AsyncStorage Key Inventory

ℹ️  No AsyncStorage keys found

## §13  Asset Reference Check

✅ All 0 referenced assets found on disk

## §14  Large Files (>300 lines)

⚠️  56 large files (consider splitting):

| File | Lines | Suggestion |
|------|-------|------------|
| `src/screens/main/BookingDetailScreen.js` | 2504 | 🔴 Split urgently |
| `src/screens/main/CampaignDashboardScreen.js` | 2113 | 🔴 Split urgently |
| `src/screens/main/SettingsScreen.js` | 2000 | 🔴 Split urgently |
| `src/screens/main/CreateBookingScreen.js` | 1770 | 🔴 Split urgently |
| `src/screens/main/ReferralDashboardScreen.js` | 1764 | 🔴 Split urgently |
| `src/screens/main/MyReportsScreen.js` | 1751 | 🔴 Split urgently |
| `src/screens/main/PostJobScreen.js` | 1637 | 🔴 Split urgently |
| `src/screens/auth/WorkerRegisterScreen.js` | 1564 | 🔴 Split urgently |
| `scripts/patch-locales-v2.js` | 1472 | 🔴 Split urgently |
| `src/screens/main/WorkerPublicProfileScreen.js` | 1419 | 🔴 Split urgently |
| `src/screens/main/worker/WorkerJobDetailScreen.js` | 1318 | 🔴 Split urgently |
| `src/screens/main/worker/WorkerWithdrawalsScreen.js` | 1291 | 🔴 Split urgently |
| `src/screens/main/PaymentHistoryScreen.js` | 1234 | 🔴 Split urgently |
| `src/screens/main/BrowseWorkersScreen.js` | 1212 | 🔴 Split urgently |
| `src/screens/main/worker/WorkerProfileScreen.js` | 1186 | 🔴 Split urgently |
| `src/screens/main/ProfileScreen.js` | 1087 | 🔴 Split urgently |
| `src/screens/main/DisputesScreen.js` | 1052 | 🔴 Split urgently |
| `src/screens/main/worker/WorkerJobsScreen.js` | 1050 | 🔴 Split urgently |
| `src/screens/main/VerificationScreen.js` | 977 | 🟠 Consider splitting |
| `scripts/project-audit.js` | 929 | 🟠 Consider splitting |
| `src/screens/main/JobsManagementScreen.js` | 906 | 🟠 Consider splitting |
| `src/screens/main/JobDetailScreen.js` | 905 | 🟠 Consider splitting |
| `src/screens/main/worker/WorkerDashboardScreen.js` | 869 | 🟠 Consider splitting |
| `src/screens/main/HirerPublicProfileScreen.js` | 855 | 🟠 Consider splitting |
| `scripts/patch-worker-i18n.js` | 853 | 🟠 Consider splitting |
| `src/screens/main/worker/WorkerCategoriesScreen.js` | 853 | 🟠 Consider splitting |
| `src/components/PostCard.js` | 792 | 🟠 Consider splitting |
| `src/screens/main/CommunityFeedScreen.js` | 753 | 🟠 Consider splitting |
| `src/screens/main/worker/WorkerApplicationsScreen.js` | 716 | 🟠 Consider splitting |
| `src/screens/main/worker/WorkerPortfolioScreen.js` | 700 | 🟠 Consider splitting |
| `src/screens/main/ChatScreen.js` | 696 | 🟠 Consider splitting |
| `src/screens/main/NotificationsScreen.js` | 686 | 🟠 Consider splitting |
| `src/screens/main/JobApplicationsScreen.js` | 638 | 🟠 Consider splitting |
| `src/screens/main/worker/WorkerEarningsScreen.js` | 593 | 🟡 Monitor |
| `src/screens/main/worker/WorkerCertificationsScreen.js` | 583 | 🟡 Monitor |
| `src/screens/main/BrowseByCategoriesScreen.js` | 578 | 🟡 Monitor |
| `src/screens/main/FeaturedBoostScreen.js` | 573 | 🟡 Monitor |
| `scripts/check-styling.js` | 548 | 🟡 Monitor |
| `src/screens/main/MyPostsScreen.js` | 548 | 🟡 Monitor |
| `src/screens/main/worker/WorkerBookingsScreen.js` | 534 | 🟡 Monitor |
| `src/screens/main/BookingsScreen.js` | 517 | 🟡 Monitor |
| `src/screens/main/worker/WorkerAvailabilityScreen.js` | 511 | 🟡 Monitor |
| `src/components/WorkerDrawerContent.js` | 508 | 🟡 Monitor |
| `src/screens/main/SubscriptionsScreen.js` | 473 | 🟡 Monitor |
| `src/screens/main/ReviewsReceivedScreen.js` | 458 | 🟡 Monitor |
| `scripts/patch-worker-nav-i18n.js` | 454 | 🟡 Monitor |
| `scripts/patch-locales.js` | 447 | 🟡 Monitor |
| `src/screens/main/ReviewsGivenScreen.js` | 447 | 🟡 Monitor |
| `scripts/patch-worker-dashboard-i18n.js` | 424 | 🟡 Monitor |
| `src/screens/main/CategoryDetailScreen.js` | 416 | 🟡 Monitor |
| `src/screens/main/worker/WorkerReviewsScreen.js` | 410 | 🟡 Monitor |
| `scripts/scan-i18n.js` | 397 | 🟡 Monitor |
| `src/components/DrawerContent.js` | 395 | 🟡 Monitor |
| `src/screens/main/SavedWorkersScreen.js` | 363 | 🟡 Monitor |
| `src/screens/main/MessagesScreen.js` | 322 | 🟡 Monitor |
| `scripts/check-hardcoded.js` | 317 | 🟡 Monitor |

## §15  Duplicate Component Filenames

✅ No duplicate filenames found

## §16  Summary Scorecard

| Metric | Value |
|--------|-------|
| Total checks | 35 |
| ✅ Passed | 24 |
| ⚠️  Warnings | 12 |
| ❌ Errors | 7 |
| **Grade** | **D** |

### Priority Fixes

1. 🔴 Fix all ❌ errors above — these are likely crashes or broken features
2. 🔴 Fix t() hook violations in DrawerContent and other module-level arrays
3. 🟠 Work through ⚠️ warnings — incomplete i18n, large files, todos
4. 🟡 Remove console.log before publishing to App Store / Play Store

---
*Generated by project-audit.js — 6/3/2026*