# Personal Money Tracker

> *"The user records spending. The system creates clarity."*

**Personal Money Tracker** is a private, lightweight, exceptionally fast, local-first web application for personal spending tracking, daily limit calculation, timeline exploration, internal auditing, and fact-grounded AI explainability.

Built with **Vite, React, TypeScript, Vanilla CSS, and Motion for React**, conforming strictly to the **Silent Ledger** design philosophy.

---

## Key Features

- **Frictionless 2-Field Logging (< 5 seconds):** Log spending with strictly two inputs: `Spending On` and `Spending Amount`. Date, time, category, running totals, and remaining balances are automated.
- **100% Deterministic Money Engine:**
  - Configurable global baseline daily limit (default ₹1,000).
  - Date-specific limit overrides without mutating baseline settings.
  - Real-time remaining balance calculation.
  - Calm, non-judgmental over-limit indicators (color-independent).
- **Time Exploration & Understanding:**
  - **Today:** Hero remaining balance card, daily limit progress, and today's spending timeline.
  - **History & Calendar:** Interactive monthly calendar with daily spending indicators, date-specific inspection, and historical entry.
  - **Insights (Weekly & Monthly Understanding):** Period summaries, daily spending bar charts, highest/lowest days, category distribution, and adherence rates.
- **Audit System:** Period-scoped internal data consistency verification:
  - Daily limit adherence checks.
  - Duplicate detection (`date + normalized description + amount`).
  - Period calculation reconciliation (`SUM(expenses) === SUM(dailyBreakdown)`).
  - Clean audit state indicator when zero findings exist.
- **Dual-Tier Fact-Grounded AI Insights:**
  - **Tier 1 (Default & 100% Local/Offline):** Built-in deterministic pattern engine analyzing streaks, concentration, anomalies, and period-over-period deltas.
  - **Tier 2 (Optional Groq API):** Server-side proxy calling `openai/gpt-oss-20b` via strict JSON Schema mode. Raw individual expenses are **never** transmitted to external APIs; only aggregated structured facts. Gracefully falls back to Tier 1 on any network or validation error.
- **Local-First Resilience & Data Ownership:**
  - 100% local storage in browser IndexedDB.
  - Zero logins, zero passwords, zero accounts required.
  - Versioned offline caching via Service Worker (`personal-money-tracker-v1`).
  - One-click JSON backup and atomic restore (single IndexedDB transaction with complete rollback safety).
  - One-click RFC 4180 CSV export and import with strict currency mismatch rejection.
- **Silent Ledger Visual & Motion DNA:**
  - Curated dual-mode palette: Light Canvas (`#F7F6F2`) and Dark Canvas (`#12151A`).
  - Strict typography: Hanken Grotesk with tabular figures for financial numbers.
  - Purposeful, non-decorative motion: 120ms tap feedback, 240ms number interpolation, 320ms progress animations, full `prefers-reduced-motion` bypass.

---

## Quick Start

### Prerequisites
- Node.js (v18 or later recommended)
- npm

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Local Development Server
```bash
npm run dev
```
Open [http://127.0.0.1:3000/](http://127.0.0.1:3000/) in your browser.

### 3. Build for Production
```bash
npm run build
```
Generates production bundle in `dist/` with zero TypeScript errors and service worker asset caching.

### 4. Preview Production Build
```bash
npm run preview
```
Serves the production build on [http://127.0.0.1:4173/](http://127.0.0.1:4173/).

---

## Test Suites

The project maintains an exhaustive regression test suite covering all phases:

```bash
# Run all regression and release suites
node scripts/testMoneyEngine.mjs
node scripts/testHistoryFlow.mjs
node scripts/testPeriodUnderstanding.mjs
node scripts/testAuditEngine.mjs
node scripts/testInsightEngine.mjs
node scripts/testMotionSystem.mjs
node scripts/testProductionHardening.mjs
node scripts/testFinalProductRelease.mjs
```

---

## Documentation

Full architectural specifications, product constitution, privacy guarantees, backup schemas, and design guidelines are maintained internally.

---

## License

Private & proprietary personal money tracking application.
