import React from "react";
import { FiSearch, FiX } from "react-icons/fi";
import TextInput from "@/components/form/TextInput";

import { useTranslation } from "react-i18next";

interface SearchProps {
	searchQuery?: string;
	value?: string;
	onSearchChange?: (query: string) => void;
	setSearchQuery?: (query: string) => void;
	onChange?: (query: string) => void;
	placeholder?: string;
	className?: string;
	debounceDelay?: number;
}

const Search = React.memo(({
	searchQuery: propSearchQuery,
	value,
	onSearchChange,
	setSearchQuery,
	onChange,
	placeholder = "Search",
	className = "",
}: SearchProps) => {
	const { t } = useTranslation();
	const currentQuery = propSearchQuery !== undefined ? propSearchQuery : (value ?? "");

	const handleChange = (val: string) => {
		if (onSearchChange) onSearchChange(val);
		if (setSearchQuery) setSearchQuery(val);
		if (onChange) onChange(val);
	};

	const handleClear = () => {
		if (onSearchChange) onSearchChange("");
		if (setSearchQuery) setSearchQuery("");
		if (onChange) onChange("");
	};

	return (
		<div className={`relative flex items-center w-full ${className}`}>
			<TextInput
				placeholder={placeholder}
				value={currentQuery}
				onChange={handleChange}
				size="sm"
				icon={<FiSearch className="text-[var(--ui-text-subtle)] text-xs pointer-events-none shrink-0" />}
				wrapperClass="!h-8 !rounded-lg !border-[var(--color-primary)] focus-within:!ring-1 focus-within:!ring-[var(--color-primary)] !py-0"
				inputClass={`text-xs ${currentQuery ? "!pr-6" : "!pr-1"}`}
			/>
			{currentQuery && (
				<button
					type="button"
					onClick={handleClear}
					className="absolute right-2 text-[var(--ui-text-subtle)] hover:text-[var(--ui-text-muted)] cursor-pointer p-0.5 rounded-full transition-colors"
					title={t("Clear")}
				>
					<FiX className="text-xs" />
				</button>
			)}
		</div>
	);
});

Search.displayName = "Search";

export default Search;
