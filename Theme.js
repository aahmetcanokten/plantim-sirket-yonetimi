// Shared visual theme and helpers for iOS-first styling
import { Platform } from "react-native";

export const Colors = {
  iosBlue: "#0A84FF",
  iosGreen: "#34C759",
  iosBackground: "#F2F5F9",
  cardBackground: "#FFFFFF",
  muted: "#8E9AA8",
  critical: "#FF3B30",
  textPrimary: "#0B1220",
  secondary: "#64748B",
  warning: "#F59E0B",
  profit: "#34C759",
  primary: "#0A84FF",
  success: "#34C759",
};

export const IOSShadow = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
  },
  android: {
    elevation: 3,
  },
});

export const CardRadius = 14;
export const ButtonRadius = 18;