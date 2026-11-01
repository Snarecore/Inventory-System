import { FaSync } from "react-icons/fa";

interface RefreshButtonProps {
	onClick: () => void | Promise<void>;
	disabled?: boolean;
	isLoading?: boolean;
	isRefreshing?: boolean;
	label?: string;
	className?: string;
}

const RefreshButton = ({
	onClick,
	disabled = false,
	isLoading = false,
	isRefreshing = false,
	label = "Refresh",
	className = "",
}: RefreshButtonProps) => {
	const loading = isLoading || isRefreshing;

	return (
		<button
			type="button" 
			onClick={onClick}
			disabled={disabled || loading}
			className={`bg-[var(--brand-primary-dark,#001a3d)] text-white text-xs sm:text-xs font-medium cursor-pointer h-8 px-3 rounded-md flex justify-center items-center gap-1.5 transition-all ease-in duration-200 disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap shrink-0 ${className}`}
		>
			<FaSync size={11} className={loading ? "animate-spin" : ""} />
			<span>{label}</span>
		</button>
	);
};

export default RefreshButton;
