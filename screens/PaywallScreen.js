import React, { useEffect, useState, useContext } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    SafeAreaView,
    ScrollView,
    ActivityIndicator,
    Alert,
    Linking,
    Platform,
    Dimensions
} from 'react-native';
import { Colors } from '../Theme';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../AppContext';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

export default function PaywallScreen({ navigation }) {
    const { setPremiumStatus, purchasePremium, restorePurchases, getPackages, isPremium } = useContext(AppContext);
    const { t } = useTranslation();
    const [packages, setPackages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPackage, setSelectedPackage] = useState(null);

    useEffect(() => {
        const loadOfferings = async () => {
            try {
                if (Platform.OS === 'web') {
                    // Update to single 11880 TL annual offer
                    setPackages([
                        {
                            identifier: "web_premium_annual",
                            packageType: "ANNUAL",
                            product: {
                                title: t("premium_pro_plan", "Premium Pro – Kurumsal Paket"),
                                priceString: "11.880,00 ₺",
                                description: t("premium_pro_desc", "Yıllık tek ödeme ile tüm şirket yönetimi süreçlerinizi uçtan uca dijitalleştirin.")
                            }
                        }
                    ]);
                } else {
                    const offerings = await getPackages();
                    if (offerings && offerings.availablePackages) {
                        setPackages(offerings.availablePackages);
                    }
                }
            } catch (error) {
                Alert.alert(t("error"), t("packages_load_error") + error.message);
            } finally {
                setLoading(false);
            }
        };

        loadOfferings();
    }, []);

    const handlePurchase = async (pkg) => {
        if (selectedPackage) return;

        if (Platform.OS === 'web') {
            if (window.confirm(t("iyzico_redirect_confirm", "Ödeme işlemi için güvenli ödeme bağlantısına (Iyzico / Shopier) yönlendirileceksiniz. Devam etmek istiyor musunuz?"))) {
                window.open('https://iyzi.link/ornek-linkiniz', '_blank');
            }
            return;
        }

        setSelectedPackage(pkg);
        try {
            const success = await purchasePremium(pkg);
            if (success) {
                Alert.alert(t("purchase_successful"), t("premium_activated_message"));
                navigation.goBack();
            }
        } catch (error) {
            Alert.alert(t("error"), error.message);
        } finally {
            setSelectedPackage(null);
        }
    };

    const handleRestore = async () => {
        setLoading(true);
        const success = await restorePurchases();
        setLoading(false);
        if (success) {
            navigation.goBack();
        }
    };

    const FeatureItem = ({ text, icon = "checkmark-circle-outline" }) => (
        <View style={styles.featureItem}>
            <Ionicons name={icon} size={22} color={Colors.iosBlue} />
            <Text style={styles.featureText}>{text}</Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                <View style={styles.contentWrapper}>
                    <View style={styles.header}>
                        <View style={styles.logoBadge}>
                            <Ionicons name="diamond-outline" size={40} color="#fff" />
                        </View>
                        <Text style={styles.title}>PLANTIM <Text style={{ color: Colors.iosBlue }}>PREMIUM</Text></Text>
                        <Text style={styles.subtitle}>Şirket Yönetiminde Sınırları Kaldırın</Text>
                        <View style={styles.headerLine} />
                    </View>

                    {isPremium ? (
                        <View style={styles.premiumActiveContainer}>
                            <View style={styles.premiumActiveCard}>
                                <View style={styles.premiumIconBadge}>
                                    <Ionicons name="shield-checkmark" size={50} color="#fff" />
                                </View>
                                <Text style={styles.premiumActiveTitle}>Premium Aboneliğiniz Aktif!</Text>
                                <Text style={styles.premiumActiveDesc}>
                                    Şirket yönetiminde sınırsız özelliklere sahipsiniz. Bir güvence ile tüm sistemi kullanmaya devam edin ve bir sonraki döneme kadar her özellikten faydalanın.
                                </Text>

                                <View style={styles.subscriptionBox}>
                                    <View style={styles.subRow}>
                                        <Text style={styles.subLabel}>Mevcut Plan</Text>
                                        <Text style={styles.subValue}>Premium Pro</Text>
                                    </View>
                                    <View style={styles.subDivider} />
                                    <View style={styles.subRow}>
                                        <Text style={styles.subLabel}>Yenileme Tarihi</Text>
                                        <Text style={styles.subValue}>1 Yıl Sonra</Text>
                                    </View>
                                </View>

                                <TouchableOpacity 
                                    style={styles.manageButton}
                                    onPress={() => isWeb ? window.open('https://iyzi.link/ornek-linkiniz', '_blank') : Linking.openURL('https://apps.apple.com/account/subscriptions')}
                                >
                                    <Text style={styles.manageButtonText}>Aboneliği Yönet / Yenile</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.mainLayout}>
                        <View style={styles.featuresSection}>
                            <Text style={styles.sectionTitle}>Neden Pro'ya Geçmelisiniz?</Text>
                            <View style={styles.featuresGrid}>
                                <FeatureItem text={t("unlimited_stock_cards")} />
                                <FeatureItem text={t("unlimited_inventory")} />
                                <FeatureItem text={t("unlimited_projects_tasks")} />
                                <FeatureItem text={t("detailed_reporting")} />
                                <FeatureItem text={t("export_data")} />
                                <FeatureItem text={t("exclusive_mrp_features", "Gelişmiş MRP ve Üretim Planlama")} />
                                <FeatureItem text={t("priority_support", "7/24 Öncelikli Teknik Destek")} />
                            </View>
                        </View>

                        <View style={styles.pricingSection}>
                            {loading ? (
                                <ActivityIndicator size="large" color={Colors.iosBlue} style={styles.loader} />
                            ) : (
                                <View style={styles.productsContainer}>
                                    {packages.length === 0 ? (
                                        <Text style={styles.errorText}>{t("no_packages_available")}</Text>
                                    ) : (
                                        packages.map((pkg) => (
                                            <TouchableOpacity
                                                key={pkg.identifier}
                                                style={styles.packageCard}
                                                activeOpacity={0.9}
                                                onPress={() => handlePurchase(pkg)}
                                                disabled={selectedPackage !== null}
                                            >
                                                <LinearGradient
                                                    colors={['#1E293B', '#0F172A']}
                                                    style={styles.cardGradient}
                                                >
                                                    <View style={styles.cardHeader}>
                                                        <Text style={styles.cardTitle}>{pkg.product.title}</Text>
                                                        <View style={styles.mostPopularBadge}>
                                                            <Text style={styles.mostPopularText}>EN AVANTAJLI</Text>
                                                        </View>
                                                    </View>

                                                    <View style={styles.priceContainer}>
                                                        <Text style={styles.priceMain}>{pkg.product.priceString}</Text>
                                                        <Text style={styles.priceSub}>/ {t("annual", "yıllık")}</Text>
                                                    </View>

                                                    <Text style={styles.cardDescription}>{pkg.product.description}</Text>

                                                    <View style={styles.divider} />

                                                    <View style={styles.pricePerMonthContainer}>
                                                        <Text style={styles.pricePerMonthText}>
                                                            Ayda sadece <Text style={styles.boldText}>990 ₺</Text>
                                                        </Text>
                                                    </View>

                                                    <TouchableOpacity
                                                        style={styles.buyButton}
                                                        onPress={() => handlePurchase(pkg)}
                                                        disabled={selectedPackage !== null}
                                                    >
                                                        {selectedPackage === pkg ? (
                                                            <ActivityIndicator color="#fff" />
                                                        ) : (
                                                            <Text style={styles.buyButtonText}>Hemen Pro'ya Geç</Text>
                                                        )}
                                                    </TouchableOpacity>

                                                    <Text style={styles.secureText}>
                                                        <Ionicons name="shield-checkmark-outline" size={14} color="#94A3B8" /> 256-bit SSL Güvenli Ödeme
                                                    </Text>
                                                </LinearGradient>
                                            </TouchableOpacity>
                                        ))
                                    )}
                                </View>
                            )}
                        </View>
                        </View>
                    )}

                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.restoreButton} onPress={handleRestore}>
                            <Text style={styles.restoreButtonText}>{t("restore_purchases_button")}</Text>
                        </TouchableOpacity>

                        <Text style={styles.legalText}>
                            {t("subscription_terms")}
                        </Text>

                        <View style={styles.linksContainer}>
                            <TouchableOpacity onPress={() => Linking.openURL('https://fearless-playground-057.notion.site/Privacy-Policy-2c685b6f3cbc80b6a9ded3063bc09948?source=copy_link')}>
                                <Text style={styles.linkText}>{t("privacy_policy")}</Text>
                            </TouchableOpacity>
                            <Text style={styles.linkSeparator}>•</Text>
                            <TouchableOpacity onPress={() => Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')}>
                                <Text style={styles.linkText}>{t("terms_of_use")}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </ScrollView>

            <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
                <Ionicons name="close-circle" size={32} color={Colors.secondary} />
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    scrollContainer: {
        paddingVertical: 40,
        paddingHorizontal: isWeb ? 40 : 20,
    },
    contentWrapper: {
        maxWidth: 1000,
        alignSelf: 'center',
        width: '100%',
    },
    closeButton: {
        position: 'absolute',
        top: 20,
        right: 20,
        zIndex: 10,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logoBadge: {
        width: 80,
        height: 80,
        borderRadius: 24,
        backgroundColor: Colors.iosBlue,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: Colors.iosBlue,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 12,
    },
    title: {
        fontSize: 32,
        fontWeight: '900',
        color: '#1E293B',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 18,
        color: '#64748B',
        marginTop: 10,
        fontWeight: '500',
    },
    headerLine: {
        width: 60,
        height: 4,
        backgroundColor: Colors.iosBlue,
        borderRadius: 2,
        marginTop: 15,
    },
    mainLayout: {
        flexDirection: isWeb ? 'row' : 'column',
        justifyContent: 'space-between',
        gap: 30,
        alignItems: isWeb ? 'flex-start' : 'center',
    },
    featuresSection: {
        flex: 1,
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 30,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 5,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1E293B',
        marginBottom: 25,
    },
    featuresGrid: {
        gap: 18,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    featureText: {
        fontSize: 16,
        color: '#334155',
        marginLeft: 14,
        fontWeight: '500',
    },
    pricingSection: {
        width: isWeb ? 400 : '100%',
    },
    productsContainer: {
        width: '100%',
    },
    packageCard: {
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 15,
    },
    cardGradient: {
        padding: 35,
        minHeight: 450,
    },
    cardHeader: {
        marginBottom: 20,
    },
    cardTitle: {
        fontSize: 18,
        color: '#94A3B8',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
    },
    mostPopularBadge: {
        backgroundColor: '#3B82F6',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
        marginTop: 10,
    },
    mostPopularText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '900',
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 10,
    },
    priceMain: {
        fontSize: 42,
        fontWeight: '900',
        color: '#fff',
    },
    priceSub: {
        fontSize: 18,
        color: '#94A3B8',
        marginLeft: 8,
    },
    cardDescription: {
        fontSize: 15,
        color: '#CBD5E1',
        lineHeight: 22,
        marginBottom: 25,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginBottom: 20,
    },
    pricePerMonthContainer: {
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        padding: 12,
        borderRadius: 12,
        marginBottom: 30,
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.2)',
    },
    pricePerMonthText: {
        color: '#E2E8F0',
        fontSize: 14,
        textAlign: 'center',
    },
    boldText: {
        fontWeight: 'bold',
        color: '#fff',
    },
    buyButton: {
        backgroundColor: '#fff',
        paddingVertical: 18,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#fff',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
    },
    buyButtonText: {
        color: '#0F172A',
        fontSize: 18,
        fontWeight: '800',
    },
    secureText: {
        fontSize: 12,
        color: '#64748B',
        textAlign: 'center',
        marginTop: 20,
    },
    loader: {
        marginTop: 100,
    },
    footer: {
        marginTop: 50,
        alignItems: 'center',
    },
    restoreButton: {
        marginBottom: 25,
    },
    restoreButtonText: {
        color: Colors.iosBlue,
        fontSize: 15,
        fontWeight: '600',
    },
    legalText: {
        fontSize: 12,
        color: '#94A3B8',
        textAlign: 'center',
        lineHeight: 18,
        maxWidth: 600,
    },
    linksContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 20,
    },
    linkText: {
        fontSize: 13,
        color: Colors.iosBlue,
        fontWeight: '500',
    },
    linkSeparator: {
        fontSize: 13,
        color: '#CBD5E1',
        marginHorizontal: 10,
    },
    errorText: {
        textAlign: 'center',
        color: '#64748B',
        fontSize: 16,
        marginTop: 40,
    },
    premiumActiveContainer: {
        width: '100%',
        alignItems: 'center',
        marginTop: 20,
    },
    premiumActiveCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 40,
        maxWidth: 600,
        width: '100%',
        alignItems: 'center',
        shadowColor: "rgba(16, 185, 129, 0.4)",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
        borderWidth: 1,
        borderColor: '#ECFDF5',
    },
    premiumIconBadge: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#10B981',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 15,
        elevation: 12,
    },
    premiumActiveTitle: {
        fontSize: 26,
        fontWeight: '800',
        color: '#064E3B',
        marginBottom: 10,
        textAlign: 'center',
    },
    premiumActiveDesc: {
        fontSize: 16,
        color: '#475569',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 30,
        paddingHorizontal: 10,
    },
    subscriptionBox: {
        width: '100%',
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 20,
        marginBottom: 30,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    subRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    subLabel: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '600',
    },
    subValue: {
        fontSize: 16,
        color: '#1E293B',
        fontWeight: '800',
    },
    subDivider: {
        height: 1,
        backgroundColor: '#E2E8F0',
        marginVertical: 15,
    },
    manageButton: {
        backgroundColor: '#0F172A',
        paddingVertical: 16,
        paddingHorizontal: 30,
        borderRadius: 16,
        width: '100%',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
    },
    manageButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    }
});
