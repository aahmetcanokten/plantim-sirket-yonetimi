import React, { useState, useContext, useMemo, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, Modal, Platform, FlatList, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../AppContext';
import { Colors } from '../Theme';

// ─── Sabitler ───────────────────────────────────────────────────────────────

const TABS = [
    { key: 'overview', label: 'Genel Bakış', icon: 'grid-outline' },
    { key: 'income', label: 'Gelirler', icon: 'trending-up-outline' },
    { key: 'expense', label: 'Giderler', icon: 'trending-down-outline' },
    { key: 'invoices', label: 'Faturalar', icon: 'document-text-outline' },
    { key: 'reports', label: 'Raporlar', icon: 'bar-chart-outline' },
];

const EXPENSE_CATEGORIES = ['SATIN_ALMA', 'MAAS', 'KIRA', 'ELEKTRIK_SU', 'VERGI', 'SIGORTA', 'BAKIM', 'DIGER'];
const INCOME_CATEGORIES = ['SATIS', 'HIZMET', 'KIRA_GELIRI', 'DIGER_GELIR'];
const PAYMENT_METHODS = ['NAKIT', 'HAVALE', 'KART', 'CEK'];

const CATEGORY_LABELS = {
    SATIN_ALMA: 'Satın Alma', MAAS: 'Maaş', KIRA: 'Kira',
    ELEKTRIK_SU: 'Elektrik / Su', VERGI: 'Vergi', SIGORTA: 'Sigorta',
    BAKIM: 'Bakım', DIGER: 'Diğer', SATIS: 'Satış', HIZMET: 'Hizmet',
    KIRA_GELIRI: 'Kira Geliri', DIGER_GELIR: 'Diğer Gelir',
};

const fmtCurrency = (n) => {
    const num = parseFloat(n) || 0;
    return num.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 });
};

const fmtDate = (d) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('tr-TR'); } catch { return d; }
};

const getMonthKey = (d) => {
    const dt = d ? new Date(d) : new Date();
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
};

// ─── Küçük Yardımcı Bileşenler ──────────────────────────────────────────────

function KpiCard({ label, value, icon, color, subtitle }) {
    return (
        <View style={[styles.kpiCard, { borderLeftColor: color }]}>
            <View style={[styles.kpiIconBg, { backgroundColor: color + '20' }]}>
                <Ionicons name={icon} size={22} color={color} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.kpiLabel}>{label}</Text>
                <Text style={[styles.kpiValue, { color }]}>{value}</Text>
                {subtitle ? <Text style={styles.kpiSubtitle}>{subtitle}</Text> : null}
            </View>
        </View>
    );
}

function SectionHeader({ title, onAdd, addLabel }) {
    return (
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {onAdd && (
                <TouchableOpacity style={styles.addBtn} onPress={onAdd}>
                    <Ionicons name="add" size={16} color="#fff" />
                    <Text style={styles.addBtnText}>{addLabel || 'Ekle'}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

function StatusBadge({ paid, dueDate }) {
    const now = new Date();
    const due = dueDate ? new Date(dueDate) : null;
    let label = 'Ödendi', color = '#10B981';
    if (!paid) {
        if (due && due < now) { label = 'Vadesi Geçti'; color = '#EF4444'; }
        else { label = 'Bekliyor'; color = '#F59E0B'; }
    }
    return (
        <View style={[styles.badge, { backgroundColor: color + '20' }]}>
            <Text style={[styles.badgeText, { color }]}>{label}</Text>
        </View>
    );
}

// ─── Basit Bar Grafik (kütüphane gerektirmez) ────────────────────────────────

function BarChart({ data, maxValue }) {
    const max = maxValue || Math.max(...data.map(d => Math.max(d.income, d.expense)), 1);
    return (
        <View style={styles.chartContainer}>
            {data.map((item, i) => (
                <View key={i} style={styles.chartCol}>
                    <View style={styles.chartBars}>
                        <View style={[styles.chartBar, { height: `${(item.income / max) * 100}%`, backgroundColor: '#10B981' }]} />
                        <View style={[styles.chartBar, { height: `${(item.expense / max) * 100}%`, backgroundColor: '#EF4444' }]} />
                    </View>
                    <Text style={styles.chartLabel}>{item.label}</Text>
                </View>
            ))}
            <View style={styles.chartLegend}>
                <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#10B981' }]} /><Text style={styles.legendText}>Gelir</Text></View>
                <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} /><Text style={styles.legendText}>Gider</Text></View>
            </View>
        </View>
    );
}

// ─── İşlem Ekleme/Düzenleme Modalı ──────────────────────────────────────────

function TransactionModal({ visible, onClose, onSave, editItem, type }) {
    const isIncome = type === 'INCOME';
    const cats = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

    const [form, setForm] = useState({
        description: '', amount: '', category: cats[0],
        payment_method: 'HAVALE', transaction_date: new Date().toISOString().split('T')[0],
        invoice_number: '', is_paid: true, notes: '', due_date: '',
    });

    React.useEffect(() => {
        if (editItem) {
            setForm({
                description: editItem.description || '',
                amount: String(editItem.amount || ''),
                category: editItem.category || cats[0],
                payment_method: editItem.payment_method || 'HAVALE',
                transaction_date: (editItem.transaction_date || new Date().toISOString()).split('T')[0],
                invoice_number: editItem.invoice_number || '',
                is_paid: editItem.is_paid !== false,
                notes: editItem.notes || '',
                due_date: editItem.due_date ? editItem.due_date.split('T')[0] : '',
            });
        } else {
            setForm({
                description: '', amount: '', category: cats[0],
                payment_method: 'HAVALE', transaction_date: new Date().toISOString().split('T')[0],
                invoice_number: '', is_paid: true, notes: '', due_date: '',
            });
        }
    }, [editItem, visible]);

    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const handleSave = () => {
        if (!form.description.trim()) { alert('Açıklama giriniz.'); return; }
        if (!form.amount || parseFloat(form.amount) <= 0) { alert('Geçerli bir tutar giriniz.'); return; }
        onSave({ ...form, type, amount: parseFloat(form.amount), id: editItem?.id });
        onClose();
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalBox}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{editItem ? 'Kaydı Düzenle' : (isIncome ? 'Gelir Ekle' : 'Gider Ekle')}</Text>
                        <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color="#64748B" /></TouchableOpacity>
                    </View>
                    <ScrollView style={{ maxHeight: 480 }}>
                        <Text style={styles.fieldLabel}>Açıklama *</Text>
                        <TextInput style={styles.input} value={form.description} onChangeText={v => set('description', v)} placeholder="Örn: Kira ödemesi..." />

                        <Text style={styles.fieldLabel}>Tutar (₺) *</Text>
                        <TextInput style={styles.input} value={form.amount} onChangeText={v => set('amount', v)} keyboardType="numeric" placeholder="0.00" />

                        <Text style={styles.fieldLabel}>Kategori</Text>
                        <View style={styles.chipRow}>
                            {cats.map(c => (
                                <TouchableOpacity key={c} style={[styles.chip, form.category === c && styles.chipActive]} onPress={() => set('category', c)}>
                                    <Text style={[styles.chipText, form.category === c && styles.chipTextActive]}>{CATEGORY_LABELS[c]}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.fieldLabel}>Ödeme Yöntemi</Text>
                        <View style={styles.chipRow}>
                            {PAYMENT_METHODS.map(m => (
                                <TouchableOpacity key={m} style={[styles.chip, form.payment_method === m && styles.chipActive]} onPress={() => set('payment_method', m)}>
                                    <Text style={[styles.chipText, form.payment_method === m && styles.chipTextActive]}>{m}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.fieldLabel}>İşlem Tarihi</Text>
                        <TextInput style={styles.input} value={form.transaction_date} onChangeText={v => set('transaction_date', v)} placeholder="YYYY-AA-GG" />

                        <Text style={styles.fieldLabel}>Fatura No (opsiyonel)</Text>
                        <TextInput style={styles.input} value={form.invoice_number} onChangeText={v => set('invoice_number', v)} placeholder="FAT-2025-001" />

                        <Text style={styles.fieldLabel}>Vade Tarihi (opsiyonel)</Text>
                        <TextInput style={styles.input} value={form.due_date} onChangeText={v => set('due_date', v)} placeholder="YYYY-AA-GG" />

                        <Text style={styles.fieldLabel}>Notlar</Text>
                        <TextInput style={[styles.input, { height: 70 }]} value={form.notes} onChangeText={v => set('notes', v)} placeholder="Ek notlar..." multiline />

                        <View style={styles.switchRow}>
                            <Text style={styles.fieldLabel}>Ödeme durumu: </Text>
                            <TouchableOpacity onPress={() => set('is_paid', !form.is_paid)} style={[styles.toggleBtn, { backgroundColor: form.is_paid ? '#10B981' : '#94A3B8' }]}>
                                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>{form.is_paid ? 'Ödendi' : 'Bekliyor'}</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                    <View style={styles.modalFooter}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}><Text style={styles.cancelBtnText}>İptal</Text></TouchableOpacity>
                        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: isIncome ? '#10B981' : '#EF4444' }]} onPress={handleSave}>
                            <Text style={styles.saveBtnText}>Kaydet</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ─── SEKME 1: GENEL BAKIŞ ────────────────────────────────────────────────────

function OverviewTab({ allTransactions, sales, purchases }) {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const totalIncome = useMemo(() =>
        allTransactions.filter(t => t.type === 'INCOME' && t.is_paid).reduce((s, t) => s + (parseFloat(t.amount) || 0), 0),
        [allTransactions]);

    const totalExpense = useMemo(() =>
        allTransactions.filter(t => t.type === 'EXPENSE' && t.is_paid).reduce((s, t) => s + (parseFloat(t.amount) || 0), 0),
        [allTransactions]);

    const netProfit = totalIncome - totalExpense;

    const pending = useMemo(() =>
        allTransactions.filter(t => !t.is_paid).reduce((s, t) => s + (parseFloat(t.amount) || 0), 0),
        [allTransactions]);

    // Son 6 ay bar grafik verisi
    const barData = useMemo(() => {
        const months = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = d.toLocaleDateString('tr-TR', { month: 'short' });
            const income = allTransactions.filter(t => t.type === 'INCOME' && t.is_paid && getMonthKey(t.transaction_date) === key)
                .reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
            const expense = allTransactions.filter(t => t.type === 'EXPENSE' && t.is_paid && getMonthKey(t.transaction_date) === key)
                .reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
            months.push({ label, income, expense });
        }
        return months;
    }, [allTransactions]);

    const recent = useMemo(() =>
        [...allTransactions].sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date)).slice(0, 8),
        [allTransactions]);

    return (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
            {/* KPI Kartlar */}
            <Text style={styles.groupLabel}>FİNANSAL ÖZET</Text>
            <View style={styles.kpiRow}>
                <KpiCard label="Toplam Gelir" value={fmtCurrency(totalIncome)} icon="trending-up-outline" color="#10B981" />
                <KpiCard label="Toplam Gider" value={fmtCurrency(totalExpense)} icon="trending-down-outline" color="#EF4444" />
                <KpiCard label="Net Kâr" value={fmtCurrency(netProfit)} icon="stats-chart-outline" color={netProfit >= 0 ? '#3B82F6' : '#F97316'} />
                <KpiCard label="Bekleyen Ödemeler" value={fmtCurrency(pending)} icon="time-outline" color="#F59E0B" subtitle="Ödenmemiş kayıtlar" />
            </View>

            {/* Grafik */}
            <Text style={styles.groupLabel}>SON 6 AYLIK ÖZET</Text>
            <View style={styles.card}>
                <BarChart data={barData} />
            </View>

            {/* Son İşlemler */}
            <Text style={styles.groupLabel}>SON İŞLEMLER</Text>
            <View style={styles.card}>
                {recent.length === 0
                    ? <Text style={styles.emptyText}>Henüz işlem kaydı yok.</Text>
                    : recent.map(t => (
                        <View key={t.id} style={styles.recentRow}>
                            <View style={[styles.txIcon, { backgroundColor: t.type === 'INCOME' ? '#10B98120' : '#EF444420' }]}>
                                <Ionicons name={t.type === 'INCOME' ? 'arrow-down-outline' : 'arrow-up-outline'} size={14} color={t.type === 'INCOME' ? '#10B981' : '#EF4444'} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.txDesc}>{t.description}</Text>
                                <Text style={styles.txMeta}>{CATEGORY_LABELS[t.category] || t.category} · {fmtDate(t.transaction_date)}</Text>
                            </View>
                            <Text style={[styles.txAmount, { color: t.type === 'INCOME' ? '#10B981' : '#EF4444' }]}>
                                {t.type === 'INCOME' ? '+' : '-'}{fmtCurrency(t.amount)}
                            </Text>
                        </View>
                    ))
                }
            </View>
        </ScrollView>
    );
}

// ─── SEKME 2: GELİRLER ───────────────────────────────────────────────────────

function IncomeTab({ transactions, sales, addTransaction, updateTransaction, deleteTransaction }) {
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [search, setSearch] = useState('');
    const [filterCat, setFilterCat] = useState('ALL');

    // Satışlardan türetilmiş gelirler (kayıtlı olmayanlar gösterilir, bilgi amaçlı)
    const salesDerived = useMemo(() => sales.filter(s => s.isShipped).map(s => ({
        id: `sale-${s.id}`, type: 'INCOME', category: 'SATIS',
        description: `Satış: ${s.customerName || s.productName || 'Ürün'}`,
        amount: (s.quantity || 1) * (s.price || s.unit_price || 0),
        transaction_date: s.dateISO || s.sale_date,
        is_paid: true, _isDerived: true,
    })), [sales]);

    const manualIncomes = transactions.filter(t => t.type === 'INCOME');
    const allIncomes = [...manualIncomes, ...salesDerived];

    const filtered = useMemo(() => allIncomes.filter(t => {
        const matchSearch = !search || t.description?.toLowerCase().includes(search.toLowerCase());
        const matchCat = filterCat === 'ALL' || t.category === filterCat;
        return matchSearch && matchCat;
    }), [allIncomes, search, filterCat]);

    const total = useMemo(() => filtered.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0), [filtered]);

    const handleSave = async (data) => {
        if (data.id) await updateTransaction(data);
        else await addTransaction(data);
    };

    const handleDelete = (id) => {
        if (Platform.OS === 'web') {
            if (window.confirm('Bu kaydı silmek istiyor musunuz?')) deleteTransaction(id);
        } else {
            Alert.alert('Sil', 'Bu kaydı silmek istiyor musunuz?', [
                { text: 'İptal' }, { text: 'Sil', style: 'destructive', onPress: () => deleteTransaction(id) }
            ]);
        }
    };

    return (
        <View style={styles.tabContent}>
            <SectionHeader title={`Toplam: ${fmtCurrency(total)}`} onAdd={() => { setEditItem(null); setShowModal(true); }} addLabel="Gelir Ekle" />
            <View style={styles.filterBar}>
                <View style={styles.searchBox}>
                    <Ionicons name="search-outline" size={16} color="#94A3B8" />
                    <TextInput style={styles.searchInput} value={search} onChangeText={setSearch} placeholder="Ara..." />
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
                    {['ALL', ...INCOME_CATEGORIES].map(c => (
                        <TouchableOpacity key={c} style={[styles.filterChip, filterCat === c && styles.filterChipActive]} onPress={() => setFilterCat(c)}>
                            <Text style={[styles.filterChipText, filterCat === c && styles.filterChipTextActive]}>{c === 'ALL' ? 'Tümü' : CATEGORY_LABELS[c]}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
            <FlatList
                data={filtered}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                    <View style={styles.listRow}>
                        <View style={[styles.txIcon, { backgroundColor: '#10B98120' }]}>
                            <Ionicons name={item._isDerived ? 'cart-outline' : 'cash-outline'} size={16} color="#10B981" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.txDesc}>{item.description}</Text>
                            <Text style={styles.txMeta}>{CATEGORY_LABELS[item.category] || item.category} · {fmtDate(item.transaction_date)}</Text>
                            {item._isDerived && <Text style={[styles.txMeta, { color: '#3B82F6' }]}>Satıştan otomatik</Text>}
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={[styles.txAmount, { color: '#10B981' }]}>+{fmtCurrency(item.amount)}</Text>
                            <StatusBadge paid={item.is_paid} dueDate={item.due_date} />
                        </View>
                        {!item._isDerived && (
                            <View style={styles.rowActions}>
                                <TouchableOpacity onPress={() => { setEditItem(item); setShowModal(true); }} style={styles.actionBtn}>
                                    <Ionicons name="pencil-outline" size={15} color="#64748B" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionBtn}>
                                    <Ionicons name="trash-outline" size={15} color="#EF4444" />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}
                ListEmptyComponent={<Text style={styles.emptyText}>Gelir kaydı bulunamadı.</Text>}
                showsVerticalScrollIndicator={false}
            />
            <TransactionModal visible={showModal} onClose={() => setShowModal(false)} onSave={handleSave} editItem={editItem} type="INCOME" />
        </View>
    );
}

// ─── SEKME 3: GİDERLER ───────────────────────────────────────────────────────

function ExpenseTab({ transactions, purchases, addTransaction, updateTransaction, deleteTransaction }) {
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [search, setSearch] = useState('');
    const [filterCat, setFilterCat] = useState('ALL');

    const purchasesDerived = useMemo(() => purchases.filter(p => p.delivered).map(p => ({
        id: `purchase-${p.id}`, type: 'EXPENSE', category: 'SATIN_ALMA',
        description: `Satın Alma: ${p.productName || p.supplier_name || 'Tedarikçi'}`,
        amount: (p.quantity || 1) * (p.cost || p.unit_price || 0),
        transaction_date: p.delivered_date || p.created_at,
        is_paid: true, _isDerived: true,
    })), [purchases]);

    const manualExpenses = transactions.filter(t => t.type === 'EXPENSE');
    const allExpenses = [...manualExpenses, ...purchasesDerived];

    const filtered = useMemo(() => allExpenses.filter(t => {
        const matchSearch = !search || t.description?.toLowerCase().includes(search.toLowerCase());
        const matchCat = filterCat === 'ALL' || t.category === filterCat;
        return matchSearch && matchCat;
    }), [allExpenses, search, filterCat]);

    const total = useMemo(() => filtered.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0), [filtered]);

    // Kategori dağılımı
    const categoryBreakdown = useMemo(() => {
        const map = {};
        filtered.forEach(t => {
            const k = t.category || 'DIGER';
            map[k] = (map[k] || 0) + (parseFloat(t.amount) || 0);
        });
        return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
    }, [filtered]);

    const handleSave = async (data) => {
        if (data.id) await updateTransaction(data);
        else await addTransaction(data);
    };

    const handleDelete = (id) => {
        if (Platform.OS === 'web') {
            if (window.confirm('Bu kaydı silmek istiyor musunuz?')) deleteTransaction(id);
        } else {
            Alert.alert('Sil', 'Bu kaydı silmek istiyor musunuz?', [
                { text: 'İptal' }, { text: 'Sil', style: 'destructive', onPress: () => deleteTransaction(id) }
            ]);
        }
    };

    return (
        <View style={styles.tabContent}>
            <SectionHeader title={`Toplam: ${fmtCurrency(total)}`} onAdd={() => { setEditItem(null); setShowModal(true); }} addLabel="Gider Ekle" />
            {/* Kategori Özet */}
            {categoryBreakdown.length > 0 && (
                <View style={[styles.card, { marginBottom: 12 }]}>
                    <Text style={[styles.groupLabel, { marginBottom: 8 }]}>KATEGORİ DAĞILIMI</Text>
                    {categoryBreakdown.map(([cat, amt]) => {
                        const pct = total > 0 ? (amt / total) * 100 : 0;
                        return (
                            <View key={cat} style={{ marginBottom: 8 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                                    <Text style={styles.txMeta}>{CATEGORY_LABELS[cat] || cat}</Text>
                                    <Text style={styles.txMeta}>{fmtCurrency(amt)} ({pct.toFixed(0)}%)</Text>
                                </View>
                                <View style={{ height: 4, backgroundColor: '#F1F5F9', borderRadius: 2 }}>
                                    <View style={{ width: `${pct}%`, height: 4, backgroundColor: '#EF4444', borderRadius: 2 }} />
                                </View>
                            </View>
                        );
                    })}
                </View>
            )}
            <View style={styles.filterBar}>
                <View style={styles.searchBox}>
                    <Ionicons name="search-outline" size={16} color="#94A3B8" />
                    <TextInput style={styles.searchInput} value={search} onChangeText={setSearch} placeholder="Ara..." />
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
                    {['ALL', ...EXPENSE_CATEGORIES].map(c => (
                        <TouchableOpacity key={c} style={[styles.filterChip, filterCat === c && styles.filterChipActive]} onPress={() => setFilterCat(c)}>
                            <Text style={[styles.filterChipText, filterCat === c && styles.filterChipTextActive]}>{c === 'ALL' ? 'Tümü' : CATEGORY_LABELS[c]}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
            <FlatList
                data={filtered}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                    <View style={styles.listRow}>
                        <View style={[styles.txIcon, { backgroundColor: '#EF444420' }]}>
                            <Ionicons name={item._isDerived ? 'cart-outline' : 'card-outline'} size={16} color="#EF4444" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.txDesc}>{item.description}</Text>
                            <Text style={styles.txMeta}>{CATEGORY_LABELS[item.category] || item.category} · {fmtDate(item.transaction_date)}</Text>
                            {item._isDerived && <Text style={[styles.txMeta, { color: '#3B82F6' }]}>Satın almadan otomatik</Text>}
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={[styles.txAmount, { color: '#EF4444' }]}>-{fmtCurrency(item.amount)}</Text>
                            <StatusBadge paid={item.is_paid} dueDate={item.due_date} />
                        </View>
                        {!item._isDerived && (
                            <View style={styles.rowActions}>
                                <TouchableOpacity onPress={() => { setEditItem(item); setShowModal(true); }} style={styles.actionBtn}>
                                    <Ionicons name="pencil-outline" size={15} color="#64748B" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionBtn}>
                                    <Ionicons name="trash-outline" size={15} color="#EF4444" />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}
                ListEmptyComponent={<Text style={styles.emptyText}>Gider kaydı bulunamadı.</Text>}
                showsVerticalScrollIndicator={false}
            />
            <TransactionModal visible={showModal} onClose={() => setShowModal(false)} onSave={handleSave} editItem={editItem} type="EXPENSE" />
        </View>
    );
}

// ─── SEKME 4: FATURALAR ──────────────────────────────────────────────────────

function InvoicesTab({ transactions, addTransaction, updateTransaction, deleteTransaction, markTransactionPaid }) {
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [filterStatus, setFilterStatus] = useState('ALL'); // ALL | PAID | PENDING | OVERDUE

    const invoices = useMemo(() =>
        transactions.filter(t => t.invoice_number && t.invoice_number.trim() !== '')
            .sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date)),
        [transactions]);

    const now = new Date();
    const filtered = useMemo(() => invoices.filter(inv => {
        if (filterStatus === 'ALL') return true;
        if (filterStatus === 'PAID') return inv.is_paid;
        const due = inv.due_date ? new Date(inv.due_date) : null;
        if (filterStatus === 'OVERDUE') return !inv.is_paid && due && due < now;
        if (filterStatus === 'PENDING') return !inv.is_paid && (!due || due >= now);
        return true;
    }), [invoices, filterStatus]);

    const handleSave = async (data) => {
        if (data.id) await updateTransaction(data);
        else await addTransaction(data);
    };

    const handlePaymentToggle = async (inv) => {
        if (inv.is_paid) return;
        if (Platform.OS === 'web') {
            if (window.confirm(`${inv.invoice_number} faturasını ödendi olarak işaretlemek istiyor musunuz?`)) {
                await markTransactionPaid(inv.id);
            }
        } else {
            Alert.alert('Ödendi mi?', `${inv.invoice_number} faturasını ödendi olarak işaretlemek istiyor musunuz?`, [
                { text: 'İptal' },
                { text: 'Evet', onPress: () => markTransactionPaid(inv.id) }
            ]);
        }
    };

    const statuses = [
        { key: 'ALL', label: 'Tümü' },
        { key: 'PAID', label: 'Ödendi' },
        { key: 'PENDING', label: 'Bekliyor' },
        { key: 'OVERDUE', label: 'Vadesi Geçti' },
    ];

    return (
        <View style={styles.tabContent}>
            <SectionHeader title="Fatura Takibi" onAdd={() => { setEditItem(null); setShowModal(true); }} addLabel="Fatura Ekle" />
            <View style={styles.filterBar}>
                {statuses.map(s => (
                    <TouchableOpacity key={s.key} style={[styles.filterChip, filterStatus === s.key && styles.filterChipActive]} onPress={() => setFilterStatus(s.key)}>
                        <Text style={[styles.filterChipText, filterStatus === s.key && styles.filterChipTextActive]}>{s.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>
            <FlatList
                data={filtered}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                    <View style={styles.listRow}>
                        <View style={[styles.txIcon, { backgroundColor: '#3B82F620' }]}>
                            <Ionicons name="document-text-outline" size={16} color="#3B82F6" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.txDesc}>{item.invoice_number}</Text>
                            <Text style={styles.txMeta}>{item.description}</Text>
                            <Text style={styles.txMeta}>Tarih: {fmtDate(item.transaction_date)}{item.due_date ? ` · Vade: ${fmtDate(item.due_date)}` : ''}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end', gap: 6 }}>
                            <Text style={[styles.txAmount, { color: item.type === 'INCOME' ? '#10B981' : '#EF4444' }]}>
                                {item.type === 'INCOME' ? '+' : '-'}{fmtCurrency(item.amount)}
                            </Text>
                            <StatusBadge paid={item.is_paid} dueDate={item.due_date} />
                            {!item.is_paid && (
                                <TouchableOpacity style={styles.payBtn} onPress={() => handlePaymentToggle(item)}>
                                    <Ionicons name="checkmark-circle-outline" size={13} color="#fff" />
                                    <Text style={styles.payBtnText}>Ödendi</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                )}
                ListEmptyComponent={<Text style={styles.emptyText}>Bu filtrede fatura kaydı bulunamadı.</Text>}
                showsVerticalScrollIndicator={false}
            />
            <TransactionModal visible={showModal} onClose={() => setShowModal(false)} onSave={handleSave} editItem={editItem} type="EXPENSE" />
        </View>
    );
}

// ─── SEKME 5: RAPORLAR ───────────────────────────────────────────────────────

function ReportsTab({ allTransactions, sales, purchases }) {
    const [period, setPeriod] = useState('this_month'); // this_month | this_quarter | this_year | all

    const filtered = useMemo(() => {
        const now = new Date();
        return allTransactions.filter(t => {
            const d = new Date(t.transaction_date);
            if (period === 'this_month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            if (period === 'this_quarter') {
                const q = Math.floor(now.getMonth() / 3);
                return Math.floor(d.getMonth() / 3) === q && d.getFullYear() === now.getFullYear();
            }
            if (period === 'this_year') return d.getFullYear() === now.getFullYear();
            return true;
        });
    }, [allTransactions, period]);

    const totalIncome = filtered.filter(t => t.type === 'INCOME' && t.is_paid).reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
    const totalExpense = filtered.filter(t => t.type === 'EXPENSE' && t.is_paid).reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
    const net = totalIncome - totalExpense;

    const topExpenses = useMemo(() => {
        const map = {};
        filtered.filter(t => t.type === 'EXPENSE').forEach(t => {
            const k = t.category || 'DIGER';
            map[k] = (map[k] || 0) + (parseFloat(t.amount) || 0);
        });
        return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
    }, [filtered]);

    const periods = [
        { key: 'this_month', label: 'Bu Ay' },
        { key: 'this_quarter', label: 'Bu Çeyrek' },
        { key: 'this_year', label: 'Bu Yıl' },
        { key: 'all', label: 'Tümü' },
    ];

    const handlePrint = () => {
        if (Platform.OS === 'web') window.print();
    };

    return (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Finansal Rapor</Text>
                <TouchableOpacity style={styles.printBtn} onPress={handlePrint}>
                    <Ionicons name="print-outline" size={15} color="#3B82F6" />
                    <Text style={styles.printBtnText}>Yazdır</Text>
                </TouchableOpacity>
            </View>

            {/* Dönem Seçici */}
            <View style={[styles.filterBar, { marginBottom: 16 }]}>
                {periods.map(p => (
                    <TouchableOpacity key={p.key} style={[styles.filterChip, period === p.key && styles.filterChipActive]} onPress={() => setPeriod(p.key)}>
                        <Text style={[styles.filterChipText, period === p.key && styles.filterChipTextActive]}>{p.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Kâr / Zarar Tablosu */}
            <Text style={styles.groupLabel}>KÂR / ZARAR TABLOSU</Text>
            <View style={styles.card}>
                <View style={styles.reportRow}><Text style={styles.reportLabel}>Toplam Gelir</Text><Text style={[styles.reportValue, { color: '#10B981' }]}>{fmtCurrency(totalIncome)}</Text></View>
                <View style={[styles.reportRow, { borderTopWidth: 1, borderTopColor: '#F1F5F9', marginTop: 4, paddingTop: 4 }]}>
                    <Text style={styles.reportLabel}>Toplam Gider</Text><Text style={[styles.reportValue, { color: '#EF4444' }]}>-{fmtCurrency(totalExpense)}</Text>
                </View>
                <View style={[styles.reportRow, { borderTopWidth: 2, borderTopColor: '#0F172A', marginTop: 8, paddingTop: 8 }]}>
                    <Text style={[styles.reportLabel, { fontWeight: '700', color: '#0F172A' }]}>Net Kâr / Zarar</Text>
                    <Text style={[styles.reportValue, { fontWeight: '800', fontSize: 18, color: net >= 0 ? '#10B981' : '#EF4444' }]}>{fmtCurrency(net)}</Text>
                </View>
                {totalIncome > 0 && (
                    <Text style={[styles.txMeta, { textAlign: 'right', marginTop: 4 }]}>
                        Kâr Marjı: %{((net / totalIncome) * 100).toFixed(1)}
                    </Text>
                )}
            </View>

            {/* Top Gider Kategorileri */}
            <Text style={styles.groupLabel}>EN YÜKSEK GİDER KATEGORİLERİ</Text>
            <View style={styles.card}>
                {topExpenses.length === 0
                    ? <Text style={styles.emptyText}>Bu dönemde gider kaydı yok.</Text>
                    : topExpenses.map(([cat, amt], i) => {
                        const pct = totalExpense > 0 ? (amt / totalExpense) * 100 : 0;
                        return (
                            <View key={cat} style={{ marginBottom: 12 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <Text style={styles.txDesc}>#{i + 1} {CATEGORY_LABELS[cat] || cat}</Text>
                                    <Text style={styles.txDesc}>{fmtCurrency(amt)}</Text>
                                </View>
                                <View style={{ height: 6, backgroundColor: '#F1F5F9', borderRadius: 3 }}>
                                    <View style={{ width: `${pct}%`, height: 6, backgroundColor: '#EF4444', borderRadius: 3 }} />
                                </View>
                                <Text style={[styles.txMeta, { textAlign: 'right' }]}>{pct.toFixed(1)}%</Text>
                            </View>
                        );
                    })
                }
            </View>

            {/* İstatistik Özeti */}
            <Text style={styles.groupLabel}>ÖZET İSTATİSTİKLER</Text>
            <View style={styles.card}>
                <View style={styles.reportRow}><Text style={styles.reportLabel}>Toplam İşlem Sayısı</Text><Text style={styles.reportValue}>{filtered.length}</Text></View>
                <View style={styles.reportRow}><Text style={styles.reportLabel}>Gelir İşlemi</Text><Text style={styles.reportValue}>{filtered.filter(t => t.type === 'INCOME').length}</Text></View>
                <View style={styles.reportRow}><Text style={styles.reportLabel}>Gider İşlemi</Text><Text style={styles.reportValue}>{filtered.filter(t => t.type === 'EXPENSE').length}</Text></View>
                <View style={styles.reportRow}><Text style={styles.reportLabel}>Ödenmemiş</Text><Text style={[styles.reportValue, { color: '#F59E0B' }]}>{filtered.filter(t => !t.is_paid).length}</Text></View>
                <View style={styles.reportRow}>
                    <Text style={styles.reportLabel}>Ort. Gelir / İşlem</Text>
                    <Text style={styles.reportValue}>{fmtCurrency(filtered.filter(t => t.type === 'INCOME').length > 0 ? totalIncome / filtered.filter(t => t.type === 'INCOME').length : 0)}</Text>
                </View>
            </View>
        </ScrollView>
    );
}

// ─── ANA EKRAN ───────────────────────────────────────────────────────────────

export default function FinanceScreen() {
    const {
        financeTransactions, addTransaction, updateTransaction, deleteTransaction, markTransactionPaid,
        budgets, addBudget, updateBudget, deleteBudget,
        sales, purchases,
    } = useContext(AppContext);

    const [activeTab, setActiveTab] = useState('overview');

    // Satışlardan gelirler ve satın almalardan giderler override olmaksızın allTransactions olarak birleştir
    const salesDerived = useMemo(() => (sales || []).filter(s => s.isShipped).map(s => ({
        id: `sale-${s.id}`, type: 'INCOME', category: 'SATIS',
        description: `Satış: ${s.customerName || s.productName || 'Ürün'}`,
        amount: (s.quantity || 1) * (s.price || s.unit_price || 0),
        transaction_date: s.dateISO || s.sale_date,
        is_paid: true,
    })), [sales]);

    const purchasesDerived = useMemo(() => (purchases || []).filter(p => p.delivered).map(p => ({
        id: `purchase-${p.id}`, type: 'EXPENSE', category: 'SATIN_ALMA',
        description: `Satın Alma: ${p.productName || p.supplier_name || 'Tedarikçi'}`,
        amount: (p.quantity || 1) * (p.cost || p.unit_price || 0),
        transaction_date: p.delivered_date || p.created_at,
        is_paid: true,
    })), [purchases]);

    const allTransactions = useMemo(() =>
        [...(financeTransactions || []), ...salesDerived, ...purchasesDerived],
        [financeTransactions, salesDerived, purchasesDerived]);

    const renderContent = () => {
        switch (activeTab) {
            case 'overview':
                return <OverviewTab allTransactions={allTransactions} sales={sales || []} purchases={purchases || []} />;
            case 'income':
                return <IncomeTab transactions={financeTransactions || []} sales={sales || []} addTransaction={addTransaction} updateTransaction={updateTransaction} deleteTransaction={deleteTransaction} />;
            case 'expense':
                return <ExpenseTab transactions={financeTransactions || []} purchases={purchases || []} addTransaction={addTransaction} updateTransaction={updateTransaction} deleteTransaction={deleteTransaction} />;
            case 'invoices':
                return <InvoicesTab transactions={financeTransactions || []} addTransaction={addTransaction} updateTransaction={updateTransaction} deleteTransaction={deleteTransaction} markTransactionPaid={markTransactionPaid} />;
            case 'reports':
                return <ReportsTab allTransactions={allTransactions} sales={sales || []} purchases={purchases || []} />;
            default:
                return null;
        }
    };

    return (
        <View style={styles.screen}>
            {/* Sekme Çubuğu */}
            <View style={styles.tabBar}>
                {TABS.map(tab => {
                    const active = activeTab === tab.key;
                    return (
                        <TouchableOpacity key={tab.key} style={[styles.tabItem, active && styles.tabItemActive]} onPress={() => setActiveTab(tab.key)}>
                            <Ionicons name={tab.icon} size={16} color={active ? Colors.primary : '#94A3B8'} />
                            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* İçerik */}
            <View style={styles.contentArea}>
                {renderContent()}
            </View>
        </View>
    );
}

// ─── STİLLER ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#F8FAFC' },
    tabBar: {
        flexDirection: 'row', backgroundColor: '#FFFFFF',
        borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
        paddingHorizontal: 16,
    },
    tabItem: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
        paddingHorizontal: 16, marginRight: 4, borderBottomWidth: 2,
        borderBottomColor: 'transparent', gap: 6,
    },
    tabItemActive: { borderBottomColor: Colors.primary },
    tabLabel: { fontSize: 13, fontWeight: '500', color: '#94A3B8' },
    tabLabelActive: { color: Colors.primary, fontWeight: '700' },
    contentArea: { flex: 1 },
    tabContent: { flex: 1, paddingHorizontal: 24, paddingTop: 20 },

    // KPI
    kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
    kpiCard: {
        flex: 1, minWidth: 200, flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: '#fff', borderRadius: 14, padding: 16,
        borderLeftWidth: 4, boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
    },
    kpiIconBg: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    kpiLabel: { fontSize: 12, color: '#64748B', fontWeight: '600', marginBottom: 2 },
    kpiValue: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
    kpiSubtitle: { fontSize: 11, color: '#94A3B8', marginTop: 2 },

    // Kart
    card: {
        backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 16,
        boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
    },
    groupLabel: { fontSize: 11, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.8, marginBottom: 10, marginTop: 4 },

    // Liste satırı
    listRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8,
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    },
    recentRow: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
    },
    txIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    txDesc: { fontSize: 14, fontWeight: '600', color: '#1E293B', marginBottom: 2 },
    txMeta: { fontSize: 12, color: '#94A3B8' },
    txAmount: { fontSize: 14, fontWeight: '700' },
    rowActions: { flexDirection: 'row', gap: 4 },
    actionBtn: { padding: 8, borderRadius: 8, backgroundColor: '#F8FAFC' },

    // Bölüm başlığı
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
    addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
    addBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
    printBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#3B82F6', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
    printBtnText: { color: '#3B82F6', fontSize: 13, fontWeight: '600' },

    // Filtre çubuğu
    filterBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
    searchBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: '#F1F5F9', flex: 1, minWidth: 150 },
    searchInput: { flex: 1, fontSize: 13, outline: 'none' },
    filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#F1F5F9' },
    filterChipActive: { backgroundColor: Colors.primary },
    filterChipText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
    filterChipTextActive: { color: '#fff' },

    // Badge
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    badgeText: { fontSize: 11, fontWeight: '600' },

    // Ödeme butonu
    payBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#10B981', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 7 },
    payBtnText: { color: '#fff', fontSize: 11, fontWeight: '600' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
    modalBox: { width: '90%', maxWidth: 500, backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    modalTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A' },
    modalFooter: { flexDirection: 'row', gap: 10, padding: 20, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
    cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center' },
    cancelBtnText: { fontWeight: '600', color: '#64748B' },
    saveBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
    saveBtnText: { fontWeight: '700', color: '#fff', fontSize: 15 },
    fieldLabel: { fontSize: 12, fontWeight: '600', color: '#64748B', marginBottom: 4, marginTop: 12, paddingHorizontal: 20 },
    input: { marginHorizontal: 20, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, backgroundColor: '#FAFAFA', outlineStyle: 'none' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 20, marginBottom: 4 },
    chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#F1F5F9' },
    chipActive: { backgroundColor: Colors.primary + '20', borderWidth: 1, borderColor: Colors.primary },
    chipText: { fontSize: 12, color: '#64748B', fontWeight: '500' },
    chipTextActive: { color: Colors.primary, fontWeight: '700' },
    switchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginTop: 16, marginBottom: 4 },
    toggleBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },

    // Rapor
    reportRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
    reportLabel: { fontSize: 14, color: '#475569' },
    reportValue: { fontSize: 16, fontWeight: '700', color: '#0F172A' },

    // Grafik
    chartContainer: { height: 160, flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingTop: 12, paddingBottom: 28 },
    chartCol: { flex: 1, alignItems: 'center', height: '100%' },
    chartBars: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 2, width: '100%' },
    chartBar: { flex: 1, minHeight: 2, borderRadius: 3 },
    chartLabel: { fontSize: 9, color: '#94A3B8', marginTop: 4, textAlign: 'center' },
    chartLegend: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 16 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: 11, color: '#64748B' },

    // Boş
    emptyText: { textAlign: 'center', color: '#94A3B8', fontSize: 14, paddingVertical: 32 },
});
