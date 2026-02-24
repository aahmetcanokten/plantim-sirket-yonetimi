import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, useWindowDimensions } from 'react-native';
import { useAuth } from '../AuthContext'; // useAuth hook'unu import et
import { Colors } from '../Theme';
import { Ionicons } from '@expo/vector-icons'; // İkon kütüphanesi
import { useTranslation } from 'react-i18next';


export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState(null); // YENİ: Hata mesajı state'i

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
    setErrorMsg(null); // Reset error
    try {
      const { error } = await signIn(email, password);
      if (error) {
        // Hata mesajını düzgün göster
        if (error.message.includes("Invalid login credentials")) {
          setErrorMsg(t("login_error_invalid_credentials"));
        } else {
          setErrorMsg(error.message);
        }
        Alert.alert(t("login_failed"), error.message.includes("Invalid login credentials") ? t("login_error_invalid_credentials") : error.message);
      }
    } catch (error) {
      setErrorMsg(error.message);
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


  const { width } = useWindowDimensions();
  const isMobileWeb = Platform.OS === 'web' && width < 1024;
  const isVerySmall = width < 600;

  // Mobil Arayüz (Native App)
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
            errorMsg={errorMsg}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Web Arayüzü (Responsive Design)
  return (
    <ScrollView
      style={styles.webContainer}
      contentContainerStyle={{ flexGrow: 1, flexDirection: isMobileWeb ? 'column' : 'row' }}
      showsVerticalScrollIndicator={false}
    >
      {/* Sol Taraf: Pazarlama / Tanıtım (Mobilde Üst Kısma Geçer veya Küçülür) */}
      <View style={[
        styles.webLeftPanel,
        isMobileWeb && { flex: 0, padding: isVerySmall ? 24 : 40, paddingTop: 60 }
      ]}>
        <View style={styles.webBranding}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: isMobileWeb ? 24 : 40 }}>
            <View style={styles.webLogoIcon}>
              <Ionicons name="leaf" size={isVerySmall ? 24 : 32} color={Colors.iosBlue} />
            </View>
            <Text style={[styles.webLogoText, isVerySmall && { fontSize: 24 }]}>PLANTİM <Text style={{ fontWeight: '400', opacity: 0.8 }}>ERP</Text></Text>
          </View>

          <Text style={[styles.webHeroTitle, isMobileWeb && { fontSize: isVerySmall ? 28 : 36, lineHeight: isVerySmall ? 34 : 42, marginBottom: 16 }]}>
            {t("web_hero_title")}
          </Text>

          {!isVerySmall && (
            <Text style={[styles.webHeroSub, isMobileWeb && { fontSize: 16, lineHeight: 24, marginBottom: 32 }]}>
              {t("web_hero_sub")}
            </Text>
          )}

          {!isMobileWeb && (
            <>
              <View style={styles.businessGrid}>
                <View style={styles.businessRow}>
                  <BusinessFeature
                    icon="cube"
                    title={t("web_feature_stock")}
                    desc={t("web_feature_stock_desc")}
                  />
                  <BusinessFeature
                    icon="trending-up"
                    title={t("web_feature_reports")}
                    desc={t("web_feature_reports_desc")}
                  />
                </View>
                <View style={styles.businessRow}>
                  <BusinessFeature
                    icon="people"
                    title={t("web_feature_personnel")}
                    desc={t("web_feature_personnel_desc")}
                  />
                  <BusinessFeature
                    icon="shield-checkmark"
                    title={t("web_feature_security")}
                    desc={t("web_feature_security_desc")}
                  />
                </View>
              </View>

              <View style={styles.trustContainer}>
                <TrustStat stat={t("web_trust_stat_1")} desc={t("web_trust_desc_1")} />
                <View style={styles.trustDivider} />
                <TrustStat stat={t("web_trust_stat_2")} desc={t("web_trust_desc_2")} />
                <View style={styles.trustDivider} />
                <TrustStat stat={t("web_trust_stat_3")} desc={t("web_trust_desc_3")} />
              </View>
            </>
          )}
        </View>

        {!isMobileWeb && (
          <View style={styles.webFooter}>
            <Text style={styles.webFooterText}>&copy; 2026 Plantim Kurumsal Yazılım Teknolojileri</Text>
          </View>
        )}
      </View>

      {/* Sağ Taraf: Giriş Formu */}
      <View style={[
        styles.webRightPanel,
        isMobileWeb && { flex: 1, padding: isVerySmall ? 16 : 40, paddingBottom: 60 }
      ]}>
        <View style={[
          styles.webFormCard,
          isMobileWeb && { padding: isVerySmall ? 24 : 32, shadowOpacity: 0.05, elevation: 2 }
        ]}>
          <View style={{ alignItems: 'center', marginBottom: isVerySmall ? 24 : 40 }}>
            <View style={[styles.formIconContainer, isVerySmall && { width: 48, height: 48, borderRadius: 14 }]}>
              <Ionicons name={isLoginView ? "lock-open-outline" : "person-add-outline"} size={isVerySmall ? 24 : 32} color={Colors.iosBlue} />
            </View>
            <Text style={[styles.formTitle, isVerySmall && { fontSize: 24 }]}>{isLoginView ? t("welcome_back") : t("create_account")}</Text>
            <Text style={[styles.formSub, isVerySmall && { fontSize: 14 }]}>{isLoginView ? t("login_to_continue") : t("signup_to_start")}</Text>
          </View>

          <LoginForm
            email={email} setEmail={setEmail}
            password={password} setPassword={setPassword}
            confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword}
            isLoginView={isLoginView} setIsLoginView={setIsLoginView}
            loading={loading} handleLogin={handleLogin} handleSignUp={handleSignUp}
            handlePasswordReset={handlePasswordReset} toggleView={toggleView}
            t={t}
            errorMsg={errorMsg}
          />

          <View style={[styles.formFooter, isVerySmall && { marginTop: 24, paddingTop: 16 }]}>
            <Text style={styles.formFooterText}>{t("web_footer_text")}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

// Yardımcı Bileşenler
const BusinessFeature = ({ icon, title, desc }) => (
  <View style={styles.businessCard}>
    <View style={styles.businessIconBg}>
      <Ionicons name={icon} size={24} color="#fff" />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.businessTitle}>{title}</Text>
      <Text style={styles.businessDesc}>{desc}</Text>
    </View>
  </View>
);

const TrustStat = ({ stat, desc }) => (
  <View style={styles.trustItem}>
    <Text style={styles.trustStatText}>{stat}</Text>
    <Text style={styles.trustDescText}>{desc}</Text>
  </View>
);

const LoginForm = ({
  email, setEmail, password, setPassword, confirmPassword, setConfirmPassword,
  isLoginView, loading, handleLogin, handleSignUp, handlePasswordReset, toggleView, t, errorMsg
}) => (
  <View style={{ width: '100%' }}>
    {errorMsg && (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={20} color="#fff" />
        <Text style={styles.errorText}>{errorMsg}</Text>
      </View>
    )}

    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{t("email")}</Text>
      <View style={styles.inputWrapper}>
        <Ionicons name="mail-outline" size={20} color={Colors.muted} style={styles.inputIcon} />
        <TextInput
          style={styles.webInput}
          placeholder="email@sirketiniz.com"
          placeholderTextColor={Colors.muted}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          selectTextOnFocus={Platform.OS === 'web'}
        />
      </View>
    </View>

    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{t("password")}</Text>
      <View style={styles.inputWrapper}>
        <Ionicons name="lock-closed-outline" size={20} color={Colors.muted} style={styles.inputIcon} />
        <TextInput
          style={styles.webInput}
          placeholder="••••••••"
          placeholderTextColor={Colors.muted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          selectTextOnFocus={Platform.OS === 'web'}
        />
      </View>
    </View>

    {!isLoginView && (
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>{t("password_confirm")}</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="shield-outline" size={20} color={Colors.muted} style={styles.inputIcon} />
          <TextInput
            style={styles.webInput}
            placeholder="••••••••"
            placeholderTextColor={Colors.muted}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            selectTextOnFocus={Platform.OS === 'web'}
          />
        </View>
      </View>
    )}

    {isLoginView && (
      <TouchableOpacity style={styles.forgotPasswordLink} onPress={handlePasswordReset} disabled={loading}>
        <Text style={styles.forgotPasswordText}>{t("forgot_password")}</Text>
      </TouchableOpacity>
    )}

    <TouchableOpacity
      style={[styles.mainButton, loading && styles.buttonDisabled]}
      onPress={isLoginView ? handleLogin : handleSignUp}
      disabled={loading}
    >
      <Text style={styles.mainButtonText}>
        {loading ? t("processing") || "..." : (isLoginView ? t("login") : t("register"))}
      </Text>
      <Ionicons name="arrow-forward" size={20} color="#fff" />
    </TouchableOpacity>

    <TouchableOpacity style={styles.toggleViewButton} onPress={toggleView} disabled={loading}>
      <Text style={styles.toggleText}>
        {isLoginView ? t("no_account") : t("has_account")}
        <Text style={styles.toggleTextBold}> {isLoginView ? t("register") : t("login")}</Text>
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
    fontSize: 14,
    fontWeight: '600',
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

  // WEB STYLES (ENHANCED)
  webContainer: {
    flex: 1,
    flexDirection: 'row',
    height: '100vh',
    width: '100%',
    backgroundColor: '#F8FAFC',
  },
  webLeftPanel: {
    flex: 1.2,
    backgroundColor: '#0F172A', // Dark Slate for premium look
    padding: 80,
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  webRightPanel: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  webBranding: {
    zIndex: 2,
    maxWidth: 640,
  },
  webLogoIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.iosBlue,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  webLogoText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '800',
    marginLeft: 20,
    letterSpacing: -0.5,
  },
  webHeroTitle: {
    fontSize: 48,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 24,
    lineHeight: 58,
    letterSpacing: -1,
  },
  webHeroSub: {
    fontSize: 20,
    color: '#94A3B8',
    marginBottom: 48,
    lineHeight: 32,
    fontWeight: '400',
  },
  businessGrid: {
    marginBottom: 60,
  },
  businessRow: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 24,
  },
  businessCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  businessIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.iosBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  businessTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  businessDesc: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 20,
  },
  trustContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  trustItem: {
    flex: 1,
    alignItems: 'center',
  },
  trustDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  trustStatText: {
    color: Colors.iosBlue,
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 2,
  },
  trustDescText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  webFooter: {
    position: 'absolute',
    bottom: 40,
    left: 80,
  },
  webFooterText: {
    color: '#475569',
    fontSize: 14,
  },
  webFormCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#fff',
    padding: 48,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 10,
  },
  formIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#F0F7FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  formSub: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  webInput: {
    flex: 1,
    height: 52,
    fontSize: 16,
    color: '#0F172A',
    ...Platform.select({
      web: { outlineStyle: 'none' }
    })
  },
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  mainButton: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    ...Platform.select({
      web: { cursor: 'pointer', transition: 'all 0.2s' }
    })
  },
  mainButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  toggleViewButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  toggleText: {
    color: '#64748B',
    fontSize: 15,
  },
  toggleTextBold: {
    color: Colors.iosBlue,
    fontWeight: '700',
  },
  formFooter: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    alignItems: 'center',
  },
  formFooterText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  errorText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
});
