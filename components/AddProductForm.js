import React, { useState, useContext } from "react";
import { View, TextInput, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { AppContext } from "../AppContext";
import { Colors, CardRadius, ButtonRadius } from "../Theme";
import { useToast } from "./ToastProvider";

/*
  AddProductForm (Revize Edildi)
  - Gereksiz (redundant) ürün kodu kontrolü kaldırıldı.
  - Bu kontrol artık merkezi olarak AppContext'teki addProduct tarafından yapılıyor.
*/

export default function AddProductForm({ onAdd }) {
  // REVİZYON: 'products' context'ine artık burada gerek yok.
  // const { products } = useContext(AppContext);
  const toast = useToast();

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
      toast.showToast && toast.showToast("Ürün adı zorunludur.");
      return;
    }
    if (!productCode.trim()) {
      toast.showToast && toast.showToast("Ürün kodu zorunludur.");
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
      toast.showToast && toast.showToast("Adet negatif olamaz.");
      return;
    }
    const p = parseFloat(price) || 0;
    if (p < 0) {
      toast.showToast && toast.showToast("Fiyat negatif olamaz.");
      return;
    }
    const crit = parseInt(criticalLevel || "0", 10) || 0;

    const newProduct = {
      id: Date.now().toString(),
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
      // toast.showToast && toast.showToast("Ürün eklendi");
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Ürün Kodu</Text>
      <TextInput
        style={styles.input}
        value={productCode}
        onChangeText={setProductCode}
        placeholder="Örn: PROD-001"
        autoCapitalize="characters"
        accessibilityLabel="Ürün Kodu"
      />

      <Text style={styles.label}>Ürün Adı</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Örn: Kulaklık" accessibilityLabel="Ürün Adı" />

      <Text style={styles.label}>Model / Kategori</Text>
      <TextInput style={styles.input} value={category} onChangeText={setCategory} placeholder="Model / Kategori" accessibilityLabel="Model veya kategori" />

      <View style={{ flexDirection: "row" }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Adet</Text>
          <TextInput style={styles.input} value={quantity} onChangeText={setQuantity} keyboardType="number-pad" accessibilityLabel="Adet" />
        </View>
        <View style={{ width: 12 }} />
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Fiyat (₺)</Text>
          <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="decimal-pad" accessibilityLabel="Fiyat" />
        </View>
      </View>

      <Text style={styles.label}>Seri No</Text>
      <TextInput style={styles.input} value={serialNumber} onChangeText={setSerialNumber} placeholder="Seri No" accessibilityLabel="Seri numarası" />

      <Text style={styles.label}>Kritik Seviye</Text>
      <TextInput style={styles.input} value={criticalLevel} onChangeText={setCriticalLevel} keyboardType="number-pad" accessibilityLabel="Kritik seviye" />

      <TouchableOpacity style={styles.addButton} onPress={submit} accessibilityRole="button" accessibilityLabel="Ürünü Ekle">
        <Text style={styles.addButtonText}>Ürünü Ekle</Text>
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