import Sidebar from "@/components/admin/Sidebar";
import Header from "@/components/admin/Header";
import Footer from "@/components/admin/Footer";
import { useState } from "react";
import { MdKeyboardDoubleArrowLeft, MdKeyboardDoubleArrowRight } from "react-icons/md";
import { Outlet } from "react-router-dom";

export default function AdminLayout() {
	const [sidebarClick, setSidebarClick] = useState(false);

	const handleSidebarClick = () => setSidebarClick((v) => !v);

	return (
		<div className="admin-shell relative flex h-screen overflow-hidden bg-[var(--ui-surface-muted)]">
			<button
				onClick={handleSidebarClick}
				aria-label={sidebarClick ? "Expand sidebar" : "Collapse sidebar"}
				style={{ willChange: "left" }}
				className={`hidden lg:block lg:fixed top-4 z-[51] border border-white/20 bg-[var(--primary-color)] text-white rounded-full p-1.5 shadow-[0_12px_25px_-12px_rgba(2,6,23,0.45)] hover:scale-105 hover:bg-[var(--primary-color-hover)] focus:outline-none transition-[left,transform,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] cursor-pointer motion-reduce:transition-none ${
					sidebarClick ? "left-[68px]" : "left-[196px]"
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

				<main className="admin-main flex-1 overflow-auto mt-12 flex flex-col justify-between">
					<div className="flex-1">
						<Outlet />
					</div>
					<Footer />
				</main>
			</div>
		</div>
	);
}
