import React, { Component } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../Theme';
import * as Updates from 'expo-updates';
import i18n from '../i18n'; // i18n instance

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error: error };
    }

    componentDidCatch(error, errorInfo) {
        // Burada hatayı bir log servisine (Sentry vb.) gönderebilirsiniz.
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    handleRestart = async () => {
        try {
            await Updates.reloadAsync();
        } catch (e) {
            // Expo Go'da reloadAsync bazen çalışmayabilir, bu durumda sadece state'i sıfırlayalım
            this.setState({ hasError: false });
        }
    };

    render() {
        if (this.state.hasError) {
            return (
                <SafeAreaView style={styles.container}>
                    <View style={styles.content}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="alert-circle-outline" size={64} color={Colors.critical} />
                        </View>
                        <Text style={styles.title}>{i18n.t('unexpected_error_title')}</Text>
                        <Text style={styles.message}>
                            {i18n.t('unexpected_error_message')}
                        </Text>

                        <TouchableOpacity style={styles.button} onPress={this.handleRestart}>
                            <Text style={styles.buttonText}>{i18n.t('restart_app')}</Text>
                        </TouchableOpacity>

                        <View style={styles.debugContainer}>
                            <Text style={styles.debugTitle}>{i18n.t('error_detail')}</Text>
                            <Text style={styles.debugText}>{this.state.error?.toString()}</Text>
                        </View>
                    </View>
                </SafeAreaView>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        padding: 24,
        alignItems: 'center',
        width: '100%',
    },
    iconContainer: {
        marginBottom: 20,
        backgroundColor: '#FEF2F2',
        padding: 20,
        borderRadius: 50,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: 12,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        color: Colors.secondary,
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 24,
    },
    button: {
        backgroundColor: Colors.iosBlue,
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
        shadowColor: Colors.iosBlue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    debugContainer: {
        marginTop: 40,
        padding: 12,
        backgroundColor: '#F1F5F9',
        borderRadius: 8,
        width: '100%',
    },
    debugTitle: {
        fontWeight: '700',
        color: Colors.critical,
        marginBottom: 4,
    },
    debugText: {
        color: Colors.textPrimary,
        fontSize: 12,
    },
});
