// src/screens/main/SettingsScreen.js
// Role-aware settings — workers see Work Profile + Pricing tabs.
// All dropdowns use Modal-based selectors (fixes the overlap bug from inline dropdowns).
// APIs:
//   GET/PATCH /settings/profile
//   POST /settings/avatar
//   PATCH /settings/worker-profile   ← new worker tabs
//   PATCH /settings/hirer-profile
//   GET/PATCH /settings/notifications
//   GET/PATCH /settings/privacy
//   GET /settings/security
//   GET /settings/activity
//   PATCH /settings/password

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useTranslation } from "react-i18next";

import AppScreen from "../../components/AppScreen";
import AppText from "../../components/AppText";
import Card from "../../components/Card";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import { useAuthStore } from "../../store/authStore";
import { settingsApi } from "../../api/settings";
import client from "../../api/client";
import { changeLanguage } from "../../i18n";
import { CURRENCIES } from "../../constants/currencies";
import { LANGUAGES } from "../../constants/languages";
import WithdrawalPinSection from "./worker/WithdrawalPinSection";

// ─── Tab definitions ──────────────────────────────────────────────────────────
const TABS_HIRER = [
  { id: "profile", label: "Profile", icon: "person-outline" },
  { id: "company", label: "Company", icon: "business-outline" },
  { id: "currencies", label: "Currencies", icon: "cash-outline" },
  { id: "appearance", label: "Appearance", icon: "color-palette-outline" },
  {
    id: "notifications",
    label: "Notifications",
    icon: "notifications-outline",
  },
  { id: "privacy", label: "Privacy", icon: "lock-closed-outline" },
  { id: "security", label: "Security", icon: "shield-outline" },
  { id: "activity", label: "Activity", icon: "bar-chart-outline" },
];

const TABS_WORKER = [
  { id: "profile", label: "Profile", icon: "person-outline" },
  { id: "workProfile", label: "Work Profile", icon: "construct-outline" },
  { id: "pricing", label: "Pricing", icon: "cash-outline" },
  { id: "currencies", label: "Currencies", icon: "swap-horizontal-outline" },
  { id: "appearance", label: "Appearance", icon: "color-palette-outline" },
  {
    id: "notifications",
    label: "Notifications",
    icon: "notifications-outline",
  },
  { id: "privacy", label: "Privacy", icon: "lock-closed-outline" },
  { id: "security", label: "Security", icon: "shield-outline" },
  { id: "activity", label: "Activity", icon: "bar-chart-outline" },
];

const GENDERS = ["Male", "Female", "Non-binary", "Prefer not to say"];
const THEMES = [
  { value: "light", label: "Light", emoji: "☀️" },
  { value: "dark", label: "Dark", emoji: "🌙" },
  { value: "system", label: "System", emoji: "💻" },
];
const CO_SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"];
const ALL_CURR = CURRENCIES.map
  ? CURRENCIES.map((c) => ({
      value: c.code ?? c,
      label: c.name ? `${c.code} — ${c.name}` : c,
    }))
  : [];
const ALL_LANGS = LANGUAGES.map
  ? LANGUAGES.map((l) => ({
      value: l.code ?? l,
      label:
        l.code === "en"
          ? `${l.nativeName ?? l.name ?? l} (Default)`
          : (l.nativeName ?? l.name ?? l),
      flag: l.flag ?? "🌐",
    }))
  : [];

// ─── Reusable Modal selector (replaces all inline dropdowns) ──────────────────
function SelectModal({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
  c,
  modalBg,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={sm.backdrop} onPress={onClose}>
        <Pressable
          style={[
            sm.sheet,
            { backgroundColor: modalBg, borderTopColor: c.border },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[sm.handle, { backgroundColor: c.border }]} />
          <AppText
            variant="title"
            weight="semibold"
            style={{ color: c.text, paddingHorizontal: 20, marginBottom: 12 }}
          >
            {title}
          </AppText>
          <FlatList
            data={options}
            keyExtractor={(item) => String(item.value ?? item)}
            style={{ maxHeight: 420 }}
            renderItem={({ item }) => {
              const val = item.value ?? item;
              const lbl = item.label ?? item;
              const sel = val === selected;
              return (
                <Pressable
                  onPress={() => {
                    onSelect(val);
                    onClose();
                  }}
                  style={[
                    sm.option,
                    {
                      borderBottomColor: c.border,
                      backgroundColor: sel ? `${c.orange}15` : "transparent",
                    },
                  ]}
                >
                  <AppText
                    variant="body"
                    style={{ flex: 1, color: sel ? c.orange : c.text }}
                  >
                    {lbl}
                  </AppText>
                  {sel && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={c.orange}
                    />
                  )}
                </Pressable>
              );
            }}
          />
          <View style={{ height: 28 }} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Field helpers ────────────────────────────────────────────────────────────
function FieldLabel({ label, c }) {
  return (
    <AppText
      variant="small"
      weight="semibold"
      style={{
        color: c.textMuted,
        letterSpacing: 0.8,
        marginBottom: 8,
        fontSize: 11,
      }}
    >
      {label}
    </AppText>
  );
}

function FieldInput({
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
  secureTextEntry,
  c,
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={c.textMuted}
      multiline={multiline}
      numberOfLines={multiline ? 4 : 1}
      textAlignVertical={multiline ? "top" : "center"}
      keyboardType={keyboardType ?? "default"}
      secureTextEntry={secureTextEntry}
      style={[
        f.input,
        multiline && { minHeight: 100, paddingTop: 12 },
        { color: c.text, backgroundColor: c.bgInput, borderColor: c.border },
      ]}
    />
  );
}

function SelectField({ label, value, displayLabel, onPress, c }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <FieldLabel label={label} c={c} />
      <Pressable
        onPress={onPress}
        style={[
          f.input,
          f.selectField,
          { backgroundColor: c.bgInput, borderColor: c.border },
        ]}
      >
        <AppText
          variant="body"
          style={{ flex: 1, color: value ? c.text : c.textMuted }}
        >
          {displayLabel ?? value ?? "Select..."}
        </AppText>
        <Ionicons name="chevron-down" size={16} color={c.textMuted} />
      </Pressable>
    </View>
  );
}

function SectionHeader({ icon, title, sub, c }) {
  return (
    <View style={[s.sectionHeader, { borderBottomColor: c.border }]}>
      <AppText style={{ fontSize: 28, lineHeight: 40, marginRight: 14 }}>
        {icon}
      </AppText>
      <View>
        <AppText variant="title" weight="semibold" style={{ color: c.text }}>
          {title}
        </AppText>
        {sub && (
          <AppText variant="small" tone="dim" style={{ marginTop: 2 }}>
            {sub}
          </AppText>
        )}
      </View>
    </View>
  );
}

function SaveBtn({ label, onPress, loading, c }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={[
        s.saveBtn,
        { backgroundColor: c.orange, opacity: loading ? 0.75 : 1 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <AppText variant="body" weight="semibold" style={{ color: "#fff" }}>
          {label}
        </AppText>
      )}
    </Pressable>
  );
}

function ToggleRow({ label, sub, value, onChange, c }) {
  return (
    <View style={[s.toggleRow, { borderBottomColor: c.border }]}>
      <View style={{ flex: 1, marginRight: 16 }}>
        <AppText variant="body" weight="semibold" style={{ color: c.text }}>
          {label}
        </AppText>
        {sub && (
          <AppText variant="small" tone="dim" style={{ marginTop: 2 }}>
            {sub}
          </AppText>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: c.border, true: c.orange }}
        thumbColor="#fff"
        ios_backgroundColor={c.border}
      />
    </View>
  );
}

function RateInput({ label, suffix, value, onChange, c }) {
  return (
    <View style={{ flex: 1 }}>
      <FieldLabel label={label} c={c} />
      <View
        style={[
          f.rateBox,
          { backgroundColor: c.bgInput, borderColor: c.border },
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder="0.00"
          placeholderTextColor={c.textMuted}
          keyboardType="decimal-pad"
          style={{ flex: 1, color: c.text, fontSize: 15 }}
        />
        <AppText variant="small" tone="dim" style={{ marginLeft: 4 }}>
          {suffix}
        </AppText>
      </View>
    </View>
  );
}

// ─── SECTION: Profile ─────────────────────────────────────────────────────────
function ProfileSection({ user, reload, c, modalBg, toast }) {
  const [form, setForm] = useState({
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    phone: user.phone ?? "",
    bio: user.bio ?? "",
    country: user.country ?? "",
    state: user.state ?? "",
    city: user.city ?? "",
    address: user.address ?? "",
    currency: user.currency ?? "USD",
    gender: user.gender ?? "",
    language: user.language ?? "en",
  });
  const [saving, setSaving] = useState(false);
  const [showCurrency, setShowCurrency] = useState(false);
  const [showGender, setShowGender] = useState(false);
  const [showLanguage, setShowLanguage] = useState(false);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await settingsApi.updateProfile(form);
      toast.success("Profile saved");
      reload();
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      toast.error("Permission required");
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!r.canceled && r.assets?.[0]) {
      const a = r.assets[0];
      const fd = new FormData();
      fd.append("avatar", {
        uri: a.uri,
        name: "avatar.jpg",
        type: "image/jpeg",
      });
      try {
        await client.post("/settings/avatar", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Avatar updated");
        reload();
      } catch {
        toast.error("Failed to upload avatar");
      }
    }
  };

  const currLabel =
    ALL_CURR.find((c) => c.value === form.currency)?.label ?? form.currency;
  const langLabel =
    ALL_LANGS.find((l) => l.value === form.language)?.label ?? form.language;

  return (
    <View>
      <SectionHeader
        icon="👤"
        title="Profile"
        sub="Personal details and contact info"
        c={c}
      />

      {/* Avatar */}
      <View style={s.avatarRow}>
        <View style={[s.avatarWrap, { borderColor: c.orange }]}>
          {user.avatar ? (
            <Image source={{ uri: user.avatar }} style={s.avatarImg} />
          ) : (
            <AppText
              variant="title"
              weight="semibold"
              style={{ color: c.orange }}
            >
              {user.firstName?.[0]}
              {user.lastName?.[0]}
            </AppText>
          )}
        </View>
        <Pressable
          onPress={pickAvatar}
          style={[
            s.changePhotoBtn,
            { backgroundColor: c.bgCard, borderColor: c.border },
          ]}
        >
          <Ionicons
            name="camera-outline"
            size={16}
            color={c.orange}
            style={{ marginRight: 6 }}
          />
          <AppText
            variant="small"
            weight="semibold"
            style={{ color: c.orange }}
          >
            Change Photo
          </AppText>
        </Pressable>
        <AppText variant="small" tone="dim" style={{ marginTop: 6 }}>
          JPG, PNG or WebP · max 5MB
        </AppText>
      </View>

      <View style={s.row2}>
        <View style={{ flex: 1 }}>
          <FieldLabel label="FIRST NAME" c={c} />
          <FieldInput
            value={form.firstName}
            onChangeText={set("firstName")}
            placeholder="John"
            c={c}
          />
        </View>
        <View style={{ flex: 1 }}>
          <FieldLabel label="LAST NAME" c={c} />
          <FieldInput
            value={form.lastName}
            onChangeText={set("lastName")}
            placeholder="Doe"
            c={c}
          />
        </View>
      </View>

      <FieldLabel label="PHONE" c={c} />
      <FieldInput
        value={form.phone}
        onChangeText={set("phone")}
        placeholder="+234..."
        keyboardType="phone-pad"
        c={c}
      />
      <View style={{ marginBottom: 16 }} />

      <FieldLabel label="BIO" c={c} />
      <FieldInput
        value={form.bio}
        onChangeText={set("bio")}
        placeholder="Tell hirers about yourself..."
        multiline
        c={c}
      />
      <View style={{ marginBottom: 16 }} />

      <View style={s.row2}>
        <View style={{ flex: 1 }}>
          <FieldLabel label="COUNTRY" c={c} />
          <FieldInput
            value={form.country}
            onChangeText={set("country")}
            placeholder="Nigeria"
            c={c}
          />
        </View>
        <View style={{ flex: 1 }}>
          <FieldLabel label="STATE" c={c} />
          <FieldInput
            value={form.state}
            onChangeText={set("state")}
            placeholder="Lagos"
            c={c}
          />
        </View>
      </View>

      <View style={s.row2}>
        <View style={{ flex: 1 }}>
          <FieldLabel label="CITY" c={c} />
          <FieldInput
            value={form.city}
            onChangeText={set("city")}
            placeholder="Ikeja"
            c={c}
          />
        </View>
        <View style={{ flex: 1 }}>
          <FieldLabel label="ADDRESS" c={c} />
          <FieldInput
            value={form.address}
            onChangeText={set("address")}
            placeholder="123 Main St"
            c={c}
          />
        </View>
      </View>

      <View style={s.row2}>
        {/* Currency — Modal picker */}
        <View style={{ flex: 1 }}>
          <SelectField
            label="CURRENCY"
            value={form.currency}
            displayLabel={currLabel}
            onPress={() => setShowCurrency(true)}
            c={c}
          />
        </View>
        {/* Gender — Modal picker */}
        <View style={{ flex: 1 }}>
          <SelectField
            label="GENDER"
            value={form.gender}
            displayLabel={form.gender || "Select..."}
            onPress={() => setShowGender(true)}
            c={c}
          />
        </View>
      </View>

      {/* Language — Modal picker */}
      <SelectField
        label="LANGUAGE"
        value={form.language}
        displayLabel={langLabel}
        onPress={() => setShowLanguage(true)}
        c={c}
      />

      <SaveBtn label="Save Profile" onPress={save} loading={saving} c={c} />

      {/* Modals */}
      <SelectModal
        visible={showCurrency}
        title="Select Currency"
        options={ALL_CURR}
        selected={form.currency}
        onSelect={set("currency")}
        onClose={() => setShowCurrency(false)}
        c={c}
        modalBg={modalBg}
      />
      <SelectModal
        visible={showGender}
        title="Select Gender"
        options={GENDERS.map((g) => ({ value: g, label: g }))}
        selected={form.gender}
        onSelect={set("gender")}
        onClose={() => setShowGender(false)}
        c={c}
        modalBg={modalBg}
      />
      <SelectModal
        visible={showLanguage}
        title="Select Language"
        options={ALL_LANGS}
        selected={form.language}
        onSelect={set("language")}
        onClose={() => setShowLanguage(false)}
        c={c}
        modalBg={modalBg}
      />
    </View>
  );
}

// ─── SECTION: Work Profile (WORKER) ──────────────────────────────────────────
function WorkProfileSection({ workerProfile, reload, c, toast }) {
  const wp = workerProfile ?? {};
  const [form, setForm] = useState({
    title: wp.title ?? "",
    description: wp.description ?? "",
    yearsExperience: String(wp.yearsExperience ?? ""),
    serviceRadius: String(wp.serviceRadius ?? "25"),
    isAvailable: wp.isAvailable ?? true,
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.title.trim()) {
      toast.error("Professional title is required");
      return;
    }
    setSaving(true);
    try {
      await client.patch("/settings/worker-profile", {
        title: form.title.trim(),
        description: form.description.trim() || null,
        yearsExperience: parseInt(form.yearsExperience) || 0,
        serviceRadius: parseInt(form.serviceRadius) || 25,
        isAvailable: form.isAvailable,
      });
      toast.success("Work profile saved");
      reload();
    } catch {
      toast.error("Failed to save work profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View>
      <SectionHeader
        icon="👷"
        title="Work Profile"
        sub="Professional details hirers see on your profile"
        c={c}
      />

      <FieldLabel label="PROFESSIONAL TITLE" c={c} />
      <FieldInput
        value={form.title}
        onChangeText={set("title")}
        placeholder="e.g. Certified Electrician"
        c={c}
      />
      <View style={{ marginBottom: 16 }} />

      <FieldLabel label="DESCRIPTION" c={c} />
      <FieldInput
        value={form.description}
        onChangeText={set("description")}
        placeholder="Describe your skills, experience, specializations..."
        multiline
        c={c}
      />
      <View style={{ marginBottom: 16 }} />

      <View style={s.row2}>
        <View style={{ flex: 1 }}>
          <FieldLabel label="YEARS OF EXPERIENCE" c={c} />
          <FieldInput
            value={form.yearsExperience}
            onChangeText={set("yearsExperience")}
            placeholder="0"
            keyboardType="number-pad"
            c={c}
          />
        </View>
        <View style={{ flex: 1 }}>
          <FieldLabel label="SERVICE RADIUS (KM)" c={c} />
          <FieldInput
            value={form.serviceRadius}
            onChangeText={set("serviceRadius")}
            placeholder="25"
            keyboardType="number-pad"
            c={c}
          />
        </View>
      </View>

      <View style={{ marginBottom: 8 }} />
      <ToggleRow
        label="Available for Bookings"
        sub="Turn off to pause new booking requests"
        value={form.isAvailable}
        onChange={set("isAvailable")}
        c={c}
      />

      <View style={{ marginTop: 20 }} />
      <SaveBtn
        label="Save Work Profile"
        onPress={save}
        loading={saving}
        c={c}
      />
    </View>
  );
}

// ─── SECTION: Pricing (WORKER) ────────────────────────────────────────────────
function PricingSection({ workerProfile, reload, c, modalBg, toast }) {
  const wp = workerProfile ?? {};
  const [form, setForm] = useState({
    currency: wp.currency ?? "USD",
    hourlyRate: String(wp.hourlyRate ?? ""),
    dailyRate: String(wp.dailyRate ?? ""),
    weeklyRate: String(wp.weeklyRate ?? ""),
    monthlyRate: String(wp.monthlyRate ?? ""),
    customRate: String(wp.customRate ?? ""),
    customRateLabel: wp.customRateLabel ?? "",
    pricingNote: wp.pricingNote ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [showCurrency, setShowCurrency] = useState(false);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await client.patch("/settings/worker-profile", {
        currency: form.currency,
        hourlyRate: parseFloat(form.hourlyRate) || 0,
        dailyRate: form.dailyRate ? parseFloat(form.dailyRate) : null,
        weeklyRate: form.weeklyRate ? parseFloat(form.weeklyRate) : null,
        monthlyRate: form.monthlyRate ? parseFloat(form.monthlyRate) : null,
        customRate: form.customRate ? parseFloat(form.customRate) : null,
        customRateLabel: form.customRateLabel.trim() || null,
        pricingNote: form.pricingNote.trim() || null,
      });
      toast.success("Pricing saved");
      reload();
    } catch {
      toast.error("Failed to save pricing");
    } finally {
      setSaving(false);
    }
  };

  const currLabel =
    ALL_CURR.find((c) => c.value === form.currency)?.label ?? form.currency;

  return (
    <View>
      <SectionHeader
        icon="💰"
        title="Pricing"
        sub="Set your rates for different engagement types"
        c={c}
      />

      <AppText variant="small" tone="dim" style={{ marginBottom: 16 }}>
        Set rates for each duration type. Leave blank to hide that option from
        your profile.
      </AppText>

      {/* Pricing currency */}
      <SelectField
        label="PRICING CURRENCY"
        value={form.currency}
        displayLabel={currLabel}
        onPress={() => setShowCurrency(true)}
        c={c}
      />

      {/* Rate grid */}
      <View style={s.row2}>
        <RateInput
          label="⏱ HOURLY RATE"
          suffix="/hr"
          value={form.hourlyRate}
          onChange={set("hourlyRate")}
          c={c}
        />
        <RateInput
          label="📅 DAILY RATE"
          suffix="/day"
          value={form.dailyRate}
          onChange={set("dailyRate")}
          c={c}
        />
      </View>
      <View style={{ marginBottom: 12 }} />
      <View style={s.row2}>
        <RateInput
          label="📆 WEEKLY RATE"
          suffix="/wk"
          value={form.weeklyRate}
          onChange={set("weeklyRate")}
          c={c}
        />
        <RateInput
          label="🗓 MONTHLY RATE"
          suffix="/mo"
          value={form.monthlyRate}
          onChange={set("monthlyRate")}
          c={c}
        />
      </View>

      {/* Custom rate divider */}
      <View style={[s.divider, { borderTopColor: c.border }]}>
        <AppText
          variant="small"
          weight="semibold"
          style={{ color: c.textMuted, letterSpacing: 0.8, fontSize: 10 }}
        >
          CUSTOM RATE
        </AppText>
      </View>

      <View style={s.row2}>
        <View style={{ flex: 1 }}>
          <FieldLabel label="CUSTOM RATE AMOUNT" c={c} />
          <FieldInput
            value={form.customRate}
            onChangeText={set("customRate")}
            placeholder="0.00"
            keyboardType="decimal-pad"
            c={c}
          />
        </View>
        <View style={{ flex: 1 }}>
          <FieldLabel label="CUSTOM LABEL" c={c} />
          <FieldInput
            value={form.customRateLabel}
            onChangeText={set("customRateLabel")}
            placeholder="e.g. per project"
            c={c}
          />
        </View>
      </View>

      <FieldLabel label="PRICING NOTES (OPTIONAL)" c={c} />
      <FieldInput
        value={form.pricingNote}
        onChangeText={set("pricingNote")}
        placeholder="Discounts, terms, travel fees..."
        multiline
        c={c}
      />
      <View style={{ marginBottom: 16 }} />

      <SaveBtn label="Save Pricing" onPress={save} loading={saving} c={c} />

      <SelectModal
        visible={showCurrency}
        title="Select Pricing Currency"
        options={ALL_CURR}
        selected={form.currency}
        onSelect={set("currency")}
        onClose={() => setShowCurrency(false)}
        c={c}
        modalBg={modalBg}
      />
    </View>
  );
}

// ─── SECTION: Company (HIRER) ─────────────────────────────────────────────────
function CompanySection({ hirerProfile, reload, c, modalBg, toast }) {
  const hp = hirerProfile ?? {};
  const [form, setForm] = useState({
    companyName: hp.companyName ?? "",
    companySize: hp.companySize ?? "",
    website: hp.website ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [showSize, setShowSize] = useState(false);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await settingsApi.updateHirerProfile(form);
      toast.success("Company profile saved");
      reload();
    } catch {
      toast.error("Failed to save company profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View>
      <SectionHeader
        icon="🏢"
        title="Company"
        sub="Business details shown on your hirer profile"
        c={c}
      />

      <FieldLabel label="COMPANY NAME" c={c} />
      <FieldInput
        value={form.companyName}
        onChangeText={set("companyName")}
        placeholder="Acme Ltd"
        c={c}
      />
      <View style={{ marginBottom: 16 }} />

      <SelectField
        label="COMPANY SIZE"
        value={form.companySize}
        displayLabel={form.companySize || "Select size..."}
        onPress={() => setShowSize(true)}
        c={c}
      />

      <FieldLabel label="WEBSITE" c={c} />
      <FieldInput
        value={form.website}
        onChangeText={set("website")}
        placeholder="https://yourcompany.com"
        keyboardType="url"
        c={c}
      />
      <View style={{ marginBottom: 16 }} />

      <SaveBtn label="Save Company" onPress={save} loading={saving} c={c} />

      <SelectModal
        visible={showSize}
        title="Company Size"
        options={CO_SIZES.map((s) => ({ value: s, label: s + " employees" }))}
        selected={form.companySize}
        onSelect={set("companySize")}
        onClose={() => setShowSize(false)}
        c={c}
        modalBg={modalBg}
      />
    </View>
  );
}

// ─── SECTION: Currencies ──────────────────────────────────────────────────────
function CurrenciesSection({ user, reload, c, modalBg, toast }) {
  const [dashCurr, setDashCurr] = useState(user.dashboardCurrency ?? "USD");
  const [payCurr, setPayCurr] = useState(user.paymentCurrency ?? "USD");
  const [saving, setSaving] = useState(false);
  const [showDash, setShowDash] = useState(false);
  const [showPay, setShowPay] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await settingsApi.updateProfile({
        dashboardCurrency: dashCurr,
        paymentCurrency: payCurr,
      });
      toast.success("Currency preferences saved");
      reload();
    } catch {
      toast.error("Failed to save currencies");
    } finally {
      setSaving(false);
    }
  };

  const dashLabel =
    ALL_CURR.find((c) => c.value === dashCurr)?.label ?? dashCurr;
  const payLabel = ALL_CURR.find((c) => c.value === payCurr)?.label ?? payCurr;

  return (
    <View>
      <SectionHeader
        icon="💱"
        title="Currencies"
        sub="How amounts are displayed and processed"
        c={c}
      />
      <SelectField
        label="DASHBOARD CURRENCY"
        value={dashCurr}
        displayLabel={dashLabel}
        onPress={() => setShowDash(true)}
        c={c}
      />
      <SelectField
        label="PAYMENT CURRENCY"
        value={payCurr}
        displayLabel={payLabel}
        onPress={() => setShowPay(true)}
        c={c}
      />
      <SaveBtn label="Save Currencies" onPress={save} loading={saving} c={c} />
      <SelectModal
        visible={showDash}
        title="Dashboard Currency"
        options={ALL_CURR}
        selected={dashCurr}
        onSelect={setDashCurr}
        onClose={() => setShowDash(false)}
        c={c}
        modalBg={modalBg}
      />
      <SelectModal
        visible={showPay}
        title="Payment Currency"
        options={ALL_CURR}
        selected={payCurr}
        onSelect={setPayCurr}
        onClose={() => setShowPay(false)}
        c={c}
        modalBg={modalBg}
      />
    </View>
  );
}

// ─── SECTION: Appearance ──────────────────────────────────────────────────────
function AppearanceSection({ user, reload, c, modalBg, toast }) {
  const { mode, setMode } = useTheme(); // immediate theme apply
  const { i18n } = useTranslation(); // current active language
  const [theme, setThemeState] = useState(mode ?? user.theme ?? "dark");
  const [langSearch, setLangSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [showTheme, setShowTheme] = useState(false);

  // Save theme — applies immediately via setMode, then persists to API
  const saveTheme = async () => {
    setMode(theme); // instant re-render of entire app
    setSaving(true);
    try {
      await settingsApi.updateProfile({ theme });
      toast.success("Appearance saved");
      reload();
    } catch {
      setMode(mode); // revert context on failure
      setThemeState(mode);
      toast.error("Failed to save appearance");
    } finally {
      setSaving(false);
    }
  };

  // Language change — applies instantly via i18n + persists to AsyncStorage + API
  const handleLangSelect = async (code) => {
    try {
      await changeLanguage(code); // 1) calls i18n.changeLanguage → re-renders all screens
      // 2) saves to AsyncStorage → persists across restarts
      toast.success("Language updated");
    } catch {
      toast.error("Could not change language");
    }
    settingsApi.updateProfile({ language: code }).catch(() => {}); // background save
  };

  const themeLabel = THEMES.find((t) => t.value === theme)?.label ?? theme;
  const filteredLangs = ALL_LANGS.filter(
    (l) =>
      !langSearch || l.label.toLowerCase().includes(langSearch.toLowerCase()),
  );

  return (
    <View>
      <SectionHeader
        icon="🎨"
        title="Appearance"
        sub="Theme and language preferences"
        c={c}
      />

      {/* ── Theme ── */}
      <FieldLabel label="🌓 THEME" c={c} />
      <AppText variant="small" tone="dim" style={{ marginBottom: 10 }}>
        Choose how SkilledProz looks on your device.
      </AppText>

      {/* Theme chips matching old screen style */}
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
        {THEMES.map((t) => {
          const sel = theme === t.value;
          return (
            <Pressable
              key={t.value}
              onPress={() => setThemeState(t.value)}
              style={[
                ap.themeCard,
                {
                  borderColor: sel ? c.orange : c.border,
                  backgroundColor: sel ? c.orangeDim : c.bgCard,
                },
              ]}
            >
              {sel && (
                <AppText
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 8,
                    color: c.orange,
                    fontWeight: "700",
                  }}
                >
                  ✓
                </AppText>
              )}
              <AppText style={{ fontSize: 26, marginBottom: 6 }}>
                {t.emoji}
              </AppText>
              <AppText
                variant="small"
                weight="semibold"
                style={{ color: sel ? c.orange : c.text }}
              >
                {t.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <SaveBtn
        label="Save Appearance"
        onPress={saveTheme}
        loading={saving}
        c={c}
      />

      {/* ── Divider ── */}
      <View
        style={[s.divider, { borderTopColor: c.border, marginVertical: 20 }]}
      />

      {/* ── Language ── */}
      <FieldLabel label="🌐 LANGUAGE" c={c} />
      <AppText variant="small" tone="dim" style={{ marginBottom: 10 }}>
        Select your preferred language. Changes apply immediately across the
        app.
      </AppText>

      {/* Search */}
      <View
        style={[
          ap.searchBox,
          { borderColor: c.border, backgroundColor: c.bgInput },
        ]}
      >
        <Ionicons
          name="search"
          size={16}
          color={c.textMuted}
          style={{ marginRight: 8 }}
        />
        <TextInput
          value={langSearch}
          onChangeText={setLangSearch}
          placeholder="Search language..."
          placeholderTextColor={c.textMuted}
          style={{ flex: 1, color: c.text, fontSize: 15 }}
        />
        {langSearch ? (
          <Pressable onPress={() => setLangSearch("")} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={c.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {/* Language list */}
      <View style={[ap.langList, { borderColor: c.border }]}>
        {filteredLangs.map((lang, idx) => {
          const sel = i18n.language === lang.value;
          return (
            <Pressable
              key={lang.value}
              onPress={() => handleLangSelect(lang.value)}
              style={[
                ap.langRow,
                {
                  borderBottomColor: c.border,
                  borderBottomWidth:
                    idx < filteredLangs.length - 1
                      ? StyleSheet.hairlineWidth
                      : 0,
                  backgroundColor: sel ? `${c.orange}15` : "transparent",
                },
              ]}
            >
              <AppText style={{ fontSize: 20, marginRight: 12 }}>
                {lang.flag}
              </AppText>
              <AppText
                variant="body"
                style={{ flex: 1, color: sel ? c.orange : c.text }}
              >
                {lang.label}
              </AppText>
              {sel && (
                <Ionicons name="checkmark-circle" size={18} color={c.orange} />
              )}
            </Pressable>
          );
        })}
        {filteredLangs.length === 0 && (
          <View style={{ padding: 20, alignItems: "center" }}>
            <AppText variant="small" tone="dim">
              No languages found
            </AppText>
          </View>
        )}
      </View>

      {/* Active language indicator */}
      {(() => {
        const active = ALL_LANGS.find((l) => l.value === i18n.language);
        return active ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginTop: 8,
            }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: "#22c55e",
              }}
            />
            <AppText variant="small" tone="dim">
              Active:{" "}
              <AppText variant="small" weight="semibold">
                {active.flag} {active.label}
              </AppText>
            </AppText>
          </View>
        ) : null;
      })()}

      {/* Theme modal */}
      <SelectModal
        visible={showTheme}
        title="Select Theme"
        options={THEMES}
        selected={theme}
        onSelect={setThemeState}
        onClose={() => setShowTheme(false)}
        c={c}
        modalBg={modalBg}
      />
    </View>
  );
}

// ─── SECTION: Notifications ───────────────────────────────────────────────────
function NotificationsSection({ c, toast }) {
  const [prefs, setPrefs] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    settingsApi
      .getNotificationPrefs()
      .then(setPrefs)
      .catch(() => {});
  }, []);

  const toggle = (k) => setPrefs((p) => ({ ...p, [k]: !p[k] }));

  const save = async () => {
    setSaving(true);
    try {
      await settingsApi.updateNotificationPrefs(prefs);
      toast.success("Notification preferences saved");
    } catch {
      toast.error("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  if (!prefs)
    return <ActivityIndicator color={c.orange} style={{ marginTop: 40 }} />;

  return (
    <View>
      <SectionHeader
        icon="🔔"
        title="Notifications"
        sub="Choose what you want to be notified about"
        c={c}
      />
      {[
        {
          key: "notifBookings",
          label: "Bookings",
          sub: "New bookings and status updates",
        },
        { key: "notifMessages", label: "Messages", sub: "New chat messages" },
        {
          key: "notifPayments",
          label: "Payments",
          sub: "Payment receipts and releases",
        },
        { key: "notifReviews", label: "Reviews", sub: "New reviews received" },
        {
          key: "notifMarketing",
          label: "Marketing",
          sub: "Tips, features, and offers",
        },
      ].map((item) => (
        <ToggleRow
          key={item.key}
          label={item.label}
          sub={item.sub}
          value={!!prefs[item.key]}
          onChange={() => toggle(item.key)}
          c={c}
        />
      ))}
      <View style={{ marginTop: 20 }} />
      <SaveBtn label="Save Preferences" onPress={save} loading={saving} c={c} />
    </View>
  );
}

// ─── SECTION: Privacy ─────────────────────────────────────────────────────────
function PrivacySection({ c, toast }) {
  const [prefs, setPrefs] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    settingsApi
      .getPrivacySettings()
      .then(setPrefs)
      .catch(() => {});
  }, []);

  const toggle = (k) => setPrefs((p) => ({ ...p, [k]: !p[k] }));

  const save = async () => {
    setSaving(true);
    try {
      await settingsApi.updatePrivacySettings(prefs);
      toast.success("Privacy settings saved");
    } catch {
      toast.error("Failed to save privacy settings");
    } finally {
      setSaving(false);
    }
  };

  if (!prefs)
    return <ActivityIndicator color={c.orange} style={{ marginTop: 40 }} />;

  return (
    <View>
      <SectionHeader
        icon="🔒"
        title="Privacy"
        sub="Control what others can see on your profile"
        c={c}
      />
      {[
        {
          key: "profileVisible",
          label: "Public Profile",
          sub: "Allow others to view your profile",
        },
        {
          key: "showPhone",
          label: "Show Phone",
          sub: "Display phone number on profile",
        },
        {
          key: "showLocation",
          label: "Show Location",
          sub: "Display city and country",
        },
        {
          key: "showEmail",
          label: "Show Email",
          sub: "Display email on profile",
        },
        {
          key: "showGender",
          label: "Show Gender",
          sub: "Display gender on profile",
        },
      ].map((item) => (
        <ToggleRow
          key={item.key}
          label={item.label}
          sub={item.sub}
          value={!!prefs[item.key]}
          onChange={() => toggle(item.key)}
          c={c}
        />
      ))}
      <View style={{ marginTop: 20 }} />
      <SaveBtn label="Save Privacy" onPress={save} loading={saving} c={c} />
    </View>
  );
}

// ─── SECTION: Security ────────────────────────────────────────────────────────
function SecuritySection({ c, toast }) {
  const [info, setInfo] = useState(null);
  const [current, setCurrent] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    settingsApi
      .getSecurityInfo()
      .then(setInfo)
      .catch(() => {});
  }, []);

  const changePassword = async () => {
    if (!current.trim()) {
      toast.error("Enter your current password");
      return;
    }
    if (newPw.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    if (newPw !== confirm) {
      toast.error("Passwords don't match");
      return;
    }
    setSaving(true);
    try {
      await settingsApi.changePassword({
        currentPassword: current,
        newPassword: newPw,
      });
      toast.success("Password changed successfully");
      setCurrent("");
      setNewPw("");
      setConfirm("");
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View>
      <SectionHeader
        icon="🛡️"
        title="Security"
        sub="Password and account security"
        c={c}
      />
      {info && (
        <View
          style={[
            s.infoBox,
            { backgroundColor: c.bgCard, borderColor: c.border },
          ]}
        >
          {[
            {
              label: "Email",
              value: info.email,
              verified: info.isEmailVerified,
            },
            { label: "Phone", value: info.phone ?? "Not set" },
          ].map((row) => (
            <View
              key={row.label}
              style={[s.infoRow, { borderBottomColor: c.border }]}
            >
              <AppText variant="small" tone="dim">
                {row.label}
              </AppText>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <AppText
                  variant="body"
                  weight="semibold"
                  style={{ color: c.text }}
                >
                  {row.value}
                </AppText>
                {row.verified !== undefined && (
                  <Ionicons
                    name={row.verified ? "checkmark-circle" : "alert-circle"}
                    size={16}
                    color={row.verified ? "#22c55e" : "#f97316"}
                  />
                )}
              </View>
            </View>
          ))}
        </View>
      )}
      <WithdrawalPinSection />
      <AppText
        variant="body"
        weight="bold"
        style={{ color: c.text, marginBottom: 16, marginTop: 8 }}
      >
        Change Password
      </AppText>
      <FieldLabel label="CURRENT PASSWORD" c={c} />
      <FieldInput
        value={current}
        onChangeText={setCurrent}
        placeholder="••••••••"
        secureTextEntry
        c={c}
      />
      <View style={{ marginBottom: 16 }} />
      <View style={s.row2}>
        <View style={{ flex: 1 }}>
          <FieldLabel label="NEW PASSWORD" c={c} />
          <FieldInput
            value={newPw}
            onChangeText={setNewPw}
            placeholder="min 8 chars"
            secureTextEntry
            c={c}
          />
        </View>
        <View style={{ flex: 1 }}>
          <FieldLabel label="CONFIRM PASSWORD" c={c} />
          <FieldInput
            value={confirm}
            onChangeText={setConfirm}
            placeholder="repeat"
            secureTextEntry
            c={c}
          />
        </View>
      </View>
      <View style={{ marginBottom: 8 }} />
      <SaveBtn
        label="Change Password"
        onPress={changePassword}
        loading={saving}
        c={c}
      />
    </View>
  );
}

// ─── SECTION: Activity ────────────────────────────────────────────────────────
function ActivitySection({ c }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    settingsApi
      .getActivitySummary()
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data)
    return <ActivityIndicator color={c.orange} style={{ marginTop: 40 }} />;

  const { summary, recentActivity } = data;

  return (
    <View>
      <SectionHeader
        icon="📊"
        title="Activity"
        sub="Your recent account activity"
        c={c}
      />
      <View style={s.row2}>
        {[
          { label: "Bookings", value: summary.totalBookings },
          { label: "Reviews", value: summary.totalReviews },
          { label: "Unread Notifs", value: summary.unreadNotifications },
        ].map((stat) => (
          <View
            key={stat.label}
            style={[
              s.statBox,
              { backgroundColor: c.bgCard, borderColor: c.border },
            ]}
          >
            <AppText
              variant="display"
              weight="displayBlack"
              style={{ color: c.orange }}
            >
              {stat.value}
            </AppText>
            <AppText variant="small" tone="dim">
              {stat.label}
            </AppText>
          </View>
        ))}
      </View>
      {(recentActivity ?? []).slice(0, 8).map((n) => (
        <View
          key={n.id}
          style={[s.activityRow, { borderBottomColor: c.border }]}
        >
          <View
            style={[
              s.actDot,
              { backgroundColor: n.isRead ? c.border : c.orange },
            ]}
          />
          <View style={{ flex: 1 }}>
            <AppText variant="body" weight="semibold" style={{ color: c.text }}>
              {n.title}
            </AppText>
            <AppText variant="small" tone="dim" numberOfLines={1}>
              {n.body}
            </AppText>
          </View>
          <AppText variant="small" tone="dim" style={{ fontSize: 10 }}>
            {new Date(n.createdAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
            })}
          </AppText>
        </View>
      ))}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const { theme: th } = useTheme();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const c = th.colors;
  const modalBg = th.mode === "dark" ? "#111118" : "#ffffff";
  const isWorker = user?.role === "WORKER";
  const TABS = isWorker ? TABS_WORKER : TABS_HIRER;

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

  const load = useCallback(async () => {
    try {
      const data = await settingsApi.getProfile();
      setProfileData(data.user ?? data);
    } catch {
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: c.bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color={c.orange} />
      </View>
    );
  }

  const workerProfile = profileData?.workerProfile;
  const hirerProfile = profileData?.hirerProfile;
  const u = profileData ?? user ?? {};

  return (
    <AppScreen
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          tintColor={c.orange}
        />
      }
      contentContainerStyle={{ paddingBottom: 60 }}
    >
      {/* ── Tab strip ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 16 }}
        contentContainerStyle={{ gap: 8, paddingRight: 8 }}
      >
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <Pressable
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={[
                s.tabChip,
                {
                  backgroundColor: active ? c.orange : c.bgCard,
                  borderColor: active ? c.orange : c.border,
                },
              ]}
            >
              <Ionicons
                name={tab.icon}
                size={14}
                color={active ? "#fff" : c.textMuted}
                style={{ marginRight: 6 }}
              />
              <AppText
                variant="small"
                weight="semibold"
                style={{ color: active ? "#fff" : c.text }}
              >
                {tab.label}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ── Content card ── */}
      <Card padded>
        {activeTab === "profile" && (
          <ProfileSection
            user={u}
            reload={load}
            c={c}
            modalBg={modalBg}
            toast={toast}
          />
        )}
        {activeTab === "workProfile" && (
          <WorkProfileSection
            workerProfile={workerProfile}
            reload={load}
            c={c}
            toast={toast}
          />
        )}
        {activeTab === "pricing" && (
          <PricingSection
            workerProfile={workerProfile}
            reload={load}
            c={c}
            modalBg={modalBg}
            toast={toast}
          />
        )}
        {activeTab === "company" && (
          <CompanySection
            hirerProfile={hirerProfile}
            reload={load}
            c={c}
            modalBg={modalBg}
            toast={toast}
          />
        )}
        {activeTab === "currencies" && (
          <CurrenciesSection
            user={u}
            reload={load}
            c={c}
            modalBg={modalBg}
            toast={toast}
          />
        )}
        {activeTab === "appearance" && (
          <AppearanceSection
            user={u}
            reload={load}
            c={c}
            modalBg={modalBg}
            toast={toast}
          />
        )}
        {activeTab === "notifications" && (
          <NotificationsSection c={c} toast={toast} />
        )}
        {activeTab === "privacy" && <PrivacySection c={c} toast={toast} />}
        {activeTab === "security" && <SecuritySection c={c} toast={toast} />}
        {activeTab === "activity" && <ActivitySection c={c} />}
      </Card>
    </AppScreen>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

// Appearance section styles
const ap = StyleSheet.create({
  themeCard: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    position: "relative",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 8,
  },
  langList: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 8,
  },
  langRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
});

const sm = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});

const f = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    marginBottom: 0,
  },
  selectField: { flexDirection: "row", alignItems: "center" },
  rateBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
  },
});

const s = StyleSheet.create({
  tabChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 20,
  },

  avatarRow: { alignItems: "center", marginBottom: 24 },
  avatarWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: "100%", height: "100%" },
  changePhotoBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 10,
  },

  row2: { flexDirection: "row", gap: 12, marginBottom: 0 },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 14,
    marginVertical: 14,
    alignItems: "center",
  },
  saveBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
  },

  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  infoBox: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  statBox: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
    marginBottom: 16,
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actDot: { width: 8, height: 8, borderRadius: 4 },
});
