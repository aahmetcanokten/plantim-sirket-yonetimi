import React, { createContext, useState, useEffect } from "react";
import { Alert, Platform } from "react-native";
import { useAuth } from "./AuthContext";

let Purchases;
if (Platform.OS === 'web') {
  Purchases = {
    setup: () => { },
    getOfferings: async () => ({ current: null }),
    purchasePackage: async () => { },
    restorePurchases: async () => { },
    addCustomerInfoUpdateListener: () => { },
    getCustomerInfo: async () => ({ entitlements: { active: {} } }),
    configure: async () => { },
  };
} else {
  try {
    Purchases = require('react-native-purchases').default;
  } catch (e) {
    console.log("RevenueCat (react-native-purchases) yüklenemedi. Expo Go kullanıyorsanız bu normaldir.");
    Purchases = {
      setup: () => { },
      getOfferings: async () => ({ current: null }),
      purchasePackage: async () => { },
      restorePurchases: async () => { },
      addCustomerInfoUpdateListener: () => { },
      getCustomerInfo: async () => ({ entitlements: { active: {} } }),
      configure: async () => { },
    };
  }
}

export const AppContext = createContext(null);

const REVENUECAT_API_KEY = 'appl_zUqEUrkKJboNQoJzgVBzrhXQfWX';

export function AppProvider({ children }) {
  const { session, supabase } = useAuth();

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [personnel, setPersonnel] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [assets, setAssets] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [processTemplates, setProcessTemplates] = useState([]);
  const [company, setCompany] = useState({ name: "Şirketim", address: "", taxId: "", requireInvoice: false });

  const [dbPremium, setDbPremium] = useState(false);
  const [rcPremium, setRcPremium] = useState(false);
  const isPremium = dbPremium || rcPremium;
  const [appDataLoading, setAppDataLoading] = useState(false);

  // --- RevenueCat Başlatma ve Dinleme ---
  useEffect(() => {
    const initRevenueCat = async () => {
      try {
        if (Platform.OS === 'ios') {
          await Purchases.configure({ apiKey: REVENUECAT_API_KEY });
        }

        const customerInfo = await Purchases.getCustomerInfo();
        if (customerInfo.entitlements.active['premium']) {
          setRcPremium(true);
        }
      } catch (e) {
        console.log("RevenueCat init error:", e);
        // Hata yok sayılabilir veya raporlanabilir
      }
    };

    initRevenueCat();

    const customerInfoUpdateListener = (info) => {
      if (info.entitlements.active['premium']) {
        setRcPremium(true);
      } else {
        setRcPremium(false);
      }
    };

    Purchases.addCustomerInfoUpdateListener(customerInfoUpdateListener);

    return () => {
      // Listener temizleme işlemi gerekirse buraya
    };
  }, []);

  // --- Verileri Yükle ---
  useEffect(() => {
    const loadAppData = async () => {
      if (session && supabase) {
        setAppDataLoading(true);
        const userId = session.user.id;

        try {
          // Ana verileri yükle (Assets hariç)
          const [
            customerRes,
            productRes,
            salesRes,
            personnelRes,
            vehicleRes,
            purchasesRes,
            userRes,
            companyRes,
            workOrdersRes,
            processTemplatesRes
          ] = await Promise.all([
            supabase.from('customers').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
            supabase.from('products').select('*').eq('user_id', userId).order('name', { ascending: true }),
            supabase.from('sales').select('*').eq('user_id', userId).order('sale_date', { ascending: false }),
            supabase.from('personnel').select('*').eq('user_id', userId).order('name', { ascending: true }),
            supabase.from('vehicles').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
            supabase.from('purchases').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
            supabase.from('user_profiles').select('is_premium').eq('user_id', userId).maybeSingle(),
            supabase.from('companies').select('*').eq('user_id', userId).maybeSingle(),
            supabase.from('work_orders').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
            supabase.from('process_templates').select('*').eq('user_id', userId).order('created_at', { ascending: false })
          ]);

          if (userRes.data && userRes.data.is_premium) {
            setDbPremium(true);
          } else {
            // Eğer kayıt yoksa ama session varsa, kullanıcıyı oluşturmayı dene (Opsiyonel güvenli önlem)
            setDbPremium(false);
          }

          setCustomers(customerRes.data || []);
          setProducts(productRes.data || []);
          setSales(salesRes.data || []);
          setVehicles(vehicleRes.data || []);
          setPurchases(purchasesRes.data || []);
          setWorkOrders((workOrdersRes?.data || []).map(wo => ({
            ...wo,
            processes: typeof wo.processes === 'string' ? JSON.parse(wo.processes) : (wo.processes || [])
          })));
          setProcessTemplates((processTemplatesRes?.data || []).map(pt => ({
            ...pt,
            processes: typeof pt.processes === 'string' ? JSON.parse(pt.processes) : (pt.processes || [])
          })));

          // Personel Görevlerini Parse Et
          const parsedPersonnel = (personnelRes.data || []).map(p => {
            if (typeof p.tasks === 'string') {
              try {
                return { ...p, tasks: JSON.parse(p.tasks) };
              } catch (e) {
                return { ...p, tasks: [] };
              }
            } else if (!p.tasks) {
              return { ...p, tasks: [] };
            }
            return p;
          });
          setPersonnel(parsedPersonnel);

          // Şirket Bilgilerini Ayarla
          if (companyRes.data) {
            setCompany({
              name: companyRes.data.name || "Şirketim",
              address: companyRes.data.address || "",
              taxId: companyRes.data.tax_id || "",
              requireInvoice: false
            });
          }

          // Assets (Zimmet) Verilerini Ayrı Yükle
          try {
            const { data: assetsData, error: assetsError } = await supabase
              .from('assets')
              .select('*')
              .eq('user_id', userId)
              .order('created_at', { ascending: false });

            if (assetsError) {
              console.log("Assets tablosu yüklenemedi:", assetsError.message);
              setAssets([]);
            } else {
              setAssets(assetsData || []);
            }
          } catch (assetErr) {
            console.log("Assets veri çekme hatası:", assetErr);
            setAssets([]);
          }

        } catch (e) {
          console.error("Supabase veri yüklenirken hata:", e);
          Alert.alert("Hata", "Verileriniz yüklenirken bir sorun oluştu.");
        } finally {
          setAppDataLoading(false);
        }
      } else {
        // Oturum yoksa temizle
        setCustomers([]);
        setProducts([]);
        setSales([]);
        setPersonnel([]);
        setVehicles([]);
        setPurchases([]);
        setAssets([]);
        setWorkOrders([]);
        setProcessTemplates([]);
        setDbPremium(false);
        setRcPremium(false);
        setAppDataLoading(false);
      }
    };

    loadAppData();
  }, [session, supabase]);


  // --- CRUD Fonksiyonları ---

  // Müşteriler
  // Müşteriler
  const addCustomer = async (c) => {
    if (!session || !supabase) return false;
    const toInsert = { ...c, user_id: session.user.id };
    const { data, error } = await supabase.from('customers').insert(toInsert).select();
    if (error) {
      Alert.alert("Hata", error.message);
      return false;
    } else {
      setCustomers((prev) => [data[0], ...prev]);
      return true;
    }
  };
  const updateCustomer = async (u) => {
    if (!session || !supabase) return false;
    const { data, error } = await supabase.from('customers').update(u).eq('id', u.id).select();
    if (error) {
      Alert.alert("Hata", error.message);
      return false;
    } else {
      setCustomers((prev) => prev.map(c => c.id === u.id ? data[0] : c));
      return true;
    }
  };
  const deleteCustomer = async (id) => {
    if (!session || !supabase) return false;
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) {
      Alert.alert("Hata", error.message);
      return false;
    } else {
      setCustomers((prev) => prev.filter(c => c.id !== id));
      return true;
    }
  };

  // Ürünler
  const addProduct = async (p, skipLimitCheck = false) => {
    if (!session || !supabase) return false;
    const toInsert = { ...p, user_id: session.user.id };
    const { data, error } = await supabase.from('products').insert(toInsert).select();
    if (error) {
      Alert.alert("Hata", error.message);
      return false;
    } else {
      setProducts((prev) => [data[0], ...prev]);
      return data[0];
    }
  };
  const updateProduct = async (u) => {
    if (!session || !supabase) return;
    const { data, error } = await supabase.from('products').update(u).eq('id', u.id).select();
    if (error) Alert.alert("Hata", error.message);
    else setProducts((prev) => prev.map(p => p.id === u.id ? data[0] : p));
  };
  const deleteProduct = async (id) => {
    if (!session || !supabase) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) Alert.alert("Hata", error.message);
    else setProducts((prev) => prev.filter(p => p.id !== id));
  };

  // Satışlar
  const addSale = async (s) => {
    if (!session || !supabase) return;
    const saleToAdd = { ...s, user_id: session.user.id, sale_date: new Date().toISOString() };
    delete saleToAdd.id;

    const { data: saleData, error: saleError } = await supabase.from('sales').insert(saleToAdd).select();
    if (saleError) {
      Alert.alert("Satış Hatası", saleError.message);
      return;
    }

    const product = products.find(p => p.id === s.productId);
    if (product) {
      const newQuantity = (product.quantity || 0) - (s.quantity || 0);
      const { data: productData } = await supabase.from('products').update({ quantity: newQuantity }).eq('id', s.productId).select();
      if (productData) setProducts(prevP => prevP.map(p => p.id === s.productId ? productData[0] : p));
    }
    setSales((prev) => [saleData[0], ...prev]);
  };
  const updateSale = async (u) => {
    if (!session || !supabase) return;
    const updateData = { ...u };
    delete updateData.id;
    const { data, error } = await supabase.from('sales').update(updateData).eq('id', u.id).select();
    if (error) Alert.alert("Hata", error.message);
    else setSales((prev) => prev.map(s => s.id === u.id ? data[0] : s));
  };
  const removeSale = async (sid) => {
    if (!session || !supabase) return false;
    const sale = sales.find(s => s.id === sid);
    if (!sale) return false;

    const { error: saleError } = await supabase.from('sales').delete().eq('id', sid);
    if (saleError) {
      Alert.alert("Hata", saleError.message);
      return false;
    }

    const product = products.find(p => p.id === sale.productId);
    if (product) {
      const newQuantity = (product.quantity || 0) + (sale.quantity || 0);
      const { data: productData } = await supabase.from('products').update({ quantity: newQuantity }).eq('id', sale.productId).select();
      if (productData) setProducts((prev) => prev.map(p => p.id === sale.productId ? productData[0] : p));
    }
    setSales((prev) => prev.filter(s => s.id !== sid));
    return true;
  };
  const recreateProductFromSale = (sale) => { };

  const generateInvoiceNumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const saleCount = sales.length + 1;
    const countPart = saleCount.toString().padStart(4, '0');
    return `${company.taxId || 'XXX'}-${year}${month}${day}-${countPart}`;
  };

  // Personel
  const addPersonnel = async (p) => {
    if (!session || !supabase) return;
    const toInsert = { ...p, user_id: session.user.id, tasks: JSON.stringify(p.tasks || []) };
    const { data, error } = await supabase.from('personnel').insert(toInsert).select();
    if (error) Alert.alert("Hata", error.message);
    else {
      const newPerson = data[0];
      newPerson.tasks = p.tasks || [];
      setPersonnel((prev) => [newPerson, ...prev]);
    }
  };
  const updatePersonnel = async (u) => {
    if (!session || !supabase) return;
    const updateData = { ...u };
    updateData.tasks = JSON.stringify(updateData.tasks || []);
    const { data, error } = await supabase.from('personnel').update(updateData).eq('id', u.id).select();
    if (error) Alert.alert("Hata", error.message);
    else {
      const updatedPerson = data[0];
      updatedPerson.tasks = u.tasks || [];
      setPersonnel((prev) => prev.map(p => p.id === u.id ? updatedPerson : p));
    }
  };
  const deletePersonnel = async (id) => {
    if (!session || !supabase) return;
    const { error } = await supabase.from('personnel').delete().eq('id', id);
    if (error) Alert.alert("Hata", error.message);
    else setPersonnel((prev) => prev.filter(p => p.id !== id));
  };

  // Araçlar
  const addVehicle = async (v) => {
    if (!session || !supabase) return;
    const toInsert = { ...v, user_id: session.user.id };
    const { data, error } = await supabase.from('vehicles').insert(toInsert).select();
    if (error) Alert.alert("Hata", error.message);
    else setVehicles((prev) => [data[0], ...prev]);
  };
  const updateVehicle = async (u) => {
    if (!session || !supabase) return;
    const { data, error } = await supabase.from('vehicles').update(u).eq('id', u.id).select();
    if (error) Alert.alert("Hata", error.message);
    else setVehicles((prev) => prev.map(v => v.id === u.id ? data[0] : v));
  };
  const deleteVehicle = async (id) => {
    if (!session || !supabase) return;
    const { error } = await supabase.from('vehicles').delete().eq('id', id);
    if (error) Alert.alert("Hata", error.message);
    else setVehicles((prev) => prev.filter(v => v.id !== id));
  };

  // Satın Almalar
  const addPurchase = async (p) => {
    if (!session || !supabase) return;
    const toInsert = { ...p, user_id: session.user.id };
    const { data, error } = await supabase.from('purchases').insert(toInsert).select();
    if (error) Alert.alert("Hata", error.message);
    else setPurchases((prev) => [data[0], ...prev]);
  };
  const updatePurchase = async (u) => {
    if (!session || !supabase) return;
    const { data, error } = await supabase.from('purchases').update(u).eq('id', u.id).select();
    if (error) Alert.alert("Hata", error.message);
    else setPurchases((prev) => prev.map(p => p.id === u.id ? data[0] : p));
  };
  const deletePurchase = async (id) => {
    if (!session || !supabase) return;
    const { error } = await supabase.from('purchases').delete().eq('id', id);
    if (error) Alert.alert("Hata", error.message);
    else setPurchases((prev) => prev.filter(p => p.id !== id));
  };
  const markPurchaseDelivered = async (pid) => {
    if (!session || !supabase) return;
    const purchaseToDeliver = purchases.find(p => p.id === pid);
    if (!purchaseToDeliver) return;

    const { data: purchaseData, error: purchaseError } = await supabase.from('purchases')
      .update({ delivered: true, delivered_date: new Date().toISOString() })
      .eq('id', pid).select();

    if (purchaseError) {
      Alert.alert("Hata", purchaseError.message);
      return;
    }

    const product = products.find(p => p.id === purchaseToDeliver.productId);
    if (product) {
      const newQuantity = (product.quantity || 0) + (purchaseToDeliver.quantity || 0);
      const { data: productData } = await supabase.from('products')
        .update({ quantity: newQuantity, last_purchase_cost: purchaseToDeliver.cost })
        .eq('id', purchaseToDeliver.productId).select();

      if (productData) setProducts(prevP => prevP.map(p => p.id === product.id ? productData[0] : p));
    }
    setPurchases(prev => prev.map(p => p.id === pid ? purchaseData[0] : p));
  };

  // --- ZİMMET YÖNETİMİ (ASSETS) ---
  const addAsset = async (asset) => {
    if (!session || !supabase) return;
    const toInsert = { ...asset, user_id: session.user.id, status: 'AVAILABLE' };
    const { data, error } = await supabase.from('assets').insert(toInsert).select();
    if (error) Alert.alert("Hata", error.message);
    else setAssets((prev) => [data[0], ...prev]);
  };
  const updateAsset = async (asset) => {
    if (!session || !supabase) return;
    const { data, error } = await supabase.from('assets').update(asset).eq('id', asset.id).select();
    if (error) Alert.alert("Hata", error.message);
    else setAssets((prev) => prev.map(a => a.id === asset.id ? data[0] : a));
  };
  const deleteAsset = async (id) => {
    if (!session || !supabase) return;
    const { error } = await supabase.from('assets').delete().eq('id', id);
    if (error) Alert.alert("Hata", error.message);
    else setAssets((prev) => prev.filter(a => a.id !== id));
  };
  const assignAsset = async (assetId, personId) => {
    if (!session || !supabase) return;
    const updateData = { status: 'ASSIGNED', assigned_person_id: personId, assigned_date: new Date().toISOString() };
    const { data, error } = await supabase.from('assets').update(updateData).eq('id', assetId).select();
    if (error) Alert.alert("Hata", error.message);
    else setAssets((prev) => prev.map(a => a.id === assetId ? data[0] : a));
  };
  const unassignAsset = async (assetId) => {
    if (!session || !supabase) return;
    const updateData = { status: 'AVAILABLE', assigned_person_id: null, assigned_date: null };
    const { data, error } = await supabase.from('assets').update(updateData).eq('id', assetId).select();
    if (error) Alert.alert("Hata", error.message);
    else setAssets((prev) => prev.map(a => a.id === assetId ? data[0] : a));
  };

  // --- İŞ EMİRLERİ (WORK ORDERS) ---
  const addWorkOrder = async (wo) => {
    if (!session || !supabase) return;
    const toInsert = {
      ...wo,
      user_id: session.user.id,
      status: wo.status || 'OPEN',
      processes: JSON.stringify(wo.processes || [])
    };
    const { data, error } = await supabase.from('work_orders').insert(toInsert).select();
    if (error) Alert.alert("Hata", error.message);
    else {
      const newWo = { ...data[0], processes: wo.processes || [] };
      setWorkOrders((prev) => [newWo, ...prev]);
      return newWo;
    }
  };

  const updateWorkOrder = async (u) => {
    if (!session || !supabase) return;
    const updateData = {
      ...u,
      processes: JSON.stringify(u.processes || [])
    };
    const { data, error } = await supabase.from('work_orders').update(updateData).eq('id', u.id).select();
    if (error) Alert.alert("Hata", error.message);
    else {
      const updatedWo = { ...data[0], processes: u.processes || [] };
      setWorkOrders((prev) => prev.map(wo => wo.id === u.id ? updatedWo : wo));
    }
  };

  const closeWorkOrder = async (id, closingData) => {
    if (!session || !supabase) return;
    const wo = workOrders.find(w => w.id === id);
    if (!wo) return;

    // Kullanılan prosesleri belirle (gelen veri varsa onu yoksa mevcut olanı kullan)
    const activeProcesses = closingData.processes || wo.processes || [];

    // Proseslerden toplam süreyi hesapla
    const totalDuration = activeProcesses.reduce((acc, curr) => acc + (parseFloat(curr.spent_time) || 0), 0);

    const updateData = {
      ...closingData,
      processes: JSON.stringify(activeProcesses),
      status: 'CLOSED',
      closed_at: new Date().toISOString(),
      total_duration: totalDuration
    };

    const { data: woData, error: woError } = await supabase.from('work_orders').update(updateData).eq('id', id).select();
    if (woError) {
      Alert.alert("Hata", woError.message);
      return;
    }

    // Stok güncelleme
    const product = products.find(p => p.id === wo.product_id);
    if (product) {
      const finishedQty = closingData.actual_quantity || wo.target_quantity || 0;
      const newQuantity = (product.quantity || 0) + finishedQty;
      const { data: productData } = await supabase.from('products').update({ quantity: newQuantity }).eq('id', wo.product_id).select();
      if (productData) setProducts(prevP => prevP.map(p => p.id === product.id ? productData[0] : p));
    }

    const closedWo = { ...woData[0], processes: activeProcesses };
    setWorkOrders(prev => prev.map(w => w.id === id ? closedWo : w));

    // --- YENİ: Hammadde Tüketimi ---
    if (wo.raw_material_id && wo.raw_material_usage) {
      const consumedQty = (parseFloat(wo.raw_material_usage) || 0) * (parseFloat(closingData.actual_quantity) || wo.target_quantity || 0);
      if (consumedQty > 0) {
        const rawProduct = products.find(p => p.id === wo.raw_material_id);
        if (rawProduct) {
          const newRawQty = (rawProduct.quantity || 0) - consumedQty;
          const { data: rawData } = await supabase.from('products').update({ quantity: newRawQty }).eq('id', wo.raw_material_id).select();
          if (rawData && rawData[0]) {
            setProducts(prevP => prevP.map(p => p.id === rawProduct.id ? rawData[0] : p));
          }
        }
      }
    }

    return true;
  };

  // --- PROSES ŞABLONLARI ---
  const addProcessTemplate = async (pt) => {
    if (!session || !supabase) return;
    const toInsert = {
      ...pt,
      user_id: session.user.id,
      processes: JSON.stringify(pt.processes || [])
    };
    const { data, error } = await supabase.from('process_templates').insert(toInsert).select();
    if (error) Alert.alert("Hata", error.message);
    else {
      const newPt = { ...data[0], processes: pt.processes || [] };
      setProcessTemplates((prev) => [newPt, ...prev]);
      return newPt;
    }
  };

  const deleteProcessTemplate = async (id) => {
    if (!session || !supabase) return;
    const { error } = await supabase.from('process_templates').delete().eq('id', id);
    if (error) Alert.alert("Hata", error.message);
    else setProcessTemplates((prev) => prev.filter(pt => pt.id !== id));
  };

  // --- Şirket Bilgileri (Supabase) ---
  const updateCompanyInfo = async (info) => {
    if (!session || !supabase) return;
    const updates = {
      user_id: session.user.id,
      name: info.name,
      address: info.address,
      tax_id: info.taxId,
    };
    const { error } = await supabase.from('companies').upsert(updates, { onConflict: 'user_id' });
    if (error) Alert.alert("Hata", "Şirket bilgileri güncellenemedi: " + error.message);
    else setCompany((prev) => ({ ...prev, ...info }));
  };

  // --- PREMIUM FONKSİYONLARI ---
  const purchasePremium = async (packageToPurchase) => {
    try {
      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
      if (customerInfo.entitlements.active['premium']) {
        setRcPremium(true);
        if (session && supabase) {
          await supabase.from('user_profiles').update({ is_premium: true }).eq('user_id', session.user.id);
          setDbPremium(true);
        }
        return true;
      }
    } catch (e) {
      if (!e.userCancelled) Alert.alert("Satın Alma Hatası", e.message);
      return false;
    }
    return false;
  };
  const restorePurchases = async () => {
    try {
      const customerInfo = await Purchases.restorePurchases();
      if (customerInfo.entitlements.active['premium']) {
        setRcPremium(true);
        if (session && supabase) {
          await supabase.from('user_profiles').update({ is_premium: true }).eq('user_id', session.user.id);
          setDbPremium(true);
        }
        Alert.alert("Başarılı", "Satın alımlarınız geri yüklendi.");
        return true;
      } else {
        Alert.alert("Bilgi", "Aktif bir premium abonelik bulunamadı.");
        return false;
      }
    } catch (e) {
      Alert.alert("Hata", "Geri yükleme hatası: " + e.message);
      return false;
    }
  };

  const deleteUserAccount = async () => {
    if (!session || !supabase) return false;
    const userId = session.user.id;
    try {
      // 1. Önce verileri sil (Foreign Key constraint hatalarını önlemek için manuel temizlik)
      // Eğer veritabanında "ON DELETE CASCADE" varsa bu adım şart değil ama önlem olarak kalabilir.
      await Promise.all([
        supabase.from('customers').delete().eq('user_id', userId),
        supabase.from('products').delete().eq('user_id', userId),
        supabase.from('sales').delete().eq('user_id', userId),
        supabase.from('personnel').delete().eq('user_id', userId),
        supabase.from('vehicles').delete().eq('user_id', userId),
        supabase.from('purchases').delete().eq('user_id', userId),
        supabase.from('assets').delete().eq('user_id', userId),
        supabase.from('companies').delete().eq('user_id', userId),
        supabase.from('user_profiles').delete().eq('user_id', userId)
      ]);

      // 2. Ardından Auth kullanıcısını silmek için RPC çağır
      // SQL: 
      // create or replace function delete_user_account()
      // returns void as $$
      // begin
      //   delete from auth.users where id = auth.uid();
      // end;
      // $$ language plpgsql security definer;

      const { error: rpcError } = await supabase.rpc('delete_user_account');

      if (rpcError) {
        console.log("RPC 'delete_user_account' çağrısı başarısız oldu (Fonksiyon oluşturulmamış olabilir). Kullanıcı sadece verileri silmiş oldu.", rpcError.message);
      } else {
        console.log("Kullanıcı hesabı ve Auth kaydı başarıyla silindi.");
      }

      return true;
    } catch (e) {
      console.error("Hesap silme hatası:", e);
      return false;
    }
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
        assets, addAsset, updateAsset, deleteAsset, assignAsset, unassignAsset,
        workOrders, addWorkOrder, updateWorkOrder, closeWorkOrder,
        processTemplates, addProcessTemplate, deleteProcessTemplate,
        company, updateCompanyInfo,
        isPremium, setPremiumStatus: setDbPremium, purchasePremium, restorePurchases,
        getPackages: async () => {
          const offerings = await Purchases.getOfferings();
          return offerings.current;
        },
        deleteUserAccount,
        appDataLoading
      }}
    >
      {children}
    </AppContext.Provider>
  );
}