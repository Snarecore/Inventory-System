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
import { useUserProfileQuery } from "@/hooks/useUserProfile";
import { getUserProfileImageUrl } from "@/services/user-profile-service";
import { UserAvatar, Badge } from "@/components/common";
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

    const { data: userProfile } = useUserProfileQuery();

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

    return (
        <div className={`fixed top-0 right-0 left-0 z-40 transition-[left] duration-300 ${sidebarClick
            ? "lg:left-20"
            : "lg:left-52"
            }`}>
            <div className="flex lg:hidden items-center justify-between px-4 h-12 bg-white border-b border-gray-200 transition-all ease-in-out duration-300">
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
                            <div className="absolute top-7 right-0 w-44 bg-white shadow-lg rounded-md border border-gray-200 z-50 dropdown-menu p-1">
                                <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 p-1.5 rounded mb-1">
                                    <UserAvatar
                                        name={displayName}
                                        photoUrl={effectiveAvatarUrl}
                                        size="xs"
                                        shape="rounded"
                                    />
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="text-xs font-semibold text-gray-800 truncate">
                                            {displayName}
                                        </span>
                                        <Badge variant="primary" size="sm" className="text-[9px] px-1.5 py-0.5 uppercase tracking-wider shrink-0">
                                            {displayRole}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="space-y-0.5">
                                    <MenuItem
                                        icon={<FaUserCircle size={13} className="text-gray-500" />}
                                        text="My Profile"
                                        className="text-xs text-gray-700 font-medium hover:bg-gray-100"
                                        onClick={handleOpenUserProfile}
                                    />
                                    <MenuItem
                                        icon={<FaCog size={13} className="text-gray-500" />}
                                        text="Settings"
                                        className="text-xs text-gray-700 font-medium hover:bg-gray-100"
                                        onClick={handleOpenCompanyProfile}
                                    />
                                </div>

                                <div className="my-1 border-t border-gray-100" />

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

                                                        <span className="text-xl bg-gray-100 rounded-full">
                                                            {isOpen ? (
                                                                <RiArrowDropDownLine className="text-[var(--color-primary)]" />
                                                            ) : (
                                                                <RiArrowDropRightLine className="text-gray-600" />
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

            <div className="hidden lg:flex justify-end items-center px-4 h-12 bg-white border-b border-gray-200">
                <div className="relative">
                    <div
                        ref={userImageRef}
                        className="hidden lg:flex items-center gap-2 cursor-pointer bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-md select-none"
                        onClick={() => setShowUserDropdown(!showUserDropdown)}>
                        <MotionDiv className="flex items-center gap-2">
                            <UserAvatar
                                name={displayName}
                                photoUrl={effectiveAvatarUrl}
                                size="sm"
                                shape="rounded"
                            />
                            <span className="text-sm font-medium text-gray-800">
                                {displayName}
                            </span>
                            <IoChevronDown
                                size={14}
                                className={`text-gray-600 transition-transform duration-200 ${
                                    showUserDropdown ? "rotate-180" : ""
                                }`}
                            />
                        </MotionDiv>
                    </div>

                    <div
                        ref={dropdownRef}
                        aria-hidden={!showUserDropdown}
                        className={[
                            "absolute top-[calc(100%+4px)] right-0 w-44 bg-white shadow-lg rounded-md border border-gray-200 p-1 z-50",
                            "origin-top-right transition-all duration-200 ease-out transform",
                            showUserDropdown
                                ? "opacity-100 translate-y-0 scale-100"
                                : "opacity-0 translate-y-1 scale-95 pointer-events-none",
                        ].join(" ")}
                    >
                        <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 p-1.5 rounded mb-1">
                            <UserAvatar
                                name={displayName}
                                photoUrl={effectiveAvatarUrl}
                                size="xs"
                                shape="rounded"
                            />
                            <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-xs font-semibold text-gray-800 truncate">
                                    {displayName}
                                </span>
                                <span className="text-[9px] font-bold text-white bg-[#009fe3] px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 shadow-2xs">
                                    {displayRole}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-0.5">
                            <MenuItem
                                icon={<FaUserCircle size={13} className="text-gray-500" />}
                                text="My Profile"
                                className="text-xs text-gray-700 font-medium hover:bg-gray-100"
                                onClick={handleOpenUserProfile}
                            />
                            <MenuItem
                                icon={<FaCog size={13} className="text-gray-500" />}
                                text="Settings"
                                className="text-xs text-gray-700 font-medium hover:bg-gray-100"
                                onClick={handleOpenCompanyProfile}
                            />
                        </div>

                        <div className="my-1 border-t border-gray-100" />

                        <MenuItem
                            icon={<FaSignOutAlt size={13} />}
                            text="Logout"
                            className="text-red-500 text-xs font-medium hover:bg-red-50"
                            onClick={handleLogout}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Header;
