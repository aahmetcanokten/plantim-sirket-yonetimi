import React, { useContext, useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Dimensions,
} from "react-native";
import { useTranslation } from "react-i18next";
import ImmersiveLayout from "../components/ImmersiveLayout";
import { Colors } from "../Theme";
import { AppContext } from "../AppContext";
import SettingsButton from "../components/SettingsButton";
// import InvoiceModal from "../components/InvoiceModal"; // KALDIRILDI: Yeni modal kullanılıyor
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

// YENİ INVOICEMODAL İÇE AKTARILDI
import InvoiceModal from "../components/InvoiceModal";
import { triggerHaptic, HapticType, requestStoreReview } from "../utils/FeedbackHelper";
import { SkeletonProductItem } from "../components/Skeleton";
import CompositeSaleModal from "../components/CompositeSaleModal";
import { createAndPrintSalesForm } from "../utils/SalesPdfHelper";


export default function SalesScreen() {
  // AppContext'ten gerekli işlevleri ve verileri al
  // products eklendi
  const { sales, removeSale, recreateProductFromSale, updateSale, isPremium, products, customers, company, appDataLoading, workOrders, addWorkOrder } = useContext(AppContext);
  const { t } = useTranslation();
  const [productFilterInput, setProductFilterInput] = useState("");
  const [customerFilterInput, setCustomerFilterInput] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [pageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(0);
  const [visibleData, setVisibleData] = useState([]);
  const navigation = useNavigation();

  // YENİ STATE: Aktif Sekmeyi Yönetme
  const [activeTab, setActiveTab] = useState('active'); // 'active' (Sevk Edilmemiş) veya 'completed' (Sevk Edilmiş)
  const [sortConfig, setSortConfig] = useState({ key: 'dateISO', direction: 'desc' });

  // Kar/Zarar Hesaplama
  const calculateProfit = (sale) => {
    const cost = sale.cost ?? 0;
    const price = sale.price ?? 0;
    const qty = sale.quantity ?? 1;
    return (price - cost) * qty;
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Filtreleme gecikmesini ayarlama
  useEffect(() => {
    const t = setTimeout(() => setProductFilter(productFilterInput), 300);
    return () => clearTimeout(t);
  }, [productFilterInput]);

  useEffect(() => {
    const t = setTimeout(() => setCustomerFilter(customerFilterInput), 300);
    return () => clearTimeout(t);
  }, [customerFilterInput]);

  // Filtrelenmiş veriyi hesaplama (isShipped filtresi eklendi)
  const filtered = useMemo(() => {
    let result = sales.filter((s) => {
      // Sekme filtresi
      const isShipped = s.isShipped === true;
      if (activeTab === 'active' && isShipped) return false;
      if (activeTab === 'completed' && !isShipped) return false;

      // Diğer filtreler
      if (productFilter && !(s.productName || "").toLowerCase().includes(productFilter.toLowerCase())) return false;
      if (customerFilter && !(s.customerName || "").toLowerCase().includes(customerFilter.toLowerCase())) return false;
      if (startDate && new Date(s.dateISO) < new Date(startDate)) return false;
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (new Date(s.dateISO) > end) return false;
      }
      return true;
    });

    if (sortConfig.key) {
      result.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        if (sortConfig.key === 'profit') {
          aVal = calculateProfit(a);
          bVal = calculateProfit(b);
        } else if (sortConfig.key === 'dateISO') {
          aVal = new Date(aVal).getTime() || 0;
          bVal = new Date(bVal).getTime() || 0;
        } else if (typeof aVal === 'string' && typeof bVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }

        if (aVal === undefined || aVal === null) aVal = "";
        if (bVal === undefined || bVal === null) bVal = "";

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [sales, productFilter, customerFilter, startDate, endDate, activeTab, sortConfig]);

  // Sayfalama ve görünür veriyi güncelleme
  useEffect(() => {
    setCurrentPage(0);
    setVisibleData(filtered.slice(0, pageSize));
  }, [filtered, pageSize]);

  const loadMoreItems = () => {
    if (visibleData.length >= filtered.length || filtered.length === 0) return;
    const nextPage = currentPage + 1;
    const nextData = filtered.slice(nextPage * pageSize, (nextPage + 1) * pageSize);
    if (nextData.length > 0) {
      setCurrentPage(nextPage);
      setVisibleData((prevData) => [...prevData, ...nextData]);
    }
  };

  // Satış İptali İşlevi
  const confirmCancel = (sale) => {
    triggerHaptic(HapticType.WARNING); // Uyarı titreşimi

    if (Platform.OS === 'web') {
      if (window.confirm(`${sale.productName} x${sale.quantity} (${sale.customerName}) ${t('cancel_sale_confirmation')}\n\n${t('cancel_sale_disclaimer')}`)) {
        recreateProductFromSale(sale); // Ürünü stoğa geri ekler
        removeSale(sale.id); // Satış kaydını siler
        triggerHaptic(HapticType.SUCCESS);
      }
      return;
    }

    Alert.alert(
      t('cancel_sale'),
      `${sale.productName} x${sale.quantity} (${sale.customerName}) ${t('cancel_sale_confirmation')}\n\n${t('cancel_sale_disclaimer')}`,
      [
        { text: t('no'), style: "cancel" },
        {
          text: t('yes_cancel'),
          style: "destructive",
          onPress: () => {
            recreateProductFromSale(sale); // Ürünü stoğa geri ekler
            removeSale(sale.id); // Satış kaydını siler
            triggerHaptic(HapticType.SUCCESS);
          },
        },
      ]
    );
  };

  // YENİ INVOICEMODAL İÇE AKTARILDI
  const [compositeModalVisible, setCompositeModalVisible] = useState(false);

  // Satış Ekleme Menüsü
  // Satış Ekleme Menüsü - GÜNCELLENDİ: Direkt Kompozit/Sipariş Ekranı Açılıyor
  const handleNewSalePress = () => {
    // Limit kontrolü (Kompozit satış için)
    if (!isPremium && sales.length >= 20) {
      Alert.alert(
        t('limit_exceeded'),
        t('sales_limit_message'),
        [
          { text: t('cancel'), style: "cancel" },
          { text: t('get_premium'), onPress: () => navigation.navigate("Paywall") }
        ]
      );
      return;
    }
    // Direkt modalı aç
    setCompositeModalVisible(true);
  };


  const markAsShipped = (sale) => {
    triggerHaptic(HapticType.IMPACT_LIGHT);

    if (Platform.OS === 'web') {
      if (window.confirm(`${sale.productName} x${sale.quantity} ${t('shipment_confirmation_message')}`)) {
        updateSale({ ...sale, isShipped: true });
        triggerHaptic(HapticType.SUCCESS);
        requestStoreReview();
      }
      return;
    }

    Alert.alert(
      t('shipment_confirmation'),
      `${sale.productName} x${sale.quantity} ${t('shipment_confirmation_message')}`,
      [
        { text: t('no'), style: "cancel" },
        {
          text: t('yes_shipped'),
          style: "default",
          onPress: () => {
            // isShipped değerini true olarak güncelle
            updateSale({ ...sale, isShipped: true });
            triggerHaptic(HapticType.SUCCESS);
            requestStoreReview(); // Memnuniyet anı: İşlem tamamlandı
          },
        },
      ]
    );
  };

  const handleCreateWorkOrder = (sale) => {
    triggerHaptic(HapticType.IMPACT_LIGHT);

    const proceed = async () => {
      try {
        const today = new Date();
        const dateStr = today.getFullYear().toString() +
          (today.getMonth() + 1).toString().padStart(2, '0') +
          today.getDate().toString().padStart(2, '0');

        const todaysOrders = workOrders.filter(wo => {
          const woDate = new Date(wo.created_at);
          return woDate.toDateString() === today.toDateString();
        });

        const nextNum = (todaysOrders.length + 1).toString().padStart(3, '0');
        const woNumber = `${dateStr}-${nextNum}`;

        const woData = {
          product_id: sale.productId,
          target_quantity: sale.quantity,
          notes: `Satıştan otomatik oluşturuldu. Müşteri: ${sale.customerName}`,
          processes: [],
          raw_material_id: null,
          raw_material_usage: null,
          wo_number: woNumber,
          created_at: new Date().toISOString()
        };

        await addWorkOrder(woData);
        triggerHaptic(HapticType.SUCCESS);
        if (Platform.OS === 'web') {
          window.alert(t('success') ? t('success') + ": İş emri başarıyla oluşturuldu." : "İş emri başarıyla oluşturuldu.");
        } else {
          Alert.alert(t('success') || "Başarılı", "İş emri başarıyla oluşturuldu.");
        }
      } catch (e) {
        if (Platform.OS === 'web') {
          window.alert(t('error') ? t('error') + ": İş emri oluşturulurken hata." : "İş emri oluşturulurken hata.");
        } else {
          Alert.alert(t('error') || "Hata", "İş emri oluşturulurken hata oluştu.");
        }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm("Bu sipariş için iş emri oluşturmak istediğinize emin misiniz?")) {
        proceed();
      }
    } else {
      Alert.alert(
        "İş Emri Oluştur",
        "Bu sipariş için iş emri oluşturmak istediğinize emin misiniz?",
        [
          { text: t('no') || "Hayır", style: "cancel" },
          { text: t('yes') || "Evet", onPress: proceed }
        ]
      );
    }
  };

  const [invoiceModalVisible, setInvoiceModalVisible] = useState(false);
  const [editingSale, setEditingSale] = useState(null);

  const handlePrintForm = async (sale) => {
    try {
      const customer = customers.find(c => c.id === sale.customerId);
      const product = products.find(p => p.id === sale.productId);
      await createAndPrintSalesForm(sale, company, customer, product, t);
    } catch (error) {
      console.error("Print error:", error);
      Alert.alert(t('error'), t('unexpected_error_message') + "\n" + error.message);
    }
  };

  // Fatura Düzenleyiciyi Açma
  const openInvoiceEditor = (sale) => {
    setEditingSale(sale);
    setInvoiceModalVisible(true);
    triggerHaptic(HapticType.SELECTION);
  };

  // Fatura Numarasını ve Sevk Tarihini Kaydetme
  // Modal'dan gelen iki argümanı da işleyecek şekilde güncellendi
  const saveInvoiceForSale = (invoiceNumber, shipmentDateISO) => {
    if (editingSale) {
      // Satış kaydındaki fatura numarasını ve sevk tarihini güncelle
      updateSale({
        ...editingSale,
        invoiceNumber: invoiceNumber,
        shipmentDate: shipmentDateISO, // Yeni alan da güncelleniyor
      });
      triggerHaptic(HapticType.SUCCESS);
      requestStoreReview();
    }
    setInvoiceModalVisible(false);
    setEditingSale(null);
  };

  const rightButton = <SettingsButton />;

  // Sevk Tarihini biçimlendirme
  const formatShipmentDate = (dateISO) => {
    if (!dateISO) return t('date_not_specified');
    const date = new Date(dateISO);
    return date.toLocaleDateString("tr-TR", { day: '2-digit', month: 'short' });
  }

  return (
    <ImmersiveLayout
      title={t('sales')}
      subtitle={activeTab === 'active' ? `${t('waiting_shipment')} (${filtered.length})` : `${t('completed')} (${filtered.length})`}
      right={rightButton}
      noScrollView={false}
    >
      {/* 1. Üst Alan: Analiz ve Sekmeler */}
      <View style={styles.headerContainer}>
        {/* YENİ SATIŞ BUTONU */}
        <TouchableOpacity
          style={styles.newSaleButton}
          onPress={handleNewSalePress}
          activeOpacity={0.8}
        >
          <View style={styles.newSaleIconWrapper}>
            <Ionicons name="add" size={24} color="#fff" />
          </View>
          <Text style={styles.newSaleButtonText}>{t('create_new_sale')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.analyzeButton}
          onPress={() => navigation.navigate("Analytics")}
        >
          <View style={styles.analyzeContent}>
            <View style={styles.analyzeIconWrapper}>
              <Ionicons name="stats-chart" size={16} color="#fff" />
            </View>
            <Text style={styles.analyzeButtonText}>{t('view_sales_reports')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Colors.iosBlue} />
        </TouchableOpacity>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'active' && styles.tabButtonActive]}
            onPress={() => setActiveTab('active')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'active' && styles.tabButtonTextActive]}>
              {t('active_sales')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'completed' && styles.tabButtonActive]}
            onPress={() => setActiveTab('completed')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'completed' && styles.tabButtonTextActive]}>
              {t('history')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Arama / Filtreleme */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search-outline" size={18} color={Colors.secondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('search_product_model')}
            placeholderTextColor={Colors.muted}
            value={productFilterInput}
            onChangeText={setProductFilterInput}
            selectTextOnFocus={Platform.OS === 'web'}
          />
        </View>
        <View style={[styles.searchInputWrapper, { marginTop: 10 }]}>
          <Ionicons name="person-outline" size={18} color={Colors.secondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('search_customer')}
            placeholderTextColor={Colors.muted}
            value={customerFilterInput}
            onChangeText={setCustomerFilterInput}
            selectTextOnFocus={Platform.OS === 'web'}
          />
        </View>
      </View>

      {/* 3. Satış Listesi */}
      {appDataLoading ? (
        <View style={{ paddingHorizontal: 4 }}>
          {[1, 2, 3, 4, 5].map((key) => (
            <SkeletonProductItem key={key} />
          ))}
        </View>
      ) : (
        <>
          {Platform.OS === 'web' && Dimensions.get('window').width > 768 ? (
            <View style={styles.webTableContainer}>
              <View style={styles.webTableHeader}>
                <TouchableOpacity style={[styles.webHeaderCol, { flex: 1.5 }]} onPress={() => handleSort('dateISO')}>
                  <Text style={styles.webHeaderCell}>{t('date') || 'Tarih'}</Text>
                  {sortConfig.key === 'dateISO' && <Ionicons name={sortConfig.direction === 'asc' ? 'chevron-up' : 'chevron-down'} size={12} color="#475569" style={{ marginLeft: 4, marginTop: 1 }} />}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.webHeaderCol, { flex: 2 }]} onPress={() => handleSort('customerName')}>
                  <Text style={styles.webHeaderCell}>{t('customers')}</Text>
                  {sortConfig.key === 'customerName' && <Ionicons name={sortConfig.direction === 'asc' ? 'chevron-up' : 'chevron-down'} size={12} color="#475569" style={{ marginLeft: 4, marginTop: 1 }} />}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.webHeaderCol, { flex: 2 }]} onPress={() => handleSort('productName')}>
                  <Text style={styles.webHeaderCell}>{t('product_name')}</Text>
                  {sortConfig.key === 'productName' && <Ionicons name={sortConfig.direction === 'asc' ? 'chevron-up' : 'chevron-down'} size={12} color="#475569" style={{ marginLeft: 4, marginTop: 1 }} />}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.webHeaderCol, { flex: 1, justifyContent: 'center' }]} onPress={() => handleSort('quantity')}>
                  <Text style={[styles.webHeaderCell, { textAlign: 'center' }]}>{t('quantity_short') || 'Adet'}</Text>
                  {sortConfig.key === 'quantity' && <Ionicons name={sortConfig.direction === 'asc' ? 'chevron-up' : 'chevron-down'} size={12} color="#475569" style={{ marginLeft: 4, marginTop: 1 }} />}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.webHeaderCol, { flex: 1.5, justifyContent: 'flex-end' }]} onPress={() => handleSort('price')}>
                  <Text style={[styles.webHeaderCell, { textAlign: 'right' }]}>{t('price_currency_simple') || 'Tutar'}</Text>
                  {sortConfig.key === 'price' && <Ionicons name={sortConfig.direction === 'asc' ? 'chevron-up' : 'chevron-down'} size={12} color="#475569" style={{ marginLeft: 4, marginTop: 1 }} />}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.webHeaderCol, { flex: 1.5, justifyContent: 'flex-end' }]} onPress={() => handleSort('profit')}>
                  <Text style={[styles.webHeaderCell, { textAlign: 'right' }]}>{t('profit_loss')}</Text>
                  {sortConfig.key === 'profit' && <Ionicons name={sortConfig.direction === 'asc' ? 'chevron-up' : 'chevron-down'} size={12} color="#475569" style={{ marginLeft: 4, marginTop: 1 }} />}
                </TouchableOpacity>
                <View style={[styles.webHeaderCol, { flex: 1.5, justifyContent: 'center' }]}>
                  <Text style={[styles.webHeaderCell, { textAlign: 'center' }]}>{t('info') || 'Bilgi'}</Text>
                </View>
                <View style={[styles.webHeaderCol, { flex: 2, justifyContent: 'center' }]}>
                  <Text style={[styles.webHeaderCell, { textAlign: 'center' }]}>{t('actions') || 'İşlemler'}</Text>
                </View>
              </View>
              <FlatList
                data={visibleData}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <View style={styles.emptyIconContainer}>
                      <Ionicons name={activeTab === 'active' ? "cube-outline" : "checkmark-done-circle-outline"} size={48} color={Colors.muted} />
                    </View>
                    <Text style={styles.emptyListText}>
                      {activeTab === 'active' ? t('no_waiting_shipment') : t('no_completed_sales')}
                    </Text>
                  </View>
                }
                renderItem={({ item, index }) => {
                  const profit = calculateProfit(item);
                  const saleDate = new Date(item.dateISO).toLocaleDateString("tr-TR", {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                  });
                  const isCriticalShipment = activeTab === 'active' && item.shipmentDate && new Date(item.shipmentDate) < new Date();
                  const productCode = item.productCode || products.find(p => p.id === item.productId)?.code;

                  return (
                    <View style={[styles.webTableRow, index % 2 === 0 ? styles.webTableRowEven : styles.webTableRowOdd]}>
                      <View style={{ flex: 1.5, justifyContent: 'center' }}>
                        <Text style={styles.webCellText}>{saleDate}</Text>
                      </View>
                      <View style={{ flex: 2, justifyContent: 'center', paddingRight: 8 }}>
                        <Text style={styles.webCellTextBold} numberOfLines={1}>{item.customerName}</Text>
                      </View>
                      <View style={{ flex: 2, justifyContent: 'center', paddingRight: 8 }}>
                        <Text style={styles.webCellTextBold} numberOfLines={1}>{item.productName}</Text>
                        {productCode && <Text style={styles.webCellSubText}>#{productCode}</Text>}
                      </View>
                      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <View style={styles.webQuantityBadge}>
                          <Text style={styles.webQuantityText}>x{item.quantity}</Text>
                        </View>
                      </View>
                      <View style={{ flex: 1.5, justifyContent: 'center', alignItems: 'flex-end', paddingRight: 10 }}>
                        <Text style={[styles.webCellTextBold, { color: Colors.iosBlue }]}>
                          {Number(item.price ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                        </Text>
                      </View>
                      <View style={{ flex: 1.5, justifyContent: 'center', alignItems: 'flex-end', paddingRight: 10 }}>
                        <Text style={[styles.webCellTextBold, { color: profit >= 0 ? Colors.iosGreen : Colors.critical }]}>
                          {profit >= 0 ? '+' : ''}{profit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                        </Text>
                      </View>
                      <View style={{ flex: 1.5, justifyContent: 'center', alignItems: 'center' }}>
                        {item.invoiceNumber ? (
                          <View style={[styles.webSmallBadge, { backgroundColor: '#E3F2FD', borderColor: '#BBDEFB' }]}>
                            <Text style={[styles.webSmallBadgeText, { color: Colors.iosBlue }]}>{t('inv_abbr')}: {item.invoiceNumber}</Text>
                          </View>
                        ) : (
                          <View style={[styles.webSmallBadge, { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' }]}>
                            <Text style={[styles.webSmallBadgeText, { color: Colors.muted }]}>{t('no_invoice')}</Text>
                          </View>
                        )}
                        {item.source_quote_id && (
                          <View style={[styles.webSmallBadge, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A', marginTop: 4 }]}>
                            <Text style={[styles.webSmallBadgeText, { color: '#D97706' }]}>📋 Tekliften</Text>
                          </View>
                        )}
                        {activeTab === 'active' && item.shipmentDate && (
                          <View style={[styles.webSmallBadge, isCriticalShipment ? { backgroundColor: Colors.critical, borderColor: '#B91C1C' } : { backgroundColor: '#E3F2FD', borderColor: '#BBDEFB' }, { marginTop: 4 }]}>
                            <Text style={[styles.webSmallBadgeText, isCriticalShipment ? { color: '#fff' } : { color: Colors.iosBlue }]}>
                              {t('shipped_abbr')}: {formatShipmentDate(item.shipmentDate)}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={{ flex: 2, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
                        {activeTab === 'active' && (
                          <TouchableOpacity onPress={() => markAsShipped(item)} style={[styles.webActionBtn, { backgroundColor: '#E8F5E9', borderColor: '#C8E6C9' }]}>
                            <Ionicons name="checkmark" size={16} color={Colors.iosGreen} />
                          </TouchableOpacity>
                        )}
                        {activeTab === 'active' && Platform.OS === 'web' && (
                          <TouchableOpacity onPress={() => handleCreateWorkOrder(item)} style={[styles.webActionBtn, { backgroundColor: '#FFF3E0', borderColor: '#FFE0B2' }]}>
                            <Ionicons name="construct-outline" size={16} color="#FF9800" />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={() => openInvoiceEditor(item)} style={[styles.webActionBtn, { backgroundColor: '#E3F2FD', borderColor: '#BBDEFB' }]}>
                          <Ionicons name="document-text" size={16} color={Colors.iosBlue} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handlePrintForm(item)} style={[styles.webActionBtn, { backgroundColor: '#F3E5F5', borderColor: '#E1BEE7' }]}>
                          <Ionicons name="print-outline" size={16} color="#9C27B0" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => confirmCancel(item)} style={[styles.webActionBtn, { backgroundColor: '#FFEBEE', borderColor: '#FFCDD2' }]}>
                          <Ionicons name="trash-outline" size={16} color={Colors.critical} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }}
                ListFooterComponent={() => {
                  const hasMore = visibleData.length < filtered.length;
                  if (hasMore) {
                    return (
                      <TouchableOpacity onPress={loadMoreItems} style={styles.loadMoreButton}>
                        <Text style={styles.loadMoreText}>{t('show_more')}</Text>
                      </TouchableOpacity>
                    );
                  }
                  if (visibleData.length > 0 && !hasMore) {
                    return <Text style={styles.footerText}>{t('all_records_loaded')}</Text>;
                  }
                  return <View style={{ height: 20 }} />;
                }}
              />
            </View>
          ) : (
            <FlatList
              data={visibleData}
              keyExtractor={(item) => item.id}
              scrollEnabled={false} // İç içe scroll sorununu önlemek için
              contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 4 }}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconContainer}>
                    <Ionicons name={activeTab === 'active' ? "cube-outline" : "checkmark-done-circle-outline"} size={48} color={Colors.muted} />
                  </View>
                  <Text style={styles.emptyListText}>
                    {activeTab === 'active' ? t('no_waiting_shipment') : t('no_completed_sales')}
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const profit = calculateProfit(item);
                const saleDate = new Date(item.dateISO).toLocaleDateString("tr-TR", {
                  day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
                });
                const isCriticalShipment = activeTab === 'active' && item.shipmentDate && new Date(item.shipmentDate) < new Date();
                const productCode = item.productCode || products.find(p => p.id === item.productId)?.code;

                return (
                  <View style={styles.card}>
                    {/* Kart Üstü: Ürün ve Fiyat */}
                    <View style={styles.cardHeader}>
                      <View style={styles.productInfo}><Text style={styles.productNameText} numberOfLines={1}>{item.productName}</Text>{productCode && <Text style={styles.productCode}>#{productCode}</Text>}</View>
                      <View style={styles.priceContainer}><Text style={styles.priceText}>{Number(item.price ?? 0).toFixed(2)} ₺</Text><View style={styles.quantityBadge}><Text style={styles.quantityText}>x{item.quantity}</Text></View></View>
                    </View>

                    {/* Kart Gövdesi: Müşteri ve Detaylar */}
                    <View style={styles.cardBody}>
                      <View style={styles.detailRow}>
                        <Ionicons name="person" size={14} color={Colors.secondary} style={styles.detailIcon} />
                        <Text style={styles.detailText}>{item.customerName}</Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Ionicons name="calendar" size={14} color={Colors.secondary} style={styles.detailIcon} />
                        <Text style={styles.detailText}>{saleDate}</Text>
                      </View>

                      {item.invoiceNumber ? (
                        <View style={styles.detailRow}>
                          <Ionicons name="receipt" size={14} color={Colors.iosBlue} style={styles.detailIcon} />
                          <Text style={[styles.detailText, { color: Colors.iosBlue, fontWeight: '600' }]}>
                            {t('inv_abbr')}: {item.invoiceNumber}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.detailRow}>
                          <Ionicons name="receipt-outline" size={14} color={Colors.muted} style={styles.detailIcon} />
                          <Text style={[styles.detailText, { color: Colors.muted }]}>{t('no_invoice')}</Text>
                        </View>
                      )}

                      {item.source_quote_id && (
                        <View style={[styles.detailRow, { backgroundColor: '#FFFBEB', borderRadius: 8, padding: 6, marginTop: 2 }]}>
                          <Ionicons name="document-text-outline" size={14} color="#D97706" style={styles.detailIcon} />
                          <Text style={[styles.detailText, { color: '#D97706', fontWeight: '700' }]}>Tekliften Oluşturuldu</Text>
                        </View>
                      )}

                      {activeTab === 'active' && item.shipmentDate && (
                        <View style={[styles.shipmentBadge, isCriticalShipment ? styles.shipmentBadgeCritical : styles.shipmentBadgeNormal]}>
                          <Ionicons name="time" size={12} color={isCriticalShipment ? '#fff' : Colors.iosBlue} style={{ marginRight: 4 }} />
                          <Text style={[styles.shipmentText, isCriticalShipment && { color: '#fff' }]}>
                            {t('shipped_abbr')}: {formatShipmentDate(item.shipmentDate)}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Ayırıcı Çizgi */}
                    <View style={styles.divider} />

                    {/* Kart Altı: Kar ve Aksiyonlar */}
                    <View style={styles.cardFooter}>
                      <View style={styles.profitContainer}>
                        <Text style={styles.profitLabel}>{t('profit_loss')}</Text>
                        <Text style={[styles.profitValue, { color: profit >= 0 ? Colors.iosGreen : Colors.critical }]}>
                          {profit >= 0 ? '+' : ''}{profit.toFixed(2)} ₺
                        </Text>
                      </View>

                      <View style={styles.actionsContainer}>
                        {activeTab === 'active' && (
                          <TouchableOpacity style={styles.iconButton} onPress={() => markAsShipped(item)}>
                            <View style={[styles.iconButtonBg, { backgroundColor: '#E8F5E9' }]}>
                              <Ionicons name="checkmark" size={18} color={Colors.iosGreen} />
                            </View>
                          </TouchableOpacity>
                        )}

                        {activeTab === 'active' && Platform.OS === 'web' && (
                          <TouchableOpacity style={styles.iconButton} onPress={() => handleCreateWorkOrder(item)}>
                            <View style={[styles.iconButtonBg, { backgroundColor: '#FFF3E0' }]}>
                              <Ionicons name="construct-outline" size={18} color="#FF9800" />
                            </View>
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity style={styles.iconButton} onPress={() => openInvoiceEditor(item)}>
                          <View style={[styles.iconButtonBg, { backgroundColor: '#E3F2FD' }]}>
                            <Ionicons name="document-text" size={18} color={Colors.iosBlue} />
                          </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.iconButton} onPress={() => handlePrintForm(item)}>
                          <View style={[styles.iconButtonBg, { backgroundColor: '#F3E5F5' }]}>
                            <Ionicons name="print-outline" size={18} color="#9C27B0" />
                          </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.iconButton} onPress={() => confirmCancel(item)}>
                          <View style={[styles.iconButtonBg, { backgroundColor: '#FFEBEE' }]}>
                            <Ionicons name="trash-outline" size={18} color={Colors.critical} />
                          </View>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              }}
              // Nested FlatList does not support onEndReached correctly.
              // We provide a manual "Load More" button footer instead.
              ListFooterComponent={() => {
                const hasMore = visibleData.length < filtered.length;
                if (hasMore) {
                  return (
                    <TouchableOpacity onPress={loadMoreItems} style={styles.loadMoreButton}>
                      <Text style={styles.loadMoreText}>{t('show_more')}</Text>
                    </TouchableOpacity>
                  );
                }
                if (visibleData.length > 0 && !hasMore) {
                  return <Text style={styles.footerText}>{t('all_records_loaded')}</Text>;
                }
                return <View style={{ height: 20 }} />;
              }}
            />
          )}
        </>
      )}

      {/* Fatura Modalı (Düzenleme için) */}
      <InvoiceModal
        visible={invoiceModalVisible}
        initialInvoice={editingSale?.invoiceNumber ?? ""}
        initialShipmentDate={editingSale?.shipmentDate ?? new Date().toISOString()}
        onSave={saveInvoiceForSale}
        onCancel={() => {
          setInvoiceModalVisible(false);
          setEditingSale(null);
        }}
        onGenerate={editingSale?.invoiceNumber ? null : () => { /* generateInvoiceNumber logic here */ }}
      />

      {/* Composite Sale Modal */}
      <CompositeSaleModal
        visible={compositeModalVisible}
        onClose={() => setCompositeModalVisible(false)}
        onComplete={() => {
          triggerHaptic(HapticType.SUCCESS);
          // Liste otomatik güncellenir çünkü AppContext sales değişti
        }}
      />

      {/* REKLAM ALANI */}

    </ImmersiveLayout>
  );
}


const styles = StyleSheet.create({
  // --- Üst Alan ---
  headerContainer: {
    marginBottom: 15,
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E6E9EE',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  analyzeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  analyzeIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.iosBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  analyzeButtonText: {
    color: Colors.textPrimary,
    fontWeight: "600",
    fontSize: 14,
  },
  // --- Yeni Satış Butonu ---
  newSaleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.iosGreen, // Yeşil veya dikkat çekici bir renk
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: Colors.iosGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  newSaleIconWrapper: {
    marginRight: 8,
  },
  newSaleButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },

  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#E5E5EA', // iOS Segmented Control arka planı
    borderRadius: 9,
    padding: 2,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 7,
  },
  tabButtonActive: {
    backgroundColor: '#fff',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButtonText: {
    fontWeight: '500',
    color: Colors.secondary,
    fontSize: 13,
  },
  tabButtonTextActive: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },

  // --- Arama ---
  searchContainer: {
    marginBottom: 15,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E6E9EE',
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    color: Colors.textPrimary,
    fontSize: 14,
  },

  // --- Liste ve Kartlar ---
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
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
    marginBottom: 12,
  },
  productInfo: {
    flex: 1,
    marginRight: 10,
  },
  productNameText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 2,
    lineHeight: 22,
  },
  productCode: {
    fontSize: 12,
    color: Colors.secondary,
    fontWeight: '500',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.iosBlue,
    marginBottom: 4,
  },
  quantityBadge: {
    backgroundColor: '#F2F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  quantityText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },

  cardBody: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailIcon: {
    marginRight: 8,
    width: 16,
    textAlign: 'center',
  },
  detailText: {
    color: Colors.textPrimary,
    fontSize: 13,
  },
  shipmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginTop: 4,
  },
  shipmentBadgeNormal: {
    backgroundColor: '#E3F2FD',
  },
  shipmentBadgeCritical: {
    backgroundColor: Colors.critical,
  },
  shipmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.iosBlue,
  },

  divider: {
    height: 1,
    backgroundColor: '#F2F4F8',
    marginBottom: 12,
  },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profitContainer: {
    flex: 1,
  },
  profitLabel: {
    fontSize: 11,
    color: Colors.muted,
    marginBottom: 2,
  },
  profitValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    marginLeft: 10,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
      }
    }),
  },
  iconButtonBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // --- Boş Durum ---
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F2F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptySecondaryText: {
    textAlign: 'center',
    color: Colors.secondary,
    fontSize: 15,
    fontWeight: '500',
  },
  footerText: {
    textAlign: "center",
    color: Colors.muted,
    marginVertical: 15,
    fontSize: 12,
  },
  loadMoreButton: {
    padding: 15,
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderRadius: 10,
    marginTop: 10,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
      }
    }),
  },
  loadMoreText: {
    color: Colors.iosBlue,
    fontWeight: '700',
  },
  adContainer: {
    alignItems: 'center',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F2F4F8',
    paddingTop: 10,
  },
  // --- WEB TABLE STYLES ---
  webTableContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginTop: 10,
    marginBottom: 50,
  },
  webTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  webHeaderCol: {
    flexDirection: 'row',
    alignItems: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
      }
    }),
  },
  webHeaderCell: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  webTableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  webTableRowEven: {
    backgroundColor: '#FFFFFF',
  },
  webTableRowOdd: {
    backgroundColor: '#F9FAFB',
  },
  webCellText: {
    fontSize: 13,
    color: '#334155',
  },
  webCellTextBold: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  webCellSubText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  webQuantityBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  webQuantityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  webSmallBadge: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  webSmallBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  webActionBtn: {
    width: 30,
    height: 30,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
      }
    }),
  },
});