// src/i18n/retainedStaff.js
//
// i18n namespace: "retainedStaff"
// Ported verbatim from src/pages/hirer/retained-staff/HirerRetainedStaffDashboard.jsx
// and AddStaffModal.jsx. Every user-facing string in the app screens for
// Retained Staff flows through this namespace. Add translations for other
// locales (ar/es/fr/ha/ig/pt/sw/yo) in a follow-up pass.

const retainedStaff = {
  en: {
    translation: {
      retainedStaff: {
        // ── Dashboard header
        eyebrow: "Retained Staff",
        title: "Payroll Dashboard",
        subtitle: "Manage your standing employees and their monthly payouts",
        addStaffBtn: "Add Staff Member",

        // ── KPI cards
        activeStaff: "Active Staff",
        monthlyBurn: "Monthly Burn",
        pendingPayments: "Pending Payments",
        releasedThisMonth: "Released This Month",

        // ── Panels
        upcomingCycles: "Upcoming Cycles ({{currency}})",
        manageStaff: "Manage Staff",
        payrollSummary: "Payroll Summary ({{currency}})",
        heldInEscrow: "Held in Escrow",
        viewAllStaff: "View All Staff",

        // ── Empty states
        noUpcomingCycles:
          "No upcoming cycles in {{currency}}. Add a staff member or create a manual cycle to get started.",

        // ── Hint card
        getStartedTitle: "Get started with Retained Staff",
        getStartedDesc:
          "Add a worker to your payroll once, then pay them on a recurring schedule (weekly, monthly, or on-demand) — no re-booking required.",
        addFirstStaff: "Add Your First Staff Member",

        // ── AddStaffModal — step 1
        addStaffTitle: "Add Staff Member",
        employmentDetailsTitle: "Employment Details",
        searchSubtitle: "Search for a worker or enter their email",
        setupPayrollFor: "Setting up payroll for {{name}}",
        searchPlaceholder: "Search workers by name, skill, or trade…",
        noWorkersFound: "No workers found. Try a different search.",
        orAddByEmail: "or add by email",
        emailPlaceholder: "worker@example.com",
        findBtn: "Find",
        mustHaveAccount: "The worker must already have a SkilledProz account.",
        invalidEmail: "Please enter a valid email address.",
        noWorkerWithEmail:
          "No worker found with that email. Ask them to sign up on SkilledProz first.",
        couldNotFindWorker:
          "Could not find that worker. Please check the email.",

        // ── AddStaffModal — step 2 sections
        roleAndPosition: "Role & Position",
        jobTitle: "Job Title",
        department: "Department",
        employmentType: "Employment Type",
        locationType: "Location Type",
        workLocation: "Work Location",
        workLocationPlaceholder: "Street, city, state or full address",
        autoDetect: "Auto-detect",
        locating: "Locating…",
        gpsCaptured: "GPS captured: {{lat}}, {{lng}}",
        employeeNumber: "Employee #",
        employeeNumberPlaceholder: "EMP-001",
        roleDescription: "Role Description",
        roleDescriptionPlaceholder: "Brief description of responsibilities",

        compensation: "Compensation",
        payRate: "Pay Rate",
        currency: "Currency",
        payFrequency: "Pay Frequency",
        overtimeRate: "Overtime Rate (optional)",

        workingSchedule: "Working Schedule",
        workDays: "Work Days",
        startTime: "Start Time",
        endTime: "End Time",

        hrInformation: "HR Information (optional)",
        manager: "Manager",
        managerPlaceholder: "Reporting manager",
        emergencyContact: "Emergency Contact",
        emergencyContactPlaceholder: "+234…",
        internalNotes: "Internal Notes",
        internalNotesPlaceholder: "Private notes visible only to you",

        changeBtn: "Change",
        cancelBtn: "Cancel",
        addToStaff: "Add to Staff",
        adding: "Adding…",

        // ── Validation
        jobTitleRequired: "Job title is required.",
        payRateRequired: "Pay rate must be greater than 0.",
        locationRequired:
          "Please provide a work location or use the auto-detect button.",
        addStaffFailed: "Failed to add staff member. Please try again.",
        geolocationUnsupported:
          "Location services are not available on this device.",
        locationPermissionDenied:
          "Location permission denied. Please enable it in settings.",
        locationUnavailable: "Location information is unavailable.",
        locationTimeout: "Location request timed out. Please try again.",
        couldNotGetLocation: "Could not get your location.",
        genericError: "Something went wrong. Please try again.",

        // ── Placeholder / loading
        dashLoading: "Loading payroll dashboard…",

        // ── Employment types
        fullTime: "Full-time",
        partTime: "Part-time",
        contract: "Contract",
        casual: "Casual",

        // ── Location types
        onSite: "On-site",
        remote: "Remote",
        hybrid: "Hybrid",

        // ── Pay frequencies
        weekly: "Weekly",
        biweekly: "Bi-weekly",
        semiMonthly: "Semi-monthly (1st & 15th)",
        monthly: "Monthly",
        quarterly: "Quarterly",
        onDemand: "On-demand",

        // ── Days
        mon: "Mon",
        tue: "Tue",
        wed: "Wed",
        thu: "Thu",
        fri: "Fri",
        sat: "Sat",
        sun: "Sun",
      },
    },
  },
};

export default retainedStaff;
