import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Modal from "@/components/modal/Modal";
import Button from "@/components/button/Button";
import { buildAccessUser } from "@/utils/access-user";
import { postData } from "@/services/api-service";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";
import apiConfig from "@/config/api.json";
import { purchaseChallanSettingsQueryKey } from "@/config/query-key";
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
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<PurchaseChallanSettings>(defaultSettings);

  const getSettingsUrl = apiConfig.purchase.purchaseChallanSettingsUrl;
  const saveSettingsUrl = apiConfig.purchase.insertOrUpdatePurchaseChallanSettingsUrl;

  // Fetch current challan settings
  const { data: rawSettingsData, isLoading } = useQuery({
    queryKey: [purchaseChallanSettingsQueryKey],
    queryFn: async () => {
      try {
        const res = await postData<any>({
          url: getSettingsUrl,
          body: { accessUser: buildAccessUser() },
        });
        return res;
      } catch {
        return null;
      }
    },
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (rawSettingsData) {
      const data = (rawSettingsData as any)?.data || (rawSettingsData as any)?.settings || rawSettingsData;
      if (typeof data === "object" && data !== null) {
        setSettings({
          id: data.id ?? null,
          orgId: data.orgId ?? null,
          branchId: data.branchId ?? null,
          showChallanRefNo: data.showChallanRefNo ?? data.show_challan_ref_no ?? data.showChallanNo ?? data.show_challan_no ?? true,
          showChallanDate: data.showChallanDate ?? data.show_challan_date ?? data.showDeliveryDate ?? data.show_delivery_date ?? true,
          showVatChallan: data.showVatChallan ?? data.show_vat_challan ?? false,
          showVatChallanDate: data.showVatChallanDate ?? data.show_vat_challan_date ?? false,
          attachments: data.attachments ?? data.enableAttachments ?? data.enable_attachments ?? data.showAttachments ?? true,
          remarks: data.remarks ?? data.showNotes ?? data.show_notes ?? true,
          vehicleNumber: data.vehicleNumber ?? data.showVehicleNo ?? data.show_vehicle_no ?? true,
          capacityCft: data.capacityCft ?? data.capacity_cft ?? true,
          driverName: data.driverName ?? data.showDriverName ?? data.show_driver_name ?? true,
          driverPhone: data.driverPhone ?? data.showDriverPhone ?? data.show_driver_phone ?? true,
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

  const saveMutation = useMutation({
    mutationFn: async (updatedSettings: PurchaseChallanSettings) => {
      const payload: any = {
        accessUser: buildAccessUser(),
        showChallanRefNo: Boolean(updatedSettings.showChallanRefNo),
        showChallanDate: Boolean(updatedSettings.showChallanDate),
        showVatChallan: Boolean(updatedSettings.showVatChallan),
        showVatChallanDate: Boolean(updatedSettings.showVatChallanDate),
        attachments: Boolean(updatedSettings.attachments),
        remarks: Boolean(updatedSettings.remarks),
        vehicleNumber: Boolean(updatedSettings.vehicleNumber),
        capacityCft: Boolean(updatedSettings.capacityCft),
        driverName: Boolean(updatedSettings.driverName),
        driverPhone: Boolean(updatedSettings.driverPhone),
        // Aliases for compatibility
        showChallanNo: Boolean(updatedSettings.showChallanRefNo),
        showDeliveryDate: Boolean(updatedSettings.showChallanDate),
        showNotes: Boolean(updatedSettings.remarks),
        showVehicleNo: Boolean(updatedSettings.vehicleNumber),
        enableAttachments: Boolean(updatedSettings.attachments),
        showAttachments: Boolean(updatedSettings.attachments),
      };

      if (updatedSettings.id) {
        payload.id = updatedSettings.id;
      }

      const response = await postData<any>({
        url: saveSettingsUrl,
        body: payload,
      });
      return response;
    },
    onSuccess: (res) => {
      if (res && (res.error || res.status === "Error")) {
        showErrorToast(res.msg || res.message || "Failed to update challan settings");
        return;
      }
      showSuccessToast("Purchase challan settings saved successfully");
      queryClient.setQueryData([purchaseChallanSettingsQueryKey], { status: "Success", data: settings });
      queryClient.invalidateQueries({ queryKey: [purchaseChallanSettingsQueryKey] });
      if (onSaved) onSaved(settings);
      onClose();
    },
    onError: (err: any) => {
      showErrorToast(err?.message || "An error occurred while saving settings");
    },
  });

  const handleToggle = (key: keyof PurchaseChallanSettings) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = () => {
    saveMutation.mutate(settings);
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
            className="px-3.5 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
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
        <p className="text-xs text-gray-500 mb-1">
          Customize which optional challan and logistics fields appear in your purchase entry form.
        </p>

        <div className="flex flex-col divide-y divide-gray-100 max-h-[60vh] overflow-y-auto pr-1">
          {options.map((opt) => {
            const Icon = opt.icon;
            const isChecked = Boolean(settings[opt.key]);

            return (
              <label
                key={opt.key}
                className="flex items-center justify-between py-2 px-1 sm:px-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors select-none"
              >
                <div className="flex items-start gap-2 sm:gap-2.5 min-w-0 pr-2">
                  <div className="p-1.5 rounded-md bg-sky-50 text-[var(--color-primary)] mt-0.5 shrink-0">
                    <Icon size={14} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-gray-800 block truncate">
                      {opt.label}
                    </span>
                    <span className="text-[11px] text-gray-500 leading-tight block">
                      {opt.description}
                    </span>
                  </div>
                </div>

                <div className="relative inline-flex items-center cursor-pointer ml-1.5 sm:ml-3 shrink-0">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggle(opt.key)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
                </div>
              </label>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};

export default ChallanSettingsModal;
