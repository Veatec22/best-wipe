import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type Row,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";

type Props = {
  columns: string[];
  rows: unknown[][];
  filterPlaceholder: string;
  emptyAfterFilterLabel: string;
};

type GridRow = unknown[];

export function DataGrid({ columns, rows, filterPlaceholder, emptyAfterFilterLabel }: Props) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [filters, setFilters] = useState<ColumnFiltersState>([]);

  const tableColumns = useMemo<ColumnDef<GridRow>[]>(
    () =>
      columns.map((name, idx) => ({
        id: name,
        header: name,
        accessorFn: (row: GridRow) => row[idx],
        sortingFn: cellSortingFn,
        sortUndefined: "last",
        filterFn: cellFilterFn,
      })),
    [columns],
  );

  const table = useReactTable({
    data: rows,
    columns: tableColumns,
    state: { sorting, columnFilters: filters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const visibleRows = table.getRowModel().rows;

  return (
    <table className="df-result-table">
      <thead>
        <tr>
          {table.getFlatHeaders().map(header => {
            const sort = header.column.getIsSorted();
            return (
              <th
                key={header.id}
                aria-sort={sort === "asc" ? "ascending" : sort === "desc" ? "descending" : "none"}
              >
                <button
                  type="button"
                  className="df-result-th-btn"
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <span className="df-result-th-label">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </span>
                  <span className="df-result-th-sort" aria-hidden="true">
                    {sort === "asc" ? "▲" : sort === "desc" ? "▼" : "·"}
                  </span>
                </button>
              </th>
            );
          })}
        </tr>
        <tr className="df-result-filter-row">
          {table.getFlatHeaders().map(header => (
            <th key={`f-${header.id}`}>
              <input
                type="text"
                className="df-result-filter-input"
                placeholder={filterPlaceholder}
                value={(header.column.getFilterValue() as string | undefined) ?? ""}
                onChange={e => header.column.setFilterValue(e.target.value)}
              />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {visibleRows.length === 0 ? (
          <tr>
            <td className="df-result-empty-cell" colSpan={columns.length}>
              {emptyAfterFilterLabel}
            </td>
          </tr>
        ) : (
          visibleRows.map(row => (
            <tr key={row.id}>
              {row.getVisibleCells().map(cell => (
                <td key={cell.id}>{renderCell(cell.getValue())}</td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

function cellSortingFn(a: Row<GridRow>, b: Row<GridRow>, columnId: string): number {
  const av = a.getValue(columnId);
  const bv = b.getValue(columnId);
  if (av == null && bv == null) return 0;
  if (av == null) return 1;
  if (bv == null) return -1;
  if (typeof av === "number" && typeof bv === "number") return av - bv;
  if (typeof av === "boolean" && typeof bv === "boolean") {
    return av === bv ? 0 : av ? 1 : -1;
  }
  return String(av).localeCompare(String(bv), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function cellFilterFn(row: Row<GridRow>, columnId: string, filterValue: string): boolean {
  const needle = filterValue.trim().toLowerCase();
  if (!needle) return true;
  const value = row.getValue(columnId);
  if (value == null) return "null".includes(needle);
  return String(value).toLowerCase().includes(needle);
}

function renderCell(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}
