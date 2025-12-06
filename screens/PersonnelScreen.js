import React, { useContext, useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ImmersiveLayout from "../components/ImmersiveLayout";
import { Colors } from "../Theme";
import { AppContext } from "../AppContext";


export default function PersonnelScreen({ navigation }) {
  // AppContext'ten 'isAdmin' kaldırıldı, 'isPremium' eklendi
  const { personnel, addPersonnel, updatePersonnel, deletePersonnel, isPremium } = useContext(AppContext);

  const [selectedPerson, setSelectedPerson] = useState(null);
  const [personnelModalVisible, setPersonnelModalVisible] = useState(false);
  const [taskModalVisible, setTaskModalVisible] = useState(false);

  // Filtreleme ve Sıralama State'leri
  const [searchQuery, setSearchQuery] = useState("");
  const [sortAsc, setSortAsc] = useState(true);

  const [formPerson, setFormPerson] = useState({
    id: null, name: "", role: "", phone: "", hireDate: "", annualLeaveEntitlement: "", tasks: [],
  });
  const [formTask, setFormTask] = useState({
    id: null, title: "", description: "", dueDate: "", isCompleted: false,
  });

  // --- Filtrelenmiş ve Sıralanmış Personel Listesi ---
  const filteredPersonnel = useMemo(() => {
    let result = [...personnel];
    // Arama Filtresi
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.role && p.role.toLowerCase().includes(q))
      );
    }
    // Sıralama
    result.sort((a, b) => sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));
    return result;
  }, [personnel, searchQuery, sortAsc]);

  // Admin kontrol fonksiyonu kaldırıldı
  // const checkAdmin = () => { ... };

  const openAddPerson = () => {
    // Admin kontrolü kaldırıldı
    setFormPerson({ id: null, name: "", role: "", phone: "", hireDate: "", annualLeaveEntitlement: "", tasks: [] });
    setPersonnelModalVisible(true);
  };

  const openEditPerson = (person) => {
    // Admin kontrolü kaldırıldı
    setFormPerson(person);
    setPersonnelModalVisible(true);
  };

  // --- GÜNCELLENDİ ---
  const savePersonnel = () => {
    // Admin kontrolü kaldırıldı

    if (!formPerson.name.trim()) { Alert.alert("Hata", "Personel adı zorunludur."); return; }
    if (formPerson.id) {
      updatePersonnel(formPerson);
      if (selectedPerson && selectedPerson.id === formPerson.id) setSelectedPerson(formPerson);
    } else {
      addPersonnel({ ...formPerson, id: Date.now().toString() }); // ID mantığı Supabase'de değişebilir
    }
    setPersonnelModalVisible(false);
  };
  // --- GÜNCELLEME SONU ---

  const confirmDeletePerson = (person) => {
    // Admin kontrolü kaldırıldı
    Alert.alert("Personel Sil", `${person.name} adlı personeli silmek istiyor musunuz?`, [
      { text: "İptal", style: "cancel" },
      { text: "Sil", style: "destructive", onPress: () => { deletePersonnel(person.id); setSelectedPerson(null); } },
    ]);
  };

  const openAddTask = () => {
    // Admin kontrolü kaldırıldı
    setFormTask({ id: null, title: "", description: "", dueDate: "", isCompleted: false });
    setTaskModalVisible(true);
  };

  const saveTask = () => {
    // Admin kontrolü kaldırıldı

    if (!formTask.title.trim()) { Alert.alert("Hata", "Görev başlığı zorunludur."); return; }
    const updatedTasks = [...(selectedPerson.tasks || [])];
    if (formTask.id) {
      const index = updatedTasks.findIndex((t) => t.id === formTask.id);
      updatedTasks[index] = formTask;
    } else {
      updatedTasks.push({ ...formTask, id: Date.now().toString() }); // ID mantığı Supabase'de değişebilir
    }
    const updatedPerson = { ...selectedPerson, tasks: updatedTasks };
    updatePersonnel(updatedPerson);
    setSelectedPerson(updatedPerson);
    setTaskModalVisible(false);
  };

  const toggleTaskCompletion = (task) => {
    // Görev tamamlama
    const updatedTasks = selectedPerson.tasks.map((t) => t.id === task.id ? { ...t, isCompleted: !t.isCompleted } : t);
    const updatedPerson = { ...selectedPerson, tasks: updatedTasks };
    updatePersonnel(updatedPerson);
    setSelectedPerson(updatedPerson);
  };

  const deleteTask = (taskId) => {
    // Admin kontrolü kaldırıldı
    const updatedTasks = selectedPerson.tasks.filter((t) => t.id !== taskId);
    const updatedPerson = { ...selectedPerson, tasks: updatedTasks };
    updatePersonnel(updatedPerson);
    setSelectedPerson(updatedPerson);
  };

  const renderPersonnelList = () => (
    <View>
      {/* Arama ve Sıralama Alanı */}
      <View style={styles.filterContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Personel ara..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{ flex: 1 }}
          />
        </View>
        <TouchableOpacity style={styles.sortButton} onPress={() => setSortAsc(!sortAsc)}>
          <Ionicons name={sortAsc ? "arrow-down" : "arrow-up"} size={20} color={(Colors.primary ?? "#007AFF")} />
        </TouchableOpacity>
      </View>

      {/* Admin kontrolü kaldırıldı */}
      <TouchableOpacity style={styles.addButtonBlock} onPress={openAddPerson}>
        <Ionicons name="person-add-outline" size={20} color="#fff" />
        <Text style={styles.addButtonText}>Yeni Personel Ekle</Text>
      </TouchableOpacity>

      <FlatList
        data={filteredPersonnel}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 80 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.personCard} onPress={() => setSelectedPerson(item)}>
            <View style={styles.personAvatar}><Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text></View>
            <View style={{ flex: 1, paddingHorizontal: 12 }}>
              <Text style={styles.personName}>{item.name}</Text>
              <Text style={styles.personRole}>{item.role || "Ünvan yok"}</Text>
              {/* Yıllık İzin Gösterimi */}
              {item.annualLeaveEntitlement ? (
                <View style={styles.leaveContainer}>
                  <Ionicons name="calendar-outline" size={12} color={(Colors.primary ?? "#007AFF")} style={{ marginRight: 4 }} />
                  <Text style={styles.leaveText}>İzin Hakkı: {item.annualLeaveEntitlement} Gün</Text>
                </View>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>{searchQuery ? "Aranan kriterde personel bulunamadı." : "Henüz personel kaydı yok."}</Text>}
      />
    </View>
  );

  const renderPersonnelDetail = () => (
    <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
      <View style={styles.detailCard}>
        <View style={styles.detailHeader}>
          <TouchableOpacity onPress={() => setSelectedPerson(null)} style={styles.backButton}><Ionicons name="arrow-back" size={24} color={Colors.primary ?? "#007AFF"} /><Text style={styles.backButtonText}>Listeye Dön</Text></TouchableOpacity>
          <View style={{ flexDirection: "row" }}>
            {/* Admin kontrolü kaldırıldı */}
            <TouchableOpacity onPress={() => openEditPerson(selectedPerson)} style={{ marginRight: 16 }}><Text style={styles.actionTextBlue}>Düzenle</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => confirmDeletePerson(selectedPerson)}><Text style={styles.actionTextRed}>Sil</Text></TouchableOpacity>
          </View>
        </View>
        <View style={{ alignItems: "center", marginBottom: 20 }}>
          <View style={[styles.personAvatar, { width: 80, height: 80, borderRadius: 40 }]}><Text style={[styles.avatarText, { fontSize: 32 }]}>{selectedPerson.name.charAt(0).toUpperCase()}</Text></View>
          <Text style={styles.detailName}>{selectedPerson.name}</Text><Text style={styles.detailRole}>{selectedPerson.role}</Text><Text style={styles.detailPhone}>{selectedPerson.phone}</Text>
        </View>
        <View style={styles.infoRow}><Text style={styles.infoLabel}>İşe Giriş Tarihi:</Text><Text style={styles.infoValue}>{selectedPerson.hireDate || "-"}</Text></View>
        <View style={styles.infoRow}><Text style={styles.infoLabel}>Yıllık İzin Hakkı:</Text><Text style={styles.infoValue}>{selectedPerson.annualLeaveEntitlement ? `${selectedPerson.annualLeaveEntitlement} Gün` : "-"}</Text></View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Atanan Görevler</Text>
        {/* Admin kontrolü kaldırıldı */}
        <TouchableOpacity onPress={openAddTask} style={styles.smallAddButton}>
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={styles.smallAddButtonText}>Görev Ekle</Text>
        </TouchableOpacity>
      </View>

      {!selectedPerson.tasks || selectedPerson.tasks.length === 0 ? <Text style={styles.emptyText}>Bu personele henüz görev atanmamış.</Text> : (
        selectedPerson.tasks.map((task) => (
          <View key={task.id} style={[styles.taskCard, task.isCompleted && styles.taskCardCompleted]}>
            <TouchableOpacity onPress={() => toggleTaskCompletion(task)} style={{ marginRight: 12 }}><Ionicons name={task.isCompleted ? "checkmark-circle" : "ellipse-outline"} size={28} color={task.isCompleted ? (Colors.success ?? "#34C759") : "#ccc"} /></TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={[styles.taskTitle, task.isCompleted && styles.completedText]}>{task.title}</Text>
              {task.description ? <Text style={styles.taskDesc}>{task.description}</Text> : null}
              {task.dueDate ? <Text style={styles.taskDate}><Ionicons name="calendar-outline" size={12} /> Son Tarih: {task.dueDate}</Text> : null}
            </View>
            {/* Admin kontrolü kaldırıldı */}
            <TouchableOpacity onPress={() => deleteTask(task.id)} style={{ padding: 8 }}><Ionicons name="trash-outline" size={20} color={Colors.critical ?? "#FF3B30"} /></TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );

  return (
    <ImmersiveLayout title="Personel Yönetimi" subtitle={selectedPerson ? "Personel Detayları & Görevler" : `${filteredPersonnel.length} Personel`} onGoBack={() => navigation.goBack()}>
      <View style={{ flex: 1, padding: 16 }}>{selectedPerson ? renderPersonnelDetail() : renderPersonnelList()}</View>

      {/* Personel Ekleme/Düzenleme Modalı */}
      <Modal visible={personnelModalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{formPerson.id ? "Personeli Düzenle" : "Yeni Personel"}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Ad Soyad</Text><TextInput style={styles.input} value={formPerson.name} onChangeText={(t) => setFormPerson({ ...formPerson, name: t })} placeholder="Örn: Ahmet Yılmaz" />
              <Text style={styles.inputLabel}>Ünvan / Pozisyon</Text><TextInput style={styles.input} value={formPerson.role} onChangeText={(t) => setFormPerson({ ...formPerson, role: t })} placeholder="Örn: Satış Sorumlusu" />
              <Text style={styles.inputLabel}>Telefon</Text><TextInput style={styles.input} value={formPerson.phone} onChangeText={(t) => setFormPerson({ ...formPerson, phone: t })} keyboardType="phone-pad" placeholder="0555..." />
              <Text style={styles.inputLabel}>İşe Giriş Tarihi (GG.AA.YYYY)</Text><TextInput style={styles.input} value={formPerson.hireDate} onChangeText={(t) => setFormPerson({ ...formPerson, hireDate: t })} placeholder="Örn: 01.01.2023" />
              <Text style={styles.inputLabel}>Yıllık İzin Hakkı (Gün)</Text><TextInput style={styles.input} value={formPerson.annualLeaveEntitlement} onChangeText={(t) => setFormPerson({ ...formPerson, annualLeaveEntitlement: t })} keyboardType="numeric" placeholder="14" />
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setPersonnelModalVisible(false)}><Text style={styles.cancelBtnText}>İptal</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={savePersonnel}><Text style={styles.saveBtnText}>Kaydet</Text></TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Görev Ekleme Modalı */}
      <Modal visible={taskModalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Yeni Görev Ata</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Görev Başlığı</Text><TextInput style={styles.input} value={formTask.title} onChangeText={(t) => setFormTask({ ...formTask, title: t })} placeholder="Örn: Aylık Rapor Hazırlığı" />
              <Text style={styles.inputLabel}>Açıklama</Text><TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} value={formTask.description} onChangeText={(t) => setFormTask({ ...formTask, description: t })} multiline placeholder="Görev detayları..." />
              <Text style={styles.inputLabel}>Son Tarih (GG.AA.YYYY)</Text><TextInput style={styles.input} value={formTask.dueDate} onChangeText={(t) => setFormTask({ ...formTask, dueDate: t })} placeholder="Örn: 15.11.2025" />
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setTaskModalVisible(false)}><Text style={styles.cancelBtnText}>İptal</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={saveTask}><Text style={styles.saveBtnText}>Görevi Ata</Text></TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* REKLAM ALANI */}

    </ImmersiveLayout>
  );
}

const styles = StyleSheet.create({
  // Filtreleme Alanı Stilleri
  filterContainer: { flexDirection: 'row', marginBottom: 16, gap: 10 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 12, borderRadius: 12, height: 46, borderWidth: 1, borderColor: '#eee' },
  sortButton: { width: 46, height: 46, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: '#eee' },

  addButtonBlock: { backgroundColor: (Colors.primary ?? "#007AFF"), flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 14, borderRadius: 12, marginBottom: 16 },
  addButtonText: { color: "#fff", fontWeight: "700", marginLeft: 8, fontSize: 16 },
  personCard: { backgroundColor: "#fff", flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 16, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  personAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: (Colors.primaryLight ?? "#E1F5FE"), alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 20, fontWeight: "800", color: (Colors.primary ?? "#007AFF") },
  personName: { fontSize: 17, fontWeight: "700", color: "#333" },
  personRole: { fontSize: 14, color: "#666", marginTop: 2 },
  leaveContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 6, backgroundColor: '#F0F9FF', alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8 },
  leaveText: { fontSize: 12, color: (Colors.primary ?? "#007AFF"), fontWeight: "600" },
  emptyText: { textAlign: "center", color: "#999", marginTop: 20, fontSize: 16 },
  detailCard: { backgroundColor: "#fff", padding: 20, borderRadius: 24, marginBottom: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 },
  detailHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  backButton: { flexDirection: "row", alignItems: "center" },
  backButtonText: { color: (Colors.primary ?? "#007AFF"), marginLeft: 4, fontWeight: "600" },
  detailName: { fontSize: 24, fontWeight: "800", color: "#333", marginTop: 12 },
  detailRole: { fontSize: 18, color: (Colors.primary ?? "#007AFF"), fontWeight: "600", marginTop: 4 },
  detailPhone: { fontSize: 15, color: "#666", marginTop: 4 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  infoLabel: { color: "#666", fontWeight: "600" },
  infoValue: { color: "#333", fontWeight: "700" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 20, fontWeight: "800", color: "#333" },
  smallAddButton: { backgroundColor: (Colors.success ?? "#34C759"), flexDirection: "row", alignItems: "center", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  smallAddButtonText: { color: "#fff", fontWeight: "700", fontSize: 12, marginLeft: 4 },
  taskCard: { backgroundColor: "#fff", flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 16, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: (Colors.primary ?? "#007AFF"), shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  taskCardCompleted: { borderLeftColor: (Colors.success ?? "#34C759"), opacity: 0.8 },
  taskTitle: { fontSize: 16, fontWeight: "700", color: "#333" },
  completedText: { textDecorationLine: "line-through", color: "#999" },
  taskDesc: { fontSize: 14, color: "#666", marginTop: 4 },
  taskDate: { fontSize: 12, color: (Colors.secondary ?? "#888"), marginTop: 8, fontWeight: "600" },
  actionTextBlue: { color: (Colors.iosBlue ?? "#007AFF"), fontWeight: "700", fontSize: 15 },
  actionTextRed: { color: (Colors.critical ?? "#FF3B30"), fontWeight: "700", fontSize: 15 },
  modalContainer: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  modalContent: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "80%" },
  modalTitle: { fontSize: 22, fontWeight: "800", marginBottom: 20, textAlign: "center", color: "#333" },
  inputLabel: { fontSize: 14, fontWeight: "600", color: "#666", marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: "#f9f9f9", padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "#eee", fontSize: 16, color: "#333" },
  modalButtons: { flexDirection: "row", marginTop: 30, gap: 12 },
  modalBtn: { flex: 1, padding: 16, borderRadius: 14, alignItems: "center" },
  cancelBtn: { backgroundColor: "#f0f0f0" },
  saveBtn: { backgroundColor: (Colors.primary ?? "#007AFF") },
  cancelBtnText: { color: "#666", fontWeight: "700", fontSize: 16 },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});