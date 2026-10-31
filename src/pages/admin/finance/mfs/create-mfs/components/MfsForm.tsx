import React, { useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaMobileAlt } from "react-icons/fa";
import { Button, ConfirmModal, TextInput, ToggleInput } from "@/components/common";
import {
  useInsertMfsUserMutation,
  useUpdateMfsUserMutation,
} from "@/hooks/useMfsQueries";
import { MFS_METHODS, methodMeta, PHONE_REGEX, sanitizeDigits } from "@/services/mfs-service";
import MfsLogo from "../../components/MfsLogo";
import { formatMoney } from "@/utils/formatters";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";
import type { MfsUserItem } from "@/types";

interface MfsFormProps {
  initialData?: MfsUserItem | null;
  onSuccessNavigate?: () => void;
  onCancel?: () => void;
}

const getInitialForm = (data?: MfsUserItem | null) => ({
  name: data?.name || "",
  phoneNumber: data?.phoneNumber || "",
  method: data?.method || "Bkash",
  openingBalance: data
    ? String(data.currentBalance ?? data.openingBalance ?? "")
    : "",
  status: (data?.status as "Active" | "Inactive") || "Active",
});

type MfsFormState = ReturnType<typeof getInitialForm>;

export const MfsForm: React.FC<MfsFormProps> = ({
  initialData,
  onSuccessNavigate,
  onCancel,
}) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);

  // Pure state initialization: mounts once directly with initialData via parent key
  const [form, setForm] = useState(() => getInitialForm(initialData));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  const insertMutation = useInsertMfsUserMutation({
    onSuccess: () => (onSuccessNavigate ? onSuccessNavigate() : navigate("/admin/mfs")),
  });

  const updateMutation = useUpdateMfsUserMutation({
    onSuccess: () => (onSuccessNavigate ? onSuccessNavigate() : navigate("/admin/mfs")),
  });

  const isPending = insertMutation.isPending || updateMutation.isPending;

  const setField = useCallback(<K extends keyof MfsFormState>(field: K, val: MfsFormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: val }));
    setErrors((prev) => (prev[field] ? { ...prev, [field]: "" } : prev));
  }, []);

  const handlePhoneChange = useCallback(
    (val: string) => {
      const digits = sanitizeDigits(val).slice(0, 11);
      setField("phoneNumber", digits);
    },
    [setField]
  );

  const validate = useCallback((): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!form.method.trim()) errs.method = "Please select an MFS provider";
    if (!form.name.trim()) errs.name = "Account holder name is required";

    const phone = form.phoneNumber.trim();
    if (!phone) {
      errs.phoneNumber = "Phone number is required";
    } else if (!PHONE_REGEX.test(phone)) {
      errs.phoneNumber = "Enter a valid 11-digit mobile number starting with 01";
    }

    if (
      form.openingBalance !== "" &&
      (isNaN(Number(form.openingBalance)) || Number(form.openingBalance) < 0)
    ) {
      errs.openingBalance = "Please enter a valid positive balance";
    }

    setErrors(errs);
    return errs;
  }, [form]);

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (isPending) return;
      const validationErrors = validate();
      if (Object.keys(validationErrors).length > 0) {
        return showErrorToast(
          Object.values(validationErrors)[0] || "Please fill all required fields correctly"
        );
      }

      const balanceNum = Number(form.openingBalance || 0);

      if (isEdit && id) {
        updateMutation.mutate({
          id: Number(id),
          name: form.name.trim(),
          phoneNumber: form.phoneNumber.trim(),
          method: form.method.trim(),
          openingBalance: balanceNum,
          currentBalance: balanceNum,
          status: form.status,
        });
      } else {
        insertMutation.mutate({
          name: form.name.trim(),
          phoneNumber: form.phoneNumber.trim(),
          method: form.method.trim(),
          openingBalance: balanceNum,
          currentBalance: balanceNum,
          status: form.status,
        });
      }
    },
    [isPending, validate, isEdit, id, form, initialData, updateMutation, insertMutation]
  );

  const brand = methodMeta(form.method);
  const formattedBalance = formatMoney(Number(form.openingBalance || 0));

  return (
    <div className="flex flex-col gap-2.5 px-2.5 py-2 sm:px-4 sm:py-2.5 max-w-[1600px] mx-auto w-full">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-[#F6F6F6] py-2 sm:py-2.5 -mt-2 sm:-mt-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <h1 className="text-sm sm:text-base lg:text-lg font-bold flex items-center gap-1.5 shrink-0 text-[var(--color-primary)]">
            <FaMobileAlt size={18} />
            <span>{isEdit ? "Edit MFS Account" : "Add New MFS Account"}</span>
          </h1>
          <span className="text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-[var(--color-primary)] font-medium">
            {form.phoneNumber ? `ACC: ${form.phoneNumber}` : isEdit ? "Editing" : "New Account"}
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
            onClick={() => (onCancel ? onCancel() : navigate("/admin/mfs"))}
            className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors cursor-pointer shadow-2xs"
          >
            Cancel
          </button>
          <Button
            label={isPending ? (isEdit ? "Updating..." : "Saving...") : (isEdit ? "Update MFS Account" : "Save MFS Account")}
            onClick={() => handleSubmit()}
            color="var(--color-primary)"
            disabled={isPending}
            buttonClass="!text-xs !py-1.5 !w-auto justify-center font-medium !text-white"
          />
        </div>
      </div>

      {/* 2-Partition Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-start">
        {/* Left Inputs (8 cols) */}
        <div className="lg:col-span-8 bg-white p-2.5 sm:p-3 rounded-xl border border-gray-200 shadow-xs flex flex-col gap-2.5">
          <div className="border-b border-gray-100 pb-1.5 flex items-center justify-between">
            <h2 className="text-xs sm:text-sm font-bold text-gray-800 flex items-center gap-1.5">
              <FaMobileAlt className="text-[var(--color-primary)]" size={13} />
              <span>MFS Account Information</span>
            </h2>
            <span className="text-[11px] text-gray-400">
              Fields marked with <span className="text-rose-500">*</span> are required
            </span>
          </div>

          {/* Provider Selection */}
          <div>
            <label className="text-xs font-semibold text-black block mb-1">
              Select Provider <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {MFS_METHODS.map((m) => {
                const isSelected = form.method.toLowerCase() === m.value.toLowerCase();
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setField("method", m.value)}
                    className={`h-9 flex items-center gap-2 px-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      isSelected
                        ? "border-[var(--color-primary)] bg-blue-50/60 ring-1 ring-[var(--color-primary)]"
                        : "border-gray-300 hover:border-gray-400 bg-white"
                    }`}
                  >
                    <MfsLogo method={m.value} size={22} />
                    <span className="text-xs font-bold text-gray-900">{m.label}</span>
                  </button>
                );
              })}
            </div>
            {errors.method && <p className="text-[11px] text-rose-600 font-medium mt-0.5">{errors.method}</p>}
          </div>

          {/* 3 Fields in 1 Single Line */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5">
            <TextInput
              label="Account Holder Name"
              required
              value={form.name}
              placeholder="e.g. Operation Wallet"
              onChange={(val) => setField("name", val)}
              error={errors.name}
            />
            <TextInput
              label="Mobile Number"
              required
              value={form.phoneNumber}
              placeholder="01XXXXXXXXX"
              onChange={handlePhoneChange}
              error={errors.phoneNumber}
              inputClass="font-bold tracking-wider"
            />
            <TextInput
              label="Opening Balance (৳)"
              type="number"
              step="any"
              value={form.openingBalance}
              placeholder="0.00"
              onChange={(val) => setField("openingBalance", val)}
              error={errors.openingBalance}
              icon={<span className="text-gray-500 font-bold text-xs select-none">৳</span>}
              inputClass="font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>

          {/* Account Status Toggle Bar */}
          <div className="pt-1.5 border-t border-gray-100 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-black block">Account Status</span>
              <span className="text-[10px] text-gray-400">
                {form.status === "Active"
                  ? "Wallet is active and ready for transactions"
                  : "Wallet is inactive and temporarily disabled"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                  form.status === "Active"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-rose-50 text-rose-700 border-rose-200"
                }`}
              >
                {form.status}
              </span>
              <ToggleInput
                name="status"
                checked={form.status === "Active"}
                onChange={(checked) => setField("status", checked ? "Active" : "Inactive")}
              />
            </div>
          </div>
        </div>

        {/* Right Summary Partition (4 cols) */}
        <div className="lg:col-span-4 lg:sticky lg:top-16 flex flex-col gap-2.5">
          <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-gray-200 shadow-xs flex flex-col gap-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-gray-100">
              <span className="text-xs font-bold text-black">Account Summary</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                  form.status === "Active"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-rose-50 text-rose-700 border-rose-200"
                }`}
              >
                {form.status}
              </span>
            </div>

            {/* Digital Wallet Card Preview */}
            <div
              className="relative overflow-hidden rounded-xl p-3.5 text-white shadow-sm"
              style={{
                background: `linear-gradient(135deg, ${brand.tint} 0%, #0f172a 120%)`,
              }}
            >
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <MfsLogo method={form.method} size={28} />
                  <span className="font-bold text-xs truncate text-white">{brand.label}</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/20 text-white font-bold uppercase">
                  MFS Wallet
                </span>
              </div>
              <div className="my-2">
                <span className="text-[9px] uppercase tracking-widest text-white/70 block">
                  Wallet Number
                </span>
                <span className="text-sm font-bold tracking-widest text-white block">
                  {form.phoneNumber || "01XXXXXXXXX"}
                </span>
              </div>
              <div className="flex items-end justify-between gap-2 pt-2 border-t border-white/10">
                <div className="min-w-0">
                  <span className="text-[9px] uppercase tracking-wider text-white/70 block">
                    Account Holder
                  </span>
                  <span className="text-xs font-semibold truncate block text-white">
                    {form.name || "Holder Name"}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[9px] uppercase tracking-wider text-white/70 block">
                    Balance
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-emerald-300">
                    ৳ {formattedBalance}
                  </span>
                </div>
              </div>
            </div>

            {/* Key-Value Breakdown */}
            <div className="flex flex-col gap-2 p-2 rounded-lg bg-gray-50 border border-gray-200 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-black font-semibold">Provider:</span>
                <span className="font-bold text-black">{brand.label}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-black font-semibold">Account Title:</span>
                <span className="font-semibold text-gray-800 truncate text-right max-w-[170px]">
                  {form.name || "—"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-black font-semibold">Phone Number:</span>
                <span className="font-bold text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-200">
                  {form.phoneNumber || "—"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-200">
                <span className="text-black font-bold">Balance:</span>
                <span className="font-extrabold text-[var(--color-primary)] text-base">
                  ৳ {formattedBalance}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={isResetModalOpen}
        title="Reset MFS Account Form"
        message="Are you sure you want to reset this form? All entered details will be discarded."
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={() => {
          setForm(getInitialForm());
          setErrors({});
          setIsResetModalOpen(false);
          showSuccessToast("Form reset successfully!");
        }}
        confirmText="Reset Form"
        cancelText="Keep Editing"
        confirmButtonColor="bg-rose-600 hover:bg-rose-700"
      />
    </div>
  );
};

export default MfsForm;
