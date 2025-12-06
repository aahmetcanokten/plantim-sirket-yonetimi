import React, { useContext, useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Keyboard,
  ScrollView,
  Platform
} from "react-native";
import ImmersiveLayout from "../components/ImmersiveLayout";
import { AppContext } from "../AppContext";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../Theme";
import KeyboardSafeView from "../components/KeyboardSafeView";
import { useToast } from "../components/ToastProvider";
import BarcodeScannerModal from "../components/BarcodeScannerModal";

export default function AddProductScreen({ navigation }) {
  const { addProduct, products, isPremium } = useContext(AppContext);
  const toast = useToast();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [cost, setCost] = useState("");
  const [price, setPrice] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [code, setCode] = useState("");
  const [criticalStockLimit, setCriticalStockLimit] = useState("5");
  const [scannerVisible, setScannerVisible] = useState(false);

  const resetForm = () => {
    setName("");
    setCategory("");
    setQuantity("0");
    setCost("");
    setPrice("");
    setSerialNumber("");
    setCode("");
    setCriticalStockLimit("5");
  };

  const handleAdd = async () => {
    Keyboard.dismiss();

    if (!name.trim()) {
      Alert.alert("Hata", "Ürün adı boş olamaz.");
      return;
    }

    const newProduct = {
      name: name.trim(),
      category: category.trim(),
      quantity: parseInt(quantity, 10) || 0,
      cost: parseFloat(cost) || 0,
      price: parseFloat(price) || 0,
      serialNumber: serialNumber.trim(),
      code: code.trim(),
      criticalStockLimit: parseInt(criticalStockLimit, 10) || 0,
    };

    // --- LİMİT KONTROLÜ ---
    if (!isPremium && products.length >= 5) {
      Alert.alert(
        "Limit Aşıldı",
        "Ücretsiz planda limitiniz doldu. Sınırsız ürün eklemek için Premium'a geçin.",
        [
          { text: "Vazgeç", style: "cancel" },
          { text: "Premium Al", onPress: () => navigation.navigate("Paywall") }
        ]
      );
      return;
    }

    const success = await addProduct(newProduct);

    if (success) {
      resetForm();
      toast.showToast && toast.showToast(`${newProduct.name} stoğa eklendi`);
      navigation.goBack();
    }
  };

  const handleScan = (data) => {
    setCode(data);
    setScannerVisible(false);
    toast.showToast && toast.showToast("Barkod okundu: " + data);
  };

  return (
    <ImmersiveLayout
      title="Yeni Ürün Ekle"
      subtitle="Stok envanterine yeni bir ürün kaydet"
      showBackButton={true}
      navigation={navigation}
    >
      <KeyboardSafeView offsetIOS={120}>
        <ScrollView contentContainerStyle={styles.container}>

          {/* Ürün Adı */}
          <Text style={styles.inputLabel}>Ürün Adı *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Örn: Siyah T-Shirt"
            placeholderTextColor={Colors.secondary}
          />

          {/* Kategori */}
          <Text style={styles.inputLabel}>Kategori</Text>
          <TextInput
            style={styles.input}
            value={category}
            onChangeText={setCategory}
            placeholder="Örn: Giyim, Elektronik, Yedek Parça"
            placeholderTextColor={Colors.secondary}
          />

          {/* Stok Miktarı */}
          <Text style={styles.inputLabel}>Mevcut Stok Miktarı</Text>
          <TextInput
            style={styles.input}
            value={quantity}
            onChangeText={(text) => setQuantity(text.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={Colors.secondary}
          />

          {/* Kritik Stok Seviyesi */}
          <Text style={styles.inputLabel}>Kritik Stok Seviyesi</Text>
          <TextInput
            style={styles.input}
            value={criticalStockLimit}
            onChangeText={(text) => setCriticalStockLimit(text.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            placeholder="5"
            placeholderTextColor={Colors.secondary}
          />

          <View style={styles.priceRow}>
            {/* Alış Fiyatı (Maliyet) */}
            <View style={styles.priceColumn}>
              <Text style={styles.inputLabel}>Alış Fiyatı (₺)</Text>
              <TextInput
                style={styles.input}
                value={cost}
                onChangeText={(text) => setCost(text.replace(/[^0-9.]/g, ''))}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={Colors.secondary}
              />
            </View>

            {/* Satış Fiyatı */}
            <View style={styles.priceColumn}>
              <Text style={styles.inputLabel}>Satış Fiyatı (₺)</Text>
              <TextInput
                style={styles.input}
                value={price}
                onChangeText={(text) => setPrice(text.replace(/[^0-9.]/g, ''))}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={Colors.secondary}
              />
            </View>
          </View>

          {/* Seri Numarası */}
          <Text style={styles.inputLabel}>Seri Numarası</Text>
          <TextInput
            style={styles.input}
            value={serialNumber}
            onChangeText={setSerialNumber}
            placeholder="Ürünün seri numarası"
            placeholderTextColor={Colors.secondary}
          />

          {/* Ürün Kodu */}
          <Text style={styles.inputLabel}>Ürün Kodu/Barkod</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.inputWithIcon}
              value={code}
              onChangeText={setCode}
              placeholder="Barkod veya özel ürün kodu"
              placeholderTextColor={Colors.secondary}
            />
            <TouchableOpacity onPress={() => setScannerVisible(true)} style={styles.iconContainer}>
              <Ionicons name="barcode-outline" size={24} color={Colors.primary || Colors.iosBlue} />
            </TouchableOpacity>
          </View>

          {/* Ekle Butonu */}
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleAdd}
          >
            <Ionicons name="save-outline" size={20} color="#fff" style={{ marginRight: 10 }} />
            <Text style={styles.saveButtonText}>Ürünü Stoğa Ekle</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardSafeView>
      <BarcodeScannerModal visible={scannerVisible} onClose={() => setScannerVisible(false)} onScanned={handleScan} />
    </ImmersiveLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingTop: 10,
    paddingBottom: 20,
  },
  inputLabel: {
    marginTop: 15,
    fontWeight: "700",
    fontSize: 14,
    color: "#333",
    marginBottom: 5,
  },
  input: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E6E9EE",
    fontSize: 16,
    color: "#333",
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E6E9EE",
  },
  inputWithIcon: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: "#333",
  },
  iconContainer: {
    padding: 10,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  priceColumn: {
    width: '48%',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.iosGreen,
    padding: 16,
    borderRadius: 12,
    marginTop: 30,
    shadowColor: Colors.profit,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 18,
  },
});