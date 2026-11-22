import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FaReceipt,
  FaArrowDown,
  FaArrowUp,
  FaSpinner,
} from "react-icons/fa";
import { useReferralTransactionsQuery } from "@/hooks/useReferralQueries";
import { formatTaka } from "@/services/referral-service";
import Table, {
  TableHead,
  TableTh,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/table-components/Table";
import { TablePaginationFooter } from "@/components/table-components/TablePaginationFooter";
import EmptyState from "@/components/empty-state/EmptyState";

interface TransactionsTabProps {
  userId: number | string;
}

export const TransactionsTab: React.FC<TransactionsTabProps> = ({ userId }) => {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(15);

  const { data, isLoading } = useReferralTransactionsQuery(userId, page, size);

  const transactions = data?.content || [];
  const totalElements = data?.totalElements || 0;

  const getTypeBadge = (type?: string, direction?: string) => {
    const isCredit = direction === "IN" || type?.includes("CREDIT") || type?.includes("COMMISSION");
    return (
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${
          isCredit
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : "bg-rose-50 text-rose-700 border-rose-200"
        }`}
      >
        {isCredit ? <FaArrowDown className="text-[8px]" /> : <FaArrowUp className="text-[8px]" />}
        {isCredit ? t("Credit") : t("Debit")}
      </span>
    );
  };

  return (
    <div className="bg-[var(--ui-surface)] rounded-xl border border-[var(--ui-border)] shadow-xs overflow-hidden">
      {/* ── Title Bar ── */}
      <div className="p-2 sm:p-2.5 border-b border-[var(--ui-border)] flex items-center justify-between bg-[var(--ui-surface-muted)]/20">
        <div className="flex items-center gap-2">
          <FaReceipt className="text-[var(--color-primary)]" size={12} />
          <h3 className="font-bold text-xs text-[var(--ui-text)]">
            {t("Wallet Statement")}
          </h3>
          <span className="px-1.5 py-0.5 rounded bg-[var(--ui-surface-muted)] border border-[var(--ui-border)] text-[10px] font-mono font-semibold text-[var(--ui-text-muted)]">
            {totalElements}
          </span>
        </div>
      </div>

      {/* ── Table Content ── */}
      <div className="w-full overflow-x-auto">
        <Table minWidth={650}>
          <TableHead>
            <TableTh align="left" width={110}>{t("Date")}</TableTh>
            <TableTh align="center" width={100}>{t("Type")}</TableTh>
            <TableTh align="right" width={110}>{t("Amount")}</TableTh>
            <TableTh align="right" width={120}>{t("Balance")}</TableTh>
            <TableTh align="left">{t("Description")}</TableTh>
          </TableHead>
          <TableBody className="text-[11px]">
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} align="center" className="py-8 text-[var(--ui-text-muted)]">
                  <div className="flex items-center justify-center gap-1.5">
                    <FaSpinner className="animate-spin text-[var(--color-primary)]" size={12} />
                    <span>Loading...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" className="py-6">
                  <EmptyState title="No transactions found" description="No wallet activity recorded yet." />
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((tx) => {
                const isCredit =
                  tx.direction === "IN" ||
                  tx.type?.includes("CREDIT") ||
                  tx.type?.includes("COMMISSION");
                return (
                  <TableRow key={tx.id}>
                    <TableCell align="left" className="font-mono text-[10.5px]">
                      {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell align="center">{getTypeBadge(tx.type, tx.direction)}</TableCell>
                    <TableCell
                      align="right"
                      className={`font-bold font-mono ${
                        isCredit ? "text-emerald-700" : "text-rose-700"
                      }`}
                    >
                      {isCredit ? "+" : "-"}
                      {formatTaka(tx.amountPoisha)}
                    </TableCell>
                    <TableCell align="right" className="font-mono text-[var(--ui-text-muted)]">
                      {tx.balanceAfterPoisha != null ? formatTaka(tx.balanceAfterPoisha) : "—"}
                    </TableCell>
                    <TableCell align="left" className="text-[var(--ui-text-muted)] max-w-xs truncate">
                      {tx.description || tx.reference || "—"}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Table Pagination ── */}
      {totalElements > 0 && (
        <div className="p-2 border-t border-[var(--ui-border)]">
          <TablePaginationFooter
            totalCount={totalElements}
            currentPageNumber={page + 1}
            dataLimit={size}
            setDataLimit={setSize}
            setCurrentPageNumber={(p) => setPage(p - 1)}
          />
        </div>
      )}
    </div>
  );
};
