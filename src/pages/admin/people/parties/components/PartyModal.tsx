import React, { useState, useEffect } from "react";
import Modal from "@/components/modal/Modal";
import TextInput from "@/components/form/TextInput";
import Button from "@/components/button/Button";
import { buildAccessUser, withBranchScope } from "@/utils/access-user";
import { postData } from "@/services/api-service";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";
import apiConfig from "@/config/api.json";
import type { PartyItem, PartyType } from "@/types";
import { FaUserTie, FaTruck, FaPhone, FaEnvelope, FaMapMarkerAlt, FaMoneyBillWave } from "react-icons/fa";
import { RiArrowDropDownLine } from "react-icons/ri";
import { usePermission } from "@/hooks/usePermission";

interface PartyModalProps {
  isOpen: boolean;
  onClose: () => void;
  partyData?: PartyItem | null;
  onSuccess: (savedParty?: PartyItem) => void;
  defaultType?: PartyType;
}

const PartyModal: React.FC<PartyModalProps> = ({
  isOpen,
  onClose,
  partyData,
  onSuccess,
  defaultType = "CUSTOMER",
}) => {
  const partyId = partyData?.id ?? partyData?.partyId;
  const isEdit = Boolean(partyData && partyId);
  const { canCreate, canUpdate } = usePermission();
  const hasPermission = isEdit ? canUpdate("parties") : canCreate("parties");

  const [partyType, setPartyType] = useState<PartyType>(defaultType);
  const [partyName, setPartyName] = useState("");
  const [partyPhone, setPartyPhone] = useState("");
  const [partyEmail, setPartyEmail] = useState("");
  const [partyAddress, setPartyAddress] = useState("");
  const [openingBalance, setOpeningBalance] = useState<string>("");
  const [status, setStatus] = useState<"active" | "inactive">("active");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      if (partyData) {
        const rawType = String(partyData.type || defaultType).toUpperCase();
        setPartyType(rawType === "SUPPLIER" ? "SUPPLIER" : "CUSTOMER");
        setPartyName(partyData.name || "");
        setPartyPhone(partyData.phone || "");
        setPartyEmail(partyData.email || "");
        setPartyAddress(partyData.address || "");
        setOpeningBalance(
          partyData.openingBalance != null || partyData.balance != null
            ? String(partyData.openingBalance ?? partyData.balance ?? "")
            : ""
        );
        
        const rawStatus = String(partyData.status ?? "active").toLowerCase();
        setStatus(rawStatus === "inactive" || rawStatus === "false" || rawStatus === "0" ? "inactive" : "active");
      } else {
        setPartyType(defaultType);
        setPartyName("");
        setPartyPhone("");
        setPartyEmail("");
        setPartyAddress("");
        setOpeningBalance("");
        setStatus("active");
      }
      setErrors({});
    }
  }, [isOpen, partyData, defaultType]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!partyName.trim()) {
      errs.partyName = `${partyType === "CUSTOMER" ? "Customer" : "Supplier"} name is required`;
    }
    if (!partyPhone.trim()) {
      errs.partyPhone = "Phone number is required";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!hasPermission) {
      showErrorToast(`You do not have permission to ${isEdit ? "update" : "create"} parties.`);
      return;
    }
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const accessUser = buildAccessUser();
      const insertUrl = apiConfig.party.insertPartyUrl;
      const updateUrl = apiConfig.party.updatePartyUrl;

      const targetUrl = isEdit ? updateUrl : insertUrl;
      const numBalance = Number(openingBalance) || 0;

      const partyDetails = withBranchScope({
        ...(partyData ? partyData : {}),
        ...(isEdit && partyId ? {
          id: partyId,
          partyId: partyId,
        } : {}),
        name: partyName.trim(),
        partyName: partyName.trim(),
        phone: partyPhone.trim(),
        partyPhone: partyPhone.trim(),
        email: partyEmail.trim(),
        address: partyAddress.trim(),
        type: partyType,
        partyType: partyType,
        openingBalance: numBalance,
        status: status === "active" ? "Active" : "Inactive",
      });

      const payload: Record<string, any> = {
        accessUser,
        ...partyDetails,
      };

      const response = await postData<any>({
        url: targetUrl,
        body: payload,
      });

      if (response && !response.error && String(response.status).toLowerCase() !== "error") {
        const successMsg = response.msg || response.message || (isEdit ? "Party updated successfully!" : "Party created successfully!");
        showSuccessToast(successMsg);
        const serverParty = (response as any)?.data || (response as any)?.party || (response as any)?.partyInfo || partyDetails;
        onSuccess({ ...partyDetails, ...(typeof serverParty === 'object' ? serverParty : {}) });
        onClose();
      } else {
        const errorMsg = response?.msg || response?.message || (response as any)?.error || "Failed to save party information.";
        showErrorToast(errorMsg);
      }
    } catch (err: any) {
      showErrorToast(err?.message || "An unexpected error occurred while saving.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      title={isEdit ? (partyType === "CUSTOMER" ? "Edit Customer" : "Edit Supplier") : (partyType === "CUSTOMER" ? "Add New Customer" : "Add New Supplier")}
      onClose={onClose}
      maxWidth="w-full max-w-[560px]"
      className="!py-3 !px-4 sm:!px-5"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 text-left">
        {/* Party Type Segmented Selector */}
        <div>
          <label className="text-xs font-semibold text-[var(--ui-text)] block mb-1">
            Party Type <span className="text-[var(--ui-danger)]">*</span>
          </label>
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-[var(--ui-surface-sunken)]/90 rounded-xl border border-[var(--ui-border)]">
            <button
              type="button"
              onClick={() => setPartyType("CUSTOMER")}
              className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                partyType === "CUSTOMER"
                  ? "bg-[var(--ui-surface)] text-[var(--primary-color)] shadow-xs border border-[var(--primary-color)]/30"
                  : "text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-surface)]/50 border border-transparent"
              }`}
            >
              <FaUserTie className={partyType === "CUSTOMER" ? "text-[var(--primary-color)] text-xs" : "text-[var(--ui-text-subtle)] text-xs"} />
              Customer
            </button>
            <button
              type="button"
              onClick={() => setPartyType("SUPPLIER")}
              className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                partyType === "SUPPLIER"
                  ? "bg-[var(--ui-surface)] text-[var(--ui-success)] shadow-xs border border-[var(--ui-success-border)]"
                  : "text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-surface)]/50 border border-transparent"
              }`}
            >
              <FaTruck className={partyType === "SUPPLIER" ? "text-[var(--ui-success)] text-xs" : "text-[var(--ui-text-subtle)] text-xs"} />
              Supplier
            </button>
          </div>
        </div>

        {/* 2 Fields Per Row Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
          {/* Row 1, Col 1: Party Name */}
          <div>
            <TextInput
              label={`${partyType === "CUSTOMER" ? "Customer" : "Supplier"} Name`}
              placeholder={`Enter ${partyType.toLowerCase()} name...`}
              value={partyName}
              onChange={(val: any) => setPartyName(typeof val === "string" ? val : (val?.target?.value ?? ""))}
              required
              message={errors.partyName}
              icon={partyType === "CUSTOMER" ? <FaUserTie className="text-[var(--ui-text-subtle)] text-xs" /> : <FaTruck className="text-[var(--ui-text-subtle)] text-xs" />}
            />
          </div>

          {/* Row 1, Col 2: Phone Number */}
          <div>
            <TextInput
              label="Phone Number"
              placeholder="e.g. 017XXXXXXXX"
              value={partyPhone}
              onChange={(val: any) => setPartyPhone(typeof val === "string" ? val : (val?.target?.value ?? ""))}
              required
              message={errors.partyPhone}
              icon={<FaPhone className="text-[var(--ui-text-subtle)] text-xs" />}
            />
          </div>

          {/* Row 2, Col 1: Email (Optional) */}
          <div>
            <TextInput
              label="Email (Optional)"
              type="email"
              placeholder="e.g. info@domain.com"
              value={partyEmail}
              onChange={(val: any) => setPartyEmail(typeof val === "string" ? val : (val?.target?.value ?? ""))}
              icon={<FaEnvelope className="text-[var(--ui-text-subtle)] text-xs" />}
            />
          </div>

          {/* Row 2, Col 2: Address (Optional) */}
          <div>
            <TextInput
              label="Address (Optional)"
              placeholder="Street address, city, district..."
              value={partyAddress}
              onChange={(val: any) => setPartyAddress(typeof val === "string" ? val : (val?.target?.value ?? ""))}
              icon={<FaMapMarkerAlt className="text-[var(--ui-text-subtle)] text-xs" />}
            />
          </div>

          {/* Row 3, Col 1: Opening Balance */}
          <div>
            <TextInput
              label="Opening Balance (৳)"
              type="number"
              placeholder="0.00"
              value={openingBalance}
              onChange={(val: any) => setOpeningBalance(typeof val === "string" ? val : (val?.target?.value ?? ""))}
              icon={<FaMoneyBillWave className="text-[var(--ui-text-subtle)] text-xs" />}
            />
          </div>

          {/* Row 3, Col 2: Status */}
          <div>
            <label className="text-xs font-semibold text-[var(--ui-text)] block mb-1">Status</label>
            <div className="relative">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "active" | "inactive")}
                className="w-full h-9 px-2.5 pr-8 text-xs bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-lg text-[var(--ui-text)] focus:outline-none focus:ring-1 focus:ring-[var(--primary-color,#009fe3)] focus:border-[var(--primary-color,#009fe3)] appearance-none cursor-pointer"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[var(--ui-text-muted)]">
                <RiArrowDropDownLine className="text-xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end items-center gap-2 mt-1 pt-2.5 border-t border-[var(--ui-border)]">
          <Button
            label="Cancel"
            onClick={onClose}
            type="button"
            disabled={isSubmitting}
            color="#6b7280"
            hoverColor="#4b5563"
            buttonClass="!text-xs !py-1.5 !px-3.5"
          />
          <Button
            label={isSubmitting ? "Saving..." : isEdit ? "Update Party" : `Create ${partyType === "CUSTOMER" ? "Customer" : "Supplier"}`}
            type="submit"
            onClick={() => handleSubmit()}
            disabled={!hasPermission || isSubmitting}
            isLoading={isSubmitting}
            color={partyType === "CUSTOMER" ? "var(--primary-color)" : "#059669"}
            hoverColor={partyType === "CUSTOMER" ? "var(--primary-color-hover)" : "#047857"}
            buttonClass="!text-xs !py-1.5 !px-4 font-bold"
          />
        </div>
      </form>
    </Modal>
  );
};

export default PartyModal;
