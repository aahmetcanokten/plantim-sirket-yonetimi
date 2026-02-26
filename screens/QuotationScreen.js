import React, { useState, useContext, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, ScrollView, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../AppContext';
import { Colors } from '../Theme';

const isWeb = Platform.OS === 'web';

const STATUS_CONFIG = {
    DRAFT: { label: 'TASLAK', color: '#64748B', bg: '#F8FAFC', border: '#CBD5E1', dot: '#64748B' },
    APPROVED: { label: 'ONAYLANDI', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', dot: '#2563EB' },
    CONVERTED: { label: 'SİPARİŞE DÖNÜŞTÜRÜLDÜ', color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0', dot: '#16A34A' },
    CANCELLED: { label: 'İPTAL', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', dot: '#DC2626' },
};

export default function QuotationScreen() {
    const {
        quotations, addQuotation, updateQuotation, cancelQuotation,
        approveQuotation, convertQuotationToSale, deleteQuotation,
        products, customers
    } = useContext(AppContext);

    // Modal states
    const [modalVisible, setModalVisible] = useState(false);
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [selectedQ, setSelectedQ] = useState(null);
    const [isEdit, setIsEdit] = useState(false);

    // Form states
    const [customerId, setCustomerId] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [validUntil, setValidUntil] = useState('');
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState([]); // [{product_id, product_name, quantity, unit_price, total}]
    const [customerSearch, setCustomerSearch] = useState('');
    const [productSearch, setProductSearch] = useState('');

    // List states
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    // --- Stats ---
    const stats = useMemo(() => {
        if (!Array.isArray(quotations)) return { total: 0, approved: 0, converted: 0, cancelled: 0 };
        return {
            total: quotations.length,
            approved: quotations.filter(q => q.status === 'APPROVED').length,
            converted: quotations.filter(q => q.status === 'CONVERTED').length,
            cancelled: quotations.filter(q => q.status === 'CANCELLED').length,
        };
    }, [quotations]);

    // --- Filtered list ---
    const filteredQuotations = useMemo(() => {
        if (!Array.isArray(quotations)) return [];
        return quotations.filter(q => {
            if (statusFilter !== 'ALL' && q.status !== statusFilter) return false;
            if (searchQuery) {
                const sq = searchQuery.toLowerCase();
                return (q.quote_number || '').toLowerCase().includes(sq) ||
                    (q.customer_name || '').toLowerCase().includes(sq);
            }
            return true;
        });
    }, [quotations, searchQuery, statusFilter]);

    // --- Form helpers ---
    const resetForm = () => {
        setCustomerId(''); setCustomerName(''); setValidUntil('');
        setNotes(''); setItems([]); setCustomerSearch(''); setProductSearch('');
        setSelectedQ(null); setIsEdit(false);
    };

    const handleOpenModal = (q = null) => {
        if (q) {
            setSelectedQ(q);
            setCustomerId(q.customer_id || '');
            setCustomerName(q.customer_name || '');
            setValidUntil(q.valid_until || '');
            setNotes(q.notes || '');
            setItems(q.items ? q.items.map(i => ({ ...i })) : []);
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

    const totalAmount = useMemo(() => items.reduce((s, i) => s + (parseFloat(i.total) || 0), 0), [items]);

    const handleSave = async () => {
        if (!customerName && !customerId) {
            Alert.alert('Hata', 'Lütfen müşteri seçiniz veya müşteri adı giriniz.');
            return;
        }
        if (items.length === 0) {
            Alert.alert('Hata', 'Lütfen en az bir ürün kalemi ekleyiniz.');
            return;
        }
        const qData = { customer_id: customerId || null, customer_name: customerName, valid_until: validUntil || null, notes, items };
        if (isEdit) {
            await updateQuotation({ ...selectedQ, ...qData });
        } else {
            await addQuotation(qData);
        }
        setModalVisible(false);
        resetForm();
    };

    const handleApprove = (q) => {
        const proceed = async () => { await approveQuotation(q.id); setDetailModalVisible(false); };
        if (isWeb) { if (window.confirm('Teklifi onaylamak istediğinize emin misiniz?')) proceed(); }
        else Alert.alert('Onayla', 'Teklifi onaylamak istediğinize emin misiniz?', [{ text: 'Hayır', style: 'cancel' }, { text: 'Evet', onPress: proceed }]);
    };

    const handleCancel = (q) => {
        const proceed = async () => { await cancelQuotation(q.id); setDetailModalVisible(false); };
        if (isWeb) { if (window.confirm('Teklif iptal edilecek. Onaylıyor musunuz?')) proceed(); }
        else Alert.alert('İptal Et', 'Teklif iptal edilecek. Onaylıyor musunuz?', [{ text: 'Hayır', style: 'cancel' }, { text: 'Evet, İptal Et', style: 'destructive', onPress: proceed }]);
    };

    const handleConvert = (q) => {
        const proceed = async () => {
            const result = await convertQuotationToSale(q.id);
            if (result) {
                setDetailModalVisible(false);
                if (isWeb) window.alert('Teklif başarıyla satış siparişine dönüştürüldü. Satışlar ekranından kontrol edebilirsiniz.');
                else Alert.alert('Başarılı', 'Teklif satış siparişine dönüştürüldü.');
            }
        };
        if (isWeb) { if (window.confirm(`"${q.quote_number}" numaralı teklif satış siparişine dönüştürülecek ve stok düşülecektir. Onaylıyor musunuz?`)) proceed(); }
        else Alert.alert('Siparişe Dönüştür', 'Teklif satış siparişine dönüştürülecek ve stok düşülecektir.', [{ text: 'Hayır', style: 'cancel' }, { text: 'Evet, Dönüştür', onPress: proceed }]);
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

    // --- Web Table Row ---
    const WebTableRow = ({ item, index }) => (
        <View style={[styles.webTableRow, index % 2 === 0 ? styles.webRowEven : styles.webRowOdd]}>
            <View style={{ flex: 1.6, justifyContent: 'center' }}>
                <Text style={styles.webCellMono}>{item.quote_number || '—'}</Text>
                <Text style={styles.webCellSub}>{new Date(item.created_at).toLocaleDateString('tr-TR')}</Text>
            </View>
            <View style={{ flex: 2, justifyContent: 'center' }}>
                <Text style={styles.webCellBold} numberOfLines={1}>{item.customer_name || 'Müşterisiz'}</Text>
            </View>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <View style={styles.webQtyBadge}>
                    <Text style={styles.webQtyText}>{(item.items || []).length} kalem</Text>
                </View>
            </View>
            <View style={{ flex: 1.6, justifyContent: 'center', alignItems: 'flex-end', paddingRight: 12 }}>
                <Text style={[styles.webCellBold, { color: Colors.iosBlue }]}>
                    {Number(item.total_amount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                </Text>
                {item.valid_until && (
                    <Text style={styles.webCellSub}>Geçerli: {new Date(item.valid_until).toLocaleDateString('tr-TR')}</Text>
                )}
            </View>
            <View style={{ flex: 1.4, justifyContent: 'center', alignItems: 'center' }}>
                <StatusBadge status={item.status} />
            </View>
            <View style={{ flex: 2, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
                <TouchableOpacity style={[styles.webActionBtn, { backgroundColor: '#EFF6FF' }]} onPress={() => handleOpenDetail(item)}>
                    <Ionicons name="eye-outline" size={14} color={Colors.iosBlue} />
                    <Text style={[styles.webActionBtnText, { color: Colors.iosBlue }]}>Detay</Text>
                </TouchableOpacity>
                {item.status === 'DRAFT' && (
                    <TouchableOpacity style={[styles.webActionBtn, { backgroundColor: '#EFF6FF' }]} onPress={() => handleOpenModal(item)}>
                        <Ionicons name="create-outline" size={14} color={Colors.iosBlue} />
                        <Text style={[styles.webActionBtnText, { color: Colors.iosBlue }]}>Düzenle</Text>
                    </TouchableOpacity>
                )}
                {item.status === 'DRAFT' && (
                    <TouchableOpacity style={[styles.webActionBtn, { backgroundColor: '#F0FDF4' }]} onPress={() => handleApprove(item)}>
                        <Ionicons name="checkmark-circle-outline" size={14} color={Colors.iosGreen} />
                        <Text style={[styles.webActionBtnText, { color: Colors.iosGreen }]}>Onayla</Text>
                    </TouchableOpacity>
                )}
                {item.status === 'APPROVED' && (
                    <TouchableOpacity style={[styles.webActionBtn, { backgroundColor: '#F0FDF4' }]} onPress={() => handleConvert(item)}>
                        <Ionicons name="cart-outline" size={14} color={Colors.iosGreen} />
                        <Text style={[styles.webActionBtnText, { color: Colors.iosGreen }]}>Siparişe Dön.</Text>
                    </TouchableOpacity>
                )}
                {(item.status === 'DRAFT' || item.status === 'APPROVED') && (
                    <TouchableOpacity style={[styles.webActionBtn, { backgroundColor: '#FEF2F2' }]} onPress={() => handleCancel(item)}>
                        <Ionicons name="close-circle-outline" size={14} color="#DC2626" />
                        <Text style={[styles.webActionBtnText, { color: '#DC2626' }]}>İptal</Text>
                    </TouchableOpacity>
                )}
                {(item.status === 'DRAFT' || item.status === 'CANCELLED') && (
                    <TouchableOpacity style={[styles.webActionBtn, { backgroundColor: '#FEF2F2' }]} onPress={() => handleDelete(item)}>
                        <Ionicons name="trash-outline" size={14} color="#DC2626" />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    // --- Mobile Card ---
    const MobileCard = ({ item }) => {
        const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.DRAFT;
        return (
            <TouchableOpacity style={styles.card} onPress={() => handleOpenDetail(item)}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.cardQuoteNum}>{item.quote_number || '—'}</Text>
                        <Text style={styles.cardTitle} numberOfLines={1}>{item.customer_name || 'Müşterisiz'}</Text>
                        <Text style={styles.cardSub}>{(item.items || []).length} kalem • {Number(item.total_amount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</Text>
                    </View>
                    <StatusBadge status={item.status} />
                </View>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                    {item.status === 'DRAFT' && (
                        <TouchableOpacity style={[styles.cardActionBtn, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]} onPress={() => handleApprove(item)}>
                            <Ionicons name="checkmark-circle" size={14} color={Colors.iosGreen} />
                            <Text style={[styles.cardActionBtnText, { color: Colors.iosGreen }]}>Onayla</Text>
                        </TouchableOpacity>
                    )}
                    {item.status === 'APPROVED' && (
                        <TouchableOpacity style={[styles.cardActionBtn, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]} onPress={() => handleConvert(item)}>
                            <Ionicons name="cart" size={14} color={Colors.iosBlue} />
                            <Text style={[styles.cardActionBtnText, { color: Colors.iosBlue }]}>Siparişe Dönüştür</Text>
                        </TouchableOpacity>
                    )}
                    {(item.status === 'DRAFT' || item.status === 'APPROVED') && (
                        <TouchableOpacity style={[styles.cardActionBtn, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]} onPress={() => handleCancel(item)}>
                            <Ionicons name="close-circle" size={14} color="#DC2626" />
                            <Text style={[styles.cardActionBtnText, { color: '#DC2626' }]}>İptal</Text>
                        </TouchableOpacity>
                    )}
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
                    <Text style={styles.pageTitle}>Teklif Yönetimi</Text>
                    <Text style={styles.pageSubtitle}>{filteredQuotations.length} teklif gösteriliyor</Text>
                </View>
                <TouchableOpacity style={styles.newBtn} onPress={() => handleOpenModal()}>
                    <Ionicons name="add" size={18} color="#fff" />
                    <Text style={styles.newBtnText}>Yeni Teklif</Text>
                </TouchableOpacity>
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
                <View style={[styles.statCard, { borderLeftColor: '#64748B' }]}>
                    <View style={[styles.statIcon, { backgroundColor: '#F8FAFC' }]}><Ionicons name="document-text-outline" size={20} color="#64748B" /></View>
                    <View><Text style={styles.statVal}>{stats.total}</Text><Text style={styles.statLbl}>Toplam</Text></View>
                </View>
                <View style={[styles.statCard, { borderLeftColor: Colors.iosBlue }]}>
                    <View style={[styles.statIcon, { backgroundColor: '#EFF6FF' }]}><Ionicons name="checkmark-circle-outline" size={20} color={Colors.iosBlue} /></View>
                    <View><Text style={styles.statVal}>{stats.approved}</Text><Text style={styles.statLbl}>Onaylanan</Text></View>
                </View>
                <View style={[styles.statCard, { borderLeftColor: Colors.iosGreen }]}>
                    <View style={[styles.statIcon, { backgroundColor: '#F0FDF4' }]}><Ionicons name="cart-outline" size={20} color={Colors.iosGreen} /></View>
                    <View><Text style={styles.statVal}>{stats.converted}</Text><Text style={styles.statLbl}>Siparişe Dönüşen</Text></View>
                </View>
                <View style={[styles.statCard, { borderLeftColor: '#DC2626' }]}>
                    <View style={[styles.statIcon, { backgroundColor: '#FEF2F2' }]}><Ionicons name="close-circle-outline" size={20} color="#DC2626" /></View>
                    <View><Text style={styles.statVal}>{stats.cancelled}</Text><Text style={styles.statLbl}>İptal</Text></View>
                </View>
            </View>

            {/* Toolbar */}
            <View style={styles.toolbar}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={16} color="#94A3B8" />
                    <TextInput style={styles.searchInput} placeholder="Teklif no veya müşteri ara..." value={searchQuery} onChangeText={setSearchQuery} placeholderTextColor="#94A3B8" />
                    {searchQuery !== '' && <TouchableOpacity onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={18} color="#94A3B8" /></TouchableOpacity>}
                </View>
                <View style={styles.filterRow}>
                    <Text style={styles.filterLabel}>Durum:</Text>
                    {['ALL', 'DRAFT', 'APPROVED', 'CONVERTED', 'CANCELLED'].map(s => (
                        <TouchableOpacity key={s} style={[styles.filterBtn, statusFilter === s && styles.filterBtnActive]} onPress={() => setStatusFilter(s)}>
                            <Text style={[styles.filterBtnText, statusFilter === s && styles.filterBtnTextActive]}>
                                {s === 'ALL' ? 'Tümü' : STATUS_CONFIG[s]?.label || s}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* List */}
            {isWeb ? (
                <View style={styles.webTableWrap}>
                    <View style={styles.webTableHeader}>
                        <Text style={[styles.webHeaderCell, { flex: 1.6 }]}>TEKLİF NO</Text>
                        <Text style={[styles.webHeaderCell, { flex: 2 }]}>MÜŞTERİ</Text>
                        <Text style={[styles.webHeaderCell, { flex: 1, textAlign: 'center' }]}>KALEMLER</Text>
                        <Text style={[styles.webHeaderCell, { flex: 1.6, textAlign: 'right', paddingRight: 12 }]}>TUTAR</Text>
                        <Text style={[styles.webHeaderCell, { flex: 1.4, textAlign: 'center' }]}>DURUM</Text>
                        <Text style={[styles.webHeaderCell, { flex: 2, textAlign: 'right' }]}>İŞLEMLER</Text>
                    </View>
                    <FlatList
                        data={filteredQuotations}
                        keyExtractor={i => i.id.toString()}
                        renderItem={({ item, index }) => <WebTableRow item={item} index={index} />}
                        contentContainerStyle={{ paddingBottom: 40 }}
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <Ionicons name="document-text-outline" size={52} color="#CBD5E1" />
                                <Text style={styles.emptyText}>Teklif bulunamadı.</Text>
                                <TouchableOpacity style={styles.emptyBtn} onPress={() => handleOpenModal()}>
                                    <Text style={styles.emptyBtnText}>İlk Teklifi Oluştur</Text>
                                </TouchableOpacity>
                            </View>
                        }
                    />
                </View>
            ) : (
                <FlatList
                    data={filteredQuotations}
                    keyExtractor={i => i.id.toString()}
                    contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
                    renderItem={({ item }) => <MobileCard item={item} />}
                    ListEmptyComponent={<View style={styles.empty}><Ionicons name="document-text-outline" size={52} color="#CBD5E1" /><Text style={styles.emptyText}>Teklif bulunamadı.</Text></View>}
                />
            )}

            {/* ===== YENİ/DÜZENLE TEKLİF MODALI ===== */}
            <Modal visible={modalVisible} animationType={isWeb ? 'fade' : 'slide'} transparent>
                <View style={styles.overlay}>
                    <View style={[styles.modalBox, { maxWidth: 860 }]}>
                        <View style={styles.modalHead}>
                            <View>
                                <Text style={styles.modalTitle}>{isEdit ? 'Teklif Düzenle' : 'Yeni Teklif'}</Text>
                                {isEdit && <Text style={styles.modalSub}>{selectedQ?.quote_number}</Text>}
                            </View>
                            <TouchableOpacity style={styles.closeBtn} onPress={() => { setModalVisible(false); resetForm(); }}>
                                <Ionicons name="close" size={20} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24 }}>
                            {/* Müşteri */}
                            <View style={styles.formSection}>
                                <Text style={styles.sectionTitle}>Müşteri</Text>
                                <View style={styles.searchBar}>
                                    <Ionicons name="people-outline" size={16} color="#94A3B8" />
                                    <TextInput style={styles.searchInput} placeholder="Müşteri ara..." value={customerSearch} onChangeText={setCustomerSearch} placeholderTextColor="#94A3B8" />
                                </View>
                                {customerSearch.length > 0 && (
                                    <ScrollView style={{ maxHeight: 160, marginBottom: 8 }}>
                                        {customers.filter(c => (c.name || '').toLowerCase().includes(customerSearch.toLowerCase())).map(c => (
                                            <TouchableOpacity key={c.id} style={[styles.suggestionRow, customerId === c.id && styles.suggestionRowActive]}
                                                onPress={() => { setCustomerId(c.id); setCustomerName(c.name); setCustomerSearch(''); }}>
                                                <Ionicons name="person" size={14} color={customerId === c.id ? '#fff' : Colors.iosBlue} style={{ marginRight: 8 }} />
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
                                    <View>
                                        <Text style={styles.label}>Veya manuel müşteri adı girin</Text>
                                        <TextInput style={styles.input} value={customerName} onChangeText={setCustomerName} placeholder="Müşteri adı..." placeholderTextColor="#94A3B8" />
                                    </View>
                                )}
                                <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.label}>Geçerlilik Tarihi</Text>
                                        <TextInput style={styles.input} value={validUntil} onChangeText={setValidUntil} placeholder="YYYY-AA-GG" placeholderTextColor="#94A3B8" />
                                    </View>
                                </View>
                            </View>

                            {/* Ürün Kalemleri */}
                            <View style={styles.formSection}>
                                <Text style={styles.sectionTitle}>Ürün Kalemleri</Text>
                                <View style={styles.searchBar}>
                                    <Ionicons name="search" size={16} color="#94A3B8" />
                                    <TextInput style={styles.searchInput} placeholder="Ürün adı ara ve ekle..." value={productSearch} onChangeText={setProductSearch} placeholderTextColor="#94A3B8" />
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

                                {/* Seçili kalemler tablosu */}
                                {items.length > 0 && (
                                    <View style={styles.itemsTableWrap}>
                                        <View style={styles.itemsTableHeader}>
                                            <Text style={[styles.itemsHeaderCell, { flex: 3 }]}>ÜRÜN</Text>
                                            <Text style={[styles.itemsHeaderCell, { flex: 1, textAlign: 'center' }]}>ADET</Text>
                                            <Text style={[styles.itemsHeaderCell, { flex: 1.5, textAlign: 'center' }]}>BİRİM FİYAT</Text>
                                            <Text style={[styles.itemsHeaderCell, { flex: 1.5, textAlign: 'right' }]}>TOPLAM</Text>
                                            <View style={{ width: 32 }} />
                                        </View>
                                        {items.map(item => (
                                            <View key={item.product_id} style={styles.itemRow}>
                                                <View style={{ flex: 3 }}>
                                                    <Text style={styles.itemName} numberOfLines={1}>{item.product_name}</Text>
                                                    {item.product_code ? <Text style={styles.itemCode}>#{item.product_code}</Text> : null}
                                                </View>
                                                <TextInput
                                                    style={[styles.itemInput, { flex: 1 }]}
                                                    value={item.quantity.toString()}
                                                    onChangeText={v => handleUpdateItemQty(item.product_id, v)}
                                                    keyboardType="numeric"
                                                    textAlign="center"
                                                />
                                                <TextInput
                                                    style={[styles.itemInput, { flex: 1.5 }]}
                                                    value={item.unit_price.toString()}
                                                    onChangeText={v => handleUpdateItemPrice(item.product_id, v)}
                                                    keyboardType="numeric"
                                                    textAlign="center"
                                                />
                                                <Text style={[styles.itemTotal, { flex: 1.5 }]}>
                                                    {Number(item.total || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                                </Text>
                                                <TouchableOpacity style={{ width: 32, alignItems: 'center' }} onPress={() => handleRemoveItem(item.product_id)}>
                                                    <Ionicons name="trash-outline" size={16} color="#DC2626" />
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                        <View style={styles.itemsTotalRow}>
                                            <Text style={styles.itemsTotalLabel}>Genel Toplam:</Text>
                                            <Text style={styles.itemsTotalValue}>{totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</Text>
                                        </View>
                                    </View>
                                )}
                            </View>

                            {/* Notlar */}
                            <View style={styles.formSection}>
                                <Text style={styles.sectionTitle}>Notlar</Text>
                                <TextInput style={[styles.input, { height: 80 }]} multiline value={notes} onChangeText={setNotes} placeholder="Teklif ile ilgili notlar..." placeholderTextColor="#94A3B8" />
                            </View>
                        </ScrollView>

                        <View style={styles.modalFoot}>
                            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                                <Ionicons name="checkmark-circle" size={18} color="#fff" style={{ marginRight: 8 }} />
                                <Text style={styles.saveBtnText}>{isEdit ? 'Güncelle' : 'Taslak Olarak Kaydet'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ===== DETAY MODALI ===== */}
            <Modal visible={detailModalVisible} animationType={isWeb ? 'fade' : 'slide'} transparent>
                <View style={styles.overlay}>
                    <View style={[styles.modalBox, { maxWidth: 720 }]}>
                        <View style={styles.modalHead}>
                            <View>
                                <Text style={styles.modalTitle}>{selectedQ?.quote_number}</Text>
                                <Text style={styles.modalSub}>{selectedQ?.customer_name || 'Müşterisiz'}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                {selectedQ && <StatusBadge status={selectedQ.status} />}
                                <TouchableOpacity style={styles.closeBtn} onPress={() => setDetailModalVisible(false)}>
                                    <Ionicons name="close" size={20} color="#64748B" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24 }}>
                            {/* Bilgiler */}
                            <View style={styles.formSection}>
                                <Text style={styles.sectionTitle}>Teklif Bilgileri</Text>
                                <View style={{ flexDirection: 'row', gap: 20, flexWrap: 'wrap' }}>
                                    <View style={{ minWidth: 140 }}>
                                        <Text style={styles.detailLabel}>Oluşturma Tarihi</Text>
                                        <Text style={styles.detailValue}>{selectedQ ? new Date(selectedQ.created_at).toLocaleDateString('tr-TR') : '—'}</Text>
                                    </View>
                                    <View style={{ minWidth: 140 }}>
                                        <Text style={styles.detailLabel}>Geçerlilik Tarihi</Text>
                                        <Text style={styles.detailValue}>{selectedQ?.valid_until ? new Date(selectedQ.valid_until).toLocaleDateString('tr-TR') : 'Belirtilmemiş'}</Text>
                                    </View>
                                    <View style={{ minWidth: 140 }}>
                                        <Text style={styles.detailLabel}>Toplam Tutar</Text>
                                        <Text style={[styles.detailValue, { color: Colors.iosBlue, fontWeight: '800' }]}>
                                            {Number(selectedQ?.total_amount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                        </Text>
                                    </View>
                                </View>
                                {selectedQ?.notes ? (
                                    <View style={{ marginTop: 12, backgroundColor: '#F8FAFC', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#E2E8F0' }}>
                                        <Text style={styles.detailLabel}>Notlar</Text>
                                        <Text style={{ fontSize: 14, color: '#334155', marginTop: 4 }}>{selectedQ.notes}</Text>
                                    </View>
                                ) : null}
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
                                            <Text style={[styles.itemsHeaderCell, { flex: 1.5, textAlign: 'center' }]}>BİRİM FİYAT</Text>
                                            <Text style={[styles.itemsHeaderCell, { flex: 1.5, textAlign: 'right' }]}>TOPLAM</Text>
                                        </View>
                                        {(selectedQ?.items || []).map((item, idx) => (
                                            <View key={idx} style={[styles.itemRow, { paddingRight: 0 }]}>
                                                <View style={{ flex: 3 }}>
                                                    <Text style={styles.itemName}>{item.product_name}</Text>
                                                    {item.product_code ? <Text style={styles.itemCode}>#{item.product_code}</Text> : null}
                                                </View>
                                                <Text style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: '600', color: '#334155' }}>{item.quantity}</Text>
                                                <Text style={{ flex: 1.5, textAlign: 'center', fontSize: 14, color: '#334155' }}>
                                                    {Number(item.unit_price || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                                </Text>
                                                <Text style={[styles.itemTotal, { flex: 1.5 }]}>
                                                    {Number(item.total || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                                </Text>
                                            </View>
                                        ))}
                                        <View style={styles.itemsTotalRow}>
                                            <Text style={styles.itemsTotalLabel}>Genel Toplam:</Text>
                                            <Text style={styles.itemsTotalValue}>{Number(selectedQ?.total_amount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</Text>
                                        </View>
                                    </View>
                                )}
                            </View>
                        </ScrollView>

                        {/* Aksiyon butonları */}
                        <View style={[styles.modalFoot, { flexDirection: 'row', gap: 10, flexWrap: 'wrap' }]}>
                            {selectedQ?.status === 'DRAFT' && (
                                <TouchableOpacity style={[styles.saveBtn, { flex: 1, backgroundColor: '#6366F1' }]} onPress={() => { setDetailModalVisible(false); handleOpenModal(selectedQ); }}>
                                    <Ionicons name="create-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
                                    <Text style={styles.saveBtnText}>Düzenle</Text>
                                </TouchableOpacity>
                            )}
                            {selectedQ?.status === 'DRAFT' && (
                                <TouchableOpacity style={[styles.saveBtn, { flex: 1, backgroundColor: Colors.iosGreen }]} onPress={() => handleApprove(selectedQ)}>
                                    <Ionicons name="checkmark-circle" size={16} color="#fff" style={{ marginRight: 6 }} />
                                    <Text style={styles.saveBtnText}>Onayla</Text>
                                </TouchableOpacity>
                            )}
                            {selectedQ?.status === 'APPROVED' && (
                                <TouchableOpacity style={[styles.saveBtn, { flex: 1, backgroundColor: Colors.iosGreen }]} onPress={() => handleConvert(selectedQ)}>
                                    <Ionicons name="cart" size={16} color="#fff" style={{ marginRight: 6 }} />
                                    <Text style={styles.saveBtnText}>Siparişe Dönüştür</Text>
                                </TouchableOpacity>
                            )}
                            {(selectedQ?.status === 'DRAFT' || selectedQ?.status === 'APPROVED') && (
                                <TouchableOpacity style={[styles.saveBtn, { flex: 1, backgroundColor: '#DC2626' }]} onPress={() => handleCancel(selectedQ)}>
                                    <Ionicons name="close-circle" size={16} color="#fff" style={{ marginRight: 6 }} />
                                    <Text style={styles.saveBtnText}>İptal Et</Text>
                                </TouchableOpacity>
                            )}
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
    filterRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    filterLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '600', marginRight: 4 },
    filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
    filterBtnActive: { backgroundColor: Colors.iosBlue, borderColor: Colors.iosBlue },
    filterBtnText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
    filterBtnTextActive: { color: '#fff' },

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
    webQtyBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0' },
    webQtyText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
    webActionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, paddingHorizontal: 8, borderRadius: 8, gap: 4, ...Platform.select({ web: { cursor: 'pointer' } }) },
    webActionBtnText: { fontSize: 12, fontWeight: '700' },

    // Status
    statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
    statusText: { fontSize: 11, fontWeight: '800' },

    // Mobile Card
    card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', ...Platform.select({ web: { boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }, default: { elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 } }) },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardQuoteNum: { fontSize: 11, fontWeight: '800', color: Colors.iosBlue, marginBottom: 2 },
    cardTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A' },
    cardSub: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
    cardActionBtn: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'center', paddingVertical: 9, borderRadius: 10, borderWidth: 1, gap: 5 },
    cardActionBtnText: { fontSize: 13, fontWeight: '700' },

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
    input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 12, marginBottom: 8, fontSize: 14, color: '#1E293B' },

    // Suggestion dropdown
    suggestionRow: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#fff', borderRadius: 8, marginBottom: 4, borderWidth: 1, borderColor: '#E2E8F0' },
    suggestionRowActive: { backgroundColor: Colors.iosBlue, borderColor: Colors.iosBlue },
    suggestionText: { fontSize: 14, fontWeight: '600', color: '#0F172A', flex: 1 },
    suggestionSub: { fontSize: 12, color: '#94A3B8' },

    // Selected customer
    selectedCustomer: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#EFF6FF', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#BFDBFE' },
    selectedCustomerText: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.iosBlue },

    // Items table
    itemsTableWrap: { marginTop: 8, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0' },
    itemsTableHeader: { flexDirection: 'row', backgroundColor: '#F8FAFC', paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
    itemsHeaderCell: { fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.4 },
    itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', backgroundColor: '#fff', gap: 6 },
    itemName: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
    itemCode: { fontSize: 11, color: '#94A3B8' },
    itemInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 8, fontSize: 14, color: '#1E293B', outlineStyle: 'none' },
    itemTotal: { fontSize: 14, fontWeight: '700', color: Colors.iosBlue, textAlign: 'right' },
    itemsTotalRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#F8FAFC', gap: 12 },
    itemsTotalLabel: { fontSize: 13, fontWeight: '700', color: '#475569' },
    itemsTotalValue: { fontSize: 18, fontWeight: '800', color: Colors.iosBlue },

    // Detail modal fields
    detailLabel: { fontSize: 11, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
    detailValue: { fontSize: 15, fontWeight: '600', color: '#0F172A' },
});
