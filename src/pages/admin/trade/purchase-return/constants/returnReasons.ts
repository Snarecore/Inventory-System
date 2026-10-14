export const PURCHASE_RETURN_REASONS = [
  { value: "damaged_product", label: "Damaged" },
  { value: "quality_issue", label: "Low Quality" },
  { value: "wrong_order", label: "Wrong Item Supplied" },
  { value: "expired_product", label: "Expired" },
  { value: "excess_quantity", label: "Excess Quantity Delivered" },
  { value: "packaging_damaged", label: "Packaging Damaged" },
  { value: "price_discrepancy", label: "Invoice Discrepancy" },
  { value: "other", label: "Other / Special Reason" },
];

export const getPurchaseReturnReasonLabel = (val?: string | null): string => {
  if (!val) return "";
  const cleanCode = String(val).split(" || ")[0].trim();
  if (!cleanCode) return "";
  const found = PURCHASE_RETURN_REASONS.find(
    (r) => r.value.toLowerCase() === cleanCode.toLowerCase()
  );
  if (found) return found.label;
  return cleanCode
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
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

/** Free-text remarks are shown as written; reason codes are mapped to their label. */
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
