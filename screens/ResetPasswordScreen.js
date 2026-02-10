import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../AuthContext';
import { Colors } from '../Theme';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

export default function ResetPasswordScreen({ navigation }) {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const { updatePassword, signOut } = useAuth(); // Import signOut to allow cancelling
    const { t } = useTranslation();

    const handleUpdatePassword = async () => {
        if (!password || !confirmPassword) {
            Alert.alert(t("missing_info_title"), t("signup_fields_required"));
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert(t("passwords_do_not_match"), t("passwords_mismatch_message"));
            return;
        }

        if (password.length < 6) {
            Alert.alert(t("weak_password"), t("password_length_warning"));
            return;
        }

        setLoading(true);
        try {
            const { error } = await updatePassword(password);
            if (error) {
                Alert.alert(t("error"), error.message);
            } else {
                Alert.alert(t("successful"), t("password_update_success"));
                // Navigation might be handled by AuthContext state change, 
                // but if not, we technically are signed in with the new password now?
                // Actually, after updatePassword, we might want to just let the user use the app.
                // But we need to clear the "password recovery" state in AuthContext.
            }
        } catch (error) {
            Alert.alert(t("error"), error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async () => {
        // If they cancel, we probably want to sign them out so they go back to login?
        // Or just navigate to home if they are technically logged in?
        // Since they came from a recovery link, they are logged in. 
        // Safest is to just go to home or sign out. 
        // If we go to home, they have a session but haven't changed password.
        // Let's assume they want to sign out if they don't reset.
        await signOut();
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={styles.header}>
                    <Ionicons name="key-outline" size={80} color={Colors.iosBlue} />
                    <Text style={styles.title}>{t("reset_password_title")}</Text>
                    <Text style={styles.subtitle}>{t("reset_password_subtitle")}</Text>
                </View>

                <TextInput
                    style={styles.input}
                    placeholder={t("new_password")}
                    placeholderTextColor={Colors.secondary}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />
                <TextInput
                    style={styles.input}
                    placeholder={t("confirm_new_password")}
                    placeholderTextColor={Colors.secondary}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                />

                <TouchableOpacity
                    style={[styles.button, styles.buttonSolid, loading && styles.buttonDisabled]}
                    onPress={handleUpdatePassword}
                    disabled={loading}
                >
                    <Text style={styles.buttonSolidText}>
                        {loading ? t("updating") : t("update_password")}
                    </Text>
                </TouchableOpacity>

                {/* Option to cancel/logout if they landed here by mistake */}
                <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleCancel}
                    disabled={loading}
                >
                    <Text style={styles.cancelButtonText}>{t("cancel")}</Text>
                </TouchableOpacity>

            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 48,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: Colors.text,
        marginTop: 16,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: Colors.secondary,
        marginTop: 8,
        textAlign: 'center',
    },
    input: {
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 16,
        fontSize: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        color: Colors.text,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.05,
        shadowRadius: 2.22,
        elevation: 2,
    },
    button: {
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 8,
    },
    buttonSolid: {
        backgroundColor: Colors.iosBlue,
        shadowColor: Colors.iosBlue,
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.3,
        shadowRadius: 3.84,
        elevation: 5,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonSolidText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '600',
    },
    cancelButton: {
        marginTop: 16,
        alignSelf: 'center',
        padding: 10,
    },
    cancelButtonText: {
        color: Colors.secondary,
        fontSize: 16,
    }
});
