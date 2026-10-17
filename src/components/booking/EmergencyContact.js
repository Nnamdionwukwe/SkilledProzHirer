// src/components/booking/EmergencyContact.js
import React, { useState, useEffect } from "react";
import { View, TextInput, Pressable, Linking, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import {
  FaUser,
  FaPhone,
  FaEdit,
  FaTimes,
  FaExclamationTriangle,
  FaSpinner,
} from "../../icons/fa";

import AppText from "../AppText";
import { useTheme } from "../../contexts/ThemeContext";
import { updateEmergencyContact } from "../../api/bookings";

export default function EmergencyContact({
  bookingId,
  bookingStatus,
  isWorker,
  existing,
  onSaved,
}) {
  const { t } = useTranslation();
  const { theme: th } = useTheme();
  const c = th.colors;

  const [editing, setEditing] = useState(!existing);
  const [name, setName] = useState(existing?.name || "");
  const [phone, setPhone] = useState(existing?.phone || "");
  const [rel, setRel] = useState(existing?.relationship || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (existing) {
      setName(existing.name || "");
      setPhone(existing.phone || "");
      setRel(existing.relationship || "");
      setEditing(false);
    }
  }, [existing?.name, existing?.phone, existing?.relationship]);

  if (!isWorker) return null;
  if (!["ACCEPTED", "IN_PROGRESS"].includes(bookingStatus)) return null;

  const handleSave = async () => {
    if (!name.trim() || !phone.trim()) {
      return setError(t("booking.emergency.nameRequired"));
    }
    setSaving(true);
    setError("");
    try {
      await updateEmergencyContact(bookingId, {
        name: name.trim(),
        phone: phone.trim(),
        relationship: rel.trim(),
      });
      onSaved?.({
        name: name.trim(),
        phone: phone.trim(),
        relationship: rel.trim(),
      });
      setEditing(false);
    } catch (e) {
      setError(e?.response?.data?.message || t("booking.emergency.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  // Display mode
  if (!editing && existing) {
    return (
      <View
        style={[
          styles.card,
          { backgroundColor: c.bgCard, borderColor: c.border },
        ]}
      >
        <View style={styles.header}>
          <FaUser size={16} color={c.text} />
          <AppText weight="bold" style={{ flex: 1, marginLeft: 8 }}>
            {t("booking.emergency.title")}
          </AppText>
          <Pressable
            onPress={() => setEditing(true)}
            style={[styles.iconBtn, { borderColor: c.border }]}
          >
            <FaEdit size={11} color={c.textDim} />
            <AppText variant="small" tone="dim" style={{ marginLeft: 4 }}>
              {t("booking.emergency.edit")}
            </AppText>
          </Pressable>
        </View>
        <View style={styles.row}>
          <AppText variant="small" tone="dim">
            {t("booking.emergency.fullName")}
          </AppText>
          <AppText variant="small" weight="semibold">
            {existing.name}
          </AppText>
        </View>
        <View style={styles.row}>
          <AppText variant="small" tone="dim">
            {t("booking.emergency.phoneNumber")}
          </AppText>
          <Pressable
            onPress={() => Linking.openURL(`tel:${existing.phone}`)}
            style={{ flexDirection: "row", alignItems: "center" }}
          >
            <FaPhone size={10} color={c.orange} />
            <AppText
              variant="small"
              weight="semibold"
              style={{ color: c.orange, marginLeft: 4 }}
            >
              {existing.phone}
            </AppText>
          </Pressable>
        </View>
        {existing.relationship && (
          <View style={styles.row}>
            <AppText variant="small" tone="dim">
              {t("booking.emergency.relationship")}
            </AppText>
            <AppText variant="small" weight="semibold">
              {existing.relationship}
            </AppText>
          </View>
        )}
      </View>
    );
  }

  // Edit mode
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: c.bgCard, borderColor: c.border },
      ]}
    >
      <View style={styles.header}>
        <FaUser size={16} color={c.text} />
        <AppText weight="bold" style={{ flex: 1, marginLeft: 8 }}>
          {t("booking.emergency.title")}
        </AppText>
        {existing && (
          <Pressable
            onPress={() => setEditing(false)}
            style={[styles.iconBtn, { borderColor: c.border }]}
          >
            <FaTimes size={11} color={c.textDim} />
            <AppText variant="small" tone="dim" style={{ marginLeft: 4 }}>
              {t("booking.emergency.cancel")}
            </AppText>
          </Pressable>
        )}
      </View>
      <AppText variant="small" tone="dim" style={{ marginBottom: 8 }}>
        {t("booking.emergency.hint")}
      </AppText>

      <AppText variant="small" tone="dim" style={styles.label}>
        {t("booking.emergency.fullName")} *
      </AppText>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder={t("booking.emergency.namePlaceholder")}
        placeholderTextColor={c.textMuted}
        style={[
          styles.input,
          { backgroundColor: c.bgInput, borderColor: c.border, color: c.text },
        ]}
      />

      <AppText variant="small" tone="dim" style={styles.label}>
        {t("booking.emergency.phoneNumber")} *
      </AppText>
      <TextInput
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholder={t("booking.emergency.phonePlaceholder")}
        placeholderTextColor={c.textMuted}
        style={[
          styles.input,
          { backgroundColor: c.bgInput, borderColor: c.border, color: c.text },
        ]}
      />

      <AppText variant="small" tone="dim" style={styles.label}>
        {t("booking.emergency.relationship")}
      </AppText>
      <TextInput
        value={rel}
        onChangeText={setRel}
        placeholder={t("booking.emergency.relationshipPlaceholder")}
        placeholderTextColor={c.textMuted}
        style={[
          styles.input,
          { backgroundColor: c.bgInput, borderColor: c.border, color: c.text },
        ]}
      />

      {error ? (
        <View
          style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}
        >
          <FaExclamationTriangle size={11} color="#ef4444" />
          <AppText variant="small" style={{ color: "#ef4444", marginLeft: 4 }}>
            {error}
          </AppText>
        </View>
      ) : null}

      <Pressable
        onPress={handleSave}
        disabled={saving}
        style={[
          styles.saveBtn,
          { backgroundColor: c.orange, opacity: saving ? 0.5 : 1 },
        ]}
      >
        {saving ? <FaSpinner size={11} color={c.bg} /> : null}
        <AppText
          variant="small"
          weight="bold"
          style={{ color: c.bg, marginLeft: saving ? 6 : 0 }}
        >
          {saving
            ? t("booking.emergency.saving")
            : existing
              ? t("booking.emergency.update")
              : t("booking.emergency.save")}
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 12, borderWidth: 1, gap: 8 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  iconBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: { marginTop: 6, marginBottom: 4 },
  input: {
    borderRadius: 7,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 8,
  },
});
