// src/screens/main/FeaturedBoostScreen.js
// Endpoints: GET /featured/packages
//            GET /featured/my
//            GET /categories
//            POST /featured/checkout  → opens Stripe URL in browser
// Mirrors website FeaturedBoost page exactly.

import React, { useState, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import AppText from "../../components/AppText";
import {
  getPackages,
  getMyFeatured,
  createFeaturedCheckout,
} from "../../api/featured";
import { categoriesApi } from "../../api/categories";

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ── Category Picker Modal ─────────────────────────────────────────────────────
function CategoryModal({
  visible,
  onClose,
  categories,
  selected,
  onSelect,
  c,
  modalBg,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={m.backdrop} onPress={onClose}>
        <Pressable
          style={[
            m.sheet,
            { backgroundColor: modalBg, borderTopColor: c.border },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[m.handle, { backgroundColor: c.border }]} />
          <AppText style={[m.title, { color: c.text }]}>
            Feature in specific category
          </AppText>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* All categories option */}
            <Pressable
              onPress={() => {
                onSelect(null);
                onClose();
              }}
              style={[
                m.option,
                {
                  borderBottomColor: c.border,
                  backgroundColor: !selected ? `${c.orange}15` : "transparent",
                },
              ]}
            >
              <AppText
                variant="body"
                weight={!selected ? "semibold" : "regular"}
                style={{ color: !selected ? c.orange : c.text }}
              >
                All categories
              </AppText>
              {!selected && <AppText style={{ color: c.orange }}>✓</AppText>}
            </Pressable>
            {categories.map((cat) => {
              const isSelected = selected === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => {
                    onSelect(cat.id);
                    onClose();
                  }}
                  style={[
                    m.option,
                    {
                      borderBottomColor: c.border,
                      backgroundColor: isSelected
                        ? `${c.orange}15`
                        : "transparent",
                    },
                  ]}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      flex: 1,
                      gap: 10,
                    }}
                  >
                    {cat.icon && (
                      <AppText style={{ fontSize: 18 }}>{cat.icon}</AppText>
                    )}
                    <AppText
                      variant="body"
                      weight={isSelected ? "semibold" : "regular"}
                      style={{ color: isSelected ? c.orange : c.text, flex: 1 }}
                    >
                      {cat.name}
                    </AppText>
                  </View>
                  {isSelected && (
                    <AppText style={{ color: c.orange }}>✓</AppText>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Package Card ──────────────────────────────────────────────────────────────
function PackageCard({ pkg, selected, onSelect, c }) {
  const isSelected = selected === pkg.id;
  return (
    <Pressable
      onPress={() => onSelect(pkg.id)}
      style={[
        s.pkgCard,
        {
          backgroundColor: isSelected ? `${c.orange}15` : c.bgCard,
          borderColor: isSelected ? c.orange : c.border,
          borderWidth: isSelected ? 2 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      {/* Best Value badge */}
      {pkg.popular && (
        <View style={[s.popularBadge, { backgroundColor: c.orange }]}>
          <AppText
            variant="small"
            weight="semibold"
            style={{ color: "#fff", fontSize: 11 }}
          >
            Best Value
          </AppText>
        </View>
      )}

      {/* Days */}
      <AppText
        style={{
          color: c.textMuted,
          fontSize: 11,
          fontWeight: "700",
          letterSpacing: 1.2,
          marginBottom: 6,
        }}
      >
        {pkg.days} DAYS
      </AppText>

      {/* Name */}
      <AppText weight="semibold" style={[s.pkgName, { color: c.text }]}>
        {pkg.name}
      </AppText>

      {/* Price */}
      <View style={s.priceRow}>
        <AppText
          style={{
            color: c.textMuted,
            fontSize: 13,
            marginRight: 4,
            alignSelf: "flex-end",
            marginBottom: 2,
          }}
        >
          {pkg.currency}
        </AppText>
        <AppText
          weight="displayBlack"
          style={[s.priceAmount, { color: c.orange }]}
        >
          {pkg.price.toLocaleString()}
        </AppText>
      </View>

      {/* Description */}
      <AppText
        variant="small"
        style={{ color: c.textMuted, lineHeight: 20, marginTop: 4 }}
      >
        {pkg.description}
      </AppText>
    </Pressable>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton({ c }) {
  return (
    <View style={s.grid}>
      {[1, 2, 3].map((i) => (
        <View
          key={i}
          style={[
            s.pkgCard,
            {
              backgroundColor: c.bgCard,
              borderColor: c.border,
              minHeight: 160,
              opacity: 0.4,
            },
          ]}
        />
      ))}
    </View>
  );
}

// ── Active Listing Banner ─────────────────────────────────────────────────────
function ActiveBanner({ listing, c }) {
  return (
    <View
      style={[
        s.activeBanner,
        { backgroundColor: `${c.orange}12`, borderColor: `${c.orange}50` },
      ]}
    >
      <AppText style={{ fontSize: 22 }}>⭐</AppText>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <AppText variant="body" weight="semibold" style={{ color: c.text }}>
          Featured listing is active
        </AppText>
        <AppText variant="small" style={{ color: c.textMuted, marginTop: 2 }}>
          Expires {fmtDate(listing.expiresAt)}
          {listing.category?.name
            ? ` · ${listing.category.name}`
            : " · All categories"}
        </AppText>
      </View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function FeaturedBoostScreen({ navigation }) {
  const { theme: th } = useTheme();
  const c = th.colors;
  const { toast } = useToast();
  const modalBg = th.mode === "dark" ? "#111118" : "#ffffff";

  const [packages, setPackages] = useState([]);
  const [current, setCurrent] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedPkg, setSelectedPkg] = useState(null);
  const [selectedCat, setSelectedCat] = useState(null);
  const [showCatModal, setShowCatModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [pkgs, my, cats] = await Promise.all([
        getPackages(),
        getMyFeatured(),
        categoriesApi.getAll({ limit: 200 }),
      ]);
      setPackages(pkgs);
      setCurrent(my);
      setCategories(cats ?? []);
    } catch {
      toast.error("Failed to load featured options");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handlePurchase = async () => {
    if (!selectedPkg) {
      toast.error("Please select a package");
      return;
    }
    setPurchasing(true);
    try {
      const data = await createFeaturedCheckout(selectedPkg, selectedCat);
      if (data?.url) {
        await Linking.openURL(data.url);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Checkout failed");
    } finally {
      setPurchasing(false);
    }
  };

  const selectedPkgObj = packages.find((p) => p.id === selectedPkg);
  const selectedCatObj = categories.find((c) => c.id === selectedCat);

  return (
    <ScrollView
      style={[s.screen, { backgroundColor: c.bg }]}
      contentContainerStyle={s.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={c.orange}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero ── */}
      <View style={s.hero}>
        <AppText weight="displayBlack" style={[s.heroTitle, { color: c.text }]}>
          ⭐ Featured Listing
        </AppText>
        <AppText style={[s.heroSub, { color: c.textMuted }]}>
          Appear at the top of search and get more visibility
        </AppText>
      </View>

      {/* ── Active listing banner ── */}
      {!loading && current?.isActive && current?.listing && (
        <ActiveBanner listing={current.listing} c={c} />
      )}

      {/* ── Packages grid ── */}
      {loading ? (
        <Skeleton c={c} />
      ) : (
        <View style={s.grid}>
          {packages.map((pkg) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              selected={selectedPkg}
              onSelect={setSelectedPkg}
              c={c}
            />
          ))}
        </View>
      )}

      {/* ── Category picker (shown after selecting a package) ── */}
      {!loading && selectedPkg && (
        <View style={s.catSection}>
          <AppText
            variant="small"
            style={{ color: c.textMuted, marginBottom: 10 }}
          >
            Feature in specific category (optional):
          </AppText>
          <Pressable
            onPress={() => setShowCatModal(true)}
            style={[
              s.catSelector,
              { backgroundColor: c.bgCard, borderColor: c.border },
            ]}
          >
            <AppText variant="body" style={{ color: c.text, flex: 1 }}>
              {selectedCatObj
                ? `${selectedCatObj.icon ? `${selectedCatObj.icon} ` : ""}${selectedCatObj.name}`
                : "All categories"}
            </AppText>
            <AppText style={{ color: c.textMuted }}>▾</AppText>
          </Pressable>
        </View>
      )}

      {/* ── Summary + CTA ── */}
      {!loading && (
        <View style={s.footer}>
          {selectedPkgObj && (
            <AppText
              variant="small"
              style={{
                color: c.textMuted,
                marginBottom: 12,
                textAlign: "center",
              }}
            >
              {selectedPkgObj.name} — {selectedPkgObj.currency}{" "}
              {selectedPkgObj.price.toLocaleString()} for {selectedPkgObj.days}{" "}
              days
            </AppText>
          )}
          <Pressable
            onPress={handlePurchase}
            disabled={!selectedPkg || purchasing}
            style={[
              s.purchaseBtn,
              {
                backgroundColor: selectedPkg ? c.orange : c.bgCard,
                borderColor: selectedPkg ? c.orange : c.border,
                borderWidth: selectedPkg ? 0 : 1,
                opacity: purchasing ? 0.75 : 1,
              },
            ]}
          >
            {purchasing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <AppText
                variant="body"
                weight="semibold"
                style={{ color: selectedPkg ? "#fff" : c.textMuted }}
              >
                ⭐ Activate Featured Listing
              </AppText>
            )}
          </Pressable>
        </View>
      )}

      <View style={{ height: 40 }} />

      {/* Category modal */}
      <CategoryModal
        visible={showCatModal}
        onClose={() => setShowCatModal(false)}
        categories={categories}
        selected={selectedCat}
        onSelect={setSelectedCat}
        c={c}
        modalBg={modalBg}
      />
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

  hero: { marginBottom: 24 },
  heroTitle: {
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -0.5,
    lineHeight: 38,
    marginBottom: 8,
  },
  heroSub: { fontSize: 15, lineHeight: 22 },

  activeBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },

  // Package grid — 2 columns
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  pkgCard: {
    width: "47.5%",
    borderRadius: 16,
    padding: 14,
    position: "relative",
    overflow: "visible",
    marginTop: 10, // room for "Best Value" badge
  },
  popularBadge: {
    position: "absolute",
    top: -12,
    right: -4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    zIndex: 10,
  },
  pkgName: { fontSize: 16, fontWeight: "800", marginBottom: 8 },
  priceRow: { flexDirection: "row", alignItems: "baseline", marginBottom: 4 },
  priceAmount: {
    fontSize: 40,
    fontWeight: "900",
    letterSpacing: -1,
    lineHeight: 48,
  },

  // Category selector
  catSection: { marginBottom: 20 },
  catSelector: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 16,
  },

  // Footer
  footer: { marginTop: 4 },
  purchaseBtn: {
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: "center",
  },
});

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
    maxHeight: "75%",
    padding: 20,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: "800", marginBottom: 14 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
