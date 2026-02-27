import React, { useState, useContext, useMemo, useEffect } from "react";
import {
    View,
    Text,
    Modal,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    FlatList,
    Alert,
    ScrollView,
    Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../Theme";
import { AppContext } from "../AppContext";
import KeyboardSafeView from "./KeyboardSafeView";
import DatePickerButton from "./DatePickerButton";
import { scheduleShipmentNotification } from "../utils/NotificationHelper";
import { useTranslation } from "react-i18next";

export default function CompositeSaleModal({ visible, onClose, onComplete }) {
    const { products, customers, addSale, isPremium } = useContext(AppContext);
    const { t } = useTranslation();

    const [step, setStep] = useState(0);
    const [selectedItems, setSelectedItems] = useState({});
    const [searchQuery, setSearchQuery] = useState("");
    const [customerSearch, setCustomerSearch] = useState("");
    const [parentName, setParentName] = useState("");
    const [salePrice, setSalePrice] = useState("");
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [shipmentDate, setShipmentDate] = useState(new Date());
    const [qtyModalVisible, setQtyModalVisible] = useState(false);
    const [qtyTargetItem, setQtyTargetItem] = useState(null);
    const [qtyInputValue, setQtyInputValue] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (visible) {
            setStep(0);
            setSelectedItems({});
            setSearchQuery("");
            setCustomerSearch("");
            setParentName("");
            setSalePrice("");
            setSelectedCustomer(null);
            setShipmentDate(new Date());
            setQtyModalVisible(false);
            setQtyTargetItem(null);
            setQtyInputValue("");
            setIsSubmitting(false);
        }
    }, [visible]);

    const filteredProducts = useMemo(() => {
        if (!products) return [];
        let list = [...products]; // Stok sınırı kaldırıldı - sıfır stoklu ürünler de görünür
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            list = list.filter(p => p.name.toLowerCase().includes(q) || (p.code && p.code.toLowerCase().includes(q)) || (p.category && p.category.toLowerCase().includes(q)));
        }
        return list;
    }, [products, searchQuery]);

    const filteredCustomers = useMemo(() => {
        if (!customers) return [];
        if (!customerSearch) return customers;
        const q = customerSearch.toLowerCase();
        return customers.filter(c => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q)));
    }, [customers, customerSearch]);

    const toggleItemSelection = (product, qty = 1) => {
        setSelectedItems(prev => {
            const current = prev[product.id] || 0;
            const newQty = current + qty;
            if (newQty <= 0) {
                const { [product.id]: _, ...rest } = prev;
                return rest;
            }
            // Stok sınırı kaldırıldı - stoktan fazla sipariş girilebilir
            return { ...prev, [product.id]: newQty };
        });
    };

    const handleManualQtyUpdate = () => {
        if (!qtyTargetItem) return;
        const val = parseInt(qtyInputValue, 10);
        if (isNaN(val) || val < 0) {
            Alert.alert(t("error"), t("enter_valid_quantity"));
            return;
        }
        if (val === 0) {
            setSelectedItems(prev => {
                const { [qtyTargetItem.product.id]: _, ...rest } = prev;
                return rest;
            });
            closeQtyModal();
            return;
        }
        const product = qtyTargetItem.product;
        // Stok sınırı kaldırıldı - stoktan fazla miktar girilebilir
        setSelectedItems(prev => ({ ...prev, [product.id]: val }));
        closeQtyModal();
    };

    const openQtyModal = (product, currentQty) => {
        setQtyTargetItem({ product, currentQty });
        setQtyInputValue(String(currentQty));
        setQtyModalVisible(true);
    };

    const closeQtyModal = () => {
        setQtyModalVisible(false);
        setQtyTargetItem(null);
        setQtyInputValue("");
    };

    const getSelectedItemCount = () => Object.keys(selectedItems).length;

    const calculateTotalCost = () => {
        let total = 0;
        Object.keys(selectedItems).forEach(pid => {
            const prod = products.find(p => p.id === pid);
            if (prod) total += (prod.cost || 0) * selectedItems[pid];
        });
        return total;
    };

    const selectedItemsList = useMemo(() => {
        return Object.keys(selectedItems).map(pid => {
            const prod = products.find(p => p.id === pid);
            return { product: prod, qty: selectedItems[pid] };
        }).filter(x => x.product);
    }, [selectedItems, products]);

    const profitAmount = useMemo(() => {
        const price = parseFloat(salePrice) || 0;
        return price - calculateTotalCost();
    }, [salePrice, selectedItems]);

    const profitMargin = useMemo(() => {
        const price = parseFloat(salePrice) || 0;
        if (price === 0) return 0;
        return ((profitAmount / price) * 100).toFixed(1);
    }, [profitAmount, salePrice]);

    const handleComplete = async () => {
        if (!parentName.trim()) {
            if (Platform.OS === 'web') window.alert(t("enter_product_name"));
            else Alert.alert(t("error"), t("enter_product_name"));
            return;
        }
        if (!salePrice || isNaN(parseFloat(salePrice))) {
            if (Platform.OS === 'web') window.alert(t("enter_valid_sales_price"));
            else Alert.alert(t("error"), t("enter_valid_sales_price"));
            return;
        }
        if (!selectedCustomer) {
            if (Platform.OS === 'web') window.alert(t("select_customer_error"));
            else Alert.alert(t("error"), t("select_customer_error"));
            return;
        }
        if (getSelectedItemCount() === 0) {
            if (Platform.OS === 'web') window.alert(t("select_at_least_one_component"));
            else Alert.alert(t("warning"), t("select_at_least_one_component"));
            return;
        }

        setIsSubmitting(true);
        try {
            const totalCost = calculateTotalCost();
            const finalPrice = parseFloat(salePrice);

            // NOT: Bileşen stokları bu aşamada DÜŞÜLMÜYOR.
            // Stok düşme işlemi, sipariş "Teslim Edildi" olarak işaretlendiğinde gerçekleşecek.

            const newSale = {
                productId: null,
                productName: parentName,
                price: finalPrice,
                quantity: 1,
                cost: totalCost,
                dateISO: new Date().toISOString(),
                date: new Date().toLocaleString(),
                customerId: selectedCustomer.id,
                customerName: selectedCustomer.name,
                isShipped: false,
                productCode: 'KOMPOZİT',
                category: 'Özel Üretim',
                description: `Bileşenler: ${selectedItemsList.map(x => `${x.product.name} (x${x.qty})`).join(', ')}`,
                shipmentDate: shipmentDate ? shipmentDate.toISOString() : null
            };

            await addSale(newSale);
            if (shipmentDate) scheduleShipmentNotification(parentName, shipmentDate.toISOString());
            onComplete();
            onClose();
        } catch (e) {
            console.error(e);
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Web: Full-screen two-panel ERP layout ──────────────────────────────────
    if (Platform.OS === 'web') {
        if (!visible) return null;
        return (
            <View style={webStyles.backdrop}>
                <View style={webStyles.panel}>
                    {/* ── HEADER ── */}
                    <View style={webStyles.header}>
                        <View style={webStyles.headerLeft}>
                            <View style={webStyles.headerIcon}>
                                <Ionicons name="cart" size={20} color="#fff" />
                            </View>
                            <View>
                                <Text style={webStyles.headerTitle}>{t("create_new_sale")}</Text>
                                <Text style={webStyles.headerSub}>Yeni Satış Siparişi Oluştur</Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={onClose} style={webStyles.closeBtn}>
                            <Ionicons name="close" size={22} color="#64748B" />
                        </TouchableOpacity>
                    </View>

                    {/* ── BODY: two columns ── */}
                    <View style={webStyles.body}>

                        {/* LEFT: Product Selection */}
                        <View style={webStyles.leftPane}>
                            <View style={webStyles.paneHeader}>
                                <View style={webStyles.paneHeaderLeft}>
                                    <Ionicons name="cube-outline" size={16} color="#6366F1" />
                                    <Text style={webStyles.paneTitle}>Ürün Seçimi</Text>
                                </View>
                                <View style={webStyles.selectedBadge}>
                                    <Text style={webStyles.selectedBadgeText}>{getSelectedItemCount()} seçili</Text>
                                </View>
                            </View>

                            {/* Search */}
                            <View style={webStyles.searchBox}>
                                <Ionicons name="search" size={16} color="#94A3B8" />
                                <TextInput
                                    style={webStyles.searchInput}
                                    placeholder="Ürün adı, kod veya kategori ara..."
                                    placeholderTextColor="#94A3B8"
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                />
                                {searchQuery ? (
                                    <TouchableOpacity onPress={() => setSearchQuery("")}>
                                        <Ionicons name="close-circle" size={16} color="#94A3B8" />
                                    </TouchableOpacity>
                                ) : null}
                            </View>

                            {/* Product List */}
                            <ScrollView style={webStyles.productList} showsVerticalScrollIndicator={false}>
                                {filteredProducts.length === 0 ? (
                                    <View style={webStyles.emptyState}>
                                        <Ionicons name="cube-outline" size={40} color="#CBD5E1" />
                                        <Text style={webStyles.emptyText}>{t("no_component_in_stock")}</Text>
                                    </View>
                                ) : filteredProducts.map(item => {
                                    const selectedQty = selectedItems[item.id] || 0;
                                    const isSelected = selectedQty > 0;
                                    return (
                                        <View key={item.id} style={[webStyles.productRow, isSelected && webStyles.productRowSelected]}>
                                            <View style={webStyles.productRowInfo}>
                                                <View style={webStyles.productRowTop}>
                                                    <Text style={webStyles.productRowName} numberOfLines={1}>{item.name}</Text>
                                                    {item.code && (
                                                        <View style={webStyles.codePill}>
                                                            <Text style={webStyles.codePillText}>{item.code}</Text>
                                                        </View>
                                                    )}
                                                </View>
                                                <View style={webStyles.productRowMeta}>
                                                    <Text style={webStyles.productRowMetaText}>Stok: <Text style={{ color: item.quantity <= 0 ? '#E53E3E' : (item.quantity <= 5 ? '#D97706' : '#22C55E'), fontWeight: '700' }}>{item.quantity}</Text></Text>
                                                    {item.category && <Text style={webStyles.productRowMetaDivider}>•</Text>}
                                                    {item.category && <Text style={webStyles.productRowMetaText}>{item.category}</Text>}
                                                    {item.cost > 0 && <Text style={webStyles.productRowMetaDivider}>•</Text>}
                                                    {item.cost > 0 && <Text style={webStyles.productRowMetaText}>Maliyet: {Number(item.cost).toLocaleString('tr-TR')} ₺</Text>}
                                                </View>
                                                {selectedQty > item.quantity && (
                                                    <Text style={{ fontSize: 10, color: '#D97706', fontWeight: '700', marginTop: 2 }}>
                                                        ⚠ Stok üzeri sipariş ({selectedQty - item.quantity} adet eksik)
                                                    </Text>
                                                )}
                                            </View>
                                            <View style={webStyles.qtyControl}>
                                                {isSelected ? (
                                                    <>
                                                        <TouchableOpacity
                                                            onPress={() => toggleItemSelection(item, -1)}
                                                            style={webStyles.qtyBtn}
                                                        >
                                                            <Ionicons name="remove" size={16} color="#64748B" />
                                                        </TouchableOpacity>
                                                        <TouchableOpacity onPress={() => openQtyModal(item, selectedQty)} style={webStyles.qtyDisplay}>
                                                            <Text style={webStyles.qtyDisplayText}>{selectedQty}</Text>
                                                        </TouchableOpacity>
                                                    </>
                                                ) : null}
                                                <TouchableOpacity
                                                    onPress={() => toggleItemSelection(item, 1)}
                                                    style={[webStyles.qtyBtn, webStyles.qtyBtnAdd]}
                                                >
                                                    <Ionicons name="add" size={16} color="#fff" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    );
                                })}
                            </ScrollView>

                            {/* Selected Summary */}
                            {getSelectedItemCount() > 0 && (
                                <View style={webStyles.selectedSummary}>
                                    <Text style={webStyles.selectedSummaryTitle}>Seçilen Ürünler</Text>
                                    {selectedItemsList.map(({ product, qty }) => (
                                        <View key={product.id} style={webStyles.selectedSummaryRow}>
                                            <View style={webStyles.selectedSummaryDot} />
                                            <Text style={webStyles.selectedSummaryName} numberOfLines={1}>{product.name}</Text>
                                            <Text style={webStyles.selectedSummaryQty}>x{qty}</Text>
                                            <Text style={webStyles.selectedSummaryCost}>{((product.cost || 0) * qty).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</Text>
                                        </View>
                                    ))}
                                    <View style={webStyles.selectedSummaryTotal}>
                                        <Text style={webStyles.selectedSummaryTotalLabel}>Toplam Maliyet</Text>
                                        <Text style={webStyles.selectedSummaryTotalValue}>{calculateTotalCost().toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</Text>
                                    </View>
                                </View>
                            )}
                        </View>

                        {/* RIGHT: Order Details */}
                        <View style={webStyles.rightPane}>
                            <ScrollView showsVerticalScrollIndicator={false}>

                                {/* Profit KPI Card */}
                                <View style={webStyles.kpiRow}>
                                    <View style={[webStyles.kpiCard, { flex: 1, marginRight: 8 }]}>
                                        <Text style={webStyles.kpiLabel}>Tahmini Maliyet</Text>
                                        <Text style={[webStyles.kpiValue, { color: '#64748B' }]}>{calculateTotalCost().toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</Text>
                                    </View>
                                    <View style={[webStyles.kpiCard, { flex: 1, marginLeft: 8, backgroundColor: profitAmount >= 0 ? '#F0FDF4' : '#FFF5F5', borderColor: profitAmount >= 0 ? '#86EFAC' : '#FCA5A5' }]}>
                                        <Text style={webStyles.kpiLabel}>Tahmini Kar</Text>
                                        <Text style={[webStyles.kpiValue, { color: profitAmount >= 0 ? '#16A34A' : '#DC2626' }]}>
                                            {profitAmount >= 0 ? '+' : ''}{profitAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                            {parseFloat(salePrice) > 0 && <Text style={{ fontSize: 12, fontWeight: '500' }}> ({profitMargin}%)</Text>}
                                        </Text>
                                    </View>
                                </View>

                                {/* Section: Sipariş Adı */}
                                <View style={webStyles.section}>
                                    <View style={webStyles.sectionHeader}>
                                        <Ionicons name="document-text-outline" size={15} color="#6366F1" />
                                        <Text style={webStyles.sectionTitle}>Sipariş Bilgileri</Text>
                                    </View>
                                    <View style={webStyles.fieldGroup}>
                                        <Text style={webStyles.fieldLabel}>Sipariş / Ürün Adı <Text style={webStyles.required}>*</Text></Text>
                                        <View style={webStyles.inputWrapper}>
                                            <Ionicons name="create-outline" size={16} color="#94A3B8" style={{ marginRight: 8 }} />
                                            <TextInput
                                                style={webStyles.fieldInput}
                                                placeholder={t("composite_product_placeholder")}
                                                placeholderTextColor="#94A3B8"
                                                value={parentName}
                                                onChangeText={setParentName}
                                            />
                                        </View>
                                    </View>
                                    <View style={webStyles.fieldRow}>
                                        <View style={[webStyles.fieldGroup, { flex: 1, marginRight: 8 }]}>
                                            <Text style={webStyles.fieldLabel}>Satış Fiyatı (₺) <Text style={webStyles.required}>*</Text></Text>
                                            <View style={webStyles.inputWrapper}>
                                                <Text style={webStyles.currencySymbol}>₺</Text>
                                                <TextInput
                                                    style={webStyles.fieldInput}
                                                    placeholder="0,00"
                                                    placeholderTextColor="#94A3B8"
                                                    keyboardType="numeric"
                                                    value={salePrice}
                                                    onChangeText={setSalePrice}
                                                />
                                            </View>
                                        </View>
                                        <View style={[webStyles.fieldGroup, { flex: 1, marginLeft: 8 }]}>
                                            <Text style={webStyles.fieldLabel}>Sevk Tarihi</Text>
                                            <DatePickerButton
                                                value={shipmentDate}
                                                onChange={setShipmentDate}
                                                placeholder={t("date_not_specified")}
                                                style={webStyles.datePickerStyle}
                                            />
                                        </View>
                                    </View>
                                </View>

                                {/* Section: Müşteri */}
                                <View style={webStyles.section}>
                                    <View style={webStyles.sectionHeader}>
                                        <Ionicons name="people-outline" size={15} color="#6366F1" />
                                        <Text style={webStyles.sectionTitle}>Müşteri Seçimi <Text style={webStyles.required}>*</Text></Text>
                                    </View>

                                    {selectedCustomer && (
                                        <View style={webStyles.selectedCustomerCard}>
                                            <View style={webStyles.selectedCustomerAvatar}>
                                                <Text style={webStyles.selectedCustomerAvatarText}>
                                                    {selectedCustomer.name.charAt(0).toUpperCase()}
                                                </Text>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={webStyles.selectedCustomerName}>{selectedCustomer.name}</Text>
                                                {selectedCustomer.phone && <Text style={webStyles.selectedCustomerPhone}>{selectedCustomer.phone}</Text>}
                                            </View>
                                            <TouchableOpacity onPress={() => setSelectedCustomer(null)} style={webStyles.clearCustomerBtn}>
                                                <Ionicons name="close-circle" size={20} color="#94A3B8" />
                                            </TouchableOpacity>
                                        </View>
                                    )}

                                    {!selectedCustomer && (
                                        <>
                                            <View style={webStyles.searchBox}>
                                                <Ionicons name="search" size={16} color="#94A3B8" />
                                                <TextInput
                                                    style={webStyles.searchInput}
                                                    placeholder="Müşteri ara..."
                                                    placeholderTextColor="#94A3B8"
                                                    value={customerSearch}
                                                    onChangeText={setCustomerSearch}
                                                />
                                            </View>
                                            <View style={webStyles.customerListBox}>
                                                {filteredCustomers.length === 0 ? (
                                                    <View style={{ padding: 20, alignItems: 'center' }}>
                                                        <Text style={{ color: '#94A3B8', fontSize: 13 }}>{t("no_customer_found")}</Text>
                                                    </View>
                                                ) : filteredCustomers.map(c => (
                                                    <TouchableOpacity key={c.id} style={webStyles.customerRow} onPress={() => setSelectedCustomer(c)}>
                                                        <View style={webStyles.customerAvatar}>
                                                            <Text style={webStyles.customerAvatarText}>{c.name.charAt(0).toUpperCase()}</Text>
                                                        </View>
                                                        <View style={{ flex: 1 }}>
                                                            <Text style={webStyles.customerRowName}>{c.name}</Text>
                                                            {c.phone && <Text style={webStyles.customerRowPhone}>{c.phone}</Text>}
                                                        </View>
                                                        <Ionicons name="chevron-forward" size={14} color="#CBD5E1" />
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        </>
                                    )}
                                </View>

                                {/* Actions */}
                                <View style={webStyles.actionRow}>
                                    <TouchableOpacity onPress={onClose} style={webStyles.cancelBtn}>
                                        <Text style={webStyles.cancelBtnText}>{t("cancel")}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={handleComplete} style={[webStyles.submitBtn, isSubmitting && { opacity: 0.7 }]} disabled={isSubmitting}>
                                        <Ionicons name="checkmark-circle" size={18} color="#fff" style={{ marginRight: 8 }} />
                                        <Text style={webStyles.submitBtnText}>
                                            {isSubmitting ? "Kaydediliyor..." : t("create_sales_order")}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>
                        </View>
                    </View>
                </View>

                {/* Qty Modal */}
                {qtyModalVisible && (
                    <View style={webStyles.qtyModalBackdrop}>
                        <View style={webStyles.qtyModal}>
                            <Text style={webStyles.qtyModalTitle}>{qtyTargetItem?.product?.name}</Text>
                            <Text style={webStyles.qtyModalSub}>Miktar Girin</Text>
                            <TextInput
                                style={webStyles.qtyModalInput}
                                value={qtyInputValue}
                                onChangeText={setQtyInputValue}
                                keyboardType="number-pad"
                                autoFocus
                                selectTextOnFocus
                            />
                            <View style={webStyles.qtyModalActions}>
                                <TouchableOpacity onPress={closeQtyModal} style={webStyles.qtyModalCancelBtn}>
                                    <Text style={{ color: '#64748B', fontWeight: '600' }}>{t("cancel")}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleManualQtyUpdate} style={webStyles.qtyModalSaveBtn}>
                                    <Text style={{ color: '#fff', fontWeight: '700' }}>{t("ok")}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                )}
            </View>
        );
    }

    // ── MOBILE: existing sheet layout ─────────────────────────────────────────
    const renderProductItem = ({ item }) => {
        const selectedQty = selectedItems[item.id] || 0;
        return (
            <View style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemSub}>{t("stock_label")}: {item.quantity} | {t("cost_label")}: {item.cost}₺</Text>
                </View>
                <View style={styles.qtyControl}>
                    {selectedQty > 0 && (
                        <>
                            <TouchableOpacity onPress={() => toggleItemSelection(item, -1)} style={styles.qtyBtn}>
                                <Ionicons name="remove" size={18} color={Colors.iosBlue} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => openQtyModal(item, selectedQty)}>
                                <Text style={styles.qtyText}>{selectedQty}</Text>
                            </TouchableOpacity>
                        </>
                    )}
                    <TouchableOpacity onPress={() => toggleItemSelection(item, 1)} style={[styles.qtyBtn, { backgroundColor: Colors.iosBlue }]}>
                        <Ionicons name="add" size={18} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const renderCustomerItem = ({ item }) => (
        <TouchableOpacity
            style={[styles.customerItem, selectedCustomer?.id === item.id && styles.customerItemSelected]}
            onPress={() => setSelectedCustomer(item)}
        >
            <Text style={[styles.customerName, selectedCustomer?.id === item.id && { color: Colors.iosBlue }]}>{item.name}</Text>
        </TouchableOpacity>
    );

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <KeyboardSafeView offsetIOS={0} disableScrollView={true}>
                <View style={styles.overlay}>
                    <View style={styles.container}>
                        <View style={styles.header}>
                            <TouchableOpacity onPress={step === 0 ? onClose : () => setStep(0)} style={styles.closeBtn}>
                                <Ionicons name={step === 0 ? "close" : "arrow-back"} size={24} color={Colors.textPrimary} />
                            </TouchableOpacity>
                            <Text style={styles.title}>{step === 0 ? t("component_selection") : t("sale_details")}</Text>
                            <View style={{ width: 24 }} />
                        </View>

                        {step === 0 ? (
                            <View style={{ flex: 1 }}>
                                <View style={styles.searchBox}>
                                    <Ionicons name="search" size={20} color={Colors.secondary} />
                                    <TextInput style={styles.searchInput} placeholder={t("search_component_placeholder")} value={searchQuery} onChangeText={setSearchQuery} selectTextOnFocus />
                                </View>
                                <FlatList data={filteredProducts} keyExtractor={i => i.id} renderItem={renderProductItem} contentContainerStyle={{ padding: 16 }} ListEmptyComponent={<Text style={styles.emptyText}>{t("no_component_in_stock")}</Text>} />
                                <View style={styles.footer}>
                                    <View>
                                        <Text style={styles.totalLabel}>{t("selected_items_count", { count: getSelectedItemCount() })}</Text>
                                        <Text style={styles.totalCost}>{t("estimated_cost", { cost: calculateTotalCost().toFixed(2) })}</Text>
                                    </View>
                                    <TouchableOpacity style={styles.nextBtn} onPress={() => { if (getSelectedItemCount() === 0) { Alert.alert(t("warning"), t("select_at_least_one_component")); return; } setStep(1); }}>
                                        <Text style={styles.nextBtnText}>{t("next")}</Text>
                                        <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 4 }} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            <ScrollView contentContainerStyle={{ padding: 20 }}>
                                <View style={styles.summaryBox}>
                                    <Text style={styles.summaryTitle}>{t("cost_summary")}</Text>
                                    <Text style={styles.summaryCost}>{calculateTotalCost().toFixed(2)} ₺</Text>
                                    <Text style={styles.summaryNote}>{t("components_will_be_deducted", { count: getSelectedItemCount() })}</Text>
                                </View>
                                <Text style={styles.label}>{t("order_number_or_product_name")}</Text>
                                <TextInput style={styles.input} placeholder={t("composite_product_placeholder")} value={parentName} onChangeText={setParentName} selectTextOnFocus />
                                <Text style={styles.label}>{t("sales_price_currency")}</Text>
                                <TextInput style={styles.input} placeholder="0.00" keyboardType="numeric" value={salePrice} onChangeText={setSalePrice} selectTextOnFocus />
                                <Text style={styles.label}>{t("shipment_date")}</Text>
                                <DatePickerButton value={shipmentDate} onChange={setShipmentDate} placeholder={t("date_not_specified")} />
                                <Text style={styles.label}>{t("select_customer")}</Text>
                                <View style={styles.customerList}>
                                    <FlatList data={customers} keyExtractor={i => i.id} renderItem={renderCustomerItem} nestedScrollEnabled style={{ maxHeight: 200 }} />
                                </View>
                                <TouchableOpacity style={styles.completeBtn} onPress={handleComplete}>
                                    <Text style={styles.completeBtnText}>{t("create_sales_order")}</Text>
                                </TouchableOpacity>
                            </ScrollView>
                        )}
                    </View>
                    <View style={{ height: Platform.OS === 'ios' ? 34 : 0, backgroundColor: '#fff' }} />
                </View>
            </KeyboardSafeView>

            <QuantityInputModal visible={qtyModalVisible} value={qtyInputValue} onChangeText={setQtyInputValue} onClose={closeQtyModal} onSave={handleManualQtyUpdate} productName={qtyTargetItem?.product?.name} t={t} />
        </Modal>
    );
}

function QuantityInputModal({ visible, value, onChangeText, onClose, onSave, productName, t }) {
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.qtyModalOverlay}>
                <View style={styles.qtyModalContent}>
                    <Text style={styles.qtyModalTitle}>{productName}</Text>
                    <Text style={styles.qtyModalSub}>{t("enter_quantity")}</Text>
                    <TextInput style={styles.qtyInput} value={value} onChangeText={onChangeText} keyboardType="number-pad" autoFocus selectTextOnFocus={Platform.OS === 'web'} />
                    <View style={styles.qtyModalActions}>
                        <TouchableOpacity style={styles.qtyCancelBtn} onPress={onClose}><Text style={styles.qtyCancelText}>{t("cancel")}</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.qtySaveBtn} onPress={onSave}><Text style={styles.qtySaveText}>{t("ok")}</Text></TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ─── WEB STYLES ──────────────────────────────────────────────────────────────
const webStyles = StyleSheet.create({
    backdrop: {
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        backdropFilter: 'blur(4px)',
    },
    panel: {
        backgroundColor: '#F8FAFC',
        borderRadius: 20,
        width: '95%',
        maxWidth: 1100,
        height: '90%',
        maxHeight: 780,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 24 },
        shadowOpacity: 0.25,
        shadowRadius: 48,
        flexDirection: 'column',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingVertical: 18,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center' },
    headerIcon: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: '#6366F1',
        justifyContent: 'center', alignItems: 'center',
        marginRight: 12,
    },
    headerTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A' },
    headerSub: { fontSize: 12, color: '#64748B', marginTop: 1 },
    closeBtn: {
        width: 34, height: 34, borderRadius: 8,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center', alignItems: 'center',
        cursor: 'pointer',
    },
    body: { flexDirection: 'row', flex: 1, overflow: 'hidden' },

    // LEFT PANE
    leftPane: {
        width: 380,
        borderRightWidth: 1,
        borderRightColor: '#E2E8F0',
        backgroundColor: '#fff',
        flexDirection: 'column',
    },
    paneHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
    },
    paneHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
    paneTitle: { fontSize: 13, fontWeight: '700', color: '#1E293B', marginLeft: 6 },
    selectedBadge: {
        backgroundColor: '#EEF2FF', borderRadius: 12,
        paddingHorizontal: 8, paddingVertical: 2,
    },
    selectedBadgeText: { fontSize: 11, fontWeight: '700', color: '#6366F1' },
    searchBox: {
        flexDirection: 'row', alignItems: 'center',
        margin: 12, paddingHorizontal: 12, paddingVertical: 8,
        backgroundColor: '#F8FAFC', borderRadius: 10,
        borderWidth: 1, borderColor: '#E2E8F0',
    },
    searchInput: {
        flex: 1, marginLeft: 8, fontSize: 13, color: '#1E293B',
        outlineStyle: 'none',
    },
    productList: { flex: 1 },

    productRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: '#F8FAFC',
    },
    productRowSelected: { backgroundColor: '#F5F3FF' },
    productRowInfo: { flex: 1, marginRight: 10 },
    productRowTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
    productRowName: { fontSize: 13, fontWeight: '600', color: '#1E293B', flex: 1 },
    codePill: {
        backgroundColor: '#EEF2FF', borderRadius: 4,
        paddingHorizontal: 5, paddingVertical: 1, marginLeft: 6,
    },
    codePillText: { fontSize: 10, fontWeight: '700', color: '#6366F1' },
    productRowMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
    productRowMetaText: { fontSize: 11, color: '#94A3B8' },
    productRowMetaDivider: { fontSize: 11, color: '#CBD5E1', marginHorizontal: 4 },

    qtyControl: { flexDirection: 'row', alignItems: 'center' },
    qtyBtn: {
        width: 28, height: 28, borderRadius: 7,
        backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center',
        cursor: 'pointer',
    },
    qtyBtnAdd: { backgroundColor: '#6366F1' },
    qtyDisplay: {
        minWidth: 32, height: 28, justifyContent: 'center', alignItems: 'center',
        backgroundColor: '#EEF2FF', borderRadius: 6, marginHorizontal: 4,
        paddingHorizontal: 6, cursor: 'pointer',
    },
    qtyDisplayText: { fontSize: 13, fontWeight: '700', color: '#6366F1' },

    selectedSummary: {
        borderTopWidth: 1, borderTopColor: '#E2E8F0',
        padding: 14, backgroundColor: '#FAFAFA',
    },
    selectedSummaryTitle: { fontSize: 11, fontWeight: '700', color: '#64748B', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    selectedSummaryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
    selectedSummaryDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#6366F1', marginRight: 6 },
    selectedSummaryName: { flex: 1, fontSize: 12, color: '#1E293B', fontWeight: '500' },
    selectedSummaryQty: { fontSize: 12, color: '#6366F1', fontWeight: '700', marginHorizontal: 8 },
    selectedSummaryCost: { fontSize: 12, color: '#64748B', fontWeight: '500' },
    selectedSummaryTotal: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#E2E8F0',
    },
    selectedSummaryTotalLabel: { fontSize: 12, fontWeight: '700', color: '#475569' },
    selectedSummaryTotalValue: { fontSize: 14, fontWeight: '800', color: '#6366F1' },

    // RIGHT PANE
    rightPane: { flex: 1, paddingHorizontal: 24, paddingTop: 16 },

    kpiRow: { flexDirection: 'row', marginBottom: 16 },
    kpiCard: {
        backgroundColor: '#F8FAFC', borderRadius: 12,
        padding: 14, borderWidth: 1, borderColor: '#E2E8F0',
    },
    kpiLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 },
    kpiValue: { fontSize: 18, fontWeight: '800' },

    section: { marginBottom: 20 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { fontSize: 13, fontWeight: '700', color: '#1E293B', marginLeft: 6 },
    required: { color: '#EF4444' },

    fieldGroup: { marginBottom: 12 },
    fieldRow: { flexDirection: 'row' },
    fieldLabel: { fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 6 },
    inputWrapper: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0',
        borderRadius: 10, paddingHorizontal: 12, height: 42,
    },
    fieldInput: { flex: 1, fontSize: 14, color: '#0F172A', outlineStyle: 'none' },
    currencySymbol: { fontSize: 14, fontWeight: '700', color: '#94A3B8', marginRight: 6 },
    datePickerStyle: { height: 42 },

    selectedCustomerCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#F5F3FF', borderRadius: 12, padding: 12,
        borderWidth: 1, borderColor: '#C7D2FE',
    },
    selectedCustomerAvatar: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: '#6366F1', justifyContent: 'center', alignItems: 'center', marginRight: 10,
    },
    selectedCustomerAvatarText: { color: '#fff', fontWeight: '800', fontSize: 15 },
    selectedCustomerName: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
    selectedCustomerPhone: { fontSize: 12, color: '#64748B', marginTop: 1 },
    clearCustomerBtn: { padding: 4, cursor: 'pointer' },

    customerListBox: {
        backgroundColor: '#fff', borderRadius: 10,
        borderWidth: 1, borderColor: '#E2E8F0',
        maxHeight: 200, overflow: 'hidden',
    },
    customerRow: {
        flexDirection: 'row', alignItems: 'center',
        padding: 10, borderBottomWidth: 1, borderBottomColor: '#F8FAFC',
        cursor: 'pointer',
    },
    customerAvatar: {
        width: 30, height: 30, borderRadius: 15,
        backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginRight: 10,
    },
    customerAvatarText: { fontSize: 13, fontWeight: '700', color: '#6366F1' },
    customerRowName: { fontSize: 13, fontWeight: '600', color: '#1E293B' },
    customerRowPhone: { fontSize: 11, color: '#94A3B8' },

    actionRow: {
        flexDirection: 'row', justifyContent: 'flex-end',
        paddingVertical: 16, gap: 10
    },
    cancelBtn: {
        paddingHorizontal: 20, paddingVertical: 11,
        borderRadius: 10, backgroundColor: '#F1F5F9',
        borderWidth: 1, borderColor: '#E2E8F0', cursor: 'pointer',
    },
    cancelBtnText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
    submitBtn: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 24, paddingVertical: 11,
        borderRadius: 10, backgroundColor: '#6366F1', cursor: 'pointer',
        shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
    },
    submitBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

    emptyState: { alignItems: 'center', paddingVertical: 40 },
    emptyText: { color: '#94A3B8', fontSize: 13, marginTop: 8 },

    // Qty Modal (web)
    qtyModalBackdrop: {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center', alignItems: 'center', zIndex: 10000,
    },
    qtyModal: {
        backgroundColor: '#fff', borderRadius: 16, padding: 24,
        width: 320, alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 20,
    },
    qtyModalTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 4, textAlign: 'center' },
    qtyModalSub: { fontSize: 13, color: '#64748B', marginBottom: 16 },
    qtyModalInput: {
        width: '100%', borderWidth: 2, borderColor: '#6366F1',
        borderRadius: 10, padding: 12, fontSize: 24, textAlign: 'center',
        fontWeight: '800', color: '#1E293B', marginBottom: 20, backgroundColor: '#F5F3FF',
        outlineStyle: 'none',
    },
    qtyModalActions: { flexDirection: 'row', width: '100%', gap: 10 },
    qtyModalCancelBtn: {
        flex: 1, padding: 12, alignItems: 'center',
        borderRadius: 10, backgroundColor: '#F1F5F9', cursor: 'pointer',
    },
    qtyModalSaveBtn: {
        flex: 1, padding: 12, alignItems: 'center',
        borderRadius: 10, backgroundColor: '#6366F1', cursor: 'pointer',
    },
});

// ─── MOBILE STYLES ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    qtyModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
    qtyModalContent: { backgroundColor: "#fff", borderRadius: 16, padding: 20, width: "80%", alignItems: "center" },
    qtyModalTitle: { fontSize: 16, fontWeight: "700", color: Colors.textPrimary, marginBottom: 5, textAlign: 'center' },
    qtyModalSub: { fontSize: 14, color: Colors.secondary, marginBottom: 15 },
    qtyInput: { width: '100%', borderWidth: 1, borderColor: Colors.iosBlue, borderRadius: 10, padding: 12, fontSize: 24, textAlign: 'center', fontWeight: 'bold', color: Colors.textPrimary, marginBottom: 20, backgroundColor: '#F0F9FF' },
    qtyModalActions: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
    qtyCancelBtn: { flex: 1, padding: 12, marginRight: 10, alignItems: 'center', borderRadius: 10, backgroundColor: '#F2F4F8' },
    qtyCancelText: { color: Colors.textPrimary, fontWeight: "600" },
    qtySaveBtn: { flex: 1, padding: 12, marginLeft: 10, alignItems: 'center', borderRadius: 10, backgroundColor: Colors.iosBlue },
    qtySaveText: { color: "#fff", fontWeight: "600" },
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    container: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, height: "90%", overflow: "hidden" },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderBottomColor: "#F2F4F8" },
    title: { fontSize: 18, fontWeight: "700", color: Colors.textPrimary },
    closeBtn: { padding: 4 },
    searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#F2F5F9", margin: 16, paddingHorizontal: 12, borderRadius: 10, height: 44 },
    searchInput: { flex: 1, marginLeft: 8, fontSize: 15, color: Colors.textPrimary },
    itemRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F2F4F8" },
    itemName: { fontSize: 15, fontWeight: "600", color: Colors.textPrimary },
    itemSub: { fontSize: 12, color: Colors.secondary, marginTop: 2 },
    qtyControl: { flexDirection: "row", alignItems: "center" },
    qtyBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#F2F5F9", justifyContent: "center", alignItems: "center" },
    qtyText: { marginHorizontal: 12, fontSize: 16, fontWeight: "600" },
    footer: { padding: 16, borderTopWidth: 1, borderTopColor: "#F2F4F8", flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#fff" },
    totalLabel: { fontSize: 12, color: Colors.secondary },
    totalCost: { fontSize: 16, fontWeight: "700", color: Colors.iosBlue },
    nextBtn: { backgroundColor: Colors.iosBlue, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, flexDirection: "row", alignItems: "center" },
    nextBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
    emptyText: { textAlign: "center", marginTop: 40, color: Colors.secondary },
    summaryBox: { backgroundColor: "#F0F9FF", padding: 16, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: "#BAE6FD", alignItems: "center" },
    summaryTitle: { fontSize: 14, color: Colors.iosBlue, fontWeight: "600" },
    summaryCost: { fontSize: 24, fontWeight: "800", color: Colors.iosBlue, marginVertical: 4 },
    summaryNote: { fontSize: 12, color: Colors.secondary },
    label: { fontSize: 14, fontWeight: "600", color: Colors.textPrimary, marginBottom: 8, marginTop: 12 },
    input: { borderWidth: 1, borderColor: "#E6E9EE", borderRadius: 10, padding: 12, fontSize: 16, backgroundColor: "#fff" },
    customerList: { borderWidth: 1, borderColor: "#E6E9EE", borderRadius: 10, maxHeight: 200 },
    customerItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: "#F2F4F8" },
    customerItemSelected: { backgroundColor: "#F0F9FF" },
    customerName: { fontSize: 15, color: Colors.textPrimary },
    completeBtn: { backgroundColor: Colors.iosGreen, padding: 16, borderRadius: 12, alignItems: "center", marginTop: 30, elevation: 3 },
    completeBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
