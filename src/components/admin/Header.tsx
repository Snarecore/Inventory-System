import { useState, useEffect, useRef } from "react";
import { menu } from "@/navigation/sidebar";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { MotionDiv } from "@/utils/framer.motion";
import {
    FaCog,
    FaSignOutAlt,
    FaUserCircle,
    FaSun,
    FaMoon,
    FaEllipsisV,
    FaBars,
    FaTimes,
    FaChevronDown,
    FaChevronRight,
    FaCircle,
    FaCrown,
} from "react-icons/fa";
import { getUserInfo, removeStoredUser } from "@/utils/auth-storage";
import { showSuccessToast } from "@/utils/toast-utils";
import { useQueryClient } from "@tanstack/react-query";
import { useUserProfileQuery } from "@/hooks/useUserProfile";
import { getUserProfileImageUrl } from "@/services/user-profile-service";
import { UserAvatar, Badge } from "@/components/common";
import { useAppearance } from "@/theme";
import logoImg from "@/assets/logo.jpeg";
import BranchSwitcher from "@/components/admin/BranchSwitcher";

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

    const { data: userProfile } = useUserProfileQuery();
    const { resolved, setOverrides } = useAppearance();
    const isDark = resolved.isDark;

    const toggleColorMode = () => {
        setOverrides({ colorMode: isDark ? "light" : "dark" });
    };

    const userInfo = getUserInfo();
    const displayName = userProfile?.fullName || userInfo?.fullName || "Admin";
    const displayRole = userInfo?.userRole || "ADMIN";
    const userPhone = userProfile?.phoneNumber || userInfo?.phoneNumber || "";
    const effectiveAvatarUrl = userPhone ? getUserProfileImageUrl(userPhone) : null;

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

    const handleOpenUserProfile = () => {
        setShowUserDropdown(false);
        setShowMenuDropdown(false);
        navigate("/admin/profile");
    };

    const handleOpenCompanyProfile = () => {
        setShowUserDropdown(false);
        setShowMenuDropdown(false);
        navigate("/admin/company");
    };

    const handleOpenPackages = () => {
        setShowUserDropdown(false);
        setShowMenuDropdown(false);
        navigate("/admin/packages");
    };

    return (
        <div className={`fixed top-0 right-0 left-0 z-40 transition-[left] duration-300 ${sidebarClick
            ? "lg:left-20"
            : "lg:left-52"
            }`}>
            <div className="flex lg:hidden items-center justify-between px-4 h-12 bg-white border-b border-gray-200 transition-all ease-in-out duration-300">
                {showSidebarMenu ? (
                    <FaTimes
                        size={22}
                        className="text-[var(--color-primary)] cursor-pointer"
                        onClick={() => setShowSidebarMenu(false)}
                    />
                ) : (
                    <FaBars
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

                <div className="flex items-center gap-2">
                    <BranchSwitcher />
                    {/* Mobile Dark Mode Toggle Button */}
                    <button
                        type="button"
                        onClick={toggleColorMode}
                        className="flex items-center justify-center w-7 h-7 rounded-lg border border-gray-200 dark:border-[var(--ui-border)] bg-gray-50 dark:bg-[var(--ui-surface-muted)] text-gray-700 dark:text-[var(--ui-text)] hover:bg-gray-100 dark:hover:bg-[var(--ui-surface-sunken)] transition-all cursor-pointer"
                        title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                        aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    >
                        {isDark ? (
                            <FaSun className="text-amber-400 text-xs" />
                        ) : (
                            <FaMoon className="text-slate-600 text-xs" />
                        )}
                    </button>

                    <div className="relative inline-block">
                        <FaEllipsisV
                            size={18}
                            className="text-[var(--color-primary)] cursor-pointer"
                            onClick={() => setShowMenuDropdown(!showMenuDropdown)}
                        />

                        {showMenuDropdown && (
                            <MotionDiv>
                                <div className="absolute top-7 right-0 w-44 bg-white dark:bg-[var(--ui-surface)] shadow-lg rounded-md border border-gray-200 dark:border-[var(--ui-border)] z-50 dropdown-menu p-1">
                                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-[var(--ui-surface-muted)] border border-gray-100 dark:border-[var(--ui-border)] p-1.5 rounded mb-1">
                                        <UserAvatar
                                            name={displayName}
                                            photoUrl={effectiveAvatarUrl}
                                            size="xs"
                                            shape="rounded"
                                        />
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <span className="text-xs font-semibold text-gray-800 dark:text-[var(--ui-text)] truncate">
                                                {displayName}
                                            </span>
                                            <Badge variant="primary" size="sm" className="text-[9px] px-1.5 py-0.5 uppercase tracking-wider shrink-0">
                                                {displayRole}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="space-y-0.5">
                                        <MenuItem
                                            icon={<FaUserCircle size={13} className="text-gray-500 dark:text-[var(--ui-text-subtle)]" />}
                                            text="My Profile"
                                            className="text-xs text-gray-700 dark:text-[var(--ui-text)] font-medium hover:bg-gray-100 dark:hover:bg-[var(--ui-surface-muted)]"
                                            onClick={handleOpenUserProfile}
                                        />
                                        <MenuItem
                                            icon={<FaCog size={13} className="text-gray-500 dark:text-[var(--ui-text-subtle)]" />}
                                            text="Settings"
                                            className="text-xs text-gray-700 dark:text-[var(--ui-text)] font-medium hover:bg-gray-100 dark:hover:bg-[var(--ui-surface-muted)]"
                                            onClick={handleOpenCompanyProfile}
                                        />
                                    </div>

                                    <div className="my-1 border-t border-gray-100 dark:border-[var(--ui-border)]" />

                                <MenuItem
                                    icon={<FaSignOutAlt size={13} />}
                                    text="Logout"
                                    className="text-red-500 text-xs font-medium hover:bg-red-50"
                                    onClick={handleLogout}
                                />
                            </div>
                        </MotionDiv>
                    )}
                </div>
                </div>

                {showSidebarMenu && (
                    <div
                        className={`fixed top-12 left-0 w-full h-[calc(100vh-48px)] border-t border-gray-200 overflow-auto bg-white shadow-lg transform transition-all duration-300 ease-in-out ${showSidebarMenu ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0"
                            }`}
                    >
                        <div className="p-4">
                            {menu.map((section) => (
                                <div key={section.sectionName} className="p-2 mb-2">
                                    <p className="text-[12px] text-[#092c4c] font-bold mb-2">
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
                                                            ? "bg-[#FFF7F0] text-[var(--color-primary)]"
                                                            : "hover:bg-gray-100"
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <span
                                                                className={`text-[18px] transition-all ${isOpen || isParentActive
                                                                    ? "text-[var(--color-primary)]"
                                                                    : "text-[#5b6670] group-hover:text-[var(--color-primary)]"
                                                                    }`}
                                                            >
                                                                <Icon />
                                                            </span>
                                                            <span
                                                                className={`text-[14px] font-medium transition-all ${isOpen || isParentActive
                                                                    ? "text-[var(--color-primary)]"
                                                                    : "text-[#5b6670] group-hover:text-[var(--color-primary)]"
                                                                    }`}
                                                            >
                                                                {item.name}
                                                            </span>
                                                        </div>

                                                        <span className="text-xs bg-gray-100 rounded-full p-1.5 flex items-center justify-center">
                                                            {isOpen ? (
                                                                <FaChevronDown className="text-[var(--color-primary)] text-[10px]" />
                                                            ) : (
                                                                <FaChevronRight className="text-gray-600 text-[10px]" />
                                                            )}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <Link
                                                        to={item.path}
                                                        onClick={closeSidebarWithTransition}
                                                        className={`w-full group px-[12px] py-[8px] flex items-center justify-between cursor-pointer rounded-md transition-all mb-[2px] ${pathname === item.path
                                                            ? "bg-[#FFF7F0] text-[var(--color-primary)]"
                                                            : "hover:bg-gray-100"
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <span
                                                                className={`text-[18px] transition-all ${pathname === item.path
                                                                    ? "text-[var(--color-primary)]"
                                                                    : "text-[#5b6670] group-hover:text-[var(--color-primary)]"
                                                                    }`}
                                                            >
                                                                <Icon />
                                                            </span>
                                                            <span
                                                                className={`text-[14px] font-medium transition-all ${pathname === item.path
                                                                    ? "text-[var(--color-primary)]"
                                                                    : "text-[#5b6670] group-hover:text-[var(--color-primary)]"
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
                                                                            hover:bg-gray-100 hover:text-[var(--color-primary)] 
                                                                            ${isActive ? "text-[var(--color-primary)] font-medium" : "text-[#646b72]"}`}
                                                                    >
                                                                        <span className="flex justify-start items-center gap-2">
                                                                            <FaCircle className="text-[7px]" />
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

            <div className="hidden lg:flex justify-end items-center gap-2.5 px-4 h-12 bg-white dark:bg-[var(--ui-surface)] border-b border-gray-200 dark:border-[var(--ui-border)] transition-colors">
                <BranchSwitcher />
                {/* Dark Mode / Light Mode Toggle Button */}
                <button
                    type="button"
                    onClick={toggleColorMode}
                    className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-[var(--ui-border)] bg-gray-100 dark:bg-[var(--ui-surface-muted)] hover:bg-gray-200 dark:hover:bg-[var(--ui-surface-sunken)] text-gray-700 dark:text-[var(--ui-text)] transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                    title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                >
                    {isDark ? (
                        <FaSun className="text-amber-400 text-sm transition-transform duration-200 hover:rotate-45" />
                    ) : (
                        <FaMoon className="text-slate-600 text-sm transition-transform duration-200 hover:-rotate-12" />
                    )}
                </button>

                <div className="relative">
                    <div
                        ref={userImageRef}
                        className="hidden lg:flex items-center gap-2 cursor-pointer bg-gray-100 dark:bg-[var(--ui-surface-muted)] hover:bg-gray-200 dark:hover:bg-[var(--ui-surface-sunken)] border border-gray-200 dark:border-[var(--ui-border)] px-2.5 py-1 rounded-md select-none transition-colors"
                        onClick={() => setShowUserDropdown(!showUserDropdown)}>
                        <MotionDiv className="flex items-center gap-2">
                            <UserAvatar
                                name={displayName}
                                photoUrl={effectiveAvatarUrl}
                                size="sm"
                                shape="rounded"
                            />
                            <span className="text-sm font-medium text-gray-800 dark:text-[var(--ui-text)]">
                                {displayName}
                            </span>
                            <FaChevronDown
                                size={12}
                                className={`text-gray-600 dark:text-[var(--ui-text-muted)] transition-transform duration-200 ${
                                    showUserDropdown ? "rotate-180" : ""
                                }`}
                            />
                        </MotionDiv>
                    </div>

                    <div
                        ref={dropdownRef}
                        aria-hidden={!showUserDropdown}
                        className={[
                            "absolute top-[calc(100%+4px)] right-0 w-44 bg-white dark:bg-[var(--ui-surface)] shadow-lg rounded-md border border-gray-200 dark:border-[var(--ui-border)] p-1 z-50",
                            "origin-top-right transition-all duration-200 ease-out transform",
                            showUserDropdown
                                ? "opacity-100 translate-y-0 scale-100"
                                : "opacity-0 translate-y-1 scale-95 pointer-events-none",
                        ].join(" ")}
                    >
                        <div className="flex items-center gap-2 bg-gray-50 dark:bg-[var(--ui-surface-muted)] border border-gray-100 dark:border-[var(--ui-border)] p-1.5 rounded mb-1">
                            <UserAvatar
                                name={displayName}
                                photoUrl={effectiveAvatarUrl}
                                size="xs"
                                shape="rounded"
                            />
                            <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-xs font-semibold text-gray-800 dark:text-[var(--ui-text)] truncate">
                                    {displayName}
                                </span>
                                <span className="text-[9px] font-bold text-white bg-[#009fe3] px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 shadow-2xs">
                                    {displayRole}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-0.5">
                            <MenuItem
                                icon={<FaUserCircle size={13} className="text-gray-500 dark:text-[var(--ui-text-muted)]" />}
                                text="My Profile"
                                className="text-xs text-gray-700 dark:text-[var(--ui-text)] font-medium hover:bg-gray-100 dark:hover:bg-[var(--ui-surface-muted)]"
                                onClick={handleOpenUserProfile}
                            />
                            <MenuItem
                                icon={<FaCog size={13} className="text-gray-500 dark:text-[var(--ui-text-muted)]" />}
                                text="Settings"
                                className="text-xs text-gray-700 dark:text-[var(--ui-text)] font-medium hover:bg-gray-100 dark:hover:bg-[var(--ui-surface-muted)]"
                                onClick={handleOpenCompanyProfile}
                            />
                            <MenuItem
                                icon={<FaCrown size={13} className="text-amber-500" />}
                                text="Packages & Pricing"
                                className="text-xs text-gray-700 dark:text-[var(--ui-text)] font-medium hover:bg-gray-100 dark:hover:bg-[var(--ui-surface-muted)]"
                                onClick={handleOpenPackages}
                            />
                        </div>

                        <div className="my-1 border-t border-gray-100 dark:border-[var(--ui-border)]" />

                        <MenuItem
                            icon={<FaSignOutAlt size={13} />}
                            text="Logout"
                            className="text-red-500 text-xs font-medium hover:bg-red-50 dark:hover:bg-red-950/20"
                            onClick={handleLogout}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Header;
