import { useState } from "react";
import { FaEdit } from "react-icons/fa";
import { FiTrash2 } from "react-icons/fi";
import { formatDate } from "@/utils/date-utils";

import { Link } from "react-router-dom";
import EmptyState from "@/components/empty-state/EmptyState";
import DeleteModal from "@/components/modal/DeleteModal";

interface BlogDataProps {
    id: string;
    image: string;
    title: string;
    description: string;
    author: string;
    createdAt: string;
    status: boolean;
}

interface BlogTableProps {
    dataList: BlogDataProps[];
    fetchData: () => void;
    isLoading?: boolean;
    isFetching?: boolean;
    pageCount: number;
    currentPageNumber: number;
    handlePagination: (paginationData: { selected: number }) => void;
    onEdit: (data?: BlogDataProps) => void;
}

const BlogTable = ({
    dataList,
    fetchData,
    isLoading,
    isFetching,
    pageCount, currentPageNumber, handlePagination,
    onEdit
}: BlogTableProps) => {
    // const { handleDeleteAPI } = useAPI();
    // const apiUrl = apiConfig.blog.blogUrl;

    const tableHeaders = [
        { key: "sl", label: "Sl" },
        { key: "image", label: "Image" },
        { key: "Title", label: "Title" },
        // { key: "Description", label: "Description" },
        { key: "Author", label: "Author" },
        { key: "Created Date", label: "Created Date" },
        { key: "status", label: "Status" },
        { key: "action", label: "Action" }
    ];

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedHeroSlider, setSelectedHeroSlider] = useState<BlogDataProps | null>(null);

    const openDeleteModal = (data: BlogDataProps) => {
        setSelectedHeroSlider(data);
        setIsDeleteModalOpen(true);
    };

    const closeDeleteModal = () => {
        setIsDeleteModalOpen(false);
        setSelectedHeroSlider(null);
    };

    const handleDelete = async () => {
        if (!selectedHeroSlider) return;
        // const apiResponse = await handleDeleteAPI({
        //     url: `${apiUrl}/${selectedHeroSlider.id}`,
        //     showSuccessMessage: true
        // });
        // if (apiResponse) {
        //     fetchData();
        //     closeDeleteModal();
        // }
    };


    // if (isFetching || isLoading) return <TableSkeleton />;

    return (
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 flex flex-col relative z-20 overflow-visible">
            <div className="w-full overflow-x-auto relative z-10">
                <table className="w-full text-left border-collapse min-w-[900px] text-xs">
                    <thead>
                        <tr className="bg-[#41BEF3] text-black text-xs font-semibold">
                            {tableHeaders.map(({ key, label }) => (
                                <th key={key} className={`py-2.5 px-3 text-left ${key === "id" ? "w-10 text-center" : ""}`}>
                                    {label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                        {dataList?.length > 0 ? (
                            dataList?.map((data, index) => (
                                <tr
                                    key={data.id}
                                    className="hover:bg-sky-50/40 transition-colors group"
                                >
                                    <td className="py-2.5 px-3 text-center font-normal text-xs text-black">
                                        {index + 1}
                                    </td>
                                    <td className="py-2.5 px-3">
                                        <img
                                            src={data.image}
                                            alt="image"
                                            className="h-10 w-16 object-cover rounded-md shadow-xs border border-gray-100"
                                        />
                                    </td>
                                    <td className="py-2.5 px-3 font-normal text-xs text-black">
                                        {data.title}
                                    </td>
                                    
                                    <td className="py-2.5 px-3 font-normal text-xs text-black">
                                        {data.author}
                                    </td>
                                    <td className="py-2.5 px-3 font-normal text-xs text-black">
                                        {formatDate(data.createdAt)}
                                    </td>
                                    <td className="py-2.5 px-3">
                                        <span
                                            className={`px-2 py-0.5 text-[11px] font-semibold rounded border inline-flex items-center w-fit ${data.status
                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                : "bg-rose-50 text-rose-700 border-rose-200"
                                                }`}
                                        >
                                            {data.status ? "Active" : "Inactive"}
                                        </span>
                                    </td>
                                    <td className="py-2 px-3 text-center">
                                        <div className="flex items-center justify-center gap-1.5">
                                            <Link to={"/edit-blog"}
                                                state={{ editData: data }}
                                                className="p-1 rounded text-amber-600 hover:bg-amber-100 transition-colors cursor-pointer"
                                                title="Edit"
                                            >
                                                <FaEdit size={14} />
                                            </Link>

                                            <button
                                                type="button"
                                                onClick={() => openDeleteModal(data)}
                                                className="p-1 rounded text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
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
                                    <EmptyState title="No blog available" description="Click below to add your first blog!" buttonText="+ Add New Blog" onButtonClick={() => onEdit()} />
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {selectedHeroSlider && (
                <DeleteModal
                    isOpen={isDeleteModalOpen}
                    title="Delete?"
                    message={`Are you sure you want to delete?`}
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

export default BlogTable;
