// src/screens/main/BrowseByCategoriesScreen.js
// Endpoint: GET /categories?search=&limit=500
//           POST /categories/suggest
// Mirrors website Browse Categories page exactly.
// i18n-ready: add translations under the "categories" key in each locale file.

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import AppText from "../../components/AppText";
import { categoriesApi } from "../../api/categories";

// ─────────────────────────────────────────────────────────────────────────────
// Category Card
// ─────────────────────────────────────────────────────────────────────────────
function CategoryCard({ category, onPress, c, t }) {
  const workerCount = category._count?.workers ?? 0;
  const workerLabel =
    workerCount === 1
      ? t("categories.worker", { count: workerCount })
      : t("categories.workers", { count: workerCount });

  return (
    <Pressable
      onPress={() => onPress(category)}
      style={[
        styles.card,
        { backgroundColor: c.bgCard, borderColor: c.border },
      ]}
    >
      {/* Icon */}
      <AppText style={styles.cardIcon}>{category.icon ?? "🔧"}</AppText>

      {/* Name */}
      <AppText style={[styles.cardName, { color: c.text }]} numberOfLines={3}>
        {category.name}
      </AppText>

      {/* Worker count */}
      <AppText style={[styles.cardCount, { color: c.textMuted }]}>
        {workerLabel}
      </AppText>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Add Category Modal
// ─────────────────────────────────────────────────────────────────────────────
function AddCategoryModal({ visible, onClose, onSuccess, c, t, modalBg }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const reset = () => {
    setName("");
    setDescription("");
    setSubmitting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error(t("categories.addModal.nameRequired"));
      return;
    }
    setSubmitting(true);
    try {
      const result = await categoriesApi.suggest(name.trim());
      if (result.alreadyExists) {
        toast.error(t("categories.addModal.alreadyExists"));
        setSubmitting(false);
        return; // keep modal open so user can change the name
      }
      toast.success(t("categories.addModal.successMessage"));
      onSuccess();
      handleClose();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? t("toast.unknownError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <Pressable style={m.backdrop} onPress={handleClose}>
          <Pressable
            style={[
              m.sheet,
              { backgroundColor: modalBg, borderTopColor: c.border },
            ]}
            onPress={Keyboard.dismiss}
          >
            {/* Handle */}
            <View style={[m.handle, { backgroundColor: c.border }]} />

            {/* Header */}
            <View style={m.header}>
              <View style={{ flex: 1 }}>
                <AppText style={[m.title, { color: c.text }]}>
                  {t("categories.addModal.title")}
                </AppText>
                <AppText style={[m.subtitle, { color: c.textMuted }]}>
                  {t("categories.addModal.subtitle")}
                </AppText>
              </View>
              <Pressable
                onPress={handleClose}
                style={[
                  m.closeBtn,
                  { backgroundColor: c.bgInput, borderColor: c.border },
                ]}
              >
                <AppText style={{ color: c.text }}>✕</AppText>
              </Pressable>
            </View>

            {/* Name input */}
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t("categories.addModal.namePlaceholder")}
              placeholderTextColor={c.textMuted}
              style={[
                m.input,
                {
                  color: c.text,
                  backgroundColor: c.bgInput,
                  borderColor: name.trim() ? c.orange : c.border,
                },
              ]}
              maxLength={80}
              returnKeyType="next"
            />

            {/* Description input */}
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder={t("categories.addModal.descriptionPlaceholder")}
              placeholderTextColor={c.textMuted}
              style={[
                m.input,
                m.inputMulti,
                {
                  color: c.text,
                  backgroundColor: c.bgInput,
                  borderColor: c.border,
                },
              ]}
              multiline
              numberOfLines={3}
              maxLength={200}
            />

            {/* Footer */}
            <View style={m.footer}>
              <Pressable
                onPress={handleClose}
                style={[m.cancelBtn, { borderColor: c.border }]}
              >
                <AppText
                  variant="body"
                  weight="semibold"
                  style={{ color: c.text }}
                >
                  {t("categories.addModal.cancel")}
                </AppText>
              </Pressable>
              <Pressable
                onPress={handleSubmit}
                disabled={submitting}
                style={[
                  m.submitBtn,
                  {
                    backgroundColor: c.orange,
                    opacity: submitting ? 0.7 : 1,
                  },
                ]}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <AppText
                    variant="body"
                    weight="semibold"
                    style={{ color: "#fff" }}
                  >
                    {t("categories.addModal.submit")}
                  </AppText>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────────────────────────────────────
function Skeleton({ c }) {
  return (
    <View style={styles.grid}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <View
          key={i}
          style={[
            styles.card,
            styles.skCard,
            { backgroundColor: c.bgCard, borderColor: c.border },
          ]}
        />
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────
export default function BrowseByCategoriesScreen({ navigation }) {
  const { t } = useTranslation();
  const { theme: th } = useTheme();
  const c = th.colors;
  const { toast } = useToast();

  const modalBg = th.mode === "dark" ? "#111118" : "#ffffff";

  const [categories, setCategories] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  // ── Fetch ───────────────────────────────────────────────────────────────────
  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const data = await categoriesApi.getAll({ limit: 500 });
      setCategories(data ?? []);
      setFiltered(data ?? []); // ← keep this
    } catch {
      toast.error(t("toast.unknownError"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, []);

  // Replace the search useEffect with this:
  const searchTimer = useRef(null);

  useEffect(() => {
    const q = search.trim();

    // Clear pending search
    if (searchTimer.current) clearTimeout(searchTimer.current);

    if (!q) {
      // Empty query — reload full list
      load();
      return;
    }

    // Debounce 400ms then hit backend
    searchTimer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await categoriesApi.getAll({ search: q, limit: 500 });
        setFiltered(data ?? []);
      } catch {
        toast.error(t("toast.unknownError"));
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(searchTimer.current);
  }, [search]);

  const onRefresh = () => {
    setRefreshing(true);
    load(true);
  };

  // ── Navigate to workers filtered by category ────────────────────────────────
  const handleCategoryPress = (category) => {
    navigation.navigate("CategoryDetail", { slug: category.slug });
  };

  // ── After a new category is added, prepend it ───────────────────────────────
  const handleNewCategory = () => {
    setTimeout(() => load(), 600); // give backend time to commit
  };

  const totalCount = categories.length;

  return (
    <View style={[styles.screen, { backgroundColor: c.bg }]}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={c.orange}
          />
        }
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            {/* Page heading */}
            <View style={styles.heading}>
              <AppText style={[styles.subtitle, { color: c.textMuted }]}>
                {t("categories.subtitle", {
                  count: totalCount > 0 ? totalCount : 500,
                })}
              </AppText>
            </View>

            {/* Search + Add row */}
            <View style={styles.controlsRow}>
              <View
                style={[
                  styles.searchWrap,
                  { backgroundColor: c.bgCard, borderColor: c.border },
                ]}
              >
                <AppText style={{ color: c.textMuted, marginRight: 8 }}>
                  🔍
                </AppText>
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder={t("categories.searchPlaceholder")}
                  placeholderTextColor={c.textMuted}
                  style={[styles.searchInput, { color: c.text }]}
                  returnKeyType="search"
                  clearButtonMode="while-editing"
                />
              </View>
              <Pressable
                onPress={() => setShowAdd(true)}
                style={[styles.addBtn, { backgroundColor: c.orange }]}
              >
                <AppText
                  variant="body"
                  weight="semibold"
                  style={{ color: "#fff" }}
                >
                  {t("categories.addCategory")}
                </AppText>
              </Pressable>
            </View>

            {/* Section divider */}
            <View style={[styles.divider, { backgroundColor: c.border }]} />
          </View>
        }
        renderItem={({ item }) => (
          <CategoryCard
            category={item}
            onPress={handleCategoryPress}
            c={c}
            t={t}
          />
        )}
        ListEmptyComponent={
          loading ? (
            <Skeleton c={c} />
          ) : (
            <View style={styles.empty}>
              <AppText style={{ fontSize: 44 }}>🗂️</AppText>
              <AppText
                variant="body"
                weight="semibold"
                style={{ color: c.text, marginTop: 12 }}
              >
                {t("categories.noResults")}
              </AppText>
              <AppText
                variant="small"
                style={{ color: c.textMuted, marginTop: 6 }}
              >
                {t("categories.noResultsSub")}
              </AppText>
            </View>
          )
        }
        ListFooterComponent={<View style={{ height: 40 }} />}
      />

      {/* Add Category modal */}
      <AddCategoryModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onSuccess={handleNewCategory}
        c={c}
        t={t}
        modalBg={modalBg}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

  // Heading
  heading: { alignItems: "center", marginBottom: 24, paddingTop: 8 },
  title: {
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  subtitle: { fontSize: 15, marginTop: 6, textAlign: "center" },

  // Controls
  controlsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
    alignItems: "center",
  },
  searchWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchInput: { flex: 1, fontSize: 15 },
  addBtn: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 12,
  },

  divider: { height: StyleSheet.hairlineWidth, marginBottom: 16 },

  // Grid
  row: { gap: 12, marginBottom: 12 },
  card: {
    flex: 1,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    minHeight: 140,
    justifyContent: "flex-start",
  },
  cardIcon: { fontSize: 32, lineHeight: 44, marginBottom: 6 },
  cardName: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
    marginBottom: 8,
  },
  cardCount: { fontSize: 13 },
  skCard: { minHeight: 140, opacity: 0.4 },

  // Empty
  empty: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32 },

  // Dummy grid for skeleton
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
});

// Modal styles
const m = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    padding: 20,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  title: { fontSize: 20, fontWeight: "800" },
  subtitle: { fontSize: 13, marginTop: 4 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    marginBottom: 12,
  },
  inputMulti: {
    height: 80,
    textAlignVertical: "top",
  },
  footer: { flexDirection: "row", gap: 10, marginTop: 8 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
});
