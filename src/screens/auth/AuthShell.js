// src/components/auth/AuthShell.js
//
// Shared auth screen primitives — mirrors the website's AuthLayout
// + form.module.css. Every auth screen composes these so all look
// identical and match the website 1:1.
//
// Safe-area aware: the back button always clears the notch/status bar
// by a comfortable margin, on every device, without per-screen tweaks.

import React, { useEffect, useRef } from "react";
import {
  View,
  Pressable,
  TextInput,
  ScrollView,
  Animated,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppText from "../AppText";
import { useTheme } from "../../contexts/ThemeContext";

// ─── Icon safety helper ─────────────────────────────────────────────
// Simple pass-through. Anything non-null is trusted; consumers pass
// valid Ionicons names. If you ever ship an invalid name, only that
// icon is affected — the screen survives.
const safeIcon = (name) => name || null;

// ────────────────────────────────────────────────────────────────────
// AuthShell — outer wrapper for every auth screen.
// ────────────────────────────────────────────────────────────────────
export function AuthShell({ children, showBack = true, backTo = "Login" }) {
  const ctx = useTheme() || {};
  const th = ctx.theme;
  const c = (th && th.colors) || {
    bg: "#080810",
    text: "#fff",
    textDim: "rgba(255,255,255,0.55)",
    textMuted: "rgba(255,255,255,0.28)",
    orange: "#f97316",
  };

  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    const anim = Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.timing(slide, {
        toValue: 0,
        duration: 450,
        useNativeDriver: true,
      }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [fade, slide]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={{ flex: 1, backgroundColor: c.bg }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 16,
          paddingTop: Math.max(insets.top, 24) + 32,
          paddingBottom: 40,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {showBack && (
          <Pressable
            onPress={() =>
              navigation.canGoBack()
                ? navigation.goBack()
                : navigation.navigate(backTo)
            }
            style={styles.backRow}
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={15} color={c.textDim} />
            <AppText
              variant="small"
              weight="medium"
              tone="dim"
              style={{ marginLeft: 6 }}
            >
              Back
            </AppText>
          </Pressable>
        )}

        <Animated.View
          style={{
            width: "100%",
            maxWidth: 400,
            alignSelf: "center",
            opacity: fade,
            transform: [{ translateY: slide }],
          }}
        >
          {children}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ────────────────────────────────────────────────────────────────────
// AuthHeader — eyebrow + title + subtitle
// ────────────────────────────────────────────────────────────────────
export function AuthHeader({ eyebrow, title, subtitle }) {
  const ctx = useTheme() || {};
  const c = (ctx.theme && ctx.theme.colors) || { orange: "#f97316" };

  return (
    <View style={{ gap: 6, marginBottom: 24 }}>
      {eyebrow ? (
        <AppText
          variant="small"
          weight="bold"
          style={{
            color: c.orange,
            textTransform: "uppercase",
            letterSpacing: 1.8,
            fontSize: 11,
          }}
        >
          {eyebrow}
        </AppText>
      ) : null}
      <AppText
        variant="display"
        weight="displayBlack"
        style={{ letterSpacing: -1.2, lineHeight: 34 }}
      >
        {title}
      </AppText>
      {subtitle ? (
        <AppText
          variant="body"
          tone="dim"
          style={{ marginTop: 4, lineHeight: 20 }}
        >
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────
// AuthField — label + input + icon + error
// ────────────────────────────────────────────────────────────────────
export function AuthField({
  label,
  value,
  onChangeText,
  placeholder,
  iconLeft,
  iconRight,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  autoComplete,
  textContentType,
  error,
  editable = true,
  inputRef,
}) {
  const ctx = useTheme() || {};
  const c = (ctx.theme && ctx.theme.colors) || {
    red: "#ef4444",
    border: "rgba(255,255,255,0.08)",
    bgInput: "rgba(255,255,255,0.04)",
    textMuted: "rgba(255,255,255,0.28)",
    text: "#fff",
    textDim: "rgba(255,255,255,0.55)",
  };

  const borderColor = error ? c.red : c.border;
  const leftIcon = safeIcon(iconLeft);
  const rightIconName = safeIcon(iconRight?.name);

  return (
    <View style={{ gap: 7 }}>
      {label ? (
        <AppText
          variant="small"
          weight="semibold"
          style={{ color: c.textDim, letterSpacing: 0.2, fontSize: 12 }}
        >
          {label}
        </AppText>
      ) : null}
      <View
        style={[styles.inputWrap, { backgroundColor: c.bgInput, borderColor }]}
      >
        {leftIcon && (
          <View style={styles.iconLeft}>
            <Ionicons name={leftIcon} size={15} color={c.textMuted} />
          </View>
        )}
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={c.textMuted}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize ?? "none"}
          autoCorrect={false}
          autoComplete={autoComplete}
          textContentType={textContentType}
          editable={editable}
          style={[
            styles.input,
            {
              color: c.text,
              paddingLeft: leftIcon ? 42 : 15,
              paddingRight: rightIconName ? 42 : 15,
              opacity: editable ? 1 : 0.4,
            },
          ]}
        />
        {rightIconName && (
          <Pressable
            style={styles.iconRight}
            onPress={iconRight?.onPress}
            hitSlop={8}
          >
            <Ionicons name={rightIconName} size={16} color={c.textMuted} />
          </Pressable>
        )}
      </View>
      {error ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Ionicons name="alert-circle" size={12} color="#fca5a5" />
          <AppText variant="small" style={{ color: "#fca5a5", fontSize: 11.5 }}>
            {error}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────
// AuthButton — primary orange pill + outline variant
// ────────────────────────────────────────────────────────────────────
export function AuthButton({
  title,
  onPress,
  loading,
  disabled,
  variant = "primary",
  iconLeft,
}) {
  const ctx = useTheme() || {};
  const c = (ctx.theme && ctx.theme.colors) || {
    orange: "#f97316",
    bg: "#080810",
    text: "#fff",
    border: "rgba(255,255,255,0.08)",
  };

  const isPrimary = variant === "primary";
  const isOutline = variant === "outline";

  const bgColor = isPrimary ? c.orange : "transparent";
  const textColor = isPrimary ? c.bg : c.text;
  const borderColor = isOutline ? c.border : "transparent";
  const borderWidth = isOutline ? 1.5 : 0;

  const isDisabled = disabled || loading;
  const leftIcon = safeIcon(iconLeft);

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: bgColor,
          borderColor,
          borderWidth,
          opacity: isDisabled ? 0.45 : pressed ? 0.88 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={isPrimary ? c.bg : c.text} />
      ) : (
        <>
          {leftIcon ? (
            <Ionicons
              name={leftIcon}
              size={16}
              color={textColor}
              style={{ marginRight: 8 }}
            />
          ) : null}
          <AppText
            variant="body"
            weight="bold"
            style={{
              color: textColor,
              fontSize: 14.5,
              letterSpacing: 0.2,
            }}
          >
            {title}
          </AppText>
        </>
      )}
    </Pressable>
  );
}

// ────────────────────────────────────────────────────────────────────
// AuthAlert — error/success banner
// ────────────────────────────────────────────────────────────────────
export function AuthAlert({ type = "error", message }) {
  const ctx = useTheme() || {};
  const c = (ctx.theme && ctx.theme.colors) || {
    redDim: "rgba(239,68,68,0.12)",
    greenDim: "rgba(34,197,94,0.1)",
  };

  const isErr = type === "error";
  const bg = isErr ? c.redDim : c.greenDim;
  const border = isErr ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.2)";
  const text = isErr ? "#fca5a5" : "#86efac";
  const icon = isErr ? "alert-circle" : "checkmark-circle";

  return (
    <View style={[styles.alert, { backgroundColor: bg, borderColor: border }]}>
      <Ionicons name={icon} size={15} color={text} style={{ marginTop: 1 }} />
      <AppText variant="small" style={{ color: text, flex: 1, lineHeight: 19 }}>
        {message}
      </AppText>
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────
// AuthStateBox — "reset link sent!" success box
// ────────────────────────────────────────────────────────────────────
export function AuthStateBox({ icon, title, subtitle }) {
  const ctx = useTheme() || {};
  const c = (ctx.theme && ctx.theme.colors) || {
    orange: "#f97316",
    bgCard: "rgba(255,255,255,0.03)",
    border: "rgba(255,255,255,0.08)",
  };

  const iconName = safeIcon(icon) || "checkmark-circle";

  return (
    <View
      style={[
        styles.stateBox,
        { backgroundColor: c.bgCard, borderColor: c.border },
      ]}
    >
      <Ionicons name={iconName} size={44} color={c.orange} />
      <AppText
        variant="title"
        weight="displayBlack"
        style={{ textAlign: "center", letterSpacing: -0.5 }}
      >
        {title}
      </AppText>
      {subtitle ? (
        <AppText
          variant="small"
          tone="dim"
          style={{ textAlign: "center", lineHeight: 20, maxWidth: 300 }}
        >
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────
// AuthFooter — "Remember password? Sign in"
// ────────────────────────────────────────────────────────────────────
export function AuthFooter({ prompt, actionLabel, onPress }) {
  const ctx = useTheme() || {};
  const c = (ctx.theme && ctx.theme.colors) || { orange: "#f97316" };

  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginTop: 28,
        flexWrap: "wrap",
      }}
    >
      <AppText variant="body" tone="dim" style={{ fontSize: 13.5 }}>
        {prompt}{" "}
      </AppText>
      <Pressable onPress={onPress} hitSlop={6}>
        <AppText
          variant="body"
          weight="semibold"
          style={{ color: c.orange, fontSize: 13.5 }}
        >
          {actionLabel}
        </AppText>
      </Pressable>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: 4,
    marginBottom: 24,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1.5,
    minHeight: 48,
    position: "relative",
  },
  input: {
    flex: 1,
    fontSize: 14,
    height: 48,
    paddingVertical: 0,
  },
  iconLeft: {
    position: "absolute",
    left: 13,
    height: 48,
    justifyContent: "center",
  },
  iconRight: {
    position: "absolute",
    right: 13,
    height: 48,
    justifyContent: "center",
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 50,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 4,
  },
  alert: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 15,
    paddingVertical: 11,
    marginBottom: 16,
  },
  stateBox: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 28,
    paddingVertical: 36,
    alignItems: "center",
    gap: 14,
    marginBottom: 20,
  },
});
