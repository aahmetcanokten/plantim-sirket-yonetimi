// Gelişmiş AnalyticsScreen.js — Yeni Genel Bakış, Detaylı Listeler ve Aylık Raporlar

import React, { useContext, useMemo, useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from "react-native";
import ImmersiveLayout from "../components/ImmersiveLayout";
import { AppContext } from "../AppContext";
import { Colors } from "../Theme";
import { BarChart, PieChart } from "react-native-chart-kit";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

const screenWidth = Dimensions.get("window").width;

// Grafik için rastgele renkler yerine sabit, uyumlu bir palet
const CHART_COLORS = [
    "#4C6EF5", "#22B8CF", "#37B24D", "#FAB005", "#FD7E14", "#F03E3E", "#7048E8"
];

export default function AnalyticsScreen() {
    const { sales, products } = useContext(AppContext);
    const { t } = useTranslation();
    // Raporlanacak ayın seçimi için state (Varsayılan: Bugünün tarihi)
    const [selectedDate, setSelectedDate] = useState(new Date());
    // Görünüm modu: 'overview' (Genel Bakış) veya 'detailed' (Detaylı Rapor)
    const [viewMode, setViewMode] = useState("overview");

    // Ay değiştirme fonksiyonları
    const prevMonth = () => {
        setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1));
    };
    const nextMonth = () => {
        setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1));
    };

    // Kar hesaplama fonksiyonu
    const calculateProfit = useCallback((sale) => {
        const productDetail = products.find(p => p.id === sale.productId);
        const cost = sale.cost ?? productDetail?.cost ?? 0;
        const price = sale.price ?? 0;
        const qty = sale.quantity ?? 1;

        return {
            revenue: price * qty,
            cost: cost * qty,
            profit: (price - cost) * qty
        };
    }, [products]);

    // --- YENİ GENEL BAKIŞ VERİLERİ (Tüm Zamanlar) ---
    const overviewPageData = useMemo(() => {
        const productAggregates = {}; // { productName: { revenue, profit, quantity } }
        const customerAggregates = {}; // { customerName: { revenue, sales: [] } }

        let totalRevenue = 0;
        let totalProfit = 0;
        let totalSalesCount = 0; // Toplam satış adedi

        sales.forEach(sale => {
            const metrics = calculateProfit(sale);
            const qty = sale.quantity ?? 1;

            // Genel Toplamlar
            totalRevenue += metrics.revenue;
            totalProfit += metrics.profit;
            totalSalesCount += qty;

            // 1. Ürün Bazlı Toplamlar (Req 1 & 2)
            const productName = sale.productName || "Bilinmeyen Ürün";
            if (!productAggregates[productName]) {
                productAggregates[productName] = { revenue: 0, profit: 0, quantity: 0 };
            }
            productAggregates[productName].revenue += metrics.revenue;
            productAggregates[productName].profit += metrics.profit;
            productAggregates[productName].quantity += qty;

            // 2. Müşteri Bazlı Toplamlar (Req 3)
            const customerName = sale.customerName || "Bilinmeyen Müşteri";
            if (!customerAggregates[customerName]) {
                customerAggregates[customerName] = { revenue: 0, sales: [] };
            }
            customerAggregates[customerName].revenue += metrics.revenue;
            customerAggregates[customerName].sales.push(sale);
        });

        // --- Req 1 & 2 Verisi: Ürün Performans Listesi ---
        const productList = Object.keys(productAggregates)
            .map(name => ({
                name,
                ...productAggregates[name]
            }))
            .sort((a, b) => b.profit - a.profit); // Kara göre sırala

        // --- Req 4 Verisi: Genel Analiz Kutucukları ---
        const summaryMetrics = {
            totalRevenue,
            totalProfit,
            totalSalesCount,
            profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0
        };

        // --- Req 3 Verisi: Müşteri-Ürün İlişkisi ---
        const top5Customers = Object.keys(customerAggregates)
            .map(name => ({
                name,
                revenue: customerAggregates[name].revenue,
                sales: customerAggregates[name].sales
            }))
            .sort((a, b) => b.revenue - a.revenue) // Ciroya göre sırala
            .slice(0, 5);

        const customerProductRelations = top5Customers.map(customer => {
            const productCounts = {}; // { productName: quantity }
            customer.sales.forEach(sale => {
                const qty = sale.quantity ?? 1;
                const prodName = sale.productName || "Bilinmeyen Ürün";
                if (!productCounts[prodName]) productCounts[prodName] = 0;
                productCounts[prodName] += qty;
            });

            const top3Products = Object.keys(productCounts)
                .map(name => ({ name, quantity: productCounts[name] }))
                .sort((a, b) => b.quantity - a.quantity) // Adete göre sırala
                .slice(0, 3);

            return {
                customerName: customer.name,
                customerRevenue: customer.revenue,
                topProducts: top3Products // [{ name, quantity }]
            };
        });

        return {
            productList,
            summaryMetrics,
            customerProductRelations
        };
    }, [sales, products, calculateProfit]);


    // --- SEÇİLİ AY İÇİN DETAYLI VERİLER (Eski Kısım) ---
    const monthlyDetails = useMemo(() => {
        // Seçili aydaki satışları filtrele
        const filteredSales = sales.filter(sale => {
            const d = new Date(sale.dateISO);
            return d.getFullYear() === selectedDate.getFullYear() && d.getMonth() === selectedDate.getMonth();
        });

        let totalRevenue = 0;
        let totalProfit = 0;
        const customerStats = {};
        const productStats = {};

        filteredSales.forEach(sale => {
            const metrics = calculateProfit(sale);
            totalRevenue += metrics.revenue;
            totalProfit += metrics.profit;

            // Müşteri bazlı ciro
            const customerName = sale.customerName || "Bilinmeyen Müşteri";
            if (!customerStats[customerName]) customerStats[customerName] = 0;
            customerStats[customerName] += metrics.revenue;

            // Ürün bazlı kar
            const productName = sale.productName || "Bilinmeyen Ürün";
            if (!productStats[productName]) productStats[productName] = 0;
            productStats[productName] += metrics.profit;
        });

        // Pasta grafikleri için veriyi formatla (İlk 5)
        const topCustomers = Object.keys(customerStats)
            .map(name => ({ name, total: customerStats[name] }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5)
            .map((item, index) => ({
                name: item.name,
                population: item.total,
                color: CHART_COLORS[index % CHART_COLORS.length],
                legendFontColor: "#7F7F7F",
                legendFontSize: 12
            }));

        const topProducts = Object.keys(productStats)
            .map(name => ({ name, total: productStats[name] }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5)
            .map((item, index) => ({
                name: item.name,
                population: item.total,
                color: CHART_COLORS[(index + 2) % CHART_COLORS.length], // Renkleri kaydır
                legendFontColor: "#7F7F7F",
                legendFontSize: 12
            }));

        return {
            totalRevenue,
            totalProfit,
            topCustomers,
            topProducts,
            salesCount: filteredSales.length
        };
    }, [sales, selectedDate, calculateProfit]);


    // Metrik Kutucuk Bileşeni
    const MetricCard = ({ title, value, color, icon }) => (
        <View style={[styles.metricCard, { borderLeftColor: color }]}>
            <View style={styles.metricHeader}>
                <Text style={styles.metricTitle}>{title}</Text>
                {icon && <Ionicons name={icon} size={16} color={Colors.secondary} />}
            </View>
            <Text style={[styles.metricValue, { color: color }]}>{value}</Text>
        </View>
    );

    return (
        <ImmersiveLayout title={t('analytics')} subtitle={t('analytics_subtitle')}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>

                {/* Görünüm Modu Seçimi (Tablar) */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tabButton, viewMode === 'overview' && styles.tabActive]}
                        onPress={() => setViewMode('overview')}
                    >
                        <Text style={[styles.tabText, viewMode === 'overview' && styles.tabTextActive]}>{t('analytics_overview')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tabButton, viewMode === 'detailed' && styles.tabActive]}
                        onPress={() => setViewMode('detailed')}
                    >
                        <Text style={[styles.tabText, viewMode === 'detailed' && styles.tabTextActive]}>{t('analytics_monthly_detail')}</Text>
                    </TouchableOpacity>
                </View>

                {viewMode === 'overview' ? (
                    // --- YENİ GENEL BAKIŞ MODU ---
                    <View>
                        {/* 1. Genel Analiz (Req 4) */}
                        <Text style={styles.sectionTitle}>{t('analytics_general_analysis')}</Text>
                        <View style={styles.metricsGrid}>
                            <MetricCard
                                title={t('analytics_total_revenue')}
                                value={`${overviewPageData.summaryMetrics.totalRevenue.toLocaleString('tr-TR')} ₺`}
                                color={Colors.iosBlue}
                                icon="cash-outline"
                            />
                            <MetricCard
                                title={t('analytics_total_profit')}
                                value={`${overviewPageData.summaryMetrics.totalProfit.toLocaleString('tr-TR')} ₺`}
                                color={Colors.iosGreen}
                                icon="trending-up-outline"
                            />
                        </View>
                        <View style={styles.metricsGrid}>
                            <MetricCard
                                title={t('analytics_total_sales')}
                                value={`${overviewPageData.summaryMetrics.totalSalesCount} ${t('quantity_short')}`}
                                color={Colors.primary}
                                icon="cart-outline"
                            />
                            <MetricCard
                                title={t('analytics_profit_margin')}
                                value={`%${overviewPageData.summaryMetrics.profitMargin.toFixed(1)}`}
                                color={Colors.warning}
                                icon="pie-chart-outline"
                            />
                        </View>

                        {/* 2. Müşteri-Ürün İlişkisi (Req 3) */}
                        <Text style={styles.sectionTitle}>{t('analytics_top_customers')}</Text>
                        <View style={styles.listContainer}>
                            {overviewPageData.customerProductRelations.length > 0 ?
                                overviewPageData.customerProductRelations.map((item) => (
                                    <View key={item.customerName} style={styles.customerRelationCard}>
                                        <View style={styles.customerRelationHeader}>
                                            <Text style={styles.customerRelationName}>{item.customerName}</Text>
                                            <Text style={styles.customerRelationRevenue}>{item.customerRevenue.toLocaleString('tr-TR')} ₺</Text>
                                        </View>
                                        <View style={styles.customerRelationBody}>
                                            {item.topProducts.length > 0 ? (
                                                item.topProducts.map(prod => (
                                                    <Text key={prod.name} style={styles.customerRelationProduct}>
                                                        - {prod.name} ({prod.quantity} {t('quantity_short')})
                                                    </Text>
                                                ))
                                            ) : (
                                                <Text style={styles.customerRelationProduct}>{t('analytics_no_customer_purchases')}</Text>
                                            )}
                                        </View>
                                    </View>
                                )) : (
                                    <Text style={styles.noDataText}>{t('analytics_insufficient_customer_data')}</Text>
                                )}
                        </View>

                        {/* 3. Ürün Performans Listesi (Req 1 & 2) */}
                        <Text style={styles.sectionTitle}>{t('analytics_product_performance')}</Text>
                        <View style={[styles.listContainer, { paddingHorizontal: 0, paddingVertical: 0 }]}>
                            {/* Liste Başlığı */}
                            <View style={[styles.productListItem, styles.productListHeader]}>
                                <Text style={[styles.productListName, styles.productListHeaderText]}>{t('product_name')}</Text>
                                <Text style={[styles.productListMetrics, styles.productListHeaderText, { flex: 0.5 }]}>{t('quantity_short')}</Text>
                                <Text style={[styles.productListMetrics, styles.productListHeaderText]}>{t('revenue')}</Text>
                                <Text style={[styles.productListMetrics, styles.productListHeaderText]}>{t('profit')}</Text>
                            </View>

                            {/* Ürünler - Kaydırılabilir */}
                            <ScrollView style={{ maxHeight: 400 }}>
                                {overviewPageData.productList.length > 0 ?
                                    overviewPageData.productList.map((product) => (
                                        <View key={product.name} style={styles.productListItem}>
                                            <Text style={styles.productListName}>{product.name}</Text>
                                            <Text style={[styles.productListMetrics, { flex: 0.5 }]}>{product.quantity}</Text>
                                            <Text style={styles.productListMetrics}>{product.revenue.toLocaleString('tr-TR')} ₺</Text>
                                            <Text style={[styles.productListMetrics, { color: product.profit >= 0 ? Colors.iosGreen : Colors.danger }]}>
                                                {product.profit.toLocaleString('tr-TR')} ₺
                                            </Text>
                                        </View>
                                    )) : (
                                        <Text style={styles.noDataText}>{t('analytics_insufficient_product_data')}</Text>
                                    )}
                            </ScrollView>
                        </View>
                    </View>
                ) : (
                    // --- DETAYLI RAPOR MODU ---
                    <View>
                        {/* Ay Seçici */}
                        <View style={styles.monthSelector}>
                            <TouchableOpacity onPress={prevMonth} style={styles.monthNavBtn}>
                                <Ionicons name="chevron-back" size={24} color={Colors.iosBlue} />
                            </TouchableOpacity>
                            <Text style={styles.monthTitle}>
                                {selectedDate.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
                            </Text>
                            <TouchableOpacity onPress={nextMonth} style={styles.monthNavBtn}>
                                <Ionicons name="chevron-forward" size={24} color={Colors.iosBlue} />
                            </TouchableOpacity>
                        </View>

                        {/* Aylık Özet Metrikler */}
                        <View style={styles.metricsGrid}>
                            <MetricCard
                                title={t('analytics_monthly_revenue')}
                                value={`${monthlyDetails.totalRevenue.toLocaleString('tr-TR')} ₺`}
                                color={Colors.iosBlue}
                                icon="cash-outline"
                            />
                            <MetricCard
                                title={t('analytics_monthly_net_profit')}
                                value={`${monthlyDetails.totalProfit.toLocaleString('tr-TR')} ₺`}
                                color={Colors.iosGreen}
                                icon="trending-up-outline"
                            />
                        </View>
                        <View style={styles.metricsGrid}>
                            <MetricCard
                                title={t('analytics_total_sales')}
                                value={`${monthlyDetails.salesCount} ${t('quantity_short')}`}
                                color={Colors.primary}
                                icon="cart-outline"
                            />
                            <MetricCard
                                title={t('analytics_profit_margin')}
                                value={`%${monthlyDetails.totalRevenue > 0 ? ((monthlyDetails.totalProfit / monthlyDetails.totalRevenue) * 100).toFixed(1) : 0}`}
                                color={Colors.warning}
                                icon="pie-chart-outline"
                            />
                        </View>

                        {/* Pasta Grafik 1: Müşteri Bazlı Ciro */}
                        <View style={styles.pieChartCard}>
                            <Text style={styles.chartTitle}>{t('analytics_top_5_customers')}</Text>
                            {monthlyDetails.topCustomers.length > 0 ? (
                                <PieChart
                                    data={monthlyDetails.topCustomers}
                                    width={screenWidth - 40}
                                    height={220}
                                    chartConfig={chartConfig}
                                    accessor={"population"}
                                    backgroundColor={"transparent"}
                                    paddingLeft={"15"}
                                    absolute // Değerleri mutlak göster
                                />
                            ) : (
                                <Text style={styles.noDataText}>{t('analytics_no_sales_this_month')}</Text>
                            )}
                        </View>

                        {/* Pasta Grafik 2: Ürün Bazlı Karlılık */}
                        <View style={styles.pieChartCard}>
                            <Text style={styles.chartTitle}>{t('analytics_top_5_products')}</Text>
                            {monthlyDetails.topProducts.length > 0 ? (
                                <PieChart
                                    data={monthlyDetails.topProducts}
                                    width={screenWidth - 40}
                                    height={220}
                                    chartConfig={chartConfig}
                                    accessor={"population"}
                                    backgroundColor={"transparent"}
                                    paddingLeft={"15"}
                                    absolute
                                />
                            ) : (
                                <Text style={styles.noDataText}>{t('analytics_no_sales_this_month')}</Text>
                            )}
                        </View>

                    </View>
                )}

            </ScrollView>
        </ImmersiveLayout>
    );
}

const chartConfig = {
    backgroundColor: "#fff",
    backgroundGradientFrom: "#fff",
    backgroundGradientTo: "#fff",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    barPercentage: 0.7,
    propsForLabels: { fontSize: 11, fontWeight: "600" },
};

const styles = StyleSheet.create({
    sectionTitle: {
        fontWeight: "800",
        fontSize: 18,
        marginBottom: 15,
        marginTop: 10, // Bölümler arasına boşluk eklendi
        color: Colors.textPrimary,
    },
    // Tab Stilleri
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
        padding: 4,
        marginBottom: 20,
    },
    tabButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: 'center',
    },
    tabActive: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    tabText: {
        fontWeight: '600',
        color: Colors.secondary,
        fontSize: 14,
    },
    tabTextActive: {
        color: Colors.iosBlue,
        fontWeight: '700',
    },
    // Ay Seçici
    monthSelector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 10,
        borderRadius: 12,
        marginBottom: 15,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    monthTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: Colors.iosBlue,
    },
    monthNavBtn: {
        padding: 8,
        backgroundColor: '#F8FAFC',
        borderRadius: 8,
    },
    // Metrik Izgarası
    metricsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    metricCard: {
        flex: 1,
        backgroundColor: "#fff",
        padding: 15,
        borderRadius: 16,
        marginHorizontal: 5,
        borderLeftWidth: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    metricHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    metricTitle: {
        fontSize: 12,
        color: Colors.secondary,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    metricValue: {
        fontSize: 17,
        fontWeight: '900',
    },
    // Grafik Kartları (Eski)
    chartScroll: {
        marginHorizontal: -20, // Ekran kenarlarına taşması için
        paddingHorizontal: 20,
    },
    chart: {
        borderRadius: 16,
        marginVertical: 8,
    },
    legendContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 20,
    },
    legendItem: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 5,
    },
    legendText: {
        fontSize: 14,
        color: Colors.secondary,
        fontWeight: '600',
    },
    // Pasta Grafik Kartları (Detay Sekmesi)
    pieChartCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 15,
        marginTop: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
        alignItems: 'center', // Grafiği ortala
    },
    chartTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: Colors.textPrimary,
        marginBottom: 10,
        alignSelf: 'flex-start',
    },
    noDataText: {
        color: Colors.secondary,
        fontStyle: 'italic',
        marginVertical: 20,
        textAlign: 'center',
    },

    // --- YENİ EKLENEN STİLLER (Genel Bakış) ---
    listContainer: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
        marginBottom: 20,
        overflow: 'hidden', // Kaydırma için
    },
    // Ürün Performans Listesi
    productListItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 10, // listContainer'dan gelen paddingi dengele
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        alignItems: 'center',
    },
    productListHeader: {
        borderBottomWidth: 2,
        borderBottomColor: '#E2E8F0',
        paddingVertical: 10,
        backgroundColor: '#F8FAFC',
    },
    productListName: {
        flex: 1.5,
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textPrimary,
        paddingRight: 5,
    },
    productListMetrics: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
        color: Colors.secondary,
        textAlign: 'right',
        paddingHorizontal: 2,
    },
    productListHeaderText: {
        color: Colors.iosBlue,
        fontWeight: '800',
        fontSize: 11,
        textTransform: 'uppercase',
    },
    // Müşteri-Ürün İlişkisi
    customerRelationCard: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 15,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    customerRelationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        paddingBottom: 8,
        marginBottom: 8,
    },
    customerRelationName: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.textPrimary,
        flex: 1, // Uzun isimlerin sığması için
    },
    customerRelationRevenue: {
        fontSize: 15,
        fontWeight: '800',
        color: Colors.iosBlue,
        marginLeft: 10,
    },
    customerRelationBody: {
        //
    },
    customerRelationProduct: {
        fontSize: 14,
        color: Colors.secondary,
        lineHeight: 20,
    }
});