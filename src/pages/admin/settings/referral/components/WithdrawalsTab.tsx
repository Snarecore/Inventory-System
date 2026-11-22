import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FaWallet,
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
  FaSpinner,
  FaPlus,
} from "react-icons/fa";
import { useReferralWithdrawalsQuery } from "@/hooks/useReferralQueries";
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

interface WithdrawalsTabProps {
  userId: number | string;
  onOpenWithdraw: () => void;
}

export const WithdrawalsTab: React.FC<WithdrawalsTabProps> = ({
  userId,
  onOpenWithdraw,
}) => {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(15);

  const { data, isLoading } = useReferralWithdrawalsQuery(userId, page, size);

  const withdrawals = data?.content || [];
  const totalElements = data?.totalElements || 0;

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "PAID":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <FaCheckCircle className="text-[8px]" /> {t("Paid")}
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <FaClock className="text-[8px]" /> {t("Pending")}
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
            <FaTimesCircle className="text-[8px]" /> {t("Rejected")}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-50 text-gray-700 border border-gray-200">
            {status || "—"}
          </span>
        );
    }
  };

  return (
    <div className="bg-[var(--ui-surface)] rounded-xl border border-[var(--ui-border)] shadow-xs overflow-hidden">
      {/* ── Title Bar ── */}
      <div className="p-2 sm:p-2.5 border-b border-[var(--ui-border)] flex items-center justify-between bg-[var(--ui-surface-muted)]/20">
        <div className="flex items-center gap-2">
          <FaWallet className="text-[var(--color-primary)]" size={12} />
          <h3 className="font-bold text-xs text-[var(--ui-text)]">
            {t("Payout History")}
          </h3>
          <span className="px-1.5 py-0.5 rounded bg-[var(--ui-surface-muted)] border border-[var(--ui-border)] text-[10px] font-mono font-semibold text-[var(--ui-text-muted)]">
            {totalElements}
          </span>
        </div>

        <button
          type="button"
          onClick={onOpenWithdraw}
          className="inline-flex items-center gap-1 px-2.5 py-1 bg-[var(--primary-color)] hover:brightness-110 text-white text-[11px] font-semibold rounded-lg shadow-xs transition cursor-pointer"
        >
          <FaPlus size={9} />
          <span>{t("Request Payout")}</span>
        </button>
      </div>

      {/* ── Table Content ── */}
      <div className="w-full overflow-x-auto">
        <Table minWidth={650}>
          <TableHead>
            <TableTh align="left" width={110}>{t("Date")}</TableTh>
            <TableTh align="right" width={110}>{t("Amount")}</TableTh>
            <TableTh align="left" width={180}>Method / Account</TableTh>
            <TableTh align="center" width={110}>{t("Status")}</TableTh>
            <TableTh align="left">{t("Reference")}</TableTh>
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
            ) : withdrawals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" className="py-6">
                  <EmptyState
                    title="No withdrawal requests found"
                    description="You haven't requested any payouts yet."
                    buttonText="Request Payout"
                    onButtonClick={onOpenWithdraw}
                  />
                </TableCell>
              </TableRow>
            ) : (
              withdrawals.map((w) => (
                <TableRow key={w.id}>
                  <TableCell align="left" className="font-mono text-[10.5px]">
                    {w.createdAt ? new Date(w.createdAt).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell align="right" className="font-bold font-mono text-[var(--ui-text)]">
                    {formatTaka(w.amountPoisha)}
                  </TableCell>
                  <TableCell align="left">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-xs">{w.method}</span>
                      <span className="text-[10.5px] font-mono text-[var(--ui-text-muted)]">
                        {w.accountNumberMasked || w.accountNumber || "—"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell align="center">{getStatusBadge(w.status)}</TableCell>
                  <TableCell align="left" className="text-[10.5px] font-mono text-[var(--ui-text-muted)]">
                    {w.referenceId || w.remarks || "—"}
                  </TableCell>
                </TableRow>
              ))
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
