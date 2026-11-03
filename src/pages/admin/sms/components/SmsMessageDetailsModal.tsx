import React, { useState } from "react";
import {
  FaCheckCircle,
  FaCopy,
  FaCheck,
  FaRedo,
  FaPhoneAlt,
  FaCalendarAlt,
  FaCoins,
} from "react-icons/fa";
import Modal from "@/components/modal/Modal";
import Button from "@/components/button/Button";
import type { SmsHistoryItem } from "@/types";

interface SmsMessageDetailsModalProps {
  item: SmsHistoryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onResend?: (item: SmsHistoryItem) => void;
}

export const SmsMessageDetailsModal: React.FC<SmsMessageDetailsModalProps> = ({
  item,
  isOpen,
  onClose,
  onResend,
}) => {
  const [copied, setCopied] = useState(false);

  if (!item) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(item.message);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const formattedDate = item.sentAt
    ? (() => {
        const d = new Date(item.sentAt);
        return isNaN(d.getTime())
          ? String(item.sentAt)
          : d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
      })()
    : "—";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="SMS Message Details" maxWidth="max-w-md">
      <div className="space-y-3.5 text-xs">
        {/* Recipient & Status Strip */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--ui-surface-muted)] border border-[var(--ui-border)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--primary-color-light)] text-[var(--primary-color)] flex items-center justify-center shrink-0">
              <FaPhoneAlt size={12} />
            </div>
            <div>
              <div className="font-bold text-[var(--ui-text)] text-xs font-mono">
                {item.recipientPhone}
              </div>
              <div className="text-[10px] text-[var(--ui-text-muted)]">
                Recipient Number
              </div>
            </div>
          </div>

          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <FaCheckCircle size={10} />
            {item.status}
          </span>
        </div>

        {/* Message Content Box */}
        <div>
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--ui-text-muted)] mb-1">
            <span>Message Content</span>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 text-[11px] text-[var(--primary-color)] hover:underline cursor-pointer"
            >
              {copied ? (
                <>
                  <FaCheck size={10} className="text-emerald-600" /> Copied
                </>
              ) : (
                <>
                  <FaCopy size={10} /> Copy Text
                </>
              )}
            </button>
          </div>
          <div className="p-3 rounded-xl bg-[var(--ui-surface)] border border-[var(--ui-border)] text-xs text-[var(--ui-text)] leading-relaxed whitespace-pre-wrap select-text">
            {item.message}
          </div>
        </div>

        {/* Transmission Meta Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-lg bg-[var(--ui-surface-muted)] border border-[var(--ui-border)]">
            <span className="text-[10px] text-[var(--ui-text-muted)] block">Date & Time</span>
            <span className="font-semibold text-[var(--ui-text)] flex items-center gap-1.5 mt-0.5">
              <FaCalendarAlt size={10} className="text-[var(--ui-text-subtle)]" />
              {formattedDate}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-[var(--ui-surface-muted)] border border-[var(--ui-border)]">
            <span className="text-[10px] text-[var(--ui-text-muted)] block">Credits Consumed</span>
            <span className="font-semibold text-[var(--ui-text)] flex items-center gap-1.5 mt-0.5">
              <FaCoins size={10} className="text-amber-500" />
              {item.creditsUsed} {item.creditsUsed === 1 ? "Credit" : "Credits"} ({item.partsCount} {item.partsCount === 1 ? "part" : "parts"})
            </span>
          </div>
        </div>

        {/* Masking Route Info */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--ui-surface-muted)] border border-[var(--ui-border)] text-[11px]">
          <span className="text-[var(--ui-text-muted)]">Sender ID Masking:</span>
          <strong className="text-[var(--ui-text)]">Cash Boi</strong>
        </div>

        {/* Modal Action Buttons */}
        <div className="flex justify-end items-center gap-2 mt-1 pt-2.5 border-t border-[var(--ui-border)]">
          <Button
            label="Close"
            type="button"
            onClick={onClose}
            color="#6b7280"
            hoverColor="#4b5563"
            buttonClass="!text-xs !py-1.5 !px-3.5"
          />
          {onResend && (
            <Button
              label="Resend Message"
              type="button"
              onClick={() => {
                onClose();
                onResend(item);
              }}
              color="#009fe3"
              hoverColor="#0085be"
              icon={<FaRedo className="text-white text-xs" />}
              buttonClass="!text-xs !py-1.5 !px-4 font-bold"
            />
          )}
        </div>
      </div>
    </Modal>
  );
};

export default SmsMessageDetailsModal;
