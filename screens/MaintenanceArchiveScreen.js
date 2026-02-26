import React, { useContext, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../AppContext';
import { Colors } from '../Theme';

const isWeb = Platform.OS === 'web';

const TYPE_LABELS = { MAINTENANCE: 'Bakım', SERVICE: 'Servis' };
const PRIORITY_LABELS = { LOW: 'Düşük', NORMAL: 'Normal', HIGH: 'Yüksek', URGENT: 'Acil' };
const PRIORITY_COLORS = {
    LOW: { bg: '#F0FDF4', border: '#BBF7D0', text: '#15803D' },
    NORMAL: { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8' },
    HIGH: { bg: '#FFF7ED', border: '#FED7AA', text: '#C2410C' },
    URGENT: { bg: '#FEF2F2', border: '#FECACA', text: '#B91C1C' },
};

export default function MaintenanceArchiveScreen() {
    const { maintenanceRequests } = useContext(AppContext);
    const [search, setSearch] = useState('');
    const [sortKey, setSortKey] = useState('date_desc');

    // --- Kapalı kayıtlar ---
    const closedMrs = useMemo(() => {
        let list = (maintenanceRequests || []).filter(mr => {
            if (mr.status !== 'CLOSED') return false;
            if (!search) return true;
            const q = search.toLowerCase();
            const dateStr = mr.closed_at ? new Date(mr.closed_at).toLocaleDateString('tr-TR') : '';
            return (
                (mr.title || '').toLowerCase().includes(q) ||
                (mr.mr_number || '').toLowerCase().includes(q) ||
                (mr.asset_name || '').toLowerCase().includes(q) ||
                dateStr.includes(q)
            );
        });
        switch (sortKey) {
            case 'date_asc': return [...list].sort((a, b) => new Date(a.closed_at) - new Date(b.closed_at));
            case 'name_az': return [...list].sort((a, b) => (a.title || '').localeCompare(b.title || ''));
            case 'cost_desc': return [...list].sort((a, b) => (b.actual_cost || 0) - (a.actual_cost || 0));
            default: return [...list].sort((a, b) => new Date(b.closed_at || 0) - new Date(a.closed_at || 0));
        }
    }, [maintenanceRequests, search, sortKey]);

    // --- İstatistikler ---
    const stats = useMemo(() => {
        const closed = (maintenanceRequests || []).filter(mr => mr.status === 'CLOSED');
        const totalActualCost = closed.reduce((s, mr) => s + (parseFloat(mr.actual_cost) || 0), 0);
        const totalEstimatedCost = closed.reduce((s, mr) => s + (parseFloat(mr.estimated_cost) || 0), 0);
        const totalDuration = closed.reduce((s, mr) => s + (mr.total_duration || 0), 0);
        return { count: closed.length, totalActualCost, totalEstimatedCost, totalDuration };
    }, [maintenanceRequests]);

    const formatDate = (iso) => {
        if (!iso) return '-';
        try { return new Date(iso).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return iso; }
    };
    const formatShortDate = (iso) => {
        if (!iso) return '-';
        try { return new Date(iso).toLocaleDateString('tr-TR'); } catch { return iso; }
    };
    const formatDuration = (min) => {
        if (!min || min === 0) return '-';
        const h = Math.floor(min / 60);
        const m = min % 60;
        return h > 0 ? `${h}s ${m}dk` : `${m}dk`;
    };
    const formatCost = (v) => v != null && v !== '' ? `₺${parseFloat(v).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` : '—';

    const SortButton = ({ label, value }) => (
        <TouchableOpacity style={[styles.sortBtn, sortKey === value && styles.sortBtnActive]} onPress={() => setSortKey(value)}>
            <Text style={[styles.sortBtnText, sortKey === value && styles.sortBtnTextActive]}>{label}</Text>
        </TouchableOpacity>
    );

    // --- Web Tablo Satırı ---
    const WebRow = ({ item, index }) => {
        const pc = PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.NORMAL;
        const doneTasks = item.tasks?.filter(t => t.status === 'DONE').length || 0;
        const totalTasks = item.tasks?.length || 0;
        const costDiff = item.actual_cost != null && item.estimated_cost != null
            ? parseFloat(item.actual_cost) - parseFloat(item.estimated_cost)
            : null;

        return (
            <View style={[styles.webRow, index % 2 === 0 ? styles.webRowEven : styles.webRowOdd]}>
                {/* No + Tarih */}
                <View style={{ flex: 1.3, justifyContent: 'center' }}>
                    <Text style={styles.webCellMono}>{item.mr_number || '—'}</Text>
                    <Text style={styles.webCellSub}>{formatShortDate(item.closed_at)}</Text>
                </View>
                {/* Tip */}
                <View style={{ flex: 0.8, justifyContent: 'center', alignItems: 'center' }}>
                    <View style={[styles.typeBadge, { backgroundColor: item.type === 'SERVICE' ? '#F5F3FF' : '#EFF6FF', borderColor: item.type === 'SERVICE' ? '#DDD6FE' : '#BFDBFE' }]}>
                        <Ionicons name={item.type === 'SERVICE' ? 'construct-outline' : 'build-outline'} size={10} color={item.type === 'SERVICE' ? '#7C3AED' : '#1D4ED8'} />
                        <Text style={[styles.typeBadgeText, { color: item.type === 'SERVICE' ? '#7C3AED' : '#1D4ED8' }]}>{TYPE_LABELS[item.type] || item.type}</Text>
                    </View>
                </View>
                {/* Başlık + Ekipman */}
                <View style={{ flex: 2, justifyContent: 'center' }}>
                    <Text style={styles.webCellBold} numberOfLines={1}>{item.title}</Text>
                    {item.asset_name ? <Text style={styles.webCellSub}>{item.asset_name}</Text> : null}
                </View>
                {/* Öncelik */}
                <View style={{ flex: 0.8, justifyContent: 'center', alignItems: 'center' }}>
                    <View style={[styles.priorityBadge, { backgroundColor: pc.bg, borderColor: pc.border }]}>
                        <Text style={[styles.priorityText, { color: pc.text }]}>{PRIORITY_LABELS[item.priority] || item.priority}</Text>
                    </View>
                </View>
                {/* Görevler */}
                <View style={{ flex: 0.9, justifyContent: 'center', alignItems: 'center' }}>
                    {totalTasks > 0 ? (
                        <>
                            <Text style={styles.webCellBold}>{doneTasks}/{totalTasks}</Text>
                            <Text style={styles.webCellSub}>Görev</Text>
                        </>
                    ) : <Text style={styles.webCellSub}>—</Text>}
                </View>
                {/* Gerçek Maliyet */}
                <View style={{ flex: 1.1, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={styles.webCellBold}>{formatCost(item.actual_cost)}</Text>
                    {costDiff !== null && (
                        <Text style={[styles.webCellSub, { color: costDiff > 0 ? Colors.critical : Colors.iosGreen, fontWeight: '700' }]}>
                            {costDiff > 0 ? `+₺${costDiff.toFixed(2)}` : `-₺${Math.abs(costDiff).toFixed(2)}`}
                        </Text>
                    )}
                </View>
                {/* Süre */}
                <View style={{ flex: 0.8, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={styles.webCellBold}>{formatDuration(item.total_duration)}</Text>
                </View>
                {/* Atanan + Not */}
                <View style={{ flex: 1.3, justifyContent: 'center' }}>
                    {item.assigned_to ? <Text style={styles.webCellBold} numberOfLines={1}>{item.assigned_to}</Text> : null}
                    <Text style={styles.webCellSub} numberOfLines={2}>{item.closure_notes || item.description || '—'}</Text>
                </View>
                {/* Kapalı Badge */}
                <View style={{ flex: 0.7, justifyContent: 'center', alignItems: 'center' }}>
                    <View style={styles.closedBadge}>
                        <Ionicons name="checkmark-circle" size={11} color="#15803D" style={{ marginRight: 3 }} />
                        <Text style={styles.closedBadgeText}>KAPALI</Text>
                    </View>
                </View>
            </View>
        );
    };

    // --- Mobil Kart ---
    const MobileCard = ({ item }) => {
        const pc = PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.NORMAL;
        const doneTasks = item.tasks?.filter(t => t.status === 'DONE').length || 0;
        const totalTasks = item.tasks?.length || 0;
        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.cardMrNum}>{item.mr_number || 'MR-#'}</Text>
                        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.cardSub}>{formatDate(item.closed_at)}</Text>
                    </View>
                    <View style={styles.closedBadge}>
                        <Ionicons name="checkmark-circle" size={11} color="#15803D" style={{ marginRight: 3 }} />
                        <Text style={styles.closedBadgeText}>KAPALI</Text>
                    </View>
                </View>

                <View style={styles.metricsRow}>
                    <View style={styles.metricBox}>
                        <Text style={styles.metricVal}>{formatCost(item.actual_cost)}</Text>
                        <Text style={styles.metricLbl}>Gerçek Maliyet</Text>
                    </View>
                    <View style={[styles.metricBox, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#F1F5F9' }]}>
                        <Text style={styles.metricVal}>{formatDuration(item.total_duration)}</Text>
                        <Text style={styles.metricLbl}>Toplam Süre</Text>
                    </View>
                    <View style={styles.metricBox}>
                        <Text style={styles.metricVal}>{doneTasks}/{totalTasks}</Text>
                        <Text style={styles.metricLbl}>Görev</Text>
                    </View>
                </View>

                <View style={styles.cardInfoRow}>
                    <View style={[styles.typeBadge, { backgroundColor: item.type === 'SERVICE' ? '#F5F3FF' : '#EFF6FF', borderColor: item.type === 'SERVICE' ? '#DDD6FE' : '#BFDBFE' }]}>
                        <Text style={[styles.typeBadgeText, { color: item.type === 'SERVICE' ? '#7C3AED' : '#1D4ED8' }]}>{TYPE_LABELS[item.type] || item.type}</Text>
                    </View>
                    <View style={[styles.priorityBadge, { backgroundColor: pc.bg, borderColor: pc.border }]}>
                        <Text style={[styles.priorityText, { color: pc.text }]}>{PRIORITY_LABELS[item.priority]}</Text>
                    </View>
                    {item.asset_name && (
                        <View style={styles.cardInfoBadge}>
                            <Ionicons name="hardware-chip-outline" size={11} color="#64748B" />
                            <Text style={styles.cardInfoBadgeText}>{item.asset_name}</Text>
                        </View>
                    )}
                </View>

                {(item.closure_notes || item.description) ? (
                    <View style={styles.notesBox}>
                        <Ionicons name="chatbubble-ellipses-outline" size={12} color="#94A3B8" style={{ marginRight: 6 }} />
                        <Text style={styles.notesText} numberOfLines={2}>{item.closure_notes || item.description}</Text>
                    </View>
                ) : null}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Başlık */}
            <View style={styles.pageHeader}>
                <View>
                    <Text style={styles.pageTitle}>Bakım ve Servis Arşivi</Text>
                    <Text style={styles.pageSubtitle}>{closedMrs.length} arşivlenmiş kayıt</Text>
                </View>
            </View>

            {/* İstatistikler */}
            <View style={styles.statsRow}>
                <View style={[styles.statCard, { borderLeftColor: '#64748B' }]}>
                    <View style={[styles.statIcon, { backgroundColor: '#F1F5F9' }]}><Ionicons name="archive-outline" size={20} color="#64748B" /></View>
                    <View><Text style={styles.statVal}>{stats.count}</Text><Text style={styles.statLbl}>Toplam Kayıt</Text></View>
                </View>
                <View style={[styles.statCard, { borderLeftColor: Colors.iosGreen }]}>
                    <View style={[styles.statIcon, { backgroundColor: '#E6F4EA' }]}><Ionicons name="cash-outline" size={20} color={Colors.iosGreen} /></View>
                    <View><Text style={styles.statVal}>{formatCost(stats.totalActualCost)}</Text><Text style={styles.statLbl}>Toplam Gerçek Maliyet</Text></View>
                </View>
                <View style={[styles.statCard, { borderLeftColor: '#F97316' }]}>
                    <View style={[styles.statIcon, { backgroundColor: '#FFF7ED' }]}><Ionicons name="calculator-outline" size={20} color="#F97316" /></View>
                    <View><Text style={styles.statVal}>{formatCost(stats.totalEstimatedCost)}</Text><Text style={styles.statLbl}>Toplam Tahmini Maliyet</Text></View>
                </View>
                <View style={[styles.statCard, { borderLeftColor: '#8B5CF6' }]}>
                    <View style={[styles.statIcon, { backgroundColor: '#F5F3FF' }]}><Ionicons name="hourglass-outline" size={20} color="#8B5CF6" /></View>
                    <View><Text style={styles.statVal}>{formatDuration(stats.totalDuration)}</Text><Text style={styles.statLbl}>Toplam Süre</Text></View>
                </View>
            </View>

            {/* Toolbar */}
            <View style={styles.toolbar}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={16} color="#94A3B8" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Talep no, başlık, ekipman veya tarih ara..."
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
                    <SortButton label="Maliyet ↓" value="cost_desc" />
                </View>
            </View>

            {/* Liste */}
            {isWeb ? (
                <View style={styles.webTableWrap}>
                    <View style={styles.webTableHeader}>
                        <Text style={[styles.webHeaderCell, { flex: 1.3 }]}>TALEP NO</Text>
                        <Text style={[styles.webHeaderCell, { flex: 0.8, textAlign: 'center' }]}>TİP</Text>
                        <Text style={[styles.webHeaderCell, { flex: 2 }]}>BAŞLIK / EKİPMAN</Text>
                        <Text style={[styles.webHeaderCell, { flex: 0.8, textAlign: 'center' }]}>ÖNCELİK</Text>
                        <Text style={[styles.webHeaderCell, { flex: 0.9, textAlign: 'center' }]}>GÖREVLER</Text>
                        <Text style={[styles.webHeaderCell, { flex: 1.1, textAlign: 'center' }]}>GERÇEK MALİYET</Text>
                        <Text style={[styles.webHeaderCell, { flex: 0.8, textAlign: 'center' }]}>SÜRE</Text>
                        <Text style={[styles.webHeaderCell, { flex: 1.3 }]}>ATANAN / NOT</Text>
                        <Text style={[styles.webHeaderCell, { flex: 0.7, textAlign: 'center' }]}>DURUM</Text>
                    </View>
                    <FlatList
                        data={closedMrs}
                        keyExtractor={i => i.id.toString()}
                        renderItem={({ item, index }) => <WebRow item={item} index={index} />}
                        contentContainerStyle={{ paddingBottom: 40 }}
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <Ionicons name="archive-outline" size={52} color="#CBD5E1" />
                                <Text style={styles.emptyText}>Arşivlenmiş bakım/servis kaydı bulunamadı.</Text>
                                {search !== '' && (
                                    <TouchableOpacity onPress={() => setSearch('')} style={styles.clearBtn}>
                                        <Text style={styles.clearBtnText}>Aramayı Temizle</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        }
                    />
                </View>
            ) : (
                <FlatList
                    data={closedMrs}
                    keyExtractor={i => i.id.toString()}
                    contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                    renderItem={({ item }) => <MobileCard item={item} />}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="archive-outline" size={52} color="#CBD5E1" />
                            <Text style={styles.emptyText}>Arşivlenmiş kayıt bulunamadı.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const formatCost = (v) => v != null && v !== '' ? `₺${parseFloat(v).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` : '—';

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },

    pageHeader: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 12 },
    pageTitle: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
    pageSubtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },

    statsRow: { flexDirection: 'row', paddingHorizontal: 24, gap: 10, marginBottom: 16, flexWrap: 'wrap' },
    statCard: { flex: 1, minWidth: 120, backgroundColor: '#fff', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderLeftWidth: 4, ...Platform.select({ web: { boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }, default: { elevation: 2 } }) },
    statIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    statVal: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
    statLbl: { fontSize: 11, color: '#64748B', fontWeight: '500', marginTop: 2 },

    toolbar: { paddingHorizontal: 24, marginBottom: 12 },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 10, gap: 8 },
    searchInput: { flex: 1, fontSize: 14, color: '#1E293B', outlineStyle: 'none' },
    sortRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    sortLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '600', marginRight: 4 },
    sortBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
    sortBtnActive: { backgroundColor: '#475569', borderColor: '#475569' },
    sortBtnText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
    sortBtnTextActive: { color: '#fff' },

    webTableWrap: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden', marginHorizontal: 24, marginBottom: 40, ...Platform.select({ web: { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' } }) },
    webTableHeader: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderBottomWidth: 2, borderBottomColor: '#E2E8F0', paddingVertical: 12, paddingHorizontal: 16 },
    webHeaderCell: { fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 },
    webRow: { flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', alignItems: 'center' },
    webRowEven: { backgroundColor: '#fff' },
    webRowOdd: { backgroundColor: '#FAFBFC' },
    webCellMono: { fontSize: 13, fontWeight: '700', color: '#64748B', fontFamily: Platform.OS === 'web' ? 'monospace' : 'System' },
    webCellBold: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
    webCellSub: { fontSize: 11, color: '#94A3B8', marginTop: 2 },

    typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
    typeBadgeText: { fontSize: 10, fontWeight: '700' },
    priorityBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
    priorityText: { fontSize: 10, fontWeight: '700' },

    closedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: '#BBF7D0' },
    closedBadgeText: { fontSize: 10, fontWeight: '800', color: '#15803D' },

    card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', ...Platform.select({ web: { boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }, default: { elevation: 2 } }) },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
    cardMrNum: { fontSize: 11, fontWeight: '800', color: '#64748B', fontFamily: Platform.OS === 'web' ? 'monospace' : 'System', marginBottom: 2 },
    cardTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A' },
    cardSub: { fontSize: 12, color: '#94A3B8', marginTop: 2 },

    metricsRow: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 12 },
    metricBox: { flex: 1, paddingVertical: 12, alignItems: 'center' },
    metricVal: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
    metricLbl: { fontSize: 10, color: '#94A3B8', fontWeight: '500', marginTop: 2 },

    cardInfoRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 },
    cardInfoBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
    cardInfoBadgeText: { fontSize: 11, color: '#475569', fontWeight: '600' },

    notesBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#F8FAFC', padding: 10, borderRadius: 10, marginTop: 10 },
    notesText: { fontSize: 12, color: '#64748B', fontStyle: 'italic', flex: 1 },

    empty: { alignItems: 'center', paddingVertical: 60 },
    emptyText: { marginTop: 12, fontSize: 15, color: '#94A3B8', textAlign: 'center' },
    clearBtn: { marginTop: 14, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#F1F5F9', borderRadius: 8 },
    clearBtnText: { color: '#475569', fontWeight: '700', fontSize: 13 },
});
