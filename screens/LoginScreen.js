import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../AuthContext'; // useAuth hook'unu import et
import { Colors } from '../Theme';
import { Ionicons } from '@expo/vector-icons'; // İkon kütüphanesi

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // YENİ: Ekranın "giriş" mi yoksa "kayıt" modunda mı olduğunu tutan state
  const [isLoginView, setIsLoginView] = useState(true);

  const [loading, setLoading] = useState(false);
  
  const { signIn, signUp, resetPassword } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Eksik Bilgi", "Lütfen email ve şifrenizi giriniz.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        Alert.alert("Giriş Başarısız", error.message);
      } 
    } catch (error) {
      Alert.alert("Hata", "Giriş işlemi sırasında bir hata oluştu: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert("Eksik Bilgi", "Lütfen email, şifre ve şifre tekrarı alanlarını doldurunuz.");
      return;
    }
    
    if (password !== confirmPassword) {
        Alert.alert("Şifreler Eşleşmiyor", "Girdiğiniz şifreler aynı değil. Lütfen kontrol edin.");
        return;
    }

    if (password.length < 6) {
        Alert.alert("Zayıf Şifre", "Şifreniz en az 6 karakter olmalıdır.");
        return;
    }

    setLoading(true);
    try {
      const { data, error } = await signUp(email, password);
      
      if (error) {
        Alert.alert("Kayıt Başarısız", error.message);
      } else {
        if (data.user && !data.session) {
           Alert.alert(
            "Kayıt Başarılı", 
            "Lütfen e-posta adresinize gönderilen onay linkine tıklayın ve ardından giriş yapın."
           );
        } else {
           Alert.alert(
            "Kayıt Başarılı", 
            "Hesabınız oluşturuldu. Şimdi giriş yapabilirsiniz."
           );
        }
        // Kayıt sonrası alanları temizle ve giriş ekranına dön
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setIsLoginView(true); // Giriş moduna geçir
      }
    } catch (error) {
      Alert.alert("Hata", "Kayıt işlemi sırasında bir hata oluştu: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = () => {
    if (!email) {
        Alert.alert("Email Gerekli", "Şifrenizi sıfırlamak için lütfen e-posta adresinizi girin.");
        return;
    }
    Alert.alert(
        "Şifre Sıfırlama",
        `${email} adresine bir sıfırlama linki göndermek istediğinize emin misiniz?`,
        [
            { text: "İptal", style: "cancel" },
            { 
                text: "Gönder", 
                style: "default", 
                onPress: async () => {
                    setLoading(true);
                    const { error } = await resetPassword(email);
                    setLoading(false);
                    if (error) {
                        Alert.alert("Hata", error.message);
                    } else {
                        Alert.alert("Başarılı", "E-posta adresinizi kontrol edin. Şifre sıfırlama linki gönderildi.");
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
          <Text style={styles.subtitle}>şirketiniz, cebinizde ve güvende.</Text>
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
          placeholder="Şifre"
          placeholderTextColor={Colors.secondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        
        {/* YENİ: Sadece Kayıt Ol modunda göster */}
        {!isLoginView && (
          <TextInput
            style={styles.input}
            placeholder="Şifre Tekrar"
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
                {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.forgotPassword} 
              onPress={handlePasswordReset} 
              disabled={loading}
            >
              <Text style={styles.forgotPasswordText}>Şifremi Unuttum</Text>
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
                {loading ? 'Kayıt Olunuyor...' : 'Kayıt Ol'}
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
              ? "Hesabınız yok mu? " 
              : "Zaten hesabınız var mı? "
            }
            <Text style={styles.toggleButtonTextBold}>
              {isLoginView ? "Kayıt Ol" : "Giriş Yap"}
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