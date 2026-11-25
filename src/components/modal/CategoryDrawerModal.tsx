import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { DrawerModal, Button, TextInput } from "@/components/common";
import { usePermission } from "@/hooks/usePermission";
import { showErrorToast } from "@/utils/toast-utils";
import { FaCheckCircle, FaTimesCircle } from "react-icons/fa";

export type CategoryDrawerStatus = "Active" | "Inactive";

export interface CategoryDrawerModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEditing: boolean;
  contentKey: string;
  title: string;
  icon: React.ReactNode;
  permissionModule: string;
  initialName?: string;
  initialStatus?: CategoryDrawerStatus;
  namePlaceholder?: string;
  isSaving: boolean;
  submitLabel: string;
  onSubmitCategory: (payload: { name: string; status: CategoryDrawerStatus }) => void;
  validateName?: (trimmedName: string) => string | null | undefined;
  createPermissionMessage?: string;
  updatePermissionMessage?: string;
  maxWidth?: string;
  children?: React.ReactNode;
}

/**
 * Shared drawer form shell for Product and Finance (Income/Expense) categories.
 * Centralizes drawer layout, name validation, permission checks, status toggle, and form reset.
 */
const CategoryDrawerModal: React.FC<CategoryDrawerModalProps> = ({
  isOpen,
  onClose,
  isEditing,
  contentKey,
  title,
  icon,
  permissionModule,
  initialName = "",
  initialStatus = "Active",
  namePlaceholder = "",
  isSaving,
  submitLabel,
  onSubmitCategory,
  validateName,
  createPermissionMessage = "You do not have permission to create categories.",
  updatePermissionMessage = "You do not have permission to update categories.",
  maxWidth = "max-w-[340px]",
  children,
}) => {
  const { t } = useTranslation();
  const { canCreate, canUpdate } = usePermission();

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  const [prevContentKey, setPrevContentKey] = useState(contentKey);
  const [name, setName] = useState(initialName);
  const [status, setStatus] = useState<CategoryDrawerStatus>(initialStatus);
  const [nameError, setNameError] = useState("");

  if (isOpen !== prevIsOpen || contentKey !== prevContentKey) {
    setPrevIsOpen(isOpen);
    setPrevContentKey(contentKey);
    setName(isOpen ? initialName : "");
    setStatus(isOpen ? initialStatus : "Active");
    setNameError("");
  }

  const handleNameChange = (val: string) => {
    setName(val);
    if (nameError) setNameError("");
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSaving) return;

    if (isEditing && !canUpdate(permissionModule)) {
      showErrorToast(updatePermissionMessage);
      return;
    }
    if (!isEditing && !canCreate(permissionModule)) {
      showErrorToast(createPermissionMessage);
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError(t("Category name is required"));
      showErrorToast(t("Please enter a category name"));
      return;
    }

    const validationError = validateName?.(trimmedName);
    if (validationError) {
      setNameError(validationError);
      showErrorToast(validationError);
      return;
    }

    onSubmitCategory({ name: trimmedName, status });
  };

  return (
    <DrawerModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      icon={icon}
      maxWidth={maxWidth}
      contentKey={contentKey}
      onSubmit={handleSubmit}
      footerButtons={
        <>
          <Button
            label={t("Cancel")}
            onClick={onClose}
            variant="outline"
            disabled={isSaving}
            buttonClass="!bg-white hover:!bg-gray-50 !border-gray-300 !text-gray-700 shadow-2xs font-medium !rounded-md !py-[0.4rem] !px-4 text-xs sm:text-sm"
          />
          <Button
            label={submitLabel}
            type="submit"
            color="var(--color-primary)"
            hoverColor="var(--color-primary-hover)"
            isLoading={isSaving}
            disabled={isSaving || (isEditing ? !canUpdate(permissionModule) : !canCreate(permissionModule))}
          />
        </>
      }
    >
      {/* Category Name */}
      <div>
        <TextInput
          label={t("Category Name")}
          placeholder={namePlaceholder}
          value={name}
          onChange={handleNameChange}
          error={nameError}
          required
          autoFocus
        />
      </div>

      {children}

      {/* Status Toggle - Only visible when editing */}
      {isEditing && (
        <div>
          <label className="block text-xs font-semibold text-gray-800 mb-1.5">
            {t("Status")}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setStatus("Active")}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                status === "Active"
                  ? "border-emerald-400 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-400"
                  : "border-gray-200 bg-gray-50/60 text-gray-600 hover:border-gray-300 hover:bg-gray-100"
              }`}
            >
              <FaCheckCircle className="text-xs shrink-0 text-emerald-600" />
              <span>{t("Active")}</span>
            </button>

            <button
              type="button"
              onClick={() => setStatus("Inactive")}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                status === "Inactive"
                  ? "border-rose-400 bg-rose-50 text-rose-700 ring-1 ring-rose-400"
                  : "border-gray-200 bg-gray-50/60 text-gray-600 hover:border-gray-300 hover:bg-gray-100"
              }`}
            >
              <FaTimesCircle className="text-xs shrink-0 text-rose-600" />
              <span>{t("Inactive")}</span>
            </button>
          </div>
        </div>
      )}
    </DrawerModal>
  );
};

export default CategoryDrawerModal;
