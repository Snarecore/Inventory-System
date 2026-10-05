import { useState } from "react";
import { FaEdit } from "react-icons/fa";
import { FiTrash2 } from "react-icons/fi";
import DeleteModal from "@/components/modal/DeleteModal";
import TableSkeleton from "@/components/skeleton/TableSkeleton";
import EmptyState from "@/components/empty-state/EmptyState";
import Pagination from "@/components/pagination";
import { useAPI } from "@/hooks/useApi";
import apiConfig from "@/config/api.json";
import { thirdCategoryQueryKey } from "@/config/query-key";

interface ThirdCategoryDataProps {
	id: string;
	name: string;
	bannerImage: string;
	mainCategoryId: string;
	mainCategoryName: string;
	firstCategoryId: string;
	firstCategoryName: string;
	secondCategoryId: string;
	secondCategoryName: string;
	status: boolean;
}

interface ThirdCategoryTableProps {
	dataList: ThirdCategoryDataProps[];
	fetchData: () => void;
	isLoading?: boolean;
	isFetching?: boolean;
	pageCount: number;
	currentPageNumber: number;
	handlePagination: (paginationData: { selected: number }) => void;
	onEdit: (data?: ThirdCategoryDataProps) => void;
}

const CategoryTable = ({
	dataList,
	fetchData,
	isLoading,
	pageCount,
	currentPageNumber,
	handlePagination,
	isFetching: _isFetching,
	onEdit
}: ThirdCategoryTableProps) => {
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [selectedThirdCategory, setSelectedThirdCategory] = useState<ThirdCategoryDataProps | null>(null);

	const { handleDeleteAPI, handleApiMutation, patchMutation } = useAPI();
	const apiUrl = apiConfig.inventory.thirdCategoryUrl;

	const tableHeaders = [
		{ key: "sl", label: "Sl" },
		{ key: "bannerImage", label: "Banner Image" },
		{ key: "name", label: "Name" },
		{ key: "mainCategoryName", label: "Main Category" },
		{ key: "firstCategoryName", label: "First Category" },
		{ key: "secondCategoryName", label: "Second Category" },
		{ key: "status", label: "Status" },
		{ key: "action", label: "Action" }
	];

	const openDeleteModal = (data: ThirdCategoryDataProps) => {
		setSelectedThirdCategory(data);
		setIsDeleteModalOpen(true);
	};

	const closeDeleteModal = () => {
		setIsDeleteModalOpen(false);
		setSelectedThirdCategory(null);
	};

	const handleDelete = async () => {
		if (!selectedThirdCategory) return;

		const apiResponse = await handleDeleteAPI({
			url: `${apiUrl}/${selectedThirdCategory.id}`,
			invalidateQueryKey: [thirdCategoryQueryKey],
			showSuccessMessage: true
		});

		if (apiResponse) {
			fetchData();
			closeDeleteModal();
		}
	};

	const handleToggleStatus = async (category: ThirdCategoryDataProps) => {
		try {
			const newStatus = !Boolean(category.status);
			const result = await handleApiMutation({
				mutation: patchMutation,
				url: `${apiUrl}/${category.id}`,
				body: { status: newStatus },
				invalidateQueryKey: [thirdCategoryQueryKey],
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
		<div className="p-6 bg-white rounded-lg border border-gray-200 shadow-xs">
			<div className="w-full overflow-x-auto">
				<table className="w-full text-left border-collapse min-w-[900px]">
					<thead className="bg-gray-100">
						<tr className="text-gray-600 text-sm border-b border-gray-200">
							{tableHeaders.map(({ key, label }) => (
								<th key={key} className="px-6 py-4 text-left text-[#000000e0]">
									{label}
								</th>
							))}
						</tr>
					</thead>
					<tbody className="bg-white divide-y divide-gray-200 rounded-lg">
						{dataList && dataList.length > 0 ? (
							dataList.map((data, index) => {
								const isActive = Boolean(data.status);
								return (
									<tr key={data.id || index} className="border-b border-gray-100 text-gray-700 hover:bg-gray-50 transition duration-300">
										<td className="px-6 py-4 font-medium text-gray-800">
											{(currentPageNumber - 1) * 10 + index + 1}
										</td>
										<td className="px-6 py-4">
											{data.bannerImage ? (
												<img
													src={data.bannerImage}
													alt={data.name}
													height={70}
													width={70}
													className="w-14 h-14 object-cover rounded-md shadow-sm border border-gray-200 hover:scale-105 transition-all ease-in-out duration-300"
												/>
											) : (
												<span className="text-xs text-gray-400">No Image</span>
											)}
										</td>
										<td className="px-6 py-4 font-medium text-gray-800">{data.name}</td>
										<td className="px-6 py-4 text-gray-600">{data.mainCategoryName || "-"}</td>
										<td className="px-6 py-4 text-gray-600">{data.firstCategoryName || "-"}</td>
										<td className="px-6 py-4 text-gray-600">{data.secondCategoryName || "-"}</td>
										<td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
											<div className="flex items-center gap-2">
												<label className="relative inline-flex items-center cursor-pointer">
													<input
														type="checkbox"
														checked={isActive}
														onChange={() => handleToggleStatus(data)}
														className="sr-only peer"
													/>
													<div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-[var(--color-primary)] relative transition-all duration-200">
														<div
															className={`absolute top-[2px] left-[2px] w-4 h-4 bg-white rounded-full transition-transform duration-200 ${
																isActive ? "translate-x-4" : "translate-x-0"
															}`}
														/>
													</div>
												</label>
												<span
													className={`text-xs font-semibold px-2 py-0.5 rounded ${
														isActive
															? "bg-green-100 text-green-800"
															: "bg-red-100 text-red-800"
													}`}
												>
													{isActive ? "Active" : "Inactive"}
												</span>
											</div>
										</td>
										<td className="px-6 py-4">
											<div className="flex items-center gap-2">
												<button
													onClick={() => onEdit(data)}
													className="border border-gray-300 text-gray-700 hover:text-[var(--color-primary)] hover:bg-gray-200 cursor-pointer p-2 rounded-md transition duration-300"
													title="Edit"
												>
													<FaEdit />
												</button>
												<button
													onClick={() => openDeleteModal(data)}
													className="border border-gray-300 text-gray-700 hover:text-red-600 hover:bg-red-50 cursor-pointer p-2 rounded-md transition duration-300"
													title="Delete"
												>
													<FiTrash2 />
												</button>
											</div>
										</td>
									</tr>
								);
							})
						) : (
							<tr>
								<td colSpan={tableHeaders.length} className="px-6 py-8 text-center italic">
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
			{selectedThirdCategory && (
				<DeleteModal
					isOpen={isDeleteModalOpen}
					title="Confirm Delete"
					message={`Are you sure you want to delete "${selectedThirdCategory.name}"?`}
					onClose={closeDeleteModal}
					onDelete={handleDelete}
				/>
			)}
			{pageCount > 1 && (
				<div className="flex justify-center mt-6">
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
