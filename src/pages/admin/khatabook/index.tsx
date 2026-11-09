import React, { useState } from "react";
import PageHeader from "@/components/page-header/PageHeader";
import Button from "@/components/button/Button";
import RefreshButton from "@/components/table-components/RefreshButton";
import DeleteModal from "@/components/modal/DeleteModal";
import { MotionDiv } from "@/utils/framer.motion";
import { KhatabookTable } from "./components/KhatabookTable";
import { PersonFormModal } from "./components/PersonFormModal";
import { TransactionFormModal } from "./components/TransactionFormModal";
import { PersonLedgerView } from "./components/PersonLedgerView";
import {
  useKhatabookDashboardQuery,
  useDeleteLedgerPersonMutation,
  useDeleteLedgerTransactionMutation,
} from "@/hooks/useKhatabook";
import { formatMoney } from "@/utils/formatters";
import type { LedgerPerson, LedgerTransaction } from "@/types";
import { FaPlus, FaUsers, FaMoneyBillWave } from "react-icons/fa";
import { usePermission } from "@/hooks/usePermission";

export const KhatabookPage: React.FC = () => {
  const { canCreate } = usePermission();
  const { persons, kpi, isLoading, isFetching, refetch } = useKhatabookDashboardQuery();

  // Drawer States
  const [isPersonDrawerOpen, setIsPersonDrawerOpen] = useState(false);
  const [personToEdit, setPersonToEdit] = useState<LedgerPerson | null>(null);

  const [isTxnDrawerOpen, setIsTxnDrawerOpen] = useState(false);
  const [txnDefaultPersonId, setTxnDefaultPersonId] = useState<number | null>(null);
  const [txnDefaultType, setTxnDefaultType] = useState<"PABO" | "DIBO">("PABO");
  const [txnToEdit, setTxnToEdit] = useState<LedgerTransaction | null>(null);

  const [isLedgerViewOpen, setIsLedgerViewOpen] = useState(false);
  const [activeLedgerPerson, setActiveLedgerPerson] = useState<LedgerPerson | null>(null);

  // Delete Modals
  const [isDeletePersonModalOpen, setIsDeletePersonModalOpen] = useState(false);
  const [personToDelete, setPersonToDelete] = useState<LedgerPerson | null>(null);

  const [isDeleteTxnModalOpen, setIsDeleteTxnModalOpen] = useState(false);
  const [txnToDelete, setTxnToDelete] = useState<LedgerTransaction | null>(null);

  const deletePersonMutation = useDeleteLedgerPersonMutation({
    onSuccess: () => {
      setIsDeletePersonModalOpen(false);
      setPersonToDelete(null);
    },
  });

  const deleteTxnMutation = useDeleteLedgerTransactionMutation({
    onSuccess: () => {
      setIsDeleteTxnModalOpen(false);
      setTxnToDelete(null);
    },
  });

  return (
    <div className="flex flex-col gap-2.5 px-3 py-2 sm:px-4 sm:py-2.5 max-w-[1600px] mx-auto w-full">
      {/* Page Header & Top Action Buttons */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          headerTitle="Khatabook"
          headerDescription="Manage all customer and supplier ledger accounts, debits, credits, and balances"
        />

        <div className="flex flex-wrap items-center gap-2">
          <RefreshButton onClick={() => refetch()} isLoading={isLoading || isFetching} />

          {canCreate("khatabook") && (
            <>
              <Button
                label="Record Transaction"
                onClick={() => {
                  setTxnToEdit(null);
                  setTxnDefaultPersonId(null);
                  setTxnDefaultType("PABO");
                  setIsTxnDrawerOpen(true);
                }}
                color="#059669"
                icon={<FaPlus size={11} />}
              />

              <Button
                label="Add Person"
                onClick={() => {
                  setPersonToEdit(null);
                  setIsPersonDrawerOpen(true);
                }}
                color="#009fe3"
                icon={<FaPlus size={11} />}
              />
            </>
          )}
        </div>
      </div>

      {/* KPI Summary Cards matching parties/index.tsx exactly */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 w-full">
        {/* 1. Total Receivable (Pabo) - Emerald */}
        <MotionDiv delay={0.05}>
          <div className="p-3 rounded-xl border bg-[var(--ui-success-light)]/60 border-[var(--ui-success-border)] hover:border-[var(--ui-success-border)] flex items-center justify-between gap-2.5 transition-all shadow-xs h-full">
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-semibold text-[var(--ui-text)] tracking-wider truncate">
                Total Receivable (Pabo)
              </span>
              <span className="text-base sm:text-lg font-bold truncate mt-0.5 text-[var(--ui-success)]">
                ৳ {formatMoney(kpi.totalPabo)}
              </span>
            </div>
            <div className="p-2 rounded-lg shrink-0 bg-[var(--ui-success-border)] text-[var(--ui-success)]">
              <FaMoneyBillWave size={16} />
            </div>
          </div>
        </MotionDiv>

        {/* 2. Total Payable (Dibo) - Danger / Rose */}
        <MotionDiv delay={0.1}>
          <div className="p-3 rounded-xl border bg-[var(--ui-danger-light)]/60 border-[var(--ui-danger-border)] hover:border-[var(--ui-danger-border)] flex items-center justify-between gap-2.5 transition-all shadow-xs h-full">
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-semibold text-[var(--ui-text)] tracking-wider truncate">
                Total Payable (Dibo)
              </span>
              <span className="text-base sm:text-lg font-bold truncate mt-0.5 text-[var(--ui-danger)]">
                ৳ {formatMoney(kpi.totalDibo)}
              </span>
            </div>
            <div className="p-2 rounded-lg shrink-0 bg-[var(--ui-danger-border)] text-[var(--ui-danger)]">
              <FaMoneyBillWave size={16} />
            </div>
          </div>
        </MotionDiv>

        {/* 3. Net Balance - Primary Accent */}
        <MotionDiv delay={0.15}>
          <div className="p-3 rounded-xl border bg-[var(--primary-color-light)]/60 border-[var(--primary-color-muted)] hover:border-[var(--primary-color-muted)] flex items-center justify-between gap-2.5 transition-all shadow-xs h-full">
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-semibold text-[var(--ui-text)] tracking-wider truncate">
                Net Balance
              </span>
              <span className="text-base sm:text-lg font-bold truncate mt-0.5 text-[var(--primary-color)]">
                ৳ {formatMoney(Math.abs(kpi.netBalance))}{" "}
                <span className="text-xs font-normal">
                  {kpi.netBalance > 0 ? "(Pabo)" : kpi.netBalance < 0 ? "(Dibo)" : ""}
                </span>
              </span>
            </div>
            <div className="p-2 rounded-lg shrink-0 bg-[var(--primary-color-muted)] text-[var(--primary-color)]">
              <FaUsers size={16} />
            </div>
          </div>
        </MotionDiv>

        {/* 4. Total Persons - Info */}
        <MotionDiv delay={0.2}>
          <div className="p-3 rounded-xl border bg-[var(--ui-info-light)]/60 border-[var(--ui-info-border)] hover:border-[var(--ui-info-border)] flex items-center justify-between gap-2.5 transition-all shadow-xs h-full">
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-semibold text-[var(--ui-text)] tracking-wider truncate">
                Total Persons
              </span>
              <span className="text-base sm:text-lg font-bold truncate mt-0.5 text-[var(--ui-info)]">
                {kpi.totalPersons}
              </span>
            </div>
            <div className="p-2 rounded-lg shrink-0 bg-[var(--ui-info-border)] text-[var(--ui-info)]">
              <FaUsers size={16} />
            </div>
          </div>
        </MotionDiv>
      </div>

      {/* Persons & Ledger Table */}
      <KhatabookTable
        persons={persons}
        isLoading={isLoading}
        onViewLedger={(person) => {
          setActiveLedgerPerson(person);
          setIsLedgerViewOpen(true);
        }}
        onAddTransaction={(person) => {
          setTxnToEdit(null);
          setTxnDefaultPersonId(person.id);
          setTxnDefaultType("PABO");
          setIsTxnDrawerOpen(true);
        }}
        onEditPerson={(person) => {
          setPersonToEdit(person);
          setIsPersonDrawerOpen(true);
        }}
        onDeletePerson={(person) => {
          setPersonToDelete(person);
          setIsDeletePersonModalOpen(true);
        }}
      />

      {/* Person Form Drawer (Add / Edit) */}
      <PersonFormModal
        isOpen={isPersonDrawerOpen}
        onClose={() => {
          setIsPersonDrawerOpen(false);
          setPersonToEdit(null);
        }}
        personToEdit={personToEdit}
      />

      {/* Person Detailed Ledger View (DrawerModal) */}
      <PersonLedgerView
        isOpen={isLedgerViewOpen}
        onClose={() => {
          setIsLedgerViewOpen(false);
          setActiveLedgerPerson(null);
        }}
        person={activeLedgerPerson}
        onAddTransaction={(type) => {
          if (!activeLedgerPerson) return;
          setTxnToEdit(null);
          setTxnDefaultPersonId(activeLedgerPerson.id);
          setTxnDefaultType(type);
          setIsTxnDrawerOpen(true);
        }}
        onEditTransaction={(txn) => {
          setTxnToEdit(txn);
          setTxnDefaultPersonId(txn.personId);
          setIsTxnDrawerOpen(true);
        }}
        onDeleteTransaction={(txn) => {
          setTxnToDelete(txn);
          setIsDeleteTxnModalOpen(true);
        }}
      />

      {/* Transaction Form Drawer (Create / Edit) */}
      <TransactionFormModal
        isOpen={isTxnDrawerOpen}
        onClose={() => {
          setIsTxnDrawerOpen(false);
          setTxnToEdit(null);
          setTxnDefaultPersonId(null);
        }}
        defaultPersonId={txnDefaultPersonId}
        defaultType={txnDefaultType}
        transactionToEdit={txnToEdit}
        zIndex="z-[60]"
      />

      {/* Delete Person Modal */}
      <DeleteModal
        isOpen={isDeletePersonModalOpen}
        title="Delete Person Confirmation"
        message={`Are you sure you want to delete "${personToDelete?.name}" from Khatabook? Note: If this person has existing transactions, they must be deleted first.`}
        onClose={() => {
          setIsDeletePersonModalOpen(false);
          setPersonToDelete(null);
        }}
        onDelete={() => {
          if (personToDelete?.id) {
            deletePersonMutation.mutate(personToDelete.id);
          }
        }}
      />

      {/* Delete Transaction Modal */}
      <DeleteModal
        isOpen={isDeleteTxnModalOpen}
        title="Delete Transaction Confirmation"
        message={`Are you sure you want to delete this transaction (${txnToDelete?.transactionType} - ৳${txnToDelete?.amount})? Deleting it will restore the corresponding source balance.`}
        onClose={() => {
          setIsDeleteTxnModalOpen(false);
          setTxnToDelete(null);
        }}
        onDelete={() => {
          if (txnToDelete?.id) {
            deleteTxnMutation.mutate(txnToDelete.id);
          }
        }}
      />
    </div>
  );
};

export default KhatabookPage;
