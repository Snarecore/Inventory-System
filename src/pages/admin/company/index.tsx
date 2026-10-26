import React from "react";
import PageHeader from "@/components/page-header/PageHeader";
import RefreshButton from "@/components/table-components/RefreshButton";
import { BusinessProfileForm } from "./BusinessProfileForm";
import {
  useBusinessProfileQuery,
  useBusinessTypesQuery,
} from "@/hooks/useBusinessProfile";
import { getUserInfo } from "@/utils/auth-storage";
import { FaExclamationTriangle, FaRedo, FaCodeBranch } from "react-icons/fa";

export const CompanyPage: React.FC = () => {
  const userInfo = getUserInfo();
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
          <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 space-y-3 animate-pulse">
            <div className="flex flex-col sm:flex-row items-start gap-3">
              <div className="h-20 w-20 bg-gray-100 rounded-lg shrink-0" />
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 w-full">
                <div className="h-9 bg-gray-100 rounded-lg" />
                <div className="h-9 bg-gray-100 rounded-lg" />
                <div className="h-9 bg-gray-100 rounded-lg" />
                <div className="h-9 bg-gray-100 rounded-lg" />
                <div className="h-9 bg-gray-100 rounded-lg" />
                <div className="h-9 bg-gray-100 rounded-lg" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              <div className="h-9 bg-gray-100 rounded-lg" />
              <div className="h-9 bg-gray-100 rounded-lg" />
              <div className="h-9 bg-gray-100 rounded-lg" />
              <div className="h-9 bg-gray-100 rounded-lg" />
            </div>
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl border border-red-200 p-6 text-center space-y-2.5">
            <div className="w-9 h-9 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center text-base">
              <FaExclamationTriangle />
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-red-900">Failed to load business profile</h3>
            <p className="text-xs text-red-600 max-w-md mx-auto">{error.message || "Unable to connect to server."}</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-md transition-all cursor-pointer"
            >
              <FaRedo className="text-xs" />
              <span>Try Again</span>
            </button>
          </div>
        ) : (
          <BusinessProfileForm
            initialData={businessProfile}
            businessTypes={businessTypes}
            onSuccess={() => refetch()}
          />
        )}
      </div>
    </div>
  );
};

export default CompanyPage;
