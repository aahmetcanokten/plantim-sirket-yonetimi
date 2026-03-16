import React, { useContext, useState, useMemo } from "react";
import {
  View, Text, FlatList, TouchableOpacity, TextInput, Alert,
  ScrollView, StyleSheet, Modal, KeyboardAvoidingView, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ImmersiveLayout from "../components/ImmersiveLayout";
import { Colors } from "../Theme";
import { AppContext } from "../AppContext";
import { useTranslation } from "react-i18next";

const EMPTY_PERSON = {
  id: null, name: "", role: "", phone: "", hireDate: "",
  annualLeaveEntitlement: "", tasks: [],
  department: "", email: "", national_id: "", employment_type: "FULL_TIME",
  status: "ACTIVE", salary: "", salary_currency: "TRY",
  emergency_contact: "", emergency_phone: "", end_date: "",
  performance_score: "", notes: "",
};

const EMPTY_TASK = { id: null, title: "", description: "", dueDate: "", isCompleted: false, priority: "MEDIUM", category: "GENERAL", progress: 0, estimatedHours: "", actualHours: "", startDate: "" };
const EMPTY_LEAVE = { leave_type: "ANNUAL", start_date: "", end_date: "", days: "", status: "APPROVED", notes: "" };

const EMP_TYPES = ["FULL_TIME","PART_TIME","CONTRACTOR","INTERN"];
const EMP_STATUSES = ["ACTIVE","ON_LEAVE","SICK","RESIGNED"];
const LEAVE_TYPES = ["ANNUAL","SICK","UNPAID","MATERNITY","PATERNITY"];
const PRIORITIES = ["LOW","MEDIUM","HIGH","CRITICAL"];
const TASK_CATEGORIES = ["GENERAL","SALES","PRODUCTION","ADMIN","TECHNICAL"];

const PRIORITY_COLORS = { LOW:"#22c55e", MEDIUM:"#f59e0b", HIGH:"#ef4444", CRITICAL:"#7c3aed" };
const STATUS_COLORS = { ACTIVE:"#22c55e", ON_LEAVE:"#f59e0b", SICK:"#ef4444", RESIGNED:"#6b7280" };

export default function PersonnelScreen({ navigation }) {
  const { personnel, addPersonnel, updatePersonnel, deletePersonnel, isPremium, assets, leaveHistory, addLeaveRecord, deleteLeaveRecord, fetchLeaveHistory } = useContext(AppContext);
  const { t } = useTranslation();

  const [selectedPerson, setSelectedPerson] = useState(null);
  const [activeTab, setActiveTab] = useState("info");
  const [viewMode, setViewMode] = useState(Platform.OS === 'web' ? "table" : "card");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortAsc, setSortAsc] = useState(true);
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [personnelModalVisible, setPersonnelModalVisible] = useState(false);
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [leaveModalVisible, setLeaveModalVisible] = useState(false);

  const [formPerson, setFormPerson] = useState(EMPTY_PERSON);
  const [formTask, setFormTask] = useState(EMPTY_TASK);
  const [formLeave, setFormLeave] = useState(EMPTY_LEAVE);

  // --- Derived data ---
  const departments = useMemo(() => {
    const deps = [...new Set(personnel.map(p => p.department).filter(Boolean))];
    return ["ALL", ...deps];
  }, [personnel]);

  const filteredPersonnel = useMemo(() => {
    let result = [...personnel];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(q) || (p.role && p.role.toLowerCase().includes(q)) || (p.department && p.department.toLowerCase().includes(q)));
    }
    if (deptFilter !== "ALL") result = result.filter(p => p.department === deptFilter);
    if (statusFilter !== "ALL") result = result.filter(p => (p.status || "ACTIVE") === statusFilter);
    result.sort((a, b) => sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));
    return result;
  }, [personnel, searchQuery, sortAsc, deptFilter, statusFilter]);

  const kpi = useMemo(() => ({
    total: personnel.length,
    active: personnel.filter(p => !p.status || p.status === "ACTIVE").length,
    onLeave: personnel.filter(p => p.status === "ON_LEAVE" || p.status === "SICK").length,
    openTasks: personnel.reduce((acc, p) => acc + (p.tasks || []).filter(t => !t.isCompleted).length, 0),
  }), [personnel]);

  const personAssets = useMemo(() => {
    if (!selectedPerson) return [];
    return (assets || []).filter(a => a.assigned_person_id === selectedPerson.id);
  }, [assets, selectedPerson]);

  const personLeave = useMemo(() => {
    if (!selectedPerson || !fetchLeaveHistory) return [];
    return fetchLeaveHistory(selectedPerson.id);
  }, [leaveHistory, selectedPerson]);

  // --- Helpers ---
  const empTypeLabel = (v) => t({ FULL_TIME:"emp_type_full", PART_TIME:"emp_type_part", CONTRACTOR:"emp_type_contractor", INTERN:"emp_type_intern" }[v] || "emp_type_full");
  const statusLabel = (v) => t({ ACTIVE:"status_active", ON_LEAVE:"status_on_leave", SICK:"status_sick", RESIGNED:"status_resigned" }[v] || "status_active");
  const leaveTypeLabel = (v) => t({ ANNUAL:"leave_annual", SICK:"leave_sick", UNPAID:"leave_unpaid", MATERNITY:"leave_maternity", PATERNITY:"leave_paternity" }[v] || "leave_annual");
  const priorityLabel = (v) => t({ LOW:"priority_low", MEDIUM:"priority_medium", HIGH:"priority_high", CRITICAL:"priority_critical" }[v] || "priority_medium");
  const catLabel = (v) => t({ GENERAL:"cat_general", SALES:"cat_sales", PRODUCTION:"cat_production", ADMIN:"cat_admin", TECHNICAL:"cat_technical" }[v] || "cat_general");

  // --- Actions ---
  const openAddPerson = () => {
    if (!isPremium && personnel.length >= 2) {
      if (Platform.OS === 'web') { if (window.confirm(t("personnel_limit_message"))) navigation.navigate("Paywall"); }
      else Alert.alert(t("premium_feature"), t("personnel_limit_message"), [{ text: t("cancel"), style: "cancel" }, { text: t("get_premium"), onPress: () => navigation.navigate("Paywall") }]);
      return;
    }
    setFormPerson(EMPTY_PERSON);
    setPersonnelModalVisible(true);
  };

  const openEditPerson = (p) => { setFormPerson({ ...EMPTY_PERSON, ...p }); setPersonnelModalVisible(true); };

  const savePersonnel = () => {
    if (!formPerson.name.trim() || !formPerson.role.trim()) { Alert.alert(t("error"), t("fill_required_fields")); return; }
    if (formPerson.id) {
      updatePersonnel(formPerson);
      if (selectedPerson?.id === formPerson.id) setSelectedPerson({ ...selectedPerson, ...formPerson });
    } else {
      addPersonnel({ ...formPerson, id: Date.now().toString() });
    }
    setPersonnelModalVisible(false);
  };

  const confirmDeletePerson = (person) => {
    const doDelete = () => { deletePersonnel(person.id); setSelectedPerson(null); };
    if (Platform.OS === 'web') { if (window.confirm(`${person.name} ${t("delete_personnel_confirmation")}`)) doDelete(); }
    else Alert.alert(t("delete_personnel"), `${person.name} ${t("delete_personnel_confirmation")}`, [{ text: t("cancel"), style: "cancel" }, { text: t("delete"), style: "destructive", onPress: doDelete }]);
  };

  const saveTask = () => {
    if (!formTask.title.trim()) { Alert.alert(t("error"), t("task_title_required")); return; }
    const updatedTasks = [...(selectedPerson.tasks || [])];
    if (formTask.id) { const idx = updatedTasks.findIndex(t => t.id === formTask.id); updatedTasks[idx] = formTask; }
    else updatedTasks.push({ ...formTask, id: Date.now().toString() });
    const updated = { ...selectedPerson, tasks: updatedTasks };
    updatePersonnel(updated);
    setSelectedPerson(updated);
    setTaskModalVisible(false);
  };

  const toggleTaskCompletion = (task) => {
    const updatedTasks = selectedPerson.tasks.map(t => t.id === task.id ? { ...t, isCompleted: !t.isCompleted } : t);
    const updated = { ...selectedPerson, tasks: updatedTasks };
    updatePersonnel(updated);
    setSelectedPerson(updated);
  };

  const deleteTask = (taskId) => {
    const updatedTasks = selectedPerson.tasks.filter(t => t.id !== taskId);
    const updated = { ...selectedPerson, tasks: updatedTasks };
    updatePersonnel(updated);
    setSelectedPerson(updated);
  };

  const saveLeave = async () => {
    if (!formLeave.start_date || !formLeave.end_date || !formLeave.days) { Alert.alert(t("error"), t("fill_required_fields")); return; }
    await addLeaveRecord({ ...formLeave, person_id: selectedPerson.id });
    setLeaveModalVisible(false);
    setFormLeave(EMPTY_LEAVE);
  };

  // ========= RENDERS =========

  const renderKPI = () => (
    <View style={styles.kpiRow}>
      {[
        { key: "kpi_total_staff", val: kpi.total, icon: "people", color: "#3b82f6", bg: "#eff6ff" },
        { key: "kpi_active", val: kpi.active, icon: "checkmark-circle", color: "#22c55e", bg: "#f0fdf4" },
        { key: "kpi_on_leave", val: kpi.onLeave, icon: "calendar", color: "#f59e0b", bg: "#fffbeb" },
        { key: "kpi_open_tasks", val: kpi.openTasks, icon: "list", color: "#8b5cf6", bg: "#f5f3ff" },
      ].map(item => (
        <View key={item.key} style={[styles.kpiCard, { backgroundColor: item.bg }]}>
          <View style={[styles.kpiIcon, { backgroundColor: item.color + '22' }]}>
            <Ionicons name={item.icon} size={18} color={item.color} />
          </View>
          <Text style={[styles.kpiValue, { color: item.color }]}>{item.val}</Text>
          <Text style={styles.kpiLabel}>{t(item.key)}</Text>
        </View>
      ))}
    </View>
  );

  const renderFilters = () => (
    <View style={styles.filterWrap}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#999" style={{ marginRight: 6 }} />
        <TextInput placeholder={t("search_personnel")} value={searchQuery} onChangeText={setSearchQuery} style={{ flex: 1, fontSize: 14 }} />
        {searchQuery ? <TouchableOpacity onPress={() => setSearchQuery("")}><Ionicons name="close-circle" size={16} color="#999" /></TouchableOpacity> : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }} contentContainerStyle={{ gap: 6 }}>
        {departments.map(d => (
          <TouchableOpacity key={d} style={[styles.filterChip, deptFilter === d && styles.filterChipActive]} onPress={() => setDeptFilter(d)}>
            <Text style={[styles.filterChipText, deptFilter === d && styles.filterChipTextActive]}>{d === "ALL" ? t("all_departments") : d}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={{ flexDirection: "row", marginTop: 6, gap: 6, flexWrap: "wrap" }}>
        {["ALL", ...EMP_STATUSES].map(s => (
          <TouchableOpacity key={s} style={[styles.filterChip, statusFilter === s && styles.filterChipActive]} onPress={() => setStatusFilter(s)}>
            <Text style={[styles.filterChipText, statusFilter === s && styles.filterChipTextActive]}>{s === "ALL" ? t("all_statuses") : statusLabel(s)}</Text>
          </TouchableOpacity>
        ))}
        {Platform.OS === 'web' && (
          <TouchableOpacity style={[styles.filterChip, { marginLeft: "auto" }]} onPress={() => setViewMode(v => v === "table" ? "card" : "table")}>
            <Ionicons name={viewMode === "table" ? "grid" : "list"} size={14} color={Colors.primary} />
            <Text style={[styles.filterChipText, { color: Colors.primary, marginLeft: 4 }]}>{viewMode === "table" ? t("view_card") : t("view_table")}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderTableView = () => (
    <ScrollView horizontal>
      <View>
        <View style={styles.tableHeader}>
          {[t("col_name"), t("col_position"), t("col_department"), t("col_type"), t("col_status"), t("col_hire_date"), t("col_salary"), t("col_leave"), t("col_open_tasks"), t("col_actions")].map((h, i) => (
            <Text key={i} style={[styles.tableCell, styles.tableHeaderCell, { width: i === 0 ? 160 : i === 9 ? 90 : 120 }]}>{h}</Text>
          ))}
        </View>
        {filteredPersonnel.length === 0 ? (
          <Text style={styles.emptyText}>{t("no_personnel_record")}</Text>
        ) : filteredPersonnel.map((person, idx) => {
          const openTasks = (person.tasks || []).filter(t => !t.isCompleted).length;
          const statusColor = STATUS_COLORS[person.status || "ACTIVE"];
          return (
            <TouchableOpacity key={person.id} style={[styles.tableRow, idx % 2 === 0 && { backgroundColor: "#f9fafb" }]} onPress={() => { setSelectedPerson(person); setActiveTab("info"); }}>
              <View style={[styles.tableCell, { width: 160, flexDirection: "row", alignItems: "center" }]}>
                <View style={styles.avatarSmall}><Text style={styles.avatarSmallText}>{person.name.charAt(0).toUpperCase()}</Text></View>
                <Text style={{ fontSize: 13, fontWeight: "600", marginLeft: 6 }} numberOfLines={1}>{person.name}</Text>
              </View>
              <Text style={[styles.tableCell, { width: 120 }]} numberOfLines={1}>{person.role}</Text>
              <Text style={[styles.tableCell, { width: 120 }]} numberOfLines={1}>{person.department || "-"}</Text>
              <Text style={[styles.tableCell, { width: 120 }]} numberOfLines={1}>{empTypeLabel(person.employment_type || "FULL_TIME")}</Text>
              <View style={[styles.tableCell, { width: 120 }]}>
                <View style={[styles.statusBadge, { backgroundColor: statusColor + "22" }]}>
                  <Text style={{ color: statusColor, fontSize: 11, fontWeight: "700" }}>{statusLabel(person.status || "ACTIVE")}</Text>
                </View>
              </View>
              <Text style={[styles.tableCell, { width: 120 }]}>{person.hireDate || "-"}</Text>
              <Text style={[styles.tableCell, { width: 120 }]}>{person.salary ? `${parseFloat(person.salary).toLocaleString()} ${person.salary_currency || "₺"}` : "-"}</Text>
              <Text style={[styles.tableCell, { width: 120 }]}>{person.annualLeaveEntitlement ? `${person.annualLeaveEntitlement} ${t("days")}` : "-"}</Text>
              <View style={[styles.tableCell, { width: 120 }]}>
                {openTasks > 0 ? <View style={styles.taskBadge}><Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>{openTasks}</Text></View> : <Text style={{ color: "#9ca3af", fontSize: 13 }}>-</Text>}
              </View>
              <View style={[styles.tableCell, { width: 90, flexDirection: "row", gap: 8 }]}>
                <TouchableOpacity onPress={() => openEditPerson(person)}><Ionicons name="create-outline" size={18} color={Colors.primary} /></TouchableOpacity>
                <TouchableOpacity onPress={() => confirmDeletePerson(person)}><Ionicons name="trash-outline" size={18} color="#ef4444" /></TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );

  const renderCardView = () => (
    <FlatList
      data={filteredPersonnel}
      keyExtractor={item => item.id}
      contentContainerStyle={{ paddingBottom: 80 }}
      ListEmptyComponent={<Text style={styles.emptyText}>{searchQuery ? t("no_personnel_match") : t("no_personnel_record")}</Text>}
      renderItem={({ item }) => {
        const openTasks = (item.tasks || []).filter(t => !t.isCompleted).length;
        const statusColor = STATUS_COLORS[item.status || "ACTIVE"];
        return (
          <TouchableOpacity style={styles.personCard} onPress={() => { setSelectedPerson(item); setActiveTab("info"); }}>
            <View style={styles.personAvatar}><Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text></View>
            <View style={{ flex: 1, paddingHorizontal: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={styles.personName}>{item.name}</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusColor + "22" }]}>
                  <Text style={{ color: statusColor, fontSize: 10, fontWeight: "700" }}>{statusLabel(item.status || "ACTIVE")}</Text>
                </View>
              </View>
              <Text style={styles.personRole}>{item.role || t("no_title")}</Text>
              {item.department ? <Text style={styles.personDept}><Ionicons name="business-outline" size={11} /> {item.department}</Text> : null}
              <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
                {item.annualLeaveEntitlement ? <Text style={styles.chipText}><Ionicons name="calendar-outline" size={11} /> {item.annualLeaveEntitlement} {t("days")}</Text> : null}
                {openTasks > 0 ? <Text style={[styles.chipText, { color: "#8b5cf6" }]}><Ionicons name="list-outline" size={11} /> {openTasks} {t("kpi_open_tasks")}</Text> : null}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </TouchableOpacity>
        );
      }}
    />
  );

  const renderPersonnelList = () => (
    <View style={{ flex: 1 }}>
      {renderKPI()}
      {renderFilters()}
      <TouchableOpacity style={styles.addButtonBlock} onPress={openAddPerson}>
        <Ionicons name="person-add-outline" size={18} color="#fff" />
        <Text style={styles.addButtonText}>{t("add_new_personnel")}</Text>
      </TouchableOpacity>
      {Platform.OS === 'web' && viewMode === "table" ? renderTableView() : renderCardView()}
    </View>
  );

  // ---- DETAIL ----
  const renderInfoTab = () => (
    <View style={styles.detailCard}>
      {[
        { label: t("hire_date"), value: selectedPerson.hireDate },
        { label: t("department"), value: selectedPerson.department },
        { label: t("emp_email"), value: selectedPerson.email },
        { label: t("national_id"), value: selectedPerson.national_id },
        { label: t("employment_type"), value: empTypeLabel(selectedPerson.employment_type || "FULL_TIME") },
        { label: t("emp_status"), value: statusLabel(selectedPerson.status || "ACTIVE") },
        { label: t("salary"), value: selectedPerson.salary ? `${parseFloat(selectedPerson.salary).toLocaleString()} ${selectedPerson.salary_currency || "TRY"}` : null },
        { label: t("annual_leave_entitlement"), value: selectedPerson.annualLeaveEntitlement ? `${selectedPerson.annualLeaveEntitlement} ${t("days")}` : null },
        { label: t("emergency_contact"), value: selectedPerson.emergency_contact },
        { label: t("emergency_phone"), value: selectedPerson.emergency_phone },
        { label: t("performance_score"), value: selectedPerson.performance_score ? `${selectedPerson.performance_score} / 10` : null },
        { label: t("notes_field"), value: selectedPerson.notes },
      ].map((row, i) => row.value ? (
        <View key={i} style={styles.infoRow}>
          <Text style={styles.infoLabel}>{row.label}</Text>
          <Text style={styles.infoValue}>{row.value}</Text>
        </View>
      ) : null)}
    </View>
  );

  const renderTasksTab = () => (
    <View>
      <TouchableOpacity style={styles.smallAddButton} onPress={() => { setFormTask(EMPTY_TASK); setTaskModalVisible(true); }}>
        <Ionicons name="add" size={16} color="#fff" />
        <Text style={styles.smallAddButtonText}>{t("add_task")}</Text>
      </TouchableOpacity>
      {!selectedPerson.tasks || selectedPerson.tasks.length === 0 ? (
        <Text style={styles.emptyText}>{t("no_tasks_assigned")}</Text>
      ) : selectedPerson.tasks.map(task => (
        <View key={task.id} style={[styles.taskCard, { borderLeftColor: PRIORITY_COLORS[task.priority || "MEDIUM"] }]}>
          <TouchableOpacity onPress={() => toggleTaskCompletion(task)} style={{ marginRight: 10 }}>
            <Ionicons name={task.isCompleted ? "checkmark-circle" : "ellipse-outline"} size={26} color={task.isCompleted ? "#22c55e" : "#ccc"} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={[styles.taskTitle, task.isCompleted && { textDecorationLine: "line-through", color: "#9ca3af" }]}>{task.title}</Text>
              <View style={[styles.priorityBadge, { backgroundColor: PRIORITY_COLORS[task.priority || "MEDIUM"] + "22" }]}>
                <Text style={{ color: PRIORITY_COLORS[task.priority || "MEDIUM"], fontSize: 10, fontWeight: "700" }}>{priorityLabel(task.priority || "MEDIUM")}</Text>
              </View>
            </View>
            {task.description ? <Text style={styles.taskDesc}>{task.description}</Text> : null}
            <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
              {task.dueDate ? <Text style={styles.taskMeta}><Ionicons name="calendar-outline" size={11} /> {task.dueDate}</Text> : null}
              {task.category ? <Text style={styles.taskMeta}><Ionicons name="pricetag-outline" size={11} /> {catLabel(task.category)}</Text> : null}
              {task.progress > 0 ? <Text style={styles.taskMeta}>{task.progress}%</Text> : null}
            </View>
            {task.progress > 0 ? (
              <View style={styles.progressBg}>
                <View style={[styles.progressBar, { width: `${Math.min(task.progress, 100)}%`, backgroundColor: task.isCompleted ? "#22c55e" : PRIORITY_COLORS[task.priority || "MEDIUM"] }]} />
              </View>
            ) : null}
          </View>
          <TouchableOpacity onPress={() => deleteTask(task.id)} style={{ padding: 6 }}>
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );

  const renderLeaveTab = () => (
    <View>
      <TouchableOpacity style={styles.smallAddButton} onPress={() => { setFormLeave(EMPTY_LEAVE); setLeaveModalVisible(true); }}>
        <Ionicons name="add" size={16} color="#fff" />
        <Text style={styles.smallAddButtonText}>{t("add_leave_record")}</Text>
      </TouchableOpacity>
      {personLeave.length === 0 ? (
        <Text style={styles.emptyText}>{t("no_leave_history")}</Text>
      ) : personLeave.map(leave => (
        <View key={leave.id} style={styles.leaveCard}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={styles.leaveType}>{leaveTypeLabel(leave.leave_type)}</Text>
              <View style={[styles.statusBadge, { backgroundColor: leave.status === "APPROVED" ? "#dcfce7" : "#fef3c7" }]}>
                <Text style={{ color: leave.status === "APPROVED" ? "#16a34a" : "#d97706", fontSize: 10, fontWeight: "700" }}>{t(`leave_status_${leave.status?.toLowerCase() || "approved"}`)}</Text>
              </View>
            </View>
            <Text style={styles.leaveDates}>{leave.start_date} → {leave.end_date} ({leave.days} {t("days")})</Text>
            {leave.notes ? <Text style={styles.leaveNote}>{leave.notes}</Text> : null}
          </View>
          <TouchableOpacity onPress={() => deleteLeaveRecord(leave.id)}>
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );

  const renderAssetsTab = () => (
    <View>
      {personAssets.length === 0 ? (
        <Text style={styles.emptyText}>{t("no_assets_assigned")}</Text>
      ) : personAssets.map(asset => (
        <View key={asset.id} style={styles.leaveCard}>
          <Ionicons name="hardware-chip-outline" size={22} color={Colors.primary} style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: "700", color: "#1f2937" }}>{asset.name}</Text>
            <Text style={{ fontSize: 12, color: "#6b7280" }}>{asset.model || ""} {asset.serial_number ? `| ${asset.serial_number}` : ""}</Text>
          </View>
        </View>
      ))}
    </View>
  );

  const renderPersonnelDetail = () => (
    <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
      {/* Header */}
      <View style={styles.detailHeader}>
        <TouchableOpacity onPress={() => setSelectedPerson(null)} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={Colors.primary} />
          <Text style={styles.backButtonText}>{t("return_to_list")}</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <TouchableOpacity onPress={() => openEditPerson(selectedPerson)}><Text style={styles.actionBlue}>{t("edit")}</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => confirmDeletePerson(selectedPerson)}><Text style={styles.actionRed}>{t("delete")}</Text></TouchableOpacity>
        </View>
      </View>
      {/* Avatar */}
      <View style={{ alignItems: "center", marginBottom: 16 }}>
        <View style={[styles.personAvatar, { width: 72, height: 72, borderRadius: 36 }]}>
          <Text style={[styles.avatarText, { fontSize: 28 }]}>{selectedPerson.name.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.detailName}>{selectedPerson.name}</Text>
        <Text style={styles.detailRole}>{selectedPerson.role}</Text>
        {selectedPerson.phone ? <Text style={styles.detailPhone}>{selectedPerson.phone}</Text> : null}
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[selectedPerson.status || "ACTIVE"] + "22", marginTop: 6 }]}>
          <Text style={{ color: STATUS_COLORS[selectedPerson.status || "ACTIVE"], fontWeight: "700" }}>{statusLabel(selectedPerson.status || "ACTIVE")}</Text>
        </View>
      </View>
      {/* Tabs */}
      <View style={styles.tabRow}>
        {[
          { key: "info", icon: "person-outline", label: t("info_tab") },
          { key: "tasks", icon: "checkmark-done-outline", label: t("tasks_tab") },
          { key: "leave", icon: "calendar-outline", label: t("leave_tab") },
          { key: "assets", icon: "key-outline", label: t("assets_tab") },
        ].map(tab => (
          <TouchableOpacity key={tab.key} style={[styles.tabBtn, activeTab === tab.key && styles.tabBtnActive]} onPress={() => setActiveTab(tab.key)}>
            <Ionicons name={tab.icon} size={14} color={activeTab === tab.key ? Colors.primary : "#6b7280"} />
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {/* Tab Content */}
      <View style={{ marginTop: 8 }}>
        {activeTab === "info" && renderInfoTab()}
        {activeTab === "tasks" && renderTasksTab()}
        {activeTab === "leave" && renderLeaveTab()}
        {activeTab === "assets" && renderAssetsTab()}
      </View>
    </ScrollView>
  );

  // ---- MODALS ----
  const SelectRow = ({ label, options, value, onSelect, labelFn }) => (
    <View style={{ marginBottom: 4 }}>
      <Text style={styles.inputLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {options.map(opt => (
          <TouchableOpacity key={opt} style={[styles.selectChip, value === opt && styles.selectChipActive]} onPress={() => onSelect(opt)}>
            <Text style={[styles.selectChipText, value === opt && styles.selectChipTextActive]}>{labelFn(opt)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderPersonnelModal = () => (
    <Modal visible={personnelModalVisible} animationType="slide" transparent>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{formPerson.id ? t("edit_personnel") : t("new_personnel")}</Text>
            <TouchableOpacity onPress={() => setPersonnelModalVisible(false)}><Ionicons name="close" size={24} color="#6b7280" /></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Required */}
            <Text style={styles.inputLabel}>{t("full_name")} <Text style={{ color: "red" }}>*</Text></Text>
            <TextInput style={styles.input} value={formPerson.name} onChangeText={v => setFormPerson({ ...formPerson, name: v })} placeholder="Örn: Ahmet Yılmaz" />
            <Text style={styles.inputLabel}>{t("title_position")} <Text style={{ color: "red" }}>*</Text></Text>
            <TextInput style={styles.input} value={formPerson.role} onChangeText={v => setFormPerson({ ...formPerson, role: v })} placeholder="Örn: Satış Uzmanı" />
            {/* New fields */}
            <Text style={styles.inputLabel}>{t("department")}</Text>
            <TextInput style={styles.input} value={formPerson.department} onChangeText={v => setFormPerson({ ...formPerson, department: v })} placeholder="Örn: Satış" />
            <Text style={styles.inputLabel}>{t("emp_email")}</Text>
            <TextInput style={styles.input} value={formPerson.email} onChangeText={v => setFormPerson({ ...formPerson, email: v })} keyboardType="email-address" placeholder="Örn: ahmet@firma.com" />
            <Text style={styles.inputLabel}>{t("national_id")}</Text>
            <TextInput style={styles.input} value={formPerson.national_id} onChangeText={v => setFormPerson({ ...formPerson, national_id: v })} keyboardType="numeric" placeholder="11 haneli TC kimlik no" />
            <Text style={styles.inputLabel}>{t("phone")}</Text>
            <TextInput style={styles.input} value={formPerson.phone} onChangeText={v => setFormPerson({ ...formPerson, phone: v })} keyboardType="phone-pad" placeholder="0555..." />
            <Text style={styles.inputLabel}>{t("hire_date_format")}</Text>
            <TextInput style={styles.input} value={formPerson.hireDate} onChangeText={v => setFormPerson({ ...formPerson, hireDate: v })} placeholder="01.01.2023" />
            <SelectRow label={t("employment_type")} options={EMP_TYPES} value={formPerson.employment_type || "FULL_TIME"} onSelect={v => setFormPerson({ ...formPerson, employment_type: v })} labelFn={empTypeLabel} />
            <SelectRow label={t("emp_status")} options={EMP_STATUSES} value={formPerson.status || "ACTIVE"} onSelect={v => setFormPerson({ ...formPerson, status: v })} labelFn={statusLabel} />
            <Text style={styles.inputLabel}>{t("salary")}</Text>
            <TextInput style={styles.input} value={formPerson.salary?.toString()} onChangeText={v => setFormPerson({ ...formPerson, salary: v })} keyboardType="numeric" placeholder="Örn: 35000" />
            <Text style={styles.inputLabel}>{t("leave_entitlement_days")}</Text>
            <TextInput style={styles.input} value={formPerson.annualLeaveEntitlement?.toString()} onChangeText={v => setFormPerson({ ...formPerson, annualLeaveEntitlement: v })} keyboardType="numeric" placeholder="14" />
            <Text style={styles.inputLabel}>{t("emergency_contact")}</Text>
            <TextInput style={styles.input} value={formPerson.emergency_contact} onChangeText={v => setFormPerson({ ...formPerson, emergency_contact: v })} placeholder="Yakın kişi adı" />
            <Text style={styles.inputLabel}>{t("emergency_phone")}</Text>
            <TextInput style={styles.input} value={formPerson.emergency_phone} onChangeText={v => setFormPerson({ ...formPerson, emergency_phone: v })} keyboardType="phone-pad" placeholder="0555..." />
            <Text style={styles.inputLabel}>{t("performance_score")} (0-10)</Text>
            <TextInput style={styles.input} value={formPerson.performance_score?.toString()} onChangeText={v => setFormPerson({ ...formPerson, performance_score: v })} keyboardType="numeric" placeholder="8.5" />
            <Text style={styles.inputLabel}>{t("notes_field")}</Text>
            <TextInput style={[styles.input, { height: 70, textAlignVertical: "top" }]} value={formPerson.notes} onChangeText={v => setFormPerson({ ...formPerson, notes: v })} multiline placeholder="..." />
          </ScrollView>
          <View style={styles.modalButtons}>
            <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setPersonnelModalVisible(false)}><Text style={styles.cancelBtnText}>{t("cancel")}</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={savePersonnel}><Text style={styles.saveBtnText}>{t("save")}</Text></TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  const renderTaskModal = () => (
    <Modal visible={taskModalVisible} animationType="slide" transparent>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t("assign_new_task")}</Text>
            <TouchableOpacity onPress={() => setTaskModalVisible(false)}><Ionicons name="close" size={24} color="#6b7280" /></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.inputLabel}>{t("task_title")} <Text style={{ color: "red" }}>*</Text></Text>
            <TextInput style={styles.input} value={formTask.title} onChangeText={v => setFormTask({ ...formTask, title: v })} placeholder="Görev başlığı" />
            <Text style={styles.inputLabel}>{t("description_optional")}</Text>
            <TextInput style={[styles.input, { height: 70, textAlignVertical: "top" }]} value={formTask.description} onChangeText={v => setFormTask({ ...formTask, description: v })} multiline placeholder="Detaylar..." />
            <SelectRow label={t("task_priority")} options={PRIORITIES} value={formTask.priority || "MEDIUM"} onSelect={v => setFormTask({ ...formTask, priority: v })} labelFn={priorityLabel} />
            <SelectRow label={t("task_category")} options={TASK_CATEGORIES} value={formTask.category || "GENERAL"} onSelect={v => setFormTask({ ...formTask, category: v })} labelFn={catLabel} />
            <Text style={styles.inputLabel}>{t("task_start_date")}</Text>
            <TextInput style={styles.input} value={formTask.startDate} onChangeText={v => setFormTask({ ...formTask, startDate: v })} placeholder="GG.AA.YYYY" />
            <Text style={styles.inputLabel}>{t("due_date_format")}</Text>
            <TextInput style={styles.input} value={formTask.dueDate} onChangeText={v => setFormTask({ ...formTask, dueDate: v })} placeholder="GG.AA.YYYY" />
            <Text style={styles.inputLabel}>{t("estimated_hours")}</Text>
            <TextInput style={styles.input} value={formTask.estimatedHours?.toString()} onChangeText={v => setFormTask({ ...formTask, estimatedHours: v })} keyboardType="numeric" placeholder="Örn: 4" />
            <Text style={styles.inputLabel}>{t("task_progress")} (0-100)</Text>
            <TextInput style={styles.input} value={formTask.progress?.toString()} onChangeText={v => setFormTask({ ...formTask, progress: parseInt(v) || 0 })} keyboardType="numeric" placeholder="0" />
          </ScrollView>
          <View style={styles.modalButtons}>
            <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setTaskModalVisible(false)}><Text style={styles.cancelBtnText}>{t("cancel")}</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={saveTask}><Text style={styles.saveBtnText}>{t("assign_task")}</Text></TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  const renderLeaveModal = () => (
    <Modal visible={leaveModalVisible} animationType="slide" transparent>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t("new_leave_record")}</Text>
            <TouchableOpacity onPress={() => setLeaveModalVisible(false)}><Ionicons name="close" size={24} color="#6b7280" /></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <SelectRow label={t("leave_type")} options={LEAVE_TYPES} value={formLeave.leave_type} onSelect={v => setFormLeave({ ...formLeave, leave_type: v })} labelFn={leaveTypeLabel} />
            <Text style={styles.inputLabel}>{t("leave_start")} <Text style={{ color: "red" }}>*</Text></Text>
            <TextInput style={styles.input} value={formLeave.start_date} onChangeText={v => setFormLeave({ ...formLeave, start_date: v })} placeholder="YYYY-MM-DD" />
            <Text style={styles.inputLabel}>{t("leave_end")} <Text style={{ color: "red" }}>*</Text></Text>
            <TextInput style={styles.input} value={formLeave.end_date} onChangeText={v => setFormLeave({ ...formLeave, end_date: v })} placeholder="YYYY-MM-DD" />
            <Text style={styles.inputLabel}>{t("leave_days_count")} <Text style={{ color: "red" }}>*</Text></Text>
            <TextInput style={styles.input} value={formLeave.days?.toString()} onChangeText={v => setFormLeave({ ...formLeave, days: v })} keyboardType="numeric" placeholder="5" />
            <SelectRow label={t("leave_status")} options={["APPROVED","PENDING","REJECTED"]} value={formLeave.status} onSelect={v => setFormLeave({ ...formLeave, status: v })} labelFn={v => t(`leave_status_${v.toLowerCase()}`)} />
            <Text style={styles.inputLabel}>{t("leave_notes")}</Text>
            <TextInput style={[styles.input, { height: 60, textAlignVertical: "top" }]} value={formLeave.notes} onChangeText={v => setFormLeave({ ...formLeave, notes: v })} multiline placeholder="..." />
          </ScrollView>
          <View style={styles.modalButtons}>
            <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setLeaveModalVisible(false)}><Text style={styles.cancelBtnText}>{t("cancel")}</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={saveLeave}><Text style={styles.saveBtnText}>{t("add_leave")}</Text></TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  return (
    <ImmersiveLayout
      title={t("personnel_management")}
      subtitle={selectedPerson ? t("personnel_details_tasks") : `${filteredPersonnel.length} ${t("personnel")}`}
      onGoBack={() => navigation.goBack()}
    >
      <View style={{ flex: 1, padding: 16 }}>
        {selectedPerson ? renderPersonnelDetail() : renderPersonnelList()}
      </View>
      {renderPersonnelModal()}
      {renderTaskModal()}
      {renderLeaveModal()}
    </ImmersiveLayout>
  );
}

const styles = StyleSheet.create({
  // KPI
  kpiRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  kpiCard: { flex: 1, padding: 10, borderRadius: 12, alignItems: "center" },
  kpiIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  kpiValue: { fontSize: 18, fontWeight: "800" },
  kpiLabel: { fontSize: 10, color: "#6b7280", fontWeight: "600", textAlign: "center" },
  // Filters
  filterWrap: { marginBottom: 12 },
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", paddingHorizontal: 12, borderRadius: 12, height: 44, borderWidth: 1, borderColor: "#e5e7eb" },
  filterChip: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 16, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb", flexDirection: "row", alignItems: "center" },
  filterChipActive: { backgroundColor: "#eff6ff", borderColor: Colors.primary },
  filterChipText: { fontSize: 12, color: "#6b7280", fontWeight: "600" },
  filterChipTextActive: { color: Colors.primary },
  // Add button
  addButtonBlock: { backgroundColor: Colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 12, borderRadius: 12, marginBottom: 12 },
  addButtonText: { color: "#fff", fontWeight: "700", marginLeft: 6, fontSize: 15 },
  // Table
  tableHeader: { flexDirection: "row", backgroundColor: "#f3f4f6", borderRadius: 8, overflow: "hidden" },
  tableHeaderCell: { color: "#374151", fontWeight: "700", fontSize: 12 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  tableCell: { padding: 10, fontSize: 13, color: "#374151", justifyContent: "center" },
  // Card
  personCard: { backgroundColor: "#fff", flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 14, marginBottom: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  personAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#eff6ff", alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 18, fontWeight: "800", color: Colors.primary },
  avatarSmall: { width: 26, height: 26, borderRadius: 13, backgroundColor: "#eff6ff", alignItems: "center", justifyContent: "center" },
  avatarSmallText: { fontSize: 11, fontWeight: "800", color: Colors.primary },
  personName: { fontSize: 15, fontWeight: "700", color: "#1f2937" },
  personRole: { fontSize: 13, color: "#6b7280", marginTop: 1 },
  personDept: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
  chipText: { fontSize: 11, color: Colors.primary, fontWeight: "600" },
  statusBadge: { paddingVertical: 2, paddingHorizontal: 7, borderRadius: 8 },
  taskBadge: { backgroundColor: "#8b5cf6", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  // Detail
  detailHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  backButton: { flexDirection: "row", alignItems: "center" },
  backButtonText: { color: Colors.primary, marginLeft: 4, fontWeight: "600" },
  detailName: { fontSize: 22, fontWeight: "800", color: "#1f2937", marginTop: 10 },
  detailRole: { fontSize: 16, color: Colors.primary, fontWeight: "600", marginTop: 2 },
  detailPhone: { fontSize: 14, color: "#6b7280", marginTop: 2 },
  actionBlue: { color: Colors.primary, fontWeight: "700", fontSize: 14 },
  actionRed: { color: "#ef4444", fontWeight: "700", fontSize: 14 },
  // Tabs
  tabRow: { flexDirection: "row", backgroundColor: "#f3f4f6", borderRadius: 12, padding: 4, marginBottom: 8 },
  tabBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 8, borderRadius: 10 },
  tabBtnActive: { backgroundColor: "#fff", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 1 },
  tabText: { fontSize: 11, color: "#6b7280", fontWeight: "600" },
  tabTextActive: { color: Colors.primary, fontWeight: "700" },
  // Info
  detailCard: { backgroundColor: "#fff", padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: "#f3f4f6" },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f9fafb" },
  infoLabel: { color: "#6b7280", fontWeight: "600", fontSize: 13 },
  infoValue: { color: "#1f2937", fontWeight: "700", fontSize: 13, maxWidth: "55%", textAlign: "right" },
  // Tasks
  smallAddButton: { backgroundColor: "#22c55e", flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, alignSelf: "flex-end", marginBottom: 10 },
  smallAddButtonText: { color: "#fff", fontWeight: "700", fontSize: 12, marginLeft: 4 },
  taskCard: { backgroundColor: "#fff", flexDirection: "row", alignItems: "flex-start", padding: 12, borderRadius: 12, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: "#3b82f6", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, elevation: 1 },
  taskTitle: { fontSize: 14, fontWeight: "700", color: "#1f2937", flex: 1 },
  taskDesc: { fontSize: 12, color: "#6b7280", marginTop: 3 },
  taskMeta: { fontSize: 11, color: "#9ca3af" },
  priorityBadge: { paddingVertical: 2, paddingHorizontal: 6, borderRadius: 6 },
  progressBg: { height: 4, backgroundColor: "#f3f4f6", borderRadius: 4, marginTop: 8, overflow: "hidden" },
  progressBar: { height: 4, borderRadius: 4 },
  // Leave
  leaveCard: { backgroundColor: "#fff", flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: "#f3f4f6" },
  leaveType: { fontSize: 14, fontWeight: "700", color: "#1f2937" },
  leaveDates: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  leaveNote: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  // Empty
  emptyText: { textAlign: "center", color: "#9ca3af", marginTop: 24, fontSize: 15 },
  // Modal
  modalContainer: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  modalContent: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "90%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#1f2937" },
  inputLabel: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: "#f9fafb", padding: 13, borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb", fontSize: 15, color: "#1f2937" },
  modalButtons: { flexDirection: "row", marginTop: 20, gap: 10 },
  modalBtn: { flex: 1, padding: 15, borderRadius: 14, alignItems: "center" },
  cancelBtn: { backgroundColor: "#f3f4f6" },
  saveBtn: { backgroundColor: Colors.primary },
  cancelBtnText: { color: "#6b7280", fontWeight: "700" },
  saveBtnText: { color: "#fff", fontWeight: "700" },
  selectChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: "#f3f4f6", borderWidth: 1, borderColor: "#e5e7eb" },
  selectChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  selectChipText: { fontSize: 13, color: "#374151", fontWeight: "600" },
  selectChipTextActive: { color: "#fff" },
});