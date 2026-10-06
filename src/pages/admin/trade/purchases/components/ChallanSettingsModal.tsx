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
import { FaSlidersH, FaTruck, FaIdCard, FaUserTie, FaPhoneAlt, FaMoneyBillWave, FaCalendarAlt, FaStickyNote, FaFileInvoice } from "react-icons/fa";

interface ChallanSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (settings: PurchaseChallanSettings) => void;
}

const defaultSettings: PurchaseChallanSettings = {
  showChallanNo: true,
  showVehicleNo: true,
  showDriverName: true,
  showDriverPhone: true,
  showTransportCost: true,
  showDeliveryDate: true,
  showNotes: true,
  showPoNumber: true,
};

const ChallanSettingsModal: React.FC<ChallanSettingsModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<PurchaseChallanSettings>(defaultSettings);

  const getSettingsUrl = apiConfig.purchase?.purchaseChallanSettingsUrl || "get-purchase-challan-settings";
  const saveSettingsUrl = apiConfig.purchase?.insertOrUpdatePurchaseChallanSettingsUrl || "insert-or-update-purchase-challan-settings";

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
          showChallanNo: data.showChallanNo ?? data.show_challan_no ?? true,
          showVehicleNo: data.showVehicleNo ?? data.show_vehicle_no ?? true,
          showDriverName: data.showDriverName ?? data.show_driver_name ?? true,
          showDriverPhone: data.showDriverPhone ?? data.show_driver_phone ?? true,
          showTransportCost: data.showTransportCost ?? data.show_transport_cost ?? true,
          showDeliveryDate: data.showDeliveryDate ?? data.show_delivery_date ?? true,
          showNotes: data.showNotes ?? data.show_notes ?? true,
          showPoNumber: data.showPoNumber ?? data.show_po_number ?? true,
        });
      }
    }
  }, [rawSettingsData]);

  const saveMutation = useMutation({
    mutationFn: async (updatedSettings: PurchaseChallanSettings) => {
      const response = await postData<any>({
        url: saveSettingsUrl,
        body: {
          accessUser: buildAccessUser(),
          ...updatedSettings,
        },
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
      key: "showChallanNo" as keyof PurchaseChallanSettings,
      label: "Challan / Ref No",
      description: "Display external supplier challan or reference number field",
      icon: FaFileInvoice,
    },
    {
      key: "showVehicleNo" as keyof PurchaseChallanSettings,
      label: "Vehicle / Truck No",
      description: "Record carrier vehicle or transport truck license plate number",
      icon: FaTruck,
    },
    {
      key: "showDriverName" as keyof PurchaseChallanSettings,
      label: "Driver Name",
      description: "Record the name of transport driver / delivery agent",
      icon: FaUserTie,
    },
    {
      key: "showDriverPhone" as keyof PurchaseChallanSettings,
      label: "Driver Phone",
      description: "Contact phone number of the carrier or driver",
      icon: FaPhoneAlt,
    },
    {
      key: "showTransportCost" as keyof PurchaseChallanSettings,
      label: "Transport / Labor Cost",
      description: "Include dedicated freight, shipping, or unloading labor cost",
      icon: FaMoneyBillWave,
    },
    {
      key: "showDeliveryDate" as keyof PurchaseChallanSettings,
      label: "Expected / Receive Date",
      description: "Specific delivery date or physical stock receive timestamp",
      icon: FaCalendarAlt,
    },
    {
      key: "showPoNumber" as keyof PurchaseChallanSettings,
      label: "PO",
      description: "Link purchase to internal Purchase Order / Requisition number",
      icon: FaIdCard,
    },
    {
      key: "showNotes" as keyof PurchaseChallanSettings,
      label: "Challan Notes & Remarks",
      description: "Extra instructions, terms, and delivery note comments",
      icon: FaStickyNote,
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
                className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors select-none"
              >
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 rounded-md bg-sky-50 text-[var(--color-primary)] mt-0.5">
                    <Icon size={14} />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-gray-800 block">
                      {opt.label}
                    </span>
                    <span className="text-[11px] text-gray-500 leading-tight block">
                      {opt.description}
                    </span>
                  </div>
                </div>

                <div className="relative inline-flex items-center cursor-pointer ml-3 shrink-0">
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
