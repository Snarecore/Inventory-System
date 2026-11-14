import { useState } from "react";
import {
  checkTradeOrderDelete,
  deleteTradeOrder,
  validateCheckTradeDeleteResult,
  extractTradeInvoiceNo,
  type TradeOrderType,
} from "@/services/trade-delete-service";
import type {
  CheckTradeDeletePayload,
  CheckTradeDeleteResponse,
  DeleteTradeOrderPayload,
  DeleteTradeOrderResponse,
} from "@/types";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";

export interface UseTradeDeleteModalOptions<T> {
  entityType: TradeOrderType;
  entityLabel?: string; // e.g. "Sales Order", "Purchase Order"
  getInvoiceNo?: (item: T) => string;
  getOrderIdentifier?: (item: T) => string;
  checkFn?: (payload: CheckTradeDeletePayload) => Promise<CheckTradeDeleteResponse>;
  deleteFn?: (payload: DeleteTradeOrderPayload) => Promise<DeleteTradeOrderResponse>;
  onSuccess?: () => void | Promise<void>;
  onError?: (error: any) => void;
}

/**
 * Reusable hook managing the 2-step deletion workflow:
 * Step 1: Verification check via check endpoint
 * Step 2: Confirmation modal with reason and execution via delete endpoint
 */
export function useTradeDeleteModal<T>({
  entityType,
  entityLabel = entityType === "sales" ? "Sales Order" : "Purchase Order",
  getInvoiceNo = extractTradeInvoiceNo,
  getOrderIdentifier,
  checkFn,
  deleteFn,
  onSuccess,
  onError,
}: UseTradeDeleteModalOptions<T>) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<T | null>(null);
  const [reason, setReason] = useState<string>("");
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Step 1: Check if order can be deleted
  const handleRequestDelete = async (item: T) => {
    const invNo = getInvoiceNo(item);
    if (!invNo) {
      showErrorToast(`Invoice number is missing for this ${entityLabel.toLowerCase()}.`);
      return;
    }

    try {
      setIsChecking(true);
      const res = checkFn
        ? await checkFn({ invoiceNo: invNo })
        : await checkTradeOrderDelete(entityType, { invoiceNo: invNo });

      const validation = validateCheckTradeDeleteResult(res, entityLabel);

      if (!validation.canDelete) {
        showErrorToast(validation.message || `${entityLabel} cannot be deleted or was not found.`);
        return;
      }

      setSelectedItem(item);
      setReason("");
      setIsOpen(true);
    } catch (err: any) {
      const msg = err?.message || `Failed to verify ${entityLabel.toLowerCase()} for deletion.`;
      showErrorToast(msg);
      onError?.(err);
    } finally {
      setIsChecking(false);
    }
  };

  // Step 2: Confirm deletion with reason
  const handleConfirmDelete = async () => {
    if (!selectedItem) return;
    const invNo = getInvoiceNo(selectedItem);
    if (!invNo) {
      showErrorToast("Invoice number is missing.");
      return;
    }

    try {
      setIsDeleting(true);
      const payload: DeleteTradeOrderPayload = {
        invoiceNo: invNo,
        reason: reason.trim() || "Deleted by user",
      };

      const res = deleteFn
        ? await deleteFn(payload)
        : await deleteTradeOrder(entityType, payload);

      showSuccessToast(res?.msg || res?.message || `${entityLabel} deleted successfully!`);
      setIsOpen(false);
      setSelectedItem(null);
      setReason("");

      if (onSuccess) {
        await onSuccess();
      }
    } catch (err: any) {
      const msg = err?.message || `Failed to delete ${entityLabel.toLowerCase()}.`;
      showErrorToast(msg);
      onError?.(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (isDeleting) return;
    setIsOpen(false);
    setSelectedItem(null);
    setReason("");
  };

  const orderIdentifier = selectedItem
    ? getOrderIdentifier
      ? getOrderIdentifier(selectedItem)
      : (selectedItem as any)?.orderNo || (selectedItem as any)?.invoiceNo || ""
    : "";

  return {
    isOpen,
    selectedItem,
    reason,
    setReason,
    isChecking,
    isDeleting,
    orderIdentifier,
    handleRequestDelete,
    handleConfirmDelete,
    handleClose,
  };
}
