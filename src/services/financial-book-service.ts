import moment from "moment";
import apiConfig from "@/config/api.json";
import { buildAccessUser } from "@/utils/access-user";
import { getStoredToken } from "@/utils/auth-storage";

export type FinancialBookType = "cash" | "bank" | "mfs";

export interface FinancialBookParams {
  orgId?: number;
  branchId?: number;
  startDate?: string;
  endDate?: string;
  yearMonth?: string;
  lang?: "bn" | "en";
  size?: number;
  format?: "pdf" | "csv" | string;
}

const rawApiUrl = import.meta.env.VITE_API_BASE_URL || "";
const apiUrl = rawApiUrl.endsWith("/") ? rawApiUrl : `${rawApiUrl}/`;

const ENDPOINT_MAP: Record<FinancialBookType, string> = {
  cash: apiConfig.finance.getCashBookUrl,
  bank: apiConfig.finance.getBankBookUrl,
  mfs: apiConfig.finance.getMfsBookUrl,
};

export const BOOK_TITLES: Record<FinancialBookType, { bn: string; en: string }> = {
  cash: { bn: "ক্যাশ বুক", en: "Cash Book" },
  bank: { bn: "ব্যাংক বুক", en: "Bank Book" },
  mfs: { bn: "MFS বুক", en: "MFS Book" },
};

/** Build full request URL with query parameters strictly according to backend specs:
 * GET {BASE_URL}/get-cash-book?orgId=&branchId=&yearMonth=YYYYMM&lang=bn|en&size=20
 * GET {BASE_URL}/get-cash-book?orgId=&branchId=&yearMonth=YYYYMM&lang=bn|en&format=pdf
 * GET {BASE_URL}/get-cash-book?orgId=&branchId=&yearMonth=YYYYMM&format=csv
 */
export function buildFinancialBookUrl(
  type: FinancialBookType,
  params?: FinancialBookParams
): string {
  const access = buildAccessUser();
  const endpoint = ENDPOINT_MAP[type] || ENDPOINT_MAP.cash;
  const baseUrl = apiUrl.endsWith("/") ? apiUrl : `${apiUrl}/`;
  const urlObj = new URL(`${baseUrl}${endpoint.replace(/^\/+/, "")}`);

  const orgId = params?.orgId ?? access.orgId;
  const branchId = params?.branchId ?? access.branchId;

  if (orgId !== undefined && orgId !== null) {
    urlObj.searchParams.set("orgId", String(orgId));
  }
  if (branchId !== undefined && branchId !== null) {
    urlObj.searchParams.set("branchId", String(branchId));
  }
  if (params?.startDate) urlObj.searchParams.set("startDate", params.startDate);
  if (params?.endDate) urlObj.searchParams.set("endDate", params.endDate);
  if (params?.yearMonth) {
    urlObj.searchParams.set("yearMonth", params.yearMonth);
  } else if (!params?.startDate && !params?.endDate) {
    urlObj.searchParams.set("yearMonth", moment().format("YYYYMM"));
  }

  if (params?.lang) {
    urlObj.searchParams.set("lang", params.lang);
  }

  if (params?.format) {
    urlObj.searchParams.set("format", params.format);
  } else {
    urlObj.searchParams.set("size", String(params?.size ?? 20));
  }

  return urlObj.toString();
}

/** Fetch book HTML from API and prepare it for sandboxed iframe */
export async function fetchFinancialBookHtml(
  type: FinancialBookType,
  params?: FinancialBookParams,
  overrideUrl?: string
): Promise<{ html: string; targetUrl: string }> {
  let targetUrl: string;
  if (overrideUrl) {
    try {
      const parsed = new URL(overrideUrl);
      if (!parsed.searchParams.has("size")) {
        parsed.searchParams.set("size", String(params?.size ?? 20));
      }
      if (params?.lang && !parsed.searchParams.has("lang")) {
        parsed.searchParams.set("lang", params.lang);
      }
      targetUrl = parsed.toString();
    } catch (_) {
      targetUrl = overrideUrl;
    }
  } else {
    targetUrl = buildFinancialBookUrl(type, { size: 20, ...params });
  }
  const token = getStoredToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(targetUrl, {
    method: "GET",
    headers,
    cache: "no-cache",
  });

  if (!res.ok) {
    throw new Error(`Failed to load report (${res.status}): ${res.statusText}`);
  }

  let html = await res.text();

  // Navigation shim, no-scrollbar style, and height-sync for srcdoc iframe
  const shim = `
<style id="cb-no-scrollbar">
html, body {
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
}
::-webkit-scrollbar {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
}
body {
  border: none !important;
  outline: none !important;
}
</style>
<script>
window.__cbCurrentUrl = ${JSON.stringify(targetUrl)};
Object.defineProperty(window, '__cbNav', {
  set: function(val) {
    try {
      window.parent.postMessage({ type: 'CASH_BOI_REPORT_NAVIGATE', url: String(val) }, '*');
    } catch(e) {
      console.error(e);
    }
  }
});

function postDocHeight() {
  try {
    var body = document.body;
    var html = document.documentElement;
    var height = Math.max(
      body ? body.scrollHeight : 0,
      body ? body.offsetHeight : 0,
      html ? html.clientHeight : 0,
      html ? html.scrollHeight : 0,
      html ? html.offsetHeight : 0
    );
    if (height > 200) {
      window.parent.postMessage({ type: 'CASH_BOI_REPORT_HEIGHT', height: height }, '*');
    }
  } catch(e) {}
}

window.addEventListener('load', postDocHeight);
window.addEventListener('resize', postDocHeight);
document.addEventListener('DOMContentLoaded', postDocHeight);
if (window.ResizeObserver && document.body) {
  try {
    new ResizeObserver(postDocHeight).observe(document.body);
  } catch(e) {}
}
setTimeout(postDocHeight, 100);
setTimeout(postDocHeight, 500);
setTimeout(postDocHeight, 1500);
</script>
`;

  if (html.includes("<head>")) {
    html = html.replace("<head>", `<head>${shim}`);
  } else {
    html = `${shim}${html}`;
  }

  // Intercept navigation to prevent X-Frame-Options blocking
  html = html.replace(/location\.href\s*=/g, "window.__cbNav=");
  html = html.replace(/new URL\(location\.href\)/g, "new URL(window.__cbCurrentUrl)");

  // Replace 'বই' with 'বুক' in HTML content
  html = html.replace(/MFS ক্যাশ বই/g, "MFS ক্যাশ বুক");
  html = html.replace(/ক্যাশ বই/g, "ক্যাশ বুক");
  html = html.replace(/ব্যাংক বই/g, "ব্যাংক বুক");
  html = html.replace(/MFS বই/g, "MFS বুক");

  return { html, targetUrl };
}

/** Download report directly as PDF or CSV using backend API's format parameter:
 * - PDF: format=pdf&lang=bn|en&yearMonth=YYYYMM
 * - CSV: format=csv&yearMonth=YYYYMM
 */
export async function downloadFinancialBookFile(
  type: FinancialBookType,
  format: "pdf" | "csv",
  params?: FinancialBookParams,
  overrideUrl?: string
): Promise<void> {
  let targetUrl: string;
  if (overrideUrl) {
    const urlObj = new URL(overrideUrl);
    urlObj.searchParams.set("format", format);
    if (format === "pdf" && params?.lang) {
      urlObj.searchParams.set("lang", params.lang);
    }
    urlObj.searchParams.delete("size");
    targetUrl = urlObj.toString();
  } else {
    targetUrl = buildFinancialBookUrl(type, { ...params, format });
  }

  try {
    const token = getStoredToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(targetUrl, {
      method: "GET",
      headers,
    });

    if (!res.ok) {
      throw new Error(`Failed to download ${format.toUpperCase()} (${res.status}): ${res.statusText}`);
    }

    let filename = `${type}-book-${params?.yearMonth || moment().format("YYYYMM")}.${format}`;
    const disposition = res.headers.get("content-disposition");
    if (disposition && disposition.includes("filename=")) {
      const match = disposition.match(/filename="?([^";]+)"?/i);
      if (match && match[1]) filename = match[1];
    }

    const blob = await res.blob();
    const mimeType = format === "pdf" ? "application/pdf" : "text/csv;charset=utf-8;";
    const fileBlob = new Blob([blob], { type: mimeType });
    const blobUrl = window.URL.createObjectURL(fileBlob);

    const a = document.createElement("a");
    a.style.position = "fixed";
    a.style.left = "-9999px";
    a.style.top = "-9999px";
    a.style.opacity = "0";
    a.href = blobUrl;
    a.setAttribute("download", filename);
    document.body.appendChild(a);
    a.click();

    // Preserve blobUrl in memory for 60 seconds so browser download manager can save to disk
    setTimeout(() => {
      try {
        if (a.parentNode) {
          document.body.removeChild(a);
        }
        window.URL.revokeObjectURL(blobUrl);
      } catch (_) {}
    }, 60000);
  } catch (err) {
    console.warn("Direct blob download failed, falling back to window.open:", err);
    // Bulletproof fallback: trigger browser native download/open
    window.open(targetUrl, "_blank");
  }
}

