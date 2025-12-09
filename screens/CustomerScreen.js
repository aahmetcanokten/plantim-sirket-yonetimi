import React, { useContext, useState, useMemo } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, Modal, Alert, StyleSheet, Platform, Linking } from "react-native";
import ImmersiveLayout from "../components/ImmersiveLayout";
import { Colors, CardRadius, ButtonRadius, IOSShadow } from "../Theme";
import { AppContext } from "../AppContext";
import KeyboardSafeView from "../components/KeyboardSafeView";
import { Ionicons } from "@expo/vector-icons";
import { SkeletonCustomerItem } from "../components/Skeleton";


// --- Müşteri Ekleme/Düzenleme Modalı ---
const CustomerFormModal = ({ visible, onClose, onSave, initialData = null }) => {
    const [companyName, setCompanyName] = useState(initialData?.companyName || initialData?.name || "");
    const [contactName, setContactName] = useState(initialData?.contactName || "");
    const [phone, setPhone] = useState(initialData?.phone || "");
    const [email, setEmail] = useState(initialData?.email || "");
    const [cariCode, setCariCode] = useState(initialData?.cariCode || "");

    React.useEffect(() => {
        if (visible) {
            setCompanyName(initialData?.companyName || initialData?.name || "");
            setContactName(initialData?.contactName || "");
            setPhone(initialData?.phone || "");
            setEmail(initialData?.email || "");
            setCariCode(initialData?.cariCode || "");
        }
    }, [visible, initialData]);

    const handleSave = () => {
        if (!companyName.trim() || !contactName.trim() || !phone.trim() || !email.trim() || !cariCode.trim()) {
            Alert.alert("Eksik Bilgi", "Lütfen tüm alanları eksiksiz doldurunuz. Tüm alanlar zorunludur.");
            return;
        }

        const customerData = {
            ...(initialData?.id && { id: initialData.id }),
            companyName: companyName.trim(),
            contactName: contactName.trim(),
            name: companyName.trim(),
            phone: phone.trim(),
            email: email.trim(),
            cariCode: cariCode.trim()
        };

        onSave(customerData);
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <KeyboardSafeView offsetIOS={20}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeaderRow}>
                        <Text style={styles.modalHeaderTitle}>
                            {initialData ? "Müşteri Düzenle" : "Yeni Müşteri Kartı"}
                        </Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={28} color={Colors.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.formContent}>
                        <Text style={styles.inputLabel}>Firma Ünvanı <Text style={styles.requiredStar}>*</Text></Text>
                        <TextInput style={styles.input} value={companyName} onChangeText={setCompanyName} placeholder="Örn: ABC Teknoloji A.Ş." />

                        <Text style={styles.inputLabel}>Yetkili Kişi <Text style={styles.requiredStar}>*</Text></Text>
                        <TextInput style={styles.input} value={contactName} onChangeText={setContactName} placeholder="Örn: Ahmet Yılmaz" />

                        <Text style={styles.inputLabel}>Telefon <Text style={styles.requiredStar}>*</Text></Text>
                        <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="Örn: 0555 123 45 67" />

                        <Text style={styles.inputLabel}>E-posta <Text style={styles.requiredStar}>*</Text></Text>
                        <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="Örn: info@abcteknoloji.com" />

                        <Text style={styles.inputLabel}>Cari Kodu <Text style={styles.requiredStar}>*</Text></Text>
                        <TextInput style={styles.input} value={cariCode} onChangeText={setCariCode} autoCapitalize="characters" placeholder="Örn: M-001" />

                        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                            <Text style={styles.saveButtonText}>Kaydet</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardSafeView>
        </Modal>
    );
};

const CustomerListItem = ({ item, onEdit, onDelete, orderCount }) => (
    <View style={customerListStyles.itemContainer}>
        <View style={customerListStyles.headerRow}>
            <Text style={customerListStyles.companyName}>{item.companyName || item.name}</Text>
            {orderCount > 0 && (
                <View style={customerListStyles.orderBadge}>
                    <Ionicons name="receipt-outline" size={12} color="#fff" />
                    <Text style={customerListStyles.orderBadgeText}>{orderCount} Sipariş</Text>
                </View>
            )}
        </View>
        <View style={customerListStyles.contactPersonRow}>
            <Ionicons name="person-outline" size={14} color={Colors.textPrimary} />
            <Text style={customerListStyles.contactPersonText}>{item.contactName || "Yetkili Belirtilmedi"}</Text>
        </View>
        <View style={customerListStyles.divider} />

        <View style={customerListStyles.infoRow}>
            {/* TELEFON / ARA BUTONU */}
            <TouchableOpacity
                style={[customerListStyles.infoItem, { backgroundColor: '#F0F9FF', padding: 8, borderRadius: 8, marginRight: 12, flex: 0, minWidth: 155, borderWidth: 1, borderColor: '#BAE6FD' }]}
                onPress={() => {
                    if (item.phone) {
                        Linking.openURL(`tel:${item.phone}`);
                    } else {
                        Alert.alert("Bilgi", "Telefon numarası kayıtlı değil.");
                    }
                }}
            >
                <Ionicons name="call" size={16} color={Colors.iosBlue} />
                <Text numberOfLines={1} style={[customerListStyles.infoText, { color: Colors.iosBlue, fontWeight: '700', flex: 1, fontSize: 10 }]}>{item.phone || "-"}</Text>
                {item.phone && <Ionicons name="chevron-forward" size={14} color={Colors.iosBlue} style={{ marginLeft: 4 }} />}
            </TouchableOpacity>

            {/* EMAIL */}
            <View style={[customerListStyles.infoItem, { flex: 1, paddingLeft: 4 }]}>
                <Ionicons name="mail" size={16} color={Colors.secondary} />
                <Text style={[customerListStyles.infoText, { color: Colors.textPrimary }]} numberOfLines={1} ellipsizeMode="tail">{item.email || "-"}</Text>
            </View>
        </View>

        <View style={customerListStyles.footerRow}>
            <View style={customerListStyles.cariCodeContainer}>
                <Text style={customerListStyles.cariCodeLabel}>Cari Kod:</Text>
                <Text style={customerListStyles.cariCodeValue}>{item.cariCode || "-"}</Text>
            </View>
            <View style={customerListStyles.actionButtons}>
                <TouchableOpacity onPress={() => onEdit(item)} style={[customerListStyles.iconButton, { backgroundColor: '#F0F9FF' }]}>
                    <Ionicons name="create-outline" size={18} color={Colors.iosBlue} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onDelete(item.id, item.companyName || item.name)} style={[customerListStyles.iconButton, { backgroundColor: '#FFF5F5' }]}>
                    <Ionicons name="trash-outline" size={18} color={Colors.critical} />
                </TouchableOpacity>
            </View>
        </View>
    </View>
);

export default function CustomerScreen() {
    const { customers, addCustomer, updateCustomer, deleteCustomer, sales, isPremium, appDataLoading } = useContext(AppContext);

    const [searchQuery, setSearchQuery] = useState("");
    const [sortAsc, setSortAsc] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);

    const getOrderCount = (customerId) => {
        if (!sales) return 0;
        return sales.filter(sale => sale.customerId === customerId).length;
    };

    const filteredCustomers = useMemo(() => {
        let result = [...customers];
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(c =>
                (c.companyName && c.companyName.toLowerCase().includes(q)) ||
                (c.name && c.name.toLowerCase().includes(q)) ||
                (c.contactName && c.contactName.toLowerCase().includes(q)) ||
                (c.cariCode && c.cariCode.toLowerCase().includes(q))
            );
        }
        result.sort((a, b) => {
            const nameA = a.companyName || a.name || "";
            const nameB = b.companyName || b.name || "";
            return sortAsc ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
        });
        return result;
    }, [customers, searchQuery, sortAsc]);

    const handleOpenAddModal = () => {
        setEditingCustomer(null);
        setModalVisible(true);
    };

    const handleOpenEditModal = (customer) => {
        setEditingCustomer(customer);
        setModalVisible(true);
    };

    const handleSaveCustomer = async (customerData) => {
        let success = false;
        if (editingCustomer) {
            success = await updateCustomer(customerData);
        } else {
            success = await addCustomer(customerData);
        }

        if (success) {
            setModalVisible(false);
            setEditingCustomer(null);
        }
    };

    const confirmDelete = (id, nameVal) => {
        Alert.alert("Silme Onayı", `${nameVal} müşterisini silmek istediğinizden emin misiniz?`, [
            { text: "İptal", style: "cancel" },
            { text: "Sil", style: "destructive", onPress: () => deleteCustomer(id) }
        ]);
    };

    return (
        <ImmersiveLayout title="Müşteri Rehberi" subtitle={`${filteredCustomers.length} kayıt`}>

            <View style={styles.filterContainer}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color={Colors.secondary} style={{ marginRight: 8 }} />
                    <TextInput
                        placeholder="Firma, yetkili veya cari kod ara..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        style={styles.searchInput}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery("")}>
                            <Ionicons name="close-circle" size={18} color={Colors.secondary} />
                        </TouchableOpacity>
                    )}
                </View>
                <TouchableOpacity style={styles.sortButton} onPress={() => setSortAsc(!sortAsc)}>
                    <Ionicons name={sortAsc ? "arrow-down-outline" : "arrow-up-outline"} size={20} color={Colors.iosBlue} />
                </TouchableOpacity>
            </View>

            {appDataLoading ? (
                <View style={styles.listContentContainer}>
                    {[1, 2, 3, 4, 5].map((key) => (
                        <SkeletonCustomerItem key={key} />
                    ))}
                </View>
            ) : (
                <FlatList
                    data={filteredCustomers}
                    keyExtractor={(i) => i.id}
                    renderItem={({ item }) => (
                        <CustomerListItem
                            item={item}
                            onEdit={handleOpenEditModal}
                            onDelete={confirmDelete}
                            orderCount={getOrderCount(item.id)}
                        />
                    )}
                    contentContainerStyle={styles.listContentContainer}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="people-outline" size={50} color={Colors.secondary} />
                            <Text style={styles.emptyStateText}>
                                {searchQuery ? "Arama kriterlerine uygun müşteri bulunamadı." : "Henüz kayıtlı müşteri yok."}
                            </Text>
                        </View>
                    }
                />
            )}

            <TouchableOpacity style={styles.fab} onPress={handleOpenAddModal} activeOpacity={0.9}>
                <Ionicons name="person-add" size={24} color="#fff" />
                <Text style={styles.fabText}>Yeni Müşteri</Text>
            </TouchableOpacity>

            <CustomerFormModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                onSave={handleSaveCustomer}
                initialData={editingCustomer}
            />

            {/* REKLAM ALANI */}


        </ImmersiveLayout>
    );
}

const styles = StyleSheet.create({
    filterContainer: {
        flexDirection: 'row',
        marginBottom: 16,
        alignItems: 'center',
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#fff',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 46,
        borderRadius: 12,
        marginRight: 10,
        ...IOSShadow,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: Colors.textPrimary,
    },
    sortButton: {
        width: 46,
        height: 46,
        backgroundColor: '#fff',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        ...IOSShadow,
    },
    listContentContainer: {
        paddingBottom: 100,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
        opacity: 0.6,
    },
    emptyStateText: {
        marginTop: 15,
        fontSize: 16,
        color: Colors.secondary,
        textAlign: 'center',
    },
    fab: {
        position: 'absolute',
        bottom: 25,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.iosBlue,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 30,
        shadowColor: Colors.iosBlue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 6,
    },
    fabText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
        marginLeft: 8,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    modalHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'android' ? 20 : 20,
        paddingBottom: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    modalHeaderTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: Colors.textPrimary,
    },
    closeButton: {
        padding: 5,
    },
    formContent: {
        padding: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: 8,
        marginTop: 16,
    },
    requiredStar: {
        color: Colors.critical,
    },
    input: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E6E9EE',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 14,
        fontSize: 16,
        color: Colors.textPrimary,
    },
    saveButton: {
        backgroundColor: Colors.iosBlue,
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        marginTop: 30,
        ...IOSShadow,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '800',
    },
});

const customerListStyles = StyleSheet.create({
    itemContainer: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        ...IOSShadow,
        borderWidth: 1,
        borderColor: '#F8FAFC',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 6,
    },
    companyName: {
        fontSize: 17,
        fontWeight: '800',
        color: Colors.textPrimary,
        flex: 1,
    },
    orderBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.iosGreen,
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 8,
        marginLeft: 8,
    },
    orderBadgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
        marginLeft: 4,
    },
    contactPersonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    contactPersonText: {
        fontSize: 14,
        color: Colors.textPrimary,
        marginLeft: 6,
        fontWeight: '500',
    },
    divider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginBottom: 12,
    },
    infoRow: {
        flexDirection: 'row',
        marginBottom: 12,
        alignItems: 'center', // Hizalama düzeltildi
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        // marginRight: 20, // Kaldırıldı, inline style'da yönetiliyor
        // flex: 1, // Kaldırıldı, inline style'da yönetiliyor
    },
    infoText: {
        marginLeft: 8,
        fontSize: 13,
        color: '#555',
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
    },
    cariCodeContainer: {
        flexDirection: 'row',
    },
    cariCodeLabel: {
        fontSize: 13,
        color: Colors.secondary,
        fontWeight: '600',
    },
    cariCodeValue: {
        fontSize: 13,
        color: Colors.textPrimary,
        fontWeight: '800',
        marginLeft: 6,
    },
    actionButtons: {
        flexDirection: 'row',
    },
    iconButton: {
        padding: 8,
        borderRadius: 8,
        marginLeft: 8,
    },
});