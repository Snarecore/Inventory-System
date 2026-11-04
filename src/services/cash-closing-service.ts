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
      return res.data;
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
