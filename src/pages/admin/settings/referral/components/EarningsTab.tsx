import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FaCoins,
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
  FaSpinner,
} from "react-icons/fa";
import { useReferralEarningsQuery } from "@/hooks/useReferralQueries";
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

interface EarningsTabProps {
  userId: number | string;
}

export const EarningsTab: React.FC<EarningsTabProps> = ({ userId }) => {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(15);
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const { data, isLoading } = useReferralEarningsQuery(userId, {
    page,
    size,
    type: typeFilter,
    status: statusFilter,
  });

  const earnings = data?.content || [];
  const totalElements = data?.totalElements || 0;

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "AVAILABLE":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <FaCheckCircle className="text-[8px]" /> {t("Available")}
          </span>
        );
      case "HELD":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <FaClock className="text-[8px]" /> {t("Held")}
          </span>
        );
      case "PAID":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <FaCheckCircle className="text-[8px]" /> {t("Paid")}
          </span>
        );
      case "REVERSED":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
            <FaTimesCircle className="text-[8px]" /> {t("Reversed")}
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
      {/* ── Toolbar with Filters ── */}
      <div className="p-2 sm:p-2.5 border-b border-[var(--ui-border)] flex flex-wrap items-center justify-between gap-2 bg-[var(--ui-surface-muted)]/20">
        <div className="flex items-center gap-2">
          <FaCoins className="text-[var(--color-primary)]" size={12} />
          <h3 className="font-bold text-xs text-[var(--ui-text)]">
            {t("Commission Earnings")}
          </h3>
          <span className="px-1.5 py-0.5 rounded bg-[var(--ui-surface-muted)] border border-[var(--ui-border)] text-[10px] font-mono font-semibold text-[var(--ui-text-muted)]">
            {totalElements}
          </span>
        </div>

        {/* Filter Selects */}
        <div className="flex items-center gap-1.5">
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(0);
            }}
            className="text-[11px] rounded-lg border border-[var(--ui-border)] bg-white px-2 py-1 text-[var(--ui-text)] focus:border-[var(--primary-color)] focus:outline-hidden"
          >
            <option value="ALL">{t("Type")}: {t("All")}</option>
            <option value="FIRST_SALE">{t("First Sale")}</option>
            <option value="RENEWAL">{t("Renewal")}</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            className="text-[11px] rounded-lg border border-[var(--ui-border)] bg-white px-2 py-1 text-[var(--ui-text)] focus:border-[var(--primary-color)] focus:outline-hidden"
          >
            <option value="ALL">{t("Status")}: {t("All")}</option>
            <option value="AVAILABLE">{t("Available")}</option>
            <option value="HELD">{t("Held")}</option>
            <option value="PAID">{t("Paid")}</option>
            <option value="REVERSED">{t("Reversed")}</option>
          </select>
        </div>
      </div>

      {/* ── Table Content ── */}
      <div className="w-full overflow-x-auto">
        <Table minWidth={700}>
          <TableHead>
            <TableTh align="left" width={110}>{t("Date")}</TableTh>
            <TableTh align="center" width={110}>{t("Type")}</TableTh>
            <TableTh align="center" width={110}>{t("Status")}</TableTh>
            <TableTh align="right" width={110}>{t("Amount")}</TableTh>
            <TableTh align="center" width={80}>Rate</TableTh>
            <TableTh align="left">{t("Reference")}</TableTh>
          </TableHead>
          <TableBody className="text-[11px]">
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" className="py-8 text-[var(--ui-text-muted)]">
                  <div className="flex items-center justify-center gap-1.5">
                    <FaSpinner className="animate-spin text-[var(--color-primary)]" size={12} />
                    <span>Loading...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : earnings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" className="py-6">
                  <EmptyState title="No earnings found" description="No commission earnings recorded yet." />
                </TableCell>
              </TableRow>
            ) : (
              earnings.map((row) => (
                <TableRow key={row.id}>
                  <TableCell align="left" className="font-mono text-[10.5px]">
                    {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell align="center" className="font-medium">
                    {row.type === "FIRST_SALE" ? t("First Sale") : row.type === "RENEWAL" ? t("Renewal") : row.type}
                  </TableCell>
                  <TableCell align="center">{getStatusBadge(row.status)}</TableCell>
                  <TableCell align="right" className="font-bold font-mono text-emerald-700">
                    +{formatTaka(row.amountPoisha)}
                  </TableCell>
                  <TableCell align="center" className="font-mono text-[var(--ui-text-muted)]">
                    {row.ratePct ? `${row.ratePct}%` : "—"}
                  </TableCell>
                  <TableCell align="left" className="font-mono text-[10.5px] text-[var(--ui-text-muted)]">
                    {row.orderReference || row.referenceId || "—"}
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
