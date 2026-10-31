import React from "react";
import { FiEye, FiEdit, FiPrinter, FiTrash2 } from "react-icons/fi";
import { FaUndoAlt } from "react-icons/fa";

export interface TableActionButtonsProps {
  onView?: () => void;
  onEdit?: () => void;
  onPrint?: () => void;
  onDelete?: () => void;
  onReturn?: () => void;
  isReturnDisabled?: boolean;
  returnDisabledTitle?: string;
  viewTitle?: string;
  editTitle?: string;
  printTitle?: string;
  deleteTitle?: string;
  returnTitle?: string;
  extraActions?: React.ReactNode;
  className?: string;
}

export const TableActionButtons: React.FC<TableActionButtonsProps> = ({
  onView,
  onEdit,
  onPrint,
  onDelete,
  onReturn,
  isReturnDisabled = false,
  returnDisabledTitle = "Already Returned",
  viewTitle = "View Invoice",
  editTitle = "Edit",
  printTitle = "Print Invoice",
  deleteTitle = "Delete",
  returnTitle = "Return Product",
  extraActions,
  className = "",
}) => {
  return (
    <div className={`flex items-center justify-center gap-1.5 ${className}`}>
      {onView && (
        <button
          type="button"
          onClick={onView}
          title={viewTitle}
          className="p-1 rounded text-[var(--primary-color)] hover:bg-[var(--primary-color-muted)] transition-colors cursor-pointer"
        >
          <FiEye size={14} />
        </button>
      )}
      {onPrint && (
        <button
          type="button"
          onClick={onPrint}
          title={printTitle}
          className="p-1 rounded text-[var(--ui-text-muted)] hover:bg-[var(--ui-surface-sunken)] transition-colors cursor-pointer"
        >
          <FiPrinter size={14} />
        </button>
      )}
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          title={editTitle}
          className="p-1 rounded text-[var(--ui-warning)] hover:bg-[var(--ui-warning-border)] transition-colors cursor-pointer"
        >
          <FiEdit size={14} />
        </button>
      )}
      {onReturn && (
        isReturnDisabled ? (
          <span
            title={returnDisabledTitle}
            className="p-1 rounded text-[var(--ui-text-subtle)] cursor-not-allowed inline-flex items-center"
          >
            <FaUndoAlt size={12} />
          </span>
        ) : (
          <button
            type="button"
            onClick={onReturn}
            title={returnTitle}
            className="p-1 rounded text-[var(--primary-color)] hover:bg-[var(--primary-color-muted)] transition-colors cursor-pointer"
          >
            <FaUndoAlt size={12} />
          </button>
        )
      )}
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          title={deleteTitle}
          className="p-1 rounded text-[var(--ui-danger)] hover:bg-[var(--ui-danger-border)] transition-colors cursor-pointer"
        >
          <FiTrash2 size={14} />
        </button>
      )}
      {extraActions}
    </div>
  );
};

export default TableActionButtons;
