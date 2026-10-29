// src/components/LoadingScreen.js
//
// Full-screen app launcher. Shown while fonts/i18n/auth hydrate.
// Displays the SkilledProz logo with a soft pulse — no spinner.
//
// The pulse uses Animated so it runs on the native thread, doesn't
// block JS, and looks identical on iOS and Android.

import { useEffect, useRef } from "react";
import { Animated, Easing, Image, StyleSheet, View } from "react-native";

const LOGO = require("../assets/logo.png");

export default function LoadingScreen() {
  const pulse = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.06,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 0.9,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0.4,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    pulseLoop.start();
    glowLoop.start();

    return () => {
      pulseLoop.stop();
      glowLoop.stop();
    };
  }, [pulse, glow]);

  return (
    <View style={styles.container}>
      {/* Soft glow behind the logo */}
      <Animated.View
        style={[
          styles.glow,
          {
            opacity: glow,
          },
        ]}
      />
      {/* Logo */}
      <Animated.View
        style={{
          transform: [{ scale: pulse }],
        }}
      >
        <Image source={LOGO} style={styles.logo} resizeMode="contain" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#080810",
  },
  glow: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#f97316",
    opacity: 0.3,
  },
  logo: {
    width: 120,
    height: 120,
  },
});
