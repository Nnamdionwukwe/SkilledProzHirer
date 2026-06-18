// src/screens/main/PlaceholderScreen.js
import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";

import AppScreen from "../../components/AppScreen";
import AppText from "../../components/AppText";
import AppButton from "../../components/AppButton";
import { useTheme } from "../../contexts/ThemeContext";

/**
 * PlaceholderScreen — used for drawer items whose real screens haven't been
 * built yet (Bookings, PostJob, Disputes, etc.). It shows a friendly
 * "coming soon" with the route name so the user always lands somewhere
 * coherent instead of seeing a crash.
 *
 * As we ship each real screen, swap it in via HirerNavigator and this one
 * stops being referenced.
 */
export default function PlaceholderScreen() {
  const { theme } = useTheme();
  const route = useRoute();
  const navigation = useNavigation();

  return (
    <AppScreen scroll={false}>
      <View style={styles.center}>
        <View
          style={[styles.icon, { backgroundColor: theme.colors.orangeDim }]}
        >
          <Ionicons
            name="construct-outline"
            size={32}
            color={theme.colors.orange}
          />
        </View>

        <AppText
          variant="displaySm"
          weight="displayBlack"
          style={{ marginTop: 20, textAlign: "center" }}
        >
          {prettify(route.name)}
        </AppText>

        <AppText
          variant="subtitle"
          tone="dim"
          style={{ marginTop: 8, textAlign: "center" }}
        >
          This screen is coming soon.
        </AppText>

        <AppButton
          title="Back to Dashboard"
          variant="primary"
          fullWidth={false}
          style={{ marginTop: 24 }}
          onPress={() => navigation.navigate("Dashboard")}
        />
      </View>
    </AppScreen>
  );
}

function prettify(name) {
  return (name || "Screen").replace(/([A-Z])/g, " $1").trim();
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  icon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
