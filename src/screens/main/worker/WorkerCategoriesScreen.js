// src/screens/main/worker/WorkerCategoriesScreen.js
// Mirrors: website /worker/categories
// APIs:
//   GET  /workers/:id                           → worker.categories
//   POST /workers/categories { categoryId, isPrimary }
//   DELETE /workers/categories/:categoryId
//   GET  /categories?q=&limit=                  → search/popular list
//   POST /categories/suggest { name }           → suggest custom category

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import AppText from "../../../components/AppText";
import { useTheme } from "../../../contexts/ThemeContext";
import { useToast } from "../../../contexts/ToastContext";
import { useAuthStore } from "../../../store/authStore";
import { categoriesApi } from "../../../api/categories";
import { useTranslation } from "react-i18next";
import client from "../../../api/client";

const POPULAR_LIMIT = 12;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ─── Category pill (selected categories shown above search results) ───────────
function Pill({ cat, c }) {
  return (
    <View
      style={[
        pl.pill,
        {
          backgroundColor: "rgba(249,115,22,0.18)",
          borderColor: "rgba(249,115,22,0.5)",
        },
      ]}
    >
      <AppText style={{ fontSize: 12, marginRight: 4 }}>
        {cat.icon ?? "🔧"}
      </AppText>
      <AppText
        variant="small"
        weight="semibold"
        style={{ color: c.orange }}
        numberOfLines={1}
      >
        {cat.name}
      </AppText>
    </View>
  );
}
const pl = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
});

// ─── Search result row ────────────────────────────────────────────────────────
function ResultRow({ cat, isAdded, onPress, c }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        rr.row,
        {
          borderBottomColor: c.border,
          backgroundColor: isAdded ? "rgba(249,115,22,0.06)" : "transparent",
        },
      ]}
    >
      <AppText style={{ fontSize: 22, marginRight: 12, width: 30 }}>
        {cat.icon ?? "🔧"}
      </AppText>
      <View style={{ flex: 1 }}>
        <AppText variant="body" weight="semibold" style={{ color: c.text }}>
          {cat.name}
        </AppText>
        {cat._count?.workers != null && (
          <AppText variant="small" tone="dim">
            {cat._count.workers} workers
          </AppText>
        )}
      </View>
      {isAdded && <Ionicons name="checkmark" size={18} color="#22c55e" />}
    </Pressable>
  );
}
const rr = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});

// ─── Category list row ────────────────────────────────────────────────────────
function CatRow({ wc, onSetPrimary, onRemove, removing, settingPrimary, c }) {
  const { t } = useTranslation();
  const cat = wc.category ?? wc;
  const catId = wc.categoryId ?? cat.id;
  const isPrim = wc.isPrimary;

  return (
    <View
      style={[
        cr.row,
        {
          borderColor: isPrim ? "rgba(249,115,22,0.4)" : c.border,
          backgroundColor: isPrim ? "rgba(249,115,22,0.08)" : c.bgCard,
        },
      ]}
    >
      <View style={cr.left}>
        <AppText style={{ fontSize: 28, marginRight: 12, width: 36 }}>
          {cat.icon ?? "🔧"}
        </AppText>
        <View style={{ flex: 1 }}>
          <AppText
            variant="body"
            weight="semibold"
            style={{ color: c.text }}
            numberOfLines={1}
          >
            {cat.name}
          </AppText>
          <AppText variant="small" tone="dim" numberOfLines={1}>
            {cat.slug}
          </AppText>
        </View>
      </View>

      <View style={cr.right}>
        {isPrim ? (
          <View style={[cr.primaryBadge, { backgroundColor: c.orange }]}>
            <AppText style={{ fontSize: 11 }}>⭐</AppText>
            <AppText
              variant="small"
              weight="semibold"
              style={{ color: "#fff", marginLeft: 4 }}
            >
              {t("workerCat.primary")}
            </AppText>
          </View>
        ) : (
          <Pressable
            onPress={() => onSetPrimary(catId)}
            disabled={settingPrimary === catId}
            style={[cr.setPrimBtn, { borderColor: c.border }]}
          >
            {settingPrimary === catId ? (
              <ActivityIndicator size="small" color={c.orange} />
            ) : (
              <AppText variant="small" style={{ color: c.text }}>
                {t("workerCat.setPrimary")}
              </AppText>
            )}
          </Pressable>
        )}

        <Pressable
          onPress={() => onRemove(catId, cat.name)}
          disabled={removing === catId}
          style={[cr.removeBtn, { borderColor: c.border }]}
        >
          {removing === catId ? (
            <ActivityIndicator size="small" color="#ef4444" />
          ) : (
            <AppText style={{ color: c.textMuted, fontSize: 14 }}>✕</AppText>
          )}
        </Pressable>
      </View>
    </View>
  );
}
const cr = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  left: { flexDirection: "row", alignItems: "center", flex: 1 },
  right: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 0 },
  primaryBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  setPrimBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  removeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function WorkerCategoriesScreen() {
  const { theme: th } = useTheme();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const c = th.colors;

  // ── Worker categories ───────────────────────────────────────────────────────
  const [myCategories, setMyCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [settingPrim, setSettingPrim] = useState(null);
  const [adding, setAdding] = useState(null);

  // ── Search / dropdown ───────────────────────────────────────────────────────
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState([]);
  const [totalCats, setTotalCats] = useState(0);
  const [searching, setSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const inputRef = useRef(null);

  // ── Custom add ──────────────────────────────────────────────────────────────
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [addingCustom, setAddingCustom] = useState(false);

  // ── Load worker categories ──────────────────────────────────────────────────
  const loadMyCategories = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await client.get(`/workers/${user.id}`);
      const worker = res.data.data?.worker ?? res.data.data ?? {};
      setMyCategories(worker.categories ?? []);
    } catch {
      toast.error(t("workerCat.addFail"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadMyCategories();
  }, [loadMyCategories]);

  // ── Load popular categories ─────────────────────────────────────────────────
  const loadPopular = useCallback(async () => {
    setSearching(true);
    try {
      const res = await client.get("/categories", {
        params: { limit: POPULAR_LIMIT },
      });
      const d = res.data.data ?? res.data;
      setResults(d.categories ?? d.data ?? (Array.isArray(d) ? d : []));
      setTotalCats(d.total ?? d.count ?? 0);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  // ── Debounced search ────────────────────────────────────────────────────────
  const doSearch = useCallback(
    debounce(async (q) => {
      if (!q.trim()) {
        loadPopular();
        return;
      }
      setSearching(true);
      try {
        const res = await client.get("/categories", {
          params: { q: q.trim(), limit: 20 },
        });
        const d = res.data.data ?? res.data;
        setResults(d.categories ?? d.data ?? (Array.isArray(d) ? d : []));
        setTotalCats(d.total ?? 0);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350),
    [loadPopular],
  );

  useEffect(() => {
    if (dropdownOpen) doSearch(searchText);
  }, [searchText]);

  const openDropdown = () => {
    setDropdownOpen(true);
    loadPopular();
  };

  const closeDropdown = () => {
    setDropdownOpen(false);
    setSearchText("");
    setShowCustom(false);
  };

  // ── Add existing category ───────────────────────────────────────────────────
  const handleAdd = async (cat) => {
    const alreadyAdded = myCategories.find(
      (wc) => (wc.category?.id ?? wc.categoryId) === cat.id,
    );
    if (alreadyAdded) {
      toast.error(t("workerCat.alreadyAdded", { name: cat.name }));
      return;
    }
    setAdding(cat.id);
    try {
      await client.post("/workers/categories", {
        categoryId: cat.id,
        isPrimary: myCategories.length === 0,
      });
      await loadMyCategories();
      toast.success(t("workerCat.addSuccess", { name: cat.name }));
    } catch (err) {
      toast.error(err?.response?.data?.message ?? t("workerCat.addFail"));
    } finally {
      setAdding(null);
    }
  };

  // ── Add as new (suggest) ────────────────────────────────────────────────────
  const handleAddNew = async (name) => {
    if (!name.trim()) return;
    setAddingCustom(true);
    try {
      const cat = await categoriesApi.suggest(name.trim());
      await client.post("/workers/categories", {
        categoryId: cat.id,
        isPrimary: myCategories.length === 0,
      });
      await loadMyCategories();
      toast.success(`${cat.name} added!`);
      setCustomName("");
      setShowCustom(false);
      closeDropdown();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Failed to add category.");
    } finally {
      setAddingCustom(false);
    }
  };

  // ── Remove ──────────────────────────────────────────────────────────────────
  const handleRemove = (catId, name) => {
    Alert.alert(
      t("workerCat.removeConfirmTitle"),
      t("workerCat.removeConfirm", { name }),
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setRemoving(catId);
            try {
              await client.delete(`/workers/categories/${catId}`);
              await loadMyCategories();
              toast.success(t("workerCat.removeSuccess", { name }));
            } catch {
              toast.error(t("workerCat.removeFail"));
            } finally {
              setRemoving(null);
            }
          },
        },
      ],
    );
  };

  // ── Set primary ─────────────────────────────────────────────────────────────
  const handleSetPrimary = async (catId) => {
    setSettingPrim(catId);
    try {
      await client.post("/workers/categories", {
        categoryId: catId,
        isPrimary: true,
      });
      await loadMyCategories();
    } catch {
      toast.error(t("workerCat.primaryFail"));
    } finally {
      setSettingPrim(null);
    }
  };

  // ── Derived ─────────────────────────────────────────────────────────────────
  const myIds = new Set(
    myCategories.map((wc) => wc.category?.id ?? wc.categoryId),
  );
  const myCats = myCategories.map((wc) => wc.category ?? wc); // for pills
  const noResults = !searching && searchText.trim() && results.length === 0;

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadMyCategories();
          }}
          tintColor={c.orange}
        />
      }
    >
      {/* ── Page header ── */}
      <AppText weight="displayBlack" style={[s.pageTitle, { color: c.text }]}>
        {t("workerCat.title")}
      </AppText>
      <AppText
        variant="body"
        tone="dim"
        style={{ marginBottom: 20, lineHeight: 22 }}
      >
        {t("workerCat.subtitle", { count: "800" })}
      </AppText>

      {/* ═══ ADD CATEGORY CARD ═══ */}
      <View
        style={[s.card, { backgroundColor: c.bgCard, borderColor: c.border }]}
      >
        <AppText
          variant="title"
          weight="semibold"
          style={{ color: c.text, marginBottom: 4 }}
        >
          {t("workerCat.addTitle")}
        </AppText>
        <AppText variant="small" tone="dim" style={{ marginBottom: 14 }}>
          {t("workerCat.addSub")}
        </AppText>

        {/* Search input */}
        <View
          style={[
            s.searchBox,
            {
              backgroundColor: c.bgInput,
              borderColor: dropdownOpen ? c.orange : c.border,
              borderWidth: dropdownOpen ? 1.5 : 1,
            },
          ]}
        >
          <Ionicons
            name="search"
            size={16}
            color={c.textMuted}
            style={{ marginRight: 8 }}
          />
          <TextInput
            ref={inputRef}
            value={searchText}
            onChangeText={setSearchText}
            onFocus={openDropdown}
            placeholder={t("workerCat.searchPlaceholder")}
            placeholderTextColor={c.textMuted}
            style={{ flex: 1, color: c.text, fontSize: 15 }}
            returnKeyType="search"
          />
          {searching ? (
            <ActivityIndicator
              size="small"
              color={c.orange}
              style={{ marginLeft: 8 }}
            />
          ) : dropdownOpen ? (
            <Pressable
              onPress={closeDropdown}
              hitSlop={8}
              style={{ marginLeft: 8 }}
            >
              <Ionicons name="close" size={18} color={c.textMuted} />
            </Pressable>
          ) : null}
        </View>

        {/* Selected pills (always visible above dropdown) */}
        {myCats.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: 12 }}
            contentContainerStyle={{ paddingBottom: 2 }}
          >
            {myCats.map((cat) => (
              <Pill key={cat?.id ?? cat?.name} cat={cat} c={c} />
            ))}
          </ScrollView>
        )}

        {/* Dropdown: search results or popular */}
        {dropdownOpen && (
          <View
            style={[
              s.dropdown,
              { backgroundColor: c.bgPanel, borderColor: c.border },
            ]}
          >
            {/* Header */}
            {!searchText.trim() && !searching && (
              <View style={[s.dropHeader, { borderBottomColor: c.border }]}>
                <AppText
                  variant="small"
                  weight="semibold"
                  style={{
                    color: c.textMuted,
                    letterSpacing: 0.8,
                    fontSize: 11,
                  }}
                >
                  {t("workerCat.popularLabel")}
                </AppText>
                {totalCats > 0 && (
                  <AppText
                    variant="small"
                    weight="semibold"
                    style={{ color: c.orange }}
                  >
                    {totalCats.toLocaleString()} TOTAL
                  </AppText>
                )}
              </View>
            )}

            {/* Loading */}
            {searching && (
              <View style={{ paddingVertical: 20, alignItems: "center" }}>
                <ActivityIndicator color={c.orange} />
              </View>
            )}

            {/* No results */}
            {noResults && (
              <View style={{ padding: 16 }}>
                <AppText variant="body" tone="dim" style={{ marginBottom: 12 }}>
                  No results for "{searchText}"
                </AppText>
                <Pressable
                  onPress={() => handleAddNew(searchText)}
                  disabled={!!addingCustom}
                  style={[s.addNewBtn, { backgroundColor: c.orange }]}
                >
                  {addingCustom ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <AppText
                      variant="body"
                      weight="semibold"
                      style={{ color: "#fff" }}
                    >
                      {t("workerCat.addNew", { name: searchText })}
                    </AppText>
                  )}
                </Pressable>
              </View>
            )}

            {/* Results list */}
            {!searching &&
              results.length > 0 &&
              results.map((cat) => (
                <ResultRow
                  key={cat.id}
                  cat={cat}
                  isAdded={myIds.has(cat.id)}
                  onPress={() => handleAdd(cat)}
                  c={c}
                />
              ))}

            {/* Custom add link */}
            <Pressable
              onPress={() => {
                setShowCustom(true);
                setDropdownOpen(false);
                setSearchText("");
              }}
              style={{ padding: 14 }}
            >
              <AppText variant="small" style={{ color: c.textMuted }}>
                {t("workerCat.cantFind")}
              </AppText>
            </Pressable>
          </View>
        )}

        {/* Custom add form */}
        {showCustom && (
          <View
            style={[
              s.customForm,
              { backgroundColor: c.bgPanel, borderColor: c.border },
            ]}
          >
            <AppText
              variant="small"
              weight="semibold"
              style={{ color: c.textMuted, marginBottom: 10 }}
            >
              {t("workerCat.customPrompt")}
            </AppText>
            <View
              style={{ flexDirection: "row", gap: 8, alignItems: "center" }}
            >
              <TextInput
                value={customName}
                onChangeText={setCustomName}
                placeholder={t("workerCat.customPlaceholder")}
                placeholderTextColor={c.textMuted}
                style={[
                  s.customInput,
                  {
                    color: c.text,
                    borderColor: c.orange,
                    backgroundColor: c.bgInput,
                    flex: 1,
                  },
                ]}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={() => handleAddNew(customName)}
              />
              <Pressable
                onPress={() => handleAddNew(customName)}
                disabled={!customName.trim() || !!addingCustom}
                style={[
                  s.addCustomBtn,
                  {
                    backgroundColor: customName.trim() ? c.orange : c.bgPanel,
                    opacity: customName.trim() ? 1 : 0.6,
                  },
                ]}
              >
                {addingCustom ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <AppText
                    variant="small"
                    weight="semibold"
                    style={{ color: "#fff" }}
                  >
                    + Add
                  </AppText>
                )}
              </Pressable>
              <Pressable
                onPress={() => {
                  setShowCustom(false);
                  setCustomName("");
                }}
                style={[s.closeCustomBtn, { borderColor: c.border }]}
              >
                <AppText style={{ color: c.textMuted }}>✕</AppText>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {/* ═══ MY CATEGORIES LIST ═══ */}
      <View
        style={[
          s.card,
          { backgroundColor: c.bgCard, borderColor: c.border, marginTop: 16 },
        ]}
      >
        <View style={s.listHeader}>
          <AppText variant="title" weight="semibold" style={{ color: c.text }}>
            {t("workerCat.myCategories")}
          </AppText>
          <View style={[s.countBadge, { backgroundColor: c.orange }]}>
            <AppText
              variant="small"
              weight="semibold"
              style={{ color: "#fff" }}
            >
              {myCategories.length}
            </AppText>
          </View>
        </View>

        {loading ? (
          <View style={{ gap: 10, marginTop: 8 }}>
            {[1, 2, 3].map((i) => (
              <View
                key={i}
                style={[s.skeleton, { backgroundColor: c.bgPanel }]}
              />
            ))}
          </View>
        ) : myCategories.length === 0 ? (
          <View style={s.empty}>
            <AppText style={{ fontSize: 48, marginBottom: 12 }}>🔧</AppText>
            <AppText
              variant="body"
              weight="semibold"
              style={{ color: c.text, marginBottom: 6 }}
            >
              {t("workerCat.noCategoriesTitle")}
            </AppText>
            <AppText variant="small" tone="dim" style={{ textAlign: "center" }}>
              {t("workerCat.noCategoriesSub")}
            </AppText>
          </View>
        ) : (
          myCategories.map((wc) => (
            <CatRow
              key={wc.id ?? wc.categoryId}
              wc={wc}
              onSetPrimary={handleSetPrimary}
              onRemove={handleRemove}
              removing={removing}
              settingPrimary={settingPrim}
              c={c}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  pageTitle: { fontSize: 36, lineHeight: 42, marginBottom: 6 },
  card: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 52,
  },

  dropdown: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 12,
    overflow: "hidden",
  },
  dropHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  addNewBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
  },

  customForm: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginTop: 12,
  },
  customInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 44,
    fontSize: 14,
  },
  addCustomBtn: {
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  closeCustomBtn: {
    width: 36,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  countBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  skeleton: { height: 64, borderRadius: 14, opacity: 0.4 },
  empty: { alignItems: "center", paddingVertical: 40 },
});
