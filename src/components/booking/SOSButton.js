// src/components/booking/SOSButton.js
import React, { useState } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import * as Location from "expo-location";
import { useTranslation } from "react-i18next";
import {
  FaExclamationTriangle,
  FaCheckCircle,
  FaSpinner,
  FaShieldAlt,
} from "../../icons/fa";

import AppText from "../AppText";
import { useTheme } from "../../contexts/ThemeContext";
import { activateSOS } from "../../api/bookings";

export default function SOSButton({
  bookingId,
  bookingStatus,
  isWorker,
  sosActivatedAt,
  sosResolvedAt,
  onUpdate,
}) {
  const { t } = useTranslation();
  const { theme: th } = useTheme();
  const c = th.colors;

  const [phase, setPhase] = useState("idle");
  const [error, setError] = useState("");

  if (!isWorker) return null;
  if (!["ACCEPTED", "IN_PROGRESS"].includes(bookingStatus)) return null;

  const isActive = !!sosActivatedAt && !sosResolvedAt;
  const isResolved = !!sosActivatedAt && !!sosResolvedAt;

  const handleSOS = async () => {
    if (isActive) return;
    setPhase("locating");
    setError("");
    let lat = null;
    let lng = null;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      }
    } catch {}

    setPhase("sending");
    try {
      const res = await activateSOS(bookingId, {
        latitude: lat,
        longitude: lng,
      });
      setPhase("done");
      onUpdate?.(res);
    } catch (e) {
      setError(e?.response?.data?.message || t("booking.sos.failedCall"));
      setPhase("idle");
    }
  };

  if (isResolved) {
    return (
      <View
        style={[
          styles.resolved,
          {
            backgroundColor: "rgba(34,197,94,0.08)",
            borderColor: "rgba(34,197,94,0.2)",
          },
        ]}
      >
        <FaCheckCircle size={16} color="#22c55e" />
        <AppText
          variant="small"
          weight="semibold"
          style={{ color: "#22c55e", marginLeft: 8 }}
        >
          {t("booking.sos.resolved")}
        </AppText>
      </View>
    );
  }

  if (isActive) {
    return (
      <View
        style={[
          styles.activeWrap,
          { backgroundColor: "rgba(220,38,38,0.08)", borderColor: "#dc2626" },
        ]}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <FaExclamationTriangle size={22} color="#dc2626" />
          <View>
            <AppText weight="bold" style={{ color: "#dc2626" }}>
              {t("booking.sos.active")}
            </AppText>
            <AppText variant="small" tone="dim">
              {t("booking.sos.activeAt", {
                time: new Date(sosActivatedAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              })}
            </AppText>
          </View>
        </View>
        <AppText variant="small" tone="dim" style={{ marginTop: 6 }}>
          {t("booking.sos.alerted")}
        </AppText>
      </View>
    );
  }

  return (
    <View style={{ gap: 8 }}>
      {phase === "idle" && (
        <Pressable
          onPress={handleSOS}
          style={[styles.sosBtn, { backgroundColor: "#dc2626" }]}
        >
          <View style={styles.sosDot} />
          <FaExclamationTriangle
            size={14}
            color="#fff"
            style={{ marginLeft: 8 }}
          />
          <AppText weight="bold" style={{ color: "#fff", marginLeft: 6 }}>
            {t("booking.sos.emergencySOS")}
          </AppText>
        </Pressable>
      )}

      {phase === "locating" && (
        <View
          style={[
            styles.locating,
            {
              backgroundColor: "rgba(220,38,38,0.08)",
              borderColor: "rgba(220,38,38,0.2)",
            },
          ]}
        >
          <FaSpinner size={12} color="#dc2626" />
          <AppText
            variant="small"
            weight="semibold"
            style={{ color: "#dc2626", marginLeft: 8 }}
          >
            {t("booking.sos.gettingLocation")}
          </AppText>
        </View>
      )}

      {phase === "sending" && (
        <View
          style={[
            styles.locating,
            {
              backgroundColor: "rgba(220,38,38,0.08)",
              borderColor: "rgba(220,38,38,0.2)",
            },
          ]}
        >
          <FaSpinner size={12} color="#dc2626" />
          <AppText
            variant="small"
            weight="semibold"
            style={{ color: "#dc2626", marginLeft: 8 }}
          >
            {t("booking.sos.sendingAlert")}
          </AppText>
        </View>
      )}

      {phase === "done" && (
        <View
          style={[
            styles.activeWrap,
            { backgroundColor: "rgba(220,38,38,0.08)", borderColor: "#dc2626" },
          ]}
        >
          <FaShieldAlt size={22} color="#dc2626" />
          <AppText weight="bold" style={{ color: "#dc2626", marginTop: 4 }}>
            {t("booking.sos.sentHelp")}
          </AppText>
        </View>
      )}

      {error ? (
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <FaExclamationTriangle size={11} color="#dc2626" />
          <AppText variant="small" style={{ color: "#dc2626", marginLeft: 4 }}>
            {error}
          </AppText>
        </View>
      ) : null}

      <AppText
        variant="small"
        tone="dim"
        style={{ textAlign: "center", fontSize: 10 }}
      >
        {t("booking.sos.onlyUseShort")}
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
    borderRadius: 10,
  },
  sosDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff" },
  locating: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  activeWrap: { padding: 14, borderRadius: 10, borderWidth: 2, gap: 4 },
  resolved: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
});
