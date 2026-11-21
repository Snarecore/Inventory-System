import React, { useState, useEffect, useMemo } from "react";
import {
  FiMessageSquare,
  FiX,
  FiSend,
  FiPhone,
  FiSmile,
  FiCheckCircle,
  FiPackage,
  FiInfo,
} from "react-icons/fi";
import { FaCoins, FaSpinner } from "react-icons/fa";
import { useSendSms } from "@/hooks/useSms";
import { getUserInfo } from "@/utils/auth-storage";
import { showErrorToast } from "@/utils/toast-utils";
import type { PartyItem } from "@/types";

interface PartyMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  party: PartyItem | null;
}

interface QuickTemplate {
  id: string;
  label: string;
  banglaLabel: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  iconBg: string;
  iconColor: string;
  template: (name: string, balance: string, business: string) => string;
}

const TEMPLATES: QuickTemplate[] = [
  {
    id: "due",
    label: "Due Reminder",
    banglaLabel: "বকেয়া তাগাদা",
    icon: FaCoins,
    iconBg: "bg-amber-100 dark:bg-amber-950/60",
    iconColor: "text-amber-600 dark:text-amber-400",
    template: (name, balance, business) =>
      `Dear ${name}, your current outstanding balance is ৳${balance}. Kindly settle at your earliest convenience. Thank you - ${business}`,
  },
  {
    id: "greeting",
    label: "Greeting",
    banglaLabel: "শুভেচ্ছা বার্তা",
    icon: FiSmile,
    iconBg: "bg-sky-100 dark:bg-sky-950/60",
    iconColor: "text-sky-600 dark:text-sky-400",
    template: (name, _balance, business) =>
      `Dear ${name}, thank you for choosing ${business}. We value your partnership and look forward to serving you again!`,
  },
  {
    id: "payment",
    label: "Payment Received",
    banglaLabel: "পেমেন্ট প্রাপ্তি",
    icon: FiCheckCircle,
    iconBg: "bg-emerald-100 dark:bg-emerald-950/60",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    template: (name, balance, business) =>
      `Dear ${name}, we have received your payment of ৳${balance}. Thank you for your cooperation! - ${business}`,
  },
  {
    id: "order",
    label: "Order Update",
    banglaLabel: "অর্ডার আপডেট",
    icon: FiPackage,
    iconBg: "bg-indigo-100 dark:bg-indigo-950/60",
    iconColor: "text-indigo-600 dark:text-indigo-400",
    template: (name, _balance, business) =>
      `Dear ${name}, your order has been processed and is ready. Thank you for shopping with ${business}!`,
  },
];

export const PartyMessageModal: React.FC<PartyMessageModalProps> = ({
  isOpen,
  onClose,
  party,
}) => {
  const sendSmsMutation = useSendSms();

  const businessName = useMemo(() => {
    return getUserInfo()?.businessName || "Cash Boi";
  }, []);

  const partyName = party?.name || "Customer";
  const partyBalance = Number(party?.openingBalance ?? party?.balance ?? 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const [phoneNumber, setPhoneNumber] = useState("");
  const [message, setMessage] = useState("");
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);

  // Reset / initialize state whenever modal opens or party changes
  useEffect(() => {
    if (isOpen && party) {
      const initialPhone = (party.phone || "").trim();
      setPhoneNumber(initialPhone);

      // Pre-fill default template if balance is due
      const initialBalanceNum = Number(party.openingBalance ?? party.balance ?? 0);
      if (initialBalanceNum > 0) {
        setActiveTemplateId("due");
        setMessage(TEMPLATES[0].template(partyName, partyBalance, businessName));
      } else {
        setActiveTemplateId("greeting");
        setMessage(TEMPLATES[1].template(partyName, partyBalance, businessName));
      }
    } else {
      setPhoneNumber("");
      setMessage("");
      setActiveTemplateId(null);
    }
  }, [isOpen, party, partyName, partyBalance, businessName]);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Apply Quick Template
  const handleSelectTemplate = (tmpl: QuickTemplate) => {
    setActiveTemplateId(tmpl.id);
    const newText = tmpl.template(partyName, partyBalance, businessName);
    setMessage(newText);
  };

  // SMS length calculation (GSM-7 vs Unicode)
  const smsCalculation = useMemo(() => {
    const len = message.length;
    if (len === 0) return { count: 0, isUnicode: false, maxChars: 160 };

    // Check for non-ASCII / Unicode characters (e.g. Bengali script)
    const isUnicode = /[^\u0000-\u007F]/.test(message);
    const maxChars = isUnicode ? 70 : 160;
    const multiPartMax = isUnicode ? 67 : 153;

    const count = len <= maxChars ? 1 : Math.ceil(len / multiPartMax);
    return { count, isUnicode, maxChars };
  }, [message]);

  const handleSend = () => {
    const cleanPhone = phoneNumber.trim();
    const cleanMsg = message.trim();

    if (!cleanPhone) {
      showErrorToast("Please enter a valid recipient phone number.");
      return;
    }

    if (cleanPhone.length < 10) {
      showErrorToast("Please enter a valid phone number (at least 10-11 digits).");
      return;
    }

    if (!cleanMsg) {
      showErrorToast("Message body cannot be empty.");
      return;
    }

    sendSmsMutation.mutate(
      {
        phoneNumber: cleanPhone,
        msg: cleanMsg,
        type: party?.type || "CUSTOMER",
      },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  };

  if (!isOpen || !party) return null;

  const isCustomer = String(party.type || "CUSTOMER").toUpperCase().includes("CUSTOMER");

  return (
    <div
      className="ui-modal-backdrop fixed inset-0 flex items-center justify-center bg-[color-mix(in_srgb,var(--ui-text)_72%,transparent)] bg-opacity-50 z-[9999] p-2.5 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="ui-modal-panel bg-[var(--ui-surface)] text-[var(--ui-text)] rounded-xl shadow-2xl w-[420px] max-w-[95vw] p-3.5 relative border border-[var(--ui-border)] flex flex-col gap-2.5 animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-labelledby="message-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header - Single Clean Line */}
        <div className="flex items-center justify-between pb-2 border-b border-[var(--ui-border)]">
          <div className="flex items-center gap-2 min-w-0">
            <div className="bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 p-1.5 rounded-lg border border-sky-100 dark:border-sky-900/50 shrink-0">
              <FiMessageSquare size={14} />
            </div>
            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
              <h2 id="message-modal-title" className="text-xs font-bold text-[var(--ui-text)] whitespace-nowrap">
                Send Message
              </h2>
              <span className="text-[var(--ui-text-muted)] text-[11px] font-semibold">•</span>
              <span className="text-xs font-bold text-sky-600 dark:text-sky-400 truncate max-w-[120px]" title={party.name}>
                {party.name}
              </span>
              <span
                className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase tracking-wider shrink-0 ${
                  isCustomer
                    ? "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300"
                    : "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300"
                }`}
              >
                {isCustomer ? "Customer" : "Supplier"}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-[var(--ui-text-muted)] hover:text-red-500 hover:bg-[var(--ui-surface-sunken)] transition-colors cursor-pointer shrink-0 ml-1"
            title="Close"
          >
            <FiX size={16} />
          </button>
        </div>

        {/* Recipient Phone Input */}
        <div>
          <label className="block text-[11px] font-semibold text-[var(--ui-text-muted)] mb-0.5">
            Recipient Phone Number
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none text-[var(--ui-text-muted)]">
              <FiPhone size={12} />
            </div>
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="e.g. 01700000000"
              className="w-full text-xs font-medium pl-6.5 pr-2.5 py-1.5 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)] text-[var(--ui-text)] focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
            />
          </div>
          {!phoneNumber && (
            <p className="text-[10px] text-amber-600 mt-0.5 flex items-center gap-1 font-medium">
              <FiInfo size={10} /> Please enter a phone number to send this message.
            </p>
          )}
        </div>

        {/* Quick Templates - Modern Designed Cards */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-[var(--ui-text-muted)]">
              Quick Templates
            </span>
            <span className="text-[10px] text-[var(--ui-text-subtle)]">Click to auto-fill</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {TEMPLATES.map((tmpl) => {
              const isSelected = activeTemplateId === tmpl.id;
              const Icon = tmpl.icon;
              return (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => handleSelectTemplate(tmpl)}
                  className={`group relative text-left py-1.5 px-2 rounded-lg border transition-all duration-150 cursor-pointer flex items-center gap-2 ${
                    isSelected
                      ? "border-sky-500 bg-sky-50/80 dark:bg-sky-950/40 shadow-xs ring-1 ring-sky-500"
                      : "border-[var(--ui-border)] bg-[var(--ui-surface)] hover:border-sky-300 hover:bg-sky-50/30 hover:shadow-xs hover:-translate-y-0.5"
                  }`}
                >
                  <div className={`p-1.5 rounded-md shrink-0 transition-colors ${tmpl.iconBg}`}>
                    <Icon size={12} className={tmpl.iconColor} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-[11px] text-[var(--ui-text)] group-hover:text-sky-600 transition-colors truncate">
                      {tmpl.label}
                    </span>
                    <span className="text-[9px] text-[var(--ui-text-muted)] truncate">
                      {tmpl.banglaLabel}
                    </span>
                  </div>
                  {isSelected && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-sky-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Message Textarea */}
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <label className="text-[11px] font-semibold text-[var(--ui-text-muted)]">
              Message Body
            </label>
            <span className="text-[10px] font-medium text-[var(--ui-text-muted)]">
              {message.length} chars • {smsCalculation.count} SMS ({smsCalculation.isUnicode ? "Unicode" : "GSM"})
            </span>
          </div>

          <textarea
            rows={3}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              setActiveTemplateId(null);
            }}
            placeholder="Type your SMS message here..."
            className="w-full text-xs p-2 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)] text-[var(--ui-text)] focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all resize-none leading-relaxed"
          />
        </div>

        {/* Action Buttons: Cancel and Send */}
        <div className="flex justify-end items-center gap-2 pt-2 border-t border-[var(--ui-border)]">
          <button
            type="button"
            onClick={onClose}
            disabled={sendSmsMutation.isPending}
            className="px-3.5 py-1.5 text-xs font-semibold text-[var(--ui-text-muted)] border border-[var(--ui-border)] rounded-lg hover:bg-[var(--ui-surface-sunken)] transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSend}
            disabled={sendSmsMutation.isPending || !phoneNumber.trim() || !message.trim()}
            className="px-3.5 py-1.5 text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
          >
            {sendSmsMutation.isPending ? (
              <>
                <FaSpinner className="animate-spin text-xs" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <FiSend size={12} />
                <span>Send Message</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PartyMessageModal;
