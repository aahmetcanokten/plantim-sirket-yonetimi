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
    Dimensions,
    ScrollView,
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
import { useToast } from "../components/ToastProvider";

const isWeb = Platform.OS === 'web';

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
    const [filterStatus, setFilterStatus] = useState("Açık");

    // --- Yardımcı Fonksiyonlar ---
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

    const formatDate = (isoStr) => {
        if (!isoStr) return '-';
        try {
            const d = new Date(isoStr);
            return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch { return '-'; }
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
        if (Platform.OS === 'web') {
            if (window.confirm(t('delete_order_confirmation'))) {
                deletePurchase(id);
                toast?.showToast && toast.showToast(t('order_deleted'));
            }
            return;
        }
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
        if (Platform.OS === 'web') {
            if (window.confirm(`"${purchaseItem.productName}" ${t('receive_confirmation')} ${t('stock_will_update')}`)) {
                markPurchaseDelivered(purchaseItem.id);
                toast?.showToast && toast.showToast(t('product_received_stock_updated'));
            }
            return;
        }
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

    // --- Filtreleme ---
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
        return [...result].sort((a, b) => {
            const dateA = safeDate(a.createdDateISO || a.created_at);
            const dateB = safeDate(b.createdDateISO || b.created_at);
            return dateB - dateA;
        });
    }, [purchases, filterStatus]);

    // --- İstatistikler ---
    const stats = useMemo(() => {
        if (!Array.isArray(purchases)) return { open: 0, delivered: 0, total: 0, pendingCost: 0, overdueCount: 0 };
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const openPurchases = purchases.filter(p => !p.delivered);
        const deliveredPurchases = purchases.filter(p => p.delivered);
        const overdueCount = openPurchases.filter(p => {
            const d = p.expectedDateISO || p.expected_date;
            if (!d) return false;
            const exp = new Date(d);
            exp.setHours(0, 0, 0, 0);
            return exp < today;
        }).length;
        const pendingCost = openPurchases.reduce((sum, p) => sum + ((p.quantity || 0) * (p.unitCost || p.unit_cost || p.cost || 0)), 0);
        return { open: openPurchases.length, delivered: deliveredPurchases.length, total: purchases.length, pendingCost, overdueCount };
    }, [purchases]);

    // --- Status Helper ---
    const getRowStatus = (item) => {
        const isDelivered = !!item.delivered;
        if (isDelivered) return { label: t('status_delivered'), color: Colors.iosGreen, bg: '#E6F4EA', icon: 'checkmark-circle' };
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const expStr = item.expectedDateISO || item.expected_date;
        if (expStr) {
            const exp = new Date(expStr); exp.setHours(0, 0, 0, 0);
            if (exp < today) return { label: t('status_overdue'), color: Colors.critical, bg: '#FEF2F2', icon: 'alert-circle' };
        }
        return { label: t('status_waiting'), color: '#F59E0B', bg: '#FFFBEB', icon: 'time-outline' };
    };

    const right = <SettingsButton />;
    const subtitle = t('open_delivered_count', { open: stats.open, delivered: stats.delivered });

    // --- Web Tablo Satırı ---
    const WebTableRow = ({ item, index }) => {
        const status = getRowStatus(item);
        const totalCost = (item.quantity || 0) * (item.unitCost || item.unit_cost || item.cost || 0);
        const expDate = formatDate(item.expectedDateISO || item.expected_date);
        return (
            <View style={[
                styles.webTableRow,
                index % 2 === 0 ? styles.webTableRowEven : styles.webTableRowOdd,
                item.delivered && styles.webRowDelivered,
            ]}>
                {/* Ürün */}
                <View style={{ flex: 2.5, justifyContent: 'center' }}>
                    <Text style={styles.webCellBold} numberOfLines={1}>{item.productName || item.product_name || '-'}</Text>
                    {item.model ? <Text style={styles.webCellSub} numberOfLines={1}>{item.model}</Text> : null}
                </View>
                {/* Miktar */}
                <View style={{ flex: 0.7, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={styles.webCellCenter}>{item.quantity || 0}</Text>
                </View>
                {/* Birim Maliyet */}
                <View style={{ flex: 1.2, justifyContent: 'center', alignItems: 'flex-end' }}>
                    <Text style={styles.webCellNum}>{Number(item.unitCost || item.unit_cost || item.cost || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</Text>
                </View>
                {/* Toplam */}
                <View style={{ flex: 1.2, justifyContent: 'center', alignItems: 'flex-end' }}>
                    <Text style={[styles.webCellNum, { fontWeight: '700' }]}>{totalCost.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</Text>
                </View>
                {/* Tedarikçi */}
                <View style={{ flex: 1.5, justifyContent: 'center' }}>
                    <Text style={styles.webCellText} numberOfLines={1}>{item.supplier || '-'}</Text>
                </View>
                {/* Beklenen Tarih */}
                <View style={{ flex: 1.2, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={[styles.webCellText, { color: status.color === Colors.critical && !item.delivered ? Colors.critical : Colors.secondary }]}>{expDate}</Text>
                </View>
                {/* Durum */}
                <View style={{ flex: 1.3, justifyContent: 'center', alignItems: 'center' }}>
                    <View style={[styles.webStatusBadge, { backgroundColor: status.bg }]}>
                        <Ionicons name={status.icon} size={12} color={status.color} style={{ marginRight: 4 }} />
                        <Text style={[styles.webStatusText, { color: status.color }]}>{status.label}</Text>
                    </View>
                </View>
                {/* Aksiyonlar */}
                <View style={{ flex: 1.3, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 4 }}>
                    {!item.delivered && (
                        <TouchableOpacity
                            style={[styles.webActionBtn, { backgroundColor: Colors.iosGreen }]}
                            onPress={() => handleDeliverPurchase(item)}
                        >
                            <Ionicons name="cube-outline" size={13} color="#fff" />
                            <Text style={styles.webActionBtnText}>{t('deliver_action')}</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={[styles.webActionBtn, { backgroundColor: '#F1F5F9' }]}
                        onPress={() => { setEditing(item); setAddVisible(true); }}
                    >
                        <Ionicons name="create-outline" size={13} color={Colors.iosBlue} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.webActionBtn, { backgroundColor: '#FEF2F2' }]}
                        onPress={() => handleDeletePurchase(item.id)}
                    >
                        <Ionicons name="trash-outline" size={13} color={Colors.critical} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <ImmersiveLayout title={t('purchasing')} subtitle={subtitle} right={right}>

            {/* İstatistik Kartları */}
            <View style={styles.statsRow}>
                <View style={[styles.statCard, { borderLeftColor: Colors.iosBlue }]}>
                    <View style={[styles.statIconWrap, { backgroundColor: '#EFF6FF' }]}>
                        <Ionicons name="cart-outline" size={20} color={Colors.iosBlue} />
                    </View>
                    <View>
                        <Text style={styles.statValue}>{stats.total}</Text>
                        <Text style={styles.statLabel}>{t('total_orders')}</Text>
                    </View>
                </View>

                <View style={[styles.statCard, { borderLeftColor: '#F59E0B' }]}>
                    <View style={[styles.statIconWrap, { backgroundColor: '#FFFBEB' }]}>
                        <Ionicons name="time-outline" size={20} color="#F59E0B" />
                    </View>
                    <View>
                        <Text style={styles.statValue}>{stats.open}</Text>
                        <Text style={styles.statLabel}>{t('open')}</Text>
                    </View>
                </View>

                <View style={[styles.statCard, { borderLeftColor: Colors.iosGreen }]}>
                    <View style={[styles.statIconWrap, { backgroundColor: '#E6F4EA' }]}>
                        <Ionicons name="checkmark-circle-outline" size={20} color={Colors.iosGreen} />
                    </View>
                    <View>
                        <Text style={styles.statValue}>{stats.delivered}</Text>
                        <Text style={styles.statLabel}>{t('delivered')}</Text>
                    </View>
                </View>

                <View style={[styles.statCard, { borderLeftColor: stats.overdueCount > 0 ? Colors.critical : '#CBD5E1' }]}>
                    <View style={[styles.statIconWrap, { backgroundColor: stats.overdueCount > 0 ? '#FEF2F2' : '#F8FAFC' }]}>
                        <Ionicons name="alert-circle-outline" size={20} color={stats.overdueCount > 0 ? Colors.critical : '#94A3B8'} />
                    </View>
                    <View>
                        <Text style={[styles.statValue, { color: stats.overdueCount > 0 ? Colors.critical : Colors.textPrimary }]}>{stats.overdueCount}</Text>
                        <Text style={styles.statLabel}>{t('overdue_stat')}</Text>
                    </View>
                </View>

                <View style={[styles.statCard, { borderLeftColor: '#8B5CF6', flex: 1.5 }]}>
                    <View style={[styles.statIconWrap, { backgroundColor: '#F5F3FF' }]}>
                        <Ionicons name="cash-outline" size={20} color="#8B5CF6" />
                    </View>
                    <View>
                        <Text style={[styles.statValue, { fontSize: 16 }]}>{formatCurrency(stats.pendingCost)}</Text>
                        <Text style={styles.statLabel}>{t('pending_cost')}</Text>
                    </View>
                </View>
            </View>

            {/* Toolbar: Filtreler + Yeni Sipariş */}
            <View style={styles.toolbar}>
                <View style={styles.tabContainer}>
                    {[
                        { key: "Açık", label: t('open'), icon: 'time-outline' },
                        { key: "Teslim", label: t('delivered'), icon: 'checkmark-circle-outline' },
                        { key: "Tümü", label: t('all'), icon: 'list-outline' },
                    ].map((tab) => (
                        <TouchableOpacity
                            key={tab.key}
                            style={[styles.tabButton, filterStatus === tab.key && styles.activeTabButton]}
                            onPress={() => setFilterStatus(tab.key)}
                        >
                            <Ionicons
                                name={tab.icon}
                                size={14}
                                color={filterStatus === tab.key ? Colors.iosBlue : Colors.secondary}
                                style={{ marginRight: 4 }}
                            />
                            <Text style={[styles.tabText, filterStatus === tab.key && styles.activeTabText]}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity
                    style={styles.newOrderBtn}
                    onPress={() => { setEditing(null); setAddVisible(true); }}
                    activeOpacity={0.85}
                >
                    <Ionicons name="add" size={18} color="#fff" />
                    <Text style={styles.newOrderBtnText}>{t('new_order')}</Text>
                </TouchableOpacity>
            </View>

            {/* Web: Tablo Görünümü */}
            {isWeb ? (
                <View style={styles.webTableContainer}>
                    {/* Tablo Başlığı */}
                    <View style={styles.webTableHeader}>
                        <Text style={[styles.webHeaderCell, { flex: 2.5 }]}>{t('product_name')}</Text>
                        <Text style={[styles.webHeaderCell, { flex: 0.7, textAlign: 'center' }]}>{t('quantity_short')}</Text>
                        <Text style={[styles.webHeaderCell, { flex: 1.2, textAlign: 'right' }]}>{t('unit_cost')}</Text>
                        <Text style={[styles.webHeaderCell, { flex: 1.2, textAlign: 'right' }]}>Toplam</Text>
                        <Text style={[styles.webHeaderCell, { flex: 1.5 }]}>{t('supplier')}</Text>
                        <Text style={[styles.webHeaderCell, { flex: 1.2, textAlign: 'center' }]}>{t('expected_delivery_date')}</Text>
                        <Text style={[styles.webHeaderCell, { flex: 1.3, textAlign: 'center' }]}>Durum</Text>
                        <Text style={[styles.webHeaderCell, { flex: 1.3, textAlign: 'right' }]}>{t('edit')}</Text>
                    </View>

                    {/* Tablo Satırları */}
                    <FlatList
                        data={filteredPurchases}
                        keyExtractor={(i) => i.id}
                        renderItem={({ item, index }) => <WebTableRow item={item} index={index} />}
                        contentContainerStyle={{ paddingBottom: 40 }}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Ionicons name="cart-outline" size={52} color="#CBD5E1" />
                                <Text style={styles.emptyStateText}>
                                    {filterStatus === "Açık" ? t('no_pending_orders') :
                                        filterStatus === "Teslim" ? t('no_delivered_orders') :
                                            t('no_purchase_orders')}
                                </Text>
                                <TouchableOpacity
                                    style={styles.emptyAddBtn}
                                    onPress={() => { setEditing(null); setAddVisible(true); }}
                                >
                                    <Text style={styles.emptyAddBtnText}>{t('new_order')}</Text>
                                </TouchableOpacity>
                            </View>
                        }
                    />
                </View>
            ) : (
                /* Mobil: Kart Görünümü */
                <FlatList
                    data={filteredPurchases}
                    keyExtractor={(i) => i.id}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => (
                        <PurchaseItem
                            item={item}
                            onEdit={(p) => { setEditing(p); setAddVisible(true); }}
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
            )}

            {/* Add / Edit Modal */}
            <Modal
                visible={addVisible}
                animationType={isWeb ? "fade" : "slide"}
                transparent
                onRequestClose={() => {
                    setAddVisible(false);
                    setEditing(null);
                }}
            >
                <KeyboardSafeView offsetIOS={0} disableScrollView={isWeb}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <View>
                                    <Text style={styles.modalTitle}>
                                        {editing ? t('edit_order') : t('new_purchase_order')}
                                    </Text>
                                    <Text style={styles.modalSubtitle}>
                                        {editing ? 'Sipariş bilgilerini güncelleyin' : 'Stoka yeni satın alma siparişi oluşturun'}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => {
                                        setAddVisible(false);
                                        setEditing(null);
                                    }}
                                    style={styles.closeButton}
                                >
                                    <Ionicons name="close" size={22} color={Colors.secondary} />
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
    // İstatistik Kartları
    statsRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 16,
        flexWrap: 'wrap',
    },
    statCard: {
        flex: 1,
        minWidth: 120,
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderLeftWidth: 4,
        ...Platform.select({
            web: { boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
            default: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 3,
                elevation: 2,
            }
        })
    },
    statIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statValue: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0F172A',
        lineHeight: 24,
    },
    statLabel: {
        fontSize: 11,
        color: Colors.secondary,
        fontWeight: '500',
        marginTop: 2,
    },

    // Toolbar
    toolbar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
        gap: 12,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#F1F5F9',
        borderRadius: 10,
        padding: 4,
        flex: 1,
    },
    tabButton: {
        flex: 1,
        flexDirection: 'row',
        paddingVertical: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
    },
    activeTabButton: {
        backgroundColor: '#fff',
        ...Platform.select({
            web: { boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
            default: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 1,
                elevation: 1,
            }
        })
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
    newOrderBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.iosBlue,
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 10,
        gap: 6,
        ...Platform.select({
            web: { boxShadow: '0 2px 8px rgba(0,122,255,0.3)', cursor: 'pointer' },
            default: {
                shadowColor: Colors.iosBlue,
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.3,
                shadowRadius: 6,
                elevation: 4,
            }
        })
    },
    newOrderBtnText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
    },

    // Web Tablo
    webTableContainer: {
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        overflow: 'hidden',
        marginBottom: 40,
        ...Platform.select({
            web: { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }
        })
    },
    webTableHeader: {
        flexDirection: 'row',
        backgroundColor: '#F8FAFC',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 2,
        borderBottomColor: '#E2E8F0',
    },
    webHeaderCell: {
        fontSize: 11,
        fontWeight: '700',
        color: '#64748B',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    webTableRow: {
        flexDirection: 'row',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        alignItems: 'center',
        ...Platform.select({ web: { cursor: 'default' } })
    },
    webTableRowEven: {
        backgroundColor: '#fff',
    },
    webTableRowOdd: {
        backgroundColor: '#FAFBFC',
    },
    webRowDelivered: {
        opacity: 0.75,
    },
    webCellBold: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0F172A',
    },
    webCellSub: {
        fontSize: 12,
        color: Colors.secondary,
        marginTop: 2,
    },
    webCellText: {
        fontSize: 13,
        color: '#374151',
    },
    webCellCenter: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0F172A',
        textAlign: 'center',
    },
    webCellNum: {
        fontSize: 13,
        color: '#0F172A',
        fontVariant: ['tabular-nums'],
    },
    webStatusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 20,
    },
    webStatusText: {
        fontSize: 11,
        fontWeight: '700',
    },
    webActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 5,
        paddingHorizontal: 8,
        borderRadius: 7,
        gap: 3,
        ...Platform.select({ web: { cursor: 'pointer' } })
    },
    webActionBtnText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#fff',
    },

    // Mobil Liste
    listContent: {
        paddingBottom: 80,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        opacity: 0.8,
    },
    emptyStateText: {
        marginTop: 12,
        fontSize: 15,
        color: Colors.secondary,
        textAlign: 'center',
    },
    emptyAddBtn: {
        marginTop: 16,
        backgroundColor: Colors.iosBlue,
        paddingVertical: 10,
        paddingHorizontal: 24,
        borderRadius: 10,
    },
    emptyAddBtnText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
    },

    // Modal
    modalOverlay: {
        flex: 1,
        justifyContent: "center",
        alignItems: 'center',
        backgroundColor: "rgba(0,0,0,0.5)",
    },
    modalContent: {
        backgroundColor: "#fff",
        borderRadius: 20,
        width: isWeb ? 680 : '95%',
        maxHeight: "90%",
        paddingTop: 0,
        overflow: 'hidden',
        ...Platform.select({
            web: { boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }
        })
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: 24,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: Colors.textPrimary,
    },
    modalSubtitle: {
        fontSize: 13,
        color: Colors.secondary,
        marginTop: 2,
    },
    closeButton: {
        padding: 8,
        backgroundColor: '#F1F5F9',
        borderRadius: 10,
    },
});