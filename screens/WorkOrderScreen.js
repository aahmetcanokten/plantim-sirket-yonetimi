import React, { useState, useContext, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, ScrollView, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../AppContext';
import { Colors } from '../Theme';
import { useTranslation } from 'react-i18next';

const isWeb = Platform.OS === 'web';

export default function WorkOrderScreen() {
    const { t } = useTranslation();
    const { workOrders, addWorkOrder, updateWorkOrder, closeWorkOrder, products, processTemplates, addProcessTemplate, boms } = useContext(AppContext);

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
    const [selectedBomId, setSelectedBomId] = useState('');
    const [bomSearch, setBomSearch] = useState('');

    // Closure States
    const [actualQuantity, setActualQuantity] = useState('');
    const [wasteQuantity, setWasteQuantity] = useState('');
    const [closureNotes, setClosureNotes] = useState('');
    const [closingProcesses, setClosingProcesses] = useState([]);

    // List States
    const [searchQuery, setSearchQuery] = useState('');
    const [sortKey, setSortKey] = useState('date_desc'); // date_desc, date_asc, name_az, processes_desc

    // --- Stats ---
    const stats = useMemo(() => {
        if (!Array.isArray(workOrders)) return { open: 0, totalProcesses: 0, avgCompletion: 0 };
        const open = workOrders.filter(w => w.status === 'OPEN');
        const totalProcesses = open.reduce((s, w) => s + (w.processes?.length || 0), 0);
        const doneProcesses = open.reduce((s, w) => s + (w.processes?.filter(p => p.status === 'DONE').length || 0), 0);
        const avgCompletion = totalProcesses > 0 ? Math.round((doneProcesses / totalProcesses) * 100) : 0;
        return { open: open.length, totalProcesses, avgCompletion };
    }, [workOrders]);

    // --- Filtered & Sorted List ---
    const activeWorkOrders = useMemo(() => {
        if (!Array.isArray(workOrders)) return [];
        let list = workOrders.filter(wo => {
            if (wo.status !== 'OPEN') return false;
            if (searchQuery) {
                const product = products.find(p => p.id === wo.product_id);
                const pName = (product?.name || '').toLowerCase();
                const woNum = (wo.wo_number || '').toLowerCase();
                return pName.includes(searchQuery.toLowerCase()) || woNum.includes(searchQuery.toLowerCase());
            }
            return true;
        });
        switch (sortKey) {
            case 'date_asc': return [...list].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            case 'name_az': return [...list].sort((a, b) => {
                const pA = products.find(p => p.id === a.product_id)?.name || '';
                const pB = products.find(p => p.id === b.product_id)?.name || '';
                return pA.localeCompare(pB);
            });
            case 'processes_desc': return [...list].sort((a, b) => (b.processes?.length || 0) - (a.processes?.length || 0));
            default: return [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }
    }, [workOrders, searchQuery, sortKey, products]);

    // --- Helpers ---
    const getProcessCompletion = (wo) => {
        const total = wo.processes?.length || 0;
        if (total === 0) return { done: 0, total: 0, pct: 0 };
        const done = wo.processes.filter(p => p.status === 'DONE').length;
        return { done, total, pct: Math.round((done / total) * 100) };
    };

    const resetForm = () => {
        setProductId(''); setTargetQuantity(''); setNotes('');
        setProcesses([]); setRawMaterialId(''); setRawMaterialUsage('');
        setProductSearch(''); setRawMaterialSearch('');
        setSelectedBomId(''); setBomSearch('');
        setSelectedWo(null); setIsEdit(false);
    };

    const handleOpenModal = (wo = null) => {
        if (wo) {
            setSelectedWo(wo); setProductId(wo.product_id);
            setTargetQuantity(wo.target_quantity?.toString()); setNotes(wo.notes || '');
            setProcesses(wo.processes || []); setRawMaterialId(wo.raw_material_id || '');
            setRawMaterialUsage(wo.raw_material_usage?.toString() || '');
            setProductSearch(''); setRawMaterialSearch(''); setIsEdit(true);
        } else { resetForm(); }
        setModalVisible(true);
    };

    const handleOpenCloseModal = (wo) => {
        setSelectedWo(wo); setActualQuantity(wo.target_quantity?.toString());
        setWasteQuantity('0'); setClosureNotes('');
        setClosingProcesses(wo.processes?.map(p => ({ ...p })) || []);
        setCloseModalVisible(true);
    };

    const handleAddProcess = () => setProcesses([...processes, { id: Date.now(), name: '', duration: '', cost: '', status: 'PENDING' }]);
    const handleUpdateProcess = (id, field, value) => setProcesses(processes.map(p => p.id === id ? { ...p, [field]: value } : p));
    const handleUpdateClosingProcess = (id, field, value) => setClosingProcesses(closingProcesses.map(p => p.id === id ? { ...p, [field]: value } : p));
    const handleRemoveProcess = (id) => setProcesses(processes.filter(p => p.id !== id));

    const generateWoNumber = () => {
        const today = new Date();
        const dateStr = today.getFullYear().toString() + (today.getMonth() + 1).toString().padStart(2, '0') + today.getDate().toString().padStart(2, '0');
        const todaysOrders = workOrders.filter(wo => new Date(wo.created_at).toDateString() === today.toDateString());
        return `${dateStr}-${(todaysOrders.length + 1).toString().padStart(3, '0')}`;
    };

    const handleSaveWorkOrder = async () => {
        if (!productId || !targetQuantity) { Alert.alert('Hata', 'Lütfen ürün ve hedef miktar seçiniz.'); return; }

        const selectedBom = selectedBomId ? (boms || []).find(b => b.id === selectedBomId) : null;
        const bomComponents = selectedBom ? (selectedBom.components || []) : [];

        const woData = {
            product_id: productId, target_quantity: parseFloat(targetQuantity), notes, processes,
            raw_material_id: !selectedBomId ? (rawMaterialId || null) : null,
            raw_material_usage: !selectedBomId && rawMaterialId ? parseFloat(rawMaterialUsage || 0) : null,
            bom_id: selectedBomId || null,
            bom_components: bomComponents,
            wo_number: isEdit ? selectedWo.wo_number : generateWoNumber(),
            created_at: isEdit ? selectedWo.created_at : new Date().toISOString()
        };
        if (isEdit) { await updateWorkOrder({ ...selectedWo, ...woData }); }
        else { await addWorkOrder(woData); }
        setModalVisible(false);
    };

    const handleCloseWorkOrder = async () => {
        if (!actualQuantity) { Alert.alert('Hata', 'Lütfen üretilen miktarı giriniz.'); return; }
        const proceed = async () => {
            try {
                await closeWorkOrder(selectedWo.id, { actual_quantity: parseFloat(actualQuantity), waste_quantity: parseFloat(wasteQuantity || 0), closure_notes: closureNotes, processes: closingProcesses });
                setCloseModalVisible(false);
            } catch (e) { Alert.alert('Hata', 'İş emri kapatılırken bir sorun oluştu.'); }
        };
        if (Platform.OS === 'web') { if (window.confirm('İş emri kapatılacak ve üretilen miktar stoğa eklenecektir. Onaylıyor musunuz?')) await proceed(); }
        else { Alert.alert('Onay', 'İş emri kapatılacak. Onaylıyor musunuz?', [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Evet, Kapat', onPress: proceed }]); }
    };

    const handleSaveAsTemplate = () => {
        if (processes.length === 0) { Alert.alert('Hata', 'Kaydedilecek proses bulunamadı.'); return; }
        addProcessTemplate({ name: `Şablon ${new Date().toLocaleTimeString()}`, processes });
        Alert.alert('Başarılı', 'Proses şablonu kaydedildi.');
    };

    const handleApplyTemplate = (template) => {
        setProcesses(template.processes.map(p => ({ ...p, id: Date.now() + Math.random() })));
        setTemplateModalVisible(false);
    };

    // --- Render: Web Table Row ---
    const WebTableRow = ({ item, index }) => {
        const product = products.find(p => p.id === item.product_id);
        const cp = getProcessCompletion(item);
        return (
            <View style={[styles.webTableRow, index % 2 === 0 ? styles.webRowEven : styles.webRowOdd]}>
                <View style={{ flex: 1.4, justifyContent: 'center' }}>
                    <Text style={styles.webCellMono}>{item.wo_number || '—'}</Text>
                    <Text style={styles.webCellSub}>{new Date(item.created_at).toLocaleDateString('tr-TR')}</Text>
                </View>
                <View style={{ flex: 2.2, justifyContent: 'center' }}>
                    <Text style={styles.webCellBold} numberOfLines={1}>{product?.name || 'Bilinmeyen Ürün'}</Text>
                    {product?.category ? <Text style={styles.webCellSub}>{product.category}</Text> : null}
                </View>
                <View style={{ flex: 0.8, justifyContent: 'center', alignItems: 'center' }}>
                    <View style={styles.webQtyBadge}><Text style={styles.webQtyText}>{item.target_quantity}</Text></View>
                </View>
                <View style={{ flex: 1.8, justifyContent: 'center', paddingRight: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={styles.webCellSub}>{cp.done}/{cp.total} Proses</Text>
                        <Text style={[styles.webCellSub, { fontWeight: '700', color: cp.pct === 100 ? Colors.iosGreen : Colors.iosBlue }]}>{cp.pct}%</Text>
                    </View>
                    <View style={styles.progressTrack}>
                        <View style={[styles.progressBar, { width: `${cp.pct}%`, backgroundColor: cp.pct === 100 ? Colors.iosGreen : Colors.iosBlue }]} />
                    </View>
                </View>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <View style={[styles.statusBadge, { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' }]}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#F97316', marginRight: 5 }} />
                        <Text style={[styles.statusText, { color: '#C2410C' }]}>AÇIK</Text>
                    </View>
                </View>
                <View style={{ flex: 1.4, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
                    <TouchableOpacity style={[styles.webActionBtn, { backgroundColor: '#EFF6FF' }]} onPress={() => handleOpenModal(item)}>
                        <Ionicons name="create-outline" size={14} color={Colors.iosBlue} />
                        <Text style={[styles.webActionBtnText, { color: Colors.iosBlue }]}>Düzenle</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.webActionBtn, { backgroundColor: '#F0FDF4' }]} onPress={() => handleOpenCloseModal(item)}>
                        <Ionicons name="checkmark-done" size={14} color={Colors.iosGreen} />
                        <Text style={[styles.webActionBtnText, { color: Colors.iosGreen }]}>Kapat</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    // --- Render: Mobile Card ---
    const MobileCard = ({ item }) => {
        const product = products.find(p => p.id === item.product_id);
        const cp = getProcessCompletion(item);
        return (
            <TouchableOpacity style={styles.card} onPress={() => handleOpenModal(item)}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.cardWoNum}>{item.wo_number || 'No-#'}</Text>
                        <Text style={styles.cardTitle} numberOfLines={1}>{product?.name || 'Bilinmeyen'}</Text>
                        <Text style={styles.cardSub}>Hedef: {item.target_quantity} Adet • {new Date(item.created_at).toLocaleDateString('tr-TR')}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' }]}>
                        <Text style={[styles.statusText, { color: '#C2410C' }]}>AÇIK</Text>
                    </View>
                </View>
                {cp.total > 0 && (
                    <View style={{ marginBottom: 12 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text style={styles.cardSub}>{cp.done}/{cp.total} Proses Tamamlandı</Text>
                            <Text style={[styles.cardSub, { fontWeight: '700', color: Colors.iosBlue }]}>{cp.pct}%</Text>
                        </View>
                        <View style={styles.progressTrack}>
                            <View style={[styles.progressBar, { width: `${cp.pct}%`, backgroundColor: cp.pct === 100 ? Colors.iosGreen : Colors.iosBlue }]} />
                        </View>
                    </View>
                )}
                <TouchableOpacity style={styles.closeCardBtn} onPress={() => handleOpenCloseModal(item)}>
                    <Ionicons name="checkmark-done" size={16} color={Colors.iosGreen} />
                    <Text style={styles.closeCardBtnText}>İş Emrini Kapat</Text>
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    const SortButton = ({ label, value }) => (
        <TouchableOpacity style={[styles.sortBtn, sortKey === value && styles.sortBtnActive]} onPress={() => setSortKey(value)}>
            <Text style={[styles.sortBtnText, sortKey === value && styles.sortBtnTextActive]}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.pageHeader}>
                <View>
                    <Text style={styles.pageTitle}>Aktif İş Emirleri</Text>
                    <Text style={styles.pageSubtitle}>{stats.open} açık iş emri • Ortalama tamamlanma %{stats.avgCompletion}</Text>
                </View>
                <TouchableOpacity style={styles.newBtn} onPress={() => handleOpenModal()}>
                    <Ionicons name="add" size={18} color="#fff" />
                    <Text style={styles.newBtnText}>Yeni İş Emri</Text>
                </TouchableOpacity>
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
                <View style={[styles.statCard, { borderLeftColor: Colors.iosBlue }]}>
                    <View style={[styles.statIcon, { backgroundColor: '#EFF6FF' }]}><Ionicons name="construct-outline" size={20} color={Colors.iosBlue} /></View>
                    <View><Text style={styles.statVal}>{stats.open}</Text><Text style={styles.statLbl}>Açık Emir</Text></View>
                </View>
                <View style={[styles.statCard, { borderLeftColor: '#8B5CF6' }]}>
                    <View style={[styles.statIcon, { backgroundColor: '#F5F3FF' }]}><Ionicons name="list-outline" size={20} color="#8B5CF6" /></View>
                    <View><Text style={styles.statVal}>{stats.totalProcesses}</Text><Text style={styles.statLbl}>Toplam Proses</Text></View>
                </View>
                <View style={[styles.statCard, { borderLeftColor: Colors.iosGreen }]}>
                    <View style={[styles.statIcon, { backgroundColor: '#E6F4EA' }]}><Ionicons name="analytics-outline" size={20} color={Colors.iosGreen} /></View>
                    <View><Text style={styles.statVal}>%{stats.avgCompletion}</Text><Text style={styles.statLbl}>Ort. Tamamlanma</Text></View>
                </View>
            </View>

            {/* Toolbar */}
            <View style={styles.toolbar}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={16} color="#94A3B8" />
                    <TextInput style={styles.searchInput} placeholder="İş emri no veya ürün ara..." value={searchQuery} onChangeText={setSearchQuery} placeholderTextColor="#94A3B8" />
                    {searchQuery !== '' && <TouchableOpacity onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={18} color="#94A3B8" /></TouchableOpacity>}
                </View>
                <View style={styles.sortRow}>
                    <Text style={styles.sortLabel}>Sırala:</Text>
                    <SortButton label="En Yeni" value="date_desc" />
                    <SortButton label="En Eski" value="date_asc" />
                    <SortButton label="A-Z" value="name_az" />
                    <SortButton label="Proses ↓" value="processes_desc" />
                </View>
            </View>

            {/* List */}
            {isWeb ? (
                <View style={styles.webTableWrap}>
                    <View style={styles.webTableHeader}>
                        <Text style={[styles.webHeaderCell, { flex: 1.4 }]}>İŞ EMRİ NO</Text>
                        <Text style={[styles.webHeaderCell, { flex: 2.2 }]}>ÜRÜN</Text>
                        <Text style={[styles.webHeaderCell, { flex: 0.8, textAlign: 'center' }]}>HEDEF</Text>
                        <Text style={[styles.webHeaderCell, { flex: 1.8 }]}>PROSES İLERLEME</Text>
                        <Text style={[styles.webHeaderCell, { flex: 1, textAlign: 'center' }]}>DURUM</Text>
                        <Text style={[styles.webHeaderCell, { flex: 1.4, textAlign: 'right' }]}>İŞLEMLER</Text>
                    </View>
                    <FlatList
                        data={activeWorkOrders}
                        keyExtractor={i => i.id.toString()}
                        renderItem={({ item, index }) => <WebTableRow item={item} index={index} />}
                        contentContainerStyle={{ paddingBottom: 40 }}
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <Ionicons name="construct-outline" size={52} color="#CBD5E1" />
                                <Text style={styles.emptyText}>Aktif iş emri bulunamadı.</Text>
                                <TouchableOpacity style={styles.emptyBtn} onPress={() => handleOpenModal()}>
                                    <Text style={styles.emptyBtnText}>Yeni İş Emri Oluştur</Text>
                                </TouchableOpacity>
                            </View>
                        }
                    />
                </View>
            ) : (
                <FlatList
                    data={activeWorkOrders}
                    keyExtractor={i => i.id.toString()}
                    contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
                    renderItem={({ item }) => <MobileCard item={item} />}
                    ListEmptyComponent={<View style={styles.empty}><Ionicons name="construct-outline" size={52} color="#CBD5E1" /><Text style={styles.emptyText}>Aktif iş emri bulunamadı.</Text></View>}
                />
            )}

            {/* === YENİ İŞ EMRİ MODALI === */}
            <Modal visible={modalVisible} animationType={isWeb ? 'fade' : 'slide'} transparent>
                <View style={styles.overlay}>
                    <View style={[styles.modalBox, { maxWidth: 860 }]}>
                        <View style={styles.modalHead}>
                            <View>
                                <Text style={styles.modalTitle}>{isEdit ? 'İş Emri Detayı' : 'Yeni İş Emri'}</Text>
                                {isEdit && <Text style={styles.modalSub}>{selectedWo?.wo_number}</Text>}
                            </View>
                            <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={20} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24 }}>
                            {/* Ürün Seçimi */}
                            <View style={styles.formSection}>
                                <Text style={styles.sectionTitle}>Üretilecek Ürün</Text>
                                <View style={styles.searchBar}>
                                    <Ionicons name="search" size={16} color="#94A3B8" />
                                    <TextInput style={styles.searchInput} placeholder="Ürün adı veya kod ara..." value={productSearch} onChangeText={setProductSearch} placeholderTextColor="#94A3B8" />
                                </View>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                                    {products.filter(p => (p.name || '').toLowerCase().includes(productSearch.toLowerCase()) || (p.code || '').toLowerCase().includes(productSearch.toLowerCase()))
                                        .map(p => (
                                            <TouchableOpacity key={p.id} style={[styles.chip, productId === p.id && styles.chipActive]} onPress={() => setProductId(p.id)}>
                                                <Text style={[styles.chipText, productId === p.id && styles.chipTextActive]}>{p.name}</Text>
                                                {p.quantity !== undefined && <Text style={[styles.chipSub, productId === p.id && { color: 'rgba(255,255,255,0.8)' }]}>Stok: {p.quantity}</Text>}
                                            </TouchableOpacity>
                                        ))}
                                </ScrollView>

                                <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.label}>Hedef Miktar <Text style={{ color: Colors.critical }}>*</Text></Text>
                                        <TextInput style={styles.input} value={targetQuantity} onChangeText={setTargetQuantity} keyboardType="numeric" placeholder="Örn: 100" />
                                    </View>
                                </View>
                            </View>

                            {/* BOM veya Tek Hammadde */}
                            <View style={styles.formSection}>
                                <Text style={styles.sectionTitle}>BOM Reçetesi / Hammadde</Text>
                                <Text style={styles.hintText}>BOM seçerseniz tüm bileşenler otomatik eklenir. Yoksa tek hammadde seçebilirsiniz.</Text>

                                {/* BOM Seçimi */}
                                {(boms || []).length > 0 && !isEdit && (
                                    <View style={{ marginBottom: 12 }}>
                                        <Text style={styles.label}>BOM Reçetesi (Opsiyonel)</Text>
                                        <View style={styles.searchBar}>
                                            <Ionicons name="search" size={16} color="#94A3B8" />
                                            <TextInput style={styles.searchInput} placeholder="Reçete ara..." value={bomSearch} onChangeText={setBomSearch} placeholderTextColor="#94A3B8" />
                                        </View>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                                            <TouchableOpacity style={[styles.chip, !selectedBomId && styles.chipActive]} onPress={() => setSelectedBomId('')}>
                                                <Text style={[styles.chipText, !selectedBomId && styles.chipTextActive]}>BOM Yok</Text>
                                            </TouchableOpacity>
                                            {(boms || []).filter(b => (b.product_name || '').toLowerCase().includes(bomSearch.toLowerCase())).map(b => (
                                                <TouchableOpacity key={b.id} style={[styles.chip, selectedBomId === b.id && styles.chipActive]} onPress={() => setSelectedBomId(b.id)}>
                                                    <Text style={[styles.chipText, selectedBomId === b.id && styles.chipTextActive]}>{b.product_name}</Text>
                                                    <Text style={[styles.chipSub, selectedBomId === b.id && { color: 'rgba(255,255,255,0.8)' }]}>{b.bom_number}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                        {selectedBomId && (() => {
                                            const selBom = (boms || []).find(b => b.id === selectedBomId);
                                            if (!selBom) return null;
                                            return (
                                                <View style={{ backgroundColor: '#F5F3FF', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#C7D2FE' }}>
                                                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#6366F1', marginBottom: 6 }}>Bileşenler ({(selBom.components || []).length} kalem)</Text>
                                                    {(selBom.components || []).map((comp, ci) => (
                                                        <Text key={ci} style={{ fontSize: 12, color: '#475569', marginBottom: 2 }}>
                                                            • {comp.product_name} — x{comp.quantity} {comp.unit || ''}
                                                        </Text>
                                                    ))}
                                                </View>
                                            );
                                        })()}
                                    </View>
                                )}

                                {/* Tek Hammadde (BOM seçilmemişse) */}
                                {!selectedBomId && (
                                    <View>
                                        <Text style={styles.label}>Tek Hammadde (Opsiyonel)</Text>
                                        <View style={styles.searchBar}>
                                            <Ionicons name="search" size={16} color="#94A3B8" />
                                            <TextInput style={styles.searchInput} placeholder="Hammadde adı ara..." value={rawMaterialSearch} onChangeText={setRawMaterialSearch} placeholderTextColor="#94A3B8" />
                                        </View>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                                            <TouchableOpacity style={[styles.chip, !rawMaterialId && styles.chipActive]} onPress={() => setRawMaterialId('')}>
                                                <Text style={[styles.chipText, !rawMaterialId && styles.chipTextActive]}>Hiçbiri</Text>
                                            </TouchableOpacity>
                                            {products.filter(p => (p.name || '').toLowerCase().includes(rawMaterialSearch.toLowerCase()))
                                                .map(p => (
                                                    <TouchableOpacity key={p.id} style={[styles.chip, rawMaterialId === p.id && styles.chipActive]} onPress={() => setRawMaterialId(p.id)}>
                                                        <Text style={[styles.chipText, rawMaterialId === p.id && styles.chipTextActive]}>{p.name}</Text>
                                                    </TouchableOpacity>
                                                ))}
                                        </ScrollView>
                                        {rawMaterialId && (
                                            <View>
                                                <Text style={styles.label}>Birim Başına Kullanım Miktarı</Text>
                                                <TextInput style={styles.input} value={rawMaterialUsage} onChangeText={setRawMaterialUsage} keyboardType="numeric" placeholder="Örn: 0.5" />
                                                {rawMaterialUsage && targetQuantity && (
                                                    <Text style={styles.calcNote}>Toplam tahmini tüketim: {(parseFloat(rawMaterialUsage) * parseFloat(targetQuantity || 0)).toFixed(2)} {products.find(p => p.id === rawMaterialId)?.unit || 'Birim'}</Text>
                                                )}
                                            </View>
                                        )}
                                    </View>
                                )}

                            </View>

                            {/* Prosesler */}
                            <View style={styles.formSection}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                    <Text style={styles.sectionTitle}>Prosesler ve Aşamalar</Text>
                                    {!isEdit && (
                                        <View style={{ flexDirection: 'row', gap: 8 }}>
                                            <TouchableOpacity style={styles.smallLinkBtn} onPress={() => setTemplateModalVisible(true)}>
                                                <Ionicons name="albums-outline" size={14} color={Colors.iosBlue} />
                                                <Text style={styles.smallLinkText}>Şablondan Al</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={styles.smallLinkBtn} onPress={handleSaveAsTemplate}>
                                                <Ionicons name="bookmark-outline" size={14} color={Colors.iosBlue} />
                                                <Text style={styles.smallLinkText}>Şablon Kaydet</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                                {processes.map((p, idx) => (
                                    <View key={p.id} style={[styles.processRow, p.status === 'DONE' && styles.processRowDone]}>
                                        <View style={styles.processRowNum}>
                                            <Text style={styles.processNumText}>{idx + 1}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <TextInput
                                                style={[styles.input, { marginBottom: 0 }]}
                                                placeholder="Proses adı (Örn: Kesim, Kaynak...)"
                                                value={p.name}
                                                onChangeText={v => !isEdit && handleUpdateProcess(p.id, 'name', v)}
                                                editable={!isEdit}
                                            />
                                        </View>
                                        <View style={{ width: 80, marginLeft: 8 }}>
                                            <TextInput
                                                style={[styles.input, { marginBottom: 0, textAlign: 'center' }]}
                                                placeholder="dk"
                                                value={isEdit ? p.spent_time?.toString() : p.duration}
                                                onChangeText={v => handleUpdateProcess(p.id, isEdit ? 'spent_time' : 'duration', v)}
                                                keyboardType="numeric"
                                            />
                                        </View>
                                        {isEdit ? (
                                            <TouchableOpacity
                                                style={[styles.processToggle, p.status === 'DONE' && styles.processToggleDone]}
                                                onPress={() => handleUpdateProcess(p.id, 'status', p.status === 'DONE' ? 'PENDING' : 'DONE')}
                                            >
                                                <Ionicons name={p.status === 'DONE' ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={p.status === 'DONE' ? '#fff' : '#94A3B8'} />
                                            </TouchableOpacity>
                                        ) : (
                                            <TouchableOpacity style={styles.processRemoveBtn} onPress={() => handleRemoveProcess(p.id)}>
                                                <Ionicons name="trash-outline" size={18} color={Colors.critical} />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                ))}
                                {!isEdit && (
                                    <TouchableOpacity style={styles.addProcessBtn} onPress={handleAddProcess}>
                                        <Ionicons name="add-circle-outline" size={18} color={Colors.iosBlue} />
                                        <Text style={styles.addProcessText}>Proses Ekle</Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* Notlar */}
                            <View style={styles.formSection}>
                                <Text style={styles.sectionTitle}>Notlar</Text>
                                <TextInput style={[styles.input, { height: 80 }]} multiline value={notes} onChangeText={setNotes} placeholder="Üretim ile ilgili notlar..." />
                            </View>
                        </ScrollView>

                        <View style={styles.modalFoot}>
                            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveWorkOrder}>
                                <Ionicons name="checkmark-circle" size={18} color="#fff" style={{ marginRight: 8 }} />
                                <Text style={styles.saveBtnText}>Kaydet</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* === KAPATMA MODALI === */}
            <Modal visible={closeModalVisible} animationType="fade" transparent>
                <View style={styles.overlay}>
                    <View style={[styles.modalBox, { maxWidth: 680 }]}>
                        <View style={styles.modalHead}>
                            <View>
                                <Text style={styles.modalTitle}>İş Emrini Kapat</Text>
                                <Text style={styles.modalSub}>{products.find(p => p.id === selectedWo?.product_id)?.name} • {selectedWo?.wo_number}</Text>
                            </View>
                            <TouchableOpacity style={styles.closeBtn} onPress={() => setCloseModalVisible(false)}>
                                <Ionicons name="close" size={20} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24 }}>
                            <View style={styles.formSection}>
                                <Text style={styles.sectionTitle}>Üretim Sonucu</Text>
                                <View style={{ flexDirection: 'row', gap: 12 }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.label}>Gerçekleşen Üretim <Text style={{ color: Colors.critical }}>*</Text></Text>
                                        <TextInput style={styles.input} value={actualQuantity} onChangeText={setActualQuantity} keyboardType="numeric" placeholder="Üretilen miktar" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.label}>Fire / Hurda Miktarı</Text>
                                        <TextInput style={styles.input} value={wasteQuantity} onChangeText={setWasteQuantity} keyboardType="numeric" placeholder="0" />
                                    </View>
                                </View>
                                {actualQuantity && selectedWo?.target_quantity && (
                                    <View style={styles.efficiencyBox}>
                                        <Ionicons name="analytics" size={16} color={Colors.iosBlue} />
                                        <Text style={styles.efficiencyText}>
                                            Verimlilik: %{Math.min(100, Math.round((parseFloat(actualQuantity) / selectedWo.target_quantity) * 100))}
                                            {wasteQuantity && parseFloat(wasteQuantity) > 0 ? ` • Fire: ${wasteQuantity} adet` : ''}
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {closingProcesses.length > 0 && (
                                <View style={styles.formSection}>
                                    <Text style={styles.sectionTitle}>Proses Tamamlama</Text>
                                    {closingProcesses.map((p, idx) => (
                                        <View key={p.id} style={[styles.closureProcessCard, p.status === 'DONE' && styles.closureProcessCardDone]}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                                <View>
                                                    <Text style={styles.closureProcessName}>{p.name || `Proses ${idx + 1}`}</Text>
                                                    <Text style={styles.closureProcessTarget}>Hedef Süre: {p.duration || '0'} dk</Text>
                                                </View>
                                                <TouchableOpacity
                                                    style={[styles.processToggle, p.status === 'DONE' && styles.processToggleDone]}
                                                    onPress={() => handleUpdateClosingProcess(p.id, 'status', p.status === 'DONE' ? 'PENDING' : 'DONE')}
                                                >
                                                    <Ionicons name={p.status === 'DONE' ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={p.status === 'DONE' ? '#fff' : '#94A3B8'} />
                                                    <Text style={[{ fontSize: 12, fontWeight: '700', marginLeft: 4 }, p.status === 'DONE' ? { color: '#fff' } : { color: '#94A3B8' }]}>
                                                        {p.status === 'DONE' ? 'Tamamlandı' : 'Bekliyor'}
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                            <View>
                                                <Text style={styles.label}>Gerçekleşen Süre (dk)</Text>
                                                <TextInput
                                                    style={[styles.input, { marginBottom: 0 }]}
                                                    value={p.spent_time?.toString()}
                                                    onChangeText={v => handleUpdateClosingProcess(p.id, 'spent_time', v)}
                                                    keyboardType="numeric"
                                                    placeholder="Süre girin..."
                                                />
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            )}

                            <View style={styles.formSection}>
                                <Text style={styles.sectionTitle}>Kapanış Notları</Text>
                                <TextInput style={[styles.input, { height: 80 }]} multiline value={closureNotes} onChangeText={setClosureNotes} placeholder="Kapanış ile ilgili notlar..." />
                            </View>
                        </ScrollView>

                        <View style={styles.modalFoot}>
                            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: Colors.iosGreen }]} onPress={handleCloseWorkOrder}>
                                <Ionicons name="lock-closed" size={18} color="#fff" style={{ marginRight: 8 }} />
                                <Text style={styles.saveBtnText}>Onayla ve Kapat</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Şablon Modal */}
            <Modal visible={templateModalVisible} transparent animationType="fade">
                <View style={styles.overlay}>
                    <View style={[styles.modalBox, { maxWidth: 400 }]}>
                        <View style={styles.modalHead}>
                            <Text style={styles.modalTitle}>Şablon Seç</Text>
                            <TouchableOpacity style={styles.closeBtn} onPress={() => setTemplateModalVisible(false)}>
                                <Ionicons name="close" size={20} color="#64748B" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={{ maxHeight: 400, padding: 16 }}>
                            {processTemplates.length > 0 ? processTemplates.map(tmpl => (
                                <TouchableOpacity key={tmpl.id} style={styles.templateRow} onPress={() => handleApplyTemplate(tmpl)}>
                                    <Ionicons name="albums-outline" size={18} color={Colors.iosBlue} style={{ marginRight: 10 }} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.templateName}>{tmpl.name}</Text>
                                        <Text style={styles.templateSub}>{tmpl.processes.length} Proses</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                                </TouchableOpacity>
                            )) : (
                                <Text style={{ padding: 20, textAlign: 'center', color: '#94A3B8' }}>Kayıtlı şablon bulunamadı.</Text>
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

    // Header
    pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 },
    pageTitle: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
    pageSubtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
    newBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.iosBlue, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, gap: 6, ...Platform.select({ web: { boxShadow: '0 2px 8px rgba(0,122,255,0.3)', cursor: 'pointer' } }) },
    newBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

    // Stats
    statsRow: { flexDirection: 'row', paddingHorizontal: 24, gap: 12, marginBottom: 16 },
    statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderLeftWidth: 4, ...Platform.select({ web: { boxShadow: '0 1px 4px rgba(0,0,0,0.06)' } }) },
    statIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    statVal: { fontSize: 22, fontWeight: '800', color: '#0F172A' },
    statLbl: { fontSize: 11, color: '#64748B', fontWeight: '500', marginTop: 2 },

    // Toolbar
    toolbar: { paddingHorizontal: 24, marginBottom: 12 },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 10, gap: 8 },
    searchInput: { flex: 1, fontSize: 14, color: '#1E293B', outlineStyle: 'none' },
    sortRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    sortLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '600', marginRight: 4 },
    sortBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
    sortBtnActive: { backgroundColor: Colors.iosBlue, borderColor: Colors.iosBlue },
    sortBtnText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
    sortBtnTextActive: { color: '#fff' },

    // Web Table
    webTableWrap: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden', marginHorizontal: 24, marginBottom: 40, ...Platform.select({ web: { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' } }) },
    webTableHeader: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderBottomWidth: 2, borderBottomColor: '#E2E8F0', paddingVertical: 12, paddingHorizontal: 16 },
    webHeaderCell: { fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 },
    webTableRow: { flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', alignItems: 'center' },
    webRowEven: { backgroundColor: '#fff' },
    webRowOdd: { backgroundColor: '#FAFBFC' },
    webCellBold: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
    webCellSub: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
    webCellMono: { fontSize: 13, fontWeight: '700', color: Colors.iosBlue, fontFamily: Platform.OS === 'web' ? 'monospace' : 'System' },
    webQtyBadge: { backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    webQtyText: { fontSize: 13, fontWeight: '700', color: Colors.iosBlue },
    webActionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 8, gap: 4, ...Platform.select({ web: { cursor: 'pointer' } }) },
    webActionBtnText: { fontSize: 12, fontWeight: '700' },

    // Progress
    progressTrack: { height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden' },
    progressBar: { height: 6, borderRadius: 3 },

    // Status
    statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
    statusText: { fontSize: 11, fontWeight: '800' },

    // Mobile Card
    card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', ...Platform.select({ web: { boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }, default: { elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 } }) },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    cardWoNum: { fontSize: 11, fontWeight: '800', color: Colors.iosBlue, marginBottom: 2 },
    cardTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A' },
    cardSub: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
    closeCardBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ECFDF5', paddingVertical: 10, borderRadius: 10, gap: 6, marginTop: 4 },
    closeCardBtnText: { color: Colors.iosGreen, fontWeight: '700', fontSize: 14 },

    // Empty
    empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 },
    emptyText: { marginTop: 12, fontSize: 15, color: '#94A3B8', textAlign: 'center' },
    emptyBtn: { marginTop: 16, backgroundColor: Colors.iosBlue, paddingVertical: 10, paddingHorizontal: 24, borderRadius: 10 },
    emptyBtnText: { color: '#fff', fontWeight: '700' },

    // Modal
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalBox: { backgroundColor: '#fff', width: '94%', maxHeight: '92%', borderRadius: 20, overflow: 'hidden', ...Platform.select({ web: { boxShadow: '0 20px 60px rgba(0,0,0,0.25)' } }) },
    modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    modalTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
    modalSub: { fontSize: 13, color: Colors.iosBlue, fontWeight: '700', marginTop: 2 },
    closeBtn: { padding: 8, backgroundColor: '#F1F5F9', borderRadius: 10 },
    modalFoot: { padding: 20, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
    saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.iosBlue, paddingVertical: 14, borderRadius: 12 },
    saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },

    // Form
    formSection: { marginBottom: 20, backgroundColor: '#F8FAFC', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
    sectionTitle: { fontSize: 13, fontWeight: '800', color: Colors.iosBlue, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
    label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 },
    input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 12, marginBottom: 12, fontSize: 14, color: '#1E293B' },
    hintText: { fontSize: 12, color: '#94A3B8', fontStyle: 'italic', marginBottom: 10 },
    calcNote: { fontSize: 12, fontWeight: '600', color: Colors.iosBlue, marginTop: -6, marginBottom: 12 },
    chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F1F5F9', marginRight: 8, borderWidth: 1, borderColor: '#E2E8F0', minWidth: 60, alignItems: 'center' },
    chipActive: { backgroundColor: Colors.iosBlue, borderColor: Colors.iosBlue },
    chipText: { fontSize: 13, color: '#475569', fontWeight: '600' },
    chipTextActive: { color: '#fff' },
    chipSub: { fontSize: 10, color: '#94A3B8', marginTop: 1 },

    // Process Row
    processRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, backgroundColor: '#fff', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' },
    processRowDone: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
    processRowNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
    processNumText: { fontSize: 12, fontWeight: '800', color: Colors.iosBlue },
    processToggle: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', flexDirection: 'row' },
    processToggleDone: { backgroundColor: Colors.iosGreen, borderColor: Colors.iosGreen },
    processRemoveBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    addProcessBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, justifyContent: 'center', gap: 6, borderWidth: 1, borderStyle: 'dashed', borderColor: Colors.iosBlue, borderRadius: 10, marginTop: 4 },
    addProcessText: { color: Colors.iosBlue, fontWeight: '700', fontSize: 14 },

    // Closure
    closureProcessCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0' },
    closureProcessCardDone: { borderColor: '#22C55E', backgroundColor: '#F0FDF4' },
    closureProcessName: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
    closureProcessTarget: { fontSize: 12, color: '#64748B', marginTop: 2 },
    efficiencyBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', borderRadius: 8, padding: 10, marginTop: 4, gap: 8 },
    efficiencyText: { fontSize: 13, fontWeight: '700', color: Colors.iosBlue },

    // Template
    smallLinkBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#EFF6FF', borderRadius: 8 },
    smallLinkText: { fontSize: 12, fontWeight: '700', color: Colors.iosBlue },
    templateRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', borderRadius: 8 },
    templateName: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
    templateSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
});
