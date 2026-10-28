// src/screens/main/EditProfileScreen.js
import React, { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";

import AppScreen from "../../components/AppScreen";
import AppText from "../../components/AppText";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuthStore } from "../../store/authStore";
import client from "../../api/client";
import { FaSave, FaArrowLeft } from "../../icons/fa";

const CURRENCIES = ["NGN", "USD", "GBP", "EUR", "GHS", "KES", "ZAR"];
const LANGUAGES = ["English", "French", "Yoruba", "Igbo", "Hausa", "Arabic", "Swahili"];

export default function EditProfileScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { user: me, updateUser } = useAuthStore();
  const c = theme.colors;

  const [form, setForm] = useState({
    firstName: me?.firstName ?? "",
    lastName: me?.lastName ?? "",
    bio: me?.bio ?? "",
    phone: me?.phone ?? "",
    country: me?.country ?? "",
    city: me?.city ?? "",
    state: me?.state ?? "",
    address: me?.address ?? "",
    currency: me?.currency ?? "NGN",
    language: me?.language ?? "English",
  });

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await client.put("/users/me", form);
      updateUser?.(data.data.user);
      navigation.goBack();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Update failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = () => {
    Alert.alert(
      "Deactivate Account",
      "Are you sure you want to deactivate? Your profile will be hidden.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Deactivate",
          style: "destructive",
          onPress: async () => {
            try {
              await client.delete("/users/me");
              updateUser?.(null);
              navigation.reset({ index: 0, routes: [{ name: "Login" }] });
            } catch {
              Alert.alert("Error", "Could not deactivate account.");
            }
          },
        },
      ]
    );
  };

  return (
    <AppScreen contentContainerStyle={{ paddingBottom: 40 }}>
      <Pressable onPress={() => navigation.goBack()} style={styles.topBack}>
        <FaArrowLeft size={12} color={c.textDim} />
        <AppText style={{ fontSize: 12, color: c.textDim, marginLeft: 6 }}>Cancel</AppText>
      </Pressable>

      <AppText style={styles.title(c)}>Profile Settings</AppText>

      <View style={[styles.section, { backgroundColor: c.bgPanel, borderColor: c.border }]}>
        <AppText style={styles.sectionTitle(c)}>Personal Info</AppText>
        <Field label="First Name" value={form.firstName} onChange={(v) => setForm(f => ({ ...f, firstName: v }))} c={c} />
        <Field label="Last Name" value={form.lastName} onChange={(v) => setForm(f => ({ ...f, lastName: v }))} c={c} />
        <Field label="Bio" value={form.bio} onChange={(v) => setForm(f => ({ ...f, bio: v }))} multiline c={c} />
        <Field label="Phone" value={form.phone} onChange={(v) => setForm(f => ({ ...f, phone: v }))} c={c} />
      </View>

      <View style={[styles.section, { backgroundColor: c.bgPanel, borderColor: c.border }]}>
        <AppText style={styles.sectionTitle(c)}>Location</AppText>
        <Field label="Country" value={form.country} onChange={(v) => setForm(f => ({ ...f, country: v }))} c={c} />
        <Field label="City" value={form.city} onChange={(v) => setForm(f => ({ ...f, city: v }))} c={c} />
        <Field label="Address" value={form.address} onChange={(v) => setForm(f => ({ ...f, address: v }))} c={c} />
      </View>

      <View style={[styles.section, { backgroundColor: c.bgPanel, borderColor: c.border }]}>
        <AppText style={styles.sectionTitle(c)}>Preferences</AppText>
        <AppText style={styles.label(c)}>Currency</AppText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 12 }}>
          {CURRENCIES.map((cur) => (
            <Pressable
              key={cur}
              onPress={() => setForm((f) => ({ ...f, currency: cur }))}
              style={[styles.pill, { backgroundColor: form.currency === cur ? c.orangeDim : c.bgCard, borderColor: form.currency === cur ? c.orange : c.border }]}
            >
              <AppText style={{ fontSize: 12, fontWeight: "600", color: form.currency === cur ? c.orange : c.textDim }}>{cur}</AppText>
            </Pressable>
          ))}
        </ScrollView>

        <AppText style={styles.label(c)}>Language</AppText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {LANGUAGES.map((lang) => (
            <Pressable
              key={lang}
              onPress={() => setForm((f) => ({ ...f, language: lang }))}
              style={[styles.pill, { backgroundColor: form.language === lang ? c.orangeDim : c.bgCard, borderColor: form.language === lang ? c.orange : c.border }]}
            >
              <AppText style={{ fontSize: 12, fontWeight: "600", color: form.language === lang ? c.orange : c.textDim }}>{lang}</AppText>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <Pressable
        onPress={handleSave}
        disabled={saving}
        style={({ pressed }) => [
          styles.saveBtn,
          { backgroundColor: c.orange, opacity: saving ? 0.6 : pressed ? 0.9 : 1 },
        ]}
      >
        <FaSave size={14} color={c.bg} />
        <AppText style={styles.saveBtnText(c)}>{saving ? "Saving..." : "Save Changes"}</AppText>
      </Pressable>

      <View style={[styles.dangerBox, { borderColor: c.red, backgroundColor: c.redDim }]}>
        <View style={{ flex: 1 }}>
          <AppText style={styles.dangerTitle(c)}>Deactivate Account</AppText>
          <AppText style={styles.dangerSub(c)}>Your profile will be hidden and you won't receive new bookings.</AppText>
        </View>
        <Pressable onPress={handleDeactivate} style={[styles.dangerBtn, { backgroundColor: c.red }]}>
          <AppText style={styles.dangerBtnText}>Deactivate</AppText>
        </Pressable>
      </View>
    </AppScreen>
  );
}

function Field({ label, value, onChange, multiline, c }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <AppText style={styles.label(c)}>{label}</AppText>
      <TextInput
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        style={[styles.input, { backgroundColor: c.bgInput, borderColor: c.border, color: c.text, height: multiline ? 80 : 44 }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  topBack: { flexDirection: "row", alignItems: "center", paddingVertical: 6, marginBottom: 8 },
  title: (c) => ({ fontFamily: "Syne_800ExtraBold", fontSize: 22, fontWeight: "800", color: c.text, marginBottom: 16 }),
  section: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  sectionTitle: (c) => ({ fontSize: 10, fontWeight: "700", color: c.orange, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 12 }),
  label: (c) => ({ fontSize: 11, fontWeight: "600", color: c.textDim, marginBottom: 6 }),
  input: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, textAlignVertical: "top" },
  pill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 10, gap: 8, marginTop: 8 },
  saveBtnText: (c) => ({ fontSize: 14, fontWeight: "700", color: c.bg }),
  dangerBox: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 12, borderWidth: 1, marginTop: 24, gap: 12 },
  dangerTitle: (c) => ({ fontSize: 13, fontWeight: "700", color: c.red }),
  dangerSub: (c) => ({ fontSize: 11, color: c.textDim, marginTop: 2 }),
  dangerBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  dangerBtnText: { fontSize: 12, fontWeight: "700", color: "#fff" },
});
