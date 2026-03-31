import React, { useState, useRef } from 'react';
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
  const scrollViewRef = useRef(null);

  const scrollToTopAndRegister = () => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
    }
    setIsLoginView(false);
  };

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

  // Web Arayüzü — Yeni Tam Landing Page
  return (
    <View style={styles.webWrapper}>
      {/* STICKY NAV HEADER - dışarıda kalır, scroll içine girmez */}
      <View style={styles.webGlobalHeader}>
        <View style={styles.headerContainer}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.webLogoIcon, { width: 36, height: 36, borderRadius: 10 }]}>
              <Ionicons name="leaf" size={18} color={Colors.iosBlue} />
            </View>
            <Text style={styles.headerLogoText}>PLANTİM <Text style={{ fontWeight: '400', color: Colors.iosBlue }}>ERP</Text></Text>
          </View>
          {!isMobileWeb && (
            <View style={styles.headerNavLinks}>
              <Text style={styles.headerNavLink}>{t('web_section_features')}</Text>
              <Text style={styles.headerNavLink}>{t('web_section_modules')}</Text>
              <Text style={styles.headerNavLink}>{t('nav_pricing')}</Text>
              <Text style={styles.headerNavLink}>{t('nav_faq') || 'SSS'}</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.headerCta}
            onPress={() => { scrollToTopAndRegister(); }}
          >
            <Text style={styles.headerCtaText}>{t('register')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* SCROLLABLE BODY - tek ScrollView, browser'ın native scroll'u */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.landingScrollView}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
      >

        {/* ══════════ 1. HERO SECTION ══════════ */}
        <View style={styles.heroSection}>
          {/* Decorative circles */}
          <View style={styles.heroBgCircle1} />
          <View style={styles.heroBgCircle2} />

          <View style={[styles.heroInner, isMobileWeb && { flexDirection: 'column' }]}>
            {/* Left: Branding */}
            <View style={[styles.heroLeft, isMobileWeb && { maxWidth: '100%', marginBottom: 40 }]}>
              <View style={styles.heroBadge}>
                <Ionicons name="flash" size={14} color={Colors.iosBlue} />
                <Text style={styles.heroBadgeText}>Kurumsal ERP Platformu</Text>
              </View>
              <Text style={[styles.webHeroTitle, isMobileWeb && { fontSize: isVerySmall ? 32 : 42, lineHeight: 42 }]}>
                {t('web_hero_title')}
              </Text>
              <Text style={[styles.webHeroSub, isMobileWeb && { fontSize: 16 }]}>
                {t('web_hero_sub')}
              </Text>

              {!isMobileWeb && (
                <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
                  <TouchableOpacity style={styles.heroPrimaryBtn} onPress={scrollToTopAndRegister}>
                    <Text style={styles.heroPrimaryBtnText}>{t('web_hero_cta_primary') || 'Ücretsiz Başlayın'}</Text>
                    <Ionicons name="rocket-outline" size={18} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.heroSecondaryBtn}>
                    <Ionicons name="play-circle-outline" size={18} color={Colors.iosBlue} />
                    <Text style={styles.heroSecondaryBtnText}>{t('web_hero_cta_secondary') || 'Demo'}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Trust bar */}
              {!isMobileWeb && (
                <View style={styles.heroTrustBar}>
                  <View style={styles.heroTrustItem}>
                    <Text style={styles.heroTrustStat}>{t('web_trust_stat_1')}</Text>
                    <Text style={styles.heroTrustLabel}>{t('web_trust_desc_1')}</Text>
                  </View>
                  <View style={styles.heroTrustDivider} />
                  <View style={styles.heroTrustItem}>
                    <Text style={styles.heroTrustStat}>{t('web_trust_stat_2')}</Text>
                    <Text style={styles.heroTrustLabel}>{t('web_trust_desc_2')}</Text>
                  </View>
                  <View style={styles.heroTrustDivider} />
                  <View style={styles.heroTrustItem}>
                    <Text style={styles.heroTrustStat}>{t('web_trust_stat_3')}</Text>
                    <Text style={styles.heroTrustLabel}>{t('web_trust_desc_3')}</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Right: Login / Register Form Card */}
            <View style={[styles.heroFormCard, isMobileWeb && { width: '100%' }]}>
              <View style={{ alignItems: 'center', marginBottom: 28 }}>
                <View style={styles.formIconContainer}>
                  <Ionicons name={isLoginView ? 'lock-open-outline' : 'person-add-outline'} size={28} color={Colors.iosBlue} />
                </View>
                <Text style={styles.formTitle}>{isLoginView ? (t('welcome_back') || 'Tekrar Hoşgeldiniz') : (t('create_account') || 'Hesap Oluştur')}</Text>
                <Text style={styles.formSub}>{isLoginView ? (t('login_to_continue') || 'Devam etmek için giriş yapın') : (t('signup_to_start') || 'Başlamak için bilgilerinizi girin')}</Text>
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

              <View style={styles.formFooter}>
                <Text style={styles.formFooterText}>{t('web_footer_text')}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ══════════ 2. FEATURES GRID ══════════ */}
        <View style={styles.featuresSection}>
          <Text style={styles.landingSectionBadge}>{t('web_section_features') || 'Güçlü Özellikler'}</Text>
          <Text style={styles.landingSectionTitle}>{t('web_why_erp_title')}</Text>
          <Text style={styles.landingSectionSub}>{t('solutions_desc')}</Text>

          <View style={[styles.featuresGrid, isMobileWeb && { flexDirection: 'column' }]}>
            <FeatureCard
              icon="cube-outline"
              color="#6366F1"
              title={t('web_feature_stock')}
              desc={t('web_feature_stock_desc')}
            />
            <FeatureCard
              icon="stats-chart-outline"
              color="#10B981"
              title={t('web_feature_reports')}
              desc={t('web_feature_reports_desc')}
            />
            <FeatureCard
              icon="people-outline"
              color="#F59E0B"
              title={t('web_feature_personnel')}
              desc={t('web_feature_personnel_desc')}
            />
            <FeatureCard
              icon="shield-checkmark-outline"
              color="#0A84FF"
              title={t('web_feature_security')}
              desc={t('web_feature_security_desc')}
            />
          </View>
        </View>

        {/* ══════════ 3. WHY ERP (Angled divider section) ══════════ */}
        <View style={styles.whySection2}>
          <View style={styles.whySectionInner}>
            <View style={[styles.whyLeftCol, isMobileWeb && { marginBottom: 32 }]}>
              <Text style={styles.whySectionBadge}>Neden Plantim?</Text>
              <Text style={styles.whySectionTitle}>{t('web_why_erp_title')}</Text>
              <TouchableOpacity style={styles.whyCtaBtn} onPress={scrollToTopAndRegister}>
                <Text style={styles.whyCtaBtnText}>{t('web_hero_cta_primary') || 'Ücretsiz Başla'}</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={[styles.whyRightCol, isMobileWeb && { width: '100%' }]}>
              <WhyItem icon="shield-outline" title={t('web_why_erp_1')} desc={t('web_why_erp_1_desc')} />
              <WhyItem icon="phone-portrait-outline" title={t('web_why_erp_2')} desc={t('web_why_erp_2_desc')} />
              <WhyItem icon="stats-chart-outline" title={t('web_why_erp_3')} desc={t('web_why_erp_3_desc')} />
            </View>
          </View>
        </View>

        {/* ══════════ 4. MODULES SHOWCASE ══════════ */}
        <View style={styles.modulesSection}>
          <Text style={[styles.landingSectionBadge, { color: Colors.iosBlue }]}>{t('web_section_modules') || 'ERP Modülleri'}</Text>
          <Text style={[styles.landingSectionTitle, { color: '#0F172A' }]}>Her Süreci Kapsayan Modüler Yapı</Text>

          <View style={[styles.modulesGrid, isMobileWeb && { flexDirection: 'column' }]}>
            <ModuleCard icon="cube" color="#6366F1" title={t('sol_stock')} desc={t('web_module_stock_desc')} />
            <ModuleCard icon="cart" color="#10B981" title={t('sol_finance')} desc={t('web_module_sales_desc')} />
            <ModuleCard icon="people" color="#F59E0B" title={t('sol_hr')} desc={t('web_module_hr_desc')} />
            <ModuleCard icon="stats-chart" color="#EF4444" title={t('sol_finance')} desc={t('web_module_finance_desc')} />
            <ModuleCard icon="business" color="#8B5CF6" title={t('sol_asset')} desc={t('web_module_asset_desc')} />
            <ModuleCard icon="hammer" color="#0A84FF" title={t('sol_prod')} desc={t('web_module_prod_desc')} />
          </View>
        </View>

        {/* ══════════ 5. STATS BAR ══════════ */}
        <View style={styles.statsBar}>
          <View style={styles.statsInner}>
            <StatItem stat="200+" label={t('web_trust_desc_1')} icon="business-outline" />
            <View style={styles.statsDivider} />
            <StatItem stat="%99.9" label={t('web_trust_desc_2')} icon="pulse-outline" />
            <View style={styles.statsDivider} />
            <StatItem stat="7/24" label={t('web_trust_desc_3')} icon="headset-outline" />
            <View style={styles.statsDivider} />
            <StatItem stat="SSL" label="256-bit Şifreleme" icon="lock-closed-outline" />
          </View>
        </View>

        {/* ══════════ 6. TESTIMONIALS ══════════ */}
        <View style={styles.testimonialsSection}>
          <Text style={styles.landingSectionBadge}>{t('web_section_testimonials') || 'Kullanıcı Yorumları'}</Text>
          <Text style={[styles.landingSectionTitle, { color: '#0F172A' }]}>{t('web_testimonial_title')}</Text>

          <View style={[styles.testimonialsGrid, isMobileWeb && { flexDirection: 'column' }]}>
            <TestimonialCard
              quote={t('web_testimonial_1')}
              user={t('web_testimonial_user_1')}
              initials="MK"
              color="#6366F1"
            />
            <TestimonialCard
              quote='"Personel ve zimmet takibinde artık hiç vakit kaybetmiyoruz. Tüm ekibimiz uygulamayı benimsiyor."'
              user="Selin Aydın - İK Müdürü"
              initials="SA"
              color="#10B981"
            />
            <TestimonialCard
              quote='"Üretim ve satın alma süreçlerimizi tek ekrandan takip edebilmek rekabet avantajı sağladı."'
              user="Kerem Doğan - Fabrika Müdürü"
              initials="KD"
              color="#F59E0B"
            />
          </View>
        </View>

        {/* ══════════ 7. PRICING ══════════ */}
        <View style={styles.pricingSection}>
          <Text style={styles.landingSectionBadge}>{t('nav_pricing')}</Text>
          <Text style={[styles.landingSectionTitle, { color: '#fff' }]}>Şirketinize Uygun Planı Seçin</Text>
          <Text style={[styles.landingSectionSub, { color: '#94A3B8' }]}>{t('pricing_desc')}</Text>

          <View style={[styles.pricingCardsRow, isMobileWeb && { flexDirection: 'column', alignItems: 'center' }]}>
            {/* Starter */}
            <View style={styles.pricingCardNew}>
              <Text style={styles.pricingPlanName}>{t('pricing_starter')}</Text>
              <Text style={styles.pricingPrice}>{t('pricing_free')}</Text>
              <View style={styles.pricingDivider} />
              <PriceFeature text={t('pricing_s_1')} />
              <PriceFeature text={t('pricing_s_2')} />
              <PriceFeature text={t('pricing_s_3')} />
              <TouchableOpacity style={styles.pricingStarterBtn} onPress={scrollToTopAndRegister}>
                <Text style={styles.pricingStarterBtnText}>Ücretsiz Başla</Text>
              </TouchableOpacity>
            </View>

            {/* Pro */}
            <View style={[styles.pricingCardNew, styles.pricingCardFeaturedNew]}>
              <View style={styles.popularBadgeGlobal}>
                <Text style={styles.popularBadgeText}>{t('pricing_popular')}</Text>
              </View>
              <Text style={[styles.pricingPlanName, { color: Colors.iosBlue }]}>{t('pricing_pro')}</Text>
              <Text style={[styles.pricingPrice, { color: '#fff' }]}>11.880 ₺ <Text style={{ fontSize: 14, fontWeight: '400', color: '#94A3B8' }}>{t('pricing_yr')}</Text></Text>
              <View style={[styles.pricingDivider, { backgroundColor: 'rgba(255,255,255,0.1)' }]} />
              <PriceFeature text={t('pricing_p_1')} dark />
              <PriceFeature text={t('pricing_p_2')} dark />
              <PriceFeature text={t('pricing_p_3')} dark />
              <PriceFeature text={t('web_feature_security')} bold dark />
              <TouchableOpacity style={styles.pricingProBtn} onPress={scrollToTopAndRegister}>
                <Text style={styles.pricingProBtnText}>Hemen Başla</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ══════════ 8. FAQ ══════════ */}
        <View style={styles.faqSectionNew}>
          <Text style={styles.landingSectionBadge}>{t('nav_faq') || 'SSS'}</Text>
          <Text style={[styles.landingSectionTitle, { color: '#0F172A' }]}>{t('web_faq_title')}</Text>

          <View style={styles.faqGrid}>
            <FaqItemNew q={t('web_faq_1_q')} a={t('web_faq_1_a')} />
            <FaqItemNew q={t('web_faq_2_q')} a={t('web_faq_2_a')} />
            <FaqItemNew q={t('web_faq_3_q')} a={t('web_faq_3_a')} />
            <FaqItemNew q={t('web_faq_4_q')} a={t('web_faq_4_a')} />
            <FaqItemNew q={t('web_faq_5_q')} a={t('web_faq_5_a')} />
          </View>
        </View>

        {/* ══════════ 9. CTA BANNER ══════════ */}
        <View style={styles.ctaBanner}>
          <View style={styles.ctaBannerCircle1} />
          <View style={styles.ctaBannerCircle2} />
          <Ionicons name="leaf" size={48} color="rgba(255,255,255,0.15)" style={{ marginBottom: 16 }} />
          <Text style={styles.ctaBannerTitle}>{t('web_cta_banner_title')}</Text>
          <Text style={styles.ctaBannerSub}>{t('web_cta_banner_sub')}</Text>
          <TouchableOpacity style={styles.ctaBannerBtn} onPress={scrollToTopAndRegister}>
            <Text style={styles.ctaBannerBtnText}>{t('web_cta_register')}</Text>
            <Ionicons name="rocket-outline" size={20} color="#2563EB" />
          </TouchableOpacity>
          <Text style={styles.ctaBannerFooter}>
            <Ionicons name="lock-closed" size={12} color="#6B7280" /> {t('web_trust_footer')}
          </Text>
        </View>

        {/* ══════════ 10. FOOTER ══════════ */}
        <View style={styles.pageFooter}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="leaf" size={16} color={Colors.iosBlue} />
            <Text style={styles.pageFooterBrand}>  PLANTİM ERP</Text>
          </View>
          <Text style={styles.pageFooterText}>© 2026 Plantim Kurumsal Yazılım Teknolojileri · plantimtakviyelen@gmail.com</Text>
        </View>
      </ScrollView>
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
        <Text style={styles.priceAmount}>11.880 ₺ <Text style={styles.pricePeriod}>{t('pricing_yr')}</Text></Text>
        <View style={styles.priceDivider} />
        <PriceFeature text={t('pricing_p_1')} />
        <PriceFeature text={t('pricing_p_2')} />
        <PriceFeature text={t('pricing_p_3')} />
        <PriceFeature text={t('web_feature_security')} bold />
      </View>
    </View>
  </View>
);

const PriceFeature = ({ text, bold, dark }) => (
  <View style={styles.priceFeatureItem}>
    <Ionicons name="checkmark-circle" size={18} color={dark ? Colors.iosBlue : '#10B981'} />
    <Text style={[styles.priceFeatureText, dark && { color: '#CBD5E1' }, bold && { fontWeight: '700' }]}>{text}</Text>
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

// ── NEW LANDING PAGE COMPONENTS ──────────────────────────────
const FeatureCard = ({ icon, color, title, desc }) => (
  <View style={styles.featureCard}>
    <View style={[styles.featureCardIcon, { backgroundColor: color + '18' }]}>
      <Ionicons name={icon} size={28} color={color} />
    </View>
    <Text style={styles.featureCardTitle}>{title}</Text>
    <Text style={styles.featureCardDesc}>{desc}</Text>
  </View>
);

const ModuleCard = ({ icon, color, title, desc }) => (
  <View style={styles.moduleCard}>
    <View style={[styles.moduleCardIcon, { backgroundColor: color }]}>
      <Ionicons name={icon} size={22} color="#fff" />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.moduleCardTitle}>{title}</Text>
      <Text style={styles.moduleCardDesc}>{desc}</Text>
    </View>
  </View>
);

const StatItem = ({ stat, label, icon }) => (
  <View style={styles.statItem}>
    <Ionicons name={icon} size={24} color={Colors.iosBlue} style={{ marginBottom: 8 }} />
    <Text style={styles.statNumber}>{stat}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const TestimonialCard = ({ quote, user, initials, color }) => (
  <View style={styles.testimonialCard}>
    <Ionicons name="chatbubble-ellipses-outline" size={24} color={color} style={{ marginBottom: 12 }} />
    <Text style={styles.testimonialQuote}>{quote}</Text>
    <View style={styles.testimonialUser}>
      <View style={[styles.testimonialAvatar, { backgroundColor: color + '20' }]}>
        <Text style={[styles.testimonialInitials, { color }]}>{initials}</Text>
      </View>
      <Text style={styles.testimonialUsername}>{user}</Text>
    </View>
  </View>
);

const FaqItemNew = ({ q, a }) => (
  <View style={styles.faqItemNew}>
    <View style={styles.faqItemNewQ}>
      <Ionicons name="help-circle" size={20} color={Colors.iosBlue} />
      <Text style={styles.faqItemNewQText}>{q}</Text>
    </View>
    <Text style={styles.faqItemNewA}>{a}</Text>
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
  // ── MOBILE NATIVE ──────────────────────────────────────────
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 48 },
  title: { fontSize: 40, fontWeight: 'bold', color: Colors.text, marginTop: 16 },
  subtitle: { fontSize: 16, color: Colors.secondary, marginTop: 8 },
  input: {
    backgroundColor: '#fff', borderRadius: 12, paddingVertical: 16,
    paddingHorizontal: 16, fontSize: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#E0E0E0', color: Colors.text, width: '100%',
    ...Platform.select({ web: { outlineStyle: 'none' } })
  },
  button: {
    borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8, width: '100%',
    ...Platform.select({ web: { cursor: 'pointer' } })
  },
  buttonSolid: {
    backgroundColor: Colors.iosBlue, shadowColor: Colors.iosBlue,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3.84, elevation: 5,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonSolidText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  forgotPassword: { marginTop: 24, alignSelf: 'center', ...Platform.select({ web: { cursor: 'pointer' } }) },
  forgotPasswordText: { color: Colors.iosBlue, fontSize: 14, fontWeight: '600' },
  toggleButton: { marginTop: 20, alignSelf: 'center', ...Platform.select({ web: { cursor: 'pointer' } }) },
  toggleButtonText: { color: Colors.secondary, fontSize: 15, textAlign: 'center', fontWeight: '500' },
  toggleButtonTextBold: { color: Colors.iosBlue, fontWeight: 'bold' },

  // ── WEB WRAPPER & NAV ──────────────────────────────────────
  webWrapper: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    ...Platform.select({ web: { height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' } })
  },
  webGlobalHeader: {
    height: 72,
    backgroundColor: Platform.OS === 'web' ? 'rgba(255,255,255,0.92)' : '#fff',
    ...Platform.select({ web: { backdropFilter: 'blur(16px)', position: 'sticky', top: 0, zIndex: 100 } }),
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226,232,240,0.6)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  headerContainer: {
    maxWidth: 1280, width: '100%', alignSelf: 'center',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 40,
  },
  headerLogoText: {
    color: '#0F172A', fontSize: 20, fontWeight: '800', marginLeft: 10, letterSpacing: -0.5,
  },
  headerNavLinks: { flexDirection: 'row', gap: 8 },
  headerNavLink: {
    fontSize: 14, fontWeight: '600', color: '#64748B',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    ...Platform.select({ web: { cursor: 'pointer', transition: 'all 0.2s' } })
  },
  headerNavLinkActive: { color: '#0F172A', backgroundColor: '#E2E8F0' },
  headerCta: {
    backgroundColor: '#2563EB', paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 10, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8,
    ...Platform.select({ web: { cursor: 'pointer' } })
  },
  headerCtaText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // ── LANDING SCROLL VIEW ────────────────────────────────────
  landingScrollView: {
    flex: 1,
  },


  // ── HERO SECTION ──────────────────────────────────────────
  heroSection: {
    backgroundColor: '#020617',
    ...Platform.select({ web: { backgroundImage: 'linear-gradient(135deg, #020617 0%, #0F172A 50%, #1E1B4B 100%)' } }),
    paddingTop: 80,
    paddingBottom: 100,
    paddingHorizontal: 40,
    overflow: 'hidden',
    position: 'relative',
  },
  heroBgCircle1: {
    position: 'absolute', width: 500, height: 500,
    borderRadius: 250, backgroundColor: 'rgba(99,102,241,0.08)',
    top: -150, right: -100,
    ...Platform.select({ web: { pointerEvents: 'none' } }),
  },
  heroBgCircle2: {
    position: 'absolute', width: 350, height: 350,
    borderRadius: 175, backgroundColor: 'rgba(10,132,255,0.06)',
    bottom: -80, left: 200,
    ...Platform.select({ web: { pointerEvents: 'none' } }),
  },
  heroInner: {
    maxWidth: 1280, alignSelf: 'center', width: '100%',
    flexDirection: 'row', gap: 60, alignItems: 'center',
  },
  heroLeft: { flex: 1, maxWidth: 560 },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(10,132,255,0.12)', alignSelf: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(10,132,255,0.2)', marginBottom: 24,
  },
  heroBadgeText: { color: Colors.iosBlue, fontSize: 13, fontWeight: '700' },
  webHeroTitle: {
    fontSize: 52, fontWeight: '900', color: '#fff',
    marginBottom: 20, lineHeight: 62, letterSpacing: -1.5,
  },
  webHeroSub: {
    fontSize: 18, color: '#94A3B8', marginBottom: 36, lineHeight: 30, fontWeight: '400',
  },
  heroPrimaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#3B82F6', paddingHorizontal: 28, paddingVertical: 16,
    borderRadius: 14, shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 20,
    ...Platform.select({ web: { cursor: 'pointer', transition: 'transform 0.2s' } })
  },
  heroPrimaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  heroSecondaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 24, paddingVertical: 16, borderRadius: 14,
    borderWidth: 1.5, borderColor: 'rgba(10,132,255,0.3)',
    ...Platform.select({ web: { cursor: 'pointer' } })
  },
  heroSecondaryBtnText: { color: Colors.iosBlue, fontSize: 16, fontWeight: '700' },
  heroTrustBar: {
    flexDirection: 'row', alignItems: 'center', marginTop: 48,
    backgroundColor: 'rgba(255,255,255,0.04)',
    ...Platform.select({ web: { backdropFilter: 'blur(12px)' } }),
    padding: 24, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    gap: 20,
  },
  heroTrustItem: { flex: 1, alignItems: 'center' },
  heroTrustDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.1)' },
  heroTrustStat: { color: Colors.iosBlue, fontSize: 22, fontWeight: '900', marginBottom: 2 },
  heroTrustLabel: { color: '#64748B', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  // ── HERO FORM CARD ─────────────────────────────────────────
  heroFormCard: {
    backgroundColor: '#ffffff', padding: 44, borderRadius: 28, width: 440,
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.12, shadowRadius: 48, elevation: 10,
    borderWidth: 1, borderColor: 'rgba(226,232,240,0.8)',
    ...Platform.select({ web: { flexShrink: 0 } })
  },
  formIconContainer: {
    width: 60, height: 60, borderRadius: 18, backgroundColor: '#EFF6FF',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  formTitle: { fontSize: 28, fontWeight: '800', color: '#0F172A', textAlign: 'center', letterSpacing: -0.8 },
  formSub: { fontSize: 15, color: '#64748B', marginTop: 8, textAlign: 'center', lineHeight: 22 },
  formFooter: { marginTop: 24, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#F1F5F9', alignItems: 'center' },
  formFooterText: { fontSize: 12, color: '#94A3B8', textAlign: 'center', lineHeight: 18 },

  // ── FORM INPUTS ────────────────────────────────────────────
  inputGroup: { marginBottom: 18 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8, marginLeft: 2 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC',
    borderRadius: 14, borderWidth: 1.5, borderColor: '#E2E8F0', paddingHorizontal: 14,
    ...Platform.select({ web: { transition: 'border-color 0.2s ease' } })
  },
  inputIcon: { marginRight: 10 },
  webInput: {
    flex: 1, height: 50, fontSize: 15, color: '#0F172A',
    ...Platform.select({ web: { outlineStyle: 'none' } })
  },
  forgotPasswordLink: { alignSelf: 'flex-end', marginBottom: 20, ...Platform.select({ web: { cursor: 'pointer' } }) },
  mainButton: {
    flexDirection: 'row', backgroundColor: '#2563EB', height: 52,
    borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 10,
    shadowColor: '#2563EB', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16,
    ...Platform.select({ web: { cursor: 'pointer', transition: 'transform 0.2s' } })
  },
  mainButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  buttonDisabled: { opacity: 0.5 },
  toggleViewButton: { marginTop: 20, alignItems: 'center', ...Platform.select({ web: { cursor: 'pointer' } }) },
  toggleText: { color: '#64748B', fontSize: 14 },
  toggleTextBold: { color: Colors.iosBlue, fontWeight: '700' },
  errorContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#EF4444',
    padding: 12, borderRadius: 12, marginBottom: 16, gap: 8,
  },
  errorText: { color: '#fff', fontSize: 14, fontWeight: '600', flex: 1 },

  // ── FEATURES SECTION ──────────────────────────────────────
  featuresSection: {
    backgroundColor: '#fff', paddingVertical: 100, paddingHorizontal: 40, alignItems: 'center',
  },
  featuresGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 24,
    maxWidth: 1280, width: '100%', justifyContent: 'center',
  },
  featureCard: {
    flex: 1, minWidth: 220, maxWidth: 280, backgroundColor: '#F8FAFC',
    borderRadius: 24, padding: 32, borderWidth: 1, borderColor: '#E2E8F0',
    ...Platform.select({ web: { transition: 'transform 0.2s, box-shadow 0.2s' } })
  },
  featureCardIcon: {
    width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  featureCardTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 10 },
  featureCardDesc: { fontSize: 14, color: '#64748B', lineHeight: 22 },

  // ── SECTION TYPOGRAPHY (shared) ────────────────────────────
  landingSectionBadge: {
    fontSize: 13, fontWeight: '700', color: Colors.iosBlue, textTransform: 'uppercase',
    letterSpacing: 1.5, marginBottom: 12,
  },
  landingSectionTitle: {
    fontSize: 40, fontWeight: '900', color: '#fff',
    marginBottom: 16, letterSpacing: -1, textAlign: 'center',
  },
  landingSectionSub: {
    fontSize: 17, color: '#64748B', lineHeight: 26, textAlign: 'center', maxWidth: 600, marginBottom: 56,
  },

  // ── WHY SECTION ────────────────────────────────────────────
  whySection2: {
    backgroundColor: '#020617',
    ...Platform.select({ web: { backgroundImage: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 100%)' } }),
    paddingVertical: 100, paddingHorizontal: 40,
  },
  whySectionInner: {
    maxWidth: 1280, alignSelf: 'center', width: '100%',
    flexDirection: 'row', gap: 80, alignItems: 'flex-start',
  },
  whyLeftCol: { width: 320, flexShrink: 0 },
  whySectionBadge: {
    fontSize: 13, fontWeight: '700', color: Colors.iosBlue, textTransform: 'uppercase',
    letterSpacing: 1.5, marginBottom: 12,
  },
  whySectionTitle: {
    fontSize: 36, fontWeight: '900', color: '#fff', lineHeight: 44, letterSpacing: -1, marginBottom: 32,
  },
  whyCtaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start',
    backgroundColor: Colors.iosBlue, paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 12, shadowColor: Colors.iosBlue, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12,
    ...Platform.select({ web: { cursor: 'pointer' } })
  },
  whyCtaBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  whyRightCol: { flex: 1, gap: 16 },
  whyItem: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.04)',
    ...Platform.select({ web: { backdropFilter: 'blur(12px)' } }),
    padding: 24, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', marginBottom: 16,
  },
  whyIconCircle: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(10,132,255,0.12)',
    alignItems: 'center', justifyContent: 'center', marginRight: 20,
  },
  whyTitle: { color: '#fff', fontSize: 17, fontWeight: '700', marginBottom: 6 },
  whyDesc: { color: '#94A3B8', fontSize: 14, lineHeight: 22, flex: 1 },

  // ── MODULES SECTION ────────────────────────────────────────
  modulesSection: {
    backgroundColor: '#F8FAFC', paddingVertical: 100, paddingHorizontal: 40, alignItems: 'center',
  },
  modulesGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 20,
    maxWidth: 1100, width: '100%', marginTop: 16,
  },
  moduleCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: '#fff', borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: '#E2E8F0',
    flex: 1, minWidth: 300,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12,
    ...Platform.select({ web: { transition: 'transform 0.2s, box-shadow 0.2s' } })
  },
  moduleCardIcon: {
    width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  moduleCardTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  moduleCardDesc: { fontSize: 13, color: '#64748B', lineHeight: 19 },

  // ── STATS BAR ──────────────────────────────────────────────
  statsBar: {
    backgroundColor: '#0F172A',
    paddingVertical: 48, paddingHorizontal: 40,
  },
  statsInner: {
    maxWidth: 1100, alignSelf: 'center', width: '100%',
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 0,
  },
  statItem: { flex: 1, alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  statNumber: { color: '#fff', fontSize: 32, fontWeight: '900', marginBottom: 4 },
  statLabel: { color: '#64748B', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' },
  statsDivider: { width: 1, height: 60, backgroundColor: 'rgba(255,255,255,0.08)' },

  // ── TESTIMONIALS ───────────────────────────────────────────
  testimonialsSection: {
    backgroundColor: '#fff', paddingVertical: 100, paddingHorizontal: 40, alignItems: 'center',
  },
  testimonialsGrid: {
    flexDirection: 'row', gap: 24, maxWidth: 1100, width: '100%', flexWrap: 'wrap',
  },
  testimonialCard: {
    flex: 1, minWidth: 260, backgroundColor: '#F8FAFC', borderRadius: 24, padding: 32,
    borderWidth: 1, borderColor: '#E2E8F0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12,
  },
  testimonialQuote: { fontSize: 15, color: '#334155', lineHeight: 24, flex: 1, marginBottom: 20, fontStyle: 'italic' },
  testimonialUser: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  testimonialAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  testimonialInitials: { fontSize: 14, fontWeight: '800' },
  testimonialUsername: { fontSize: 14, fontWeight: '700', color: '#475569' },

  // ── PRICING SECTION ────────────────────────────────────────
  pricingSection: {
    backgroundColor: '#020617',
    ...Platform.select({ web: { backgroundImage: 'linear-gradient(160deg, #020617 0%, #0F172A 60%, #1E1B4B 100%)' } }),
    paddingVertical: 100, paddingHorizontal: 40, alignItems: 'center',
  },
  pricingCardsRow: {
    flexDirection: 'row', gap: 24, maxWidth: 860, width: '100%', marginTop: 8,
  },
  pricingCardNew: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.05)',
    ...Platform.select({ web: { backdropFilter: 'blur(20px)' } }),
    borderRadius: 28, padding: 36, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    position: 'relative',
  },
  pricingCardFeaturedNew: {
    borderColor: Colors.iosBlue,
    backgroundColor: 'rgba(10,132,255,0.08)',
    shadowColor: Colors.iosBlue, shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.2, shadowRadius: 40,
  },
  pricingPlanName: {
    fontSize: 13, fontWeight: '800', color: '#64748B',
    textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12,
  },
  pricingPrice: { fontSize: 40, fontWeight: '900', color: '#0F172A', marginBottom: 20 },
  pricingDivider: { height: 1, backgroundColor: '#E2E8F0', marginBottom: 24 },
  pricingStarterBtn: {
    marginTop: 24, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center',
    ...Platform.select({ web: { cursor: 'pointer' } })
  },
  pricingStarterBtnText: { color: '#94A3B8', fontSize: 15, fontWeight: '700' },
  pricingProBtn: {
    marginTop: 24, paddingVertical: 14, borderRadius: 12,
    backgroundColor: Colors.iosBlue, alignItems: 'center',
    shadowColor: Colors.iosBlue, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16,
    ...Platform.select({ web: { cursor: 'pointer' } })
  },
  pricingProBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  priceFeatureItem: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  priceFeatureText: { fontSize: 14, color: '#475569' },
  popularBadgeGlobal: {
    position: 'absolute', top: -14, right: 28,
    backgroundColor: Colors.iosBlue, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20,
  },
  popularBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  // ── FAQ SECTION ────────────────────────────────────────────
  faqSectionNew: {
    backgroundColor: '#F8FAFC', paddingVertical: 100, paddingHorizontal: 40, alignItems: 'center',
  },
  faqGrid: { maxWidth: 860, width: '100%', gap: 16 },
  faqItemNew: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: '#E2E8F0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8,
  },
  faqItemNewQ: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  faqItemNewQText: { fontSize: 16, fontWeight: '700', color: '#0F172A', flex: 1 },
  faqItemNewA: { fontSize: 14, color: '#64748B', lineHeight: 22, paddingLeft: 32 },

  // ── CTA BANNER ─────────────────────────────────────────────
  ctaBanner: {
    backgroundColor: '#0F172A',
    ...Platform.select({ web: { backgroundImage: 'linear-gradient(135deg, #1E40AF 0%, #3730A3 50%, #5B21B6 100%)' } }),
    paddingVertical: 100, paddingHorizontal: 40, alignItems: 'center', position: 'relative', overflow: 'hidden',
  },
  ctaBannerCircle1: {
    position: 'absolute', width: 400, height: 400, borderRadius: 200,
    backgroundColor: 'rgba(255,255,255,0.05)', top: -100, right: 0,
    ...Platform.select({ web: { pointerEvents: 'none' } }),
  },
  ctaBannerCircle2: {
    position: 'absolute', width: 300, height: 300, borderRadius: 150,
    backgroundColor: 'rgba(255,255,255,0.04)', bottom: -80, left: -50,
    ...Platform.select({ web: { pointerEvents: 'none' } }),
  },
  ctaBannerTitle: {
    fontSize: 44, fontWeight: '900', color: '#fff', textAlign: 'center',
    letterSpacing: -1, marginBottom: 16, maxWidth: 700,
  },
  ctaBannerSub: {
    fontSize: 18, color: 'rgba(255,255,255,0.7)', textAlign: 'center',
    lineHeight: 28, marginBottom: 40, maxWidth: 500,
  },
  ctaBannerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', paddingHorizontal: 36, paddingVertical: 18, borderRadius: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 20,
    marginBottom: 24,
    ...Platform.select({ web: { cursor: 'pointer' } })
  },
  ctaBannerBtnText: { color: '#2563EB', fontSize: 17, fontWeight: '800' },
  ctaBannerFooter: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },

  // ── FOOTER ─────────────────────────────────────────────────
  pageFooter: {
    backgroundColor: '#020617', paddingVertical: 40, paddingHorizontal: 40, alignItems: 'center',
  },
  pageFooterBrand: { color: '#94A3B8', fontSize: 15, fontWeight: '800', letterSpacing: 1 },
  pageFooterText: { color: '#475569', fontSize: 13 },

  // ── LEGACY WEB LOGO (used in mobile native branding) ───────
  webLogoIcon: {
    width: 56, height: 56, borderRadius: 16, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.iosBlue, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12,
  },
  webLogoText: { color: '#fff', fontSize: 32, fontWeight: '800', marginLeft: 20, letterSpacing: -0.5 },

  // ── OLD SECTION STYLES (kept for unused legacy component refs) ──
  sectionCard: {
    backgroundColor: '#fff', borderRadius: 24, padding: 48,
    shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 20 }, shadowRadius: 30,
    elevation: 8, maxWidth: 600, alignSelf: 'center', width: '100%',
  },
  sectionTitle: { fontSize: 36, fontWeight: '800', color: '#0F172A', marginBottom: 16, letterSpacing: -1 },
  sectionDesc: { fontSize: 16, color: '#64748B', lineHeight: 24, marginBottom: 30 },
  featureBox: { backgroundColor: '#F8FAFC', padding: 24, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  featureTitle: { fontSize: 20, fontWeight: '700', marginTop: 12, marginBottom: 8, color: '#1E293B' },
  featureDesc: { fontSize: 15, color: '#475569', lineHeight: 22 },
  solutionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 10 },
  solutionGridItem: { width: '48%', backgroundColor: '#F8FAFC', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' },
  solutionIconSmall: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  solutionGridTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B', textAlign: 'center' },
  pricingGrid: { flexDirection: 'row', gap: 24, marginTop: 10 },
  priceCard: { flex: 1, backgroundColor: '#fff', padding: 32, borderRadius: 24, borderWidth: 2, position: 'relative', minHeight: 400 },
  priceCardFeatured: { borderColor: Colors.iosBlue, backgroundColor: '#F0F7FF', shadowColor: Colors.iosBlue, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 5 },
  pricePlanName: { fontSize: 18, fontWeight: '800', color: '#64748B', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  priceAmount: { fontSize: 36, fontWeight: '900', color: '#0F172A', marginBottom: 20 },
  pricePeriod: { fontSize: 14, color: '#94A3B8', fontWeight: '500' },
  priceDivider: { height: 1, backgroundColor: '#E2E8F0', marginBottom: 24 },
  faqItem: { marginBottom: 24, backgroundColor: 'rgba(255,255,255,0.02)', padding: 20, borderRadius: 12 },
  faqQ: { color: '#fff', fontSize: 17, fontWeight: '700', marginBottom: 8 },
  faqA: { color: '#94A3B8', fontSize: 15, lineHeight: 22 },
  sectionWrapper: { width: '100%', maxWidth: 800, alignSelf: 'center' },
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 8, ...Platform.select({ web: { cursor: 'pointer' } }) },
  backButtonText: { fontSize: 15, fontWeight: '600', color: Colors.iosBlue },
  webFooterText: { color: '#475569', fontSize: 14 },
  webBranding: { zIndex: 2, maxWidth: 640 },
  webContainer: { flex: 1, width: '100%', backgroundColor: '#F8FAFC' },
  webLeftPanel: { flex: 1.2, backgroundColor: '#020617', ...Platform.select({ web: { backgroundImage: 'linear-gradient(135deg, #020617 0%, #0F172A 50%, #1E1B4B 100%)', height: '100%', overflowY: 'auto' } }) },
  webRightPanel: { flex: 1, backgroundColor: 'transparent', ...Platform.select({ web: { height: '100%', overflowY: 'auto' } }) },
  webFooter: { marginTop: 'auto', alignSelf: 'flex-start', paddingTop: 40 },
  webHeroCta: { backgroundColor: '#3B82F6', paddingHorizontal: 36, paddingVertical: 18, borderRadius: 16, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 12, marginBottom: 40 },
  webHeroCtaText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  separator: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 32, width: '100%' },
  sectionHeading: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 24, letterSpacing: -0.5 },
  whySection: { marginBottom: 40 },
  whyGrid: { gap: 20 },
  trustContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', padding: 28, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  trustItem: { flex: 1, alignItems: 'center' },
  trustDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.1)' },
  trustStatText: { color: Colors.iosBlue, fontSize: 24, fontWeight: '900', marginBottom: 2 },
  trustDescText: { color: '#64748B', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  testimonialSection: { backgroundColor: 'rgba(0,122,255,0.05)', padding: 32, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(0,122,255,0.1)', marginTop: 20 },
  testimonialText: { color: '#fff', fontSize: 18, fontStyle: 'italic', lineHeight: 28, marginBottom: 16 },
  testimonialUser2: { color: Colors.iosBlue, fontSize: 16, fontWeight: '700' },
  faqSection: { marginTop: 60 },
  webHeroCta2: { alignSelf: 'flex-end',  },
  navLink: { color: '#94A3B8', fontSize: 16, fontWeight: '500', ...Platform.select({ web: { cursor: 'pointer' } }) },
  navLinkActive: { color: '#fff', fontWeight: '700', borderBottomWidth: 2, borderBottomColor: Colors.iosBlue, paddingBottom: 4 },
  navLinks: { flexDirection: 'row', gap: 30 },
  webNavBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 60, width: '100%' },
  businessCard: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', backgroundColor: 'rgba(30,41,59,0.5)', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  businessIconBg: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.iosBlue, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  businessTitle: { color: '#fff', fontSize: 17, fontWeight: '700', marginBottom: 4 },
  businessDesc: { color: '#94A3B8', fontSize: 14, lineHeight: 20 },
  businessGrid: { marginBottom: 60 },
  businessRow: { flexDirection: 'row', marginBottom: 24, gap: 24 },
  scrollSection: { width: '100%', flex: 1 },
  webFormCard: { backgroundColor: '#ffffff', padding: 48, borderRadius: 32, width: '100%', maxWidth: 480, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 24 }, shadowOpacity: 0.08, shadowRadius: 48, elevation: 10, borderWidth: 1, borderColor: 'rgba(226,232,240,0.8)' },
  pricingCardContainer: { flexDirection: 'column', gap: 20 },
  pricingCard: { padding: 30, borderRadius: 20, borderWidth: 2, position: 'relative', overflow: 'hidden' },
  pricingPlan: { fontSize: 20, fontWeight: '700', color: '#475569', marginBottom: 10 },
  pricingPrice2: { fontSize: 36, fontWeight: '900', color: '#0F172A', marginBottom: 20 },
  pricingDetail: { fontSize: 15, color: '#64748B', marginBottom: 8 },
  popularBadge: { position: 'absolute', top: 16, right: 16, backgroundColor: Colors.iosBlue, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  solutionList: { marginTop: 10 },
  solutionItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  solutionItemTitle: { fontSize: 16, fontWeight: '600', color: '#334155', marginLeft: 16 },
  pricingCardContainer2: { flexDirection: 'column', gap: 20 },
  pricingCard2: { padding: 30, borderRadius: 20, borderWidth: 2, position: 'relative', overflow: 'hidden' },
  headerNavLinkActive: { color: '#0F172A', backgroundColor: '#E2E8F0' },
  headerCta: { backgroundColor: '#2563EB', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, ...Platform.select({ web: { cursor: 'pointer' } }) },
  headerNavLinks: { flexDirection: 'row', gap: 8 },
  headerContainer: { maxWidth: 1280, width: '100%', alignSelf: 'center', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 40 },
});
