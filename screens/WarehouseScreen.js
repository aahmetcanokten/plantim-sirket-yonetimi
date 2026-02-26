import React, { useContext, useState, useMemo, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Platform,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Modal,
    FlatList,
    Alert,
    Dimensions,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../AppContext';
import ImmersiveLayout from '../components/ImmersiveLayout';
import { Colors } from '../Theme';
import { useToast } from '../components/ToastProvider';

const isWeb = Platform.OS === 'web';
const { width } = Dimensions.get('window');

// ───────────────────────────────────────────────
// YARDIMCI BİLEŞENLER
// ───────────────────────────────────────────────

const StatCard = ({ icon, label, value, color, bg }) => (
    <View style={[styles.statCard, { backgroundColor: bg || '#F8FAFC' }]}>
        <View style={[styles.statIconWrap, { backgroundColor: color + '18' }]}>
            <Ionicons name={icon} size={22} color={color} />
        </View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
    </View>
);

const FilterTab = ({ label, active, onPress, count }) => (
    <TouchableOpacity
        style={[styles.filterTab, active && styles.filterTabActive]}
        onPress={onPress}
        activeOpacity={0.7}
    >
        <Text style={[styles.filterTabText, active && styles.filterTabTextActive]} numberOfLines={1}>
            {label}
        </Text>
        {count !== undefined && (
            <View style={[styles.filterTabBadge, active && styles.filterTabBadgeActive]}>
                <Text style={[styles.filterTabBadgeText, active && styles.filterTabBadgeTextActive]}>
                    {count}
                </Text>
            </View>
        )}
    </TouchableOpacity>
);

// ───────────────────────────────────────────────
// ANA EKRAN
// ───────────────────────────────────────────────

export default function WarehouseScreen() {
    const { products, warehouseTransfers, addWarehouseTransfer, appDataLoading } = useContext(AppContext);
    const toast = useToast();

    // State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedWarehouse, setSelectedWarehouse] = useState('ALL');
    const [activeTab, setActiveTab] = useState('stock'); // 'stock' | 'history'
    const [transferModalVisible, setTransferModalVisible] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [targetWarehouse, setTargetWarehouse] = useState('');
    const [transferQuantity, setTransferQuantity] = useState('');
    const [transferNote, setTransferNote] = useState('');
    const [isTransferring, setIsTransferring] = useState(false);
    const [showWarehousePicker, setShowWarehousePicker] = useState(false);

    // Ürünleri depo konumuna göre grupla
    const warehouses = useMemo(() => {
        const locations = new Set();
        products.forEach(p => {
            if (p.warehouseLocation || p.warehouse_location) {
                locations.add(p.warehouseLocation || p.warehouse_location);
            }
        });
        return Array.from(locations).sort();
    }, [products]);

    // Filtreli ürün listesi
    const filteredProducts = useMemo(() => {
        let list = [...products];
        // Depo filtresi
        if (selectedWarehouse !== 'ALL') {
            list = list.filter(p =>
                (p.warehouseLocation || p.warehouse_location) === selectedWarehouse
            );
        }
        // Arama filtresi
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(p =>
                (p.name || '').toLowerCase().includes(q) ||
                (p.code || '').toLowerCase().includes(q) ||
                (p.category || '').toLowerCase().includes(q)
            );
        }
        return list;
    }, [products, selectedWarehouse, searchQuery]);

    // İstatistikler
    const stats = useMemo(() => {
        const today = new Date().toDateString();
        const todayTransfers = warehouseTransfers.filter(
            t => new Date(t.transferred_at || t.created_at).toDateString() === today
        );
        return {
            warehouseCount: warehouses.length || 0,
            productCount: filteredProducts.length,
            todayTransfers: todayTransfers.length,
        };
    }, [warehouses, filteredProducts, warehouseTransfers]);

    // Transfer modalını aç
    const openTransferModal = (product) => {
        setSelectedProduct(product);
        setTargetWarehouse('');
        setTransferQuantity(String(product.quantity || 1));
        setTransferNote('');
        setTransferModalVisible(true);
    };

    // Transfer gerçekleştir
    const handleTransfer = async () => {
        const fromWarehouse = selectedProduct?.warehouseLocation || selectedProduct?.warehouse_location || '';
        if (!targetWarehouse.trim()) {
            if (Platform.OS === 'web') {
                window.alert('Lütfen hedef depo girin.');
            } else {
                Alert.alert('Hata', 'Lütfen hedef depo girin.');
            }
            return;
        }
        if (targetWarehouse.trim() === fromWarehouse.trim()) {
            if (Platform.OS === 'web') {
                window.alert('Kaynak ve hedef depo aynı olamaz.');
            } else {
                Alert.alert('Hata', 'Kaynak ve hedef depo aynı olamaz.');
            }
            return;
        }
        const qty = parseFloat(transferQuantity);
        if (!qty || qty <= 0) {
            if (Platform.OS === 'web') {
                window.alert('Geçerli bir miktar girin.');
            } else {
                Alert.alert('Hata', 'Geçerli bir miktar girin.');
            }
            return;
        }
        if (qty > (selectedProduct?.quantity || 0)) {
            if (Platform.OS === 'web') {
                window.alert(`Stok yetersiz. Mevcut: ${selectedProduct.quantity}`);
            } else {
                Alert.alert('Hata', `Stok yetersiz. Mevcut: ${selectedProduct.quantity}`);
            }
            return;
        }

        setIsTransferring(true);
        const result = await addWarehouseTransfer({
            product_id: selectedProduct.id,
            from_warehouse: fromWarehouse,
            to_warehouse: targetWarehouse.trim(),
            quantity: qty,
            note: transferNote,
        });
        setIsTransferring(false);

        if (result) {
            setTransferModalVisible(false);
            toast.showToast && toast.showToast('Transfer başarıyla gerçekleştirildi!');
        }
    };

    // ───────────────────────────────────────────────
    // RENDER
    // ───────────────────────────────────────────────

    const renderStockTable = () => {
        if (isWeb && width > 768) {
            // Web tablo görünümü
            return (
                <View style={styles.tableContainer}>
                    {/* Tablo başlığı */}
                    <View style={styles.tableHeader}>
                        <Text style={[styles.thCell, { flex: 2.5 }]}>Ürün Adı</Text>
                        <Text style={[styles.thCell, { flex: 1 }]}>Kod</Text>
                        <Text style={[styles.thCell, { flex: 1.2 }]}>Kategori</Text>
                        <Text style={[styles.thCell, { flex: 0.8, textAlign: 'center' }]}>Stok</Text>
                        <Text style={[styles.thCell, { flex: 0.6, textAlign: 'center' }]}>Birim</Text>
                        <Text style={[styles.thCell, { flex: 1.5 }]}>Depo Konumu</Text>
                        <Text style={[styles.thCell, { flex: 1, textAlign: 'center' }]}>İşlem</Text>
                    </View>

                    {appDataLoading ? (
                        <View style={styles.loadingRow}>
                            <ActivityIndicator size="small" color={Colors.primary} />
                            <Text style={styles.loadingText}>Yükleniyor...</Text>
                        </View>
                    ) : filteredProducts.length === 0 ? (
                        <View style={styles.emptyRow}>
                            <Ionicons name="cube-outline" size={32} color="#CBD5E1" />
                            <Text style={styles.emptyText}>Bu depoda ürün bulunamadı.</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={filteredProducts}
                            keyExtractor={i => i.id}
                            scrollEnabled={false}
                            renderItem={({ item, index }) => {
                                const location = item.warehouseLocation || item.warehouse_location || '';
                                const isLow = item.quantity <= (item.criticalStockLimit || item.critical_stock_limit || 0);
                                const isZero = item.quantity <= 0;
                                return (
                                    <View style={[styles.tableRow, index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd]}>
                                        {/* Ürün Adı */}
                                        <View style={{ flex: 2.5, justifyContent: 'center' }}>
                                            <Text style={styles.tdBold} numberOfLines={1}>{item.name}</Text>
                                            {item.brand ? <Text style={styles.tdSub}>{item.brand}</Text> : null}
                                        </View>
                                        {/* Kod */}
                                        <View style={{ flex: 1, justifyContent: 'center' }}>
                                            <Text style={styles.tdText}>{item.code || '-'}</Text>
                                        </View>
                                        {/* Kategori */}
                                        <View style={{ flex: 1.2, justifyContent: 'center' }}>
                                            <Text style={styles.tdText} numberOfLines={1}>{item.category || '-'}</Text>
                                        </View>
                                        {/* Stok */}
                                        <View style={{ flex: 0.8, justifyContent: 'center', alignItems: 'center' }}>
                                            <View style={[
                                                styles.stockBadge,
                                                isZero ? styles.stockBadgeZero : isLow ? styles.stockBadgeLow : styles.stockBadgeOk
                                            ]}>
                                                <Text style={[
                                                    styles.stockBadgeText,
                                                    isZero ? { color: '#B91C1C' } : isLow ? { color: '#92400E' } : { color: '#166534' }
                                                ]}>
                                                    {item.quantity || 0}
                                                </Text>
                                            </View>
                                        </View>
                                        {/* Birim */}
                                        <View style={{ flex: 0.6, justifyContent: 'center', alignItems: 'center' }}>
                                            <Text style={styles.tdText}>{item.unit || 'Adet'}</Text>
                                        </View>
                                        {/* Depo Konumu */}
                                        <View style={{ flex: 1.5, justifyContent: 'center' }}>
                                            {location ? (
                                                <View style={styles.locationBadge}>
                                                    <Ionicons name="location-outline" size={12} color={Colors.primary} style={{ marginRight: 4 }} />
                                                    <Text style={styles.locationText} numberOfLines={1}>{location}</Text>
                                                </View>
                                            ) : (
                                                <Text style={styles.tdSub}>Belirsiz</Text>
                                            )}
                                        </View>
                                        {/* İşlem */}
                                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                            <TouchableOpacity
                                                style={styles.transferBtn}
                                                onPress={() => openTransferModal(item)}
                                            >
                                                <Ionicons name="swap-horizontal-outline" size={14} color="#fff" />
                                                <Text style={styles.transferBtnText}>Transfer Et</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                );
                            }}
                        />
                    )}
                </View>
            );
        }

        // Mobil kart görünümü
        if (filteredProducts.length === 0) {
            return (
                <View style={styles.emptyRow}>
                    <Ionicons name="cube-outline" size={32} color="#CBD5E1" />
                    <Text style={styles.emptyText}>Bu depoda ürün bulunamadı.</Text>
                </View>
            );
        }
        return filteredProducts.map((item, index) => {
            const location = item.warehouseLocation || item.warehouse_location || '';
            return (
                <View key={item.id} style={styles.mobileCard}>
                    <View style={styles.mobileCardHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.mobileCardTitle} numberOfLines={1}>{item.name}</Text>
                            {item.code && <Text style={styles.mobileCardCode}>{item.code}</Text>}
                        </View>
                        <TouchableOpacity style={styles.transferBtnSmall} onPress={() => openTransferModal(item)}>
                            <Ionicons name="swap-horizontal-outline" size={14} color={Colors.primary} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.mobileCardBody}>
                        <View style={styles.mobileMetric}>
                            <Text style={styles.mobileMetricLabel}>Stok</Text>
                            <Text style={styles.mobileMetricValue}>{item.quantity || 0}</Text>
                        </View>
                        <View style={styles.mobileMetric}>
                            <Text style={styles.mobileMetricLabel}>Kategori</Text>
                            <Text style={styles.mobileMetricValue}>{item.category || '-'}</Text>
                        </View>
                        <View style={styles.mobileMetric}>
                            <Text style={styles.mobileMetricLabel}>Depo</Text>
                            <Text style={[styles.mobileMetricValue, { color: Colors.primary }]}>{location || 'Belirsiz'}</Text>
                        </View>
                    </View>
                </View>
            );
        });
    };

    const renderHistoryTable = () => {
        if (isWeb && width > 768) {
            return (
                <View style={styles.tableContainer}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.thCell, { flex: 1.2 }]}>Tarih</Text>
                        <Text style={[styles.thCell, { flex: 2 }]}>Ürün</Text>
                        <Text style={[styles.thCell, { flex: 0.8, textAlign: 'center' }]}>Miktar</Text>
                        <Text style={[styles.thCell, { flex: 1.5 }]}>Kaynak Depo</Text>
                        <Text style={[styles.thCell, { flex: 1.5 }]}>Hedef Depo</Text>
                        <Text style={[styles.thCell, { flex: 2 }]}>Not</Text>
                    </View>
                    {warehouseTransfers.length === 0 ? (
                        <View style={styles.emptyRow}>
                            <Ionicons name="swap-horizontal-outline" size={32} color="#CBD5E1" />
                            <Text style={styles.emptyText}>Henüz transfer kaydı bulunmuyor.</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={warehouseTransfers}
                            keyExtractor={i => i.id}
                            scrollEnabled={false}
                            renderItem={({ item, index }) => {
                                const dateStr = item.transferred_at
                                    ? new Date(item.transferred_at).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                    : '-';
                                return (
                                    <View style={[styles.tableRow, index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd]}>
                                        <View style={{ flex: 1.2, justifyContent: 'center' }}>
                                            <Text style={styles.tdText}>{dateStr}</Text>
                                        </View>
                                        <View style={{ flex: 2, justifyContent: 'center' }}>
                                            <Text style={styles.tdBold} numberOfLines={1}>{item.product_name || '-'}</Text>
                                        </View>
                                        <View style={{ flex: 0.8, justifyContent: 'center', alignItems: 'center' }}>
                                            <View style={styles.qtyBadge}>
                                                <Text style={styles.qtyBadgeText}>{item.quantity}</Text>
                                            </View>
                                        </View>
                                        <View style={{ flex: 1.5, justifyContent: 'center' }}>
                                            <View style={styles.warehouseChip}>
                                                <Ionicons name="exit-outline" size={12} color="#DC2626" style={{ marginRight: 4 }} />
                                                <Text style={[styles.warehouseChipText, { color: '#DC2626' }]} numberOfLines={1}>{item.from_warehouse || '-'}</Text>
                                            </View>
                                        </View>
                                        <View style={{ flex: 1.5, justifyContent: 'center' }}>
                                            <View style={[styles.warehouseChip, { backgroundColor: '#DCFCE7' }]}>
                                                <Ionicons name="enter-outline" size={12} color="#16A34A" style={{ marginRight: 4 }} />
                                                <Text style={[styles.warehouseChipText, { color: '#16A34A' }]} numberOfLines={1}>{item.to_warehouse || '-'}</Text>
                                            </View>
                                        </View>
                                        <View style={{ flex: 2, justifyContent: 'center' }}>
                                            <Text style={styles.tdSub} numberOfLines={1}>{item.note || '-'}</Text>
                                        </View>
                                    </View>
                                );
                            }}
                        />
                    )}
                </View>
            );
        }

        // Mobil geçmiş
        if (warehouseTransfers.length === 0) {
            return (
                <View style={styles.emptyRow}>
                    <Ionicons name="swap-horizontal-outline" size={32} color="#CBD5E1" />
                    <Text style={styles.emptyText}>Henüz transfer kaydı bulunmuyor.</Text>
                </View>
            );
        }
        return warehouseTransfers.map((item, index) => {
            const dateStr = item.transferred_at
                ? new Date(item.transferred_at).toLocaleString('tr-TR')
                : '-';
            return (
                <View key={item.id} style={styles.historyCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text style={styles.historyProduct} numberOfLines={1}>{item.product_name}</Text>
                        <View style={styles.qtyBadge}>
                            <Text style={styles.qtyBadgeText}>{item.quantity}</Text>
                        </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <View style={[styles.warehouseChip, { backgroundColor: '#FEE2E2' }]}>
                            <Ionicons name="exit-outline" size={11} color="#DC2626" style={{ marginRight: 3 }} />
                            <Text style={[styles.warehouseChipText, { color: '#DC2626' }]}>{item.from_warehouse || '-'}</Text>
                        </View>
                        <Ionicons name="arrow-forward-outline" size={14} color="#94A3B8" />
                        <View style={[styles.warehouseChip, { backgroundColor: '#DCFCE7' }]}>
                            <Ionicons name="enter-outline" size={11} color="#16A34A" style={{ marginRight: 3 }} />
                            <Text style={[styles.warehouseChipText, { color: '#16A34A' }]}>{item.to_warehouse || '-'}</Text>
                        </View>
                    </View>
                    <Text style={styles.historyDate}>{dateStr}</Text>
                    {item.note ? <Text style={styles.historyNote}>{item.note}</Text> : null}
                </View>
            );
        });
    };

    const existingWarehouses = useMemo(() => {
        const locs = new Set();
        products.forEach(p => {
            const loc = p.warehouseLocation || p.warehouse_location;
            if (loc) locs.add(loc);
        });
        return Array.from(locs).sort();
    }, [products]);

    return (
        <ImmersiveLayout title="Depo ve Transfer" subtitle={`${stats.warehouseCount} depo · ${products.length} ürün`} noScrollView={false}>
            <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

                {/* ── Özet Kartlar ── */}
                <View style={styles.statsRow}>
                    <StatCard
                        icon="business-outline"
                        label="Toplam Depo"
                        value={stats.warehouseCount}
                        color="#2563EB"
                        bg="#EFF6FF"
                    />
                    <StatCard
                        icon="cube-outline"
                        label="Görüntülenen Ürün"
                        value={filteredProducts.length}
                        color="#7C3AED"
                        bg="#F5F3FF"
                    />
                    <StatCard
                        icon="swap-horizontal-outline"
                        label="Bugünkü Transfer"
                        value={stats.todayTransfers}
                        color="#059669"
                        bg="#ECFDF5"
                    />
                </View>

                {/* ── Sekme Geçişi ── */}
                <View style={styles.tabRow}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'stock' && styles.tabActive]}
                        onPress={() => setActiveTab('stock')}
                    >
                        <Ionicons name="cube-outline" size={16} color={activeTab === 'stock' ? '#fff' : '#64748B'} style={{ marginRight: 6 }} />
                        <Text style={[styles.tabText, activeTab === 'stock' && styles.tabTextActive]}>Depo Envanteri</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'history' && styles.tabActive]}
                        onPress={() => setActiveTab('history')}
                    >
                        <Ionicons name="time-outline" size={16} color={activeTab === 'history' ? '#fff' : '#64748B'} style={{ marginRight: 6 }} />
                        <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>Transfer Geçmişi</Text>
                    </TouchableOpacity>
                </View>

                {activeTab === 'stock' && (
                    <>
                        {/* ── Arama ── */}
                        <View style={styles.searchRow}>
                            <View style={styles.searchInputWrap}>
                                <Ionicons name="search-outline" size={17} color="#94A3B8" style={{ marginRight: 8 }} />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Ürün adı, kod veya kategori ara..."
                                    placeholderTextColor="#94A3B8"
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    selectTextOnFocus={isWeb}
                                />
                                {searchQuery !== '' && (
                                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                                        <Ionicons name="close-circle" size={17} color="#CBD5E1" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>

                        {/* ── Depo Filtresi ── */}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.filterScroll}
                            contentContainerStyle={styles.filterScrollContent}
                        >
                            <FilterTab
                                label="Tüm Depolar"
                                active={selectedWarehouse === 'ALL'}
                                onPress={() => setSelectedWarehouse('ALL')}
                                count={products.length}
                            />
                            {warehouses.map(w => (
                                <FilterTab
                                    key={w}
                                    label={w}
                                    active={selectedWarehouse === w}
                                    onPress={() => setSelectedWarehouse(w)}
                                    count={products.filter(p => (p.warehouseLocation || p.warehouse_location) === w).length}
                                />
                            ))}
                            {products.filter(p => !p.warehouseLocation && !p.warehouse_location).length > 0 && (
                                <FilterTab
                                    label="Konumsuz"
                                    active={selectedWarehouse === '__UNSET__'}
                                    onPress={() => setSelectedWarehouse('__UNSET__')}
                                    count={products.filter(p => !p.warehouseLocation && !p.warehouse_location).length}
                                />
                            )}
                        </ScrollView>

                        {/* ── Ürün Listesi ── */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Depo Envanteri</Text>
                                <View style={styles.countBadge}>
                                    <Text style={styles.countBadgeText}>{filteredProducts.length} ürün</Text>
                                </View>
                            </View>
                            {renderStockTable()}
                        </View>
                    </>
                )}

                {activeTab === 'history' && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Transfer Geçmişi</Text>
                            <View style={styles.countBadge}>
                                <Text style={styles.countBadgeText}>{warehouseTransfers.length} kayıt</Text>
                            </View>
                        </View>
                        {renderHistoryTable()}
                    </View>
                )}

            </ScrollView>

            {/* ══════════ TRANSFER MODALI ══════════ */}
            <Modal
                visible={transferModalVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setTransferModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        {/* Başlık */}
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>Depo Transferi</Text>
                                <Text style={styles.modalSubtitle}>{selectedProduct?.name}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setTransferModalVisible(false)} style={styles.modalCloseBtn}>
                                <Ionicons name="close" size={20} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
                            {/* Kaynak Depo */}
                            <View style={styles.infoRow}>
                                <Ionicons name="exit-outline" size={16} color="#DC2626" />
                                <View style={{ marginLeft: 10 }}>
                                    <Text style={styles.infoRowLabel}>Kaynak Depo</Text>
                                    <Text style={styles.infoRowValue}>
                                        {selectedProduct?.warehouseLocation || selectedProduct?.warehouse_location || 'Belirsiz'}
                                    </Text>
                                </View>
                            </View>

                            {/* Stok Bilgisi */}
                            <View style={styles.infoRow}>
                                <Ionicons name="cube-outline" size={16} color={Colors.primary} />
                                <View style={{ marginLeft: 10 }}>
                                    <Text style={styles.infoRowLabel}>Mevcut Stok</Text>
                                    <Text style={styles.infoRowValue}>{selectedProduct?.quantity || 0} {selectedProduct?.unit || 'Adet'}</Text>
                                </View>
                            </View>

                            {/* Miktar */}
                            <Text style={styles.inputLabel}>Transfer Miktarı</Text>
                            <TextInput
                                style={styles.input}
                                value={transferQuantity}
                                onChangeText={setTransferQuantity}
                                keyboardType="numeric"
                                placeholder="0"
                                placeholderTextColor="#94A3B8"
                                selectTextOnFocus={isWeb}
                            />

                            {/* Hedef Depo */}
                            <Text style={styles.inputLabel}>Hedef Depo *</Text>
                            <TextInput
                                style={styles.input}
                                value={targetWarehouse}
                                onChangeText={setTargetWarehouse}
                                placeholder="Hedef depo adını girin..."
                                placeholderTextColor="#94A3B8"
                                selectTextOnFocus={isWeb}
                            />

                            {/* Mevcut Depolar */}
                            {existingWarehouses.length > 0 && (
                                <View style={styles.warehouseQuickSelect}>
                                    <Text style={styles.quickSelectLabel}>Mevcut Depolardan Seç:</Text>
                                    <View style={styles.quickChipRow}>
                                        {existingWarehouses
                                            .filter(w => w !== (selectedProduct?.warehouseLocation || selectedProduct?.warehouse_location))
                                            .map(w => (
                                                <TouchableOpacity
                                                    key={w}
                                                    style={[styles.quickChip, targetWarehouse === w && styles.quickChipActive]}
                                                    onPress={() => setTargetWarehouse(w)}
                                                >
                                                    <Text style={[styles.quickChipText, targetWarehouse === w && styles.quickChipTextActive]}>{w}</Text>
                                                </TouchableOpacity>
                                            ))
                                        }
                                    </View>
                                </View>
                            )}

                            {/* Not */}
                            <Text style={styles.inputLabel}>Not (opsiyonel)</Text>
                            <TextInput
                                style={[styles.input, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]}
                                value={transferNote}
                                onChangeText={setTransferNote}
                                placeholder="Transfer açıklaması..."
                                placeholderTextColor="#94A3B8"
                                multiline
                                selectTextOnFocus={isWeb}
                            />
                        </ScrollView>

                        {/* Butonlar */}
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setTransferModalVisible(false)}>
                                <Text style={styles.cancelBtnText}>İptal</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.confirmBtn, isTransferring && { opacity: 0.7 }]}
                                onPress={handleTransfer}
                                disabled={isTransferring}
                            >
                                {isTransferring ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <>
                                        <Ionicons name="swap-horizontal-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                                        <Text style={styles.confirmBtnText}>Transferi Gerçekleştir</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </ImmersiveLayout>
    );
}

// ───────────────────────────────────────────────
// STİLLER
// ───────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        paddingBottom: 60,
        paddingHorizontal: isWeb ? 0 : 16,
    },

    // Stats
    statsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
        marginTop: 6,
    },
    statCard: {
        flex: 1,
        borderRadius: 14,
        padding: 16,
        alignItems: 'flex-start',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    statIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    statValue: {
        fontSize: 26,
        fontWeight: '800',
        color: '#0F172A',
        letterSpacing: -0.5,
    },
    statLabel: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '500',
        marginTop: 2,
    },

    // Sekme
    tabRow: {
        flexDirection: 'row',
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
        padding: 4,
        marginBottom: 20,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 10,
    },
    tabActive: {
        backgroundColor: Colors.primary,
        ...Platform.select({ web: { boxShadow: '0 2px 8px rgba(37,99,235,0.3)' } }),
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
    },
    tabTextActive: {
        color: '#fff',
    },

    // Arama
    searchRow: {
        marginBottom: 14,
    },
    searchInputWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingHorizontal: 14,
        height: 46,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: '#1E293B',
    },

    // Depo Filtre
    filterScroll: {
        marginBottom: 20,
    },
    filterScrollContent: {
        paddingRight: 20,
        gap: 8,
    },
    filterTab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    filterTabActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    filterTabText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
        maxWidth: 120,
    },
    filterTabTextActive: {
        color: '#fff',
    },
    filterTabBadge: {
        marginLeft: 6,
        backgroundColor: '#E2E8F0',
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 1,
    },
    filterTabBadgeActive: {
        backgroundColor: 'rgba(255,255,255,0.25)',
    },
    filterTabBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#475569',
    },
    filterTabBadgeTextActive: {
        color: '#fff',
    },

    // Bölüm
    section: {
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        overflow: 'hidden',
        marginBottom: 20,
        ...Platform.select({ web: { boxShadow: '0 1px 4px rgba(0,0,0,0.06)' } }),
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1E293B',
    },
    countBadge: {
        backgroundColor: '#EFF6FF',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 12,
    },
    countBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.primary,
    },

    // Web Tablo
    tableContainer: {
        overflow: 'hidden',
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 20,
        paddingVertical: 11,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    thCell: {
        fontSize: 11,
        fontWeight: '700',
        color: '#64748B',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        paddingRight: 12,
    },
    tableRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        alignItems: 'center',
    },
    tableRowEven: {
        backgroundColor: '#fff',
    },
    tableRowOdd: {
        backgroundColor: '#FAFBFC',
    },
    tdBold: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1E293B',
    },
    tdText: {
        fontSize: 13,
        color: '#475569',
        paddingRight: 8,
    },
    tdSub: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 2,
    },

    stockBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    stockBadgeOk: { backgroundColor: '#DCFCE7' },
    stockBadgeLow: { backgroundColor: '#FEF3C7' },
    stockBadgeZero: { backgroundColor: '#FEE2E2' },
    stockBadgeText: {
        fontSize: 13,
        fontWeight: '700',
    },
    locationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EFF6FF',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    locationText: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.primary,
    },
    transferBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 8,
        gap: 5,
    },
    transferBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#fff',
    },

    // Transfer geçmişi
    qtyBadge: {
        backgroundColor: '#EFF6FF',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    qtyBadgeText: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.primary,
    },
    warehouseChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEE2E2',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    warehouseChipText: {
        fontSize: 12,
        fontWeight: '600',
    },

    // Loading / Empty
    loadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        gap: 10,
    },
    loadingText: {
        fontSize: 14,
        color: '#94A3B8',
    },
    emptyRow: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
        gap: 10,
    },
    emptyText: {
        fontSize: 14,
        color: '#94A3B8',
        fontStyle: 'italic',
    },

    // Mobil kart
    mobileCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 10,
        overflow: 'hidden',
    },
    mobileCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    mobileCardTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1E293B',
    },
    mobileCardCode: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 2,
    },
    transferBtnSmall: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 10,
    },
    mobileCardBody: {
        flexDirection: 'row',
        padding: 14,
        gap: 20,
    },
    mobileMetric: {
        flex: 1,
        alignItems: 'center',
    },
    mobileMetricLabel: {
        fontSize: 11,
        color: '#94A3B8',
        marginBottom: 4,
        fontWeight: '600',
    },
    mobileMetricValue: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1E293B',
    },

    // Mobil geçmiş kart
    historyCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 10,
        padding: 14,
    },
    historyProduct: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1E293B',
        flex: 1,
        marginRight: 10,
    },
    historyDate: {
        fontSize: 11,
        color: '#94A3B8',
        marginTop: 8,
    },
    historyNote: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 4,
        fontStyle: 'italic',
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalBox: {
        backgroundColor: '#fff',
        borderRadius: 20,
        width: '100%',
        maxWidth: 520,
        padding: 24,
        ...Platform.select({ web: { boxShadow: '0 20px 60px rgba(0,0,0,0.2)' } }),
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0F172A',
    },
    modalSubtitle: {
        fontSize: 13,
        color: '#64748B',
        marginTop: 3,
    },
    modalCloseBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 10,
        padding: 12,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    infoRowLabel: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    infoRowValue: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1E293B',
        marginTop: 2,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 7,
        marginTop: 4,
    },
    input: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
        color: '#1E293B',
        marginBottom: 14,
    },
    warehouseQuickSelect: {
        marginBottom: 14,
    },
    quickSelectLabel: {
        fontSize: 12,
        color: '#94A3B8',
        fontWeight: '600',
        marginBottom: 8,
    },
    quickChipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    quickChip: {
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 8,
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    quickChipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    quickChipText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#475569',
    },
    quickChipTextActive: {
        color: '#fff',
    },
    modalActions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 20,
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 13,
        borderRadius: 12,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
    },
    cancelBtnText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#64748B',
    },
    confirmBtn: {
        flex: 2,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 13,
        borderRadius: 12,
        backgroundColor: Colors.primary,
        ...Platform.select({ web: { boxShadow: '0 4px 14px rgba(37,99,235,0.35)' } }),
    },
    confirmBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#fff',
    },
});
