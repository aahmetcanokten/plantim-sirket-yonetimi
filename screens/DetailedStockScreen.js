// Detaylı Stok Analiz Ekranı - Maliyet ve Kâr Odaklı Görünüm

import React, { useContext, useMemo, useState } from "react";
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
} from "react-native";
import ImmersiveLayout from "../components/ImmersiveLayout"; // Mevcut bileşenlerden biri
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../Theme"; // Mevcut tema yapınızdan
import { AppContext } from "../AppContext"; // Mevcut Context yapınızdan

import { useTranslation } from "react-i18next"; // Mevcut Context yapınızdan

// --- Yardımcı İşlevler ---
const formatCurrency = (amount) => {
    // Para birimi formatlama (2 ondalık basamak)
    return Number(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

// --- Bileşen Başlangıcı ---
export default function DetailedStockScreen({ navigation }) {
    const { products } = useContext(AppContext);
    const { t } = useTranslation();

    // --- State Yönetimi ---
    const [filterCategory, setFilterCategory] = useState("Hepsi");

    // --- Gelişmiş Stok Analizi Hesaplamaları ---
    const analysisData = useMemo(() => {
        let totalCostValue = 0; // Toplam Maliyet Değeri
        let totalSalesValue = 0; // Toplam Potansiyel Satış Değeri
        let totalPotentialProfit = 0; // Toplam Potansiyel Kâr

        // Ürün listesini detaylı analiz için zenginleştir
        const detailedProducts = products.map(product => {
            const quantity = product.quantity || 0;
            const cost = parseFloat(product.cost) || 0;
            const price = parseFloat(product.price) || 0;
            const criticalLimit = product.criticalStockLimit ?? 0; // YENİ: Kritik Limit alındı

            const profitPerItem = price - cost;
            const totalStockCost = quantity * cost;
            const totalStockSales = quantity * price;
            const totalStockProfit = quantity * profitPerItem;

            totalCostValue += totalStockCost;
            totalSalesValue += totalStockSales;
            totalPotentialProfit += totalStockProfit;

            // YENİ: Kritik Stok Durumu
            const isCritical = quantity > 0 && quantity <= criticalLimit;


            return {
                ...product,
                profitPerItem: profitPerItem,
                totalStockCost: totalStockCost,
                totalStockSales: totalStockSales,
                totalStockProfit: totalStockProfit,
                isCritical: isCritical,
                criticalLimit: criticalLimit,
            };
        });

        // Kategorileri Çıkar
        const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

        return {
            detailedProducts,
            categories,
            totalCostValue,
            totalSalesValue,
            totalPotentialProfit,
        };
    }, [products]);

    // --- Filtrelenmiş Ürünler ---
    const filteredProducts = useMemo(() => {
        if (filterCategory === "Hepsi") {
            return analysisData.detailedProducts;
        }
        return analysisData.detailedProducts.filter(p => p.category === filterCategory);
    }, [analysisData.detailedProducts, filterCategory]);

    // --- Ana Metrik Kartı Bileşeni ---
    const MetricCard = ({ title, value, color, iconName }) => (
        <View style={styles.metricCard}>
            <Ionicons name={iconName} size={24} color={color} />
            <Text style={styles.metricTitle}>{title}</Text>
            <Text style={[styles.metricValue, { color }]}>{formatCurrency(value)} ₺</Text>
        </View>
    );

    // --- Detaylı Liste Öğesi Bileşeni ---
    const renderDetailedItem = ({ item }) => {
        const profitColor = item.totalStockProfit >= 0 ? Colors.profit : Colors.critical;
        const profitIcon = item.totalStockProfit >= 0 ? "trending-up-outline" : "trending-down-outline";

        return (
            <View style={styles.detailedItem}>
                {/* Ürün Adı ve Kategori */}
                <View style={styles.itemHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <Text style={styles.itemCategory}>{item.brand ? `${item.brand} / ` : ''}{item.category || t("unspecified")}</Text>
                    </View>
                </View>

                {/* Detay Satırları */}
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t("stock_quantity_label")}:</Text>
                    <Text style={[styles.detailValue, item.isCritical && { color: Colors.warning, fontWeight: '800' }]}>
                        {item.quantity || 0} {t(item.unit || 'uom_pcs')} {item.isCritical && `(${t("critical_limit")}: ${item.criticalLimit})`}
                    </Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t("unit_cost")}:</Text>
                    <Text style={styles.detailValue}>{formatCurrency(item.cost || 0)} ₺</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t("unit_sales_price")}:</Text>
                    <Text style={styles.detailValue}>{formatCurrency(item.price || 0)} ₺</Text>
                </View>

                <View style={styles.divider} />

                <View style={[styles.detailRow, { marginTop: 5 }]}>
                    <Text style={[styles.detailLabel, { fontWeight: '700' }]}>{t("total_stock_cost")}:</Text>
                    <Text style={[styles.detailValue, { fontWeight: '700', color: Colors.secondary }]}>{formatCurrency(item.totalStockCost)} ₺</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { fontWeight: '700' }]}>{t("potential_profit_stock")}:</Text>
                    <View style={styles.profitBadge}>
                        <Ionicons name={profitIcon} size={14} color={profitColor} style={{ marginRight: 4 }} />
                        <Text style={[styles.detailValue, { color: profitColor, fontWeight: '800' }]}>{formatCurrency(item.totalStockProfit)} ₺</Text>
                    </View>
                </View>
            </View>
        );
    };

    // --- Görünüm (Return) ---
    return (
        <ImmersiveLayout
            title={t("detailed_stock_analysis")}
            subtitle={t("stock_analysis_subtitle")}
        >
            <ScrollView style={styles.container}>

                {/* Genel Metrikler */}
                <Text style={styles.sectionTitle}>{t("general_stock_metrics")}</Text>
                <View style={styles.metricsContainer}>
                    <MetricCard
                        title={t("total_cost_value")}
                        value={analysisData.totalCostValue}
                        color={Colors.secondary}
                        iconName="wallet-outline"
                    />
                    <MetricCard
                        title={t("potential_sales_value")}
                        value={analysisData.totalSalesValue}
                        color={Colors.iosBlue}
                        iconName="cash-outline"
                    />
                    <MetricCard
                        title={t("total_potential_profit")}
                        value={analysisData.totalPotentialProfit}
                        color={analysisData.totalPotentialProfit >= 0 ? Colors.profit : Colors.critical}
                        iconName="trending-up-outline"
                    />
                </View>

                {/* Kategori Filtresi */}
                <Text style={styles.sectionTitle}>{t("filter_by_category")}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryFilterContainer}>
                    {["Hepsi", ...analysisData.categories].map(category => (
                        <TouchableOpacity
                            key={category}
                            style={[
                                styles.categoryButton,
                                filterCategory === category && styles.categoryButtonActive
                            ]}
                            onPress={() => setFilterCategory(category)}
                        >
                            <Text style={[
                                styles.categoryButtonText,
                                filterCategory === category && styles.categoryButtonActiveText
                            ]}>
                                {category}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>


                {/* Detaylı Ürün Listesi */}
                <Text style={styles.sectionTitle}>
                    {t("detailed_product_list")} ({filteredProducts.length})
                </Text>

                <FlatList
                    data={filteredProducts}
                    keyExtractor={(i) => i.id}
                    renderItem={renderDetailedItem}
                    scrollEnabled={false} // Ana ScrollView içinde olduğu için FlatList'i kaydırmaz
                    ListEmptyComponent={<Text style={styles.emptyListText}>{t("no_products_for_analysis")}</Text>}
                />

            </ScrollView>
        </ImmersiveLayout>
    );
}

// --- Stil Tanımları ---
const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        paddingTop: 10,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: Colors.textPrimary,
        marginTop: 15,
        marginBottom: 10,
    },
    // --- Metrik Kartları ---
    metricsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    metricCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 15,
        marginBottom: 10,
        width: '48%', // İkişerli hizalama için
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    metricTitle: {
        fontSize: 12,
        color: Colors.secondary,
        marginTop: 5,
        textAlign: 'center',
    },
    metricValue: {
        fontSize: 18,
        fontWeight: '900',
        marginTop: 4,
        textAlign: 'center',
    },
    // --- Kategori Filtresi ---
    categoryFilterContainer: {
        marginBottom: 15,
        paddingVertical: 5,
    },
    categoryButton: {
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 10,
        backgroundColor: '#F3F5F9',
    },
    categoryButtonActive: {
        backgroundColor: Colors.iosBlue,
    },
    categoryButtonText: {
        fontWeight: '600',
        fontSize: 13,
        color: Colors.secondary,
    },
    categoryButtonActiveText: {
        color: '#fff',
        fontWeight: '700',
    },
    // --- Detaylı Liste Öğesi ---
    detailedItem: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 15,
        marginBottom: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F5',
        paddingBottom: 8,
        marginBottom: 8,
    },
    itemName: {
        fontSize: 16,
        fontWeight: '800',
        color: Colors.primary,
        flex: 1,
    },
    itemCategory: {
        fontSize: 12,
        color: Colors.secondary,
        fontStyle: 'italic',
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 3,
    },
    detailLabel: {
        fontSize: 14,
        color: Colors.textPrimary,
        fontWeight: '500',
    },
    detailValue: {
        fontSize: 14,
        color: Colors.textPrimary,
        fontWeight: '600',
    },
    divider: {
        height: 1,
        backgroundColor: '#EAEAEA',
        marginVertical: 8,
    },
    profitBadge: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    emptyListText: {
        textAlign: "center",
        marginTop: 20,
        color: Colors.secondary,
        fontStyle: "italic",
    },
});