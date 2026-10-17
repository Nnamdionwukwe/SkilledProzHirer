// src/components/booking/BookingDetailSidebar.js
//
// Mirrors BookingDetailSidebar.jsx — party card + actions card.
// Fully wires EmergencyContact, SOSButton, GpsCheckIn, InsuranceAddon,
// VideoCallButton, and BookingInvoice.
// Avatar navigates via useNavigation (not a broken require).

import React from "react";
import {
  View,
  Pressable,
  Image,
  Linking,
  TextInput,
  StyleSheet,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import {
  FaPhone,
  FaCommentDots,
  FaExclamationTriangle,
  FaMoneyBillWave,
  FaExclamationCircle,
} from "../../icons/fa";

import AppText from "../AppText";
import { useTheme } from "../../contexts/ThemeContext";

import EmergencyContact from "./EmergencyContact";
import SOSButton from "./SOSButton";
import GpsCheckIn from "./GpsCheckIn";
import InsuranceAddon from "./InsuranceAddon";
import VideoCallButton from "./VideoCallButton";
import BookingInvoice from "./BookingInvoice";

function ActionBtn({ icon, label, color = "primary", loading, onPress }) {
  const { theme: th } = useTheme();
  const c = th.colors;

  const bgColor = {
    primary: c.orange,
    green: "#22c55e",
    red: "rgba(239,68,68,0.1)",
    redOutline: "transparent",
  }[color];

  const textColor = {
    primary: "#fff",
    green: "#fff",
    red: "#ef4444",
    redOutline: "#ef4444",
  }[color];

  const borderColor =
    color === "red"
      ? "rgba(239,68,68,0.3)"
      : color === "redOutline"
        ? "#ef4444"
        : "transparent";

  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={[
        styles.actionBtn,
        {
          backgroundColor: bgColor,
          borderColor,
          borderWidth: borderColor === "transparent" ? 0 : 1,
          opacity: loading ? 0.5 : 1,
        },
      ]}
    >
      {loading ? (
        <AppText variant="small" weight="bold" style={{ color: textColor }}>
          …
        </AppText>
      ) : (
        <>
          {icon}
          <AppText
            variant="small"
            weight="bold"
            style={{ color: textColor, marginLeft: icon ? 6 : 0 }}
          >
            {label}
          </AppText>
        </>
      )}
    </Pressable>
  );
}

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
  const { theme: th } = useTheme();
  const c = th.colors;

  if (!show) {
    return (
      <ActionBtn
        label={t("booking.sidebar.cancelBooking")}
        color="redOutline"
        onPress={onOpen}
      />
    );
  }
  return (
    <View style={{ gap: 8 }}>
      <AppText variant="small" weight="semibold" tone="dim">
        {t("booking.sidebar.cancelReason")}{" "}
        <AppText variant="small" style={{ color: "#ef4444" }}>
          *
        </AppText>
      </AppText>
      <TextInput
        value={reason}
        onChangeText={onChangeReason}
        placeholder={t("booking.sidebar.cancelPlaceholder")}
        placeholderTextColor={c.textMuted}
        multiline
        numberOfLines={3}
        style={[
          styles.cancelInput,
          {
            backgroundColor: c.bgInput,
            borderColor: reasonError ? "#ef4444" : c.border,
            color: c.text,
          },
        ]}
      />
      {reasonError && (
        <AppText variant="small" style={{ color: "#ef4444" }}>
          {reasonError}
        </AppText>
      )}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable
          onPress={onConfirm}
          disabled={acting}
          style={[
            styles.cancelConfirm,
            { backgroundColor: "#ef4444", opacity: acting ? 0.5 : 1 },
          ]}
        >
          <AppText variant="small" weight="bold" style={{ color: "#fff" }}>
            {acting ? "…" : t("booking.sidebar.confirmCancellation")}
          </AppText>
        </Pressable>
        <Pressable
          onPress={onClose}
          style={[styles.cancelAbort, { borderColor: c.border }]}
        >
          <AppText variant="small" weight="semibold" tone="dim">
            {t("booking.sidebar.keepBooking")}
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

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
  const { theme: th } = useTheme();
  const navigation = useNavigation();
  const c = th.colors;

  const profileTarget =
    other && isHirer
      ? { screen: "WorkerProfile", params: { workerId: other.id } }
      : other && isWorker
        ? { screen: "HirerPublicProfile", params: { hirerId: other.id } }
        : null;

  const handleOpenProfile = () => {
    if (!profileTarget) return;
    try {
      navigation.navigate(profileTarget.screen, profileTarget.params);
    } catch {
      navigation
        .getParent()
        ?.navigate(profileTarget.screen, profileTarget.params);
    }
  };

  return (
    <View style={{ gap: 12 }}>
      {/* Party Card */}
      <View
        style={[
          styles.partyCard,
          { backgroundColor: c.bgPanel, borderColor: c.border },
        ]}
      >
        <AppText
          variant="small"
          weight="bold"
          style={{
            color: c.orange,
            letterSpacing: 1,
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          {isHirer
            ? t("booking.sidebar.workerLabel")
            : t("booking.sidebar.hirerLabel")}
        </AppText>

        <Pressable onPress={handleOpenProfile}>
          <View
            style={[
              styles.partyAvatar,
              { backgroundColor: c.orangeDim, borderColor: c.orange },
            ]}
          >
            {other?.avatar ? (
              <Image
                source={{ uri: other.avatar }}
                style={{ width: "100%", height: "100%" }}
              />
            ) : (
              <AppText weight="bold" style={{ color: c.orange, fontSize: 18 }}>
                {other?.firstName?.[0]}
                {other?.lastName?.[0] || "?"}
              </AppText>
            )}
          </View>
        </Pressable>

        <AppText weight="bold" style={{ fontSize: 15, marginTop: 8 }}>
          {other
            ? `${other?.firstName} ${other?.lastName}`
            : t("booking.sidebar.unknownUser")}
        </AppText>

        {other?.phone && (
          <Pressable
            onPress={() => Linking.openURL(`tel:${other.phone}`)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: 4,
            }}
          >
            <FaPhone size={12} color={c.textDim} />
            <AppText variant="small" tone="dim" style={{ marginLeft: 6 }}>
              {other.phone}
            </AppText>
          </Pressable>
        )}

        <Pressable
          onPress={() =>
            onMessage
              ? onMessage(other?.id, booking.id)
              : onSuccess &&
                onSuccess(
                  t("bookingDetail.messagesSoon", {
                    defaultValue: "Messages coming soon",
                  }),
                )
          }
          style={[
            styles.messageBtn,
            { backgroundColor: c.orangeDim, borderColor: c.orange },
          ]}
        >
          <FaCommentDots
            size={12}
            color={c.orange}
            style={{ marginRight: 6 }}
          />
          <AppText variant="small" weight="bold" style={{ color: c.orange }}>
            {t("booking.sidebar.sendMessage")}
          </AppText>
        </Pressable>
      </View>

      {/* Actions Card */}
      <View
        style={[
          styles.actionsCard,
          { backgroundColor: c.bgPanel, borderColor: c.border },
        ]}
      >
        <AppText
          variant="small"
          weight="bold"
          tone="dim"
          style={{
            textTransform: "uppercase",
            letterSpacing: 1,
            marginBottom: 4,
          }}
        >
          {t("booking.sidebar.actions")}
        </AppText>

        {isWorker && (
          <>
            <EmergencyContact
              bookingId={booking.id}
              bookingStatus={booking.status}
              isWorker={isWorker}
              existing={emergencyContact}
              onSaved={() => refetch?.()}
            />

            <SOSButton
              bookingId={booking.id}
              bookingStatus={booking.status}
              isWorker={isWorker}
              sosActivatedAt={booking.sosActivatedAt}
              sosResolvedAt={booking.sosResolvedAt}
              onUpdate={() => refetch?.()}
            />

            {booking.status === "PENDING" && (
              <ActionBtn
                label={t("booking.sidebar.acceptBooking")}
                color="green"
                loading={acting}
                onPress={() => updateStatus("ACCEPTED")}
              />
            )}

            {booking.status === "ACCEPTED" && payment?.status === "HELD" && (
              <GpsCheckIn
                bookingId={booking.id}
                status={booking.status}
                isWorker={isWorker}
                jobLatitude={booking.latitude}
                jobLongitude={booking.longitude}
                onSuccess={(updated) => {
                  refetch?.();
                  onSuccess?.(
                    updated?.status === "IN_PROGRESS"
                      ? t("booking.checkin.success")
                      : t("booking.checkout.success"),
                  );
                }}
              />
            )}

            {booking.status === "ACCEPTED" &&
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
                    variant="small"
                    weight="semibold"
                    style={{ color: "#fbbf24", marginLeft: 6, flex: 1 }}
                  >
                    {t("booking.sidebar.waitingPayment")}
                  </AppText>
                </View>
              )}

            {booking.status === "IN_PROGRESS" && (
              <GpsCheckIn
                bookingId={booking.id}
                status={booking.status}
                isWorker={isWorker}
                jobLatitude={booking.latitude}
                jobLongitude={booking.longitude}
                onSuccess={() => {
                  refetch?.();
                  onSuccess?.(t("booking.checkout.success"));
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

        {isHirer && (
          <>
            {emergencyContact?.name && (
              <View
                style={[
                  styles.emergencyCard,
                  {
                    backgroundColor: "rgba(239,68,68,0.06)",
                    borderColor: "rgba(239,68,68,0.2)",
                  },
                ]}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <FaExclamationTriangle size={12} color="#ef4444" />
                  <AppText
                    variant="small"
                    weight="bold"
                    style={{
                      color: "#ef4444",
                      marginLeft: 6,
                      textTransform: "uppercase",
                      letterSpacing: 0.6,
                    }}
                  >
                    {t("booking.sidebar.emergencyContact")}
                  </AppText>
                </View>
                <View
                  style={[
                    styles.emRow,
                    { borderBottomColor: "rgba(239,68,68,0.1)" },
                  ]}
                >
                  <AppText variant="small" tone="dim">
                    {t("booking.sidebar.emergencyName")}
                  </AppText>
                  <AppText variant="small" weight="semibold">
                    {emergencyContact.name}
                  </AppText>
                </View>
                {emergencyContact.phone && (
                  <View
                    style={[
                      styles.emRow,
                      { borderBottomColor: "rgba(239,68,68,0.1)" },
                    ]}
                  >
                    <AppText variant="small" tone="dim">
                      {t("booking.sidebar.emergencyPhone")}
                    </AppText>
                    <Pressable
                      onPress={() =>
                        Linking.openURL(`tel:${emergencyContact.phone}`)
                      }
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <FaPhone size={11} color="#ef4444" />
                      <AppText
                        variant="small"
                        weight="bold"
                        style={{ color: "#ef4444", marginLeft: 4 }}
                      >
                        {emergencyContact.phone}
                      </AppText>
                    </Pressable>
                  </View>
                )}
                {emergencyContact.relationship && (
                  <View style={[styles.emRow, { borderBottomWidth: 0 }]}>
                    <AppText variant="small" tone="dim">
                      {t("booking.sidebar.emergencyRelation")}
                    </AppText>
                    <AppText variant="small" weight="semibold">
                      {emergencyContact.relationship}
                    </AppText>
                  </View>
                )}
              </View>
            )}

            {booking.status === "ACCEPTED" && (
              <InsuranceAddon
                bookingId={booking.id}
                booking={booking}
                onPurchased={() =>
                  onSuccess?.(t("booking.insurance.activated"))
                }
              />
            )}

            {payment?.status === "HELD" && (
              <ActionBtn
                icon={<FaMoneyBillWave size={12} color="#fff" />}
                label={t("booking.sidebar.releasePayment")}
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

        {(isHirer || isWorker) && (
          <VideoCallButton
            bookingId={booking.id}
            bookingStatus={booking.status}
            userId={userId}
            hirerId={booking.hirerId}
            workerId={booking.workerId}
          />
        )}

        {(isHirer || isWorker) &&
          ["ACCEPTED", "IN_PROGRESS", "COMPLETED"].includes(booking.status) && (
            <ActionBtn
              icon={<FaExclamationTriangle size={12} color="#ef4444" />}
              label={t("booking.sidebar.raiseDispute")}
              color="red"
              onPress={onShowDispute}
            />
          )}

        {booking.status === "COMPLETED" && (isHirer || isWorker) && (
          <BookingInvoice booking={booking} trigger={false} />
        )}

        {!isHirer && !isWorker && (
          <AppText
            variant="small"
            tone="dim"
            style={{ textAlign: "center", padding: 8 }}
          >
            {t("booking.sidebar.noActions")}
          </AppText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  partyCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    gap: 4,
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
  messageBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
    alignSelf: "stretch",
  },
  actionsCard: { padding: 18, borderRadius: 16, borderWidth: 1, gap: 10 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  waitingPayment: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  emergencyCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  emRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cancelInput: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 13,
    minHeight: 70,
    textAlignVertical: "top",
  },
  cancelConfirm: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelAbort: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
});
