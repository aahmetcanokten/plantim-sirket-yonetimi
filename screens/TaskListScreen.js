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
  Animated
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ImmersiveLayout from "../components/ImmersiveLayout";
import { Colors } from "../Theme";
import { AppContext } from "../AppContext";


export default function TaskListScreen({ navigation }) {
  const { personnel, updatePersonnel, isPremium } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState("open");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("asc"); // 'asc' or 'desc'
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

  // --- Veri Hazırlığı ---
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
    if (!searchQuery) return allFlatTasks;
    const lowerQ = searchQuery.toLowerCase();
    return allFlatTasks.filter((t) =>
      t.personName.toLowerCase().includes(lowerQ) ||
      t.title.toLowerCase().includes(lowerQ)
    );
  }, [allFlatTasks, searchQuery]);

  const stats = useMemo(() => {
    const total = tasksFilteredByPerson.length;
    const completed = tasksFilteredByPerson.filter((t) => t.isCompleted).length;
    const open = tasksFilteredByPerson.filter((t) => !t.isCompleted).length;
    let overdue = 0;
    tasksFilteredByPerson.forEach(t => { if (!t.isCompleted && isOverdue(t.dueDate)) overdue++; });
    return { total, completed, open, overdue };
  }, [tasksFilteredByPerson]);

  const tasksToShow = useMemo(() => {
    let list = activeTab === "open"
      ? tasksFilteredByPerson.filter((t) => !t.isCompleted)
      : tasksFilteredByPerson.filter((t) => t.isCompleted);

    if (activeTab === "completed" && dateFilter !== "ALL") {
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      list = list.filter(t => {
        if (!t.completedDate) return false;
        const cDate = new Date(t.completedDate);
        cDate.setHours(0, 0, 0, 0);

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
      return sortOrder === 'asc'
        ? dateA.localeCompare(dateB)
        : dateB.localeCompare(dateA);
    });
  }, [tasksFilteredByPerson, activeTab, dateFilter, sortOrder]);

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

  // --- İşlemler ---
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
        assignedPersonId: null,
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
    if (task.isCompleted) {
      // Zaten tamamlanmışsa geri al
      Alert.alert("Görevi Geri Al", "Bu görevi tekrar 'Yapılacaklar' listesine almak istiyor musunuz?", [
        { text: "Hayır", style: "cancel" },
        { text: "Evet", onPress: () => updateStatus(task, false) }
      ]);
    } else {
      // Tamamlanmamışsa onayla
      Alert.alert("Görevi Tamamla", "Bu görevi tamamlandı olarak işaretlemek istiyor musunuz?", [
        { text: "Vazgeç", style: "cancel" },
        { text: "Evet, Tamamla", onPress: () => updateStatus(task, true) }
      ]);
    }
  };

  const updateStatus = (task, isCompleted) => {
    const pIndex = personnel.findIndex((p) => p.id === task.personId);
    if (pIndex === -1) return;
    const person = personnel[pIndex];

    const updatedTasks = person.tasks.map((t) =>
      t.id === task.id ? {
        ...t,
        isCompleted: isCompleted,
        completedDate: isCompleted ? new Date().toISOString() : null
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

  // --- Render Components ---

  const renderSearchAndSort = () => (
    <View style={styles.searchSortContainer}>
      <View style={styles.searchInputWrapper}>
        <Ionicons name="search-outline" size={18} color={Colors.secondary} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Personel veya görev ara..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={Colors.secondary}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={18} color={Colors.secondary} />
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={styles.sortButton}
        onPress={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
      >
        <Ionicons name={sortOrder === 'asc' ? "arrow-up" : "arrow-down"} size={16} color={Colors.textPrimary} />
        <Text style={styles.sortButtonText}>Tarih</Text>
      </TouchableOpacity>
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
    const statusColor = item.isCompleted ? Colors.success : (overdue ? Colors.critical : Colors.primary);

    return (
      <TouchableOpacity
        style={[styles.taskCard, item.isCompleted && styles.taskCardCompleted]}
        onPress={() => showTaskOptions(item)}
        activeOpacity={0.9}
      >
        {/* Sol Şerit */}
        <View style={[styles.statusStrip, { backgroundColor: statusColor }]} />

        <View style={styles.taskContent}>
          <View style={styles.taskHeader}>
            <Text style={[styles.taskTitle, item.isCompleted && styles.completedText]} numberOfLines={2}>
              {item.title}
            </Text>

            {/* Büyük ve Belirgin Tamamlama Butonu */}
            <TouchableOpacity onPress={() => toggleTaskStatus(item)} style={styles.checkboxContainer}>
              <Ionicons
                name={item.isCompleted ? "checkmark-circle" : "ellipse-outline"}
                size={32}
                color={item.isCompleted ? Colors.success : "#E5E7EB"}
              />
            </TouchableOpacity>
          </View>

          {item.description ? (
            <Text style={styles.taskDesc} numberOfLines={2}>{item.description}</Text>
          ) : null}

          <View style={styles.taskFooter}>
            <View style={styles.footerItem}>
              <View style={[styles.avatarSmall, { backgroundColor: '#F3F4F6' }]}>
                <Text style={styles.avatarTextSmall}>{item.personName.charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={styles.footerText}>{item.personName.split(' ')[0]}</Text>
            </View>

            <View style={styles.footerItem}>
              <Ionicons name="calendar-outline" size={14} color={overdue ? Colors.critical : "#9CA3AF"} style={{ marginRight: 4 }} />
              <Text style={[styles.footerText, overdue && { color: Colors.critical, fontWeight: '700' }]}>
                {item.dueDate || "Tarih yok"}
              </Text>
            </View>

            {overdue && (
              <View style={styles.overdueBadge}>
                <Text style={styles.overdueText}>GECİKTİ</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ImmersiveLayout title="Görev Yönetimi" subtitle="Ekip performansı ve takibi" onGoBack={() => navigation.goBack()}>
      <View style={styles.container}>
        {renderSearchAndSort()}

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <View style={[styles.statIconContainer, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="alert-circle-outline" size={20} color={Colors.primary} />
            </View>
            <View>
              <Text style={styles.statValue}>{stats.open}</Text>
              <Text style={styles.statLabel}>Açık</Text>
            </View>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <View style={[styles.statIconContainer, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="time-outline" size={20} color={Colors.critical} />
            </View>
            <View>
              <Text style={[styles.statValue, { color: Colors.critical }]}>{stats.overdue}</Text>
              <Text style={styles.statLabel}>Geciken</Text>
            </View>
          </View>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity style={[styles.tabButton, activeTab === "open" && styles.activeTab]} onPress={() => setActiveTab("open")}>
            <Text style={[styles.tabText, activeTab === "open" && styles.activeTabText]}>Yapılacaklar</Text>
            {stats.open > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{stats.open}</Text></View>}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabButton, activeTab === "completed" && styles.activeTab]} onPress={() => setActiveTab("completed")}>
            <Text style={[styles.tabText, activeTab === "completed" && styles.activeTabText]}>Tamamlanan</Text>
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
              <View style={styles.emptyIconBg}>
                <Ionicons name="clipboard-outline" size={48} color="#9CA3AF" />
              </View>
              <Text style={styles.emptyTitle}>Görev Bulunamadı</Text>
              <Text style={styles.emptyText}>
                {activeTab === "completed"
                  ? "Henüz tamamlanan bir görev yok."
                  : "Harika! Yapılacak iş kalmadı."}
              </Text>
            </View>
          }
        />

        <TouchableOpacity style={styles.fab} onPress={() => openTaskModal()} activeOpacity={0.8}>
          <Ionicons name="add" size={32} color="#fff" />
        </TouchableOpacity>

        <Modal visible={taskModalVisible} animationType="slide" transparent={true} onRequestClose={() => setTaskModalVisible(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editingTask ? "Görevi Düzenle" : "Yeni Görev"}</Text>
                <TouchableOpacity onPress={() => setTaskModalVisible(false)} style={styles.closeModalButton}>
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.inputLabel}>Personel Seçimi</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                  {personnel.map((p) => (
                    <TouchableOpacity key={p.id} style={[styles.personSelectChip, taskForm.assignedPersonId === p.id && styles.personSelectChipActive]}
                      onPress={() => setTaskForm({ ...taskForm, assignedPersonId: p.id })}>
                      <View style={[styles.personSelectAvatar, taskForm.assignedPersonId === p.id && { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
                        <Text style={{ color: taskForm.assignedPersonId === p.id ? '#fff' : Colors.primary, fontWeight: '700' }}>{p.name.charAt(0).toUpperCase()}</Text>
                      </View>
                      <Text style={[styles.personSelectName, taskForm.assignedPersonId === p.id && { color: '#fff', fontWeight: '700' }]}>{p.name.split(" ")[0]}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.inputLabel}>Görev Başlığı</Text>
                <TextInput
                  style={styles.input}
                  value={taskForm.title}
                  onChangeText={(t) => setTaskForm({ ...taskForm, title: t })}
                  placeholder="Örn: Müşteri araması yapılacak"
                  placeholderTextColor="#9CA3AF"
                />

                <Text style={styles.inputLabel}>Açıklama (İsteğe Bağlı)</Text>
                <TextInput
                  style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                  value={taskForm.description}
                  onChangeText={(t) => setTaskForm({ ...taskForm, description: t })}
                  multiline
                  placeholder="Detayları buraya ekleyin..."
                  placeholderTextColor="#9CA3AF"
                />

                <Text style={styles.inputLabel}>Son Tarih (GG.AA.YYYY)</Text>
                <TextInput
                  style={styles.input}
                  value={taskForm.dueDate}
                  onChangeText={(t) => setTaskForm({ ...taskForm, dueDate: t })}
                  placeholder="Örn: 25.12.2025"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numbers-and-punctuation"
                />

                <TouchableOpacity style={styles.saveButton} onPress={handleSaveTask}>
                  <Text style={styles.saveButtonText}>{editingTask ? "Değişiklikleri Kaydet" : "Görevi Oluştur"}</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View >

      {/* REKLAM ALANI */}

    </ImmersiveLayout >
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 16 },

  // Filter & Search
  searchSortContainer: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 16, gap: 10 },
  searchInputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: '#E5E7EB' },
  searchInput: { flex: 1, height: '100%', fontSize: 14, color: Colors.textPrimary },
  sortButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 16, borderRadius: 12, height: 44, borderWidth: 1, borderColor: '#E5E7EB', gap: 6 },
  sortButtonText: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },

  // Stats Row
  statsRow: { flexDirection: "row", backgroundColor: "#fff", marginHorizontal: 16, marginBottom: 20, borderRadius: 16, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, justifyContent: 'space-around', alignItems: 'center' },
  statItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minWidth: 100 },
  statIconContainer: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  statValue: { fontSize: 20, fontWeight: "800", color: "#1F2937" },
  statLabel: { fontSize: 12, color: "#6B7280", fontWeight: "600" },
  statDivider: { width: 1, height: 40, backgroundColor: '#F3F4F6' },

  // Tabs
  tabContainer: { flexDirection: "row", backgroundColor: "#F3F4F6", marginHorizontal: 16, marginBottom: 16, borderRadius: 12, padding: 4 },
  tabButton: { flex: 1, flexDirection: 'row', paddingVertical: 10, alignItems: "center", justifyContent: 'center', borderRadius: 10 },
  activeTab: { backgroundColor: "#fff", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 },
  tabText: { fontWeight: "600", color: "#6B7280", fontSize: 14 },
  activeTabText: { color: "#1F2937", fontWeight: "700" },
  badge: { backgroundColor: Colors.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, marginLeft: 6 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  // Date Filter
  dateFilterContainer: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 16, gap: 8 },
  dateFilterChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB' },
  dateFilterChipActive: { backgroundColor: '#EFF6FF', borderColor: Colors.primary },
  dateFilterText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  dateFilterTextActive: { color: Colors.primary },

  // Task Card
  taskCard: { backgroundColor: "#fff", flexDirection: "row", borderRadius: 12, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, overflow: 'hidden' },
  taskCardCompleted: { opacity: 0.6 },
  statusStrip: { width: 4, height: '100%' },
  taskContent: { flex: 1, padding: 10, paddingVertical: 12 }, // Reduced padding
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  taskTitle: { fontSize: 15, fontWeight: "700", color: "#1F2937", flex: 1, marginRight: 8, lineHeight: 20 },
  completedText: { textDecorationLine: "line-through", color: "#9CA3AF" },
  checkboxContainer: { padding: 0 },
  taskDesc: { fontSize: 12, color: "#6B7280", marginBottom: 8, lineHeight: 16 },
  taskFooter: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 8, marginTop: 4 },
  footerItem: { flexDirection: 'row', alignItems: 'center', marginRight: 12 },
  avatarSmall: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  avatarTextSmall: { fontSize: 9, fontWeight: '700', color: '#6B7280' },
  footerText: { fontSize: 12, color: "#6B7280", fontWeight: "500" },
  overdueBadge: { backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 'auto' },
  overdueText: { color: Colors.critical, fontSize: 10, fontWeight: "800" },

  // Empty State
  emptyContainer: { alignItems: "center", justifyContent: "center", marginTop: 60 },
  emptyIconBg: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginBottom: 8 },
  emptyText: { color: "#9CA3AF", fontSize: 14, textAlign: 'center', maxWidth: 250 },

  // FAB
  // FAB
  fab: { position: 'absolute', right: 20, bottom: 30, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.iosBlue || "#007AFF", alignItems: 'center', justifyContent: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },

  // Modal
  modalContainer: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  modalContent: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "90%" },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#1F2937" },
  closeModalButton: { padding: 4 },
  inputLabel: { fontSize: 13, fontWeight: "700", color: "#374151", marginBottom: 8, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: "#F9FAFB", padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", fontSize: 16, color: "#1F2937" },
  saveButton: { backgroundColor: Colors.primary, padding: 16, borderRadius: 14, alignItems: "center", marginTop: 32, marginBottom: 20, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  saveButtonText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  personSelectChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 24, marginRight: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  personSelectChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  personSelectAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  personSelectName: { fontWeight: "600", color: "#4B5563" },
});