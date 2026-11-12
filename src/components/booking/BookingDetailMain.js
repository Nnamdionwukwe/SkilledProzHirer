// src/components/booking/BookingDetailMain.js

import React from "react";
import { Linking, Pressable, StyleSheet, View, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";

import AppText from "../AppText";
import { useTheme } from "../../contexts/ThemeContext";
import { calcPricing, getHirerFeeRate } from "../../utils/pricing";
import BookingReleaseDetails from "./BookingReleaseDetails";
import JobPostBookingDetails from "./JobPostBookingDetails"; // <-- ADDED
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

const TIMELINE_STEPS = [
  "booking.timeline.pending",
  "booking.timeline.accepted",
  "booking.timeline.inProgress",
  "booking.timeline.completed",
];

const JOB_TYPES = {
  FULL_TIME: { Icon: FaBriefcase, labelKey: "postJob.jobType.FULL_TIME" },
  PART_TIME: { Icon: FaClock, labelKey: "postJob.jobType.PART_TIME" },
  CONTRACT: { Icon: FaFileAlt, labelKey: "postJob.jobType.CONTRACT" },
  TEMPORARY: { Icon: FaFlag, labelKey: "postJob.jobType.TEMPORARY" },
};
const LOC_TYPES = {
  REMOTE: { Icon: FaGlobe, labelKey: "postJob.locationType.REMOTE" },
  ON_SITE: { Icon: FaMapPin, labelKey: "postJob.locationType.ON_SITE" },
  HYBRID: { Icon: FaRandom, labelKey: "postJob.locationType.HYBRID" },
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
            fontWeight: "600",
            color: c.textMuted,
            textTransform: "uppercase",
            letterSpacing: 0.6,
            marginBottom: 3,
            fontFamily: "DMSans_700Bold",
          }}
        >
          {label}
        </AppText>
        {typeof value === "string" || typeof value === "number" ? (
          <AppText
            style={{
              fontSize: 13,
              fontWeight: "700",
              color: accent ? c.orange : c.text,
              lineHeight: 18,
              fontFamily: "DMSans_700Bold",
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
          style={{
            fontSize: 13,
            fontWeight: "700",
            color: "#1a1a1a",
            flex: 1,
            fontFamily: "DMSans_700Bold",
          }}
        >
          {title}
        </AppText>
        {timestamp ? (
          <AppText
            style={{
              fontSize: 11,
              color: "#888",
              fontFamily: "DMSans_400Regular",
            }}
          >
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
        <AppText
          style={{
            fontSize: 12,
            color: "#888",
            fontFamily: "DMSans_400Regular",
          }}
        >
          Coordinates
        </AppText>
        <AppText
          style={{ fontSize: 12, color: "#333", fontFamily: "monospace" }}
        >
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
              fontWeight: "700",
              color: distKm > 1 ? "#92400e" : "#166534",
              fontFamily: "DMSans_700Bold",
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
        <AppText
          style={{
            fontSize: 11,
            fontWeight: "700",
            color: "#2563eb",
            fontFamily: "DMSans_700Bold",
          }}
        >
          View on Google Maps
        </AppText>
      </Pressable>
    </View>
  );
}

// ── Timeline ────────────────────────────────────────────────────────────
function Timeline({ step, c, t }) {
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
        {TIMELINE_STEPS.map((labelKey, i) => {
          const active = i <= step;
          const current = i === step;
          return (
            <View key={labelKey} style={{ flex: 1, alignItems: "center" }}>
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
                      fontFamily: "DMSans_700Bold",
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
                  fontWeight: "700",
                  color: active ? c.textDim : c.textMuted,
                  textAlign: "center",
                  fontFamily: "DMSans_700Bold",
                }}
              >
                {t(labelKey)}
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
          fontWeight: "800",
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
  t,
}) {
  if (!reviews?.length && !reviewCheckDone) return null;
  return (
    <Section title={t("booking.section.reviews")} c={c}>
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
                    style={{
                      fontSize: 12,
                      fontWeight: "800",
                      color: c.orange,
                      fontFamily: "Syne_800ExtraBold",
                    }}
                  >
                    {review.giver?.firstName?.[0]}
                    {review.giver?.lastName?.[0]}
                  </AppText>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <AppText
                    style={{
                      fontSize: 13,
                      fontWeight: "700",
                      color: c.text,
                      fontFamily: "DMSans_700Bold",
                    }}
                    numberOfLines={1}
                  >
                    {review.giver?.firstName} {review.giver?.lastName}
                    <AppText
                      style={{
                        color: c.textDim,
                        fontWeight: "400",
                        fontFamily: "DMSans_400Regular",
                      }}
                    >
                      {" · "}
                      {review.giver?.role === "HIRER"
                        ? t("booking.role.hirer")
                        : t("booking.role.worker")}
                    </AppText>
                  </AppText>
                  <AppText
                    style={{
                      fontSize: 11,
                      color: c.textMuted,
                      fontFamily: "DMSans_400Regular",
                    }}
                  >
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
                      fontFamily: "DMSans_400Regular",
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
            style={{
              fontSize: 13,
              fontWeight: "700",
              color: c.textDim,
              fontFamily: "DMSans_700Bold",
            }}
          >
            {t("booking.button.leaveReview")}
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
          <AppText
            style={{
              fontSize: 12,
              color: c.green,
              flex: 1,
              fontFamily: "DMSans_400Regular",
            }}
          >
            {t("booking.review.submitted")}{" "}
            {(reviews?.length ?? 0) < 2 ? t("booking.review.waitingOther") : ""}
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
  t,
}) {
  return (
    <Section title={t("booking.section.workerLocation")} c={c}>
      <AppText
        style={{
          fontSize: 13,
          color: c.textMuted,
          marginBottom: 6,
          fontFamily: "DMSans_400Regular",
        }}
      >
        {t("booking.gpsLocation")}
      </AppText>
      <View style={{ gap: 10 }}>
        {hasCheckInGps ? (
          <GpsCard
            title={t("booking.location.checkIn")}
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
            title={t("booking.location.checkOut")}
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
function CancelReason({ reason, c, t }) {
  return (
    <Section title={t("booking.section.cancelReason")} c={c}>
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
          style={{
            flex: 1,
            fontSize: 13,
            color: c.textDim,
            lineHeight: 20,
            fontFamily: "DMSans_400Regular",
          }}
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
  onReleaseClick, // <-- ADDED
  refundLoading,
  invoiceLoading,
  c,
  t,
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
        <AppText
          style={{
            fontSize: 13,
            fontWeight: "700",
            color: c.textDim,
            fontFamily: "DMSans_700Bold",
          }}
        >
          {t("booking.button.downloadInvoice")}
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
          <AppText
            style={{
              fontSize: 13,
              fontWeight: "700",
              color: c.red,
              fontFamily: "DMSans_700Bold",
            }}
          >
            {t("booking.button.requestRefund")}
          </AppText>
        </Pressable>
      ) : null}
      {onReleaseClick ? (
        <Pressable
          onPress={onReleaseClick}
          style={({ pressed }) => [
            {
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingHorizontal: 14,
              paddingVertical: 10,
              backgroundColor: c.orangeDim,
              borderWidth: 1,
              borderColor: c.orange,
              borderRadius: 9,
              opacity: pressed ? 0.75 : 1,
            },
          ]}
        >
          <FaMoneyBillWave size={12} color={c.orange} />
          <AppText
            style={{
              fontSize: 13,
              fontWeight: "700",
              color: c.orange,
              fontFamily: "DMSans_700Bold",
            }}
          >
            Release Escrow
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
  const { t } = useTranslation();
  const navigation = useNavigation();
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

  const handleOpenMap = () => {
    if (booking.latitude && booking.longitude) {
      const scheme = Platform.select({
        ios: "maps:0,0?q=",
        android: "geo:0,0?q=",
      });
      const latLng = `${booking.latitude},${booking.longitude}`;
      const label = booking.address || "Job Location";
      const url = Platform.select({
        ios: `${scheme}${label}@${latLng}`,
        android: `${scheme}${latLng}(${label})`,
      });
      Linking.openURL(url);
    } else if (booking.address) {
      Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.address)}`,
      );
    }
  };

  const handleCallEmergency = () => {
    if (booking.emergencyContact?.phone || booking.emergencyContact) {
      const phone =
        typeof booking.emergencyContact === "string"
          ? booking.emergencyContact
          : booking.emergencyContact.phone;
      if (phone) {
        Linking.openURL(`tel:${phone}`);
      }
    }
  };

  const handleOpenJobPost = () => {
    if (booking.jobPostId) {
      navigation.navigate("JobDetail", { jobId: booking.jobPostId });
    }
  };

  const renderDuration = () => {
    if (!dur) {
      if (booking.estimatedHours || booking.estimatedValue) {
        return (
          <AppText
            style={{ color: c.textMuted, fontFamily: "DMSans_400Regular" }}
          >
            Loading…
          </AppText>
        );
      }
      return (
        <AppText
          style={{ color: c.textMuted, fontFamily: "DMSans_400Regular" }}
        >
          Not specified
        </AppText>
      );
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
        <AppText
          style={{
            fontSize: 13,
            fontWeight: "700",
            color: c.text,
            fontFamily: "DMSans_700Bold",
          }}
        >
          {dur.main}
        </AppText>
        {dur.sub ? (
          <AppText
            style={{
              fontSize: 12,
              color: c.textMuted,
              fontFamily: "DMSans_400Regular",
            }}
          >
            {dur.sub}
          </AppText>
        ) : null}
        {unitLabel ? (
          <AppText
            style={{
              fontSize: 11,
              color: c.textMuted,
              fontFamily: "DMSans_400Regular",
            }}
          >
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
          <View style={{ gap: 12 }}>
            <AppText
              weight="displayBlack"
              style={{
                fontSize: 12,
                letterSpacing: -0.5,
                marginBottom: 4,
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
                  fontWeight: "800",
                  color: badgeColor.fg,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  fontFamily: "DMSans_700Bold",
                }}
              >
                {meta.label}
              </AppText>
            </View>
          </View>
          {booking.category ? (
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 3,
                backgroundColor: c.orangeDim,
                borderRadius: 12,
              }}
            >
              <AppText
                style={{
                  fontSize: 11,
                  fontWeight: "800",
                  color: c.orange,
                  fontFamily: "DMSans_700Bold",
                }}
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
              style={{
                fontSize: 11,
                fontWeight: "800",
                color: "#818cf8",
                fontFamily: "DMSans_700Bold",
              }}
            >
              {t("retainedStaff.payrollPill", "Retained Staff Payroll")}
            </AppText>
          </View>
        </View>

        <Section
          title={t("retainedStaff.detailsTitle", "Retained Staff Details")}
          c={c}
        >
          <DetailItem
            icon={<FaCalendarAlt size={14} color={c.orange} />}
            label={t("retainedStaff.payDate")}
            value={new Date(booking.scheduledAt).toLocaleDateString("en-GB", {
              month: "short",
              year: "numeric",
            })}
            c={c}
          />
          <DetailItem
            icon={<FaMoneyBillWave size={14} color={c.orange} />}
            label={t("retainedStaff.payRate")}
            value={`${booking.currency} ${Number(booking.agreedRate).toLocaleString()}`}
            accent
            c={c}
          />
          <DetailItem
            icon={<FaFileAlt size={14} color={c.orange} />}
            label={t("retainedStaff.roleDescription", "Role")}
            value={booking.description || "Standard Retained Role"}
            c={c}
          />
          {booking.jobType
            ? (() => {
                const Icon = JOB_TYPES[booking.jobType]?.Icon || FaBriefcase;
                return (
                  <DetailItem
                    icon={<Icon size={14} color={c.orange} />}
                    label={t("retainedStaff.jobTitle")}
                    value={t(
                      JOB_TYPES[booking.jobType]?.labelKey,
                      booking.jobType,
                    )}
                    c={c}
                  />
                );
              })()
            : null}
          {booking.employmentType ? (
            <DetailItem
              icon={<FaBriefcase size={14} color={c.orange} />}
              label={t("retainedStaff.employmentType")}
              value={String(booking.employmentType).replace(/_/g, " ")}
              c={c}
            />
          ) : null}
          {booking.department ? (
            <DetailItem
              icon={<FaBuilding size={14} color={c.orange} />}
              label={t("retainedStaff.department")}
              value={booking.department}
              c={c}
            />
          ) : null}
          {booking.locationType ? (
            <DetailItem
              icon={<FaMapPin size={14} color={c.orange} />}
              label={t("retainedStaff.locationType")}
              value={t(
                LOC_TYPES[booking.locationType]?.labelKey,
                booking.locationType,
              )}
              c={c}
            />
          ) : null}
          {booking.location && booking.locationType !== "REMOTE" ? (
            <Pressable onPress={handleOpenMap}>
              <DetailItem
                icon={<FaMapMarkerAlt size={14} color={c.orange} />}
                label={t("retainedStaff.workLocation")}
                value={
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <AppText
                      style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color: c.text,
                        fontFamily: "DMSans_700Bold",
                      }}
                    >
                      {booking.location}
                    </AppText>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginLeft: 4,
                      }}
                    >
                      <AppText
                        style={{
                          fontSize: 11,
                          fontWeight: "700",
                          color: c.orange,
                          fontFamily: "DMSans_700Bold",
                        }}
                      >
                        {t("booking.location.viewOnMaps", "View map")}
                      </AppText>
                      <FaExternalLinkAlt
                        size={10}
                        color={c.orange}
                        style={{ marginLeft: 4 }}
                      />
                    </View>
                  </View>
                }
                c={c}
              />
            </Pressable>
          ) : null}
          {booking.workDays?.length > 0 ? (
            <DetailItem
              icon={<FaCalendarAlt size={14} color={c.orange} />}
              label={t("retainedStaff.workDays")}
              value={booking.workDays.join(", ")}
              c={c}
            />
          ) : null}
          {booking.workStart && booking.workEnd ? (
            <DetailItem
              icon={<FaClock size={14} color={c.orange} />}
              label={t("retainedStaff.workingSchedule")}
              value={`${booking.workStart} — ${booking.workEnd}${booking.timezone ? ` (${booking.timezone})` : ""}`}
              c={c}
            />
          ) : null}
          {booking.employeeNumber ? (
            <DetailItem
              icon={<FaBriefcase size={14} color={c.orange} />}
              label={t("retainedStaff.employeeNumber")}
              value={booking.employeeNumber}
              c={c}
            />
          ) : null}
          {booking.managerName ? (
            <DetailItem
              icon={<FaUser size={14} color={c.orange} />}
              label={t("retainedStaff.manager")}
              value={booking.managerName}
              c={c}
            />
          ) : null}
          {booking.emergencyContact ? (
            <Pressable onPress={handleCallEmergency}>
              <DetailItem
                icon={<FaExclamationTriangle size={14} color={c.orange} />}
                label={t("retainedStaff.emergencyContact")}
                value={
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <AppText
                      style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color: c.text,
                        fontFamily: "DMSans_700Bold",
                      }}
                    >
                      {typeof booking.emergencyContact === "string"
                        ? booking.emergencyContact
                        : booking.emergencyContact.name || ""}
                    </AppText>
                    <AppText
                      style={{
                        fontSize: 11,
                        fontWeight: "700",
                        color: c.orange,
                        marginLeft: 4,
                        fontFamily: "DMSans_700Bold",
                      }}
                    >
                      {t("booking.sidebar.emergencyPhone", "Call")}
                    </AppText>
                  </View>
                }
                c={c}
              />
            </Pressable>
          ) : null}
          <DetailItem
            icon={<FaClock size={14} color={c.orange} />}
            label={t("booking.detail.status")}
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
            label={t("retainedStaff.baseAmount")}
            value={`${currency} ${Number(p.subtotal).toLocaleString()}`}
            c={c}
          />
          {booking.bonusAmount > 0 ? (
            <DetailItem
              icon={<FaPlusCircle size={14} color={c.green} />}
              label={t("retainedStaff.bonusAmount")}
              value={`+ ${currency} ${Number(booking.bonusAmount).toLocaleString()}`}
              c={c}
            />
          ) : null}
          {booking.deductionAmount > 0 ? (
            <DetailItem
              icon={<FaMinusCircle size={14} color="#f87171" />}
              label={t("retainedStaff.deductionAmount")}
              value={`- ${currency} ${Number(booking.deductionAmount).toLocaleString()}`}
              c={c}
            />
          ) : null}
          <DetailItem
            icon={<FaMoneyBillWave size={14} color={c.orange} />}
            label={t("retainedStaff.platformFeeWithRate", {
              rate: feePercent,
              defaultValue: "Platform Fee ({{rate}}%)",
            })}
            value={`${currency} ${Number(p.hirerFee).toLocaleString()}`}
            accent
            c={c}
          />
          {isHirer ? (
            <DetailItem
              icon={<FaMoneyBillWave size={14} color={c.orange} />}
              label={t("retainedStaff.youPayHirer")}
              value={`${currency} ${Number(p.grossTotal).toLocaleString()}`}
              accent
              c={c}
            />
          ) : (
            <DetailItem
              icon={<FaMoneyBillWave size={14} color={c.orange} />}
              label={t("retainedStaff.workerReceives")}
              value={`${currency} ${Number(p.workerPayout).toLocaleString()}`}
              accent
              c={c}
            />
          )}
        </Section>

        <Section title={t("booking.section.description")} c={c}>
          <AppText
            style={{
              fontSize: 13,
              color: c.textDim,
              lineHeight: 20,
              fontFamily: "DMSans_400Regular",
            }}
          >
            {booking.description ||
              t("booking.noDescription", "No additional description provided.")}
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
              <AppText
                style={{
                  fontSize: 13,
                  color: c.textDim,
                  flex: 1,
                  fontFamily: "DMSans_400Regular",
                }}
              >
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
            t={t}
          />
        ) : null}

        <BottomActions
          isCompletedOrPaid={isCompletedOrPaid}
          showRefundButton={false}
          onDownloadInvoice={onDownloadInvoice}
          invoiceLoading={invoiceLoading}
          c={c}
          t={t}
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
          <View style={{ gap: 12 }}>
            <AppText
              weight="displayBlack"
              style={{
                fontSize: 12,
                letterSpacing: -0.5,
                marginBottom: 4,
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
                  fontWeight: "800",
                  color: badgeColor.fg,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  fontFamily: "DMSans_700Bold",
                }}
              >
                {meta.label}
              </AppText>
            </View>
          </View>
          {booking.category ? (
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 3,
                backgroundColor: c.orangeDim,
                borderRadius: 12,
              }}
            >
              <AppText
                style={{
                  fontSize: 11,
                  fontWeight: "800",
                  color: c.orange,
                  fontFamily: "DMSans_700Bold",
                }}
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
                style={{
                  fontSize: 11,
                  fontWeight: "800",
                  color: "#818cf8",
                  fontFamily: "DMSans_700Bold",
                }}
              >
                {t("booking.detail.negotiatedRate", "Negotiated rate")}
              </AppText>
            </View>
          ) : null}
          <Pressable
            onPress={handleOpenJobPost}
            style={({ pressed }) => [
              {
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                paddingHorizontal: 10,
                paddingVertical: 3,
                backgroundColor: "rgba(129,140,248,0.1)",
                borderWidth: 1,
                borderColor: "rgba(129,140,248,0.25)",
                borderRadius: 12,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <FaBriefcase size={10} color="#818cf8" />
            <AppText
              style={{
                fontSize: 11,
                fontWeight: "800",
                color: "#818cf8",
                fontFamily: "DMSans_700Bold",
              }}
            >
              {t("booking.jobPost.fromJobPost")}
            </AppText>
            <FaExternalLinkAlt
              size={9}
              color="#818cf8"
              style={{ marginLeft: 2 }}
            />
          </Pressable>
        </View>

        {step >= 0 ? <Timeline step={step} c={c} t={t} /> : null}

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
                style={{
                  fontSize: 13,
                  fontWeight: "800",
                  color: "#fbbf24",
                  fontFamily: "DMSans_700Bold",
                }}
              >
                {t("booking.pending.waitingFor", {
                  name: workerName || "the worker",
                  defaultValue: "Waiting for {{name}} to respond",
                })}
              </AppText>
              <AppText
                style={{
                  fontSize: 12,
                  color: c.textDim,
                  marginTop: 4,
                  lineHeight: 18,
                  fontFamily: "DMSans_400Regular",
                }}
              >
                {t("booking.pending.description", {
                  name: workerName || "The worker",
                  defaultValue:
                    "Your booking request has been sent. {{name}} hasn't accepted yet — you'll be notified the moment they do. You can cancel for free until they accept.",
                })}
              </AppText>
            </View>
          </View>
        ) : null}

        {/* ── The full job-post detail block ── */}
        <JobPostBookingDetails booking={booking} />

        {/* Booking-level details (dates, agreement, GPS times) */}
        <Section title={t("booking.section.jobDetails")} c={c}>
          <DetailItem
            icon={<FaCalendarAlt size={14} color={c.orange} />}
            label={t("booking.detail.scheduled")}
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
            <Pressable onPress={handleOpenMap}>
              <DetailItem
                icon={<FaMapMarkerAlt size={14} color={c.orange} />}
                label={t("booking.job.address")}
                value={
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <AppText
                      style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color: c.text,
                        fontFamily: "DMSans_700Bold",
                      }}
                    >
                      {booking.address}
                    </AppText>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginLeft: 4,
                      }}
                    >
                      <AppText
                        style={{
                          fontSize: 11,
                          fontWeight: "700",
                          color: c.orange,
                          fontFamily: "DMSans_700Bold",
                        }}
                      >
                        {t("booking.location.viewOnMaps")}
                      </AppText>
                      <FaExternalLinkAlt
                        size={10}
                        color={c.orange}
                        style={{ marginLeft: 4 }}
                      />
                    </View>
                  </View>
                }
                c={c}
              />
            </Pressable>
          ) : null}
          <DetailItem
            icon={<FaMoneyBillWave size={14} color={c.orange} />}
            label={t("payment.options.labels.agreedTotal")}
            value={`${booking.currency} ${Number(booking.agreedRate).toLocaleString()}`}
            accent
            c={c}
          />
          {booking.isNegotiated && booking.negotiatedRate ? (
            <DetailItem
              icon={<FaHandshake size={14} color={c.orange} />}
              label={t("booking.detail.negotiatedOverride")}
              value={`${booking.currency} ${Number(booking.negotiatedRate).toLocaleString()}`}
              accent
              c={c}
            />
          ) : null}
          {booking.isNegotiated && booking.negotiationNote ? (
            <DetailItem
              icon={<FaFileAlt size={14} color={c.orange} />}
              label={t("booking.detail.negotiationNote")}
              value={booking.negotiationNote}
              c={c}
            />
          ) : null}
          {booking.checkInAt ? (
            <DetailItem
              icon={<FaCheckCircle size={14} color={c.green} />}
              label={t("booking.detail.checkedIn")}
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
              label={t("booking.detail.checkedOut")}
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
              label={t("booking.detail.actualDuration")}
              value={calcDuration(booking.checkInAt, booking.checkOutAt)}
              c={c}
            />
          ) : null}
          {booking.insuranceRef ? (
            <DetailItem
              icon={<FaShieldAlt size={14} color={c.orange} />}
              label={t("booking.detail.insurance")}
              value={`${booking.insurancePlan || "Insured"} · Policy #${booking.insuranceRef}`}
              c={c}
            />
          ) : null}
          {isHirer ? (
            <>
              <DetailItem
                icon={<FaMoneyBillWave size={14} color={c.orange} />}
                label={t("booking.detail.total")}
                value={`${currency} ${Number(p.subtotal).toLocaleString()}`}
                c={c}
              />
              <DetailItem
                icon={<FaMoneyBillWave size={14} color={c.orange} />}
                label={t("payment.options.labels.platformFee", {
                  percent: feePercent,
                  defaultValue: "Platform Fee ({{percent}}%)",
                })}
                value={`${currency} ${Number(p.hirerFee).toLocaleString()}`}
                accent
                c={c}
              />
              <DetailItem
                icon={<FaMoneyBillWave size={14} color={c.orange} />}
                label={t("booking.detail.totalPayment")}
                value={`${currency} ${Number(p.grossTotal).toLocaleString()}`}
                accent
                c={c}
              />
            </>
          ) : (
            <>
              <DetailItem
                icon={<FaMoneyBillWave size={14} color={c.orange} />}
                label={t("booking.detail.totalEarnings")}
                value={`${currency} ${Number(p.subtotal).toLocaleString()}`}
                accent
                c={c}
              />
              <DetailItem
                icon={<FaMoneyBillWave size={14} color={c.orange} />}
                label={t("payment.options.labels.platformFee", {
                  percent: feePercent,
                  defaultValue: "Platform Fee ({{percent}}%)",
                })}
                value={`${currency} ${Number(p.hirerFee).toLocaleString()}`}
                c={c}
              />
              <DetailItem
                icon={<FaMoneyBillWave size={14} color={c.orange} />}
                label={t("booking.detail.yourPayout")}
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
            t={t}
          />
        ) : null}

        {booking.status === "COMPLETED" ? (
          <ReviewsSection
            reviews={booking.reviews}
            reviewCheckDone={reviewCheckDone}
            hasReviewed={hasReviewed}
            onLeaveReview={onLeaveReview}
            c={c}
            t={t}
          />
        ) : null}

        {booking.cancelReason ? (
          <CancelReason reason={booking.cancelReason} c={c} t={t} />
        ) : null}

        <BottomActions
          isCompletedOrPaid={booking.status === "COMPLETED"}
          showRefundButton={showRefundButton}
          onDownloadInvoice={onDownloadInvoice}
          onRefundClick={onShowRefundModal}
          onReleaseClick={() =>
            navigation.navigate("ReleasePayment", { bookingId })
          }
          refundLoading={refundLoading}
          invoiceLoading={invoiceLoading}
          c={c}
          t={t}
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
        <View style={{ gap: 12 }}>
          <AppText
            weight="displayBlack"
            style={{
              fontSize: 12,
              letterSpacing: -0.5,
              marginBottom: 4,
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
                fontWeight: "800",
                color: badgeColor.fg,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                fontFamily: "DMSans_700Bold",
              }}
            >
              {meta.label}
            </AppText>
          </View>
        </View>
        {booking.category ? (
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 3,
              backgroundColor: c.orangeDim,
              borderRadius: 12,
            }}
          >
            <AppText
              style={{
                fontSize: 11,
                fontWeight: "800",
                color: c.orange,
                fontFamily: "DMSans_700Bold",
              }}
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
              style={{
                fontSize: 11,
                fontWeight: "800",
                color: "#818cf8",
                fontFamily: "DMSans_700Bold",
              }}
            >
              {t("booking.detail.negotiatedRate", "Negotiated rate")}
            </AppText>
          </View>
        ) : null}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            paddingHorizontal: 10,
            paddingVertical: 3,
            backgroundColor: "rgba(129,140,248,0.1)",
            borderWidth: 1,
            borderColor: "rgba(129,140,248,0.25)",
            borderRadius: 12,
          }}
        >
          <FaUser size={10} color="#818cf8" />
          <AppText
            style={{
              fontSize: 11,
              fontWeight: "800",
              color: "#818cf8",
              fontFamily: "DMSans_700Bold",
            }}
          >
            {t("booking.detail.directBooking", "Direct Booking")}
          </AppText>
        </View>
      </View>

      {step >= 0 ? <Timeline step={step} c={c} t={t} /> : null}

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
              style={{
                fontSize: 13,
                fontWeight: "800",
                color: "#fbbf24",
                fontFamily: "DMSans_700Bold",
              }}
            >
              {t("booking.pending.waitingFor", {
                name: workerName || "the worker",
                defaultValue: "Waiting for {{name}} to respond",
              })}
            </AppText>
            <AppText
              style={{
                fontSize: 12,
                color: c.textDim,
                marginTop: 4,
                lineHeight: 18,
                fontFamily: "DMSans_400Regular",
              }}
            >
              {t("booking.pending.description", {
                name: workerName || "The worker",
                defaultValue:
                  "Your booking request has been sent. {{name}} hasn't accepted yet — you'll be notified the moment they do. You can cancel for free until they accept.",
              })}
            </AppText>
          </View>
        </View>
      ) : null}

      <Section title={t("booking.section.description")} c={c}>
        <AppText
          style={{
            fontSize: 13,
            color: c.textDim,
            lineHeight: 20,
            fontFamily: "DMSans_400Regular",
          }}
        >
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
            <AppText
              style={{
                fontSize: 13,
                color: c.textDim,
                flex: 1,
                fontFamily: "DMSans_400Regular",
              }}
            >
              {booking.notes}
            </AppText>
          </View>
        ) : null}
      </Section>

      {booking.requirements || booking.responsibilities ? (
        <Section title={t("booking.section.reqResp")} c={c}>
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
                    fontWeight: "800",
                    color: c.text,
                    marginBottom: 2,
                    fontFamily: "DMSans_700Bold",
                  }}
                >
                  {t("booking.jobPost.requirements")}
                </AppText>
                <AppText
                  style={{
                    fontSize: 13,
                    color: c.textDim,
                    fontFamily: "DMSans_400Regular",
                  }}
                >
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
                    fontWeight: "800",
                    color: c.text,
                    marginBottom: 2,
                    fontFamily: "DMSans_700Bold",
                  }}
                >
                  {t("booking.jobPost.responsibilities")}
                </AppText>
                <AppText
                  style={{
                    fontSize: 13,
                    color: c.textDim,
                    fontFamily: "DMSans_400Regular",
                  }}
                >
                  {booking.responsibilities}
                </AppText>
              </View>
            </View>
          ) : null}
        </Section>
      ) : null}

      <Section title={t("booking.section.jobDetails")} c={c}>
        <DetailItem
          icon={<FaCalendarAlt size={14} color={c.orange} />}
          label={t("booking.detail.scheduled")}
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
          <Pressable onPress={handleOpenMap}>
            <DetailItem
              icon={<FaMapMarkerAlt size={14} color={c.orange} />}
              label={t("booking.job.address")}
              value={
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <AppText
                    style={{
                      fontSize: 13,
                      fontWeight: "700",
                      color: c.text,
                      fontFamily: "DMSans_700Bold",
                    }}
                  >
                    {booking.address}
                  </AppText>
                  {showMapLink && (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginLeft: 4,
                      }}
                    >
                      <AppText
                        style={{
                          fontSize: 11,
                          fontWeight: "700",
                          color: c.orange,
                          fontFamily: "DMSans_700Bold",
                        }}
                      >
                        {t("booking.location.viewOnMaps")}
                      </AppText>
                      <FaExternalLinkAlt
                        size={10}
                        color={c.orange}
                        style={{ marginLeft: 4 }}
                      />
                    </View>
                  )}
                </View>
              }
              c={c}
            />
          </Pressable>
        ) : null}
        <DetailItem
          icon={<FaMoneyBillWave size={14} color={c.orange} />}
          label={t("payment.options.labels.agreedRate")}
          value={`${booking.currency} ${Number(booking.agreedRate).toLocaleString()}`}
          accent
          c={c}
        />
        {booking.isNegotiated && booking.negotiatedRate ? (
          <DetailItem
            icon={<FaHandshake size={14} color={c.orange} />}
            label={t("booking.detail.negotiatedRate")}
            value={`${booking.currency} ${Number(booking.negotiatedRate).toLocaleString()}`}
            accent
            c={c}
          />
        ) : null}
        {booking.isNegotiated && booking.negotiationNote ? (
          <DetailItem
            icon={<FaFileAlt size={14} color={c.orange} />}
            label={t("booking.detail.negotiationNote")}
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
              fontWeight: "600",
              color: c.textMuted,
              textTransform: "uppercase",
              letterSpacing: 0.6,
              fontFamily: "DMSans_700Bold",
            }}
          >
            {t("booking.detail.estDuration")}
          </AppText>
          {renderDuration()}
        </View>
        {booking.checkInAt ? (
          <DetailItem
            icon={<FaCheckCircle size={14} color={c.green} />}
            label={t("booking.detail.checkedIn")}
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
            label={t("booking.detail.checkedOut")}
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
            label={t("booking.detail.actualDuration")}
            value={calcDuration(booking.checkInAt, booking.checkOutAt)}
            c={c}
          />
        ) : null}
        {booking.insuranceRef ? (
          <DetailItem
            icon={<FaShieldAlt size={14} color={c.orange} />}
            label={t("booking.detail.insurance")}
            value={`${booking.insurancePlan || "Insured"} · Policy #${booking.insuranceRef}`}
            c={c}
          />
        ) : null}
        {booking.jobType ? (
          <DetailItem
            icon={<FaBriefcase size={14} color={c.orange} />}
            label={t("booking.detail.jobType")}
            value={t(JOB_TYPES[booking.jobType]?.labelKey, booking.jobType)}
            c={c}
          />
        ) : null}
        {booking.locationType ? (
          <DetailItem
            icon={<FaMapMarkerAlt size={14} color={c.orange} />}
            label={t("booking.detail.locationType")}
            value={t(
              LOC_TYPES[booking.locationType]?.labelKey,
              booking.locationType,
            )}
            c={c}
          />
        ) : null}
        {isHirer ? (
          <>
            <DetailItem
              icon={<FaMoneyBillWave size={14} color={c.orange} />}
              label={t("booking.detail.total")}
              value={`${currency} ${Number(p.subtotal).toLocaleString()}`}
              c={c}
            />
            <DetailItem
              icon={<FaMoneyBillWave size={14} color={c.orange} />}
              label={t("payment.options.labels.platformFee", {
                percent: feePercent,
                defaultValue: "Platform Fee ({{percent}}%)",
              })}
              value={`${currency} ${Number(p.hirerFee).toLocaleString()}`}
              accent
              c={c}
            />
            <DetailItem
              icon={<FaMoneyBillWave size={14} color={c.orange} />}
              label={t("booking.detail.totalPayment")}
              value={`${currency} ${Number(p.grossTotal).toLocaleString()}`}
              accent
              c={c}
            />
          </>
        ) : (
          <>
            <DetailItem
              icon={<FaMoneyBillWave size={14} color={c.orange} />}
              label={t("booking.detail.totalEarnings")}
              value={`${currency} ${Number(p.subtotal).toLocaleString()}`}
              accent
              c={c}
            />
            <DetailItem
              icon={<FaMoneyBillWave size={14} color={c.orange} />}
              label={t("payment.options.labels.platformFee", {
                percent: feePercent,
                defaultValue: "Platform Fee ({{percent}}%)",
              })}
              value={`${currency} ${Number(p.hirerFee).toLocaleString()}`}
              c={c}
            />
            <DetailItem
              icon={<FaMoneyBillWave size={14} color={c.orange} />}
              label={t("booking.detail.yourPayout")}
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
          t={t}
        />
      ) : null}

      {booking.status === "COMPLETED" ? (
        <ReviewsSection
          reviews={booking.reviews}
          reviewCheckDone={reviewCheckDone}
          hasReviewed={hasReviewed}
          onLeaveReview={onLeaveReview}
          c={c}
          t={t}
        />
      ) : null}

      {booking.cancelReason ? (
        <CancelReason reason={booking.cancelReason} c={c} t={t} />
      ) : null}

      <BottomActions
        isCompletedOrPaid={booking.status === "COMPLETED"}
        showRefundButton={showRefundButton}
        onDownloadInvoice={onDownloadInvoice}
        onRefundClick={onShowRefundModal}
        refundLoading={refundLoading}
        invoiceLoading={invoiceLoading}
        c={c}
        t={t}
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
