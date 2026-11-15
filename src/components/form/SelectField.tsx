import { useState, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { RiArrowDropDownLine } from "react-icons/ri";
import { FaTimes } from "react-icons/fa";
import { useDebounce } from "@/hooks/useDebounce";

interface Option {
    label: string;
    value: string;
}

interface SelectInputProps {
    label?: string;
    value: Option | null;
    options: Option[];
    onChange: (selected: Option) => void;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    showTop?: boolean;
    size?: "xs" | "sm" | "md" | "lg";
    error?: string;
    className?: string;
    inputClassName?: string;
}

const SelectInput: React.FC<SelectInputProps> = ({
    label,
    value,
    options,
    onChange,
    placeholder = "Choose",
    required = false,
    disabled = false,
    showTop = false,
    size = "md",
    error,
    className = "",
    inputClassName = "",
}) => {
    const [openDropdown, setOpenDropdown] = useState(false);
    const [selectedOption, setSelectedOption] = useState<Option | null>(value);
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearchTerm = useDebounce(searchTerm, 150);
    const dropdownRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        setSelectedOption(value);
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (openDropdown && dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpenDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [openDropdown]);

    const handleSelect = (option: Option) => {
        setSelectedOption(option);
        onChange(option);
        setOpenDropdown(false);
        setSearchTerm("");
    };

    const handleClear = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setSelectedOption(null);
        setSearchTerm("");
        setOpenDropdown(true);
        setTimeout(() => {
            inputRef.current?.focus();
        }, 20);
    };

    const filteredOptions = useMemo(() => {
        if (!debouncedSearchTerm.trim()) return options;
        const q = debouncedSearchTerm.toLocaleLowerCase();
        return options.filter((option) => option.label && option.label.toLocaleLowerCase().includes(q));
    }, [options, debouncedSearchTerm]);

    const [highlightedIndex, setHighlightedIndex] = useState(0);

    useEffect(() => {
        setHighlightedIndex(0);
    }, [filteredOptions, openDropdown]);

    const sizeClasses: Record<string, string> = {
        xs: "ui-control-xs",
        sm: "ui-control-sm",
        md: "",
        lg: "h-[calc(var(--ui-control-h)+6px)] text-[calc(var(--ui-font-size)+1px)]",
    };

    const { t } = useTranslation();
    const translatedLabel = label ? t(label) : label;
    const translatedPlaceholder = placeholder ? t(placeholder) : placeholder;

    return (
        <div ref={dropdownRef} className={`ui-field relative w-full ${openDropdown ? 'z-50' : ''} ${className}`}>
            {translatedLabel && (
                <label className={`ui-label ${required ? 'ui-label-required' : ''}`}>
                    {translatedLabel}
                </label>
            )}

            {!selectedOption ? (
                <div
                    onClick={() => {
                        if (!disabled) {
                            setOpenDropdown(true);
                            inputRef.current?.focus();
                        }
                    }}
                    className={`ui-control flex w-full items-center justify-between gap-2 focus-within:border-[var(--primary-color)] focus-within:shadow-[0_0_0_3px_var(--ui-focus-ring)] ${
                        sizeClasses[size] || ""
                    } ${openDropdown ? 'border-[var(--primary-color)] shadow-[0_0_0_3px_var(--ui-focus-ring)]' : ''} ${
                        disabled ? 'cursor-not-allowed bg-[var(--ui-surface-sunken)] text-[var(--ui-text-subtle)]' : 'cursor-text'
                    } ${error ? 'is-invalid' : ''} ${inputClassName}`}
                >
                    <input
                        ref={inputRef}
                        type="text"
                        disabled={disabled}
                        data-form-nav="true"
                        placeholder={translatedPlaceholder}
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            if (!openDropdown) setOpenDropdown(true);
                        }}
                        onFocus={() => {
                            if (!disabled) setOpenDropdown(true);
                        }}
                        onKeyDown={(e) => {
                            if (disabled) return;
                            if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                if (!openDropdown) {
                                    setOpenDropdown(true);
                                } else {
                                    setHighlightedIndex((prev) => Math.min(prev + 1, filteredOptions.length - 1));
                                }
                            } else if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                setHighlightedIndex((prev) => Math.max(prev - 1, 0));
                            } else if (e.key === 'Enter') {
                                if (openDropdown && filteredOptions.length > 0 && filteredOptions[highlightedIndex]) {
                                    e.preventDefault();
                                    handleSelect(filteredOptions[highlightedIndex]);
                                }
                            } else if (e.key === 'Escape') {
                                e.preventDefault();
                                setOpenDropdown(false);
                            }
                        }}
                        className="w-full bg-transparent outline-none text-xs placeholder:text-[var(--ui-text-subtle)] text-[var(--ui-text)] font-normal cursor-text min-w-0"
                    />
                    <RiArrowDropDownLine
                        className={`shrink-0 text-lg text-[var(--ui-text-subtle)] transition-transform duration-200 cursor-pointer ${
                            openDropdown ? 'rotate-180 text-[var(--primary-color)]' : ''
                        }`}
                        onClick={(e) => {
                            if (!disabled) {
                                e.stopPropagation();
                                setOpenDropdown((prev) => !prev);
                                inputRef.current?.focus();
                            }
                        }}
                    />
                </div>
            ) : (
                <div
                    role="combobox"
                    aria-expanded={openDropdown}
                    aria-haspopup="listbox"
                    tabIndex={disabled ? -1 : 0}
                    data-form-nav="true"
                    onClick={() => !disabled && setOpenDropdown(!openDropdown)}
                    onKeyDown={(e) => {
                        if (disabled) return;
                        if (e.key === 'Backspace' || e.key === 'Delete') {
                            e.preventDefault();
                            handleClear();
                        } else if (e.key === 'Enter' || e.key === ' ' || (!openDropdown && e.key === 'ArrowDown')) {
                            e.preventDefault();
                            setOpenDropdown((prev) => !prev);
                        } else if (e.key === 'Escape') {
                            setOpenDropdown(false);
                        }
                    }}
                    className={`ui-control flex w-full cursor-pointer touch-manipulation items-center justify-between gap-2 focus:outline-none focus:border-[var(--primary-color)] focus:shadow-[0_0_0_3px_var(--ui-focus-ring)] focus-visible:outline-none focus-visible:border-[var(--primary-color)] focus-visible:shadow-[0_0_0_3px_var(--ui-focus-ring)] ${
                        sizeClasses[size] || ""
                    } ${openDropdown ? 'border-[var(--primary-color)] shadow-[0_0_0_3px_var(--ui-focus-ring)]' : ''} ${
                        disabled ? 'cursor-not-allowed bg-[var(--ui-surface-sunken)] text-[var(--ui-text-subtle)]' : ''
                    } ${error ? 'is-invalid' : ''} ${inputClassName}`}
                >
                    <span className="truncate text-xs text-[var(--ui-text)] font-medium">
                        {selectedOption.label}
                    </span>
                    <div className="flex items-center gap-1 shrink-0 ml-1">
                        {!disabled && (
                            <button
                                type="button"
                                onClick={handleClear}
                                className="p-0.5 text-[var(--ui-text-subtle)] hover:text-rose-500 rounded transition-colors cursor-pointer"
                                title="Clear selection"
                            >
                                <FaTimes size={10} />
                            </button>
                        )}
                        <RiArrowDropDownLine
                            className={`shrink-0 text-lg text-[var(--ui-text-subtle)] transition-transform duration-200 ${
                                openDropdown ? 'rotate-180 text-[var(--primary-color)]' : ''
                            }`}
                        />
                    </div>
                </div>
            )}

            {openDropdown && !disabled && (
                <div
                    className={`absolute left-0 right-0 z-[100] w-full max-w-full border border-[var(--ui-border)] bg-[var(--ui-surface)] shadow-xl ${
                        showTop ? 'bottom-full mb-1' : 'top-full mt-1'
                    }`}
                    style={{ borderRadius: 'var(--ui-radius)' }}
                >
                    <ul role="listbox" className="dropdownScrollbar max-h-36 w-full overflow-y-auto py-1 sm:max-h-48">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option, index) => (
                                <li
                                    key={index}
                                    role="option"
                                    aria-selected={selectedOption?.value === option.value}
                                    className={`w-full cursor-pointer touch-manipulation truncate px-2.5 py-1.5 transition-colors duration-150 ${
                                        index === highlightedIndex
                                            ? "bg-[var(--primary-color)] text-[var(--ui-on-accent)] font-medium"
                                            : selectedOption && selectedOption.value === option.value
                                            ? "bg-[var(--primary-color-light)] font-medium text-[var(--primary-color)]"
                                            : "text-[var(--ui-text)] hover:bg-[var(--primary-color-light)]"
                                    }`}
                                    onClick={() => handleSelect(option)}
                                >
                                    {option.label}
                                </li>
                            ))
                        ) : (
                            <li className="w-full p-2 text-center text-[var(--ui-text-subtle)] text-xs">
                                No results found
                            </li>
                        )}
                    </ul>
                </div>
            )}
            {error && <p className="ui-error mt-0.5">{error}</p>}
        </div>
    );
};

export default SelectInput;
