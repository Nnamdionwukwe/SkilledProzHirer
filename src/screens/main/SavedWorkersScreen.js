// src/screens/main/SavedWorkersScreen.js
//
// Port of pages/hirer/HirerSavedWorkers.jsx.
// Two tabs: Saved (explicit bookmarks) and Previously Hired (booking history).
// Eager-loads both on mount (matching the web). Unsave stays local on success
// — no refetch. Uses the shared Skeleton component for loading state.
//
// Navigation targets verified against HirerNavigator.js:
//   - WorkerProfile  (WorkerPublicProfileScreen)  → { userId }
//   - CreateBooking  (CreateBookingScreen)         → { workerId }
//   - BrowseWorkers  (BrowseWorkersScreen)         → no params
//
// RN GOTCHA fixed: category pill previously rendered
//   {icon} {name}
// as two JSX expressions separated by a literal space — the space escaped
// the <AppText> wrapper and threw "Text strings must be rendered within a
// <Text> component". Now built as a single template string.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import AppText from "../../components/AppText";
import Skeleton from "../../components/Skeleton";
import ReportButton from "../../components/ReportButton";
import { useTheme } from "../../contexts/ThemeContext";
import client from "../../api/client";
import {
  FaMapMarkerAlt,
  FaBookmark,
  FaBriefcase,
  FaStar,
  FaCheck,
  FaPlus,
  FaArrowRight,
  FaCheckCircle,
  FaAlertCircle,
} from "../../icons/fa";

// ── Helpers ─────────────────────────────────────────────────────────────
function Avatar({ user, size = 44, c }) {
  const initials =
    `${user?.firstName?.[0] || ""}${user?.lastName?.[0] || ""}`.toUpperCase() ||
    "?";

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: c.orangeDim,
        borderWidth: 2,
        borderColor: c.orangeGlow,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {user?.avatar ? (
        <Image
          source={{ uri: user.avatar }}
          style={{ width: "100%", height: "100%" }}
        />
      ) : (
        <AppText style={{ fontSize: 14, fontWeight: "800", color: c.orange }}>
          {initials}
        </AppText>
      )}
    </View>
  );
}

function StarRating({ rating, c }) {
  if (!rating) return null;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        flexShrink: 0,
      }}
    >
      <FaStar size={12} color={c.orange} />
      <AppText style={{ fontSize: 13, fontWeight: "700", color: c.orange }}>
        {Number(rating).toFixed(1)}
      </AppText>
    </View>
  );
}

// ── Single worker card ──────────────────────────────────────────────────
function WorkerCard({
  worker,
  isSaved,
  onUnsave,
  unsaving,
  onNavigateProfile,
  onNavigateBook,
  c,
}) {
  const wp = worker.workerProfile;

  // Build the location string once — avoids two-expression JSX
  const locationText = [worker.city, worker.country].filter(Boolean).join(", ");

  // Build the hourly rate once
  const hourlyText =
    wp?.hourlyRate != null
      ? `${wp.currency || "NGN"} ${Number(wp.hourlyRate).toLocaleString()}`
      : null;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: c.bgPanel, borderColor: c.border },
      ]}
    >
      {/* Top: avatar + name/title/location + rating */}
      <View style={styles.cardTop}>
        <Avatar user={worker} size={44} c={c} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText
            numberOfLines={1}
            style={{ fontSize: 14, fontWeight: "700", color: c.text }}
          >
            {`${worker.firstName || ""} ${worker.lastName || ""}`.trim()}
          </AppText>

          {wp?.title ? (
            <AppText
              numberOfLines={1}
              style={{ fontSize: 12, color: c.textDim, marginTop: 2 }}
            >
              {wp.title}
            </AppText>
          ) : null}

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
              marginTop: 4,
            }}
          >
            {locationText ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                <FaMapMarkerAlt size={11} color={c.textMuted} />
                <AppText style={{ fontSize: 11, color: c.textMuted }}>
                  {locationText}
                </AppText>
              </View>
            ) : null}

            {wp?.isAvailable ? (
              <AppText
                style={{ fontSize: 11, fontWeight: "600", color: c.green }}
              >
                ● Available
              </AppText>
            ) : null}
          </View>
        </View>
        <StarRating rating={wp?.avgRating} c={c} />
      </View>

      {/* Categories */}
      {wp?.categories?.length > 0 ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5 }}>
          {wp.categories.map((cat, i) => {
            // Build the label as a SINGLE string — no adjacent JSX
            // expressions separated by a literal space (RN throws).
            const icon = cat?.category?.icon || "";
            const name = cat?.category?.name || "";
            const label = `${icon} ${name}`.trim();
            if (!label) return null;
            return (
              <View
                key={`${name || i}`}
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 20,
                  backgroundColor: c.bgCard,
                  borderWidth: 1,
                  borderColor: c.border,
                }}
              >
                <AppText
                  style={{
                    fontSize: 10,
                    fontWeight: "600",
                    color: c.textDim,
                  }}
                >
                  {label}
                </AppText>
              </View>
            );
          })}
        </View>
      ) : null}

      {/* Stats row */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
          paddingVertical: 8,
          paddingHorizontal: 10,
          backgroundColor: c.bgCard,
          borderRadius: 9,
          borderWidth: 1,
          borderColor: c.border,
        }}
      >
        {hourlyText ? (
          <View
            style={{ flexDirection: "row", alignItems: "baseline", gap: 2 }}
          >
            <AppText style={{ fontSize: 13, fontWeight: "700", color: c.text }}>
              {hourlyText}
            </AppText>
            <AppText style={{ fontSize: 10, color: c.textMuted }}>/hr</AppText>
          </View>
        ) : null}

        {wp?.completedJobs > 0 ? (
          <View
            style={{ flexDirection: "row", alignItems: "baseline", gap: 2 }}
          >
            <AppText style={{ fontSize: 13, fontWeight: "700", color: c.text }}>
              {String(wp.completedJobs)}
            </AppText>
            <AppText style={{ fontSize: 10, color: c.textMuted }}>jobs</AppText>
          </View>
        ) : null}

        {wp?.totalReviews > 0 ? (
          <View
            style={{ flexDirection: "row", alignItems: "baseline", gap: 2 }}
          >
            <AppText style={{ fontSize: 13, fontWeight: "700", color: c.text }}>
              {String(wp.totalReviews)}
            </AppText>
            <AppText style={{ fontSize: 10, color: c.textMuted }}>
              reviews
            </AppText>
          </View>
        ) : null}

        {wp?.verificationStatus === "VERIFIED" ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 3,
              marginLeft: "auto",
              paddingHorizontal: 7,
              paddingVertical: 2,
              backgroundColor: "rgba(34,197,94,0.1)",
              borderRadius: 8,
              borderWidth: 1,
              borderColor: "rgba(34,197,94,0.25)",
            }}
          >
            <FaCheck size={10} color={c.green} />
            <AppText
              style={{ fontSize: 10, fontWeight: "700", color: c.green }}
            >
              Verified
            </AppText>
          </View>
        ) : null}
      </View>

      {/* Last hired — hired tab only */}
      {worker.lastCategory ? (
        <AppText style={{ fontSize: 11, color: c.textMuted }}>
          {"Last hired for: "}
          <AppText style={{ fontWeight: "600", color: c.textDim }}>
            {worker.lastCategory.name || ""}
          </AppText>
        </AppText>
      ) : null}

      {/* Saved at — saved tab only */}
      {worker.savedAt ? (
        <AppText style={{ fontSize: 11, color: c.textMuted }}>
          {`Saved ${new Date(worker.savedAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}`}
        </AppText>
      ) : null}

      {/* Actions */}
      <View style={{ flexDirection: "row", gap: 6, marginTop: 2 }}>
        <Pressable
          onPress={() => onNavigateProfile(worker.id)}
          style={({ pressed }) => [
            styles.viewBtn,
            {
              backgroundColor: c.bgCard,
              borderColor: c.border,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <AppText
            style={{ fontSize: 12, fontWeight: "600", color: c.textDim }}
          >
            View Profile
          </AppText>
          <FaArrowRight size={12} color={c.textDim} />
        </Pressable>

        <ReportButton
          targetType="USER"
          targetId={worker.id}
          targetName={`${worker.firstName || ""} ${
            worker.lastName || ""
          }`.trim()}
          variant="icon"
        />

        <Pressable
          onPress={() => onNavigateBook(worker.id)}
          style={({ pressed }) => [
            styles.bookBtn,
            { backgroundColor: c.orange, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <AppText style={{ fontSize: 12, fontWeight: "700", color: "#000" }}>
            Book
          </AppText>
        </Pressable>

        {isSaved ? (
          <Pressable
            onPress={() => onUnsave(worker.id)}
            disabled={unsaving === worker.id}
            style={({ pressed }) => [
              styles.unsaveBtn,
              {
                backgroundColor: c.redDim,
                borderColor: "rgba(239,68,68,0.25)",
                opacity: unsaving === worker.id ? 0.4 : pressed ? 0.7 : 1,
              },
            ]}
          >
            {unsaving === worker.id ? (
              <AppText style={{ fontSize: 12, color: c.red }}>…</AppText>
            ) : (
              <FaBookmark size={14} color={c.red} />
            )}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

// ── Skeleton grid ───────────────────────────────────────────────────────
function Skeletons({ c }) {
  return (
    <View style={{ gap: 12 }}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Skeleton
          key={i}
          width="100%"
          height={200}
          radius={16}
          style={{ backgroundColor: c.bgPanel }}
        />
      ))}
    </View>
  );
}

// ── Empty state ─────────────────────────────────────────────────────────
function Empty({ tab, onBrowse, c }) {
  const Icon = tab === "saved" ? FaBookmark : FaBriefcase;
  const title =
    tab === "saved" ? "No saved workers yet" : "No hired workers yet";
  const subtitle =
    tab === "saved"
      ? "Browse workers and tap the bookmark icon to save them here."
      : "Workers you've previously booked will appear here.";

  return (
    <View
      style={{
        alignItems: "center",
        paddingVertical: 56,
        paddingHorizontal: 20,
        backgroundColor: c.bgPanel,
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: c.border,
        borderRadius: 16,
        gap: 8,
      }}
    >
      <Icon size={40} color={c.textMuted} />
      <AppText
        style={{
          fontFamily: "Syne_700Bold",
          fontSize: 16,
          fontWeight: "700",
          color: c.text,
          marginTop: 4,
        }}
      >
        {title}
      </AppText>
      <AppText
        style={{
          fontSize: 13,
          color: c.textMuted,
          textAlign: "center",
          maxWidth: 320,
        }}
      >
        {subtitle}
      </AppText>
      <Pressable
        onPress={onBrowse}
        style={({ pressed }) => [
          {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            marginTop: 4,
            paddingHorizontal: 20,
            paddingVertical: 8,
            backgroundColor: c.orangeDim,
            borderWidth: 1,
            borderColor: c.orangeGlow,
            borderRadius: 9,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <AppText style={{ fontSize: 13, fontWeight: "700", color: c.orange }}>
          Browse Workers
        </AppText>
        <FaArrowRight size={12} color={c.orange} />
      </Pressable>
    </View>
  );
}

// ── Main screen ─────────────────────────────────────────────────────────
export default function SavedWorkersScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const c = theme.colors;

  const [tab, setTab] = useState("saved");
  const [saved, setSaved] = useState([]);
  const [hired, setHired] = useState([]);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [loadingHired, setLoadingHired] = useState(true);
  const [unsaving, setUnsaving] = useState(null);
  const [toast, setToast] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const notify = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchSaved = useCallback(async () => {
    setLoadingSaved(true);
    try {
      const res = await client.get("/hirers/me/saved-workers");
      setSaved(res.data.data?.workers || []);
    } catch {
      notify("Failed to load saved workers", "error");
    } finally {
      setLoadingSaved(false);
    }
  }, [notify]);

  const fetchHired = useCallback(async () => {
    setLoadingHired(true);
    try {
      const res = await client.get("/hirers/me/hired-workers");
      setHired(res.data.data?.workers || []);
    } catch {
      notify("Failed to load hired workers", "error");
    } finally {
      setLoadingHired(false);
    }
  }, [notify]);

  useEffect(() => {
    fetchSaved();
  }, [fetchSaved]);

  useEffect(() => {
    fetchHired();
  }, [fetchHired]);

  // Refresh on focus so newly-saved workers from another screen appear
  // when the user returns. Skip the very first focus (mount already
  // triggers both fetch calls).
  const firstFocusRef = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocusRef.current) {
        firstFocusRef.current = false;
        return;
      }
      fetchSaved();
      fetchHired();
    }, [fetchSaved, fetchHired]),
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchSaved(), fetchHired()]);
    setRefreshing(false);
  }, [fetchSaved, fetchHired]);

  const handleUnsave = useCallback(
    async (workerId) => {
      setUnsaving(workerId);
      try {
        await client.delete(`/hirers/me/saved-workers/${workerId}`);
        setSaved((prev) => prev.filter((w) => w.id !== workerId));
        notify("Worker removed from saved list");
      } catch {
        notify("Failed to remove worker", "error");
      } finally {
        setUnsaving(null);
      }
    },
    [notify],
  );

  const handleNavigateProfile = useCallback(
    (workerId) => {
      navigation.navigate("WorkerProfile", { userId: workerId });
    },
    [navigation],
  );

  const handleNavigateBook = useCallback(
    (workerId) => {
      navigation.navigate("CreateBooking", { workerId });
    },
    [navigation],
  );

  const handleBrowse = useCallback(() => {
    navigation.navigate("BrowseWorkers");
  }, [navigation]);

  const activeWorkers = tab === "saved" ? saved : hired;
  const isLoading = tab === "saved" ? loadingSaved : loadingHired;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: c.bg }}
      edges={["top", "left", "right"]}
    >
      {/* Toast */}
      {toast ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 60,
            right: 16,
            zIndex: 9999,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 10,
            backgroundColor: toast.type === "success" ? c.greenDim : c.redDim,
            borderWidth: 1,
            borderColor: toast.type === "success" ? c.green : c.red,
          }}
        >
          {toast.type === "success" ? (
            <FaCheckCircle size={14} color={c.green} />
          ) : (
            <FaAlertCircle size={14} color={c.red} />
          )}
          <AppText
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: toast.type === "success" ? c.green : c.red,
            }}
          >
            {toast.msg}
          </AppText>
        </View>
      ) : null}

      <FlatList
        data={isLoading ? [] : activeWorkers}
        keyExtractor={(w) => String(w.id)}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 20,
          paddingBottom: 80,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={c.orange}
            colors={[c.orange]}
          />
        }
        ListHeaderComponent={
          <View style={{ gap: 20, marginBottom: 12 }}>
            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <AppText
                  style={{
                    fontFamily: "Syne_800ExtraBold",
                    fontSize: 24,
                    fontWeight: "900",
                    color: c.text,
                    letterSpacing: -0.5,
                  }}
                >
                  My Workers
                </AppText>
                <AppText
                  style={{ fontSize: 13, color: c.textDim, marginTop: 4 }}
                >
                  Manage your saved shortlist and view your hiring history.
                </AppText>
              </View>
              <Pressable
                onPress={handleBrowse}
                style={({ pressed }) => [
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    paddingHorizontal: 16,
                    paddingVertical: 9,
                    borderRadius: 10,
                    backgroundColor: c.orange,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <FaPlus size={14} color="#000" />
                <AppText
                  style={{
                    fontFamily: "Syne_800ExtraBold",
                    fontSize: 13,
                    fontWeight: "800",
                    color: "#000",
                  }}
                >
                  Browse Workers
                </AppText>
              </Pressable>
            </View>

            {/* Tabs */}
            <View
              style={{
                flexDirection: "row",
                gap: 6,
                padding: 6,
                backgroundColor: c.bgPanel,
                borderWidth: 1,
                borderColor: c.border,
                borderRadius: 12,
                alignSelf: "flex-start",
              }}
            >
              <Pressable
                onPress={() => setTab("saved")}
                style={({ pressed }) => [
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 8,
                    backgroundColor:
                      tab === "saved" ? c.orangeDim : "transparent",
                    borderWidth: 1,
                    borderColor: tab === "saved" ? c.orangeGlow : "transparent",
                    opacity: pressed && tab !== "saved" ? 0.8 : 1,
                  },
                ]}
              >
                <FaBookmark
                  size={13}
                  color={tab === "saved" ? c.orange : c.textDim}
                />
                <AppText
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: tab === "saved" ? c.orange : c.textDim,
                  }}
                >
                  Saved
                </AppText>
                {saved.length > 0 ? (
                  <View
                    style={{
                      minWidth: 18,
                      height: 18,
                      paddingHorizontal: 5,
                      borderRadius: 9,
                      backgroundColor: c.orange,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <AppText
                      style={{ fontSize: 10, fontWeight: "800", color: "#000" }}
                    >
                      {String(saved.length)}
                    </AppText>
                  </View>
                ) : null}
              </Pressable>

              <Pressable
                onPress={() => setTab("hired")}
                style={({ pressed }) => [
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 8,
                    backgroundColor:
                      tab === "hired" ? c.orangeDim : "transparent",
                    borderWidth: 1,
                    borderColor: tab === "hired" ? c.orangeGlow : "transparent",
                    opacity: pressed && tab !== "hired" ? 0.8 : 1,
                  },
                ]}
              >
                <FaBriefcase
                  size={13}
                  color={tab === "hired" ? c.orange : c.textDim}
                />
                <AppText
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: tab === "hired" ? c.orange : c.textDim,
                  }}
                >
                  Previously Hired
                </AppText>
                {hired.length > 0 ? (
                  <View
                    style={{
                      minWidth: 18,
                      height: 18,
                      paddingHorizontal: 5,
                      borderRadius: 9,
                      backgroundColor: c.orange,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <AppText
                      style={{ fontSize: 10, fontWeight: "800", color: "#000" }}
                    >
                      {String(hired.length)}
                    </AppText>
                  </View>
                ) : null}
              </Pressable>
            </View>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <Skeletons c={c} />
          ) : (
            <Empty tab={tab} onBrowse={handleBrowse} c={c} />
          )
        }
        renderItem={({ item }) => (
          <View style={{ marginBottom: 12 }}>
            <WorkerCard
              worker={item}
              isSaved={tab === "saved"}
              onUnsave={handleUnsave}
              unsaving={unsaving}
              onNavigateProfile={handleNavigateProfile}
              onNavigateBook={handleNavigateBook}
              c={c}
            />
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 10,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  viewBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 9,
    borderWidth: 1,
  },
  bookBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 9,
  },
  unsaveBtn: {
    width: 34,
    height: 34,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
