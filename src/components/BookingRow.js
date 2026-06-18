// src/components/BookingRow.js
import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import AppText from "./AppText";
import Avatar from "./Avatar";
import Badge from "./Badge";
import { useTheme } from "../contexts/ThemeContext";

/**
 * BookingRow — one item in the Recent Bookings list (matches website screenshot).
 *
 *   <BookingRow booking={b} onPress={() => goTo(b.id)} showDivider />
 *
 * The booking payload from /hirer/me/dashboard looks like:
 *   { id, title, worker: { firstName, lastName, avatar }, category: { name },
 *     status, agreedRate, currency }
 */
export default function BookingRow({ booking, onPress, showDivider = true }) {
  const { theme } = useTheme();

  const workerName = booking.worker
    ? `${booking.worker.firstName} ${booking.worker.lastName}`
    : "Worker";
  const categoryName = booking.category?.name || "—";

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
        uri={booking.worker?.avatar}
        firstName={booking.worker?.firstName}
        lastName={booking.worker?.lastName}
        size={40}
      />

      <View style={styles.middle}>
        <AppText weight="semibold" numberOfLines={1}>
          {booking.title || "Untitled booking"}
        </AppText>
        <AppText
          variant="small"
          tone="dim"
          numberOfLines={1}
          style={{ marginTop: 2 }}
        >
          {workerName} · {categoryName}
        </AppText>
      </View>

      <Badge status={booking.status} />
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
});
