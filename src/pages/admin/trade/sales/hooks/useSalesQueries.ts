import moment from "moment";
import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import {
  salesAndReturnQueryKey,
  salesListQueryKey,
  productListQueryKey,
  customersDueQueryKey,
  customerInvoicesDueQueryKey,
  cashBalanceQueryKey,
  dashboardQueryKey,
} from "@/config/query-key";
import apiConfig from "@/config/api.json";
import { postData } from "@/services/api-service";
import { buildAccessUser } from "@/utils/access-user";

import {
  checkSalesDelete,
  deleteSalesOrder,
  validateCheckSalesDeleteResult,
} from "@/services/sales-service";
import type {
  SaleItem,
  CheckSalesDeletePayload,
  CheckSalesDeleteResponse,
  DeleteSalesOrderPayload,
  DeleteSalesOrderResponse,
} from "@/types";

export interface UnifiedTradeRecord extends SaleItem {
  isReturnRecord?: boolean;
  salesInvoiceNo?: string;
  returnNo?: string;
  returnGrandTotal?: number;
  returnType?: string;
  refNo?: string;
  salesReturnDetails?: any[];
  returnDetails?: any[];
}

export const extractLineItems = (item: any): any[] => {
  if (Array.isArray(item?.salesDetails) && item.salesDetails.length > 0) return item.salesDetails;
  if (Array.isArray(item?.saleDetails) && item.saleDetails.length > 0) return item.saleDetails;
  if (Array.isArray(item?.details) && item.details.length > 0) return item.details;
  return [];
};


export const getCleanOrderNo = (orderNo?: string | null, invoiceNo?: string | null): string => {
  const ord = String(orderNo || "").trim();
  const inv = String(invoiceNo || "").trim();

  // 1. Direct priority to real database/backend orderNo (e.g., "000335", "ORD-101", "332")
  if (ord && !/^\d{3,}-\d{10,}$/.test(ord)) {
    return ord;
  }

  // 2. Direct priority to clean invoiceNo
  if (inv && !/^\d{3,}-\d{10,}$/.test(inv)) {
    return inv;
  }

  // 3. Fallback for raw auto-generated timestamp strings (businessCode-YYYYMMDDHHmmssSSS)
  const target = ord || inv;
  if (target.includes("-")) {
    const parts = target.split("-");
    const suffix = parts[parts.length - 1];
    return `ORD-${suffix.slice(-6)}`;
  }

  return target || "";
};

/**
 * Single source of truth for normalizing sale record numeric fields and line items.
 */
export const normalizeSaleRecord = (item: any): SaleItem => {
  const lineItems = extractLineItems(item);
  const grandTotal = Number(item?.grandTotal ?? item?.grand_total ?? item?.totalAmount ?? 0);
  const paidAmount = Number(item?.paidAmount ?? item?.paid_amount ?? 0);
  const dueAmount = Number(item?.dueAmount ?? item?.due_amount ?? 0);
  const customerId = item?.customerId ?? item?.customer_id;
  const customerName =
    item?.customerName ||
    item?.customer_name ||
    "Customer";
  const customerPhone =
    item?.customerPhone ||
    item?.customer_phone ||
    "";
  const customerAddress =
    item?.customerAddress ||
    item?.customer_address ||
    "";
  const hasReturn = Boolean(
    item?.hasReturn ||
    item?.returnNo ||
    item?.return_no ||
    (Array.isArray(item?.returnDetails) && item.returnDetails.length > 0) ||
    (Array.isArray(item?.salesReturnDetails) && item.salesReturnDetails.length > 0)
  );

  const cleanOrderNo = getCleanOrderNo(
    item?.orderNo || item?.order_no,
    item?.invoiceNo || item?.salesInvoiceNo || item?.invoice_no
  );

  return {
    ...item,
    orderNo: cleanOrderNo,
    customerId,
    customerName,
    customerPhone,
    customerAddress,
    grandTotal,
    paidAmount,
    dueAmount,
    hasReturn,
    salesDetails: lineItems,
    details: lineItems,
  };
};

export const isReturnRecord = (item: any): boolean => {
  if (!item) return false;
  if (item.isReturnRecord === true) return true;
  if (item.isReturnRecord === false) return false;

  const lineItems = extractLineItems(item);
  const hasSalesLines = lineItems.length > 0;

  // A sale invoice is ALWAYS a sale record, even if it has returned items attached
  if (hasSalesLines && (item.invoiceNo || item.salesInvoiceNo || item.orderNo)) return false;
  if (item.invoiceNo && item.salesDate && !item.returnNo?.startsWith?.("SR-")) return false;

  const hasReturnLines =
    (Array.isArray(item.returnDetails) && item.returnDetails.length > 0) ||
    (Array.isArray(item.salesReturnDetails) && item.salesReturnDetails.length > 0);

  return (
    (typeof item.refNo === "string" && item.refNo.startsWith("SR-")) ||
    (typeof item.returnNo === "string" && !item.invoiceNo && !item.salesDate) ||
    String(item.returnType || "").toUpperCase() === "RETURN" ||
    (String(item.status || "").toUpperCase() === "RETURN" && !item.invoiceNo) ||
    (hasReturnLines && !hasSalesLines)
  );
};

export const fetchSalesList = async (): Promise<SaleItem[]> => {
  try {
    const accessUser = buildAccessUser();
    const endpoint = apiConfig.sales.salesListUrl;

    const res: any = await postData({
      url: endpoint,
      body: { accessUser },
    });

    const list =
      (Array.isArray(res?.data) ? res.data : null) ||
      res?.saleList ||
      res?.salesList ||
      [];

    return (Array.isArray(list) ? list : []).map(normalizeSaleRecord);
  } catch (error) {
    console.error("Failed to fetch sales list:", error);
    return [];
  }
};

/**
 * Standardized fetcher for combined sales and return records.
 * Single source of truth for combined sales and return query.
 * Preserves every sale in salesList while also extracting return vouchers for returnsList.
 */
export const fetchSalesAndReturnList = async (): Promise<UnifiedTradeRecord[]> => {
  try {
    const accessUser = buildAccessUser();
    const endpoint = apiConfig.salesReturn.getSalesAndReturnUrl;

    const [salesAndReturnRes, finTxRes] = await Promise.allSettled([
      postData({
        url: endpoint,
        body: { accessUser },
      }),
      postData({
        url: apiConfig.finance.getFinancialTransactionUrl,
        body: { accessUser, startDate: "", endDate: "", type: "EXPENSE" },
      }),
    ]);

    const res: any = salesAndReturnRes.status === "fulfilled" ? salesAndReturnRes.value : null;
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
              t.head === "Sales Return" &&
              (!t.notes || !t.notes.includes("Auto Sales Return")) &&
              !(t.refNo && t.billRef && String(t.refNo).trim() === String(t.billRef).trim()) &&
              !(t.refNo && String(t.refNo).startsWith("261111"))
          )
        : [];



    const sales = Array.isArray(res?.data)
      ? res.data
      : Array.isArray(res?.saleList)
      ? res.saleList
      : Array.isArray(res?.salesList)
      ? res.salesList
      : [];

    const returns = Array.isArray(res?.returns)
      ? res.returns
      : Array.isArray(res?.returnList)
      ? res.returnList
      : Array.isArray(res?.salesReturnList)
      ? res.salesReturnList
      : [];

    const combinedList = Array.isArray(res?.salesAndReturnList)
      ? res.salesAndReturnList
      : Array.isArray(res)
      ? res
      : [];

    // Deduplicate into unified records array with multi-alias indexing to avoid duplicate sales
    const seenReturnKeys = new Set<string>();
    const returnedInvoices = new Set<string>();
    const backendReturnAliases = new Set<string>();
    const unifiedList: UnifiedTradeRecord[] = [];
    const aliasToSaleIdx = new Map<string, number>();

    const getSaleAliases = (item: any): string[] => {
      if (!item) return [];
      const invNo = item.salesInvoiceNo || item.invoiceNo || item.sales_invoice_no || item.invoice_no;
      const ordNo = item.orderNo || item.order_no;
      const sId = item.id || item.saleId || item.sale_id;
      const cleanOrd = getCleanOrderNo(ordNo, invNo);

      return [
        cleanOrd ? `sale_ord_${cleanOrd.toLowerCase()}` : null,
        ordNo ? `sale_ord_${String(ordNo).trim().toLowerCase()}` : null,
        invNo ? `sale_inv_${String(invNo).trim().toLowerCase()}` : null,
        sId ? `sale_id_${String(sId).trim().toLowerCase()}` : null,
      ].filter(Boolean) as string[];
    };

    const addSaleRecord = (item: any, fallbackIdx: number) => {
      if (!item) return;
      const aliases = getSaleAliases(item);
      const cleanOrd = getCleanOrderNo(
        item.orderNo || item.order_no,
        item.invoiceNo || item.salesInvoiceNo
      );

      const hasReturnInfo = Boolean(
        item.hasReturn ||
        item.returnNo ||
        item.return_no ||
        (Array.isArray(item.returnDetails) && item.returnDetails.length > 0) ||
        (Array.isArray(item.salesReturnDetails) && item.salesReturnDetails.length > 0) ||
        (Array.isArray(item.returns) && item.returns.length > 0)
      );

      let existingIdx = -1;
      for (const a of aliases) {
        if (aliasToSaleIdx.has(a)) {
          existingIdx = aliasToSaleIdx.get(a)!;
          break;
        }
      }

      if (existingIdx === -1) {
        const normalized = normalizeSaleRecord(item) as UnifiedTradeRecord;
        normalized.isReturnRecord = false;
        normalized.hasReturn = hasReturnInfo;
        const newIdx = unifiedList.length;
        unifiedList.push(normalized);
        aliases.forEach((a) => aliasToSaleIdx.set(a, newIdx));
      } else {
        const existing = unifiedList[existingIdx];
        const existingDetails = Array.isArray(existing.salesDetails) && existing.salesDetails.length > 0
          ? existing.salesDetails
          : existing.details || [];
        const newDetails = extractLineItems(item);
        const bestDetails = existingDetails.length >= newDetails.length ? existingDetails : newDetails;

        unifiedList[existingIdx] = {
          ...existing,
          ...item,
          orderNo: cleanOrd || existing.orderNo || item.orderNo,
          hasReturn: Boolean(existing.hasReturn || hasReturnInfo),
          grandTotal: existing.grandTotal || Number(item.grandTotal ?? 0),
          paidAmount: existing.paidAmount || Number(item.paidAmount ?? 0),
          salesDetails: bestDetails,
          details: bestDetails,
          isReturnRecord: false,
        };
        aliases.forEach((a) => aliasToSaleIdx.set(a, existingIdx));
      }

      if (hasReturnInfo) {
        aliases.forEach((a) => returnedInvoices.add(a));

        // Extract nested return records
        const nestedReturns = [
          ...(Array.isArray(item.returns) ? item.returns : []),
          ...(Array.isArray(item.salesReturns) ? item.salesReturns : []),
        ];

        if (nestedReturns.length > 0) {
          nestedReturns.forEach((r: any, rIdx: number) => {
            if (!r || typeof r !== "object") return;
            const rNo = r.returnNo || r.return_no || (item.orderNo ? `SR-${item.orderNo}-${rIdx + 1}` : `SR-${item.id || fallbackIdx}`);
            const rKey = `ret_${String(rNo).trim().toLowerCase()}`;
            if (!seenReturnKeys.has(rKey)) {
              seenReturnKeys.add(rKey);
              const rDetails = Array.isArray(r.returnDetails)
                ? r.returnDetails
                : Array.isArray(r.salesReturnDetails)
                ? r.salesReturnDetails
                : Array.isArray(r.details)
                ? r.details
                : [];
              const retRecord: UnifiedTradeRecord = {
                ...normalizeSaleRecord({ ...item, ...r }),
                id: r.id || r.returnId || `${item.id}_ret_${rIdx}`,
                returnNo: rNo,
                salesInvoiceNo: item.salesInvoiceNo || item.invoiceNo || item.orderNo || "",
                invoiceNo: item.invoiceNo || item.salesInvoiceNo || "",
                orderNo: r.orderNo || item.orderNo || "",
                returnDate: r.returnDate || r.return_date || item.salesDate || moment().format("YYYY-MM-DD"),
                grandTotal: Number(r.returnGrandTotal ?? r.grandTotal ?? r.totalAmount ?? 0),
                refundAmount: Number(r.returnRefundAmount ?? r.refundAmount ?? r.returnGrandTotal ?? r.grandTotal ?? 0),
                totalAmount: Number(r.totalAmount ?? r.returnTotalAmount ?? r.returnGrandTotal ?? 0),
                returnDetails: rDetails,
                salesDetails: [],
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

    const isBackendGeneratedNo = (no?: string): boolean => {
      if (!no) return false;
      const clean = String(no).trim().toUpperCase();
      return (
        clean.length > 0 &&
        !clean.startsWith("SR-") &&
        !clean.startsWith("RET_") &&
        !clean.startsWith("RET-") &&
        !clean.startsWith("SR_")
      );
    };

    const addReturnRecord = (item: any, fallbackIdx: number) => {
      if (!item) return;
      const rNo = String(item.returnNo || item.return_no || item.salesReturnNo || item.id || `ret_idx_${fallbackIdx}`).trim();
      const rKey = `ret_${rNo.toLowerCase()}`;
      const saleAliases = getSaleAliases(item);
      const isBackend = isBackendGeneratedNo(rNo);

      // If this is synthetic, drop it if backend already has this return!
      if (!isBackend) {
        const hasBackend = saleAliases.some((a) => backendReturnAliases.has(a));
        if (hasBackend) {
          return;
        }
      }

      if (isBackend) {
        saleAliases.forEach((a) => backendReturnAliases.add(a));

        // If a synthetic SR- / RET- record was already added earlier for this sale, remove it!
        const existingSyntheticIdx = unifiedList.findIndex(
          (u) =>
            u.isReturnRecord &&
            !isBackendGeneratedNo(u.returnNo) &&
            getSaleAliases(u).some((a) => saleAliases.includes(a))
        );
        if (existingSyntheticIdx !== -1) {
          unifiedList.splice(existingSyntheticIdx, 1);
        }
      }

      if (!seenReturnKeys.has(rKey)) {
        seenReturnKeys.add(rKey);
        const explicitReturnDetails = [
          item.returnDetails,
          item.salesReturnDetails,
        ].find((lines) => Array.isArray(lines) && lines.length > 0);
        const hasSeparateSaleLines = [
          item.salesDetails,
          item.saleDetails,
        ].some((lines) => Array.isArray(lines) && lines.length > 0);
        const returnDetails =
          explicitReturnDetails ||
          (!hasSeparateSaleLines ? extractLineItems(item) : []);
        const normalized = normalizeSaleRecord(item) as UnifiedTradeRecord;
        normalized.isReturnRecord = true;
        normalized.hasReturn = true;
        if (rNo && !normalized.returnNo) {
          normalized.returnNo = rNo;
        }
        normalized.returnDetails = returnDetails;
        normalized.details = returnDetails;
        normalized.salesDetails = [];
        unifiedList.push(normalized);

        saleAliases.forEach((a) => returnedInvoices.add(a));
      }

      // Check if original sale already exists
      const saleAliasesForCheck = getSaleAliases(item);
      let existingIdx = -1;
      for (const a of saleAliasesForCheck) {
        if (aliasToSaleIdx.has(a)) {
          existingIdx = aliasToSaleIdx.get(a)!;
          break;
        }
      }

      if (existingIdx !== -1) {
        // Original sale already exists! DO NOT create a synthetic duplicate!
        unifiedList[existingIdx].hasReturn = true;
        saleAliasesForCheck.forEach((a) => aliasToSaleIdx.set(a, existingIdx));
      } else {
        // Only reconstruct fallback sale if original sale is completely missing
        const cleanOrd = getCleanOrderNo(
          item.orderNo || item.order_no,
          item.salesInvoiceNo || item.invoiceNo
        );
        addSaleRecord({
          ...item,
          id: item.saleId || item.id || cleanOrd,
          orderNo: cleanOrd,
          invoiceNo: item.invoiceNo || item.salesInvoiceNo || cleanOrd,
          salesInvoiceNo: item.salesInvoiceNo || item.invoiceNo || cleanOrd,
          salesDate: item.salesDate || item.returnDate || item.createdAt || moment().format("YYYY-MM-DD"),
          grandTotal: Number(item.grandTotal ?? item.returnGrandTotal ?? item.totalAmount ?? 0),
          paidAmount: Number(item.paidAmount ?? item.returnGrandTotal ?? item.grandTotal ?? 0),
          dueAmount: Number(item.dueAmount ?? 0),
          salesDetails: extractLineItems(item),
          details: extractLineItems(item),
          hasReturn: true,
          isReturnRecord: false,
        }, fallbackIdx);
      }
    };

    // 1. Process actual sales first
    sales.forEach((s: any, idx: number) => addSaleRecord(s, idx));

    // 2. Process combinedList (actual sales / returns from API)
    combinedList.forEach((d: any, idx: number) => {
      if (isReturnRecord(d)) {
        addReturnRecord(d, idx, false);
      } else {
        addSaleRecord(d, idx);
      }
    });

    // 3. Process backend returns first
    returns.forEach((r: any, idx: number) => addReturnRecord(r, idx));

    // 4. Financial transactions (carries authentic 16-digit backend return numbers like 2611...)
    finTxList.forEach((tx: any, idx: number) => {
      let invNo = "";
      let custName = "Customer";

      if (tx.notes) {
        const invMatch = tx.notes.match(/(?:invoice|from|customer)\s+([A-Za-z0-9_-]+)/i);
        if (invMatch && invMatch[1]) {
          invNo = invMatch[1].trim();
        }
        const custMatch = tx.notes.match(/\(([^)]+)\)/);
        if (custMatch && custMatch[1]) {
          custName = custMatch[1].trim();
        }
      }

      if (!invNo && tx.refNo && !tx.refNo.startsWith("261111") && !tx.refNo.startsWith("SR-")) {
        invNo = String(tx.refNo).trim();
      }
      if (!invNo && tx.refNo) {
        invNo = String(tx.refNo).trim();
      }
      if (!invNo && tx.billRef) {
        invNo = String(tx.billRef).trim();
      }

      if (!invNo) return;

      const cleanOrdNo = getCleanOrderNo(null, invNo);
      const finAliases = [
        cleanOrdNo ? `sale_ord_${cleanOrdNo.toLowerCase()}` : null,
        invNo ? `sale_inv_${invNo.toLowerCase()}` : null,
      ].filter(Boolean) as string[];

      const finSaleExists = finAliases.some((a) => aliasToSaleIdx.has(a));
      if (!finSaleExists) {
        addSaleRecord({
          id: `sale_fin_${tx.id || tx.billRef}`,
          orderNo: cleanOrdNo,
          invoiceNo: invNo,
          salesInvoiceNo: invNo,
          customerName: custName,
          customerId: 0,
          customerPhone: "",
          customerAddress: "",
          salesDate:
            tx.transactionDate ||
            (tx.createdDate ? String(tx.createdDate).split("T")[0] : moment().format("YYYY-MM-DD")),
          createdAt: tx.createdDate || tx.transactionDate,
          totalAmount: Number(tx.amount ?? 0),
          discount: 0,
          vat: 0,
          deliveryCharge: 0,
          grandTotal: Number(tx.amount ?? 0),
          paidAmount: Number(tx.amount ?? 0),
          dueAmount: 0,
          paymentType: String(tx.accountType || "CASH").toUpperCase(),
          status: "Returned",
          paymentStatus: "Returned",
          note: tx.notes || "Sales return refund",
          osType: "WEB",
          hasReturn: true,
          returnNo: tx.billRef,
          returnDate: tx.transactionDate,
          returnGrandTotal: Number(tx.amount || 0),
          returnRefundAmount: Number(tx.amount || 0),
          salesDetails: [],
          details: [],
          isReturnRecord: false,
        }, idx);
      }

      // Authentic return voucher with backend-generated return number (e.g. 2611...)
      const returnNo = tx.billRef || `SR-${invNo}`;
      const retKey = `ret_${String(returnNo).toLowerCase()}`;
      const resolvedOrdNo = cleanOrdNo;

      const reconstructedReturn: UnifiedTradeRecord = {
        id: `ret_fin_${tx.id || tx.billRef || idx}`,
        returnNo,
        orderNo: resolvedOrdNo,
        invoiceNo: invNo,
        salesInvoiceNo: invNo,
        customerName: custName,
        customerId: 0,
        customerPhone: "",
        customerAddress: "",
        returnDate:
          tx.transactionDate ||
          (tx.createdDate ? String(tx.createdDate).split("T")[0] : moment().format("YYYY-MM-DD")),
        createdAt: tx.createdDate || tx.transactionDate,
        grandTotal: Number(tx.amount || 0),
        refundAmount: Number(tx.amount || 0),
        totalAmount: Number(tx.amount || 0),
        paymentType: String(tx.accountType || "CASH").toUpperCase(),
        status: "Completed",
        note: tx.notes || "Sales return refund",
        remarks: tx.notes || "Sales return refund",
        reason: tx.notes || "Sales return refund",
        returnDetails: [],
        salesDetails: [],
        details: [],
        isReturnRecord: true,
        hasReturn: true,
      };

      // If a synthetic SR- or RET- record was already in unifiedList, replace it with this authentic backend return!
      const existingSyntheticIdx = unifiedList.findIndex(
        (u) =>
          u.isReturnRecord &&
          !isBackendGeneratedNo(u.returnNo) &&
          (getSaleAliases(u).some((a) => finAliases.includes(a)) ||
            (resolvedOrdNo && String(u.orderNo || "").toLowerCase() === resolvedOrdNo.toLowerCase()) ||
            (invNo && String(u.invoiceNo || u.salesInvoiceNo || "").toLowerCase() === invNo.toLowerCase()))
      );

      if (existingSyntheticIdx !== -1) {
        const existing = unifiedList[existingSyntheticIdx];
        if (Array.isArray(existing.returnDetails) && existing.returnDetails.length > 0) {
          reconstructedReturn.returnDetails = existing.returnDetails;
          reconstructedReturn.details = existing.returnDetails;
        }
        unifiedList[existingSyntheticIdx] = reconstructedReturn;
      } else if (!seenReturnKeys.has(retKey)) {
        seenReturnKeys.add(retKey);
        unifiedList.push(reconstructedReturn);
      }

      finAliases.forEach((a) => backendReturnAliases.add(a));
    });

    // 5. Ensure hasReturn is set on any sale record whose aliases match returnedInvoices
    unifiedList.forEach((rec) => {
      if (!rec.isReturnRecord) {
        const aliases = getSaleAliases(rec);
        if (aliases.some((a) => returnedInvoices.has(a))) {
          rec.hasReturn = true;
        }
      }
    });

    // Fallback: If sales array from /get-sales-and-return was empty, fetch from /get-sale-list
    if (sales.length === 0 && combinedList.length === 0) {
      try {
        const directSales = await fetchSalesList();
        directSales.forEach((s, idx) => addSaleRecord(s, idx));
      } catch (err) {
        console.warn("Fallback to fetchSalesList in fetchSalesAndReturnList failed:", err);
      }
    }

    return unifiedList;
  } catch (error) {
    console.error("Failed to fetch sales and return list:", error);
    return [];
  }
};

/**
 * Standardized hook for Sales List query
 * Shared across Sales page, Create Sale Form, and Customer Collection.
 */
export const useSalesQuery = <TData = SaleItem[]>(
  options?: Omit<UseQueryOptions<SaleItem[], Error, TData>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: [salesListQueryKey],
    queryFn: fetchSalesList,
    staleTime: 0,
    ...options,
  });
};

/**
 * Standardized hook for Combined Sales & Returns query
 * Shared across Unified Sales Hub, Sales Return list, and Return Forms.
 */
export const useSalesAndReturnsQuery = <TData = UnifiedTradeRecord[]>(
  options?: Omit<UseQueryOptions<UnifiedTradeRecord[], Error, TData>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: [salesAndReturnQueryKey],
    queryFn: fetchSalesAndReturnList,
    staleTime: 0,
    ...options,
  });
};

/**
 * Safely extracts set of returned invoice/order/challan/saleId keys.
 * Accurately indexes both return records and sales flagged with returns.
 */
export const extractReturnedSalesInvoiceKeysSet = (records: any[]): Set<string> => {
  const set = new Set<string>();
  if (!Array.isArray(records)) return set;

  records.forEach((item: any) => {
    const isRet = item?.isReturnRecord === true || isReturnRecord(item);
    const hasRet = Boolean(item?.hasReturn);

    if (isRet || hasRet) {
      if (item.salesInvoiceNo && item.salesInvoiceNo !== "-") {
        set.add(String(item.salesInvoiceNo).trim().toLowerCase());
      }
      if (item.invoiceNo && item.invoiceNo !== "-") {
        set.add(String(item.invoiceNo).trim().toLowerCase());
      }
      if (item.orderNo) {
        set.add(String(item.orderNo).trim().toLowerCase());
      }
      if (item.challanNo) {
        set.add(String(item.challanNo).trim().toLowerCase());
      }
      if (item.saleId) {
        set.add(String(item.saleId).trim().toLowerCase());
      }
      if (item.sale_id) {
        set.add(String(item.sale_id).trim().toLowerCase());
      }
      if (hasRet && item.id) {
        set.add(String(item.id).trim().toLowerCase());
      }
    }
  });

  return set;
};

/**
 * Mutation hook to verify if a sales order can be deleted (/check-sales-delete).
 */
export const useCheckSalesDeleteMutation = () => {
  return useMutation({
    mutationFn: (payload: CheckSalesDeletePayload) => checkSalesDelete(payload),
  });
};

/**
 * Mutation hook to delete a sales order (/delete-sales-order).
 * Automatically invalidates sales, returns, dues, product inventory, and cash balances on success.
 */
export const useDeleteSalesOrderMutation = (options?: {
  onSuccess?: (data: DeleteSalesOrderResponse) => void;
  onError?: (error: any) => void;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: DeleteSalesOrderPayload) => deleteSalesOrder(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [salesListQueryKey] });
      queryClient.invalidateQueries({ queryKey: [salesAndReturnQueryKey] });
      queryClient.invalidateQueries({ queryKey: [productListQueryKey] });
      queryClient.invalidateQueries({ queryKey: [customersDueQueryKey] });
      queryClient.invalidateQueries({ queryKey: [customerInvoicesDueQueryKey] });
      queryClient.invalidateQueries({ queryKey: [cashBalanceQueryKey] });
      queryClient.invalidateQueries({ queryKey: [dashboardQueryKey] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      options?.onError?.(error);
    },
  });
};

export {
  checkSalesDelete,
  deleteSalesOrder,
  validateCheckSalesDeleteResult,
};

export default useSalesQuery;
