// src/components/WithdrawalPinSection.js
// ─────────────────────────────────────────────────────────────────────────────
// Self-contained withdrawal PIN section for SettingsScreen.
// Drop into the Security tab — renders set/change/locked states automatically.
//
// Usage in SettingsScreen.js:
//   import WithdrawalPinSection from "../../components/WithdrawalPinSection";
//   then inside your security tab JSX: <WithdrawalPinSection />
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from "react-native";
import client from "../../../api/client";

import { settingsApi } from "../../../api/settings";

// ─────────────────────────────────────────────────────────────────────────────
// PIN BOXES — 4 individual digit boxes backed by a hidden TextInput
// ─────────────────────────────────────────────────────────────────────────────
function PinBoxes({ value, onChange, disabled, shake }) {
  const inputRef = useRef();
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Trigger shake animation when shake prop changes
  useEffect(() => {
    if (!shake) return;
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 8,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -8,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 6,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -6,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, [shake]);

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={() => !disabled && inputRef.current?.focus()}
      style={styles.pinBoxesWrap}
    >
      <Animated.View
        style={[styles.pinBoxes, { transform: [{ translateX: shakeAnim }] }]}
      >
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              styles.pinBox,
              value.length > i && styles.pinBoxFilled,
              value.length === i && styles.pinBoxActive,
              shake && styles.pinBoxError,
            ]}
          >
            <Text
              style={[styles.pinDot, value.length > i && styles.pinDotFilled]}
            >
              {value.length > i ? "●" : ""}
            </Text>
          </View>
        ))}
      </Animated.View>

      {/* Hidden input that receives keystrokes */}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(v) => onChange(v.replace(/\D/g, "").slice(0, 4))}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={4}
        editable={!disabled}
        style={styles.pinHiddenInput}
        autoComplete="off"
        caretHidden
      />
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function WithdrawalPinSection() {
  // PIN status from server
  const [status, setStatus] = useState(null); // { pinSet, isLocked, attemptsRemaining, lockedUntil }
  const [loadingStatus, setLoadingStatus] = useState(true);

  // Set PIN flow (first time)
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [setError, setSetError] = useState("");
  const [settingPin, setSettingPin] = useState(false);
  const [shakeConfirm, setShakeConfirm] = useState(false);

  // Change PIN flow
  const [showChange, setShowChange] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [changedNew, setChangedNew] = useState("");
  const [changeConfirm, setChangeConfirm] = useState("");
  const [changeError, setChangeError] = useState("");
  const [changing, setChanging] = useState(false);
  const [shakeCurrentPin, setShakeCurrentPin] = useState(false);
  const [shakeChangeConfirm, setShakeChangeConfirm] = useState(false);

  // Success flash
  const [successMsg, setSuccessMsg] = useState("");

  // ── Load status ──────────────────────────────────────────────────────────
  function loadStatus() {
    setLoadingStatus(true);
    settingsApi
      .getPinStatus()
      .then((data) => setStatus(data))
      .catch(() =>
        setStatus({ pinSet: false, isLocked: false, attemptsRemaining: 3 }),
      )
      .finally(() => setLoadingStatus(false));
  }

  useEffect(() => {
    loadStatus();
  }, []);

  function flashSuccess(msg) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  }

  function triggerShake(setter) {
    setter(true);
    setTimeout(() => setter(false), 500);
  }

  // ── Set PIN (first time) ─────────────────────────────────────────────────
  async function handleSetPin() {
    setSetError("");
    if (newPin.length < 4) {
      setSetError("Enter a 4-digit PIN.");
      return;
    }
    if (newPin !== confirmPin) {
      setSetError("PINs don't match.");
      triggerShake(setShakeConfirm);
      return;
    }
    setSettingPin(true);
    try {
      await settingsApi.setPin(newPin);
      setNewPin("");
      setConfirmPin("");
      flashSuccess("Withdrawal PIN set successfully! 🔐");
      loadStatus();
    } catch (e) {
      setSetError(e.response?.data?.message ?? "Failed to set PIN.");
    } finally {
      setSettingPin(false);
    }
  }

  // ── Change PIN ───────────────────────────────────────────────────────────
  async function handleChangePin() {
    setChangeError("");
    if (currentPin.length < 4) {
      setChangeError("Enter your current PIN.");
      return;
    }
    if (changedNew.length < 4) {
      setChangeError("Enter a new 4-digit PIN.");
      return;
    }
    if (changedNew !== changeConfirm) {
      setChangeError("New PINs don't match.");
      triggerShake(setShakeChangeConfirm);
      return;
    }
    if (currentPin === changedNew) {
      setChangeError("New PIN must be different from current PIN.");
      return;
    }
    setChanging(true);
    try {
      await settingsApi.changePin(currentPin, changedNew);
      setCurrentPin("");
      setChangedNew("");
      setChangeConfirm("");
      setShowChange(false);
      flashSuccess("Withdrawal PIN changed successfully!");
      loadStatus();
    } catch (e) {
      const msg = e.response?.data?.message ?? "Failed to change PIN.";
      setChangeError(msg);
      if (e.response?.status === 401) {
        triggerShake(setShakeCurrentPin);
        setCurrentPin("");
      }
      loadStatus(); // refresh lock status
    } finally {
      setChanging(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  if (loadingStatus) {
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Withdrawal PIN</Text>
          <Text style={styles.sectionSub}>
            4-digit security PIN for payouts
          </Text>
        </View>
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#f97316" />
          <Text style={styles.loadingText}>Checking PIN status…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      {/* Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Withdrawal PIN</Text>
        <Text style={styles.sectionSub}>
          Required to authorise every payout from your wallet
        </Text>
      </View>

      {/* Success flash */}
      {!!successMsg && (
        <View style={styles.successBanner}>
          <Text style={styles.successBannerText}>✅ {successMsg}</Text>
        </View>
      )}

      {/* ── LOCKED STATE ──────────────────────────────────────────────── */}
      {status?.isLocked && (
        <View style={styles.lockedCard}>
          <Text style={styles.lockedIcon}>🔒</Text>
          <Text style={styles.lockedTitle}>PIN Temporarily Locked</Text>
          <Text style={styles.lockedSub}>
            Too many incorrect attempts. Your PIN is locked for 30 minutes. Try
            again later.
          </Text>
        </View>
      )}

      {/* ── PIN NOT SET — first-time setup ────────────────────────────── */}
      {!status?.isLocked && !status?.pinSet && !showChange && (
        <View style={styles.card}>
          <View style={styles.noPin}>
            <Text style={styles.noPinIcon}>🔓</Text>
            <Text style={styles.noPinTitle}>No PIN Set</Text>
            <Text style={styles.noPinSub}>
              Set a 4-digit PIN to protect your withdrawals. You'll need it
              every time you request a payout.
            </Text>
          </View>

          <View style={styles.pinRow}>
            <Text style={styles.pinFieldLabel}>Choose PIN</Text>
            <PinBoxes
              value={newPin}
              onChange={setNewPin}
              disabled={settingPin}
            />
          </View>

          <View style={styles.pinRow}>
            <Text style={styles.pinFieldLabel}>Confirm PIN</Text>
            <PinBoxes
              value={confirmPin}
              onChange={setConfirmPin}
              disabled={settingPin}
              shake={shakeConfirm}
            />
          </View>

          {!!setError && <Text style={styles.errorText}>⚠️ {setError}</Text>}

          <TouchableOpacity
            style={[
              styles.btn,
              styles.btnPrimary,
              (settingPin || newPin.length < 4 || confirmPin.length < 4) &&
                styles.btnDisabled,
            ]}
            onPress={handleSetPin}
            disabled={settingPin || newPin.length < 4 || confirmPin.length < 4}
          >
            {settingPin ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text style={styles.btnPrimaryText}>Set Withdrawal PIN</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* ── PIN SET — status card + change button ─────────────────────── */}
      {!status?.isLocked && status?.pinSet && !showChange && (
        <View style={styles.card}>
          <View style={styles.pinSetRow}>
            <View style={styles.pinSetLeft}>
              <Text style={styles.pinSetIcon}>🔐</Text>
              <View>
                <Text style={styles.pinSetTitle}>PIN Active</Text>
                <Text style={styles.pinSetSub}>
                  Your withdrawal PIN is set and protecting your payouts.
                </Text>
              </View>
            </View>
            <View style={styles.pinActiveBadge}>
              <Text style={styles.pinActiveBadgeText}>Active</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.btn, styles.btnOutline]}
            onPress={() => {
              setShowChange(true);
              setChangeError("");
            }}
          >
            <Text style={styles.btnOutlineText}>Change PIN</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── CHANGE PIN FLOW ───────────────────────────────────────────── */}
      {!status?.isLocked && status?.pinSet && showChange && (
        <View style={styles.card}>
          <Text style={styles.changePinTitle}>Change Withdrawal PIN</Text>

          <View style={styles.pinRow}>
            <Text style={styles.pinFieldLabel}>Current PIN</Text>
            <PinBoxes
              value={currentPin}
              onChange={setCurrentPin}
              disabled={changing}
              shake={shakeCurrentPin}
            />
          </View>

          <View style={styles.pinRow}>
            <Text style={styles.pinFieldLabel}>New PIN</Text>
            <PinBoxes
              value={changedNew}
              onChange={setChangedNew}
              disabled={changing}
            />
          </View>

          <View style={styles.pinRow}>
            <Text style={styles.pinFieldLabel}>Confirm New PIN</Text>
            <PinBoxes
              value={changeConfirm}
              onChange={setChangeConfirm}
              disabled={changing}
              shake={shakeChangeConfirm}
            />
          </View>

          {!!changeError && (
            <Text style={styles.errorText}>⚠️ {changeError}</Text>
          )}

          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.btn, styles.btnOutline, styles.btnFlex]}
              onPress={() => {
                setShowChange(false);
                setCurrentPin("");
                setChangedNew("");
                setChangeConfirm("");
                setChangeError("");
              }}
              disabled={changing}
            >
              <Text style={styles.btnOutlineText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.btn,
                styles.btnPrimary,
                styles.btnFlex,
                (changing ||
                  currentPin.length < 4 ||
                  changedNew.length < 4 ||
                  changeConfirm.length < 4) &&
                  styles.btnDisabled,
              ]}
              onPress={handleChangePin}
              disabled={
                changing ||
                currentPin.length < 4 ||
                changedNew.length < 4 ||
                changeConfirm.length < 4
              }
            >
              {changing ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Text style={styles.btnPrimaryText}>Update PIN</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Attempts hint */}
      {status?.pinSet && !status?.isLocked && !showChange && (
        <Text style={styles.attemptsHint}>
          {status.attemptsRemaining} attempt
          {status.attemptsRemaining !== 1 ? "s" : ""} remaining before lockout
        </Text>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const ORANGE = "#f97316";

const styles = StyleSheet.create({
  section: {
    marginTop: 28,
    gap: 12,
  },
  sectionHeader: {
    gap: 3,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#f5f5f5",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  sectionSub: {
    fontSize: 12,
    color: "#888",
  },

  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  loadingText: {
    fontSize: 13,
    color: "#888",
  },

  // Success banner
  successBanner: {
    backgroundColor: "rgba(34,197,94,0.1)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.25)",
    borderRadius: 10,
    padding: 12,
  },
  successBannerText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#22c55e",
  },

  // Locked card
  lockedCard: {
    backgroundColor: "rgba(239,68,68,0.08)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.2)",
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    gap: 8,
  },
  lockedIcon: { fontSize: 36 },
  lockedTitle: { fontSize: 15, fontWeight: "800", color: "#ef4444" },
  lockedSub: {
    fontSize: 13,
    color: "#aaa",
    textAlign: "center",
    lineHeight: 20,
  },

  // Card wrapper
  card: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 18,
    gap: 16,
  },

  // No PIN set
  noPin: { alignItems: "center", gap: 6 },
  noPinIcon: { fontSize: 40, marginBottom: 2 },
  noPinTitle: { fontSize: 16, fontWeight: "800", color: "#f5f5f5" },
  noPinSub: {
    fontSize: 13,
    color: "#888",
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 300,
  },

  // PIN set row
  pinSetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  pinSetLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  pinSetIcon: { fontSize: 28 },
  pinSetTitle: { fontSize: 14, fontWeight: "700", color: "#f5f5f5" },
  pinSetSub: { fontSize: 12, color: "#888", marginTop: 2 },
  pinActiveBadge: {
    backgroundColor: "rgba(34,197,94,0.12)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.2)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pinActiveBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#22c55e",
  },

  changePinTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#f5f5f5",
  },

  // PIN row (label + boxes)
  pinRow: { gap: 8 },
  pinFieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#aaa",
  },

  // PIN boxes
  pinBoxesWrap: { alignItems: "flex-start" },
  pinBoxes: {
    flexDirection: "row",
    gap: 10,
  },
  pinBox: {
    width: 52,
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  pinBoxActive: {
    borderColor: ORANGE,
    shadowColor: ORANGE,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
    backgroundColor: "rgba(249,115,22,0.08)",
  },
  pinBoxFilled: {
    borderColor: ORANGE,
    backgroundColor: "rgba(249,115,22,0.1)",
  },
  pinBoxError: {
    borderColor: "#ef4444",
    backgroundColor: "rgba(239,68,68,0.08)",
  },
  pinDot: {
    fontSize: 20,
    color: "transparent",
    fontWeight: "900",
  },
  pinDotFilled: {
    color: ORANGE,
  },

  // Hidden input that captures keyboard
  pinHiddenInput: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
    pointerEvents: "none",
  },

  // Error text
  errorText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#ef4444",
  },

  // Buttons
  btnRow: {
    flexDirection: "row",
    gap: 10,
  },
  btnFlex: { flex: 1 },
  btn: {
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
  },
  btnPrimary: {
    backgroundColor: ORANGE,
  },
  btnPrimaryText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#000",
  },
  btnOutline: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "transparent",
  },
  btnOutlineText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ccc",
  },
  btnDisabled: {
    opacity: 0.4,
  },

  // Attempts hint
  attemptsHint: {
    fontSize: 11,
    color: "#666",
    paddingHorizontal: 4,
  },
});
