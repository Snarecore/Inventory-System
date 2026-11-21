import EmptyState from "@/components/empty-state/EmptyState";
import DeleteModal from "@/components/modal/DeleteModal";
import { useState } from "react";
import { FaEdit } from "react-icons/fa";
import { FiTrash2 } from "react-icons/fi";

interface PageMetaDataProps {
    id: string;
    page: string;
    metaTitle: string;
    metaDescription: string;
    metaKeywords: string;
}

interface PageMetaTableProps {
    dataList?: PageMetaDataProps[];
    fetchData?: () => void;
    isLoading?: boolean;
    isFetching?: boolean;
    pageCount?: number;
    currentPageNumber?: number;
    handlePagination?: (paginationData: { selected: number }) => void;
    onEdit: (data?: PageMetaDataProps) => void;
}

const SeoTable = ({
    dataList = [],
    fetchData = () => {},
    isLoading,
    isFetching,
    pageCount = 1,
    currentPageNumber = 1,
    handlePagination = () => {},
    onEdit
}: PageMetaTableProps) => {

    const tableHeaders = [
        { key: "serial", label: "SL" },
        { key: "page", label: "Page" },
        { key: "metaTitle", label: "Meta Title" },
        { key: "metaKeywords", label: "Meta Keyords" },
        { key: "actions", label: "Actions" }
    ];

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<PageMetaDataProps | null>(null);

    const openDeleteModal = (data: PageMetaDataProps) => {
        setSelectedItem(data);
        setIsDeleteModalOpen(true);
    };

    const closeDeleteModal = () => {
        setIsDeleteModalOpen(false);
        setSelectedItem(null);
    };

    const handleDelete = async () => {
        alert("successful")
    };

    return (
        <div className="bg-[var(--ui-surface)] rounded-xl shadow-xs border border-[var(--ui-border)] flex flex-col relative z-20 overflow-visible">
            <div className="w-full overflow-x-auto relative z-10">
                <table className="ui-table w-full text-left border-collapse min-w-[900px] text-xs">
                    <thead>
                        <tr className="bg-[var(--table-header-bg,var(--primary-color))] text-[var(--table-header-text,var(--ui-on-accent,#ffffff))] text-xs font-semibold">
                            {tableHeaders.map(({ key, label }) => (
                                <th key={key} className={`py-2.5 px-3 text-left ${key === "id" ? "w-10 text-center" : ""}`}>
                                    {label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--ui-border)] bg-[var(--ui-surface)]">
                        {dataList?.length > 0 ? (
                            dataList?.map((data, index) => (
                                <tr
                                    key={data.id}
                                    className="hover:bg-[var(--primary-color-light)]/40 transition-colors group"
                                >
                                    <td className="py-2.5 px-3 text-center font-normal text-xs text-[var(--ui-text)]">
                                        {index + 1}
                                    </td>
                                    <td className="py-2.5 px-3 font-normal text-xs text-[var(--ui-text)]">
                                        {data.page}
                                    </td>
                                    <td className="py-2.5 px-3 font-normal text-xs text-[var(--ui-text)]">
                                        {data.metaTitle}
                                    </td>
                                    <td className="py-2.5 px-3 font-normal text-xs text-[var(--ui-text)]">
                                        {data.metaKeywords}
                                    </td>
                                    <td className="py-2 px-3 text-center">
                                        <div className="flex items-center justify-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => onEdit(data)}
                                                className="p-1 rounded text-[var(--ui-warning)] hover:bg-[var(--ui-warning-border)] transition-colors cursor-pointer"
                                                title="Edit"
                                            >
                                                <FaEdit size={14} />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => openDeleteModal(data)}
                                                className="p-1 rounded text-[var(--ui-danger)] hover:bg-[var(--ui-danger-border)] transition-colors cursor-pointer"
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
                                <td
                                    colSpan={tableHeaders.length}
                                    className="py-12 text-center italic"
                                >
                                    <EmptyState title="No page meta available" description="Click below to add your first page meta!" buttonText="+ Add New Page Meta" onButtonClick={() => onEdit()} />
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {selectedItem && (
                <DeleteModal
                    isOpen={isDeleteModalOpen}
                    title="Delete?"
                    message={`Are you sure you want to delete this page meta?`}
                    onClose={closeDeleteModal}
                    onDelete={handleDelete}
                />
            )}
            {/* {pageCount > 1 && (
                <div className="flex justify-center">
                    <Pagination
                        pageCount={pageCount}
                        currentPageNumber={currentPageNumber}
                        handlePagination={handlePagination}
                    />
                </div>
            )} */}
        </div>
    );
};

export default SeoTable;
