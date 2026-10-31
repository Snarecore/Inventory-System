import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getUserProfile,
  uploadUserProfilePhoto,
  updateUserProfile,
  sendOtp,
  verifyOtp,
  updateUserPinWithProfile,
  getActiveUserPhone,
} from "@/services/user-profile-service";
import { userProfileQueryKey } from "@/config/query-key";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";
import type {
  UserProfileData,
  UpdateUserProfilePayload,
} from "@/types/user-profile.types";

/**
 * Hook to fetch the current logged-in user profile.
 */
export function useUserProfileQuery(phoneParam?: string) {
  const phone = getActiveUserPhone(phoneParam);

  return useQuery<UserProfileData | null, Error>({
    queryKey: [userProfileQueryKey, phone],
    queryFn: () => getUserProfile(phone),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: Boolean(phone),
  });
}

/**
 * Hook to upload and update user profile photo.
 */
export function useUploadUserProfilePhotoMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, phone }: { file: File; phone?: string }) =>
      uploadUserProfilePhoto(file, phone),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: [userProfileQueryKey] });
      showSuccessToast(res?.msg || "Profile photo uploaded successfully");
    },
    onError: (err: any) => {
      showErrorToast(err?.message || "Failed to upload profile photo");
    },
  });
}

/**
 * Hook to update user personal profile.
 */
export function useUpdateUserProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateUserProfilePayload) => updateUserProfile(payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: [userProfileQueryKey] });
      showSuccessToast(res?.msg || "Profile updated successfully");
    },
    onError: (err: any) => {
      showErrorToast(err?.message || "Failed to update profile");
    },
  });
}

/**
 * Hook to send OTP to registered mobile number.
 */
export function useSendOtpMutation() {
  return useMutation({
    mutationFn: (phone?: string) => sendOtp(phone),
    onSuccess: (res) => {
      showSuccessToast(res?.msg || "OTP sent successfully to your mobile number");
    },
    onError: (err: any) => {
      showErrorToast(err?.message || "Failed to send OTP");
    },
  });
}

/**
 * Hook to verify OTP and update user PIN.
 */
export function useChangePinWithOtpMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      otp,
      newPin,
      profile,
      phone,
    }: {
      otp: string;
      newPin: string;
      profile?: UserProfileData | null;
      phone?: string;
    }) => {
      await verifyOtp(otp, phone);
      return await updateUserPinWithProfile(newPin, profile, phone);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: [userProfileQueryKey] });
      showSuccessToast(res?.msg || "Login PIN updated successfully");
    },
    onError: (err: any) => {
      showErrorToast(err?.message || "Failed to update PIN");
    },
  });
}
