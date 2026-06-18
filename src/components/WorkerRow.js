// src/components/WorkerRow.js
import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppText from "./AppText";
import Avatar from "./Avatar";
import AppCurrency from "./AppCurrency";
import { useTheme } from "../contexts/ThemeContext";

/**
 * WorkerRow — one item in the Recent Workers list.
 *
 *   <WorkerRow worker={w} onPress={() => goToWorker(w.id)} showDivider />
 *
 * Expects the shape returned from /hirer/me/dashboard.recentWorkers[]:
 *   { id, firstName, lastName, avatar, workerProfile: { title, avgRating } }
 */
export default function WorkerRow({ worker, onPress, showDivider = true }) {
  const { theme } = useTheme();
  const name = `${worker.firstName || ""} ${worker.lastName || ""}`.trim();
  const title = worker.workerProfile?.title || "—";
  const rating = worker.workerProfile?.avgRating || 0;
  const rate = worker.workerProfile?.hourlyRate;
  const rateCurrency = worker.workerProfile?.currency;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          borderBottomColor: theme.colors.border,
          borderBottomWidth: showDivider ? StyleSheet.hairlineWidth : 0,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Avatar
        uri={worker.avatar}
        firstName={worker.firstName}
        lastName={worker.lastName}
        size={40}
      />

      <View style={styles.middle}>
        <AppText weight="semibold" numberOfLines={1}>
          {name || "Worker"}
        </AppText>
        <AppText
          variant="small"
          tone="dim"
          numberOfLines={1}
          style={{ marginTop: 2 }}
        >
          {title}
        </AppText>
      </View>

      <View style={styles.right}>
        {rating > 0 ? (
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={12} color={theme.colors.orange} />
            <AppText variant="small" weight="semibold">
              {Number(rating).toFixed(1)}
            </AppText>
          </View>
        ) : null}
        {rate ? (
          <AppCurrency
            amount={rate}
            currencyCode={rateCurrency}
            variant="small"
            tone="dim"
          />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 12,
  },
  middle: { flex: 1, minWidth: 0 },
  right: { alignItems: "flex-end", gap: 2 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4 },
});
