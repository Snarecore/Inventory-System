import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import moment from "moment";
import { purchaseAndReturnQueryKey, purchaseListQueryKey } from "@/config/query-key";
import apiConfig from "@/config/api.json";
import { postData } from "@/services/api-service";
import { buildAccessUser } from "@/utils/access-user";
import type { PurchaseItem } from "@/types";
import { getPersistedPurchaseReturns } from "@/utils/trade-return-storage";
import { getCleanOrderNo } from "@/pages/admin/trade/sales/hooks/useSalesQueries";

/**
 * Unified Purchase Record interface representing both Purchases and Returns
 * in the Trade domain with strict typing.
 */
export interface UnifiedPurchaseRecord extends PurchaseItem {
  isReturnRecord?: boolean;
  purchaseInvoiceNo?: string;
  returnNo?: string;
  returnGrandTotal?: number;
  returnRefundAmount?: number;
  returnType?: string;
  refNo?: string;
  purchaseReturnDetails?: any[];
  returnDetails?: any[];
}

/**
 * Extracts line items array from arbitrary backend property names.
 */
export const extractPurchaseLineItems = (item: any): any[] => {
  const raw =
    (Array.isArray(item?.purchaseDetails) && item.purchaseDetails.length > 0 ? item.purchaseDetails : null) ||
    (Array.isArray(item?.purchasesDetails) && item.purchasesDetails.length > 0 ? item.purchasesDetails : null) ||
    (Array.isArray(item?.details) && item.details.length > 0 ? item.details : null) ||
    [];
  return raw.map((d: any) => ({
    ...d,
    productId: d.productId ?? d.product_id ?? d.id,
    productCode: d.productCode ?? d.pcode ?? "",
    productName: d.productName ?? d.name ?? "",
  }));
};

/**
 * Single source of truth for normalizing purchase record numeric fields and line items.
 */
export const normalizePurchaseRecord = (item: any): PurchaseItem => {
  const lineItems = extractPurchaseLineItems(item);
  const grandTotal = Number(item?.grandTotal ?? item?.grand_total ?? item?.totalAmount ?? 0);
  const paidAmount = Number(item?.paidAmount ?? item?.paid_amount ?? 0);
  const dueAmount = Number(item?.dueAmount ?? item?.due_amount ?? 0);
  const supplierId = item?.supplierId ?? item?.supplier_id ?? item?.partyId ?? item?.party_id;
  const supplierName =
    item?.supplierName ||
    item?.supplier_name ||
    item?.partyName ||
    item?.party_name ||
    item?.supplier ||
    "Direct Supplier";
  const supplierPhone =
    item?.supplierPhone ||
    item?.supplier_phone ||
    item?.phone ||
    item?.partyPhone ||
    item?.party_phone ||
    "";
  const supplierAddress =
    item?.supplierAddress ||
    item?.supplier_address ||
    item?.address ||
    item?.partyAddress ||
    "";
  const hasReturn = Boolean(
    item?.hasReturn ||
    item?.returnNo ||
    (Array.isArray(item?.returnDetails) && item.returnDetails.length > 0) ||
    (Array.isArray(item?.purchaseReturnDetails) && item.purchaseReturnDetails.length > 0)
  );

  const cleanOrderNo = getCleanOrderNo(
    item?.orderNo || item?.order_no || item?.orderId || item?.order_id || item?.purchaseOrderNo,
    item?.invoiceNo || item?.purchaseInvoiceNo || item?.invoice_no
  );

  return {
    ...item,
    orderNo: cleanOrderNo,
    supplierId,
    supplierName,
    supplierPhone,
    supplierAddress,
    grandTotal,
    paidAmount,
    dueAmount,
    hasReturn,
    purchaseDetails: lineItems,
    details: lineItems,
  };
};

/**
 * Determines if an arbitrary item represents a purchase return record.
 * A purchase record with line items and invoice/order must NEVER be classified as a return voucher.
 */
export const isPurchaseReturnRecord = (item: any): boolean => {
  if (!item) return false;
  if (item.isReturnRecord === true) return true;
  if (item.isReturnRecord === false) return false;

  const lineItems = extractPurchaseLineItems(item);
  const hasPurchaseLines = lineItems.length > 0;

  // A purchase invoice is ALWAYS a purchase record, even if it has returned items attached
  if (hasPurchaseLines && (item.invoiceNo || item.purchaseInvoiceNo || item.orderNo || item.challanNo)) return false;
  if (item.invoiceNo && item.purchaseDate && !item.returnNo?.startsWith?.("PR-")) return false;

  const hasReturnLines =
    (Array.isArray(item.returnDetails) && item.returnDetails.length > 0) ||
    (Array.isArray(item.purchaseReturnDetails) && item.purchaseReturnDetails.length > 0);

  return (
    (typeof item.refNo === "string" && item.refNo.startsWith("PR-")) ||
    (typeof item.returnNo === "string" && !item.invoiceNo && !item.purchaseDate) ||
    String(item.returnType || "").toUpperCase() === "RETURN" ||
    (String(item.status || "").toUpperCase() === "RETURN" && !item.invoiceNo) ||
    (hasReturnLines && !hasPurchaseLines)
  );
};

/**
 * Standardized fetcher for all purchase records.
 * Single source of truth for purchases list query across the entire app.
 */
export const fetchPurchasesList = async (): Promise<PurchaseItem[]> => {
  try {
    const accessUser = buildAccessUser();
    const endpoint = apiConfig.purchase.purchaseListUrl;
    const res: any = await postData({
      url: endpoint,
      body: { accessUser },
    });

    const list =
      res?.purchaseList ||
      res?.purchasesList ||
      res?.purchases ||
      res?.purchaseListDetails ||
      res?.purchaseInfoList ||
      res?.purchase_list ||
      (Array.isArray(res?.data)
        ? res?.data
        : res?.data?.purchaseList || res?.data?.purchases || res?.data?.purchase_list) ||
      [];

    const normalizedList = (Array.isArray(list) ? list : []).map(normalizePurchaseRecord);

    // Merge persisted returned purchases so they are never lost from purchases listings
    const { returnedPurchases } = getPersistedPurchaseReturns();
    if (returnedPurchases && returnedPurchases.length > 0) {
      const existingKeys = new Set(
        normalizedList.map((p) => String(p.invoiceNo || p.purchaseInvoiceNo || p.orderNo || p.id || "").trim().toLowerCase())
      );
      returnedPurchases.forEach((pp) => {
        const k = String(pp.invoiceNo || pp.purchaseInvoiceNo || pp.orderNo || pp.id || "").trim().toLowerCase();
        if (k && !existingKeys.has(k)) {
          existingKeys.add(k);
          normalizedList.push(normalizePurchaseRecord({ ...pp, hasReturn: true }));
        }
      });
    }

    return normalizedList;
  } catch (error) {
    console.error("Failed to fetch purchases list:", error);
    return [];
  }
};

/**
 * Standardized fetcher for combined purchase and return records.
 * Single source of truth for combined purchase and return query.
 * Preserves every purchase in purchasesList while also extracting return vouchers for returnsList.
 */
export const fetchPurchaseAndReturnList = async (): Promise<UnifiedPurchaseRecord[]> => {
  try {
    const accessUser = buildAccessUser();
    const endpoint = apiConfig.purchaseReturn.getPurchaseAndReturnListUrl;

    const [purchaseAndReturnRes, finTxRes] = await Promise.allSettled([
      postData({
        url: endpoint,
        body: { accessUser },
      }),
      postData({
        url: apiConfig.finance.getFinancialTransactionUrl,
        body: { accessUser, startDate: "", endDate: "", type: "INCOME" },
      }),
    ]);

    const res: any = purchaseAndReturnRes.status === "fulfilled" ? purchaseAndReturnRes.value : null;
    const finTxList: any[] =
      finTxRes.status === "fulfilled"
        ? (Array.isArray(finTxRes.value?.data)
            ? finTxRes.value.data
            : Array.isArray(finTxRes.value?.financialTransactionList)
            ? finTxRes.value.financialTransactionList
            : Array.isArray(finTxRes.value)
            ? finTxRes.value
            : []
          ).filter(
            (t: any) =>
              t &&
              t.isDeleted !== "Y" &&
              (t.head === "Purchase Return" || String(t.notes || "").toLowerCase().includes("purchase return")) &&
              (!t.notes || !t.notes.includes("Auto Purchase Return")) &&
              !(t.refNo && t.billRef && String(t.refNo).trim() === String(t.billRef).trim()) &&
              !(t.refNo && String(t.refNo).startsWith("261111"))
          )
        : [];

    const { returnedPurchases: persistedPurchases, returnVouchers: persistedVouchers } = getPersistedPurchaseReturns();
    const persistedPurchaseMap = new Map<string, PurchaseItem>();
    persistedPurchases.forEach((pp) => {
      const k = String(pp.invoiceNo || pp.purchaseInvoiceNo || pp.orderNo || pp.challanNo || pp.id || "").trim().toLowerCase();
      if (k) persistedPurchaseMap.set(k, pp);
    });
    const persistedReturnMap = new Map<string, any>();
    persistedVouchers.forEach((pv) => {
      const k = String(pv.returnNo || pv.id || "").trim().toLowerCase();
      if (k) persistedReturnMap.set(k, pv);
      const invK = String(pv.purchaseInvoiceNo || pv.invoiceNo || pv.orderNo || pv.challanNo || "").trim().toLowerCase();
      if (invK) persistedReturnMap.set(invK, pv);
    });

    const purchases = Array.isArray(res?.data)
      ? res.data
      : Array.isArray(res?.purchaseList)
      ? res.purchaseList
      : Array.isArray(res?.purchases)
      ? res.purchases
      : Array.isArray(res?.purchasesList)
      ? res.purchasesList
      : Array.isArray(res?.data?.purchases)
      ? res.data.purchases
      : Array.isArray(res?.data?.purchaseList)
      ? res.data.purchaseList
      : Array.isArray(res?.data?.purchasesList)
      ? res.data.purchasesList
      : [];

    const returns = Array.isArray(res?.returns)
      ? res.returns
      : Array.isArray(res?.returnList)
      ? res.returnList
      : Array.isArray(res?.purchaseReturnList)
      ? res.purchaseReturnList
      : Array.isArray(res?.purchaseReturns)
      ? res.purchaseReturns
      : Array.isArray(res?.purchase_returns)
      ? res.purchase_returns
      : Array.isArray(res?.data?.returns)
      ? res.data.returns
      : Array.isArray(res?.data?.returnList)
      ? res.data.returnList
      : Array.isArray(res?.data?.purchaseReturnList)
      ? res.data.purchaseReturnList
      : Array.isArray(res?.data?.purchaseReturns)
      ? res.data.purchaseReturns
      : [];

    const combinedList = Array.isArray(res?.purchaseAndReturnList)
      ? res.purchaseAndReturnList
      : Array.isArray(res)
      ? res
      : [];

    // Deduplicate into unified records array with multi-alias indexing to avoid duplicate purchases
    const seenReturnKeys = new Set<string>();
    const returnedInvoices = new Set<string>();
    const unifiedList: UnifiedPurchaseRecord[] = [];
    const aliasToPurIdx = new Map<string, number>();

    const getPurchaseAliases = (item: any): string[] => {
      if (!item) return [];
      const invNo = item.purchaseInvoiceNo || item.purchase_invoice_no || item.invoiceNo || item.invoice_no;
      const chnNo = item.challanNo || item.challan_no;
      const ordNo = item.orderNo || item.order_no;
      const pId = item.purchaseId || item.purchase_id || item.id;
      const cleanOrd = getCleanOrderNo(ordNo, invNo);

      return [
        cleanOrd ? `pur_ord_${cleanOrd.toLowerCase()}` : null,
        ordNo ? `pur_ord_${String(ordNo).trim().toLowerCase()}` : null,
        invNo ? `pur_inv_${String(invNo).trim().toLowerCase()}` : null,
        item.invoiceNo ? `pur_inv_${String(item.invoiceNo).trim().toLowerCase()}` : null,
        item.purchaseInvoiceNo ? `pur_inv_${String(item.purchaseInvoiceNo).trim().toLowerCase()}` : null,
        chnNo ? `pur_chn_${String(chnNo).trim().toLowerCase()}` : null,
        pId ? `pur_id_${String(pId).trim().toLowerCase()}` : null,
      ].filter(Boolean) as string[];
    };

    const addPurchaseRecord = (item: any, fallbackIdx: number) => {
      if (!item) return;
      const aliases = getPurchaseAliases(item);
      const cleanOrd = getCleanOrderNo(item.orderNo, item.invoiceNo || item.purchaseInvoiceNo);

      const hasReturnInfo = Boolean(
        item.hasReturn ||
        item.returnNo ||
        item.return_no ||
        item.returnGrandTotal ||
        item.returnRefundAmount ||
        (Array.isArray(item.returnDetails) && item.returnDetails.length > 0) ||
        (Array.isArray(item.purchaseReturnDetails) && item.purchaseReturnDetails.length > 0) ||
        (Array.isArray(item.returns) && item.returns.length > 0) ||
        (Array.isArray(item.purchaseReturns) && item.purchaseReturns.length > 0)
      );

      let existingIdx = -1;
      for (const a of aliases) {
        if (aliasToPurIdx.has(a)) {
          existingIdx = aliasToPurIdx.get(a)!;
          break;
        }
      }

      if (existingIdx === -1) {
        const normalized = normalizePurchaseRecord(item) as UnifiedPurchaseRecord;
        normalized.isReturnRecord = false;
        normalized.hasReturn = hasReturnInfo;
        const newIdx = unifiedList.length;
        unifiedList.push(normalized);
        aliases.forEach((a) => aliasToPurIdx.set(a, newIdx));
      } else {
        const existing = unifiedList[existingIdx];
        const existingDetails = Array.isArray(existing.purchaseDetails) && existing.purchaseDetails.length > 0
          ? existing.purchaseDetails
          : existing.details || [];
        const newDetails = extractPurchaseLineItems(item);
        const bestDetails = existingDetails.length >= newDetails.length ? existingDetails : newDetails;

        unifiedList[existingIdx] = {
          ...existing,
          ...item,
          orderNo: cleanOrd || existing.orderNo || item.orderNo,
          hasReturn: Boolean(existing.hasReturn || hasReturnInfo),
          grandTotal: existing.grandTotal || Number(item.grandTotal ?? 0),
          paidAmount: existing.paidAmount || Number(item.paidAmount ?? 0),
          purchaseDetails: bestDetails,
          details: bestDetails,
          isReturnRecord: false,
        };
        aliases.forEach((a) => aliasToPurIdx.set(a, existingIdx));
      }

      if (hasReturnInfo) {
        aliases.forEach((a) => returnedInvoices.add(a));

        // Extract nested return records
        const nestedReturns = [
          ...(Array.isArray(item.returns) ? item.returns : []),
          ...(Array.isArray(item.purchaseReturns) ? item.purchaseReturns : []),
        ];

        if (nestedReturns.length > 0) {
          nestedReturns.forEach((r: any, rIdx: number) => {
            if (!r || typeof r !== "object") return;
            const rNo = r.returnNo || r.return_no || (item.orderNo ? `PR-${item.orderNo}-${rIdx + 1}` : `PR-${item.id || fallbackIdx}`);
            const rKey = `ret_${rNo}`;
            if (!seenReturnKeys.has(rKey)) {
              seenReturnKeys.add(rKey);
              const rDetails = Array.isArray(r.returnDetails)
                ? r.returnDetails
                : Array.isArray(r.purchaseReturnDetails)
                ? r.purchaseReturnDetails
                : Array.isArray(r.details)
                ? r.details
                : [];
              const retRecord: UnifiedPurchaseRecord = {
                ...normalizePurchaseRecord({ ...item, ...r }),
                id: r.id || r.returnId || `${item.id}_ret_${rIdx}`,
                returnNo: rNo,
                purchaseInvoiceNo: item.purchaseInvoiceNo || item.invoiceNo || item.orderNo || "",
                invoiceNo: item.invoiceNo || item.purchaseInvoiceNo || "",
                orderNo: r.orderNo || item.orderNo || "",
                challanNo: r.challanNo || item.challanNo || "",
                returnDate: r.returnDate || r.return_date || item.purchaseDate || moment().format("YYYY-MM-DD"),
                grandTotal: Number(r.returnGrandTotal ?? r.grandTotal ?? r.totalAmount ?? 0),
                refundAmount: Number(r.returnRefundAmount ?? r.refundAmount ?? r.returnGrandTotal ?? r.grandTotal ?? 0),
                totalAmount: Number(r.totalAmount ?? r.returnTotalAmount ?? r.returnGrandTotal ?? 0),
                returnDetails: rDetails,
                purchaseDetails: [],
                details: rDetails,
                isReturnRecord: true,
                hasReturn: true,
              };
              unifiedList.push(retRecord);
            }
          });
        }
      }
    };

    const addReturnRecord = (item: any, fallbackIdx: number) => {
      if (!item) return;
      const rNo = item.returnNo || item.return_no || item.id || `ret_idx_${fallbackIdx}`;
      const rKey = `ret_${rNo}`;
      if (!seenReturnKeys.has(rKey)) {
        seenReturnKeys.add(rKey);
        const normalized = normalizePurchaseRecord(item) as UnifiedPurchaseRecord;
        normalized.isReturnRecord = true;
        normalized.hasReturn = true;
        unifiedList.push(normalized);

        const purAliases = getPurchaseAliases(item);
        purAliases.forEach((a) => returnedInvoices.add(a));
      }

      // Check if original purchase already exists
      const purAliases = getPurchaseAliases(item);
      let existingIdx = -1;
      for (const a of purAliases) {
        if (aliasToPurIdx.has(a)) {
          existingIdx = aliasToPurIdx.get(a)!;
          break;
        }
      }

      if (existingIdx !== -1) {
        // Original purchase already exists! DO NOT create a synthetic duplicate!
        unifiedList[existingIdx].hasReturn = true;
        purAliases.forEach((a) => aliasToPurIdx.set(a, existingIdx));
      } else {
        // Only reconstruct fallback purchase if original purchase is completely missing
        const cleanOrd = getCleanOrderNo(item.orderNo, item.purchaseInvoiceNo || item.invoiceNo);
        addPurchaseRecord({
          ...item,
          id: item.purchaseId || item.purchase_id || item.id || cleanOrd,
          orderNo: cleanOrd,
          invoiceNo: item.invoiceNo || item.purchaseInvoiceNo || cleanOrd,
          purchaseInvoiceNo: item.purchaseInvoiceNo || item.invoiceNo || cleanOrd,
          challanNo: item.challanNo || "",
          purchaseDate: item.purchaseDate || item.returnDate || item.createdAt || moment().format("YYYY-MM-DD"),
          grandTotal: Number(item.grandTotal ?? item.returnGrandTotal ?? item.totalAmount ?? 0),
          paidAmount: Number(item.paidAmount ?? item.returnGrandTotal ?? item.grandTotal ?? 0),
          dueAmount: Number(item.dueAmount ?? 0),
          purchaseDetails: extractPurchaseLineItems(item),
          details: extractPurchaseLineItems(item),
          hasReturn: true,
          isReturnRecord: false,
        }, fallbackIdx);
      }
    };

    // 1. Process actual purchases first!
    purchases.forEach((p: any, idx: number) => addPurchaseRecord(p, idx));

    // 2. Process combinedList (actual purchases / returns from API)
    combinedList.forEach((d: any, idx: number) => {
      if (isPurchaseReturnRecord(d)) {
        addReturnRecord(d, idx);
      } else {
        addPurchaseRecord(d, idx);
      }
    });

    // 3. Process persisted purchases from browser localStorage
    persistedPurchases.forEach((pp, idx) => addPurchaseRecord(pp, idx));

    // 4. Process returns and persisted return vouchers
    returns.forEach((r: any, idx: number) => addReturnRecord(r, idx));
    persistedVouchers.forEach((pv, idx) => addReturnRecord(pv, idx));

    // 5. Financial transactions (fallback ONLY for missing purchases and vouchers)
    finTxList.forEach((tx: any, idx: number) => {
      let invNo = "";
      let supName = "Supplier";

      if (tx.notes) {
        const invMatch = tx.notes.match(/(?:invoice|from|supplier)\s+([A-Za-z0-9_-]+)/i);
        if (invMatch && invMatch[1]) {
          invNo = invMatch[1].trim();
        }
        const supMatch = tx.notes.match(/\(([^)]+)\)/);
        if (supMatch && supMatch[1]) {
          supName = supMatch[1].trim();
        }
      }

      if (!invNo && tx.refNo && !tx.refNo.startsWith("261111") && !tx.refNo.startsWith("PR-")) {
        invNo = String(tx.refNo).trim();
      }
      if (!invNo && tx.refNo) {
        invNo = String(tx.refNo).trim();
      }
      if (!invNo && tx.billRef) {
        invNo = String(tx.billRef).trim();
      }

      if (!invNo) return;

      const persistedPur = persistedPurchaseMap.get(invNo.toLowerCase());
      const cleanOrdNo = getCleanOrderNo(persistedPur?.orderNo, invNo);
      const finAliases = [
        cleanOrdNo ? `pur_ord_${cleanOrdNo.toLowerCase()}` : null,
        invNo ? `pur_inv_${invNo.toLowerCase()}` : null,
      ].filter(Boolean) as string[];

      const finPurchaseExists = finAliases.some((a) => aliasToPurIdx.has(a));
      if (!finPurchaseExists) {
        addPurchaseRecord({
          id: persistedPur?.id || `pur_fin_${tx.id || tx.billRef}`,
          orderNo: cleanOrdNo,
          invoiceNo: persistedPur?.invoiceNo || invNo,
          purchaseInvoiceNo: (persistedPur as any)?.purchaseInvoiceNo || invNo,
          challanNo: persistedPur?.challanNo || "",
          supplierName:
            persistedPur?.supplierName && persistedPur.supplierName !== "Supplier" && persistedPur.supplierName !== "Direct Supplier"
              ? persistedPur.supplierName
              : supName,
          supplierId: persistedPur?.supplierId || 0,
          supplierPhone: persistedPur?.supplierPhone || "",
          supplierAddress: persistedPur?.supplierAddress || "",
          purchaseDate:
            persistedPur?.purchaseDate ||
            tx.transactionDate ||
            (tx.createdDate ? String(tx.createdDate).split("T")[0] : moment().format("YYYY-MM-DD")),
          createdAt: persistedPur?.createdAt || tx.createdDate || tx.transactionDate,
          totalAmount: Number(persistedPur?.totalAmount ?? tx.amount ?? 0),
          discount: Number(persistedPur?.discount ?? 0),
          vat: Number(persistedPur?.vat ?? 0),
          deliveryCharge: Number((persistedPur as any)?.deliveryCharge ?? 0),
          grandTotal: Number(persistedPur?.grandTotal ?? tx.amount ?? 0),
          paidAmount: Number(persistedPur?.paidAmount ?? tx.amount ?? 0),
          dueAmount: Number(persistedPur?.dueAmount ?? 0),
          paymentType: String(persistedPur?.paymentType || tx.accountType || "CASH").toUpperCase(),
          status: "Returned",
          paymentStatus: "Returned",
          note: persistedPur?.note || tx.notes || "Purchase return refund",
          osType: "WEB",
          hasReturn: true,
          returnNo: tx.billRef || persistedPur?.returnNo,
          returnDate: tx.transactionDate,
          returnGrandTotal: Number(tx.amount || (persistedPur as any)?.returnGrandTotal || 0),
          returnRefundAmount: Number(tx.amount || (persistedPur as any)?.returnRefundAmount || 0),
          purchaseDetails: persistedPur?.purchaseDetails || [],
          details: persistedPur?.details || persistedPur?.purchaseDetails || [],
          isReturnRecord: false,
        }, idx);
      }

      // Ensure return voucher exists in unifiedList for the Returns tab
      const returnNo = tx.billRef || persistedPur?.returnNo || `PR-${invNo}`;
      const retKey = `ret_${returnNo}`;
      if (!seenReturnKeys.has(retKey)) {
        seenReturnKeys.add(retKey);
        const persistedVoucher = persistedReturnMap.get(returnNo.toLowerCase()) || persistedReturnMap.get(invNo.toLowerCase());
        const cleanOrdNo = getCleanOrderNo(persistedVoucher?.orderNo || persistedPur?.orderNo, invNo);
        const reconstructedReturn: UnifiedPurchaseRecord = {
          id: persistedVoucher?.id || `ret_fin_${tx.id || tx.billRef || idx}`,
          returnNo,
          orderNo: cleanOrdNo,
          invoiceNo: persistedVoucher?.invoiceNo || invNo,
          purchaseInvoiceNo: persistedVoucher?.purchaseInvoiceNo || invNo,
          challanNo: persistedVoucher?.challanNo || persistedPur?.challanNo || "",
          supplierName:
            persistedVoucher?.supplierName ||
            persistedPur?.supplierName ||
            supName,
          supplierId: persistedVoucher?.supplierId || persistedPur?.supplierId || 0,
          supplierPhone: persistedVoucher?.supplierPhone || persistedPur?.supplierPhone || "",
          supplierAddress: persistedVoucher?.supplierAddress || persistedPur?.supplierAddress || "",
          returnDate:
            persistedVoucher?.returnDate ||
            tx.transactionDate ||
            (tx.createdDate ? String(tx.createdDate).split("T")[0] : moment().format("YYYY-MM-DD")),
          createdAt: persistedVoucher?.createdAt || tx.createdDate || tx.transactionDate,
          grandTotal: Number(tx.amount || persistedVoucher?.grandTotal || 0),
          refundAmount: Number(tx.amount || persistedVoucher?.refundAmount || 0),
          totalAmount: Number(tx.amount || persistedVoucher?.totalAmount || 0),
          paymentType: String(persistedVoucher?.paymentType || tx.accountType || "CASH").toUpperCase(),
          status: "Completed",
          note: persistedVoucher?.note || tx.notes || "Purchase return refund",
          remarks: persistedVoucher?.remarks || tx.notes || "Purchase return refund",
          returnDetails: persistedVoucher?.returnDetails || persistedPur?.purchaseDetails || [],
          purchaseDetails: [],
          details: persistedVoucher?.returnDetails || persistedPur?.purchaseDetails || [],
          isReturnRecord: true,
          hasReturn: true,
        };
        unifiedList.push(reconstructedReturn);
      }
    });

    // 6. Ensure hasReturn is set on any purchase record whose aliases match returnedInvoices
    unifiedList.forEach((rec) => {
      if (!rec.isReturnRecord) {
        const aliases = getPurchaseAliases(rec);
        if (aliases.some((a) => returnedInvoices.has(a))) {
          rec.hasReturn = true;
        }
      }
    });

    return unifiedList;
  } catch (error) {
    console.error("Failed to fetch purchase and return list:", error);
    return [];
  }
};

/**
 * Standardized hook for purchase list
 * Shared across Purchases page, Purchase Return list, Purchase tab, and Create Form.
 */
export const usePurchasesQuery = <TData = PurchaseItem[]>(
  options?: Omit<UseQueryOptions<PurchaseItem[], Error, TData>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: [purchaseListQueryKey],
    queryFn: fetchPurchasesList,
    staleTime: 0,
    ...options,
  });
};

/**
 * Standardized hook for combined purchase and return list
 * Shared across Purchase Return list, Purchases page, and Create Form.
 */
export const usePurchaseAndReturnsQuery = <TData = UnifiedPurchaseRecord[]>(
  options?: Omit<UseQueryOptions<UnifiedPurchaseRecord[], Error, TData>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: [purchaseAndReturnQueryKey],
    queryFn: fetchPurchaseAndReturnList,
    staleTime: 0,
    ...options,
  });
};

/**
 * Safely extracts set of returned invoice/order/challan/purchaseId keys.
 * Note: Never indexes return record id (item.id) to prevent collisions with purchase.id.
 */
export const extractReturnedPurchaseKeysSet = (records: any[]): Set<string> => {
  const set = new Set<string>();
  if (!Array.isArray(records)) return set;

  records.forEach((item: any) => {
    if (!item || typeof item !== "object") return;

    const isRet =
      isPurchaseReturnRecord(item) ||
      Boolean(item.hasReturn) ||
      Boolean(item.returnNo || item.return_no) ||
      Boolean(item.returnGrandTotal) ||
      (Array.isArray(item.returnDetails) && item.returnDetails.length > 0) ||
      (Array.isArray(item.purchaseReturnDetails) && item.purchaseReturnDetails.length > 0) ||
      (Array.isArray(item.returns) && item.returns.length > 0) ||
      (Array.isArray(item.purchaseReturns) && item.purchaseReturns.length > 0);

    if (isRet) {
      const inv = item.purchaseInvoiceNo || item.purchase_invoice_no || item.invoiceNo || item.invoice_no;
      if (inv && inv !== "-") {
        set.add(String(inv).trim().toLowerCase());
      }
      const ord = item.orderNo || item.order_no;
      if (ord) {
        set.add(String(ord).trim().toLowerCase());
        const cleanOrd = getCleanOrderNo(ord, inv);
        if (cleanOrd) set.add(cleanOrd.toLowerCase());
      }
      const chn = item.challanNo || item.challan_no;
      if (chn) {
        set.add(String(chn).trim().toLowerCase());
      }
      const pId = item.purchaseId || item.purchase_id;
      if (pId) {
        set.add(String(pId).trim().toLowerCase());
      }
    }
  });

  // Also merge persisted purchase returns from local storage
  try {
    const { returnVouchers, returnedPurchases } = getPersistedPurchaseReturns();
    returnVouchers.forEach((pv: any) => {
      const inv = pv.purchaseInvoiceNo || pv.purchase_invoice_no || pv.invoiceNo || pv.invoice_no;
      if (inv && inv !== "-") set.add(String(inv).trim().toLowerCase());
      if (pv.orderNo) set.add(String(pv.orderNo).trim().toLowerCase());
      if (pv.challanNo) set.add(String(pv.challanNo).trim().toLowerCase());
      if (pv.purchaseId) set.add(String(pv.purchaseId).trim().toLowerCase());
    });
    returnedPurchases.forEach((pp: any) => {
      const inv = pp.purchaseInvoiceNo || pp.purchase_invoice_no || pp.invoiceNo || pp.invoice_no;
      if (inv && inv !== "-") set.add(String(inv).trim().toLowerCase());
      if (pp.orderNo) set.add(String(pp.orderNo).trim().toLowerCase());
      if (pp.challanNo) set.add(String(pp.challanNo).trim().toLowerCase());
      if (pp.purchaseId || pp.id) set.add(String(pp.purchaseId || pp.id).trim().toLowerCase());
    });
  } catch {
    // Ignore browser storage read errors in SSR/test
  }

  return set;
};

/** Backward compatibility alias */
export const extractReturnedInvoiceKeysSet = extractReturnedPurchaseKeysSet;
