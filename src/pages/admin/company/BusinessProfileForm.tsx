import React, { useState, useEffect, useMemo } from "react";
import Button from "@/components/button/Button";
import InputField from "@/components/form/TextInput";
import SelectInput from "@/components/form/SelectField";
import ImageUpload from "@/components/image/ImageUpload";
import { uploadBusinessLogo, getFileViewUrl } from "@/services/file-upload-service";
import { useSaveBusinessProfileMutation } from "@/hooks/useBusinessProfile";
import { showErrorToast } from "@/utils/toast-utils";
import { FaBuilding } from "react-icons/fa";
import type {
  BusinessProfileData,
  BusinessProfileSavePayload,
  BusinessTypeItem,
} from "@/types/business.types";

interface Option {
  label: string;
  value: string;
}

interface BusinessProfileFormProps {
  initialData: BusinessProfileData | null;
  businessTypes: BusinessTypeItem[];
  onSuccess?: () => void;
}

const emptyForm: BusinessProfileSavePayload = {
  businessName: "",
  businessType: "",
  businessOwnerName: "",
  businessPhone1: "",
  businessPhone2: "",
  businessEmail: "",
  website: "",
  address: "",
  tradeLicenseNo: "",
  tinNo: "",
  binNo: "",
  businessLogo: "",
  businessLogoRefNo: "",
  businessLogoUrl: "",
  description: "",
};

export const BusinessProfileForm: React.FC<BusinessProfileFormProps> = ({
  initialData,
  businessTypes,
  onSuccess,
}) => {
  const saveMutation = useSaveBusinessProfileMutation();

  const [formData, setFormData] = useState<BusinessProfileSavePayload>(emptyForm);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isSubmitting = isUploading || saveMutation.isPending;

  // Sync / reset form values from source data
  const populateForm = (data: BusinessProfileData | null) => {
    if (data) {
      const logoKey = data.businessLogoRefNo || data.businessLogo || "";
      setFormData({
        orgId: data.orgId ?? "",
        branchId: data.branchId ?? "",
        businessName: data.businessName || "",
        businessType: data.businessType || "",
        businessOwnerName: data.businessOwnerName || "",
        businessPhone1: data.businessPhone1 || "",
        businessPhone2: data.businessPhone2 || "",
        businessEmail: data.businessEmail || "",
        website: data.website || "",
        address: data.address || "",
        tradeLicenseNo: data.tradeLicenseNo || "",
        tinNo: data.tinNo || "",
        binNo: data.binNo || "",
        businessLogo: logoKey,
        businessLogoRefNo: logoKey,
        businessLogoUrl: data.businessLogoUrl || getFileViewUrl(logoKey),
        description: data.description || "",
      });
    } else {
      setFormData(emptyForm);
    }
    setLogoFile(null);
    setErrors({});
  };

  useEffect(() => {
    populateForm(initialData);
  }, [initialData]);

  // Dropdown options for business types
  const businessTypeOptions: Option[] = useMemo(() => {
    return (businessTypes || []).map((t) => ({
      label: t.icon ? `${t.icon} ${t.labelBn} (${t.labelEn})` : `${t.labelBn} (${t.labelEn})`,
      value: t.labelEn,
    }));
  }, [businessTypes]);

  // Derived selected option for business type
  const selectedTypeOption = useMemo(() => {
    if (!formData.businessType) return null;
    return (
      businessTypeOptions.find(
        (opt) => opt.value.toLowerCase() === formData.businessType?.toLowerCase()
      ) || { label: formData.businessType, value: formData.businessType }
    );
  }, [businessTypeOptions, formData.businessType]);

  // Field update helper
  const updateField = (field: keyof BusinessProfileSavePayload) => (val: any) => {
    const value = typeof val === "string" ? val : val?.target?.value ?? "";
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  // Logo change handler
  const handleLogoChange = (file: File | null) => {
    setLogoFile(file);
    if (!file) {
      setFormData((prev) => ({
        ...prev,
        businessLogo: "",
        businessLogoRefNo: "",
        businessLogoUrl: "",
      }));
    }
  };

  // Validation
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.businessName?.trim()) newErrors.businessName = "Business Name is required";
    if (!formData.businessOwnerName?.trim()) newErrors.businessOwnerName = "Owner Name is required";
    if (!formData.businessPhone1?.trim()) newErrors.businessPhone1 = "Phone Number is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit handler
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      showErrorToast("Please fill in the required fields");
      return;
    }

    try {
      setIsUploading(true);
      let logoKey = formData.businessLogo || "";

      // Upload newly selected image if present
      if (logoFile) {
        logoKey = await uploadBusinessLogo(logoFile, formData.businessPhone1);
      }
      setIsUploading(false);

      await saveMutation.mutateAsync({
        ...formData,
        businessLogo: logoKey,
        businessLogoRefNo: logoKey,
        businessLogoUrl: getFileViewUrl(logoKey),
      });

      setLogoFile(null);
      onSuccess?.();
    } catch (err: any) {
      setIsUploading(false);
      if (!saveMutation.isError) {
        showErrorToast(err?.message || "Failed to save profile");
      }
    }
  };

  return (
    <form onSubmit={handleSubmitForm} className="flex flex-col gap-2.5">
      {/* ── Business Information Card ── */}
      <div className="bg-[var(--ui-surface)] rounded-xl border border-[var(--ui-border)] shadow-xs overflow-visible">
        {/* Card Header Ribbon */}
        <div className="flex justify-between items-center px-3.5 sm:px-4 py-2 select-none bg-[var(--ui-surface-muted)]/70 rounded-t-xl border-b border-[var(--ui-border)] flex-wrap gap-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xs sm:text-sm font-bold text-[var(--ui-text)] flex items-center gap-1.5">
              <FaBuilding className="text-[var(--primary-color)] text-sm" />
              Business Information
            </h2>
            {formData.orgId && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[var(--primary-color-light)] text-[var(--primary-color-dark)] border border-[var(--primary-color-muted)]">
                Org {formData.orgId}
              </span>
            )}
            {formData.branchId && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[var(--ui-success-light)] text-[var(--ui-success-dark)] border border-[var(--ui-success-border)]">
                Branch {formData.branchId}
              </span>
            )}
          </div>
        </div>

        {/* Card Body */}
        <div className="p-2.5 sm:p-3.5 flex flex-col gap-2 sm:gap-2.5">
          {/* Top Section: Logo + 8 fields (4x2 grid) */}
          <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
            <div className="shrink-0">
              <label className="text-xs font-semibold text-[var(--ui-text)] block mb-1">
                Business Logo <span className="text-[var(--ui-danger)]">*</span>
                <span className="text-[10px] font-normal text-[var(--ui-text-subtle)] ml-1">(500×500 px)</span>
              </label>
              <ImageUpload
                value={logoFile || formData.businessLogoUrl || getFileViewUrl(formData.businessLogo)}
                onChange={handleLogoChange}
                size="sm"
              />
            </div>

            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5 w-full">
              <InputField
                label="Business Name"
                name="businessName"
                value={formData.businessName}
                onChange={updateField("businessName")}
                required
                error={errors.businessName}
                placeholder="e.g. Zia Enterprise"
              />

              <SelectInput
                label="Business Type"
                value={selectedTypeOption}
                options={businessTypeOptions}
                onChange={(opt: Option) =>
                  setFormData((prev) => ({ ...prev, businessType: opt.value }))
                }
                placeholder="Select business type"
              />

              <InputField
                label="Owner Name"
                name="businessOwnerName"
                value={formData.businessOwnerName}
                onChange={updateField("businessOwnerName")}
                required
                error={errors.businessOwnerName}
                placeholder="e.g. Zia"
              />

              <InputField
                label="Phone Number"
                name="businessPhone1"
                value={formData.businessPhone1}
                onChange={updateField("businessPhone1")}
                required
                error={errors.businessPhone1}
                placeholder="e.g. 01317090809"
              />

              <InputField
                label="Secondary Phone"
                name="businessPhone2"
                value={formData.businessPhone2}
                onChange={updateField("businessPhone2")}
                placeholder="e.g. 01800000000"
              />

              <InputField
                label="Email"
                name="businessEmail"
                type="email"
                value={formData.businessEmail}
                onChange={updateField("businessEmail")}
                placeholder="company@example.com"
              />

              <InputField
                label="Website"
                name="website"
                value={formData.website}
                onChange={updateField("website")}
                placeholder="https://example.com"
              />

              <InputField
                label="Trade License No"
                name="tradeLicenseNo"
                value={formData.tradeLicenseNo}
                onChange={updateField("tradeLicenseNo")}
                placeholder="Trade license number"
              />
            </div>
          </div>

          {/* Bottom Row: 4 fields in 1 row (4 columns) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
            <InputField
              label="TIN No"
              name="tinNo"
              value={formData.tinNo}
              onChange={updateField("tinNo")}
              placeholder="Tax identification number"
            />

            <InputField
              label="BIN No"
              name="binNo"
              value={formData.binNo}
              onChange={updateField("binNo")}
              placeholder="Business identification number"
            />

            <InputField
              label="Address"
              name="address"
              value={formData.address}
              onChange={updateField("address")}
              placeholder="Business address"
            />

            <InputField
              label="Description"
              name="description"
              value={formData.description}
              onChange={updateField("description")}
              placeholder="About the business..."
            />
          </div>
        </div>
      </div>

      {/* ── Action Buttons ── */}
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          label="Cancel"
          onClick={() => populateForm(initialData)}
          color="#6b7280"
          hoverColor="#4b5563"
          disabled={isSubmitting}
          buttonClass="!text-xs !py-1.5"
        />
        <Button
          label={isSubmitting ? "Saving..." : "Save"}
          type="submit"
          color="var(--primary-color)"
          hoverColor="var(--primary-color-hover)"
          isLoading={isSubmitting}
          disabled={isSubmitting}
          buttonClass="!text-xs !py-1.5 font-bold"
        />
      </div>
    </form>
  );
};

export default BusinessProfileForm;
