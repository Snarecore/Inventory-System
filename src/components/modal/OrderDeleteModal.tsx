import React from "react";
import DeleteModal from "./DeleteModal";

export interface OrderDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  orderIdentifier?: string;
  entityName?: string; // e.g., "Sales Order", "Purchase Order"
  reason: string;
  onReasonChange: (reason: string) => void;
  isLoading?: boolean;
}

const OrderDeleteModal: React.FC<OrderDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  orderIdentifier,
  entityName = "order",
  reason,
  onReasonChange,
  isLoading = false,
}) => {
  const displayTitle = title || `Delete ${entityName}`;
  const displayMessage = `Are you sure you want to delete ${entityName.toLowerCase()}${
    orderIdentifier ? ` "${orderIdentifier}"` : ""
  }?`;

  return (
    <DeleteModal
      isOpen={isOpen}
      title={displayTitle}
      message={displayMessage}
      onClose={onClose}
      onDelete={onConfirm}
      isLoading={isLoading}
    >
      <div className="mt-2 text-left w-full">
        <label className="block text-xs font-medium text-[var(--ui-text-muted)] mb-1">
          Reason for deletion (ডিলিট করার কারণ)
        </label>
        <input
          type="text"
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          placeholder="e.g. Order cancelled, wrong entry, returned items..."
          className="w-full text-xs px-3 py-2 rounded-md border border-[var(--ui-border-strong)] bg-[var(--ui-surface)] text-[var(--ui-text)] focus:outline-none focus:border-[var(--primary-color)]"
          autoFocus
        />
      </div>
    </DeleteModal>
  );
};

export default OrderDeleteModal;
