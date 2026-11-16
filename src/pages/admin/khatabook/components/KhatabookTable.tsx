import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import Search from "@/components/table-components/Search";
import DropdownFilter from "@/components/table-components/DropdownFilter";
import EmptyState from "@/components/empty-state/EmptyState";
import TableSkeleton from "@/components/skeleton/TableSkeleton";
import {
  TableContainer,
  TableToolbar,
  TableScroll,
  Table,
  TableHead,
  TableTh,
  TableBody,
  TablePaginationFooter,
  ExcelExportButton,
  TableActionButtons,
} from "@/components/common";
import type { LedgerPerson } from "@/types";
import { formatMoney } from "@/utils/formatters";
import { buildAndDownloadExcel } from "@/utils/excel-export";
import { useDebounce } from "@/hooks/useDebounce";
import { FiPlus } from "react-icons/fi";
import { usePermission } from "@/hooks/usePermission";

interface KhatabookTableProps {
  persons: LedgerPerson[];
  isLoading: boolean;
  onViewLedger: (person: LedgerPerson) => void;
  onAddTransaction: (person: LedgerPerson) => void;
  onEditPerson: (person: LedgerPerson) => void;
  onDeletePerson: (person: LedgerPerson) => void;
}

export const KhatabookTable: React.FC<KhatabookTableProps> = ({
  persons,
  isLoading,
  onViewLedger,
  onAddTransaction,
  onEditPerson,
  onDeletePerson,
}) => {
  const { t } = useTranslation();
  const { canCreate, canUpdate, canDelete } = usePermission();
  const [searchQuery, setSearchQuery] = useState("");
  const [balanceFilter, setBalanceFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const debouncedSearch = useDebounce(searchQuery, 300);

  const balanceOptions = [
    { label: "All Balances", value: "" },
    { label: "Receivable (Pabo)", value: "PABO" },
    { label: "Payable (Dibo)", value: "DIBO" },
    { label: "Settled (Zero)", value: "SETTLED" },
  ];

  const statusOptions = [
    { label: "All Status", value: "" },
    { label: "Active", value: "active" },
    { label: "Inactive", value: "inactive" },
  ];

  // Filtering
  const filteredList = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    const result: LedgerPerson[] = [];

    for (let i = 0; i < persons.length; i++) {
      const p = persons[i];
      const net = p.netBalance ?? 0;
      const status = (p.status || "Active").toLowerCase();

      // Filter by balance
      if (balanceFilter === "PABO" && net <= 0) continue;
      if (balanceFilter === "DIBO" && net >= 0) continue;
      if (balanceFilter === "SETTLED" && net !== 0) continue;

      // Filter by status
      if (statusFilter && status !== statusFilter.toLowerCase()) continue;

      // Filter by search
      if (term) {
        const target = `${p.name} ${p.phone} ${p.address || ""} ${p.tag || ""}`.toLowerCase();
        if (!target.includes(term)) continue;
      }

      result.push(p);
    }

    return result;
  }, [persons, debouncedSearch, balanceFilter, statusFilter]);

  // Pagination calculation
  const totalItems = filteredList.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedList = filteredList.slice(startIndex, startIndex + pageSize);

  const handleExportExcel = () => {
    if (filteredList.length === 0) return;

    let sumPabo = 0;
    let sumDibo = 0;

    const rows = filteredList.map((p, idx) => {
      const pabo = p.totalPabo ?? 0;
      const dibo = p.totalDibo ?? 0;
      const net = p.netBalance ?? 0;
      sumPabo += pabo;
      sumDibo += dibo;

      return {
        "SL": idx + 1,
        "Person Name": p.name,
        "Phone Number": p.phone,
        "Address": p.address || "-",
        "Status": p.status || "Active",
        "Receivable (BDT)": pabo,
        "Payable (BDT)": dibo,
        "Net Balance (BDT)": net,
        "Transactions Count": p.transactionCount ?? 0,
      };
    });

    const totalRow = {
      "SL": "Total",
      "Person Name": "-",
      "Phone Number": "-",
      "Address": "-",
      "Status": "-",
      "Receivable (BDT)": sumPabo,
      "Payable (BDT)": sumDibo,
      "Net Balance (BDT)": sumPabo - sumDibo,
      "Transactions Count": "-",
    };

    buildAndDownloadExcel(rows, totalRow, {
      fileName: `Khatabook_Persons_${new Date().toISOString().split("T")[0]}.xlsx`,
      sheetName: "Khatabook",
    });
  };

  return (
    <TableContainer className="w-full">
      {/* Table Toolbar with Search on Left and Dropdowns & Export on Right */}
      <TableToolbar>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 w-full">
          {/* Left: Search Box */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <div className="w-full sm:w-52">
              <Search
                searchQuery={searchQuery}
                onSearchChange={(value) => {
                  setSearchQuery(value);
                  setCurrentPage(1);
                }}
                placeholder="Search persons..."
              />
            </div>
          </div>

          {/* Right: Dropdown Filters & Excel Button */}
          <div className="flex flex-wrap items-center gap-1.5">

            {/* Balance Dropdown */}
            <DropdownFilter
              title="Balance Type"
              options={balanceOptions}
              selectedOption={
                balanceFilter ? balanceOptions.find((o) => o.value === balanceFilter) || null : null
              }
              isOpen={openDropdown === "balance"}
              onToggle={() => setOpenDropdown(openDropdown === "balance" ? null : "balance")}
              onSelect={(selected) => {
                setBalanceFilter(selected ? selected.value : "");
                setCurrentPage(1);
                setOpenDropdown(null);
              }}
            />

            {/* Status Dropdown */}
            <DropdownFilter
              title="Status"
              options={statusOptions}
              selectedOption={
                statusFilter ? statusOptions.find((o) => o.value === statusFilter) || null : null
              }
              isOpen={openDropdown === "status"}
              onToggle={() => setOpenDropdown(openDropdown === "status" ? null : "status")}
              onSelect={(selected) => {
                setStatusFilter(selected ? selected.value : "");
                setCurrentPage(1);
                setOpenDropdown(null);
              }}
            />

            {/* Excel Export Button */}
            <ExcelExportButton
              onClick={handleExportExcel}
              disabled={filteredList.length === 0}
              title={t("Download Khatabook Excel Report")}
            />
          </div>
        </div>
      </TableToolbar>

      {/* Table Content */}
      <TableScroll>
        {isLoading ? (
          <div className="p-3">
            <TableSkeleton columnCount={9} />
          </div>
        ) : (
          <Table className="table-fixed min-w-[950px]">
            <TableHead>
              <TableTh width="4%">SL</TableTh>
              <TableTh width="16%">Person Name</TableTh>
              <TableTh width="12%">Contact Info</TableTh>
              <TableTh width="15%">Address</TableTh>
              <TableTh width="12%" align="right">Receivable (Pabo)</TableTh>
              <TableTh width="12%" align="right">Payable (Dibo)</TableTh>
              <TableTh width="12%" align="right">Net Balance</TableTh>
              <TableTh width="6%" align="center">Status</TableTh>
              <TableTh width="11%" align="right">Actions</TableTh>
            </TableHead>

            <TableBody>
              {paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center">
                    <EmptyState
                      title={
                        searchQuery || balanceFilter || statusFilter
                          ? t("No persons matching your filters")
                          : t("No persons registered yet")
                      }
                      description={
                        searchQuery || balanceFilter || statusFilter
                          ? t("Try clearing the search or filters to see all persons.")
                          : t("Click 'Add Person' above to record your first ledger person.")
                      }
                    />
                  </td>
                </tr>
              ) : (
                paginatedList.map((person, index) => {
                  const sl = (safeCurrentPage - 1) * pageSize + (index + 1);
                  const net = person.netBalance ?? 0;
                  const pabo = person.totalPabo ?? 0;
                  const dibo = person.totalDibo ?? 0;
                  const isActive = (person.status || "").toLowerCase() === "active";

                  return (
                    <tr
                      key={person.id}
                      className="hover:bg-[var(--primary-color-light)]/40 transition-colors group"
                    >
                      {/* SL */}
                      <td className="py-1 px-2.5 text-left text-xs font-normal text-[var(--ui-text)] truncate">
                        {sl}
                      </td>

                      {/* Person Name (Single line) */}
                      <td className="py-1 px-2.5 text-left font-medium text-xs text-[var(--ui-text)] truncate whitespace-nowrap">
                        <span className="font-semibold text-xs text-[var(--ui-text)] block truncate" title={person.name}>
                          {person.name}
                        </span>
                      </td>

                      {/* Contact Info (Phone - Single line) */}
                      <td className="py-1 px-2.5 text-left font-normal text-xs text-[var(--ui-text)] truncate whitespace-nowrap">
                        <span className="block truncate" title={person.phone}>
                          {person.phone || "-"}
                        </span>
                      </td>

                      {/* Address */}
                      <td className="py-1 px-2.5 text-left font-normal text-xs text-[var(--ui-text-muted)] truncate whitespace-nowrap">
                        <span className="block truncate" title={person.address || "-"}>
                          {person.address || "-"}
                        </span>
                      </td>

                      {/* Receivable (Pabo) */}
                      <td className="py-1 px-2 text-right font-normal text-xs text-[var(--ui-success)] whitespace-nowrap">
                        ৳{pabo.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>

                      {/* Payable (Dibo) */}
                      <td className="py-1 px-2 text-right font-normal text-xs text-[var(--ui-danger)] whitespace-nowrap">
                        ৳{dibo.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>

                      {/* Net Balance */}
                      <td className="py-1 px-2 text-right font-semibold text-xs whitespace-nowrap">
                        <span
                          className={
                            net > 0
                              ? "text-[var(--ui-success)]"
                              : net < 0
                              ? "text-[var(--ui-danger)]"
                              : "text-[var(--ui-text-muted)]"
                          }
                        >
                          {net < 0 ? "- " : ""}৳{Math.abs(net).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="py-1 px-1.5 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold border ${
                            isActive
                              ? "bg-[var(--ui-success-border)] text-[var(--ui-success-dark)] border-[var(--ui-success-border)]"
                              : "bg-[var(--ui-danger-border)] text-[var(--ui-danger-dark)] border-[var(--ui-danger-border)]"
                          }`}
                        >
                          {isActive ? t("Active") : t("Inactive")}
                        </span>
                      </td>

                      {/* Action Buttons matching PartyTable exactly */}
                      <td className="py-1 px-2 text-right whitespace-nowrap">
                        <TableActionButtons
                          onView={() => onViewLedger(person)}
                          viewTitle={t("View Ledger Statement")}
                          onEdit={canUpdate("khatabook") ? () => onEditPerson(person) : undefined}
                          editTitle={t("Edit Person")}
                          onDelete={canDelete("khatabook") ? () => onDeletePerson(person) : undefined}
                          deleteTitle={t("Delete Person")}
                          extraActions={
                            canCreate("khatabook") ? (
                              <button
                                type="button"
                                onClick={() => onAddTransaction(person)}
                                title={t("Record Transaction")}
                                className="p-1 rounded text-[var(--ui-success)] hover:bg-[var(--ui-success-border)] transition-colors cursor-pointer"
                              >
                                <FiPlus size={13.5} />
                              </button>
                            ) : undefined
                          }
                          className="justify-end flex-nowrap shrink-0 gap-1"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </TableScroll>

      {/* Pagination Footer matching PartyTable */}
      {!isLoading && totalItems > 0 && (
        <TablePaginationFooter
          totalCount={totalItems}
          pageCount={totalPages}
          currentPageNumber={safeCurrentPage}
          dataLimit={pageSize}
          setDataLimit={(limit) => {
            setPageSize(limit);
            setCurrentPage(1);
          }}
          setCurrentPageNumber={setCurrentPage}
          handlePagination={(d) => setCurrentPage(d.selected + 1)}
          entityLabel="persons"
          pageSizeOptions={[10, 20, 50, 100]}
        />
      )}
    </TableContainer>
  );
};

export default KhatabookTable;
