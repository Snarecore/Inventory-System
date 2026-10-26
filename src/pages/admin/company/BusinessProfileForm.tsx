import React, { useState, useEffect, useMemo } from "react";
import Button from "@/components/button/Button";
import InputField from "@/components/form/TextInput";
import SelectInput from "@/components/form/SelectField";
import ImageUpload from "@/components/image/ImageUpload";
import { uploadBusinessLogo, getFileViewUrl, generateFileRefNo } from "@/services/file-upload-service";
import { useSaveBusinessProfileMutation } from "@/hooks/useBusinessProfile";
import { showErrorToast, showSuccessToast } from "@/utils/toast-utils";
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

const initialFormValues: BusinessProfileSavePayload = {
  orgId: "",
  branchId: "",
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

      const resolvedOrgId = initialData.orgId != null ? String(initialData.orgId) : "";
      const resolvedBranchId = initialData.branchId != null ? String(initialData.branchId) : "";

      setFormData({
        orgId: resolvedOrgId,
        branchId: resolvedBranchId,
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

      const resolvedOrgId = initialData.orgId != null ? String(initialData.orgId) : "";
      const resolvedBranchId = initialData.branchId != null ? String(initialData.branchId) : "";

      setFormData({
        orgId: resolvedOrgId,
        branchId: resolvedBranchId,
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
    <form onSubmit={handleSubmitForm} className="flex flex-col gap-2.5">
      {/* ── Card 1: Core Business Information ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-visible">
        {/* Card Header Ribbon */}
        <div className="flex justify-between items-center px-3.5 sm:px-4 py-2 select-none bg-gray-50/70 rounded-t-xl border-b border-gray-200 flex-wrap gap-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xs sm:text-sm font-bold text-black flex items-center gap-1.5">
              <FaBuilding className="text-[var(--primary-color)] text-sm" />
              Business Information
            </h2>
            {formData.orgId && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                Org #{formData.orgId}
              </span>
            )}
            {formData.branchId && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                Branch #{formData.branchId}
              </span>
            )}
          </div>
          {isUploadingLogo && (
            <span className="text-[11px] font-semibold text-[var(--primary-color)] animate-pulse">
              Uploading logo...
            </span>
          )}
        </div>

        {/* Card Body */}
        <div className="p-2.5 sm:p-3.5 flex flex-col gap-2 sm:gap-2.5">
          {/* Top Section: Logo + Core Contact Fields */}
          <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
            {/* Business Logo */}
            <div className="shrink-0">
              <label className="text-xs font-semibold text-black block mb-1">
                Business Logo <span className="text-red-600">*</span>
                <span className="text-[10px] font-normal text-gray-400 ml-1">(500×500 px)</span>
              </label>
              <ImageUpload
                value={logoDisplayUrl || (logoFile ? URL.createObjectURL(logoFile) : "")}
                onChange={handleLogoChange}
                size="sm"
              />
            </div>

            {/* Core Fields Grid: 4 items per row beside logo */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5 w-full">
              {/* Row 1, Col 1: Business Name */}
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

              {/* Row 1, Col 2: Business Type */}
              <div>
                <SelectInput
                  label="Business Type"
                  value={selectedTypeOption}
                  options={businessTypeOptions}
                  onChange={handleBusinessTypeChange}
                  placeholder="Select business type"
                />
              </div>

              {/* Row 1, Col 3: Owner Name */}
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

              {/* Row 1, Col 4: Phone Number */}
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

              {/* Row 2, Col 1: Secondary Phone */}
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

              {/* Row 2, Col 2: Email */}
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

              {/* Row 2, Col 3: Website */}
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

              {/* Row 2, Col 4: Trade License No */}
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
            </div>
          </div>

          {/* Bottom Row: TIN, BIN, Address, Description in 1 row (4 columns) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
            {/* TIN No */}
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

            {/* BIN No */}
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

            {/* Address */}
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

            {/* Description */}
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
        </div>
      </div>

      {/* ── Bottom Action Bar (Matches ProductForm standard buttons) ── */}
      <div className="bg-white shadow-xs rounded-xl border border-gray-200 p-2 sm:px-3 flex items-center justify-end gap-2">
        <Button
          label="Cancel"
          onClick={handleReset}
          color="#6b7280"
          hoverColor="#4b5563"
          disabled={isSaving}
          buttonClass="!text-xs !py-1.5"
        />
        <Button
          label={isSaving || saveMutation.isPending ? "Saving..." : "Save Changes"}
          type="submit"
          onClick={handleSubmitForm}
          color="var(--primary-color)"
          hoverColor="var(--primary-color-hover)"
          isLoading={isSaving || saveMutation.isPending}
          disabled={isSaving || saveMutation.isPending || isUploadingLogo}
          buttonClass="!text-xs !py-1.5 font-bold"
        />
      </div>
    </form>
  );
};

export default BusinessProfileForm;
