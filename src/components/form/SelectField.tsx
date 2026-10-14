import { useState, useEffect, useRef, useMemo } from "react";
import { RiArrowDropDownLine } from "react-icons/ri";

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
        if (!searchTerm.trim()) return options;
        const q = searchTerm.toLocaleLowerCase();
        return options.filter((option) => option.label && option.label.toLocaleLowerCase().includes(q));
    }, [options, searchTerm]);

    return (
        <div className={`flex flex-col items-center w-full ${openDropdown ? 'relative z-50' : ''}`}>
            <div ref={dropdownRef} className={`relative w-full ${openDropdown ? 'z-50' : ''}`}>
                {label && (
                    <label className="text-xs font-semibold text-gray-700 block mb-1">
                        {label}
                        {required && <span className="text-red-600 ml-1">*</span>}
                    </label>
                )}

                <div
                    className={`border px-2.5 h-9 rounded-lg cursor-pointer bg-white flex justify-between items-center w-full text-black transition-all duration-200 text-xs active:bg-gray-50 touch-manipulation ${openDropdown ? "border-[var(--primary-color)] ring-1 ring-[var(--primary-color)]" : "border-gray-200"} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                    onClick={() => !disabled && setOpenDropdown(!openDropdown)}
                >
                    <span className={`truncate ${selectedOption ? 'text-black' : 'text-gray-400 text-xs'}`}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    <RiArrowDropDownLine className={`text-gray-500 text-lg flex-shrink-0 transition-transform duration-200 ${openDropdown ? 'rotate-180' : ''}`} />
                </div>

                {openDropdown && (
                    <div className={`absolute left-0 right-0 w-full ${showTop ? 'bottom-full mb-1' : 'top-full mt-1'} bg-white border border-gray-200 rounded-lg shadow-xl z-[100] max-w-full text-xs`}>
                        <div className="p-1.5 border-b border-gray-200">
                            <input
                                type="text"
                                placeholder="Search..."
                                className="w-full h-8 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)] focus:border-[var(--primary-color)] px-2 py-1 text-xs appearance-none"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <ul className="max-h-36 sm:max-h-48 overflow-y-auto w-full py-1">
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((option, index) => (
                                    <li
                                        key={index}
                                        className={`px-2.5 py-1.5 hover:bg-[var(--primary-color)] hover:text-white active:bg-[var(--primary-color-light)] active:text-white focus:bg-[var(--primary-color)] focus:text-white cursor-pointer w-full text-xs truncate transition-colors duration-150 touch-manipulation ${selectedOption && selectedOption.value === option.value
                                            ? "bg-[var(--primary-color-light)] text-[var(--primary-color)] font-medium"
                                            : "text-black"
                                            }`}
                                        onClick={() => handleSelect(option)}
                                    >
                                        {option.label}
                                    </li>
                                ))
                            ) : (
                                <li className="p-2 text-gray-500 w-full text-xs text-center">No results found</li>
                            )}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SelectInput;
