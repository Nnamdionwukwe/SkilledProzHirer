// src/screens/main/CategoryDetailScreen.js
//
// Port of pages/categories/CategoryDetail.jsx (verbatim behavior).
// Loads GET /categories/:slug/workers?limit=40, renders a 2-col grid of
// worker cards, each with a bookmark toggle backed by useSavedWorker.
//
// Assumes:
//   - navigation.navigate("WorkerProfile", { userId }) exists
//   - useSavedWorker(userId, { enabled }) is available at
//     src/hooks/useSavedWorker.js — if not, see NOTE at the bottom.

import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "react-native";

import AppText from "../../components/AppText";
import Skeleton from "../../components/Skeleton";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuthStore } from "../../store/authStore";
import useSavedWorker from "../../hooks/useSavedWorker";
import client from "../../api/client";
import {
  FaArrowLeft,
  FaMapMarkerAlt,
  FaDollarSign,
  FaUsers,
  FaUser,
  FaBookmark,
  FaStar,
  FaStarHalf,
  FaRegStar,
} from "../../icons/fa";

// Shared star renderer
function Stars({ rating, c }) {
  if (!rating) return null;
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 1 }}>
      {[...Array(fullStars)].map((_, i) => (
        <FaStar key={`f-${i}`} size={12} color={c.orange} />
      ))}
      {halfStar ? <FaStarHalf size={12} color={c.orange} /> : null}
      {[...Array(emptyStars)].map((_, i) => (
        <FaRegStar key={`e-${i}`} size={12} color={c.border} />
      ))}
    </View>
  );
}

// ── Single worker card ──────────────────────────────────────────────────
function WorkerCard({ worker, c, onPress }) {
  const { user: viewer } = useAuthStore();
  const isHirer = viewer?.role === "HIRER";

  const isSearchShape = !!worker.user;
  const userId = isSearchShape ? worker.user?.id : worker.id;
  const firstName = isSearchShape ? worker.user?.firstName : worker.firstName;
  const lastName = isSearchShape ? worker.user?.lastName : worker.lastName;
  const avatar = isSearchShape ? worker.user?.avatar : worker.avatar;
  const city = isSearchShape ? worker.user?.city : worker.city;
  const wp = isSearchShape ? worker : worker.workerProfile;

  const { isSaved, checking, toggling, toggle } = useSavedWorker(userId, {
    enabled: isHirer,
  });

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: pressed ? c.bgPanel : c.bgCard,
          borderColor: pressed ? c.orange : c.border,
        },
      ]}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: c.bgInput || c.bgCard,
          borderWidth: 2,
          borderColor: c.border,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          marginBottom: 4,
        }}
      >
        {avatar ? (
          <Image
            source={{ uri: avatar }}
            style={{ width: "100%", height: "100%" }}
          />
        ) : (
          <FaUser size={22} color={c.textDim} />
        )}
      </View>

      <AppText
        numberOfLines={1}
        style={{
          fontFamily: "Syne_700Bold",
          fontSize: 14,
          fontWeight: "600",
          color: c.text,
          textAlign: "center",
        }}
      >
        {`${firstName || ""} ${lastName || ""}`.trim()}
      </AppText>

      {wp?.title ? (
        <AppText
          numberOfLines={1}
          style={{
            fontSize: 12,
            color: c.textDim,
            textAlign: "center",
          }}
        >
          {wp.title}
        </AppText>
      ) : null}

      {/* Rating */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 5,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {wp?.avgRating ? (
          <>
            <Stars rating={wp.avgRating} c={c} />
            <AppText style={{ fontSize: 12, fontWeight: "600", color: c.text }}>
              {wp.avgRating.toFixed(1)}
            </AppText>
            <AppText style={{ fontSize: 10, color: c.textDim }}>
              {`(${wp.totalReviews || 0} reviews)`}
            </AppText>
          </>
        ) : (
          <AppText
            style={{
              fontSize: 11,
              fontWeight: "500",
              color: c.textMuted,
            }}
          >
            New
          </AppText>
        )}
      </View>

      {city ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
          <FaMapMarkerAlt size={11} color={c.textDim} />
          <AppText style={{ fontSize: 11, color: c.textDim }}>{city}</AppText>
        </View>
      ) : null}

      {wp?.hourlyRate ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
          <FaDollarSign size={12} color={c.orange} />
          <AppText style={{ fontSize: 13, fontWeight: "600", color: c.orange }}>
            {`${wp.currency || "USD"} ${wp.hourlyRate}/hr`}
          </AppText>
        </View>
      ) : null}

      {/* Footer */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          marginTop: 6,
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: c.border,
          width: "100%",
        }}
      >
        {wp?.isAvailable ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              paddingHorizontal: 10,
              paddingVertical: 4,
              backgroundColor: c.greenDim,
              borderRadius: 6,
            }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: c.green,
              }}
            />
            <AppText
              style={{
                fontSize: 11,
                fontWeight: "600",
                color: c.green,
              }}
            >
              Available
            </AppText>
          </View>
        ) : (
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 4,
              backgroundColor: c.bgInput || c.bgCard,
              borderRadius: 6,
            }}
          >
            <AppText
              style={{
                fontSize: 11,
                fontWeight: "600",
                color: c.textMuted,
              }}
            >
              Busy
            </AppText>
          </View>
        )}

        {isHirer ? (
          <Pressable
            onPress={(e) => {
              e?.stopPropagation?.();
              toggle();
            }}
            disabled={checking || toggling}
            hitSlop={6}
            style={({ pressed }) => [
              {
                width: 28,
                height: 28,
                borderRadius: 14,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: isSaved ? c.orangeDim : c.bgInput || c.bgCard,
                borderWidth: 1,
                borderColor: isSaved ? c.orangeGlow : c.border,
                opacity: checking || toggling ? 0.5 : pressed ? 0.75 : 1,
              },
            ]}
          >
            <FaBookmark size={13} color={isSaved ? c.orange : c.textDim} />
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

// ── Main screen ─────────────────────────────────────────────────────────
export default function CategoryDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const c = theme.colors;

  const slug = route.params?.slug;

  const [category, setCategory] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError("");

    client
      .get(`/categories/${slug}/workers`, { params: { limit: 40 } })
      .then((res) => {
        const payload = res.data.data;
        setCategory(payload.category);
        setWorkers(payload.workers || []);
      })
      .catch((err) => {
        if (__DEV__)
          console.log(
            "[CategoryDetail] failed:",
            err?.response?.data || err?.message,
          );
        setError(
          err?.response?.status === 404
            ? "Category not found"
            : "Could not load workers for this category",
        );
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const goBackToCategories = () => navigation.navigate("BrowseByCategories");

  if (error || (!loading && !category)) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: c.bg }}
        edges={["top", "left", "right"]}
      >
        <View style={{ padding: 20, alignItems: "center", gap: 16 }}>
          <AppText
            style={{
              fontFamily: "Syne_800ExtraBold",
              fontSize: 22,
              fontWeight: "700",
              color: c.text,
            }}
          >
            Category not found
          </AppText>
          <Pressable
            onPress={goBackToCategories}
            style={({ pressed }) => [
              {
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderWidth: 1,
                borderColor: c.orange,
                borderRadius: 8,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <FaArrowLeft size={14} color={c.orange} />
            <AppText
              style={{ fontSize: 13, fontWeight: "500", color: c.orange }}
            >
              Back to Categories
            </AppText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: c.bg }}
      edges={["top", "left", "right"]}
    >
      <View style={{ flex: 1, padding: 16 }}>
        {/* Header */}
        <View style={{ alignItems: "center", marginBottom: 20 }}>
          <Pressable
            onPress={goBackToCategories}
            style={({ pressed }) => [
              {
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderWidth: 1,
                borderColor: c.orange,
                borderRadius: 8,
                alignSelf: "flex-start",
                marginBottom: 16,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <FaArrowLeft size={14} color={c.orange} />
            <AppText
              style={{ fontSize: 13, fontWeight: "500", color: c.orange }}
            >
              Back
            </AppText>
          </Pressable>

          {loading ? (
            <>
              <Skeleton
                width={64}
                height={64}
                radius={12}
                style={{ marginBottom: 10 }}
              />
              <Skeleton
                width={220}
                height={30}
                radius={8}
                style={{ marginBottom: 8 }}
              />
              <Skeleton width={140} height={16} radius={6} />
            </>
          ) : (
            <>
              {category.icon ? (
                <AppText style={{ fontSize: 44, marginBottom: 6 }}>
                  {category.icon}
                </AppText>
              ) : null}
              <AppText
                style={{
                  fontFamily: "Syne_800ExtraBold",
                  fontSize: 24,
                  fontWeight: "700",
                  color: c.text,
                  textAlign: "center",
                }}
              >
                {category.name}
              </AppText>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 6,
                }}
              >
                <FaUsers size={14} color={c.textDim} />
                <AppText style={{ fontSize: 14, color: c.textDim }}>
                  {`${workers.length} workers available`}
                </AppText>
              </View>
            </>
          )}
        </View>

        {/* Grid */}
        {loading ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", margin: -6 }}>
            {[...Array(8)].map((_, i) => (
              <View key={i} style={{ width: "50%", padding: 6 }}>
                <Skeleton
                  width="100%"
                  height={220}
                  radius={12}
                  style={{ backgroundColor: c.bgCard }}
                />
              </View>
            ))}
          </View>
        ) : workers.length === 0 ? (
          <View
            style={{
              alignItems: "center",
              paddingVertical: 40,
              gap: 12,
            }}
          >
            <FaUsers size={44} color={c.textMuted} />
            <AppText
              style={{ fontSize: 14, color: c.textDim, textAlign: "center" }}
            >
              No workers found in this category
            </AppText>
            <Pressable
              onPress={goBackToCategories}
              style={({ pressed }) => [
                {
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderWidth: 1,
                  borderColor: c.orange,
                  borderRadius: 8,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <FaArrowLeft size={14} color={c.orange} />
              <AppText
                style={{ fontSize: 13, fontWeight: "500", color: c.orange }}
              >
                Browse other categories
              </AppText>
            </Pressable>
          </View>
        ) : (
          <View style={{ flexDirection: "row", flexWrap: "wrap", margin: -6 }}>
            {workers.map((worker, i) => {
              const isSearchShape = !!worker.user;
              const userId = isSearchShape ? worker.user?.id : worker.id;
              return (
                <View key={userId || i} style={{ width: "50%", padding: 6 }}>
                  <WorkerCard
                    worker={worker}
                    c={c}
                    onPress={() =>
                      userId && navigation.navigate("WorkerProfile", { userId })
                    }
                  />
                </View>
              );
            })}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
});
