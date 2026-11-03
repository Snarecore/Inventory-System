import React, { useState } from "react";
import {
  FaPaperPlane,
  FaUserTie,
  FaTruck,
  FaMobileAlt,
  FaCopy,
  FaCheck,
  FaMagic,
  FaHandshake,
  FaBell,
  FaCheckCircle,
  FaTag,
  FaCoins,
} from "react-icons/fa";
import { useTradeParties } from "@/hooks/useTradeParties";
import { useSendSms, useSmsBalance } from "@/hooks/useSms";
import { getUserInfo } from "@/utils/auth-storage";
import Button from "@/components/button/Button";
import TextInput from "@/components/form/TextInput";
import type { PartyItem } from "@/types";

type RecipientMode = "DIRECT" | "CUSTOMER" | "SUPPLIER";

const RECIPIENT_MODES: {
  mode: RecipientMode;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
}[] = [
  { mode: "DIRECT", label: "Direct Number", icon: FaMobileAlt },
  { mode: "CUSTOMER", label: "Customer", icon: FaUserTie },
  { mode: "SUPPLIER", label: "Supplier", icon: FaTruck },
];

interface TemplateItem {
  id: string;
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  rawText: string;
}

const TEMPLATES: TemplateItem[] = [
  {
    id: "welcome",
    title: "Welcome Greeting",
    icon: FaHandshake,
    color: "text-sky-600 dark:text-sky-400 bg-sky-500/10",
    rawText: "Dear {{customerName}}, welcome to {{businessName}}! Thank you for connecting with us.",
  },
  {
    id: "due",
    title: "Due Reminder",
    icon: FaBell,
    color: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
    rawText: "Dear {{customerName}}, please clear your outstanding balance of Tk {{dueAmount}}. Thank you - {{businessName}}.",
  },
  {
    id: "payment",
    title: "Payment Received",
    icon: FaCheckCircle,
    color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
    rawText: "Dear {{customerName}}, your payment has been received successfully. Thank you - {{businessName}}.",
  },
  {
    id: "offer",
    title: "Special Promotion",
    icon: FaTag,
    color: "text-purple-600 dark:text-purple-400 bg-purple-500/10",
    rawText: "Dear {{customerName}}, explore our exclusive offers today - {{businessName}}.",
  },
];

const interpolateTemplate = (
  template: string,
  variables: { customerName: string; dueAmount: string; businessName: string }
): string => {
  return template
    .replace(/\{\{\s*customerName\s*\}\}/g, variables.customerName)
    .replace(/\{\{\s*dueAmount\s*\}\}/g, variables.dueAmount)
    .replace(/\{\{\s*businessName\s*\}\}/g, variables.businessName);
};

export const SendSmsTab: React.FC = () => {
  const [recipientMode, setRecipientMode] = useState<RecipientMode>("DIRECT");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [selectedParty, setSelectedParty] = useState<PartyItem | null>(null);
  const [message, setMessage] = useState<string>(
    "Welcome to Cash Boi! Thank you for connecting with us."
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const userInfo = getUserInfo();
  const businessName = userInfo?.businessName ?? "Cash Boi";

  const { partyList: customerList, isLoading: isCustomersLoading } =
    useTradeParties("CUSTOMER");
  const { partyList: supplierList, isLoading: isSuppliersLoading } =
    useTradeParties("SUPPLIER");

  const sendSmsMutation = useSendSms();
  const { data: balanceData } = useSmsBalance();

  const isCustomer = recipientMode === "CUSTOMER";
  const partyList = isCustomer ? customerList : supplierList;
  const isPartyLoading = isCustomer ? isCustomersLoading : isSuppliersLoading;
  const partyLabel = isCustomer ? "Customer" : "Supplier";

  const handleSelectParty = (partyId: string) => {
    const matched = partyList.find((p) => String(p.id) === partyId);
    setSelectedParty(matched ?? null);
    if (matched?.phone) {
      setPhoneNumber(matched.phone);
    }
  };

  const handleApplyTemplate = (tpl: TemplateItem) => {
    const resolved = interpolateTemplate(tpl.rawText, {
      customerName: selectedParty?.name ?? "Customer",
      dueAmount: String(selectedParty?.dueAmount ?? selectedParty?.openingBalance ?? "0"),
      businessName,
    });

    setMessage(resolved);
    setCopiedId(tpl.id);
    setTimeout(() => setCopiedId(null), 1200);
  };

  const handleSend = () => {
    if (sendSmsMutation.isPending) return;

    const cleanPhone = phoneNumber.trim().replace(/[^\d+]/g, "");
    if (!cleanPhone || cleanPhone.length < 11) {
      alert("Please enter a valid phone number (minimum 11 digits)");
      return;
    }

    if (!message.trim()) {
      alert("Please enter message content");
      return;
    }

    sendSmsMutation.mutate({
      phoneNumber: cleanPhone,
      msg: message.trim(),
      type:
        recipientMode === "CUSTOMER"
          ? "Customer"
          : recipientMode === "SUPPLIER"
          ? "Supplier"
          : "Any",
    });
  };

  const isUnicode = Array.from(message).some((char) => char.charCodeAt(0) > 127);
  const charCount = message.length;
  const maxSinglePart = isUnicode ? 70 : 160;
  const multiPartSize = isUnicode ? 67 : 153;
  const partsCount =
    charCount === 0 ? 0 : charCount <= maxSinglePart ? 1 : Math.ceil(charCount / multiPartSize);

  return (
    <div className="max-w-2xl mx-auto w-full">
      {/* Compose Form */}
      <div className="ui-card p-3.5 sm:p-5 space-y-3 rounded-xl border border-[var(--ui-border)] hover:border-[var(--primary-color)]/60 transition-colors shadow-xs">
        {/* Card Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-[var(--ui-border)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--primary-color)] to-[var(--ui-accent-2)] text-white flex items-center justify-center shrink-0 shadow-xs">
              <FaPaperPlane size={13} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[var(--ui-text)] leading-tight">
                Instant SMS Messenger
              </h2>
              <p className="text-[11px] text-[var(--ui-text-muted)] mt-0.5">
                Deliver masked messages with sender ID &ldquo;Cash Boi&rdquo;
              </p>
            </div>
          </div>
          {balanceData && (
            <div className="flex items-center gap-1.5 bg-[var(--ui-surface-muted)] px-2.5 py-1 rounded-lg border border-[var(--ui-border)] text-xs self-start sm:self-auto">
              <FaCoins className="text-[var(--primary-color)]" size={11} />
              <span className="text-[var(--ui-text-muted)] text-[11px]">Available:</span>
              <strong className="font-extrabold text-[var(--ui-text)] tabular-nums text-xs">
                {balanceData.smsBalance.toLocaleString("en-IN")} Credits
              </strong>
            </div>
          )}
        </div>

        {/* Recipient Mode Segmented Controller */}
        <div>
          <label className="text-xs font-semibold text-[var(--ui-text-muted)] block mb-1">
            Recipient Type
          </label>
          <div className="bg-[var(--ui-surface-muted)] p-0.5 rounded-lg border border-[var(--ui-border)] grid grid-cols-3 gap-1">
            {RECIPIENT_MODES.map(({ mode, label, icon: Icon }) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setRecipientMode(mode);
                  setSelectedParty(null);
                }}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  recipientMode === mode
                    ? "bg-[var(--ui-surface)] text-[var(--primary-color)] shadow-xs border border-[var(--ui-border)] font-bold"
                    : "text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] border border-transparent"
                }`}
              >
                <Icon
                  size={11}
                  className={
                    recipientMode === mode
                      ? "text-[var(--primary-color)]"
                      : "text-[var(--ui-text-subtle)]"
                  }
                />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Unified Customer / Supplier Dropdown */}
        {recipientMode !== "DIRECT" && (
          <div className="space-y-1.5">
            <div>
              <label className="text-xs font-semibold text-[var(--ui-text-muted)] block mb-1">
                Select {partyLabel}
              </label>
              <select
                value={selectedParty?.id ?? ""}
                onChange={(e) => handleSelectParty(e.target.value)}
                className="w-full h-[var(--ui-control-h)] px-3 bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-lg text-xs font-medium text-[var(--ui-text)] focus:border-[var(--primary-color)] outline-none"
                disabled={isPartyLoading}
              >
                <option value="">-- Choose {partyLabel} --</option>
                {partyList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.phone ? `(${p.phone})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {selectedParty && (
              <div className="p-2 rounded-lg bg-[var(--ui-surface-muted)] border border-[var(--ui-border)] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[var(--primary-color-light)] text-[var(--primary-color)] flex items-center justify-center font-bold text-[10px]">
                    {selectedParty.name?.charAt(0) ?? "P"}
                  </div>
                  <div>
                    <span className="font-bold text-[var(--ui-text)]">{selectedParty.name}</span>
                    {selectedParty.phone && (
                      <span className="text-[11px] text-[var(--ui-text-muted)] ml-1.5 font-mono">
                        ({selectedParty.phone})
                      </span>
                    )}
                  </div>
                </div>
                {selectedParty.dueAmount && Number(selectedParty.dueAmount) > 0 ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--ui-danger-light)] text-[var(--ui-danger-dark)] border border-[var(--ui-danger-border)]">
                    Due: ৳{Number(selectedParty.dueAmount).toLocaleString("en-IN")}
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-[var(--ui-success-dark)]">
                    Linked
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Recipient Phone Input */}
        <div>
          <TextInput
            label="Phone Number"
            placeholder="01XXXXXXXXX"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
        </div>

        {/* Message Input with Real-time Encoding & Capacity Meter */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-[var(--ui-text-muted)]">
              Message Content
            </label>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="px-1.5 py-0.2 rounded bg-[var(--ui-surface-muted)] text-[var(--ui-text-muted)] border border-[var(--ui-border)] font-medium text-[10px]">
                {isUnicode ? "Unicode (Bangla)" : "GSM-7 (Standard)"}
              </span>
              <span className="font-semibold text-[var(--ui-text)] tabular-nums text-xs">
                {charCount} chars • {partsCount} {partsCount === 1 ? "part" : "parts"}
              </span>
            </div>
          </div>
          <textarea
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write your SMS text..."
            className="w-full p-2.5 bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-lg text-xs text-[var(--ui-text)] focus:border-[var(--primary-color)] outline-none resize-y leading-normal"
          />

          {/* Interactive Capacity Progress Bar */}
          <div className="w-full bg-[var(--ui-surface-sunken)] h-1 rounded-full overflow-hidden mt-1">
            <div
              className={`h-full transition-all duration-300 ${
                partsCount > 1 ? "bg-amber-500" : "bg-[var(--primary-color)]"
              }`}
              style={{
                width: `${Math.min(
                  100,
                  Math.max(
                    4,
                    (charCount / (partsCount > 1 ? partsCount * multiPartSize : maxSinglePart)) *
                      100
                  )
                )}%`,
              }}
            />
          </div>
        </div>

        {/* Quick Templates with Colorful Icons */}
        <div>
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--ui-text-muted)] mb-1.5">
            <span className="flex items-center gap-1.5">
              <FaMagic size={10} className="text-[var(--primary-color)]" />
              Quick Templates
            </span>
            <span className="text-[10px] text-[var(--ui-text-subtle)]">Click to auto-fill</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {TEMPLATES.map((tpl) => {
              const TplIcon = tpl.icon;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => handleApplyTemplate(tpl)}
                  className="flex items-center gap-1.5 p-2 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface-muted)] hover:border-[var(--primary-color)] transition-colors group text-left cursor-pointer"
                >
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${tpl.color}`}
                  >
                    <TplIcon size={10} />
                  </div>
                  <span className="text-[11px] font-semibold text-[var(--ui-text)] truncate flex-1">
                    {tpl.title}
                  </span>
                  {copiedId === tpl.id ? (
                    <FaCheck size={9} className="text-[var(--ui-success)] shrink-0" />
                  ) : (
                    <FaCopy
                      size={9}
                      className="text-[var(--ui-text-subtle)] group-hover:text-[var(--primary-color)] shrink-0"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Real-time Delivery & Cost Breakdown */}
        <div className="p-2.5 rounded-lg bg-[var(--ui-surface-muted)] border border-[var(--ui-border)] grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-[var(--ui-text-muted)] text-[11px]">Recipient:</span>
            <strong className="text-[var(--ui-text)] font-semibold truncate">
              {phoneNumber.trim() ? phoneNumber.trim() : "None"}
            </strong>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[var(--ui-text-muted)] text-[11px]">Message Cost:</span>
            <strong className="text-[var(--ui-text)] font-bold tabular-nums">
              {partsCount || 1} SMS {partsCount > 1 ? "Credits" : "Credit"}
            </strong>
          </div>
          <div className="flex items-center gap-1.5 sm:justify-end">
            <span className="text-[var(--ui-text-muted)] text-[11px]">Balance After:</span>
            <strong className="text-[var(--ui-success-dark)] font-extrabold tabular-nums">
              {balanceData
                ? Math.max(0, balanceData.smsBalance - (partsCount || 1)).toLocaleString("en-IN")
                : 0}{" "}
              Credits
            </strong>
          </div>
        </div>

        {/* Send Action Footer */}
        <div className="pt-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="text-[11px] text-[var(--ui-text-muted)] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--ui-success)]" />
            <span>High-Priority Masked Route</span>
          </div>
          <Button
            type="button"
            variant="primary"
            onClick={handleSend}
            disabled={sendSmsMutation.isPending || !phoneNumber.trim() || !message.trim()}
            className="w-full sm:w-auto min-w-[140px] flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg"
          >
            <FaPaperPlane size={11} />
            {sendSmsMutation.isPending ? "Sending..." : "Send SMS"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SendSmsTab;
