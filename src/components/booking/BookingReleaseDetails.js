// src/components/booking/BookingReleaseDetails.js
//
// Verbatim port of components/booking/BookingReleaseDetails.jsx.
//
// Renders nothing when `payment.releases` is empty (web returns null).
// Otherwise shows a collapsible card:
//   · Header — icon + title ("Release Details (N)" or "Payment Fully Released")
//              + subtitle ("X released · Y still in escrow")
//              + progress bar + % + chevron
//   · Body   — summary block (workerPayoutTotal / released / remaining)
//              + release timeline (each release: amount + latest badge +
//                date + releasedBy + note + before/after snapshot)
//
// Sizes match the web CSS at phone root 14.

import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import AppText from "../AppText";
import { useTheme } from "../../contexts/ThemeContext";
import {
  FaChevronDown,
  FaChevronUp,
  FaMoneyBillWave,
  FaUser,
  FaClock,
  FaLock,
  FaCheckCircle,
} from "../../icons/fa";

function formatMoney(amount, currency = "NGN") {
  const n = Number(amount);
  if (amount == null || isNaN(n)) return "—";
  return `${currency} ${n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatDateTime(date) {
  if (!date) return "—";
  const d = new Date(date);
  return `${d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })} · ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

export default function BookingReleaseDetails({
  payment,
  currency: currencyProp,
  defaultOpen = false,
}) {
  const { theme } = useTheme();
  const c = theme.colors;

  const releases = Array.isArray(payment?.releases) ? payment.releases : [];
  const hasReleases = releases.length > 0;

  const [open, setOpen] = useState(defaultOpen);

  const currency = currencyProp || payment?.currency || "NGN";
  const workerPayout = Number(payment?.workerPayout) || 0;
  const releasedAmount = Number(payment?.releasedAmount) || 0;
  const remaining = useMemo(
    () => parseFloat(Math.max(0, workerPayout - releasedAmount).toFixed(2)),
    [workerPayout, releasedAmount],
  );
  const releaseCount = Number(payment?.releaseCount) || releases.length;
  const releasedPct =
    workerPayout > 0 ? Math.round((releasedAmount / workerPayout) * 100) : 0;
  const isFullyReleased =
    workerPayout > 0 && remaining === 0 && releasedAmount > 0;

  const sortedReleases = useMemo(
    () =>
      [...releases].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      ),
    [releases],
  );

  // Hide the card entirely when there's nothing to show.
  if (!hasReleases) return null;

  return (
    <View
      style={[
        styles.section,
        { backgroundColor: c.bgPanel, borderColor: c.border },
      ]}
    >
      {/* ─── HEADER ─────────────────────────────────────────────────── */}
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={({ pressed }) => [
          styles.header,
          pressed && { backgroundColor: "rgba(255,255,255,0.02)" },
        ]}
        accessibilityRole="button"
        accessibilityLabel={
          open ? "Hide release details" : "Show release details"
        }
      >
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.headerIcon,
              { backgroundColor: c.orangeDim, borderColor: c.orangeGlow },
            ]}
          >
            {isFullyReleased ? (
              <FaCheckCircle size={14} color={c.orange} />
            ) : (
              <FaMoneyBillWave size={14} color={c.orange} />
            )}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText
              style={[styles.headerTitle, { color: c.text }]}
              numberOfLines={1}
            >
              {isFullyReleased
                ? "Payment Fully Released"
                : `Release Details (${releaseCount})`}
            </AppText>
            <AppText
              style={[styles.headerSub, { color: c.textDim }]}
              numberOfLines={1}
            >
              {formatMoney(releasedAmount, currency)} released
              {!isFullyReleased ? (
                <> · {formatMoney(remaining, currency)} still in escrow</>
              ) : null}
            </AppText>
          </View>
        </View>

        <View style={styles.headerRight}>
          {/* Progress bar */}
          <View
            style={[
              styles.progressWrap,
              { backgroundColor: c.bgInput, borderColor: c.border },
            ]}
          >
            <View
              style={[
                styles.progressBar,
                {
                  width: `${Math.min(100, releasedPct)}%`,
                  backgroundColor: isFullyReleased ? c.green : c.orange,
                },
              ]}
            />
          </View>
          <AppText style={[styles.progressLabel, { color: c.textDim }]}>
            {releasedPct}%
          </AppText>
          {open ? (
            <FaChevronUp size={10} color={c.textMuted} />
          ) : (
            <FaChevronDown size={10} color={c.textMuted} />
          )}
        </View>
      </Pressable>

      {/* ─── BODY ───────────────────────────────────────────────────── */}
      {open && (
        <View style={[styles.body, { borderTopColor: c.border }]}>
          {/* Summary */}
          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <AppText style={{ fontSize: 13, color: c.textDim, flex: 1 }}>
                Worker payout total
              </AppText>
              <AppText
                style={{ fontSize: 13, fontWeight: "600", color: c.text }}
                numberOfLines={1}
              >
                {formatMoney(workerPayout, currency)}
              </AppText>
            </View>
            <View style={styles.summaryRow}>
              <AppText style={{ fontSize: 13, color: c.textDim, flex: 1 }}>
                Released so far
              </AppText>
              <AppText
                style={{ fontSize: 13, fontWeight: "600", color: c.orange }}
                numberOfLines={1}
              >
                {formatMoney(releasedAmount, currency)} ({releasedPct}%)
              </AppText>
            </View>
            <View
              style={[styles.summaryDivider, { backgroundColor: c.border }]}
            />
            <View style={styles.summaryRow}>
              <AppText
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: c.text,
                  flex: 1,
                }}
              >
                Remaining in escrow
              </AppText>
              <AppText
                style={{
                  fontFamily: "Syne_800ExtraBold",
                  fontSize: 14,
                  fontWeight: "800",
                  color: isFullyReleased ? c.green : c.orange,
                }}
                numberOfLines={1}
              >
                {formatMoney(remaining, currency)}
              </AppText>
            </View>
            {isFullyReleased ? (
              <View
                style={[
                  styles.fullyReleasedNote,
                  {
                    backgroundColor: c.greenDim,
                    borderColor: "rgba(34,197,94,0.3)",
                  },
                ]}
              >
                <FaLock size={11} color={c.green} />
                <AppText
                  style={{
                    fontSize: 11,
                    color: c.green,
                    fontWeight: "600",
                    marginLeft: 6,
                    flex: 1,
                    lineHeight: 16,
                  }}
                >
                  All funds have been released. This payment is closed.
                </AppText>
              </View>
            ) : null}
          </View>

          {/* Timeline */}
          <View style={[styles.timelineWrap, { borderTopColor: c.border }]}>
            <AppText
              style={{
                fontSize: 10,
                fontWeight: "700",
                color: c.textMuted,
                textTransform: "uppercase",
                letterSpacing: 1,
                marginBottom: 8,
                marginTop: 8,
              }}
            >
              Release history
            </AppText>
            {sortedReleases.map((r, i) => {
              const isLatest = i === 0;
              const by = r.releasedBy;
              const releasedByLabel = by
                ? by.role === "HIRER"
                  ? `Hirer · ${by.firstName ?? ""} ${by.lastName ?? ""}`.trim()
                  : by.role === "ADMIN"
                    ? `Admin · ${by.firstName ?? ""} ${by.lastName ?? ""}`.trim()
                    : `${by.firstName ?? ""} ${by.lastName ?? ""}`.trim() ||
                      "System"
                : "System";

              return (
                <View key={r.id} style={styles.timelineItem}>
                  {/* Marker column */}
                  <View style={styles.markerCol}>
                    <View
                      style={[
                        styles.dot,
                        isLatest
                          ? { backgroundColor: c.orange }
                          : {
                              backgroundColor: c.orangeDim,
                              borderColor: c.orange,
                              borderWidth: 2,
                            },
                      ]}
                    />
                    {i < sortedReleases.length - 1 ? (
                      <View
                        style={[
                          styles.connector,
                          { backgroundColor: c.border },
                        ]}
                      />
                    ) : null}
                  </View>

                  {/* Body column */}
                  <View style={styles.timelineBody}>
                    <View style={styles.timelineTopRow}>
                      <AppText
                        style={[styles.timelineAmount, { color: c.text }]}
                        numberOfLines={1}
                      >
                        {formatMoney(r.amount, r.currency || currency)}
                      </AppText>
                      {isLatest ? (
                        <View
                          style={[
                            styles.latestBadge,
                            {
                              backgroundColor: c.orangeDim,
                              borderColor: c.orangeGlow,
                            },
                          ]}
                        >
                          <AppText
                            style={{
                              fontSize: 9,
                              fontWeight: "800",
                              color: c.orange,
                              letterSpacing: 0.5,
                              textTransform: "uppercase",
                            }}
                          >
                            Latest
                          </AppText>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.timelineMeta}>
                      <View style={styles.metaItem}>
                        <FaClock size={9} color={c.textMuted} />
                        <AppText
                          style={{
                            fontSize: 10,
                            color: c.textDim,
                            marginLeft: 4,
                          }}
                        >
                          {formatDateTime(r.createdAt)}
                        </AppText>
                      </View>
                      <View style={styles.metaItem}>
                        <FaUser size={9} color={c.textMuted} />
                        <AppText
                          style={{
                            fontSize: 10,
                            color: c.textDim,
                            marginLeft: 4,
                            flexShrink: 1,
                          }}
                          numberOfLines={1}
                        >
                          {releasedByLabel}
                        </AppText>
                      </View>
                    </View>

                    {r.note ? (
                      <AppText
                        style={{
                          fontSize: 11,
                          color: c.textDim,
                          fontStyle: "italic",
                          marginTop: 4,
                          lineHeight: 16,
                        }}
                      >
                        <AppText
                          style={{
                            fontStyle: "normal",
                            fontWeight: "700",
                            color: c.textMuted,
                          }}
                        >
                          Note:{" "}
                        </AppText>
                        {r.note}
                      </AppText>
                    ) : null}

                    {(r.remainingBefore != null ||
                      r.remainingAfter != null) && (
                      <View
                        style={[
                          styles.snapshot,
                          {
                            backgroundColor: c.bgInput,
                            borderColor: c.border,
                          },
                        ]}
                      >
                        {r.remainingBefore != null ? (
                          <SnapshotItem
                            label="Before"
                            value={formatMoney(
                              r.remainingBefore,
                              r.currency || currency,
                            )}
                          />
                        ) : null}
                        {r.remainingAfter != null ? (
                          <SnapshotItem
                            label="After"
                            value={formatMoney(
                              r.remainingAfter,
                              r.currency || currency,
                            )}
                          />
                        ) : null}
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

function SnapshotItem({ label, value }) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <AppText
        style={{
          fontSize: 9,
          color: c.textMuted,
          fontWeight: "700",
          textTransform: "uppercase",
          letterSpacing: 0.6,
          marginBottom: 1,
        }}
      >
        {label}
      </AppText>
      <AppText
        style={{ fontSize: 11, fontWeight: "700", color: c.text }}
        numberOfLines={1}
      >
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  headerIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headerTitle: {
    fontFamily: "Syne_700Bold",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 17,
  },
  headerSub: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  progressWrap: {
    width: 80,
    height: 6,
    borderRadius: 999,
    borderWidth: 1,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 999,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: "700",
    minWidth: 30,
    textAlign: "right",
  },
  body: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
  },
  summary: {
    paddingTop: 12,
    gap: 6,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  summaryDivider: {
    height: 1,
    marginVertical: 4,
  },
  fullyReleasedNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 6,
  },
  timelineWrap: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderStyle: "dashed",
    marginTop: 12,
  },
  timelineItem: {
    flexDirection: "row",
    gap: 10,
    paddingBottom: 10,
  },
  markerCol: {
    width: 10,
    alignItems: "center",
    paddingTop: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  connector: {
    width: 2,
    flex: 1,
    marginTop: 4,
    minHeight: 16,
  },
  timelineBody: {
    flex: 1,
    minWidth: 0,
  },
  timelineTopRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 4,
  },
  timelineAmount: {
    fontFamily: "Syne_800ExtraBold",
    fontSize: 14,
    fontWeight: "800",
  },
  latestBadge: {
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 999,
    borderWidth: 1,
  },
  timelineMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 2,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
    minWidth: 0,
  },
  snapshot: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
});
