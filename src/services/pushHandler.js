// src/services/pushHandler.js
//
// Defines the task that runs when a data-only push arrives. It calls
// RNCallKeep.displayIncomingCall to show the native ringer.

import * as TaskManager from "expo-task-manager";
import * as Notifications from "expo-notifications";
import RNCallKeep from "react-native-callkeep";

export const BACKGROUND_CALL_TASK = "BACKGROUND_CALL_TASK";

TaskManager.defineTask(BACKGROUND_CALL_TASK, async ({ data, error }) => {
  if (error) return;
  if (!data?.type || data.type !== "INCOMING_CALL") return;

  const {
    callId,
    callType, // "BOOKING" | "JOB_INTERVIEW" | "CONVERSATION_VIDEO" | "CONVERSATION_VOICE"
    callerName,
    title,
  } = data;

  RNCallKeep.displayIncomingCall(
    callId,
    callerName || "SkilledProz",
    title || "Incoming Call",
    "generic",
    callType === "CONVERSATION_VIDEO" ||
      callType === "JOB_INTERVIEW" ||
      callType === "BOOKING"
      ? true // hasVideo
      : false,
  );
});
