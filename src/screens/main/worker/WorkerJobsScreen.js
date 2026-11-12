// src/screens/main/worker/WorkerJobsScreen.js
// Verbatim port of pages/worker/HirerJobBoard.jsx + HirerJobBoard.module.css

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  useWindowDimensions,
  Image,
  Modal,
  FlatList,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import AppText from "../../../components/AppText";
import Skeleton from "../../../components/Skeleton";
import { useTheme } from "../../../contexts/ThemeContext";
import { useToast } from "../../../contexts/ToastContext";
import { useAuthStore } from "../../../store/authStore";
import { rem, FONTS } from "../../../constants/theme";
import client from "../../../api/client";
import { usePlatformRefresh } from "../../../contexts/PlatformPollerContext";

// ── Duration formatter (mirror of utils/formatDuration on web) ──────────
function formatJobDuration(job) {
  if (!job) return null;
  const unit = job.estimatedUnit || "hours";
  const value = job.estimatedValue;
  const hours = job.estimatedHours;

  if (!value && !hours) return null;

  if (unit === "custom") return value || null;

  const labels = {
    hours: "hour",
    days: "day",
    weeks: "week",
    months: "month",
    years: "year",
  };

  if (value) {
    const num = parseFloat(value);
    if (isNaN(num) || num <= 0) return value;
    const label = (labels[unit] || unit) + (num !== 1 ? "s" : "");
    const eqv = unit !== "hours" && hours ? ` (≈ ${hours}h)` : "";
    return `${num} ${label}${eqv}`;
  }

  if (hours) {
    const num = parseFloat(hours);
    if (isNaN(num) || num <= 0) return `${hours} hours`;
    return `${num} hours`;
  }

  return null;
}

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const d = Math.floor(diff / 86400000);
  if (d < 1) return "Today";
  if (d < 7) return `${d}d ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

// ── Job Card ────────────────────────────────────────────────────────────
function JobCard({ job, isWorker }) {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const c = theme.colors;
  const { t } = useTranslation();

  const description =
    typeof job?.description === "string" ? job.description : "";
  const truncatedDesc =
    description.length > 100 ? `${description.slice(0, 100)}...` : description;

  const hirer = job?.hirer || {};
  const hirerProfile = hirer?.hirerProfile || {};
  const category = job?.category || {};
  const applicantCount = job?._count?.applications ?? 0;

  const hasJobId = Boolean(job?.id);
  const hasHirerId = Boolean(hirer?.id);

  const hirerDisplayName =
    hirerProfile.companyName ||
    [hirer.firstName, hirer.lastName].filter(Boolean).join(" ") ||
    t("workerJobs.unknownHirer", "Unknown Hirer");

  const hirerInitials = [hirer.firstName?.[0], hirer.lastName?.[0]]
    .filter(Boolean)
    .join("");

  const hirerLocation = [hirer.city, hirer.country].filter(Boolean).join(", ");
  const dur = formatJobDuration(job);

  return (
    <View
      style={[s.card, { backgroundColor: c.bgPanel, borderColor: c.border }]}
    >
      {/* Top: category chip + time ago */}
      <View style={s.cardTop}>
        {category.icon || category.name ? (
          <View
            style={[
              s.catChip,
              { backgroundColor: c.orangeDim, borderColor: c.orangeGlow },
            ]}
          >
            {category.icon ? (
              <AppText style={{ fontSize: 11, color: c.orange }}>
                {category.icon}{" "}
              </AppText>
            ) : null}
            <AppText
              style={{
                fontSize: 11,
                fontWeight: "600",
                color: c.orange,
              }}
            >
              {category.name}
            </AppText>
          </View>
        ) : (
          <View />
        )}
        {job.createdAt ? (
          <AppText style={{ fontSize: 11, color: c.textMuted }}>
            {timeAgo(job.createdAt)}
          </AppText>
        ) : null}
      </View>

      {/* Title */}
      <AppText
        variant="title"
        weight="displayBlack"
        style={s.cardTitle}
        numberOfLines={2}
      >
        {job.title}
      </AppText>

      {/* Description */}
      {truncatedDesc ? (
        <AppText style={s.cardDesc} numberOfLines={3}>
          {truncatedDesc}
        </AppText>
      ) : null}

      {/* Hirer row */}
      <View style={[s.hirerRow, { backgroundColor: c.bgCard }]}>
        <View
          style={[
            s.hirerAvatar,
            { backgroundColor: c.orangeDim, borderColor: c.orangeGlow },
          ]}
        >
          {hirer.avatar ? (
            <Image
              source={{ uri: hirer.avatar }}
              style={{ width: "100%", height: "100%" }}
            />
          ) : (
            <AppText
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: c.orange,
              }}
            >
              {hirerInitials || "?"}
            </AppText>
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText
            style={{ fontSize: 12, fontWeight: "600", color: c.text }}
            numberOfLines={1}
          >
            {hirerDisplayName}
          </AppText>
          {hirerLocation ? (
            <AppText
              style={{ fontSize: 11, color: c.textMuted }}
              numberOfLines={1}
            >
              📍 {hirerLocation}
            </AppText>
          ) : null}
        </View>
        {Number(hirerProfile.avgRating) > 0 && (
          <AppText style={{ fontSize: 11, fontWeight: "700", color: c.orange }}>
            ★ {Number(hirerProfile.avgRating).toFixed(1)}
          </AppText>
        )}
      </View>

      {/* Footer: budget + duration + applicants */}
      <View style={s.cardFooter}>
        <AppText
          variant="title"
          weight="displayBlack"
          style={{ fontSize: 14, color: c.orange }}
        >
          {job.currency} {Number(job.budget || 0).toLocaleString()}
        </AppText>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {dur ? (
            <View
              style={[
                s.durPill,
                { backgroundColor: c.bgCard, borderColor: c.border },
              ]}
            >
              <AppText
                style={{ fontSize: 10, fontWeight: "600", color: c.textDim }}
              >
                ⏱ {dur}
              </AppText>
            </View>
          ) : null}
          <AppText style={{ fontSize: 11, color: c.textMuted }}>
            {applicantCount} {t("workerJobs.applied", "applied")}
          </AppText>
        </View>
      </View>

      {/* Actions */}
      <View style={s.cardActions}>
        <Pressable
          onPress={() =>
            hasJobId &&
            navigation.navigate("WorkerJobDetail", { jobId: job.id, job })
          }
          disabled={!hasJobId}
          style={({ pressed }) => [
            s.viewBtn,
            {
              backgroundColor: c.orange,
              opacity: !hasJobId ? 0.4 : pressed ? 0.85 : 1,
            },
          ]}
        >
          <AppText
            variant="title"
            weight="displayBlack"
            style={{ fontSize: 12, color: "#000", textAlign: "center" }}
          >
            {t("workerJobs.job.viewApply", "View & Apply")} →
          </AppText>
        </Pressable>
        <Pressable
          onPress={() =>
            hasHirerId &&
            navigation.navigate("HirerPublicProfile", { userId: hirer.id })
          }
          disabled={!hasHirerId}
          style={({ pressed }) => [
            s.profileBtn,
            {
              backgroundColor: c.bgCard,
              borderColor: c.border,
              opacity: !hasHirerId ? 0.4 : pressed ? 0.85 : 1,
            },
          ]}
        >
          <AppText
            style={{ fontSize: 12, fontWeight: "600", color: c.textDim }}
          >
            {t("workerJobs.job.hirerProfile", "Hirer Profile")}
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

// ── Main ────────────────────────────────────────────────────────────────
export default function WorkerJobsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const c = theme.colors;
  const { width } = useWindowDimensions();

  const isMobile = width <= 640;

  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [categories, setCategories] = useState([]);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);

  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);

  // Load ALL categories — backend returns every row unbounded when `all=true`.
  // Includes user-submitted (custom) categories because the backend orders
  // them first: orderBy: [{ isUserSubmitted: "desc" }, { name: "asc" }].
  useEffect(() => {
    let isMounted = true;
    client
      .get("/categories", { params: { all: "true" } })
      .then((res) => {
        if (!isMounted) return;
        const raw = res.data?.data;
        const list = Array.isArray(raw) ? raw : raw?.categories || [];
        // De-dupe by slug in case a custom and seeded category share a slug
        const seen = new Set();
        const unique = list.filter((cat) => {
          const key = cat.slug || cat.id;
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setCategories(unique);
      })
      .catch(() => {
        if (isMounted) setCategories([]);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Load jobs
  const loadJobs = useCallback(
    async (isSilent = false) => {
      // Silent polls must not flash the skeleton — keep the current list
      // on screen and swap it out when the fresh data lands.
      if (!isSilent) setLoading(true);
      try {
        const params = { page, limit: 15 };
        if (q) params.q = q;
        if (category) params.category = category;
        const res = await client.get("/jobs", { params });
        setJobs(res.data?.data?.jobPosts || []);
        setTotal(res.data?.data?.total || 0);
        setPages(res.data?.data?.pages || 1);
      } catch (err) {
        // Poller never surfaces errors — no toast on silent refresh.
        // Initial load / submit-search still show the toast.
        if (!isSilent) {
          toast.error(
            err?.response?.data?.message ||
              t("workerJobs.toast.loadError", "Could not load jobs"),
          );
        }
      } finally {
        if (!isSilent) setLoading(false);
      }
    },
    [q, category, page, t, toast],
  );

  // ── Silent background refresh every 5s ──
  // No gate needed: the search input `q` is local state and the fetcher
  // reads it without ever writing it. Refresh always respects the current
  // page + category + query, so the visible slice stays fresh. The category
  // picker modal (`categoryModalOpen`) is local state — safe to refresh
  // beneath it, and picking a category always triggers a fresh fetch via
  // setCategory + setPage(1) → loadJobs.
  const fetchSilent = useCallback(() => loadJobs(true), [loadJobs]);
  usePlatformRefresh(fetchSilent, true);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const handleSearch = () => {
    setPage(1);
    loadJobs();
  };

  const activeCategoryName =
    categories.find((cat) => cat.slug === category)?.name || "";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={s.page}
      showsVerticalScrollIndicator={false}
    >
      {/* ── External Jobs CTA ── */}
      {user?.role === "WORKER" && (
        <View
          style={[
            s.externalCta,
            { backgroundColor: c.orangeDim, borderColor: c.orangeGlow },
          ]}
        >
          <Pressable
            onPress={() => navigation.navigate("ExternalJobs")}
            style={({ pressed }) => [
              s.externalLink,
              { backgroundColor: c.orange, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <AppText
              variant="title"
              weight="displayBlack"
              style={{ fontSize: 13, color: "#000" }}
            >
              🌐 {t("workerJobs.externalJobs", "Browse External Jobs")}
            </AppText>
            <View style={[s.externalBadge, { backgroundColor: "#000" }]}>
              <AppText
                style={{ fontSize: 9, fontWeight: "700", color: "#fff" }}
              >
                {t("workerJobs.newBadge", "New")}
              </AppText>
            </View>
          </Pressable>
          <AppText style={{ fontSize: 11, color: c.textDim }}>
            {t(
              "workerJobs.externalNote",
              "Discover jobs posted on partner platforms",
            )}
          </AppText>
        </View>
      )}

      {/* ── Search bar ── */}
      <View style={[s.searchBar, isMobile && { flexDirection: "column" }]}>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={t(
            "workerJobs.search.placeholder",
            "Search jobs by title or description...",
          )}
          placeholderTextColor={c.textMuted}
          style={[
            s.searchInput,
            {
              backgroundColor: c.bgPanel,
              borderColor: c.border,
              color: c.text,
            },
          ]}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <Pressable
          onPress={() => setCategoryModalOpen(true)}
          style={[
            s.filterSelect,
            {
              backgroundColor: c.bgPanel,
              borderColor: c.border,
              flex: 1,
              minWidth: isMobile ? "100%" : 160,
            },
          ]}
        >
          <AppText style={{ fontSize: 13, color: c.text }} numberOfLines={1}>
            {category
              ? activeCategoryName
              : t("workerJobs.category.all", "All Categories")}
          </AppText>
          <Ionicons name="chevron-down" size={14} color={c.textMuted} />
        </Pressable>
        <Pressable
          onPress={handleSearch}
          style={({ pressed }) => [
            s.searchBtn,
            { backgroundColor: c.orange, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <AppText
            variant="title"
            weight="displayBlack"
            style={{ fontSize: 13, color: "#000" }}
          >
            {t("workerJobs.search.button", "Search")}
          </AppText>
        </Pressable>
      </View>

      {/* ── Results header ── */}
      <View style={s.resultsHeader}>
        <AppText style={{ fontSize: 13, color: c.textDim }}>
          {loading
            ? t("workerJobs.loading", "Searching...")
            : `${total} ${t(
                total === 1
                  ? "workerJobs.job.jobOpenSingular"
                  : "workerJobs.job.jobOpenPlural",
                total === 1 ? "open job found" : "open jobs found",
              )}`}
        </AppText>
      </View>

      {/* ── Jobs grid ── */}
      {loading ? (
        <View style={s.grid}>
          {[1, 2, 3, 4].map((i) => (
            <View
              key={i}
              style={[
                s.skCard,
                { backgroundColor: c.bgPanel, borderColor: c.border },
              ]}
            />
          ))}
        </View>
      ) : jobs.length === 0 ? (
        <View style={s.empty}>
          <Ionicons
            name="document-text-outline"
            size={40}
            color={c.textMuted}
          />
          <AppText
            variant="title"
            weight="displayBlack"
            style={{ fontSize: 18, color: c.text, marginTop: 8 }}
          >
            {t("workerJobs.empty.title", "No jobs found")}
          </AppText>
          <AppText
            style={{ fontSize: 13, color: c.textDim, textAlign: "center" }}
          >
            {t(
              "workerJobs.empty.subtitle",
              "Try different keywords or check back later.",
            )}
          </AppText>
        </View>
      ) : (
        <View style={s.grid}>
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              isWorker={user?.role === "WORKER"}
            />
          ))}
        </View>
      )}

      {/* ── Pagination ── */}
      {pages > 1 && (
        <View style={s.pagination}>
          <Pressable
            disabled={page === 1}
            onPress={() => setPage((p) => p - 1)}
            style={[
              s.pageBtn,
              {
                backgroundColor: c.bgPanel,
                borderColor: c.border,
                opacity: page === 1 ? 0.35 : 1,
              },
            ]}
          >
            <AppText style={{ fontSize: 12, color: c.textDim }}>
              ← {t("workerJobs.prev", "Prev")}
            </AppText>
          </Pressable>
          <AppText style={{ fontSize: 12, color: c.textMuted }}>
            {page} {t("workerJobs.of", "of")} {pages}
          </AppText>
          <Pressable
            disabled={page === pages}
            onPress={() => setPage((p) => p + 1)}
            style={[
              s.pageBtn,
              {
                backgroundColor: c.bgPanel,
                borderColor: c.border,
                opacity: page === pages ? 0.35 : 1,
              },
            ]}
          >
            <AppText style={{ fontSize: 12, color: c.textDim }}>
              {t("workerJobs.next", "Next")} →
            </AppText>
          </Pressable>
        </View>
      )}

      {/* ── Category picker modal ── */}
      <Modal
        visible={categoryModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryModalOpen(false)}
      >
        <Pressable
          onPress={() => setCategoryModalOpen(false)}
          style={s.modalOverlay}
        >
          <Pressable
            onPress={(e) => e.stopPropagation?.()}
            style={[s.modalBox, { backgroundColor: c.bgPanel }]}
          >
            <AppText
              variant="title"
              weight="displayBlack"
              style={{ fontSize: 16, color: c.text, marginBottom: 12 }}
            >
              {t("workerJobs.category.select", "Select Category")}
            </AppText>
            <FlatList
              data={[
                {
                  id: "",
                  slug: "",
                  name: t("workerJobs.category.all", "All Categories"),
                },
                ...categories,
              ]}
              keyExtractor={(item) => item.slug || "all"}
              style={{ maxHeight: 400 }}
              renderItem={({ item }) => {
                const active = category === item.slug;
                return (
                  <Pressable
                    onPress={() => {
                      setCategory(item.slug);
                      setPage(1);
                      setCategoryModalOpen(false);
                    }}
                    style={({ pressed }) => [
                      s.currRow,
                      {
                        borderBottomColor: c.border,
                        backgroundColor: active ? c.orangeDim : "transparent",
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <AppText
                      style={{
                        fontSize: 13,
                        color: active ? c.orange : c.text,
                        fontWeight: active ? "700" : "500",
                      }}
                    >
                      {item.name}
                    </AppText>
                  </Pressable>
                );
              }}
            />
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
    gap: rem(1.5),
    maxWidth: 1200,
    alignSelf: "center",
    width: "100%",
  },

  // External CTA
  externalCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: rem(0.75),
    paddingVertical: rem(0.75),
    paddingHorizontal: rem(1),
    borderWidth: 1,
    borderRadius: rem(12 / 14),
  },
  externalLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: rem(0.5),
    paddingHorizontal: rem(1.2),
    borderRadius: rem(8 / 14),
  },
  externalBadge: {
    paddingHorizontal: rem(0.5),
    paddingVertical: 1,
    borderRadius: 999,
  },

  // Search
  searchBar: {
    flexDirection: "row",
    gap: rem(0.75),
    flexWrap: "wrap",
  },
  searchInput: {
    flex: 1,
    minWidth: 200,
    paddingVertical: rem(0.75),
    paddingHorizontal: rem(1),
    borderWidth: 1,
    borderRadius: rem(10 / 14),
    fontSize: 13,
  },
  filterSelect: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: rem(0.75),
    paddingHorizontal: rem(1),
    borderWidth: 1,
    borderRadius: rem(10 / 14),
    minWidth: 160,
  },
  searchBtn: {
    paddingVertical: rem(0.75),
    paddingHorizontal: rem(1.5),
    borderRadius: rem(10 / 14),
    alignItems: "center",
    justifyContent: "center",
  },

  // Results
  resultsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  // Grid
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: rem(1),
  },

  // Card
  card: {
    flexGrow: 1,
    flexBasis: "47%",
    minWidth: 280,
    borderWidth: 1,
    borderRadius: rem(14 / 14),
    paddingVertical: rem(1.25),
    paddingHorizontal: rem(1.5),
    gap: rem(0.75),
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 3,
    paddingHorizontal: rem(10 / 14),
    borderRadius: 999,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 15,
    color: "#fff",
    lineHeight: 20,
  },
  cardDesc: {
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
    lineHeight: 19,
  },
  hirerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rem(0.625),
    padding: rem(0.75),
    borderRadius: rem(8 / 14),
  },
  hirerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 6,
  },
  durPill: {
    paddingVertical: 2,
    paddingHorizontal: rem(8 / 14),
    borderRadius: 999,
    borderWidth: 1,
  },
  cardActions: {
    flexDirection: "row",
    gap: rem(0.625),
  },
  viewBtn: {
    flex: 1,
    paddingVertical: rem(0.5),
    paddingHorizontal: rem(1),
    borderRadius: rem(8 / 14),
    alignItems: "center",
  },
  profileBtn: {
    paddingVertical: rem(0.5),
    paddingHorizontal: rem(0.875),
    borderRadius: rem(8 / 14),
    borderWidth: 1,
    alignItems: "center",
  },

  // Empty
  empty: {
    alignItems: "center",
    paddingVertical: rem(4),
    paddingHorizontal: rem(1.5),
    gap: rem(0.75),
  },

  // Skeleton
  skCard: {
    flexGrow: 1,
    flexBasis: "47%",
    minWidth: 280,
    height: 220,
    borderRadius: rem(14 / 14),
    borderWidth: 1,
    opacity: 0.5,
  },

  // Pagination
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: rem(0.75),
    marginTop: rem(1.5),
  },
  pageBtn: {
    paddingVertical: rem(0.4375),
    paddingHorizontal: rem(1),
    borderWidth: 1,
    borderRadius: rem(8 / 14),
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: rem(1),
  },
  modalBox: {
    width: "100%",
    maxWidth: 420,
    borderRadius: rem(16 / 14),
    padding: rem(1.25),
    borderWidth: 1,
  },
  currRow: {
    paddingVertical: rem(0.75),
    paddingHorizontal: rem(0.75),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRadius: rem(8 / 14),
  },
});
