// src/icons/fa.js
//
// Drop-in replacement for `react-icons/fa` that works in React Native.
// Renders icons as <Svg><Path /></Svg> via react-native-svg.
//
// Import FaXxx icons from here instead of from "react-icons/fa".

import React from "react";
import Svg, { Path } from "react-native-svg";

// react-icons 5.x exposes each icon as:
//   { default: IconGen, ... }
// where IconGen is a function with `.displayName` and a static `data` object:
//   { data: { ... }, iconName: "FaArrowLeft", ... }
// And the raw SVG lives in `IconGen.icon[1].children[0][1].d` (or similar).
//
// Rather than relying on internals (which vary by version), we
// reconstruct the SVG path by parsing the rendered output of the
// react-icons component once and caching the result.

// Named re-exports: we import each icon by name from react-icons/fa.
// If an icon isn't in this list, it won't be available — add it if needed.
import {
  FaArrowLeft,
  FaExclamationTriangle,
  FaTimes,
  FaCheckCircle,
  FaExclamationCircle,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaMoneyBillWave,
  FaClock,
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
  FaSpinner,
  FaUndo,
  FaPhone,
  FaCommentDots,
  FaCreditCard,
  FaGift,
  FaBolt,
  FaInfoCircle,
  FaChevronUp,
  FaChevronDown,
  FaLock,
  FaUser,
  FaMap,
  FaDollarSign,
  FaTag,
  FaAward,
  FaHome,
  FaCoffee,
  FaLink,
  FaEnvelope,
  FaWhatsapp,
  FaSyncAlt,
  FaLocationArrow,
  FaBookOpen,
  FaChartLine,
  FaAlignLeft,
  FaClipboardCheck,
  FaChevronRight,
  FaSearch,
  FaHistory,
  FaTimesCircle,
  FaPhoneSlash,
  FaVideo,
  FaImage,
  FaTrashAlt,
  FaTrash,
  FaFileImage,
  FaPercent,
  FaFileInvoice,
  FaDownload,
  FaEye,
  FaExpand,
  FaCompress,
  FaEdit,
  FaSignOutAlt,
} from "react-icons/fa";

// ─── Extract the SVG path data ───────────────────────────────────────────
// react-icons 5.x stores the SVG path inside `[Icon].icon[1].children[n][1].d`
// but the exact index varies. Instead of relying on it, we use a small trick:
// we render the icon to a string via `React.createElement` and parse it.
// Actually simpler — react-icons exposes the icon data at `.icon` on the
// component function itself. We read from there.

const PATH_CACHE = new Map();

function getPathData(Icon, iconName) {
  if (PATH_CACHE.has(iconName)) return PATH_CACHE.get(iconName);

  let pathD = null;

  try {
    // react-icons 5.x: Icon.icon = ["svg", { children: [...] }, ...]
    const iconTree = Icon?.icon;
    if (Array.isArray(iconTree)) {
      const attrs = iconTree[1];
      if (attrs) {
        // Case 1: children contain a single <path>
        if (Array.isArray(attrs.children)) {
          for (const child of attrs.children) {
            if (Array.isArray(child) && child[0] === "path") {
              pathD = child[1]?.d || pathD;
              if (pathD) break;
            }
          }
        }
        // Case 2: path is directly at attrs.d
        if (!pathD && attrs.d) pathD = attrs.d;
      }
    }
  } catch {}

  // Fallback for older react-icons structures
  if (!pathD) {
    try {
      pathD =
        Icon?.data?.path ||
        Icon?.data?.attributes?.path ||
        Icon?.icon?.[1]?.attributes?.d;
    } catch {}
  }

  // Last resort — parse the toString
  if (!pathD) {
    try {
      const src = Icon?.toString?.() || "";
      const m = src.match(/<path[^>]*d=["']([^"']+)["']/i);
      if (m) pathD = m[1];
    } catch {}
  }

  PATH_CACHE.set(iconName, pathD);
  return pathD;
}

// ─── Wrap an icon ────────────────────────────────────────────────────────
function wrapIcon(Icon, iconName) {
  function RNIcon({ size = 16, color = "#000", style, ...rest }) {
    const pathD = getPathData(Icon, iconName);
    if (!pathD) {
      // Fallback: render a small colored square so layout doesn't collapse
      return (
        <Svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          style={style}
          {...rest}
        >
          <Path d="M4 4h16v16H4z" fill={color} opacity={0.15} />
        </Svg>
      );
    }
    return (
      <Svg
        width={size}
        height={size}
        viewBox={Icon?.icon?.[1]?.viewBox || "0 0 512 512"}
        style={style}
        fill={color}
        {...rest}
      >
        <Path d={pathD} fill={color} />
      </Svg>
    );
  }
  RNIcon.displayName = `RN_${iconName}`;
  return RNIcon;
}

// ─── Export wrapped versions ────────────────────────────────────────────
export const FaArrowLeftW = wrapIcon(FaArrowLeft, "FaArrowLeft");
export const FaExclamationTriangleW = wrapIcon(
  FaExclamationTriangle,
  "FaExclamationTriangle",
);
export const FaTimesW = wrapIcon(FaTimes, "FaTimes");
export const FaCheckCircleW = wrapIcon(FaCheckCircle, "FaCheckCircle");
export const FaExclamationCircleW = wrapIcon(
  FaExclamationCircle,
  "FaExclamationCircle",
);
export const FaCalendarAltW = wrapIcon(FaCalendarAlt, "FaCalendarAlt");
export const FaMapMarkerAltW = wrapIcon(FaMapMarkerAlt, "FaMapMarkerAlt");
export const FaMoneyBillWaveW = wrapIcon(FaMoneyBillWave, "FaMoneyBillWave");
export const FaClockW = wrapIcon(FaClock, "FaClock");
export const FaFlagW = wrapIcon(FaFlag, "FaFlag");
export const FaBriefcaseW = wrapIcon(FaBriefcase, "FaBriefcase");
export const FaMapPinW = wrapIcon(FaMapPin, "FaMapPin");
export const FaGlobeW = wrapIcon(FaGlobe, "FaGlobe");
export const FaHandshakeW = wrapIcon(FaHandshake, "FaHandshake");
export const FaRandomW = wrapIcon(FaRandom, "FaRandom");
export const FaFileAltW = wrapIcon(FaFileAlt, "FaFileAlt");
export const FaToolsW = wrapIcon(FaTools, "FaTools");
export const FaShieldAltW = wrapIcon(FaShieldAlt, "FaShieldAlt");
export const FaStarW = wrapIcon(FaStar, "FaStar");
export const FaHourglassHalfW = wrapIcon(FaHourglassHalf, "FaHourglassHalf");
export const FaExternalLinkAltW = wrapIcon(
  FaExternalLinkAlt,
  "FaExternalLinkAlt",
);
export const FaCheckW = wrapIcon(FaCheck, "FaCheck");
export const FaSpinnerW = wrapIcon(FaSpinner, "FaSpinner");
export const FaUndoW = wrapIcon(FaUndo, "FaUndo");
export const FaPhoneW = wrapIcon(FaPhone, "FaPhone");
export const FaCommentDotsW = wrapIcon(FaCommentDots, "FaCommentDots");
export const FaCreditCardW = wrapIcon(FaCreditCard, "FaCreditCard");
export const FaGiftW = wrapIcon(FaGift, "FaGift");
export const FaBoltW = wrapIcon(FaBolt, "FaBolt");
export const FaInfoCircleW = wrapIcon(FaInfoCircle, "FaInfoCircle");
export const FaChevronUpW = wrapIcon(FaChevronUp, "FaChevronUp");
export const FaChevronDownW = wrapIcon(FaChevronDown, "FaChevronDown");
export const FaLockW = wrapIcon(FaLock, "FaLock");
export const FaUserW = wrapIcon(FaUser, "FaUser");
export const FaMapW = wrapIcon(FaMap, "FaMap");
export const FaDollarSignW = wrapIcon(FaDollarSign, "FaDollarSign");
export const FaTagW = wrapIcon(FaTag, "FaTag");
export const FaAwardW = wrapIcon(FaAward, "FaAward");
export const FaHomeW = wrapIcon(FaHome, "FaHome");
export const FaCoffeeW = wrapIcon(FaCoffee, "FaCoffee");
export const FaLinkW = wrapIcon(FaLink, "FaLink");
export const FaEnvelopeW = wrapIcon(FaEnvelope, "FaEnvelope");
export const FaWhatsappW = wrapIcon(FaWhatsapp, "FaWhatsapp");
export const FaSyncAltW = wrapIcon(FaSyncAlt, "FaSyncAlt");
export const FaLocationArrowW = wrapIcon(FaLocationArrow, "FaLocationArrow");
export const FaBookOpenW = wrapIcon(FaBookOpen, "FaBookOpen");
export const FaChartLineW = wrapIcon(FaChartLine, "FaChartLine");
export const FaAlignLeftW = wrapIcon(FaAlignLeft, "FaAlignLeft");
export const FaClipboardCheckW = wrapIcon(FaClipboardCheck, "FaClipboardCheck");
export const FaChevronRightW = wrapIcon(FaChevronRight, "FaChevronRight");
export const FaSearchW = wrapIcon(FaSearch, "FaSearch");
export const FaHistoryW = wrapIcon(FaHistory, "FaHistory");
export const FaTimesCircleW = wrapIcon(FaTimesCircle, "FaTimesCircle");
export const FaPhoneSlashW = wrapIcon(FaPhoneSlash, "FaPhoneSlash");
export const FaVideoW = wrapIcon(FaVideo, "FaVideo");
export const FaImageW = wrapIcon(FaImage, "FaImage");
export const FaTrashAltW = wrapIcon(FaTrashAlt, "FaTrashAlt");
export const FaTrashW = wrapIcon(FaTrash, "FaTrash");
export const FaFileImageW = wrapIcon(FaFileImage, "FaFileImage");
export const FaPercentW = wrapIcon(FaPercent, "FaPercent");
export const FaFileInvoiceW = wrapIcon(FaFileInvoice, "FaFileInvoice");
export const FaDownloadW = wrapIcon(FaDownload, "FaDownload");
export const FaEyeW = wrapIcon(FaEye, "FaEye");
export const FaExpandW = wrapIcon(FaExpand, "FaExpand");
export const FaCompressW = wrapIcon(FaCompress, "FaCompress");
export const FaEditW = wrapIcon(FaEdit, "FaEdit");
export const FaSignOutAltW = wrapIcon(FaSignOutAlt, "FaSignOutAlt");

// ─── Alias WITHOUT the "W" suffix so existing imports work unchanged ────
export {
  FaArrowLeftW as FaArrowLeft,
  FaExclamationTriangleW as FaExclamationTriangle,
  FaTimesW as FaTimes,
  FaCheckCircleW as FaCheckCircle,
  FaExclamationCircleW as FaExclamationCircle,
  FaCalendarAltW as FaCalendarAlt,
  FaMapMarkerAltW as FaMapMarkerAlt,
  FaMoneyBillWaveW as FaMoneyBillWave,
  FaClockW as FaClock,
  FaFlagW as FaFlag,
  FaBriefcaseW as FaBriefcase,
  FaMapPinW as FaMapPin,
  FaGlobeW as FaGlobe,
  FaHandshakeW as FaHandshake,
  FaRandomW as FaRandom,
  FaFileAltW as FaFileAlt,
  FaToolsW as FaTools,
  FaShieldAltW as FaShieldAlt,
  FaStarW as FaStar,
  FaHourglassHalfW as FaHourglassHalf,
  FaExternalLinkAltW as FaExternalLinkAlt,
  FaCheckW as FaCheck,
  FaSpinnerW as FaSpinner,
  FaUndoW as FaUndo,
  FaPhoneW as FaPhone,
  FaCommentDotsW as FaCommentDots,
  FaCreditCardW as FaCreditCard,
  FaGiftW as FaGift,
  FaBoltW as FaBolt,
  FaInfoCircleW as FaInfoCircle,
  FaChevronUpW as FaChevronUp,
  FaChevronDownW as FaChevronDown,
  FaLockW as FaLock,
  FaUserW as FaUser,
  FaMapW as FaMap,
  FaDollarSignW as FaDollarSign,
  FaTagW as FaTag,
  FaAwardW as FaAward,
  FaHomeW as FaHome,
  FaCoffeeW as FaCoffee,
  FaLinkW as FaLink,
  FaEnvelopeW as FaEnvelope,
  FaWhatsappW as FaWhatsapp,
  FaSyncAltW as FaSyncAlt,
  FaLocationArrowW as FaLocationArrow,
  FaBookOpenW as FaBookOpen,
  FaChartLineW as FaChartLine,
  FaAlignLeftW as FaAlignLeft,
  FaClipboardCheckW as FaClipboardCheck,
  FaChevronRightW as FaChevronRight,
  FaSearchW as FaSearch,
  FaHistoryW as FaHistory,
  FaTimesCircleW as FaTimesCircle,
  FaPhoneSlashW as FaPhoneSlash,
  FaVideoW as FaVideo,
  FaImageW as FaImage,
  FaTrashAltW as FaTrashAlt,
  FaTrashW as FaTrash,
  FaFileImageW as FaFileImage,
  FaPercentW as FaPercent,
  FaFileInvoiceW as FaFileInvoice,
  FaDownloadW as FaDownload,
  FaEyeW as FaEye,
  FaExpandW as FaExpand,
  FaCompressW as FaCompress,
  FaEditW as FaEdit,
  FaSignOutAltW as FaSignOutAlt,
};
