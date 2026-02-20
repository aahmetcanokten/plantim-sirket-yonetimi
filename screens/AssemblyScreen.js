import React, { useState, useContext, useMemo, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    FlatList,
    Alert,
    ScrollView,
    Platform
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../Theme";
import { AppContext } from "../AppContext";
import ImmersiveLayout from "../components/ImmersiveLayout";
import { useToast } from "../components/ToastProvider";
import BarcodeScannerModal from "../components/BarcodeScannerModal";
import { useTranslation } from "react-i18next";
import { triggerHaptic, HapticType, requestStoreReview } from "../utils/FeedbackHelper";

export default function AssemblyScreen({ navigation }) {
    const { products, updateProduct, addProduct, isPremium } = useContext(AppContext);
    const toast = useToast();
    const { t } = useTranslation();

    // Steps: 0 = Select Components, 1 = Product Details
    const [step, setStep] = useState(0);

    // Step 0 State: Selected Components
    const [selectedItems, setSelectedItems] = useState({});
    const [searchQuery, setSearchQuery] = useState("");

    // Step 1 State: New Product Details
    const [productName, setProductName] = useState("");
    const [category, setCategory] = useState(t("assembly_product"));
    const [productionQuantity, setProductionQuantity] = useState("1");
    const [salePrice, setSalePrice] = useState("");
    const [criticalLimit, setCriticalLimit] = useState("5");
    const [productCode, setProductCode] = useState("");
    const [description, setDescription] = useState("");

    // Scanner
    const [scannerVisible, setScannerVisible] = useState(false);

    const filteredProducts = useMemo(() => {
        if (!products) return [];
        let list = products.filter(p => (p.quantity || 0) > 0);
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            list = list.filter(p => (p.name || "").toLowerCase().includes(q) || (p.code && p.code.toLowerCase().includes(q)));
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

            if (newQty > (product.quantity || 0)) {
                if (Platform.OS === 'web') {
                    window.alert(t("insufficient_stock_warning") + ": " + t("insufficient_stock_limit", { productName: product.name, quantity: product.quantity }));
                } else {
                    Alert.alert(t("insufficient_stock_warning"), t("insufficient_stock_limit", { productName: product.name, quantity: product.quantity }));
                }
                return prev;
            }

            return { ...prev, [product.id]: newQty };
        });
    };

    const getSelectedItemCount = () => Object.keys(selectedItems).length;

    const calculateUnitCost = () => {
        let total = 0;
        Object.keys(selectedItems).forEach(pid => {
            const prod = products.find(p => p.id === pid);
            if (prod) {
                total += (prod.cost || 0) * selectedItems[pid];
            }
        });
        return total;
    };

    const handleNext = () => {
        if (getSelectedItemCount() === 0) {
            if (Platform.OS === 'web') {
                window.alert(t("select_at_least_one_component"));
            } else {
                Alert.alert(t("warning"), t("select_at_least_one_component"));
            }
            return;
        }
        setStep(1);
    };

    const handleBack = () => {
        setStep(0);
    };

    const handleScan = (data) => {
        setProductCode(data);
        setScannerVisible(false);
        toast.showToast && toast.showToast("Barkod okundu: " + data);
    };

    const handleComplete = async () => {
        if (!productName.trim()) {
            if (Platform.OS === 'web') window.alert(t("enter_product_name"));
            else Alert.alert(t("error"), t("enter_product_name"));
            return;
        }

        const prodQty = parseInt(productionQuantity, 10);
        if (isNaN(prodQty) || prodQty <= 0) {
            if (Platform.OS === 'web') window.alert(t("enter_valid_production_quantity"));
            else Alert.alert(t("error"), t("enter_valid_production_quantity"));
            return;
        }

        const unitCost = calculateUnitCost();

        // 1. Stok Kontrolü
        for (const pid of Object.keys(selectedItems)) {
            const qtyPerUnit = selectedItems[pid];
            const totalQtyNeeded = qtyPerUnit * prodQty;
            const prod = products.find(p => p.id === pid);

            if (!prod || (prod.quantity || 0) < totalQtyNeeded) {
                const msg = t("insufficient_stock_detail", {
                    productName: prod?.name || 'Ürün',
                    needed: totalQtyNeeded,
                    current: prod?.quantity || 0
                });
                if (Platform.OS === 'web') window.alert(t("insufficient_stock_warning") + ": " + msg);
                else Alert.alert(t("insufficient_stock_warning"), msg);
                return;
            }
        }

        // 2. Stoktan Düşme ve Ürün Ekleme
        try {
            for (const pid of Object.keys(selectedItems)) {
                const qtyPerUnit = selectedItems[pid];
                const totalQtyNeeded = qtyPerUnit * prodQty;
                const prod = products.find(p => p.id === pid);
                if (prod) {
                    const newQty = (prod.quantity || 0) - totalQtyNeeded;
                    await updateProduct({ ...prod, quantity: newQty });
                }
            }

            const componentListString = Object.keys(selectedItems).map(pid => {
                const p = products.find(prod => prod.id === pid);
                return `${p?.name} (x${selectedItems[pid]})`;
            }).join(', ');

            const finalDescription = description ? `${description}\n\nBileşenler: ${componentListString}` : `Bileşenler: ${componentListString}`;

            const newProduct = {
                name: productName.trim(),
                category: category.trim(),
                quantity: prodQty,
                cost: unitCost,
                price: parseFloat(salePrice) || 0,
                serialNumber: "",
                code: productCode.trim(),
                criticalStockLimit: parseInt(criticalLimit, 10) || 0,
                description: finalDescription
            };

            const success = await addProduct(newProduct, true);

            if (success) {
                toast.showToast && toast.showToast(t("production_completed", { productName, qty: prodQty }));
                triggerHaptic(HapticType.SUCCESS);
                requestStoreReview();
                navigation.navigate("MainTabs", { screen: 'Stok' });
            }
        } catch (error) {
            console.error("Assembly failed:", error);
            if (Platform.OS === 'web') window.alert("Hata oluştu.");
            else Alert.alert(t("error"), "Hata oluştu.");
        }
    };

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
                            <Text style={styles.qtyText}>{selectedQty}</Text>
                        </>
                    )}
                    <TouchableOpacity onPress={() => toggleItemSelection(item, 1)} style={[styles.qtyBtn, { backgroundColor: Colors.iosBlue }]}>
                        <Ionicons name="add" size={18} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <ImmersiveLayout
            title={step === 0 ? t("assembly_production") : t("product_production_details")}
            subtitle={step === 0 ? t("component_selection_unit") : productName}
            noScrollView={step === 0}
        >
            <View style={styles.innerContainer}>
                {step === 0 ? (
                    <View style={{ flex: 1 }}>
                        <View style={styles.searchBox}>
                            <Ionicons name="search" size={20} color={Colors.secondary} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder={t("search_component_placeholder")}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                selectTextOnFocus={Platform.OS === 'web'}
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery("")}>
                                    <Ionicons name="close-circle" size={18} color={Colors.secondary} />
                                </TouchableOpacity>
                            )}
                        </View>
                        <Text style={styles.stepNote}>{t("production_step_note")}</Text>

                        <FlatList
                            data={filteredProducts}
                            keyExtractor={item => item.id}
                            renderItem={renderProductItem}
                            contentContainerStyle={{ padding: 16 }}
                            ListEmptyComponent={<Text style={styles.emptyText}>{t("no_component_in_stock")}</Text>}
                        />

                        <View style={styles.footer}>
                            <View>
                                <Text style={styles.totalLabel}>{t("selected_items_count", { count: getSelectedItemCount() })}</Text>
                                <Text style={styles.totalCost}>{t("unit_cost_currency")}: {calculateUnitCost().toFixed(2)}₺</Text>
                            </View>
                            <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
                                <Text style={styles.nextBtnText}>{t("next")}</Text>
                                <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 4 }} />
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
                        <View style={styles.summaryBox}>
                            <Text style={styles.summaryTitle}>{t("total_estimated_cost")}</Text>
                            <Text style={styles.summaryCost}>
                                {(calculateUnitCost() * (parseInt(productionQuantity) || 1)).toFixed(2)} ₺
                            </Text>
                            <Text style={styles.summaryNote}>
                                {t("unit_cost_label", { cost: calculateUnitCost().toFixed(2) })}
                            </Text>
                        </View>

                        <Text style={styles.label}>{t("product_name_to_create")}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder={t("composite_product_placeholder")}
                            value={productName}
                            onChangeText={setProductName}
                            selectTextOnFocus={Platform.OS === 'web'}
                        />

                        <Text style={styles.label}>{t("category")}</Text>
                        <TextInput
                            style={styles.input}
                            value={category}
                            onChangeText={setCategory}
                            selectTextOnFocus={Platform.OS === 'web'}
                        />

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <View style={{ width: '48%' }}>
                                <Text style={styles.label}>{t("production_quantity")}</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="1"
                                    keyboardType="number-pad"
                                    value={productionQuantity}
                                    onChangeText={setProductionQuantity}
                                    selectTextOnFocus={Platform.OS === 'web'}
                                />
                            </View>
                            <View style={{ width: '48%' }}>
                                <Text style={styles.label}>{t("sales_price_currency")}</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="0.00"
                                    keyboardType="decimal-pad"
                                    value={salePrice}
                                    onChangeText={setSalePrice}
                                    selectTextOnFocus={Platform.OS === 'web'}
                                />
                            </View>
                        </View>

                        <Text style={styles.label}>{t("critical_stock_limit")}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="5"
                            keyboardType="number-pad"
                            value={criticalLimit}
                            onChangeText={setCriticalLimit}
                            selectTextOnFocus={Platform.OS === 'web'}
                        />

                        <Text style={styles.label}>{t("product_code_barcode_optional")}</Text>
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.inputWithIcon}
                                value={productCode}
                                onChangeText={setProductCode}
                                placeholder={t("barcode") || "Barkod"}
                                selectTextOnFocus={Platform.OS === 'web'}
                            />
                            <TouchableOpacity onPress={() => setScannerVisible(true)} style={styles.iconContainer}>
                                <Ionicons name="barcode-outline" size={24} color={Colors.iosBlue} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.actionRow}>
                            <TouchableOpacity style={styles.backActionBtn} onPress={handleBack}>
                                <Text style={styles.backActionText}>{t("back")}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.completeBtn} onPress={handleComplete}>
                                <Text style={styles.completeBtnText}>{t("complete_production_add_stock")}</Text>
                            </TouchableOpacity>
                        </View>

                    </ScrollView>
                )}
            </View>
            <BarcodeScannerModal visible={scannerVisible} onClose={() => setScannerVisible(false)} onScanned={handleScan} />
        </ImmersiveLayout>
    );
}

const styles = StyleSheet.create({
    innerContainer: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
        ...Platform.select({
            web: {
                minHeight: '80vh',
                borderWidth: 1,
                borderColor: '#E2E8F0',
            }
        })
    },
    searchBox: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F2F5F9",
        margin: 16,
        marginBottom: 8,
        paddingHorizontal: 12,
        borderRadius: 10,
        height: 48,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 15,
        color: Colors.textPrimary,
        height: '100%',
    },
    stepNote: {
        marginHorizontal: 16,
        marginBottom: 8,
        fontSize: 12,
        color: Colors.secondary,
        fontStyle: 'italic'
    },
    itemRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: "#F2F4F8",
    },
    itemName: {
        fontSize: 16,
        fontWeight: "600",
        color: Colors.textPrimary,
    },
    itemSub: {
        fontSize: 13,
        color: Colors.secondary,
        marginTop: 2,
    },
    qtyControl: {
        flexDirection: "row",
        alignItems: "center",
    },
    qtyBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#F2F5F9",
        justifyContent: "center",
        alignItems: "center",
        ...Platform.select({
            web: { cursor: 'pointer' }
        }),
    },
    qtyText: {
        marginHorizontal: 14,
        fontSize: 16,
        fontWeight: "700",
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: "#F2F4F8",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#fff",
    },
    totalLabel: {
        fontSize: 13,
        color: Colors.secondary,
    },
    totalCost: {
        fontSize: 18,
        fontWeight: "800",
        color: Colors.iosBlue,
    },
    nextBtn: {
        backgroundColor: Colors.iosBlue,
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 12,
        flexDirection: "row",
        alignItems: "center",
        ...Platform.select({
            web: { cursor: 'pointer' }
        }),
    },
    nextBtnText: {
        color: "#fff",
        fontWeight: "800",
        fontSize: 16,
    },
    emptyText: {
        textAlign: "center",
        marginTop: 60,
        color: Colors.secondary,
        fontSize: 15,
    },
    summaryBox: {
        backgroundColor: "#F0F9FF",
        padding: 20,
        borderRadius: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: "#BAE6FD",
        alignItems: "center",
    },
    summaryTitle: {
        fontSize: 15,
        color: Colors.iosBlue,
        fontWeight: "600",
    },
    summaryCost: {
        fontSize: 32,
        fontWeight: "900",
        color: Colors.iosBlue,
        marginVertical: 4,
    },
    summaryNote: {
        fontSize: 13,
        color: Colors.secondary,
    },
    label: {
        fontSize: 14,
        fontWeight: "700",
        color: Colors.textPrimary,
        marginBottom: 8,
        marginTop: 16,
    },
    input: {
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        backgroundColor: "#fff",
        color: Colors.textPrimary,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: "#fff",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    inputWithIcon: {
        flex: 1,
        padding: 14,
        fontSize: 16,
        color: Colors.textPrimary,
    },
    iconContainer: {
        padding: 10,
    },
    actionRow: {
        flexDirection: 'row',
        marginTop: 40,
        justifyContent: 'space-between'
    },
    backActionBtn: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        width: '30%',
        alignItems: 'center'
    },
    backActionText: {
        fontWeight: '700',
        color: Colors.secondary
    },
    completeBtn: {
        backgroundColor: Colors.iosGreen,
        padding: 16,
        borderRadius: 12,
        alignItems: "center",
        width: '65%',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        ...Platform.select({
            web: { cursor: 'pointer' }
        }),
    },
    completeBtnText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "800",
    }
});
