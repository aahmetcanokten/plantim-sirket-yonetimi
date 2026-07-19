import React, { useState, useContext, useMemo, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, Modal, Platform, Alert
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

const PAYMENT_LABELS = { NAKIT: 'Nakit', HAVALE: 'Havale', KART: 'Kart', CEK: 'Çek' };

const CATEGORY_ICONS = {
    SATIN_ALMA: 'cart-outline', MAAS: 'people-outline', KIRA: 'home-outline',
    ELEKTRIK_SU: 'flash-outline', VERGI: 'receipt-outline', SIGORTA: 'shield-outline',
    BAKIM: 'construct-outline', DIGER: 'ellipsis-horizontal-outline',
    SATIS: 'trending-up-outline', HIZMET: 'briefcase-outline',
    KIRA_GELIRI: 'home-outline', DIGER_GELIR: 'add-circle-outline',
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

// ─── Doğru Modal: React Native Modal (hem web hem native için) ───────────────
// Web'de position:fixed veya custom overlay kullanan yapılar 
// overflow:hidden parent içinde kaybolur. 
// React Native'in kendi Modal'ı doğru çalışır.

function TransactionModal({ visible, onClose, onSave, editItem, type }) {
    const isIncome = type === 'INCOME';
    const cats = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    const accentColor = isIncome ? '#10B981' : '#EF4444';

    const makeEmpty = () => ({
        description: '', amount: '', category: cats[0],
        payment_method: 'HAVALE',
        transaction_date: new Date().toISOString().split('T')[0],
        invoice_number: '', is_paid: true, notes: '', due_date: '',
    });

    const [form, setForm] = useState(makeEmpty());
    const [saving, setSaving] = useState(false);

    // Modal her açıldığında formu sıfırla / doldur
    useEffect(() => {
        if (!visible) return;
        setSaving(false);
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
            setForm(makeEmpty());
        }
    }, [visible]); // sadece visible değiştiğinde çalışır

    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const handleSave = async () => {
        if (!form.description.trim()) {
            if (Platform.OS === 'web') { window.alert('Açıklama giriniz.'); } else { Alert.alert('Uyarı', 'Açıklama giriniz.'); }
            return;
        }
        const amtNum = parseFloat(form.amount);
        if (!form.amount || isNaN(amtNum) || amtNum <= 0) {
            if (Platform.OS === 'web') { window.alert('Geçerli bir tutar giriniz.'); } else { Alert.alert('Uyarı', 'Geçerli bir tutar giriniz.'); }
            return;
        }
        setSaving(true);
        try {
            const payload = {
                description: form.description.trim(),
                amount: amtNum,
                category: form.category,
                payment_method: form.payment_method,
                transaction_date: form.transaction_date,
                invoice_number: form.invoice_number.trim(),
                is_paid: form.is_paid,
                notes: form.notes.trim(),
                due_date: form.due_date.trim() || null,
                type: type,
            };
            if (editItem?.id) payload.id = editItem.id;
            await onSave(payload);
            onClose();
        } catch (e) {
            console.error('TransactionModal save error:', e);
            setSaving(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            {/* Backdrop - ayrı bir TouchableOpacity, kutudan önce */}
            <View style={mStyles.overlay}>
                {/* Backdrop tıklaması */}
                <TouchableOpacity
                    style={StyleSheet.absoluteFillObject}
                    activeOpacity={1}
                    onPress={onClose}
                />
                {/* Modal kutusu - backdrop'un ÜSTÜNDE */}
                <View style={mStyles.box}>
                    {/* Header */}
                    <View style={[mStyles.header, { borderTopWidth: 4, borderTopColor: accentColor }]}>
                        <View style={mStyles.headerLeft}>
                            <View style={[mStyles.headerIcon, { backgroundColor: accentColor + '18' }]}>
                                <Ionicons
                                    name={isIncome ? 'trending-up-outline' : 'trending-down-outline'}
                                    size={20} color={accentColor}
                                />
                            </View>
                            <View>
                                <Text style={mStyles.title}>
                                    {editItem ? 'Kaydı Düzenle' : (isIncome ? 'Gelir Ekle' : 'Gider Ekle')}
                                </Text>
                                <Text style={mStyles.subtitle}>
                                    {isIncome ? 'Gelir kaydı oluştur' : 'Gider kaydı oluştur'}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={onClose} style={mStyles.closeBtn}>
                            <Ionicons name="close" size={20} color="#64748B" />
                        </TouchableOpacity>
                    </View>

                    {/* Scroll içerik */}
                    <ScrollView
                        style={mStyles.body}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Açıklama */}
                        <Text style={mStyles.label}>Açıklama <Text style={{ color: accentColor }}>*</Text></Text>
                        <TextInput
                            style={mStyles.input}
                            value={form.description}
                            onChangeText={v => set('description', v)}
                            placeholder="Örn: Kira ödemesi, Müşteri satışı..."
                            placeholderTextColor="#CBD5E1"
                        />

                        {/* Tutar + Tarih */}
                        <View style={mStyles.row2}>
                            <View style={{ flex: 1 }}>
                                <Text style={mStyles.label}>Tutar (₺) <Text style={{ color: accentColor }}>*</Text></Text>
                                <View style={mStyles.amountWrapper}>
                                    <Text style={[mStyles.currencySign, { color: accentColor }]}>₺</Text>
                                    <TextInput
                                        style={[mStyles.input, { flex: 1, fontWeight: '700', fontSize: 16 }]}
                                        value={form.amount}
                                        onChangeText={v => set('amount', v.replace(',', '.'))}
                                        keyboardType="numeric"
                                        placeholder="0.00"
                                        placeholderTextColor="#CBD5E1"
                                    />
                                </View>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={mStyles.label}>İşlem Tarihi</Text>
                                <TextInput
                                    style={mStyles.input}
                                    value={form.transaction_date}
                                    onChangeText={v => set('transaction_date', v)}
                                    placeholder="YYYY-AA-GG"
                                    placeholderTextColor="#CBD5E1"
                                />
                            </View>
                        </View>

                        {/* Kategori */}
                        <Text style={mStyles.label}>Kategori</Text>
                        <View style={mStyles.chipRow}>
                            {cats.map(c => (
                                <TouchableOpacity
                                    key={c}
                                    style={[mStyles.chip, form.category === c && { backgroundColor: accentColor, borderColor: accentColor }]}
                                    onPress={() => set('category', c)}
                                >
                                    <Ionicons
                                        name={CATEGORY_ICONS[c] || 'ellipse-outline'}
                                        size={11}
                                        color={form.category === c ? '#fff' : '#64748B'}
                                    />
                                    <Text style={[mStyles.chipText, form.category === c && { color: '#fff' }]}>
                                        {CATEGORY_LABELS[c]}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Ödeme Yöntemi */}
                        <Text style={mStyles.label}>Ödeme Yöntemi</Text>
                        <View style={mStyles.chipRow}>
                            {PAYMENT_METHODS.map(m => (
                                <TouchableOpacity
                                    key={m}
                                    style={[mStyles.chip, form.payment_method === m && { backgroundColor: '#3B82F6', borderColor: '#3B82F6' }]}
                                    onPress={() => set('payment_method', m)}
                                >
                                    <Text style={[mStyles.chipText, form.payment_method === m && { color: '#fff' }]}>
                                        {PAYMENT_LABELS[m]}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Fatura No + Vade Tarihi */}
                        <View style={mStyles.row2}>
                            <View style={{ flex: 1 }}>
                                <Text style={mStyles.label}>Fatura No</Text>
                                <TextInput
                                    style={mStyles.input}
                                    value={form.invoice_number}
                                    onChangeText={v => set('invoice_number', v)}
                                    placeholder="FAT-2025-001"
                                    placeholderTextColor="#CBD5E1"
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={mStyles.label}>Vade Tarihi</Text>
                                <TextInput
                                    style={mStyles.input}
                                    value={form.due_date}
                                    onChangeText={v => set('due_date', v)}
                                    placeholder="YYYY-AA-GG"
                                    placeholderTextColor="#CBD5E1"
                                />
                            </View>
                        </View>

                        {/* Notlar */}
                        <Text style={mStyles.label}>Notlar</Text>
                        <TextInput
                            style={[mStyles.input, { height: 70, textAlignVertical: 'top', paddingTop: 10 }]}
                            value={form.notes}
                            onChangeText={v => set('notes', v)}
                            placeholder="Ek notlar..."
                            placeholderTextColor="#CBD5E1"
                            multiline
                        />

                        {/* Ödeme Durumu Toggle */}
                        <TouchableOpacity
                            style={[mStyles.toggleRow, { backgroundColor: form.is_paid ? '#F0FDF4' : '#FFF7ED' }]}
                            onPress={() => set('is_paid', !form.is_paid)}
                            activeOpacity={0.8}
                        >
                            <View style={[mStyles.toggleIcon, { backgroundColor: form.is_paid ? '#10B981' : '#F59E0B' }]}>
                                <Ionicons
                                    name={form.is_paid ? 'checkmark-circle' : 'time'}
                                    size={18}
                                    color="#fff"
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[mStyles.toggleTitle, { color: form.is_paid ? '#065F46' : '#92400E' }]}>
                                    {form.is_paid ? 'Ödendi' : 'Bekliyor'}
                                </Text>
                                <Text style={mStyles.toggleSub}>
                                    {form.is_paid ? 'Ödeme tamamlandı olarak işaretli' : 'Henüz ödeme bekleniyor'}
                                </Text>
                            </View>
                            <View style={[mStyles.pill, { backgroundColor: form.is_paid ? '#10B981' : '#F59E0B' }]}>
                                <Text style={mStyles.pillText}>{form.is_paid ? 'Ödendi' : 'Bekliyor'}</Text>
                            </View>
                        </TouchableOpacity>

                        <View style={{ height: 8 }} />
                    </ScrollView>

                    {/* Footer */}
                    <View style={mStyles.footer}>
                        <TouchableOpacity style={mStyles.cancelBtn} onPress={onClose} disabled={saving}>
                            <Text style={mStyles.cancelText}>İptal</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[mStyles.saveBtn, { backgroundColor: accentColor, opacity: saving ? 0.7 : 1 }]}
                            onPress={handleSave}
                            disabled={saving}
                        >
                            <Ionicons name={saving ? 'hourglass-outline' : 'checkmark-circle-outline'} size={17} color="#fff" />
                            <Text style={mStyles.saveText}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const mStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(15,23,42,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    box: {
        width: Platform.OS === 'web' ? 560 : '92%',
        maxWidth: 560,
        backgroundColor: '#fff',
        borderRadius: 20,
        overflow: 'hidden',
        maxHeight: Platform.OS === 'web' ? '88vh' : '92%',
        // Web'de shadow
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        // Native shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 20,
    },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 22, paddingVertical: 18,
        borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    headerIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
    subtitle: { fontSize: 11, color: '#94A3B8', marginTop: 1 },
    closeBtn: { padding: 8, borderRadius: 10, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#F1F5F9' },
    body: { paddingHorizontal: 22, paddingTop: 14 },
    row2: { flexDirection: 'row', gap: 10, marginBottom: 0 },
    label: { fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 6, marginTop: 14, letterSpacing: 0.3, textTransform: 'uppercase' },
    input: {
        borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 10,
        paddingHorizontal: 12, paddingVertical: 9, fontSize: 14,
        backgroundColor: '#FAFAFA', color: '#0F172A',
        outlineStyle: 'none',
    },
    amountWrapper: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    currencySign: { fontSize: 20, fontWeight: '800' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
    chip: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
        backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0',
    },
    chipText: { fontSize: 12, color: '#475569', fontWeight: '600' },
    toggleRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        borderRadius: 14, padding: 14, marginTop: 14,
        borderWidth: 1.5, borderColor: '#E2E8F0',
    },
    toggleIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    toggleTitle: { fontSize: 14, fontWeight: '700' },
    toggleSub: { fontSize: 11, color: '#94A3B8', marginTop: 1 },
    pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    pillText: { fontSize: 11, fontWeight: '700', color: '#fff' },
    footer: {
        flexDirection: 'row', gap: 10, padding: 18,
        borderTopWidth: 1, borderTopColor: '#F1F5F9',
    },
    cancelBtn: {
        flex: 1, paddingVertical: 12, borderRadius: 12,
        backgroundColor: '#F1F5F9', alignItems: 'center',
    },
    cancelText: { fontWeight: '600', color: '#64748B', fontSize: 14 },
    saveBtn: {
        flex: 2, paddingVertical: 12, borderRadius: 12,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    },
    saveText: { fontWeight: '700', color: '#fff', fontSize: 14 },
});

// ─── Küçük Yardımcı Bileşenler ──────────────────────────────────────────────

function KpiCard({ label, value, icon, color, subtitle }) {
    return (
        <View style={[styles.kpiCard, { borderTopColor: color, borderTopWidth: 3 }]}>
            <View style={styles.kpiTop}>
                <View style={[styles.kpiIconBg, { backgroundColor: color + '18' }]}>
                    <Ionicons name={icon} size={20} color={color} />
                </View>
            </View>
            <Text style={[styles.kpiValue, { color }]}>{value}</Text>
            <Text style={styles.kpiLabel}>{label}</Text>
            {subtitle ? <Text style={styles.kpiSubtitle}>{subtitle}</Text> : null}
        </View>
    );
}

function StatusBadge({ paid, dueDate }) {
    const now = new Date();
    const due = dueDate ? new Date(dueDate) : null;
    let label = 'Ödendi', color = '#10B981', bg = '#D1FAE5';
    if (!paid) {
        if (due && due < now) { label = 'Vadesi Geçti'; color = '#EF4444'; bg = '#FEE2E2'; }
        else { label = 'Bekliyor'; color = '#F59E0B'; bg = '#FEF3C7'; }
    }
    return (
        <View style={[styles.badge, { backgroundColor: bg }]}>
            <Text style={[styles.badgeText, { color }]}>{label}</Text>
        </View>
    );
}

function SectionHeader({ title, onAdd, addLabel, addColor }) {
    return (
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {onAdd && (
                <TouchableOpacity
                    style={[styles.addBtn, addColor && { backgroundColor: addColor }]}
                    onPress={onAdd}
                >
                    <Ionicons name="add" size={16} color="#fff" />
                    <Text style={styles.addBtnText}>{addLabel || 'Ekle'}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

function ProgressBar({ pct, color }) {
    return (
        <View style={{ height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden' }}>
            <View style={{ width: `${Math.min(pct, 100)}%`, height: 6, backgroundColor: color, borderRadius: 3 }} />
        </View>
    );
}

function BarChart({ data }) {
    const max = Math.max(...data.map(d => Math.max(d.income, d.expense)), 1);
    return (
        <View style={{ height: 180 }}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
                {data.map((item, i) => (
                    <View key={i} style={{ flex: 1, alignItems: 'center', height: '100%' }}>
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 2, width: '100%' }}>
                            <View style={{ flex: 1, height: `${(item.income / max) * 100}%`, backgroundColor: '#10B981', borderRadius: 4, minHeight: 2 }} />
                            <View style={{ flex: 1, height: `${(item.expense / max) * 100}%`, backgroundColor: '#EF4444', borderRadius: 4, minHeight: 2 }} />
                        </View>
                        <Text style={{ fontSize: 10, color: '#94A3B8', marginTop: 6, textAlign: 'center' }}>{item.label}</Text>
                    </View>
                ))}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981' }} />
                    <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '600' }}>Gelir</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444' }} />
                    <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '600' }}>Gider</Text>
                </View>
            </View>
        </View>
    );
}

// ─── Tablo Satırı Bileşeni (Gelir/Gider) ────────────────────────────────────

function TransactionTableRow({ item, color, onEdit, onDelete, isDerived }) {
    const isIncome = item.type === 'INCOME';
    const sign = isIncome ? '+' : '-';
    const iconBg = isIncome ? '#D1FAE5' : '#FEE2E2';
    const iconColor = isIncome ? '#10B981' : '#EF4444';
    const amountColor = isIncome ? '#10B981' : '#EF4444';

    return (
        <View style={styles.tableRow}>
            {/* İkon + Açıklama */}
            <View style={{ flex: 3, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <View style={[styles.txIcon, { backgroundColor: iconBg, flexShrink: 0 }]}>
                    <Ionicons name={isDerived ? 'cart-outline' : (isIncome ? 'cash-outline' : 'card-outline')} size={14} color={iconColor} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.txDesc} numberOfLines={1}>{item.description}</Text>
                    {isDerived && <Text style={[styles.txMeta, { color: '#3B82F6' }]}>Otomatik</Text>}
                    {item.notes ? <Text style={styles.txMeta} numberOfLines={1}>📝 {item.notes}</Text> : null}
                </View>
            </View>

            {/* Kategori */}
            <View style={{ flex: 1.8, paddingRight: 4 }}>
                <View style={[styles.catBadge, { backgroundColor: isIncome ? '#D1FAE5' : '#FEE2E2', alignSelf: 'flex-start' }]}>
                    <Text style={[styles.catBadgeText, { color: isIncome ? '#059669' : '#DC2626' }]} numberOfLines={1}>
                        {CATEGORY_LABELS[item.category] || item.category || '—'}
                    </Text>
                </View>
            </View>

            {/* Ödeme Yöntemi */}
            <View style={{ flex: 1.3, paddingRight: 4 }}>
                <View style={[styles.catBadge, { backgroundColor: '#EFF6FF', alignSelf: 'flex-start' }]}>
                    <Text style={[styles.catBadgeText, { color: '#2563EB' }]} numberOfLines={1}>
                        {PAYMENT_LABELS[item.payment_method] || item.payment_method || '—'}
                    </Text>
                </View>
            </View>

            {/* Tarih */}
            <View style={{ flex: 1.3 }}>
                <Text style={styles.txMeta}>{fmtDate(item.transaction_date)}</Text>
                {item.due_date && (
                    <Text style={[styles.txMeta, { color: '#F59E0B' }]}>Vade: {fmtDate(item.due_date)}</Text>
                )}
            </View>

            {/* Fatura No */}
            <View style={{ flex: 1.5 }}>
                <Text style={styles.txMeta} numberOfLines={1}>{item.invoice_number || '—'}</Text>
            </View>

            {/* Tutar */}
            <View style={{ flex: 1.5, alignItems: 'flex-end' }}>
                <Text style={[styles.txAmount, { color: amountColor }]}>{sign}{fmtCurrency(item.amount)}</Text>
            </View>

            {/* Durum */}
            <View style={{ flex: 1.2, alignItems: 'center' }}>
                <StatusBadge paid={item.is_paid} dueDate={item.due_date} />
            </View>

            {/* Aksiyon */}
            <View style={{ width: 72, flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
                {!isDerived && (
                    <>
                        <TouchableOpacity
                            onPress={onEdit}
                            style={styles.actionBtn}
                        >
                            <Ionicons name="pencil-outline" size={14} color="#64748B" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={onDelete}
                            style={[styles.actionBtn, { borderColor: '#FEE2E2', backgroundColor: '#FFF5F5' }]}
                        >
                            <Ionicons name="trash-outline" size={14} color="#EF4444" />
                        </TouchableOpacity>
                    </>
                )}
            </View>
        </View>
    );
}

// ─── SEKME 1: GENEL BAKIŞ ────────────────────────────────────────────────────

function OverviewTab({ allTransactions, sales }) {
    const now = new Date();

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

    const barData = useMemo(() => {
        const months = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = d.toLocaleDateString('tr-TR', { month: 'short' });
            const income = allTransactions
                .filter(t => t.type === 'INCOME' && t.is_paid && getMonthKey(t.transaction_date) === key)
                .reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
            const expense = allTransactions
                .filter(t => t.type === 'EXPENSE' && t.is_paid && getMonthKey(t.transaction_date) === key)
                .reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
            months.push({ label, income, expense });
        }
        return months;
    }, [allTransactions]);

    const recent = useMemo(() =>
        [...allTransactions]
            .sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date))
            .slice(0, 10),
        [allTransactions]);

    return (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.groupLabel}>FİNANSAL ÖZET</Text>
            <View style={styles.kpiRow}>
                <KpiCard label="Toplam Gelir" value={fmtCurrency(totalIncome)} icon="trending-up-outline" color="#10B981"
                    subtitle={`${allTransactions.filter(t => t.type === 'INCOME').length} işlem`} />
                <KpiCard label="Toplam Gider" value={fmtCurrency(totalExpense)} icon="trending-down-outline" color="#EF4444"
                    subtitle={`${allTransactions.filter(t => t.type === 'EXPENSE').length} işlem`} />
                <KpiCard label="Net Kâr / Zarar" value={fmtCurrency(netProfit)} icon="stats-chart-outline"
                    color={netProfit >= 0 ? '#3B82F6' : '#F97316'}
                    subtitle={totalIncome > 0 ? `Kâr marjı: %${((netProfit / totalIncome) * 100).toFixed(1)}` : 'Veri yok'} />
                <KpiCard label="Bekleyen Ödemeler" value={fmtCurrency(pending)} icon="time-outline" color="#F59E0B"
                    subtitle="Ödenmemiş kayıtlar" />
            </View>

            <Text style={styles.groupLabel}>SON 6 AYLIK ÖZET</Text>
            <View style={styles.card}>
                <BarChart data={barData} />
            </View>

            <Text style={styles.groupLabel}>SON 10 İŞLEM</Text>
            <View style={styles.card}>
                {recent.length === 0
                    ? <Text style={styles.emptyText}>Henüz işlem kaydı yok.</Text>
                    : recent.map((t, i) => (
                        <View key={t.id || i} style={[styles.recentRow, i === recent.length - 1 && { borderBottomWidth: 0 }]}>
                            <View style={[styles.txIcon, { backgroundColor: t.type === 'INCOME' ? '#D1FAE5' : '#FEE2E2' }]}>
                                <Ionicons
                                    name={t.type === 'INCOME' ? 'arrow-down-outline' : 'arrow-up-outline'}
                                    size={14}
                                    color={t.type === 'INCOME' ? '#10B981' : '#EF4444'}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.txDesc}>{t.description}</Text>
                                <Text style={styles.txMeta}>
                                    {CATEGORY_LABELS[t.category] || t.category} · {PAYMENT_LABELS[t.payment_method] || t.payment_method || ''} · {fmtDate(t.transaction_date)}
                                </Text>
                                {t.invoice_number ? <Text style={styles.txMeta}>Fatura: {t.invoice_number}</Text> : null}
                            </View>
                            <View style={{ alignItems: 'flex-end', gap: 4 }}>
                                <Text style={[styles.txAmount, { color: t.type === 'INCOME' ? '#10B981' : '#EF4444' }]}>
                                    {t.type === 'INCOME' ? '+' : '-'}{fmtCurrency(t.amount)}
                                </Text>
                                <StatusBadge paid={t.is_paid} dueDate={t.due_date} />
                            </View>
                        </View>
                    ))
                }
            </View>
        </ScrollView>
    );
}

// ─── GELİR/GİDER SEKMESİ ORTAK TABLO ────────────────────────────────────────

function TxTableHeader() {
    return (
        <View style={styles.tableHeader}>
            <Text style={[styles.thCell, { flex: 3 }]}>Açıklama / Notlar</Text>
            <Text style={[styles.thCell, { flex: 1.8 }]}>Kategori</Text>
            <Text style={[styles.thCell, { flex: 1.3 }]}>Ödeme Y.</Text>
            <Text style={[styles.thCell, { flex: 1.3 }]}>İşlem T. / Vade</Text>
            <Text style={[styles.thCell, { flex: 1.5 }]}>Fatura No</Text>
            <Text style={[styles.thCell, { flex: 1.5, textAlign: 'right' }]}>Tutar</Text>
            <Text style={[styles.thCell, { flex: 1.2, textAlign: 'center' }]}>Durum</Text>
            <Text style={[styles.thCell, { width: 72, textAlign: 'center' }]}>İşlem</Text>
        </View>
    );
}

// ─── SEKME 2: GELİRLER ───────────────────────────────────────────────────────

function IncomeTab({ transactions, sales, addTransaction, updateTransaction, deleteTransaction, updateSale, updatePurchase }) {
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [search, setSearch] = useState('');
    const [filterCat, setFilterCat] = useState('ALL');

    const allIncomes = useMemo(() =>
        transactions.filter(t => t.type === 'INCOME' && t.is_paid),
        [transactions]);

    const filtered = useMemo(() => allIncomes
        .filter(t => {
            const matchSearch = !search || t.description?.toLowerCase().includes(search.toLowerCase());
            const matchCat = filterCat === 'ALL' || t.category === filterCat;
            return matchSearch && matchCat;
        })
        .sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date)),
        [allIncomes, search, filterCat]);

    const total = useMemo(() =>
        filtered.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0),
        [filtered]);

    const handleSave = async (data) => {
        if (data._isDerived) {
            if (data._sourceType === 'SALE') {
                await updateSale({ id: data.sourceId, is_paid: data.is_paid, payment_method: data.payment_method, payment_date: data.transaction_date });
            } else if (data._sourceType === 'PURCHASE') {
                await updatePurchase({ id: data.sourceId, is_paid: data.is_paid, payment_method: data.payment_method, payment_date: data.transaction_date });
            }
        } else if (data.id) {
            await updateTransaction(data);
        } else {
            await addTransaction(data);
        }
    };

    const handleDelete = (id) => {
        if (Platform.OS === 'web') {
            if (window.confirm('Bu kaydı silmek istiyor musunuz?')) deleteTransaction(id);
        } else {
            Alert.alert('Sil', 'Bu kaydı silmek istiyor musunuz?', [
                { text: 'İptal' },
                { text: 'Sil', style: 'destructive', onPress: () => deleteTransaction(id) }
            ]);
        }
    };

    const isWeb = Platform.OS === 'web';

    return (
        <View style={{ flex: 1 }}>
            <View style={styles.tabPadding}>
                <SectionHeader
                    title={`Gelirler · ${fmtCurrency(total)}`}
                    onAdd={() => { setEditItem(null); setShowModal(true); }}
                    addLabel="+ Gelir Ekle"
                    addColor="#10B981"
                />

                {/* Filtre Bar */}
                <View style={styles.filterBar}>
                    <View style={styles.searchBox}>
                        <Ionicons name="search-outline" size={15} color="#94A3B8" />
                        <TextInput
                            style={styles.searchInput}
                            value={search}
                            onChangeText={setSearch}
                            placeholder="Ara..."
                            placeholderTextColor="#CBD5E1"
                        />
                        {search ? (
                            <TouchableOpacity onPress={() => setSearch('')}>
                                <Ionicons name="close-circle" size={15} color="#94A3B8" />
                            </TouchableOpacity>
                        ) : null}
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {['ALL', ...INCOME_CATEGORIES].map(c => (
                            <TouchableOpacity
                                key={c}
                                style={[styles.filterChip, filterCat === c && { backgroundColor: '#10B981', borderColor: '#10B981' }]}
                                onPress={() => setFilterCat(c)}
                            >
                                <Text style={[styles.filterChipText, filterCat === c && { color: '#fff' }]}>
                                    {c === 'ALL' ? 'Tümü' : CATEGORY_LABELS[c]}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Web Tablo Başlığı */}
                {isWeb && <TxTableHeader />}
            </View>

            {/* Liste - ScrollView kullanıyoruz (FlatList yerine, overflow sorununu önlemek için) */}
            <ScrollView
                style={styles.listScroll}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            >
                {filtered.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="trending-up-outline" size={48} color="#CBD5E1" />
                        <Text style={styles.emptyTitle}>Gelir kaydı bulunamadı</Text>
                        <Text style={styles.emptySubtext}>
                            {search || filterCat !== 'ALL'
                                ? 'Filtreleri değiştirmeyi deneyin.'
                                : '"+ Gelir Ekle" butonunu kullanarak yeni kayıt ekleyin.'}
                        </Text>
                    </View>
                ) : isWeb ? (
                    filtered.map((item) => (
                        <TransactionTableRow
                            key={String(item.id)}
                            item={item}
                            isDerived={item._isDerived}
                            onEdit={() => { setEditItem(item); setShowModal(true); }}
                            onDelete={() => handleDelete(item.id)}
                        />
                    ))
                ) : (
                    filtered.map((item) => (
                        <MobileTransactionRow
                            key={String(item.id)}
                            item={item}
                            isDerived={item._isDerived}
                            onEdit={() => { setEditItem(item); setShowModal(true); }}
                            onDelete={() => handleDelete(item.id)}
                        />
                    ))
                )}
                <View style={{ height: 24 }} />
            </ScrollView>

            <TransactionModal
                visible={showModal}
                onClose={() => setShowModal(false)}
                onSave={handleSave}
                editItem={editItem}
                type="INCOME"
            />
        </View>
    );
}

// ─── Mobil için Satır Bileşeni ───────────────────────────────────────────────

function MobileTransactionRow({ item, isDerived, onEdit, onDelete }) {
    const isIncome = item.type === 'INCOME';
    const sign = isIncome ? '+' : '-';
    const iconBg = isIncome ? '#D1FAE5' : '#FEE2E2';
    const iconColor = isIncome ? '#10B981' : '#EF4444';
    const amountColor = isIncome ? '#10B981' : '#EF4444';

    return (
        <View style={styles.mobileRow}>
            <View style={[styles.txIcon, { backgroundColor: iconBg }]}>
                <Ionicons
                    name={isDerived ? 'cart-outline' : (isIncome ? 'cash-outline' : 'card-outline')}
                    size={16} color={iconColor}
                />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.txDesc}>{item.description}</Text>
                <Text style={styles.txMeta}>
                    {CATEGORY_LABELS[item.category] || item.category}
                    {item.payment_method ? ` · ${PAYMENT_LABELS[item.payment_method] || item.payment_method}` : ''}
                    {' · '}{fmtDate(item.transaction_date)}
                </Text>
                {item.invoice_number ? <Text style={styles.txMeta}>Fatura: {item.invoice_number}</Text> : null}
                {item.due_date ? <Text style={[styles.txMeta, { color: '#F59E0B' }]}>Vade: {fmtDate(item.due_date)}</Text> : null}
                {item.notes ? <Text style={styles.txMeta} numberOfLines={1}>📝 {item.notes}</Text> : null}
                {isDerived && <Text style={[styles.txMeta, { color: '#3B82F6' }]}>Otomatik kayıt</Text>}
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={[styles.txAmount, { color: amountColor }]}>{sign}{fmtCurrency(item.amount)}</Text>
                <StatusBadge paid={item.is_paid} dueDate={item.due_date} />
                {!isDerived && (
                    <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
                        <TouchableOpacity onPress={onEdit} style={styles.actionBtn}>
                            <Ionicons name="pencil-outline" size={14} color="#64748B" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={onDelete} style={[styles.actionBtn, { borderColor: '#FEE2E2', backgroundColor: '#FFF5F5' }]}>
                            <Ionicons name="trash-outline" size={14} color="#EF4444" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
    );
}

// ─── SEKME 3: GİDERLER ───────────────────────────────────────────────────────

function ExpenseTab({ transactions, purchases, addTransaction, updateTransaction, deleteTransaction, updateSale, updatePurchase }) {
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [search, setSearch] = useState('');
    const [filterCat, setFilterCat] = useState('ALL');

    const allExpenses = useMemo(() =>
        transactions.filter(t => t.type === 'EXPENSE' && t.is_paid),
        [transactions]);

    const filtered = useMemo(() => allExpenses
        .filter(t => {
            const matchSearch = !search || t.description?.toLowerCase().includes(search.toLowerCase());
            const matchCat = filterCat === 'ALL' || t.category === filterCat;
            return matchSearch && matchCat;
        })
        .sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date)),
        [allExpenses, search, filterCat]);

    const total = useMemo(() =>
        filtered.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0),
        [filtered]);

    const categoryBreakdown = useMemo(() => {
        const map = {};
        allExpenses.forEach(t => {
            const k = t.category || 'DIGER';
            map[k] = (map[k] || 0) + (parseFloat(t.amount) || 0);
        });
        const totalAll = Object.values(map).reduce((a, b) => a + b, 0);
        return { entries: Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5), total: totalAll };
    }, [allExpenses]);

    const handleSave = async (data) => {
        if (data._isDerived) {
            if (data._sourceType === 'SALE') {
                await updateSale({ id: data.sourceId, is_paid: data.is_paid, payment_method: data.payment_method, payment_date: data.transaction_date });
            } else if (data._sourceType === 'PURCHASE') {
                await updatePurchase({ id: data.sourceId, is_paid: data.is_paid, payment_method: data.payment_method, payment_date: data.transaction_date });
            }
        } else if (data.id) {
            await updateTransaction(data);
        } else {
            await addTransaction(data);
        }
    };

    const handleDelete = (id) => {
        if (Platform.OS === 'web') {
            if (window.confirm('Bu kaydı silmek istiyor musunuz?')) deleteTransaction(id);
        } else {
            Alert.alert('Sil', 'Bu kaydı silmek istiyor musunuz?', [
                { text: 'İptal' },
                { text: 'Sil', style: 'destructive', onPress: () => deleteTransaction(id) }
            ]);
        }
    };

    const isWeb = Platform.OS === 'web';

    return (
        <View style={{ flex: 1 }}>
            <View style={styles.tabPadding}>
                <SectionHeader
                    title={`Giderler · ${fmtCurrency(total)}`}
                    onAdd={() => { setEditItem(null); setShowModal(true); }}
                    addLabel="+ Gider Ekle"
                    addColor="#EF4444"
                />

                {/* Kategori Özet */}
                {categoryBreakdown.entries.length > 0 && (
                    <View style={[styles.card, { marginBottom: 12 }]}>
                        <Text style={[styles.groupLabel, { marginBottom: 10, marginTop: 0 }]}>KATEGORİ DAĞILIMI</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
                            {categoryBreakdown.entries.map(([cat, amt]) => {
                                const pct = categoryBreakdown.total > 0 ? (amt / categoryBreakdown.total) * 100 : 0;
                                return (
                                    <View key={cat} style={{ flex: 1, minWidth: 160 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <Text style={styles.txMeta}>{CATEGORY_LABELS[cat] || cat}</Text>
                                            <Text style={[styles.txMeta, { fontWeight: '700', color: '#EF4444' }]}>{pct.toFixed(0)}%</Text>
                                        </View>
                                        <ProgressBar pct={pct} color="#EF4444" />
                                        <Text style={[styles.txMeta, { textAlign: 'right', marginTop: 2 }]}>{fmtCurrency(amt)}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                )}

                {/* Filtre Bar */}
                <View style={styles.filterBar}>
                    <View style={styles.searchBox}>
                        <Ionicons name="search-outline" size={15} color="#94A3B8" />
                        <TextInput
                            style={styles.searchInput}
                            value={search}
                            onChangeText={setSearch}
                            placeholder="Ara..."
                            placeholderTextColor="#CBD5E1"
                        />
                        {search ? (
                            <TouchableOpacity onPress={() => setSearch('')}>
                                <Ionicons name="close-circle" size={15} color="#94A3B8" />
                            </TouchableOpacity>
                        ) : null}
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {['ALL', ...EXPENSE_CATEGORIES].map(c => (
                            <TouchableOpacity
                                key={c}
                                style={[styles.filterChip, filterCat === c && { backgroundColor: '#EF4444', borderColor: '#EF4444' }]}
                                onPress={() => setFilterCat(c)}
                            >
                                <Text style={[styles.filterChipText, filterCat === c && { color: '#fff' }]}>
                                    {c === 'ALL' ? 'Tümü' : CATEGORY_LABELS[c]}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {isWeb && <TxTableHeader />}
            </View>

            <ScrollView
                style={styles.listScroll}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            >
                {filtered.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="trending-down-outline" size={48} color="#CBD5E1" />
                        <Text style={styles.emptyTitle}>Gider kaydı bulunamadı</Text>
                        <Text style={styles.emptySubtext}>
                            {search || filterCat !== 'ALL'
                                ? 'Filtreleri değiştirmeyi deneyin.'
                                : '"+ Gider Ekle" butonunu kullanarak yeni kayıt ekleyin.'}
                        </Text>
                    </View>
                ) : isWeb ? (
                    filtered.map((item) => (
                        <TransactionTableRow
                            key={String(item.id)}
                            item={item}
                            isDerived={item._isDerived}
                            onEdit={() => { setEditItem(item); setShowModal(true); }}
                            onDelete={() => handleDelete(item.id)}
                        />
                    ))
                ) : (
                    filtered.map((item) => (
                        <MobileTransactionRow
                            key={String(item.id)}
                            item={item}
                            isDerived={item._isDerived}
                            onEdit={() => { setEditItem(item); setShowModal(true); }}
                            onDelete={() => handleDelete(item.id)}
                        />
                    ))
                )}
                <View style={{ height: 24 }} />
            </ScrollView>

            <TransactionModal
                visible={showModal}
                onClose={() => setShowModal(false)}
                onSave={handleSave}
                editItem={editItem}
                type="EXPENSE"
            />
        </View>
    );
}

// ─── SEKME 4: FATURALAR ──────────────────────────────────────────────────────

function InvoicesTab({ transactions, addTransaction, updateTransaction, deleteTransaction, markTransactionPaid }) {
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [modalType, setModalType] = useState('EXPENSE');

    const invoices = useMemo(() =>
        transactions
            .filter(t => t.invoice_number && t.invoice_number.trim() !== '')
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
        if (data._isDerived) {
            if (data._sourceType === 'SALE') {
                await updateSale({ id: data.sourceId, is_paid: data.is_paid, payment_method: data.payment_method, payment_date: data.transaction_date });
            } else if (data._sourceType === 'PURCHASE') {
                await updatePurchase({ id: data.sourceId, is_paid: data.is_paid, payment_method: data.payment_method, payment_date: data.transaction_date });
            }
        } else if (data.id) {
            await updateTransaction(data);
        } else {
            await addTransaction(data);
        }
    };

    const handlePaymentToggle = async (inv) => {
        if (inv.is_paid) return;
        const confirmMsg = `${inv.invoice_number || inv.description} faturasını ödendi olarak işaretlemek istiyor musunuz?`;
        
        const markAsPaid = async () => {
            if (inv._isDerived) {
                if (inv._sourceType === 'SALE') {
                    await updateSale({ id: inv.sourceId, is_paid: true, payment_date: new Date().toISOString() });
                } else if (inv._sourceType === 'PURCHASE') {
                    await updatePurchase({ id: inv.sourceId, is_paid: true, payment_date: new Date().toISOString() });
                }
            } else {
                await markTransactionPaid(inv.id);
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm(confirmMsg)) {
                await markAsPaid();
            }
        } else {
            Alert.alert('Ödendi mi?', confirmMsg, [
                { text: 'İptal' },
                { text: 'Evet', onPress: markAsPaid }
            ]);
        }
    };

    const statuses = [
        { key: 'ALL', label: 'Tümü' },
        { key: 'PAID', label: '✓ Ödendi' },
        { key: 'PENDING', label: '⏳ Bekliyor' },
        { key: 'OVERDUE', label: '⚠ Vadesi Geçti' },
    ];

    const totalPaid = invoices.filter(i => i.is_paid).reduce((s, i) => s + parseFloat(i.amount || 0), 0);
    const totalPending = invoices.filter(i => !i.is_paid).reduce((s, i) => s + parseFloat(i.amount || 0), 0);

    return (
        <View style={{ flex: 1 }}>
            <View style={styles.tabPadding}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Fatura Takibi</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                            style={[styles.addBtn, { backgroundColor: '#10B981' }]}
                            onPress={() => { setEditItem(null); setModalType('INCOME'); setShowModal(true); }}
                        >
                            <Ionicons name="arrow-down" size={14} color="#fff" />
                            <Text style={styles.addBtnText}>Tahsilat</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.addBtn}
                            onPress={() => { setEditItem(null); setModalType('EXPENSE'); setShowModal(true); }}
                        >
                            <Ionicons name="arrow-up" size={14} color="#fff" />
                            <Text style={styles.addBtnText}>Fatura Ekle</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={[styles.kpiRow, { marginBottom: 12 }]}>
                    <View style={[styles.miniCard, { borderTopColor: '#10B981' }]}>
                        <Text style={styles.miniCardLabel}>Tahsil Edilen</Text>
                        <Text style={[styles.miniCardValue, { color: '#10B981' }]}>{fmtCurrency(totalPaid)}</Text>
                    </View>
                    <View style={[styles.miniCard, { borderTopColor: '#F59E0B' }]}>
                        <Text style={styles.miniCardLabel}>Bekleyen</Text>
                        <Text style={[styles.miniCardValue, { color: '#F59E0B' }]}>{fmtCurrency(totalPending)}</Text>
                    </View>
                    <View style={[styles.miniCard, { borderTopColor: '#3B82F6' }]}>
                        <Text style={styles.miniCardLabel}>Toplam Fatura</Text>
                        <Text style={[styles.miniCardValue, { color: '#3B82F6' }]}>{invoices.length}</Text>
                    </View>
                </View>

                <View style={[styles.filterBar, { marginBottom: 12 }]}>
                    {statuses.map(s => (
                        <TouchableOpacity
                            key={s.key}
                            style={[styles.filterChip, filterStatus === s.key && styles.filterChipActive]}
                            onPress={() => setFilterStatus(s.key)}
                        >
                            <Text style={[styles.filterChipText, filterStatus === s.key && { color: '#fff' }]}>
                                {s.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {Platform.OS === 'web' && (
                    <View style={styles.tableHeader}>
                        <Text style={[styles.thCell, { flex: 1.5 }]}>Fatura No</Text>
                        <Text style={[styles.thCell, { flex: 2.5 }]}>Açıklama</Text>
                        <Text style={[styles.thCell, { flex: 1 }]}>Tür</Text>
                        <Text style={[styles.thCell, { flex: 1.3 }]}>Ödeme Y.</Text>
                        <Text style={[styles.thCell, { flex: 1.5 }]}>Tarih / Vade</Text>
                        <Text style={[styles.thCell, { flex: 1.5, textAlign: 'right' }]}>Tutar</Text>
                        <Text style={[styles.thCell, { flex: 1.5, textAlign: 'center' }]}>Durum</Text>
                    </View>
                )}
            </View>

            <ScrollView
                style={styles.listScroll}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            >
                {filtered.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="document-text-outline" size={48} color="#CBD5E1" />
                        <Text style={styles.emptyTitle}>Fatura bulunamadı</Text>
                        <Text style={styles.emptySubtext}>Fatura No girilmiş işlemler burada görünür.</Text>
                    </View>
                ) : filtered.map((item) => (
                    Platform.OS === 'web' ? (
                        <View key={String(item.id)} style={styles.tableRow}>
                            <View style={{ flex: 1.5, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <View style={[styles.txIcon, { backgroundColor: '#EFF6FF', flexShrink: 0 }]}>
                                    <Ionicons name="document-text-outline" size={13} color="#3B82F6" />
                                </View>
                                <Text style={styles.txDesc} numberOfLines={1}>{item.invoice_number}</Text>
                            </View>
                            <Text style={[styles.txMeta, { flex: 2.5 }]} numberOfLines={1}>{item.description}</Text>
                            <View style={{ flex: 1 }}>
                                <View style={[styles.catBadge, { backgroundColor: item.type === 'INCOME' ? '#D1FAE5' : '#FEE2E2', alignSelf: 'flex-start' }]}>
                                    <Text style={[styles.catBadgeText, { color: item.type === 'INCOME' ? '#059669' : '#DC2626' }]}>
                                        {item.type === 'INCOME' ? 'Tahsilat' : 'Borç'}
                                    </Text>
                                </View>
                            </View>
                            <View style={{ flex: 1.3 }}>
                                <View style={[styles.catBadge, { backgroundColor: '#EFF6FF', alignSelf: 'flex-start' }]}>
                                    <Text style={[styles.catBadgeText, { color: '#2563EB' }]}>
                                        {PAYMENT_LABELS[item.payment_method] || item.payment_method || '—'}
                                    </Text>
                                </View>
                            </View>
                            <View style={{ flex: 1.5 }}>
                                <Text style={styles.txMeta}>{fmtDate(item.transaction_date)}</Text>
                                {item.due_date && <Text style={[styles.txMeta, { color: '#F59E0B' }]}>Vade: {fmtDate(item.due_date)}</Text>}
                            </View>
                            <Text style={[styles.txAmount, { color: item.type === 'INCOME' ? '#10B981' : '#EF4444', flex: 1.5, textAlign: 'right' }]}>
                                {item.type === 'INCOME' ? '+' : '-'}{fmtCurrency(item.amount)}
                            </Text>
                            <View style={{ flex: 1.5, alignItems: 'center', gap: 4 }}>
                                <StatusBadge paid={item.is_paid} dueDate={item.due_date} />
                                {!item.is_paid && (
                                    <TouchableOpacity style={styles.payBtn} onPress={() => handlePaymentToggle(item)}>
                                        <Ionicons name="checkmark" size={11} color="#fff" />
                                        <Text style={styles.payBtnText}>Ödendi</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    ) : (
                        <View key={String(item.id)} style={styles.mobileRow}>
                            <View style={[styles.txIcon, { backgroundColor: '#EFF6FF' }]}>
                                <Ionicons name="document-text-outline" size={16} color="#3B82F6" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.txDesc}>{item.invoice_number}</Text>
                                <Text style={styles.txMeta}>{item.description}</Text>
                                <Text style={styles.txMeta}>
                                    {PAYMENT_LABELS[item.payment_method] || item.payment_method || ''}
                                    {' · '}Tarih: {fmtDate(item.transaction_date)}
                                    {item.due_date ? ` · Vade: ${fmtDate(item.due_date)}` : ''}
                                </Text>
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
                    )
                ))}
                <View style={{ height: 24 }} />
            </ScrollView>

            <TransactionModal
                visible={showModal}
                onClose={() => setShowModal(false)}
                onSave={handleSave}
                editItem={editItem}
                type={modalType}
            />
        </View>
    );
}

// ─── SEKME 5: RAPORLAR ───────────────────────────────────────────────────────

function ReportsTab({ allTransactions }) {
    const [period, setPeriod] = useState('this_month');

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
    const profitMargin = totalIncome > 0 ? (net / totalIncome) * 100 : 0;

    const topExpenses = useMemo(() => {
        const map = {};
        filtered.filter(t => t.type === 'EXPENSE').forEach(t => {
            const k = t.category || 'DIGER';
            map[k] = (map[k] || 0) + (parseFloat(t.amount) || 0);
        });
        return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6);
    }, [filtered]);

    const topIncomes = useMemo(() => {
        const map = {};
        filtered.filter(t => t.type === 'INCOME').forEach(t => {
            const k = t.category || 'DIGER_GELIR';
            map[k] = (map[k] || 0) + (parseFloat(t.amount) || 0);
        });
        return Object.entries(map).sort((a, b) => b[1] - a[1]);
    }, [filtered]);

    const periods = [
        { key: 'this_month', label: 'Bu Ay' },
        { key: 'this_quarter', label: 'Bu Çeyrek' },
        { key: 'this_year', label: 'Bu Yıl' },
        { key: 'all', label: 'Tüm Zamanlar' },
    ];

    return (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Finansal Rapor</Text>
                <TouchableOpacity style={styles.printBtn} onPress={() => { if (Platform.OS === 'web') window.print(); }}>
                    <Ionicons name="print-outline" size={15} color="#3B82F6" />
                    <Text style={styles.printBtnText}>Yazdır</Text>
                </TouchableOpacity>
            </View>

            <View style={[styles.filterBar, { marginBottom: 20 }]}>
                {periods.map(p => (
                    <TouchableOpacity
                        key={p.key}
                        style={[styles.filterChip, period === p.key && styles.filterChipActive]}
                        onPress={() => setPeriod(p.key)}
                    >
                        <Text style={[styles.filterChipText, period === p.key && { color: '#fff' }]}>{p.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Net P&L özet kutusu */}
            <View style={[styles.card, { backgroundColor: net >= 0 ? '#F0FDF4' : '#FFF5F5', marginBottom: 16, alignItems: 'center', paddingVertical: 24 }]}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#94A3B8', letterSpacing: 1, marginBottom: 6 }}>NET KÂR / ZARAR</Text>
                <Text style={{ fontSize: 36, fontWeight: '800', color: net >= 0 ? '#10B981' : '#EF4444', letterSpacing: -1 }}>
                    {fmtCurrency(net)}
                </Text>
                {totalIncome > 0 && (
                    <Text style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>Kâr Marjı: %{profitMargin.toFixed(1)}</Text>
                )}
            </View>

            <Text style={styles.groupLabel}>KÂR / ZARAR TABLOSU</Text>
            <View style={styles.card}>
                <View style={styles.reportRow}><Text style={styles.reportLabel}>Toplam Gelir</Text><Text style={[styles.reportValue, { color: '#10B981' }]}>{fmtCurrency(totalIncome)}</Text></View>
                <View style={[styles.reportRow, { borderTopWidth: 1, borderTopColor: '#F1F5F9', marginTop: 4, paddingTop: 4 }]}>
                    <Text style={styles.reportLabel}>Toplam Gider</Text><Text style={[styles.reportValue, { color: '#EF4444' }]}>-{fmtCurrency(totalExpense)}</Text>
                </View>
                <View style={[styles.reportRow, { borderTopWidth: 2, borderTopColor: '#E2E8F0', marginTop: 8, paddingTop: 8 }]}>
                    <Text style={[styles.reportLabel, { fontWeight: '700', color: '#0F172A' }]}>Net Kâr / Zarar</Text>
                    <Text style={[styles.reportValue, { fontWeight: '800', fontSize: 18, color: net >= 0 ? '#10B981' : '#EF4444' }]}>{fmtCurrency(net)}</Text>
                </View>
            </View>

            <View style={{ flexDirection: Platform.OS === 'web' ? 'row' : 'column', gap: 16 }}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.groupLabel}>GELİR DAĞILIMI</Text>
                    <View style={styles.card}>
                        {topIncomes.length === 0
                            ? <Text style={styles.emptyText}>Bu dönemde gelir kaydı yok.</Text>
                            : topIncomes.map(([cat, amt]) => {
                                const pct = totalIncome > 0 ? (amt / totalIncome) * 100 : 0;
                                return (
                                    <View key={cat} style={{ marginBottom: 14 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <Text style={styles.txDesc}>{CATEGORY_LABELS[cat] || cat}</Text>
                                            <Text style={[styles.txMeta, { fontWeight: '700', color: '#10B981' }]}>{pct.toFixed(0)}%</Text>
                                        </View>
                                        <ProgressBar pct={pct} color="#10B981" />
                                        <Text style={[styles.txMeta, { textAlign: 'right', marginTop: 2 }]}>{fmtCurrency(amt)}</Text>
                                    </View>
                                );
                            })
                        }
                    </View>
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.groupLabel}>GİDER DAĞILIMI</Text>
                    <View style={styles.card}>
                        {topExpenses.length === 0
                            ? <Text style={styles.emptyText}>Bu dönemde gider kaydı yok.</Text>
                            : topExpenses.map(([cat, amt], i) => {
                                const pct = totalExpense > 0 ? (amt / totalExpense) * 100 : 0;
                                return (
                                    <View key={cat} style={{ marginBottom: 14 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <Text style={styles.txDesc}>#{i + 1} {CATEGORY_LABELS[cat] || cat}</Text>
                                            <Text style={[styles.txMeta, { fontWeight: '700', color: '#EF4444' }]}>{pct.toFixed(0)}%</Text>
                                        </View>
                                        <ProgressBar pct={pct} color="#EF4444" />
                                        <Text style={[styles.txMeta, { textAlign: 'right', marginTop: 2 }]}>{fmtCurrency(amt)}</Text>
                                    </View>
                                );
                            })
                        }
                    </View>
                </View>
            </View>

            <Text style={styles.groupLabel}>ÖZET İSTATİSTİKLER</Text>
            <View style={styles.card}>
                <View style={styles.reportRow}><Text style={styles.reportLabel}>Toplam İşlem</Text><Text style={styles.reportValue}>{filtered.length}</Text></View>
                <View style={styles.reportRow}><Text style={styles.reportLabel}>Gelir İşlemi</Text><Text style={styles.reportValue}>{filtered.filter(t => t.type === 'INCOME').length}</Text></View>
                <View style={styles.reportRow}><Text style={styles.reportLabel}>Gider İşlemi</Text><Text style={styles.reportValue}>{filtered.filter(t => t.type === 'EXPENSE').length}</Text></View>
                <View style={styles.reportRow}><Text style={styles.reportLabel}>Ödenmemiş</Text><Text style={[styles.reportValue, { color: '#F59E0B' }]}>{filtered.filter(t => !t.is_paid).length}</Text></View>
                <View style={styles.reportRow}>
                    <Text style={styles.reportLabel}>Ort. Gelir / İşlem</Text>
                    <Text style={styles.reportValue}>
                        {fmtCurrency(filtered.filter(t => t.type === 'INCOME').length > 0
                            ? totalIncome / filtered.filter(t => t.type === 'INCOME').length : 0)}
                    </Text>
                </View>
                <View style={styles.reportRow}>
                    <Text style={styles.reportLabel}>Ort. Gider / İşlem</Text>
                    <Text style={styles.reportValue}>
                        {fmtCurrency(filtered.filter(t => t.type === 'EXPENSE').length > 0
                            ? totalExpense / filtered.filter(t => t.type === 'EXPENSE').length : 0)}
                    </Text>
                </View>
            </View>
        </ScrollView>
    );
}

// ─── ANA EKRAN ───────────────────────────────────────────────────────────────

export default function FinanceScreen() {
    const {
        financeTransactions,
        addTransaction, updateTransaction, deleteTransaction, markTransactionPaid,
        sales, purchases, updateSale, updatePurchase
    } = useContext(AppContext);

    const [activeTab, setActiveTab] = useState('overview');

    const salesDerived = useMemo(() => (sales || []).filter(s => s.isShipped).map(s => ({
        id: `sale-${s.id}`, type: 'INCOME', category: 'SATIS',
        description: `Satış: ${s.customerName || s.productName || 'Ürün'}`,
        amount: (s.quantity || 1) * (s.price || s.unit_price || 0),
        transaction_date: s.payment_date || s.dateISO || s.sale_date,
        is_paid: s.is_paid || false,
        payment_method: s.payment_method || null,
        invoice_number: s.invoiceNumber,
        due_date: s.shipmentDate || null,
        _isDerived: true,
        _sourceType: 'SALE',
        sourceId: s.id
    })), [sales]);

    const purchasesDerived = useMemo(() => (purchases || []).filter(p => p.delivered).map(p => ({
        id: `purchase-${p.id}`, type: 'EXPENSE', category: 'SATIN_ALMA',
        description: `Satın Alma: ${p.productName || p.supplier_name || 'Tedarikçi'}`,
        amount: (p.quantity || 1) * (p.cost || p.unit_price || 0),
        transaction_date: p.payment_date || p.delivered_date || p.created_at,
        is_paid: p.is_paid || false,
        payment_method: p.payment_method || null,
        invoice_number: p.invoice_number || null,
        _isDerived: true,
        _sourceType: 'PURCHASE',
        sourceId: p.id
    })), [purchases]);

    const allTransactions = useMemo(() =>
        [...(financeTransactions || []), ...salesDerived, ...purchasesDerived],
        [financeTransactions, salesDerived, purchasesDerived]);

    const renderContent = () => {
        switch (activeTab) {
            case 'overview':
                return <OverviewTab allTransactions={allTransactions} sales={sales || []} purchases={purchases || []} />;
            case 'income':
                return <IncomeTab
                    transactions={allTransactions}
                    sales={sales || []}
                    addTransaction={addTransaction}
                    updateTransaction={updateTransaction}
                    deleteTransaction={deleteTransaction}
                    updateSale={updateSale}
                    updatePurchase={updatePurchase}
                />;
            case 'expense':
                return <ExpenseTab
                    transactions={allTransactions}
                    purchases={purchases || []}
                    addTransaction={addTransaction}
                    updateTransaction={updateTransaction}
                    deleteTransaction={deleteTransaction}
                    updateSale={updateSale}
                    updatePurchase={updatePurchase}
                />;
            case 'invoices':
                return <InvoicesTab
                    transactions={allTransactions}
                    addTransaction={addTransaction}
                    updateTransaction={updateTransaction}
                    deleteTransaction={deleteTransaction}
                    markTransactionPaid={markTransactionPaid}
                    updateSale={updateSale}
                    updatePurchase={updatePurchase}
                />;
            case 'reports':
                return <ReportsTab allTransactions={allTransactions} />;
            default:
                return null;
        }
    };

    return (
        <View style={styles.screen}>
            {/* Sekme Çubuğu */}
            <View style={styles.tabBarContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBar}>
                    {TABS.map(tab => {
                        const active = activeTab === tab.key;
                        return (
                            <TouchableOpacity
                                key={tab.key}
                                style={[styles.tabItem, active && styles.tabItemActive]}
                                onPress={() => setActiveTab(tab.key)}
                            >
                                <Ionicons name={tab.icon} size={16} color={active ? Colors.primary : '#94A3B8'} />
                                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
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
    tabBarContainer: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    tabBar: { flexDirection: 'row', paddingHorizontal: 16 },
    tabItem: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
        paddingHorizontal: 16, marginRight: 4,
        borderBottomWidth: 2, borderBottomColor: 'transparent', gap: 6,
    },
    tabItemActive: { borderBottomColor: Colors.primary },
    tabLabel: { fontSize: 13, fontWeight: '500', color: '#94A3B8' },
    tabLabelActive: { color: Colors.primary, fontWeight: '700' },
    contentArea: { flex: 1 },

    // Sekme içerik alanları
    tabContent: { flex: 1, paddingHorizontal: 24, paddingTop: 20 },
    tabPadding: { paddingHorizontal: 24, paddingTop: 20 },
    listScroll: { flex: 1 },
    listContent: { paddingHorizontal: 24 },

    // Kart
    card: {
        backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 16,
        borderWidth: 1, borderColor: '#F1F5F9',
        boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
    },
    groupLabel: { fontSize: 11, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.8, marginBottom: 10, marginTop: 4 },

    // KPI
    kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
    kpiCard: {
        flex: 1, minWidth: 180, backgroundColor: '#fff', borderRadius: 16, padding: 18,
        borderWidth: 1, borderColor: '#F1F5F9',
        boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
    },
    kpiTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    kpiIconBg: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    kpiLabel: { fontSize: 12, color: '#64748B', fontWeight: '600', marginTop: 4 },
    kpiValue: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
    kpiSubtitle: { fontSize: 11, color: '#94A3B8', marginTop: 4 },

    // Mini Card
    miniCard: {
        flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14,
        borderTopWidth: 3, borderWidth: 1, borderColor: '#F1F5F9',
        boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
    },
    miniCardLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '600', marginBottom: 4 },
    miniCardValue: { fontSize: 18, fontWeight: '800' },

    // Web Tablo
    tableHeader: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#F8FAFC', borderRadius: 10,
        paddingHorizontal: 14, paddingVertical: 10, marginBottom: 4,
        borderWidth: 1, borderColor: '#F1F5F9',
    },
    thCell: { fontSize: 11, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.3 },
    tableRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#fff', borderRadius: 12,
        paddingHorizontal: 14, paddingVertical: 11, marginBottom: 4,
        borderWidth: 1, borderColor: '#F1F5F9',
        boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
    },

    // Mobil Satır
    mobileRow: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 12,
        backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8,
        borderWidth: 1, borderColor: '#F1F5F9',
        boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
    },
    recentRow: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F8FAFC',
    },

    txIcon: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    txDesc: { fontSize: 13, fontWeight: '600', color: '#1E293B', marginBottom: 1 },
    txMeta: { fontSize: 11, color: '#94A3B8' },
    txAmount: { fontSize: 14, fontWeight: '700' },

    catBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
    catBadgeText: { fontSize: 11, fontWeight: '700' },

    rowActions: { flexDirection: 'row', gap: 4 },
    actionBtn: {
        padding: 7, borderRadius: 8,
        backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#F1F5F9',
    },

    // Bölüm başlığı
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
    addBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    },
    addBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
    printBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        borderWidth: 1, borderColor: '#3B82F6', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10,
    },
    printBtnText: { color: '#3B82F6', fontSize: 13, fontWeight: '600' },

    // Filtre
    filterBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
    searchBox: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
        borderWidth: 1.5, borderColor: '#F1F5F9', flex: 1, minWidth: 160,
    },
    searchInput: { flex: 1, fontSize: 13, outlineStyle: 'none', color: '#0F172A' },
    filterChip: {
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
        backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0',
    },
    filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    filterChipText: { fontSize: 12, fontWeight: '600', color: '#64748B' },

    // Badge
    badge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
    badgeText: { fontSize: 11, fontWeight: '700' },

    // Ödeme Butonu
    payBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 3,
        backgroundColor: '#10B981', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
    },
    payBtnText: { color: '#fff', fontSize: 10, fontWeight: '700' },

    // Rapor
    reportRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
    reportLabel: { fontSize: 14, color: '#475569' },
    reportValue: { fontSize: 15, fontWeight: '700', color: '#0F172A' },

    // Boş Durum
    emptyText: { textAlign: 'center', color: '#94A3B8', fontSize: 14, paddingVertical: 24 },
    emptyState: { alignItems: 'center', paddingVertical: 48, gap: 8 },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: '#CBD5E1' },
    emptySubtext: { fontSize: 13, color: '#CBD5E1', textAlign: 'center', maxWidth: 300 },
});
