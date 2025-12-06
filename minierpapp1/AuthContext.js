import React, { createContext, useState, useEffect, useContext } from 'react';
import { Alert } from 'react-native';
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
        storage: require('@react-native-async-storage/async-storage').default,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
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
    const [loading, setLoading] = useState(true); // Başlangıçta oturum durumunu kontrol ederken true

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

    // 2. Kimlik Doğrulama Fonksiyonları

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
        // Eğer email onayına ihtiyacınız varsa, disable email confirmation eklemeyin.
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
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
             redirectTo: '', // Gerekliyse burayı doldurun
        });
        setLoading(false);
        return { data, error };
    };


    // Context için sağlanacak değerler
    const value = {
        session, // Mevcut oturum bilgisi (null ise çıkış yapılmış)
        loading, // Oturum durumu kontrol ediliyor mu?
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