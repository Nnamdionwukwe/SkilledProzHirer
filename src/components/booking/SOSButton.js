// src/components/booking/SOSButton.js
//
// Verbatim port of components/booking/SOSButton.jsx.
//
// Renders only when:
//   · isWorker === true
//   · bookingStatus ∈ ["ACCEPTED", "IN_PROGRESS"]
//
// Three states:
//   · idle     → red "Emergency SOS" button
//   · locating → spinner "Getting your location…"
//   · sending  → spinner "Sending emergency alert…"
//   · active   → pulsing red card "SOS Active · sent at HH:MM"
//   · resolved → green "Emergency resolved" pill
//
// Endpoint: POST /bookings/:bookingId/sos
// Payload:  { latitude, longitude }
//
// Mobile port notes:
//   · navigator.geolocation.getCurrentPosition  →  expo-location
//     (requestForegroundPermissionsAsync + getCurrentPositionAsync)
//   · Timed at 8s to match web's `timeout: 8000`. If permission is denied
//     or the fix times out, the SOS is still sent without coordinates.

import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import AppText from "../AppText";
import { useTheme } from "../../contexts/ThemeContext";
import client from "../../api/client";
import {
  FaExclamationTriangle,
  FaCheckCircle,
  FaShieldAlt,
} from "../../icons/fa";

// Optional expo-location — guarded
let Location = null;
try {
  Location = require("expo-location");
} catch {}

async function getGPS() {
  if (!Location) return { latitude: null, longitude: null };
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) return { latitude: null, longitude: null };
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy?.Balanced ?? 3,
    });
    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
    };
  } catch {
    return { latitude: null, longitude: null };
  }
}

export default function SOSButton({
  bookingId,
  bookingStatus,
  isWorker,
  sosActivatedAt,
  sosResolvedAt,
  onUpdate,
}) {
  const { theme } = useTheme();
  const c = theme.colors;

  const [phase, setPhase] = useState("idle"); // idle | locating | sending | done
  const [error, setError] = useState("");

  // ── Guards ──────────────────────────────────────────────────────────
  if (!isWorker) return null;
  if (!["ACCEPTED", "IN_PROGRESS"].includes(bookingStatus)) return null;

  const isActive = !!sosActivatedAt && !sosResolvedAt;
  const isResolved = !!sosActivatedAt && !!sosResolvedAt;

  // ── SOS trigger ─────────────────────────────────────────────────────
  async function handleSOS() {
    if (isActive) return;
    setPhase("locating");
    setError("");

    const gps = await getGPS();

    setPhase("sending");
    try {
      const res = await client.post(`/bookings/${bookingId}/sos`, {
        latitude: gps.latitude,
        longitude: gps.longitude,
      });
      setPhase("done");
      onUpdate?.(res?.data?.data?.booking);
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          "Failed to send SOS. Please call emergency services.",
      );
      setPhase("idle");
    }
  }

  // ═════════════════════════════════════════════════════════════════════
  // RESOLVED STATE
  // ═════════════════════════════════════════════════════════════════════
  if (isResolved) {
    return (
      <View
        style={[
          styles.resolved,
          {
            backgroundColor: "rgba(22,163,74,0.08)",
            borderColor: "rgba(22,163,74,0.2)",
          },
        ]}
      >
        <FaCheckCircle size={14} color="#16a34a" />
        <AppText
          style={{
            fontSize: 12,
            fontWeight: "600",
            color: "#16a34a",
            marginLeft: 8,
          }}
        >
          Emergency resolved
        </AppText>
      </View>
    );
  }

  // ═════════════════════════════════════════════════════════════════════
  // ACTIVE (activated but not resolved)
  // ═════════════════════════════════════════════════════════════════════
  if (isActive) {
    return (
      <View
        style={[
          styles.activeWrap,
          {
            backgroundColor: "rgba(220,38,38,0.08)",
            borderColor: "#dc2626",
          },
        ]}
      >
        <View style={styles.activeContent}>
          <FaExclamationTriangle size={22} color="#dc2626" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <AppText
              style={{
                fontSize: 14,
                fontWeight: "800",
                color: "#dc2626",
              }}
            >
              SOS Active
            </AppText>
            <AppText style={{ fontSize: 11, color: c.textMuted, marginTop: 2 }}>
              Sent at{" "}
              {new Date(sosActivatedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </AppText>
          </View>
        </View>
        <AppText
          style={{
            fontSize: 11,
            color: c.textMuted,
            marginTop: 8,
            lineHeight: 16,
          }}
        >
          Your hirer and our team have been alerted.
        </AppText>
      </View>
    );
  }

  // ═════════════════════════════════════════════════════════════════════
  // IDLE / LOCATING / SENDING / DONE
  // ═════════════════════════════════════════════════════════════════════
  return (
    <View style={{ gap: 6 }}>
      {phase === "idle" ? (
        <Pressable
          onPress={handleSOS}
          style={({ pressed }) => [
            styles.sosBtn,
            {
              backgroundColor: pressed ? "#b91c1c" : "#dc2626",
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
          ]}
        >
          <View style={styles.sosDot} />
          <FaExclamationTriangle size={13} color="#fff" />
          <AppText
            style={{
              fontSize: 14,
              fontWeight: "800",
              color: "#fff",
              letterSpacing: 0.3,
              marginLeft: 6,
            }}
          >
            Emergency SOS
          </AppText>
        </Pressable>
      ) : null}

      {phase === "locating" ? (
        <View
          style={[
            styles.locatingBox,
            {
              backgroundColor: "rgba(220,38,38,0.08)",
              borderColor: "rgba(220,38,38,0.2)",
            },
          ]}
        >
          <View
            style={[
              styles.spinnerDot,
              { borderTopColor: "#dc2626", borderColor: "rgba(220,38,38,0.2)" },
            ]}
          />
          <AppText
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: "#dc2626",
              marginLeft: 10,
            }}
          >
            Getting your location…
          </AppText>
        </View>
      ) : null}

      {phase === "sending" ? (
        <View
          style={[
            styles.locatingBox,
            {
              backgroundColor: "rgba(220,38,38,0.08)",
              borderColor: "rgba(220,38,38,0.2)",
            },
          ]}
        >
          <View
            style={[
              styles.spinnerDot,
              { borderTopColor: "#dc2626", borderColor: "rgba(220,38,38,0.2)" },
            ]}
          />
          <AppText
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: "#dc2626",
              marginLeft: 10,
            }}
          >
            Sending emergency alert…
          </AppText>
        </View>
      ) : null}

      {phase === "done" ? (
        <View
          style={[
            styles.activeWrap,
            {
              backgroundColor: "rgba(220,38,38,0.08)",
              borderColor: "#dc2626",
            },
          ]}
        >
          <View style={styles.activeContent}>
            <FaShieldAlt size={22} color="#dc2626" />
            <AppText
              style={{
                fontSize: 13,
                fontWeight: "800",
                color: "#dc2626",
                marginLeft: 10,
                flex: 1,
              }}
            >
              SOS Sent — help is on the way
            </AppText>
          </View>
        </View>
      ) : null}

      {error ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 4,
            marginTop: 2,
          }}
        >
          <FaExclamationTriangle
            size={10}
            color="#dc2626"
            style={{ marginTop: 2 }}
          />
          <AppText style={{ fontSize: 11, color: "#dc2626", flex: 1 }}>
            {error}
          </AppText>
        </View>
      ) : null}

      <AppText
        style={{
          fontSize: 10,
          color: c.textMuted,
          textAlign: "center",
          lineHeight: 15,
        }}
      >
        Only use in a genuine emergency. Your GPS location will be shared.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  sosBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 8,
    minHeight: 46,
  },
  sosDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
    opacity: 0.85,
  },
  locatingBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  spinnerDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  activeWrap: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 2,
  },
  activeContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  resolved: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
});
