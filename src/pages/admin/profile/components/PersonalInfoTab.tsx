import React, { useState, useEffect, useMemo } from "react";
import InputField from "@/components/form/TextInput";
import Button from "@/components/button/Button";
import {
  FaUser,
  FaPhoneAlt,
  FaEnvelope,
  FaMapMarkerAlt,
  FaMapPin,
} from "react-icons/fa";
import { useUpdateUserProfileMutation } from "@/hooks/useUserProfile";
import { showErrorToast } from "@/utils/toast-utils";
import type { UserProfileData, UpdateUserProfilePayload } from "@/types/user-profile.types";

interface PersonalInfoTabProps {
  initialData: UserProfileData | null;
}

interface PersonalFormData {
  fullName: string;
  phoneNumber: string;
  email: string;
  address: string;
  divisionName: string;
  districtName: string;
  upazilaName: string;
}

const emptyForm: PersonalFormData = {
  fullName: "",
  phoneNumber: "",
  email: "",
  address: "",
  divisionName: "",
  districtName: "",
  upazilaName: "",
};

export const PersonalInfoTab: React.FC<PersonalInfoTabProps> = ({
  initialData,
}) => {
  const updateMutation = useUpdateUserProfileMutation();
  const [formData, setFormData] = useState<PersonalFormData>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const initialFormValues = useMemo<PersonalFormData>(() => {
    if (!initialData) return emptyForm;
    return {
      fullName: initialData.fullName,
      phoneNumber: initialData.phoneNumber,
      email: initialData.email ?? "",
      address: initialData.address ?? "",
      divisionName: initialData.divisionName ?? "",
      districtName: initialData.districtName ?? "",
      upazilaName: initialData.upazilaName ?? "",
    };
  }, [initialData]);

  useEffect(() => {
    setFormData(initialFormValues);
    setErrors({});
  }, [initialFormValues]);

  const isDirty = useMemo(() => {
    return (
      formData.fullName !== initialFormValues.fullName ||
      formData.phoneNumber !== initialFormValues.phoneNumber ||
      formData.email !== initialFormValues.email ||
      formData.address !== initialFormValues.address ||
      formData.divisionName !== initialFormValues.divisionName ||
      formData.districtName !== initialFormValues.districtName ||
      formData.upazilaName !== initialFormValues.upazilaName
    );
  }, [formData, initialFormValues]);

  const handleInputChange = (field: keyof PersonalFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleReset = () => {
    setFormData(initialFormValues);
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!formData.fullName || !formData.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    }

    if (!formData.phoneNumber || !formData.phoneNumber.trim()) {
      newErrors.phoneNumber = "Phone number is required";
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = "Please enter a valid email address";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showErrorToast("Please fix the validation errors before saving");
      return;
    }

    const profilePayload: UpdateUserProfilePayload = {
      id: initialData?.id ?? null,
      accountType: initialData?.accountType ?? null,
      fullName: formData.fullName.trim(),
      phoneNumber: formData.phoneNumber.trim(),
      email: formData.email ? formData.email.trim() : null,
      divisionId: initialData?.divisionId ?? null,
      divisionName: formData.divisionName ? formData.divisionName.trim() : null,
      districtId: initialData?.districtId ?? null,
      districtName: formData.districtName ? formData.districtName.trim() : null,
      upazilaId: initialData?.upazilaId ?? null,
      upazilaName: formData.upazilaName ? formData.upazilaName.trim() : null,
      address: formData.address ? formData.address.trim() : null,
      pin: initialData?.pin ?? null,
      isInventory: initialData?.isInventory ?? null,
      pinRequiredFor: initialData?.pinRequiredFor ?? null,
      isSilentMode: initialData?.isSilentMode ?? null,
      balanceCheckEnabled: initialData?.balanceCheckEnabled ?? null,
      status: initialData?.status ?? null,
      profileCompletionPercentage: initialData?.profileCompletionPercentage ?? null,
      addedBy: initialData?.addedBy ?? null,
      addedDate: initialData?.addedDate ?? null,
      updatedBy: initialData?.updatedBy ?? null,
      userId: initialData?.userId ?? null,
      updatedDate: initialData?.updatedDate ?? null,
    };

    await updateMutation.mutateAsync(profilePayload);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
      <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-3.5 shadow-2xs space-y-2.5">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Personal Information</h3>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Update your identity and communication preferences.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Full Name */}
          <InputField
            label="Full Name"
            name="fullName"
            required
            value={formData.fullName}
            onChange={(val) => handleInputChange("fullName", val)}
            placeholder="e.g. Ziaur Rahman"
            error={errors.fullName}
            icon={<FaUser className="text-gray-400 text-xs" />}
          />

          {/* Phone Number */}
          <InputField
            label="Phone Number"
            name="phoneNumber"
            required
            value={formData.phoneNumber}
            onChange={(val) => handleInputChange("phoneNumber", val)}
            placeholder="017xxxxxxxx"
            error={errors.phoneNumber}
            icon={<FaPhoneAlt className="text-gray-400 text-xs" />}
          />

          {/* Email */}
          <InputField
            label="Email Address"
            name="email"
            type="email"
            value={formData.email || ""}
            onChange={(val) => handleInputChange("email", val)}
            placeholder="e.g. user@example.com"
            error={errors.email}
            icon={<FaEnvelope className="text-gray-400 text-xs" />}
          />

          {/* Street Address */}
          <InputField
            label="Street Address"
            name="address"
            value={formData.address || ""}
            onChange={(val) => handleInputChange("address", val)}
            placeholder="e.g. Road 12, Sector 4, Uttara"
            icon={<FaMapMarkerAlt className="text-gray-400 text-xs" />}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <InputField
              label="Division"
              name="divisionName"
              value={formData.divisionName || ""}
              onChange={(val) => handleInputChange("divisionName", val)}
              placeholder="e.g. Dhaka"
              icon={<FaMapPin className="text-gray-400 text-xs" />}
            />
            <InputField
              label="District"
              name="districtName"
              value={formData.districtName || ""}
              onChange={(val) => handleInputChange("districtName", val)}
              placeholder="e.g. Dhaka"
              icon={<FaMapPin className="text-gray-400 text-xs" />}
            />
            <InputField
              label="Upazila / Thana"
              name="upazilaName"
              value={formData.upazilaName || ""}
              onChange={(val) => handleInputChange("upazilaName", val)}
              placeholder="e.g. Uttara"
              icon={<FaMapPin className="text-gray-400 text-xs" />}
            />
          </div>
      </div>

      {/* Form Action Buttons */}
      <div className="flex items-center justify-end gap-2 pt-1">
          <Button
            type="button"
            label="Reset"
            onClick={handleReset}
            disabled={!isDirty || updateMutation.isPending}
            color="#6b7280"
            hoverColor="#4b5563"
            buttonClass="!text-xs !py-1.5 cursor-pointer"
          />
          <Button
            type="submit"
            label={updateMutation.isPending ? "Saving..." : "Save"}
            color="var(--primary-color)"
            hoverColor="var(--primary-color-hover)"
            isLoading={updateMutation.isPending}
            disabled={!isDirty || updateMutation.isPending}
            buttonClass="!text-xs !py-1.5 font-bold cursor-pointer"
          />
        </div>
    </form>
  );
};
