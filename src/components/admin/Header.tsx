import { useState, useEffect, useRef } from "react";
import { BsThreeDotsVertical } from "react-icons/bs";
import { GiHamburgerMenu } from "react-icons/gi";
import { IoClose, IoChevronDown } from "react-icons/io5";
import { menu } from "@/navigation/sidebar";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { RiArrowDropDownLine, RiArrowDropRightLine } from "react-icons/ri";
import { GoDotFill } from "react-icons/go";
import { MotionDiv } from "@/utils/framer.motion";
import { FaCog, FaSignOutAlt, FaUserCircle } from "react-icons/fa";
import { getUserInfo, getStoredUser, removeStoredUser } from "@/utils/auth-storage";
import { showSuccessToast } from "@/utils/toast-utils";
import { useQueryClient } from "@tanstack/react-query";
import logoImg from "@/assets/logo.jpeg";

const MenuItem = ({
    icon,
    text,
    className = "",
    onClick
}: {
    icon: React.ReactNode;
    text: string;
    className?: string;
    onClick?: () => void;
}) => (
    <div className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${className}`} onClick={onClick}>
        {icon}
        <span>{text}</span>
    </div>
);

const Header = ({ sidebarClick }: { sidebarClick: boolean }) => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const location = useLocation();
    const pathname = location.pathname;
    const [showSidebar] = useState(false);
    const [showSidebarMenu, setShowSidebarMenu] = useState(false);
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const [showMenuDropdown, setShowMenuDropdown] = useState(false);
    const [openSubMenu, setOpenSubMenu] = useState<number | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const userImageRef = useRef<HTMLDivElement>(null);

    const userInfo = getUserInfo();
    const storedUser = getStoredUser();
    const displayName = userInfo?.fullName || userInfo?.businessName || storedUser?.name || "Admin";
    const displayRole = userInfo?.userRole || storedUser?.role || "Super Admin";

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node) &&
                userImageRef.current &&
                !userImageRef.current.contains(event.target as Node)
            ) {
                setShowUserDropdown(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const toggleSubMenu = (id: number) => {
        setOpenSubMenu(openSubMenu === id ? null : id);
    };

    const closeSidebarWithTransition = () => {
        setTimeout(() => {
            setShowSidebarMenu(false);
        }, 100);
    };

    const handleLogout = () => {
        removeStoredUser();
        queryClient.clear();
        setShowUserDropdown(false);
        setShowMenuDropdown(false);
        showSuccessToast("Logged out successfully");
        navigate("/login", { replace: true });
    };

    const handleOpenCompanyProfile = () => {
        setShowUserDropdown(false);
        setShowMenuDropdown(false);
        navigate("/admin/company");
    };

    return (
        <div className={`fixed top-0 right-0 left-0 z-40 transition-[left] duration-300 ${sidebarClick
            ? "lg:left-20"
            : "lg:left-52"
            }`}>
            <div className="flex lg:hidden items-center justify-between px-4 h-12 admin-header-strip border-b border-[var(--ui-border)] transition-all ease-in-out duration-300">
                {showSidebarMenu ? (
                    <IoClose
                        size={24}
                        className="text-[var(--color-primary)] cursor-pointer"
                        onClick={() => setShowSidebarMenu(false)}
                    />
                ) : (
                    <GiHamburgerMenu
                        size={20}
                        className="text-[var(--color-primary)] cursor-pointer"
                        onClick={() => setShowSidebarMenu(true)}
                    />
                )}

                <div className="flex items-center gap-3 pl-3">
                    <Link to={"/admin"} className="flex items-center">
                        <img
                            src={logoImg}
                            alt="Cash Boi"
                            className="h-7 w-auto max-w-[140px] object-contain"
                        />
                    </Link>
                </div>

                <div className="relative inline-block">
                    <BsThreeDotsVertical
                        size={20}
                        className="text-[var(--color-primary)] cursor-pointer"
                        onClick={() => setShowMenuDropdown(!showMenuDropdown)}
                    />

                    {showMenuDropdown && (
                        <MotionDiv>
                            <div className="absolute top-7 right-0 w-44 bg-[var(--ui-surface)] shadow-lg rounded-md border border-[var(--ui-border)] z-50 dropdown-menu p-1">
                                <div className="flex items-center gap-2 bg-[var(--ui-surface-muted)] border border-[var(--ui-border)] p-1.5 rounded mb-1">
                                    <img
                                        src="/avatar.png"
                                        alt="user"
                                        className="w-6 h-6 rounded object-cover shrink-0"
                                    />
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="text-xs font-semibold text-[var(--ui-text)] truncate">
                                            {displayName}
                                        </span>
                                        <span className="text-[9px] font-bold text-[var(--primary-color-dark)] bg-[var(--primary-color-light)] border border-[var(--primary-color-muted)] uppercase tracking-wider px-1.5 py-0.5 rounded leading-none shrink-0">
                                            {displayRole}
                                        </span>
                                    </div>
                                </div>
                                <div className="space-y-0.5">
                                    <MenuItem
                                        icon={<FaUserCircle size={13} className="text-[var(--ui-text-muted)]" />}
                                        text="My Profile"
                                        className="text-xs text-[var(--ui-text)] font-medium hover:bg-[var(--ui-surface-sunken)]"
                                        onClick={handleOpenCompanyProfile}
                                    />
                                    <MenuItem
                                        icon={<FaCog size={13} className="text-[var(--ui-text-muted)]" />}
                                        text="Settings"
                                        className="text-xs text-[var(--ui-text)] font-medium hover:bg-[var(--ui-surface-sunken)]"
                                        onClick={handleOpenCompanyProfile}
                                    />
                                </div>

                                <div className="my-1 border-t border-[var(--ui-border)]" />

                                <MenuItem
                                    icon={<FaSignOutAlt size={13} />}
                                    text="Logout"
                                    className="text-[var(--ui-danger)] text-xs font-medium hover:bg-[var(--ui-danger-light)]"
                                    onClick={handleLogout}
                                />
                            </div>
                        </MotionDiv>
                    )}
                </div>

                {showSidebarMenu && (
                    <div
                        className={`fixed top-12 left-0 w-full h-[calc(100vh-48px)] border-t border-[var(--ui-border)] overflow-auto bg-[var(--ui-surface)] shadow-lg transform transition-all duration-300 ease-in-out ${showSidebarMenu ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0"
                            }`}
                    >
                        <div className="p-4">
                            {menu.map((section) => (
                                <div key={section.sectionName} className="p-2 mb-2">
                                    <p className="text-[12px] text-[var(--primary-color-dark)] font-bold mb-2">
                                        {section.sectionName}
                                    </p>

                                    {section.items.map((item) => {
                                        const isParentActive = item.subItems?.some(
                                            (subItem) => subItem.path === pathname
                                        );
                                        const isOpen = openSubMenu === item.id;
                                        const Icon = item.icon;

                                        return (
                                            <div key={item.id}>
                                                {item.subItems && item.subItems.length > 0 ? (
                                                    <div
                                                        onClick={() => {
                                                            toggleSubMenu(item.id);
                                                            if (item.path) {
                                                                navigate(item.path);
                                                                closeSidebarWithTransition();
                                                            }
                                                        }}
                                                        className={`w-full group px-[12px] py-[8px] flex items-center justify-between cursor-pointer rounded-md transition-all mb-[2px] ${isOpen || isParentActive
                                                            ? "bg-[var(--ui-warning-light)] text-[var(--color-primary)]"
                                                            : "hover:bg-[var(--ui-surface-sunken)]"
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <span
                                                                className={`text-[18px] transition-all ${isOpen || isParentActive
                                                                    ? "text-[var(--color-primary)]"
                                                                    : "text-[var(--ui-text-muted)] group-hover:text-[var(--color-primary)]"
                                                                    }`}
                                                            >
                                                                <Icon />
                                                            </span>
                                                            <span
                                                                className={`text-[14px] font-medium transition-all ${isOpen || isParentActive
                                                                    ? "text-[var(--color-primary)]"
                                                                    : "text-[var(--ui-text-muted)] group-hover:text-[var(--color-primary)]"
                                                                    }`}
                                                            >
                                                                {item.name}
                                                            </span>
                                                        </div>

                                                        <span className="text-xl bg-[var(--ui-surface-sunken)] rounded-full">
                                                            {isOpen ? (
                                                                <RiArrowDropDownLine className="text-[var(--color-primary)]" />
                                                            ) : (
                                                                <RiArrowDropRightLine className="text-[var(--ui-text-muted)]" />
                                                            )}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <Link
                                                        to={item.path}
                                                        onClick={closeSidebarWithTransition}
                                                        className={`w-full group px-[12px] py-[8px] flex items-center justify-between cursor-pointer rounded-md transition-all mb-[2px] ${pathname === item.path
                                                            ? "bg-[var(--ui-warning-light)] text-[var(--color-primary)]"
                                                            : "hover:bg-[var(--ui-surface-sunken)]"
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <span
                                                                className={`text-[18px] transition-all ${pathname === item.path
                                                                    ? "text-[var(--color-primary)]"
                                                                    : "text-[var(--ui-text-muted)] group-hover:text-[var(--color-primary)]"
                                                                    }`}
                                                            >
                                                                <Icon />
                                                            </span>
                                                            <span
                                                                className={`text-[14px] font-medium transition-all ${pathname === item.path
                                                                    ? "text-[var(--color-primary)]"
                                                                    : "text-[var(--ui-text-muted)] group-hover:text-[var(--color-primary)]"
                                                                    }`}
                                                            >
                                                                {item.name}
                                                            </span>
                                                        </div>
                                                    </Link>
                                                )}

                                                {Boolean(item.subItems && item.subItems.length > 0) && isOpen && (
                                                    <ul>
                                                        {item.subItems?.map((subItem) => {
                                                            const isActive = pathname === subItem.path;
                                                            return (
                                                                <li
                                                                    key={subItem.id}>
                                                                    <Link
                                                                        to={subItem.path}
                                                                        onClick={closeSidebarWithTransition}
                                                                        className={`block w-full rounded-md pl-6 py-2.5 p-2 text-[13px] transition-all 
                                                                            hover:bg-[var(--ui-surface-sunken)] hover:text-[var(--color-primary)] 
                                                                            ${isActive ? "text-[var(--color-primary)] font-medium" : "text-[var(--ui-text-muted)]"}`}
                                                                    >
                                                                        <span className="flex justify-start items-center gap-2">
                                                                            <GoDotFill className="text-[10px]" />
                                                                            {subItem.name}
                                                                        </span>
                                                                    </Link>
                                                                </li>
                                                            )
                                                        })}
                                                    </ul>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {showSidebar && (
                <div className="" onClick={() => {}}></div>
            )}

            <div className="hidden lg:flex justify-end items-center px-4 h-12 admin-header-strip border-b border-[var(--ui-border)]">
                <div className="relative">
                    <div
                        ref={userImageRef}
                        className="hidden lg:flex items-center gap-2 cursor-pointer bg-[var(--ui-surface)]/80 border border-[var(--ui-border)] px-2.5 py-1 rounded-xl select-none shadow-[0_8px_18px_-14px_rgba(15,23,42,0.35)]"
                        onClick={() => setShowUserDropdown(!showUserDropdown)}>
                        <MotionDiv className="flex items-center gap-2">
                            <img
                                src="/avatar.png"
                                alt="user"
                                className="w-7 h-7 rounded object-cover"
                            />
                            <span className="text-sm font-medium text-[var(--ui-text)]">
                                {displayName}
                            </span>
                            <IoChevronDown
                                size={14}
                                className={`text-[var(--ui-text-muted)] transition-transform duration-200 ${
                                    showUserDropdown ? "rotate-180" : ""
                                }`}
                            />
                        </MotionDiv>
                    </div>

                    <div
                        ref={dropdownRef}
                        aria-hidden={!showUserDropdown}
                        className={[
                            "absolute top-[calc(100%+4px)] right-0 w-44 bg-[var(--ui-surface)] shadow-lg rounded-md border border-[var(--ui-border)] p-1 z-50",
                            "origin-top-right transition-all duration-200 ease-out transform",
                            showUserDropdown
                                ? "opacity-100 translate-y-0 scale-100"
                                : "opacity-0 translate-y-1 scale-95 pointer-events-none",
                        ].join(" ")}
                    >
                        <div className="flex items-center gap-2 bg-[var(--ui-surface-muted)] border border-[var(--ui-border)] p-1.5 rounded mb-1">
                            <img
                                src="/avatar.png"
                                alt="user"
                                className="w-6 h-6 rounded object-cover shrink-0"
                            />
                            <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-xs font-semibold text-[var(--ui-text)] truncate">
                                    {displayName}
                                </span>
                                <span className="text-[9px] font-bold text-[var(--primary-color-dark)] bg-[var(--primary-color-light)] border border-[var(--primary-color-muted)] uppercase tracking-wider px-1.5 py-0.5 rounded leading-none shrink-0">
                                    {displayRole}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-0.5">
                            <MenuItem
                                icon={<FaUserCircle size={13} className="text-[var(--ui-text-muted)]" />}
                                text="My Profile"
                                className="text-xs text-[var(--ui-text)] font-medium hover:bg-[var(--ui-surface-sunken)]"
                                onClick={handleOpenCompanyProfile}
                            />
                            <MenuItem
                                icon={<FaCog size={13} className="text-[var(--ui-text-muted)]" />}
                                text="Settings"
                                className="text-xs text-[var(--ui-text)] font-medium hover:bg-[var(--ui-surface-sunken)]"
                                onClick={handleOpenCompanyProfile}
                            />
                        </div>

                        <div className="my-1 border-t border-[var(--ui-border)]" />

                        <MenuItem
                            icon={<FaSignOutAlt size={13} />}
                            text="Logout"
                            className="text-[var(--ui-danger)] text-xs font-medium hover:bg-[var(--ui-danger-light)]"
                            onClick={handleLogout}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Header;
