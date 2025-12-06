import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
} from "react-native";
import { Colors, CardRadius, ButtonRadius } from "../Theme";
import DatePickerButton from "./DatePickerButton";
import KeyboardSafeView from "./KeyboardSafeView"; // Klavye güvenliği için eklendi

export default function InvoiceModal({
  visible,
  onSave,
  onCancel,
  initialInvoice = "",
  initialShipmentDate = null,
  productInfo, // Ürün bilgisi prop olarak eklendi
}) {
  const [invoiceNum, setInvoiceNum] = useState(initialInvoice);
  const [shipmentDate, setShipmentDate] = useState(
    initialShipmentDate ? new Date(initialShipmentDate) : new Date()
  );

  useEffect(() => {
    if (visible) {
      setInvoiceNum(initialInvoice);
      setShipmentDate(
        initialShipmentDate ? new Date(initialShipmentDate) : new Date()
      );
    }
  }, [visible, initialInvoice, initialShipmentDate]);

  const handleSave = () => {
    onSave(invoiceNum, shipmentDate ? shipmentDate.toISOString() : null);
  };

  // Otomatik fatura numarası oluşturma fonksiyonu
  const generateInvoiceNumber = () => {
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
    const randomPart = Math.floor(1000 + Math.random() * 9000); // 4 haneli rastgele sayı
    const newInvoiceNum = `FTR-${datePart}-${randomPart}`;
    setInvoiceNum(newInvoiceNum);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCancel}>
      {/* offsetIOS değerini duruma göre ayarlayabilirsiniz (örn: 0 veya küçük bir değer) */}
      <KeyboardSafeView offsetIOS={Platform.OS === "ios" ? 0 : 0}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Satış Kaydını Tamamla</Text>
            <Text style={styles.modalSubtitle}>Fatura ve Sevk Bilgilerini Giriniz</Text>

            {/* Fatura Numarası Alanı */}
            <Text style={styles.label}>Fatura Numarası</Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, { flex: 1, marginRight: 10 }]}
                value={invoiceNum}
                onChangeText={setInvoiceNum}
                placeholder="Fatura No"
              />
              <TouchableOpacity
                style={styles.generateButton}
                onPress={generateInvoiceNumber} // Buton artık aktif
              >
                <Text style={styles.generateButtonText}>Oluştur</Text>
              </TouchableOpacity>
            </View>

            {/* Sevk Tarihi Alanı */}
            <Text style={[styles.label, { marginTop: 15 }]}>Sevk Tarihi</Text>
            <DatePickerButton
              value={shipmentDate}
              onChange={setShipmentDate}
              placeholder="Tarih Seçiniz"
            />

            {/* Ürün Bilgisi Özeti (Opsiyonel ama şık durur) */}
            {productInfo && (
              <View style={styles.productInfoContainer}>
                <Text style={styles.productInfoTitle}>{productInfo.name}</Text>
                <Text style={styles.productInfoDetail}>
                  Adet: {productInfo.quantity} • Tutar: {productInfo.totalPrice} ₺
                </Text>
              </View>
            )}

            {/* Aksiyon Butonları */}
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Kaydet ve Satışı Tamamla</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>İptal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardSafeView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end", // Klavye açılınca yukarı itilmesi için flex-end genellikle iyidir
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    // Klavye açıldığında içeriğin tamamen görünmesi için paddingBottom artırılabilir
    paddingBottom: Platform.OS === "ios" ? 40 : 24, 
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.secondary,
    marginBottom: 20,
  },
  label: {
    fontWeight: "700",
    marginBottom: 8,
    color: Colors.textPrimary,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E6E9EE",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#FBFDFF",
    color: Colors.textPrimary,
  },
  generateButton: {
    backgroundColor: Colors.secondary, // Pasif griden, daha belirgin bir renge geçiş
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  generateButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  productInfoContainer: {
      marginTop: 20,
      padding: 12,
      backgroundColor: "#F8FAFC",
      borderRadius: 10,
      borderWidth: 1,
      borderColor: "#E2E8F0",
  },
  productInfoTitle: {
      fontWeight: "700",
      color: Colors.textPrimary,
  },
  productInfoDetail: {
      color: Colors.secondary,
      fontSize: 13,
      marginTop: 4,
  },
  saveButton: {
    backgroundColor: Colors.iosGreen,
    paddingVertical: 16,
    borderRadius: ButtonRadius,
    alignItems: "center",
    marginTop: 24,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
  cancelButton: {
    alignItems: "center",
    marginTop: 16,
    padding: 8,
  },
  cancelButtonText: {
    color: Colors.critical,
    fontWeight: "700",
    fontSize: 15,
  },
});