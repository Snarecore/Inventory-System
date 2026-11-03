# Performance Review: Cash-Boi

Date: 2026-11-02. Skill: `performance-review`.

## Executive summary

- **Overall state:** The application has high baseline rendering and payload overhead driven by unpaginated list API fetches, redundant dual date utilities (`moment` alongside `date-fns`), heavy sync dependencies (`xlsx`), and oversized monolithic trade forms triggering full component re-render trees.
- **Top 3 risks:**
  1. Unbounded historical data fetching without pagination on major transaction endpoints (`get-purchase-list`, `get-sales-and-return-list`, `get-product-list`).
  2. Substantial initial client bundle overhead (665 KB core JS + 274 KB `xlsx` + 60.7 KB `moment`) delaying First Contentful Paint.
  3. Form re-render cascades in thousand-line trade components evaluating multiple independent state variables per keystroke.
- **Total est. $/mo:** n/a

## Inputs used / missing

- **Used:**
  - Vite frontend build artifacts and bundle chunk inspection (`dist/assets`).
  - Source code analysis across `src/pages/admin/trade`, `src/hooks/`, `src/services/`, and `src/components/`.
  - Dependencies analysis via `package.json` and `package-lock.json`.
- **Missing:**
  - Live backend database query execution stats (`pg_stat_statements` or MySQL `performance_schema` not accessible from frontend repo).
  - APM network tracing and real-user production performance metrics (numbers below are tagged as estimates based on typical payload and network parameters).

## Findings

### [High] Unbounded Transaction Data Queries Without Server Pagination

**Evidence**: In [src/pages/admin/trade/purchases/hooks/usePurchaseQueries.ts](file:///c:/webens/Cash-Boi/src/pages/admin/trade/purchases/hooks/usePurchaseQueries.ts#L105-L131) and related transaction queries:
```ts
const res: any = await postData({
  url: endpoint,
  body: { accessUser },
});
```
Endpoints `/get-purchase-list`, `/get-purchase-and-return-list`, `/get-sale-list`, and `/get-sales-and-return-list` are requested without `page` or `limit` parameters, loading complete arrays of historical transactions with nested item details into memory.

**Cost per request**: 
`(estimate)` 1 request x 1,500 historical transaction rows x 1.8 KB average payload with details = ~2.7 MB uncompressed JSON transferred per page mount; 100 ms - 300 ms JSON parsing and garbage collection stall on mobile/low-end devices.

**Why it matters**: As the store records accumulate thousands of sales and purchases over months of operation, memory consumption and network payload escalate linearly with business history, causing page freezing, high mobile data usage, and browser crashes.

**Fix**:
Implement server-side pagination with query parameters and use TanStack Query's `useInfiniteQuery` or standard paginated queries:

```diff
--- a/src/pages/admin/trade/purchases/hooks/usePurchaseQueries.ts
+++ b/src/pages/admin/trade/purchases/hooks/usePurchaseQueries.ts
@@ -104,7 +104,7 @@ export const isPurchaseReturnRecord = (item: any): boolean => {
  */
-export const fetchPurchasesList = async (): Promise<PurchaseItem[]> => {
+export const fetchPurchasesList = async (page = 1, limit = 25): Promise<{ items: PurchaseItem[]; total: number }> => {
   try {
     const accessUser = buildAccessUser();
     const endpoint = apiConfig.purchase.purchaseListUrl;
     const res: any = await postData({
       url: endpoint,
-      body: { accessUser },
+      body: { accessUser, page, limit },
     });
```

**Est. $/mo**: n/a

---

### [High] Redundant Heavy Libraries and Large Initial JS Bundle

**Evidence**: 
1. Build chunk analysis shows:
   - `index-DUXRcJnE.js`: 665.05 KB
   - `xlsx-CWmPmi3w.js`: 274.34 KB
   - `moment-05p6uoUQ.js`: 60.74 KB
2. [package.json](file:///c:/webens/Cash-Boi/package.json#L18-L21) includes both `date-fns: ^4.1.0` and `moment: ^2.30.1`. `moment` is imported in 5 service/utility files while `date-fns` is also installed.
3. `xlsx` (274 KB) is loaded synchronously in [src/utils/excel-export.ts](file:///c:/webens/Cash-Boi/src/utils/excel-export.ts#L1).

**Cost per request**:
`(estimate)` Initial page load transfers ~1.0 MB compressed JS (3.34 MB uncompressed). On a 4G connection (~10 Mbps), downloading and parsing unnecessary chunks adds ~800 ms - 1,500 ms delay to Time to Interactive (TTI).

**Why it matters**: Serving heavy legacy libraries increases bundle size and delays rendering. `moment` does not support modern tree-shaking, whereas `date-fns` is already present. Loading `xlsx` upfront penalizes users who never export spreadsheets.

**Fix**:
1. Dynamically import `xlsx` only inside the export trigger functions:
```diff
--- a/src/utils/excel-export.ts
+++ b/src/utils/excel-export.ts
@@ -1,4 +1,3 @@
-import * as XLSX from "xlsx";
...
 export const exportToExcel = async (...) => {
+  const XLSX = await import("xlsx");
   const worksheet = XLSX.utils.json_to_sheet(fullData, { header: headers });
```
2. Replace `moment` references with `date-fns` and uninstall `moment`:
```diff
# package.json
- "moment": "^2.30.1",
```

**Est. $/mo**: n/a

---

### [Medium] State Fragmentation and Full Component Re-rendering in Forms

**Evidence**: [PurchaseForm.tsx](file:///c:/webens/Cash-Boi/src/pages/admin/trade/create-purchase/components/PurchaseForm.tsx) (1,164 lines) and [SaleForm.tsx](file:///c:/webens/Cash-Boi/src/pages/admin/trade/create-sale/components/SaleForm.tsx) manage dozens of separate `useState` hooks for input fields, calculation parameters, payment amounts, and modal toggles inside one monolithic component.

**Cost per request**:
`(estimate)` 20 to 50 keystroke events per invoice creation x entire 1,100-line virtual DOM tree re-render = 15 ms - 35 ms CPU thread blocking per keystroke on typical office laptops.

**Why it matters**: Typing in discount, product quantities, or payment inputs triggers synchronous recalculation of the entire page and rerenders modals, selectors, and summary panels, causing perceptible input lag.

**Fix**:
Wrap independent sections in `React.memo` or isolate field changes using `react-hook-form` or targeted state sub-components so line item inputs do not trigger header and payment recalculations:

```diff
+// Memoize heavy calculation tables
+export const MemoizedTradeLineItemsTable = React.memo(TradeLineItemsTable);
+export const MemoizedTradePaymentSection = React.memo(TradePaymentSection);
```

**Est. $/mo**: n/a

---

### [Low] Uncached Repeated Metadata Endpoints Across Route Transitions

**Evidence**: Financial account information (`get-bank-info-list`, `mfs-user-list`) and category lookups are fetched in individual forms without unified long-lived cache keys (`staleTime: 5 * 60 * 1000`).

**Cost per request**:
`(estimate)` Navigating between Sale, Purchase, and Return forms triggers 2 redundant HTTP queries per navigation (~150 ms network roundtrips each).

**Why it matters**: Settings and static payment account definitions rarely change within a session and should be instantly served from cache.

**Fix**:
Increase `staleTime` and `gcTime` for shared dictionary and lookup queries:
```ts
staleTime: 10 * 60 * 1000, // 10 minutes cache validity
gcTime: 30 * 60 * 1000,
```

**Est. $/mo**: n/a

## Reviewed, found clean

- **Route Splitting**: All admin routes in [src/routes/index.tsx](file:///c:/webens/Cash-Boi/src/routes/index.tsx) use `React.lazy` code-splitting with `Suspense` fallbacks, avoiding loading admin subpages until requested.
- **Invoice Number Generation**: Replaced heavy server round-trip fetches with client-side microsecond timestamp generator ([src/utils/invoiceNo.ts](file:///c:/webens/Cash-Boi/src/utils/invoiceNo.ts)), eliminating 1 network roundtrip per new invoice.
- **Image Assets**: Static assets in `public/` are SVG or lightweight PNGs under 50 KB each (no bloated multi-megabyte hero images in repository).

## Commands for you to run

Analyze production bundle breakdown:
```sh
npm run build
```

Verify removal of `moment` after migration:
```sh
npm uninstall moment
```

---

Reviewed with RayStack by Harun R. Rayhan. For a hands-on audit: https://harun.dev/consultation
