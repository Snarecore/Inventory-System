import { useState } from "react";
import { FaEdit } from "react-icons/fa";
import { FiTrash2 } from "react-icons/fi";
import DeleteModal from "@/components/modal/DeleteModal";
import TableSkeleton from "@/components/skeleton/TableSkeleton";
import EmptyState from "@/components/empty-state/EmptyState";
import Pagination from "@/components/pagination";
import { useAPI } from "@/hooks/useApi";
import apiConfig from "@/config/api.json";
import { firstCategoryQueryKey } from "@/config/query-key";

interface FirstCategoryDataProps {
	id: string;
	name: string;
	bannerImage: string;
	mainCategoryId: string;
	mainCategoryName: string;
	status: boolean;
}

interface FirstCategoryTableProps {
	dataList: FirstCategoryDataProps[];
	fetchData: () => void;
	isLoading?: boolean;
	isFetching?: boolean;
	pageCount: number;
	currentPageNumber: number;
	handlePagination: (paginationData: { selected: number }) => void;
	onEdit: (data?: FirstCategoryDataProps) => void;
}

const CategoryTable = ({
	dataList,
	fetchData,
	isLoading,
	isFetching: _isFetching,
	pageCount,
	currentPageNumber,
	handlePagination,
	onEdit
}: FirstCategoryTableProps) => {
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [selectedFirstCategory, setSelectedFirstCategory] = useState<FirstCategoryDataProps | null>(null);

	const { handleDeleteAPI, handleApiMutation, patchMutation } = useAPI();
	const apiUrl = apiConfig.inventory.firstCategoryUrl;

	const tableHeaders = [
		{ key: "sl", label: "Sl" },
		{ key: "bannerImage", label: "Banner Image" },
		{ key: "name", label: "Name" },
		{ key: "mainCategoryName", label: "Main Category" },
		{ key: "status", label: "Status" },
		{ key: "action", label: "Action" }
	];

	const openDeleteModal = (data: FirstCategoryDataProps) => {
		setSelectedFirstCategory(data);
		setIsDeleteModalOpen(true);
	};

	const closeDeleteModal = () => {
		setIsDeleteModalOpen(false);
		setSelectedFirstCategory(null);
	};

	const handleDelete = async () => {
		if (!selectedFirstCategory) return;
		const apiResponse = await handleDeleteAPI({
			url: `${apiUrl}/${selectedFirstCategory.id}`,
			invalidateQueryKey: [firstCategoryQueryKey],
			showSuccessMessage: true
		});
		if (apiResponse) {
			fetchData();
			closeDeleteModal();
		}
	};

	const handleToggleStatus = async (category: FirstCategoryDataProps) => {
		try {
			const newStatus = !Boolean(category.status);
			const result = await handleApiMutation({
				mutation: patchMutation,
				url: `${apiUrl}/${category.id}`,
				body: { status: newStatus },
				invalidateQueryKey: [firstCategoryQueryKey],
				showSuccessMessage: true,
				showErrorMessage: true
			});

			if (result?.success) {
				fetchData();
			}
		} catch (error) {
			console.error("Failed to toggle status:", error);
		}
	};

	if (isLoading && (!dataList || dataList.length === 0)) return <TableSkeleton />;

	return (
		<div className="bg-white rounded-xl shadow-xs border border-gray-200 flex flex-col relative z-20 overflow-visible">
			<div className="w-full overflow-x-auto relative z-10">
				<table className="w-full text-left border-collapse min-w-[900px] text-xs">
					<thead>
						<tr className="bg-[#41BEF3] text-black text-xs font-semibold">
							{tableHeaders?.map(({ key, label }) => (
								<th key={key} className={`py-2.5 px-3 text-left ${key === "id" ? "w-10 text-center" : ""}`}>
									{label}
								</th>
							))}
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-100 bg-white">
						{dataList && dataList.length > 0 ? (
							dataList.map((data, index) => {
								const isActive = Boolean(data.status);
								return (
									<tr key={data.id || index} className="hover:bg-sky-50/40 transition-colors group">
										<td className="py-2.5 px-3 text-center font-normal text-xs text-black">
											{(currentPageNumber - 1) * 10 + index + 1}
										</td>
										<td className="py-2.5 px-3">
											{data.bannerImage ? (
												<img
													src={data.bannerImage}
													alt={data.name}
													className="w-10 h-10 object-cover rounded-md shadow-xs border border-gray-100 hover:scale-105 transition-all ease-in-out duration-300"
												/>
											) : (
												<span className="text-xs text-gray-400">No Image</span>
											)}
										</td>
										<td className="py-2.5 px-3 font-normal text-xs text-black">{data.name}</td>
										<td className="py-2.5 px-3 text-gray-600 font-normal text-xs">{data.mainCategoryName || "-"}</td>
										<td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
											<div className="flex items-center gap-2">
												<label className="relative inline-flex items-center cursor-pointer">
													<input
														type="checkbox"
														checked={isActive}
														onChange={() => handleToggleStatus(data)}
														className="sr-only peer"
													/>
													<div className="w-8 h-4.5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-[var(--color-primary)] relative transition-all duration-200">
														<div
															className={`absolute top-[2px] left-[2px] w-3.5 h-3.5 bg-white rounded-full transition-transform duration-200 ${
																isActive ? "translate-x-3.5" : "translate-x-0"
															}`}
														/>
													</div>
												</label>
												<span
													className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
														isActive
															? "bg-emerald-50 text-emerald-700 border-emerald-200"
															: "bg-rose-50 text-rose-700 border-rose-200"
													}`}
												>
													{isActive ? "Active" : "Inactive"}
												</span>
											</div>
										</td>
										<td className="py-2 px-3 text-center">
											<div className="flex items-center justify-center gap-1.5">
												<button
													type="button"
													onClick={() => onEdit(data)}
													className="p-1 rounded text-amber-600 hover:bg-amber-100 transition-colors cursor-pointer"
													title="Edit"
												>
													<FaEdit size={14} />
												</button>
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
								);
							})
						) : (
							<tr>
								<td colSpan={tableHeaders.length} className="py-12 text-center italic">
									<EmptyState
										title="No category available"
										description="Click below to add your first category!"
										buttonText="+ Add New Category"
										onButtonClick={() => onEdit()}
									/>
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
			{selectedFirstCategory && (
				<DeleteModal
					isOpen={isDeleteModalOpen}
					title="Confirm Delete"
					message={`Are you sure you want to delete "${selectedFirstCategory.name}"?`}
					onClose={closeDeleteModal}
					onDelete={handleDelete}
				/>
			)}
			{pageCount > 1 && (
				<div className="p-2.5 sm:p-3 border-t border-gray-100 bg-gray-50/50 flex justify-end">
					<Pagination
						pageCount={pageCount}
						currentPageNumber={currentPageNumber}
						handlePagination={handlePagination}
					/>
				</div>
			)}
		</div>
	);
};

export default CategoryTable;
