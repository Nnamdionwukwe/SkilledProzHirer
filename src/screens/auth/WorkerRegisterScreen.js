// src/screens/auth/WorkerRegisterScreen.js
// 4-step worker registration — mirrors the website's WorkerRegister component exactly.
// Steps: Account → Profile → Category → Pricing
// API: POST /auth/register  |  GET /categories  |  POST /categories/suggest

import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";

import AppScreen from "../../components/AppScreen";
import AppText from "../../components/AppText";
import AppInput from "../../components/AppInput";
import AppButton from "../../components/AppButton";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import { useAuthStore } from "../../store/authStore";
import client from "../../api/client";

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  { id: "account", label: "Account", icon: "person-outline" },
  { id: "profile", label: "Profile", icon: "construct-outline" },
  { id: "category", label: "Category", icon: "pricetag-outline" },
  { id: "pricing", label: "Pricing", icon: "cash-outline" },
];

const CURRENCIES = [
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
            {/* Dot */}
            <View style={si.dotWrap}>
              <View
                style={[
                  si.dot,
                  {
                    backgroundColor: done || active ? c.orange : "transparent",
                    borderColor: done || active ? c.orange : c.textMuted,
                    borderWidth: 2,
                  },
                ]}
              >
                {done ? (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                ) : (
                  <Ionicons
                    name={step.icon}
                    size={14}
                    color={active ? "#fff" : c.textMuted}
                  />
                )}
              </View>
              <AppText
                variant="small"
                style={{
                  color: done || active ? c.text : c.textMuted,
                  marginTop: 6,
                  fontSize: 11,
                }}
              >
                {step.label}
              </AppText>
            </View>

            {/* Connector line */}
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

// ─── Step 0: Account ─────────────────────────────────────────────────────────

function Step0Account({ form, setForm, errors, c, t }) {
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <View style={s.stepWrap}>
      <AppText variant="title" weight="semibold" style={s.stepTitle}>
        {t("workerReg.createAccount")}
      </AppText>

      <View style={s.row2}>
        <View style={{ flex: 1 }}>
          <AppInput
            label={`${t("auth.firstName")} *`}
            placeholder="John"
            value={form.firstName}
            onChangeText={set("firstName")}
            autoCapitalize="words"
            iconLeft="person-outline"
            error={errors.firstName}
          />
        </View>
        <View style={{ flex: 1 }}>
          <AppInput
            label={`${t("auth.lastName")} *`}
            placeholder="Doe"
            value={form.lastName}
            onChangeText={set("lastName")}
            autoCapitalize="words"
            error={errors.lastName}
          />
        </View>
      </View>

      <AppInput
        label={`${t("auth.emailAddress")} *`}
        placeholder="you@example.com"
        value={form.email}
        onChangeText={set("email")}
        keyboardType="email-address"
        autoComplete="email"
        iconLeft="mail-outline"
        error={errors.email}
      />

      <AppInput
        label={t("auth.phone")}
        placeholder="+234..."
        value={form.phone}
        onChangeText={set("phone")}
        keyboardType="phone-pad"
        iconLeft="call-outline"
      />

      <View style={s.row2}>
        <View style={{ flex: 1 }}>
          <AppInput
            label={t("auth.country")}
            placeholder="Nigeria"
            value={form.country}
            onChangeText={set("country")}
            autoCapitalize="words"
            iconLeft="globe-outline"
          />
        </View>
        <View style={{ flex: 1 }}>
          <AppInput
            label={t("auth.city")}
            placeholder="Lagos"
            value={form.city}
            onChangeText={set("city")}
            autoCapitalize="words"
            iconLeft="location-outline"
          />
        </View>
      </View>

      <AppInput
        label={`${t("auth.password")} * (${t("workerReg.min8")})`}
        placeholder="••••••••"
        value={form.password}
        onChangeText={set("password")}
        secureTextEntry
        iconLeft="lock-closed-outline"
        error={errors.password}
      />

      <AppInput
        label={`${t("auth.confirm")} *`}
        placeholder="••••••••"
        value={form.confirm}
        onChangeText={set("confirm")}
        secureTextEntry
        iconLeft="lock-closed-outline"
        error={errors.confirm}
      />
    </View>
  );
}

// ─── Step 1: Professional Profile ────────────────────────────────────────────

function Step1Profile({ form, setForm, errors, c, t }) {
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <View style={s.stepWrap}>
      <AppText variant="title" weight="semibold" style={s.stepTitle}>
        {t("workerReg.yourProfile")}
      </AppText>

      <AppInput
        label={`${t("workerReg.professionalTitle")} *`}
        placeholder={t("workerReg.professionalTitlePlaceholder")}
        value={form.title}
        onChangeText={set("title")}
        iconLeft="briefcase-outline"
        error={errors.title}
      />

      <View>
        <AppText
          variant="small"
          weight="semibold"
          style={{ marginBottom: 8, letterSpacing: 0.6, fontSize: 11 }}
        >
          {t("workerReg.description")} *
        </AppText>
        <View
          style={[
            s.textarea,
            {
              borderColor: errors.description ? c.red : c.border,
              backgroundColor: c.bgInput,
            },
          ]}
        >
          <TextInput
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            placeholder={t("workerReg.descriptionPlaceholder")}
            placeholderTextColor={c.textMuted}
            value={form.description}
            onChangeText={set("description")}
            style={{ color: c.text, fontSize: 15, lineHeight: 22 }}
          />
        </View>
        {errors.description ? (
          <AppText variant="small" tone="danger" style={{ marginTop: 4 }}>
            {errors.description}
          </AppText>
        ) : null}
      </View>

      <View style={s.row2}>
        <View style={{ flex: 1 }}>
          <AppInput
            label={t("workerReg.yearsExperience")}
            placeholder="0"
            value={form.yearsExperience}
            onChangeText={set("yearsExperience")}
            keyboardType="number-pad"
            iconLeft="trophy-outline"
          />
        </View>
        <View style={{ flex: 1 }}>
          <AppInput
            label={t("workerReg.serviceRadius")}
            placeholder="25"
            value={form.serviceRadius}
            onChangeText={set("serviceRadius")}
            keyboardType="number-pad"
            iconLeft="radio-outline"
          />
        </View>
      </View>
    </View>
  );
}

// ─── Step 2: Categories ───────────────────────────────────────────────────────

function Step2Category({
  categories,
  catLoading,
  selectedCats,
  primaryCatId,
  setPrimaryCatId,
  onToggleCat,
  onAddCustom,
  errors,
  c,
  t,
}) {
  const [search, setSearch] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [adding, setAdding] = useState(false);

  const filtered = categories.filter(
    (cat) => !search || cat.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleAddCustom = async () => {
    if (!customName.trim()) return;
    setAdding(true);
    await onAddCustom(customName.trim());
    setCustomName("");
    setShowCustom(false);
    setAdding(false);
  };

  return (
    <View style={s.stepWrap}>
      <AppText variant="title" weight="semibold" style={s.stepTitle}>
        {t("workerReg.yourCategories")}
      </AppText>
      <AppText variant="small" tone="dim" style={{ marginBottom: 14 }}>
        {t("workerReg.categoriesHint")}
      </AppText>

      {/* Selected chips */}
      {selectedCats.length > 0 && (
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 12,
          }}
        >
          {selectedCats.map((cat) => {
            const isPrimary = cat.id === primaryCatId;
            return (
              <View
                key={cat.id}
                style={[
                  s.selectedChip,
                  {
                    backgroundColor: isPrimary ? c.orange : c.bgCard,
                    borderColor: isPrimary ? c.orange : c.border,
                  },
                ]}
              >
                <AppText
                  variant="small"
                  weight="semibold"
                  style={{ color: isPrimary ? "#fff" : c.text }}
                >
                  {cat.icon ? `${cat.icon} ` : ""}
                  {cat.name}
                </AppText>
                {/* Set primary */}
                <Pressable
                  onPress={() => setPrimaryCatId(cat.id)}
                  hitSlop={6}
                  style={{ marginLeft: 6 }}
                >
                  <Ionicons
                    name={isPrimary ? "star" : "star-outline"}
                    size={13}
                    color={isPrimary ? "#fff" : c.orange}
                  />
                </Pressable>
                {/* Remove */}
                <Pressable
                  onPress={() => onToggleCat(cat)}
                  hitSlop={6}
                  style={{ marginLeft: 4 }}
                >
                  <Ionicons
                    name="close"
                    size={13}
                    color={isPrimary ? "#fff" : c.textMuted}
                  />
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      {/* Search input */}
      <View
        style={[
          s.searchBox,
          { backgroundColor: c.bgInput, borderColor: c.border },
        ]}
      >
        <Ionicons name="search-outline" size={16} color={c.textMuted} />
        <TextInput
          placeholder={t("workerReg.searchCategories")}
          placeholderTextColor={c.textMuted}
          value={search}
          onChangeText={setSearch}
          style={{ flex: 1, color: c.text, marginLeft: 8, fontSize: 15 }}
        />
        {search ? (
          <Pressable onPress={() => setSearch("")} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={c.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {errors.categories ? (
        <AppText variant="small" tone="danger" style={{ marginBottom: 8 }}>
          {errors.categories}
        </AppText>
      ) : null}

      {/* Category chips grid */}
      {catLoading ? (
        <View style={{ paddingVertical: 32, alignItems: "center" }}>
          <ActivityIndicator color={c.orange} />
        </View>
      ) : (
        <View style={s.catGrid}>
          {filtered.slice(0, 80).map((cat) => {
            const selected = !!selectedCats.find((s) => s.id === cat.id);
            return (
              <Pressable
                key={cat.id}
                onPress={() => onToggleCat(cat)}
                style={[
                  s.catChip,
                  {
                    backgroundColor: selected ? c.orangeDim : c.bgCard,
                    borderColor: selected ? c.orange : c.border,
                  },
                ]}
              >
                {cat.icon ? (
                  <AppText style={{ fontSize: 13, marginRight: 4 }}>
                    {cat.icon}
                  </AppText>
                ) : null}
                <AppText
                  variant="small"
                  weight={selected ? "semibold" : "regular"}
                  style={{ color: selected ? c.orange : c.text }}
                  numberOfLines={1}
                >
                  {cat.name}
                </AppText>
                {selected && (
                  <Ionicons
                    name="checkmark"
                    size={12}
                    color={c.orange}
                    style={{ marginLeft: 4 }}
                  />
                )}
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Add custom category */}
      {!showCustom ? (
        <Pressable
          onPress={() => setShowCustom(true)}
          style={[s.addCatBtn, { borderColor: c.border }]}
        >
          <Ionicons name="add-circle-outline" size={16} color={c.orange} />
          <AppText
            variant="small"
            weight="semibold"
            style={{ color: c.orange, marginLeft: 6 }}
          >
            {t("workerReg.addCustomCategory")}
          </AppText>
        </Pressable>
      ) : (
        <View
          style={[
            s.customCatBox,
            { backgroundColor: c.bgCard, borderColor: c.border },
          ]}
        >
          <View
            style={[
              s.searchBox,
              {
                backgroundColor: c.bgInput,
                borderColor: c.orange,
                marginBottom: 10,
              },
            ]}
          >
            <Ionicons name="pricetag-outline" size={16} color={c.orange} />
            <TextInput
              autoFocus
              placeholder={t("workerReg.customCategoryPlaceholder")}
              placeholderTextColor={c.textMuted}
              value={customName}
              onChangeText={setCustomName}
              onSubmitEditing={handleAddCustom}
              style={{ flex: 1, color: c.text, marginLeft: 8, fontSize: 15 }}
            />
          </View>
          <View style={s.row2}>
            <Pressable
              onPress={handleAddCustom}
              disabled={adding || !customName.trim()}
              style={[
                s.customBtn,
                {
                  backgroundColor:
                    adding || !customName.trim() ? c.bgInput : c.orange,
                  flex: 1,
                },
              ]}
            >
              {adding ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <AppText
                  variant="small"
                  weight="semibold"
                  style={{ color: "#fff" }}
                >
                  {t("workerReg.addCategory")}
                </AppText>
              )}
            </Pressable>
            <Pressable
              onPress={() => {
                setShowCustom(false);
                setCustomName("");
              }}
              style={[
                s.customBtn,
                {
                  backgroundColor: c.bgCard,
                  borderColor: c.border,
                  borderWidth: 1,
                  flex: 1,
                },
              ]}
            >
              <AppText variant="small" weight="semibold" tone="dim">
                {t("common.cancel")}
              </AppText>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Currency Picker Modal ────────────────────────────────────────────────────

function CurrencyModal({ visible, selected, onSelect, onClose, c, modalBg }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable
          style={[
            s.sheet,
            { backgroundColor: modalBg, borderTopColor: c.border },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[s.sheetHandle, { backgroundColor: c.border }]} />
          <AppText
            variant="title"
            weight="semibold"
            style={{ paddingHorizontal: 20, marginBottom: 12, color: c.text }}
          >
            Select Currency
          </AppText>
          <FlatList
            data={CURRENCIES}
            keyExtractor={(item) => item}
            style={{ maxHeight: 360 }}
            renderItem={({ item }) => {
              const sel = item === selected;
              return (
                <Pressable
                  onPress={() => {
                    onSelect(item);
                    onClose();
                  }}
                  style={[
                    s.currencyRow,
                    {
                      borderBottomColor: c.border,
                      backgroundColor: sel ? `${c.orange}15` : "transparent",
                    },
                  ]}
                >
                  <AppText
                    variant="body"
                    weight={sel ? "semibold" : "regular"}
                    style={{ color: sel ? c.orange : c.text }}
                  >
                    {item}
                  </AppText>
                  {sel && (
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color={c.orange}
                    />
                  )}
                </Pressable>
              );
            }}
          />
          <View style={{ height: 20 }} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Rate Input ───────────────────────────────────────────────────────────────

function RateInput({ label, suffix, value, onChange, c }) {
  return (
    <View style={{ flex: 1 }}>
      <AppText
        variant="small"
        weight="semibold"
        style={{
          color: c.textMuted,
          letterSpacing: 0.6,
          fontSize: 11,
          marginBottom: 6,
        }}
      >
        {label}
      </AppText>
      <View
        style={[
          s.rateBox,
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
        <AppText variant="small" tone="dim">
          {suffix}
        </AppText>
      </View>
    </View>
  );
}

// ─── Step 3: Pricing ─────────────────────────────────────────────────────────

function Step3Pricing({ form, setForm, agreed, setAgreed, errors, c, t }) {
  const [showCurrency, setShowCurrency] = useState(false);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const modalBg = "#111118";

  const hasRate =
    form.hourlyRate ||
    form.dailyRate ||
    form.weeklyRate ||
    form.monthlyRate ||
    form.customRate;

  return (
    <View style={s.stepWrap}>
      <AppText variant="title" weight="semibold" style={s.stepTitle}>
        {t("workerReg.setYourRates")}
      </AppText>
      <AppText variant="small" tone="dim" style={{ marginBottom: 16 }}>
        {t("workerReg.ratesNote")}
      </AppText>

      {/* Currency picker */}
      <AppText
        variant="small"
        weight="semibold"
        style={{
          color: c.textMuted,
          letterSpacing: 0.6,
          fontSize: 11,
          marginBottom: 6,
        }}
      >
        {t("workerReg.currency")}
      </AppText>
      <Pressable
        onPress={() => setShowCurrency(true)}
        style={[
          s.currencyPicker,
          { backgroundColor: c.bgInput, borderColor: c.border },
        ]}
      >
        <AppText variant="body" style={{ flex: 1, color: c.text }}>
          {form.currency}
        </AppText>
        <Ionicons name="chevron-down" size={16} color={c.textMuted} />
      </Pressable>

      {/* Rate grid */}
      <View style={[s.row2, { marginTop: 14 }]}>
        <RateInput
          label={`⏱ ${t("workerReg.hourlyRate")}`}
          suffix="/hr"
          value={form.hourlyRate}
          onChange={set("hourlyRate")}
          c={c}
        />
        <RateInput
          label={`📅 ${t("workerReg.dailyRate")}`}
          suffix="/day"
          value={form.dailyRate}
          onChange={set("dailyRate")}
          c={c}
        />
      </View>
      <View style={[s.row2, { marginTop: 10 }]}>
        <RateInput
          label={`📆 ${t("workerReg.weeklyRate")}`}
          suffix="/wk"
          value={form.weeklyRate}
          onChange={set("weeklyRate")}
          c={c}
        />
        <RateInput
          label={`🗓 ${t("workerReg.monthlyRate")}`}
          suffix="/mo"
          value={form.monthlyRate}
          onChange={set("monthlyRate")}
          c={c}
        />
      </View>

      {/* Divider */}
      <View style={[s.divider, { borderTopColor: c.border }]}>
        <AppText
          variant="small"
          weight="semibold"
          style={{ color: c.textMuted, letterSpacing: 0.8, fontSize: 10 }}
        >
          {t("workerReg.customRate").toUpperCase()}
        </AppText>
      </View>

      <View style={s.row2}>
        <View style={{ flex: 1 }}>
          <AppInput
            label={t("workerReg.customRateAmount")}
            placeholder="0.00"
            value={form.customRate}
            onChangeText={set("customRate")}
            keyboardType="decimal-pad"
            iconLeft="create-outline"
          />
        </View>
        <View style={{ flex: 1 }}>
          <AppInput
            label={t("workerReg.customRateLabel")}
            placeholder={t("workerReg.customRateLabelPlaceholder")}
            value={form.customRateLabel}
            onChangeText={set("customRateLabel")}
            iconLeft="text-outline"
          />
        </View>
      </View>

      {/* Pricing note */}
      <AppText
        variant="small"
        weight="semibold"
        style={{
          color: c.textMuted,
          letterSpacing: 0.6,
          fontSize: 11,
          marginBottom: 6,
        }}
      >
        {t("workerReg.pricingNote")}
      </AppText>
      <View
        style={[
          s.textarea,
          { borderColor: c.border, backgroundColor: c.bgInput, minHeight: 80 },
        ]}
      >
        <TextInput
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          placeholder={t("workerReg.pricingNotePlaceholder")}
          placeholderTextColor={c.textMuted}
          value={form.pricingNote}
          onChangeText={set("pricingNote")}
          style={{ color: c.text, fontSize: 15, lineHeight: 22 }}
        />
      </View>

      {/* Rate preview */}
      {hasRate && (
        <View
          style={[
            s.previewBox,
            { backgroundColor: c.bgCard, borderColor: c.border },
          ]}
        >
          <AppText
            variant="small"
            weight="semibold"
            tone="dim"
            style={{ marginBottom: 8 }}
          >
            {t("workerReg.ratesPreview").toUpperCase()}
          </AppText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {form.hourlyRate ? (
              <View
                style={[
                  s.previewPill,
                  { backgroundColor: c.orangeDim, borderColor: c.orange },
                ]}
              >
                <AppText
                  variant="small"
                  weight="semibold"
                  style={{ color: c.orange }}
                >
                  {form.currency} {form.hourlyRate}/hr
                </AppText>
              </View>
            ) : null}
            {form.dailyRate ? (
              <View
                style={[
                  s.previewPill,
                  { backgroundColor: c.orangeDim, borderColor: c.orange },
                ]}
              >
                <AppText
                  variant="small"
                  weight="semibold"
                  style={{ color: c.orange }}
                >
                  {form.currency} {form.dailyRate}/day
                </AppText>
              </View>
            ) : null}
            {form.weeklyRate ? (
              <View
                style={[
                  s.previewPill,
                  { backgroundColor: c.orangeDim, borderColor: c.orange },
                ]}
              >
                <AppText
                  variant="small"
                  weight="semibold"
                  style={{ color: c.orange }}
                >
                  {form.currency} {form.weeklyRate}/wk
                </AppText>
              </View>
            ) : null}
            {form.monthlyRate ? (
              <View
                style={[
                  s.previewPill,
                  { backgroundColor: c.orangeDim, borderColor: c.orange },
                ]}
              >
                <AppText
                  variant="small"
                  weight="semibold"
                  style={{ color: c.orange }}
                >
                  {form.currency} {form.monthlyRate}/mo
                </AppText>
              </View>
            ) : null}
            {form.customRate ? (
              <View
                style={[
                  s.previewPill,
                  { backgroundColor: c.orangeDim, borderColor: c.orange },
                ]}
              >
                <AppText
                  variant="small"
                  weight="semibold"
                  style={{ color: c.orange }}
                >
                  {form.currency} {form.customRate}
                  {form.customRateLabel
                    ? `/${form.customRateLabel}`
                    : "/custom"}
                </AppText>
              </View>
            ) : null}
          </View>
        </View>
      )}

      {errors.pricing ? (
        <AppText variant="small" tone="danger">
          {errors.pricing}
        </AppText>
      ) : null}

      {/* Terms */}
      <Pressable
        onPress={() => setAgreed((a) => !a)}
        style={s.agreeRow}
        hitSlop={6}
      >
        <View
          style={[
            s.checkbox,
            {
              borderColor: agreed ? c.orange : c.border,
              backgroundColor: agreed ? c.orange : "transparent",
            },
          ]}
        >
          {agreed ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
        </View>
        <AppText variant="small" tone="dim" style={{ flex: 1 }}>
          {t("auth.agreeToTerms")}{" "}
          <AppText variant="small" tone="brand" weight="semibold">
            {t("auth.terms")}
          </AppText>
          {"  "}
          {t("auth.and")}{" "}
          <AppText variant="small" tone="brand" weight="semibold">
            {t("auth.privacyPolicy")}
          </AppText>
        </AppText>
      </Pressable>

      <CurrencyModal
        visible={showCurrency}
        selected={form.currency}
        onSelect={(c) => set("currency")(c)}
        onClose={() => setShowCurrency(false)}
        c={c}
        modalBg={modalBg}
      />
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function WorkerRegisterScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { toast } = useToast();
  const { register, isLoading } = useAuthStore();
  const c = theme.colors;

  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [agreed, setAgreed] = useState(false);

  // Categories
  const [categories, setCategories] = useState([]);
  const [catLoading, setCatLoading] = useState(true);
  const [selectedCats, setSelectedCats] = useState([]);
  const [primaryCatId, setPrimaryCatId] = useState("");

  // Form state — Step 0
  const [account, setAccount] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    country: "",
    city: "",
    password: "",
    confirm: "",
  });

  // Form state — Step 1
  const [profile, setProfile] = useState({
    title: "",
    description: "",
    yearsExperience: "",
    serviceRadius: "25",
  });

  // Form state — Step 3
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

  // Load categories on mount
  useEffect(() => {
    client
      .get("/categories", { params: { limit: 1000 } })
      .then((r) => {
        const data = r.data.data;
        setCategories(Array.isArray(data) ? data : (data?.categories ?? []));
      })
      .catch(() => {})
      .finally(() => setCatLoading(false));
  }, []);

  const toggleCat = (cat) => {
    setSelectedCats((prev) => {
      const exists = prev.find((c) => c.id === cat.id);
      if (exists) {
        const next = prev.filter((c) => c.id !== cat.id);
        if (primaryCatId === cat.id) setPrimaryCatId(next[0]?.id ?? "");
        return next;
      }
      if (prev.length >= 5) {
        toast.warning(t("workerReg.maxCategories"));
        return prev;
      }
      const next = [...prev, cat];
      if (!primaryCatId) setPrimaryCatId(cat.id);
      return next;
    });
  };

  const addCustomCategory = async (name) => {
    try {
      const res = await client.post("/categories/suggest", { name });
      const cat = res.data.data.category;
      setCategories((prev) =>
        prev.find((c) => c.id === cat.id) ? prev : [...prev, cat],
      );
      toggleCat(cat);
    } catch {
      toast.error(t("workerReg.addCategoryFailed"));
    }
  };

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (step === 0) {
      if (!account.firstName.trim()) e.firstName = t("auth.fillAllFields");
      if (!account.lastName.trim()) e.lastName = t("auth.fillAllFields");
      if (!account.email.trim()) e.email = t("auth.emailRequired");
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.email))
        e.email = t("auth.validEmailRequired");
      if (account.password.length < 8) e.password = t("auth.passwordTooShort");
      if (account.password !== account.confirm)
        e.confirm = t("auth.passwordsDontMatch");
    }
    if (step === 1) {
      if (!profile.title.trim()) e.title = t("workerReg.titleRequired");
      if (!profile.description.trim())
        e.description = t("workerReg.descriptionRequired");
    }
    if (step === 2) {
      if (selectedCats.length === 0)
        e.categories = t("workerReg.categoriesRequired");
    }
    if (step === 3) {
      const hasRate =
        pricing.hourlyRate ||
        pricing.dailyRate ||
        pricing.weeklyRate ||
        pricing.monthlyRate ||
        pricing.customRate;
      if (!hasRate) e.pricing = t("workerReg.rateRequired");
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (!validate()) return;
    setErrors({});
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    setErrors({});
    setStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (!agreed) {
      toast.warning(t("auth.mustAgreeTerms"));
      return;
    }

    try {
      await register({
        firstName: account.firstName.trim(),
        lastName: account.lastName.trim(),
        email: account.email.trim().toLowerCase(),
        phone: account.phone.trim() || undefined,
        country: account.country.trim() || undefined,
        city: account.city.trim() || undefined,
        password: account.password,
        role: "WORKER",
        workerProfile: {
          title: profile.title.trim(),
          description: profile.description.trim(),
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
      });
      toast.success(t("auth.registerSuccess"));
      // RootNavigator picks up the new user automatically
    } catch (err) {
      toast.error(err.message);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <AppScreen>
      {/* Back */}
      <Pressable
        onPress={step === 0 ? () => navigation.goBack() : handleBack}
        style={s.backRow}
        hitSlop={6}
      >
        <Ionicons name="arrow-back" size={20} color={c.text} />
        <AppText variant="body" weight="medium" style={{ marginLeft: 8 }}>
          {t("common.back")}
        </AppText>
      </Pressable>

      {/* Hero */}
      <AppText
        variant="label"
        tone="brand"
        style={{ marginTop: 8, letterSpacing: 1.2 }}
      >
        {t("workerReg.workerAccount").toUpperCase()}
      </AppText>
      <AppText variant="display" weight="displayBlack" style={s.heroTitle}>
        {t("workerReg.startEarning")}
      </AppText>
      <AppText variant="body" tone="dim" style={{ marginBottom: 24 }}>
        {t("workerReg.startEarningSubtitle")}
      </AppText>

      {/* Step indicator */}
      <StepIndicator current={step} c={c} />

      {/* Step content */}
      <View
        style={[s.card, { backgroundColor: c.bgCard, borderColor: c.border }]}
      >
        {step === 0 && (
          <Step0Account
            form={account}
            setForm={setAccount}
            errors={errors}
            c={c}
            t={t}
          />
        )}
        {step === 1 && (
          <Step1Profile
            form={profile}
            setForm={setProfile}
            errors={errors}
            c={c}
            t={t}
          />
        )}
        {step === 2 && (
          <Step2Category
            categories={categories}
            catLoading={catLoading}
            selectedCats={selectedCats}
            primaryCatId={primaryCatId}
            setPrimaryCatId={setPrimaryCatId}
            onToggleCat={toggleCat}
            onAddCustom={addCustomCategory}
            errors={errors}
            c={c}
            t={t}
          />
        )}
        {step === 3 && (
          <Step3Pricing
            form={pricing}
            setForm={setPricing}
            agreed={agreed}
            setAgreed={setAgreed}
            errors={errors}
            c={c}
            t={t}
          />
        )}

        {/* Navigation buttons */}
        <View style={s.navRow}>
          {step > 0 && (
            <Pressable
              onPress={handleBack}
              style={[s.backBtn2, { borderColor: c.border }]}
            >
              <Ionicons
                name="arrow-back"
                size={16}
                color={c.text}
                style={{ marginRight: 6 }}
              />
              <AppText variant="body" weight="semibold">
                {t("common.back")}
              </AppText>
            </Pressable>
          )}
          {step < STEPS.length - 1 ? (
            <Pressable
              onPress={handleNext}
              style={[
                s.continueBtn,
                { backgroundColor: c.orange, flex: step > 0 ? 1 : undefined },
              ]}
            >
              <AppText
                variant="body"
                weight="semibold"
                style={{ color: "#fff" }}
              >
                {t("workerReg.continue")}
              </AppText>
              <Ionicons
                name="arrow-forward"
                size={16}
                color="#fff"
                style={{ marginLeft: 8 }}
              />
            </Pressable>
          ) : (
            <Pressable
              onPress={handleSubmit}
              disabled={isLoading}
              style={[
                s.continueBtn,
                {
                  backgroundColor: isLoading ? c.bgInput : c.orange,
                  flex: 1,
                  opacity: isLoading ? 0.7 : 1,
                },
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <AppText
                    variant="body"
                    weight="semibold"
                    style={{ color: "#fff" }}
                  >
                    🚀 {t("workerReg.createAccount")}
                  </AppText>
                </>
              )}
            </Pressable>
          )}
        </View>
      </View>

      {/* Footer links */}
      <View style={s.footerRow}>
        <AppText variant="body" tone="dim">
          {t("auth.alreadyHaveAccount")}{" "}
        </AppText>
        <Pressable onPress={() => navigation.navigate("Login")} hitSlop={6}>
          <AppText variant="body" tone="brand" weight="semibold">
            {t("auth.signIn")}
          </AppText>
        </Pressable>
      </View>
      <View style={[s.footerRow, { marginTop: 8 }]}>
        <AppText variant="body" tone="dim">
          {t("workerReg.hiringSomeone")}{" "}
        </AppText>
        <Pressable onPress={() => navigation.navigate("Register")} hitSlop={6}>
          <AppText variant="body" tone="brand" weight="semibold">
            {t("workerReg.registerAsHirer")}
          </AppText>
        </Pressable>
      </View>
    </AppScreen>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const si = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  dotWrap: { alignItems: "center", zIndex: 1 },
  dot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  line: {
    flex: 1,
    height: 2,
    marginTop: 17,
    marginHorizontal: -2,
  },
});

const s = StyleSheet.create({
  backRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  heroTitle: { marginTop: 4, marginBottom: 4 },

  // Card
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginTop: 4,
    marginBottom: 20,
  },
  stepWrap: { gap: 14 },
  stepTitle: { marginBottom: 4 },

  // Inputs
  row2: { flexDirection: "row", gap: 12 },
  textarea: { borderWidth: 1.5, borderRadius: 12, padding: 14, minHeight: 110 },

  // Categories
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  selectedChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  addCatBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  customCatBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginTop: 8,
    gap: 8,
  },
  customBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  // Pricing
  currencyPicker: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
  },
  rateBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 14,
    marginTop: 4,
    alignItems: "center",
  },
  previewBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  previewPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },

  // Terms
  agreeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },

  // Navigation
  navRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  backBtn2: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
  },
  continueBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
  },

  // Footer
  footerRow: { flexDirection: "row", justifyContent: "center" },

  // Currency modal
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
    maxHeight: "60%",
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12,
  },
  currencyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
