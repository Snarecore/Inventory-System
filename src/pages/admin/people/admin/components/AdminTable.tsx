
import EmptyState from "@/components/empty-state/EmptyState";
import DeleteModal from "@/components/modal/DeleteModal";
import Pagination from "@/components/pagination";
import DropdownFilter from "@/components/table-components/DropdownFilter";
import Search from "@/components/table-components/Search";
import { useEffect, useMemo, useState } from "react";
import { FiTrash2 } from "react-icons/fi";
import { useDebounce } from "@/hooks/useDebounce";

interface AdminDataProps {
    id: string;
    name: string;
    featuredImage: string;
    email: string;
    phone: string;
}

type OptionT = { label: string; value: string };
type FilterKey = 'categoryId' | 'vendorId' | 'isApprove';
type SelectedFilters = Record<FilterKey, OptionT | null>;

interface AdminTableProps {
    dataList?: AdminDataProps[]; // made optional
    fetchData?: () => void;
    isLoading?: boolean;
    isFetching?: boolean;
    pageCount?: number;
    currentPageNumber?: number;
    handlePagination?: (paginationData: { selected: number }) => void;
    setCurrentPageNumber?: React.Dispatch<React.SetStateAction<number>>;
    searchQuery?: string;
    setSearchQuery?: (query: string) => void;
    selectedFilters?: SelectedFilters;
    setSelectedFilters?: React.Dispatch<React.SetStateAction<SelectedFilters>>;
    refreshKey?: number;
}

const DUMMY_ADMINS: AdminDataProps[] = [
    { id: "1", name: "Ariana Khan", featuredImage: "/avatar.png", email: "ariana.khan@example.com", phone: "+880 1711-000001" },
    { id: "2", name: "Mahfuz Rahman", featuredImage: "/avatar.png", email: "mahfuz.rahman@example.com", phone: "+880 1711-000002" },
    { id: "3", name: "Nadia Sultana", featuredImage: "/avatar.png", email: "nadia.sultana@example.com", phone: "+880 1711-000003" },
    { id: "4", name: "Imran Hossain", featuredImage: "/avatar.png", email: "imran.hossain@example.com", phone: "+880 1711-000004" },
    { id: "5", name: "Sadia Ahmed", featuredImage: "/avatar.png", email: "sadia.ahmed@example.com", phone: "+880 1711-000005" },
    { id: "6", name: "Majba", featuredImage: "/avatar.png", email: "majba@example.com", phone: "+880 1711-000006" },
];

const AdminTable = ({
    dataList, // optional
    fetchData,
    pageCount,
    currentPageNumber,
    handlePagination,
    isLoading,
    isFetching,
    setCurrentPageNumber,
    searchQuery, setSearchQuery, selectedFilters, setSelectedFilters, refreshKey
}: AdminTableProps) => {
    const [user, setUser] = useState<{ id?: string }>({});
    useEffect(() => {
        try {
            const u = JSON.parse(sessionStorage.getItem("user") || "{}");
            setUser(u || {});
        } catch { }
    }, []);

    const tableHeaders = [
        { key: "sl", label: "Sl" },
        { key: "name", label: "Name" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
        { key: "action", label: "Action" },
    ];

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedAdminList, setSelectedAdminList] = useState<AdminDataProps | null>(null);

    const openDeleteModal = (data: AdminDataProps) => {
        setSelectedAdminList(data);
        setIsDeleteModalOpen(true);
    };

    const closeDeleteModal = () => {
        setIsDeleteModalOpen(false);
        setSelectedAdminList(null);
    };

    const handleDelete = async () => {
        if (!selectedAdminList) return;
        alert(`Deleted: ${selectedAdminList.name}`);
        closeDeleteModal();
    };

    const debouncedSearch = useDebounce(searchQuery || "", 250);
    const allRows = (dataList && dataList.length ? dataList : DUMMY_ADMINS) as AdminDataProps[];
    const rows = useMemo(() => {
        if (!debouncedSearch || !debouncedSearch.trim()) return allRows;
        const q = debouncedSearch.toLowerCase().trim();
        return allRows.filter((item) =>
            (item.name || "").toLowerCase().includes(q) ||
            (item.email || "").toLowerCase().includes(q) ||
            (item.phone || "").toLowerCase().includes(q)
        );
    }, [allRows, debouncedSearch]);

    const [openDropdown, setOpenDropdown] = useState<FilterKey | null>(null);

    useEffect(() => {
        setOpenDropdown(null);
      }, [refreshKey]);

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

    return (
        <div className="bg-[var(--ui-surface)] rounded-xl shadow-xs border border-[var(--ui-border)] flex flex-col relative z-20 overflow-visible">
            <div className="p-2 sm:p-2.5 border-b border-[var(--ui-border)] flex flex-wrap items-center justify-between gap-2 relative z-40 overflow-visible">
                <div className="w-full sm:w-56 shrink-0">
                    <Search
                        searchQuery={searchQuery || ""}
                        onSearchChange={(value) => {
                            setSearchQuery?.(value);
                            setCurrentPageNumber?.(1);
                        }}
                    />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {(Object.entries(dropdownOptions) as [FilterKey, OptionT[]][])
                        .map(([key, options]) => (
                            <DropdownFilter
                                key={key}
                                title={
                                    key === "categoryId" ? "Category"
                                        : key === "vendorId" ? "Vendor"
                                            : "Approval"
                                }
                                options={options}
                                isOpen={openDropdown === key}
                                onToggle={() => setOpenDropdown(openDropdown === key ? null : key)}
                                onSelect={(selected) => {
                                    setSelectedFilters?.(prev => ({ ...prev, [key]: selected }));
                                    setCurrentPageNumber?.(1);
                                    setOpenDropdown(null);
                                }}
                            />
                        ))}
                </div>
            </div>
            
            <div className="w-full overflow-x-auto relative z-10">
                <table className="w-full text-left border-collapse min-w-[900px] text-xs">
                    <thead>
                        <tr className="bg-[var(--table-header-bg,var(--primary-color))] text-[var(--table-header-text,var(--ui-on-accent,#ffffff))] text-xs font-semibold">
                            {tableHeaders.map(({ key, label }, i) => (
                                <th
                                    key={key}
                                    className={`py-2.5 px-3 text-left ${i === 0 ? "w-10 text-center" : ""}`}
                                >
                                    {label}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-[var(--ui-border)] bg-[var(--ui-surface)]">
                        {rows.length > 0 ? (
                            rows.map((data, rowIndex) => (
                                <tr
                                    key={data.id}
                                    className="hover:bg-[var(--primary-color-light)]/40 transition-colors group"
                                >
                                    {/* SL */}
                                    <td className="py-2.5 px-3 text-center font-normal text-xs text-[var(--ui-text)]">
                                        {rowIndex + 1}
                                    </td>

                                    {/* Name */}
                                    <td className="py-2.5 px-3 font-normal text-xs text-[var(--ui-text)]">
                                        {data.name}
                                    </td>

                                    {/* Email */}
                                    <td className="py-2.5 px-3 font-normal text-xs text-[var(--ui-text)]">
                                        {data.email}
                                    </td>

                                    {/* Phone */}
                                    <td className="py-2.5 px-3 font-normal text-xs text-[var(--ui-text)]">
                                        {data.phone}
                                    </td>

                                    {/* Actions */}
                                    <td className="py-2 px-3 text-center">
                                        <div className="flex items-center justify-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => openDeleteModal(data)}
                                                className={`p-1 rounded text-[var(--ui-danger)] hover:bg-[var(--ui-danger-border)] transition-colors cursor-pointer ${user.id === data.id ? "opacity-50 cursor-not-allowed" : ""}`}
                                                disabled={user.id === data.id}
                                                title="Delete"
                                            >
                                                <FiTrash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={tableHeaders.length} className="px-6 py-4 text-center italic">
                                    <EmptyState
                                        title="No admin available"
                                        description="Can't find any admin? Invest more to the developers!"
                                    />
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {selectedAdminList && (
                <DeleteModal
                    isOpen={isDeleteModalOpen}
                    title="Delete?"
                    message={`Are you sure you want to delete ${selectedAdminList.name}?`}
                    onClose={closeDeleteModal}
                    onDelete={handleDelete}
                />
            )}

            {/* Keep pagination commented until you wire it */}
            {/* {pageCount && pageCount > 1 && (
        <div className="flex justify-center">
          <Pagination
            pageCount={pageCount}
            currentPageNumber={currentPageNumber!}
            handlePagination={handlePagination!}
          />
        </div>
      )} */}

            <div className="flex justify-center">
                <Pagination
                    pageCount={10}
                    currentPageNumber={currentPageNumber!}
                    handlePagination={handlePagination!}
                />
            </div>
        </div>
    );
};

export default AdminTable;
