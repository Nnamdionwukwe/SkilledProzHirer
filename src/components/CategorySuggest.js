// src/components/CategorySuggest.js
// Verbatim port of CategorySuggest.jsx + CategorySuggest.module.css
//
// Loads ALL categories via /categories?all=true (bypasses the 200 cap so
// all ~1200 + user-submitted categories are browsable).

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import AppText from "./AppText";
import { useTheme } from "../contexts/ThemeContext";
import { rem, FONTS } from "../constants/theme";
import client from "../api/client";

const POPULAR = [
  "Electrician",
  "Plumber",
  "Carpenter",
  "Cleaner",
  "Driver",
  "Web Developer",
  "Photographer",
  "Nurse",
  "Teacher",
  "Mechanic",
  "Chef",
  "Security Guard",
  "Accountant",
  "Lawyer",
  "Graphic Designer",
];

export default function CategorySuggest({
  onSelect,
  selected = [],
  placeholder,
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const c = theme.colors;

  const [query, setQuery] = useState("");
  const [allCategories, setAllCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [customName, setCustomName] = useState("");
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  // Load ALL categories
  useEffect(() => {
    let isMounted = true;
    client
      .get("/categories", { params: { all: "true" } })
      .then((res) => {
        if (!isMounted) return;
        const data = res.data?.data;
        const list = Array.isArray(data) ? data : data?.categories || [];
        setAllCategories(list);
      })
      .catch(() => {
        if (isMounted) setAllCategories([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const trimmedQuery = query.trim().toLowerCase();
  const isSearchMode = trimmedQuery.length >= 2;

  const filteredCategories = useMemo(() => {
    if (!isSearchMode) return null;
    return allCategories.filter(
      (cat) =>
        cat.name?.toLowerCase().includes(trimmedQuery) ||
        cat.description?.toLowerCase().includes(trimmedQuery),
    );
  }, [allCategories, isSearchMode, trimmedQuery]);

  const popularSet = useMemo(
    () => new Set(POPULAR.map((p) => p.toLowerCase())),
    [],
  );

  const popularCats = useMemo(
    () =>
      allCategories.filter((cat) => popularSet.has(cat.name?.toLowerCase())),
    [allCategories, popularSet],
  );

  const otherCats = useMemo(
    () =>
      allCategories
        .filter((cat) => !popularSet.has(cat.name?.toLowerCase()))
        .sort((a, b) => (a.name || "").localeCompare(b.name || "")),
    [allCategories, popularSet],
  );

  const displayList = filteredCategories
    ? filteredCategories.slice(0, 100)
    : [...popularCats, ...otherCats];

  const totalMatches = filteredCategories?.length ?? 0;

  const isSelected = (cat) => selected.some((s) => s.id === cat.id);

  const handleSelect = (cat) => {
    if (!isSelected(cat)) onSelect?.(cat);
    setQuery("");
    setShowDropdown(false);
  };

  const handleAddCustom = async () => {
    if (!customName.trim()) return;
    setAdding(true);
    setMessage("");
    try {
      const res = await client.post("/categories/suggest", {
        name: customName,
      });
      const cat = res.data?.data?.category;
      handleSelect(cat);
      setMessage(
        res.data?.data?.alreadyExists
          ? `"${cat.name}" already exists — added!`
          : `"${cat.name}" added to the platform!`,
      );
      setCustomName("");
      setAllCategories((prev) => {
        if (prev.find((x) => x.id === cat.id)) return prev;
        return [...prev, cat];
      });
    } catch {
      setMessage("Failed to add. Please try again.");
    } finally {
      setAdding(false);
    }
  };

  return (
    <View style={{ gap: 8 }}>
      {/* Search input */}
      <Pressable onPress={() => setShowDropdown(true)}>
        <View style={s.searchWrap}>
          <Ionicons
            name="search"
            size={14}
            color={c.textMuted}
            style={s.searchIcon}
          />
          <TextInput
            value={query}
            onChangeText={(v) => {
              setQuery(v);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder={
              placeholder ||
              t("workerCat.searchPlaceholder", "Search trades, professions...")
            }
            placeholderTextColor={c.textMuted}
            style={[
              s.searchInput,
              {
                backgroundColor: c.bgInput,
                borderColor: c.border,
                color: c.text,
              },
            ]}
          />
          {loading ? (
            <ActivityIndicator
              size="small"
              color={c.orange}
              style={s.searchSpinner}
            />
          ) : null}
        </View>
      </Pressable>

      {/* Dropdown Modal */}
      <Modal
        visible={showDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDropdown(false)}
      >
        <Pressable
          style={s.modalOverlay}
          onPress={() => setShowDropdown(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation?.()}
            style={[
              s.modalBox,
              { backgroundColor: c.bgPanel, borderColor: c.border },
            ]}
          >
            {/* Header */}
            <View style={[s.dropdownHeader, { borderBottomColor: c.border }]}>
              <AppText style={s.dropdownHeaderText}>
                {isSearchMode
                  ? `${totalMatches} result${totalMatches === 1 ? "" : "s"} for "${query.trim()}"`
                  : t("workerCat.popularLabel", "Browse all categories")}
              </AppText>
              {isSearchMode && totalMatches > 100 ? (
                <AppText style={[s.dropdownHeaderText, { color: c.orange }]}>
                  showing first 100
                </AppText>
              ) : !isSearchMode ? (
                <AppText style={[s.dropdownHeaderText, { color: c.orange }]}>
                  {allCategories.length} total
                </AppText>
              ) : null}
            </View>

            {/* Empty state when searching with no matches */}
            {isSearchMode && displayList.length === 0 && !loading ? (
              <View style={s.noResults}>
                <AppText style={{ fontSize: 13, color: c.textDim }}>
                  No results for "{query.trim()}"
                </AppText>
                <Pressable
                  onPress={() => {
                    setCustomName(query.trim());
                    setShowCustom(true);
                    setShowDropdown(false);
                  }}
                  style={[
                    s.addCustomInline,
                    { backgroundColor: c.orangeDim, borderColor: c.orangeGlow },
                  ]}
                >
                  <AppText
                    style={{ fontSize: 12, fontWeight: "600", color: c.orange }}
                  >
                    + Add "{query.trim()}" as new category
                  </AppText>
                </Pressable>
              </View>
            ) : (
              <FlatList
                data={displayList}
                keyExtractor={(item) => item.id}
                style={{ maxHeight: 360 }}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item: cat }) => {
                  const sel = isSelected(cat);
                  return (
                    <Pressable
                      onPress={() => handleSelect(cat)}
                      style={({ pressed }) => [
                        s.resultItem,
                        { borderBottomColor: c.border },
                        sel && { backgroundColor: c.orangeDim },
                        pressed && !sel && { backgroundColor: c.bgCard },
                      ]}
                    >
                      <AppText style={{ fontSize: 16 }}>
                        {cat.icon || "🔧"}
                      </AppText>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <AppText
                          style={{
                            fontSize: 13,
                            fontWeight: "600",
                            color: c.text,
                          }}
                          numberOfLines={1}
                        >
                          {cat.name}
                        </AppText>
                        {cat._count?.workers > 0 && (
                          <AppText style={{ fontSize: 11, color: c.textMuted }}>
                            {cat._count.workers} workers
                          </AppText>
                        )}
                      </View>
                      {sel ? (
                        <Ionicons name="checkmark" size={14} color={c.green} />
                      ) : null}
                    </Pressable>
                  );
                }}
              />
            )}

            {/* Footer */}
            <View style={[s.dropdownFooter, { borderTopColor: c.border }]}>
              <Pressable
                onPress={() => {
                  setShowCustom(!showCustom);
                  setShowDropdown(false);
                }}
              >
                <AppText
                  style={{
                    fontSize: 12,
                    color: c.textMuted,
                    textDecorationLine: "underline",
                  }}
                >
                  + Can't find your profession? Add it
                </AppText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Selected chips */}
      {selected.length > 0 ? (
        <View style={s.selectedChips}>
          {selected.map((cat) => (
            <View
              key={cat.id}
              style={[
                s.chip,
                { backgroundColor: c.orangeDim, borderColor: c.orangeGlow },
              ]}
            >
              <AppText style={{ fontSize: 12 }}>{cat.icon || "🔧"}</AppText>
              <AppText
                style={{ fontSize: 12, fontWeight: "600", color: c.orange }}
              >
                {cat.name}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}

      {/* Custom add form */}
      {showCustom ? (
        <View
          style={[
            s.customSection,
            { backgroundColor: c.bgCard, borderColor: c.border },
          ]}
        >
          <AppText style={{ fontSize: 12, color: c.textDim, marginBottom: 6 }}>
            Add your profession to the platform:
          </AppText>
          <View style={s.customRow}>
            <TextInput
              value={customName}
              onChangeText={setCustomName}
              placeholder="e.g. Drone Racing Instructor"
              placeholderTextColor={c.textMuted}
              style={[
                s.customInput,
                {
                  backgroundColor: c.bgInput,
                  borderColor: c.border,
                  color: c.text,
                },
              ]}
              autoFocus
            />
            <Pressable
              onPress={handleAddCustom}
              disabled={!customName.trim() || adding}
              style={({ pressed }) => [
                s.customBtn,
                {
                  backgroundColor: c.orange,
                  opacity:
                    !customName.trim() || adding ? 0.5 : pressed ? 0.85 : 1,
                },
              ]}
            >
              <AppText style={{ fontSize: 12, fontWeight: "700", color: c.bg }}>
                {adding ? "Adding..." : "+ Add"}
              </AppText>
            </Pressable>
            <Pressable onPress={() => setShowCustom(false)} hitSlop={8}>
              <AppText
                style={{ fontSize: 20, color: c.textMuted, lineHeight: 20 }}
              >
                ×
              </AppText>
            </Pressable>
          </View>
          {message ? (
            <AppText style={{ fontSize: 11, color: c.green, marginTop: 6 }}>
              {message}
            </AppText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  searchWrap: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
  },
  searchIcon: {
    position: "absolute",
    left: 12,
    zIndex: 1,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingLeft: 36,
    paddingRight: 36,
    fontSize: 13,
  },
  searchSpinner: {
    position: "absolute",
    right: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalBox: {
    width: "100%",
    maxWidth: 480,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  dropdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
  },
  dropdownHeaderText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "rgba(255,255,255,0.28)",
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  noResults: {
    padding: 14,
    gap: 8,
  },
  addCustomInline: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  dropdownFooter: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderTopWidth: 1,
  },
  selectedChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  customSection: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  customRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  customInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  customBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
});
