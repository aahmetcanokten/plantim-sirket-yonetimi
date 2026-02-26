import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../Theme';
import { useAuth } from '../AuthContext';

const MENU_ITEMS = [
    { name: 'MainTabs', params: { screen: 'Stok' }, label: 'Stok Listesi', icon: 'list-outline' },
    { name: 'AddProductScreen', label: 'Yeni Ürün Ekle', icon: 'add-circle-outline' },
    { name: 'AssemblyScreen', label: 'Montaj / Üretim', icon: 'construct-outline' },
    { name: 'QuotationScreen', label: 'Teklifler', icon: 'document-text-outline' },
    { name: 'MainTabs', params: { screen: 'Satışlar' }, label: 'Satışlar', icon: 'cash-outline' },
    { name: 'MainTabs', params: { screen: 'Satın Alma' }, label: 'Satın Alma', icon: 'cart-outline' },
    { name: 'MainTabs', params: { screen: 'Müşteriler' }, label: 'Müşteriler', icon: 'people-outline' },
    { name: 'WorkOrderScreen', label: 'İş Emirleri', icon: 'construct-outline' },
    { name: 'WorkOrderArchiveScreen', label: 'İş Emri Arşivi', icon: 'archive-outline' },
    { name: 'MaintenanceScreen', label: 'Bakım ve Servis', icon: 'build-outline' },
    { name: 'MaintenanceArchiveScreen', label: 'Bakım Arşivi', icon: 'filing-outline' },
    { name: 'AssetManagementScreen', label: 'Zimmet Yönetimi', icon: 'briefcase-outline' },
    { name: 'TaskListScreen', label: 'Görev Takibi', icon: 'checkbox-outline' },
    { name: 'PersonnelScreen', label: 'Personel', icon: 'person-outline' },
    { name: 'Analytics', label: 'Raporlar', icon: 'bar-chart-outline' },
    { name: 'Ayarlar', label: 'Ayarlar', icon: 'settings-outline' },
];

export default function WebContainer({ children, activeRoute }) {
    const navigation = useNavigation();
    const { session } = useAuth();

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
            case 'Login': return 'Giriş Yap';
            case 'Onboarding': return 'Hoşgeldiniz';
            case 'Paywall': return 'Premium';
            default: return currentRouteName;
        }
    };

    const isMenuSelected = (item) => {
        if (item.name === 'MainTabs' && currentParams?.screen === item.params?.screen) return true;
        if (item.name === 'MainTabs' && !item.params && currentRouteName === 'MainTabs') return true; // Fallback

        // Tab içindeki stok ekranı varsayılan açılıyorsa ve route MainTabs ise
        if (currentRouteName === 'Stok' && item.label === 'Stok') return true;
        if (currentRouteName === 'Satışlar' && item.label === 'Satışlar') return true;
        if (currentRouteName === 'Satın Alma' && item.label === 'Satın Alma') return true;
        if (currentRouteName === 'Müşteriler' && item.label === 'Müşteriler') return true;

        if (item.name === currentRouteName) return true;
        return false;
    };


    // Only render dashboard layout on Web
    if (Platform.OS !== 'web') {
        return <>{children}</>;
    }

    if (!session) {
        return (
            <View style={{ flex: 1, height: '100vh', width: '100%', backgroundColor: Colors.webBackground }}>
                {children}
            </View>
        )
    }

    // Checking if we can go back
    const canGoBack = navigation.canGoBack();

    return (
        <View style={styles.container}>
            {/* --- SIDEBAR (Sol Menü) --- */}
            <View style={styles.sidebar}>
                <TouchableOpacity
                    style={styles.logoContainer}
                    onPress={() => navigation.navigate('MainTabs', { screen: 'Stok' })}
                >
                    <View style={styles.logoIconBg}>
                        <Ionicons name="leaf" size={20} color="#fff" />
                    </View>
                    <Text style={styles.logoText}>PLANTİM <Text style={{ fontWeight: '300', opacity: 0.7 }}>ERP</Text></Text>
                </TouchableOpacity>

                <ScrollView style={styles.menuContainer} showsVerticalScrollIndicator={false}>
                    <Text style={styles.menuSectionHeader}>ANA MENÜ</Text>
                    {MENU_ITEMS.map((item, index) => {
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
                <View style={styles.header}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {canGoBack && (
                            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                                <Ionicons name="chevron-back" size={20} color="#64748B" />
                            </TouchableOpacity>
                        )}
                        <Text style={styles.headerTitle}>{getPageTitle()}</Text>
                    </View>

                    <View style={styles.headerRight}>
                        <TouchableOpacity style={styles.notificationBtn}>
                            <Ionicons name="notifications-outline" size={22} color="#64748B" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.userBadge} onPress={() => navigation.navigate('Ayarlar')}>
                            <View style={styles.avatar}>
                                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>AC</Text>
                            </View>
                            <View style={styles.userInfo}>
                                <Text style={styles.userName}>Ahmet Can</Text>
                                <Text style={styles.userRole}>Yönetici</Text>
                            </View>
                            <Ionicons name="chevron-down" size={14} color="#94A3B8" style={{ marginLeft: 8 }} />
                        </TouchableOpacity>
                    </View>
                </View>

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
        zIndex: 10,
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

    // MAIN CONTENT
    mainContent: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
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

