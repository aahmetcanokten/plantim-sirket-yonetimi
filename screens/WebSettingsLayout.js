import React, { useState, useContext, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  Linking,
  Modal,
  TextInput,
  Image,
  FlatList,
} from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../Theme";
import { AppContext } from "../AppContext";
import { useAuth } from "../AuthContext";
import { exportToPDF, exportToExcel } from "../utils/ExportHelper";
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function WebSettingsLayout({ navigation }) {
  const { t, i18n } = useTranslation();
  const {
    vehicles,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    company,
    updateCompanyInfo,
    isPremium,
    deleteUserAccount,
    sales,
    products,
    customers,
    personnel,
    generalPreferences,
    updateGeneralPreferences
  } = useContext(AppContext);

  const { session, signOut, updatePassword } = useAuth();
  
  const [activeTab, setActiveTab] = useState('company_profile');

  // Firma Bilgileri
  const [cName, setCName] = useState(company?.name ?? "");
  const [cAddress, setCAddress] = useState(company?.address ?? "");
  const [cTax, setCTax] = useState(company?.taxId ?? "");
  const [cPhone, setCPhone] = useState("");
  const [cIndustry, setCIndustry] = useState(generalPreferences?.industry ?? "");

  // Genel Tercihler
  const [prefLang, setPrefLang] = useState(i18n.language || 'tr');
  const [prefCurrency, setPrefCurrency] = useState(generalPreferences?.currency || 'TRY');
  const [prefDateFormat, setPrefDateFormat] = useState(generalPreferences?.dateFormat || 'DD.MM.YYYY');

  // Güvenlik
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Export
  const [exportType, setExportType] = useState("sales");
  const [exportFormat, setExportFormat] = useState("excel");

  // Araçlar
  const [vehicleModal, setVehicleModal] = useState(false);
  const [editVehicle, setEditVehicle] = useState(null);
  const [vehicleForm, setVehicleForm] = useState({ model: "", plate: "", lastServiceDate: "" });

  useEffect(() => {
    setCName(company?.name ?? "");
    setCAddress(company?.address ?? "");
    setCTax(company?.taxId ?? "");
    if(generalPreferences) {
      setCIndustry(generalPreferences.industry || "");
      setPrefCurrency(generalPreferences.currency || 'TRY');
      setPrefDateFormat(generalPreferences.dateFormat || 'DD.MM.YYYY');
    }
  }, [company, generalPreferences]);

  const saveCompanyProfile = () => {
    if (!cName.trim()) { Alert.alert(t('error'), t('company_name') + " " + t('required')); return; }
    updateCompanyInfo({ name: cName.trim(), address: cAddress.trim(), taxId: cTax.trim() });
    updateGeneralPreferences({ industry: cIndustry });
    if(Platform.OS === 'web') window.alert(t('updated'));
  };

  const saveGeneralPreferences = async () => {
    updateGeneralPreferences({
      language: prefLang,
      currency: prefCurrency,
      dateFormat: prefDateFormat
    });
    i18n.changeLanguage(prefLang);
    try {
      await AsyncStorage.setItem('user-language', prefLang);
    } catch (e) {
      console.error(e);
    }
    if(Platform.OS === 'web') window.alert(t('updated'));
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      if(Platform.OS==='web') window.alert(t('fill_all_fields_alert'));
      return;
    }
    if (newPassword.length < 6) {
      if(Platform.OS==='web') window.alert(t('weak_password_alert'));
      return;
    }
    if (newPassword !== confirmPassword) {
      if(Platform.OS==='web') window.alert(t('password_mismatch_alert'));
      return;
    }

    const { error } = await updatePassword(newPassword);

    if (error) {
      if(Platform.OS==='web') window.alert("Hata: " + error.message);
    } else {
      if(Platform.OS==='web') window.alert(t('password_update_success'));
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const handleDeleteAccount = async () => {
    if (Platform.OS === 'web') {
      if (window.confirm(t('delete_account_confirm_message'))) {
        try {
          const success = await deleteUserAccount();
          if (!success) window.alert("Veriler silinirken bir sorun oluştu.");
          const { error } = await signOut();
          if (error) window.alert("Hata: " + error.message);
        } catch (e) {
          window.alert("Hata: " + e.message);
        }
      }
    }
  };

  const handleLogout = async () => {
    if (window.confirm(t('logout_subtitle'))) {
      const { error } = await signOut();
      if (error) window.alert("Hata: " + error.message);
    }
  };


  const TABS = [
    { id: 'company_profile', icon: 'business-outline', label: t('company_profile') || 'Firma Bilgileri' },
    { id: 'general_prefs', icon: 'settings-outline', label: t('general_preferences') || 'Genel Tercihler' },
    { id: 'vehicles', icon: 'car-sport-outline', label: t('vehicles') || 'Araçlar' },
    { id: 'export_backup', icon: 'cloud-download-outline', label: t('export_and_backup') || 'Dışa Aktarım ve Yedekleme' },
    { id: 'security', icon: 'shield-checkmark-outline', label: t('security') || 'Güvenlik' },
    { id: 'subscription', icon: 'star-outline', label: t('subscription') || 'Abonelik' },
  ];

  /* ---------------- RENDERS ---------------- */

  const renderCompanyProfile = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>{t('company_info')}</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('company_name')} *</Text>
        <TextInput style={styles.input} value={cName} onChangeText={setCName} placeholder="Firma Adı" />
      </View>
      
      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 1, marginRight: 16 }]}>
          <Text style={styles.label}>{t('tax_no_prefix')}</Text>
          <TextInput style={styles.input} value={cTax} onChangeText={setCTax} placeholder="1234567890" />
        </View>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={styles.label}>{t('phone_number') || 'Telefon Numarası'}</Text>
          <TextInput style={styles.input} value={cPhone} onChangeText={setCPhone} placeholder="+90 555 555 55 55" />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('industry') || 'Sektör'}</Text>
        <TextInput style={styles.input} value={cIndustry} onChangeText={setCIndustry} placeholder="Örn: Teknoloji, İnşaat" />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('address')}</Text>
        <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} value={cAddress} onChangeText={setCAddress} multiline placeholder="Açık adres..." />
      </View>

      <TouchableOpacity style={styles.primaryBtn} onPress={saveCompanyProfile}>
        <Text style={styles.primaryBtnText}>{t('save')}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderGeneralPrefs = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>{t('general_preferences') || 'Genel Tercihler'}</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('language')}</Text>
        <View style={styles.row}>
          <TouchableOpacity style={[styles.selectBtn, prefLang==='tr' && styles.selectBtnActive]} onPress={()=>setPrefLang('tr')}>
            <Text style={[styles.selectBtnText, prefLang==='tr' && styles.selectBtnTextActive]}>Türkçe</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.selectBtn, prefLang==='en' && styles.selectBtnActive]} onPress={()=>setPrefLang('en')}>
            <Text style={[styles.selectBtnText, prefLang==='en' && styles.selectBtnTextActive]}>English</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('currency') || 'Para Birimi'}</Text>
        <View style={styles.row}>
          <TouchableOpacity style={[styles.selectBtn, prefCurrency==='TRY' && styles.selectBtnActive]} onPress={()=>setPrefCurrency('TRY')}>
            <Text style={[styles.selectBtnText, prefCurrency==='TRY' && styles.selectBtnTextActive]}>TRY (₺)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.selectBtn, prefCurrency==='USD' && styles.selectBtnActive]} onPress={()=>setPrefCurrency('USD')}>
            <Text style={[styles.selectBtnText, prefCurrency==='USD' && styles.selectBtnTextActive]}>USD ($)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.selectBtn, prefCurrency==='EUR' && styles.selectBtnActive]} onPress={()=>setPrefCurrency('EUR')}>
            <Text style={[styles.selectBtnText, prefCurrency==='EUR' && styles.selectBtnTextActive]}>EUR (€)</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('date_format') || 'Tarih Formatı'}</Text>
        <View style={styles.row}>
          <TouchableOpacity style={[styles.selectBtn, prefDateFormat==='DD.MM.YYYY' && styles.selectBtnActive]} onPress={()=>setPrefDateFormat('DD.MM.YYYY')}>
            <Text style={[styles.selectBtnText, prefDateFormat==='DD.MM.YYYY' && styles.selectBtnTextActive]}>DD.MM.YYYY</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.selectBtn, prefDateFormat==='MM/DD/YYYY' && styles.selectBtnActive]} onPress={()=>setPrefDateFormat('MM/DD/YYYY')}>
            <Text style={[styles.selectBtnText, prefDateFormat==='MM/DD/YYYY' && styles.selectBtnTextActive]}>MM/DD/YYYY</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.primaryBtn} onPress={saveGeneralPreferences}>
        <Text style={styles.primaryBtnText}>{t('save')}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderVehicles = () => (
    <View style={styles.sectionContainer}>
      <View style={styles.rowBetween}>
        <Text style={styles.sectionTitle}>{t('vehicles')}</Text>
        <TouchableOpacity style={styles.outlineBtn} onPress={() => {setEditVehicle(null); setVehicleForm({model:"", plate:"", lastServiceDate:""}); setVehicleModal(true);}}>
          <Text style={styles.outlineBtnText}>+ {t('add_new')}</Text>
        </TouchableOpacity>
      </View>

      {vehicles.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="car-outline" size={48} color="#CBD5E1" />
          <Text style={styles.emptyText}>{t('no_vehicles_added')}</Text>
        </View>
      ) : (
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, {flex: 2, fontWeight: '600'}]}>{t('vehicle_model')}</Text>
            <Text style={[styles.tableCell, {flex: 1, fontWeight: '600'}]}>{t('plate')}</Text>
            <Text style={[styles.tableCell, {flex: 1, fontWeight: '600'}]}>Son Servis</Text>
            <Text style={[styles.tableCell, {flex: 1, fontWeight: '600', textAlign: 'right'}]}>İşlemler</Text>
          </View>
          {vehicles.map(v => (
            <View key={v.id} style={styles.tableRow}>
              <Text style={[styles.tableCell, {flex: 2}]}>{v.model}</Text>
              <Text style={[styles.tableCell, {flex: 1}]}>{v.plate || '-'}</Text>
              <Text style={[styles.tableCell, {flex: 1}]}>{v.lastServiceDate ? new Date(v.lastServiceDate).toLocaleDateString() : '-'}</Text>
              <View style={[styles.tableCell, {flex: 1, flexDirection: 'row', justifyContent: 'flex-end'}]}>
                <TouchableOpacity onPress={() => {setEditVehicle(v); setVehicleForm({model: v.model, plate: v.plate, lastServiceDate: v.lastServiceDate ? new Date(v.lastServiceDate).toLocaleDateString('tr-TR') : ""}); setVehicleModal(true);}}>
                  <Ionicons name="create-outline" size={20} color={Colors.primary} style={{marginRight: 12}} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {if(window.confirm(t('delete')+"?")) deleteVehicle(v.id)}}>
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ARAÇ MODALI İÇİN */}
      {vehicleModal && (
        <Modal transparent visible={vehicleModal}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{editVehicle ? t('vehicle_edit_title') : t('vehicle_add_title')}</Text>
              <TextInput style={styles.input} value={vehicleForm.model} onChangeText={t=>setVehicleForm({...vehicleForm, model: t})} placeholder={t('vehicle_model')} />
              <TextInput style={styles.input} value={vehicleForm.plate} onChangeText={t=>setVehicleForm({...vehicleForm, plate: t})} placeholder={t('plate')} />
              <TextInput style={styles.input} value={vehicleForm.lastServiceDate} onChangeText={t=>setVehicleForm({...vehicleForm, lastServiceDate: t})} placeholder={t('last_service_date_format')} />
              <View style={styles.row}>
                <TouchableOpacity style={[styles.outlineBtn, {flex:1, marginRight: 8}]} onPress={()=>setVehicleModal(false)}>
                  <Text style={styles.outlineBtnText}>{t('cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.primaryBtn, {flex:1}]} onPress={() => {
                  if(!vehicleForm.model) return;
                  let iso = null;
                  if(vehicleForm.lastServiceDate && vehicleForm.lastServiceDate.split('.').length===3) {
                    const p = vehicleForm.lastServiceDate.split('.');
                    iso = `${p[2]}-${p[1]}-${p[0]}`;
                  }
                  if(editVehicle) updateVehicle({...editVehicle, ...vehicleForm, lastServiceDate: iso});
                  else addVehicle({...vehicleForm, lastServiceDate: iso});
                  setVehicleModal(false);
                }}>
                  <Text style={styles.primaryBtnText}>{t('save')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );

  const renderExportBackup = () => {
    const handleDoExport = async () => {
      if(!isPremium) {
        window.alert(t('premium_export_feature_message'));
        return;
      }
      // Dışa aktarma fonk.
      let dataToExport = [];
      let columns = [];
      let title = "";
      let fileName = "";
      switch (exportType) {
        case "sales":
          title = "Satış Raporu";
          fileName = "Satis_Raporu";
          dataToExport = sales;
          columns = [{ header: "Tarih", key: "dateISO" }, { header: "Fatura No", key: "invoiceNumber" }, { header: "Ürün", key: "productName" }, { header: "Adet", key: "quantity" }, { header: "Toplam", key: "totalPrice" }];
          break;
        case "stock":
          title = "Stok Listesi";
          fileName = "Stok_Listesi";
          dataToExport = products;
          columns = [{ header: "Ürün Adı", key: "name" }, { header: "Mevcut Stok", key: "quantity" }, { header: "Satış Fiyatı", key: "price" }];
          break;
        case "customers":
          // Benzer şekilde...
          dataToExport = customers;
          columns = [{header: "Firma", key:"companyName"}, {header: "Adres", key:"address"}];
          break;
        case "personnel":
          dataToExport = personnel;
          columns = [{header: "İsim", key:"name"}, {header: "Maaş", key:"salary"}];
          break;
      }
      
      if(dataToExport.length === 0) {
        window.alert(t('warning_no_data_export'));
        return;
      }
      
      try {
        if (exportFormat === 'pdf') await exportToPDF(title, dataToExport, columns);
        else await exportToExcel(fileName, dataToExport, columns);
      } catch (e) {
        window.alert("Hata: " + e.message);
      }
    };

    return (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>{t('export_and_backup') || 'Dışa Aktarım ve Yedekleme'}</Text>
        
        <Text style={styles.label}>{t('data_type')}</Text>
        <View style={styles.row}>
          {[
            { id: 'sales', label: t('sales') },
            { id: 'stock', label: t('stock') },
            { id: 'customers', label: t('customers') },
            { id: 'personnel', label: t('personnel') }
          ].map(type => (
            <TouchableOpacity key={type.id} style={[styles.selectBtn, exportType===type.id && styles.selectBtnActive]} onPress={()=>setExportType(type.id)}>
              <Text style={[styles.selectBtnText, exportType===type.id && styles.selectBtnTextActive]}>{type.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, {marginTop: 16}]}>Format</Text>
        <View style={styles.row}>
          <TouchableOpacity style={[styles.selectBtn, exportFormat==='excel' && styles.selectBtnActive]} onPress={()=>setExportFormat('excel')}>
            <Text style={[styles.selectBtnText, exportFormat==='excel' && styles.selectBtnTextActive]}>Excel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.selectBtn, exportFormat==='pdf' && styles.selectBtnActive]} onPress={()=>setExportFormat('pdf')}>
            <Text style={[styles.selectBtnText, exportFormat==='pdf' && styles.selectBtnTextActive]}>PDF</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.primaryBtn, {marginTop: 24}]} onPress={handleDoExport}>
          <Text style={styles.primaryBtnText}>{t('download_share')}</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>{t('database_backup') || 'Veritabanı Yedeği'}</Text>
        <Text style={[styles.textSecondary, {marginBottom: 16}]}>Sistem verilerinizin tam yedeğini .sql veya .csv arşivi olarak indirin.</Text>
        <TouchableOpacity style={styles.outlineBtn} onPress={() => window.alert("İndirme başlatıldı.")}>
          <Ionicons name="server-outline" size={18} color={Colors.primary} style={{marginRight: 8}} />
          <Text style={styles.outlineBtnText}>{t('download_backup') || 'Yedeği İndir'}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderSecurity = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>{t('security') || 'Güvenlik'}</Text>
      
      <View style={styles.cardInfo}>
        <Ionicons name="information-circle-outline" size={24} color="#0EA5E9" style={{marginRight: 12}} />
        <View style={{flex: 1}}>
          <Text style={{fontWeight: '600', color: '#0F172A'}}>{t('logged_in_email')}</Text>
          <Text style={{color: '#475569'}}>{session?.user?.email}</Text>
        </View>
      </View>

      <View style={styles.divider} />
      
      <Text style={styles.sectionSubtitle}>{t('change_password')}</Text>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('new_password')}</Text>
        <TextInput style={styles.input} secureTextEntry value={newPassword} onChangeText={setNewPassword} />
      </View>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('new_password_confirm')}</Text>
        <TextInput style={styles.input} secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />
      </View>
      <TouchableOpacity style={styles.primaryBtn} onPress={handleChangePassword}>
        <Text style={styles.primaryBtnText}>{t('update_password') || 'Şifreyi Güncelle'}</Text>
      </TouchableOpacity>

      <View style={styles.divider} />

      <Text style={styles.sectionSubtitle}>{t('active_sessions') || 'Aktif Oturumlar'}</Text>
      <View style={styles.sessionCard}>
        <Ionicons name="desktop-outline" size={24} color="#64748B" />
        <View style={{marginLeft: 12, flex: 1}}>
          <Text style={{fontWeight: '600'}}>Windows PC • Chrome</Text>
          <Text style={{color: '#10B981', fontSize: 12}}>{t('active_now') || 'Şu an aktif'}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <Text style={[styles.sectionSubtitle, {color: '#EF4444'}]}>Tehlikeli Bölge</Text>
      <TouchableOpacity style={styles.dangerBtn} onPress={handleDeleteAccount}>
        <Text style={styles.dangerBtnText}>{t('delete_account')}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSubscription = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>{t('subscription') || 'Abonelik'}</Text>
      
      {isPremium ? (
        <View style={styles.premiumBanner}>
          <Ionicons name="shield-checkmark" size={32} color="#10B981" />
          <View style={{marginLeft: 16, flex: 1}}>
            <Text style={{fontSize: 18, fontWeight: '700', color: '#10B981'}}>{t('premium_active')}</Text>
            <Text style={{color: '#065F46', marginTop: 4}}>{t('premium_active_subtitle')}</Text>
          </View>
        </View>
      ) : (
        <View style={[styles.premiumBanner, {backgroundColor: '#FEF3C7', borderColor: '#F59E0B'}]}>
          <Ionicons name="star" size={32} color="#F59E0B" />
          <View style={{marginLeft: 16, flex: 1}}>
            <Text style={{fontSize: 18, fontWeight: '700', color: '#D97706'}}>Ücretsiz Plan</Text>
            <Text style={{color: '#92400E', marginTop: 4}}>{t('sales_limit_message')}</Text>
          </View>
          <TouchableOpacity style={[styles.primaryBtn, {backgroundColor: '#F59E0B'}]} onPress={() => navigation.navigate("Paywall")}>
            <Text style={styles.primaryBtnText}>{t('get_premium')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {isPremium && (
        <TouchableOpacity style={styles.outlineBtn} onPress={() => window.open('https://apps.apple.com/account/subscriptions')}>
          <Text style={styles.outlineBtnText}>{t('manage_subscription')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );


  const renderContent = () => {
    switch(activeTab) {
      case 'company_profile': return renderCompanyProfile();
      case 'general_prefs': return renderGeneralPrefs();
      case 'vehicles': return renderVehicles();
      case 'export_backup': return renderExportBackup();
      case 'security': return renderSecurity();
      case 'subscription': return renderSubscription();
      default: return null;
    }
  }

  return (
    <View style={styles.container}>
      {/* Sol Pane - Navigasyon */}
      <View style={styles.leftPane}>
        <Text style={styles.paneTitle}>{t('settings')}</Text>
        <View style={styles.navMenu}>
          {TABS.map(tab => (
            <TouchableOpacity 
              key={tab.id} 
              style={[styles.navItem, activeTab === tab.id && styles.navItemActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Ionicons name={tab.icon} size={20} color={activeTab === tab.id ? Colors.primary : '#64748B'} />
              <Text style={[styles.navText, activeTab === tab.id && styles.navTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{flex: 1}} />
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#64748B" />
          <Text style={styles.logoutText}>{t('logout')}</Text>
        </TouchableOpacity>
      </View>

      {/* Sağ Pane - İçerik */}
      <View style={styles.rightPane}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.contentWrapper}>
            {renderContent()}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F8FAFC'
  },
  leftPane: {
    width: 280,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    padding: 24,
    display: 'flex',
    flexDirection: 'column'
  },
  paneTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 32
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  navItemActive: {
    backgroundColor: '#EFF6FF',
  },
  navText: {
    marginLeft: 12,
    fontSize: 15,
    fontWeight: '500',
    color: '#64748B'
  },
  navTextActive: {
    color: Colors.primary,
    fontWeight: '600'
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 'auto'
  },
  logoutText: {
    marginLeft: 12,
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500'
  },
  rightPane: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 32,
    alignItems: 'center'
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 700,
  },
  sectionContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 32,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 24,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
    marginBottom: 8
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
    outlineStyle: 'none'
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center'
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600'
  },
  outlineBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  outlineBtnText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 14
  },
  dangerBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  dangerBtnText: {
    color: '#EF4444',
    fontWeight: '600',
    fontSize: 15
  },
  selectBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#FFFFFF'
  },
  selectBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: '#EFF6FF'
  },
  selectBtnText: {
    color: '#475569',
    fontWeight: '500'
  },
  selectBtnTextActive: {
    color: Colors.primary,
    fontWeight: '600'
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 24
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD'
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  premiumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B981'
  },
  table: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    overflow: 'hidden'
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center'
  },
  tableCell: {
    fontSize: 14,
    color: '#334155'
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed'
  },
  emptyText: {
    color: '#64748B',
    marginTop: 12,
    fontWeight: '500'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: '#FFF',
    width: 400,
    borderRadius: 12,
    padding: 24,
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20
  }
});
