import React, { useState, useEffect } from "react";
import Modal from "@/components/modal/Modal";
import Button from "@/components/button/Button";
import ToggleInput from "@/components/form/ToggleInput";
import {
  usePurchaseChallanSettingsQuery,
  useSavePurchaseChallanSettingsMutation,
} from "@/hooks/usePurchaseChallanSettings";
import type { PurchaseChallanSettings } from "@/types";
import {
  FaSlidersH,
  FaTruck,
  FaUserTie,
  FaPhoneAlt,
  FaCalendarAlt,
  FaFileInvoice,
  FaReceipt,
  FaCalendarCheck,
  FaCubes,
} from "react-icons/fa";

interface ChallanSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (settings: PurchaseChallanSettings) => void;
}

const defaultSettings: PurchaseChallanSettings = {
  showChallanRefNo: true,
  showChallanDate: true,
  showVatChallan: false,
  showVatChallanDate: false,
  attachments: true,
  remarks: true,
  vehicleNumber: true,
  capacityCft: true,
  driverName: true,
  driverPhone: true,
};

const ChallanSettingsModal: React.FC<ChallanSettingsModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const [settings, setSettings] = useState<PurchaseChallanSettings>(defaultSettings);
  const saveMutation = useSavePurchaseChallanSettingsMutation();

  // Fetch current challan settings
  const { data: rawSettingsData, isLoading } = usePurchaseChallanSettingsQuery(isOpen);

  useEffect(() => {
    if (rawSettingsData) {
      const data = (rawSettingsData as any)?.data || (rawSettingsData as any)?.settings || rawSettingsData;
      if (typeof data === "object" && data !== null) {
        setSettings({
          id: data.id ?? null,
          orgId: data.orgId ?? null,
          branchId: data.branchId ?? null,
          showChallanRefNo: data.showChallanRefNo ?? data.showChallanNo ?? true,
          showChallanDate: data.showChallanDate ?? data.showDeliveryDate ?? true,
          showVatChallan: Boolean(data.showVatChallan),
          showVatChallanDate: Boolean(data.showVatChallanDate),
          attachments: data.attachments ?? data.enableAttachments ?? true,
          remarks: data.remarks ?? data.showNotes ?? true,
          vehicleNumber: data.vehicleNumber ?? data.showVehicleNo ?? true,
          capacityCft: data.capacityCft ?? true,
          driverName: data.driverName ?? data.showDriverName ?? true,
          driverPhone: data.driverPhone ?? data.showDriverPhone ?? true,
          businessCode: data.businessCode ?? null,
          phoneNumber: data.phoneNumber ?? null,
          addedBy: data.addedBy ?? null,
          addedDate: data.addedDate ?? null,
          updatedBy: data.updatedBy ?? null,
          updatedDate: data.updatedDate ?? null,
        });
      }
    }
  }, [rawSettingsData]);

  const handleSave = () => {
    saveMutation.mutate(settings, {
      onSuccess: () => {
        if (onSaved) onSaved(settings);
        onClose();
      },
    });
  };

  const handleToggle = (key: keyof PurchaseChallanSettings) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const options = [
    {
      key: "showChallanRefNo" as keyof PurchaseChallanSettings,
      label: "Challan / Ref No",
      description: "Display external supplier challan or reference number field (showChallanRefNo)",
      icon: FaFileInvoice,
    },
    {
      key: "showVatChallan" as keyof PurchaseChallanSettings,
      label: "VAT Challan No",
      description: "Display government Mushak / VAT challan number field (showVatChallan)",
      icon: FaReceipt,
    },
    {
      key: "showVatChallanDate" as keyof PurchaseChallanSettings,
      label: "VAT Challan Date",
      description: "Display VAT challan issued date field (showVatChallanDate)",
      icon: FaCalendarCheck,
    },
    {
      key: "vehicleNumber" as keyof PurchaseChallanSettings,
      label: "Vehicle / Truck No",
      description: "Record carrier vehicle or transport truck license plate number (vehicleNumber)",
      icon: FaTruck,
    },
    {
      key: "capacityCft" as keyof PurchaseChallanSettings,
      label: "Capacity (CFT)",
      description: "Record carrier capacity in cubic feet (capacityCft)",
      icon: FaCubes,
    },
    {
      key: "driverName" as keyof PurchaseChallanSettings,
      label: "Driver Name",
      description: "Record the name of transport driver / delivery agent (driverName)",
      icon: FaUserTie,
    },
    {
      key: "driverPhone" as keyof PurchaseChallanSettings,
      label: "Driver Phone",
      description: "Contact phone number of the carrier or driver (driverPhone)",
      icon: FaPhoneAlt,
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Purchase Challan Field Settings"
      maxWidth="w-full max-w-[540px]"
      footerButtons={
        <div className="flex items-center gap-2 justify-end w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] bg-[var(--ui-surface-sunken)] hover:bg-[var(--ui-border)] rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <Button
            label={saveMutation.isPending ? "Saving..." : "Save Settings"}
            onClick={handleSave}
            color="#009fe3"
            hoverColor="#0085be"
            disabled={saveMutation.isPending || isLoading}
          />
        </div>
      }
    >
      <div className="flex flex-col gap-2.5 py-1">
        <p className="text-xs text-[var(--ui-text-muted)] mb-1">
          Customize which optional challan and logistics fields appear in your purchase entry form.
        </p>

        <div className="flex flex-col divide-y divide-[var(--ui-border)] max-h-[60vh] overflow-y-auto pr-1">
          {options.map((opt) => {
            const Icon = opt.icon;
            const isChecked = Boolean(settings[opt.key]);

            return (
              <label
                key={opt.key}
                className="flex items-center justify-between py-2 px-1 sm:px-2 rounded-lg hover:bg-[var(--ui-surface-muted)] cursor-pointer transition-colors select-none"
              >
                <div className="flex items-start gap-2 sm:gap-2.5 min-w-0 pr-2">
                  <div className="p-1.5 rounded-md bg-[var(--primary-color-light)] text-[var(--color-primary)] mt-0.5 shrink-0">
                    <Icon size={14} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-[var(--ui-text)] block truncate">
                      {opt.label}
                    </span>
                    <span className="text-[11px] text-[var(--ui-text-muted)] leading-tight block">
                      {opt.description}
                    </span>
                  </div>
                </div>

                <ToggleInput
                  checked={isChecked}
                  onChange={() => handleToggle(opt.key)}
                  className="ml-1.5 sm:ml-3 shrink-0"
                />
              </label>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};

export default ChallanSettingsModal;
