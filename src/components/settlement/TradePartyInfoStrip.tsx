import React from "react";
import { FaPhoneAlt } from "react-icons/fa";
import { formatMoney } from "@/utils/formatters";

export interface TradePartyInfoStripProps {
  name?: string;
  phone?: string;
  totalDue?: number;
  partyType?: "customer" | "supplier";
}

export const TradePartyInfoStrip: React.FC<TradePartyInfoStripProps> = ({
  name = "Party",
  phone,
  totalDue = 0,
}) => {
  const initial = (name || "P").charAt(0).toUpperCase();

  return (
    <div className="flex items-center justify-between gap-2 py-1 px-3 bg-[var(--ui-surface-muted)] border border-[var(--ui-border)] rounded-lg text-xs">
      {/* Avatar, Name, Phone in single line */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-6 h-6 rounded-full bg-[var(--primary-color)] text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
          {initial}
        </div>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-bold text-[var(--ui-text)] truncate">
            {name}
          </span>
          {phone && (
            <>
              <span className="text-[var(--ui-text-muted)] text-[10px]">•</span>
              <span className="text-[11px] text-[var(--ui-text-muted)] flex items-center gap-1 shrink-0 font-normal">
                <FaPhoneAlt size={9} />
                {phone}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Total Due badge in single line */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[10px] text-[var(--ui-text-muted)] uppercase tracking-wider font-semibold">
          Total Due:
        </span>
        <span className="font-bold text-sm text-[var(--primary-color)]">
          ৳{formatMoney(totalDue)}
        </span>
      </div>
    </div>
  );
};

export default TradePartyInfoStrip;
