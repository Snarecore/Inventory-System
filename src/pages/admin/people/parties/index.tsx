import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { FaPlus } from "react-icons/fa";
import PageHeader from "@/components/page-header/PageHeader";
import Button from "@/components/button/Button";
import RefreshButton from "@/components/table-components/RefreshButton";
import PartyTable from "./components/PartyTable";
import PartyModal from "./components/PartyModal";
import PartyDetailsModal from "./components/PartyDetailsModal";
import apiConfig from "@/config/api.json";
import { partyListQueryKey } from "@/config/query-key";
import { buildAccessUser } from "@/utils/access-user";
import { postData } from "@/services/api-service";
import type { PartyItem, PartyType } from "@/types";

const Parties: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const initialType = searchParams.get("type") || "";
  const [typeFilter, setTypeFilter] = useState<string>(initialType);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("latest");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

  const [dataLimit, setDataLimit] = useState<number>(10);
  const [currentPageNumber, setCurrentPageNumber] = useState<number>(1);

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

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPageNumber(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const partyListUrl = apiConfig.party?.partyListUrl || "get-party-info-list";

  // POST /get-party-info-list
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
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
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

    return list.filter((p: any) => {
      if (!p || typeof p !== "object") return false;
      const isDel = String(p.isDeleted || p.is_deleted || p.isDelete || p.is_delete || "").trim().toUpperCase();
      return isDel !== "Y" && isDel !== "YES" && isDel !== "TRUE" && isDel !== "1";
    });
  }, [rawPartyData]);

  const isPartyActive = (p: PartyItem) => {
    const raw = String(p.status ?? "active").toLowerCase();
    return raw !== "inactive" && raw !== "false" && raw !== "0";
  };

  const getPartyType = (p: PartyItem): "CUSTOMER" | "SUPPLIER" => {
    const raw = (p.type || p.partyType || p.party_type || p.party_type_name || "CUSTOMER").toUpperCase();
    return raw.includes("SUPPLIER") ? "SUPPLIER" : "CUSTOMER";
  };

  // Filtered parties based on search, type, and status
  const filteredParties = useMemo(() => {
    return allParties.filter((party) => {
      // Search filter
      if (debouncedSearch.trim()) {
        const query = debouncedSearch.toLowerCase().trim();
        const name = (party.name || party.partyName || party.party_name || "").toLowerCase();
        const phone = (party.phone || party.partyPhone || party.phoneNumber || party.party_phone || "").toLowerCase();
        const email = (party.email || party.partyEmail || "").toLowerCase();
        const address = (party.address || party.partyAddress || "").toLowerCase();

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
      if (statusFilter) {
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
          const balA = Number(a.openingBalance ?? a.opening_balance ?? a.balance ?? a.dueAmount ?? a.due_amount ?? 0);
          const balB = Number(b.openingBalance ?? b.opening_balance ?? b.balance ?? b.dueAmount ?? b.due_amount ?? 0);
          return balB - balA;
        });
      case "amount_low_to_high":
        return result.sort((a, b) => {
          const balA = Number(a.openingBalance ?? a.opening_balance ?? a.balance ?? a.dueAmount ?? a.due_amount ?? 0);
          const balB = Number(b.openingBalance ?? b.opening_balance ?? b.balance ?? b.dueAmount ?? b.due_amount ?? 0);
          return balA - balB;
        });
      case "name_a_to_z":
        return result.sort((a, b) => {
          const nameA = (a.name || a.partyName || a.party_name || "").toLowerCase();
          const nameB = (b.name || b.partyName || b.party_name || "").toLowerCase();
          return nameA.localeCompare(nameB);
        });
      case "name_z_to_a":
        return result.sort((a, b) => {
          const nameA = (a.name || a.partyName || a.party_name || "").toLowerCase();
          const nameB = (b.name || b.partyName || b.party_name || "").toLowerCase();
          return nameB.localeCompare(nameA);
        });
      case "latest":
      default: {
        const reversed = [...filteredParties].reverse();
        return reversed.sort((a, b) => {
          const timeA = new Date(a.createdAt || (a as any).created_at || (a as any).createdAtTime || (a as any).updatedAt || (a as any).updated_at || (a as any).date || 0).getTime();
          const timeB = new Date(b.createdAt || (b as any).created_at || (b as any).createdAtTime || (b as any).updatedAt || (b as any).updated_at || (b as any).date || 0).getTime();
          if (!isNaN(timeA) && !isNaN(timeB) && timeA > 0 && timeB > 0 && timeA !== timeB) {
            return timeB - timeA;
          }

          const rawIdA = a.id ?? (a as any).party_id ?? (a as any).partyId ?? (a as any).code ?? (a as any).partyCode;
          const rawIdB = b.id ?? (b as any).party_id ?? (b as any).partyId ?? (b as any).code ?? (b as any).partyCode;
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
  const paginatedParties = useMemo(() => {
    const start = (currentPageNumber - 1) * dataLimit;
    return sortedParties.slice(start, start + dataLimit);
  }, [sortedParties, currentPageNumber, dataLimit]);

  const handlePagination = (paginationData: { selected: number }) => {
    setCurrentPageNumber(paginationData.selected + 1);
  };

  const handleRefresh = () => {
    setSearchQuery("");
    setDebouncedSearch("");
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

  const handleModalSuccess = async (savedParty?: PartyItem) => {
    if (savedParty) {
      queryClient.setQueryData([partyListQueryKey], (oldData: any) => {
        if (!oldData) {
          return { status: "Success", partyList: [savedParty] };
        }
        if (Array.isArray(oldData)) {
          const exists = oldData.some(
            (p: any) =>
              (savedParty.id && (p.id === savedParty.id || p.partyId === savedParty.id)) ||
              (savedParty.phone && (p.phone === savedParty.phone || p.partyPhone === savedParty.phone))
          );
          return exists
            ? oldData.map((p: any) =>
                (savedParty.id && (p.id === savedParty.id || p.partyId === savedParty.id)) ||
                (savedParty.phone && (p.phone === savedParty.phone || p.partyPhone === savedParty.phone))
                  ? { ...p, ...savedParty }
                  : p
              )
            : [savedParty, ...oldData];
        }
        if (oldData && typeof oldData === "object") {
          const listKey = Array.isArray(oldData.partyList)
            ? "partyList"
            : Array.isArray(oldData.partyInfoList)
            ? "partyInfoList"
            : Array.isArray(oldData.partiesList)
            ? "partiesList"
            : Array.isArray(oldData.data)
            ? "data"
            : "partyList";

          const currentList = Array.isArray(oldData[listKey]) ? oldData[listKey] : [];
          const exists = currentList.some(
            (p: any) =>
              (savedParty.id && (p.id === savedParty.id || p.partyId === savedParty.id)) ||
              (savedParty.phone && (p.phone === savedParty.phone || p.partyPhone === savedParty.phone))
          );
          const updatedList = exists
            ? currentList.map((p: any) =>
                (savedParty.id && (p.id === savedParty.id || p.partyId === savedParty.id)) ||
                (savedParty.phone && (p.phone === savedParty.phone || p.partyPhone === savedParty.phone))
                  ? { ...p, ...savedParty }
                  : p
              )
            : [savedParty, ...currentList];

          return {
            ...oldData,
            [listKey]: updatedList,
          };
        }
        return oldData;
      });
    }

    await queryClient.invalidateQueries({ queryKey: [partyListQueryKey] });
    await queryClient.refetchQueries({ queryKey: [partyListQueryKey] });
    refetchParties();
  };

  return (
    <div className="flex flex-col gap-3 px-4 py-2.5 sm:px-5 sm:py-3 max-w-[1600px] mx-auto w-full">
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
        setSearchQuery={setSearchQuery}
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
