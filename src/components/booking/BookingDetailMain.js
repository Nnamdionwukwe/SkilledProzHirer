// src/components/booking/BookingDetailMain.js
//
// Verbatim port of components/booking/BookingDetail/BookingDetailMain.jsx.
// This version is a complete rewrite to ensure NO booking details are omitted.
// It preserves all three branches (Retained Staff, Job Post, Direct),
// all DetailItem fields, GPS cards, timeline, reviews, and action buttons.

import React, { useState } from "react";
import { Linking, Pressable, StyleSheet, View } from "react-native";

import AppText from "../AppText";
import { useTheme } from "../../contexts/ThemeContext";
import { calcPricing, getHirerFeeRate } from "../../utils/pricing";
import BookingReleaseDetails from "./BookingReleaseDetails";
import {
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaMoneyBillWave,
  FaClock,
  FaCheckCircle,
  FaFlag,
  FaBriefcase,
  FaMapPin,
  FaGlobe,
  FaHandshake,
  FaRandom,
  FaFileAlt,
  FaTools,
  FaShieldAlt,
  FaStar,
  FaHourglassHalf,
  FaCheck,
  FaExclamationTriangle,
  FaMap,
  FaUndo,
  FaUser,
  FaBuilding,
  FaPlusCircle,
  FaMinusCircle,
  FaExternalLinkAlt,
} from "../../icons/fa";

// ── Status meta ────────────────────────────────────────────────────────
const STATUS_META = {
  PENDING: { label: "Pending", color: "yellow" },
  ACCEPTED: { label: "Accepted", color: "orange" },
  IN_PROGRESS: { label: "In Progress", color: "indigo" },
  COMPLETED: { label: "Completed", color: "green" },
  PAID: { label: "Paid", color: "green" },
  CANCELLED: { label: "Cancelled", color: "red" },
  DISPUTED: { label: "Disputed", color: "rose" },
};

function badgePalette(key, c) {
  switch (key) {
    case "yellow":
      return { bg: "rgba(251,191,36,0.12)", fg: "#fbbf24" };
    case "orange":
      return { bg: c.orangeDim, fg: c.orange };
    case "indigo":
      return { bg: "rgba(129,140,248,0.12)", fg: "#818cf8" };
    case "green":
      return { bg: c.greenDim, fg: c.green };
    case "red":
      return { bg: c.redDim, fg: c.red };
    case "rose":
      return { bg: "rgba(251,113,133,0.12)", fg: "#fb7185" };
    default:
      return { bg: c.bgCard, fg: c.textDim };
  }
}

const TIMELINE_STEPS = ["Pending", "Accepted", "In Progress", "Completed"];

const JOB_TYPES = {
  FULL_TIME: { Icon: FaBriefcase, label: "Full-time" },
  PART_TIME: { Icon: FaClock, label: "Part-time" },
  CONTRACT: { Icon: FaFileAlt, label: "Contract" },
  TEMPORARY: { Icon: FaFlag, label: "Temporary" },
};
const LOC_TYPES = {
  REMOTE: { Icon: FaGlobe, label: "Remote" },
  ON_SITE: { Icon: FaMapPin, label: "On-site" },
  HYBRID: { Icon: FaRandom, label: "Hybrid" },
};

// ── Inline helpers ────────────────────────────────────────────────────
function DetailItem({ icon, label, value, accent, c }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: c.bgCard,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 10,
      }}
    >
      <View style={{ marginTop: 1 }}>{icon}</View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText
          style={{
            fontSize: 10,
            fontWeight: "500",
            color: c.textMuted,
            textTransform: "uppercase",
            letterSpacing: 0.6,
            marginBottom: 3,
          }}
        >
          {label}
        </AppText>
        {typeof value === "string" || typeof value === "number" ? (
          <AppText
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: accent ? c.orange : c.text,
              lineHeight: 18,
            }}
          >
            {String(value)}
          </AppText>
        ) : (
          value
        )}
      </View>
    </View>
  );
}

function GpsCard({
  title,
  dotColor,
  timestamp,
  lat,
  lng,
  distKm,
  cardClass,
  c,
}) {
  const getDistanceIcon = () => {
    if (distKm < 0.1) return <FaCheckCircle size={12} color={c.green} />;
    if (distKm > 1) return <FaExclamationTriangle size={12} color={c.orange} />;
    return <FaMap size={12} color="#3b82f6" />;
  };

  return (
    <View
      style={[
        styles.gpsCard,
        cardClass === "in"
          ? { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" }
          : { backgroundColor: "#fff1f2", borderColor: "#fecdd3" },
      ]}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <View
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: dotColor,
          }}
        />
        <AppText
          style={{ fontSize: 13, fontWeight: "700", color: "#1a1a1a", flex: 1 }}
        >
          {title}
        </AppText>
        {timestamp ? (
          <AppText style={{ fontSize: 11, color: "#888" }}>
            {new Date(timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            ·{" "}
            {new Date(timestamp).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
            })}
          </AppText>
        ) : null}
      </View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <AppText style={{ fontSize: 12, color: "#888" }}>Coordinates</AppText>
        <AppText style={{ fontSize: 12, color: "#333", fontFamily: "Courier" }}>
          {lat.toFixed(5)}, {lng.toFixed(5)}
        </AppText>
      </View>
      {distKm !== null ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 8,
            backgroundColor: distKm > 1 ? "#fef3c7" : "#dcfce7",
            marginBottom: 10,
          }}
        >
          {getDistanceIcon()}
          <AppText
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: distKm > 1 ? "#92400e" : "#166534",
            }}
          >
            {distKm < 0.1
              ? "Worker was at the job site"
              : `${distKm.toFixed(2)} km from job site`}
          </AppText>
        </View>
      ) : null}
      <Pressable
        onPress={() =>
          Linking.openURL(`https://www.google.com/maps?q=${lat},${lng}`)
        }
        style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
      >
        <FaMap size={11} color="#2563eb" />
        <AppText style={{ fontSize: 11, fontWeight: "600", color: "#2563eb" }}>
          View on Google Maps
        </AppText>
      </Pressable>
    </View>
  );
}

// ── Timeline ────────────────────────────────────────────────────────────
function Timeline({ step, c }) {
  return (
    <View
      style={{
        backgroundColor: c.bgPanel,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 18,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        {TIMELINE_STEPS.map((label, i) => {
          const active = i <= step;
          const current = i === step;
          return (
            <View key={label} style={{ flex: 1, alignItems: "center" }}>
              <View
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: current
                    ? c.orange
                    : active
                      ? c.orangeDim
                      : c.bgCard,
                  borderWidth: 2,
                  borderColor: active ? c.orange : c.border,
                  shadowColor: current ? c.orange : "transparent",
                  shadowOpacity: current ? 0.4 : 0,
                  shadowRadius: 6,
                  shadowOffset: { width: 0, height: 0 },
                }}
              >
                {i < step ? (
                  <FaCheck size={10} color={current ? c.bg : c.orange} />
                ) : (
                  <AppText
                    style={{
                      fontSize: 10,
                      fontWeight: "700",
                      color: current ? c.bg : c.textMuted,
                    }}
                  >
                    {i + 1}
                  </AppText>
                )}
              </View>
              <AppText
                style={{
                  marginTop: 8,
                  fontSize: 9,
                  fontWeight: "600",
                  color: active ? c.textDim : c.textMuted,
                  textAlign: "center",
                }}
              >
                {label}
              </AppText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ── Section wrapper ─────────────────────────────────────────────────────
function Section({ title, children, c }) {
  return (
    <View
      style={{
        backgroundColor: c.bgPanel,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 14,
        padding: 16,
        gap: 12,
      }}
    >
      <AppText
        style={{
          fontFamily: "Syne_700Bold",
          fontSize: 12,
          fontWeight: "700",
          color: c.textDim,
          textTransform: "uppercase",
          letterSpacing: 1,
        }}
      >
        {title}
      </AppText>
      {children}
    </View>
  );
}

// ── Reviews list ────────────────────────────────────────────────────────
function ReviewsSection({
  reviews,
  reviewCheckDone,
  hasReviewed,
  onLeaveReview,
  c,
}) {
  if (!reviews?.length && !reviewCheckDone) return null;
  return (
    <Section title="Reviews" c={c}>
      {reviews?.length > 0
        ? reviews.map((review) => (
            <View key={review.id} style={{ gap: 6, marginBottom: 8 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: 10,
                }}
              >
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    backgroundColor: c.orangeDim,
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}
                >
                  <AppText
                    style={{ fontSize: 12, fontWeight: "700", color: c.orange }}
                  >
                    {review.giver?.firstName?.[0]}
                    {review.giver?.lastName?.[0]}
                  </AppText>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <AppText
                    style={{ fontSize: 13, fontWeight: "600", color: c.text }}
                    numberOfLines={1}
                  >
                    {review.giver?.firstName} {review.giver?.lastName}
                    <AppText style={{ color: c.textDim, fontWeight: "400" }}>
                      {" · "}
                      {review.giver?.role === "HIRER" ? "Hirer" : "Worker"}
                    </AppText>
                  </AppText>
                  <AppText style={{ fontSize: 11, color: c.textMuted }}>
                    {new Date(review.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </AppText>
                </View>
                <View style={{ flexDirection: "row", gap: 2 }}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <FaStar
                      key={i}
                      size={12}
                      color={i <= review.rating ? "#fbbf24" : c.border}
                    />
                  ))}
                </View>
              </View>
              {review.comment ? (
                <View
                  style={{
                    borderLeftWidth: 2,
                    borderLeftColor: c.orange,
                    paddingLeft: 10,
                  }}
                >
                  <AppText
                    style={{
                      fontSize: 13,
                      color: c.textDim,
                      fontStyle: "italic",
                      lineHeight: 20,
                    }}
                  >
                    "{review.comment}"
                  </AppText>
                </View>
              ) : null}
            </View>
          ))
        : null}
      {reviewCheckDone && !hasReviewed ? (
        <Pressable
          onPress={onLeaveReview}
          style={({ pressed }) => [
            {
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderWidth: 1,
              borderColor: c.border,
              borderRadius: 9,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              opacity: pressed ? 0.75 : 1,
            },
          ]}
        >
          <FaStar size={12} color={c.orange} />
          <AppText
            style={{ fontSize: 13, fontWeight: "600", color: c.textDim }}
          >
            Leave a Review
          </AppText>
        </Pressable>
      ) : null}
      {reviewCheckDone && hasReviewed ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 10,
            backgroundColor: c.greenDim,
            borderWidth: 1,
            borderColor: c.green,
            borderRadius: 8,
          }}
        >
          <FaCheckCircle size={13} color={c.green} />
          <AppText style={{ fontSize: 12, color: c.green, flex: 1 }}>
            Your review has been submitted.{" "}
            {(reviews?.length ?? 0) < 2 ? " Waiting for the other party." : ""}
          </AppText>
        </View>
      ) : null}
    </Section>
  );
}

// ── GPS Section ────────────────────────────────────────────────────────
function GpsSection({
  booking,
  hasCheckInGps,
  hasCheckOutGps,
  checkInDistKm,
  checkOutDistKm,
  c,
}) {
  return (
    <Section title="Worker Location" c={c}>
      <AppText style={{ fontSize: 13, color: c.textMuted, marginBottom: 6 }}>
        GPS recorded at check-in and check-out. Visible to both parties.
      </AppText>
      <View style={{ gap: 10 }}>
        {hasCheckInGps ? (
          <GpsCard
            title="Check-in Location"
            dotColor="#16a34a"
            timestamp={booking.checkInAt}
            lat={booking.checkInLat}
            lng={booking.checkInLng}
            distKm={checkInDistKm}
            cardClass="in"
            c={c}
          />
        ) : null}
        {hasCheckOutGps ? (
          <GpsCard
            title="Check-out Location"
            dotColor="#dc2626"
            timestamp={booking.checkOutAt}
            lat={booking.checkOutLat}
            lng={booking.checkOutLng}
            distKm={checkOutDistKm}
            cardClass="out"
            c={c}
          />
        ) : null}
      </View>
    </Section>
  );
}

// ── Cancel reason ──────────────────────────────────────────────────────
function CancelReason({ reason, c }) {
  return (
    <Section title="Cancellation Reason" c={c}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 10,
          padding: 14,
          backgroundColor: c.redDim,
          borderWidth: 1,
          borderColor: "rgba(239,68,68,0.2)",
          borderRadius: 12,
        }}
      >
        <FaExclamationTriangle size={14} color={c.red} />
        <AppText
          style={{ flex: 1, fontSize: 13, color: c.textDim, lineHeight: 20 }}
        >
          {reason}
        </AppText>
      </View>
    </Section>
  );
}

// ── Bottom actions ─────────────────────────────────────────────────────
function BottomActions({
  isCompletedOrPaid,
  showRefundButton,
  onDownloadInvoice,
  onRefundClick,
  refundLoading,
  invoiceLoading,
  c,
}) {
  if (!isCompletedOrPaid) return null;
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: c.border,
      }}
    >
      <Pressable
        onPress={onDownloadInvoice}
        disabled={invoiceLoading}
        style={({ pressed }) => [
          {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 14,
            paddingVertical: 10,
            backgroundColor: c.bgCard,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: 9,
            opacity: invoiceLoading ? 0.5 : pressed ? 0.75 : 1,
          },
        ]}
      >
        <FaFileAlt size={12} color={c.textDim} />
        <AppText style={{ fontSize: 13, fontWeight: "600", color: c.textDim }}>
          Download Invoice
        </AppText>
      </Pressable>
      {showRefundButton ? (
        <Pressable
          onPress={onRefundClick}
          disabled={refundLoading}
          style={({ pressed }) => [
            {
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingHorizontal: 14,
              paddingVertical: 10,
              backgroundColor: c.redDim,
              borderWidth: 1,
              borderColor: c.red,
              borderRadius: 9,
              opacity: refundLoading ? 0.5 : pressed ? 0.75 : 1,
            },
          ]}
        >
          <FaUndo size={12} color={c.red} />
          <AppText style={{ fontSize: 13, fontWeight: "600", color: c.red }}>
            Request Refund
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═════════════════════════════════════════════════════════════════════════
export default function BookingDetailMain({
  booking,
  step,
  dur,
  hasCheckInGps,
  hasCheckOutGps,
  checkInDistKm,
  checkOutDistKm,
  reviewCheckDone,
  hasReviewed,
  bookingId,
  invoiceLoading,
  onDownloadInvoice,
  onLeaveReview,
  isHirer,
  payment,
  paymentStatus,
  isWorker,
  workerName,
  refundLoading,
  hasActiveRefund,
  onShowRefundModal,
}) {
  const { theme } = useTheme();
  const c = theme.colors;

  const meta = STATUS_META[booking.status] || {};
  const badgeColor = badgePalette(meta.color, c);
  const isCompletedOrPaid = ["COMPLETED", "PAID"].includes(booking.status);
  const isJobPostBooking = booking.source === "JOB_POST";
  const isRetainedStaff = booking.source === "RETAINED_STAFF";

  const showMapLink =
    booking.latitude && booking.longitude && booking.locationType !== "REMOTE";

  const showRefundButton =
    isHirer &&
    paymentStatus === "RELEASED" &&
    !refundLoading &&
    !hasActiveRefund &&
    !isRetainedStaff;

  const renderDuration = () => {
    if (!dur) {
      if (booking.estimatedHours || booking.estimatedValue) {
        return <AppText style={{ color: c.textMuted }}>Loading…</AppText>;
      }
      return <AppText style={{ color: c.textMuted }}>Not specified</AppText>;
    }
    const unitMap = {
      hours: "hours",
      days: "days",
      weeks: "weeks",
      months: "months",
      custom: "Custom",
    };
    const unitLabel = booking.estimatedUnit
      ? unitMap[booking.estimatedUnit] || booking.estimatedUnit
      : null;

    return (
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 4,
        }}
      >
        <AppText style={{ fontSize: 13, fontWeight: "600", color: c.text }}>
          {dur.main}
        </AppText>
        {dur.sub ? (
          <AppText style={{ fontSize: 12, color: c.textMuted }}>
            {dur.sub}
          </AppText>
        ) : null}
        {unitLabel ? (
          <AppText style={{ fontSize: 11, color: c.textMuted }}>
            ({unitLabel}
            {booking.isNegotiated && booking.negotiatedRate
              ? " · negotiated"
              : ""}
            )
          </AppText>
        ) : null}
      </View>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════
  // BRANCH 1 — RETAINED STAFF PAYROLL
  // ═══════════════════════════════════════════════════════════════════════
  if (isRetainedStaff) {
    const p = calcPricing(booking);
    const currency = p.currency || booking.currency || "NGN";
    const feePercent = Math.round(getHirerFeeRate(currency) * 100);

    return (
      <View style={{ gap: 10 }}>
        <BookingReleaseDetails payment={payment} currency={booking.currency} />

        <View
          style={{
            backgroundColor: c.bgPanel,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: 16,
            padding: 20,
            gap: 8,
          }}
        >
          <View
            style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}
          >
            <AppText
              style={{
                fontFamily: "Syne_700Bold",
                fontSize: 20,
                fontWeight: "700",
                color: c.text,
                flex: 1,
                lineHeight: 26,
              }}
            >
              {booking.title}
            </AppText>
            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 4,
                backgroundColor: badgeColor.bg,
                borderRadius: 20,
              }}
            >
              <AppText
                style={{
                  fontSize: 10,
                  fontWeight: "700",
                  color: badgeColor.fg,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                {meta.label}
              </AppText>
            </View>
          </View>
          {booking.category ? (
            <View
              style={{
                alignSelf: "flex-start",
                paddingHorizontal: 10,
                paddingVertical: 3,
                backgroundColor: c.orangeDim,
                borderRadius: 12,
              }}
            >
              <AppText
                style={{ fontSize: 11, fontWeight: "700", color: c.orange }}
              >
                {booking.category.name}
              </AppText>
            </View>
          ) : null}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              alignSelf: "flex-start",
              paddingHorizontal: 10,
              paddingVertical: 3,
              backgroundColor: "rgba(129,140,248,0.1)",
              borderWidth: 1,
              borderColor: "rgba(129,140,248,0.25)",
              borderRadius: 12,
            }}
          >
            <FaBriefcase size={10} color="#818cf8" />
            <AppText
              style={{ fontSize: 11, fontWeight: "700", color: "#818cf8" }}
            >
              Retained Staff Payroll
            </AppText>
          </View>
        </View>

        <Section title="Retained Staff Details" c={c}>
          <DetailItem
            icon={<FaCalendarAlt size={14} color={c.orange} />}
            label="Pay Period"
            value={new Date(booking.scheduledAt).toLocaleDateString("en-GB", {
              month: "short",
              year: "numeric",
            })}
            c={c}
          />
          <DetailItem
            icon={<FaMoneyBillWave size={14} color={c.orange} />}
            label="Base Rate"
            value={`${booking.currency} ${Number(booking.agreedRate).toLocaleString()}`}
            accent
            c={c}
          />
          <DetailItem
            icon={<FaFileAlt size={14} color={c.orange} />}
            label="Role"
            value={booking.description || "Standard Retained Role"}
            c={c}
          />
          {booking.jobType
            ? (() => {
                const Icon = JOB_TYPES[booking.jobType]?.Icon || FaBriefcase;
                return (
                  <DetailItem
                    icon={<Icon size={14} color={c.orange} />}
                    label="Job Type"
                    value={JOB_TYPES[booking.jobType]?.label || booking.jobType}
                    c={c}
                  />
                );
              })()
            : null}
          {booking.employmentType ? (
            <DetailItem
              icon={<FaBriefcase size={14} color={c.orange} />}
              label="Employment Type"
              value={String(booking.employmentType).replace(/_/g, " ")}
              c={c}
            />
          ) : null}
          {booking.department ? (
            <DetailItem
              icon={<FaBuilding size={14} color={c.orange} />}
              label="Department"
              value={booking.department}
              c={c}
            />
          ) : null}
          {booking.locationType ? (
            <DetailItem
              icon={<FaMapPin size={14} color={c.orange} />}
              label="Location Type"
              value={
                LOC_TYPES[booking.locationType]?.label || booking.locationType
              }
              c={c}
            />
          ) : null}
          {booking.location && booking.locationType !== "REMOTE" ? (
            <DetailItem
              icon={<FaMapMarkerAlt size={14} color={c.orange} />}
              label="Work Location"
              value={booking.location}
              c={c}
            />
          ) : null}
          {booking.workDays?.length > 0 ? (
            <DetailItem
              icon={<FaCalendarAlt size={14} color={c.orange} />}
              label="Work Days"
              value={booking.workDays.join(", ")}
              c={c}
            />
          ) : null}
          {booking.workStart && booking.workEnd ? (
            <DetailItem
              icon={<FaClock size={14} color={c.orange} />}
              label="Working Hours"
              value={`${booking.workStart} — ${booking.workEnd}${booking.timezone ? ` (${booking.timezone})` : ""}`}
              c={c}
            />
          ) : null}
          {booking.employeeNumber ? (
            <DetailItem
              icon={<FaBriefcase size={14} color={c.orange} />}
              label="Employee #"
              value={booking.employeeNumber}
              c={c}
            />
          ) : null}
          {booking.managerName ? (
            <DetailItem
              icon={<FaUser size={14} color={c.orange} />}
              label="Manager"
              value={booking.managerName}
              c={c}
            />
          ) : null}
          {booking.emergencyContact ? (
            <DetailItem
              icon={<FaExclamationTriangle size={14} color={c.orange} />}
              label="Emergency Contact"
              value={
                typeof booking.emergencyContact === "string"
                  ? booking.emergencyContact
                  : booking.emergencyContact.name || ""
              }
              c={c}
            />
          ) : null}
          <DetailItem
            icon={<FaClock size={14} color={c.orange} />}
            label="Status"
            value={
              booking.status === "PAID"
                ? "Paid & Completed"
                : booking.status === "ACCEPTED"
                  ? "Active Payroll"
                  : booking.status
            }
            accent={booking.status === "PAID"}
            c={c}
          />
          <DetailItem
            icon={<FaMoneyBillWave size={14} color={c.orange} />}
            label="Base Amount"
            value={`${currency} ${Number(p.subtotal).toLocaleString()}`}
            c={c}
          />
          {booking.bonusAmount > 0 ? (
            <DetailItem
              icon={<FaPlusCircle size={14} color={c.green} />}
              label="Bonus"
              value={`+ ${currency} ${Number(booking.bonusAmount).toLocaleString()}`}
              c={c}
            />
          ) : null}
          {booking.deductionAmount > 0 ? (
            <DetailItem
              icon={<FaMinusCircle size={14} color="#f87171" />}
              label="Deduction"
              value={`- ${currency} ${Number(booking.deductionAmount).toLocaleString()}`}
              c={c}
            />
          ) : null}
          <DetailItem
            icon={<FaMoneyBillWave size={14} color={c.orange} />}
            label={`Platform Fee (${feePercent}%)`}
            value={`${currency} ${Number(p.hirerFee).toLocaleString()}`}
            accent
            c={c}
          />
          {isHirer ? (
            <DetailItem
              icon={<FaMoneyBillWave size={14} color={c.orange} />}
              label="Total Payment"
              value={`${currency} ${Number(p.grossTotal).toLocaleString()}`}
              accent
              c={c}
            />
          ) : (
            <DetailItem
              icon={<FaMoneyBillWave size={14} color={c.orange} />}
              label="Your Payout"
              value={`${currency} ${Number(p.workerPayout).toLocaleString()}`}
              accent
              c={c}
            />
          )}
        </Section>

        <Section title="Description" c={c}>
          <AppText style={{ fontSize: 13, color: c.textDim, lineHeight: 20 }}>
            {booking.description || "No additional description provided."}
          </AppText>
          {booking.notes ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 8,
                padding: 12,
                backgroundColor: c.bgCard,
                borderWidth: 1,
                borderColor: c.border,
                borderRadius: 8,
              }}
            >
              <FaFileAlt
                size={12}
                color={c.textMuted}
                style={{ marginTop: 2 }}
              />
              <AppText style={{ fontSize: 13, color: c.textDim, flex: 1 }}>
                {booking.notes}
              </AppText>
            </View>
          ) : null}
        </Section>

        {isCompletedOrPaid ? (
          <ReviewsSection
            reviews={booking.reviews}
            reviewCheckDone={reviewCheckDone}
            hasReviewed={hasReviewed}
            onLeaveReview={onLeaveReview}
            c={c}
          />
        ) : null}

        <BottomActions
          isCompletedOrPaid={isCompletedOrPaid}
          showRefundButton={false}
          onDownloadInvoice={onDownloadInvoice}
          invoiceLoading={invoiceLoading}
          c={c}
        />
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // BRANCH 2 — JOB POST
  // ═══════════════════════════════════════════════════════════════════════
  if (isJobPostBooking) {
    const p = calcPricing(booking);
    const currency = p.currency || booking.currency || "NGN";
    const feePercent = Math.round(getHirerFeeRate(currency) * 100);

    return (
      <View style={{ gap: 10 }}>
        <BookingReleaseDetails payment={payment} currency={booking.currency} />

        <View
          style={{
            backgroundColor: c.bgPanel,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: 16,
            padding: 20,
            gap: 8,
          }}
        >
          <View
            style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}
          >
            <AppText
              style={{
                fontFamily: "Syne_700Bold",
                fontSize: 20,
                fontWeight: "700",
                color: c.text,
                flex: 1,
                lineHeight: 26,
              }}
            >
              {booking.title}
            </AppText>
            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 4,
                backgroundColor: badgeColor.bg,
                borderRadius: 20,
              }}
            >
              <AppText
                style={{
                  fontSize: 10,
                  fontWeight: "700",
                  color: badgeColor.fg,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                {meta.label}
              </AppText>
            </View>
          </View>
          {booking.category ? (
            <View
              style={{
                alignSelf: "flex-start",
                paddingHorizontal: 10,
                paddingVertical: 3,
                backgroundColor: c.orangeDim,
                borderRadius: 12,
              }}
            >
              <AppText
                style={{ fontSize: 11, fontWeight: "700", color: c.orange }}
              >
                {booking.category.name}
              </AppText>
            </View>
          ) : null}
          {booking.isNegotiated ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                alignSelf: "flex-start",
                paddingHorizontal: 10,
                paddingVertical: 3,
                backgroundColor: "rgba(129,140,248,0.1)",
                borderWidth: 1,
                borderColor: "rgba(129,140,248,0.25)",
                borderRadius: 12,
              }}
            >
              <FaHandshake size={10} color="#818cf8" />
              <AppText
                style={{ fontSize: 11, fontWeight: "700", color: "#818cf8" }}
              >
                Negotiated rate
              </AppText>
            </View>
          ) : null}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              alignSelf: "flex-start",
              paddingHorizontal: 10,
              paddingVertical: 3,
              backgroundColor: "rgba(129,140,248,0.1)",
              borderWidth: 1,
              borderColor: "rgba(129,140,248,0.25)",
              borderRadius: 12,
            }}
          >
            <FaBriefcase size={10} color="#818cf8" />
            <AppText
              style={{ fontSize: 11, fontWeight: "700", color: "#818cf8" }}
            >
              From Job Post
            </AppText>
          </View>
        </View>

        {step >= 0 ? <Timeline step={step} c={c} /> : null}

        {booking.status === "PENDING" && isHirer ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 10,
              padding: 14,
              backgroundColor: "rgba(251,191,36,0.07)",
              borderWidth: 1.5,
              borderColor: "rgba(251,191,36,0.35)",
              borderRadius: 14,
            }}
          >
            <FaHourglassHalf
              size={16}
              color="#fbbf24"
              style={{ marginTop: 2 }}
            />
            <View style={{ flex: 1 }}>
              <AppText
                style={{ fontSize: 13, fontWeight: "700", color: "#fbbf24" }}
              >
                Waiting for {workerName || "the worker"} to respond
              </AppText>
              <AppText
                style={{
                  fontSize: 12,
                  color: c.textDim,
                  marginTop: 4,
                  lineHeight: 18,
                }}
              >
                Your booking request has been sent. {workerName || "The worker"}{" "}
                hasn't accepted yet — you'll be notified the moment they do. You
                can cancel for free until they accept.
              </AppText>
            </View>
          </View>
        ) : null}

        <Section title="Booking Details" c={c}>
          <DetailItem
            icon={<FaCalendarAlt size={14} color={c.orange} />}
            label="Scheduled"
            value={`${new Date(booking.scheduledAt).toLocaleDateString(
              "en-GB",
              {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              },
            )} at ${new Date(booking.scheduledAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}`}
            c={c}
          />
          {booking.address && showMapLink ? (
            <DetailItem
              icon={<FaMapMarkerAlt size={14} color={c.orange} />}
              label="Job Site Address"
              value={booking.address}
              c={c}
            />
          ) : null}
          <DetailItem
            icon={<FaMoneyBillWave size={14} color={c.orange} />}
            label="Agreed Total"
            value={`${booking.currency} ${Number(booking.agreedRate).toLocaleString()}`}
            accent
            c={c}
          />
          {booking.isNegotiated && booking.negotiatedRate ? (
            <DetailItem
              icon={<FaHandshake size={14} color={c.orange} />}
              label="Negotiated Override"
              value={`${booking.currency} ${Number(booking.negotiatedRate).toLocaleString()}`}
              accent
              c={c}
            />
          ) : null}
          {booking.isNegotiated && booking.negotiationNote ? (
            <DetailItem
              icon={<FaFileAlt size={14} color={c.orange} />}
              label="Negotiation Note"
              value={booking.negotiationNote}
              c={c}
            />
          ) : null}
          {booking.checkInAt ? (
            <DetailItem
              icon={<FaCheckCircle size={14} color={c.green} />}
              label="Checked In"
              value={new Date(booking.checkInAt).toLocaleString("en-NG", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
              c={c}
            />
          ) : null}
          {booking.checkOutAt ? (
            <DetailItem
              icon={<FaFlag size={14} color={c.orange} />}
              label="Checked Out"
              value={new Date(booking.checkOutAt).toLocaleString("en-NG", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
              c={c}
            />
          ) : null}
          {booking.checkInAt && booking.checkOutAt ? (
            <DetailItem
              icon={<FaClock size={14} color={c.orange} />}
              label="Actual Duration"
              value={calcDuration(booking.checkInAt, booking.checkOutAt)}
              c={c}
            />
          ) : null}
          {booking.insuranceRef ? (
            <DetailItem
              icon={<FaShieldAlt size={14} color={c.orange} />}
              label="Insurance"
              value={`${booking.insurancePlan || "Insured"} · Policy #${booking.insuranceRef}`}
              c={c}
            />
          ) : null}
          {isHirer ? (
            <>
              <DetailItem
                icon={<FaMoneyBillWave size={14} color={c.orange} />}
                label="Subtotal"
                value={`${currency} ${Number(p.subtotal).toLocaleString()}`}
                c={c}
              />
              <DetailItem
                icon={<FaMoneyBillWave size={14} color={c.orange} />}
                label={`Platform Fee (${feePercent}%)`}
                value={`${currency} ${Number(p.hirerFee).toLocaleString()}`}
                accent
                c={c}
              />
              <DetailItem
                icon={<FaMoneyBillWave size={14} color={c.orange} />}
                label="Total Payment"
                value={`${currency} ${Number(p.grossTotal).toLocaleString()}`}
                accent
                c={c}
              />
            </>
          ) : (
            <>
              <DetailItem
                icon={<FaMoneyBillWave size={14} color={c.orange} />}
                label="Total Earnings"
                value={`${currency} ${Number(p.subtotal).toLocaleString()}`}
                accent
                c={c}
              />
              <DetailItem
                icon={<FaMoneyBillWave size={14} color={c.orange} />}
                label={`Platform Fee (${feePercent}%)`}
                value={`${currency} ${Number(p.hirerFee).toLocaleString()}`}
                c={c}
              />
              <DetailItem
                icon={<FaMoneyBillWave size={14} color={c.orange} />}
                label="Your Payout"
                value={`${currency} ${Number(p.workerPayout).toLocaleString()}`}
                accent
                c={c}
              />
            </>
          )}
        </Section>

        {hasCheckInGps || hasCheckOutGps ? (
          <GpsSection
            booking={booking}
            hasCheckInGps={hasCheckInGps}
            hasCheckOutGps={hasCheckOutGps}
            checkInDistKm={checkInDistKm}
            checkOutDistKm={checkOutDistKm}
            c={c}
          />
        ) : null}

        {booking.status === "COMPLETED" ? (
          <ReviewsSection
            reviews={booking.reviews}
            reviewCheckDone={reviewCheckDone}
            hasReviewed={hasReviewed}
            onLeaveReview={onLeaveReview}
            c={c}
          />
        ) : null}

        {booking.cancelReason ? (
          <CancelReason reason={booking.cancelReason} c={c} />
        ) : null}

        <BottomActions
          isCompletedOrPaid={booking.status === "COMPLETED"}
          showRefundButton={showRefundButton}
          onDownloadInvoice={onDownloadInvoice}
          onRefundClick={onShowRefundModal}
          refundLoading={refundLoading}
          invoiceLoading={invoiceLoading}
          c={c}
        />
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // BRANCH 3 — DIRECT BOOKING
  // ═══════════════════════════════════════════════════════════════════════
  const p = calcPricing(booking);
  const currency = p.currency || booking.currency || "NGN";
  const feePercent = Math.round(getHirerFeeRate(currency) * 100);

  return (
    <View style={{ gap: 10 }}>
      <BookingReleaseDetails payment={payment} currency={booking.currency} />

      <View
        style={{
          backgroundColor: c.bgPanel,
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: 16,
          padding: 20,
          gap: 8,
        }}
      >
        <View
          style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}
        >
          <AppText
            style={{
              fontFamily: "Syne_700Bold",
              fontSize: 20,
              fontWeight: "700",
              color: c.text,
              flex: 1,
              lineHeight: 26,
            }}
          >
            {booking.title}
          </AppText>
          <View
            style={{
              paddingHorizontal: 12,
              paddingVertical: 4,
              backgroundColor: badgeColor.bg,
              borderRadius: 20,
            }}
          >
            <AppText
              style={{
                fontSize: 10,
                fontWeight: "700",
                color: badgeColor.fg,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {meta.label}
            </AppText>
          </View>
        </View>
        {booking.category ? (
          <View
            style={{
              alignSelf: "flex-start",
              paddingHorizontal: 10,
              paddingVertical: 3,
              backgroundColor: c.orangeDim,
              borderRadius: 12,
            }}
          >
            <AppText
              style={{ fontSize: 11, fontWeight: "700", color: c.orange }}
            >
              {booking.category.name}
            </AppText>
          </View>
        ) : null}
        {booking.isNegotiated ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              alignSelf: "flex-start",
              paddingHorizontal: 10,
              paddingVertical: 3,
              backgroundColor: "rgba(129,140,248,0.1)",
              borderWidth: 1,
              borderColor: "rgba(129,140,248,0.25)",
              borderRadius: 12,
            }}
          >
            <FaHandshake size={10} color="#818cf8" />
            <AppText
              style={{ fontSize: 11, fontWeight: "700", color: "#818cf8" }}
            >
              Negotiated rate
            </AppText>
          </View>
        ) : null}
      </View>

      {step >= 0 ? <Timeline step={step} c={c} /> : null}

      {booking.status === "PENDING" && isHirer ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 10,
            padding: 14,
            backgroundColor: "rgba(251,191,36,0.07)",
            borderWidth: 1.5,
            borderColor: "rgba(251,191,36,0.35)",
            borderRadius: 14,
          }}
        >
          <FaHourglassHalf size={16} color="#fbbf24" style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <AppText
              style={{ fontSize: 13, fontWeight: "700", color: "#fbbf24" }}
            >
              Waiting for {workerName || "the worker"} to respond
            </AppText>
            <AppText
              style={{
                fontSize: 12,
                color: c.textDim,
                marginTop: 4,
                lineHeight: 18,
              }}
            >
              Your booking request has been sent. {workerName || "The worker"}{" "}
              hasn't accepted yet — you'll be notified the moment they do. You
              can cancel for free until they accept.
            </AppText>
          </View>
        </View>
      ) : null}

      <Section title="Description" c={c}>
        <AppText style={{ fontSize: 13, color: c.textDim, lineHeight: 20 }}>
          {booking.description}
        </AppText>
        {booking.notes ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 8,
              padding: 12,
              backgroundColor: c.bgCard,
              borderWidth: 1,
              borderColor: c.border,
              borderRadius: 8,
            }}
          >
            <FaFileAlt size={12} color={c.textMuted} style={{ marginTop: 2 }} />
            <AppText style={{ fontSize: 13, color: c.textDim, flex: 1 }}>
              {booking.notes}
            </AppText>
          </View>
        ) : null}
      </Section>

      {booking.requirements || booking.responsibilities ? (
        <Section title="Requirements & Responsibilities" c={c}>
          {booking.requirements ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 8,
                padding: 12,
                backgroundColor: c.bgCard,
                borderWidth: 1,
                borderColor: c.border,
                borderRadius: 8,
                marginBottom: 8,
              }}
            >
              <FaFileAlt
                size={12}
                color={c.textMuted}
                style={{ marginTop: 2 }}
              />
              <View style={{ flex: 1 }}>
                <AppText
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: c.text,
                    marginBottom: 2,
                  }}
                >
                  Requirements
                </AppText>
                <AppText style={{ fontSize: 13, color: c.textDim }}>
                  {booking.requirements}
                </AppText>
              </View>
            </View>
          ) : null}
          {booking.responsibilities ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 8,
                padding: 12,
                backgroundColor: c.bgCard,
                borderWidth: 1,
                borderColor: c.border,
                borderRadius: 8,
              }}
            >
              <FaTools size={12} color={c.textMuted} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <AppText
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: c.text,
                    marginBottom: 2,
                  }}
                >
                  Responsibilities
                </AppText>
                <AppText style={{ fontSize: 13, color: c.textDim }}>
                  {booking.responsibilities}
                </AppText>
              </View>
            </View>
          ) : null}
        </Section>
      ) : null}

      <Section title="Job Details" c={c}>
        <DetailItem
          icon={<FaCalendarAlt size={14} color={c.orange} />}
          label="Scheduled"
          value={`${new Date(booking.scheduledAt).toLocaleDateString("en-GB", {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric",
          })} at ${new Date(booking.scheduledAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}`}
          c={c}
        />
        {booking.address && booking.locationType !== "REMOTE" ? (
          <DetailItem
            icon={<FaMapMarkerAlt size={14} color={c.orange} />}
            label="Job Site Address"
            value={booking.address}
            c={c}
          />
        ) : null}
        <DetailItem
          icon={<FaMoneyBillWave size={14} color={c.orange} />}
          label="Agreed Rate"
          value={`${booking.currency} ${Number(booking.agreedRate).toLocaleString()}`}
          accent
          c={c}
        />
        {booking.isNegotiated && booking.negotiatedRate ? (
          <DetailItem
            icon={<FaHandshake size={14} color={c.orange} />}
            label="Negotiated Rate"
            value={`${booking.currency} ${Number(booking.negotiatedRate).toLocaleString()}`}
            accent
            c={c}
          />
        ) : null}
        {booking.isNegotiated && booking.negotiationNote ? (
          <DetailItem
            icon={<FaFileAlt size={14} color={c.orange} />}
            label="Negotiation Note"
            value={booking.negotiationNote}
            c={c}
          />
        ) : null}
        <View
          style={{
            paddingHorizontal: 12,
            paddingVertical: 10,
            backgroundColor: c.bgCard,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: 10,
            gap: 3,
          }}
        >
          <AppText
            style={{
              fontSize: 10,
              fontWeight: "500",
              color: c.textMuted,
              textTransform: "uppercase",
              letterSpacing: 0.6,
            }}
          >
            Est. Duration
          </AppText>
          {renderDuration()}
        </View>
        {booking.checkInAt ? (
          <DetailItem
            icon={<FaCheckCircle size={14} color={c.green} />}
            label="Checked In"
            value={new Date(booking.checkInAt).toLocaleString("en-NG", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
            c={c}
          />
        ) : null}
        {booking.checkOutAt ? (
          <DetailItem
            icon={<FaFlag size={14} color={c.orange} />}
            label="Checked Out"
            value={new Date(booking.checkOutAt).toLocaleString("en-NG", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
            c={c}
          />
        ) : null}
        {booking.checkInAt && booking.checkOutAt ? (
          <DetailItem
            icon={<FaClock size={14} color={c.orange} />}
            label="Actual Duration"
            value={calcDuration(booking.checkInAt, booking.checkOutAt)}
            c={c}
          />
        ) : null}
        {booking.insuranceRef ? (
          <DetailItem
            icon={<FaShieldAlt size={14} color={c.orange} />}
            label="Insurance"
            value={`${booking.insurancePlan || "Insured"} · Policy #${booking.insuranceRef}`}
            c={c}
          />
        ) : null}
        {booking.jobType ? (
          <DetailItem
            icon={<FaBriefcase size={14} color={c.orange} />}
            label="Job Type"
            value={JOB_TYPES[booking.jobType]?.label || booking.jobType}
            c={c}
          />
        ) : null}
        {booking.locationType ? (
          <DetailItem
            icon={<FaMapMarkerAlt size={14} color={c.orange} />}
            label="Location Type"
            value={
              LOC_TYPES[booking.locationType]?.label || booking.locationType
            }
            c={c}
          />
        ) : null}
        {isHirer ? (
          <>
            <DetailItem
              icon={<FaMoneyBillWave size={14} color={c.orange} />}
              label="Subtotal"
              value={`${currency} ${Number(p.subtotal).toLocaleString()}`}
              c={c}
            />
            <DetailItem
              icon={<FaMoneyBillWave size={14} color={c.orange} />}
              label={`Platform Fee (${feePercent}%)`}
              value={`${currency} ${Number(p.hirerFee).toLocaleString()}`}
              accent
              c={c}
            />
            <DetailItem
              icon={<FaMoneyBillWave size={14} color={c.orange} />}
              label="Total Payment"
              value={`${currency} ${Number(p.grossTotal).toLocaleString()}`}
              accent
              c={c}
            />
          </>
        ) : (
          <>
            <DetailItem
              icon={<FaMoneyBillWave size={14} color={c.orange} />}
              label="Total Earnings"
              value={`${currency} ${Number(p.subtotal).toLocaleString()}`}
              accent
              c={c}
            />
            <DetailItem
              icon={<FaMoneyBillWave size={14} color={c.orange} />}
              label={`Platform Fee (${feePercent}%)`}
              value={`${currency} ${Number(p.hirerFee).toLocaleString()}`}
              c={c}
            />
            <DetailItem
              icon={<FaMoneyBillWave size={14} color={c.orange} />}
              label="Your Payout"
              value={`${currency} ${Number(p.workerPayout).toLocaleString()}`}
              accent
              c={c}
            />
          </>
        )}
      </Section>

      {hasCheckInGps || hasCheckOutGps ? (
        <GpsSection
          booking={booking}
          hasCheckInGps={hasCheckInGps}
          hasCheckOutGps={hasCheckOutGps}
          checkInDistKm={checkInDistKm}
          checkOutDistKm={checkOutDistKm}
          c={c}
        />
      ) : null}

      {booking.status === "COMPLETED" ? (
        <ReviewsSection
          reviews={booking.reviews}
          reviewCheckDone={reviewCheckDone}
          hasReviewed={hasReviewed}
          onLeaveReview={onLeaveReview}
          c={c}
        />
      ) : null}

      {booking.cancelReason ? (
        <CancelReason reason={booking.cancelReason} c={c} />
      ) : null}

      <BottomActions
        isCompletedOrPaid={booking.status === "COMPLETED"}
        showRefundButton={showRefundButton}
        onDownloadInvoice={onDownloadInvoice}
        onRefundClick={onShowRefundModal}
        refundLoading={refundLoading}
        invoiceLoading={invoiceLoading}
        c={c}
      />
    </View>
  );
}

function calcDuration(start, end) {
  if (!start || !end) return null;
  const ms = new Date(end) - new Date(start);
  const hrs = Math.floor(ms / 3600000);
  const min = Math.floor((ms % 3600000) / 60000);
  return hrs > 0 ? `${hrs}h ${min}m` : `${min}m`;
}

const styles = StyleSheet.create({
  gpsCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
});
