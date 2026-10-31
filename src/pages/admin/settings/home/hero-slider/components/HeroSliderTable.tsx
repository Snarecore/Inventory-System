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
		<div className="bg-[var(--ui-surface)] rounded-xl shadow-xs border border-[var(--ui-border)] flex flex-col relative z-20 overflow-visible">
			<div className="w-full overflow-x-auto relative z-10">
				<table className="w-full text-left border-collapse min-w-[900px] text-xs">
					<thead>
						<tr className="bg-[var(--ui-accent-2)] text-[var(--ui-text)] text-xs font-semibold">
							{tableHeaders.map(({ key, label }) => (
								<th key={key} className={`py-2.5 px-3 text-left ${key === "id" ? "w-10 text-center" : ""}`}>
									{label}
								</th>
							))}
						</tr>
					</thead>
					<tbody className="divide-y divide-[var(--ui-border)] bg-[var(--ui-surface)]">
						{dataList && dataList.length > 0 ? (
							dataList.map((data, index) => {
								const isActive = Boolean(data.status);
								return (
									<tr
										key={data.id || index}
										className="hover:bg-[var(--primary-color-light)]/40 transition-colors group"
									>
										<td className="py-2.5 px-3 text-center font-normal text-xs text-[var(--ui-text)]">
											{(currentPageNumber - 1) * 10 + index + 1}
										</td>
										<td className="py-2.5 px-3">
											<img
												src={data.image || "https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg"}
												alt="image"
												className="h-10 w-16 object-cover rounded-md shadow-xs border border-[var(--ui-border)]"
											/>
										</td>
										<td className="py-2.5 px-3 text-[var(--primary-color)] cursor-pointer">
											<a href={data.link} target="_blank" rel="noreferrer">
												{data.link || "N/A"}
											</a>
										</td>
										<td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
											<div className="flex items-center gap-2">
												<label className="relative inline-flex items-center cursor-pointer">
													<input
														type="checkbox"
														checked={isActive}
														onChange={() => handleToggleStatus(data)}
														className="sr-only peer"
													/>
													<div className="w-8 h-4.5 bg-[var(--ui-border)] peer-focus:outline-none rounded-full peer peer-checked:bg-[var(--color-primary)] relative transition-all duration-200">
														<div
															className={`absolute top-[2px] left-[2px] w-3.5 h-3.5 bg-[var(--ui-surface)] rounded-full transition-transform duration-200 ${
																isActive ? "translate-x-3.5" : "translate-x-0"
															}`}
														/>
													</div>
												</label>
												<span
													className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
														isActive
															? "bg-[var(--ui-success-light)] text-[var(--ui-success-dark)] border-[var(--ui-success-border)]"
															: "bg-[var(--ui-danger-light)] text-[var(--ui-danger-dark)] border-[var(--ui-danger-border)]"
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
								);
							})
						) : (
							<tr>
								<td
									colSpan={tableHeaders.length}
									className="py-12 text-center italic"
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
				<div className="p-2.5 sm:p-3 border-t border-[var(--ui-border)] bg-[var(--ui-surface-muted)]/50 flex justify-end">
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
