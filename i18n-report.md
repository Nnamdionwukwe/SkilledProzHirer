# i18n Scan Report

> Generated: 2026-06-03T00:16:57.801Z
> Root: `/Users/onwukwennamdi/Desktop/SkilledProzHirer`

## Summary

| Metric | Value |
|--------|-------|
| Files scanned | 107 |
| Files with hardcoded strings | 2 |
| Total hardcoded strings found | 24 |
| Unique translation keys | 24 |
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

### `src/components/DrawerContent.js`

| Line | Pattern | String |
|------|---------|--------|
| 31 | `nav_title` | Dashboard |
| 33 | `nav_title` | Bookings |
| 38 | `nav_title` | PostJob |
| 43 | `nav_title` | JobsManagement |
| 47 | `nav_title` | MyPosts |
| 49 | `nav_title` | PaymentHistory |
| 54 | `nav_title` | Disputes |
| 64 | `nav_title` | SavedWorkers |
| 69 | `nav_title` | BrowseWorkers |
| 74 | `nav_title` | BrowseByCategories |
| 79 | `nav_title` | Messages |
| 89 | `nav_title` | ReviewsReceived |
| 94 | `nav_title` | ReviewsGiven |
| 104 | `nav_title` | CommunityFeed |
| 114 | `nav_title` | Notifications |
| 119 | `nav_title` | Verification |
| 124 | `nav_title` | ReferralDashboard |
| 128 | `nav_title` | Campaign |
| 130 | `nav_title` | MyReports |
| 140 | `nav_title` | Subscriptions |
| 145 | `nav_title` | FeaturedBoost |

**Suggested keys:**
```js
// Line 31
t('dashboard')  // "Dashboard"
// Line 33
t('bookings')  // "Bookings"
// Line 38
t('postjob')  // "PostJob"
// Line 43
t('jobsmanagement')  // "JobsManagement"
// Line 47
t('myposts')  // "MyPosts"
// Line 49
t('paymenthistory')  // "PaymentHistory"
// Line 54
t('disputes')  // "Disputes"
// Line 64
t('savedworkers')  // "SavedWorkers"
// Line 69
t('browseworkers')  // "BrowseWorkers"
// Line 74
t('browsebycategories')  // "BrowseByCategories"
// Line 79
t('messages')  // "Messages"
// Line 89
t('reviewsreceived')  // "ReviewsReceived"
// Line 94
t('reviewsgiven')  // "ReviewsGiven"
// Line 104
t('communityfeed')  // "CommunityFeed"
// Line 114
t('notifications')  // "Notifications"
// Line 119
t('verification')  // "Verification"
// Line 124
t('referraldashboard')  // "ReferralDashboard"
// Line 128
t('campaign')  // "Campaign"
// Line 130
t('myreports')  // "MyReports"
// Line 140
t('subscriptions')  // "Subscriptions"
// Line 145
t('featuredboost')  // "FeaturedBoost"
```

### `src/screens/main/SettingsScreen.js`

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
| `bookings` | Bookings |
| `browsebycategories` | BrowseByCategories |
| `browseworkers` | BrowseWorkers |
| `campaign` | Campaign |
| `communityfeed` | CommunityFeed |
| `company_size` | Company Size |
| `dashboard` | Dashboard |
| `dashboard_currency` | Dashboard Currency |
| `disputes` | Disputes |
| `featuredboost` | FeaturedBoost |
| `jobsmanagement` | JobsManagement |
| `messages` | Messages |
| `myposts` | MyPosts |
| `myreports` | MyReports |
| `notifications` | Notifications |
| `payment_currency` | Payment Currency |
| `paymenthistory` | PaymentHistory |
| `postjob` | PostJob |
| `referraldashboard` | ReferralDashboard |
| `reviewsgiven` | ReviewsGiven |
| `reviewsreceived` | ReviewsReceived |
| `savedworkers` | SavedWorkers |
| `subscriptions` | Subscriptions |
| `verification` | Verification |

## Next Steps

1. Review `locales/en.json` — remove any false positives
2. Fill in translations in `fr.json`, `ar.json`, `yo.json`, `ha.json`, `ig.json`, `sw.json`, `pt.json`, `es.json`
3. Install i18n library: `npx expo install expo-localization i18next react-i18next`
4. Run `node scripts/wrap-i18n.js` to auto-wrap found strings with `t()`
5. Test each locale with `expo start --locale ar`