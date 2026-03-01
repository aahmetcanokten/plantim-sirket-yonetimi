import React from "react";
import {
    View,
    Text,
    Modal,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../Theme";
import { useTranslation } from "react-i18next";

export default function SaleDetailsModal({ visible, sale, onClose }) {
    const { t } = useTranslation();

    if (!sale || !visible) return null;

    // Let's parse components if it's a composite sale
    let isComposite = false;
    let components = [];
    if (sale.description && sale.description.startsWith("Bileşenler: ")) {
        isComposite = true;
        const compsStr = sale.description.substring(12);
        // compsStr format: "Product A (x2), Product B (x1)"
        const parts = compsStr.split(", ");
        components = parts.map((part) => {
            const match = part.match(/(.*)\s+\(x(\d+)\)$/);
            if (match) {
                return { name: match[1], qty: parseInt(match[2], 10) };
            }
            return { name: part, qty: 1 };
        });
    }

    const renderWeb = () => (
        <View style={webStyles.backdrop}>
            <View style={webStyles.panel}>
                {/* HEADER */}
                <View style={webStyles.header}>
                    <View style={webStyles.headerLeft}>
                        <View style={webStyles.headerIcon}>
                            <Ionicons name="receipt-outline" size={20} color="#fff" />
                        </View>
                        <View>
                            <Text style={webStyles.headerTitle}>{t("sale_details") || 'Sipariş Detayları'}</Text>
                            <Text style={webStyles.headerSub}>{sale.productName}</Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={onClose} style={webStyles.closeBtn}>
                        <Ionicons name="close" size={22} color="#64748B" />
                    </TouchableOpacity>
                </View>

                {/* BODY */}
                <ScrollView style={webStyles.body} showsVerticalScrollIndicator={false}>
                    <View style={webStyles.infoGrid}>
                        <View style={webStyles.infoBox}>
                            <Text style={webStyles.infoLabel}>{t("customer") || 'Müşteri'}</Text>
                            <Text style={webStyles.infoValue}>{sale.customerName}</Text>
                        </View>
                        <View style={webStyles.infoBox}>
                            <Text style={webStyles.infoLabel}>{t("date") || 'Tarih'}</Text>
                            <Text style={webStyles.infoValue}>{new Date(sale.dateISO).toLocaleString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
                        </View>
                        <View style={webStyles.infoBox}>
                            <Text style={webStyles.infoLabel}>{t("total_price") || 'Toplam Tutar'}</Text>
                            <Text style={[webStyles.infoValue, { color: Colors.iosBlue }]}>
                                {Number(sale.price || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                            </Text>
                        </View>
                        <View style={webStyles.infoBox}>
                            <Text style={webStyles.infoLabel}>{t("status") || 'Durum'}</Text>
                            <Text style={[webStyles.infoValue, { color: sale.isShipped ? Colors.iosGreen : Colors.warning }]}>
                                {sale.isShipped ? (t('shipped') || 'Sevk Edildi') : (t('waiting_shipment') || 'Bekliyor')}
                            </Text>
                        </View>
                    </View>

                    <View style={webStyles.section}>
                        <Text style={webStyles.sectionTitle}>{t('order_contents') || 'Sipariş İçeriği'}</Text>
                        {isComposite && components.length > 0 ? (
                            <View style={webStyles.componentsTable}>
                                <View style={webStyles.compTableHeader}>
                                    <Text style={[webStyles.compTableCol, { flex: 3 }]}>{t("product_name") || 'Ürün Adı'}</Text>
                                    <Text style={[webStyles.compTableCol, { flex: 1, textAlign: 'center' }]}>{t("quantity") || 'Miktar'}</Text>
                                </View>
                                {components.map((c, i) => (
                                    <View key={i} style={[webStyles.compTableRow, i % 2 === 0 ? webStyles.compTableRowEven : webStyles.compTableRowOdd]}>
                                        <Text style={[webStyles.compTableCell, { flex: 3 }]}>{c.name}</Text>
                                        <View style={{ flex: 1, alignItems: 'center' }}>
                                            <View style={webStyles.qtyBadge}>
                                                <Text style={webStyles.qtyBadgeText}>x{c.qty}</Text>
                                            </View>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        ) : (
                            <View style={webStyles.singleItemBox}>
                                <Ionicons name="cube-outline" size={32} color={Colors.iosBlue} style={{ marginBottom: 8 }} />
                                <Text style={webStyles.singleItemName}>{sale.productName}</Text>
                                <Text style={webStyles.singleItemQty}>{t('quantity')}: {sale.quantity}</Text>
                                {sale.description && sale.description !== 'Standart Satış' && (
                                    <Text style={webStyles.singleItemDesc}>{sale.description}</Text>
                                )}
                            </View>
                        )}
                    </View>
                </ScrollView>
            </View>
        </View>
    );

    const renderMobile = () => (
        <View style={mobileStyles.overlay}>
            <View style={mobileStyles.container}>
                <View style={mobileStyles.header}>
                    <Text style={mobileStyles.title}>{t("sale_details") || 'Sipariş Detayları'}</Text>
                    <TouchableOpacity onPress={onClose} style={mobileStyles.closeBtn}>
                        <Ionicons name="close" size={24} color={Colors.textPrimary} />
                    </TouchableOpacity>
                </View>

                <ScrollView style={mobileStyles.body} showsVerticalScrollIndicator={false}>
                    <View style={mobileStyles.infoCard}>
                        <Text style={mobileStyles.productTitle}>{sale.productName}</Text>
                        <Text style={mobileStyles.customerText}>{t("customer")}: {sale.customerName}</Text>

                        <View style={mobileStyles.priceRow}>
                            <Text style={mobileStyles.priceText}>{Number(sale.price || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</Text>
                            <View style={[mobileStyles.statusBadge, { backgroundColor: sale.isShipped ? '#E8F5E9' : '#FFF3E0' }]}>
                                <Text style={[mobileStyles.statusText, { color: sale.isShipped ? Colors.iosGreen : '#E65100' }]}>
                                    {sale.isShipped ? (t('shipped') || 'Sevk Edildi') : (t('waiting_shipment') || 'Bekliyor')}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <Text style={mobileStyles.sectionTitle}>{t('order_contents') || 'Sipariş İçeriği'}</Text>

                    {isComposite && components.length > 0 ? (
                        <View style={mobileStyles.componentsList}>
                            {components.map((c, i) => (
                                <View key={i} style={mobileStyles.compRow}>
                                    <Text style={mobileStyles.compName}>{c.name}</Text>
                                    <View style={mobileStyles.qtyBadge}>
                                        <Text style={mobileStyles.qtyBadgeText}>x{c.qty}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <View style={mobileStyles.singleItemCard}>
                            <Ionicons name="cube-outline" size={24} color={Colors.iosBlue} style={{ marginRight: 12 }} />
                            <View style={{ flex: 1 }}>
                                <Text style={mobileStyles.singleItemName}>{sale.productName}</Text>
                                {sale.description && sale.description !== 'Standart Satış' && (
                                    <Text style={mobileStyles.singleItemDesc}>{sale.description}</Text>
                                )}
                            </View>
                            <View style={mobileStyles.qtyBadge}>
                                <Text style={mobileStyles.qtyBadgeText}>x{sale.quantity}</Text>
                            </View>
                        </View>
                    )}
                </ScrollView>
            </View>
        </View>
    );

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            {Platform.OS === 'web' ? renderWeb() : renderMobile()}
        </Modal>
    );
}

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
        maxWidth: 600,
        maxHeight: '80%',
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
        backgroundColor: Colors.iosBlue,
        justifyContent: 'center', alignItems: 'center',
        marginRight: 12,
    },
    headerTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A' },
    headerSub: { fontSize: 13, color: '#64748B', marginTop: 1 },
    closeBtn: {
        width: 34, height: 34, borderRadius: 8,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center', alignItems: 'center',
        cursor: 'pointer',
    },
    body: {
        padding: 24,
    },
    infoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 20,
    },
    infoBox: {
        width: '50%',
        marginBottom: 16,
    },
    infoLabel: {
        fontSize: 12,
        color: '#64748B',
        marginBottom: 4,
        fontWeight: '600',
    },
    infoValue: {
        fontSize: 14,
        color: '#1E293B',
        fontWeight: '700',
    },
    section: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        paddingBottom: 8,
    },
    componentsTable: {
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 8,
        overflow: 'hidden',
    },
    compTableHeader: {
        flexDirection: 'row',
        backgroundColor: '#F8FAFC',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    compTableCol: {
        fontSize: 12,
        fontWeight: '700',
        color: '#475569',
    },
    compTableRow: {
        flexDirection: 'row',
        paddingVertical: 10,
        paddingHorizontal: 12,
        alignItems: 'center',
    },
    compTableRowEven: {
        backgroundColor: '#fff',
    },
    compTableRowOdd: {
        backgroundColor: '#F8FAFC',
    },
    compTableCell: {
        fontSize: 13,
        color: '#1E293B',
        fontWeight: '500',
    },
    qtyBadge: {
        backgroundColor: '#EEF2FF',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    qtyBadgeText: {
        color: Colors.iosBlue,
        fontWeight: '700',
        fontSize: 12,
    },
    singleItemBox: {
        alignItems: 'center',
        padding: 24,
        backgroundColor: '#F8FAFC',
        borderRadius: 8,
    },
    singleItemName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 4,
    },
    singleItemQty: {
        fontSize: 14,
        color: Colors.iosBlue,
        fontWeight: '600',
        marginBottom: 8,
    },
    singleItemDesc: {
        fontSize: 13,
        color: '#64748B',
        textAlign: 'center',
    },
});

const mobileStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: '#F8FAFC',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: '75%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
    },
    closeBtn: {
        position: 'absolute',
        right: 16,
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        borderRadius: 16,
    },
    body: {
        padding: 16,
    },
    infoCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    productTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 4,
    },
    customerText: {
        fontSize: 14,
        color: '#64748B',
        marginBottom: 12,
    },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        paddingTop: 12,
    },
    priceText: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.iosBlue,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '700',
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 12,
        marginLeft: 4,
    },
    componentsList: {
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
        marginBottom: 40,
    },
    compRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    compName: {
        fontSize: 14,
        color: '#1E293B',
        flex: 1,
        fontWeight: '500',
    },
    qtyBadge: {
        backgroundColor: '#EEF2FF',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginLeft: 12,
    },
    qtyBadgeText: {
        color: Colors.iosBlue,
        fontWeight: '700',
        fontSize: 12,
    },
    singleItemCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
        marginBottom: 40,
    },
    singleItemName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1E293B',
    },
    singleItemDesc: {
        fontSize: 13,
        color: '#64748B',
        marginTop: 4,
    },
});
