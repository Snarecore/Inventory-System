import React from "react";
import PageHeader from "@/components/page-header/PageHeader";
import RefreshButton from "@/components/table-components/RefreshButton";
import { OrderSerialSettingsForm } from "./components/OrderSerialSettingsForm";
import { useOrderSerialSettingsQuery } from "@/hooks/useOrderSerialSettings";
import { FaExclamationTriangle, FaRedo } from "react-icons/fa";
import { EMPTY_ORDER_SERIAL_STATE } from "@/types/order-serial.types";
import { useTranslation } from "react-i18next";

export const OrderSerialSettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const {
    data: settingsData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useOrderSerialSettingsQuery();

  return (
    <div className="flex flex-col gap-2.5 px-2.5 py-1.5 sm:px-4 sm:py-2.5 max-w-[1400px] mx-auto w-full">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <PageHeader
          headerTitle={t("Order Serial Settings")}
          headerDescription={t("Configure starting sequence serial numbers for Sales and Purchase orders")}
        />
        <div className="flex items-center gap-2">
          <RefreshButton
            onClick={() => refetch()}
            isRefreshing={isFetching}
            label={t("Refresh")}
          />
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <div>
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 animate-pulse">
            <div className="h-72 bg-[var(--ui-surface)] rounded-xl border border-[var(--ui-border)] p-5 space-y-3">
              <div className="h-6 w-1/3 bg-[var(--ui-surface-sunken)] rounded-md" />
              <div className="h-10 bg-[var(--ui-surface-sunken)] rounded-lg" />
              <div className="h-10 bg-[var(--ui-surface-sunken)] rounded-lg" />
              <div className="h-10 w-1/4 ml-auto bg-[var(--ui-surface-sunken)] rounded-lg" />
            </div>
            <div className="h-72 bg-[var(--ui-surface)] rounded-xl border border-[var(--ui-border)] p-5 space-y-3">
              <div className="h-6 w-1/3 bg-[var(--ui-surface-sunken)] rounded-md" />
              <div className="h-10 bg-[var(--ui-surface-sunken)] rounded-lg" />
              <div className="h-10 bg-[var(--ui-surface-sunken)] rounded-lg" />
              <div className="h-10 w-1/4 ml-auto bg-[var(--ui-surface-sunken)] rounded-lg" />
            </div>
          </div>
        ) : error ? (
          <div className="bg-[var(--ui-surface)] rounded-xl border border-[var(--ui-danger-border)] p-6 text-center space-y-2.5">
            <div className="w-9 h-9 rounded-full bg-[var(--ui-danger-border)] text-[var(--ui-danger)] mx-auto flex items-center justify-center text-base">
              <FaExclamationTriangle />
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-[var(--ui-danger-dark)]">
              {t("Failed to load order serial settings")}
            </h3>
            <p className="text-xs text-[var(--ui-danger)] max-w-md mx-auto">
              {(error as any)?.message || "Unable to retrieve serial settings from server."}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--ui-danger)] hover:bg-[var(--ui-danger-dark)] text-white text-xs font-semibold rounded-md transition-all cursor-pointer"
            >
              <FaRedo className="text-xs" />
              <span>{t("Try Again")}</span>
            </button>
          </div>
        ) : (
          <OrderSerialSettingsForm
            initialData={settingsData || EMPTY_ORDER_SERIAL_STATE}
            onSuccess={() => refetch()}
          />
        )}
      </div>
    </div>
  );
};

export default OrderSerialSettingsPage;
