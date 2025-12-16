import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Colors, IOSShadow, CardRadius } from "../Theme";
import { useTranslation } from "react-i18next";


/*
  ProductItem
  - item: product object
  - onSell(item) called when "Sat" tapped
  - onEdit(item) called when "Düzenle" tapped
  - onDelete(id) called when "Sil" tapped
  - productCode displayed under product name

  StockScreen.js'deki Liste Başlıklarına Uyumlu Hale Getirildi (flex: 4, 2, 3, 2, 1)
*/
export default function ProductItem({ item, onSell, onEdit, onDelete }) {
  const { t } = useTranslation();
  // Veri alanlarını, StockScreen'deki başlık yapısına uygun olarak bölüyoruz.
  const priceDisplay = Number(item.price || 0).toFixed(2) + ' ₺';
  const currentQuantity = item.quantity || 0;

  // KRİTİK STOK KONTROLÜ (Örn: 5'in altı)
  const isCriticalStock = currentQuantity <= 5 && currentQuantity > 0;
  const isOutOfStock = currentQuantity === 0;

  // HANGİ KODU GÖSTERECEĞİMİZE KARAR VERELİM: Önce Ürün Kodu (item.code), sonra Seri No
  const identifierDisplay = item.code || item.serialNumber || "-";


  return (
    <View style={[styles.item, IOSShadow]}>

      {/* 1. Ürün Adı / Kategori (flex: 4) */}
      <View style={styles.col4}>
        <Text style={styles.title}>{item.name}</Text>
        <Text style={styles.muted}>{item.category || t("no_category")}</Text>
      </View>

      {/* 2. Stok (flex: 2) */}
      <View style={styles.col2Center}>
        <Text
          style={[
            styles.dataText,
            isCriticalStock && styles.criticalText,
            isOutOfStock && styles.outOfStockText
          ]}
        >
          {currentQuantity}
        </Text>
        {isCriticalStock && (
          <Text style={styles.criticalWarning}>{t("stock_low")}</Text>
        )}
      </View>

      {/* 3. Seri No / Ürün Kodu (flex: 3) */}
      <View style={styles.col3Center}>
        <Text style={styles.dataText}>{identifierDisplay}</Text>
        <Text style={styles.mutedSmall}>
          {item.code ? t("product_code_label") : (item.serialNumber ? t("serial_number") : "")}
        </Text>
      </View>

      {/* 4. Fiyat (flex: 2) */}
      <View style={styles.col2Right}>
        <Text style={styles.dataText}>{priceDisplay}</Text>
      </View>

      {/* 5. Eylem Butonları (flex: 1 - minWidth: 100) */}
      <View style={styles.actions}>
        <TouchableOpacity
          onPress={() => onSell && onSell(item)}
          style={[styles.btn, styles.sellBtn]}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`${t("sell_action")} ${item.name}`}
        >
          <Text style={[styles.btnText, { color: "#fff" }]}>{t("sell_action")}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onEdit && onEdit(item)}
          style={[styles.btn, styles.editBtn]}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`${t("edit")} ${item.name}`}
        >
          <Text style={[styles.btnText, { color: "#fff" }]}>{t("edit")}</Text>
        </TouchableOpacity>

        {/* StockScreen.js'teki confirmDelete fonksiyonu artık item.id ve item.name kullanıyor */}
        <TouchableOpacity
          onPress={() => onDelete && onDelete(item.id, item.name)}
          style={[styles.btn, styles.deleteBtn]}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`${t("delete")} ${item.name}`}
        >
          <Text style={[styles.btnText, { color: Colors.critical }]}>{t("delete")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    backgroundColor: "#fff",
    borderRadius: CardRadius,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: 'center', // Öğelerin dikeyde ortalanmasını sağlar
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  // Sütun stilleri (StockScreen'deki flex değerlerine göre)
  col4: { flex: 4, paddingRight: 5 }, // Ürün Adı/Kategori
  col2Center: { flex: 2, alignItems: 'center' }, // Stok
  col3Center: { flex: 3, alignItems: 'center' }, // Seri No/Kod
  col2Right: { flex: 2, alignItems: 'flex-end', paddingLeft: 5 }, // Fiyat

  title: { fontWeight: "800", fontSize: 14, color: '#333' },
  muted: { color: Colors.secondary, fontSize: 12, marginTop: 2 },
  mutedSmall: { color: Colors.secondary, fontSize: 10, marginTop: 2 },

  dataText: { fontWeight: "600", fontSize: 14, color: '#000' },

  // Yeni Kritik Stok Stilleri
  criticalText: {
    color: Colors.critical, // Kırmızı
    fontWeight: '800',
    fontSize: 16,
  },
  outOfStockText: {
    color: Colors.secondary, // Gri
    fontWeight: '600',
    fontSize: 14,
  },
  criticalWarning: {
    color: Colors.critical,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },

  actions: {
    flex: 1, // Butonlar için ayrılan alan
    justifyContent: "center",
    alignItems: "flex-end",
    minWidth: 100, // Butonların sıkışmasını önler
  },
  btn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginTop: 4,
    minWidth: 70, // Buton genişlikleri daraltıldı
    alignItems: "center",
  },
  btnText: {
    fontWeight: "700",
    fontSize: 12, // Yazı boyutu küçültüldü
  },
  sellBtn: {
    backgroundColor: Colors.iosGreen,
  },
  editBtn: {
    backgroundColor: Colors.iosBlue,
  },
  deleteBtn: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
});