import React, { useContext, useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActionSheetIOS,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ImmersiveLayout from "../components/ImmersiveLayout";
import { Colors } from "../Theme";
import { AppContext } from "../AppContext";

export default function TaskListScreen({ navigation }) {
  const { personnel, updatePersonnel } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState("open");
  const [filterPersonId, setFilterPersonId] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("ALL");
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const [taskForm, setTaskForm] = useState({
    id: null,
    title: "",
    description: "",
    dueDate: "",
    assignedPersonId: null,
  });

  const allFlatTasks = useMemo(() => {
    let tasks = [];
    if (personnel && Array.isArray(personnel)) {
      personnel.forEach((p) => {
        if (p.tasks && Array.isArray(p.tasks)) {
          p.tasks.forEach((t) => {
            tasks.push({
              ...t,
              personId: p.id,
              personName: p.name,
            });
          });
        }
      });
    }
    return tasks;
  }, [personnel]);

  const tasksFilteredByPerson = useMemo(() => {
    if (filterPersonId === "ALL") return allFlatTasks;
    return allFlatTasks.filter((t) => t.personId === filterPersonId);
  }, [allFlatTasks, filterPersonId]);

  const stats = useMemo(() => {
    const total = tasksFilteredByPerson.length;
    const completed = tasksFilteredByPerson.filter((t) => t.isCompleted).length;
    const open = tasksFilteredByPerson.filter((t) => !t.isCompleted).length;
    let overdue = 0;
    tasksFilteredByPerson.forEach(t => { if (!t.isCompleted && isOverdue(t.dueDate)) overdue++; });
    const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, completed, open, overdue, completionRate };
  }, [tasksFilteredByPerson]);

  const tasksToShow = useMemo(() => {
    let list = activeTab === "open" 
      ? tasksFilteredByPerson.filter((t) => !t.isCompleted)
      : tasksFilteredByPerson.filter((t) => t.isCompleted);

    if (activeTab === "completed" && dateFilter !== "ALL") {
        const now = new Date();
        now.setHours(0,0,0,0);

        list = list.filter(t => {
            if (!t.completedDate) return false;
            const cDate = new Date(t.completedDate);
            cDate.setHours(0,0,0,0);
            
            if (dateFilter === 'TODAY') {
                return cDate.getTime() === now.getTime();
            } else if (dateFilter === 'WEEK') {
                const weekAgo = new Date(now);
                weekAgo.setDate(now.getDate() - 7);
                return cDate >= weekAgo && cDate <= now;
            } else if (dateFilter === 'MONTH') {
                const monthAgo = new Date(now);
                monthAgo.setMonth(now.getMonth() - 1);
                return cDate >= monthAgo && cDate <= now;
            }
            return true;
        });
    }

    return list.sort((a, b) => {
        const dateA = a.dueDate ? a.dueDate.split('.').reverse().join('') : '99999999';
        const dateB = b.dueDate ? b.dueDate.split('.').reverse().join('') : '99999999';
        return dateA.localeCompare(dateB);
    });
  }, [tasksFilteredByPerson, activeTab, dateFilter]);

  function isOverdue(dueDateStr) {
    if (!dueDateStr) return false;
    try {
      const parts = dueDateStr.split(".");
      if (parts.length !== 3) return false;
      const due = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      return due < today;
    } catch (e) { return false; }
  }

  const openTaskModal = (task = null) => {
    if (task) {
      setEditingTask(task);
      setTaskForm({
        id: task.id,
        title: task.title,
        description: task.description,
        dueDate: task.dueDate,
        assignedPersonId: task.personId,
      });
    } else {
      setEditingTask(null);
      setTaskForm({
        id: null,
        title: "",
        description: "",
        dueDate: "",
        assignedPersonId: filterPersonId !== "ALL" ? filterPersonId : null,
      });
    }
    setTaskModalVisible(true);
  };

  const handleSaveTask = () => {
    if (!taskForm.assignedPersonId) { Alert.alert("Hata", "Personel seçimi zorunludur."); return; }
    if (!taskForm.title.trim()) { Alert.alert("Hata", "Görev başlığı zorunludur."); return; }

    if (editingTask && editingTask.personId !== taskForm.assignedPersonId) {
        deleteTaskConfirm(editingTask, true);
    }

    const targetPersonIndex = personnel.findIndex(p => p.id === taskForm.assignedPersonId);
    if (targetPersonIndex === -1) return;
    const targetPerson = personnel[targetPersonIndex];

    let updatedTasks = [...(targetPerson.tasks || [])];

    if (editingTask && editingTask.personId === taskForm.assignedPersonId) {
        updatedTasks = updatedTasks.map(t => t.id === editingTask.id ? { ...t, ...taskForm } : t);
    } else {
        updatedTasks.push({
            id: taskForm.id || Date.now().toString(),
            title: taskForm.title.trim(),
            description: taskForm.description.trim(),
            dueDate: taskForm.dueDate.trim(),
            isCompleted: false,
        });
    }

    updatePersonnel({ ...targetPerson, tasks: updatedTasks });
    setTaskModalVisible(false);
  };

  const deleteTaskConfirm = (task, skipAlert = false) => {
    const doDelete = () => {
        const pIndex = personnel.findIndex(p => p.id === task.personId);
        if (pIndex === -1) return;
        const person = personnel[pIndex];
        const updatedTasks = person.tasks.filter(t => t.id !== task.id);
        updatePersonnel({ ...person, tasks: updatedTasks });
    };

    if (skipAlert) {
        doDelete();
    } else {
        Alert.alert("Görevi Sil", "Bu görev kalıcı olarak silinecek. Emin misiniz?", [
            { text: "Vazgeç", style: "cancel" },
            { text: "Sil", style: "destructive", onPress: doDelete }
        ]);
    }
  };

  const toggleTaskStatus = (task) => {
    const pIndex = personnel.findIndex((p) => p.id === task.personId);
    if (pIndex === -1) return;
    const person = personnel[pIndex];
    const isNowCompleted = !task.isCompleted;
    
    const updatedTasks = person.tasks.map((t) =>
      t.id === task.id ? { 
          ...t, 
          isCompleted: isNowCompleted,
          completedDate: isNowCompleted ? new Date().toISOString() : null
      } : t
    );
    updatePersonnel({ ...person, tasks: updatedTasks });
  };

  const showTaskOptions = (task) => {
      if (Platform.OS === 'ios') {
          ActionSheetIOS.showActionSheetWithOptions(
            {
              options: ['Vazgeç', 'Düzenle', 'Sil'],
              destructiveButtonIndex: 2,
              cancelButtonIndex: 0,
              title: 'Görev Seçenekleri'
            },
            (buttonIndex) => {
              if (buttonIndex === 1) openTaskModal(task);
              if (buttonIndex === 2) deleteTaskConfirm(task);
            }
          );
      } else {
          Alert.alert('Görev Seçenekleri', null, [
              { text: 'Düzenle', onPress: () => openTaskModal(task) },
              { text: 'Sil', onPress: () => deleteTaskConfirm(task), style: 'destructive' },
              { text: 'Vazgeç', style: 'cancel' }
          ], { cancelable: true });
      }
  };

  const renderFilterBar = () => (
    <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12 }}>
            <TouchableOpacity style={[styles.filterChip, filterPersonId === "ALL" && styles.filterChipActive]} onPress={() => setFilterPersonId("ALL")}>
            <Text style={[styles.filterChipText, filterPersonId === "ALL" && styles.filterChipTextActive]}>Tümü</Text>
            </TouchableOpacity>
            {personnel.map((p) => (
            <TouchableOpacity key={p.id} style={[styles.filterChip, filterPersonId === p.id && styles.filterChipActive]} onPress={() => setFilterPersonId(p.id)}>
                <Text style={[styles.filterChipText, filterPersonId === p.id && styles.filterChipTextActive]}>{p.name.split(" ")[0]}</Text>
            </TouchableOpacity>
            ))}
        </ScrollView>
    </View>
  );

  const renderDateFilterBar = () => {
      if (activeTab !== 'completed') return null;
      return (
        <View style={styles.dateFilterContainer}>
            {['ALL', 'TODAY', 'WEEK', 'MONTH'].map((filter) => (
                <TouchableOpacity 
                    key={filter} 
                    style={[styles.dateFilterChip, dateFilter === filter && styles.dateFilterChipActive]}
                    onPress={() => setDateFilter(filter)}
                >
                    <Text style={[styles.dateFilterText, dateFilter === filter && styles.dateFilterTextActive]}>
                        {filter === 'ALL' ? 'Tümü' : filter === 'TODAY' ? 'Bugün' : filter === 'WEEK' ? 'Bu Hafta' : 'Bu Ay'}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
      )
  }

  const renderTaskItem = ({ item }) => {
    const overdue = !item.isCompleted && isOverdue(item.dueDate);
    return (
      <View style={[styles.taskCard, item.isCompleted && styles.taskCardCompleted]}>
        <View style={[styles.statusIndicator, { backgroundColor: item.isCompleted ? (Colors.success ?? "#34C759") : overdue ? (Colors.critical ?? "#FF3B30") : (Colors.primary ?? "#007AFF") }]} />
        
        <TouchableOpacity onPress={() => toggleTaskStatus(item)} style={styles.checkButton}>
          <Ionicons name={item.isCompleted ? "checkmark-circle" : "ellipse-outline"} size={28} color={item.isCompleted ? (Colors.success ?? "#34C759") : "#ccc"} />
        </TouchableOpacity>

        <TouchableOpacity style={{ flex: 1, paddingVertical: 4 }} onPress={() => showTaskOptions(item)} onLongPress={() => showTaskOptions(item)}>
           <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
               <Text style={[styles.taskTitle, item.isCompleted && styles.completedText]}>{item.title}</Text>
               {overdue && <View style={styles.overdueBadge}><Text style={styles.overdueText}>GECİKTİ</Text></View>}
           </View>
           
           {filterPersonId === "ALL" && (
               <View style={styles.assignedToBadge}>
                   <Ionicons name="person-circle-outline" size={14} color="#555" />
                   <Text style={styles.assignedToText}>{item.personName}</Text>
               </View>
           )}

           {item.description ? <Text style={styles.taskDesc} numberOfLines={2}>{item.description}</Text> : null}
           <View style={styles.dateContainer}>
             <Ionicons name="calendar-outline" size={14} color={overdue ? (Colors.critical ?? "#FF3B30") : "#999"} />
             <Text style={[styles.taskDate, overdue && { color: (Colors.critical ?? "#FF3B30"), fontWeight: "700" }]}>
               {item.isCompleted && item.completedDate 
                  ? `Tamamlandı: ${new Date(item.completedDate).toLocaleDateString('tr-TR')}`
                  : (item.dueDate || "Tarih yok")}
             </Text>
           </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.optionsButton} onPress={() => showTaskOptions(item)}>
            <Ionicons name="ellipsis-vertical" size={20} color="#999" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ImmersiveLayout title="Görev Yönetimi" subtitle="Performans ve takip" onGoBack={() => navigation.goBack()}>
      <View style={styles.container}>
        {renderFilterBar()}
        
        <View style={styles.statsContainer}>
            <View style={[styles.statCard, { backgroundColor: (Colors.primaryLight ?? "#E3F2FD") }]}>
                <Text style={[styles.statNumber, { color: (Colors.primary ?? "#007AFF") }]}>{stats.open}</Text>
                <Text style={styles.statLabel}>Açık</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: "#FFECEC" }]}>
                <Text style={[styles.statNumber, { color: (Colors.critical ?? "#FF3B30") }]}>{stats.overdue}</Text>
                <Text style={styles.statLabel}>Geciken</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: "#E8F5E9" }]}>
                <Text style={[styles.statNumber, { color: (Colors.success ?? "#34C759") }]}>%{stats.completionRate}</Text>
                <Text style={styles.statLabel}>Başarı</Text>
            </View>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity style={[styles.tabButton, activeTab === "open" && styles.activeTab]} onPress={() => setActiveTab("open")}>
            <Text style={[styles.tabText, activeTab === "open" && styles.activeTabText]}>Yapılacaklar ({stats.open})</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabButton, activeTab === "completed" && styles.activeTab]} onPress={() => setActiveTab("completed")}>
            <Text style={[styles.tabText, activeTab === "completed" && styles.activeTabText]}>Tamamlanan ({stats.completed})</Text>
          </TouchableOpacity>
        </View>

        {renderDateFilterBar()}

        <FlatList
          data={tasksToShow}
          keyExtractor={(item) => item.id + item.personId}
          renderItem={renderTaskItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="clipboard-outline" size={64} color="#eee" />
              <Text style={styles.emptyText}>
                  {activeTab === "completed" && dateFilter !== "ALL" 
                    ? "Bu tarih aralığında tamamlanan görev yok." 
                    : "Görüntülenecek görev bulunmuyor."}
              </Text>
            </View>
          }
        />

        <TouchableOpacity style={styles.fab} onPress={() => openTaskModal()}>
            <Ionicons name="add" size={30} color="#fff" />
        </TouchableOpacity>

        <Modal visible={taskModalVisible} animationType="slide" transparent={true} onRequestClose={() => setTaskModalVisible(false)}>
             <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{editingTask ? "Görevi Düzenle" : "Yeni Görev Ata"}</Text>
                        <TouchableOpacity onPress={() => setTaskModalVisible(false)}>
                            <Ionicons name="close-circle" size={28} color="#ccc" />
                        </TouchableOpacity>
                    </View>
                    <ScrollView>
                        <Text style={styles.inputLabel}>Personel:</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 16}}>
                            {personnel.map((p) => (
                                <TouchableOpacity key={p.id} style={[styles.personSelectChip, taskForm.assignedPersonId === p.id && styles.personSelectChipActive]}
                                    onPress={() => setTaskForm({...taskForm, assignedPersonId: p.id})}>
                                    <View style={styles.personSelectAvatar}>
                                        <Text style={{color: taskForm.assignedPersonId === p.id ? '#fff' : (Colors.primary ?? "#007AFF"), fontWeight:'700'}}>{p.name.charAt(0).toUpperCase()}</Text>
                                    </View>
                                    <Text style={[styles.personSelectName, taskForm.assignedPersonId === p.id && {color:'#fff', fontWeight:'700'}]}>{p.name.split(" ")[0]}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <Text style={styles.inputLabel}>Başlık</Text>
                        <TextInput style={styles.input} value={taskForm.title} onChangeText={(t) => setTaskForm({ ...taskForm, title: t })} placeholder="Örn: Müşteri araması" />
                        <Text style={styles.inputLabel}>Açıklama</Text>
                        <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} value={taskForm.description} onChangeText={(t) => setTaskForm({ ...taskForm, description: t })} multiline placeholder="Detaylar..." />
                        <Text style={styles.inputLabel}>Son Tarih (GG.AA.YYYY)</Text>
                        <TextInput style={styles.input} value={taskForm.dueDate} onChangeText={(t) => setTaskForm({ ...taskForm, dueDate: t })} placeholder="Örn: 25.12.2025" />
                        <TouchableOpacity style={styles.saveButton} onPress={handleSaveTask}>
                            <Text style={styles.saveButtonText}>{editingTask ? "Güncelle" : "Görevi Ata"}</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
             </KeyboardAvoidingView>
        </Modal>
      </View>
    </ImmersiveLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 16 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#fff", borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: "#eee" },
  filterChipActive: { backgroundColor: (Colors.primary ?? "#007AFF"), borderColor: (Colors.primary ?? "#007AFF") },
  filterChipText: { color: "#666", fontWeight: "600" },
  filterChipTextActive: { color: "#fff" },
  statsContainer: { flexDirection: "row", paddingHorizontal: 16, marginBottom: 16, justifyContent: 'space-between' },
  statCard: { flex: 1, backgroundColor: "#fff", padding: 12, borderRadius: 16, alignItems: "center", marginHorizontal: 4, shadowColor: "#000", shadowOffset: {width:0,height:1}, shadowOpacity:0.05, shadowRadius: 2, elevation: 1 },
  statNumber: { fontSize: 20, fontWeight: "800", marginBottom: 4 },
  statLabel: { fontSize: 12, color: "#666", fontWeight: "600" },
  tabContainer: { flexDirection: "row", backgroundColor: "#fff", marginHorizontal: 16, marginBottom: 12, borderRadius: 12, padding: 4, shadowColor: "#000", shadowOffset: {width:0, height:1}, shadowOpacity:0.05, shadowRadius: 3, elevation: 1 },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 10 },
  activeTab: { backgroundColor: (Colors.primaryLight ?? "#E3F2FD") },
  tabText: { fontWeight: "600", color: "#999" },
  activeTabText: { color: (Colors.primary ?? "#007AFF"), fontWeight: "800" },
  dateFilterContainer: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 12, justifyContent: 'space-around' },
  dateFilterChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: '#f0f0f0' },
  dateFilterChipActive: { backgroundColor: (Colors.primary ?? "#007AFF") },
  dateFilterText: { fontSize: 12, color: '#666', fontWeight: '600' },
  dateFilterTextActive: { color: '#fff' },
  taskCard: { backgroundColor: "#fff", flexDirection: "row", padding: 12, borderRadius: 16, marginBottom: 12, marginHorizontal: 16, shadowColor: "#000", shadowOffset: {width:0, height:2}, shadowOpacity:0.05, shadowRadius: 8, elevation: 2, alignItems: 'flex-start', overflow: 'hidden' },
  taskCardCompleted: { opacity: 0.7, backgroundColor: "#f9f9f9" },
  statusIndicator: { width: 4, position: 'absolute', left: 0, top: 0, bottom: 0 },
  checkButton: { padding: 8, marginLeft: 6, marginRight: 6, alignSelf: 'center' },
  optionsButton: { padding: 8, alignSelf: 'center' },
  taskTitle: { fontSize: 16, fontWeight: "700", color: "#333", flex: 1, flexWrap: 'wrap' },
  completedText: { textDecorationLine: "line-through", color: "#999" },
  assignedToBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f0f0', alignSelf: 'flex-start', paddingVertical: 2, paddingHorizontal: 8, borderRadius: 10, marginTop: 6, marginBottom: 2 },
  assignedToText: { fontSize: 12, color: "#555", marginLeft: 4, fontWeight: "500" },
  taskDesc: { fontSize: 14, color: "#666", marginTop: 4 },
  dateContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  taskDate: { fontSize: 12, color: "#999", marginLeft: 6, fontWeight: "600" },
  overdueBadge: { backgroundColor: (Colors.critical ?? "#FF3B30"), paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 8, justifyContent: 'center' },
  overdueText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  emptyContainer: { alignItems: "center", justifyContent: "center", marginTop: 40, opacity: 0.5 },
  emptyText: { color: "#666", fontSize: 16, marginTop: 16, fontWeight: "600", textAlign: 'center' },
  fab: { position: 'absolute', right: 20, bottom: 30, width: 56, height: 56, borderRadius: 28, backgroundColor: (Colors.primary ?? "#007AFF"), alignItems: 'center', justifyContent: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  modalContainer: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  modalContent: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "85%" },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: "800", color: "#333" },
  inputLabel: { fontSize: 14, fontWeight: "600", color: "#666", marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: "#f9f9f9", padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "#eee", fontSize: 16, color: "#333" },
  saveButton: { backgroundColor: (Colors.primary ?? "#007AFF"), padding: 16, borderRadius: 14, alignItems: "center", marginTop: 30, marginBottom: 20 },
  saveButtonText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  personSelectChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 25, marginRight: 10, borderWidth: 1, borderColor: '#eee' },
  personSelectChipActive: { backgroundColor: (Colors.primary ?? "#007AFF"), borderColor: (Colors.primary ?? "#007AFF") },
  personSelectAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  personSelectName: { fontWeight: "600", color: "#555" },
});