// src/screens/main/CategoriesBrowseScreen.js
//
// Port of pages/categories/CategoriesBrowse.jsx (verbatim behavior).
// Debounced search (300ms), stale-response guarding via requestIdRef,
// pagination via "Show more", add-category form with full error-status
// branch handling (429/400/401/403/5xx).
//
// FIXES vs web:
//   - Link → useNavigation
//   - window.scrollTo → listRef.current.scrollToOffset
//   - <form> submit → Keyboard.submit + button onPress
//   - Grid → 2-col FlatList grid
//   - FiX literal space children hardened against RN "Text strings" error

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import AppText from "../../components/AppText";
import Skeleton from "../../components/Skeleton";
import { useTheme } from "../../contexts/ThemeContext";
import client from "../../api/client";
import {
  FaArrowLeft,
  FaSearch,
  FaPlus,
  FaX,
  FaTag,
  FaCheckCircle,
  FaAlertCircle,
  FaUsers,
} from "../../icons/fa";

const PAGE_SIZE = 100;
const SEARCH_DEBOUNCE = 300;

export default function CategoriesBrowseScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const c = theme.colors;

  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  // Add-category form state
  const [showSuggest, setShowSuggest] = useState(false);
  const [suggestName, setSuggestName] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [suggestMsg, setSuggestMsg] = useState("");
  const [suggestMsgKind, setSuggestMsgKind] = useState("error");

  const requestIdRef = useRef(0);
  const listRef = useRef(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Fetch a specific page
  const fetchPage = useCallback(
    async (pageToFetch, { replace = false } = {}) => {
      const myRequestId = ++requestIdRef.current;

      if (replace) setLoading(true);
      else setLoadingMore(true);
      setLoadError("");

      try {
        const res = await client.get("/categories", {
          params: {
            page: pageToFetch,
            limit: PAGE_SIZE,
            ...(search ? { search } : {}),
          },
        });

        if (myRequestId !== requestIdRef.current) return;

        const data = res.data.data || {};
        const list = data.categories || [];

        setCategories((prev) => (replace ? list : [...prev, ...list]));
        setTotal(data.total ?? list.length);
        setPages(data.pages ?? 1);
        setPage(data.page ?? pageToFetch);
      } catch (err) {
        if (myRequestId !== requestIdRef.current) return;
        if (__DEV__)
          console.log("[CategoriesBrowse] fetch failed:", err?.message);
        setLoadError("Couldn't load categories. Please try again.");
      } finally {
        if (myRequestId === requestIdRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [search],
  );

  // Load page 1 when search changes
  useEffect(() => {
    fetchPage(1, { replace: true });
    listRef.current?.scrollToOffset?.({ offset: 0, animated: false });
  }, [search, fetchPage]);

  const hasMore = page < pages;

  const handleShowMore = () => {
    if (loadingMore || !hasMore) return;
    fetchPage(page + 1, { replace: false });
  };

  // Submit category
  const handleSuggest = async () => {
    Keyboard.dismiss();
    if (!suggestName.trim()) return;

    const submitted = suggestName.trim();
    setSuggesting(true);
    setSuggestMsg("");
    setSuggestMsgKind("error");

    try {
      const res = await client.post("/categories/suggest", { name: submitted });

      const payload = res?.data?.data ?? res?.data ?? {};
      const category = payload.category ?? payload;
      const alreadyExists = !!payload.alreadyExists;

      if (!alreadyExists && category && category.id) {
        const normalised = {
          id: category.id,
          name: category.name,
          slug: category.slug,
          icon: category.icon ?? "🔧",
          description: category.description ?? null,
          isUserSubmitted: category.isUserSubmitted ?? true,
          _count: category._count ?? { workers: 0, bookings: 0 },
        };

        const wouldMatch =
          !search ||
          normalised.name.toLowerCase().includes(search.toLowerCase());

        if (wouldMatch) {
          if (page === 1) {
            setCategories((prev) => [
              normalised,
              ...prev.filter((cat) => cat.id !== normalised.id),
            ]);
            setTotal((t) => t + 1);
          } else {
            await fetchPage(1, { replace: true });
          }
        } else {
          setSearchInput("");
          setSearch("");
        }

        listRef.current?.scrollToOffset?.({ offset: 0, animated: true });
        setSuggestMsg(`✅ "${normalised.name}" added to the platform!`);
        setSuggestMsgKind("ok");
      } else if (alreadyExists) {
        setSuggestMsg(`"${category?.name || submitted}" already exists.`);
        setSuggestMsgKind("warn");
      } else {
        setSuggestMsg("Unexpected response from the server.");
        setSuggestMsgKind("error");
      }

      setSuggestName("");
      setShowSuggest(false);
    } catch (err) {
      const status = err?.response?.status;
      const serverMsg = err?.response?.data?.message;

      const retryAfterRaw =
        err?.response?.headers?.["retry-after"] ??
        err?.response?.data?.retryAfter;
      const retryAfter = parseInt(retryAfterRaw, 10);

      if (status === 429) {
        if (!Number.isNaN(retryAfter) && retryAfter > 0) {
          const minutes = Math.max(1, Math.ceil(retryAfter / 60));
          setSuggestMsg(
            `Too many suggestions. Try again in ${minutes} minute${
              minutes !== 1 ? "s" : ""
            }.`,
          );
        } else {
          setSuggestMsg(
            serverMsg ||
              "Too many suggestions. Please wait a while before trying again.",
          );
        }
        setSuggestMsgKind("warn");
      } else if (status === 400) {
        setSuggestMsg(
          serverMsg || "Please check the category name and try again.",
        );
        setSuggestMsgKind("error");
      } else if (status === 401 || status === 403) {
        setSuggestMsg(
          serverMsg || "You are not allowed to add categories right now.",
        );
        setSuggestMsgKind("error");
      } else if (status >= 500) {
        setSuggestMsg("Server error. Please try again in a moment.");
        setSuggestMsgKind("error");
      } else {
        setSuggestMsg(
          serverMsg ||
            "Couldn't reach the server. Check your connection and try again.",
        );
        setSuggestMsgKind("error");
      }
    } finally {
      setSuggesting(false);
      setTimeout(() => setSuggestMsg(""), 7000);
    }
  };

  const msgStyles = {
    ok: { bg: c.greenDim, color: c.green, border: "rgba(34,197,94,0.2)" },
    warn: {
      bg: "rgba(251,191,36,0.12)",
      color: "#fbbf24",
      border: "rgba(251,191,36,0.25)",
    },
    error: { bg: c.redDim, color: c.red, border: "rgba(239,68,68,0.2)" },
  };
  const activeMsgStyle = msgStyles[suggestMsgKind] || msgStyles.error;

  const goBack = () => navigation.goBack();

  const headerBlock = (
    <View style={{ gap: 16, marginBottom: 20 }}>
      {/* Back */}
      <Pressable
        onPress={goBack}
        style={({ pressed }) => [
          {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: c.orange,
            alignSelf: "flex-start",
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <FaArrowLeft size={14} color={c.orange} />
        <AppText style={{ fontSize: 13, fontWeight: "500", color: c.orange }}>
          Back
        </AppText>
      </Pressable>

      {/* Title */}
      <View style={{ alignItems: "center" }}>
        <AppText
          style={{
            fontFamily: "Syne_800ExtraBold",
            fontSize: 28,
            fontWeight: "700",
            color: c.text,
            textAlign: "center",
          }}
        >
          Browse Categories
        </AppText>
        <AppText
          style={{
            fontSize: 15,
            color: c.textDim,
            textAlign: "center",
            marginTop: 6,
          }}
        >
          {total > 0
            ? `${total} ${search ? "matching " : ""}categor${
                total === 1 ? "y" : "ies"
              }`
            : "All categories"}{" "}
          — search or add yours
        </AppText>
      </View>

      {/* Control row */}
      <View style={{ gap: 10 }}>
        {/* Search */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: c.bgCard,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 6,
          }}
        >
          <FaSearch size={16} color={c.textMuted} />
          <TextInput
            placeholder="Search categories..."
            placeholderTextColor={c.textMuted}
            value={searchInput}
            onChangeText={setSearchInput}
            style={{
              flex: 1,
              marginLeft: 8,
              color: c.text,
              fontSize: 14,
              paddingVertical: 6,
            }}
          />
          {searchInput ? (
            <Pressable onPress={() => setSearchInput("")} hitSlop={6}>
              <FaX size={14} color={c.textMuted} />
            </Pressable>
          ) : null}
        </View>

        {/* Suggest trigger OR form */}
        {!showSuggest ? (
          <Pressable
            onPress={() => setShowSuggest(true)}
            style={({ pressed }) => [
              {
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                paddingVertical: 10,
                paddingHorizontal: 16,
                backgroundColor: c.orangeDim,
                borderWidth: 1,
                borderColor: c.orangeGlow,
                borderRadius: 10,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <FaPlus size={14} color={c.orange} />
            <AppText
              style={{ fontSize: 13, fontWeight: "700", color: c.orange }}
            >
              Add Category
            </AppText>
          </Pressable>
        ) : (
          <View style={{ gap: 8 }}>
            <TextInput
              autoFocus
              placeholder="e.g. Drone Operator, Solar Engineer..."
              placeholderTextColor={c.textMuted}
              value={suggestName}
              onChangeText={setSuggestName}
              onSubmitEditing={handleSuggest}
              returnKeyType="done"
              style={{
                paddingHorizontal: 14,
                paddingVertical: 10,
                backgroundColor: c.bgCard,
                borderWidth: 1,
                borderColor: c.border,
                borderRadius: 10,
                color: c.text,
                fontSize: 14,
              }}
            />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                onPress={handleSuggest}
                disabled={suggesting || !suggestName.trim()}
                style={({ pressed }) => [
                  {
                    flex: 1,
                    paddingVertical: 10,
                    backgroundColor: c.orange,
                    borderRadius: 10,
                    alignItems: "center",
                    opacity:
                      suggesting || !suggestName.trim()
                        ? 0.5
                        : pressed
                          ? 0.85
                          : 1,
                  },
                ]}
              >
                {suggesting ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <AppText
                    style={{ fontSize: 13, fontWeight: "700", color: "#000" }}
                  >
                    Add
                  </AppText>
                )}
              </Pressable>
              <Pressable
                onPress={() => {
                  setShowSuggest(false);
                  setSuggestName("");
                }}
                style={({ pressed }) => [
                  {
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                    paddingVertical: 10,
                    borderWidth: 1,
                    borderColor: c.border,
                    borderRadius: 10,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <FaX size={12} color={c.textDim} />
                <AppText style={{ fontSize: 13, color: c.textDim }}>
                  Cancel
                </AppText>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {/* Suggest message */}
      {suggestMsg ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingHorizontal: 14,
            paddingVertical: 10,
            backgroundColor: activeMsgStyle.bg,
            borderWidth: 1,
            borderColor: activeMsgStyle.border,
            borderRadius: 10,
          }}
        >
          {suggestMsgKind === "ok" ? (
            <FaCheckCircle size={14} color={activeMsgStyle.color} />
          ) : (
            <FaAlertCircle size={14} color={activeMsgStyle.color} />
          )}
          <AppText
            style={{
              flex: 1,
              fontSize: 13,
              fontWeight: "600",
              color: activeMsgStyle.color,
            }}
          >
            {suggestMsg}
          </AppText>
        </View>
      ) : null}

      {/* Load error */}
      {loadError && !loading ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingHorizontal: 14,
            paddingVertical: 10,
            backgroundColor: c.redDim,
            borderWidth: 1,
            borderColor: "rgba(239,68,68,0.2)",
            borderRadius: 10,
          }}
        >
          <FaAlertCircle size={14} color={c.red} />
          <AppText
            style={{
              flex: 1,
              fontSize: 13,
              fontWeight: "600",
              color: c.red,
            }}
          >
            {loadError}
          </AppText>
          <Pressable
            onPress={() => fetchPage(1, { replace: true })}
            style={({ pressed }) => [
              {
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderWidth: 1,
                borderColor: c.red,
                borderRadius: 6,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <AppText style={{ fontSize: 11, fontWeight: "700", color: c.red }}>
              Retry
            </AppText>
          </Pressable>
        </View>
      ) : null}
    </View>
  );

  const renderCard = ({ item }) => (
    <Pressable
      onPress={() => navigation.navigate("CategoryDetail", { slug: item.slug })}
      style={({ pressed }) => [
        {
          flex: 1,
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: 20,
          margin: 6,
          backgroundColor: pressed ? c.bgPanel : c.bgCard,
          borderWidth: 1,
          borderColor: pressed ? c.orange : c.border,
          borderRadius: 12,
        },
      ]}
    >
      {item.icon ? (
        <AppText style={{ fontSize: 34 }}>{item.icon}</AppText>
      ) : null}
      <AppText
        style={{
          fontFamily: "Syne_700Bold",
          fontSize: 15,
          fontWeight: "600",
          color: c.text,
          textAlign: "center",
        }}
        numberOfLines={2}
      >
        {item.name}
      </AppText>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 5,
        }}
      >
        <FaUsers size={11} color={c.textDim} />
        <AppText style={{ fontSize: 12, color: c.textDim }}>
          {`${item._count?.workers || 0} workers`}
        </AppText>
      </View>
      {item.isUserSubmitted ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 3,
            paddingHorizontal: 8,
            paddingVertical: 2,
            backgroundColor: c.orangeDim,
            borderRadius: 100,
          }}
        >
          <FaTag size={9} color={c.orange} />
          <AppText style={{ fontSize: 10, fontWeight: "700", color: c.orange }}>
            Community
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: c.bg }}
      edges={["top", "left", "right"]}
    >
      <FlatList
        ref={listRef}
        data={loading ? [] : categories}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        columnWrapperStyle={{ marginHorizontal: -6 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        ListHeaderComponent={headerBlock}
        renderItem={renderCard}
        ListEmptyComponent={
          loading ? (
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                marginHorizontal: -6,
              }}
            >
              {[...Array(12)].map((_, i) => (
                <View key={i} style={{ width: "50%", padding: 6 }}>
                  <Skeleton
                    width="100%"
                    height={140}
                    radius={12}
                    style={{ backgroundColor: c.bgCard }}
                  />
                </View>
              ))}
            </View>
          ) : (
            <View
              style={{
                alignItems: "center",
                paddingVertical: 48,
                gap: 12,
              }}
            >
              <FaSearch size={44} color={c.textMuted} />
              <AppText
                style={{
                  fontSize: 14,
                  color: c.textDim,
                  textAlign: "center",
                }}
              >
                {search
                  ? `No categories found for "${search}".`
                  : "No categories found."}
              </AppText>
              {search ? (
                <Pressable
                  onPress={() => {
                    setSuggestName(search);
                    setShowSuggest(true);
                    setSearchInput("");
                    setSearch("");
                  }}
                  style={({ pressed }) => [
                    {
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      paddingVertical: 10,
                      paddingHorizontal: 16,
                      backgroundColor: c.orangeDim,
                      borderWidth: 1,
                      borderColor: c.orangeGlow,
                      borderRadius: 10,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <FaPlus size={14} color={c.orange} />
                  <AppText
                    style={{
                      fontSize: 13,
                      fontWeight: "700",
                      color: c.orange,
                    }}
                  >
                    {`Add "${search}" as a new category`}
                  </AppText>
                </Pressable>
              ) : null}
            </View>
          )
        }
        ListFooterComponent={
          !loading && categories.length > 0 ? (
            <View
              style={{ alignItems: "center", paddingVertical: 20, gap: 12 }}
            >
              {hasMore ? (
                <Pressable
                  onPress={handleShowMore}
                  disabled={loadingMore}
                  style={({ pressed }) => [
                    {
                      paddingVertical: 12,
                      paddingHorizontal: 24,
                      backgroundColor: c.bgCard,
                      borderWidth: 1,
                      borderColor: c.border,
                      borderRadius: 10,
                      opacity: loadingMore ? 0.5 : pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <AppText
                    style={{ fontSize: 13, fontWeight: "600", color: c.text }}
                  >
                    {loadingMore
                      ? "Loading..."
                      : `Show more (${total - categories.length} remaining)`}
                  </AppText>
                </Pressable>
              ) : (
                <AppText
                  style={{
                    fontSize: 12,
                    color: c.textMuted,
                    textAlign: "center",
                  }}
                >
                  {`That's all ${total} ${search ? "matching " : ""}categor${
                    total === 1 ? "y" : "ies"
                  }.`}
                </AppText>
              )}
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
