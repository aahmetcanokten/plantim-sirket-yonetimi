import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { Colors } from '../Theme';

export const Skeleton = ({ width, height, style, borderRadius = 4 }) => {
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.3,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, [opacity]);

    return (
        <Animated.View
            style={[
                styles.skeleton,
                {
                    width: width,
                    height: height,
                    borderRadius: borderRadius,
                    opacity: opacity,
                },
                style,
            ]}
        />
    );
};

export const SkeletonProductItem = () => {
    return (
        <View style={styles.productCard}>
            <View style={styles.row}>
                <View style={{ flex: 1 }}>
                    <Skeleton width={120} height={20} borderRadius={6} style={{ marginBottom: 8 }} />
                    <Skeleton width={80} height={14} borderRadius={4} />
                </View>
                <Skeleton width={60} height={24} borderRadius={12} />
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
                <Skeleton width={50} height={30} borderRadius={6} />
                <Skeleton width={50} height={30} borderRadius={6} />
                <Skeleton width={50} height={30} borderRadius={6} />
            </View>
        </View>
    );
};

export const SkeletonCustomerItem = () => {
    return (
        <View style={styles.productCard}>
            <View style={[styles.row, { alignItems: 'center' }]}>
                <Skeleton width={40} height={40} borderRadius={20} style={{ marginRight: 15 }} />
                <View style={{ flex: 1 }}>
                    <Skeleton width={150} height={18} borderRadius={6} style={{ marginBottom: 6 }} />
                    <Skeleton width={100} height={14} borderRadius={4} />
                </View>
                <Skeleton width={20} height={20} borderRadius={10} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    skeleton: {
        backgroundColor: '#E1E9EE',
        overflow: 'hidden',
    },
    productCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    divider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginVertical: 12,
    },
});
