import React, { useState, useEffect, useRef } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Dimensions, Vibration } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../Theme';
import { useTranslation } from "react-i18next";

const { width, height } = Dimensions.get('window');

export default function BarcodeScannerModal({ visible, onClose, onScanned }) {
    const { t } = useTranslation();
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const lastScanTime = useRef(0); // Son okuma zamanını takip et

    useEffect(() => {
        if (visible) {
            setScanned(false);
            lastScanTime.current = 0; // Modal açıldığında zamanlayıcıyı sıfırla
            if (!permission) {
                requestPermission();
            }
        }
    }, [visible, permission]);

    const handleBarCodeScanned = ({ type, data }) => {
        const now = Date.now();
        // 1.5 saniye içinde tekrar okumayı engelle (Debounce)
        if (scanned || (now - lastScanTime.current < 1500)) return;

        lastScanTime.current = now;
        setScanned(true);

        // Hafif titreşim ile geri bildirim ver
        Vibration.vibrate(100);

        // Veriyi üst bileşene gönder
        onScanned(data);

        // Modalı kapat
        onClose();
    };

    if (!permission) {
        // Camera permissions are still loading.
        return <View />;
    }

    if (!permission.granted) {
        return (
            <Modal visible={visible} animationType="slide" transparent={false}>
                <View style={styles.container}>
                    <View style={styles.permissionContent}>
                        <Ionicons name="camera-outline" size={64} color="#fff" style={{ marginBottom: 20 }} />
                        <Text style={styles.permissionTitle}>{t('camera_permission_title')}</Text>
                        <Text style={styles.message}>
                            {t('camera_permission_message')}
                        </Text>
                        <TouchableOpacity onPress={requestPermission} style={styles.button}>
                            <Text style={styles.buttonText}>{t('allow')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={onClose} style={[styles.button, styles.cancelButton]}>
                            <Text style={[styles.buttonText, styles.cancelButtonText]}>{t('give_up')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        );
    }

    return (
        <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
            <View style={styles.container}>
                <CameraView
                    style={styles.camera}
                    facing="back"
                    onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                    barcodeScannerSettings={{
                        barcodeTypes: [
                            "qr", "ean13", "ean8", "upc_a", "upc_e",
                            "code128", "code39", "code93", "itf14",
                            "codabar", "pdf417", "aztec", "datamatrix"
                        ],
                    }}
                >
                    <View style={styles.overlay}>
                        <View style={styles.topOverlay}>
                            <Text style={styles.scanText}>{t('scan_barcode_instruction')}</Text>
                        </View>
                        <View style={styles.middleOverlay}>
                            <View style={styles.sideOverlay} />
                            <View style={styles.focusedContainer}>
                                <View style={styles.cornerTopLeft} />
                                <View style={styles.cornerTopRight} />
                                <View style={styles.cornerBottomLeft} />
                                <View style={styles.cornerBottomRight} />
                            </View>
                            <View style={styles.sideOverlay} />
                        </View>
                        <View style={styles.bottomOverlay}>
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <Ionicons name="close" size={32} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </CameraView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: '#000',
    },
    permissionContent: {
        padding: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    permissionTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 10,
        textAlign: 'center',
    },
    message: {
        textAlign: 'center',
        paddingBottom: 30,
        color: '#ccc',
        fontSize: 16,
        lineHeight: 24,
    },
    camera: {
        flex: 1,
    },
    button: {
        backgroundColor: Colors.primary || '#007AFF',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        marginVertical: 8,
        width: '100%',
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginTop: 10,
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    cancelButtonText: {
        color: '#fff',
    },
    overlay: {
        flex: 1,
    },
    topOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    middleOverlay: {
        flexDirection: 'row',
        height: 250,
    },
    sideOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    focusedContainer: {
        width: 250,
        height: 250,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        position: 'relative',
    },
    bottomOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 40,
    },
    scanText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
        marginTop: 40,
    },
    closeButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cornerTopLeft: { position: 'absolute', top: 0, left: 0, width: 20, height: 20, borderTopWidth: 4, borderLeftWidth: 4, borderColor: Colors.primary || '#007AFF' },
    cornerTopRight: { position: 'absolute', top: 0, right: 0, width: 20, height: 20, borderTopWidth: 4, borderRightWidth: 4, borderColor: Colors.primary || '#007AFF' },
    cornerBottomLeft: { position: 'absolute', bottom: 0, left: 0, width: 20, height: 20, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: Colors.primary || '#007AFF' },
    cornerBottomRight: { position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, borderBottomWidth: 4, borderRightWidth: 4, borderColor: Colors.primary || '#007AFF' },
});
