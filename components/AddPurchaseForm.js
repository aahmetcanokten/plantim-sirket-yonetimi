import React, { useState, useEffect, useContext } from "react";
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  Alert,
  ScrollView,
} from "react-native";
import { AppContext } from "../AppContext";
import { Colors, CardRadius, ButtonRadius } from "../Theme";
import DatePickerButton from "./DatePickerButton";
import KeyboardSafeView from "./KeyboardSafeView";

/*
  AddPurchaseForm (DÜZELTİLDİ: Buton Görünürlüğü)
  - Kaydet butonunun aktif halindeki rengi Colors.iosBlue olarak sabitlendi.
*/

export default function AddPurchaseForm({ onAdd, onCancel, initial = null }) {
  const { products, addProduct } = useContext(AppContext);

  const [productId, setProductId] = useState(initial?.productId || null);
  const [productName, setProductName] = useState(initial?.productName || "");
  const [model, setModel] = useState(initial?.model || "");
  const [quantity, setQuantity] = useState(initial ? String(initial.quantity || "1") : "1");
  const [supplier, setSupplier] = useState(initial?.supplier || "");
  const [unitCost, setUnitCost] = useState(initial ? String(initial.unitCost ?? "") : "");
  const [expectedDate, setExpectedDate] = useState(initial?.expectedDateISO ? new Date(initial.expectedDateISO) : null);

  const [prodModalVisible, setProdModalVisible] = useState(false);
  const [prodSearch, setProdSearch] = useState("");
  const [quickAddModalVisible, setQuickAddModalVisible] = useState(false);
  const [qaName, setQaName] = useState("");
  const [qaCategory, setQaCategory] = useState("");
  const [qaCode, setQaCode] = useState("");

  useEffect(() => {
    if (initial) {
      setProductId(initial.productId || null);
      setProductName(initial.productName || "");
      setModel(initial.model || "");
      setQuantity(String(initial.quantity || "1"));
      setSupplier(initial.supplier || "");
      setUnitCost(initial.unitCost != null ? String(initial.unitCost) : "");
      setExpectedDate(initial.expectedDateISO ? new Date(initial.expectedDateISO) : null);
    }
  }, [initial]);

  const submit = () => {
    if (!productId) {
      Alert.alert("Ürün Seçimi Zorunlu", "Lütfen stok takibi için 'Mevcut Ürün Seç' veya 'Yeni Ürün Tanımla' butonlarını kullanın.");
      return;
    }
    
    if (!productName.trim()) {
      Alert.alert("Hata", "Ürün bilgisi eksik.");
      return;
    }
    const q = parseInt(quantity, 10);
    if (isNaN(q) || q <= 0) {
      Alert.alert("Hata", "Geçerli bir adet girin.");
      return;
    }
    const cost = parseFloat(unitCost);
    if (unitCost !== "" && (isNaN(cost) || cost < 0)) {
      Alert.alert("Hata", "Birim maliyet negatif olamaz.");
      return;
    }
    
    const p = {
      productId: productId,
      productName: productName.trim(),
      model: model.trim(),
      quantity: q,
      supplier: supplier.trim(),
      unitCost: isNaN(cost) ? 0 : cost,
      expectedDateISO: expectedDate ? expectedDate.toISOString() : null,
    };
    onAdd && onAdd(p);
  };

  const openProductSelector = () => {
    setProdSearch("");
    setProdModalVisible(true);
  };

  const selectProduct = (prod) => {
    setProductId(prod.id);
    setProductName(prod.name || "");
    setModel(prod.category || "");
    if (prod.cost) {
        setUnitCost(String(prod.cost));
    }
    setProdModalVisible(false);
  };

  const filteredProducts = products.filter((p) => {
    const q = (prodSearch || "").trim().toLowerCase();
    if (!q) return true;
    return (p.name || "").toLowerCase().includes(q) ||
      (p.category || "").toLowerCase().includes(q) ||
      (p.serialNumber || "").toLowerCase().includes(q) ||
      (p.productCode || "").toLowerCase().includes(q);
  });

  const openQuickAddModal = () => {
    setQaName("");
    setQaCategory("");
    setQaCode("");
    setQuickAddModalVisible(true);
  };

  const handleQuickAddProduct = () => {
    if (!qaName.trim()) {
      Alert.alert("Hata", "Ürün adı zorunludur.");
      return;
    }
    const initialCost = parseFloat(unitCost) || 0;
    const newProduct = {
      id: Date.now().toString(),
      name: qaName.trim(),
      category: qaCategory.trim(),
      code: qaCode.trim(),
      quantity: 0,
      cost: initialCost,
      price: 0,
    };

    if (addProduct) {
      const success = addProduct(newProduct);
      if (success) {
          setProductId(newProduct.id);
          setProductName(newProduct.name);
          setModel(newProduct.category);
          Alert.alert("Başarılı", "Yeni ürün stoğa tanımlandı ve seçildi.");
          setQuickAddModalVisible(false);
      }
    } else {
      Alert.alert("Hata", "Ürün ekleme fonksiyonu bulunamadı.");
    }
  };

  const clearSelection = () => {
      setProductId(null);
      setProductName("");
      setModel("");
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff", borderRadius: CardRadius }}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.label}>Ürün Bilgisi <Text style={{color: Colors.critical}}>*</Text></Text>
            {productId ? (
              <TouchableOpacity onPress={clearSelection}>
                 <Text style={styles.disconnectLink}>Seçimi Temizle</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <TouchableOpacity activeOpacity={1} onPress={() => !productId && Alert.alert("Bilgi", "Lütfen aşağıdaki butonları kullanarak ürün seçin.")}>
            <View style={[styles.readOnlyInputContainer, !productId && styles.placeholderContainer]}>
                <Text style={[styles.readOnlyText, !productId && styles.placeholderText]}>
                    {productName || "Ürün seçimi bekleniyor..."}
                </Text>
            </View>
          </TouchableOpacity>

          <View style={{ marginTop: 8 }}>
            <Text style={styles.label}>Model / Kategori</Text>
             <View style={[styles.readOnlyInputContainer, styles.readOnlyGray]}>
                <Text style={[styles.readOnlyText, !model && styles.placeholderText]}>
                    {model || "-"}
                </Text>
            </View>
          </View>

          {!productId && (
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity style={[styles.actionBtn, styles.selectBtn]} onPress={openProductSelector}>
                <Text style={styles.actionBtnText}>Mevcut Ürün Seç</Text>
              </TouchableOpacity>
              <View style={{ width: 10 }} />
              <TouchableOpacity style={[styles.actionBtn, styles.createBtn]} onPress={openQuickAddModal}>
                <Text style={styles.actionBtnText}>Yeni Ürün Tanımla</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ flexDirection: "row", marginTop: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Sipariş Adeti</Text>
              <TextInput style={styles.input} value={quantity} onChangeText={setQuantity} keyboardType="number-pad" placeholder="1" />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Birim Maliyet (₺)</Text>
              <TextInput style={styles.input} value={unitCost} onChangeText={setUnitCost} keyboardType="decimal-pad" placeholder="0.00" />
            </View>
          </View>

          <Text style={[styles.label, { marginTop: 8 }]}>Tedarikçi Firma</Text>
          <TextInput style={styles.input} value={supplier} onChangeText={setSupplier} placeholder="Örn: ABC Teknoloji A.Ş." />

          <Text style={[styles.label, { marginTop: 8 }]}>Beklenen Teslim Tarihi</Text>
          <DatePickerButton value={expectedDate} onChange={setExpectedDate} placeholder="Tarih Seçiniz" />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
            style={[styles.addButton, !productId && styles.disabledButton]} 
            onPress={submit}
            disabled={!productId}
        >
          <Text style={styles.addButtonText}>
              {initial ? "Siparişi Güncelle" : "Satın Alma Siparişi Oluştur"}
          </Text>
        </TouchableOpacity>
        
        {onCancel && (
            <TouchableOpacity style={styles.cancelLink} onPress={onCancel}>
                <Text style={styles.cancelLinkText}>İptal</Text>
            </TouchableOpacity>
        )}
      </View>

      {/* --- MODALLAR (Aynı) --- */}
      <Modal visible={prodModalVisible} animationType="slide" transparent>
        <KeyboardSafeView offsetIOS={20}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Stoktan Ürün Seç</Text>
                <TouchableOpacity onPress={() => setProdModalVisible(false)}>
                  <Text style={styles.closeText}>Kapat</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={[styles.input, { marginBottom: 8 }]}
                placeholder="Ürün ara..."
                value={prodSearch}
                onChangeText={setProdSearch}
              />
              <FlatList
                data={filteredProducts}
                keyExtractor={(i) => i.id}
                style={{ maxHeight: 300 }}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.prodRow} onPress={() => selectProduct(item)}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.prodRowTitle}>{item.name}</Text>
                      <Text style={styles.prodRowSubtitle}>
                        {item.category} {item.code ? `• Kod: ${item.code}` : ""}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ color: Colors.secondary, fontSize: 12 }}>Stok</Text>
                        <Text style={{ fontWeight: "700", color: item.quantity > 0 ? Colors.iosGreen : Colors.critical }}>
                            {item.quantity || 0} ad.
                        </Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </KeyboardSafeView>
      </Modal>

      <Modal visible={quickAddModalVisible} animationType="slide" transparent>
        <KeyboardSafeView offsetIOS={80}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalCard}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Yeni Stok Kartı Oluştur</Text>
                        <TouchableOpacity onPress={() => setQuickAddModalVisible(false)}>
                            <Text style={styles.closeText}>İptal</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView>
                        <Text style={styles.modalSubtitle}>
                            Sipariş vermek için yeni ürünü stoğa tanımlayın.
                        </Text>
                        <Text style={styles.label}>Ürün Adı <Text style={{color: Colors.critical}}>*</Text></Text>
                        <TextInput style={styles.input} value={qaName} onChangeText={setQaName} placeholder="Örn: Yeni Model Yazıcı" />
                        <Text style={[styles.label, {marginTop: 10}]}>Kategori / Model</Text>
                        <TextInput style={styles.input} value={qaCategory} onChangeText={setQaCategory} placeholder="Örn: Ofis Malzemeleri" />
                         <Text style={[styles.label, {marginTop: 10}]}>Ürün Kodu / Barkod (Opsiyonel)</Text>
                        <TextInput style={styles.input} value={qaCode} onChangeText={setQaCode} placeholder="Örn: YZC-001" />
                        <TouchableOpacity style={[styles.addButton, { marginTop: 20, backgroundColor: Colors.iosGreen }]} onPress={handleQuickAddProduct}>
                            <Text style={styles.addButtonText}>Kaydet ve Siparişe Seç</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
        </KeyboardSafeView>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 20,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    backgroundColor: "#fff",
  },
  card: {
    padding: 16,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E6E9EE",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#FBFDFF",
    fontSize: 15,
    color: "#333",
  },
  readOnlyInputContainer: {
      borderWidth: 1,
      borderColor: "#E6E9EE",
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: "#F9FAFB",
      justifyContent: 'center',
  },
  readOnlyGray: {
      backgroundColor: "#F3F4F6",
  },
  placeholderContainer: {
      borderColor: Colors.iosBlue,
      borderStyle: 'dashed',
      backgroundColor: "#F0F9FF",
  },
  readOnlyText: {
      fontSize: 15,
      fontWeight: "600",
      color: "#111827",
  },
  placeholderText: {
      color: Colors.iosBlue,
      fontWeight: "500",
  },
  disconnectLink: {
    color: Colors.critical,
    fontWeight: "600",
    fontSize: 13,
  },
  actionButtonsContainer: {
    flexDirection: "row",
    marginTop: 12,
    marginBottom: 4,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  selectBtn: {
    backgroundColor: Colors.iosBlue,
  },
  createBtn: {
    backgroundColor: Colors.iosGreen,
  },
  actionBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  // DÜZELTME BURADA:
  addButton: {
    backgroundColor: Colors.iosBlue, // Colors.primary yerine kesin bir renk kullanıldı
    paddingVertical: 14,
    borderRadius: ButtonRadius,
    alignItems: "center",
  },
  disabledButton: {
      backgroundColor: "#9CA3AF",
      opacity: 0.7,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
  cancelLink: {
      alignSelf: 'center',
      marginTop: 12,
      padding: 5, 
  },
  cancelLinkText: {
      color: Colors.critical,
      fontWeight: '700',
      fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  modalTitle: {
    fontWeight: "800",
    fontSize: 18,
    color: Colors.textPrimary,
  },
  modalSubtitle: {
      fontSize: 14,
      color: Colors.secondary,
      marginBottom: 15,
  },
  closeText: {
    color: Colors.iosBlue,
    fontSize: 16,
    fontWeight: "600",
  },
  prodRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    flexDirection: "row",
    alignItems: "center",
  },
  prodRowTitle: {
      fontWeight: "700",
      fontSize: 15,
      color: "#333",
  },
  prodRowSubtitle: {
      color: Colors.secondary,
      fontSize: 13,
      marginTop: 2,
  }
});