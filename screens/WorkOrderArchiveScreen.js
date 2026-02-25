import React, { useContext, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../AppContext';
import { Colors } from '../Theme';

const isWeb = Platform.OS === 'web';

export default function WorkOrderArchiveScreen() {
    const { workOrders, products } = useContext(AppContext);
    const [search, setSearch] = useState('');
    const [sortKey, setSortKey] = useState('date_desc');

    // --- Kapalı iş emirleri ---
    const closedWorkOrders = useMemo(() => {
        let list = workOrders.filter(wo => {
            if (wo.status !== 'CLOSED') return false;
            if (!search) return true;
            const product = products.find(p => p.id === wo.product_id);
            const q = search.toLowerCase();
            const dateStr = wo.closed_at ? new Date(wo.closed_at).toLocaleDateString('tr-TR') : '';
            return (
                (wo.wo_number || '').toLowerCase().includes(q) ||
                (product?.name || '').toLowerCase().includes(q) ||
                (product?.code || '').toLowerCase().includes(q) ||
                dateStr.includes(q)
            );
        });

        switch (sortKey) {
            case 'date_asc': return [...list].sort((a, b) => new Date(a.closed_at) - new Date(b.closed_at));
            case 'name_az': return [...list].sort((a, b) => {
                const pA = products.find(p => p.id === a.product_id)?.name || '';
                const pB = products.find(p => p.id === b.product_id)?.name || '';
                return pA.localeCompare(pB);
            });
            case 'qty_desc': return [...list].sort((a, b) => (b.actual_quantity || 0) - (a.actual_quantity || 0));
            default: return [...list].sort((a, b) => new Date(b.closed_at || 0) - new Date(a.closed_at || 0));
        }
    }, [workOrders, products, search, sortKey]);

    // --- İstatistikler ---
    const stats = useMemo(() => {
        const closed = workOrders.filter(wo => wo.status === 'CLOSED');
        const totalProduced = closed.reduce((s, wo) => s + (wo.actual_quantity || 0), 0);
        const totalWaste = closed.reduce((s, wo) => s + (wo.waste_quantity || 0), 0);
        const totalDuration = closed.reduce((s, wo) => s + (wo.total_duration || 0), 0);
        return { count: closed.length, totalProduced, totalWaste, totalDuration };
    }, [workOrders]);

    // --- Verimlilik hesabı ---
    const getEfficiency = (wo) => {
        const target = wo.target_quantity || 0;
        const actual = wo.actual_quantity || 0;
        if (!target) return 0;
        return Math.min(100, Math.round((actual / target) * 100));
    };

    // --- Formatlar ---
    const formatDate = (iso) => {
        if (!iso) return '-';
        return new Date(iso).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };
    const formatShortDate = (iso) => {
        if (!iso) return '-';
        return new Date(iso).toLocaleDateString('tr-TR');
    };
    const formatDuration = (min) => {
        if (!min || min === 0) return '-';
        const h = Math.floor(min / 60);
        const m = min % 60;
        return h > 0 ? `${h}s ${m}dk` : `${m}dk`;
    };

    const SortButton = ({ label, value }) => (
        <TouchableOpacity style={[styles.sortBtn, sortKey === value && styles.sortBtnActive]} onPress={() => setSortKey(value)}>
            <Text style={[styles.sortBtnText, sortKey === value && styles.sortBtnTextActive]}>{label}</Text>
        </TouchableOpacity>
    );

    // --- Web Tablo Satırı ---
    const WebRow = ({ item, index }) => {
        const product = products.find(p => p.id === item.product_id);
        const eff = getEfficiency(item);
        const effColor = eff >= 90 ? Colors.iosGreen : eff >= 70 ? '#F59E0B' : Colors.critical;
        const waste = item.waste_quantity || 0;
        const rawMaterial = item.raw_material_id ? products.find(p => p.id === item.raw_material_id) : null;

        return (
            <View style={[styles.webRow, index % 2 === 0 ? styles.webRowEven : styles.webRowOdd]}>
                {/* İş Emri No + Tarih */}
                <View style={{ flex: 1.4, justifyContent: 'center' }}>
                    <Text style={styles.webCellMono}>{item.wo_number || '—'}</Text>
                    <Text style={styles.webCellSub}>{formatShortDate(item.closed_at)}</Text>
                </View>
                {/* Ürün */}
                <View style={{ flex: 2, justifyContent: 'center' }}>
                    <Text style={styles.webCellBold} numberOfLines={1}>{product?.name || 'Bilinmeyen'}</Text>
                    {product?.category ? <Text style={styles.webCellSub}>{product.category}</Text> : null}
                </View>
                {/* Hedef / Üretilen */}
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={styles.webCellBold}>{item.actual_quantity || 0}</Text>
                    <Text style={styles.webCellSub}>/{item.target_quantity} Ht.</Text>
                </View>
                {/* Fire */}
                <View style={{ flex: 0.8, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={[styles.webCellBold, { color: waste > 0 ? Colors.critical : '#94A3B8' }]}>{waste}</Text>
                    <Text style={styles.webCellSub}>fire</Text>
                </View>
                {/* Verimlilik */}
                <View style={{ flex: 1.2, justifyContent: 'center', paddingRight: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={[styles.webCellSub, { fontWeight: '700', color: effColor }]}>%{eff}</Text>
                    </View>
                    <View style={styles.progressTrack}>
                        <View style={[styles.progressBar, { width: `${eff}%`, backgroundColor: effColor }]} />
                    </View>
                </View>
                {/* Hammadde */}
                <View style={{ flex: 1.4, justifyContent: 'center' }}>
                    {rawMaterial ? (
                        <>
                            <Text style={styles.webCellBold} numberOfLines={1}>{rawMaterial.name}</Text>
                            <Text style={styles.webCellSub}>{((item.raw_material_usage || 0) * (item.actual_quantity || 0)).toFixed(2)} {rawMaterial.unit || 'adet'}</Text>
                        </>
                    ) : <Text style={styles.webCellSub}>—</Text>}
                </View>
                {/* Süre */}
                <View style={{ flex: 0.9, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={styles.webCellBold}>{formatDuration(item.total_duration)}</Text>
                </View>
                {/* Kapatış Notu */}
                <View style={{ flex: 1.3, justifyContent: 'center' }}>
                    <Text style={styles.webCellSub} numberOfLines={2}>{item.closure_notes || item.notes || '—'}</Text>
                </View>
            </View>
        );
    };

    // --- Mobil Kart ---
    const MobileCard = ({ item }) => {
        const product = products.find(p => p.id === item.product_id);
        const eff = getEfficiency(item);
        const effColor = eff >= 90 ? Colors.iosGreen : eff >= 70 ? '#F59E0B' : Colors.critical;
        const rawMaterial = item.raw_material_id ? products.find(p => p.id === item.raw_material_id) : null;
        const doneProcs = item.processes?.filter(p => p.status === 'DONE').length || 0;
        const totalProcs = item.processes?.length || 0;

        return (
            <View style={styles.card}>
                {/* Kart Başlık */}
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.cardWoNum}>{item.wo_number || 'No-#'}</Text>
                        <Text style={styles.cardTitle} numberOfLines={1}>{product?.name || 'Bilinmeyen Ürün'}</Text>
                        <Text style={styles.cardSub}>{formatDate(item.closed_at)}</Text>
                    </View>
                    <View style={styles.closedBadge}>
                        <Ionicons name="checkmark-circle" size={12} color="#15803D" style={{ marginRight: 4 }} />
                        <Text style={styles.closedBadgeText}>KAPALI</Text>
                    </View>
                </View>

                {/* Metrikler */}
                <View style={styles.metricsRow}>
                    <View style={styles.metricBox}>
                        <Text style={styles.metricVal}>{item.actual_quantity || 0}</Text>
                        <Text style={styles.metricLbl}>Üretilen</Text>
                    </View>
                    <View style={[styles.metricBox, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#F1F5F9' }]}>
                        <Text style={[styles.metricVal, { color: effColor }]}>%{eff}</Text>
                        <Text style={styles.metricLbl}>Verimlilik</Text>
                    </View>
                    <View style={styles.metricBox}>
                        <Text style={[styles.metricVal, { color: (item.waste_quantity || 0) > 0 ? Colors.critical : '#94A3B8' }]}>{item.waste_quantity || 0}</Text>
                        <Text style={styles.metricLbl}>Fire</Text>
                    </View>
                    <View style={styles.metricBox}>
                        <Text style={styles.metricVal}>{formatDuration(item.total_duration)}</Text>
                        <Text style={styles.metricLbl}>Süre</Text>
                    </View>
                </View>

                {/* Verimlilik çubuğu */}
                <View style={{ marginTop: 10, marginBottom: 10 }}>
                    <View style={styles.progressTrack}>
                        <View style={[styles.progressBar, { width: `${eff}%`, backgroundColor: effColor }]} />
                    </View>
                </View>

                {/* Proses ve Hammadde */}
                <View style={styles.cardInfoRow}>
                    {totalProcs > 0 && (
                        <View style={styles.cardInfoBadge}>
                            <Ionicons name="construct-outline" size={12} color="#64748B" />
                            <Text style={styles.cardInfoBadgeText}>{doneProcs}/{totalProcs} Proses</Text>
                        </View>
                    )}
                    {rawMaterial && (
                        <View style={styles.cardInfoBadge}>
                            <Ionicons name="cube-outline" size={12} color="#64748B" />
                            <Text style={styles.cardInfoBadgeText}>{rawMaterial.name}</Text>
                        </View>
                    )}
                </View>

                {/* Notlar */}
                {(item.closure_notes || item.notes) ? (
                    <View style={styles.notesBox}>
                        <Ionicons name="chatbubble-ellipses-outline" size={13} color="#94A3B8" style={{ marginRight: 6 }} />
                        <Text style={styles.notesText} numberOfLines={2}>{item.closure_notes || item.notes}</Text>
                    </View>
                ) : null}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Sayfa Başlığı */}
            <View style={styles.pageHeader}>
                <View>
                    <Text style={styles.pageTitle}>İş Emri Arşivi</Text>
                    <Text style={styles.pageSubtitle}>{closedWorkOrders.length} kapalı iş emri</Text>
                </View>
            </View>

            {/* İstatistik Kartları */}
            <View style={styles.statsRow}>
                <View style={[styles.statCard, { borderLeftColor: '#64748B' }]}>
                    <View style={[styles.statIcon, { backgroundColor: '#F1F5F9' }]}>
                        <Ionicons name="archive-outline" size={20} color="#64748B" />
                    </View>
                    <View>
                        <Text style={styles.statVal}>{stats.count}</Text>
                        <Text style={styles.statLbl}>Toplam Kayıt</Text>
                    </View>
                </View>
                <View style={[styles.statCard, { borderLeftColor: Colors.iosGreen }]}>
                    <View style={[styles.statIcon, { backgroundColor: '#E6F4EA' }]}>
                        <Ionicons name="checkmark-circle-outline" size={20} color={Colors.iosGreen} />
                    </View>
                    <View>
                        <Text style={styles.statVal}>{stats.totalProduced}</Text>
                        <Text style={styles.statLbl}>Toplam Üretim</Text>
                    </View>
                </View>
                <View style={[styles.statCard, { borderLeftColor: Colors.critical }]}>
                    <View style={[styles.statIcon, { backgroundColor: '#FEF2F2' }]}>
                        <Ionicons name="warning-outline" size={20} color={Colors.critical} />
                    </View>
                    <View>
                        <Text style={[styles.statVal, { color: stats.totalWaste > 0 ? Colors.critical : '#0F172A' }]}>{stats.totalWaste}</Text>
                        <Text style={styles.statLbl}>Toplam Fire</Text>
                    </View>
                </View>
                <View style={[styles.statCard, { borderLeftColor: '#8B5CF6' }]}>
                    <View style={[styles.statIcon, { backgroundColor: '#F5F3FF' }]}>
                        <Ionicons name="hourglass-outline" size={20} color="#8B5CF6" />
                    </View>
                    <View>
                        <Text style={styles.statVal}>{formatDuration(stats.totalDuration)}</Text>
                        <Text style={styles.statLbl}>Toplam Süre</Text>
                    </View>
                </View>
            </View>

            {/* Arama + Sıralama Toolbar */}
            <View style={styles.toolbar}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={16} color="#94A3B8" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="İş emri no, ürün adı veya tarih ara..."
                        value={search}
                        onChangeText={setSearch}
                        placeholderTextColor="#94A3B8"
                    />
                    {search !== '' && (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <Ionicons name="close-circle" size={18} color="#94A3B8" />
                        </TouchableOpacity>
                    )}
                </View>
                <View style={styles.sortRow}>
                    <Text style={styles.sortLabel}>Sırala:</Text>
                    <SortButton label="En Yeni" value="date_desc" />
                    <SortButton label="En Eski" value="date_asc" />
                    <SortButton label="A-Z" value="name_az" />
                    <SortButton label="Miktar ↓" value="qty_desc" />
                </View>
            </View>

            {/* Liste */}
            {isWeb ? (
                <View style={styles.webTableWrap}>
                    <View style={styles.webTableHeader}>
                        <Text style={[styles.webHeaderCell, { flex: 1.4 }]}>İŞ EMRİ NO</Text>
                        <Text style={[styles.webHeaderCell, { flex: 2 }]}>ÜRÜN</Text>
                        <Text style={[styles.webHeaderCell, { flex: 1, textAlign: 'center' }]}>ÜRETİLEN</Text>
                        <Text style={[styles.webHeaderCell, { flex: 0.8, textAlign: 'center' }]}>FİRE</Text>
                        <Text style={[styles.webHeaderCell, { flex: 1.2 }]}>VERİMLİLİK</Text>
                        <Text style={[styles.webHeaderCell, { flex: 1.4 }]}>HAMMADDE</Text>
                        <Text style={[styles.webHeaderCell, { flex: 0.9, textAlign: 'center' }]}>SÜRE</Text>
                        <Text style={[styles.webHeaderCell, { flex: 1.3 }]}>NOT</Text>
                    </View>
                    <FlatList
                        data={closedWorkOrders}
                        keyExtractor={i => i.id.toString()}
                        renderItem={({ item, index }) => <WebRow item={item} index={index} />}
                        contentContainerStyle={{ paddingBottom: 40 }}
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <Ionicons name="archive-outline" size={52} color="#CBD5E1" />
                                <Text style={styles.emptyText}>Arşivlenmiş iş emri bulunamadı.</Text>
                                {search !== '' && <TouchableOpacity onPress={() => setSearch('')} style={styles.clearBtn}><Text style={styles.clearBtnText}>Aramayı Temizle</Text></TouchableOpacity>}
                            </View>
                        }
                    />
                </View>
            ) : (
                <FlatList
                    data={closedWorkOrders}
                    keyExtractor={i => i.id.toString()}
                    contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                    renderItem={({ item }) => <MobileCard item={item} />}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="archive-outline" size={52} color="#CBD5E1" />
                            <Text style={styles.emptyText}>Arşivlenmiş iş emri bulunamadı.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },

    // Header
    pageHeader: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 12 },
    pageTitle: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
    pageSubtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },

    // Stats
    statsRow: { flexDirection: 'row', paddingHorizontal: 24, gap: 10, marginBottom: 16, flexWrap: 'wrap' },
    statCard: { flex: 1, minWidth: 120, backgroundColor: '#fff', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderLeftWidth: 4, ...Platform.select({ web: { boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }, default: { elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3 } }) },
    statIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    statVal: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
    statLbl: { fontSize: 11, color: '#64748B', fontWeight: '500', marginTop: 2 },

    // Toolbar
    toolbar: { paddingHorizontal: 24, marginBottom: 12 },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 10, gap: 8 },
    searchInput: { flex: 1, fontSize: 14, color: '#1E293B', outlineStyle: 'none' },
    sortRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    sortLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '600', marginRight: 4 },
    sortBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
    sortBtnActive: { backgroundColor: '#475569', borderColor: '#475569' },
    sortBtnText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
    sortBtnTextActive: { color: '#fff' },

    // Web Table
    webTableWrap: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden', marginHorizontal: 24, marginBottom: 40, ...Platform.select({ web: { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' } }) },
    webTableHeader: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderBottomWidth: 2, borderBottomColor: '#E2E8F0', paddingVertical: 12, paddingHorizontal: 16 },
    webHeaderCell: { fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 },
    webRow: { flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', alignItems: 'center' },
    webRowEven: { backgroundColor: '#fff' },
    webRowOdd: { backgroundColor: '#FAFBFC' },
    webCellMono: { fontSize: 13, fontWeight: '700', color: '#64748B', fontFamily: Platform.OS === 'web' ? 'monospace' : 'System' },
    webCellBold: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
    webCellSub: { fontSize: 11, color: '#94A3B8', marginTop: 2 },

    // Progress
    progressTrack: { height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden' },
    progressBar: { height: 6, borderRadius: 3 },

    // Mobile Card
    card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', ...Platform.select({ web: { boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }, default: { elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 } }) },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
    cardWoNum: { fontSize: 11, fontWeight: '800', color: '#64748B', fontFamily: Platform.OS === 'web' ? 'monospace' : 'System', marginBottom: 2 },
    cardTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A' },
    cardSub: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
    closedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: '#BBF7D0' },
    closedBadgeText: { fontSize: 10, fontWeight: '800', color: '#15803D' },

    // Metrics
    metricsRow: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0' },
    metricBox: { flex: 1, paddingVertical: 12, alignItems: 'center' },
    metricVal: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
    metricLbl: { fontSize: 10, color: '#94A3B8', fontWeight: '500', marginTop: 2 },

    // Card Info
    cardInfoRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 6 },
    cardInfoBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
    cardInfoBadgeText: { fontSize: 11, color: '#475569', fontWeight: '600' },

    // Notes
    notesBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#F8FAFC', padding: 10, borderRadius: 10, marginTop: 10 },
    notesText: { fontSize: 13, color: '#64748B', fontStyle: 'italic', flex: 1 },

    // Empty
    empty: { alignItems: 'center', paddingVertical: 60 },
    emptyText: { marginTop: 12, fontSize: 15, color: '#94A3B8', textAlign: 'center' },
    clearBtn: { marginTop: 14, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#F1F5F9', borderRadius: 8 },
    clearBtnText: { color: '#475569', fontWeight: '700', fontSize: 13 },
});
