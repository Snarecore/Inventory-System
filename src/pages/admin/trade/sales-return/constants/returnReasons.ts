export const RETURN_REASONS = [
  { value: "damaged_product", label: "Damaged Product" },
  { value: "wrong_order", label: "Wrong Order" },
  { value: "expired_product", label: "Expired Product" },
  { value: "quality_issue", label: "Quality Issue" },
  { value: "customer_changed_mind", label: "Customer Changed Mind" },
  { value: "incorrect_item", label: "Incorrect Item Delivered" },
  { value: "cash_short", label: "Cash Short" },
  { value: "duplicate_order", label: "Duplicate Order" },
  { value: "overstock_return", label: "Overstock Return" },
  { value: "other", label: "Other" },
];

export const getReturnReasonLabel = (val?: string): string => {
  if (!val) return "Other";
  const found = RETURN_REASONS.find((r) => r.value === val);
  if (found) return found.label;
  return String(val).replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};
