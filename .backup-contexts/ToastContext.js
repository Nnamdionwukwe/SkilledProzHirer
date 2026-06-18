// src/contexts/ToastContext.js
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "./ThemeContext";

/**
 * Toast types: "success" | "error" | "info" | "warning"
 *
 * Usage anywhere in the tree:
 *   const { toast } = useToast();
 *   toast.success("Logged in");
 *   toast.error("Invalid credentials");
 *   toast.info("Heads up");
 *   toast.warning("Are you sure?");
 *
 * Always prefer this over Alert.alert.
 */

const ToastContext = createContext({
  show: () => {},
  toast: { success: () => {}, error: () => {}, info: () => {}, warning: () => {} },
});

const DURATION = 3500;

export function ToastProvider({ children }) {
  const [queue, setQueue] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setQueue((q) => q.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message, type = "info", opts = {}) => {
      const id = ++idRef.current;
      const toast = {
        id,
        message: String(message ?? ""),
        type,
        duration: opts.duration ?? DURATION,
      };
      setQueue((q) => [...q, toast]);
      return id;
    },
    [],
  );

  const toast = {
    success: (msg, opts) => show(msg, "success", opts),
    error: (msg, opts) => show(msg, "error", opts),
    info: (msg, opts) => show(msg, "info", opts),
    warning: (msg, opts) => show(msg, "warning", opts),
  };

  return (
    <ToastContext.Provider value={{ show, toast, dismiss }}>
      {children}
      <ToastViewport queue={queue} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastViewport({ queue, onDismiss }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.viewport,
        { top: insets.top + 8 },
      ]}
    >
      {queue.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </View>
  );
}

function ToastItem({ toast, onDismiss }) {
  const { theme } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 240,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(handleDismiss, toast.duration);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -8,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss(toast.id));
  };

  const palette = getPalette(toast.type, theme);

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: theme.colors.bgPanel,
          borderColor: palette.border,
          shadowColor: theme.colors.shadow,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <View
        style={[styles.iconWrap, { backgroundColor: palette.bgIcon }]}
      >
        <Ionicons name={palette.icon} size={18} color={palette.iconColor} />
      </View>
      <Text
        style={[styles.message, { color: theme.colors.text }]}
        numberOfLines={3}
      >
        {toast.message}
      </Text>
      <TouchableOpacity
        onPress={handleDismiss}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="close" size={18} color={theme.colors.textDim} />
      </TouchableOpacity>
    </Animated.View>
  );
}

function getPalette(type, theme) {
  switch (type) {
    case "success":
      return {
        icon: "checkmark-circle",
        iconColor: theme.colors.green,
        bgIcon: theme.colors.greenDim,
        border: theme.colors.greenDim,
      };
    case "error":
      return {
        icon: "alert-circle",
        iconColor: theme.colors.red,
        bgIcon: theme.colors.redDim,
        border: theme.colors.redDim,
      };
    case "warning":
      return {
        icon: "warning",
        iconColor: theme.colors.orange,
        bgIcon: theme.colors.orangeDim,
        border: theme.colors.orangeDim,
      };
    case "info":
    default:
      return {
        icon: "information-circle",
        iconColor: theme.colors.orange,
        bgIcon: theme.colors.orangeDim,
        border: theme.colors.border,
      };
  }
}

const styles = StyleSheet.create({
  viewport: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 9999,
    elevation: 9999,
    gap: 8,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  message: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
  },
});

export const useToast = () => useContext(ToastContext);
