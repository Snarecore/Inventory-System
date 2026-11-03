# Performance Review: Cash-Boi

Date: 2026-11-03. Skill: `performance-review`.

## Executive summary

- **Overall state:** The application frontend demonstrates modern architecture with React 19 and TanStack Query, but suffers from significant client-side overhead caused by unpaginated historical data fetches across transactions and the newly integrated SMS service, redundant date libraries (`moment` alongside `date-fns`), heavy synchronous imports of `xlsx`, and large form re-render trees on trade pages.
- **Top 3 risks:**
  1. Unbounded transaction and message history queries without server pagination (`get-purchase-list`, `get-sale-list`, `get-sms-send-list`).
  2. Heavy initial client bundle overhead (683 KB core JS + 281 KB `xlsx` + 62 KB `moment`) delaying Time to Interactive.
  3. Re-render cascades in monolithic trade forms triggering main-thread stalls during data entry.
- **Total est. $/mo:** n/a

## Inputs used / missing

- **Used:**
  - Vite frontend build artifacts and chunk size inspection (`dist/assets`).
  - Source code analysis across `src/pages/admin/trade`, `src/pages/admin/sms/`, `src/services/`, and `src/hooks/`.
  - Dependency manifests (`package.json`, `package-lock.json`).
- **Missing:**
  - Live backend database query execution stats (`pg_stat_statements` or MySQL `performance_schema` not accessible from frontend repository).
  - APM network tracing and real-user production performance metrics (numbers below are tagged as estimates based on typical payload and network parameters).

## Findings

### [High] Unbounded Transaction and History Queries Without Server Pagination

**Evidence**: In `src/pages/admin/trade/purchases/hooks/usePurchaseQueries.ts` (lines 105-131), `src/pages/admin/trade/sales/hooks/useSalesQueries.ts`, and `src/services/sms-service.ts` (lines 189-210):
```ts
const res: any = await postData({
  url: apiConfig.sms.getSmsSendListUrl,
  body: { accessUser: buildAccessUser() },
});
```
Endpoints `/get-purchase-list`, `/get-purchase-and-return-list`, `/get-sale-list`, `/get-sales-and-return-list`, `/get-product-list`, and `/get-sms-send-list` are requested without `page` or `limit` parameters, loading complete arrays of historical records into client memory.

**Cost per request**: 
`(estimate)` 1 request x 2,000 historical rows x 1.8 KB average payload with details = ~3.6 MB uncompressed JSON transferred per page mount; 150 ms - 350 ms JSON parsing and garbage collection stall on mobile/low-end POS devices.

**Why it matters**: As stores accumulate thousands of sales, purchases, and sent SMS records over months of operation, memory consumption and network payload escalate linearly with business history, causing browser freezing and high mobile data usage.

**Fix**:

Implement server-side pagination across list APIs and update query hooks to pass `page` and `limit`:

```diff
--- a/src/services/sms-service.ts
+++ b/src/services/sms-service.ts
@@ -189,9 +189,14 @@ function parseBackendDate(raw: any): string {
-export async function fetchSmsSendList(): Promise<SmsHistoryItem[]> {
+export async function fetchSmsSendList(page = 1, limit = 50): Promise<{ items: SmsHistoryItem[]; total: number }> {
   try {
     const res: any = await postData({
       url: apiConfig.sms.getSmsSendListUrl,
-      body: { accessUser: buildAccessUser() },
+      body: { 
+        accessUser: buildAccessUser(),
+        page,
+        limit,
+      },
     });
```

**Est. $/mo**: n/a

---

### [High] Large Initial Client Bundle and Redundant Dependencies

**Evidence**: Built chunk inspection in `dist/assets`:
- `index-CY8cRO6j.js`: 682.8 KB
- `xlsx-CWmPmi3w.js`: 280.9 KB
- `Dashboard-BHpGWUCo.js`: 215.4 KB
- `TextEditor-C1Iw6Krh.js`: 206.9 KB
- `moment-05p6uoUQ.js`: 62.2 KB

`package.json` imports both `moment` (62.2 KB) and `date-fns` (4.1.0) concurrently. Furthermore, `xlsx` (280.9 KB) is bundled into synchronous chunk graphs rather than loaded dynamically upon export.

**Cost per request**: 
Measured bundle size of core assets is >1.4 MB uncompressed (~430 KB gzip). On a typical 3G / mobile connection (1.6 Mbps), downloading initial bundle assets requires ~2.1 s of network transfer plus ~400 ms of CPU script parse and evaluation time before First Contentful Paint.

**Why it matters**: Heavy vendor bundles delay initial page load and Time to Interactive, impacting store operators working on cellular networks or entry-level tablets.

**Fix**:

1. Dynamically import `xlsx` only when triggering export:
```diff
- import * as XLSX from "xlsx";
+ const handleExport = async () => {
+   const XLSX = await import("xlsx");
+   // export logic
+ };
```

2. Standardize on `date-fns` and eliminate `moment`:
```sh
npm uninstall moment
```

3. Configure explicit vendor chunking in `vite.config.ts`:
```diff
--- a/vite.config.ts
+++ b/vite.config.ts
@@ -19,4 +19,15 @@ export default defineConfig({
     },
   },
+  build: {
+    rollupOptions: {
+      output: {
+        manualChunks: {
+          vendor: ['react', 'react-dom', 'react-router-dom'],
+          query: ['@tanstack/react-query'],
+          charts: ['chart.js', 'react-chartjs-2'],
+        },
+      },
+    },
+  },
 })
```

**Est. $/mo**: n/a

---

### [Medium] Form Re-render Cascades in Monolithic Trade Form Components

**Evidence**: In `src/pages/admin/trade/create-purchase/components/PurchaseForm.tsx` (lines 1-1000+) and `src/pages/admin/trade/create-sale/components/SaleForm.tsx`:
Complex trade forms maintain 20+ separate `useState` hooks at the top level (parties, line items, item discounts, quantities, payment rows). Every keystroke in product input fields triggers a complete re-render of the entire component tree, recalculating summary tables and re-evaluating child components.

**Cost per request**: 
`(estimate)` 1 keystroke -> 15 ms - 40 ms main-thread scripting time; entering a product code or transaction note creates noticeable input lag (150 ms - 400 ms cumulative thread blocking).

**Why it matters**: Sluggish form responsiveness causes missed keystrokes and friction for cashier staff during fast-paced sales operations.

**Fix**:

Isolate table row components and settlement summaries using `React.memo` with stable callbacks:

```diff
--- a/src/pages/admin/trade/create-purchase/components/PurchaseForm.tsx
+++ b/src/pages/admin/trade/create-purchase/components/PurchaseForm.tsx
@@ -1,4 +1,4 @@
-import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
+import React, { useState, useEffect, useMemo, useRef, useCallback, memo } from "react";
 
+// Memoize line item row to prevent full-tree re-render on parent state updates
+const PurchaseLineItemRow = memo(({ item, onUpdate, onRemove }: any) => { ... });
```

**Est. $/mo**: n/a

---

### [Medium] Missing Cache TTL on Static Catalog and Configuration Queries

**Evidence**: In `src/services/sms-service.ts` (`fetchSmsBundles`), `src/services/product-category-service.ts`, and bank/branch lookups:
Endpoints returning static catalog items (SMS bundles, product categories, branch profiles) are fetched without an explicit `staleTime`, causing TanStack Query to refetch on every window focus or component remount.

**Cost per request**: 
`(estimate)` 3 to 5 redundant HTTP requests per page navigation; 150 ms - 450 ms added network latency per user transition.

**Why it matters**: Unnecessary background refetches waste client bandwidth and battery on data that rarely changes during an active session.

**Fix**:

Configure a 10-minute `staleTime` for static configuration queries:

```diff
--- a/src/hooks/useSms.ts
+++ b/src/hooks/useSms.ts
@@ -18,6 +18,8 @@ export function useSmsBundles() {
   return useQuery({
     queryKey: ["sms-bundles"],
     queryFn: fetchSmsBundles,
+    staleTime: 1000 * 60 * 10, // 10 minutes
+    gcTime: 1000 * 60 * 30,
   });
 }
```

**Est. $/mo**: n/a

## Reviewed, found clean

- **TanStack Query Caching**: The application utilizes `@tanstack/react-query` v5 effectively across the majority of services for background caching and query invalidation.
- **Route-level Code Splitting**: Top-level route modules in `src/routes/index.tsx` use `React.lazy` to prevent loading unvisited administrative views on initial mount.
- **Build Tooling Pipeline**: Vite 8 with Rolldown/ESBuild provides modern minification and tree-shaking capabilities.

## Commands for you to run

Remove redundant `moment` dependency:
```sh
npm uninstall moment
```

Analyze production bundle chunk distribution:
```sh
npx vite-bundle-visualizer
```

---

Reviewed with RayStack by Harun R. Rayhan. For a hands-on audit: https://harun.dev/consultation
