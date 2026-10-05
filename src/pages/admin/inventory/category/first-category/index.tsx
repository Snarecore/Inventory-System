import { useEffect, useState } from "react";
import { IoMdAddCircleOutline } from "react-icons/io";
import CategoryTable from "./components/CategoryTable";
import CategoryForm from "./components/CategoryForm";
import apiConfig from "@/config/api.json";
import { useAPI } from "@/hooks/useApi";
import { firstCategoryQueryKey } from "@/config/query-key";
import PageHeader from "@/components/page-header/PageHeader";
import Button from "@/components/button/Button";

interface FirstCategoryDataProps {
	id: string;
	name: string;
	bannerImage: string;
	mainCategoryId: string;
	mainCategoryName: string;
	status: boolean;
}

const FirstCategory = () => {
	const dataLimit = 10;
	const [currentPageNumber, setCurrentPageNumber] = useState(1);
	const { usePaginatedQuery } = useAPI();
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editData, setEditData] = useState<FirstCategoryDataProps | null>(null);

	const getFirstCategoryListApiUrl = () => {
		const apiUrl = `${apiConfig.inventory.firstCategoryUrl}?page=${currentPageNumber}&limit=${dataLimit}`;
		return apiUrl;
	};

	const handlePagination = (paginationData: { selected: number }) => {
		const selectedPage = paginationData.selected + 1;
		setCurrentPageNumber(selectedPage);
	};

	const {
		data: dataList,
		refetch: fetchData,
		pageCount,
		isFetching,
		isLoading
	} = usePaginatedQuery({
		queryKey: [firstCategoryQueryKey, String(currentPageNumber)],
		url: getFirstCategoryListApiUrl()
	});

	useEffect(() => {
		fetchData();
	}, [currentPageNumber]);

	const openModal = (data?: FirstCategoryDataProps) => {
		setEditData(data || null);
		setIsModalOpen(true);
	};

	const closeModal = () => {
		setIsModalOpen(false);
		setEditData(null);
	};

	return (
		<>
			<div className="flex flex-col gap-8">
				<div className="flex flex-wrap items-center justify-between">
					<PageHeader
						headerTitle="First Category"
						headerDescription="Manage your first categories"
					/>
					<Button
						label="Add New First Category"
						onClick={() => openModal()}
						color="var(--color-primary)"
						hoverColor="var(--color-primary-hover)"
						icon={<IoMdAddCircleOutline size={18} />}
					/>
				</div>
				<div className="grid grid-cols-12 gap-12">
					<div className="col-span-12 xl:col-span-12">
						<CategoryTable
							dataList={dataList as any}
							fetchData={fetchData}
							pageCount={pageCount}
							currentPageNumber={currentPageNumber}
							handlePagination={handlePagination}
							isLoading={isLoading}
							isFetching={isFetching}
							onEdit={openModal}
						/>
					</div>
				</div>
			</div>

			<CategoryForm
				isOpen={isModalOpen}
				onClose={closeModal}
				editData={editData}
				fetchData={fetchData}
			/>
		</>
	);
};

export default FirstCategory;
