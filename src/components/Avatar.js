// src/components/Avatar.js
import React from "react";
import { View, Image, StyleSheet } from "react-native";
import AppText from "./AppText";
import { useTheme } from "../contexts/ThemeContext";

/**
 * Avatar — circular user photo with initials fallback.
 *
 *   <Avatar uri={user.avatar} firstName={user.firstName} lastName={user.lastName} size={40} />
 *
 * Falls back to a colored circle with the user's initials when no avatar.
 */
export default function Avatar({
  uri,
  firstName = "",
  lastName = "",
  size = 40,
  style,
}) {
  const { theme } = useTheme();
  const initials =
    `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase() || "?";

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[
          styles.img,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: theme.colors.bgInput,
          },
          style,
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.colors.orangeDim,
          borderColor: theme.colors.border,
        },
        style,
      ]}
    >
      <AppText
        weight="bold"
        style={{
          color: theme.colors.orange,
          fontSize: Math.max(11, Math.floor(size * 0.4)),
        }}
      >
        {initials}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  img: {},
  fallback: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
});
