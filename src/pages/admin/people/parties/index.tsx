import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { FaPlus, FaUsers, FaUserTie, FaTruck, FaMoneyBillWave } from "react-icons/fa";
import { MotionDiv } from "@/utils/framer.motion";
import PageHeader from "@/components/page-header/PageHeader";
import Button from "@/components/button/Button";
import RefreshButton from "@/components/table-components/RefreshButton";
import PartyTable from "./components/PartyTable";
import PartyModal from "./components/PartyModal";
import PartyDetailsModal from "./components/PartyDetailsModal";
import apiConfig from "@/config/api.json";
import { partyListQueryKey } from "@/config/query-key";
import { buildAccessUser, withBranchScope } from "@/utils/access-user";
import { postData } from "@/services/api-service";
import { showErrorToast } from "@/utils/toast-utils";
import type { PartyItem, PartyType } from "@/types";
import { useDebounce } from "@/hooks/useDebounce";

const Parties: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const initialType = searchParams.get("type") || "";
  const [typeFilter, setTypeFilter] = useState<string>(initialType);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("latest");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const debouncedSearch = useDebounce(searchQuery, 250);

  const [dataLimit, setDataLimit] = useState<number>(10);
  const [currentPageNumber, setCurrentPageNumber] = useState<number>(1);

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPageNumber(1);
  };

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedPartyForEdit, setSelectedPartyForEdit] = useState<PartyItem | null>(null);
  const [selectedPartyForView, setSelectedPartyForView] = useState<PartyItem | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState<boolean>(false);
  const [defaultModalType, setDefaultModalType] = useState<PartyType>("CUSTOMER");

  // Sync with URL query parameter
  useEffect(() => {
    const urlType = searchParams.get("type") || "";
    setTypeFilter(urlType);
  }, [searchParams]);

  const partyListUrl = apiConfig.party.partyListUrl;

  // Fetch party list
  const {
    data: rawPartyData,
    isLoading,
    isFetching,
    refetch: refetchParties,
  } = useQuery({
    queryKey: [partyListQueryKey],
    queryFn: async () => {
      const response = await postData<any>({
        url: partyListUrl,
        body: { accessUser: buildAccessUser() },
      });
      return response;
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });

  // Extract all parties from backend response
  const allParties: PartyItem[] = useMemo(() => {
    if (!rawPartyData) return [];
    let list: any[] = [];
    if (Array.isArray(rawPartyData)) {
      list = rawPartyData;
    } else if (rawPartyData && typeof rawPartyData === "object") {
      const raw = rawPartyData as any;
      if (Array.isArray(raw.partyList)) list = raw.partyList;
      else if (Array.isArray(raw.partyInfoList)) list = raw.partyInfoList;
      else if (Array.isArray(raw.partiesList)) list = raw.partiesList;
      else if (Array.isArray(raw.partyListDetails)) list = raw.partyListDetails;
      else if (Array.isArray(raw.data)) list = raw.data;
      else if (Array.isArray(raw.customerList) || Array.isArray(raw.supplierList)) {
        list = [...(raw.customerList || []), ...(raw.supplierList || [])];
      } else if (raw.data && typeof raw.data === "object") {
        if (Array.isArray(raw.data.partyList)) list = raw.data.partyList;
        else if (Array.isArray(raw.data.partyInfoList)) list = raw.data.partyInfoList;
        else if (Array.isArray(raw.data.partiesList)) list = raw.data.partiesList;
        else if (Array.isArray(raw.data.data)) list = raw.data.data;
      } else {
        for (const key of Object.keys(raw)) {
          if (Array.isArray(raw[key])) {
            list = raw[key];
            break;
          }
        }
      }
    }

    return list
      .filter((p: any) => {
        if (!p || typeof p !== "object") return false;
        const isDel = String(p.isDeleted || p.is_deleted || "").trim().toUpperCase();
        return isDel !== "Y" && isDel !== "YES" && isDel !== "TRUE" && isDel !== "1";
      })
      .map((p: any) => {
        const id = p.id ?? p.partyId;
        const name = p.name || p.partyName || "";
        const phone = p.phone || p.partyPhone || "";
        const email = p.email || "";
        const address = p.address || p.partyAddress || "";
        const rawType = String(p.type || p.partyType || "CUSTOMER").toUpperCase();
        const type = rawType.includes("SUPPLIER") ? "SUPPLIER" : "CUSTOMER";
        const openingBalance = p.openingBalance ?? p.balance ?? 0;
        const balance = p.balance ?? p.openingBalance ?? 0;

        return {
          ...p,
          id,
          partyId: id,
          name,
          partyName: name,
          phone,
          partyPhone: phone,
          email,
          address,
          partyAddress: address,
          type,
          partyType: type,
          openingBalance,
          balance,
        };
      });
  }, [rawPartyData]);

  const isPartyActive = (p: PartyItem) => {
    const raw = String(p.status ?? "active").toLowerCase();
    return raw !== "inactive" && raw !== "false" && raw !== "0";
  };

  const getPartyType = (p: PartyItem): "CUSTOMER" | "SUPPLIER" => {
    const raw = String(p.type || "CUSTOMER").toUpperCase();
    return raw.includes("SUPPLIER") ? "SUPPLIER" : "CUSTOMER";
  };

  // Summary Metrics
  const metrics = useMemo(() => {
    let customerCount = 0;
    let supplierCount = 0;
    let totalOpeningBalance = 0;
    let activeCount = 0;

    allParties.forEach((p) => {
      const type = getPartyType(p);
      if (type === "SUPPLIER") supplierCount++;
      else customerCount++;

      if (isPartyActive(p)) activeCount++;

      const bal = Number(p.openingBalance ?? p.balance ?? 0);
      totalOpeningBalance += bal;
    });

    return {
      total: allParties.length,
      customerCount,
      supplierCount,
      activeCount,
      totalOpeningBalance,
    };
  }, [allParties]);

  // Filtered parties based on search, type, and status
  const filteredParties = useMemo(() => {
    return allParties.filter((party) => {
      // Search filter
      if (debouncedSearch.trim()) {
        const query = debouncedSearch.toLowerCase().trim();
        const name = (party.name || "").toLowerCase();
        const phone = (party.phone || "").toLowerCase();
        const email = (party.email || "").toLowerCase();
        const address = (party.address || "").toLowerCase();

        const matches =
          name.includes(query) ||
          phone.includes(query) ||
          email.includes(query) ||
          address.includes(query);

        if (!matches) return false;
      }

      // Type filter (CUSTOMER / SUPPLIER)
      if (typeFilter) {
        const type = getPartyType(party);
        if (type !== typeFilter.toUpperCase()) return false;
      }

      // Status filter (active / inactive)
      if (statusFilter && statusFilter !== "all") {
        const active = isPartyActive(party);
        if (statusFilter === "active" && !active) return false;
        if (statusFilter === "inactive" && active) return false;
      }

      return true;
    });
  }, [allParties, debouncedSearch, typeFilter, statusFilter]);

  // Sorted parties based on sortBy
  const sortedParties = useMemo(() => {
    const result = [...filteredParties];
    switch (sortBy) {
      case "amount_high_to_low":
        return result.sort((a, b) => {
          const balA = Number(a.openingBalance ?? a.balance ?? 0);
          const balB = Number(b.openingBalance ?? b.balance ?? 0);
          return balB - balA;
        });
      case "amount_low_to_high":
        return result.sort((a, b) => {
          const balA = Number(a.openingBalance ?? a.balance ?? 0);
          const balB = Number(b.openingBalance ?? b.balance ?? 0);
          return balA - balB;
        });
      case "name_a_to_z":
        return result.sort((a, b) => {
          const nameA = (a.name || "").toLowerCase();
          const nameB = (b.name || "").toLowerCase();
          return nameA.localeCompare(nameB);
        });
      case "name_z_to_a":
        return result.sort((a, b) => {
          const nameA = (a.name || "").toLowerCase();
          const nameB = (b.name || "").toLowerCase();
          return nameB.localeCompare(nameA);
        });
      case "latest":
      default: {
        const reversed = [...filteredParties].reverse();
        return reversed.sort((a, b) => {
          const timeA = new Date(a.createdAt || 0).getTime();
          const timeB = new Date(b.createdAt || 0).getTime();
          if (!isNaN(timeA) && !isNaN(timeB) && timeA > 0 && timeB > 0 && timeA !== timeB) {
            return timeB - timeA;
          }

          const rawIdA = a.id;
          const rawIdB = b.id;
          const numA = Number(String(rawIdA || '').replace(/\D/g, ''));
          const numB = Number(String(rawIdB || '').replace(/\D/g, ''));
          if (numA && numB && numA !== numB) {
            return numB - numA;
          }

          return 0;
        });
      }
    }
  }, [filteredParties, sortBy]);

  // Pagination calculation
  const pageCount = Math.max(1, Math.ceil(sortedParties.length / dataLimit));
  const start = (currentPageNumber - 1) * dataLimit;
  const paginatedParties = sortedParties.slice(start, start + dataLimit);

  const handlePagination = (paginationData: { selected: number }) => {
    setCurrentPageNumber(paginationData.selected + 1);
  };

  const handleRefresh = () => {
    setSearchQuery("");
    setTypeFilter("");
    setStatusFilter("");
    setSortBy("latest");
    setSearchParams({});
    setCurrentPageNumber(1);
    refetchParties();
  };

  const openCreateModal = (type: PartyType = "CUSTOMER") => {
    setSelectedPartyForEdit(null);
    setDefaultModalType(type);
    setIsModalOpen(true);
  };

  const openEditModal = (party: PartyItem) => {
    setSelectedPartyForEdit(party);
    setIsModalOpen(true);
  };

  const openViewModal = (party: PartyItem) => {
    setSelectedPartyForView(party);
    setIsViewModalOpen(true);
  };

  const handleModalSuccess = (savedParty?: PartyItem) => {
    if (!savedParty) return;

    const targetId = String(savedParty.id ?? savedParty.partyId ?? savedParty.phone ?? "").trim();
    if (!targetId) return;

    queryClient.setQueryData([partyListQueryKey], (oldData: any) => {
      if (!oldData) return oldData;

      const updateItem = (p: any) => {
        if (!p || typeof p !== "object") return p;
        const pId = String(p.id ?? p.partyId ?? p.party_id ?? p.phone ?? p.partyPhone ?? "").trim();
        return pId === targetId || (savedParty.phone && String(p.phone ?? p.partyPhone ?? "").trim() === String(savedParty.phone).trim())
          ? { ...p, ...savedParty, status: savedParty.status }
          : p;
      };

      const updateListDeep = (obj: any): any => {
        if (Array.isArray(obj)) return obj.map(updateItem);
        if (obj && typeof obj === "object") {
          const next: any = Array.isArray(obj) ? [] : { ...obj };
          for (const k of Object.keys(obj)) {
            if (Array.isArray(obj[k])) {
              next[k] = obj[k].map(updateItem);
            } else if (obj[k] && typeof obj[k] === "object") {
              next[k] = updateListDeep(obj[k]);
            }
          }
          return next;
        }
        return obj;
      };

      return updateListDeep(oldData);
    });
  };

  const handleTogglePartyStatus = async (party: PartyItem) => {
    const partyId = party.id ?? party.partyId;
    if (!partyId) return;

    const currentActive = isPartyActive(party);
    const nextStatus = currentActive ? "Inactive" : "Active";
    const updated = { ...party, status: nextStatus };

    // 1. Instantly update in-memory cache (0ms delay, zero network refetch)
    handleModalSuccess(updated);

    try {
      const payload = withBranchScope({
        ...party,
        id: partyId,
        partyId: partyId,
        name: party.name || party.partyName || "",
        partyName: party.name || party.partyName || "",
        phone: party.phone || party.partyPhone || "",
        partyPhone: party.phone || party.partyPhone || "",
        type: party.type || party.partyType || "CUSTOMER",
        partyType: party.type || party.partyType || "CUSTOMER",
        status: nextStatus,
      });

      const res = await postData<any>({
        url: apiConfig.party.updatePartyUrl,
        body: { accessUser: buildAccessUser(), ...payload },
      });

      if (!res || res.error || String(res?.status).toLowerCase() === "error") {
        showErrorToast(res?.msg || "Failed to update party status");
        handleModalSuccess({ ...party, status: currentActive ? "Active" : "Inactive" });
      }
    } catch {
      handleModalSuccess({ ...party, status: currentActive ? "Active" : "Inactive" });
    }
  };

  return (
    <div className="flex flex-col gap-2.5 px-3 py-2 sm:px-4 sm:py-2.5 max-w-[1600px] mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          headerTitle="Parties Management"
          headerDescription="Manage all customers and suppliers in a single unified system"
        />
        <div className="flex items-center gap-2">
          <RefreshButton onClick={handleRefresh} />
          <Button
            label="Add Party"
            onClick={() => openCreateModal(typeFilter === "SUPPLIER" ? "SUPPLIER" : "CUSTOMER")}
            color="#009fe3"
            hoverColor="#0085be"
            icon={<FaPlus className="text-white text-xs" />}
          />
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 w-full">
        {/* 1. Total Parties - Blue */}
        <MotionDiv delay={0.05}>
          <div className="p-3 rounded-xl border bg-[var(--primary-color-light)]/60 border-[var(--primary-color-muted)] hover:border-[var(--primary-color-muted)] flex items-center justify-between gap-2.5 transition-all shadow-xs h-full">
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-semibold text-[var(--ui-text)] tracking-wider truncate">
                Total Parties
              </span>
              <span className="text-base sm:text-lg font-bold truncate mt-0.5 text-[var(--primary-color)]">
                {metrics.total}
              </span>
            </div>
            <div className="p-2 rounded-lg shrink-0 bg-[var(--primary-color-muted)] text-[var(--primary-color)]">
              <FaUsers size={16} />
            </div>
          </div>
        </MotionDiv>

        {/* 2. Customers - Emerald */}
        <MotionDiv delay={0.1}>
          <div className="p-3 rounded-xl border bg-[var(--ui-success-light)]/60 border-[var(--ui-success-border)] hover:border-[var(--ui-success-border)] flex items-center justify-between gap-2.5 transition-all shadow-xs h-full">
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-semibold text-[var(--ui-text)] tracking-wider truncate">
                Customers
              </span>
              <span className="text-base sm:text-lg font-bold truncate mt-0.5 text-[var(--ui-success)]">
                {metrics.customerCount}
              </span>
            </div>
            <div className="p-2 rounded-lg shrink-0 bg-[var(--ui-success-border)] text-[var(--ui-success)]">
              <FaUserTie size={16} />
            </div>
          </div>
        </MotionDiv>

        {/* 3. Suppliers - Purple */}
        <MotionDiv delay={0.15}>
          <div className="p-3 rounded-xl border bg-[var(--ui-info-light)]/60 border-[var(--ui-info-border)] hover:border-[var(--ui-info-border)] flex items-center justify-between gap-2.5 transition-all shadow-xs h-full">
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-semibold text-[var(--ui-text)] tracking-wider truncate">
                Suppliers
              </span>
              <span className="text-base sm:text-lg font-bold truncate mt-0.5 text-[var(--ui-info)]">
                {metrics.supplierCount}
              </span>
            </div>
            <div className="p-2 rounded-lg shrink-0 bg-[var(--ui-info-border)] text-[var(--ui-info)]">
              <FaTruck size={16} />
            </div>
          </div>
        </MotionDiv>

        {/* 4. Total Opening Balance - Amber */}
        <MotionDiv delay={0.2}>
          <div className="p-3 rounded-xl border bg-[var(--ui-warning-light)]/60 border-[var(--ui-warning-border)] hover:border-[var(--ui-warning-border)] flex items-center justify-between gap-2.5 transition-all shadow-xs h-full">
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-semibold text-[var(--ui-text)] tracking-wider truncate">
                Total Balance
              </span>
              <span className="text-base sm:text-lg font-bold truncate mt-0.5 text-[var(--ui-warning)]">
                ৳ {metrics.totalOpeningBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="p-2 rounded-lg shrink-0 bg-[var(--ui-warning-border)] text-[var(--ui-warning)]">
              <FaMoneyBillWave size={16} />
            </div>
          </div>
        </MotionDiv>
      </div>

      {/* Party Table */}
      <PartyTable
        parties={paginatedParties}
        totalCount={filteredParties.length}
        isLoading={isLoading}
        isFetching={isFetching}
        pageCount={pageCount}
        currentPageNumber={currentPageNumber}
        setCurrentPageNumber={setCurrentPageNumber}
        dataLimit={dataLimit}
        setDataLimit={setDataLimit}
        handlePagination={handlePagination}
        searchQuery={searchQuery}
        setSearchQuery={handleSearchChange}
        typeFilter={typeFilter}
        setTypeFilter={(t) => {
          setTypeFilter(t);
          if (t) setSearchParams({ type: t });
          else setSearchParams({});
        }}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
        onEdit={openEditModal}
        onView={openViewModal}
        onRefresh={handleRefresh}
        onToggleStatus={handleTogglePartyStatus}
      />

      {/* Add / Edit Party Modal */}
      <PartyModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedPartyForEdit(null);
        }}
        partyData={selectedPartyForEdit}
        onSuccess={handleModalSuccess}
        defaultType={defaultModalType}
      />

      {/* View Party Details Modal */}
      <PartyDetailsModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedPartyForView(null);
        }}
        party={selectedPartyForView}
        onEdit={(party) => {
          setIsViewModalOpen(false);
          openEditModal(party);
        }}
      />
    </div>
  );
};

export default Parties;
