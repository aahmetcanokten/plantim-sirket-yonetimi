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
import { useTranslation } from "react-i18next";


export default function PersonnelScreen({ navigation }) {
  // AppContext'ten 'isAdmin' kaldırıldı, 'isPremium' eklendi
  const { personnel, addPersonnel, updatePersonnel, deletePersonnel, isPremium } = useContext(AppContext);
  const { t } = useTranslation();

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
    if (!isPremium && personnel.length >= 2) {
      if (Platform.OS === 'web') {
        if (window.confirm(t("personnel_limit_message"))) {
          navigation.navigate("Paywall");
        }
      } else {
        Alert.alert(
          t("premium_feature"),
          t("personnel_limit_message"),
          [
            { text: t("cancel"), style: "cancel" },
            { text: t("get_premium"), onPress: () => navigation.navigate("Paywall") }
          ]
        );
      }
      return;
    }
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

    if (!formPerson.name.trim() || !formPerson.role.trim()) { Alert.alert(t("error"), t("fill_required_fields")); return; }
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
    if (Platform.OS === 'web') {
      if (window.confirm(`${person.name} ${t("delete_personnel_confirmation")}`)) {
        deletePersonnel(person.id);
        setSelectedPerson(null);
      }
    } else {
      Alert.alert(t("delete_personnel"), `${person.name} ${t("delete_personnel_confirmation")}`, [
        { text: t("cancel"), style: "cancel" },
        { text: t("delete"), style: "destructive", onPress: () => { deletePersonnel(person.id); setSelectedPerson(null); } },
      ]);
    }
  };

  const openAddTask = () => {
    // Admin kontrolü kaldırıldı
    setFormTask({ id: null, title: "", description: "", dueDate: "", isCompleted: false });
    setTaskModalVisible(true);
  };

  const saveTask = () => {
    // Admin kontrolü kaldırıldı

    if (!formTask.title.trim()) { Alert.alert(t("error"), t("task_title_required")); return; }
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

  const handleLeaveChange = (amount) => {
    if (!selectedPerson) return;

    const applyChange = () => {
      const currentLeave = parseFloat(selectedPerson.annualLeaveEntitlement) || 0;
      const newLeave = currentLeave + amount;
      const updatedPerson = { ...selectedPerson, annualLeaveEntitlement: newLeave.toString() };
      updatePersonnel(updatedPerson);
      setSelectedPerson(updatedPerson);
    };

    if (amount < 0) {
      if (Platform.OS === 'web') {
        if (window.confirm(t("annual_leave_usage_confirmation"))) {
          applyChange();
        }
      } else {
        Alert.alert(
          t("annual_leave_usage"),
          t("annual_leave_usage_confirmation"),
          [
            { text: t("cancel"), style: "cancel" },
            { text: t("confirm"), onPress: applyChange }
          ]
        );
      }
    } else {
      applyChange();
    }
  };

  const renderPersonnelList = () => (
    <View>
      {/* Arama ve Sıralama Alanı */}
      <View style={styles.filterContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" style={{ marginRight: 8 }} />
          <TextInput
            placeholder={t("search_personnel")}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{ flex: 1 }}
            selectTextOnFocus={Platform.OS === 'web'}
          />
        </View>
        <TouchableOpacity style={styles.sortButton} onPress={() => setSortAsc(!sortAsc)}>
          <Ionicons name={sortAsc ? "arrow-down" : "arrow-up"} size={20} color={(Colors.primary ?? "#007AFF")} />
        </TouchableOpacity>
      </View>

      {/* Admin kontrolü kaldırıldı */}
      <TouchableOpacity style={styles.addButtonBlock} onPress={openAddPerson}>
        <Ionicons name="person-add-outline" size={20} color="#fff" />
        <Text style={styles.addButtonText}>{t("add_new_personnel")}</Text>
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
              <Text style={styles.personRole}>{item.role || t("no_title")}</Text>
              {/* Yıllık İzin Gösterimi */}
              {item.annualLeaveEntitlement ? (
                <View style={styles.leaveContainer}>
                  <Ionicons name="calendar-outline" size={12} color={(Colors.primary ?? "#007AFF")} style={{ marginRight: 4 }} />
                  <Text style={styles.leaveText}>{t("leave_entitlement")}: {item.annualLeaveEntitlement} {t("days")}</Text>
                </View>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>{searchQuery ? t("no_personnel_match") : t("no_personnel_record")}</Text>}
      />
    </View>
  );

  const renderPersonnelDetail = () => (
    <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
      <View style={styles.detailCard}>
        <View style={styles.detailHeader}>
          <TouchableOpacity onPress={() => setSelectedPerson(null)} style={styles.backButton}><Ionicons name="arrow-back" size={24} color={Colors.primary ?? "#007AFF"} /><Text style={styles.backButtonText}>{t("return_to_list")}</Text></TouchableOpacity>
          <View style={{ flexDirection: "row" }}>
            {/* Admin kontrolü kaldırıldı */}
            <TouchableOpacity onPress={() => openEditPerson(selectedPerson)} style={{ marginRight: 16 }}><Text style={styles.actionTextBlue}>{t("edit")}</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => confirmDeletePerson(selectedPerson)}><Text style={styles.actionTextRed}>{t("delete")}</Text></TouchableOpacity>
          </View>
        </View>
        <View style={{ alignItems: "center", marginBottom: 20 }}>
          <View style={[styles.personAvatar, { width: 80, height: 80, borderRadius: 40 }]}><Text style={[styles.avatarText, { fontSize: 32 }]}>{selectedPerson.name.charAt(0).toUpperCase()}</Text></View>
          <Text style={styles.detailName}>{selectedPerson.name}</Text><Text style={styles.detailRole}>{selectedPerson.role}</Text><Text style={styles.detailPhone}>{selectedPerson.phone}</Text>
        </View>
        <View style={styles.infoRow}><Text style={styles.infoLabel}>{t("hire_date")}:</Text><Text style={styles.infoValue}>{selectedPerson.hireDate || "-"}</Text></View>
        <View style={styles.infoRow}><Text style={styles.infoLabel}>{t("annual_leave_entitlement")}:</Text><Text style={styles.infoValue}>{selectedPerson.annualLeaveEntitlement ? `${selectedPerson.annualLeaveEntitlement} ${t("days")}` : "-"}</Text></View>
      </View>

      {/* YILLIK İZİN KULLANIMI ALANI */}
      <View style={styles.leaveManagementCard}>
        <Text style={styles.leaveManagementTitle}>{t("annual_leave_usage")}</Text>
        <View style={styles.leaveControlRow}>
          <Text style={styles.leaveBalanceText}>
            {selectedPerson.annualLeaveEntitlement ? `${selectedPerson.annualLeaveEntitlement} ${t("days")}` : `0 ${t("days")}`}
          </Text>
          <View style={styles.counterControls}>
            <TouchableOpacity onPress={() => handleLeaveChange(-1)} style={styles.counterBtn}>
              <Ionicons name="remove" size={20} color="#555" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t("assigned_tasks")}</Text>
        {/* Admin kontrolü kaldırıldı */}
        <TouchableOpacity onPress={openAddTask} style={styles.smallAddButton}>
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={styles.smallAddButtonText}>{t("add_task")}</Text>
        </TouchableOpacity>
      </View>

      {!selectedPerson.tasks || selectedPerson.tasks.length === 0 ? <Text style={styles.emptyText}>{t("no_tasks_assigned")}</Text> : (
        selectedPerson.tasks.map((task) => (
          <View key={task.id} style={[styles.taskCard, task.isCompleted && styles.taskCardCompleted]}>
            <TouchableOpacity onPress={() => toggleTaskCompletion(task)} style={{ marginRight: 12 }}><Ionicons name={task.isCompleted ? "checkmark-circle" : "ellipse-outline"} size={28} color={task.isCompleted ? (Colors.success ?? "#34C759") : "#ccc"} /></TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={[styles.taskTitle, task.isCompleted && styles.completedText]}>{task.title}</Text>
              {task.description ? <Text style={styles.taskDesc}>{task.description}</Text> : null}
              {task.dueDate ? <Text style={styles.taskDate}><Ionicons name="calendar-outline" size={12} /> {t("due_date")}: {task.dueDate}</Text> : null}
            </View>
            {/* Admin kontrolü kaldırıldı */}
            <TouchableOpacity onPress={() => deleteTask(task.id)} style={{ padding: 8 }}><Ionicons name="trash-outline" size={20} color={Colors.critical ?? "#FF3B30"} /></TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );

  return (
    <ImmersiveLayout title={t("personnel_management")} subtitle={selectedPerson ? t("personnel_details_tasks") : `${filteredPersonnel.length} ${t("personnel")}`} onGoBack={() => navigation.goBack()}>
      <View style={{ flex: 1, padding: 16 }}>{selectedPerson ? renderPersonnelDetail() : renderPersonnelList()}</View>

      {/* Personel Ekleme/Düzenleme Modalı */}
      <Modal visible={personnelModalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{formPerson.id ? t("edit_personnel") : t("new_personnel")}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>{t("full_name")} <Text style={{ color: 'red' }}>*</Text></Text><TextInput style={styles.input} value={formPerson.name} onChangeText={(t) => setFormPerson({ ...formPerson, name: t })} placeholder="Örn: Ahmet Yılmaz" selectTextOnFocus={Platform.OS === 'web'} />
              <Text style={styles.inputLabel}>{t("title_position")} <Text style={{ color: 'red' }}>*</Text></Text><TextInput style={styles.input} value={formPerson.role} onChangeText={(t) => setFormPerson({ ...formPerson, role: t })} placeholder="Örn: Satış Sorumlusu" selectTextOnFocus={Platform.OS === 'web'} />
              <Text style={styles.inputLabel}>{t("phone")}</Text><TextInput style={styles.input} value={formPerson.phone} onChangeText={(t) => setFormPerson({ ...formPerson, phone: t })} keyboardType="phone-pad" placeholder="0555..." selectTextOnFocus={Platform.OS === 'web'} />
              <Text style={styles.inputLabel}>{t("hire_date_format")}</Text><TextInput style={styles.input} value={formPerson.hireDate} onChangeText={(t) => setFormPerson({ ...formPerson, hireDate: t })} placeholder="Örn: 01.01.2023" selectTextOnFocus={Platform.OS === 'web'} />
              <Text style={styles.inputLabel}>{t("leave_entitlement_days")}</Text><TextInput style={styles.input} value={formPerson.annualLeaveEntitlement} onChangeText={(t) => setFormPerson({ ...formPerson, annualLeaveEntitlement: t })} keyboardType="numeric" placeholder="14" selectTextOnFocus={Platform.OS === 'web'} />
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setPersonnelModalVisible(false)}><Text style={styles.cancelBtnText}>{t("cancel")}</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={savePersonnel}><Text style={styles.saveBtnText}>{t("save")}</Text></TouchableOpacity>
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
            <Text style={styles.modalTitle}>{t("assign_new_task")}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>{t("task_title")}</Text><TextInput style={styles.input} value={formTask.title} onChangeText={(t) => setFormTask({ ...formTask, title: t })} placeholder="Örn: Aylık Rapor Hazırlığı" selectTextOnFocus={Platform.OS === 'web'} />
              <Text style={styles.inputLabel}>{t("description_optional")}</Text><TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} value={formTask.description} onChangeText={(t) => setFormTask({ ...formTask, description: t })} multiline placeholder="Görev detayları..." selectTextOnFocus={Platform.OS === 'web'} />
              <Text style={styles.inputLabel}>{t("due_date_format")}</Text><TextInput style={styles.input} value={formTask.dueDate} onChangeText={(t) => setFormTask({ ...formTask, dueDate: t })} placeholder="Örn: 15.11.2025" selectTextOnFocus={Platform.OS === 'web'} />
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setTaskModalVisible(false)}><Text style={styles.cancelBtnText}>{t("cancel")}</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={saveTask}><Text style={styles.saveBtnText}>{t("assign_task")}</Text></TouchableOpacity>
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

  // Yıllık İzin Yönetimi Stilleri
  leaveManagementCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 16, padding: 16, marginBottom: 24 },
  leaveManagementTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 12 },
  leaveControlRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  leaveBalanceText: { fontSize: 18, fontWeight: '700', color: (Colors.primary ?? "#007AFF") },
  counterControls: { flexDirection: 'row', gap: 12 },
  counterBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#ddd' },
});