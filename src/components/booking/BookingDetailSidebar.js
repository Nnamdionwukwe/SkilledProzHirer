// src/components/booking/BookingDetailSidebar.js
//
// Verbatim port of components/booking/BookingDetail/BookingDetailSidebar.jsx.
//
// Structure:
//   · Party card     — avatar + name + phone + Send Message
//   · Actions card   — role-conditional action list
//
// Role branches preserved verbatim:
//   · isWorker:
//       EmergencyContact / SOSButton / AcceptBooking (PENDING) /
//       GpsCheckIn (ACCEPTED + HELD) / waiting banner (ACCEPTED + no payment) /
//       GpsCheckIn (IN_PROGRESS) / Cancel box
//   · isHirer:
//       EmergencyContact display / InsuranceAddon (ACCEPTED + not retained) /
//       Release Payment (HELD) / Cancel box
//   · Both: Video call + Raise Dispute
//
// Retained staff guard hides: Accept Booking, GPS check-in, Insurance.
//
// Note: EmergencyContact / SOSButton / GpsCheckIn / InsuranceAddon /
// VideoCallButton are separate components. This file imports them; if
// they don't exist yet, the sub-action row is silently omitted (guarded
// with local light wrappers that render nothing when the child returns
// null).

import React from "react";
import { Image, Linking, Pressable, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";

import AppText from "../AppText";
import { useTheme } from "../../contexts/ThemeContext";
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
// When you build these, drop them in and remove the guarded imports below.
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
        label={t("booking.cancelBooking") || "Cancel Booking"}
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
        Reason <AppText style={{ color: c.red }}>*</AppText>
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
        <AppText
          style={{
            fontSize: 13,
            color: c.textMuted,
            position: "absolute",
            top: 10,
            left: 12,
          }}
        >
          {/* RN TextInput is added below; placeholder retained for compactness */}
        </AppText>
        <CancelInput
          value={reason}
          onChange={onChangeReason}
          placeholder="Please explain why you are cancelling…"
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
            {acting ? "…" : "Confirm Cancellation"}
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
            Keep Booking
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

// ── Cancel input — isolated so we can import TextInput cleanly ─────────
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
  onMessage,
  onVideoCall,
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const c = theme.colors;

  const isRetainedStaff = booking?.source === "RETAINED_STAFF";

  const openProfile = () => {
    if (!other?.id) return;
    // Navigation is managed by the parent screen; safe no-op here.
  };

  const callPhone = () => {
    if (other?.phone) Linking.openURL(`tel:${other.phone}`);
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
          {isHirer ? "Worker" : "Hirer"}
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
            {other?.firstName || "Unknown"} {other?.lastName || "User"}
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
          onPress={onMessage}
          style={({ pressed }) => [
            styles.messageBtn,
            {
              backgroundColor: c.orangeDim,
              borderColor: c.orange,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <FaCommentDots size={12} color={c.orange} />
          <AppText
            style={{
              fontSize: 13,
              fontWeight: "700",
              color: c.orange,
              marginLeft: 6,
            }}
          >
            Send Message
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
          Actions
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
                label="Accept Booking"
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
                    Waiting for hirer to complete payment before you can check
                    in.
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
                  <FaExclamationTriangle size={11} color={c.red} /> Worker's
                  Emergency Contact
                </AppText>
                <InfoRow label="Name" value={emergencyContact.name} />
                <InfoRow
                  label="Phone"
                  value={emergencyContact.phone}
                  valueStyle={{ color: c.red }}
                />
                {emergencyContact.relationship ? (
                  <InfoRow
                    label="Relation"
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
                label="Release Payment"
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
                Raise a Dispute
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
            No actions available.
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
  // Party card
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

  // Actions card
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

  // Emergency contact
  emergencyCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },

  // Waiting payment
  waitingPayment: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },

  // Cancel box
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
