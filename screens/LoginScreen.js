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


  // Mobil Arayüz
  if (Platform.OS !== 'web') {
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

          <LoginForm
            email={email} setEmail={setEmail}
            password={password} setPassword={setPassword}
            confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword}
            isLoginView={isLoginView} setIsLoginView={setIsLoginView}
            loading={loading} handleLogin={handleLogin} handleSignUp={handleSignUp}
            handlePasswordReset={handlePasswordReset} toggleView={toggleView}
            t={t}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Web Arayüzü (Split Screen)
  return (
    <View style={styles.webContainer}>
      {/* Sol Taraf: Pazarlama / Tanıtım */}
      <View style={styles.webLeftPanel}>
        <View style={styles.webBranding}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
            <Ionicons name="leaf" size={48} color="#fff" />
            <Text style={styles.webLogoText}>PLANTİM ERP</Text>
          </View>

          <Text style={styles.webHeroTitle}>{t("web_hero_title") || "İşletmenizi Geleceğe Taşıyın"}</Text>
          <Text style={styles.webHeroSub}>{t("web_hero_sub") || "Bulut tabanlı stok, cari ve personel yönetimi ile kontrol tamamen sizde."}</Text>

          <View style={styles.featureList}>
            <FeatureItem icon="cube-outline" text={t("web_feature_stock") || "Gelişmiş Stok Takibi"} />
            <FeatureItem icon="bar-chart-outline" text={t("web_feature_reports") || "Detaylı Satış Analizleri"} />
            <FeatureItem icon="people-outline" text={t("web_feature_personnel") || "Personel ve Görev Yönetimi"} />
            <FeatureItem icon="phone-portrait-outline" text={t("web_feature_mobile") || "Mobilden ve Webden Erişim"} />
          </View>
        </View>

        <View style={styles.webFooter}>
          <Text style={styles.webFooterText}>{t("web_footer_text") || "Hemen ücretsiz hesabınızı oluşturun."}</Text>
        </View>
      </View>

      {/* Sağ Taraf: Giriş Formu */}
      <View style={styles.webRightPanel}>
        <View style={styles.webFormContainer}>
          <View style={{ alignItems: 'center', marginBottom: 30 }}>
            <Ionicons name="leaf-outline" size={60} color={Colors.iosBlue} />
            <Text style={styles.formTitle}>{isLoginView ? t("welcome_back") : t("create_account")}</Text>
            <Text style={styles.formSub}>{isLoginView ? t("login_to_continue") : t("signup_to_start")}</Text>
          </View>

          <LoginForm
            email={email} setEmail={setEmail}
            password={password} setPassword={setPassword}
            confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword}
            isLoginView={isLoginView} setIsLoginView={setIsLoginView}
            loading={loading} handleLogin={handleLogin} handleSignUp={handleSignUp}
            handlePasswordReset={handlePasswordReset} toggleView={toggleView}
            t={t}
          />
        </View>
      </View>
    </View>
  );
}

// Yardımcı Bileşenler
const FeatureItem = ({ icon, text }) => (
  <View style={styles.featureItem}>
    <View style={styles.featureIconBg}>
      <Ionicons name={icon} size={24} color="#fff" />
    </View>
    <Text style={styles.featureText}>{text}</Text>
  </View>
);

const LoginForm = ({
  email, setEmail, password, setPassword, confirmPassword, setConfirmPassword,
  isLoginView, loading, handleLogin, handleSignUp, handlePasswordReset, toggleView, t
}) => (
  <View style={{ width: '100%' }}>
    <TextInput
      style={styles.input}
      placeholder="Email"
      placeholderTextColor={Colors.secondary}
      value={email}
      onChangeText={setEmail}
      keyboardType="email-address"
      autoCapitalize="none"
      selectTextOnFocus={Platform.OS === 'web'}
    />
    <TextInput
      style={styles.input}
      placeholder={t("password")}
      placeholderTextColor={Colors.secondary}
      value={password}
      onChangeText={setPassword}
      secureTextEntry
      selectTextOnFocus={Platform.OS === 'web'}
    />

    {!isLoginView && (
      <TextInput
        style={styles.input}
        placeholder={t("password_confirm")}
        placeholderTextColor={Colors.secondary}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        selectTextOnFocus={Platform.OS === 'web'}
      />
    )}

    {isLoginView ? (
      <>
        <TouchableOpacity
          style={[styles.button, styles.buttonSolid, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonSolidText}>{loading ? t("logging_in") : t("login")}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.forgotPassword} onPress={handlePasswordReset} disabled={loading}>
          <Text style={styles.forgotPasswordText}>{t("forgot_password")}</Text>
        </TouchableOpacity>
      </>
    ) : (
      <TouchableOpacity
        style={[styles.button, styles.buttonSolid, loading && styles.buttonDisabled]}
        onPress={handleSignUp}
        disabled={loading}
      >
        <Text style={styles.buttonSolidText}>{loading ? t("signing_up") : t("register")}</Text>
      </TouchableOpacity>
    )}

    <TouchableOpacity style={styles.toggleButton} onPress={toggleView} disabled={loading}>
      <Text style={styles.toggleButtonText}>
        {isLoginView ? t("no_account") : t("has_account")}
        <Text style={styles.toggleButtonTextBold}> {isLoginView ? t("register") : t("login")}</Text>
      </Text>
    </TouchableOpacity>
  </View>
);

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
    width: '100%',
    ...Platform.select({
      web: { outlineStyle: 'none' }
    })
  },
  button: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    width: '100%',
    ...Platform.select({
      web: { cursor: 'pointer' }
    })
  },
  buttonSolid: {
    backgroundColor: Colors.iosBlue,
    shadowColor: Colors.iosBlue,
    shadowOffset: { width: 0, height: 2 },
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
    ...Platform.select({
      web: { cursor: 'pointer' }
    })
  },
  forgotPasswordText: {
    color: Colors.iosBlue,
    fontSize: 15,
    fontWeight: '500',
  },
  toggleButton: {
    marginTop: 20,
    alignSelf: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' }
    })
  },
  toggleButtonText: {
    color: Colors.secondary,
    fontSize: 15,
    textAlign: 'center',
    fontWeight: '500',
  },
  toggleButtonTextBold: {
    color: Colors.iosBlue,
    fontWeight: 'bold',
  },

  // WEB STYLES
  webContainer: {
    flex: 1,
    flexDirection: 'row',
    height: '100%',
    width: '100%',
    backgroundColor: '#fff',
  },
  webLeftPanel: {
    flex: 1.5, // Sol taraf biraz daha geniş olsun
    backgroundColor: Colors.iosBlue,
    padding: 60,
    justifyContent: 'center',
    display: 'flex', // Web için
    flexDirection: 'column',
  },
  webRightPanel: {
    flex: 1, // Sağ taraf
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#F1F5F9',
    minWidth: 400, // Çok küçülmesin
  },
  webFormContainer: {
    width: '100%',
    maxWidth: 360,
    padding: 20,
  },
  webBranding: {
    maxWidth: 600,
  },
  webLogoText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginLeft: 15,
    letterSpacing: 1,
  },
  webHeroTitle: {
    fontSize: 48,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 20,
    lineHeight: 56,
  },
  webHeroSub: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 40,
    lineHeight: 30,
  },
  featureList: {
    marginTop: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  featureIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  featureText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
  },
  webFooter: {
    position: 'absolute',
    bottom: 40,
    left: 60,
  },
  webFooterText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  formTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 10,
  },
  formSub: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 8,
  },
});