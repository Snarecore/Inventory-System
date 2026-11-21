import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import moment from "moment";
import {
  FaSearch,
  FaTimes,
  FaSpinner,
  FaFileInvoice,
  FaArrowRight,
  FaCalendarAlt,
  FaUser,
  FaPhoneAlt,
} from "react-icons/fa";
import { formatMoney } from "@/utils/formatters";

export interface TradeInvoiceReturnSelectorProps {
  mode: "sale" | "purchase";
  orders: any[];
  isLoading: boolean;
  selectedOrder: any | null;
  onSelectOrder: (order: any) => void;
  onClearOrder: () => void;
  isOrderAlreadyReturned: (order: any) => boolean;
}

const cleanString = (val: unknown): string =>
  String(val || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();

export const TradeInvoiceReturnSelector: React.FC<TradeInvoiceReturnSelectorProps> = ({
  mode,
  orders,
  isLoading,
  selectedOrder,
  onSelectOrder,
  onClearOrder,
  isOrderAlreadyReturned,
}) => {
  const { t } = useTranslation();
  const isSale = mode === "sale";
  const [searchQuery, setSearchQuery] = useState("");

  // Extract ONLY returnable candidate invoices (strictly filter out returns and already returned invoices)
  const candidateInvoices = useMemo(() => {
    if (!Array.isArray(orders)) return [];
    return orders.filter((item: any) => {
      if (!item || typeof item !== "object") return false;
      // Exclude return voucher records themselves
      if (item.isReturnRecord === true) return false;
      if (item.returnNo && !item.salesInvoiceNo && !item.orderNo && !item.purchaseInvoiceNo) return false;

      // Must have some identifier
      const hasIdentifier = Boolean(
        item.salesInvoiceNo ||
        item.purchaseInvoiceNo ||
        item.invoiceNo ||
        item.orderNo ||
        item.challanNo ||
        item.id
      );
      if (!hasIdentifier) return false;

      // STRICT: Show ONLY invoices that can be returned!
      if (isOrderAlreadyReturned(item)) return false;

      return true;
    });
  }, [orders, isOrderAlreadyReturned]);

  // Filter returnable invoices based on search query
  const filteredInvoices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const cleanQ = cleanString(q);

    let list = candidateInvoices;

    if (q) {
      list = list.filter((cand: any) => {
        const invNo = String(
          isSale
            ? cand.salesInvoiceNo || cand.invoiceNo
            : cand.purchaseInvoiceNo || cand.invoiceNo || ""
        ).toLowerCase();
        const ordNo = String(cand.orderNo || cand.challanNo || cand.id || "").toLowerCase();
        const partyName = String(
          isSale
            ? cand.customerName || cand.name
            : cand.supplierName || cand.name || ""
        ).toLowerCase();
        const partyPhone = String(
          isSale
            ? cand.customerPhone || cand.phone
            : cand.supplierPhone || cand.phone || ""
        ).toLowerCase();

        const matchInv = invNo.includes(q) || cleanString(invNo).includes(cleanQ);
        const matchOrd = ordNo.includes(q) || cleanString(ordNo).includes(cleanQ);
        const matchParty = partyName.includes(q);
        const matchPhone = partyPhone.includes(q) || cleanString(partyPhone).includes(cleanQ);

        return matchInv || matchOrd || matchParty || matchPhone;
      });
    }

    return list.slice(0, 30); // Show up to 30 most relevant returnable invoices
  }, [candidateInvoices, searchQuery, isSale]);

  // If order is already selected, this component renders in "compact / change" mode
  if (selectedOrder) {
    return (
      <button
        type="button"
        onClick={onClearOrder}
        className="px-2.5 py-1 text-xs font-semibold rounded-md border border-[var(--ui-border)] bg-[var(--ui-surface-sunken)] hover:bg-[var(--ui-border)] text-[var(--ui-text)] flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
        title={t("Search or select another invoice")}
      >
        <FaSearch size={10} className="text-[var(--primary-color)]" />
        <span>{t("Change Invoice")}</span>
      </button>
    );
  }

  return (
    <div className="bg-[var(--ui-surface)] p-2.5 sm:p-3 rounded-lg border border-[var(--ui-border)] shadow-xs flex flex-col gap-2.5">
      {/* Search Input Bar (Full Width) */}
      <div className="relative w-full">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--ui-text-muted)]">
          {isLoading ? (
            <FaSpinner className="animate-spin text-[var(--primary-color)] text-xs" />
          ) : (
            <FaSearch className="text-xs" />
          )}
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={
            isSale
              ? t("Search sales invoice (#000354, 017..., customer name)...")
              : t("Search purchase invoice (#INV..., supplier name)...")
          }
          className="w-full pl-9 pr-9 py-2 text-xs rounded-lg border border-[var(--ui-border-strong)] bg-[var(--ui-surface)] text-[var(--ui-text)] placeholder-[var(--ui-text-muted)] focus:outline-none focus:border-[var(--primary-color)] focus:ring-1 focus:ring-[var(--primary-color)] transition-all font-medium"
          autoFocus
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] cursor-pointer"
            title="Clear search"
          >
            <FaTimes className="text-xs" />
          </button>
        )}
      </div>

      {/* Invoices List / Results Container */}
      <div className="border border-[var(--ui-border)] rounded-lg overflow-hidden bg-[var(--ui-surface-sunken)]/40">
        <div className="px-3 py-1.5 bg-[var(--ui-surface-muted)] border-b border-[var(--ui-border)] flex items-center justify-between text-[11px] font-semibold text-[var(--ui-text-muted)]">
          <span>
            {searchQuery
              ? `${t("Matching Invoices")} (${filteredInvoices.length})`
              : `${t("Recent Invoices")} (${filteredInvoices.length})`}
          </span>
          <span className="hidden sm:inline text-[10px] text-[var(--ui-text-muted)]">
            {t("Click an invoice to load return items")}
          </span>
        </div>

        <div className="max-h-[340px] overflow-y-auto overflow-x-auto divide-y divide-[var(--ui-border)]">
          {isLoading && filteredInvoices.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center justify-center gap-2 text-[var(--ui-text-muted)]">
              <FaSpinner className="animate-spin text-[var(--primary-color)] text-lg" />
              <p className="text-xs">{t("Loading invoices from server...")}</p>
            </div>
          ) : filteredInvoices.length > 0 ? (
            filteredInvoices.map((inv: any, idx: number) => {
              const invNo = isSale
                ? inv.salesInvoiceNo || inv.invoiceNo || inv.orderNo
                : inv.purchaseInvoiceNo || inv.invoiceNo || inv.challanNo;
              const ordNo = inv.orderNo || inv.challanNo || inv.id;
              const partyName = isSale
                ? inv.customerName || inv.customer_name || "Customer"
                : inv.supplierName || inv.supplier_name || "Supplier";
              const partyPhone = isSale
                ? inv.customerPhone || inv.customer_phone
                : inv.supplierPhone || inv.supplier_phone;
              const invDate = inv.salesDate || inv.date || inv.createdAt;
              const totalAmount = Number(inv.grandTotal ?? inv.totalAmount ?? 0);

              return (
                <div
                  key={inv.id || invNo || idx}
                  onClick={() => onSelectOrder(inv)}
                  className="px-3 py-2 flex items-center justify-between gap-4 flex-nowrap whitespace-nowrap min-w-full transition-all bg-[var(--ui-surface)] hover:bg-[var(--primary-color-light)]/25 cursor-pointer hover:border-[var(--primary-color)]/30"
                >
                  {/* Single Line Info: Invoice No, Order, Date, Customer & Phone */}
                  <div className="flex items-center gap-2.5 sm:gap-3.5 flex-nowrap whitespace-nowrap min-w-0 shrink">
                    <span className="font-bold text-xs text-[var(--ui-text)] shrink-0">
                      #{invNo || "N/A"}
                    </span>

                    {ordNo && String(ordNo) !== String(invNo) && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--ui-surface-sunken)] border border-[var(--ui-border)] text-[var(--ui-text-muted)] font-mono shrink-0">
                        {t("Order")}: {ordNo}
                      </span>
                    )}

                    {invDate && (
                      <span className="text-[11px] text-[var(--ui-text-muted)] flex items-center gap-1 shrink-0">
                        <FaCalendarAlt size={10} />
                        {moment(invDate).isValid() ? moment(invDate).format("DD MMM YYYY") : String(invDate)}
                      </span>
                    )}

                    <span className="text-[var(--ui-border-strong)] shrink-0">•</span>

                    <span className="font-semibold text-xs text-[var(--ui-text)] flex items-center gap-1 shrink-0">
                      <FaUser size={10} className="text-[var(--ui-text-muted)]" />
                      {partyName}
                    </span>

                    {partyPhone && (
                      <span className="text-[11px] text-[var(--ui-text-muted)] flex items-center gap-1 shrink-0">
                        <FaPhoneAlt size={9} />
                        {partyPhone}
                      </span>
                    )}
                  </div>

                  {/* Right Column: Amount & Action Button on the same single line */}
                  <div className="flex items-center justify-end gap-3 flex-nowrap whitespace-nowrap shrink-0">
                    <div className="flex items-center gap-1 whitespace-nowrap text-right">
                      <span className="text-[10px] text-[var(--ui-text-muted)]">
                        {t("Invoice Total")}:
                      </span>
                      <span className="text-xs font-bold text-[var(--primary-color)] tabular-nums">
                        ৳ {formatMoney(totalAmount)}
                      </span>
                    </div>

                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded text-[11px] font-bold bg-[var(--primary-color)] text-white shadow-xs group-hover:scale-105 transition-transform whitespace-nowrap shrink-0">
                      <span>{t("Select to Return")}</span>
                      <FaArrowRight size={10} />
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-[var(--ui-text-muted)] flex flex-col items-center justify-center gap-1.5">
              <FaFileInvoice className="text-2xl text-[var(--ui-text-muted)]/50" />
              <p className="text-xs font-semibold text-[var(--ui-text)]">
                {t("No invoices found")}
              </p>
              <p className="text-[11px]">
                {searchQuery
                  ? t("Try searching with a different invoice no, phone or customer name")
                  : isSale
                  ? t("No sales invoices available to return")
                  : t("No purchase invoices available to return")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TradeInvoiceReturnSelector;
