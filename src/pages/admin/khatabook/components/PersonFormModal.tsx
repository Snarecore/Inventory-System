import React, { useState, useEffect } from "react";
import DrawerModal from "@/components/modal/DrawerModal";
import TextInput from "@/components/form/TextInput";
import Button from "@/components/button/Button";
import type { LedgerPerson, SaveLedgerPersonPayload } from "@/types";
import { useSaveLedgerPersonMutation } from "@/hooks/useKhatabook";
import { sendSmsMessage } from "@/services/sms-service";
import { getStoredUser } from "@/utils/auth-storage";
import { showErrorToast } from "@/utils/toast-utils";
import {
  FaUser,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaMoneyBillWave,
  FaPaperPlane,
  FaArrowDown,
  FaArrowUp,
  FaMinus,
} from "react-icons/fa";

interface PersonFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  personToEdit?: LedgerPerson | null;
  onSuccess?: () => void;
}

export const PersonFormModal: React.FC<PersonFormModalProps> = ({
  isOpen,
  onClose,
  personToEdit,
  onSuccess,
}) => {
  const isEdit = Boolean(personToEdit?.id);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState<"CUSTOMER" | "SUPPLIER" | "OTHER">("CUSTOMER");
  const [tag, setTag] = useState("Regular");
  const [status, setStatus] = useState<"Active" | "Inactive">("Active");

  // Opening balance fields (only for new person)
  const [openingType, setOpeningType] = useState<"NONE" | "PONA" | "DENA">("NONE");
  const [openingAmount, setOpeningAmount] = useState<string>("");
  const [openingDate, setOpeningDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  // SMS Notification Toggle
  const [sendSms, setSendSms] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (personToEdit) {
      setName(personToEdit.name || "");
      setPhone(personToEdit.phone || "");
      setAddress(personToEdit.address || "");
      setEmail(personToEdit.email || "");
      setType((personToEdit.type as any) || "CUSTOMER");
      setTag(personToEdit.tag || "Regular");
      setStatus(personToEdit.status === "Inactive" ? "Inactive" : "Active");
      setOpeningType("NONE");
      setOpeningAmount("");
      setSendSms(false);
    } else {
      setName("");
      setPhone("");
      setAddress("");
      setEmail("");
      setType("CUSTOMER");
      setTag("Regular");
      setStatus("Active");
      setOpeningType("NONE");
      setOpeningAmount("");
      setOpeningDate(new Date().toISOString().split("T")[0]);
      setSendSms(false);
    }
    setErrors({});
  }, [personToEdit, isOpen]);

  const saveMutation = useSaveLedgerPersonMutation({
    onSuccess: () => {
      // Send SMS if toggle was on and it's a new person
      if (sendSms && !isEdit && phone.trim()) {
        const user = getStoredUser();
        const businessName = user?.businessName || user?.name || "Cash Boi";
        let smsMsg = "";
        const cleanAmount = Number(openingAmount) || 0;
        if (openingType === "PONA" && cleanAmount > 0) {
          smsMsg = `প্রিয় ${name.trim()}, ${businessName}-এ আপনার প্রারম্ভিক পাওনা (বাকি) ৳${cleanAmount} রেকর্ড করা হয়েছে। ধন্যবাদ।`;
        } else if (openingType === "DENA" && cleanAmount > 0) {
          smsMsg = `প্রিয় ${name.trim()}, ${businessName}-এ আপনার প্রারম্ভিক দেনা ৳${cleanAmount} রেকর্ড করা হয়েছে। ধন্যবাদ।`;
        } else {
          smsMsg = `প্রিয় ${name.trim()}, ${businessName}-এ আপনার খাতা অ্যাকাউন্ট খোলা হয়েছে। ধন্যবাদ।`;
        }

        sendSmsMessage({
          phoneNumber: phone.trim(),
          msg: smsMsg,
          type: "Khatabook",
        })
          .then((smsRes) => {
            if (!smsRes.success) {
              showErrorToast(smsRes.message || "এসএমএস পাঠানো সম্ভব হয়নি।");
            }
          })
          .catch(() => {
            showErrorToast("ব্যক্তি যুক্ত হয়েছে কিন্তু এসএমএস পাঠাতে সমস্যা হয়েছে।");
          });
      }

      onSuccess?.();
      onClose();
    },
  });

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) {
      errs.name = "Person name is required";
    }
    const cleanPhone = phone.trim().replace(/\D/g, "");
    if (!cleanPhone) {
      errs.phone = "Phone number is required";
    } else if (cleanPhone.length < 11) {
      errs.phone = "Please enter a valid 11-digit phone number";
    }
    if (openingType !== "NONE" && Number(openingAmount) < 0) {
      errs.openingAmount = "Opening balance cannot be negative";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validate()) return;

    if (isEdit && personToEdit?.id) {
      const payload: SaveLedgerPersonPayload = {
        id: personToEdit.id,
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        type,
        status,
      };
      saveMutation.mutate(payload);
    } else {
      const numAmount = Number(openingAmount) || 0;
      const payload: SaveLedgerPersonPayload = {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        email: email.trim(),
        type,
        tag: tag.trim() || "Regular",
        status,
        openingDena: openingType === "DENA" ? numAmount : 0,
        openingPona: openingType === "PONA" ? numAmount : 0,
        openingDate: openingDate || new Date().toISOString().split("T")[0],
      };
      saveMutation.mutate(payload);
    }
  };

  return (
    <DrawerModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit Person Details" : "Add New Person"}
      maxWidth="max-w-[440px] sm:max-w-[480px]"
      onSubmit={handleSubmit}
      footerButtons={
        <div className="flex items-center justify-end gap-1.5 w-full">
          <Button
            label="Cancel"
            onClick={onClose}
            variant="outline"
            disabled={saveMutation.isPending}
            size="sm"
            buttonClass="!bg-[var(--ui-surface)] hover:!bg-[var(--ui-surface-sunken)] !border-[var(--ui-border)] !text-[var(--ui-text)] font-medium text-xs"
          />
          <Button
            label={saveMutation.isPending ? "Saving..." : isEdit ? "Update Person" : "Save Person"}
            type="submit"
            color="#009fe3"
            hoverColor="#0085be"
            isLoading={saveMutation.isPending}
            disabled={saveMutation.isPending}
            size="sm"
            buttonClass="font-semibold text-xs text-white"
          />
        </div>
      }
    >
      <div className="flex flex-col gap-2 text-left">
        {/* 2 Fields Per Row Grid: Name + Phone, Email + Address */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Person Name */}
          <div>
            <TextInput
              label="Person Name"
              placeholder="e.g. Rahim Uddin"
              value={name}
              onChange={(val: any) => {
                setName(typeof val === "string" ? val : (val?.target?.value ?? ""));
                if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
              }}
              required
              message={errors.name}
              icon={<FaUser className="text-[var(--ui-text-subtle)] text-xs" />}
            />
          </div>

          {/* Phone Number */}
          <div>
            <TextInput
              label="Phone Number"
              placeholder="e.g. 017XXXXXXXX"
              value={phone}
              onChange={(val: any) => {
                setPhone(typeof val === "string" ? val : (val?.target?.value ?? ""));
                if (errors.phone) setErrors((prev) => ({ ...prev, phone: "" }));
              }}
              required
              message={errors.phone}
              icon={<FaPhone className="text-[var(--ui-text-subtle)] text-xs" />}
            />
          </div>

          {/* Email */}
          <div>
            <TextInput
              label="Email (Optional)"
              type="email"
              placeholder="user@domain.com"
              value={email}
              onChange={(val: any) => setEmail(typeof val === "string" ? val : (val?.target?.value ?? ""))}
              icon={<FaEnvelope className="text-[var(--ui-text-subtle)] text-xs" />}
            />
          </div>

          {/* Address */}
          <div>
            <TextInput
              label="Address (Optional)"
              placeholder="Street address, city, district..."
              value={address}
              onChange={(val: any) => setAddress(typeof val === "string" ? val : (val?.target?.value ?? ""))}
              icon={<FaMapMarkerAlt className="text-[var(--ui-text-subtle)] text-xs" />}
            />
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="text-xs font-semibold text-[var(--ui-text)] block mb-1">
            Status
          </label>
          <div className="grid grid-cols-2 gap-1 p-0.5 bg-[var(--ui-surface-sunken)] rounded-lg border border-[var(--ui-border)]">
            <button
              type="button"
              onClick={() => setStatus("Active")}
              className={`flex items-center justify-center py-1.5 px-3 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                status === "Active"
                  ? "bg-[var(--ui-surface)] text-[var(--ui-success)] shadow-xs border border-[var(--ui-success-border)] font-bold"
                  : "text-[var(--ui-text-muted)] hover:text-[var(--ui-text)]"
              }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setStatus("Inactive")}
              className={`flex items-center justify-center py-1.5 px-3 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                status === "Inactive"
                  ? "bg-[var(--ui-surface)] text-[var(--ui-danger)] shadow-xs border border-[var(--ui-danger-border)] font-bold"
                  : "text-[var(--ui-text-muted)] hover:text-[var(--ui-text)]"
              }`}
            >
              Inactive
            </button>
          </div>
        </div>

        {/* Person Type & Tag */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-semibold text-[var(--ui-text)] block mb-1">
              Person Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full h-8 px-2.5 text-xs bg-[var(--ui-surface)] text-[var(--ui-text)] border border-[var(--ui-border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--primary-color,#009fe3)] cursor-pointer"
            >
              <option value="CUSTOMER">Customer</option>
              <option value="SUPPLIER">Supplier</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {!isEdit && (
            <div>
              <TextInput
                label="Tag (Optional)"
                placeholder="Regular, VIP..."
                value={tag}
                onChange={(val: any) => setTag(typeof val === "string" ? val : (val?.target?.value ?? ""))}
              />
            </div>
          )}
        </div>

        {/* Opening Balance (Only shown when adding new person) */}
        {!isEdit && (
          <div className="p-2 bg-[var(--ui-surface-sunken)]/60 border border-[var(--ui-border)] rounded-lg flex flex-col gap-1.5 mt-0.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--ui-text)]">
                Opening Balance Setup
              </span>
            </div>

            {/* Segmented Selector for Opening Balance Type */}
            <div className="grid grid-cols-3 gap-1 p-0.5 bg-[var(--ui-surface)] rounded-lg border border-[var(--ui-border)]">
              <button
                type="button"
                onClick={() => setOpeningType("NONE")}
                className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                  openingType === "NONE"
                    ? "bg-[var(--ui-surface-sunken)] text-[var(--ui-text)] shadow-xs border border-[var(--ui-border)] font-bold"
                    : "text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] border border-transparent"
                }`}
              >
                <FaMinus className="text-[10px]" />
                None (0.00)
              </button>

              <button
                type="button"
                onClick={() => setOpeningType("PONA")}
                className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                  openingType === "PONA"
                    ? "bg-[var(--ui-success-light)] text-[var(--ui-success)] shadow-xs border border-[var(--ui-success-border)] font-bold"
                    : "text-[var(--ui-text-muted)] hover:text-[var(--ui-success)] border border-transparent"
                }`}
              >
                <FaArrowDown className="text-[10px] text-[var(--ui-success)]" />
                Receivable (Pabo)
              </button>

              <button
                type="button"
                onClick={() => setOpeningType("DENA")}
                className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                  openingType === "DENA"
                    ? "bg-[var(--ui-danger-light)] text-[var(--ui-danger)] shadow-xs border border-[var(--ui-danger-border)] font-bold"
                    : "text-[var(--ui-text-muted)] hover:text-[var(--ui-danger)] border border-transparent"
                }`}
              >
                <FaArrowUp className="text-[10px] text-[var(--ui-danger)]" />
                Payable (Dibo)
              </button>
            </div>

            {/* Amount and Date (When PONA or DENA is chosen) */}
            {openingType !== "NONE" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                <div>
                  <TextInput
                    label={
                      openingType === "PONA"
                        ? "Receivable Amount (৳)"
                        : "Payable Amount (৳)"
                    }
                    type="number"
                    placeholder="0.00"
                    value={openingAmount}
                    onChange={(val: any) => {
                      setOpeningAmount(typeof val === "string" ? val : (val?.target?.value ?? ""));
                      if (errors.openingAmount) setErrors((prev) => ({ ...prev, openingAmount: "" }));
                    }}
                    required
                    message={errors.openingAmount}
                    icon={
                      <FaMoneyBillWave
                        className={
                          openingType === "PONA"
                            ? "text-[var(--ui-success)] text-xs"
                            : "text-[var(--ui-danger)] text-xs"
                        }
                      />
                    }
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[var(--ui-text)] block mb-1">
                    Opening Date
                  </label>
                  <input
                    type="date"
                    value={openingDate}
                    onChange={(e) => setOpeningDate(e.target.value)}
                    className="w-full h-8 px-2.5 text-xs bg-[var(--ui-surface)] text-[var(--ui-text)] border border-[var(--ui-border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--primary-color,#009fe3)]"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* SMS Notification Toggle Bar */}
        {!isEdit && (
          <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--ui-surface-sunken)]/60 border border-[var(--ui-border)] mt-0.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-[var(--primary-color,#009fe3)]/10 text-[var(--primary-color,#009fe3)]">
                <FaPaperPlane size={10} />
              </div>
              <span className="text-xs font-semibold text-[var(--ui-text)]">
                Send SMS Notification
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={sendSms}
                onChange={(e) => setSendSms(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-8 h-4 bg-gray-300 dark:bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[var(--primary-color,#009fe3)]"></div>
            </label>
          </div>
        )}
      </div>
    </DrawerModal>
  );
};

export default PersonFormModal;
