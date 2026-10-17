import React from "react";
import { View, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { FaCheck } from "../../icons/fa";
import AppText from "../AppText";
import { useTheme } from "../../contexts/ThemeContext";

export default function Timeline({ step }) {
  const { t } = useTranslation();
  const { theme: th } = useTheme();
  const c = th.colors;

  const steps = [
    t("booking.timeline.pending"),
    t("booking.timeline.accepted"),
    t("booking.timeline.inProgress"),
    t("booking.timeline.completed"),
  ];

  if (step < 0) return null;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: c.bgPanel, borderColor: c.border },
      ]}
    >
      {steps.map((label, i) => {
        const done = i < step;
        const current = i === step;
        return (
          <View key={label} style={styles.item}>
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: done ? c.orange : c.bgCard,
                  borderColor: done || current ? c.orange : c.border,
                },
              ]}
            >
              {done ? (
                <FaCheck size={10} color="#fff" />
              ) : (
                <AppText
                  style={{
                    fontSize: 10,
                    color: current ? c.orange : c.textMuted,
                    fontWeight: "bold",
                  }}
                >
                  {i + 1}
                </AppText>
              )}
            </View>
            <AppText
              style={{
                fontSize: 10,
                color: done || current ? c.text : c.textMuted,
                marginTop: 6,
                textAlign: "center",
              }}
            >
              {label}
            </AppText>
            {i < steps.length - 1 && (
              <View
                style={[
                  styles.line,
                  { backgroundColor: i < step ? c.orange : c.border },
                ]}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  item: { alignItems: "center", flex: 1, position: "relative" },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  line: {
    position: "absolute",
    top: 11,
    left: "50%",
    right: "-50%",
    height: 2,
    zIndex: 1,
  },
});
