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
    Linking
} from 'react-native';
import { Colors } from '../Theme';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../AppContext';
import { useTranslation } from 'react-i18next';


export default function PaywallScreen({ navigation }) {
    const { setPremiumStatus, purchasePremium, restorePurchases, getPackages } = useContext(AppContext);
    const { t } = useTranslation();
    const [packages, setPackages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPackage, setSelectedPackage] = useState(null);

    useEffect(() => {
        const loadOfferings = async () => {
            try {
                const offerings = await getPackages();
                if (offerings && offerings.availablePackages) {
                    setPackages(offerings.availablePackages);
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

    const FeatureItem = ({ text }) => (
        <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle-outline" size={24} color={Colors.iosBlue} />
            <Text style={styles.featureText}>{text}</Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>


            <ScrollView contentContainerStyle={styles.scrollContainer}>

                <View style={styles.header}>
                    <Ionicons name="leaf-outline" size={60} color={Colors.iosBlue} />
                    <Text style={styles.title}>PLANTİM Premium</Text>
                    <Text style={styles.subtitle}>{t("remove_limits")}</Text>
                </View>

                <View style={styles.featuresList}>
                    <FeatureItem text={t("unlimited_stock_cards")} />
                    <FeatureItem text={t("unlimited_inventory")} />
                    <FeatureItem text={t("unlimited_projects_tasks")} />
                    <FeatureItem text={t("detailed_reporting")} />
                    <FeatureItem text={t("export_data")} />
                </View>

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
                                    style={styles.productButton}
                                    onPress={() => handlePurchase(pkg)}
                                    disabled={selectedPackage !== null}
                                >
                                    {selectedPackage === pkg ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <>
                                            <Text style={styles.productTitle}>{pkg.product.title}</Text>
                                            <Text style={styles.productPrice}>{pkg.product.priceString}</Text>
                                            <Text style={styles.productDescription}>{pkg.product.description}</Text>
                                            {pkg.packageType === 'ANNUAL' && (
                                                <View style={styles.badge}>
                                                    <Text style={styles.badgeText}>{t("advantageous")}</Text>
                                                </View>
                                            )}
                                        </>
                                    )}
                                </TouchableOpacity>
                            ))
                        )}
                    </View>
                )}

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
        backgroundColor: Colors.iosBackground,
    },
    scrollContainer: {
        padding: 24,
        paddingBottom: 120,
    },
    closeButton: {
        position: 'absolute',
        top: 20,
        right: 20,
        zIndex: 10,
    },
    header: {
        alignItems: 'center',
        marginTop: 40,
        marginBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: Colors.textPrimary,
        marginTop: 10,
    },
    subtitle: {
        fontSize: 17,
        color: Colors.secondary,
        marginTop: 8,
    },
    featuresList: {
        marginBottom: 20,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    featureText: {
        fontSize: 16,
        color: Colors.textPrimary,
        marginLeft: 12,
        flexShrink: 1,
    },
    loader: {
        marginTop: 40,
    },
    productsContainer: {
        marginTop: 10,
    },
    productButton: {
        backgroundColor: Colors.iosBlue,
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: Colors.iosBlue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
    },
    productTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    productPrice: {
        fontSize: 22,
        fontWeight: '900',
        color: '#fff',
        marginVertical: 8,
    },
    productDescription: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
        textAlign: 'center'
    },
    badge: {
        backgroundColor: '#fff',
        borderRadius: 20,
        paddingVertical: 4,
        paddingHorizontal: 10,
        position: 'absolute',
        top: -10,
        right: 10,
    },
    badgeText: {
        color: Colors.iosBlue,
        fontSize: 11,
        fontWeight: 'bold',
    },
    restoreButton: {
        marginTop: 20,
        alignItems: 'center',
    },
    restoreButtonText: {
        color: Colors.iosBlue,
        fontSize: 15,
        fontWeight: '500',
    },
    legalText: {
        fontSize: 12,
        color: Colors.secondary,
        textAlign: 'center',
        marginTop: 30,
        lineHeight: 18,
    },
    linksContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 16,
        marginBottom: 20,
    },
    linkText: {
        fontSize: 12,
        color: Colors.iosBlue,
        textDecorationLine: 'underline',
    },
    linkSeparator: {
        fontSize: 12,
        color: Colors.secondary,
        marginHorizontal: 8,
    },
    errorText: {
        textAlign: 'center',
        color: Colors.secondary,
        fontSize: 16,
        marginTop: 20,
    }
});