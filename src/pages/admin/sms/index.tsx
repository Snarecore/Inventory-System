import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaPaperPlane,
  FaCoins,
  FaCopy,
  FaRedo,
  FaShieldAlt,
  FaCheckDouble,
} from "react-icons/fa";
import PageHeader from "@/components/page-header/PageHeader";
import { MotionDiv } from "@/utils/framer.motion";
import {
  Button,
  RefreshButton,
  Search,
  DropdownFilter,
  EmptyState,
  TableContainer,
  TableToolbar,
  TableScroll,
  Table,
  TableHead,
  TableTh,
  TableBody,
  TableRow,
  TableCell,
  TableActionButtons,
  TableSkeleton,
} from "@/components/common";
import Pagination from "@/components/pagination";
import { useSmsBalance, useSmsSendList } from "@/hooks/useSms";
import { showSuccessToast } from "@/utils/toast-utils";
import type { SmsHistoryItem } from "@/types";
import SmsComposerModal from "./components/SmsComposerModal";
import SmsMessageDetailsModal from "./components/SmsMessageDetailsModal";

const formatDateDisplay = (dateStr?: string | null): string => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

export const SendSmsPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: balanceData, isLoading: isBalanceLoading, refetch: refetchBalance } = useSmsBalance();
  const { data: serverLogs = [], isLoading: isLogsLoading, refetch: refetchLogs } = useSmsSendList();

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [isTypeFilterOpen, setIsTypeFilterOpen] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [dataLimit, setDataLimit] = useState<number>(10);

  // Modals state
  const [isComposeOpen, setIsComposeOpen] = useState<boolean>(false);
  const [resendData, setResendData] = useState<{ phone: string; message: string; name: string } | null>(null);
  const [viewingItem, setViewingItem] = useState<SmsHistoryItem | null>(null);

  const typeOptions = [
    { label: "All Types", value: "" },
    { label: "Customers", value: "Customer" },
    { label: "Suppliers", value: "Supplier" },
    { label: "Direct Numbers", value: "Direct" },
  ];

  // Sync with server
  const refreshLogs = () => {
    refetchBalance();
    refetchLogs();
  };

  // Filter & Search
  const filteredLogs = useMemo(() => {
    return serverLogs.filter((item) => {
      // Type filter
      if (typeFilter && item.recipientType.toUpperCase() !== typeFilter.toUpperCase()) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchName = (item.recipientName || "").toLowerCase().includes(query);
        const matchPhone = (item.recipientPhone || "").toLowerCase().includes(query);
        const matchMessage = (item.message || "").toLowerCase().includes(query);
        return matchName || matchPhone || matchMessage;
      }

      return true;
    });
  }, [serverLogs, searchQuery, typeFilter]);

  // Pagination
  const totalCount = filteredLogs.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / dataLimit));
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * dataLimit;
    return filteredLogs.slice(startIndex, startIndex + dataLimit);
  }, [filteredLogs, currentPage, dataLimit]);

  const handleMessageSent = () => {
    // Queries are cleanly invalidated by useSendSms mutation hook in React Query
    setResendData(null);
  };

  const handleResend = (item: SmsHistoryItem) => {
    setResendData({
      phone: item.recipientPhone,
      message: item.message,
      name: item.recipientName,
    });
    setIsComposeOpen(true);
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    showSuccessToast("Message copied to clipboard!");
  };

  return (
    <div className="flex flex-col gap-2.5 px-3 py-2 sm:px-4 sm:py-2.5 max-w-[1600px] mx-auto w-full">
      {/* 1. Header & Top Action Buttons */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          headerTitle="SMS Messenger"
          headerDescription="Send branded messages to customers, suppliers and track delivery logs"
        />

        <div className="flex flex-wrap items-center gap-2">
          <RefreshButton onClick={refreshLogs} isLoading={isBalanceLoading || isLogsLoading} />
          <Button
            label="Recharge Bundles"
            onClick={() => navigate("/admin/settings/sms")}
            color="#f59e0b"
            hoverColor="#d97706"
            icon={<FaCoins className="text-white text-xs" />}
          />
          <Button
            label="Send SMS"
            onClick={() => {
              setResendData(null);
              setIsComposeOpen(true);
            }}
            color="#009fe3"
            hoverColor="#0085be"
            icon={<FaPaperPlane className="text-white text-xs" />}
          />
        </div>
      </div>

      {/* 2. KPI Summary Cards (Matching standard cash-boi page metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 w-full">
        {/* Card 1: Remaining SMS Balance - Emerald (Success) */}
        <MotionDiv delay={0.05}>
          <div className="p-3 rounded-xl border bg-[var(--ui-success-light)]/60 border-[var(--ui-success-border)] hover:border-[var(--ui-success-border)] flex items-center justify-between gap-2.5 transition-all shadow-xs h-full">
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-semibold text-[var(--ui-text)] tracking-wider truncate">
                Remaining SMS Balance
              </span>
              <span className="text-base sm:text-lg font-bold truncate mt-0.5 text-[var(--ui-success)]">
                {balanceData ? balanceData.smsBalance.toLocaleString("en-IN") : "0"}
              </span>
            </div>
            <div className="p-2 rounded-lg shrink-0 bg-[var(--ui-success-border)] text-[var(--ui-success)]">
              <FaCoins size={16} />
            </div>
          </div>
        </MotionDiv>

        {/* Card 2: Total Sent in Log - Primary Blue */}
        <MotionDiv delay={0.1}>
          <div className="p-3 rounded-xl border bg-[var(--primary-color-light)]/60 border-[var(--primary-color-muted)] hover:border-[var(--primary-color-muted)] flex items-center justify-between gap-2.5 transition-all shadow-xs h-full">
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-semibold text-[var(--ui-text)] tracking-wider truncate">
                Total Messages Sent
              </span>
              <span className="text-base sm:text-lg font-bold truncate mt-0.5 text-[var(--primary-color)]">
                {serverLogs.length.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="p-2 rounded-lg shrink-0 bg-[var(--primary-color-muted)] text-[var(--primary-color)]">
              <FaCheckDouble size={16} />
            </div>
          </div>
        </MotionDiv>

        {/* Card 3: Lifetime SMS Consumed - Info Blue */}
        <MotionDiv delay={0.15}>
          <div className="p-3 rounded-xl border bg-[var(--ui-info-light)]/60 border-[var(--ui-info-border)] hover:border-[var(--ui-info-border)] flex items-center justify-between gap-2.5 transition-all shadow-xs h-full">
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-semibold text-[var(--ui-text)] tracking-wider truncate">
                Credits Consumed
              </span>
              <span className="text-base sm:text-lg font-bold truncate mt-0.5 text-[var(--ui-info)]">
                {balanceData ? balanceData.smsConsumed.toLocaleString("en-IN") : "0"}
              </span>
            </div>
            <div className="p-2 rounded-lg shrink-0 bg-[var(--ui-info-border)] text-[var(--ui-info)]">
              <FaPaperPlane size={16} />
            </div>
          </div>
        </MotionDiv>

        {/* Card 4: Sender ID Branding - Warning Amber */}
        <MotionDiv delay={0.2}>
          <div className="p-3 rounded-xl border bg-[var(--ui-warning-light)]/60 border-[var(--ui-warning-border)] hover:border-[var(--ui-warning-border)] flex items-center justify-between gap-2.5 transition-all shadow-xs h-full">
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-semibold text-[var(--ui-text)] tracking-wider truncate">
                Sender ID Masking
              </span>
              <span className="text-base sm:text-lg font-bold truncate mt-0.5 text-[var(--ui-warning)]">
                Cash Boi
              </span>
            </div>
            <div className="p-2 rounded-lg shrink-0 bg-[var(--ui-warning-border)] text-[var(--ui-warning)]">
              <FaShieldAlt size={16} />
            </div>
          </div>
        </MotionDiv>
      </div>

      {/* 3. Reusable Table Container */}
      <TableContainer>
        {/* Table Toolbar with Search & Recipient Filter */}
        <TableToolbar>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 w-full">
            {/* Left: Search Box */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="w-full sm:w-56">
                <Search
                  searchQuery={searchQuery}
                  onSearchChange={(value) => {
                    setSearchQuery(value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search messages..."
                />
              </div>
            </div>

            {/* Right: DropdownFilter */}
            <div className="flex flex-wrap items-center gap-2">
              <DropdownFilter
                title="Recipient Type"
                options={typeOptions}
                selectedOption={typeFilter ? typeOptions.find((o) => o.value === typeFilter) || null : null}
                isOpen={isTypeFilterOpen}
                onToggle={() => setIsTypeFilterOpen(!isTypeFilterOpen)}
                onSelect={(selected) => {
                  setTypeFilter(selected ? selected.value : "");
                  setCurrentPage(1);
                  setIsTypeFilterOpen(false);
                }}
              />
            </div>
          </div>
        </TableToolbar>

        {/* Table Scroll & Content */}
        <TableScroll>
          {isLogsLoading ? (
            <TableSkeleton columnCount={6} rowCount={8} />
          ) : (
            <Table className="table-fixed min-w-[850px]">
              <TableHead>
                <TableTh className="w-[5%] text-left">SL</TableTh>
                <TableTh className="w-[18%] text-left">Date & Time</TableTh>
                <TableTh className="w-[18%] text-left">Phone Number</TableTh>
                <TableTh className="w-[12%] text-left">Type</TableTh>
                <TableTh className="w-[39%] text-left">Message Content</TableTh>
                <TableTh className="w-[8%] text-right">Actions</TableTh>
              </TableHead>

              <TableBody>
                {paginatedLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center">
                      <EmptyState
                        title={
                          searchQuery || typeFilter
                            ? "No messages matching your search/filters"
                            : "No SMS messages sent yet"
                        }
                        description={
                          searchQuery || typeFilter
                            ? "Try clearing the search or filters to see all messages."
                            : "Click 'Send SMS' above to deliver your first branded message."
                        }
                        buttonText={searchQuery || typeFilter ? undefined : "Send SMS"}
                        onButtonClick={
                          searchQuery || typeFilter
                            ? undefined
                            : () => {
                                setResendData(null);
                                setIsComposeOpen(true);
                              }
                        }
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedLogs.map((item, index) => {
                    const globalIndex = (currentPage - 1) * dataLimit + index + 1;
                    const formattedDate = formatDateDisplay(item.sentAt);

                    return (
                      <TableRow key={item.id} className="hover:bg-[var(--primary-color-light)]/40 transition-colors group">
                        {/* SL */}
                        <TableCell className="text-left font-mono text-[11px] text-[var(--ui-text-muted)]">
                          {globalIndex}
                        </TableCell>

                        {/* Date & Time */}
                        <TableCell className="text-left text-xs text-[var(--ui-text)] whitespace-nowrap">
                          {formattedDate}
                        </TableCell>

                        {/* Phone Number */}
                        <TableCell className="text-left font-mono text-xs text-[var(--ui-text)] whitespace-nowrap">
                          {item.recipientPhone}
                        </TableCell>

                        {/* Recipient Type Badge */}
                        <TableCell className="text-left">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold border ${
                              item.recipientType === "Customer"
                                ? "bg-[var(--primary-color-muted)] text-[var(--primary-color-dark)] border-[var(--primary-color-muted)]"
                                : item.recipientType === "Supplier"
                                ? "bg-[var(--ui-info-border)] text-[var(--ui-info-dark)] border-[var(--ui-info-border)]"
                                : "bg-[var(--ui-success-border)] text-[var(--ui-success-dark)] border-[var(--ui-success-border)]"
                            }`}
                          >
                            {item.recipientType}
                          </span>
                        </TableCell>

                        {/* Message Content */}
                        <TableCell className="text-left">
                          <div
                            onClick={() => setViewingItem(item)}
                            className="line-clamp-2 text-xs text-[var(--ui-text)] hover:text-[var(--primary-color)] cursor-pointer select-text leading-relaxed"
                            title="Click to view full message"
                          >
                            {item.message}
                          </div>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right py-2 px-3">
                          <TableActionButtons
                            onView={() => setViewingItem(item)}
                            viewTitle="View Message Details"
                            className="justify-end"
                            extraActions={
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleCopyText(item.message)}
                                  title="Copy Message Text"
                                  className="p-1 rounded text-[var(--ui-text-muted)] hover:bg-[var(--ui-surface-sunken)] hover:text-[var(--primary-color)] transition-colors cursor-pointer"
                                >
                                  <FaCopy size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleResend(item)}
                                  title="Resend to Recipient"
                                  className="p-1 rounded text-[var(--ui-info)] hover:bg-[var(--ui-info-border)] transition-colors cursor-pointer"
                                >
                                  <FaRedo size={11} />
                                </button>
                              </>
                            }
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </TableScroll>

        {/* Table Pagination Footer */}
        {!isLogsLoading && filteredLogs.length > 0 && (
          <div className="p-2.5 sm:p-3 border-t border-[var(--ui-border)] bg-[var(--ui-surface-muted)]/50 flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 text-xs text-[var(--ui-text-muted)]">
              <span>Show</span>
              <select
                value={dataLimit}
                onChange={(e) => {
                  setDataLimit(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-[var(--ui-border-strong)] rounded px-1.5 py-0.5 text-xs bg-[var(--ui-surface)] text-[var(--ui-text)] focus:outline-none focus:border-[var(--primary-color)] cursor-pointer"
              >
                {[10, 20, 50, 100].map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <span>entries per page (Total {totalCount} messages)</span>
            </div>

            <Pagination
              pageCount={pageCount}
              currentPageNumber={currentPage}
              handlePagination={({ selected }) => setCurrentPage(selected + 1)}
            />
          </div>
        )}
      </TableContainer>

      {/* 4. Compose SMS Modal */}
      {isComposeOpen && (
        <SmsComposerModal
          isOpen={isComposeOpen}
          onClose={() => {
            setIsComposeOpen(false);
            setResendData(null);
          }}
          onMessageSent={handleMessageSent}
          currentBalance={balanceData?.smsBalance ?? 0}
          initialPhone={resendData?.phone ?? ""}
          initialMessage={resendData?.message ?? ""}
          initialRecipientName={resendData?.name ?? ""}
        />
      )}

      {/* 5. View Full Message Modal */}
      {viewingItem && (
        <SmsMessageDetailsModal
          item={viewingItem}
          isOpen={Boolean(viewingItem)}
          onClose={() => setViewingItem(null)}
          onResend={handleResend}
        />
      )}
    </div>
  );
};

export default SendSmsPage;
