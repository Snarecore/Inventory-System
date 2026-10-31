import React, { ReactNode } from "react";

export const TABLE_CLASSES = {
  container: "bg-[var(--ui-surface)] rounded-xl shadow-xs border border-[var(--ui-border)] flex flex-col relative z-20 overflow-visible",
  toolbar: "p-2 sm:p-2.5 border-b border-[var(--ui-border)] flex flex-wrap items-center justify-between gap-2 relative z-40 overflow-visible",
  scroll: "w-full overflow-x-auto relative z-10",
  table: "ui-table w-full text-left border-collapse text-xs",
  headerRow: "bg-[var(--table-header-bg,var(--primary-color))] text-[var(--table-header-text,var(--ui-on-accent,#ffffff))] text-xs font-semibold",
  headerCell: "py-2.5 px-3 text-[var(--table-header-text,var(--ui-on-accent,#ffffff))] text-xs font-semibold select-none",
  body: "divide-y divide-[var(--ui-border)] bg-[var(--ui-surface)]",
  row: "hover:bg-[var(--primary-color-light)]/40 transition-colors group",
  cell: "py-2.5 px-3 text-[var(--ui-text)] text-xs font-normal",
} as const;

// 1. TableContainer (Outer card wrapper)

export interface TableContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

export const TableContainer: React.FC<TableContainerProps> = ({
  children,
  className = "",
  ...props
}) => {
  return (
    <div
      className={`${TABLE_CLASSES.container} ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
};

// 2. TableToolbar (Filters / Search row)

export interface TableToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

export const TableToolbar: React.FC<TableToolbarProps> = ({
  children,
  className = "",
  ...props
}) => {
  return (
    <div
      className={`${TABLE_CLASSES.toolbar} ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
};

// 3. TableScroll (Overflow horizontal scroll wrapper)

export interface TableScrollProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

export const TableScroll: React.FC<TableScrollProps> = ({
  children,
  className = "",
  ...props
}) => {
  return (
    <div
      className={`${TABLE_CLASSES.scroll} ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
};

// 4. Table (Main <table> element)

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  children: ReactNode;
  className?: string;
  minWidth?: string | number;
}

export const TableComponent: React.FC<TableProps> = ({
  children,
  className = "",
  minWidth,
  style,
  ...props
}) => {
  const customStyle = minWidth ? { minWidth, ...style } : style;
  return (
    <table
      className={`${TABLE_CLASSES.table} ${className}`.trim()}
      style={customStyle}
      {...props}
    >
      {children}
    </table>
  );
};

// 5. TableHead / THead

export interface TableHeadProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: ReactNode;
  className?: string;
  rowClassName?: string;
}

export const TableHead: React.FC<TableHeadProps> = ({
  children,
  className = "",
  rowClassName = "",
  ...props
}) => {
  return (
    <thead className={className} {...props}>
      <tr className={`${TABLE_CLASSES.headerRow} ${rowClassName}`.trim()}>
        {children}
      </tr>
    </thead>
  );
};

// 6. TableTh / Th (Header Cell)

export interface TableThProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  children?: ReactNode;
  className?: string;
  align?: "left" | "center" | "right";
  width?: string | number;
}

export const TableTh: React.FC<TableThProps> = ({
  children,
  className = "",
  align = "left",
  width,
  style,
  ...props
}) => {
  const alignClass =
    align === "center"
      ? "text-center"
      : align === "right"
      ? "text-right"
      : "text-left";

  const customStyle = width ? { width, ...style } : style;

  return (
    <th
      className={`${TABLE_CLASSES.headerCell} ${alignClass} ${className}`.trim()}
      style={customStyle}
      {...props}
    >
      {children}
    </th>
  );
};

// 7. TableBody / TBody

export interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: ReactNode;
  className?: string;
}

export const TableBody: React.FC<TableBodyProps> = ({
  children,
  className = "",
  ...props
}) => {
  return (
    <tbody className={`${TABLE_CLASSES.body} ${className}`.trim()} {...props}>
      {children}
    </tbody>
  );
};

// 8. TableRow / Tr

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: ReactNode;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLTableRowElement>;
}

export const TableRow: React.FC<TableRowProps> = ({
  children,
  className = "",
  ...props
}) => {
  return (
    <tr className={`${TABLE_CLASSES.row} ${className}`.trim()} {...props}>
      {children}
    </tr>
  );
};

// 9. TableCell / Td

export interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  children?: ReactNode;
  className?: string;
  align?: "left" | "center" | "right";
}

export const TableCell: React.FC<TableCellProps> = ({
  children,
  className = "",
  align = "left",
  ...props
}) => {
  const alignClass =
    align === "center"
      ? "text-center"
      : align === "right"
      ? "text-right"
      : "text-left";

  return (
    <td
      className={`${TABLE_CLASSES.cell} ${alignClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </td>
  );
};

// Aliases for convenience
export const THead = TableHead;
export const Th = TableTh;
export const TBody = TableBody;
export const Tr = TableRow;
export const Td = TableCell;
export const TableCard = TableContainer;

// Compound Component Export
export const Table = Object.assign(TableComponent, {
  Container: TableContainer,
  Card: TableContainer,
  Toolbar: TableToolbar,
  Scroll: TableScroll,
  Head: TableHead,
  Th: TableTh,
  Body: TableBody,
  Row: TableRow,
  Cell: TableCell,
  CLASSES: TABLE_CLASSES,
});

export default Table;
