import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import moment from "moment";
import apiConfig from "@/config/api.json";
import { purchaseLedgerQueryKey } from "@/config/query-key";
import { postData } from "@/services/api-service";
import { buildAccessUser } from "@/utils/access-user";
import type {
  PurchaseLedgerEntry,
  PurchaseLedgerFilterParams,
  PurchaseLedgerStats,
  PurchaseLedgerBreakdownItem,
} from "@/types/purchase-ledger.types";

/**
 * Formats any date into strict API requirement format (DD-MM-YYYY)
 */
export const formatLedgerDate = (dateStr?: string, defaultDate: string = ""): string => {
  if (!dateStr || dateStr.trim() === "" || dateStr === "ALL") return defaultDate;
  const trimmed = dateStr.trim();
  if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) return trimmed;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split("-");
    return `${d}-${m}-${y}`;
  }
  const m = moment(trimmed);
  if (m.isValid()) return m.format("DD-MM-YYYY");
  return defaultDate;
};

/**
 * Checks whether backend ledger entries contain real data,
 * rather than an empty dummy opening balance record with 0 amounts.
 */
export const hasMeaningfulLedgerEntries = (entries: any[]): boolean => {
  if (!Array.isArray(entries) || entries.length === 0) return false;
  if (entries.length === 1) {
    const first = entries[0];
    const particulars = String(first.particulars || first.type || first.typeLabel || "").toLowerCase();
    const isOpening = particulars.includes("opening") || particulars.includes("প্রারম্ভিক");
    const debit = Number(first.debit ?? first.billAmount ?? 0);
    const credit = Number(first.credit ?? first.paymentAmount ?? 0);
    const balance = Number(first.balance ?? first.runningBalance ?? 0);
    if (isOpening && debit === 0 && credit === 0 && balance === 0) {
      return false;
    }
  }
  return true;
};

/**
 * Resolves the true supplierId from partyList, purchasesList, or supplier records
 */
export const resolveSupplierId = (
  supplierId?: string | number | null,
  supplierPhone?: string | null,
  supplierName?: string | null,
  purchasesList?: any[],
  partyList?: any[]
): string => {
  const phone = String(supplierPhone || "").replace(/[^0-9]/g, "");
  const shortPhone = phone.length >= 8 ? phone.slice(-8) : phone;
  const name = String(supplierName || "").trim().toLowerCase();
  const sId = String(supplierId || "").trim();

  // 1. Lookup in partyList first to get authentic database partyId
  let parties: any[] = [];
  if (Array.isArray(partyList)) {
    parties = partyList;
  } else if (partyList && typeof partyList === "object") {
    parties =
      partyList.partyList ||
      partyList.supplierList ||
      partyList.partyInfoList ||
      partyList.partiesList ||
      partyList.partyListDetails ||
      partyList.data ||
      [];
    if (!parties.length && partyList.data && typeof partyList.data === "object") {
      parties =
        partyList.data.partyList ||
        partyList.data.supplierList ||
        partyList.data.partyInfoList ||
        partyList.data.partiesList ||
        partyList.data.data ||
        [];
    }
  }

  if (Array.isArray(parties) && parties.length > 0) {
    const matched = parties.find((p) => {
      const pId = String(p.partyId || p.supplierId || p.id || "").trim();
      if (sId && sId !== "0" && sId !== "direct" && pId === sId) return true;

      const pPhone = String(p.phone || p.partyPhone || "").replace(/[^0-9]/g, "");
      const shortPPhone = pPhone.length >= 8 ? pPhone.slice(-8) : pPhone;
      if (shortPhone && shortPPhone && shortPhone === shortPPhone) return true;

      const pName = String(p.name || p.partyName || "").trim().toLowerCase();
      if (name && pName && (name === pName || (name !== "supplier" && pName.includes(name)))) {
        return true;
      }
      return false;
    });

    if (matched) {
      const pId = matched.partyId || matched.supplierId || matched.id;
      if (pId && String(pId) !== "0") return String(pId);
    }
  }

  // 2. Lookup in purchasesList
  if (Array.isArray(purchasesList) && purchasesList.length > 0) {
    const matched = purchasesList.find((p) => {
      const pId = String(p.supplierId || p.partyId || "").trim();
      if (sId && sId !== "0" && sId !== "direct" && pId === sId) return true;

      const pPhone = String(p.supplierPhone || p.phone || "").replace(/[^0-9]/g, "");
      const shortPPhone = pPhone.length >= 8 ? pPhone.slice(-8) : pPhone;
      if (shortPhone && shortPPhone && shortPhone === shortPPhone) return true;

      const pName = String(p.supplierName || p.name || "").trim().toLowerCase();
      if (name && pName && (name === pName || (name !== "supplier" && pName.includes(name)))) {
        return true;
      }
      return false;
    });
    if (matched && (matched.supplierId || matched.partyId) && String(matched.supplierId || matched.partyId) !== "0") {
      return String(matched.supplierId || matched.partyId);
    }
  }

  // 3. Fallback to supplierId if valid numeric ID
  if (sId && sId !== "0" && sId !== "direct" && !isNaN(Number(sId))) {
    return sId;
  }

  return sId && sId !== "0" ? sId : "";
};

/**
 * Normalizes purchase ledger response from the backend
 */
export const normalizePurchaseLedger = (raw: any): PurchaseLedgerEntry[] => {
  if (!raw) return [];

  const list: any[] = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.data)
    ? raw.data
    : Array.isArray(raw?.purchaseLedger)
    ? raw.purchaseLedger
    : Array.isArray(raw?.ledger)
    ? raw.ledger
    : Array.isArray(raw?.reportData)
    ? raw.reportData
    : [];

  return list.map((item: any) => {
    const debit = Number(item.debit ?? item.billAmount ?? item.purchaseAmount ?? 0);
    const credit = Number(item.credit ?? item.paymentAmount ?? item.paidAmount ?? 0);
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
 * Converts backend PurchaseLedgerEntries or client records into the exact breakdown representation:
 * SL | Date & Time | Type | Payment Method | Description | Bill / Purchase (BDT) | Payment / Return (BDT) | Balance (BDT)
 */
export const mapPurchaseLedgerToBreakdownEntries = (
  entries: PurchaseLedgerEntry[] | any[],
  purchasesList: any[] = [],
  payments: any[] = [],
  returnRecords: any[] = []
): PurchaseLedgerBreakdownItem[] => {
  if (!entries || entries.length === 0) return [];

  return entries.map((item: any, idx: number) => {
    const rawParticulars = String(
      item.particulars || item.typeLabel || item.type || item.description || "-"
    ).trim();
    const pLower = rawParticulars.toLowerCase();

    const isOpening = pLower.includes("opening") || pLower.includes("প্রারম্ভিক");
    const isReturn = pLower.includes("return") || pLower.includes("ফেরত");
    const isPayment =
      !isReturn &&
      (pLower.includes("payment") ||
        pLower.includes("paid") ||
        pLower.includes("পরিশোধ"));

    const debit = Number(item.debit || item.billAmount || 0);
    const credit = Number(item.credit || item.paymentAmount || 0);

    const cleanRef = String(item.refNo || "").replace(/^#+/, "").trim();
    const cleanOrder = String(item.orderNo || "").replace(/^#+/, "").trim();
    const validRef = cleanRef && cleanRef !== "-" ? cleanRef : "";
    const validOrder = cleanOrder && cleanOrder !== "-" ? cleanOrder : "";
    const targetRef = validRef || validOrder;

    // Look up matched purchase from purchasesList
    const matchedPurchase = !isOpening && !isReturn && !isPayment
      ? purchasesList.find((p) => {
          const pOrder = String(p.orderNo || p.invoiceNo || p.challanNo || "").replace(/^#+/, "").trim();
          const pVoucher = String(p.voucherNo || "").replace(/^#+/, "").trim();
          return (
            (pOrder && (pOrder === targetRef || cleanOrder === pOrder || cleanRef === pOrder)) ||
            (pVoucher && (pVoucher === targetRef || cleanRef === pVoucher))
          );
        })
      : undefined;

    const isExplicitCredit = pLower.includes("credit");
    const isExplicitCash = pLower.includes("cash");

    // A purchase record (not opening, return, or payment)
    const isPurchase =
      !isOpening &&
      !isReturn &&
      !isPayment &&
      (pLower.includes("purchase") || debit > 0);

    // 1. Partial: paid some cash, but due remaining on bill
    const isPartialPurchase = isPurchase && credit > 0 && debit > credit;

    // 2. Pure Credit Purchase: paid 0 at purchase time, full amount due
    const isPureCreditPurchase =
      isPurchase &&
      !isPartialPurchase &&
      (isExplicitCredit || (debit > 0 && credit === 0 && !isExplicitCash));

    // 3. Pure Cash Purchase: paid full amount at purchase time
    const isCashPurchase = isPurchase && !isPartialPurchase && !isPureCreditPurchase;

    // 1. Type
    let type = "Purchase";
    if (isOpening) type = "Opening Balance";
    else if (isReturn) type = "Return";
    else if (isPartialPurchase || isPureCreditPurchase) type = "Credit Purchase";
    else if (isCashPurchase) type = "Purchase";
    else if (isPayment) type = "Payment";
    else if (rawParticulars && rawParticulars !== "-") type = rawParticulars;

    // 2. Payment Method
    let paymentMethod = "-";
    if (isOpening) {
      paymentMethod = "-";
    } else if (isReturn) {
      paymentMethod = "Return";
    } else if (isPureCreditPurchase) {
      paymentMethod = "Credit";
    } else if (isPartialPurchase) {
      paymentMethod = "Partial";
    } else if (isCashPurchase) {
      paymentMethod = matchedPurchase?.paymentType || "Cash";
    } else if (isPayment) {
      const matchedPay = payments.find((p) => {
        const vNo = String(p.voucherNo || p.id || "");
        return vNo && cleanRef && (vNo === cleanRef || cleanRef.includes(vNo) || vNo.includes(cleanRef));
      });
      paymentMethod = matchedPay?.paymentMode || matchedPay?.paymentMethod || item.paymentMode || "Cash";
    }

    // 3. Date & Time formatting
    let dateTimeStr =
      item.dateTimeStr ||
      item.fullDateTimeStr ||
      item.formattedDate ||
      item.dateStr ||
      "";
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
    // Fallback time from matchedPurchase
    if (matchedPurchase && (!dateTimeStr || !dateTimeStr.includes(":"))) {
      const purchaseTimeStr = matchedPurchase.createdAt || matchedPurchase.purchaseDate;
      if (purchaseTimeStr) {
        const mPurTime = moment(purchaseTimeStr);
        if (mPurTime.isValid()) {
          const datePart = dateTimeStr && dateTimeStr !== "-" ? dateTimeStr : mPurTime.format("DD MMM, YYYY");
          dateTimeStr = `${datePart} ${mPurTime.format("hh:mm A")}`;
        }
      }
    }
    if (!dateTimeStr) dateTimeStr = "-";

    // 4. Description
    let description = item.description || "Purchase Bill";
    if (isOpening) {
      description = item.description || "Opening Balance";
    } else if (isReturn) {
      const products = Array.isArray(item.products) ? item.products : [];
      if (products.length > 0) {
        const pSummary = products
          .map((p: any) => `${p.productName || p.name} (x${p.quantity || p.qty || 1} ${p.unit || "Pcs"})`)
          .join(", ");
        description = targetRef ? `#${targetRef} | Ret: ${pSummary}` : `Ret: ${pSummary}`;
      } else {
        description = item.description || (targetRef ? `Return #${targetRef}` : "Purchase Return");
      }
    } else if (isPayment) {
      const matchedPay = payments.find((p) => {
        const vNo = String(p.voucherNo || p.id || "");
        return vNo && targetRef && (vNo === targetRef || targetRef.includes(vNo) || vNo.includes(targetRef));
      });
      if (matchedPay) {
        const vStr = `Voucher: #${matchedPay.voucherNo || targetRef}`;
        const settled = matchedPay.billsSummary && matchedPay.billsSummary !== "-"
          ? `Settled: #${matchedPay.billsSummary}`
          : "";
        description = [vStr, settled].filter(Boolean).join(" | ");
      } else {
        description = item.description || (targetRef ? `Voucher: #${targetRef}` : "Supplier Payment");
      }
    } else {
      // Purchase or Credit Purchase
      if (item.description && item.description !== "-" && item.description !== "Purchase Bill") {
        description = item.description;
      } else if (matchedPurchase) {
        const refPart = targetRef ? `#${targetRef}` : "";
        const cPart = matchedPurchase.challanNo && matchedPurchase.challanNo !== "-" ? `Challan: #${matchedPurchase.challanNo}` : "";
        description = [refPart, cPart].filter(Boolean).join(" | ") || refPart || "Purchase Bill";
      } else if (validRef) {
        description = `#${validRef}`;
      } else if (validOrder) {
        description = `#${validOrder}`;
      } else {
        description = isPureCreditPurchase || isPartialPurchase ? "Credit Purchase" : "Purchase Bill";
      }
      description = description.replace(/\s*\|\s*Order:\s*#-?/gi, "").trim();
    }

    // 5. Bill / Purchase (BDT)
    const billAmount = isOpening ? 0 : debit;

    // 6. Payment / Return (BDT)
    const paymentAmount = isOpening ? 0 : credit;

    // 7. Balance (BDT) - handles both backend balance and client-side runningBalance
    const balance =
      typeof item.balance === "number" && !isNaN(item.balance)
        ? item.balance
        : typeof item.runningBalance === "number" && !isNaN(item.runningBalance)
        ? item.runningBalance
        : Number(item.balance || item.runningBalance || 0);

    // Resolve product details if present on matched purchase or raw record
    const products = Array.isArray(item.products) && item.products.length > 0
      ? item.products
      : Array.isArray(matchedPurchase?.purchaseDetails)
      ? matchedPurchase.purchaseDetails
      : Array.isArray(matchedPurchase?.items)
      ? matchedPurchase.items
      : Array.isArray(matchedPurchase?.products)
      ? matchedPurchase.products
      : Array.isArray(item.rawRecord?.purchaseDetails)
      ? item.rawRecord.purchaseDetails
      : Array.isArray(item.rawRecord?.details)
      ? item.rawRecord.details
      : [];

    return {
      id: item.id || `${targetRef}_${idx}`,
      sl: idx + 1,
      date: item.date || item.dateStr || "",
      time: item.time || "",
      dateTimeStr,
      type,
      paymentMethod,
      description,
      billAmount,
      paymentAmount,
      balance,
      products,
      receiptData: item.receiptData || matchedPurchase?.receiptData,
      raw: item.raw || item.rawRecord || item,
    };
  });
};

/**
 * Computes summary KPI metrics from normalized purchase ledger entries
 */
export const computePurchaseLedgerStats = (
  entries: PurchaseLedgerEntry[] | PurchaseLedgerBreakdownItem[] | any[]
): PurchaseLedgerStats => {
  if (!entries || entries.length === 0) {
    return {
      openingBalance: 0,
      totalDebit: 0,
      totalCredit: 0,
      totalPurchases: 0,
      totalPaid: 0,
      finalBalance: 0,
      entryCount: 0,
    };
  }

  let totalDebit = 0;
  let totalCredit = 0;
  let totalPurchases = 0;
  let totalPaid = 0;

  entries.forEach((e: any) => {
    const isOpening = String(e.particulars || e.type || "").toLowerCase().includes("opening");
    if (!isOpening) {
      const b = Number(e.billAmount ?? e.debit ?? 0);
      const p = Number(e.paymentAmount ?? e.credit ?? 0);
      totalPurchases += b;
      totalPaid += p;
      totalDebit += Number(e.debit ?? b);
      totalCredit += Number(e.credit ?? p);
    }
  });

  const lastEntry = entries[entries.length - 1];
  const firstEntry = entries[0];
  const isFirstOpening = String(firstEntry?.particulars || firstEntry?.type || "").toLowerCase().includes("opening");

  let openingBalance = 0;
  if (isFirstOpening) {
    openingBalance = Number(firstEntry.balance ?? (firstEntry.debit - firstEntry.credit) ?? 0);
  } else if (firstEntry) {
    openingBalance =
      (Number(firstEntry.balance) || 0) -
      (Number(firstEntry.billAmount ?? firstEntry.debit) || 0) +
      (Number(firstEntry.paymentAmount ?? firstEntry.credit) || 0);
  }

  return {
    openingBalance,
    totalDebit: Number(totalDebit.toFixed(2)),
    totalCredit: Number(totalCredit.toFixed(2)),
    totalPurchases: Number(totalPurchases.toFixed(2)),
    totalPaid: Number(totalPaid.toFixed(2)),
    finalBalance: Number((lastEntry?.balance ?? 0).toFixed(2)),
    entryCount: entries.length,
  };
};

/**
 * Fetcher function for purchase ledger via POST /purchase-ledger
 */
export const fetchPurchaseLedger = async (
  params: PurchaseLedgerFilterParams
): Promise<PurchaseLedgerEntry[]> => {
  const resolvedId = resolveSupplierId(
    params.supplierId,
    params.supplierPhone,
    params.supplierName,
    params.purchasesList,
    params.rawPartyData
  );

  const phone = params.supplierPhone ? String(params.supplierPhone).trim() : "";

  if (!resolvedId && !phone) {
    return [];
  }

  // Strict DD-MM-YYYY dates required by Spring Boot PostgreSQL query
  const startDate = formatLedgerDate(params.startDate, "01-01-2020");
  const endDate = formatLedgerDate(params.endDate, moment().format("DD-MM-YYYY"));

  const numId =
    resolvedId && !isNaN(Number(resolvedId)) && Number(resolvedId) > 0
      ? parseInt(String(resolvedId), 10)
      : undefined;

  const payload: any = {
    accessUser: buildAccessUser(),
    customerId: numId !== undefined ? numId : resolvedId || phone,
    supplierId: numId !== undefined ? numId : resolvedId || phone,
    partyId: numId !== undefined ? numId : resolvedId || phone,
    startDate,
    endDate,
  };

  try {
    const endpoint = (apiConfig.payment as any)?.purchaseLedgerUrl || "purchase-ledger";
    const res: any = await postData({
      url: endpoint,
      body: payload,
    });

    return normalizePurchaseLedger(res);
  } catch (err) {
    console.error("Failed to fetch purchase ledger:", err);
    return [];
  }
};

/**
 * TanStack Query Hook for Purchase Ledger
 */
export const usePurchaseLedgerQuery = (
  params: PurchaseLedgerFilterParams,
  options?: Omit<UseQueryOptions<PurchaseLedgerEntry[]>, "queryKey" | "queryFn">
) => {
  const resolvedId = resolveSupplierId(
    params.supplierId,
    params.supplierPhone,
    params.supplierName,
    params.purchasesList,
    params.rawPartyData
  );

  const queryKey = [
    purchaseLedgerQueryKey,
    resolvedId || String(params.supplierPhone || ""),
    formatLedgerDate(params.startDate, "01-01-2020"),
    formatLedgerDate(params.endDate, moment().format("DD-MM-YYYY")),
  ];

  const isEnabled = Boolean(resolvedId || params.supplierPhone);

  return useQuery({
    queryKey,
    queryFn: () => fetchPurchaseLedger({ ...params, supplierId: resolvedId }),
    enabled: isEnabled && (options?.enabled ?? true),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    ...options,
  });
};

export default usePurchaseLedgerQuery;
