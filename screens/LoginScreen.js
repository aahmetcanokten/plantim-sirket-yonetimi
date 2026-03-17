import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, useWindowDimensions } from 'react-native';
import { useAuth } from '../AuthContext'; // useAuth hook'unu import et
import { Colors } from '../Theme';
import { Ionicons } from '@expo/vector-icons'; // İkon kütüphanesi
import { useTranslation } from 'react-i18next';


// YENİ PAZARLAMA BİLEŞENİ
const BrandingContent = ({ t, isMobileWeb, isVerySmall, setIsLoginView }) => (
  <>
    {isMobileWeb && (
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
        <View style={styles.webLogoIcon}>
          <Ionicons name="leaf" size={isVerySmall ? 24 : 32} color={Colors.iosBlue} />
        </View>
        <Text style={[styles.webLogoText, isVerySmall && { fontSize: 24 }]}>PLANTİM <Text style={{ fontWeight: '400', opacity: 0.8 }}>ERP</Text></Text>
      </View>
    )}

    <Text style={[styles.webHeroTitle, isMobileWeb && { fontSize: isVerySmall ? 32 : 40, lineHeight: isVerySmall ? 38 : 46, marginBottom: 16 }]}>
      {t("web_hero_title")}
    </Text>

    <Text style={[styles.webHeroSub, isMobileWeb && { fontSize: 16, lineHeight: 24, marginBottom: 32 }]}>
      {t("web_hero_sub")}
    </Text>

    {!isMobileWeb && (
      <TouchableOpacity
        style={styles.webHeroCta}
        onPress={() => setIsLoginView(false)}
      >
        <Text style={styles.webHeroCtaText}>{t("web_cta_register")}</Text>
        <Ionicons name="rocket-outline" size={20} color="#fff" />
      </TouchableOpacity>
    )}

    {!isMobileWeb && (
      <>
        <View style={styles.separator} />

        <View style={styles.whySection}>
          <Text style={styles.sectionHeading}>{t("web_why_erp_title")}</Text>
          <View style={styles.whyGrid}>
            <WhyItem icon="shield-outline" title={t("web_why_erp_1")} desc={t("web_why_erp_1_desc")} />
            <WhyItem icon="phone-portrait-outline" title={t("web_why_erp_2")} desc={t("web_why_erp_2_desc")} />
            <WhyItem icon="stats-chart-outline" title={t("web_why_erp_3")} desc={t("web_why_erp_3_desc")} />
          </View>
        </View>

        <View style={[styles.trustContainer, { marginTop: 40 }]}>
          <TrustStat stat={t("web_trust_stat_1")} desc={t("web_trust_desc_1")} />
          <View style={styles.trustDivider} />
          <TrustStat stat={t("web_trust_stat_2")} desc={t("web_trust_desc_2")} />
          <View style={styles.trustDivider} />
          <TrustStat stat={t("web_trust_stat_3")} desc={t("web_trust_desc_3")} />
        </View>

        <View style={{ marginTop: 60, opacity: 0.5 }}>
          <Text style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center' }}>
            <Ionicons name="lock-closed" size={12} color="#94A3B8" /> {t("web_trust_footer")}
          </Text>
        </View>
      </>
    )}
  </>
);


export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState(null); // YENİ: Hata mesajı state'i

  // YENİ: Ekranın "giriş" mi yoksa "kayıt" modunda mı olduğunu tutan state
  const [isLoginView, setIsLoginView] = useState(true);
  const [loginType, setLoginType] = useState('admin'); // 'admin' | 'personnel'

  // YENİ: Web sayfasındaki aktif sekme (login, about, solutions, pricing)
  const [activeTab, setActiveTab] = useState('login');

  const [loading, setLoading] = useState(false);


  const { signIn, signUp, resetPassword, signInPersonnel } = useAuth();
  const { t } = useTranslation();

  const handlePersonnelLogin = async () => {
    if (!username || !password) {
      Alert.alert(t("missing_info_title"), "Kullanıcı adı ve şifre gereklidir.");
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const { error } = await signInPersonnel(username, password);
      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          setErrorMsg("Giriş bilgileri hatalı.");
        } else {
          setErrorMsg(error.message);
        }
        Alert.alert("Giriş Başarısız", "Giriş bilgileri hatalı.");
      }
    } catch (error) {
      setErrorMsg(error.message);
      Alert.alert(t("error"), "Giriş Hatası: " + error.message);
    } finally {
      setLoading(false);
    }
  };

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

  // Sekme değiştirici
  const renderTabContent = () => {
    const backToLoginButton = (
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setActiveTab('login')}
      >
        <Ionicons name="arrow-back" size={18} color={Colors.iosBlue} />
        <Text style={styles.backButtonText}>{t("back_to_login") || "Giriş Ekranına Dön"}</Text>
      </TouchableOpacity>
    );

    switch (activeTab) {
      case 'about':
        return (
          <View style={styles.sectionWrapper}>
            {backToLoginButton}
            <AboutSection t={t} />
          </View>
        );
      case 'solutions':
        return (
          <View style={styles.sectionWrapper}>
            {backToLoginButton}
            <SolutionsSection t={t} />
          </View>
        );
      case 'pricing':
        return (
          <View style={styles.sectionWrapper}>
            {backToLoginButton}
            <PricingSection t={t} />
          </View>
        );
      case 'faq':
        return (
          <View style={styles.sectionWrapper}>
            {backToLoginButton}
            <InfoSection t={t} />
          </View>
        );
      default:
        return (
          <View style={[styles.webFormCard, isMobileWeb && { padding: isVerySmall ? 24 : 32, shadowOpacity: 0.05, elevation: 2 }]}>
            <View style={{ alignItems: 'center', marginBottom: isVerySmall ? 24 : 40 }}>
              <View style={[styles.formIconContainer, isVerySmall && { width: 48, height: 48, borderRadius: 14 }]}>
                <Ionicons name={isLoginView ? "lock-open-outline" : "person-add-outline"} size={isVerySmall ? 24 : 32} color={Colors.iosBlue} />
              </View>
              <Text style={[styles.formTitle, isVerySmall && { fontSize: 24 }]}>{isLoginView ? t("welcome_back") || "Tekrar Hoş Geldiniz" : t("create_account") || "Hesap Oluşturun"}</Text>
              <Text style={[styles.formSub, isVerySmall && { fontSize: 14 }]}>{isLoginView ? t("login_to_continue") || "Devam etmek için giriş yapın" : t("signup_to_start") || "Başlamak için ücretsiz kayıt olun"}</Text>
            </View>

            <LoginForm
              email={email} setEmail={setEmail}
              username={username} setUsername={setUsername}
              password={password} setPassword={setPassword}
              confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword}
              isLoginView={isLoginView} setIsLoginView={setIsLoginView}
              loginType={loginType} setLoginType={setLoginType}
              loading={loading} handleLogin={handleLogin} handlePersonnelLogin={handlePersonnelLogin} handleSignUp={handleSignUp}
              handlePasswordReset={handlePasswordReset} toggleView={toggleView}
              t={t}
              errorMsg={errorMsg}
            />

            <View style={[styles.formFooter, isVerySmall && { marginTop: 24, paddingTop: 16 }]}>
              <Text style={styles.formFooterText}>{t("web_footer_text")}</Text>
            </View>
          </View>
        );
    }
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
            username={username} setUsername={setUsername}
            password={password} setPassword={setPassword}
            confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword}
            isLoginView={isLoginView} setIsLoginView={setIsLoginView}
            loginType={loginType} setLoginType={setLoginType}
            loading={loading} handleLogin={handleLogin} handlePersonnelLogin={handlePersonnelLogin} handleSignUp={handleSignUp}
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
    <View style={[styles.webWrapper, Platform.OS === 'web' && { height: '100vh', overflow: 'hidden' }]}>
      {/* GLOBAL HEADER */}
      {Platform.OS === 'web' && !isMobileWeb && (
        <View style={styles.webGlobalHeader}>
          <View style={styles.headerContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.webLogoIcon, { width: 36, height: 36, borderRadius: 10 }]}>
                <Ionicons name="leaf" size={18} color={Colors.iosBlue} />
              </View>
              <Text style={[styles.headerLogoText, { fontSize: 20, marginLeft: 10 }]}>PLANTİM <Text style={{ fontWeight: '400', color: Colors.iosBlue }}>ERP</Text></Text>
            </View>
            <View style={styles.headerNavLinks}>
              <TouchableOpacity onPress={() => setActiveTab('login')}><Text style={[styles.headerNavLink, activeTab === 'login' && styles.headerNavLinkActive]}>{t('nav_login')}</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setActiveTab('about')}><Text style={[styles.headerNavLink, activeTab === 'about' && styles.headerNavLinkActive]}>{t('nav_about')}</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setActiveTab('solutions')}><Text style={[styles.headerNavLink, activeTab === 'solutions' && styles.headerNavLinkActive]}>{t('nav_solutions')}</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setActiveTab('pricing')}><Text style={[styles.headerNavLink, activeTab === 'pricing' && styles.headerNavLinkActive]}>{t('nav_pricing')}</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setActiveTab('faq')}><Text style={[styles.headerNavLink, activeTab === 'faq' && styles.headerNavLinkActive]}>{t('nav_faq') || "SSS"}</Text></TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.headerCta}
              onPress={() => { setIsLoginView(false); setActiveTab('login'); }}
            >
              <Text style={styles.headerCtaText}>{t("register")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Desktop Design */}
      {!isMobileWeb && (
        <View style={[styles.webContainer, { flexDirection: 'row' }]}>
          {/* Sol Taraf: Pazarlama / Tanıtım */}
          <ScrollView
            style={styles.webLeftPanel}
            contentContainerStyle={{ flexGrow: 1, padding: 60, paddingTop: 80, paddingBottom: 60 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.webBranding}>
              <BrandingContent t={t} isMobileWeb={isMobileWeb} isVerySmall={isVerySmall} setIsLoginView={setIsLoginView} />
            </View>

            <View style={styles.webFooter}>
              <Text style={styles.webFooterText}>&copy; 2026 Plantim Kurumsal Yazılım Teknolojileri</Text>
            </View>
          </ScrollView>

          {/* Sağ Taraf: Değişen Panel (Form, About, vb.) */}
          <ScrollView
            style={styles.webRightPanel}
            contentContainerStyle={{ flexGrow: 1, padding: 40, paddingTop: 80, justifyContent: 'flex-start', alignItems: 'center' }}
            showsVerticalScrollIndicator={false}
          >
            {renderTabContent()}
          </ScrollView>
        </View>
      )}

      {/* Mobile Web Design */}
      {isMobileWeb && (
        <ScrollView
          style={styles.webContainer}
          contentContainerStyle={{ flexGrow: 1, padding: isVerySmall ? 16 : 24, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Branding Logo */}
          <View style={{ marginBottom: 24 }}>
            <BrandingContent t={t} isMobileWeb={isMobileWeb} isVerySmall={isVerySmall} setIsLoginView={setIsLoginView} />
          </View>

          {/* Main Content (Form) */}
          <View style={{ width: '100%', alignItems: 'center', marginBottom: 40 }}>
            {renderTabContent()}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

// YENİ EKLENEN SEKMELER (About, Solutions, Pricing)
const AboutSection = ({ t }) => (
  <View style={styles.sectionCard}>
    <Text style={styles.sectionTitle}>{t('about_title') || "Hakkımızda"}</Text>
    <Text style={styles.sectionDesc}>{t('about_desc')}</Text>

    <View style={styles.featureBox}>
      <Ionicons name="rocket" size={32} color={Colors.iosBlue} />
      <Text style={styles.featureTitle}>{t('about_mission')}</Text>
      <Text style={styles.featureDesc}>{t('about_mission_desc')}</Text>
    </View>

    <View style={styles.featureBox}>
      <Ionicons name="eye" size={32} color={Colors.iosGreen} />
      <Text style={styles.featureTitle}>{t('about_vision')}</Text>
      <Text style={styles.featureDesc}>{t('about_vision_desc')}</Text>
    </View>
    <Text style={styles.sectionDesc}>{t('about_contact')}</Text>
  </View>
);

const SolutionsSection = ({ t }) => (
  <View style={styles.sectionCard}>
    <Text style={styles.sectionTitle}>{t('nav_solutions') || "Çözümlerimiz"}</Text>
    <Text style={styles.sectionDesc}>{t('solutions_desc')}</Text>

    <View style={styles.solutionGrid}>
      <SolutionItem icon="cube" title={t('sol_stock')} t={t} color="#6366F1" />
      <SolutionItem icon="people" title={t('sol_hr')} t={t} color="#10B981" />
      <SolutionItem icon="stats-chart" title={t('sol_finance')} t={t} color="#F59E0B" />
      <SolutionItem icon="hammer" title={t('sol_prod')} t={t} color="#EF4444" />
      <SolutionItem icon="business" title={t('sol_asset')} t={t} color="#8B5CF6" />
      <SolutionItem icon="cloud-done" title={t('web_feature_mobile')} t={t} color="#0A84FF" />
    </View>
  </View>
);

const SolutionItem = ({ icon, title, color }) => (
  <View style={styles.solutionGridItem}>
    <View style={[styles.solutionIconSmall, { backgroundColor: color + '15' }]}>
      <Ionicons name={icon} size={24} color={color} />
    </View>
    <Text style={styles.solutionGridTitle}>{title}</Text>
  </View>
);

const PricingSection = ({ t }) => (
  <View style={styles.sectionCard}>
    <Text style={styles.sectionTitle}>{t('nav_pricing') || "Ücretlendirme"}</Text>
    <Text style={styles.sectionDesc}>{t('pricing_desc')}</Text>

    <View style={styles.pricingGrid}>
      <View style={[styles.priceCard, { borderColor: '#E2E8F0' }]}>
        <Text style={styles.pricePlanName}>{t('pricing_starter')}</Text>
        <Text style={styles.priceAmount}>{t('pricing_free')}</Text>
        <View style={styles.priceDivider} />
        <PriceFeature text={t('pricing_s_1')} />
        <PriceFeature text={t('pricing_s_2')} />
        <PriceFeature text={t('pricing_s_3')} />
      </View>

      <View style={[styles.priceCard, styles.priceCardFeatured]}>
        <View style={styles.popularBadgeGlobal}><Text style={styles.popularBadgeText}>{t('pricing_popular')}</Text></View>
        <Text style={[styles.pricePlanName, { color: Colors.iosBlue }]}>{t('pricing_pro')}</Text>
        <Text style={styles.priceAmount}>299 ₺ <Text style={styles.pricePeriod}>{t('pricing_mo')}</Text></Text>
        <View style={styles.priceDivider} />
        <PriceFeature text={t('pricing_p_1')} />
        <PriceFeature text={t('pricing_p_2')} />
        <PriceFeature text={t('pricing_p_3')} />
        <PriceFeature text={t('web_feature_security')} bold />
      </View>
    </View>
  </View>
);

const PriceFeature = ({ text, bold }) => (
  <View style={styles.priceFeatureItem}>
    <Ionicons name="checkmark-circle" size={20} color={Colors.iosBlue} />
    <Text style={[styles.priceFeatureText, bold && { fontWeight: '700', color: '#1E293B' }]}>{text}</Text>
  </View>
);

const InfoSection = ({ t }) => (
  <View style={styles.sectionCard}>
    <Text style={styles.sectionTitle}>{t('web_faq_title')}</Text>
    <View style={{ gap: 16 }}>
      <WebFaqItem q={t("web_faq_1_q")} a={t("web_faq_1_a")} />
      <WebFaqItem q={t("web_faq_2_q")} a={t("web_faq_2_a")} />
      <WebFaqItem q={t("web_faq_3_q")} a={t("web_faq_3_a")} />
      <WebFaqItem q={t("web_faq_4_q")} a={t("web_faq_4_a")} />
      <WebFaqItem q={t("web_faq_5_q")} a={t("web_faq_5_a")} />
    </View>
  </View>
);

const WebFaqItem = ({ q, a }) => (
  <View style={{ backgroundColor: '#F8FAFC', padding: 24, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' }}>
    <Text style={{ fontSize: 17, fontWeight: '700', color: '#0F172A', marginBottom: 8 }}>{q}</Text>
    <Text style={{ fontSize: 15, color: '#475569', lineHeight: 22 }}>{a}</Text>
  </View>
);

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

const WhyItem = ({ icon, title, desc }) => (
  <View style={styles.whyItem}>
    <View style={styles.whyIconCircle}>
      <Ionicons name={icon} size={24} color={Colors.iosBlue} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.whyTitle}>{title}</Text>
      <Text style={styles.whyDesc}>{desc}</Text>
    </View>
  </View>
);

const FaqItem = ({ q, a }) => (
  <View style={styles.faqItem}>
    <Text style={styles.faqQ}>{q}</Text>
    <Text style={styles.faqA}>{a}</Text>
  </View>
);

const LoginForm = ({
  email, setEmail, username, setUsername, password, setPassword, confirmPassword, setConfirmPassword,
  isLoginView, loginType, setLoginType, loading, handleLogin, handlePersonnelLogin, handleSignUp, handlePasswordReset, toggleView, t, errorMsg
}) => (
  <View style={{ width: '100%' }}>
    {errorMsg && (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={20} color="#fff" />
        <Text style={styles.errorText}>{errorMsg}</Text>
      </View>
    )}

    {isLoginView && (
      <View style={{ flexDirection: 'row', marginBottom: 24, padding: 4, backgroundColor: '#F1F5F9', borderRadius: 12 }}>
        <TouchableOpacity 
          style={[{ flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 }, loginType === 'admin' && { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 }]} 
          onPress={() => setLoginType('admin')}
        >
          <Text style={{ fontWeight: loginType === 'admin' ? '600' : '500', color: loginType === 'admin' ? Colors.iosBlue : '#64748B' }}>Yönetici</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[{ flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 }, loginType === 'personnel' && { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 }]} 
          onPress={() => setLoginType('personnel')}
        >
          <Text style={{ fontWeight: loginType === 'personnel' ? '600' : '500', color: loginType === 'personnel' ? Colors.iosBlue : '#64748B' }}>Personel</Text>
        </TouchableOpacity>
      </View>
    )}

    {(!isLoginView || loginType === 'admin') ? (
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
    ) : (
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Kullanıcı Adı</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="person-outline" size={20} color={Colors.muted} style={styles.inputIcon} />
          <TextInput
            style={styles.webInput}
            placeholder="ahmetcan"
            placeholderTextColor={Colors.muted}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            selectTextOnFocus={Platform.OS === 'web'}
          />
        </View>
      </View>
    )}

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

    {isLoginView && loginType === 'admin' && (
      <TouchableOpacity style={styles.forgotPasswordLink} onPress={handlePasswordReset} disabled={loading}>
        <Text style={styles.forgotPasswordText}>{t("forgot_password")}</Text>
      </TouchableOpacity>
    )}

    <TouchableOpacity
      style={[styles.mainButton, loading && styles.buttonDisabled, (isLoginView && loginType === 'admin' ? {} : { marginTop: 24 })]}
      onPress={isLoginView ? (loginType === 'admin' ? handleLogin : handlePersonnelLogin) : handleSignUp}
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
    width: '100%',
    backgroundColor: '#F8FAFC',
  },
  webLeftPanel: {
    flex: 1.2,
    backgroundColor: '#020617',
    ...Platform.select({
      web: {
        backgroundImage: 'linear-gradient(135deg, #020617 0%, #0F172A 50%, #1E1B4B 100%)',
        height: '100%',
        overflowY: 'auto'
      }
    }),
  },
  webRightPanel: {
    flex: 1,
    backgroundColor: 'transparent',
    ...Platform.select({
      web: {
        height: '100%',
        overflowY: 'auto'
      }
    })
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
    fontSize: 18,
    color: '#94A3B8',
    marginBottom: 32,
    lineHeight: 28,
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
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    ...Platform.select({
      web: { backdropFilter: 'blur(16px)' }
    }),
    padding: 28,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
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
    marginTop: 'auto',
    alignSelf: 'flex-start',
    paddingTop: 40,
  },
  webFooterText: {
    color: '#475569',
    fontSize: 14,
  },
  webFormCard: {
    backgroundColor: '#ffffff',
    padding: 48,
    borderRadius: 32,
    width: '100%',
    maxWidth: 480,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.08,
    shadowRadius: 48,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
  },
  formIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#F0F7FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -1,
  },
  formSub: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 22,
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
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    ...Platform.select({
      web: { transition: 'border-color 0.2s ease, box-shadow 0.2s ease' }
    })
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
    backgroundColor: '#2563EB',
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    ...Platform.select({
      web: { cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }
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

  // YENI STYLES FOR SECTIONS
  webNavBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 60,
    width: '100%',
  },
  navLinks: {
    flexDirection: 'row',
    gap: 30,
  },
  navLink: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '500',
    transition: 'all 0.2s',
    ...Platform.select({ web: { cursor: 'pointer' } })
  },
  navLinkActive: {
    color: '#fff',
    fontWeight: '700',
    borderBottomWidth: 2,
    borderBottomColor: Colors.iosBlue,
    paddingBottom: 4,
  },
  scrollSection: {
    width: '100%',
    flex: 1,
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 48,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 20 },
    shadowRadius: 30,
    elevation: 8,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%'
  },
  sectionTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 16,
    letterSpacing: -1,
  },
  sectionDesc: {
    fontSize: 16,
    color: '#64748B',
    lineHeight: 24,
    marginBottom: 30,
  },
  featureBox: {
    backgroundColor: '#F8FAFC',
    padding: 24,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 8,
    color: '#1E293B',
  },
  featureDesc: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
  },
  solutionList: {
    marginTop: 10,
  },
  solutionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  solutionItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginLeft: 16,
  },
  pricingCardContainer: {
    flexDirection: 'column',
    gap: 20,
  },
  pricingCard: {
    padding: 30,
    borderRadius: 20,
    borderWidth: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  pricingPlan: {
    fontSize: 20,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 10,
  },
  pricingPrice: {
    fontSize: 36,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 20,
  },
  pricingDetail: {
    fontSize: 15,
    color: '#64748B',
    marginBottom: 8,
  },
  popularBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: Colors.iosBlue,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },

  // NEW MARKETING STYLES
  webHeroCta: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 36,
    paddingVertical: 18,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 12,
    marginBottom: 40,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    ...Platform.select({
      web: { transition: 'transform 0.2s ease, box-shadow 0.2s ease', cursor: 'pointer' }
    })
  },
  webHeroCtaText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 32,
    width: '100%',
  },
  sectionHeading: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  whySection: {
    marginBottom: 40,
  },
  whyGrid: {
    gap: 20,
  },
  whyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    ...Platform.select({
      web: { backdropFilter: 'blur(12px)' }
    }),
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  whyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 20,
  },
  whyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  whyDesc: {
    color: '#94A3B8',
    fontSize: 15,
    lineHeight: 22,
  },
  testimonialSection: {
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
    padding: 32,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.1)',
    marginTop: 20,
  },
  testimonialText: {
    color: '#fff',
    fontSize: 18,
    fontStyle: 'italic',
    lineHeight: 28,
    marginBottom: 16,
  },
  testimonialUser: {
    color: Colors.iosBlue,
    fontSize: 16,
    fontWeight: '700',
  },
  faqSection: {
    marginTop: 60,
  },
  faqItem: {
    marginBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: 20,
    borderRadius: 12,
  },
  faqQ: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
  },
  faqA: {
    color: '#94A3B8',
    fontSize: 15,
    lineHeight: 22,
  },

  // PREMIUN REFACTOR STYLES
  webWrapper: {
    flex: 1,
    backgroundColor: '#F1F5F9', // Slightly richer background
  },
  webGlobalHeader: {
    height: 76,
    backgroundColor: Platform.OS === 'web' ? 'rgba(255, 255, 255, 0.85)' : '#fff',
    ...Platform.select({
      web: { backdropFilter: 'blur(12px)' }
    }),
    justifyContent: 'center',
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226, 232, 240, 0.4)',
  },
  headerContainer: {
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  headerNavLinks: {
    flexDirection: 'row',
    gap: 24,
  },
  headerNavLink: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    ...Platform.select({ web: { cursor: 'pointer', transition: 'all 0.2s' } })
  },
  headerNavLinkActive: {
    color: '#0F172A',
    backgroundColor: '#E2E8F0', // Pill effect
  },
  headerCta: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  headerCtaText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  sectionWrapper: {
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
    ...Platform.select({ web: { cursor: 'pointer' } })
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.iosBlue,
  },
  solutionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 10,
  },
  solutionGridItem: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  solutionIconSmall: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  solutionGridTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
  },
  pricingGrid: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 10,
    ...Platform.select({
      web: { flexWrap: 'nowrap' }
    })
  },
  priceCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 32,
    borderRadius: 24,
    borderWidth: 2,
    position: 'relative',
    minHeight: 400,
  },
  priceCardFeatured: {
    borderColor: Colors.iosBlue,
    backgroundColor: '#F0F7FF',
    shadowColor: Colors.iosBlue,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  pricePlanName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  priceAmount: {
    fontSize: 36,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 20,
  },
  pricePeriod: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
  },
  priceDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginBottom: 24,
  },
  priceFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  priceFeatureText: {
    fontSize: 15,
    color: '#475569',
  },
  popularBadgeGlobal: {
    position: 'absolute',
    top: -12,
    right: 32,
    backgroundColor: Colors.iosBlue,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  popularBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  headerLogoText: {
    color: '#0F172A',
    fontSize: 32,
    fontWeight: '800',
    marginLeft: 20,
    letterSpacing: -0.5,
  }
});
