// src/components/AppInput.js
import React, { useState, forwardRef } from "react";
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  I18nManager,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppText from "./AppText";
import { useTheme } from "../contexts/ThemeContext";

/**
 * AppInput — themed input that matches the website's pill input
 *  (icon left, optional eye toggle for password, label above, error below).
 */
const AppInput = forwardRef(function AppInput(
  {
    label,
    iconLeft,
    placeholder,
    value,
    onChangeText,
    onBlur,
    onFocus,
    secureTextEntry,
    keyboardType = "default",
    autoCapitalize = "none",
    autoCorrect = false,
    autoComplete,
    textContentType,
    error,
    helperText,
    rightAction,
    rightActionLabel,
    onRightActionPress,
    multiline = false,
    numberOfLines,
    maxLength,
    editable = true,
    style,
  },
  ref,
) {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = !!secureTextEntry;
  const obscured = isPassword && !showPassword;

  const borderColor = error
    ? theme.colors.red
    : focused
    ? theme.colors.borderFocus
    : theme.colors.border;

  return (
    <View style={[styles.wrap, style]}>
      {(label || onRightActionPress) && (
        <View style={styles.labelRow}>
          {label ? (
            <AppText variant="label" tone="dim">
              {label}
            </AppText>
          ) : (
            <View />
          )}
          {onRightActionPress ? (
            <Pressable onPress={onRightActionPress} hitSlop={6}>
              <AppText variant="small" tone="brand" weight="semibold">
                {rightActionLabel}
              </AppText>
            </Pressable>
          ) : null}
        </View>
      )}

      <View
        style={[
          styles.field,
          {
            backgroundColor: theme.colors.bgInput,
            borderColor,
            paddingVertical: multiline ? 12 : 0,
          },
        ]}
      >
        {iconLeft ? (
          <Ionicons
            name={iconLeft}
            size={18}
            color={theme.colors.textDim}
            style={styles.iconLeft}
          />
        ) : null}

        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textMuted}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          secureTextEntry={obscured}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          autoComplete={autoComplete}
          textContentType={textContentType}
          multiline={multiline}
          numberOfLines={numberOfLines}
          maxLength={maxLength}
          editable={editable}
          maxFontSizeMultiplier={1.2}
          style={[
            styles.input,
            {
              color: theme.colors.text,
              textAlign: I18nManager.isRTL ? "right" : "left",
              fontFamily: "DMSans_400Regular",
              minHeight: multiline ? Math.max(48, (numberOfLines || 3) * 22) : 48,
              paddingLeft: iconLeft ? 0 : 14,
              paddingRight: isPassword ? 0 : 14,
            },
          ]}
        />

        {isPassword ? (
          <Pressable
            onPress={() => setShowPassword((s) => !s)}
            hitSlop={8}
            style={styles.eye}
          >
            <Ionicons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={18}
              color={theme.colors.textDim}
            />
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <AppText variant="small" tone="danger" style={styles.helper}>
          {error}
        </AppText>
      ) : helperText ? (
        <AppText variant="small" tone="muted" style={styles.helper}>
          {helperText}
        </AppText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
  },
  iconLeft: {
    paddingLeft: 14,
    paddingRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  eye: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  helper: {
    marginTop: 2,
  },
});

export default AppInput;
