import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  View,
  StyleSheet,
  SafeAreaView, // Eklendi: Güvenli alanlar için
} from "react-native";

/*
  KeyboardSafeView (Geliştirilmiş)
  - SafeAreaView entegrasyonu ile çentikli cihazlarda daha iyi görünüm.
  - Klavye davranışı (behavior) platforma göre optimize edildi.
  - ScrollView'un her zaman içeriği sarması sağlandı.
*/
export default function KeyboardSafeView({
  children,
  offsetIOS = 0, // Varsayılan değer 0 yapıldı, gerekirse artırılır
  contentContainerStyle = {},
  style = {},
  disableScrollView = false, // Yeni opsiyon: ScrollView istemeyen durumlar için
}) {
  // İçerik bileşeni (ScrollView veya normal View)
  const ContentWrapper = disableScrollView ? View : ScrollView;
  const contentWrapperProps = disableScrollView
    ? { style: [{ flex: 1 }, contentContainerStyle] }
    : {
      contentContainerStyle: [styles.scrollContent, contentContainerStyle],
      keyboardShouldPersistTaps: "handled",
      showsVerticalScrollIndicator: false,
    };

  const Wrapper = Platform.OS === 'web' ? View : TouchableWithoutFeedback;
  const wrapperProps = Platform.OS === 'web' ? { style: { flex: 1 } } : { onPress: Keyboard.dismiss, accessible: false };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? offsetIOS : 0}
      style={[styles.wrapper, style]}
    >
      <Wrapper {...wrapperProps}>
        <SafeAreaView style={styles.safeArea}>
          <ContentWrapper {...contentWrapperProps}>
            {disableScrollView ? children : <View style={{ flex: 1, width: "100%" }}>{children}</View>}
          </ContentWrapper>
        </SafeAreaView>
      </Wrapper>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    // paddingBottom kaldırıldı veya azaltıldı, çünkü SafeAreaView ve KeyboardAvoidingView zaten yer açacak.
    // Gerekirse özel durumlarda contentContainerStyle ile dışarıdan verilebilir.
  },
});