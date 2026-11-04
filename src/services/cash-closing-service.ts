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

/**
 * Fetch cash reconciliation report / history
 */
export async function fetchCashClosingReport(params?: {
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
      const rawData = res.data as any;
      const rawHistory = Array.isArray(rawData.history)
        ? rawData.history
        : Array.isArray(rawData.data)
        ? rawData.data
        : Array.isArray(rawData.list)
        ? rawData.list
        : Array.isArray(rawData)
        ? rawData
        : [];

      const normalizedHistory = rawHistory.map((item: any, idx: number) => {
        const rawDate =
          item.closingDate ||
          item.closing_date ||
          item.date ||
          item.transactionDate ||
          item.transaction_date ||
          item.createdDate ||
          item.createdAt ||
          item.created_at ||
          item.addedDate ||
          item.added_date ||
          item.entryDate ||
          item.entry_date ||
          item.recordDate ||
          item.record_date ||
          item.closingDay ||
          item.closing_day ||
          item.day ||
          "";

        return {
          ...item,
          id: item.id ?? idx + 1,
          closingDate: rawDate ? String(rawDate) : "",
          openingCash: Number(item.openingCash ?? item.opening_cash ?? 0),
          todayDeposit: Number(item.todayDeposit ?? item.today_deposit ?? item.deposit ?? 0),
          todayExpense: Number(item.todayExpense ?? item.today_expense ?? item.expense ?? 0),
          expectedCash: Number(item.expectedCash ?? item.expected_cash ?? 0),
          countedCash: Number(item.countedCash ?? item.counted_cash ?? item.totalAmount ?? 0),
          differenceAmount: Number(item.differenceAmount ?? item.difference_amount ?? item.diff ?? 0),
          differenceReason: item.differenceReason || item.difference_reason || item.reason || "",
          remarks: item.remarks || item.note || "",
          status: item.status || "Closed",
        };
      });

      return {
        month: rawData.month || `${yearStr}-${monthStr}`,
        summary: rawData.summary || {
          matchedDays: normalizedHistory.filter((h: any) => Number(h.differenceAmount || 0) === 0).length,
          mismatchedDays: normalizedHistory.filter((h: any) => Number(h.differenceAmount || 0) !== 0).length,
          totalDiff: normalizedHistory.reduce((sum: number, h: any) => sum + Number(h.differenceAmount || 0), 0),
        },
        history: normalizedHistory,
      };
    }

    return null;
  } catch (error) {
    console.error("Error fetching cash closing report:", error);
    return null;
  }
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
