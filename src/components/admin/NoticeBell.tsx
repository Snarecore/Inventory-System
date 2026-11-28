import React, { useEffect, useMemo, useRef, useState } from "react";
import { FaBell, FaCheckDouble } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  getCurrentNoticeUserId,
  useMarkNoticeReadMutation,
  useNoticesQuery,
} from "@/hooks/useNoticeQueries";
import type { NoticeItem } from "@/types";
import NoticeDetailModal, {
  formatNoticeDate,
  stripHtml,
} from "./NoticeDetailModal";

interface NoticeBellProps {
  compact?: boolean;
}

const NoticeBell: React.FC<NoticeBellProps> = ({ compact = false }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const userId = getCurrentNoticeUserId();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<NoticeItem | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useNoticesQuery(userId, 0, 20);
  const markReadMutation = useMarkNoticeReadMutation(userId);

  const items = data?.items ?? [];
  const unreadCount = useMemo(
    () => items.filter((item) => !item.read).length,
    [items]
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNoticeClick = (notice: NoticeItem) => {
    if (!notice.read) {
      markReadMutation.mutate(notice.id);
    }
    setSelectedNotice({ ...notice, read: true });
    setIsOpen(false);
  };

  const handleViewAll = () => {
    setIsOpen(false);
    navigate("/admin/notifications");
  };

  const previewItems = items.slice(0, 6);

  return (
    <>
      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`relative flex items-center justify-center ${
            compact ? "w-7 h-7" : "w-8 h-8"
          } rounded-lg border border-gray-200 dark:border-[var(--ui-border)] bg-gray-100 dark:bg-[var(--ui-surface-muted)] hover:bg-gray-200 dark:hover:bg-[var(--ui-surface-sunken)] text-gray-700 dark:text-[var(--ui-text)] transition-all cursor-pointer shadow-2xs`}
          title={t("Notifications")}
          aria-label={t("Notifications")}
        >
          <FaBell className={compact ? "text-xs" : "text-sm"} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none shadow-sm">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        {isOpen && (
          <div className="absolute top-[calc(100%+6px)] right-0 w-80 sm:w-96 bg-white dark:bg-[var(--ui-surface)] shadow-xl rounded-lg border border-gray-200 dark:border-[var(--ui-border)] z-[100] overflow-hidden">
            <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-gray-100 dark:border-[var(--ui-border)] bg-gray-50/70 dark:bg-[var(--ui-surface-muted)]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-800 dark:text-[var(--ui-text)]">
                  {t("Notifications")}
                </span>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#009fe3]/10 text-[#009fe3]">
                    {unreadCount} {t("Unread")}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleViewAll}
                className="text-[11px] font-medium text-[#009fe3] hover:underline cursor-pointer"
              >
                {t("View all")}
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-[var(--ui-border)]">
              {isLoading ? (
                <div className="p-6 text-center text-xs text-gray-500 dark:text-[var(--ui-text-muted)]">
                  {t("Loading...")}
                </div>
              ) : previewItems.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-500 dark:text-[var(--ui-text-muted)]">
                  {t("No notifications found")}
                </div>
              ) : (
                previewItems.map((notice) => (
                  <button
                    key={notice.id}
                    type="button"
                    onClick={() => handleNoticeClick(notice)}
                    className={`w-full text-left px-3.5 py-2.5 transition-colors cursor-pointer flex items-start gap-2.5 ${
                      notice.read
                        ? "hover:bg-gray-50 dark:hover:bg-[var(--ui-surface-muted)]"
                        : "bg-sky-50/60 dark:bg-sky-950/20 hover:bg-sky-50 dark:hover:bg-sky-950/30"
                    }`}
                  >
                    <span
                      className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                        notice.read
                          ? "bg-transparent"
                          : "bg-[#009fe3]"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`text-xs line-clamp-1 ${
                            notice.read
                              ? "font-medium text-gray-700 dark:text-[var(--ui-text)]"
                              : "font-semibold text-gray-900 dark:text-white"
                          }`}
                        >
                          {notice.title}
                        </p>
                        {notice.read && (
                          <FaCheckDouble
                            size={10}
                            className="text-emerald-500 shrink-0 mt-0.5"
                          />
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-[var(--ui-text-muted)] line-clamp-2 mt-0.5">
                        {stripHtml(notice.body)}
                      </p>
                      <span className="text-[10px] text-gray-400 dark:text-[var(--ui-text-subtle)] mt-1 block">
                        {formatNoticeDate(notice.publishedAt || notice.createdAt)}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="border-t border-gray-100 dark:border-[var(--ui-border)] p-2 bg-gray-50/50 dark:bg-[var(--ui-surface-muted)]">
              <button
                type="button"
                onClick={handleViewAll}
                className="w-full py-1.5 text-xs font-medium text-center text-[#009fe3] hover:bg-[#009fe3]/10 rounded transition-colors cursor-pointer"
              >
                {t("View all notifications")}
              </button>
            </div>
          </div>
        )}
      </div>

      <NoticeDetailModal
        notice={selectedNotice}
        onClose={() => setSelectedNotice(null)}
      />
    </>
  );
};

export default NoticeBell;
