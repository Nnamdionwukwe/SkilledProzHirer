// src/components/booking/EmergencyContact.js
//
// Verbatim port of components/booking/EmergencyContact.jsx.
//
// Renders only when:
//   · isWorker === true
//   · bookingStatus ∈ ["ACCEPTED", "IN_PROGRESS"]
//
// Two modes:
//   · Display — name / phone (tappable) / relationship, with Edit button
//   · Edit   — three TextInputs + Save button
//
// Endpoint: PATCH /bookings/:bookingId/emergency-contact
// Payload: { name, phone, relationship }
//
// Guards:
//   · Both name and phone are required (relationship optional)
//   · If `existing` prop updates, fields resync

import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";

import AppText from "../AppText";
import { useTheme } from "../../contexts/ThemeContext";
import client from "../../api/client";
import {
  FaUser,
  FaPhone,
  FaEdit,
  FaTimes,
  FaExclamationTriangle,
} from "../../icons/fa";

export default function EmergencyContact({
  bookingId,
  bookingStatus,
  isWorker,
  existing,
  onSaved,
}) {
  const { theme } = useTheme();
  const c = theme.colors;

  const [editing, setEditing] = useState(!existing);
  const [name, setName] = useState(existing?.name || "");
  const [phone, setPhone] = useState(existing?.phone || "");
  const [rel, setRel] = useState(existing?.relationship || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Sync form fields when `existing` prop updates
  useEffect(() => {
    if (existing) {
      setName(existing.name || "");
      setPhone(existing.phone || "");
      setRel(existing.relationship || "");
      setEditing(false);
    }
  }, [existing?.name, existing?.phone, existing?.relationship]);

  // ── Guards ──────────────────────────────────────────────────────────
  if (!isWorker) return null;
  if (!["ACCEPTED", "IN_PROGRESS"].includes(bookingStatus)) return null;

  // ── Save ────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!name.trim() || !phone.trim()) {
      setError("Name and phone are required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await client.patch(`/bookings/${bookingId}/emergency-contact`, {
        name: name.trim(),
        phone: phone.trim(),
        relationship: rel.trim(),
      });
      const saved = {
        name: name.trim(),
        phone: phone.trim(),
        relationship: rel.trim(),
      };
      onSaved?.(saved);
      setEditing(false);
    } catch (e) {
      setError(e?.response?.data?.message || "Save failed. Try again.");
    } finally {
      setSaving(false);
    }
  };

  // ═════════════════════════════════════════════════════════════════════
  // DISPLAY MODE — when we have an existing contact and user isn't editing
  // ═════════════════════════════════════════════════════════════════════
  if (!editing && existing) {
    return (
      <View
        style={[
          styles.card,
          { backgroundColor: c.bgCard, borderColor: c.border },
        ]}
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <FaUser size={14} color={c.orange} />
          <AppText style={[styles.cardTitle, { color: c.text }]}>
            Emergency Contact
          </AppText>
          <Pressable
            onPress={() => setEditing(true)}
            style={({ pressed }) => [
              styles.editBtn,
              {
                borderColor: c.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <FaEdit size={10} color={c.textDim} />
            <AppText
              style={{
                fontSize: 11,
                fontWeight: "600",
                color: c.textDim,
                marginLeft: 4,
              }}
            >
              Edit
            </AppText>
          </Pressable>
        </View>

        {/* Rows */}
        <ContactRow label="Name" value={existing.name} c={c} />
        <Pressable
          onPress={() =>
            existing.phone && Linking.openURL(`tel:${existing.phone}`)
          }
          style={styles.contactRow}
        >
          <AppText style={{ fontSize: 12, color: c.textMuted }}>Phone</AppText>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <FaPhone size={10} color={c.orange} />
            <AppText
              style={{ fontSize: 12, fontWeight: "600", color: c.orange }}
            >
              {existing.phone}
            </AppText>
          </View>
        </Pressable>
        {existing.relationship ? (
          <ContactRow
            label="Relationship"
            value={existing.relationship}
            c={c}
          />
        ) : null}
      </View>
    );
  }

  // ═════════════════════════════════════════════════════════════════════
  // EDIT MODE
  // ═════════════════════════════════════════════════════════════════════
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: c.bgCard, borderColor: c.border },
      ]}
    >
      {/* Header */}
      <View style={styles.cardHeader}>
        <FaUser size={14} color={c.orange} />
        <AppText style={[styles.cardTitle, { color: c.text }]}>
          Emergency Contact
        </AppText>
        {existing ? (
          <Pressable
            onPress={() => setEditing(false)}
            style={({ pressed }) => [
              styles.editBtn,
              {
                borderColor: c.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <FaTimes size={10} color={c.textDim} />
            <AppText
              style={{
                fontSize: 11,
                fontWeight: "600",
                color: c.textDim,
                marginLeft: 4,
              }}
            >
              Cancel
            </AppText>
          </Pressable>
        ) : null}
      </View>

      {/* Hint */}
      <AppText style={{ fontSize: 11, color: c.textMuted, lineHeight: 16 }}>
        Someone we can contact in case of an emergency during this job.
      </AppText>

      {/* Full Name */}
      <FieldInput
        label="Full Name *"
        value={name}
        onChangeText={(v) => {
          setName(v);
          setError("");
        }}
        placeholder="e.g. Amaka Johnson"
        c={c}
      />

      {/* Phone */}
      <FieldInput
        label="Phone Number *"
        value={phone}
        onChangeText={(v) => {
          setPhone(v);
          setError("");
        }}
        placeholder="e.g. +234 801 234 5678"
        keyboardType="phone-pad"
        c={c}
      />

      {/* Relationship */}
      <FieldInput
        label="Relationship"
        value={rel}
        onChangeText={setRel}
        placeholder="e.g. Sister, Friend, Spouse"
        c={c}
      />

      {/* Error */}
      {error ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            marginTop: 4,
          }}
        >
          <FaExclamationTriangle size={10} color={c.red} />
          <AppText style={{ fontSize: 11, color: c.red, flex: 1 }}>
            {error}
          </AppText>
        </View>
      ) : null}

      {/* Save button */}
      <Pressable
        onPress={handleSave}
        disabled={saving}
        style={({ pressed }) => [
          styles.saveBtn,
          {
            backgroundColor: saving ? c.bgInput : c.orange,
            opacity: saving ? 0.6 : pressed ? 0.9 : 1,
          },
        ]}
      >
        {saving ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <ActivityIndicator color="#fff" size="small" />
            <AppText style={{ fontSize: 13, fontWeight: "700", color: "#fff" }}>
              Saving…
            </AppText>
          </View>
        ) : (
          <AppText style={{ fontSize: 13, fontWeight: "700", color: "#fff" }}>
            {existing ? "Update Contact" : "Save Emergency Contact"}
          </AppText>
        )}
      </Pressable>
    </View>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────
function ContactRow({ label, value, c }) {
  return (
    <View style={styles.contactRow}>
      <AppText style={{ fontSize: 12, color: c.textMuted }}>{label}</AppText>
      <AppText
        style={{
          fontSize: 12,
          fontWeight: "600",
          color: c.text,
          flex: 1,
          textAlign: "right",
          marginLeft: 8,
        }}
        numberOfLines={2}
      >
        {value}
      </AppText>
    </View>
  );
}

function FieldInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  c,
}) {
  return (
    <View style={{ marginTop: 10 }}>
      <AppText
        style={{
          fontSize: 11,
          fontWeight: "600",
          color: c.textDim,
          marginBottom: 4,
        }}
      >
        {label}
      </AppText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.textMuted}
        keyboardType={keyboardType}
        autoCapitalize="words"
        style={[
          styles.input,
          {
            color: c.text,
            borderColor: c.border,
            backgroundColor: c.bgInput,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  contactRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 3,
  },
  input: {
    borderWidth: 1,
    borderRadius: 7,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
  },
  saveBtn: {
    marginTop: 8,
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: "center",
  },
});
