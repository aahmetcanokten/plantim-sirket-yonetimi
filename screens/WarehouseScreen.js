import React, { useContext, useState, useMemo } from 'react';
import {
    View, Text, StyleSheet, Platform, ScrollView,
    TouchableOpacity, TextInput, Modal, FlatList,
    Alert, Dimensions, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../AppContext';
import ImmersiveLayout from '../components/ImmersiveLayout';
import { Colors } from '../Theme';
import { useToast } from '../components/ToastProvider';

const isWeb = Platform.OS === 'web';
const { width } = Dimensions.get('window');

// ── Küçük yardımcı bileşenler ──────────────────────────────────────

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

// Bir ürünün tüm depolardaki dağılımını gösteren mini tablo
const StockLocationBreakdown = ({ locations }) => {
    if (!locations || locations.length === 0) return null;
    return (
        <View style={styles.breakdownContainer}>
            {locations.map((loc, i) => (
                <View key={loc.id || i} style={styles.breakdownRow}>
                    <View style={styles.breakdownWarehouse}>
                        <Ionicons name="business-outline" size={10} color="#6366F1" style={{ marginRight: 4 }} />
                        <Text style={styles.breakdownWarehouseName} numberOfLines={1}>{loc.warehouse_name}</Text>
                    </View>
                    <View style={[
                        styles.breakdownQtyBadge,
                        loc.quantity <= 0 ? styles.qtyZero : loc.quantity <= 5 ? styles.qtyLow : styles.qtyOk
                    ]}>
                        <Text style={[
                            styles.breakdownQtyText,
                            loc.quantity <= 0 ? { color: '#B91C1C' } : loc.quantity <= 5 ? { color: '#92400E' } : { color: '#166534' }
                        ]}>{loc.quantity}</Text>
                    </View>
                </View>
            ))}
        </View>
    );
};

// ── Ana Ekran ──────────────────────────────────────────────────────

export default function WarehouseScreen() {
    const {
        products, warehouseTransfers, addWarehouseTransfer,
        stockLocations, getProductStockLocations, getAllWarehouses,
        appDataLoading
    } = useContext(AppContext);
    const toast = useToast();

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedWarehouse, setSelectedWarehouse] = useState('ALL');
    const [activeTab, setActiveTab] = useState('stock');
    const [transferModalVisible, setTransferModalVisible] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectedFromWarehouse, setSelectedFromWarehouse] = useState('');
    const [targetWarehouse, setTargetWarehouse] = useState('');
    const [transferQuantity, setTransferQuantity] = useState('');
    const [transferNote, setTransferNote] = useState('');
    const [isTransferring, setIsTransferring] = useState(false);
    const [expandedProductId, setExpandedProductId] = useState(null);

    // Tüm depo adları (stockLocations + ürünlerin warehouseLocation alanından)
    const allWarehouses = useMemo(() => {
        const warehouseSet = new Set();
        stockLocations.forEach(sl => { if (sl.warehouse_name) warehouseSet.add(sl.warehouse_name); });
        products.forEach(p => {
            const loc = p.warehouseLocation || p.warehouse_location;
            if (loc) warehouseSet.add(loc);
        });
        return Array.from(warehouseSet).sort();
    }, [stockLocations, products]);

    // Her ürün için depo konumlarını al (stockLocations öncelikli, yoksa warehouseLocation fallback)
    const getLocationsForProduct = (product) => {
        const locs = stockLocations.filter(sl => sl.product_id === product.id);
        if (locs.length > 0) return locs;
        // Fallback: eski sistemden warehouseLocation varsa
        const loc = product.warehouseLocation || product.warehouse_location;
        if (loc && (product.quantity || 0) > 0) {
            return [{ id: 'fallback_' + product.id, product_id: product.id, warehouse_name: loc, quantity: product.quantity || 0 }];
        }
        return [];
    };

    // Seçili depoya göre filtrelenmiş ürünler
    const filteredProducts = useMemo(() => {
        let list = [...products];
        // Depo filtresi
        if (selectedWarehouse === '__UNSET__') {
            list = list.filter(p => {
                const locs = getLocationsForProduct(p);
                return locs.length === 0;
            });
        } else if (selectedWarehouse !== 'ALL') {
            list = list.filter(p => {
                return stockLocations.some(sl => sl.product_id === p.id && sl.warehouse_name === selectedWarehouse && sl.quantity > 0)
                    || (p.warehouseLocation || p.warehouse_location) === selectedWarehouse;
            });
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
    }, [products, stockLocations, selectedWarehouse, searchQuery]);

    // İstatistikler
    const stats = useMemo(() => {
        const today = new Date().toDateString();
        const todayTransfers = warehouseTransfers.filter(
            t => new Date(t.transferred_at || t.created_at).toDateString() === today
        );
        // Her depodaki toplam stok değeri
        const warehouseStats = {};
        stockLocations.forEach(sl => {
            if (!warehouseStats[sl.warehouse_name]) warehouseStats[sl.warehouse_name] = { qty: 0, productCount: 0 };
            warehouseStats[sl.warehouse_name].qty += sl.quantity;
            warehouseStats[sl.warehouse_name].productCount += 1;
        });
        return {
            warehouseCount: allWarehouses.length,
            productCount: filteredProducts.length,
            todayTransfers: todayTransfers.length,
        };
    }, [allWarehouses, filteredProducts, warehouseTransfers, stockLocations]);

    // Transfer modalını aç
    const openTransferModal = (product, fromWarehouse) => {
        const locs = getLocationsForProduct(product);
        const defaultFrom = fromWarehouse || (locs[0]?.warehouse_name) || (product.warehouseLocation || product.warehouse_location) || '';
        setSelectedProduct(product);
        setSelectedFromWarehouse(defaultFrom);
        const fromLoc = locs.find(l => l.warehouse_name === defaultFrom);
        setTransferQuantity(String(fromLoc?.quantity || product.quantity || 1));
        setTargetWarehouse('');
        setTransferNote('');
        setTransferModalVisible(true);
    };

    // Transfer gerçekleştir
    const handleTransfer = async () => {
        if (!targetWarehouse.trim()) {
            const msg = 'Lütfen hedef depo girin.';
            Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Hata', msg);
            return;
        }
        if (targetWarehouse.trim() === selectedFromWarehouse.trim()) {
            const msg = 'Kaynak ve hedef depo aynı olamaz.';
            Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Hata', msg);
            return;
        }
        const qty = parseFloat(transferQuantity);
        if (!qty || qty <= 0) {
            const msg = 'Geçerli bir miktar girin.';
            Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Hata', msg);
            return;
        }

        setIsTransferring(true);
        const result = await addWarehouseTransfer({
            product_id: selectedProduct.id,
            from_warehouse: selectedFromWarehouse,
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

    // Seçili depo kaynak konumuna göre güncel stoku al
    const fromLocationQty = useMemo(() => {
        if (!selectedProduct || !selectedFromWarehouse) return 0;
        const locs = getLocationsForProduct(selectedProduct);
        const found = locs.find(l => l.warehouse_name === selectedFromWarehouse);
        return found ? found.quantity : 0;
    }, [selectedProduct, selectedFromWarehouse, stockLocations]);

    // ── Tablolar ────────────────────────────────────────────────────

    const renderStockTable = () => {
        if (isWeb && width > 768) {
            return (
                <View style={styles.tableContainer}>
                    <View style={styles.tableHeader}>
                        <View style={[styles.thCell, { flex: 2.5 }]}><Text style={styles.thCellText}>Ürün Adı</Text></View>
                        <View style={[styles.thCell, { flex: 1 }]}><Text style={styles.thCellText}>Kod</Text></View>
                        <View style={[styles.thCell, { flex: 1.2 }]}><Text style={styles.thCellText}>Kategori</Text></View>
                        <View style={[styles.thCell, { flex: 0.7, alignItems: 'flex-end' }]}><Text style={styles.thCellText}>Toplam</Text></View>
                        <View style={[styles.thCell, { flex: 2.5 }]}><Text style={styles.thCellText}>Depo Dağılımı</Text></View>
                        <View style={[styles.thCellLast, { flex: 0.8, alignItems: 'center' }]}><Text style={styles.thCellText}>İşlem</Text></View>
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
                                const locs = getLocationsForProduct(item);
                                const totalQty = locs.reduce((s, l) => s + l.quantity, 0) || item.quantity || 0;
                                const isLow = totalQty > 0 && totalQty <= (item.criticalStockLimit || item.critical_stock_limit || 0);
                                const isZero = totalQty <= 0;
                                return (
                                    <View style={[styles.tableRow, index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd]}>
                                        <View style={[styles.tdCell, { flex: 2.5 }]}>
                                            <Text style={styles.tdBold} numberOfLines={1}>{item.name}</Text>
                                            {item.brand ? <Text style={styles.tdSub}>{item.brand}</Text> : null}
                                        </View>
                                        <View style={[styles.tdCell, { flex: 1 }]}>
                                            <Text style={styles.tdText}>{item.code || '-'}</Text>
                                        </View>
                                        <View style={[styles.tdCell, { flex: 1.2 }]}>
                                            <Text style={styles.tdText} numberOfLines={1}>{item.category || '-'}</Text>
                                        </View>
                                        <View style={[styles.tdCell, { flex: 0.7, alignItems: 'flex-end' }]}>
                                            <Text style={[
                                                styles.tdQtyText,
                                                isZero ? { color: '#DC2626' } : isLow ? { color: '#D97706' } : { color: '#059669' }
                                            ]}>
                                                {totalQty}
                                            </Text>
                                        </View>
                                        {/* Depo Dağılımı */}
                                        <View style={[styles.tdCell, { flex: 2.5 }]}>
                                            {locs.length === 0 ? (
                                                <Text style={styles.tdSub}>Depo tanımsız</Text>
                                            ) : (
                                                <View style={{ gap: 4 }}>
                                                    {locs.map((loc, li) => (
                                                        <View key={loc.id || li} style={styles.excelLocRow}>
                                                            <View style={styles.excelLocNameWrap}>
                                                                <View style={styles.excelLocDot} />
                                                                <Text style={styles.excelLocName} numberOfLines={1}>{loc.warehouse_name}</Text>
                                                            </View>
                                                            <View style={styles.excelLocRight}>
                                                                <Text style={[styles.excelLocQty,
                                                                    loc.quantity <= 0 ? { color: '#DC2626' } : loc.quantity <= 5 ? { color: '#D97706' } : { color: '#059669' }
                                                                ]}>
                                                                    {loc.quantity} <Text style={{ fontSize: 10, color: '#64748B', fontWeight: '500' }}>{item.unit || ''}</Text>
                                                                </Text>
                                                            </View>
                                                        </View>
                                                    ))}
                                                </View>
                                            )}
                                        </View>
                                        <View style={[styles.tdCellLast, { flex: 0.8, alignItems: 'center' }]}>
                                            <TouchableOpacity
                                                style={styles.cellTransferIconButton}
                                                onPress={() => openTransferModal(item, null)}
                                            >
                                                <Ionicons name="swap-horizontal" size={16} color="#475569" />
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
        return filteredProducts.map((item) => {
            const locs = getLocationsForProduct(item);
            const totalQty = locs.reduce((s, l) => s + l.quantity, 0) || item.quantity || 0;
            const isExpanded = expandedProductId === item.id;
            return (
                <View key={item.id} style={styles.mobileCard}>
                    <TouchableOpacity
                        style={styles.mobileCardHeader}
                        onPress={() => setExpandedProductId(isExpanded ? null : item.id)}
                        activeOpacity={0.7}
                    >
                        <View style={{ flex: 1 }}>
                            <Text style={styles.mobileCardTitle} numberOfLines={1}>{item.name}</Text>
                            {item.code && <Text style={styles.mobileCardCode}>{item.code}</Text>}
                        </View>
                        <View style={styles.mobileTotalBadge}>
                            <Text style={styles.mobileTotalText}>Toplam: {totalQty}</Text>
                        </View>
                        <Ionicons
                            name={isExpanded ? 'chevron-up' : 'chevron-down'}
                            size={16} color="#94A3B8" style={{ marginLeft: 8 }}
                        />
                    </TouchableOpacity>
                    {isExpanded && (
                        <View style={styles.mobileExpandedBody}>
                            {locs.length === 0 ? (
                                <Text style={styles.tdSub}>Depo konumu tanımsız</Text>
                            ) : (
                                locs.map((loc, li) => (
                                    <View key={loc.id || li} style={styles.mobileLocRow}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.mobileLocName}>{loc.warehouse_name}</Text>
                                            <Text style={[styles.mobileLocQty, { color: loc.quantity <= 0 ? '#B91C1C' : '#166534' }]}>
                                                {loc.quantity} {item.unit || 'Adet'}
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            style={styles.mobileTransferBtn}
                                            onPress={() => openTransferModal(item, loc.warehouse_name)}
                                        >
                                            <Ionicons name="swap-horizontal-outline" size={14} color={Colors.primary} />
                                            <Text style={styles.mobileTransferBtnText}>Transfer</Text>
                                        </TouchableOpacity>
                                    </View>
                                ))
                            )}
                        </View>
                    )}
                </View>
            );
        });
    };

    const renderHistoryTable = () => {
        if (isWeb && width > 768) {
            return (
                <View style={styles.tableContainer}>
                    <View style={styles.tableHeader}>
                        <View style={[styles.thCell, { flex: 1.2 }]}><Text style={styles.thCellText}>Tarih</Text></View>
                        <View style={[styles.thCell, { flex: 2 }]}><Text style={styles.thCellText}>Ürün</Text></View>
                        <View style={[styles.thCell, { flex: 0.8, alignItems: 'center' }]}><Text style={styles.thCellText}>Miktar</Text></View>
                        <View style={[styles.thCell, { flex: 1.5 }]}><Text style={styles.thCellText}>Kaynak Depo</Text></View>
                        <View style={[styles.thCell, { flex: 1.5 }]}><Text style={styles.thCellText}>Hedef Depo</Text></View>
                        <View style={[styles.thCellLast, { flex: 2 }]}><Text style={styles.thCellText}>Not</Text></View>
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
                                        <View style={[styles.tdCell, { flex: 1.2 }]}><Text style={styles.tdText}>{dateStr}</Text></View>
                                        <View style={[styles.tdCell, { flex: 2 }]}><Text style={styles.tdBold} numberOfLines={1}>{item.product_name || '-'}</Text></View>
                                        <View style={[styles.tdCell, { flex: 0.8, alignItems: 'center' }]}>
                                            <Text style={styles.tdQtyTextDark}>{item.quantity}</Text>
                                        </View>
                                        <View style={[styles.tdCell, { flex: 1.5 }]}>
                                            <View style={styles.excelWarehouseBadgeRef}>
                                                <Text style={[styles.excelWarehouseBadgeText, { color: '#B91C1C' }]} numberOfLines={1}>{item.from_warehouse || '-'}</Text>
                                            </View>
                                        </View>
                                        <View style={[styles.tdCell, { flex: 1.5 }]}>
                                            <View style={[styles.excelWarehouseBadgeRef, { backgroundColor: '#DCFCE7' }]}>
                                                <Text style={[styles.excelWarehouseBadgeText, { color: '#15803D' }]} numberOfLines={1}>{item.to_warehouse || '-'}</Text>
                                            </View>
                                        </View>
                                        <View style={[styles.tdCellLast, { flex: 2 }]}><Text style={styles.tdSub} numberOfLines={1}>{item.note || '-'}</Text></View>
                                    </View>
                                );
                            }}
                        />
                    )}
                </View>
            );
        }

        if (warehouseTransfers.length === 0) {
            return (
                <View style={styles.emptyRow}>
                    <Ionicons name="swap-horizontal-outline" size={32} color="#CBD5E1" />
                    <Text style={styles.emptyText}>Henüz transfer kaydı bulunmuyor.</Text>
                </View>
            );
        }
        return warehouseTransfers.map((item) => {
            const dateStr = item.transferred_at ? new Date(item.transferred_at).toLocaleString('tr-TR') : '-';
            return (
                <View key={item.id} style={styles.historyCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text style={styles.historyProduct} numberOfLines={1}>{item.product_name}</Text>
                        <View style={styles.qtyBadge}><Text style={styles.qtyBadgeText}>{item.quantity}</Text></View>
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

    // Mevcut kaynak depolardaki stoklar (modal için)
    const fromLocationOptions = useMemo(() => {
        if (!selectedProduct) return [];
        return getLocationsForProduct(selectedProduct).filter(l => l.quantity > 0);
    }, [selectedProduct, stockLocations]);

    return (
        <ImmersiveLayout
            title="Depo ve Transfer"
            subtitle={`${stats.warehouseCount} depo · ${products.length} ürün`}
            noScrollView={false}
        >
            <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

                {/* Özet Kartlar */}
                <View style={styles.statsRow}>
                    <StatCard icon="business-outline" label="Toplam Depo" value={stats.warehouseCount} color="#2563EB" bg="#EFF6FF" />
                    <StatCard icon="cube-outline" label="Görüntülenen Ürün" value={filteredProducts.length} color="#7C3AED" bg="#F5F3FF" />
                    <StatCard icon="swap-horizontal-outline" label="Bugünkü Transfer" value={stats.todayTransfers} color="#059669" bg="#ECFDF5" />
                </View>

                {/* Sekme Geçişi */}
                <View style={styles.tabRow}>
                    <TouchableOpacity style={[styles.tab, activeTab === 'stock' && styles.tabActive]} onPress={() => setActiveTab('stock')}>
                        <Ionicons name="cube-outline" size={16} color={activeTab === 'stock' ? '#fff' : '#64748B'} style={{ marginRight: 6 }} />
                        <Text style={[styles.tabText, activeTab === 'stock' && styles.tabTextActive]}>Depo Envanteri</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.tab, activeTab === 'history' && styles.tabActive]} onPress={() => setActiveTab('history')}>
                        <Ionicons name="time-outline" size={16} color={activeTab === 'history' ? '#fff' : '#64748B'} style={{ marginRight: 6 }} />
                        <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>Transfer Geçmişi</Text>
                    </TouchableOpacity>
                </View>

                {activeTab === 'stock' && (
                    <>
                        {/* Arama */}
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

                        {/* Depo Filtresi */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterScrollContent}>
                            <FilterTab label="Tüm Depolar" active={selectedWarehouse === 'ALL'} onPress={() => setSelectedWarehouse('ALL')} count={products.length} />
                            {allWarehouses.map(w => (
                                <FilterTab
                                    key={w}
                                    label={w}
                                    active={selectedWarehouse === w}
                                    onPress={() => setSelectedWarehouse(w)}
                                    count={stockLocations.filter(sl => sl.warehouse_name === w && sl.quantity > 0).length}
                                />
                            ))}
                            {products.filter(p => !p.warehouseLocation && !p.warehouse_location && !stockLocations.some(sl => sl.product_id === p.id)).length > 0 && (
                                <FilterTab label="Konumsuz" active={selectedWarehouse === '__UNSET__'} onPress={() => setSelectedWarehouse('__UNSET__')} />
                            )}
                        </ScrollView>

                        {/* Ürün Listesi */}
                        {selectedWarehouse !== 'ALL' && selectedWarehouse !== '__UNSET__' && (
                            <View style={styles.warehouseSummaryBanner}>
                                <Ionicons name="business-outline" size={16} color="#2563EB" />
                                <Text style={styles.warehouseSummaryText}>
                                    <Text style={{ fontWeight: '700' }}>{selectedWarehouse}</Text>
                                    {' — '}
                                    {stockLocations.filter(sl => sl.warehouse_name === selectedWarehouse && sl.quantity > 0).length} ürün kalemi,{' '}
                                    toplam {stockLocations.filter(sl => sl.warehouse_name === selectedWarehouse).reduce((s, sl) => s + sl.quantity, 0)} adet stok
                                </Text>
                            </View>
                        )}

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
            <Modal visible={transferModalVisible} animationType="slide" transparent onRequestClose={() => setTransferModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>Depo Transferi</Text>
                                <Text style={styles.modalSubtitle}>{selectedProduct?.name}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setTransferModalVisible(false)} style={styles.modalCloseBtn}>
                                <Ionicons name="close" size={20} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
                            {/* Kaynak Depo Seçimi */}
                            <Text style={styles.inputLabel}>Kaynak Depo *</Text>
                            {fromLocationOptions.length === 0 ? (
                                <View style={styles.noLocWarning}>
                                    <Ionicons name="warning-outline" size={14} color="#D97706" />
                                    <Text style={styles.noLocWarningText}>Bu ürün için kayıtlı depo konumu bulunamadı.</Text>
                                </View>
                            ) : (
                                <View style={styles.quickChipRow}>
                                    {fromLocationOptions.map(loc => (
                                        <TouchableOpacity
                                            key={loc.id}
                                            style={[styles.quickChip, selectedFromWarehouse === loc.warehouse_name && styles.quickChipActive]}
                                            onPress={() => {
                                                setSelectedFromWarehouse(loc.warehouse_name);
                                                setTransferQuantity(String(loc.quantity));
                                            }}
                                        >
                                            <Text style={[styles.quickChipText, selectedFromWarehouse === loc.warehouse_name && styles.quickChipTextActive]}>
                                                {loc.warehouse_name}
                                            </Text>
                                            <Text style={[styles.quickChipQty, selectedFromWarehouse === loc.warehouse_name && { color: 'rgba(255,255,255,0.8)' }]}>
                                                {loc.quantity} {selectedProduct?.unit || 'ad.'}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}

                            {/* Seçili kaynak bilgisi */}
                            {selectedFromWarehouse ? (
                                <View style={styles.infoRow}>
                                    <Ionicons name="exit-outline" size={16} color="#DC2626" />
                                    <View style={{ marginLeft: 10 }}>
                                        <Text style={styles.infoRowLabel}>Kaynak Depo</Text>
                                        <Text style={styles.infoRowValue}>{selectedFromWarehouse}</Text>
                                    </View>
                                    <View style={{ marginLeft: 'auto' }}>
                                        <Text style={styles.infoRowLabel}>Mevcut Stok</Text>
                                        <Text style={[styles.infoRowValue, { color: '#16A34A' }]}>{fromLocationQty} {selectedProduct?.unit || 'Adet'}</Text>
                                    </View>
                                </View>
                            ) : null}

                            {/* Transfer Miktarı */}
                            <Text style={styles.inputLabel}>Transfer Miktarı *</Text>
                            <TextInput
                                style={styles.input}
                                value={transferQuantity}
                                onChangeText={setTransferQuantity}
                                keyboardType="numeric"
                                placeholder="0"
                                placeholderTextColor="#94A3B8"
                                selectTextOnFocus={isWeb}
                            />
                            {fromLocationQty > 0 && (
                                <View style={styles.quickQtyRow}>
                                    {[0.25, 0.5, 0.75, 1].map(ratio => (
                                        <TouchableOpacity
                                            key={ratio}
                                            style={styles.quickQtyChip}
                                            onPress={() => setTransferQuantity(String(Math.floor(fromLocationQty * ratio)))}
                                        >
                                            <Text style={styles.quickQtyText}>{ratio === 1 ? 'Tümü' : `%${ratio * 100}`}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}

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

                            {/* Mevcut Depolardan Seç */}
                            {allWarehouses.filter(w => w !== selectedFromWarehouse).length > 0 && (
                                <View style={styles.warehouseQuickSelect}>
                                    <Text style={styles.quickSelectLabel}>Mevcut Depolardan Seç:</Text>
                                    <View style={styles.quickChipRow}>
                                        {allWarehouses
                                            .filter(w => w !== selectedFromWarehouse)
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
                                style={[styles.input, { height: 70, textAlignVertical: 'top', paddingTop: 10 }]}
                                value={transferNote}
                                onChangeText={setTransferNote}
                                placeholder="Transfer açıklaması..."
                                placeholderTextColor="#94A3B8"
                                multiline
                                selectTextOnFocus={isWeb}
                            />
                        </ScrollView>

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

// ── Stiller ───────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { paddingBottom: 60, paddingHorizontal: isWeb ? 0 : 16 },

    statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20, marginTop: 6 },
    statCard: { flex: 1, borderRadius: 14, padding: 16, alignItems: 'flex-start', borderWidth: 1, borderColor: '#E2E8F0' },
    statIconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    statValue: { fontSize: 26, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5 },
    statLabel: { fontSize: 12, color: '#64748B', fontWeight: '500', marginTop: 2 },

    tabRow: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4, marginBottom: 20 },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10 },
    tabActive: { backgroundColor: Colors.primary, ...Platform.select({ web: { boxShadow: '0 2px 8px rgba(37,99,235,0.3)' } }) },
    tabText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
    tabTextActive: { color: '#fff' },

    searchRow: { marginBottom: 14 },
    searchInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 14, height: 46 },
    searchInput: { flex: 1, fontSize: 14, color: '#1E293B' },

    filterScroll: { marginBottom: 14 },
    filterScrollContent: { paddingRight: 20, gap: 8 },
    filterTab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
    filterTabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    filterTabText: { fontSize: 13, fontWeight: '600', color: '#64748B', maxWidth: 120 },
    filterTabTextActive: { color: '#fff' },
    filterTabBadge: { marginLeft: 6, backgroundColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
    filterTabBadgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
    filterTabBadgeText: { fontSize: 11, fontWeight: '700', color: '#475569' },
    filterTabBadgeTextActive: { color: '#fff' },

    warehouseSummaryBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#EFF6FF', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
        marginBottom: 14, borderWidth: 1, borderColor: '#BFDBFE',
    },
    warehouseSummaryText: { fontSize: 13, color: '#1E40AF', flex: 1 },

    section: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden', marginBottom: 20, ...Platform.select({ web: { boxShadow: '0 1px 4px rgba(0,0,0,0.06)' } }) },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
    countBadge: { backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
    countBadgeText: { fontSize: 12, fontWeight: '700', color: Colors.primary },

    // Web Tablo (Excel like)
    tableContainer: { overflow: 'hidden', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, backgroundColor: '#FFF' },
    tableHeader: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderBottomWidth: 1, borderBottomColor: '#CBD5E1' },
    thCell: { borderRightWidth: 1, borderRightColor: '#CBD5E1', justifyContent: 'center' },
    thCellLast: { justifyContent: 'center' },
    thCellText: { fontSize: 12, fontWeight: '700', color: '#334155', textTransform: 'uppercase', paddingHorizontal: 14, paddingVertical: 12 },
    tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', alignItems: 'stretch' },
    tableRowEven: { backgroundColor: '#fff' },
    tableRowOdd: { backgroundColor: '#F8FAFC' },
    tdCell: { borderRightWidth: 1, borderRightColor: '#E2E8F0', paddingHorizontal: 14, paddingVertical: 12, justifyContent: 'center' },
    tdCellLast: { paddingHorizontal: 14, paddingVertical: 12, justifyContent: 'center' },
    tdBold: { fontSize: 13, fontWeight: '600', color: '#1E293B' },
    tdText: { fontSize: 13, color: '#475569' },
    tdSub: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
    tdQtyText: { fontSize: 14, fontWeight: '700' },
    tdQtyTextDark: { fontSize: 14, fontWeight: '600', color: '#1E293B' },

    // Excel like lokasyon görünümü
    excelLocRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 2 },
    excelLocNameWrap: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 8 },
    excelLocDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#94A3B8', marginRight: 6 },
    excelLocName: { fontSize: 12, fontWeight: '500', color: '#475569' },
    excelLocRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    excelLocQty: { fontSize: 12, fontWeight: '700', minWidth: 40, textAlign: 'right' },
    
    cellTransferIconButton: { padding: 6, borderRadius: 6, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' },
    excelWarehouseBadgeRef: { backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, alignSelf: 'flex-start' },
    excelWarehouseBadgeText: { fontSize: 12, fontWeight: '600' },

    // Mobil kart
    mobileCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 10, overflow: 'hidden' },
    mobileCardHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    mobileCardTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
    mobileCardCode: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
    mobileTotalBadge: { backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    mobileTotalText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
    mobileExpandedBody: { padding: 14, gap: 10 },
    mobileLocRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#E2E8F0' },
    mobileLocName: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
    mobileLocQty: { fontSize: 13, fontWeight: '700', marginTop: 2 },
    mobileTransferBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, gap: 5 },
    mobileTransferBtnText: { fontSize: 12, fontWeight: '600', color: Colors.primary },

    // Mini breakdown
    breakdownContainer: { gap: 4 },
    breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    breakdownWarehouse: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    breakdownWarehouseName: { fontSize: 11, color: '#4F46E5', fontWeight: '600' },
    breakdownQtyBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    breakdownQtyText: { fontSize: 11, fontWeight: '700' },

    // Transfer geçmişi
    qtyBadge: { backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    qtyBadgeText: { fontSize: 13, fontWeight: '700', color: Colors.primary },
    warehouseChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    warehouseChipText: { fontSize: 12, fontWeight: '600' },
    historyCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 10, padding: 14 },
    historyProduct: { fontSize: 14, fontWeight: '700', color: '#1E293B', flex: 1, marginRight: 10 },
    historyDate: { fontSize: 11, color: '#94A3B8', marginTop: 8 },
    historyNote: { fontSize: 12, color: '#64748B', marginTop: 4, fontStyle: 'italic' },

    // Loading/Empty
    loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 10 },
    loadingText: { fontSize: 14, color: '#94A3B8' },
    emptyRow: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 10 },
    emptyText: { fontSize: 14, color: '#94A3B8', fontStyle: 'italic' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalBox: { backgroundColor: '#fff', borderRadius: 20, width: '100%', maxWidth: 540, padding: 24, ...Platform.select({ web: { boxShadow: '0 20px 60px rgba(0,0,0,0.2)' } }) },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
    modalSubtitle: { fontSize: 13, color: '#64748B', marginTop: 3 },
    modalCloseBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },

    infoRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#E2E8F0' },
    infoRowLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    infoRowValue: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginTop: 2 },

    inputLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 7, marginTop: 4 },
    input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1E293B', marginBottom: 14 },

    noLocWarning: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFBEB', borderRadius: 8, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#FDE68A' },
    noLocWarningText: { fontSize: 12, color: '#92400E', flex: 1 },

    quickChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
    quickChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
    quickChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    quickChipText: { fontSize: 13, fontWeight: '600', color: '#475569' },
    quickChipTextActive: { color: '#fff' },
    quickChipQty: { fontSize: 11, color: '#94A3B8', marginTop: 2 },

    quickQtyRow: { flexDirection: 'row', gap: 8, marginBottom: 14, marginTop: -8 },
    quickQtyChip: { flex: 1, paddingVertical: 6, borderRadius: 8, backgroundColor: '#EFF6FF', alignItems: 'center', borderWidth: 1, borderColor: '#BFDBFE' },
    quickQtyText: { fontSize: 12, fontWeight: '600', color: Colors.primary },

    warehouseQuickSelect: { marginBottom: 14 },
    quickSelectLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '600', marginBottom: 8 },

    modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
    cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center' },
    cancelBtnText: { fontSize: 15, fontWeight: '600', color: '#64748B' },
    confirmBtn: { flex: 2, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 13, borderRadius: 12, backgroundColor: Colors.primary, ...Platform.select({ web: { boxShadow: '0 4px 14px rgba(37,99,235,0.35)' } }) },
    confirmBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
