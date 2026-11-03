// src/utils/linkify.js
import React from "react";
import { Text, Linking } from "react-native";

/**
 * linkify — split a string into tappable URL <Text> nodes.
 * Links remain tappable; no visual underline is applied.
 */
export function linkify(text, baseStyle) {
  if (!text) return null;

  const urlRegex =
    /((?:https?:\/\/|www\.)[^\s]+|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;

  return text.split(urlRegex).map((part, i) => {
    if (part && part.match(urlRegex)) {
      return (
        <Text
          key={i}
          style={baseStyle}
          onPress={() => {
            let url = part;
            if (!/^https?:\/\//i.test(url) && !url.includes("@")) {
              url = `https://${url}`;
            } else if (url.includes("@") && !url.startsWith("mailto:")) {
              url = `mailto:${url}`;
            }
            Linking.openURL(url).catch(() => {});
          }}
          suppressHighlighting={true}
        >
          {part}
        </Text>
      );
    }
    return (
      <Text key={i} style={baseStyle}>
        {part}
      </Text>
    );
  });
}
