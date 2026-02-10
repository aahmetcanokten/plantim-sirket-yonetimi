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
import { useTranslation } from "react-i18next";
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
    const { t } = useTranslation();

    const [addVisible, setAddVisible] = useState(false);
    const [editing, setEditing] = useState(null);
    const [filterStatus, setFilterStatus] = useState("Açık"); // 'Açık', 'Teslim', 'Tümü'

    // --- Yardımcı Fonksiyonlar (Güvenlik İçin) ---
    const formatCurrency = (value) => {
        try {
            if (value === undefined || value === null) return "₺0,00";
            return value.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
        } catch (e) {
            return `₺${Number(value).toFixed(2)}`;
        }
    };

    const safeDate = (dateInput) => {
        try {
            if (!dateInput) return new Date(0);
            return new Date(dateInput);
        } catch (error) {
            return new Date(0);
        }
    };

    // --- İşlem Fonksiyonları ---
    const handleAddPurchase = (purchase) => {
        addPurchase(purchase);
        setAddVisible(false);
        toast?.showToast ? toast.showToast(t('order_created')) : Alert.alert(t('successful'), t('order_created'));
    };

    const handleUpdatePurchase = (purchase) => {
        updatePurchase(purchase);
        setEditing(null);
        setAddVisible(false);
        toast?.showToast && toast.showToast(t('order_updated'));
    };

    const handleDeletePurchase = (id) => {
        Alert.alert(
            t('delete_order'),
            t('delete_order_confirmation'),
            [
                { text: t('cancel'), style: "cancel" },
                {
                    text: t('delete'),
                    style: "destructive",
                    onPress: () => {
                        deletePurchase(id);
                        toast?.showToast && toast.showToast(t('order_deleted'));
                    }
                }
            ]
        );
    };

    const handleDeliverPurchase = (purchaseItem) => {
        Alert.alert(
            t('receive'),
            `${purchaseItem.productName} ${t('receive_confirmation')} ${t('stock_will_update')}`,
            [
                { text: t('cancel'), style: "cancel" },
                {
                    text: t('confirm'),
                    onPress: () => {
                        markPurchaseDelivered(purchaseItem.id);
                        toast?.showToast && toast.showToast(t('product_received_stock_updated'));
                    }
                }
            ]
        );
    };

    // --- Filtreleme Mantığı ---
    const filteredPurchases = useMemo(() => {
        if (!Array.isArray(purchases)) return [];

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
        // Yeniden eskiye sırala (Mutasyon yapmamak için kopyala: [...result])
        return [...result].sort((a, b) => {
            const dateA = safeDate(a.createdDateISO || a.created_at);
            const dateB = safeDate(b.createdDateISO || b.created_at);
            return dateB - dateA;
        });
    }, [purchases, filterStatus]);

    // --- İstatistikler ---
    const stats = useMemo(() => {
        if (!Array.isArray(purchases)) return { open: 0, delivered: 0, total: 0, pendingCost: 0 };

        const openPurchases = purchases.filter(p => !p.delivered);
        const deliveredPurchases = purchases.filter(p => p.delivered);

        const openCount = openPurchases.length;
        const deliveredCount = deliveredPurchases.length;

        // DÜZELTME: Sadece açık (teslim edilmemiş) siparişlerin maliyetini topla. createDateISO veya expected_date kullanımı
        const pendingCost = openPurchases.reduce((sum, p) => sum + ((p.quantity || 0) * (p.unitCost || p.unit_cost || p.cost || 0)), 0);

        return { open: openCount, delivered: deliveredCount, total: purchases.length, pendingCost };
    }, [purchases]);

    const right = <SettingsButton />;
    // subtitle i18n - t fonksiyonu zaten parametreleri işler ({ open, delivered })
    const subtitle = t('open_delivered_count', { open: stats.open, delivered: stats.delivered });

    return (
        <ImmersiveLayout title={t('purchasing')} subtitle={subtitle} right={right}>

            {/* Üst Bilgi Kartı */}
            <View style={styles.summaryCard}>
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>{t('total_orders')}</Text>
                    <Text style={styles.summaryValue}>{stats.total}</Text>
                </View>
                <View style={[styles.summaryItem, styles.summaryBorder]}>
                    <Text style={styles.summaryLabel}>{t('pending_cost')}</Text>
                    {/* DÜZELTME: Artık sadece bekleyen maliyeti gösteriyoruz */}
                    <Text style={styles.summaryValue}>{formatCurrency(stats.pendingCost)}</Text>
                </View>
            </View>

            {/* Modern Sekmeli Filtre */}
            <View style={styles.tabContainer}>
                {["Açık", "Teslim", "Tümü"].map((status) => {
                    let label = status;
                    if (status === "Açık") label = t('open');
                    if (status === "Teslim") label = t('delivered');
                    if (status === "Tümü") label = t('all');
                    return (
                        <TouchableOpacity
                            key={status}
                            style={[styles.tabButton, filterStatus === status && styles.activeTabButton]}
                            onPress={() => setFilterStatus(status)}
                        >
                            <Text style={[styles.tabText, filterStatus === status && styles.activeTabText]}>
                                {label}
                            </Text>
                            {filterStatus === status && <View style={styles.activeTabIndicator} />}
                        </TouchableOpacity>
                    )
                })}
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
                <Text style={styles.fabText}>{t('new_order')}</Text>
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
                            {filterStatus === "Açık" ? t('no_pending_orders') :
                                filterStatus === "Teslim" ? t('no_delivered_orders') :
                                    t('no_purchase_orders')}
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
                                    {editing ? t('edit_order') : t('new_purchase_order')}
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