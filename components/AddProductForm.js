import React, { useState } from "react";
import { View, TextInput, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
// import { AppContext } from "../AppContext";
import { Colors, CardRadius, ButtonRadius } from "../Theme";
import { useToast } from "./ToastProvider";
import { useTranslation } from "react-i18next";


/*
  AddProductForm (Revize Edildi)
  - Gereksiz (redundant) ürün kodu kontrolü kaldırıldı.
  - Bu kontrol artık merkezi olarak AppContext'teki addProduct tarafından yapılıyor.
*/

export default function AddProductForm({ onAdd }) {
  // REVİZYON: 'products' context'ine artık burada gerek yok.
  // const { products } = useContext(AppContext);
  const toast = useToast();
  const { t } = useTranslation();

  const [name, setName] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [category, setCategory] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [price, setPrice] = useState("");
  const [criticalLevel, setCriticalLevel] = useState("0");
  const [productCode, setProductCode] = useState("");

  const submit = () => {
    // Basic validation
    if (!name.trim()) {
      toast.showToast && toast.showToast(t("product_name_required"));
      return;
    }
    if (!productCode.trim()) {
      toast.showToast && toast.showToast(t("product_code_required"));
      return;
    }

    // REVİZYON: Gereksiz 'existing' kontrolü kaldırıldı.
    // const existing = products.find((p) => p.productCode && p.productCode.toLowerCase() === productCode.trim().toLowerCase());
    // if (existing) {
    //   toast.showToast && toast.showToast("Aynı ürün koduna sahip bir ürün zaten var. Farklı bir kod girin veya ürünü düzenleyin.");
    //   return;
    // }

    const q = parseInt(quantity, 10) || 0;
    if (q < 0) {
      toast.showToast && toast.showToast(t("quantity_cannot_be_negative"));
      return;
    }
    const p = parseFloat(price) || 0;
    if (p < 0) {
      toast.showToast && toast.showToast(t("price_cannot_be_negative"));
      return;
    }
    const crit = parseInt(criticalLevel || "0", 10) || 0;

    const newProduct = {
      // id: Date.now().toString(), // REMOVED: Managed by backend
      name: name.trim(),
      serialNumber: serialNumber.trim(),
      category: category.trim(),
      quantity: q,
      price: p,
      criticalLevel: crit,
      productCode: productCode.trim(),
    };

    // onAdd (StockScreen'deki onAddProduct) AppContext'i çağıracak
    // ve AppContext GEREKİRSE hatayı (Alert) gösterecek.
    // Dönen 'success' değerine göre formu temizliyoruz.
    const success = onAdd && onAdd(newProduct);

    if (success) {
      // clear
      setName("");
      setSerialNumber("");
      setCategory("");
      setQuantity("1");
      setPrice("");
      setCriticalLevel("0");
      setProductCode("");

      // Toast mesajı artık 'onAddProduct' içinde gösteriliyor,
      // burada tekrar göstermeye gerek yok.
      // toast.showToast && toast.showToast(t("product_added"));
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{t("product_code_label")}</Text>
      <TextInput
        style={styles.input}
        value={productCode}
        onChangeText={setProductCode}
        placeholder={t("product_code_placeholder")}
        autoCapitalize="characters"
        accessibilityLabel={t("product_code_label")}
      />

      <Text style={styles.label}>{t("product_name")}</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder={t("product_name_placeholder")} accessibilityLabel={t("product_name")} />

      <Text style={styles.label}>{t("model_category")}</Text>
      <TextInput style={styles.input} value={category} onChangeText={setCategory} placeholder={t("model_category_placeholder")} accessibilityLabel={t("model_category")} />

      <View style={{ flexDirection: "row" }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{t("quantity_simple")}</Text>
          <TextInput style={styles.input} value={quantity} onChangeText={setQuantity} keyboardType="number-pad" accessibilityLabel={t("quantity_simple")} />
        </View>
        <View style={{ width: 12 }} />
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{t("price_currency_simple")}</Text>
          <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="decimal-pad" accessibilityLabel={t("price_currency_simple")} />
        </View>
      </View>

      <Text style={styles.label}>{t("serial_number")}</Text>
      <TextInput style={styles.input} value={serialNumber} onChangeText={setSerialNumber} placeholder={t("serial_number")} accessibilityLabel={t("serial_number")} />

      <Text style={styles.label}>{t("critical_level")}</Text>
      <TextInput style={styles.input} value={criticalLevel} onChangeText={setCriticalLevel} keyboardType="number-pad" accessibilityLabel={t("critical_level")} />

      <TouchableOpacity style={styles.addButton} onPress={submit} accessibilityRole="button" accessibilityLabel={t("add_product_button")}>
        <Text style={styles.addButtonText}>{t("add_product_button")}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: CardRadius,
    marginBottom: 12,
  },
  label: { fontSize: 13, color: "#374151", marginBottom: 6, fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderColor: "#E6E9EE",
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#FBFDFF",
    marginBottom: 8,
    color: "#0B1220",
  },
  addButton: {
    marginTop: 6,
    backgroundColor: Colors.iosBlue,
    padding: 12,
    borderRadius: ButtonRadius,
    alignItems: "center",
  },
  addButtonText: { color: "#fff", fontWeight: "700" },
});