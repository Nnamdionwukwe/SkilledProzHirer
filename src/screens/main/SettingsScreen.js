// src/screens/main/SettingsScreen.js
//
// Verbatim port of pages/Settings/SettingsPage.jsx.
// Language powered by i18n. All inputs stay above keyboard.
// Security split into 4 tabs: Security (password only),
// Withdrawal PIN, Account Info, Account Status.

import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";

import AppScreen from "../../components/AppScreen";
import AppText from "../../components/AppText";
import PageSkeleton from "../../components/PageSkeleton";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuthStore } from "../../store/authStore";
import {
  useCurrency,
  CURRENCY_META,
  ALL_CURRENCIES,
} from "../../contexts/CurrencyContext";
import client from "../../api/client";
import i18n, { changeLanguage } from "../../i18n";
import { LANGUAGES } from "../../constants/languages";
import {
  FaUser,
  FaBriefcase,
  FaDollarSign,
  FaSyncAlt,
  FaSun,
  FaMoon,
  FaDesktop,
  FaBell,
  FaLock,
  FaShieldAlt,
  FaChartLine,
  FaCheckCircle,
  FaExclamationTriangle,
  FaTimesCircle,
  FaCamera,
  FaInfoCircle,
  FaCheck,
  FaCreditCard,
  FaGlobe,
  FaKey,
  FaTag,
  FaFileAlt,
  FaClipboardCheck,
  FaStar,
  FaCommentDots,
  FaMapMarkerAlt,
  FaCircle,
  FaUndo as FaPauseCircle,
  FaTrash,
  FaTimes,
  FaPencil,
  FaSpinner,
  FaChevronDown,
  FaBriefcase as FaBuilding,
  FaExclamationCircle,
} from "../../icons/fa";

// ── Languages (i18n source) ──────────────────────────────────────
const ALL_LANGUAGES = LANGUAGES.map((l) => ({
  code: l.code ?? l,
  name:
    l.code === "en"
      ? `${l.nativeName ?? l.name ?? l} (Default)`
      : (l.nativeName ?? l.name ?? l),
}));

const CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "CAD",
  "NGN",
  "GHS",
  "KES",
  "ZAR",
  "TZS",
  "UGX",
  "RWF",
  "XOF",
  "XAF",
  "EGP",
  "MWK",
  "MAD",
  "ZMW",
  "SLL",
  "CLP",
  "COP",
  "GNF",
  "STD",
];

const GENDERS = ["Male", "Female", "Non-binary", "Prefer not to say"];
const COMPANY_SIZES = ["1–10", "11–50", "51–200", "201–500", "500+"];
const DURATION_UNITS = [
  { value: "hours", label: "Hours" },
  { value: "days", label: "Days" },
  { value: "weeks", label: "Weeks" },
  { value: "months", label: "Months" },
  { value: "custom", label: "Custom" },
];

const TABS_WORKER = [
  { id: "profile", icon: FaUser, label: "Profile" },
  { id: "work", icon: FaBriefcase, label: "Work Profile" },
  { id: "pricing", icon: FaDollarSign, label: "Pricing" },
  { id: "currencies", icon: FaSyncAlt, label: "Currencies" },
  { id: "appearance", icon: FaSun, label: "Appearance" },
  { id: "notifications", icon: FaBell, label: "Notifications" },
  { id: "privacy", icon: FaLock, label: "Privacy" },
  { id: "security", icon: FaShieldAlt, label: "Security" },
  { id: "pin", icon: FaKey, label: "Withdrawal PIN" },
  { id: "accountInfo", icon: FaInfoCircle, label: "Account Info" },
  { id: "accountStatus", icon: FaExclamationTriangle, label: "Account Status" },
  { id: "activity", icon: FaChartLine, label: "Activity" },
];

const TABS_HIRER = [
  { id: "profile", icon: FaUser, label: "Profile" },
  { id: "company", icon: FaBriefcase, label: "Company" },
  { id: "hiring", icon: FaClipboardCheck, label: "Hiring Prefs" },
  { id: "currencies", icon: FaSyncAlt, label: "Currencies" },
  { id: "appearance", icon: FaSun, label: "Appearance" },
  { id: "notifications", icon: FaBell, label: "Notifications" },
  { id: "privacy", icon: FaLock, label: "Privacy" },
  { id: "security", icon: FaShieldAlt, label: "Security" },
  { id: "pin", icon: FaKey, label: "Withdrawal PIN" },
  { id: "accountInfo", icon: FaInfoCircle, label: "Account Info" },
  { id: "accountStatus", icon: FaExclamationTriangle, label: "Account Status" },
  { id: "activity", icon: FaChartLine, label: "Activity" },
];

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { theme, language, changeTheme, mode } = useTheme();
  const { user, updateUser } = useAuthStore();
  const {
    dashboardCurrency,
    paymentCurrency,
    changeDashboardCurrency,
    changePaymentCurrency,
  } = useCurrency();
  const c = theme.colors;

  const isWorker = user?.role === "WORKER";
  const TABS = isWorker ? TABS_WORKER : TABS_HIRER;

  const [tab, setTab] = useState("profile");
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState("");

  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBlockerModal, setShowBlockerModal] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [currencyPickerTarget, setCurrencyPickerTarget] = useState(null);
  const [showGenderPicker, setShowGenderPicker] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    bio: "",
    phone: "",
    country: "",
    city: "",
    state: "",
    address: "",
    currency: "USD",
    gender: "",
  });
  const [notifs, setNotifs] = useState({
    notifBookings: true,
    notifMessages: true,
    notifPayments: true,
    notifReviews: true,
    notifMarketing: false,
  });
  const [privacy, setPrivacy] = useState({
    profileVisible: true,
    showPhone: false,
    showLocation: true,
    showEmail: false,
    showGender: false,
  });
  const [pricing, setPricing] = useState({
    hourlyRate: "",
    dailyRate: "",
    weeklyRate: "",
    monthlyRate: "",
    yearlyRate: "",
    customRate: "",
    customRateLabel: "",
    pricingNote: "",
    currency: "USD",
  });
  const [workForm, setWorkForm] = useState({
    title: "",
    description: "",
    yearsExperience: "",
    serviceRadius: "25",
    isAvailable: true,
  });
  const [companyForm, setCompanyForm] = useState({
    companyName: "",
    companySize: "",
    website: "",
  });
  const [hiringPrefs, setHiringPrefs] = useState({
    defaultEstimatedUnit: "hours",
    defaultEstimatedValue: "",
  });

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwError, setPwError] = useState("");
  const [pin, setPin] = useState({ new: "", confirm: "", current: "" });
  const [pinStatus, setPinStatus] = useState(null);
  const [pinError, setPinError] = useState("");

  const [pausePassword, setPausePassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deactivationCheck, setDeactivationCheck] = useState(null);
  const [checkLoading, setCheckLoading] = useState(false);

  const [activity, setActivity] = useState(null);
  const [security, setSecurity] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    client
      .get("/settings/profile")
      .then((res) => {
        const u = res.data.data.user;
        setProfile(u);
        setForm({
          firstName: u.firstName || "",
          lastName: u.lastName || "",
          bio: u.bio || "",
          phone: u.phone || "",
          country: u.country || "",
          city: u.city || "",
          state: u.state || "",
          address: u.address || "",
          currency: u.currency || "USD",
          gender: u.gender || "",
        });
        setHiringPrefs({
          defaultEstimatedUnit: u.defaultEstUnit || "hours",
          defaultEstimatedValue: u.defaultEstValue || "",
        });
        setNotifs({
          notifBookings: u.notifBookings ?? true,
          notifMessages: u.notifMessages ?? true,
          notifPayments: u.notifPayments ?? true,
          notifReviews: u.notifReviews ?? true,
          notifMarketing: u.notifMarketing ?? false,
        });
        setPrivacy({
          profileVisible: u.profileVisible ?? true,
          showPhone: u.showPhone ?? false,
          showLocation: u.showLocation ?? true,
          showEmail: u.showEmail ?? false,
          showGender: u.showGender ?? false,
        });
        if (u.workerProfile) {
          const wp = u.workerProfile;
          setWorkForm({
            title: wp.title || "",
            description: wp.description || "",
            yearsExperience: wp.yearsExperience || "",
            serviceRadius: wp.serviceRadius || "25",
            isAvailable: wp.isAvailable ?? true,
          });
          setPricing({
            hourlyRate: wp.hourlyRate || "",
            dailyRate: wp.dailyRate || "",
            weeklyRate: wp.weeklyRate || "",
            monthlyRate: wp.monthlyRate || "",
            yearlyRate: wp.yearlyRate || "",
            customRate: wp.customRate || "",
            customRateLabel: wp.customRateLabel || "",
            pricingNote: wp.pricingNote || "",
            currency: wp.currency || "USD",
          });
        }
        if (u.hirerProfile) {
          setCompanyForm({
            companyName: u.hirerProfile.companyName || "",
            companySize: u.hirerProfile.companySize || "",
            website: u.hirerProfile.website || "",
          });
        }
        updateUser?.(u);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tab === "accountInfo" && !security) {
      client
        .get("/settings/security")
        .then((r) => setSecurity(r.data.data))
        .catch(() => {});
    }
    if (tab === "accountStatus") refreshCheck();
    if (tab === "pin" && pinStatus === null) {
      client
        .get("/payments/pin/status")
        .then((r) => setPinStatus(r.data.data))
        .catch(() => {});
    }
    if (tab === "activity" && !activity) {
      client
        .get("/settings/activity")
        .then((r) => setActivity(r.data.data))
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function refreshCheck() {
    setCheckLoading(true);
    try {
      const r = await client.get("/settings/deactivation-check");
      setDeactivationCheck(r.data.data);
      return r.data.data;
    } catch {
      setDeactivationCheck({
        canPause: true,
        canDelete: true,
        blockers: [],
        currentState: { isPaused: false, deletionScheduledAt: null },
      });
      return null;
    } finally {
      setCheckLoading(false);
    }
  }

  async function openPauseFlow() {
    setPausePassword("");
    setCheckLoading(true);
    const data = await refreshCheck();
    setCheckLoading(false);
    if (!data) return showToast("Could not check your account status", "error");
    if (!data.canPause) return setShowBlockerModal(true);
    setShowPauseModal(true);
  }

  async function openDeleteFlow() {
    setDeletePassword("");
    setDeleteReason("");
    setDeleteConfirmText("");
    setCheckLoading(true);
    const data = await refreshCheck();
    setCheckLoading(false);
    if (!data) return showToast("Could not check your account status", "error");
    if (!data.canDelete) return setShowBlockerModal(true);
    setShowDeleteModal(true);
  }

  async function confirmPause() {
    if (!pausePassword) return showToast("Please enter your password", "error");
    setSaving("pause");
    try {
      await client.post("/settings/pause", { password: pausePassword });
      showToast("Account paused.");
      setTimeout(() => {
        navigation.reset({ index: 0, routes: [{ name: "Login" }] });
      }, 1500);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to pause", "error");
      setSaving("");
    }
  }

  async function confirmDeleteAccount() {
    if (!deletePassword)
      return showToast("Please enter your password", "error");
    if (deleteConfirmText !== "DELETE")
      return showToast('Type "DELETE" to confirm', "error");
    setSaving("delete");
    try {
      await client.delete("/settings/account", {
        data: {
          password: deletePassword,
          reason: deleteReason || undefined,
          confirmDelete: "DELETE",
        },
      });
      showToast("Account scheduled for deletion.");
      setTimeout(() => {
        navigation.reset({ index: 0, routes: [{ name: "Login" }] });
      }, 1500);
    } catch (err) {
      const status = err.response?.status;
      showToast(err.response?.data?.message || "Failed", "error");
      if (status === 409) {
        await refreshCheck();
        setShowBlockerModal(true);
      }
      setSaving("");
    }
  }

  async function saveProfile() {
    setSaving("profile");
    try {
      const res = await client.patch("/settings/profile", form);
      const updated = res.data.data.user;
      setProfile((p) => ({ ...p, ...updated }));
      updateUser?.(updated);
      showToast("Profile saved");
    } catch (e) {
      showToast(e.response?.data?.message || "Save failed", "error");
    } finally {
      setSaving("");
    }
  }

  async function saveHiringPrefs() {
    setSaving("hiring");
    try {
      await client.patch("/settings/profile", {
        defaultEstUnit: hiringPrefs.defaultEstimatedUnit,
        defaultEstValue: hiringPrefs.defaultEstimatedValue || null,
      });
      updateUser?.({
        defaultEstUnit: hiringPrefs.defaultEstimatedUnit,
        defaultEstValue: hiringPrefs.defaultEstimatedValue,
      });
      showToast("Hiring preferences saved");
    } catch {
      showToast("Save failed", "error");
    } finally {
      setSaving("");
    }
  }

  async function handleAvatarChange() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (res.canceled || !res.assets[0]) return;
    const uri = res.assets[0].uri;
    const fd = new FormData();
    fd.append("avatar", { uri, name: "avatar.jpg", type: "image/jpeg" });
    setSaving("avatar");
    try {
      const r = await client.post("/settings/avatar", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const newAvatar = r.data.data.avatar;
      setProfile((p) => ({ ...p, avatar: newAvatar }));
      updateUser?.({ avatar: newAvatar });
      showToast("Photo updated");
    } catch (e) {
      showToast(e.response?.data?.message || "Upload failed", "error");
    } finally {
      setSaving("");
    }
  }

  async function saveWorkProfile() {
    setSaving("work");
    try {
      await client.patch("/settings/worker-profile", workForm);
      showToast("Work profile saved");
    } catch {
      showToast("Save failed", "error");
    } finally {
      setSaving("");
    }
  }

  async function savePricing() {
    setSaving("pricing");
    try {
      await client.patch("/settings/worker-profile", pricing);
      showToast("Pricing saved");
    } catch {
      showToast("Save failed", "error");
    } finally {
      setSaving("");
    }
  }

  async function saveCompany() {
    setSaving("company");
    try {
      await client.patch("/settings/hirer-profile", companyForm);
      showToast("Company profile saved");
    } catch {
      showToast("Save failed", "error");
    } finally {
      setSaving("");
    }
  }

  async function savePassword() {
    if (pw.next !== pw.confirm) return setPwError("Passwords do not match");
    if (pw.next.length < 8) return setPwError("Min 8 characters");
    setPwError("");
    setSaving("password");
    try {
      await client.patch("/settings/password", {
        currentPassword: pw.current,
        newPassword: pw.next,
      });
      setPw({ current: "", next: "", confirm: "" });
      showToast("Password updated");
    } catch (e) {
      showToast(e.response?.data?.message || "Failed", "error");
    } finally {
      setSaving("");
    }
  }

  async function setPins() {
    if (pin.new !== pin.confirm) return setPinError("PINs do not match");
    if (!/^\d{4}$/.test(pin.new))
      return setPinError("PIN must be exactly 4 digits");
    setPinError("");
    setSaving("pin");
    try {
      await client.post("/payments/pin/set", { pin: pin.new });
      setPinStatus((p) => ({ ...p, pinSet: true }));
      setPin({ new: "", confirm: "", current: "" });
      showToast("Withdrawal PIN set");
    } catch (e) {
      setPinError(e.response?.data?.message || "Failed to set PIN");
    } finally {
      setSaving("");
    }
  }

  async function changePin() {
    if (pin.new !== pin.confirm) return setPinError("New PINs do not match");
    if (!/^\d{4}$/.test(pin.new))
      return setPinError("New PIN must be exactly 4 digits");
    if (!pin.current) return setPinError("Current PIN is required");
    setPinError("");
    setSaving("pin");
    try {
      await client.post("/payments/pin/change", {
        currentPin: pin.current,
        newPin: pin.new,
      });
      setPin({ new: "", confirm: "", current: "" });
      showToast("Withdrawal PIN changed");
    } catch (e) {
      setPinError(e.response?.data?.message || "Failed to change PIN");
    } finally {
      setSaving("");
    }
  }

  async function saveNotifs() {
    setSaving("notifs");
    try {
      await client.patch("/settings/notifications", notifs);
      updateUser?.(notifs);
      showToast("Notifications saved");
    } catch {
      showToast("Save failed", "error");
    } finally {
      setSaving("");
    }
  }

  async function savePrivacy() {
    setSaving("privacy");
    try {
      await client.patch("/settings/privacy", privacy);
      updateUser?.(privacy);
      showToast("Privacy saved");
    } catch {
      showToast("Save failed", "error");
    } finally {
      setSaving("");
    }
  }

  if (loading) {
    return (
      <AppScreen scroll={false}>
        <PageSkeleton variant="form" />
      </AppScreen>
    );
  }

  const tabs = TABS;
  const currentLangName =
    ALL_LANGUAGES.find((l) => l.code === language)?.name || "English";

  const openCurrencyPicker = (target) => {
    setCurrencyPickerTarget(target);
    setShowCurrencyPicker(true);
  };

  // ── Derived: blockers + delete lock ──────────────────────────────
  const blockers = deactivationCheck?.blockers ?? [];
  const hasBlockers = blockers.length > 0;
  const canPause = deactivationCheck?.canPause ?? !hasBlockers;
  const canDelete = deactivationCheck?.canDelete ?? !hasBlockers;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      style={{ flex: 1 }}
    >
      <AppScreen
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Toast */}
        {toast ? (
          <View
            style={[
              styles.toast,
              { backgroundColor: toast.type === "success" ? c.green : c.red },
            ]}
          >
            {toast.type === "success" ? (
              <FaCheckCircle size={13} color="#fff" />
            ) : (
              <FaExclamationTriangle size={13} color="#fff" />
            )}
            <AppText
              style={{
                color: "#fff",
                fontSize: 12,
                fontWeight: "700",
                marginLeft: 6,
              }}
            >
              {toast.msg}
            </AppText>
          </View>
        ) : null}

        {/* Header */}
        <View style={{ marginBottom: 16 }}>
          <AppText
            style={{
              fontFamily: "Syne_800ExtraBold",
              fontSize: 24,
              fontWeight: "800",
              color: c.text,
            }}
          >
            Settings
          </AppText>
          <AppText style={{ fontSize: 12, color: c.textDim, marginTop: 2 }}>
            Manage your account, preferences, and platform settings
          </AppText>
        </View>

        {/* Tab nav */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, marginBottom: 16 }}
          contentContainerStyle={{ gap: 6, paddingRight: 8 }}
        >
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <Pressable
                key={t.id}
                onPress={() => setTab(t.id)}
                style={[
                  styles.navBtn,
                  {
                    backgroundColor: active ? c.orangeDim : c.bgCard,
                    borderColor: active ? c.orange : c.border,
                  },
                ]}
              >
                <Icon size={14} color={active ? c.orange : c.textDim} />
                <AppText
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: active ? c.orange : c.textDim,
                    marginLeft: 6,
                  }}
                >
                  {t.label}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ═══════════════ PROFILE ═══════════════ */}
        {tab === "profile" && (
          <Card
            title="Profile Information"
            icon={<FaUser size={18} color={c.orange} />}
            desc="Your personal details visible to others"
            c={c}
          >
            <View style={styles.avatarBlock}>
              <Pressable
                onPress={handleAvatarChange}
                style={[
                  styles.avatarCircle,
                  { backgroundColor: c.orangeDim, borderColor: c.orange },
                ]}
              >
                {profile?.avatar || user?.avatar ? (
                  <Image
                    source={{ uri: profile?.avatar || user?.avatar }}
                    style={{ width: "100%", height: "100%" }}
                  />
                ) : (
                  <AppText
                    style={{ fontSize: 24, fontWeight: "800", color: c.orange }}
                  >
                    {(profile?.firstName || user?.firstName)?.[0]}
                    {(profile?.lastName || user?.lastName)?.[0]}
                  </AppText>
                )}
              </Pressable>
              <View style={{ flex: 1, minWidth: 150 }}>
                <AppText
                  style={{ fontSize: 14, fontWeight: "700", color: c.text }}
                >
                  {profile?.firstName || user?.firstName}{" "}
                  {profile?.lastName || user?.lastName}
                </AppText>
                <AppText
                  style={{
                    fontSize: 10,
                    color: c.orange,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    marginTop: 2,
                    marginBottom: 8,
                  }}
                >
                  {user?.role}
                </AppText>
                <Pressable
                  onPress={handleAvatarChange}
                  disabled={saving === "avatar"}
                  style={[
                    styles.smallBtn,
                    { backgroundColor: c.bgCard, borderColor: c.border },
                  ]}
                >
                  <FaCamera size={11} color={c.textDim} />
                  <AppText
                    style={{
                      fontSize: 11,
                      color: c.textDim,
                      marginLeft: 6,
                      fontWeight: "600",
                    }}
                  >
                    {saving === "avatar" ? "Uploading..." : "Change Photo"}
                  </AppText>
                </Pressable>
                <AppText
                  style={{ fontSize: 9, color: c.textMuted, marginTop: 4 }}
                >
                  JPG, PNG or WebP · max 5MB
                </AppText>
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              <Field
                label="First Name"
                value={form.firstName}
                onChange={(v) => setForm((f) => ({ ...f, firstName: v }))}
                c={c}
              />
              <Field
                label="Last Name"
                value={form.lastName}
                onChange={(v) => setForm((f) => ({ ...f, lastName: v }))}
                c={c}
              />
            </View>
            <Field
              label="Phone"
              value={form.phone}
              onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
              c={c}
              full
            />
            <Field
              label="Bio"
              value={form.bio}
              onChange={(v) => setForm((f) => ({ ...f, bio: v }))}
              c={c}
              multiline
              full
            />

            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              <Field
                label="Country"
                value={form.country}
                onChange={(v) => setForm((f) => ({ ...f, country: v }))}
                c={c}
                placeholder="e.g. Nigeria"
              />
              <Field
                label="State"
                value={form.state}
                onChange={(v) => setForm((f) => ({ ...f, state: v }))}
                c={c}
                placeholder="e.g. Lagos State"
              />
              <Field
                label="City"
                value={form.city}
                onChange={(v) => setForm((f) => ({ ...f, city: v }))}
                c={c}
                placeholder="e.g. Lagos"
              />
              <Field
                label="Address"
                value={form.address}
                onChange={(v) => setForm((f) => ({ ...f, address: v }))}
                c={c}
                placeholder="Street address"
              />
            </View>

            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              <SelectField
                label="Currency"
                value={form.currency}
                onPress={() => openCurrencyPicker("profile")}
                c={c}
              />
              <SelectField
                label="Gender"
                value={form.gender || "Prefer not to say"}
                onPress={() => setShowGenderPicker(true)}
                c={c}
              />
            </View>

            <SaveBtn
              label="Save Profile"
              loading={saving === "profile"}
              onClick={saveProfile}
              c={c}
            />
          </Card>
        )}

        {/* ═══════════════ WORK PROFILE ═══════════════ */}
        {tab === "work" && isWorker && (
          <Card
            title="Work Profile"
            icon={<FaBriefcase size={18} color={c.orange} />}
            desc="Professional details hirers see on your profile"
            c={c}
          >
            <Field
              label="Professional Title"
              value={workForm.title}
              onChange={(v) => setWorkForm((f) => ({ ...f, title: v }))}
              c={c}
              placeholder="e.g. Certified Electrician"
              full
            />
            <Field
              label="Description"
              value={workForm.description}
              onChange={(v) => setWorkForm((f) => ({ ...f, description: v }))}
              c={c}
              multiline
              full
            />
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              <Field
                label="Years of Experience"
                value={workForm.yearsExperience}
                onChange={(v) =>
                  setWorkForm((f) => ({ ...f, yearsExperience: v }))
                }
                c={c}
                placeholder="0"
                numeric
              />
              <Field
                label="Service Radius (km)"
                value={workForm.serviceRadius}
                onChange={(v) =>
                  setWorkForm((f) => ({ ...f, serviceRadius: v }))
                }
                c={c}
                placeholder="25"
                numeric
              />
            </View>
            <Toggle
              label="Available for Bookings"
              desc="Turn off to pause new booking requests"
              checked={workForm.isAvailable}
              onChange={(v) => setWorkForm((f) => ({ ...f, isAvailable: v }))}
              c={c}
            />
            <SaveBtn
              label="Save Work Profile"
              loading={saving === "work"}
              onClick={saveWorkProfile}
              c={c}
            />
          </Card>
        )}

        {/* ═══════════════ PRICING ═══════════════ */}
        {tab === "pricing" && isWorker && (
          <Card
            title="Pricing"
            icon={<FaDollarSign size={18} color={c.orange} />}
            desc="Set your rates for different engagement types"
            c={c}
          >
            <AppText
              style={{ fontSize: 11, color: c.textMuted, lineHeight: 16 }}
            >
              Set rates for each duration type. Leave blank to hide that option
              from your profile.
            </AppText>
            <SelectField
              label="Pricing Currency"
              value={pricing.currency}
              onPress={() => openCurrencyPicker("pricing")}
              c={c}
            />

            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              <PriceField
                label="Hourly Rate"
                suffix="/hr"
                value={pricing.hourlyRate}
                onChange={(v) => setPricing((p) => ({ ...p, hourlyRate: v }))}
                c={c}
              />
              <PriceField
                label="Daily Rate"
                suffix="/day"
                value={pricing.dailyRate}
                onChange={(v) => setPricing((p) => ({ ...p, dailyRate: v }))}
                c={c}
              />
              <PriceField
                label="Weekly Rate"
                suffix="/wk"
                value={pricing.weeklyRate}
                onChange={(v) => setPricing((p) => ({ ...p, weeklyRate: v }))}
                c={c}
              />
              <PriceField
                label="Monthly Rate"
                suffix="/mo"
                value={pricing.monthlyRate}
                onChange={(v) => setPricing((p) => ({ ...p, monthlyRate: v }))}
                c={c}
              />
              <PriceField
                label="Yearly Rate"
                suffix="/yr"
                value={pricing.yearlyRate}
                onChange={(v) => setPricing((p) => ({ ...p, yearlyRate: v }))}
                c={c}
              />
            </View>

            <Divider label="Custom Rate" c={c} />

            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              <Field
                label="Custom Rate Amount"
                value={pricing.customRate}
                onChange={(v) => setPricing((p) => ({ ...p, customRate: v }))}
                c={c}
                placeholder="0.00"
                numeric
              />
              <Field
                label="Custom Label"
                value={pricing.customRateLabel}
                onChange={(v) =>
                  setPricing((p) => ({ ...p, customRateLabel: v }))
                }
                c={c}
                placeholder="e.g. per project"
              />
            </View>

            <Field
              label="Pricing Notes (optional)"
              value={pricing.pricingNote}
              onChange={(v) => setPricing((p) => ({ ...p, pricingNote: v }))}
              c={c}
              multiline
              full
            />

            <SaveBtn
              label="Save Pricing"
              loading={saving === "pricing"}
              onClick={savePricing}
              c={c}
            />
          </Card>
        )}

        {/* ═══════════════ CURRENCIES ═══════════════ */}
        {tab === "currencies" && (
          <>
            <Card
              title="Currency Settings"
              icon={<FaSyncAlt size={18} color={c.orange} />}
              desc="Control how currencies appear across the platform"
              c={c}
            >
              <InfoBox
                c={c}
                text="SkilledProz supports multi-currency. Each setting serves a different purpose — set them independently for the best experience."
              />

              <Section
                label="Dashboard Display Currency"
                labelIcon={<FaChartLine size={11} color={c.orange} />}
                c={c}
              >
                <AppText
                  style={{ fontSize: 11, color: c.textMuted, lineHeight: 16 }}
                >
                  The currency your dashboard stats, earnings totals, and
                  summaries are displayed in.
                </AppText>
                <CurrencyPickerRow
                  current={dashboardCurrency}
                  onChange={changeDashboardCurrency}
                  onOpen={() => openCurrencyPicker("dashboard")}
                  c={c}
                />
              </Section>

              <Divider c={c} />

              <Section
                label={isWorker ? "Payout Currency" : "Payment Currency"}
                labelIcon={<FaCreditCard size={11} color={c.orange} />}
                c={c}
              >
                <AppText
                  style={{ fontSize: 11, color: c.textMuted, lineHeight: 16 }}
                >
                  {isWorker
                    ? "The currency you receive payments in."
                    : "The default currency you use to pay for bookings."}
                </AppText>
                <CurrencyPickerRow
                  current={paymentCurrency}
                  onChange={changePaymentCurrency}
                  onOpen={() => openCurrencyPicker("payment")}
                  c={c}
                />
              </Section>

              {isWorker && (
                <>
                  <Divider c={c} />
                  <Section
                    label="Profile Rate Currency"
                    labelIcon={<FaTag size={11} color={c.orange} />}
                    c={c}
                  >
                    <AppText
                      style={{
                        fontSize: 11,
                        color: c.textMuted,
                        lineHeight: 16,
                      }}
                    >
                      The currency displayed on your profile cards and search
                      results.
                    </AppText>
                    <CurrencyPickerRow
                      current={pricing.currency || "USD"}
                      onChange={(v) =>
                        setPricing((p) => ({ ...p, currency: v }))
                      }
                      onOpen={() => openCurrencyPicker("pricing")}
                      c={c}
                    />
                    <SaveBtn
                      label="Save Profile Currency"
                      loading={saving === "pricing"}
                      onClick={async () => {
                        setSaving("pricing");
                        try {
                          await client.patch("/settings/worker-profile", {
                            currency: pricing.currency,
                          });
                          showToast("Profile currency saved");
                        } catch {
                          showToast("Save failed", "error");
                        } finally {
                          setSaving("");
                        }
                      }}
                      c={c}
                    />
                  </Section>
                </>
              )}
            </Card>

            <Card
              title="Currency Summary"
              icon={<FaFileAlt size={18} color={c.orange} />}
              desc="How your currencies are configured"
              c={c}
            >
              <CurrencySummaryGrid
                items={[
                  {
                    icon: <FaChartLine size={18} color={c.orange} />,
                    label: "Dashboard shows stats in",
                    value: `${CURRENCY_META[dashboardCurrency]?.symbol} ${dashboardCurrency}`,
                    hint: "Display only",
                  },
                  {
                    icon: <FaCreditCard size={18} color={c.orange} />,
                    label: isWorker ? "You receive payments in" : "You pay in",
                    value: `${CURRENCY_META[paymentCurrency]?.symbol} ${paymentCurrency}`,
                    hint: "Actual transactions",
                  },
                  ...(isWorker
                    ? [
                        {
                          icon: <FaTag size={18} color={c.orange} />,
                          label: "Profile rates shown in",
                          value: `${CURRENCY_META[pricing.currency || "USD"]?.symbol} ${pricing.currency || "USD"}`,
                          hint: "Displayed to hirers",
                        },
                      ]
                    : []),
                ]}
                c={c}
              />
            </Card>
          </>
        )}

        {/* ═══════════════ COMPANY ═══════════════ */}
        {tab === "company" && !isWorker && (
          <Card
            title="Company Profile"
            icon={<FaBriefcase size={18} color={c.orange} />}
            desc="Company information visible to workers you hire"
            c={c}
          >
            <Field
              label="Company Name"
              value={companyForm.companyName}
              onChange={(v) =>
                setCompanyForm((f) => ({ ...f, companyName: v }))
              }
              c={c}
              placeholder="Acme Corp"
              full
            />
            <OptionRow
              label="Company Size"
              options={COMPANY_SIZES}
              value={companyForm.companySize}
              onChange={(v) =>
                setCompanyForm((f) => ({ ...f, companySize: v }))
              }
              c={c}
            />
            <Field
              label="Website"
              value={companyForm.website}
              onChange={(v) => setCompanyForm((f) => ({ ...f, website: v }))}
              c={c}
              placeholder="https://yourcompany.com"
              full
            />
            <SaveBtn
              label="Save Company Profile"
              loading={saving === "company"}
              onClick={saveCompany}
              c={c}
            />
          </Card>
        )}

        {/* ═══════════════ HIRING PREFS ═══════════════ */}
        {tab === "hiring" && !isWorker && (
          <Card
            title="Hiring Preferences"
            icon={<FaClipboardCheck size={18} color={c.orange} />}
            desc="Default settings when creating bookings"
            c={c}
          >
            <AppText
              style={{ fontSize: 11, color: c.textMuted, lineHeight: 16 }}
            >
              Choose your default estimated duration format when creating new
              bookings.
            </AppText>
            <AppText style={styles.label(c)}>
              Default Estimated Duration Unit
            </AppText>
            <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
              {DURATION_UNITS.map((u) => {
                const active = hiringPrefs.defaultEstimatedUnit === u.value;
                return (
                  <Pressable
                    key={u.value}
                    onPress={() =>
                      setHiringPrefs((p) => ({
                        ...p,
                        defaultEstimatedUnit: u.value,
                      }))
                    }
                    style={[
                      styles.unitBtn,
                      {
                        backgroundColor: active ? c.orangeDim : c.bgCard,
                        borderColor: active ? c.orangeGlow : c.border,
                      },
                    ]}
                  >
                    <AppText
                      style={{
                        fontSize: 11,
                        fontWeight: "600",
                        color: active ? c.orange : c.textDim,
                      }}
                    >
                      {u.label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
            {hiringPrefs.defaultEstimatedUnit !== "" && (
              <Field
                label={`Default Estimated Value (${hiringPrefs.defaultEstimatedUnit === "custom" ? "describe" : hiringPrefs.defaultEstimatedUnit})`}
                value={hiringPrefs.defaultEstimatedValue}
                onChange={(v) =>
                  setHiringPrefs((p) => ({ ...p, defaultEstimatedValue: v }))
                }
                c={c}
                placeholder={
                  hiringPrefs.defaultEstimatedUnit === "custom"
                    ? "e.g. 2 weeks + weekend"
                    : "e.g. 8"
                }
                numeric={hiringPrefs.defaultEstimatedUnit !== "custom"}
                full
              />
            )}
            <InfoBox
              c={c}
              text="These are defaults only — you can always change duration per booking."
            />
            <SaveBtn
              label="Save Hiring Preferences"
              loading={saving === "hiring"}
              onClick={saveHiringPrefs}
              c={c}
            />
          </Card>
        )}

        {/* ═══════════════ APPEARANCE ═══════════════ */}
        {tab === "appearance" && (
          <Card
            title="Appearance"
            icon={<FaSun size={18} color={c.orange} />}
            desc="Theme and language preferences"
            c={c}
          >
            <Section
              label="Theme"
              labelIcon={<FaMoon size={11} color={c.orange} />}
              c={c}
            >
              <AppText
                style={{
                  fontSize: 11,
                  color: c.textMuted,
                  lineHeight: 16,
                  marginBottom: 8,
                }}
              >
                Choose how SkilledProz looks on your device.
              </AppText>
              <View style={{ flexDirection: "row", gap: 6 }}>
                {[
                  { id: "light", icon: FaSun, label: "Light" },
                  { id: "dark", icon: FaMoon, label: "Dark" },
                  { id: "system", icon: FaDesktop, label: "System" },
                ].map((t) => {
                  const Icon = t.icon;
                  const active = mode === t.id;
                  return (
                    <Pressable
                      key={t.id}
                      onPress={() => changeTheme(t.id)}
                      style={[
                        styles.themeCard,
                        {
                          flex: 1,
                          backgroundColor: active ? c.orangeDim : c.bgCard,
                          borderColor: active ? c.orange : c.border,
                        },
                      ]}
                    >
                      <Icon size={18} color={c.orange} />
                      <AppText
                        style={{
                          fontSize: 11,
                          fontWeight: "600",
                          color: active ? c.orange : c.textDim,
                          marginTop: 4,
                        }}
                      >
                        {t.label}
                      </AppText>
                      {active ? (
                        <FaCheck
                          size={11}
                          color={c.orange}
                          style={{ position: "absolute", top: 6, right: 8 }}
                        />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </Section>

            <Divider c={c} />

            <Section
              label="Language"
              labelIcon={<FaGlobe size={11} color={c.orange} />}
              c={c}
            >
              <AppText
                style={{ fontSize: 11, color: c.textMuted, lineHeight: 16 }}
              >
                Select your preferred language.
              </AppText>
              <Pressable
                onPress={() => setShowLangPicker(true)}
                style={[
                  styles.input,
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    backgroundColor: c.bgInput,
                    borderColor: c.border,
                  },
                ]}
              >
                <AppText style={{ fontSize: 13, color: c.text }}>
                  {currentLangName}
                </AppText>
                <FaChevronDown size={12} color={c.textDim} />
              </Pressable>
              <InfoBox c={c} text="Select English to revert back." />
            </Section>
          </Card>
        )}

        {/* ═══════════════ NOTIFICATIONS ═══════════════ */}
        {tab === "notifications" && (
          <Card
            title="Notifications"
            icon={<FaBell size={18} color={c.orange} />}
            desc="Choose what you get notified about"
            c={c}
          >
            <Toggle
              label="Booking updates"
              desc="New bookings, status changes, confirmations"
              checked={notifs.notifBookings}
              onChange={(v) => setNotifs((n) => ({ ...n, notifBookings: v }))}
              c={c}
              icon={<FaClipboardCheck size={13} color={c.orange} />}
            />
            <Toggle
              label="Messages"
              desc="New messages from hirers or workers"
              checked={notifs.notifMessages}
              onChange={(v) => setNotifs((n) => ({ ...n, notifMessages: v }))}
              c={c}
              icon={<FaCommentDots size={13} color={c.orange} />}
            />
            <Toggle
              label="Payment alerts"
              desc="Escrow releases, payment confirmations"
              checked={notifs.notifPayments}
              onChange={(v) => setNotifs((n) => ({ ...n, notifPayments: v }))}
              c={c}
              icon={<FaCreditCard size={13} color={c.orange} />}
            />
            <Toggle
              label="Reviews"
              desc="New reviews on your profile"
              checked={notifs.notifReviews}
              onChange={(v) => setNotifs((n) => ({ ...n, notifReviews: v }))}
              c={c}
              icon={<FaStar size={13} color={c.orange} />}
            />
            <Toggle
              label="Product updates"
              desc="New features and platform news"
              checked={notifs.notifMarketing}
              onChange={(v) => setNotifs((n) => ({ ...n, notifMarketing: v }))}
              c={c}
              icon={<FaChartLine size={13} color={c.orange} />}
            />
            <SaveBtn
              label="Save Notification Preferences"
              loading={saving === "notifs"}
              onClick={saveNotifs}
              c={c}
            />
          </Card>
        )}

        {/* ═══════════════ PRIVACY ═══════════════ */}
        {tab === "privacy" && (
          <Card
            title="Privacy"
            icon={<FaLock size={18} color={c.orange} />}
            desc="Control who sees your information"
            c={c}
          >
            <Toggle
              label="Public Profile"
              desc="Allow your profile to appear public or private"
              checked={privacy.profileVisible}
              onChange={(v) => setPrivacy((p) => ({ ...p, profileVisible: v }))}
              c={c}
            />
            <Toggle
              label="Show Phone Number"
              desc="Display your phone number to hirers or workers"
              checked={privacy.showPhone}
              onChange={(v) => setPrivacy((p) => ({ ...p, showPhone: v }))}
              c={c}
            />
            <Toggle
              label="Show Location"
              desc="Display your city and country on your profile"
              checked={privacy.showLocation}
              onChange={(v) => setPrivacy((p) => ({ ...p, showLocation: v }))}
              c={c}
            />
            <Toggle
              label="Show Email Address"
              desc="Display your email on your public profile"
              checked={privacy.showEmail}
              onChange={(v) => setPrivacy((p) => ({ ...p, showEmail: v }))}
              c={c}
            />
            <Toggle
              label="Show Gender"
              desc="Display your gender on your public profile"
              checked={privacy.showGender}
              onChange={(v) => setPrivacy((p) => ({ ...p, showGender: v }))}
              c={c}
            />
            <SaveBtn
              label="Save Privacy Settings"
              loading={saving === "privacy"}
              onClick={savePrivacy}
              c={c}
            />
          </Card>
        )}

        {/* ═══════════════ SECURITY (password only) ═══════════════ */}
        {tab === "security" && (
          <Card
            title="Change Password"
            icon={<FaKey size={18} color={c.orange} />}
            desc="Keep your account secure"
            c={c}
          >
            <Field
              label="Current Password"
              value={pw.current}
              onChange={(v) => setPw((p) => ({ ...p, current: v }))}
              c={c}
              secure
              full
            />
            <Field
              label="New Password (min 8 chars)"
              value={pw.next}
              onChange={(v) => setPw((p) => ({ ...p, next: v }))}
              c={c}
              secure
              full
            />
            <Field
              label="Confirm New Password"
              value={pw.confirm}
              onChange={(v) => setPw((p) => ({ ...p, confirm: v }))}
              c={c}
              secure
              full
            />
            {pwError ? (
              <AppText style={{ fontSize: 11, color: c.red }}>
                {pwError}
              </AppText>
            ) : null}
            <SaveBtn
              label="Update Password"
              loading={saving === "password"}
              onClick={savePassword}
              c={c}
            />
          </Card>
        )}

        {/* ═══════════════ WITHDRAWAL PIN (its own tab) ═══════════════ */}
        {tab === "pin" && (
          <Card
            title="Withdrawal PIN"
            icon={<FaKey size={18} color={c.orange} />}
            desc="4-digit PIN required to authorise every wallet withdrawal"
            c={c}
          >
            {pinStatus === null ? (
              <ActivityIndicator
                size="small"
                color={c.orange}
                style={{ marginVertical: 20 }}
              />
            ) : (
              <>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    padding: 10,
                    borderRadius: 8,
                    backgroundColor: pinStatus.pinSet ? c.greenDim : c.redDim,
                    borderWidth: 1,
                    borderColor: pinStatus.pinSet ? c.green : c.red,
                  }}
                >
                  {pinStatus.pinSet ? (
                    <FaCheckCircle size={13} color={c.green} />
                  ) : (
                    <FaExclamationTriangle size={13} color={c.red} />
                  )}
                  <AppText
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: pinStatus.pinSet ? c.green : c.red,
                      flex: 1,
                    }}
                  >
                    {pinStatus.pinSet
                      ? "PIN is set — required for all withdrawals"
                      : "No PIN set — you must set one before withdrawing"}
                  </AppText>
                </View>
                {pinStatus.isLocked ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      padding: 10,
                      borderRadius: 8,
                      backgroundColor: "rgba(251,191,36,0.12)",
                      borderWidth: 1,
                      borderColor: "rgba(251,191,36,0.4)",
                      marginTop: 6,
                    }}
                  >
                    <FaLock size={13} color="#fbbf24" />
                    <AppText
                      style={{ fontSize: 12, color: "#fbbf24", flex: 1 }}
                    >
                      PIN locked — too many wrong attempts
                    </AppText>
                  </View>
                ) : null}

                {!pinStatus.pinSet ? (
                  <>
                    <AppText
                      style={{
                        fontSize: 11,
                        color: c.textMuted,
                        lineHeight: 16,
                      }}
                    >
                      Set a 4-digit PIN to secure your withdrawals. You'll enter
                      this every time you request a payout.
                    </AppText>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <PinField
                        label="New PIN"
                        value={pin.new}
                        onChange={(v) => {
                          setPin((p) => ({ ...p, new: v }));
                          setPinError("");
                        }}
                        c={c}
                      />
                      <PinField
                        label="Confirm PIN"
                        value={pin.confirm}
                        onChange={(v) => {
                          setPin((p) => ({ ...p, confirm: v }));
                          setPinError("");
                        }}
                        c={c}
                      />
                    </View>
                    {pinError ? (
                      <AppText style={{ fontSize: 11, color: c.red }}>
                        {pinError}
                      </AppText>
                    ) : null}
                    <SaveBtn
                      label="Set Withdrawal PIN"
                      loading={saving === "pin"}
                      onClick={setPins}
                      c={c}
                    />
                  </>
                ) : (
                  <>
                    <AppText
                      style={{
                        fontSize: 11,
                        color: c.textMuted,
                        lineHeight: 16,
                      }}
                    >
                      Enter your current PIN then choose a new one.
                    </AppText>
                    <View
                      style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}
                    >
                      <PinField
                        label="Current PIN"
                        value={pin.current}
                        onChange={(v) => {
                          setPin((p) => ({ ...p, current: v }));
                          setPinError("");
                        }}
                        c={c}
                      />
                      <PinField
                        label="New PIN"
                        value={pin.new}
                        onChange={(v) => {
                          setPin((p) => ({ ...p, new: v }));
                          setPinError("");
                        }}
                        c={c}
                      />
                      <PinField
                        label="Confirm New PIN"
                        value={pin.confirm}
                        onChange={(v) => {
                          setPin((p) => ({ ...p, confirm: v }));
                          setPinError("");
                        }}
                        c={c}
                      />
                    </View>
                    {pinError ? (
                      <AppText style={{ fontSize: 11, color: c.red }}>
                        {pinError}
                      </AppText>
                    ) : null}
                    <SaveBtn
                      label="Change PIN"
                      loading={saving === "pin"}
                      onClick={changePin}
                      c={c}
                    />
                  </>
                )}
              </>
            )}
          </Card>
        )}

        {/* ═══════════════ ACCOUNT INFO (its own tab) ═══════════════ */}
        {tab === "accountInfo" && (
          <Card
            title="Account Info"
            icon={<FaShieldAlt size={18} color={c.orange} />}
            desc="Your verification and account status"
            c={c}
          >
            {security ? (
              <>
                <SecRow label="Email" value={security.email} c={c} />
                <SecRow
                  label="Email Verified"
                  value={
                    security.isEmailVerified ? "✓ Verified" : "✗ Not verified"
                  }
                  color={security.isEmailVerified ? c.green : c.red}
                  c={c}
                />
                <SecRow
                  label="Phone Verified"
                  value={
                    security.isPhoneVerified ? "✓ Verified" : "✗ Not verified"
                  }
                  color={security.isPhoneVerified ? c.green : c.red}
                  c={c}
                />
                <SecRow
                  label="2FA"
                  value={
                    security.twoFactorEnabled
                      ? "✓ Enabled"
                      : "⚠ Not enabled (coming soon)"
                  }
                  color={security.twoFactorEnabled ? c.green : "#fbbf24"}
                  c={c}
                />
                <SecRow
                  label="Member Since"
                  value={
                    security.accountCreated
                      ? new Date(security.accountCreated).toLocaleDateString(
                          "en-GB",
                          { day: "numeric", month: "long", year: "numeric" },
                        )
                      : "—"
                  }
                  c={c}
                />
                <SecRow
                  label="Last Seen"
                  value={
                    security.lastSeen
                      ? new Date(security.lastSeen).toLocaleString()
                      : "—"
                  }
                  c={c}
                />
              </>
            ) : (
              <ActivityIndicator
                size="small"
                color={c.orange}
                style={{ marginVertical: 20 }}
              />
            )}
          </Card>
        )}

        {/* ═══════════════ ACCOUNT STATUS (new tab) ═══════════════ */}
        {tab === "accountStatus" && (
          <>
            {/* Current state banner */}
            {deactivationCheck?.currentState?.deletionScheduledAt ? (
              <View
                style={{
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: c.redDim,
                  borderWidth: 1,
                  borderColor: c.red,
                  marginBottom: 12,
                  flexDirection: "row",
                  gap: 8,
                  alignItems: "flex-start",
                }}
              >
                <FaExclamationTriangle
                  size={16}
                  color={c.red}
                  style={{ marginTop: 2 }}
                />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <AppText
                    style={{ fontSize: 12, fontWeight: "700", color: c.red }}
                  >
                    Account scheduled for deletion
                  </AppText>
                  <AppText
                    style={{
                      fontSize: 11,
                      color: c.textDim,
                      marginTop: 4,
                      lineHeight: 16,
                    }}
                  >
                    Your account will be permanently deleted on{" "}
                    <AppText style={{ fontWeight: "700", color: c.text }}>
                      {new Date(
                        deactivationCheck.currentState.deletionScheduledAt,
                      ).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </AppText>
                    . Log in before then to cancel.
                  </AppText>
                  <Pressable
                    onPress={async () => {
                      try {
                        await client.post("/settings/cancel-deletion");
                        showToast("Deletion cancelled. Welcome back!");
                        await refreshCheck();
                      } catch {
                        showToast("Failed to cancel deletion", "error");
                      }
                    }}
                    style={[
                      styles.outlineBtn,
                      {
                        borderColor: c.red,
                        marginTop: 10,
                        alignSelf: "flex-start",
                      },
                    ]}
                  >
                    <AppText
                      style={{ fontSize: 11, fontWeight: "700", color: c.red }}
                    >
                      Cancel deletion
                    </AppText>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {deactivationCheck?.currentState?.isPaused &&
            !deactivationCheck?.currentState?.deletionScheduledAt ? (
              <View
                style={{
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: "rgba(234,179,8,0.08)",
                  borderWidth: 1,
                  borderColor: "rgba(234,179,8,0.25)",
                  marginBottom: 12,
                  flexDirection: "row",
                  gap: 8,
                  alignItems: "flex-start",
                }}
              >
                <FaPauseCircle
                  size={16}
                  color="#facc15"
                  style={{ marginTop: 2 }}
                />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <AppText
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: "#facc15",
                    }}
                  >
                    Account currently paused
                  </AppText>
                  <AppText
                    style={{
                      fontSize: 11,
                      color: c.textDim,
                      marginTop: 4,
                      lineHeight: 16,
                    }}
                  >
                    Your profile is hidden and you won't receive new bookings.
                    Resume anytime.
                  </AppText>
                  <Pressable
                    onPress={async () => {
                      try {
                        await client.post("/settings/resume");
                        showToast("Account resumed. Welcome back!");
                        await refreshCheck();
                      } catch {
                        showToast("Failed to resume account", "error");
                      }
                    }}
                    style={[
                      styles.outlineBtn,
                      {
                        borderColor: "#facc15",
                        marginTop: 10,
                        alignSelf: "flex-start",
                      },
                    ]}
                  >
                    <AppText
                      style={{
                        fontSize: 11,
                        fontWeight: "700",
                        color: "#facc15",
                      }}
                    >
                      Resume account
                    </AppText>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {/* ── Blockers (show ALL) ── */}
            {hasBlockers ? (
              <View
                style={{
                  padding: 14,
                  borderRadius: 12,
                  backgroundColor: "rgba(234,179,8,0.08)",
                  borderWidth: 1,
                  borderColor: "rgba(234,179,8,0.25)",
                  borderLeftWidth: 3,
                  borderLeftColor: "#eab308",
                  marginBottom: 12,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 10,
                  }}
                >
                  <FaExclamationTriangle size={16} color="#facc15" />
                  <AppText
                    style={{
                      fontSize: 12,
                      fontWeight: "800",
                      color: "#facc15",
                    }}
                  >
                    {blockers.length} item{blockers.length === 1 ? "" : "s"} to
                    resolve first
                  </AppText>
                </View>
                <AppText
                  style={{
                    fontSize: 11,
                    color: c.textDim,
                    lineHeight: 16,
                    marginBottom: 10,
                  }}
                >
                  You cannot pause or delete your account while you have active
                  commitments on the platform. Resolve the following, then come
                  back:
                </AppText>
                {blockers.map((b) => (
                  <View
                    key={b.code}
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      borderRadius: 8,
                      backgroundColor: c.bgCard,
                      borderWidth: 1,
                      borderColor: c.border,
                      marginBottom: 8,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <View
                        style={{
                          minWidth: 24,
                          height: 24,
                          paddingHorizontal: 6,
                          borderRadius: 12,
                          backgroundColor: c.redDim,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <AppText
                          style={{
                            fontSize: 11,
                            fontWeight: "800",
                            color: c.red,
                          }}
                        >
                          {b.count}
                        </AppText>
                      </View>
                      <AppText
                        style={{
                          fontSize: 13,
                          fontWeight: "700",
                          color: c.text,
                          flex: 1,
                        }}
                      >
                        {b.label}
                      </AppText>
                    </View>
                    {b.hint ? (
                      <AppText
                        style={{
                          fontSize: 11,
                          color: c.textDim,
                          marginTop: 6,
                          lineHeight: 16,
                        }}
                      >
                        {b.hint}
                      </AppText>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : null}

            {/* ── Pause Account ── */}
            <Card
              title="Take a Break"
              icon={<FaPauseCircle size={18} color={c.orange} />}
              desc="Hide your profile and pause new bookings — reversible anytime"
              c={c}
            >
              <AppText
                style={{ fontSize: 12, color: c.textDim, lineHeight: 18 }}
              >
                Pausing hides your profile and stops new bookings from coming
                in. Your data, reviews, and history are fully preserved. Log
                back in at any time to reactivate.
              </AppText>
              <Pressable
                onPress={openPauseFlow}
                disabled={
                  saving === "pause" || checkLoading || !canPause || hasBlockers
                }
                style={[
                  styles.primaryBtn,
                  {
                    backgroundColor:
                      !canPause || hasBlockers ? c.bgInput : c.orange,
                    alignSelf: "flex-start",
                    paddingHorizontal: 24,
                    opacity: saving === "pause" || checkLoading ? 0.5 : 1,
                  },
                ]}
              >
                {saving === "pause" || checkLoading ? (
                  <ActivityIndicator size="small" color={c.textDim} />
                ) : (
                  <AppText
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: !canPause || hasBlockers ? c.textMuted : c.bg,
                    }}
                  >
                    {!canPause || hasBlockers
                      ? "Resolve issues first"
                      : "Pause Account"}
                  </AppText>
                )}
              </Pressable>
            </Card>

            {/* ── Delete Account — hard-locked when blockers exist ── */}
            <Card
              title="Leave SkilledProz"
              icon={<FaTrash size={18} color={c.red} />}
              desc="Permanently delete your profile after a 30-day grace period"
              c={c}
            >
              <View
                style={{
                  padding: 10,
                  borderRadius: 8,
                  backgroundColor: c.redDim,
                  borderWidth: 1,
                  borderColor: "rgba(239,68,68,0.2)",
                }}
              >
                <AppText
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    color: c.red,
                    marginBottom: 4,
                  }}
                >
                  What happens when you delete:
                </AppText>
                {[
                  "Your profile is hidden immediately",
                  "Your data is permanently removed after 30 days",
                  "Your reviews remain, anonymised as 'Former User'",
                  "Transaction records are kept for legal compliance",
                  "Log in within 30 days to cancel the deletion",
                ].map((line) => (
                  <AppText
                    key={line}
                    style={{ fontSize: 11, color: c.textDim, lineHeight: 16 }}
                  >
                    • {line}
                  </AppText>
                ))}
              </View>

              {hasBlockers || !canDelete ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: 8,
                    padding: 12,
                    borderRadius: 10,
                    backgroundColor: "rgba(239,68,68,0.08)",
                    borderWidth: 1,
                    borderColor: "rgba(239,68,68,0.25)",
                  }}
                >
                  <FaLock size={14} color={c.red} style={{ marginTop: 2 }} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <AppText
                      style={{ fontSize: 12, fontWeight: "700", color: c.red }}
                    >
                      Delete is disabled
                    </AppText>
                    <AppText
                      style={{
                        fontSize: 11,
                        color: c.textDim,
                        marginTop: 4,
                        lineHeight: 16,
                      }}
                    >
                      You have {blockers.length} active commitment
                      {blockers.length === 1 ? "" : "s"} on the platform.
                      Resolve them first — the delete action unlocks
                      automatically once your account is fully idle.
                    </AppText>
                  </View>
                </View>
              ) : (
                <Pressable
                  onPress={openDeleteFlow}
                  disabled={saving === "delete" || checkLoading}
                  style={[
                    styles.primaryBtn,
                    {
                      backgroundColor: c.red,
                      alignSelf: "flex-start",
                      paddingHorizontal: 24,
                    },
                  ]}
                >
                  {saving === "delete" || checkLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <AppText
                      style={{ fontSize: 12, fontWeight: "700", color: "#fff" }}
                    >
                      Delete Account
                    </AppText>
                  )}
                </Pressable>
              )}
            </Card>
          </>
        )}

        {/* ═══════════════ ACTIVITY ═══════════════ */}
        {tab === "activity" && (
          <Card
            title="Account Activity"
            icon={<FaChartLine size={18} color={c.orange} />}
            desc="Your recent platform activity"
            c={c}
          >
            {activity ? (
              <>
                <View
                  style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}
                >
                  <StatCard
                    icon={<FaBell size={16} color={c.orange} />}
                    label="Unread notifications"
                    value={activity.summary.unreadNotifications}
                    c={c}
                  />
                  <StatCard
                    icon={<FaClipboardCheck size={16} color={c.orange} />}
                    label="Total bookings"
                    value={activity.summary.totalBookings}
                    c={c}
                  />
                  <StatCard
                    icon={<FaStar size={16} color={c.orange} />}
                    label="Reviews received"
                    value={activity.summary.totalReviews}
                    c={c}
                  />
                </View>
                <Divider label="Recent Activity" c={c} />
                {activity.recentActivity?.length === 0 ? (
                  <AppText
                    style={{
                      fontSize: 12,
                      color: c.textMuted,
                      textAlign: "center",
                      padding: 20,
                    }}
                  >
                    No recent activity yet.
                  </AppText>
                ) : (
                  activity.recentActivity?.map((n) => (
                    <View
                      key={n.id}
                      style={[
                        styles.actItem,
                        {
                          borderBottomColor: c.border,
                          backgroundColor: !n.isRead
                            ? "rgba(249,115,22,0.03)"
                            : "transparent",
                        },
                      ]}
                    >
                      <View style={{ width: 20, alignItems: "center" }}>
                        <FaBell size={12} color={c.orange} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <AppText
                          style={{
                            fontSize: 12,
                            fontWeight: "600",
                            color: c.text,
                          }}
                        >
                          {n.title}
                        </AppText>
                        <AppText
                          style={{
                            fontSize: 11,
                            color: c.textDim,
                            marginTop: 2,
                          }}
                          numberOfLines={1}
                        >
                          {n.body}
                        </AppText>
                        <AppText
                          style={{
                            fontSize: 10,
                            color: c.textMuted,
                            marginTop: 2,
                          }}
                        >
                          {new Date(n.createdAt).toLocaleString()}
                        </AppText>
                      </View>
                      {!n.isRead ? (
                        <View
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: 3.5,
                            backgroundColor: c.orange,
                            marginTop: 4,
                          }}
                        />
                      ) : null}
                    </View>
                  ))
                )}
              </>
            ) : (
              <ActivityIndicator
                size="small"
                color={c.orange}
                style={{ marginVertical: 20 }}
              />
            )}
          </Card>
        )}

        {/* ═══════════════════ MODALS ═══════════════════ */}
        <Modal
          visible={showPauseModal}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setShowPauseModal(false);
            setPausePassword("");
          }}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => {
              setShowPauseModal(false);
              setPausePassword("");
            }}
          >
            <Pressable
              style={[
                styles.modalCard,
                { backgroundColor: c.bgPanel, borderColor: c.border },
              ]}
              onPress={(e) => e.stopPropagation()}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: c.orangeDim,
                    borderWidth: 1,
                    borderColor: c.orangeGlow,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <FaPauseCircle size={18} color={c.orange} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText
                    style={{ fontSize: 15, fontWeight: "800", color: c.text }}
                  >
                    Pause your account?
                  </AppText>
                  <AppText
                    style={{ fontSize: 11, color: c.textMuted, marginTop: 2 }}
                  >
                    Reversible anytime — just log back in
                  </AppText>
                </View>
              </View>
              <Field
                label="Password"
                value={pausePassword}
                onChange={setPausePassword}
                c={c}
                secure
                full
              />
              <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
                <Pressable
                  onPress={() => {
                    setShowPauseModal(false);
                    setPausePassword("");
                  }}
                  style={[styles.cancelBtn, { borderColor: c.border, flex: 1 }]}
                >
                  <AppText
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: c.textDim,
                    }}
                  >
                    Cancel
                  </AppText>
                </Pressable>
                <Pressable
                  onPress={confirmPause}
                  disabled={saving === "pause"}
                  style={[
                    styles.primaryBtn,
                    { backgroundColor: c.orange, flex: 2 },
                  ]}
                >
                  <AppText
                    style={{ fontSize: 12, fontWeight: "700", color: c.bg }}
                  >
                    {saving === "pause" ? "Pausing…" : "Pause Account"}
                  </AppText>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        <Modal
          visible={showDeleteModal}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setShowDeleteModal(false);
            setDeletePassword("");
            setDeleteConfirmText("");
            setDeleteReason("");
          }}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => {
              setShowDeleteModal(false);
              setDeletePassword("");
              setDeleteConfirmText("");
              setDeleteReason("");
            }}
          >
            <Pressable
              style={[
                styles.modalCard,
                { backgroundColor: c.bgPanel, borderColor: c.border },
              ]}
              onPress={(e) => e.stopPropagation()}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: c.redDim,
                    borderWidth: 1,
                    borderColor: "rgba(239,68,68,0.3)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <FaTrash size={18} color={c.red} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText
                    style={{ fontSize: 15, fontWeight: "800", color: c.text }}
                  >
                    Delete your account?
                  </AppText>
                  <AppText
                    style={{ fontSize: 11, color: c.textMuted, marginTop: 2 }}
                  >
                    Permanent · 30-day grace period
                  </AppText>
                </View>
              </View>
              <View
                style={{
                  padding: 10,
                  borderRadius: 8,
                  backgroundColor: c.redDim,
                  borderWidth: 1,
                  borderColor: "rgba(239,68,68,0.2)",
                  marginBottom: 12,
                }}
              >
                <AppText
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    color: c.red,
                    marginBottom: 4,
                  }}
                >
                  Here's what happens when you delete:
                </AppText>
                {[
                  "Your profile is hidden immediately",
                  "Your data is deleted permanently after 30 days",
                  "Your reviews remain (anonymised)",
                  "Transaction records are kept for legal compliance",
                  "Log in within 30 days to cancel",
                ].map((line) => (
                  <AppText
                    key={line}
                    style={{ fontSize: 11, color: c.textDim, lineHeight: 16 }}
                  >
                    • {line}
                  </AppText>
                ))}
              </View>
              <Field
                label="Password"
                value={deletePassword}
                onChange={setDeletePassword}
                c={c}
                secure
                full
              />
              <Field
                label="Why are you leaving? (optional)"
                value={deleteReason}
                onChange={setDeleteReason}
                c={c}
                multiline
                full
              />
              <Field
                label='Type "DELETE" to confirm'
                value={deleteConfirmText}
                onChange={setDeleteConfirmText}
                c={c}
                full
              />
              <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
                <Pressable
                  onPress={() => {
                    setShowDeleteModal(false);
                    setDeletePassword("");
                    setDeleteConfirmText("");
                    setDeleteReason("");
                  }}
                  style={[styles.cancelBtn, { borderColor: c.border, flex: 1 }]}
                >
                  <AppText
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: c.textDim,
                    }}
                  >
                    Cancel
                  </AppText>
                </Pressable>
                <Pressable
                  onPress={confirmDeleteAccount}
                  disabled={
                    saving === "delete" ||
                    deleteConfirmText !== "DELETE" ||
                    !deletePassword
                  }
                  style={[
                    styles.primaryBtn,
                    {
                      backgroundColor: c.red,
                      flex: 2,
                      opacity:
                        saving === "delete" ||
                        deleteConfirmText !== "DELETE" ||
                        !deletePassword
                          ? 0.4
                          : 1,
                    },
                  ]}
                >
                  <AppText
                    style={{ fontSize: 12, fontWeight: "700", color: "#fff" }}
                  >
                    {saving === "delete" ? "Processing…" : "Delete Account"}
                  </AppText>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        <PickerSheet
          visible={showLangPicker}
          onClose={() => setShowLangPicker(false)}
          title="Language"
          options={ALL_LANGUAGES.map((l) => ({ label: l.name, value: l.code }))}
          selected={language}
          onSelect={(v) => {
            changeLanguage(v).catch(() => {});
            setShowLangPicker(false);
          }}
          c={c}
        />

        <PickerSheet
          visible={showCurrencyPicker}
          onClose={() => {
            setShowCurrencyPicker(false);
            setCurrencyPickerTarget(null);
          }}
          title="Currency"
          options={ALL_CURRENCIES.map((code) => ({
            label: `${CURRENCY_META[code]?.symbol} ${code} — ${CURRENCY_META[code]?.name}`,
            value: code,
          }))}
          selected={
            currencyPickerTarget === "dashboard"
              ? dashboardCurrency
              : currencyPickerTarget === "payment"
                ? paymentCurrency
                : currencyPickerTarget === "pricing"
                  ? pricing.currency
                  : form.currency
          }
          onSelect={(v) => {
            if (currencyPickerTarget === "dashboard")
              changeDashboardCurrency(v);
            else if (currencyPickerTarget === "payment")
              changePaymentCurrency(v);
            else if (currencyPickerTarget === "pricing")
              setPricing((p) => ({ ...p, currency: v }));
            else setForm((f) => ({ ...f, currency: v }));
            setShowCurrencyPicker(false);
            setCurrencyPickerTarget(null);
          }}
          c={c}
        />

        <PickerSheet
          visible={showGenderPicker}
          onClose={() => setShowGenderPicker(false)}
          title="Gender"
          options={[
            { label: "Prefer not to say", value: "" },
            ...GENDERS.map((g) => ({ label: g, value: g })),
          ]}
          selected={form.gender}
          onSelect={(v) => {
            setForm((f) => ({ ...f, gender: v }));
            setShowGenderPicker(false);
          }}
          c={c}
        />

        <Modal
          visible={showBlockerModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowBlockerModal(false)}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setShowBlockerModal(false)}
          >
            <Pressable
              style={[
                styles.modalCard,
                { backgroundColor: c.bgPanel, borderColor: c.border },
              ]}
              onPress={(e) => e.stopPropagation()}
            >
              <AppText
                style={{
                  fontSize: 15,
                  fontWeight: "800",
                  color: c.text,
                  marginBottom: 6,
                }}
              >
                Before you can proceed
              </AppText>
              <AppText
                style={{ fontSize: 11, color: c.textMuted, marginBottom: 12 }}
              >
                Please resolve these first
              </AppText>
              {blockers.map((b) => (
                <View
                  key={b.code}
                  style={{
                    padding: 10,
                    borderRadius: 8,
                    backgroundColor: c.bgCard,
                    borderWidth: 1,
                    borderColor: c.border,
                    marginBottom: 8,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <View
                      style={{
                        minWidth: 22,
                        height: 22,
                        paddingHorizontal: 6,
                        borderRadius: 11,
                        backgroundColor: c.redDim,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <AppText
                        style={{
                          fontSize: 11,
                          fontWeight: "800",
                          color: c.red,
                        }}
                      >
                        {b.count}
                      </AppText>
                    </View>
                    <AppText
                      style={{
                        fontSize: 12,
                        fontWeight: "700",
                        color: c.text,
                        flex: 1,
                      }}
                    >
                      {b.label}
                    </AppText>
                  </View>
                  <AppText
                    style={{ fontSize: 11, color: c.textDim, marginTop: 4 }}
                  >
                    {b.hint}
                  </AppText>
                </View>
              ))}
              <Pressable
                onPress={() => setShowBlockerModal(false)}
                style={[
                  styles.primaryBtn,
                  { backgroundColor: c.orange, marginTop: 8 },
                ]}
              >
                <AppText
                  style={{ fontSize: 12, fontWeight: "700", color: c.bg }}
                >
                  Got it
                </AppText>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      </AppScreen>
    </KeyboardAvoidingView>
  );
}

// ═══════════════════ Sub-components (unchanged) ═══════════════════
function Card({ title, icon, desc, children, c }) {
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: c.bgPanel, borderColor: c.border },
      ]}
    >
      <View style={[styles.cardHeader, { borderBottomColor: c.border }]}>
        <View
          style={{
            width: 24,
            height: 24,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText
            style={{
              fontFamily: "Syne_700Bold",
              fontSize: 14,
              fontWeight: "700",
              color: c.text,
            }}
          >
            {title}
          </AppText>
          {desc ? (
            <AppText style={{ fontSize: 11, color: c.textDim, marginTop: 2 }}>
              {desc}
            </AppText>
          ) : null}
        </View>
      </View>
      <View style={{ padding: 16, gap: 12 }}>{children}</View>
    </View>
  );
}

function Section({ label, labelIcon, children, c }) {
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        {labelIcon}
        <AppText
          style={{
            fontSize: 10,
            fontWeight: "700",
            color: c.textDim,
            textTransform: "uppercase",
            letterSpacing: 0.8,
          }}
        >
          {label}
        </AppText>
      </View>
      {children}
    </View>
  );
}

function Divider({ label, c }) {
  return (
    <View
      style={{ flexDirection: "row", alignItems: "center", marginVertical: 4 }}
    >
      <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
      {label ? (
        <AppText
          style={{
            fontSize: 9,
            fontWeight: "700",
            color: c.textMuted,
            textTransform: "uppercase",
            letterSpacing: 0.6,
            marginHorizontal: 8,
          }}
        >
          {label}
        </AppText>
      ) : null}
      <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  c,
  placeholder,
  multiline,
  full,
  secure,
  numeric,
}) {
  return (
    <View style={full ? { width: "100%" } : { flex: 1, minWidth: 140 }}>
      <AppText style={styles.label(c)}>{label}</AppText>
      <TextInput
        value={String(value || "")}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={c.textMuted}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        secureTextEntry={secure}
        keyboardType={numeric ? "decimal-pad" : "default"}
        style={[
          styles.input,
          {
            color: c.text,
            borderColor: c.border,
            backgroundColor: c.bgInput,
            height: multiline ? 80 : 44,
            textAlignVertical: multiline ? "top" : "center",
          },
        ]}
      />
    </View>
  );
}

function PinField({ label, value, onChange, c }) {
  return (
    <View style={{ flex: 1, minWidth: 100 }}>
      <AppText style={styles.label(c)}>{label}</AppText>
      <TextInput
        value={value}
        onChangeText={(v) => onChange(v.replace(/\D/g, "").slice(0, 4))}
        placeholder="••••"
        placeholderTextColor={c.textMuted}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={4}
        style={[
          styles.input,
          {
            color: c.text,
            borderColor: c.border,
            backgroundColor: c.bgInput,
            textAlign: "center",
            letterSpacing: 8,
            fontSize: 18,
            fontWeight: "800",
          },
        ]}
      />
    </View>
  );
}

function SelectField({ label, value, onPress, c }) {
  return (
    <View style={{ flex: 1, minWidth: 140 }}>
      <AppText style={styles.label(c)}>{label}</AppText>
      <Pressable
        onPress={onPress}
        style={[
          styles.input,
          {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            borderColor: c.border,
            backgroundColor: c.bgInput,
            height: 44,
          },
        ]}
      >
        <AppText style={{ fontSize: 13, color: c.text }} numberOfLines={1}>
          {value}
        </AppText>
        <FaChevronDown size={11} color={c.textDim} />
      </Pressable>
    </View>
  );
}

function PriceField({ label, suffix, value, onChange, c }) {
  return (
    <View style={{ flex: 1, minWidth: 140 }}>
      <AppText style={styles.label(c)}>{label}</AppText>
      <View style={{ position: "relative" }}>
        <TextInput
          value={String(value || "")}
          onChangeText={onChange}
          placeholder="0.00"
          placeholderTextColor={c.textMuted}
          keyboardType="decimal-pad"
          style={[
            styles.input,
            {
              color: c.text,
              borderColor: c.border,
              backgroundColor: c.bgInput,
              paddingRight: 40,
            },
          ]}
        />
        <AppText
          style={{
            position: "absolute",
            right: 10,
            top: 13,
            fontSize: 10,
            fontWeight: "600",
            color: c.textMuted,
          }}
        >
          {suffix}
        </AppText>
      </View>
    </View>
  );
}

function OptionRow({ label, options, value, onChange, c }) {
  return (
    <View>
      <AppText style={styles.label(c)}>{label}</AppText>
      <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
        {options.map((o) => {
          const active = value === o;
          return (
            <Pressable
              key={o}
              onPress={() => onChange(o)}
              style={[
                styles.unitBtn,
                {
                  backgroundColor: active ? c.orangeDim : c.bgCard,
                  borderColor: active ? c.orangeGlow : c.border,
                },
              ]}
            >
              <AppText
                style={{
                  fontSize: 11,
                  fontWeight: "600",
                  color: active ? c.orange : c.textDim,
                }}
              >
                {o}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Toggle({ label, desc, checked, onChange, c, icon }) {
  return (
    <View style={[styles.toggleRow, { borderBottomColor: c.border }]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {icon}
          <AppText style={{ fontSize: 13, fontWeight: "600", color: c.text }}>
            {label}
          </AppText>
        </View>
        <AppText style={{ fontSize: 11, color: c.textDim, marginTop: 2 }}>
          {desc}
        </AppText>
      </View>
      <Switch
        value={checked}
        onValueChange={onChange}
        trackColor={{ false: c.border, true: c.orangeGlow }}
        thumbColor={checked ? c.orange : c.textMuted}
      />
    </View>
  );
}

function SaveBtn({ label, loading, onClick, c }) {
  return (
    <Pressable
      onPress={onClick}
      disabled={!!loading}
      style={[
        styles.primaryBtn,
        {
          backgroundColor: c.orange,
          alignSelf: "flex-start",
          paddingHorizontal: 24,
        },
      ]}
    >
      {loading ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <ActivityIndicator size="small" color={c.bg} />
          <AppText style={{ fontSize: 12, fontWeight: "700", color: c.bg }}>
            Saving...
          </AppText>
        </View>
      ) : (
        <AppText style={{ fontSize: 12, fontWeight: "700", color: c.bg }}>
          {label}
        </AppText>
      )}
    </Pressable>
  );
}

function SecRow({ label, value, color, c }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: c.border,
      }}
    >
      <AppText style={{ fontSize: 12, color: c.textDim }}>{label}</AppText>
      <AppText
        style={{ fontSize: 12, fontWeight: "700", color: color || c.text }}
        numberOfLines={1}
      >
        {value}
      </AppText>
    </View>
  );
}

function StatCard({ icon, label, value, c }) {
  return (
    <View
      style={{
        flex: 1,
        minWidth: 100,
        padding: 12,
        borderRadius: 10,
        backgroundColor: c.bgCard,
        borderWidth: 1,
        borderColor: c.border,
        alignItems: "center",
        gap: 4,
      }}
    >
      {icon}
      <AppText style={{ fontSize: 20, fontWeight: "800", color: c.orange }}>
        {value}
      </AppText>
      <AppText
        style={{ fontSize: 10, color: c.textMuted, textAlign: "center" }}
      >
        {label}
      </AppText>
    </View>
  );
}

function CurrencySummaryGrid({ items, c }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {items.map((it, idx) => (
        <View
          key={idx}
          style={{
            flex: 1,
            minWidth: 160,
            flexDirection: "row",
            gap: 8,
            padding: 12,
            borderRadius: 10,
            backgroundColor: c.bgCard,
            borderWidth: 1,
            borderColor: c.border,
          }}
        >
          {it.icon}
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText style={{ fontSize: 10, color: c.textMuted }}>
              {it.label}
            </AppText>
            <AppText
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: c.orange,
                marginTop: 2,
              }}
            >
              {it.value}
            </AppText>
            <AppText style={{ fontSize: 9, color: c.textMuted, marginTop: 2 }}>
              {it.hint}
            </AppText>
          </View>
        </View>
      ))}
    </View>
  );
}

function CurrencyPickerRow({ current, onChange, onOpen, c }) {
  const meta = CURRENCY_META[current] || {};
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
        marginTop: 6,
      }}
    >
      <Pressable
        onPress={onOpen}
        style={[
          styles.input,
          {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            borderColor: c.border,
            backgroundColor: c.bgInput,
            minWidth: 220,
          },
        ]}
      >
        <AppText style={{ fontSize: 13, color: c.text }}>
          {meta.symbol} {current} — {meta.name}
        </AppText>
        <FaChevronDown size={11} color={c.textDim} />
      </Pressable>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 8,
          backgroundColor: c.orangeDim,
          borderWidth: 1,
          borderColor: c.orangeGlow,
        }}
      >
        <AppText style={{ fontSize: 16, fontWeight: "800", color: c.orange }}>
          {meta.symbol}
        </AppText>
        <AppText style={{ fontSize: 11, color: c.textDim }}>
          {meta.name}
        </AppText>
      </View>
    </View>
  );
}

function InfoBox({ c, text }) {
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 8,
        padding: 10,
        borderRadius: 8,
        backgroundColor: c.bgCard,
        borderWidth: 1,
        borderColor: c.border,
      }}
    >
      <FaInfoCircle size={12} color={c.orange} style={{ marginTop: 2 }} />
      <AppText
        style={{ fontSize: 11, color: c.textMuted, lineHeight: 16, flex: 1 }}
      >
        {text}
      </AppText>
    </View>
  );
}

function PickerSheet({
  visible,
  onClose,
  title,
  options,
  selected,
  onSelect,
  c,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View
          style={{
            backgroundColor: c.bgPanel,
            borderTopLeftRadius: 18,
            borderTopRightRadius: 18,
            maxHeight: "70%",
            paddingBottom: 24,
            borderWidth: 1,
            borderColor: c.border,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              padding: 16,
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: c.border,
            }}
          >
            <AppText style={{ fontSize: 15, fontWeight: "700", color: c.text }}>
              {title}
            </AppText>
            <Pressable onPress={onClose} hitSlop={8}>
              <FaTimes size={16} color={c.textDim} />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled">
            {options.map((opt) => {
              const active = selected === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => onSelect(opt.value)}
                  style={{
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    backgroundColor: active ? c.orangeDim : "transparent",
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: c.border,
                  }}
                >
                  <AppText
                    style={{
                      fontSize: 13,
                      fontWeight: active ? "700" : "500",
                      color: active ? c.orange : c.text,
                    }}
                  >
                    {opt.label}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  label: (c) => ({
    fontSize: 10,
    fontWeight: "700",
    color: c.textDim,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 6,
  }),
  input: {
    height: 44,
    borderRadius: 9,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  navBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatarBlock: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
    flexWrap: "wrap",
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
  },
  smallBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  themeCard: {
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 70,
  },
  unitBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dangerOption: {
    flex: 1,
    minWidth: 160,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  outlineBtn: {
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 9,
    borderWidth: 1,
  },
  primaryBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  cancelBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  actItem: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginBottom: 12,
    alignSelf: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 480,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    maxHeight: "90%",
  },
});
