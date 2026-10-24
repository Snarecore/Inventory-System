import React, { useRef, useEffect } from "react";
import { FiCheckCircle, FiSave, FiAlertCircle, FiHelpCircle } from "react-icons/fi";

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onClose: () => void;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  icon?: React.ReactNode;
  iconBgColor?: string;
  confirmButtonColor?: string;
  isLoading?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  onClose,
  onConfirm,
  confirmText = "Save",
  cancelText = "Cancel",
  icon,
  iconBgColor = "bg-[#e0f2fe]",
  confirmButtonColor = "bg-[#009fe3] hover:bg-[#0085be]",
  isLoading = false,
}) => {
  const isConfirmingRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      isConfirmingRef.current = false;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirmClick = () => {
    if (isConfirmingRef.current || isLoading) return;
    isConfirmingRef.current = true;
    onConfirm();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#000000b6] bg-opacity-50 z-[9999] p-2">
      <div
        className="bg-white rounded-lg shadow-lg w-[400px] p-10 relative"
        role="dialog"
        aria-labelledby="confirm-modal-title"
      >
        <div className="flex flex-col items-center text-center">
          <div className={`${iconBgColor} p-3 rounded-full`}>
            {icon ? (
              icon
            ) : (
              <FiCheckCircle className="text-2xl text-[var(--color-primary)]" />
            )}
          </div>
          <h2 id="confirm-modal-title" className="text-lg font-bold mt-3 text-gray-900">
            {title}
          </h2>
          <p className="text-sm text-gray-600 mt-1">{message}</p>
        </div>
        <div className="flex justify-center gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-5 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition shadow-2xs disabled:opacity-50 min-w-[90px]"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirmClick}
            disabled={isLoading}
            className={`px-5 py-2 text-xs font-bold text-white rounded-lg cursor-pointer transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 min-w-[110px] ${
              confirmButtonColor || "bg-[#009fe3] hover:bg-[#0085be]"
            }`}
          >
            {isLoading && (
              <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
            )}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
