import Sidebar from "@/components/admin/Sidebar";
import Header from "@/components/admin/Header";
import Footer from "@/components/admin/Footer";
import { useState, useEffect, useRef } from "react";
import { MdKeyboardDoubleArrowLeft, MdKeyboardDoubleArrowRight } from "react-icons/md";
import { Outlet, useLocation } from "react-router-dom";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import BranchSelectModal from "@/components/admin/BranchSelectModal";
import { useFormKeyboardNavigation } from "@/hooks/useFormKeyboardNavigation";
import {
	isBranchChoicePending,
	isUserAdmin,
	setActiveBranchId,
	markBranchChosen,
	clearAllBranchScoped,
} from "@/utils/branch-storage";
import { syncCurrentEmployeePermissions } from "@/services/employee-service";

export default function AdminLayout() {
	const location = useLocation();
	const mainRef = useRef<HTMLElement>(null);
	const [sidebarClick, setSidebarClick] = useState(false);
	const [isBranchModalOpen, setIsBranchModalOpen] = useState(() => isBranchChoicePending());

	useFormKeyboardNavigation(mainRef, {
		autoFocusFirst: false,
		enableEnterNavigation: true,
	});

	useEffect(() => {
		if (!isUserAdmin()) {
			syncCurrentEmployeePermissions();
		}
	}, []);

	const handleBranchSelected = (branchId: number) => {
		setActiveBranchId(branchId);
		markBranchChosen();
		clearAllBranchScoped();
		setIsBranchModalOpen(false);

		// Synchronize fresh branch permissions if non-admin employee
		if (!isUserAdmin()) {
			syncCurrentEmployeePermissions();
		}
	};

	const handleSidebarClick = () => setSidebarClick((v) => !v);

	const isFinancialBook =
		location.pathname.includes("cash-book") ||
		location.pathname.includes("bank-book") ||
		location.pathname.includes("mfs-book");

	return (
		<div className="relative flex h-screen overflow-hidden">
			{isBranchModalOpen && (
				<BranchSelectModal onSelected={handleBranchSelected} />
			)}
			<button
				onClick={handleSidebarClick}
				aria-label={sidebarClick ? "Expand sidebar" : "Collapse sidebar"}
				style={{ willChange: "left" }}
				className={`hidden lg:block lg:fixed top-3 z-[51] bg-[#009fe3] hover:bg-[#0087c2] text-white rounded-full p-1 shadow hover:opacity-90 focus:outline-none -translate-x-1/2 transition-[left,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] cursor-pointer motion-reduce:transition-none ${
					sidebarClick ? "lg:left-20" : "lg:left-52"
				}`}
			>
				{sidebarClick ? (
					<MdKeyboardDoubleArrowRight size={18} />
				) : (
					<MdKeyboardDoubleArrowLeft size={18} />
				)}
			</button>

			<Sidebar
				sidebarClick={sidebarClick}
				setSidebarClick={setSidebarClick}
			/>

			<div className="flex flex-col flex-1 min-w-0">
				<Header sidebarClick={sidebarClick} />

				<main
					ref={mainRef}
					className={`flex-1 ${
						isFinancialBook ? "overflow-hidden" : "overflow-auto"
					} bg-[var(--ui-surface-sunken,#F6F6F6)] mt-12 flex flex-col justify-between`}
				>
					<div className={`flex-1 ${isFinancialBook ? "min-h-0 flex flex-col overflow-hidden" : ""}`}>
						<ErrorBoundary resetKeys={[location.pathname]}>
							<Outlet />
						</ErrorBoundary>
					</div>
					{!isFinancialBook && <Footer />}
				</main>
			</div>
		</div>
	);
}
