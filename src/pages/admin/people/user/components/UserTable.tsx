import EmptyState from "@/components/empty-state/EmptyState";
import DeleteModal from "@/components/modal/DeleteModal";
import Pagination from "@/components/pagination";
import DropdownFilter from "@/components/table-components/DropdownFilter";
import Search from "@/components/table-components/Search";
import { useMemo, useState } from "react";
import { FaPen, FaTrash } from "react-icons/fa";
import { HiDotsHorizontal } from "react-icons/hi";

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

interface UserTableProps {
  dataList?: UserDataProps[];
  isLoading?: boolean;
  pageCount?: number;
  currentPageNumber?: number;
  handlePagination?: (paginationData: { selected: number }) => void;
  onEdit?: (user: UserDataProps) => void;
  setCurrentPageNumber?: React.Dispatch<React.SetStateAction<number>>;
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
  selectedFilters?: SelectedFilters;
  setSelectedFilters?: React.Dispatch<React.SetStateAction<SelectedFilters>>;
}

interface UserCardProps {
  user: UserDataProps;
  isMenuOpen: boolean;
  onMenuToggle: (id: string) => void;
  onEdit: (user: UserDataProps) => void;
  onDelete: (user: UserDataProps) => void;
}

const UserCard = ({
  user,
  isMenuOpen,
  onMenuToggle,
  onEdit,
  onDelete,
}: UserCardProps) => (
  <div className="relative rounded-xl border border-[var(--color-primary-light)] bg p-6 shadow-lg">
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <img
          src={user.featuredImage || "/avatar.png"}
          alt={user.name}
          className="h-12 w-12 rounded-full border border-[var(--color-primary)] object-cover shadow"
        />
        <div className="min-w-0">
          <p className="truncate font-semibold">{user.name}</p>
          <p className="truncate text-sm text-[var(--ui-text-muted)]">
            {user.email}
          </p>
        </div>
      </div>

      <div className="relative">
        <button
          onClick={() => onMenuToggle(user.id)}
          className="cursor-pointer rounded-full p-1 text-[var(--color-primary)] transition-colors"
          title="More actions"
          type="button"
        >
          <HiDotsHorizontal size={20} />
        </button>

        {isMenuOpen && (
          <div className="absolute right-0 top-8 z-10 w-32 space-y-2 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)] p-2 shadow-lg">
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-full bg-[var(--primary-color-light)] px-4 py-2 text-xs font-semibold text-[var(--primary-color-dark)]"
              onClick={() => onEdit(user)}
            >
              <FaPen size={10} />
              Edit
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-full bg-[var(--color-primary-light)] px-4 py-2 text-xs font-semibold text-[var(--color-primary)]"
              onClick={() => onDelete(user)}
            >
              <FaTrash size={10} />
              Delete
            </button>
          </div>
        )}
      </div>
    </div>

    <div className="mt-4 flex flex-row flex-wrap items-center justify-between gap-2 border-t border-[var(--ui-border)] pt-4">
      <span className="text-sm font-medium tracking-wide">
        {user.phone || "-"}
      </span>
      <button
        type="button"
        className="rounded-full border border-[var(--color-primary)] bg-[var(--ui-surface)] px-3 py-1 text-xs font-medium text-[var(--color-primary)] shadow-sm"
      >
        See Details
      </button>
    </div>
  </div>
);

const UserTable = ({
  dataList,
  isLoading,
  handlePagination,
  pageCount,
  currentPageNumber,
  onEdit,
  setCurrentPageNumber,
  searchQuery,
  setSearchQuery,
  selectedFilters,
  setSelectedFilters,
}: UserTableProps) => {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserDataProps | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<FilterKey | null>(null);

  const dropdownOptions = useMemo<Record<FilterKey, OptionT[]>>(
    () => ({
      categoryId: [
        { label: "All Categories", value: "" },
        { label: "Coffee & Beverages", value: "cat_001" },
        { label: "Bakery & Snacks", value: "cat_002" },
        { label: "Merchandise", value: "cat_003" },
        { label: "Equipment", value: "cat_004" },
        { label: "Gifts & Bundles", value: "cat_005" },
      ],
      vendorId: [
        { label: "All Vendors", value: "" },
        { label: "North End Roastery", value: "ven_001" },
        { label: "Gulshan Cafe", value: "ven_002" },
        { label: "Banani Cafe", value: "ven_003" },
        { label: "Shahjadpur Cafe", value: "ven_004" },
        { label: "Online Storefront", value: "ven_005" },
      ],
      isApprove: [
        { label: "All", value: "" },
        { label: "Approved", value: "approved" },
        { label: "Pending", value: "pending" },
        { label: "Rejected", value: "rejected" },
      ],
    }),
    []
  );

  const openDeleteModal = (user: UserDataProps) => {
    setOpenMenuId(null);
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedUser(null);
  };

  const handleDelete = () => {
    closeDeleteModal();
  };

  return (
    <div className="bg-[var(--ui-surface)] rounded-lg border border-[var(--ui-border)]">
      <div className="space-y-4 border-b border-[var(--ui-border)] px-4">
        <div className="flex flex-col gap-4 py-4 sm:flex-row sm:flex-wrap sm:justify-between">
          <Search
            searchQuery={searchQuery || ""}
            onSearchChange={(value) => {
              setSearchQuery?.(value);
              setCurrentPageNumber?.(1);
            }}
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            {(Object.entries(dropdownOptions) as [FilterKey, OptionT[]][]).map(
              ([key, options]) => (
                <DropdownFilter
                  key={key}
                  title={
                    key === "categoryId"
                      ? "Category"
                      : key === "vendorId"
                        ? "Vendor"
                        : "Approval"
                  }
                  options={options}
                  selectedOption={selectedFilters?.[key] || null}
                  isOpen={openDropdown === key}
                  onToggle={() =>
                    setOpenDropdown(openDropdown === key ? null : key)
                  }
                  onSelect={(selected) => {
                    setSelectedFilters?.((previous) => ({
                      ...previous,
                      [key]: selected,
                    }));
                    setCurrentPageNumber?.(1);
                    setOpenDropdown(null);
                  }}
                />
              )
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="p-6 text-center text-[var(--ui-text-muted)]">
          Loading users...
        </div>
      ) : dataList?.length ? (
        <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 2xl:grid-cols-3">
          {dataList.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              isMenuOpen={openMenuId === user.id}
              onMenuToggle={(id) => setOpenMenuId((current) => (current === id ? null : id))}
              onEdit={(user) => {
                setOpenMenuId(null);
                onEdit?.(user);
              }}
              onDelete={openDeleteModal}
            />
          ))}
        </div>
      ) : (
        <div className="p-6">
          <EmptyState
            title="No users available"
            description="No users match the current filters."
          />
        </div>
      )}

      {selectedUser && (
        <DeleteModal
          isOpen={isDeleteModalOpen}
          title="Delete?"
          message={`Are you sure you want to delete ${selectedUser.name}?`}
          onClose={closeDeleteModal}
          onDelete={handleDelete}
        />
      )}

      {(pageCount ?? 10) > 1 && handlePagination && currentPageNumber ? (
        <div className="flex justify-center p-4">
          <Pagination
            pageCount={pageCount ?? 10}
            currentPageNumber={currentPageNumber}
            handlePagination={handlePagination}
          />
        </div>
      ) : null}
    </div>
  );
};

export default UserTable;
