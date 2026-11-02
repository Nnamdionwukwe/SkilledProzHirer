// src/components/RetainedStaff/PaymentSuccessModal.js
//
// Ported verbatim from PaymentSuccessModal.jsx.
// Simple success confirmation — no API call.

import React from "react";
import {
  View,
  Pressable,
  Modal,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import AppText from "../AppText";
import { useTheme } from "../../contexts/ThemeContext";

export default function PaymentSuccessModal({ isOpen, onClose, onViewCycle }) {
  const { t } = useTranslation();
  const { theme, fontScale } = useTheme();
  const { width } = useWindowDimensions();

  const rem = (n) => n * 16 * fontScale;
  const c = theme.colors;

  return (
    <Modal
      visible={isOpen}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View
          style={[
            styles.modal,
            {
              backgroundColor: c.bgPanel,
              borderColor: c.border,
              maxWidth: Math.min(400, width - 32),
            },
          ]}
        >
          <View style={styles.body}>
            <View style={[styles.iconCircle, { backgroundColor: c.greenDim }]}>
              <Ionicons name="checkmark-circle" size={36} color={c.green} />
            </View>
            <AppText
              style={{
                fontFamily: theme.fonts?.displayBlack || "Syne_800ExtraBold",
                fontSize: rem(1.35),
                fontWeight: "800",
                color: c.text,
                textAlign: "center",
                marginBottom: rem(0.5),
              }}
            >
              {t("retainedStaff.paymentSuccessTitle")}
            </AppText>
            <AppText
              style={{
                fontFamily: theme.fonts?.body || "DMSans_400Regular",
                fontSize: rem(0.9),
                lineHeight: rem(0.9) * 1.5,
                color: c.textDim,
                textAlign: "center",
                marginBottom: rem(2),
              }}
            >
              {t("retainedStaff.paymentSuccessBody")}
            </AppText>
            <Pressable
              onPress={onViewCycle || onClose}
              style={({ pressed }) => [
                styles.btn,
                {
                  backgroundColor: pressed ? c.orangeHover : c.orange,
                },
              ]}
            >
              <AppText
                style={{
                  fontFamily: theme.fonts?.bodyBold || "DMSans_700Bold",
                  fontSize: rem(0.9),
                  fontWeight: "700",
                  color: "#fff",
                }}
              >
                {t("retainedStaff.viewCycleDetails")}
              </AppText>
              <Ionicons
                name="arrow-forward"
                size={16}
                color="#fff"
                style={{ marginLeft: 8 }}
              />
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modal: {
    borderRadius: 16,
    borderWidth: 1,
    width: "100%",
    overflow: "hidden",
  },
  body: {
    padding: 32,
    alignItems: "center",
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    width: "100%",
  },
});
