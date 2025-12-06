import React, { useRef } from "react";
import { Animated, View, Text, StyleSheet, Platform, TouchableOpacity, SafeAreaView, StatusBar, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../Theme";
import AdBanner from "./AdBanner";

/*
  ImmersiveLayout - Açık renkli, kompakt (iOS stili) başlıklar için revize edildi.
  - Başlık, kaydırıldığında sabit (sticky) kalır.
  - Alt menülerin üzerine çıkmaması için güvenli alanlar (SafeAreaView) kullanıldı.
  - useBlur true ise hafif bulanıklık efekti ekler.
*/

let BlurView = null;
try {
  // BlurView'in expo-blur'dan yüklenebilir olması beklenir.
  BlurView = require("expo-blur").BlurView;
} catch (e) {
  BlurView = null;
}

// Varsayılan açık renkler
const LIGHT_HEADER_BG = '#F9F9F9'; // iOS hafif gri tonu
const LIGHT_TEXT_COLOR = '#1C1C1E'; // Koyu gri metin
const LIGHT_SECONDARY_TEXT = '#8E8E93'; // Açık gri ikincil metin
const LIGHT_CONTAINER_BG = '#FFFFFF'; // İçerik arka planı beyaz

export default function ImmersiveLayout(props) {
  const { title, subtitle, right, useBlur = true, children, noScrollView = false } = props;
  const navigation = useNavigation();

  // navigation helper: root Stack içerisinde 'Ayarlar' ekranı varsa oraya gitmeyi dener.
  const navigateToSettings = () => {
    try {
      navigation.navigate("Ayarlar");
      return;
    } catch (e) {
      // ignore
    }
    // Ebeveyn navigasyon hiyerarşisinde aramaya devam et
    try {
      let parent = navigation;
      let tried = 0;
      while (parent && tried < 10) {
        if (typeof parent.navigate === "function") {
          try {
            parent.navigate("Ayarlar");
            return;
          } catch (err) {
            // continue climbing
          }
        }
        parent = parent.getParent ? parent.getParent() : null;
        tried++;
      }
    } catch (e) {
      console.warn("navigateToSettings failed:", e);
    }
  };

  const defaultRight = (
    <TouchableOpacity
      onPress={navigateToSettings}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      style={styles.settingsBtn}
      accessibilityLabel="Ayarlar"
    >
      {/* İkon rengi koyu tema için beyazdı, şimdi açık tema için Colors.iosBlue */}
      <Ionicons name="settings-outline" size={24} color={Colors.iosBlue} />
    </TouchableOpacity>
  );

  const HeaderBackground = useBlur && BlurView ? (
    // Açık tema için 'light' bulanıklık tint kullan
    <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFill} />
  ) : (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: LIGHT_HEADER_BG }]} />
  );

  // Başlık stilini kontrol et
  const headerStyle = {
    ...styles.header,
    backgroundColor: useBlur ? 'transparent' : LIGHT_HEADER_BG,
    // Başlığı daha kompakt hale getir
    height: Platform.OS === 'ios' ? 96 : 70,
    paddingTop: Platform.OS === 'ios' ? 44 : StatusBar.currentHeight + 8, // Güvenli alanları dahil et
  };

  const titleStyle = {
    ...styles.title,
    fontSize: 18,
    fontWeight: '700',
    color: LIGHT_TEXT_COLOR, // Koyu metin
  };

  const subtitleStyle = {
    ...styles.subtitle,
    fontSize: 12,
    color: LIGHT_SECONDARY_TEXT, // Açık gri ikincil metin
  };


  return (
    <SafeAreaView style={styles.safeAreaContainer}>
      {/* StatusBar stili şimdi 'dark-content' olmalı */}
      <StatusBar barStyle="dark-content" backgroundColor={LIGHT_HEADER_BG} />

      {/* Sabit Header (Üst Menü) */}
      <View style={headerStyle}>
        {HeaderBackground}
        <View style={styles.headerContentCompact}>
          <View style={styles.textContainer}>
            <Text numberOfLines={1} style={titleStyle}>
              {title}
            </Text>
            {subtitle ? (
              <Text numberOfLines={1} style={subtitleStyle}>
                {subtitle}
              </Text>
            ) : null}
          </View>

          <View style={styles.rightWrapCompact}>{right ? right : defaultRight}</View>
        </View>
      </View>

      {/* Ana İçerik Alanı */}
      {noScrollView ? (
        <View style={[styles.scrollContainerCompact, { flex: 1 }]}>
          <View style={styles.innerContentCompact}>
            {children}
            <AdBanner />
          </View>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContainerCompact}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.innerContentCompact}>
            {children}
            <AdBanner />
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1,
    backgroundColor: LIGHT_CONTAINER_BG // Arka plan rengi
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    overflow: "hidden",
    // iOS derinlik efekti (gölge yerine kenarlık)
    ...Platform.select({
      ios: {
        borderBottomWidth: StyleSheet.hairlineWidth, // İnce bir ayırıcı çizgi
        borderBottomColor: '#EBEBEB', // Çok açık gri
      },
      android: { elevation: 4 },
    }),
  },

  headerContentCompact: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    // Başlık stil tanımlayıcısı
  },
  subtitle: {
    // Alt başlık stil tanımlayıcısı
  },
  rightWrapCompact: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  settingsBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "transparent",
  },
  scrollContainerCompact: {
    paddingTop: Platform.OS === 'ios' ? 96 : 70, // Header yüksekliği kadar boşluk bırakır
    paddingBottom: 48, // Alt menü (tab bar) için boşluk bırakır
    backgroundColor: LIGHT_CONTAINER_BG,
  },
  innerContentCompact: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
});