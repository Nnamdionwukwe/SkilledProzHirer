// src/screens/main/SettingsScreen.js
//
// Full i18n port. Every string routes through t() with keys that already
// exist in en.json under settings.*, common.*, toast.*.
// Work Profile availability toggle now reads/writes the shared
// useWorkerAvailability store so it stays in sync with the drawer footer,
// dashboard pill, and availability master switch.

import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { useTranslation } from "react-i18next";

import AppScreen from "../../components/AppScreen";
import AppText from "../../components/AppText";
import PageSkeleton from "../../components/PageSkeleton";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuthStore } from "../../store/authStore";
import { useWorkerAvailability } from "../../store/workerAvailabilityStore";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
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

const GENDERS = [
  { value: "Male", key: "settings.gender.male" },
  { value: "Female", key: "settings.gender.female" },
  { value: "Non-binary", key: "settings.gender.nonBinary" },
  { value: "Prefer not to say", key: "settings.gender.preferNot" },
];

const COMPANY_SIZES = ["1–10", "11–50", "51–200", "201–500", "500+"];

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { theme, language, changeTheme, mode } = useTheme();
  const { user, updateUser } = useAuthStore();

  // ── Shared availability store — same source of truth used by the drawer
  //    footer, dashboard pill, and availability master switch. Any change
  //    in one place flips the others instantly.
  const {
    isAvailable: isWorkerAvailable,
    setAvailable: setWorkerAvailable,
    hydrate: hydrateWorkerAvailability,
  } = useWorkerAvailability();

  const {
    dashboardCurrency,
    paymentCurrency,
    changeDashboardCurrency,
    changePaymentCurrency,
  } = useCurrency();
  const c = theme.colors;
  const isWorker = user?.role === "WORKER";

  const DURATION_UNITS = useMemo(
    () => [
      { value: "hours", label: t("postJob.durationType.HOURS") },
      { value: "days", label: t("postJob.durationType.DAYS") },
      { value: "weeks", label: t("postJob.durationType.WEEKS") },
      { value: "months", label: t("postJob.durationType.MONTHS") },
      { value: "custom", label: t("postJob.durationType.CUSTOM") },
    ],
    [t],
  );

  const TABS_WORKER = useMemo(
    () => [
      { id: "profile", icon: FaUser, label: t("settings.tabs.profile") },
      { id: "work", icon: FaBriefcase, label: t("settings.tabs.workProfile") },
      { id: "pricing", icon: FaDollarSign, label: t("settings.tabs.pricing") },
      {
        id: "currencies",
        icon: FaSyncAlt,
        label: t("settings.tabs.currencies"),
      },
      { id: "appearance", icon: FaSun, label: t("settings.tabs.appearance") },
      {
        id: "notifications",
        icon: FaBell,
        label: t("settings.tabs.notifications"),
      },
      { id: "privacy", icon: FaLock, label: t("settings.tabs.privacy") },
      { id: "security", icon: FaShieldAlt, label: t("settings.tabs.security") },
      { id: "pin", icon: FaKey, label: t("settings.tabs.withdrawalPin") },
      {
        id: "accountInfo",
        icon: FaInfoCircle,
        label: t("settings.tabs.accountInfo"),
      },
      {
        id: "accountStatus",
        icon: FaExclamationTriangle,
        label: t("settings.tabs.accountStatus"),
      },
      { id: "activity", icon: FaChartLine, label: t("settings.tabs.activity") },
    ],
    [t],
  );

  const TABS_HIRER = useMemo(
    () => [
      { id: "profile", icon: FaUser, label: t("settings.tabs.profile") },
      { id: "company", icon: FaBriefcase, label: t("settings.tabs.company") },
      {
        id: "hiring",
        icon: FaClipboardCheck,
        label: t("settings.tabs.hiringPrefs"),
      },
      {
        id: "currencies",
        icon: FaSyncAlt,
        label: t("settings.tabs.currencies"),
      },
      { id: "appearance", icon: FaSun, label: t("settings.tabs.appearance") },
      {
        id: "notifications",
        icon: FaBell,
        label: t("settings.tabs.notifications"),
      },
      { id: "privacy", icon: FaLock, label: t("settings.tabs.privacy") },
      { id: "security", icon: FaShieldAlt, label: t("settings.tabs.security") },
      { id: "pin", icon: FaKey, label: t("settings.tabs.withdrawalPin") },
      {
        id: "accountInfo",
        icon: FaInfoCircle,
        label: t("settings.tabs.accountInfo"),
      },
      {
        id: "accountStatus",
        icon: FaExclamationTriangle,
        label: t("settings.tabs.accountStatus"),
      },
      { id: "activity", icon: FaChartLine, label: t("settings.tabs.activity") },
    ],
    [t],
  );

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

        // ⬇️ Seed the shared availability store from the fresh profile so
        //    the Settings toggle, drawer footer, dashboard pill, and the
        //    availability master switch all start in the same state.
        hydrateWorkerAvailability(u);
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
    if (!data) return showToast(t("toast.unknownError"), "error");
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
    if (!data) return showToast(t("toast.unknownError"), "error");
    if (!data.canDelete) return setShowBlockerModal(true);
    setShowDeleteModal(true);
  }

  async function confirmPause() {
    if (!pausePassword)
      return showToast(t("settings.security.enterCurrent"), "error");
    setSaving("pause");
    try {
      await client.post("/settings/pause", { password: pausePassword });
      showToast(t("settings.accountStatus.pausedToast"));
      setTimeout(
        () => navigation.reset({ index: 0, routes: [{ name: "Login" }] }),
        1500,
      );
    } catch (err) {
      showToast(
        err.response?.data?.message || t("toast.unknownError"),
        "error",
      );
      setSaving("");
    }
  }

  async function confirmDeleteAccount() {
    if (!deletePassword)
      return showToast(t("settings.security.enterCurrent"), "error");
    if (deleteConfirmText !== "DELETE")
      return showToast(t("settings.accountStatus.typeDeleteError"), "error");
    setSaving("delete");
    try {
      await client.delete("/settings/account", {
        data: {
          password: deletePassword,
          reason: deleteReason || undefined,
          confirmDelete: "DELETE",
        },
      });
      showToast(t("settings.accountStatus.scheduledToast"));
      setTimeout(
        () => navigation.reset({ index: 0, routes: [{ name: "Login" }] }),
        1500,
      );
    } catch (err) {
      const status = err.response?.status;
      showToast(
        err.response?.data?.message || t("toast.unknownError"),
        "error",
      );
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
      showToast(t("settings.profile.saved"));
    } catch (e) {
      showToast(
        e.response?.data?.message || t("settings.profile.saveFailed"),
        "error",
      );
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
      showToast(t("settings.hiringPrefs.saved"));
    } catch {
      showToast(t("settings.hiringPrefs.failed"), "error");
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
      showToast(t("settings.profile.photoUpdated"));
    } catch (e) {
      showToast(
        e.response?.data?.message || t("settings.profile.photoFailed"),
        "error",
      );
    } finally {
      setSaving("");
    }
  }

  async function saveWorkProfile() {
    setSaving("work");
    try {
      await client.patch("/settings/worker-profile", workForm);
      showToast(t("settings.workProfile.saved"));
    } catch {
      showToast(t("settings.workProfile.saveFailed"), "error");
    } finally {
      setSaving("");
    }
  }

  async function savePricing() {
    setSaving("pricing");
    try {
      await client.patch("/settings/worker-profile", pricing);
      showToast(t("settings.pricing.saved"));
    } catch {
      showToast(t("settings.pricing.saveFailed"), "error");
    } finally {
      setSaving("");
    }
  }

  async function saveCompany() {
    setSaving("company");
    try {
      await client.patch("/settings/hirer-profile", companyForm);
      showToast(t("settings.company.saved"));
    } catch {
      showToast(t("settings.company.saveFailed"), "error");
    } finally {
      setSaving("");
    }
  }

  async function savePassword() {
    if (pw.next !== pw.confirm)
      return setPwError(t("settings.security.passwordsDontMatch"));
    if (pw.next.length < 8)
      return setPwError(t("settings.security.passwordTooShort"));
    setPwError("");
    setSaving("password");
    try {
      await client.patch("/settings/password", {
        currentPassword: pw.current,
        newPassword: pw.next,
      });
      setPw({ current: "", next: "", confirm: "" });
      showToast(t("settings.security.passwordChanged"));
    } catch (e) {
      showToast(
        e.response?.data?.message || t("settings.security.passwordFailed"),
        "error",
      );
    } finally {
      setSaving("");
    }
  }

  async function setPins() {
    if (pin.new !== pin.confirm)
      return setPinError(t("settings.pin.pinsMismatch"));
    if (!/^\d{4}$/.test(pin.new))
      return setPinError(t("settings.pin.pinFourDigits"));
    setPinError("");
    setSaving("pin");
    try {
      await client.post("/payments/pin/set", { pin: pin.new });
      setPinStatus((p) => ({ ...p, pinSet: true }));
      setPin({ new: "", confirm: "", current: "" });
      showToast(t("settings.pin.setToast"));
    } catch (e) {
      setPinError(e.response?.data?.message || t("settings.pin.setFailed"));
    } finally {
      setSaving("");
    }
  }

  async function changePin() {
    if (pin.new !== pin.confirm)
      return setPinError(t("settings.pin.newPinsMismatch"));
    if (!/^\d{4}$/.test(pin.new))
      return setPinError(t("settings.pin.newPinFourDigits"));
    if (!pin.current) return setPinError(t("settings.pin.currentRequired"));
    setPinError("");
    setSaving("pin");
    try {
      await client.post("/payments/pin/change", {
        currentPin: pin.current,
        newPin: pin.new,
      });
      setPin({ new: "", confirm: "", current: "" });
      showToast(t("settings.pin.changedToast"));
    } catch (e) {
      setPinError(e.response?.data?.message || t("settings.pin.changeFailed"));
    } finally {
      setSaving("");
    }
  }

  async function saveNotifs() {
    setSaving("notifs");
    try {
      await client.patch("/settings/notifications", notifs);
      updateUser?.(notifs);
      showToast(t("settings.notifications.saved"));
    } catch {
      showToast(t("settings.notifications.failed"), "error");
    } finally {
      setSaving("");
    }
  }

  async function savePrivacy() {
    setSaving("privacy");
    try {
      await client.patch("/settings/privacy", privacy);
      updateUser?.(privacy);
      showToast(t("settings.privacy.saved"));
    } catch {
      showToast(t("settings.privacy.failed"), "error");
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

  const currentLangName =
    ALL_LANGUAGES.find((l) => l.code === language)?.name || "English";

  const openCurrencyPicker = (target) => {
    setCurrencyPickerTarget(target);
    setShowCurrencyPicker(true);
  };

  const blockers = deactivationCheck?.blockers ?? [];
  const hasBlockers = blockers.length > 0;
  const canPause = deactivationCheck?.canPause ?? !hasBlockers;
  const canDelete = deactivationCheck?.canDelete ?? !hasBlockers;

  return (
    <View style={{ flex: 1 }}>
      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        enableOnAndroid
        enableAutomaticScroll
        extraScrollHeight={Platform.OS === "ios" ? 90 : 60}
        extraHeight={Platform.OS === "ios" ? 90 : 60}
        enableResetScrollToCoords={false}
        keyboardOpeningTime={100}
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
            weight="displayBlack"
            style={{
              fontSize: 15,
              color: c.text,
              letterSpacing: -0.5,
              marginBottom: 4,
            }}
          >
            {t("settings.title")}
          </AppText>
          <AppText style={{ fontSize: 12, color: c.textDim, marginTop: 2 }}>
            {t("settings.subtitle")}
          </AppText>
        </View>

        {/* Tab nav */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, marginBottom: 16 }}
          contentContainerStyle={{ gap: 6, paddingRight: 8 }}
        >
          {TABS.map((tb) => {
            const Icon = tb.icon;
            const active = tab === tb.id;
            return (
              <Pressable
                key={tb.id}
                onPress={() => setTab(tb.id)}
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
                  {tb.label}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ═══════════════ PROFILE ═══════════════ */}
        {tab === "profile" && (
          <Card
            title={t("settings.profile.title")}
            icon={<FaUser size={18} color={c.orange} />}
            desc={t("settings.profile.subtitle")}
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
                    {saving === "avatar"
                      ? t("common.loading")
                      : t("settings.profile.changePhoto")}
                  </AppText>
                </Pressable>
                <AppText
                  style={{ fontSize: 9, color: c.textMuted, marginTop: 4 }}
                >
                  {t("settings.profile.photoHint")}
                </AppText>
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              <Field
                label={t("settings.profile.firstName")}
                value={form.firstName}
                onChange={(v) => setForm((f) => ({ ...f, firstName: v }))}
                c={c}
              />
              <Field
                label={t("settings.profile.lastName")}
                value={form.lastName}
                onChange={(v) => setForm((f) => ({ ...f, lastName: v }))}
                c={c}
              />
            </View>
            <Field
              label={t("settings.profile.phone")}
              value={form.phone}
              onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
              c={c}
              full
            />
            <Field
              label={t("settings.profile.bio")}
              value={form.bio}
              onChange={(v) => setForm((f) => ({ ...f, bio: v }))}
              c={c}
              multiline
              full
            />
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              <Field
                label={t("settings.profile.country")}
                value={form.country}
                onChange={(v) => setForm((f) => ({ ...f, country: v }))}
                c={c}
                placeholder={t("country")}
              />
              <Field
                label={t("settings.profile.state")}
                value={form.state}
                onChange={(v) => setForm((f) => ({ ...f, state: v }))}
                c={c}
                placeholder={t("state")}
              />
              <Field
                label={t("settings.profile.city")}
                value={form.city}
                onChange={(v) => setForm((f) => ({ ...f, city: v }))}
                c={c}
                placeholder={t("city")}
              />
              <Field
                label={t("settings.profile.address")}
                value={form.address}
                onChange={(v) => setForm((f) => ({ ...f, address: v }))}
                c={c}
              />
            </View>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              <SelectField
                label={t("settings.profile.currency")}
                value={form.currency}
                onPress={() => openCurrencyPicker("profile")}
                c={c}
              />
              <SelectField
                label={t("settings.profile.gender")}
                value={
                  form.gender
                    ? t(
                        GENDERS.find((g) => g.value === form.gender)?.key ||
                          "settings.gender.preferNot",
                      )
                    : t("settings.gender.preferNot")
                }
                onPress={() => setShowGenderPicker(true)}
                c={c}
              />
            </View>
            <SaveBtn
              label={t("settings.profile.save")}
              loading={saving === "profile"}
              onClick={saveProfile}
              c={c}
            />
          </Card>
        )}

        {/* ═══════════════ WORK PROFILE ═══════════════ */}
        {tab === "work" && isWorker && (
          <Card
            title={t("settings.workProfile.title")}
            icon={<FaBriefcase size={18} color={c.orange} />}
            desc={t("settings.workProfile.subtitle")}
            c={c}
          >
            <Field
              label={t("settings.workProfile.titleLabel")}
              value={workForm.title}
              onChange={(v) => setWorkForm((f) => ({ ...f, title: v }))}
              c={c}
              placeholder={t("settings.workProfile.titlePlaceholder")}
              full
            />
            <Field
              label={t("settings.workProfile.description")}
              value={workForm.description}
              onChange={(v) => setWorkForm((f) => ({ ...f, description: v }))}
              c={c}
              multiline
              full
            />
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              <Field
                label={t("settings.workProfile.yearsExperience")}
                value={workForm.yearsExperience}
                onChange={(v) =>
                  setWorkForm((f) => ({ ...f, yearsExperience: v }))
                }
                c={c}
                placeholder="0"
                numeric
              />
              <Field
                label={t("settings.workProfile.serviceRadius")}
                value={workForm.serviceRadius}
                onChange={(v) =>
                  setWorkForm((f) => ({ ...f, serviceRadius: v }))
                }
                c={c}
                placeholder="25"
                numeric
              />
            </View>
            {/* ── Shared availability toggle — same state as drawer footer,
                dashboard pill, and availability master switch ── */}
            <Toggle
              label={t("settings.workProfile.availableLabel")}
              desc={t("settings.workProfile.availableSub")}
              checked={isWorkerAvailable}
              onChange={(v) => {
                setWorkerAvailable(v).catch((err) => {
                  showToast(
                    err?.response?.data?.message ||
                      t("settings.workProfile.saveFailed"),
                    "error",
                  );
                });
              }}
              c={c}
            />
            <SaveBtn
              label={t("settings.workProfile.save")}
              loading={saving === "work"}
              onClick={saveWorkProfile}
              c={c}
            />
          </Card>
        )}

        {/* ═══════════════ PRICING ═══════════════ */}
        {tab === "pricing" && isWorker && (
          <Card
            title={t("settings.pricing.title")}
            icon={<FaDollarSign size={18} color={c.orange} />}
            desc={t("settings.pricing.subtitle")}
            c={c}
          >
            <AppText
              style={{ fontSize: 11, color: c.textMuted, lineHeight: 16 }}
            >
              {t("settings.pricing.hint")}
            </AppText>
            <SelectField
              label={t("settings.pricing.currency")}
              value={pricing.currency}
              onPress={() => openCurrencyPicker("pricing")}
              c={c}
            />
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              <PriceField
                label={t("settings.pricing.hourly")}
                suffix="/hr"
                value={pricing.hourlyRate}
                onChange={(v) => setPricing((p) => ({ ...p, hourlyRate: v }))}
                c={c}
              />
              <PriceField
                label={t("settings.pricing.daily")}
                suffix="/day"
                value={pricing.dailyRate}
                onChange={(v) => setPricing((p) => ({ ...p, dailyRate: v }))}
                c={c}
              />
              <PriceField
                label={t("settings.pricing.weekly")}
                suffix="/wk"
                value={pricing.weeklyRate}
                onChange={(v) => setPricing((p) => ({ ...p, weeklyRate: v }))}
                c={c}
              />
              <PriceField
                label={t("settings.pricing.monthly")}
                suffix="/mo"
                value={pricing.monthlyRate}
                onChange={(v) => setPricing((p) => ({ ...p, monthlyRate: v }))}
                c={c}
              />
              <PriceField
                label={t("settings.pricing.yearly")}
                suffix="/yr"
                value={pricing.yearlyRate}
                onChange={(v) => setPricing((p) => ({ ...p, yearlyRate: v }))}
                c={c}
              />
            </View>
            <Divider label={t("settings.pricing.custom")} c={c} />
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              <Field
                label={t("settings.pricing.customAmount")}
                value={pricing.customRate}
                onChange={(v) => setPricing((p) => ({ ...p, customRate: v }))}
                c={c}
                placeholder="0.00"
                numeric
              />
              <Field
                label={t("settings.pricing.customLabel")}
                value={pricing.customRateLabel}
                onChange={(v) =>
                  setPricing((p) => ({ ...p, customRateLabel: v }))
                }
                c={c}
                placeholder={t("settings.pricing.customLabelPlaceholder")}
              />
            </View>
            <Field
              label={t("settings.pricing.notes")}
              value={pricing.pricingNote}
              onChange={(v) => setPricing((p) => ({ ...p, pricingNote: v }))}
              c={c}
              multiline
              full
            />
            <SaveBtn
              label={t("settings.pricing.save")}
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
              title={t("settings.currencies.title")}
              icon={<FaSyncAlt size={18} color={c.orange} />}
              desc={t("settings.currencies.subtitle")}
              c={c}
            >
              <InfoBox c={c} text={t("settings.currencies.info")} />

              {/* Dashboard display currency — same for both roles */}
              <Section
                label={t("settings.currencies.dashboardLabel")}
                labelIcon={<FaChartLine size={11} color={c.orange} />}
                c={c}
              >
                <AppText
                  style={{ fontSize: 11, color: c.textMuted, lineHeight: 16 }}
                >
                  {t("settings.currencies.dashboardDesc")}
                </AppText>
                <CurrencyPickerRow
                  current={dashboardCurrency}
                  onChange={changeDashboardCurrency}
                  onOpen={() => openCurrencyPicker("dashboard")}
                  c={c}
                />
              </Section>

              <Divider c={c} />

              {/* Role-aware payout / payment currency */}
              <Section
                label={
                  isWorker
                    ? t("settings.currencies.payoutLabel")
                    : t("settings.currencies.paymentLabel")
                }
                labelIcon={<FaCreditCard size={11} color={c.orange} />}
                c={c}
              >
                <AppText
                  style={{ fontSize: 11, color: c.textMuted, lineHeight: 16 }}
                >
                  {isWorker
                    ? t("settings.currencies.payoutDesc")
                    : t("settings.currencies.paymentDesc")}
                </AppText>
                <CurrencyPickerRow
                  current={paymentCurrency}
                  onChange={changePaymentCurrency}
                  onOpen={() => openCurrencyPicker("payment")}
                  c={c}
                />
              </Section>

              {/* Profile rate currency — worker only */}
              {isWorker && (
                <>
                  <Divider c={c} />
                  <Section
                    label={t("settings.currencies.profileRateLabel")}
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
                      {t("settings.currencies.profileRateDesc")}
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
                      label={t("settings.currencies.profileRateSave")}
                      loading={saving === "pricing"}
                      onClick={async () => {
                        setSaving("pricing");
                        try {
                          await client.patch("/settings/worker-profile", {
                            currency: pricing.currency,
                          });
                          showToast(t("settings.currencies.profileRateSaved"));
                        } catch {
                          showToast(
                            t("settings.currencies.saveFailed"),
                            "error",
                          );
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
              title={t("settings.currencies.summaryTitle")}
              icon={<FaFileAlt size={18} color={c.orange} />}
              desc={t("settings.currencies.summarySubtitle")}
              c={c}
            >
              <CurrencySummaryGrid
                items={[
                  {
                    icon: <FaChartLine size={18} color={c.orange} />,
                    label: t("settings.currencies.dashboardShows"),
                    value: `${CURRENCY_META[dashboardCurrency]?.symbol} ${dashboardCurrency}`,
                    hint: t("settings.currencies.displayOnly"),
                  },
                  {
                    icon: <FaCreditCard size={18} color={c.orange} />,
                    label: isWorker
                      ? t("settings.currencies.youReceiveIn")
                      : t("settings.currencies.youPayIn"),
                    value: `${CURRENCY_META[paymentCurrency]?.symbol} ${paymentCurrency}`,
                    hint: t("settings.currencies.usedForTransactions"),
                  },
                  ...(isWorker
                    ? [
                        {
                          icon: <FaTag size={18} color={c.orange} />,
                          label: t("settings.currencies.profileRateShows"),
                          value: `${CURRENCY_META[pricing.currency || "USD"]?.symbol} ${pricing.currency || "USD"}`,
                          hint: t("settings.currencies.profileRateShowsHint"),
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
            title={t("settings.company.title")}
            icon={<FaBriefcase size={18} color={c.orange} />}
            desc={t("settings.company.subtitle")}
            c={c}
          >
            <Field
              label={t("settings.company.companyName")}
              value={companyForm.companyName}
              onChange={(v) =>
                setCompanyForm((f) => ({ ...f, companyName: v }))
              }
              c={c}
              placeholder={t("settings.company.namePlaceholder")}
              full
            />
            <OptionRow
              label={t("settings.company.companySize")}
              options={COMPANY_SIZES}
              value={companyForm.companySize}
              onChange={(v) =>
                setCompanyForm((f) => ({ ...f, companySize: v }))
              }
              c={c}
            />
            <Field
              label={t("settings.company.website")}
              value={companyForm.website}
              onChange={(v) => setCompanyForm((f) => ({ ...f, website: v }))}
              c={c}
              placeholder={t("settings.company.websitePlaceholder")}
              full
            />
            <SaveBtn
              label={t("settings.company.save")}
              loading={saving === "company"}
              onClick={saveCompany}
              c={c}
            />
          </Card>
        )}

        {/* ═══════════════ HIRING PREFS ═══════════════ */}
        {tab === "hiring" && !isWorker && (
          <Card
            title={t("settings.hiringPrefs.title")}
            icon={<FaClipboardCheck size={18} color={c.orange} />}
            desc={t("settings.hiringPrefs.subtitle")}
            c={c}
          >
            <AppText
              style={{ fontSize: 11, color: c.textMuted, lineHeight: 16 }}
            >
              {t("settings.hiringPrefs.description")}
            </AppText>
            <AppText style={[labelStyle(c), { color: c.textDim }]}>
              {t("settings.hiringPrefs.durationUnit")}
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
                label={t("settings.hiringPrefs.durationValue", {
                  unit: hiringPrefs.defaultEstimatedUnit,
                })}
                value={hiringPrefs.defaultEstimatedValue}
                onChange={(v) =>
                  setHiringPrefs((p) => ({ ...p, defaultEstimatedValue: v }))
                }
                c={c}
                full
              />
            )}
            <InfoBox c={c} text={t("settings.hiringPrefs.hint")} />
            <SaveBtn
              label={t("settings.hiringPrefs.save")}
              loading={saving === "hiring"}
              onClick={saveHiringPrefs}
              c={c}
            />
          </Card>
        )}

        {/* ═══════════════ APPEARANCE ═══════════════ */}
        {tab === "appearance" && (
          <Card
            title={t("settings.appearance.title")}
            icon={<FaSun size={18} color={c.orange} />}
            desc={t("settings.appearance.subtitle")}
            c={c}
          >
            <Section
              label={t("settings.appearance.themeLabel")}
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
                {t("settings.appearance.themeDesc")}
              </AppText>
              <View style={{ flexDirection: "row", gap: 6 }}>
                {[
                  {
                    id: "light",
                    icon: FaSun,
                    label: t("settings.theme.light"),
                  },
                  { id: "dark", icon: FaMoon, label: t("settings.theme.dark") },
                  {
                    id: "system",
                    icon: FaDesktop,
                    label: t("settings.theme.system"),
                  },
                ].map((thm) => {
                  const Icon = thm.icon;
                  const active = mode === thm.id;
                  return (
                    <Pressable
                      key={thm.id}
                      onPress={() => changeTheme(thm.id)}
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
                        {thm.label}
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
              label={t("settings.appearance.languageLabel")}
              labelIcon={<FaGlobe size={11} color={c.orange} />}
              c={c}
            >
              <AppText
                style={{ fontSize: 11, color: c.textMuted, lineHeight: 16 }}
              >
                {t("settings.appearance.languageDesc")}
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
            </Section>
          </Card>
        )}

        {/* ═══════════════ NOTIFICATIONS ═══════════════ */}
        {tab === "notifications" && (
          <Card
            title={t("settings.notifications.title")}
            icon={<FaBell size={18} color={c.orange} />}
            desc={t("settings.notifications.subtitle")}
            c={c}
          >
            <Toggle
              label={t("settings.notifications.bookings")}
              desc={t("settings.notifications.bookingsSub")}
              checked={notifs.notifBookings}
              onChange={(v) => setNotifs((n) => ({ ...n, notifBookings: v }))}
              c={c}
              icon={<FaClipboardCheck size={13} color={c.orange} />}
            />
            <Toggle
              label={t("settings.notifications.messages")}
              desc={t("settings.notifications.messagesSub")}
              checked={notifs.notifMessages}
              onChange={(v) => setNotifs((n) => ({ ...n, notifMessages: v }))}
              c={c}
              icon={<FaCommentDots size={13} color={c.orange} />}
            />
            <Toggle
              label={t("settings.notifications.payments")}
              desc={t("settings.notifications.paymentsSub")}
              checked={notifs.notifPayments}
              onChange={(v) => setNotifs((n) => ({ ...n, notifPayments: v }))}
              c={c}
              icon={<FaCreditCard size={13} color={c.orange} />}
            />
            <Toggle
              label={t("settings.notifications.reviews")}
              desc={t("settings.notifications.reviewsSub")}
              checked={notifs.notifReviews}
              onChange={(v) => setNotifs((n) => ({ ...n, notifReviews: v }))}
              c={c}
              icon={<FaStar size={13} color={c.orange} />}
            />
            <Toggle
              label={t("settings.notifications.marketing")}
              desc={t("settings.notifications.marketingSub")}
              checked={notifs.notifMarketing}
              onChange={(v) => setNotifs((n) => ({ ...n, notifMarketing: v }))}
              c={c}
              icon={<FaChartLine size={13} color={c.orange} />}
            />
            <SaveBtn
              label={t("settings.notifications.save")}
              loading={saving === "notifs"}
              onClick={saveNotifs}
              c={c}
            />
          </Card>
        )}

        {/* ═══════════════ PRIVACY ═══════════════ */}
        {tab === "privacy" && (
          <Card
            title={t("settings.privacy.title")}
            icon={<FaLock size={18} color={c.orange} />}
            desc={t("settings.privacy.subtitle")}
            c={c}
          >
            <Toggle
              label={t("settings.privacy.publicProfile")}
              desc={t("settings.privacy.publicProfileSub")}
              checked={privacy.profileVisible}
              onChange={(v) => setPrivacy((p) => ({ ...p, profileVisible: v }))}
              c={c}
            />
            <Toggle
              label={t("settings.privacy.showPhone")}
              desc={t("settings.privacy.showPhoneSub")}
              checked={privacy.showPhone}
              onChange={(v) => setPrivacy((p) => ({ ...p, showPhone: v }))}
              c={c}
            />
            <Toggle
              label={t("settings.privacy.showLocation")}
              desc={t("settings.privacy.showLocationSub")}
              checked={privacy.showLocation}
              onChange={(v) => setPrivacy((p) => ({ ...p, showLocation: v }))}
              c={c}
            />
            <Toggle
              label={t("settings.privacy.showEmail")}
              desc={t("settings.privacy.showEmailSub")}
              checked={privacy.showEmail}
              onChange={(v) => setPrivacy((p) => ({ ...p, showEmail: v }))}
              c={c}
            />
            <Toggle
              label={t("settings.privacy.showGender")}
              desc={t("settings.privacy.showGenderSub")}
              checked={privacy.showGender}
              onChange={(v) => setPrivacy((p) => ({ ...p, showGender: v }))}
              c={c}
            />
            <SaveBtn
              label={t("settings.privacy.save")}
              loading={saving === "privacy"}
              onClick={savePrivacy}
              c={c}
            />
          </Card>
        )}

        {/* ═══════════════ SECURITY ═══════════════ */}
        {tab === "security" && (
          <Card
            title={t("settings.security.passwordTitle")}
            icon={<FaKey size={18} color={c.orange} />}
            desc={t("settings.security.passwordSubtitle")}
            c={c}
          >
            <Field
              label={t("settings.security.currentPassword")}
              value={pw.current}
              onChange={(v) => setPw((p) => ({ ...p, current: v }))}
              c={c}
              secure
              full
            />
            <Field
              label={t("settings.security.newPassword")}
              value={pw.next}
              onChange={(v) => setPw((p) => ({ ...p, next: v }))}
              c={c}
              secure
              full
            />
            <Field
              label={t("settings.security.confirmPassword")}
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
              label={t("settings.security.updatePassword")}
              loading={saving === "password"}
              onClick={savePassword}
              c={c}
            />
          </Card>
        )}

        {/* ═══════════════ WITHDRAWAL PIN ═══════════════ */}
        {tab === "pin" && (
          <Card
            title={t("settings.pin.title")}
            icon={<FaKey size={18} color={c.orange} />}
            desc={t("settings.pin.subtitle")}
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
                      ? t("settings.pin.isSet")
                      : t("settings.pin.notSet")}
                  </AppText>
                </View>
                {!pinStatus.pinSet ? (
                  <>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <PinField
                        label={t("settings.pin.newPin")}
                        value={pin.new}
                        onChange={(v) => {
                          setPin((p) => ({ ...p, new: v }));
                          setPinError("");
                        }}
                        c={c}
                      />
                      <PinField
                        label={t("settings.pin.confirmPin")}
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
                      label={t("settings.pin.setButton")}
                      loading={saving === "pin"}
                      onClick={setPins}
                      c={c}
                    />
                  </>
                ) : (
                  <>
                    <View
                      style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}
                    >
                      <PinField
                        label={t("settings.pin.currentPin")}
                        value={pin.current}
                        onChange={(v) => {
                          setPin((p) => ({ ...p, current: v }));
                          setPinError("");
                        }}
                        c={c}
                      />
                      <PinField
                        label={t("settings.pin.newPin")}
                        value={pin.new}
                        onChange={(v) => {
                          setPin((p) => ({ ...p, new: v }));
                          setPinError("");
                        }}
                        c={c}
                      />
                      <PinField
                        label={t("settings.pin.confirmNewPin")}
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
                      label={t("settings.pin.changeButton")}
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

        {/* ═══════════════ ACCOUNT INFO ═══════════════ */}
        {tab === "accountInfo" && (
          <Card
            title={t("settings.security.accountTitle")}
            icon={<FaShieldAlt size={18} color={c.orange} />}
            desc={t("settings.security.accountSubtitle")}
            c={c}
          >
            {security ? (
              <>
                <SecRow
                  label={t("settings.security.email")}
                  value={security.email}
                  c={c}
                />
                <SecRow
                  label={t("settings.security.emailVerified")}
                  value={
                    security.isEmailVerified
                      ? t("settings.security.verified")
                      : t("settings.security.notVerified")
                  }
                  color={security.isEmailVerified ? c.green : c.red}
                  c={c}
                />
                <SecRow
                  label={t("settings.security.phoneVerified")}
                  value={
                    security.isPhoneVerified
                      ? t("settings.security.verified")
                      : t("settings.security.notVerified")
                  }
                  color={security.isPhoneVerified ? c.green : c.red}
                  c={c}
                />
                <SecRow
                  label={t("settings.security.twoFA")}
                  value={
                    security.twoFactorEnabled
                      ? t("settings.security.enabled")
                      : t("settings.security.notEnabled")
                  }
                  color={security.twoFactorEnabled ? c.green : "#fbbf24"}
                  c={c}
                />
                <SecRow
                  label={t("settings.security.memberSince")}
                  value={
                    security.accountCreated
                      ? new Date(security.accountCreated).toLocaleDateString(
                          "en-GB",
                          {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          },
                        )
                      : "—"
                  }
                  c={c}
                />
                <SecRow
                  label={t("settings.security.lastSeen")}
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

        {/* ═══════════════ ACCOUNT STATUS ═══════════════ */}
        {tab === "accountStatus" && (
          <>
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
                    {t("settings.accountStatus.blockersTitle", {
                      count: blockers.length,
                    })}
                  </AppText>
                </View>
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

            <Card
              title={t("settings.accountStatus.pauseTitle")}
              icon={<FaPauseCircle size={18} color={c.orange} />}
              desc={t("settings.accountStatus.pauseSubtitle")}
              c={c}
            >
              <AppText
                style={{ fontSize: 12, color: c.textDim, lineHeight: 18 }}
              >
                {t("settings.accountStatus.pauseBody")}
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
                      ? t("settings.accountStatus.resolveFirst")
                      : t("settings.accountStatus.pauseButton")}
                  </AppText>
                )}
              </Pressable>
            </Card>

            <Card
              title={t("settings.accountStatus.deleteTitle")}
              icon={<FaTrash size={18} color={c.red} />}
              desc={t("settings.accountStatus.deleteSubtitle")}
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
                  {t("settings.accountStatus.deleteWhatHappens")}
                </AppText>
                {[1, 2, 3, 4, 5].map((n) => (
                  <AppText
                    key={n}
                    style={{ fontSize: 11, color: c.textDim, lineHeight: 16 }}
                  >
                    • {t(`settings.accountStatus.deleteBullets.${n}`)}
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
                      {t("settings.accountStatus.deleteDisabledTitle")}
                    </AppText>
                    <AppText
                      style={{
                        fontSize: 11,
                        color: c.textDim,
                        marginTop: 4,
                        lineHeight: 16,
                      }}
                    >
                      {t("settings.accountStatus.deleteDisabledBody", {
                        count: blockers.length,
                      })}
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
                      {t("settings.accountStatus.deleteButton")}
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
            title={t("settings.activity.title")}
            icon={<FaChartLine size={18} color={c.orange} />}
            desc={t("settings.activity.subtitle")}
            c={c}
          >
            {activity ? (
              <>
                <View
                  style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}
                >
                  <StatCard
                    icon={<FaBell size={16} color={c.orange} />}
                    label={t("settings.activity.unreadNotifications")}
                    value={activity.summary.unreadNotifications}
                    c={c}
                  />
                  <StatCard
                    icon={<FaClipboardCheck size={16} color={c.orange} />}
                    label={t("settings.activity.totalBookings")}
                    value={activity.summary.totalBookings}
                    c={c}
                  />
                  <StatCard
                    icon={<FaStar size={16} color={c.orange} />}
                    label={t("settings.activity.reviewsReceived")}
                    value={activity.summary.totalReviews}
                    c={c}
                  />
                </View>
                <Divider label={t("settings.activity.recentActivity")} c={c} />
                {activity.recentActivity?.length === 0 ? (
                  <AppText
                    style={{
                      fontSize: 12,
                      color: c.textMuted,
                      textAlign: "center",
                      padding: 20,
                    }}
                  >
                    {t("notifications.empty")}
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

        {/* ═══════════════ MODALS ═══════════════ */}
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
              <AppText
                style={{
                  fontSize: 15,
                  fontWeight: "800",
                  color: c.text,
                  marginBottom: 8,
                }}
              >
                {t("settings.accountStatus.pauseModalTitle")}
              </AppText>
              <Field
                label={t("settings.security.currentPassword")}
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
                    {t("common.cancel")}
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
                    {saving === "pause"
                      ? t("settings.hiringPrefs.saving")
                      : t("settings.accountStatus.pauseButton")}
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
              <AppText
                style={{
                  fontSize: 15,
                  fontWeight: "800",
                  color: c.text,
                  marginBottom: 8,
                }}
              >
                {t("settings.accountStatus.deleteModalTitle")}
              </AppText>
              <Field
                label={t("settings.security.currentPassword")}
                value={deletePassword}
                onChange={setDeletePassword}
                c={c}
                secure
                full
              />
              <Field
                label={t("settings.accountStatus.typeDeleteLabel")}
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
                    {t("common.cancel")}
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
                    {saving === "delete"
                      ? t("settings.hiringPrefs.saving")
                      : t("settings.accountStatus.deleteButton")}
                  </AppText>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        <PickerSheet
          visible={showLangPicker}
          onClose={() => setShowLangPicker(false)}
          title={t("settings.appearance.languageLabel")}
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
          title={t("settings.select.currency")}
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
          title={t("settings.profile.gender")}
          options={[
            { label: t("settings.gender.preferNot"), value: "" },
            ...GENDERS.map((g) => ({ label: t(g.key), value: g.value })),
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
                {t("settings.accountStatus.blockerModalTitle")}
              </AppText>
              <AppText
                style={{ fontSize: 11, color: c.textMuted, marginBottom: 12 }}
              >
                {t("settings.accountStatus.blockerModalSubtitle")}
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
                  {t("settings.accountStatus.gotIt")}
                </AppText>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      </KeyboardAwareScrollView>
    </View>
  );
}

// ═══════════════ Sub-components ═══════════════
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
      <AppText style={[labelStyle(c), { color: c.textDim }]}>{label}</AppText>
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
      <AppText style={[labelStyle(c), { color: c.textDim }]}>{label}</AppText>
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
      <AppText style={[labelStyle(c), { color: c.textDim }]}>{label}</AppText>
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
      <AppText style={[labelStyle(c), { color: c.textDim }]}>{label}</AppText>
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
      <AppText style={[labelStyle(c), { color: c.textDim }]}>{label}</AppText>
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
            {label}
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

const labelStyle = (c) => ({
  fontSize: 10,
  fontWeight: "700",
  color: c.textDim,
  textTransform: "uppercase",
  letterSpacing: 0.6,
  marginBottom: 6,
});

const styles = StyleSheet.create({
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
