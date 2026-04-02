import React, { useContext, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { AppContext } from '../AppContext';
import { Colors } from '../Theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import WebContainer from '../components/WebContainer';

// ─── Renk Paleti ────────────────────────────────────────────
const PALETTE = {
    blue: '#2563EB',
    blueLight: '#EFF6FF',
    green: '#10B981',
    greenLight: '#ECFDF5',
    amber: '#F59E0B',
    amberLight: '#FFFBEB',
    red: '#EF4444',
    redLight: '#FEF2F2',
    purple: '#8B5CF6',
    purpleLight: '#F5F3FF',
    cyan: '#06B6D4',
    cyanLight: '#ECFEFF',
    slate: '#64748B',
    slateLight: '#F8FAFC',
    border: '#E2E8F0',
    cardBg: '#FFFFFF',
    pageBg: '#F8FAFC',
    text: '#0F172A',
    textMuted: '#64748B',
};

// ─── Yardımcı: Para formatı ─────────────────────────────────
const fmt = (num) =>
    num?.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) ?? '0';

// ─── SVG Çubuk Grafik ────────────────────────────────────────
function BarChart({ data, color = PALETTE.blue, height = 120 }) {
    if (!data || data.length === 0) return null;
    const maxVal = Math.max(...data.map((d) => d.value), 1);
    const barWidth = 100 / data.length;

    return (
        <View style={{ height: height + 28, marginTop: 8 }}>
            {/* SVG benzeri görünüm - View tabanlı */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', height, gap: 4 }}>
                {data.map((d, i) => {
                    const barH = Math.max((d.value / maxVal) * height, 2);
                    return (
                        <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                            <Text style={{ fontSize: 9, color: PALETTE.textMuted, marginBottom: 2, fontWeight: '600' }}>
                                {d.value > 0 ? (d.value >= 1000 ? `${Math.round(d.value / 1000)}K` : d.value) : ''}
                            </Text>
                            <View
                                style={{
                                    width: '70%',
                                    height: barH,
                                    backgroundColor: color,
                                    borderRadius: 4,
                                    opacity: 0.85 + (i / data.length) * 0.15,
                                }}
                            />
                        </View>
                    );
                })}
            </View>
            {/* X Ekseni Etiketleri */}
            <View style={{ flexDirection: 'row', marginTop: 6 }}>
                {data.map((d, i) => (
                    <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={{ fontSize: 9, color: PALETTE.textMuted, fontWeight: '600' }}>
                            {d.label}
                        </Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

// ─── Donut / Pasta Grafik ────────────────────────────────────
function DonutChart({ segments, size = 80, strokeWidth = 14 }) {
    if (!segments || segments.length === 0) return null;
    const total = segments.reduce((s, seg) => s + seg.value, 0);
    if (total === 0) return null;

    const r = (size - strokeWidth) / 2;
    const cx = size / 2;
    const cy = size / 2;
    const circumference = 2 * Math.PI * r;

    let offset = 0;
    const arcs = segments.map((seg) => {
        const pct = seg.value / total;
        const dash = pct * circumference;
        const arcOffset = offset;
        offset += dash;
        return { ...seg, dash, arcOffset };
    });

    if (Platform.OS !== 'web') {
        // Mobilde basit renk blokları göster
        return (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, width: size }}>
                {arcs.map((arc, i) => (
                    <View
                        key={i}
                        style={{
                            width: (size * arc.value) / total,
                            height: strokeWidth,
                            backgroundColor: arc.color,
                            borderRadius: 4,
                        }}
                    />
                ))}
            </View>
        );
    }

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={PALETTE.border} strokeWidth={strokeWidth} />
            {arcs.map((arc, i) => (
                <circle
                    key={i}
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill="none"
                    stroke={arc.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${arc.dash} ${circumference - arc.dash}`}
                    strokeDashoffset={-arc.arcOffset + circumference / 4}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 0.5s' }}
                />
            ))}
        </svg>
    );
}

// ─── KPI Kartı ───────────────────────────────────────────────
function KpiCard({ icon, title, value, sub, color, bgColor }) {
    return (
        <View style={[styles.kpiCard, { borderTopColor: color }]}>
            <View style={[styles.kpiIconWrap, { backgroundColor: bgColor }]}>
                <Ionicons name={icon} size={20} color={color} />
            </View>
            <Text style={styles.kpiTitle}>{title}</Text>
            <Text style={[styles.kpiValue, { color }]}>{value}</Text>
            {sub ? <Text style={styles.kpiSub}>{sub}</Text> : null}
        </View>
    );
}

// ─── Bölüm Başlığı ───────────────────────────────────────────
function SectionHeader({ icon, title, color, onPress, actionLabel }) {
    return (
        <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name={icon} size={18} color={color} />
                <Text style={styles.sectionTitle}>{title}</Text>
            </View>
            {onPress && (
                <TouchableOpacity onPress={onPress}>
                    <Text style={[styles.sectionAction, { color }]}>{actionLabel ?? 'Tümünü Gör →'}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

// ─── Uyarı Satırı ────────────────────────────────────────────
function AlertRow({ icon, iconColor, title, sub, badge, badgeColor }) {
    return (
        <View style={styles.alertRow}>
            <View style={[styles.alertIcon, { backgroundColor: iconColor + '18' }]}>
                <Ionicons name={icon} size={15} color={iconColor} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.alertTitle} numberOfLines={1}>{title}</Text>
                {sub ? <Text style={styles.alertSub}>{sub}</Text> : null}
            </View>
            {badge ? (
                <View style={[styles.badge, { backgroundColor: badgeColor ?? PALETTE.red }]}>
                    <Text style={styles.badgeText}>{badge}</Text>
                </View>
            ) : null}
        </View>
    );
}

// ─── Ana Bileşen ─────────────────────────────────────────────
export default function DashboardScreen() {
    const {
        sales = [],
        purchases = [],
        workOrders = [],
        maintenanceRequests = [],
        personnel = [],
        products = [],
        quotations = [],
        company = {},
    } = useContext(AppContext);

    const navigation = useNavigation();
    const today = new Date();
    const isMobileWeb = Platform.OS === 'web' && window.innerWidth <= 1024;

    // ── KPI Hesaplamaları ─────────────────────────────────────
    const kpis = useMemo(() => {
        const totalRevenue = sales
            .filter((s) => s.isShipped)
            .reduce((acc, s) => acc + (s.price ?? 0) * (s.quantity ?? 1), 0);

        const totalCost = purchases
            .filter((p) => p.delivered)
            .reduce((acc, p) => acc + (p.cost ?? 0) * (p.quantity ?? 1), 0);

        const pendingSaleCount = sales.filter((s) => !s.isShipped).length;
        const openWorkOrders = workOrders.filter((w) => w.status === 'OPEN').length;
        const pendingPurchases = purchases.filter((p) => !p.delivered).length;
        const openMaintenance = maintenanceRequests.filter(
            (m) => m.status !== 'CLOSED' && m.status !== 'COMPLETED'
        ).length;

        return {
            totalRevenue,
            totalCost,
            pendingSaleCount,
            openWorkOrders,
            pendingPurchases,
            openMaintenance,
        };
    }, [sales, purchases, workOrders, maintenanceRequests]);

    // ── Son 6 Ay Satış Grafiği ────────────────────────────────
    const monthlyChart = useMemo(() => {
        const months = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            months.push({
                label: d.toLocaleDateString('tr-TR', { month: 'short' }),
                year: d.getFullYear(),
                month: d.getMonth(),
                value: 0,
            });
        }
        sales
            .filter((s) => s.isShipped)
            .forEach((s) => {
                const d = new Date(s.dateISO || s.sale_date);
                const idx = months.findIndex(
                    (m) => m.year === d.getFullYear() && m.month === d.getMonth()
                );
                if (idx !== -1) {
                    months[idx].value += (s.price ?? 0) * (s.quantity ?? 1);
                }
            });
        return months;
    }, [sales]);

    // ── Son 6 Ay Gider Grafiği ────────────────────────────────
    const monthlyCostChart = useMemo(() => {
        const months = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            months.push({
                label: d.toLocaleDateString('tr-TR', { month: 'short' }),
                year: d.getFullYear(),
                month: d.getMonth(),
                value: 0,
            });
        }
        purchases
            .filter((p) => p.delivered)
            .forEach((p) => {
                const d = new Date(p.delivered_date || p.created_at);
                const idx = months.findIndex(
                    (m) => m.year === d.getFullYear() && m.month === d.getMonth()
                );
                if (idx !== -1) {
                    months[idx].value += (p.cost ?? 0) * (p.quantity ?? 1);
                }
            });
        return months;
    }, [purchases]);

    // ── Geciken Siparişler ────────────────────────────────────
    const overdueSales = useMemo(
        () =>
            sales
                .filter((s) => {
                    if (s.isShipped) return false;
                    if (!s.shipmentDate) return false;
                    return new Date(s.shipmentDate) < today;
                })
                .slice(0, 8),
        [sales]
    );

    // ── Bekleyen Satın Almalar ────────────────────────────────
    const pendingPurchaseList = useMemo(
        () => purchases.filter((p) => !p.delivered).slice(0, 8),
        [purchases]
    );

    // ── İş Emirleri Özeti ─────────────────────────────────────
    const woStats = useMemo(() => {
        const open = workOrders.filter((w) => w.status === 'OPEN').length;
        const closed = workOrders.filter((w) => w.status === 'CLOSED').length;
        const total = workOrders.length;
        return { open, closed, total };
    }, [workOrders]);

    // ── Bakım Özeti ───────────────────────────────────────────
    const maintStats = useMemo(() => {
        const open = maintenanceRequests.filter(
            (m) => m.status !== 'CLOSED' && m.status !== 'COMPLETED'
        );
        return { open: open.slice(0, 5), total: open.length };
    }, [maintenanceRequests]);

    // ── Stok Uyarıları ────────────────────────────────────────
    const stockAlerts = useMemo(
        () =>
            products
                .filter((p) => p.min_stock != null && (p.quantity ?? 0) <= p.min_stock)
                .slice(0, 5),
        [products]
    );

    // ── Personel Özeti ────────────────────────────────────────
    const personnelStats = useMemo(() => {
        const active = personnel.filter((p) => p.status !== 'INACTIVE').length;
        const totalTasks = personnel.reduce(
            (acc, p) => acc + ((p.tasks && Array.isArray(p.tasks) ? p.tasks.length : 0)),
            0
        );
        return { total: personnel.length, active, totalTasks };
    }, [personnel]);

    // ── Teklif Özeti ─────────────────────────────────────────
    const quotationStats = useMemo(() => {
        const pending = quotations.filter((q) => q.status !== 'ACCEPTED' && q.status !== 'REJECTED').length;
        return { pending, total: quotations.length };
    }, [quotations]);

    return (
        <ScrollView
            style={styles.page}
            contentContainerStyle={styles.pageContent}
            showsVerticalScrollIndicator={false}
        >
            {/* ── Hoşgeldiniz Başlığı ─── */}
            <View style={styles.welcomeBar}>
                <View>
                    <Text style={styles.welcomeTitle}>
                        Hoşgeldiniz 👋
                    </Text>
                    <Text style={styles.welcomeSub}>
                        {company.name || 'Şirket Özeti'} — {today.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </Text>
                </View>
                <View style={styles.welcomeBadge}>
                    <Ionicons name="business-outline" size={16} color={PALETTE.blue} />
                    <Text style={styles.welcomeBadgeText}>Genel Bakış</Text>
                </View>
            </View>

            {/* ── KPI Kartları ─── */}
            <View style={[styles.kpiGrid, isMobileWeb && { flexDirection: 'column' }]}>
                <KpiCard
                    icon="cash-outline"
                    title="Toplam Gelir"
                    value={`₺${fmt(kpis.totalRevenue)}`}
                    sub={`${sales.filter((s) => s.isShipped).length} tahsilat`}
                    color={PALETTE.green}
                    bgColor={PALETTE.greenLight}
                />
                <KpiCard
                    icon="card-outline"
                    title="Toplam Gider"
                    value={`₺${fmt(kpis.totalCost)}`}
                    sub={`${purchases.filter((p) => p.delivered).length} alım`}
                    color={PALETTE.red}
                    bgColor={PALETTE.redLight}
                />
                <KpiCard
                    icon="cart-outline"
                    title="Bekleyen Sipariş"
                    value={kpis.pendingSaleCount}
                    sub="teslim bekleniyor"
                    color={PALETTE.blue}
                    bgColor={PALETTE.blueLight}
                />
                <KpiCard
                    icon="construct-outline"
                    title="Açık İş Emri"
                    value={kpis.openWorkOrders}
                    sub="üretimde"
                    color={PALETTE.purple}
                    bgColor={PALETTE.purpleLight}
                />
                <KpiCard
                    icon="cube-outline"
                    title="Bekleyen Satın Alma"
                    value={kpis.pendingPurchases}
                    sub="teslim alınmadı"
                    color={PALETTE.amber}
                    bgColor={PALETTE.amberLight}
                />
                <KpiCard
                    icon="build-outline"
                    title="Açık Bakım"
                    value={kpis.openMaintenance}
                    sub="bakım talebi"
                    color={PALETTE.cyan}
                    bgColor={PALETTE.cyanLight}
                />
            </View>

            {/* ── Grafik Satırı ─── */}
            <View style={[styles.chartRow, isMobileWeb && { flexDirection: 'column' }]}>
                {/* Satış Grafiği */}
                <View style={styles.chartCard}>
                    <SectionHeader
                        icon="trending-up-outline"
                        title="Son 6 Ay — Gelir"
                        color={PALETTE.green}
                    />
                    <BarChart data={monthlyChart} color={PALETTE.green} height={110} />
                </View>

                {/* Gider Grafiği */}
                <View style={styles.chartCard}>
                    <SectionHeader
                        icon="trending-down-outline"
                        title="Son 6 Ay — Gider"
                        color={PALETTE.red}
                    />
                    <BarChart data={monthlyCostChart} color={PALETTE.red} height={110} />
                </View>

                {/* İş Emri Özet Donut */}
                <View style={[styles.chartCard, isMobileWeb ? { flex: 1 } : { flex: 0.7 }]}>
                    <SectionHeader
                        icon="pie-chart-outline"
                        title="İş Emirleri"
                        color={PALETTE.purple}
                        onPress={() => navigation.navigate('WorkOrderScreen')}
                    />
                    <View style={styles.donutWrap}>
                        <DonutChart
                            size={90}
                            strokeWidth={16}
                            segments={[
                                { color: PALETTE.purple, value: woStats.open },
                                { color: PALETTE.green, value: woStats.closed },
                            ]}
                        />
                        <View style={styles.donutLegend}>
                            <View style={styles.donutLegendRow}>
                                <View style={[styles.dot, { backgroundColor: PALETTE.purple }]} />
                                <Text style={styles.donutLegendText}>Açık: {woStats.open}</Text>
                            </View>
                            <View style={styles.donutLegendRow}>
                                <View style={[styles.dot, { backgroundColor: PALETTE.green }]} />
                                <Text style={styles.donutLegendText}>Kapalı: {woStats.closed}</Text>
                            </View>
                            <Text style={[styles.donutLegendText, { marginTop: 4, color: PALETTE.slate }]}>
                                Toplam: {woStats.total}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* ── Uyarılar Satırı ─── */}
            <View style={[styles.alertsRow, isMobileWeb && { flexDirection: 'column' }]}>
                {/* Geciken Siparişler */}
                <View style={styles.alertCard}>
                    <SectionHeader
                        icon="time-outline"
                        title="Geciken Siparişler"
                        color={PALETTE.red}
                        onPress={() => navigation.navigate('MainTabs', { screen: 'Satışlar' })}
                    />
                    {overdueSales.length === 0 ? (
                        <EmptyState icon="checkmark-circle-outline" text="Geciken sipariş yok" color={PALETTE.green} />
                    ) : (
                        overdueSales.map((s, i) => {
                            const daysLate = Math.floor(
                                (today - new Date(s.shipmentDate)) / 86400000
                            );
                            return (
                                <AlertRow
                                    key={s.id ?? i}
                                    icon="alert-circle-outline"
                                    iconColor={PALETTE.red}
                                    title={s.customerName || s.productName || 'Sipariş'}
                                    sub={`${s.productName || ''} · ${(s.quantity ?? 1)} adet`}
                                    badge={`${daysLate}g geç`}
                                    badgeColor={PALETTE.red}
                                />
                            );
                        })
                    )}
                </View>

                {/* Bekleyen Satın Almalar */}
                <View style={styles.alertCard}>
                    <SectionHeader
                        icon="cart-outline"
                        title="Bekleyen Satın Almalar"
                        color={PALETTE.amber}
                        onPress={() => navigation.navigate('MainTabs', { screen: 'Satın Alma' })}
                    />
                    {pendingPurchaseList.length === 0 ? (
                        <EmptyState icon="checkmark-circle-outline" text="Bekleyen satın alma yok" color={PALETTE.green} />
                    ) : (
                        pendingPurchaseList.map((p, i) => {
                            const daysSince = Math.floor(
                                (today - new Date(p.created_at)) / 86400000
                            );
                            return (
                                <AlertRow
                                    key={p.id ?? i}
                                    icon="hourglass-outline"
                                    iconColor={PALETTE.amber}
                                    title={p.productName || p.product_name || 'Ürün'}
                                    sub={`${p.quantity ?? ''} adet · ₺${fmt((p.cost ?? 0) * (p.quantity ?? 1))}`}
                                    badge={daysSince > 0 ? `${daysSince}g` : 'Bugün'}
                                    badgeColor={daysSince > 7 ? PALETTE.red : PALETTE.amber}
                                />
                            );
                        })
                    )}
                </View>
            </View>

            {/* ── Alt Bölümler ─── */}
            <View style={[styles.bottomRow, isMobileWeb && { flexDirection: 'column' }]}>
                {/* Bakım Talepleri */}
                <View style={styles.bottomCard}>
                    <SectionHeader
                        icon="build-outline"
                        title="Açık Bakım Talepleri"
                        color={PALETTE.cyan}
                        onPress={() => navigation.navigate('MaintenanceScreen')}
                    />
                    {maintStats.open.length === 0 ? (
                        <EmptyState icon="checkmark-done-outline" text="Açık bakım talebi yok" color={PALETTE.green} />
                    ) : (
                        maintStats.open.map((m, i) => (
                            <AlertRow
                                key={m.id ?? i}
                                icon="warning-outline"
                                iconColor={PALETTE.cyan}
                                title={m.title || m.equipment || 'Bakım Talebi'}
                                sub={m.description ? m.description.slice(0, 50) + (m.description.length > 50 ? '...' : '') : m.status}
                            />
                        ))
                    )}
                </View>

                {/* Personel & Görev */}
                <View style={styles.bottomCard}>
                    <SectionHeader
                        icon="people-outline"
                        title="Personel Özeti"
                        color={PALETTE.blue}
                        onPress={() => navigation.navigate('PersonnelScreen')}
                    />
                    <View style={styles.personnelGrid}>
                        <View style={styles.personnelStat}>
                            <Text style={[styles.personnelStatVal, { color: PALETTE.blue }]}>
                                {personnelStats.total}
                            </Text>
                            <Text style={styles.personnelStatLabel}>Toplam Personel</Text>
                        </View>
                        <View style={styles.personnelStat}>
                            <Text style={[styles.personnelStatVal, { color: PALETTE.green }]}>
                                {personnelStats.active}
                            </Text>
                            <Text style={styles.personnelStatLabel}>Aktif</Text>
                        </View>
                        <View style={styles.personnelStat}>
                            <Text style={[styles.personnelStatVal, { color: PALETTE.amber }]}>
                                {personnelStats.totalTasks}
                            </Text>
                            <Text style={styles.personnelStatLabel}>Toplam Görev</Text>
                        </View>
                    </View>
                </View>

                {/* Stok Uyarıları */}
                <View style={styles.bottomCard}>
                    <SectionHeader
                        icon="warning-outline"
                        title="Kritik Stok"
                        color={PALETTE.red}
                        onPress={() => navigation.navigate('MainTabs', { screen: 'Stok' })}
                    />
                    {stockAlerts.length === 0 ? (
                        <EmptyState icon="checkmark-circle-outline" text="Stok seviyeleri normal" color={PALETTE.green} />
                    ) : (
                        stockAlerts.map((p, i) => (
                            <AlertRow
                                key={p.id ?? i}
                                icon="alert-outline"
                                iconColor={PALETTE.red}
                                title={p.name}
                                sub={`Mevcut: ${p.quantity ?? 0} · Min: ${p.min_stock}`}
                                badge="Düşük"
                                badgeColor={PALETTE.red}
                            />
                        ))
                    )}
                </View>
            </View>

            {/* ── Teklifler & Müşteriler ─── */}
            <View style={[styles.bottomRow, isMobileWeb && { flexDirection: 'column' }]}>
                <View style={styles.bottomCard}>
                    <SectionHeader
                        icon="document-text-outline"
                        title="Teklifler"
                        color={PALETTE.slate}
                        onPress={() => navigation.navigate('QuotationScreen')}
                    />
                    <View style={styles.personnelGrid}>
                        <View style={styles.personnelStat}>
                            <Text style={[styles.personnelStatVal, { color: PALETTE.slate }]}>
                                {quotationStats.total}
                            </Text>
                            <Text style={styles.personnelStatLabel}>Toplam</Text>
                        </View>
                        <View style={styles.personnelStat}>
                            <Text style={[styles.personnelStatVal, { color: PALETTE.amber }]}>
                                {quotationStats.pending}
                            </Text>
                            <Text style={styles.personnelStatLabel}>Bekleyen</Text>
                        </View>
                    </View>
                </View>

                <View style={[styles.bottomCard, { flex: 2 }, isMobileWeb && { flex: 1 }]}>
                    <SectionHeader
                        icon="stats-chart-outline"
                        title="Genel Özet"
                        color={PALETTE.blue}
                    />
                    <View style={styles.summaryGrid}>
                        {[
                            { label: 'Kayıtlı Ürün', value: products.length, icon: 'cube-outline', color: PALETTE.blue },
                            { label: 'Müşteri', value: 0, icon: 'people-outline', color: PALETTE.green },
                            { label: 'Toplam Satış', value: sales.length, icon: 'cash-outline', color: PALETTE.purple },
                            { label: 'Satın Alma', value: purchases.length, icon: 'cart-outline', color: PALETTE.amber },
                        ].map((item, i) => (
                            <View key={i} style={styles.summaryItem}>
                                <Ionicons name={item.icon} size={18} color={item.color} />
                                <Text style={[styles.summaryVal, { color: item.color }]}>{item.value}</Text>
                                <Text style={styles.summaryLabel}>{item.label}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            </View>
        </ScrollView>
    );
}

// ─── Boş Durum ───────────────────────────────────────────────
function EmptyState({ icon, text, color }) {
    return (
        <View style={styles.emptyState}>
            <Ionicons name={icon} size={22} color={color} />
            <Text style={[styles.emptyText, { color }]}>{text}</Text>
        </View>
    );
}

// ─── Stiller ─────────────────────────────────────────────────
const styles = StyleSheet.create({
    page: {
        flex: 1,
        backgroundColor: PALETTE.pageBg,
    },
    pageContent: {
        padding: 24,
        paddingBottom: 40,
    },

    // Hoşgeldin
    welcomeBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    welcomeTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: PALETTE.text,
        letterSpacing: -0.5,
    },
    welcomeSub: {
        fontSize: 13,
        color: PALETTE.textMuted,
        marginTop: 2,
    },
    welcomeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: PALETTE.blueLight,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
    },
    welcomeBadgeText: {
        fontSize: 13,
        fontWeight: '700',
        color: PALETTE.blue,
    },

    // KPI Grid
    kpiGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 20,
    },
    kpiCard: {
        flex: 1,
        minWidth: 140,
        backgroundColor: PALETTE.cardBg,
        borderRadius: 16,
        padding: 16,
        borderTopWidth: 3,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    },
    kpiIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    kpiTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: PALETTE.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 6,
    },
    kpiValue: {
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    kpiSub: {
        fontSize: 11,
        color: PALETTE.textMuted,
        marginTop: 4,
    },

    // Grafik Satırı
    chartRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    chartCard: {
        flex: 1,
        backgroundColor: PALETTE.cardBg,
        borderRadius: 16,
        padding: 16,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    },

    // Donut
    donutWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        paddingTop: 8,
    },
    donutLegend: {
        gap: 6,
    },
    donutLegendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    donutLegendText: {
        fontSize: 13,
        fontWeight: '600',
        color: PALETTE.text,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },

    // Bölüm başlığı
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: PALETTE.text,
    },
    sectionAction: {
        fontSize: 12,
        fontWeight: '600',
    },

    // Uyarı Satırı
    alertsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    alertCard: {
        flex: 1,
        backgroundColor: PALETTE.cardBg,
        borderRadius: 16,
        padding: 16,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    },
    alertRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: PALETTE.border,
    },
    alertIcon: {
        width: 30,
        height: 30,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    alertTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: PALETTE.text,
    },
    alertSub: {
        fontSize: 11,
        color: PALETTE.textMuted,
        marginTop: 1,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#fff',
    },

    // Alt Satır
    bottomRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    bottomCard: {
        flex: 1,
        backgroundColor: PALETTE.cardBg,
        borderRadius: 16,
        padding: 16,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    },

    // Personel Grid
    personnelGrid: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },
    personnelStat: {
        flex: 1,
        minWidth: 70,
        backgroundColor: PALETTE.slateLight,
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
    },
    personnelStatVal: {
        fontSize: 24,
        fontWeight: '900',
    },
    personnelStatLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: PALETTE.textMuted,
        marginTop: 4,
        textAlign: 'center',
    },

    // Summary Grid
    summaryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    summaryItem: {
        flex: 1,
        minWidth: 90,
        alignItems: 'center',
        backgroundColor: PALETTE.slateLight,
        borderRadius: 12,
        padding: 14,
        gap: 4,
    },
    summaryVal: {
        fontSize: 22,
        fontWeight: '900',
    },
    summaryLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: PALETTE.textMuted,
        textAlign: 'center',
    },

    // Boş Durum
    emptyState: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 16,
    },
    emptyText: {
        fontSize: 13,
        fontWeight: '600',
    },
});
