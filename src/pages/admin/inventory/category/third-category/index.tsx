import { useEffect, useState } from "react";
import { IoMdAddCircleOutline } from "react-icons/io";
import CategoryTable from "./components/CategoryTable";
import CategoryForm from "./components/CategoryForm";
import apiConfig from "@/config/api.json";
import { useAPI } from "@/hooks/useApi";
import { thirdCategoryQueryKey } from "@/config/query-key";
import PageHeader from "@/components/page-header/PageHeader";
import Button from "@/components/button/Button";

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

const ThirdCategory = () => {
	const dataLimit = 10;
	const [currentPageNumber, setCurrentPageNumber] = useState(1);
	const { usePaginatedQuery } = useAPI();
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editData, setEditData] = useState<ThirdCategoryDataProps | null>(null);

	const getThirdCategoryListApiUrl = () => {
		const apiUrl = `${apiConfig.inventory.thirdCategoryUrl}?page=${currentPageNumber}&limit=${dataLimit}`;
		return apiUrl;
	};

	const handlePagination = (paginationData: { selected: number }) => {
		const selectedPage = paginationData.selected + 1;
		setCurrentPageNumber(selectedPage);
	};

	const {
		data: dataList,
		refetch: fetchData,
		isFetching,
		pageCount,
		isLoading
	} = usePaginatedQuery({
		queryKey: [thirdCategoryQueryKey, String(currentPageNumber)],
		url: getThirdCategoryListApiUrl()
	});

	useEffect(() => {
		fetchData();
	}, [currentPageNumber]);

	const openModal = (data?: ThirdCategoryDataProps) => {
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
						headerTitle="Third Category"
						headerDescription="Manage your third categories"
					/>
					<Button
						label="Add New Third Category"
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

export default ThirdCategory;
