// src/screens/auth/WorkerRegisterScreen.js
// 4-step worker registration — mirrors the website's WorkerRegister component exactly.

import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import Constants from "expo-constants";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";

import {
  AuthShell,
  AuthField,
  AuthButton,
  AuthAlert,
} from "../../components/auth/AuthShell";
import AppText from "../../components/AppText";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuthStore } from "../../store/authStore";
import client from "../../api/client";

const extra = Constants.expoConfig?.extra || {};
const GOOGLE_WEB_CLIENT_ID = extra.googleWebClientId || "";

if (GOOGLE_WEB_CLIENT_ID) {
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    offlineAccess: false,
    scopes: ["openid", "email", "profile"],
  });
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  { id: "account", label: "Account", icon: "person-outline" },
  { id: "profile", label: "Profile", icon: "hammer-outline" },
  { id: "category", label: "Category", icon: "pricetag-outline" },
  { id: "pricing", label: "Pricing", icon: "wallet-outline" },
];

const ALL_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "NGN",
  "GHS",
  "KES",
  "ZAR",
  "INR",
  "CAD",
  "AUD",
  "JPY",
  "CNY",
  "BRL",
  "MXN",
  "EGP",
  "TZS",
  "UGX",
  "RWF",
  "XOF",
  "MAD",
  "PHP",
  "IDR",
  "VND",
  "THB",
  "BDT",
  "PKR",
  "AED",
  "SAR",
  "QAR",
  "MYR",
  "SGD",
  "HKD",
];

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current, c }) {
  return (
    <View style={si.row}>
      {STEPS.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <React.Fragment key={step.id}>
            <View style={si.dotWrap}>
              <View
                style={[
                  si.dot,
                  {
                    backgroundColor: done
                      ? c.orange
                      : active
                        ? c.orangeDim
                        : c.bgCard,
                    borderColor: done || active ? c.orange : c.border,
                    borderWidth: 2,
                  },
                ]}
              >
                {done ? (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                ) : (
                  <Ionicons
                    name={step.icon}
                    size={14}
                    color={active ? c.orange : c.textMuted}
                  />
                )}
              </View>
              <AppText
                style={{
                  position: "absolute",
                  top: 40,
                  color: done || active ? c.text : c.textMuted,
                  fontSize: 9,
                  fontWeight: "700",
                }}
              >
                {step.label}
              </AppText>
            </View>
            {i < STEPS.length - 1 && (
              <View
                style={[
                  si.line,
                  { backgroundColor: i < current ? c.orange : c.border },
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

// ─── Currency Picker ─────────────────────────────────────────────────────────

function CurrencyPicker({ value, onChange, c }) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={[
          s.selector,
          { backgroundColor: c.bgInput, borderColor: c.border },
        ]}
      >
        <AppText variant="body" weight="semibold" style={{ color: c.text }}>
          {value}
        </AppText>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={16}
          color={c.textMuted}
        />
      </Pressable>
      {open && (
        <View
          style={[
            s.selectorMenu,
            { backgroundColor: c.bgPanel, borderColor: c.border },
          ]}
        >
          <ScrollView style={{ maxHeight: 240 }} nestedScrollEnabled>
            {ALL_CURRENCIES.map((cur) => (
              <Pressable
                key={cur}
                onPress={() => {
                  onChange(cur);
                  setOpen(false);
                }}
                style={[
                  s.selectorItem,
                  {
                    backgroundColor:
                      cur === value ? c.orangeDim : "transparent",
                  },
                ]}
              >
                <AppText
                  variant="body"
                  style={{
                    color: cur === value ? c.orange : c.text,
                    fontWeight: cur === value ? "700" : "500",
                  }}
                >
                  {cur}
                </AppText>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function WorkerRegisterScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { theme: th } = useTheme();
  const c = th.colors;
  const { register, googleSignIn, isLoading } = useAuthStore();

  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [categories, setCategories] = useState([]);
  const [catSearch, setCatSearch] = useState("");
  const [selectedCats, setSelectedCats] = useState([]);
  const [primaryCatId, setPrimaryCatId] = useState("");
  const [showCustomCat, setShowCustomCat] = useState(false);
  const [customCatName, setCustomCatName] = useState("");
  const [addingCat, setAddingCat] = useState(false);

  const [account, setAccount] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    country: "",
    city: "",
    password: "",
    confirm: "",
    referralCode: "",
  });

  const [profile, setProfile] = useState({
    title: "",
    description: "",
    yearsExperience: "",
    serviceRadius: "25",
  });

  const [pricing, setPricing] = useState({
    currency: "USD",
    hourlyRate: "",
    dailyRate: "",
    weeklyRate: "",
    monthlyRate: "",
    customRate: "",
    customRateLabel: "",
    pricingNote: "",
  });

  useEffect(() => {
    let cancelled = false;
    client
      .get("/categories", { params: { limit: 1000 } })
      .then((r) => {
        if (cancelled) return;
        const data = r.data?.data;
        const list = Array.isArray(data) ? data : (data?.categories ?? []);
        setCategories(list);
      })
      .catch((err) => {
        console.warn("Failed to load categories:", err?.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Google Sign-Up (native) ────────────────────────────────────
  const handleGooglePress = async () => {
    setError("");
    if (!GOOGLE_WEB_CLIENT_ID) {
      setError("Google Sign-In is not configured yet.");
      return;
    }

    setGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.idToken || userInfo.data?.idToken;

      if (!idToken) {
        setError("Google sign-up did not return a token.");
        setGoogleLoading(false);
        return;
      }

      await handleGoogleToken(idToken);
    } catch (err) {
      setGoogleLoading(false);

      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
        // cancelled
      } else if (err.code === statusCodes.IN_PROGRESS) {
        // already in progress
      } else if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setError("Google Play Services not available.");
      } else {
        setError(err?.message || "Google sign-up failed.");
      }
    }
  };

  const handleGoogleToken = async (idToken) => {
    try {
      const result = await googleSignIn({
        idToken,
        role: "WORKER",
        ref: account.referralCode.trim() || undefined,
      });

      if (result?.needsRole) {
        navigation.navigate("Register", {
          googleProfile: result.googleProfile,
          idToken,
          refCode: account.referralCode,
          from: "google",
        });
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Google signup failed.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const toggleCat = (cat) => {
    setSelectedCats((prev) => {
      const exists = prev.find((x) => x.id === cat.id);
      if (exists) {
        const next = prev.filter((x) => x.id !== cat.id);
        if (primaryCatId === cat.id) setPrimaryCatId(next[0]?.id ?? "");
        return next;
      }
      if (prev.length >= 5) return prev;
      const next = [...prev, cat];
      if (!primaryCatId) setPrimaryCatId(cat.id);
      return next;
    });
  };

  const handleAddCustomCategory = async () => {
    if (!customCatName.trim()) return;
    setAddingCat(true);
    try {
      const res = await client.post("/categories/suggest", {
        name: customCatName.trim(),
      });
      const cat = res.data?.data?.category;
      if (cat) {
        setCategories((prev) =>
          prev.find((x) => x.id === cat.id) ? prev : [...prev, cat],
        );
        toggleCat(cat);
      }
      setCustomCatName("");
      setShowCustomCat(false);
      setCatSearch("");
    } catch {
      setError("Failed to add custom category");
    } finally {
      setAddingCat(false);
    }
  };

  const validateStep = () => {
    if (step === 0) {
      if (!account.firstName || !account.lastName)
        return "First and last name required";
      if (!account.email) return "Email required";
      if (account.password.length < 8)
        return "Password must be at least 8 characters";
      if (account.password !== account.confirm) return "Passwords do not match";
    }
    if (step === 1) {
      if (!profile.title) return "Professional title required";
      if (!profile.description) return "Description required";
    }
    if (step === 2) {
      if (selectedCats.length === 0) return "Select at least one category";
    }
    if (step === 3) {
      const hasRate =
        pricing.hourlyRate ||
        pricing.dailyRate ||
        pricing.weeklyRate ||
        pricing.monthlyRate ||
        pricing.customRate;
      if (!hasRate) return "Set at least one rate";
      if (!agreed) return "Please agree to the Terms and Privacy Policy";
    }
    return null;
  };

  const next = () => {
    const err = validateStep();
    if (err) return setError(err);
    setError("");
    Keyboard.dismiss();
    setStep((s) => s + 1);
  };

  const handleSubmit = async () => {
    const err = validateStep();
    if (err) return setError(err);

    Keyboard.dismiss();

    try {
      await register({
        ...account,
        role: "WORKER",
        workerProfile: {
          ...profile,
          yearsExperience: parseInt(profile.yearsExperience) || 0,
          serviceRadius: parseInt(profile.serviceRadius) || 25,
          currency: pricing.currency,
          hourlyRate: parseFloat(pricing.hourlyRate) || 0,
          dailyRate: pricing.dailyRate ? parseFloat(pricing.dailyRate) : null,
          weeklyRate: pricing.weeklyRate
            ? parseFloat(pricing.weeklyRate)
            : null,
          monthlyRate: pricing.monthlyRate
            ? parseFloat(pricing.monthlyRate)
            : null,
          customRate: pricing.customRate
            ? parseFloat(pricing.customRate)
            : null,
          customRateLabel: pricing.customRateLabel || null,
          pricingNote: pricing.pricingNote || null,
        },
        categories: selectedCats.map((cat) => ({
          categoryId: cat.id,
          isPrimary: cat.id === primaryCatId,
        })),
        referralCode: account.referralCode?.trim().toUpperCase() || undefined,
      });
    } catch (e) {
      setError(e.response?.data?.message || "Registration failed");
    }
  };

  const a = (k, v) => setAccount((p) => ({ ...p, [k]: v }));
  const p = (k, v) => setProfile((p) => ({ ...p, [k]: v }));
  const pr = (k, v) => setPricing((p) => ({ ...p, [k]: v }));

  const filteredCats = categories.filter(
    (cat) =>
      !catSearch || cat.name.toLowerCase().includes(catSearch.toLowerCase()),
  );

  return (
    <AuthShell showBack backTo="Register">
      <View style={{ marginBottom: 24 }}>
        <AppText
          variant="small"
          weight="bold"
          style={{ color: c.orange, letterSpacing: 1.8 }}
        >
          {t("workerReg.workerAccount", { defaultValue: "WORKER ACCOUNT" })}
        </AppText>
        <AppText
          variant="display"
          weight="displayBlack"
          style={{ marginTop: 4, marginBottom: 4, lineHeight: 34 }}
        >
          {t("workerReg.startEarning", {
            defaultValue: "Start earning on your terms",
          })}
        </AppText>
        <AppText variant="body" tone="dim">
          {t("workerReg.startEarningSubtitle", {
            defaultValue: "Set up your profile and start getting hired",
          })}
        </AppText>
      </View>

      <StepIndicator current={step} c={c} />

      {error ? (
        <View style={{ marginTop: 20 }}>
          <AuthAlert type="error" message={error} />
        </View>
      ) : null}

      <View
        style={[s.card, { backgroundColor: c.bgPanel, borderColor: c.border }]}
      >
        {step === 0 && (
          <View style={s.stepContent}>
            <AppText variant="title" weight="bold" style={s.stepTitle}>
              {t("workerReg.createAccount", {
                defaultValue: "Create your account",
              })}
            </AppText>

            <Pressable
              onPress={handleGooglePress}
              disabled={googleLoading}
              style={({ pressed }) => [
                s.googleBtn,
                {
                  backgroundColor: pressed ? c.bgCard : c.bgInput,
                  borderColor: c.border,
                  opacity: googleLoading ? 0.6 : 1,
                },
              ]}
            >
              {googleLoading ? (
                <ActivityIndicator size="small" color={c.text} />
              ) : (
                <>
                  <Ionicons name="logo-google" size={18} color="#4285F4" />
                  <AppText
                    variant="body"
                    weight="semibold"
                    style={{ color: c.text, marginLeft: 10 }}
                  >
                    {t("auth.signUpWithGoogle", {
                      defaultValue: "Sign up with Google",
                    })}
                  </AppText>
                </>
              )}
            </Pressable>

            <View style={s.dividerRow}>
              <View style={[s.dividerLine, { backgroundColor: c.border }]} />
              <AppText
                variant="small"
                tone="muted"
                style={{ marginHorizontal: 12 }}
              >
                {t("auth.orContinueWithEmail", {
                  defaultValue: "or continue with email",
                })}
              </AppText>
              <View style={[s.dividerLine, { backgroundColor: c.border }]} />
            </View>

            <View style={s.row2}>
              <View style={{ flex: 1 }}>
                <AuthField
                  label={t("auth.firstName") + " *"}
                  placeholder="John"
                  value={account.firstName}
                  onChangeText={(v) => a("firstName", v)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <AuthField
                  label={t("auth.lastName") + " *"}
                  placeholder="Doe"
                  value={account.lastName}
                  onChangeText={(v) => a("lastName", v)}
                />
              </View>
            </View>

            <AuthField
              label={t("auth.emailAddress") + " *"}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={account.email}
              onChangeText={(v) => a("email", v)}
            />

            <AuthField
              label={t("auth.phone")}
              placeholder="+234..."
              keyboardType="phone-pad"
              value={account.phone}
              onChangeText={(v) => a("phone", v)}
            />

            <View style={s.row2}>
              <View style={{ flex: 1 }}>
                <AuthField
                  label={t("auth.country")}
                  placeholder="Nigeria"
                  value={account.country}
                  onChangeText={(v) => a("country", v)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <AuthField
                  label={t("auth.city")}
                  placeholder="Lagos"
                  value={account.city}
                  onChangeText={(v) => a("city", v)}
                />
              </View>
            </View>

            <AuthField
              label={t("auth.referralCode") + " (optional)"}
              placeholder="e.g. SPTEST01"
              autoCapitalize="characters"
              maxLength={12}
              value={account.referralCode}
              onChangeText={(v) => a("referralCode", v.toUpperCase())}
            />

            <AuthField
              label={t("auth.password") + " * (min 8 chars)"}
              secureTextEntry={!showPassword}
              value={account.password}
              onChangeText={(v) => a("password", v)}
              iconRight={{
                name: showPassword ? "eye-off-outline" : "eye-outline",
                onPress: () => setShowPassword((v) => !v),
              }}
            />

            <AuthField
              label={t("auth.confirm") + " *"}
              secureTextEntry={!showConfirmPassword}
              value={account.confirm}
              onChangeText={(v) => a("confirm", v)}
              iconRight={{
                name: showConfirmPassword ? "eye-off-outline" : "eye-outline",
                onPress: () => setShowConfirmPassword((v) => !v),
              }}
            />
          </View>
        )}

        {step === 1 && (
          <View style={s.stepContent}>
            <AppText variant="title" weight="bold" style={s.stepTitle}>
              {t("workerReg.yourProfile", {
                defaultValue: "Your professional profile",
              })}
            </AppText>

            <AuthField
              label={t("workerReg.professionalTitle") + " *"}
              placeholder="e.g. Certified Electrician"
              value={profile.title}
              onChangeText={(v) => p("title", v)}
            />

            <View>
              <AppText variant="small" weight="semibold" style={s.label}>
                {t("workerReg.description")} *
              </AppText>
              <TextInput
                multiline
                numberOfLines={4}
                placeholder="Describe your skills, experience, specializations..."
                placeholderTextColor={c.textMuted}
                value={profile.description}
                onChangeText={(v) => p("description", v)}
                style={[
                  s.textarea,
                  {
                    color: c.text,
                    backgroundColor: c.bgInput,
                    borderColor: c.border,
                  },
                ]}
              />
            </View>

            <View style={s.row2}>
              <View style={{ flex: 1 }}>
                <AuthField
                  label={t("workerReg.yearsExperience", {
                    defaultValue: "Years of Experience",
                  })}
                  keyboardType="number-pad"
                  placeholder="0"
                  value={profile.yearsExperience}
                  onChangeText={(v) => p("yearsExperience", v)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <AuthField
                  label={t("workerReg.serviceRadius", {
                    defaultValue: "Service Radius (km)",
                  })}
                  keyboardType="number-pad"
                  placeholder="25"
                  value={profile.serviceRadius}
                  onChangeText={(v) => p("serviceRadius", v)}
                />
              </View>
            </View>
          </View>
        )}

        {step === 2 && (
          <View style={s.stepContent}>
            <AppText variant="title" weight="bold" style={s.stepTitle}>
              {t("workerReg.yourCategories", {
                defaultValue: "Your service categories",
              })}
            </AppText>
            <AppText
              variant="small"
              tone="dim"
              style={{ marginTop: -8, marginBottom: 8 }}
            >
              {t("workerReg.categoriesHint", {
                defaultValue: "Select up to 5 categories. Mark one as primary.",
              })}
            </AppText>

            {selectedCats.length > 0 && (
              <View style={s.selectedCats}>
                {selectedCats.map((cat) => {
                  const isPrimary = cat.id === primaryCatId;
                  return (
                    <View
                      key={cat.id}
                      style={[
                        s.selectedChip,
                        {
                          backgroundColor: isPrimary ? c.orangeDim : c.bgCard,
                          borderColor: isPrimary ? c.orange : c.border,
                        },
                      ]}
                    >
                      <AppText
                        variant="small"
                        weight="semibold"
                        style={{ color: isPrimary ? c.orange : c.text }}
                      >
                        {cat.icon ? `${cat.icon} ` : ""}
                        {cat.name}
                      </AppText>
                      <Pressable
                        onPress={() => setPrimaryCatId(cat.id)}
                        hitSlop={6}
                        style={{ marginLeft: 6 }}
                      >
                        <Ionicons
                          name={isPrimary ? "star" : "star-outline"}
                          size={13}
                          color={isPrimary ? c.orange : c.textMuted}
                        />
                      </Pressable>
                      <Pressable
                        onPress={() => toggleCat(cat)}
                        hitSlop={6}
                        style={{ marginLeft: 4 }}
                      >
                        <Ionicons
                          name="close"
                          size={14}
                          color={isPrimary ? c.orange : c.textMuted}
                        />
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            )}

            <AuthField
              placeholder="Search categories..."
              iconLeft="search-outline"
              value={catSearch}
              onChangeText={setCatSearch}
            />

            {/* ✅ ScrollView with increased maxHeight and no slice limit */}
            <ScrollView style={{ maxHeight: 400 }} nestedScrollEnabled>
              <View style={s.catGrid}>
                {filteredCats.map((cat) => {
                  const selected = !!selectedCats.find((x) => x.id === cat.id);
                  return (
                    <Pressable
                      key={cat.id}
                      onPress={() => toggleCat(cat)}
                      style={[
                        s.catChip,
                        {
                          backgroundColor: selected ? c.orangeDim : c.bgCard,
                          borderColor: selected ? c.orange : c.border,
                        },
                      ]}
                    >
                      <AppText
                        variant="small"
                        style={{ color: selected ? c.orange : c.textDim }}
                      >
                        {cat.icon ? `${cat.icon} ` : ""}
                        {cat.name}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            {!showCustomCat ? (
              <Pressable
                onPress={() => setShowCustomCat(true)}
                style={[s.addCatBtn, { borderColor: c.border }]}
              >
                <Ionicons name="add" size={14} color={c.textDim} />
                <AppText variant="small" weight="semibold" tone="dim">
                  Add a custom category
                </AppText>
              </Pressable>
            ) : (
              <View style={s.customCatBox}>
                <AuthField
                  autoFocus
                  placeholder="e.g. Solar Panel Installation"
                  value={customCatName}
                  onChangeText={setCustomCatName}
                />
                <View style={s.row2}>
                  <Pressable
                    onPress={handleAddCustomCategory}
                    disabled={addingCat || !customCatName.trim()}
                    style={[
                      s.primaryBtn,
                      { backgroundColor: c.orange, flex: 1 },
                      (addingCat || !customCatName.trim()) && { opacity: 0.5 },
                    ]}
                  >
                    <AppText
                      variant="body"
                      weight="bold"
                      style={{ color: "#fff", textAlign: "center" }}
                    >
                      {addingCat ? "Adding..." : "Add Category"}
                    </AppText>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setShowCustomCat(false);
                      setCustomCatName("");
                    }}
                    style={[s.secondaryBtn, { borderColor: c.border, flex: 1 }]}
                  >
                    <AppText
                      variant="body"
                      weight="semibold"
                      tone="dim"
                      style={{ textAlign: "center" }}
                    >
                      Cancel
                    </AppText>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        )}

        {step === 3 && (
          <View style={s.stepContent}>
            <AppText variant="title" weight="bold" style={s.stepTitle}>
              {t("workerReg.setYourRates", {
                defaultValue: "Set your rates",
              })}
            </AppText>
            <AppText
              variant="small"
              tone="dim"
              style={{ marginTop: -8, marginBottom: 8 }}
            >
              {t("workerReg.ratesNote", {
                defaultValue:
                  "Leave blank to hide that option from your profile. Set at least one rate.",
              })}
            </AppText>

            <View>
              <AppText variant="small" weight="semibold" style={s.label}>
                Currency
              </AppText>
              <CurrencyPicker
                value={pricing.currency}
                onChange={(v) => pr("currency", v)}
                c={c}
              />
            </View>

            <View style={s.row2}>
              <View style={{ flex: 1 }}>
                <AuthField
                  label="Hourly Rate"
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  value={pricing.hourlyRate}
                  onChangeText={(v) => pr("hourlyRate", v)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <AuthField
                  label="Daily Rate"
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  value={pricing.dailyRate}
                  onChangeText={(v) => pr("dailyRate", v)}
                />
              </View>
            </View>
            <View style={s.row2}>
              <View style={{ flex: 1 }}>
                <AuthField
                  label="Weekly Rate"
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  value={pricing.weeklyRate}
                  onChangeText={(v) => pr("weeklyRate", v)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <AuthField
                  label="Monthly Rate"
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  value={pricing.monthlyRate}
                  onChangeText={(v) => pr("monthlyRate", v)}
                />
              </View>
            </View>

            <View style={[s.divider, { borderTopColor: c.border }]}>
              <AppText variant="small" weight="bold" tone="muted">
                Custom Rate
              </AppText>
            </View>

            <View style={s.row2}>
              <View style={{ flex: 1 }}>
                <AuthField
                  label="Custom Rate Amount"
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  value={pricing.customRate}
                  onChangeText={(v) => pr("customRate", v)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <AuthField
                  label="Custom Label"
                  placeholder="e.g. per project"
                  value={pricing.customRateLabel}
                  onChangeText={(v) => pr("customRateLabel", v)}
                />
              </View>
            </View>

            <View>
              <AppText variant="small" weight="semibold" style={s.label}>
                Pricing Note (optional)
              </AppText>
              <TextInput
                multiline
                numberOfLines={3}
                placeholder="Discounts, terms, travel fees..."
                placeholderTextColor={c.textMuted}
                value={pricing.pricingNote}
                onChangeText={(v) => pr("pricingNote", v)}
                style={[
                  s.textarea,
                  {
                    color: c.text,
                    backgroundColor: c.bgInput,
                    borderColor: c.border,
                  },
                ]}
              />
            </View>

            {(pricing.hourlyRate ||
              pricing.dailyRate ||
              pricing.weeklyRate ||
              pricing.monthlyRate ||
              pricing.customRate) && (
              <View
                style={[
                  s.preview,
                  { backgroundColor: c.bgCard, borderColor: c.border },
                ]}
              >
                <AppText variant="small" weight="bold" tone="muted">
                  YOUR RATES PREVIEW
                </AppText>
                <View style={s.previewPills}>
                  {pricing.hourlyRate ? (
                    <View
                      style={[s.previewPill, { backgroundColor: c.orangeDim }]}
                    >
                      <AppText
                        variant="small"
                        weight="bold"
                        style={{ color: c.orange }}
                      >
                        {pricing.currency} {pricing.hourlyRate}/hr
                      </AppText>
                    </View>
                  ) : null}
                  {pricing.dailyRate ? (
                    <View
                      style={[s.previewPill, { backgroundColor: c.orangeDim }]}
                    >
                      <AppText
                        variant="small"
                        weight="bold"
                        style={{ color: c.orange }}
                      >
                        {pricing.currency} {pricing.dailyRate}/day
                      </AppText>
                    </View>
                  ) : null}
                  {pricing.weeklyRate ? (
                    <View
                      style={[s.previewPill, { backgroundColor: c.orangeDim }]}
                    >
                      <AppText
                        variant="small"
                        weight="bold"
                        style={{ color: c.orange }}
                      >
                        {pricing.currency} {pricing.weeklyRate}/wk
                      </AppText>
                    </View>
                  ) : null}
                  {pricing.monthlyRate ? (
                    <View
                      style={[s.previewPill, { backgroundColor: c.orangeDim }]}
                    >
                      <AppText
                        variant="small"
                        weight="bold"
                        style={{ color: c.orange }}
                      >
                        {pricing.currency} {pricing.monthlyRate}/mo
                      </AppText>
                    </View>
                  ) : null}
                  {pricing.customRate ? (
                    <View
                      style={[s.previewPill, { backgroundColor: c.orangeDim }]}
                    >
                      <AppText
                        variant="small"
                        weight="bold"
                        style={{ color: c.orange }}
                      >
                        {pricing.currency} {pricing.customRate}
                        {pricing.customRateLabel
                          ? `/${pricing.customRateLabel}`
                          : "/custom"}
                      </AppText>
                    </View>
                  ) : null}
                </View>
              </View>
            )}

            <Pressable onPress={() => setAgreed(!agreed)} style={s.checkRow}>
              <View
                style={[
                  s.checkbox,
                  {
                    borderColor: agreed ? c.orange : c.border,
                    backgroundColor: agreed ? c.orange : "transparent",
                  },
                ]}
              >
                {agreed && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <AppText variant="small" tone="dim" style={{ flex: 1 }}>
                I agree to the{" "}
                <AppText variant="small" style={{ color: c.orange }}>
                  Terms
                </AppText>{" "}
                and{" "}
                <AppText variant="small" style={{ color: c.orange }}>
                  Privacy Policy
                </AppText>
              </AppText>
            </Pressable>
          </View>
        )}

        <View style={[s.navRow, { borderTopColor: c.border }]}>
          {step > 0 && (
            <Pressable
              onPress={() => {
                Keyboard.dismiss();
                setStep((s) => s - 1);
                setError("");
              }}
              style={[s.secondaryBtn, { borderColor: c.border }]}
            >
              <AppText variant="body" weight="semibold" tone="dim">
                ← Back
              </AppText>
            </Pressable>
          )}

          {step < STEPS.length - 1 ? (
            <Pressable
              onPress={next}
              style={[s.primaryBtn, { backgroundColor: c.orange }]}
            >
              <AppText variant="body" weight="bold" style={{ color: "#fff" }}>
                Continue →
              </AppText>
            </Pressable>
          ) : (
            <Pressable
              onPress={handleSubmit}
              disabled={isLoading || !agreed}
              style={[
                s.primaryBtn,
                { backgroundColor: isLoading || !agreed ? c.bgCard : c.orange },
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <AppText
                  variant="body"
                  weight="bold"
                  style={{ color: isLoading || !agreed ? c.textMuted : "#fff" }}
                >
                  🚀 Create Account
                </AppText>
              )}
            </Pressable>
          )}
        </View>
      </View>

      <View style={{ alignItems: "center", marginTop: 20 }}>
        <AppText variant="body" tone="dim">
          Already have an account?{" "}
          <AppText
            variant="body"
            weight="semibold"
            style={{ color: c.orange }}
            onPress={() => navigation.navigate("Login")}
          >
            Sign in
          </AppText>
        </AppText>
        <View style={{ marginTop: 8 }}>
          <AppText variant="body" tone="dim">
            Hiring someone?{" "}
            <AppText
              variant="body"
              weight="semibold"
              style={{ color: c.orange }}
              onPress={() => navigation.navigate("RegisterHirer")}
            >
              Register as Hirer
            </AppText>
          </AppText>
        </View>
      </View>
    </AuthShell>
  );
}

const si = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", marginBottom: 20 },
  dotWrap: { alignItems: "center", zIndex: 1, position: "relative" },
  dot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  line: { flex: 1, height: 2, marginTop: 17, marginHorizontal: -2 },
});

const s = StyleSheet.create({
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 50,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginTop: 24,
  },
  stepContent: { gap: 16 },
  stepTitle: { marginBottom: 8 },
  label: {
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontSize: 11,
  },
  row2: { flexDirection: "row", gap: 12 },
  textarea: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    minHeight: 100,
    textAlignVertical: "top",
  },
  divider: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 4,
    alignItems: "center",
  },
  selectedCats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  selectedChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
  },
  catGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingVertical: 4,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 100,
    borderWidth: 1,
  },
  addCatBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 8,
  },
  customCatBox: { gap: 10, marginTop: 8 },
  checkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    marginTop: 8,
  },
  checkbox: {
    width: 15,
    height: 15,
    borderWidth: 1.5,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  preview: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  previewPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  previewPill: {
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 100,
  },
  selector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  selectorMenu: {
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 4,
    overflow: "hidden",
  },
  selectorItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  navRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    borderTopWidth: 1,
    paddingTop: 20,
    marginTop: 20,
  },
  secondaryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
