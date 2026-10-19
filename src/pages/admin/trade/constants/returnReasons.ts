export interface ReturnReasonOption {
  value: string;
  label: string;
}

export const SALES_RETURN_REASONS: ReturnReasonOption[] = [
  { value: "wrong_order", label: "Wrong Item" },
  { value: "damaged_product", label: "Damaged" },
  { value: "defective_item", label: "Defective" },
  { value: "expired_product", label: "Expired" },
  { value: "quality_issue", label: "Quality Issue" },
  { value: "packaging_damaged", label: "Packaging Damaged" },
  { value: "size_mismatch", label: "Size Mismatch" },
  { value: "excess_quantity", label: "Extra Quantity Ordered" },
  { value: "customer_changed_mind", label: "Customer Changed Mind" },
  { value: "other", label: "Other / Special Reason" },
];

/** Backward compatibility alias */
export const RETURN_REASONS = SALES_RETURN_REASONS;

export const PURCHASE_RETURN_REASONS: ReturnReasonOption[] = [
  { value: "damaged_product", label: "Damaged" },
  { value: "quality_issue", label: "Low Quality" },
  { value: "wrong_order", label: "Wrong Item Supplied" },
  { value: "expired_product", label: "Expired" },
  { value: "excess_quantity", label: "Excess Quantity Delivered" },
  { value: "packaging_damaged", label: "Packaging Damaged" },
  { value: "price_discrepancy", label: "Invoice Discrepancy" },
  { value: "other", label: "Other / Special Reason" },
];

const formatFallbackCode = (code: string): string =>
  code
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

export const getReturnReasonLabel = (val?: string | null): string => {
  if (!val) return "";
  const cleanCode = String(val).split(" || ")[0].trim();
  if (!cleanCode) return "";
  const found = SALES_RETURN_REASONS.find(
    (r) => r.value.toLowerCase() === cleanCode.toLowerCase()
  );
  if (found) return found.label;
  return formatFallbackCode(cleanCode);
};

export const getPurchaseReturnReasonLabel = (val?: string | null): string => {
  if (!val) return "";
  const cleanCode = String(val).split(" || ")[0].trim();
  if (!cleanCode) return "";
  const found = PURCHASE_RETURN_REASONS.find(
    (r) => r.value.toLowerCase() === cleanCode.toLowerCase()
  );
  if (found) return found.label;
  return formatFallbackCode(cleanCode);
};

type RawRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is RawRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const firstText = (record: RawRecord, keys: readonly string[]): string => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
};

const NOTE_KEYS = ["note", "remarks", "returnNote", "returnRemarks"] as const;
const REASON_KEYS = ["returnReason", "reason"] as const;
const LINE_REASON_KEYS = ["returnReason", "return_reason", "note", "remarks", "reason"] as const;

export const extractPurchaseReturnRemarks = (item: unknown): string => {
  if (!isRecord(item)) return "";

  const note = firstText(item, NOTE_KEYS);
  if (note) return note;

  const reason = firstText(item, REASON_KEYS);
  if (reason) return getPurchaseReturnReasonLabel(reason);

  const notes = firstText(item, ["notes"]);
  if (notes) return notes;

  const details = item.returnDetails ?? item.purchaseReturnDetails;
  if (Array.isArray(details)) {
    for (const detail of details) {
      if (!isRecord(detail)) continue;
      const lineReason = firstText(detail, LINE_REASON_KEYS);
      if (lineReason) return getPurchaseReturnReasonLabel(lineReason);
    }
  }

  return "";
};

export const extractReturnRemarks = (item: unknown): string => {
  if (!isRecord(item)) return "";

  const note = firstText(item, NOTE_KEYS);
  if (note) return note;

  const reason = firstText(item, REASON_KEYS);
  if (reason) return getReturnReasonLabel(reason);

  const notes = firstText(item, ["notes"]);
  if (notes) return notes;

  const details = item.returnDetails ?? item.salesReturnDetails;
  if (Array.isArray(details)) {
    for (const detail of details) {
      if (!isRecord(detail)) continue;
      const lineReason = firstText(detail, LINE_REASON_KEYS);
      if (lineReason) return getReturnReasonLabel(lineReason);
    }
  }

  // Nested returns or salesReturns array fallback
  const nested = item.returns ?? item.salesReturns;
  if (Array.isArray(nested)) {
    for (const r of nested) {
      if (!isRecord(r)) continue;
      const rNote = firstText(r, NOTE_KEYS);
      if (rNote) return rNote;
      const rReason = firstText(r, REASON_KEYS);
      if (rReason) return getReturnReasonLabel(rReason);

      if (Array.isArray(r.returnDetails)) {
        for (const d of r.returnDetails) {
          if (!isRecord(d)) continue;
          const dVal = firstText(d, LINE_REASON_KEYS);
          if (dVal) return getReturnReasonLabel(dVal);
        }
      }
    }
  }

  return "";
};
