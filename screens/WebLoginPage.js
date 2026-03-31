/**
 * WebLoginPage.js
 * Web'e özel login/landing sayfası — tamamen native HTML elementleriyle yazılmıştır.
 * Böylece tarayıcının native scroll mekanizması sorunsuz çalışır.
 */

import React, { useState } from 'react';
import { Platform, TextInput, TouchableOpacity, Text, View, Alert, StyleSheet } from 'react-native';
import { useAuth } from '../AuthContext';
import { Colors } from '../Theme';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

// ─── CSS Global Injection ─────────────────────────────────────────────────────
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const existing = document.getElementById('web-login-styles');
  if (!existing) {
    const style = document.createElement('style');
    style.id = 'web-login-styles';
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

      *, *::before, *::after {
        box-sizing: border-box;
      }

      html {
        margin: 0; padding: 0;
        width: 100%;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        -webkit-font-smoothing: antialiased;
      }

      body {
        margin: 0; padding: 0;
        width: 100%;
        min-height: 100vh;
        overflow-x: hidden;
      }

      /* React Native Web root containers — force full width */
      #root, #root > div, #root > div > div {
        width: 100% !important;
        min-width: 0 !important;
        max-width: none !important;
        flex-shrink: 0;
      }

      .wlp-page {
        width: 100%;
        min-height: 100vh;
        overflow-y: auto !important;
        overflow-x: hidden;
        background: #F8FAFC;
        position: relative;
      }

      /* STICKY NAV */
      .wlp-nav {
        position: sticky;
        top: 0;
        z-index: 1000;
        height: 72px;
        background: rgba(255,255,255,0.92);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border-bottom: 1px solid rgba(226,232,240,0.6);
        display: flex;
        align-items: center;
        box-shadow: 0 2px 12px rgba(0,0,0,0.04);
      }
      .wlp-nav-inner {
        max-width: 1280px;
        width: 100%;
        margin: 0 auto;
        padding: 0 40px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .wlp-logo {
        display: flex; align-items: center; gap: 10px; text-decoration: none;
      }
      .wlp-logo-icon {
        width: 36px; height: 36px; border-radius: 10px;
        background: #EFF6FF;
        display: flex; align-items: center; justify-content: center;
      }
      .wlp-logo-text {
        font-size: 20px; font-weight: 800; color: #0F172A; letter-spacing: -0.5px;
      }
      .wlp-logo-text span { color: #0A84FF; font-weight: 500; }
      .wlp-nav-links {
        display: flex; align-items: center; gap: 4px;
      }
      .wlp-nav-link {
        font-size: 14px; font-weight: 600; color: #64748B;
        padding: 8px 14px; border-radius: 20px;
        cursor: pointer; transition: all 0.2s;
        text-decoration: none;
      }
      .wlp-nav-link:hover { color: #0F172A; background: #E2E8F0; }
      .wlp-nav-cta {
        background: #2563EB; color: #fff;
        font-size: 14px; font-weight: 700;
        padding: 10px 20px; border-radius: 10px;
        border: none; cursor: pointer;
        box-shadow: 0 4px 12px rgba(37,99,235,0.3);
        transition: transform 0.15s, box-shadow 0.15s;
      }
      .wlp-nav-cta:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(37,99,235,0.4); }

      /* HERO */
      .wlp-hero {
        background: linear-gradient(135deg, #020617 0%, #0F172A 50%, #1E1B4B 100%);
        padding: 80px 40px 100px;
        position: relative; overflow: hidden;
      }
      .wlp-hero-inner {
        max-width: 1280px; margin: 0 auto;
        display: flex; align-items: center; gap: 60px;
      }
      .wlp-hero-left { flex: 1; max-width: 560px; }
      .wlp-hero-badge {
        display: inline-flex; align-items: center; gap: 8px;
        background: rgba(10,132,255,0.12);
        border: 1px solid rgba(10,132,255,0.2);
        padding: 6px 14px; border-radius: 20px;
        font-size: 13px; font-weight: 700; color: #0A84FF;
        margin-bottom: 24px;
      }
      .wlp-hero-title {
        font-size: 52px; font-weight: 900; color: #fff;
        line-height: 62px; letter-spacing: -1.5px;
        margin: 0 0 20px; padding: 0;
      }
      .wlp-hero-sub {
        font-size: 18px; color: #94A3B8; line-height: 30px;
        margin: 0 0 36px; padding: 0;
      }
      .wlp-hero-btns { display: flex; gap: 16px; margin-bottom: 48px; }
      .wlp-hero-btn-primary {
        display: flex; align-items: center; gap: 10px;
        background: #3B82F6; color: #fff;
        font-size: 16px; font-weight: 800;
        padding: 16px 28px; border-radius: 14px;
        border: none; cursor: pointer;
        box-shadow: 0 8px 30px rgba(59,130,246,0.4);
        transition: transform 0.2s, box-shadow 0.2s;
      }
      .wlp-hero-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(59,130,246,0.5); }
      .wlp-hero-btn-secondary {
        display: flex; align-items: center; gap: 8px;
        color: #0A84FF; font-size: 16px; font-weight: 700;
        padding: 16px 24px; border-radius: 14px;
        border: 1.5px solid rgba(10,132,255,0.3);
        background: transparent; cursor: pointer;
        transition: border-color 0.2s;
      }
      .wlp-hero-btn-secondary:hover { border-color: #0A84FF; }
      .wlp-trust-bar {
        display: flex; gap: 20px; align-items: center;
        background: rgba(255,255,255,0.04);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 20px; padding: 24px;
      }
      .wlp-trust-item { flex: 1; text-align: center; }
      .wlp-trust-stat { font-size: 22px; font-weight: 900; color: #0A84FF; margin: 0 0 4px; }
      .wlp-trust-label { font-size: 12px; font-weight: 600; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; margin: 0; }
      .wlp-trust-divider { width: 1px; height: 40px; background: rgba(255,255,255,0.1); }

      /* HERO FORM CARD */
      .wlp-hero-right {
        background: #fff; border-radius: 28px; padding: 44px;
        width: 440px; flex-shrink: 0;
        box-shadow: 0 24px 80px rgba(15,23,42,0.12);
        border: 1px solid rgba(226,232,240,0.8);
      }
      .wlp-form-header { text-align: center; margin-bottom: 28px; }
      .wlp-form-icon {
        width: 60px; height: 60px; border-radius: 18px;
        background: #EFF6FF;
        display: flex; align-items: center; justify-content: center;
        margin: 0 auto 16px;
      }
      .wlp-form-title { font-size: 26px; font-weight: 800; color: #0F172A; margin: 0 0 8px; letter-spacing: -0.5px; }
      .wlp-form-sub { font-size: 14px; color: #64748B; margin: 0; line-height: 1.6; }

      /* Error */
      .wlp-error {
        display: flex; align-items: center; gap: 8px;
        background: #EF4444; color: #fff;
        padding: 12px; border-radius: 12px; margin-bottom: 16px;
        font-size: 14px; font-weight: 600;
      }

      /* Login Type Toggle */
      .wlp-type-toggle {
        display: flex; background: #F1F5F9;
        border-radius: 12px; padding: 4px; margin-bottom: 24px;
      }
      .wlp-type-tab {
        flex: 1; padding: 10px; text-align: center;
        border-radius: 8px; border: none; background: transparent;
        font-size: 14px; font-weight: 500; color: #64748B;
        cursor: pointer; transition: all 0.15s;
      }
      .wlp-type-tab.active {
        background: #fff; color: #0A84FF; font-weight: 600;
        box-shadow: 0 1px 4px rgba(0,0,0,0.08);
      }

      /* Input Group */
      .wlp-input-group { margin-bottom: 18px; }
      .wlp-input-label {
        display: block; font-size: 13px; font-weight: 600;
        color: #475569; margin-bottom: 8px;
      }
      .wlp-input-wrapper {
        display: flex; align-items: center;
        background: #F8FAFC; border-radius: 14px;
        border: 1.5px solid #E2E8F0;
        padding: 0 14px;
        transition: border-color 0.2s;
      }
      .wlp-input-wrapper:focus-within { border-color: #0A84FF; }
      .wlp-input-icon { margin-right: 10px; flex-shrink: 0; color: #94A3B8; }
      .wlp-input {
        flex: 1; height: 50px; border: none; background: transparent;
        font-size: 15px; color: #0F172A; outline: none;
        font-family: 'Inter', sans-serif;
      }
      .wlp-input::placeholder { color: #94A3B8; }

      /* Forgot password */
      .wlp-forgot {
        display: flex; justify-content: flex-end; margin-bottom: 20px;
        font-size: 13px; font-weight: 600; color: #0A84FF;
        cursor: pointer; background: none; border: none; padding: 0;
        font-family: 'Inter', sans-serif;
      }
      .wlp-forgot:hover { text-decoration: underline; }

      /* Main Button */
      .wlp-main-btn {
        width: 100%; height: 52px;
        display: flex; align-items: center; justify-content: center; gap: 10px;
        background: #2563EB; color: #fff; border: none; border-radius: 14px;
        font-size: 16px; font-weight: 700; cursor: pointer;
        box-shadow: 0 8px 24px rgba(37,99,235,0.35);
        transition: transform 0.15s, box-shadow 0.15s;
        font-family: 'Inter', sans-serif;
      }
      .wlp-main-btn:hover { transform: translateY(-1px); box-shadow: 0 12px 32px rgba(37,99,235,0.45); }
      .wlp-main-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

      /* Toggle */
      .wlp-toggle {
        text-align: center; margin-top: 20px;
        font-size: 14px; color: #64748B; cursor: pointer;
        background: none; border: none; padding: 0;
        font-family: 'Inter', sans-serif; width: 100%;
      }
      .wlp-toggle strong { color: #0A84FF; }

      /* Form Footer */
      .wlp-form-footer {
        margin-top: 24px; padding-top: 20px;
        border-top: 1px solid #F1F5F9;
        text-align: center;
        font-size: 12px; color: #94A3B8; line-height: 1.6;
      }

      /* BG Circles */
      .wlp-circle { position: absolute; border-radius: 50%; pointer-events: none; }

      /* FEATURES */
      .wlp-features {
        background: #fff; padding: 100px 40px; text-align: center;
      }
      .wlp-section-badge {
        font-size: 13px; font-weight: 700; color: #0A84FF;
        text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 12px;
      }
      .wlp-section-title {
        font-size: 40px; font-weight: 900; color: #0F172A;
        letter-spacing: -1px; margin: 0 0 16px;
      }
      .wlp-section-sub {
        font-size: 17px; color: #64748B; line-height: 1.6;
        max-width: 600px; margin: 0 auto 56px;
      }
      .wlp-grid {
        max-width: 1100px; margin: 0 auto;
        display: flex; gap: 24px; flex-wrap: wrap; justify-content: center;
      }
      .wlp-feature-card {
        flex: 1; min-width: 220px; max-width: 260px;
        background: #F8FAFC; border-radius: 24px; padding: 32px;
        border: 1px solid #E2E8F0;
        transition: transform 0.2s, box-shadow 0.2s;
      }
      .wlp-feature-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,0.06); }
      .wlp-feature-icon {
        width: 56px; height: 56px; border-radius: 16px;
        display: flex; align-items: center; justify-content: center; margin-bottom: 20px;
      }
      .wlp-feature-title { font-size: 18px; font-weight: 800; color: #0F172A; margin: 0 0 10px; }
      .wlp-feature-desc { font-size: 14px; color: #64748B; line-height: 1.6; margin: 0; }

      /* WHY */
      .wlp-why {
        background: linear-gradient(135deg, #0F172A 0%, #1E1B4B 100%);
        padding: 100px 40px;
      }
      .wlp-why-inner {
        max-width: 1280px; margin: 0 auto;
        display: flex; gap: 80px; align-items: flex-start;
      }
      .wlp-why-left { width: 320px; flex-shrink: 0; }
      .wlp-why-badge { font-size: 13px; font-weight: 700; color: #0A84FF; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 12px; }
      .wlp-why-title { font-size: 36px; font-weight: 900; color: #fff; line-height: 1.2; letter-spacing: -1px; margin: 0 0 32px; }
      .wlp-why-cta {
        display: inline-flex; align-items: center; gap: 8px;
        background: #0A84FF; color: #fff; font-size: 15px; font-weight: 700;
        padding: 14px 24px; border-radius: 12px; border: none; cursor: pointer;
        box-shadow: 0 6px 20px rgba(10,132,255,0.35);
        font-family: 'Inter', sans-serif;
        transition: transform 0.15s;
      }
      .wlp-why-cta:hover { transform: translateY(-1px); }
      .wlp-why-right { flex: 1; }
      .wlp-why-item {
        display: flex; align-items: flex-start; gap: 20px;
        background: rgba(255,255,255,0.04);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(255,255,255,0.07);
        border-radius: 20px; padding: 24px; margin-bottom: 16px;
      }
      .wlp-why-icon {
        width: 48px; height: 48px; border-radius: 24px;
        background: rgba(10,132,255,0.12);
        display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      }
      .wlp-why-item-title { font-size: 17px; font-weight: 700; color: #fff; margin: 0 0 6px; }
      .wlp-why-item-desc { font-size: 14px; color: #94A3B8; line-height: 1.6; margin: 0; }

      /* MODULES */
      .wlp-modules {
        background: #F8FAFC; padding: 100px 40px; text-align: center;
      }
      .wlp-modules-grid {
        max-width: 1100px; margin: 16px auto 0;
        display: flex; flex-wrap: wrap; gap: 20px; justify-content: center;
      }
      .wlp-module-card {
        display: flex; align-items: center; gap: 16px;
        background: #fff; border-radius: 20px; padding: 24px;
        border: 1px solid #E2E8F0;
        flex: 1; min-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.03);
        transition: transform 0.2s, box-shadow 0.2s;
      }
      .wlp-module-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.07); }
      .wlp-module-icon {
        width: 48px; height: 48px; border-radius: 14px;
        display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      }
      .wlp-module-title { font-size: 16px; font-weight: 800; color: #0F172A; margin: 0 0 4px; }
      .wlp-module-desc { font-size: 13px; color: #64748B; line-height: 1.5; margin: 0; }

      /* STATS BAR */
      .wlp-stats { background: #0F172A; padding: 48px 40px; }
      .wlp-stats-inner {
        max-width: 1100px; margin: 0 auto;
        display: flex; align-items: center; flex-wrap: wrap;
      }
      .wlp-stat-item { flex: 1; text-align: center; padding: 16px 20px; }
      .wlp-stat-number { font-size: 32px; font-weight: 900; color: #fff; margin: 0 0 4px; }
      .wlp-stat-label { font-size: 12px; font-weight: 600; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; margin: 0; }
      .wlp-stat-divider { width: 1px; height: 60px; background: rgba(255,255,255,0.08); }

      /* TESTIMONIALS */
      .wlp-testimonials { background: #fff; padding: 100px 40px; text-align: center; }
      .wlp-testimonials-grid {
        max-width: 1100px; margin: 0 auto;
        display: flex; gap: 24px; flex-wrap: wrap;
      }
      .wlp-testimonial-card {
        flex: 1; min-width: 260px;
        background: #F8FAFC; border-radius: 24px; padding: 32px;
        border: 1px solid #E2E8F0;
        box-shadow: 0 4px 12px rgba(0,0,0,0.03);
        text-align: left;
      }
      .wlp-testimonial-quote { font-size: 15px; color: #334155; line-height: 1.6; font-style: italic; margin: 12px 0 20px; }
      .wlp-testimonial-user { display: flex; align-items: center; gap: 12px; }
      .wlp-testimonial-avatar {
        width: 40px; height: 40px; border-radius: 20px;
        display: flex; align-items: center; justify-content: center;
        font-size: 14px; font-weight: 800;
      }
      .wlp-testimonial-name { font-size: 14px; font-weight: 700; color: #475569; margin: 0; }

      /* PRICING */
      .wlp-pricing {
        background: linear-gradient(160deg, #020617 0%, #0F172A 60%, #1E1B4B 100%);
        padding: 100px 40px; text-align: center;
      }
      .wlp-pricing-cards {
        max-width: 860px; margin: 8px auto 0;
        display: flex; gap: 24px;
      }
      .wlp-price-card {
        flex: 1; position: relative;
        background: rgba(255,255,255,0.05);
        backdrop-filter: blur(20px);
        border-radius: 28px; padding: 36px;
        border: 1px solid rgba(255,255,255,0.08);
      }
      .wlp-price-card.featured {
        border-color: #0A84FF;
        background: rgba(10,132,255,0.08);
        box-shadow: 0 20px 60px rgba(10,132,255,0.2);
      }
      .wlp-popular-badge {
        position: absolute; top: -14px; right: 28px;
        background: #0A84FF; color: #fff;
        font-size: 11px; font-weight: 800;
        padding: 5px 14px; border-radius: 20px;
      }
      .wlp-price-plan { font-size: 13px; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 12px; }
      .wlp-price-plan.pro { color: #0A84FF; }
      .wlp-price-amount { font-size: 40px; font-weight: 900; color: #fff; margin: 0 0 20px; }
      .wlp-price-amount.starter { color: #0F172A; }
      .wlp-price-divider { height: 1px; background: rgba(255,255,255,0.1); margin-bottom: 24px; }
      .wlp-price-feature { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
      .wlp-price-feature-text { font-size: 14px; color: #CBD5E1; margin: 0; }
      .wlp-price-btn {
        width: 100%; margin-top: 24px; padding: 14px;
        border-radius: 12px; font-size: 15px; font-weight: 700;
        cursor: pointer; transition: transform 0.15s; border: none;
        font-family: 'Inter', sans-serif;
      }
      .wlp-price-btn.starter {
        border: 1.5px solid rgba(255,255,255,0.2);
        background: transparent; color: #94A3B8;
        border-width: 1.5px;
      }
      .wlp-price-btn.starter:hover { border-color: rgba(255,255,255,0.4); color: #fff; }
      .wlp-price-btn.pro {
        background: #0A84FF; color: #fff;
        box-shadow: 0 8px 24px rgba(10,132,255,0.4);
      }
      .wlp-price-btn.pro:hover { transform: translateY(-1px); }

      /* FAQ */
      .wlp-faq { background: #F8FAFC; padding: 100px 40px; text-align: center; }
      .wlp-faq-grid { max-width: 860px; margin: 0 auto; text-align: left; }
      .wlp-faq-item {
        background: #fff; border-radius: 20px; padding: 24px;
        border: 1px solid #E2E8F0; margin-bottom: 16px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.03);
      }
      .wlp-faq-q { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px; }
      .wlp-faq-q-text { font-size: 16px; font-weight: 700; color: #0F172A; margin: 0; flex: 1; }
      .wlp-faq-a { font-size: 14px; color: #64748B; line-height: 1.6; margin: 0; padding-left: 32px; }

      /* CTA BANNER */
      .wlp-cta-banner {
        background: linear-gradient(135deg, #1E40AF 0%, #3730A3 50%, #5B21B6 100%);
        padding: 100px 40px; text-align: center; position: relative; overflow: hidden;
      }
      .wlp-cta-title { font-size: 44px; font-weight: 900; color: #fff; max-width: 700px; margin: 16px auto; letter-spacing: -1px; }
      .wlp-cta-sub { font-size: 18px; color: rgba(255,255,255,0.7); line-height: 1.6; max-width: 500px; margin: 0 auto 40px; }
      .wlp-cta-btn {
        display: inline-flex; align-items: center; gap: 10px;
        background: #fff; color: #2563EB;
        font-size: 17px; font-weight: 800;
        padding: 18px 36px; border-radius: 16px; border: none;
        box-shadow: 0 8px 32px rgba(0,0,0,0.2); cursor: pointer;
        font-family: 'Inter', sans-serif;
        transition: transform 0.15s, box-shadow 0.15s;
      }
      .wlp-cta-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(0,0,0,0.3); }
      .wlp-cta-footer { font-size: 12px; color: rgba(255,255,255,0.4); margin-top: 24px; }

      /* FOOTER */
      .wlp-footer { background: #020617; padding: 40px; text-align: center; }
      .wlp-footer-brand { font-size: 15px; font-weight: 800; color: #94A3B8; letter-spacing: 1px; margin: 0 0 8px; }
      .wlp-footer-text { font-size: 13px; color: #475569; margin: 0; }

      /* MOBILE RESPONSIVE */
      @media (max-width: 1023px) {
        .wlp-hero-inner { flex-direction: column; }
        .wlp-hero-left { max-width: 100%; }
        .wlp-hero-right { width: 100%; box-sizing: border-box; }
        .wlp-hero-title { font-size: 36px; line-height: 44px; }
        .wlp-why-inner { flex-direction: column; gap: 32px; }
        .wlp-why-left { width: 100%; }
        .wlp-pricing-cards { flex-direction: column; align-items: center; }
        .wlp-price-card { width: 100%; max-width: 460px; }
        .wlp-nav-links { display: none; }
      }
      @media (max-width: 600px) {
        .wlp-hero { padding: 60px 20px 80px; }
        .wlp-hero-title { font-size: 28px; line-height: 36px; }
        .wlp-hero-right { padding: 28px 24px; }
        .wlp-features, .wlp-why, .wlp-modules, .wlp-testimonials, .wlp-pricing, .wlp-faq, .wlp-cta-banner { padding: 60px 20px; }
        .wlp-section-title { font-size: 28px; }
        .wlp-cta-title { font-size: 28px; }
      }
    `;
    document.head.appendChild(style);
  }
}

// ─── Small sub-components ─────────────────────────────────────────────────────

function IonIcon({ name, size = 20, color = 'currentColor' }) {
  return <Ionicons name={name} size={size} color={color} />;
}

function LoginForm({ email, setEmail, username, setUsername, password, setPassword,
  confirmPassword, setConfirmPassword, isLoginView, loginType, setLoginType,
  loading, handleLogin, handlePersonnelLogin, handleSignUp, handlePasswordReset,
  toggleView, t, errorMsg }) {

  return (
    <div>
      {errorMsg && (
        <div className="wlp-error">
          <IonIcon name="alert-circle" size={18} color="#fff" />
          <span>{errorMsg}</span>
        </div>
      )}

      {isLoginView && (
        <div className="wlp-type-toggle">
          <button className={`wlp-type-tab ${loginType === 'admin' ? 'active' : ''}`} onClick={() => setLoginType('admin')}>
            Yönetici
          </button>
          <button className={`wlp-type-tab ${loginType === 'personnel' ? 'active' : ''}`} onClick={() => setLoginType('personnel')}>
            Personel
          </button>
        </div>
      )}

      {(!isLoginView || loginType === 'admin') ? (
        <div className="wlp-input-group">
          <label className="wlp-input-label">{t('email')}</label>
          <div className="wlp-input-wrapper">
            <span className="wlp-input-icon"><IonIcon name="mail-outline" size={18} color="#94A3B8" /></span>
            <input
              className="wlp-input"
              type="email"
              placeholder="email@sirketiniz.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoCapitalize="none"
            />
          </div>
        </div>
      ) : (
        <div className="wlp-input-group">
          <label className="wlp-input-label">Kullanıcı Adı</label>
          <div className="wlp-input-wrapper">
            <span className="wlp-input-icon"><IonIcon name="person-outline" size={18} color="#94A3B8" /></span>
            <input
              className="wlp-input"
              type="text"
              placeholder="ahmetcan"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoCapitalize="none"
            />
          </div>
        </div>
      )}

      <div className="wlp-input-group">
        <label className="wlp-input-label">{t('password')}</label>
        <div className="wlp-input-wrapper">
          <span className="wlp-input-icon"><IonIcon name="lock-closed-outline" size={18} color="#94A3B8" /></span>
          <input
            className="wlp-input"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </div>
      </div>

      {!isLoginView && (
        <div className="wlp-input-group">
          <label className="wlp-input-label">{t('password_confirm')}</label>
          <div className="wlp-input-wrapper">
            <span className="wlp-input-icon"><IonIcon name="shield-outline" size={18} color="#94A3B8" /></span>
            <input
              className="wlp-input"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
            />
          </div>
        </div>
      )}

      {isLoginView && loginType === 'admin' && (
        <button className="wlp-forgot" onClick={handlePasswordReset} disabled={loading}>
          {t('forgot_password')}
        </button>
      )}

      <button
        className="wlp-main-btn"
        style={(!isLoginView || loginType !== 'admin') ? { marginTop: 24 } : {}}
        onClick={isLoginView ? (loginType === 'admin' ? handleLogin : handlePersonnelLogin) : handleSignUp}
        disabled={loading}
      >
        {loading ? (t('processing') || '...') : (isLoginView ? t('login') : t('register'))}
        <IonIcon name="arrow-forward" size={18} color="#fff" />
      </button>

      <button className="wlp-toggle" onClick={toggleView} disabled={loading}>
        {isLoginView ? t('no_account') : t('has_account')}
        {' '}<strong>{isLoginView ? t('register') : t('login')}</strong>
      </button>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function WebLoginPage() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);
  const [isLoginView, setIsLoginView] = useState(true);
  const [loginType, setLoginType] = useState('admin');
  const [loading, setLoading] = useState(false);

  const { signIn, signUp, resetPassword, signInPersonnel } = useAuth();
  const { t } = useTranslation();

  const handleLogin = async () => {
    if (!email || !password) { alert(t('login_email_password_required')); return; }
    setLoading(true); setErrorMsg(null);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        const msg = error.message.includes('Invalid login credentials')
          ? t('login_error_invalid_credentials') : error.message;
        setErrorMsg(msg);
      }
    } catch (e) { setErrorMsg(e.message); }
    finally { setLoading(false); }
  };

  const handlePersonnelLogin = async () => {
    if (!username || !password) { alert('Kullanıcı adı ve şifre gereklidir.'); return; }
    setLoading(true); setErrorMsg(null);
    try {
      const { error } = await signInPersonnel(username, password);
      if (error) setErrorMsg(error.message.includes('Invalid login credentials') ? 'Giriş bilgileri hatalı.' : error.message);
    } catch (e) { setErrorMsg(e.message); }
    finally { setLoading(false); }
  };

  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword) { alert(t('signup_fields_required')); return; }
    if (password !== confirmPassword) { alert(t('passwords_mismatch_message')); return; }
    if (password.length < 6) { alert(t('password_length_warning')); return; }
    setLoading(true);
    try {
      const { error } = await signUp(email, password);
      if (error) { alert(t('signup_failed') + ': ' + error.message); }
      else {
        alert(t('signup_success_verify_email_web'));
        setEmail(''); setPassword(''); setConfirmPassword('');
      }
    } catch (e) { alert(e.message); }
    finally { setLoading(false); }
  };

  const handlePasswordReset = () => {
    if (!email) { alert(t('reset_password_email_required_message')); return; }
    if (window.confirm(t('reset_link_confirmation', { email }))) {
      resetPassword(email).then(({ error }) => {
        if (error) alert(error.message);
        else alert(t('reset_link_sent_success'));
      });
    }
  };

  const toggleView = () => { setIsLoginView(v => !v); setPassword(''); setConfirmPassword(''); };
  const goRegister = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setIsLoginView(false);
    
    // Web'de .wlp-page container'ı overflow-y: auto olduğu için onun scroll'u yönetilmelidir
    const page = document.querySelector('.wlp-page');
    if (page) {
      page.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="wlp-page">

      {/* ── STICKY NAV ───────────────────────────────────── */}
      <nav className="wlp-nav">
        <div className="wlp-nav-inner">
          <div className="wlp-logo">
            <div className="wlp-logo-icon">
              <IonIcon name="leaf" size={18} color="#0A84FF" />
            </div>
            <span className="wlp-logo-text">PLANTİM <span>ERP</span></span>
          </div>
          <div className="wlp-nav-links">
            <a className="wlp-nav-link" href="#features">{t('web_section_features')}</a>
            <a className="wlp-nav-link" href="#modules">{t('web_section_modules')}</a>
            <a className="wlp-nav-link" href="#pricing">{t('nav_pricing')}</a>
            <a className="wlp-nav-link" href="#faq">{t('nav_faq') || 'SSS'}</a>
          </div>
          <button className="wlp-nav-cta" onClick={goRegister}>{t('register')}</button>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="wlp-hero" id="hero">
        {/* Decorative circles */}
        <div className="wlp-circle" style={{ width: 500, height: 500, background: 'rgba(99,102,241,0.08)', top: -150, right: -100 }} />
        <div className="wlp-circle" style={{ width: 350, height: 350, background: 'rgba(10,132,255,0.06)', bottom: -80, left: 200 }} />

        <div className="wlp-hero-inner">
          {/* Left */}
          <div className="wlp-hero-left">
            <div className="wlp-hero-badge">
              <IonIcon name="flash" size={14} color="#0A84FF" />
              Kurumsal ERP Platformu
            </div>
            <h1 className="wlp-hero-title">{t('web_hero_title')}</h1>
            <p className="wlp-hero-sub">{t('web_hero_sub')}</p>
            <div className="wlp-hero-btns">
              <button className="wlp-hero-btn-primary" onClick={goRegister}>
                {t('web_hero_cta_primary') || 'Ücretsiz Başlayın'}
                <IonIcon name="rocket-outline" size={18} color="#fff" />
              </button>
              <button className="wlp-hero-btn-secondary">
                <IonIcon name="play-circle-outline" size={18} color="#0A84FF" />
                {t('web_hero_cta_secondary') || 'Demo'}
              </button>
            </div>
            <div className="wlp-trust-bar">
              <div className="wlp-trust-item">
                <p className="wlp-trust-stat">{t('web_trust_stat_1')}</p>
                <p className="wlp-trust-label">{t('web_trust_desc_1')}</p>
              </div>
              <div className="wlp-trust-divider" />
              <div className="wlp-trust-item">
                <p className="wlp-trust-stat">{t('web_trust_stat_2')}</p>
                <p className="wlp-trust-label">{t('web_trust_desc_2')}</p>
              </div>
              <div className="wlp-trust-divider" />
              <div className="wlp-trust-item">
                <p className="wlp-trust-stat">{t('web_trust_stat_3')}</p>
                <p className="wlp-trust-label">{t('web_trust_desc_3')}</p>
              </div>
            </div>
          </div>

          {/* Right: Login Card */}
          <div className="wlp-hero-right">
            <div className="wlp-form-header">
              <div className="wlp-form-icon">
                <IonIcon name={isLoginView ? 'lock-open-outline' : 'person-add-outline'} size={28} color="#0A84FF" />
              </div>
              <h2 className="wlp-form-title">{isLoginView ? (t('welcome_back') || 'Tekrar Hoşgeldiniz') : (t('create_account') || 'Hesap Oluşturun')}</h2>
              <p className="wlp-form-sub">{isLoginView ? (t('login_to_continue') || 'Devam etmek için giriş yapın') : (t('signup_to_start') || 'Başlamak için bilgilerinizi girin')}</p>
            </div>

            <LoginForm
              email={email} setEmail={setEmail}
              username={username} setUsername={setUsername}
              password={password} setPassword={setPassword}
              confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword}
              isLoginView={isLoginView} setIsLoginView={setIsLoginView}
              loginType={loginType} setLoginType={setLoginType}
              loading={loading}
              handleLogin={handleLogin} handlePersonnelLogin={handlePersonnelLogin}
              handleSignUp={handleSignUp} handlePasswordReset={handlePasswordReset}
              toggleView={toggleView}
              t={t} errorMsg={errorMsg}
            />

            <div className="wlp-form-footer">{t('web_footer_text')}</div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────── */}
      <section className="wlp-features" id="features">
        <p className="wlp-section-badge">{t('web_section_features') || 'Güçlü Özellikler'}</p>
        <h2 className="wlp-section-title">{t('web_why_erp_title')}</h2>
        <p className="wlp-section-sub">{t('solutions_desc')}</p>
        <div className="wlp-grid">
          {[
            { icon: 'cube-outline', color: '#6366F1', title: t('web_feature_stock'), desc: t('web_feature_stock_desc') },
            { icon: 'stats-chart-outline', color: '#10B981', title: t('web_feature_reports'), desc: t('web_feature_reports_desc') },
            { icon: 'people-outline', color: '#F59E0B', title: t('web_feature_personnel'), desc: t('web_feature_personnel_desc') },
            { icon: 'shield-checkmark-outline', color: '#0A84FF', title: t('web_feature_security'), desc: t('web_feature_security_desc') },
          ].map((f, i) => (
            <div key={i} className="wlp-feature-card">
              <div className="wlp-feature-icon" style={{ background: f.color + '18' }}>
                <IonIcon name={f.icon} size={28} color={f.color} />
              </div>
              <h3 className="wlp-feature-title">{f.title}</h3>
              <p className="wlp-feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── WHY ──────────────────────────────────────────── */}
      <section className="wlp-why">
        <div className="wlp-why-inner">
          <div className="wlp-why-left">
            <p className="wlp-why-badge">Neden Plantim?</p>
            <h2 className="wlp-why-title">{t('web_why_erp_title')}</h2>
            <button className="wlp-why-cta" onClick={goRegister}>
              {t('web_hero_cta_primary') || 'Ücretsiz Başla'}
              <IonIcon name="arrow-forward" size={16} color="#fff" />
            </button>
          </div>
          <div className="wlp-why-right">
            {[
              { icon: 'shield-outline', title: t('web_why_erp_1'), desc: t('web_why_erp_1_desc') },
              { icon: 'phone-portrait-outline', title: t('web_why_erp_2'), desc: t('web_why_erp_2_desc') },
              { icon: 'stats-chart-outline', title: t('web_why_erp_3'), desc: t('web_why_erp_3_desc') },
            ].map((w, i) => (
              <div key={i} className="wlp-why-item">
                <div className="wlp-why-icon"><IonIcon name={w.icon} size={22} color="#0A84FF" /></div>
                <div>
                  <p className="wlp-why-item-title">{w.title}</p>
                  <p className="wlp-why-item-desc">{w.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MODULES ──────────────────────────────────────── */}
      <section className="wlp-modules" id="modules">
        <p className="wlp-section-badge" style={{ color: '#0A84FF' }}>{t('web_section_modules') || 'ERP Modülleri'}</p>
        <h2 className="wlp-section-title" style={{ color: '#0F172A' }}>Her Süreci Kapsayan Modüler Yapı</h2>
        <div className="wlp-modules-grid">
          {[
            { icon: 'cube', color: '#6366F1', title: t('sol_stock'), desc: t('web_module_stock_desc') },
            { icon: 'cart', color: '#10B981', title: t('sol_finance'), desc: t('web_module_sales_desc') },
            { icon: 'people', color: '#F59E0B', title: t('sol_hr'), desc: t('web_module_hr_desc') },
            { icon: 'stats-chart', color: '#EF4444', title: t('sol_finance'), desc: t('web_module_finance_desc') },
            { icon: 'business', color: '#8B5CF6', title: t('sol_asset'), desc: t('web_module_asset_desc') },
            { icon: 'hammer', color: '#0A84FF', title: t('sol_prod'), desc: t('web_module_prod_desc') },
          ].map((m, i) => (
            <div key={i} className="wlp-module-card">
              <div className="wlp-module-icon" style={{ background: m.color }}>
                <IonIcon name={m.icon} size={22} color="#fff" />
              </div>
              <div>
                <p className="wlp-module-title">{m.title}</p>
                <p className="wlp-module-desc">{m.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────── */}
      <section className="wlp-stats">
        <div className="wlp-stats-inner">
          {[
            { stat: '200+', label: t('web_trust_desc_1'), icon: 'business-outline' },
            null,
            { stat: '%99.9', label: t('web_trust_desc_2'), icon: 'pulse-outline' },
            null,
            { stat: '7/24', label: t('web_trust_desc_3'), icon: 'headset-outline' },
            null,
            { stat: 'SSL', label: '256-bit Şifreleme', icon: 'lock-closed-outline' },
          ].map((s, i) => s === null ? (
            <div key={i} className="wlp-stat-divider" />
          ) : (
            <div key={i} className="wlp-stat-item">
              <IonIcon name={s.icon} size={24} color="#0A84FF" />
              <p className="wlp-stat-number" style={{ marginTop: 8 }}>{s.stat}</p>
              <p className="wlp-stat-label">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────── */}
      <section className="wlp-testimonials">
        <p className="wlp-section-badge">{t('web_section_testimonials') || 'Kullanıcı Yorumları'}</p>
        <h2 className="wlp-section-title" style={{ color: '#0F172A' }}>{t('web_testimonial_title')}</h2>
        <div className="wlp-testimonials-grid" style={{ marginTop: 40 }}>
          {[
            { quote: t('web_testimonial_1'), user: t('web_testimonial_user_1'), initials: 'MK', color: '#6366F1' },
            { quote: '"Personel ve zimmet takibinde artık hiç vakit kaybetmiyoruz. Tüm ekibimiz uygulamayı benimsiyor."', user: 'Selin Aydın - İK Müdürü', initials: 'SA', color: '#10B981' },
            { quote: '"Üretim ve satın alma süreçlerimizi tek ekrandan takip edebilmek rekabet avantajı sağladı."', user: 'Kerem Doğan - Fabrika Müdürü', initials: 'KD', color: '#F59E0B' },
          ].map((tc, i) => (
            <div key={i} className="wlp-testimonial-card">
              <IonIcon name="chatbubble-ellipses-outline" size={24} color={tc.color} />
              <p className="wlp-testimonial-quote">{tc.quote}</p>
              <div className="wlp-testimonial-user">
                <div className="wlp-testimonial-avatar" style={{ background: tc.color + '20', color: tc.color }}>
                  {tc.initials}
                </div>
                <p className="wlp-testimonial-name">{tc.user}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────── */}
      <section className="wlp-pricing" id="pricing">
        <p className="wlp-section-badge">{t('nav_pricing')}</p>
        <h2 className="wlp-section-title">Şirketinize Uygun Planı Seçin</h2>
        <p className="wlp-section-sub" style={{ color: '#94A3B8' }}>{t('pricing_desc')}</p>
        <div className="wlp-pricing-cards">
          {/* Starter */}
          <div className="wlp-price-card">
            <p className="wlp-price-plan">{t('pricing_starter')}</p>
            <p className="wlp-price-amount starter">{t('pricing_free')}</p>
            <div className="wlp-price-divider" />
            {[t('pricing_s_1'), t('pricing_s_2'), t('pricing_s_3')].map((f, i) => (
              <div key={i} className="wlp-price-feature">
                <IonIcon name="checkmark-circle" size={18} color="#10B981" />
                <p className="wlp-price-feature-text">{f}</p>
              </div>
            ))}
            <button className="wlp-price-btn starter" onClick={goRegister}>Ücretsiz Başla</button>
          </div>
          {/* Pro */}
          <div className="wlp-price-card featured">
            <div className="wlp-popular-badge">{t('pricing_popular')}</div>
            <p className="wlp-price-plan pro">{t('pricing_pro')}</p>
            <p className="wlp-price-amount">11.880 ₺ <span style={{ fontSize: 14, fontWeight: 400, color: '#94A3B8' }}>{t('pricing_yr')}</span></p>
            <div className="wlp-price-divider" />
            {[t('pricing_p_1'), t('pricing_p_2'), t('pricing_p_3'), t('web_feature_security')].map((f, i) => (
              <div key={i} className="wlp-price-feature">
                <IonIcon name="checkmark-circle" size={18} color="#0A84FF" />
                <p className="wlp-price-feature-text" style={i === 3 ? { fontWeight: 700 } : {}}>{f}</p>
              </div>
            ))}
            <button className="wlp-price-btn pro" onClick={goRegister}>Hemen Başla</button>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────── */}
      <section className="wlp-faq" id="faq">
        <p className="wlp-section-badge">{t('nav_faq') || 'SSS'}</p>
        <h2 className="wlp-section-title" style={{ color: '#0F172A' }}>{t('web_faq_title')}</h2>
        <div className="wlp-faq-grid" style={{ marginTop: 48 }}>
          {[
            { q: t('web_faq_1_q'), a: t('web_faq_1_a') },
            { q: t('web_faq_2_q'), a: t('web_faq_2_a') },
            { q: t('web_faq_3_q'), a: t('web_faq_3_a') },
            { q: t('web_faq_4_q'), a: t('web_faq_4_a') },
            { q: t('web_faq_5_q'), a: t('web_faq_5_a') },
          ].map((faq, i) => (
            <div key={i} className="wlp-faq-item">
              <div className="wlp-faq-q">
                <IonIcon name="help-circle" size={20} color="#0A84FF" />
                <p className="wlp-faq-q-text">{faq.q}</p>
              </div>
              <p className="wlp-faq-a">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA BANNER ───────────────────────────────────── */}
      <section className="wlp-cta-banner">
        <div className="wlp-circle" style={{ width: 400, height: 400, background: 'rgba(255,255,255,0.05)', top: -100, right: 0 }} />
        <div className="wlp-circle" style={{ width: 300, height: 300, background: 'rgba(255,255,255,0.04)', bottom: -80, left: -50 }} />
        <IonIcon name="leaf" size={48} color="rgba(255,255,255,0.15)" />
        <h2 className="wlp-cta-title">{t('web_cta_banner_title')}</h2>
        <p className="wlp-cta-sub">{t('web_cta_banner_sub')}</p>
        <button className="wlp-cta-btn" onClick={goRegister}>
          {t('web_cta_register')}
          <IonIcon name="rocket-outline" size={20} color="#2563EB" />
        </button>
        <p className="wlp-cta-footer">
          <IonIcon name="lock-closed" size={12} color="rgba(255,255,255,0.4)" /> {t('web_trust_footer')}
        </p>
      </section>

      {/* ── FOOTER ───────────────────────────────────────── */}
      <footer className="wlp-footer">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 8 }}>
          <IonIcon name="leaf" size={16} color="#0A84FF" />
          <p className="wlp-footer-brand">PLANTİM ERP</p>
        </div>
        <p className="wlp-footer-text">© 2026 Plantim Kurumsal Yazılım Teknolojileri · plantimtakviyelen@gmail.com</p>
      </footer>

    </div>
  );
}
