export const RETURN_REASONS = [
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

// Clean up any old temporary keys from browser if present
if (typeof window !== "undefined") {
  try {
    window.localStorage.removeItem("cashboi_sales_return_notes_v1");
    window.localStorage.removeItem("cashboi_sales_returns_records_v1");
  } catch {
    // Ignore
  }
}

export const getReturnReasonLabel = (val?: string | null): string => {
  if (!val) return "";
  const cleanCode = String(val).split(" || ")[0].trim();
  if (!cleanCode) return "";
  const found = RETURN_REASONS.find(
    (r) => r.value.toLowerCase() === cleanCode.toLowerCase()
  );
  if (found) return found.label;
  return cleanCode
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

export const extractReturnRemarks = (item: any): string => {
  if (!item) return "";

  // 1. Root level note / remarks saved in database
  if (item.note && String(item.note).trim()) {
    return String(item.note).trim();
  }
  if (item.remarks && String(item.remarks).trim()) {
    return String(item.remarks).trim();
  }
  if (item.returnNote && String(item.returnNote).trim()) {
    return String(item.returnNote).trim();
  }
  if (item.returnRemarks && String(item.returnRemarks).trim()) {
    return String(item.returnRemarks).trim();
  }
  if (item.returnReason && String(item.returnReason).trim()) {
    return getReturnReasonLabel(String(item.returnReason).trim());
  }
  if (item.reason && String(item.reason).trim()) {
    return getReturnReasonLabel(String(item.reason).trim());
  }
  if (item.notes && String(item.notes).trim()) {
    return String(item.notes).trim();
  }

  // 2. From returnDetails array (line-level return reason)
  if (Array.isArray(item.returnDetails) && item.returnDetails.length > 0) {
    for (const d of item.returnDetails) {
      const val = d.returnReason || d.return_reason || d.note || d.remarks || d.reason;
      if (val && String(val).trim()) {
        return getReturnReasonLabel(String(val).trim());
      }
    }
  }

  // 3. From salesReturnDetails array
  if (Array.isArray(item.salesReturnDetails) && item.salesReturnDetails.length > 0) {
    for (const d of item.salesReturnDetails) {
      const val = d.returnReason || d.return_reason || d.note || d.remarks || d.reason;
      if (val && String(val).trim()) {
        return getReturnReasonLabel(String(val).trim());
      }
    }
  }

  // 4. From nested returns array
  if (Array.isArray(item.returns) && item.returns.length > 0) {
    for (const r of item.returns) {
      const val = r.note || r.remarks || r.returnNote || r.returnRemarks || r.returnReason || r.reason;
      if (val && String(val).trim()) {
        return getReturnReasonLabel(String(val).trim());
      }
      if (Array.isArray(r.returnDetails)) {
        for (const d of r.returnDetails) {
          const dVal = d.returnReason || d.return_reason || d.note || d.remarks;
          if (dVal && String(dVal).trim()) {
            return getReturnReasonLabel(String(dVal).trim());
          }
        }
      }
    }
  }

  // 5. From nested salesReturns array
  if (Array.isArray(item.salesReturns) && item.salesReturns.length > 0) {
    for (const r of item.salesReturns) {
      const val = r.note || r.remarks || r.returnNote || r.returnRemarks || r.returnReason || r.reason;
      if (val && String(val).trim()) {
        return getReturnReasonLabel(String(val).trim());
      }
      if (Array.isArray(r.returnDetails)) {
        for (const d of r.returnDetails) {
          const dVal = d.returnReason || d.return_reason || d.note || d.remarks;
          if (dVal && String(dVal).trim()) {
            return getReturnReasonLabel(String(dVal).trim());
          }
        }
      }
    }
  }

  return "";
};
