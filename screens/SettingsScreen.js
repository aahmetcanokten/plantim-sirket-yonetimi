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
import { Ionicons } from "@expo/vector-icons";
import ImmersiveLayout from "../components/ImmersiveLayout";
import { Colors } from "../Theme";
import { AppContext } from "../AppContext";
import { useAuth } from "../AuthContext";
import { exportToPDF, exportToExcel } from "../utils/ExportHelper";

export default function SettingsScreen({ navigation }) {
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
  const [exportFormat, setExportFormat] = useState("pdf"); // pdf, excel


  useEffect(() => {
    setCName(company?.name ?? "");
    setCAddress(company?.address ?? "");
    setCTax(company?.taxId ?? "");
  }, [company]);

  // Şifre Değiştirme Fonksiyonu
  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert("Eksik Bilgi", "Lütfen tüm alanları doldurun.");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Zayıf Şifre", "Yeni şifreniz en az 6 karakter olmalıdır.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Hata", "Şifreler eşleşmiyor.");
      return;
    }

    const { error } = await updatePassword(newPassword);

    if (error) {
      Alert.alert("Hata", "Şifre güncellenemedi: " + error.message);
    } else {
      Alert.alert("Başarılı", "Şifreniz başarıyla güncellendi.");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordModal(false);
    }
  };

  // Hesabı Sil Fonksiyonu
  const handleDeleteAccount = async () => {
    Alert.alert(
      "Hesabı Sil",
      "Hesabınızı ve tüm verilerinizi (müşteriler, stoklar, satışlar vb.) kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.",
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Hesabımı ve Verilerimi Sil",
          style: "destructive",
          onPress: async () => {
            try {
              // 1. Verileri Sil
              const success = await deleteUserAccount();
              if (!success) {
                Alert.alert("Hata", "Veriler silinirken bir sorun oluştu, ancak çıkış yapılacak.");
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
    Alert.alert(
      "Çıkış Yap",
      "Oturumu kapatmak istediğinize emin misiniz?",
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Çıkış Yap",
          style: "destructive",
          onPress: async () => {
            const { error } = await signOut();
            if (error) {
              Alert.alert("Hata", "Çıkış yapılamadı: " + error.message);
            }
          }
        },
      ]
    );
  };

  const saveCompany = () => {
    if (!cName.trim()) { Alert.alert("Hata", "Şirket adı zorunlu."); return; }
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
    Alert.alert("Araç Sil", `${item.model} silinsin mi?`, [
      { text: "İptal", style: "cancel" },
      { text: "Sil", style: "destructive", onPress: () => deleteVehicle(item.id) },
    ]);
  };

  // --- Export İşlemleri ---
  const handleOpenExport = () => {
    if (!isPremium) {
      Alert.alert(
        "Premium Özellik",
        "Verileri dışa aktırma özelliği sadece Premium üyeler içindir. Hemen Premium'a geçin!",
        [
          { text: "Vazgeç", style: "cancel" },
          { text: "Premium'a Geç", onPress: () => navigation.navigate("Paywall") }
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
            productName: prod ? prod.name : "Silinmiş Ürün",
            customerName: cust ? cust.name : "Genel Müşteri",
            dateFormatted: new Date(s.sale_date).toLocaleDateString('tr-TR')
          };
        });
        columns = [
          { header: "Tarih", key: "dateFormatted" },
          { header: "Ürün", key: "productName" },
          { header: "Müşteri", key: "customerName" },
          { header: "Adet", key: "quantity" },
          { header: "Tutar", key: "totalPrice" },
        ];
        break;
      case "stock":
        title = "Stok Listesi";
        fileName = "Stok_Listesi";
        dataToExport = products;
        columns = [
          { header: "Ürün Adı", key: "name" },
          { header: "Stok Adedi", key: "quantity" },
          { header: "Alış Fiyatı", key: "purchasePrice" },
          { header: "Satış Fiyatı", key: "salePrice" },
        ];
        break;
      case "customers":
        title = "Müşteri Listesi";
        fileName = "Musteri_Listesi";
        dataToExport = customers;
        columns = [
          { header: "Ad Soyad", key: "name" },
          { header: "Telefon", key: "phone" },
          { header: "E-posta", key: "email" },
          { header: "Adres", key: "address" },
        ];
        break;
      case "personnel":
        title = "Personel Listesi";
        fileName = "Personel_Listesi";
        dataToExport = personnel;
        columns = [
          { header: "Ad Soyad", key: "name" },
          { header: "Rol", key: "role" },
          { header: "Telefon", key: "phone" },
          { header: "Maaş", key: "salary" },
        ];
        break;
    }

    if (dataToExport.length === 0) {
      Alert.alert("Uyarı", "Seçilen kategoride dışa aktarılacak veri bulunamadı.");
      return;
    }

    try {
      if (exportFormat === "pdf") {
        await exportToPDF(title, dataToExport, columns);
      } else {
        await exportToExcel(fileName, dataToExport, columns);
      }
      setExportModal(false);
    } catch (e) {
      Alert.alert("Hata", "Dışa aktarma sırasında bir sorun oluştu: " + e.message);
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
    <ImmersiveLayout title="Ayarlar" subtitle="Şirket ve Hesap Yönetimi">
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

        <Text style={styles.sectionHeader}>Yönetim</Text>

        <MenuLinkCard
          title="Personel Yönetimi"
          subtitle="Çalışanlar, izinler ve görev atamaları"
          icon="people"
          color={Colors.primary ?? "#007AFF"}
          onPress={() => {
            navigation.navigate("PersonnelScreen");
          }}
        />

        <MenuLinkCard
          title="Zimmet Yönetimi"
          subtitle="Envanter ve zimmet takibi"
          icon="briefcase"
          color="#8B5CF6"
          onPress={() => navigation.navigate("AssetManagementScreen")}
        />

        <MenuLinkCard
          title="Tüm Görevler"
          subtitle="Atanan işler, gecikenler ve tamamlananlar"
          icon="checkbox"
          color={Colors.success ?? "#34C759"}
          onPress={() => navigation.navigate("TaskListScreen")}
        />

        <MenuLinkCard
          title="Verileri Dışa Aktar"
          subtitle="Excel veya PDF olarak rapor al"
          icon="document-text"
          color="#FF9500"
          onPress={handleOpenExport}
        />

        {/* Şirket Bilgileri Kartı */}
        <View style={[styles.card, { marginTop: 24 }]}>
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="business" size={20} color={Colors.primary ?? "#007AFF"} style={{ marginRight: 8 }} />
              <Text style={styles.cardTitle}>Şirket Bilgileri</Text>
            </View>
            <TouchableOpacity style={styles.editButton} onPress={() => setCompanyModal(true)}>
              <Text style={styles.editButtonText}>Düzenle</Text>
            </TouchableOpacity>
          </View>
          <View style={{ paddingLeft: 28 }}>
            <Text style={{ marginTop: 8, fontWeight: "700", fontSize: 16 }}>{company?.name}</Text>
            <Text style={styles.cardSubtitle}>{company?.address || "Adres girilmemiş"}</Text>
            <Text style={styles.cardSubtitle}>
              {company?.taxId ? `Vergi No: ${company.taxId}` : "Vergi numarası yok"}
            </Text>
          </View>
        </View>

        {/* Araçlar Kartı */}
        <View style={[styles.card, { marginTop: 16 }]}>
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="car-sport" size={20} color={Colors.primary ?? "#007AFF"} style={{ marginRight: 8 }} />
              <Text style={styles.cardTitle}>Araçlar</Text>
            </View>
            <TouchableOpacity style={styles.editButton} onPress={openAddVehicle}>
              <Text style={styles.editButtonText}>Yeni Ekle</Text>
            </TouchableOpacity>
          </View>
          {vehicles.length === 0 ? (
            <Text style={styles.emptyText}>Henüz araç eklenmedi.</Text>
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
                      Son servis: {item.lastServiceDate ? new Date(item.lastServiceDate).toLocaleDateString('tr-TR') : "-"}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    {item.photoUri ? <Image source={{ uri: item.photoUri }} style={styles.vehicleImage} /> : null}
                    <TouchableOpacity onPress={() => openEditVehicle(item)}>
                      <Text style={styles.actionTextBlue}>Düzenle</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => confirmDeleteVehicle(item)} style={{ marginTop: 4 }}>
                      <Text style={styles.actionTextRed}>Sil</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          )}
        </View>

        {/* HESAP BÖLÜMÜ */}
        <Text style={styles.sectionHeader}>Hesap</Text>

        {/* PREMIUM BUTONU - YENİ */}
        {!isPremium && (
          <MenuLinkCard
            title="Premium'a Geç"
            subtitle="Reklamsız kullanım ve sınırsız stok"
            icon="star"
            color="#FFD700" // Altın Rengi
            onPress={() => navigation.navigate("Paywall")}
          />
        )}

        <View style={[styles.card, { paddingBottom: 8 }]}>
          <View style={[styles.cardHeader, { marginBottom: 0 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="person-circle" size={20} color={Colors.primary ?? "#007AFF"} style={{ marginRight: 8 }} />
              <Text style={styles.cardTitle}>Hesap Bilgileri</Text>
            </View>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => {
                setNewPassword("");
                setConfirmPassword("");
                setPasswordModal(true);
              }}
            >
              <Text style={styles.editButtonText}>Şifre Değiştir</Text>
            </TouchableOpacity>
          </View>
          <View style={{ paddingLeft: 28, paddingTop: 4 }}>
            <Text style={styles.cardSubtitle}>Giriş yapılan e-posta:</Text>
            <Text style={{ marginTop: 2, fontWeight: "700", fontSize: 15, color: '#333' }}>
              {session?.user?.email ?? 'Yükleniyor...'}
            </Text>
          </View>
        </View>

        <MenuLinkCard
          title="Hesabımı Sil"
          subtitle="Tüm verileri ve hesabı kalıcı olarak sil"
          icon="trash-outline"
          color={Colors.critical ?? "#FF3B30"}
          onPress={handleDeleteAccount}
        />

        <MenuLinkCard
          title="Çıkış Yap"
          subtitle="Güvenli bir şekilde oturumu kapat"
          icon="log-out"
          color={Colors.secondary ?? "#8E8E93"}
          onPress={handleLogout}
        />

        {/* HAKKINDA BÖLÜMÜ */}
        <Text style={styles.sectionHeader}>Hakkında</Text>

        <MenuLinkCard
          title="Gizlilik Politikası"
          subtitle="Veri kullanımı ve gizlilik hakları"
          icon="shield-checkmark-outline"
          color="#5856D6"
          onPress={() => {
            Linking.openURL("https://docs.google.com/document/d/1rklxAoHqGFZMChJ8Hsa4be943dsqZ_C3l8KZ587Qe3c/edit?usp=sharing");
          }}
        />

        <MenuLinkCard
          title="Kullanım Koşulları (EULA)"
          subtitle="Hizmet şartları ve yasal anlaşma"
          icon="document-text-outline"
          color="#8E8E93"
          onPress={() => {
            Linking.openURL("https://www.apple.com/legal/internet-services/itunes/dev/stdeula/");
          }}
        />

      </ScrollView>

      {/* ŞİRKET MODALI */}
      <Modal visible={companyModal} animationType="slide" transparent={true} onRequestClose={() => setCompanyModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Şirket Bilgileri</Text>
              <TouchableOpacity onPress={() => setCompanyModal(false)}>
                <Ionicons name="close-circle" size={28} color="#ccc" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={styles.inputLabel}>Şirket Adı</Text>
              <TextInput style={styles.input} value={cName} onChangeText={setCName} placeholder="Şirket Adı" />
              <Text style={styles.inputLabel}>Adres</Text>
              <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} value={cAddress} onChangeText={setCAddress} placeholder="Açık adres..." multiline />
              <Text style={styles.inputLabel}>Vergi Numarası</Text>
              <TextInput style={styles.input} value={cTax} onChangeText={setCTax} placeholder="Vergi no..." keyboardType="numeric" />
              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={saveCompany}>
                  <Text style={styles.saveBtnText}>Kaydet</Text>
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
              <Text style={styles.modalTitle}>{editVehicle ? "Araç Düzenle" : "Yeni Araç Ekle"}</Text>
              <TouchableOpacity onPress={() => setVehicleModal(false)}>
                <Ionicons name="close-circle" size={28} color="#ccc" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={styles.inputLabel}>Araç Modeli</Text>
              <TextInput style={styles.input} value={vehicleForm.model} onChangeText={(t) => setVehicleForm({ ...vehicleForm, model: t })} placeholder="Örn: Ford Transit 2023" />
              <Text style={styles.inputLabel}>Plaka</Text>
              <TextInput style={styles.input} value={vehicleForm.plate} onChangeText={(t) => setVehicleForm({ ...vehicleForm, plate: t })} placeholder="34 ABC 123" autoCapitalize="characters" />
              <Text style={styles.inputLabel}>Son Servis Tarihi (GG.AA.YYYY)</Text>
              <TextInput style={styles.input} value={vehicleForm.lastServiceDate} onChangeText={(t) => setVehicleForm({ ...vehicleForm, lastServiceDate: t })} placeholder="Örn: 01.01.2024" />
              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={saveVehicle}>
                  <Text style={styles.saveBtnText}>Kaydet</Text>
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
              <Text style={styles.modalTitle}>Şifre Değiştir</Text>
              <TouchableOpacity onPress={() => setPasswordModal(false)}>
                <Ionicons name="close-circle" size={28} color="#ccc" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={styles.inputLabel}>Yeni Şifre</Text>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="En az 6 karakter"
                secureTextEntry
                autoCapitalize="none"
              />
              <Text style={styles.inputLabel}>Yeni Şifre (Tekrar)</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Yeni şifreyi onaylayın"
                secureTextEntry
                autoCapitalize="none"
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={handleChangePassword}>
                  <Text style={styles.saveBtnText}>Kaydet</Text>
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
              <Text style={styles.modalTitle}>Rapor Oluştur</Text>
              <TouchableOpacity onPress={() => setExportModal(false)}>
                <Ionicons name="close" size={24} color="#999" />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 20 }}>
              <Text style={styles.inputLabel}>Veri Türü</Text>
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
                      {type === 'sales' ? 'Satışlar' : type === 'stock' ? 'Stoklar' : type === 'customers' ? 'Müşteriler' : 'Personel'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Dosya Formatı</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                {['pdf', 'excel'].map((fmt) => (
                  <TouchableOpacity
                    key={fmt}
                    style={[
                      styles.optionBtn,
                      exportFormat === fmt && styles.optionBtnSelected,
                      { flex: 1 }
                    ]}
                    onPress={() => setExportFormat(fmt)}
                  >
                    <Ionicons
                      name={fmt === 'pdf' ? 'document-text' : 'grid'}
                      size={20}
                      color={exportFormat === fmt ? '#fff' : '#666'}
                      style={{ marginRight: 8 }}
                    />
                    <Text style={[
                      styles.optionBtnText,
                      exportFormat === fmt && styles.optionBtnTextSelected
                    ]}>
                      {fmt === 'pdf' ? 'PDF Dosyası' : 'Excel Tablosu'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={performExport}>
                <Text style={styles.saveBtnText}>İndir / Paylaş</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ImmersiveLayout>
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
  }
});