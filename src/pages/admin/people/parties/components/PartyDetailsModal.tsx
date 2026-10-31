import React from "react";
import { FiEdit } from "react-icons/fi";
import Modal from "@/components/modal/Modal";
import type { PartyItem } from "@/types";

interface PartyDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  party: PartyItem | null;
  onEdit: (party: PartyItem) => void;
}

export const PartyDetailsModal: React.FC<PartyDetailsModalProps> = ({
  isOpen,
  onClose,
  party,
  onEdit,
}) => {
  if (!party) return null;

  const rawType = (party.type || "CUSTOMER").toUpperCase();
  const isSupplier = rawType === "SUPPLIER";
  const name = party.name || "Unnamed Party";
  const partyCode = (party as any).partyCode || (party as any).code || "";
  const phone = party.phone || "—";
  const altPhone = (party as any).alternatePhone || "—";
  const email = party.email || "—";
  const address = (party.address || "").trim();
  const area = ((party as any).area || (party as any).city || "").trim();
  const fullAddress = address ? (area ? `${address}, ${area}` : address) : (area || "N/A");
  const balance = Number(party.openingBalance ?? party.balance ?? 0);
  const creditLimit = (party as any).creditLimit;
  const note = party.note || "";
  
  const rawStatus = String(party.status ?? "active").trim().toLowerCase();
  const isActive = rawStatus !== "inactive" && rawStatus !== "false" && rawStatus !== "0";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Party Quick View"
      maxWidth="w-full max-w-2xl"
    >
      <div className="space-y-3.5 text-[var(--ui-text)]">
        {/* Header info - single line */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[var(--ui-border)]">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="text-base font-semibold text-[var(--ui-text)]">
              {name}
            </h3>
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold border ${
                isSupplier
                  ? "bg-[var(--ui-info-border)] text-[var(--ui-info-dark)] border-[var(--ui-info-border)]"
                  : "bg-[var(--primary-color-muted)] text-[var(--primary-color-dark)] border-[var(--primary-color-muted)]"
              }`}
            >
              {isSupplier ? "Supplier" : "Customer"}
            </span>
            {partyCode && (
              <span className="text-xs   text-[var(--ui-text-muted)]">
                (Code: {partyCode})
              </span>
            )}
          </div>
          <div>
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold border ${
                isActive
                  ? "bg-[var(--ui-success-border)] text-[var(--ui-success-dark)] border-[var(--ui-success-border)]"
                  : "bg-[var(--ui-danger-border)] text-[var(--ui-danger-dark)] border-[var(--ui-danger-border)]"
              }`}
            >
              {isActive ? "Active" : "Inactive"}
            </span>
          </div>
        </div>

        {/* Financial & Balances */}
        <div>
          <h4 className="text-xs font-semibold tracking-wider text-[var(--ui-text)] mb-1.5">
            Financial & Account Summary
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="px-3 py-2 bg-[var(--ui-surface-muted)] rounded-lg border border-[var(--ui-border)]">
              <span className="text-xs text-[var(--ui-text)] block mb-0.5">Opening Balance / Due</span>
              <span className="text-sm font-semibold text-[var(--ui-text)]">
                ৳{balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="px-3 py-2 bg-[var(--ui-surface-muted)] rounded-lg border border-[var(--ui-border)]">
              <span className="text-xs text-[var(--ui-text)] block mb-0.5">Credit Limit</span>
              <span className="text-sm font-medium text-[var(--ui-text)]">
                {creditLimit ? `৳${Number(creditLimit).toLocaleString("en-IN")}` : "No Limit Set"}
              </span>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div>
          <h4 className="text-xs font-semibold tracking-wider text-[var(--ui-text)] mb-1.5">
            Contact Information
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="px-3 py-2 bg-[var(--ui-surface-muted)] rounded-lg border border-[var(--ui-border)]">
              <span className="text-xs text-[var(--ui-text)] block mb-0.5">Primary Phone</span>
              <span className="text-sm font-medium text-[var(--ui-text)]">{phone}</span>
            </div>
            <div className="px-3 py-2 bg-[var(--ui-surface-muted)] rounded-lg border border-[var(--ui-border)]">
              <span className="text-xs text-[var(--ui-text)] block mb-0.5">Email Address</span>
              <span className="text-sm font-medium text-[var(--ui-text)] truncate block">{email}</span>
            </div>
            {altPhone && altPhone !== "—" && (
              <div className="px-3 py-2 bg-[var(--ui-surface-muted)] rounded-lg border border-[var(--ui-border)]">
                <span className="text-xs text-[var(--ui-text)] block mb-0.5">Alternative Phone</span>
                <span className="text-sm font-medium text-[var(--ui-text)]">{altPhone}</span>
              </div>
            )}
            <div className="px-3 py-2 bg-[var(--ui-surface-muted)] rounded-lg border border-[var(--ui-border)] sm:col-span-2">
              <span className="text-xs text-[var(--ui-text)] block mb-0.5">Address / Location</span>
              <span className="text-xs font-medium text-[var(--ui-text)]">{fullAddress}</span>
            </div>
          </div>
        </div>

        {/* Note / Remarks (if any) */}
        {note && (
          <div>
            <h4 className="text-xs font-semibold tracking-wider text-[var(--ui-text)] mb-1.5">
              Note / Remarks
            </h4>
            <div className="px-3 py-2 bg-[var(--ui-surface-muted)] rounded-lg border border-[var(--ui-border)] text-xs font-medium text-[var(--ui-text)]">
              {note}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-2.5 border-t border-[var(--ui-border)] flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-[var(--ui-text)] bg-[var(--ui-surface-sunken)] hover:bg-[var(--ui-border)] rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onEdit(party);
            }}
            className="px-4 py-1.5 text-xs font-medium text-white bg-[var(--color-primary,#009FE3)] hover:opacity-90 rounded-lg transition-opacity inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <FiEdit className="w-3.5 h-3.5" />
            Edit Party
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default PartyDetailsModal;
