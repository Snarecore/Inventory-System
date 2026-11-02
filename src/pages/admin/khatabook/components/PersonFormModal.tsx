import React, { useState, useEffect } from "react";
import DrawerModal from "@/components/modal/DrawerModal";
import TextInput from "@/components/form/TextInput";
import Button from "@/components/button/Button";
import type { LedgerPerson, SaveLedgerPersonPayload } from "@/types";
import { useSaveLedgerPersonMutation } from "@/hooks/useKhatabook";
import {
  FaUser,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaMoneyBillWave,
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
  const [status, setStatus] = useState<"Active" | "Inactive">("Active");

  // Opening balance fields (only for new person)
  const [openingPona, setOpeningPona] = useState<string>("");
  const [openingDena, setOpeningDena] = useState<string>("");
  const [openingDate, setOpeningDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (personToEdit) {
      setName(personToEdit.name || "");
      setPhone(personToEdit.phone || "");
      setAddress(personToEdit.address || "");
      setEmail(personToEdit.email || "");
      setStatus(personToEdit.status === "Inactive" ? "Inactive" : "Active");
      setOpeningPona("");
      setOpeningDena("");
    } else {
      setName("");
      setPhone("");
      setAddress("");
      setEmail("");
      setStatus("Active");
      setOpeningPona("");
      setOpeningDena("");
      setOpeningDate(new Date().toISOString().split("T")[0]);
    }
    setErrors({});
  }, [personToEdit, isOpen]);

  const saveMutation = useSaveLedgerPersonMutation({
    onSuccess: () => {
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
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validate()) return;

    const payload: SaveLedgerPersonPayload = {
      name: name.trim(),
      phone: phone.trim(),
      type: "CUSTOMER",
      tag: "regular",
      address: address.trim(),
      email: email.trim(),
      status,
    };

    if (isEdit && personToEdit?.id) {
      payload.id = personToEdit.id;
    } else {
      if (Number(openingPona) > 0) {
        payload.openingPona = Number(openingPona);
      }
      if (Number(openingDena) > 0) {
        payload.openingDena = Number(openingDena);
      }
      if (openingDate) {
        payload.openingDate = openingDate;
      }
    }

    saveMutation.mutate(payload);
  };

  return (
    <DrawerModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit Person Details" : "Add New Person"}
      maxWidth="max-w-[480px] sm:max-w-[520px]"
      onSubmit={handleSubmit}
      footerButtons={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button
            label="Cancel"
            onClick={onClose}
            variant="outline"
            disabled={saveMutation.isPending}
            buttonClass="!bg-[var(--ui-surface)] hover:!bg-[var(--ui-surface-sunken)] !border-[var(--ui-border)] !text-[var(--ui-text)] font-medium !rounded-lg !py-1.5 !px-3 text-xs"
          />
          <Button
            label={saveMutation.isPending ? "Saving..." : isEdit ? "Update Person" : "Save Person"}
            type="submit"
            color="#009fe3"
            hoverColor="#0085be"
            isLoading={saveMutation.isPending}
            disabled={saveMutation.isPending}
            buttonClass="font-semibold !rounded-lg !py-1.5 !px-4 text-xs text-white"
          />
        </div>
      }
    >
      <div className="flex flex-col gap-2.5 text-left">
        {/* 2 Fields Per Row Grid: Name + Phone, Email + Address */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-[var(--ui-surface-sunken)] rounded-xl border border-[var(--ui-border)]">
            <button
              type="button"
              onClick={() => setStatus("Active")}
              className={`flex items-center justify-center py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
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
              className={`flex items-center justify-center py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                status === "Inactive"
                  ? "bg-[var(--ui-surface)] text-[var(--ui-danger)] shadow-xs border border-[var(--ui-danger-border)] font-bold"
                  : "text-[var(--ui-text-muted)] hover:text-[var(--ui-text)]"
              }`}
            >
              Inactive
            </button>
          </div>
        </div>

        {/* Opening Balance (Only shown when adding new person) */}
        {!isEdit && (
          <div className="p-3 bg-[var(--ui-surface-sunken)]/60 border border-[var(--ui-border)] rounded-xl flex flex-col gap-2 mt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--ui-text)]">
                Opening Balance Setup
              </span>
              <span className="text-[10px] text-[var(--ui-text-muted)] font-medium">Optional</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <TextInput
                  label="Receivable (They owe ৳)"
                  type="number"
                  placeholder="0.00"
                  value={openingPona}
                  onChange={(val: any) => setOpeningPona(typeof val === "string" ? val : (val?.target?.value ?? ""))}
                  icon={<FaMoneyBillWave className="text-[var(--ui-success)] text-xs" />}
                />
              </div>

              <div>
                <TextInput
                  label="Payable (You owe ৳)"
                  type="number"
                  placeholder="0.00"
                  value={openingDena}
                  onChange={(val: any) => setOpeningDena(typeof val === "string" ? val : (val?.target?.value ?? ""))}
                  icon={<FaMoneyBillWave className="text-[var(--ui-danger)] text-xs" />}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--ui-text)] block mb-1">
                Opening Date
              </label>
              <input
                type="date"
                value={openingDate}
                onChange={(e) => setOpeningDate(e.target.value)}
                className="w-full px-2.5 py-1 text-xs bg-[var(--ui-surface)] text-[var(--ui-text)] border border-[var(--ui-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
          </div>
        )}
      </div>
    </DrawerModal>
  );
};

export default PersonFormModal;
