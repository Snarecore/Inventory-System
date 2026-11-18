import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PageHeader from "@/components/page-header/PageHeader";
import Button from "@/components/button/Button";
import RefreshButton from "@/components/table-components/RefreshButton";
import DeleteModal from "@/components/modal/DeleteModal";
import { MotionDiv } from "@/utils/framer.motion";
import { KhatabookTable } from "./components/KhatabookTable";
import { PersonFormModal } from "./components/PersonFormModal";
import { TransactionFormModal } from "./components/TransactionFormModal";
import { PersonHasTransactionsModal } from "./components/PersonHasTransactionsModal";
import {
  useKhatabookDashboardQuery,
  useDeleteLedgerPersonMutation,
  useDeleteLedgerTransactionMutation,
  useDeleteAllTransactionsOfPersonMutation,
} from "@/hooks/useKhatabook";
import { formatMoney } from "@/utils/formatters";
import { showErrorToast } from "@/utils/toast-utils";
import type { LedgerPerson, LedgerTransaction } from "@/types";
import { fetchLedgerTransactionList } from "@/services/khatabook-service";
import { FaPlus, FaUsers, FaMoneyBillWave, FaChartBar } from "react-icons/fa";
import { usePermission } from "@/hooks/usePermission";

export const KhatabookPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { canCreate } = usePermission();
  const { persons, allTransactions, kpi, isLoading, isFetching, refetch } = useKhatabookDashboardQuery();

  // Drawer States
  const [isPersonDrawerOpen, setIsPersonDrawerOpen] = useState(false);
  const [personToEdit, setPersonToEdit] = useState<LedgerPerson | null>(null);

  const [isTxnDrawerOpen, setIsTxnDrawerOpen] = useState(false);
  const [txnDefaultPersonId, setTxnDefaultPersonId] = useState<number | null>(null);
  const [txnDefaultType, setTxnDefaultType] = useState<"PABO" | "DIBO">("PABO");
  const [txnToEdit, setTxnToEdit] = useState<LedgerTransaction | null>(null);

  // Delete Modals
  const [isDeletePersonModalOpen, setIsDeletePersonModalOpen] = useState(false);
  const [personToDelete, setPersonToDelete] = useState<LedgerPerson | null>(null);

  const [isDeleteTxnModalOpen, setIsDeleteTxnModalOpen] = useState(false);
  const [txnToDelete, setTxnToDelete] = useState<LedgerTransaction | null>(null);

  // Modal when person has transactions
  const [isPersonHasTxnsModalOpen, setIsPersonHasTxnsModalOpen] = useState(false);
  const [personWithTxns, setPersonWithTxns] = useState<LedgerPerson | null>(null);

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

  const deleteAllTxnsMutation = useDeleteAllTransactionsOfPersonMutation({
    onSuccess: () => {
      setIsPersonHasTxnsModalOpen(false);
      if (personWithTxns) {
        setPersonToDelete(personWithTxns);
        setIsDeletePersonModalOpen(true);
        setPersonWithTxns(null);
      }
    },
  });

  return (
    <div className="flex flex-col gap-2 px-2.5 py-1.5 sm:px-4 sm:py-2 max-w-[1600px] mx-auto w-full">
      {/* Page Header & Top Action Buttons */}
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          headerTitle="Dena Pawna"
          headerDescription="Manage all customer and supplier ledger accounts, debits, credits, and balances"
        />

        <div className="flex flex-wrap items-center gap-1.5">
          <RefreshButton onClick={() => refetch()} isLoading={isLoading || isFetching} />

          <Button
            label={t("Report")}
            onClick={() => navigate("/admin/reports/khatabook")}
            color="#4f46e5"
            icon={<FaChartBar size={10} />}
            size="sm"
          />

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
                icon={<FaPlus size={10} />}
                size="sm"
              />

              <Button
                label="Add Person"
                onClick={() => {
                  setPersonToEdit(null);
                  setIsPersonDrawerOpen(true);
                }}
                color="#009fe3"
                icon={<FaPlus size={10} />}
                size="sm"
              />
            </>
          )}
        </div>
      </div>

      {/* KPI Summary Cards - Compact & aligned with design system */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 w-full">
        {/* 1. Total Receivable (Pabo) - Emerald */}
        <MotionDiv delay={0.05}>
          <div className="p-2 sm:p-2.5 rounded-lg border bg-[var(--ui-success-light)]/60 border-[var(--ui-success-border)] hover:border-[var(--ui-success-border)] flex items-center justify-between gap-2 transition-all shadow-xs h-full">
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-semibold text-[var(--ui-text-muted)] truncate">
                {t("Receivable (Pabo)")}
              </span>
              <span className="text-sm sm:text-base font-bold truncate mt-0.5 text-[var(--ui-success)]">
                ৳ {formatMoney(kpi.totalPabo)}
              </span>
            </div>
            <div className="p-1.5 rounded-md shrink-0 bg-[var(--ui-success-border)] text-[var(--ui-success)]">
              <FaMoneyBillWave size={14} />
            </div>
          </div>
        </MotionDiv>

        {/* 2. Total Payable (Dibo) - Danger / Rose */}
        <MotionDiv delay={0.1}>
          <div className="p-2 sm:p-2.5 rounded-lg border bg-[var(--ui-danger-light)]/60 border-[var(--ui-danger-border)] hover:border-[var(--ui-danger-border)] flex items-center justify-between gap-2 transition-all shadow-xs h-full">
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-semibold text-[var(--ui-text-muted)] truncate">
                {t("Payable (Dibo)")}
              </span>
              <span className="text-sm sm:text-base font-bold truncate mt-0.5 text-[var(--ui-danger)]">
                ৳ {formatMoney(kpi.totalDibo)}
              </span>
            </div>
            <div className="p-1.5 rounded-md shrink-0 bg-[var(--ui-danger-border)] text-[var(--ui-danger)]">
              <FaMoneyBillWave size={14} />
            </div>
          </div>
        </MotionDiv>

        {/* 3. Net Balance - Primary Accent */}
        <MotionDiv delay={0.15}>
          <div className="p-2 sm:p-2.5 rounded-lg border bg-[var(--primary-color-light)]/60 border-[var(--primary-color-muted)] hover:border-[var(--primary-color-muted)] flex items-center justify-between gap-2 transition-all shadow-xs h-full">
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-semibold text-[var(--ui-text-muted)] truncate">
                {t("Net Balance")}
              </span>
              <span className="text-sm sm:text-base font-bold truncate mt-0.5 text-[var(--primary-color)]">
                ৳ {formatMoney(Math.abs(kpi.netBalance))}{" "}
                <span className="text-[10px] font-normal">
                  {kpi.netBalance > 0 ? ` (${t("Pabo")})` : kpi.netBalance < 0 ? ` (${t("Dibo")})` : ""}
                </span>
              </span>
            </div>
            <div className="p-1.5 rounded-md shrink-0 bg-[var(--primary-color-muted)] text-[var(--primary-color)]">
              <FaUsers size={14} />
            </div>
          </div>
        </MotionDiv>

        {/* 4. Total Commission - Amber */}
        <MotionDiv delay={0.2}>
          <div className="p-2 sm:p-2.5 rounded-lg border bg-amber-50/70 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-800/40 hover:border-amber-300 dark:hover:border-amber-700 flex items-center justify-between gap-2 transition-all shadow-xs h-full">
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-400 truncate">
                {t("Commission")}
              </span>
              <span className="text-sm sm:text-base font-bold truncate mt-0.5 text-amber-600 dark:text-amber-400">
                ৳ {formatMoney(kpi.totalCommission)}
              </span>
            </div>
            <div className="p-1.5 rounded-md shrink-0 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300">
              <FaMoneyBillWave size={14} />
            </div>
          </div>
        </MotionDiv>

        {/* 5. Total Persons - Info */}
        <MotionDiv delay={0.25}>
          <div className="p-2 sm:p-2.5 rounded-lg border bg-[var(--ui-info-light)]/60 border-[var(--ui-info-border)] hover:border-[var(--ui-info-border)] flex items-center justify-between gap-2 transition-all shadow-xs h-full">
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-semibold text-[var(--ui-text-muted)] truncate">
                {t("Total Persons")}
              </span>
              <span className="text-sm sm:text-base font-bold truncate mt-0.5 text-[var(--ui-info)]">
                {kpi.totalPersons}
              </span>
            </div>
            <div className="p-1.5 rounded-md shrink-0 bg-[var(--ui-info-border)] text-[var(--ui-info)]">
              <FaUsers size={14} />
            </div>
          </div>
        </MotionDiv>
      </div>

      {/* Persons & Ledger Table */}
      <KhatabookTable
        persons={persons}
        isLoading={isLoading}
        onViewLedger={(person) => {
          navigate(`/admin/khatabook/${person.id}`, { state: { person } });
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
        onDeletePerson={async (person) => {
          const txnCount = person.transactionCount ?? 0;
          if (txnCount > 0) {
            setPersonWithTxns(person);
            setIsPersonHasTxnsModalOpen(true);
            return;
          }

          try {
            const res = await fetchLedgerTransactionList(person.id);
            const txns = Array.isArray(res)
              ? res
              : Array.isArray(res?.data)
              ? res.data
              : [];
            if (txns.length > 0) {
              setPersonWithTxns({ ...person, transactionCount: txns.length });
              setIsPersonHasTxnsModalOpen(true);
              return;
            }
          } catch {
            // If check fails, allow opening modal
          }

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

      {/* Has Transactions Warning / Action Modal */}
      <PersonHasTransactionsModal
        isOpen={isPersonHasTxnsModalOpen}
        person={personWithTxns}
        onClose={() => {
          setIsPersonHasTxnsModalOpen(false);
          setPersonWithTxns(null);
        }}
        onViewLedger={(person) => {
          setIsPersonHasTxnsModalOpen(false);
          navigate(`/admin/khatabook/${person.id}`, { state: { person } });
        }}
        onDeleteAllTransactions={(person) => {
          if (person?.id) {
            deleteAllTxnsMutation.mutate(person.id);
          }
        }}
        isDeletingTxns={deleteAllTxnsMutation.isPending}
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
        message={`Are you sure you want to delete "${personToDelete?.name}" from Dena Pawna? Note: If this person has existing transactions, they must be deleted first.`}
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
