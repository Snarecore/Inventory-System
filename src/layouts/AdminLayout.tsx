import Sidebar from "@/components/admin/Sidebar";
import Header from "@/components/admin/Header";
import Footer from "@/components/admin/Footer";
import { useState, useEffect } from "react";
import { MdKeyboardDoubleArrowLeft, MdKeyboardDoubleArrowRight } from "react-icons/md";
import { Outlet } from "react-router-dom";
import BranchSelectModal from "@/components/admin/BranchSelectModal";
import { isBranchChoicePending, isUserAdmin } from "@/utils/branch-storage";
import { syncCurrentEmployeePermissions } from "@/services/employee-service";

export default function AdminLayout() {
	const [sidebarClick, setSidebarClick] = useState(false);
	const isPending = isBranchChoicePending();

	useEffect(() => {
		if (!isUserAdmin()) {
			syncCurrentEmployeePermissions();
		}
	}, []);

	const handleSidebarClick = () => setSidebarClick((v) => !v);

	return (
		<div className="relative flex h-screen overflow-hidden">
			{isPending && <BranchSelectModal />}
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

				<main className="flex-1 overflow-auto bg-[var(--ui-surface-sunken,#F6F6F6)] mt-12 flex flex-col justify-between">
					<div className="flex-1">
						<Outlet />
					</div>
					<Footer />
				</main>
			</div>
		</div>
	);
}
