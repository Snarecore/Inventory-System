import React from "react";
import { useTranslation } from "react-i18next";
import {
  FaShieldAlt,
  FaClock,
  FaWallet,
  FaCreditCard,
} from "react-icons/fa";
import type { ReferralConfig } from "@/types/referral.types";
import { formatTaka } from "@/services/referral-service";
import Table, {
  TableHead,
  TableTh,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/table-components/Table";

interface ProgramRulesTabProps {
  config: ReferralConfig | null;
}

export const ProgramRulesTab: React.FC<ProgramRulesTabProps> = ({ config }) => {
  const { t, i18n } = useTranslation();
  const isBn = i18n.language === "bn";

  const tiers = config?.tiers || [];
  const holdDays = config?.holdDays ?? 0;
  const minWithdrawalPoisha = config?.minWithdrawalPoisha ?? 0;
  const payoutMethods = config?.payoutMethods || [];

  return (
    <div className="space-y-2">
      {/* ── Key Parameters Badges ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="bg-[var(--ui-surface)] rounded-xl border border-[var(--ui-border)] p-2.5 shadow-xs flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <FaClock size={12} />
          </div>
          <div>
            <span className="text-[10.5px] font-semibold text-[var(--ui-text-muted)] block">
              Commission Hold Period
            </span>
            <span className="text-xs font-bold text-[var(--ui-text)]">
              {holdDays} {holdDays === 1 ? "Day" : "Days"}
            </span>
          </div>
        </div>

        <div className="bg-[var(--ui-surface)] rounded-xl border border-[var(--ui-border)] p-2.5 shadow-xs flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <FaWallet size={12} />
          </div>
          <div>
            <span className="text-[10.5px] font-semibold text-[var(--ui-text-muted)] block">
              {t("Minimum Withdrawal")}
            </span>
            <span className="text-xs font-bold text-[var(--ui-text)]">
              {formatTaka(minWithdrawalPoisha)}
            </span>
          </div>
        </div>

        <div className="bg-[var(--ui-surface)] rounded-xl border border-[var(--ui-border)] p-2.5 shadow-xs flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <FaCreditCard size={12} />
          </div>
          <div>
            <span className="text-[10.5px] font-semibold text-[var(--ui-text-muted)] block">
              Supported Payout Methods
            </span>
            <div className="flex items-center gap-1 mt-0.5">
              {payoutMethods.length > 0 ? (
                payoutMethods.map((m) => (
                  <span
                    key={m}
                    className="px-1.5 py-0.2 rounded bg-[var(--ui-surface-muted)] border border-[var(--ui-border)] font-bold font-mono text-[9.5px] text-[var(--ui-text)]"
                  >
                    {m}
                  </span>
                ))
              ) : (
                <span className="text-[11px] text-[var(--ui-text)] font-semibold">bKash, Nagad</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tiers Table Card ── */}
      <div className="bg-[var(--ui-surface)] rounded-xl border border-[var(--ui-border)] shadow-xs overflow-hidden">
        <div className="p-2 sm:p-2.5 border-b border-[var(--ui-border)] flex items-center gap-1.5 bg-[var(--ui-surface-muted)]/20">
          <FaShieldAlt className="text-[var(--color-primary)]" size={12} />
          <h3 className="font-bold text-xs text-[var(--ui-text)]">
            Affiliate Tiers & Commission Matrix
          </h3>
        </div>

        <div className="w-full overflow-x-auto">
          <Table minWidth={600}>
            <TableHead>
              <TableTh align="left">Tier Name</TableTh>
              <TableTh align="center" width={140}>Min Monthly Sales</TableTh>
              <TableTh align="right" width={120}>{t("First Sale")}</TableTh>
              <TableTh align="right" width={120}>{t("Renewal")}</TableTh>
              <TableTh align="left" width={140}>Target Hours</TableTh>
            </TableHead>
            <TableBody className="text-[11px]">
              {tiers.map((tRow) => {
                const label = isBn ? tRow.labelBn || tRow.label : tRow.label || tRow.tier;
                return (
                  <TableRow key={tRow.tier}>
                    <TableCell align="left" className="font-bold text-[var(--ui-text)]">
                      <div>{label}</div>
                      <span className="text-[9.5px] font-normal text-[var(--ui-text-muted)] font-mono">
                        {tRow.tier}
                      </span>
                    </TableCell>
                    <TableCell align="center" className="font-mono text-[var(--ui-text)]">
                      {tRow.minMonthlySales}+ sales
                    </TableCell>
                    <TableCell align="right" className="font-bold font-mono text-emerald-700">
                      {tRow.firstSalePct}%
                    </TableCell>
                    <TableCell align="right" className="font-bold font-mono text-blue-700">
                      {tRow.renewalPct}%
                    </TableCell>
                    <TableCell align="left" className="text-[var(--ui-text-muted)] font-mono text-[10.5px]">
                      {isBn ? tRow.hoursBn || "—" : tRow.hoursEn || tRow.hoursBn || "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};
