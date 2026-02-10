import React, { createContext, useState, useEffect, useContext } from 'react';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking'; // Deep link için
// Supabase SDK'sını import edin
import { createClient } from '@supabase/supabase-js';

// Supabase URL ve Anon Key'inizi BURAYA GİRİN
// Bu değişkenleri genellikle .env dosyasında tutmak daha güvenlidir, 
// ancak test amaçlı buraya ekleyebilirsiniz.
// Kendi değerlerinizle değiştirin!
const supabaseUrl = 'https://wzaxmplzambkjriqtweq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YXhtcGx6YW1ia2pyaXF0d2VxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4MzQzNTQsImV4cCI6MjA3ODQxMDM1NH0.bpQWqzOoEYC8wi4jTh097OK7ogYOK4xDkvrXpTQaDUs';

// Supabase İstemcisini Oluşturun
// Bu, uygulamanızın Supabase ile iletişim kurmasını sağlayan tekil istemcidir.
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        // Oturumları yerel olarak saklamak için AsyncStorage kullanılır
        // React Native için bu ayar önemlidir.
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
    },
});

// AuthContext'i Oluşturun
export const AuthContext = createContext(null);

// useAuth Hook'u - Diğer bileşenlerin Context'e erişmesini sağlar
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        // Hatanın en yaygın kaynağı: useAuth'ı AuthProvider dışında çağırmak
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// AuthProvider Bileşeni
export function AuthProvider({ children }) {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isPasswordReset, setIsPasswordReset] = useState(false); // YENİ: Şifre sıfırlama durumunu takip eder

    // 1. Oturum Dinleyicisi (Session Listener)
    useEffect(() => {
        // İlk oturum kontrolünü yapar
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        // Oturum değişikliklerini dinler (Giriş/Çıkış/Yenileme)
        const { data: listener } = supabase.auth.onAuthStateChange(
            (event, session) => {
                setSession(session);

                // Şifre sıfırlama olayı yakalandı
                if (event === 'PASSWORD_RECOVERY') {
                    setIsPasswordReset(true);
                } else if (event === 'SIGNED_OUT') {
                    // Kullanıcı çıkış yaptığında bu durumu sıfırla
                    setIsPasswordReset(false);
                }

                // Auth state değişikliği olduğunda yükleniyor durumunu bitir
                if (loading) {
                    setLoading(false);
                }
            }
        );

        // Bileşen ayrıldığında dinleyiciyi temizle
        return () => {
            if (listener && listener.subscription) {
                listener.subscription.unsubscribe();
            }
        };
    }, []);

    // 2. Deep Link Dinleyicisi (URL'den gelen session'ı yakalar)
    useEffect(() => {
        const handleDeepLink = async ({ url }) => {
            if (!url) return;

            // Örnek URL: plantim://reset-password#access_token=...&refresh_token=...&type=recovery
            // Supabase tokenları genellikle fragment (#) içinde gönderir.

            // Eğer URL fragment içeriyorsa parse et
            if (url.includes('#')) {
                const fragment = url.split('#')[1];
                const params = {};
                fragment.split('&').forEach(pair => {
                    const [key, value] = pair.split('=');
                    params[key] = value;
                });

                if (params.access_token && params.refresh_token) {
                    // Session'ı manuel olarak kur
                    const { error } = await supabase.auth.setSession({
                        access_token: params.access_token,
                        refresh_token: params.refresh_token,
                    });

                    // Eğer şifre sıfırlama akışıysa (type=recovery)
                    if (!error && params.type === 'recovery') {
                        setIsPasswordReset(true);
                    }
                }
            }
        };

        // Event listener ekle
        const subscription = Linking.addEventListener('url', handleDeepLink);

        // Uygulama kapalıyken açıldıysa initial URL'i kontrol et
        Linking.getInitialURL().then((url) => {
            if (url) {
                handleDeepLink({ url });
            }
        });

        return () => {
            subscription.remove();
        };
    }, []);

    // 3. Kimlik Doğrulama Fonksiyonları

    /**
     * Email ve Şifre ile giriş yapar
     * @param {string} email 
     * @param {string} password 
     * @returns {object} { user, session, error }
     */
    const signIn = async (email, password) => {
        setLoading(true);
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });
        setLoading(false);
        return { user: data.user, session: data.session, error };
    };

    /**
     * Yeni kullanıcı kaydı yapar
     * @param {string} email 
     * @param {string} password 
     * @returns {object} { user, session, error }
     */
    const signUp = async (email, password) => {
        setLoading(true);
        // Email onayı sonrası kullanıcıyı hazırladığımız web sayfasına yönlendiriyoruz
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                emailRedirectTo: 'https://plantim-new-kayit-fb2604.netlify.app',
            }
        });
        setLoading(false);
        return { user: data.user, session: data.session, error };
    };

    /**
     * Kullanıcının oturumunu kapatır
     * @returns {object} { error }
     */
    const signOut = async () => {
        setLoading(true);
        const { error } = await supabase.auth.signOut();
        setLoading(false);

        if (error) {
            Alert.alert("Çıkış Hatası", error.message);
        }
        return { error };
    };

    // YENİ EKLENDİ: Şifre Güncelleme (Giriş yapmış kullanıcılar için)
    /**
     * Kullanıcının şifresini günceller
     * @param {string} newPassword 
     * @returns {object} { data, error }
     */
    const updatePassword = async (newPassword) => {
        setLoading(true);
        const { data, error } = await supabase.auth.updateUser({
            password: newPassword
        });

        if (!error) {
            setIsPasswordReset(false); // Şifre başarıyla güncellendi, reset modundan çık
        }

        setLoading(false);
        return { data, error };
    };

    // YENİ EKLENDİ: Şifre Sıfırlama (Şifresini unutanlar için)
    /**
     * Şifre sıfırlama e-postası gönderir
     * @param {string} email 
     * @returns {object} { data, error }
     */
    const resetPassword = async (email) => {
        setLoading(true);
        // ÖNEMLİ: 'redirectTo' URL'sini Supabase panelinizdeki
        // Authentication -> URL Configuration ayarlarıyla eşleşecek
        // bir deep link (örn: 'sizinuygulamaniz://sifre-sifirla') 
        // ile değiştirmeniz gerekebilir.
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: 'plantim://reset-password',
        });
        setLoading(false);
        return { data, error };
    };


    // Context için sağlanacak değerler
    const value = {
        session, // Mevcut oturum bilgisi (null ise çıkış yapılmış)
        loading, // Oturum durumu kontrol ediliyor mu?
        isPasswordReset, // YENİ: Şifre sıfırlama modunda mıyız?
        signIn,  // Giriş fonksiyonu
        signUp,  // Kayıt fonksiyonu
        signOut, // Çıkış fonksiyonu
        updatePassword, // YENİ EKLENDİ
        resetPassword,  // YENİ EKLENDİ
        // İsteğe bağlı olarak, Supabase istemcisinin kendisini de döndürebilirsiniz
        supabase,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}