// src/utils/receipt.js

const STATUS_LABELS = {
  PENDING: "Pending Review",
  PROCESSING: "Processing",
  COMPLETED: "Completed",
  SUCCESS: "Success",
  FAILED: "Failed",
  REVERSED: "Reversed",
  CANCELLED: "Cancelled",
  INITIATED: "Initiated",
};

const TYPE_LABELS = {
  DEPOSIT: "Deposit",
  WITHDRAWAL: "Withdrawal",
  PAYMENT: "Payment",
  SUBSCRIPTION: "Subscription",
  REFUND: "Refund",
  BONUS: "Bonus",
  ADJUSTMENT: "Adjustment",
};

function formatCurrency(amount, currency = "NGN") {
  const numAmount =
    typeof amount === "number" ? amount : parseFloat(amount) || 0;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(numAmount);
  } catch {
    return `${currency} ${numAmount.toFixed(2)}`;
  }
}

function formatDateLong(date) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTransactionLabel(type) {
  return TYPE_LABELS[type] || type;
}

function getPaymentChannel(tx) {
  if (tx.type === "SUBSCRIPTION") return "Subscription";
  return "Payment";
}

// ─── Shared Styles ────────────────────────────────────────────────────────
function getStyles(isDark) {
  const bg = isDark ? "#080810" : "#f8f9fa";
  const panel = isDark ? "#0c0c18" : "#ffffff";
  const text = isDark ? "#ffffff" : "#1a1a2e";
  const textDim = isDark ? "#a1a1aa" : "#6b7280";
  const border = isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb";
  const borderDash = isDark ? "rgba(255,255,255,0.15)" : "#e5e7eb";
  const footerBg = isDark ? "#0c0c18" : "#f9fafb";
  const tearColor = isDark ? "#080810" : "#f9fafb";

  return `
    * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: ${bg};
      color: ${text};
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      align-items: center;
      min-height: 100vh;
      padding: 20px;
    }
    .receipt {
      max-width: 520px;
      width: 100%;
      background: ${panel};
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0,0,0,${isDark ? "0.4" : "0.1"});
      border: 1px solid ${border};
    }
    .receipt-header {
      background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
      color: #ffffff;
      padding: 32px 32px 24px;
      text-align: center;
    }
    .receipt-header .logo {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 56px;
      height: 56px;
      background: rgba(255,255,255,0.2);
      border-radius: 14px;
      margin-bottom: 12px;
    }
    .receipt-header h1 { font-size: 24px; font-weight: 800; letter-spacing: -0.02em; color: #fff; }
    .receipt-header .subtitle { font-size: 13px; opacity: 0.9; margin-top: 4px; color: #fff; }
    .receipt-status {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 16px;
      padding: 6px 16px;
      background: rgba(255,255,255,0.2);
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: #fff;
    }
    .receipt-amount {
      text-align: center;
      padding: 28px 32px 24px;
      border-bottom: 2px dashed ${borderDash};
    }
    .receipt-amount .label {
      font-size: 12px;
      color: ${textDim};
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 700;
    }
    .receipt-amount .value {
      font-size: 36px;
      font-weight: 800;
      margin-top: 8px;
      letter-spacing: -0.02em;
    }
    .receipt-amount .value.credit { color: #22c55e; }
    .receipt-amount .value.debit { color: #ef4444; }
    .receipt-amount .channel {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 12px;
      padding: 4px 12px;
      background: rgba(249, 115, 22, 0.15);
      color: #f97316;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
    }
    .receipt-body { padding: 24px 32px; }
    .row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid ${border};
      gap: 16px;
    }
    .row:last-child { border-bottom: none; }
    .row .label { color: ${textDim}; font-size: 13px; font-weight: 500; flex-shrink: 0; }
    .row .value { color: ${text}; font-size: 13px; font-weight: 600; text-align: right; word-break: break-word; }
    .row .value.mono { font-family: 'SF Mono', Menlo, monospace; font-size: 12px; }
    .row.section-title { padding-top: 18px; padding-bottom: 6px; border-bottom: none; }
    .row.section-title .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: ${textDim}; font-weight: 800; }
    .fee-row { color: #f97316; }
    .net-row { margin-top: 8px; padding-top: 16px; border-top: 2px solid ${border}; border-bottom: none; }
    .net-row .label { font-weight: 700; color: ${text}; }
    .net-row .value { font-size: 16px; font-weight: 800; color: #22c55e; }
    .receipt-footer { padding: 24px 32px; background: ${footerBg}; text-align: center; font-size: 12px; color: ${textDim}; }
    .receipt-footer strong { color: ${text}; }
    .tear-line { height: 16px; background-image: radial-gradient(circle, ${tearColor} 4px, transparent 4px); background-size: 16px 16px; background-position: -8px 50%; background-color: ${footerBg}; }
  `;
}

// ─── Receipt Body (Pure Content) ──────────────────────────────────────────
function getReceiptContent(transaction) {
  const isCredit = false;
  const amountPrefix = "-";
  const channel = getPaymentChannel(transaction);
  const statusLabel = STATUS_LABELS[transaction.status] || transaction.status;

  return `
  <div class="receipt">
    <div class="receipt-header">
      <div class="logo">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="M8 12h8" /><path d="M8 8h4" /><path d="M8 16h6" />
        </svg>
      </div>
      <h1>SkilledProz</h1>
      <p class="subtitle">Transaction Receipt</p>
      <div class="receipt-status">${statusLabel}</div>
    </div>

    <div class="receipt-amount">
      <div class="label">${isCredit ? "Amount Received" : "Amount Charged"}</div>
      <div class="value ${isCredit ? "credit" : "debit"}">${amountPrefix} ${formatCurrency(transaction.amount, transaction.currency)}</div>
      <div class="channel">${channel}</div>
    </div>

    <div class="receipt-body">
      <div class="row section-title"><span class="label">Transaction</span></div>
      <div class="row"><span class="label">Reference</span><span class="value mono">${transaction.reference}</span></div>
      <div class="row"><span class="label">Type</span><span class="value">${getTransactionLabel(transaction.type)}</span></div>
      <div class="row"><span class="label">Date</span><span class="value">${formatDateLong(transaction.createdAt)}</span></div>
      ${transaction.completedAt ? `<div class="row"><span class="label">Completed</span><span class="value">${formatDateLong(transaction.completedAt)}</span></div>` : ""}
      ${transaction.description ? `<div class="row"><span class="label">Description</span><span class="value">${transaction.description}</span></div>` : ""}

      <div class="row section-title"><span class="label">Breakdown</span></div>
      <div class="row"><span class="label">Gross Amount</span><span class="value">${formatCurrency(transaction.amount, transaction.currency)}</span></div>
      <div class="row fee-row"><span class="label">Platform Fee</span><span class="value">- ${formatCurrency(transaction.fee || 0, transaction.currency)}</span></div>
      <div class="row net-row"><span class="label">Net Amount</span><span class="value">${formatCurrency(transaction.netAmount || transaction.amount, transaction.currency)}</span></div>

      ${
        transaction.meta?.paymentProvider
          ? `
      <div class="row section-title"><span class="label">Payment Details</span></div>
      <div class="row"><span class="label">Provider</span><span class="value">${transaction.meta.paymentProvider}</span></div>
      ${transaction.meta?.transactionId ? `<div class="row"><span class="label">Provider Ref</span><span class="value mono">${transaction.meta.transactionId}</span></div>` : ""}
      `
          : ""
      }
    </div>

    <div class="tear-line"></div>
    <div class="receipt-footer">
      <p>Thank you for using <strong>SkilledProz</strong></p>
      <p style="margin-top: 6px;">This is an electronically generated receipt. No signature required.</p>
      <p style="margin-top: 8px; font-size: 11px;">Refund policy: <strong>skilledproz.com/refund-policy</strong></p>
      <p style="margin-top: 6px; font-size: 11px;">skilledproz.com · support@skilledproz.com</p>
    </div>
  </div>
  `;
}

// ─── 1. For WebView (Includes the Share Button) ───────────────────────────
export function generateReceiptHTML(transaction, isDark = true) {
  const bg = isDark ? "#080810" : "#f8f9fa";
  const panel = isDark ? "#0c0c18" : "#ffffff";
  const text = isDark ? "#ffffff" : "#1a1a2e";
  const border = isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Receipt - ${transaction.reference}</title>
  <style>
    ${getStyles(isDark)}
    
    body { padding-top: 80px; }
    
    .action-bar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: ${panel};
      border-bottom: 1px solid ${border};
      display: flex;
      justify-content: center;
      gap: 12px;
      padding: 14px;
      z-index: 100;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    .btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px 32px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid ${border};
      background: ${bg};
      color: ${text};
      outline: none;
      transition: opacity 0.2s;
      font-family: inherit;
      -webkit-user-select: none;
      user-select: none;
    }
    .btn:active { opacity: 0.7; }
    .btn-primary {
      background: #f97316;
      color: #fff;
      border-color: #f97316;
    }
  </style>
</head>
<body>
  <div class="action-bar">
    <button
      type="button"
      class="btn btn-primary"
      onclick="try { window.ReactNativeWebView.postMessage('share'); } catch(e) { document.title='ERR:'+e.message; }"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
      Share Receipt
    </button>
  </div>

  ${getReceiptContent(transaction)}
</body>
</html>`;
}

// ─── 2. For Print/PDF (Only the Receipt, No Action Bar) ───────────────────
export function generatePrintableHTML(transaction, isDark = true) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Receipt - ${transaction.reference}</title>
  <style>
    ${getStyles(isDark)}
    
    /* Padding for PDF margin */
    body { padding: 40px 20px; }
  </style>
</head>
<body>
  ${getReceiptContent(transaction)}
</body>
</html>`;
}
