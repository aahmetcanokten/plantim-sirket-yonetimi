// Tam Entegre Edilmiş StockScreen.js - (Görsel ve Klavye İyileştirmeleri)

import React, { useContext, useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Alert,
  StyleSheet,
  Platform,
  ScrollView,
} from "react-native";
import ImmersiveLayout from "../components/ImmersiveLayout";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../Theme";
import { AppContext } from "../AppContext";
import KeyboardSafeView from "../components/KeyboardSafeView";
import InvoiceModal from "../components/InvoiceModal";
import { useToast } from "../components/ToastProvider";

export default function StockScreen({ navigation }) {
  const {
    products,
    updateProduct,
    deleteProduct,
    customers,
    addSale,
    generateInvoiceNumber,
  } = useContext(AppContext);
  const toast = useToast();

  // --- State Yönetimi ---
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [sellModalVisible, setSellModalVisible] = useState(false);
  const [saleQuantity, setSaleQuantity] = useState("1");
  const [salePrice, setSalePrice] = useState("");
  const [invoiceModalVisible, setInvoiceModalVisible] = useState(false);
  const [invoicePayload, setInvoicePayload] = useState(null);
  const [sortOption, setSortOption] = useState("nameAZ");

  // ... (Fonksiyonlar aynı kaldı) ...
  const openCustomerSelection = (product) => {
    setSelectedProduct(product);
    setSaleQuantity("1");
    setSalePrice(product.price ? String(product.price) : "");
    setSellModalVisible(true);
  };
  const onEdit = (prod) => {
    setEditProduct({ ...prod, quantity: String(prod.quantity ?? 0), cost: String(prod.cost ?? 0), price: String(prod.price ?? 0), criticalStockLimit: String(prod.criticalStockLimit ?? 0) });
    setEditModalVisible(true);
  };
  const handleUpdateProduct = () => {
      if (!editProduct || !editProduct.name || !editProduct.name.trim()) { Alert.alert("Hata", "Ürün adı boş olamaz."); return; }
      const updatedProd = { ...editProduct, id: editProduct.id, quantity: parseInt(editProduct.quantity, 10) || 0, cost: parseFloat(editProduct.cost) || 0, price: parseFloat(editProduct.price) || 0, criticalStockLimit: parseInt(editProduct.criticalStockLimit, 10) || 0 };
      updateProduct(updatedProd);
      toast.showToast && toast.showToast(`${updatedProd.name} güncellendi`);
      setEditModalVisible(false);
      setEditProduct(null);
  };
  const confirmDelete = (id, name) => {
      Alert.alert("Silme Onayı", `${name} ürününü silmek istediğinizden emin misiniz?`, [{ text: "İptal", style: "cancel" }, { text: "Sil", style: "destructive", onPress: () => { deleteProduct(id); toast.showToast && toast.showToast("Ürün silindi"); } }]);
  };
  const proceedToInvoice = (product, customer, quantity, price) => {
      const q = parseInt(quantity, 10) || 1; const p = parseFloat(price) || 0;
      if (q <= 0) { Alert.alert("Hata", "Miktar pozitif bir sayı olmalıdır."); return; }
      setInvoicePayload({ product, customer, quantity: q, price: p });
      setSellModalVisible(false);
      setInvoiceModalVisible(true);
  };
  const finalizeSaleWithInvoice = (invoiceNumber, shipmentDateISO) => {
      const payload = invoicePayload;
      if (!payload || !payload.product || !payload.customer) { Alert.alert("Hata", "Ürün veya müşteri bilgisi eksik."); return; }
      const product = payload.product; const customer = payload.customer; const q = payload.quantity; const p = payload.price; 
      if (product.quantity < q) { Alert.alert("Stok yetersiz", `Mevcut stok: ${product.quantity}`); return; }
      const updatedProduct = { ...product, quantity: product.quantity - q };
      updateProduct(updatedProduct);
      const sale = { productId: product.id, productName: product.name, price: p, quantity: q, cost: product.cost ?? 0, dateISO: new Date().toISOString(), date: new Date().toLocaleString(), customerId: customer.id, customerName: customer.name, serialNumber: product.serialNumber, category: product.category, invoiceNumber: invoiceNumber ?? null, isShipped: false, shipmentDate: shipmentDateISO };
      addSale(sale);
      setInvoiceModalVisible(false);
      setInvoicePayload(null);
      setSelectedProduct(null);
      toast.showToast && toast.showToast("Satış kaydedildi ve sevkiyat bekleniyor.");
  };

  const sortedProducts = useMemo(() => {
    let list = [...products];
    switch (sortOption) {
      case "nameAZ": return list.sort((a, b) => a.name.localeCompare(b.name));
      case "stockAsc": return list.sort((a, b) => a.quantity - b.quantity);
      case "stockDesc": return list.sort((a, b) => b.quantity - a.quantity);
      default: return list;
    }
  }, [products, sortOption]);

  const filteredAndSortedProducts = useMemo(() => {
    if (!searchQuery) return sortedProducts;
    const lowerCaseQuery = searchQuery.toLowerCase();
    return sortedProducts.filter(
      (p) => p.name.toLowerCase().includes(lowerCaseQuery) || (p.category && p.category.toLowerCase().includes(lowerCaseQuery)) || (p.serialNumber && p.serialNumber.toLowerCase().includes(lowerCaseQuery)) || (p.code && p.code.toLowerCase().includes(lowerCaseQuery))
    );
  }, [sortedProducts, searchQuery]);

  const renderProductItem = useCallback(({ item }) => (
    <StockListItem item={item} onSell={openCustomerSelection} onEdit={onEdit} onDelete={confirmDelete} />
  ), [openCustomerSelection, confirmDelete, onEdit]);

  const navigateToDetailedStock = () => { if (navigation && navigation.navigate) { navigation.navigate('DetailedStockScreen'); } };
  const navigateToAddProduct = () => { if (navigation && navigation.navigate) { navigation.navigate('AddProductScreen'); } };

  return (
    <ImmersiveLayout title="Stok" subtitle={`${products.length} ürün`}>
      <TouchableOpacity style={styles.addButton} onPress={navigateToAddProduct} activeOpacity={0.8}>
        <Ionicons name={"add-circle-outline"} size={24} color="#fff" />
        <Text style={styles.addButtonText}>Yeni Ürün Ekle</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.detailButton} onPress={navigateToDetailedStock} activeOpacity={0.8}>
        <Ionicons name="stats-chart-outline" size={20} color="#fff" />
        <Text style={styles.detailButtonText}>Detaylı Stok Analizi</Text>
      </TouchableOpacity>
      <TextInput placeholder="Ara (isim, kategori, seri no, kod)..." value={searchQuery} onChangeText={setSearchQuery} style={styles.searchInput} returnKeyType="search" placeholderTextColor={Colors.secondary} />
      <View style={styles.sortButtonContainer}>
        <SortButton title="A-Z" currentSort={sortOption} targetSort="nameAZ" onPress={setSortOption} />
        <SortButton title="Stok ↑" currentSort={sortOption} targetSort="stockAsc" onPress={setSortOption} />
        <SortButton title="Stok ↓" currentSort={sortOption} targetSort="stockDesc" onPress={setSortOption} />
      </View>

      <Text style={styles.listTitle}>Stok Listesi ({filteredAndSortedProducts.length})</Text>
      <FlatList
        data={filteredAndSortedProducts}
        keyExtractor={(i) => i.id}
        renderItem={renderProductItem}
        contentContainerStyle={styles.flatListContent}
        ListEmptyComponent={<Text style={styles.emptyListText}>Stokta ürün bulunamadı.</Text>}
      />

      {/* --- SATIŞ MODALI (DÜZELTİLDİ) --- */}
      <Modal visible={sellModalVisible} animationType="slide" transparent onRequestClose={() => setSellModalVisible(false)}>
        <KeyboardSafeView offsetIOS={0} disableScrollView={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.sellModalContent}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>{selectedProduct?.name}</Text>
              <Text style={styles.modalSubtitle}>Mevcut Stok: {selectedProduct?.quantity}</Text>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 20}}>
                  <Text style={styles.inputLabel}>Satış Miktarı</Text>
                  <TextInput style={styles.input} value={saleQuantity} onChangeText={setSaleQuantity} keyboardType="number-pad" placeholder="1" />

                  <Text style={styles.inputLabel}>Satış Fiyatı (₺)</Text>
                  <TextInput style={styles.input} value={salePrice} onChangeText={setSalePrice} keyboardType="decimal-pad" placeholder="₺" />
                  
                  <Text style={[styles.inputLabel, {marginTop: 20}]}>Müşteri Seç</Text>
                  <View style={styles.customerListContainer}>
                      <FlatList
                        data={customers}
                        keyExtractor={(i) => i.id}
                        renderItem={({ item }) => (
                          <TouchableOpacity style={styles.customerItem} onPress={() => proceedToInvoice(selectedProduct, item, saleQuantity, salePrice)}>
                            <Text style={styles.customerName}>{item.name}</Text>
                            <Text style={styles.customerPhone}>{item.phone ?? "-"}</Text>
                          </TouchableOpacity>
                        )}
                        style={{ flex: 1 }}
                        ListEmptyComponent={<Text style={styles.emptyListText}>Müşteri Bulunamadı.</Text>}
                        nestedScrollEnabled={true}
                      />
                  </View>

                  <TouchableOpacity style={styles.cancelButton} onPress={() => setSellModalVisible(false)}>
                    <Text style={styles.cancelButtonText}>İptal</Text>
                  </TouchableOpacity>
              </ScrollView>
            </View>
            {/* GÜVENLİ ALAN KAPATICI: iPhone X ve üzeri için alt boşluğu kapatan görünmez bir view */}
            <View style={{ height: Platform.OS === 'ios' ? 34 : 0, backgroundColor: '#fff' }} /> 
          </View>
        </KeyboardSafeView>
      </Modal>
      
      {/* --- DÜZENLEME MODALI (DÜZELTİLDİ) --- */}
      <Modal visible={editModalVisible} animationType="slide" transparent onRequestClose={() => setEditModalVisible(false)}>
          <KeyboardSafeView offsetIOS={0} disableScrollView={true}>
              <View style={styles.modalOverlay}>
                  <View style={styles.sellModalContent}>
                      <View style={styles.modalHandle} />
                      <Text style={styles.modalTitle}>Ürün Düzenle</Text>
                      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 20}}>
                          <Text style={styles.inputLabel}>Ürün Adı</Text>
                          <TextInput style={styles.input} value={editProduct?.name} onChangeText={(text) => setEditProduct(prev => ({ ...prev, name: text }))} placeholder="Ürün Adı" />
                          
                          <View style={styles.rowInputs}>
                              <View style={{flex: 1, marginRight: 10}}>
                                  <Text style={styles.inputLabel}>Stok Miktarı</Text>
                                  <TextInput style={styles.input} value={editProduct?.quantity} onChangeText={(text) => setEditProduct(prev => ({ ...prev, quantity: text.replace(/[^0-9]/g, '') }))} keyboardType="number-pad" />
                              </View>
                              <View style={{flex: 1}}>
                                  <Text style={styles.inputLabel}>Kritik Limit</Text>
                                  <TextInput style={styles.input} value={editProduct?.criticalStockLimit} onChangeText={(text) => setEditProduct(prev => ({ ...prev, criticalStockLimit: text.replace(/[^0-9]/g, '') }))} keyboardType="number-pad" />
                              </View>
                          </View>

                          <View style={styles.rowInputs}>
                              <View style={{flex: 1, marginRight: 10}}>
                                  <Text style={styles.inputLabel}>Alış Fiyatı (₺)</Text>
                                  <TextInput style={styles.input} value={editProduct?.cost} onChangeText={(text) => setEditProduct(prev => ({ ...prev, cost: text.replace(/[^0-9.]/g, '') }))} keyboardType="decimal-pad" />
                              </View>
                              <View style={{flex: 1}}>
                                  <Text style={styles.inputLabel}>Satış Fiyatı (₺)</Text>
                                  <TextInput style={styles.input} value={editProduct?.price} onChangeText={(text) => setEditProduct(prev => ({ ...prev, price: text.replace(/[^0-9.]/g, '') }))} keyboardType="decimal-pad" />
                              </View>
                          </View>

                          <TouchableOpacity style={[styles.saveButton, { marginTop: 25 }]} onPress={handleUpdateProduct}>
                              <Text style={styles.saveButtonText}>Kaydet ve Güncelle</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.cancelButton} onPress={() => setEditModalVisible(false)}>
                              <Text style={styles.cancelButtonText}>İptal</Text>
                          </TouchableOpacity>
                      </ScrollView>
                  </View>
                  {/* GÜVENLİ ALAN KAPATICI */}
                  <View style={{ height: Platform.OS === 'ios' ? 34 : 0, backgroundColor: '#fff' }} />
              </View>
          </KeyboardSafeView>
      </Modal>

      <InvoiceModal visible={invoiceModalVisible} initialInvoice={""} initialShipmentDate={new Date().toISOString()} onSave={(invoiceNum, shipmentDateISO) => finalizeSaleWithInvoice(invoiceNum, shipmentDateISO)} onCancel={() => { setInvoiceModalVisible(false); setInvoicePayload(null); }} onGenerate={() => generateInvoiceNumber()} productInfo={invoicePayload ? { name: invoicePayload.product.name, quantity: invoicePayload.quantity, totalPrice: (invoicePayload.quantity * invoicePayload.price).toFixed(2) } : null} />
    </ImmersiveLayout>
  );
}

// ... (SortButton ve StockListItem aynı) ...
const SortButton = ({ title, currentSort, targetSort, onPress }) => ( <TouchableOpacity style={[styles.sortButton, currentSort === targetSort && styles.sortButtonActive]} onPress={() => onPress(targetSort)}> <Text style={[styles.sortButtonText, currentSort === targetSort && styles.sortButtonActiveText]}>{title}</Text> </TouchableOpacity> );
const StockListItem = ({ item, onSell, onEdit, onDelete }) => { const currentQuantity = item.quantity ?? 0; const criticalLimit = item.criticalStockLimit ?? 0; const isCritical = currentQuantity > 0 && currentQuantity <= criticalLimit; const isZero = currentQuantity <= 0; const stockColor = isZero ? Colors.critical : (isCritical ? Colors.warning : Colors.profit); const stockLabel = isZero ? 'STOK BİTTİ' : (isCritical ? 'KRİTİK STOK' : 'Stok Adeti'); return ( <View style={styles.card}> {isCritical && !isZero && ( <View style={styles.orderWarningBand}> <Ionicons name="alert-circle-outline" size={14} color="#fff" /> <Text style={styles.orderWarningText}>Sipariş Verilmeli (Limit: {criticalLimit})</Text> </View> )} <View style={styles.cardInfo}> <View style={styles.cardTitleRow}> <Text style={styles.cardTitle}>{item.name}</Text> {isCritical && !isZero && <Text style={styles.criticalBadge}>KRİTİK</Text>} {isZero && <Text style={styles.zeroStockBadge}>BİTTİ</Text>} </View> <Text style={styles.categoryText}>{item.category || 'Kategori Yok'}</Text> <View style={styles.cardRow}> <Ionicons name="barcode-outline" size={14} color={Colors.secondary} /> <Text style={styles.cardText}> {item.code ? `Kod: ${item.code}` : (item.serialNumber ? `Seri No: ${item.serialNumber}` : 'Kod/Seri Yok')} </Text> </View> <View style={styles.cardRow}> <Ionicons name="cube-outline" size={14} color={stockColor} /> <Text style={[styles.cardText, { color: stockColor, fontWeight: '700' }]}> {stockLabel}: {currentQuantity} </Text> </View> <View style={styles.priceContainer}> <View style={styles.cardRowPrice}> <Ionicons name="wallet-outline" size={14} color={Colors.secondary} /> <Text style={styles.cardText}>Maliyet: {Number(item.cost ?? 0).toFixed(2)} ₺</Text> </View> <View style={styles.cardRowPrice}> <Ionicons name="cash-outline" size={14} color={Colors.profit} /> <Text style={styles.cardText}>Satış: {Number(item.price ?? 0).toFixed(2)} ₺</Text> </View> </View> </View> <View style={styles.cardActions}> <TouchableOpacity style={[styles.actionButton, styles.sellButton]} onPress={() => onSell(item)} disabled={isZero}> <Ionicons name="cart-outline" size={18} color="#fff" /> <Text style={styles.actionButtonText}>{isZero ? 'Bitti' : 'Sat'}</Text> </TouchableOpacity> <View style={styles.actionIconRow}> <TouchableOpacity style={[styles.actionButton, styles.editButton]} onPress={() => onEdit(item)}> <Ionicons name="create-outline" size={18} color={Colors.iosBlue} /> </TouchableOpacity> <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={() => onDelete(item.id, item.name)}> <Ionicons name="trash-outline" size={18} color={Colors.critical} /> </TouchableOpacity> </View> </View> </View> ); };

const styles = StyleSheet.create({
  // ... (Mevcut stiller) ...
  sectionContainer: { marginBottom: 12 },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.iosGreen, padding: 12, borderRadius: 10, marginBottom: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 3 },
  addButtonText: { color: '#fff', fontWeight: '700', fontSize: 16, marginLeft: 8 },
  detailButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.iosBlue, padding: 12, borderRadius: 10, marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 3 },
  detailButtonText: { color: '#fff', fontWeight: '700', fontSize: 16, marginLeft: 8 },
  searchInput: { backgroundColor: "#fff", padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#E6E9EE", fontSize: 14, color: "#333" },
  sortButtonContainer: { flexDirection: "row", justifyContent: "space-between", marginVertical: 12, backgroundColor: "#fff", borderRadius: 10, padding: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  sortButton: { flex: 1, alignItems: "center", paddingVertical: 4 },
  sortButtonActive: { backgroundColor: '#F3F8FF', borderRadius: 8 },
  sortButtonText: { fontWeight: "600", color: "#777", fontSize: 13 },
  sortButtonActiveText: { color: Colors.iosBlue, fontWeight: "800" },
  listTitle: { fontWeight: "700", marginBottom: 8, fontSize: 15, color: "#333" },
  flatListContent: { paddingBottom: 20 },
  emptyListText: { textAlign: "center", marginTop: 20, color: Colors.secondary, fontStyle: "italic" },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1, overflow: 'hidden', paddingTop: 12 },
  cardInfo: { flex: 1, paddingRight: 8 },
  orderWarningBand: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: Colors.warning, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 4, borderTopLeftRadius: 12, borderTopRightRadius: 12, zIndex: 10, marginBottom: 5 },
  orderWarningText: { color: '#fff', fontSize: 11, fontWeight: '700', marginLeft: 5 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, marginTop: 0 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, marginRight: 10 },
  criticalBadge: { backgroundColor: Colors.warning, color: '#fff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, fontSize: 10, fontWeight: '700' },
  zeroStockBadge: { backgroundColor: Colors.critical, color: '#fff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, fontSize: 10, fontWeight: '700' },
  categoryText: { fontSize: 13, color: Colors.secondary, marginBottom: 6, fontStyle: 'italic' },
  cardRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  cardRowPrice: { flexDirection: 'row', alignItems: 'center', width: '48%' },
  cardText: { fontSize: 13, color: Colors.secondary, marginLeft: 6 },
  priceContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, borderTopWidth: 1, borderTopColor: '#F5F5F5', paddingTop: 6, flexWrap: 'wrap' },
  cardActions: { justifyContent: 'space-between', alignItems: 'flex-end' },
  actionButton: { padding: 6, borderRadius: 8, alignItems: 'center' },
  actionIconRow: { flexDirection: 'row', marginTop: 8 },
  sellButton: { backgroundColor: Colors.iosBlue, flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8 },
  actionButtonText: { color: '#fff', fontWeight: '700', marginLeft: 6, fontSize: 14 },
  editButton: { backgroundColor: '#F3F8FF', marginRight: 5, padding: 8 },
  deleteButton: { backgroundColor: '#FFF5F5', padding: 8 },

  // --- GÜNCELLENEN MODAL STİLLERİ ---
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
    // Alt kısımdaki boşluğu kapatmak için paddingBottom'u kaldırdık, yerine ayrı view kullandık.
  },
  sellModalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    // paddingBottom: Platform.OS === 'ios' ? 34 : 24, // BURASI KALDIRILDI, yerine alt view geldi.
    maxHeight: "85%",
  },
  modalHandle: {
      width: 40,
      height: 4,
      backgroundColor: '#E0E0E0',
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 15,
  },
  modalTitle: { fontWeight: "800", fontSize: 20, marginBottom: 4, color: Colors.textPrimary, textAlign: 'center' },
  modalSubtitle: { color: Colors.secondary, marginBottom: 20, fontSize: 14, textAlign: 'center' },
  inputLabel: { marginTop: 12, fontWeight: "700", fontSize: 14, color: "#333" },
  input: { borderWidth: 1, borderColor: "#E6E9EE", borderRadius: 12, padding: 14, marginTop: 6, backgroundColor: "#FBFDFF", fontSize: 16, color: Colors.textPrimary },
  rowInputs: { flexDirection: 'row', justifyContent: 'space-between' },
  customerListContainer: { height: 220, marginTop: 8, borderWidth: 1, borderColor: '#F1F5F9', borderRadius: 12, overflow: 'hidden' },
  customerItem: { paddingVertical: 14, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9", backgroundColor: '#fff' },
  customerName: { fontWeight: "700", fontSize: 15, color: "#333" },
  customerPhone: { color: Colors.secondary, fontSize: 13, marginTop: 2 },
  saveButton: { backgroundColor: Colors.iosBlue, padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 15 },
  saveButtonText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  cancelButton: { alignSelf: "center", marginTop: 15, padding: 10, marginBottom: 10 }, // Alt boşluk eklendi
  cancelButtonText: { color: Colors.critical, fontWeight: "700", fontSize: 15 },
});