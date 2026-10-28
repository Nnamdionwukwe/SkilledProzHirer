// src/navigation/CallBannersScreen.js
//
// Transparent overlay screen that mounts the incoming-call banners. Rendered
// as the last screen in the top-level RootNavigator stack, with
// presentation: "transparentModal" — so it sits above every other screen
// without intercepting taps except on the banner cards themselves.
//
// The banners use useNavigation() to navigate to Chat / VideoCall when the
// user taps Accept. That's why they must live inside the NavigationContainer
// — outside it, useNavigation() throws "Couldn't find a navigation object".

import { StyleSheet, View } from "react-native";
import VoiceCallBanner from "../components/video/VoiceCallBanner";
import ConversationVideoCallBanner from "../components/video/ConversationVideoCallBanner";

export default function CallBannersScreen() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <VoiceCallBanner />
      <ConversationVideoCallBanner />
    </View>
  );
}
