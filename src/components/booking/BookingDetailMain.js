// src/components/booking/BookingDetailMain.js
//
// Verbatim port of components/booking/BookingDetail/BookingDetailMain.jsx.
//
// Branches (order matters — matches web):
//   1. isRetainedStaff → payroll-specific layout
//   2. isJobPostBooking → job-post-specific layout
//   3. otherwise → direct booking layout
//
// Everything inside is mobile-native (View/Pressable/TextInput) — no
// react-router-dom, no CSS modules, no react-icons.

import React, { useState } from "react";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";

import AppText from "../AppText";
import { useTheme } from "../../contexts/ThemeContext";
import { calcPricing, getHirerFeeRate } from "../../utils/pricing";
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
  FaExternalLinkAlt,
  FaCheck,
  FaExclamationTriangle,
  FaMap,
  FaUndo,
  FaUser,
  FaBuilding,
  FaPlusCircle,
  FaMinusCircle,
} from "../../icons/fa";

import BookingReleaseDetails from "./BookingReleaseDetails";

// ── Inline helpers ─────────────────────────────────────────────────────
function DetailItem({ icon, label, value, accent }) {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <View
      style={[
        styles.detailItem,
        { backgroundColor: c.bgCard, borderColor: c.border },
      ]}
    >
      <View style={{ marginTop: 2 }}>{icon}</View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText style={[styles.detailLabel, { color: c.textMuted }]}>
          {label}
        </AppText>
        <AppText
          style={[styles.detailValue, { color: accent ? c.orange : c.text }]}
        >
          {value}
        </AppText>
      </View>
    </View>
  );
}

function GpsCard({ title, dotColor, timestamp, lat, lng, distKm, cardClass }) {
  const { theme } = useTheme();
  const c = theme.colors;

  const getDistanceIcon = () => {
    if (distKm < 0.1) return <FaCheckCircle size={12} color={c.green} />;
    if (distKm > 1) return <FaExclamationTriangle size={12} color={c.orange} />;
    return <FaMap size={12} color="#3b82f6" />;
  };

  return (
    <View style={[styles.gpsCard, cardClass]}>
      <View style={styles.gpsCardHeader}>
        <View style={[styles.gpsCardDot, { backgroundColor: dotColor }]} />
        <AppText style={styles.gpsCardTitle}>{title}</AppText>
        {timestamp && (
          <AppText style={styles.gpsCardTime}>
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
        )}
      </View>
      <View style={styles.gpsCoordRow}>
        <AppText style={styles.gpsCoordLabel}>Coordinates</AppText>
        <AppText style={styles.gpsCoordValue}>
          {lat.toFixed(5)}, {lng.toFixed(5)}
        </AppText>
      </View>
      {distKm !== null && (
        <View
          style={[
            styles.gpsDistRow,
            distKm > 1 ? styles.gpsDistFar : styles.gpsDistNear,
          ]}
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
      )}
      <Pressable
        onPress={() =>
          Linking.openURL(`https://www.google.com/maps?q=${lat},${lng}`)
        }
        style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
      >
        <FaMap size={11} color="#2563eb" />
        <AppText style={styles.gpsMapLink}>View on Google Maps</AppText>
      </Pressable>
    </View>
  );
}

// ── Main component ─────────────────────────────────────────────────────
export default function BookingDetailMain({
  booking,
  step,
  dur,
  mapsUrl,
  hasCheckInGps,
  hasCheckOutGps,
  checkInDistKm,
  checkOutDistKm,
  reviewCheckDone,
  hasReviewed,
  bookingId,
  onDownloadInvoice,
  isHirer,
  payment,
  paymentStatus,
  isWorker,
  workerName,
  onShowRefundModal,
  refundLoading,
  hasActiveRefund,
}) {
  const { theme } = useTheme();
  const c = theme.colors;

  const STATUS_META = {
    PENDING: { label: "Pending", color: "yellow" },
    ACCEPTED: { label: "Accepted", color: "orange" },
    IN_PROGRESS: { label: "In Progress", color: "indigo" },
    COMPLETED: { label: "Completed", color: "green" },
    PAID: { label: "Paid", color: "green" },
    CANCELLED: { label: "Cancelled", color: "red" },
    DISPUTED: { label: "Disputed", color: "rose" },
  };
  const meta = STATUS_META[booking.status] || {};
  const badgeColor = badgePalette(meta.color, c);

  const TIMELINE_STEPS = ["Pending", "Accepted", "In Progress", "Completed"];

  const JOB_TYPES = {
    FULL_TIME: {
      icon: <FaBriefcase size={14} color={c.orange} />,
      label: "Full-time",
    },
    PART_TIME: {
      icon: <FaClock size={14} color={c.orange} />,
      label: "Part-time",
    },
    CONTRACT: {
      icon: <FaFileAlt size={14} color={c.orange} />,
      label: "Contract",
    },
    TEMPORARY: {
      icon: <FaFlag size={14} color={c.orange} />,
      label: "Temporary",
    },
  };
  const LOC_TYPES = {
    REMOTE: { icon: <FaGlobe size={14} color={c.orange} />, label: "Remote" },
    ON_SITE: {
      icon: <FaMapPin size={14} color={c.orange} />,
      label: "On-site",
    },
    HYBRID: { icon: <FaRandom size={14} color={c.orange} />, label: "Hybrid" },
  };

  const showMapLink =
    booking.latitude && booking.longitude && booking.locationType !== "REMOTE";

  const isJobPostBooking = booking.source === "JOB_POST";
  const isRetainedStaff = booking.source === "RETAINED_STAFF";
  const isCompletedOrPaid = ["COMPLETED", "PAID"].includes(booking.status);

  const renderDuration = () => {
    if (!dur) {
      if (booking.estimatedHours || booking.estimatedValue) {
        // Parent already rendered its skeleton above us; by the time we render,
        // dur must be populated. Show a quiet fallback in the rare race case.
        return <AppText style={{ color: c.textMuted }}>—</AppText>;
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
        style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center" }}
      >
        <AppText style={{ fontWeight: "600" }}>{dur.main}</AppText>
        {dur.sub ? (
          <AppText style={{ color: c.textMuted, fontSize: 12 }}>
            {" "}
            {dur.sub}
          </AppText>
        ) : null}
        {unitLabel ? (
          <AppText style={{ color: c.textMuted, fontSize: 11, marginLeft: 4 }}>
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

  const showRefundButton =
    isHirer &&
    paymentStatus === "RELEASED" &&
    !refundLoading &&
    !hasActiveRefund &&
    !isRetainedStaff;

  // ══════════════════════════════════════════════════════════════════════
  // RETAINED STAFF BRANCH
  // ══════════════════════════════════════════════════════════════════════
  if (isRetainedStaff) {
    return (
      <View style={{ gap: 10 }}>
        <BookingReleaseDetails payment={payment} currency={booking.currency} />

        {/* Title block */}
        <View
          style={[
            styles.titleBlock,
            { backgroundColor: c.bgPanel, borderColor: c.border },
          ]}
        >
          <View style={styles.titleRow}>
            <AppText
              style={[styles.title, { color: c.text }]}
              numberOfLines={3}
            >
              {booking.title}
            </AppText>
            <View
              style={[
                styles.badge,
                { backgroundColor: badgeColor.bg, borderColor: badgeColor.fg },
              ]}
            >
              <AppText
                style={{
                  fontSize: 10,
                  fontWeight: "700",
                  color: badgeColor.fg,
                  letterSpacing: 0.5,
                }}
              >
                {String(meta.label || "").toUpperCase()}
              </AppText>
            </View>
          </View>
          {booking.category && (
            <View
              style={[styles.categoryPill, { backgroundColor: c.orangeDim }]}
            >
              <AppText
                style={{ fontSize: 11, fontWeight: "700", color: c.orange }}
              >
                {booking.category.name}
              </AppText>
            </View>
          )}
          <View
            style={[
              styles.categoryPill,
              {
                backgroundColor: "rgba(129,140,248,0.1)",
                borderColor: "rgba(129,140,248,0.25)",
                borderWidth: 1,
                marginTop: 6,
              },
            ]}
          >
            <FaBriefcase size={10} color="#818cf8" />
            <AppText
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: "#818cf8",
                marginLeft: 4,
              }}
            >
              Retained Staff Payroll
            </AppText>
          </View>
        </View>

        {/* Retained staff details */}
        <View
          style={[
            styles.section,
            { backgroundColor: c.bgPanel, borderColor: c.border },
          ]}
        >
          <AppText style={[styles.sectionTitle, { color: c.textDim }]}>
            Retained Staff Details
          </AppText>
          <View style={{ gap: 8 }}>
            <DetailItem
              icon={<FaCalendarAlt size={14} color={c.orange} />}
              label="Pay Period"
              value={new Date(booking.scheduledAt).toLocaleDateString("en-GB", {
                month: "short",
                year: "numeric",
              })}
            />
            <DetailItem
              icon={<FaMoneyBillWave size={14} color={c.orange} />}
              label="Base Rate"
              value={`${booking.currency} ${Number(booking.agreedRate).toLocaleString()}`}
              accent
            />
            <DetailItem
              icon={<FaFileAlt size={14} color={c.orange} />}
              label="Role"
              value={booking.description || "Standard Retained Role"}
            />
            {booking.jobType && (
              <DetailItem
                icon={
                  JOB_TYPES[booking.jobType]?.icon || (
                    <FaBriefcase size={14} color={c.orange} />
                  )
                }
                label="Job Type"
                value={JOB_TYPES[booking.jobType]?.label || booking.jobType}
              />
            )}
            {booking.employmentType && (
              <DetailItem
                icon={<FaBriefcase size={14} color={c.orange} />}
                label="Employment Type"
                value={String(booking.employmentType).replace(/_/g, " ")}
              />
            )}
            {booking.department && (
              <DetailItem
                icon={<FaBuilding size={14} color={c.orange} />}
                label="Department"
                value={booking.department}
              />
            )}
            {booking.locationType && (
              <DetailItem
                icon={
                  LOC_TYPES[booking.locationType]?.icon || (
                    <FaMapPin size={14} color={c.orange} />
                  )
                }
                label="Location Type"
                value={
                  LOC_TYPES[booking.locationType]?.label || booking.locationType
                }
              />
            )}
            {booking.location && booking.locationType !== "REMOTE" && (
              <DetailItem
                icon={<FaMapMarkerAlt size={14} color={c.orange} />}
                label="Work Location"
                value={booking.location}
              />
            )}
            {booking.workDays?.length > 0 && (
              <DetailItem
                icon={<FaCalendarAlt size={14} color={c.orange} />}
                label="Work Days"
                value={booking.workDays.join(", ")}
              />
            )}
            {booking.workStart && booking.workEnd && (
              <DetailItem
                icon={<FaClock size={14} color={c.orange} />}
                label="Working Hours"
                value={`${booking.workStart} — ${booking.workEnd}${booking.timezone ? ` (${booking.timezone})` : ""}`}
              />
            )}
            {booking.employeeNumber && (
              <DetailItem
                icon={<FaBriefcase size={14} color={c.orange} />}
                label="Employee #"
                value={booking.employeeNumber}
              />
            )}
            {booking.managerName && (
              <DetailItem
                icon={<FaUser size={14} color={c.orange} />}
                label="Manager"
                value={booking.managerName}
              />
            )}
            {booking.emergencyContact && (
              <DetailItem
                icon={<FaExclamationTriangle size={14} color={c.orange} />}
                label="Emergency Contact"
                value={booking.emergencyContact}
              />
            )}
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
            />

            {(() => {
              const p = calcPricing(booking);
              const currency = p.currency || booking.currency || "NGN";
              const feePercent = Math.round(getHirerFeeRate(currency) * 100);
              return isHirer ? (
                <>
                  <DetailItem
                    icon={<FaMoneyBillWave size={14} color={c.orange} />}
                    label="Base Amount"
                    value={`${currency} ${Number(p.subtotal).toLocaleString()}`}
                  />
                  {booking.bonusAmount > 0 && (
                    <DetailItem
                      icon={<FaPlusCircle size={14} color={c.green} />}
                      label="Bonus"
                      value={`+ ${currency} ${Number(booking.bonusAmount).toLocaleString()}`}
                    />
                  )}
                  {booking.deductionAmount > 0 && (
                    <DetailItem
                      icon={<FaMinusCircle size={14} color="#f87171" />}
                      label="Deduction"
                      value={`- ${currency} ${Number(booking.deductionAmount).toLocaleString()}`}
                    />
                  )}
                  <DetailItem
                    icon={<FaMoneyBillWave size={14} color={c.orange} />}
                    label={`Platform Fee (${feePercent}%)`}
                    value={`${currency} ${Number(p.hirerFee).toLocaleString()}`}
                    accent
                  />
                  <DetailItem
                    icon={<FaMoneyBillWave size={14} color={c.orange} />}
                    label="Total Payment"
                    value={`${currency} ${Number(p.grossTotal).toLocaleString()}`}
                    accent
                  />
                </>
              ) : (
                <>
                  <DetailItem
                    icon={<FaMoneyBillWave size={14} color={c.orange} />}
                    label="Base Amount"
                    value={`${currency} ${Number(p.subtotal).toLocaleString()}`}
                  />
                  {booking.bonusAmount > 0 && (
                    <DetailItem
                      icon={<FaPlusCircle size={14} color={c.green} />}
                      label="Bonus"
                      value={`+ ${currency} ${Number(booking.bonusAmount).toLocaleString()}`}
                    />
                  )}
                  {booking.deductionAmount > 0 && (
                    <DetailItem
                      icon={<FaMinusCircle size={14} color="#f87171" />}
                      label="Deduction"
                      value={`- ${currency} ${Number(booking.deductionAmount).toLocaleString()}`}
                    />
                  )}
                  <DetailItem
                    icon={<FaMoneyBillWave size={14} color={c.orange} />}
                    label={`Platform Fee (${feePercent}%)`}
                    value={`${currency} ${Number(p.hirerFee).toLocaleString()}`}
                  />
                  <DetailItem
                    icon={<FaMoneyBillWave size={14} color={c.orange} />}
                    label="Your Payout"
                    value={`${currency} ${Number(p.workerPayout).toLocaleString()}`}
                    accent
                  />
                </>
              );
            })()}
          </View>
        </View>

        {/* Description */}
        <View
          style={[
            styles.section,
            { backgroundColor: c.bgPanel, borderColor: c.border },
          ]}
        >
          <AppText style={[styles.sectionTitle, { color: c.textDim }]}>
            Description
          </AppText>
          <AppText style={{ color: c.textDim, lineHeight: 20 }}>
            {booking.description || "No additional description provided."}
          </AppText>
          {booking.notes ? (
            <View
              style={[
                styles.notes,
                { backgroundColor: c.bgCard, borderColor: c.border },
              ]}
            >
              <FaFileAlt size={13} color={c.textMuted} />
              <AppText style={{ color: c.textDim, flex: 1, marginLeft: 8 }}>
                {booking.notes}
              </AppText>
            </View>
          ) : null}
        </View>

        {/* Reviews */}
        {isCompletedOrPaid && (
          <View
            style={[
              styles.section,
              { backgroundColor: c.bgPanel, borderColor: c.border },
            ]}
          >
            <AppText style={[styles.sectionTitle, { color: c.textDim }]}>
              Reviews
            </AppText>
            <ReviewList
              reviews={booking.reviews}
              reviewCheckDone={reviewCheckDone}
              hasReviewed={hasReviewed}
              bookingId={bookingId}
            />
          </View>
        )}

        {/* Bottom actions */}
        {isCompletedOrPaid && (
          <View style={[styles.bottomActions, { borderTopColor: c.border }]}>
            <Pressable
              onPress={onDownloadInvoice}
              style={[
                styles.invoiceBtn,
                { backgroundColor: c.bgCard, borderColor: c.border },
              ]}
            >
              <FaFileAlt size={12} color={c.textDim} />
              <AppText
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: c.textDim,
                  marginLeft: 6,
                }}
              >
                Download Invoice
              </AppText>
            </Pressable>
          </View>
        )}
      </View>
    );
  }

  // ══════════════════════════════════════════════════════════════════════
  // JOB-POST BRANCH
  // ══════════════════════════════════════════════════════════════════════
  if (isJobPostBooking) {
    return (
      <View style={{ gap: 10 }}>
        <BookingReleaseDetails payment={payment} currency={booking.currency} />

        {/* Title block */}
        <View
          style={[
            styles.titleBlock,
            { backgroundColor: c.bgPanel, borderColor: c.border },
          ]}
        >
          <View style={styles.titleRow}>
            <AppText
              style={[styles.title, { color: c.text }]}
              numberOfLines={3}
            >
              {booking.title}
            </AppText>
            <View
              style={[
                styles.badge,
                { backgroundColor: badgeColor.bg, borderColor: badgeColor.fg },
              ]}
            >
              <AppText
                style={{
                  fontSize: 10,
                  fontWeight: "700",
                  color: badgeColor.fg,
                  letterSpacing: 0.5,
                }}
              >
                {String(meta.label || "").toUpperCase()}
              </AppText>
            </View>
          </View>
          {booking.category && (
            <View
              style={[styles.categoryPill, { backgroundColor: c.orangeDim }]}
            >
              <AppText
                style={{ fontSize: 11, fontWeight: "700", color: c.orange }}
              >
                {booking.category.name}
              </AppText>
            </View>
          )}
          {booking.isNegotiated && (
            <View
              style={[
                styles.categoryPill,
                {
                  backgroundColor: "rgba(129,140,248,0.1)",
                  borderColor: "rgba(129,140,248,0.25)",
                  borderWidth: 1,
                  marginTop: 6,
                },
              ]}
            >
              <FaHandshake size={10} color="#818cf8" />
              <AppText
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  color: "#818cf8",
                  marginLeft: 4,
                }}
              >
                Negotiated rate
              </AppText>
            </View>
          )}
          <View
            style={[
              styles.categoryPill,
              {
                backgroundColor: "rgba(129,140,248,0.1)",
                borderColor: "rgba(129,140,248,0.25)",
                borderWidth: 1,
                marginTop: 6,
              },
            ]}
          >
            <FaBriefcase size={10} color="#818cf8" />
            <AppText
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: "#818cf8",
                marginLeft: 4,
              }}
            >
              From Job Post
            </AppText>
          </View>
        </View>

        {/* Timeline */}
        {step >= 0 && <Timeline step={step} steps={TIMELINE_STEPS} />}

        {/* Pending banner */}
        {booking.status === "PENDING" && isHirer && (
          <View
            style={[
              styles.pendingBanner,
              {
                backgroundColor: "rgba(251,191,36,0.07)",
                borderColor: "rgba(251,191,36,0.35)",
              },
            ]}
          >
            <View style={{ marginTop: 2 }}>
              <FaHourglassHalf size={16} color="#fbbf24" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <AppText style={{ fontWeight: "700", color: "#fbbf24" }}>
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
        )}

        {/* Booking details */}
        <View
          style={[
            styles.section,
            { backgroundColor: c.bgPanel, borderColor: c.border },
          ]}
        >
          <AppText style={[styles.sectionTitle, { color: c.textDim }]}>
            Booking Details
          </AppText>
          <View style={{ gap: 8 }}>
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
            />
            {booking.address && showMapLink && (
              <DetailItem
                icon={<FaMapMarkerAlt size={14} color={c.orange} />}
                label="Job Site Address"
                value={booking.address}
              />
            )}
            <DetailItem
              icon={<FaMoneyBillWave size={14} color={c.orange} />}
              label="Agreed Total"
              value={`${booking.currency} ${Number(booking.agreedRate).toLocaleString()}`}
              accent
            />
            {booking.isNegotiated && booking.negotiatedRate && (
              <DetailItem
                icon={<FaHandshake size={14} color={c.orange} />}
                label="Negotiated Override"
                value={`${booking.currency} ${Number(booking.negotiatedRate).toLocaleString()}`}
                accent
              />
            )}
            {booking.isNegotiated && booking.negotiationNote && (
              <DetailItem
                icon={<FaFileAlt size={14} color={c.orange} />}
                label="Negotiation Note"
                value={booking.negotiationNote}
              />
            )}
            {booking.checkInAt && (
              <DetailItem
                icon={<FaCheckCircle size={14} color={c.green} />}
                label="Checked In"
                value={new Date(booking.checkInAt).toLocaleString("en-NG", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              />
            )}
            {booking.checkOutAt && (
              <DetailItem
                icon={<FaFlag size={14} color={c.orange} />}
                label="Checked Out"
                value={new Date(booking.checkOutAt).toLocaleString("en-NG", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              />
            )}
            {booking.insuranceRef && (
              <DetailItem
                icon={<FaShieldAlt size={14} color={c.orange} />}
                label="Insurance"
                value={`${booking.insurancePlan || "Insured"} · Policy #${booking.insuranceRef}`}
              />
            )}

            {(() => {
              const p = calcPricing(booking);
              const currency = p.currency || booking.currency || "NGN";
              const feePercent = Math.round(getHirerFeeRate(currency) * 100);
              return isHirer ? (
                <>
                  <DetailItem
                    icon={<FaMoneyBillWave size={14} color={c.orange} />}
                    label="Subtotal"
                    value={`${currency} ${Number(p.subtotal).toLocaleString()}`}
                  />
                  <DetailItem
                    icon={<FaMoneyBillWave size={14} color={c.orange} />}
                    label={`Platform Fee (${feePercent}%)`}
                    value={`${currency} ${Number(p.hirerFee).toLocaleString()}`}
                    accent
                  />
                  <DetailItem
                    icon={<FaMoneyBillWave size={14} color={c.orange} />}
                    label="Total Payment"
                    value={`${currency} ${Number(p.grossTotal).toLocaleString()}`}
                    accent
                  />
                </>
              ) : (
                <>
                  <DetailItem
                    icon={<FaMoneyBillWave size={14} color={c.orange} />}
                    label="Total Earnings"
                    value={`${currency} ${Number(p.subtotal).toLocaleString()}`}
                    accent
                  />
                  <DetailItem
                    icon={<FaMoneyBillWave size={14} color={c.orange} />}
                    label={`Platform Fee (${feePercent}%)`}
                    value={`${currency} ${Number(p.hirerFee).toLocaleString()}`}
                  />
                  <DetailItem
                    icon={<FaMoneyBillWave size={14} color={c.orange} />}
                    label="Your Payout"
                    value={`${currency} ${Number(p.workerPayout).toLocaleString()}`}
                    accent
                  />
                </>
              );
            })()}
          </View>
        </View>

        {/* GPS */}
        {(hasCheckInGps || hasCheckOutGps) && (
          <GpsSection
            hasCheckInGps={hasCheckInGps}
            hasCheckOutGps={hasCheckOutGps}
            booking={booking}
            checkInDistKm={checkInDistKm}
            checkOutDistKm={checkOutDistKm}
          />
        )}

        {/* Reviews */}
        {booking.status === "COMPLETED" && (
          <View
            style={[
              styles.section,
              { backgroundColor: c.bgPanel, borderColor: c.border },
            ]}
          >
            <AppText style={[styles.sectionTitle, { color: c.textDim }]}>
              Reviews
            </AppText>
            <ReviewList
              reviews={booking.reviews}
              reviewCheckDone={reviewCheckDone}
              hasReviewed={hasReviewed}
              bookingId={bookingId}
            />
          </View>
        )}

        {/* Cancel reason */}
        {booking.cancelReason ? (
          <CancelReason reason={booking.cancelReason} />
        ) : null}

        {/* Bottom actions */}
        {booking.status === "COMPLETED" && (
          <View style={[styles.bottomActions, { borderTopColor: c.border }]}>
            <Pressable
              onPress={onDownloadInvoice}
              style={[
                styles.invoiceBtn,
                { backgroundColor: c.bgCard, borderColor: c.border },
              ]}
            >
              <FaFileAlt size={12} color={c.textDim} />
              <AppText
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: c.textDim,
                  marginLeft: 6,
                }}
              >
                Download Invoice
              </AppText>
            </Pressable>
            {showRefundButton && (
              <Pressable
                onPress={onShowRefundModal}
                disabled={refundLoading}
                style={[
                  styles.refundBtn,
                  { backgroundColor: c.redDim, borderColor: c.red },
                ]}
              >
                <FaUndo size={12} color={c.red} />
                <AppText
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: c.red,
                    marginLeft: 6,
                  }}
                >
                  Request Refund
                </AppText>
              </Pressable>
            )}
          </View>
        )}
      </View>
    );
  }

  // ══════════════════════════════════════════════════════════════════════
  // DIRECT BOOKING BRANCH
  // ══════════════════════════════════════════════════════════════════════
  return (
    <View style={{ gap: 10 }}>
      <BookingReleaseDetails payment={payment} currency={booking.currency} />

      {/* Title block */}
      <View
        style={[
          styles.titleBlock,
          { backgroundColor: c.bgPanel, borderColor: c.border },
        ]}
      >
        <View style={styles.titleRow}>
          <AppText style={[styles.title, { color: c.text }]} numberOfLines={3}>
            {booking.title}
          </AppText>
          <View
            style={[
              styles.badge,
              { backgroundColor: badgeColor.bg, borderColor: badgeColor.fg },
            ]}
          >
            <AppText
              style={{
                fontSize: 10,
                fontWeight: "700",
                color: badgeColor.fg,
                letterSpacing: 0.5,
              }}
            >
              {String(meta.label || "").toUpperCase()}
            </AppText>
          </View>
        </View>
        {booking.category && (
          <View style={[styles.categoryPill, { backgroundColor: c.orangeDim }]}>
            <AppText
              style={{ fontSize: 11, fontWeight: "700", color: c.orange }}
            >
              {booking.category.name}
            </AppText>
          </View>
        )}
        {booking.isNegotiated && (
          <View
            style={[
              styles.categoryPill,
              {
                backgroundColor: "rgba(129,140,248,0.1)",
                borderColor: "rgba(129,140,248,0.25)",
                borderWidth: 1,
                marginTop: 6,
              },
            ]}
          >
            <FaHandshake size={10} color="#818cf8" />
            <AppText
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: "#818cf8",
                marginLeft: 4,
              }}
            >
              Negotiated rate
            </AppText>
          </View>
        )}
      </View>

      {/* Timeline */}
      {step >= 0 && <Timeline step={step} steps={TIMELINE_STEPS} />}

      {/* Pending banner */}
      {booking.status === "PENDING" && isHirer && (
        <View
          style={[
            styles.pendingBanner,
            {
              backgroundColor: "rgba(251,191,36,0.07)",
              borderColor: "rgba(251,191,36,0.35)",
            },
          ]}
        >
          <View style={{ marginTop: 2 }}>
            <FaHourglassHalf size={16} color="#fbbf24" />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <AppText style={{ fontWeight: "700", color: "#fbbf24" }}>
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
      )}

      {/* Description */}
      <View
        style={[
          styles.section,
          { backgroundColor: c.bgPanel, borderColor: c.border },
        ]}
      >
        <AppText style={[styles.sectionTitle, { color: c.textDim }]}>
          Description
        </AppText>
        <AppText style={{ color: c.textDim, lineHeight: 20 }}>
          {booking.description}
        </AppText>
        {booking.notes ? (
          <View
            style={[
              styles.notes,
              { backgroundColor: c.bgCard, borderColor: c.border },
            ]}
          >
            <FaFileAlt size={13} color={c.textMuted} />
            <AppText style={{ color: c.textDim, flex: 1, marginLeft: 8 }}>
              {booking.notes}
            </AppText>
          </View>
        ) : null}
      </View>

      {/* Requirements & Responsibilities */}
      {(booking.requirements || booking.responsibilities) && (
        <View
          style={[
            styles.section,
            { backgroundColor: c.bgPanel, borderColor: c.border },
          ]}
        >
          <AppText style={[styles.sectionTitle, { color: c.textDim }]}>
            Requirements & Responsibilities
          </AppText>
          {booking.requirements ? (
            <View
              style={[
                styles.notes,
                {
                  backgroundColor: c.bgCard,
                  borderColor: c.border,
                  marginBottom: 8,
                },
              ]}
            >
              <FaFileAlt size={13} color={c.textMuted} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <AppText style={{ fontWeight: "600", color: c.text }}>
                  Requirements
                </AppText>
                <AppText style={{ color: c.textDim, marginTop: 2 }}>
                  {booking.requirements}
                </AppText>
              </View>
            </View>
          ) : null}
          {booking.responsibilities ? (
            <View
              style={[
                styles.notes,
                { backgroundColor: c.bgCard, borderColor: c.border },
              ]}
            >
              <FaTools size={13} color={c.textMuted} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <AppText style={{ fontWeight: "600", color: c.text }}>
                  Responsibilities
                </AppText>
                <AppText style={{ color: c.textDim, marginTop: 2 }}>
                  {booking.responsibilities}
                </AppText>
              </View>
            </View>
          ) : null}
        </View>
      )}

      {/* Job details grid */}
      <View
        style={[
          styles.section,
          { backgroundColor: c.bgPanel, borderColor: c.border },
        ]}
      >
        <AppText style={[styles.sectionTitle, { color: c.textDim }]}>
          Job Details
        </AppText>
        <View style={{ gap: 8 }}>
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
          />
          {booking.address && booking.locationType !== "REMOTE" && (
            <DetailItem
              icon={<FaMapMarkerAlt size={14} color={c.orange} />}
              label="Job Site Address"
              value={booking.address}
            />
          )}
          <DetailItem
            icon={<FaMoneyBillWave size={14} color={c.orange} />}
            label="Agreed Rate"
            value={`${booking.currency} ${Number(booking.agreedRate).toLocaleString()}`}
            accent
          />
          {booking.isNegotiated && booking.negotiatedRate && (
            <DetailItem
              icon={<FaHandshake size={14} color={c.orange} />}
              label="Negotiated Rate"
              value={`${booking.currency} ${Number(booking.negotiatedRate).toLocaleString()}`}
              accent
            />
          )}
          {booking.isNegotiated && booking.negotiationNote && (
            <DetailItem
              icon={<FaFileAlt size={14} color={c.orange} />}
              label="Negotiation Note"
              value={booking.negotiationNote}
            />
          )}
          <View>
            <AppText style={[styles.detailLabel, { color: c.textMuted }]}>
              EST. DURATION
            </AppText>
            {renderDuration()}
          </View>
          {booking.checkInAt && (
            <DetailItem
              icon={<FaCheckCircle size={14} color={c.green} />}
              label="Checked In"
              value={new Date(booking.checkInAt).toLocaleString("en-NG", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            />
          )}
          {booking.checkOutAt && (
            <DetailItem
              icon={<FaFlag size={14} color={c.orange} />}
              label="Checked Out"
              value={new Date(booking.checkOutAt).toLocaleString("en-NG", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            />
          )}
          {booking.checkInAt && booking.checkOutAt && (
            <DetailItem
              icon={<FaClock size={14} color={c.orange} />}
              label="Actual Duration"
              value={calcDuration(booking.checkInAt, booking.checkOutAt)}
            />
          )}
          {booking.insuranceRef && (
            <DetailItem
              icon={<FaShieldAlt size={14} color={c.orange} />}
              label="Insurance"
              value={`${booking.insurancePlan || "Insured"} · Policy #${booking.insuranceRef}`}
            />
          )}
          {booking.jobType && (
            <DetailItem
              icon={
                JOB_TYPES[booking.jobType]?.icon || (
                  <FaBriefcase size={14} color={c.orange} />
                )
              }
              label="Job Type"
              value={JOB_TYPES[booking.jobType]?.label || booking.jobType}
            />
          )}
          {booking.locationType && (
            <DetailItem
              icon={
                LOC_TYPES[booking.locationType]?.icon || (
                  <FaMapMarkerAlt size={14} color={c.orange} />
                )
              }
              label="Location Type"
              value={
                LOC_TYPES[booking.locationType]?.label || booking.locationType
              }
            />
          )}

          {(() => {
            const p = calcPricing(booking);
            const currency = p.currency || booking.currency || "NGN";
            const feePercent = Math.round(getHirerFeeRate(currency) * 100);
            return isHirer ? (
              <>
                <DetailItem
                  icon={<FaMoneyBillWave size={14} color={c.orange} />}
                  label="Subtotal"
                  value={`${currency} ${Number(p.subtotal).toLocaleString()}`}
                />
                <DetailItem
                  icon={<FaMoneyBillWave size={14} color={c.orange} />}
                  label={`Platform Fee (${feePercent}%)`}
                  value={`${currency} ${Number(p.hirerFee).toLocaleString()}`}
                  accent
                />
                <DetailItem
                  icon={<FaMoneyBillWave size={14} color={c.orange} />}
                  label="Total Payment"
                  value={`${currency} ${Number(p.grossTotal).toLocaleString()}`}
                  accent
                />
              </>
            ) : (
              <>
                <DetailItem
                  icon={<FaMoneyBillWave size={14} color={c.orange} />}
                  label="Total Earnings"
                  value={`${currency} ${Number(p.subtotal).toLocaleString()}`}
                  accent
                />
                <DetailItem
                  icon={<FaMoneyBillWave size={14} color={c.orange} />}
                  label={`Platform Fee (${feePercent}%)`}
                  value={`${currency} ${Number(p.hirerFee).toLocaleString()}`}
                />
                <DetailItem
                  icon={<FaMoneyBillWave size={14} color={c.orange} />}
                  label="Your Payout"
                  value={`${currency} ${Number(p.workerPayout).toLocaleString()}`}
                  accent
                />
              </>
            );
          })()}
        </View>
      </View>

      {/* GPS */}
      {(hasCheckInGps || hasCheckOutGps) && (
        <GpsSection
          hasCheckInGps={hasCheckInGps}
          hasCheckOutGps={hasCheckOutGps}
          booking={booking}
          checkInDistKm={checkInDistKm}
          checkOutDistKm={checkOutDistKm}
        />
      )}

      {/* Reviews */}
      {booking.status === "COMPLETED" && (
        <View
          style={[
            styles.section,
            { backgroundColor: c.bgPanel, borderColor: c.border },
          ]}
        >
          <AppText style={[styles.sectionTitle, { color: c.textDim }]}>
            Reviews
          </AppText>
          <ReviewList
            reviews={booking.reviews}
            reviewCheckDone={reviewCheckDone}
            hasReviewed={hasReviewed}
            bookingId={bookingId}
          />
        </View>
      )}

      {/* Cancel reason */}
      {booking.cancelReason ? (
        <CancelReason reason={booking.cancelReason} />
      ) : null}

      {/* Bottom actions */}
      {booking.status === "COMPLETED" && (
        <View style={[styles.bottomActions, { borderTopColor: c.border }]}>
          <Pressable
            onPress={onDownloadInvoice}
            style={[
              styles.invoiceBtn,
              { backgroundColor: c.bgCard, borderColor: c.border },
            ]}
          >
            <FaFileAlt size={12} color={c.textDim} />
            <AppText
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: c.textDim,
                marginLeft: 6,
              }}
            >
              Download Invoice
            </AppText>
          </Pressable>
          {showRefundButton && (
            <Pressable
              onPress={onShowRefundModal}
              disabled={refundLoading}
              style={[
                styles.refundBtn,
                { backgroundColor: c.redDim, borderColor: c.red },
              ]}
            >
              <FaUndo size={12} color={c.red} />
              <AppText
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: c.red,
                  marginLeft: 6,
                }}
              >
                Request Refund
              </AppText>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Reusable sub-parts ────────────────────────────────────────────────
function badgePalette(color, c) {
  switch (color) {
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

function Timeline({ step, steps }) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <View
      style={[
        styles.timelineWrap,
        { backgroundColor: c.bgPanel, borderColor: c.border },
      ]}
    >
      <View style={styles.timeline}>
        {steps.map((s, i) => {
          const active = i <= step;
          const current = i === step;
          return (
            <View key={s} style={{ alignItems: "center", flex: 1 }}>
              <View
                style={[
                  styles.timelineDot,
                  {
                    backgroundColor: current
                      ? c.orange
                      : active
                        ? c.orangeDim
                        : c.bgCard,
                    borderColor: active ? c.orange : c.border,
                  },
                ]}
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
                  fontSize: 10,
                  fontWeight: "600",
                  color: active ? c.text : c.textMuted,
                  marginTop: 6,
                  textAlign: "center",
                }}
              >
                {s}
              </AppText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function GpsSection({
  hasCheckInGps,
  hasCheckOutGps,
  booking,
  checkInDistKm,
  checkOutDistKm,
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <View
      style={[
        styles.section,
        { backgroundColor: c.bgPanel, borderColor: c.border },
      ]}
    >
      <AppText style={[styles.sectionTitle, { color: c.textDim }]}>
        Worker Location
      </AppText>
      <AppText style={{ fontSize: 12, color: c.textMuted, marginBottom: 12 }}>
        GPS recorded at check-in and check-out. Visible to both parties.
      </AppText>
      <View style={{ gap: 10 }}>
        {hasCheckInGps && (
          <GpsCard
            title="Check-in Location"
            dotColor="#16a34a"
            timestamp={booking.checkInAt}
            lat={booking.checkInLat}
            lng={booking.checkInLng}
            distKm={checkInDistKm}
            cardClass={styles.gpsCardIn}
          />
        )}
        {hasCheckOutGps && (
          <GpsCard
            title="Check-out Location"
            dotColor="#dc2626"
            timestamp={booking.checkOutAt}
            lat={booking.checkOutLat}
            lng={booking.checkOutLng}
            distKm={checkOutDistKm}
            cardClass={styles.gpsCardOut}
          />
        )}
      </View>
    </View>
  );
}

function ReviewList({ reviews, reviewCheckDone, hasReviewed }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const list = reviews || [];
  return (
    <>
      {list.length > 0 && (
        <View style={{ gap: 12 }}>
          {list.map((review) => (
            <View key={review.id} style={{ gap: 6 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: 10,
                }}
              >
                <View
                  style={[
                    styles.reviewerAvatar,
                    { backgroundColor: c.orangeDim },
                  ]}
                >
                  <AppText style={{ color: c.orange, fontWeight: "700" }}>
                    {review.giver?.firstName?.[0]}
                    {review.giver?.lastName?.[0]}
                  </AppText>
                </View>
                <View style={{ flex: 1 }}>
                  <AppText style={{ fontWeight: "600", color: c.text }}>
                    {review.giver?.firstName} {review.giver?.lastName}{" "}
                    <AppText style={{ color: c.textDim, fontWeight: "400" }}>
                      · {review.giver?.role === "HIRER" ? "Hirer" : "Worker"}
                    </AppText>
                  </AppText>
                  <AppText style={{ fontSize: 12, color: c.textMuted }}>
                    {new Date(review.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </AppText>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <FaStar
                      key={i}
                      size={14}
                      color={i <= review.rating ? "#fbbf24" : c.border}
                    />
                  ))}
                  <AppText
                    style={{ fontSize: 12, color: c.textDim, marginLeft: 6 }}
                  >
                    {review.rating}/5
                  </AppText>
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
          ))}
        </View>
      )}
      {reviewCheckDone && !hasReviewed && (
        <AppText style={{ color: c.orange, marginTop: 10, fontWeight: "600" }}>
          Leave a review
        </AppText>
      )}
      {reviewCheckDone && hasReviewed && (
        <View
          style={[
            styles.reviewedNote,
            { backgroundColor: c.greenDim, borderColor: c.green },
          ]}
        >
          <FaCheckCircle size={13} color={c.green} />
          <AppText style={{ color: c.green, fontSize: 12, marginLeft: 6 }}>
            Your review has been submitted.
          </AppText>
        </View>
      )}
    </>
  );
}

function CancelReason({ reason }) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <View
      style={[
        styles.section,
        { backgroundColor: c.bgPanel, borderColor: c.border },
      ]}
    >
      <AppText style={[styles.sectionTitle, { color: c.textDim }]}>
        Cancellation Reason
      </AppText>
      <View
        style={[
          styles.cancelReasonCard,
          { backgroundColor: c.redDim, borderColor: c.red },
        ]}
      >
        <FaExclamationTriangle size={14} color={c.red} />
        <AppText style={{ color: c.textDim, marginLeft: 8, flex: 1 }}>
          {reason}
        </AppText>
      </View>
    </View>
  );
}

// ─── Styles (verbatim from CSS, mobile root 14) ────────────────────────
const styles = StyleSheet.create({
  titleBlock: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  title: {
    flex: 1,
    fontFamily: "Syne_700Bold",
    fontSize: 20,
    lineHeight: 26,
  },
  categoryPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 4,
    gap: 4,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  section: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  sectionTitle: {
    fontFamily: "Syne_700Bold",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  notes: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 6,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  timelineWrap: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  timeline: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  timelineDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  pendingBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  gpsCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  gpsCardIn: {
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
  },
  gpsCardOut: {
    backgroundColor: "#fff1f2",
    borderColor: "#fecdd3",
  },
  gpsCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  gpsCardDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  gpsCardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1a1a1a",
    flex: 1,
  },
  gpsCardTime: {
    fontSize: 11,
    color: "#888",
  },
  gpsCoordRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  gpsCoordLabel: { fontSize: 12, color: "#888" },
  gpsCoordValue: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: "#333",
  },
  gpsDistRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  gpsDistNear: { backgroundColor: "#dcfce7" },
  gpsDistFar: { backgroundColor: "#fef3c7" },
  gpsMapLink: {
    fontSize: 11,
    fontWeight: "600",
    color: "#2563eb",
  },
  reviewerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewedNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
  },
  bottomActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  invoiceBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  refundBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  cancelReasonCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
});
