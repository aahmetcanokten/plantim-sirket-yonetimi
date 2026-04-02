/**
 * FeaturesShowcasePage.js
 * "Özellikleri Keşfet" sayfası — uygulamanın tüm modüllerini
 * gerçek ekran görüntüleriyle tanıtan tam sayfa bileşen.
 */

import React, { useState, useEffect } from 'react';
import { Platform } from 'react-native';

// ─── CSS Injection ────────────────────────────────────────────────────────────
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const existing = document.getElementById('fsp-styles');
  if (!existing) {
    const style = document.createElement('style');
    style.id = 'fsp-styles';
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

      .fsp-page {
        width: 100%;
        min-height: 100vh;
        background: #F8FAFC;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        -webkit-font-smoothing: antialiased;
        overflow-y: auto;
        overflow-x: hidden;
      }

      /* ── STICKY NAV ─────────────────────────────────── */
      .fsp-nav {
        position: sticky;
        top: 0;
        z-index: 999;
        height: 68px;
        background: rgba(2,6,23,0.95);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-bottom: 1px solid rgba(255,255,255,0.06);
        display: flex;
        align-items: center;
      }
      .fsp-nav-inner {
        max-width: 1280px;
        width: 100%;
        margin: 0 auto;
        padding: 0 40px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .fsp-nav-logo {
        display: flex;
        align-items: center;
        gap: 10px;
        text-decoration: none;
        cursor: pointer;
      }
      .fsp-nav-logo-icon {
        width: 34px; height: 34px;
        border-radius: 9px;
        background: linear-gradient(135deg, #1e40af, #3b82f6);
        display: flex; align-items: center; justify-content: center;
        font-size: 16px;
      }
      .fsp-nav-logo-text {
        font-size: 18px; font-weight: 800;
        color: #fff; letter-spacing: -0.3px;
      }
      .fsp-nav-logo-text span { color: #60A5FA; font-weight: 500; }
      .fsp-nav-back {
        display: flex; align-items: center; gap: 8px;
        font-size: 14px; font-weight: 600; color: #94A3B8;
        background: rgba(255,255,255,0.06);
        padding: 9px 18px; border-radius: 10px;
        border: 1px solid rgba(255,255,255,0.08);
        cursor: pointer;
        transition: all 0.2s;
        text-decoration: none;
      }
      .fsp-nav-back:hover { color: #fff; background: rgba(255,255,255,0.1); }
      .fsp-nav-cta {
        background: #3b82f6; color: #fff;
        font-size: 14px; font-weight: 700;
        padding: 10px 20px; border-radius: 10px;
        border: none; cursor: pointer;
        box-shadow: 0 4px 14px rgba(59,130,246,0.35);
        transition: all 0.2s;
        font-family: 'Inter', sans-serif;
      }
      .fsp-nav-cta:hover { background: #2563eb; transform: translateY(-1px); }

      /* ── HERO ───────────────────────────────────────── */
      .fsp-hero {
        background: linear-gradient(135deg, #020617 0%, #0f172a 45%, #1e1b4b 100%);
        padding: 80px 40px 100px;
        position: relative;
        overflow: hidden;
        text-align: center;
      }
      .fsp-hero-orb1 {
        position: absolute; border-radius: 50%; pointer-events: none;
        width: 600px; height: 600px;
        background: radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%);
        top: -200px; left: -100px;
      }
      .fsp-hero-orb2 {
        position: absolute; border-radius: 50%; pointer-events: none;
        width: 500px; height: 500px;
        background: radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%);
        bottom: -200px; right: -50px;
      }
      .fsp-hero-badge {
        display: inline-flex; align-items: center; gap: 8px;
        background: rgba(59,130,246,0.1);
        border: 1px solid rgba(59,130,246,0.25);
        padding: 7px 16px; border-radius: 999px;
        font-size: 13px; font-weight: 700; color: #60A5FA;
        margin-bottom: 28px;
        position: relative;
      }
      .fsp-hero-badge-dot {
        width: 7px; height: 7px; border-radius: 50%;
        background: #3b82f6;
        animation: fsp-pulse 2s infinite;
      }
      @keyframes fsp-pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.5; transform: scale(1.3); }
      }
      .fsp-hero-title {
        font-size: 56px; font-weight: 900; color: #fff;
        line-height: 64px; letter-spacing: -2px;
        margin: 0 0 20px;
        position: relative;
      }
      .fsp-hero-title .highlight {
        background: linear-gradient(135deg, #60A5FA, #818CF8);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      .fsp-hero-sub {
        font-size: 18px; color: #94A3B8; line-height: 30px;
        max-width: 600px; margin: 0 auto 44px;
        position: relative;
      }
      .fsp-hero-stats {
        display: flex; justify-content: center; gap: 0;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.07);
        border-radius: 20px; padding: 28px 40px;
        max-width: 700px; margin: 0 auto;
        position: relative;
      }
      .fsp-stat {
        flex: 1; text-align: center;
      }
      .fsp-stat-num { font-size: 28px; font-weight: 900; color: #fff; margin: 0 0 4px; }
      .fsp-stat-lbl { font-size: 12px; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.8px; margin: 0; }
      .fsp-stat-divider { width: 1px; background: rgba(255,255,255,0.08); margin: 0 24px; }

      /* ── MODULE TABS ────────────────────────────────── */
      .fsp-modules-section {
        padding: 80px 40px;
        background: #fff;
      }
      .fsp-section-header { text-align: center; margin-bottom: 52px; }
      .fsp-section-eyebrow {
        font-size: 12px; font-weight: 800; color: #3b82f6;
        text-transform: uppercase; letter-spacing: 2px; margin: 0 0 10px;
      }
      .fsp-section-title {
        font-size: 38px; font-weight: 900; color: #0f172a;
        letter-spacing: -1px; margin: 0 0 14px;
      }
      .fsp-section-sub {
        font-size: 16px; color: #64748B; line-height: 1.7;
        max-width: 560px; margin: 0 auto;
      }

      .fsp-tabs {
        display: flex; gap: 8px; flex-wrap: wrap;
        justify-content: center; margin-bottom: 44px;
      }
      .fsp-tab {
        display: flex; align-items: center; gap: 8px;
        padding: 10px 20px; border-radius: 12px;
        font-size: 14px; font-weight: 600;
        border: 1.5px solid #E2E8F0;
        background: #F8FAFC; color: #64748B;
        cursor: pointer; transition: all 0.2s;
        font-family: 'Inter', sans-serif;
      }
      .fsp-tab:hover { border-color: #3b82f6; color: #3b82f6; background: #EFF6FF; }
      .fsp-tab.active {
        background: #2563eb; color: #fff;
        border-color: #2563eb;
        box-shadow: 0 6px 20px rgba(37,99,235,0.35);
      }
      .fsp-tab-icon { font-size: 16px; }

      /* ── SHOWCASE PANEL ─────────────────────────────── */
      .fsp-showcase {
        display: flex; gap: 48px; align-items: flex-start;
        max-width: 1140px; margin: 0 auto;
        animation: fsp-fadein 0.3s ease;
      }
      @keyframes fsp-fadein {
        from { opacity: 0; transform: translateY(12px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .fsp-showcase-info {
        flex: 0 0 340px;
        padding-top: 16px;
      }
      .fsp-showcase-badge {
        display: inline-flex; align-items: center; gap: 8px;
        padding: 6px 14px; border-radius: 10px;
        font-size: 13px; font-weight: 700;
        margin-bottom: 18px;
      }
      .fsp-showcase-title {
        font-size: 30px; font-weight: 900; color: #0f172a;
        letter-spacing: -0.8px; margin: 0 0 14px; line-height: 1.2;
      }
      .fsp-showcase-desc {
        font-size: 15px; color: #475569; line-height: 1.75;
        margin: 0 0 28px;
      }
      .fsp-feature-list { list-style: none; padding: 0; margin: 0 0 32px; }
      .fsp-feature-list li {
        display: flex; align-items: flex-start; gap: 12px;
        font-size: 14px; color: #334155; line-height: 1.55;
        margin-bottom: 14px;
      }
      .fsp-feature-list li::before {
        content: '✓';
        width: 22px; height: 22px; border-radius: 7px;
        display: flex; align-items: center; justify-content: center;
        font-size: 12px; font-weight: 800; flex-shrink: 0;
        margin-top: 1px;
      }
      .fsp-try-btn {
        display: inline-flex; align-items: center; gap: 8px;
        background: #2563eb; color: #fff;
        font-size: 15px; font-weight: 700;
        padding: 13px 24px; border-radius: 12px;
        border: none; cursor: pointer;
        box-shadow: 0 6px 20px rgba(37,99,235,0.3);
        transition: all 0.2s; font-family: 'Inter', sans-serif;
      }
      .fsp-try-btn:hover { background: #1d4ed8; transform: translateY(-1px); }

      .fsp-showcase-screen {
        flex: 1;
        border-radius: 20px;
        overflow: hidden;
        box-shadow: 0 32px 80px rgba(15,23,42,0.14), 0 0 0 1px rgba(15,23,42,0.06);
        position: relative;
      }
      .fsp-screen-topbar {
        background: #1e293b;
        padding: 12px 16px;
        display: flex; align-items: center; gap: 8px;
      }
      .fsp-screen-dot {
        width: 12px; height: 12px; border-radius: 50%;
      }
      .fsp-screen-url {
        flex: 1;
        background: rgba(255,255,255,0.07);
        border-radius: 6px;
        padding: 5px 12px;
        font-size: 12px; color: #94A3B8;
        font-family: 'Inter', sans-serif;
        margin: 0 8px;
      }
      .fsp-screen-img {
        width: 100%;
        display: block;
        border: 0;
      }

      /* ── ALL FEATURES GRID ──────────────────────────── */
      .fsp-all-features {
        background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
        padding: 80px 40px;
      }
      .fsp-all-features .fsp-section-title { color: #fff; }
      .fsp-all-features .fsp-section-sub { color: #94A3B8; }
      .fsp-all-features .fsp-section-eyebrow { color: #60A5FA; }

      .fsp-features-grid {
        max-width: 1140px; margin: 0 auto;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 20px;
      }
      @media (max-width: 1024px) {
        .fsp-features-grid { grid-template-columns: repeat(2, 1fr); }
      }
      @media (max-width: 640px) {
        .fsp-features-grid { grid-template-columns: 1fr; }
        .fsp-hero-title { font-size: 36px; line-height: 44px; }
        .fsp-showcase { flex-direction: column; }
        .fsp-showcase-info { flex: none; }
        .fsp-tabs { gap: 6px; }
        .fsp-tab { font-size: 13px; padding: 8px 14px; }
      }
      .fsp-f-card {
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.07);
        border-radius: 20px; padding: 28px;
        transition: all 0.25s;
      }
      .fsp-f-card:hover {
        background: rgba(255,255,255,0.07);
        transform: translateY(-3px);
        border-color: rgba(255,255,255,0.12);
      }
      .fsp-f-card-icon {
        width: 48px; height: 48px; border-radius: 14px;
        display: flex; align-items: center; justify-content: center;
        font-size: 22px; margin-bottom: 16px;
      }
      .fsp-f-card-title {
        font-size: 16px; font-weight: 800; color: #fff; margin: 0 0 8px;
      }
      .fsp-f-card-desc {
        font-size: 13px; color: #94A3B8; line-height: 1.65; margin: 0;
      }

      /* ── CTA SECTION ────────────────────────────────── */
      .fsp-cta {
        background: #fff;
        padding: 80px 40px;
        text-align: center;
      }
      .fsp-cta-card {
        max-width: 720px; margin: 0 auto;
        background: linear-gradient(135deg, #1e40af 0%, #4f46e5 100%);
        border-radius: 28px; padding: 60px 48px;
        position: relative; overflow: hidden;
      }
      .fsp-cta-card-orb {
        position: absolute; border-radius: 50%; pointer-events: none;
        width: 300px; height: 300px;
        background: rgba(255,255,255,0.05);
      }
      .fsp-cta-card-title {
        font-size: 36px; font-weight: 900; color: #fff;
        letter-spacing: -1px; margin: 0 0 14px; position: relative;
      }
      .fsp-cta-card-sub {
        font-size: 16px; color: rgba(255,255,255,0.7);
        line-height: 1.7; margin: 0 0 36px; position: relative;
      }
      .fsp-cta-btns { display: flex; justify-content: center; gap: 16px; position: relative; flex-wrap: wrap; }
      .fsp-cta-btn-primary {
        display: inline-flex; align-items: center; gap: 10px;
        background: #fff; color: #1e40af;
        font-size: 16px; font-weight: 800;
        padding: 16px 32px; border-radius: 14px; border: none;
        box-shadow: 0 8px 28px rgba(0,0,0,0.2); cursor: pointer;
        font-family: 'Inter', sans-serif; transition: all 0.2s;
      }
      .fsp-cta-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 36px rgba(0,0,0,0.28); }
      .fsp-cta-btn-secondary {
        display: inline-flex; align-items: center; gap: 10px;
        background: transparent; color: rgba(255,255,255,0.85);
        font-size: 16px; font-weight: 700;
        padding: 16px 32px; border-radius: 14px;
        border: 1.5px solid rgba(255,255,255,0.3); cursor: pointer;
        font-family: 'Inter', sans-serif; transition: all 0.2s;
      }
      .fsp-cta-btn-secondary:hover { border-color: rgba(255,255,255,0.6); color: #fff; }

      /* ── FOOTER ─────────────────────────────────────── */
      .fsp-footer {
        background: #020617;
        padding: 32px 40px;
        text-align: center;
      }
      .fsp-footer-brand {
        font-size: 14px; font-weight: 800; color: #475569;
        letter-spacing: 1px; margin: 0 0 6px;
      }
      .fsp-footer-text { font-size: 12px; color: #334155; margin: 0; }

      /* ── RESPONSIVE ─────────────────────────────────── */
      @media (max-width: 768px) {
        .fsp-modules-section, .fsp-all-features, .fsp-cta { padding: 60px 20px; }
        .fsp-hero { padding: 60px 20px 80px; }
        .fsp-hero-stats { padding: 20px 24px; gap: 0; }
        .fsp-nav-inner { padding: 0 20px; }
        .fsp-cta-card { padding: 40px 28px; }
        .fsp-cta-card-title { font-size: 26px; }
      }
    `;
    document.head.appendChild(style);
  }
}

// ─── Module Data ──────────────────────────────────────────────────────────────
const MODULES = [
  {
    id: 'dashboard',
    icon: '📊',
    label: 'Şirket Özeti',
    color: '#6366F1',
    bgColor: '#EEF2FF',
    title: 'Şirket Özeti & Dashboard',
    desc: 'Tüm iş süreçlerinizi tek bir ekrandan takip edin. Gerçek zamanlı verilerle doğru kararlar alın.',
    features: [
      'Gelir, gider ve kâr özetleri anlık güncelleme',
      'Son 6 aylık trend grafikleri',
      'Bekleyen sipariş, satın alma ve iş emirleri',
      'Kritik stok seviyeleri uyarıları',
      'Personel özeti ve açık görev durumu',
    ],
    img: 'https://plantimerp.vercel.app',
    // We'll use a screenshot URL image
  },
  {
    id: 'stok',
    icon: '📦',
    label: 'Stok Yönetimi',
    color: '#8B5CF6',
    bgColor: '#F5F3FF',
    title: 'Stok & Envanter Yönetimi',
    desc: 'Ürünlerinizi, depolarınızı ve stok hareketlerinizi eksiksiz yönetin. Kritik stok uyarıları ile hiç ürün tükenmez.',
    features: [
      'Ürün, kategori ve marka bazlı stok takibi',
      'Çoklu depo ve transfer yönetimi',
      'Barkod ve QR kod desteği',
      'Kritik stok seviyesi uyarıları',
      'Stok değer analizi ve raporlama',
    ],
  },
  {
    id: 'satis',
    icon: '🛒',
    label: 'Satış',
    color: '#10B981',
    bgColor: '#ECFDF5',
    title: 'Satış İşlemleri',
    desc: 'Müşterilerinize hızlı teklif oluşturun, satışları kaydedin ve takibi otomatik yapın.',
    features: [
      'Hızlı satış girişi ve müşteri arama',
      'Teklif oluşturma ve PDF çıktısı',
      'Ödeme durumu ve geciken sipariş takibi',
      'Satış raporları ve analitikler',
      'Müşteri bazlı satış geçmişi',
    ],
  },
  {
    id: 'finans',
    icon: '💰',
    label: 'Finans',
    color: '#F59E0B',
    bgColor: '#FFFBEB',
    title: 'Finans Yönetimi',
    desc: 'Gelir ve giderlerinizi kayıt altına alın, nakit akışınızı anlık takip edin.',
    features: [
      'Gelir ve gider kayıtları',
      'Net kâr ve nakit akış görünümü',
      'Fatura oluşturma',
      'Son 6 aylık finansal grafik',
      'Bekleyen ödemeler ve tahsilatlar',
    ],
  },
  {
    id: 'personel',
    icon: '👥',
    label: 'Personel',
    color: '#0EA5E9',
    bgColor: '#F0F9FF',
    title: 'Personel Yönetimi (İK)',
    desc: 'Çalışanlarınızı, maaşlarını, izinlerini ve görevlerini tek ekrandan yönetin.',
    features: [
      'Personel ekleme, düzenleme ve arşivleme',
      'Departman ve pozisyon yönetimi',
      'Maaş ve izin takibi',
      'Kart veya liste görünümü',
      'Personel bazlı açık görev takibi',
    ],
  },
  {
    id: 'zimmet',
    icon: '💼',
    label: 'Zimmet',
    color: '#EC4899',
    bgColor: '#FDF2F8',
    title: 'Zimmet Yönetimi',
    desc: 'Şirket varlıklarını personellere atayın, iade süreçlerini ve zimmet geçmişini yönetin.',
    features: [
      'Şirket ekipmanlarını kayıt altına alma',
      'Personele zimmet atama ve iade alma',
      'Zimmet geçmişi ve durum takibi',
      'Arama ve filtreleme',
      'Tümü, Zimmetli, Boşta kategorileri',
    ],
  },
];

const ALL_FEATURES = [
  { icon: '🏭', color: '#6366F1', bg: '#EEF2FF', title: 'Montaj & Üretim', desc: 'Üretim emirleri, iş akışı takibi ve malzeme ihtiyaç planlaması.' },
  { icon: '🛠️', color: '#EF4444', bg: '#FEF2F2', title: 'Bakım & Servis', desc: 'Ekipman bakım planlaması, arıza kaydı ve servis takibi.' },
  { icon: '🚛', color: '#F59E0B', bg: '#FFFBEB', title: 'Satın Alma', desc: 'Tedarikçi yönetimi, satın alma siparişleri ve teslim takibi.' },
  { icon: '🏪', color: '#10B981', bg: '#ECFDF5', title: 'Depo & Transfer', desc: 'Çoklu depo arasında stok transfer ve hareket yönetimi.' },
  { icon: '📋', color: '#0EA5E9', bg: '#F0F9FF', title: 'Görev Takibi', desc: 'Personellere görev atama, öncelik belirleme ve durum takibi.' },
  { icon: '👤', color: '#8B5CF6', bg: '#F5F3FF', title: 'Müşteri Yönetimi', desc: 'Müşteri kaydı, iletişim bilgileri ve alım geçmişi.' },
  { icon: '📈', color: '#EC4899', bg: '#FDF2F8', title: 'Analitik & Raporlar', desc: 'Satış, stok ve finans verilerini analiz eden dinamik raporlar.' },
  { icon: '📄', color: '#14B8A6', bg: '#F0FDFA', title: 'Teklifler', desc: 'Profesyonel teklif oluşturma ve PDF çıktısı alma.' },
  { icon: '🔒', color: '#475569', bg: '#F8FAFC', title: 'Güvenlik & Roller', desc: 'Çok kullanıcılı yapı, rol tabanlı erişim kontrolleri.' },
];

// ─── SCREENSHOT URLS (using publicly available screenshots from vercel) ───────
// We'll use the live app URL for screenshots in an iframe or use base64 
// For now we'll build the UI without actual images since we can't embed same-origin screenshots directly
// But we'll show the app interface with descriptive UI elements

// ─── Components ───────────────────────────────────────────────────────────────

function ModuleScreenshot({ module }) {
  // Render a visual representation of the app screen
  const screenshotData = {
    dashboard: {
      title: 'Şirket Özeti',
      items: [
        { label: 'Toplam Gelir', value: '₺0', color: '#10B981' },
        { label: 'Toplam Gider', value: '₺0', color: '#EF4444' },
        { label: 'Bekleyen Sipariş', value: '0', color: '#3B82F6' },
        { label: 'Açık İş Emri', value: '0', color: '#8B5CF6' },
        { label: 'Satın Alma', value: '0', color: '#F59E0B' },
        { label: 'Açık Bakım', value: '0', color: '#14B8A6' },
      ],
      hasChart: true,
    },
    stok: {
      title: 'Stok Yönetimi',
      tableHeaders: ['ÜRÜN ADI', 'ÜRÜN KODU', 'KATEGORİ', 'STOK MİKTARI', 'SATIŞ FİYATI'],
      tableRows: [
        ['Metal Sac 3-15mm', 'Code01', 'Metal', '10.000 Adet', '160 ₺'],
        ['Profil Boru 50x50', 'Code02', 'Metal', '5.000 Adet', '85 ₺'],
        ['Civata M12', 'Code03', 'Bağlantı', '25.000 Adet', '2.5 ₺'],
      ],
    },
    satis: {
      title: 'Satış İşlemleri',
      tableHeaders: ['TARİH', 'MÜŞTERİ', 'ÜRÜN', 'ADET', 'FİYAT', 'DURUM'],
      tableRows: [
        ['01.04.2026', 'ABC Sanayi', 'Metal Sac', '500', '80.000 ₺', 'Bekliyor'],
        ['31.03.2026', 'XYZ Ltd.', 'Profil Boru', '200', '17.000 ₺', 'Tamamlandı'],
        ['30.03.2026', 'DEF A.Ş.', 'Civata M12', '10.000', '25.000 ₺', 'Tamamlandı'],
      ],
    },
    finans: {
      title: 'Finans Yönetimi',
      items: [
        { label: 'Toplam Gelir', value: '₺0', color: '#10B981' },
        { label: 'Toplam Gider', value: '₺0', color: '#EF4444' },
        { label: 'Net Kâr', value: '₺0', color: '#3B82F6' },
        { label: 'Bekleyen Ödemeler', value: '₺0', color: '#F59E0B' },
      ],
      hasChart: true,
    },
    personel: {
      title: 'Personel Yönetimi',
      tableHeaders: ['AD SOYAD', 'POZİSYON', 'DEPARTMAN', 'DURUM', 'MAAŞ', 'İŞLEMLER'],
      tableRows: [
        ['Ahmet Yılmaz', 'Mühendis', 'Üretim', 'Aktif', '35.000 ₺', '✏️🗑️'],
        ['Fatma Kaya', 'İK Uzmanı', 'İnsan Kaynakları', 'Aktif', '28.000 ₺', '✏️🗑️'],
        ['Murat Demir', 'Muhasebeci', 'Finans', 'İzinli', '30.000 ₺', '✏️🗑️'],
      ],
    },
    zimmet: {
      title: 'Zimmet Yönetimi',
      tableHeaders: ['ÜRÜN ADI', 'SERİ NO', 'STATUS', 'PERSONEL', 'TARİH'],
      tableRows: [
        ['Dell Laptop', 'SN-001', 'Zimmetli', 'Ahmet Yılmaz', '01.01.2026'],
        ['iPhone 14', 'SN-002', 'Zimmetli', 'Fatma Kaya', '15.01.2026'],
        ['Monitör 27"', 'SN-003', 'Boşta', '—', '—'],
      ],
    },
  };

  const data = screenshotData[module.id] || screenshotData.dashboard;

  return (
    <div style={{ background: '#F8FAFC', borderTop: '1px solid #E2E8F0' }}>
      {/* App Header Bar */}
      <div style={{
        background: '#1e293b',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF5F57' }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFBD2E' }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28CA41' }} />
        </div>
        <div style={{
          flex: 1, background: 'rgba(255,255,255,0.08)',
          borderRadius: 6, padding: '4px 12px',
          fontSize: 12, color: '#94A3B8', fontFamily: 'Inter, sans-serif',
        }}>
          🔒 plantimerp.com/app
        </div>
      </div>

      {/* App Layout */}
      <div style={{ display: 'flex', minHeight: 340 }}>
        {/* Sidebar */}
        <div style={{ width: 180, background: '#0f172a', padding: '16px 12px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, padding: '0 4px' }}>
            <div style={{ background: '#3b82f6', borderRadius: 8, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🌿</div>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: 'Inter, sans-serif' }}>PLANTİM ERP</span>
          </div>
          {['Şirket Özeti', 'Stok Listesi', 'Montaj/Üretim', 'Satışlar', 'Satın Alma', 'Finans', 'Müşteriler', 'İş Emirleri', 'Zimmet', 'Personel', 'Raporlar'].map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 10px', borderRadius: 8, marginBottom: 2,
              background: item === data.title || (module.id === 'stok' && item === 'Stok Listesi') ? 'rgba(59,130,246,0.15)' : 'transparent',
              cursor: 'pointer',
            }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: item === data.title || (module.id === 'stok' && item === 'Stok Listesi') ? '#3b82f6' : '#334155', flexShrink: 0 }} />
              <span style={{
                color: item === data.title || (module.id === 'stok' && item === 'Stok Listesi') ? '#60A5FA' : '#64748B',
                fontSize: 12, fontFamily: 'Inter, sans-serif', fontWeight: item === data.title ? 600 : 400,
              }}>{item}</span>
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, padding: 20, overflow: 'hidden' }}>
          {/* Top bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0f172a', fontFamily: 'Inter, sans-serif' }}>{data.title}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🔔</div>
              <div style={{
                background: module.color + '15', borderRadius: 8,
                padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: module.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}>T</div>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', fontFamily: 'Inter, sans-serif' }}>Test Şirketi</span>
              </div>
            </div>
          </div>

          {/* Content based on module */}
          {data.items && (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: data.hasChart ? 16 : 0 }}>
              {data.items.map((item, i) => (
                <div key={i} style={{
                  background: '#fff', borderRadius: 12, padding: '14px 18px',
                  border: `1px solid ${item.color}25`,
                  flex: '1 1 120px', minWidth: 100,
                }}>
                  <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'Inter, sans-serif' }}>{item.label}</p>
                  <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: item.color, fontFamily: 'Inter, sans-serif' }}>{item.value}</p>
                </div>
              ))}
            </div>
          )}

          {data.hasChart && (
            <div style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #E2E8F0', marginBottom: 12 }}>
              <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: '#475569', fontFamily: 'Inter, sans-serif' }}>📈 Son 6 Aylık Özet</p>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 60 }}>
                {[30, 45, 28, 60, 42, 70].map((h, i) => (
                  <div key={i} style={{ flex: 1, borderRadius: '4px 4px 0 0', background: `${module.color}${80 + i * 5}`, height: `${h}%` }} />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                {['Kas', 'Ara', 'Oca', 'Şub', 'Mar', 'Nis'].map((m, i) => (
                  <span key={i} style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>{m}</span>
                ))}
              </div>
            </div>
          )}

          {data.tableHeaders && (
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${data.tableHeaders.length}, 1fr)`,
                background: module.color, padding: '10px 16px', gap: 8,
              }}>
                {data.tableHeaders.map((h, i) => (
                  <span key={i} style={{ fontSize: 10, fontWeight: 700, color: '#fff', fontFamily: 'Inter, sans-serif', letterSpacing: '0.5px' }}>{h}</span>
                ))}
              </div>
              {data.tableRows.map((row, ri) => (
                <div key={ri} style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${data.tableHeaders.length}, 1fr)`,
                  padding: '10px 16px', gap: 8,
                  borderBottom: ri < data.tableRows.length - 1 ? '1px solid #F1F5F9' : 'none',
                  background: ri % 2 === 0 ? '#fff' : '#FAFBFC',
                }}>
                  {row.map((cell, ci) => (
                    <span key={ci} style={{
                      fontSize: 12, color: ci === 0 ? '#0f172a' : '#64748B',
                      fontWeight: ci === 0 ? 600 : 400,
                      fontFamily: 'Inter, sans-serif',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{cell}</span>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function FeaturesShowcasePage({ onClose, onRegister }) {
  const [activeModule, setActiveModule] = useState(MODULES[0]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'Özellikler — Plantim ERP';
    }
    return () => {
      if (typeof document !== 'undefined') {
        document.title = 'Plantim ERP';
      }
    };
  }, []);

  const handleRegister = () => {
    if (onRegister) onRegister();
  };

  return (
    <div className="fsp-page">

      {/* ── NAV ── */}
      <nav className="fsp-nav">
        <div className="fsp-nav-inner">
          <div className="fsp-nav-logo" onClick={onClose}>
            <div className="fsp-nav-logo-icon">🌿</div>
            <span className="fsp-nav-logo-text">PLANTİM <span>ERP</span></span>
          </div>
          <button className="fsp-nav-back" onClick={onClose}>
            ← Giriş Sayfasına Dön
          </button>
          <button className="fsp-nav-cta" onClick={handleRegister}>
            Ücretsiz Başla →
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="fsp-hero">
        <div className="fsp-hero-orb1" />
        <div className="fsp-hero-orb2" />

        <div className="fsp-hero-badge">
          <div className="fsp-hero-badge-dot" />
          Tüm özellikler tek platformda
        </div>

        <h1 className="fsp-hero-title">
          Şirketinizi Yönetmenin<br />
          <span className="highlight">En Akıllı Yolu</span>
        </h1>
        <p className="fsp-hero-sub">
          Stoktan satışa, üretimden insan kaynaklarına — tüm iş süreçleriniz
          Plantim ERP'nin güçlü modülleriyle tek ekranda.
        </p>

        <div className="fsp-hero-stats">
          <div className="fsp-stat">
            <p className="fsp-stat-num">12+</p>
            <p className="fsp-stat-lbl">Aktif Modül</p>
          </div>
          <div className="fsp-stat-divider" />
          <div className="fsp-stat">
            <p className="fsp-stat-num">%99.9</p>
            <p className="fsp-stat-lbl">Uptime Garantisi</p>
          </div>
          <div className="fsp-stat-divider" />
          <div className="fsp-stat">
            <p className="fsp-stat-num">SSL</p>
            <p className="fsp-stat-lbl">256-bit Güvenlik</p>
          </div>
          <div className="fsp-stat-divider" />
          <div className="fsp-stat">
            <p className="fsp-stat-num">7/24</p>
            <p className="fsp-stat-lbl">Bulut Erişimi</p>
          </div>
        </div>
      </section>

      {/* ── MODULE SHOWCASE ── */}
      <section className="fsp-modules-section">
        <div className="fsp-section-header">
          <p className="fsp-section-eyebrow">Özellikler</p>
          <h2 className="fsp-section-title">Temel Modüller</h2>
          <p className="fsp-section-sub">
            Her modülü keşfedin — hepsinin nasıl çalıştığını görmek için aşağıdan seçin.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="fsp-tabs">
          {MODULES.map((m) => (
            <button
              key={m.id}
              className={`fsp-tab ${activeModule.id === m.id ? 'active' : ''}`}
              onClick={() => setActiveModule(m)}
              style={activeModule.id === m.id ? { background: m.color, borderColor: m.color } : {}}
            >
              <span className="fsp-tab-icon">{m.icon}</span>
              {m.label}
            </button>
          ))}
        </div>

        {/* Showcase Panel */}
        <div className="fsp-showcase" key={activeModule.id}>
          {/* Info */}
          <div className="fsp-showcase-info">
            <div className="fsp-showcase-badge" style={{ background: activeModule.bgColor, color: activeModule.color }}>
              <span>{activeModule.icon}</span>
              <span>{activeModule.label} Modülü</span>
            </div>
            <h3 className="fsp-showcase-title">{activeModule.title}</h3>
            <p className="fsp-showcase-desc">{activeModule.desc}</p>
            <ul className="fsp-feature-list">
              {activeModule.features.map((f, i) => (
                <li key={i} style={{ '--chk-bg': activeModule.bgColor, '--chk-color': activeModule.color }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: 7,
                    background: activeModule.bgColor, color: activeModule.color,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 800, flexShrink: 0, marginTop: 1,
                  }}>✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <button className="fsp-try-btn" onClick={handleRegister}
              style={{ background: activeModule.color, boxShadow: `0 6px 20px ${activeModule.color}40` }}>
              Ücretsiz Dene →
            </button>
          </div>

          {/* Screen */}
          <div className="fsp-showcase-screen">
            <ModuleScreenshot module={activeModule} />
          </div>
        </div>
      </section>

      {/* ── ALL FEATURES GRID ── */}
      <section className="fsp-all-features">
        <div className="fsp-section-header">
          <p className="fsp-section-eyebrow">Tüm Özellikler</p>
          <h2 className="fsp-section-title">Daha Fazlası da Var</h2>
          <p className="fsp-section-sub">
            Plantim ERP, işletmenizin her ihtiyacını karşılayan kapsamlı modüller sunar.
          </p>
        </div>
        <div className="fsp-features-grid">
          {ALL_FEATURES.map((f, i) => (
            <div key={i} className="fsp-f-card">
              <div className="fsp-f-card-icon" style={{ background: f.bg }}>
                {f.icon}
              </div>
              <h4 className="fsp-f-card-title">{f.title}</h4>
              <p className="fsp-f-card-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="fsp-cta">
        <div className="fsp-cta-card">
          <div className="fsp-cta-card-orb" style={{ top: -80, right: -80 }} />
          <div className="fsp-cta-card-orb" style={{ bottom: -100, left: -60 }} />
          <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '1.5px', margin: '0 0 12px', position: 'relative' }}>
            Hemen başlayın
          </p>
          <h2 className="fsp-cta-card-title">
            Şirketinizi Dijitalleştirmeye<br />Hazır mısınız?
          </h2>
          <p className="fsp-cta-card-sub">
            Ücretsiz planla başlayın, işiniz büyüdükçe Pro'ya geçin.
            Kredi kartı gerekmez.
          </p>
          <div className="fsp-cta-btns">
            <button className="fsp-cta-btn-primary" onClick={handleRegister}>
              🚀 Ücretsiz Hesap Oluştur
            </button>
            <button className="fsp-cta-btn-secondary" onClick={onClose}>
              Giriş Ekranına Dön
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="fsp-footer">
        <p className="fsp-footer-brand">PLANTİM ERP</p>
        <p className="fsp-footer-text">© 2026 Plantim Kurumsal Yazılım Teknolojileri · plantimtakviyelen@gmail.com</p>
      </footer>

    </div>
  );
}
