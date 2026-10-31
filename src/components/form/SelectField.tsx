import { useState, useEffect, useRef, useMemo } from "react";
import { RiArrowDropDownLine } from "react-icons/ri";
import { useDebounce } from "@/hooks/useDebounce";

interface Option {
    label: string;
    value: string;
}

interface SelectInputProps {
    label: string;
    value: Option | null;
    options: Option[];
    onChange: (selected: Option) => void;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    showTop?: boolean;
}

const SelectInput: React.FC<SelectInputProps> = ({ label, value, options, onChange, placeholder = "Choose", required, disabled = false, showTop = false }) => {
    const [openDropdown, setOpenDropdown] = useState(false);
    const [selectedOption, setSelectedOption] = useState<Option | null>(value);
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearchTerm = useDebounce(searchTerm, 150);
    const dropdownRef = useRef<HTMLDivElement | null>(null);

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

    const filteredOptions = useMemo(() => {
        if (!debouncedSearchTerm.trim()) return options;
        const q = debouncedSearchTerm.toLocaleLowerCase();
        return options.filter((option) => option.label && option.label.toLocaleLowerCase().includes(q));
    }, [options, debouncedSearchTerm]);

    return (
        <div className={`flex w-full flex-col items-center ${openDropdown ? 'relative z-50' : ''}`}>
            <div ref={dropdownRef} className={`ui-field relative w-full ${openDropdown ? 'z-50' : ''}`}>
                {label && (
                    <label className={`ui-label ${required ? 'ui-label-required' : ''}`}>
                        {label}
                    </label>
                )}

                <div
                    role="combobox"
                    aria-expanded={openDropdown}
                    aria-haspopup="listbox"
                    tabIndex={disabled ? -1 : 0}
                    className={`ui-control flex w-full cursor-pointer touch-manipulation items-center justify-between gap-2 ${openDropdown ? 'border-[var(--primary-color)] shadow-[0_0_0_3px_var(--ui-focus-ring)]' : ''} ${disabled ? 'cursor-not-allowed bg-[var(--ui-surface-sunken)] text-[var(--ui-text-subtle)]' : ''}`}
                    onClick={() => !disabled && setOpenDropdown(!openDropdown)}
                    onKeyDown={(e) => {
                        if (disabled) return;
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setOpenDropdown((prev) => !prev);
                        } else if (e.key === 'Escape') {
                            setOpenDropdown(false);
                        }
                    }}
                >
                    <span className={`truncate ${selectedOption ? 'text-[var(--ui-text)]' : 'text-[var(--ui-text-subtle)]'}`}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    <RiArrowDropDownLine className={`shrink-0 text-lg text-[var(--ui-text-subtle)] transition-transform duration-200 ${openDropdown ? 'rotate-180 text-[var(--primary-color)]' : ''}`} />
                </div>

                {openDropdown && (
                    <div className={`absolute left-0 right-0 z-[100] w-full max-w-full border border-[var(--ui-border)] bg-[var(--ui-surface)] shadow-xl ${showTop ? 'bottom-full mb-1' : 'top-full mt-1'}`} style={{ borderRadius: 'var(--ui-radius)' }}>
                        <div className="border-b border-[var(--ui-border)] p-1.5">
                            <input
                                type="text"
                                placeholder="Search..."
                                className="ui-control"
                                style={{ height: 'calc(var(--ui-control-h) - 6px)' }}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <ul role="listbox" className="dropdownScrollbar max-h-36 w-full overflow-y-auto py-1 sm:max-h-48">
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((option, index) => (
                                    <li
                                        key={index}
                                        role="option"
                                        aria-selected={selectedOption?.value === option.value}
                                        className={`w-full cursor-pointer touch-manipulation truncate px-2.5 py-1.5 transition-colors duration-150 hover:bg-[var(--primary-color)] hover:text-[var(--ui-on-accent)] ${selectedOption && selectedOption.value === option.value
                                            ? "bg-[var(--primary-color-light)] font-medium text-[var(--primary-color)]"
                                            : "text-[var(--ui-text)]"
                                            }`}
                                        onClick={() => handleSelect(option)}
                                    >
                                        {option.label}
                                    </li>
                                ))
                            ) : (
                                <li className="w-full p-2 text-center text-[var(--ui-text-subtle)]">No results found</li>
                            )}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SelectInput;
