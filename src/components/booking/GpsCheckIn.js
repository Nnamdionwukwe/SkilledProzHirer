// src/components/booking/GpsCheckIn.js
//
// Verbatim port of components/booking/GpsCheckIn.jsx.
//
// Renders only when:
//   · isWorker === true
//   · status ∈ ["ACCEPTED", "IN_PROGRESS"]
//
// Two modes:
//   · status === "ACCEPTED"     → check-in  (PATCH /bookings/:id/checkin)
//   · status === "IN_PROGRESS"  → check-out (PATCH /bookings/:id/checkout)
//
// Five phases:
//   idle → locating → confirming → submitting → done
//
// Port notes:
//   · navigator.geolocation → expo-location (guarded require)
//   · Reverse-geocoding uses the same public Nominatim endpoint as web
//   · Distance calc uses haversineKm, verbatim from web
//   · Timeout at 10s to match web's `timeout: 10000`
//   · If permission is denied or the fix fails, the check-in proceeds
//     without coordinates — matches web's behavior

import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";

import AppText from "../AppText";
import { useTheme } from "../../contexts/ThemeContext";
import client from "../../api/client";
import {
  FaMapMarkerAlt,
  FaLocationArrow,
  FaCheckCircle,
  FaExclamationTriangle,
  FaCheck,
  FaTimes,
  FaCircle,
} from "../../icons/fa";

// Optional expo-location — guarded
let Location = null;
try {
  Location = require("expo-location");
} catch {}

// ── Haversine distance (verbatim from web) ─────────────────────────────
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Reverse geocode via Nominatim (verbatim from web) ──────────────────
async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { Accept: "application/json" } },
    );
    const data = await res.json();
    const addr = data.address || {};
    return (
      addr.suburb ||
      addr.neighbourhood ||
      addr.village ||
      addr.town ||
      addr.city ||
      addr.county ||
      `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    );
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

// ── GPS fetch ─────────────────────────────────────────────────────────
async function getGPS() {
  if (!Location) return { latitude: null, longitude: null };
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) return { latitude: null, longitude: null };
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy?.BestForNavigation ?? 6,
    });
    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: Math.round(pos.coords.accuracy || 0),
    };
  } catch {
    return { latitude: null, longitude: null };
  }
}

export default function GpsCheckIn({
  bookingId,
  status,
  isWorker,
  jobLatitude,
  jobLongitude,
  onSuccess,
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const c = theme.colors;

  const [phase, setPhase] = useState("idle");
  const [gpsData, setGpsData] = useState(null);
  const [locationLabel, setLocationLabel] = useState("");
  const [distanceKm, setDistanceKm] = useState(null);
  const [error, setError] = useState("");

  // ── Guards ──────────────────────────────────────────────────────────
  if (!isWorker) return null;
  if (!["ACCEPTED", "IN_PROGRESS"].includes(status)) return null;

  const isCheckIn = status === "ACCEPTED";

  // ── Handle locate ───────────────────────────────────────────────────
  const handleLocate = async () => {
    setPhase("locating");
    setError("");

    const gps = await getGPS();

    if (!gps.latitude) {
      setGpsData({ latitude: null, longitude: null });
      setLocationLabel("Location unavailable");
      setDistanceKm(null);
      setPhase("confirming");
      return;
    }

    const label = await reverseGeocode(gps.latitude, gps.longitude);
    setLocationLabel(label);
    setGpsData(gps);

    if (jobLatitude && jobLongitude) {
      const dist = haversineKm(
        gps.latitude,
        gps.longitude,
        jobLatitude,
        jobLongitude,
      );
      setDistanceKm(dist);
    }

    setPhase("confirming");
  };

  // ── Handle confirm ──────────────────────────────────────────────────
  const handleConfirm = async () => {
    setPhase("submitting");
    try {
      const endpoint = isCheckIn
        ? `/bookings/${bookingId}/checkin`
        : `/bookings/${bookingId}/checkout`;

      const res = await client.patch(endpoint, {
        latitude: gpsData?.latitude || null,
        longitude: gpsData?.longitude || null,
      });

      setPhase("done");
      onSuccess?.(res?.data?.data?.booking, gpsData);
    } catch (e) {
      setError(
        e?.response?.data?.message || "Action failed. Please try again.",
      );
      setPhase("idle");
    }
  };

  // ── Handle reset ────────────────────────────────────────────────────
  const handleReset = () => {
    setPhase("idle");
    setGpsData(null);
    setLocationLabel("");
    setDistanceKm(null);
    setError("");
  };

  const distanceWarning =
    distanceKm !== null && distanceKm > 1
      ? `You appear to be ${distanceKm.toFixed(1)} km from the job site.`
      : null;

  // ═════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════
  return (
    <View style={{ gap: 8 }}>
      {/* ─── IDLE ─────────────────────────────────────────────────── */}
      {phase === "idle" ? (
        <Pressable
          onPress={handleLocate}
          style={({ pressed }) => [
            styles.mainBtn,
            {
              backgroundColor: isCheckIn ? c.orange : c.green,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <View
            style={[
              styles.pulseDot,
              {
                backgroundColor: isCheckIn
                  ? "rgba(8,8,16,0.5)"
                  : "rgba(8,8,16,0.5)",
              },
            ]}
          />
          <AppText
            style={{
              fontSize: 14,
              fontWeight: "700",
              color: c.bg,
              marginLeft: 8,
            }}
          >
            {isCheckIn ? "Check In — Start Job" : "Check Out — Mark Complete"}
          </AppText>
        </Pressable>
      ) : null}

      {/* ─── LOCATING ─────────────────────────────────────────────── */}
      {phase === "locating" ? (
        <View
          style={[
            styles.locatingBox,
            { backgroundColor: c.bgCard, borderColor: c.border },
          ]}
        >
          <FaMapMarkerAlt size={20} color={c.orange} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <AppText style={{ fontSize: 13, fontWeight: "600", color: c.text }}>
              Acquiring your location…
            </AppText>
            <AppText style={{ fontSize: 11, color: c.textDim, marginTop: 2 }}>
              Please allow location access if prompted
            </AppText>
          </View>
          <ActivityIndicator size="small" color={c.orange} />
        </View>
      ) : null}

      {/* ─── CONFIRMING ───────────────────────────────────────────── */}
      {phase === "confirming" ? (
        <View
          style={[
            styles.confirmBox,
            { backgroundColor: c.bgPanel, borderColor: c.border },
          ]}
        >
          {/* Confirm header */}
          <View style={styles.confirmHeader}>
            {isCheckIn ? (
              <FaCheckCircle size={22} color={c.green} />
            ) : (
              <FaCircle size={22} color={c.red} />
            )}
            <View style={{ flex: 1, marginLeft: 10 }}>
              <AppText
                style={{ fontSize: 14, fontWeight: "700", color: c.text }}
              >
                {isCheckIn ? "Confirm Check-In" : "Confirm Check-Out"}
              </AppText>
              <AppText style={{ fontSize: 11, color: c.textDim, marginTop: 2 }}>
                {new Date().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </AppText>
            </View>
          </View>

          {/* Location card */}
          <View
            style={[
              styles.locationCard,
              { backgroundColor: c.bgInput, borderColor: c.border },
            ]}
          >
            <View style={styles.locationRow}>
              <FaLocationArrow
                size={16}
                color={c.orange}
                style={{ marginTop: 2 }}
              />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <AppText
                  style={{
                    fontSize: 10,
                    fontWeight: "600",
                    textTransform: "uppercase",
                    letterSpacing: 0.8,
                    color: c.textMuted,
                  }}
                >
                  Your current location
                </AppText>
                <AppText
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: c.text,
                    marginTop: 2,
                  }}
                >
                  {locationLabel || "Unknown"}
                </AppText>
                {gpsData?.accuracy ? (
                  <AppText
                    style={{ fontSize: 11, color: c.textMuted, marginTop: 2 }}
                  >
                    ±{gpsData.accuracy}m accuracy
                  </AppText>
                ) : null}
                {gpsData?.latitude ? (
                  <AppText
                    style={{
                      fontSize: 10,
                      color: c.textMuted,
                      fontFamily: "monospace",
                      marginTop: 2,
                    }}
                  >
                    {gpsData.latitude.toFixed(5)},{" "}
                    {gpsData.longitude.toFixed(5)}
                  </AppText>
                ) : null}
              </View>
            </View>

            {/* Distance */}
            {distanceKm !== null ? (
              <View
                style={[
                  styles.distanceRow,
                  distanceKm > 1
                    ? { backgroundColor: c.orangeDim }
                    : { backgroundColor: c.greenDim },
                ]}
              >
                {distanceKm < 0.1 ? (
                  <FaCheckCircle size={13} color={c.green} />
                ) : distanceKm > 1 ? (
                  <FaExclamationTriangle size={13} color="#fbbf24" />
                ) : (
                  <FaLocationArrow size={13} color={c.textDim} />
                )}
                <AppText
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: distanceKm > 1 ? c.orange : c.green,
                    marginLeft: 6,
                  }}
                >
                  {distanceKm < 0.1
                    ? "You're at the job site"
                    : `${distanceKm.toFixed(2)} km from job site`}
                </AppText>
              </View>
            ) : null}

            {/* No GPS warning */}
            {!gpsData?.latitude ? (
              <View
                style={[
                  styles.noGpsRow,
                  { backgroundColor: c.bgCard, borderColor: c.border },
                ]}
              >
                <FaExclamationTriangle size={12} color="#fbbf24" />
                <AppText
                  style={{
                    fontSize: 11,
                    color: c.textDim,
                    marginLeft: 6,
                    flex: 1,
                    lineHeight: 16,
                  }}
                >
                  Location unavailable — check-in will proceed without GPS
                </AppText>
              </View>
            ) : null}
          </View>

          {/* Distance warning */}
          {distanceWarning ? (
            <View
              style={[
                styles.warningBox,
                { backgroundColor: c.orangeDim, borderColor: c.orangeGlow },
              ]}
            >
              <FaExclamationTriangle
                size={11}
                color={c.orange}
                style={{ marginTop: 2 }}
              />
              <AppText
                style={{
                  fontSize: 12,
                  color: c.orange,
                  marginLeft: 6,
                  flex: 1,
                  lineHeight: 17,
                }}
              >
                {distanceWarning} Your location is still recorded.
              </AppText>
            </View>
          ) : null}

          {/* Actions */}
          <View style={styles.actionsRow}>
            <Pressable
              onPress={handleReset}
              style={({ pressed }) => [
                styles.cancelBtn,
                { borderColor: c.border, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <FaTimes size={11} color={c.textDim} />
              <AppText
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: c.textDim,
                  marginLeft: 4,
                }}
              >
                Cancel
              </AppText>
            </Pressable>
            <Pressable
              onPress={handleConfirm}
              style={({ pressed }) => [
                styles.confirmBtn,
                {
                  backgroundColor: isCheckIn ? c.orange : c.green,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <FaCheck size={12} color={c.bg} />
              <AppText
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: c.bg,
                  marginLeft: 6,
                }}
              >
                {isCheckIn ? "Confirm Check-In" : "Confirm Check-Out"}
              </AppText>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* ─── SUBMITTING ───────────────────────────────────────────── */}
      {phase === "submitting" ? (
        <View
          style={[
            styles.locatingBox,
            { backgroundColor: c.bgCard, borderColor: c.border },
          ]}
        >
          <ActivityIndicator size="small" color={c.orange} />
          <AppText
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: c.textDim,
              marginLeft: 10,
            }}
          >
            {isCheckIn ? "Checking in…" : "Checking out…"}
          </AppText>
        </View>
      ) : null}

      {/* ─── ERROR ────────────────────────────────────────────────── */}
      {error ? (
        <View
          style={[
            styles.errorBox,
            { backgroundColor: c.redDim, borderColor: c.red },
          ]}
        >
          <FaExclamationTriangle
            size={11}
            color={c.red}
            style={{ marginTop: 2 }}
          />
          <AppText
            style={{
              fontSize: 12,
              color: c.red,
              marginLeft: 6,
              flex: 1,
              lineHeight: 17,
            }}
          >
            {error}
          </AppText>
          <Pressable
            onPress={handleReset}
            style={[styles.retryBtn, { borderColor: c.red }]}
          >
            <AppText style={{ fontSize: 10, color: c.red, fontWeight: "600" }}>
              Retry
            </AppText>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  mainBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 10,
    minHeight: 46,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  locatingBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  confirmBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  confirmHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  distanceRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 7,
  },
  noGpsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 7,
    borderWidth: 1,
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 4,
  },
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  confirmBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
  },
  retryBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    marginLeft: 8,
  },
});
