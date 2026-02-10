import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../AuthContext'; // useAuth hook'unu import et
import { Colors } from '../Theme';
import { Ionicons } from '@expo/vector-icons'; // İkon kütüphanesi
import { useTranslation } from 'react-i18next';


export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // YENİ: Ekranın "giriş" mi yoksa "kayıt" modunda mı olduğunu tutan state
  const [isLoginView, setIsLoginView] = useState(true);

  const [loading, setLoading] = useState(false);


  const { signIn, signUp, resetPassword } = useAuth();
  const { t } = useTranslation();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(t("missing_info_title"), t("login_email_password_required"));
      return;
    }
    setLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        Alert.alert(t("login_failed"), error.message);
      }
    } catch (error) {
      Alert.alert(t("error"), t("login_error_prefix") + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword) {
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
      const { user, session, error } = await signUp(email, password);

      if (error) {
        Alert.alert(t("signup_failed"), error.message);
      } else {
        // Kayıt başarılı, kullanıcıyı bilgilendir
        Alert.alert(t("successful"), t("signup_success_verify_email_web"));

        // Kayıt sonrası alanları temizle ve giriş moduna (varsayılan) dön
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        // Eğer session oluştuysa zaten App.js kullanıcıyı içeri alacaktır.
      }
    } catch (error) {
      Alert.alert(t("error"), t("signup_error_prefix") + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = () => {
    if (!email) {
      Alert.alert(t("email_required"), t("reset_password_email_required_message"));
      return;
    }
    Alert.alert(
      t("password_reset"),
      t("reset_link_confirmation", { email }),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("send"),
          style: "default",
          onPress: async () => {
            setLoading(true);
            const { error } = await resetPassword(email);
            setLoading(false);
            if (error) {
              Alert.alert(t("error"), error.message);
            } else {
              Alert.alert(t("successful"), t("reset_link_sent_success"));
            }
          }
        }
      ]
    );
  };

  // YENİ: Görünümü değiştiren fonksiyon
  const toggleView = () => {
    setIsLoginView(!isLoginView);
    // Mod değiştirirken şifre alanlarını temizle
    setPassword('');
    setConfirmPassword('');
  };


  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Ionicons name="leaf-outline" size={80} color={Colors.iosBlue} />
          <Text style={styles.title}>PLANTİM</Text>
          <Text style={styles.subtitle}>{t("login_slogan")}</Text>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={Colors.secondary}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder={t("password")}
          placeholderTextColor={Colors.secondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {/* YENİ: Sadece Kayıt Ol modunda göster */}
        {!isLoginView && (
          <TextInput
            style={styles.input}
            placeholder={t("password_confirm")}
            placeholderTextColor={Colors.secondary}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
        )}

        {/* GÜNCELLENDİ: Koşullu buton gösterimi */}
        {isLoginView ? (
          <>
            {/* --- GİRİŞ GÖRÜNÜMÜ --- */}
            <TouchableOpacity
              style={[styles.button, styles.buttonSolid, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={styles.buttonSolidText}>
                {loading ? t("logging_in") : t("login")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.forgotPassword}
              onPress={handlePasswordReset}
              disabled={loading}
            >
              <Text style={styles.forgotPasswordText}>{t("forgot_password")}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* --- KAYIT OL GÖRÜNÜMÜ --- */}
            <TouchableOpacity
              style={[styles.button, styles.buttonSolid, loading && styles.buttonDisabled]}
              onPress={handleSignUp}
              disabled={loading}
            >
              <Text style={styles.buttonSolidText}>
                {loading ? t("signing_up") : t("register")}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* --- GÖRÜNÜM DEĞİŞTİRME BUTONU --- */}
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={toggleView}
          disabled={loading}
        >
          <Text style={styles.toggleButtonText}>
            {isLoginView
              ? t("no_account")
              : t("has_account")
            }
            <Text style={styles.toggleButtonTextBold}>
              {isLoginView ? t("register") : t("login")}
            </Text>
          </Text>
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
    fontSize: 40,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.secondary,
    marginTop: 8,
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

  forgotPassword: {
    marginTop: 24,
    alignSelf: 'center',
  },
  forgotPasswordText: {
    color: Colors.iosBlue,
    fontSize: 15,
    fontWeight: '500',
  },
  // YENİ: Görünüm değiştirme butonu stilleri
  toggleButton: {
    marginTop: 20,
    alignSelf: 'center',
  },
  toggleButtonText: {
    color: Colors.secondary, // Soluk renk
    fontSize: 15,
    textAlign: 'center',
    fontWeight: '500',
  },
  toggleButtonTextBold: {
    color: Colors.iosBlue, // Vurgu rengi
    fontWeight: 'bold',
  },
});