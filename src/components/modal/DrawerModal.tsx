import React, { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { TiDelete } from "react-icons/ti";

export interface DrawerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footerButtons?: React.ReactNode;
  maxWidth?: string;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  contentKey?: string | number;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  onSubmit?: (e: React.FormEvent) => void;
}

const DrawerModal: React.FC<DrawerModalProps> = ({
  isOpen,
  onClose,
  title,
  icon,
  children,
  footerButtons,
  maxWidth = "max-w-[340px]",
  className = "",
  headerClassName = "",
  bodyClassName = "",
  footerClassName = "",
  contentKey,
  closeOnBackdrop = true,
  closeOnEscape = true,
  onSubmit,
}) => {
  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeOnEscape, onClose]);

  const formWrapper = (content: React.ReactNode) => {
    if (onSubmit) {
      return (
        <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {content}
        </form>
      );
    }
    return <div className="flex flex-col flex-1 min-h-0 overflow-hidden">{content}</div>;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeOnBackdrop ? onClose : undefined}
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] cursor-pointer"
          />

          {/* Sidebar Drawer Container */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pointer-events-none">
            <motion.div
              key={contentKey}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className={`w-screen ${maxWidth} bg-white shadow-2xl flex flex-col pointer-events-auto border-l border-gray-200 ${className}`}
            >
              {/* Header */}
              <div
                className={`px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-white shrink-0 ${headerClassName}`}
              >
                <div className="flex items-center gap-2">
                  {icon && (
                    <div className="p-1.5 rounded-lg bg-sky-50 text-[var(--color-primary)]">
                      {icon}
                    </div>
                  )}
                  <h2 className="text-sm font-bold text-gray-900 leading-tight">
                    {title}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-gray-100 transition-colors cursor-pointer"
                  title="Close"
                >
                  <TiDelete className="text-2xl text-red-500" />
                </button>
              </div>

              {/* Form & Content */}
              {formWrapper(
                <>
                  {/* Scrollable Body */}
                  <div
                    className={`flex-1 overflow-y-auto p-4 space-y-3.5 ${bodyClassName}`}
                  >
                    {children}
                  </div>

                  {/* Footer */}
                  {footerButtons && (
                    <div
                      className={`px-4 py-2.5 border-t border-gray-100 bg-gray-50/80 flex items-center justify-end gap-2 shrink-0 ${footerClassName}`}
                    >
                      {footerButtons}
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default DrawerModal;
