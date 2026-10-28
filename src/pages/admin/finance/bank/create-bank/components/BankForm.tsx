import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaLandmark, FaCreditCard } from "react-icons/fa";
import { Button, ConfirmModal, TextInput, SelectInput, DatePicker } from "@/components/common";
import {
  useBankNameListQuery,
  useBankInfoListQuery,
  useInsertBankAccountMutation,
  useUpdateBankAccountMutation,
} from "@/hooks/useBankQueries";
import { showErrorToast, showSuccessToast } from "@/utils/toast-utils";

interface BankFormProps {
  onSuccessNavigate?: () => void;
  onCancel?: () => void;
}

const getInitialForm = () => {
  const d = new Date(), pad = (n: number) => String(n).padStart(2, "0");
  return {
    bankName: "", bankAccountName: "", accountNo: "", openingBalance: "",
    balanceDate: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    status: "Active" as "Active" | "Inactive", hasCard: false, cardType: "debit" as "debit" | "credit", cardNumber: "",
  };
};

export const BankForm: React.FC<BankFormProps> = ({ onSuccessNavigate, onCancel }) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(getInitialForm());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [syncedId, setSyncedId] = useState<string | null>(null);

  const { data: bankNameData, isLoading: isBankLoading } = useBankNameListQuery();
  const { data: bankInfoData } = useBankInfoListQuery();

  const bankList = bankNameData?.bankNameList || [];
  const existingAccounts = bankInfoData?.bankAccounts || [];
  const bankOptions = bankList.map((b) => ({ label: `${b.bankName}${b.bankShortCode ? ` (${b.bankShortCode})` : ""}`, value: b.bankName }));
  const selectedBankOption = form.bankName ? bankOptions.find((o) => o.value === form.bankName) || { label: form.bankName, value: form.bankName } : null;

  // Sync state during render when edit data is ready
  const existing = id && existingAccounts.length
    ? existingAccounts.find((a) => String(a.bankId) === String(id))
    : null;

  if (id && existing && syncedId !== id) {
    setSyncedId(id);
    setForm({
      bankName: existing.bankName || "",
      bankAccountName: existing.bankAccountName || "",
      accountNo: existing.accountNo || "",
      openingBalance: existing.openingBalance !== undefined ? String(existing.openingBalance) : String(existing.currentBalance ?? ""),
      balanceDate: existing.balanceDate ? existing.balanceDate.substring(0, 10) : "",
      status: (existing.status as "Active" | "Inactive") || "Active",
      hasCard: Boolean(existing.hasCard),
      cardType: (existing.cardType as "debit" | "credit") || "debit",
      cardNumber: existing.cardNumber ? String(existing.cardNumber).replace(/(.{4})/g, "$1 ").trim() : "",
    });
  }

  const insertMutation = useInsertBankAccountMutation({
    onSuccess: () => (onSuccessNavigate ? onSuccessNavigate() : navigate("/admin/banks")),
  });

  const updateMutation = useUpdateBankAccountMutation({
    onSuccess: () => (onSuccessNavigate ? onSuccessNavigate() : navigate("/admin/banks")),
  });

  const isPending = insertMutation.isPending || updateMutation.isPending;

  const setField = (field: string, val: unknown) => {
    setForm((prev) => ({ ...prev, [field]: val }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.bankName.trim()) errs.bankName = "Please select a bank";
    if (!form.bankAccountName.trim()) errs.bankAccountName = "Account holder name is required";
    if (!form.accountNo.trim()) errs.accountNo = "Account number is required";
    else {
      const duplicate = existingAccounts.some(
        (a) => a.accountNo.trim().toLowerCase() === form.accountNo.trim().toLowerCase() && (!isEdit || String(a.bankId) !== String(id))
      );
      if (duplicate) errs.accountNo = `Account "${form.accountNo.trim()}" is already registered`;
    }
    if (form.openingBalance !== "" && (isNaN(Number(form.openingBalance)) || Number(form.openingBalance) < 0)) errs.openingBalance = "Please enter a valid positive balance";
    if (!form.balanceDate) errs.balanceDate = "Opening date is required";
    if (form.hasCard) {
      const d = form.cardNumber.replace(/\D/g, "");
      if (!d || d.length < 12 || d.length > 19) errs.cardNumber = "Card number must be 12-19 digits";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isPending) return;
    if (!validate()) return showErrorToast(Object.values(errors)[0] || "Please fill all required fields correctly");

    const payload = {
      bankAccountName: form.bankAccountName.trim(),
      bankName: form.bankName.trim(),
      accountNo: form.accountNo.trim(),
      openingBalance: Number(form.openingBalance || 0),
      balanceDate: form.balanceDate,
      hasCard: form.hasCard,
      cardType: form.hasCard ? form.cardType : null,
      cardNumber: form.hasCard ? form.cardNumber.replace(/\D/g, "") : null,
      status: form.status,
    };

    if (isEdit && id) {
      updateMutation.mutate({ bankId: Number(id), ...payload });
    } else {
      insertMutation.mutate(payload);
    }
  };

  const formattedBalance = Number(form.openingBalance || 0).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="flex flex-col gap-2.5 px-2.5 py-2 sm:px-4 sm:py-2.5 max-w-[1600px] mx-auto w-full">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-[#F6F6F6] py-2 sm:py-2.5 -mt-2 sm:-mt-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <h1 color="text-[var(--primary-color)]" className="text-sm sm:text-base lg:text-lg font-bold  flex items-center gap-1.5 shrink-0">
            <FaLandmark color="text-[var(--primary-color)]" size={18} />
            <span>{isEdit ? "Edit Bank Account" : "Add New Bank Account"}</span>
          </h1>
          <span className="text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full bg-[var(--primary-color-light)] text-[var(--primary-color)] font-medium">
            {form.accountNo ? `ACC: ${form.accountNo}` : isEdit ? "Editing" : "New Account"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsResetModalOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => (onCancel ? onCancel() : navigate("/admin/banks"))}
            className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors cursor-pointer shadow-2xs"
          >
            Cancel
          </button>
          <Button
            label={isPending ? (isEdit ? "Updating..." : "Saving...") : (isEdit ? "Update Bank Account" : "Save Bank Account")}
            onClick={() => handleSubmit()}
            color="var(--primary-color)"
            disabled={isPending}
            buttonClass="!text-xs !py-1.5 !w-auto justify-center font-medium !text-white"
          />
        </div>
      </div>

      {/* 2-Partition Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        {/* Left Inputs (8 cols) */}
        <div className="lg:col-span-8 bg-white p-3.5 sm:p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col gap-3.5">
          <div className="border-b border-gray-100 pb-2 flex items-center justify-between">
            <h2 className="text-xs sm:text-sm font-bold text-gray-800 flex items-center gap-2">
              <FaLandmark className="text-[var(--primary-color)]" size={14} />
              <span>Bank Account Information</span>
            </h2>
            <span className="text-[11px] text-gray-400">Fields marked with <span className="text-rose-500">*</span> are required</span>
          </div>

          {/* Row 1: Bank Name (SelectInput), Account Holder Name (TextInput), Account Number (TextInput) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="relative z-30">
              <SelectInput label="Bank Name" value={selectedBankOption} options={bankOptions} onChange={(opt) => setField("bankName", opt.value)} placeholder="-- Choose Bank --" required disabled={isBankLoading} />
              {errors.bankName && <p className="text-[11px] text-rose-600 font-medium mt-1">{errors.bankName}</p>}
            </div>
            <TextInput label="Account Holder Name" required value={form.bankAccountName} placeholder="e.g. Main Operation Account" onChange={(val) => setField("bankAccountName", val)} error={errors.bankAccountName} />
            <TextInput label="Account Number" required value={form.accountNo} placeholder="e.g. 123456789012" onChange={(val) => setField("accountNo", val)} error={errors.accountNo} inputClass="font-bold" />
          </div>

          {/* Row 2: Opening Balance (TextInput), Transaction Date (DatePicker), Account Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <TextInput
              label="Opening Balance (৳)"
              type="number"
              step="any"
              value={form.openingBalance}
              placeholder="0"
              onChange={(val) => setField("openingBalance", val)}
              error={errors.openingBalance}
              icon={<span className="text-gray-500 font-bold text-xs select-none">৳</span>}
              inputClass="font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <div>
              <label className="text-xs font-semibold text-black block mb-1">Opening Date <span className="text-rose-500">*</span></label>
              <DatePicker
                value={form.balanceDate}
                onChange={(dateStr) => setField("balanceDate", dateStr || new Date().toISOString().substring(0, 10))}
                disabled={isEdit}
                size="md"
                isClearable={false}
                displayFormat="DD MMM, YYYY"
                placeholder="Select date"
                error={errors.balanceDate}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-black block mb-1">Account Status <span className="text-rose-500">*</span></label>
              <div className="grid grid-cols-2 gap-1 p-0.5 bg-gray-100 rounded-lg border border-gray-300 h-9">
                {(["Active", "Inactive"] as const).map((st) => (
                  <button key={st} type="button" onClick={() => setField("status", st)} className={`rounded-md text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${form.status === st ? (st === "Active" ? "bg-white text-emerald-700 shadow-xs" : "bg-white text-rose-700 shadow-xs") : "text-gray-500 hover:text-black"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${st === "Active" ? "bg-emerald-500" : "bg-rose-500"}`} /><span>{st}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Row 3: Card Linkage */}
          <div className="pt-2 border-t border-gray-100 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={form.hasCard} onChange={(e) => { setField("hasCard", e.target.checked); if (!e.target.checked) setField("cardNumber", ""); }} className="w-4 h-4 text-[var(--primary-color)] rounded border-gray-300 focus:ring-0 cursor-pointer" />
                <FaCreditCard className="text-gray-700" size={13} /><span className="text-xs font-bold text-black">Link Debit / Credit Card to Account</span>
              </label>
              {form.hasCard && <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Card Enabled</span>}
            </div>
            {form.hasCard && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div>
                  <label className="text-xs font-semibold text-black block mb-1">Card Type</label>
                  <div className="grid grid-cols-2 gap-1 p-0.5 bg-white rounded-lg border border-gray-300 h-9">
                    {(["debit", "credit"] as const).map((t) => (
                      <button key={t} type="button" onClick={() => setField("cardType", t)} className={`rounded-md text-xs font-bold uppercase transition-all cursor-pointer flex items-center justify-center ${form.cardType === t ? "bg-[var(--primary-color)] text-white shadow-xs" : "text-gray-600 hover:text-black"}`}>{t} Card</button>
                    ))}
                  </div>
                </div>
                <TextInput
                  label="Card Number"
                  required
                  value={form.cardNumber}
                  placeholder="0000 0000 0000 0000"
                  onChange={(val) => setField("cardNumber", val.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim())}
                  error={errors.cardNumber}
                  inputClass="font-bold tracking-wider"
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Summary Partition (4 cols) */}
        <div className="lg:col-span-4 lg:sticky lg:top-16 flex flex-col gap-2.5">
          <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-gray-200 shadow-xs flex flex-col gap-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-gray-100">
              <span className="text-xs font-bold text-black flex items-center gap-1.5"><span>Account Summary</span></span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${form.status === "Active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"}`}>{form.status}</span>
            </div>

            {/* Digital Card Preview */}
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#01306B] via-[#024394] to-[#011e44] p-3 text-white shadow-sm">
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="p-1.5 rounded-lg bg-white/15 text-white shrink-0"><FaLandmark size={12} /></div>
                  <span className="font-bold text-xs truncate text-white">{form.bankName || "Select Bank"}</span>
                </div>
                {form.hasCard && <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/20 text-white font-bold uppercase">{form.cardType}</span>}
              </div>
              <div className="my-2">
                <span className="text-[9px] uppercase tracking-widest text-blue-200/70 block">Account Number</span>
                <span className="text-sm font-bold tracking-widest text-white block">{form.accountNo ? form.accountNo.replace(/(.{4})/g, "$1 ").trim() : "•••• •••• ••••"}</span>
              </div>
              <div className="flex items-end justify-between gap-2 pt-2 border-t border-white/10">
                <div className="min-w-0">
                  <span className="text-[9px] uppercase tracking-wider text-blue-200/70 block">Account Holder</span>
                  <span className="text-xs font-semibold truncate block text-white">{form.bankAccountName || "Holder Name"}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[9px] uppercase tracking-wider text-blue-200/70 block">Opening Balance</span>
                  <span className="text-xs sm:text-sm font-bold text-emerald-300">৳ {formattedBalance}</span>
                </div>
              </div>
            </div>

            {/* Key-Value Breakdown */}
            <div className="flex flex-col gap-2 p-2 rounded-lg bg-gray-50 border border-gray-200 text-xs">
              <div className="flex items-center justify-between gap-2"><span className="text-black font-semibold">Bank Name:</span><span className="font-bold text-black truncate text-right max-w-[170px]">{form.bankName || "—"}</span></div>
              <div className="flex items-center justify-between gap-2"><span className="text-black font-semibold">Account Title:</span><span className="font-semibold text-gray-800 truncate text-right max-w-[170px]">{form.bankAccountName || "—"}</span></div>
              <div className="flex items-center justify-between gap-2"><span className="text-black font-semibold">Account Number:</span><span className="font-bold text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-200">{form.accountNo || "—"}</span></div>
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-200"><span className="text-black font-bold">Opening Balance:</span><span className="font-extrabold text-[var(--primary-color)] text-base">৳ {formattedBalance}</span></div>
              {form.hasCard && form.cardNumber && (
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-200">
                  <span className="text-black font-semibold flex items-center gap-1"><FaCreditCard size={11} className="text-gray-700" /><span>Card ({form.cardType}):</span></span>
                  <span className="text-gray-800 font-semibold">{form.cardNumber}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={isResetModalOpen}
        title="Reset Bank Account Form"
        message="Are you sure you want to reset this bank account form? All entered details will be discarded."
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={() => {
          setForm(getInitialForm());
          setErrors({});
          setIsResetModalOpen(false);
          showSuccessToast("Bank account form reset successfully!");
        }}
        confirmText="Reset Form"
        cancelText="Keep Editing"
        confirmButtonColor="bg-rose-600 hover:bg-rose-700"
      />
    </div>
  );
};

export default BankForm;
