import React, { useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaMobileAlt } from "react-icons/fa";
import { Button, ConfirmModal, TextInput, SelectInput, DatePicker, FormKeyboardNav } from "@/components/common";
import {
  useMfsUserListQuery,
  useInsertMfsUserMutation,
  useUpdateMfsUserMutation,
} from "@/hooks/useMfsQueries";
import {
  MFS_PROVIDER_OPTIONS,
  PHONE_REGEX,
  sanitizeDigits,
} from "@/services/mfs-service";
import { formatMoney } from "@/utils/formatters";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";
import { usePermission } from "@/hooks/usePermission";
import type { MfsUserItem } from "@/types";

interface MfsFormProps {
  initialData?: MfsUserItem | null;
  onSuccessNavigate?: () => void;
  onCancel?: () => void;
}

const getInitialForm = (data?: MfsUserItem | null) => {
  const d = new Date(), pad = (n: number) => String(n).padStart(2, "0");
  const rawMethod = data?.method || "bKash";
  const matched = MFS_PROVIDER_OPTIONS.find((o) => o.value.toLowerCase() === rawMethod.toLowerCase());
  return {
    method: matched ? matched.value : (rawMethod ? "Other" : "bKash"),
    customMethod: matched ? "" : (rawMethod || ""),
    name: data?.name || "",
    phoneNumber: data?.phoneNumber || "",
    openingBalance: data
      ? String(data.currentBalance ?? data.openingBalance ?? "")
      : "",
    balanceDate: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    status: (data?.status as "Active" | "Inactive") || "Active",
  };
};

type MfsFormState = ReturnType<typeof getInitialForm>;

export const MfsForm: React.FC<MfsFormProps> = ({
  initialData,
  onSuccessNavigate,
  onCancel,
}) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const { canCreate, canUpdate } = usePermission();
  const hasPermission = isEdit ? canUpdate("mfs") : canCreate("mfs");

  const [form, setForm] = useState(() => getInitialForm(initialData));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [syncedId, setSyncedId] = useState<string | null>(null);

  const { data: mfsListData } = useMfsUserListQuery();
  const existingAccounts = mfsListData?.mfsUsers || [];
  const existing = id && existingAccounts.length
    ? existingAccounts.find((a) => String(a.id) === String(id))
    : initialData;

  if (id && existing && syncedId !== id) {
    setSyncedId(id);
    const rawMethod = existing.method || "";
    const matched = MFS_PROVIDER_OPTIONS.find((o) => o.value.toLowerCase() === rawMethod.toLowerCase());
    setForm({
      method: matched ? matched.value : (rawMethod ? "Other" : "bKash"),
      customMethod: matched ? "" : rawMethod,
      name: existing.name || "",
      phoneNumber: existing.phoneNumber || "",
      openingBalance:
        existing.currentBalance !== undefined && existing.currentBalance !== null
          ? String(existing.currentBalance)
          : String(existing.openingBalance ?? ""),
      balanceDate: new Date().toISOString().substring(0, 10),
      status: (existing.status as "Active" | "Inactive") || "Active",
    });
  }

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

  const selectedProviderOption = form.method
    ? {
        label:
          form.method === "Other" && form.customMethod
            ? form.customMethod
            : MFS_PROVIDER_OPTIONS.find((o) => o.value === form.method)?.label || form.method,
        value: form.method,
      }
    : null;

  const displayMethod =
    form.method === "Other"
      ? form.customMethod.trim() || "Custom MFS"
      : form.method || "MFS";

  const validate = useCallback((): Record<string, string> => {
    const errs: Record<string, string> = {};
    const finalMethod = form.method === "Other" ? form.customMethod.trim() : form.method.trim();
    if (!finalMethod) {
      if (form.method === "Other") {
        errs.customMethod = "Custom provider name is required";
      } else {
        errs.method = "Please select an MFS provider";
      }
    }
    if (!form.name.trim()) errs.name = "Account holder name is required";

    const phone = form.phoneNumber.trim();
    if (!phone) {
      errs.phoneNumber = "Phone number is required";
    } else if (!PHONE_REGEX.test(phone)) {
      errs.phoneNumber = "Enter a valid 11-digit mobile number starting with 01";
    } else {
      const duplicate = existingAccounts.some(
        (a) =>
          a.phoneNumber.trim() === phone &&
          (!isEdit || String(a.id) !== String(id))
      );
      if (duplicate) {
        errs.phoneNumber = `MFS account with number "${phone}" already exists`;
      }
    }

    if (
      form.openingBalance !== "" &&
      (isNaN(Number(form.openingBalance)) || Number(form.openingBalance) < 0)
    ) {
      errs.openingBalance = "Please enter a valid positive balance";
    }

    setErrors(errs);
    return errs;
  }, [form, existingAccounts, isEdit, id]);

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!hasPermission) {
        return showErrorToast(`You do not have permission to ${isEdit ? "update" : "create"} MFS accounts.`);
      }
      if (isPending) return;
      const validationErrors = validate();
      if (Object.keys(validationErrors).length > 0) {
        return showErrorToast(
          Object.values(validationErrors)[0] || "Please fill all required fields correctly"
        );
      }

      const balanceNum = Number(form.openingBalance || 0);
      const finalMethod = form.method === "Other" ? form.customMethod.trim() || "MFS" : form.method.trim();

      if (isEdit && id) {
        updateMutation.mutate({
          id: Number(id),
          name: form.name.trim(),
          phoneNumber: form.phoneNumber.trim(),
          method: finalMethod,
          openingBalance: balanceNum,
          currentBalance: balanceNum,
          status: form.status,
        });
      } else {
        insertMutation.mutate({
          name: form.name.trim(),
          phoneNumber: form.phoneNumber.trim(),
          method: finalMethod,
          openingBalance: balanceNum,
          currentBalance: balanceNum,
          status: form.status,
        });
      }
    },
    [isPending, validate, isEdit, id, form, updateMutation, insertMutation, hasPermission]
  );

  const formattedBalance = formatMoney(Number(form.openingBalance || 0));

  return (
    <FormKeyboardNav className="flex flex-col gap-2.5 px-2.5 py-2 sm:px-4 sm:py-2.5 max-w-[1600px] mx-auto w-full">
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
            disabled={!hasPermission || isPending}
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
              <FaMobileAlt className="text-[var(--color-primary)]" size={14} />
              <span>MFS Account Information</span>
            </h2>
            <span className="text-[11px] text-gray-400">
              Fields marked with <span className="text-rose-500">*</span> are required
            </span>
          </div>

          {/* Row 1: MFS Provider (SelectInput), Account Holder Name (TextInput), Mobile Number (TextInput) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="relative z-30">
              <SelectInput
                label="MFS Provider"
                value={selectedProviderOption}
                options={MFS_PROVIDER_OPTIONS}
                onChange={(opt) => {
                  setField("method", opt.value);
                  if (opt.value !== "Other") setField("customMethod", "");
                }}
                placeholder="-- Choose Provider --"
                required
              />
              {errors.method && <p className="text-[11px] text-rose-600 font-medium mt-1">{errors.method}</p>}
            </div>
            <TextInput
              label="Account Holder Name"
              required
              value={form.name}
              placeholder="e.g. Main Merchant Wallet"
              onChange={(val) => setField("name", val)}
              error={errors.name}
            />
            <TextInput
              label="Mobile Number / Account No"
              required
              value={form.phoneNumber}
              placeholder="01XXXXXXXXX"
              onChange={handlePhoneChange}
              error={errors.phoneNumber}
              inputClass="font-bold tracking-wider"
            />
          </div>

          {/* Conditional Custom Provider Input if "Other / Custom" selected */}
          {form.method === "Other" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <TextInput
                label="Custom Provider Name"
                required
                value={form.customMethod}
                placeholder="e.g. MyWallet"
                onChange={(val) => setField("customMethod", val)}
                error={errors.customMethod}
              />
            </div>
          )}

          {/* Row 2: Opening Balance (TextInput), Opening Date (DatePicker), Account Status (Buttons) */}
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
              <label className="text-xs font-semibold text-black block mb-1">
                Opening Date <span className="text-rose-500">*</span>
              </label>
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
              <label className="text-xs font-semibold text-black block mb-1">
                Account Status <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-1 p-0.5 bg-gray-100 rounded-lg border border-gray-300 h-9">
                {(["Active", "Inactive"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setField("status", st)}
                    className={`rounded-md text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      form.status === st
                        ? st === "Active"
                          ? "bg-white text-emerald-700 shadow-xs"
                          : "bg-white text-rose-700 shadow-xs"
                        : "text-gray-500 hover:text-black"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${st === "Active" ? "bg-emerald-500" : "bg-rose-500"}`} />
                    <span>{st}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Summary Partition (4 cols) */}
        <div className="lg:col-span-4 lg:sticky lg:top-16 flex flex-col gap-2.5">
          <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-gray-200 shadow-xs flex flex-col gap-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-gray-100">
              <span className="text-xs font-bold text-black flex items-center gap-1.5">
                <span>Account Summary</span>
              </span>
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

            {/* Digital Card Preview matching BankForm style */}
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#01306B] via-[#024394] to-[#011e44] p-3 text-white shadow-sm">
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="p-1.5 rounded-lg bg-white/15 text-white shrink-0">
                    <FaMobileAlt size={12} />
                  </div>
                  <span className="font-bold text-xs truncate text-white">
                    {displayMethod}
                  </span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/20 text-white font-bold uppercase">
                  MFS Wallet
                </span>
              </div>
              <div className="my-2">
                <span className="text-[9px] uppercase tracking-widest text-blue-200/70 block">
                  Wallet / Mobile Number
                </span>
                <span className="text-sm font-bold tracking-widest text-white block">
                  {form.phoneNumber || "01XXXXXXXXX"}
                </span>
              </div>
              <div className="flex items-end justify-between gap-2 pt-2 border-t border-white/10">
                <div className="min-w-0">
                  <span className="text-[9px] uppercase tracking-wider text-blue-200/70 block">
                    Account Holder
                  </span>
                  <span className="text-xs font-semibold truncate block text-white">
                    {form.name || "Holder Name"}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[9px] uppercase tracking-wider text-blue-200/70 block">
                    Opening Balance
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
                <span className="text-black font-semibold">MFS Provider:</span>
                <span className="font-bold text-black truncate text-right max-w-[170px]">
                  {displayMethod}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-black font-semibold">Account Title:</span>
                <span className="font-semibold text-gray-800 truncate text-right max-w-[170px]">
                  {form.name || "—"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-black font-semibold">Mobile Number:</span>
                <span className="font-bold text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-200">
                  {form.phoneNumber || "—"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-200">
                <span className="text-black font-bold">Opening Balance:</span>
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
        message="Are you sure you want to reset this MFS account form? All entered details will be discarded."
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={() => {
          setForm(getInitialForm());
          setErrors({});
          setIsResetModalOpen(false);
          showSuccessToast("MFS account form reset successfully!");
        }}
        confirmText="Reset Form"
        cancelText="Keep Editing"
        confirmButtonColor="bg-rose-600 hover:bg-rose-700"
      />
    </FormKeyboardNav>
  );
};

export default MfsForm;
