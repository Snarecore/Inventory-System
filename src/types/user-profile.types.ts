export interface UserProfileData {
  id: number | null;
  accountType: string | null;
  fullName: string;
  phoneNumber: string;
  email: string | null;
  divisionId: number | null;
  divisionName: string | null;
  districtId: number | null;
  districtName: string | null;
  upazilaId: number | null;
  upazilaName: string | null;
  address: string | null;
  pin: string | null;
  isInventory: string | null;
  pinRequiredFor: string | null;
  isSilentMode: boolean | null;
  balanceCheckEnabled: boolean | null;
  status: string | null;
  profileCompletionPercentage: number | null;
  addedBy: string | null;
  addedDate: string | null;
  updatedBy: string | null;
  userId: number | null;
  updatedDate: string | null;
}

export interface UpdateUserProfilePayload {
  id: number | null;
  accountType: string | null;
  fullName: string;
  phoneNumber: string;
  email: string | null;
  divisionId: number | null;
  divisionName: string | null;
  districtId: number | null;
  districtName: string | null;
  upazilaId: number | null;
  upazilaName: string | null;
  address: string | null;
  pin: string | null;
  isInventory: string | null;
  pinRequiredFor: string | null;
  isSilentMode: boolean | null;
  balanceCheckEnabled: boolean | null;
  status: string | null;
  profileCompletionPercentage: number | null;
  addedBy: string | null;
  addedDate: string | null;
  updatedBy: string | null;
  userId: number | null;
  updatedDate: string | null;
}
