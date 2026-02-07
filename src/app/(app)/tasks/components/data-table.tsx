"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { DataTableToolbar } from "./data-table-toolbar";
import { DataTablePagination } from "./data-table-pagination";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  showAddTaskButton?: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  showAddTaskButton = true,
}: DataTableProps<TData, TValue>) {
  
  // ===========================================================================
  // 1. SCREEN TABLE ENGINE (Interactive, Newest First)
  // ===========================================================================
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "id", desc: true } // Default: Descending (T-003 -> T-001)
  ]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});

  const screenTable = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: { sorting, columnFilters, columnVisibility },
  });

  // ===========================================================================
  // 2. PRINT DATA PREPARATION (Ascending / T-001 First)
  // ===========================================================================
  const printRows = React.useMemo(() => {
    // Clone data and force sort by ID Ascending (T-001 < T-002)
    return [...data].sort((a: any, b: any) => {
        const idA = a.id || "";
        const idB = b.id || "";
        return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [data]);

  return (
    <div className="space-y-4">
      
      {/* ✅ FORCE CSS STYLE: Guarantees hiding/showing correctly */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .screen-view { display: none !important; }
          .print-view { display: block !important; }
          /* Optional: Force white background to save ink or keep clean */
          body { background-color: white; }
        }
        @media screen {
          .screen-view { display: block !important; }
          .print-view { display: none !important; }
        }
      `}} />

      {/* ======================= SCREEN VIEW (Interactive) ======================= */}
      <div className="screen-view space-y-4">
        <DataTableToolbar table={screenTable} showAddTaskButton={showAddTaskButton} />
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              {screenTable.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {screenTable.getRowModel().rows?.length ? (
                screenTable.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <DataTablePagination table={screenTable} />
      </div>

      {/* ======================= PRINT VIEW (Sorted Ascending) ======================= */}
      <div className="print-view">
        {/* We reuse the UI Table component but feed it the MANUAL sorted data */}
        <div className="rounded-md border border-black">
          <Table>
            <TableHeader>
              {screenTable.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="text-black font-bold border-b border-black">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {/* Manually loop through our PRE-SORTED printRows */}
              {printRows.map((row: any, rowIndex) => (
                  <TableRow key={rowIndex} className="border-b border-gray-300 break-inside-avoid">
                      {columns.map((col: any, colIndex) => {
                          const cellValue = col.accessorKey ? row[col.accessorKey] : null;

                          // RENDER LOGIC:
                          let content;
                          
                          // 1. Check for Custom Cell Renderer (e.g. Status Badges)
                          if (col.cell && typeof col.cell === 'function') {
                             // Create a fake context for the renderer
                             // This ensures your Badges/Avatars appear in print too!
                             const fakeContext = {
                                row: { original: row, getValue: (key: string) => row[key] },
                                getValue: () => cellValue
                             } as any;
                             content = flexRender(col.cell, fakeContext);
                          } 
                          // 2. Fallback to raw value
                          else {
                              // Handle specific objects if necessary
                              if (col.accessorKey === 'assignee' && typeof cellValue === 'object') {
                                  content = cellValue?.name || "Unassigned";
                              } else if ((col.accessorKey === 'dueDate' || col.accessorKey === 'receivedDate') && cellValue) {
                                  try {
                                      const d = new Date(cellValue);
                                      content = `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;
                                  } catch (e) { content = cellValue; }
                              } else {
                                  content = cellValue;
                              }
                          }

                          return (
                              <TableCell key={colIndex} className="text-black py-2">
                                  {content}
                              </TableCell>
                          );
                      })}
                  </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

    </div>
  );
}