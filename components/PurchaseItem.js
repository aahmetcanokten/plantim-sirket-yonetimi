import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Colors, IOSShadow, CardRadius } from "../Theme";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";


/*
  PurchaseItem (Yenilenmiş Tasarım)
  - Daha temiz bir kart yapısı
  - Durum ikonları (Gecikmiş, Teslim Edilmiş, Bekliyor)
  - Aksiyon butonları için ikon bazlı yaklaşım
*/
export default function PurchaseItem({ item, onDeliver, onEdit, onDelete }) {
    const { t } = useTranslation();
    const isDelivered = !!item.delivered;
    const expectedDateVal = item.expectedDateISO || item.expected_date;
    const expectedDate = expectedDateVal ? new Date(expectedDateVal) : null;

    // Gecikme kontrolü: Bugünün tarihinden önceyse ve teslim edilmediyse gecikmiştir.
    const now = new Date();
    // Sadece tarih kısmını karşılaştırmak için saatleri sıfırlayalım
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const expDateOnly = expectedDate ? new Date(expectedDate.getFullYear(), expectedDate.getMonth(), expectedDate.getDate()) : null;

    const isOverdue = !isDelivered && expDateOnly && expDateOnly < today;

    // Durum belirteci
    // Durum belirteci
    let statusIconName = "time-outline";
    let statusColor = Colors.secondary;
    let statusText = t("status_waiting") || "Bekliyor"; // Fallback eklendi

    if (isDelivered) {
        statusIconName = "checkmark-circle";
        statusColor = Colors.iosGreen;
        statusText = t("status_delivered") || "Teslim Edildi";
    } else if (isOverdue) {
        statusIconName = "alert-circle";
        statusColor = Colors.critical;
        statusText = t("status_overdue") || "Gecikmiş";
    } else {
        statusText = t("status_waiting") || "Bekliyor";
    }

    return (
        <View style={[styles.container, isOverdue && styles.overdueContainer]}>

            {/* Sol Taraf: Durum İkonu */}
            <View style={styles.statusColumn}>
                <Ionicons name={statusIconName} size={24} color={statusColor} />
            </View>

            {/* Orta Kısım: Bilgiler */}
            <View style={styles.infoColumn}>
                <Text style={styles.title} numberOfLines={1}>
                    {item.productName || item.product_name}
                </Text>
                {item.model ? <Text style={styles.modelText}>{item.model}</Text> : null}

                <View style={[styles.detailRow, { justifyContent: 'space-between', paddingRight: 8 }]}>
                    <Text style={styles.detailText}>
                        <Text style={{ fontWeight: '600' }}>{item.quantity} {t("pcs")}</Text> x {Number(item.unitCost || item.unit_cost || item.cost || 0).toFixed(2)} ₺
                    </Text>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: statusColor }}>{statusText}</Text>
                </View>

                <View style={styles.detailRow}>
                    <Ionicons name="calendar-outline" size={12} color={Colors.secondary} style={{ marginRight: 4 }} />
                    <Text style={[styles.dateText, isOverdue && styles.overdueText]}>
                        {isDelivered
                            ? `${t("delivered_label")} ${new Date(item.delivered_date || item.deliveredDateISO || Date.now()).toLocaleDateString()}`
                            : (expectedDate ? `${t("expected_label")} ${expectedDate.toLocaleDateString()}` : t("no_date"))
                        }
                    </Text>
                </View>

                {item.supplier ? (
                    <Text style={styles.supplierText} numberOfLines={1}>
                        {t("supplier_label")} {item.supplier}
                    </Text>
                ) : null}
            </View>

            {/* Sağ Taraf: Aksiyonlar */}
            <View style={styles.actionsColumn}>
                {!isDelivered && (
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.deliverBtn]}
                        onPress={() => onDeliver(item)}
                    >
                        <Ionicons name="cube-outline" size={16} color="#fff" />
                        <Text style={styles.deliverBtnText}>{t("deliver_action")}</Text>
                    </TouchableOpacity>
                )}

                {isDelivered && (
                    <View style={styles.deliveredBadge}>
                        <Text style={styles.deliveredBadgeText}>{t("completed_badge")}</Text>
                    </View>
                )}

                <View style={styles.miniActionsRow}>
                    <TouchableOpacity style={[styles.miniActionBtn, styles.editBtn]} onPress={() => onEdit(item)}>
                        <Ionicons name="create-outline" size={16} color={Colors.iosBlue} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.miniActionBtn, styles.deleteBtn]} onPress={() => onDelete(item.id)}>
                        <Ionicons name="trash-outline" size={16} color={Colors.critical} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: "#fff",
        borderRadius: 16, // Daha yuvarlak köşeler
        padding: 12,
        marginBottom: 12,
        flexDirection: "row",
        ...IOSShadow, // Gölge efekti
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    overdueContainer: {
        borderColor: Colors.critical,
        backgroundColor: '#FFF5F5', // Hafif kırmızı arka plan
    },
    statusColumn: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingRight: 12,
        borderRightWidth: 1,
        borderRightColor: '#F1F5F9',
    },
    infoColumn: {
        flex: 1,
        paddingHorizontal: 12,
        justifyContent: 'center',
    },
    title: {
        fontWeight: "800",
        fontSize: 15,
        color: Colors.textPrimary,
        marginBottom: 2,
    },
    modelText: {
        fontSize: 13,
        color: Colors.secondary,
        marginBottom: 6,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    detailText: {
        fontSize: 13,
        color: "#333",
    },
    dateText: {
        fontSize: 12,
        color: Colors.secondary,
    },
    overdueText: {
        color: Colors.critical,
        fontWeight: '600',
    },
    supplierText: {
        fontSize: 11,
        color: Colors.secondary,
        fontStyle: 'italic',
        marginTop: 4,
    },
    actionsColumn: {
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        paddingLeft: 8,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 8,
        marginBottom: 8,
    },
    deliverBtn: {
        backgroundColor: Colors.iosGreen,
    },
    deliverBtnText: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 12,
        marginLeft: 4,
    },
    deliveredBadge: {
        backgroundColor: '#E6F4EA',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 6,
        marginBottom: 8,
    },
    deliveredBadgeText: {
        color: Colors.iosGreen,
        fontSize: 10,
        fontWeight: '800',
    },
    miniActionsRow: {
        flexDirection: 'row',
    },
    miniActionBtn: {
        padding: 6,
        marginLeft: 8,
        backgroundColor: '#F8FAFC',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    editBtn: {
        // Özel stil gerekirse
    },
    deleteBtn: {
        borderColor: '#FECACA', // Hafif kırmızı kenarlık
        backgroundColor: '#FFF5F5',
    },
});