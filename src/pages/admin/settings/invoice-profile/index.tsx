import React from "react";
import PageHeader from "@/components/page-header/PageHeader";
import RefreshButton from "@/components/table-components/RefreshButton";
import { InvoiceProfileSetupForm } from "./components/InvoiceProfileSetupForm";
import { useInvoiceProfileSetupQuery } from "@/hooks/useInvoiceProfileSetup";
import { FaExclamationTriangle, FaRedo } from "react-icons/fa";

export const InvoiceProfileSetupPage: React.FC = () => {
  const {
    data: setupData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useInvoiceProfileSetupQuery();

  return (
    <div className="flex flex-col gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 max-w-[1600px] mx-auto w-full">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-1.5">
        <PageHeader
          headerTitle="Invoice Profile Setup"
          headerDescription="Configure which business identity, contact, tax appear on printed and digital invoices"
        />
        <div className="flex items-center gap-2">
          <RefreshButton
            onClick={() => refetch()}
            isRefreshing={isFetching}
            label="Refresh"
          />
        </div>
      </div>

      {/* ── Content ── */}
      <div>
        {isLoading ? (
          <div className="bg-[var(--ui-surface)] rounded-xl border border-[var(--ui-border)] p-4 sm:p-6 space-y-4 animate-pulse">
            <div className="h-6 w-1/3 bg-[var(--ui-surface-sunken)] rounded-md" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-20 bg-[var(--ui-surface-sunken)] rounded-lg" />
              <div className="h-20 bg-[var(--ui-surface-sunken)] rounded-lg" />
              <div className="h-20 bg-[var(--ui-surface-sunken)] rounded-lg" />
              <div className="h-20 bg-[var(--ui-surface-sunken)] rounded-lg" />
              <div className="h-20 bg-[var(--ui-surface-sunken)] rounded-lg" />
              <div className="h-20 bg-[var(--ui-surface-sunken)] rounded-lg" />
            </div>
          </div>
        ) : error ? (
          <div className="bg-[var(--ui-surface)] rounded-xl border border-[var(--ui-danger-border)] p-6 text-center space-y-2.5">
            <div className="w-9 h-9 rounded-full bg-[var(--ui-danger-border)] text-[var(--ui-danger)] mx-auto flex items-center justify-center text-base">
              <FaExclamationTriangle />
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-[var(--ui-danger-dark)]">
              Failed to load invoice profile setup
            </h3>
            <p className="text-xs text-[var(--ui-danger)] max-w-md mx-auto">
              {error.message || "Unable to connect to server."}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--ui-danger)] hover:bg-[var(--ui-danger-dark)] text-white text-xs font-semibold rounded-md transition-all cursor-pointer"
            >
              <FaRedo className="text-xs" />
              <span>Try Again</span>
            </button>
          </div>
        ) : (
          <InvoiceProfileSetupForm
            key={setupData?.id ?? "default"}
            initialData={setupData ?? null}
            onSuccess={() => refetch()}
          />
        )}
      </div>
    </div>
  );
};

export default InvoiceProfileSetupPage;
