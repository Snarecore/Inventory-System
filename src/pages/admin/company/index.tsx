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
    <div className="flex flex-col gap-8">
      {/* ── Page Header (Standard Project CMS Header) ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <PageHeader
          headerTitle="Company CMS"
          headerDescription="Manage company information and business logo"
        />
        <div className="flex items-center gap-2">
          <RefreshButton
            onClick={() => refetch()}
            isRefreshing={isFetching}
            label="Refresh"
          />
        </div>
      </div>

      {/* ── CMS Form Grid (Standard Project CMS Grid) ── */}
      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 xl:col-span-12">
          {isLoading ? (
            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4 animate-pulse">
              <div className="h-24 bg-gray-100 rounded-lg w-28" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-10 bg-gray-100 rounded-lg" />
                <div className="h-10 bg-gray-100 rounded-lg" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-10 bg-gray-100 rounded-lg" />
                <div className="h-10 bg-gray-100 rounded-lg" />
              </div>
              <div className="h-20 bg-gray-100 rounded-lg" />
            </div>
          ) : error ? (
            <div className="bg-white rounded-lg border border-red-200 p-8 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center text-lg">
                <FaExclamationTriangle />
              </div>
              <h3 className="text-sm font-bold text-red-900">Failed to load business profile</h3>
              <p className="text-xs text-red-600 max-w-md mx-auto">{error.message || "Unable to connect to server."}</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-md transition-all cursor-pointer"
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
    </div>
  );
};

export default CompanyPage;
