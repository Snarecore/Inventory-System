import moment from "moment";
import apiConfig from "@/config/api.json";
import { postData } from "@/services/api-service";
import { buildAccessUser } from "@/utils/access-user";
import type {
  CashClosingData,
  CashClosingResponse,
  CashClosingReportData,
  CashClosingReportResponse,
  InsertCashClosingPayload,
  InsertCashClosingResponse,
} from "@/types";

/**
 * Fetch daily cash closing details for a specified date (defaults to today)
 */
export async function fetchCashClosing(closingDate?: string): Promise<CashClosingData | null> {
  const dateStr = closingDate || moment().format("YYYY-MM-DD");
  const accessUser = buildAccessUser();

  try {
    const res = await postData<CashClosingResponse>({
      url: apiConfig.cashClosing.getCashClosingUrl,
      body: {
        accessUser,
        closingDate: dateStr,
      },
    });

    if (res?.data) {
      return res.data;
    }

    return null;
  } catch (error) {
    console.error("Error fetching cash closing data:", error);
    return null;
  }
}

async function fetchSingleMonthCashClosingReport(params?: {
  month?: string;
  year?: string;
  yearMonth?: string;
}): Promise<CashClosingReportData | null> {
  const accessUser = buildAccessUser();
  const currentMonth = moment().format("MM");
  const currentYear = moment().format("YYYY");

  const yearStr = params?.year || currentYear;
  const monthStr = String(params?.month || currentMonth).padStart(2, "0");
  const ym = params?.yearMonth || `${yearStr}${monthStr}`;

  try {
    const res = await postData<CashClosingReportResponse>({
      url: apiConfig.cashClosing.getCashClosingReportUrl,
      body: {
        accessUser,
        yearMonth: ym,
        month: monthStr,
        year: yearStr,
      },
    });

    if (res?.data) {
      const rawData = res.data;
      const rawHistory = Array.isArray(rawData.history) ? rawData.history : [];

      const normalizedHistory = rawHistory.map((item: any, idx: number) => ({
        ...item,
        id: item.id ?? idx + 1,
        date: item.date || item.closingDate || "",
        closingDate: item.date || item.closingDate || "",
        openingCash: Number(item.openingCash || 0),
        todayDeposit: Number(item.todayDeposit || 0),
        todayExpense: Number(item.todayExpense || 0),
        expectedCash: Number(item.expectedCash || 0),
        countedCash: Number(item.actualCash ?? item.countedCash ?? 0),
        differenceAmount: Number(item.difference ?? item.differenceAmount ?? 0),
        differenceReason: item.differenceReason || "",
        remarks: item.remarks || "",
        status: item.status || "Closed",
      }));

      return {
        ...rawData,
        history: normalizedHistory,
      };
    }

    return null;
  } catch (error) {
    console.error("Error fetching cash closing report:", error);
    return null;
  }
}

function summarizeCashClosingHistory(
  history: CashClosingData[],
  label: string
): CashClosingReportData {
  let matchedDays = 0;
  let mismatchedDays = 0;
  let totalDiff = 0;

  history.forEach((item) => {
    const diff = Number(item.differenceAmount ?? 0);
    if (diff === 0) matchedDays += 1;
    else mismatchedDays += 1;
    totalDiff += diff;
  });

  return {
    month: label,
    summary: { matchedDays, mismatchedDays, totalDiff },
    history,
  };
}

async function fetchCashClosingByDateRange(
  startDate?: string,
  endDate?: string
): Promise<CashClosingReportData> {
  const hasBounds = Boolean(startDate && endDate);
  const rangeEnd = hasBounds
    ? moment(endDate, "YYYY-MM-DD").startOf("month")
    : moment().startOf("month");
  const rawStart = hasBounds
    ? moment(startDate, "YYYY-MM-DD").startOf("month")
    : moment().subtract(11, "months").startOf("month");

  // Cap single batch to 36 months to prevent runaway requests on very wide custom spans
  const earliestAllowed = rangeEnd.clone().subtract(35, "months");
  const rangeStart = rawStart.isBefore(earliestAllowed)
    ? earliestAllowed
    : rawStart;

  const monthPairs: Array<{ year: string; month: string }> = [];
  const cursor = rangeStart.clone();
  while (cursor.isSameOrBefore(rangeEnd, "month")) {
    monthPairs.push({
      year: cursor.format("YYYY"),
      month: cursor.format("MM"),
    });
    cursor.add(1, "month");
  }

  const results = await Promise.all(
    monthPairs.map((pair) => fetchSingleMonthCashClosingReport(pair))
  );

  const byDateMap = new Map<string, CashClosingData>();
  results.forEach((res) => {
    const history = Array.isArray(res?.history) ? res.history : [];
    history.forEach((item) => {
      const key = item.closingDate || (item as any).date || String(item.id);
      if (key && !byDateMap.has(key)) {
        byDateMap.set(key, item);
      }
    });
  });

  let historyList = Array.from(byDateMap.values());
  if (hasBounds) {
    const startBoundary = moment(startDate).startOf("day");
    const endBoundary = moment(endDate).endOf("day");
    historyList = historyList.filter((item) => {
      const dStr = item.closingDate || (item as any).date;
      if (!dStr) return false;
      return moment(dStr).isBetween(startBoundary, endBoundary, undefined, "[]");
    });
  }

  historyList.sort((a, b) => {
    const dA = a.closingDate || (a as any).date || "";
    const dB = b.closingDate || (b as any).date || "";
    return dB.localeCompare(dA);
  });

  const label = hasBounds ? `${startDate} - ${endDate}` : "All Dates";
  return summarizeCashClosingHistory(historyList, label);
}

/**
 * Fetch cash reconciliation report / history (by month/year or inclusive startDate/endDate range)
 */
export async function fetchCashClosingReport(params?: {
  month?: string;
  year?: string;
  yearMonth?: string;
  startDate?: string;
  endDate?: string;
}): Promise<CashClosingReportData | null> {
  if (params?.startDate !== undefined || params?.endDate !== undefined) {
    return fetchCashClosingByDateRange(params.startDate, params.endDate);
  }
  if (params?.month === "ALL") {
    return fetchCashClosingYearReport(params?.year);
  }
  return fetchSingleMonthCashClosingReport(params);
}

/**
 * Fetches and aggregates monthly cash closing reports across an entire calendar year
 */
export async function fetchCashClosingYearReport(
  year?: string
): Promise<CashClosingReportData> {
  const targetYear = year || moment().format("YYYY");
  const now = moment();
  const maxMonth =
    targetYear === now.format("YYYY") ? Number(now.format("MM")) : 12;

  const months = Array.from({ length: maxMonth }, (_, i) =>
    String(i + 1).padStart(2, "0")
  );

  const results = await Promise.all(
    months.map((month) => fetchCashClosingReport({ month, year: targetYear }))
  );

  const byDateMap = new Map<string, CashClosingData>();
  results.forEach((res) => {
    const history = Array.isArray(res?.history) ? res.history : [];
    history.forEach((item) => {
      const key = item.closingDate || (item as any).date || String(item.id);
      if (key && !byDateMap.has(key)) {
        byDateMap.set(key, item);
      }
    });
  });

  const combinedHistory = Array.from(byDateMap.values()).sort((a, b) => {
    const dA = a.closingDate || (a as any).date || "";
    const dB = b.closingDate || (b as any).date || "";
    return dB.localeCompare(dA);
  });

  let matchedDays = 0;
  let mismatchedDays = 0;
  let totalDiff = 0;

  combinedHistory.forEach((item) => {
    const diff = Number(item.differenceAmount ?? 0);
    if (diff === 0) matchedDays += 1;
    else mismatchedDays += 1;
    totalDiff += diff;
  });

  return {
    month: `Full Year ${targetYear}`,
    summary: { matchedDays, mismatchedDays, totalDiff },
    history: combinedHistory,
  };
}

/**
 * Insert / Save Daily Cash Closing record
 */
export async function insertCashClosing(
  payload: InsertCashClosingPayload
): Promise<{ success: boolean; message: string; data?: CashClosingData | null }> {
  const accessUser = buildAccessUser();

  try {
    const res = await postData<InsertCashClosingResponse>({
      url: apiConfig.cashClosing.insertCashClosingUrl,
      body: {
        accessUser,
        ...payload,
      },
    });

    const isSuccess =
      res?.status === "Success" ||
      res?.status === "success" ||
      Boolean(res?.data?.id);

    return {
      success: isSuccess,
      message: res?.msg || (isSuccess ? "Cash closing saved successfully" : "Failed to save cash closing"),
      data: res?.data || null,
    };
  } catch (error: any) {
    console.error("Error saving cash closing:", error);
    return {
      success: false,
      message: error?.message || "An error occurred while saving cash closing",
      data: null,
    };
  }
}
