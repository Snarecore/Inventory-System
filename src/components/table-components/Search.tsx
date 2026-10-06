import React from "react";
import { FiSearch } from "react-icons/fi";

interface SearchProps {
	searchQuery: string;
	onSearchChange?: (query: string) => void;
	setSearchQuery?: (query: string) => void;
	placeholder?: string;
	className?: string;
}

const Search = React.memo(({ searchQuery, onSearchChange, setSearchQuery, placeholder = "Search", className = "" }: SearchProps) => {
	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = e.target.value;
		if (onSearchChange) onSearchChange(val);
		if (setSearchQuery) setSearchQuery(val);
	};

	return (
		<div className={`relative flex items-center w-full ${className}`}>
			<FiSearch className="absolute left-2.5 text-gray-400 text-sm pointer-events-none" />
			<input
				type="text"
				placeholder={placeholder}
				value={searchQuery}
				onChange={handleChange}
				className="w-full pl-8 pr-3 h-[32px] text-xs text-black border border-gray-300 rounded-md bg-white placeholder:text-gray-400 focus:outline-none focus:border-gray-400 transition-colors"
			/>
		</div>
	);
});

Search.displayName = "Search";

export default Search;
