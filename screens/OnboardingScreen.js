import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, TouchableOpacity, Image, Platform, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../Theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const SLIDES = [
    {
        id: '1',
        title: 'Stok Takibi',
        description: 'Ürünlerinizi barkod ile veya manuel ekleyin, stok adetlerinizi ve değerlerini anlık olarak takip edin.',
        icon: 'cube-outline',
        color: '#0A84FF', // iosBlue
    },
    {
        id: '2',
        title: 'Satış Yönetimi',
        description: 'Müşterilerinize hızlı satış yapın, sevk durumlarını yönetin ve kar/zarar analizlerinizi inceleyin.',
        icon: 'cart-outline',
        color: '#34C759', // iosGreen
    },
    {
        id: '3',
        title: 'Personel & Görevler',
        description: 'Ekibinizi oluşturun, görev atamaları yapın ve zimmet takibi ile envanterinizi güvende tutun.',
        icon: 'people-outline',
        color: '#AF52DE', // Purple
    },
    {
        id: '4',
        title: 'Profesyonel Raporlar',
        description: 'Satış, stok ve personel verilerinizi tek tıkla Excel veya PDF formatında dışa aktarın.',
        icon: 'document-text-outline',
        color: '#FF9500', // Orange
    }
];

const Slide = ({ item }) => {
    return (
        <View style={styles.slide}>
            <View style={[styles.imageContainer, { backgroundColor: item.color + '15' }]}>
                <Ionicons name={item.icon} size={100} color={item.color} />
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>
        </View>
    );
};

export default function OnboardingScreen({ navigation }) {
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const flatListRef = useRef(null);

    const updateCurrentSlideIndex = (e) => {
        const contentOffsetX = e.nativeEvent.contentOffset.x;
        const currentIndex = Math.round(contentOffsetX / width);
        setCurrentSlideIndex(currentIndex);
    };

    const goToNextSlide = () => {
        const nextSlideIndex = currentSlideIndex + 1;
        if (nextSlideIndex != SLIDES.length) {
            const offset = nextSlideIndex * width;
            flatListRef?.current?.scrollToOffset({ offset });
            setCurrentSlideIndex(nextSlideIndex);
        }
    };

    const skip = () => {
        finishOnboarding();
    };

    const finishOnboarding = async () => {
        try {
            await AsyncStorage.setItem('alreadyLaunched', 'true');
        } catch (error) {
            console.log('Error @setItem: ', error);
        } finally {
            navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
            });
        }
    };

    const Footer = () => {
        return (
            <View style={styles.footerContainer}>
                {/* Pagination Indicators */}
                <View style={styles.indicatorContainer}>
                    {SLIDES.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.indicator,
                                currentSlideIndex === index && {
                                    backgroundColor: Colors.iosBlue,
                                    width: 25,
                                },
                            ]}
                        />
                    ))}
                </View>

                {/* Buttons */}
                <View style={styles.btnContainer}>
                    {currentSlideIndex === SLIDES.length - 1 ? (
                        <View style={{ flexDirection: 'row' }}>
                            <TouchableOpacity style={styles.btn} onPress={finishOnboarding}>
                                <Text style={styles.btnText}>Başla</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={{ flexDirection: 'row' }}>
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={skip}
                                style={[styles.btn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#ccc' }]}>
                                <Text style={[styles.btnText, { color: '#666' }]}>Atla</Text>
                            </TouchableOpacity>
                            <View style={{ width: 15 }} />
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={goToNextSlide}
                                style={styles.btn}>
                                <Text style={styles.btnText}>İleri</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <FlatList
                ref={flatListRef}
                onMomentumScrollEnd={updateCurrentSlideIndex}
                contentContainerStyle={{ height: height * 0.75 }}
                showsHorizontalScrollIndicator={false}
                horizontal
                data={SLIDES}
                pagingEnabled
                renderItem={({ item }) => <Slide item={item} />}
            />
            <Footer />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    slide: {
        width, // Cihaz genişliği kadar
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 100, // Üstten boşluk
    },
    imageContainer: {
        width: 180,
        height: 180,
        borderRadius: 90,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: Colors.textPrimary,
        marginBottom: 20,
        textAlign: 'center',
    },
    description: {
        fontSize: 16,
        color: Colors.secondary,
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: 10,
    },
    footerContainer: {
        height: height * 0.25,
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 50,
    },
    indicatorContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 20,
    },
    indicator: {
        height: 6,
        width: 6,
        backgroundColor: '#dce0e5',
        marginHorizontal: 3,
        borderRadius: 3,
    },
    btnContainer: {
        marginBottom: 20,
    },
    btn: {
        flex: 1,
        height: 50,
        borderRadius: 12,
        backgroundColor: Colors.iosBlue,
        justifyContent: 'center',
        alignItems: 'center',
    },
    btnText: {
        fontWeight: 'bold',
        fontSize: 16,
        color: '#fff',
    },
});
