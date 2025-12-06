import React, { createContext, useState, useEffect } from "react";
import { Alert, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Purchases from 'react-native-purchases';

// AuthContext'ten supabase ve useAuth import edildiği varsayılıyor
// Örnek importlar (gerçek yolunuzu kullanın):
// Hatalı import satırını kaldırıyoruz:
// import { supabase } from "./AuthContext"; 
import { useAuth } from "./AuthContext"; // Auth context'iniz

export const AppContext = createContext(null);

const COMPANY_KEY = "@app_company_v1";

export function AppProvider({ children }) {
  // DÜZELTME: 'supabase' istemcisini 'session' ile birlikte useAuth hook'undan alın.
  const { session, supabase } = useAuth();
  
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [personnel, setPersonnel] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [company, setCompany] = useState({ name: "Şirketim", address: "", taxId: "", requireInvoice: false });
  
  const [isPremium, setIsPremium] = useState(false);
  const [appDataLoading, setAppDataLoading] = useState(false);

  useEffect(() => {
    const loadAppData = async () => {
      // 1. Lokal Şirket Verilerini Yükle
      try {
        const companyData = await AsyncStorage.getItem(COMPANY_KEY);
        if (companyData) {
          setCompany(JSON.parse(companyData));
        }
      } catch (e) {
        console.error("Lokal şirket verisi yüklenemedi:", e);
      }
      
      // 2. SUPABASE VERİLERİNİ YÜKLE
      // KRİTİK DÜZELTME: 'supabase' artık tanımsız (undefined) değil, Context'ten geliyor.
      if (session && supabase) { // 'supabase' varlığını da kontrol et
        setAppDataLoading(true);
        const userId = session.user.id;

        try {
          const [
            customerRes,
            productRes,
            salesRes,
            personnelRes,
            vehicleRes,
            purchasesRes
          ] = await Promise.all([
            // SUPABASE HATA DÜZELTMESİ: supabase artık tanımlı
            supabase.from('customers').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
            supabase.from('products').select('*').eq('user_id', userId).order('name', { ascending: true }),
            supabase.from('sales').select('*').eq('user_id', userId).order('sale_date', { ascending: false }),
            supabase.from('personnel').select('*').eq('user_id', userId).order('name', { ascending: true }),
            supabase.from('vehicles').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
            supabase.from('purchases').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
          ]);

          if (customerRes.error) console.error("Customer Fetch Error:", customerRes.error.message);
          if (productRes.error) console.error("Product Fetch Error:", productRes.error.message);
          if (salesRes.error) console.error("Sales Fetch Error:", salesRes.error.message);
          if (personnelRes.error) console.error("Personnel Fetch Error:", personnelRes.error.message);
          if (vehicleRes.error) console.error("Vehicle Fetch Error:", vehicleRes.error.message);
          if (purchasesRes.error) console.error("Purchases Fetch Error:", purchasesRes.error.message);

          setCustomers(customerRes.data || []);
          setProducts(productRes.data || []);
          setSales(salesRes.data || []);

          // *** GÖREV KAYIT HATASI İÇİN DÜZELTME (1/2) ***
          // Veritabanından 'tasks' sütunu metin (string) olarak geliyorsa,
          // bunu uygulamada kullanmak için diziye (array) dönüştür (parse et).
          const parsedPersonnel = (personnelRes.data || []).map(p => {
            if (typeof p.tasks === 'string') {
              try {
                // Gelen metni JSON.parse ile diziye çevir
                return { ...p, tasks: JSON.parse(p.tasks) };
              } catch (e) {
                console.error(`Personel ${p.id} için görevler parse edilemedi:`, e);
                // Hata olursa veya veri bozuksa boş dizi ata
                return { ...p, tasks: [] }; 
              }
            } else if (!p.tasks) {
                // Eğer tasks alanı null veya undefined ise boş dizi ata
                return { ...p, tasks: [] };
            }
            // Eğer zaten bir dizi (veya jsonb) ise dokunma
            return p;
          });
          setPersonnel(parsedPersonnel);
          // *** DÜZELTME SONU (1/2) ***

          setVehicles(vehicleRes.data || []);
          setPurchases(purchasesRes.data || []);

        } catch (e) {
          console.error("Supabase veri yüklenirken kritik hata:", e);
          Alert.alert("Hata", "Verileriniz yüklenirken bir sorun oluştu.");
        } finally {
          setAppDataLoading(false);
        }
      } else {
        // Oturum veya Supabase yoksa verileri temizle
        setCustomers([]);
        setProducts([]);
        setSales([]);
        setPersonnel([]);
        setVehicles([]);
        setPurchases([]);
        setAppDataLoading(false); // Yükleme bitti
      }

      // 3. RevenueCat (Değişiklik yok)
      // ... existing code for Purchases ...
    };

    loadAppData();
  }, [session, supabase]); // 'supabase' dependency olarak eklendi

  useEffect(() => { 
    // Şirket bilgisi güncellendiğinde lokale kaydet
    const saveCompany = async () => {
      try {
        await AsyncStorage.setItem(COMPANY_KEY, JSON.stringify(company));
      } catch (e) {
        console.error("Şirket verisi kaydedilemedi:", e);
      }
    };
    saveCompany();
  }, [company]);


  // --- CRUD Fonksiyonları (Supabase ID Düzeltmeleri) ---

  // Müşteriler
  const addCustomer = async (c) => {
    if (!session || !supabase) return; // Supabase kontrolü eklendi
    // DÜZELTME: 'delete toInsert.id;' kaldırıldı. RN'de üretilen ID kullanılacak.
    const toInsert = { ...c, user_id: session.user.id };
    const { data, error } = await supabase.from('customers').insert(toInsert).select();
    if (error) Alert.alert("Hata", error.message);
    else setCustomers((prev) => [data[0], ...prev]);
  };
  const updateCustomer = async (u) => {
    if (!session || !supabase) return; // Supabase kontrolü eklendi
    const { data, error } = await supabase.from('customers').update(u).eq('id', u.id).select();
    if (error) Alert.alert("Hata", error.message);
    else setCustomers((prev) => prev.map(c => c.id === u.id ? data[0] : c));
  };
  const deleteCustomer = async (id) => {
    if (!session || !supabase) return; // Supabase kontrolü eklendi
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) Alert.alert("Hata", error.message);
    else setCustomers((prev) => prev.filter(c => c.id !== id));
  };

  // Ürünler
  const addProduct = async (p) => {
    if (!session || !supabase) return false; // Supabase kontrolü eklendi
    // DÜZELTME: 'delete productToAdd.id;' kaldırıldı. RN'de üretilen ID kullanılacak.
    const productToAdd = {
        ...p,
        user_id: session.user.id,
        quantity: parseInt(p.quantity) || 0,
        cost: parseFloat(p.cost) || 0,
        price: parseFloat(p.price) || 0
    };
    const { data, error } = await supabase.from('products').insert(productToAdd).select();
    if (error) { Alert.alert("Hata", error.message); return false; }
    
    setProducts((prev) => [data[0], ...prev]);
    return true;
  };
  const updateProduct = async (u) => {
    if (!session || !supabase) return false; // Supabase kontrolü eklendi
    const { data, error } = await supabase.from('products').update(u).eq('id', u.id).select();
    if (error) { Alert.alert("Hata", error.message); return false; }
    
    setProducts((prev) => prev.map(p => p.id === u.id ? data[0] : p));
    return true;
  };
  const deleteProduct = async (id) => {
     if (!session || !supabase) return; // Supabase kontrolü eklendi
     const { error } = await supabase.from('products').delete().eq('id', id);
     if (error) Alert.alert("Hata", error.message);
     else setProducts((prev) => prev.filter(p => p.id !== id));
  };

  // Satışlar
  const addSale = async (s) => {
    if (!session || !supabase) return; // Supabase kontrolü eklendi
    const saleToAdd = { 
        ...s, 
        user_id: session.user.id,
        sale_date: new Date().toISOString() // Satış tarihi
    };
    delete saleToAdd.id; // Supabase'in ID üretmesine izin ver
    
    // İşlem: Satışı kaydet ve stoku azalt
    
    // 1. Satışı kaydet
    const { data: saleData, error: saleError } = await supabase.from('sales').insert(saleToAdd).select();
    if (saleError) { 
        Alert.alert("Satış Hatası", saleError.message); 
        return; 
    }

    // 2. Stoğu azalt
    const product = products.find(p => p.id === s.productId);
    if (product) {
        const newQuantity = (product.quantity || 0) - (s.quantity || 0);
        const { data: productData, error: productError } = await supabase.from('products')
            .update({ quantity: newQuantity })
            .eq('id', s.productId)
            .select();
        
        if (productError) {
            console.error("Stok Güncelleme Hatası:", productError.message);
            Alert.alert("Hata", "Satış kaydedildi ancak stok güncellenemedi.");
        } else {
            // State'i güncelle
            setProducts(prevP => prevP.map(p => p.id === s.productId ? productData[0] : p));
        }
    }
    
    setSales((prev) => [saleData[0], ...prev]);
  };
  const updateSale = async (u) => {
    if (!session || !supabase) return; // Supabase kontrolü eklendi
    // 'sale_date' veya 'createdDateISO' yerine 'id' kullanıldığından emin olun
    const updateData = { ...u };
    delete updateData.id; // Primary key güncellenmemeli
    const { data, error } = await supabase.from('sales').update(updateData).eq('id', u.id).select();
    if (error) Alert.alert("Hata", error.message);
    else setSales((prev) => prev.map(s => s.id === u.id ? data[0] : s));
  };
  const removeSale = async (sid) => {
    if (!session || !supabase) return false; // Supabase kontrolü eklendi
    const sale = sales.find(s => s.id === sid);

    if (!sale) return false;
    
    // 1. Satışı sil
    const { error: saleError } = await supabase.from('sales').delete().eq('id', sid);
    if (saleError) {
        Alert.alert("Hata", "Satış silinemedi: " + saleError.message);
        return false;
    }

    // 2. Stoğu iade et
    const product = products.find(p => p.id === sale.productId);
    if (product) {
        const newQuantity = (product.quantity || 0) + (sale.quantity || 0);
        const { data: productData, error: productError } = await supabase.from('products')
            .update({ quantity: newQuantity })
            .eq('id', sale.productId)
            .select();
        
        if (productError) {
            console.error("Stok İade Hatası:", productError.message);
            Alert.alert("Uyarı", "Satış silindi ancak stok iade edilemedi.");
            return true; // Satış silindiği için yine de başarılı sayılabilir
        }
        
        // State'i güncelle
        setProducts((prev) => prev.map(p => p.id === sale.productId ? productData[0] : p));
    }
    
    setSales((prev) => prev.filter(s => s.id !== sid));
    return true;
  };
  const recreateProductFromSale = (sale) => {
    // ... Satıştan ürün oluşturma mantığı ...
  };
  
  // Satışlar için fatura numarası üretme
  const generateInvoiceNumber = () => {
    // Basit bir fatura numarası üretici
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    // Satış sayısına göre son 4 haneyi belirle
    const saleCount = sales.length + 1;
    const countPart = saleCount.toString().padStart(4, '0');
    
    return `${company.taxId || 'XXX'}-${year}${month}${day}-${countPart}`;
  };


  // Personel
  const addPersonnel = async (p) => {
    if (!session || !supabase) return; // Supabase kontrolü eklendi
    
    // Görevleri stringify et (eğer varsa, yoksa boş dizi olarak stringify et)
    const toInsert = { 
      ...p, 
      user_id: session.user.id,
      tasks: JSON.stringify(p.tasks || []) // Yeni eklerken de stringify et
    };
    
    const { data, error } = await supabase.from('personnel').insert(toInsert).select();
    
    if (error) {
      Alert.alert("Hata", error.message);
    } else {
      // Veritabanından dönen data'yı parse et
      const newPerson = data[0];
      if (newPerson && typeof newPerson.tasks === 'string') {
        try {
          newPerson.tasks = JSON.parse(newPerson.tasks);
        } catch (e) {
          newPerson.tasks = [];
        }
      } else if (!newPerson.tasks) {
          newPerson.tasks = [];
      }
      setPersonnel((prev) => [newPerson, ...prev]);
    }
  };
  
  // *** GÖREV KAYIT HATASI İÇİN DÜZELTME (2/2) ***
  const updatePersonnel = async (u) => {
    if (!session || !supabase) return; // Supabase kontrolü eklendi
    
    // Supabase'e göndermek için verinin kopyasını oluştur
    const updateData = { ...u };

    // 'tasks' alanı bir diziyse, veritabanına göndermeden önce metne (string) çevir.
    // Bu, Supabase'deki sütunun 'text' olduğunu varsayar.
    if (Array.isArray(updateData.tasks)) {
      try {
        updateData.tasks = JSON.stringify(updateData.tasks);
      } catch (e) {
        console.error("Görevler stringify edilemedi:", e);
        Alert.alert("Hata", "Görev verisi veritabanına gönderilemedi.");
        return;
      }
    } else if (updateData.tasks === undefined || updateData.tasks === null) {
      // Eğer görevler tanımsızsa, boş dizi olarak stringify et
      updateData.tasks = JSON.stringify([]);
    }
    // Eğer 'tasks' zaten string ise (veya başka bir tipse) dokunma

    // 'updateData' (tasks alanı stringify edilmiş) objesini veritabanına gönder
    const { data, error } = await supabase.from('personnel').update(updateData).eq('id', u.id).select();
    
    if (error) {
      Alert.alert("Hata", error.message);
    } else {
      // *** DÜZELTME: Veritabanından gelen yanıtı parse et ***
      // Veritabanı güncellenen kaydı 'tasks' alanı string olarak döndürecek.
      // Bunu local state'e (uygulama hafızasına) kaydetmeden önce tekrar diziye (array) çevirmeliyiz.
      const updatedPerson = data[0];
      
      if (updatedPerson && typeof updatedPerson.tasks === 'string') {
        try {
          updatedPerson.tasks = JSON.parse(updatedPerson.tasks);
        } catch (e) {
          console.error("Veritabanından gelen güncel görevler parse edilemedi:", e);
          updatedPerson.tasks = []; // Hata durumunda boş dizi ata
        }
      } else if (!updatedPerson.tasks) {
          updatedPerson.tasks = []; // null/undefined ise boş dizi ata
      }

      // Local state'i güncellenmiş ve 'tasks' alanı parse edilmiş veriyle set et
      setPersonnel((prev) => prev.map(p => p.id === u.id ? updatedPerson : p));
    }
  };
  // *** DÜZELTME SONU (2/2) ***

  const deletePersonnel = async (id) => {
    if (!session || !supabase) return; // Supabase kontrolü eklendi
    
    // GÖREV SİLME İLE İLGİLİ NOT: 
    // Supabase'de RLS (Row Level Security) veya trigger kullanarak
    // personel silindiğinde ilişkili görevlerin de (eğer ayrı bir tablodaysa)
    // silinmesini sağlamak iyi bir pratiktir. 
    // Mevcut yapıda görevler 'personnel' tablosunda olduğu için personel silinince görevler de silinir.
    
    const { error } = await supabase.from('personnel').delete().eq('id', id);
    if (error) Alert.alert("Hata", error.message);
    else setPersonnel((prev) => prev.filter(p => p.id !== id));
  };

  // Araçlar (Vehicles) - (SQL'de bu tabloyu eklediğinizi varsayarak)
  const addVehicle = async (v) => {
    if (!session || !supabase) return; // Supabase kontrolü eklendi
    // DÜZELTME: 'delete toInsert.id;' kaldırıldı.
    const toInsert = { ...v, user_id: session.user.id };
    const { data, error } = await supabase.from('vehicles').insert(toInsert).select();
    if (error) Alert.alert("Hata", error.message);
    else setVehicles((prev) => [data[0], ...prev]);
  };
  const updateVehicle = async (u) => {
    if (!session || !supabase) return; // Supabase kontrolü eklendi
    const { data, error } = await supabase.from('vehicles').update(u).eq('id', u.id).select();
    if (error) Alert.alert("Hata", error.message);
    else setVehicles((prev) => prev.map(v => v.id === u.id ? data[0] : v));
  };
  const deleteVehicle = async (id) => {
    if (!session || !supabase) return; // Supabase kontrolü eklendi
    const { error } = await supabase.from('vehicles').delete().eq('id', id);
    if (error) Alert.alert("Hata", error.message);
    else setVehicles((prev) => prev.filter(v => v.id !== id));
  };
  
  // Satın Almalar (Purchases)
  const addPurchase = async (p) => {
    if (!session || !supabase) return; // Supabase kontrolü eklendi
    // DÜZELTME: 'delete toInsert.id;' kaldırıldı.
    const toInsert = { ...p, user_id: session.user.id };
    const { data, error } = await supabase.from('purchases').insert(toInsert).select();
    if (error) Alert.alert("Hata", error.message);
    else setPurchases((prev) => [data[0], ...prev]);
  };
  const updatePurchase = async (u) => {
    if (!session || !supabase) return; // Supabase kontrolü eklendi
    const { data, error } = await supabase.from('purchases').update(u).eq('id', u.id).select();
    if (error) Alert.alert("Hata", error.message);
    else setPurchases((prev) => prev.map(p => p.id === u.id ? data[0] : p));
  };
  const deletePurchase = async (id) => {
    if (!session || !supabase) return; // Supabase kontrolü eklendi
    const { error } = await supabase.from('purchases').delete().eq('id', id);
    if (error) Alert.alert("Hata", error.message);
    else setPurchases((prev) => prev.filter(p => p.id !== id));
  };
  
  const markPurchaseDelivered = async (pid) => {
    if (!session || !supabase) return; // Supabase kontrolü eklendi

    const purchaseToDeliver = purchases.find(p => p.id === pid);

    if (!purchaseToDeliver) return;

    // 1. Satın almayı 'teslim edildi' olarak güncelle
    const { data: purchaseData, error: purchaseError } = await supabase.from('purchases')
        .update({ delivered: true, delivered_date: new Date().toISOString() }) // 'deliveredDateISO' yerine 'delivered_date' (SQL'e göre)
        .eq('id', pid)
        .select();

    if (purchaseError) {
        Alert.alert("Hata", "Satın alma güncellenemedi: " + purchaseError.message);
        return;
    }

    // 2. Stoğu arttır (teslim edilen ürün stoka eklenmeli)
    const product = products.find(p => p.id === purchaseToDeliver.productId);
    
    if (product && purchaseData && purchaseData.length > 0) {
        const newQuantity = (product.quantity || 0) + (purchaseToDeliver.quantity || 0);
        const { data: productData, error: productError } = await supabase.from('products')
            .update({ 
                quantity: newQuantity,
                last_purchase_cost: purchaseToDeliver.cost // Son maliyeti de güncelleyebiliriz
            })
            .eq('id', purchaseToDeliver.productId)
            .select();
        
        if (productError) {
             console.error("Stok Güncelleme Hatası (Teslimat):", productError.message);
             Alert.alert("Hata", "Teslimat kaydedildi ancak stok güncellenemedi.");
             // Satın alma güncellendiği için bu noktada çıkış yapmayız
        }
        
        // State'i hem ürün hem de satın alma için güncelle
        if (productData) { // productData'nın null/undefined gelme ihtimaline karşı kontrol
            setProducts(prevP => prevP.map(p => p.id === product.id ? productData[0] : p));
        }
        setPurchases(prev => prev.map(p => p.id === pid ? purchaseData[0] : p));
    } else {
        // Ürün bulunamazsa veya data gelmezse sadece satın almayı güncelle
        setPurchases(prev => prev.map(p => p.id === pid ? purchaseData[0] : p));
    }
  };

  // Şirket Bilgisi (Lokalde kalıyor)
  const updateCompanyInfo = (info) => setCompany((prev) => ({ ...prev, ...info }));

  // Premium fonksiyonları (Değişiklik yok)
  const purchasePremium = async () => {
    // ... kodunuz ...
  };

  const restorePurchases = async () => {
    // ... kodunuz ...
  };

  return (
    <AppContext.Provider
      value={{
        customers, addCustomer, updateCustomer, deleteCustomer,
        products, addProduct, updateProduct, deleteProduct,
        sales, addSale, updateSale, removeSale, recreateProductFromSale, generateInvoiceNumber,
        personnel, addPersonnel, updatePersonnel, deletePersonnel,
        vehicles, addVehicle, updateVehicle, deleteVehicle,
        purchases, addPurchase, updatePurchase, deletePurchase, markPurchaseDelivered,
        company, updateCompanyInfo,
        isPremium, purchasePremium, restorePurchases,
        appDataLoading
      }}
    >
      {children}
    </AppContext.Provider>
  );
}