// src/components/ConfirmModal.js
// Platform-native confirmation modal — replaces Alert.alert() everywhere.
// Matches the app's dark/light theme and orange accent.

import React from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import AppText from "./AppText";
import { useTheme } from "../contexts/ThemeContext";

/**
 * Usage:
 *   const [modal, setModal] = useState(null);
 *
 *   <ConfirmModal
 *     visible={!!modal}
 *     title={modal?.title}
 *     message={modal?.message}
 *     confirmLabel={modal?.confirmLabel}
 *     destructive={modal?.destructive}
 *     onConfirm={() => { modal?.onConfirm?.(); setModal(null); }}
 *     onCancel={() => setModal(null)}
 *   />
 *
 *   // To show:
 *   setModal({
 *     title: "Mark job as filled?",
 *     confirmLabel: "Yes, mark filled",
 *     destructive: true,
 *     onConfirm: () => doSomething(),
 *   });
 */
export default function ConfirmModal({
  visible = false,
  title = "",
  message = "",
  confirmLabel = "Yes",
  cancelLabel = "No",
  destructive = false,
  onConfirm,
  onCancel,
}) {
  const { theme: th } = useTheme();
  const c = th.colors;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onCancel}>
        {/* Stop event bubbling so tapping the card itself doesn't close */}
        <Pressable
          style={[
            styles.card,
            {
              backgroundColor: c.bgPanel,
              borderColor: c.border,
              shadowColor: c.shadow,
            },
          ]}
          onPress={() => {}}
        >
          {/* Title */}
          <AppText
            variant="title"
            weight="semibold"
            style={[styles.title, { color: c.text }]}
          >
            {title}
          </AppText>

          {/* Optional message */}
          {!!message && (
            <AppText variant="body" tone="dim" style={styles.message}>
              {message}
            </AppText>
          )}

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: c.border }]} />

          {/* Buttons */}
          <View style={styles.btnRow}>
            {/* Cancel */}
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [
                styles.btn,
                styles.cancelBtn,
                { borderColor: c.border, backgroundColor: c.bgCard },
                pressed && { opacity: 0.7 },
              ]}
            >
              <AppText variant="body" weight="semibold" tone="dim">
                {cancelLabel}
              </AppText>
            </Pressable>

            {/* Confirm */}
            <Pressable
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.btn,
                styles.confirmBtn,
                {
                  backgroundColor: destructive ? c.red : c.orange,
                },
                pressed && { opacity: 0.85 },
              ]}
            >
              <AppText
                variant="body"
                weight="semibold"
                style={{ color: "#fff" }}
              >
                {confirmLabel}
              </AppText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  card: {
    width: "100%",
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
  },
  title: { textAlign: "center" },
  message: { textAlign: "center", marginTop: 8 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 20 },
  btnRow: { flexDirection: "row", gap: 10 },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtn: { borderWidth: 1 },
  confirmBtn: {},
});
