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
  Dimensions,
} from "react-native";
import { useTranslation } from "react-i18next";
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
import AssemblyModal from "../components/AssemblyModal";

export default function StockScreen({ navigation }) {
  const {
    products,
    updateProduct,
    deleteProduct,
    customers,
    addSale,
    generateInvoiceNumber,
    isPremium,
    sales,
    appDataLoading,
    boms,
    stockLocations,
    getProductStockLocations,
  } = useContext(AppContext);
  const { t } = useTranslation();
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
  const [assemblyModalVisible, setAssemblyModalVisible] = useState(false);

  const openCustomerSelection = (product) => {
    if (!isPremium && sales.length >= 20) {
      if (Platform.OS === 'web') {
        if (window.confirm(t('sales_limit_message'))) {
          navigation.navigate("Paywall");
        }
      } else {
        Alert.alert(
          t('limit_exceeded'),
          t('sales_limit_message'),
          [
            { text: t('cancel'), style: "cancel" },
            { text: t('get_premium'), onPress: () => navigation.navigate("Paywall") }
          ]
        );
      }
      return;
    }

    setSelectedProduct(product);
    setSaleQuantity("1");
    setSalePrice(product.price ? String(product.price) : "");
    setSellModalVisible(true);
  };

  const onEdit = (prod) => {
    if (isPremium) {
      navigation.navigate("AddProductScreen", { product: prod });
      return;
    }

    // Premium değilse reklam izlet
    if (Platform.OS === 'web') {
      if (window.confirm(t('edit_stock_premium_message'))) {
        navigation.navigate("Paywall");
      }
    } else {
      Alert.alert(
        t('premium_feature'),
        t('edit_stock_premium_message'),
        [
          { text: t('cancel'), style: "cancel" },
          { text: t('get_premium'), onPress: () => navigation.navigate("Paywall") }
        ]
      );
    }
  };
  const confirmDelete = (id, name) => {
    triggerHaptic(HapticType.WARNING);
    if (Platform.OS === 'web') {
      if (window.confirm(`${name} ${t('delete_product_confirmation')}`)) {
        deleteProduct(id);
        toast.showToast && toast.showToast(t('product_deleted'));
      }
    } else {
      Alert.alert(t('delete_confirmation'), `${name} ${t('delete_product_confirmation')}`, [
        { text: t('cancel'), style: "cancel" },
        {
          text: t('delete'), style: "destructive", onPress: () => {
            deleteProduct(id);
            toast.showToast && toast.showToast(t('product_deleted'));
            triggerHaptic(HapticType.IMPACT_MEDIUM);
          }
        }
      ]);
    }
  };
  const proceedToInvoice = (product, customer, quantity, price) => {
    const q = parseInt(quantity, 10) || 1; const p = parseFloat(price) || 0;
    if (q <= 0) { Alert.alert(t('error'), t('quantity_must_be_positive')); return; }
    setInvoicePayload({ product, customer, quantity: q, price: p });
    setSellModalVisible(false);
    setInvoiceModalVisible(true);
    triggerHaptic(HapticType.SELECTION);
  };
  const finalizeSaleWithInvoice = (invoiceNumber, shipmentDateISO) => {
    const payload = invoicePayload;
    if (!payload || !payload.product || !payload.customer) { Alert.alert(t('error'), t('missing_product_or_customer')); return; }
    const product = payload.product; const customer = payload.customer; const q = payload.quantity; const p = payload.price;
    if (product.quantity < q) { Alert.alert(t('insufficient_stock'), `${t('current_stock')}: ${product.quantity}`); return; }
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
      brand: product.brand || "",
      unit: product.unit || "uom_pcs",
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
    toast.showToast && toast.showToast(t('sale_recorded_waiting_shipment'));
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
      case "nameAZ": return list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      case "stockAsc": return list.sort((a, b) => (a.quantity || 0) - (b.quantity || 0));
      case "stockDesc": return list.sort((a, b) => (b.quantity || 0) - (a.quantity || 0));
      default: return list;
    }
  }, [products, sortOption]);

  const filteredAndSortedProducts = useMemo(() => {
    if (!searchQuery) return sortedProducts;
    const lowerCaseQuery = searchQuery.toLowerCase();
    return sortedProducts.filter(
      (p) => (p.name || "").toLowerCase().includes(lowerCaseQuery) || ((p.category || "").toLowerCase().includes(lowerCaseQuery)) || ((p.serialNumber || "").toLowerCase().includes(lowerCaseQuery)) || ((p.code || "").toLowerCase().includes(lowerCaseQuery))
    );
  }, [sortedProducts, searchQuery]);

  const renderProductItem = useCallback(({ item }) => {
    const hasBom = (boms || []).some(b =>
      (b.product_code && item.code && b.product_code === item.code) ||
      (b.product_name && item.name && b.product_name.toLowerCase() === item.name.toLowerCase())
    );
    const itemLocs = (stockLocations || []).filter(sl => sl.product_id === item.id && sl.quantity > 0);
    return <StockListItem item={item} onSell={openCustomerSelection} onEdit={onEdit} onDelete={confirmDelete} hasBom={hasBom} stockLocs={itemLocs} />;
  }, [openCustomerSelection, confirmDelete, onEdit, boms, stockLocations]);

  const navigateToDetailedStock = () => { if (navigation && navigation.navigate) { navigation.navigate('DetailedStockScreen'); } };
  const navigateToAddProduct = () => { if (navigation && navigation.navigate) { navigation.navigate('AddProductScreen'); } };

  const handleAssemblyPress = () => {
    if (!isPremium && products.length >= 5) {
      Alert.alert(
        t('limit_exceeded'),
        t('assembly_limit_message'),
        [
          { text: t('cancel'), style: "cancel" },
          { text: t('get_premium'), onPress: () => navigation.navigate("Paywall") }
        ]
      );
      return;
    }
    setAssemblyModalVisible(true);
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Ana Aksiyon Butonları (Mobilde Göster, Web'de Gizle - Sidebar'da var) */}
      {Platform.OS !== 'web' && (
        <View style={styles.topActionsRow}>
          <TouchableOpacity
            style={[styles.headerActionBtn, { backgroundColor: Colors.iosGreen }]}
            onPress={navigateToAddProduct}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle" size={20} color="#fff" />
            <Text style={styles.headerActionText}>{t('add_new_product')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerActionBtn, { backgroundColor: Colors.warning, marginLeft: 10 }]}
            onPress={handleAssemblyPress}
            activeOpacity={0.8}
          >
            <Ionicons name="construct" size={20} color="#000" />
            <Text style={[styles.headerActionText, { color: '#000' }]}>{t('assembly_production')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={styles.analysisButton}
        onPress={navigateToDetailedStock}
        activeOpacity={0.8}
      >
        <Ionicons name="analytics-outline" size={18} color={Colors.iosBlue} />
        <Text style={styles.analysisButtonText}>{t('detailed_stock_analysis')}</Text>
      </TouchableOpacity>

      {/* Arama ve Barkod */}
      <View style={styles.searchRow}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search-outline" size={18} color={Colors.secondary} style={styles.searchIcon} />
          <TextInput
            placeholder={t('search_placeholder_stock')}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInputField}
            returnKeyType="search"
            placeholderTextColor={Colors.secondary}
            selectTextOnFocus={Platform.OS === 'web'}
          />
          {searchQuery !== "" && (
            <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.clearSearchBtn}>
              <Ionicons name="close-circle" size={18} color={Colors.muted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={() => setScannerVisible(true)} style={styles.barcodeBtn}>
          <Ionicons name="barcode-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Sıralama Seçenekleri */}
      <View style={styles.sortContainer}>
        <View style={styles.sortLabelContainer}>
          <Ionicons name="filter-outline" size={14} color={Colors.secondary} />
          <Text style={styles.sortLabel}>{t('sort_az').split(' ')[0]} </Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortScrollContent}>
          <SortButton title={t('sort_az')} currentSort={sortOption} targetSort="nameAZ" onPress={setSortOption} />
          <SortButton title={t('sort_stock_asc')} currentSort={sortOption} targetSort="stockAsc" onPress={setSortOption} />
          <SortButton title={t('sort_stock_desc')} currentSort={sortOption} targetSort="stockDesc" onPress={setSortOption} />
        </ScrollView>
      </View>

      <View style={styles.listHeaderRow}>
        <Text style={styles.listTitle}>{t('stock_list')}</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{filteredAndSortedProducts.length}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <ImmersiveLayout title={t('stock')} subtitle={`${products.length} ürün`} noScrollView={false}>
      {appDataLoading ? (
        <ScrollView contentContainerStyle={styles.flatListContent}>
          {renderHeader()}
          {[1, 2, 3, 4, 5].map((key) => (
            <SkeletonProductItem key={key} />
          ))}
        </ScrollView>
      ) : (
        <>
          {renderHeader()}
          {Platform.OS === 'web' && Dimensions.get('window').width > 768 ? (
            <View style={styles.webTableContainer}>
              {/* Tablo Başlık Bilgisi */}
              <View style={styles.webTableTopBar}>
                <View style={styles.webTableTopBarLeft}>
                  <Ionicons name="cube-outline" size={16} color="#4F46E5" />
                  <Text style={styles.webTableTopBarTitle}>{t('stock_list')}</Text>
                  <View style={styles.webTableTopBarBadge}>
                    <Text style={styles.webTableTopBarBadgeText}>{filteredAndSortedProducts.length} kayıt</Text>
                  </View>
                </View>
              </View>

              {/* Tablo Başlık Satırı */}
              <View style={styles.webTableHeader}>
                <View style={[styles.webHeaderCellContainer, { flex: 2.2 }]}>
                  <Text style={styles.webHeaderCell}>{t('product_name')}</Text>
                </View>
                <View style={[styles.webHeaderCellContainer, { flex: 0.9 }]}>
                  <Text style={styles.webHeaderCell}>{t('product_code')}</Text>
                </View>
                <View style={[styles.webHeaderCellContainer, { flex: 0.8 }]}>
                  <Text style={styles.webHeaderCell}>{t('brand')}</Text>
                </View>
                <View style={[styles.webHeaderCellContainer, { flex: 0.9 }]}>
                  <Text style={styles.webHeaderCell}>{t('category')}</Text>
                </View>
                <View style={[styles.webHeaderCellContainer, { flex: 1 }]}>
                  <Text style={[styles.webHeaderCell, { textAlign: 'center' }]}>{t('stock_quantity')}</Text>
                </View>
                <View style={[styles.webHeaderCellContainer, { flex: 0.9 }]}>
                  <Text style={[styles.webHeaderCell, { textAlign: 'right' }]}>{t('sale_price')}</Text>
                </View>
                <View style={[styles.webHeaderCellContainer, { flex: 1.4 }]}>
                  <Text style={styles.webHeaderCell}>Depo Dağılımı</Text>
                </View>
                <View style={[styles.webHeaderCellContainer, { flex: 1, borderRightWidth: 0 }]}>
                  <Text style={[styles.webHeaderCell, { textAlign: 'center' }]}>{t('actions')}</Text>
                </View>
              </View>

              {/* Tablo Satırları */}
              <FlatList
                data={filteredAndSortedProducts}
                keyExtractor={(i) => i.id}
                renderItem={({ item, index }) => {
                  const hasBom = (boms || []).some(b =>
                    (b.product_code && item.code && b.product_code === item.code) ||
                    (b.product_name && item.name && b.product_name.toLowerCase() === item.name.toLowerCase())
                  );
                  const isCritical = item.quantity <= (item.criticalStockLimit || 0);
                  const isZeroStock = item.quantity <= 0;
                  const locs = (stockLocations || []).filter(sl => sl.product_id === item.id && sl.quantity > 0);
                  return (
                    <View style={[
                      styles.webTableRow,
                      index % 2 === 0 ? styles.webTableRowEven : styles.webTableRowOdd,
                      isZeroStock ? styles.webTableRowZero : null,
                    ]}>
                      {/* Ürün Adı */}
                      <View style={[styles.webCell, { flex: 2.2 }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                          <Text style={styles.webCellTextBold} numberOfLines={2}>{item.name}</Text>
                          {hasBom && (
                            <View style={styles.webBomBadge}>
                              <Text style={styles.webBomBadgeText}>BOM</Text>
                            </View>
                          )}
                        </View>
                        {item.serialNumber ? (
                          <Text style={styles.webCellSubText} numberOfLines={1}>SN: {item.serialNumber}</Text>
                        ) : null}
                      </View>

                      {/* Ürün Kodu */}
                      <View style={[styles.webCell, { flex: 0.9 }]}>
                        {item.code ? (
                          <View style={styles.webCodeBadge}>
                            <Ionicons name="barcode-outline" size={11} color={'#6366F1'} style={{ marginRight: 3 }} />
                            <Text style={styles.webCodeText} numberOfLines={1}>{item.code}</Text>
                          </View>
                        ) : (
                          <Text style={styles.webCellMuted}>—</Text>
                        )}
                      </View>

                      {/* Marka */}
                      <View style={[styles.webCell, { flex: 0.8 }]}>
                        <Text style={styles.webCellText} numberOfLines={1}>{item.brand || '—'}</Text>
                      </View>

                      {/* Kategori */}
                      <View style={[styles.webCell, { flex: 0.9 }]}>
                        {item.category ? (
                          <View style={styles.webCategoryChip}>
                            <Text style={styles.webCategoryChipText} numberOfLines={1}>{item.category}</Text>
                          </View>
                        ) : (
                          <Text style={styles.webCellMuted}>—</Text>
                        )}
                      </View>

                      {/* Stok Miktarı */}
                      <View style={[styles.webCell, { flex: 1, alignItems: 'center' }]}>
                        <View style={[
                          styles.webStockBadge,
                          isZeroStock ? styles.webStockBadgeZero : isCritical ? styles.webStockBadgeCritical : styles.webStockBadgeOk
                        ]}>
                          <View style={[
                            styles.webStockDot,
                            isZeroStock ? { backgroundColor: '#DC2626' } : isCritical ? { backgroundColor: '#D97706' } : { backgroundColor: '#16A34A' }
                          ]} />
                          <Text style={[
                            styles.webStockBadgeText,
                            isZeroStock ? { color: '#B91C1C' } : isCritical ? { color: '#92400E' } : { color: '#15803D' }
                          ]}>{item.quantity} {t(item.unit || 'uom_pcs')}</Text>
                        </View>
                      </View>

                      {/* Satış Fiyatı */}
                      <View style={[styles.webCell, { flex: 0.9, alignItems: 'flex-end' }]}>
                        <Text style={styles.webPriceText}>
                          {Number(item.price ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                        </Text>
                        {item.cost ? (
                          <Text style={styles.webCostText}>
                            Maliyet: {Number(item.cost ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                          </Text>
                        ) : null}
                      </View>

                      {/* Depo Dağılımı */}
                      <View style={[styles.webCell, { flex: 1.4 }]}>
                        {locs.length === 0 ? (
                          (() => {
                            const fallback = item.warehouseLocation || item.warehouse_location;
                            return fallback ? (
                              <View style={styles.webLocChip}>
                                <Ionicons name="location-outline" size={10} color="#6366F1" style={{ marginRight: 3 }} />
                                <Text style={styles.webLocChipText} numberOfLines={1}>{fallback}</Text>
                              </View>
                            ) : (
                              <Text style={styles.webCellMuted}>—</Text>
                            );
                          })()
                        ) : (
                          <View style={{ gap: 4 }}>
                            {locs.slice(0, 3).map((loc, li) => (
                              <View key={loc.id || li} style={styles.webLocRow}>
                                <View style={styles.webLocChip}>
                                  <Ionicons name="business-outline" size={10} color="#6366F1" style={{ marginRight: 3 }} />
                                  <Text style={styles.webLocChipText} numberOfLines={1}>{loc.warehouse_name}</Text>
                                </View>
                                <View style={[
                                  styles.webLocQtyBadge,
                                  loc.quantity <= 0 ? { backgroundColor: '#FEE2E2' } :
                                  loc.quantity <= 5 ? { backgroundColor: '#FEF3C7' } :
                                  { backgroundColor: '#DCFCE7' }
                                ]}>
                                  <Text style={[
                                    styles.webLocQtyText,
                                    loc.quantity <= 0 ? { color: '#B91C1C' } :
                                    loc.quantity <= 5 ? { color: '#92400E' } :
                                    { color: '#166534' }
                                  ]}>{loc.quantity}</Text>
                                </View>
                              </View>
                            ))}
                            {locs.length > 3 && (
                              <Text style={styles.webLocMoreText}>+{locs.length - 3} depo</Text>
                            )}
                          </View>
                        )}
                      </View>

                      {/* Aksiyonlar */}
                      <View style={[styles.webCell, { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, borderRightWidth: 0 }]}>
                        <TouchableOpacity
                          onPress={() => onEdit(item)}
                          style={[styles.webActionBtn, styles.webActionBtnEdit]}
                          title="Düzenle"
                        >
                          <Ionicons name="create-outline" size={15} color={Colors.iosBlue} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => openCustomerSelection(item)}
                          style={[styles.webActionBtn, styles.webActionBtnSell]}
                          disabled={isZeroStock}
                        >
                          <Ionicons name="cart-outline" size={15} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => confirmDelete(item.id, item.name)}
                          style={[styles.webActionBtn, styles.webActionBtnDelete]}
                        >
                          <Ionicons name="trash-outline" size={15} color={Colors.critical} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.webTableEmpty}>
                    <Ionicons name="cube-outline" size={40} color="#CBD5E1" />
                    <Text style={styles.webTableEmptyText}>{t('no_products_in_stock')}</Text>
                  </View>
                }
                scrollEnabled={false}
              />

              {/* Tablo Alt Bilgisi */}
              {filteredAndSortedProducts.length > 0 && (
                <View style={styles.webTableFooter}>
                  <Text style={styles.webTableFooterText}>
                    Toplam {filteredAndSortedProducts.length} ürün listeleniyor
                  </Text>
                  <Text style={styles.webTableFooterText}>
                    Toplam Stok Değeri:{' '}
                    <Text style={styles.webTableFooterValue}>
                      {filteredAndSortedProducts
                        .reduce((sum, p) => sum + (p.quantity || 0) * (p.cost || 0), 0)
                        .toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                    </Text>
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <FlatList
              data={filteredAndSortedProducts}
              keyExtractor={(i) => i.id}
              renderItem={renderProductItem}
              scrollEnabled={false}
              contentContainerStyle={{ paddingBottom: 100 }}
              initialNumToRender={10}
              ListEmptyComponent={<Text style={styles.emptyListText}>{t('no_products_in_stock')}</Text>}
            />
          )}
        </>
      )}

      {/* --- SATIŞ MODALI (DÜZELTİLDİ) --- */}
      <Modal visible={sellModalVisible} animationType="slide" transparent onRequestClose={() => setSellModalVisible(false)}>
        <KeyboardSafeView offsetIOS={0} disableScrollView={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.sellModalContent}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>{selectedProduct?.name}</Text>
              <Text style={styles.modalSubtitle}>{t('current_stock')}: {selectedProduct?.quantity}</Text>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                <Text style={styles.inputLabel}>{t('sale_quantity')}</Text>
                <TextInput style={styles.input} value={saleQuantity} onChangeText={setSaleQuantity} keyboardType="number-pad" placeholder="1" selectTextOnFocus={Platform.OS === 'web'} />

                <Text style={styles.inputLabel}>{t('sale_price')} (₺)</Text>
                <TextInput style={styles.input} value={salePrice} onChangeText={setSalePrice} keyboardType="decimal-pad" placeholder="₺" selectTextOnFocus={Platform.OS === 'web'} />

                <Text style={[styles.inputLabel, { marginTop: 20 }]}>{t('select_customer')}</Text>
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
                    ListEmptyComponent={<Text style={styles.emptyListText}>{t('customer_not_found')}</Text>}
                    nestedScrollEnabled={true}
                  />
                </View>

                <TouchableOpacity style={styles.cancelButton} onPress={() => setSellModalVisible(false)}>
                  <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
            {/* GÜVENLİ ALAN KAPATICI: iPhone X ve üzeri için alt boşluğu kapatan görünmez bir view */}
            <View style={{ height: Platform.OS === 'ios' ? 34 : 0, backgroundColor: '#fff' }} />
          </View>
        </KeyboardSafeView>
      </Modal>

      {/* --- DÜZENLEME MODALI (DÜZELTİLDİ) --- */}

      <InvoiceModal visible={invoiceModalVisible} initialInvoice={""} initialShipmentDate={new Date().toISOString()} onSave={(invoiceNum, shipmentDateISO) => finalizeSaleWithInvoice(invoiceNum, shipmentDateISO)} onCancel={() => { setInvoiceModalVisible(false); setInvoicePayload(null); }} onGenerate={() => generateInvoiceNumber()} productInfo={invoicePayload ? { name: invoicePayload.product.name, quantity: invoicePayload.quantity, totalPrice: (invoicePayload.quantity * invoicePayload.price).toFixed(2) } : null} />

      <BarcodeScannerModal visible={scannerVisible} onClose={() => setScannerVisible(false)} onScanned={handleScan} />

      <AssemblyModal
        visible={assemblyModalVisible}
        onClose={() => setAssemblyModalVisible(false)}
        onComplete={() => {
          triggerHaptic(HapticType.SUCCESS);
          requestStoreReview();
        }}
      />

      {/* REKLAM ALANI */}
      {/* REKLAM ALANI KALDIRILDI */}
    </ImmersiveLayout>
  );
}

// ... (SortButton ve StockListItem aynı) ...
const SortButton = ({ title, currentSort, targetSort, onPress }) => (<TouchableOpacity style={[styles.sortButton, currentSort === targetSort && styles.sortButtonActive]} onPress={() => onPress(targetSort)}><Text style={[styles.sortButtonText, currentSort === targetSort && styles.sortButtonActiveText]}>{title}</Text></TouchableOpacity>);

const StockListItem = ({ item, onSell, onEdit, onDelete, hasBom, stockLocs }) => {
  const currentQuantity = item.quantity ?? 0;
  const criticalLimit = item.criticalStockLimit ?? 0;
  const isCritical = currentQuantity > 0 && currentQuantity <= criticalLimit;
  const isZero = currentQuantity <= 0;

  const statusColor = isZero ? Colors.critical : (isCritical ? Colors.warning : Colors.profit);
  const statusBg = isZero ? '#FFF5F5' : (isCritical ? '#FFFBEB' : '#F0FDF4');
  const { t } = useTranslation();
  const statusText = isZero ? t('out_of_stock') : (isCritical ? t('critical') : t('in_stock'));
  const statusBorder = isZero ? '#FEE2E2' : (isCritical ? '#FEF3C7' : '#DCFCE7');

  // Depo dağılımı: stockLocs varsa onları, yoksa warehouseLocation fallback
  const locationChips = stockLocs && stockLocs.length > 0
    ? stockLocs
    : (item.warehouseLocation || item.warehouse_location)
      ? [{ warehouse_name: item.warehouseLocation || item.warehouse_location, quantity: currentQuantity }]
      : [];

  return (
    <View style={styles.card}>
      {/* Üst Kısım */}
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.titleRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
          </View>
          <View style={styles.subTitleRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{item.brand ? `${item.brand} / ` : ''}{item.category || 'Genel'}</Text>
            </View>
            {hasBom && (
              <View style={[styles.categoryBadge, { backgroundColor: '#F5F3FF' }]}>
                <Ionicons name="layers-outline" size={10} color="#6D28D9" style={{ marginRight: 3 }} />
                <Text style={[styles.categoryText, { color: "#6D28D9" }]}>BOM</Text>
              </View>
            )}
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusBg, borderColor: statusBorder }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Orta Kısım: Metrikler */}
      <View style={styles.cardBody}>
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <View style={styles.metricHeader}>
              <Ionicons name="cube-outline" size={12} color={Colors.secondary} />
              <Text style={styles.metricLabel}>{t('stock_label')}</Text>
            </View>
            <Text style={[styles.metricValue, { color: statusColor }]}>{currentQuantity} {t(item.unit || 'uom_pcs')}</Text>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metricItem}>
            <View style={styles.metricHeader}>
              <Ionicons name="pricetag-outline" size={12} color={Colors.secondary} />
              <Text style={styles.metricLabel}>{t('sale_label')}</Text>
            </View>
            <Text style={styles.metricValue}>{Number(item.price ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</Text>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metricItem}>
            <View style={styles.metricHeader}>
              <Ionicons name="calculator-outline" size={12} color={Colors.secondary} />
              <Text style={styles.metricLabel}>{t('cost_label')}</Text>
            </View>
            <Text style={styles.metricValueSmall}>{Number(item.cost ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</Text>
          </View>
        </View>

        {/* Depo Dağılımı */}
        {locationChips.length > 0 && (
          <View style={styles.locationChipsRow}>
            <Ionicons name="business-outline" size={11} color="#6366F1" style={{ marginRight: 4 }} />
            <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {locationChips.map((loc, li) => (
                <View key={li} style={styles.locationChip}>
                  <Text style={styles.locationChipName} numberOfLines={1}>{loc.warehouse_name}</Text>
                  <View style={[styles.locationChipQty,
                    loc.quantity <= 0 ? { backgroundColor: '#FEE2E2' } : loc.quantity <= 5 ? { backgroundColor: '#FEF3C7' } : { backgroundColor: '#DCFCE7' }
                  ]}>
                    <Text style={[styles.locationChipQtyText,
                      loc.quantity <= 0 ? { color: '#B91C1C' } : loc.quantity <= 5 ? { color: '#92400E' } : { color: '#166534' }
                    ]}>{loc.quantity}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Seri No */}
        {(item.serialNumber || item.code) && (
          <View style={styles.secondaryInfoRow}>
            <View style={styles.secondaryInfoItem}>
              <Text style={styles.secondaryInfoLabel}>{t('serial_no_label')}: </Text>
              <Text style={styles.secondaryInfoValue} numberOfLines={1}>{item.serialNumber || '-'}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Alt Kısım: Aksiyonlar */}
      <View style={styles.cardActions}>
        <TouchableOpacity style={[styles.actionBtn, styles.editBtn]} onPress={() => onEdit(item)}>
          <Ionicons name="create-outline" size={16} color={Colors.iosBlue} />
          <Text style={styles.editBtnText}>{t('edit')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.sellBtn, isZero && styles.disabledBtn]}
          onPress={() => onSell(item)}
          disabled={isZero}
        >
          <Ionicons name="cart-outline" size={16} color="#fff" />
          <Text style={styles.sellBtnText}>{t('sell_action')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteIconBtn} onPress={() => onDelete(item.id, item.name)}>
          <Ionicons name="trash-outline" size={18} color={Colors.critical} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // --- BAŞLIK STİLLERİ ---
  headerContainer: {
    paddingBottom: 4,
  },
  topActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  headerActionText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 6,
  },
  analysisButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  analysisButtonText: {
    color: Colors.iosBlue,
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInputField: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
    height: '100%',
  },
  clearSearchBtn: {
    padding: 4,
  },
  barcodeBtn: {
    width: 48,
    height: 48,
    backgroundColor: Colors.iosBlue,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    shadowColor: Colors.iosBlue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
      }
    }),
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  sortLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  sortLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.secondary,
    marginLeft: 4,
  },
  sortScrollContent: {
    paddingRight: 20,
  },
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  countBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },

  listTitle: { fontWeight: "700", fontSize: 16, color: "#1E293B" },
  flatListContent: { paddingBottom: 20 },
  emptyListText: { textAlign: "center", marginTop: 20, color: Colors.secondary, fontStyle: "italic" },

  // --- KURUMSAL ERP KART TASARIMI ---
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    ...Platform.select({
      web: {
        cursor: 'pointer',
      }
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    paddingBottom: 12,
  },
  headerLeft: {
    flex: 1,
    marginRight: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  subTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  categoryBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  categoryText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  codeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  codeText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 0,
  },
  cardBody: {
    padding: 16,
    backgroundColor: '#FAFBFC', // Hafif farklı arka plan
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metricItem: {
    flex: 1,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },
  metricValueSmall: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 10,
  },
  secondaryInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },

  // --- WEB TABLE STYLES (ERP Kurumsal) ---
  webTableContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 50,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)',
  },
  // Tablo üst info bar
  webTableTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#4F46E5',
    borderBottomWidth: 1,
    borderBottomColor: '#4338CA',
  },
  webTableTopBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  webTableTopBarTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  webTableTopBarBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  webTableTopBarBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  // Tablo başlık satırı
  webTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderBottomWidth: 2,
    borderBottomColor: '#CBD5E1',
  },
  webHeaderCellContainer: {
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRightWidth: 1,
    borderRightColor: '#CBD5E1',
    justifyContent: 'center',
  },
  webHeaderCell: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  // Hücre container (border sag ile ayrım)
  webCell: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    justifyContent: 'center',
  },
  // Tablo satırları
  webTableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    minHeight: 52,
    ...Platform.select({
      web: {
        transition: 'background-color 0.12s ease',
      }
    }),
  },
  webTableRowEven: {
    backgroundColor: '#FFFFFF',
  },
  webTableRowOdd: {
    backgroundColor: '#F9FAFB',
  },
  webTableRowZero: {
    backgroundColor: '#FFFBFB',
  },
  // Metin stilleri
  webCellText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  webCellTextBold: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 18,
  },
  webCellSubText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  webCellMuted: {
    fontSize: 13,
    color: '#D1D5DB',
  },
  webPriceText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'right',
  },
  webCostText: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
    textAlign: 'right',
  },
  // Kategori chip
  webCategoryChip: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    alignSelf: 'flex-start',
  },
  webCategoryChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
  },
  // Stok Durumu Badge
  webStockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    gap: 5,
  },
  webStockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  webStockBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  webStockBadgeOk: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  webStockBadgeCritical: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  webStockBadgeZero: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  // BOM Badge
  webBomBadge: {
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  webBomBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#6D28D9',
    letterSpacing: 0.5,
  },
  // Ürün kodu badge
  webCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    alignSelf: 'flex-start',
    ...Platform.select({ web: { fontFamily: 'monospace' } }),
  },
  webCodeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4338CA',
  },
  // Aksiyon butonları
  webActionBtn: {
    width: 30,
    height: 30,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
        transition: 'all 0.15s ease',
      }
    }),
  },
  webActionBtnEdit: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  webActionBtnSell: {
    backgroundColor: '#059669',
    borderColor: '#047857',
  },
  webActionBtnDelete: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  // Boş durum
  webTableEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  webTableEmptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  // Tablo alt bilgi
  webTableFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  webTableFooterText: {
    fontSize: 12,
    color: '#6B7280',
  },
  webTableFooterValue: {
    fontWeight: '700',
    color: '#111827',
  },
  secondaryInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  secondaryInfoLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  secondaryInfoValue: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginRight: 10,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
      }
    }),
  },
  editBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
      }
    }),
  },
  editBtnText: {
    color: Colors.iosBlue,
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  sellBtn: {
    backgroundColor: Colors.iosBlue,
    flex: 1,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
      }
    }),
  },
  sellBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  disabledBtn: {
    backgroundColor: '#CBD5E1',
  },
  deleteIconBtn: {
    padding: 10,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    marginLeft: 'auto',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
      }
    }),
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
  sortButton: {
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#F1F5F9',
  },
  sortButtonActive: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE' },
  sortButtonText: { fontWeight: "600", color: "#64748B", fontSize: 12 },
  sortButtonActiveText: { color: Colors.iosBlue, fontWeight: "700" },
  saveButton: { backgroundColor: Colors.iosBlue, padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 15 },
  saveButtonText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  cancelButton: { alignSelf: "center", marginTop: 15, padding: 10, marginBottom: 10 },
  cancelButtonText: { color: Colors.critical, fontWeight: "700", fontSize: 15 },
  // Depo Dağılımı (çoklu depo)
  webLocRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 },
  webLocChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  webLocChipText: { fontSize: 10, fontWeight: '600', color: '#4F46E5' },
  webLocQtyBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  webLocQtyText: { fontSize: 10, fontWeight: '700' },
  // Mobil depo dağılım chip
  locationChipsRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  locationChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF', borderRadius: 6, paddingLeft: 6, paddingRight: 2, paddingVertical: 3, borderWidth: 1, borderColor: '#C7D2FE' },
  locationChipName: { fontSize: 11, fontWeight: '600', color: '#4F46E5', maxWidth: 80 },
  locationChipQty: { marginLeft: 4, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  locationChipQtyText: { fontSize: 10, fontWeight: '700' },
});