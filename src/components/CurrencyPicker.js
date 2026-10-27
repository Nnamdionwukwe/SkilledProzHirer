// src/components/CurrencyPicker.js
//
// Website reference: HirerDashboard.jsx uses <DashboardCurrencySwitch /> inside
// .headerActions next to the .ctaBtn. On desktop that pill renders as:
//   [₦] [NGN] [▾]
// with no label, borderRadius 8, min-height 40 (matching .ctaBtn), and
// gap ~6 between symbol/code/chevron. The `compact` prop turns the picker
// into exactly that. Without `compact`, it keeps the wider "label + symbol +
// code + chevron" pill used elsewhere in the app (e.g. PostJob currency step).
//
// Modal, search, and currency list are unchanged from the original.

import React, { useState, useMemo } from "react";
import {
  View,
  Pressable,
  Modal,
  FlatList,
  TextInput,
  StyleSheet,
  I18nManager,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import AppText from "./AppText";
import { useTheme } from "../contexts/ThemeContext";
import { useCurrency } from "../contexts/CurrencyContext";
import { CURRENCIES } from "../constants/currencies";

export default function CurrencyPicker({ label, compact = false }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { currency, setCurrencyCode } = useCurrency();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return CURRENCIES;
    const q = query.trim().toLowerCase();
    return CURRENCIES.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q),
    );
  }, [query]);

  const handleSelect = async (code) => {
    await setCurrencyCode(code);
    setOpen(false);
    setQuery("");
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          compact ? styles.pillCompact : styles.pill,
          {
            backgroundColor: theme.colors.bgPanel,
            borderColor: theme.colors.border,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        {!compact && label ? (
          <AppText variant="small" tone="dim" style={{ marginRight: 6 }}>
            {label}
          </AppText>
        ) : null}

        <AppText
          weight="bold"
          style={{
            color: theme.colors.orange,
            fontSize: compact ? 13 : undefined,
          }}
        >
          {currency.symbol}
        </AppText>
        <AppText
          weight="semibold"
          tone="brand"
          style={{
            marginLeft: 6,
            fontSize: compact ? 12.25 : undefined,
          }}
        >
          {currency.code}
        </AppText>
        <Ionicons
          name="chevron-down"
          size={compact ? 12 : 14}
          color={theme.colors.textDim}
          style={{ marginLeft: 6 }}
        />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          onPress={() => setOpen(false)}
          style={[styles.backdrop, { backgroundColor: "rgba(0,0,0,0.5)" }]}
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.bgPanel,
              borderTopColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.header}>
            <AppText variant="title" weight="bold">
              {t("common.currency")}
            </AppText>
            <Pressable onPress={() => setOpen(false)} hitSlop={10}>
              <Ionicons name="close" size={22} color={theme.colors.text} />
            </Pressable>
          </View>

          <View
            style={[
              styles.search,
              {
                backgroundColor: theme.colors.bgInput,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Ionicons
              name="search"
              size={16}
              color={theme.colors.textDim}
              style={{ marginRight: 8 }}
            />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t("common.search")}
              placeholderTextColor={theme.colors.textMuted}
              style={{
                flex: 1,
                color: theme.colors.text,
                fontFamily: "DMSans_400Regular",
                fontSize: 15,
                textAlign: I18nManager.isRTL ? "right" : "left",
              }}
              autoCorrect={false}
              autoCapitalize="characters"
            />
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.code}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const isActive = item.code === currency.code;
              return (
                <Pressable
                  onPress={() => handleSelect(item.code)}
                  style={({ pressed }) => [
                    styles.item,
                    {
                      borderBottomColor: theme.colors.border,
                      backgroundColor: pressed
                        ? theme.colors.bgCard
                        : "transparent",
                    },
                  ]}
                >
                  <AppText style={{ fontSize: 22, marginRight: 12 }}>
                    {item.flag}
                  </AppText>
                  <View style={{ flex: 1 }}>
                    <AppText weight="semibold">{item.code}</AppText>
                    <AppText variant="small" tone="dim">
                      {item.name}
                    </AppText>
                  </View>
                  <AppText
                    weight="bold"
                    style={{ color: theme.colors.orange, marginRight: 12 }}
                  >
                    {item.symbol}
                  </AppText>
                  {isActive ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={theme.colors.orange}
                    />
                  ) : null}
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <AppText tone="muted" align="center" style={{ marginTop: 40 }}>
                No currencies match
              </AppText>
            }
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // Default pill (wide, with optional label) — used on PostJob etc.
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  // Compact pill — matches .ctaBtn (borderRadius 8, minHeight 40) so it sits
  // flush next to Post a Job in the dashboard header. No label.
  pillCompact: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 40,
  },
  backdrop: { flex: 1 },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: "75%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  search: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
