// src/screens/main/worker/WorkerCategoriesScreen.js
// Verbatim port of Categories.jsx + Categories.module.css

import React, { useCallback, useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import AppText from "../../../components/AppText";
import Skeleton from "../../../components/Skeleton";
import CategorySuggest from "../../../components/CategorySuggest";
import { useTheme } from "../../../contexts/ThemeContext";
import { useAuthStore } from "../../../store/authStore";
import { rem, FONTS } from "../../../constants/theme";
import client from "../../../api/client";

export default function WorkerCategoriesScreen() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { theme } = useTheme();
  const c = theme.colors;
  const { width } = useWindowDimensions();
  const isTiny = width <= 400;

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Confirm modal — stores the full category object so the name always resolves
  const [confirmState, setConfirmState] = useState(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await client.get(`/workers/${user.id}`);
      const wcs = res.data?.data?.worker?.categories || [];
      setCategories(wcs);
      setSelected(wcs.map((wc) => wc.category).filter(Boolean));
    } catch {}
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSelect = async (cat) => {
    if (
      categories.find(
        (wc) => wc.category?.id === cat.id || wc.categoryId === cat.id,
      )
    ) {
      setError(`${cat.name} is already in your list.`);
      setTimeout(() => setError(""), 3000);
      return;
    }

    setSaving(cat.id);
    setError("");
    setSuccess("");
    try {
      await client.post("/workers/categories", {
        categoryId: cat.id,
        isPrimary: categories.length === 0,
      });
      await load();
      setSuccess(`${cat.name} added successfully!`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add category.");
    } finally {
      setSaving(null);
    }
  };

  // Resolve the display name from whichever shape the link came in as,
  // and keep the whole object so the modal can show it reliably.
  const requestRemove = (linkId, cat) =>
    setConfirmState({
      linkId,
      name: cat?.name ?? cat?.category?.name ?? cat?.slug ?? "this category",
    });
  const cancelRemove = () => setConfirmState(null);

  const confirmRemove = async () => {
    if (!confirmState) return;
    const { linkId, name } = confirmState;
    setRemoving(linkId);
    setError("");
    setSuccess("");
    setConfirmState(null);
    try {
      await client.delete(`/workers/categories/${linkId}`);
      await load();
      setSuccess(`${name} removed.`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to remove category.");
    } finally {
      setRemoving(null);
    }
  };

  const handleSetPrimary = async (categoryId) => {
    try {
      await client.post("/workers/categories", {
        categoryId,
        isPrimary: true,
      });
      await load();
    } catch {}
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={s.page}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View>
        <AppText
          variant="title"
          weight="displayBlack"
          style={[s.title, { color: c.text }]}
        >
          {t("workerCat.title", "My Trade Categories")}
        </AppText>
        <AppText style={[s.sub, { color: c.textDim }]}>
          {t(
            "workerCat.subtitle",
            "Add the trades and professions you offer. Search from 1200+ categories or add your own.",
          )}
        </AppText>
      </View>

      {/* Alerts */}
      {error ? (
        <View
          style={[s.alert, { backgroundColor: c.redDim, borderColor: c.red }]}
        >
          <Ionicons name="warning-outline" size={14} color={c.red} />
          <AppText
            style={{ fontSize: 12, color: c.red, flex: 1, marginLeft: 6 }}
          >
            {error}
          </AppText>
        </View>
      ) : null}
      {success ? (
        <View
          style={[
            s.alert,
            { backgroundColor: c.greenDim, borderColor: c.green },
          ]}
        >
          <Ionicons name="checkmark-circle-outline" size={14} color={c.green} />
          <AppText
            style={{ fontSize: 12, color: c.green, flex: 1, marginLeft: 6 }}
          >
            {success}
          </AppText>
        </View>
      ) : null}

      {/* Picker card */}
      <View
        style={[s.card, { backgroundColor: c.bgPanel, borderColor: c.border }]}
      >
        <AppText
          variant="title"
          weight="displayBlack"
          style={[s.cardTitle, { color: c.text }]}
        >
          {t("workerCat.addTitle", "Add a Category")}
        </AppText>
        <AppText style={[s.cardSub, { color: c.textDim }]}>
          {t(
            "workerCat.addSub",
            "Search for your trade — it's already in our database, or add a custom one if you can't find it.",
          )}
        </AppText>

        <CategorySuggest
          onSelect={handleSelect}
          selected={selected}
          placeholder={t(
            "workerCat.searchPlaceholder",
            "Search plumber, electrician, developer...",
          )}
        />

        {saving ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              marginTop: 8,
            }}
          >
            <Ionicons name="sync" size={13} color={c.textMuted} />
            <AppText style={{ fontSize: 12, color: c.textMuted }}>
              Adding category...
            </AppText>
          </View>
        ) : null}
      </View>

      {/* Current categories */}
      <View
        style={[s.card, { backgroundColor: c.bgPanel, borderColor: c.border }]}
      >
        <View style={s.listHeader}>
          <AppText
            variant="title"
            weight="displayBlack"
            style={[s.cardTitle, { color: c.text }]}
          >
            {t("workerCat.myCategories", "My Categories")}
          </AppText>
          <View
            style={[
              s.countBadge,
              { backgroundColor: c.orangeDim, borderColor: c.orangeGlow },
            ]}
          >
            <AppText
              style={{ fontSize: 11, fontWeight: "700", color: c.orange }}
            >
              {categories.length}
            </AppText>
          </View>
        </View>

        {loading ? (
          <View style={{ gap: 8 }}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} width="100%" height={62} radius={10} />
            ))}
          </View>
        ) : categories.length === 0 ? (
          <View style={s.empty}>
            <Ionicons
              name="construct-outline"
              size={32}
              color={c.textMuted}
              style={{ marginBottom: 4 }}
            />
            <AppText style={{ fontSize: 15, fontWeight: "600", color: c.text }}>
              {t("workerCat.noCategoriesTitle", "No categories yet")}
            </AppText>
            <AppText
              style={{
                fontSize: 13,
                color: c.textDim,
                textAlign: "center",
                maxWidth: 320,
              }}
            >
              {t(
                "workerCat.noCategoriesSub",
                "Search and add your trade above to appear in search results",
              )}
            </AppText>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {categories.map((wc) => {
              const cat = wc.category || wc;
              const catId = wc.categoryId || cat.id;
              const linkId = wc.id;
              const isPrimary = wc.isPrimary;

              return (
                <View
                  key={linkId || catId}
                  style={[
                    s.catRow,
                    {
                      backgroundColor: isPrimary ? c.orangeDim : c.bgCard,
                      borderColor: isPrimary ? c.orangeGlow : c.border,
                    },
                  ]}
                >
                  <View style={s.catLeft}>
                    <Ionicons
                      name="construct"
                      size={18}
                      color={isPrimary ? c.orange : c.textDim}
                    />
                    <View style={{ marginLeft: 12, minWidth: 0 }}>
                      <AppText
                        style={{
                          fontSize: 13,
                          fontWeight: "600",
                          color: c.text,
                        }}
                        numberOfLines={1}
                      >
                        {cat?.name}
                      </AppText>
                      <AppText
                        style={{ fontSize: 11, color: c.textMuted }}
                        numberOfLines={1}
                      >
                        {cat?.slug}
                      </AppText>
                    </View>
                  </View>

                  <View style={s.catRight}>
                    {isPrimary ? (
                      <View
                        style={[
                          s.primaryBadge,
                          {
                            backgroundColor: c.orangeDim,
                            borderColor: c.orangeGlow,
                          },
                        ]}
                      >
                        <Ionicons name="star" size={11} color={c.orange} />
                        <AppText
                          style={{
                            fontSize: 11,
                            fontWeight: "700",
                            color: c.orange,
                          }}
                        >
                          {t("workerCat.primary", "Primary")}
                        </AppText>
                      </View>
                    ) : (
                      <Pressable
                        onPress={() => handleSetPrimary(catId)}
                        style={({ pressed }) => [
                          s.setPrimaryBtn,
                          {
                            borderColor: c.border,
                            opacity: pressed ? 0.85 : 1,
                          },
                        ]}
                      >
                        <Ionicons
                          name="star-outline"
                          size={12}
                          color={c.textMuted}
                        />
                        <AppText style={{ fontSize: 11, color: c.textMuted }}>
                          {t("workerCat.setPrimary", "Set Primary")}
                        </AppText>
                      </Pressable>
                    )}

                    <Pressable
                      disabled={removing === linkId}
                      onPress={() => requestRemove(linkId, cat)}
                      style={({ pressed }) => [
                        s.removeBtn,
                        {
                          borderColor: pressed ? c.red : c.border,
                          backgroundColor: pressed ? c.redDim : "transparent",
                        },
                      ]}
                    >
                      {removing === linkId ? (
                        <Ionicons name="sync" size={14} color={c.textMuted} />
                      ) : (
                        <Ionicons name="close" size={14} color={c.textMuted} />
                      )}
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Confirm-remove modal — mirrors the website .modalBox:
          column layout, icon on top, centered title + text, button row. */}
      <Modal
        visible={!!confirmState}
        transparent
        animationType="fade"
        onRequestClose={cancelRemove}
      >
        <Pressable style={s.modalOverlay} onPress={cancelRemove}>
          <Pressable
            onPress={(e) => e.stopPropagation?.()}
            style={[
              s.modalBox,
              {
                backgroundColor: c.bgPanel,
                borderColor: c.border,
                paddingHorizontal: isTiny ? 20 : 24,
                paddingTop: isTiny ? 24 : 28,
                paddingBottom: isTiny ? 20 : 24,
              },
            ]}
          >
            <View
              style={[
                s.modalIconWrap,
                {
                  backgroundColor: c.redDim,
                  borderColor: "rgba(239,68,68,0.3)",
                },
                isTiny && { width: 46, height: 46, marginBottom: 12 },
              ]}
            >
              <Ionicons
                name="warning-outline"
                size={isTiny ? 20 : 24}
                color={c.red}
              />
            </View>

            <AppText
              variant="title"
              weight="displayBlack"
              style={[
                s.modalTitle,
                { color: c.text },
                isTiny && { fontSize: 17 },
              ]}
            >
              {t("workerCat.removeConfirmTitle", "Remove category?")}
            </AppText>

            <AppText
              style={[
                s.modalText,
                { color: c.textDim },
                isTiny && { fontSize: 13, marginBottom: 20 },
              ]}
            >
              <AppText style={{ fontWeight: "700", color: c.text }}>
                {confirmState?.name}
              </AppText>{" "}
              {t(
                "workerCat.removeConfirm",
                "will be removed from your trade list. You can always add it back later.",
              )}
            </AppText>

            <View
              style={[
                s.modalActions,
                isTiny && { flexDirection: "column-reverse", gap: 8 },
              ]}
            >
              <Pressable
                onPress={cancelRemove}
                style={({ pressed }) => [
                  s.modalCancelBtn,
                  {
                    borderColor: c.borderHover,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <AppText
                  style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: c.textDim,
                  }}
                >
                  Keep it
                </AppText>
              </Pressable>

              <Pressable
                onPress={confirmRemove}
                style={({ pressed }) => [
                  s.modalConfirmBtn,
                  { backgroundColor: c.red, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <AppText
                  style={{ fontSize: 13, fontWeight: "700", color: "#fff" }}
                >
                  Yes, remove
                </AppText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: {
    padding: rem(1.25),
    paddingBottom: rem(6),
    gap: 24,
    maxWidth: 1200,
    alignSelf: "center",
    width: "100%",
  },
  title: {
    fontSize: 28,
    letterSpacing: -0.8,
    lineHeight: 32,
    marginBottom: 4,
  },
  sub: {
    fontSize: 13,
  },
  alert: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 24,
  },
  cardTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 13,
    marginBottom: 16,
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  countBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 6,
  },
  catRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    gap: 12,
  },
  catLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },
  catRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  primaryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  setPrimaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  removeBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Confirm modal (mirrors the website .modalBox stack) ────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalBox: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 16,
    borderWidth: 1,
    // Column stack: icon → title → text → actions.
    flexDirection: "column",
    alignItems: "center",
  },
  modalIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 8,
  },
  modalText: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  modalCancelBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalConfirmBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
