import React, { useState, useContext, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, ScrollView, Alert, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../AppContext';
import { Colors } from '../Theme';

const isWeb = Platform.OS === 'web';

const STATUS_CONFIG = {
    DRAFT: { label: 'YENİ/TASLAK', color: '#64748B', bg: '#F8FAFC', border: '#CBD5E1', dot: '#64748B' },
    SENT: { label: 'GÖNDERİLDİ', color: '#0284C7', bg: '#E0F2FE', border: '#BAE6FD', dot: '#0284C7' },
    NEGOTIATION: { label: 'GÖRÜŞÜLÜYOR', color: '#D97706', bg: '#FEF3C7', border: '#FDE68A', dot: '#D97706' },
    APPROVED: { label: 'ONAYLANDI', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', dot: '#2563EB' },
    CONVERTED: { label: 'SİPARİŞE DÖNÜŞTÜ', color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0', dot: '#16A34A' },
    REJECTED: { label: 'REDDEDİLDİ', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', dot: '#DC2626' },
    CANCELLED: { label: 'İPTAL', color: '#94A3B8', bg: '#F1F5F9', border: '#E2E8F0', dot: '#94A3B8' },
};

const KANBAN_COLUMNS = ['DRAFT', 'SENT', 'NEGOTIATION', 'APPROVED', 'CONVERTED', 'REJECTED'];

export default function QuotationScreen() {
    const {
        quotations, addQuotation, updateQuotation, cancelQuotation,
        approveQuotation, convertQuotationToSale, deleteQuotation, updateQuotationStatus,
        products, customers, personnel
    } = useContext(AppContext);

    // Modal states
    const [modalVisible, setModalVisible] = useState(false);
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [selectedQ, setSelectedQ] = useState(null);
    const [isEdit, setIsEdit] = useState(false);
    const [activeTab, setActiveTab] = useState('general'); // general, products, crm

    // Form states
    const [customerId, setCustomerId] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [validUntil, setValidUntil] = useState('');
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState([]);
    const [customerSearch, setCustomerSearch] = useState('');
    const [productSearch, setProductSearch] = useState('');

    // CRM Form States
    const [probability, setProbability] = useState('0');
    const [assigneeId, setAssigneeId] = useState('');
    const [nextFollowUp, setNextFollowUp] = useState('');
    const [termsConditions, setTermsConditions] = useState('');
    const [discountAmount, setDiscountAmount] = useState('0');
    const [tags, setTags] = useState('');

    // List states
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [assigneeFilter, setAssigneeFilter] = useState('ALL');
    const [viewMode, setViewMode] = useState(isWeb ? 'kanban' : 'list');

    // --- Stats ---
    const stats = useMemo(() => {
        if (!Array.isArray(quotations)) return { totalVal: 0, expectedVal: 0, wonVal: 0, activeCount: 0 };
        let totalVal = 0, expectedVal = 0, wonVal = 0, activeCount = 0;
        
        quotations.forEach(q => {
            const val = Number(q.total_amount || 0);
            const prob = Number(q.probability || 0);
            
            if (q.status === 'CONVERTED') {
                wonVal += val;
            } else if (q.status !== 'CANCELLED' && q.status !== 'REJECTED') {
                totalVal += val;
                expectedVal += val * (prob / 100);
                activeCount++;
            }
        });
        return { totalVal, expectedVal, wonVal, activeCount };
    }, [quotations]);

    // --- Filtered list ---
    const filteredQuotations = useMemo(() => {
        if (!Array.isArray(quotations)) return [];
        return quotations.filter(q => {
            if (statusFilter !== 'ALL' && q.status !== statusFilter) return false;
            if (assigneeFilter !== 'ALL' && q.assignee_id !== assigneeFilter) return false;
            if (searchQuery) {
                const sq = searchQuery.toLowerCase();
                return (q.quote_number || '').toLowerCase().includes(sq) ||
                    (q.customer_name || '').toLowerCase().includes(sq) ||
                    (q.tags || '').toLowerCase().includes(sq);
            }
            return true;
        });
    }, [quotations, searchQuery, statusFilter, assigneeFilter]);

    // --- Form helpers ---
    const resetForm = () => {
        setCustomerId(''); setCustomerName(''); setValidUntil('');
        setNotes(''); setItems([]); setCustomerSearch(''); setProductSearch('');
        setProbability('0'); setAssigneeId(''); setNextFollowUp(''); 
        setTermsConditions(''); setDiscountAmount('0'); setTags('');
        setSelectedQ(null); setIsEdit(false); setActiveTab('general');
    };

    const handleOpenModal = (q = null) => {
        if (q) {
            setSelectedQ(q);
            setCustomerId(q.customer_id || '');
            setCustomerName(q.customer_name || '');
            setValidUntil(q.valid_until || '');
            setNotes(q.notes || '');
            setItems(q.items ? q.items.map(i => ({ ...i })) : []);
            setProbability(q.probability ? String(q.probability) : '0');
            setAssigneeId(q.assignee_id || '');
            setNextFollowUp(q.next_follow_up || '');
            setTermsConditions(q.terms_conditions || '');
            setDiscountAmount(q.discount_amount ? String(q.discount_amount) : '0');
            setTags(q.tags || '');
            setIsEdit(true);
        } else {
            resetForm();
        }
        setModalVisible(true);
    };

    const handleOpenDetail = (q) => {
        setSelectedQ(q);
        setDetailModalVisible(true);
    };

    const handleAddItem = (product) => {
        const existing = items.find(i => i.product_id === product.id);
        if (existing) {
            setItems(items.map(i => i.product_id === product.id
                ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.unit_price }
                : i));
        } else {
            const newItem = {
                product_id: product.id,
                product_name: product.name,
                product_code: product.code || '',
                quantity: 1,
                unit_price: product.price || product.cost || 0,
                total: product.price || product.cost || 0,
            };
            setItems([...items, newItem]);
        }
        setProductSearch('');
    };

    const handleUpdateItemQty = (productId, val) => {
        const qty = parseFloat(val) || 0;
        setItems(items.map(i => i.product_id === productId
            ? { ...i, quantity: qty, total: qty * i.unit_price }
            : i));
    };

    const handleUpdateItemPrice = (productId, val) => {
        const price = parseFloat(val) || 0;
        setItems(items.map(i => i.product_id === productId
            ? { ...i, unit_price: price, total: i.quantity * price }
            : i));
    };

    const handleRemoveItem = (productId) => {
        setItems(items.filter(i => i.product_id !== productId));
    };

    const subTotalAmount = useMemo(() => items.reduce((s, i) => s + (parseFloat(i.total) || 0), 0), [items]);
    const finalTotalAmount = useMemo(() => subTotalAmount - (parseFloat(discountAmount) || 0), [subTotalAmount, discountAmount]);

    const handleSave = async () => {
        if (!customerName && !customerId) {
            Alert.alert('Hata', 'Lütfen müşteri seçiniz veya müşteri adı giriniz.');
            return;
        }
        if (items.length === 0) {
            Alert.alert('Hata', 'Lütfen en az bir ürün kalemi ekleyiniz.');
            return;
        }
        const qData = { 
            customer_id: customerId || null, customer_name: customerName, valid_until: validUntil || null, notes, items,
            probability: parseFloat(probability) || 0,
            assignee_id: assigneeId || null,
            next_follow_up: nextFollowUp || null,
            terms_conditions: termsConditions,
            discount_amount: parseFloat(discountAmount) || 0,
            tags
        };
        if (isEdit) {
            await updateQuotation({ ...selectedQ, ...qData });
        } else {
            await addQuotation(qData);
        }
        setModalVisible(false);
        resetForm();
    };

    const handleChangeStatus = (q, newStatus) => {
        if (newStatus === 'CONVERTED') {
            handleConvert(q);
        } else {
            updateQuotationStatus(q.id, newStatus);
            setDetailModalVisible(false);
        }
    };

    const handleConvert = (q) => {
        const proceed = async () => {
            const result = await convertQuotationToSale(q.id);
            if (result !== false) {
                setDetailModalVisible(false);
                updateQuotationStatus(q.id, 'CONVERTED'); // Satış oluşturulduysa durumunu güncelle
                if (isWeb) window.alert('Teklif başarıyla satış siparişine dönüştürüldü.');
                else Alert.alert('Başarılı', 'Teklif satış siparişine dönüştürüldü.');
            }
        };
        if (isWeb) { if (window.confirm(`"${q.quote_number}" numaralı teklif satış siparişine dönüştürülecek. Onaylıyor musunuz?`)) proceed(); }
        else Alert.alert('Siparişe Dönüştür', 'Teklif satış siparişine dönüştürülecek.', [{ text: 'Hayır', style: 'cancel' }, { text: 'Evet, Dönüştür', onPress: proceed }]);
    };

    const handleDelete = (q) => {
        const proceed = async () => { await deleteQuotation(q.id); };
        if (isWeb) { if (window.confirm('Bu teklif silinecek. Onaylıyor musunuz?')) proceed(); }
        else Alert.alert('Sil', 'Bu teklif silinecek.', [{ text: 'Hayır', style: 'cancel' }, { text: 'Evet, Sil', style: 'destructive', onPress: proceed }]);
    };

    // --- Status Badge ---
    const StatusBadge = ({ status }) => {
        const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
        return (
            <View style={[styles.statusBadge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: cfg.dot, marginRight: 5 }} />
                <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
        );
    };

    // --- Kanban View (Web Only) ---
    const KanbanBoard = () => {
        return (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kanbanWrap}>
                {KANBAN_COLUMNS.map(col => {
                    const cfg = STATUS_CONFIG[col];
                    const colQuotes = filteredQuotations.filter(q => q.status === col);
                    const colTotal = colQuotes.reduce((s, q) => s + Number(q.total_amount || 0), 0);
                    
                    return (
                        <View key={col} style={styles.kanbanColumn}>
                            <View style={[styles.kanbanHeader, { borderTopColor: cfg.color }]}>
                                <Text style={[styles.kanbanTitle, { color: cfg.color }]}>{cfg.label}</Text>
                                <View style={styles.kanbanCount}><Text style={styles.kanbanCountText}>{colQuotes.length}</Text></View>
                            </View>
                            <Text style={styles.kanbanTotal}>{colTotal.toLocaleString('tr-TR', { minimumFractionDigits: 0 })} ₺</Text>
                            
                            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                                {colQuotes.map(q => (
                                    <TouchableOpacity key={q.id} style={styles.kanbanCard} onPress={() => handleOpenDetail(q)}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <Text style={styles.cardQuoteNum}>{q.quote_number}</Text>
                                            {q.probability > 0 && <Text style={{ fontSize: 10, color: '#059669', fontWeight: '800' }}>%{q.probability}</Text>}
                                        </View>
                                        <Text style={styles.cardTitle} numberOfLines={1}>{q.customer_name}</Text>
                                        <Text style={[styles.cardTitle, { color: Colors.iosBlue, marginTop: 4 }]}>
                                            {Number(q.total_amount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                        </Text>
                                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                                            {q.assignee_id && (
                                                <View style={styles.miniTag}><Ionicons name="person" size={10} color="#64748B" /><Text style={styles.miniTagText}>{personnel.find(p => p.id === q.assignee_id)?.name?.split(' ')[0] || 'Atanmış'}</Text></View>
                                            )}
                                            {q.next_follow_up && (
                                                <View style={styles.miniTag}><Ionicons name="calendar" size={10} color="#64748B" /><Text style={styles.miniTagText}>{new Date(q.next_follow_up).toLocaleDateString('tr-TR')}</Text></View>
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    );
                })}
            </ScrollView>
        );
    };

    // --- Web Table Row ---
    const WebTableRow = ({ item, index }) => {
        const assignee = personnel.find(p => p.id === item.assignee_id)?.name || 'Atanmamış';
        return (
            <View style={[styles.webTableRow, index % 2 === 0 ? styles.webRowEven : styles.webRowOdd]}>
                <View style={{ flex: 1.2, justifyContent: 'center' }}>
                    <Text style={styles.webCellMono}>{item.quote_number || '—'}</Text>
                    <Text style={styles.webCellSub}>{new Date(item.created_at).toLocaleDateString('tr-TR')}</Text>
                </View>
                <View style={{ flex: 1.8, justifyContent: 'center' }}>
                    <Text style={styles.webCellBold} numberOfLines={1}>{item.customer_name || 'Müşterisiz'}</Text>
                    {item.tags ? <Text style={styles.webCellSub}>{item.tags}</Text> : null}
                </View>
                <View style={{ flex: 1.2, justifyContent: 'center' }}>
                    <Text style={styles.webCellBold} numberOfLines={1}>{assignee}</Text>
                    {item.next_follow_up && <Text style={[styles.webCellSub, { color: '#059669' }]}>Takip: {new Date(item.next_follow_up).toLocaleDateString('tr-TR')}</Text>}
                </View>
                <View style={{ flex: 1.2, justifyContent: 'center', alignItems: 'flex-end', paddingRight: 12 }}>
                    <Text style={[styles.webCellBold, { color: Colors.iosBlue }]}>
                        {Number(item.total_amount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                    </Text>
                    {item.probability > 0 && <Text style={styles.webCellSub}>İhtimal: %{item.probability}</Text>}
                </View>
                <View style={{ flex: 1.4, justifyContent: 'center', alignItems: 'center' }}>
                    <StatusBadge status={item.status} />
                </View>
                <View style={{ flex: 1.5, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
                    <TouchableOpacity style={[styles.webActionBtn, { backgroundColor: '#EFF6FF' }]} onPress={() => handleOpenDetail(item)}>
                        <Ionicons name="eye-outline" size={14} color={Colors.iosBlue} />
                        <Text style={[styles.webActionBtnText, { color: Colors.iosBlue }]}>Detay</Text>
                    </TouchableOpacity>
                    {item.status !== 'CONVERTED' && item.status !== 'REJECTED' && item.status !== 'CANCELLED' && (
                        <TouchableOpacity style={[styles.webActionBtn, { backgroundColor: '#EFF6FF' }]} onPress={() => handleOpenModal(item)}>
                            <Ionicons name="create-outline" size={14} color={Colors.iosBlue} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    // --- Mobile Card ---
    const MobileCard = ({ item }) => {
        return (
            <TouchableOpacity style={styles.card} onPress={() => handleOpenDetail(item)}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.cardQuoteNum}>{item.quote_number || '—'}</Text>
                        <Text style={styles.cardTitle} numberOfLines={1}>{item.customer_name || 'Müşterisiz'}</Text>
                        <Text style={styles.cardSub}>{Number(item.total_amount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺ • %{item.probability || 0} İhtimal</Text>
                    </View>
                    <StatusBadge status={item.status} />
                </View>
            </TouchableOpacity>
        );
    };

    // ===================== RENDER =====================
    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.pageHeader}>
                <View>
                    <Text style={styles.pageTitle}>Teklifler (CRM)</Text>
                    <Text style={styles.pageSubtitle}>{filteredQuotations.length} teklif gösteriliyor</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    {isWeb && (
                        <View style={styles.viewToggle}>
                            <TouchableOpacity style={[styles.viewToggleBtn, viewMode === 'kanban' && styles.viewToggleBtnActive]} onPress={() => setViewMode('kanban')}>
                                <Ionicons name="albums-outline" size={16} color={viewMode === 'kanban' ? '#fff' : '#64748B'} />
                                <Text style={[styles.viewToggleText, viewMode === 'kanban' && { color: '#fff' }]}>Pano</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.viewToggleBtn, viewMode === 'list' && styles.viewToggleBtnActive]} onPress={() => setViewMode('list')}>
                                <Ionicons name="list-outline" size={16} color={viewMode === 'list' ? '#fff' : '#64748B'} />
                                <Text style={[styles.viewToggleText, viewMode === 'list' && { color: '#fff' }]}>Liste</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    <TouchableOpacity style={styles.newBtn} onPress={() => handleOpenModal()}>
                        <Ionicons name="add" size={18} color="#fff" />
                        <Text style={styles.newBtnText}>Yeni Teklif</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
                <View style={[styles.statCard, { borderLeftColor: '#64748B' }]}>
                    <View style={[styles.statIcon, { backgroundColor: '#F8FAFC' }]}><Ionicons name="briefcase-outline" size={20} color="#64748B" /></View>
                    <View><Text style={styles.statVal}>{stats.activeCount}</Text><Text style={styles.statLbl}>Aktif Fırsat</Text></View>
                </View>
                <View style={[styles.statCard, { borderLeftColor: Colors.iosBlue }]}>
                    <View style={[styles.statIcon, { backgroundColor: '#EFF6FF' }]}><Ionicons name="cash-outline" size={20} color={Colors.iosBlue} /></View>
                    <View><Text style={styles.statVal}>{stats.totalVal.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺</Text><Text style={styles.statLbl}>Açık Toplam Değer</Text></View>
                </View>
                <View style={[styles.statCard, { borderLeftColor: '#D97706' }]}>
                    <View style={[styles.statIcon, { backgroundColor: '#FEF3C7' }]}><Ionicons name="trending-up-outline" size={20} color="#D97706" /></View>
                    <View><Text style={styles.statVal}>{stats.expectedVal.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺</Text><Text style={styles.statLbl}>Beklenen Gelir</Text></View>
                </View>
                <View style={[styles.statCard, { borderLeftColor: Colors.iosGreen }]}>
                    <View style={[styles.statIcon, { backgroundColor: '#F0FDF4' }]}><Ionicons name="checkmark-circle-outline" size={20} color={Colors.iosGreen} /></View>
                    <View><Text style={styles.statVal}>{stats.wonVal.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺</Text><Text style={styles.statLbl}>Kazanılan Toplam</Text></View>
                </View>
            </View>

            {/* Toolbar */}
            <View style={styles.toolbar}>
                <View style={{ flex: 1 }}>
                    <View style={styles.searchBar}>
                        <Ionicons name="search" size={16} color="#94A3B8" />
                        <TextInput style={styles.searchInput} placeholder="Teklif no, müşteri veya etiket ara..." value={searchQuery} onChangeText={setSearchQuery} placeholderTextColor="#94A3B8" />
                        {searchQuery !== '' && <TouchableOpacity onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={18} color="#94A3B8" /></TouchableOpacity>}
                    </View>
                </View>
                <View style={styles.filterRow}>
                    {/* Sorumlu Filtresi */}
                    {isWeb && (
                        <select style={styles.selectInput} value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
                            <option value="ALL">Tüm Sorumlular</option>
                            {personnel.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    )}
                    {/* Durum Filtresi - Yalnızca List görünümünde görünür */}
                    {viewMode === 'list' && (
                        <select style={styles.selectInput} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                            <option value="ALL">Tüm Durumlar</option>
                            {Object.entries(STATUS_CONFIG).map(([key, val]) => <option key={key} value={key}>{val.label}</option>)}
                        </select>
                    )}
                </View>
            </View>

            {/* Content Area */}
            {viewMode === 'kanban' && isWeb ? (
                <KanbanBoard />
            ) : isWeb ? (
                <View style={styles.webTableWrap}>
                    <View style={styles.webTableHeader}>
                        <Text style={[styles.webHeaderCell, { flex: 1.2 }]}>TEKLİF NO</Text>
                        <Text style={[styles.webHeaderCell, { flex: 1.8 }]}>MÜŞTERİ & ETİKET</Text>
                        <Text style={[styles.webHeaderCell, { flex: 1.2 }]}>SORUMLU & TAKİP</Text>
                        <Text style={[styles.webHeaderCell, { flex: 1.2, textAlign: 'right', paddingRight: 12 }]}>TUTAR</Text>
                        <Text style={[styles.webHeaderCell, { flex: 1.4, textAlign: 'center' }]}>DURUM</Text>
                        <Text style={[styles.webHeaderCell, { flex: 1.5, textAlign: 'right' }]}>İŞLEMLER</Text>
                    </View>
                    <FlatList
                        data={filteredQuotations}
                        keyExtractor={i => i.id.toString()}
                        renderItem={({ item, index }) => <WebTableRow item={item} index={index} />}
                        contentContainerStyle={{ paddingBottom: 40 }}
                        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>Teklif bulunamadı.</Text></View>}
                    />
                </View>
            ) : (
                <FlatList
                    data={filteredQuotations}
                    keyExtractor={i => i.id.toString()}
                    contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
                    renderItem={({ item }) => <MobileCard item={item} />}
                    ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>Teklif bulunamadı.</Text></View>}
                />
            )}

            {/* ===== YENİ/DÜZENLE TEKLİF MODALI ===== */}
            <Modal visible={modalVisible} animationType={isWeb ? 'fade' : 'slide'} transparent>
                <View style={styles.overlay}>
                    <View style={[styles.modalBox, { maxWidth: 900 }]}>
                        <View style={styles.modalHead}>
                            <View>
                                <Text style={styles.modalTitle}>{isEdit ? 'Teklifi Düzenle' : 'Yeni Teklif Oluştur'}</Text>
                                {isEdit && <Text style={styles.modalSub}>{selectedQ?.quote_number}</Text>}
                            </View>
                            <TouchableOpacity style={styles.closeBtn} onPress={() => { setModalVisible(false); resetForm(); }}>
                                <Ionicons name="close" size={20} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        {/* Tabs */}
                        <View style={styles.tabsContainer}>
                            <TouchableOpacity style={[styles.tabBtn, activeTab === 'general' && styles.tabBtnActive]} onPress={() => setActiveTab('general')}>
                                <Ionicons name="information-circle-outline" size={18} color={activeTab === 'general' ? Colors.iosBlue : '#64748B'} />
                                <Text style={[styles.tabText, activeTab === 'general' && styles.tabTextActive]}>Genel Bilgiler</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.tabBtn, activeTab === 'products' && styles.tabBtnActive]} onPress={() => setActiveTab('products')}>
                                <Ionicons name="cube-outline" size={18} color={activeTab === 'products' ? Colors.iosBlue : '#64748B'} />
                                <Text style={[styles.tabText, activeTab === 'products' && styles.tabTextActive]}>Ürünler & Fiyat</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.tabBtn, activeTab === 'crm' && styles.tabBtnActive]} onPress={() => setActiveTab('crm')}>
                                <Ionicons name="trending-up-outline" size={18} color={activeTab === 'crm' ? Colors.iosBlue : '#64748B'} />
                                <Text style={[styles.tabText, activeTab === 'crm' && styles.tabTextActive]}>CRM & Takip</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24 }}>
                            {/* TAB: GENERAL */}
                            {activeTab === 'general' && (
                                <View style={styles.formSection}>
                                    <Text style={styles.sectionTitle}>Müşteri Seçimi</Text>
                                    <View style={styles.searchBar}>
                                        <Ionicons name="people-outline" size={16} color="#94A3B8" />
                                        <TextInput style={styles.searchInput} placeholder="Kayıtlı müşteri ara..." value={customerSearch} onChangeText={setCustomerSearch} placeholderTextColor="#94A3B8" />
                                    </View>
                                    {customerSearch.length > 0 && (
                                        <ScrollView style={{ maxHeight: 160, marginBottom: 8 }}>
                                            {customers.filter(c => (c.name || '').toLowerCase().includes(customerSearch.toLowerCase())).map(c => (
                                                <TouchableOpacity key={c.id} style={[styles.suggestionRow, customerId === c.id && styles.suggestionRowActive]}
                                                    onPress={() => { setCustomerId(c.id); setCustomerName(c.name); setCustomerSearch(''); }}>
                                                    <Text style={[styles.suggestionText, customerId === c.id && { color: '#fff' }]}>{c.name}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    )}
                                    {customerId ? (
                                        <View style={styles.selectedCustomer}>
                                            <Ionicons name="person-circle" size={18} color={Colors.iosBlue} />
                                            <Text style={styles.selectedCustomerText}>{customerName}</Text>
                                            <TouchableOpacity onPress={() => { setCustomerId(''); setCustomerName(''); }}>
                                                <Ionicons name="close-circle" size={18} color="#94A3B8" />
                                            </TouchableOpacity>
                                        </View>
                                    ) : (
                                        <View style={{ marginTop: 8 }}>
                                            <Text style={styles.label}>Veya manuel müşteri adı girin</Text>
                                            <TextInput style={styles.input} value={customerName} onChangeText={setCustomerName} placeholder="Müşteri adı..." placeholderTextColor="#94A3B8" />
                                        </View>
                                    )}

                                    <View style={{ marginTop: 16 }}>
                                        <Text style={styles.label}>Genel Notlar</Text>
                                        <TextInput style={[styles.input, { height: 80 }]} multiline value={notes} onChangeText={setNotes} placeholder="Teklif ile ilgili iç notlar..." placeholderTextColor="#94A3B8" />
                                    </View>
                                </View>
                            )}

                            {/* TAB: PRODUCTS */}
                            {activeTab === 'products' && (
                                <View style={styles.formSection}>
                                    <Text style={styles.sectionTitle}>Ürün Kalemleri</Text>
                                    <View style={styles.searchBar}>
                                        <Ionicons name="search" size={16} color="#94A3B8" />
                                        <TextInput style={styles.searchInput} placeholder="Ürün ara ve ekle..." value={productSearch} onChangeText={setProductSearch} placeholderTextColor="#94A3B8" />
                                    </View>
                                    {productSearch.length > 0 && (
                                        <ScrollView style={{ maxHeight: 160, marginBottom: 8 }}>
                                            {products.filter(p => (p.name || '').toLowerCase().includes(productSearch.toLowerCase())).map(p => (
                                                <TouchableOpacity key={p.id} style={styles.suggestionRow} onPress={() => handleAddItem(p)}>
                                                    <Ionicons name="cube" size={14} color={Colors.iosBlue} style={{ marginRight: 8 }} />
                                                    <Text style={styles.suggestionText} numberOfLines={1}>{p.name}</Text>
                                                    <Text style={styles.suggestionSub}>Stok: {p.quantity}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    )}

                                    {items.length > 0 && (
                                        <View style={styles.itemsTableWrap}>
                                            <View style={styles.itemsTableHeader}>
                                                <Text style={[styles.itemsHeaderCell, { flex: 3 }]}>ÜRÜN</Text>
                                                <Text style={[styles.itemsHeaderCell, { flex: 1, textAlign: 'center' }]}>ADET</Text>
                                                <Text style={[styles.itemsHeaderCell, { flex: 1.5, textAlign: 'center' }]}>B.FİYAT (₺)</Text>
                                                <Text style={[styles.itemsHeaderCell, { flex: 1.5, textAlign: 'right' }]}>TOPLAM</Text>
                                                <View style={{ width: 32 }} />
                                            </View>
                                            {items.map(item => (
                                                <View key={item.product_id} style={styles.itemRow}>
                                                    <View style={{ flex: 3 }}>
                                                        <Text style={styles.itemName} numberOfLines={1}>{item.product_name}</Text>
                                                    </View>
                                                    <TextInput style={[styles.itemInput, { flex: 1 }]} value={item.quantity.toString()} onChangeText={v => handleUpdateItemQty(item.product_id, v)} keyboardType="numeric" textAlign="center" />
                                                    <TextInput style={[styles.itemInput, { flex: 1.5 }]} value={item.unit_price.toString()} onChangeText={v => handleUpdateItemPrice(item.product_id, v)} keyboardType="numeric" textAlign="center" />
                                                    <Text style={[styles.itemTotal, { flex: 1.5 }]}>
                                                        {Number(item.total || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                                    </Text>
                                                    <TouchableOpacity style={{ width: 32, alignItems: 'center' }} onPress={() => handleRemoveItem(item.product_id)}>
                                                        <Ionicons name="trash-outline" size={16} color="#DC2626" />
                                                    </TouchableOpacity>
                                                </View>
                                            ))}
                                            <View style={{ padding: 12, backgroundColor: '#F8FAFC', borderTopWidth: 1, borderTopColor: '#E2E8F0' }}>
                                                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 6 }}>
                                                    <Text style={styles.itemsTotalLabel}>Ara Toplam:</Text>
                                                    <Text style={[styles.itemsTotalValue, { fontSize: 14 }]}>{subTotalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</Text>
                                                </View>
                                                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 6 }}>
                                                    <Text style={styles.itemsTotalLabel}>İndirim (₺):</Text>
                                                    <TextInput style={[styles.itemInput, { width: 100, textAlign: 'right' }]} value={discountAmount} onChangeText={setDiscountAmount} keyboardType="numeric" />
                                                </View>
                                                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 4 }}>
                                                    <Text style={[styles.itemsTotalLabel, { fontSize: 16 }]}>Genel Toplam:</Text>
                                                    <Text style={[styles.itemsTotalValue, { fontSize: 20 }]}>{finalTotalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</Text>
                                                </View>
                                            </View>
                                        </View>
                                    )}
                                </View>
                            )}

                            {/* TAB: CRM */}
                            {activeTab === 'crm' && (
                                <View style={styles.formSection}>
                                    <Text style={styles.sectionTitle}>Satış ve Takip Bilgileri</Text>
                                    <View style={styles.row}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.label}>Sorumlu Personel</Text>
                                            {isWeb ? (
                                                <select style={styles.selectInput} value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                                                    <option value="">Seçiniz...</option>
                                                    {personnel.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                </select>
                                            ) : (
                                                <TextInput style={styles.input} value={assigneeId} onChangeText={setAssigneeId} placeholder="Personel ID..." />
                                            )}
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.label}>Kazanma İhtimali (%)</Text>
                                            <TextInput style={styles.input} value={probability} onChangeText={setProbability} placeholder="0-100" keyboardType="numeric" />
                                        </View>
                                    </View>
                                    <View style={styles.row}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.label}>Sonraki Takip Tarihi</Text>
                                            <TextInput style={styles.input} value={nextFollowUp} onChangeText={setNextFollowUp} placeholder="YYYY-AA-GG" />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.label}>Teklif Geçerlilik Tarihi</Text>
                                            <TextInput style={styles.input} value={validUntil} onChangeText={setValidUntil} placeholder="YYYY-AA-GG" />
                                        </View>
                                    </View>
                                    <View style={{ marginTop: 8 }}>
                                        <Text style={styles.label}>Etiketler (Virgülle ayırın)</Text>
                                        <TextInput style={styles.input} value={tags} onChangeText={setTags} placeholder="Örn: Sıcak, İstanbul, Büyük Proje" />
                                    </View>
                                    <View style={{ marginTop: 8 }}>
                                        <Text style={styles.label}>Şartlar ve Koşullar (Müşteriye Sunulacak)</Text>
                                        <TextInput style={[styles.input, { height: 80 }]} multiline value={termsConditions} onChangeText={setTermsConditions} placeholder="Müşteriye iletilecek şartlar..." />
                                    </View>
                                </View>
                            )}
                        </ScrollView>

                        <View style={styles.modalFoot}>
                            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                                <Ionicons name="checkmark-circle" size={18} color="#fff" style={{ marginRight: 8 }} />
                                <Text style={styles.saveBtnText}>{isEdit ? 'Değişiklikleri Kaydet' : 'Oluştur ve Taslak Olarak Kaydet'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ===== DETAY MODALI ===== */}
            <Modal visible={detailModalVisible} animationType={isWeb ? 'fade' : 'slide'} transparent>
                <View style={styles.overlay}>
                    <View style={[styles.modalBox, { maxWidth: 800 }]}>
                        <View style={styles.modalHead}>
                            <View>
                                <Text style={styles.modalTitle}>{selectedQ?.quote_number}</Text>
                                <Text style={styles.modalSub}>{selectedQ?.customer_name || 'Müşterisiz'}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                {selectedQ && <StatusBadge status={selectedQ.status} />}
                                <TouchableOpacity style={styles.closeBtn} onPress={() => setDetailModalVisible(false)}>
                                    <Ionicons name="close" size={20} color="#64748B" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24 }}>
                            {/* Üst CRM Özet */}
                            <View style={{ flexDirection: 'row', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
                                <View style={styles.summaryBox}>
                                    <Text style={styles.summaryLbl}>Toplam Tutar</Text>
                                    <Text style={styles.summaryVal}>{Number(selectedQ?.total_amount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</Text>
                                </View>
                                <View style={styles.summaryBox}>
                                    <Text style={styles.summaryLbl}>İhtimal</Text>
                                    <Text style={styles.summaryVal}>%{selectedQ?.probability || 0}</Text>
                                </View>
                                <View style={styles.summaryBox}>
                                    <Text style={styles.summaryLbl}>Takip Tarihi</Text>
                                    <Text style={styles.summaryVal}>{selectedQ?.next_follow_up ? new Date(selectedQ.next_follow_up).toLocaleDateString('tr-TR') : '-'}</Text>
                                </View>
                                <View style={styles.summaryBox}>
                                    <Text style={styles.summaryLbl}>Sorumlu</Text>
                                    <Text style={styles.summaryVal}>{personnel.find(p => p.id === selectedQ?.assignee_id)?.name || '-'}</Text>
                                </View>
                            </View>

                            {/* Kalemler */}
                            <View style={styles.formSection}>
                                <Text style={styles.sectionTitle}>Ürün Kalemleri</Text>
                                {(selectedQ?.items || []).length === 0 ? (
                                    <Text style={{ color: '#94A3B8', fontSize: 13 }}>Kalem bulunamadı.</Text>
                                ) : (
                                    <View style={styles.itemsTableWrap}>
                                        <View style={styles.itemsTableHeader}>
                                            <Text style={[styles.itemsHeaderCell, { flex: 3 }]}>ÜRÜN</Text>
                                            <Text style={[styles.itemsHeaderCell, { flex: 1, textAlign: 'center' }]}>ADET</Text>
                                            <Text style={[styles.itemsHeaderCell, { flex: 1.5, textAlign: 'center' }]}>B.FİYAT (₺)</Text>
                                            <Text style={[styles.itemsHeaderCell, { flex: 1.5, textAlign: 'right' }]}>TOPLAM</Text>
                                        </View>
                                        {(selectedQ?.items || []).map((item, idx) => (
                                            <View key={idx} style={[styles.itemRow, { paddingRight: 12 }]}>
                                                <View style={{ flex: 3 }}><Text style={styles.itemName}>{item.product_name}</Text></View>
                                                <Text style={{ flex: 1, textAlign: 'center', fontSize: 14 }}>{item.quantity}</Text>
                                                <Text style={{ flex: 1.5, textAlign: 'center', fontSize: 14 }}>{Number(item.unit_price || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</Text>
                                                <Text style={[styles.itemTotal, { flex: 1.5 }]}>{Number(item.total || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</Text>
                                            </View>
                                        ))}
                                        <View style={{ padding: 12, backgroundColor: '#F8FAFC', borderTopWidth: 1, borderTopColor: '#E2E8F0' }}>
                                            {selectedQ?.discount_amount > 0 && (
                                                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 4 }}>
                                                    <Text style={styles.itemsTotalLabel}>İndirim:</Text>
                                                    <Text style={[styles.itemsTotalValue, { fontSize: 14, color: '#DC2626' }]}>- {Number(selectedQ.discount_amount).toLocaleString('tr-TR')} ₺</Text>
                                                </View>
                                            )}
                                            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' }}>
                                                <Text style={[styles.itemsTotalLabel, { fontSize: 16 }]}>Genel Toplam:</Text>
                                                <Text style={styles.itemsTotalValue}>{Number(selectedQ?.total_amount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</Text>
                                            </View>
                                        </View>
                                    </View>
                                )}
                            </View>

                            {selectedQ?.terms_conditions ? (
                                <View style={styles.formSection}>
                                    <Text style={styles.sectionTitle}>Şartlar ve Koşullar</Text>
                                    <Text style={{ fontSize: 14, color: '#334155' }}>{selectedQ.terms_conditions}</Text>
                                </View>
                            ) : null}
                            
                            {/* Aşama Değiştirme Butonları */}
                            <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Hızlı Aşama Değiştir</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                                {['SENT', 'NEGOTIATION', 'APPROVED', 'CONVERTED', 'REJECTED'].map(st => {
                                    if (selectedQ?.status === st || selectedQ?.status === 'CONVERTED' || selectedQ?.status === 'REJECTED') return null;
                                    const cfg = STATUS_CONFIG[st];
                                    return (
                                        <TouchableOpacity key={st} style={[styles.actionBtnLite, { backgroundColor: cfg.bg, borderColor: cfg.border }]} onPress={() => handleChangeStatus(selectedQ, st)}>
                                            <Text style={{ fontSize: 12, fontWeight: '700', color: cfg.color }}>{cfg.label} Yap</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                        </ScrollView>

                        {/* Alt Aksiyon Butonları */}
                        <View style={[styles.modalFoot, { flexDirection: 'row', gap: 10 }]}>
                            {selectedQ?.status !== 'CONVERTED' && selectedQ?.status !== 'REJECTED' && (
                                <TouchableOpacity style={[styles.saveBtn, { flex: 1, backgroundColor: '#6366F1' }]} onPress={() => { setDetailModalVisible(false); handleOpenModal(selectedQ); }}>
                                    <Ionicons name="create-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
                                    <Text style={styles.saveBtnText}>Düzenle</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity style={[styles.saveBtn, { flex: 1, backgroundColor: '#DC2626' }]} onPress={() => handleDelete(selectedQ)}>
                                <Ionicons name="trash-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
                                <Text style={styles.saveBtnText}>Sil</Text>
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
    row: { flexDirection: 'row', gap: 12, marginBottom: 8 },

    // Header
    pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 },
    pageTitle: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
    pageSubtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
    newBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.iosBlue, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, gap: 6, ...Platform.select({ web: { boxShadow: '0 2px 8px rgba(0,122,255,0.3)', cursor: 'pointer' } }) },
    newBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    
    // View Toggle
    viewToggle: { flexDirection: 'row', backgroundColor: '#E2E8F0', borderRadius: 8, padding: 4 },
    viewToggleBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, gap: 6 },
    viewToggleBtnActive: { backgroundColor: Colors.iosBlue },
    viewToggleText: { fontSize: 13, fontWeight: '600', color: '#64748B' },

    // Stats
    statsRow: { flexDirection: 'row', paddingHorizontal: 24, gap: 12, marginBottom: 16, flexWrap: 'wrap' },
    statCard: { flex: 1, minWidth: 150, backgroundColor: '#fff', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderLeftWidth: 4, ...Platform.select({ web: { boxShadow: '0 1px 4px rgba(0,0,0,0.06)' } }) },
    statIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    statVal: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
    statLbl: { fontSize: 11, color: '#64748B', fontWeight: '500', marginTop: 2 },

    // Toolbar
    toolbar: { flexDirection: 'row', paddingHorizontal: 24, marginBottom: 12, gap: 12 },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
    searchInput: { flex: 1, fontSize: 14, color: '#1E293B', outlineStyle: 'none', marginLeft: 8 },
    filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    selectInput: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', outlineStyle: 'none', fontSize: 14, color: '#1E293B' },

    // Web Table
    webTableWrap: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden', marginHorizontal: 24, marginBottom: 40 },
    webTableHeader: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderBottomWidth: 2, borderBottomColor: '#E2E8F0', paddingVertical: 12, paddingHorizontal: 16 },
    webHeaderCell: { fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 },
    webTableRow: { flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', alignItems: 'center' },
    webRowEven: { backgroundColor: '#fff' },
    webRowOdd: { backgroundColor: '#FAFBFC' },
    webCellBold: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
    webCellSub: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
    webCellMono: { fontSize: 13, fontWeight: '700', color: Colors.iosBlue, fontFamily: Platform.OS === 'web' ? 'monospace' : 'System' },
    webActionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, paddingHorizontal: 8, borderRadius: 8, gap: 4, ...Platform.select({ web: { cursor: 'pointer' } }) },
    webActionBtnText: { fontSize: 12, fontWeight: '700' },

    // Status
    statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
    statusText: { fontSize: 11, fontWeight: '800' },

    // Kanban
    kanbanWrap: { paddingHorizontal: 24, paddingBottom: 40, gap: 16 },
    kanbanColumn: { width: 300, backgroundColor: '#F1F5F9', borderRadius: 12, padding: 12, maxHeight: '100%' },
    kanbanHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, borderTopWidth: 3, paddingTop: 8 },
    kanbanTitle: { fontSize: 14, fontWeight: '800' },
    kanbanCount: { backgroundColor: '#E2E8F0', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
    kanbanCountText: { fontSize: 12, fontWeight: '700', color: '#475569' },
    kanbanTotal: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 12 },
    kanbanCard: { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0', ...Platform.select({ web: { boxShadow: '0 1px 3px rgba(0,0,0,0.05)', cursor: 'pointer' } }) },
    miniTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F8FAFC', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#E2E8F0' },
    miniTagText: { fontSize: 10, color: '#64748B', fontWeight: '600' },

    // Mobile Card
    card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardQuoteNum: { fontSize: 11, fontWeight: '800', color: Colors.iosBlue, marginBottom: 2 },
    cardTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
    cardSub: { fontSize: 12, color: '#64748B', marginTop: 4 },

    // Empty
    empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 },
    emptyText: { marginTop: 12, fontSize: 15, color: '#94A3B8', textAlign: 'center' },

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

    // Tabs
    tabsContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingHorizontal: 24 },
    tabBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 2, borderBottomColor: 'transparent', gap: 6 },
    tabBtnActive: { borderBottomColor: Colors.iosBlue },
    tabText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
    tabTextActive: { color: Colors.iosBlue },

    // Form
    formSection: { marginBottom: 20, backgroundColor: '#F8FAFC', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
    sectionTitle: { fontSize: 13, fontWeight: '800', color: Colors.iosBlue, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
    label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 },
    input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 12, fontSize: 14, color: '#1E293B', outlineStyle: 'none' },

    // Suggestion dropdown
    suggestionRow: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#fff', borderRadius: 8, marginBottom: 4, borderWidth: 1, borderColor: '#E2E8F0' },
    suggestionRowActive: { backgroundColor: Colors.iosBlue, borderColor: Colors.iosBlue },
    suggestionText: { fontSize: 14, fontWeight: '600', color: '#0F172A', flex: 1 },
    suggestionSub: { fontSize: 12, color: '#94A3B8' },

    // Selected customer
    selectedCustomer: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#EFF6FF', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#BFDBFE', marginTop: 8 },
    selectedCustomerText: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.iosBlue },

    // Items table
    itemsTableWrap: { marginTop: 8, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#fff' },
    itemsTableHeader: { flexDirection: 'row', backgroundColor: '#F8FAFC', paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
    itemsHeaderCell: { fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.4 },
    itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 6 },
    itemName: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
    itemInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 8, fontSize: 14, color: '#1E293B', outlineStyle: 'none' },
    itemTotal: { fontSize: 14, fontWeight: '700', color: Colors.iosBlue, textAlign: 'right' },
    itemsTotalLabel: { fontSize: 13, fontWeight: '600', color: '#475569', marginRight: 12 },
    itemsTotalValue: { fontSize: 18, fontWeight: '800', color: Colors.iosBlue },

    // Detail Summary Box
    summaryBox: { flex: 1, minWidth: 120, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' },
    summaryLbl: { fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: 4 },
    summaryVal: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
    
    // Action Btn
    actionBtnLite: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, alignItems: 'center' }
});
