export type OrderSerialType = "SALE" | "PURCHASE";

export interface OrderSerialSettingItem {
  serialType: OrderSerialType | string;
  lastNumber: number;
  padLength: number;
  nextOrderNo: string;
}

export interface OrderSerialSettingsState {
  sale: OrderSerialSettingItem;
  purchase: OrderSerialSettingItem;
}

export interface UpdateOrderSerialSettingPayload {
  serialType: OrderSerialType | string;
  startNumber: string;
}

export const EMPTY_ORDER_SERIAL_STATE: OrderSerialSettingsState = {
  sale: {
    serialType: "SALE",
    lastNumber: 0,
    padLength: 6,
    nextOrderNo: "",
  },
  purchase: {
    serialType: "PURCHASE",
    lastNumber: 0,
    padLength: 6,
    nextOrderNo: "",
  },
};
