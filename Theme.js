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
  primary: "#2563EB", // Slightly more corporate blue
  success: "#10B981",

  // Corporate Web Theme (Dark)
  webSidebar: "#111827", // Very dark grey/navy
  webHeader: "#FFFFFF",
  webBackground: "#F8FAFC",
  webText: "#111827",
  webTextMuted: "#6B7280",
  webAccent: "#2563EB",
  webBorder: "#E2E8F0",

  // Dark Mode Corporate (If requested or active)
  darkBg: "#0B0F19",
  darkSidebar: "#111827",
  darkCard: "#1F2937",
  darkText: "#F9FAFB",
  darkBorder: "#374151"
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