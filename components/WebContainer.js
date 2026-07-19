import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, ScrollView, Dimensions, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../Theme';
import { useAuth } from '../AuthContext';
import { AppContext } from '../AppContext';

// ─── Bildirim Kategorisi Renkleri & İkonları ───────────────────────────────
const NOTIF_TYPES = {
    overdue_sale:       { color: '#EF4444', bg: '#FEF2F2', icon: 'time-outline',         label: 'Geciken Sipariş' },
    low_stock:          { color: '#F59E0B', bg: '#FFFBEB', icon: 'alert-circle-outline',  label: 'Düşük Stok' },
    overdue_task:       { color: '#8B5CF6', bg: '#F5F3FF', icon: 'checkbox-outline',      label: 'Geciken Görev' },
    pending_purchase:   { color: '#3B82F6', bg: '#EFF6FF', icon: 'cart-outline',          label: 'Bekleyen Satın Alma' },
    open_work_order:    { color: '#10B981', bg: '#ECFDF5', icon: 'construct-outline',     label: 'Açık İş Emri' },
    open_maintenance:   { color: '#06B6D4', bg: '#ECFEFF', icon: 'build-outline',         label: 'Açık Bakım' },
};

// ─── Görev gecikme kontrolü (DD.MM.YYYY formatı) ────────────────────────────
function isTaskOverdue(dueDateStr) {
    if (!dueDateStr) return false;
    try {
        const parts = dueDateStr.split('.');
        if (parts.length !== 3) return false;
        const due = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return due < today;
    } catch { return false; }
}


const MENU_ITEMS = [
    { name: 'DashboardScreen', label: 'Şirket Özeti', icon: 'grid-outline' },
    { name: 'Stok', label: 'Stok Listesi', icon: 'list-outline' },
    { name: 'AddProductScreen', label: 'Yeni Ürün Ekle', icon: 'add-circle-outline' },
    { name: 'AssemblyScreen', label: 'Montaj / Üretim', icon: 'construct-outline' },
    { name: 'QuotationScreen', label: 'Teklifler', icon: 'document-text-outline' },
    { name: 'WarehouseScreen', label: 'Depo ve Transfer', icon: 'swap-horizontal-outline' },
    { name: 'MrpScreen', label: 'Malzeme İhtiyaç', icon: 'layers-outline' },
    { name: 'Satışlar', label: 'Satışlar', icon: 'cash-outline' },
    { name: 'Satın Alma', label: 'Satın Alma', icon: 'cart-outline' },
    { name: 'FinanceScreen', label: 'Finans Yönetimi', icon: 'wallet-outline' },
    { name: 'Müşteriler', label: 'Müşteriler', icon: 'people-outline' },
    { name: 'WorkOrderScreen', label: 'İş Emirleri', icon: 'construct-outline' },
    { name: 'WorkOrderArchiveScreen', label: 'İş Emri Arşivi', icon: 'archive-outline' },
    { name: 'MaintenanceScreen', label: 'Bakım ve Servis', icon: 'build-outline' },
    { name: 'MaintenanceArchiveScreen', label: 'Bakım Arşivi', icon: 'folder-open-outline' },
    { name: 'AssetManagementScreen', label: 'Zimmet Yönetimi', icon: 'briefcase-outline' },
    { name: 'TaskListScreen', label: 'Görev Takibi', icon: 'checkbox-outline' },
    { name: 'PersonnelScreen', label: 'Personel', icon: 'person-outline' },
    { name: 'Analytics', label: 'Raporlar', icon: 'bar-chart-outline' },
    { name: 'Ayarlar', label: 'Ayarlar', icon: 'settings-outline' },
];

export default function WebContainer({ children, activeRoute }) {
    const navigation = useNavigation();
    const { session, signOut } = useAuth();
    const appContext = useContext(AppContext);
    const company = appContext?.company;
    const insets = useSafeAreaInsets();
    const isRestrictedPersonnel = appContext?.isRestrictedPersonnel;
    const userPermissions = appContext?.userPermissions || {};

    // Bildirim için veri kaynakları
    const sales = appContext?.sales ?? [];
    const products = appContext?.products ?? [];
    const personnel = appContext?.personnel ?? [];
    const purchases = appContext?.purchases ?? [];
    const workOrders = appContext?.workOrders ?? [];
    const maintenanceRequests = appContext?.maintenanceRequests ?? [];

    const screenWidth = Dimensions.get('window').width;
    const [isSidebarOpen, setIsSidebarOpen] = useState(Platform.OS === 'web' ? screenWidth > 1024 : false);
    const [isMobile, setIsMobile] = useState(Platform.OS === 'web' ? screenWidth <= 1024 : true);

    // ─── Bildirim Panel State'leri ──────────────────────────────────────────
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [readIds, setReadIds] = useState(new Set());
    const notifPanelRef = useRef(null);

    // ─── Bildirimleri Hesapla ───────────────────────────────────────────────
    const notifications = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const list = [];

        // 1. Geciken Siparişler
        sales.forEach(s => {
            if (!s.isShipped && s.shipmentDate) {
                const shipDate = new Date(s.shipmentDate);
                shipDate.setHours(0, 0, 0, 0);
                if (shipDate < today) {
                    list.push({
                        id: `overdue_sale_${s.id || s.sale_id}`,
                        type: 'overdue_sale',
                        title: 'Geciken Sipariş',
                        message: `${s.productName || s.product_name || 'Ürün'} — ${s.customerName || s.customer_name || 'Müşteri'}`,
                        detail: `Teslim tarihi: ${new Date(s.shipmentDate).toLocaleDateString('tr-TR')}`,
                        navigate: { name: 'Satışlar' },
                    });
                }
            }
        });

        // 2. Düşük Stok
        products.forEach(p => {
            if (p.min_stock != null && (p.quantity ?? 0) <= p.min_stock) {
                list.push({
                    id: `low_stock_${p.id}`,
                    type: 'low_stock',
                    title: 'Düşük Stok',
                    message: `${p.name || p.product_name || 'Ürün'}`,
                    detail: `Mevcut: ${p.quantity ?? 0} · Min: ${p.min_stock}`,
                    navigate: { name: 'Stok' },
                });
            }
        });

        // 3. Geciken Görevler (personnel.tasks)
        personnel.forEach(person => {
            if (person.tasks && Array.isArray(person.tasks)) {
                person.tasks.forEach(task => {
                    if (!task.isCompleted && isTaskOverdue(task.dueDate)) {
                        list.push({
                            id: `overdue_task_${person.id}_${task.id || task.title}`,
                            type: 'overdue_task',
                            title: 'Geciken Görev',
                            message: `${task.title || 'Görev'}`,
                            detail: `Sorumlu: ${person.name} · Son: ${task.dueDate}`,
                            navigate: { name: 'TaskListScreen' },
                        });
                    }
                });
            }
        });

        // 4. Bekleyen Satın Almalar
        purchases.forEach(p => {
            if (!p.delivered) {
                list.push({
                    id: `pending_purchase_${p.id}`,
                    type: 'pending_purchase',
                    title: 'Bekleyen Satın Alma',
                    message: `${p.productName || p.product_name || p.supplier_name || 'Ürün'}`,
                    detail: `Miktar: ${p.quantity ?? '-'}${p.cost ? ` · ₺${(p.cost * (p.quantity ?? 1)).toLocaleString('tr-TR')}` : ''}`,
                    navigate: { name: 'Satın Alma' },
                });
            }
        });

        // 5. Açık İş Emirleri
        workOrders.forEach(w => {
            if (w.status === 'OPEN') {
                list.push({
                    id: `open_wo_${w.id}`,
                    type: 'open_work_order',
                    title: 'Açık İş Emri',
                    message: `${w.title || w.product_name || 'İş Emri'}`,
                    detail: `Oluşturuldu: ${w.created_at ? new Date(w.created_at).toLocaleDateString('tr-TR') : '—'}`,
                    navigate: { name: 'WorkOrderScreen' },
                });
            }
        });

        // 6. Açık Bakım Talepleri
        maintenanceRequests.forEach(m => {
            if (m.status !== 'CLOSED' && m.status !== 'COMPLETED') {
                list.push({
                    id: `open_maint_${m.id}`,
                    type: 'open_maintenance',
                    title: 'Açık Bakım Talebi',
                    message: `${m.title || m.asset_name || 'Bakım'}`,
                    detail: `Durum: ${m.status || 'OPEN'}`,
                    navigate: { name: 'MaintenanceScreen' },
                });
            }
        });

        return list;
    }, [sales, products, personnel, purchases, workOrders, maintenanceRequests]);

    const unreadCount = useMemo(
        () => notifications.filter(n => !readIds.has(n.id)).length,
        [notifications, readIds]
    );

    // Hepsini okundu işaretle
    const markAllAsRead = () => {
        setReadIds(new Set(notifications.map(n => n.id)));
    };

    // Tekil okundu
    const markAsRead = (id) => {
        setReadIds(prev => new Set([...prev, id]));
    };

    // ─── Panel dışına tıklayınca kapat (Web) ───────────────────────────────
    useEffect(() => {
        if (Platform.OS !== 'web') return;
        const handleClick = (e) => {
            if (notifPanelRef.current && !notifPanelRef.current.contains(e.target)) {
                setIsNotifOpen(false);
            }
        };
        if (isNotifOpen) {
            setTimeout(() => document.addEventListener('mousedown', handleClick), 0);
        }
        return () => document.removeEventListener('mousedown', handleClick);
    }, [isNotifOpen]);

    const filteredMenuItems = MENU_ITEMS.filter(item => {
        if (!isRestrictedPersonnel) return true;
        
        // Benzersiz yetki anahtarını bul
        const permKey = item.name;
        const legacyKey = `MainTabs_${item.name}`; // Eski veritabanı kayıtları için
        
        // userPermissions içinde bu key true ise göster, değilse gizle
        return !!userPermissions[permKey] || !!userPermissions[legacyKey];
    });

    // Handle Window Resize for responsiveness
    useEffect(() => {
        if (Platform.OS === 'web') {
            const handleResize = () => {
                const mobile = window.innerWidth <= 1024;
                setIsMobile(mobile);
                if (!mobile) setIsSidebarOpen(true);
            };
            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        } else {
            // For mobile orientation changes
            const subscription = Dimensions.addEventListener('change', ({ window }) => {
                const mobile = window.width <= 1024;
                setIsMobile(true); // always true on phone, but might want to check tablet
            });
            return () => subscription?.remove();
        }
    }, []);

    // Inject Google Fonts and Global Styles for Web
    useEffect(() => {
        if (Platform.OS === 'web') {
            const style = document.createElement('style');
            style.textContent = `
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
                
                /* Set base font for the whole document */
                body, input, button, select, textarea {
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    -webkit-font-smoothing: antialiased;
                    -moz-osx-font-smoothing: grayscale;
                }

                body {
                    margin: 0;
                    padding: 0;
                    background-color: ${Colors.webBackground};
                    color: ${Colors.webText};
                }

                /* Ensure React Native Web text components inherit from body if no explicit font is set */
                [dir="auto"] {
                    font-family: inherit;
                }
                
                /* Custom Scrollbar for a premium look */
                ::-webkit-scrollbar {
                    width: 8px;
                    height: 8px;
                }
                ::-webkit-scrollbar-track {
                    background: transparent;
                }
                ::-webkit-scrollbar-thumb {
                    background: #CBD5E1;
                    border-radius: 4px;
                }
                ::-webkit-scrollbar-thumb:hover {
                    background: #94A3B8;
                }

                /* Bildirim Paneli Animasyonu */
                @keyframes notifSlideIn {
                    from { opacity: 0; transform: translateY(-10px) scale(0.97); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
                .notif-panel-enter {
                    animation: notifSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }

                /* Bildirim satırı hover efekti */
                .notif-row:hover {
                    background: #F8FAFC !important;
                    cursor: pointer;
                }
            `;
            document.head.appendChild(style);
        }
    }, []);

    // Aktif rotayı props'dan al (App.js'den gelir)
    const currentRouteInfo = activeRoute;
    const currentRouteName = currentRouteInfo?.name;
    const currentParams = currentRouteInfo?.params;

    // Başlık belirleme mantığı
    const getPageTitle = () => {
        if (!currentRouteName) return 'Plantim ERP';

        switch (currentRouteName) {
            case 'DashboardScreen': return 'Şirket Özeti';
            case 'Stok': return 'Stok Yönetimi';
            case 'Satışlar': return 'Satış İşlemleri';
            case 'Satın Alma': return 'Satın Alma';
            case 'Müşteriler': return 'Müşteri Listesi';
            case 'PersonnelScreen': return 'Personel Yönetimi';
            case 'Analytics': return 'Raporlar ve Analiz';
            case 'Ayarlar': return 'Uygulama Ayarları';
            case 'AssetManagementScreen': return 'Zimmet Yönetimi';
            case 'TaskListScreen': return 'Görev Takibi';
            case 'DetailedStockScreen': return 'Ürün Detayı';
            case 'AddProductScreen': return 'Yeni Ürün Ekle';
            case 'AssemblyScreen': return 'Montaj ve Üretim';
            case 'WorkOrderScreen': return 'İş Emri Takibi';
            case 'WorkOrderArchiveScreen': return 'İş Emri Arşivi';
            case 'MaintenanceScreen': return 'Bakım ve Servis Yönetimi';
            case 'MaintenanceArchiveScreen': return 'Bakım ve Servis Arşivi';
            case 'QuotationScreen': return 'Teklif Yönetimi';
            case 'WarehouseScreen': return 'Depo ve Transfer';
            case 'MrpScreen': return 'Malzeme İhtiyaç Analizi';
            case 'FinanceScreen': return 'Finans Yönetimi';
            case 'Login': return 'Giriş Yap';
            case 'Onboarding': return 'Hoşgeldiniz';
            case 'Paywall': return 'Premium';
            default: return currentRouteName;
        }
    };

    const isMenuSelected = (item) => {
        return item.name === currentRouteName;
    };


    // WebContainer yalnızca web platformunda çalışır.
    // iOS ve Android'de web-specific HTML elementleri (<div>, <span> vb.) ve
    // CSS özellikleri (height:'100vh', boxShadow, transition, transform string vb.)
    // React Native'de crash'e yol açar → beyaz ekran sorunu.
    if (Platform.OS !== 'web') {
        return <>{children}</>;
    }

    if (!session) {
        return <>{children}</>;
    }

    // Checking if we can go back
    const canGoBack = navigation.canGoBack();

    return (
        <View style={styles.container}>
            {/* --- SIDEBAR (Sol Menü) --- */}
            {isMobile && isSidebarOpen && (
                <TouchableOpacity
                    activeOpacity={1}
                    style={styles.overlay}
                    onPress={() => setIsSidebarOpen(false)}
                />
            )}

            <View style={[
                styles.sidebar,
                isMobile && styles.mobileSidebar,
                !isMobile && !isSidebarOpen && styles.desktopHiddenSidebar,
                isMobile && !isSidebarOpen && styles.hiddenSidebar
            ]}>
                <TouchableOpacity
                    style={styles.logoContainer}
                    onPress={() => {
                        navigation.navigate('Stok');
                        if (isMobile) setIsSidebarOpen(false);
                    }}
                >
                    <View style={styles.logoIconBg}>
                        <Ionicons name="leaf" size={20} color="#fff" />
                    </View>
                    <Text style={styles.logoText}>PLANTIM <Text style={{ fontWeight: '300', opacity: 0.7 }}>ERP</Text></Text>
                </TouchableOpacity>

                <ScrollView style={styles.menuContainer} showsVerticalScrollIndicator={false}>
                    <Text style={styles.menuSectionHeader}>ANA MENÜ</Text>
                    {filteredMenuItems.map((item, index) => {
                        const active = isMenuSelected(item);
                        return (
                            <TouchableOpacity
                                key={index}
                                style={[styles.menuItem, active && styles.menuItemActive]}
                                onPress={() => {
                                    if (item.params) {
                                        navigation.navigate(item.name, item.params);
                                    } else {
                                        navigation.navigate(item.name);
                                    }
                                    if (isMobile) setIsSidebarOpen(false);
                                }}
                            >
                                <Ionicons
                                    name={item.icon}
                                    size={18}
                                    color={active ? "#fff" : "#94A3B8"}
                                    style={{ marginRight: 12 }}
                                />
                                <Text style={[styles.menuItemText, active && styles.menuItemTextActive]}>{item.label}</Text>
                                {active && <View style={styles.activeIndicator} />}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                <View style={styles.sidebarFooter}>
                    <View style={styles.versionBadge}>
                        <Text style={styles.footerText}>VERSION 1.0.1</Text>
                    </View>
                </View>
            </View>

            {/* --- MAIN CONTENT (Sağ İçerik) --- */}
            <View style={styles.mainContent}>
                {/* --- HEADER (Üst Çubuk) --- */}
                <View style={[styles.header, isMobile && styles.mobileHeader, Platform.OS !== 'web' && { paddingTop: insets.top + 16, height: 70 + insets.top }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity onPress={() => setIsSidebarOpen(!isSidebarOpen)} style={styles.menuToggleButton}>
                            <Ionicons name="menu" size={24} color="#64748B" />
                        </TouchableOpacity>
                        {canGoBack && (
                            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                                <Ionicons name="chevron-back" size={20} color="#64748B" />
                            </TouchableOpacity>
                        )}
                        <Text style={[styles.headerTitle, isMobile && { fontSize: 18 }]}>{getPageTitle()}</Text>
                    </View>

                    <View style={styles.headerRight}>
                        {/* ─── BİLDİRİM BUTONU ─── */}
                        <TouchableOpacity
                            style={[styles.notificationBtn, isNotifOpen && styles.notificationBtnActive]}
                            onPress={() => setIsNotifOpen(prev => !prev)}
                        >
                            <Ionicons
                                name={isNotifOpen ? 'notifications' : 'notifications-outline'}
                                size={22}
                                color={isNotifOpen ? (Colors.primary || '#2563EB') : '#64748B'}
                            />
                            {/* Okunmamış sayaç badge */}
                            {unreadCount > 0 && (
                                <View style={styles.notifBadge}>
                                    <Text style={styles.notifBadgeText}>
                                        {unreadCount > 99 ? '99+' : String(unreadCount)}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.userBadge} onPress={async () => {
                            if (isRestrictedPersonnel) {
                                if (Platform.OS === 'web') {
                                    if (window.confirm("Çıkış yapmak istediğinize emin misiniz?")) {
                                        const { error } = await signOut();
                                        if (error) window.alert("Çıkış Hatası: " + error.message);
                                    }
                                } else {
                                    Alert.alert("Çıkış", "Çıkış yapmak istediğinize emin misiniz?", [
                                        { text: "İptal", style: "cancel" },
                                        { text: "Çıkış", style: "destructive", onPress: async () => await signOut() }
                                    ]);
                                }
                            } else {
                                navigation.navigate('Ayarlar');
                            }
                        }}>
                            <View style={styles.avatar}>
                                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>
                                    {company?.name ? company.name.substring(0, 2).toUpperCase() : "AC"}
                                </Text>
                            </View>
                            <View style={styles.userInfo}>
                                <Text style={styles.userName} numberOfLines={1}>{company?.name || "Şirketim"}</Text>
                                <Text style={styles.userRole} numberOfLines={1}>{isRestrictedPersonnel ? "Personel" : (session?.user?.email || "Yönetici")}</Text>
                            </View>
                            <Ionicons name="chevron-down" size={14} color="#94A3B8" style={{ marginLeft: 8 }} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ─── BİLDİRİM PANELİ ─── */}
                {isNotifOpen && Platform.OS === 'web' && (
                    <div
                        ref={notifPanelRef}
                        className="notif-panel-enter"
                        style={{
                            position: 'absolute',
                            top: 80,
                            right: 16,
                            width: 400,
                            maxWidth: 'calc(100vw - 32px)',
                            maxHeight: 'calc(100vh - 110px)',
                            backgroundColor: '#FFFFFF',
                            borderRadius: 16,
                            boxShadow: '0 24px 64px rgba(0,0,0,0.13), 0 4px 16px rgba(0,0,0,0.07)',
                            border: '1px solid #E2E8F0',
                            zIndex: 999,
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            fontFamily: 'Inter, -apple-system, sans-serif',
                        }}
                    >
                        {/* Panel Başlık */}
                        <div style={{
                            padding: '16px 16px 12px',
                            borderBottom: '1px solid #F1F5F9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexShrink: 0,
                            background: '#FFFFFF',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Ionicons name="notifications" size={18} color="#1E293B" />
                                <span style={{ fontSize: 15, fontWeight: '700', color: '#0F172A', fontFamily: 'inherit' }}>
                                    Bildirimler
                                </span>
                                {unreadCount > 0 && (
                                    <div style={{
                                        backgroundColor: '#EF4444',
                                        borderRadius: 20,
                                        minWidth: 20,
                                        height: 20,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '0 5px',
                                    }}>
                                        <span style={{ fontSize: 11, fontWeight: '800', color: '#fff', fontFamily: 'inherit' }}>
                                            {unreadCount}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {unreadCount > 0 && (
                                    <button
                                        onClick={markAllAsRead}
                                        style={{
                                            background: '#EFF6FF',
                                            border: 'none',
                                            cursor: 'pointer',
                                            fontSize: 11,
                                            fontWeight: '700',
                                            color: Colors.primary || '#2563EB',
                                            padding: '5px 10px',
                                            borderRadius: 8,
                                            fontFamily: 'inherit',
                                            letterSpacing: 0.2,
                                        }}
                                    >
                                        Tümünü Okundu İşaretle
                                    </button>
                                )}
                                <button
                                    onClick={() => setIsNotifOpen(false)}
                                    style={{
                                        background: '#F1F5F9',
                                        border: 'none',
                                        cursor: 'pointer',
                                        width: 28,
                                        height: 28,
                                        borderRadius: 8,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontFamily: 'inherit',
                                    }}
                                >
                                    <Ionicons name="close" size={16} color="#64748B" />
                                </button>
                            </div>
                        </div>

                        {/* Bildirim Listesi */}
                        <div style={{ overflowY: 'auto', flex: 1 }}>
                            {notifications.length === 0 ? (
                                // Boş durum
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '52px 24px',
                                    gap: 12,
                                }}>
                                    <div style={{
                                        width: 60,
                                        height: 60,
                                        borderRadius: 18,
                                        backgroundColor: '#F0FDF4',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                        <Ionicons name="checkmark-circle-outline" size={30} color="#10B981" />
                                    </div>
                                    <p style={{ margin: 0, fontSize: 15, fontWeight: '700', color: '#1E293B', textAlign: 'center', fontFamily: 'inherit' }}>
                                        Her şey yolunda! 🎉
                                    </p>
                                    <p style={{ margin: 0, fontSize: 13, color: '#94A3B8', textAlign: 'center', fontFamily: 'inherit', lineHeight: 1.5 }}>
                                        Şu anda dikkat gerektiren{'\n'}bir durum bulunmuyor.
                                    </p>
                                </div>
                            ) : (
                                // Kategorilere göre gruplandırılmış bildirimler
                                (() => {
                                    const grouped = {};
                                    notifications.forEach(n => {
                                        if (!grouped[n.type]) grouped[n.type] = [];
                                        grouped[n.type].push(n);
                                    });
                                    return Object.entries(grouped).map(([type, items]) => {
                                        const typeInfo = NOTIF_TYPES[type] || { color: '#64748B', bg: '#F8FAFC', icon: 'alert-outline', label: type };
                                        return (
                                            <div key={type}>
                                                {/* Kategori Başlığı */}
                                                <div style={{
                                                    padding: '8px 16px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 7,
                                                    backgroundColor: '#FAFBFF',
                                                    borderBottom: '1px solid #F1F5F9',
                                                    borderTop: '1px solid #F1F5F9',
                                                }}>
                                                    <div style={{
                                                        width: 8, height: 8, borderRadius: '50%',
                                                        backgroundColor: typeInfo.color, flexShrink: 0,
                                                    }} />
                                                    <span style={{
                                                        fontSize: 10, fontWeight: '800', color: typeInfo.color,
                                                        textTransform: 'uppercase', letterSpacing: 0.8,
                                                        fontFamily: 'inherit',
                                                    }}>
                                                        {typeInfo.label}
                                                    </span>
                                                    <span style={{
                                                        marginLeft: 'auto', fontSize: 11, fontWeight: '600',
                                                        color: '#94A3B8', fontFamily: 'inherit',
                                                    }}>
                                                        {items.length} adet
                                                    </span>
                                                </div>
                                                {/* Satırlar */}
                                                {items.map(notif => {
                                                    const isRead = readIds.has(notif.id);
                                                    return (
                                                        <div
                                                            key={notif.id}
                                                            className="notif-row"
                                                            onClick={() => {
                                                                markAsRead(notif.id);
                                                                setIsNotifOpen(false);
                                                                if (notif.navigate?.params) {
                                                                    navigation.navigate(notif.navigate.name, notif.navigate.params);
                                                                } else {
                                                                    navigation.navigate(notif.navigate.name);
                                                                }
                                                            }}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'flex-start',
                                                                padding: '11px 16px',
                                                                borderBottom: '1px solid #F8FAFC',
                                                                background: isRead ? '#FFFFFF' : '#FAFBFF',
                                                                transition: 'background 0.15s ease',
                                                                gap: 12,
                                                            }}
                                                        >
                                                            {/* İkon */}
                                                            <div style={{
                                                                width: 36, height: 36, borderRadius: 10,
                                                                backgroundColor: typeInfo.bg,
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                flexShrink: 0,
                                                            }}>
                                                                <Ionicons name={typeInfo.icon} size={17} color={typeInfo.color} />
                                                            </div>
                                                            {/* İçerik */}
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 1 }}>
                                                                    <p style={{
                                                                        margin: 0, fontSize: 13, fontWeight: '600',
                                                                        color: '#1E293B', whiteSpace: 'nowrap',
                                                                        overflow: 'hidden', textOverflow: 'ellipsis',
                                                                        fontFamily: 'inherit', flex: 1,
                                                                    }}>
                                                                        {notif.message}
                                                                    </p>
                                                                    {!isRead && (
                                                                        <div style={{
                                                                            width: 7, height: 7, borderRadius: '50%',
                                                                            backgroundColor: typeInfo.color, flexShrink: 0,
                                                                        }} />
                                                                    )}
                                                                </div>
                                                                <p style={{
                                                                    margin: 0, fontSize: 11, color: '#94A3B8',
                                                                    whiteSpace: 'nowrap', overflow: 'hidden',
                                                                    textOverflow: 'ellipsis', fontFamily: 'inherit',
                                                                }}>
                                                                    {notif.detail}
                                                                </p>
                                                            </div>
                                                            <Ionicons name="chevron-forward" size={13} color="#CBD5E1" style={{ marginTop: 8, flexShrink: 0 }} />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    });
                                })()
                            )}
                        </div>

                        {/* Alt bilgi */}
                        {notifications.length > 0 && (
                            <div style={{
                                padding: '10px 16px',
                                borderTop: '1px solid #F1F5F9',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: '#FAFBFF',
                                flexShrink: 0,
                            }}>
                                <span style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'inherit' }}>
                                    Toplam {notifications.length} bildirim · {unreadCount} okunmamış
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* --- PAGE CONTENT --- */}
                <View style={styles.pageContent}>
                    {children}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: Colors.webBackground,
        height: '100vh',
        overflow: 'hidden'
    },
    // SIDEBAR
    sidebar: {
        width: 280,
        backgroundColor: Colors.webSidebar,
        paddingVertical: 32,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '10px 0 30px rgba(0,0,0,0.05)',
        zIndex: 100,
        transition: 'width 0.3s ease-in-out, transform 0.3s ease-in-out',
        overflow: 'hidden',
    },
    desktopHiddenSidebar: {
        width: 0,
    },
    mobileSidebar: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        boxShadow: '20px 0 50px rgba(0,0,0,0.2)',
    },
    hiddenSidebar: {
        transform: 'translateX(-100%)',
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 90,
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 28,
        marginBottom: 40,
    },
    logoIconBg: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
    },
    logoText: {
        fontSize: 18,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: 1.5,
    },
    menuSectionHeader: {
        paddingHorizontal: 28,
        fontSize: 11,
        fontWeight: '700',
        color: '#4B5563',
        marginBottom: 16,
        letterSpacing: 1,
    },
    menuContainer: {
        flex: 1,
        paddingHorizontal: 16,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginBottom: 6,
        position: 'relative',
    },
    menuItemActive: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
    },
    menuItemText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#94A3B8',
    },
    menuItemTextActive: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    activeIndicator: {
        position: 'absolute',
        left: 0,
        width: 3,
        height: 20,
        backgroundColor: Colors.primary,
        borderRadius: 2,
    },
    sidebarFooter: {
        padding: 24,
        alignItems: 'center',
    },
    versionBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    footerText: {
        color: '#4B5563',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    menuToggleButton: {
        marginRight: 12,
        padding: 8,
        borderRadius: 10,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },

    // MAIN CONTENT
    mainContent: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minWidth: 0,
        position: 'relative',
    },
    header: {
        height: 72,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 32,
    },
    mobileHeader: {
        paddingHorizontal: 16,
        height: 60,
    },
    backButton: {
        marginRight: 16,
        padding: 8,
        borderRadius: 10,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#0F172A',
        letterSpacing: -0.5,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    notificationBtn: {
        marginRight: 20,
        padding: 8,
        borderRadius: 10,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#F1F5F9',
        position: 'relative',
    },
    notificationBtnActive: {
        backgroundColor: '#EFF6FF',
        borderColor: '#BFDBFE',
    },
    notifBadge: {
        position: 'absolute',
        top: -5,
        right: -5,
        backgroundColor: '#EF4444',
        borderRadius: 20,
        minWidth: 18,
        height: 18,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 3,
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    notifBadgeText: {
        color: '#FFFFFF',
        fontSize: 9,
        fontWeight: '800',
        lineHeight: 14,
    },
    userBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 6,
        borderRadius: 12,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    userInfo: {
        marginRight: 4,
        maxWidth: 160,
    },
    userName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1E293B',
    },
    userRole: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '500',
    },
    pageContent: {
        flex: 1,
        overflow: 'hidden',
    },
});

