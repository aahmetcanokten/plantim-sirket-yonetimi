import React, { useContext, useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  Modal,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Platform,
} from "react-native";
import ImmersiveLayout from "../components/ImmersiveLayout";
import { AppContext } from "../AppContext";
import AddPurchaseForm from "../components/AddPurchaseForm";
import PurchaseItem from "../components/PurchaseItem";
import SettingsButton from "../components/SettingsButton";
import { Colors } from "../Theme";
import { Ionicons } from "@expo/vector-icons";
import KeyboardSafeView from "../components/KeyboardSafeView";
import { useToast } from "../components/ToastProvider"; // Toast bildirimi için

export default function PurchasesScreen() {
  const {
    purchases,
    addPurchase,
    updatePurchase,
    deletePurchase,
    markPurchaseDelivered,
  } = useContext(AppContext);
  const toast = useToast();

  const [addVisible, setAddVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filterStatus, setFilterStatus] = useState("Açık"); // 'Açık', 'Teslim', 'Tümü'

  // --- İşlem Fonksiyonları ---
  const handleAddPurchase = (purchase) => {
    addPurchase(purchase);
    setAddVisible(false);
    toast?.showToast ? toast.showToast("Sipariş oluşturuldu.") : Alert.alert("Başarılı", "Sipariş oluşturuldu.");
  };

  const handleUpdatePurchase = (purchase) => {
      updatePurchase(purchase);
      setEditing(null);
      setAddVisible(false);
      toast?.showToast && toast.showToast("Sipariş güncellendi.");
  };

  const handleDeletePurchase = (id) => {
    Alert.alert(
        "Siparişi Sil",
        "Bu sipariş kaydını silmek istediğinize emin misiniz?",
        [
            { text: "Vazgeç", style: "cancel" },
            { 
                text: "Sil", 
                style: "destructive", 
                onPress: () => {
                    deletePurchase(id);
                    toast?.showToast && toast.showToast("Sipariş silindi.");
                }
            }
        ]
    );
  };

  const handleDeliverPurchase = (purchaseItem) => {
      Alert.alert(
          "Teslim Al",
          `${purchaseItem.productName} ürününü teslim aldığınızı onaylıyor musunuz? Stok güncellenecektir.`,
          [
              { text: "Vazgeç", style: "cancel" },
              {
                  text: "Onayla",
                  onPress: () => {
                      markPurchaseDelivered(purchaseItem.id);
                      toast?.showToast && toast.showToast("Ürün teslim alındı ve stoğa eklendi.");
                  }
              }
          ]
      );
  };

  // --- Filtreleme Mantığı ---
  const filteredPurchases = useMemo(() => {
    let result = [];
    switch (filterStatus) {
        case "Teslim":
            result = purchases.filter((p) => p.delivered === true);
            break;
        case "Tümü":
            result = purchases;
            break;
        case "Açık":
        default:
            result = purchases.filter((p) => !p.delivered);
            break;
    }
    // Yeniden eskiye sırala (varsayım: id timestamp bazlı veya createdDateISO var)
    return result.sort((a, b) => {
        const dateA = a.createdDateISO ? new Date(a.createdDateISO) : new Date(0);
        const dateB = b.createdDateISO ? new Date(b.createdDateISO) : new Date(0);
        return dateB - dateA;
    });
  }, [purchases, filterStatus]);

  // --- İstatistikler ---
  const stats = useMemo(() => {
      const openPurchases = purchases.filter(p => !p.delivered);
      const deliveredPurchases = purchases.filter(p => p.delivered);
      
      const openCount = openPurchases.length;
      const deliveredCount = deliveredPurchases.length;
      
      // DÜZELTME: Sadece açık (teslim edilmemiş) siparişlerin maliyetini topla
      const pendingCost = openPurchases.reduce((sum, p) => sum + ((p.quantity || 0) * (p.unitCost || 0)), 0);
      
      return { open: openCount, delivered: deliveredCount, total: purchases.length, pendingCost };
  }, [purchases]);

  const right = <SettingsButton />;
  const subtitle = `${stats.open} açık, ${stats.delivered} teslim`;

  return (
    <ImmersiveLayout title="Satın Alma" subtitle={subtitle} right={right}>
      
      {/* Üst Bilgi Kartı */}
      <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Toplam Sipariş</Text>
              <Text style={styles.summaryValue}>{stats.total}</Text>
          </View>
          <View style={[styles.summaryItem, styles.summaryBorder]}>
              <Text style={styles.summaryLabel}>Bekleyen Maliyet</Text>
              {/* DÜZELTME: Artık sadece bekleyen maliyeti gösteriyoruz */}
              <Text style={styles.summaryValue}>{stats.pendingCost.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</Text>
          </View>
      </View>

      {/* Modern Sekmeli Filtre */}
      <View style={styles.tabContainer}>
        {["Açık", "Teslim", "Tümü"].map((status) => (
            <TouchableOpacity
                key={status}
                style={[styles.tabButton, filterStatus === status && styles.activeTabButton]}
                onPress={() => setFilterStatus(status)}
            >
                <Text style={[styles.tabText, filterStatus === status && styles.activeTabText]}>
                    {status}
                </Text>
                {filterStatus === status && <View style={styles.activeTabIndicator} />}
            </TouchableOpacity>
        ))}
      </View>

      {/* Yeni Sipariş Butonu (Yüzen Buton Stili - daha erişilebilir) */}
      <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            setEditing(null);
            setAddVisible(true);
          }}
          activeOpacity={0.9}
        >
          <Ionicons name="add" size={24} color="#fff" />
          <Text style={styles.fabText}>Yeni Sipariş</Text>
      </TouchableOpacity>

      {/* Liste */}
      <FlatList
        data={filteredPurchases}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <PurchaseItem
            item={item}
            onEdit={(p) => {
              setEditing(p);
              setAddVisible(true);
            }}
            onDelete={handleDeletePurchase}
            onDeliver={handleDeliverPurchase}
          />
        )}
        ListEmptyComponent={
            <View style={styles.emptyState}>
                <Ionicons name="cart-outline" size={48} color="#ccc" />
                <Text style={styles.emptyStateText}>
                  {filterStatus === "Açık" ? "Bekleyen siparişiniz yok." : 
                   filterStatus === "Teslim" ? "Henüz teslim alınmış sipariş yok." : 
                   "Kayıtlı satın alma siparişi bulunmuyor."}
                </Text>
            </View>
        }
      />

      {/* Add / Edit Modal */}
      <Modal 
        visible={addVisible} 
        animationType="slide" 
        transparent 
        onRequestClose={() => {
            setAddVisible(false);
            setEditing(null);
        }}
      >
        <KeyboardSafeView offsetIOS={0}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>
                      {editing ? "Siparişi Düzenle" : "Yeni Satın Alma Siparişi"}
                    </Text>
                    <TouchableOpacity 
                        onPress={() => {
                            setAddVisible(false);
                            setEditing(null);
                        }}
                        style={styles.closeButton}
                    >
                        <Ionicons name="close" size={24} color={Colors.secondary} />
                    </TouchableOpacity>
                </View>

                <AddPurchaseForm
                    initial={editing}
                    onAdd={(p) => editing ? handleUpdatePurchase({ ...editing, ...p }) : handleAddPurchase(p)}
                    onCancel={() => {
                        setAddVisible(false);
                        setEditing(null);
                    }}
                  />
              </View>
            </View>
        </KeyboardSafeView>
      </Modal>
    </ImmersiveLayout>
  );
}

const styles = StyleSheet.create({
  // Özet Kartı
  summaryCard: {
      flexDirection: 'row',
      backgroundColor: '#fff',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
  },
  summaryItem: {
      flex: 1,
      alignItems: 'center',
  },
  summaryBorder: {
      borderLeftWidth: 1,
      borderLeftColor: '#F1F5F9',
  },
  summaryLabel: {
      fontSize: 12,
      color: Colors.secondary,
      marginBottom: 4,
  },
  summaryValue: {
      fontSize: 16,
      fontWeight: '700',
      color: Colors.textPrimary,
  },

  // Sekmeli Filtre
  tabContainer: {
      flexDirection: 'row',
      backgroundColor: '#F1F5F9',
      borderRadius: 10,
      padding: 4,
      marginBottom: 16,
  },
  tabButton: {
      flex: 1,
      paddingVertical: 8,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
  },
  activeTabButton: {
      backgroundColor: '#fff',
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 1,
      elevation: 1,
  },
  tabText: {
      fontSize: 13,
      fontWeight: '600',
      color: Colors.secondary,
  },
  activeTabText: {
      color: Colors.iosBlue,
      fontWeight: '700',
  },

  // Yüzen Ekleme Butonu (FAB)
  fab: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: Colors.iosBlue,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 25,
      marginBottom: 16,
      alignSelf: 'center', // Ortala
      shadowColor: Colors.iosBlue,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
  },
  fabText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 16,
      marginLeft: 8,
  },

  // Liste
  listContent: {
      paddingBottom: 80, // FAB ve alt bar için boşluk
  },
  emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 50,
      opacity: 0.6,
  },
  emptyStateText: {
      marginTop: 10,
      fontSize: 16,
      color: Colors.secondary,
      textAlign: 'center',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: Platform.OS === 'ios' ? "flex-end" : "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderRadius: Platform.OS === 'android' ? 24 : 0,
    maxHeight: "90%",
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20, // iPhone X+ güvenli alan
    overflow: 'hidden',
  },
  modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      marginBottom: 10,
  },
  modalTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: Colors.textPrimary,
  },
  closeButton: {
      padding: 4,
  },
});