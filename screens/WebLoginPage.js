/**
 * WebLoginPage.js
 * Premium web landing + login page for PlantimERP
 * Features: animated hero, feature showcase, scroll animations, glassmorphism, counters
 */

import React, { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '../AuthContext';
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

      *, *::before, *::after { box-sizing: border-box; }

      html {
        margin: 0; padding: 0; width: 100%;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        -webkit-font-smoothing: antialiased;
        scroll-behavior: smooth;
      }

      body { margin: 0; padding: 0; width: 100%; min-height: 100vh; overflow-x: hidden; }

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
        background: #060918;
        position: relative;
      }

      /* ── KEYFRAMES ─────────────────────────────── */
      @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(32px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to   { opacity: 1; }
      }
      @keyframes shimmer {
        0%   { background-position: -200% center; }
        100% { background-position: 200% center; }
      }
      @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50%       { transform: translateY(-12px); }
      }
      @keyframes floatSlow {
        0%, 100% { transform: translateY(0px) rotate(0deg); }
        50%       { transform: translateY(-20px) rotate(3deg); }
      }
      @keyframes pulse-ring {
        0%   { transform: scale(0.8); opacity: 0.8; }
        100% { transform: scale(2.0); opacity: 0; }
      }
      @keyframes rotateSlow {
        from { transform: rotate(0deg); }
        to   { transform: rotate(360deg); }
      }
      @keyframes gradientShift {
        0%   { background-position: 0% 50%; }
        50%  { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      @keyframes slideInLeft {
        from { opacity: 0; transform: translateX(-40px); }
        to   { opacity: 1; transform: translateX(0); }
      }
      @keyframes slideInRight {
        from { opacity: 0; transform: translateX(40px); }
        to   { opacity: 1; transform: translateX(0); }
      }
      @keyframes blink {
        0%, 100% { opacity: 1; }
        50%       { opacity: 0; }
      }
      @keyframes orbitX {
        0%   { transform: translateX(0) translateY(0); }
        25%  { transform: translateX(30px) translateY(-20px); }
        50%  { transform: translateX(0px) translateY(-35px); }
        75%  { transform: translateX(-30px) translateY(-20px); }
        100% { transform: translateX(0) translateY(0); }
      }
      @keyframes glow {
        0%, 100% { box-shadow: 0 0 20px rgba(59,130,246,0.3); }
        50%       { box-shadow: 0 0 50px rgba(59,130,246,0.6), 0 0 80px rgba(99,102,241,0.3); }
      }
      @keyframes typewriter {
        from { width: 0; }
        to   { width: 100%; }
      }

      /* ── REVEAL ANIMATION ─────────────────────── */
      .reveal {
        opacity: 0;
        transform: translateY(28px);
        transition: opacity 0.7s ease, transform 0.7s ease;
      }
      .reveal.visible {
        opacity: 1;
        transform: translateY(0);
      }
      .reveal-left {
        opacity: 0;
        transform: translateX(-32px);
        transition: opacity 0.7s ease, transform 0.7s ease;
      }
      .reveal-left.visible {
        opacity: 1;
        transform: translateX(0);
      }
      .reveal-right {
        opacity: 0;
        transform: translateX(32px);
        transition: opacity 0.7s ease, transform 0.7s ease;
      }
      .reveal-right.visible {
        opacity: 1;
        transform: translateX(0);
      }
      .reveal-delay-1 { transition-delay: 0.1s; }
      .reveal-delay-2 { transition-delay: 0.2s; }
      .reveal-delay-3 { transition-delay: 0.3s; }
      .reveal-delay-4 { transition-delay: 0.4s; }
      .reveal-delay-5 { transition-delay: 0.5s; }

      /* ── NAV ──────────────────────────────────── */
      .wlp-nav {
        position: sticky;
        top: 0;
        z-index: 1000;
        height: 68px;
        background: rgba(6,9,24,0.85);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-bottom: 1px solid rgba(255,255,255,0.06);
        display: flex;
        align-items: center;
        transition: background 0.3s;
      }
      .wlp-nav-inner {
        max-width: 1320px; width: 100%; margin: 0 auto;
        padding: 0 32px;
        display: flex; align-items: center; justify-content: space-between;
      }
      .wlp-logo {
        display: flex; align-items: center; gap: 10px; text-decoration: none; cursor: pointer;
      }
      .wlp-logo-icon {
        width: 38px; height: 38px; border-radius: 12px;
        background: linear-gradient(135deg, #3B82F6, #6366F1);
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 4px 14px rgba(99,102,241,0.4);
      }
      .wlp-logo-text {
        font-size: 19px; font-weight: 800; color: #fff; letter-spacing: -0.4px;
      }
      .wlp-logo-text span { color: #60A5FA; font-weight: 500; }
      .wlp-nav-links { display: flex; align-items: center; gap: 2px; }
      .wlp-nav-link {
        font-size: 14px; font-weight: 500; color: rgba(255,255,255,0.6);
        padding: 8px 14px; border-radius: 8px;
        cursor: pointer; transition: all 0.2s;
        text-decoration: none; background: none; border: none;
        font-family: 'Inter', sans-serif;
      }
      .wlp-nav-link:hover { color: #fff; background: rgba(255,255,255,0.07); }
      .wlp-nav-actions { display: flex; align-items: center; gap: 10px; }
      .wlp-nav-login {
        font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.7);
        padding: 9px 18px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.12);
        cursor: pointer; background: transparent; transition: all 0.2s;
        font-family: 'Inter', sans-serif;
      }
      .wlp-nav-login:hover { color: #fff; border-color: rgba(255,255,255,0.3); background: rgba(255,255,255,0.05); }
      .wlp-nav-cta {
        background: linear-gradient(135deg, #2563EB, #4F46E5); color: #fff;
        font-size: 14px; font-weight: 700;
        padding: 10px 22px; border-radius: 10px;
        border: none; cursor: pointer;
        box-shadow: 0 4px 14px rgba(79,70,229,0.4);
        transition: transform 0.15s, box-shadow 0.15s;
        font-family: 'Inter', sans-serif;
      }
      .wlp-nav-cta:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(79,70,229,0.5); }

      /* ── HERO ─────────────────────────────────── */
      .wlp-hero {
        background: #060918;
        padding: 0;
        position: relative;
        overflow: hidden;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
      }
      .wlp-hero-bg {
        position: absolute; inset: 0; pointer-events: none;
      }
      .wlp-hero-orb {
        position: absolute; border-radius: 50%; filter: blur(80px);
      }
      .wlp-hero-orb-1 {
        width: 700px; height: 700px;
        background: radial-gradient(circle, rgba(79,70,229,0.25) 0%, transparent 70%);
        top: -200px; right: -100px;
        animation: floatSlow 8s ease-in-out infinite;
      }
      .wlp-hero-orb-2 {
        width: 500px; height: 500px;
        background: radial-gradient(circle, rgba(59,130,246,0.2) 0%, transparent 70%);
        bottom: -100px; left: -50px;
        animation: floatSlow 10s ease-in-out infinite reverse;
      }
      .wlp-hero-orb-3 {
        width: 350px; height: 350px;
        background: radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%);
        top: 40%; left: 35%;
        animation: float 6s ease-in-out infinite;
      }
      .wlp-hero-grid-lines {
        position: absolute; inset: 0;
        background-image: 
          linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
        background-size: 60px 60px;
        mask-image: radial-gradient(ellipse at 50% 50%, black 0%, transparent 75%);
      }

      .wlp-hero-content {
        flex: 1;
        max-width: 1320px; width: 100%; margin: 0 auto;
        padding: 80px 32px 60px;
        display: flex; align-items: center; gap: 60px;
        position: relative; z-index: 2;
      }
      .wlp-hero-left { flex: 1; max-width: 600px; }
      .wlp-hero-badge {
        display: inline-flex; align-items: center; gap: 8px;
        background: rgba(99,102,241,0.1);
        border: 1px solid rgba(99,102,241,0.25);
        padding: 7px 16px; border-radius: 100px;
        font-size: 12.5px; font-weight: 700; color: #818CF8;
        margin-bottom: 28px;
        animation: fadeInUp 0.6s ease both;
        text-transform: uppercase; letter-spacing: 0.8px;
      }
      .wlp-badge-dot {
        width: 6px; height: 6px; border-radius: 50%;
        background: #818CF8;
        animation: pulse-ring 1.5s ease-out infinite;
        position: relative;
      }
      .wlp-hero-title {
        font-size: 62px; font-weight: 900; color: #fff;
        line-height: 1.05; letter-spacing: -2.5px;
        margin: 0 0 24px; padding: 0;
        animation: fadeInUp 0.6s ease 0.1s both;
      }
      .wlp-hero-title-gradient {
        background: linear-gradient(135deg, #60A5FA 0%, #818CF8 40%, #34D399 100%);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        background-clip: text;
        background-size: 200% 200%;
        animation: gradientShift 4s ease infinite;
        display: block;
      }
      .wlp-hero-sub {
        font-size: 18px; color: rgba(255,255,255,0.55); line-height: 1.7;
        margin: 0 0 40px; padding: 0;
        animation: fadeInUp 0.6s ease 0.2s both;
        max-width: 520px;
      }
      .wlp-hero-btns {
        display: flex; gap: 14px; margin-bottom: 52px;
        animation: fadeInUp 0.6s ease 0.3s both;
        flex-wrap: wrap;
      }
      .wlp-hero-btn-primary {
        display: flex; align-items: center; gap: 10px;
        background: linear-gradient(135deg, #2563EB, #4F46E5); color: #fff;
        font-size: 15px; font-weight: 700;
        padding: 15px 28px; border-radius: 12px;
        border: none; cursor: pointer;
        box-shadow: 0 8px 30px rgba(79,70,229,0.45);
        transition: transform 0.2s, box-shadow 0.2s;
        font-family: 'Inter', sans-serif;
        animation: glow 3s ease-in-out infinite;
      }
      .wlp-hero-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 14px 44px rgba(79,70,229,0.55); }
      .wlp-hero-btn-secondary {
        display: flex; align-items: center; gap: 8px;
        color: rgba(255,255,255,0.75); font-size: 15px; font-weight: 600;
        padding: 15px 24px; border-radius: 12px;
        border: 1px solid rgba(255,255,255,0.12);
        background: rgba(255,255,255,0.05); cursor: pointer;
        transition: all 0.2s; backdrop-filter: blur(10px);
        font-family: 'Inter', sans-serif;
      }
      .wlp-hero-btn-secondary:hover { border-color: rgba(255,255,255,0.3); color: #fff; background: rgba(255,255,255,0.09); }

      /* Trust Pills Row */
      .wlp-trust-pills {
        display: flex; gap: 12px; flex-wrap: wrap;
        animation: fadeInUp 0.6s ease 0.4s both;
      }
      .wlp-trust-pill {
        display: flex; align-items: center; gap: 7px;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 100px; padding: 8px 16px;
        font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.6);
      }
      .wlp-trust-pill-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }

      /* Hero Right - Login Card */
      .wlp-hero-right {
        width: 460px; flex-shrink: 0;
        animation: slideInRight 0.7s ease 0.15s both;
      }
      .wlp-login-card {
        background: rgba(255,255,255,0.04);
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 28px; padding: 44px 40px;
        box-shadow: 0 30px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08);
        position: relative; overflow: hidden;
      }
      .wlp-login-card::before {
        content: '';
        position: absolute; top: 0; left: 0; right: 0;
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(99,102,241,0.5), transparent);
      }
      .wlp-form-header { text-align: center; margin-bottom: 28px; }
      .wlp-form-icon-wrap {
        width: 64px; height: 64px; border-radius: 20px;
        background: linear-gradient(135deg, rgba(59,130,246,0.2), rgba(99,102,241,0.2));
        border: 1px solid rgba(99,102,241,0.3);
        display: flex; align-items: center; justify-content: center;
        margin: 0 auto 16px;
        box-shadow: 0 8px 24px rgba(99,102,241,0.2);
      }
      .wlp-form-title { font-size: 24px; font-weight: 800; color: #fff; margin: 0 0 8px; letter-spacing: -0.5px; }
      .wlp-form-sub { font-size: 14px; color: rgba(255,255,255,0.4); margin: 0; line-height: 1.6; }

      /* Type Toggle */
      .wlp-type-toggle {
        display: flex; background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 12px; padding: 4px; margin-bottom: 22px;
      }
      .wlp-type-tab {
        flex: 1; padding: 10px; text-align: center;
        border-radius: 8px; border: none; background: transparent;
        font-size: 13.5px; font-weight: 600; color: rgba(255,255,255,0.4);
        cursor: pointer; transition: all 0.2s; font-family: 'Inter', sans-serif;
      }
      .wlp-type-tab.active {
        background: rgba(99,102,241,0.2); color: #818CF8; font-weight: 700;
        border: 1px solid rgba(99,102,241,0.3);
      }

      /* Input */
      .wlp-input-group { margin-bottom: 16px; }
      .wlp-input-label {
        display: block; font-size: 12.5px; font-weight: 600;
        color: rgba(255,255,255,0.5); margin-bottom: 7px; text-transform: uppercase; letter-spacing: 0.5px;
      }
      .wlp-input-wrapper {
        display: flex; align-items: center;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 12px; padding: 0 14px;
        transition: border-color 0.2s, background 0.2s;
      }
      .wlp-input-wrapper:focus-within {
        border-color: rgba(99,102,241,0.5);
        background: rgba(99,102,241,0.06);
        box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
      }
      .wlp-input-icon { margin-right: 10px; flex-shrink: 0; color: rgba(255,255,255,0.3); }
      .wlp-input {
        flex: 1; height: 48px; border: none; background: transparent;
        font-size: 14.5px; color: #fff; outline: none;
        font-family: 'Inter', sans-serif;
      }
      .wlp-input::placeholder { color: rgba(255,255,255,0.25); }

      /* Error */
      .wlp-error {
        display: flex; align-items: center; gap: 8px;
        background: rgba(239,68,68,0.1); color: #FCA5A5;
        border: 1px solid rgba(239,68,68,0.25);
        padding: 11px 14px; border-radius: 10px; margin-bottom: 14px;
        font-size: 13px; font-weight: 500;
      }

      /* Forgot */
      .wlp-forgot {
        display: flex; justify-content: flex-end; margin-bottom: 18px;
        font-size: 12.5px; font-weight: 600; color: #60A5FA;
        cursor: pointer; background: none; border: none; padding: 0;
        font-family: 'Inter', sans-serif;
      }
      .wlp-forgot:hover { text-decoration: underline; }

      /* Main Button */
      .wlp-main-btn {
        width: 100%; height: 50px;
        display: flex; align-items: center; justify-content: center; gap: 10px;
        background: linear-gradient(135deg, #2563EB, #4F46E5); color: #fff;
        border: none; border-radius: 12px;
        font-size: 15px; font-weight: 700; cursor: pointer;
        box-shadow: 0 8px 24px rgba(79,70,229,0.4);
        transition: transform 0.15s, box-shadow 0.15s;
        font-family: 'Inter', sans-serif;
        position: relative; overflow: hidden;
      }
      .wlp-main-btn::before {
        content: '';
        position: absolute; top: 0; left: -100%; width: 100%; height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
        transition: left 0.4s;
      }
      .wlp-main-btn:hover::before { left: 100%; }
      .wlp-main-btn:hover { transform: translateY(-1px); box-shadow: 0 12px 32px rgba(79,70,229,0.5); }
      .wlp-main-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

      /* Toggle */
      .wlp-toggle {
        text-align: center; margin-top: 18px;
        font-size: 13.5px; color: rgba(255,255,255,0.4); cursor: pointer;
        background: none; border: none; padding: 0;
        font-family: 'Inter', sans-serif; width: 100%;
      }
      .wlp-toggle strong { color: #60A5FA; font-weight: 700; }
      .wlp-form-footer {
        margin-top: 20px; padding-top: 16px;
        border-top: 1px solid rgba(255,255,255,0.06);
        text-align: center;
        font-size: 11.5px; color: rgba(255,255,255,0.25); line-height: 1.6;
      }

      /* ── STATS TICKER ─────────────────────────── */
      .wlp-stats-ticker {
        background: rgba(255,255,255,0.025);
        border-top: 1px solid rgba(255,255,255,0.06);
        border-bottom: 1px solid rgba(255,255,255,0.06);
        padding: 28px 40px;
        position: relative; z-index: 2;
        overflow: hidden;
      }
      .wlp-stats-ticker-inner {
        max-width: 1100px; margin: 0 auto;
        display: flex; align-items: center; justify-content: center;
        gap: 0; flex-wrap: nowrap;
      }
      .wlp-stat-block { flex: 1; text-align: center; padding: 8px 20px; }
      .wlp-stat-num { 
        font-size: 34px; font-weight: 900; color: #fff;
        margin: 0 0 4px; letter-spacing: -1px;
        background: linear-gradient(135deg, #60A5FA, #818CF8);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      .wlp-stat-lbl { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.35); text-transform: uppercase; letter-spacing: 0.8px; margin: 0; }
      .wlp-stat-sep { width: 1px; height: 48px; background: rgba(255,255,255,0.07); flex-shrink: 0; }

      /* ── FEATURE STRIP ────────────────────────── */
      .wlp-feature-strip {
        padding: 100px 40px;
        background: #060918;
        position: relative; overflow: hidden;
      }
      .wlp-feature-strip-bg {
        position: absolute; inset: 0;
        background: radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.08) 0%, transparent 60%);
        pointer-events: none;
      }
      .wlp-feature-strip-inner {
        max-width: 1320px; margin: 0 auto;
        position: relative; z-index: 2;
      }
      .wlp-section-label {
        font-size: 12.5px; font-weight: 700; color: #818CF8;
        text-transform: uppercase; letter-spacing: 2px;
        display: flex; align-items: center; gap: 8px; margin-bottom: 14px;
      }
      .wlp-section-label::before, .wlp-section-label::after {
        content: ''; flex: 1; height: 1px;
        background: linear-gradient(90deg, rgba(99,102,241,0.3), transparent);
      }
      .wlp-section-label::before { background: linear-gradient(90deg, transparent, rgba(99,102,241,0.3)); }
      .wlp-section-head {
        font-size: 44px; font-weight: 900; color: #fff;
        letter-spacing: -1.5px; line-height: 1.1;
        margin: 0 0 16px; text-align: center;
      }
      .wlp-section-head span {
        background: linear-gradient(135deg, #60A5FA, #818CF8 50%, #34D399);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      .wlp-section-desc {
        font-size: 17px; color: rgba(255,255,255,0.45); line-height: 1.7;
        max-width: 600px; margin: 0 auto 64px; text-align: center;
      }

      /* Feature Cards Grid */
      .wlp-feat-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 20px;
      }
      .wlp-feat-card {
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.07);
        border-radius: 24px; padding: 32px;
        transition: transform 0.3s, border-color 0.3s, background 0.3s;
        cursor: default;
        position: relative; overflow: hidden;
      }
      .wlp-feat-card::before {
        content: '';
        position: absolute; top: 0; left: 0; right: 0; height: 1px;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
        opacity: 0; transition: opacity 0.3s;
      }
      .wlp-feat-card:hover {
        transform: translateY(-6px);
        border-color: rgba(99,102,241,0.3);
        background: rgba(99,102,241,0.05);
      }
      .wlp-feat-card:hover::before { opacity: 1; }
      .wlp-feat-icon-wrap {
        width: 56px; height: 56px; border-radius: 16px;
        display: flex; align-items: center; justify-content: center;
        margin-bottom: 22px;
        position: relative;
      }
      .wlp-feat-icon-wrap::after {
        content: '';
        position: absolute; inset: -4px;
        border-radius: 20px;
        opacity: 0.2;
        transition: opacity 0.3s;
      }
      .wlp-feat-card:hover .wlp-feat-icon-wrap::after { opacity: 0.5; }
      .wlp-feat-title { font-size: 18px; font-weight: 800; color: #fff; margin: 0 0 10px; }
      .wlp-feat-desc { font-size: 14px; color: rgba(255,255,255,0.45); line-height: 1.65; margin: 0; }
      .wlp-feat-tag {
        display: inline-block; margin-top: 16px;
        font-size: 11.5px; font-weight: 700; padding: 4px 12px; border-radius: 100px;
      }

      /* ── MODULES SHOWCASE ─────────────────────── */
      .wlp-modules-section {
        padding: 100px 40px;
        background: linear-gradient(180deg, #060918 0%, #0A0E24 100%);
        position: relative;
      }
      .wlp-modules-section-bg {
        position: absolute; inset: 0;
        background: radial-gradient(ellipse at 80% 50%, rgba(16,185,129,0.06) 0%, transparent 60%);
        pointer-events: none;
      }
      .wlp-modules-inner { max-width: 1320px; margin: 0 auto; position: relative; z-index: 2; }
      .wlp-modules-layout {
        display: flex; gap: 80px; align-items: center;
        margin-top: 60px;
      }
      .wlp-modules-list { flex: 1; }
      .wlp-module-item {
        display: flex; align-items: flex-start; gap: 18px;
        padding: 22px; border-radius: 18px;
        border: 1px solid transparent;
        cursor: pointer; transition: all 0.25s;
        margin-bottom: 10px;
      }
      .wlp-module-item:hover, .wlp-module-item.active {
        background: rgba(255,255,255,0.04);
        border-color: rgba(255,255,255,0.08);
      }
      .wlp-module-item.active { border-color: rgba(99,102,241,0.3); background: rgba(99,102,241,0.06); }
      .wlp-module-icon-box {
        width: 48px; height: 48px; border-radius: 14px;
        display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      }
      .wlp-module-name { font-size: 16px; font-weight: 700; color: #fff; margin: 0 0 4px; }
      .wlp-module-desc-short { font-size: 13.5px; color: rgba(255,255,255,0.4); line-height: 1.5; margin: 0; }
      .wlp-modules-visual { width: 460px; flex-shrink: 0; }
      .wlp-module-preview {
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 24px; padding: 32px;
        animation: float 4s ease-in-out infinite;
        box-shadow: 0 40px 80px rgba(0,0,0,0.4);
      }
      .wlp-preview-title { font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 1px; margin: 0 0 20px; }
      .wlp-preview-row {
        display: flex; align-items: center; justify-content: space-between;
        padding: 12px 16px; border-radius: 12px;
        background: rgba(255,255,255,0.04); margin-bottom: 8px;
      }
      .wlp-preview-label { font-size: 13px; color: rgba(255,255,255,0.5); }
      .wlp-preview-val { font-size: 13px; font-weight: 700; color: #fff; }
      .wlp-preview-badge {
        font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 100px;
      }
      .wlp-preview-chart {
        display: flex; align-items: flex-end; gap: 6px; height: 80px;
        margin-top: 20px; padding: 0 4px;
      }
      .wlp-bar {
        flex: 1; border-radius: 4px 4px 0 0;
        transition: height 0.5s ease;
      }

      /* ── WHY SECTION ──────────────────────────── */
      .wlp-why-section {
        padding: 100px 40px;
        background: #060918;
        position: relative; overflow: hidden;
      }
      .wlp-why-bg {
        position: absolute; inset: 0;
        background: radial-gradient(ellipse at 20% 50%, rgba(59,130,246,0.07) 0%, transparent 60%);
        pointer-events: none;
      }
      .wlp-why-inner2 { max-width: 1320px; margin: 0 auto; position: relative; z-index: 2; }
      .wlp-why-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        gap: 22px; margin-top: 60px;
      }
      .wlp-why-card {
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.07);
        border-radius: 24px; padding: 36px;
        position: relative; overflow: hidden;
        transition: transform 0.3s, border-color 0.3s;
      }
      .wlp-why-card:hover { transform: translateY(-4px); border-color: rgba(255,255,255,0.15); }
      .wlp-why-card-num {
        font-size: 48px; font-weight: 900; 
        position: absolute; top: 20px; right: 24px;
        opacity: 0.07; line-height: 1; color: #fff;
      }
      .wlp-why-icon2 {
        width: 54px; height: 54px; border-radius: 16px;
        display: flex; align-items: center; justify-content: center;
        margin-bottom: 20px;
      }
      .wlp-why-title2 { font-size: 20px; font-weight: 800; color: #fff; margin: 0 0 10px; }
      .wlp-why-desc2 { font-size: 14px; color: rgba(255,255,255,0.4); line-height: 1.65; margin: 0; }

      /* ── TESTIMONIALS ─────────────────────────── */
      .wlp-testi-section {
        padding: 100px 40px;
        background: #0A0E24;
        position: relative; overflow: hidden;
      }
      .wlp-testi-bg {
        position: absolute; inset: 0;
        background: radial-gradient(ellipse at 70% 30%, rgba(99,102,241,0.08) 0%, transparent 60%);
        pointer-events: none;
      }
      .wlp-testi-inner { max-width: 1100px; margin: 0 auto; position: relative; z-index: 2; }
      .wlp-testi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 22px; margin-top: 60px;
      }
      .wlp-testi-card {
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.07);
        border-radius: 24px; padding: 32px;
        position: relative;
        transition: transform 0.3s;
      }
      .wlp-testi-card:hover { transform: translateY(-4px); }
      .wlp-testi-stars { display: flex; gap: 4px; margin-bottom: 18px; }
      .wlp-testi-quote { font-size: 15px; color: rgba(255,255,255,0.65); line-height: 1.7; margin: 0 0 24px; font-style: italic; }
      .wlp-testi-user { display: flex; align-items: center; gap: 12px; }
      .wlp-testi-avatar {
        width: 42px; height: 42px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 14px; font-weight: 800; flex-shrink: 0;
      }
      .wlp-testi-name { font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.8); margin: 0 0 2px; }
      .wlp-testi-role { font-size: 12px; color: rgba(255,255,255,0.35); margin: 0; }

      /* ── PRICING ──────────────────────────────── */
      .wlp-pricing-section {
        padding: 100px 40px;
        background: #060918;
        position: relative; overflow: hidden;
      }
      .wlp-pricing-bg {
        position: absolute; inset: 0;
        background: radial-gradient(ellipse at 50% 100%, rgba(79,70,229,0.12) 0%, transparent 60%);
        pointer-events: none;
      }
      .wlp-pricing-inner { max-width: 900px; margin: 0 auto; position: relative; z-index: 2; }
      .wlp-pricing-cards {
        display: flex; gap: 24px; margin-top: 60px;
      }
      .wlp-price-card {
        flex: 1; border-radius: 28px; padding: 40px;
        border: 1px solid rgba(255,255,255,0.08);
        background: rgba(255,255,255,0.03);
        transition: transform 0.3s;
        position: relative; overflow: hidden;
      }
      .wlp-price-card:hover { transform: translateY(-4px); }
      .wlp-price-card.featured {
        background: rgba(99,102,241,0.08);
        border-color: rgba(99,102,241,0.4);
        box-shadow: 0 0 60px rgba(99,102,241,0.15), inset 0 1px 0 rgba(99,102,241,0.2);
      }
      .wlp-price-card.featured::before {
        content: '';
        position: absolute; top: 0; left: 0; right: 0; height: 2px;
        background: linear-gradient(90deg, #3B82F6, #818CF8, #3B82F6);
        background-size: 200% 100%;
        animation: shimmer 2s linear infinite;
      }
      .wlp-popular-tag {
        position: absolute; top: -1px; right: 28px;
        background: linear-gradient(135deg, #3B82F6, #818CF8);
        color: #fff; font-size: 11px; font-weight: 800;
        padding: 6px 16px; border-radius: 0 0 12px 12px;
        text-transform: uppercase; letter-spacing: 0.5px;
      }
      .wlp-price-plan { font-size: 12.5px; font-weight: 800; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 2px; margin: 0 0 16px; }
      .wlp-price-plan.pro { color: #818CF8; }
      .wlp-price-amount { font-size: 44px; font-weight: 900; color: #fff; margin: 0 0 8px; letter-spacing: -1px; }
      .wlp-price-period { font-size: 14px; font-weight: 400; color: rgba(255,255,255,0.35); }
      .wlp-price-divider { height: 1px; background: rgba(255,255,255,0.06); margin: 28px 0; }
      .wlp-price-feat-item { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
      .wlp-price-feat-text { font-size: 14px; color: rgba(255,255,255,0.6); margin: 0; }
      .wlp-price-btn {
        width: 100%; margin-top: 28px; padding: 15px;
        border-radius: 14px; font-size: 15px; font-weight: 700;
        cursor: pointer; border: none; transition: all 0.2s;
        font-family: 'Inter', sans-serif;
      }
      .wlp-price-btn.starter {
        background: rgba(255,255,255,0.06);
        color: rgba(255,255,255,0.6);
        border: 1px solid rgba(255,255,255,0.12);
      }
      .wlp-price-btn.starter:hover { background: rgba(255,255,255,0.1); color: #fff; }
      .wlp-price-btn.pro {
        background: linear-gradient(135deg, #2563EB, #4F46E5); color: #fff;
        box-shadow: 0 8px 28px rgba(79,70,229,0.4);
      }
      .wlp-price-btn.pro:hover { transform: translateY(-1px); box-shadow: 0 12px 36px rgba(79,70,229,0.5); }

      /* ── FAQ ──────────────────────────────────── */
      .wlp-faq-section { padding: 100px 40px; background: #0A0E24; }
      .wlp-faq-inner { max-width: 800px; margin: 0 auto; }
      .wlp-faq-item {
        border: 1px solid rgba(255,255,255,0.07);
        border-radius: 18px; padding: 0;
        margin-bottom: 12px; overflow: hidden;
        transition: border-color 0.2s;
      }
      .wlp-faq-item:hover { border-color: rgba(99,102,241,0.3); }
      .wlp-faq-q {
        display: flex; align-items: center; justify-content: space-between; gap: 12px;
        padding: 22px 24px; cursor: pointer;
        background: rgba(255,255,255,0.03);
      }
      .wlp-faq-q-text { font-size: 16px; font-weight: 700; color: rgba(255,255,255,0.85); margin: 0; flex: 1; }
      .wlp-faq-a { font-size: 14px; color: rgba(255,255,255,0.45); line-height: 1.7; margin: 0; padding: 0 24px 22px; }

      /* ── CTA BANNER ───────────────────────────── */
      .wlp-cta-section {
        padding: 120px 40px;
        background: linear-gradient(135deg, #1E1B4B 0%, #2E1065 50%, #1E1B4B 100%);
        text-align: center; position: relative; overflow: hidden;
      }
      .wlp-cta-bg {
        position: absolute; inset: 0; pointer-events: none;
        background: radial-gradient(ellipse at 50% 80%, rgba(139,92,246,0.2) 0%, transparent 60%);
      }
      .wlp-cta-grid {
        position: absolute; inset: 0;
        background-image: 
          linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
        background-size: 80px 80px;
      }
      .wlp-cta-inner { position: relative; z-index: 2; max-width: 700px; margin: 0 auto; }
      .wlp-cta-badge {
        display: inline-flex; align-items: center; gap: 8px;
        background: rgba(139,92,246,0.15); border: 1px solid rgba(139,92,246,0.3);
        padding: 8px 18px; border-radius: 100px;
        font-size: 12.5px; font-weight: 700; color: #C4B5FD;
        margin-bottom: 24px; text-transform: uppercase; letter-spacing: 1px;
      }
      .wlp-cta-title { font-size: 52px; font-weight: 900; color: #fff; margin: 0 0 20px; letter-spacing: -2px; line-height: 1.05; }
      .wlp-cta-sub { font-size: 18px; color: rgba(255,255,255,0.55); line-height: 1.65; margin: 0 auto 40px; }
      .wlp-cta-btn-main {
        display: inline-flex; align-items: center; gap: 10px;
        background: #fff; color: #4F46E5;
        font-size: 16px; font-weight: 800;
        padding: 18px 38px; border-radius: 16px; border: none;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3); cursor: pointer;
        font-family: 'Inter', sans-serif;
        transition: transform 0.2s, box-shadow 0.2s;
      }
      .wlp-cta-btn-main:hover { transform: translateY(-2px); box-shadow: 0 14px 44px rgba(0,0,0,0.4); }
      .wlp-cta-note { font-size: 13px; color: rgba(255,255,255,0.3); margin-top: 20px; display: flex; align-items: center; justify-content: center; gap: 6px; }

      /* ── FOOTER ───────────────────────────────── */
      .wlp-footer {
        background: #030612; padding: 48px 40px;
        border-top: 1px solid rgba(255,255,255,0.05);
      }
      .wlp-footer-inner {
        max-width: 1320px; margin: 0 auto;
        display: flex; align-items: center; justify-content: space-between;
        flex-wrap: wrap; gap: 20px;
      }
      .wlp-footer-logo { display: flex; align-items: center; gap: 10px; }
      .wlp-footer-brand { font-size: 15px; font-weight: 800; color: rgba(255,255,255,0.5); letter-spacing: 1px; margin: 0; }
      .wlp-footer-sep { color: rgba(255,255,255,0.15); margin: 0 6px; }
      .wlp-footer-text { font-size: 13px; color: rgba(255,255,255,0.25); margin: 0; }
      .wlp-footer-links { display: flex; gap: 20px; }
      .wlp-footer-link { font-size: 13px; color: rgba(255,255,255,0.3); cursor: pointer; transition: color 0.2s; }
      .wlp-footer-link:hover { color: rgba(255,255,255,0.6); }

      /* ── FLOATING ELEMENTS ────────────────────── */
      .wlp-float-card {
        position: absolute;
        background: rgba(255,255,255,0.05);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 16px; padding: 14px 18px;
        pointer-events: none;
        box-shadow: 0 20px 40px rgba(0,0,0,0.3);
      }
      .wlp-float-card-1 {
        top: 15%; left: -10px;
        animation: float 5s ease-in-out infinite;
      }
      .wlp-float-card-2 {
        bottom: 20%; right: -20px;
        animation: float 6s ease-in-out infinite reverse;
      }
      .wlp-float-label { font-size: 11px; color: rgba(255,255,255,0.4); margin: 0 0 4px; }
      .wlp-float-value { font-size: 16px; font-weight: 800; color: #fff; margin: 0; }
      .wlp-float-trend { font-size: 11px; font-weight: 700; margin: 2px 0 0; }

      /* ── BGs & FLOATS ─────────────────────────── */
      .wlp-circle { position: absolute; border-radius: 50%; pointer-events: none; }

      /* ── INTEGRATION & STEPS ──────────────────── */
      .wlp-integrations-section {
        padding: 100px 40px;
        background: #02040A;
        text-align: center; border-top: 1px solid rgba(255,255,255,0.05);
        border-bottom: 1px solid rgba(255,255,255,0.05);
      }
      .wlp-integrations-inner { max-width: 1100px; margin: 0 auto; }
      .wlp-int-grid { display: flex; flex-wrap: wrap; justify-content: center; gap: 16px; margin-top: 50px; }
      .wlp-int-item {
        background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); 
        border-radius: 100px; padding: 14px 24px; display: flex; align-items: center; gap: 12px;
        color: rgba(255,255,255,0.6); transition: all 0.3s;
      }
      .wlp-int-item:hover { transform: translateY(-4px); background: rgba(255,255,255,0.08); color: #fff; border-color: rgba(255,255,255,0.2); }

      .wlp-steps-section { padding: 100px 40px; background: #060918; }
      .wlp-steps-inner { max-width: 1200px; margin: 0 auto; }
      .wlp-steps-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 30px; margin-top: 60px; }
      .wlp-step-card { text-align: center; padding: 20px; }
      .wlp-step-num {
        width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #3B82F6, #8B5CF6);
        color: #fff; font-size: 24px; font-weight: 900; display: flex; align-items: center; justify-content: center;
        margin: 0 auto 20px; box-shadow: 0 10px 20px rgba(59,130,246,0.3);
      }
      .wlp-step-title { font-size: 20px; font-weight: 800; color: #fff; margin-bottom: 12px; }
      .wlp-step-desc { font-size: 15px; color: rgba(255,255,255,0.45); line-height: 1.6; }

      /* ── ROI / METRICS ────────────────────────── */
      .wlp-roi-section { padding: 100px 40px; background: #0A0E24; }
      .wlp-roi-inner { max-width: 1100px; margin: 0 auto; display: flex; align-items: center; gap: 60px; }
      .wlp-roi-left { flex: 1; min-width: 300px; }
      .wlp-roi-right { flex: 1.2; min-width: 300px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
      .wlp-roi-card {
        background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
        border-radius: 20px; padding: 32px 24px; text-align: center; transition: transform 0.3s;
      }
      .wlp-roi-card:hover { transform: translateY(-4px); border-color: rgba(99,102,241,0.3); background: rgba(99,102,241,0.05); }
      .wlp-roi-num { font-size: 42px; font-weight: 900; color: #fff; margin-bottom: 8px; letter-spacing: -1.5px; }
      .wlp-roi-num span { color: #60A5FA; }
      .wlp-roi-text { font-size: 14px; color: rgba(255,255,255,0.5); line-height: 1.5; margin: 0; }

      /* ── INDUSTRIES ───────────────────────────── */
      .wlp-ind-section { padding: 100px 40px; background: #060918; }
      .wlp-ind-inner { max-width: 1200px; margin: 0 auto; }
      .wlp-ind-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 24px; margin-top: 50px; }
      .wlp-ind-card {
        border-radius: 24px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05);
        padding: 32px 28px; transition: all 0.3s;
      }
      .wlp-ind-card:hover { background: rgba(255,255,255,0.04); border-color: rgba(99,102,241,0.3); transform: translateY(-4px); }
      .wlp-ind-icon-wrap { width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; margin-bottom: 20px; }
      .wlp-ind-title { font-size: 18px; font-weight: 800; color: #fff; margin: 0 0 10px; }
      .wlp-ind-desc { font-size: 14px; color: rgba(255,255,255,0.4); line-height: 1.6; margin: 0; }

      /* ── MOBILE ───────────────────────────────── */
      @media (max-width: 1100px) {
        .wlp-hero-content { flex-direction: column; padding: 60px 24px 48px; }
        .wlp-hero-left { max-width: 100%; }
        .wlp-hero-right { width: 100%; max-width: 500px; margin: 0 auto; }
        .wlp-hero-title { font-size: 46px; }
        .wlp-modules-layout { flex-direction: column; }
        .wlp-modules-visual { width: 100%; }
        .wlp-pricing-cards { flex-direction: column; max-width: 440px; margin-left: auto; margin-right: auto; }
        .wlp-nav-links { display: none; }
        .wlp-footer-inner { flex-direction: column; text-align: center; }
        .wlp-footer-links { justify-content: center; }
      }
      @media (max-width: 640px) {
        .wlp-hero-title { font-size: 34px; letter-spacing: -1px; }
        .wlp-section-head { font-size: 32px; }
        .wlp-cta-title { font-size: 34px; }
        .wlp-feature-strip, .wlp-modules-section, .wlp-why-section, .wlp-testi-section, .wlp-pricing-section, .wlp-faq-section, .wlp-cta-section, .wlp-roi-section, .wlp-ind-section { padding: 70px 20px; }
        .wlp-hero-btn-primary, .wlp-hero-btn-secondary { font-size: 14px; padding: 13px 20px; }
        .wlp-login-card { padding: 32px 24px; }
        .wlp-stats-ticker-inner { flex-wrap: wrap; }
        .wlp-stat-sep { display: none; }
        .wlp-why-grid { grid-template-columns: 1fr; }
        .wlp-roi-inner { flex-direction: column; gap: 40px; }
        .wlp-roi-left { text-align: center; }
        .wlp-roi-left .wlp-section-head, .wlp-roi-left .wlp-section-desc { text-align: center !important; }
        .wlp-roi-right { grid-template-columns: 1fr; }
        .wlp-roi-card { transform: none !important; }
      }
    `;
    document.head.appendChild(style);
  }
}

// ─── Scroll Reveal Hook ────────────────────────────────────────────────────────
function useScrollReveal() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    const elements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

// ─── Animated Counter ─────────────────────────────────────────────────────────
function AnimatedCounter({ target, suffix = '', prefix = '' }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const numTarget = parseFloat(target.replace(/[^0-9.]/g, ''));
          const duration = 1800;
          const step = 16;
          const steps = duration / step;
          let current = 0;
          const increment = numTarget / steps;
          const timer = setInterval(() => {
            current += increment;
            if (current >= numTarget) {
              setCount(numTarget);
              clearInterval(timer);
            } else {
              setCount(Math.floor(current));
            }
          }, step);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return (
    <span ref={ref} className="wlp-stat-num">
      {prefix}{count}{suffix}
    </span>
  );
}

// ─── Icon ─────────────────────────────────────────────────────────────────────
function Icon({ name, size = 20, color = 'currentColor' }) {
  return <Ionicons name={name} size={size} color={color} />;
}

// ─── Login Form ───────────────────────────────────────────────────────────────
function LoginForm({
  email, setEmail, username, setUsername,
  password, setPassword, confirmPassword, setConfirmPassword,
  isLoginView, loginType, setLoginType,
  loading, handleLogin, handlePersonnelLogin, handleSignUp, handlePasswordReset,
  toggleView, t, errorMsg,
}) {
  return (
    <div>

      {isLoginView && (
        <div className="wlp-type-toggle">
          <button
            className={`wlp-type-tab ${loginType === 'admin' ? 'active' : ''}`}
            onClick={() => setLoginType('admin')}
          >
            <Icon name="shield-outline" size={14} color={loginType === 'admin' ? '#818CF8' : 'rgba(255,255,255,0.35)'} />
            {' '}Yönetici
          </button>
          <button
            className={`wlp-type-tab ${loginType === 'personnel' ? 'active' : ''}`}
            onClick={() => setLoginType('personnel')}
          >
            <Icon name="person-outline" size={14} color={loginType === 'personnel' ? '#818CF8' : 'rgba(255,255,255,0.35)'} />
            {' '}Personel
          </button>
        </div>
      )}

      {(!isLoginView || loginType === 'admin') ? (
        <div className="wlp-input-group">
          <label className="wlp-input-label">{t('email')}</label>
          <div className="wlp-input-wrapper">
            <span className="wlp-input-icon"><Icon name="mail-outline" size={17} color="rgba(255,255,255,0.3)" /></span>
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
            <span className="wlp-input-icon"><Icon name="person-outline" size={17} color="rgba(255,255,255,0.3)" /></span>
            <input
              className="wlp-input"
              type="text"
              placeholder="kullanici_adi"
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
          <span className="wlp-input-icon"><Icon name="lock-closed-outline" size={17} color="rgba(255,255,255,0.3)" /></span>
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
            <span className="wlp-input-icon"><Icon name="shield-outline" size={17} color="rgba(255,255,255,0.3)" /></span>
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

      {errorMsg && (
        <div className="wlp-error">
          <Icon name="alert-circle" size={15} color="#FCA5A5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <button
        className="wlp-main-btn"
        style={(!isLoginView || loginType !== 'admin') ? { marginTop: 20 } : {}}
        onClick={isLoginView ? (loginType === 'admin' ? handleLogin : handlePersonnelLogin) : handleSignUp}
        disabled={loading}
      >
        {loading
          ? (t('processing') || 'Lütfen bekleyin...')
          : (isLoginView ? t('login') : t('register'))}
        <Icon name={loading ? 'hourglass-outline' : 'arrow-forward'} size={17} color="#fff" />
      </button>

      <button className="wlp-toggle" onClick={toggleView} disabled={loading}>
        {isLoginView ? t('no_account') : t('has_account')}
        {' '}<strong>{isLoginView ? t('register') : t('login')}</strong>
      </button>
    </div>
  );
}

// ─── MODULE PREVIEW DATA ───────────────────────────────────────────────────────
const MODULE_PREVIEWS = [
  {
    icon: 'apps-outline', color: '#818CF8', bg: 'rgba(129,140,248,0.15)',
    name: 'Şirket Özeti Yönetim Paneli',
    desc: 'Gelir, gider, sipariş ve iş emirlerinizi tek bir merkezden, anlık grafiklerle görüntüleyin.',
    preview: {
      title: 'Genel Bakış',
      rows: [
        { label: 'Toplam Gelir', val: '₺328.868', badge: { text: 'Yükselişte', color: '#34D399', bg: 'rgba(52,211,153,0.12)' } },
        { label: 'Bekleyen Sipariş', val: '7 Adet', badge: null },
        { label: 'Açık İş Emri', val: '3 Adet', badge: { text: 'Üretimde', color: '#60A5FA', bg: 'rgba(96,165,250,0.12)' } },
      ],
      bars: [30, 40, 25, 60, 45, 90, 70],
      barColor: '#818CF8',
    },
  },
  {
    icon: 'cube', color: '#6366F1', bg: 'rgba(99,102,241,0.15)',
    name: 'Stok & Depo Yönetimi',
    desc: 'Birden fazla depo lokasyonunda stok miktarlarını, toplam maliyet değerlerini ve ürün ağaçlarını takip edin.',
    preview: {
      title: 'Stok Listesi',
      rows: [
        { label: 'Stok Kaydı', val: '11 Kayıt', badge: null },
        { label: 'Toplam Değer', val: '₺401.716,00', badge: { text: 'Aktif', color: '#34D399', bg: 'rgba(52,211,153,0.12)' } },
        { label: 'Kritik Durum', val: '2 Ürün', badge: { text: 'Tükendi', color: '#F87171', bg: 'rgba(248,113,113,0.12)' } },
      ],
      bars: [60, 80, 45, 90, 70, 85, 55],
      barColor: '#6366F1',
    },
  },
  {
    icon: 'cash', color: '#10B981', bg: 'rgba(16,185,129,0.15)',
    name: 'Finans & Bütçe Yönetimi',
    desc: 'Tüm nakit işlemlerinizi, maaş ve satın alma giderlerinizi ve net kâr oranlarınızı saniyeler içinde analiz edin.',
    preview: {
      title: 'Finansal Özet',
      rows: [
        { label: 'Toplam Gelir', val: '₺758.360', badge: { text: '+%12', color: '#34D399', bg: 'rgba(52,211,153,0.12)' } },
        { label: 'Toplam Gider', val: '₺382.900', badge: { text: 'Ödendi', color: '#60A5FA', bg: 'rgba(96,165,250,0.12)' } },
        { label: 'Net Kâr', val: '₺375.460', badge: { text: 'Kâr Marjı %49', color: '#34D399', bg: 'rgba(52,211,153,0.12)' } },
      ],
      bars: [55, 70, 60, 82, 75, 90, 68],
      barColor: '#10B981',
    },
  },
  {
    icon: 'cart-outline', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)',
    name: 'Satın Alma',
    desc: 'Tedarikçilerden gelen siparişlerinizi, teslimat tarihlerini ve açık satın alma maliyetlerinizi planlayın.',
    preview: {
      title: 'Sipariş Durumu',
      rows: [
        { label: 'Toplam Sipariş', val: '10 Adet', badge: null },
        { label: 'Açık / Teslim', val: '3 / 7', badge: { text: 'Açık', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' } },
        { label: 'Bekleyen Maliyet', val: '₺21.960', badge: null },
      ],
      bars: [80, 75, 90, 85, 88, 92, 87],
      barColor: '#F59E0B',
    },
  },
  {
    icon: 'business-outline', color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)',
    name: 'Zimmet Yönetimi',
    desc: 'Personelinize atanmış donanım ve araçları, seri numaraları ve durum bilgileriyle kolayca kontrol edin.',
    preview: {
      title: 'Zimmet Özeti',
      rows: [
        { label: 'Toplam Kayıt', val: '5 Adet', badge: null },
        { label: 'Personele Zimmetli', val: '4 Aktif', badge: { text: 'Zimmetli', color: '#34D399', bg: 'rgba(52,211,153,0.12)' } },
        { label: 'Boşta (Uygun)', val: '1 Cihaz', badge: { text: 'Boşta', color: '#A78BFA', bg: 'rgba(167,139,250,0.15)' } },
      ],
      bars: [70, 85, 60, 92, 78, 88, 95],
      barColor: '#8B5CF6',
    },
  },
];

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
  const [activeModule, setActiveModule] = useState(0);
  const [openFaq, setOpenFaq] = useState(null);

  const { signIn, signUp, resetPassword, signInPersonnel } = useAuth();
  const { t } = useTranslation();

  useScrollReveal();

  const handleLogin = async () => {
    if (!email || !password) { setErrorMsg(t('login_email_password_required')); return; }
    setLoading(true); setErrorMsg(null);
    try {
      const { session, error } = await signIn(email, password);
      if (error) {
        const msg = error.message.includes('Invalid login credentials')
          ? t('login_error_invalid_credentials') : error.message;
        setErrorMsg(msg);
      }
    } catch (e) { setErrorMsg(e.message); }
    finally { setLoading(false); }
  };

  const handlePersonnelLogin = async () => {
    if (!username || !password) { setErrorMsg(t('fill_all_fields')); return; }
    setLoading(true); setErrorMsg(null);
    try {
      const { session, error } = await signInPersonnel(username, password);
      if (error) {
        const msg = error.message.includes('Invalid login credentials')
          ? t('login_error_invalid_credentials') : error.message;
        setErrorMsg(msg);
      }
    } catch (e) { setErrorMsg(e.message); }
    finally { setLoading(false); }
  };

  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword) { setErrorMsg(t('signup_fields_required')); return; }
    if (password !== confirmPassword) { setErrorMsg(t('passwords_mismatch_message')); return; }
    if (password.length < 6) { setErrorMsg(t('password_length_warning')); return; }
    setLoading(true); setErrorMsg(null);
    try {
      const { error } = await signUp(email, password);
      if (error) { setErrorMsg(error.message); }
      else {
        alert(t('signup_success_verify_email_web'));
        setEmail(''); setPassword(''); setConfirmPassword('');
      }
    } catch (e) { setErrorMsg(e.message); }
    finally { setLoading(false); }
  };

  const handlePasswordReset = () => {
    if (!email) { setErrorMsg(t('reset_password_email_required_message')); return; }
    setErrorMsg(null);
    if (window.confirm(t('reset_link_confirmation', { email }))) {
      setLoading(true);
      resetPassword(email).then(({ error }) => {
        if (error) setErrorMsg(error.message);
        else alert(t('reset_link_sent_success'));
      }).finally(() => setLoading(false));
    }
  };

  const toggleView = () => {
    setIsLoginView(v => !v);
    setPassword(''); setConfirmPassword(''); setErrorMsg(null);
  };

  const goRegister = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setIsLoginView(false); setErrorMsg(null);
    const page = document.querySelector('.wlp-page');
    if (page) page.scrollTo({ top: 0, behavior: 'smooth' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeMod = MODULE_PREVIEWS[activeModule];

  const features = [
    {
      icon: 'apps-outline', color: '#818CF8', bg: 'rgba(129,140,248,0.15)',
      title: 'Detaylı Şirket Özeti',
      desc: 'Toplam gelir, bekleyen siparişler, satınalma onayları ve açık iş emirlerini renkli bildirimler ve sezgisel grafiklerle tek ekranda inceleyin.',
      tag: 'Dashboard', tagColor: '#60A5FA', tagBg: 'rgba(96,165,250,0.12)'
    },
    {
      icon: 'cube-outline', color: '#6366F1', bg: 'rgba(99,102,241,0.15)',
      title: 'Gelişmiş Stok Yönetimi',
      desc: 'Her ürünün SN kodu, markası, satış/maliyet fiyatları ve hangi depolarda ne kadar bulunduğunu listeleyin. Tükendi uyarılarıyla proaktif davranın!',
      tag: 'Gerçek Zamanlı', tagColor: '#818CF8', tagBg: 'rgba(99,102,241,0.15)'
    },
    {
      icon: 'bar-chart-outline', color: '#10B981', bg: 'rgba(16,185,129,0.15)',
      title: 'Finansal Kontrol',
      desc: 'Son eklenen masrafları (ör. Maaş Ödemesi, Teknik Danışmanlık) takip ederek, net oranınızı, toplam gelir/gider miktarlarınızı hemen görün.',
      tag: 'Akıllı Raporlar', tagColor: '#34D399', tagBg: 'rgba(52,211,153,0.12)'
    },
    {
      icon: 'business-outline', color: '#F97316', bg: 'rgba(249,115,22,0.15)',
      title: 'Zimmet & Demirbaş',
      desc: 'Kimde hangi ekipmanın (Monitör, MacBook vs.) ne zamandan beri bulunduğunu listeyerek boşta ve zimmetli cihazları yönetin.',
      tag: 'Personel Ataması', tagColor: '#FB923C', tagBg: 'rgba(251,146,60,0.12)'
    },
    {
      icon: 'cart-outline', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)',
      title: 'Satın Alma Planlaması',
      desc: 'Tedarikçilerden gelen malzeme teslimat tarihlerini görün, geciken durumlar için otomatik kırmızı uyarılar alarak üretim sürecinizi koruyun.',
      tag: 'Tedarik Zinciri', tagColor: '#FCD34D', tagBg: 'rgba(252,211,77,0.12)'
    },
    {
      icon: 'hammer-outline', color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)',
      title: 'Üretim & MRP',
      desc: 'Ürün ağaçları oluşturun, iş emirlerini duruma göre sınıflandırın, açık ve kapalı emir pastasını kolayca takip edin.',
      tag: 'Üretim Zekası', tagColor: '#C4B5FD', tagBg: 'rgba(196,181,253,0.12)'
    },
    {
      icon: 'construct-outline', color: '#0EA5E9', bg: 'rgba(14,165,233,0.15)',
      title: 'Bakım Servisleri',
      desc: 'Yıllık ve sürpriz gelen makine bakım taleplerini kaydedin. Açık, beklemede veya tamamlandı statüleriyle her adımı görün.',
      tag: 'Kesintisiz Çalışma', tagColor: '#38BDF8', tagBg: 'rgba(56,189,248,0.12)'
    },
    {
      icon: 'shield-checkmark-outline', color: '#3B82F6', bg: 'rgba(59,130,246,0.15)',
      title: 'Güvenlik & Cloud',
      desc: 'Rol bazlı erişim ile yöneticiler, depolar arası sorumlular sadece ilgili panelleri görür. Supabase RLS ile tam izolasyon!',
      tag: 'Endüstri Standardı', tagColor: '#60A5FA', tagBg: 'rgba(96,165,250,0.12)'
    },
  ];

  const whyItems = [
    {
      icon: 'rocket-outline', color: '#6366F1', bg: 'rgba(99,102,241,0.15)', num: '01',
      title: 'Kurulum Gerektirmez',
      desc: 'Bulut tabanlı yapısıyla herhangi bir cihazdan tarayıcı üzerinden anında erişin. Sunucu, IT ekibi veya kurulum süreci yok.'
    },
    {
      icon: 'phone-portrait-outline', color: '#10B981', bg: 'rgba(16,185,129,0.15)', num: '02',
      title: 'Mobil & Masaüstü Uyumlu',
      desc: 'iOS, Android ve tüm masaüstü tarayıcılarda mükemmel deneyim. Hangi cihazı kullanırsanız kullanın tam işlevsellik.'
    },
    {
      icon: 'trending-up-outline', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', num: '03',
      title: 'Ölçeklenebilir Yapı',
      desc: 'Startup\'tan büyük ölçekli şirketlere kadar ihtiyaçlarınız büyüdükçe sisteminiz de büyür. Modüler yapı sayesinde yalnızca kullandığınız için ödeme yapın.'
    },
    {
      icon: 'headset-outline', color: '#3B82F6', bg: 'rgba(59,130,246,0.15)', num: '04',
      title: '7/24 Destek & %99.9 Uptime',
      desc: 'Canlı destek hattımız ve SLA garantimiz ile kesintisiz hizmet alın. Verileriniz Supabase altyapısında güvenle saklanır.'
    },
    {
      icon: 'language-outline', color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)', num: '05',
      title: 'Türkçe Arayüz',
      desc: 'Tamamen Türkçe tasarlanmış kullanıcı arayüzü. Personelleriniz kısa sürede adapte olur, eğitim maliyetleri minimuma iner.'
    },
    {
      icon: 'flash-outline', color: '#EF4444', bg: 'rgba(239,68,68,0.15)', num: '06',
      title: 'Anlık Bildirimler & Uyarılar',
      desc: 'Kritik stok, geciken iş emri, yaklaşan bakım ve çok daha fazlası için otomatik uyarı sistemi ile hiçbir şeyi kaçırmayın.'
    },
  ];

  const testimonials = [
    { quote: '"Stok takibinde yaşadığımız karmaşayı PlantimERP tamamen çözdü. Artık her ürünün nerede olduğunu anlık olarak görüyoruz."', name: 'Mehmet Korkmaz', role: 'Genel Müdür · Metal Sektörü', initials: 'MK', color: '#6366F1' },
    { quote: '"Personel ve zimmet takibinde artık hiç vakit kaybetmiyoruz. Tüm ekibimiz uygulamayı çok hızlı benimsedi."', name: 'Selin Aydın', role: 'İK Müdürü · Üretim Şirketi', initials: 'SA', color: '#10B981' },
    { quote: '"Üretim ve satın alma süreçlerimizi tek ekrandan takip edebilmek büyük rekabet avantajı sağladı."', name: 'Kerem Doğan', role: 'Fabrika Müdürü · Makine Sektörü', initials: 'KD', color: '#F59E0B' },
    { quote: '"Finansal raporlar artık dakikalar içinde hazır. Bütçe takibinde muhteşem bir görünürlük kazandık."', name: 'Ayşe Çelik', role: 'CFO · Lojistik Şirketi', initials: 'AÇ', color: '#3B82F6' },
  ];

  const faqs = [
    { q: t('web_faq_1_q'), a: t('web_faq_1_a') },
    { q: t('web_faq_2_q'), a: t('web_faq_2_a') },
    { q: t('web_faq_3_q'), a: t('web_faq_3_a') },
    { q: t('web_faq_4_q'), a: t('web_faq_4_a') },
    { q: t('web_faq_5_q'), a: t('web_faq_5_a') },
    { q: 'Verilerimi güvende olacak mı?', a: 'Tüm verileriniz Supabase\'in 256-bit SSL şifreli altyapısında saklanmaktadır. Row Level Security (RLS) politikaları ile her şirketin verileri birbirinden tamamen izole edilmiştir.' },
  ];

  return (
    <div className="wlp-page">

      {/* ── NAV ─────────────────────────────────────────────────── */}
      <nav className="wlp-nav">
        <div className="wlp-nav-inner">
          <div className="wlp-logo" onClick={() => { }}>
            <div className="wlp-logo-icon">
              <Icon name="leaf" size={18} color="#fff" />
            </div>
            <span className="wlp-logo-text">PLANTIM <span>ERP</span></span>
          </div>
          <div className="wlp-nav-links">
            <a className="wlp-nav-link" href="#features">Özellikler</a>
            <a className="wlp-nav-link" href="#modules">Modüller</a>
            <a className="wlp-nav-link" href="#pricing">Fiyatlandırma</a>
            <a className="wlp-nav-link" href="#faq">SSS</a>
          </div>
          <div className="wlp-nav-actions">
            <button className="wlp-nav-login" onClick={() => { setIsLoginView(true); const page = document.querySelector('.wlp-page'); if (page) page.scrollTo({ top: 0, behavior: 'smooth' }); }}>
              Giriş Yap
            </button>
            <button className="wlp-nav-cta" onClick={goRegister}>
              Ücretsiz Başla →
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────── */}
      <section className="wlp-hero" id="hero">
        <div className="wlp-hero-bg">
          <div className="wlp-hero-orb wlp-hero-orb-1" />
          <div className="wlp-hero-orb wlp-hero-orb-2" />
          <div className="wlp-hero-orb wlp-hero-orb-3" />
          <div className="wlp-hero-grid-lines" />
        </div>

        <div className="wlp-hero-content">
          {/* LEFT */}
          <div className="wlp-hero-left">
            <div className="wlp-hero-badge">
              <span className="wlp-badge-dot" />
              Türkiye'nin ERP Platformu
            </div>
            <h1 className="wlp-hero-title">
              İşletmenizi
              <span className="wlp-hero-title-gradient"> Dijitalleştirin</span>
              {' '}ve Büyütün
            </h1>
            <p className="wlp-hero-sub">
              Stok, finans, üretim, İK ve daha fazlasını tek platformda yönetin.
              Kurumsal ERP gücünü KOBİ bütçesiyle, sıfır kurulum maliyetiyle edinin.
            </p>
            <div className="wlp-hero-btns">
              <button className="wlp-hero-btn-primary" onClick={goRegister}>
                <Icon name="rocket-outline" size={18} color="#fff" />
                Ücretsiz Başlayın
              </button>
              <button className="wlp-hero-btn-secondary" onClick={() => {
                const el = document.getElementById('features');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}>
                <Icon name="play-circle-outline" size={18} color="rgba(255,255,255,0.7)" />
                Özellikleri Keşfet
              </button>
            </div>
            <div className="wlp-trust-pills">
              {[
                { dot: '#34D399', text: '✓ Kredi kartı gerektirmez' },
                { dot: '#60A5FA', text: '✓ 5 dakikada kurulum' },
                { dot: '#818CF8', text: '✓ %99.9 Uptime garantisi' },
              ].map((p, i) => (
                <div key={i} className="wlp-trust-pill">
                  <span className="wlp-trust-pill-dot" style={{ background: p.dot }} />
                  {p.text}
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: Login Card */}
          <div className="wlp-hero-right">
            <div className="wlp-login-card">
              <div className="wlp-form-header">
                <div className="wlp-form-icon-wrap">
                  <Icon name={isLoginView ? 'lock-open-outline' : 'person-add-outline'} size={30} color="#818CF8" />
                </div>
                <h2 className="wlp-form-title">
                  {isLoginView ? 'Tekrar Hoşgeldiniz' : 'Hesap Oluşturun'}
                </h2>
                <p className="wlp-form-sub">
                  {isLoginView
                    ? 'ERP panelinize giriş yapın'
                    : 'Ücretsiz hesabınızı hemen açın'}
                </p>
              </div>

              <LoginForm
                email={email} setEmail={setEmail}
                username={username} setUsername={setUsername}
                password={password} setPassword={setPassword}
                confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword}
                isLoginView={isLoginView} setIsLoginView={setIsLoginView}
                loginType={loginType} setLoginType={setLoginType}
                loading={loading}
                handleLogin={handleLogin}
                handlePersonnelLogin={handlePersonnelLogin}
                handleSignUp={handleSignUp}
                handlePasswordReset={handlePasswordReset}
                toggleView={toggleView}
                t={t} errorMsg={errorMsg}
              />

              <div className="wlp-form-footer">
                <Icon name="lock-closed" size={11} color="rgba(255,255,255,0.2)" />
                {' '}256-bit SSL şifreleme · Verileriniz güvende
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS TICKER ────────────────────────────────────────── */}
      <div className="wlp-stats-ticker">
        <div className="wlp-stats-ticker-inner">
          {[
            { num: '200', suffix: '+', label: 'Aktif Şirket' },
            null,
            { num: '99.9', prefix: '%', label: 'Uptime Garantisi' },
            null,
            { num: '10', suffix: '+', label: 'ERP Modülü' },
            null,
            { num: '0', suffix: ' TL', label: 'Başlangıç Ücreti' },
          ].map((s, i) =>
            s === null ? (
              <div key={i} className="wlp-stat-sep" />
            ) : (
              <div key={i} className="wlp-stat-block reveal reveal-delay-1">
                <AnimatedCounter target={s.num} suffix={s.suffix || ''} prefix={s.prefix || ''} />
                <p className="wlp-stat-lbl">{s.label}</p>
              </div>
            )
          )}
        </div>
      </div>

      {/* ── FEATURES ────────────────────────────────────────────── */}
      <section className="wlp-feature-strip" id="features">
        <div className="wlp-feature-strip-bg" />
        <div className="wlp-feature-strip-inner">
          <div className="wlp-section-label reveal">Güçlü Özellikler</div>
          <h2 className="wlp-section-head reveal">
            İşletmenize Özel <span>Her Şey</span> Burada
          </h2>
          <p className="wlp-section-desc reveal">
            Stok takibinden muhasebe yönetimine, üretim planlamadan İK'ya kadar
            tüm süreçlerinizi tek platformda dijitalleştirin.
          </p>
          <div className="wlp-feat-grid">
            {features.map((f, i) => (
              <div
                key={i}
                className={`wlp-feat-card reveal reveal-delay-${(i % 4) + 1}`}
              >
                <div className="wlp-feat-icon-wrap" style={{ background: f.bg }}>
                  <Icon name={f.icon} size={28} color={f.color} />
                </div>
                <h3 className="wlp-feat-title">{f.title}</h3>
                <p className="wlp-feat-desc">{f.desc}</p>
                <span className="wlp-feat-tag" style={{ color: f.tagColor, background: f.tagBg }}>
                  {f.tag}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MODULES INTERACTIVE ─────────────────────────────────── */}
      <section className="wlp-modules-section" id="modules">
        <div className="wlp-modules-section-bg" />
        <div className="wlp-modules-inner">
          <div className="wlp-section-label reveal">ERP Modülleri</div>
          <h2 className="wlp-section-head reveal">
            Her Süreci Kapsayan <span>Modüler Yapı</span>
          </h2>
          <p className="wlp-section-desc reveal">
            İhtiyacınız olan modülleri seçin. Sisteminiz şirketinizle birlikte büyüsün.
          </p>
          <div className="wlp-modules-layout">
            {/* Module List */}
            <div className="wlp-modules-list reveal-left">
              {MODULE_PREVIEWS.map((m, i) => (
                <div
                  key={i}
                  className={`wlp-module-item ${activeModule === i ? 'active' : ''}`}
                  onClick={() => setActiveModule(i)}
                >
                  <div className="wlp-module-icon-box" style={{ background: m.bg }}>
                    <Icon name={m.icon} size={22} color={m.color} />
                  </div>
                  <div>
                    <p className="wlp-module-name">{m.name}</p>
                    <p className="wlp-module-desc-short">{m.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Module Preview Card */}
            <div className="wlp-modules-visual reveal-right">
              <div className="wlp-module-preview">
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: activeMod.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={activeMod.icon} size={20} color={activeMod.color} />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#fff' }}>{activeMod.name}</p>
                    <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Canlı Veri Önizleme</p>
                  </div>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    {['#ef4444', '#f59e0b', '#10b981'].map((c, j) => (
                      <div key={j} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
                    ))}
                  </div>
                </div>

                {/* Rows */}
                {activeMod.preview.rows.map((row, j) => (
                  <div key={j} className="wlp-preview-row">
                    <span className="wlp-preview-label">{row.label}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="wlp-preview-val">{row.val}</span>
                      {row.badge && (
                        <span className="wlp-preview-badge" style={{ color: row.badge.color, background: row.badge.bg }}>
                          {row.badge.text}
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {/* Mini Bar Chart */}
                <div className="wlp-preview-chart">
                  {activeMod.preview.bars.map((h, j) => (
                    <div
                      key={j}
                      className="wlp-bar"
                      style={{
                        height: `${h}%`,
                        background: j === activeMod.preview.bars.length - 1
                          ? activeMod.color
                          : `${activeMod.preview.barColor}55`,
                      }}
                    />
                  ))}
                </div>
                <p style={{ margin: '8px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>Son 7 gün</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ENTEGRASYONLAR VE ALTYAPI ─────────────────────────── */}
      <section className="wlp-integrations-section">
        <div className="wlp-integrations-inner">
          <div className="wlp-section-label reveal" style={{ maxWidth: 400, margin: '0 auto 14px' }}>Sınırsız Büyüme Kapasitesi</div>
          <h2 className="wlp-section-head reveal">İşletmenizin İhtiyaç Duyduğu Tüm <br /><span>Entegrasyonlar ve Altyapı</span></h2>
          <p className="wlp-section-desc reveal" style={{ margin: '0 auto' }}>Banka API'leri, E-fatura sistemleri, E-ticaret platformları ve daha fazlası. Supabase güvenliği ile %99.9 Uptime sağlıyoruz.</p>

          <div className="wlp-int-grid reveal">
            {[
              { icon: 'logo-amazon', name: 'Cevheriçi Pazaryeri & E-Ticaret' },
              { icon: 'document-text-outline', name: 'E-Fatura, E-Arşiv & Makbuz' },
              { icon: 'card-outline', name: 'Banka Hesap Hareketleri' },
              { icon: 'logo-whatsapp', name: 'WhatsApp & SMS Bildirimleri' },
              { icon: 'mail-outline', name: 'Zamanlanmış E-posta Raporları' },
              { icon: 'server-outline', name: 'Supabase PostgreSQL Cloud' },
              { icon: 'shield-checkmark-outline', name: '256-bit Veri Şifreleme' },
              { icon: 'cloud-done-outline', name: 'Günlük Otomatik Yedekleme' },
            ].map((int, i) => (
              <div key={i} className="wlp-int-item">
                <Icon name={int.icon} size={20} color="#818CF8" />
                <span className="wlp-int-name" style={{ fontSize: 13.5, fontWeight: 600 }}>{int.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── NASIL ÇALIŞIR? (ONBOARDING) ──────────────────── */}
      <section className="wlp-steps-section">
        <div className="wlp-steps-inner">
          <div className="wlp-section-label reveal" style={{ maxWidth: 300, margin: '0 auto 14px' }}>Hızlı Başlangıç</div>
          <h2 className="wlp-section-head reveal">3 Basit Adımda <span>Dijitalleşin</span></h2>
          <p className="wlp-section-desc reveal" style={{ margin: '0 auto' }}>Haftalar süren karmaşık eğitim süreçlerine son. Sisteminizi dakikalar içinde kurun ve bugün kullanmaya başlayın.</p>

          <div className="wlp-steps-grid">
            <div className="wlp-step-card reveal reveal-delay-1">
              <div className="wlp-step-num">1</div>
              <h3 className="wlp-step-title">Hesabınızı Oluşturun</h3>
              <p className="wlp-step-desc">Formları saniyeler içinde doldurup ücretsiz hesabınızı açın. Kredi kartı ya da taahhüt istenmez.</p>
            </div>
            <div className="wlp-step-card reveal reveal-delay-2">
              <div className="wlp-step-num">2</div>
              <h3 className="wlp-step-title">Verilerinizi İçe Aktarın</h3>
              <p className="wlp-step-desc">Mevcut Excel veya CSV dosyalarınızdaki tüm ürün, stok ve müşteri kayıtlarınızı tek tıkla ERP'nize çekin.</p>
            </div>
            <div className="wlp-step-card reveal reveal-delay-3">
              <div className="wlp-step-num">3</div>
              <h3 className="wlp-step-title">Kontrolü Elinize Alın</h3>
              <p className="wlp-step-desc">Ekip arkadaşlarınızı sisteme davet edip ilgili yetkileri atayarak operasyonlarınızı otomatize etmeye başlayın.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── ROI / METRICS ───────────────────────────────────────── */}
      <section className="wlp-roi-section">
        <div className="wlp-roi-inner">
          <div className="wlp-roi-left reveal-left">
            <div className="wlp-section-label">Somut Sonuçlar</div>
            <h2 className="wlp-section-head" style={{ textAlign: 'left' }}>Şirketinizi <span>Rakamlarla</span> İleri Taşıyın</h2>
            <p className="wlp-section-desc" style={{ textAlign: 'left', margin: '0 0 30px' }}>
              PlantimERP'ye geçen işletmeler ilk 3 ay içerisinde veri bütünlüğünü sağlar,
              kayıt kayıplarını minimuma indirir ve operasyonel iş yükünü ciddi oranda hafifletir.
            </p>
            <div className="wlp-trust-pills" style={{ marginTop: 20 }}>
              <div className="wlp-trust-pill"><span className="wlp-trust-pill-dot" style={{ background: '#34D399' }} />Bağımsız Araştırma Verileri</div>
            </div>
          </div>
          <div className="wlp-roi-right reveal-right">
            <div className="wlp-roi-card">
              <div className="wlp-roi-num"><span>%</span>45</div>
              <p className="wlp-roi-text">Operasyonel işlerde ve veri girişinde zamandan tasarruf</p>
            </div>
            <div className="wlp-roi-card" style={{ transform: 'translateY(20px)' }}>
              <div className="wlp-roi-num"><span>%</span>99</div>
              <p className="wlp-roi-text">Muhasebe, finans ve stok hatalarında net düşüş</p>
            </div>
            <div className="wlp-roi-card">
              <div className="wlp-roi-num">3<span>x</span></div>
              <p className="wlp-roi-text">Sipariş karşılama ve teslimat hızında ölçülebilir artış</p>
            </div>
            <div className="wlp-roi-card" style={{ transform: 'translateY(20px)' }}>
              <div className="wlp-roi-num"><span>%</span>30</div>
              <p className="wlp-roi-text">Tedarik zinciri ve satın alma maliyetlerinde iyileşme</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── SEKTÖRLER / KIMLER ICIN ─────────────────────────────── */}
      <section className="wlp-ind-section">
        <div className="wlp-ind-inner">
          <div className="wlp-section-label reveal" style={{ justifyContent: 'center' }}>Sektörel Uyumluluk</div>
          <h2 className="wlp-section-head reveal">Hangi Sektörlere <span>Hitap Ediyoruz?</span></h2>
          <p className="wlp-section-desc reveal" style={{ margin: '0 auto' }}>Esnek ve modüler yapısıyla PlantimERP, farklı iş kollarının spesifik operasyonel ihtiyaçlarına anında adapte olur.</p>

          <div className="wlp-ind-grid">
            {[
              { icon: 'cart-outline', title: 'E-Ticaret & Perakende', desc: 'Sipariş entegrasyonları, depolar arası anlık ürün transferi, kritik seviye uyarıları ve satınalma onay süreçleri.', bg: 'rgba(59,130,246,0.15)', color: '#60A5FA' },
              { icon: 'hammer-outline', title: 'Üretim & İmalat', desc: 'BOM (Ürün Ağacı) yönetimi, detaylı atölye iş emirleri, parça maliyetleri ve açık/kapalı üretim hattı takibi.', bg: 'rgba(139,92,246,0.15)', color: '#A78BFA' },
              { icon: 'briefcase-outline', title: 'Hizmet & Ajanslar', desc: 'Proje bazlı finansal takip, personel zimmet yönetimi, gelir/gider döngüsü ve detaylı karlılık analizleri.', bg: 'rgba(16,185,129,0.15)', color: '#34D399' },
              { icon: 'cube-outline', title: 'Toptan & Lojistik', desc: 'Hacimli çoklu depo takibi, barkodlu akıllı ürün yerleşimi, tedarikçi yönetimi ve bütçe planlamaları.', bg: 'rgba(245,158,11,0.15)', color: '#FBBF24' },
            ].map((ind, i) => (
              <div key={i} className={`wlp-ind-card reveal reveal-delay-${i + 1}`}>
                <div className="wlp-ind-icon-wrap" style={{ background: ind.bg }}>
                  <Icon name={ind.icon} size={22} color={ind.color} />
                </div>
                <h3 className="wlp-ind-title">{ind.title}</h3>
                <p className="wlp-ind-desc">{ind.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY PLANTIM ─────────────────────────────────────────── */}
      <section className="wlp-why-section">
        <div className="wlp-why-bg" />
        <div className="wlp-why-inner2">
          <div className="wlp-section-label reveal">Neden PlantimERP?</div>
          <h2 className="wlp-section-head reveal">
            Rakiplerinden <span>Neden Farklı?</span>
          </h2>
          <p className="wlp-section-desc reveal">
            Piyasadaki ERP çözümlerinde boğulan KOBİ'ler için tasarlandı.
            Sade, güçlü ve uygun fiyatlı.
          </p>
          <div className="wlp-why-grid">
            {whyItems.map((w, i) => (
              <div key={i} className={`wlp-why-card reveal reveal-delay-${(i % 3) + 1}`}>
                <span className="wlp-why-card-num">{w.num}</span>
                <div className="wlp-why-icon2" style={{ background: w.bg }}>
                  <Icon name={w.icon} size={24} color={w.color} />
                </div>
                <h3 className="wlp-why-title2">{w.title}</h3>
                <p className="wlp-why-desc2">{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ────────────────────────────────────────── */}
      <section className="wlp-testi-section">
        <div className="wlp-testi-bg" />
        <div className="wlp-testi-inner">
          <div className="wlp-section-label reveal">Kullanıcı Yorumları</div>
          <h2 className="wlp-section-head reveal">
            Müşterilerimiz <span>Ne Düşünüyor?</span>
          </h2>
          <div className="wlp-testi-grid">
            {testimonials.map((tc, i) => (
              <div key={i} className={`wlp-testi-card reveal reveal-delay-${i + 1}`}>
                <div className="wlp-testi-stars">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Icon key={s} name="star" size={14} color="#F59E0B" />
                  ))}
                </div>
                <p className="wlp-testi-quote">{tc.quote}</p>
                <div className="wlp-testi-user">
                  <div className="wlp-testi-avatar" style={{ background: `${tc.color}20`, color: tc.color }}>
                    {tc.initials}
                  </div>
                  <div>
                    <p className="wlp-testi-name">{tc.name}</p>
                    <p className="wlp-testi-role">{tc.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────────── */}
      <section className="wlp-pricing-section" id="pricing">
        <div className="wlp-pricing-bg" />
        <div className="wlp-pricing-inner">
          <div className="wlp-section-label reveal">Fiyatlandırma</div>
          <h2 className="wlp-section-head reveal">
            Şirketinize Uygun <span>Plan Seçin</span>
          </h2>
          <p className="wlp-section-desc reveal">
            {t('pricing_desc') || 'Gizli ücret yok. İstediğiniz zaman plan değiştirin.'}
          </p>
          <div className="wlp-pricing-cards">
            {/* Starter */}
            <div className="wlp-price-card reveal reveal-delay-1">
              <p className="wlp-price-plan">{t('pricing_starter') || 'Başlangıç'}</p>
              <p className="wlp-price-amount">
                {t('pricing_free') || 'Ücretsiz'}
                <span className="wlp-price-period"> / sonsuza dek</span>
              </p>
              <div className="wlp-price-divider" />
              {[
                t('pricing_s_1') || 'Temel modüller',
                t('pricing_s_2') || '1 kullanıcı hesabı',
                t('pricing_s_3') || 'Bulut depolama',
                'Topluluk desteği',
              ].map((f, i) => (
                <div key={i} className="wlp-price-feat-item">
                  <Icon name="checkmark-circle" size={17} color="#34D399" />
                  <p className="wlp-price-feat-text">{f}</p>
                </div>
              ))}
              <button className="wlp-price-btn starter" onClick={goRegister}>
                Ücretsiz Başla
              </button>
            </div>

            {/* Pro */}
            <div className="wlp-price-card featured reveal reveal-delay-2">
              <div className="wlp-popular-tag">{t('pricing_popular') || 'En Çok Tercih Edilen'}</div>
              <p className="wlp-price-plan pro">{t('pricing_pro') || 'Profesyonel'}</p>
              <p className="wlp-price-amount">
                11.880 ₺
                <span className="wlp-price-period"> / yıllık</span>
              </p>
              <p style={{ fontSize: 13, color: '#34D399', margin: '0 0 4px', fontWeight: 600 }}>
                ≈ 990 ₺/ay · %30 tasarruf
              </p>
              <div className="wlp-price-divider" />
              {[
                t('pricing_p_1') || 'Tüm modüller dahil',
                t('pricing_p_2') || 'Sınırsız kullanıcı',
                t('pricing_p_3') || 'Öncelikli destek',
                '7/24 canlı destek hattı',
                '256-bit SSL güvenlik',
                'API entegrasyon desteği',
              ].map((f, i) => (
                <div key={i} className="wlp-price-feat-item">
                  <Icon name="checkmark-circle" size={17} color="#818CF8" />
                  <p className="wlp-price-feat-text" style={{ color: 'rgba(255,255,255,0.8)' }}>{f}</p>
                </div>
              ))}
              <button className="wlp-price-btn pro" onClick={goRegister}>
                Hemen Başla →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────── */}
      <section className="wlp-faq-section" id="faq">
        <div className="wlp-faq-inner">
          <div className="wlp-section-label reveal" style={{ maxWidth: 800, margin: '0 auto 14px' }}>Sıkça Sorulan Sorular</div>
          <h2 className="wlp-section-head reveal">Aklınızdaki <span>Sorular</span></h2>
          <div style={{ marginTop: 48 }}>
            {faqs.map((faq, i) => (
              <div key={i} className="wlp-faq-item reveal">
                <div className="wlp-faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                    <Icon name="help-circle" size={20} color="#818CF8" />
                    <p className="wlp-faq-q-text">{faq.q}</p>
                  </div>
                  <Icon
                    name={openFaq === i ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color="rgba(255,255,255,0.35)"
                  />
                </div>
                {openFaq === i && (
                  <p className="wlp-faq-a">{faq.a}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ──────────────────────────────────────────── */}
      <section className="wlp-cta-section">
        <div className="wlp-cta-bg" />
        <div className="wlp-cta-grid" />
        <div className="wlp-cta-inner">
          <div className="wlp-cta-badge reveal">
            <Icon name="rocket-outline" size={14} color="#C4B5FD" />
            Hemen Başlayın
          </div>
          <h2 className="wlp-cta-title reveal">
            {t('web_cta_banner_title') || 'İşletmenizi ERP ile Büyütün'}
          </h2>
          <p className="wlp-cta-sub reveal">
            {t('web_cta_banner_sub') || 'Binlerce şirketin tercih ettiği PlantimERP\'e bugün katılın. Kurulum yok, risk yok.'}
          </p>
          <button className="wlp-cta-btn-main reveal" onClick={goRegister}>
            <Icon name="flash" size={20} color="#4F46E5" />
            Ücretsiz Hesap Aç
          </button>
          <p className="wlp-cta-note">
            <Icon name="lock-closed" size={13} color="rgba(255,255,255,0.3)" />
            Kredi kartı gerekmez · İstediğiniz zaman iptal edin · 5 dakikada hazır
          </p>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <footer className="wlp-footer">
        <div className="wlp-footer-inner">
          <div className="wlp-footer-logo">
            <div className="wlp-logo-icon" style={{ width: 30, height: 30, borderRadius: 8 }}>
              <Icon name="leaf" size={14} color="#fff" />
            </div>
            <p className="wlp-footer-brand">PLANTIM ERP</p>
          </div>
          <p className="wlp-footer-text">
            © 2026 Plantim Kurumsal Yazılım Teknolojileri
            <span className="wlp-footer-sep">·</span>
            plantimerp@gmail.com
          </p>
          <div className="wlp-footer-links">
            <span className="wlp-footer-link">Gizlilik Politikası</span>
            <span className="wlp-footer-link">Kullanım Şartları</span>
            <span className="wlp-footer-link">Destek</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
