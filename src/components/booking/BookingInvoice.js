// src/components/booking/BookingInvoice.js
import React, { useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useTranslation } from "react-i18next";
import { FaFileAlt, FaSpinner } from "../../icons/fa";

import AppText from "../AppText";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";

function buildInvoiceHtml(booking) {
  const cur = booking.currency || "NGN";
  const amount = booking.payment?.amount || booking.agreedRate || 0;
  const platformFee = booking.payment?.platformFee || 0;
  const workerPayout = booking.payment?.workerPayout || 0;
  const scheduled = booking.scheduledAt
    ? new Date(booking.scheduledAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:sans-serif;background:#fff;color:#111;padding:40px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px}
    .logo{font-size:24px;font-weight:900}
    .logo span{color:#f97316}
    .meta{text-align:right}
    .meta h1{font-size:28px;font-weight:900;color:#f97316}
    .meta p{font-size:13px;color:#666;margin-top:4px}
    hr{border:none;border-top:1px solid #e5e7eb;margin:24px 0}
    .parties{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-bottom:32px}
    .party h3{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#999;margin-bottom:8px}
    .party p{font-size:14px;color:#111;font-weight:600}
    table{width:100%;border-collapse:collapse;margin-bottom:24px}
    th{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#999;font-weight:600;padding:8px 12px;text-align:left;border-bottom:1px solid #e5e7eb}
    td{padding:12px;font-size:13px;color:#111;border-bottom:1px solid #f3f4f6}
    td:last-child{text-align:right;font-weight:600}
    .totals{margin-left:auto;width:240px}
    .total-row{display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:#666}
    .total-row.final{font-size:16px;font-weight:800;color:#111;border-top:2px solid #111;padding-top:12px;margin-top:6px}
    .footer{margin-top:48px;padding-top:24px;border-top:1px solid #e5e7eb;text-align:center;font-size:11px;color:#999}
  </style></head><body>
    <div class="header">
      <div class="logo">Skilled<span>Proz</span></div>
      <div class="meta"><h1>INVOICE</h1>
        <p>#SKP-${(booking.id || "").slice(-8).toUpperCase()}</p>
        <p>Date: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
      </div>
    </div>
    <div class="parties">
      <div class="party"><h3>Billed To (Hirer)</h3>
        <p>${booking.hirer?.firstName || ""} ${booking.hirer?.lastName || ""}</p>
      </div>
      <div class="party"><h3>Service Provider (Worker)</h3>
        <p>${booking.worker?.firstName || ""} ${booking.worker?.lastName || ""}</p>
      </div>
    </div>
    <hr/>
    <table><thead><tr>
      <th>Service</th><th>Category</th><th>Date</th><th>Duration</th><th>Amount</th>
    </tr></thead><tbody><tr>
      <td>${booking.title || "—"}</td>
      <td>${booking.category?.name || "—"}</td>
      <td>${scheduled}</td>
      <td>${booking.estimatedHours ? `${booking.estimatedHours}h` : "—"}</td>
      <td>${cur} ${Number(amount).toLocaleString()}</td>
    </tr></tbody></table>
    <div class="totals">
      <div class="total-row"><span>Subtotal</span><span>${cur} ${Number(booking.agreedRate || 0).toLocaleString()}</span></div>
      ${
        booking.payment
          ? `
        <div class="total-row"><span>Platform Fee</span><span>− ${cur} ${Number(platformFee).toLocaleString()}</span></div>
        <div class="total-row"><span>Worker Payout</span><span>${cur} ${Number(workerPayout).toLocaleString()}</span></div>
      `
          : ""
      }
      <div class="total-row final"><span>Total Paid</span><span>${cur} ${Number(amount).toLocaleString()}</span></div>
    </div>
    <div class="footer">
      <p>SkilledProz Global Skills Marketplace · support@skilledproz.com</p>
      <p style="margin-top:6px;">Booking ID: ${booking.id} · Status: ${booking.status}</p>
    </div>
  </body></html>`;
}

export default function BookingInvoice({ booking, trigger = true }) {
  const { t } = useTranslation();
  const { theme: th } = useTheme();
  const { toast } = useToast();
  const c = th.colors;
  const [loading, setLoading] = useState(false);

  const handlePrint = async () => {
    setLoading(true);
    try {
      const html = buildInvoiceHtml(booking);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: "Invoice",
        });
      } else {
        toast.info("Sharing not available on this device.");
      }
    } catch {
      toast.error("Failed to generate invoice.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Pressable
      onPress={handlePrint}
      disabled={loading}
      style={[styles.btn, { backgroundColor: c.bgCard, borderColor: c.border }]}
    >
      {loading ? (
        <FaSpinner size={11} color={c.textDim} />
      ) : (
        <FaFileAlt size={11} color={c.textDim} />
      )}
      <AppText
        variant="small"
        weight="semibold"
        tone="dim"
        style={{ marginLeft: 6 }}
      >
        {t("booking.button.downloadInvoice")}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
});
