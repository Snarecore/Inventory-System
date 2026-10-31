export type MfsStatus = "Active" | "Inactive";

export interface MfsUserItem {
  id: number;
  name: string;
  phoneNumber: string;
  method: string;
  openingBalance: number;
  currentBalance: number;
  status: MfsStatus | string;
}

export interface MfsUserListResponse {
  status: string;
  msg: string;
  mfsUsers: MfsUserItem[];
  data?: MfsUserItem[];
}

export interface InsertMfsUserPayload {
  name: string;
  phoneNumber: string;
  method: string;
  openingBalance: number;
  currentBalance?: number;
  status: MfsStatus | string;
}

export interface UpdateMfsUserPayload {
  id: number;
  name: string;
  phoneNumber: string;
  method: string;
  openingBalance: number;
  currentBalance: number;
  status: MfsStatus | string;
}

export interface UpdateMfsUserStatusPayload {
  id: number;
  status: MfsStatus | string;
}

export interface MfsActionResponse {
  status: string;
  msg: string;
  id?: number;
}
