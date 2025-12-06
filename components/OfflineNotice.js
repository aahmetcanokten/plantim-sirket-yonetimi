import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Platform, StatusBar } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Colors } from '../Theme';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function OfflineNotice() {
    const [isConnected, setIsConnected] = useState(true);
    const [animation] = useState(new Animated.Value(0));

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener((state) => {
            const offline = !(state.isConnected && state.isInternetReachable);
            setIsConnected(!offline); // isConnected state'ini güncelle

            // Animasyonu tetikle
            Animated.timing(animation, {
                toValue: offline ? 1 : 0,
                duration: 300,
                useNativeDriver: true,
            }).start();
        });

        return () => unsubscribe();
    }, [animation]);

    if (isConnected && animation._value === 0) return null;

    const translateY = animation.interpolate({
        inputRange: [0, 1],
        outputRange: [-100, 0], // Yukarıdan aşağı kayar
    });

    return (
        <Animated.View style={[styles.container, { transform: [{ translateY }] }]}>
            <SafeAreaView edges={['top']} style={styles.safeArea}>
                <View style={styles.content}>
                    <Ionicons name="cloud-offline-outline" size={20} color="#fff" style={styles.icon} />
                    <Text style={styles.text}>İnternet bağlantısı yok</Text>
                </View>
            </SafeAreaView>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.critical || '#FF3B30',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
    },
    safeArea: {
        backgroundColor: 'transparent',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 20,
        height: Platform.OS === 'ios' ? 44 : 50,
    },
    text: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
        marginLeft: 10,
    },
    icon: {
        opacity: 0.9,
    },
});
