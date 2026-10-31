import React, { useState } from "react";
import PageHeader from "@/components/page-header/PageHeader";
import RefreshButton from "@/components/table-components/RefreshButton";
import Button from "@/components/button/Button";
import { ProfileOverviewCard } from "./components/ProfileOverviewCard";
import { PersonalInfoTab } from "./components/PersonalInfoTab";
import { SecurityTab } from "./components/SecurityTab";
import { useUserProfileQuery } from "@/hooks/useUserProfile";
import { getActiveUserPhone } from "@/services/user-profile-service";
import {
  FaUserEdit,
  FaShieldAlt,
  FaExclamationTriangle,
  FaRedo,
} from "react-icons/fa";

type TabKey = "personal" | "security";

export const ProfilePage: React.FC = () => {
  const activePhone = getActiveUserPhone();
  const {
    data: profile,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useUserProfileQuery();

  const [activeTab, setActiveTab] = useState<TabKey>("personal");

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: "personal", label: "Personal Information", icon: <FaUserEdit size={13} /> },
    { key: "security", label: "Login PIN", icon: <FaShieldAlt size={13} /> },
  ];

  return (
    <div className="flex flex-col gap-3 px-3 py-2.5 sm:px-4 sm:py-3 max-w-[1600px] mx-auto w-full">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <PageHeader
          headerTitle="My Profile"
          headerDescription="Manage your personal profile and account security"
        />
        <div className="flex items-center gap-2">
          <RefreshButton
            onClick={() => refetch()}
            isRefreshing={isFetching}
            label="Refresh"
          />
        </div>
      </div>

      {/* ── Main Content Area ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 animate-pulse">
          <div className="lg:col-span-4 h-96 bg-white rounded-xl border border-gray-200" />
          <div className="lg:col-span-8 h-96 bg-white rounded-xl border border-gray-200" />
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl border border-red-200 p-6 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center text-lg">
            <FaExclamationTriangle />
          </div>
          <h3 className="text-sm font-bold text-red-900">
            Failed to load profile information
          </h3>
          <p className="text-xs text-red-600 max-w-md mx-auto">
            {error.message || "Unable to reach server. Please try again."}
          </p>
          <Button
            type="button"
            label="Try Again"
            onClick={() => refetch()}
            color="#dc2626"
            hoverColor="#b91c1c"
            icon={<FaRedo size={11} />}
            buttonClass="!text-xs !py-1.5 font-semibold cursor-pointer"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
          {/* ── Left Column: Profile Overview Card ── */}
          <div className="lg:col-span-4 lg:sticky lg:top-14">
            <ProfileOverviewCard profile={profile ?? null} phone={activePhone} />
          </div>

          {/* ── Right Column: Tabbed Sections ── */}
          <div className="lg:col-span-8 flex flex-col gap-2.5">
            {/* Tab Buttons */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200 overflow-x-auto shadow-2xs">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                      isActive
                        ? "bg-[var(--primary-color)] text-white shadow-2xs"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Panels */}
            {activeTab === "personal" && (
              <PersonalInfoTab initialData={profile ?? null} />
            )}

            {activeTab === "security" && (
              <SecurityTab phone={activePhone} profile={profile ?? null} />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
