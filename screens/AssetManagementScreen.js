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
    ScrollView,
    Dimensions
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ImmersiveLayout from "../components/ImmersiveLayout";
import { Colors, IOSShadow } from "../Theme";
import { AppContext } from "../AppContext";
import KeyboardSafeView from "../components/KeyboardSafeView";
import BarcodeScannerModal from "../components/BarcodeScannerModal";
import { useTranslation } from "react-i18next";
import { printToFileAsync, printAsync } from 'expo-print';
import { shareAsync } from 'expo-sharing';

export default function AssetManagementScreen({ navigation }) {
    const { assets, addAsset, updateAsset, deleteAsset, assignAsset, unassignAsset, personnel, isPremium } = useContext(AppContext);
    const { t } = useTranslation();
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
        return person ? person.name : t("unspecified");
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
            if (Platform.OS === 'web') {
                if (window.confirm(t("asset_limit_message"))) {
                    navigation.navigate("Paywall");
                }
            } else {
                Alert.alert(
                    t("premium_feature"),
                    t("asset_limit_message"),
                    [
                        { text: t("cancel"), style: "cancel" },
                        { text: t("get_premium"), onPress: () => navigation.navigate("Paywall") }
                    ]
                );
            }
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
            Alert.alert(t("error"), t("asset_name_required"));
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
        if (Platform.OS === 'web') {
            if (window.confirm(t("asset_delete_confirmation"))) {
                deleteAsset(id);
            }
        } else {
            Alert.alert(
                t("delete"),
                t("asset_delete_confirmation"),
                [
                    { text: t("cancel"), style: "cancel" },
                    { text: t("delete"), style: "destructive", onPress: () => deleteAsset(id) }
                ]
            );
        }
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
        if (Platform.OS === 'web') {
            if (window.confirm(t("asset_return_confirmation"))) {
                unassignAsset(asset.id);
            }
        } else {
            Alert.alert(
                t("asset_return"),
                t("asset_return_confirmation"),
                [
                    { text: t("cancel"), style: "cancel" },
                    { text: t("asset_return"), onPress: () => unassignAsset(asset.id) }
                ]
            );
        }
    };

    const handlePrintZimmetForm = async (asset) => {
        if (!asset.assigned_person_id) return;

        const person = personnel.find(p => p.id === asset.assigned_person_id);
        if (!person) {
            Alert.alert(t("error"), t("personnel_not_found"));
            return;
        }

        // Find all assets assigned to this person (including the current one)
        const personAssets = assets.filter(a => a.assigned_person_id === person.id && a.status === 'ASSIGNED');

        try {
            const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #333; line-height: 1.4; }
                    .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                    .header h1 { margin: 0; font-size: 24px; color: #000; text-transform: uppercase; letter-spacing: 1px; }
                    .meta-info { display: flex; justify-content: space-between; margin-bottom: 30px; border: 1px solid #ddd; padding: 15px; border-radius: 8px; background-color: #f9f9f9; }
                    .info-group { flex: 1; }
                    .info-group h3 { margin: 0 0 10px 0; font-size: 14px; color: #666; text-transform: uppercase; }
                    .info-group p { margin: 4px 0; font-size: 14px; font-weight: bold; }
                    .table-section { margin-bottom: 30px; }
                    table { width: 100%; border-collapse: collapse; font-size: 12px; }
                    th, td { border: 1px solid #ccc; padding: 10px; text-align: left; }
                    th { background-color: #f0f0f0; font-weight: bold; text-transform: uppercase; color: #444; }
                    tr:nth-child(even) { background-color: #fafafa; }
                    .highlight-row { background-color: #e6fffa !important; border-left: 3px solid #00bfa5; }
                    .legal-section { font-size: 11px; text-align: justify; margin-bottom: 50px; border: 1px solid #eee; padding: 15px; background: #fff; }
                    .legal-title { font-weight: bold; margin-bottom: 8px; font-size: 12px; text-transform: uppercase; }
                    .signatures { display: flex; justify-content: space-between; margin-top: 20px; page-break-inside: avoid; }
                    .signature-box { width: 45%; border: 1px solid #ccc; padding: 20px; height: 120px; text-align: center; position: relative; }
                    .sig-title { font-weight: bold; margin-bottom: 40px; font-size: 14px; border-bottom: 1px solid #eee; padding-bottom: 10px; display: block; }
                    .footer { margin-top: 50px; font-size: 10px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 10px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>ZİMMET TESLİM TUTANAĞI</h1>
                    <div style="font-size: 12px; margin-top: 10px; color: #666;">Tarih: ${new Date().toLocaleDateString('tr-TR')}</div>
                </div>

                <div class="meta-info">
                    <div class="info-group">
                        <h3>Zimmet Alan Personel</h3>
                        <p>${person.name}</p>
                        <p style="font-weight: normal; font-size: 12px;">${person.role || 'Görevi Belirtilmemiş'}</p>
                    </div>
                    <div class="info-group" style="text-align: right;">
                        <h3>İletişim</h3>
                        <p>${person.phone || '-'}</p>
                    </div>
                </div>

                <div class="table-section">
                    <div style="font-weight: bold; margin-bottom: 10px; font-size: 14px; border-left: 4px solid #333; padding-left: 10px;">ZİMMETLENEN DEMİRBAŞ LİSTESİ</div>
                    <table>
                        <thead>
                            <tr>
                                <th>Sıra</th>
                                <th>Ürün Adı</th>
                                <th>Marka</th>
                                <th>Seri No</th>
                                <th>Veriliş Tarihi</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${personAssets.map((item, index) => `
                            <tr class="${item.id === asset.id ? 'highlight-row' : ''}">
                                <td>${index + 1}</td>
                                <td>${item.name}</td>
                                <td>${item.model || '-'}</td>
                                <td>${item.serial_number || '-'}</td>
                                <td>${new Date(item.assigned_date).toLocaleDateString('tr-TR')}</td>
                            </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="legal-section">
                    <div class="legal-title">TESLİM VE KULLANIM TAAHHÜTNAMESİ</div>
                    <p style="margin-bottom: 8px;">
                        Yukarıdaki listede özellikleri belirtilen demirbaş malzemelerini/cihazlarını sağlam ve çalışır vaziyette, tüm aksesuarları ile birlikte teslim aldım.
                    </p>
                    <p style="margin-bottom: 8px;">
                        Tarafıma tahsis edilen bu ekipmanları; şirket içi çalışma prensiplerine, kullanım kılavuzlarına ve bakım talimatlarına uygun olarak, özenle kullanacağımı,
                        kasıtlı olarak zarar vermeyeceğimi, yetkisiz kişilere kullandırmayacağımı, şirket dışına izinsiz çıkarmayacağımı beyan ederim.
                    </p>
                    <p>
                        İş sözleşmemin sona ermesi durumunda veya işveren tarafından talep edilmesi halinde, zimmetimdeki malzemeleri eksiksiz ve hasarsız olarak (olağan kullanım yıpranması hariç) 
                        derhal iade edeceğimi; malzemelerin iade edilmemesi, kaybolması veya kullanım hatası nedeniyle hasar görmesi durumunda 
                        tespit edilecek güncel rayiç bedeli üzerinden oluşacak zararı nakden ve defaten tazmin etmeyi kabul ve taahhüt ederim.
                    </p>
                </div>

                <div class="signatures">
                    <div class="signature-box">
                        <span class="sig-title">TESLİM EDEN (Yetkili)</span>
                        <div style="font-size: 12px; color: #999;">İmza</div>
                    </div>
                    <div class="signature-box">
                        <span class="sig-title">TESLİM ALAN (Personel)</span>
                        <div style="font-weight: bold; margin-bottom: 5px;">${person.name}</div>
                        <div style="font-size: 12px; color: #999;">İmza Tarihi: ${new Date().toLocaleDateString('tr-TR')}</div>
                    </div>
                </div>

                <div class="footer">
                    Bu belge elektronik ortamda oluşturulmuştur. | Mini ERP
                </div>
            </body>
            </html>
            `;

            if (Platform.OS === 'web') {
                const printWindow = window.open('', '', 'width=800,height=600');
                if (printWindow) {
                    printWindow.document.write(html);
                    printWindow.document.close();
                    printWindow.focus();
                    setTimeout(() => {
                        printWindow.print();
                        // printWindow.close(); // Optional: Close after print
                    }, 500);
                } else {
                    Alert.alert(t("error"), "Lütfen pop-up engelleyicisini kapatın.");
                }
            } else {
                const { uri } = await printToFileAsync({ html });
                await shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
            }
        } catch (error) {
            Alert.alert(t("error"), "PDF oluşturulurken bir hata oluştu.");
            console.error(error);
        }
    };

    const stats = useMemo(() => {
        const total = assets.length;
        const assigned = assets.filter(a => a.status === 'ASSIGNED').length;
        const available = assets.filter(a => a.status === 'AVAILABLE').length;
        return { total, assigned, available };
    }, [assets]);

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
                            {item.status === 'ASSIGNED' ? t("asset_assigned") : t("asset_available")}
                        </Text>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.cardBody}>
                    <View style={styles.infoRow}>
                        <Ionicons name="barcode-outline" size={16} color={Colors.secondary} />
                        <Text style={styles.infoText}>{item.serial_number || t("no_serial_number")}</Text>
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
                                {new Date(item.assigned_date).toLocaleDateString()} {t("asset_assigned_date")}
                            </Text>
                        </View>
                    )}
                </View>

                <View style={styles.cardActions}>
                    {item.status === 'AVAILABLE' ? (
                        <TouchableOpacity style={[styles.actionBtn, styles.assignBtn]} onPress={() => openAssignModal(item)}>
                            <Ionicons name="person-add-outline" size={16} color="#fff" />
                            <Text style={styles.assignBtnText}>{t("asset_assign")}</Text>
                        </TouchableOpacity>
                    ) : (
                        <>
                            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#F3F4F6', marginRight: 10 }]} onPress={() => handlePrintZimmetForm(item)}>
                                <Ionicons name="print-outline" size={16} color="#333" />
                                <Text style={[styles.returnBtnText, { color: '#333' }]}>Form</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.actionBtn, styles.returnBtn]} onPress={() => handleReturn(item)}>
                                <Ionicons name="arrow-undo-outline" size={16} color="#000" />
                                <Text style={styles.returnBtnText}>{t("asset_return")}</Text>
                            </TouchableOpacity>
                        </>
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
        <ImmersiveLayout title={t("asset_management")} subtitle={`${filteredAssets.length} ${t("quantity_short")}`} onGoBack={() => navigation.goBack()} noScrollView={Platform.OS === 'web'}>

            {/* İSTATİSTİK KARTLARI */}
            <View style={styles.statsContainer}>
                <View style={[styles.statCard, { borderLeftColor: Colors.iosBlue }]}>
                    <Text style={styles.statLabel}>{t("all")}</Text>
                    <Text style={styles.statValue}>{stats.total}</Text>
                </View>
                <View style={[styles.statCard, { borderLeftColor: '#166534' }]}>
                    <Text style={styles.statLabel}>{t("asset_assigned")}</Text>
                    <Text style={[styles.statValue, { color: '#166534' }]}>{stats.assigned}</Text>
                </View>
                <View style={[styles.statCard, { borderLeftColor: Colors.secondary }]}>
                    <Text style={styles.statLabel}>{t("asset_available")}</Text>
                    <Text style={[styles.statValue, { color: Colors.secondary }]}>{stats.available}</Text>
                </View>
            </View>

            {/* ARAMA ÇUBUĞU */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={Colors.secondary} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder={t("asset_search_placeholder")}
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
            <View style={styles.tabContainer}>
                <TouchableOpacity style={[styles.tab, activeTab === 'all' && styles.activeTab]} onPress={() => setActiveTab('all')}>
                    <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>{t("all")}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tab, activeTab === 'available' && styles.activeTab]} onPress={() => setActiveTab('available')}>
                    <Text style={[styles.tabText, activeTab === 'available' && styles.activeTabText]}>{t("asset_available")}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tab, activeTab === 'assigned' && styles.activeTab]} onPress={() => setActiveTab('assigned')}>
                    <Text style={[styles.tabText, activeTab === 'assigned' && styles.activeTabText]}>{t("asset_assigned")}</Text>
                </TouchableOpacity>
            </View>

            {Platform.OS === 'web' && Dimensions.get('window').width > 800 ? (
                <View style={styles.webTableWrapper}>
                    <View style={styles.webTableContainer}>
                        <View style={styles.webTableHeader}>
                            <Text style={[styles.webHeaderCell, { flex: 2 }]}>{t("product_name")}</Text>
                            <Text style={[styles.webHeaderCell, { flex: 1.5 }]}>{t("serial_number")}</Text>
                            <Text style={[styles.webHeaderCell, { flex: 1, textAlign: 'center' }]}>{t("status") || "Durum"}</Text>
                            <Text style={[styles.webHeaderCell, { flex: 2 }]}>{t("personnel")}</Text>
                            <Text style={[styles.webHeaderCell, { flex: 1 }]}>{t("date")}</Text>
                            <Text style={[styles.webHeaderCell, { flex: 1.5, textAlign: 'center' }]}>{t("actions")}</Text>
                        </View>
                        <FlatList
                            data={filteredAssets}
                            keyExtractor={item => item.id}
                            renderItem={({ item, index }) => {
                                const assignedPerson = item.assigned_person_id ? personnel.find(p => p.id === item.assigned_person_id) : null;
                                return (
                                    <View style={[styles.webTableRow, index % 2 === 0 ? styles.webTableRowEven : styles.webTableRowOdd]}>
                                        <View style={{ flex: 2 }}>
                                            <Text style={styles.webCellTextBold}>{item.name}</Text>
                                            <Text style={styles.webCellSubText}>{item.model}</Text>
                                        </View>
                                        <View style={{ flex: 1.5 }}>
                                            <Text style={styles.webCellText}>{item.serial_number || "-"}</Text>
                                        </View>
                                        <View style={{ flex: 1, alignItems: 'center' }}>
                                            <View style={[styles.webStatusBadge, { backgroundColor: item.status === 'ASSIGNED' ? '#DCFCE7' : '#F3F4F6' }]}>
                                                <Text style={[styles.webStatusText, { color: item.status === 'ASSIGNED' ? '#166534' : Colors.secondary }]}>
                                                    {item.status === 'ASSIGNED' ? t("asset_assigned") : t("asset_available")}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={{ flex: 2 }}>
                                            {assignedPerson ? (
                                                <View style={styles.webPersonCell}>
                                                    <View style={styles.webAvatarSmall}>
                                                        <Text style={styles.webAvatarTextSmall}>{assignedPerson.name.charAt(0)}</Text>
                                                    </View>
                                                    <Text style={styles.webCellText}>{assignedPerson.name}</Text>
                                                </View>
                                            ) : (
                                                <Text style={[styles.webCellText, { color: Colors.muted }]}>-</Text>
                                            )}
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.webCellText}>
                                                {item.assigned_date ? new Date(item.assigned_date).toLocaleDateString() : "-"}
                                            </Text>
                                        </View>
                                        <View style={{ flex: 1.5, flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
                                            {item.status === 'AVAILABLE' ? (
                                                <TouchableOpacity title={t("asset_assign")} style={styles.webActionBtn} onPress={() => openAssignModal(item)}>
                                                    <Ionicons name="person-add" size={16} color={Colors.iosBlue} />
                                                </TouchableOpacity>
                                            ) : (
                                                <>
                                                    <TouchableOpacity title="Form" style={[styles.webActionBtn, { backgroundColor: '#F0F9FF' }]} onPress={() => handlePrintZimmetForm(item)}>
                                                        <Ionicons name="print-outline" size={16} color={Colors.iosBlue} />
                                                    </TouchableOpacity>
                                                    <TouchableOpacity title={t("asset_return")} style={[styles.webActionBtn, { backgroundColor: '#FFF7ED' }]} onPress={() => handleReturn(item)}>
                                                        <Ionicons name="arrow-undo" size={16} color={Colors.warning} />
                                                    </TouchableOpacity>
                                                </>
                                            )}
                                            <TouchableOpacity style={styles.webActionBtn} onPress={() => handleEditAsset(item)}>
                                                <Ionicons name="create-outline" size={16} color={Colors.secondary} />
                                            </TouchableOpacity>
                                            <TouchableOpacity style={[styles.webActionBtn, { backgroundColor: '#FEF2F2' }]} onPress={() => handleDeleteAsset(item.id)}>
                                                <Ionicons name="trash-outline" size={16} color={Colors.error} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                );
                            }}
                            ListEmptyComponent={
                                <View style={styles.emptyState}>
                                    <Ionicons name="file-tray-outline" size={48} color={Colors.secondary} />
                                    <Text style={styles.emptyText}>{t("no_records_found")}</Text>
                                </View>
                            }
                        />
                    </View>
                </View>
            ) : (
                <FlatList
                    data={filteredAssets}
                    keyExtractor={item => item.id}
                    renderItem={renderAssetItem}
                    contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="file-tray-outline" size={48} color={Colors.secondary} />
                            <Text style={styles.emptyText}>{t("no_records_found")}</Text>
                        </View>
                    }
                />
            )}

            <TouchableOpacity style={styles.fab} onPress={handleOpenAddModal}>
                <Ionicons name="add" size={30} color="#fff" />
            </TouchableOpacity>

            {/* Add/Edit Asset Modal */}
            <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
                <KeyboardSafeView>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{selectedAsset ? t("edit_product") : t("add_new_product")}</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={28} color={Colors.textPrimary} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.form}>
                            <Text style={styles.label}>{t("product_name")}</Text>
                            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Örn: MacBook Pro M1" />

                            <Text style={styles.label}>{t("model")}</Text>
                            <TextInput style={styles.input} value={model} onChangeText={setModel} placeholder="Örn: A2338" />

                            <Text style={styles.label}>{t("serial_number")}</Text>
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
                                <Text style={styles.saveBtnText}>{t("save")}</Text>
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
                            <Text style={styles.modalTitle}>{t("select_personnel")}</Text>
                            <TouchableOpacity onPress={() => setAssignModalVisible(false)}>
                                <Ionicons name="close" size={24} color={Colors.textPrimary} />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.assignSubtitle}>"{selectedAsset?.name}" {t("asset_assign_prompt")}</Text>

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
                                <Text style={{ textAlign: 'center', color: Colors.secondary, marginTop: 20 }}>{t("no_personnel_found")}</Text>
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
        color: '#000',
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
    // Web Table Styles
    webTableWrapper: {
        flex: 1,
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    webTableContainer: {
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        overflow: 'hidden',
        minHeight: 400,
    },
    webTableHeader: {
        flexDirection: 'row',
        backgroundColor: '#F8FAFC',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    webHeaderCell: {
        fontSize: 12,
        fontWeight: '700',
        color: '#64748B',
        textTransform: 'uppercase',
    },
    webTableRow: {
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        alignItems: 'center',
    },
    webTableRowEven: {
        backgroundColor: '#fff',
    },
    webTableRowOdd: {
        backgroundColor: '#FAFBFC',
    },
    webCellText: {
        fontSize: 14,
        color: Colors.textPrimary,
    },
    webCellTextBold: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    webCellSubText: {
        fontSize: 12,
        color: Colors.secondary,
    },
    webStatusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    webStatusText: {
        fontSize: 11,
        fontWeight: '700',
    },
    webPersonCell: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    webAvatarSmall: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    webAvatarTextSmall: {
        fontSize: 12,
        color: Colors.iosBlue,
        fontWeight: '700',
    },
    webActionBtn: {
        padding: 6,
        borderRadius: 6,
        backgroundColor: '#F1F5F9',
    },
    // Stats Styles
    statsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        gap: 12,
        marginBottom: 16,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 12,
        borderLeftWidth: 4,
        ...IOSShadow,
    },
    statLabel: {
        fontSize: 11,
        color: Colors.secondary,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    statValue: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginTop: 2,
    },
});

