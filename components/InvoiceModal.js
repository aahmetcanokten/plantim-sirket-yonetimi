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
import { useTranslation } from "react-i18next";


export default function InvoiceModal({
  visible,
  onSave,
  onCancel,
  initialInvoice = "",
  initialShipmentDate = null,
  productInfo, // Ürün bilgisi prop olarak eklendi
}) {
  const { t } = useTranslation();
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
    <Modal
      visible={visible}
      animationType={Platform.OS === 'web' ? "fade" : "slide"}
      transparent
      onRequestClose={onCancel}
    >
      <KeyboardSafeView offsetIOS={Platform.OS === "ios" ? 0 : 0} disableScrollView={Platform.OS === 'web'}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalWrapper}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{t("complete_sales_record")}</Text>
              <Text style={styles.modalSubtitle}>{t("enter_invoice_shipment_info")}</Text>

              {/* Fatura Numarası Alanı */}
              <Text style={styles.label}>{t("invoice_number")}</Text>
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, { flex: 1, marginRight: 10 }]}
                  value={invoiceNum}
                  onChangeText={setInvoiceNum}
                  placeholder={t("invoice_number_placeholder")}
                  selectTextOnFocus={Platform.OS === 'web'}
                />
                <TouchableOpacity
                  style={styles.generateButton}
                  onPress={generateInvoiceNumber}
                >
                  <Text style={styles.generateButtonText}>{t("generate")}</Text>
                </TouchableOpacity>
              </View>

              {/* Sevk Tarihi Alanı */}
              <Text style={[styles.label, { marginTop: 15 }]}>{t("shipment_date")}</Text>
              <DatePickerButton
                value={shipmentDate}
                onChange={setShipmentDate}
                placeholder={t("date_picker_placeholder")}
              />

              {/* Ürün Bilgisi Özeti */}
              {productInfo && (
                <View style={styles.productInfoContainer}>
                  <Text style={styles.productInfoTitle}>{productInfo.name}</Text>
                  <Text style={styles.productInfoDetail}>
                    {t("quantity_label")} {productInfo.quantity} • {t("amount_label")} {productInfo.totalPrice} ₺
                  </Text>
                </View>
              )}

              {/* Aksiyon Butonları */}
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>{t("save_and_complete_sale")}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
                <Text style={styles.cancelButtonText}>{t("cancel")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardSafeView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    ...Platform.select({
      web: {
        justifyContent: 'center',
        alignItems: 'center',
      },
      default: {
        justifyContent: 'flex-end',
      }
    }),
  },
  modalWrapper: {
    backgroundColor: '#fff',
    ...Platform.select({
      web: {
        borderRadius: 16,
        width: '100%',
        maxWidth: 600,
        maxHeight: '90vh',
        overflow: 'hidden',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
      },
      default: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        width: '100%',
      }
    })
  },
  modalContent: {
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
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      }
    }),
  },
  generateButton: {
    backgroundColor: Colors.secondary, // Pasif griden, daha belirgin bir renge geçiş
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
      }
    }),
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
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
      }
    }),
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
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
      }
    }),
  },
  cancelButtonText: {
    color: Colors.critical,
    fontWeight: "700",
    fontSize: 15,
  },
});