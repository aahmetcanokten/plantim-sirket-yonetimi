import React, { useState, useContext, useMemo } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ScrollView, TextInput, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { AppContext } from '../AppContext';
import { Colors } from '../Theme';

const isWeb = Platform.OS === 'web';

// ----- Yardımcı: durum etiket ve renk -----
const getShortageStatus = (diff) => {
    if (diff > 0) return { label: 'YETERLİ', color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' };
    if (diff === 0) return { label: 'SINIRDA', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' };
    return { label: 'EKSİK', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' };
};

// ----- Satır tipi rozeti -----
const SourceBadge = ({ type }) => {
    const cfg = type === 'sale'
        ? { label: 'SİPARİŞ', color: '#1D4ED8', bg: '#EFF6FF' }
        : { label: 'TEKLİF', color: '#6D28D9', bg: '#F5F3FF' };
    return (
        <View style={[styles.sourceBadge, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.sourceBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
    );
};

export default function MrpScreen() {
    const { sales, quotations, products, boms, addWorkOrderFromBom } = useContext(AppContext);
    const navigation = useNavigation();

    // ---- Filtre: kaynak tipi ----
    const [sourceType, setSourceType] = useState('BOTH'); // SALES | QUOTES | BOTH

    // ---- Seçili kaynak ID'leri ----
    const [selectedSaleIds, setSelectedSaleIds] = useState(new Set());
    const [selectedQuoteIds, setSelectedQuoteIds] = useState(new Set());

    // ---- Arama ----
    const [searchQuery, setSearchQuery] = useState('');

    // ---- Analiz yapıldı mı? ----
    const [analysisRun, setAnalysisRun] = useState(false);

    // ---- Satışlar: aktif (teslim edilmemiş) olanlar ----
    const activeSales = useMemo(() =>
        (sales || []).filter(s => !s.isShipped),
        [sales]
    );

    // ---- Teklifler: DRAFT veya APPROVED olanlar ----
    const activeQuotes = useMemo(() =>
        (quotations || []).filter(q => q.status === 'DRAFT' || q.status === 'APPROVED'),
        [quotations]
    );

    // ---- Arama filtreli kaynak listeleri ----
    const filteredSales = useMemo(() => {
        if (!searchQuery) return activeSales;
        const q = searchQuery.toLowerCase();
        return activeSales.filter(s =>
            (s.productName || '').toLowerCase().includes(q) ||
            (s.customerName || '').toLowerCase().includes(q)
        );
    }, [activeSales, searchQuery]);

    const filteredQuotes = useMemo(() => {
        if (!searchQuery) return activeQuotes;
        const q = searchQuery.toLowerCase();
        return activeQuotes.filter(qt =>
            (qt.quote_number || '').toLowerCase().includes(q) ||
            (qt.customer_name || '').toLowerCase().includes(q)
        );
    }, [activeQuotes, searchQuery]);

    // ---- Seçim toggle ----
    const toggleSale = (id) => {
        setSelectedSaleIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
        setAnalysisRun(false);
    };

    const toggleQuote = (id) => {
        setSelectedQuoteIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
        setAnalysisRun(false);
    };

    const toggleAllSales = () => {
        if (selectedSaleIds.size === filteredSales.length) {
            setSelectedSaleIds(new Set());
        } else {
            setSelectedSaleIds(new Set(filteredSales.map(s => s.id)));
        }
        setAnalysisRun(false);
    };

    const toggleAllQuotes = () => {
        if (selectedQuoteIds.size === filteredQuotes.length) {
            setSelectedQuoteIds(new Set());
        } else {
            setSelectedQuoteIds(new Set(filteredQuotes.map(q => q.id)));
        }
        setAnalysisRun(false);
    };

    const totalSelected = (sourceType !== 'QUOTES' ? selectedSaleIds.size : 0)
        + (sourceType !== 'SALES' ? selectedQuoteIds.size : 0);

    // ---- MRP Hesaplama ----
    const mrpResult = useMemo(() => {
        if (!analysisRun) return [];

        const demand = {}; // productId -> { name, code, needed }

        // Satışlardan talep topla
        if (sourceType !== 'QUOTES') {
            sales.filter(s => selectedSaleIds.has(s.id)).forEach(s => {
                const pid = s.productId;
                if (!pid) return;
                if (!demand[pid]) demand[pid] = { name: s.productName || 'Bilinmeyen', code: s.productCode || '', needed: 0, sources: [] };
                demand[pid].needed += (parseFloat(s.quantity) || 0);
                demand[pid].sources.push({ type: 'sale', label: s.customerName || 'Bilinmeyen', qty: s.quantity });
            });
        }

        // Tekliflerden talep topla
        if (sourceType !== 'SALES') {
            quotations.filter(q => selectedQuoteIds.has(q.id)).forEach(q => {
                (q.items || []).forEach(item => {
                    const pid = item.product_id;
                    if (!pid) return;
                    if (!demand[pid]) demand[pid] = { name: item.product_name || 'Bilinmeyen', code: item.product_code || '', needed: 0, sources: [] };
                    demand[pid].needed += (parseFloat(item.quantity) || 0);
                    demand[pid].sources.push({ type: 'quote', label: q.quote_number || q.customer_name || 'Teklif', qty: item.quantity });
                });
            });
        }

        // Stok ile karşılaştır — normal ürünler
        const normalRows = Object.entries(demand).map(([pid, info]) => {
            const product = (products || []).find(p => p.id === pid || p.id === parseInt(pid));
            const stock = product ? (parseFloat(product.quantity) || 0) : 0;
            const diff = stock - info.needed;
            return {
                productId: pid,
                name: info.name,
                code: info.code,
                needed: info.needed,
                stock,
                diff,
                sources: info.sources || [],
                status: getShortageStatus(diff),
                isBomParent: false,
            };
        });

        // BOM satışlarını ayrıştır
        const bomRows = [];
        if (sourceType !== 'QUOTES') {
            sales.filter(s => selectedSaleIds.has(s.id) && s.is_bom_product && s.bom_id).forEach(s => {
                const bom = (boms || []).find(b => b.id === s.bom_id);
                if (!bom) return;

                const saleQty = parseFloat(s.quantity) || 1;

                // Ana ürün satırı
                const mainProduct = (products || []).find(p =>
                    p.name?.toLowerCase() === bom.product_name?.toLowerCase() ||
                    p.code?.toLowerCase() === bom.product_code?.toLowerCase()
                );
                const mainStock = mainProduct ? (parseFloat(mainProduct.quantity) || 0) : 0;
                const mainDiff = mainStock - saleQty;
                bomRows.push({
                    productId: s.bom_id + '_main',
                    name: bom.product_name,
                    code: bom.bom_number,
                    needed: saleQty,
                    stock: mainStock,
                    diff: mainDiff,
                    sources: [{ type: 'sale', label: s.customerName, qty: saleQty }],
                    status: getShortageStatus(mainDiff),
                    isBomParent: true,
                    bomId: bom.id,
                    bomNumber: bom.bom_number,
                    children: (bom.components || []).map(comp => {
                        const compProduct = (products || []).find(p => p.id === comp.product_id);
                        const compNeeded = (parseFloat(comp.quantity) || 0) * saleQty;
                        const compStock = compProduct ? (parseFloat(compProduct.quantity) || 0) : 0;
                        const compDiff = compStock - compNeeded;
                        return {
                            productId: comp.product_id,
                            name: comp.product_name || compProduct?.name || 'Bilinmeyen',
                            code: compProduct?.code || '',
                            needed: compNeeded,
                            stock: compStock,
                            diff: compDiff,
                            status: getShortageStatus(compDiff),
                            isBomChild: true,
                            unit: comp.unit || '',
                        };
                    }),
                });
            });
        }

        return [...bomRows, ...normalRows].sort((a, b) => {
            // BOM parent’lar önce, sonra eksikler önce
            if (a.isBomParent && !b.isBomParent) return -1;
            if (!a.isBomParent && b.isBomParent) return 1;
            return a.diff - b.diff;
        });
    }, [analysisRun, selectedSaleIds, selectedQuoteIds, sourceType, sales, quotations, products, boms]);

    // ---- Özet istatistikler ----
    const summary = useMemo(() => ({
        total: mrpResult.length,
        shortage: mrpResult.filter(r => r.diff < 0).length,
        ok: mrpResult.filter(r => r.diff >= 0).length,
        totalNeeded: mrpResult.reduce((s, r) => s + r.needed, 0),
    }), [mrpResult]);

    // ---- Analizi Çalıştır ----
    const runAnalysis = () => {
        if (totalSelected === 0) {
            if (isWeb) window.alert('Lütfen en az bir sipariş veya teklif seçiniz.');
            return;
        }
        setAnalysisRun(true);
    };

    const resetAnalysis = () => {
        setAnalysisRun(false);
        setSelectedSaleIds(new Set());
        setSelectedQuoteIds(new Set());
    };

    // ======================================================
    // RENDER
    // ======================================================
    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>

            {/* ---- BAŞLIK ---- */}
            <View style={styles.pageHeader}>
                <View>
                    <Text style={styles.pageTitle}>Malzeme İhtiyaç Analizi</Text>
                    <Text style={styles.pageSubtitle}>
                        Sipariş ve tekliflerinize göre stok ihtiyacını hesaplayın
                    </Text>
                </View>
                {analysisRun && (
                    <TouchableOpacity style={styles.resetBtn} onPress={resetAnalysis}>
                        <Ionicons name="refresh-outline" size={16} color="#64748B" style={{ marginRight: 6 }} />
                        <Text style={styles.resetBtnText}>Sıfırla</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* ---- KAYNAK SEÇİM PANELI (Analiz çalıştırılmadıysa göster) ---- */}
            {!analysisRun && (
                <View style={styles.selectionPanel}>

                    {/* Kaynak Tipi Seçici */}
                    <View style={styles.sourceTypeRow}>
                        <Text style={styles.panelLabel}>KAYNAK TİPİ</Text>
                        <View style={styles.sourceTypeBtns}>
                            {[
                                { val: 'BOTH', label: 'Her İkisi' },
                                { val: 'SALES', label: 'Siparişler' },
                                { val: 'QUOTES', label: 'Teklifler' },
                            ].map(opt => (
                                <TouchableOpacity
                                    key={opt.val}
                                    style={[styles.sourceTypeBtn, sourceType === opt.val && styles.sourceTypeBtnActive]}
                                    onPress={() => { setSourceType(opt.val); setSelectedSaleIds(new Set()); setSelectedQuoteIds(new Set()); }}
                                >
                                    <Text style={[styles.sourceTypeBtnText, sourceType === opt.val && styles.sourceTypeBtnTextActive]}>
                                        {opt.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Arama */}
                    <View style={styles.searchBar}>
                        <Ionicons name="search" size={16} color="#94A3B8" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Sipariş, teklif veya müşteri ara..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholderTextColor="#94A3B8"
                        />
                        {searchQuery !== '' && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Ionicons name="close-circle" size={18} color="#94A3B8" />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Siparişler Listesi */}
                    {sourceType !== 'QUOTES' && (
                        <View style={styles.listSection}>
                            <View style={styles.listSectionHeader}>
                                <View style={styles.listSectionTitleRow}>
                                    <Ionicons name="receipt-outline" size={14} color="#64748B" style={{ marginRight: 6 }} />
                                    <Text style={styles.listSectionTitle}>
                                        AKTİF SİPARİŞLER ({filteredSales.length})
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={toggleAllSales} style={styles.selectAllBtn}>
                                    <Text style={styles.selectAllText}>
                                        {selectedSaleIds.size === filteredSales.length && filteredSales.length > 0
                                            ? 'Tümünü Kaldır'
                                            : 'Tümünü Seç'}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {filteredSales.length === 0 ? (
                                <View style={styles.emptyList}>
                                    <Text style={styles.emptyListText}>Aktif sipariş bulunamadı.</Text>
                                </View>
                            ) : (
                                <View style={styles.checkListWrap}>
                                    {/* Tablo başlığı */}
                                    <View style={styles.checkHeader}>
                                        <View style={{ width: 28 }} />
                                        <Text style={[styles.checkHeaderCell, { flex: 2.5 }]}>ÜRÜN</Text>
                                        <Text style={[styles.checkHeaderCell, { flex: 2 }]}>MÜŞTERİ</Text>
                                        <Text style={[styles.checkHeaderCell, { flex: 0.8, textAlign: 'center' }]}>MİKTAR</Text>
                                        <Text style={[styles.checkHeaderCell, { flex: 1.2, textAlign: 'right' }]}>TARİH</Text>
                                    </View>
                                    {filteredSales.map(s => {
                                        const checked = selectedSaleIds.has(s.id);
                                        return (
                                            <TouchableOpacity
                                                key={s.id}
                                                style={[styles.checkRow, checked && styles.checkRowActive]}
                                                onPress={() => toggleSale(s.id)}
                                            >
                                                <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                                                    {checked && <Ionicons name="checkmark" size={13} color="#fff" />}
                                                </View>
                                                <Text style={[styles.checkCell, { flex: 2.5 }]} numberOfLines={1}>
                                                    {s.productName || '—'}
                                                </Text>
                                                <Text style={[styles.checkCell, { flex: 2, color: '#64748B' }]} numberOfLines={1}>
                                                    {s.customerName || '—'}
                                                </Text>
                                                <Text style={[styles.checkCell, { flex: 0.8, textAlign: 'center', fontWeight: '700' }]}>
                                                    {s.quantity}
                                                </Text>
                                                <Text style={[styles.checkCell, { flex: 1.2, textAlign: 'right', color: '#94A3B8', fontSize: 11 }]}>
                                                    {s.sale_date ? new Date(s.sale_date).toLocaleDateString('tr-TR') : '—'}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            )}
                        </View>
                    )}

                    {/* Teklifler Listesi */}
                    {sourceType !== 'SALES' && (
                        <View style={styles.listSection}>
                            <View style={styles.listSectionHeader}>
                                <View style={styles.listSectionTitleRow}>
                                    <Ionicons name="document-text-outline" size={14} color="#64748B" style={{ marginRight: 6 }} />
                                    <Text style={styles.listSectionTitle}>
                                        AKTİF TEKLİFLER ({filteredQuotes.length})
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={toggleAllQuotes} style={styles.selectAllBtn}>
                                    <Text style={styles.selectAllText}>
                                        {selectedQuoteIds.size === filteredQuotes.length && filteredQuotes.length > 0
                                            ? 'Tümünü Kaldır'
                                            : 'Tümünü Seç'}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {filteredQuotes.length === 0 ? (
                                <View style={styles.emptyList}>
                                    <Text style={styles.emptyListText}>Aktif teklif bulunamadı.</Text>
                                </View>
                            ) : (
                                <View style={styles.checkListWrap}>
                                    <View style={styles.checkHeader}>
                                        <View style={{ width: 28 }} />
                                        <Text style={[styles.checkHeaderCell, { flex: 2 }]}>TEKLİF NO</Text>
                                        <Text style={[styles.checkHeaderCell, { flex: 2.5 }]}>MÜŞTERİ</Text>
                                        <Text style={[styles.checkHeaderCell, { flex: 0.8, textAlign: 'center' }]}>KALEM</Text>
                                        <Text style={[styles.checkHeaderCell, { flex: 1, textAlign: 'center' }]}>DURUM</Text>
                                    </View>
                                    {filteredQuotes.map(q => {
                                        const checked = selectedQuoteIds.has(q.id);
                                        const statusLabel = q.status === 'APPROVED' ? 'Onaylı' : 'Taslak';
                                        return (
                                            <TouchableOpacity
                                                key={q.id}
                                                style={[styles.checkRow, checked && styles.checkRowActive]}
                                                onPress={() => toggleQuote(q.id)}
                                            >
                                                <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                                                    {checked && <Ionicons name="checkmark" size={13} color="#fff" />}
                                                </View>
                                                <Text style={[styles.checkCell, { flex: 2, color: '#1D4ED8', fontWeight: '700', fontSize: 12 }]} numberOfLines={1}>
                                                    {q.quote_number || '—'}
                                                </Text>
                                                <Text style={[styles.checkCell, { flex: 2.5, color: '#64748B' }]} numberOfLines={1}>
                                                    {q.customer_name || '—'}
                                                </Text>
                                                <Text style={[styles.checkCell, { flex: 0.8, textAlign: 'center', fontWeight: '700' }]}>
                                                    {(q.items || []).length}
                                                </Text>
                                                <View style={{ flex: 1, alignItems: 'center' }}>
                                                    <View style={{
                                                        backgroundColor: q.status === 'APPROVED' ? '#EFF6FF' : '#F8FAFC',
                                                        borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3
                                                    }}>
                                                        <Text style={{
                                                            fontSize: 10, fontWeight: '700',
                                                            color: q.status === 'APPROVED' ? '#1D4ED8' : '#64748B'
                                                        }}>{statusLabel}</Text>
                                                    </View>
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            )}
                        </View>
                    )}

                    {/* Analiz Butonu */}
                    <View style={styles.runBtnWrap}>
                        <TouchableOpacity
                            style={[styles.runBtn, totalSelected === 0 && styles.runBtnDisabled]}
                            onPress={runAnalysis}
                            disabled={totalSelected === 0}
                        >
                            <Ionicons name="analytics-outline" size={18} color={totalSelected === 0 ? '#94A3B8' : '#fff'} style={{ marginRight: 8 }} />
                            <Text style={[styles.runBtnText, totalSelected === 0 && styles.runBtnTextDisabled]}>
                                Analizi Çalıştır
                                {totalSelected > 0 ? ` (${totalSelected} seçili)` : ''}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* ---- ANALİZ SONUÇLARI ---- */}
            {analysisRun && (
                <View>
                    {/* Özet Kartlar */}
                    <View style={styles.summaryRow}>
                        <SummaryCard
                            icon="layers-outline"
                            value={summary.total}
                            label="Analiz Edilen Malzeme"
                            iconColor="#475569"
                            iconBg="#F1F5F9"
                        />
                        <SummaryCard
                            icon="alert-circle-outline"
                            value={summary.shortage}
                            label="Eksik Malzeme"
                            iconColor="#DC2626"
                            iconBg="#FEF2F2"
                        />
                        <SummaryCard
                            icon="checkmark-circle-outline"
                            value={summary.ok}
                            label="Stok Yeterli"
                            iconColor="#16A34A"
                            iconBg="#F0FDF4"
                        />
                        <SummaryCard
                            icon="cube-outline"
                            value={summary.totalNeeded.toLocaleString('tr-TR')}
                            label="Toplam Talep (adet)"
                            iconColor="#1D4ED8"
                            iconBg="#EFF6FF"
                        />
                    </View>

                    {/* Analiz Tablosu */}
                    <View style={styles.tableWrap}>
                        {/* Tablo Başlığı */}
                        <View style={styles.tableHeader}>
                            <Text style={[styles.tableHeaderCell, { flex: 2.5 }]}>MALZEME</Text>
                            <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>TALEP</Text>
                            <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>STOK</Text>
                            <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>FARK</Text>
                            <Text style={[styles.tableHeaderCell, { flex: 1.2, textAlign: 'center' }]}>DURUM</Text>
                            <Text style={[styles.tableHeaderCell, { flex: 2.5 }]}>ÖNERİ</Text>
                        </View>

                        {mrpResult.length === 0 ? (
                            <View style={styles.emptyResult}>
                                <Ionicons name="layers-outline" size={48} color="#CBD5E1" />
                                <Text style={styles.emptyResultText}>
                                    Seçilen kaynaklarda ürün bulunamadı.
                                </Text>
                            </View>
                        ) : (
                            mrpResult.map((row, index) => (
                                <View key={row.productId}>
                                    <MrpTableRow row={row} index={index} />
                                    {/* BOM alt bileşenler */}
                                    {row.isBomParent && (row.children || []).map((child, ci) => (
                                        <MrpTableRow key={child.productId + ci} row={child} index={ci} isChild />
                                    ))}
                                </View>
                            ))
                        )}
                    </View>

                    {/* Öneri Özeti (sadece eksik varsa) */}
                    {summary.shortage > 0 && (
                        <View style={styles.recommendationPanel}>
                            <View style={styles.recommendationHeader}>
                                <Ionicons name="bulb-outline" size={18} color="#92400E" style={{ marginRight: 8 }} />
                                <Text style={styles.recommendationTitle}>Öneriler</Text>
                            </View>
                            {mrpResult.filter(r => r.diff < 0).map(r => (
                                <View key={r.productId} style={styles.recommendationRow}>
                                    <Ionicons name="arrow-forward-outline" size={14} color="#92400E" style={{ marginRight: 8, marginTop: 2 }} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.recommendationText}>
                                            <Text style={{ fontWeight: '700' }}>{Math.abs(r.diff).toLocaleString('tr-TR')} adet </Text>
                                            <Text style={{ fontWeight: '700', color: '#0F172A' }}>{r.name}</Text>
                                            {r.code ? <Text style={{ color: '#94A3B8' }}> (#{r.code})</Text> : null}
                                            {r.isBomParent ? ' için üretim gerekiyor.' : ' için tedarik gerekiyor.'}
                                        </Text>
                                        {!r.isBomParent && (r.sources || []).length > 0 && (
                                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                                                {r.sources.map((src, i) => (
                                                    <View key={i} style={[
                                                        styles.sourceChip,
                                                        { backgroundColor: src.type === 'sale' ? '#EFF6FF' : '#F5F3FF' }
                                                    ]}>
                                                        <Text style={[styles.sourceChipText, { color: src.type === 'sale' ? '#1D4ED8' : '#6D28D9' }]}>
                                                            {src.type === 'sale' ? '📦' : '📋'} {src.label} — x{src.qty}
                                                        </Text>
                                                    </View>
                                                ))}
                                            </View>
                                        )}
                                        {/* Hızlı Aksiyon Butonları */}
                                        <View style={styles.quickActionRow}>
                                            {r.isBomParent ? (
                                                <TouchableOpacity
                                                    style={[styles.quickActionBtn, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}
                                                    onPress={async () => {
                                                        const wo = await addWorkOrderFromBom(r.bomId, Math.abs(r.diff));
                                                        if (wo) navigation.navigate('WorkOrderScreen');
                                                    }}
                                                >
                                                    <Ionicons name="construct-outline" size={13} color="#1D4ED8" style={{ marginRight: 4 }} />
                                                    <Text style={[styles.quickActionText, { color: '#1D4ED8' }]}>BOM İş Emri Aç ({Math.abs(r.diff)} adet)</Text>
                                                </TouchableOpacity>
                                            ) : (
                                                <>
                                                    <TouchableOpacity
                                                        style={styles.quickActionBtn}
                                                        onPress={() => navigation.navigate('MainTabs', { screen: 'Satın Alma' })}
                                                    >
                                                        <Ionicons name="cart-outline" size={13} color="#92400E" style={{ marginRight: 4 }} />
                                                        <Text style={styles.quickActionText}>Satın Alma'ya Git</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        style={styles.quickActionBtn}
                                                        onPress={() => navigation.navigate('WorkOrderScreen')}
                                                    >
                                                        <Ionicons name="construct-outline" size={13} color="#92400E" style={{ marginRight: 4 }} />
                                                        <Text style={styles.quickActionText}>İş Emri Aç</Text>
                                                    </TouchableOpacity>
                                                </>
                                            )}
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            )}
        </ScrollView>
    );
}

// ---- Özet Kart Bileşeni ----
function SummaryCard({ icon, value, label, iconColor, iconBg }) {
    return (
        <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: iconBg }]}>
                <Ionicons name={icon} size={22} color={iconColor} />
            </View>
            <View>
                <Text style={styles.summaryValue}>{value}</Text>
                <Text style={styles.summaryLabel}>{label}</Text>
            </View>
        </View>
    );
}

// ---- MRP Tablo Satırı ----
function MrpTableRow({ row, index, isChild }) {
    const { status } = row;
    const isShortage = row.diff < 0;
    const isBomParent = row.isBomParent;
    return (
        <View style={[
            styles.tableRow,
            !isChild && (index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd),
            isShortage && styles.tableRowShortage,
            isBomParent && { borderLeftWidth: 4, borderLeftColor: '#6366F1', backgroundColor: '#F5F3FF' },
            isChild && { backgroundColor: '#FAFAFA', paddingLeft: 28, borderLeftWidth: 2, borderLeftColor: '#C7D2FE' },
        ]}>
            {/* Malzeme */}
            <View style={{ flex: 2.5 }}>
                {isBomParent && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                        <Ionicons name="layers" size={12} color="#6366F1" style={{ marginRight: 4 }} />
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#6366F1' }}>BOM REÇETESİ</Text>
                    </View>
                )}
                {isChild && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                        <Ionicons name="return-down-forward" size={11} color="#94A3B8" style={{ marginRight: 4 }} />
                        <Text style={{ fontSize: 10, color: '#94A3B8' }}>ALT BILEŞEN</Text>
                    </View>
                )}
                <Text style={[styles.tableCellBold, isChild && { color: '#475569', fontWeight: '600' }]} numberOfLines={1}>{row.name}</Text>
                {row.code ? <Text style={styles.tableCellSub}>#{row.code}</Text> : null}
                {row.unit ? <Text style={[styles.tableCellSub, { color: '#94A3B8' }]}>{row.unit}</Text> : null}
            </View>
            {/* Talep */}
            <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', fontWeight: '700' }]}>
                {(row.needed || 0).toLocaleString('tr-TR')}
            </Text>
            {/* Stok */}
            <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>
                {(row.stock || 0).toLocaleString('tr-TR')}
            </Text>
            {/* Fark */}
            <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', fontWeight: '800', color: isShortage ? '#DC2626' : '#16A34A' }]}>
                {isShortage ? '' : '+'}{(row.diff || 0).toLocaleString('tr-TR')}
            </Text>
            {/* Durum */}
            <View style={{ flex: 1.2, alignItems: 'center' }}>
                <View style={[styles.statusPill, { backgroundColor: status.bg, borderColor: status.border }]}>
                    <Text style={[styles.statusPillText, { color: status.color }]}>{status.label}</Text>
                </View>
            </View>
            {/* Öneri */}
            <Text style={[styles.tableCellSub, { flex: 2.5, color: isShortage ? '#92400E' : '#94A3B8' }]} numberOfLines={2}>
                {isShortage
                    ? isBomParent
                        ? `${Math.abs(row.diff).toLocaleString('tr-TR')} adet üretim gerekiyor.`
                        : `${Math.abs(row.diff).toLocaleString('tr-TR')} adet satın alma veya üretim planı önerilir.`
                    : 'Stok yeterli, işlem gerekmez.'}
            </Text>
        </View>
    );
}

// ======================================================
// STYLES
// ======================================================
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },

    // Header
    pageHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 16,
    },
    pageTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#0F172A',
    },
    pageSubtitle: {
        fontSize: 13,
        color: '#64748B',
        marginTop: 2,
    },
    resetBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        ...Platform.select({ web: { cursor: 'pointer' } }),
    },
    resetBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
    },

    // Selection Panel
    selectionPanel: {
        marginHorizontal: 24,
        marginBottom: 16,
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        overflow: 'hidden',
        ...Platform.select({ web: { boxShadow: '0 2px 8px rgba(0,0,0,0.05)' } }),
    },

    // Source Type Selector
    sourceTypeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        gap: 16,
        flexWrap: 'wrap',
    },
    panelLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#94A3B8',
        letterSpacing: 0.5,
    },
    sourceTypeBtns: {
        flexDirection: 'row',
        gap: 8,
    },
    sourceTypeBtn: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 8,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    sourceTypeBtnActive: {
        backgroundColor: '#0F172A',
        borderColor: '#0F172A',
    },
    sourceTypeBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
    },
    sourceTypeBtnTextActive: {
        color: '#fff',
    },

    // Search
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginVertical: 12,
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: '#1E293B',
        outlineStyle: 'none',
    },

    // List sections
    listSection: {
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    listSectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#F8FAFC',
    },
    listSectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    listSectionTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: '#64748B',
        letterSpacing: 0.5,
    },
    selectAllBtn: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    selectAllText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#475569',
    },

    // Check list
    checkListWrap: {
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    checkHeader: {
        flexDirection: 'row',
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: '#F8FAFC',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        alignItems: 'center',
    },
    checkHeaderCell: {
        fontSize: 10,
        fontWeight: '700',
        color: '#94A3B8',
        letterSpacing: 0.4,
        textTransform: 'uppercase',
    },
    checkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F8FAFC',
        gap: 10,
        ...Platform.select({ web: { cursor: 'pointer' } }),
    },
    checkRowActive: {
        backgroundColor: '#F0F9FF',
    },
    checkbox: {
        width: 18,
        height: 18,
        borderRadius: 5,
        borderWidth: 2,
        borderColor: '#CBD5E1',
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxChecked: {
        backgroundColor: '#0F172A',
        borderColor: '#0F172A',
    },
    checkCell: {
        fontSize: 13,
        color: '#0F172A',
    },

    // Empty states
    emptyList: {
        paddingVertical: 20,
        alignItems: 'center',
    },
    emptyListText: {
        fontSize: 13,
        color: '#94A3B8',
    },

    // Run Button
    runBtnWrap: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    runBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0F172A',
        paddingVertical: 14,
        borderRadius: 12,
        ...Platform.select({ web: { cursor: 'pointer' } }),
    },
    runBtnDisabled: {
        backgroundColor: '#F1F5F9',
    },
    runBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#fff',
    },
    runBtnTextDisabled: {
        color: '#94A3B8',
    },

    // Source badge
    sourceBadge: {
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 8,
    },
    sourceBadgeText: {
        fontSize: 10,
        fontWeight: '700',
    },

    // Summary Cards
    summaryRow: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        gap: 12,
        marginBottom: 16,
        flexWrap: 'wrap',
    },
    summaryCard: {
        flex: 1,
        minWidth: 160,
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        ...Platform.select({ web: { boxShadow: '0 1px 4px rgba(0,0,0,0.05)' } }),
    },
    summaryIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    summaryValue: {
        fontSize: 24,
        fontWeight: '800',
        color: '#0F172A',
    },
    summaryLabel: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '500',
        marginTop: 2,
    },

    // Analysis Table
    tableWrap: {
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        overflow: 'hidden',
        marginHorizontal: 24,
        marginBottom: 16,
        ...Platform.select({ web: { boxShadow: '0 2px 8px rgba(0,0,0,0.05)' } }),
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#F8FAFC',
        borderBottomWidth: 2,
        borderBottomColor: '#E2E8F0',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    tableHeaderCell: {
        fontSize: 10,
        fontWeight: '700',
        color: '#64748B',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        alignItems: 'center',
    },
    tableRowEven: { backgroundColor: '#fff' },
    tableRowOdd: { backgroundColor: '#FAFBFC' },
    tableRowShortage: { borderLeftWidth: 3, borderLeftColor: '#DC2626' },
    tableCellBold: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0F172A',
    },
    tableCell: {
        fontSize: 14,
        color: '#334155',
    },
    tableCellSub: {
        fontSize: 11,
        color: '#94A3B8',
        marginTop: 2,
    },
    statusPill: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 20,
        borderWidth: 1,
    },
    statusPillText: {
        fontSize: 10,
        fontWeight: '800',
    },

    // Empty result
    emptyResult: {
        alignItems: 'center',
        paddingVertical: 48,
    },
    emptyResultText: {
        marginTop: 12,
        fontSize: 15,
        color: '#94A3B8',
        textAlign: 'center',
    },

    // Recommendation Panel
    recommendationPanel: {
        marginHorizontal: 24,
        marginBottom: 16,
        backgroundColor: '#FFFBEB',
        borderRadius: 14,
        padding: 16,
        borderWidth: 1,
        borderColor: '#FDE68A',
    },
    recommendationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    recommendationTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#92400E',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    recommendationRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    recommendationText: {
        flex: 1,
        fontSize: 13,
        color: '#78350F',
        lineHeight: 20,
    },
    // Source chips in recommendation
    sourceChip: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        marginRight: 4,
        marginBottom: 2,
    },
    sourceChipText: {
        fontSize: 11,
        fontWeight: '600',
    },
    // Quick action buttons
    quickActionRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 8,
        flexWrap: 'wrap',
    },
    quickActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: '#FEF3C7',
        borderWidth: 1,
        borderColor: '#FDE68A',
        ...Platform.select({ web: { cursor: 'pointer' } }),
    },
    quickActionText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#92400E',
    },
});
