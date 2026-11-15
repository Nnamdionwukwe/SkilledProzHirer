// src/services/pushRegistration.js
//
// Requests notification permission, obtains an Expo push token, and
// registers it with the backend. Called once on app start (after auth).

import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import client from "../api/client";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false, // ring is handled by CallKeep, not the notification
    shouldSetBadge: false,
  }),
});

export async function registerPushToken() {
  if (!Device.isDevice) {
    console.log("Push tokens only work on physical devices");
    return null;
  }

  // 1. Ask permission
  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== "granted") {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== "granted") {
    console.log("Notification permission denied");
    return null;
  }

  // 2. Get an Expo push token
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;
  if (!projectId) {
    console.warn("Missing EAS projectId — cannot get push token");
    return null;
  }

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

  // 3. Android requires a channel for the notification to appear
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("incoming_calls", {
      name: "Incoming Calls",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 1000, 1000],
      lightColor: "#FF231F7C",
      bypassDnd: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      sound: null, // ring handled by CallKeep
    });
  }

  // 4. Send the token to your backend so it can push to this device
  try {
    await client.post("/users/push-token", {
      token,
      platform: Platform.OS,
    });
  } catch (err) {
    console.warn("Failed to register push token:", err?.message);
  }

  return token;
}
