import React from "react";
import { useSearchParams } from "react-router-dom";
import PageHeader from "@/components/page-header/PageHeader";
import RefreshButton from "@/components/table-components/RefreshButton";
import { BusinessProfileForm } from "./BusinessProfileForm";
import { InvoiceProfileSetupForm } from "../settings/invoice-profile/components/InvoiceProfileSetupForm";
import {
  useBusinessProfileQuery,
  useBusinessTypesQuery,
} from "@/hooks/useBusinessProfile";
import { useInvoiceProfileSetupQuery } from "@/hooks/useInvoiceProfileSetup";
import { FaExclamationTriangle, FaRedo, FaBuilding, FaSlidersH } from "react-icons/fa";

export const CompanyPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") === "invoice" ? "invoice" : "business";

  const {
    data: businessProfile,
    isLoading: isBusinessLoading,
    isFetching: isBusinessFetching,
    error: businessError,
    refetch: refetchBusiness,
  } = useBusinessProfileQuery();

  const { data: businessTypes = [] } = useBusinessTypesQuery();

  const {
    data: invoiceSetup,
    isLoading: isInvoiceLoading,
    isFetching: isInvoiceFetching,
    error: invoiceError,
    refetch: refetchInvoice,
  } = useInvoiceProfileSetupQuery();

  const isCurrentLoading = currentTab === "business" ? isBusinessLoading : isInvoiceLoading;
  const isCurrentFetching = currentTab === "business" ? isBusinessFetching : isInvoiceFetching;
  const currentError = currentTab === "business" ? businessError : invoiceError;

  const handleRefresh = () => {
    if (currentTab === "business") {
      refetchBusiness();
    } else {
      refetchInvoice();
    }
  };

  const handleTabChange = (tab: "business" | "invoice") => {
    if (tab === "invoice") {
      setSearchParams({ tab: "invoice" });
    } else {
      setSearchParams({});
    }
  };

  return (
    <div className="flex flex-col gap-2.5 px-3 py-2 sm:px-4 sm:py-2.5 max-w-[1600px] mx-auto w-full">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <PageHeader
          headerTitle={currentTab === "business" ? "Business Profile" : "Invoice Profile Setup"}
          headerDescription={
            currentTab === "business"
              ? "Manage business profile, company information and business logo"
              : "Configure which business identity, contact, tax and footer fields appear on invoices"
          }
        />
        <div className="flex items-center gap-2">
          <RefreshButton
            onClick={handleRefresh}
            isRefreshing={isCurrentFetching}
            label="Refresh"
          />
        </div>
      </div>

      {/* ── Tab Navigation ── */}
      <div className="flex items-center gap-2 border-b border-[var(--ui-border)] pb-1">
        <button
          type="button"
          onClick={() => handleTabChange("business")}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-all cursor-pointer border-b-2 -mb-[5px] ${
            currentTab === "business"
              ? "border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--primary-color-light)]"
              : "border-transparent text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-surface-sunken)]"
          }`}
        >
          <FaBuilding size={13} />
          <span>Business Profile</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("invoice")}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-all cursor-pointer border-b-2 -mb-[5px] ${
            currentTab === "invoice"
              ? "border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--primary-color-light)]"
              : "border-transparent text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-surface-sunken)]"
          }`}
        >
          <FaSlidersH size={13} />
          <span>Invoice Setup</span>
        </button>
      </div>

      {/* ── Content ── */}
      <div className="pt-1">
        {isCurrentLoading ? (
          <div className="bg-[var(--ui-surface)] rounded-xl border border-[var(--ui-border)] p-3 sm:p-4 space-y-3 animate-pulse">
            <div className="flex flex-col sm:flex-row items-start gap-3">
              <div className="h-20 w-20 bg-[var(--ui-surface-sunken)] rounded-lg shrink-0" />
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 w-full">
                <div className="h-9 bg-[var(--ui-surface-sunken)] rounded-lg" />
                <div className="h-9 bg-[var(--ui-surface-sunken)] rounded-lg" />
                <div className="h-9 bg-[var(--ui-surface-sunken)] rounded-lg" />
                <div className="h-9 bg-[var(--ui-surface-sunken)] rounded-lg" />
                <div className="h-9 bg-[var(--ui-surface-sunken)] rounded-lg" />
                <div className="h-9 bg-[var(--ui-surface-sunken)] rounded-lg" />
                <div className="h-9 bg-[var(--ui-surface-sunken)] rounded-lg" />
                <div className="h-9 bg-[var(--ui-surface-sunken)] rounded-lg" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              <div className="h-9 bg-[var(--ui-surface-sunken)] rounded-lg" />
              <div className="h-9 bg-[var(--ui-surface-sunken)] rounded-lg" />
              <div className="h-9 bg-[var(--ui-surface-sunken)] rounded-lg" />
              <div className="h-9 bg-[var(--ui-surface-sunken)] rounded-lg" />
            </div>
          </div>
        ) : currentError ? (
          <div className="bg-[var(--ui-surface)] rounded-xl border border-[var(--ui-danger-border)] p-6 text-center space-y-2.5">
            <div className="w-9 h-9 rounded-full bg-[var(--ui-danger-border)] text-[var(--ui-danger)] mx-auto flex items-center justify-center text-base">
              <FaExclamationTriangle />
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-[var(--ui-danger-dark)]">
              {currentTab === "business" ? "Failed to load business profile" : "Failed to load invoice setup"}
            </h3>
            <p className="text-xs text-[var(--ui-danger)] max-w-md mx-auto">
              {currentError.message || "Unable to connect to server."}
            </p>
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--ui-danger)] hover:bg-[var(--ui-danger-dark)] text-white text-xs font-semibold rounded-md transition-all cursor-pointer"
            >
              <FaRedo className="text-xs" />
              <span>Try Again</span>
            </button>
          </div>
        ) : currentTab === "business" ? (
          <BusinessProfileForm
            initialData={businessProfile ?? null}
            businessTypes={businessTypes}
            onSuccess={() => refetchBusiness()}
          />
        ) : (
          <InvoiceProfileSetupForm
            key={invoiceSetup?.id ?? "default"}
            initialData={invoiceSetup ?? null}
            onSuccess={() => refetchInvoice()}
          />
        )}
      </div>
    </div>
  );
};

export default CompanyPage;
