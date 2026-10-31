import React from "react";
import {
    MdOutlineArrowBackIos,
    MdOutlineArrowForwardIos,
} from "react-icons/md";
import ReactPaginate from "react-paginate";

interface PaginationProps {
    pageCount: number;
    currentPageNumber?: number; // 1-indexed
    currentPage?: number; // 0 or 1 indexed fallback
    handlePagination?: (selectedItem: { selected: number }) => void;
    onPageChange?: (selectedItem: { selected: number }) => void;
}

const PaginateComponent: any = (ReactPaginate as any)?.default || ReactPaginate;

const Pagination: React.FC<PaginationProps> = ({
    pageCount,
    currentPageNumber,
    currentPage,
    handlePagination,
    onPageChange,
}) => {
    if (!pageCount || pageCount <= 1) return null;

    const activePage = currentPageNumber !== undefined 
        ? Math.max(0, currentPageNumber - 1) 
        : Math.max(0, currentPage ?? 0);
    
    const pageChangeHandler = handlePagination || onPageChange || (() => {});

    return (
        <PaginateComponent
            pageCount={Math.max(1, pageCount)}
            forcePage={activePage}
            onPageChange={pageChangeHandler}
            breakLabel="…"
            nextLabel={<MdOutlineArrowForwardIos size={14} aria-hidden />}
            previousLabel={<MdOutlineArrowBackIos size={14} aria-hidden />}
            pageRangeDisplayed={3}
            marginPagesDisplayed={1}
            renderOnZeroPageCount={null}
            containerClassName="flex items-center justify-center gap-1.5 list-none text-sm font-semibold"
            pageClassName="flex rounded-lg bg-[var(--ui-surface-sunken)] hover:bg-[var(--ui-border)] transition-colors"
            pageLinkClassName="w-8 h-8 flex items-center justify-center focus:outline-none cursor-pointer text-[var(--ui-text)] text-xs"
            activeClassName="!bg-[var(--primary-color)] text-white"
            activeLinkClassName="!text-white !font-bold"
            previousClassName="mr-1 rounded-lg flex items-center justify-center w-8 h-8 bg-[var(--ui-surface-sunken)] hover:bg-[var(--ui-border)] transition-colors"
            nextClassName="ml-1 rounded-lg flex items-center justify-center w-8 h-8 bg-[var(--ui-surface-sunken)] hover:bg-[var(--ui-border)] transition-colors"
            previousLinkClassName="w-full h-full flex items-center justify-center text-[var(--ui-text)] focus:outline-none cursor-pointer text-xs"
            nextLinkClassName="w-full h-full flex items-center justify-center text-[var(--ui-text)] focus:outline-none cursor-pointer text-xs"
            breakClassName="mx-1 text-[var(--ui-text-subtle)]"
            breakLinkClassName="px-1.5 py-1 text-xs"
        />
    );
};

export default Pagination;
