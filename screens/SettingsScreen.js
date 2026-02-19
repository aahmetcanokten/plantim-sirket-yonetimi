import React, { useContext, useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Linking
} from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import ImmersiveLayout from "../components/ImmersiveLayout";
import { Colors } from "../Theme";
import { AppContext } from "../AppContext";
import { useAuth } from "../AuthContext";
import { exportToPDF } from "../utils/ExportHelper";
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SettingsScreen({ navigation }) {
  const { t, i18n } = useTranslation(); // Translations
  // AppContext'ten verileri al
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
    personnel
  } = useContext(AppContext);

  // AuthContext
  const { session, signOut, updatePassword } = useAuth();

  // Lokal state'ler
  const [companyModal, setCompanyModal] = useState(false);
  const [cName, setCName] = useState(company?.name ?? "");
  const [cAddress, setCAddress] = useState(company?.address ?? "");
  const [cTax, setCTax] = useState(company?.taxId ?? "");

  const [vehicleModal, setVehicleModal] = useState(false);
  const [editVehicle, setEditVehicle] = useState(null);
  const [vehicleForm, setVehicleForm] = useState({ model: "", plate: "", lastServiceDate: "" });

  // Şifre Değiştirme Modalı
  const [passwordModal, setPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Export Modalı
  const [exportModal, setExportModal] = useState(false);
  const [exportType, setExportType] = useState("sales"); // sales, stock, customers, personnel
  const [languageModal, setLanguageModal] = useState(false);

  const changeLanguage = async (lang) => {
    i18n.changeLanguage(lang);
    setLanguageModal(false);
    try {
      await AsyncStorage.setItem('user-language', lang);
    } catch (e) {
      console.error("Failed to save language", e);
    }
  };


  useEffect(() => {
    setCName(company?.name ?? "");
    setCAddress(company?.address ?? "");
    setCTax(company?.taxId ?? "");
  }, [company]);

  // Şifre Değiştirme Fonksiyonu
  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert(t('missing_info_alert_title'), t('fill_all_fields_alert'));
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert(t('weak_password'), t('weak_password_alert'));
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t('error'), t('password_mismatch_alert'));
      return;
    }

    const { error } = await updatePassword(newPassword);

    if (error) {
      Alert.alert(t('error'), "Şifre güncellenemedi: " + error.message);
    } else {
      Alert.alert(t('successful'), t('password_update_success'));
      setNewPassword("");
      setConfirmPassword("");
      setPasswordModal(false);
    }
  };

  // Hesabı Sil Fonksiyonu
  const handleDeleteAccount = async () => {
    if (Platform.OS === 'web') {
      if (window.confirm(t('delete_account_confirm_message'))) {
        try {
          const success = await deleteUserAccount();
          if (!success) {
            Alert.alert(t('error'), "Veriler silinirken bir sorun oluştu, ancak çıkış yapılacak.");
          }
          const { error } = await signOut();
          if (error) {
            Alert.alert("Hata", "Çıkış yapılırken hata: " + error.message);
          }
        } catch (e) {
          Alert.alert("Hata", "Bir sorun oluştu: " + e.message);
        }
      }
      return;
    }

    Alert.alert(
      t('delete_account_confirm_title'),
      t('delete_account_confirm_message'),
      [
        { text: t('give_up'), style: "cancel" },
        {
          text: t('delete_data_and_account_button'),
          style: "destructive",
          onPress: async () => {
            try {
              // 1. Verileri Sil
              const success = await deleteUserAccount();
              if (!success) {
                Alert.alert(t('error'), "Veriler silinirken bir sorun oluştu, ancak çıkış yapılacak.");
              }

              // 2. Oturumu Kapat
              const { error } = await signOut();
              if (error) {
                Alert.alert("Hata", "Çıkış yapılırken hata: " + error.message);
              }
            } catch (e) {
              Alert.alert("Hata", "Bir sorun oluştu: " + e.message);
            }
          }
        },
      ]
    );
  };

  // Çıkış Yap Fonksiyonu
  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      if (window.confirm(t('logout_subtitle'))) {
        const { error } = await signOut();
        if (error) {
          Alert.alert(t('error'), "Çıkış yapılamadı: " + error.message);
        }
      }
      return;
    }

    Alert.alert(
      t('logout'),
      t('logout_subtitle'),
      [
        { text: t('cancel'), style: "cancel" },
        {
          text: t('logout'),
          style: "destructive",
          onPress: async () => {
            const { error } = await signOut();
            if (error) {
              Alert.alert(t('error'), "Çıkış yapılamadı: " + error.message);
            }
          }
        },
      ]
    );
  };

  const saveCompany = () => {
    if (!cName.trim()) { Alert.alert(t('error'), t('company_name') + " " + t('required')); return; }
    updateCompanyInfo({ name: cName.trim(), address: cAddress.trim(), taxId: cTax.trim() });
    setCompanyModal(false);
  };

  const openAddVehicle = () => {
    setEditVehicle(null);
    setVehicleForm({ model: "", plate: "", lastServiceDate: "" });
    setVehicleModal(true);
  };

  const openEditVehicle = (item) => {
    setEditVehicle(item);
    setVehicleForm({
      model: item.model,
      plate: item.plate,
      lastServiceDate: item.lastServiceDate ? new Date(item.lastServiceDate).toLocaleDateString('tr-TR') : "",
    });
    setVehicleModal(true);
  };

  const saveVehicle = () => {
    if (!vehicleForm.model.trim()) { Alert.alert("Hata", "Araç modeli zorunludur."); return; }

    let isoDate = null;
    if (vehicleForm.lastServiceDate && vehicleForm.lastServiceDate.split('.').length === 3) {
      const parts = vehicleForm.lastServiceDate.split('.');
      isoDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }

    const vehicleData = {
      model: vehicleForm.model.trim(),
      plate: vehicleForm.plate.trim(),
      lastServiceDate: isoDate
    };

    if (editVehicle) {
      updateVehicle({ ...editVehicle, ...vehicleData });
    }
    else {
      addVehicle(vehicleData);
    }

    setVehicleModal(false);
    setEditVehicle(null);
    setVehicleForm({ model: "", plate: "", lastServiceDate: "" });
  };

  const confirmDeleteVehicle = (item) => {
    Alert.alert(t('delete_vehicle_title'), t('delete_vehicle_confirm', { model: item.model }), [
      { text: t('cancel'), style: "cancel" },
      { text: t('delete'), style: "destructive", onPress: () => deleteVehicle(item.id) },
    ]);
  };

  // --- Export İşlemleri ---
  const handleOpenExport = () => {
    if (!isPremium) {
      Alert.alert(
        t('premium_feature'),
        t('premium_export_feature_message'),
        [
          { text: t('give_up'), style: "cancel" },
          { text: t('premium_upgrade'), onPress: () => navigation.navigate("Paywall") }
        ]
      );
      return;
    }
    setExportModal(true);
  };

  const performExport = async () => {
    let dataToExport = [];
    let columns = [];
    let title = "";
    let fileName = "";

    switch (exportType) {
      case "sales":
        title = "Satış Raporu";
        fileName = "Satis_Raporu";
        dataToExport = sales.map(s => {
          const prod = products.find(p => p.id === s.productId);
          const cust = customers.find(c => c.id === s.customerId);
          return {
            ...s,
            productName: prod ? prod.name : (s.productName || "Silinmiş Ürün"),
            customerName: cust ? (cust.companyName || cust.name) : (s.customerName || "Genel Müşteri"),
            dateFormatted: s.sale_date ? new Date(s.sale_date).toLocaleDateString('tr-TR') : (s.dateISO ? new Date(s.dateISO).toLocaleDateString('tr-TR') : "-"),
            invoiceNumber: s.invoiceNumber || "-",
            serialNumber: s.serialNumber || "-",
            category: s.category || "-",
            cost: s.cost || 0,
            shipmentDate: s.shipmentDate ? new Date(s.shipmentDate).toLocaleDateString('tr-TR') : "-"
          };
        });
        columns = [
          { header: "Tarih", key: "dateFormatted" },
          { header: "Fatura No", key: "invoiceNumber" },
          { header: "Ürün", key: "productName" },
          { header: "Kategori", key: "category" },
          { header: "Seri No", key: "serialNumber" },
          { header: "Müşteri", key: "customerName" },
          { header: "Adet", key: "quantity" },
          { header: "Birim Fiyat", key: "price" },
          { header: "Maliyet", key: "cost" },
          { header: "Toplam", key: "totalPrice" },
          { header: "Sevkiyat", key: "shipmentDate" },
        ];
        break;
      case "stock":
        title = "Stok Listesi";
        fileName = "Stok_Listesi";
        dataToExport = products.map(p => ({
          ...p,
          code: p.code || "-",
          serialNumber: p.serialNumber || "-",
          category: p.category || "-",
          cost: p.cost || 0,
          criticalStockLimit: p.criticalStockLimit || 0
        }));
        columns = [
          { header: "Ürün Adı", key: "name" },
          { header: "Kategori", key: "category" },
          { header: "Kod", key: "code" },
          { header: "Seri No", key: "serialNumber" },
          { header: "Mevcut Stok", key: "quantity" },
          { header: "Kritik Limit", key: "criticalStockLimit" },
          { header: "Maliyet", key: "cost" },
          { header: "Satış Fiyatı", key: "price" },
        ];
        break;
      case "customers":
        title = "Müşteri Listesi";
        fileName = "Musteri_Listesi";
        dataToExport = customers.map(c => ({
          ...c,
          companyName: c.companyName || c.name,
          contactName: c.contactName || "-",
          cariCode: c.cariCode || "-"
        }));
        columns = [
          { header: "Firma / Ad Soyad", key: "companyName" },
          { header: "Yetkili", key: "contactName" },
          { header: "Cari Kod", key: "cariCode" },
          { header: "Telefon", key: "phone" },
          { header: "E-posta", key: "email" },
          { header: "Adres", key: "address" },
        ];
        break;
      case "personnel":
        title = "Personel Listesi";
        fileName = "Personel_Listesi";
        dataToExport = personnel.map(p => ({
          ...p,
          hireDate: p.hireDate || "-",
          annualLeaveEntitlement: p.annualLeaveEntitlement || "0"
        }));
        columns = [
          { header: "Ad Soyad", key: "name" },
          { header: "Rol", key: "role" },
          { header: "Telefon", key: "phone" },
          { header: "İşe Giriş", key: "hireDate" },
          { header: "Yıllık İzin (Gün)", key: "annualLeaveEntitlement" },
          { header: "Maaş", key: "salary" },
        ];
        break;
    }

    if (dataToExport.length === 0) {
      Alert.alert(t('stock_warning_title'), t('warning_no_data_export'));
      return;
    }

    try {
      // Sadece PDF export
      await exportToPDF(title, dataToExport, columns);
      setExportModal(false);
      setExportModal(false);
    } catch (e) {
      Alert.alert(t('error'), "Dışa aktarma sırasında bir sorun oluştu: " + e.message);
    }
  };

  // --- JSX ---
  const MenuLinkCard = ({ title, subtitle, icon, onPress, color }) => (
    <TouchableOpacity style={styles.menuLinkCard} onPress={onPress}>
      <View style={[styles.menuIconContainer, { backgroundColor: (color || Colors.primary) + "20" }]}>
        <Ionicons name={icon} size={24} color={color || Colors.primary} />
      </View>
      <View style={{ flex: 1, marginHorizontal: 16 }}>
        <Text style={styles.menuLinkTitle}>{title}</Text>
        <Text style={styles.menuLinkSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color="#ccc" />
    </TouchableOpacity>
  );

  return (
    <ImmersiveLayout title={t('settings')} subtitle={t('company_management_subtitle')}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>



        <Text style={styles.sectionHeader}>{t('management')}</Text>

        <MenuLinkCard
          title={t('personnel_management')}
          subtitle={t('personnel_management_subtitle')}
          icon="people"
          color={Colors.primary ?? "#007AFF"}
          onPress={() => {
            navigation.navigate("PersonnelScreen");
          }}
        />

        <MenuLinkCard
          title={t('asset_management')}
          subtitle={t('asset_management_subtitle')}
          icon="briefcase"
          color="#8B5CF6"
          onPress={() => navigation.navigate("AssetManagementScreen")}
        />

        <MenuLinkCard
          title={t('all_tasks')}
          subtitle={t('all_tasks_subtitle')}
          icon="checkbox"
          color={Colors.success ?? "#34C759"}
          onPress={() => navigation.navigate("TaskListScreen")}
        />

        <MenuLinkCard
          title={t('export_data')}
          subtitle={t('export_data_subtitle')}
          icon="document-text"
          color="#FF9500"
          onPress={handleOpenExport}
        />

        {/* Şirket Bilgileri Kartı */}
        <View style={[styles.card, { marginTop: 24 }]}>
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="business" size={20} color={Colors.primary ?? "#007AFF"} style={{ marginRight: 8 }} />
              <Text style={styles.cardTitle}>{t('company_info')}</Text>
            </View>
            <TouchableOpacity style={styles.editButton} onPress={() => setCompanyModal(true)}>
              <Text style={styles.editButtonText}>{t('edit')}</Text>
            </TouchableOpacity>
          </View>
          <View style={{ paddingLeft: 28 }}>
            <Text style={{ marginTop: 8, fontWeight: "700", fontSize: 16 }}>{company?.name}</Text>
            <Text style={styles.cardSubtitle}>{company?.address || t('address_not_entered')}</Text>
            <Text style={styles.cardSubtitle}>
              {company?.taxId ? `${t('tax_no_prefix')} ${company.taxId}` : t('no_tax_number')}
            </Text>
          </View>
        </View>

        {/* Araçlar Kartı */}
        <View style={[styles.card, { marginTop: 16 }]}>
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="car-sport" size={20} color={Colors.primary ?? "#007AFF"} style={{ marginRight: 8 }} />
              <Text style={styles.cardTitle}>{t('vehicles')}</Text>
            </View>
            <TouchableOpacity style={styles.editButton} onPress={openAddVehicle}>
              <Text style={styles.editButtonText}>{t('add_new')}</Text>
            </TouchableOpacity>
          </View>
          {vehicles.length === 0 ? (
            <Text style={styles.emptyText}>{t('no_vehicles_added')}</Text>
          ) : (
            <FlatList
              data={vehicles}
              keyExtractor={(i) => i.id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <View style={styles.listItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "700" }}>{item.model}</Text>
                    <Text style={styles.cardSubtitle}>{item.plate ?? "-"}</Text>
                    <Text style={styles.cardSubtitle}>
                      {t('last_service')} {item.lastServiceDate ? new Date(item.lastServiceDate).toLocaleDateString(i18n.language === 'tr' ? 'tr-TR' : 'en-US') : "-"}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    {item.photoUri ? <Image source={{ uri: item.photoUri }} style={styles.vehicleImage} /> : null}
                    <TouchableOpacity onPress={() => openEditVehicle(item)}>
                      <Text style={styles.actionTextBlue}>{t('edit')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => confirmDeleteVehicle(item)} style={{ marginTop: 4 }}>
                      <Text style={styles.actionTextRed}>{t('delete')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          )}
        </View>

        {/* HESAP BÖLÜMÜ */}
        <Text style={styles.sectionHeader}>{t('account')}</Text>

        {/* PREMIUM BUTONU - YENİ */}
        {isPremium ? (
          <>
            <MenuLinkCard
              title={t('premium_active')}
              subtitle={t('premium_active_subtitle')}
              icon="shield-checkmark"
              color={Colors.success ?? "#34C759"}
              onPress={() => Alert.alert(t('premium_active'), t('premium_active_subtitle'))}
            />
            <MenuLinkCard
              title={t('manage_subscription')}
              subtitle={t('manage_subscription_subtitle')}
              icon="open-outline"
              color={Colors.iosBlue ?? "#007AFF"}
              onPress={() => {
                const url = Platform.OS === 'ios'
                  ? 'https://apps.apple.com/account/subscriptions'
                  : 'https://play.google.com/store/account/subscriptions';
                Linking.openURL(url);
              }}
            />
          </>
        ) : (
          <MenuLinkCard
            title={t('premium_upgrade')}
            subtitle={t('premium_subtitle')}
            icon="star"
            color="#FFD700" // Altın Rengi
            onPress={() => navigation.navigate("Paywall")}
          />
        )}

        <View style={[styles.card, { paddingBottom: 8 }]}>
          <View style={[styles.cardHeader, { marginBottom: 0 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="person-circle" size={20} color={Colors.primary ?? "#007AFF"} style={{ marginRight: 8 }} />
              <Text style={styles.cardTitle}>{t('account_info_title')}</Text>
            </View>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => {
                setNewPassword("");
                setConfirmPassword("");
                setPasswordModal(true);
              }}
            >
              <Text style={styles.editButtonText}>{t('change_password')}</Text>
            </TouchableOpacity>
          </View>
          <View style={{ paddingLeft: 28, paddingTop: 4 }}>
            <Text style={styles.cardSubtitle}>{t('logged_in_email')}</Text>
            <Text style={{ marginTop: 2, fontWeight: "700", fontSize: 15, color: '#333' }}>
              {session?.user?.email ?? 'Yükleniyor...'}
            </Text>
          </View>
        </View>

        <MenuLinkCard
          title={t('delete_account')}
          subtitle={t('delete_account_subtitle')}
          icon="trash-outline"
          color={Colors.critical ?? "#FF3B30"}
          onPress={handleDeleteAccount}
        />

        <MenuLinkCard
          title={t('logout')}
          subtitle={t('logout_subtitle')}
          icon="log-out"
          color={Colors.secondary ?? "#8E8E93"}
          onPress={handleLogout}
        />

        <MenuLinkCard
          title={t('language')}
          subtitle={i18n.language === 'tr' ? t('turkish') : t('english')}
          icon="language"
          color="#5856D6"
          onPress={() => setLanguageModal(true)}
        />

        {/* HAKKINDA BÖLÜMÜ */}
        <Text style={styles.sectionHeader}>{t('about')}</Text>

        <View style={styles.footerLinksContainer}>
          <TouchableOpacity onPress={() => Linking.openURL("https://fearless-playground-057.notion.site/Privacy-Policy-2c685b6f3cbc80b6a9ded3063bc09948?source=copy_link")}>
            <Text style={styles.footerLinkText}>{t('privacy_policy')}</Text>
          </TouchableOpacity>
          <Text style={styles.footerLinkDivider}>•</Text>
          <TouchableOpacity onPress={() => Linking.openURL("https://www.apple.com/legal/internet-services/itunes/dev/stdeula/")}>
            <Text style={styles.footerLinkText}>{t('terms_of_use')}</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* ŞİRKET MODALI */}
      <Modal visible={companyModal} animationType="slide" transparent={true} onRequestClose={() => setCompanyModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('company_info')}</Text>
              <TouchableOpacity onPress={() => setCompanyModal(false)}>
                <Ionicons name="close-circle" size={28} color="#ccc" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={styles.inputLabel}>{t('company_name')}</Text>
              <TextInput style={styles.input} value={cName} onChangeText={setCName} placeholder={t('company_name')} selectTextOnFocus={Platform.OS === 'web'} />
              <Text style={styles.inputLabel}>{t('address')}</Text>
              <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} value={cAddress} onChangeText={setCAddress} placeholder={t('company_address_placeholder')} multiline selectTextOnFocus={Platform.OS === 'web'} />
              <Text style={styles.inputLabel}>{t('tax_no_prefix')}</Text>
              <TextInput style={styles.input} value={cTax} onChangeText={setCTax} placeholder={t('tax_no_placeholder')} keyboardType="numeric" selectTextOnFocus={Platform.OS === 'web'} />
              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={saveCompany}>
                  <Text style={styles.saveBtnText}>{t('save')}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ARAÇ MODALI */}
      <Modal visible={vehicleModal} animationType="slide" transparent={true} onRequestClose={() => setVehicleModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editVehicle ? t('vehicle_edit_title') : t('vehicle_add_title')}</Text>
              <TouchableOpacity onPress={() => setVehicleModal(false)}>
                <Ionicons name="close-circle" size={28} color="#ccc" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={styles.inputLabel}>{t('vehicle_model')}</Text>
              <TextInput style={styles.input} value={vehicleForm.model} onChangeText={(t) => setVehicleForm({ ...vehicleForm, model: t })} placeholder="Örn: Ford Transit 2023" selectTextOnFocus={Platform.OS === 'web'} />
              <Text style={styles.inputLabel}>{t('plate')}</Text>
              <TextInput style={styles.input} value={vehicleForm.plate} onChangeText={(t) => setVehicleForm({ ...vehicleForm, plate: t })} placeholder="34 ABC 123" autoCapitalize="characters" selectTextOnFocus={Platform.OS === 'web'} />
              <Text style={styles.inputLabel}>{t('last_service_date_format')}</Text>
              <TextInput style={styles.input} value={vehicleForm.lastServiceDate} onChangeText={(t) => setVehicleForm({ ...vehicleForm, lastServiceDate: t })} placeholder="Örn: 01.01.2024" selectTextOnFocus={Platform.OS === 'web'} />
              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={saveVehicle}>
                  <Text style={styles.saveBtnText}>{t('save')}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ŞİFRE DEĞİŞTİRME MODALI */}
      <Modal visible={passwordModal} animationType="slide" transparent={true} onRequestClose={() => setPasswordModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('change_password')}</Text>
              <TouchableOpacity onPress={() => setPasswordModal(false)}>
                <Ionicons name="close-circle" size={28} color="#ccc" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={styles.inputLabel}>{t('new_password')}</Text>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder={t('new_password')}
                secureTextEntry
                autoCapitalize="none"
                selectTextOnFocus={Platform.OS === 'web'}
              />
              <Text style={styles.inputLabel}>{t('new_password_confirm')}</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder={t('new_password_confirm')}
                secureTextEntry
                autoCapitalize="none"
                selectTextOnFocus={true}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={handleChangePassword}>
                  <Text style={styles.saveBtnText}>{t('save')}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* EXPORT MODALI */}
      <Modal visible={exportModal} animationType="fade" transparent={true} onRequestClose={() => setExportModal(false)}>
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { padding: 0 }]}>
            <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.modalTitle}>{t('create_report')}</Text>
              <TouchableOpacity onPress={() => setExportModal(false)}>
                <Ionicons name="close" size={24} color="#999" />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 20 }}>
              <Text style={styles.inputLabel}>{t('data_type')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
                {['sales', 'stock', 'customers', 'personnel'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.optionBtn,
                      exportType === type && styles.optionBtnSelected
                    ]}
                    onPress={() => setExportType(type)}
                  >
                    <Text style={[
                      styles.optionBtnText,
                      exportType === type && styles.optionBtnTextSelected
                    ]}>
                      {type === 'sales' ? t('sales') : type === 'stock' ? t('stock') : type === 'customers' ? t('customers') : t('personnel')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ marginBottom: 20 }} />

              <TouchableOpacity style={[styles.modalBtn, styles.saveBtn, { flex: 0, width: '100%' }]} onPress={performExport}>
                <Text style={styles.saveBtnText}>{t('download_share')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* LANGUAGE MODAL */}
      <Modal visible={languageModal} animationType="fade" transparent={true} onRequestClose={() => setLanguageModal(false)}>
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { padding: 0 }]}>
            <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.modalTitle}>{t('select_language')}</Text>
              <TouchableOpacity onPress={() => setLanguageModal(false)}>
                <Ionicons name="close" size={24} color="#999" />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 20 }}>
              <TouchableOpacity style={styles.listItem} onPress={() => changeLanguage('tr')}>
                <Text style={{ fontSize: 16, fontWeight: "600", color: "#333" }}>{t('turkish')}</Text>
                {i18n.language === 'tr' && <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />}
              </TouchableOpacity>
              <TouchableOpacity style={styles.listItem} onPress={() => changeLanguage('en')}>
                <Text style={{ fontSize: 16, fontWeight: "600", color: "#333" }}>{t('english')}</Text>
                {i18n.language === 'en' && <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ImmersiveLayout >
  );
}

const styles = StyleSheet.create({
  sectionHeader: { fontSize: 14, fontWeight: "700", color: "#888", marginLeft: 20, marginBottom: 8, textTransform: 'uppercase', marginTop: 24 },
  menuLinkCard: {
    backgroundColor: "#fff", flexDirection: "row", alignItems: "center", padding: 16, marginHorizontal: 16, borderRadius: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, marginBottom: 12
  },
  menuIconContainer: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  menuLinkTitle: { fontSize: 17, fontWeight: "700", color: "#333" },
  menuLinkSubtitle: { fontSize: 13, color: "#666", marginTop: 2 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, marginHorizontal: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  cardTitle: { fontWeight: "800", fontSize: 16, color: "#333" },
  cardSubtitle: { color: Colors.secondary ?? "#666", marginTop: 4 },
  editButton: { backgroundColor: (Colors.iosBlue ?? "#007AFF") + "15", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 14 },
  editButtonText: { color: Colors.iosBlue ?? "#007AFF", fontWeight: "700", fontSize: 12 },
  emptyText: { color: "#999", paddingVertical: 16, textAlign: 'center', fontStyle: 'italic' },
  listItem: { backgroundColor: "#fff", paddingVertical: 12, borderTopWidth: 1, borderTopColor: "#f5f5f5", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  actionTextBlue: { color: Colors.iosBlue ?? "#007AFF", fontWeight: "600", fontSize: 14 },
  actionTextRed: { color: Colors.critical ?? "#FF3B30", fontWeight: "600", fontSize: 14 },
  vehicleImage: { width: 48, height: 32, borderRadius: 6, marginBottom: 6 },
  modalContainer: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  modalContent: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "90%" },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#333" },
  inputLabel: { fontSize: 14, fontWeight: "600", color: "#666", marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: "#f9f9f9", padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "#eee", fontSize: 16, color: "#333" },
  modalButtons: { flexDirection: "row", marginTop: 20, gap: 12 },
  modalBtn: { flex: 1, padding: 16, borderRadius: 14, alignItems: "center" },
  cancelBtn: { backgroundColor: "#f0f0f0" },
  saveBtn: { backgroundColor: Colors.primary ?? "#007AFF" },
  cancelBtnText: { color: "#666", fontWeight: "700", fontSize: 16 },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  optionBtn: {
    paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: '#eee', backgroundColor: '#f9f9f9',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center'
  },
  optionBtnSelected: {
    backgroundColor: Colors.primary ?? "#007AFF", borderColor: Colors.primary ?? "#007AFF"
  },
  optionBtnText: {
    color: '#666', fontWeight: '600'
  },
  optionBtnTextSelected: {
    color: '#fff'
  },
  footerLinksContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40
  },
  footerLinkText: {
    fontSize: 12,
    color: '#888', // Colors.secondary eşdeğeri veya benzeri bir renk
    textDecorationLine: 'underline'
  },
  footerLinkDivider: {
    marginHorizontal: 10,
    color: '#ccc'
  }
});