#!/usr/bin/env node
// build-locales.js — Batch translate: one request per namespace, not per key
// This cuts 1,182 requests → ~30, preventing Google rate-limit blocks.
//
// RUN:  node scripts/build-locales.js
//       node scripts/build-locales.js --locale fr      (single locale)
//       node scripts/build-locales.js --locale yo,ha,ig
//       node scripts/build-locales.js --force          (re-translate complete locales)
//       node scripts/build-locales.js --delay 4000     (ms between namespaces, default 2000)

import fs from "fs";
import path from "path";

const args = process.argv.slice(2);
const localeArg = args.indexOf("--locale");
const delayArg = args.indexOf("--delay");
const ONLY = localeArg >= 0 ? args[localeArg + 1].split(",") : null;
const FORCE = args.includes("--force");
const DELAY = delayArg >= 0 ? parseInt(args[delayArg + 1]) : 4000; // ms between namespaces

const LOCALES_DIR = path.resolve("locales");
fs.mkdirSync(LOCALES_DIR, { recursive: true });

const ALL_LOCALES = [
  { code: "en", name: "English", gtCode: "en", rtl: false },
  { code: "fr", name: "French", gtCode: "fr", rtl: false },
  { code: "ar", name: "Arabic", gtCode: "ar", rtl: true },
  { code: "yo", name: "Yoruba", gtCode: "yo", rtl: false },
  { code: "ha", name: "Hausa", gtCode: "ha", rtl: false },
  { code: "ig", name: "Igbo", gtCode: "ig", rtl: false },
  { code: "sw", name: "Swahili", gtCode: "sw", rtl: false },
  { code: "pt", name: "Portuguese", gtCode: "pt", rtl: false },
  { code: "es", name: "Spanish", gtCode: "es", rtl: false },
];

// ── Complete English locale ───────────────────────────────────────────────────
const EN = {
  common: {
    back: "Back",
    next: "Next",
    continue: "Continue",
    cancel: "Cancel",
    save: "Save",
    delete: "Delete",
    edit: "Edit",
    loading: "Loading…",
    submit: "Submit",
    ok: "OK",
    yes: "Yes",
    no: "No",
    search: "Search",
    optional: "optional",
    required: "required",
    language: "Language",
    currency: "Currency",
    theme: "Theme",
    darkMode: "Dark mode",
    lightMode: "Light mode",
    systemMode: "Use system setting",
    networkError: "Network error. Check your connection.",
    select: "Select…",
    comingSoon: "This screen will be available soon.",
    backToDashboard: "Back to Dashboard",
    hirer: "Hirer",
    worker: "Worker",
    noMatch: "No currency match",
    admin: "Admin",
    confirm: "Confirm",
    retry: "Retry",
    close: "Close",
    viewAll: "View all",
    seeAll: "See all",
    or: "or",
  },
  toast: {
    success: "Success",
    error: "Error",
    info: "Info",
    warning: "Warning",
    networkError: "Network error. Check your connection.",
    unknownError: "Something went wrong. Please try again.",
    messagingComingSoon: "Messaging coming soon",
    savedSuccessfully: "Saved successfully",
    deletedSuccessfully: "Deleted successfully",
    uploadFailed: "Upload failed",
  },
  nav: {
    hirerPortal: "HIRER PORTAL",
    workerPortal: "WORKER PORTAL",
    main: "MAIN",
    dashboard: "Dashboard",
    bookings: "Bookings",
    postJob: "Post Job",
    jobsManagement: "Jobs Management",
    myPosts: "My Posts",
    paymentHistory: "Payment History",
    disputes: "Disputes",
    workers: "WORKERS",
    savedWorkers: "Saved Workers",
    browseWorkers: "Browse Workers",
    browseByCategories: "Browse by Categories",
    messages: "Messages",
    reviews: "REVIEWS",
    reviewsReceived: "Reviews Received",
    reviewsGiven: "Reviews Given",
    community: "COMMUNITY",
    communityFeed: "Community",
    account: "ACCOUNT",
    notifications: "Notifications",
    verification: "Verification",
    referralDashboard: "Referral Dashboard",
    Campaign: "Campaign",
    MyReports: "My Reports",
    subscriptionsFeatures: "SUBSCRIPTIONS & FEATURES",
    subscriptions: "Subscriptions",
    boostListing: "Featured Boost",
    settings: "Settings",
    logout: "Log out",
    overview: "OVERVIEW",
    payouts: "PAYOUTS",
    profileSection: "PROFILE",
    inbox: "INBOX",
    earnings: "Earnings",
    wallet: "Wallet",
    browseJobs: "Browse Jobs",
    myApplications: "My Applications",
    myBookings: "My Bookings",
    categories: "Categories",
    available: "Available",
    failedAvailability: "Failed to update availability",
    activeWorker: "Active Worker",
  },
  topBar: {
    dashboard: "Dashboard",
    dashboardSub: "Your work at a glance",
    bookings: "My Bookings",
    bookingsSub: "Manage your bookings",
    workerBookings: "My Bookings",
    workerBookingsSub: "Jobs assigned to you",
    workerJobs: "Browse Jobs",
    workerJobsSub: "Find your next opportunity",
    workerProfile: "My Profile",
    workerProfileSub: "Your public profile",
    earnings: "Earnings",
    earningsSub: "Track your income",
    wallet: "Wallet",
    walletSub: "Earnings & payouts",
    applications: "Applications",
    applicationsSub: "Jobs you've applied to",
    reviews: "Reviews",
    reviewsSub: "Feedback from hirers",
    portfolio: "Portfolio",
    portfolioSub: "Your work gallery",
    certifications: "Certifications",
    certificationsSub: "Your trade certifications",
    categories: "Categories",
    categoriesSub: "Your trade categories",
    availability: "Availability",
    availabilitySub: "Set your weekly schedule",
    workerDisputes: "Disputes",
    workerDisputesSub: "Active disputes",
    workerVerification: "Verification",
    workerVerificationSub: "Trust & safety",
    workerSubscriptions: "Subscriptions",
    workerSubscriptionsSub: "Plans & billing",
    workerBoost: "Featured Boost",
    workerBoostSub: "Stand out in search",
    hirerProfile: "Hirer Profile",
    hirerProfileSub: "View profile & jobs",
    jobDetail: "Job Details",
    jobDetailSub: "View & apply",
    directMessage: "Direct Message",
    directMessageSub: "Direct message",
    bookingDetail: "Booking Detail",
    bookingDetailSub: "Details & actions",
    settings: "Settings",
    settingsSub: "Preferences & security",
    notifications: "Notifications",
    notificationsSub: "View & manage alerts",
    messages: "Messages",
    messagesSub: "Your conversations",
    community: "Community",
    communitySub: "Your posts",
    savedWorkers: "Saved Workers",
    savedWorkersSub: "Your shortlist",
    browseWorkers: "Browse Workers",
    browseWorkersSub: "Find professionals",
    createBooking: "Create Booking",
    createBookingSub: "Book a worker",
    myReports: "My Reports",
    myReportsSub: "Reports you submitted",
    referral: "Referral Dashboard",
    referralSub: "Invite & earn",
    campaign: "Campaign",
    campaignSub: "Boost & promote",
    verification: "Verification",
    verificationSub: "Trust & safety",
    subscriptions: "Subscriptions",
    subscriptionsSub: "Plans & billing",
    featuredBoost: "Featured Boost",
    featuredBoostSub: "Stand out in search",
    postJob: "Post a Job",
    postJobSub: "Find the right professional",
  },
  auth: {
    welcomeBack: "WELCOME BACK",
    signInTitle: "Sign in to SkilledProz",
    noAccountYet: "Don't have an account?",
    createOneFree: "Create one free",
    emailAddress: "Email address",
    emailPlaceholder: "you@example.com",
    password: "Password",
    passwordMinChars: "Min. 8 characters",
    forgot: "Forgot?",
    signIn: "Sign in",
    signingIn: "Signing in…",
    signOut: "Sign out",
    joinTitle: "Join SkilledProz",
    joinSubtitle: "How will you use the platform?",
    getStartedFree: "GET STARTED — IT'S FREE",
    imAHirer: "I'm a Hirer",
    imAWorker: "I'm a Worker",
    hirerDescription: "Find and hire skilled professionals.",
    workerDescription: "Offer your services and get clients.",
    continueAs: "Continue as",
    continueAsHirer: "Continue as Hirer",
    continueAsWorker: "Continue as Worker",
    alreadyHaveAccount: "Already have an account?",
    hirerAccount: "HIRER ACCOUNT",
    findNextProz: "Find your next professional",
    firstName: "First name",
    lastName: "Last name",
    firstNamePlaceholder: "John",
    lastNamePlaceholder: "Doe",
    phone: "Phone",
    phonePlaceholder: "+234 000 000 0000",
    country: "Country",
    countryPlaceholder: "Nigeria",
    city: "City",
    cityPlaceholder: "Lagos",
    confirm: "Confirm password",
    confirmPlaceholder: "Repeat password",
    passwordsDontMatch: "Passwords do not match",
    agreeToTerms: "I agree to the",
    terms: "Terms",
    and: "and",
    privacyPolicy: "Privacy Policy",
    createHirerAccount: "Create Hirer Account",
    creating: "Creating…",
    mustAgreeTerms: "You must agree to the Terms and Privacy Policy",
    verifyEmailTitle: "Verify your email",
    verifyEmailBody: "We sent a verification link to {{email}}.",
    didntReceive: "Didn't receive it?",
    resend: "Resend email",
    resending: "Sending…",
    verificationResent: "Verification email sent.",
    iVerified: "I've verified my email",
    checking: "Checking…",
    notVerifiedYet: "Not verified yet. Check your inbox and click the link.",
    forgotPasswordTitle: "Forgot password?",
    forgotPasswordBody: "Enter your email and we'll send you a reset link.",
    sendResetLink: "Send reset link",
    resetLinkSent: "If that email exists, a link was sent.",
    rememberPassword: "Remember your password?",
    resetPasswordTitle: "Reset password",
    newPassword: "New password",
    resetPassword: "Reset password",
    passwordResetSuccess: "Password reset successfully.",
    loginSuccess: "Welcome back!",
    registerSuccess: "Account created. Check your email.",
    logoutSuccess: "You've been signed out.",
    invalidCredentials: "Invalid email or password",
    fillAllFields: "Please fill in all required fields",
    emailRequired: "Email is required",
    validEmailRequired: "Enter a valid email address",
    passwordTooShort: "Password must be at least 8 characters",
    hirerAppOnly:
      "This is the Hirer app. Install the Worker app to register as a worker.",
  },
  dashboard: {
    overview: "OVERVIEW",
    title: "Your Dashboard",
    welcomeBack: "Welcome back, {{name}}",
    viewingIn: "Viewing in",
    postAJob: "Post a Job",
    totalBookings: "Total Bookings",
    activeJobs: "Active Jobs",
    completed: "Completed",
    totalSpent: "Total Spent",
    recentBookings: "Recent Bookings",
    recentWorkers: "Recent Workers",
    viewAll: "View all",
    noBookingsYet: "No bookings yet. Post a job to get started.",
    noWorkersYet: "No workers yet. Browse and book your first professional.",
  },
  postJob: {
    screenTitle: "Post a Job",
    step1Title: "Basic Info",
    step1Sub: "Tell us what you're looking for",
    step2Title: "Job Details",
    step2Sub: "Describe the position in detail",
    step3Title: "Budget & Review",
    step3Sub: "Set your budget and review before posting",
    jobTitle: "Job Title",
    jobTitlePlaceholder: "e.g. Senior Plumber in Lagos",
    category: "Category",
    jobType: "Job Type",
    locationType: "Location Type",
    locationAddress: "Location / Address",
    locationAddressPlaceholder: "e.g. 12 Victoria Island, Lagos",
    description: "Job Description",
    descriptionPlaceholder: "Describe the job, responsibilities, requirements…",
    minChars: "Minimum {{count}} characters",
    skills: "Required Skills",
    skillPlaceholder: "Type a skill and press enter",
    skillsHint: "{{current}}/{{max}} skills added",
    optional: "optional",
    startDate: "Start Date",
    budgetType: "Payment Type",
    hourlyRate: "Hourly Rate",
    fixedPrice: "Fixed Budget",
    budget: "Budget",
    perHour: "/ hr",
    fixed: "fixed",
    currencyNote: "Amount will be shown in {{currency}}",
    reviewTitle: "Job Summary",
    continue: "Continue",
    postJob: "Post Job",
    posting: "Posting…",
    successMessage: "Job posted successfully!",
    maxSkills: "Maximum 10 skills",
    titleRequired: "Title is required",
    categoryRequired: "Please select a category",
    locationRequired: "Location is required for on-site jobs",
    descriptionRequired: "Description is required",
    descriptionTooShort: "Description must be at least 50 characters",
    budgetRequired: "Please enter a valid budget",
    startDateRequired: "Please select a start date",
    invalidDate: "Invalid date — use YYYY-MM-DD format",
    searchCategories: "Search categories…",
    noMatch: 'No results for "{{query}}"',
    customOther: "Custom / Other",
    suggestCategory: "Suggest a new category",
    categoryInputPlaceholder: "e.g. Solar Panel Installation",
    addedCategory: '"{{name}}" added and selected!',
    yourTitleNote: "Your title will be added as a new category when posted.",
    tapToChooseDate: "Tap to choose a date",
    selectStartDate: "Select Start Date",
    done: "Done",
    jobDuration: "Job Duration",
    paymentCurrency: "Payment Currency",
    payIn: "Pay in",
    cryptoNote:
      "Includes fiat and crypto. Workers see the amount in this currency.",
    additionalNotes: "Additional Notes",
    notesPlaceholder: "Schedule, equipment provided, special requirements…",
    howMany: "How many {{unit}}?",
    describeDuration: "Describe duration",
    describeDurationPlaceholder: "e.g. Until project complete, 6 months",
    durationRequired: "Please enter a number of {{unit}}",
    durationCustomRequired: "Please describe the custom duration",
    dailyRate: "Daily Rate",
    weeklyRate: "Weekly Rate",
    monthlyRate: "Monthly Rate",
    agreedAmount: "Agreed Amount",
  },
  settings: {
    title: "Settings",
    subtitle: "Manage your account, preferences, and platform configuration",
    profile: {
      title: "Profile Information",
      subtitle: "Your personal details visible to others",
      changePhoto: "Change Photo",
      photoHint: "JPG, PNG or WebP · max 5MB",
      firstName: "FIRST NAME",
      lastName: "LAST NAME",
      phone: "PHONE",
      bio: "BIO",
      country: "COUNTRY",
      state: "STATE",
      city: "CITY",
      address: "ADDRESS",
      currency: "CURRENCY",
      gender: "GENDER",
      save: "Save Profile",
      saved: "Profile updated",
      failed: "Could not save profile",
      photoUpdated: "Photo updated",
      photoFailed: "Photo upload failed",
      permissionRequired: "Gallery permission required",
    },
    company: {
      title: "Company Profile",
      subtitle: "Information visible to workers you hire",
      companyName: "COMPANY NAME",
      companySize: "COMPANY SIZE",
      website: "WEBSITE",
      save: "Save Company Profile",
      saved: "Company profile updated",
      failed: "Could not save company profile",
    },
    appearance: {
      title: "Appearance",
      subtitle: "Theme and language preferences",
      themeLabel: "THEME",
      themeDesc: "Choose how SkilledProz looks.",
      light: "Light",
      dark: "Dark",
      system: "System",
      save: "Save Appearance",
      saved: "Appearance saved",
      failed: "Could not save",
      languageLabel: "LANGUAGE",
      languageDesc: "Select your preferred language.",
      searchLanguage: "Search language…",
      active: "Active",
      languageUpdated: "Language updated",
      languageFailed: "Could not change language",
    },
    notifications: {
      title: "Notifications",
      subtitle: "Choose what we notify you about",
      bookings: "Booking updates",
      bookingsSub: "New bookings, status changes",
      messages: "Messages",
      messagesSub: "New messages from hirers or workers",
      payments: "Payment alerts",
      paymentsSub: "Escrow releases, confirmations",
      reviews: "Reviews",
      reviewsSub: "New reviews on your profile",
      marketing: "Product updates",
      marketingSub: "New features and news",
      save: "Save Preferences",
      saved: "Preferences saved",
      failed: "Could not save",
      updateFailed: "Could not update",
    },
    privacy: {
      title: "Privacy",
      subtitle: "Control who sees your information",
      publicProfile: "Public Profile",
      publicProfileSub: "Allow your profile to be public or private",
      showPhone: "Show Phone",
      showPhoneSub: "Show your number to hirers or workers",
      showLocation: "Show Location",
      showLocationSub: "Show city and country on your profile",
      showEmail: "Show Email",
      showEmailSub: "Show your email on your public profile",
      showGender: "Show Gender",
      showGenderSub: "Show your gender on your public profile",
      save: "Save Privacy",
      saved: "Privacy settings saved",
      failed: "Could not save",
      updateFailed: "Could not update",
    },
    security: {
      passwordTitle: "Change Password",
      passwordSubtitle: "Keep your account secure",
      currentPassword: "CURRENT PASSWORD",
      newPassword: "NEW PASSWORD (MIN. 8 CHARACTERS)",
      confirmPassword: "CONFIRM PASSWORD",
      updatePassword: "Update Password",
      passwordUpdated: "Password updated",
      passwordFailed: "Could not change password",
      passwordMismatch: "Passwords do not match",
      passwordTooShort: "Password must be at least 8 characters",
      accountTitle: "Account Info",
      accountSubtitle: "Your verification and account status",
      email: "Email",
      emailVerified: "Email Verified",
      phoneVerified: "Phone Verified",
      twoFA: "2FA",
      verified: "Verified",
      notVerified: "Not verified",
      enabled: "Enabled",
      notEnabled: "Not enabled (coming soon)",
      memberSince: "Member since",
      lastSeen: "Last seen",
      dangerTitle: "Danger Zone",
      dangerSubtitle: "Irreversible actions",
      deactivateTitle: "Deactivate Account",
      deactivateDesc: "Your profile will be hidden and you'll be signed out.",
      deactivate: "Deactivate",
      deactivateFailed: "Could not deactivate account.",
    },
    activity: {
      title: "Account Activity",
      subtitle: "Your recent activity on the platform",
      unreadNotifications: "Unread notifications",
      totalBookings: "Total bookings",
      reviewsReceived: "Reviews received",
      recentActivity: "RECENT ACTIVITY",
      failed: "Could not load activity",
    },
    currencies: {
      title: "Currency Settings",
      subtitle: "Control how currencies appear on the platform",
      dashboardLabel: "DASHBOARD CURRENCY",
      dashboardDesc: "Currency to display stats. Visual only.",
      paymentLabel: "PAYMENT CURRENCY",
      paymentDesc: "Default currency for paying bookings.",
      save: "Save Settings",
      saved: "Currency settings saved",
      failed: "Could not save",
      summaryTitle: "Currency Summary",
      summarySubtitle: "How your currencies are configured",
      dashboardShows: "Dashboard shows stats in",
      displayOnly: "Display only",
      youPayIn: "You pay in",
      usedForTransactions: "Used for actual transactions",
    },
    hiringPrefs: {
      title: "Hiring Preferences",
      subtitle: "Default settings when creating bookings",
      description: "Choose the default estimated duration format.",
      durationUnit: "DEFAULT DURATION UNIT",
      durationValue: "DEFAULT VALUE ({{unit}})",
      hint: "These are defaults only — you can change them per booking.",
      save: "Save Preferences",
      saved: "Preferences saved",
      failed: "Could not save preferences",
    },
  },
  bookings: {
    title: "My Bookings",
    newBooking: "+ New Booking",
    all: "All",
    pending: "Pending",
    accepted: "Accepted",
    inProgress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
    disputed: "Disputed",
    noBookings: "No bookings found",
    noBookingsHirer: "You haven't created any bookings yet.",
    noBookingsWorker: "You don't have any bookings yet.",
    backToBookings: "Back to Bookings",
    notFound: "Booking not found.",
    description: "Description",
    jobDetails: "Job Details",
    scheduled: "Scheduled",
    address: "Site Address",
    agreedRate: "Agreed Rate",
    duration: "Est. Duration",
    payment: "Payment",
    actions: "Actions",
    worker: "Worker",
    hirer: "Hirer",
    cancelBooking: "Cancel Booking",
    cancelReason: "Cancellation reason",
    cancelReasonPlaceholder: "Please explain why you are cancelling…",
    cancelReasonRequired: "Please provide a reason.",
    confirmCancel: "Yes, Cancel",
    keepBooking: "Keep Booking",
    accept: "Accept Booking",
    payWithCard: "Pay with Card",
    releasePayment: "Release Payment to Worker",
    releaseConfirm: "Release payment to the worker?",
    release: "Release",
    newJob: "New Job",
    createBooking: "Create Booking",
    createSubtitle:
      "Fill in the details and the worker will be notified immediately.",
    workerId: "Worker ID",
    workerIdPlaceholder: "Paste the worker's user ID",
    workerNotFound: "Worker not found. Please check the ID.",
    workerRequired: "Please enter a valid worker ID.",
    loadingWorker: "Loading worker profile…",
    pricingDuration: "Pricing & Duration",
    engagementType: "Engagement Type",
    lockedFromWorker: "Worker's rate",
    currency: "Currency",
    describeEngagement: "Describe the engagement",
    numberOf: "Number of",
    category: "Category",
    jobInformation: "Job Information",
    jobTitle: "Job Title",
    additionalNotes: "Additional Notes",
    location: "Location",
    serviceAddress: "Service Address",
    schedule: "Schedule",
    dateTime: "Date & Time",
    estimatedTotal: "Estimated Total",
    titleRequired: "Title is required",
    descriptionRequired: "Description is required",
    addressRequired: "Address is required",
    dateRequired: "Please select a date and time",
    categoryRequired: "Please select a category",
    created: "Booking created successfully!",
    summaryNote: "Final amount depends on actual time.",
    createBookingBtn: "Create Booking",
    disclaimer: "The worker will be notified immediately.",
    sendMessage: "Send Message",
    videoCall: "Start Video Call",
    videoCallSub: "Coming soon",
    raiseDispute: "Raise a Dispute",
    noActions: "No actions available.",
    breakdown: "Payment Breakdown",
    agreedRateLabel: "Agreed Rate",
    durationLabel: "Duration",
    platformFee: "Platform Fee (10%)",
    youPay: "You Pay",
    bankTransfer: "Bank Transfer",
    cryptoPay: "Crypto",
    cryptoNote:
      "Pay with cryptocurrency. Funds held in escrow until job is complete.",
    payWith: "Pay with {{coin}}",
    escrowNote: "Funds held in secure escrow until you release payment.",
    bankNote: "Transfer directly to our escrow account.",
    initiateBankTransfer: "Get Bank Details",
    paymentVerified: "Payment verified!",
    detail: "Booking Detail",
    statusPending: "Pending",
    statusAccepted: "Accepted",
    statusInProgress: "In Progress",
    statusCompleted: "Completed",
    statusCancelled: "Cancelled",
    statusDisputed: "Disputed",
  },
  payments: {
    title: "Payment History",
    totalSpent: "Total Spent",
    inEscrow: "In Escrow",
    refunded: "Refunded",
    awaitingRelease: "Awaiting release",
    returnedToYou: "Returned to you",
    noTransactions: "No transactions yet",
    noTransactionsSub:
      "Your payment history will appear here once you book a worker.",
    receipt: "Receipt",
    release: "Release",
    releaseConfirm:
      "Release payment to worker? This confirms the job is complete.",
    releaseSuccess: "Payment released to worker!",
    workerGets: "Worker receives",
    searchPlaceholder: "Search by job, worker or ID…",
    noPayments: "No transactions",
    noPaymentsSub: "Your payment history will appear here.",
    prev: "← Prev",
    next: "Next →",
    youPaid: "You paid",
    receiptTitle: "Payment Receipt",
    from: "FROM (HIRER)",
    to: "TO (WORKER)",
    job: "JOB",
    statusHELD: "In Escrow",
    statusRELEASED: "Released",
    statusPENDING: "Pending",
    statusREFUNDED: "Refunded",
    statusFAILED: "Failed",
  },
  notifications: {
    title: "Notifications",
    unreadCount: "{{count}} unread",
    markAllRead: "Mark all",
    clearAll: "Clear all",
    all: "All",
    unread: "Unread",
    empty: "No notifications",
    emptySub: "You're all caught up!",
    details: "DETAILS",
    ip: "IP",
    device: "Device",
    deleteTitle: "Delete",
    deleteMessage: "Delete permanently?",
    clearTitle: "Clear All",
    clearMessage: "All notifications will be deleted.",
    markedAll: "All marked as read.",
    cleared: "Notifications cleared.",
  },
  browse: {
    title: "Browse Workers",
    searchPlaceholder: "Search workers, skills...",
    search: "Search",
    trending: "Trending",
    results: "Results",
    nearby: "Nearby",
    filters: "Filters",
    topRated: "Top Rated",
    newOnPlatform: "New on SkilledProz",
    available: "AVAILABLE",
    unavailable: "UNAVAILABLE",
    new: "New",
    jobs: "jobs",
    noResults: "No results",
    noResultsSub: "Try different terms or filters.",
    searchResults: "Results",
    nearbyWorkers: "Nearby",
    reset: "Reset",
    minRate: "MIN RATE",
    maxRate: "MAX RATE",
    minRating: "MIN RATING",
    applyFilters: "Apply Filters",
    availableOnly: "Available only",
    hourlyRate: "HOURLY RATE",
    maxDistance: "MAX DISTANCE",
    genderPreference: "GENDER PREFERENCE",
    locationDenied: "Location permission denied",
    voiceSearchSoon: "Voice search coming soon",
  },
  messages: {
    title: "Messages",
    searchPlaceholder: "Search conversations...",
    directMessage: "Direct message",
    viewProfile: "View Profile →",
    typeMessage: "Type a message...",
    noConversations: "No conversations yet",
    noConversationsSub: "Start a conversation by visiting a worker's profile.",
    noMessages: "No messages yet",
    noMessagesSub: "Send a message to start the conversation.",
    viewAttachment: "View attachment",
    errorPermission: "Permission denied",
    attachTitle: "Attach",
    chooseType: "Choose type",
  },
  disputes: {
    title: "My Disputes",
    subtitle: "Manage disputes for your bookings",
    total: "Total",
    active: "Active",
    resolved: "Resolved",
    raiseTitle: "Raise a Dispute",
    submitDispute: "Submit Dispute",
    noDisputes: "No disputes",
    noDisputesSub: "You have no disputes. We hope it stays that way!",
    viewBooking: "View Booking",
    cancelDisputeBtn: "Cancel Dispute",
    support: "SUPPORT",
    all: "All",
    open: "Open",
    underReview: "Under Review",
    cancelled: "Cancelled",
    reasonRequired: "Please select a reason.",
    descriptionRequired: "At least 10 characters.",
    cancelConfirm: "Cancel this dispute?",
    description: "DESCRIPTION",
    raisedSuccess: "Dispute submitted. Review within 24–48 hours.",
    cancelledSuccess: "Dispute cancelled.",
    bookingDispute: "Booking dispute",
    hirer: "Hirer",
    worker: "Worker",
    payment: "Payment",
    errorLoad: "Failed to load disputes.",
  },
  reviews: {
    reputationEyebrow: "YOUR REPUTATION",
    feedbackEyebrow: "YOUR REVIEWS",
    receivedTitle: "Reviews Received",
    givenTitle: "Reviews Given",
    receivedSubtitle: "Feedback from workers about you",
    givenSubtitle: "Reviews you've submitted",
    seeGiven: "See Reviews Given",
    seeReceived: "See Reviews Received",
    reviewsCount: "review",
    submitted: "Reviews submitted",
    avgGiven: "Average rating",
    worker: "Worker",
    hirer: "Hirer",
    viewProfile: "View Profile",
    noReviewsYet: "No reviews",
    noReceivedSub: "Reviews will appear here.",
    noGivenSub: "Complete bookings and leave reviews.",
  },
  posts: {
    myTitle: "My Posts",
    mySubtitle: "Share with the SkilledProz community.",
    communityTitle: "Community",
    post: "Post",
    photo: "Photo",
    public: "Public",
    private: "Private",
    noMyPosts: "No posts",
    noMyPostsSub: "Share your first update.",
    noFeedPosts: "No posts",
    noFeedPostsSub: "Be the first to share!",
    postDeleted: "Post deleted.",
    postPublished: "Post published!",
    createPlaceholder: "What's on your mind? Share an update...",
    startPost: "Start a post...",
    deletePost: "Delete",
    deletePostConfirm: "Delete permanently?",
    errorPermission: "Gallery permission required.",
    errorEmpty: "Write something before posting.",
    comment: "Comment",
    repost: "Repost",
    reposted: "Reposted",
  },
  savedWorkers: {
    title: "Saved Workers",
    subtitle: "Workers you've hired before.",
    available: "Available",
    unavailable: "Unavailable",
    lastHiredFor: "Last hired for: {{category}}",
    perHour: "/hr",
    viewProfile: "View Profile",
    emptyTitle: "No saved workers",
    emptySub: "Workers you hire will appear here.",
  },
  categories: {
    title: "Browse Categories",
    subtitle: "{{count}}+ categories — search or add your own",
    searchPlaceholder: "Search categories...",
    addCategory: "+ Add Category",
    workers: "{{count}} workers",
    worker: "{{count}} worker",
    noResults: "No categories found",
    noResultsSub: "Try a different search or add your own.",
    addModal_title: "Add a Category",
    addModal_subtitle: "Can't find your skill? Add it and we'll review it.",
    addModal_namePlaceholder: "Category name (e.g. Drone Pilot)",
    addModal_descriptionPlaceholder: "Short description (optional)",
    addModal_submit: "Submit Category",
    addModal_cancel: "Cancel",
    addModal_successMessage: "Your category has been added.",
    addModal_alreadyExists: "This category already exists.",
    addModal_nameRequired: "Please enter a category name.",
  },
  verification: {
    selectIdType: "Select ID type",
    tapToChange: "Tap to change",
    uploadInstruction: "Click to upload or drag here",
    uploadHint: "JPG, PNG or PDF — max 10MB",
    accountStatus: "ACCOUNT STATUS",
    pendingTitle: "Verification under review",
    pendingBody:
      "Your documents have been submitted and are being reviewed by our team. This takes 24-48 hours.",
    verifiedTitle: "Account Verified",
    verifiedBody:
      "Your account is fully verified. Workers can see your badge and are more likely to respond.",
    rejectedTitle: "Verification Rejected",
    rejectedBody:
      "Your verification was rejected. Please review the reason and resubmit a valid document.",
    tryAgain: "Try again",
    heroTitle: "Account Verification",
    submitBtn: "Submit for Verification",
    uploadIdLabel: "Upload ID Document",
    uploadTitle: "Upload Document",
    chooseSource: "Choose source",
    errorFilePicker: "Could not open file picker",
    errorIdType: "Please select an ID type",
    errorIdNumber: "Please enter your ID number",
    errorDocument: "Please upload a verification document",
    successSubmit: "Verification submitted! We'll review within 24-48 hours.",
    submissionDate: "Submitted: {{date}}",
  },
  subscriptions: {
    title: "Choose Your Plan",
    subtitle: "Hire smarter, faster and at scale",
    cancel: "Cancel",
    cancelTitle: "Cancel Subscription",
    cancelMessage:
      "Are you sure? You'll keep access until the end of your billing period.",
    keepPlan: "Keep Plan",
    cancelSub: "Cancel Subscription",
    cancelSuccess:
      "Subscription cancelled. Access continues until end of period.",
    errorLoad: "Failed to load plans",
    errorCancel: "Failed to cancel subscription",
    disclaimer: "Payments processed securely. Cancel any time. Prices in USD.",
    currentPlan: "Current Plan",
    freePlan: "Free Plan",
    upgradeTo: "Upgrade to {{name}}",
    activating: "Activating...",
    activeLabel: "Active: {{name}}",
    renews: "Renews on {{date}}",
  },
  workerDash: {
    welcomeBack: "Welcome back",
    available: "Available",
    unavailable: "Unavailable",
    thisMonth: "THIS MONTH",
    lastMonth: "Last month: {{value}}",
    inEscrow: "IN ESCROW",
    awaitingRelease: "Awaiting release",
    activeJobs: "Active jobs",
    pendingRequests: "{{count}} pending requests",
    rating: "Rating",
    newWorker: "New",
    fromReviews: "from {{count}} reviews",
    jobsDone: "Jobs done",
    responseRate: "{{rate}}% response rate",
    unreadMessages: "Messages",
    unreadConversations: "Unread conversations",
    earningsTrend: "Earnings trend",
    fullReport: "Full report",
    profileCompletion: "Profile completion",
    upcomingJobs: "Upcoming jobs",
    recentBookings: "Recent bookings",
    recentReviews: "Recent reviews",
    quickActions: "QUICK ACTIONS",
    seeAll: "See all",
    viewAll: "View all",
    noUpcomingJobs: "No upcoming jobs",
    noBookings: "No bookings yet",
    noReviews: "No reviews yet",
    statusPending: "PENDING",
    statusAccepted: "ACCEPTED",
    statusInProgress: "IN PROGRESS",
    statusCompleted: "COMPLETED",
    statusCancelled: "CANCELLED",
    statusDisputed: "DISPUTED",
    qaProfile: "My profile",
    qaEarnings: "Earnings",
    qaApplications: "Applications",
  },
  workerWallet: {
    eyebrow: "EARNINGS & PAYOUTS",
    title: "Your Wallet",
    subtitle: "Track earnings, escrow and withdraw funds",
    withdrawBtn: "Withdraw Funds",
    available: "AVAILABLE TO WITHDRAW",
    readyNow: "Ready now",
    inEscrow: "IN ESCROW",
    awaitingCompletion: "Awaiting completion",
    totalWithdrawn: "TOTAL WITHDRAWN",
    allTime: "All-time total",
    pendingPayouts: "PENDING PAYOUTS",
    requests: "{{count}} request(s)",
    historyTitle: "Withdrawal History",
    records: "{{count}} records",
    noWithdrawals: "No withdrawals yet",
    noWithdrawalsSub: "Request your first payout using the button above.",
    receiptTitle: "Withdrawal Receipt",
    reference: "REFERENCE",
    requested: "REQUESTED",
    method: "METHOD",
    paidTo: "PAID TO",
    withdrawalAmount: "Withdrawal amount",
    processingFee: "Processing fee (1%)",
    netPayout: "Net payout",
    printPdf: "Print / PDF",
    requestTitle: "Request Payout",
    minWithdrawal: "MINIMUM WITHDRAWAL",
    payoutMethod: "PAYOUT METHOD",
    amountLabel: "AMOUNT",
    payoutDetails: "PAYOUT DETAILS",
    requestBtn: "Request Withdrawal",
    minError: "Minimum withdrawal is {{currency}} {{amount}}",
    balanceError: "Amount exceeds available balance",
    submitSuccess: "Request submitted! Processing within 1-3 business days.",
    submitFail: "Failed to submit request",
    loadFail: "Could not load wallet",
  },
  workerEarnings: {
    totalEarned: "TOTAL EARNED",
    totalJobValue: "TOTAL JOB VALUE",
    platformFees: "PLATFORM FEES",
    transactions: "TRANSACTIONS",
    allCurrencies: "All currencies",
    from: "From",
    to: "To",
    noEarnings: "No earnings yet",
    noEarningsSub:
      "Completed bookings with released payments will appear here.",
    loadFail: "Could not load earnings",
  },
  workerReg: {
    workerAccount: "Worker Account",
    startEarning: "Start earning on your terms",
    startEarningSubtitle: "Set up your profile and start getting hired",
    createAccount: "Create your account",
    min8: "min 8 chars",
    yourProfile: "Your professional profile",
    professionalTitle: "Professional Title",
    professionalTitlePlaceholder: "e.g. Certified Electrician",
    description: "Description",
    descriptionPlaceholder:
      "Describe your skills, experience, specializations...",
    yearsExperience: "Years of Experience",
    serviceRadius: "Service Radius (km)",
    yourCategories: "Your service categories",
    categoriesHint:
      "Select up to 5 categories. Star one to mark it as primary.",
    searchCategories: "Search categories...",
    addCustomCategory: "Add a custom category",
    addCategoryLabel: "Custom Category Name",
    customCategoryPlaceholder: "e.g. Solar Panel Installation",
    addCategory: "Add Category",
    maxCategories: "You can select up to 5 categories",
    addCategoryFailed: "Failed to add custom category",
    setYourRates: "Set your rates",
    ratesNote: "Leave blank to hide that option. Set at least one rate.",
    currency: "Currency",
    hourlyRate: "Hourly Rate",
    dailyRate: "Daily Rate",
    weeklyRate: "Weekly Rate",
    monthlyRate: "Monthly Rate",
    customRate: "Custom Rate",
    customRateAmount: "Custom Rate Amount",
    customRateLabel: "Custom Label",
    customRateLabelPlaceholder: "e.g. per project",
    pricingNote: "Pricing Note (optional)",
    pricingNotePlaceholder: "Discounts, terms, travel fees...",
    ratesPreview: "Your rates preview",
    continue: "Continue",
    hiringSomeone: "Hiring someone?",
    registerAsHirer: "Register as Hirer",
    titleRequired: "Professional title is required",
    descriptionRequired: "Description is required",
    categoriesRequired: "Select at least one category",
    rateRequired: "Set at least one rate",
  },
  workerCat: {
    title: "My Trade Categories",
    subtitle: "Add the trades and professions you offer.",
    addTitle: "Add Category",
    addSub: "Search your trade — it's likely already in our database.",
    searchPlaceholder: "Search plumber, electrician, developer...",
    popularLabel: "POPULAR CATEGORIES",
    total: "{{count}} TOTAL",
    noResults: 'No results for "{{query}}"',
    addNew: 'Add "{{name}}" as new category',
    cantFind: "Can't find your profession? Add it",
    customPrompt: "Add your profession to the platform:",
    customPlaceholder: "e.g. Drone Racing Instructor",
    myCategories: "My Categories",
    setPrimary: "Set as Primary",
    primary: "Primary",
    noCategoriesTitle: "No categories yet",
    noCategoriesSub: "Search and add your trade above to appear in results",
    addSuccess: "{{name}} added!",
    removeConfirmTitle: "Remove Category",
    removeConfirm: 'Remove "{{name}}" from your categories?',
    alreadyAdded: "{{name}} is already in your list.",
    addFail: "Failed to add category.",
    removeFail: "Failed to remove category.",
    primaryFail: "Failed to set primary category.",
  },
  screenSub: {
    dashboard: "Your work at a glance",
    myBookings: "Jobs assigned to you",
    browseJobs: "Find your next opportunity",
    myProfile: "Your public profile",
    earnings: "Track your income",
    wallet: "Earnings & payouts",
    applications: "Jobs you've applied to",
    reviews: "Feedback from hirers",
    portfolio: "Your work gallery",
    certifications: "Your trade certifications",
    categories: "Your trade categories",
    availability: "Set your weekly schedule",
    disputes: "Active disputes",
    verification: "Trust & safety",
    subscriptions: "Plans & billing",
    boostListing: "Stand out in search",
    settings: "Preferences & security",
    notifications: "View & manage alerts",
    messages: "Your conversations",
    community: "Your posts",
    bookingDetail: "Details & actions",
    hirerProfile: "View profile & jobs",
    jobDetails: "View & apply",
    directMessage: "Direct message",
  },
  profile: {
    myProfile: "My Profile",
    yourPublicProfile: "Your public profile",
    totalHires: "hires",
    totalSpent: "total spent",
    rating: "rating",
    lastSeen: "last seen",
    joined: "joined",
    reviews: "reviews",
    review: "review",
    tabAbout: "About",
    tabReviews: "Reviews",
    hirer: "Hirer",
    worker: "Worker",
    emailVerified: "Email Verified",
    idVerified: "ID Verified",
    backgroundChecked: "Background Checked",
    noReviews: "No reviews yet.",
    noBio: "No bio yet.",
    loadingProfile: "Loading profile…",
    userNotFound: "User not found",
    specialities: "Specialities",
    jobsDone: "jobs done",
    radius: "km radius",
    perHour: "per hour",
    justNow: "Just now",
    minutesAgo: "{{m}}m ago",
    hoursAgo: "{{h}}h ago",
    daysAgo: "{{d}}d ago",
    never: "Never",
    addBio: "Add bio",
    book: "Book",
  },
};

// ── Write en.json ─────────────────────────────────────────────────────────────
const enPath = path.join(LOCALES_DIR, "en.json");
fs.writeFileSync(enPath, JSON.stringify(EN, null, 2), "utf8");
const totalKeys = countAll(EN);
console.log(`\n✅  en.json written — ${totalKeys} keys\n`);

// ── Helpers ───────────────────────────────────────────────────────────────────
function countAll(o) {
  let n = 0;
  for (const v of Object.values(o)) {
    if (v && typeof v === "object") n += countAll(v);
    else if (typeof v === "string") n++;
  }
  return n;
}
function countFilled(o) {
  let n = 0;
  for (const v of Object.values(o)) {
    if (v && typeof v === "object") n += countFilled(v);
    else if (typeof v === "string" && v.trim() !== "") n++;
  }
  return n;
}
function mergeDeep(ex, tr) {
  const out = {};
  for (const k of Object.keys(tr)) {
    if (tr[k] && typeof tr[k] === "object") {
      out[k] = mergeDeep((ex || {})[k] || {}, tr[k]);
    } else {
      const e = (ex || {})[k];
      out[k] = e && e !== "" ? e : tr[k];
    }
  }
  return out;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let _gt;
async function gt() {
  if (!_gt) {
    try {
      const m = await import("@vitalets/google-translate-api");
      _gt = m.translate;
    } catch {
      console.error("❌  Run: npm install @vitalets/google-translate-api");
      process.exit(1);
    }
  }
  return _gt;
}

// ── KEY FIX: translate whole namespace as JSON, not key-by-key ───────────────
// Sends ONE request per namespace (~30 total) instead of one per string (1182)
// This is what prevents the "Too Many Requests" block.
async function translateNamespace(nsObj, to, nsName, retries = 3) {
  const fn = await gt();

  // Flatten nested objects to single-level for safe JSON translation
  function flatten(obj, prefix = "") {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      const key = prefix ? `${prefix}__${k}` : k;
      if (v && typeof v === "object") Object.assign(out, flatten(v, key));
      else if (typeof v === "string") out[key] = v;
    }
    return out;
  }
  function unflatten(flat) {
    const out = {};
    for (const [key, val] of Object.entries(flat)) {
      const parts = key.split("__");
      let cur = out;
      for (let i = 0; i < parts.length - 1; i++) {
        cur[parts[i]] = cur[parts[i]] || {};
        cur = cur[parts[i]];
      }
      cur[parts[parts.length - 1]] = val;
    }
    return out;
  }

  const flat = flatten(nsObj);
  const keys = Object.keys(flat);

  // Skip template-only values, translate the rest
  const toTranslate = {};
  const passThrough = {};
  for (const [k, v] of Object.entries(flat)) {
    if (
      /^{{.*}}$/.test(v.trim()) ||
      /^[A-Z_]{2,}$/.test(v.trim()) ||
      v.trim() === ""
    ) {
      passThrough[k] = v;
    } else {
      toTranslate[k] = v;
    }
  }

  if (Object.keys(toTranslate).length === 0) return nsObj;

  // Build a compact string to translate: KEY1|value1||KEY2|value2
  // Use a separator that Google won't mangle
  const SEP = "|||";
  const KEYSEP = "::";
  const payload = Object.entries(toTranslate)
    .map(([k, v]) => `${k}${KEYSEP}${v}`)
    .join(SEP);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await fn(payload, { to });
      const translated = result.text;

      // Parse back
      const pairs = translated.split(SEP);
      const out = { ...passThrough };

      for (const pair of pairs) {
        const colonIdx = pair.indexOf(KEYSEP);
        if (colonIdx === -1) continue;
        const rawKey = pair.slice(0, colonIdx).trim();
        const val = pair.slice(colonIdx + KEYSEP.length).trim();
        // Try to find the original key (Google may translate the key name)
        const origKey = keys.find(
          (k) => k === rawKey || k.toLowerCase() === rawKey.toLowerCase(),
        );
        if (origKey) out[origKey] = val;
      }

      // Fill any keys that didn't parse back (fallback to English)
      for (const k of keys) {
        if (!out[k]) out[k] = flat[k];
      }

      return unflatten(out);
    } catch (err) {
      if (attempt === retries) {
        console.warn(
          `    ⚠️  Namespace '${nsName}' → ${to} failed after ${retries} attempts. Using English fallback.`,
        );
        return nsObj;
      }
      const backoff = [20000, 45000, 90000][attempt - 1] || 90000;
      console.log(
        `    ↺  ${nsName} → ${to}: rate limited, waiting ${backoff / 1000}s…`,
      );
      await sleep(backoff);
    }
  }
  return nsObj;
}

// ── Translate all locales ─────────────────────────────────────────────────────
const targets = ALL_LOCALES.filter((l) => l.code !== "en").filter(
  (l) => !ONLY || ONLY.includes(l.code),
);

for (const loc of targets) {
  const fp = path.join(LOCALES_DIR, `${loc.code}.json`);
  const existing = fs.existsSync(fp)
    ? JSON.parse(fs.readFileSync(fp, "utf8"))
    : {};
  const filled = countFilled(existing);
  const pct = Math.round((filled / totalKeys) * 100);

  if (!FORCE && pct >= 95) {
    console.log(`⏭️   ${loc.code} (${loc.name}) — ${pct}% complete, skipping`);
    continue;
  }

  console.log(
    `\n🌐  Translating → ${loc.code} (${loc.name})  [${filled}/${totalKeys} already done]`,
  );
  const result = {};

  const namespaces = Object.keys(EN);
  for (let i = 0; i < namespaces.length; i++) {
    const ns = namespaces[i];
    process.stdout.write(`   [${i + 1}/${namespaces.length}] ${ns.padEnd(20)}`);

    // If this namespace is already fully translated, skip it
    const exNs = existing[ns] || {};
    const nsTotal = countAll(EN[ns]);
    const nsFilled = countFilled(exNs);
    if (!FORCE && nsFilled >= nsTotal) {
      process.stdout.write("✓ already complete\n");
      result[ns] = exNs;
      continue;
    }

    const translated = await translateNamespace(EN[ns], loc.gtCode, ns);
    result[ns] = mergeDeep(exNs, translated);
    const newFilled = countFilled(result[ns]);
    process.stdout.write(`→ ${newFilled}/${nsTotal} keys ✅\n`);

    // Save after EVERY namespace — so if rate-limited mid-run you don't lose progress
    fs.writeFileSync(fp, JSON.stringify(result, null, 2), "utf8");

    // Pause between namespaces to avoid rate limits
    if (i < namespaces.length - 1) await sleep(DELAY);
  }

  // Save incrementally — after every locale AND after each namespace (see inner loop)
  fs.writeFileSync(fp, JSON.stringify(result, null, 2), "utf8");
  const total = countFilled(result);
  console.log(
    `\n💾  ${loc.code}.json saved — ${total}/${totalKeys} (${Math.round((total / totalKeys) * 100)}%)\n`,
  );
}

// ── Status table ─────────────────────────────────────────────────────────────
console.log("\n" + "═".repeat(56));
console.log("  LOCALE STATUS — all 9 languages");
console.log("═".repeat(56));
console.log(
  `  ${"Locale".padEnd(13)} ${"Code".padEnd(5)} ${"Keys".padEnd(12)} Progress`,
);
console.log("  " + "─".repeat(52));
for (const loc of ALL_LOCALES) {
  const fp = path.join(LOCALES_DIR, `${loc.code}.json`);
  const data = fs.existsSync(fp) ? JSON.parse(fs.readFileSync(fp, "utf8")) : {};
  const f = countFilled(data);
  const pct = Math.round((f / totalKeys) * 100);
  const bar =
    "█".repeat(Math.round(pct / 10)) + "░".repeat(10 - Math.round(pct / 10));
  const icon = pct === 100 ? "✅" : pct > 50 ? "🟡" : "❌";
  console.log(
    `  ${icon} ${loc.name.padEnd(12)} ${loc.code.padEnd(5)} ${`${f}/${totalKeys}`.padEnd(12)} ${bar} ${pct}%`,
  );
}
console.log("═".repeat(56) + "\n");
