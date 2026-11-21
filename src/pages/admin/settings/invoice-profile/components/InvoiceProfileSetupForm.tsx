import React, { useState } from "react";
import Button from "@/components/button/Button";
import ToggleInput from "@/components/form/ToggleInput";
import { useSaveInvoiceProfileSetupMutation } from "@/hooks/useInvoiceProfileSetup";
import { useBusinessProfileQuery } from "@/hooks/useBusinessProfile";
import type {
  InvoiceProfileSetupData,
  InvoiceProfileSetupSavePayload,
} from "@/types/invoice-profile.types";
import { DEFAULT_INVOICE_PROFILE_SETUP } from "@/types/invoice-profile.types";
import {
  FaImage,
  FaBuilding,
  FaPhone,
  FaPhoneAlt,
  FaEnvelope,
  FaGlobe,
  FaMapMarkerAlt,
  FaCertificate,
  FaFileInvoiceDollar,
  FaReceipt,
  FaCommentDots,
  FaEye,
  FaPrint,
} from "react-icons/fa";

interface InvoiceProfileSetupFormProps {
  initialData: InvoiceProfileSetupData | null;
  onSuccess?: () => void;
}

interface ToggleOptionConfig {
  key: keyof InvoiceProfileSetupSavePayload;
  label: string;
  category: "Identity & Branding" | "Contact Details" | "Location & Legal" | "Footer";
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const TOGGLE_OPTIONS: ToggleOptionConfig[] = [
  // Identity & Branding
  {
    key: "showLogo",
    label: "Business Logo",
    category: "Identity & Branding",
    icon: FaImage,
  },
  {
    key: "showBusinessName",
    label: "Business Name",
    category: "Identity & Branding",
    icon: FaBuilding,
  },

  // Contact Details
  {
    key: "showPhone1",
    label: "Primary Phone",
    category: "Contact Details",
    icon: FaPhone,
  },
  {
    key: "showPhone2",
    label: "Secondary Phone",
    category: "Contact Details",
    icon: FaPhoneAlt,
  },
  {
    key: "showEmail",
    label: "Email Address",
    category: "Contact Details",
    icon: FaEnvelope,
  },
  {
    key: "showWebsite",
    label: "Website URL",
    category: "Contact Details",
    icon: FaGlobe,
  },

  // Location & Legal
  {
    key: "showAddress",
    label: "Physical Address",
    category: "Location & Legal",
    icon: FaMapMarkerAlt,
  },
  {
    key: "showTradeLicenseNo",
    label: "Trade License No",
    category: "Location & Legal",
    icon: FaCertificate,
  },
  {
    key: "showTinNo",
    label: "TIN Number",
    category: "Location & Legal",
    icon: FaFileInvoiceDollar,
  },
  {
    key: "showBinNo",
    label: "BIN / VAT Registration",
    category: "Location & Legal",
    icon: FaReceipt,
  },

  // Footer
  {
    key: "showFooterMessage",
    label: "Footer Note & Terms",
    category: "Footer",
    icon: FaCommentDots,
  },
];

const CATEGORIES: Array<ToggleOptionConfig["category"]> = [
  "Identity & Branding",
  "Contact Details",
  "Location & Legal",
  "Footer",
];

export const InvoiceProfileSetupForm: React.FC<InvoiceProfileSetupFormProps> = ({
  initialData,
  onSuccess,
}) => {
  const saveMutation = useSaveInvoiceProfileSetupMutation();
  const { data: businessProfile } = useBusinessProfileQuery();

  const [formState, setFormState] = useState<InvoiceProfileSetupSavePayload>(() => ({
    id: initialData?.id,
    orgId: initialData?.orgId,
    branchId: initialData?.branchId,
    showLogo: initialData?.showLogo ?? DEFAULT_INVOICE_PROFILE_SETUP.showLogo,
    showBusinessName: initialData?.showBusinessName ?? DEFAULT_INVOICE_PROFILE_SETUP.showBusinessName,
    showPhone1: initialData?.showPhone1 ?? DEFAULT_INVOICE_PROFILE_SETUP.showPhone1,
    showPhone2: initialData?.showPhone2 ?? DEFAULT_INVOICE_PROFILE_SETUP.showPhone2,
    showEmail: initialData?.showEmail ?? DEFAULT_INVOICE_PROFILE_SETUP.showEmail,
    showAddress: initialData?.showAddress ?? DEFAULT_INVOICE_PROFILE_SETUP.showAddress,
    showWebsite: initialData?.showWebsite ?? DEFAULT_INVOICE_PROFILE_SETUP.showWebsite,
    showTradeLicenseNo: initialData?.showTradeLicenseNo ?? DEFAULT_INVOICE_PROFILE_SETUP.showTradeLicenseNo,
    showTinNo: initialData?.showTinNo ?? DEFAULT_INVOICE_PROFILE_SETUP.showTinNo,
    showBinNo: initialData?.showBinNo ?? DEFAULT_INVOICE_PROFILE_SETUP.showBinNo,
    showFooterMessage: initialData?.showFooterMessage ?? DEFAULT_INVOICE_PROFILE_SETUP.showFooterMessage,
  }));

  const handleToggle = (key: keyof InvoiceProfileSetupSavePayload) => {
    setFormState((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = () => {
    saveMutation.mutate(formState, {
      onSuccess: () => {
        if (onSuccess) onSuccess();
      },
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-3">
      {/* ── Left Column: Configuration Controls (7 cols) ── */}
      <div className="lg:col-span-7 flex flex-col gap-2.5">
        {/* Categorized Toggle Sections */}
        {CATEGORIES.map((category) => {
          const categoryOptions = TOGGLE_OPTIONS.filter((opt) => opt.category === category);
          if (categoryOptions.length === 0) return null;

          return (
            <div
              key={category}
              className="bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-xl overflow-hidden shadow-xs"
            >
              <div className="bg-[var(--ui-surface-sunken)] px-3 py-1.5 border-b border-[var(--ui-border)] flex items-center justify-between">
                <h3 className="text-[11px] font-bold text-[var(--ui-text)] uppercase tracking-wider">
                  {category}
                </h3>
              </div>

              <div className="divide-y divide-[var(--ui-border)]">
                {categoryOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isChecked = Boolean(formState[opt.key]);

                  return (
                    <label
                      key={opt.key}
                      className="flex items-center justify-between px-3 py-2 sm:px-3.5 sm:py-2.5 hover:bg-[var(--ui-surface-muted)] cursor-pointer transition-colors select-none"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <div
                          className={`p-1.5 rounded-md shrink-0 transition-colors ${
                            isChecked
                              ? "bg-[var(--primary-color-light)] text-[var(--color-primary)]"
                              : "bg-[var(--ui-surface-sunken)] text-[var(--ui-text-muted)]"
                          }`}
                        >
                          <Icon size={13} />
                        </div>
                        <span className="text-xs font-semibold text-[var(--ui-text)] truncate">
                          {opt.label}
                        </span>
                      </div>

                      <ToggleInput
                        checked={isChecked}
                        onChange={() => handleToggle(opt.key)}
                        className="shrink-0"
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Action Save Bar */}
        <div className="bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-xl px-3 py-2 sm:px-3.5 sm:py-2 flex items-center justify-between gap-2.5 shadow-xs">
          <p className="text-[10.5px] text-[var(--ui-text-muted)]">
            Changes take effect immediately on next invoice prints.
          </p>
          <Button
            label={saveMutation.isPending ? "Saving..." : "Save Invoice Setup"}
            onClick={handleSave}
            color="#009fe3"
            hoverColor="#0085be"
            disabled={saveMutation.isPending}
          />
        </div>
      </div>

      {/* ── Right Column: Live Invoice Preview (5 cols) ── */}
      <div className="lg:col-span-5 flex flex-col gap-2.5">
        <div className="bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-xl p-2.5 sm:p-3 shadow-xs sticky top-3">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--ui-border)]">
            <div className="flex items-center gap-1.5">
              <FaEye className="text-[var(--color-primary)] text-xs" />
              <h3 className="text-xs font-bold text-[var(--ui-text)]">
                Live Invoice Preview
              </h3>
            </div>
            <span className="text-[9.5px] uppercase tracking-wider font-bold text-[var(--ui-text-muted)] bg-[var(--ui-surface-sunken)] px-1.5 py-0.5 rounded">
              Standard Letterhead
            </span>
          </div>

          {/* Simulated Printed Paper Container */}
          <div className="mt-2.5 bg-white text-slate-900 border border-slate-200 rounded-lg p-3 sm:p-3.5 shadow-xs font-sans text-xs">
            {/* Header Flex */}
            <div className="flex justify-between items-start gap-2.5 border-b border-slate-100 pb-2">
              {/* Left Side: Business Info */}
              <div className="flex-1 min-w-0">
                {formState.showLogo && businessProfile?.businessLogoUrl && (
                  <div className="mb-1.5">
                    <img
                      src={businessProfile.businessLogoUrl}
                      alt="Logo"
                      className="h-8 max-w-[100px] object-contain rounded"
                    />
                  </div>
                )}

                {formState.showBusinessName && (
                  <h4 className="font-extrabold text-sm text-[#01306B] leading-tight">
                    {businessProfile?.businessName || "Your Business Name"}
                  </h4>
                )}

                <div className="text-[10px] text-slate-600 mt-0.5 space-y-0.5">
                  {formState.showAddress && (
                    <p className="truncate">
                      {businessProfile?.address || "123 Commercial Road, Dhaka"}
                    </p>
                  )}

                  {(formState.showPhone1 || formState.showPhone2) && (
                    <p>
                      <span className="font-semibold">Tel: </span>
                      {formState.showPhone1 && (businessProfile?.businessPhone1 || "01700000000")}
                      {formState.showPhone1 && formState.showPhone2 && ", "}
                      {formState.showPhone2 && (businessProfile?.businessPhone2 || "01800000000")}
                    </p>
                  )}

                  {formState.showEmail && (
                    <p>
                      <span className="font-semibold">Email: </span>
                      {businessProfile?.businessEmail || "info@business.com"}
                    </p>
                  )}

                  {formState.showWebsite && (
                    <p>
                      <span className="font-semibold">Web: </span>
                      {businessProfile?.website || "www.business.com"}
                    </p>
                  )}
                </div>

                {/* Tax / Licenses Tagline */}
                {(formState.showTradeLicenseNo || formState.showTinNo || formState.showBinNo) && (
                  <div className="mt-1.5 pt-1 border-t border-slate-100 flex flex-wrap gap-x-2 text-[9.5px] text-slate-500">
                    {formState.showTradeLicenseNo && (
                      <span>TRAD: {businessProfile?.tradeLicenseNo || "TRAD-12345"}</span>
                    )}
                    {formState.showTinNo && (
                      <span>TIN: {businessProfile?.tinNo || "123456789012"}</span>
                    )}
                    {formState.showBinNo && (
                      <span>BIN: {businessProfile?.binNo || "9876543210"}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Right Side: Mock Memo Badge */}
              <div className="w-24 border-2 border-[#01306B] rounded p-1 text-center shrink-0">
                <span className="block font-black text-[10px] text-[#01306B] uppercase">
                  CASH MEMO
                </span>
                <span className="block text-[8.5px] text-slate-500 font-mono mt-0.5">
                  INV-2026-001
                </span>
              </div>
            </div>

            {/* Mock Line Items Table */}
            <div className="mt-2">
              <table className="w-full text-[9.5px] text-left border-collapse">
                <thead>
                  <tr className="bg-slate-700 text-white font-bold">
                    <th className="p-1 pl-1.5">Item</th>
                    <th className="p-1 text-center">Qty</th>
                    <th className="p-1 text-right">Rate</th>
                    <th className="p-1 pr-1.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr>
                    <td className="p-1 pl-1.5 font-medium">Sample Product A</td>
                    <td className="p-1 text-center">2 pcs</td>
                    <td className="p-1 text-right">৳ 500</td>
                    <td className="p-1 pr-1.5 text-right font-semibold">৳ 1,000</td>
                  </tr>
                  <tr>
                    <td className="p-1 pl-1.5 font-medium">Sample Product B</td>
                    <td className="p-1 text-center">1 pcs</td>
                    <td className="p-1 text-right">৳ 750</td>
                    <td className="p-1 pr-1.5 text-right font-semibold">৳ 750</td>
                  </tr>
                </tbody>
              </table>

              <div className="flex justify-between items-center pt-1.5 mt-1 border-t-2 border-[#01306B] text-[10px] font-bold text-slate-900">
                <span>Net Total</span>
                <span>৳ 1,750</span>
              </div>
            </div>

            {/* Mock Footer Note */}
            {formState.showFooterMessage ? (
              <div className="mt-2.5 pt-1.5 border-t border-dashed border-slate-300 text-center text-[9.5px] text-slate-500">
                <p className="font-semibold text-slate-700">
                  {businessProfile?.description || "Goods once sold are not returnable. Thank you for your business!"}
                </p>
                <p className="text-[8.5px] text-slate-400 mt-0.5">Please retain this invoice for your records.</p>
              </div>
            ) : (
              <div className="mt-2.5 pt-1.5 border-t border-dashed border-slate-200 text-center text-[9.5px] text-slate-400 italic">
                (Footer message hidden)
              </div>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between text-[10px] text-[var(--ui-text-muted)]">
            <span className="flex items-center gap-1">
              <FaPrint className="text-[11px]" />
              <span>A4 / POS Responsive</span>
            </span>
            <span>Real-time preview</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceProfileSetupForm;
