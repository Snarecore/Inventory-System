import React, { useState } from "react";
import {
  FaPaperPlane,
  FaUserTie,
  FaTruck,
  FaMobileAlt,
  FaCopy,
  FaCheck,
  FaMagic,
} from "react-icons/fa";
import { useTradeParties } from "@/hooks/useTradeParties";
import { useSendSms } from "@/hooks/useSms";
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
  rawText: string;
}

const TEMPLATES: TemplateItem[] = [
  {
    id: "welcome",
    title: "Welcome",
    rawText: "Dear {{customerName}}, welcome to {{businessName}}! Thank you for connecting with us.",
  },
  {
    id: "due",
    title: "Due Reminder",
    rawText: "Dear {{customerName}}, please clear your outstanding balance of Tk {{dueAmount}}. Thank you - {{businessName}}.",
  },
  {
    id: "payment",
    title: "Payment Received",
    rawText: "Dear {{customerName}}, your payment has been received successfully. Thank you - {{businessName}}.",
  },
  {
    id: "offer",
    title: "Special Offer",
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

  return (
    <div className="max-w-3xl mx-auto w-full">
      {/* Compose Form */}
      <div className="ui-card p-4 sm:p-6 space-y-4">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-[var(--ui-text)] flex items-center gap-2">
            <FaPaperPlane className="text-[var(--primary-color)]" />
            Compose SMS
          </h2>
          <p className="text-xs text-[var(--ui-text-muted)] mt-0.5">
            Send instant branded text messages
          </p>
        </div>

        {/* Recipient Mode Selection */}
        <div>
          <label className="text-xs font-semibold text-[var(--ui-text-muted)] block mb-1.5">
            Recipient Type
          </label>
          <div className="grid grid-cols-3 gap-2">
            {RECIPIENT_MODES.map(({ mode, label, icon: Icon }) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setRecipientMode(mode);
                  setSelectedParty(null);
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-[var(--ui-radius-sm)] border text-xs font-semibold transition-all ${
                  recipientMode === mode
                    ? "bg-[var(--primary-color)] text-white border-[var(--primary-color)] shadow-[var(--ui-shadow-control)]"
                    : "bg-[var(--ui-surface-muted)] text-[var(--ui-text)] border-[var(--ui-border)] hover:bg-[var(--ui-surface-sunken)]"
                }`}
              >
                <Icon size={11} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Unified Customer / Supplier Dropdown */}
        {recipientMode !== "DIRECT" && (
          <div>
            <label className="text-xs font-semibold text-[var(--ui-text-muted)] block mb-1">
              Select {partyLabel}
            </label>
            <select
              value={selectedParty?.id ?? ""}
              onChange={(e) => handleSelectParty(e.target.value)}
              className="w-full h-[var(--ui-control-h)] px-3 bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-[var(--ui-radius-sm)] text-xs font-medium text-[var(--ui-text)] focus:border-[var(--primary-color)] outline-none"
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

        {/* Message Input */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-[var(--ui-text-muted)]">
              Message Content
            </label>
            <span className="text-[11px] text-[var(--ui-text-muted)] tabular-nums">
              {message.length} characters
            </span>
          </div>
          <textarea
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write your SMS text..."
            className="w-full p-3 bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-[var(--ui-radius-sm)] text-xs text-[var(--ui-text)] focus:border-[var(--primary-color)] outline-none resize-y leading-relaxed"
          />
        </div>

        {/* Quick Templates */}
        <div>
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--ui-text-muted)] mb-2">
            <span className="flex items-center gap-1.5">
              <FaMagic size={10} className="text-[var(--primary-color)]" />
              Quick Templates
            </span>
            {selectedParty && (
              <span className="text-[10px] font-bold text-[var(--ui-success-dark)]">
                {selectedParty.name} linked
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => handleApplyTemplate(tpl)}
                className="flex items-center justify-between p-2.5 rounded-[var(--ui-radius-sm)] border border-[var(--ui-border)] bg-[var(--ui-surface-muted)] hover:border-[var(--primary-color)] transition-colors group text-left"
              >
                <span className="text-xs font-semibold text-[var(--ui-text)]">
                  {tpl.title}
                </span>
                {copiedId === tpl.id ? (
                  <FaCheck size={10} className="text-[var(--ui-success)] shrink-0" />
                ) : (
                  <FaCopy
                    size={10}
                    className="text-[var(--ui-text-subtle)] group-hover:text-[var(--primary-color)] shrink-0"
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Send Action Button */}
        <div className="pt-2">
          <Button
            type="button"
            variant="primary"
            onClick={handleSend}
            disabled={
              sendSmsMutation.isPending ||
              !phoneNumber.trim() ||
              !message.trim()
            }
            className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold"
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
