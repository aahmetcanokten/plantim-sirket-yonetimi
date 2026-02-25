import React, { useContext, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { View, Text, TextInput, TouchableOpacity, FlatList, Modal, Alert, StyleSheet, Platform, Linking, ScrollView, Dimensions } from "react-native";
import ImmersiveLayout from "../components/ImmersiveLayout";
import { Colors, CardRadius, ButtonRadius, IOSShadow } from "../Theme";
import { AppContext } from "../AppContext";
import { useToast } from "../components/ToastProvider";
import KeyboardSafeView from "../components/KeyboardSafeView";
import { Ionicons } from "@expo/vector-icons";
import { SkeletonCustomerItem } from "../components/Skeleton";


// --- Müşteri Ekleme/Düzenleme Modalı ---
const CustomerFormModal = ({ visible, onClose, onSave, initialData = null }) => {
    const { t } = useTranslation();
    const [companyName, setCompanyName] = useState(initialData?.companyName || initialData?.name || "");
    const [contactName, setContactName] = useState(initialData?.contactName || "");
    const [phone, setPhone] = useState(initialData?.phone || "");
    const [email, setEmail] = useState(initialData?.email || "");
    const [cariCode, setCariCode] = useState(initialData?.cariCode || "");
    const [address, setAddress] = useState(initialData?.address || "");
    const [taxOffice, setTaxOffice] = useState(initialData?.taxOffice || "");
    const [taxNumber, setTaxNumber] = useState(initialData?.taxNumber || "");

    React.useEffect(() => {
        if (visible) {
            setCompanyName(initialData?.companyName || initialData?.name || "");
            setContactName(initialData?.contactName || "");
            setPhone(initialData?.phone || "");
            setEmail(initialData?.email || "");
            setCariCode(initialData?.cariCode || "");
            setAddress(initialData?.address || "");
            setTaxOffice(initialData?.taxOffice || "");
            setTaxNumber(initialData?.taxNumber || "");
        }
    }, [visible, initialData]);

    const handleSave = () => {
        if (!companyName.trim() || !contactName.trim() || !phone.trim()) {
            Alert.alert(t('missing_info'), t('fill_required_fields'));
            return;
        }

        const customerData = {
            ...(initialData?.id && { id: initialData.id }),
            companyName: companyName.trim(),
            contactName: contactName.trim(),
            name: companyName.trim(),
            phone: phone.trim(),
            email: email.trim(),
            cariCode: cariCode.trim(),
            address: address.trim(),
            taxOffice: taxOffice.trim(),
            taxNumber: taxNumber.trim()
        };

        onSave(customerData);
    };

    return (
        <Modal
            visible={visible}
            animationType={Platform.OS === 'web' ? "fade" : "slide"}
            presentationStyle={Platform.OS === 'web' ? "overFullScreen" : "pageSheet"}
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.webModalOverlay}>
                <View style={styles.webModalWrapper}>
                    <KeyboardSafeView offsetIOS={20} disableScrollView={Platform.OS === 'web'}>
                        <View style={[styles.modalContainer, Platform.OS === 'web' && styles.webModalContainer]}>
                            <View style={styles.modalHeaderRow}>
                                <Text style={styles.modalHeaderTitle}>{initialData ? t('edit_customer') : t('new_customer_card')}</Text>
                                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                    <Ionicons name="close" size={28} color={Colors.textPrimary} />
                                </TouchableOpacity>
                            </View>
                            <ScrollView contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false}>
                                {/* ŞİRKET BİLGİLERİ */}
                                <View style={styles.formSection}>
                                    <Text style={styles.sectionTitle}>{t('company_info')}</Text>
                                    <Text style={styles.inputLabel}>{t('company_title')} <Text style={styles.requiredStar}>*</Text></Text>
                                    <TextInput style={styles.input} value={companyName} onChangeText={setCompanyName} placeholder={t('example_company')} selectTextOnFocus={Platform.OS === 'web'} />

                                    <Text style={styles.inputLabel}>{t('cari_code')}</Text>
                                    <TextInput style={styles.input} value={cariCode} onChangeText={setCariCode} autoCapitalize="characters" placeholder={t('example_code')} selectTextOnFocus={Platform.OS === 'web'} />
                                </View>

                                {/* İLETİŞİM BİLGİLERİ */}
                                <View style={styles.formSection}>
                                    <Text style={styles.sectionTitle}>{t('contact_person')}</Text>
                                    <Text style={styles.inputLabel}>{t('contact_person')} <Text style={styles.requiredStar}>*</Text></Text>
                                    <TextInput style={styles.input} value={contactName} onChangeText={setContactName} placeholder={t('example_name')} selectTextOnFocus={Platform.OS === 'web'} />

                                    <View style={styles.inputRow}>
                                        <View style={{ flex: 1, marginRight: 8 }}>
                                            <Text style={styles.inputLabel}>{t('phone')} <Text style={styles.requiredStar}>*</Text></Text>
                                            <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder={t('example_phone')} selectTextOnFocus={Platform.OS === 'web'} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.inputLabel}>{t('email')}</Text>
                                            <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder={t('example_email')} selectTextOnFocus={Platform.OS === 'web'} />
                                        </View>
                                    </View>

                                    <Text style={styles.inputLabel}>{t('address')}</Text>
                                    <TextInput style={[styles.input, { height: 80 }]} value={address} onChangeText={setAddress} multiline placeholder={t('example_address')} selectTextOnFocus={Platform.OS === 'web'} />
                                </View>

                                {/* VERGİ BİLGİLERİ */}
                                <View style={styles.formSection}>
                                    <Text style={styles.sectionTitle}>{t('tax_info') || 'Vergi Bilgileri'}</Text>
                                    <View style={styles.inputRow}>
                                        <View style={{ flex: 1, marginRight: 8 }}>
                                            <Text style={styles.inputLabel}>{t('tax_office')}</Text>
                                            <TextInput style={styles.input} value={taxOffice} onChangeText={setTaxOffice} placeholder={t('example_tax_office')} selectTextOnFocus={Platform.OS === 'web'} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.inputLabel}>{t('tax_number')}</Text>
                                            <TextInput style={styles.input} value={taxNumber} onChangeText={setTaxNumber} keyboardType="number-pad" placeholder={t('example_tax_number')} selectTextOnFocus={Platform.OS === 'web'} />
                                        </View>
                                    </View>
                                </View>

                                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                                    <Text style={styles.saveButtonText}>{t('save')}</Text>
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    </KeyboardSafeView>
                </View>
            </View>
        </Modal>
    );
};

const CustomerListItem = ({ item, onEdit, onDelete, orderCount }) => {
    const { t } = useTranslation();
    return (
        <View style={customerListStyles.card}>
            {/* Üst Kısım: Başlık ve Rozetler */}
            <View style={customerListStyles.cardHeader}>
                <View style={customerListStyles.headerLeft}>
                    <View style={customerListStyles.titleRow}>
                        <Text style={customerListStyles.cardTitle} numberOfLines={1}>{item.companyName || item.name}</Text>
                    </View>
                    <View style={customerListStyles.subTitleRow}>
                        {item.contactName && (
                            <View style={customerListStyles.categoryBadge}>
                                <Ionicons name="person-outline" size={10} color={Colors.secondary} style={{ marginRight: 3 }} />
                                <Text style={customerListStyles.categoryText}>{item.contactName}</Text>
                            </View>
                        )}
                        {item.cariCode && (
                            <View style={customerListStyles.codeBadge}>
                                <Ionicons name="barcode-outline" size={10} color={Colors.secondary} style={{ marginRight: 3 }} />
                                <Text style={customerListStyles.codeText}>{item.cariCode}</Text>
                            </View>
                        )}
                    </View>
                </View>
                {orderCount > 0 && (
                    <View style={[customerListStyles.statusBadge, { backgroundColor: '#F0FDF4', borderColor: '#DCFCE7' }]}>
                        <View style={[customerListStyles.statusDot, { backgroundColor: Colors.profit }]} />
                        <Text style={[customerListStyles.statusText, { color: Colors.profit }]}>{orderCount} {t('order')}</Text>
                    </View>
                )}
            </View>

            <View style={customerListStyles.divider} />

            {/* Orta Kısım: İletişim Bilgileri (Grid benzeri yapı) */}
            <View style={customerListStyles.cardBody}>
                <View style={customerListStyles.metricsRow}>
                    <TouchableOpacity
                        style={[customerListStyles.metricItem, { flexDirection: 'row', alignItems: 'center' }]}
                        onPress={() => {
                            if (item.phone) {
                                Linking.openURL(`tel:${item.phone}`);
                            } else {
                                Alert.alert(t('info'), t('phone_not_registered'));
                            }
                        }}
                    >
                        <View style={[customerListStyles.iconContainer, { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD', borderWidth: 1 }]}>
                            <Ionicons name="call" size={14} color={Colors.iosBlue} />
                        </View>
                        <View style={{ marginLeft: 8, flex: 1 }}>
                            <Text style={customerListStyles.metricLabel}>{t('phone')}</Text>
                            <Text style={[customerListStyles.metricValueSmall, { color: Colors.iosBlue }]} numberOfLines={1}>{item.phone || "-"}</Text>
                        </View>
                    </TouchableOpacity>

                    <View style={customerListStyles.metricDivider} />

                    <View style={[customerListStyles.metricItem, { flexDirection: 'row', alignItems: 'center' }]}>
                        <View style={[customerListStyles.iconContainer, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0', borderWidth: 1 }]}>
                            <Ionicons name="mail" size={14} color={Colors.secondary} />
                        </View>
                        <View style={{ marginLeft: 8, flex: 1 }}>
                            <Text style={customerListStyles.metricLabel}>{t('email')}</Text>
                            <Text style={customerListStyles.metricValueSmall} numberOfLines={1} ellipsizeMode={'tail'}>{item.email || "-"}</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Alt Kısım: Aksiyonlar */}
            <View style={customerListStyles.cardActions}>
                <TouchableOpacity style={[customerListStyles.actionBtn, customerListStyles.editBtn]} onPress={() => onEdit(item)}>
                    <Ionicons name="create-outline" size={16} color={Colors.iosBlue} />
                    <Text style={customerListStyles.editBtnText}>{t('edit')}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={customerListStyles.deleteIconBtn} onPress={() => onDelete(item.id, item.companyName || item.name)}>
                    <Ionicons name="trash-outline" size={18} color={Colors.critical} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const SortButton = ({ title, currentSort, targetSort, onPress }) => (
    <TouchableOpacity style={[styles.sortButtonDetailed, currentSort === targetSort && styles.sortButtonDetailedActive]} onPress={() => onPress(targetSort)}>
        <Text style={[styles.sortButtonDetailedText, currentSort === targetSort && styles.sortButtonDetailedActiveText]}>{title}</Text>
    </TouchableOpacity>
);

export default function CustomerScreen() {
    const { customers, addCustomer, updateCustomer, deleteCustomer, sales, isPremium, appDataLoading } = useContext(AppContext);
    const { t } = useTranslation();
    const { showToast } = useToast();

    const [searchQuery, setSearchQuery] = useState("");
    const [sortOption, setSortOption] = useState("nameAZ");
    const [modalVisible, setModalVisible] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);

    const stats = useMemo(() => {
        const total = customers.length;
        const totalOrders = sales ? sales.length : 0;
        const activeCustCount = sales ? new Set(sales.map(s => s.customerId)).size : 0;
        return { total, totalOrders, activeCustCount };
    }, [customers, sales]);

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
            if (sortOption === "nameAZ") return nameA.localeCompare(nameB);
            if (sortOption === "nameZA") return nameB.localeCompare(nameA);
            if (sortOption === "cariAZ") return (a.cariCode || "").localeCompare(b.cariCode || "");
            return 0;
        });
        return result;
    }, [customers, searchQuery, sortOption]);

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
            showToast(t('success'));
        }
    };

    const confirmDelete = (id, nameVal) => {
        if (Platform.OS === 'web') {
            if (window.confirm(`${nameVal} ${t('delete_customer_confirmation')}`)) {
                deleteCustomer(id);
                showToast(t('success'));
            }
        } else {
            Alert.alert(t('delete_confirmation'), `${nameVal} ${t('delete_customer_confirmation')}`, [
                { text: t('cancel'), style: "cancel" },
                { text: t('delete'), style: "destructive", onPress: () => deleteCustomer(id) }
            ]);
        }
    };

    return (
        <ImmersiveLayout title={t('customer_directory')} subtitle={t('record_count', { count: filteredCustomers.length })}>

            {/* İSTATİSTİK KARTLARI */}
            <View style={styles.statsContainer}>
                <View style={[styles.statCard, { borderLeftColor: Colors.iosBlue }]}>
                    <Text style={styles.statLabel}>{t('all')}</Text>
                    <Text style={styles.statValue}>{stats.total}</Text>
                </View>
                <View style={[styles.statCard, { borderLeftColor: Colors.iosGreen }]}>
                    <Text style={styles.statLabel}>{t('total_orders')}</Text>
                    <Text style={[styles.statValue, { color: Colors.iosGreen }]}>{stats.totalOrders}</Text>
                </View>
                <View style={[styles.statCard, { borderLeftColor: Colors.warning }]}>
                    <Text style={styles.statLabel}>{t('active_sales')}</Text>
                    <Text style={[styles.statValue, { color: Colors.warning }]}>{stats.activeCustCount}</Text>
                </View>
            </View>

            <View style={styles.filterContainer}>
                <View style={styles.searchBar}>
                    <Ionicons name="search-outline" size={20} color={Colors.secondary} style={{ marginRight: 8 }} />
                    <TextInput
                        placeholder={t('search_company_contact_cari')}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        style={styles.searchInput}
                        selectTextOnFocus={Platform.OS === 'web'}
                        placeholderTextColor={Colors.secondary}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery("")}>
                            <Ionicons name="close-circle" size={18} color={Colors.muted} />
                        </TouchableOpacity>
                    )}
                </View>
                <TouchableOpacity style={styles.headerAddBtn} onPress={handleOpenAddModal}>
                    <Ionicons name="person-add-outline" size={20} color="#fff" />
                    {Platform.OS === 'web' && <Text style={styles.headerAddBtnText}>{t('new_customer')}</Text>}
                </TouchableOpacity>
            </View>

            <View style={styles.sortContainerDetailed}>
                <View style={styles.sortLabelContainer}>
                    <Ionicons name="filter-outline" size={14} color={Colors.secondary} />
                    <Text style={styles.sortLabel}>{t('sort') || "Sırala"}</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortScrollContent}>
                    <SortButton title={t('sort_az')} currentSort={sortOption} targetSort="nameAZ" onPress={setSortOption} />
                    <SortButton title={t('sort_za')} currentSort={sortOption} targetSort="nameZA" onPress={setSortOption} />
                    <SortButton title={t('sort_cari_az')} currentSort={sortOption} targetSort="cariAZ" onPress={setSortOption} />
                </ScrollView>
            </View>

            {appDataLoading ? (
                <View style={styles.listContentContainer}>
                    {[1, 2, 3, 4, 5].map((key) => (
                        <SkeletonCustomerItem key={key} />
                    ))}
                </View>
            ) : (
                <>
                    {Platform.OS === 'web' && Dimensions.get('window').width > 768 ? (
                        <View style={styles.webTableContainer}>
                            <View style={styles.webTableHeader}>
                                <Text style={[styles.webHeaderCell, { flex: 2 }]}>{t('company_title')}</Text>
                                <Text style={[styles.webHeaderCell, { flex: 1.5 }]}>{t('contact_person')}</Text>
                                <Text style={[styles.webHeaderCell, { flex: 1 }]}>{t('cari_code')}</Text>
                                <Text style={[styles.webHeaderCell, { flex: 1.5 }]}>{t('phone')}</Text>
                                <Text style={[styles.webHeaderCell, { flex: 1.5 }]}>{t('email')}</Text>
                                <Text style={[styles.webHeaderCell, { flex: 1, textAlign: 'center' }]}>{t('actions')}</Text>
                            </View>
                            <FlatList
                                data={filteredCustomers}
                                keyExtractor={(i) => i.id}
                                renderItem={({ item, index }) => {
                                    const orderCount = sales ? sales.filter(s => s.customerId === item.id).length : 0;
                                    return (
                                        <View style={[styles.webTableRow, index % 2 === 0 ? styles.webTableRowEven : styles.webTableRowOdd]}>
                                            <View style={{ flex: 2, justifyContent: 'center' }}>
                                                <Text style={styles.webCellTextBold}>{item.companyName || item.name}</Text>
                                                {orderCount > 0 && (
                                                    <View style={styles.orderBadgeMini}>
                                                        <Text style={styles.orderBadgeTextMini}>{orderCount} {t('order')}</Text>
                                                    </View>
                                                )}
                                            </View>
                                            <View style={{ flex: 1.5, justifyContent: 'center' }}>
                                                <Text style={styles.webCellText}>{item.contactName || '-'}</Text>
                                            </View>
                                            <View style={{ flex: 1, justifyContent: 'center' }}>
                                                <Text style={styles.webCellCode}>{item.cariCode || '-'}</Text>
                                            </View>
                                            <View style={{ flex: 1.5, justifyContent: 'center' }}>
                                                <TouchableOpacity onPress={() => item.phone && Linking.openURL(`tel:${item.phone}`)}>
                                                    <Text style={[styles.webCellText, item.phone && { color: Colors.iosBlue, fontWeight: '500' }]}>{item.phone || '-'}</Text>
                                                </TouchableOpacity>
                                            </View>
                                            <View style={{ flex: 1.5, justifyContent: 'center' }}>
                                                <Text style={styles.webCellText} numberOfLines={1}>{item.email || '-'}</Text>
                                            </View>
                                            <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                                                <TouchableOpacity onPress={() => handleOpenEditModal(item)} style={styles.webActionBtn}>
                                                    <Ionicons name="create-outline" size={18} color={Colors.iosBlue} />
                                                </TouchableOpacity>
                                                <TouchableOpacity onPress={() => confirmDelete(item.id, item.companyName || item.name)} style={[styles.webActionBtn, { backgroundColor: '#FEF2F2', borderColor: '#FEE2E2' }]}>
                                                    <Ionicons name="trash-outline" size={18} color={Colors.critical} />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    );
                                }}
                                scrollEnabled={false}
                                ListEmptyComponent={
                                    <View style={styles.emptyState}>
                                        <Ionicons name="people-outline" size={50} color={Colors.secondary} />
                                        <Text style={styles.emptyStateText}>
                                            {searchQuery ? t('no_customer_found') : t('no_registered_customer')}
                                        </Text>
                                    </View>
                                }
                            />
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
                                    orderCount={sales ? sales.filter(s => s.customerId === item.id).length : 0}
                                />
                            )}
                            contentContainerStyle={styles.listContentContainer}
                            ListEmptyComponent={
                                <View style={styles.emptyState}>
                                    <Ionicons name="people-outline" size={50} color={Colors.secondary} />
                                    <Text style={styles.emptyStateText}>
                                        {searchQuery ? t('no_customer_found') : t('no_registered_customer')}
                                    </Text>
                                </View>
                            }
                        />
                    )}
                </>
            )}

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
    statsContainer: {
        flexDirection: 'row',
        marginBottom: 20,
        gap: 12,
        flexWrap: 'wrap',
    },
    statCard: {
        flex: 1,
        minWidth: 120,
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 16,
        borderLeftWidth: 4,
        ...IOSShadow,
        ...Platform.select({
            web: {
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            }
        })
    },
    statLabel: {
        fontSize: 12,
        color: Colors.secondary,
        fontWeight: '700',
        textTransform: 'uppercase',
        marginBottom: 4
    },
    statValue: {
        fontSize: 24,
        fontWeight: '800',
        color: Colors.textPrimary
    },
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
        height: 48,
        borderRadius: 12,
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: Colors.textPrimary,
    },
    headerAddBtn: {
        backgroundColor: Colors.iosBlue,
        height: 48,
        paddingHorizontal: 20,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            web: {
                cursor: 'pointer'
            }
        })
    },
    headerAddBtnText: {
        color: '#fff',
        fontWeight: '700',
        marginLeft: 8,
        fontSize: 14
    },
    sortContainerDetailed: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 18,
    },
    sortLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 10,
    },
    sortLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.secondary,
        marginLeft: 4,
    },
    sortScrollContent: {
        paddingRight: 20,
    },
    sortButtonDetailed: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        marginRight: 8,
    },
    sortButtonDetailedActive: {
        backgroundColor: Colors.iosBlue,
    },
    sortButtonDetailedText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#475569',
    },
    sortButtonDetailedActiveText: {
        color: '#fff',
    },
    webTableContainer: {
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        overflow: 'hidden',
        marginTop: 10,
        marginBottom: 50,
        ...Platform.select({
            web: {
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            }
        })
    },
    webTableHeader: {
        flexDirection: 'row',
        backgroundColor: '#F8FAFC',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        paddingVertical: 16,
        paddingHorizontal: 20,
    },
    webHeaderCell: {
        fontSize: 12,
        fontWeight: '700',
        color: '#475569',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    webTableRow: {
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    webTableRowEven: {
        backgroundColor: '#FFFFFF',
    },
    webTableRowOdd: {
        backgroundColor: '#F9FAFB',
    },
    webCellText: {
        fontSize: 14,
        color: '#334155',
    },
    webCellTextBold: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0F172A',
    },
    webCellCode: {
        fontSize: 13,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        color: Colors.secondary,
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 4,
        alignSelf: 'flex-start'
    },
    webActionBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        ...Platform.select({
            web: {
                cursor: 'pointer',
                userSelect: 'none',
            }
        })
    },
    orderBadgeMini: {
        backgroundColor: '#DCFCE7',
        alignSelf: 'flex-start',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginTop: 4
    },
    orderBadgeTextMini: {
        fontSize: 10,
        fontWeight: '700',
        color: '#166534'
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
        ...Platform.select({
            web: {
                cursor: 'pointer',
                userSelect: 'none',
            }
        }),
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
        ...Platform.select({
            web: {
                cursor: 'pointer',
                userSelect: 'none',
            }
        }),
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '800',
    },
    webModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end',
        alignItems: Platform.OS === 'web' ? 'center' : 'stretch',
    },
    webModalWrapper: {
        width: '100%',
        maxWidth: 700,
        maxHeight: '90%',
        backgroundColor: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
        ...Platform.select({
            web: {
                boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            },
            default: IOSShadow
        })
    },
    webModalContainer: {
        flex: 1,
        height: 'auto',
        maxHeight: '90vh',
    },
    formSection: {
        marginBottom: 24,
        backgroundColor: '#F8FAFC',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: Colors.iosBlue,
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});

const customerListStyles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 14,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        overflow: 'hidden',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: 16,
        paddingBottom: 12,
    },
    headerLeft: {
        flex: 1,
        marginRight: 10,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
        letterSpacing: -0.2,
    },
    subTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    categoryBadge: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginRight: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },
    categoryText: {
        fontSize: 11,
        color: '#475569',
        fontWeight: '600',
    },
    codeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    codeText: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '500',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    divider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginHorizontal: 0,
    },
    cardBody: {
        padding: 16,
        backgroundColor: '#FAFBFC',
    },
    metricsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    metricItem: {
        flex: 1,
    },
    iconContainer: {
        width: 28,
        height: 28,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    metricLabel: {
        fontSize: 10,
        color: '#64748B',
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    metricValueSmall: {
        fontSize: 13,
        fontWeight: '600',
        color: '#475569',
    },
    metricDivider: {
        width: 1,
        height: 24,
        backgroundColor: '#E2E8F0',
        marginHorizontal: 12,
    },
    cardActions: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        marginRight: 10,
    },
    editBtn: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    editBtnText: {
        color: Colors.iosBlue,
        fontSize: 13,
        fontWeight: '700',
        marginLeft: 6,
    },
    deleteIconBtn: {
        padding: 8,
        backgroundColor: '#FEF2F2',
        borderRadius: 8,
        marginLeft: 'auto',
    },
});