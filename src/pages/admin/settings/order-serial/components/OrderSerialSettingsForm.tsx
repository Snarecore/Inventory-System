import React, { useState } from "react";
import Button from "@/components/button/Button";
import {
  FaReceipt,
  FaShoppingBag,
  FaSave,
  FaHashtag,
} from "react-icons/fa";
import { OrderSerialSettingsState } from "@/types/order-serial.types";
import { useUpdateOrderSerialSettingMutation } from "@/hooks/useOrderSerialSettings";
import { useTranslation } from "react-i18next";

interface OrderSerialSettingsFormProps {
  initialData: OrderSerialSettingsState;
  onSuccess?: () => void;
}

export const OrderSerialSettingsForm: React.FC<OrderSerialSettingsFormProps> = ({
  initialData,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const updateMutation = useUpdateOrderSerialSettingMutation();
  const [savingType, setSavingType] = useState<"SALE" | "PURCHASE" | null>(null);

  const saleItem = initialData.sale;
  const purchaseItem = initialData.purchase;

  const saleNextOrderNo = saleItem.nextOrderNo || "";
  const saleLastNumber = saleItem.lastNumber;

  const purchaseNextOrderNo = purchaseItem.nextOrderNo || "";
  const purchaseLastNumber = purchaseItem.lastNumber;

  // State for the NEW start number input fields
  const [newSaleStartNumber, setNewSaleStartNumber] = useState<string>("");
  const [newPurchaseStartNumber, setNewPurchaseStartNumber] = useState<string>("");

  const isSaleDirty = newSaleStartNumber.trim().length > 0;
  const isPurchaseDirty = newPurchaseStartNumber.trim().length > 0;

  // Handle Save Sale Serial
  const handleSaveSale = async () => {
    if (!isSaleDirty || savingType !== null) return;
    try {
      setSavingType("SALE");
      await updateMutation.mutateAsync({
        serialType: "SALE",
        startNumber: newSaleStartNumber.trim(),
      });
      setNewSaleStartNumber("");
      onSuccess?.();
    } catch {
      // Toast notification handled in mutation
    } finally {
      setSavingType(null);
    }
  };

  // Handle Save Purchase Serial
  const handleSavePurchase = async () => {
    if (!isPurchaseDirty || savingType !== null) return;
    try {
      setSavingType("PURCHASE");
      await updateMutation.mutateAsync({
        serialType: "PURCHASE",
        startNumber: newPurchaseStartNumber.trim(),
      });
      setNewPurchaseStartNumber("");
      onSuccess?.();
    } catch {
      // Toast notification handled in mutation
    } finally {
      setSavingType(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 sm:gap-4">
      {/* ═══════════════ 1. SALES INVOICE CARD ═══════════════ */}
      <div className="bg-[var(--ui-surface)] rounded-xl border border-[var(--ui-border)] shadow-xs overflow-hidden flex flex-col transition-all">
        {/* Card Header */}
        <div className="px-3.5 py-2.5 sm:px-4 sm:py-3 border-b border-[var(--ui-border)] bg-[var(--ui-surface-sunken)]/40 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <FaReceipt size={14} />
            </div>
            <h4 className="text-sm font-bold text-[var(--ui-text)]">
              {t("Sales Invoice Serial")}
            </h4>
          </div>

          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            SALE
          </span>
        </div>

        {/* Card Body */}
        <div className="p-3.5 sm:p-4 space-y-3 flex-1">
          {/* Top Field: Next Order No (Read-Only) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[var(--ui-text)]">
                {t("Next Order No")}
              </label>
              {saleLastNumber > 0 && (
                <span className="text-[11px] text-[var(--ui-text-muted)] font-mono">
                  {t("Last Number")}: <strong className="text-[var(--ui-text)]">#{saleLastNumber}</strong>
                </span>
              )}
            </div>

            <div className="relative flex items-center">
              <span className="absolute left-3 text-[var(--ui-text-muted)] font-mono text-sm select-none">
                <FaHashtag size={11} />
              </span>
              <input
                type="text"
                readOnly
                disabled
                value={saleNextOrderNo || "—"}
                className="w-full pl-8 pr-3 py-1.5 sm:py-2 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface-sunken)]/60 text-[var(--ui-text)] font-mono text-sm font-bold cursor-default shadow-xs"
              />
            </div>
          </div>

          {/* Bottom Field: New Start Number (Editable) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[var(--ui-text)]">
                {t("New Start Number")}
              </label>
              <span className="text-[11px] text-[var(--ui-text-muted)]">
                {t("Optional")}
              </span>
            </div>

            <div className="relative flex items-center">
              <span className="absolute left-3 text-[var(--ui-text-muted)] font-mono text-sm select-none">
                <FaHashtag size={11} />
              </span>
              <input
                type="text"
                name="newSaleStartNumber"
                value={newSaleStartNumber}
                onChange={(e) => setNewSaleStartNumber(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && isSaleDirty) {
                    e.preventDefault();
                    handleSaveSale();
                  }
                }}
                placeholder={t("Enter new starting number")}
                className="w-full pl-8 pr-3 py-1.5 sm:py-2 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)] text-[var(--ui-text)] text-sm font-mono font-medium focus:outline-hidden focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-xs"
              />
            </div>
          </div>
        </div>

        {/* Card Footer */}
        <div className="px-3.5 py-2 sm:px-4 sm:py-2.5 border-t border-[var(--ui-border)] bg-[var(--ui-surface-sunken)]/20 flex items-center justify-end">
          <Button
            type="button"
            onClick={handleSaveSale}
            disabled={savingType !== null || !isSaleDirty}
            isLoading={savingType === "SALE"}
            variant="primary"
            size="sm"
            icon={<FaSave size={11} />}
            label={t("Save")}
          />
        </div>
      </div>

      {/* ═══════════════ 2. PURCHASE INVOICE CARD ═══════════════ */}
      <div className="bg-[var(--ui-surface)] rounded-xl border border-[var(--ui-border)] shadow-xs overflow-hidden flex flex-col transition-all">
        {/* Card Header */}
        <div className="px-3.5 py-2.5 sm:px-4 sm:py-3 border-b border-[var(--ui-border)] bg-[var(--ui-surface-sunken)]/40 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
              <FaShoppingBag size={14} />
            </div>
            <h4 className="text-sm font-bold text-[var(--ui-text)]">
              {t("Purchase Invoice Serial")}
            </h4>
          </div>

          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            PURCHASE
          </span>
        </div>

        {/* Card Body */}
        <div className="p-3.5 sm:p-4 space-y-3 flex-1">
          {/* Top Field: Next Order No (Read-Only) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[var(--ui-text)]">
                {t("Next Order No")}
              </label>
              {purchaseLastNumber > 0 && (
                <span className="text-[11px] text-[var(--ui-text-muted)] font-mono">
                  {t("Last Number")}: <strong className="text-[var(--ui-text)]">#{purchaseLastNumber}</strong>
                </span>
              )}
            </div>

            <div className="relative flex items-center">
              <span className="absolute left-3 text-[var(--ui-text-muted)] font-mono text-sm select-none">
                <FaHashtag size={11} />
              </span>
              <input
                type="text"
                readOnly
                disabled
                value={purchaseNextOrderNo || "—"}
                className="w-full pl-8 pr-3 py-1.5 sm:py-2 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface-sunken)]/60 text-[var(--ui-text)] font-mono text-sm font-bold cursor-default shadow-xs"
              />
            </div>
          </div>

          {/* Bottom Field: New Start Number (Editable) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[var(--ui-text)]">
                {t("New Start Number")}
              </label>
              <span className="text-[11px] text-[var(--ui-text-muted)]">
                {t("Optional")}
              </span>
            </div>

            <div className="relative flex items-center">
              <span className="absolute left-3 text-[var(--ui-text-muted)] font-mono text-sm select-none">
                <FaHashtag size={11} />
              </span>
              <input
                type="text"
                name="newPurchaseStartNumber"
                value={newPurchaseStartNumber}
                onChange={(e) => setNewPurchaseStartNumber(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && isPurchaseDirty) {
                    e.preventDefault();
                    handleSavePurchase();
                  }
                }}
                placeholder={t("Enter new starting number")}
                className="w-full pl-8 pr-3 py-1.5 sm:py-2 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)] text-[var(--ui-text)] text-sm font-mono font-medium focus:outline-hidden focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-xs"
              />
            </div>
          </div>
        </div>

        {/* Card Footer */}
        <div className="px-3.5 py-2 sm:px-4 sm:py-2.5 border-t border-[var(--ui-border)] bg-[var(--ui-surface-sunken)]/20 flex items-center justify-end">
          <Button
            type="button"
            onClick={handleSavePurchase}
            disabled={savingType !== null || !isPurchaseDirty}
            isLoading={savingType === "PURCHASE"}
            variant="primary"
            size="sm"
            icon={<FaSave size={11} />}
            label={t("Save")}
          />
        </div>
      </div>
    </div>
  );
};

export default OrderSerialSettingsForm;
