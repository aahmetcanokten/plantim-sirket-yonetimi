import React, { useContext, useState, useMemo } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView,
  Modal, TextInput, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ImmersiveLayout from "../components/ImmersiveLayout";
import { Colors } from "../Theme";
import { AppContext } from "../AppContext";
import { useTranslation } from "react-i18next";

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const CATEGORIES = ["GENERAL", "SALES", "PRODUCTION", "ADMIN", "TECHNICAL"];
const PRIORITY_COLORS = { LOW: "#22c55e", MEDIUM: "#f59e0b", HIGH: "#ef4444", CRITICAL: "#7c3aed" };
const CATEGORY_ICONS = { GENERAL: "list-outline", SALES: "cash-outline", PRODUCTION: "hammer-outline", ADMIN: "briefcase-outline", TECHNICAL: "construct-outline" };

const EMPTY_TASK_FORM = {
  id: null, title: "", description: "", dueDate: "", startDate: "",
  assignedPersonId: null, priority: "MEDIUM", category: "GENERAL",
  estimatedHours: "", actualHours: "", progress: 0, tags: "",
};

export default function TaskListScreen({ navigation }) {
  const { personnel, updatePersonnel, isPremium } = useContext(AppContext);
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState("open");
  const [viewMode, setViewMode] = useState(Platform.OS === 'web' ? "kanban" : "list");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [dateFilter, setDateFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [personFilter, setPersonFilter] = useState("ALL");

  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [detailTask, setDetailTask] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [taskForm, setTaskForm] = useState(EMPTY_TASK_FORM);

  // --- Helpers ---
  const priorityLabel = (v) => t({ LOW: "priority_low", MEDIUM: "priority_medium", HIGH: "priority_high", CRITICAL: "priority_critical" }[v] || "priority_medium");
  const catLabel = (v) => t({ GENERAL: "cat_general", SALES: "cat_sales", PRODUCTION: "cat_production", ADMIN: "cat_admin", TECHNICAL: "cat_technical" }[v] || "cat_general");

  function isOverdue(dueDateStr) {
    if (!dueDateStr) return false;
    try {
      const parts = dueDateStr.split(".");
      if (parts.length !== 3) return false;
      const due = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      return due < today;
    } catch { return false; }
  }

  function isDueToday(dueDateStr) {
    if (!dueDateStr) return false;
    try {
      const parts = dueDateStr.split(".");
      if (parts.length !== 3) return false;
      const due = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const dueNorm = new Date(due); dueNorm.setHours(0, 0, 0, 0);
      return due.getTime() === today.getTime();
    } catch { return false; }
  }

  // --- Data ---
  const allFlatTasks = useMemo(() => {
    let tasks = [];
    if (personnel && Array.isArray(personnel)) {
      personnel.forEach(p => {
        if (p.tasks && Array.isArray(p.tasks)) {
          p.tasks.forEach(task => tasks.push({ ...task, personId: p.id, personName: p.name, personRole: p.role }));
        }
      });
    }
    return tasks;
  }, [personnel]);

  const filteredTasks = useMemo(() => {
    let list = [...allFlatTasks];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t => t.personName.toLowerCase().includes(q) || t.title.toLowerCase().includes(q));
    }
    if (personFilter !== "ALL") list = list.filter(t => t.personId === personFilter);
    if (priorityFilter !== "ALL") list = list.filter(t => (t.priority || "MEDIUM") === priorityFilter);
    if (categoryFilter !== "ALL") list = list.filter(t => (t.category || "GENERAL") === categoryFilter);
    return list;
  }, [allFlatTasks, searchQuery, personFilter, priorityFilter, categoryFilter]);

  const stats = useMemo(() => {
    const total = filteredTasks.length;
    const completed = filteredTasks.filter(t => t.isCompleted).length;
    const open = filteredTasks.filter(t => !t.isCompleted).length;
    const overdue = filteredTasks.filter(t => !t.isCompleted && isOverdue(t.dueDate)).length;
    const todayDue = filteredTasks.filter(t => !t.isCompleted && isDueToday(t.dueDate)).length;
    const criticalOpen = filteredTasks.filter(t => !t.isCompleted && t.priority === "CRITICAL").length;
    return { total, completed, open, overdue, todayDue, criticalOpen };
  }, [filteredTasks]);

  const tasksToShow = useMemo(() => {
    let list = activeTab === "open"
      ? filteredTasks.filter(t => !t.isCompleted)
      : filteredTasks.filter(t => t.isCompleted);

    if (activeTab === "completed" && dateFilter !== "ALL") {
      const now = new Date(); now.setHours(0, 0, 0, 0);
      list = list.filter(t => {
        if (!t.completedDate) return false;
        const cDate = new Date(t.completedDate); cDate.setHours(0, 0, 0, 0);
        if (dateFilter === "TODAY") return cDate.getTime() === now.getTime();
        if (dateFilter === "WEEK") { const w = new Date(now); w.setDate(now.getDate() - 7); return cDate >= w && cDate <= now; }
        if (dateFilter === "MONTH") { const m = new Date(now); m.setMonth(now.getMonth() - 1); return cDate >= m && cDate <= now; }
        return true;
      });
    }
    return list.sort((a, b) => {
      const dA = a.dueDate ? a.dueDate.split(".").reverse().join("") : "99999999";
      const dB = b.dueDate ? b.dueDate.split(".").reverse().join("") : "99999999";
      return sortOrder === "asc" ? dA.localeCompare(dB) : dB.localeCompare(dA);
    });
  }, [filteredTasks, activeTab, dateFilter, sortOrder]);

  // Kanban columns
  const kanbanColumns = useMemo(() => ({
    todo: allFlatTasks.filter(t => !t.isCompleted && (!t.progress || t.progress === 0)),
    inprogress: allFlatTasks.filter(t => !t.isCompleted && t.progress > 0 && t.progress < 100),
    done: allFlatTasks.filter(t => t.isCompleted),
  }), [allFlatTasks]);

  // --- Actions ---
  const openTaskModal = (task = null) => {
    if (task) {
      setEditingTask(task);
      setTaskForm({ id: task.id, title: task.title, description: task.description, dueDate: task.dueDate, startDate: task.startDate || "", assignedPersonId: task.personId, priority: task.priority || "MEDIUM", category: task.category || "GENERAL", estimatedHours: task.estimatedHours?.toString() || "", actualHours: task.actualHours?.toString() || "", progress: task.progress || 0, tags: (task.tags || []).join(", ") });
    } else {
      setEditingTask(null);
      setTaskForm(EMPTY_TASK_FORM);
    }
    setTaskModalVisible(true);
  };

  const handleSaveTask = () => {
    if (!taskForm.assignedPersonId) { Alert.alert(t("error"), t("personnel_required")); return; }
    if (!taskForm.title.trim()) { Alert.alert(t("error"), t("task_title_required")); return; }

    if (editingTask && editingTask.personId !== taskForm.assignedPersonId) deleteTaskFromPerson(editingTask, true);

    const targetPerson = personnel.find(p => p.id === taskForm.assignedPersonId);
    if (!targetPerson) return;

    const newTaskData = {
      id: taskForm.id || Date.now().toString(),
      title: taskForm.title.trim(),
      description: taskForm.description.trim(),
      dueDate: taskForm.dueDate.trim(),
      startDate: taskForm.startDate.trim(),
      isCompleted: false,
      priority: taskForm.priority,
      category: taskForm.category,
      estimatedHours: taskForm.estimatedHours ? parseFloat(taskForm.estimatedHours) : null,
      actualHours: taskForm.actualHours ? parseFloat(taskForm.actualHours) : null,
      progress: parseInt(taskForm.progress) || 0,
      tags: taskForm.tags ? taskForm.tags.split(",").map(s => s.trim()).filter(Boolean) : [],
      comments: editingTask?.comments || [],
    };

    let updatedTasks = [...(targetPerson.tasks || [])];
    if (editingTask && editingTask.personId === taskForm.assignedPersonId) {
      updatedTasks = updatedTasks.map(t => t.id === editingTask.id ? { ...t, ...newTaskData } : t);
    } else {
      updatedTasks.push(newTaskData);
    }
    updatePersonnel({ ...targetPerson, tasks: updatedTasks });
    setTaskModalVisible(false);
  };

  const deleteTaskFromPerson = (task, skipAlert = false) => {
    const doDelete = () => {
      const p = personnel.find(p => p.id === task.personId);
      if (!p) return;
      updatePersonnel({ ...p, tasks: p.tasks.filter(t => t.id !== task.id) });
    };
    if (skipAlert) { doDelete(); return; }
    if (Platform.OS === 'web') { if (window.confirm(t("delete_task_confirmation"))) doDelete(); }
    else Alert.alert(t("delete_task"), t("delete_task_confirmation"), [{ text: t("cancel"), style: "cancel" }, { text: t("delete"), style: "destructive", onPress: doDelete }]);
  };

  const updateStatus = (task, isCompleted) => {
    const p = personnel.find(p => p.id === task.personId);
    if (!p) return;
    const updatedTasks = p.tasks.map(t => t.id === task.id ? { ...t, isCompleted, completedDate: isCompleted ? new Date().toISOString() : null } : t);
    updatePersonnel({ ...p, tasks: updatedTasks });
  };

  const toggleTaskStatus = (task) => {
    if (task.isCompleted) {
      if (Platform.OS === 'web') { if (window.confirm(t("undo_task_confirmation"))) updateStatus(task, false); }
      else Alert.alert(t("undo_task"), t("undo_task_confirmation"), [{ text: t("cancel"), style: "cancel" }, { text: t("yes"), onPress: () => updateStatus(task, false) }]);
    } else {
      if (Platform.OS === 'web') { if (window.confirm(t("complete_task_confirmation"))) updateStatus(task, true); }
      else Alert.alert(t("complete_task"), t("complete_task_confirmation"), [{ text: t("cancel"), style: "cancel" }, { text: t("yes_complete"), onPress: () => updateStatus(task, true) }]);
    }
  };

  const openDetail = (task) => { setDetailTask(task); setCommentText(""); setDetailModalVisible(true); };

  const addComment = () => {
    if (!commentText.trim() || !detailTask) return;
    const p = personnel.find(p => p.id === detailTask.personId);
    if (!p) return;
    const newComment = { id: Date.now().toString(), text: commentText.trim(), createdAt: new Date().toISOString(), authorName: "Yönetici" };
    const updatedTasks = p.tasks.map(t => t.id === detailTask.id ? { ...t, comments: [...(t.comments || []), newComment] } : t);
    updatePersonnel({ ...p, tasks: updatedTasks });
    setDetailTask(prev => ({ ...prev, comments: [...(prev.comments || []), newComment] }));
    setCommentText("");
  };

  // --- Renders ---
  const renderKPI = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: 16, marginBottom: 12 }} contentContainerStyle={{ gap: 8 }}>
      {[
        { key: "kpi_open_tasks", val: stats.open, icon: "alert-circle-outline", color: "#3b82f6", bg: "#eff6ff" },
        { key: "overdue_stat", val: stats.overdue, icon: "time-outline", color: "#ef4444", bg: "#fef2f2" },
        { key: "kpi_today_due", val: stats.todayDue, icon: "today-outline", color: "#f59e0b", bg: "#fffbeb" },
        { key: "kpi_critical_tasks", val: stats.criticalOpen, icon: "flame-outline", color: "#7c3aed", bg: "#f5f3ff" },
        { key: "completed", val: stats.completed, icon: "checkmark-circle-outline", color: "#22c55e", bg: "#f0fdf4" },
      ].map(item => (
        <View key={item.key} style={[styles.kpiCard, { backgroundColor: item.bg }]}>
          <View style={[styles.kpiIcon, { backgroundColor: item.color + "22" }]}>
            <Ionicons name={item.icon} size={16} color={item.color} />
          </View>
          <Text style={[styles.kpiValue, { color: item.color }]}>{item.val}</Text>
          <Text style={styles.kpiLabel}>{t(item.key)}</Text>
        </View>
      ))}
    </ScrollView>
  );

  const renderFilters = () => (
    <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
      {/* Search row */}
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color="#9ca3af" style={{ marginRight: 6 }} />
          <TextInput style={{ flex: 1, fontSize: 14, color: "#1f2937" }} placeholder={t("search_task_placeholder")} value={searchQuery} onChangeText={setSearchQuery} placeholderTextColor="#9ca3af" />
          {searchQuery.length > 0 && <TouchableOpacity onPress={() => setSearchQuery("")}><Ionicons name="close-circle" size={16} color="#9ca3af" /></TouchableOpacity>}
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={() => setSortOrder(p => p === "asc" ? "desc" : "asc")}>
          <Ionicons name={sortOrder === "asc" ? "arrow-up" : "arrow-down"} size={16} color="#374151" />
        </TouchableOpacity>
        {Platform.OS === 'web' && (
          <TouchableOpacity style={styles.iconBtn} onPress={() => setViewMode(v => v === "kanban" ? "list" : "kanban")}>
            <Ionicons name={viewMode === "kanban" ? "list-outline" : "apps-outline"} size={16} color={Colors.primary} />
          </TouchableOpacity>
        )}
      </View>
      {/* Priority chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 6 }}>
        {["ALL", ...PRIORITIES].map(p => (
          <TouchableOpacity key={p} style={[styles.chip, priorityFilter === p && { backgroundColor: (PRIORITY_COLORS[p] || Colors.primary) + "22", borderColor: PRIORITY_COLORS[p] || Colors.primary }]} onPress={() => setPriorityFilter(p)}>
            {p !== "ALL" && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: PRIORITY_COLORS[p], marginRight: 4 }} />}
            <Text style={[styles.chipText, priorityFilter === p && { color: PRIORITY_COLORS[p] || Colors.primary, fontWeight: "700" }]}>{p === "ALL" ? t("all_priorities") : priorityLabel(p)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {/* Category and Person chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {["ALL", ...CATEGORIES].map(c => (
          <TouchableOpacity key={c} style={[styles.chip, categoryFilter === c && styles.chipActive]} onPress={() => setCategoryFilter(c)}>
            <Text style={[styles.chipText, categoryFilter === c && styles.chipTextActive]}>{c === "ALL" ? t("all_categories") : catLabel(c)}</Text>
          </TouchableOpacity>
        ))}
        <View style={{ width: 1, backgroundColor: "#e5e7eb", marginHorizontal: 4 }} />
        <TouchableOpacity style={[styles.chip, personFilter === "ALL" && styles.chipActive]} onPress={() => setPersonFilter("ALL")}>
          <Text style={[styles.chipText, personFilter === "ALL" && styles.chipTextActive]}>{t("all_personnel")}</Text>
        </TouchableOpacity>
        {personnel.map(p => (
          <TouchableOpacity key={p.id} style={[styles.chip, personFilter === p.id && styles.chipActive]} onPress={() => setPersonFilter(p.id)}>
            <Text style={[styles.chipText, personFilter === p.id && styles.chipTextActive]}>{p.name.split(" ")[0]}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderTaskItem = ({ item }) => {
    const overdue = !item.isCompleted && isOverdue(item.dueDate);
    const pc = PRIORITY_COLORS[item.priority || "MEDIUM"];
    return (
      <TouchableOpacity style={[styles.taskCard, item.isCompleted && { opacity: 0.6 }]} onPress={() => openDetail(item)} activeOpacity={0.85}>
        <View style={[styles.statusStrip, { backgroundColor: pc }]} />
        <View style={styles.taskContent}>
          <View style={styles.taskTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.taskTitle, item.isCompleted && styles.strikethrough]} numberOfLines={2}>{item.title}</Text>
              <View style={{ flexDirection: "row", gap: 6, marginTop: 3, flexWrap: "wrap" }}>
                <View style={[styles.badge, { backgroundColor: pc + "22" }]}>
                  <Text style={{ color: pc, fontSize: 10, fontWeight: "700" }}>{priorityLabel(item.priority || "MEDIUM")}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: "#f3f4f6" }]}>
                  <Ionicons name={CATEGORY_ICONS[item.category || "GENERAL"]} size={10} color="#6b7280" />
                  <Text style={{ color: "#6b7280", fontSize: 10, marginLeft: 3 }}>{catLabel(item.category || "GENERAL")}</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity onPress={() => toggleTaskStatus(item)} style={{ padding: 4 }}>
              <Ionicons name={item.isCompleted ? "checkmark-circle" : "ellipse-outline"} size={30} color={item.isCompleted ? "#22c55e" : "#d1d5db"} />
            </TouchableOpacity>
          </View>
          {item.progress > 0 && !item.isCompleted && (
            <View style={{ marginTop: 6 }}>
              <View style={styles.progressBg}><View style={[styles.progressFill, { width: `${item.progress}%`, backgroundColor: pc }]} /></View>
              <Text style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>{item.progress}%</Text>
            </View>
          )}
          {item.description ? <Text style={styles.taskDesc} numberOfLines={1}>{item.description}</Text> : null}
          <View style={styles.taskFooter}>
            <View style={styles.footerItem}>
              <View style={styles.avatarTiny}><Text style={styles.avatarTinyText}>{item.personName.charAt(0).toUpperCase()}</Text></View>
              <Text style={styles.footerText}>{item.personName.split(" ")[0]}</Text>
            </View>
            <View style={styles.footerItem}>
              <Ionicons name="calendar-outline" size={12} color={overdue ? "#ef4444" : "#9ca3af"} style={{ marginRight: 3 }} />
              <Text style={[styles.footerText, overdue && { color: "#ef4444", fontWeight: "700" }]}>{item.dueDate || t("no_date")}</Text>
            </View>
            {item.estimatedHours ? <View style={styles.footerItem}><Ionicons name="time-outline" size={12} color="#9ca3af" /><Text style={styles.footerText}> {item.estimatedHours}{t("hours_short")}</Text></View> : null}
            {overdue && <View style={styles.overdueBadge}><Text style={{ color: "#ef4444", fontSize: 10, fontWeight: "800" }}>{t("overdue")}</Text></View>}
            {(item.comments || []).length > 0 && <View style={styles.footerItem}><Ionicons name="chatbubble-outline" size={12} color="#9ca3af" /><Text style={styles.footerText}> {item.comments.length}</Text></View>}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Kanban card (compact)
  const KanbanCard = ({ task }) => {
    const pc = PRIORITY_COLORS[task.priority || "MEDIUM"];
    const overdue = !task.isCompleted && isOverdue(task.dueDate);
    return (
      <TouchableOpacity style={styles.kanbanCard} onPress={() => openDetail(task)}>
        <View style={[styles.kanbanStrip, { backgroundColor: pc }]} />
        <View style={{ flex: 1, padding: 8 }}>
          <Text style={styles.kanbanTitle} numberOfLines={2}>{task.title}</Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
            <View style={styles.avatarTiny}><Text style={styles.avatarTinyText}>{task.personName.charAt(0)}</Text></View>
            {task.dueDate ? <Text style={[{ fontSize: 10, color: overdue ? "#ef4444" : "#9ca3af" }]}>{task.dueDate}</Text> : null}
          </View>
          {task.progress > 0 && <View style={[styles.progressBg, { marginTop: 4 }]}><View style={[styles.progressFill, { width: `${task.progress}%`, backgroundColor: pc }]} /></View>}
        </View>
      </TouchableOpacity>
    );
  };

  const renderKanban = () => (
    <ScrollView horizontal contentContainerStyle={{ padding: 16, gap: 12, alignItems: "flex-start" }}>
      {[
        { key: "todo", label: t("kanban_todo"), icon: "list-outline", color: "#3b82f6", tasks: kanbanColumns.todo },
        { key: "inprogress", label: t("kanban_inprogress"), icon: "reload-outline", color: "#f59e0b", tasks: kanbanColumns.inprogress },
        { key: "done", label: t("kanban_done"), icon: "checkmark-circle-outline", color: "#22c55e", tasks: kanbanColumns.done },
      ].map(col => (
        <View key={col.key} style={styles.kanbanCol}>
          <View style={[styles.kanbanColHeader, { borderTopColor: col.color }]}>
            <Ionicons name={col.icon} size={14} color={col.color} />
            <Text style={[styles.kanbanColTitle, { color: col.color }]}>{col.label}</Text>
            <View style={[styles.badge, { backgroundColor: col.color + "22", marginLeft: "auto" }]}><Text style={{ color: col.color, fontSize: 11, fontWeight: "700" }}>{col.tasks.length}</Text></View>
          </View>
          <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} style={{ maxHeight: 500 }}>
            {col.tasks.map(task => <KanbanCard key={task.id + task.personId} task={task} />)}
            {col.tasks.length === 0 && <Text style={{ color: "#9ca3af", fontSize: 12, textAlign: "center", padding: 12 }}>{t("no_tasks_found")}</Text>}
          </ScrollView>
        </View>
      ))}
    </ScrollView>
  );

  // Detail Modal
  const renderDetailModal = () => {
    if (!detailTask) return null;
    const pc = PRIORITY_COLORS[detailTask.priority || "MEDIUM"];
    const overdue = !detailTask.isCompleted && isOverdue(detailTask.dueDate);
    const completionRate = detailTask.estimatedHours && detailTask.actualHours
      ? Math.round((detailTask.actualHours / detailTask.estimatedHours) * 100) : null;

    return (
      <Modal visible={detailModalVisible} animationType="slide" transparent onRequestClose={() => setDetailModalVisible(false)}>
        <View style={styles.detailOverlay}>
          <View style={styles.detailSheet}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: "800", color: "#1f2937", flex: 1 }} numberOfLines={2}>{detailTask.title}</Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)} style={{ padding: 4 }}><Ionicons name="close" size={22} color="#6b7280" /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Badges */}
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                <View style={[styles.badge, { backgroundColor: pc + "22", paddingVertical: 4, paddingHorizontal: 10 }]}><Text style={{ color: pc, fontWeight: "700" }}>{priorityLabel(detailTask.priority || "MEDIUM")}</Text></View>
                <View style={[styles.badge, { backgroundColor: "#f3f4f6", paddingVertical: 4, paddingHorizontal: 10 }]}><Text style={{ color: "#374151", fontWeight: "600" }}>{catLabel(detailTask.category || "GENERAL")}</Text></View>
                {detailTask.isCompleted && <View style={[styles.badge, { backgroundColor: "#dcfce7", paddingVertical: 4, paddingHorizontal: 10 }]}><Text style={{ color: "#16a34a", fontWeight: "700" }}>{t("completed")}</Text></View>}
                {overdue && <View style={[styles.badge, { backgroundColor: "#fef2f2", paddingVertical: 4, paddingHorizontal: 10 }]}><Text style={{ color: "#ef4444", fontWeight: "700" }}>{t("overdue")}</Text></View>}
              </View>
              {/* Progress */}
              {typeof detailTask.progress === "number" && (
                <View style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                    <Text style={{ fontSize: 12, color: "#6b7280", fontWeight: "600" }}>{t("task_progress")}</Text>
                    <Text style={{ fontSize: 12, color: pc, fontWeight: "700" }}>{detailTask.progress}%</Text>
                  </View>
                  <View style={[styles.progressBg, { height: 8 }]}><View style={[styles.progressFill, { width: `${detailTask.progress}%`, height: 8, backgroundColor: pc }]} /></View>
                </View>
              )}
              {/* Info rows */}
              {[
                { label: t("assigned_tasks").split(" ")[0], value: detailTask.personName },
                { label: t("task_start_date"), value: detailTask.startDate },
                { label: t("due_date"), value: detailTask.dueDate },
                { label: t("estimated_hours"), value: detailTask.estimatedHours ? `${detailTask.estimatedHours} ${t("hours_short")}` : null },
                { label: t("actual_hours"), value: detailTask.actualHours ? `${detailTask.actualHours} ${t("hours_short")}` : null },
              ].map((row, i) => row.value ? (
                <View key={i} style={styles.detailInfoRow}>
                  <Text style={styles.detailInfoLabel}>{row.label}</Text>
                  <Text style={styles.detailInfoValue}>{row.value}</Text>
                </View>
              ) : null)}
              {detailTask.description ? (
                <View style={{ marginTop: 8, marginBottom: 16, backgroundColor: "#f9fafb", padding: 12, borderRadius: 10 }}>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: "#6b7280", marginBottom: 4 }}>{t("description_optional")}</Text>
                  <Text style={{ fontSize: 14, color: "#374151" }}>{detailTask.description}</Text>
                </View>
              ) : null}
              {/* Comments */}
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#1f2937", marginBottom: 8 }}>{t("task_comments")}</Text>
              {(detailTask.comments || []).length === 0 ? (
                <Text style={{ fontSize: 13, color: "#9ca3af", marginBottom: 8 }}>{t("no_comments")}</Text>
              ) : (detailTask.comments || []).map(c => (
                <View key={c.id} style={{ backgroundColor: "#f9fafb", padding: 10, borderRadius: 10, marginBottom: 6 }}>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: "#374151" }}>{c.authorName}</Text>
                  <Text style={{ fontSize: 13, color: "#1f2937", marginTop: 2 }}>{c.text}</Text>
                  <Text style={{ fontSize: 10, color: "#9ca3af", marginTop: 4 }}>{new Date(c.createdAt).toLocaleDateString()}</Text>
                </View>
              ))}
              <View style={{ flexDirection: "row", gap: 8, marginTop: 4, marginBottom: 16 }}>
                <TextInput style={[styles.input, { flex: 1 }]} value={commentText} onChangeText={setCommentText} placeholder={t("comment_placeholder")} placeholderTextColor="#9ca3af" />
                <TouchableOpacity style={[styles.iconBtn, { backgroundColor: Colors.primary }]} onPress={addComment}>
                  <Ionicons name="send" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
              {/* Actions */}
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.primary }]} onPress={() => { setDetailModalVisible(false); openTaskModal(detailTask); }}>
                  <Ionicons name="create-outline" size={16} color="#fff" /><Text style={styles.actionBtnText}>{t("edit")}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: detailTask.isCompleted ? "#6b7280" : "#22c55e" }]} onPress={() => { toggleTaskStatus(detailTask); setDetailModalVisible(false); }}>
                  <Ionicons name={detailTask.isCompleted ? "arrow-undo" : "checkmark"} size={16} color="#fff" />
                  <Text style={styles.actionBtnText}>{detailTask.isCompleted ? t("undo_task") : t("yes_complete")}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#ef4444", flex: 0.5 }]} onPress={() => { setDetailModalVisible(false); deleteTaskFromPerson(detailTask); }}>
                  <Ionicons name="trash-outline" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  // Task Form Modal
  const SelectRow = ({ label, options, value, onSelect, labelFn }) => (
    <View style={{ marginBottom: 4 }}>
      <Text style={styles.inputLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {options.map(opt => (
          <TouchableOpacity key={opt} onPress={() => onSelect(opt)}
            style={[styles.chip, value === opt && { backgroundColor: (PRIORITY_COLORS[opt] || Colors.primary) + "22", borderColor: PRIORITY_COLORS[opt] || Colors.primary }]}>
            <Text style={[styles.chipText, value === opt && { color: PRIORITY_COLORS[opt] || Colors.primary, fontWeight: "700" }]}>{labelFn(opt)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderTaskFormModal = () => (
    <Modal visible={taskModalVisible} animationType="slide" transparent onRequestClose={() => setTaskModalVisible(false)}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingTask ? t("edit_task") : t("new_task")}</Text>
            <TouchableOpacity onPress={() => setTaskModalVisible(false)}><Ionicons name="close" size={22} color="#6b7280" /></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Personel seçimi */}
            <Text style={styles.inputLabel}>{t("select_personnel")} <Text style={{ color: "red" }}>*</Text></Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }} contentContainerStyle={{ gap: 8 }}>
              {personnel.map(p => (
                <TouchableOpacity key={p.id}
                  style={[styles.personChip, taskForm.assignedPersonId === p.id && styles.personChipActive]}
                  onPress={() => setTaskForm({ ...taskForm, assignedPersonId: p.id })}>
                  <View style={[styles.avatarTiny, taskForm.assignedPersonId === p.id && { backgroundColor: "rgba(255,255,255,0.3)" }]}>
                    <Text style={{ color: taskForm.assignedPersonId === p.id ? "#fff" : Colors.primary, fontWeight: "700", fontSize: 10 }}>{p.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <Text style={[{ fontSize: 13, fontWeight: "600", color: "#374151" }, taskForm.assignedPersonId === p.id && { color: "#fff" }]}>{p.name.split(" ")[0]}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.inputLabel}>{t("task_title")} <Text style={{ color: "red" }}>*</Text></Text>
            <TextInput style={styles.input} value={taskForm.title} onChangeText={v => setTaskForm({ ...taskForm, title: v })} placeholder="Görev başlığı" placeholderTextColor="#9ca3af" />
            <Text style={styles.inputLabel}>{t("description_optional")}</Text>
            <TextInput style={[styles.input, { height: 70, textAlignVertical: "top" }]} value={taskForm.description} onChangeText={v => setTaskForm({ ...taskForm, description: v })} multiline placeholder={t("enter_details")} placeholderTextColor="#9ca3af" />
            <SelectRow label={t("task_priority")} options={PRIORITIES} value={taskForm.priority} onSelect={v => setTaskForm({ ...taskForm, priority: v })} labelFn={priorityLabel} />
            <SelectRow label={t("task_category")} options={CATEGORIES} value={taskForm.category} onSelect={v => setTaskForm({ ...taskForm, category: v })} labelFn={catLabel} />
            <Text style={styles.inputLabel}>{t("task_start_date")}</Text>
            <TextInput style={styles.input} value={taskForm.startDate} onChangeText={v => setTaskForm({ ...taskForm, startDate: v })} placeholder="GG.AA.YYYY" placeholderTextColor="#9ca3af" />
            <Text style={styles.inputLabel}>{t("due_date_format")}</Text>
            <TextInput style={styles.input} value={taskForm.dueDate} onChangeText={v => setTaskForm({ ...taskForm, dueDate: v })} placeholder="GG.AA.YYYY" placeholderTextColor="#9ca3af" keyboardType="numbers-and-punctuation" />
            <Text style={styles.inputLabel}>{t("estimated_hours")}</Text>
            <TextInput style={styles.input} value={taskForm.estimatedHours} onChangeText={v => setTaskForm({ ...taskForm, estimatedHours: v })} placeholder="4" placeholderTextColor="#9ca3af" keyboardType="numeric" />
            <Text style={styles.inputLabel}>{t("actual_hours")}</Text>
            <TextInput style={styles.input} value={taskForm.actualHours} onChangeText={v => setTaskForm({ ...taskForm, actualHours: v })} placeholder="3.5" placeholderTextColor="#9ca3af" keyboardType="numeric" />
            <Text style={styles.inputLabel}>{t("task_progress")} (0-100)</Text>
            <TextInput style={styles.input} value={taskForm.progress?.toString()} onChangeText={v => setTaskForm({ ...taskForm, progress: parseInt(v) || 0 })} placeholder="0" placeholderTextColor="#9ca3af" keyboardType="numeric" />
            <Text style={styles.inputLabel}>{t("task_tags")}</Text>
            <TextInput style={styles.input} value={taskForm.tags} onChangeText={v => setTaskForm({ ...taskForm, tags: v })} placeholder="acil, müşteri, ürün..." placeholderTextColor="#9ca3af" />
            <TouchableOpacity style={styles.saveBigBtn} onPress={handleSaveTask}>
              <Text style={styles.saveBigBtnText}>{editingTask ? t("save_changes") : t("create_task")}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  return (
    <ImmersiveLayout title={t("task_management")} subtitle={t("task_subtitle")} onGoBack={() => navigation.goBack()}>
      <View style={styles.container}>
        {renderKPI()}
        {renderFilters()}

        {/* Tab row */}
        <View style={styles.tabContainer}>
          <TouchableOpacity style={[styles.tabButton, activeTab === "open" && styles.activeTab]} onPress={() => setActiveTab("open")}>
            <Text style={[styles.tabText, activeTab === "open" && styles.activeTabText]}>{t("todo")}</Text>
            {stats.open > 0 && <View style={styles.badgePill}><Text style={styles.badgePillText}>{stats.open}</Text></View>}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabButton, activeTab === "completed" && styles.activeTab]} onPress={() => setActiveTab("completed")}>
            <Text style={[styles.tabText, activeTab === "completed" && styles.activeTabText]}>{t("completed")}</Text>
          </TouchableOpacity>
        </View>

        {/* Date filter (completed only) */}
        {activeTab === "completed" && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 16, marginBottom: 10 }} contentContainerStyle={{ gap: 6 }}>
            {["ALL", "TODAY", "WEEK", "MONTH"].map(f => (
              <TouchableOpacity key={f} style={[styles.chip, dateFilter === f && styles.chipActive]} onPress={() => setDateFilter(f)}>
                <Text style={[styles.chipText, dateFilter === f && styles.chipTextActive]}>{f === "ALL" ? t("all") : f === "TODAY" ? t("today") : f === "WEEK" ? t("this_week") : t("this_month")}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Content */}
        {Platform.OS === 'web' && viewMode === "kanban" ? (
          renderKanban()
        ) : (
          <FlatList
            data={tasksToShow}
            keyExtractor={item => item.id + item.personId}
            renderItem={renderTaskItem}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconBg}><Ionicons name="clipboard-outline" size={40} color="#9ca3af" /></View>
                <Text style={styles.emptyTitle}>{t("no_tasks_found")}</Text>
                <Text style={styles.emptyText}>{activeTab === "completed" ? t("no_completed_tasks") : t("no_pending_tasks_message")}</Text>
              </View>
            }
          />
        )}

        <TouchableOpacity style={styles.fab} onPress={() => openTaskModal()} activeOpacity={0.85}>
          <Ionicons name="add" size={30} color="#fff" />
        </TouchableOpacity>
      </View>

      {renderTaskFormModal()}
      {renderDetailModal()}
    </ImmersiveLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 8 },
  // KPI
  kpiCard: { width: 90, padding: 10, borderRadius: 12, alignItems: "center" },
  kpiIcon: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 3 },
  kpiValue: { fontSize: 18, fontWeight: "800" },
  kpiLabel: { fontSize: 9, color: "#6b7280", fontWeight: "600", textAlign: "center", marginTop: 1 },
  // Search
  searchBar: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 10, height: 42, borderWidth: 1, borderColor: "#e5e7eb" },
  iconBtn: { width: 42, height: 42, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb", alignItems: "center", justifyContent: "center" },
  // Chips
  chip: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 14, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb", flexDirection: "row", alignItems: "center" },
  chipActive: { backgroundColor: "#eff6ff", borderColor: Colors.primary },
  chipText: { fontSize: 12, color: "#6b7280", fontWeight: "600" },
  chipTextActive: { color: Colors.primary, fontWeight: "700" },
  // Tabs
  tabContainer: { flexDirection: "row", backgroundColor: "#f3f4f6", marginHorizontal: 16, marginBottom: 10, borderRadius: 12, padding: 4 },
  tabButton: { flex: 1, flexDirection: "row", paddingVertical: 9, alignItems: "center", justifyContent: "center", borderRadius: 10 },
  activeTab: { backgroundColor: "#fff", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, elevation: 1 },
  tabText: { fontSize: 13, fontWeight: "600", color: "#6b7280" },
  activeTabText: { color: "#1f2937", fontWeight: "700" },
  badgePill: { backgroundColor: Colors.primary, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8, marginLeft: 5 },
  badgePillText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  // Task Card
  taskCard: { backgroundColor: "#fff", flexDirection: "row", borderRadius: 12, marginBottom: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1, overflow: "hidden" },
  statusStrip: { width: 4 },
  taskContent: { flex: 1, padding: 10 },
  taskTopRow: { flexDirection: "row", alignItems: "flex-start" },
  taskTitle: { fontSize: 14, fontWeight: "700", color: "#1f2937", flex: 1, marginRight: 6 },
  strikethrough: { textDecorationLine: "line-through", color: "#9ca3af" },
  taskDesc: { fontSize: 12, color: "#6b7280", marginTop: 4 },
  badge: { flexDirection: "row", alignItems: "center", paddingVertical: 2, paddingHorizontal: 6, borderRadius: 6 },
  taskFooter: { flexDirection: "row", alignItems: "center", borderTopWidth: 1, borderTopColor: "#f9fafb", paddingTop: 6, marginTop: 6, flexWrap: "wrap", gap: 8 },
  footerItem: { flexDirection: "row", alignItems: "center" },
  footerText: { fontSize: 11, color: "#9ca3af" },
  avatarTiny: { width: 18, height: 18, borderRadius: 9, backgroundColor: "#eff6ff", alignItems: "center", justifyContent: "center", marginRight: 4 },
  avatarTinyText: { fontSize: 8, fontWeight: "800", color: Colors.primary },
  overdueBadge: { backgroundColor: "#fef2f2", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: "auto" },
  progressBg: { height: 4, backgroundColor: "#f3f4f6", borderRadius: 4, overflow: "hidden" },
  progressFill: { height: 4, borderRadius: 4 },
  // Kanban
  kanbanCol: { width: 220, backgroundColor: "#fff", borderRadius: 14, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, elevation: 2 },
  kanbanColHeader: { flexDirection: "row", alignItems: "center", gap: 6, padding: 12, borderTopWidth: 3, backgroundColor: "#fafafa" },
  kanbanColTitle: { fontSize: 13, fontWeight: "700" },
  kanbanCard: { flexDirection: "row", backgroundColor: "#fff", marginHorizontal: 8, marginBottom: 6, borderRadius: 10, borderWidth: 1, borderColor: "#f3f4f6", overflow: "hidden" },
  kanbanStrip: { width: 3 },
  kanbanTitle: { fontSize: 13, fontWeight: "600", color: "#1f2937" },
  // Empty
  emptyContainer: { alignItems: "center", marginTop: 50 },
  emptyIconBg: { width: 70, height: 70, borderRadius: 35, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#374151", marginBottom: 6 },
  emptyText: { color: "#9ca3af", fontSize: 13, textAlign: "center", maxWidth: 240 },
  // FAB
  fab: { position: "absolute", right: 20, bottom: 28, width: 54, height: 54, borderRadius: 27, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  // Modal
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  modalSheet: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "92%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 19, fontWeight: "800", color: "#1f2937" },
  inputLabel: { fontSize: 12, fontWeight: "700", color: "#374151", marginBottom: 6, marginTop: 12, textTransform: "uppercase", letterSpacing: 0.3 },
  input: { backgroundColor: "#f9fafb", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb", fontSize: 15, color: "#1f2937" },
  personChip: { flexDirection: "row", alignItems: "center", backgroundColor: "#f3f4f6", paddingVertical: 7, paddingHorizontal: 10, borderRadius: 20, borderWidth: 1, borderColor: "#e5e7eb", gap: 6 },
  personChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  saveBigBtn: { backgroundColor: Colors.primary, padding: 15, borderRadius: 14, alignItems: "center", marginTop: 24, marginBottom: 20, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, elevation: 4 },
  saveBigBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  // Detail sheet
  detailOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  detailSheet: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "88%" },
  detailInfoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f9fafb" },
  detailInfoLabel: { fontSize: 13, color: "#6b7280", fontWeight: "600" },
  detailInfoValue: { fontSize: 13, color: "#1f2937", fontWeight: "700" },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, padding: 12, borderRadius: 12 },
  actionBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});