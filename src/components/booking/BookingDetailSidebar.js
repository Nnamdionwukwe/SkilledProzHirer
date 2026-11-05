// src/components/booking/BookingDetailSidebar.js
//
// Verbatim port of components/booking/BookingDetail/BookingDetailSidebar.jsx.
//
// Structure:
//   · Party card     — avatar + name + phone + Send Message
//   · Actions card   — role-conditional action list

import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";

import AppText from "../AppText";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuthStore } from "../../store/authStore";
import client from "../../api/client";
import {
  FaPhone,
  FaCommentDots,
  FaExclamationTriangle,
  FaMoneyBillWave,
  FaExclamationCircle,
  FaCheckCircle,
  FaVideo,
} from "../../icons/fa";

// ── Optional heavy sub-components — guarded so missing files don't crash ──
let EmergencyContact = () => null;
let SOSButton = () => null;
let GpsCheckIn = () => null;
let InsuranceAddon = () => null;
let VideoCallButton = () => null;

try {
  EmergencyContact =
    require("../booking/EmergencyContact").default || EmergencyContact;
} catch {}
try {
  SOSButton = require("../booking/SOSButton").default || SOSButton;
} catch {}
try {
  GpsCheckIn = require("../booking/GpsCheckIn").default || GpsCheckIn;
} catch {}
try {
  InsuranceAddon = require("../hirer/InsuranceAddon").default || InsuranceAddon;
} catch {}
try {
  VideoCallButton =
    require("../booking/VideoCallButton").default || VideoCallButton;
} catch {}

// ── Helpers ────────────────────────────────────────────────────────────
function ActionBtn({ label, color, loading, onPress, style }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const palette = actionPalette(color, c, loading);

  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        styles.actionBtn,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderWidth: palette.border === "transparent" ? 0 : 1,
          opacity: loading ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <AppText
        style={{
          fontSize: 13,
          fontWeight: "700",
          color: palette.fg,
          textAlign: "center",
        }}
      >
        {loading ? "…" : label}
      </AppText>
    </Pressable>
  );
}

function actionPalette(color, c, loading) {
  switch (color) {
    case "green":
      return { bg: c.green, fg: c.bg, border: "transparent" };
    case "orange":
      return { bg: c.orange, fg: c.bg, border: "transparent" };
    case "indigo":
      return {
        bg: "rgba(129,140,248,0.15)",
        fg: "#818cf8",
        border: "rgba(129,140,248,0.3)",
      };
    case "red":
      return {
        bg: c.redDim,
        fg: c.red,
        border: "rgba(239,68,68,0.3)",
      };
    case "redOutline":
      return {
        bg: "transparent",
        fg: c.red,
        border: c.red,
      };
    case "outline":
    default:
      return {
        bg: "transparent",
        fg: c.textDim,
        border: c.border,
      };
  }
}

// ── Cancel box ─────────────────────────────────────────────────────────
function CancelBox({
  show,
  reason,
  reasonError,
  acting,
  onOpen,
  onClose,
  onChangeReason,
  onConfirm,
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const c = theme.colors;

  if (!show) {
    return (
      <ActionBtn
        label={t("booking.sidebar.cancelBooking", "Cancel Booking")}
        color="redOutline"
        onPress={onOpen}
      />
    );
  }

  return (
    <View style={styles.cancelBox}>
      <AppText
        style={{
          fontSize: 13,
          fontWeight: "600",
          color: c.textDim,
          marginBottom: 4,
        }}
      >
        {t("booking.sidebar.cancelReason", "Reason")}{" "}
        <AppText style={{ color: c.red }}>*</AppText>
      </AppText>
      <View
        style={[
          styles.cancelInputWrap,
          {
            borderColor: reasonError ? c.red : c.border,
            backgroundColor: c.bgInput,
          },
        ]}
      >
        <CancelInput
          value={reason}
          onChange={onChangeReason}
          placeholder={t(
            "booking.sidebar.cancelPlaceholder",
            "Please explain why you are cancelling…",
          )}
        />
      </View>
      {reasonError ? (
        <AppText style={{ fontSize: 12, color: c.red, marginTop: 4 }}>
          {reasonError}
        </AppText>
      ) : null}
      <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
        <Pressable
          onPress={onConfirm}
          disabled={acting}
          style={({ pressed }) => [
            styles.cancelConfirm,
            {
              backgroundColor: c.red,
              opacity: acting ? 0.5 : pressed ? 0.85 : 1,
            },
          ]}
        >
          <AppText style={{ fontSize: 12, fontWeight: "700", color: "#fff" }}>
            {acting
              ? "…"
              : t(
                  "booking.sidebar.confirmCancellation",
                  "Confirm Cancellation",
                )}
          </AppText>
        </Pressable>
        <Pressable
          onPress={onClose}
          style={({ pressed }) => [
            styles.cancelAbort,
            {
              borderColor: c.border,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <AppText
            style={{ fontSize: 12, fontWeight: "600", color: c.textDim }}
          >
            {t("booking.sidebar.keepBooking", "Keep Booking")}
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

function CancelInput({ value, onChange, placeholder }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const React_TextInput = require("react-native").TextInput;
  return (
    <React_TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={c.textMuted}
      multiline
      numberOfLines={3}
      textAlignVertical="top"
      style={{
        minHeight: 76,
        padding: 10,
        color: c.text,
        fontSize: 13,
        lineHeight: 18,
      }}
    />
  );
}

// ── Main component ─────────────────────────────────────────────────────
export default function BookingDetailSidebar({
  booking,
  payment,
  isHirer,
  isWorker,
  other,
  userId,
  acting,
  emergencyContact,
  showCancel,
  cancelReason,
  cancelError,
  onCancelOpen,
  onCancelClose,
  onCancelReasonChange,
  onCancelSubmit,
  onShowDispute,
  onSuccess,
  refetch,
  updateStatus,
  onRelease,
}) {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { user: viewerUser } = useAuthStore();
  const c = theme.colors;

  const [openingChat, setOpeningChat] = useState(false);
  const isRetainedStaff = booking?.source === "RETAINED_STAFF";

  const openProfile = () => {
    if (!other?.id) return;
  };

  const callPhone = () => {
    if (other?.phone) Linking.openURL(`tel:${other.phone}`);
  };

  const handleMessage = async () => {
    if (!other?.id || openingChat) return;
    setOpeningChat(true);
    try {
      const res = await client.get("/messages/conversations", {
        params: { page: 1, limit: 100, _t: Date.now() },
      });
      const convos = res.data?.data?.conversations || [];
      const peerIdStr = String(other.id);
      const myIdStr = String(viewerUser?.id || "");

      const existing = convos.find((convo) => {
        const usersArr = convo.users || [];
        const otherUser = usersArr.find((u) => {
          const uid = String(u.userId || u.user?.id || u.id);
          return uid !== myIdStr;
        });
        const otherId = otherUser
          ? String(otherUser.userId || otherUser.user?.id || otherUser.id)
          : null;
        if (otherId === peerIdStr) return true;
        const last = convo.messages?.[0] ?? convo.lastMessage;
        if (last?.senderId === peerIdStr || last?.receiverId === peerIdStr)
          return true;
        return false;
      });

      if (existing?.id) {
        navigation.navigate("Chat", {
          conversationId: existing.id,
          withUserId: other.id,
        });
      } else {
        navigation.navigate("Chat", { withUserId: other.id });
      }
    } catch {
      navigation.navigate("Chat", { withUserId: other.id });
    } finally {
      setOpeningChat(false);
    }
  };

  return (
    <View style={{ gap: 10 }}>
      {/* ══════════ PARTY CARD ══════════ */}
      <View
        style={[
          styles.partyCard,
          { backgroundColor: c.bgPanel, borderColor: c.border },
        ]}
      >
        <AppText
          style={{
            fontSize: 10,
            fontWeight: "700",
            textTransform: "uppercase",
            letterSpacing: 1,
            color: c.orange,
          }}
        >
          {isHirer
            ? t("booking.sidebar.workerLabel", "WORKER")
            : t("booking.sidebar.hirerLabel", "HIRER")}
        </AppText>

        <Pressable onPress={openProfile}>
          <View
            style={[
              styles.partyAvatar,
              { backgroundColor: c.orangeDim, borderColor: c.orange },
            ]}
          >
            {other?.avatar ? (
              <Image
                source={{ uri: other.avatar }}
                style={styles.partyAvatarImg}
              />
            ) : (
              <AppText
                style={{ fontSize: 18, fontWeight: "700", color: c.orange }}
              >
                {other?.firstName?.[0]}
                {other?.lastName?.[0]}
              </AppText>
            )}
          </View>
        </Pressable>

        <Pressable onPress={openProfile}>
          <AppText style={{ fontSize: 15, fontWeight: "700", color: c.text }}>
            {other?.firstName || t("booking.sidebar.unknownUser", "Unknown")}{" "}
            {other?.lastName || t("booking.sidebar.unknownUser", "User")}
          </AppText>
        </Pressable>

        {other?.phone ? (
          <Pressable
            onPress={callPhone}
            style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
          >
            <FaPhone size={12} color={c.textDim} />
            <AppText style={{ fontSize: 13, color: c.textDim }}>
              {other.phone}
            </AppText>
          </Pressable>
        ) : null}

        <Pressable
          onPress={handleMessage}
          disabled={openingChat}
          style={({ pressed }) => [
            styles.messageBtn,
            {
              backgroundColor: c.orangeDim,
              borderColor: c.orange,
              opacity: openingChat ? 0.5 : pressed ? 0.85 : 1,
            },
          ]}
        >
          {openingChat ? (
            <ActivityIndicator size="small" color={c.orange} />
          ) : (
            <FaCommentDots size={12} color={c.orange} />
          )}
          <AppText
            style={{
              fontSize: 13,
              fontWeight: "700",
              color: c.orange,
              marginLeft: 6,
            }}
          >
            {t("booking.sidebar.sendMessage", "Send Message")}
          </AppText>
        </Pressable>
      </View>

      {/* ══════════ ACTIONS CARD ══════════ */}
      <View
        style={[
          styles.actionsCard,
          { backgroundColor: c.bgPanel, borderColor: c.border },
        ]}
      >
        <AppText
          style={{
            fontSize: 11,
            fontWeight: "700",
            textTransform: "uppercase",
            letterSpacing: 1,
            color: c.textDim,
            marginBottom: 4,
          }}
        >
          {t("booking.sidebar.actions", "Actions")}
        </AppText>

        {/* ── WORKER BRANCH ─────────────────────────────────────── */}
        {isWorker && (
          <>
            <EmergencyContact
              bookingId={booking.id}
              bookingStatus={booking.status}
              isWorker={isWorker}
              existing={emergencyContact}
              onSaved={() => refetch && refetch()}
            />

            <SOSButton
              bookingId={booking.id}
              bookingStatus={booking.status}
              isWorker={isWorker}
              sosActivatedAt={booking.sosActivatedAt}
              sosResolvedAt={booking.sosResolvedAt}
              onUpdate={() => refetch && refetch()}
            />

            {!isRetainedStaff && booking.status === "PENDING" && (
              <ActionBtn
                label={t("booking.sidebar.acceptBooking", "Accept Booking")}
                color="green"
                loading={acting}
                onPress={() => updateStatus("ACCEPTED")}
              />
            )}

            {!isRetainedStaff &&
              booking.status === "ACCEPTED" &&
              payment?.status === "HELD" && (
                <GpsCheckIn
                  bookingId={booking.id}
                  status={booking.status}
                  isWorker={isWorker}
                  jobLatitude={booking.latitude}
                  jobLongitude={booking.longitude}
                  onSuccess={(updated) => {
                    refetch && refetch();
                    onSuccess?.(
                      updated.status === "IN_PROGRESS"
                        ? "Checked in — job is now in progress."
                        : "Checked out — job marked as completed.",
                    );
                  }}
                />
              )}

            {!isRetainedStaff &&
              booking.status === "ACCEPTED" &&
              (!payment || payment.status === "PENDING") && (
                <View
                  style={[
                    styles.waitingPayment,
                    {
                      backgroundColor: "rgba(251,191,36,0.1)",
                      borderColor: "rgba(251,191,36,0.25)",
                    },
                  ]}
                >
                  <FaExclamationCircle size={12} color="#fbbf24" />
                  <AppText
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: "#fbbf24",
                      marginLeft: 6,
                      flex: 1,
                    }}
                  >
                    {t(
                      "booking.sidebar.waitingPayment",
                      "Waiting for hirer to complete payment before you can check in.",
                    )}
                  </AppText>
                </View>
              )}

            {!isRetainedStaff && booking.status === "IN_PROGRESS" && (
              <GpsCheckIn
                bookingId={booking.id}
                status={booking.status}
                isWorker={isWorker}
                jobLatitude={booking.latitude}
                jobLongitude={booking.longitude}
                onSuccess={() => {
                  refetch && refetch();
                  onSuccess?.("Checked out — job marked as completed.");
                }}
              />
            )}

            {["PENDING", "ACCEPTED"].includes(booking.status) && (
              <CancelBox
                show={showCancel}
                reason={cancelReason}
                reasonError={cancelError}
                acting={acting}
                onOpen={onCancelOpen}
                onClose={onCancelClose}
                onChangeReason={onCancelReasonChange}
                onConfirm={onCancelSubmit}
              />
            )}
          </>
        )}

        {/* ── HIRER BRANCH ──────────────────────────────────────── */}
        {isHirer && (
          <>
            {emergencyContact?.name ? (
              <View
                style={[
                  styles.emergencyCard,
                  {
                    backgroundColor: "rgba(239,68,68,0.06)",
                    borderColor: "rgba(239,68,68,0.2)",
                  },
                ]}
              >
                <AppText
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: c.red,
                    textTransform: "uppercase",
                    letterSpacing: 0.8,
                    marginBottom: 8,
                  }}
                >
                  <FaExclamationTriangle size={11} color={c.red} />{" "}
                  {t(
                    "booking.sidebar.emergencyContact",
                    "Worker's Emergency Contact",
                  )}
                </AppText>
                <InfoRow
                  label={t("booking.sidebar.emergencyName", "Name")}
                  value={emergencyContact.name}
                />
                <InfoRow
                  label={t("booking.sidebar.emergencyPhone", "Phone")}
                  value={emergencyContact.phone}
                  valueStyle={{ color: c.red }}
                />
                {emergencyContact.relationship ? (
                  <InfoRow
                    label={t("booking.sidebar.emergencyRelation", "Relation")}
                    value={emergencyContact.relationship}
                  />
                ) : null}
              </View>
            ) : null}

            {!isRetainedStaff && booking.status === "ACCEPTED" && (
              <InsuranceAddon
                bookingId={booking.id}
                booking={booking}
                onPurchased={() => onSuccess?.("Insurance activated.")}
              />
            )}

            {payment?.status === "HELD" && (
              <ActionBtn
                label={t("booking.sidebar.releasePayment", "Release Payment")}
                color="green"
                onPress={onRelease}
              />
            )}

            {["PENDING", "ACCEPTED"].includes(booking.status) && (
              <CancelBox
                show={showCancel}
                reason={cancelReason}
                reasonError={cancelError}
                acting={acting}
                onOpen={onCancelOpen}
                onClose={onCancelClose}
                onChangeReason={onCancelReasonChange}
                onConfirm={onCancelSubmit}
              />
            )}
          </>
        )}

        {/* Video call */}
        {(isHirer || isWorker) && (
          <VideoCallButton
            bookingId={booking.id}
            bookingStatus={booking.status}
            userId={userId}
            hirerId={booking.hirerId}
            workerId={booking.workerId}
          />
        )}

        {/* Raise dispute — ACCEPTED / IN_PROGRESS / COMPLETED / PAID */}
        {(isHirer || isWorker) &&
          ["ACCEPTED", "IN_PROGRESS", "COMPLETED", "PAID"].includes(
            booking.status,
          ) && (
            <Pressable
              onPress={onShowDispute}
              style={({ pressed }) => [
                styles.actionBtn,
                {
                  backgroundColor: c.redDim,
                  borderColor: "rgba(239,68,68,0.3)",
                  borderWidth: 1,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <FaExclamationTriangle size={11} color={c.red} />
              <AppText
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: c.red,
                  marginLeft: 6,
                }}
              >
                {t("booking.sidebar.raiseDispute", "Raise a Dispute")}
              </AppText>
            </Pressable>
          )}

        {!isHirer && !isWorker && (
          <AppText
            style={{
              fontSize: 13,
              color: c.textMuted,
              textAlign: "center",
              paddingVertical: 8,
            }}
          >
            {t("booking.sidebar.noActions", "No actions available.")}
          </AppText>
        )}
      </View>
    </View>
  );
}

function InfoRow({ label, value, valueStyle }) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 8,
        paddingVertical: 5,
      }}
    >
      <AppText style={{ fontSize: 11, color: c.textMuted }}>{label}</AppText>
      <AppText
        style={[
          {
            fontSize: 13,
            fontWeight: "600",
            color: c.text,
            textAlign: "right",
          },
          valueStyle,
        ]}
        numberOfLines={2}
      >
        {value}
      </AppText>
    </View>
  );
}

// ── Styles (verbatim from CSS, mobile root 14) ─────────────────────────
const styles = StyleSheet.create({
  partyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    gap: 8,
  },
  partyAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  partyAvatarImg: { width: "100%", height: "100%" },
  messageBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },

  actionsCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    gap: 10,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    minHeight: 42,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 6,
  },

  emergencyCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },

  waitingPayment: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },

  cancelBox: {
    paddingTop: 4,
    gap: 6,
  },
  cancelInputWrap: {
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: "transparent",
    overflow: "hidden",
  },
  cancelConfirm: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelAbort: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
