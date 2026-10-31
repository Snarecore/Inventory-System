import React from "react";
import PageHeader from "@/components/page-header/PageHeader";
import RefreshButton from "@/components/table-components/RefreshButton";
import { BusinessProfileForm } from "./BusinessProfileForm";
import {
  useBusinessProfileQuery,
  useBusinessTypesQuery,
} from "@/hooks/useBusinessProfile";
import { FaExclamationTriangle, FaRedo } from "react-icons/fa";

export const CompanyPage: React.FC = () => {
  const {
    data: businessProfile,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useBusinessProfileQuery();

  const { data: businessTypes = [] } = useBusinessTypesQuery();

  return (
    <div className="flex flex-col gap-2.5 px-3 py-2 sm:px-4 sm:py-2.5 max-w-[1600px] mx-auto w-full">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <PageHeader
          headerTitle="Business Profile"
          headerDescription="Manage business profile, company information and business logo"
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
        ) : error ? (
          <div className="bg-[var(--ui-surface)] rounded-xl border border-[var(--ui-danger-border)] p-6 text-center space-y-2.5">
            <div className="w-9 h-9 rounded-full bg-[var(--ui-danger-border)] text-[var(--ui-danger)] mx-auto flex items-center justify-center text-base">
              <FaExclamationTriangle />
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-[var(--ui-danger-dark)]">Failed to load business profile</h3>
            <p className="text-xs text-[var(--ui-danger)] max-w-md mx-auto">{error.message || "Unable to connect to server."}</p>
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
          <BusinessProfileForm
            initialData={businessProfile ?? null}
            businessTypes={businessTypes}
            onSuccess={() => refetch()}
          />
        )}
      </div>
    </div>
  );
};

export default CompanyPage;
