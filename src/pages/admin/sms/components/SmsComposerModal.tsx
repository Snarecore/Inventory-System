import React, { useState, useMemo } from "react";
import {
  FaPaperPlane,
  FaCoins,
  FaUsers,
  FaTruck,
  FaPhoneAlt,
  FaMagic,
  FaCopy,
  FaCheck,
} from "react-icons/fa";
import DrawerModal from "@/components/modal/DrawerModal";
import Button from "@/components/button/Button";
import TextInput from "@/components/form/TextInput";
import SelectInput from "@/components/form/SelectField";
import { useSendSms } from "@/hooks/useSms";
import { useTradeParties } from "@/hooks/useTradeParties";
import { getStoredUser } from "@/utils/auth-storage";
import { showErrorToast } from "@/utils/toast-utils";

interface TemplateItem {
  id: string;
  title: string;
  rawText: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
}

const TEMPLATES: TemplateItem[] = [
  {
    id: "due",
    title: "Due Reminder",
    rawText: "Dear {customerName}, your current outstanding balance is ৳{dueAmount}. Kindly settle at your earliest convenience. Thank you - {businessName}",
    icon: FaCoins,
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
  },
  {
    id: "greeting",
    title: "Greeting",
    rawText: "Dear {customerName}, thank you for choosing {businessName}. We value your partnership and look forward to serving you again!",
    icon: FaUsers,
    color: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20",
  },
  {
    id: "welcome",
    title: "Welcome",
    rawText: "Welcome to {businessName}! Your profile has been created successfully. For any query, feel free to contact us.",
    icon: FaPaperPlane,
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
  },
  {
    id: "promo",
    title: "Special Offer",
    rawText: "Special Offer from {businessName}! Enjoy exclusive discounts on our products this week. Visit us today!",
    icon: FaTruck,
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20",
  },
];

type RecipientMode = "CUSTOMER" | "SUPPLIER" | "DIRECT";

const RECIPIENT_MODES: { mode: RecipientMode; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { mode: "CUSTOMER", label: "Customer", icon: FaUsers },
  { mode: "SUPPLIER", label: "Supplier", icon: FaTruck },
  { mode: "DIRECT", label: "Direct Number", icon: FaPhoneAlt },
];

function interpolateTemplate(
  template: string,
  variables: { customerName: string; dueAmount: string; businessName: string }
): string {
  return template
    .replace(/\{customerName\}/g, variables.customerName)
    .replace(/\{dueAmount\}/g, variables.dueAmount)
    .replace(/\{businessName\}/g, variables.businessName);
}

interface SmsComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMessageSent?: () => void;
  currentBalance?: number;
  initialPhone?: string;
  initialMessage?: string;
  initialRecipientName?: string;
}

export const SmsComposerModal: React.FC<SmsComposerModalProps> = ({
  isOpen,
  onClose,
  onMessageSent,
  currentBalance = 0,
  initialPhone = "",
  initialMessage = "",
  initialRecipientName = "",
}) => {
  const sendSmsMutation = useSendSms();

  const [recipientMode, setRecipientMode] = useState<RecipientMode>(
    initialPhone ? "DIRECT" : "CUSTOMER"
  );
  const [phoneNumber, setPhoneNumber] = useState<string>(initialPhone);
  const [message, setMessage] = useState<string>(initialMessage);
  const [selectedParty, setSelectedParty] = useState<{ id: string | number; name: string; phone?: string; dueAmount?: string | number } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch party lists using useTradeParties
  const { partyList: customerParties, isLoading: isCustomersLoading } = useTradeParties("CUSTOMER");
  const { partyList: supplierParties, isLoading: isSuppliersLoading } = useTradeParties("SUPPLIER");

  const storedUser = getStoredUser();
  const businessName = storedUser?.businessName ?? "Cash Boi";

  const isCustomer = recipientMode === "CUSTOMER";
  const isSupplier = recipientMode === "SUPPLIER";

  // Strictly isolate party list: only Customer when Customer tab is active, only Supplier when Supplier tab is active
  const activePartyList = useMemo(() => {
    if (isCustomer) {
      return customerParties.map((c) => ({
        id: c.id ?? c.partyId,
        name: c.name || c.partyName || "Unnamed Customer",
        phone: c.phone || "",
        dueAmount: c.currentBalance ?? c.openingBalance ?? 0,
      }));
    }
    if (isSupplier) {
      return supplierParties.map((s) => ({
        id: s.id ?? s.partyId,
        name: s.name || s.partyName || "Unnamed Supplier",
        phone: s.phone || "",
        dueAmount: s.currentBalance ?? s.openingBalance ?? 0,
      }));
    }
    return [];
  }, [isCustomer, isSupplier, customerParties, supplierParties]);

  const isPartyLoading = isCustomer ? isCustomersLoading : isSupplier ? isSuppliersLoading : false;
  const partyLabel = isCustomer ? "Customer" : "Supplier";

  const partyOptions = useMemo(() => {
    return activePartyList.map((p) => ({
      label: p.phone ? `${p.name} (${p.phone})` : p.name,
      value: String(p.id),
    }));
  }, [activePartyList]);

  const selectedPartyOption = useMemo(() => {
    if (!selectedParty) return null;
    return partyOptions.find((o) => o.value === String(selectedParty.id)) || null;
  }, [selectedParty, partyOptions]);

  const handleSelectParty = (partyId: string) => {
    const matched = activePartyList.find((p) => String(p.id) === partyId);
    setSelectedParty(matched ?? null);
    if (matched?.phone) {
      setPhoneNumber(matched.phone);
    }
  };

  const handleApplyTemplate = (tpl: TemplateItem) => {
    const defaultName = isCustomer
      ? "Valued Customer"
      : isSupplier
      ? "Valued Supplier"
      : "Valued Partner";

    const resolved = interpolateTemplate(tpl.rawText, {
      customerName: selectedParty?.name ?? defaultName,
      dueAmount: String(selectedParty?.dueAmount ?? "0"),
      businessName,
    });

    setMessage(resolved);
    setCopiedId(tpl.id);
    setTimeout(() => setCopiedId(null), 1200);
  };

  const isUnicode = Array.from(message).some((char) => char.charCodeAt(0) > 127);
  const charCount = message.length;
  const maxSinglePart = isUnicode ? 70 : 160;
  const multiPartSize = isUnicode ? 67 : 153;
  const partsCount =
    charCount === 0 ? 0 : charCount <= maxSinglePart ? 1 : Math.ceil(charCount / multiPartSize);

  const handleSend = () => {
    if (sendSmsMutation.isPending) return;

    const cleanPhone = phoneNumber.trim().replace(/[^\d+]/g, "");
    if (!cleanPhone || cleanPhone.length < 11) {
      showErrorToast("Please enter a valid phone number (minimum 11 digits)");
      return;
    }

    if (!message.trim()) {
      showErrorToast("Please enter message content");
      return;
    }

    const recipientTypeName =
      recipientMode === "CUSTOMER"
        ? "Customer"
        : recipientMode === "SUPPLIER"
        ? "Supplier"
        : "Direct";

    sendSmsMutation.mutate(
      {
        phoneNumber: cleanPhone,
        msg: message.trim(),
        type: recipientTypeName,
      },
      {
        onSuccess: (result) => {
          if (result.success) {
            if (onMessageSent) {
              onMessageSent();
            }
            onClose();
          }
        },
      }
    );
  };

  return (
    <DrawerModal
      isOpen={isOpen}
      onClose={onClose}
      title="Send SMS Message"
      icon={<FaPaperPlane size={13} className="text-[var(--primary-color)]" />}
      maxWidth="max-w-[360px] sm:max-w-[375px]"
      footerButtons={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button
            label="Cancel"
            type="button"
            onClick={onClose}
            disabled={sendSmsMutation.isPending}
            color="#6b7280"
            hoverColor="#4b5563"
            buttonClass="!text-xs !py-1.5 !px-3.5"
          />
          <Button
            label={sendSmsMutation.isPending ? "Sending..." : "Send Message"}
            type="button"
            onClick={handleSend}
            disabled={sendSmsMutation.isPending || !phoneNumber.trim() || !message.trim()}
            isLoading={sendSmsMutation.isPending}
            color="#009fe3"
            hoverColor="#0085be"
            icon={<FaPaperPlane className="text-white text-xs" />}
            buttonClass="!text-xs !py-1.5 !px-4 font-bold"
          />
        </div>
      }
    >
      <div className="space-y-3.5 text-xs">

        {/* Recipient Mode Segmented Controller */}
        <div>
          <label className="text-xs font-semibold text-[var(--ui-text-muted)] block mb-0.5">
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
                  setPhoneNumber("");
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

        {/* Recipient Selection & Phone Number in One Line */}
        {recipientMode !== "DIRECT" ? (
          <div className="grid grid-cols-2 gap-2">
            <SelectInput
              label={`Select ${partyLabel}`}
              value={selectedPartyOption}
              options={partyOptions}
              onChange={(opt) => handleSelectParty(opt.value)}
              placeholder={`-- Choose ${partyLabel} --`}
              disabled={isPartyLoading}
            />

            <TextInput
              label="Recipient Phone"
              placeholder="01XXXXXXXXX"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </div>
        ) : (
          <TextInput
            label="Recipient Phone Number"
            placeholder="01XXXXXXXXX"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
        )}

        {/* Selected Party Due Info (if linked) */}
        {recipientMode !== "DIRECT" && selectedParty && (
          <div className="p-2 rounded-lg bg-[var(--ui-surface-muted)] border border-[var(--ui-border)] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-5 h-5 rounded-full bg-[var(--primary-color-light)] text-[var(--primary-color)] flex items-center justify-center font-bold text-[10px] shrink-0">
                {selectedParty.name?.charAt(0) ?? "P"}
              </div>
              <span className="font-bold text-[var(--ui-text)] truncate text-xs">
                {selectedParty.name}
              </span>
            </div>
            {selectedParty.dueAmount && Number(selectedParty.dueAmount) > 0 ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--ui-danger-light)] text-[var(--ui-danger-dark)] border border-[var(--ui-danger-border)] shrink-0">
                Due: ৳{Number(selectedParty.dueAmount).toLocaleString("en-IN")}
              </span>
            ) : (
              <span className="text-[10px] font-semibold text-[var(--ui-success-dark)] shrink-0">
                Linked
              </span>
            )}
          </div>
        )}

        {/* Message Input with Real-time Encoding & Capacity Meter */}
        <div>
          <div className="flex items-center justify-between mb-0.5">
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
          <div className="grid grid-cols-2 gap-1.5">
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
        <div className="p-2.5 rounded-lg bg-[var(--ui-surface-muted)] border border-[var(--ui-border)] flex flex-col gap-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[var(--ui-text-muted)] text-[11px]">Recipient:</span>
            <strong className="text-[var(--ui-text)] font-semibold truncate max-w-[200px]">
              {phoneNumber.trim() ? phoneNumber.trim() : "None"}
            </strong>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--ui-text-muted)] text-[11px]">Message Cost:</span>
            <strong className="text-[var(--ui-text)] font-bold tabular-nums">
              {partsCount || 1} SMS {partsCount > 1 ? "Credits" : "Credit"}
            </strong>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--ui-text-muted)] text-[11px]">Balance After:</span>
            <strong className="text-[var(--ui-success-dark)] font-extrabold tabular-nums">
              {Math.max(0, currentBalance - (partsCount || 1)).toLocaleString("en-IN")}{" "}
              Credits
            </strong>
          </div>
        </div>
      </div>
    </DrawerModal>
  );
};

export default SmsComposerModal;
