// src/icons/fa.js
//
// Drop-in replacement for `react-icons/fa` that renders Ionicons
// equivalents via @expo/vector-icons. Every FaXxx named export keeps
// the same props (size, color, style) — no consumer changes needed.

import React from "react";
import { Ionicons } from "@expo/vector-icons";

const MAP = {
  FaGripVertical: "reorder-three",
  FaComments: "chatbubbles",
  FaSend: "send",
  FaKey: "key",
  FaPauseCircle: "pause-circle",
  FaFileText: "document-text",
  FaSettings: "settings",
  FaHardHat: "construct",
  FaAlertCircle: "alert-circle",
  FaMaximize2: "expand",
  FaSparkles: "sparkles",
  FaCheckCircle2: "checkmark-circle",
  FaShieldCheck: "shield-checkmark",
  FaCamera: "camera",
  FaPencil: "pencil",
  FaArrowLeft: "arrow-back",
  FaArrowRight: "arrow-forward",
  FaArrowUpRightFromSquare: "open-outline",
  FaExclamationTriangle: "warning",
  FaExclamationCircle: "alert-circle",
  FaCircleExclamation: "alert-circle",
  FaTimes: "close",
  FaTimesCircle: "close-circle",
  FaX: "close",
  FaCheckCircle: "checkmark-circle",
  FaCircleCheck: "checkmark-circle",
  FaCheck: "checkmark",
  FaCalendarAlt: "calendar",
  FaMapMarkerAlt: "location",
  FaMapPin: "pin",
  FaMap: "map",
  FaMoneyBillWave: "cash",
  FaDollarSign: "cash-outline",
  FaWallet: "wallet",
  FaClock: "time",
  FaHistory: "time-outline",
  FaClockRotateLeft: "time-outline",
  FaFlag: "flag",
  FaBriefcase: "briefcase",
  FaBuilding: "business",
  FaGlobe: "globe",
  FaHandshake: "hand-left",
  FaHandHoldingHeart: "hand-left",
  FaRandom: "shuffle",
  FaRightLeft: "swap-horizontal",
  FaFileAlt: "document-text",
  FaFilePdf: "document-outline",
  FaTools: "construct",
  FaShieldAlt: "shield-checkmark",
  FaShieldHeart: "shield-half",
  FaStar: "star",
  FaStarHalf: "star-half",
  FaRegStar: "star-outline",
  FaHourglassHalf: "hourglass",
  FaExternalLinkAlt: "open-outline",
  FaSpinner: "sync",
  FaUndo: "arrow-undo",
  FaPhone: "call",
  FaPhoneSlash: "call-outline",
  FaCommentDots: "chatbubble-ellipses",
  FaMessage: "chatbubble",
  FaCreditCard: "card",
  FaGift: "gift",
  FaBolt: "flash",
  FaInfoCircle: "information-circle",
  FaLightbulb: "bulb",
  FaChevronUp: "chevron-up",
  FaChevronDown: "chevron-down",
  FaChevronLeft: "chevron-back",
  FaChevronRight: "chevron-forward",
  FaLock: "lock-closed",
  FaUser: "person",
  FaUserCheck: "person-add",
  FaUserPlus: "person-add",
  FaUserGear: "person-circle",
  FaUsers: "people",
  FaTag: "pricetag",
  FaTags: "pricetags",
  FaAward: "ribbon",
  FaCrown: "ribbon",
  FaHome: "home",
  FaHouse: "home",
  FaCoffee: "cafe",
  FaLink: "link",
  FaEnvelope: "mail",
  FaWhatsapp: "logo-whatsapp",
  FaTwitter: "logo-twitter",
  FaFacebook: "logo-facebook",
  FaLinkedin: "logo-linkedin",
  FaTelegram: "paper-plane",
  FaSyncAlt: "sync",
  FaLocationArrow: "navigate",
  FaBookOpen: "book",
  FaChartLine: "trending-up",
  FaAlignLeft: "reorder-three",
  FaClipboardCheck: "clipboard",
  FaClipboardList: "list",
  FaSearch: "search",
  FaVideo: "videocam",
  FaImage: "image",
  FaFileImage: "image-outline",
  FaTrashAlt: "trash",
  FaTrash: "trash",
  FaTrashCan: "trash",
  FaPercent: "percent",
  FaFileInvoice: "receipt",
  FaDownload: "download",
  FaPrint: "print",
  FaEye: "eye",
  FaExpand: "expand",
  FaCompress: "contract",
  FaEdit: "pencil",
  FaSignOutAlt: "log-out",
  FaCircle: "ellipse",
  FaSpinnerAlt: "sync",
  FaPlus: "add",
  FaTarget: "locate",
  FaRefreshCw: "refresh",
  FaInbox: "file-tray-outline",
  FaQuoteLeft: "chatbox-outline",
  FaBan: "ban",
  FaCopy: "copy",
  FaTrophy: "trophy",
  FaBookmark: "bookmark",
  FaLayers: "layers",
  FaSlidersH: "options",
  FaFrown: "sad",
  FaPaperclip: "attach",
  FaPaperPlane: "paper-plane",
  FaMicrophone: "mic",
  FaMicrophoneSlash: "mic-off",
  FaStop: "stop",
  FaShareNodes: "share-social",
  FaHeart: "heart",
  FaThumbsUp: "thumbs-up",
  FaRepeat: "repeat",
  FaPause: "pause",
  FaPlay: "play",
  FaSmile: "happy",
  FaBell: "notifications",
  FaMoon: "moon",
  FaSun: "sunny",
  FaDesktop: "desktop",
  FaBars: "menu",
  FaTruckFast: "rocket",
  FaUpload: "cloud-upload",
  FaTool: "construct",
  FaXmark: "close",
  FaVolumeUp: "volume-high",
  FaVolumeMute: "volume-mute",
};

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
export const FaArrowRight = make(MAP.FaArrowRight);
export const FaArrowUpRightFromSquare = make(MAP.FaArrowUpRightFromSquare);
export const FaExclamationTriangle = make(MAP.FaExclamationTriangle);
export const FaExclamationCircle = make(MAP.FaExclamationCircle);
export const FaCircleExclamation = make(MAP.FaCircleExclamation);
export const FaTimes = make(MAP.FaTimes);
export const FaTimesCircle = make(MAP.FaTimesCircle);
export const FaX = make(MAP.FaX);
export const FaCheckCircle = make(MAP.FaCheckCircle);
export const FaCircleCheck = make(MAP.FaCircleCheck);
export const FaCheck = make(MAP.FaCheck);
export const FaCalendarAlt = make(MAP.FaCalendarAlt);
export const FaMapMarkerAlt = make(MAP.FaMapMarkerAlt);
export const FaMapPin = make(MAP.FaMapPin);
export const FaMap = make(MAP.FaMap);
export const FaMoneyBillWave = make(MAP.FaMoneyBillWave);
export const FaDollarSign = make(MAP.FaDollarSign);
export const FaWallet = make(MAP.FaWallet);
export const FaClock = make(MAP.FaClock);
export const FaHistory = make(MAP.FaHistory);
export const FaClockRotateLeft = make(MAP.FaClockRotateLeft);
export const FaFlag = make(MAP.FaFlag);
export const FaBriefcase = make(MAP.FaBriefcase);
export const FaBuilding = make(MAP.FaBuilding);
export const FaGlobe = make(MAP.FaGlobe);
export const FaHandshake = make(MAP.FaHandshake);
export const FaHandHoldingHeart = make(MAP.FaHandHoldingHeart);
export const FaRandom = make(MAP.FaRandom);
export const FaRightLeft = make(MAP.FaRightLeft);
export const FaFileAlt = make(MAP.FaFileAlt);
export const FaFilePdf = make(MAP.FaFilePdf);
export const FaTools = make(MAP.FaTools);
export const FaShieldAlt = make(MAP.FaShieldAlt);
export const FaShieldHeart = make(MAP.FaShieldHeart);
export const FaStar = make(MAP.FaStar);
export const FaStarHalf = make(MAP.FaStarHalf);
export const FaRegStar = make(MAP.FaRegStar);
export const FaHourglassHalf = make(MAP.FaHourglassHalf);
export const FaExternalLinkAlt = make(MAP.FaExternalLinkAlt);
export const FaSpinner = make(MAP.FaSpinner);
export const FaUndo = make(MAP.FaUndo);
export const FaPhone = make(MAP.FaPhone);
export const FaPhoneSlash = make(MAP.FaPhoneSlash);
export const FaCommentDots = make(MAP.FaCommentDots);
export const FaMessage = make(MAP.FaMessage);
export const FaCreditCard = make(MAP.FaCreditCard);
export const FaGift = make(MAP.FaGift);
export const FaBolt = make(MAP.FaBolt);
export const FaInfoCircle = make(MAP.FaInfoCircle);
export const FaLightbulb = make(MAP.FaLightbulb);
export const FaChevronUp = make(MAP.FaChevronUp);
export const FaChevronDown = make(MAP.FaChevronDown);
export const FaChevronLeft = make(MAP.FaChevronLeft);
export const FaChevronRight = make(MAP.FaChevronRight);
export const FaLock = make(MAP.FaLock);
export const FaUser = make(MAP.FaUser);
export const FaUserCheck = make(MAP.FaUserCheck);
export const FaUserPlus = make(MAP.FaUserPlus);
export const FaUserGear = make(MAP.FaUserGear);
export const FaUsers = make(MAP.FaUsers);
export const FaTag = make(MAP.FaTag);
export const FaTags = make(MAP.FaTags);
export const FaAward = make(MAP.FaAward);
export const FaCrown = make(MAP.FaCrown);
export const FaHome = make(MAP.FaHome);
export const FaHouse = make(MAP.FaHouse);
export const FaCoffee = make(MAP.FaCoffee);
export const FaLink = make(MAP.FaLink);
export const FaEnvelope = make(MAP.FaEnvelope);
export const FaWhatsapp = make(MAP.FaWhatsapp);
export const FaTwitter = make(MAP.FaTwitter);
export const FaFacebook = make(MAP.FaFacebook);
export const FaLinkedin = make(MAP.FaLinkedin);
export const FaTelegram = make(MAP.FaTelegram);
export const FaSyncAlt = make(MAP.FaSyncAlt);
export const FaLocationArrow = make(MAP.FaLocationArrow);
export const FaBookOpen = make(MAP.FaBookOpen);
export const FaChartLine = make(MAP.FaChartLine);
export const FaAlignLeft = make(MAP.FaAlignLeft);
export const FaClipboardCheck = make(MAP.FaClipboardCheck);
export const FaClipboardList = make(MAP.FaClipboardList);
export const FaSearch = make(MAP.FaSearch);
export const FaVideo = make(MAP.FaVideo);
export const FaImage = make(MAP.FaImage);
export const FaFileImage = make(MAP.FaFileImage);
export const FaTrashAlt = make(MAP.FaTrashAlt);
export const FaTrash = make(MAP.FaTrash);
export const FaTrashCan = make(MAP.FaTrashCan);
export const FaPercent = make(MAP.FaPercent);
export const FaFileInvoice = make(MAP.FaFileInvoice);
export const FaDownload = make(MAP.FaDownload);
export const FaPrint = make(MAP.FaPrint);
export const FaEye = make(MAP.FaEye);
export const FaExpand = make(MAP.FaExpand);
export const FaCompress = make(MAP.FaCompress);
export const FaEdit = make(MAP.FaEdit);
export const FaSignOutAlt = make(MAP.FaSignOutAlt);
export const FaCircle = make(MAP.FaCircle);
export const FaPlus = make(MAP.FaPlus);
export const FaTarget = make(MAP.FaTarget);
export const FaRefreshCw = make(MAP.FaRefreshCw);
export const FaInbox = make(MAP.FaInbox);
export const FaQuoteLeft = make(MAP.FaQuoteLeft);
export const FaBan = make(MAP.FaBan);
export const FaCopy = make(MAP.FaCopy);
export const FaTrophy = make(MAP.FaTrophy);
export const FaBookmark = make(MAP.FaBookmark);
export const FaLayers = make(MAP.FaLayers);
export const FaSlidersH = make(MAP.FaSlidersH);
export const FaFrown = make(MAP.FaFrown);
export const FaPaperclip = make(MAP.FaPaperclip);
export const FaPaperPlane = make(MAP.FaPaperPlane);
export const FaMicrophone = make(MAP.FaMicrophone);
export const FaMicrophoneSlash = make(MAP.FaMicrophoneSlash);
export const FaStop = make(MAP.FaStop);
export const FaShareNodes = make(MAP.FaShareNodes);
export const FaHeart = make(MAP.FaHeart);
export const FaThumbsUp = make(MAP.FaThumbsUp);
export const FaRepeat = make(MAP.FaRepeat);
export const FaPause = make(MAP.FaPause);
export const FaPlay = make(MAP.FaPlay);
export const FaSmile = make(MAP.FaSmile);
export const FaBell = make(MAP.FaBell);
export const FaMoon = make(MAP.FaMoon);
export const FaSun = make(MAP.FaSun);
export const FaDesktop = make(MAP.FaDesktop);
export const FaBars = make(MAP.FaBars);
export const FaTruckFast = make(MAP.FaTruckFast);
export const FaUpload = make(MAP.FaUpload);
export const FaTool = make(MAP.FaTool);
export const FaXmark = make(MAP.FaXmark);
export const FaVolumeUp = make(MAP.FaVolumeUp);
export const FaVolumeMute = make(MAP.FaVolumeMute);
export const FaPencil = make(MAP.FaPencil);
export const FaCamera = make(MAP.FaCamera);

export const FaFileText = make(MAP.FaFileText);
export const FaSettings = make(MAP.FaSettings);
export const FaHardHat = make(MAP.FaHardHat);
export const FaAlertCircle = make(MAP.FaAlertCircle);
export const FaMaximize2 = make(MAP.FaMaximize2);
export const FaSparkles = make(MAP.FaSparkles);
export const FaCheckCircle2 = make(MAP.FaCheckCircle2);
export const FaShieldCheck = make(MAP.FaShieldCheck);

export const FaKey = make(MAP.FaKey);
export const FaPauseCircle = make(MAP.FaPauseCircle);

export const FaGripVertical = make(MAP.FaGripVertical);
export const FaComments = make(MAP.FaComments);
export const FaSend = make(MAP.FaSend);
