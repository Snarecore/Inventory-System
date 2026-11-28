import React from "react";
import { FaBell, FaCalendarAlt, FaCheckCircle } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { Modal, Badge } from "@/components/common";
import type { NoticeItem } from "@/types";

interface NoticeDetailModalProps {
  notice: NoticeItem | null;
  onClose: () => void;
}

export function formatNoticeDate(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function stripHtml(html?: string | null): string {
  if (!html) return "";
  return html
    .replace(/<\/(p|div|li|br|h[1-6])>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function sanitizeNoticeHtml(raw?: string | null): string {
  if (!raw) return "";
  const hasHtmlTags = /<[a-z][\s\S]*>/i.test(raw);
  if (!hasHtmlTags) {
    return raw
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\r?\n/g, "<br />");
  }

  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return stripHtml(raw);
  }

  const doc = new DOMParser().parseFromString(raw, "text/html");
  const blockedTags = ["script", "style", "iframe", "object", "embed", "form", "input"];
  blockedTags.forEach((tag) => {
    doc.querySelectorAll(tag).forEach((el) => el.remove());
  });

  doc.querySelectorAll("*").forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      const val = attr.value.trim().toLowerCase();
      if (name.startsWith("on")) {
        el.removeAttribute(attr.name);
      } else if (
        (name === "href" || name === "src") &&
        (val.startsWith("javascript:") || val.startsWith("data:"))
      ) {
        el.removeAttribute(attr.name);
      }
    });
  });

  // Convert newlines inside text nodes to <br /> and ensure inline ✅ items start on a new line
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let current: Node | null;
  while ((current = walker.nextNode())) {
    textNodes.push(current as Text);
  }

  textNodes.forEach((textNode) => {
    const text = textNode.nodeValue || "";
    if (!/\r?\n/.test(text) && !/\S\s*✅/.test(text)) return;

    const normalized = text.replace(/([^\n])\s+(✅)/g, "$1\n$2");
    const parts = normalized.split(/\r?\n/);
    const frag = doc.createDocumentFragment();
    parts.forEach((part, idx) => {
      if (idx > 0) {
        frag.appendChild(doc.createElement("br"));
      }
      if (part) {
        frag.appendChild(doc.createTextNode(part));
      }
    });
    textNode.parentNode?.replaceChild(frag, textNode);
  });

  return doc.body.innerHTML;
}

export const NoticeDetailModal: React.FC<NoticeDetailModalProps> = ({
  notice,
  onClose,
}) => {
  const { t } = useTranslation();

  if (!notice) return null;

  const dateLabel = formatNoticeDate(notice.publishedAt || notice.createdAt);

  return (
    <Modal
      isOpen={Boolean(notice)}
      onClose={onClose}
      size="xl"
      zIndex="z-[100]"
      title={
        <div className="flex items-center gap-2">
          <FaBell className="text-[#009fe3] shrink-0" size={16} />
          <span className="line-clamp-2">{notice.title}</span>
        </div>
      }
      footerButtons={
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-1.5 text-xs font-medium rounded-md bg-[#009fe3] hover:bg-[#0087c2] text-white transition-colors cursor-pointer"
        >
          {t("Close")}
        </button>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-[var(--ui-text-muted)]">
          {notice.noticeType && (
            <Badge variant="primary" size="sm">
              {notice.noticeType}
            </Badge>
          )}
          {dateLabel && (
            <span className="inline-flex items-center gap-1">
              <FaCalendarAlt size={11} />
              {dateLabel}
            </span>
          )}
          {notice.read && (
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              <FaCheckCircle size={11} />
              {t("Read")}
            </span>
          )}
        </div>

        {notice.imageUrl && (
          <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-[var(--ui-border)] bg-gray-50 dark:bg-[var(--ui-surface-muted)]">
            <img
              src={encodeURI(notice.imageUrl)}
              alt={notice.title}
              className="w-full max-h-72 object-contain mx-auto"
            />
          </div>
        )}

        <div
          className="text-sm leading-relaxed text-gray-700 dark:text-[var(--ui-text)] [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-[#009fe3] [&_a]:underline"
          dangerouslySetInnerHTML={{ __html: sanitizeNoticeHtml(notice.body) }}
        />
      </div>
    </Modal>
  );
};

export default NoticeDetailModal;
