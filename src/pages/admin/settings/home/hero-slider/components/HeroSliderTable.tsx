import { useState } from "react";
import { FaEdit } from "react-icons/fa";
import { FiTrash2 } from "react-icons/fi";
import DeleteModal from "@/components/modal/DeleteModal";
import { useAPI } from "@/hooks/useApi";
import apiConfig from "@/config/api.json";
import { heroSliderQueryKey } from "@/config/query-key";
import TableSkeleton from "@/components/skeleton/TableSkeleton";
import EmptyState from "@/components/empty-state/EmptyState";
import Pagination from "@/components/pagination";

export interface HeroSliderDataProps {
	id: string;
	image: string;
	link: string;
	status: boolean;
}

export interface HeroSliderTableProps {
	dataList: HeroSliderDataProps[];
	fetchData: () => void;
	isLoading?: boolean;
	isFetching?: boolean;
	pageCount: number;
	currentPageNumber: number;
	handlePagination: (paginationData: { selected: number }) => void;
	onEdit: (data?: HeroSliderDataProps) => void;
}

const HeroSliderTable = ({
	dataList = [],
	fetchData,
	isLoading,
	isFetching: _isFetching,
	pageCount = 1,
	currentPageNumber = 1,
	handlePagination,
	onEdit
}: HeroSliderTableProps) => {
	const { handleDeleteAPI, handleApiMutation, patchMutation } = useAPI();
	const apiUrl = apiConfig.setting.heroSliderUrl;

	const tableHeaders = [
		{ key: "sl", label: "Sl" },
		{ key: "image", label: "Image" },
		{ key: "link", label: "Link" },
		{ key: "status", label: "Status" },
		{ key: "action", label: "Action" }
	];

	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [selectedHeroSlider, setSelectedHeroSlider] = useState<HeroSliderDataProps | null>(null);

	const openDeleteModal = (data: HeroSliderDataProps) => {
		setSelectedHeroSlider(data);
		setIsDeleteModalOpen(true);
	};

	const closeDeleteModal = () => {
		setIsDeleteModalOpen(false);
		setSelectedHeroSlider(null);
	};

	const handleDelete = async () => {
		if (!selectedHeroSlider) return;
		const apiResponse = await handleDeleteAPI({
			url: `${apiUrl}/${selectedHeroSlider.id}`,
			invalidateQueryKey: [heroSliderQueryKey],
			showSuccessMessage: true
		});
		if (apiResponse) {
			if (fetchData) fetchData();
			closeDeleteModal();
		}
	};

	const handleToggleStatus = async (slider: HeroSliderDataProps) => {
		try {
			const newStatus = !Boolean(slider.status);
			const result = await handleApiMutation({
				mutation: patchMutation,
				url: `${apiUrl}/${slider.id}`,
				body: { status: newStatus },
				invalidateQueryKey: [heroSliderQueryKey],
				showSuccessMessage: true,
				showErrorMessage: true
			});

			if (result?.success && fetchData) {
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
									<tr
										key={data.id || index}
										className="border-b border-gray-100 text-gray-700 hover:bg-gray-50 transition duration-300"
									>
										<td className="px-6 py-4 font-medium text-gray-800">
											{(currentPageNumber - 1) * 10 + index + 1}
										</td>
										<td className="px-6 py-4">
											<img
												src={data.image || "https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg"}
												alt="image"
												className="h-[70px] w-[70px] object-cover rounded-md shadow-sm border border-gray-200"
											/>
										</td>
										<td className="px-6 py-4 text-blue-500 hover:underline cursor-pointer">
											<a href={data.link} target="_blank" rel="noreferrer">
												{data.link || "N/A"}
											</a>
										</td>
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
								<td
									colSpan={tableHeaders.length}
									className="px-6 py-8 text-center italic"
								>
									<EmptyState
										title="No slider available"
										description="Click below to add your first slider!"
										buttonText="+ Add New Slider"
										onButtonClick={() => onEdit()}
									/>
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
					message="Are you sure you want to delete?"
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

export default HeroSliderTable;
