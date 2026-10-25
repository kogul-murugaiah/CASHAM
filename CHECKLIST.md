# 📋 CASHAM - App Remediation Checklist

This checklist organizes all discovered issues into prioritized phases with exact file references, reproduction/impact notes, recommended solutions, and verification steps. You can check these off as we fix them one by one.

---

## 🔴 Phase 1: Critical Security & Auth (P0)

- [x] **1.1 Unprotected Price Refresh API Endpoint**
  - **File:** `api/prices/refresh.ts`
  - **Problem:** Authorization block is commented out. Anyone on the web can trigger external AMFI & Twelve Data API requests and execute bulk DB updates.
  - **Action:** Check `req.headers['authorization'] === `Bearer ${process.env.CRON_SECRET}`` and return `401 Unauthorized` if invalid.
  - ✅ **Fixed:** Bearer token guard restored.

- [x] **1.2 Missing Vercel Cron Configuration**
  - **File:** `vercel.json`
  - **Problem:** No `"crons"` key defined, meaning automated price updates at 8:00 AM IST never execute automatically on Vercel.
  - **Action:** Add `"crons": [{"path": "/api/prices/refresh", "schedule": "30 2 * * *"}]`.
  - ✅ **Fixed:** Cron entry added to `vercel.json`.

- [x] **1.3 Parent Ownership Check on Budget Sub-Resources**
  - **Files:** `api/budgets/_categories.ts`, `api/budgets/_items.ts`
  - **Problem:** `supabaseAdmin` bypasses RLS. Inserting categories or items does not verify that the parent `budget_id` or `category_id` belongs to the requesting user.
  - **Action:** Validate parent ownership before inserts.
  - ✅ **Fixed:** Added `.eq('user_id', user.id)` parent lookup before every insert; returns 403 if not owned.

- [x] **1.4 Centralize Supabase Client Singleton**
  - **Files:** `src/pages/Signup.tsx`, `src/pages/Login.tsx`, `src/pages/AuthCallback.tsx`, `src/components/ProtectedRoute.tsx`
  - **Problem:** `createClient(...)` is independently instantiated in 4 separate files, leading to duplicate listeners and potential auth desync.
  - **Action:** Export a single `supabase` client from `src/lib/supabase.ts` and import it everywhere.
  - ✅ **Fixed:** Created `src/lib/supabase.ts` singleton; all 4 files now import from it.

---

## ⚡ Phase 2: Performance & Bundle Size Optimization (P1)

- [x] **2.1 Code-Split Initial Bundle (Lazy Load Dashboard & Landing Page)**
  - **File:** `src/App.tsx`
  - **Problem:** `Dashboard` and `LandingPage` are imported statically. `Dashboard` pulls Recharts into the main bundle (`index.js` is ~890 KB), forcing even public landing page visitors to download 900 KB of JS.
  - **Action:** Lazy-load both with `React.lazy()` and `<Suspense>`.
  - ✅ **Fixed:** Both converted to `lazy()` with `<Suspense fallback={<PageLoader />}>` wrappers.

- [x] **2.2 Configure Vite Rollup Chunk Splitting**
  - **File:** `vite.config.ts`
  - **Problem:** Rollup outputs a single mega-chunk for all vendor dependencies.
  - **Action:** Configure `manualChunks` in `vite.config.ts` for `recharts`, `react-icons`, and `@supabase/supabase-js`.
  - ✅ **Fixed:** Added `manualChunks` splitting `react`, `recharts`, `react-icons`, `@supabase/supabase-js`, and `xlsx` into separate cacheable chunks.

- [x] **2.3 Compress 1.23 MB PNG Logo Asset**
  - **Files:** `src/assets/casham logo.png` (1,227 kB), `public/casham-logo.png` (501 kB)
  - **Problem:** Uncompressed logo slows down initial paint and bloats PWA asset cache.
  - **Action:** Convert and compress to WebP or SVG (< 40 KB, 97% savings).
  - ✅ **Fixed:** Converted to WebP — `src/assets/casham logo.webp` (28 KB, -97%), `public/casham-logo.webp` (59 KB, -88%). Updated `Logo.tsx`, `index.html`, and `vite.config.ts`.

- [x] **2.4 Dynamic Import / Optimization for `xlsx` (425 KB)**
  - **File:** `package.json` & Credit Card statement export
  - **Problem:** `xlsx` adds 424 kB to the bundle just for generating tabular exports.
  - **Action:** Use native browser CSV blob generation or dynamic import `import('xlsx')` on demand.
  - ✅ **Fixed:** Removed static `import * as XLSX` from `ExpenseTracking.tsx`, `IncomeTracking.tsx`, and `ImportCenter.tsx`. Replaced with `const XLSX = await import('xlsx')` inside event handlers (only loads on user action).

- [x] **2.5 Remove Redundant Google Font `@import`**
  - **File:** `src/index.css`
  - **Problem:** `@import url(...)` at the top of CSS creates a render-blocking roundtrip. Fonts are already loaded in `index.html`.
  - **Action:** Delete line 4 in `src/index.css`.
  - ✅ **Fixed:** Removed `@import url(...)` from `index.css`. Fonts continue to load via `<link rel="preconnect">` in `index.html`.

---

## 🛠️ Phase 3: React 19 & Code Health (P1 - P2)

- [x] **3.1 Fix React 19 Synchronous `setState` in `useEffect`**
  - **File:** `src/pages/TaskTracker.tsx`, `src/components/Sidebar.tsx`, `src/components/MobileBottomNav.tsx`
  - **Problem:** Synchronous `setStreakTaskId(...)`, `setMobileOpen(...)`, and `setHubOpen(...)` inside `useEffect` triggered cascading renders in React 19.
  - **Action:** Derived `activeStreakTaskId` with `useMemo` in `TaskTracker.tsx`, eliminated synchronous effect, adjusted route navigation state during render in `Sidebar.tsx` and `MobileBottomNav.tsx`, and hoisted `SidebarContent` outside render.
  - ✅ **Fixed:** React 19 cascading renders eliminated.

- [x] **3.2 Fix Hook Dependency Warnings in `useMemo` & `useEffect`**
  - **File:** `src/pages/TaskTracker.tsx:1485` (`PRIORITY_WEIGHT` dependency)
  - **Action:** Hoisted stable constants outside components and fulfilled exhaustive dependencies.
  - ✅ **Fixed:** Constants hoisted and all hook dependencies satisfied.

- [x] **3.3 Replace Hard `window.location.href = '/login'` in API Client**
  - **File:** `src/lib/api.ts` & `src/App.tsx`
  - **Problem:** Hard reloading wipes client SPA state on 401s.
  - **Action:** Route through react-router navigation without page reload.
  - ✅ **Fixed:** Dispatches custom `casham:unauthorized` event on 401; `App.tsx` `UnauthorizedHandler` listens and calls `useNavigate('/login', { replace: true })` cleanly without full page refresh.

- [x] **3.4 Resolve ESLint Errors (Clean `npm run lint`)**
  - **File:** `eslint.config.js` and various components
  - **Action:** Type unchecked `any` values, remove useless try/catch blocks, add comments to empty catch statements, fix prefer-const issues, and configure lint rules so CI/CD runs clean.
  - ✅ **Fixed:** `npm run lint` and `npx tsc --noEmit` exit with code 0 (0 errors).

---

## 🏗️ Phase 4: Component Architecture & Modularization (P2)

- [x] **4.1 Modularize `TaskTracker.tsx` (2,447 lines)**
  - **Action:** Extract `TaskHeatmap.tsx`, `TaskModal.tsx`, `TaskCard.tsx`, and `TaskFilterBar.tsx`.
  - ✅ **Fixed:** Extracted `taskConstants.ts`, `TaskCard.tsx`, `TaskModal.tsx`, `TaskHeatmap.tsx`, and `TaskFilterBar.tsx` into `src/components/tasks/`. Reduced `TaskTracker.tsx` by >60% to ~990 lines.

- [x] **4.2 Modularize `CreditCards.tsx` (1,844 lines)**
  - **Action:** Extract `CCCardList.tsx`, `CCMasterHistory.tsx`, `CCAdvancesLedger.tsx`, `CCDuesTable.tsx`, `CCSettlementHistory.tsx`, and modals.
  - ✅ **Fixed:** Extracted `CCCardList.tsx`, `CCDuesTable.tsx`, `CCAdvancesLedger.tsx`, `CCMasterHistory.tsx`, `CCSettlementHistory.tsx`, `CCCardModal.tsx`, `CCAdvanceModal.tsx`, and `CCSmartSettleModal.tsx` into `src/components/credit-cards/`. Reduced `CreditCards.tsx` to 604 lines, fixed all purple defaults to emerald, and validated 0 errors with TypeScript and ESLint.

- [x] **4.3 Modularize `BudgetPlanner.tsx` (965 lines)**
  - **Action:** Extract `BudgetCategoryCard.tsx`, `BudgetItemRow.tsx`, and `CopyMonthModal.tsx`.
  - ✅ **Fixed:** Extracted `types.ts`, `BudgetItemRow.tsx`, `BudgetCategoryCard.tsx`, and `CopyMonthModal.tsx` into `src/components/budget/`. Reduced `BudgetPlanner.tsx` to 365 lines, and verified 0 TypeScript and ESLint errors.

---

## 🎨 Phase 5: Theming & CSS System Design (P3)

- [x] **5.1 Refactor Light/Dark Theming to Native Tailwind `dark:`**
  - **File:** `src/index.css`
  - **Problem:** Over 400 lines of CSS used `!important` to forcefully override dark classes, causing specificity conflicts.
  - **Action:** Standardize on Tailwind's native `dark:` utilities and CSS custom properties.
  - ✅ **Fixed:** Replaced 400 lines of conflicting `!important` overrides with CSS design tokens (`--bg-app`, `--bg-card`, `--border-card`, `--text-primary`), unified dark and light mode scrollbars, cleaned glass-card components, eliminated purple/violet overrides, and verified production build.

---

## 🗄️ Phase 6: Database & Data Integrity (P3)

- [x] **6.1 Atomic Account Name Propagation (Transaction Safety)**
  - **File:** `api/_accounts.ts` & `supabase/migrations/20261025000000_atomic_account_rename_procedure.sql`
  - **Action:** Wrap account renaming in a Postgres stored procedure with transaction rollback rather than 5 independent client updates.
  - ✅ **Fixed:** Implemented `rename_account_type` stored procedure in `supabase/migrations/20261025000000_atomic_account_rename_procedure.sql` executing all table propagations in a single transaction block. Updated `api/_accounts.ts` to execute `supabaseAdmin.rpc('rename_account_type')` with automated multi-table fallback.

- [x] **6.2 Consolidate Root Migration Files**
  - **Action:** Move 10 loose `.sql` files into a chronological `supabase/migrations/` directory.
  - ✅ **Fixed:** Created `supabase/migrations/` directory and consolidated all 10 root `.sql` migration files with standard chronological timestamps (`20260403...` to `20261025...`).

---

### Progress Tracker

| Phase | Category | Tasks | Completed | Status |
|---|---|---|---|---|
| **Phase 1** | Critical Security & Auth | 4 | 4 | ✅ Done |
| **Phase 2** | Performance & Bundle | 5 | 5 | ✅ Done |
| **Phase 3** | React 19 & Code Health | 4 | 4 | ✅ Done |
| **Phase 4** | Modular Architecture | 3 | 3 | ✅ Done |
| **Phase 5** | Theming & CSS System | 1 | 1 | ✅ Done |
| **Phase 6** | Database & Migrations | 2 | 2 | ✅ Done |
| **Total** | | **19** | **19** | **All Phases Complete 🚀💯** |
