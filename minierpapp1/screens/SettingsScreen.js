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
  Switch, // Bu artık kullanılmıyor ancak kaldırmıyoruz
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ImmersiveLayout from "../components/ImmersiveLayout";
import { Colors } from "../Theme";
import { AppContext } from "../AppContext";
import { useAuth } from "../AuthContext"; 

// YÖNETİCİ MODU İLE İLGİLİ TÜM KISIMLAR KALDIRILDI

export default function SettingsScreen({ navigation }) {
  // AppContext'ten verileri al
  const {
    vehicles,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    company,
    updateCompanyInfo,
    // isAdmin ve setIsAdmin kaldırıldı
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
  
  // Lokal admin state'leri ve şifre modalı state'leri kaldırıldı

  // Şifre Değiştirme Modalı
  const [passwordModal, setPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");


  useEffect(() => {
    setCName(company?.name ?? "");
    setCAddress(company?.address ?? "");
    setCTax(company?.taxId ?? "");
  }, [company]);

  // YÖNETİCİ MODU FONKSİYONLARI (checkAdmin, handleAdminToggle, handleAdminLogin) KALDIRILDI

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

  // Diğer fonksiyonlar (checkAdmin() kontrolleri kaldırıldı)
  const saveCompany = () => {
    // if (!checkAdmin()) return; // KALDIRILDI
    if (!cName.trim()) { Alert.alert("Hata", "Şirket adı zorunlu."); return; }
    updateCompanyInfo({ name: cName.trim(), address: cAddress.trim(), taxId: cTax.trim() });
    setCompanyModal(false);
  };

  const openAddVehicle = () => {
    // if (!checkAdmin()) return; // KALDIRILDI
    setEditVehicle(null);
    setVehicleForm({ model: "", plate: "", lastServiceDate: "" });
    setVehicleModal(true);
  };

  const openEditVehicle = (item) => {
    // if (!checkAdmin()) return; // KALDIRILDI
    setEditVehicle(item);
    setVehicleForm({
        model: item.model,
        plate: item.plate,
        lastServiceDate: item.lastServiceDate ? new Date(item.lastServiceDate).toLocaleDateString('tr-TR') : "",
    });
    setVehicleModal(true);
  };

  const saveVehicle = () => {
    // if (!checkAdmin()) return; // KALDIRILDI
    
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
        // HATA BURADAYDI: id: Date.now().toString() kaldırıldı
        addVehicle(vehicleData); 
    }
    
    setVehicleModal(false);
    setEditVehicle(null);
    setVehicleForm({ model: "", plate: "", lastServiceDate: "" });
  };

  const confirmDeleteVehicle = (item) => {
    // if (!checkAdmin()) return; // KALDIRILDI
    Alert.alert("Araç Sil", `${item.model} silinsin mi?`, [
      { text: "İptal", style: "cancel" },
      { text: "Sil", style: "destructive", onPress: () => deleteVehicle(item.id) },
    ]);
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
        
        {/* YÖNETİCİ MODU ANAHTARI (Global state'e bağlandı) - KALDIRILDI */}
        {/*
        <View style={styles.adminToggleCard}>
           ...içerik...
        </View>
        */}

        <Text style={styles.sectionHeader}>Yönetim</Text>
        
        {/* Personel Yönetimi (checkAdmin() kaldırıldı) */}
        <MenuLinkCard 
          title="Personel Yönetimi"
          subtitle="Çalışanlar, izinler ve görev atamaları"
          icon="people"
          color={Colors.primary ?? "#007AFF"}
          onPress={() => {
            // if (!checkAdmin()) return; // Admin kontrolü KALDIRILDI
            navigation.navigate("PersonnelScreen");
          }}
        />
        <MenuLinkCard 
          title="Tüm Görevler"
          subtitle="Atanan işler, gecikenler ve tamamlananlar"
          icon="checkbox"
          color={Colors.success ?? "#34C759"}
          onPress={() => navigation.navigate("TaskListScreen")}
        />
        
        {/* Şirket Bilgileri Kartı (checkAdmin() kaldırıldı) */}
        <View style={[styles.card, { marginTop: 24 }]}>
          <View style={styles.cardHeader}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                 <Ionicons name="business" size={20} color={Colors.primary ?? "#007AFF"} style={{marginRight: 8}} />
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

        {/* Araçlar Kartı (checkAdmin() kaldırıldı) */}
        <View style={[styles.card, { marginTop: 16 }]}>
          <View style={styles.cardHeader}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Ionicons name="car-sport" size={20} color={Colors.primary ?? "#007AFF"} style={{marginRight: 8}} />
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
        <View style={[styles.card, { paddingBottom: 8 }]}>
          <View style={[styles.cardHeader, { marginBottom: 0 }]}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                 <Ionicons name="person-circle" size={20} color={Colors.primary ?? "#007AFF"} style={{marginRight: 8}} />
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
          title="Çıkış Yap"
          subtitle="Güvenli bir şekilde oturumu kapat"
          icon="log-out"
          color={Colors.critical ?? "#FF3B30"} 
          onPress={handleLogout}
        />
      </ScrollView>

      {/* YÖNETİCİ GİRİŞ MODALI (Global fonksiyona bağlandı) - KALDIRILDI */}
      {/*
      <Modal visible={adminLoginModalVisible} ...>
          ...içerik...
      </Modal>
      */}

      {/* ŞİRKET MODALI (isAdmin kontrolü kaldırıldı) */}
      <Modal visible={companyModal} animationType="slide" transparent={true} onRequestClose={() => setCompanyModal(false)}>
         <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalContainer}>
            <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Şirket Bilgileri</Text>
                    <TouchableOpacity onPress={() => setCompanyModal(false)}>
                        <Ionicons name="close-circle" size={28} color="#ccc" />
                    </TouchableOpacity>
                </View>
                {/* !isAdmin ? (...) : (...) TERNARY YAPI KALDIRILDI */}
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

      {/* ARAÇ MODALI (isAdmin kontrolü kaldırıldı) */}
       <Modal visible={vehicleModal} animationType="slide" transparent={true} onRequestClose={() => setVehicleModal(false)}>
           <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalContainer}>
            <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>{editVehicle ? "Araç Düzenle" : "Yeni Araç Ekle"}</Text>
                    <TouchableOpacity onPress={() => setVehicleModal(false)}>
                        <Ionicons name="close-circle" size={28} color="#ccc" />
                    </TouchableOpacity>
                </View>
                {/* !isAdmin ? (...) : (...) TERNARY YAPI KALDIRILDI */}
                <ScrollView>
                    <Text style={styles.inputLabel}>Araç Modeli</Text>
                    <TextInput style={styles.input} value={vehicleForm.model} onChangeText={(t)=>setVehicleForm({...vehicleForm, model:t})} placeholder="Örn: Ford Transit 2023" />
                    <Text style={styles.inputLabel}>Plaka</Text>
                    <TextInput style={styles.input} value={vehicleForm.plate} onChangeText={(t)=>setVehicleForm({...vehicleForm, plate:t})} placeholder="34 ABC 123" autoCapitalize="characters" />
                    <Text style={styles.inputLabel}>Son Servis Tarihi (GG.AA.YYYY)</Text>
                    <TextInput style={styles.input} value={vehicleForm.lastServiceDate} onChangeText={(t)=>setVehicleForm({...vehicleForm, lastServiceDate:t})} placeholder="Örn: 01.01.2024" />
                    <View style={styles.modalButtons}>
                        <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={saveVehicle}>
                            <Text style={styles.saveBtnText}>Kaydet</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </View>
          </KeyboardAvoidingView>
       </Modal>

       {/* ŞİFRE DEĞİŞTİRME MODALI (Bunda değişiklik yok) */}
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
    </ImmersiveLayout>
  );
}

// Stiller (Değişiklik yok)
const styles = StyleSheet.create({
  sectionHeader: { fontSize: 14, fontWeight: "700", color: "#888", marginLeft: 20, marginBottom: 8, textTransform: 'uppercase', marginTop: 24 }, 
  menuLinkCard: {
    backgroundColor: "#fff", flexDirection: "row", alignItems: "center", padding: 16, marginHorizontal: 16, borderRadius: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, marginBottom: 12
  },
  menuIconContainer: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  menuLinkTitle: { fontSize: 17, fontWeight: "700", color: "#333" },
  menuLinkSubtitle: { fontSize: 13, color: "#666", marginTop: 2 },
  adminToggleCard: { backgroundColor: "#fff", flexDirection: "row", alignItems: "center", justifyContent: "space-between",paddingVertical: 12, paddingHorizontal: 16, marginHorizontal: 16, borderRadius: 16, marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3, borderWidth: 1, borderColor: "#f5f5f5" },
  adminToggleLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, marginHorizontal: 16, shadowColor: "#000", shadowOffset: {width:0, height:2}, shadowOpacity:0.03, shadowRadius: 6, elevation: 1 },
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
  loginModalContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  loginModalContent: { backgroundColor: "#fff", borderRadius: 24, padding: 24, width: "85%", alignItems: "center" },
  loginModalTitle: { fontSize: 22, fontWeight: "800", color: "#333", marginBottom: 8 },
  loginModalSubtitle: { fontSize: 14, color: "#666", marginBottom: 20, textAlign: "center" },
  loginInput: { backgroundColor: "#f5f5f5", padding: 14, borderRadius: 12, width: '100%', fontSize: 16, marginBottom: 20, textAlign: 'center' },
  loginModalButtons: { flexDirection: "row", gap: 12, width: '100%' },
  loginModalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
});