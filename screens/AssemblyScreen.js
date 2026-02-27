import React, { useState, useContext, useMemo, useCallback } from "react";
import {
    View, Text, StyleSheet, TouchableOpacity, TextInput,
    FlatList, Alert, ScrollView, Platform
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../Theme";
import { AppContext } from "../AppContext";
import ImmersiveLayout from "../components/ImmersiveLayout";
import { useToast } from "../components/ToastProvider";
import { useTranslation } from "react-i18next";
import { triggerHaptic, HapticType } from "../utils/FeedbackHelper";

// ─── WEB BOM EKRANI ──────────────────────────────────────────────────────────
function WebBomScreen() {
    const { products, boms, addBom, updateBom, deleteBom, produceFromBom } = useContext(AppContext);
    const toast = useToast();

    // Sol panel: seçili BOM
    const [selectedBomId, setSelectedBomId] = useState(null);
    const [bomSearch, setBomSearch] = useState("");

    // Sağ panel modu: 'view' | 'create' | 'edit' | 'produce'
    const [mode, setMode] = useState("view");

    // Form state
    const [form, setForm] = useState(initForm());
    const [components, setComponents] = useState([]);
    const [compSearch, setCompSearch] = useState("");
    const [producing, setProducing] = useState(false);
    const [produceQty, setProduceQty] = useState("1");
    const [saving, setSaving] = useState(false);

    function initForm() {
        return {
            product_name: "", product_code: "", category: "Üretim",
            revision: "1.0", unit: "Adet", description: "",
            sale_price: "", critical_limit: "5",
            // Teknik alanlar
            material: "", weight: "", dimensions: "", surface_treatment: "",
            drawing_no: "", standard: "", notes: ""
        };
    }

    const selectedBom = useMemo(() => boms.find(b => b.id === selectedBomId), [boms, selectedBomId]);

    const filteredBoms = useMemo(() => {
        if (!bomSearch) return boms;
        const q = bomSearch.toLowerCase();
        return boms.filter(b =>
            (b.product_name || "").toLowerCase().includes(q) ||
            (b.bom_number || "").toLowerCase().includes(q)
        );
    }, [boms, bomSearch]);

    const filteredProducts = useMemo(() => {
        if (!products) return [];
        const selectedIds = new Set(components.map(c => c.product_id));
        let list = products.filter(p => (p.quantity || 0) > 0 && !selectedIds.has(p.id));
        if (compSearch) {
            const q = compSearch.toLowerCase();
            list = list.filter(p => (p.name || "").toLowerCase().includes(q) || (p.code || "").toLowerCase().includes(q));
        }
        return list.slice(0, 50);
    }, [products, compSearch, components]);

    const unitCost = useMemo(() => {
        return components.reduce((sum, c) => {
            const p = products?.find(pr => pr.id === c.product_id);
            return sum + ((p?.cost || 0) * (c.quantity || 1));
        }, 0);
    }, [components, products]);

    const startCreate = () => {
        setForm(initForm());
        setComponents([]);
        setCompSearch("");
        setMode("create");
        setSelectedBomId(null);
    };

    const startEdit = () => {
        if (!selectedBom) return;
        setForm({
            product_name: selectedBom.product_name || "",
            product_code: selectedBom.product_code || "",
            category: selectedBom.category || "Üretim",
            revision: selectedBom.revision || "1.0",
            unit: selectedBom.unit || "Adet",
            description: selectedBom.description || "",
            sale_price: String(selectedBom.sale_price || ""),
            critical_limit: String(selectedBom.critical_limit || "5"),
            material: selectedBom.material || "",
            weight: selectedBom.weight || "",
            dimensions: selectedBom.dimensions || "",
            surface_treatment: selectedBom.surface_treatment || "",
            drawing_no: selectedBom.drawing_no || "",
            standard: selectedBom.standard || "",
            notes: selectedBom.notes || ""
        });
        setComponents(selectedBom.components || []);
        setMode("edit");
    };

    const addComponent = (product) => {
        setComponents(prev => [...prev, {
            product_id: product.id,
            name: product.name,
            code: product.code || "",
            quantity: 1,
            unit: product.unit || "Adet",
            cost: product.cost || 0,
            stock: product.quantity || 0,
            notes: ""
        }]);
        setCompSearch("");
    };

    const updateComponent = (idx, field, value) => {
        setComponents(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
    };

    const removeComponent = (idx) => {
        setComponents(prev => prev.filter((_, i) => i !== idx));
    };

    const handleSave = async () => {
        if (!form.product_name.trim()) { alert("Ürün adı zorunludur."); return; }
        if (components.length === 0) { alert("En az bir bileşen ekleyin."); return; }
        setSaving(true);
        try {
            const bomData = {
                ...form,
                components,
                sale_price: parseFloat(form.sale_price) || 0,
                critical_limit: parseInt(form.critical_limit) || 0
            };
            if (mode === "create") {
                const result = await addBom(bomData);
                if (result) {
                    toast.showToast?.("BOM kaydedildi: " + result.bom_number);
                    setSelectedBomId(result.id);
                    setMode("view");
                } else {
                    toast.showToast?.("BOM kaydedilemedi (boms tablosu oluşturuldu mu?)");
                }
            } else if (mode === "edit" && selectedBom) {
                const ok = await updateBom({ ...bomData, id: selectedBom.id });
                if (ok) { toast.showToast?.("BOM güncellendi."); setMode("view"); }
            }
        } catch (e) {
            alert("Hata: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedBom) return;
        if (!window.confirm(`"${selectedBom.product_name}" BOM'unu silmek istediğinize emin misiniz?`)) return;
        const ok = await deleteBom(selectedBom.id);
        if (ok) { toast.showToast?.("BOM silindi."); setSelectedBomId(null); setMode("view"); }
    };

    const handleProduce = async () => {
        if (!selectedBom) return;
        const qty = parseInt(produceQty) || 1;
        if (qty <= 0) { alert("Geçerli bir miktar girin."); return; }
        setProducing(true);
        const result = await produceFromBom(selectedBom.id, qty);
        setProducing(false);
        if (result.success) {
            toast.showToast?.(`✅ ${qty} adet üretildi ve stoka eklendi.`);
            setMode("view");
            setProduceQty("1");
        } else {
            alert("Üretim başarısız: " + result.error);
        }
    };

    const isFormMode = mode === "create" || mode === "edit";

    return (
        <div style={ws.root}>
            {/* ── SOL PANEL: BOM Listesi ── */}
            <div style={ws.leftPanel}>
                <div style={ws.panelHeader}>
                    <span style={ws.panelTitle}>📋 BOM Reçeteleri</span>
                    <button style={ws.btnPrimary} onClick={startCreate}>
                        <Ionicons name="add" size={16} color="#fff" /> Yeni BOM
                    </button>
                </div>
                <div style={ws.searchWrap}>
                    <Ionicons name="search-outline" size={16} color="#94A3B8" />
                    <input style={ws.searchInput} placeholder="Ürün adı veya BOM no..." value={bomSearch} onChange={e => setBomSearch(e.target.value)} />
                </div>
                <div style={ws.bomList}>
                    {filteredBoms.length === 0 && (
                        <div style={ws.emptyState}>
                            <Ionicons name="document-text-outline" size={40} color="#CBD5E1" />
                            <p style={{ color: "#94A3B8", marginTop: 8, textAlign: "center" }}>
                                Henüz BOM reçetesi yok.<br />Yeni BOM oluşturarak başlayın.
                            </p>
                        </div>
                    )}
                    {filteredBoms.map(bom => {
                        const active = bom.id === selectedBomId;
                        return (
                            <div key={bom.id}
                                style={{ ...ws.bomCard, ...(active ? ws.bomCardActive : {}) }}
                                onClick={() => { setSelectedBomId(bom.id); setMode("view"); }}>
                                <div style={ws.bomCardTop}>
                                    <span style={ws.bomCardName}>{bom.product_name}</span>
                                    <span style={{ ...ws.statusBadge, background: bom.status === 'ACTIVE' ? '#D1FAE5' : '#FEF3C7', color: bom.status === 'ACTIVE' ? '#065F46' : '#92400E' }}>
                                        {bom.status === 'ACTIVE' ? 'Aktif' : 'Pasif'}
                                    </span>
                                </div>
                                <span style={ws.bomCardSub}>{bom.bom_number}</span>
                                <div style={ws.bomCardMeta}>
                                    <span style={ws.metaChip}>🔩 {(bom.components || []).length} bileşen</span>
                                    {bom.total_produced ? <span style={ws.metaChip}>📦 {bom.total_produced} üretildi</span> : null}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── ORTA/SAĞ PANEL ── */}
            <div style={ws.rightPanel}>
                {/* VIEW: BOM Detay */}
                {mode === "view" && !selectedBom && (
                    <div style={ws.placeholder}>
                        <Ionicons name="construct-outline" size={64} color="#CBD5E1" />
                        <h2 style={{ color: "#94A3B8", fontWeight: 600, marginTop: 16 }}>Montaj ve Üretim (BOM)</h2>
                        <p style={{ color: "#94A3B8", maxWidth: 400, textAlign: "center", lineHeight: 1.6 }}>
                            Sol panelden bir BOM reçetesi seçin veya <strong style={{ color: "#3B82F6" }}>Yeni BOM</strong> oluşturarak parçaları birleştirip üretim reçetenizi tanımlayın.
                        </p>
                    </div>
                )}

                {mode === "view" && selectedBom && (
                    <BomDetailView
                        bom={selectedBom}
                        products={products}
                        onEdit={startEdit}
                        onDelete={handleDelete}
                        onProduce={() => setMode("produce")}
                    />
                )}

                {mode === "produce" && selectedBom && (
                    <ProduceView
                        bom={selectedBom}
                        products={products}
                        produceQty={produceQty}
                        setProduceQty={setProduceQty}
                        onProduce={handleProduce}
                        onCancel={() => setMode("view")}
                        producing={producing}
                    />
                )}

                {/* CREATE / EDIT FORM */}
                {isFormMode && (
                    <BomForm
                        mode={mode}
                        form={form}
                        setForm={setForm}
                        components={components}
                        compSearch={compSearch}
                        setCompSearch={setCompSearch}
                        filteredProducts={filteredProducts}
                        addComponent={addComponent}
                        updateComponent={updateComponent}
                        removeComponent={removeComponent}
                        unitCost={unitCost}
                        saving={saving}
                        onSave={handleSave}
                        onCancel={() => { setMode("view"); }}
                        products={products}
                    />
                )}
            </div>
        </div>
    );
}

// ── BOM Detay ───────────────────────────────────────────────────────────────
function BomDetailView({ bom, products, onEdit, onDelete, onProduce }) {
    const totalCost = (bom.components || []).reduce((sum, c) => {
        const p = products?.find(pr => pr.id === c.product_id);
        return sum + ((p?.cost || 0) * (c.quantity || 1));
    }, 0);

    const InfoRow = ({ label, value }) => value ? (
        <div style={ws.infoRow}>
            <span style={ws.infoLabel}>{label}</span>
            <span style={ws.infoValue}>{value}</span>
        </div>
    ) : null;

    return (
        <div style={ws.detailRoot}>
            {/* Header */}
            <div style={ws.detailHeader}>
                <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <h2 style={ws.detailTitle}>{bom.product_name}</h2>
                        <span style={{ ...ws.statusBadge, background: '#D1FAE5', color: '#065F46' }}>v{bom.revision || "1.0"}</span>
                    </div>
                    <span style={ws.detailSub}>{bom.bom_number} · {bom.category}</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    <button style={ws.btnSuccess} onClick={onProduce}>
                        <Ionicons name="play-circle-outline" size={16} color="#fff" /> Üretim Başlat
                    </button>
                    <button style={ws.btnOutline} onClick={onEdit}>
                        <Ionicons name="create-outline" size={16} color="#3B82F6" /> Düzenle
                    </button>
                    <button style={{ ...ws.btnOutline, borderColor: "#EF4444", color: "#EF4444" }} onClick={onDelete}>
                        <Ionicons name="trash-outline" size={15} color="#EF4444" />
                    </button>
                </div>
            </div>

            {/* KPI Kartlar */}
            <div style={ws.kpiRow}>
                <div style={ws.kpiCard}>
                    <span style={ws.kpiLabel}>Birim Maliyet</span>
                    <span style={ws.kpiValue}>{totalCost.toFixed(2)} ₺</span>
                </div>
                <div style={ws.kpiCard}>
                    <span style={ws.kpiLabel}>Satış Fiyatı</span>
                    <span style={{ ...ws.kpiValue, color: "#10B981" }}>{parseFloat(bom.sale_price || 0).toFixed(2)} ₺</span>
                </div>
                <div style={ws.kpiCard}>
                    <span style={ws.kpiLabel}>Marj</span>
                    <span style={{ ...ws.kpiValue, color: "#8B5CF6" }}>
                        {bom.sale_price > 0 ? (((bom.sale_price - totalCost) / bom.sale_price) * 100).toFixed(1) + "%" : "—"}
                    </span>
                </div>
                <div style={ws.kpiCard}>
                    <span style={ws.kpiLabel}>Toplam Üretilen</span>
                    <span style={ws.kpiValue}>{bom.total_produced || 0} {bom.unit || "Adet"}</span>
                </div>
                <div style={ws.kpiCard}>
                    <span style={ws.kpiLabel}>Bileşen Sayısı</span>
                    <span style={ws.kpiValue}>{(bom.components || []).length}</span>
                </div>
            </div>

            <div style={ws.twoCol}>
                {/* BOM Ağacı / Bileşen Tablosu */}
                <div style={ws.section}>
                    <h3 style={ws.sectionTitle}>🔩 Malzeme Listesi (BOM)</h3>
                    <table style={ws.table}>
                        <thead>
                            <tr>
                                {["#", "Bileşen Adı", "Kod", "Miktar", "Birim", "Birim Maliyet", "Toplam", "Stok Durumu", "Notlar"].map(h => (
                                    <th key={h} style={ws.th}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {(bom.components || []).map((c, i) => {
                                const p = products?.find(pr => pr.id === c.product_id);
                                const total = (p?.cost || 0) * (c.quantity || 1);
                                const sufficient = (p?.quantity || 0) >= (c.quantity || 1);
                                return (
                                    <tr key={i} style={ws.tr}>
                                        <td style={ws.td}>{i + 1}</td>
                                        <td style={{ ...ws.td, fontWeight: 600 }}>{c.name}</td>
                                        <td style={{ ...ws.td, color: "#64748B" }}>{c.code || "—"}</td>
                                        <td style={{ ...ws.td, textAlign: "center" }}>{c.quantity}</td>
                                        <td style={{ ...ws.td, color: "#64748B" }}>{c.unit || "Adet"}</td>
                                        <td style={{ ...ws.td, textAlign: "right" }}>{(p?.cost || 0).toFixed(2)} ₺</td>
                                        <td style={{ ...ws.td, textAlign: "right", fontWeight: 600 }}>{total.toFixed(2)} ₺</td>
                                        <td style={ws.td}>
                                            <span style={{ ...ws.stockBadge, background: sufficient ? "#D1FAE5" : "#FEE2E2", color: sufficient ? "#065F46" : "#991B1B" }}>
                                                {p?.quantity || 0} {sufficient ? "✓" : "✗"}
                                            </span>
                                        </td>
                                        <td style={{ ...ws.td, color: "#94A3B8", fontSize: 12 }}>{c.notes || "—"}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan={6} style={{ ...ws.td, fontWeight: 700, textAlign: "right", color: "#1E293B" }}>Toplam Birim Maliyet:</td>
                                <td style={{ ...ws.td, fontWeight: 800, color: "#3B82F6", textAlign: "right" }}>{totalCost.toFixed(2)} ₺</td>
                                <td colSpan={2} />
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Teknik Bilgiler */}
                <div style={ws.section}>
                    <h3 style={ws.sectionTitle}>🔧 Teknik Bilgiler</h3>
                    <InfoRow label="Malzeme" value={bom.material} />
                    <InfoRow label="Ağırlık" value={bom.weight} />
                    <InfoRow label="Boyutlar" value={bom.dimensions} />
                    <InfoRow label="Yüzey İşlemi" value={bom.surface_treatment} />
                    <InfoRow label="Çizim No" value={bom.drawing_no} />
                    <InfoRow label="Standart" value={bom.standard} />
                    {bom.description && (
                        <>
                            <h3 style={{ ...ws.sectionTitle, marginTop: 20 }}>📄 Açıklama</h3>
                            <p style={{ color: "#475569", lineHeight: 1.7, fontSize: 14 }}>{bom.description}</p>
                        </>
                    )}
                    {bom.notes && (
                        <>
                            <h3 style={{ ...ws.sectionTitle, marginTop: 20 }}>📝 Notlar</h3>
                            <p style={{ color: "#475569", lineHeight: 1.7, fontSize: 14 }}>{bom.notes}</p>
                        </>
                    )}
                    {bom.last_produced_at && (
                        <InfoRow label="Son Üretim" value={new Date(bom.last_produced_at).toLocaleDateString("tr-TR")} />
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Üretim Ekranı ────────────────────────────────────────────────────────────
function ProduceView({ bom, products, produceQty, setProduceQty, onProduce, onCancel, producing }) {
    const qty = parseInt(produceQty) || 1;
    const components = bom.components || [];
    const totalCost = components.reduce((sum, c) => {
        const p = products?.find(pr => pr.id === c.product_id);
        return sum + ((p?.cost || 0) * c.quantity * qty);
    }, 0);

    return (
        <div style={ws.detailRoot}>
            <div style={ws.detailHeader}>
                <div>
                    <h2 style={ws.detailTitle}>⚙️ Üretim Başlat</h2>
                    <span style={ws.detailSub}>{bom.product_name} · {bom.bom_number}</span>
                </div>
                <button style={ws.btnOutline} onClick={onCancel}>İptal</button>
            </div>

            <div style={{ background: "#F8FAFC", borderRadius: 12, padding: 24, marginBottom: 24, border: "1px solid #E2E8F0" }}>
                <label style={ws.formLabel}>Üretim Miktarı ({bom.unit || "Adet"})</label>
                <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 8 }}>
                    <button style={ws.qtyBtn} onClick={() => setProduceQty(String(Math.max(1, qty - 1)))}>−</button>
                    <input style={{ ...ws.formInput, width: 80, textAlign: "center", fontSize: 24, fontWeight: 700 }}
                        value={produceQty} onChange={e => setProduceQty(e.target.value)} type="number" min="1" />
                    <button style={{ ...ws.qtyBtn, background: "#3B82F6", color: "#fff" }} onClick={() => setProduceQty(String(qty + 1))}>+</button>
                </div>
            </div>

            <div style={ws.section}>
                <h3 style={ws.sectionTitle}>📋 Malzeme İhtiyaç Analizi</h3>
                <table style={ws.table}>
                    <thead>
                        <tr>
                            {["Bileşen", "Birim Miktar", `Gereken (x${qty})`, "Mevcut Stok", "Durum"].map(h => (
                                <th key={h} style={ws.th}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {components.map((c, i) => {
                            const p = products?.find(pr => pr.id === c.product_id);
                            const needed = (c.quantity || 1) * qty;
                            const available = p?.quantity || 0;
                            const ok = available >= needed;
                            return (
                                <tr key={i} style={{ ...ws.tr, background: ok ? "#fff" : "#FFF5F5" }}>
                                    <td style={{ ...ws.td, fontWeight: 600 }}>{c.name}</td>
                                    <td style={{ ...ws.td, textAlign: "center" }}>{c.quantity}</td>
                                    <td style={{ ...ws.td, textAlign: "center", fontWeight: 700 }}>{needed}</td>
                                    <td style={{ ...ws.td, textAlign: "center" }}>{available}</td>
                                    <td style={ws.td}>
                                        <span style={{ ...ws.stockBadge, background: ok ? "#D1FAE5" : "#FEE2E2", color: ok ? "#065F46" : "#991B1B" }}>
                                            {ok ? "✓ Yeterli" : "✗ Yetersiz"}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div style={{ background: "linear-gradient(135deg, #EFF6FF, #DBEAFE)", borderRadius: 12, padding: 20, marginTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <div style={{ fontSize: 13, color: "#64748B" }}>Toplam Üretim Maliyeti</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: "#1D4ED8" }}>{totalCost.toFixed(2)} ₺</div>
                </div>
                <button style={{ ...ws.btnSuccess, fontSize: 16, padding: "14px 32px", opacity: producing ? 0.7 : 1 }}
                    onClick={onProduce} disabled={producing}>
                    {producing ? "⏳ Üretiliyor..." : `🏭 ${qty} Adet Üret ve Stoka Ekle`}
                </button>
            </div>
        </div>
    );
}

// ── BOM Form ─────────────────────────────────────────────────────────────────
function BomForm({ mode, form, setForm, components, compSearch, setCompSearch, filteredProducts, addComponent, updateComponent, removeComponent, unitCost, saving, onSave, onCancel, products }) {
    const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

    return (
        <div style={ws.detailRoot}>
            <div style={ws.detailHeader}>
                <h2 style={ws.detailTitle}>{mode === "create" ? "➕ Yeni BOM Reçetesi" : "✏️ BOM Düzenle"}</h2>
                <div style={{ display: "flex", gap: 8 }}>
                    <button style={ws.btnOutline} onClick={onCancel}>İptal</button>
                    <button style={{ ...ws.btnPrimary, opacity: saving ? 0.7 : 1 }} onClick={onSave} disabled={saving}>
                        {saving ? "Kaydediliyor..." : "💾 BOM Kaydet"}
                    </button>
                </div>
            </div>

            <div style={ws.twoCol}>
                {/* Sol: Ürün Bilgileri + Teknik */}
                <div>
                    <div style={ws.formSection}>
                        <h3 style={ws.sectionTitle}>📦 Ürün Bilgileri</h3>
                        <div style={ws.formRow}>
                            <FormField label="Ürün Adı *" value={form.product_name} onChange={set("product_name")} placeholder="Mamul ürün adı" />
                            <FormField label="Ürün Kodu" value={form.product_code} onChange={set("product_code")} placeholder="KOD-001" />
                        </div>
                        <div style={ws.formRow}>
                            <FormField label="Kategori" value={form.category} onChange={set("category")} placeholder="Üretim" />
                            <FormField label="Revizyon" value={form.revision} onChange={set("revision")} placeholder="1.0" />
                        </div>
                        <div style={ws.formRow}>
                            <FormField label="Birim" value={form.unit} onChange={set("unit")} placeholder="Adet" />
                            <FormField label="Satış Fiyatı (₺)" value={form.sale_price} onChange={set("sale_price")} type="number" placeholder="0.00" />
                        </div>
                        <div style={ws.formRow}>
                            <FormField label="Kritik Stok Limiti" value={form.critical_limit} onChange={set("critical_limit")} type="number" placeholder="5" />
                        </div>
                        <label style={ws.formLabel}>Açıklama</label>
                        <textarea style={{ ...ws.formInput, height: 72, resize: "vertical" }} value={form.description} onChange={set("description")} placeholder="Ürün açıklaması..." />
                    </div>

                    <div style={ws.formSection}>
                        <h3 style={ws.sectionTitle}>🔧 Teknik Bilgiler</h3>
                        <div style={ws.formRow}>
                            <FormField label="Malzeme" value={form.material} onChange={set("material")} placeholder="Örn: ST37 Çelik" />
                            <FormField label="Ağırlık" value={form.weight} onChange={set("weight")} placeholder="Örn: 2.5 kg" />
                        </div>
                        <div style={ws.formRow}>
                            <FormField label="Boyutlar" value={form.dimensions} onChange={set("dimensions")} placeholder="Örn: 100x50x20 mm" />
                            <FormField label="Yüzey İşlemi" value={form.surface_treatment} onChange={set("surface_treatment")} placeholder="Örn: Galvaniz" />
                        </div>
                        <div style={ws.formRow}>
                            <FormField label="Çizim / Teknik Resim No" value={form.drawing_no} onChange={set("drawing_no")} placeholder="ÇZ-2024-001" />
                            <FormField label="Standart" value={form.standard} onChange={set("standard")} placeholder="Örn: TS EN 10025" />
                        </div>
                        <label style={ws.formLabel}>Üretim Notları</label>
                        <textarea style={{ ...ws.formInput, height: 72, resize: "vertical" }} value={form.notes} onChange={set("notes")} placeholder="Dikkat edilecek hususlar..." />
                    </div>
                </div>

                {/* Sağ: Bileşen Seçimi */}
                <div>
                    <div style={ws.formSection}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                            <h3 style={{ ...ws.sectionTitle, margin: 0 }}>🔩 Bileşenler (BOM)</h3>
                            <span style={{ background: "#EFF6FF", color: "#1D4ED8", padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                                Birim Maliyet: {unitCost.toFixed(2)} ₺
                            </span>
                        </div>

                        {/* Bileşen Arama */}
                        <div style={ws.searchWrap}>
                            <Ionicons name="search-outline" size={16} color="#94A3B8" />
                            <input style={ws.searchInput} placeholder="Stoktan bileşen ara ve ekle..." value={compSearch} onChange={e => setCompSearch(e.target.value)} />
                        </div>

                        {compSearch && filteredProducts.length > 0 && (
                            <div style={ws.dropdown}>
                                {filteredProducts.slice(0, 8).map(p => (
                                    <div key={p.id} style={ws.dropdownItem} onClick={() => addComponent(p)}>
                                        <span style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</span>
                                        <span style={{ fontSize: 12, color: "#64748B" }}>{p.code} · Stok: {p.quantity}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Bileşen Tablosu */}
                        {components.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "32px 0", color: "#94A3B8" }}>
                                <Ionicons name="cube-outline" size={36} color="#CBD5E1" />
                                <p style={{ marginTop: 8 }}>Yukarıdan bileşen arayıp ekleyin</p>
                            </div>
                        ) : (
                            <table style={{ ...ws.table, marginTop: 12 }}>
                                <thead>
                                    <tr>
                                        {["Bileşen", "Miktar", "Birim", "Maliyet", "Notlar", ""].map(h => (
                                            <th key={h} style={ws.th}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {components.map((c, i) => {
                                        const p = products?.find(pr => pr.id === c.product_id);
                                        return (
                                            <tr key={i} style={ws.tr}>
                                                <td style={{ ...ws.td, fontWeight: 600 }}>
                                                    {c.name}
                                                    <div style={{ fontSize: 11, color: "#94A3B8" }}>Stok: {p?.quantity || 0}</div>
                                                </td>
                                                <td style={ws.td}>
                                                    <input type="number" min="0.01" step="0.01"
                                                        style={{ ...ws.formInput, width: 64, padding: "4px 8px", textAlign: "center" }}
                                                        value={c.quantity} onChange={e => updateComponent(i, "quantity", parseFloat(e.target.value) || 1)} />
                                                </td>
                                                <td style={ws.td}>
                                                    <input style={{ ...ws.formInput, width: 60, padding: "4px 8px" }}
                                                        value={c.unit} onChange={e => updateComponent(i, "unit", e.target.value)} />
                                                </td>
                                                <td style={{ ...ws.td, textAlign: "right", fontWeight: 600 }}>
                                                    {((p?.cost || 0) * (c.quantity || 1)).toFixed(2)} ₺
                                                </td>
                                                <td style={ws.td}>
                                                    <input style={{ ...ws.formInput, width: "100%", padding: "4px 8px", fontSize: 12 }}
                                                        placeholder="not..." value={c.notes || ""} onChange={e => updateComponent(i, "notes", e.target.value)} />
                                                </td>
                                                <td style={ws.td}>
                                                    <button style={ws.removeBtn} onClick={() => removeComponent(i)}>✕</button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Maliyet Özeti */}
                    {components.length > 0 && (
                        <div style={{ background: "linear-gradient(135deg, #F0F9FF, #DBEAFE)", borderRadius: 12, padding: 16, border: "1px solid #BAE6FD", marginTop: 16 }}>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <div>
                                    <div style={{ fontSize: 12, color: "#64748B" }}>Birim Üretim Maliyeti</div>
                                    <div style={{ fontSize: 24, fontWeight: 800, color: "#1D4ED8" }}>{unitCost.toFixed(2)} ₺</div>
                                </div>
                                {form.sale_price > 0 && (
                                    <div style={{ textAlign: "right" }}>
                                        <div style={{ fontSize: 12, color: "#64748B" }}>Brüt Marj</div>
                                        <div style={{ fontSize: 24, fontWeight: 800, color: "#10B981" }}>
                                            {(((parseFloat(form.sale_price) - unitCost) / parseFloat(form.sale_price)) * 100).toFixed(1)}%
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function FormField({ label, value, onChange, placeholder, type = "text" }) {
    return (
        <div style={{ flex: 1 }}>
            <label style={ws.formLabel}>{label}</label>
            <input style={ws.formInput} type={type} value={value} onChange={onChange} placeholder={placeholder} />
        </div>
    );
}

// ─── WEB STİLLERİ (plain objects for DOM) ────────────────────────────────────
const ws = {
    root: { display: "flex", height: "100%", background: "#F8FAFC", overflow: "hidden" },
    leftPanel: { width: 300, background: "#fff", borderRight: "1px solid #E2E8F0", display: "flex", flexDirection: "column", overflow: "hidden" },
    panelHeader: { padding: "16px 16px 12px", borderBottom: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center" },
    panelTitle: { fontWeight: 700, fontSize: 14, color: "#1E293B" },
    bomList: { flex: 1, overflowY: "auto", padding: 12 },
    bomCard: { background: "#F8FAFC", borderRadius: 10, padding: "12px 14px", marginBottom: 8, cursor: "pointer", border: "1px solid #E2E8F0", transition: "all 0.15s" },
    bomCardActive: { background: "#EFF6FF", borderColor: "#3B82F6" },
    bomCardTop: { display: "flex", justifyContent: "space-between", alignItems: "center" },
    bomCardName: { fontWeight: 700, fontSize: 14, color: "#1E293B" },
    bomCardSub: { fontSize: 11, color: "#94A3B8", display: "block", marginTop: 2 },
    bomCardMeta: { display: "flex", gap: 6, marginTop: 6 },
    metaChip: { fontSize: 11, color: "#64748B", background: "#F1F5F9", padding: "2px 8px", borderRadius: 20 },
    statusBadge: { fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20 },
    rightPanel: { flex: 1, overflow: "auto", display: "flex", flexDirection: "column" },
    placeholder: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, padding: 40 },
    detailRoot: { padding: 32, flex: 1 },
    detailHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
    detailTitle: { fontSize: 22, fontWeight: 800, color: "#0F172A", margin: 0 },
    detailSub: { fontSize: 13, color: "#64748B", marginTop: 4, display: "block" },
    kpiRow: { display: "flex", gap: 12, marginBottom: 24 },
    kpiCard: { flex: 1, background: "#fff", borderRadius: 10, padding: "14px 16px", border: "1px solid #E2E8F0" },
    kpiLabel: { fontSize: 11, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, display: "block" },
    kpiValue: { fontSize: 20, fontWeight: 800, color: "#1E293B", display: "block", marginTop: 4 },
    twoCol: { display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 24 },
    section: { background: "#fff", borderRadius: 12, padding: 20, border: "1px solid #E2E8F0", marginBottom: 16 },
    formSection: { background: "#fff", borderRadius: 12, padding: 20, border: "1px solid #E2E8F0", marginBottom: 16 },
    sectionTitle: { fontSize: 14, fontWeight: 700, color: "#1E293B", marginBottom: 14, marginTop: 0 },
    infoRow: { display: "flex", justifyContent: "space-between", borderBottom: "1px solid #F1F5F9", padding: "8px 0" },
    infoLabel: { fontSize: 13, color: "#64748B" },
    infoValue: { fontSize: 13, fontWeight: 600, color: "#1E293B" },
    table: { width: "100%", borderCollapse: "collapse" },
    th: { background: "#F8FAFC", padding: "8px 10px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#64748B", borderBottom: "1px solid #E2E8F0", textTransform: "uppercase", letterSpacing: 0.5 },
    td: { padding: "10px 10px", fontSize: 13, color: "#374151", borderBottom: "1px solid #F1F5F9" },
    tr: { transition: "background 0.1s" },
    stockBadge: { padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700 },
    searchWrap: { display: "flex", alignItems: "center", gap: 8, background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: "8px 12px", margin: "12px 16px" },
    searchInput: { flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 13, color: "#1E293B" },
    dropdown: { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.1)", margin: "0 0 12px 0", maxHeight: 200, overflowY: "auto" },
    dropdownItem: { padding: "10px 14px", cursor: "pointer", display: "flex", flexDirection: "column", borderBottom: "1px solid #F1F5F9" },
    formRow: { display: "flex", gap: 12, marginBottom: 12 },
    formLabel: { fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 },
    formInput: { width: "100%", border: "1px solid #E2E8F0", borderRadius: 8, padding: "8px 12px", fontSize: 13, outline: "none", color: "#1E293B", background: "#fff", boxSizing: "border-box" },
    removeBtn: { background: "#FEF2F2", border: "1px solid #FECACA", color: "#EF4444", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontWeight: 700 },
    emptyState: { display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 20px" },
    btnPrimary: { background: "#3B82F6", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 },
    btnSuccess: { background: "#10B981", color: "#fff", border: "none", borderRadius: 8, padding: "10px 18px", cursor: "pointer", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 },
    btnOutline: { background: "#fff", color: "#3B82F6", border: "1px solid #3B82F6", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 },
    qtyBtn: { width: 40, height: 40, borderRadius: 8, border: "1px solid #E2E8F0", background: "#F8FAFC", cursor: "pointer", fontSize: 20, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" },
};

// ─── NATIVE (MOBİL) ASSEMBLY SCREEN ──────────────────────────────────────────
function NativeAssemblyScreen({ navigation }) {
    const { products, updateProduct, addProduct } = useContext(AppContext);
    const toast = useToast();
    const { t } = useTranslation();
    const [step, setStep] = useState(0);
    const [selectedItems, setSelectedItems] = useState({});
    const [searchQuery, setSearchQuery] = useState("");
    const [productName, setProductName] = useState("");
    const [category, setCategory] = useState(t("assembly_product"));
    const [productionQuantity, setProductionQuantity] = useState("1");
    const [salePrice, setSalePrice] = useState("");
    const [criticalLimit, setCriticalLimit] = useState("5");
    const [productCode, setProductCode] = useState("");
    const [description, setDescription] = useState("");

    const filteredProducts = useMemo(() => {
        if (!products) return [];
        let list = products.filter(p => (p.quantity || 0) > 0);
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            list = list.filter(p => (p.name || "").toLowerCase().includes(q));
        }
        return list;
    }, [products, searchQuery]);

    const toggleItem = useCallback((product, qty = 1) => {
        setSelectedItems(prev => {
            const cur = prev[product.id] || 0;
            const next = cur + qty;
            if (next <= 0) { const { [product.id]: _, ...rest } = prev; return rest; }
            if (next > (product.quantity || 0)) { Alert.alert(t("insufficient_stock_warning")); return prev; }
            return { ...prev, [product.id]: next };
        });
    }, [t]);

    const unitCost = useMemo(() =>
        Object.keys(selectedItems).reduce((sum, pid) => {
            const p = products.find(pr => pr.id === pid);
            return sum + ((p?.cost || 0) * selectedItems[pid]);
        }, 0), [selectedItems, products]);

    const handleComplete = async () => {
        if (!productName.trim()) { Alert.alert(t("error"), t("enter_product_name")); return; }
        const prodQty = parseInt(productionQuantity, 10);
        if (isNaN(prodQty) || prodQty <= 0) { Alert.alert(t("error"), t("enter_valid_production_quantity")); return; }
        try {
            for (const pid of Object.keys(selectedItems)) {
                const needed = selectedItems[pid] * prodQty;
                const prod = products.find(p => p.id === pid);
                if (!prod || (prod.quantity || 0) < needed) {
                    Alert.alert(t("insufficient_stock_warning"), `${prod?.name}: ${needed} gerekli, ${prod?.quantity || 0} mevcut`);
                    return;
                }
            }
            for (const pid of Object.keys(selectedItems)) {
                const prod = products.find(p => p.id === pid);
                if (prod) await updateProduct({ ...prod, quantity: (prod.quantity || 0) - (selectedItems[pid] * prodQty) });
            }
            const compList = Object.keys(selectedItems).map(pid => {
                const p = products.find(pr => pr.id === pid);
                return `${p?.name} (x${selectedItems[pid]})`;
            }).join(", ");
            await addProduct({
                name: productName.trim(), category: category.trim(),
                quantity: prodQty, cost: unitCost,
                price: parseFloat(salePrice) || 0, code: productCode.trim(),
                criticalStockLimit: parseInt(criticalLimit) || 0,
                description: description ? `${description}\n\nBileşenler: ${compList}` : `Bileşenler: ${compList}`
            }, true);
            toast.showToast?.(t("production_completed", { productName, qty: prodQty }));
            triggerHaptic(HapticType.SUCCESS);
            navigation.navigate("MainTabs", { screen: "Stok" });
        } catch (e) {
            Alert.alert(t("error"), "Üretim gerçekleştirilemedi.");
        }
    };

    return (
        <ImmersiveLayout title={step === 0 ? t("assembly_production") : t("product_production_details")} noScrollView={step === 0}>
            <View style={ns.container}>
                {step === 0 ? (
                    <View style={{ flex: 1 }}>
                        <View style={ns.searchBox}>
                            <Ionicons name="search" size={18} color={Colors.secondary} />
                            <TextInput style={ns.searchInput} placeholder={t("search_component_placeholder")} value={searchQuery} onChangeText={setSearchQuery} />
                        </View>
                        <Text style={ns.stepNote}>{t("production_step_note")}</Text>
                        <FlatList data={filteredProducts} keyExtractor={i => i.id} contentContainerStyle={{ paddingHorizontal: 16 }}
                            ListEmptyComponent={<Text style={ns.empty}>{t("no_component_in_stock")}</Text>}
                            renderItem={({ item }) => {
                                const qty = selectedItems[item.id] || 0;
                                return (
                                    <View style={ns.itemRow}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={ns.itemName}>{item.name}</Text>
                                            <Text style={ns.itemSub}>{t("stock_label")}: {item.quantity} · {t("cost_label")}: {item.cost}₺</Text>
                                        </View>
                                        <View style={ns.qtyCtrl}>
                                            {qty > 0 && (<><TouchableOpacity onPress={() => toggleItem(item, -1)} style={ns.qtyBtn}><Ionicons name="remove" size={16} color={Colors.iosBlue} /></TouchableOpacity><Text style={ns.qtyText}>{qty}</Text></>)}
                                            <TouchableOpacity onPress={() => toggleItem(item, 1)} style={[ns.qtyBtn, { backgroundColor: Colors.iosBlue }]}><Ionicons name="add" size={16} color="#fff" /></TouchableOpacity>
                                        </View>
                                    </View>
                                );
                            }} />
                        <View style={ns.footer}>
                            <View>
                                <Text style={ns.footerLabel}>{t("selected_items_count", { count: Object.keys(selectedItems).length })}</Text>
                                <Text style={ns.footerCost}>{unitCost.toFixed(2)} ₺</Text>
                            </View>
                            <TouchableOpacity style={ns.nextBtn} onPress={() => { if (Object.keys(selectedItems).length === 0) { Alert.alert(t("warning"), t("select_at_least_one_component")); return; } setStep(1); }}>
                                <Text style={ns.nextBtnText}>{t("next")}</Text>
                                <Ionicons name="arrow-forward" size={16} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
                        <View style={ns.costBox}>
                            <Text style={ns.costTitle}>{t("total_estimated_cost")}</Text>
                            <Text style={ns.costValue}>{(unitCost * (parseInt(productionQuantity) || 1)).toFixed(2)} ₺</Text>
                        </View>
                        {[
                            { label: t("product_name_to_create"), value: productName, setter: setProductName, placeholder: t("composite_product_placeholder") },
                            { label: t("category"), value: category, setter: setCategory, placeholder: "Üretim" },
                        ].map(({ label, value, setter, placeholder }) => (
                            <View key={label}>
                                <Text style={ns.label}>{label}</Text>
                                <TextInput style={ns.input} value={value} onChangeText={setter} placeholder={placeholder} />
                            </View>
                        ))}
                        <View style={{ flexDirection: "row", gap: 12 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={ns.label}>{t("production_quantity")}</Text>
                                <TextInput style={ns.input} keyboardType="number-pad" value={productionQuantity} onChangeText={setProductionQuantity} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={ns.label}>{t("sales_price_currency")}</Text>
                                <TextInput style={ns.input} keyboardType="decimal-pad" value={salePrice} onChangeText={setSalePrice} placeholder="0.00" />
                            </View>
                        </View>
                        <View style={ns.actionRow}>
                            <TouchableOpacity style={ns.backBtn} onPress={() => setStep(0)}><Text style={ns.backBtnText}>{t("back")}</Text></TouchableOpacity>
                            <TouchableOpacity style={ns.completeBtn} onPress={handleComplete}><Text style={ns.completeBtnText}>{t("complete_production_add_stock")}</Text></TouchableOpacity>
                        </View>
                    </ScrollView>
                )}
            </View>
        </ImmersiveLayout>
    );
}

// ─── NATIVE STİLLERİ ─────────────────────────────────────────────────────────
const ns = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#fff", borderRadius: 16, overflow: "hidden", ...Platform.select({ web: { minHeight: "80vh", borderWidth: 1, borderColor: "#E2E8F0" } }) },
    searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#F2F5F9", margin: 16, marginBottom: 8, paddingHorizontal: 12, borderRadius: 10, height: 44 },
    searchInput: { flex: 1, marginLeft: 8, fontSize: 15, color: Colors.textPrimary },
    stepNote: { marginHorizontal: 16, marginBottom: 4, fontSize: 12, color: Colors.secondary, fontStyle: "italic" },
    itemRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F2F4F8" },
    itemName: { fontSize: 15, fontWeight: "600", color: Colors.textPrimary },
    itemSub: { fontSize: 12, color: Colors.secondary, marginTop: 2 },
    qtyCtrl: { flexDirection: "row", alignItems: "center", gap: 8 },
    qtyBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#F2F5F9", alignItems: "center", justifyContent: "center" },
    qtyText: { fontSize: 16, fontWeight: "700", minWidth: 24, textAlign: "center" },
    footer: { padding: 16, borderTopWidth: 1, borderTopColor: "#F2F4F8", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    footerLabel: { fontSize: 12, color: Colors.secondary },
    footerCost: { fontSize: 18, fontWeight: "800", color: Colors.iosBlue },
    nextBtn: { backgroundColor: Colors.iosBlue, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 4 },
    nextBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
    empty: { textAlign: "center", marginTop: 60, color: Colors.secondary },
    costBox: { backgroundColor: "#F0F9FF", padding: 20, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: "#BAE6FD", alignItems: "center" },
    costTitle: { fontSize: 14, color: Colors.iosBlue, fontWeight: "600" },
    costValue: { fontSize: 28, fontWeight: "900", color: Colors.iosBlue },
    label: { fontSize: 14, fontWeight: "700", color: Colors.textPrimary, marginBottom: 8, marginTop: 14 },
    input: { borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 10, padding: 12, fontSize: 15, backgroundColor: "#fff" },
    actionRow: { flexDirection: "row", marginTop: 32, gap: 12 },
    backBtn: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0", alignItems: "center" },
    backBtnText: { fontWeight: "600", color: Colors.secondary },
    completeBtn: { flex: 2, backgroundColor: Colors.iosGreen, padding: 14, borderRadius: 12, alignItems: "center" },
    completeBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
});

// ─── ANA EXPORT ───────────────────────────────────────────────────────────────
export default function AssemblyScreen({ navigation }) {
    if (Platform.OS === "web") {
        return <WebBomScreen />;
    }
    return <NativeAssemblyScreen navigation={navigation} />;
}
