import React, { useState, useEffect, useMemo } from "react";
import InputField from "@/components/form/TextInput";
import SelectInput from "@/components/form/SelectField";
import ImageUpload from "@/components/image/ImageUpload";
import { uploadBusinessLogo, getFileViewUrl, generateFileRefNo } from "@/services/file-upload-service";
import { useSaveBusinessProfileMutation } from "@/hooks/useBusinessProfile";
import { showErrorToast, showSuccessToast } from "@/utils/toast-utils";
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

const initialFormValues: BusinessProfileSavePayload = {
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
  description: "",
};

export const BusinessProfileForm: React.FC<BusinessProfileFormProps> = ({
  initialData,
  businessTypes,
  onSuccess,
}) => {
  const saveMutation = useSaveBusinessProfileMutation();

  const [formData, setFormData] = useState<BusinessProfileSavePayload>(initialFormValues);
  const [selectedTypeOption, setSelectedTypeOption] = useState<Option | null>(null);

  // Logo file and display preview
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoDisplayUrl, setLogoDisplayUrl] = useState<string>("");
  const [isUploadingLogo, setIsUploadingLogo] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Options for Business Type dropdown
  const businessTypeOptions: Option[] = useMemo(() => {
    return (businessTypes || []).map((t) => ({
      label: t.icon ? `${t.icon} ${t.labelBn} (${t.labelEn})` : `${t.labelBn} (${t.labelEn})`,
      value: t.labelEn,
    }));
  }, [businessTypes]);

  // Sync data from backend
  useEffect(() => {
    if (initialData) {
      const resolvedLogo =
        initialData.businessLogo ||
        initialData.businessLogoRefNo ||
        "";

      setFormData({
        businessName: initialData.businessName || "",
        businessType: initialData.businessType || "",
        businessOwnerName: initialData.businessOwnerName || "",
        businessPhone1: initialData.businessPhone1 || "",
        businessPhone2: initialData.businessPhone2 || "",
        businessEmail: initialData.businessEmail || "",
        website: initialData.website || "",
        address: initialData.address || "",
        tradeLicenseNo: initialData.tradeLicenseNo || "",
        tinNo: initialData.tinNo || "",
        binNo: initialData.binNo || "",
        businessLogo: resolvedLogo,
        businessLogoRefNo: resolvedLogo,
        description: initialData.description || "",
      });

      // Match selected business type
      if (initialData.businessType) {
        const matched = businessTypeOptions.find(
          (opt) => opt.value.toLowerCase() === initialData.businessType.toLowerCase()
        );
        setSelectedTypeOption(
          matched || {
            label: initialData.businessType,
            value: initialData.businessType,
          }
        );
      } else {
        setSelectedTypeOption(null);
      }

      // Resolve logo URL (support businessLogoUrl, businessLogoRefNo, or businessLogo)
      const initialLogo =
        initialData.businessLogoUrl ||
        (initialData.businessLogoRefNo ? getFileViewUrl(initialData.businessLogoRefNo) : "") ||
        (initialData.businessLogo ? getFileViewUrl(initialData.businessLogo) : "");

      setLogoDisplayUrl(initialLogo);
      setLogoFile(null);
    }
  }, [initialData, businessTypeOptions]);

  // Input change handler
  const handleFieldChange = (fieldName: keyof BusinessProfileSavePayload, value: string) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
    if (errors[fieldName]) {
      setErrors((prev) => ({ ...prev, [fieldName]: "" }));
    }
  };

  // Business Type handler
  const handleBusinessTypeChange = (option: Option) => {
    setSelectedTypeOption(option);
    setFormData((prev) => ({ ...prev, businessType: option.value }));
  };

  // Logo upload handler with instant preview and background upload
  const handleLogoChange = async (file: File | null) => {
    if (!file) {
      // User removed the logo
      setLogoFile(null);
      setLogoDisplayUrl("");
      setFormData((prev) => ({ ...prev, businessLogo: "", businessLogoRefNo: "" }));
      return;
    }

    setLogoFile(file);
    // Instant local preview
    const localUrl = URL.createObjectURL(file);
    setLogoDisplayUrl(localUrl);

    // Upload immediately in background
    setIsUploadingLogo(true);
    try {
      const fileRefNo = generateFileRefNo(formData.businessPhone1);
      const uploadRes = await uploadBusinessLogo({
        file,
        category: "business-logo",
        fileRefNo,
        userName: formData.businessPhone1 || undefined,
        subCategory: "",
      });

      if (uploadRes?.fileGUID) {
        const fullLogoUrl = getFileViewUrl(uploadRes.fileGUID);
        setFormData((prev) => ({
          ...prev,
          businessLogo: uploadRes.fileGUID,
          businessLogoRefNo: uploadRes.fileGUID,
          businessLogoUrl: fullLogoUrl,
        }));
        setLogoDisplayUrl(fullLogoUrl);
        showSuccessToast("Logo uploaded successfully");
      }
    } catch (err: any) {
      console.warn("Background upload warning:", err);
      // Keep local preview, will retry during form save if needed
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // Reset form
  const handleReset = () => {
    if (initialData) {
      const resolvedLogo =
        initialData.businessLogo ||
        initialData.businessLogoRefNo ||
        "";

      setFormData({
        businessName: initialData.businessName || "",
        businessType: initialData.businessType || "",
        businessOwnerName: initialData.businessOwnerName || "",
        businessPhone1: initialData.businessPhone1 || "",
        businessPhone2: initialData.businessPhone2 || "",
        businessEmail: initialData.businessEmail || "",
        website: initialData.website || "",
        address: initialData.address || "",
        tradeLicenseNo: initialData.tradeLicenseNo || "",
        tinNo: initialData.tinNo || "",
        binNo: initialData.binNo || "",
        businessLogo: resolvedLogo,
        businessLogoRefNo: resolvedLogo,
        description: initialData.description || "",
      });

      const initialLogo =
        initialData.businessLogoUrl ||
        (initialData.businessLogoRefNo ? getFileViewUrl(initialData.businessLogoRefNo) : "") ||
        (initialData.businessLogo ? getFileViewUrl(initialData.businessLogo) : "");

      setLogoDisplayUrl(initialLogo);
      setLogoFile(null);

      if (initialData.businessType) {
        const matched = businessTypeOptions.find(
          (opt) => opt.value.toLowerCase() === initialData.businessType.toLowerCase()
        );
        setSelectedTypeOption(
          matched || { label: initialData.businessType, value: initialData.businessType }
        );
      } else {
        setSelectedTypeOption(null);
      }
    } else {
      setFormData(initialFormValues);
      setLogoDisplayUrl("");
      setLogoFile(null);
      setSelectedTypeOption(null);
    }
    setErrors({});
  };

  // Validation
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.businessName?.trim()) {
      newErrors.businessName = "Business Name is required";
    }
    if (!formData.businessOwnerName?.trim()) {
      newErrors.businessOwnerName = "Owner Name is required";
    }
    if (!formData.businessPhone1?.trim()) {
      newErrors.businessPhone1 = "Phone Number is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      showErrorToast("Please fill in the required fields");
      return;
    }

    setIsSaving(true);
    try {
      let finalLogo = formData.businessLogo || formData.businessLogoRefNo || "";

      // If user selected a new file and it's not yet uploaded to server
      if (logoFile && (!finalLogo || finalLogo.startsWith("blob:") || finalLogo.startsWith("data:"))) {
        try {
          const fileRefNo = generateFileRefNo(formData.businessPhone1);
          const uploadRes = await uploadBusinessLogo({
            file: logoFile,
            category: "business-logo",
            fileRefNo,
            userName: formData.businessPhone1 || undefined,
            subCategory: "",
          });

          if (uploadRes?.fileGUID) {
            finalLogo = uploadRes.fileGUID;
          } else {
            throw new Error(uploadRes?.message || "Failed to upload business logo");
          }
        } catch (uploadErr: any) {
          console.error("Logo upload error:", uploadErr);
          showErrorToast(uploadErr?.message || "Failed to upload business logo");
          setIsSaving(false);
          return;
        }
      }

      let cleanKey = finalLogo;
      if (cleanKey.includes("/files/file/")) {
        cleanKey = cleanKey.split("/files/file/").pop() || cleanKey;
      }
      const fullLogoUrl = cleanKey ? getFileViewUrl(cleanKey) : "";

      // Payload:
      // - businessLogo & businessLogoRefNo: clean file GUID
      // - businessLogoUrl: full base URL (e.g. http://.../files/file/<GUID>)
      const payload: BusinessProfileSavePayload = {
        ...formData,
        businessLogo: cleanKey,
        businessLogoRefNo: cleanKey,
        businessLogoUrl: fullLogoUrl,
      };

      await saveMutation.mutateAsync(payload);

      setLogoFile(null);
      if (fullLogoUrl) {
        setLogoDisplayUrl(fullLogoUrl);
      }
      setFormData((prev) => ({
        ...prev,
        businessLogo: cleanKey,
        businessLogoRefNo: cleanKey,
        businessLogoUrl: fullLogoUrl,
      }));

      showSuccessToast("Business profile updated successfully");

      if (onSuccess) {
        onSuccess();
      }
    } catch {
      // Handled by toast
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmitForm}>
      {/* ── Clean CMS Card Container (Matches header-footer-cms & contact-page-cms) ── */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {/* ── Business Logo ── */}
        <div className="mb-6">
          <p className="block text-sm font-medium text-gray-700 mb-2">
            Business Logo: <span className="text-red-500">*</span>
            <span className="text-xs text-gray-500 ml-1">
              (Recommended Size: 500*500 PX)
            </span>
            {isUploadingLogo && (
              <span className="text-xs text-[var(--color-primary)] ml-2">Uploading...</span>
            )}
          </p>
          <ImageUpload
            value={logoDisplayUrl || (logoFile ? URL.createObjectURL(logoFile) : "")}
            onChange={handleLogoChange}
          />
        </div>

        {/* ── Row 1: Business Name & Business Type ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <InputField
              label="Business Name"
              name="businessName"
              value={formData.businessName}
              onChange={(e: any) =>
                handleFieldChange("businessName", typeof e === "string" ? e : e?.target?.value ?? "")
              }
              required
              error={errors.businessName}
              placeholder="e.g. Zia Enterprises"
            />
          </div>
          <div>
            <SelectInput
              label="Business Type"
              value={selectedTypeOption}
              options={businessTypeOptions}
              onChange={handleBusinessTypeChange}
              placeholder="Select business type"
            />
          </div>
        </div>

        {/* ── Row 2: Owner Name & Phone Number ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <InputField
              label="Owner Name"
              name="businessOwnerName"
              value={formData.businessOwnerName}
              onChange={(e: any) =>
                handleFieldChange("businessOwnerName", typeof e === "string" ? e : e?.target?.value ?? "")
              }
              required
              error={errors.businessOwnerName}
              placeholder="e.g. Zia"
            />
          </div>
          <div>
            <InputField
              label="Phone Number"
              name="businessPhone1"
              value={formData.businessPhone1}
              onChange={(e: any) =>
                handleFieldChange("businessPhone1", typeof e === "string" ? e : e?.target?.value ?? "")
              }
              required
              error={errors.businessPhone1}
              placeholder="e.g. 01317020309"
            />
          </div>
        </div>

        {/* ── Row 3: Secondary Phone & Email ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <InputField
              label="Secondary Phone"
              name="businessPhone2"
              value={formData.businessPhone2}
              onChange={(e: any) =>
                handleFieldChange("businessPhone2", typeof e === "string" ? e : e?.target?.value ?? "")
              }
              placeholder="e.g. 01800000000"
            />
          </div>
          <div>
            <InputField
              label="Email"
              name="businessEmail"
              type="email"
              value={formData.businessEmail}
              onChange={(e: any) =>
                handleFieldChange("businessEmail", typeof e === "string" ? e : e?.target?.value ?? "")
              }
              placeholder="company@example.com"
            />
          </div>
        </div>

        {/* ── Row 4: Website & Address ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <InputField
              label="Website"
              name="website"
              value={formData.website}
              onChange={(e: any) =>
                handleFieldChange("website", typeof e === "string" ? e : e?.target?.value ?? "")
              }
              placeholder="https://example.com"
            />
          </div>
          <div>
            <InputField
              label="Address"
              name="address"
              value={formData.address}
              onChange={(e: any) =>
                handleFieldChange("address", typeof e === "string" ? e : e?.target?.value ?? "")
              }
              placeholder="Business address"
            />
          </div>
        </div>

        {/* ── Row 5: Trade License, TIN, BIN ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div>
            <InputField
              label="Trade License No"
              name="tradeLicenseNo"
              value={formData.tradeLicenseNo}
              onChange={(e: any) =>
                handleFieldChange("tradeLicenseNo", typeof e === "string" ? e : e?.target?.value ?? "")
              }
              placeholder="Trade license number"
            />
          </div>
          <div>
            <InputField
              label="TIN No"
              name="tinNo"
              value={formData.tinNo}
              onChange={(e: any) =>
                handleFieldChange("tinNo", typeof e === "string" ? e : e?.target?.value ?? "")
              }
              placeholder="Tax identification number"
            />
          </div>
          <div>
            <InputField
              label="BIN No"
              name="binNo"
              value={formData.binNo}
              onChange={(e: any) =>
                handleFieldChange("binNo", typeof e === "string" ? e : e?.target?.value ?? "")
              }
              placeholder="Business identification number"
            />
          </div>
        </div>

        {/* ── Row 6: Description ── */}
        <div className="grid grid-cols-1 gap-6 mb-8">
          <div>
            <InputField
              label="Description"
              name="description"
              value={formData.description}
              onChange={(e: any) =>
                handleFieldChange("description", typeof e === "string" ? e : e?.target?.value ?? "")
              }
              placeholder="About the business..."
            />
          </div>
        </div>

        {/* ── Bottom Actions (Standard CMS Buttons) ── */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving || saveMutation.isPending || isUploadingLogo}
            className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-md hover:bg-[var(--color-light-primary)] cursor-pointer text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {isSaving || saveMutation.isPending ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </form>
  );
};

export default BusinessProfileForm;
