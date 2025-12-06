import React, { useContext, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Keyboard,
  ScrollView, 
} from "react-native";
import ImmersiveLayout from "../components/ImmersiveLayout"; 
import { AppContext } from "../AppContext"; 
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../Theme"; 
import KeyboardSafeView from "../components/KeyboardSafeView";
import { useToast } from "../components/ToastProvider";

export default function AddProductScreen({ navigation }) {
  const { addProduct } = useContext(AppContext);
  const toast = useToast();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [cost, setCost] = useState(""); 
  const [price, setPrice] = useState(""); 
  const [serialNumber, setSerialNumber] = useState("");
  const [code, setCode] = useState("");
  const [criticalStockLimit, setCriticalStockLimit] = useState("5"); 

  // --- DÜZELTME 1: Fonksiyon 'async' olarak işaretlendi ---
  const handleAdd = async () => {
    Keyboard.dismiss();

    if (!name.trim()) {
      Alert.alert("Hata", "Ürün adı boş olamaz.");
      return;
    }

    const newProduct = {
      // --- DÜZELTME 2: 'id' alanı kaldırıldı. Supabase'in ID üretmesine izin ver. ---
      // id: Date.now().toString(), // BU SATIR KALDIRILDI
      name: name.trim(),
      category: category.trim(),
      quantity: parseInt(quantity, 10) || 0,
      cost: parseFloat(cost) || 0,
      price: parseFloat(price) || 0,
      serialNumber: serialNumber.trim(),
      code: code.trim(),
      criticalStockLimit: parseInt(criticalStockLimit, 10) || 0,
    };

    // --- DÜZELTME 3: 'addProduct' fonksiyonu 'await' ile beklendi ---
    const success = await addProduct(newProduct);

    // 'success' artık 'true' veya 'false' boolean bir değer taşıyor.
    if (success) {
      // Formu temizle
      setName("");
      setCategory("");
      setQuantity("0");
      setCost("");
      setPrice("");
      setSerialNumber("");
      setCode("");
      setCriticalStockLimit("5"); 
      
      toast.showToast && toast.showToast(`${newProduct.name} stoğa eklendi`);
      navigation.goBack(); 
    } else {
        // Hata zaten AppContext'te gösteriliyor, ancak dilerseniz burada da gösterebilirsiniz.
        // Alert.alert("Hata", "Ürün eklenirken bir sorun oluştu.");
        // (AppContext'teki Alert'in gösterilmesi beklenecek)
    }
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

                {/* YENİ ALAN: Kritik Stok Seviyesi */}
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
                <TextInput
                    style={styles.input}
                    value={code}
                    onChangeText={setCode}
                    placeholder="Barkod veya özel ürün kodu"
                    placeholderTextColor={Colors.secondary}
                />

                {/* Ekle Butonu */}
                <TouchableOpacity 
                    style={styles.saveButton} 
                    onPress={handleAdd}
                >
                    <Ionicons name="save-outline" size={20} color="#fff" style={{marginRight: 10}} />
                    <Text style={styles.saveButtonText}>Ürünü Stoğa Ekle</Text>
                </TouchableOpacity>

            </ScrollView>
        </KeyboardSafeView>
    </ImmersiveLayout>
  );
}

// --- Stil Tanımları ---
const styles = StyleSheet.create({
  container: {
    flexGrow: 1, // ScrollView için gerekli
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