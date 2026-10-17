import React from "react";
import { View, Pressable, Linking, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import {
  FaCheckCircle,
  FaExclamationTriangle,
  FaMap,
  FaMapMarkerAlt,
} from "../../icons/fa";
import AppText from "../AppText";
import { useTheme } from "../../contexts/ThemeContext";

function fmtTimeDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  return (
    dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) +
    " · " +
    dt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
  );
}

export default function GpsCard({ label, lat, lng, timestamp, isCheckOut }) {
  const { t } = useTranslation();
  const { theme: th } = useTheme();
  const c = th.colors;

  const dotColor = isCheckOut ? "#ef4444" : "#22c55e";
  const bgColor = isCheckOut ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)";

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: bgColor, borderColor: dotColor + "44" },
      ]}
    >
      <View style={styles.header}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={[styles.dot, { backgroundColor: dotColor }]} />
          <AppText weight="bold" style={{ fontSize: 14 }}>
            {label}
          </AppText>
        </View>
        <AppText variant="small" tone="dim">
          {fmtTimeDate(timestamp)}
        </AppText>
      </View>
      <View style={[styles.row, { borderTopColor: c.border }]}>
        <AppText variant="small" tone="dim">
          {t("booking.location.coordinates")}
        </AppText>
        <AppText variant="small" weight="bold">
          {Number(lat).toFixed(5)}, {Number(lng).toFixed(5)}
        </AppText>
      </View>
      <Pressable
        onPress={() =>
          Linking.openURL(`https://www.google.com/maps?q=${lat},${lng}`)
        }
        style={{
          marginTop: 8,
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
        }}
      >
        <FaMap size={12} color="#3b82f6" />
        <AppText
          variant="small"
          style={{ color: "#3b82f6", fontWeight: "bold" }}
        >
          {t("booking.location.viewOnMaps")}
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    gap: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
