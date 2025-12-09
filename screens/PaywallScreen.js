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

export default function PaywallScreen({ navigation }) {
    const { setPremiumStatus, purchasePremium, restorePurchases, getPackages } = useContext(AppContext);
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
                Alert.alert("Hata", "Paketler yüklenemedi: " + error.message);
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
                Alert.alert('Satın Alma Başarılı', 'PLANTİM Premium özellikleriniz aktifleştirildi!');
                navigation.goBack();
            }
        } catch (error) {
            Alert.alert('Hata', error.message);
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
                <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="close-circle" size={32} color={Colors.secondary} />
                </TouchableOpacity>

                <View style={styles.header}>
                    <Ionicons name="leaf-outline" size={60} color={Colors.iosBlue} />
                    <Text style={styles.title}>PLANTİM Premium</Text>
                    <Text style={styles.subtitle}>Sadece 250 TL/Ay ile sınırları kaldırın.</Text>
                </View>

                <View style={styles.featuresList}>
                    <FeatureItem text="Sınırsız Stok Kartı Ekleme" />
                    <FeatureItem text="Tamamen Reklamsız Kullanım" />
                    <FeatureItem text="Sınırsız Proje ve Görev Takibi" />
                    <FeatureItem text="Detaylı Raporlama ve Analizler" />
                    <FeatureItem text="Verilerinizi PDF/Excel Olarak Dışa Aktarma" />
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color={Colors.iosBlue} style={styles.loader} />
                ) : (
                    <View style={styles.productsContainer}>
                        {packages.length === 0 ? (
                            <Text style={styles.errorText}>Şu anda satışta paket bulunmamaktadır.</Text>
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
                                                    <Text style={styles.badgeText}>AVANTAJLI</Text>
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
                    <Text style={styles.restoreButtonText}>Satın Almaları Geri Yükle</Text>
                </TouchableOpacity>

                <Text style={styles.legalText}>
                    Ödemeler, satın alma onayıyla Apple/Google hesabınızdan tahsil edilecektir. Abonelikler, mevcut dönemin bitiminden 24 saat önce iptal edilmediği sürece otomatik olarak yenilenir.
                </Text>

                <View style={styles.linksContainer}>
                    <TouchableOpacity onPress={() => Linking.openURL('https://docs.google.com/document/d/1rklxAoHqGFZMChJ8Hsa4be943dsqZ_C3l8KZ587Qe3c/edit?usp=sharing')}>
                        <Text style={styles.linkText}>Gizlilik Politikası</Text>
                    </TouchableOpacity>
                    <Text style={styles.linkSeparator}>•</Text>
                    <TouchableOpacity onPress={() => Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')}>
                        <Text style={styles.linkText}>Kullanım Koşulları (EULA)</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scrollContainer: {
        padding: 24,
        paddingBottom: 40,
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
        marginBottom: 30,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: Colors.text,
        marginTop: 16,
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
        color: Colors.text,
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