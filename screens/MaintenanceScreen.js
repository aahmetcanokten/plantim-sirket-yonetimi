import React, { useState, useContext, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, ScrollView, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../AppContext';
import { Colors } from '../Theme';

const isWeb = Platform.OS === 'web';

const TYPES = ['MAINTENANCE', 'SERVICE'];
const TYPE_LABELS = { MAINTENANCE: 'Bakım', SERVICE: 'Servis' };
const PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];
const PRIORITY_LABELS = { LOW: 'Düşük', NORMAL: 'Normal', HIGH: 'Yüksek', URGENT: 'Acil' };
const PRIORITY_COLORS = {
    LOW: { bg: '#F0FDF4', border: '#BBF7D0', text: '#15803D', dot: '#22C55E' },
    NORMAL: { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8', dot: '#3B82F6' },
    HIGH: { bg: '#FFF7ED', border: '#FED7AA', text: '#C2410C', dot: '#F97316' },
    URGENT: { bg: '#FEF2F2', border: '#FECACA', text: '#B91C1C', dot: '#EF4444' },
};

export default function MaintenanceScreen() {
    const { maintenanceRequests, addMaintenanceRequest, updateMaintenanceRequest, closeMaintenanceRequest, deleteMaintenanceRequest, personnel } = useContext(AppContext);

    const [modalVisible, setModalVisible] = useState(false);
    const [closeModalVisible, setCloseModalVisible] = useState(false);
    const [selectedMr, setSelectedMr] = useState(null);
    const [isEdit, setIsEdit] = useState(false);

    // Form States
    const [title, setTitle] = useState('');
    const [type, setType] = useState('MAINTENANCE');
    const [priority, setPriority] = useState('NORMAL');
    const [assetName, setAssetName] = useState('');
    const [assignedTo, setAssignedTo] = useState('');
    const [plannedDate, setPlannedDate] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [description, setDescription] = useState('');
    const [estimatedCost, setEstimatedCost] = useState('');
    const [tasks, setTasks] = useState([]);

    // Closure States
    const [actualCost, setActualCost] = useState('');
    const [closureNotes, setClosureNotes] = useState('');
    const [closingTasks, setClosingTasks] = useState([]);

    // List States
    const [searchQuery, setSearchQuery] = useState('');
    const [sortKey, setSortKey] = useState('date_desc');

    // --- Stats ---
    const stats = useMemo(() => {
        const open = (maintenanceRequests || []).filter(m => m.status === 'OPEN');
        const urgent = open.filter(m => m.priority === 'URGENT' || m.priority === 'HIGH').length;
        const totalTasks = open.reduce((s, m) => s + (m.tasks?.length || 0), 0);
        const doneTasks = open.reduce((s, m) => s + (m.tasks?.filter(t => t.status === 'DONE').length || 0), 0);
        const avgCompletion = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
        return { open: open.length, urgent, avgCompletion };
    }, [maintenanceRequests]);

    // --- Filtered & Sorted ---
    const activeMrs = useMemo(() => {
        let list = (maintenanceRequests || []).filter(m => {
            if (m.status !== 'OPEN') return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                return (m.title || '').toLowerCase().includes(q) || (m.mr_number || '').toLowerCase().includes(q) || (m.asset_name || '').toLowerCase().includes(q);
            }
            return true;
        });
        const priorityOrder = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
        switch (sortKey) {
            case 'date_asc': return [...list].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            case 'name_az': return [...list].sort((a, b) => (a.title || '').localeCompare(b.title || ''));
            case 'priority': return [...list].sort((a, b) => (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2));
            default: return [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }
    }, [maintenanceRequests, searchQuery, sortKey]);

    // --- Helpers ---
    const getTaskCompletion = (mr) => {
        const total = mr.tasks?.length || 0;
        if (total === 0) return { done: 0, total: 0, pct: 0 };
        const done = mr.tasks.filter(t => t.status === 'DONE').length;
        return { done, total, pct: Math.round((done / total) * 100) };
    };

    const formatDate = (iso) => {
        if (!iso) return '-';
        try { return new Date(iso).toLocaleDateString('tr-TR'); } catch { return iso; }
    };

    const resetForm = () => {
        setTitle(''); setType('MAINTENANCE'); setPriority('NORMAL');
        setAssetName(''); setAssignedTo(''); setPlannedDate(''); setDueDate('');
        setDescription(''); setEstimatedCost(''); setTasks([]);
        setSelectedMr(null); setIsEdit(false);
    };

    const handleOpenModal = (mr = null) => {
        if (mr) {
            setSelectedMr(mr); setTitle(mr.title || ''); setType(mr.type || 'MAINTENANCE');
            setPriority(mr.priority || 'NORMAL'); setAssetName(mr.asset_name || '');
            setAssignedTo(mr.assigned_to || ''); setPlannedDate(mr.planned_date || '');
            setDueDate(mr.due_date || ''); setDescription(mr.description || '');
            setEstimatedCost(mr.estimated_cost?.toString() || ''); setTasks(mr.tasks || []);
            setIsEdit(true);
        } else { resetForm(); }
        setModalVisible(true);
    };

    const handleOpenCloseModal = (mr) => {
        setSelectedMr(mr);
        setActualCost(mr.estimated_cost?.toString() || '');
        setClosureNotes('');
        setClosingTasks(mr.tasks?.map(t => ({ ...t })) || []);
        setCloseModalVisible(true);
    };

    const handleAddTask = () => setTasks([...tasks, { id: Date.now(), name: '', duration: '', status: 'PENDING' }]);
    const handleUpdateTask = (id, field, value) => setTasks(tasks.map(t => t.id === id ? { ...t, [field]: value } : t));
    const handleRemoveTask = (id) => setTasks(tasks.filter(t => t.id !== id));
    const handleUpdateClosingTask = (id, field, value) => setClosingTasks(closingTasks.map(t => t.id === id ? { ...t, [field]: value } : t));

    const handleSave = async () => {
        if (!title.trim()) { Alert.alert('Hata', 'Lütfen bir başlık giriniz.'); return; }
        const mrData = {
            title, type, priority, asset_name: assetName, assigned_to: assignedTo,
            planned_date: plannedDate || null, due_date: dueDate || null,
            description, estimated_cost: estimatedCost ? parseFloat(estimatedCost) : null, tasks,
        };
        if (isEdit) { await updateMaintenanceRequest({ ...selectedMr, ...mrData }); }
        else { await addMaintenanceRequest(mrData); }
        setModalVisible(false);
    };

    const handleClose = async () => {
        const proceed = async () => {
            try {
                await closeMaintenanceRequest(selectedMr.id, {
                    actual_cost: actualCost ? parseFloat(actualCost) : null,
                    closure_notes: closureNotes, tasks: closingTasks
                });
                setCloseModalVisible(false);
            } catch { Alert.alert('Hata', 'Bakım talebi kapatılırken bir sorun oluştu.'); }
        };
        if (Platform.OS === 'web') {
            if (window.confirm('Bu bakım/servis talebi kapatılacak ve arşive taşınacaktır. Onaylıyor musunuz?')) await proceed();
        } else {
            Alert.alert('Onay', 'Talebi kapat?', [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Evet, Kapat', onPress: proceed }]);
        }
    };

    const handleDelete = (mr) => {
        const proceed = () => deleteMaintenanceRequest(mr.id);
        if (Platform.OS === 'web') {
            if (window.confirm(`"${mr.title}" silinecek. Emin misiniz?`)) proceed();
        } else {
            Alert.alert('Sil', 'Bu kayıt silinsin mi?', [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Sil', style: 'destructive', onPress: proceed }]);
        }
    };

    // --- Render: Web Table Row ---
    const WebTableRow = ({ item, index }) => {
        const cp = getTaskCompletion(item);
        const pc = PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.NORMAL;
        return (
            <View style={[styles.webTableRow, index % 2 === 0 ? styles.webRowEven : styles.webRowOdd]}>
                <View style={{ flex: 1.4, justifyContent: 'center' }}>
                    <Text style={styles.webCellMono}>{item.mr_number || '—'}</Text>
                    <Text style={styles.webCellSub}>{formatDate(item.created_at)}</Text>
                </View>
                <View style={{ flex: 0.9, justifyContent: 'center', alignItems: 'center' }}>
                    <View style={[styles.typeBadge, { backgroundColor: item.type === 'SERVICE' ? '#F5F3FF' : '#EFF6FF', borderColor: item.type === 'SERVICE' ? '#DDD6FE' : '#BFDBFE' }]}>
                        <Ionicons name={item.type === 'SERVICE' ? 'construct-outline' : 'build-outline'} size={11} color={item.type === 'SERVICE' ? '#7C3AED' : '#1D4ED8'} />
                        <Text style={[styles.typeBadgeText, { color: item.type === 'SERVICE' ? '#7C3AED' : '#1D4ED8' }]}>{TYPE_LABELS[item.type] || item.type}</Text>
                    </View>
                </View>
                <View style={{ flex: 2.2, justifyContent: 'center' }}>
                    <Text style={styles.webCellBold} numberOfLines={1}>{item.title}</Text>
                    {item.asset_name ? <Text style={styles.webCellSub}>{item.asset_name}</Text> : null}
                </View>
                <View style={{ flex: 0.9, justifyContent: 'center', alignItems: 'center' }}>
                    <View style={[styles.priorityBadge, { backgroundColor: pc.bg, borderColor: pc.border }]}>
                        <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: pc.dot, marginRight: 4 }} />
                        <Text style={[styles.priorityText, { color: pc.text }]}>{PRIORITY_LABELS[item.priority] || item.priority}</Text>
                    </View>
                </View>
                <View style={{ flex: 1.6, justifyContent: 'center', paddingRight: 12 }}>
                    {cp.total > 0 ? (
                        <>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                <Text style={styles.webCellSub}>{cp.done}/{cp.total} Görev</Text>
                                <Text style={[styles.webCellSub, { fontWeight: '700', color: cp.pct === 100 ? Colors.iosGreen : Colors.iosBlue }]}>{cp.pct}%</Text>
                            </View>
                            <View style={styles.progressTrack}>
                                <View style={[styles.progressBar, { width: `${cp.pct}%`, backgroundColor: cp.pct === 100 ? Colors.iosGreen : Colors.iosBlue }]} />
                            </View>
                        </>
                    ) : <Text style={styles.webCellSub}>Görev yok</Text>}
                </View>
                <View style={{ flex: 1, justifyContent: 'center' }}>
                    {item.planned_date ? (
                        <Text style={styles.webCellSub}>Plan: {formatDate(item.planned_date)}</Text>
                    ) : null}
                    {item.due_date ? (
                        <Text style={[styles.webCellSub, { color: '#F97316' }]}>Son: {formatDate(item.due_date)}</Text>
                    ) : null}
                    {!item.planned_date && !item.due_date ? <Text style={styles.webCellSub}>—</Text> : null}
                </View>
                <View style={{ flex: 1.6, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 5 }}>
                    <TouchableOpacity style={[styles.webActionBtn, { backgroundColor: '#EFF6FF' }]} onPress={() => handleOpenModal(item)}>
                        <Ionicons name="create-outline" size={13} color={Colors.iosBlue} />
                        <Text style={[styles.webActionBtnText, { color: Colors.iosBlue }]}>Düzenle</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.webActionBtn, { backgroundColor: '#F0FDF4' }]} onPress={() => handleOpenCloseModal(item)}>
                        <Ionicons name="checkmark-done" size={13} color={Colors.iosGreen} />
                        <Text style={[styles.webActionBtnText, { color: Colors.iosGreen }]}>Kapat</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.webActionBtn, { backgroundColor: '#FEF2F2' }]} onPress={() => handleDelete(item)}>
                        <Ionicons name="trash-outline" size={13} color={Colors.critical} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    // --- Render: Mobile Card ---
    const MobileCard = ({ item }) => {
        const cp = getTaskCompletion(item);
        const pc = PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.NORMAL;
        return (
            <TouchableOpacity style={styles.card} onPress={() => handleOpenModal(item)}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.cardMrNum}>{item.mr_number || 'MR-#'}</Text>
                        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                        {item.asset_name ? <Text style={styles.cardSub}>{item.asset_name}</Text> : null}
                    </View>
                    <View style={[styles.priorityBadge, { backgroundColor: pc.bg, borderColor: pc.border }]}>
                        <Text style={[styles.priorityText, { color: pc.text }]}>{PRIORITY_LABELS[item.priority]}</Text>
                    </View>
                </View>
                {cp.total > 0 && (
                    <View style={{ marginBottom: 10 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text style={styles.cardSub}>{cp.done}/{cp.total} Görev</Text>
                            <Text style={[styles.cardSub, { fontWeight: '700', color: Colors.iosBlue }]}>{cp.pct}%</Text>
                        </View>
                        <View style={styles.progressTrack}>
                            <View style={[styles.progressBar, { width: `${cp.pct}%`, backgroundColor: Colors.iosBlue }]} />
                        </View>
                    </View>
                )}
                <TouchableOpacity style={styles.closeCardBtn} onPress={() => handleOpenCloseModal(item)}>
                    <Ionicons name="checkmark-done" size={15} color={Colors.iosGreen} />
                    <Text style={styles.closeCardBtnText}>Talebi Kapat</Text>
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    const SortButton = ({ label, value }) => (
        <TouchableOpacity style={[styles.sortBtn, sortKey === value && styles.sortBtnActive]} onPress={() => setSortKey(value)}>
            <Text style={[styles.sortBtnText, sortKey === value && styles.sortBtnTextActive]}>{label}</Text>
        </TouchableOpacity>
    );

    const SelectChip = ({ label, value, selected, onPress, color }) => (
        <TouchableOpacity
            style={[styles.chip, selected && (color ? { backgroundColor: color, borderColor: color } : styles.chipActive)]}
            onPress={onPress}
        >
            <Text style={[styles.chipText, selected && styles.chipTextActive]}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.pageHeader}>
                <View>
                    <Text style={styles.pageTitle}>Bakım ve Servis Yönetimi</Text>
                    <Text style={styles.pageSubtitle}>{stats.open} açık talep • {stats.urgent} yüksek öncelikli</Text>
                </View>
                <TouchableOpacity style={styles.newBtn} onPress={() => handleOpenModal()}>
                    <Ionicons name="add" size={18} color="#fff" />
                    <Text style={styles.newBtnText}>Yeni Plan Oluştur</Text>
                </TouchableOpacity>
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
                <View style={[styles.statCard, { borderLeftColor: '#8B5CF6' }]}>
                    <View style={[styles.statIcon, { backgroundColor: '#F5F3FF' }]}><Ionicons name="build-outline" size={20} color="#8B5CF6" /></View>
                    <View><Text style={styles.statVal}>{stats.open}</Text><Text style={styles.statLbl}>Açık Talep</Text></View>
                </View>
                <View style={[styles.statCard, { borderLeftColor: Colors.critical }]}>
                    <View style={[styles.statIcon, { backgroundColor: '#FEF2F2' }]}><Ionicons name="alert-circle-outline" size={20} color={Colors.critical} /></View>
                    <View><Text style={[styles.statVal, { color: stats.urgent > 0 ? Colors.critical : '#0F172A' }]}>{stats.urgent}</Text><Text style={styles.statLbl}>Yüksek Öncelikli</Text></View>
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
                    <TextInput style={styles.searchInput} placeholder="Talep no, başlık veya ekipman ara..." value={searchQuery} onChangeText={setSearchQuery} placeholderTextColor="#94A3B8" />
                    {searchQuery !== '' && <TouchableOpacity onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={18} color="#94A3B8" /></TouchableOpacity>}
                </View>
                <View style={styles.sortRow}>
                    <Text style={styles.sortLabel}>Sırala:</Text>
                    <SortButton label="En Yeni" value="date_desc" />
                    <SortButton label="En Eski" value="date_asc" />
                    <SortButton label="A-Z" value="name_az" />
                    <SortButton label="Öncelik" value="priority" />
                </View>
            </View>

            {/* List */}
            {isWeb ? (
                <View style={styles.webTableWrap}>
                    <View style={styles.webTableHeader}>
                        <Text style={[styles.webHeaderCell, { flex: 1.4 }]}>TALEP NO</Text>
                        <Text style={[styles.webHeaderCell, { flex: 0.9, textAlign: 'center' }]}>TİP</Text>
                        <Text style={[styles.webHeaderCell, { flex: 2.2 }]}>BAŞLIK / EKİPMAN</Text>
                        <Text style={[styles.webHeaderCell, { flex: 0.9, textAlign: 'center' }]}>ÖNCELİK</Text>
                        <Text style={[styles.webHeaderCell, { flex: 1.6 }]}>GÖREV İLERLEME</Text>
                        <Text style={[styles.webHeaderCell, { flex: 1 }]}>TARİHLER</Text>
                        <Text style={[styles.webHeaderCell, { flex: 1.6, textAlign: 'right' }]}>İŞLEMLER</Text>
                    </View>
                    <FlatList
                        data={activeMrs}
                        keyExtractor={i => i.id.toString()}
                        renderItem={({ item, index }) => <WebTableRow item={item} index={index} />}
                        contentContainerStyle={{ paddingBottom: 40 }}
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <Ionicons name="build-outline" size={52} color="#CBD5E1" />
                                <Text style={styles.emptyText}>Aktif bakım/servis talebi bulunamadı.</Text>
                                <TouchableOpacity style={styles.emptyBtn} onPress={() => handleOpenModal()}>
                                    <Text style={styles.emptyBtnText}>Yeni Plan Oluştur</Text>
                                </TouchableOpacity>
                            </View>
                        }
                    />
                </View>
            ) : (
                <FlatList
                    data={activeMrs}
                    keyExtractor={i => i.id.toString()}
                    contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
                    renderItem={({ item }) => <MobileCard item={item} />}
                    ListEmptyComponent={<View style={styles.empty}><Ionicons name="build-outline" size={52} color="#CBD5E1" /><Text style={styles.emptyText}>Aktif talep yok.</Text></View>}
                />
            )}

            {/* === YENİ PLAN MODALI === */}
            <Modal visible={modalVisible} animationType={isWeb ? 'fade' : 'slide'} transparent>
                <View style={styles.overlay}>
                    <View style={[styles.modalBox, { maxWidth: 860 }]}>
                        <View style={styles.modalHead}>
                            <View>
                                <Text style={styles.modalTitle}>{isEdit ? 'Planı Düzenle' : 'Yeni Bakım / Servis Planı'}</Text>
                                {isEdit && <Text style={styles.modalSub}>{selectedMr?.mr_number}</Text>}
                            </View>
                            <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={20} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24 }}>

                            {/* Temel Bilgiler */}
                            <View style={styles.formSection}>
                                <Text style={styles.sectionTitle}>Temel Bilgiler</Text>
                                <View style={[styles.formGrid, { marginBottom: 0 }]}>
                                    <View style={{ flex: 2 }}>
                                        <Text style={styles.label}>Talep Başlığı <Text style={{ color: Colors.critical }}>*</Text></Text>
                                        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Örn: Kompresör Periyodik Bakımı" />
                                    </View>
                                </View>
                                <View style={styles.formGrid}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.label}>Tip</Text>
                                        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                                            {TYPES.map(t => (
                                                <SelectChip key={t} label={TYPE_LABELS[t]} value={t} selected={type === t} onPress={() => setType(t)} />
                                            ))}
                                        </View>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.label}>Öncelik</Text>
                                        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                                            {PRIORITIES.map(p => {
                                                const pc = PRIORITY_COLORS[p];
                                                return <SelectChip key={p} label={PRIORITY_LABELS[p]} value={p} selected={priority === p} onPress={() => setPriority(p)} color={priority === p ? pc.dot : undefined} />;
                                            })}
                                        </View>
                                    </View>
                                </View>
                            </View>

                            {/* Ekipman ve Atama */}
                            <View style={styles.formSection}>
                                <Text style={styles.sectionTitle}>Ekipman ve Atama</Text>
                                <View style={styles.formGrid}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.label}>Ekipman / Varlık Adı</Text>
                                        <TextInput style={styles.input} value={assetName} onChangeText={setAssetName} placeholder="Örn: Kompresör #3, Lift A" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.label}>Atanan Kişi / Ekip</Text>
                                        <TextInput style={styles.input} value={assignedTo} onChangeText={setAssignedTo} placeholder="Kişi veya ekip adı" />
                                    </View>
                                </View>
                            </View>

                            {/* Tarihler ve Maliyet */}
                            <View style={styles.formSection}>
                                <Text style={styles.sectionTitle}>Zamanlama ve Maliyet</Text>
                                <View style={styles.formGrid}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.label}>Planlanan Tarih</Text>
                                        <TextInput style={styles.input} value={plannedDate} onChangeText={setPlannedDate} placeholder="GG.AA.YYYY veya YYYY-MM-DD" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.label}>Son Tamamlanma Tarihi</Text>
                                        <TextInput style={styles.input} value={dueDate} onChangeText={setDueDate} placeholder="GG.AA.YYYY veya YYYY-MM-DD" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.label}>Tahmini Maliyet (₺)</Text>
                                        <TextInput style={styles.input} value={estimatedCost} onChangeText={setEstimatedCost} keyboardType="numeric" placeholder="0.00" />
                                    </View>
                                </View>
                            </View>

                            {/* Açıklama */}
                            <View style={styles.formSection}>
                                <Text style={styles.sectionTitle}>Açıklama ve Notlar</Text>
                                <TextInput style={[styles.input, { height: 80 }]} multiline value={description} onChangeText={setDescription} placeholder="Bakım / servis detayları, sorun tanımı..." />
                            </View>

                            {/* Görevler */}
                            <View style={styles.formSection}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                    <Text style={styles.sectionTitle}>Görevler ve Aşamalar</Text>
                                </View>
                                {tasks.map((t, idx) => (
                                    <View key={t.id} style={[styles.taskRow, t.status === 'DONE' && styles.taskRowDone]}>
                                        <View style={styles.taskRowNum}><Text style={styles.taskNumText}>{idx + 1}</Text></View>
                                        <View style={{ flex: 1 }}>
                                            <TextInput
                                                style={[styles.input, { marginBottom: 0 }]}
                                                placeholder="Görev adı (Örn: Yağ değişimi, Filtre temizleme...)"
                                                value={t.name}
                                                onChangeText={v => !isEdit && handleUpdateTask(t.id, 'name', v)}
                                                editable={!isEdit}
                                            />
                                        </View>
                                        <View style={{ width: 80, marginLeft: 8 }}>
                                            <TextInput
                                                style={[styles.input, { marginBottom: 0, textAlign: 'center' }]}
                                                placeholder="dk"
                                                value={isEdit ? t.spent_time?.toString() : t.duration}
                                                onChangeText={v => handleUpdateTask(t.id, isEdit ? 'spent_time' : 'duration', v)}
                                                keyboardType="numeric"
                                            />
                                        </View>
                                        {isEdit ? (
                                            <TouchableOpacity
                                                style={[styles.taskToggle, t.status === 'DONE' && styles.taskToggleDone]}
                                                onPress={() => handleUpdateTask(t.id, 'status', t.status === 'DONE' ? 'PENDING' : 'DONE')}
                                            >
                                                <Ionicons name={t.status === 'DONE' ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={t.status === 'DONE' ? '#fff' : '#94A3B8'} />
                                            </TouchableOpacity>
                                        ) : (
                                            <TouchableOpacity style={styles.taskRemoveBtn} onPress={() => handleRemoveTask(t.id)}>
                                                <Ionicons name="trash-outline" size={18} color={Colors.critical} />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                ))}
                                {!isEdit && (
                                    <TouchableOpacity style={styles.addTaskBtn} onPress={handleAddTask}>
                                        <Ionicons name="add-circle-outline" size={18} color="#8B5CF6" />
                                        <Text style={[styles.addTaskText, { color: '#8B5CF6' }]}>Görev Ekle</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </ScrollView>

                        <View style={styles.modalFoot}>
                            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#8B5CF6' }]} onPress={handleSave}>
                                <Ionicons name="checkmark-circle" size={18} color="#fff" style={{ marginRight: 8 }} />
                                <Text style={styles.saveBtnText}>{isEdit ? 'Değişiklikleri Kaydet' : 'Planı Kaydet'}</Text>
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
                                <Text style={styles.modalTitle}>Talebi Kapat</Text>
                                <Text style={styles.modalSub}>{selectedMr?.title} • {selectedMr?.mr_number}</Text>
                            </View>
                            <TouchableOpacity style={styles.closeBtn} onPress={() => setCloseModalVisible(false)}>
                                <Ionicons name="close" size={20} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24 }}>
                            <View style={styles.formSection}>
                                <Text style={styles.sectionTitle}>Maliyet Bilgisi</Text>
                                <View style={styles.formGrid}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.label}>Tahmini Maliyet (₺)</Text>
                                        <View style={[styles.input, { justifyContent: 'center', backgroundColor: '#F8FAFC' }]}>
                                            <Text style={{ color: '#64748B' }}>{selectedMr?.estimated_cost ? `₺${selectedMr.estimated_cost}` : '—'}</Text>
                                        </View>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.label}>Gerçek Maliyet (₺) <Text style={{ color: Colors.critical }}>*</Text></Text>
                                        <TextInput style={styles.input} value={actualCost} onChangeText={setActualCost} keyboardType="numeric" placeholder="0.00" />
                                    </View>
                                </View>
                                {actualCost && selectedMr?.estimated_cost ? (
                                    <View style={styles.efficiencyBox}>
                                        <Ionicons name="analytics" size={16} color="#8B5CF6" />
                                        <Text style={[styles.efficiencyText, { color: '#8B5CF6' }]}>
                                            Maliyet Farkı: ₺{(parseFloat(actualCost) - parseFloat(selectedMr.estimated_cost)).toFixed(2)} ({parseFloat(actualCost) > parseFloat(selectedMr.estimated_cost) ? 'bütçe aşıldı' : 'bütçe altında kaldı'})
                                        </Text>
                                    </View>
                                ) : null}
                            </View>

                            {closingTasks.length > 0 && (
                                <View style={styles.formSection}>
                                    <Text style={styles.sectionTitle}>Görev Tamamlama</Text>
                                    {closingTasks.map((t, idx) => (
                                        <View key={t.id} style={[styles.closureTaskCard, t.status === 'DONE' && styles.closureTaskCardDone]}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                                <View>
                                                    <Text style={styles.closureTaskName}>{t.name || `Görev ${idx + 1}`}</Text>
                                                    <Text style={styles.closureTaskTarget}>Hedef Süre: {t.duration || '0'} dk</Text>
                                                </View>
                                                <TouchableOpacity
                                                    style={[styles.taskToggle, t.status === 'DONE' && styles.taskToggleDone]}
                                                    onPress={() => handleUpdateClosingTask(t.id, 'status', t.status === 'DONE' ? 'PENDING' : 'DONE')}
                                                >
                                                    <Ionicons name={t.status === 'DONE' ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={t.status === 'DONE' ? '#fff' : '#94A3B8'} />
                                                    <Text style={[{ fontSize: 12, fontWeight: '700', marginLeft: 4 }, t.status === 'DONE' ? { color: '#fff' } : { color: '#94A3B8' }]}>
                                                        {t.status === 'DONE' ? 'Tamamlandı' : 'Bekliyor'}
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                            <Text style={styles.label}>Gerçekleşen Süre (dk)</Text>
                                            <TextInput
                                                style={[styles.input, { marginBottom: 0 }]}
                                                value={t.spent_time?.toString()}
                                                onChangeText={v => handleUpdateClosingTask(t.id, 'spent_time', v)}
                                                keyboardType="numeric"
                                                placeholder="Süre girin..."
                                            />
                                        </View>
                                    ))}
                                </View>
                            )}

                            <View style={styles.formSection}>
                                <Text style={styles.sectionTitle}>Kapanış Notları</Text>
                                <TextInput style={[styles.input, { height: 80 }]} multiline value={closureNotes} onChangeText={setClosureNotes} placeholder="Yapılan işlemler, bulgular, öneriler..." />
                            </View>
                        </ScrollView>

                        <View style={styles.modalFoot}>
                            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: Colors.iosGreen }]} onPress={handleClose}>
                                <Ionicons name="lock-closed" size={18} color="#fff" style={{ marginRight: 8 }} />
                                <Text style={styles.saveBtnText}>Onayla ve Arşive Taşı</Text>
                            </TouchableOpacity>
                        </View>
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
    newBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#8B5CF6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, gap: 6, ...Platform.select({ web: { boxShadow: '0 2px 8px rgba(139,92,246,0.35)', cursor: 'pointer' } }) },
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
    sortBtnActive: { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
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
    webCellMono: { fontSize: 13, fontWeight: '700', color: '#8B5CF6', fontFamily: Platform.OS === 'web' ? 'monospace' : 'System' },
    webActionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, paddingHorizontal: 9, borderRadius: 8, gap: 4, ...Platform.select({ web: { cursor: 'pointer' } }) },
    webActionBtnText: { fontSize: 11, fontWeight: '700' },

    // Badges
    typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
    typeBadgeText: { fontSize: 10, fontWeight: '700' },
    priorityBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
    priorityText: { fontSize: 11, fontWeight: '700' },

    // Progress
    progressTrack: { height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden' },
    progressBar: { height: 6, borderRadius: 3 },

    // Mobile Card
    card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', ...Platform.select({ web: { boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }, default: { elevation: 2 } }) },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    cardMrNum: { fontSize: 11, fontWeight: '800', color: '#8B5CF6', marginBottom: 2 },
    cardTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A' },
    cardSub: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
    closeCardBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ECFDF5', paddingVertical: 10, borderRadius: 10, gap: 6, marginTop: 4 },
    closeCardBtnText: { color: Colors.iosGreen, fontWeight: '700', fontSize: 14 },

    // Empty
    empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 },
    emptyText: { marginTop: 12, fontSize: 15, color: '#94A3B8', textAlign: 'center' },
    emptyBtn: { marginTop: 16, backgroundColor: '#8B5CF6', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 10 },
    emptyBtnText: { color: '#fff', fontWeight: '700' },

    // Modal
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalBox: { backgroundColor: '#fff', width: '94%', maxHeight: '92%', borderRadius: 20, overflow: 'hidden', ...Platform.select({ web: { boxShadow: '0 20px 60px rgba(0,0,0,0.25)' } }) },
    modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    modalTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
    modalSub: { fontSize: 13, color: '#8B5CF6', fontWeight: '700', marginTop: 2 },
    closeBtn: { padding: 8, backgroundColor: '#F1F5F9', borderRadius: 10 },
    modalFoot: { padding: 20, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
    saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12 },
    saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },

    // Form
    formSection: { marginBottom: 20, backgroundColor: '#F8FAFC', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
    sectionTitle: { fontSize: 13, fontWeight: '800', color: '#8B5CF6', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
    formGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 },
    input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 12, marginBottom: 12, fontSize: 14, color: '#1E293B' },
    chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F1F5F9', marginRight: 8, borderWidth: 1, borderColor: '#E2E8F0', minWidth: 60, alignItems: 'center' },
    chipActive: { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
    chipText: { fontSize: 13, color: '#475569', fontWeight: '600' },
    chipTextActive: { color: '#fff' },

    // Task Row
    taskRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, backgroundColor: '#fff', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' },
    taskRowDone: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
    taskRowNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center' },
    taskNumText: { fontSize: 12, fontWeight: '800', color: '#8B5CF6' },
    taskToggle: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', flexDirection: 'row' },
    taskToggleDone: { backgroundColor: Colors.iosGreen, borderColor: Colors.iosGreen },
    taskRemoveBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    addTaskBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, justifyContent: 'center', gap: 6, borderWidth: 1, borderStyle: 'dashed', borderColor: '#8B5CF6', borderRadius: 10, marginTop: 4 },
    addTaskText: { fontWeight: '700', fontSize: 14 },

    // Closure
    closureTaskCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0' },
    closureTaskCardDone: { borderColor: '#22C55E', backgroundColor: '#F0FDF4' },
    closureTaskName: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
    closureTaskTarget: { fontSize: 12, color: '#64748B', marginTop: 2 },
    efficiencyBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F3FF', borderRadius: 8, padding: 10, marginTop: 4, gap: 8 },
    efficiencyText: { fontSize: 13, fontWeight: '700' },
});
