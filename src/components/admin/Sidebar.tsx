import { useEffect, useState } from "react";
import { RiArrowDropRightLine, RiArrowDropDownLine } from "react-icons/ri";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { menu } from "@/navigation/sidebar";
import { MotionDiv } from "@/utils/framer.motion";

type SidebarProps = {
  sidebarClick: boolean;
  setSidebarClick: React.Dispatch<React.SetStateAction<boolean>>;
};

const Sidebar = ({ sidebarClick }: SidebarProps) => {
  const location = useLocation();
  const pathname = location.pathname;
  const navigate = useNavigate();

  const [openSubMenu, setOpenSubMenu] = useState<number | null>(null);

  useEffect(() => {
    if (!sidebarClick) {
      menu.forEach((section) => {
        section.items.forEach((item) => {
          if (
            item.subItems?.some((sub) => sub.path === pathname) ||
            item.path === pathname
          ) {
            setOpenSubMenu(item.id);
          }
        });
      });
    } else {
      setOpenSubMenu(null);
    }
  }, [pathname, sidebarClick]);

  const toggleSubMenu = (id: number) => {
    setOpenSubMenu((prev) => (prev === id ? null : id));
  };

  const isAnySubmenuActive = menu.some((section) =>
    section.items.some((menuItem) =>
      menuItem.subItems?.some((subItem) => subItem.path === pathname)
    )
  );

  const handleParentItemClick = (item: any) => {
    if (sidebarClick) {
      const target =
        item.path ||
        (item.subItems && item.subItems.length > 0
          ? item.subItems[0].path
          : null);
      if (target) navigate(target);
      return;
    }
    toggleSubMenu(item.id);
  };

  return (
    <div
      className={`hidden lg:block min-h-screen bg-white shadow-md p-2 transition-all ease-in duration-300 border-r border-gray-200 relative ${
        sidebarClick ? "w-24" : "w-63"
      } `}
    >
      <MotionDiv>
        {sidebarClick ? (
          <Link to={"/admin"}>
            <div className="pt-2 flex justify-center">
              <span className="text-sm font-black tracking-wider text-[var(--color-primary)] bg-[var(--color-primary-light)] px-2.5 py-1.5 rounded-lg">
                CB
              </span>
            </div>
          </Link>
        ) : (
          <Link to={"/admin"}>
            <div className="flex items-center gap-2 pl-3 pt-2">
              <span className="text-xl font-bold tracking-tight text-[var(--color-primary)]">
                Cash Boi Admin
              </span>
            </div>
          </Link>
        )}
      </MotionDiv>

      <MotionDiv>
        <div
          className={`p-2 mt-3 max-h-[90vh] fixed ${
            sidebarClick ? "w-28" : "w-61"
          } overflow-hidden border-t border-gray-200 hover:overflow-y-auto custom-scrollbar`}
        >
          {menu.map((section) => (
            <div key={section.sectionName} className={`p-2 ${sidebarClick ? "mb-0" : "mb-2"}`}>
              <p className={`text-xs text-[#092c4c] font-bold ${sidebarClick ? "mb-0" : "mb-2"}`}>
                {sidebarClick ? "" : section.sectionName}
              </p>

              {section.items.map((item) => {
                const isParentActive = item.subItems?.some(
                  (subItem: any) => subItem.path === pathname
                );
                const isItemActive = item.path === pathname;
                const isOpen = openSubMenu === item.id;

                const shouldShowActive =
                  item.subItems && item.subItems.length > 0
                    ? isOpen || isParentActive
                    : isItemActive && !isAnySubmenuActive;

                const Icon = item.icon;

                return (
                  <div key={item.id}>
                    {item.subItems && item.subItems.length > 0 ? (
                      <div
                        onClick={() => handleParentItemClick(item)}
                        className={`${sidebarClick ? "" : "w-[200px]"} group px-[12px] py-[8px] flex items-center justify-between cursor-pointer rounded-md transition-all mb-[4px]
                        ${
                          sidebarClick
                            ? ""
                            : shouldShowActive
                            ? "bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                            : "hover:bg-gray-100"
                        }
                        `}
                        aria-expanded={!sidebarClick && isOpen}
                        aria-disabled={sidebarClick}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-lg transition-all ${
                              shouldShowActive
                                ? "text-[var(--color-primary)]"
                                : "text-[#5b6670] group-hover:text-[var(--color-primary)]"
                            }`}
                          >
                            <Icon title={item.name} size={14} />
                          </span>
                          <span
                            className={`text-sm font-medium transition-all ${
                              shouldShowActive
                                ? "text-[var(--color-primary)]"
                                : "text-[#212b36] group-hover:text-[var(--color-primary)]"
                            }`}
                          >
                            {sidebarClick ? "" : item.name}
                          </span>
                        </div>

                        {!sidebarClick && (
                          <span className="text-xl rounded-full">
                            {isOpen ? (
                              <RiArrowDropDownLine className="text-[var(--color-primary)]" />
                            ) : (
                              <RiArrowDropRightLine className="text-[var(--color-primary)]" />
                            )}
                          </span>
                        )}
                      </div>
                    ) : (
                      <Link
                        to={item.path}
                        className={`${
                          sidebarClick ? "" : "w-[200px]"
                        } group px-[12px] py-[8px] flex items-center gap-2 rounded-md transition-all mb-[2px] ${
                          sidebarClick
                            ? ""
                            : shouldShowActive
                            ? "bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                            : "hover:bg-gray-100"
                        }`}
                      >
                        <span
                          className={`text-lg transition-all ${
                            shouldShowActive
                              ? "text-[var(--color-primary)]"
                              : "text-[#5b6670] group-hover:text-[var(--color-primary)]"
                          }`}
                        >
                          <Icon title={item.name} size={14} />
                        </span>
                        <span
                          className={`text-sm font-medium transition-all ${
                            shouldShowActive
                              ? "text-[var(--color-primary)]"
                              : "text-[#212b36] group-hover:text-[var(--color-primary)]"
                          }`}
                        >
                          {sidebarClick ? "" : item.name}
                        </span>
                      </Link>
                    )}

                    {item.subItems &&
                      item.subItems.length > 0 &&
                      !sidebarClick &&
                      isOpen && (
                        <ul>
                          {item.subItems.map((subItem) => {
                            const isActive = pathname === subItem.path;
                            return (
                              <li key={subItem.id}>
                                <Link
                                  to={subItem.path}
                                  className={`block w-[200px] rounded-md group pl-4 py-2.5 p-2 cursor-pointer text-[13px] transition-all ${
                                    sidebarClick
                                      ? ""
                                      : isActive
                                      ? "text-[var(--color-primary)] font-medium"
                                      : "text-[#646b72] hover:bg-gray-100 hover:text-[var(--color-primary)]"
                                  }
                                  `}
                                >
                                  <span className="flex items-center gap-2">
                                    <div
                                      className={`shrink-0 rounded-full transition-all duration-200 ${
                                        isActive
                                          ? "border-3 border-[var(--color-primary)] group-hover:border-[var(--color-primary)]"
                                          : "border-2 border-gray-400 group-hover:border-[var(--color-primary)]"
                                      }`}
                                    />
                                    {subItem.name}
                                  </span>
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </MotionDiv>
    </div>
  );
};

export default Sidebar;
