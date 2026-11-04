import PageHeader from "@/components/page-header/PageHeader";
import { useEffect, useState } from "react";
import Button from "@/components/button/Button";
import { FaPlus, FaPlusCircle } from "react-icons/fa";
import RefreshButton from "@/components/table-components/RefreshButton";
import UserTable from "./components/UserTable";

interface UserDataProps {
  id: string;
  name: string;
  featuredImage: string;
  email: string;
  phone: string;
}

type OptionT = { label: string; value: string };
type FilterKey = "categoryId" | "vendorId" | "isApprove";
type SelectedFilters = Record<FilterKey, OptionT | null>;

const Users = () => {
  const dataLimit = 10;
  const [currentPageNumber, setCurrentPageNumber] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editData, setEditData] = useState<UserDataProps | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<SelectedFilters>({
    categoryId: null,
    vendorId: null,
    isApprove: null,
  });
  const [refreshKey, setRefreshKey] = useState(0);

  const handlePagination = (paginationData: { selected: number }) => {
    const selectedPage = paginationData.selected + 1;
    setCurrentPageNumber(selectedPage);
  };

  const openModal = (data?: UserDataProps) => {
    setEditData(data || null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditData(null);
  };

  const handleRefresh = () => {
    setSearchQuery("");
    setSelectedFilters({
      categoryId: null,
      vendorId: null,
      isApprove: null,
    });
    setCurrentPageNumber(1);
    setRefreshKey((k) => k + 1); // tell children to reset internals (e.g., close dropdown)
    // optionally re-fetch data here if wired:
    // fetchData?.();
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          headerTitle="User List"
          headerDescription="Manage users and staff accounts"
        />

        <div className="flex items-center gap-2">
          <RefreshButton onClick={handleRefresh} />
          <Button
            label="Add User"
            onClick={() => openModal()}
            color="var(--color-primary)"
            hoverColor="var(--color-primary-hover)"
            icon={
              <FaPlus
                size={18}
                className="text-[var(--color-primary-light)]"
              />
            }
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:gap-8">
        <div>
          <UserTable
            currentPageNumber={currentPageNumber}
            setCurrentPageNumber={setCurrentPageNumber}
            handlePagination={handlePagination}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedFilters={selectedFilters}
            setSelectedFilters={setSelectedFilters}
          />
        </div>
      </div>
    </div>
  );
};

export default Users;
