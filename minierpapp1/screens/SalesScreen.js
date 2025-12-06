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
} from "react-native";
import ImmersiveLayout from "../components/ImmersiveLayout";
import { Colors } from "../Theme";
import { AppContext } from "../AppContext";
import SettingsButton from "../components/SettingsButton";
// import InvoiceModal from "../components/InvoiceModal"; // KALDIRILDI: Yeni modal kullanılıyor
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

// YENİ INVOICEMODAL İÇE AKTARILDI
import InvoiceModal from "../components/InvoiceModal";

export default function SalesScreen() {
  // AppContext'ten gerekli işlevleri ve verileri al
  const { sales, removeSale, recreateProductFromSale, updateSale } = useContext(AppContext);
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
    return sales.filter((s) => {
      // Sekme filtresi
      const isShipped = s.isShipped === true;
      if (activeTab === 'active' && isShipped) return false;
      if (activeTab === 'completed' && !isShipped) return false;

      // Diğer filtreler
      if (productFilter && !s.productName.toLowerCase().includes(productFilter.toLowerCase())) return false;
      if (customerFilter && !s.customerName.toLowerCase().includes(customerFilter.toLowerCase())) return false;
      if (startDate && new Date(s.dateISO) < new Date(startDate)) return false;
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (new Date(s.dateISO) > end) return false;
      }
      return true;
    });
  }, [sales, productFilter, customerFilter, startDate, endDate, activeTab]);

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

  // Kar/Zarar Hesaplama
  const calculateProfit = (sale) => {
    const cost = sale.cost ?? 0;
    const price = sale.price ?? 0;
    const qty = sale.quantity ?? 1;
    return (price - cost) * qty;
  };

  // Satış İptali İşlevi
  const confirmCancel = (sale) => {
    Alert.alert(
      "Satışı İptal Et",
      `${sale.productName} x${sale.quantity} (${sale.customerName}) satışını iptal etmek istediğinizden emin misiniz?\n\nBu işlem, ürünü stoklara geri ekleyecektir.`,
      [
        { text: "Hayır", style: "cancel" },
        {
          text: "Evet, İptal Et",
          style: "destructive",
          onPress: () => {
            recreateProductFromSale(sale); // Ürünü stoğa geri ekler
            removeSale(sale.id); // Satış kaydını siler
          },
        },
      ]
    );
  };

  // YENİ İŞLEV: Satışı Sevk Edildi Olarak İşaretleme
  const markAsShipped = (sale) => {
    Alert.alert(
      "Sevk Onayı",
      `${sale.productName} x${sale.quantity} ürününün sevk edildiğini onaylıyor musunuz?`,
      [
        { text: "Hayır", style: "cancel" },
        {
          text: "Evet, Sevk Edildi",
          style: "default",
          onPress: () => {
            // isShipped değerini true olarak güncelle
            updateSale({ ...sale, isShipped: true });
          },
        },
      ]
    );
  };

  const [invoiceModalVisible, setInvoiceModalVisible] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  
  // Fatura Düzenleyiciyi Açma
  const openInvoiceEditor = (sale) => {
    setEditingSale(sale);
    setInvoiceModalVisible(true);
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
    }
    setInvoiceModalVisible(false);
    setEditingSale(null);
  };

  const rightButton = <SettingsButton />;

  // Sevk Tarihini biçimlendirme
  const formatShipmentDate = (dateISO) => {
    if (!dateISO) return "Tarih Belirtilmedi";
    const date = new Date(dateISO);
    return date.toLocaleDateString("tr-TR", { day: '2-digit', month: 'short' });
  }

  return (
    <ImmersiveLayout 
        title="Satışlar" 
        subtitle={activeTab === 'active' ? `Sevk Bekleyen (${filtered.length})` : `Tamamlanan Satışlar (${filtered.length})`} 
        right={rightButton}
    >
      
      {/* 1. Sekmeler */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'active' && styles.tabButtonActive]}
            onPress={() => setActiveTab('active')}
        >
            <Text style={[styles.tabButtonText, activeTab === 'active' && styles.tabButtonTextActive]}>
                Aktif Satışlar
            </Text>
        </TouchableOpacity>
        <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'completed' && styles.tabButtonActive]}
            onPress={() => setActiveTab('completed')}
        >
            <Text style={[styles.tabButtonText, activeTab === 'completed' && styles.tabButtonTextActive]}>
                Tamamlanan Satışlar
            </Text>
        </TouchableOpacity>
      </View>
      
      {/* 2. Filtreleme Alanı */}
      <View style={styles.filterContainer}>
        <TextInput
          style={styles.input}
          placeholder="Ürün adı (model)"
          placeholderTextColor={Colors.secondary}
          value={productFilterInput}
          onChangeText={setProductFilterInput}
        />
        <TextInput
          style={[styles.input, { marginTop: 8 }]}
          placeholder="Müşteri adı"
          placeholderTextColor={Colors.secondary}
          value={customerFilterInput}
          onChangeText={setCustomerFilterInput}
        />
      </View>
      
      {/* 3. Analiz Ekranı Butonu */}
      <TouchableOpacity
        style={styles.analyzeButton}
        onPress={() => navigation.navigate("Analytics")}
      >
        <Ionicons name="stats-chart-outline" size={20} color="#fff" />
        <Text style={styles.analyzeButtonText}>Analiz Ekranına Git</Text>
      </TouchableOpacity>
      
      {/* 4. Satış Listesi */}
      {filtered.length === 0 ? (
        <Text style={styles.emptyListText}>
          {activeTab === 'active' ? "Sevk bekleyen aktif satış bulunmamaktadır." : "Tamamlanan satış bulunmamaktadır."}
        </Text>
      ) : (
        <FlatList
          data={visibleData}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const profit = calculateProfit(item);
            const saleDate = new Date(item.dateISO).toLocaleDateString("tr-TR", {
                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
            });
            const isCriticalShipment = activeTab === 'active' && item.shipmentDate && new Date(item.shipmentDate) < new Date();


            return (
              <View style={[styles.card, isCriticalShipment && styles.criticalCard]}>
                <View style={styles.infoColumn}>
                  {/* Satış Başlığı ve Fiyat */}
                  <Text style={styles.productNameText}>
                    {item.productName} <Text style={styles.quantityText}>x{item.quantity}</Text>
                  </Text>
                  <Text style={styles.priceText}>
                     {Number(item.price ?? 0).toFixed(2)} ₺ / adet
                  </Text>
                  
                  {/* Müşteri ve Cari Kod */}
                  <Text style={styles.customerText}>
                    <Ionicons name="person-outline" size={14} color={Colors.secondary} /> {item.customerName}
                  </Text>
                  
                  {/* Fatura ve Tarih */}
                  <Text style={styles.dateText}>
                    <Ionicons name="receipt-outline" size={14} color={Colors.secondary} /> Fatura: {item.invoiceNumber ?? "Yok"}
                  </Text>

                  {/* SEVK TARİHİ VE UYARI */}
                  {activeTab === 'active' && item.shipmentDate && (
                    <Text style={[styles.shipmentDateText, isCriticalShipment && styles.shipmentDateCritical]}>
                        <Ionicons name="time-outline" size={14} color={isCriticalShipment ? Colors.critical : Colors.iosBlue} /> 
                        Sevk Tarihi: {formatShipmentDate(item.shipmentDate)}
                    </Text>
                  )}
                  
                  {/* Kar/Zarar */}
                  <Text
                    style={[
                      styles.profitText,
                      { color: profit >= 0 ? Colors.profit : Colors.loss },
                    ]}
                  >
                    {profit >= 0 ? "KAR" : "ZARAR"}: {profit.toFixed(2)} ₺
                  </Text>
                </View>
                
                {/* Aksiyonlar */}
                <View style={styles.actionColumn}>
                  <Text style={styles.dateTimestamp}>{saleDate}</Text>
                  
                  {/* SADECE AKTİF SATIŞLAR İÇİN SEVK EDİLDİ BUTONU */}
                  {activeTab === 'active' && (
                    <TouchableOpacity style={styles.shipBtn} onPress={() => markAsShipped(item)}>
                        <Ionicons name="checkmark-circle-outline" size={14} color="#fff" />
                        <Text style={styles.shipBtnText}>Sevk Edildi</Text>
                    </TouchableOpacity>
                  )}
                  
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => confirmCancel(item)}>
                    <Text style={styles.cancelBtnText}>İptal</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.invoiceBtn} onPress={() => openInvoiceEditor(item)}>
                    <Text style={styles.invoiceBtnText}>
                      {item.invoiceNumber ? "Fatura Düzenle" : "Fatura Ekle"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          onEndReached={loadMoreItems}
          onEndReachedThreshold={0.5}
          ListFooterComponent={() => {
            if (visibleData.length === filtered.length && filtered.length > pageSize) {
              return <Text style={styles.footerText}>Tüm sonuçlar gösteriliyor ({filtered.length}).</Text>;
            }
            if (visibleData.length < filtered.length) {
                return <ActivityIndicator size="small" color={Colors.iosBlue} style={{ marginVertical: 20 }} />;
            }
            return null; // Başka durumda boş göster
          }}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
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
        // Fatura modalı düzenleme modundayken fatura numarasını tekrar oluşturma butonu gizlenir
        onGenerate={editingSale?.invoiceNumber ? null : () => { /* generateInvoiceNumber logic here */ }} 
      />
    </ImmersiveLayout>
  );
}


const styles = StyleSheet.create({
  // YENİ SEKMELER STİLİ
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: Colors.iosBlue,
  },
  tabButtonText: {
    fontWeight: '600',
    color: Colors.secondary,
    fontSize: 14,
  },
  tabButtonTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  filterContainer: { 
    marginBottom: 12, // Filtre alanından sonraki boşluk
  },
  input: {
    borderWidth: 1,
    borderColor: "#E6E9EE",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#FBFDFF",
    marginTop: 8, // İlk input için gerekirse 0 yapılır, diğerleri için 8 kalır.
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.iosBlue,
    padding: 14,
    borderRadius: 10,
    marginBottom: 15, // Listeden önce boşluk bırak
  },
  analyzeButtonText: {
    color: "#fff", 
    fontWeight: "700", 
    textAlign: "center",
    marginLeft: 8,
    fontSize: 16,
  },
  emptyListText: {
    textAlign: "center", 
    color: Colors.secondary, 
    marginTop: 20,
    fontStyle: 'italic',
  },
  
  // --- Liste Kartı Stilleri ---
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  // Geciken sevkıyat uyarısı
  criticalCard: {
      borderLeftWidth: 5,
      borderLeftColor: Colors.critical,
  },
  infoColumn: {
      flex: 1,
      paddingRight: 10,
  },
  actionColumn: {
      alignItems: "flex-end",
      justifyContent: 'space-between',
  },
  productNameText: {
      fontSize: 16, 
      fontWeight: "800",
      color: Colors.textPrimary,
      marginBottom: 3,
  },
  quantityText: {
      fontSize: 14,
      fontWeight: '600',
      color: Colors.secondary,
  },
  priceText: {
      fontSize: 14,
      color: Colors.secondary,
      marginBottom: 8,
  },
  customerText: {
      color: Colors.textPrimary,
      fontSize: 13,
      marginTop: 2,
  },
  dateText: {
      color: Colors.secondary,
      fontSize: 13,
      marginTop: 2,
  },
  // YENİ SEVK TARİHİ STİLİ
  shipmentDateText: {
      flexDirection: 'row',
      alignItems: 'center',
      color: Colors.iosBlue,
      fontSize: 13,
      marginTop: 5,
      fontWeight: '600',
  },
  shipmentDateCritical: {
      color: Colors.critical,
      fontWeight: '800',
  },
  profitText: {
      marginTop: 8,
      fontWeight: "700",
      fontSize: 14,
  },
  dateTimestamp: {
      fontSize: 12, 
      color: Colors.secondary,
      marginBottom: 5,
  },
  // YENİ SEVK EDİLDİ BUTONU STİLİ
  shipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: Colors.iosGreen,
    marginBottom: 5,
  },
  shipBtnText: {
    color: "#fff",
    fontWeight: "700",
    marginLeft: 5,
    fontSize: 12,
  },
  cancelBtn: {
    marginTop: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#FFF5F5", // Hafif kırmızı arka plan
    marginBottom: 5,
  },
  cancelBtnText: { 
      color: Colors.critical, 
      fontWeight: "700",
      fontSize: 12, 
  },
  invoiceBtn: {
    marginTop: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#F3F8FF", // Hafif mavi arka plan
    borderWidth: 1,
    borderColor: "#E6E9EE",
  },
  invoiceBtnText: {
      color: Colors.iosBlue, 
      fontWeight: "700",
      fontSize: 12,
  },
  footerText: {
    textAlign: "center",
    color: "#888",
    marginVertical: 15,
    fontSize: 12,
  },
});