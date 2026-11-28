import apiConfig from "@/config/api.json";
import { postData } from "@/services/api-service";
import { buildAccessUser } from "@/utils/access-user";

type QueryPayload = Record<string, unknown>;

export async function fetchCashBalanceInfo(): Promise<unknown> {
  return postData<unknown>({
    url: apiConfig.finance.getCashBalanceInfoUrl,
    body: { accessUser: buildAccessUser() },
  });
}

export async function fetchCustomersDueResponse(): Promise<unknown> {
  return postData<unknown>({
    url: apiConfig.collection.customersDueUrl,
    body: { accessUser: buildAccessUser() },
  });
}

export async function fetchCustomerInvoicesDueResponse(
  customerId: string | number
): Promise<unknown> {
  return postData<unknown>({
    url: apiConfig.collection.customerInvoicesDueUrl,
    body: { accessUser: buildAccessUser(), customerId: String(customerId) },
  });
}

export async function fetchPurchasesDueResponse(): Promise<unknown> {
  return postData<unknown>({
    url: apiConfig.payment.purchasesDueUrl,
    body: { accessUser: buildAccessUser() },
  });
}

export async function fetchPurchasesInvoicesDueResponse(
  supplierId: string | number
): Promise<unknown> {
  return postData<unknown>({
    url: apiConfig.payment.purchasesInvoicesDueUrl,
    body: { accessUser: buildAccessUser(), customerId: String(supplierId) },
  });
}

export async function fetchCustomerLedgerResponse(payload: QueryPayload): Promise<unknown> {
  return postData<unknown>({
    url: (apiConfig.collection as Record<string, string>).customerLedgerUrl || "customer-ledger",
    body: payload,
  });
}

export async function fetchPurchaseLedgerResponse(payload: QueryPayload): Promise<unknown> {
  return postData<unknown>({
    url: (apiConfig.payment as Record<string, string>).purchaseLedgerUrl || "purchase-ledger",
    body: payload,
  });
}

export async function fetchCollectionReportResponse(payload: QueryPayload): Promise<unknown> {
  return postData<unknown>({
    url: apiConfig.collection.collectionReportUrl,
    body: payload,
  });
}

export async function fetchPaymentReportResponse(payload: QueryPayload): Promise<unknown> {
  return postData<unknown>({
    url: apiConfig.payment.paymentReportUrl,
    body: payload,
  });
}
