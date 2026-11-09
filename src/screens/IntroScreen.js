// src/screens/IntroScreen.js
import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Easing, Dimensions } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../contexts/ThemeContext";
import AppText from "../components/AppText";

const { width } = Dimensions.get("window");
const INTRO_SEEN_KEY = "@skilledproz:intro_seen_v1";

export default function IntroScreen({ onDone }) {
  const { theme } = useTheme();
  const colors = theme.colors;

  // Logo & Container Animations
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.9)).current;

  // Wordmark Slide Animations
  const leftWordX = useRef(new Animated.Value(-50)).current;
  const rightWordX = useRef(new Animated.Value(50)).current;

  // Background Effects
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(0.5)).current;
  const ringScale = useRef(new Animated.Value(0.2)).current;
  const ringOp = useRef(new Animated.Value(0)).current;

  // Tagline Animation
  const taglineOp = useRef(new Animated.Value(0)).current;
  const taglineY = useRef(new Animated.Value(15)).current;

  useEffect(() => {
    Animated.sequence([
      // 1. Initial Glow & Ring Reveal
      Animated.parallel([
        Animated.timing(glowOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(glowScale, {
          toValue: 1.2,
          duration: 2000,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(ringOp, {
          toValue: 0.8,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(ringScale, {
          toValue: 2.5,
          duration: 2000,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),

      // We run the logo reveal in parallel with the background effects
      Animated.parallel([
        // Logo container pops in
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 7,
          tension: 40,
          useNativeDriver: true,
        }),
        // Words slide together from opposite sides
        Animated.spring(leftWordX, {
          toValue: 0,
          friction: 8,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.spring(rightWordX, {
          toValue: 0,
          friction: 8,
          tension: 50,
          useNativeDriver: true,
        }),
      ]),

      // Wait a brief moment before revealing the tagline
      Animated.delay(200),

      // 3. Tagline Reveal
      Animated.parallel([
        Animated.timing(taglineOp, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(taglineY, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),

      // 4. Hold on screen before finishing
      Animated.delay(1000),
    ]).start(async () => {
      try {
        await AsyncStorage.setItem(INTRO_SEEN_KEY, "1");
      } catch {}
      onDone?.();
    });
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* Background Aurora Glow */}
      <Animated.View
        style={[
          styles.glow,
          {
            backgroundColor: colors.orange,
            opacity: glowOpacity.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.15], // Soft, modern glow
            }),
            transform: [{ scale: glowScale }],
          },
        ]}
      />

      {/* Expanding Radar Ring */}
      <Animated.View
        style={[
          styles.ring,
          {
            borderColor: colors.orange,
            opacity: ringOp.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.4], // Fades out as it expands
            }),
            transform: [{ scale: ringScale }],
          },
        ]}
      />

      {/* Animated Logo Wrapper */}
      <Animated.View
        style={[
          styles.logoWrapper,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <Animated.View style={{ transform: [{ translateX: leftWordX }] }}>
          <AppText
            weight="displayBlack"
            style={{
              fontSize: 38, // Larger for impact
              color: colors.text,
              letterSpacing: -0.5,
            }}
          >
            Skilled
          </AppText>
        </Animated.View>

        <Animated.View style={{ transform: [{ translateX: rightWordX }] }}>
          <AppText
            weight="displayBlack"
            style={{
              fontSize: 38,
              color: colors.orange,
              letterSpacing: -0.5,
            }}
          >
            Proz
          </AppText>
        </Animated.View>
      </Animated.View>

      {/* Tagline */}
      <Animated.View
        style={[
          styles.taglineWrapper,
          {
            opacity: taglineOp,
            transform: [{ translateY: taglineY }],
          },
        ]}
      >
        <AppText
          variant="subtitle"
          style={{ color: colors.textDim, letterSpacing: 0.2 }}
        >
          Connecting skilled hands with real work.
        </AppText>
      </Animated.View>
    </View>
  );
}

export async function hasSeenIntro() {
  try {
    return (await AsyncStorage.getItem(INTRO_SEEN_KEY)) === "1";
  } catch {
    return true;
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoWrapper: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "nowrap",
  },
  glow: {
    position: "absolute",
    width: width * 0.9,
    height: width * 0.9,
    borderRadius: width * 0.45,
  },
  ring: {
    position: "absolute",
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
    borderWidth: 1.5,
  },
  taglineWrapper: {
    marginTop: 20,
    alignItems: "center",
  },
});
