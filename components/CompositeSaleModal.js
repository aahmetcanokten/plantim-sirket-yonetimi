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
    KeyboardAvoidingView
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../Theme";
import { AppContext } from "../AppContext";
import KeyboardSafeView from "./KeyboardSafeView"; // Assuming this exists as used in StockScreen
import DatePickerButton from "./DatePickerButton";
import { scheduleShipmentNotification } from "../utils/NotificationHelper";

export default function CompositeSaleModal({ visible, onClose, onComplete }) {
    const { products, customers, updateProduct, addSale, isPremium } = useContext(AppContext);

    // Steps: 0 = Select Items, 1 = Sale Details
    const [step, setStep] = useState(0);

    // Step 0 State: Selected Items
    // Structure: { [productId]: quantity }
    const [selectedItems, setSelectedItems] = useState({});
    const [searchQuery, setSearchQuery] = useState("");

    // Step 1 State: Sale Details
    const [parentName, setParentName] = useState("");
    const [salePrice, setSalePrice] = useState("");
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [shipmentDate, setShipmentDate] = useState(new Date());

    // YENİ: Miktar Giriş Modalı için State
    const [qtyModalVisible, setQtyModalVisible] = useState(false);
    const [qtyTargetItem, setQtyTargetItem] = useState(null); // { product, currentQty }
    const [qtyInputValue, setQtyInputValue] = useState("");

    // Reset state when modal opens
    useEffect(() => {
        if (visible) {
            setStep(0);
            setSelectedItems({});
            setSearchQuery("");
            setParentName("");
            setSalePrice("");
            setSelectedCustomer(null);
            setShipmentDate(new Date());
            setQtyModalVisible(false);
            setQtyTargetItem(null);
            setQtyInputValue("");
        }
    }, [visible]);

    // --- Step 0 Logic: Item Selection ---

    const filteredProducts = useMemo(() => {
        if (!products) return [];
        let list = products.filter(p => (p.quantity || 0) > 0); // Only show items in stock
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            list = list.filter(p => p.name.toLowerCase().includes(q) || (p.code && p.code.toLowerCase().includes(q)));
        }
        return list;
    }, [products, searchQuery]);

    const toggleItemSelection = (product, qty = 1) => {
        setSelectedItems(prev => {
            const current = prev[product.id] || 0;
            const newQty = current + qty;

            if (newQty <= 0) {
                const { [product.id]: _, ...rest } = prev;
                return rest;
            }

            // Check stock limit
            if (newQty > product.quantity) {
                Alert.alert("Stok Yetersiz", `${product.name} için maksimum stok: ${product.quantity}`);
                return prev; // Don't change if exceeds stock
            }

            return { ...prev, [product.id]: newQty };
        });
    };

    // YENİ: Manuel Miktar Güncelleme
    const handleManualQtyUpdate = () => {
        if (!qtyTargetItem) return;
        const val = parseInt(qtyInputValue, 10);

        if (isNaN(val) || val <= 0) {
            // 0 veya geçersizse silmek mi istiyor? Yoksa hata mı?
            // Şimdilik 0 ise sil, geçersiz ise uyarı ver.
            if (val === 0) {
                setSelectedItems(prev => {
                    const { [qtyTargetItem.product.id]: _, ...rest } = prev;
                    return rest;
                });
                closeQtyModal();
                return;
            }
            Alert.alert("Hata", "Lütfen geçerli bir miktar girin.");
            return;
        }

        const product = qtyTargetItem.product;
        if (val > product.quantity) {
            Alert.alert("Stok Yetersiz", `${product.name} için maksimum stok: ${product.quantity}`);
            return;
        }

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
            if (prod) {
                total += (prod.cost || 0) * selectedItems[pid];
            }
        });
        return total;
    };

    // --- Step 1 Logic: Finalization ---

    const handleNext = () => {
        if (getSelectedItemCount() === 0) {
            Alert.alert("Uyarı", "Lütfen en az bir bileşen seçin.");
            return;
        }
        setStep(1);
    };

    const handleBack = () => {
        setStep(0);
    };

    const handleComplete = async () => {
        if (!parentName.trim()) {
            Alert.alert("Hata", "Lütfen ürün adı girin.");
            return;
        }
        if (!salePrice || isNaN(parseFloat(salePrice))) {
            Alert.alert("Hata", "Geçerli bir satış fiyatı girin.");
            return;
        }
        if (!selectedCustomer) {
            Alert.alert("Hata", "Lütfen bir müşteri seçin.");
            return;
        }

        const totalCost = calculateTotalCost();
        const finalPrice = parseFloat(salePrice);

        // 1. Deduct Stock for each component
        for (const pid of Object.keys(selectedItems)) {
            const qtyToDeduct = selectedItems[pid];
            const prod = products.find(p => p.id === pid);
            if (prod) {
                const newQty = (prod.quantity || 0) - qtyToDeduct;
                await updateProduct({ ...prod, quantity: newQty });
            }
        }

        // 2. Create Sale Record
        const newSale = {
            productId: null, // Composite product has no ID in products table
            productName: parentName,
            price: finalPrice,
            quantity: 1, // Parent product count is always 1 for this flow
            cost: totalCost,
            dateISO: new Date().toISOString(),
            date: new Date().toLocaleString(),
            customerId: selectedCustomer.id,
            customerName: selectedCustomer.name,
            isShipped: false,
            productCode: 'KOMPOZİT', // Special code for composite items
            category: 'Özel Üretim',
            description: `Bileşenler: ${Object.keys(selectedItems).map(pid => {
                const p = products.find(prod => prod.id === pid);
                return `${p?.name} (x${selectedItems[pid]})`;
            }).join(', ')}`,
            shipmentDate: shipmentDate ? shipmentDate.toISOString() : null
        };

        await addSale(newSale);

        if (shipmentDate) {
            scheduleShipmentNotification(parentName, shipmentDate.toISOString());
        }

        onComplete(); // Notify parent
        onClose(); // Close modal
    };


    // --- Render Helpers ---

    const renderProductItem = ({ item }) => {
        const selectedQty = selectedItems[item.id] || 0;
        return (
            <View style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemSub}>Stok: {item.quantity} | Maliyet: {item.cost}₺</Text>
                </View>

                <View style={styles.qtyControl}>
                    {selectedQty > 0 && (
                        <>
                            <TouchableOpacity onPress={() => toggleItemSelection(item, -1)} style={styles.qtyBtn}>
                                <Ionicons name="remove" size={18} color={Colors.iosBlue} />
                            </TouchableOpacity>

                            {/* Miktara tıklayınca manuel giriş aç */}
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
                            <TouchableOpacity onPress={step === 0 ? onClose : handleBack} style={styles.closeBtn}>
                                <Ionicons name={step === 0 ? "close" : "arrow-back"} size={24} color={Colors.textPrimary} />
                            </TouchableOpacity>
                            <Text style={styles.title}>{step === 0 ? "Bileşen Seçimi" : "Satış Detayları"}</Text>
                            <View style={{ width: 24 }} />
                        </View>

                        {step === 0 ? (
                            // STEP 0: Select Components
                            <View style={{ flex: 1 }}>
                                <View style={styles.searchBox}>
                                    <Ionicons name="search" size={20} color={Colors.secondary} />
                                    <TextInput
                                        style={styles.searchInput}
                                        placeholder="Bileşen Ara..."
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
                                    />
                                </View>

                                <FlatList
                                    data={filteredProducts}
                                    keyExtractor={item => item.id}
                                    renderItem={renderProductItem}
                                    contentContainerStyle={{ padding: 16 }}
                                    ListEmptyComponent={<Text style={styles.emptyText}>Stokta uygun bileşen bulunamadı.</Text>}
                                />

                                <View style={styles.footer}>
                                    <View>
                                        <Text style={styles.totalLabel}>Seçilen: {getSelectedItemCount()} Kalem</Text>
                                        <Text style={styles.totalCost}>Tahmini Maliyet: {calculateTotalCost().toFixed(2)}₺</Text>
                                    </View>
                                    <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
                                        <Text style={styles.nextBtnText}>İleri</Text>
                                        <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 4 }} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            // STEP 1: Details
                            <ScrollView contentContainerStyle={{ padding: 20 }}>
                                <View style={styles.summaryBox}>
                                    <Text style={styles.summaryTitle}>Maliyet Özeti</Text>
                                    <Text style={styles.summaryCost}>{calculateTotalCost().toFixed(2)} ₺</Text>
                                    <Text style={styles.summaryNote}>{getSelectedItemCount()} bileşen stoktan düşülecek.</Text>
                                </View>

                                <Text style={styles.label}>Sipariş Numarası veya Satılacak Ürün Adı</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Örn: Özel Montaj Masa"
                                    value={parentName}
                                    onChangeText={setParentName}
                                />

                                <Text style={styles.label}>Satış Fiyatı (₺)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="0.00"
                                    keyboardType="numeric"
                                    value={salePrice}
                                    onChangeText={setSalePrice}
                                />

                                <Text style={styles.label}>Sevk Tarihi</Text>
                                <DatePickerButton
                                    value={shipmentDate}
                                    onChange={setShipmentDate}
                                    placeholder="Tarih Seçiniz"
                                />

                                <Text style={styles.label}>Müşteri Seçin</Text>
                                <View style={styles.customerList}>
                                    <FlatList
                                        data={customers}
                                        keyExtractor={item => item.id}
                                        renderItem={renderCustomerItem}
                                        nestedScrollEnabled={true}
                                        style={{ maxHeight: 200 }}
                                    />
                                </View>

                                <TouchableOpacity style={styles.completeBtn} onPress={handleComplete}>
                                    <Text style={styles.completeBtnText}>Satış Siparişi Oluştur</Text>
                                </TouchableOpacity>

                            </ScrollView>
                        )}

                    </View>
                    {/* Safe Area Spacer for iOS Home Indicator */}
                    <View style={{ height: Platform.OS === 'ios' ? 34 : 0, backgroundColor: '#fff' }} />
                </View>
            </KeyboardSafeView>


            {/* Helper Modal for Quantity Entry */}
            <QuantityInputModal
                visible={qtyModalVisible}
                value={qtyInputValue}
                onChangeText={setQtyInputValue}
                onClose={closeQtyModal}
                onSave={handleManualQtyUpdate}
                productName={qtyTargetItem?.product?.name}
            />
        </Modal >
    );
}

// YENİ: Basit Miktar Giriş Modalı
function QuantityInputModal({ visible, value, onChangeText, onClose, onSave, productName }) {
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.qtyModalOverlay}>
                <View style={styles.qtyModalContent}>
                    <Text style={styles.qtyModalTitle}>{productName}</Text>
                    <Text style={styles.qtyModalSub}>Miktar Giriniz:</Text>

                    <TextInput
                        style={styles.qtyInput}
                        value={value}
                        onChangeText={onChangeText}
                        keyboardType="number-pad"
                        autoFocus
                        selectTextOnFocus
                    />

                    <View style={styles.qtyModalActions}>
                        <TouchableOpacity style={styles.qtyCancelBtn} onPress={onClose}>
                            <Text style={styles.qtyCancelText}>İptal</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.qtySaveBtn} onPress={onSave}>
                            <Text style={styles.qtySaveText}>Tamam</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    qtyModalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20
    },
    qtyModalContent: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 20,
        width: "80%",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5
    },
    qtyModalTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: Colors.textPrimary,
        marginBottom: 5,
        textAlign: 'center'
    },
    qtyModalSub: {
        fontSize: 14,
        color: Colors.secondary,
        marginBottom: 15
    },
    qtyInput: {
        width: '100%',
        borderWidth: 1,
        borderColor: Colors.iosBlue,
        borderRadius: 10,
        padding: 12,
        fontSize: 24,
        textAlign: 'center',
        fontWeight: 'bold',
        color: Colors.textPrimary,
        marginBottom: 20,
        backgroundColor: '#F0F9FF'
    },
    qtyModalActions: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between'
    },
    qtyCancelBtn: {
        flex: 1,
        padding: 12,
        marginRight: 10,
        alignItems: 'center',
        borderRadius: 10,
        backgroundColor: '#F2F4F8'
    },
    qtyCancelText: {
        color: Colors.textPrimary,
        fontWeight: "600"
    },
    qtySaveBtn: {
        flex: 1,
        padding: 12,
        marginLeft: 10,
        alignItems: 'center',
        borderRadius: 10,
        backgroundColor: Colors.iosBlue
    },
    qtySaveText: {
        color: "#fff",
        fontWeight: "600"
    },

    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end",
    },
    container: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: "90%",
        overflow: "hidden",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#F2F4F8",
    },
    title: {
        fontSize: 18,
        fontWeight: "700",
        color: Colors.textPrimary,
    },
    closeBtn: {
        padding: 4,
    },
    searchBox: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F2F5F9",
        margin: 16,
        paddingHorizontal: 12,
        borderRadius: 10,
        height: 44,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 15,
        color: Colors.textPrimary,
    },

    // Item Row
    itemRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F2F4F8",
    },
    itemName: {
        fontSize: 15,
        fontWeight: "600",
        color: Colors.textPrimary,
    },
    itemSub: {
        fontSize: 12,
        color: Colors.secondary,
        marginTop: 2,
    },
    qtyControl: {
        flexDirection: "row",
        alignItems: "center",
    },
    qtyBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "#F2F5F9",
        justifyContent: "center",
        alignItems: "center",
    },
    qtyText: {
        marginHorizontal: 12,
        fontSize: 16,
        fontWeight: "600",
    },

    // Footer
    footer: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: "#F2F4F8",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#fff",
    },
    totalLabel: {
        fontSize: 12,
        color: Colors.secondary,
    },
    totalCost: {
        fontSize: 16,
        fontWeight: "700",
        color: Colors.iosBlue,
    },
    nextBtn: {
        backgroundColor: Colors.iosBlue,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 12,
        flexDirection: "row",
        alignItems: "center",
    },
    nextBtnText: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 15,
    },
    emptyText: {
        textAlign: "center",
        marginTop: 40,
        color: Colors.secondary,
    },

    // Step 1 Styles
    summaryBox: {
        backgroundColor: "#F0F9FF",
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: "#BAE6FD",
        alignItems: "center",
    },
    summaryTitle: {
        fontSize: 14,
        color: Colors.iosBlue,
        fontWeight: "600",
    },
    summaryCost: {
        fontSize: 24,
        fontWeight: "800",
        color: Colors.iosBlue,
        marginVertical: 4,
    },
    summaryNote: {
        fontSize: 12,
        color: Colors.secondary,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: Colors.textPrimary,
        marginBottom: 8,
        marginTop: 12,
    },
    input: {
        borderWidth: 1,
        borderColor: "#E6E9EE",
        borderRadius: 10,
        padding: 12,
        fontSize: 16,
        backgroundColor: "#fff",
    },
    customerList: {
        borderWidth: 1,
        borderColor: "#E6E9EE",
        borderRadius: 10,
        maxHeight: 200,
    },
    customerItem: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F2F4F8",
    },
    customerItemSelected: {
        backgroundColor: "#F0F9FF",
    },
    customerName: {
        fontSize: 15,
        color: Colors.textPrimary,
    },
    completeBtn: {
        backgroundColor: Colors.iosGreen,
        padding: 16,
        borderRadius: 12,
        alignItems: "center",
        marginTop: 30,
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    completeBtnText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "800",
    }
});
