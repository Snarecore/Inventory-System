import React, { useMemo, useState } from "react";
import {
  FaBell,
  FaCalendarAlt,
  FaCheck,
  FaCheckDouble,
  FaChevronLeft,
  FaChevronRight,
  FaExclamationTriangle,
  FaRedo,
} from "react-icons/fa";
import { useTranslation } from "react-i18next";
import PageHeader from "@/components/page-header/PageHeader";
import { Badge } from "@/components/common";
import NoticeDetailModal, {
  formatNoticeDate,
  stripHtml,
} from "@/components/admin/NoticeDetailModal";
import {
  getCurrentNoticeUserId,
  useMarkNoticeReadMutation,
  useNoticesQuery,
} from "@/hooks/useNoticeQueries";
import type { NoticeItem } from "@/types";

type FilterTab = "ALL" | "UNREAD";
const PAGE_SIZE = 20;

const NotificationsPage: React.FC = () => {
  const { t } = useTranslation();
  const userId = getCurrentNoticeUserId();

  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<FilterTab>("ALL");
  const [selectedNotice, setSelectedNotice] = useState<NoticeItem | null>(null);

  const { data, isLoading, isError, refetch, isFetching } = useNoticesQuery(
    userId,
    page,
    PAGE_SIZE
  );
  const markReadMutation = useMarkNoticeReadMutation(userId);

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 0;
  const totalElements = data?.totalElements ?? 0;

  const unreadCount = useMemo(
    () => items.filter((item) => !item.read).length,
    [items]
  );

  const filteredItems = useMemo(() => {
    if (filter === "UNREAD") {
      return items.filter((item) => !item.read);
    }
    return items;
  }, [items, filter]);

  const handleOpenNotice = (notice: NoticeItem) => {
    if (!notice.read) {
      markReadMutation.mutate(notice.id);
    }
    setSelectedNotice({ ...notice, read: true });
  };

  const handleMarkReadOnly = (
    e: React.MouseEvent,
    noticeId: number | string
  ) => {
    e.stopPropagation();
    markReadMutation.mutate(noticeId);
  };

  return (
    <div className="px-3 py-2 sm:px-4 sm:py-2.5 max-w-[1600px] mx-auto w-full space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader
          headerTitle="Notifications"
          headerDescription="View announcements and system notices"
        />

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-[var(--ui-border)] bg-white dark:bg-[var(--ui-surface)] text-gray-700 dark:text-[var(--ui-text)] hover:bg-gray-50 dark:hover:bg-[var(--ui-surface-muted)] transition-colors cursor-pointer disabled:opacity-50"
        >
          <FaRedo className={isFetching ? "animate-spin" : ""} size={11} />
          {t("Refresh")}
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 dark:border-[var(--ui-border)] pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              filter === "ALL"
                ? "bg-[#009fe3] text-white"
                : "bg-white dark:bg-[var(--ui-surface)] text-gray-600 dark:text-[var(--ui-text-muted)] border border-gray-200 dark:border-[var(--ui-border)] hover:bg-gray-50 dark:hover:bg-[var(--ui-surface-muted)]"
            }`}
          >
            {t("All")} ({totalElements})
          </button>
          <button
            type="button"
            onClick={() => setFilter("UNREAD")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              filter === "UNREAD"
                ? "bg-[#009fe3] text-white"
                : "bg-white dark:bg-[var(--ui-surface)] text-gray-600 dark:text-[var(--ui-text-muted)] border border-gray-200 dark:border-[var(--ui-border)] hover:bg-gray-50 dark:hover:bg-[var(--ui-surface-muted)]"
            }`}
          >
            {t("Unread")} ({unreadCount})
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="bg-white dark:bg-[var(--ui-surface)] rounded-xl border border-gray-200 dark:border-[var(--ui-border)] p-10 text-center text-sm text-gray-500 dark:text-[var(--ui-text-muted)]">
          {t("Loading...")}
        </div>
      ) : isError ? (
        <div className="bg-white dark:bg-[var(--ui-surface)] rounded-xl border border-red-200 dark:border-red-900/40 p-8 text-center space-y-3">
          <FaExclamationTriangle className="mx-auto text-amber-500" size={24} />
          <p className="text-sm text-gray-700 dark:text-[var(--ui-text)]">
            {t("Failed to load notifications")}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-lg bg-[#009fe3] text-white hover:bg-[#0087c2] cursor-pointer"
          >
            <FaRedo size={11} />
            {t("Retry")}
          </button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white dark:bg-[var(--ui-surface)] rounded-xl border border-gray-200 dark:border-[var(--ui-border)] p-12 text-center space-y-2">
          <FaBell
            className="mx-auto text-gray-300 dark:text-[var(--ui-text-subtle)]"
            size={28}
          />
          <p className="text-sm font-medium text-gray-600 dark:text-[var(--ui-text-muted)]">
            {t("No notifications found")}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((notice) => {
            const dateLabel = formatNoticeDate(
              notice.publishedAt || notice.createdAt
            );

            return (
              <div
                key={notice.id}
                onClick={() => handleOpenNotice(notice)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleOpenNotice(notice);
                  }
                }}
                className={`group rounded-xl border p-4 transition-all cursor-pointer flex flex-col sm:flex-row gap-4 ${
                  notice.read
                    ? "bg-white dark:bg-[var(--ui-surface)] border-gray-200 dark:border-[var(--ui-border)] hover:border-gray-300 dark:hover:border-gray-600"
                    : "bg-sky-50/60 dark:bg-sky-950/20 border-sky-200 dark:border-sky-800/60 hover:border-[#009fe3]"
                }`}
              >
                {notice.imageUrl && (
                  <div className="sm:w-28 sm:h-20 h-36 rounded-lg overflow-hidden border border-gray-200 dark:border-[var(--ui-border)] bg-gray-50 dark:bg-[var(--ui-surface-muted)] shrink-0">
                    <img
                      src={encodeURI(notice.imageUrl)}
                      alt={notice.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {!notice.read && (
                        <span className="w-2 h-2 rounded-full bg-[#009fe3] shrink-0" />
                      )}
                      <h3
                        className={`text-sm line-clamp-1 ${
                          notice.read
                            ? "font-medium text-gray-800 dark:text-[var(--ui-text)]"
                            : "font-semibold text-gray-900 dark:text-white"
                        }`}
                      >
                        {notice.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {notice.noticeType && (
                        <Badge variant="primary" size="sm">
                          {notice.noticeType}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 dark:text-[var(--ui-text-muted)] line-clamp-2 whitespace-pre-line">
                    {stripHtml(notice.body)}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-3 text-[11px] text-gray-400 dark:text-[var(--ui-text-subtle)]">
                      {dateLabel && (
                        <span className="inline-flex items-center gap-1">
                          <FaCalendarAlt size={10} />
                          {dateLabel}
                        </span>
                      )}
                      {notice.read && (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                          <FaCheckDouble size={10} />
                          {t("Read")}
                        </span>
                      )}
                    </div>

                    {!notice.read && (
                      <button
                        type="button"
                        onClick={(e) => handleMarkReadOnly(e, notice.id)}
                        disabled={markReadMutation.isPending}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-md bg-[#009fe3]/10 text-[#009fe3] hover:bg-[#009fe3] hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <FaCheck size={9} />
                        {t("Mark as read")}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-gray-500 dark:text-[var(--ui-text-muted)]">
            {t("Page")} {page + 1} / {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-[var(--ui-border)] bg-white dark:bg-[var(--ui-surface)] text-gray-700 dark:text-[var(--ui-text)] hover:bg-gray-50 dark:hover:bg-[var(--ui-surface-muted)] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              <FaChevronLeft size={10} />
              {t("Previous")}
            </button>
            <button
              type="button"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-[var(--ui-border)] bg-white dark:bg-[var(--ui-surface)] text-gray-700 dark:text-[var(--ui-text)] hover:bg-gray-50 dark:hover:bg-[var(--ui-surface-muted)] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              {t("Next")}
              <FaChevronRight size={10} />
            </button>
          </div>
        </div>
      )}

      <NoticeDetailModal
        notice={selectedNotice}
        onClose={() => setSelectedNotice(null)}
      />
    </div>
  );
};

export default NotificationsPage;
