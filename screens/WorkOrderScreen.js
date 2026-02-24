import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, ScrollView, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../AppContext';
import { Colors } from '../Theme';
import { useTranslation } from 'react-i18next';

export default function WorkOrderScreen() {
    const { t } = useTranslation();
    const {
        workOrders, addWorkOrder, updateWorkOrder, closeWorkOrder,
        products, processTemplates, addProcessTemplate
    } = useContext(AppContext);

    const [modalVisible, setModalVisible] = useState(false);
    const [templateModalVisible, setTemplateModalVisible] = useState(false);
    const [closeModalVisible, setCloseModalVisible] = useState(false);
    const [selectedWo, setSelectedWo] = useState(null);
    const [isEdit, setIsEdit] = useState(false);

    // Form States
    const [productId, setProductId] = useState('');
    const [targetQuantity, setTargetQuantity] = useState('');
    const [notes, setNotes] = useState('');
    const [processes, setProcesses] = useState([]);
    const [rawMaterialId, setRawMaterialId] = useState('');
    const [rawMaterialUsage, setRawMaterialUsage] = useState('');
    const [productSearch, setProductSearch] = useState('');
    const [rawMaterialSearch, setRawMaterialSearch] = useState('');

    // Closure States
    const [actualQuantity, setActualQuantity] = useState('');
    const [wasteQuantity, setWasteQuantity] = useState('');
    const [closureNotes, setClosureNotes] = useState('');
    const [closingProcesses, setClosingProcesses] = useState([]);

    const activeWorkOrders = workOrders.filter(wo => wo.status === 'OPEN');

    const resetForm = () => {
        setProductId('');
        setTargetQuantity('');
        setNotes('');
        setProcesses([]);
        setRawMaterialId('');
        setRawMaterialUsage('');
        setProductSearch('');
        setRawMaterialSearch('');
        setSelectedWo(null);
        setIsEdit(false);
    };

    const handleOpenModal = (wo = null) => {
        if (wo) {
            setSelectedWo(wo);
            setProductId(wo.product_id);
            setTargetQuantity(wo.target_quantity?.toString());
            setNotes(wo.notes || '');
            setProcesses(wo.processes || []);
            setRawMaterialId(wo.raw_material_id || '');
            setRawMaterialUsage(wo.raw_material_usage?.toString() || '');
            setProductSearch('');
            setRawMaterialSearch('');
            setIsEdit(true);
        } else {
            resetForm();
        }
        setModalVisible(true);
    };

    const handleOpenCloseModal = (wo) => {
        setSelectedWo(wo);
        setActualQuantity(wo.target_quantity?.toString());
        setWasteQuantity('0');
        setClosureNotes('');
        setClosingProcesses(wo.processes?.map(p => ({ ...p })) || []);
        setCloseModalVisible(true);
    };

    const handleAddProcess = () => {
        setProcesses([...processes, { id: Date.now(), name: '', duration: '', cost: '', status: 'PENDING' }]);
    };

    const handleUpdateProcess = (id, field, value) => {
        setProcesses(processes.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const handleUpdateClosingProcess = (id, field, value) => {
        setClosingProcesses(closingProcesses.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const handleRemoveProcess = (id) => {
        setProcesses(processes.filter(p => p.id !== id));
    };

    const generateWoNumber = () => {
        const today = new Date();
        const dateStr = today.getFullYear().toString() +
            (today.getMonth() + 1).toString().padStart(2, '0') +
            today.getDate().toString().padStart(2, '0');

        // Tüm iş emirleri içinden bugün oluşturulanları bul
        const todaysOrders = workOrders.filter(wo => {
            const woDate = new Date(wo.created_at);
            return woDate.toDateString() === today.toDateString();
        });

        const nextNum = (todaysOrders.length + 1).toString().padStart(3, '0');
        return `${dateStr}-${nextNum}`;
    };

    const handleSaveWorkOrder = async () => {
        if (!productId || !targetQuantity) {
            Alert.alert("Hata", "Lütfen ürün ve hedef miktar seçiniz.");
            return;
        }

        const woData = {
            product_id: productId,
            target_quantity: parseFloat(targetQuantity),
            notes,
            processes,
            raw_material_id: rawMaterialId || null,
            raw_material_usage: rawMaterialId ? parseFloat(rawMaterialUsage || 0) : null,
            wo_number: isEdit ? selectedWo.wo_number : generateWoNumber(),
            created_at: isEdit ? selectedWo.created_at : new Date().toISOString()
        };

        if (isEdit) {
            await updateWorkOrder({ ...selectedWo, ...woData });
        } else {
            await addWorkOrder(woData);
        }
        setModalVisible(false);
    };

    const handleCloseWorkOrder = async () => {
        if (!actualQuantity) {
            Alert.alert("Hata", "Lütfen üretilen miktarı giriniz.");
            return;
        }

        const proceed = async () => {
            try {
                await closeWorkOrder(selectedWo.id, {
                    actual_quantity: parseFloat(actualQuantity),
                    waste_quantity: parseFloat(wasteQuantity || 0),
                    closure_notes: closureNotes,
                    processes: closingProcesses
                });
                setCloseModalVisible(false);
            } catch (error) {
                console.error("Kapatma hatası:", error);
                Alert.alert("Hata", "İş emri kapatılırken bir sorun oluştu.");
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm("İş emri kapatılacak ve üretilen miktar stoğa eklenecektir. Onaylıyor musunuz?")) {
                await proceed();
            }
        } else {
            Alert.alert(
                "Onay",
                "İş emri kapatılacak ve üretilen miktar stoğa eklenecektir. Onaylıyor musunuz?",
                [
                    { text: "Vazgeç", style: "cancel" },
                    { text: "Evet, Kapat", onPress: proceed }
                ]
            );
        }
    };

    const handleSaveAsTemplate = () => {
        if (processes.length === 0) {
            Alert.alert("Hata", "Kaydedilecek proses bulunamadı.");
            return;
        }
        // Simplified name input for web compatibility
        const name = `Şablon ${new Date().toLocaleTimeString()}`;
        addProcessTemplate({ name, processes });
        Alert.alert("Başarılı", "Proses şablonu kaydedildi.");
    };

    const handleApplyTemplate = (template) => {
        setProcesses(template.processes.map(p => ({ ...p, id: Date.now() + Math.random() })));
        setTemplateModalVisible(false);
    };

    const renderWoItem = ({ item }) => {
        const product = products.find(p => p.id === item.product_id);
        return (
            <TouchableOpacity style={styles.card} onPress={() => handleOpenModal(item)}>
                <View style={styles.cardHeader}>
                    <View>
                        <Text style={styles.cardWoNumber}>{item.wo_number || 'No-#'}</Text>
                        <Text style={styles.cardTitle}>{product?.name || 'Bilinmeyen Ürün'}</Text>
                        <Text style={styles.cardSubtitle}>Hedef: {item.target_quantity} Adet</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: Colors.primary + '20' }]}>
                        <Text style={[styles.statusText, { color: Colors.primary }]}>AÇIK</Text>
                    </View>
                </View>
                <View style={styles.cardBody}>
                    <Text style={styles.cardInfo}>Proses Sayısı: {item.processes?.length || 0}</Text>
                    <Text style={styles.cardInfo}>Tarih: {new Date(item.created_at).toLocaleDateString('tr-TR')}</Text>
                </View>
                <TouchableOpacity
                    style={styles.closeBtn}
                    onPress={() => handleOpenCloseModal(item)}
                >
                    <Text style={styles.closeBtnText}>İş Emrini Kapat</Text>
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Aktif İş Emirleri</Text>
                <TouchableOpacity style={styles.addBtn} onPress={() => handleOpenModal()}>
                    <Ionicons name="add" size={20} color="#fff" />
                    <Text style={styles.addBtnText}>Yeni İş Emri</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={activeWorkOrders}
                renderItem={renderWoItem}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="construct-outline" size={64} color="#CBD5E1" />
                        <Text style={styles.emptyText}>Aktif iş emri bulunamadı.</Text>
                    </View>
                }
            />

            {/* Work Order Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>{isEdit ? 'İş Emri Detayı' : 'Yeni İş Emri'}</Text>
                                {isEdit && <Text style={styles.modalWoSub}>{selectedWo?.wo_number}</Text>}
                            </View>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody}>
                            <Text style={styles.label}>Üretilecek Ürün Seçimi</Text>
                            <View style={styles.searchContainer}>
                                <Ionicons name="search" size={18} color="#94A3B8" />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Ürün adı veya kod ara..."
                                    value={productSearch}
                                    onChangeText={setProductSearch}
                                />
                                {productSearch !== '' && (
                                    <TouchableOpacity onPress={() => setProductSearch('')}>
                                        <Ionicons name="close-circle" size={18} color="#94A3B8" />
                                    </TouchableOpacity>
                                )}
                            </View>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerContainer}>
                                {products
                                    .filter(p =>
                                        p.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
                                        p.code?.toLowerCase().includes(productSearch.toLowerCase())
                                    )
                                    .map(p => (
                                        <TouchableOpacity
                                            key={p.id}
                                            style={[styles.pickerItem, productId === p.id && styles.pickerItemActive]}
                                            onPress={() => setProductId(p.id)}
                                        >
                                            <Text style={[styles.pickerText, productId === p.id && styles.pickerTextActive]}>{p.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                            </ScrollView>

                            <Text style={styles.label}>Hedef Miktar</Text>
                            <TextInput
                                style={styles.input}
                                value={targetQuantity}
                                onChangeText={setTargetQuantity}
                                keyboardType="numeric"
                                placeholder="Örn: 100"
                            />

                            <View style={[styles.sectionHeader, { marginTop: 16 }]}>
                                <Text style={styles.label}>Hammadde / Bileşen Tüketimi (Opsiyonel)</Text>
                            </View>
                            <Text style={styles.smallInfo}>İş emri kapatıldığında bu üründen stok düşülecektir.</Text>

                            <View style={styles.searchContainer}>
                                <Ionicons name="search" size={18} color="#94A3B8" />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Hammadde adı veya kod ara..."
                                    value={rawMaterialSearch}
                                    onChangeText={setRawMaterialSearch}
                                />
                                {rawMaterialSearch !== '' && (
                                    <TouchableOpacity onPress={() => setRawMaterialSearch('')}>
                                        <Ionicons name="close-circle" size={18} color="#94A3B8" />
                                    </TouchableOpacity>
                                )}
                            </View>

                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.pickerContainer, { marginBottom: 12 }]}>
                                <TouchableOpacity
                                    style={[styles.pickerItem, !rawMaterialId && styles.pickerItemActive]}
                                    onPress={() => setRawMaterialId('')}
                                >
                                    <Text style={[styles.pickerText, !rawMaterialId && styles.pickerTextActive]}>Hiçbiri</Text>
                                </TouchableOpacity>
                                {products
                                    .filter(p =>
                                        p.name?.toLowerCase().includes(rawMaterialSearch.toLowerCase()) ||
                                        p.code?.toLowerCase().includes(rawMaterialSearch.toLowerCase())
                                    )
                                    .map(p => (
                                        <TouchableOpacity
                                            key={p.id}
                                            style={[styles.pickerItem, rawMaterialId === p.id && styles.pickerItemActive]}
                                            onPress={() => setRawMaterialId(p.id)}
                                        >
                                            <Text style={[styles.pickerText, rawMaterialId === p.id && styles.pickerTextActive]}>{p.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                            </ScrollView>

                            {rawMaterialId && (
                                <View style={{ marginTop: 8 }}>
                                    <Text style={styles.label}>Birim Başına Kullanım Miktarı</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={rawMaterialUsage}
                                        onChangeText={setRawMaterialUsage}
                                        keyboardType="numeric"
                                        placeholder="Örn: 0.5 (1 adet için kullanılan miktar)"
                                    />
                                    {rawMaterialUsage && targetQuantity && (
                                        <Text style={styles.calculatedNote}>
                                            Toplam Tahmini Tüketim: {(parseFloat(rawMaterialUsage) * parseFloat(targetQuantity || 0)).toFixed(2)} {products.find(p => p.id === rawMaterialId)?.unit || 'Birim'}
                                        </Text>
                                    )}
                                </View>
                            )}

                            <View style={styles.sectionHeader}>
                                <Text style={styles.label}>Prosesler ve Aşamalar</Text>
                                <View style={{ flexDirection: 'row' }}>
                                    {!isEdit && (
                                        <>
                                            <TouchableOpacity style={styles.smallBtn} onPress={() => setTemplateModalVisible(true)}>
                                                <Text style={{ color: Colors.primary, fontSize: 12 }}>Şablondan Al</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={styles.smallBtn} onPress={handleSaveAsTemplate}>
                                                <Text style={{ color: Colors.primary, fontSize: 12 }}>Şablon Kaydet</Text>
                                            </TouchableOpacity>
                                        </>
                                    )}
                                </View>
                            </View>

                            {processes.map((p, index) => (
                                <View key={p.id} style={[styles.processItem, p.status === 'DONE' && { opacity: 0.8 }]}>
                                    <View style={{ flex: 1 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <TextInput
                                                style={[styles.input, { flex: 2, marginBottom: 0 }]}
                                                placeholder="Proses Adı"
                                                value={p.name}
                                                onChangeText={(v) => !isEdit && handleUpdateProcess(p.id, 'name', v)}
                                                editable={!isEdit}
                                            />
                                            {isEdit ? (
                                                <View style={{ flex: 1, marginLeft: 8, flexDirection: 'row', alignItems: 'center' }}>
                                                    <TextInput
                                                        style={[styles.input, { flex: 1, marginBottom: 0 }]}
                                                        placeholder="Süre"
                                                        value={p.spent_time?.toString()}
                                                        onChangeText={(v) => handleUpdateProcess(p.id, 'spent_time', v)}
                                                        keyboardType="numeric"
                                                        placeholderTextColor="#94A3B8"
                                                    />
                                                    <TouchableOpacity
                                                        onPress={() => {
                                                            const newStatus = p.status === 'DONE' ? 'PENDING' : 'DONE';
                                                            handleUpdateProcess(p.id, 'status', newStatus);
                                                        }}
                                                        style={{ marginLeft: 12, padding: 4 }}
                                                    >
                                                        <Ionicons
                                                            name={p.status === 'DONE' ? "checkmark-circle" : "ellipse-outline"}
                                                            size={24}
                                                            color={p.status === 'DONE' ? "#22C55E" : "#CBD5E1"}
                                                        />
                                                    </TouchableOpacity>
                                                </View>
                                            ) : (
                                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                    <TextInput
                                                        style={[styles.input, { flex: 1, marginBottom: 0, marginLeft: 8, width: 80 }]}
                                                        placeholder="Süre"
                                                        value={p.duration}
                                                        onChangeText={(v) => handleUpdateProcess(p.id, 'duration', v)}
                                                        keyboardType="numeric"
                                                    />
                                                    <TouchableOpacity onPress={() => handleRemoveProcess(p.id)} style={{ marginLeft: 8 }}>
                                                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                                    </TouchableOpacity>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                </View>
                            ))}

                            {!isEdit && (
                                <TouchableOpacity style={styles.addProcessBtn} onPress={handleAddProcess}>
                                    <Ionicons name="add" size={18} color={Colors.primary} />
                                    <Text style={{ color: Colors.primary, fontWeight: '600', marginLeft: 4 }}>Proses Ekle</Text>
                                </TouchableOpacity>
                            )}

                            <Text style={styles.label}>Notlar</Text>
                            <TextInput
                                style={[styles.input, { height: 80 }]}
                                multiline
                                value={notes}
                                onChangeText={setNotes}
                                placeholder="Üretim ile ilgili notlar..."
                            />
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveWorkOrder}>
                                <Text style={styles.saveBtnText}>Kaydet</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal visible={closeModalVisible} animationType="fade" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { maxWidth: 650 }]}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>İş Emrini Kapat</Text>
                                <Text style={styles.modalSubtitle}>{products.find(p => p.id === selectedWo?.product_id)?.name}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setCloseModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#64748B" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.modalBody}>
                            <View style={styles.closureGrid}>
                                <View style={{ flex: 1, marginRight: 12 }}>
                                    <Text style={styles.label}>Gerçekleşen Üretim Miktarı</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={actualQuantity}
                                        onChangeText={setActualQuantity}
                                        keyboardType="numeric"
                                        placeholder="Üretilen miktar"
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>Fire / Hurda Miktarı</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={wasteQuantity}
                                        onChangeText={setWasteQuantity}
                                        keyboardType="numeric"
                                        placeholder="Fire miktarı"
                                    />
                                </View>
                            </View>

                            <Text style={[styles.label, { marginTop: 8, marginBottom: 12 }]}>Prosesleri Tamamla</Text>
                            {closingProcesses.map((p, index) => (
                                <View key={p.id} style={[styles.processItemClosure, p.status === 'DONE' && styles.processItemClosureDone]}>
                                    <View style={styles.processItemHeader}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.processItemName}>{p.name || `Proses ${index + 1}`}</Text>
                                            <Text style={styles.processItemTarget}>Hedef Süre: {p.duration || '0'} dk</Text>
                                        </View>
                                        <TouchableOpacity
                                            style={[styles.processStatusBtn, p.status === 'DONE' && styles.processStatusBtnActive]}
                                            onPress={() => {
                                                const newStatus = p.status === 'DONE' ? 'PENDING' : 'DONE';
                                                handleUpdateClosingProcess(p.id, 'status', newStatus);
                                            }}
                                        >
                                            <Ionicons
                                                name={p.status === 'DONE' ? "checkmark-circle" : "ellipse-outline"}
                                                size={18}
                                                color={p.status === 'DONE' ? "#fff" : "#94A3B8"}
                                            />
                                            <Text style={[styles.processStatusText, p.status === 'DONE' && styles.processStatusTextActive]}>
                                                {p.status === 'DONE' ? 'Tamamlandı' : 'Bekliyor'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                    <View style={styles.processItemBody}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.smallLabel}>Gerçekleşen Süre (dk)</Text>
                                            <TextInput
                                                style={[styles.input, { marginBottom: 0, paddingVertical: 8 }]}
                                                value={p.spent_time?.toString()}
                                                onChangeText={(v) => handleUpdateClosingProcess(p.id, 'spent_time', v)}
                                                keyboardType="numeric"
                                                placeholder="Süre girin..."
                                            />
                                        </View>
                                    </View>
                                </View>
                            ))}

                            <Text style={[styles.label, { marginTop: 12 }]}>Kapanış Notları</Text>
                            <TextInput
                                style={[styles.input, { height: 80 }]}
                                multiline
                                value={closureNotes}
                                onChangeText={setClosureNotes}
                                placeholder="Kapanış ile ilgili notlar..."
                            />
                        </ScrollView>
                        <View style={styles.modalFooter}>
                            <TouchableOpacity style={styles.saveBtn} onPress={handleCloseWorkOrder}>
                                <Text style={styles.saveBtnText}>Onayla ve Kapat</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Template Selection Modal */}
            <Modal visible={templateModalVisible} transparent={true} animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { maxWidth: 400 }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Şablon Seç</Text>
                            <TouchableOpacity onPress={() => setTemplateModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#64748B" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={{ maxHeight: 400 }}>
                            {processTemplates.length > 0 ? (
                                processTemplates.map(t => (
                                    <TouchableOpacity key={t.id} style={styles.templateItem} onPress={() => handleApplyTemplate(t)}>
                                        <Text style={styles.templateName}>{t.name}</Text>
                                        <Text style={styles.templateSub}>{t.processes.length} Proses</Text>
                                    </TouchableOpacity>
                                ))
                            ) : (
                                <Text style={{ padding: 20, textAlign: 'center', color: '#64748B' }}>Kayıtlı şablon bulunamadı.</Text>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24 },
    title: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
    addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
    addBtnText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },
    list: { padding: 16 },
    card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, borderWeight: 1, borderColor: '#F1F5F9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    cardWoNumber: { fontSize: 12, fontWeight: '800', color: Colors.primary, marginBottom: 4 },
    cardTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
    cardSubtitle: { fontSize: 14, color: '#64748B', marginTop: 4 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    statusText: { fontSize: 11, fontWeight: '800' },
    cardBody: { borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12, marginBottom: 16 },
    cardInfo: { fontSize: 14, color: '#475569', marginBottom: 4 },
    closeBtn: { backgroundColor: '#F1F5F9', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
    closeBtnText: { color: Colors.primary, fontWeight: '700' },
    emptyContainer: { alignItems: 'center', marginTop: 100 },
    emptyText: { marginTop: 16, color: '#94A3B8', fontSize: 16 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { backgroundColor: '#fff', width: '90%', maxWidth: 800, borderRadius: 24, overflow: 'hidden', maxHeight: '90%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    modalTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
    modalBody: { padding: 24 },
    label: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8 },
    input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 12, marginBottom: 20, fontSize: 14 },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 10, paddingHorizontal: 12, marginBottom: 12 },
    searchInput: { flex: 1, height: 40, fontSize: 14, color: '#1E293B', marginLeft: 8 },
    pickerContainer: { flexDirection: 'row', marginBottom: 20 },
    pickerItem: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F1F5F9', marginRight: 8, marginBottom: 8, height: 32, justifyContent: 'center' },
    pickerItemActive: { backgroundColor: Colors.primary },
    pickerText: { fontSize: 12, color: '#64748B' },
    pickerTextActive: { color: '#fff', fontWeight: '600' },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    smallBtn: { marginLeft: 12 },
    processItem: { marginBottom: 12 },
    processItemDone: { opacity: 0.8 },
    statusToggle: { marginLeft: 12, padding: 4 },
    statusToggleActive: {},
    modalFooter: { padding: 24, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
    saveBtn: { backgroundColor: Colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },

    templateItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    templateName: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
    templateSub: { fontSize: 12, color: '#64748B', marginTop: 2 },

    modalWoSub: { fontSize: 13, color: Colors.primary, fontWeight: '700', marginTop: 2 },
    modalSubtitle: { fontSize: 14, color: '#64748B', marginTop: 4 },
    closureGrid: { flexDirection: 'row', marginBottom: 20 },
    processItemClosure: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
    processItemClosureDone: { borderColor: '#22C55E', backgroundColor: '#F0FDF4' },
    processItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    processItemName: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
    processItemTarget: { fontSize: 12, color: '#64748B', marginTop: 2 },
    processStatusBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' },
    processStatusBtnActive: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
    processStatusText: { fontSize: 12, fontWeight: '600', color: '#64748B', marginLeft: 6 },
    processStatusTextActive: { color: '#fff' },
    processItemBody: { paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
    smallLabel: { fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 4, textTransform: 'uppercase' },
    smallInfo: { fontSize: 12, color: '#64748B', marginBottom: 8, fontStyle: 'italic' },
    calculatedNote: { fontSize: 12, fontWeight: '600', color: Colors.primary, marginBottom: 16, marginTop: -12 },
});
