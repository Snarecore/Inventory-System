import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  Button,
  TextInput,
  SelectInput,
  DatePicker,
  FormKeyboardNav,
} from "@/components/common";
import {
  useBranchListQuery,
  useInsertBranchMutation,
  useUpdateBranchMutation,
} from "@/hooks/useBranchQueries";
import type { BranchFormData, BranchItem } from "@/types/branch.types";
import { showErrorToast } from "@/utils/toast-utils";
import {
  FaBuilding,
  FaCopy,
  FaPowerOff,
  FaFolderOpen,
  FaBoxOpen,
  FaUserFriends,
  FaUniversity,
  FaMobileAlt,
} from "react-icons/fa";

const today = () => new Date().toISOString().slice(0, 10);

const COPY_OPTIONS = [
  {
    key: "categoryCopy" as const,
    label: "Copy Categories",
    hint: "Income and expense financial categories",
    icon: FaFolderOpen,
    accent: {
      border: "border-amber-400 dark:border-amber-500",
      bg: "bg-amber-50/70 dark:bg-amber-950/30",
      icon: "bg-amber-100 text-amber-600 dark:bg-amber-900/60 dark:text-amber-300",
      badge: "bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300",
      checkbox: "text-amber-600 focus:ring-amber-500",
      hoverBorder: "hover:border-amber-300 dark:hover:border-amber-600",
    },
  },
  {
    key: "productCopy" as const,
    label: "Copy Products",
    hint: "Product catalogue with purchase & sales prices",
    icon: FaBoxOpen,
    accent: {
      border: "border-sky-400 dark:border-sky-500",
      bg: "bg-sky-50/70 dark:bg-sky-950/30",
      icon: "bg-sky-100 text-sky-600 dark:bg-sky-900/60 dark:text-sky-300",
      badge: "bg-sky-100 text-sky-700 dark:bg-sky-950/80 dark:text-sky-300",
      checkbox: "text-sky-600 focus:ring-sky-500",
      hoverBorder: "hover:border-sky-300 dark:hover:border-sky-600",
    },
  },
  {
    key: "partyCopy" as const,
    label: "Copy Parties",
    hint: "Registered customers and suppliers directory",
    icon: FaUserFriends,
    accent: {
      border: "border-emerald-400 dark:border-emerald-500",
      bg: "bg-emerald-50/70 dark:bg-emerald-950/30",
      icon: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/60 dark:text-emerald-300",
      badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300",
      checkbox: "text-emerald-600 focus:ring-emerald-500",
      hoverBorder: "hover:border-emerald-300 dark:hover:border-emerald-600",
    },
  },
  {
    key: "bankCopy" as const,
    label: "Copy Bank Accounts",
    hint: "Registered bank accounts and details",
    icon: FaUniversity,
    accent: {
      border: "border-indigo-400 dark:border-indigo-500",
      bg: "bg-indigo-50/70 dark:bg-indigo-950/30",
      icon: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/60 dark:text-indigo-300",
      badge: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300",
      checkbox: "text-indigo-600 focus:ring-indigo-500",
      hoverBorder: "hover:border-indigo-300 dark:hover:border-indigo-600",
    },
  },
  {
    key: "mfsCopy" as const,
    label: "Copy MFS Accounts",
    hint: "MFS wallets (bKash, Nagad, etc.)",
    icon: FaMobileAlt,
    accent: {
      border: "border-pink-400 dark:border-pink-500",
      bg: "bg-pink-50/70 dark:bg-pink-950/30",
      icon: "bg-pink-100 text-pink-600 dark:bg-pink-900/60 dark:text-pink-300",
      badge: "bg-pink-100 text-pink-700 dark:bg-pink-950/80 dark:text-pink-300",
      checkbox: "text-pink-600 focus:ring-pink-500",
      hoverBorder: "hover:border-pink-300 dark:hover:border-pink-600",
    },
  },
];

const INITIAL_FORM: BranchFormData = {
  name: "",
  code: "",
  address: "",
  phone: "",
  currency: "BDT",
  openingBalance: "0",
  openingDate: today(),
  categoryCopy: false,
  productCopy: false,
  partyCopy: false,
  bankCopy: false,
  mfsCopy: false,
  copybranchId: "",
  active: true,
};

export const AddBranch: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);

  const { data: branches = [] } = useBranchListQuery();
  const insertMutation = useInsertBranchMutation();
  const updateMutation = useUpdateBranchMutation();

  const [form, setForm] = useState<BranchFormData>(() => {
    const passed = (location.state as any)?.branch as BranchItem | undefined;
    if (passed) {
      return {
        ...INITIAL_FORM,
        ...passed,
        openingBalance: String(passed.openingBalance ?? 0),
        categoryCopy: false,
        productCopy: false,
        partyCopy: false,
        bankCopy: false,
        mfsCopy: false,
        copybranchId: "",
      };
    }
    return INITIAL_FORM;
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const isSaving = insertMutation.isPending || updateMutation.isPending;

  // Sync state if arrived via direct URL in edit mode
  useEffect(() => {
    if (isEdit && !location.state && branches.length > 0) {
      const found = branches.find((b) => String(b.branchId) === String(id));
      if (found) {
        setForm({
          ...INITIAL_FORM,
          ...found,
          openingBalance: String(found.openingBalance ?? 0),
          categoryCopy: false,
          productCopy: false,
          partyCopy: false,
          bankCopy: false,
          mfsCopy: false,
          copybranchId: "",
        });
      }
    }
  }, [isEdit, id, branches, location.state]);

  const setField = (field: keyof BranchFormData, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const wantsCopy =
    form.categoryCopy ||
    form.productCopy ||
    form.partyCopy ||
    form.bankCopy ||
    form.mfsCopy;

  // Active branches to copy from (excluding self in edit mode)
  const copySources = useMemo(
    () => branches.filter((b) => b.active && String(b.branchId) !== String(id)),
    [branches, id]
  );

  const copySourceOptions = useMemo(
    () =>
      copySources.map((b) => ({
        label: `${b.name}${b.code ? ` (${b.code})` : ""}`,
        value: String(b.branchId),
      })),
    [copySources]
  );

  const selectedSourceOption = form.copybranchId
    ? copySourceOptions.find((o) => o.value === String(form.copybranchId)) || null
    : null;

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Branch name is required";
    if (wantsCopy && !form.copybranchId) {
      errs.copybranchId = "Please choose a branch to copy data from";
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      showErrorToast(Object.values(errs)[0]);
      return false;
    }
    return true;
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSaving) return;
    if (!validate()) return;

    if (isEdit) {
      updateMutation.mutate(
        {
          id: Number(id),
          name: form.name.trim(),
          code: form.code.trim(),
          address: form.address.trim(),
          phone: form.phone.trim(),
          currency: form.currency.trim() || "BDT",
          openingBalance: Number(form.openingBalance || 0),
          openingDate: form.openingDate,
          active: form.active,
          categoryCopy: form.categoryCopy,
          productCopy: form.productCopy,
          partyCopy: form.partyCopy,
          bankCopy: form.bankCopy,
          mfsCopy: form.mfsCopy,
          copybranchId: wantsCopy ? form.copybranchId : undefined,
        },
        {
          onSuccess: () => navigate("/admin/branches"),
        }
      );
    } else {
      insertMutation.mutate(
        {
          name: form.name.trim(),
          code: form.code.trim(),
          address: form.address.trim(),
          phone: form.phone.trim(),
          currency: form.currency.trim() || "BDT",
          openingBalance: Number(form.openingBalance || 0),
          openingDate: form.openingDate,
          categoryCopy: form.categoryCopy,
          productCopy: form.productCopy,
          partyCopy: form.partyCopy,
          bankCopy: form.bankCopy,
          mfsCopy: form.mfsCopy,
          copybranchId: wantsCopy ? form.copybranchId : undefined,
        },
        {
          onSuccess: () => navigate("/admin/branches"),
        }
      );
    }
  };

  return (
    <FormKeyboardNav className="flex flex-col gap-2.5 px-2.5 py-2 sm:px-4 sm:py-2.5 max-w-[1600px] mx-auto w-full">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-[var(--ui-surface-sunken,#F6F6F6)] dark:bg-[var(--ui-surface-sunken,#1e293b)] py-2 sm:py-2.5 -mt-2 sm:-mt-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <h1 className="text-sm sm:text-base lg:text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5 shrink-0">
            <FaBuilding className="text-[var(--primary-color,#009fe3)]" size={18} />
            <span>{isEdit ? "Edit Branch" : "Add New Branch"}</span>
          </h1>
          <span className="text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-[var(--primary-color,#009fe3)] font-medium">
            {form.code ? `CODE: ${form.code}` : isEdit ? `Branch #${id}` : "New Location"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/admin/branches")}
            className="px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg transition-colors cursor-pointer shadow-2xs"
          >
            Cancel
          </button>
          <Button
            label={isSaving ? "Saving..." : isEdit ? "Update Branch" : "Save Branch"}
            onClick={() => handleSubmit()}
            color="var(--primary-color)"
            disabled={isSaving}
            buttonClass="!text-xs !py-1.5 !w-auto justify-center font-medium !text-white cursor-pointer"
          />
        </div>
      </div>

      {/* Main Form Cards */}
      <div className="flex flex-col gap-3.5 items-stretch">
        {/* Card 1: Branch Information */}
        <div className="bg-white dark:bg-gray-800 p-3.5 sm:p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs flex flex-col gap-3.5">
          <div className="border-b border-gray-100 dark:border-gray-700 pb-2 flex items-center justify-between">
            <h2 className="text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <FaBuilding className="text-[var(--primary-color,#009fe3)]" size={14} />
              <span>Branch Information</span>
            </h2>
            <span className="text-[11px] text-gray-400">
              Fields marked with <span className="text-rose-500">*</span> are required
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
            <TextInput
              label="Branch Name"
              required
              value={form.name}
              placeholder="e.g. Dhanmondi Branch"
              onChange={(val) => setField("name", val)}
              error={errors.name}
            />

            <TextInput
              label="Branch Code"
              value={form.code}
              placeholder="e.g. DHK-03 (Unique)"
              onChange={(val) => setField("code", val)}
              error={errors.code}
            />

            <TextInput
              label="Phone Number"
              value={form.phone}
              placeholder="01XXXXXXXXX"
              onChange={(val) => setField("phone", val)}
            />

            <TextInput
              label="Branch Address"
              value={form.address}
              placeholder="House, Road, Area, City"
              onChange={(val) => setField("address", val)}
            />

            <DatePicker
              label="Opening Date"
              value={form.openingDate}
              onChange={(dateStr) => setField("openingDate", dateStr)}
            />
          </div>
        </div>

        {/* Card 2: Initial Data Cloning / Copy Options */}
        <div className="bg-white dark:bg-gray-800 p-3 sm:p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs flex flex-col gap-2.5">
          <div className="border-b border-gray-100 dark:border-gray-700 pb-1.5 flex items-center justify-between">
            <h2 className="text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <FaCopy className="text-[var(--primary-color,#009fe3)]" size={13} />
              <span>{isEdit ? "Copy Data from Another Branch (Optional)" : "Start from an Existing Branch (Optional)"}</span>
            </h2>
            <span className="text-[11px] text-gray-400">
              {isEdit ? "Import setup data into this branch" : "Clones setup data once upon creation"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2 sm:gap-2.5">
            {COPY_OPTIONS.map((item) => {
              const on = Boolean(form[item.key]);
              const Icon = item.icon;
              return (
                <label
                  key={item.key}
                  className={`group relative flex flex-col justify-between p-2.5 rounded-lg border cursor-pointer transition-all duration-200 select-none ${
                    on
                      ? `${item.accent.border} ${item.accent.bg} shadow-xs scale-[1.01]`
                      : `border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/80 ${item.accent.hoverBorder} hover:shadow-xs`
                  }`}
                >
                  <div>
                    {/* Icon & Checkbox Header */}
                    <div className="flex items-center justify-between mb-1.5">
                      <div
                        className={`w-7 h-7 rounded-md flex items-center justify-center transition-all duration-200 ${item.accent.icon} ${
                          on ? "scale-105" : "group-hover:scale-105"
                        }`}
                      >
                        <Icon size={13} />
                      </div>
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={(e) => setField(item.key, e.target.checked)}
                        className={`w-3.5 h-3.5 rounded cursor-pointer transition-colors ${item.accent.checkbox}`}
                      />
                    </div>

                    {/* Content */}
                    <span className="block text-xs font-bold text-gray-800 dark:text-gray-100 leading-snug">
                      {item.label}
                    </span>
                    <span className="block text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug line-clamp-2">
                      {item.hint}
                    </span>
                  </div>

                  {/* Bottom Status Badge */}
                  <div className="pt-1.5 mt-1.5 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                      Clone data
                    </span>
                    {on ? (
                      <span
                        className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded ${item.accent.badge}`}
                      >
                        ✓ Selected
                      </span>
                    ) : (
                      <span className="text-[9.5px] font-medium text-gray-400 dark:text-gray-500 px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-700/40">
                        Skip
                      </span>
                    )}
                  </div>
                </label>
              );
            })}
          </div>

          {wantsCopy && (
            <div className="max-w-md pt-1">
              <SelectInput
                label="Copy From Branch"
                required
                value={selectedSourceOption}
                options={copySourceOptions}
                onChange={(opt) => setField("copybranchId", opt.value)}
                placeholder="-- Choose active branch to copy from --"
                error={errors.copybranchId}
              />
            </div>
          )}
        </div>

        {/* Card 3: Branch Status (Edit mode only) */}
        {isEdit && (
          <div className="bg-white dark:bg-gray-800 p-3 sm:p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs flex flex-col gap-2.5">
            <h2 className="text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <FaPowerOff className="text-[var(--primary-color,#009fe3)]" size={13} />
              <span>Branch Lifecycle Status</span>
            </h2>

            <div
              className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                form.active
                  ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800"
                  : "bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-700"
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
                    Branch is {form.active ? "Active" : "Inactive"}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                      form.active
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                        : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {form.active ? "ACTIVE" : "INACTIVE"}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 max-w-lg leading-relaxed">
                  Deactivating this branch removes it from the workspace switcher. No transaction records or historical financial entries will be lost.
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={form.active}
                onClick={() => setField("active", !form.active)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  form.active ? "bg-emerald-600" : "bg-gray-300 dark:bg-gray-600"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    form.active ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        )}
      </div>
    </FormKeyboardNav>
  );
};

export default AddBranch;
