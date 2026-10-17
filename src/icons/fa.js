// src/icons/fa.js
//
// Drop-in replacement for `react-icons/fa` that renders Ionicons
// equivalents via @expo/vector-icons. Every FaXxx named export keeps
// the same props (size, color, style) — no consumer changes needed.

import React from "react";
import { Ionicons } from "@expo/vector-icons";

// One mapping per icon name. If you find an icon that looks off-brand,
// swap the Ionicons name here — every consumer updates automatically.

const MAP = {
  FaArrowLeft: "arrow-back",
  FaExclamationTriangle: "warning",
  FaTimes: "close",
  FaCheckCircle: "checkmark-circle",
  FaExclamationCircle: "alert-circle",
  FaCalendarAlt: "calendar",
  FaMapMarkerAlt: "location",
  FaMoneyBillWave: "cash",
  FaClock: "time",
  FaFlag: "flag",
  FaBriefcase: "briefcase",
  FaMapPin: "pin",
  FaGlobe: "globe",
  FaHandshake: "hand-left",
  FaRandom: "shuffle",
  FaFileAlt: "document-text",
  FaTools: "construct",
  FaShieldAlt: "shield-checkmark",
  FaStar: "star",
  FaHourglassHalf: "hourglass",
  FaExternalLinkAlt: "open-outline",
  FaCheck: "checkmark",
  FaSpinner: "sync",
  FaUndo: "arrow-undo",
  FaPhone: "call",
  FaCommentDots: "chatbubble-ellipses",
  FaCreditCard: "card",
  FaGift: "gift",
  FaBolt: "flash",
  FaInfoCircle: "information-circle",
  FaChevronUp: "chevron-up",
  FaChevronDown: "chevron-down",
  FaLock: "lock-closed",
  FaUser: "person",
  FaMap: "map",
  FaDollarSign: "cash-outline",
  FaTag: "pricetag",
  FaAward: "ribbon",
  FaHome: "home",
  FaCoffee: "cafe",
  FaLink: "link",
  FaEnvelope: "mail",
  FaWhatsapp: "logo-whatsapp",
  FaSyncAlt: "sync",
  FaLocationArrow: "navigate",
  FaBookOpen: "book",
  FaChartLine: "trending-up",
  FaAlignLeft: "reorder-three",
  FaClipboardCheck: "clipboard",
  FaChevronRight: "chevron-forward",
  FaSearch: "search",
  FaHistory: "time-outline",
  FaTimesCircle: "close-circle",
  FaPhoneSlash: "call-outline",
  FaVideo: "videocam",
  FaImage: "image",
  FaTrashAlt: "trash",
  FaTrash: "trash",
  FaFileImage: "image-outline",
  FaPercent: "percent",
  FaFileInvoice: "receipt",
  FaDownload: "download",
  FaEye: "eye",
  FaExpand: "expand",
  FaCompress: "contract",
  FaEdit: "pencil",
  FaSignOutAlt: "log-out",
  FaCircle: "ellipse",
  FaSpinnerAlt: "sync",
};

// Build a component for each key. Renders Ionicons with the same props.
const make = (ionName) =>
  function Icon({ size = 16, color = "#000", style, ...rest }) {
    return (
      <Ionicons
        name={ionName}
        size={size}
        color={color}
        style={style}
        {...rest}
      />
    );
  };

export const FaArrowLeft = make(MAP.FaArrowLeft);
export const FaExclamationTriangle = make(MAP.FaExclamationTriangle);
export const FaTimes = make(MAP.FaTimes);
export const FaCheckCircle = make(MAP.FaCheckCircle);
export const FaExclamationCircle = make(MAP.FaExclamationCircle);
export const FaCalendarAlt = make(MAP.FaCalendarAlt);
export const FaMapMarkerAlt = make(MAP.FaMapMarkerAlt);
export const FaMoneyBillWave = make(MAP.FaMoneyBillWave);
export const FaClock = make(MAP.FaClock);
export const FaFlag = make(MAP.FaFlag);
export const FaBriefcase = make(MAP.FaBriefcase);
export const FaMapPin = make(MAP.FaMapPin);
export const FaGlobe = make(MAP.FaGlobe);
export const FaHandshake = make(MAP.FaHandshake);
export const FaRandom = make(MAP.FaRandom);
export const FaFileAlt = make(MAP.FaFileAlt);
export const FaTools = make(MAP.FaTools);
export const FaShieldAlt = make(MAP.FaShieldAlt);
export const FaStar = make(MAP.FaStar);
export const FaHourglassHalf = make(MAP.FaHourglassHalf);
export const FaExternalLinkAlt = make(MAP.FaExternalLinkAlt);
export const FaCheck = make(MAP.FaCheck);
export const FaSpinner = make(MAP.FaSpinner);
export const FaUndo = make(MAP.FaUndo);
export const FaPhone = make(MAP.FaPhone);
export const FaCommentDots = make(MAP.FaCommentDots);
export const FaCreditCard = make(MAP.FaCreditCard);
export const FaGift = make(MAP.FaGift);
export const FaBolt = make(MAP.FaBolt);
export const FaInfoCircle = make(MAP.FaInfoCircle);
export const FaChevronUp = make(MAP.FaChevronUp);
export const FaChevronDown = make(MAP.FaChevronDown);
export const FaLock = make(MAP.FaLock);
export const FaUser = make(MAP.FaUser);
export const FaMap = make(MAP.FaMap);
export const FaDollarSign = make(MAP.FaDollarSign);
export const FaTag = make(MAP.FaTag);
export const FaAward = make(MAP.FaAward);
export const FaHome = make(MAP.FaHome);
export const FaCoffee = make(MAP.FaCoffee);
export const FaLink = make(MAP.FaLink);
export const FaEnvelope = make(MAP.FaEnvelope);
export const FaWhatsapp = make(MAP.FaWhatsapp);
export const FaSyncAlt = make(MAP.FaSyncAlt);
export const FaLocationArrow = make(MAP.FaLocationArrow);
export const FaBookOpen = make(MAP.FaBookOpen);
export const FaChartLine = make(MAP.FaChartLine);
export const FaAlignLeft = make(MAP.FaAlignLeft);
export const FaClipboardCheck = make(MAP.FaClipboardCheck);
export const FaChevronRight = make(MAP.FaChevronRight);
export const FaSearch = make(MAP.FaSearch);
export const FaHistory = make(MAP.FaHistory);
export const FaTimesCircle = make(MAP.FaTimesCircle);
export const FaPhoneSlash = make(MAP.FaPhoneSlash);
export const FaVideo = make(MAP.FaVideo);
export const FaImage = make(MAP.FaImage);
export const FaTrashAlt = make(MAP.FaTrashAlt);
export const FaTrash = make(MAP.FaTrash);
export const FaFileImage = make(MAP.FaFileImage);
export const FaPercent = make(MAP.FaPercent);
export const FaFileInvoice = make(MAP.FaFileInvoice);
export const FaDownload = make(MAP.FaDownload);
export const FaEye = make(MAP.FaEye);
export const FaExpand = make(MAP.FaExpand);
export const FaCompress = make(MAP.FaCompress);
export const FaEdit = make(MAP.FaEdit);
export const FaSignOutAlt = make(MAP.FaSignOutAlt);
export const FaCircle = make(MAP.FaCircle);
