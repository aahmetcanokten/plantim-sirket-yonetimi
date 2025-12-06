import React from "react";
import { TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../Theme";

export default function SettingsButton({ size = 22, color = Colors.iosBlue }) {
  const navigation = useNavigation();

  const navigateToSettings = () => {
    // Try direct first, then try parent navigator(s) as fallback
    try {
      navigation.navigate("Ayarlar");
      return;
    } catch (e) {
      // ignore
    }
    try {
      let parent = navigation;
      let tries = 0;
      while (parent && tries < 8) {
        if (typeof parent.navigate === "function") {
          try {
            parent.navigate("Ayarlar");
            return;
          } catch (err) {
            // continue climbing
          }
        }
        parent = parent.getParent ? parent.getParent() : null;
        tries++;
      }
    } catch (e) {
      console.warn("Settings navigation fallback failed", e);
    }
  };

  return (
    <TouchableOpacity
      onPress={navigateToSettings}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      style={styles.btn}
      accessibilityLabel="Ayarlar"
    >
      <Ionicons name="settings-outline" size={size} color={color} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "transparent",
  },
});