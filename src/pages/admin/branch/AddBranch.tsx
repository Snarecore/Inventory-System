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
  FaCheckCircle,
} from "react-icons/fa";

const today = () => new Date().toISOString().slice(0, 10);

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
    if (!isEdit && wantsCopy && !form.copybranchId) {
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

        {/* Card 2: Initial Data Cloning (Create mode only) */}
        {!isEdit && (
          <div className="bg-white dark:bg-gray-800 p-3.5 sm:p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs flex flex-col gap-3.5">
            <div className="border-b border-gray-100 dark:border-gray-700 pb-2 flex items-center justify-between">
              <h2 className="text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <FaCopy className="text-[var(--primary-color,#009fe3)]" size={14} />
                <span>Start from an Existing Branch (Optional)</span>
              </h2>
              <span className="text-[11px] text-gray-400">
                Clones setup data once upon creation
              </span>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1 leading-relaxed">
              A new branch starts empty. Select what data you would like to copy over from an existing active branch:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5 sm:gap-3">
              {[
                {
                  key: "categoryCopy" as const,
                  label: "Copy Categories",
                  hint: "Income and expense financial categories",
                },
                {
                  key: "productCopy" as const,
                  label: "Copy Products",
                  hint: "The product catalogue, with its sales & purchase prices",
                },
                {
                  key: "partyCopy" as const,
                  label: "Copy Parties",
                  hint: "Registered customers and suppliers directory",
                },
                {
                  key: "bankCopy" as const,
                  label: "Copy Bank Accounts",
                  hint: "Registered bank accounts and details",
                },
                {
                  key: "mfsCopy" as const,
                  label: "Copy MFS Accounts",
                  hint: "Mobile banking wallets (bKash, Nagad, etc.)",
                },
              ].map((item) => {
                const on = Boolean(form[item.key]);
                return (
                  <label
                    key={item.key}
                    className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                      on
                        ? "border-[var(--primary-color,#009fe3)] bg-blue-50/50 dark:bg-blue-950/30"
                        : "border-gray-200 dark:border-gray-700 bg-gray-50/40 dark:bg-gray-900/30 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={(e) => setField(item.key, e.target.checked)}
                      className="mt-0.5 rounded text-[var(--primary-color,#009fe3)] focus:ring-[var(--primary-color,#009fe3)] cursor-pointer"
                    />
                    <div>
                      <span className="block text-xs font-bold text-gray-800 dark:text-gray-200">
                        {item.label}
                      </span>
                      <span className="block text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                        {item.hint}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>

            {wantsCopy && (
              <div className="max-w-md pt-1.5">
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
        )}

        {/* Card 3: Branch Status (Edit mode only) */}
        {isEdit && (
          <div className="bg-white dark:bg-gray-800 p-3.5 sm:p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs flex flex-col gap-3.5">
            <div className="border-b border-gray-100 dark:border-gray-700 pb-2 flex items-center justify-between">
              <h2 className="text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <FaPowerOff className="text-[var(--primary-color,#009fe3)]" size={14} />
                <span>Branch Lifecycle Status</span>
              </h2>
            </div>

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
