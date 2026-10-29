// src/navigation/CallBannersOverlay.js
//
// Persistent overlay that mounts the incoming-call banners above the
// entire app. Rendered as a sibling of the navigator (wrapped in a View)
// so it never becomes a route and never steals focus.
//
// The banners navigate via navigationRef (not useNavigation()) because
// this component is mounted OUTSIDE the navigator's React context — there
// is no useNavigation() available here.

import { StyleSheet, View } from "react-native";
import VoiceCallBanner from "../components/video/VoiceCallBanner";
import ConversationVideoCallBanner from "../components/video/ConversationVideoCallBanner";

export default function CallBannersOverlay() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <VoiceCallBanner />
      <ConversationVideoCallBanner />
    </View>
  );
}
