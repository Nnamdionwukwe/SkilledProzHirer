import React, { useState, useMemo } from "react";
import { View, Pressable, StyleSheet, LayoutAnimation } from "react-native";
import { useTranslation } from "react-i18next";
import {
  FaChevronDown,
  FaChevronUp,
  FaMoneyBillWave,
  FaUser,
  FaClock,
  FaLock,
  FaCheckCircle,
} from "../../icons/fa";
import AppText from "../AppText";
import { useTheme } from "../../contexts/ThemeContext";

function formatMoney(amount, currency = "NGN") {
  const n = Number(amount);
  if (amount == null || isNaN(n)) return "—";
  return `${currency} ${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatDateTime(date) {
  if (!date) return "—";
  const d = new Date(date);
  return `${d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} · ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

export default function BookingReleaseDetails({
  payment,
  currency: currencyProp,
  defaultOpen = false,
}) {
  const { t } = useTranslation();
  const { theme: th } = useTheme();
  const c = th.colors;
  const [open, setOpen] = useState(defaultOpen);

  const releases = Array.isArray(payment?.releases) ? payment.releases : [];
  const hasReleases = releases.length > 0;

  if (!hasReleases) return null;

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

  const toggleOpen = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((v) => !v);
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: c.bgPanel, borderColor: c.border },
      ]}
    >
      <Pressable style={styles.header} onPress={toggleOpen}>
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.headerIcon,
              { backgroundColor: c.orangeDim, borderColor: c.orangeGlow },
            ]}
          >
            {isFullyReleased ? (
              <FaCheckCircle color={c.orange} />
            ) : (
              <FaMoneyBillWave color={c.orange} />
            )}
          </View>
          <View style={styles.headerTextCol}>
            <AppText variant="body" weight="bold" style={{ color: c.text }}>
              {isFullyReleased
                ? t("booking.release.title")
                : `${t("booking.release.details")} (${releaseCount})`}
            </AppText>
            <AppText variant="small" tone="dim">
              {formatMoney(releasedAmount, currency)}{" "}
              {t("booking.release.released")}
              {!isFullyReleased &&
                ` · ${formatMoney(remaining, currency)} ${t("booking.release.stillInEscrow")}`}
            </AppText>
          </View>
        </View>
        <View style={styles.headerRight}>
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
                  backgroundColor: isFullyReleased ? "#16a34a" : c.orange,
                },
              ]}
            />
          </View>
          <AppText variant="small" weight="bold" tone="dim">
            {releasedPct}%
          </AppText>
          {open ? (
            <FaChevronUp size={12} color={c.textMuted} />
          ) : (
            <FaChevronDown size={12} color={c.textMuted} />
          )}
        </View>
      </Pressable>

      {open && (
        <View style={[styles.body, { borderTopColor: c.border }]}>
          <View style={styles.summary}>
            <View style={styles.row}>
              <AppText tone="dim">
                {t("booking.release.workerPayoutTotal")}
              </AppText>
              <AppText weight="semibold">
                {formatMoney(workerPayout, currency)}
              </AppText>
            </View>
            <View style={styles.row}>
              <AppText tone="dim">{t("booking.release.releasedSoFar")}</AppText>
              <AppText weight="semibold" style={{ color: c.orange }}>
                {formatMoney(releasedAmount, currency)} ({releasedPct}%)
              </AppText>
            </View>
            <View style={[styles.divider, { backgroundColor: c.border }]} />
            <View style={styles.row}>
              <AppText weight="bold">
                {t("booking.release.remainingInEscrow")}
              </AppText>
              <AppText
                weight="bold"
                style={{
                  color: isFullyReleased ? "#16a34a" : c.orange,
                  fontSize: 16,
                }}
              >
                {formatMoney(remaining, currency)}
              </AppText>
            </View>
            {isFullyReleased && (
              <View
                style={[
                  styles.noteBox,
                  { backgroundColor: "#dcfce7", borderColor: "#bbf7d0" },
                ]}
              >
                <FaLock size={12} color="#166534" style={{ marginRight: 6 }} />
                <AppText style={{ color: "#166534", fontSize: 12 }}>
                  {t("booking.release.allFunds")}
                </AppText>
              </View>
            )}
          </View>

          <View style={[styles.timelineWrap, { borderTopColor: c.border }]}>
            <AppText
              variant="small"
              weight="bold"
              tone="dim"
              style={styles.timelineTitle}
            >
              {t("booking.release.history")}
            </AppText>
            {sortedReleases.map((r, i) => {
              const isLatest = i === 0;
              const by = r.releasedBy;
              const byLabel = by
                ? by.role === "HIRER"
                  ? `Hirer · ${by.firstName ?? ""} ${by.lastName ?? ""}`.trim()
                  : by.role === "ADMIN"
                    ? `Admin · ${by.firstName ?? ""} ${by.lastName ?? ""}`.trim()
                    : `${by.firstName ?? ""} ${by.lastName ?? ""}`.trim() ||
                      "System"
                : "System";

              return (
                <View key={r.id} style={styles.timelineItem}>
                  <View style={styles.markerCol}>
                    <View
                      style={[
                        styles.dot,
                        {
                          backgroundColor: isLatest ? c.orange : c.orangeDim,
                          borderColor: c.orange,
                        },
                      ]}
                    />
                    {i < sortedReleases.length - 1 && (
                      <View
                        style={[styles.line, { backgroundColor: c.border }]}
                      />
                    )}
                  </View>
                  <View style={styles.timelineBody}>
                    <View style={styles.timelineTopRow}>
                      <AppText weight="bold" style={{ fontSize: 14 }}>
                        {formatMoney(r.amount, r.currency || currency)}
                      </AppText>
                      {isLatest && (
                        <View
                          style={[
                            styles.badge,
                            {
                              backgroundColor: c.orangeDim,
                              borderColor: c.orangeGlow,
                            },
                          ]}
                        >
                          <AppText
                            style={{
                              color: c.orange,
                              fontSize: 9,
                              fontWeight: "bold",
                            }}
                          >
                            {t("booking.release.latest")}
                          </AppText>
                        </View>
                      )}
                    </View>
                    <View style={styles.metaRow}>
                      <AppText variant="small" tone="dim">
                        <FaClock size={10} /> {formatDateTime(r.createdAt)}
                      </AppText>
                      <AppText variant="small" tone="dim">
                        <FaUser size={10} /> {byLabel}
                      </AppText>
                    </View>
                    {r.note && (
                      <AppText
                        variant="small"
                        tone="dim"
                        style={{ fontStyle: "italic", marginTop: 4 }}
                      >
                        <AppText weight="bold">
                          {t("booking.release.note")}
                        </AppText>{" "}
                        {r.note}
                      </AppText>
                    )}
                    {(r.remainingBefore != null ||
                      r.remainingAfter != null) && (
                      <View
                        style={[
                          styles.snapshotBox,
                          { backgroundColor: c.bgInput, borderColor: c.border },
                        ]}
                      >
                        {r.remainingBefore != null && (
                          <View style={styles.snapItem}>
                            <AppText variant="small" tone="dim">
                              {t("booking.release.before")}
                            </AppText>
                            <AppText variant="small" weight="bold">
                              {formatMoney(
                                r.remainingBefore,
                                r.currency || currency,
                              )}
                            </AppText>
                          </View>
                        )}
                        {r.remainingAfter != null && (
                          <View style={styles.snapItem}>
                            <AppText variant="small" tone="dim">
                              {t("booking.release.after")}
                            </AppText>
                            <AppText variant="small" weight="bold">
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 14,
    marginBottom: 16,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    gap: 10,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  headerIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextCol: { flex: 1 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  progressWrap: {
    width: 60,
    height: 6,
    borderRadius: 3,
    borderWidth: 1,
    overflow: "hidden",
  },
  progressBar: { height: "100%", borderRadius: 3 },
  body: { paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: 1 },
  summary: { paddingVertical: 12, gap: 8 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  divider: { height: 1, marginVertical: 4 },
  noteBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  timelineWrap: { borderTopWidth: 1, paddingTop: 12, marginTop: 8 },
  timelineTitle: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },
  timelineItem: { flexDirection: "row", gap: 10, paddingBottom: 16 },
  markerCol: { alignItems: "center", width: 10, paddingTop: 4 },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  line: { flex: 1, width: 2, marginTop: 4, minHeight: 20 },
  timelineBody: { flex: 1, gap: 4 },
  timelineTopRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  snapshotBox: {
    flexDirection: "row",
    gap: 16,
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 4,
  },
  snapItem: { gap: 2 },
});
