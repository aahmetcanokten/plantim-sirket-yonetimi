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
  Dimensions
} from "react-native";
import { useTranslation } from "react-i18next";
import ImmersiveLayout from "../components/ImmersiveLayout";
import { AppContext } from "../AppContext";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../Theme";
import KeyboardSafeView from "../components/KeyboardSafeView";
import { useToast } from "../components/ToastProvider";
import BarcodeScannerModal from "../components/BarcodeScannerModal";

export default function AddProductScreen({ navigation, route }) {
  const { addProduct, updateProduct, products, isPremium } = useContext(AppContext);
  const toast = useToast();
  const { t } = useTranslation();

  const editingProduct = route.params?.product || null;
  const isEditing = !!editingProduct;
  const screenWidth = Dimensions.get('window').width;
  const isLargeWeb = Platform.OS === 'web' && screenWidth > 768;

  const [name, setName] = useState(editingProduct?.name || "");
  const [category, setCategory] = useState(editingProduct?.category || "");
  const [brand, setBrand] = useState(editingProduct?.brand || "");
  const [unit, setUnit] = useState(editingProduct?.unit || "uom_pcs");
  const [quantity, setQuantity] = useState(editingProduct ? String(editingProduct.quantity) : "0");
  const [cost, setCost] = useState(editingProduct ? String(editingProduct.cost) : "");
  const [price, setPrice] = useState(editingProduct ? String(editingProduct.price) : "");
  const [taxRate, setTaxRate] = useState(editingProduct ? String(editingProduct.taxRate || 20) : "20");
  const [serialNumber, setSerialNumber] = useState(editingProduct?.serialNumber || "");
  const [code, setCode] = useState(editingProduct?.code || "");
  const [warehouseLocation, setWarehouseLocation] = useState(editingProduct?.warehouseLocation || "");
  const [supplier, setSupplier] = useState(editingProduct?.supplier || "");
  const [description, setDescription] = useState(editingProduct?.description || "");
  const [criticalStockLimit, setCriticalStockLimit] = useState(editingProduct ? String(editingProduct.criticalStockLimit) : "5");
  const [scannerVisible, setScannerVisible] = useState(false);

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
    setName("");
    setCategory("");
    setBrand("");
    setUnit("uom_pcs");
    setQuantity("0");
    setCost("");
    setPrice("");
    setTaxRate("20");
    setSerialNumber("");
    setCode("");
    setWarehouseLocation("");
    setSupplier("");
    setDescription("");
    setCriticalStockLimit("5");
  };

  const handleSave = async () => {
    Keyboard.dismiss();

    if (!name.trim()) {
      Alert.alert(t('error'), t('product_name_required'));
      return;
    }

    const productData = {
      name: name.trim(),
      category: category.trim(),
      brand: brand.trim(),
      unit: unit,
      quantity: parseInt(quantity, 10) || 0,
      cost: parseFloat(cost) || 0,
      price: parseFloat(price) || 0,
      taxRate: parseFloat(taxRate) || 20,
      serialNumber: serialNumber.trim(),
      code: code.trim(),
      warehouseLocation: warehouseLocation.trim(),
      supplier: supplier.trim(),
      description: description.trim(),
      criticalStockLimit: parseInt(criticalStockLimit, 10) || 0,
    };

    if (isEditing) {
      const success = await updateProduct({ ...productData, id: editingProduct.id });
      if (success !== false) { // Context updateProduct doesn't return bool but we check for failure
        toast.showToast && toast.showToast(`${productData.name} ${t('updated')}`);
        navigation.goBack();
      }
      return;
    }

    if (!isPremium && products.length >= 5) {
      Alert.alert(
        t('limit_exceeded'),
        t('limit_exceeded_add_product'),
        [
          { text: t('cancel'), style: "cancel" },
          { text: t('get_premium'), onPress: () => navigation.navigate("Paywall") }
        ]
      );
      return;
    }

    const success = await addProduct(productData);

    if (success) {
      resetForm();
      toast.showToast && toast.showToast(`${productData.name} ${t('added_to_stock')}`);
      if (Platform.OS === 'web') {
        navigation.navigate("MainTabs", { screen: 'Stok' });
      } else {
        navigation.goBack();
      }
    }
  };

  const handleScan = (data) => {
    setCode(data);
    setScannerVisible(false);
    toast.showToast && toast.showToast(`${t('barcode_scanned')}: ${data}`);
  };

  const renderInput = (label, value, onChangeText, placeholder, icon, keyboardType = 'default', selectOnFocus = true, extraProps = {}) => (
    <View style={[styles.inputGroup, isLargeWeb && styles.webInputGroup]}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputWrapper}>
        {icon && <Ionicons name={icon} size={20} color={Colors.secondary} style={styles.inputIcon} />}
        <TextInput
          style={[styles.input, icon ? { paddingLeft: 45 } : {}]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.muted}
          keyboardType={keyboardType}
          selectTextOnFocus={selectOnFocus}
          {...extraProps}
        />
      </View>
    </View>
  );

  return (
    <ImmersiveLayout
      title={isEditing ? t('edit_product') : t('add_new_product')}
      subtitle={isEditing ? editingProduct.name : t('new_product_subtitle')}
      showBackButton={true}
      navigation={navigation}
    >
      <KeyboardSafeView offsetIOS={120}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

          <View style={isLargeWeb ? styles.webFormGrid : styles.mobileForm}>

            {/* Temel Bilgiler Bölümü */}
            <View style={isLargeWeb ? styles.webSection : styles.section}>
              <Text style={styles.sectionTitle}>{t('general')}</Text>

              <View style={isLargeWeb ? styles.webRow : null}>
                {renderInput(t('product_name') + " *", name, setName, t('product_name'), "cube-outline")}
                {renderInput(t('category'), category, setCategory, t('category'), "folder-open-outline")}
              </View>

              <View style={isLargeWeb ? styles.webRow : null}>
                {renderInput(t('brand'), brand, setBrand, t('brand'), "pricetag-outline")}
                <View style={[styles.inputGroup, isLargeWeb && styles.webInputGroup]}>
                  <Text style={styles.inputLabel}>{t('unit')}</Text>
                  <View style={styles.unitPicker}>
                    {['uom_pcs', 'uom_kg', 'uom_m', 'uom_lt'].map((u) => (
                      <TouchableOpacity
                        key={u}
                        style={[styles.unitBtn, unit === u && styles.unitBtnActive]}
                        onPress={() => setUnit(u)}
                      >
                        <Text style={[styles.unitBtnText, unit === u && styles.unitBtnTextActive]}>{t(u)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </View>

            {/* Stok ve Fiyat Bölümü */}
            <View style={isLargeWeb ? styles.webSection : styles.section}>
              <Text style={styles.sectionTitle}>{t('stock_label')} & {t('cost_label')}</Text>

              <View style={isLargeWeb ? styles.webRow : null}>
                {renderInput(t('current_stock_quantity'), quantity, (text) => setQuantity(text.replace(/[^0-9]/g, '')), "0", "stats-chart-outline", "number-pad")}
                {renderInput(t('critical_stock_level'), criticalStockLimit, (text) => setCriticalStockLimit(text.replace(/[^0-9]/g, '')), "5", "alert-circle-outline", "number-pad")}
              </View>

              <View style={isLargeWeb ? styles.webRow : null}>
                {renderInput(t('purchase_price') + " (₺)", cost, (text) => setCost(text.replace(/[^0-9.]/g, '')), "0.00", "cash-outline", "decimal-pad")}
                {renderInput(t('sale_price') + " (₺)", price, (text) => setPrice(text.replace(/[^0-9.]/g, '')), "0.00", "cart-outline", "decimal-pad")}
              </View>

              <View style={isLargeWeb ? styles.webRow : null}>
                {renderInput(t('tax_rate'), taxRate, (text) => setTaxRate(text.replace(/[^0-9]/g, '')), "20", "receipt-outline", "number-pad")}
                {renderInput(t('warehouse_location'), warehouseLocation, setWarehouseLocation, t('warehouse_location'), "location-outline")}
              </View>
            </View>

            {/* Tanımlayıcılar Bölümü */}
            <View style={isLargeWeb ? styles.webSection : styles.section}>
              <Text style={styles.sectionTitle}>{t('code_barcode_label')}</Text>

              <View style={isLargeWeb ? styles.webRow : null}>
                <View style={[styles.inputGroup, isLargeWeb && styles.webInputGroup]}>
                  <Text style={styles.inputLabel}>{t('product_code_barcode')}</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="barcode-outline" size={20} color={Colors.secondary} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { paddingLeft: 45, paddingRight: 50 }]}
                      value={code}
                      onChangeText={setCode}
                      placeholder={t('product_code_barcode')}
                      placeholderTextColor={Colors.muted}
                    />
                    <TouchableOpacity onPress={() => setScannerVisible(true)} style={styles.barcodeIconAction}>
                      <Ionicons name="scan-outline" size={20} color={Colors.iosBlue} />
                    </TouchableOpacity>
                  </View>
                </View>
                {renderInput(t('serial_number'), serialNumber, setSerialNumber, t('serial_number'), "key-outline")}
              </View>

              <View style={isLargeWeb ? styles.webRow : null}>
                {renderInput(t('supplier'), supplier, setSupplier, t('supplier'), "business-outline")}
                {renderInput(t('description'), description, setDescription, t('enter_details'), "document-text-outline", "default", true, { multiline: true })}
              </View>
            </View>
          </View>

          {/* Ekle Butonu */}
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              activeOpacity={0.8}
            >
              <Ionicons name={isEditing ? "refresh-outline" : "save-outline"} size={22} color="#fff" style={{ marginRight: 10 }} />
              <Text style={styles.saveButtonText}>{isEditing ? t('save_and_update') : t('add_to_stock')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardSafeView>
      <BarcodeScannerModal visible={scannerVisible} onClose={() => setScannerVisible(false)} onScanned={handleScan} />
    </ImmersiveLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingTop: 10,
    paddingBottom: 40,
    paddingHorizontal: Platform.OS === 'web' ? 20 : 0,
  },
  section: {
    marginBottom: 25,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  webSection: {
    marginBottom: 30,
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 20,
    textTransform: 'uppercase',
    letterSpacing: 1,
    borderLeftWidth: 4,
    borderLeftColor: Colors.iosBlue,
    paddingLeft: 10,
  },
  inputGroup: {
    marginBottom: 18,
    flex: 1,
  },
  webInputGroup: {
    marginHorizontal: 10,
  },
  inputLabel: {
    fontWeight: "700",
    fontSize: 13,
    color: '#64748B',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: 15,
    zIndex: 1,
  },
  input: {
    backgroundColor: "#F8FAFC",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    fontSize: 15,
    color: "#1E293B",
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      }
    }),
  },
  barcodeIconAction: {
    position: 'absolute',
    right: 15,
    padding: 5,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  webRow: {
    flexDirection: 'row',
    marginHorizontal: -10,
  },
  unitPicker: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 4,
  },
  unitBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  unitBtnActive: {
    backgroundColor: '#fff',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  unitBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  unitBtnTextActive: {
    color: Colors.iosBlue,
    fontWeight: '700',
  },
  actionContainer: {
    marginTop: 20,
    alignItems: 'center',
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.iosBlue,
    width: '100%',
    padding: 18,
    borderRadius: 16,
    shadowColor: Colors.iosBlue,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 18,
  },
  cancelButton: {
    marginTop: 15,
    padding: 10,
  },
  cancelButtonText: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 15,
  },
  webFormGrid: {
    width: '100%',
  },
  mobileForm: {
    width: '100%',
  }
});
