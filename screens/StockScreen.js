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
import BarcodeScannerModal from "../components/BarcodeScannerModal";
import { scheduleShipmentNotification } from "../utils/NotificationHelper";
import { triggerHaptic, HapticType, requestStoreReview } from "../utils/FeedbackHelper";
import { SkeletonProductItem } from "../components/Skeleton";

export default function StockScreen({ navigation }) {
  const {
    products,
    updateProduct,
    deleteProduct,
    customers,
    addSale,
    generateInvoiceNumber,
    isPremium,
    appDataLoading,
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
  const [scannerVisible, setScannerVisible] = useState(false);

  const openCustomerSelection = (product) => {
    setSelectedProduct(product);
    setSaleQuantity("1");
    setSalePrice(product.price ? String(product.price) : "");
    setSellModalVisible(true);
  };

  const onEdit = (prod) => {
    if (isPremium) {
      // Premium ise direkt aç
      setEditProduct({ ...prod, quantity: String(prod.quantity ?? 0), cost: String(prod.cost ?? 0), price: String(prod.price ?? 0), criticalStockLimit: String(prod.criticalStockLimit ?? 0) });
      setEditModalVisible(true);
      return;
    }

    // Premium değilse reklam izlet
    Alert.alert(
      "Premium Özellik",
      "Stok kartlarını düzenlemek Premium bir özelliktir.",
      [
        { text: "Vazgeç", style: "cancel" },
        { text: "Premium Al", onPress: () => navigation.navigate("Paywall") }
      ]
    );
  };
  const handleUpdateProduct = () => {
    if (!editProduct || !editProduct.name || !editProduct.name.trim()) { Alert.alert("Hata", "Ürün adı boş olamaz."); return; }
    const updatedProd = { ...editProduct, id: editProduct.id, quantity: parseInt(editProduct.quantity, 10) || 0, cost: parseFloat(editProduct.cost) || 0, price: parseFloat(editProduct.price) || 0, criticalStockLimit: parseInt(editProduct.criticalStockLimit, 10) || 0 };
    updateProduct(updatedProd);
    toast.showToast && toast.showToast(`${updatedProd.name} güncellendi`);
    setEditModalVisible(false);
    setEditProduct(null);
    triggerHaptic(HapticType.SUCCESS);
  };
  const confirmDelete = (id, name) => {
    triggerHaptic(HapticType.WARNING);
    Alert.alert("Silme Onayı", `${name} ürününü silmek istediğinizden emin misiniz?`, [
      { text: "İptal", style: "cancel" },
      {
        text: "Sil", style: "destructive", onPress: () => {
          deleteProduct(id);
          toast.showToast && toast.showToast("Ürün silindi");
          triggerHaptic(HapticType.IMPACT_MEDIUM);
        }
      }
    ]);
  };
  const proceedToInvoice = (product, customer, quantity, price) => {
    const q = parseInt(quantity, 10) || 1; const p = parseFloat(price) || 0;
    if (q <= 0) { Alert.alert("Hata", "Miktar pozitif bir sayı olmalıdır."); return; }
    setInvoicePayload({ product, customer, quantity: q, price: p });
    setSellModalVisible(false);
    setInvoiceModalVisible(true);
    triggerHaptic(HapticType.SELECTION);
  };
  const finalizeSaleWithInvoice = (invoiceNumber, shipmentDateISO) => {
    const payload = invoicePayload;
    if (!payload || !payload.product || !payload.customer) { Alert.alert("Hata", "Ürün veya müşteri bilgisi eksik."); return; }
    const product = payload.product; const customer = payload.customer; const q = payload.quantity; const p = payload.price;
    if (product.quantity < q) { Alert.alert("Stok yetersiz", `Mevcut stok: ${product.quantity}`); return; }
    const updatedProduct = { ...product, quantity: product.quantity - q };
    updateProduct(updatedProduct);

    // Ürün kodu (product.code) eklendi
    const sale = {
      productId: product.id,
      productName: product.name,
      price: p,
      quantity: q,
      cost: product.cost ?? 0,
      dateISO: new Date().toISOString(),
      date: new Date().toLocaleString(),
      customerId: customer.id,
      customerName: customer.name,
      serialNumber: product.serialNumber,
      productCode: product.code, // YENİ EKLENDİ
      category: product.category,
      invoiceNumber: invoiceNumber ?? null,
      isShipped: false,
      shipmentDate: shipmentDateISO
    };

    addSale(sale);

    // BİLDİRİM PLANLA
    if (shipmentDateISO) {
      scheduleShipmentNotification(product.name, shipmentDateISO);
    }

    setInvoiceModalVisible(false);
    setInvoicePayload(null);
    setSelectedProduct(null);
    toast.showToast && toast.showToast("Satış kaydedildi ve sevkiyat bekleniyor.");
    triggerHaptic(HapticType.SUCCESS);
    requestStoreReview(); // Satış başarılı olduğunda değerlendirme iste
  };

  const handleScan = (data) => {
    setSearchQuery(data);
    setScannerVisible(false);
    toast.showToast && toast.showToast("Barkod okundu: " + data);
    triggerHaptic(HapticType.SUCCESS);
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
    <ImmersiveLayout title="Stok" subtitle={`${products.length} ürün`} noScrollView={true}>
      <TouchableOpacity style={styles.addButton} onPress={navigateToAddProduct} activeOpacity={0.8}>
        <Ionicons name={"add-circle-outline"} size={24} color="#fff" />
        <Text style={styles.addButtonText}>Yeni Ürün Ekle</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.detailButton} onPress={navigateToDetailedStock} activeOpacity={0.8}>
        <Ionicons name="stats-chart-outline" size={20} color="#fff" />
        <Text style={styles.detailButtonText}>Detaylı Stok Analizi</Text>
      </TouchableOpacity>

      <View style={styles.searchContainer}>
        <TextInput
          placeholder="Ara (isim, kategori, seri no, kod)..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
          returnKeyType="search"
          placeholderTextColor={Colors.secondary}
        />
        <TouchableOpacity onPress={() => setScannerVisible(true)} style={styles.searchIconContainer}>
          <Ionicons name="barcode-outline" size={24} color={Colors.primary || Colors.iosBlue} />
        </TouchableOpacity>
      </View>

      <View style={styles.sortButtonContainer}>
        <SortButton title="A-Z" currentSort={sortOption} targetSort="nameAZ" onPress={setSortOption} />
        <SortButton title="Stok ↑" currentSort={sortOption} targetSort="stockAsc" onPress={setSortOption} />
        <SortButton title="Stok ↓" currentSort={sortOption} targetSort="stockDesc" onPress={setSortOption} />
      </View>

      <Text style={styles.listTitle}>Stok Listesi ({filteredAndSortedProducts.length})</Text>

      {appDataLoading ? (
        <View style={styles.flatListContent}>
          {[1, 2, 3, 4, 5].map((key) => (
            <SkeletonProductItem key={key} />
          ))}
        </View>
      ) : (
        <FlatList
          data={filteredAndSortedProducts}
          keyExtractor={(i) => i.id}
          renderItem={renderProductItem}
          contentContainerStyle={styles.flatListContent}
          initialNumToRender={10}
          ListEmptyComponent={<Text style={styles.emptyListText}>Stokta ürün bulunamadı.</Text>}
        />
      )}

      {/* --- SATIŞ MODALI (DÜZELTİLDİ) --- */}
      <Modal visible={sellModalVisible} animationType="slide" transparent onRequestClose={() => setSellModalVisible(false)}>
        <KeyboardSafeView offsetIOS={0} disableScrollView={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.sellModalContent}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>{selectedProduct?.name}</Text>
              <Text style={styles.modalSubtitle}>Mevcut Stok: {selectedProduct?.quantity}</Text>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                <Text style={styles.inputLabel}>Satış Miktarı</Text>
                <TextInput style={styles.input} value={saleQuantity} onChangeText={setSaleQuantity} keyboardType="number-pad" placeholder="1" />

                <Text style={styles.inputLabel}>Satış Fiyatı (₺)</Text>
                <TextInput style={styles.input} value={salePrice} onChangeText={setSalePrice} keyboardType="decimal-pad" placeholder="₺" />

                <Text style={[styles.inputLabel, { marginTop: 20 }]}>Müşteri Seç</Text>
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
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                <Text style={styles.inputLabel}>Ürün Adı</Text>
                <TextInput style={styles.input} value={editProduct?.name} onChangeText={(text) => setEditProduct(prev => ({ ...prev, name: text }))} placeholder="Ürün Adı" />

                <View style={styles.rowInputs}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={styles.inputLabel}>Stok Miktarı</Text>
                    <TextInput style={styles.input} value={editProduct?.quantity} onChangeText={(text) => setEditProduct(prev => ({ ...prev, quantity: text.replace(/[^0-9]/g, '') }))} keyboardType="number-pad" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Kritik Limit</Text>
                    <TextInput style={styles.input} value={editProduct?.criticalStockLimit} onChangeText={(text) => setEditProduct(prev => ({ ...prev, criticalStockLimit: text.replace(/[^0-9]/g, '') }))} keyboardType="number-pad" />
                  </View>
                </View>

                <View style={styles.rowInputs}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={styles.inputLabel}>Alış Fiyatı (₺)</Text>
                    <TextInput style={styles.input} value={editProduct?.cost} onChangeText={(text) => setEditProduct(prev => ({ ...prev, cost: text.replace(/[^0-9.]/g, '') }))} keyboardType="decimal-pad" />
                  </View>
                  <View style={{ flex: 1 }}>
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

      <BarcodeScannerModal visible={scannerVisible} onClose={() => setScannerVisible(false)} onScanned={handleScan} />

      {/* REKLAM ALANI */}
      {/* REKLAM ALANI KALDIRILDI */}
    </ImmersiveLayout>
  );
}

// ... (SortButton ve StockListItem aynı) ...
const SortButton = ({ title, currentSort, targetSort, onPress }) => (<TouchableOpacity style={[styles.sortButton, currentSort === targetSort && styles.sortButtonActive]} onPress={() => onPress(targetSort)}><Text style={[styles.sortButtonText, currentSort === targetSort && styles.sortButtonActiveText]}>{title}</Text></TouchableOpacity>);

const StockListItem = ({ item, onSell, onEdit, onDelete }) => {
  const currentQuantity = item.quantity ?? 0;
  const criticalLimit = item.criticalStockLimit ?? 0;
  const isCritical = currentQuantity > 0 && currentQuantity <= criticalLimit;
  const isZero = currentQuantity <= 0;

  // Durum Renkleri ve Metinleri
  const statusColor = isZero ? Colors.critical : (isCritical ? Colors.warning : Colors.profit);
  const statusBg = isZero ? '#FFF5F5' : (isCritical ? '#FFFAF0' : '#F0FFF4');
  const statusText = isZero ? 'Tükendi' : (isCritical ? 'Kritik' : 'Stokta');
  const statusBorder = isZero ? '#FED7D7' : (isCritical ? '#FEEBC8' : '#C6F6D5');

  return (
    <View style={styles.card}>
      {/* Üst Kısım: Başlık ve Durum */}
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.categoryText}>{item.category || 'Genel'}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusBg, borderColor: statusBorder }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Orta Kısım: Detaylar */}
      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>STOK</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="cube-outline" size={12} color={statusColor} style={{ marginRight: 3 }} />
              <Text style={[styles.infoValue, { color: statusColor }]}>{currentQuantity}</Text>
            </View>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>SATIŞ</Text>
            <Text style={styles.infoValue}>{Number(item.price ?? 0).toFixed(2)} ₺</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>MALİYET</Text>
            <Text style={styles.infoValueSmall}>{Number(item.cost ?? 0).toFixed(2)} ₺</Text>
          </View>
        </View>

        <View style={[styles.infoRow, { marginBottom: 0, marginTop: 8 }]}>
          <View style={[styles.infoItem, { flex: 2 }]}>
            <Text style={styles.infoLabel}>KOD / BARKOD</Text>
            <Text style={styles.infoValueSmall} numberOfLines={1}>
              {item.code || '-'}
            </Text>
          </View>
          <View style={[styles.infoItem, { flex: 2 }]}>
            <Text style={styles.infoLabel}>SERİ NO</Text>
            <Text style={styles.infoValueSmall} numberOfLines={1}>
              {item.serialNumber || '-'}
            </Text>
          </View>
        </View>
      </View>

      {/* Alt Kısım: Aksiyon Butonları */}
      <View style={styles.cardActions}>
        <TouchableOpacity style={[styles.actionBtn, styles.editBtn]} onPress={() => onEdit(item)}>
          <Ionicons name="create-outline" size={14} color={Colors.iosBlue} />
          <Text style={styles.editBtnText}>Düzenle</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.sellBtn, isZero && styles.disabledBtn]}
          onPress={() => onSell(item)}
          disabled={isZero}
        >
          <Ionicons name="cart-outline" size={14} color="#fff" />
          <Text style={styles.sellBtnText}>Satış</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteIconBtn} onPress={() => onDelete(item.id, item.name)}>
          <Ionicons name="trash-outline" size={16} color={Colors.critical} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // ... (Mevcut stiller korunuyor)
  sectionContainer: { marginBottom: 12 },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.iosGreen, padding: 12, borderRadius: 10, marginBottom: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 3 },
  addButtonText: { color: '#fff', fontWeight: '700', fontSize: 16, marginLeft: 8 },
  detailButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.iosBlue, padding: 12, borderRadius: 10, marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 3 },
  detailButtonText: { color: '#fff', fontWeight: '700', fontSize: 16, marginLeft: 8 },

  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: "#fff", borderRadius: 10, borderWidth: 1, borderColor: "#E6E9EE", marginBottom: 12 },
  searchInput: { flex: 1, padding: 12, fontSize: 14, color: "#333" },
  searchIconContainer: { padding: 10 },

  sortButtonContainer: { flexDirection: "row", justifyContent: "space-between", marginVertical: 12, backgroundColor: "#fff", borderRadius: 10, padding: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  sortButton: { flex: 1, alignItems: "center", paddingVertical: 4 },
  sortButtonActive: { backgroundColor: '#F3F8FF', borderRadius: 8 },
  sortButtonText: { fontWeight: "600", color: "#777", fontSize: 13 },
  sortButtonActiveText: { color: Colors.iosBlue, fontWeight: "800" },
  listTitle: { fontWeight: "700", marginBottom: 8, fontSize: 15, color: "#333" },
  flatListContent: { paddingBottom: 20 },
  emptyListText: { textAlign: "center", marginTop: 20, color: Colors.secondary, fontStyle: "italic" },

  // --- KOMPAKT KART TASARIMI STİLLERİ ---
  card: {
    backgroundColor: '#fff',
    borderRadius: 12, // Daha az yuvarlak
    marginBottom: 12, // Daha az boşluk
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12, // Azaltıldı
    paddingBottom: 8,
  },
  headerLeft: {
    flex: 1,
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 15, // Küçültüldü (17 -> 15)
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 1,
    letterSpacing: 0.2,
  },
  categoryText: {
    fontSize: 11, // Küçültüldü
    color: '#64748B',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10, // Küçültüldü
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 12,
  },
  cardBody: {
    padding: 12, // Azaltıldı
    paddingTop: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 0, // Satır arası boşluk ayarlandı
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 9, // Küçültüldü
    color: '#94A3B8',
    marginBottom: 2,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 14, // Küçültüldü
    fontWeight: '700',
    color: '#334155',
  },
  infoValueSmall: {
    fontSize: 12, // Küçültüldü
    fontWeight: '600',
    color: '#475569',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8, // Azaltıldı
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6, // Azaltıldı
    paddingHorizontal: 10,
    borderRadius: 8,
    marginRight: 8,
  },
  editBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  editBtnText: {
    color: Colors.iosBlue,
    fontSize: 12, // Küçültüldü
    fontWeight: '700',
    marginLeft: 4,
  },
  sellBtn: {
    backgroundColor: Colors.iosBlue,
    flex: 1,
    shadowColor: Colors.iosBlue,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 1,
  },
  sellBtnText: {
    color: '#fff',
    fontSize: 12, // Küçültüldü
    fontWeight: '700',
    marginLeft: 4,
  },
  disabledBtn: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
  },
  deleteIconBtn: {
    padding: 8, // Azaltıldı
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    marginLeft: 'auto',
  },

  // --- MODAL STİLLERİ (Aynı kaldı) ---
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sellModalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
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
  cancelButton: { alignSelf: "center", marginTop: 15, padding: 10, marginBottom: 10 },
  cancelButtonText: { color: Colors.critical, fontWeight: "700", fontSize: 15 },
});