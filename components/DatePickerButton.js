import React, { useState } from "react";
import { TouchableOpacity, Text, StyleSheet, Platform, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Colors } from "../Theme";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

/*
  YENİ BİLEŞEN: AddPurchaseForm'un ihtiyaç duyduğu tarih seçici.
  - Bir butona basıldığında yerel (native) tarih seçiciyi açar.
*/
export default function DatePickerButton({ value, onChange, placeholder }) {
  const { t, i18n } = useTranslation();
  const [show, setShow] = useState(false);
  const displayPlaceholder = placeholder || t("date_picker_placeholder");

  const displayText = value ? value.toLocaleDateString(i18n.language) : displayPlaceholder;

  if (Platform.OS === 'web') {
    const dateValue = value ? value.toISOString().split('T')[0] : '';
    return (
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <Ionicons name="calendar-outline" size={18} color={Colors.secondary} />
        </View>
        <input
          type="date"
          value={dateValue}
          onChange={(e) => {
            if (e.target.value) {
              // Timezone sorunlarını önlemek için yerel saati koruyacak şekilde parse et
              const [year, month, day] = e.target.value.split('-').map(Number);
              const date = new Date(year, month - 1, day);
              onChange(date);
            } else {
              onChange(null);
            }
          }}
          style={{
            flex: 1,
            border: 'none',
            background: 'transparent',
            height: '100%',
            paddingRight: 12,
            fontSize: 15,
            fontFamily: 'inherit',
            color: value ? '#0F172A' : Colors.secondary,
            outline: 'none',
            cursor: 'pointer'
          }}
        />
      </View>
    );
  }

  return (
    <>
      <TouchableOpacity
        style={styles.container}
        onPress={() => setShow(true)}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          <Ionicons name="calendar-outline" size={18} color={Colors.secondary} />
        </View>
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
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => {
            setShow(Platform.OS === 'ios');
            if (date) onChange(date);
          }}
          minimumDate={new Date()} // Geçmiş tarihleri seçtirmeyebiliriz veya Opsiyonel olabilir
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    height: 48,
    overflow: 'hidden',
  },
  iconContainer: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    marginRight: 12,
    backgroundColor: '#fff',
    height: '100%',
  },
  text: {
    fontSize: 15,
    color: "#0F172A",
    fontWeight: '500',
  },
  placeholder: {
    color: Colors.secondary,
    fontWeight: '400',
  }
});