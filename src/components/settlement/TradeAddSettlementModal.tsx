import React, { useMemo } from "react";
import Modal from "@/components/modal/Modal";
import Button from "@/components/button/Button";
import TextInput from "@/components/form/TextInput";
import { formatMoney } from "@/utils/formatters";
import { showErrorToast } from "@/utils/toast-utils";
import { useMultiTenderSettlement } from "@/hooks/useMultiTenderSettlement";
import { MultiTenderFormSection } from "@/components/settlement/MultiTenderFormSection";
import TradeDueInvoiceAllocationTable, { type GenericDueInvoice } from "@/components/settlement/TradeDueInvoiceAllocationTable";

export interface TradeSettlementParty {
  id?: string | number;
  customerId?: string | number;
  supplierId?: string | number;
  name?: string;
  customerName?: string;
  supplierName?: string;
  phone?: string;
  customerPhone?: string;
  supplierPhone?: string;
  address?: string;
  totalDue?: number;
  [key: string]: any;
}

export interface TradeAddSettlementModalProps {
  isOpen: boolean;
  partyType: "customer" | "supplier";
  party: TradeSettlementParty | null;
  invoices: GenericDueInvoice[];
  isInvoicesLoading: boolean;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (settlementData: {
    settlementDate: string;
    finalPaymentMode: string;
    remark: string;
    allocations: any[];
    selectedBank: any;
    selectedMfs: any;
    numericTotalPaid: number;
    numericCash: number;
    numericBank: number;
    numericMfs: number;
    numericDiscount: number;
    totalSettleAmount: number;
  }) => Promise<void>;
}

export const TradeAddSettlementModal: React.FC<TradeAddSettlementModalProps> = ({
  isOpen,
  partyType,
  party,
  invoices,
  isInvoicesLoading,
  isSubmitting = false,
  onClose,
  onSubmit,
}) => {
  const isCustomer = partyType === "customer";
  const partyTerm = isCustomer ? "Customer" : "Supplier";
  const actionTerm = isCustomer ? "Collect" : "Pay";
  const actionTitle = isCustomer ? "Customer Due Collection" : "Supplier Due Payment";

  const partyName = isCustomer
    ? party?.customerName || party?.name || "Customer"
    : party?.supplierName || party?.name || "Supplier";

  const partyPhone = isCustomer
    ? party?.customerPhone || party?.phone || ""
    : party?.supplierPhone || party?.phone || "";

  const partyId = isCustomer
    ? party?.customerId || party?.id
    : party?.supplierId || party?.id;

  const totalDue = Number(party?.totalDue || 0);

  const settlement = useMultiTenderSettlement({
    isOpen,
    totalDue,
    entityId: partyId,
    invoices,
  });

  const {
    settlementDate,
    remark,
    setRemark,
    isManualMode,
    selectedInvoiceNos,
    selectedBankObj,
    selectedMfsObj,
    numericCash,
    numericBank,
    numericMfs,
    numericTotalPaid,
    numericDiscount,
    totalSettleAmount,
    finalPaymentMode,
    tenderBreakdown,
    allocations,
    remainingTotalDue,
    handleToggleInvoice,
    handleToggleSelectAll,
    handleToggleManualMode,
    isAllSelected,
    validateSettlement,
  } = settlement;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!party) {
      showErrorToast(`No ${partyTerm.toLowerCase()} selected`);
      return;
    }

    const validation = validateSettlement();
    if (!validation.isValid) {
      showErrorToast(validation.error || "Validation error");
      return;
    }

    await onSubmit({
      settlementDate,
      finalPaymentMode,
      remark,
      allocations,
      selectedBank: selectedBankObj,
      selectedMfs: selectedMfsObj,
      numericTotalPaid,
      numericCash,
      numericBank,
      numericMfs,
      numericDiscount,
      totalSettleAmount,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={actionTitle}
      subtitle={`Process payment settlement for ${partyName}`}
      maxWidth="max-w-4xl"
      footerButtons={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs">
            <span className="text-[var(--ui-text-muted)]">Settling: </span>
            <span className="font-bold text-[var(--color-primary)]">
              ৳{formatMoney(totalSettleAmount)}
            </span>
            <span className="text-[var(--ui-text-muted)] ml-2">Remaining Due: </span>
            <span className="font-semibold text-[var(--ui-text)]">
              ৳{formatMoney(remainingTotalDue)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              label="Cancel"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            />
            <Button
              label={isSubmitting ? "Processing..." : `Confirm ${actionTerm}`}
              size="sm"
              color="var(--primary-color)"
              onClick={handleSubmit}
              disabled={isSubmitting || totalSettleAmount <= 0}
            />
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Party Summary Banner */}
        <div className="p-3 rounded-lg bg-[var(--ui-surface-muted)] border border-[var(--ui-border)] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-[11px] text-[var(--ui-text-subtle)] block">{partyTerm}</span>
            <span className="font-bold text-sm text-[var(--ui-text)]">{partyName}</span>
            {partyPhone && (
              <span className="text-[11px] text-[var(--ui-text-muted)] ml-2">({partyPhone})</span>
            )}
          </div>
          <div className="text-right">
            <span className="text-[11px] text-[var(--ui-text-subtle)] block">Total Outstanding Due</span>
            <span className="font-bold text-base text-[var(--ui-danger)]">
              ৳{formatMoney(totalDue)}
            </span>
          </div>
        </div>

        {/* Due Invoices Allocation Section */}
        <TradeDueInvoiceAllocationTable
          invoices={invoices}
          partyType={partyType}
          isLoading={isInvoicesLoading}
          selectedInvoiceNos={selectedInvoiceNos}
          onToggleInvoice={handleToggleInvoice}
          onToggleSelectAll={handleToggleSelectAll}
          isAllSelected={isAllSelected}
          allocations={allocations}
          isManualMode={isManualMode}
          onToggleManualMode={handleToggleManualMode}
          tenderBreakdown={tenderBreakdown}
        />

        {/* Multi-tender Payment Entry */}
        <MultiTenderFormSection
          settlement={settlement}
          dateLabel="Date"
        />

        {/* Remark Note */}
        <div>
          <TextInput
            label="Notes / Remark (Optional)"
            placeholder={`Additional notes regarding this ${actionTerm.toLowerCase()}...`}
            value={remark}
            onChange={setRemark}
          />
        </div>
      </form>
    </Modal>
  );
};

export default TradeAddSettlementModal;
