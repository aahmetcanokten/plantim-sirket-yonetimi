import React, { useContext, useState, useMemo } from "react";
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Modal,
    TextInput,
    Alert,
    Platform,
    ScrollView
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ImmersiveLayout from "../components/ImmersiveLayout";
import { Colors, IOSShadow } from "../Theme";
import { AppContext } from "../AppContext";
import KeyboardSafeView from "../components/KeyboardSafeView";
import BarcodeScannerModal from "../components/BarcodeScannerModal";

export default function AssetManagementScreen({ navigation }) {
    const { assets, addAsset, updateAsset, deleteAsset, assignAsset, unassignAsset, personnel, isPremium } = useContext(AppContext);
    const [activeTab, setActiveTab] = useState("all"); // all, available, assigned
    const [modalVisible, setModalVisible] = useState(false);
    const [assignModalVisible, setAssignModalVisible] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [scannerVisible, setScannerVisible] = useState(false);

    // Form States
    const [name, setName] = useState("");
    const [model, setModel] = useState("");
    const [serialNumber, setSerialNumber] = useState("");

    const getPersonName = (id) => {
        const person = personnel.find(p => p.id === id);
        return person ? person.name : "Bilinmiyor";
    };

    const filteredAssets = useMemo(() => {
        let list = [...assets];
        if (activeTab === "available") {
            list = list.filter(a => a.status === 'AVAILABLE');
        } else if (activeTab === "assigned") {
            list = list.filter(a => a.status === 'ASSIGNED');
        }

        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            list = list.filter(a => {
                const assignedPersonName = a.assigned_person_id ? getPersonName(a.assigned_person_id) : "";
                return (
                    (a.name && a.name.toLowerCase().includes(lowerQuery)) ||
                    (a.model && a.model.toLowerCase().includes(lowerQuery)) ||
                    (a.serial_number && a.serial_number.toLowerCase().includes(lowerQuery)) ||
                    (assignedPersonName && assignedPersonName.toLowerCase().includes(lowerQuery))
                );
            });
        }
        return list;
    }, [assets, activeTab, searchQuery, personnel]); // personnel dependency ekledik çünkü isim araması var

    // Handlers
    const handleScan = (data) => {
        setSerialNumber(data);
        setScannerVisible(false);
    };

    const handleOpenAddModal = () => {
        if (!isPremium && assets.length >= 3) {
            Alert.alert(
                "Premium Özellik",
                "Ücretsiz planda en fazla 3 demirbaş ekleyebilirsiniz. Sınırsız ekleme için Premium'a geçin.",
                [
                    { text: "Vazgeç", style: "cancel" },
                    { text: "Premium Al", onPress: () => navigation.navigate("Paywall") }
                ]
            );
            return;
        }

        setSelectedAsset(null);
        setName("");
        setModel("");
        setSerialNumber("");
        setModalVisible(true);
    };

    const handleEditAsset = (asset) => {
        setSelectedAsset(asset);
        setName(asset.name || "");
        setModel(asset.model || "");
        setSerialNumber(asset.serial_number || "");
        setModalVisible(true);
    };

    const handleSaveAsset = () => {
        const trimmedName = name.trim();

        if (!trimmedName) {
            Alert.alert("Hata", "Lütfen ürün adını girin.");
            return;
        }

        const assetData = {
            name: trimmedName,
            model: model.trim(),
            serial_number: serialNumber.trim(),
        };

        if (selectedAsset) {
            updateAsset({ ...selectedAsset, ...assetData });
        } else {
            addAsset(assetData);
        }

        setModalVisible(false);
    };

    const handleDeleteAsset = (id) => {
        Alert.alert(
            "Sil",
            "Bu demirbaşı silmek istediğinize emin misiniz?",
            [
                { text: "Vazgeç", style: "cancel" },
                { text: "Sil", style: "destructive", onPress: () => deleteAsset(id) }
            ]
        );
    };

    const openAssignModal = (asset) => {
        setSelectedAsset(asset);
        setAssignModalVisible(true);
    };

    const handleAssign = (personId) => {
        if (selectedAsset) {
            assignAsset(selectedAsset.id, personId);
            setAssignModalVisible(false);
            setSelectedAsset(null);
        }
    };

    const handleReturn = (asset) => {
        Alert.alert(
            "İade Al",
            "Bu ürünü iade almak istediğinize emin misiniz?",
            [
                { text: "Vazgeç", style: "cancel" },
                { text: "İade Al", onPress: () => unassignAsset(asset.id) }
            ]
        );
    };

    const renderAssetItem = ({ item }) => {
        const assignedPerson = item.assigned_person_id ? personnel.find(p => p.id === item.assigned_person_id) : null;

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View>
                        <Text style={styles.assetName}>{item.name}</Text>
                        <Text style={styles.assetModel}>{item.model}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: item.status === 'ASSIGNED' ? '#DCFCE7' : '#F3F4F6' }]}>
                        <Text style={[styles.statusText, { color: item.status === 'ASSIGNED' ? '#166534' : Colors.secondary }]}>
                            {item.status === 'ASSIGNED' ? 'ZİMMETLİ' : 'BOŞTA'}
                        </Text>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.cardBody}>
                    <View style={styles.infoRow}>
                        <Ionicons name="barcode-outline" size={16} color={Colors.secondary} />
                        <Text style={styles.infoText}>{item.serial_number || 'Seri No Yok'}</Text>
                    </View>

                    {item.status === 'ASSIGNED' && assignedPerson && (
                        <View style={styles.assignmentInfo}>
                            <View style={styles.infoRow}>
                                <Ionicons name="person-outline" size={16} color={Colors.iosBlue} />
                                <Text style={[styles.infoText, { color: Colors.iosBlue, fontWeight: '600' }]}>
                                    {assignedPerson.name}
                                </Text>
                            </View>
                            <Text style={{ fontSize: 11, color: Colors.secondary, marginLeft: 24 }}>
                                {new Date(item.assigned_date).toLocaleDateString()} tarihinde verildi
                            </Text>
                        </View>
                    )}
                </View>

                <View style={styles.cardActions}>
                    {item.status === 'AVAILABLE' ? (
                        <TouchableOpacity style={[styles.actionBtn, styles.assignBtn]} onPress={() => openAssignModal(item)}>
                            <Ionicons name="person-add-outline" size={16} color="#fff" />
                            <Text style={styles.assignBtnText}>Zimmetle</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={[styles.actionBtn, styles.returnBtn]} onPress={() => handleReturn(item)}>
                            <Ionicons name="arrow-undo-outline" size={16} color="#fff" />
                            <Text style={styles.returnBtnText}>İade Al</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity style={[styles.iconBtn, { marginRight: 8 }]} onPress={() => handleEditAsset(item)}>
                        <Ionicons name="create-outline" size={20} color={Colors.textPrimary} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.iconBtn} onPress={() => handleDeleteAsset(item.id)}>
                        <Ionicons name="trash-outline" size={20} color={Colors.error} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <ImmersiveLayout title="Zimmet Yönetimi" subtitle={`${filteredAssets.length} kayıt`} onGoBack={() => navigation.goBack()}>

            {/* ARAMA ÇUBUĞU */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={Colors.secondary} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Ara (Ürün, Model, Personel, Seri No)..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor={Colors.secondary}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery("")}>
                        <Ionicons name="close-circle" size={20} color={Colors.secondary} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Tabs */}
            {/* Tabs */}
            <View style={styles.tabContainer}>
                <TouchableOpacity style={[styles.tab, activeTab === 'all' && styles.activeTab]} onPress={() => setActiveTab('all')}>
                    <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>Tümü</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tab, activeTab === 'available' && styles.activeTab]} onPress={() => setActiveTab('available')}>
                    <Text style={[styles.tabText, activeTab === 'available' && styles.activeTabText]}>Boşta</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tab, activeTab === 'assigned' && styles.activeTab]} onPress={() => setActiveTab('assigned')}>
                    <Text style={[styles.tabText, activeTab === 'assigned' && styles.activeTabText]}>Zimmetli</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={filteredAssets}
                keyExtractor={item => item.id}
                renderItem={renderAssetItem}
                contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="file-tray-outline" size={48} color={Colors.secondary} />
                        <Text style={styles.emptyText}>Kayıt bulunamadı.</Text>
                    </View>
                }
            />

            <TouchableOpacity style={styles.fab} onPress={handleOpenAddModal}>
                <Ionicons name="add" size={30} color="#fff" />
            </TouchableOpacity>

            {/* Add/Edit Asset Modal */}
            <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
                <KeyboardSafeView>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{selectedAsset ? "Ürün Düzenle" : "Yeni Ürün Ekle"}</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={28} color={Colors.textPrimary} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.form}>
                            <Text style={styles.label}>Ürün Adı</Text>
                            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Örn: MacBook Pro M1" />

                            <Text style={styles.label}>Model</Text>
                            <TextInput style={styles.input} value={model} onChangeText={setModel} placeholder="Örn: A2338" />

                            <Text style={styles.label}>Seri Numarası</Text>
                            <View style={styles.serialInputContainer}>
                                <TextInput
                                    style={[styles.input, { flex: 1, marginRight: 10 }]}
                                    value={serialNumber}
                                    onChangeText={setSerialNumber}
                                    placeholder="Örn: C02..."
                                />
                                <TouchableOpacity style={styles.scanButton} onPress={() => setScannerVisible(true)}>
                                    <Ionicons name="barcode-outline" size={24} color="#fff" />
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveAsset}>
                                <Text style={styles.saveBtnText}>Kaydet</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardSafeView>
            </Modal >

            <BarcodeScannerModal visible={scannerVisible} onClose={() => setScannerVisible(false)} onScanned={handleScan} />

            {/* Assign Modal */}
            <Modal visible={assignModalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.assignModalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Personel Seç</Text>
                            <TouchableOpacity onPress={() => setAssignModalVisible(false)}>
                                <Ionicons name="close" size={24} color={Colors.textPrimary} />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.assignSubtitle}>"{selectedAsset?.name}" ürününü kime zimmetlemek istiyorsunuz?</Text>

                        <ScrollView style={{ maxHeight: 300 }}>
                            {personnel.map(p => (
                                <TouchableOpacity key={p.id} style={styles.personItem} onPress={() => handleAssign(p.id)}>
                                    <View style={styles.avatar}>
                                        <Text style={styles.avatarText}>{p.name.charAt(0).toUpperCase()}</Text>
                                    </View>
                                    <Text style={styles.personName}>{p.name}</Text>
                                    <Ionicons name="chevron-forward" size={20} color={Colors.secondary} />
                                </TouchableOpacity>
                            ))}
                            {personnel.length === 0 && (
                                <Text style={{ textAlign: 'center', color: Colors.secondary, marginTop: 20 }}>Kayıtlı personel bulunamadı.</Text>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* REKLAM ALANI */}


        </ImmersiveLayout >
    );
}

const styles = StyleSheet.create({
    tabContainer: {
        flexDirection: 'row',
        padding: 4,
        backgroundColor: '#F3F4F6',
        margin: 16,
        borderRadius: 12,
    },
    tab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 10,
    },
    activeTab: {
        backgroundColor: '#fff',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    tabText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.secondary,
    },
    activeTabText: {
        color: Colors.textPrimary,
        fontWeight: '700',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        marginBottom: 12,
        ...IOSShadow,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: 16,
    },
    assetName: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    assetModel: {
        fontSize: 13,
        color: Colors.secondary,
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '800',
    },
    divider: {
        height: 1,
        backgroundColor: '#F1F5F9',
    },
    cardBody: {
        padding: 16,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    infoText: {
        fontSize: 13,
        color: Colors.textPrimary,
        marginLeft: 8,
    },
    assignmentInfo: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#F8FAFC',
    },
    cardActions: {
        flexDirection: 'row',
        padding: 12,
        backgroundColor: '#F8FAFC',
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
        alignItems: 'center',
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 10,
        marginRight: 10,
    },
    assignBtn: {
        backgroundColor: Colors.iosBlue,
    },
    assignBtnText: {
        color: '#fff',
        fontWeight: '600',
        marginLeft: 6,
        fontSize: 13,
    },
    returnBtn: {
        backgroundColor: Colors.warning,
    },
    returnBtnText: {
        color: '#fff',
        fontWeight: '600',
        marginLeft: 6,
        fontSize: 13,
    },
    iconBtn: {
        padding: 10,
        backgroundColor: '#FEF2F2',
        borderRadius: 10,
    },
    fab: {
        position: 'absolute',
        bottom: 30,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: Colors.iosBlue,
        alignItems: 'center',
        justifyContent: 'center',
        ...IOSShadow,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
    },
    emptyText: {
        marginTop: 10,
        color: Colors.secondary,
        fontSize: 15,
    },
    // Modal Styles
    modalContainer: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    form: {
        padding: 20,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.textPrimary,
        marginBottom: 8,
        marginTop: 12,
    },
    input: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 10,
        padding: 12,
        fontSize: 15,
    },
    saveBtn: {
        backgroundColor: Colors.iosBlue,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 30,
    },
    saveBtnText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
    },
    // Assign Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    assignModalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        maxHeight: '80%',
    },
    assignSubtitle: {
        fontSize: 14,
        color: Colors.secondary,
        marginBottom: 20,
    },
    personItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    avatarText: {
        color: Colors.iosBlue,
        fontWeight: '700',
        fontSize: 16,
    },
    personName: {
        flex: 1,
        fontSize: 15,
        color: Colors.textPrimary,
        fontWeight: '500',
    },
    // New Styles
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 12,
        marginBottom: 16,
        marginHorizontal: 16,
        height: 48,
        ...IOSShadow,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: Colors.textPrimary,
        height: '100%',
    },
    serialInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    scanButton: {
        backgroundColor: Colors.secondary,
        width: 44,
        height: 44,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
