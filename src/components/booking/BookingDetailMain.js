// src/components/booking/BookingDetailMain.js
//
// Mirrors BookingDetailMain.jsx from the website — main column for both
// job-post and direct bookings. Uses expo-print BookingInvoice for the
// invoice button (mirrors the website's inline invoice).

import React from "react";
import { View, Pressable, Image, Linking, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
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
  FaExclamationTriangle,
  FaUndo,
} from "../../icons/fa";

import AppText from "../AppText";
import { useTheme } from "../../contexts/ThemeContext";
import { calcPricing, HIRER_FEE_RATE } from "../../utils/pricing";
import BookingReleaseDetails from "./BookingReleaseDetails";
import JobPostBookingDetails from "./JobPostBookingDetails";
import GpsCard from "./GpsCard";
import Timeline from "./Timeline";
import BookingInvoice from "./BookingInvoice";

// ── Inline helpers ──────────────────────────────────────────────
function DetailItem({ icon, label, value, accent }) {
  const { theme: th } = useTheme();
  const c = th.colors;
  return (
    <View
      style={[
        styles.detailItem,
        { backgroundColor: c.bgCard, borderColor: c.border },
      ]}
    >
      <View style={styles.detailIcon}>{icon}</View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText variant="small" tone="dim" style={styles.detailLabel}>
          {label}
        </AppText>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <AppText
            variant="body"
            weight="semibold"
            style={[styles.detailValue, accent && { color: c.orange }]}
          >
            {value}
          </AppText>
        </View>
      </View>
    </View>
  );
}

const STATUS_META = {
  PENDING: { color: "#fbbf24" },
  ACCEPTED: { color: "#f97316" },
  IN_PROGRESS: { color: "#818cf8" },
  COMPLETED: { color: "#22c55e" },
  CANCELLED: { color: "#ef4444" },
  DISPUTED: { color: "#fb7185" },
};

const JOB_TYPES = {
  FULL_TIME: {
    icon: <FaBriefcase size={14} color="#f97316" />,
    label: "Full-time",
  },
  PART_TIME: {
    icon: <FaClock size={14} color="#f97316" />,
    label: "Part-time",
  },
  CONTRACT: {
    icon: <FaFileAlt size={14} color="#f97316" />,
    label: "Contract",
  },
  TEMPORARY: { icon: <FaFlag size={14} color="#f97316" />, label: "Temporary" },
};
const LOC_TYPES = {
  REMOTE: { icon: <FaGlobe size={14} color="#f97316" />, label: "Remote" },
  ON_SITE: { icon: <FaMapPin size={14} color="#f97316" />, label: "On-site" },
  HYBRID: { icon: <FaRandom size={14} color="#f97316" />, label: "Hybrid" },
};

function calcDuration(start, end) {
  if (!start || !end) return null;
  const ms = new Date(end) - new Date(start);
  const hrs = Math.floor(ms / 3600000);
  const min = Math.floor((ms % 3600000) / 60000);
  return hrs > 0 ? `${hrs}h ${min}m` : `${min}m`;
}

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
  isHirer,
  payment,
  paymentStatus,
  isWorker,
  workerName,
  onShowRefundModal,
  refundLoading,
  hasActiveRefund,
  onShowReviewModal,
}) {
  const { t } = useTranslation();
  const { theme: th } = useTheme();
  const c = th.colors;

  const meta = STATUS_META[booking.status] || STATUS_META.PENDING;
  const isJobPostBooking = booking.source === "JOB_POST";
  const showMapLink =
    booking.latitude && booking.longitude && booking.locationType !== "REMOTE";

  const renderDuration = () => {
    if (!dur) {
      return (
        <AppText variant="body" tone="dim">
          {t("booking.detail.notSpecified", {
            defaultValue: "Not specified",
          })}
        </AppText>
      );
    }
    return (
      <AppText variant="body" weight="semibold">
        {dur.main}
        {dur.sub && (
          <AppText variant="small" tone="dim">
            {" "}
            {dur.sub}
          </AppText>
        )}
      </AppText>
    );
  };

  const showRefundButton =
    isHirer &&
    paymentStatus === "RELEASED" &&
    !refundLoading &&
    !hasActiveRefund;

  // ── Title block ──────────────────────────────────────────
  const renderTitleBlock = () => (
    <View
      style={[
        styles.titleBlock,
        { backgroundColor: c.bgPanel, borderColor: c.border },
      ]}
    >
      <View style={styles.titleRow}>
        <AppText
          variant="title"
          weight="displayBlack"
          style={{ flex: 1, lineHeight: 30 }}
        >
          {booking.title}
        </AppText>
        <View
          style={[
            styles.badge,
            {
              backgroundColor: `${meta.color}22`,
              borderColor: `${meta.color}55`,
            },
          ]}
        >
          <AppText
            variant="small"
            weight="bold"
            style={{
              color: meta.color,
              textTransform: "uppercase",
              fontSize: 10,
            }}
          >
            {t(`booking.status.${booking.status.toLowerCase()}`, {
              defaultValue: booking.status,
            })}
          </AppText>
        </View>
      </View>

      <View
        style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}
      >
        {booking.category && (
          <View
            style={[
              styles.chip,
              { backgroundColor: c.orangeDim, borderColor: c.orangeGlow },
            ]}
          >
            <AppText variant="small" weight="bold" style={{ color: c.orange }}>
              {booking.category.name}
            </AppText>
          </View>
        )}
        {booking.isNegotiated && (
          <View
            style={[
              styles.chip,
              {
                backgroundColor: "rgba(129,140,248,0.1)",
                borderColor: "rgba(129,140,248,0.25)",
              },
            ]}
          >
            <FaHandshake size={10} color="#818cf8" />
            <AppText
              variant="small"
              weight="bold"
              style={{ color: "#818cf8", marginLeft: 4 }}
            >
              {t("booking.detail.negotiated", {
                defaultValue: "Negotiated rate",
              })}
            </AppText>
          </View>
        )}
        {isJobPostBooking && (
          <View
            style={[
              styles.chip,
              {
                backgroundColor: "rgba(129,140,248,0.1)",
                borderColor: "rgba(129,140,248,0.25)",
              },
            ]}
          >
            <FaBriefcase size={10} color="#818cf8" />
            <AppText
              variant="small"
              weight="bold"
              style={{ color: "#818cf8", marginLeft: 4 }}
            >
              {t("booking.jobPost.fromJobPost")}
            </AppText>
            <FaExternalLinkAlt
              size={8}
              color="#818cf8"
              style={{ marginLeft: 4 }}
            />
          </View>
        )}
      </View>
    </View>
  );

  // ── Pending banner ──────────────────────────────────────
  const renderPendingBanner = () =>
    booking.status === "PENDING" &&
    isHirer && (
      <View
        style={[
          styles.pendingBanner,
          {
            backgroundColor: "rgba(251,191,36,0.07)",
            borderColor: "rgba(251,191,36,0.35)",
          },
        ]}
      >
        <View style={styles.pendingPulse}>
          <View style={styles.pendingDot} />
        </View>
        <View style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 4,
            }}
          >
            <FaHourglassHalf
              size={12}
              color="#fbbf24"
              style={{ marginRight: 6 }}
            />
            <AppText weight="bold" style={{ color: "#fbbf24", fontSize: 13 }}>
              {t("booking.pending.waitingFor", {
                name: workerName || "the worker",
                defaultValue: `Waiting for ${workerName || "the worker"} to respond`,
              })}
            </AppText>
          </View>
          <AppText variant="small" tone="dim">
            {t("booking.pending.description", {
              name: workerName || "The worker",
              defaultValue: `Your booking request has been sent. ${workerName || "The worker"} hasn't accepted yet — you'll be notified the moment they do. You can cancel for free until they accept.`,
            })}
          </AppText>
        </View>
      </View>
    );

  // ── Reviews ─────────────────────────────────────────────
  const renderReviews = () => {
    if (booking.status !== "COMPLETED") return null;
    return (
      <View
        style={[
          styles.section,
          { backgroundColor: c.bgPanel, borderColor: c.border },
        ]}
      >
        <AppText
          variant="small"
          weight="bold"
          tone="dim"
          style={styles.sectionTitle}
        >
          {t("booking.section.reviews")}
        </AppText>

        {booking.reviews?.length > 0 && (
          <View style={{ gap: 16 }}>
            {booking.reviews.map((review) => (
              <View key={review.id} style={{ gap: 8 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <View
                    style={[
                      styles.reviewerAvatar,
                      { backgroundColor: c.orangeDim },
                    ]}
                  >
                    {review.giver?.avatar ? (
                      <Image
                        source={{ uri: review.giver.avatar }}
                        style={{ width: "100%", height: "100%" }}
                      />
                    ) : (
                      <AppText
                        weight="bold"
                        style={{ color: c.orange, fontSize: 13 }}
                      >
                        {review.giver?.firstName?.[0]}
                        {review.giver?.lastName?.[0]}
                      </AppText>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText weight="semibold" style={{ fontSize: 13 }}>
                      {review.giver?.firstName} {review.giver?.lastName}
                      <AppText variant="small" tone="dim">
                        {" · "}
                        {review.giver?.role === "HIRER"
                          ? t("booking.role.hirer", { defaultValue: "Hirer" })
                          : t("booking.role.worker", {
                              defaultValue: "Worker",
                            })}
                      </AppText>
                    </AppText>
                    <AppText variant="small" tone="dim">
                      {new Date(review.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </AppText>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 2,
                    }}
                  >
                    {[...Array(5)].map((_, i) => (
                      <FaStar
                        key={i}
                        size={14}
                        color={i < review.rating ? "#fbbf24" : c.border}
                      />
                    ))}
                    <AppText
                      variant="small"
                      tone="dim"
                      style={{ marginLeft: 4 }}
                    >
                      {review.rating}/5
                    </AppText>
                  </View>
                </View>
                {review.comment && (
                  <View
                    style={{
                      borderLeftWidth: 2,
                      borderLeftColor: c.orange,
                      paddingLeft: 12,
                    }}
                  >
                    <AppText
                      style={{ fontStyle: "italic", lineHeight: 20 }}
                      tone="dim"
                    >
                      "{review.comment}"
                    </AppText>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {reviewCheckDone && !hasReviewed && (
          <Pressable
            onPress={() => onShowReviewModal?.()}
            style={[
              styles.actionBtn,
              styles.actionBtnOutline,
              { borderColor: c.border, marginTop: 16 },
            ]}
          >
            <FaStar size={12} color={c.textDim} />
            <AppText
              variant="small"
              weight="bold"
              style={{ marginLeft: 6, color: c.textDim }}
            >
              {t("booking.button.leaveReview", {
                defaultValue: "Leave a Review",
              })}
            </AppText>
          </Pressable>
        )}

        {reviewCheckDone && hasReviewed && (
          <View
            style={[
              styles.reviewedNote,
              { backgroundColor: c.greenDim, borderColor: "#22c55e" },
            ]}
          >
            <FaCheckCircle size={12} color="#22c55e" />
            <AppText
              variant="small"
              style={{ color: "#22c55e", marginLeft: 6, flex: 1 }}
            >
              {t("booking.review.submitted")}{" "}
              {(booking.reviews?.length ?? 0) < 2 &&
                t("booking.review.waitingOther", {
                  defaultValue: "Waiting for the other party.",
                })}
            </AppText>
          </View>
        )}
      </View>
    );
  };

  // ── GPS section ─────────────────────────────────────────
  const renderGPS = () => {
    if (!hasCheckInGps && !hasCheckOutGps) return null;
    return (
      <View
        style={[
          styles.section,
          { backgroundColor: c.bgPanel, borderColor: c.border },
        ]}
      >
        <AppText
          variant="small"
          weight="bold"
          tone="dim"
          style={styles.sectionTitle}
        >
          {t("booking.section.workerLocation")}
        </AppText>
        <AppText variant="small" tone="dim" style={{ marginBottom: 12 }}>
          {t("booking.gpsLocation")}
        </AppText>
        {hasCheckInGps && (
          <GpsCard
            label={t("booking.location.checkIn")}
            lat={booking.checkInLat}
            lng={booking.checkInLng}
            timestamp={booking.checkInAt}
            isCheckOut={false}
          />
        )}
        {hasCheckOutGps && (
          <GpsCard
            label={t("booking.location.checkOut")}
            lat={booking.checkOutLat}
            lng={booking.checkOutLng}
            timestamp={booking.checkOutAt}
            isCheckOut={true}
          />
        )}
      </View>
    );
  };

  // ── Cancellation reason ─────────────────────────────────
  const renderCancelReason = () => {
    if (!booking.cancelReason) return null;
    return (
      <View
        style={[
          styles.section,
          { backgroundColor: c.bgPanel, borderColor: c.border },
        ]}
      >
        <AppText
          variant="small"
          weight="bold"
          tone="dim"
          style={styles.sectionTitle}
        >
          {t("booking.section.cancelReason", {
            defaultValue: "Cancellation Reason",
          })}
        </AppText>
        <View
          style={[
            styles.cancelReasonBox,
            {
              backgroundColor: "rgba(239,68,68,0.08)",
              borderColor: "rgba(239,68,68,0.2)",
            },
          ]}
        >
          <FaExclamationTriangle size={14} color="#ef4444" />
          <AppText
            variant="small"
            tone="dim"
            style={{ flex: 1, marginLeft: 8 }}
          >
            {booking.cancelReason}
          </AppText>
        </View>
      </View>
    );
  };

  // ── Bottom actions (invoice + refund) ───────────────────
  const renderBottomActions = () => {
    if (booking.status !== "COMPLETED") return null;
    return (
      <View style={styles.bottomActions}>
        <BookingInvoice booking={booking} />
        {showRefundButton && (
          <Pressable
            onPress={onShowRefundModal}
            disabled={refundLoading}
            style={[
              styles.bottomBtn,
              {
                backgroundColor: "rgba(239,68,68,0.08)",
                borderColor: "#ef4444",
                opacity: refundLoading ? 0.5 : 1,
              },
            ]}
          >
            <FaUndo size={12} color="#ef4444" />
            <AppText
              variant="small"
              weight="bold"
              style={{ marginLeft: 6, color: "#ef4444" }}
            >
              {t("booking.button.requestRefund", {
                defaultValue: "Request Refund",
              })}
            </AppText>
          </Pressable>
        )}
      </View>
    );
  };

  // ── Job-post branch ─────────────────────────────────────
  if (isJobPostBooking) {
    return (
      <View style={{ gap: 12 }}>
        <BookingReleaseDetails payment={payment} currency={booking.currency} />
        {renderTitleBlock()}
        <Timeline step={step} />
        {renderPendingBanner()}

        <JobPostBookingDetails booking={booking} />

        {/* Booking-level details */}
        <View
          style={[
            styles.section,
            { backgroundColor: c.bgPanel, borderColor: c.border },
          ]}
        >
          <AppText
            variant="small"
            weight="bold"
            tone="dim"
            style={styles.sectionTitle}
          >
            {t("booking.section.jobDetails")}
          </AppText>
          <View style={{ gap: 10 }}>
            <DetailItem
              icon={<FaCalendarAlt size={14} color="#f97316" />}
              label={t("booking.detail.scheduled")}
              value={
                new Date(booking.scheduledAt).toLocaleDateString("en-GB", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                }) +
                " at " +
                new Date(booking.scheduledAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              }
            />
            {booking.address && (
              <DetailItem
                icon={<FaMapMarkerAlt size={14} color="#f97316" />}
                label={t("booking.detail.jobSiteAddress")}
                value={
                  <>
                    {booking.address}
                    {showMapLink && (
                      <Pressable
                        onPress={() =>
                          Linking.openURL(
                            mapsUrl(booking.latitude, booking.longitude),
                          )
                        }
                        style={{ marginLeft: 4 }}
                      >
                        <AppText variant="small" style={{ color: c.orange }}>
                          View map
                        </AppText>
                      </Pressable>
                    )}
                  </>
                }
              />
            )}
            <DetailItem
              icon={<FaMoneyBillWave size={14} color="#f97316" />}
              label={t("booking.detail.agreedTotal", {
                defaultValue: "Agreed Total",
              })}
              value={`${booking.currency} ${booking.agreedRate?.toLocaleString()}`}
              accent
            />
            {booking.isNegotiated && booking.negotiatedRate && (
              <DetailItem
                icon={<FaHandshake size={14} color="#f97316" />}
                label={t("booking.detail.negotiatedOverride", {
                  defaultValue: "Negotiated Override",
                })}
                value={`${booking.currency} ${booking.negotiatedRate?.toLocaleString()}`}
                accent
              />
            )}
            {booking.negotiationNote && (
              <DetailItem
                icon={<FaFileAlt size={14} color="#f97316" />}
                label={t("booking.detail.negotiationNote", {
                  defaultValue: "Negotiation Note",
                })}
                value={booking.negotiationNote}
              />
            )}
            {booking.checkInAt && (
              <DetailItem
                icon={<FaCheckCircle size={14} color="#22c55e" />}
                label={t("booking.detail.checkedIn", {
                  defaultValue: "Checked In",
                })}
                value={
                  <AppText style={{ color: "#22c55e" }}>
                    {new Date(booking.checkInAt).toLocaleString("en-NG", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </AppText>
                }
              />
            )}
            {booking.checkOutAt && (
              <DetailItem
                icon={<FaFlag size={14} color="#f97316" />}
                label={t("booking.detail.checkedOut", {
                  defaultValue: "Checked Out",
                })}
                value={new Date(booking.checkOutAt).toLocaleString("en-NG", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              />
            )}
            {booking.checkInAt && booking.checkOutAt && (
              <DetailItem
                icon={<FaClock size={14} color="#f97316" />}
                label={t("booking.detail.actualDuration", {
                  defaultValue: "Actual Duration",
                })}
                value={calcDuration(booking.checkInAt, booking.checkOutAt)}
              />
            )}
            {booking.insuranceRef && (
              <DetailItem
                icon={<FaShieldAlt size={14} color="#f97316" />}
                label={t("booking.detail.insurance", {
                  defaultValue: "Insurance",
                })}
                value={`${booking.insurancePlan || "Insured"} · Policy #${booking.insuranceRef}`}
              />
            )}
          </View>
        </View>

        {/* Payment breakdown */}
        {(() => {
          const p = calcPricing(booking);
          const currency = p.currency || booking.currency || "NGN";
          return (
            <View
              style={[
                styles.section,
                { backgroundColor: c.bgPanel, borderColor: c.border },
              ]}
            >
              <AppText
                variant="small"
                weight="bold"
                tone="dim"
                style={styles.sectionTitle}
              >
                {t("booking.section.payment")}
              </AppText>
              <View style={{ gap: 10 }}>
                {isHirer ? (
                  <>
                    <DetailItem
                      icon={<FaMoneyBillWave size={14} color="#f97316" />}
                      label={t("booking.payment.subtotal")}
                      value={`${currency} ${p.subtotal.toLocaleString()}`}
                    />
                    <DetailItem
                      icon={<FaMoneyBillWave size={14} color="#f97316" />}
                      label={`${t("booking.detail.platformFee")} (${HIRER_FEE_RATE * 100}%)`}
                      value={`${currency} ${p.hirerFee.toLocaleString()}`}
                      accent
                    />
                    <DetailItem
                      icon={<FaMoneyBillWave size={14} color="#f97316" />}
                      label={t("booking.detail.totalPayment", {
                        defaultValue: "Total Payment",
                      })}
                      value={`${currency} ${p.grossTotal.toLocaleString()}`}
                      accent
                    />
                  </>
                ) : (
                  <>
                    <DetailItem
                      icon={<FaMoneyBillWave size={14} color="#f97316" />}
                      label={t("booking.detail.totalEarnings", {
                        defaultValue: "Total Earnings",
                      })}
                      value={`${currency} ${p.subtotal.toLocaleString()}`}
                      accent
                    />
                    <DetailItem
                      icon={<FaMoneyBillWave size={14} color="#f97316" />}
                      label={`${t("booking.detail.platformFee")} (${HIRER_FEE_RATE * 100}%)`}
                      value={`${currency} ${p.hirerFee.toLocaleString()}`}
                    />
                    <DetailItem
                      icon={<FaMoneyBillWave size={14} color="#f97316" />}
                      label={t("booking.detail.yourPayout", {
                        defaultValue: "Your Payout",
                      })}
                      value={`${currency} ${p.workerPayout.toLocaleString()}`}
                      accent
                    />
                  </>
                )}
              </View>
            </View>
          );
        })()}

        {renderGPS()}
        {renderReviews()}
        {renderCancelReason()}
        {renderBottomActions()}
      </View>
    );
  }

  // ── Direct booking branch ───────────────────────────────
  return (
    <View style={{ gap: 12 }}>
      <BookingReleaseDetails payment={payment} currency={booking.currency} />
      {renderTitleBlock()}
      <Timeline step={step} />
      {renderPendingBanner()}

      {/* Description */}
      <View
        style={[
          styles.section,
          { backgroundColor: c.bgPanel, borderColor: c.border },
        ]}
      >
        <AppText
          variant="small"
          weight="bold"
          tone="dim"
          style={styles.sectionTitle}
        >
          {t("booking.section.description")}
        </AppText>
        <AppText variant="body" style={{ lineHeight: 22 }}>
          {booking.description}
        </AppText>
        {booking.notes && (
          <View
            style={[
              styles.notes,
              { backgroundColor: c.bgCard, borderColor: c.border },
            ]}
          >
            <FaFileAlt size={12} color={c.textMuted} />
            <AppText
              variant="small"
              tone="dim"
              style={{ flex: 1, marginLeft: 8, lineHeight: 20 }}
            >
              {booking.notes}
            </AppText>
          </View>
        )}
      </View>

      {/* Requirements & Responsibilities */}
      {(booking.requirements || booking.responsibilities) && (
        <View
          style={[
            styles.section,
            { backgroundColor: c.bgPanel, borderColor: c.border },
          ]}
        >
          <AppText
            variant="small"
            weight="bold"
            tone="dim"
            style={styles.sectionTitle}
          >
            {t("booking.section.reqResp", {
              defaultValue: "Requirements & Responsibilities",
            })}
          </AppText>
          {booking.requirements && (
            <View
              style={[
                styles.notes,
                {
                  backgroundColor: c.bgCard,
                  borderColor: c.border,
                  marginBottom: 10,
                },
              ]}
            >
              <FaFileAlt size={12} color={c.textMuted} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <AppText
                  weight="bold"
                  style={{ marginBottom: 2, fontSize: 12 }}
                >
                  {t("booking.jobPost.requirements")}
                </AppText>
                <AppText variant="small" tone="dim">
                  {booking.requirements}
                </AppText>
              </View>
            </View>
          )}
          {booking.responsibilities && (
            <View
              style={[
                styles.notes,
                { backgroundColor: c.bgCard, borderColor: c.border },
              ]}
            >
              <FaTools size={12} color={c.textMuted} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <AppText
                  weight="bold"
                  style={{ marginBottom: 2, fontSize: 12 }}
                >
                  {t("booking.jobPost.responsibilities")}
                </AppText>
                <AppText variant="small" tone="dim">
                  {booking.responsibilities}
                </AppText>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Job Details grid */}
      <View
        style={[
          styles.section,
          { backgroundColor: c.bgPanel, borderColor: c.border },
        ]}
      >
        <AppText
          variant="small"
          weight="bold"
          tone="dim"
          style={styles.sectionTitle}
        >
          {t("booking.section.jobDetails")}
        </AppText>
        <View style={{ gap: 10 }}>
          <DetailItem
            icon={<FaCalendarAlt size={14} color="#f97316" />}
            label={t("booking.detail.scheduled")}
            value={
              new Date(booking.scheduledAt).toLocaleDateString("en-GB", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              }) +
              " at " +
              new Date(booking.scheduledAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            }
          />
          {booking.address && (
            <DetailItem
              icon={<FaMapMarkerAlt size={14} color="#f97316" />}
              label={t("booking.detail.jobSiteAddress")}
              value={
                <>
                  {booking.address}
                  {showMapLink && (
                    <Pressable
                      onPress={() =>
                        Linking.openURL(
                          mapsUrl(booking.latitude, booking.longitude),
                        )
                      }
                      style={{ marginLeft: 4 }}
                    >
                      <AppText variant="small" style={{ color: c.orange }}>
                        View map
                      </AppText>
                    </Pressable>
                  )}
                </>
              }
            />
          )}
          <DetailItem
            icon={<FaMoneyBillWave size={14} color="#f97316" />}
            label={t("booking.detail.agreedRate")}
            value={`${booking.currency} ${booking.agreedRate?.toLocaleString()}`}
            accent
          />
          {booking.isNegotiated && booking.negotiatedRate && (
            <DetailItem
              icon={<FaHandshake size={14} color="#f97316" />}
              label={t("booking.detail.negotiatedRate", {
                defaultValue: "Negotiated Rate",
              })}
              value={`${booking.currency} ${booking.negotiatedRate?.toLocaleString()}`}
              accent
            />
          )}
          {booking.negotiationNote && (
            <DetailItem
              icon={<FaFileAlt size={14} color="#f97316" />}
              label={t("booking.detail.negotiationNote", {
                defaultValue: "Negotiation Note",
              })}
              value={booking.negotiationNote}
            />
          )}
          <DetailItem
            icon={<FaClock size={14} color="#f97316" />}
            label={t("booking.detail.estDuration")}
            value={renderDuration()}
          />
          {booking.checkInAt && (
            <DetailItem
              icon={<FaCheckCircle size={14} color="#22c55e" />}
              label={t("booking.detail.checkedIn")}
              value={
                <AppText style={{ color: "#22c55e" }}>
                  {new Date(booking.checkInAt).toLocaleString("en-NG", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </AppText>
              }
            />
          )}
          {booking.checkOutAt && (
            <DetailItem
              icon={<FaFlag size={14} color="#f97316" />}
              label={t("booking.detail.checkedOut")}
              value={new Date(booking.checkOutAt).toLocaleString("en-NG", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            />
          )}
          {booking.checkInAt && booking.checkOutAt && (
            <DetailItem
              icon={<FaClock size={14} color="#f97316" />}
              label={t("booking.detail.actualDuration")}
              value={calcDuration(booking.checkInAt, booking.checkOutAt)}
            />
          )}
          {booking.insuranceRef && (
            <DetailItem
              icon={<FaShieldAlt size={14} color="#f97316" />}
              label={t("booking.detail.insurance")}
              value={`${booking.insurancePlan || "Insured"} · Policy #${booking.insuranceRef}`}
            />
          )}
          {booking.jobType && (
            <DetailItem
              icon={
                JOB_TYPES[booking.jobType]?.icon || (
                  <FaBriefcase size={14} color="#f97316" />
                )
              }
              label={t("booking.detail.jobType", { defaultValue: "Job Type" })}
              value={JOB_TYPES[booking.jobType]?.label || booking.jobType}
            />
          )}
          {booking.locationType && (
            <DetailItem
              icon={
                LOC_TYPES[booking.locationType]?.icon || (
                  <FaMapMarkerAlt size={14} color="#f97316" />
                )
              }
              label={t("booking.detail.locationType", {
                defaultValue: "Location Type",
              })}
              value={
                LOC_TYPES[booking.locationType]?.label || booking.locationType
              }
            />
          )}
        </View>
      </View>

      {renderGPS()}
      {renderReviews()}
      {renderCancelReason()}
      {renderBottomActions()}
    </View>
  );
}

const styles = StyleSheet.create({
  titleBlock: { padding: 20, borderRadius: 16, borderWidth: 1, gap: 8 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  pendingBanner: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 12,
    alignItems: "flex-start",
  },
  pendingPulse: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(251,191,36,0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  pendingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#fbbf24",
  },
  section: { padding: 20, borderRadius: 14, borderWidth: 1 },
  sectionTitle: {
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 14,
    fontSize: 11,
  },
  detailItem: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
    alignItems: "flex-start",
  },
  detailIcon: { paddingTop: 1 },
  detailLabel: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  detailValue: { lineHeight: 18, fontSize: 13 },
  notes: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    alignItems: "flex-start",
  },
  bottomActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  bottomBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 9,
    borderWidth: 1,
  },
  cancelReasonBox: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  reviewerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  reviewedNote: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 9,
  },
  actionBtnOutline: { backgroundColor: "transparent", borderWidth: 1 },
});
