import React, { useState } from "react";
import { TouchableOpacity, Text, StyleSheet, Platform, View } from "react-native";
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

  if (Platform.OS === 'web') {
    const dateValue = value ? value.toISOString().split('T')[0] : '';
    return (
      <View style={[styles.button, { padding: 0, justifyContent: 'center' }]}>
        <input
          type="date"
          value={dateValue}
          onChange={(e) => {
            if (e.target.value) {
              // valueAsDate kullanmak timezone sorunlarını çözebilir
              const date = new Date(e.target.value);
              onChange(date);
            } else {
              onChange(null);
            }
          }}
          style={{
            border: 'none',
            background: 'transparent',
            width: '100%',
            height: '100%',
            padding: 10,
            fontSize: 16,
            fontFamily: 'inherit',
            color: '#0B1220',
            outline: 'none'
          }}
        />
      </View>
    );
  }

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
          onChange={(event, date) => {
            setShow(Platform.OS === 'ios');
            if (date) onChange(date);
          }}
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
  webInput: {
    padding: 10,
    borderWidth: 1,
    borderColor: "#E6E9EE",
    borderRadius: 8,
    backgroundColor: "#FBFDFF",
    marginBottom: 8,
    height: 44,
    fontSize: 14,
    color: "#0B1220",
    width: '100%',
    fontFamily: 'System', // Varsayılan sistem fontu
  }
});