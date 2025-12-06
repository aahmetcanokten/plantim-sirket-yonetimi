import React, { forwardRef } from "react";
import { TextInput, StyleSheet } from "react-native";

/*
  AccessibleTextInput
  - Thin wrapper around TextInput with sensible accessibility defaults.
  - Props forwarded to underlying TextInput.
  - Placeholder görünürlüğünü (kontrast) ve erişilebilirlik etiketlerini merkezi kontrol eder.
  - iOS/Android klavye tipi tercihi de buradan yönetilebilir.
*/
const AccessibleTextInput = forwardRef(({ placeholder, style, accessibilityLabel, keyboardType, returnKeyType = "done", ...rest }, ref) => {
  return (
    <TextInput
      ref={ref}
      style={[styles.input, style]}
      placeholder={placeholder}
      placeholderTextColor="#94A3B8"
      accessibilityLabel={accessibilityLabel || placeholder}
      keyboardType={keyboardType}
      returnKeyType={returnKeyType}
      autoCorrect={false}
      autoCapitalize="none"
      underlineColorAndroid="transparent"
      {...rest}
    />
  );
});

export default AccessibleTextInput;

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: "#E6E9EE",
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#FBFDFF",
    color: "#0B1220",
  },
});