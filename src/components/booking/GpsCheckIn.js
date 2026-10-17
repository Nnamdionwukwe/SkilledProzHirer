// src/components/booking/GpsCheckIn.js
import React, { useState } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import * as Location from "expo-location";
import { useTranslation } from "react-i18next";
import {
  FaMapMarkerAlt,
  FaLocationArrow,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSpinner,
  FaCheck,
  FaTimes,
  FaCircle,
} from "../../icons/fa";

import AppText from "../AppText";
import { useTheme } from "../../contexts/ThemeContext";
import { checkIn, checkOut } from "../../api/bookings";

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

async function getGPS() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return { latitude: null, longitude: null };
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: Math.round(pos.coords.accuracy),
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
  const { theme: th } = useTheme();
  const c = th.colors;

  const [phase, setPhase] = useState("idle");
  const [gpsData, setGpsData] = useState(null);
  const [distanceKm, setDistanceKm] = useState(null);
  const [error, setError] = useState("");

  if (!isWorker) return null;
  if (!["ACCEPTED", "IN_PROGRESS"].includes(status)) return null;

  const isCheckIn = status === "ACCEPTED";

  const handleLocate = async () => {
    setPhase("locating");
    setError("");
    const gps = await getGPS();
    setGpsData(gps);
    if (gps.latitude && jobLatitude && jobLongitude) {
      setDistanceKm(
        haversineKm(gps.latitude, gps.longitude, jobLatitude, jobLongitude),
      );
    }
    setPhase("confirming");
  };

  const handleConfirm = async () => {
    setPhase("submitting");
    try {
      const res = isCheckIn
        ? await checkIn(bookingId, {
            latitude: gpsData?.latitude ?? null,
            longitude: gpsData?.longitude ?? null,
          })
        : await checkOut(bookingId, {
            latitude: gpsData?.latitude ?? null,
            longitude: gpsData?.longitude ?? null,
          });
      setPhase("done");
      onSuccess?.(res, gpsData);
    } catch (e) {
      setError(
        e?.response?.data?.message || "Action failed. Please try again.",
      );
      setPhase("idle");
    }
  };

  const reset = () => {
    setPhase("idle");
    setGpsData(null);
    setDistanceKm(null);
    setError("");
  };

  return (
    <View style={{ gap: 8 }}>
      {phase === "idle" && (
        <Pressable
          onPress={handleLocate}
          style={[
            styles.mainBtn,
            { backgroundColor: isCheckIn ? c.orange : "#22c55e" },
          ]}
        >
          <View style={styles.pulseDot} />
          <AppText weight="bold" style={{ color: c.bg, marginLeft: 10 }}>
            {isCheckIn ? t("booking.gps.checkIn") : t("booking.gps.checkOut")}
          </AppText>
        </Pressable>
      )}

      {phase === "locating" && (
        <View
          style={[
            styles.locatingBox,
            { backgroundColor: c.bgCard, borderColor: c.border },
          ]}
        >
          <FaMapMarkerAlt size={20} color={c.orange} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <AppText weight="semibold">{t("booking.gps.acquiring")}</AppText>
            <AppText variant="small" tone="dim">
              {t("booking.gps.allowAccess")}
            </AppText>
          </View>
          <FaSpinner size={14} color={c.orange} />
        </View>
      )}

      {phase === "confirming" && (
        <View
          style={[
            styles.confirmBox,
            { backgroundColor: c.bgPanel, borderColor: c.border },
          ]}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            {isCheckIn ? (
              <FaCheckCircle size={20} color="#22c55e" />
            ) : (
              <FaCircle size={20} color="#ef4444" />
            )}
            <View>
              <AppText weight="bold">
                {isCheckIn
                  ? t("booking.gps.confirmCheckIn")
                  : t("booking.gps.confirmCheckOut")}
              </AppText>
              <AppText variant="small" tone="dim">
                {new Date().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </AppText>
            </View>
          </View>

          <View
            style={[
              styles.locationCard,
              { backgroundColor: c.bgInput, borderColor: c.border },
            ]}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <FaLocationArrow size={14} color={c.orange} />
              <View style={{ flex: 1 }}>
                <AppText variant="small" tone="dim">
                  {t("booking.gps.yourLocation")}
                </AppText>
                <AppText weight="semibold">
                  {gpsData?.latitude
                    ? `${gpsData.latitude.toFixed(4)}, ${gpsData.longitude.toFixed(4)}`
                    : t("booking.gps.unknown")}
                </AppText>
                {gpsData?.accuracy && (
                  <AppText variant="small" tone="dim">
                    ±{gpsData.accuracy}m
                  </AppText>
                )}
              </View>
            </View>
            {distanceKm !== null && (
              <View
                style={[
                  styles.distanceRow,
                  {
                    backgroundColor: distanceKm > 1 ? c.orangeDim : c.greenDim,
                  },
                ]}
              >
                {distanceKm < 0.1 ? (
                  <FaCheckCircle size={11} color="#22c55e" />
                ) : distanceKm > 1 ? (
                  <FaExclamationTriangle size={11} color={c.orange} />
                ) : (
                  <FaLocationArrow size={11} color={c.blue} />
                )}
                <AppText
                  variant="small"
                  weight="semibold"
                  style={{
                    marginLeft: 6,
                    color: distanceKm > 1 ? c.orange : "#22c55e",
                  }}
                >
                  {distanceKm < 0.1
                    ? t("booking.gps.atJobSite")
                    : t("booking.gps.fromJobSite", {
                        km: distanceKm.toFixed(2),
                      })}
                </AppText>
              </View>
            )}
            {!gpsData?.latitude && (
              <AppText variant="small" tone="dim" style={{ marginTop: 6 }}>
                {t("booking.gps.unavailable")}
              </AppText>
            )}
          </View>

          {distanceKm !== null && distanceKm > 1 && (
            <View
              style={[
                styles.warningBox,
                { backgroundColor: c.orangeDim, borderColor: c.orangeGlow },
              ]}
            >
              <FaExclamationTriangle size={11} color={c.orange} />
              <AppText
                variant="small"
                style={{ color: c.orange, marginLeft: 6, flex: 1 }}
              >
                {t("booking.gps.distanceWarning", {
                  km: distanceKm.toFixed(1),
                })}
              </AppText>
            </View>
          )}

          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            <Pressable
              onPress={reset}
              style={[styles.cancelBtn, { borderColor: c.border }]}
            >
              <FaTimes size={11} color={c.textDim} />
              <AppText
                variant="small"
                weight="semibold"
                tone="dim"
                style={{ marginLeft: 4 }}
              >
                {t("booking.gps.cancel")}
              </AppText>
            </Pressable>
            <Pressable
              onPress={handleConfirm}
              style={[
                styles.confirmBtn,
                { backgroundColor: isCheckIn ? c.orange : "#22c55e" },
              ]}
            >
              <FaCheck size={11} color={c.bg} />
              <AppText weight="bold" style={{ color: c.bg, marginLeft: 6 }}>
                {isCheckIn
                  ? t("booking.gps.confirmCheckIn")
                  : t("booking.gps.confirmCheckOut")}
              </AppText>
            </Pressable>
          </View>
        </View>
      )}

      {phase === "submitting" && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            padding: 12,
          }}
        >
          <FaSpinner size={14} color={c.orange} />
          <AppText tone="dim">
            {isCheckIn ? "Checking in..." : "Checking out..."}
          </AppText>
        </View>
      )}

      {error ? (
        <View
          style={[
            styles.errorBox,
            { backgroundColor: "rgba(239,68,68,0.1)", borderColor: "#ef4444" },
          ]}
        >
          <FaExclamationTriangle size={11} color="#ef4444" />
          <AppText
            variant="small"
            style={{ color: "#ef4444", marginLeft: 6, flex: 1 }}
          >
            {error}
          </AppText>
          <Pressable onPress={reset}>
            <AppText variant="small" weight="bold" style={{ color: "#ef4444" }}>
              {t("booking.gps.retry")}
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
    paddingVertical: 14,
    borderRadius: 10,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  locatingBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  confirmBox: { padding: 16, borderRadius: 12, borderWidth: 1, gap: 12 },
  locationCard: { padding: 12, borderRadius: 10, borderWidth: 1 },
  distanceRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 6,
    borderRadius: 6,
    marginTop: 8,
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  confirmBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
});
