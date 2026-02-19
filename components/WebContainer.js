import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../Theme';
import { useAuth } from '../AuthContext';

const MENU_ITEMS = [
    { name: 'MainTabs', params: { screen: 'Stok' }, label: 'Stok', icon: 'cube-outline' },
    { name: 'MainTabs', params: { screen: 'Satışlar' }, label: 'Satışlar', icon: 'cash-outline' },
    { name: 'MainTabs', params: { screen: 'Satın Alma' }, label: 'Satın Alma', icon: 'cart-outline' },
    { name: 'MainTabs', params: { screen: 'Müşteriler' }, label: 'Müşteriler', icon: 'people-outline' },
    { name: 'AssetManagementScreen', label: 'Zimmet Yönetimi', icon: 'briefcase-outline' },
    { name: 'TaskListScreen', label: 'Görev Takibi', icon: 'checkbox-outline' },
    { name: 'PersonnelScreen', label: 'Personel', icon: 'person-outline' },
    { name: 'Analytics', label: 'Raporlar', icon: 'bar-chart-outline' },
    { name: 'Ayarlar', label: 'Ayarlar', icon: 'settings-outline' },
];

export default function WebContainer({ children, activeRoute }) {
    const navigation = useNavigation();
    const { session } = useAuth();

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
            <View style={{ flex: 1, height: '100vh', width: '100%' }}>
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
                    <Ionicons name="leaf" size={32} color={Colors.iosBlue} />
                    <Text style={styles.logoText}>PLANTİM ERP</Text>
                </TouchableOpacity>

                <ScrollView style={styles.menuContainer}>
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
                                    size={20}
                                    color={active ? Colors.iosBlue : "#64748B"}
                                    style={{ marginRight: 12 }}
                                />
                                <Text style={[styles.menuItemText, active && styles.menuItemTextActive]}>{item.label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                <View style={styles.sidebarFooter}>
                    <Text style={styles.footerText}>v1.0.1 Web</Text>
                </View>
            </View>

            {/* --- MAIN CONTENT (Sağ İçerik) --- */}
            <View style={styles.mainContent}>
                {/* --- HEADER (Üst Çubuk) --- */}
                <View style={styles.header}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {canGoBack && (
                            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                                <Ionicons name="arrow-back" size={24} color="#334155" />
                            </TouchableOpacity>
                        )}
                        <Text style={styles.headerTitle}>{getPageTitle()}</Text>
                    </View>

                    <View style={styles.headerRight}>
                        <View style={styles.headerRight}>
                            <TouchableOpacity style={styles.userBadge} onPress={() => navigation.navigate('Ayarlar')}>
                                <View style={styles.avatar}>
                                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>U</Text>
                                </View>
                                <Text style={styles.userName}>Kullanıcı</Text>
                            </TouchableOpacity>
                        </View>
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
        backgroundColor: '#F1F5F9',
        height: '100vh',
        overflow: 'hidden'
    },
    // SIDEBAR
    sidebar: {
        width: 260,
        backgroundColor: '#FFFFFF',
        borderRightWidth: 1,
        borderRightColor: '#E2E8F0',
        paddingVertical: 24,
        display: 'flex',
        flexDirection: 'column',
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginBottom: 32,
    },
    logoText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#0F172A',
        marginLeft: 12,
        letterSpacing: 0.5,
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
        borderRadius: 8,
        marginBottom: 4,
    },
    menuItemActive: {
        backgroundColor: '#F0F9FF',
    },
    menuItemText: {
        fontSize: 15,
        fontWeight: '500',
        color: '#64748B', // Muted color by default
    },
    menuItemTextActive: {
        color: Colors.iosBlue,
        fontWeight: '700',
    },
    sidebarFooter: {
        padding: 24,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    footerText: {
        color: '#94A3B8',
        fontSize: 12,
    },

    // MAIN CONTENT
    mainContent: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
    },
    header: {
        height: 64,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 16,
        padding: 8,
        borderRadius: 6,
        backgroundColor: '#F1F5F9',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0F172A',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    userBadge: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: Colors.iosBlue,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    userName: {
        fontSize: 14,
        fontWeight: '500',
        color: '#334155',
    },
    pageContent: {
        flex: 1,
        // padding: 24, // REMOVED padding to let ImmersiveLayout handle it
        overflow: 'hidden',
    },
});
