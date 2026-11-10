// src/components/CategorySuggest.js
// Verbatim port of CategorySuggest.jsx + CategorySuggest.module.css
//
// Loads ALL categories via /categories?all=true (bypasses the 200 cap so
// all ~1200 + user-submitted categories are browsable).
//
// Layout note: the website renders the dropdown as an absolutely-positioned
// panel directly under the input (top: calc(100% + 4px), z-index: 50) with
// NO overlay, so the input stays visible and the user keeps typing while the
// list is open.
//
// RN port: the panel is rendered in a transparent <Modal> that is positioned
// directly under the input (measured via measureInWindow). The search input
// itself stays in the page — outside the Modal — so it remains visible and
// focusable while the user types. Using a Modal gives the inner FlatList its
// own gesture surface, so it scrolls independently of the page ScrollView.

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
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

// Panel max height (matches website .resultsList max-height: 260px,
// plus header + footer ≈ 360px total).
const PANEL_MAX_HEIGHT = 360;

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

  // Measured position of the search input on screen, so the Modal panel
  // can sit directly beneath it (matches website top: calc(100% + 4px)).
  const searchWrapRef = useRef(null);
  const [anchor, setAnchor] = useState(null); // { x, y, width, height }

  const measureAnchor = () => {
    const node = searchWrapRef.current;
    if (!node || typeof node.measureInWindow !== "function") return;
    node.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
    });
  };

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

  const openDropdown = () => {
    measureAnchor();
    setShowDropdown(true);
  };

  // Compute panel position from the measured anchor. If anchor is
  // unavailable (first render before layout), fall back to a reasonable
  // top-of-screen position so the panel is still usable.
  const win = Dimensions.get("window");
  const panelTop = anchor ? anchor.y + anchor.height + 4 : 120;
  const panelLeft = anchor ? anchor.x : 16;
  const panelWidth = anchor ? anchor.width : win.width - 32;

  // If the panel would run past the bottom of the screen, shrink its
  // max height so it fits (the FlatList then scrolls inside it).
  const spaceBelow = win.height - panelTop - 16;
  const panelMaxHeight = Math.max(160, Math.min(PANEL_MAX_HEIGHT, spaceBelow));

  return (
    <View style={{ gap: 8 }}>
      {/* Search input — stays in the page (outside the Modal) so the user
          can keep typing while the dropdown is open. */}
      <View ref={searchWrapRef} style={s.searchWrap} collapsable={false}>
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
            if (!showDropdown) openDropdown();
          }}
          onFocus={openDropdown}
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

      {/* Dropdown panel — rendered in a transparent Modal, anchored under
          the input. This gives the FlatList its own gesture surface so it
          scrolls independently of the page ScrollView, and the search
          input above remains visible + focusable the whole time. */}
      <Modal
        visible={showDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDropdown(false)}
      >
        {/* Backdrop: fills the screen, catches outside taps to dismiss.
            pointerEvents="box-none" would let taps pass through to the
            input, but the input is behind the Modal — so instead we
            close on backdrop tap and the user re-focuses the input. */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setShowDropdown(false)}
        />

        <View
          style={[
            s.dropdown,
            {
              backgroundColor: c.bgPanel,
              borderColor: c.border,
              position: "absolute",
              top: panelTop,
              left: panelLeft,
              width: panelWidth,
              maxHeight: panelMaxHeight,
            },
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
              style={{ flexGrow: 0 }}
              contentContainerStyle={{ paddingBottom: 4 }}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              showsVerticalScrollIndicator
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
        </View>
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

  // Panel container — position (top/left/width) is set inline from the
  // measured anchor so it sits directly under the input.
  dropdown: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
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
