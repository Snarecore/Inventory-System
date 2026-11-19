import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import moment from "moment";
import apiConfig from "@/config/api.json";
import { customerLedgerQueryKey } from "@/config/query-key";
import { postData } from "@/services/api-service";
import { buildAccessUser } from "@/utils/access-user";
import type {
  CustomerLedgerEntry,
  CustomerLedgerFilterParams,
  CustomerLedgerStats,
  CustomerLedgerBreakdownItem,
} from "@/types/customer-ledger.types";

/**
 * Formats any date into strict API requirement format (DD-MM-YYYY)
 */
export const formatLedgerDate = (dateStr?: string, defaultDate: string = ""): string => {
  if (!dateStr || dateStr.trim() === "" || dateStr === "ALL") return defaultDate;
  const trimmed = dateStr.trim();
  // Already in DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) return trimmed;
  // In ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split("-");
    return `${d}-${m}-${y}`;
  }
  const m = moment(trimmed);
  if (m.isValid()) return m.format("DD-MM-YYYY");
  return defaultDate;
};

/**
 * Resolves the true customerId from customer records, salesList, or partyList
 */
export const resolveCustomerId = (
  customerId?: string | number | null,
  customerPhone?: string | null,
  customerName?: string | null,
  salesList?: any[],
  partyList?: any[]
): string => {
  const cId = String(customerId || "").trim();
  if (cId && cId !== "0" && cId !== "walkin" && !isNaN(Number(cId))) {
    return cId;
  }

  const phone = String(customerPhone || "").replace(/[^0-9]/g, "");
  const name = String(customerName || "").trim().toLowerCase();

  // 1. Lookup in salesList
  if (Array.isArray(salesList) && salesList.length > 0) {
    const matched = salesList.find((s) => {
      const sPhone = String(s.customerPhone || "").replace(/[^0-9]/g, "");
      const sName = String(s.customerName || "").trim().toLowerCase();
      return (
        (phone && sPhone && (phone.endsWith(sPhone) || sPhone.endsWith(phone))) ||
        (name && sName && name === sName)
      );
    });
    if (matched && matched.customerId && String(matched.customerId) !== "0") {
      return String(matched.customerId);
    }
  }

  // 2. Lookup in partyList
  let parties: any[] = [];
  if (Array.isArray(partyList)) parties = partyList;
  else if (partyList && typeof partyList === "object") {
    parties = partyList.partyList || partyList.customerList || partyList.data || [];
  }
  if (Array.isArray(parties) && parties.length > 0) {
    const matched = parties.find((p) => {
      const pPhone = String(p.phone || "").replace(/[^0-9]/g, "");
      const pName = String(p.name || "").trim().toLowerCase();
      return (
        (phone && pPhone && (phone.endsWith(pPhone) || pPhone.endsWith(phone))) ||
        (name && pName && name === pName)
      );
    });
    if (matched) {
      const pId = matched.partyId || matched.customerId || matched.id;
      if (pId && String(pId) !== "0") return String(pId);
    }
  }

  return cId && cId !== "0" ? cId : "";
};

/**
 * Normalizes customer ledger response from the backend
 */
export const normalizeCustomerLedger = (raw: any): CustomerLedgerEntry[] => {
  if (!raw) return [];

  const list: any[] = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.data)
    ? raw.data
    : Array.isArray(raw?.customerLedger)
    ? raw.customerLedger
    : Array.isArray(raw?.ledger)
    ? raw.ledger
    : Array.isArray(raw?.reportData)
    ? raw.reportData
    : [];

  return list.map((item: any) => {
    const debit = Number(item.debit ?? item.salesAmount ?? 0);
    const credit = Number(item.credit ?? item.collectionAmount ?? item.paidAmount ?? 0);
    const balance = Number(item.balance ?? item.runningBalance ?? 0);

    return {
      date: String(item.date || "").trim(),
      time: String(item.time || "").trim(),
      particulars: String(item.particulars || item.description || item.type || "-").trim(),
      refNo: String(item.refNo ?? item.ref_no ?? item.referenceNo ?? "-").trim(),
      orderNo: String(item.orderNo ?? item.order_no ?? item.invoiceNo ?? "-").trim(),
      debit,
      credit,
      balance,
      products: Array.isArray(item.products) ? item.products : [],
      raw: item,
    };
  });
};

/**
 * Converts backend CustomerLedgerEntries into the exact breakdown representation:
 * SL | Date & Time | Type | Collection Method | Description / Settled Bills | Sales (BDT) | Collection (BDT) | Balance (BDT)
 */
export const mapLedgerToBreakdownEntries = (
  entries: CustomerLedgerEntry[] | any[],
  salesList: any[] = [],
  collections: any[] = []
): CustomerLedgerBreakdownItem[] => {
  if (!entries || entries.length === 0) return [];

  let running = 0;

  return entries.map((item: any, idx: number) => {
    const rawParticulars = String(
      item.particulars || item.typeLabel || item.type || item.description || "-"
    ).trim();
    const pLower = rawParticulars.toLowerCase();

    const isOpening = pLower.includes("opening") || pLower.includes("প্রারম্ভিক");
    const isReturn = pLower.includes("return") || pLower.includes("ফেরত");
    const isCollection = !isReturn && (pLower.includes("collection") || pLower.includes("received") || pLower.includes("আদায়"));

    const debit = Number(item.debit || 0);
    const credit = Number(item.credit || 0);

    const cleanRef = String(item.refNo || "").replace(/^#+/, "").trim();
    const cleanOrder = String(item.orderNo || "").replace(/^#+/, "").trim();
    const targetRef = cleanRef || cleanOrder;

    // Look up matched sale from salesList
    const matchedSale = !isOpening && !isReturn && !isCollection
      ? salesList.find((s) => {
          const sOrder = String(s.orderNo || s.invoiceNo || "").replace(/^#+/, "").trim();
          const sVoucher = String(s.voucherNo || "").replace(/^#+/, "").trim();
          return (
            (sOrder && (sOrder === targetRef || cleanOrder === sOrder || cleanRef === sOrder)) ||
            (sVoucher && (sVoucher === targetRef || cleanRef === sVoucher))
          );
        })
      : undefined;

    const isExplicitCredit = pLower.includes("credit");
    const isExplicitCash = pLower.includes("cash");

    // A sale record (not opening, return, or collection)
    const isSale = !isOpening && !isReturn && !isCollection && (
      pLower.includes("sale") || debit > 0
    );

    // 1. Partial: customer paid some cash, but has due remaining at POS
    const isPartialSale = isSale && credit > 0 && debit > credit;

    // 2. Pure Credit Sale: customer paid 0 at POS, full amount is due
    const isPureCreditSale = isSale && !isPartialSale && (
      isExplicitCredit || (debit > 0 && credit === 0 && !isExplicitCash)
    );

    // 3. Pure Cash Sale: customer paid full amount at POS
    const isCashSale = isSale && !isPartialSale && !isPureCreditSale;

    // 1. Type
    let type = "Sale";
    if (isOpening) type = "Opening Balance";
    else if (isReturn) type = "Return";
    else if (isPartialSale || isPureCreditSale) type = "Credit Sale";
    else if (isCashSale) type = "Sale";
    else if (isCollection) type = "Collection";
    else if (rawParticulars && rawParticulars !== "-") type = rawParticulars;

    // 2. Collection Method
    let collectionMethod = "-";
    if (isOpening) {
      collectionMethod = "-";
    } else if (isReturn) {
      collectionMethod = "Return";
    } else if (isPureCreditSale) {
      collectionMethod = "Credit";
    } else if (isPartialSale) {
      collectionMethod = "Partial";
    } else if (isCashSale) {
      collectionMethod = "Cash";
    } else if (isCollection) {
      const matchedCol = collections.find((c) => {
        const vNo = String(c.voucherNo || c.id || "");
        return vNo && cleanRef && (vNo === cleanRef || cleanRef.includes(vNo) || vNo.includes(cleanRef));
      });
      collectionMethod = matchedCol?.paymentMethod || matchedCol?.paymentMode || "Cash";
    }

    // 3. Date & Time formatting (e.g. "19 Nov, 2026 11:20 AM" or "01 Nov, 2026")
    let dateTimeStr = item.dateTimeStr || item.fullDateTimeStr || item.formattedDate || "";
    if (!dateTimeStr && item.date) {
      const mDate = moment(item.date, ["DD-MM-YYYY", "YYYY-MM-DD", "DD/MM/YYYY"]);
      const dateFormatted = mDate.isValid() ? mDate.format("DD MMM, YYYY") : item.date;
      let timeFormatted = "";
      if (item.time && !item.time.includes("12:00:00 AM") && !item.time.includes("00:00:00")) {
        const mTime = moment(item.time, ["hh:mm:ss A", "HH:mm:ss", "hh:mm A"]);
        timeFormatted = mTime.isValid() ? mTime.format("hh:mm A") : item.time;
      }
      dateTimeStr = timeFormatted ? `${dateFormatted} ${timeFormatted}` : dateFormatted;
    }
    // Fallback time from matchedSale if item.time was empty/midnight
    if (matchedSale && (!dateTimeStr || !dateTimeStr.includes(":"))) {
      const saleTimeStr = matchedSale.createdAt || matchedSale.salesDate;
      if (saleTimeStr) {
        const mSaleTime = moment(saleTimeStr);
        if (mSaleTime.isValid()) {
          const datePart = dateTimeStr && dateTimeStr !== "-" ? dateTimeStr : mSaleTime.format("DD MMM, YYYY");
          dateTimeStr = `${datePart} ${mSaleTime.format("hh:mm A")}`;
        }
      }
    }
    if (!dateTimeStr) dateTimeStr = "-";

    // 4. Description / Settled Bills
    let description = "Opening Balance";

    if (isOpening) {
      description = "Opening Balance";
    } else if (isReturn) {
      const products = Array.isArray(item.products) ? item.products : [];
      if (products.length > 0) {
        const pSummary = products
          .map((p: any) => `${p.productName || p.name} (x${p.quantity || p.qty || 1} ${p.unit || "Pcs"})`)
          .join(", ");
        description = targetRef ? `#${targetRef} | Ret: ${pSummary}` : `Ret: ${pSummary}`;
      } else {
        if (matchedSale?.returnedProducts) {
          description = `#${targetRef} | Ret: ${matchedSale.returnedProducts}`;
        } else {
          description = targetRef ? `#${targetRef}` : "Sales Return";
        }
      }
    } else if (isCollection) {
      const matchedCol = collections.find((c) => {
        const vNo = String(c.voucherNo || c.id || "");
        return vNo && targetRef && (vNo === targetRef || targetRef.includes(vNo) || vNo.includes(targetRef));
      });
      if (matchedCol) {
        const vStr = `Voucher: #${matchedCol.voucherNo || targetRef}`;
        const settled =
          matchedCol.settledInvoices && matchedCol.settledInvoices.length > 0
            ? `Settled: #${matchedCol.settledInvoices.join(", #")}`
            : matchedCol.orderNo
            ? `Settled: #${matchedCol.orderNo}`
            : "";
        description = [vStr, settled].filter(Boolean).join(" | ");
      } else {
        description = targetRef ? `Voucher: #${targetRef}` : "Collection Received";
      }
    } else {
      // Sale or Credit Sale
      if (matchedSale) {
        const refPart = targetRef ? `#${targetRef}` : "";
        const vPart = matchedSale.voucherNo ? `Voucher: #${matchedSale.voucherNo}` : "";
        description = [refPart, vPart].filter(Boolean).join(" | ") || refPart || "Sale";
      } else if (cleanRef && cleanOrder && cleanRef !== cleanOrder) {
        description = `#${cleanRef} | Order: #${cleanOrder}`;
      } else if (targetRef && targetRef !== "-") {
        description = `#${targetRef}`;
      } else {
        description = isPureCreditSale || isPartialSale ? "Credit Sale" : "Sale";
      }
    }

    // 5. Sales (BDT) - Directly from API Debit
    const salesAmount = isOpening ? 0 : debit;

    // 6. Collection (BDT) - Directly from API Credit
    const collectionAmount = isOpening ? 0 : credit;

    // 7. Balance (BDT) - Directly from API Balance
    const balance = typeof item.balance === "number" && !isNaN(item.balance)
      ? item.balance
      : Number(item.balance || 0);

    return {
      id: item.id || `${targetRef}_${idx}`,
      sl: idx + 1,
      date: item.date || "",
      time: item.time || "",
      dateTimeStr,
      type,
      collectionMethod,
      description,
      salesAmount,
      collectionAmount,
      balance,
      products: Array.isArray(item.products) ? item.products : [],
      raw: item,
    };
  });
};

/**
 * Computes summary KPI metrics from normalized customer ledger entries
 */
export const computeCustomerLedgerStats = (
  entries: CustomerLedgerEntry[] | CustomerLedgerBreakdownItem[] | any[]
): CustomerLedgerStats => {
  if (!entries || entries.length === 0) {
    return {
      openingBalance: 0,
      totalDebit: 0,
      totalCredit: 0,
      totalSales: 0,
      totalCollected: 0,
      finalBalance: 0,
      entryCount: 0,
    };
  }

  let totalDebit = 0;
  let totalCredit = 0;
  let totalSales = 0;
  let totalCollected = 0;

  entries.forEach((e: any) => {
    const isOpening = String(e.particulars || e.type || "").toLowerCase().includes("opening");
    if (!isOpening) {
      const s = Number(e.salesAmount ?? e.debit ?? 0);
      const c = Number(e.collectionAmount ?? e.credit ?? 0);
      totalSales += s;
      totalCollected += c;
      totalDebit += Number(e.debit ?? s);
      totalCredit += Number(e.credit ?? c);
    }
  });

  const lastEntry = entries[entries.length - 1];
  const firstEntry = entries[0];
  const isFirstOpening = String(firstEntry?.particulars || firstEntry?.type || "").toLowerCase().includes("opening");

  return {
    openingBalance: isFirstOpening ? firstEntry.balance || firstEntry.debit - firstEntry.credit : 0,
    totalDebit: Number(totalDebit.toFixed(2)),
    totalCredit: Number(totalCredit.toFixed(2)),
    totalSales: Number(totalSales.toFixed(2)),
    totalCollected: Number(totalCollected.toFixed(2)),
    finalBalance: Number((lastEntry?.balance ?? 0).toFixed(2)),
    entryCount: entries.length,
  };
};

/**
 * Fetcher function for customer ledger via POST /customer-ledger
 */
export const fetchCustomerLedger = async (
  params: CustomerLedgerFilterParams
): Promise<CustomerLedgerEntry[]> => {
  const resolvedId = resolveCustomerId(
    params.customerId,
    params.customerPhone,
    params.customerName,
    params.salesList,
    params.rawPartyData
  );

  const phone = params.customerPhone ? String(params.customerPhone).trim() : "";

  if (!resolvedId && !phone) {
    return [];
  }

  // Strict DD-MM-YYYY dates required by Spring Boot PostgreSQL query
  const startDate = formatLedgerDate(params.startDate, "01-01-2020");
  const endDate = formatLedgerDate(params.endDate, moment().format("DD-MM-YYYY"));

  const payload: any = {
    accessUser: buildAccessUser(),
    customerId: resolvedId || phone,
    startDate,
    endDate,
  };

  try {
    const endpoint = (apiConfig.collection as any)?.customerLedgerUrl || "customer-ledger";
    const res: any = await postData({
      url: endpoint,
      body: payload,
    });

    return normalizeCustomerLedger(res);
  } catch (err) {
    console.error("Failed to fetch customer ledger:", err);
    return [];
  }
};

/**
 * TanStack Query Hook for Customer Ledger
 */
export const useCustomerLedgerQuery = (
  params: CustomerLedgerFilterParams,
  options?: Omit<UseQueryOptions<CustomerLedgerEntry[]>, "queryKey" | "queryFn">
) => {
  const resolvedId = resolveCustomerId(
    params.customerId,
    params.customerPhone,
    params.customerName,
    params.salesList,
    params.rawPartyData
  );

  const queryKey = [
    customerLedgerQueryKey,
    resolvedId || String(params.customerPhone || ""),
    formatLedgerDate(params.startDate, "01-01-2020"),
    formatLedgerDate(params.endDate, moment().format("DD-MM-YYYY")),
  ];

  const isEnabled = Boolean(resolvedId || params.customerPhone);

  return useQuery({
    queryKey,
    queryFn: () => fetchCustomerLedger({ ...params, customerId: resolvedId }),
    enabled: isEnabled && (options?.enabled ?? true),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    ...options,
  });
};

export default useCustomerLedgerQuery;
