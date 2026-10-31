import { useEffect, useState } from "react";
import { RiArrowDropRightLine, RiArrowDropDownLine } from "react-icons/ri";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { menu } from "@/navigation/sidebar";
import { MotionDiv } from "@/utils/framer.motion";
import logoImg from "@/assets/logo.jpeg";

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
    toggleSubMenu(item.id);
    const target =
      item.path ||
      (item.subItems && item.subItems.length > 0
        ? item.subItems[0].path
        : null);
    if (target) navigate(target);
  };

  return (
    <div
      className={`hidden lg:flex flex-col h-screen bg-[var(--ui-surface)]/85 backdrop-blur-xl shadow-[0_18px_40px_-18px_rgba(15,23,42,0.35)] transition-all ease-in duration-300 border-r border-[var(--ui-border)] relative shrink-0 ${
        sidebarClick ? "w-20" : "w-52"
      }`}
    >
      <div className={`h-12 flex items-center border-b border-[var(--ui-border)] bg-[var(--ui-surface)]/70 shrink-0 ${sidebarClick ? "justify-center px-2" : "justify-start px-3.5"}`}>
        <Link to={"/admin"} className="flex items-center">
          {sidebarClick ? (
            <img
              src={logoImg}
              alt="Cash Boi"
              className="h-7 w-7 object-contain rounded-md shadow-sm"
            />
          ) : (
            <img
              src={logoImg}
              alt="Cash Boi"
              className="h-7 w-auto max-w-36 object-contain"
            />
          )}
        </Link>
      </div>

      <div className="flex-1 px-2 py-2 overflow-y-auto custom-scrollbar">
        {menu.map((section) => (
          <div key={section.sectionName} className={sidebarClick ? "mb-1" : "mb-2"}>
            {!sidebarClick && section.sectionName && (
              <p className="text-[11px] text-[var(--primary-color-dark)] font-bold px-2 mb-1">
                {section.sectionName}
              </p>
            )}

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
                <div key={item.id} className="mb-0.5">
                  {item.subItems && item.subItems.length > 0 ? (
                    <div
                      onClick={() => handleParentItemClick(item)}
                      className={`w-full group py-1.5 flex items-center cursor-pointer rounded-xl transition-all ${
                        sidebarClick
                          ? "justify-center px-0"
                          : "justify-between px-2.5"
                      } ${
                        shouldShowActive
                          ? "bg-[var(--color-primary-light)] text-[var(--color-primary)] shadow-[inset_0_0_0_1px_rgba(6,51,107,0.06)]"
                          : "hover:bg-[var(--ui-surface-sunken)]"
                      }`}
                      aria-expanded={!sidebarClick && isOpen}
                      aria-disabled={sidebarClick}
                      title={sidebarClick ? item.name : undefined}
                    >
                      <div className={`flex items-center gap-2 ${sidebarClick ? "justify-center" : ""}`}>
                        <span
                          className={`text-base transition-all ${
                            shouldShowActive
                              ? "text-[var(--color-primary)]"
                              : "text-[var(--ui-text-muted)] group-hover:text-[var(--color-primary)]"
                          }`}
                        >
                          <Icon title={item.name} size={15} />
                        </span>
                        {!sidebarClick && (
                          <span
                            className={`text-xs font-semibold transition-all ${
                              shouldShowActive
                                ? "text-[var(--color-primary)]"
                                : "text-[var(--ui-text)] group-hover:text-[var(--color-primary)]"
                            }`}
                          >
                            {item.name}
                          </span>
                        )}
                      </div>

                      {!sidebarClick && (
                        <span className="text-lg">
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
                      className={`w-full group py-1.5 flex items-center rounded-xl transition-all ${
                        sidebarClick
                          ? "justify-center px-0"
                          : "gap-2 px-2.5"
                      } ${
                        shouldShowActive
                          ? "bg-[var(--color-primary-light)] text-[var(--color-primary)] shadow-[inset_0_0_0_1px_rgba(6,51,107,0.06)]"
                          : "hover:bg-[var(--ui-surface-sunken)]"
                      }`}
                      title={sidebarClick ? item.name : undefined}
                    >
                      <span
                        className={`text-base transition-all ${
                          shouldShowActive
                            ? "text-[var(--color-primary)]"
                            : "text-[var(--ui-text-muted)] group-hover:text-[var(--color-primary)]"
                        }`}
                      >
                        <Icon title={item.name} size={15} />
                      </span>
                      {!sidebarClick && (
                        <span
                          className={`text-xs font-semibold transition-all ${
                            shouldShowActive
                              ? "text-[var(--color-primary)]"
                              : "text-[var(--ui-text)] group-hover:text-[var(--color-primary)]"
                          }`}
                        >
                          {item.name}
                        </span>
                      )}
                    </Link>
                  )}

                  {item.subItems &&
                    item.subItems.length > 0 &&
                    !sidebarClick &&
                    isOpen && (
                      <ul className="mt-0.5 space-y-0.5">
                        {item.subItems.map((subItem) => {
                          const isActive = pathname === subItem.path;
                          return (
                            <li key={subItem.id}>
                              <Link
                                to={subItem.path}
                                className={`block w-full rounded-md pl-5 pr-2.5 py-1 cursor-pointer text-xs transition-all ${
                                  isActive
                                    ? "text-[var(--color-primary)] font-semibold bg-[var(--color-primary-light)]"
                                    : "text-[var(--ui-text-muted)] hover:bg-[var(--ui-surface-sunken)] hover:text-[var(--color-primary)]"
                                }`}
                              >
                                <span className="flex items-center gap-2">
                                  <div
                                    className={`w-1 h-1 shrink-0 rounded-full transition-all duration-200 ${
                                      isActive
                                        ? "bg-[var(--color-primary)]"
                                        : "bg-[var(--ui-text-subtle)] group-hover:bg-[var(--color-primary)]"
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

    </div>
  );
};

export default Sidebar;