import React from "react";
import { FiSearch, FiX } from "react-icons/fi";
import TextInput from "@/components/form/TextInput";

interface SearchProps {
	searchQuery: string;
	onSearchChange?: (query: string) => void;
	setSearchQuery?: (query: string) => void;
	placeholder?: string;
	className?: string;
	debounceDelay?: number;
}

const Search = React.memo(({
	searchQuery,
	onSearchChange,
	setSearchQuery,
	placeholder = "Search",
	className = "",
}: SearchProps) => {
	const handleChange = (val: string) => {
		if (onSearchChange) onSearchChange(val);
		if (setSearchQuery) setSearchQuery(val);
	};

	const handleClear = () => {
		if (onSearchChange) onSearchChange("");
		if (setSearchQuery) setSearchQuery("");
	};

	return (
		<div className={`relative flex items-center w-full ${className}`}>
			<TextInput
				placeholder={placeholder}
				value={searchQuery}
				onChange={handleChange}
				icon={<FiSearch className="text-gray-400 text-sm pointer-events-none" />}
				wrapperClass="!h-[32px] !border-[var(--color-primary)] !rounded-md focus-within:!ring-1 focus-within:!ring-[var(--color-primary)]"
				inputClass={`${searchQuery ? "!pr-6" : "!pr-1"}`}
			/>
			{searchQuery && (
				<button
					type="button"
					onClick={handleClear}
					className="absolute right-2 text-gray-400 hover:text-gray-600 cursor-pointer p-0.5 rounded-full transition-colors"
					title="Clear"
				>
					<FiX className="text-xs" />
				</button>
			)}
		</div>
	);
});

Search.displayName = "Search";

export default Search;
