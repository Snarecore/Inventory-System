import DateRangePicker from "@/components/date-range-picker/DateRangePicker";
import EmptyState from "@/components/empty-state/EmptyState";
import DeleteModal from "@/components/modal/DeleteModal";
import DropdownFilter from "@/components/table-components/DropdownFilter";
import RefreshButton from "@/components/table-components/RefreshButton";
import { formatDate } from "@/utils/date-utils";
import { useEffect, useMemo, useState } from "react";
import { FiEye, FiTrash2 } from "react-icons/fi";

interface OrdersDataProps {
	id: string;
	orderId: string;
	totalAmount: string;
	status: string;
	paymentStatus: string;
	createdAt?: string;
}

interface OrderTableProps {
	dataList: OrdersDataProps[];
	fetchOrderList: () => void;
	pageCount: number;
	currentPageNumber: number;
	setCurrentPageNumber: React.Dispatch<React.SetStateAction<number>>;
	handlePagination: (paginationData: { selected: number }) => void;
	isLoading: boolean;
	isFetching?: boolean;
	selectedFilters: {
		userId: { label: string; value: string } | null;
		status: { label: string; value: string } | null;
		paymentStatus: { label: string; value: string } | null;
		startDate: { label: Date; value: Date } | null;
		endDate: { label: Date; value: Date } | null;
	};
	setSelectedFilters: React.Dispatch<React.SetStateAction<{
		userId: { label: string; value: string } | null;
		status: { label: string; value: string } | null;
		paymentStatus: { label: string; value: string } | null;
		startDate: { label: Date; value: Date } | null;
		endDate: { label: Date; value: Date } | null;
	}>>;
}

const OrderTable = ({
	dataList,
	pageCount,
	currentPageNumber,
	fetchOrderList,
	setCurrentPageNumber,
	handlePagination,
	isLoading,
	isFetching,
	selectedFilters, setSelectedFilters
}: OrderTableProps) => {
	const [selectedDates, setSelectedDates] = useState({
		startDate: new Date(),
		endDate: new Date(),
	});

	const tableHeaders = [
		{ key: "sl", label: "Sl" },
		{ key: "orderId", label: "Order ID" },
		{ key: "totalAmount", label: "Amount" },
		{ key: "paymentStatus", label: "Payment Status" },
		{ key: "createdAt", label: "Created At" },
		{ key: "status", label: "Status" },
		{ key: "action", label: "Action" }
	];

	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [selectedOrderData, setSelectedOrderData] = useState<OrdersDataProps | null>(null);

	const openDeleteModal = (data: OrdersDataProps) => {
		setSelectedOrderData(data);
		setIsDeleteModalOpen(true);
	};

	const closeDeleteModal = () => {
		setIsDeleteModalOpen(false);
		setSelectedOrderData(null);
	};

	const handleInvoice = (data: OrdersDataProps) => {
		// navigate(`/invoice/${data.id}`, { state: { orderData: data } });
	};

	const handleDelete = async () => {
		alert("successful")
	};

	// Search and Filter by Category, Vendor
	const [openDropdown, setOpenDropdown] = useState<string | null>(null);

	const [customers, setCustomers] = useState<{ label: string, value: string }[]>([]);
	// const customersApiUrl = apiConfig.site.customerListUrl;
	// const fetchCustomersData = async () => {
	// 	try {
	// 		const result = await fetchData({ apiUrl: `${customersApiUrl}?role=customer` });
	// 		setCustomers(result.customerList.map((cat: any) => ({ label: cat.name, value: cat.id })));
	// 	} catch (error) {
	// 		console.error("Failed to fetch main categories:", error);
	// 	}
	// };


	// useEffect(() => {
	// 	fetchCustomersData();
	// }, []);

	const dropdownOptions = useMemo(() => {
		return {
			userId: customers,
			status: [
				{ label: "Completed", value: "Completed" },
				{ label: "Failed", value: "Failed" },
			],
			paymentStatus: [
				{ label: "Paid", value: "Paid" },
				{ label: "Unpaid", value: "Unpaid" },
			],
		};
	}, [customers]);

	const handleRefreshButton = () => {
		setSelectedFilters({
			userId: null,
			status: null,
			paymentStatus: null,
			startDate: null,
			endDate: null
		});
		setCurrentPageNumber(1);
		setOpenDropdown(null);
	};
	// Search and Filter by Category, Vendor

	// if (isFetching || isLoading) return <TableSkeleton />;

	return (
		<div className="bg-white rounded-xl shadow-xs border border-gray-200 flex flex-col relative z-20 overflow-visible">
			<div className="p-2 sm:p-2.5 border-b border-gray-100 flex flex-wrap items-center justify-end gap-2 relative z-40 overflow-visible">
				<div className="flex flex-wrap items-center gap-2">
					{(Object.entries(dropdownOptions) as [keyof typeof selectedFilters, any][]).map(([key, options]) => (
						<DropdownFilter
							key={key}
							title={
								key === "userId"
									? "Customer"
									: key === "status"
										? "Status"
										: key === "paymentStatus"
											? "Payment Status"
											: key
							}
							options={options}
							selectedOption={selectedFilters[key]}
							isOpen={openDropdown === key}
							onToggle={() => setOpenDropdown(openDropdown === key ? null : key)}
							onSelect={(selected) => {
								setSelectedFilters((prev) => ({ ...prev, [key]: selected }));
								setCurrentPageNumber(1);
								setOpenDropdown(null);
							}}
						/>
					))}
					<DateRangePicker
						onDateChange={(start, end) => {
							setSelectedFilters((prev) => ({
								...prev,
								startDate: { label: start, value: start },
								endDate: { label: end, value: end },
							}));
							setCurrentPageNumber(1);
						}}
						initialStartDate={selectedFilters.startDate?.value}
						initialEndDate={selectedFilters.endDate?.value}
					/>
					<RefreshButton onClick={handleRefreshButton} />
				</div>
			</div>

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
								<tr key={data.id} className="hover:bg-sky-50/40 transition-colors group">
									<td className="py-2.5 px-3 text-center font-normal text-xs text-black">
										{index + 1}
									</td>
									<td className="py-2.5 px-3 font-normal text-xs text-black">
										{data.orderId}
									</td>
									<td className="py-2.5 px-3 font-normal text-xs text-black">
										৳{Number(data.totalAmount || 0).toLocaleString("en-IN")}
									</td>
									<td className="py-2.5 px-3">
										<span className={`px-2 py-0.5 text-[11px] font-semibold rounded-md inline-flex items-center w-fit border ${data.paymentStatus === "Paid" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"}`}>
											{data.paymentStatus}
										</span>
									</td>
									<td className="py-2.5 px-3 font-normal text-xs text-black">
										{formatDate(data?.createdAt)}
									</td>
									<td className="py-2.5 px-3">
										<span className={`px-2 py-0.5 text-[11px] font-semibold rounded-md inline-flex items-center w-fit border ${data.status === "Completed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"}`}>
											{data.status}
										</span>
									</td>
									<td className="py-2 px-3 text-center">
										<div className="flex items-center justify-center gap-1.5">
											<button
												type="button"
												onClick={() => handleInvoice(data)}
												title="View Order"
												className="p-1 rounded text-sky-600 hover:bg-sky-100 transition-colors cursor-pointer"
											>
												<FiEye size={14} />
											</button>
											<button
												type="button"
												onClick={() => openDeleteModal(data)}
												title="Delete Order"
												className="p-1 rounded text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
											>
												<FiTrash2 size={14} />
											</button>
										</div>
									</td>
								</tr>
							))
						) : (
							<tr>
								<td colSpan={tableHeaders.length} className="py-12 text-center italic">
									<EmptyState title="Looks like no order data available." description="Promote your products more to attract your first order!" />
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
			{selectedOrderData && (
				<DeleteModal
					isOpen={isDeleteModalOpen}
					title="Delete Order"
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

export default OrderTable;
