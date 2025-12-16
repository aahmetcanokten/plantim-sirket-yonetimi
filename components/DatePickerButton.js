import React, { useState } from "react";
import { TouchableOpacity, Text, StyleSheet, Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Colors } from "../Theme";
import { useTranslation } from "react-i18next";


/*
  YENİ BİLEŞEN: AddPurchaseForm'un ihtiyaç duyduğu tarih seçici.
  - Bir butona basıldığında yerel (native) tarih seçiciyi açar.
*/
export default function DatePickerButton({ value, onChange, placeholder }) {
  const { t, i18n } = useTranslation();
  const [show, setShow] = useState(false);
  const displayPlaceholder = placeholder || t("date_picker_placeholder");

  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || value;
    setShow(Platform.OS === "ios"); // iOS'ta manuel kapatmak gerekir
    if (event.type === "set") {
      onChange(currentDate);
    }
  };

  const displayText = value ? value.toLocaleDateString(i18n.language) : displayPlaceholder;

  return (
    <>
      <TouchableOpacity
        style={styles.button}
        onPress={() => setShow(true)}
      >
        <Text style={[styles.text, !value && styles.placeholder]}>
          {displayText}
        </Text>
      </TouchableOpacity>

      {show && (
        <DateTimePicker
          testID="dateTimePicker"
          value={value || new Date()}
          mode="date"
          is24Hour={true}
          display="default"
          onChange={onDateChange}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    borderColor: "#E6E9EE",
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#FBFDFF",
    marginBottom: 8,
    height: 44, // input ile aynı yükseklik
    justifyContent: "center",
  },
  text: {
    color: "#0B1220",
  },
  placeholder: {
    color: "#9CA3AF", // input placeholder rengiyle uyumlu
  },
});