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
  const [maintenanceRequests, setMaintenanceRequests] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [warehouseTransfers, setWarehouseTransfers] = useState([]);
  const [stockLocations, setStockLocations] = useState([]); // Çoklu depo stok konumları
  const [boms, setBoms] = useState([]);
  const [company, setCompany] = useState({ name: "Şirketim", address: "", taxId: "", requireInvoice: false });
  // --- FİNANS ---
  const [financeTransactions, setFinanceTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  // --- PERSONEL İZİN GEÇMİŞİ ---
  const [leaveHistory, setLeaveHistory] = useState([]);

  // --- PERSONEL YETKİLENDİRMESİ ---
  const [isRestrictedPersonnel, setIsRestrictedPersonnel] = useState(false);

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
            processTemplatesRes,
            maintenanceRes,
            quotationsRes,
            warehouseTransfersRes
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
            supabase.from('process_templates').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
            supabase.from('maintenance_requests').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
            supabase.from('quotations').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
            supabase.from('warehouse_transfers').select('*').eq('user_id', userId).order('transferred_at', { ascending: false })
          ]);

          // Personel Check
          try {
            const { data: pUser } = await supabase.from('personnel_users').select('role').eq('user_id', userId).maybeSingle();
            if (pUser && pUser.role === 'PERSONNEL') {
              setIsRestrictedPersonnel(true);
            } else {
              setIsRestrictedPersonnel(false);
            }
          } catch(e) {
            setIsRestrictedPersonnel(false);
          }

          // Finans verilerini yükle
          try {
            const [financeRes, budgetsRes] = await Promise.all([
              supabase.from('finance_transactions').select('*').eq('user_id', userId).order('transaction_date', { ascending: false }),
              supabase.from('budgets').select('*').eq('user_id', userId).order('period', { ascending: false })
            ]);
            setFinanceTransactions(financeRes.data || []);
            setBudgets(budgetsRes.data || []);
          } catch (financeErr) {
            console.log('Finans tabloları henüz oluşturulmamış olabilir:', financeErr?.message);
            setFinanceTransactions([]);
            setBudgets([]);
          }

          // Personel izin geçmişini yükle
          try {
            const { data: leaveData, error: leaveErr } = await supabase
              .from('personnel_leave_history')
              .select('*')
              .eq('user_id', userId)
              .order('created_at', { ascending: false });
            if (!leaveErr) setLeaveHistory(leaveData || []);
            else setLeaveHistory([]);
          } catch (leaveEx) {
            console.log('personnel_leave_history tablosu yüklenemedi:', leaveEx?.message);
            setLeaveHistory([]);
          }

          if (userRes.data && userRes.data.is_premium) {
            setDbPremium(true);
          } else {
            // Eğer kayıt yoksa ama session varsa, kullanıcıyı oluşturmayı dene (Opsiyonel güvenli önlem)
            setDbPremium(false);
          }

          setCustomers(customerRes.data || []);
          setProducts(productRes.data || []);

          // Satış verilerini eşle (DB snake_case -> UI camelCase)
          const mappedSales = (salesRes.data || []).map(s => ({
            ...s,
            productId: s.productId || s.product_id,
            productName: s.productName || s.product_name,
            customerId: s.customerId || s.customer_id,
            customerName: s.customerName || s.customer_name,
            isShipped: s.isShipped !== undefined ? s.isShipped : s.is_shipped,
            productCode: s.productCode || s.product_code,
            dateISO: s.dateISO || s.sale_date || s.created_at,
            shipmentDate: s.shipmentDate || s.shipment_date,
            invoiceNumber: s.invoiceNumber || s.invoice_number,
          }));
          setSales(mappedSales);
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
          setMaintenanceRequests((maintenanceRes?.data || []).map(mr => ({
            ...mr,
            tasks: typeof mr.tasks === 'string' ? JSON.parse(mr.tasks) : (mr.tasks || [])
          })));
          setQuotations((quotationsRes?.data || []).map(q => ({
            ...q,
            items: typeof q.items === 'string' ? JSON.parse(q.items) : (q.items || [])
          })));
          setWarehouseTransfers(warehouseTransfersRes?.data || []);

          // Stock Locations (Çoklu Depo Stok) yükle
          try {
            const { data: slData, error: slError } = await supabase
              .from('stock_locations')
              .select('*')
              .eq('user_id', userId)
              .order('warehouse_name', { ascending: true });
            if (!slError) setStockLocations(slData || []);
            else setStockLocations([]);
          } catch (slEx) {
            console.log('stock_locations tablosu henüz oluşturulmamış olabilir:', slEx?.message);
            setStockLocations([]);
          }

          // BOM verilerini ayrı yükle (tablo yoksa hata vermesin)
          try {
            const { data: bomsData, error: bomsError } = await supabase
              .from('boms').select('*').eq('user_id', userId).order('created_at', { ascending: false });
            if (!bomsError && bomsData) {
              setBoms(bomsData.map(b => ({
                ...b,
                components: typeof b.components === 'string' ? JSON.parse(b.components) : (b.components || [])
              })));
            } else {
              setBoms([]);
            }
          } catch (bomsErr) {
            console.log('boms tablosu henüz oluşturulmamış olabilir:', bomsErr?.message);
            setBoms([]);
          }

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
        setMaintenanceRequests([]);
        setQuotations([]);
        setWarehouseTransfers([]);
        setStockLocations([]);
        setBoms([]);
        setFinanceTransactions([]);
        setBudgets([]);
        setLeaveHistory([]);
        setDbPremium(false);
        setRcPremium(false);
        setIsRestrictedPersonnel(false);
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
  // NOT: Stok düşme işlemi artık teslim anında (markAsShipped / updateSale) gerçekleşir.
  const addSale = async (s) => {
    if (!session || !supabase) return;

    // DB tablosu snake_case sütunlar beklediği için eşleme yapıyoruz
    const saleToAdd = {
      ...s,
      user_id: session.user.id,
      sale_date: s.dateISO || s.sale_date || new Date().toISOString(),
      productId: s.productId || s.product_id,
      productName: s.productName || s.product_name,
      customerId: s.customerId || s.customer_id,
      customerName: s.customerName || s.customer_name,
      isShipped: s.isShipped !== undefined ? s.isShipped : s.is_shipped,
      productCode: s.productCode || s.product_code,
      invoiceNumber: s.invoiceNumber || s.invoice_number,
      shipmentDate: s.shipmentDate || s.shipment_date,
    };
    delete saleToAdd.id;
    delete saleToAdd.dateISO;
    delete saleToAdd.date;
    delete saleToAdd.product_id; delete saleToAdd.product_name; delete saleToAdd.customer_id;
    delete saleToAdd.customer_name; delete saleToAdd.is_shipped; delete saleToAdd.product_code;
    delete saleToAdd.invoice_number; delete saleToAdd.shipment_date;

    const { data: saleData, error: saleError } = await supabase.from('sales').insert(saleToAdd).select();
    if (saleError) {
      console.error("SUPABASE ERROR DETAILS:", saleError);

      const errorMsg = `Supabase Hata Detayı: \n\nMessage: ${saleError.message}\nDetails: ${saleError.details}\nHint: ${saleError.hint}`;
      if (Platform.OS === 'web') {
        window.alert(errorMsg);
      } else {
        Alert.alert("Satış Hatası", errorMsg);
      }
      return false; // Return explicit false so caller knows it failed
    }

    // Geriye dönen veriyi direkt kullanabiliriz (snake_case ile geldiği yerler varsa yine camelCase yapalım)
    const newMappedSale = {
      ...saleData[0],
      productId: saleData[0].productId || saleData[0].product_id,
      productName: saleData[0].productName || saleData[0].product_name,
      customerId: saleData[0].customerId || saleData[0].customer_id,
      customerName: saleData[0].customerName || saleData[0].customer_name,
      isShipped: saleData[0].isShipped !== undefined ? saleData[0].isShipped : saleData[0].is_shipped,
      productCode: saleData[0].productCode || saleData[0].product_code,
      dateISO: saleData[0].sale_date,
      shipmentDate: saleData[0].shipmentDate || saleData[0].shipment_date,
    };

    setSales((prev) => [newMappedSale, ...prev]);
    return newMappedSale;
  };
  const updateSale = async (u) => {
    if (!session || !supabase) return;

    // Teslim anında stok düş: isShipped true'ya geçiyorsa ve önceden false idiyse
    const previousSale = sales.find(s => s.id === u.id);
    const isBeingShipped = u.isShipped === true && previousSale && !previousSale.isShipped;

    const updateData = {
      ...u,
      productId: u.productId || u.product_id,
      productName: u.productName || u.product_name,
      customerId: u.customerId || u.customer_id,
      customerName: u.customerName || u.customer_name,
      isShipped: u.isShipped !== undefined ? u.isShipped : u.is_shipped,
      productCode: u.productCode || u.product_code,
      invoiceNumber: u.invoiceNumber || u.invoice_number,
      shipmentDate: u.shipmentDate || u.shipment_date,
      sale_date: u.dateISO || u.sale_date,
    };
    delete updateData.id;
    delete updateData.dateISO;
    delete updateData.date;
    delete updateData.product_id; delete updateData.product_name; delete updateData.customer_id;
    delete updateData.customer_name; delete updateData.is_shipped; delete updateData.product_code;
    delete updateData.invoice_number; delete updateData.shipment_date;

    const { data, error } = await supabase.from('sales').update(updateData).eq('id', u.id).select();
    if (error) {
      Alert.alert("Hata", error.message);
      return;
    }

    const mappedUpdated = {
      ...data[0],
      productId: data[0].productId || data[0].product_id,
      productName: data[0].productName || data[0].product_name,
      customerId: data[0].customerId || data[0].customer_id,
      customerName: data[0].customerName || data[0].customer_name,
      isShipped: data[0].isShipped !== undefined ? data[0].isShipped : data[0].is_shipped,
      productCode: data[0].productCode || data[0].product_code,
      dateISO: data[0].sale_date,
      shipmentDate: data[0].shipmentDate || data[0].shipment_date,
    };
    setSales((prev) => prev.map(s => s.id === u.id ? mappedUpdated : s));

    // Teslim onaylandıysa stoku düş
    if (isBeingShipped) {
      if (u.productId) {
        // Standart tek ürün satışı
        const product = products.find(p => p.id === u.productId);
        if (product) {
          const newQuantity = (product.quantity || 0) - (u.quantity || 0);
          const { data: productData } = await supabase.from('products')
            .update({ quantity: newQuantity })
            .eq('id', u.productId).select();
          if (productData) setProducts(prevP => prevP.map(p => p.id === u.productId ? productData[0] : p));
        }
      } else if (u.productCode === 'KOMPOZİT' && u.id) {
        // Kompozit satış: bileşenler description alanında saklanır ama
        // CompositeSaleModal artık stok düşmez, bu yüzden burada da gerek yok.
        // (Bileşen bilgisi mevcut state'de yoksa atlanabilir)
      }
    }
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

    // Stok iadesi SADECE teslim edilmiş (isShipped) siparişler için geçerlidir.
    // Teslim edilmemiş siparişlerde zaten stok düşülmemişti, iade gerekmez.
    if (sale.isShipped && sale.productId) {
      const product = products.find(p => p.id === sale.productId);
      if (product) {
        const newQuantity = (product.quantity || 0) + (sale.quantity || 0);
        const { data: productData } = await supabase.from('products').update({ quantity: newQuantity }).eq('id', sale.productId).select();
        if (productData) setProducts((prev) => prev.map(p => p.id === sale.productId ? productData[0] : p));
      }
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
    const toInsert = {
      ...p,
      user_id: session.user.id,
      tasks: JSON.stringify(p.tasks || []),
      // Yeni alanlar — undefined gelirse null'a çevir
      department: p.department || null,
      email: p.email || null,
      national_id: p.national_id || null,
      employment_type: p.employment_type || 'FULL_TIME',
      status: p.status || 'ACTIVE',
      salary: p.salary ? parseFloat(p.salary) : null,
      salary_currency: p.salary_currency || 'TRY',
      emergency_contact: p.emergency_contact || null,
      emergency_phone: p.emergency_phone || null,
      end_date: p.end_date || null,
      performance_score: p.performance_score ? parseFloat(p.performance_score) : null,
      notes: p.notes || null,
    };
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
    const updateData = {
      ...u,
      tasks: JSON.stringify(u.tasks || []),
      salary: u.salary ? parseFloat(u.salary) : null,
      performance_score: u.performance_score ? parseFloat(u.performance_score) : null,
    };
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

  // --- PERSONEL İZİN GEÇMİŞİ ---
  const addLeaveRecord = async (record) => {
    if (!session || !supabase) return false;
    const toInsert = { ...record, user_id: session.user.id };
    const { data, error } = await supabase.from('personnel_leave_history').insert(toInsert).select();
    if (error) { Alert.alert("Hata", error.message); return false; }
    setLeaveHistory((prev) => [data[0], ...prev]);
    return data[0];
  };
  const deleteLeaveRecord = async (id) => {
    if (!session || !supabase) return false;
    const { error } = await supabase.from('personnel_leave_history').delete().eq('id', id);
    if (error) { Alert.alert("Hata", error.message); return false; }
    setLeaveHistory((prev) => prev.filter(l => l.id !== id));
    return true;
  };
  const fetchLeaveHistory = (personId) => {
    return leaveHistory.filter(l => l.person_id === personId);
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

    const finishedQty = parseFloat(closingData.actual_quantity) || parseFloat(wo.target_quantity) || 0;

    // Üretilen ürünü stoğa ekle
    const product = products.find(p => p.id === wo.product_id);
    if (product) {
      const newQuantity = (product.quantity || 0) + finishedQty;
      const { data: productData } = await supabase.from('products').update({ quantity: newQuantity }).eq('id', wo.product_id).select();
      if (productData) setProducts(prevP => prevP.map(p => p.id === product.id ? productData[0] : p));
    }

    const closedWo = { ...woData[0], processes: activeProcesses };
    setWorkOrders(prev => prev.map(w => w.id === id ? closedWo : w));

    // --- SATIŞI OTOMATİK TAMAMLA (Link varsa) ---
    if (wo.sale_id) {
      const sale = sales.find(s => s.id === wo.sale_id);
      if (sale && !sale.isShipped) {
        // Satışı sevk edildi (tamamlandı) olarak işaretle
        // Bu işlem updateSale üzerinden geçerek hem DB'yi günceller hem stoku düşer.
        await updateSale({ ...sale, isShipped: true });
        console.log(`İş emri tamamlandığı için ${sale.id} nolu satış tamamlandı olarak işaretlendi.`);
      }
    }

    // --- BOM Bileşen Tüketimi (çok bileşenli) ---
    const bomComponents = typeof wo.bom_components === 'string'
      ? JSON.parse(wo.bom_components || '[]')
      : (wo.bom_components || []);

    if (bomComponents.length > 0) {
      for (const comp of bomComponents) {
        const consumedQty = (parseFloat(comp.quantity) || 0) * finishedQty;
        if (consumedQty > 0 && comp.product_id) {
          const compProduct = products.find(p => p.id === comp.product_id);
          if (compProduct) {
            const newCompQty = Math.max(0, (compProduct.quantity || 0) - consumedQty);
            const { data: compData } = await supabase.from('products').update({ quantity: newCompQty }).eq('id', comp.product_id).select();
            if (compData && compData[0]) {
              setProducts(prevP => prevP.map(p => p.id === comp.product_id ? compData[0] : p));
            }
          }
        }
      }
    } else if (wo.raw_material_id && wo.raw_material_usage) {
      // Geriye dönük uyumluluk: eski tek hammadde mantığı
      const consumedQty = (parseFloat(wo.raw_material_usage) || 0) * finishedQty;
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

  // --- BOM'DAN İŞ EMRİ OLUŞTURMA ---
  const addWorkOrderFromBom = async (bomId, quantity, extraData = {}) => {
    if (!session || !supabase) return null;
    const bom = boms.find(b => b.id === bomId);
    if (!bom) return null;

    const prodQty = parseFloat(quantity) || 1;
    const components = bom.components || [];

    // İş emri numarası üret
    const today = new Date();
    const dateStr = today.getFullYear().toString() +
      (today.getMonth() + 1).toString().padStart(2, '0') +
      today.getDate().toString().padStart(2, '0');
    const todaysOrders = workOrders.filter(wo => new Date(wo.created_at).toDateString() === today.toDateString());
    const woNumber = `${dateStr}-${(todaysOrders.length + 1).toString().padStart(3, '0')}`;

    // Ürün ID'sini isimden bul
    const matchedProduct = products.find(p =>
      p.name?.toLowerCase() === bom.product_name?.toLowerCase() ||
      p.code?.toLowerCase() === bom.product_code?.toLowerCase()
    );

    const woData = {
      product_id: extraData.product_id || matchedProduct?.id || null,
      target_quantity: prodQty,
      notes: extraData.notes || `BOM: ${bom.bom_number} - ${bom.product_name} için otomatik oluşturuldu`,
      processes: [],
      bom_id: bomId,
      bom_components: components,
      sale_id: extraData.sale_id || null, // Satış ID'si eklendi
      raw_material_id: null,
      raw_material_usage: null,
      wo_number: woNumber,
      created_at: new Date().toISOString(),
      status: 'OPEN',
      user_id: session.user.id,
    };

    const toInsert = {
      ...woData,
      processes: JSON.stringify([]),
      bom_components: JSON.stringify(components),
    };

    try {
      const { data, error } = await supabase.from('work_orders').insert(toInsert).select();
      if (error) throw error;
      const newWo = {
        ...data[0],
        processes: [],
        bom_components: components,
      };
      setWorkOrders(prev => [newWo, ...prev]);
      return newWo;
    } catch (e) {
      console.error('BOM iş emri oluşturma hatası:', e.message);
      Alert.alert('Hata', 'İş emri oluşturulamadı: ' + e.message);
      return null;
    }
  };

  // --- BAKIM VE SERVİS YÖNETİMİ ---
  const generateMrNumber = () => {
    const today = new Date();
    const dateStr = today.getFullYear().toString() + (today.getMonth() + 1).toString().padStart(2, '0') + today.getDate().toString().padStart(2, '0');
    const todaysEntries = maintenanceRequests.filter(mr => new Date(mr.created_at).toDateString() === today.toDateString());
    return `MR-${dateStr}-${(todaysEntries.length + 1).toString().padStart(3, '0')}`;
  };

  const addMaintenanceRequest = async (mr) => {
    if (!session || !supabase) return;
    const toInsert = {
      ...mr,
      user_id: session.user.id,
      status: 'OPEN',
      tasks: JSON.stringify(mr.tasks || []),
      mr_number: generateMrNumber(),
      created_at: new Date().toISOString()
    };
    const { data, error } = await supabase.from('maintenance_requests').insert(toInsert).select();
    if (error) Alert.alert('Hata', error.message);
    else {
      const newMr = { ...data[0], tasks: mr.tasks || [] };
      setMaintenanceRequests(prev => [newMr, ...prev]);
      return newMr;
    }
  };

  const updateMaintenanceRequest = async (u) => {
    if (!session || !supabase) return;
    const updateData = { ...u, tasks: JSON.stringify(u.tasks || []) };
    const { data, error } = await supabase.from('maintenance_requests').update(updateData).eq('id', u.id).select();
    if (error) Alert.alert('Hata', error.message);
    else {
      const updatedMr = { ...data[0], tasks: u.tasks || [] };
      setMaintenanceRequests(prev => prev.map(mr => mr.id === u.id ? updatedMr : mr));
    }
  };

  const closeMaintenanceRequest = async (id, closingData) => {
    if (!session || !supabase) return;
    const mr = maintenanceRequests.find(m => m.id === id);
    if (!mr) return;
    const activeTasks = closingData.tasks || mr.tasks || [];
    const totalDuration = activeTasks.reduce((acc, t) => acc + (parseFloat(t.spent_time) || 0), 0);
    const updateData = {
      ...closingData,
      tasks: JSON.stringify(activeTasks),
      status: 'CLOSED',
      closed_at: new Date().toISOString(),
      total_duration: totalDuration
    };
    const { data, error } = await supabase.from('maintenance_requests').update(updateData).eq('id', id).select();
    if (error) { Alert.alert('Hata', error.message); return; }
    const closedMr = { ...data[0], tasks: activeTasks };
    setMaintenanceRequests(prev => prev.map(m => m.id === id ? closedMr : m));
    return true;
  };

  const deleteMaintenanceRequest = async (id) => {
    if (!session || !supabase) return;
    const { error } = await supabase.from('maintenance_requests').delete().eq('id', id);
    if (error) Alert.alert('Hata', error.message);
    else setMaintenanceRequests(prev => prev.filter(mr => mr.id !== id));
  };

  // --- TEKLİFLER (QUOTATIONS) ---
  const generateQuoteNumber = () => {
    const today = new Date();
    const dateStr = today.getFullYear().toString() + (today.getMonth() + 1).toString().padStart(2, '0') + today.getDate().toString().padStart(2, '0');
    const todaysQuotes = quotations.filter(q => new Date(q.created_at).toDateString() === today.toDateString());
    return `TKL-${dateStr}-${(todaysQuotes.length + 1).toString().padStart(3, '0')}`;
  };

  const addQuotation = async (q) => {
    if (!session || !supabase) return;
    const totalAmount = (q.items || []).reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
    const toInsert = {
      ...q,
      user_id: session.user.id,
      status: 'DRAFT',
      items: JSON.stringify(q.items || []),
      quote_number: generateQuoteNumber(),
      total_amount: totalAmount,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    const { data, error } = await supabase.from('quotations').insert(toInsert).select();
    if (error) Alert.alert('Hata', error.message);
    else {
      const newQ = { ...data[0], items: q.items || [] };
      setQuotations(prev => [newQ, ...prev]);
      return newQ;
    }
  };

  const updateQuotation = async (u) => {
    if (!session || !supabase) return;
    const totalAmount = (u.items || []).reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
    const updateData = {
      ...u,
      items: JSON.stringify(u.items || []),
      total_amount: totalAmount,
      updated_at: new Date().toISOString()
    };
    const { data, error } = await supabase.from('quotations').update(updateData).eq('id', u.id).select();
    if (error) Alert.alert('Hata', error.message);
    else {
      const updatedQ = { ...data[0], items: u.items || [] };
      setQuotations(prev => prev.map(q => q.id === u.id ? updatedQ : q));
    }
  };

  const cancelQuotation = async (id) => {
    if (!session || !supabase) return;
    const { data, error } = await supabase.from('quotations').update({ status: 'CANCELLED', updated_at: new Date().toISOString() }).eq('id', id).select();
    if (error) Alert.alert('Hata', error.message);
    else {
      const existing = quotations.find(q => q.id === id);
      setQuotations(prev => prev.map(q => q.id === id ? { ...data[0], items: existing?.items || [] } : q));
    }
  };

  const approveQuotation = async (id) => {
    if (!session || !supabase) return;
    const { data, error } = await supabase.from('quotations').update({ status: 'APPROVED', updated_at: new Date().toISOString() }).eq('id', id).select();
    if (error) Alert.alert('Hata', error.message);
    else {
      const existing = quotations.find(q => q.id === id);
      setQuotations(prev => prev.map(q => q.id === id ? { ...data[0], items: existing?.items || [] } : q));
    }
  };

  const convertQuotationToSale = async (id) => {
    if (!session || !supabase) return;
    const quotation = quotations.find(q => q.id === id);
    if (!quotation) return;
    const items = quotation.items || [];
    if (items.length === 0) {
      Alert.alert('Hata', 'Teklifte ürün kalemi bulunmuyor.');
      return;
    }
    try {
      // Her kalem için satış oluştur
      const salePromises = items.map(item => {
        const product = products.find(p => p.id === item.product_id);
        const saleToAdd = {
          user_id: session.user.id,
          productId: item.product_id,
          productName: item.product_name,
          productCode: product?.code || '',
          quantity: item.quantity,
          price: item.unit_price,
          cost: product?.cost || 0,
          customerId: quotation.customer_id || null,
          customerName: quotation.customer_name || '',
          description: `Tekliften oluşturuldu: ${quotation.quote_number}`,
          source_quote_id: id,
          isShipped: false,
          date: new Date().toLocaleString(),
          sale_date: new Date().toISOString(),
          dateISO: new Date().toISOString()
        };
        return supabase.from('sales').insert(saleToAdd).select();
      });

      const results = await Promise.all(salePromises);
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        Alert.alert('Hata', 'Bazı kalemler siparişe dönüştürülürken hata oluştu.');
        return;
      }

      // Stok güncelle ve sales state'i güncelle
      const newSales = [];
      for (let i = 0; i < results.length; i++) {
        const saleRow = results[i].data[0];
        newSales.push(saleRow);
        const item = items[i];
        const product = products.find(p => p.id === item.product_id);
        if (product) {
          const newQty = (product.quantity || 0) - (item.quantity || 0);
          const { data: prodData } = await supabase.from('products').update({ quantity: newQty }).eq('id', item.product_id).select();
          if (prodData) setProducts(prev => prev.map(p => p.id === item.product_id ? prodData[0] : p));
        }
      }
      setSales(prev => [...newSales, ...prev]);

      // Teklif durumunu CONVERTED yap
      const { data: qData, error: qError } = await supabase.from('quotations')
        .update({ status: 'CONVERTED', updated_at: new Date().toISOString() })
        .eq('id', id).select();
      if (!qError && qData) {
        setQuotations(prev => prev.map(q => q.id === id ? { ...qData[0], items: quotation.items } : q));
      }
      return true;
    } catch (e) {
      Alert.alert('Hata', 'Siparişe dönüştürme sırasında beklenmedik bir hata oluştu.');
      return false;
    }
  };

  const deleteQuotation = async (id) => {
    if (!session || !supabase) return;
    const quotation = quotations.find(q => q.id === id);
    if (!quotation) return;
    if (quotation.status !== 'DRAFT' && quotation.status !== 'CANCELLED') {
      Alert.alert('Hata', 'Yalnızca taslak veya iptal edilmiş teklifler silinebilir.');
      return;
    }
    const { error } = await supabase.from('quotations').delete().eq('id', id);
    if (error) Alert.alert('Hata', error.message);
    else setQuotations(prev => prev.filter(q => q.id !== id));
  };

  // --- DEPO TRANSFERLERİ (ÇOK DEPOLU ERP MANTIĞI) ---

  // Bir ürünün tüm depolardaki dağılımını getir
  const getProductStockLocations = (productId) => {
    return stockLocations.filter(sl => sl.product_id === productId);
  };

  // Belirli bir ürünün belirli bir depodaki stok miktarını getir
  const getStockAtWarehouse = (productId, warehouseName) => {
    const sl = stockLocations.find(s => s.product_id === productId && s.warehouse_name === warehouseName);
    return sl ? sl.quantity : 0;
  };

  // Tüm benzersiz depo isimlerini getir
  const getAllWarehouses = () => {
    const warehouseSet = new Set();
    stockLocations.forEach(sl => {
      if (sl.warehouse_name) warehouseSet.add(sl.warehouse_name);
    });
    // Ayrıca ürünlerdeki warehouseLocation'ları da ekle (eski uyumluluk)
    products.forEach(p => {
      const loc = p.warehouseLocation || p.warehouse_location;
      if (loc) warehouseSet.add(loc);
    });
    return Array.from(warehouseSet).sort();
  };

  // stock_locations tablosunu güncelle (upsert - kayıt yoksa ekle, varsa güncelle)
  const upsertStockLocation = async (userId, productId, warehouseName, quantity) => {
    if (quantity <= 0) {
      // Sıfırlanmışsa kaydı sil
      const { error } = await supabase
        .from('stock_locations')
        .delete()
        .eq('product_id', productId)
        .eq('warehouse_name', warehouseName);
      if (!error) {
        setStockLocations(prev => prev.filter(
          sl => !(sl.product_id === productId && sl.warehouse_name === warehouseName)
        ));
      }
      return !error;
    }
    const { data, error } = await supabase
      .from('stock_locations')
      .upsert(
        { user_id: userId, product_id: productId, warehouse_name: warehouseName, quantity, updated_at: new Date().toISOString() },
        { onConflict: 'product_id,warehouse_name', ignoreDuplicates: false }
      )
      .select();
    if (!error && data && data[0]) {
      setStockLocations(prev => {
        const existing = prev.find(sl => sl.product_id === productId && sl.warehouse_name === warehouseName);
        if (existing) {
          return prev.map(sl => (sl.product_id === productId && sl.warehouse_name === warehouseName) ? data[0] : sl);
        } else {
          return [data[0], ...prev];
        }
      });
    }
    return !error;
  };

  const addWarehouseTransfer = async (transfer) => {
    if (!session || !supabase) return false;
    const { product_id, from_warehouse, to_warehouse, quantity, note } = transfer;

    // Ürünü bul
    const product = products.find(p => p.id === product_id);
    if (!product) {
      if (Platform.OS === 'web') window.alert('Ürün bulunamadı.');
      else Alert.alert('Hata', 'Ürün bulunamadı.');
      return false;
    }

    // Kaynak depodaki stok kontrolü
    const fromStockEntry = stockLocations.find(
      sl => sl.product_id === product_id && sl.warehouse_name === from_warehouse
    );
    const fromQty = fromStockEntry ? fromStockEntry.quantity : 0;

    if (fromQty < quantity) {
      const msg = `${from_warehouse} deposunda yeterli stok yok. Mevcut: ${fromQty}`;
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Hata', msg);
      return false;
    }

    try {
      const userId = session.user.id;
      const newFromQty = fromQty - quantity;

      // Hedef depodaki mevcut stoku bul
      const toStockEntry = stockLocations.find(
        sl => sl.product_id === product_id && sl.warehouse_name === to_warehouse
      );
      const newToQty = (toStockEntry ? toStockEntry.quantity : 0) + quantity;

      // Transfer kaydı ekle
      const toInsert = {
        user_id: userId,
        product_id,
        product_name: product.name,
        quantity,
        from_warehouse,
        to_warehouse,
        note: note || '',
        transferred_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      };
      const { data: transferData, error: transferError } = await supabase
        .from('warehouse_transfers')
        .insert(toInsert)
        .select();
      if (transferError) {
        if (Platform.OS === 'web') window.alert(transferError.message);
        else Alert.alert('Hata', transferError.message);
        return false;
      }

      // Kaynak depo stokunu güncelle
      const fromOk = await upsertStockLocation(userId, product_id, from_warehouse, newFromQty);
      if (!fromOk) return false;

      // Hedef depo stokunu güncelle
      const toOk = await upsertStockLocation(userId, product_id, to_warehouse, newToQty);
      if (!toOk) return false;

      // products tablosundaki toplam quantity'yi güncelle (tüm depolar toplamı)
      // ve warehouseLocation'ı ana depoya (en fazla stoğu olan) güncelle
      const allLocs = stockLocations
        .filter(sl => sl.product_id === product_id && !(sl.warehouse_name === from_warehouse))
        .concat([
          { product_id, warehouse_name: from_warehouse, quantity: newFromQty },
          ...(toStockEntry ? [] : [{ product_id, warehouse_name: to_warehouse, quantity }])
        ]);

      // Daha kesin hesap için yeniden çek
      const { data: freshLocs } = await supabase
        .from('stock_locations')
        .select('*')
        .eq('product_id', product_id)
        .gt('quantity', 0);

      if (freshLocs) {
        const totalQty = freshLocs.reduce((sum, sl) => sum + (sl.quantity || 0), 0);
        const primaryWarehouse = freshLocs.reduce(
          (max, sl) => sl.quantity > (max?.quantity || 0) ? sl : max, null
        );
        await supabase
          .from('products')
          .update({
            quantity: totalQty,
            warehouseLocation: primaryWarehouse?.warehouse_name || to_warehouse
          })
          .eq('id', product_id);
        setProducts(prev => prev.map(p => p.id === product_id
          ? { ...p, quantity: totalQty, warehouseLocation: primaryWarehouse?.warehouse_name || to_warehouse }
          : p
        ));
        // state'i de güncelle
        setStockLocations(prev => {
          const filtered = prev.filter(sl => sl.product_id !== product_id);
          return [...filtered, ...freshLocs];
        });
      }

      setWarehouseTransfers(prev => [transferData[0], ...prev]);
      return true;
    } catch (e) {
      console.error('Transfer hatası:', e);
      if (Platform.OS === 'web') window.alert('Transfer gerçekleştirilemedi: ' + e.message);
      else Alert.alert('Hata', 'Transfer gerçekleştirilemedi.');
      return false;
    }
  };

  // Ürüne yeni depo konumu ekle / stok dağıt
  const addStockToWarehouse = async (productId, warehouseName, quantity) => {
    if (!session || !supabase) return false;
    const product = products.find(p => p.id === productId);
    if (!product) return false;
    const existing = stockLocations.find(sl => sl.product_id === productId && sl.warehouse_name === warehouseName);
    const newQty = (existing?.quantity || 0) + quantity;
    return await upsertStockLocation(session.user.id, productId, warehouseName, newQty);
  };

  // --- BOM (BILL OF MATERIALS) YÖNETİMİ ---
  const generateBomNumber = () => {
    const today = new Date();
    const dateStr = today.getFullYear().toString() + (today.getMonth() + 1).toString().padStart(2, '0') + today.getDate().toString().padStart(2, '0');
    const todaysBoms = boms.filter(b => new Date(b.created_at).toDateString() === today.toDateString());
    return `BOM-${dateStr}-${(todaysBoms.length + 1).toString().padStart(3, '0')}`;
  };

  const addBom = async (bom) => {
    if (!session || !supabase) return null;
    const toInsert = {
      ...bom,
      user_id: session.user.id,
      bom_number: generateBomNumber(),
      components: JSON.stringify(bom.components || []),
      status: bom.status || 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    try {
      const { data, error } = await supabase.from('boms').insert(toInsert).select();
      if (error) throw error;
      const newBom = { ...data[0], components: bom.components || [] };
      setBoms(prev => [newBom, ...prev]);

      // Ürün stok listesinde yoksa 0 miktar ile oluştur
      const matchedProduct = products.find(p =>
        (p.code && bom.product_code && p.code === bom.product_code) ||
        (p.name && p.name.toLowerCase() === bom.product_name.toLowerCase())
      );

      if (!matchedProduct) {
        const placeholderProduct = {
          name: bom.product_name,
          category: bom.category || 'Üretim',
          quantity: 0,
          cost: 0,
          price: bom.sale_price || 0,
          code: bom.product_code || '',
          criticalStockLimit: bom.critical_limit || 5,
          description: bom.description || `BOM: ${newBom.bom_number}`,
          user_id: session.user.id
        };
        await addProduct(placeholderProduct, true);
      }

      return newBom;
    } catch (e) {
      console.error('BOM eklenirken hata:', e.message);
      return null;
    }
  };

  const updateBom = async (u) => {
    if (!session || !supabase) return false;
    const updateData = {
      ...u,
      components: JSON.stringify(u.components || []),
      updated_at: new Date().toISOString()
    };
    try {
      const { data, error } = await supabase.from('boms').update(updateData).eq('id', u.id).select();
      if (error) throw error;
      const updatedBom = { ...data[0], components: u.components || [] };
      setBoms(prev => prev.map(b => b.id === u.id ? updatedBom : b));
      return true;
    } catch (e) {
      console.error('BOM güncellenirken hata:', e.message);
      return false;
    }
  };

  const deleteBom = async (id) => {
    if (!session || !supabase) return false;
    try {
      const { error } = await supabase.from('boms').delete().eq('id', id);
      if (error) throw error;
      setBoms(prev => prev.filter(b => b.id !== id));
      return true;
    } catch (e) {
      console.error('BOM silinirken hata:', e.message);
      return false;
    }
  };

  // BOM'dan üretim gerçekleştirme (stok düşme + yeni ürün ekleme)
  const produceFromBom = async (bomId, quantity, overrides = {}) => {
    if (!session || !supabase) return { success: false, error: 'Oturum yok' };
    const bom = boms.find(b => b.id === bomId);
    if (!bom) return { success: false, error: 'BOM bulunamadı' };

    const prodQty = parseInt(quantity, 10) || 1;
    const components = bom.components || [];

    // Stok yeterlilik kontrolü
    for (const comp of components) {
      const product = products.find(p => p.id === comp.product_id);
      const needed = (comp.quantity || 1) * prodQty;
      if (!product || (product.quantity || 0) < needed) {
        return {
          success: false,
          error: `Yetersiz stok: ${comp.name} (Gereken: ${needed}, Mevcut: ${product?.quantity || 0})`
        };
      }
    }

    try {
      // Bileşen stoklarını düş
      for (const comp of components) {
        const product = products.find(p => p.id === comp.product_id);
        if (product) {
          const newQty = (product.quantity || 0) - ((comp.quantity || 1) * prodQty);
          const { data: pd } = await supabase.from('products').update({ quantity: newQty }).eq('id', comp.product_id).select();
          if (pd) setProducts(prev => prev.map(p => p.id === comp.product_id ? pd[0] : p));
        }
      }

      // Toplam birim maliyeti hesapla
      const unitCost = components.reduce((sum, c) => {
        const p = products.find(pr => pr.id === c.product_id);
        return sum + ((p?.cost || 0) * (c.quantity || 1));
      }, 0);

      const matchedProduct = products.find(p =>
        (p.code && (overrides.code || bom.product_code) && p.code === (overrides.code || bom.product_code)) ||
        (p.name && p.name.toLowerCase() === (overrides.productName || bom.product_name).toLowerCase())
      );

      const componentDesc = components.map(c => `${c.name} (x${c.quantity})`).join(', ');

      if (matchedProduct) {
        // Mevcut ürünü güncelle
        const newQty = (matchedProduct.quantity || 0) + prodQty;
        const { data: productData, error: productError } = await supabase.from('products')
          .update({
            quantity: newQty,
            cost: unitCost,
            price: overrides.price || bom.sale_price || matchedProduct.price,
            description: `BOM: ${bom.bom_number}\nBileşenler: ${componentDesc}`
          })
          .eq('id', matchedProduct.id)
          .select();
        if (productError) throw productError;
        setProducts(prev => prev.map(p => p.id === matchedProduct.id ? productData[0] : p));
      } else {
        // Yeni ürün ekle
        const newProduct = {
          name: overrides.productName || bom.product_name,
          category: overrides.category || bom.category || 'Üretim',
          quantity: prodQty,
          cost: unitCost,
          price: overrides.price || bom.sale_price || 0,
          code: overrides.code || bom.product_code || '',
          criticalStockLimit: overrides.criticalLimit || bom.critical_limit || 0,
          description: `BOM: ${bom.bom_number}\nBileşenler: ${componentDesc}`,
          user_id: session.user.id
        };
        const { data: productData, error: productError } = await supabase.from('products').insert(newProduct).select();
        if (productError) throw productError;
        setProducts(prev => [productData[0], ...prev]);
      }

      // BOM üretim sayısını artır
      await supabase.from('boms').update({
        last_produced_at: new Date().toISOString(),
        total_produced: (bom.total_produced || 0) + prodQty
      }).eq('id', bomId);
      setBoms(prev => prev.map(b => b.id === bomId ? { ...b, last_produced_at: new Date().toISOString(), total_produced: (b.total_produced || 0) + prodQty } : b));

      return { success: true, product: productData[0] };
    } catch (e) {
      console.error('Üretim hatası:', e);
      return { success: false, error: e.message };
    }
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

  // --- FİNANS İŞLEMLERİ (TRANSACTIONS) ---
  const addTransaction = async (t) => {
    if (!session || !supabase) return false;
    const toInsert = { ...t, user_id: session.user.id };
    const { data, error } = await supabase.from('finance_transactions').insert(toInsert).select();
    if (error) { Alert.alert('Hata', error.message); return false; }
    setFinanceTransactions((prev) => [data[0], ...prev]);
    return data[0];
  };
  const updateTransaction = async (t) => {
    if (!session || !supabase) return false;
    const { data, error } = await supabase.from('finance_transactions').update(t).eq('id', t.id).select();
    if (error) { Alert.alert('Hata', error.message); return false; }
    setFinanceTransactions((prev) => prev.map(item => item.id === t.id ? data[0] : item));
    return true;
  };
  const deleteTransaction = async (id) => {
    if (!session || !supabase) return false;
    const { error } = await supabase.from('finance_transactions').delete().eq('id', id);
    if (error) { Alert.alert('Hata', error.message); return false; }
    setFinanceTransactions((prev) => prev.filter(item => item.id !== id));
    return true;
  };
  const markTransactionPaid = async (id) => {
    if (!session || !supabase) return false;
    const { data, error } = await supabase.from('finance_transactions')
      .update({ is_paid: true })
      .eq('id', id).select();
    if (error) { Alert.alert('Hata', error.message); return false; }
    setFinanceTransactions((prev) => prev.map(item => item.id === id ? data[0] : item));
    return true;
  };

  // --- BÜTÇE YÖNETİMİ (BUDGETS) ---
  const addBudget = async (b) => {
    if (!session || !supabase) return false;
    const toInsert = { ...b, user_id: session.user.id };
    const { data, error } = await supabase.from('budgets').insert(toInsert).select();
    if (error) { Alert.alert('Hata', error.message); return false; }
    setBudgets((prev) => [data[0], ...prev]);
    return data[0];
  };
  const updateBudget = async (b) => {
    if (!session || !supabase) return false;
    const { data, error } = await supabase.from('budgets').update(b).eq('id', b.id).select();
    if (error) { Alert.alert('Hata', error.message); return false; }
    setBudgets((prev) => prev.map(item => item.id === b.id ? data[0] : item));
    return true;
  };
  const deleteBudget = async (id) => {
    if (!session || !supabase) return false;
    const { error } = await supabase.from('budgets').delete().eq('id', id);
    if (error) { Alert.alert('Hata', error.message); return false; }
    setBudgets((prev) => prev.filter(item => item.id !== id));
    return true;
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
        leaveHistory, addLeaveRecord, deleteLeaveRecord, fetchLeaveHistory,
        vehicles, addVehicle, updateVehicle, deleteVehicle,
        purchases, addPurchase, updatePurchase, deletePurchase, markPurchaseDelivered,
        assets, addAsset, updateAsset, deleteAsset, assignAsset, unassignAsset,
        workOrders, addWorkOrder, updateWorkOrder, closeWorkOrder, addWorkOrderFromBom,
        processTemplates, addProcessTemplate, deleteProcessTemplate,
        maintenanceRequests, addMaintenanceRequest, updateMaintenanceRequest, closeMaintenanceRequest, deleteMaintenanceRequest,
        quotations, addQuotation, updateQuotation, cancelQuotation, approveQuotation, convertQuotationToSale, deleteQuotation,
        stockLocations, getProductStockLocations, getStockAtWarehouse, getAllWarehouses, addStockToWarehouse, upsertStockLocation,
        warehouseTransfers, addWarehouseTransfer,
        boms, addBom, updateBom, deleteBom, produceFromBom,
        company, updateCompanyInfo,
        financeTransactions, addTransaction, updateTransaction, deleteTransaction, markTransactionPaid,
        budgets, addBudget, updateBudget, deleteBudget,
        isPremium, setPremiumStatus: setDbPremium, purchasePremium, restorePurchases,
        getPackages: async () => {
          const offerings = await Purchases.getOfferings();
          return offerings.current;
        },
        deleteUserAccount,
        appDataLoading,
        isRestrictedPersonnel // YENİ EKLENDİ
      }}
    >
      {children}
    </AppContext.Provider>
  );
}