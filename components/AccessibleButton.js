import React from "react";
import { TouchableOpacity, Text, StyleSheet, View } from "react-native";

/*
  AccessibleButton
  - Basit, tutarlı, erişilebilir button wrapper'ı.
  - Props:
    - onPress, children (Text veya ikon), style, accessibilityLabel, disabled, variant (primary/secondary/danger)
*/
export default function AccessibleButton({ onPress, children, style, accessibilityLabel, disabled = false, variant = "primary", testID }) {
  const variantStyle = variant === "primary" ? styles.primary : variant === "danger" ? styles.danger : styles.secondary;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      disabled={disabled}
      style={[styles.base, variantStyle, style, disabled ? styles.disabled : null]}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      {typeof children === "string" ? <Text style={[styles.text, variant === "secondary" ? styles.textSecondary : null]}>{children}</Text> : children}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 40,
    minWidth: 84,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: { backgroundColor: "#0EA5E9" }, // Colors.iosBlue benzeri
  secondary: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#E6E9EE" },
  danger: { backgroundColor: "#F97373" }, // danger red
  text: { color: "#fff", fontWeight: "700" },
  textSecondary: { color: "#0B1220" },
  disabled: { opacity: 0.5 },
});