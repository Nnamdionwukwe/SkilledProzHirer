// src/components/booking/BookingReleaseDetails.js
import React, { useState, useMemo } from "react";
import {
  View,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { FontAwesome5, MaterialIcons } from "@expo/vector-icons";
import AppText from "../AppText";
import { useTheme } from "../../contexts/ThemeContext";

// Enable LayoutAnimation on Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
  const colors = theme.colors;
  const { width } = useWindowDimensions();
  const [open, setOpen] = useState(defaultOpen);

  const releases = Array.isArray(payment?.releases) ? payment.releases : [];
  const hasReleases = releases.length > 0;

  // ── Responsive Breakpoints (Translating CSS Media Queries) ──
  const isMobile = width <= 640;
  const isSmallPhone = width <= 480;
  const isVerySmallPhone = width <= 380;

  // ── Derived money values ──
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

  if (!hasReleases) return null;

  const toggleOpen = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((v) => !v);
  };

  return (
    <View
      style={[
        styles.section,
        { backgroundColor: colors.bgPanel, borderColor: colors.border },
      ]}
    >
      {/* ── Header Row ─────────────────────────────────────────────── */}
      <Pressable
        style={({ pressed }) => [
          styles.header,
          isMobile && styles.headerMobile,
          pressed && { backgroundColor: "rgba(255,255,255,0.02)" },
        ]}
        onPress={toggleOpen}
        accessibilityRole="button"
        accessibilityLabel={
          open ? "Hide release details" : "Show release details"
        }
      >
        <View style={[styles.headerLeft, isMobile && styles.headerLeftMobile]}>
          <View
            style={[
              styles.headerIcon,
              {
                backgroundColor: colors.orangeDim,
                borderColor: colors.orangeGlow,
              },
              isMobile && styles.headerIconMobile,
              isVerySmallPhone && styles.headerIconVerySmall,
            ]}
          >
            {isFullyReleased ? (
              <FontAwesome5
                name="check-circle"
                size={isMobile ? 14 : 16}
                color={colors.orange}
              />
            ) : (
              <FontAwesome5
                name="money-bill-wave"
                size={isMobile ? 14 : 16}
                color={colors.orange}
              />
            )}
          </View>

          <View style={styles.headerTextCol}>
            <AppText
              weight="displayBlack"
              numberOfLines={1}
              style={[
                styles.headerTitle,
                { color: colors.text },
                isMobile && { fontSize: 13.6 },
                isSmallPhone && { fontSize: 13 },
                isVerySmallPhone && { fontSize: 12.5 },
              ]}
            >
              {isFullyReleased
                ? "Payment Fully Released"
                : `Release Details (${releaseCount})`}
            </AppText>
            <AppText
              numberOfLines={1}
              style={[
                styles.headerSub,
                { color: colors.textDim },
                isMobile && { fontSize: 11.2 },
                isSmallPhone && { fontSize: 10.8 },
                isVerySmallPhone && { fontSize: 10.4 },
              ]}
            >
              {formatMoney(releasedAmount, currency)} released
              {!isFullyReleased &&
                ` · ${formatMoney(remaining, currency)} still in escrow`}
            </AppText>
          </View>
        </View>

        <View style={[styles.headerRight, isMobile && { gap: 6 }]}>
          {/* Progress Bar (Hidden on <= 640px) */}
          {!isMobile && (
            <View
              style={[
                styles.progressWrap,
                { backgroundColor: colors.bgInput, borderColor: colors.border },
              ]}
            >
              <View
                style={[
                  styles.progressBar,
                  { width: `${Math.min(100, releasedPct)}%` },
                  isFullyReleased
                    ? { backgroundColor: colors.green }
                    : { backgroundColor: colors.orange },
                ]}
              />
            </View>
          )}

          <AppText
            weight="bold"
            style={[
              styles.progressLabel,
              { color: colors.textDim },
              isMobile && { fontSize: 11.5 },
              isSmallPhone && { fontSize: 10.8 },
            ]}
          >
            {releasedPct}%
          </AppText>

          <FontAwesome5
            name={open ? "chevron-up" : "chevron-down"}
            size={isMobile ? 10 : 12}
            color={colors.textMuted}
          />
        </View>
      </Pressable>

      {/* ── Expanded Body ──────────────────────────────────────────── */}
      {open && (
        <View
          style={[
            styles.body,
            { borderTopColor: colors.border },
            isMobile && { paddingHorizontal: 14 },
          ]}
        >
          {/* Summary */}
          <View
            style={[
              styles.summary,
              isMobile && { paddingTop: 10, paddingBottom: 12, gap: 7 },
            ]}
          >
            <View
              style={[
                styles.summaryRow,
                isSmallPhone && styles.summaryRowStacked,
              ]}
            >
              <AppText
                style={[
                  styles.summaryLabel,
                  { color: colors.textDim },
                  isMobile && { fontSize: 12.5 },
                ]}
              >
                Worker payout total
              </AppText>
              <AppText
                weight="semibold"
                style={[
                  styles.summaryValue,
                  { color: colors.text },
                  isMobile && { fontSize: 12.5 },
                ]}
              >
                {formatMoney(workerPayout, currency)}
              </AppText>
            </View>

            <View
              style={[
                styles.summaryRow,
                isSmallPhone && styles.summaryRowStacked,
              ]}
            >
              <AppText
                style={[
                  styles.summaryLabel,
                  { color: colors.textDim },
                  isMobile && { fontSize: 12.5 },
                ]}
              >
                Released so far
              </AppText>
              <AppText
                weight="semibold"
                style={[
                  styles.summaryValue,
                  { color: colors.orange },
                  isMobile && { fontSize: 12.5 },
                ]}
              >
                {formatMoney(releasedAmount, currency)} ({releasedPct}%)
              </AppText>
            </View>

            <View
              style={[
                styles.summaryDivider,
                { backgroundColor: colors.border },
              ]}
            />

            <View
              style={[
                styles.summaryRow,
                isSmallPhone && styles.summaryRowStacked,
              ]}
            >
              <AppText
                weight="bold"
                style={[
                  styles.summaryLabelStrong,
                  { color: colors.text },
                  isMobile && { fontSize: 12.5 },
                ]}
              >
                Remaining in escrow
              </AppText>
              <AppText
                weight="displayBlack"
                style={[
                  styles.summaryValueStrong,
                  { color: isFullyReleased ? colors.green : colors.orange },
                  isMobile && { fontSize: 14 },
                  isVerySmallPhone && { fontSize: 13 },
                ]}
              >
                {formatMoney(remaining, currency)}
              </AppText>
            </View>

            {isFullyReleased && (
              <View
                style={[
                  styles.fullyReleasedNote,
                  {
                    backgroundColor: colors.greenDim,
                    borderColor: "rgba(34, 197, 94, 0.3)",
                  },
                ]}
              >
                <FontAwesome5
                  name="lock"
                  size={11}
                  color={colors.green}
                  style={{ marginRight: 6 }}
                />
                <AppText
                  weight="semibold"
                  style={{
                    color: colors.green,
                    fontSize: isMobile ? 11.5 : 12,
                  }}
                >
                  All funds have been released. This payment is closed.
                </AppText>
              </View>
            )}
          </View>

          {/* Timeline */}
          <View
            style={[styles.timelineWrap, { borderTopColor: colors.border }]}
          >
            <AppText
              weight="bold"
              style={[
                styles.timelineTitle,
                { color: colors.textMuted },
                isMobile && { fontSize: 10.4, marginTop: 8 },
              ]}
            >
              Release history
            </AppText>

            <View style={styles.timeline}>
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
                  <View
                    key={r.id}
                    style={[
                      styles.timelineItem,
                      isMobile && { gap: 8, paddingBottom: 10 },
                    ]}
                  >
                    <View
                      style={[
                        styles.timelineMarkerCol,
                        isVerySmallPhone && { width: 8, paddingTop: 3 },
                      ]}
                    >
                      <View
                        style={[
                          styles.timelineDot,
                          { borderColor: colors.orange },
                          isLatest
                            ? {
                                backgroundColor: colors.orange,
                                shadowColor: colors.orange,
                                shadowOpacity: 0.15,
                                shadowRadius: 4,
                                elevation: 2,
                              }
                            : { backgroundColor: colors.orangeDim },
                          isVerySmallPhone && { width: 8, height: 8 },
                        ]}
                      />
                      {i < sortedReleases.length - 1 && (
                        <View
                          style={[
                            styles.timelineLine,
                            { backgroundColor: colors.border },
                          ]}
                        />
                      )}
                    </View>

                    <View style={styles.timelineBody}>
                      <View style={styles.timelineTopRow}>
                        <AppText
                          weight="displayBlack"
                          style={[
                            styles.timelineAmount,
                            { color: colors.text },
                            isMobile && { fontSize: 13.6 },
                          ]}
                        >
                          {formatMoney(r.amount, r.currency || currency)}
                        </AppText>
                        {isLatest && (
                          <View
                            style={[
                              styles.timelineBadge,
                              {
                                backgroundColor: colors.orangeDim,
                                borderColor: colors.orangeGlow,
                              },
                              isMobile && {
                                paddingVertical: 2,
                                paddingHorizontal: 6,
                              },
                            ]}
                          >
                            <AppText
                              weight="bold"
                              style={[
                                styles.timelineBadgeText,
                                { color: colors.orange },
                                isMobile && { fontSize: 9.6 },
                              ]}
                            >
                              LATEST
                            </AppText>
                          </View>
                        )}
                      </View>

                      <View style={styles.timelineMeta}>
                        <View style={styles.timelineMetaItem}>
                          <FontAwesome5
                            name="clock"
                            size={isMobile ? 9.6 : 11}
                            color={colors.textMuted}
                          />
                          <AppText
                            style={{
                              color: colors.textDim,
                              fontSize: isMobile ? 11 : 11.5,
                            }}
                          >
                            {formatDateTime(r.createdAt)}
                          </AppText>
                        </View>
                        <View style={styles.timelineMetaItem}>
                          <FontAwesome5
                            name="user"
                            size={isMobile ? 9.6 : 11}
                            color={colors.textMuted}
                          />
                          <AppText
                            style={{
                              color: colors.textDim,
                              fontSize: isMobile ? 11 : 11.5,
                            }}
                          >
                            {releasedByLabel}
                          </AppText>
                        </View>
                      </View>

                      {r.note && (
                        <AppText
                          style={[
                            styles.timelineNote,
                            { color: colors.textDim },
                            isMobile && { fontSize: 11.2 },
                          ]}
                        >
                          <AppText
                            weight="bold"
                            style={{ color: colors.textMuted }}
                          >
                            Note:{" "}
                          </AppText>
                          {r.note}
                        </AppText>
                      )}

                      {(r.remainingBefore != null ||
                        r.remainingAfter != null) && (
                        <View
                          style={[
                            styles.timelineSnapshot,
                            {
                              backgroundColor: colors.bgInput,
                              borderColor: colors.border,
                            },
                            isSmallPhone && { flexDirection: "column", gap: 6 },
                          ]}
                        >
                          {r.remainingBefore != null && (
                            <View
                              style={[
                                styles.snapshotItem,
                                isSmallPhone && styles.snapshotItemStacked,
                              ]}
                            >
                              <AppText
                                weight="bold"
                                style={[
                                  styles.snapshotLabel,
                                  { color: colors.textMuted },
                                ]}
                              >
                                BEFORE
                              </AppText>
                              <AppText
                                weight="bold"
                                style={[
                                  styles.snapshotValue,
                                  { color: colors.text },
                                  isSmallPhone && { fontSize: 11 },
                                ]}
                              >
                                {formatMoney(
                                  r.remainingBefore,
                                  r.currency || currency,
                                )}
                              </AppText>
                            </View>
                          )}
                          {r.remainingAfter != null && (
                            <View
                              style={[
                                styles.snapshotItem,
                                isSmallPhone && styles.snapshotItemStacked,
                              ]}
                            >
                              <AppText
                                weight="bold"
                                style={[
                                  styles.snapshotLabel,
                                  { color: colors.textMuted },
                                ]}
                              >
                                AFTER
                              </AppText>
                              <AppText
                                weight="bold"
                                style={[
                                  styles.snapshotValue,
                                  { color: colors.text },
                                  isSmallPhone && { fontSize: 11 },
                                ]}
                              >
                                {formatMoney(
                                  r.remainingAfter,
                                  r.currency || currency,
                                )}
                              </AppText>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    borderWidth: 1,
    borderRadius: 14,
    marginBottom: 16,
    overflow: "hidden",
    width: "100%",
    maxWidth: "100%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
    width: "100%",
  },
  headerMobile: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 8,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  headerLeftMobile: {
    gap: 8,
  },
  headerIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerIconMobile: {
    width: 30,
    height: 30,
    borderRadius: 8,
  },
  headerIconVerySmall: {
    width: 26,
    height: 26,
    borderRadius: 6,
  },
  headerTextCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 14.4,
    marginBottom: 2,
  },
  headerSub: {
    fontSize: 12,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
    fontSize: 12,
    minWidth: 32,
    textAlign: "right",
  },
  body: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
  },
  summary: {
    paddingTop: 12,
    paddingBottom: 14,
    gap: 8,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    width: "100%",
    flexWrap: "wrap",
  },
  summaryRowStacked: {
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 2,
  },
  summaryLabel: {
    fontSize: 13.1,
    flex: 1,
  },
  summaryValue: {
    fontSize: 13.1,
    textAlign: "right",
    maxWidth: "60%",
  },
  summaryDivider: {
    height: 1,
    marginVertical: 4,
  },
  summaryLabelStrong: {
    fontSize: 13.1,
    flex: 1,
  },
  summaryValueStrong: {
    fontSize: 15.2,
    textAlign: "right",
    maxWidth: "60%",
  },
  fullyReleasedNote: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 6,
  },
  timelineWrap: {
    paddingTop: 6,
    borderTopWidth: 1,
    borderStyle: "dashed",
  },
  timelineTitle: {
    fontSize: 11.2,
    letterSpacing: 0.08 * 11.2,
    marginTop: 10,
    marginBottom: 8,
  },
  timeline: {
    width: "100%",
  },
  timelineItem: {
    flexDirection: "row",
    gap: 10,
    paddingBottom: 12,
  },
  timelineMarkerCol: {
    alignItems: "center",
    width: 10,
    paddingTop: 4,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
    minHeight: 20,
  },
  timelineBody: {
    flex: 1,
  },
  timelineTopRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 6,
  },
  timelineAmount: {
    fontSize: 14.4,
  },
  timelineBadge: {
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  timelineBadgeText: {
    fontSize: 9.6,
    letterSpacing: 0.06 * 9.6,
  },
  timelineMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 4,
  },
  timelineMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  timelineNote: {
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 4,
    lineHeight: 18,
  },
  timelineSnapshot: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  snapshotItem: {
    flexDirection: "column",
    gap: 2,
    flex: 1,
  },
  snapshotItemStacked: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  snapshotLabel: {
    fontSize: 9.6,
    letterSpacing: 0.06 * 9.6,
  },
  snapshotValue: {
    fontSize: 11.5,
  },
});
