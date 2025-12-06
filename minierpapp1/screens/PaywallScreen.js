import React, { useEffect, useState } from 'react';
import { 
    StyleSheet, 
    View, 
    Text, 
    TouchableOpacity, 
    SafeAreaView, 
    ScrollView, 
    ActivityIndicator, 
    Alert,
    Platform // Platformu kontrol etmek için eklendi
} from 'react-native';
import {
    initConnection,
    getProducts,
    requestPurchase,
    finishTransaction,
    purchaseUpdatedListener,
    purchaseErrorListener,
    getAvailablePurchases,
    ProductPurchase,
    PurchaseError
} from 'react-native-iap';
import { Colors } from '../Theme'; // Tema renklerinizi varsayalım
import { Ionicons } from '@expo/vector-icons'; // İkonlar için

// --- BURAYI DEĞİŞTİRİN ---
// App Store Connect ve Google Play Console'da oluşturduğunuz 
// "Uygulama İçi Satın Alma" ürünlerinizin kimlikleri.
const productSkus = Platform.select({
    ios: [
        'plantim_aylik_premium',
        'plantim_yillik_premium',
    ],
    android: [
        'plantim_aylik_premium',
        'plantim_yillik_premium',
    ]
});
// -------------------------


export default function PaywallScreen({ navigation }) {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    // Hangi ürünün satın alındığını takip etmek için
    const [selectedProductId, setSelectedProductId] = useState(null);

    // Satın alma işlemleri için dinleyicileri kurar
    useEffect(() => {
        let purchaseUpdateSubscription;
        let purchaseErrorSubscription;

        const setupIAP = async () => {
            try {
                await initConnection();
                // Ürünleri mağazadan çek
                const fetchedProducts = await getProducts({ skus: productSkus });
                // Fiyatları ve bilgileri state'e kaydet
                setProducts(fetchedProducts);
                setLoading(false);
            } catch (error) {
                Alert.alert("Hata", "Ödeme seçenekleri yüklenemedi. Lütfen internet bağlantınızı kontrol edin.");
                setLoading(false);
            }
        };

        setupIAP();

        // Satın alma başarılı olduğunda tetiklenir
        purchaseUpdateSubscription = purchaseUpdatedListener(async (purchase) => {
            const receipt = purchase.transactionReceipt;
            if (receipt) {
                try {
                    // --- ! ÇOK ÖNEMLİ ! ---
                    // Bu noktada, 'receipt' bilginizi kendi sunucunuza (Supabase) göndermelisiniz.
                    // Sunucunuz bu makbuzu Apple/Google ile doğrulamalı
                    // ve DOĞRU ise kullanıcının veritabanındaki (örn: users tablosu)
                    // 'is_premium' alanını 'true' yapmalıdır.
                    
                    // Örnek sunucu doğrulama fonksiyonu (Sizin oluşturmanız gerek)
                    // const { success } = await verifyPurchaseOnServer(receipt, purchase.productId);
                    
                    // if (success) { ... }

                    // --- Sunucu Doğrulaması Başarılı Olduktan Sonra ---
                    
                    // İşlemi sonlandır (Apple/Google'a 'tamamlandı' bilgisi ver)
                    await finishTransaction({purchase, isConsumable: false});
                    
                    Alert.alert('Satın Alma Başarılı', 'PLANTİM Premium özellikleriniz aktifleştirildi!');
                    
                    // Yükleniyor durumunu kaldır
                    setSelectedProductId(null);
                    
                    // Kullanıcıyı ana ekrana veya premium ekrana yönlendir
                    navigation.goBack(); // Veya navigation.navigate('Home')
                    
                } catch (ackError) {
                    // İşlemi sonlandırmada hata olursa
                    Alert.alert('Hata', 'Satın alma onaylanırken bir sorun oluştu.');
                    setSelectedProductId(null);
                }
            }
        });

        // Satın alma sırasında hata olursa tetiklenir
        purchaseErrorSubscription = purchaseErrorListener((error) => {
            Alert.alert('Satın Alma İptal Edildi', error.message);
            setSelectedProductId(null);
        });

        // Ekran kapatıldığında dinleyicileri kaldır
        return () => {
            if (purchaseUpdateSubscription) {
                purchaseUpdateSubscription.remove();
            }
            if (purchaseErrorSubscription) {
                purchaseErrorSubscription.remove();
            }
        };
    }, []);

    // Satın Al butonuna basıldığında
    const handlePurchase = async (sku) => {
        if (selectedProductId) return; // Zaten bir işlem sürüyor
        setSelectedProductId(sku);
        try {
            await requestPurchase({ sku });
        } catch (error) {
            Alert.alert('Hata', error.message);
            setSelectedProductId(null);
        }
    };

    // (iOS için Zorunlu) Önceki satın almaları geri yükle
    const handleRestorePurchases = async () => {
        try {
            setLoading(true);
            const purchases = await getAvailablePurchases();
            // Geri yüklenen satın almaları (purchases) sunucunuzda doğrulayın
            // ve kullanıcıya erişim verin.
            if (purchases && purchases.length > 0) {
                 Alert.alert('Başarılı', 'Satın almalarınız geri yüklendi.');
                 // ... burada da doğrulama ve erişim verme mantığı olmalı ...
            } else {
                 Alert.alert('Bilgi', 'Geri yüklenecek aktif bir abonelik bulunamadı.');
            }
            setLoading(false);
        } catch (error) {
            Alert.alert('Hata', error.message);
            setLoading(false);
        }
    };

    // Özellik listesi için yardımcı component
    const FeatureItem = ({ text }) => (
        <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle-outline" size={24} color={Colors.iosBlue} />
            <Text style={styles.featureText}>{text}</Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                {/* Kapatma Butonu */}
                <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="close-circle" size={32} color={Colors.secondary} />
                </TouchableOpacity>

                <View style={styles.header}>
                    <Ionicons name="leaf-outline" size={60} color={Colors.iosBlue} />
                    <Text style={styles.title}>PLANTİM Premium</Text>
                    <Text style={styles.subtitle}>Tüm potansiyelinizi ortaya çıkarın.</Text>
                </View>

                {/* --- BURAYI DEĞİŞTİRİN: Premium özellik listeniz --- */}
                <View style={styles.featuresList}>
                    <FeatureItem text="Sınırsız Proje ve Görev Takibi" />
                    <FeatureItem text="Detaylı Raporlama ve Analizler" />
                    <FeatureItem text="Tüm Ekip Üyeleri İçin Erişim" />
                    <FeatureItem text="Öncelikli E-posta ve Telefon Desteği" />
                    <FeatureItem text="Verilerinizi PDF/Excel Olarak Dışa Aktarma" />
                </View>
                {/* -------------------------------------------------- */}

                {loading ? (
                    <ActivityIndicator size="large" color={Colors.iosBlue} style={styles.loader} />
                ) : (
                    <View style={styles.productsContainer}>
                        {products.map((product) => (
                            <TouchableOpacity 
                                key={product.productId} 
                                style={styles.productButton}
                                onPress={() => handlePurchase(product.productId)}
                                disabled={selectedProductId !== null}
                            >
                                {selectedProductId === product.productId ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <>
                                        {/* product.title ve product.description App Store/Google'dan gelir */}
                                        <Text style={styles.productTitle}>{product.title || product.productId}</Text>
                                        <Text style={styles.productPrice}>{product.localizedPrice}</Text>
                                        <Text style={styles.productDescription}>{product.description}</Text>
                                        {/* Yıllık alımda indirim göstermek için */}
                                        {product.productId.includes('yillik') && (
                                            <View style={styles.badge}>
                                                <Text style={styles.badgeText}>%20 İNDİRİMLİ</Text>
                                            </View>
                                        )}
                                    </>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                <TouchableOpacity style={styles.restoreButton} onPress={handleRestorePurchases}>
                    <Text style={styles.restoreButtonText}>Satın Almaları Geri Yükle</Text>
                </TouchableOpacity>
                
                <Text style={styles.legalText}>
                    Ödemeler, satın alma onayıyla Apple/Google hesabınızdan tahsil edilecektir. Abonelikler, mevcut dönemin bitiminden 24 saat önce iptal edilmediği sürece otomatik olarak yenilenir.
                </Text>

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
        flexShrink: 1, // Uzun metinlerin taşmasını engeller
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
    }
});