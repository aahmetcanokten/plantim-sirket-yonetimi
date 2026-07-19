import React, { useContext, useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Keyboard,
  ScrollView,
  Platform,
  Dimensions,
  Animated,
} from "react-native";
import { useTranslation } from "react-i18next";
import ImmersiveLayout from "../components/ImmersiveLayout";
import { AppContext } from "../AppContext";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../Theme";
import KeyboardSafeView from "../components/KeyboardSafeView";
import { useToast } from "../components/ToastProvider";
import BarcodeScannerModal from "../components/BarcodeScannerModal";

// ─── Design tokens ────────────────────────────────────────────────────────────
const SECTION_COLORS = {
  general:     { accent: "#2563EB", bg: "#EFF6FF", icon: "#2563EB" },
  stock:       { accent: "#059669", bg: "#ECFDF5", icon: "#059669" },
  identifiers: { accent: "#7C3AED", bg: "#F5F3FF", icon: "#7C3AED" },
};

// ─── Focused TextInput wrapper (web hover/focus styles) ──────────────────────
function SmartInput({
  label, value, onChangeText, placeholder,
  icon, iconColor = Colors.secondary,
  keyboardType = "default", selectOnFocus = true,
  extraProps = {}, suffix = null, onSuffixPress = null,
  required = false,
}) {
  const [focused, setFocused] = useState(false);

  const containerStyle = [
    styles.input,
    focused && styles.inputFocused,
  ];

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>
        {label}
        {required && <Text style={styles.requiredMark}> *</Text>}
      </Text>
      <View style={[styles.inputWrapper, focused && styles.inputWrapperFocused]}>
        {icon && (
          <View style={styles.iconContainer}>
            <Ionicons name={icon} size={16} color={focused ? iconColor : "#94A3B8"} />
          </View>
        )}
        <TextInput
          style={[containerStyle, icon ? { paddingLeft: 44 } : {}, suffix ? { paddingRight: 50 } : {}]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#CBD5E1"
          keyboardType={keyboardType}
          selectTextOnFocus={selectOnFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...extraProps}
        />
        {suffix && (
          <TouchableOpacity
            onPress={onSuffixPress}
            style={styles.suffixButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {suffix}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Section card component ───────────────────────────────────────────────────
function SectionCard({ title, icon, colorKey, children }) {
  const theme = SECTION_COLORS[colorKey] || SECTION_COLORS.general;
  return (
    <View style={[styles.sectionCard, Platform.OS === "web" && styles.webSectionCard]}>
      {/* Section header */}
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIconBadge, { backgroundColor: theme.bg }]}>
          <Ionicons name={icon} size={16} color={theme.icon} />
        </View>
        <Text style={[styles.sectionTitle, { color: theme.accent }]}>{title}</Text>
        <View style={[styles.sectionDivider, { backgroundColor: theme.accent, opacity: 0.15 }]} />
      </View>
      {children}
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function AddProductScreen({ navigation, route }) {
  const { addProduct, updateProduct, products, isPremium } = useContext(AppContext);
  const toast = useToast();
  const { t } = useTranslation();
  const saveScale = useRef(new Animated.Value(1)).current;

  const editingProduct = route.params?.product || null;
  const isEditing = !!editingProduct;
  const screenWidth = Dimensions.get("window").width;
  const isLargeWeb = Platform.OS === "web" && screenWidth > 768;

  const [name, setName]                       = useState(editingProduct?.name || "");
  const [category, setCategory]               = useState(editingProduct?.category || "");
  const [brand, setBrand]                     = useState(editingProduct?.brand || "");
  const [unit, setUnit]                       = useState(editingProduct?.unit || "uom_pcs");
  const [quantity, setQuantity]               = useState(editingProduct ? String(editingProduct.quantity) : "0");
  const [cost, setCost]                       = useState(editingProduct ? String(editingProduct.cost) : "");
  const [price, setPrice]                     = useState(editingProduct ? String(editingProduct.price) : "");
  const [taxRate, setTaxRate]                 = useState(editingProduct ? String(editingProduct.taxRate || 20) : "20");
  const [serialNumber, setSerialNumber]       = useState(editingProduct?.serialNumber || "");
  const [code, setCode]                       = useState(editingProduct?.code || "");
  const [warehouseLocation, setWarehouseLocation] = useState(editingProduct?.warehouseLocation || "");
  const [supplier, setSupplier]               = useState(editingProduct?.supplier || "");
  const [description, setDescription]         = useState(editingProduct?.description || "");
  const [criticalStockLimit, setCriticalStockLimit] = useState(editingProduct ? String(editingProduct.criticalStockLimit) : "5");
  const [scannerVisible, setScannerVisible]   = useState(false);
  const [isSaving, setIsSaving]               = useState(false);

  useEffect(() => {
    if (editingProduct) {
      setName(editingProduct.name || "");
      setCategory(editingProduct.category || "");
      setBrand(editingProduct.brand || "");
      setUnit(editingProduct.unit || "uom_pcs");
      setQuantity(String(editingProduct.quantity || 0));
      setCost(String(editingProduct.cost || 0));
      setPrice(String(editingProduct.price || 0));
      setTaxRate(String(editingProduct.taxRate || 20));
      setSerialNumber(editingProduct.serialNumber || "");
      setCode(editingProduct.code || "");
      setWarehouseLocation(editingProduct.warehouseLocation || "");
      setSupplier(editingProduct.supplier || "");
      setDescription(editingProduct.description || "");
      setCriticalStockLimit(String(editingProduct.criticalStockLimit || 5));
    }
  }, [editingProduct]);

  const resetForm = () => {
    setName(""); setCategory(""); setBrand(""); setUnit("uom_pcs");
    setQuantity("0"); setCost(""); setPrice(""); setTaxRate("20");
    setSerialNumber(""); setCode(""); setWarehouseLocation("");
    setSupplier(""); setDescription(""); setCriticalStockLimit("5");
  };

  const animateSave = () => {
    Animated.sequence([
      Animated.timing(saveScale, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.timing(saveScale, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  };

  const handleSave = async () => {
    Keyboard.dismiss();
    if (!name.trim()) {
      Alert.alert(t("error"), t("product_name_required"));
      return;
    }
    animateSave();
    setIsSaving(true);

    const productData = {
      name: name.trim(), category: category.trim(), brand: brand.trim(),
      unit, quantity: parseInt(quantity, 10) || 0,
      cost: parseFloat(cost) || 0, price: parseFloat(price) || 0,
      taxRate: parseFloat(taxRate) || 20,
      serialNumber: serialNumber.trim(), code: code.trim(),
      warehouseLocation: warehouseLocation.trim(), supplier: supplier.trim(),
      description: description.trim(),
      criticalStockLimit: parseInt(criticalStockLimit, 10) || 0,
    };

    if (isEditing) {
      const success = await updateProduct({ ...productData, id: editingProduct.id });
      setIsSaving(false);
      if (success !== false) {
        toast.showToast && toast.showToast(`${productData.name} ${t("updated")}`);
        navigation.goBack();
      }
      return;
    }

    if (!isPremium && products.length >= 5) {
      setIsSaving(false);
      Alert.alert(t("limit_exceeded"), t("limit_exceeded_add_product"), [
        { text: t("cancel"), style: "cancel" },
        { text: t("get_premium"), onPress: () => navigation.navigate("Paywall") },
      ]);
      return;
    }

    const success = await addProduct(productData);
    setIsSaving(false);
    if (success) {
      resetForm();
      toast.showToast && toast.showToast(`${productData.name} ${t("added_to_stock")}`);
      if (Platform.OS === "web") {
        navigation.navigate("Stok");
      } else {
        navigation.goBack();
      }
    }
  };

  const handleScan = (data) => {
    setCode(data);
    setScannerVisible(false);
    toast.showToast && toast.showToast(`${t("barcode_scanned")}: ${data}`);
  };

  // ── Unit selector ──────────────────────────────────────────────────────────
  const UnitSelector = () => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{t("unit")}</Text>
      <View style={styles.unitPicker}>
        {["uom_pcs", "uom_kg", "uom_m", "uom_lt"].map((u) => (
          <TouchableOpacity
            key={u}
            style={[styles.unitBtn, unit === u && styles.unitBtnActive]}
            onPress={() => setUnit(u)}
            activeOpacity={0.7}
          >
            {unit === u && (
              <View style={styles.unitBtnDot} />
            )}
            <Text style={[styles.unitBtnText, unit === u && styles.unitBtnTextActive]}>
              {t(u)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // ── Renders ────────────────────────────────────────────────────────────────
  return (
    <ImmersiveLayout
      title={isEditing ? t("edit_product") : t("add_new_product")}
      subtitle={isEditing ? editingProduct.name : t("new_product_subtitle")}
      showBackButton={true}
      navigation={navigation}
    >
      <KeyboardSafeView offsetIOS={120}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Page header (web only) ────────────────────────────────── */}
          {isLargeWeb && (
            <View style={styles.pageHeader}>
              <View style={styles.pageHeaderLeft}>
                <View style={styles.pageHeaderIcon}>
                  <Ionicons
                    name={isEditing ? "create-outline" : "cube-outline"}
                    size={22}
                    color="#2563EB"
                  />
                </View>
                <View>
                  <Text style={styles.pageTitle}>
                    {isEditing ? t("edit_product") : t("add_new_product")}
                  </Text>
                  <Text style={styles.pageSubtitle}>
                    {isEditing ? editingProduct.name : t("new_product_subtitle")}
                  </Text>
                </View>
              </View>
              {/* Quick-save top button */}
              <TouchableOpacity
                style={[styles.topSaveBtn, isSaving && styles.topSaveBtnDisabled]}
                onPress={isSaving ? null : handleSave}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={isEditing ? "checkmark-done-outline" : "add-circle-outline"}
                  size={18}
                  color="#fff"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.topSaveBtnText}>
                  {isSaving ? t("saving") || "Kaydediliyor…" : isEditing ? t("save_and_update") : t("add_to_stock")}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Form grid ────────────────────────────────────────────── */}
          <View style={isLargeWeb ? styles.formGrid : styles.mobileForm}>

            {/* ── SECTION 1: General Info ─────────────────────────── */}
            <SectionCard title={t("general")} icon="information-circle-outline" colorKey="general">
              <View style={isLargeWeb ? styles.row : null}>
                <SmartInput
                  label={t("product_name")}
                  required
                  value={name}
                  onChangeText={setName}
                  placeholder={t("product_name")}
                  icon="cube-outline"
                  iconColor="#2563EB"
                />
                <SmartInput
                  label={t("category")}
                  value={category}
                  onChangeText={setCategory}
                  placeholder={t("category")}
                  icon="folder-open-outline"
                  iconColor="#2563EB"
                />
              </View>
              <View style={isLargeWeb ? styles.row : null}>
                <SmartInput
                  label={t("brand")}
                  value={brand}
                  onChangeText={setBrand}
                  placeholder={t("brand")}
                  icon="pricetag-outline"
                  iconColor="#2563EB"
                />
                <UnitSelector />
              </View>
            </SectionCard>

            {/* ── SECTION 2: Stock & Pricing ──────────────────────── */}
            <SectionCard
              title={`${t("stock_label")} & ${t("cost_label")}`}
              icon="stats-chart-outline"
              colorKey="stock"
            >
              <View style={isLargeWeb ? styles.row : null}>
                <SmartInput
                  label={t("current_stock_quantity")}
                  value={quantity}
                  onChangeText={(text) => setQuantity(text.replace(/[^0-9]/g, ""))}
                  placeholder="0"
                  icon="stats-chart-outline"
                  iconColor="#059669"
                  keyboardType="number-pad"
                />
                <SmartInput
                  label={t("critical_stock_level")}
                  value={criticalStockLimit}
                  onChangeText={(text) => setCriticalStockLimit(text.replace(/[^0-9]/g, ""))}
                  placeholder="5"
                  icon="alert-circle-outline"
                  iconColor="#059669"
                  keyboardType="number-pad"
                />
              </View>
              <View style={isLargeWeb ? styles.row : null}>
                <SmartInput
                  label={`${t("purchase_price")} (₺)`}
                  value={cost}
                  onChangeText={(text) => setCost(text.replace(/[^0-9.]/g, ""))}
                  placeholder="0.00"
                  icon="cash-outline"
                  iconColor="#059669"
                  keyboardType="decimal-pad"
                />
                <SmartInput
                  label={`${t("sale_price")} (₺)`}
                  value={price}
                  onChangeText={(text) => setPrice(text.replace(/[^0-9.]/g, ""))}
                  placeholder="0.00"
                  icon="cart-outline"
                  iconColor="#059669"
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={isLargeWeb ? styles.row : null}>
                <SmartInput
                  label={t("tax_rate")}
                  value={taxRate}
                  onChangeText={(text) => setTaxRate(text.replace(/[^0-9]/g, ""))}
                  placeholder="20"
                  icon="receipt-outline"
                  iconColor="#059669"
                  keyboardType="number-pad"
                />
                <SmartInput
                  label={t("warehouse_location")}
                  value={warehouseLocation}
                  onChangeText={setWarehouseLocation}
                  placeholder={t("warehouse_location")}
                  icon="location-outline"
                  iconColor="#059669"
                />
              </View>
            </SectionCard>

            {/* ── SECTION 3: Identifiers ──────────────────────────── */}
            <SectionCard title={t("code_barcode_label")} icon="barcode-outline" colorKey="identifiers">
              <View style={isLargeWeb ? styles.row : null}>
                {/* Barcode input – custom suffix */}
                <SmartInput
                  label={t("product_code_barcode")}
                  value={code}
                  onChangeText={setCode}
                  placeholder={t("product_code_barcode")}
                  icon="barcode-outline"
                  iconColor="#7C3AED"
                  suffix={
                    <View style={styles.scanBadge}>
                      <Ionicons name="scan-outline" size={15} color="#7C3AED" />
                    </View>
                  }
                  onSuffixPress={() => setScannerVisible(true)}
                />
                <SmartInput
                  label={t("serial_number")}
                  value={serialNumber}
                  onChangeText={setSerialNumber}
                  placeholder={t("serial_number")}
                  icon="key-outline"
                  iconColor="#7C3AED"
                />
              </View>
              <View style={isLargeWeb ? styles.row : null}>
                <SmartInput
                  label={t("supplier")}
                  value={supplier}
                  onChangeText={setSupplier}
                  placeholder={t("supplier")}
                  icon="business-outline"
                  iconColor="#7C3AED"
                />
                <SmartInput
                  label={t("description")}
                  value={description}
                  onChangeText={setDescription}
                  placeholder={t("enter_details")}
                  icon="document-text-outline"
                  iconColor="#7C3AED"
                  extraProps={{ multiline: true, numberOfLines: 3, textAlignVertical: "top", style: { minHeight: 80 } }}
                />
              </View>
            </SectionCard>
          </View>

          {/* ── Action bar ───────────────────────────────────────── */}
          <View style={styles.actionBar}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="close-outline" size={18} color="#64748B" style={{ marginRight: 6 }} />
              <Text style={styles.cancelBtnText}>{t("cancel")}</Text>
            </TouchableOpacity>

            <Animated.View style={[{ transform: [{ scale: saveScale }] }, styles.saveButtonWrap]}>
              <TouchableOpacity
                style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
                onPress={isSaving ? null : handleSave}
                activeOpacity={0.85}
              >
                {isSaving ? (
                  <Ionicons name="hourglass-outline" size={20} color="#fff" style={{ marginRight: 10 }} />
                ) : (
                  <Ionicons
                    name={isEditing ? "checkmark-done-outline" : "save-outline"}
                    size={20}
                    color="#fff"
                    style={{ marginRight: 10 }}
                  />
                )}
                <Text style={styles.saveBtnText}>
                  {isSaving
                    ? t("saving") || "Kaydediliyor…"
                    : isEditing
                    ? t("save_and_update")
                    : t("add_to_stock")}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardSafeView>

      <BarcodeScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScanned={handleScan}
      />
    </ImmersiveLayout>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── Scroll container
  container: {
    flexGrow: 1,
    paddingTop: 8,
    paddingBottom: 48,
    paddingHorizontal: Platform.OS === "web" ? 0 : 0,
  },

  // ── Page header (web)
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 28,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  pageHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  pageHeaderIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  pageSubtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "500",
  },
  topSaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563EB",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    ...Platform.select({
      web: { cursor: "pointer", boxShadow: "0 4px 14px rgba(37,99,235,0.35)" },
    }),
  },
  topSaveBtnDisabled: {
    backgroundColor: "#93C5FD",
  },
  topSaveBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },

  // ── Grids
  formGrid: {
    width: "100%",
  },
  mobileForm: {
    width: "100%",
  },
  row: {
    flexDirection: "row",
    gap: 16,
  },

  // ── Section card
  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    padding: 20,
    marginBottom: 20,
  },
  webSectionCard: {
    borderRadius: 20,
    padding: 28,
    marginBottom: 24,
    ...Platform.select({
      web: { boxShadow: "0 2px 12px rgba(15,23,42,0.05)" },
    }),
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
    gap: 10,
  },
  sectionIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  sectionDivider: {
    flex: 1,
    height: 1,
    marginLeft: 4,
  },

  // ── Input group
  inputGroup: {
    flex: 1,
    marginBottom: 16,
    minWidth: 0,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 7,
    letterSpacing: 0.2,
  },
  requiredMark: {
    color: "#EF4444",
    fontWeight: "700",
  },
  inputWrapper: {
    position: "relative",
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    overflow: "hidden",
    ...Platform.select({
      web: { transition: "border-color 0.15s, box-shadow 0.15s" },
    }),
  },
  inputWrapperFocused: {
    borderColor: "#2563EB",
    backgroundColor: "#FAFBFF",
    ...Platform.select({
      web: { boxShadow: "0 0 0 3px rgba(37,99,235,0.12)" },
    }),
  },
  iconContainer: {
    position: "absolute",
    left: 13,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    zIndex: 1,
  },
  input: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: "#1E293B",
    fontWeight: "500",
    ...Platform.select({
      web: { outlineStyle: "none" },
    }),
  },
  inputFocused: {
    // handled via wrapper
  },
  suffixButton: {
    position: "absolute",
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  scanBadge: {
    backgroundColor: "#F5F3FF",
    borderRadius: 7,
    padding: 5,
    borderWidth: 1,
    borderColor: "#DDD6FE",
  },

  // ── Unit picker
  unitPicker: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    padding: 3,
    gap: 2,
  },
  unitBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    flexDirection: "row",
    gap: 4,
  },
  unitBtnActive: {
    backgroundColor: "#fff",
    ...Platform.select({
      web: { boxShadow: "0 1px 4px rgba(0,0,0,0.1)" },
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
      android: { elevation: 2 },
    }),
  },
  unitBtnDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#2563EB",
  },
  unitBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94A3B8",
  },
  unitBtnTextActive: {
    color: "#2563EB",
    fontWeight: "700",
  },

  // ── Action bar
  actionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 8,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    backgroundColor: "#fff",
    ...Platform.select({
      web: { cursor: "pointer" },
    }),
  },
  cancelBtnText: {
    color: "#64748B",
    fontWeight: "600",
    fontSize: 14,
  },
  saveButtonWrap: {
    borderRadius: 12,
    overflow: "hidden",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 12,
    minWidth: 200,
    ...Platform.select({
      web: { cursor: "pointer", boxShadow: "0 6px 20px rgba(37,99,235,0.35)" },
      ios: { shadowColor: "#2563EB", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  saveBtnDisabled: {
    backgroundColor: "#93C5FD",
    ...Platform.select({
      web: { boxShadow: "none", cursor: "not-allowed" },
    }),
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
    letterSpacing: 0.2,
  },
});
