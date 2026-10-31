import React, { useState } from "react";
import {
  FaPhoneAlt,
  FaEnvelope,
  FaBuilding,
  FaCheckCircle,
  FaArrowRight,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import type { UserProfileData } from "@/types/user-profile.types";
import { useUploadUserProfilePhotoMutation } from "@/hooks/useUserProfile";
import { getUserProfileImageUrl } from "@/services/user-profile-service";
import ImageUpload from "@/components/image/ImageUpload";
import Button from "@/components/button/Button";
import { getUserInfo } from "@/utils/auth-storage";
import { showErrorToast } from "@/utils/toast-utils";

interface ProfileOverviewCardProps {
  profile: UserProfileData | null;
  phone: string;
}

export const ProfileOverviewCard: React.FC<ProfileOverviewCardProps> = ({
  profile,
  phone,
}) => {
  const navigate = useNavigate();
  const userInfo = getUserInfo();
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);

  const uploadPhotoMutation = useUploadUserProfilePhotoMutation();

  const displayName = profile?.fullName || "User";
  const displayPhone = profile?.phoneNumber || phone;
  const displayEmail = profile?.email || "No email added";
  const displayRole = userInfo?.userRole || "ADMIN";
  const accountType = profile?.accountType || "BUSINESS";
  const completion = Math.min(
    100,
    Math.max(
      0,
      Number(profile?.profileCompletionPercentage) ||
        (profile?.email && profile?.address ? 85 : 60)
    )
  );

  const handleImageChange = async (file: File | null) => {
    if (!file) {
      setLocalPreviewUrl(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      showErrorToast("Please select a valid image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showErrorToast("Photo size must be less than 5MB");
      return;
    }

    const preview = URL.createObjectURL(file);
    setLocalPreviewUrl(preview);

    try {
      await uploadPhotoMutation.mutateAsync({ file, phone });
    } catch {
      setLocalPreviewUrl(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-3.5 shadow-2xs flex flex-col gap-2">
      {/* ── Avatar & Basic Info ── */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2.5">
        {/* Reusing ImageUpload component */}
        <div className="shrink-0 flex items-center justify-center sm:justify-start">
          <ImageUpload
            value={localPreviewUrl || getUserProfileImageUrl(phone)}
            onChange={handleImageChange}
            size="sm"
          />
        </div>

        {/* Name and Visible Badges */}
        <div className="flex-1 text-center sm:text-left min-w-0">
          <h2 className="text-base font-bold text-gray-900 truncate">
            {displayName}
          </h2>

          <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-1 flex-wrap">
            <span className="text-[11px] font-bold text-white bg-[#009fe3] px-2 py-0.5 rounded shadow-2xs uppercase tracking-wider">
              {displayRole}
            </span>
            <span className="text-[11px] font-bold text-gray-800 bg-gray-100 border border-gray-300 px-2 py-0.5 rounded uppercase tracking-wider">
              {accountType}
            </span>
          </div>

          <div className="mt-1.5 space-y-0.5 text-xs text-black">
            <div className="flex items-center justify-center sm:justify-start gap-1.5 truncate">
              <FaPhoneAlt size={10} className="text-black shrink-0" />
              <span className="font-mono text-black font-semibold text-[11px]">{displayPhone}</span>
            </div>
            <div className="flex items-center justify-center sm:justify-start gap-1.5 truncate">
              <FaEnvelope size={10} className="text-black shrink-0" />
              <span className="truncate text-black font-medium text-[11px]">{displayEmail}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Profile Completion Meter ── */}
      <div className="pt-1.5 border-t border-gray-100">
        <div className="flex items-center justify-between text-xs mb-0.5">
          <span className="font-semibold text-gray-700 flex items-center gap-1.5 text-[11px]">
            <FaCheckCircle className="text-emerald-500 text-[11px]" />
            Profile Completion
          </span>
          <span className="font-bold text-emerald-600 text-xs">{completion}%</span>
        </div>
        <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-teal-400 to-emerald-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${completion}%` }}
          />
        </div>
        <p className="text-[10px] text-gray-500 mt-0.5">
          {completion < 100
            ? "Complete address and location details to reach 100%."
            : "Your personal profile details are up to date!"}
        </p>
      </div>

      {/* ── System Metadata & Linked Business ── */}
      <div className="grid grid-cols-2 gap-1.5 text-xs">
        <div className="bg-gray-50 py-1 px-2 rounded-md border border-gray-100">
          <span className="text-[10px] text-gray-400 font-medium block leading-tight">
            Business Code
          </span>
          <span className="font-mono font-bold text-gray-800 text-xs">
            {userInfo?.businessCode || "—"}
          </span>
        </div>
        <div className="bg-gray-50 py-1 px-2 rounded-md border border-gray-100">
          <span className="text-[10px] text-gray-400 font-medium block leading-tight">
            User ID
          </span>
          <span className="font-mono font-bold text-gray-800 text-xs">
            #{profile?.userId ?? profile?.id ?? "—"}
          </span>
        </div>
      </div>

      {/* ── Quick link to Company Profile ── */}
      <div className="bg-blue-50/70 border border-blue-100 rounded-lg py-1.5 px-2.5 flex items-center justify-between gap-2">
        <div className="min-w-0 flex items-center gap-1.5">
          <FaBuilding size={11} className="text-[#009fe3] shrink-0" />
          <span className="text-xs font-bold text-[#01306B] truncate">
            {userInfo?.businessName || "Company Profile"}
          </span>
        </div>
        <Button
          type="button"
          label="View"
          onClick={() => navigate("/admin/company")}
          color="var(--primary-color)"
          hoverColor="var(--primary-color-hover)"
          icon={<FaArrowRight size={10} />}
          buttonClass="!text-xs !py-0.5 !px-2 font-semibold shrink-0 cursor-pointer"
        />
      </div>
    </div>
  );
};
