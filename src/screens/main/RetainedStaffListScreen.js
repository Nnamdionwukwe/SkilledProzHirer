// src/screens/main/RetainedStaffListScreen.js
//
// Verbatim port of src/pages/hirer/retained-staff/HirerRetainedStaffList.jsx
// + HirerRetainedStaff.module.css (grid / card sections).
//
// Avatar comes from member.worker.avatar (listStaff returns full worker
// objects per the backend schema).

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Pressable,
  ScrollView,
  TextInput,
  StyleSheet,
  useWindowDimensions,
  RefreshControl,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useNavigation, useRoute } from "@react-navigation/native";

import AppScreen from "../../components/AppScreen";
import AppText from "../../components/AppText";
import EmptyState from "../../components/EmptyState";
import FilterTabs from "../../components/RetainedStaff/FilterTabs";
import AddStaffModal from "../../components/RetainedStaff/AddStaffModal";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import { retainedStaffApi } from "../../api/retainedStaff";
import client from "../../api/client";

const API_BASE = client?.defaults?.baseURL || "https://api.skilledproz.com";

function resolveAvatar(raw) {
  if (!raw || typeof raw !== "string") return null;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  return `${API_BASE}${raw.startsWith("/") ? "" : "/"}${raw}`;
}

function formatMoney(amount, currency = "NGN") {
  if (amount == null) return "—";
  return `${currency} ${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

const STATUS_MAP = (theme) => ({
  ACTIVE: theme.colors.green,
  PAUSED: "#fbbf24",
  ENDED: theme.colors.textMuted,
  TERMINATED: theme.colors.red,
});

export default function RetainedStaffListScreen() {
  const { t } = useTranslation();
  const { theme, fontScale } = useTheme();
  const { toast } = useToast();
  const navigation = useNavigation();
  const route = useRoute();
  const { width } = useWindowDimensions();

  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const isWide = width >= 768;
  const isCompact = width <= 640;
  const rem = (n) => n * 16 * fontScale;
  const c = theme.colors;
  const statusColors = STATUS_MAP(theme);

  const loadStaff = useCallback(
    async (opts = {}) => {
      if (!opts.silent) setLoading(true);
      try {
        const res = await retainedStaffApi.listStaff({
          status: statusFilter || undefined,
          search: search || undefined,
        });
        setStaff(res.data?.data?.staff || []);
      } catch (err) {
        toast.error(
          err?.response?.data?.message || t("retainedStaff.listLoadFailed"),
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [statusFilter, search, toast, t],
  );

  useEffect(() => {
    loadStaff();
  }, [statusFilter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadStaff({ silent: true });
  }, [loadStaff]);

  const handleSearch = () => {
    loadStaff();
  };

  const goBack = () => navigation.navigate("RetainedStaff");
  const goDetail = (memberId) =>
    navigation.navigate("RetainedStaffDetail", { memberId });

  const statuses = [
    { value: "", label: t("retainedStaff.filterAll") },
    { value: "ACTIVE", label: t("retainedStaff.filterActive") },
    { value: "PAUSED", label: t("retainedStaff.filterPaused") },
    { value: "ENDED", label: t("retainedStaff.filterEnded") },
  ];

  return (
    <AppScreen
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={c.orange}
          colors={[c.orange]}
        />
      }
    >
      {/* Back link */}
      <Pressable
        onPress={goBack}
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}
      >
        <Ionicons name="arrow-back" size={16} color={c.textDim} />
        <AppText
          style={{
            fontFamily: theme.fonts?.bodySemiBold || "DMSans_600SemiBold",
            fontSize: rem(0.85),
            fontWeight: "600",
            color: c.textDim,
            marginLeft: 6,
          }}
        >
          {t("retainedStaff.backToPayroll")}
        </AppText>
      </Pressable>

      {/* Header */}
      <View style={[styles.header, isWide && styles.headerRow]}>
        <View style={{ flex: 1 }}>
          <AppText
            style={{
              fontFamily: theme.fonts?.bodyBold || "DMSans_700Bold",
              fontSize: rem(0.75),
              fontWeight: "700",
              letterSpacing: 0.05 * rem(0.75),
              textTransform: "uppercase",
              color: c.orange,
              marginBottom: 4,
            }}
          >
            {t("retainedStaff.eyebrow")}
          </AppText>
          <AppText
            weight="displayBlack"
            style={{
              fontSize: 15,
              letterSpacing: -0.5,
            }}
          >
            {t("retainedStaff.listTitle")}
          </AppText>
          <AppText
            style={{
              fontFamily: theme.fonts?.body || "DMSans_400Regular",
              fontSize: rem(0.85),
              color: c.textDim,
              marginTop: 4,
            }}
          >
            {t("retainedStaff.membersOnPayroll", { count: staff.length })}
          </AppText>
        </View>
        <Pressable
          onPress={() => setShowAdd(true)}
          style={({ pressed }) => [
            styles.addBtn,
            {
              backgroundColor: pressed ? c.orangeHover : c.orange,
              marginTop: isWide ? 0 : 12,
            },
          ]}
        >
          <Ionicons name="add" size={16} color="#fff" />
          <AppText
            style={{
              fontFamily: theme.fonts?.bodySemiBold || "DMSans_600SemiBold",
              fontSize: rem(0.85),
              fontWeight: "600",
              color: "#fff",
              marginLeft: 6,
            }}
          >
            {t("retainedStaff.addStaffShort")}
          </AppText>
        </Pressable>
      </View>

      {/* Filter tabs */}
      <View style={{ marginBottom: 16 }}>
        <FilterTabs
          options={statuses.map((s) => s.label)}
          value={
            statuses.find((s) => s.value === statusFilter)?.label ||
            statuses[0].label
          }
          onChange={(label) => {
            const match = statuses.find((s) => s.label === label);
            setStatusFilter(match?.value || "");
          }}
        />
      </View>

      {/* Search */}
      <View style={{ marginBottom: 16 }}>
        <View
          style={[
            styles.searchWrap,
            { backgroundColor: c.bgInput, borderColor: c.border },
          ]}
        >
          <Ionicons
            name="search-outline"
            size={18}
            color={c.textMuted}
            style={{ marginRight: 8 }}
          />
          <TextInput
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearch}
            placeholder={t("retainedStaff.listSearchPlaceholder")}
            placeholderTextColor={c.textMuted}
            returnKeyType="search"
            style={{
              flex: 1,
              color: c.text,
              fontFamily: theme.fonts?.body || "DMSans_400Regular",
              fontSize: rem(0.9),
              paddingVertical: 0,
            }}
          />
        </View>
      </View>

      {/* Grid */}
      {loading ? (
        <View style={{ gap: 10 }}>
          {[1, 2, 3, 4].map((i) => (
            <View
              key={i}
              style={{
                height: 92,
                backgroundColor: c.bgPanel,
                borderWidth: 1,
                borderColor: c.border,
                borderRadius: 12,
              }}
            />
          ))}
        </View>
      ) : staff.length === 0 ? (
        <EmptyState
          icon="person-outline"
          iconSize={48}
          title={t("retainedStaff.listEmptyTitle")}
          text={t("retainedStaff.listEmptySub")}
          bordered
        >
          <Pressable
            onPress={() => setShowAdd(true)}
            style={({ pressed }) => [
              styles.addBtn,
              {
                backgroundColor: pressed ? c.orangeHover : c.orange,
                marginTop: 16,
              },
            ]}
          >
            <Ionicons name="add" size={16} color="#fff" />
            <AppText
              style={{
                fontFamily: theme.fonts?.bodySemiBold || "DMSans_600SemiBold",
                fontSize: rem(0.85),
                fontWeight: "600",
                color: "#fff",
                marginLeft: 6,
              }}
            >
              {t("retainedStaff.addStaffBtn")}
            </AppText>
          </Pressable>
        </EmptyState>
      ) : (
        <View style={{ gap: 10 }}>
          {staff.map((member) => {
            const avatar = resolveAvatar(
              member?.worker?.avatar || member?.worker?.avatarUrl,
            );
            const statusColor =
              statusColors[member.status] || statusColors.ENDED;
            return (
              <Pressable
                key={member.id}
                onPress={() => goDetail(member.id)}
                style={({ pressed }) => [
                  styles.card,
                  {
                    backgroundColor: c.bgPanel,
                    borderColor: pressed ? c.orange : c.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.avatar,
                    {
                      backgroundColor: c.orangeDim,
                      borderColor: c.orangeGlow,
                    },
                  ]}
                >
                  {avatar ? (
                    <Image source={{ uri: avatar }} style={styles.avatarImg} />
                  ) : (
                    <Ionicons
                      name="person-outline"
                      size={20}
                      color={c.orange}
                    />
                  )}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <AppText
                    numberOfLines={1}
                    style={{
                      fontFamily: theme.fonts?.bodyBold || "DMSans_700Bold",
                      fontSize: rem(0.9),
                      fontWeight: "700",
                      color: c.text,
                    }}
                  >
                    {member?.worker?.firstName} {member?.worker?.lastName}
                  </AppText>
                  <AppText
                    numberOfLines={1}
                    style={{
                      fontFamily: theme.fonts?.body || "DMSans_400Regular",
                      fontSize: rem(0.75),
                      color: c.textDim,
                    }}
                  >
                    {member.jobTitle}
                  </AppText>
                  <AppText
                    numberOfLines={1}
                    style={{
                      fontFamily: theme.fonts?.bodyBold || "DMSans_700Bold",
                      fontSize: rem(0.75),
                      fontWeight: "700",
                      color: c.orange,
                      marginTop: 4,
                    }}
                  >
                    {formatMoney(member.payRate, member.currency)} /{" "}
                    {String(member.payFrequency || "")
                      .toLowerCase()
                      .replace("_", " ")}
                  </AppText>
                </View>
                <View style={{ alignItems: "flex-end", gap: 6 }}>
                  <View
                    style={{
                      borderWidth: 1,
                      borderColor: statusColor,
                      borderRadius: 999,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                    }}
                  >
                    <AppText
                      style={{
                        fontFamily: theme.fonts?.bodyBold || "DMSans_700Bold",
                        fontSize: rem(0.65),
                        fontWeight: "800",
                        letterSpacing: 0.05 * rem(0.65),
                        textTransform: "uppercase",
                        color: statusColor,
                      }}
                    >
                      {member.status}
                    </AppText>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={c.textMuted}
                  />
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      <AddStaffModal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        onSuccess={(member) => {
          loadStaff({ silent: true });
          if (member?.id) goDetail(member.id);
        }}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 20, gap: 8 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 16,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderWidth: 1,
    borderRadius: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
  },
  avatarImg: { width: "100%", height: "100%" },
});
