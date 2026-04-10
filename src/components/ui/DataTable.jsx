/**
 * components/ui/DataTable.jsx
 * Reusable data table dengan:
 * - Search bar terintegrasi
 * - Loading skeleton rows
 * - Empty state
 * - Client-side pagination
 * - Responsive (horizontal scroll pada mobile)
 * - Row click handler
 */
import { useState, useMemo } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Inbox,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import clsx from "clsx";

const PAGE_SIZES = [10, 25, 50, 100];

export default function DataTable({
  columns, // [{ key, header, render?, width?, align?, sortable? }]
  data = [], // raw data array
  isLoading = false,
  searchPlaceholder,
  searchKeys = [], // keys to search in client-side (e.g. ['name','email'])
  onRowClick,
  rowKey = "id",
  actions, // JSX — tombol aksi di header kanan (e.g. "Add" button)
  emptyLabel,
  pageSize: defaultPageSize = 25,
  serverSearch,
  hideSearch = false,
}) {
  const { t } = useTranslation();
  const [localSearch, setLocalSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(defaultPageSize);

  const searchValue = serverSearch ? serverSearch.value : localSearch;

  // Client-side filtering
  const filtered = useMemo(() => {
    if (serverSearch || !localSearch.trim() || searchKeys.length === 0)
      return data;
    const q = localSearch.toLowerCase();
    return data.filter((row) =>
      searchKeys.some((k) =>
        String(row[k] ?? "")
          .toLowerCase()
          .includes(q),
      ),
    );
  }, [data, localSearch, searchKeys, serverSearch]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, totalPages);
  const slice = filtered.slice((safePage - 1) * perPage, safePage * perPage);

  function handleSearch(val) {
    if (serverSearch) serverSearch.onChange(val);
    else {
      setLocalSearch(val);
      setPage(1);
    }
  }

  const skeletonRows = Array.from({ length: perPage > 10 ? 8 : perPage });

  return (
    <div className="space-y-3">
      {/* ── Toolbar ── */}
      {(!hideSearch || actions) && (
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          {/* 2. BUNGKUS KOTAK SEARCH DENGAN KONDISI INI */}
          {!hideSearch ? (
            <div className="relative flex-1 max-w-sm">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[--text-tertiary] pointer-events-none"
              />
              <input
                type="search"
                placeholder={searchPlaceholder || t("common.search") + "..."}
                value={searchValue}
                onChange={(e) => handleSearch(e.target.value)}
                className="input pl-10 py-2 text-sm w-full"
              />
            </div>
          ) : (
            // Spacer kosong jika search disembunyikan tapi actions ada
            <div className="flex-1" />
          )}

          {/* Actions slot */}
          {actions && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
      )}

      {/* ── Table ── */}
      <div className="table-wrapper">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    style={{ width: col.width }}
                    className={clsx(
                      col.align === "right" && "text-right",
                      col.align === "center" && "text-center",
                    )}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                skeletonRows.map((_, i) => (
                  <tr key={i}>
                    {columns.map((col) => (
                      <td key={col.key}>
                        <div
                          className="skeleton h-4 rounded"
                          style={{ width: col.skeletonWidth || "80%" }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : slice.length === 0 ? (
                <tr>
                  <td colSpan={columns.length}>
                    <div className="flex flex-col items-center justify-center py-14 gap-2">
                      <Inbox size={32} className="text-[--text-tertiary]" />
                      <p className="text-sm text-[--text-tertiary]">
                        {emptyLabel || t("common.noData")}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                slice.map((row, rowIdx) => (
                  <motion.tr
                    key={row[rowKey] ?? rowIdx}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: rowIdx * 0.025, duration: 0.2 }}
                    onClick={() => onRowClick?.(row)}
                    className={clsx(onRowClick && "cursor-pointer")}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={clsx(
                          col.align === "right" && "text-right",
                          col.align === "center" && "text-center",
                        )}
                      >
                        {col.render
                          ? col.render(row[col.key], row)
                          : (row[col.key] ?? "—")}
                      </td>
                    ))}
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Footer: pagination ── */}
      {!isLoading && filtered.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[--text-secondary] pt-1">
          {/* Rows info + per-page */}
          <div className="flex items-center gap-3">
            <span>
              {t("common.showingResults", {
                from: ((safePage - 1) * perPage + 1).toLocaleString(),
                to: Math.min(
                  safePage * perPage,
                  filtered.length,
                ).toLocaleString(),
                total: filtered.length.toLocaleString(),
              })}
            </span>
            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setPage(1);
              }}
              className="text-xs px-2 py-1 rounded-lg border border-[--border] bg-[--bg-surface] text-[--text-primary] outline-none focus:border-[--border-focus]"
            >
              {PAGE_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Page buttons */}
          <div className="flex items-center gap-1">
            <PaginationBtn
              onClick={() => setPage(1)}
              disabled={safePage === 1}
              icon={<ChevronsLeft size={14} />}
            />
            <PaginationBtn
              onClick={() => setPage((p) => p - 1)}
              disabled={safePage === 1}
              icon={<ChevronLeft size={14} />}
            />
            <span className="px-3 py-1 rounded-lg glass text-[--text-primary] font-medium text-xs">
              {safePage} / {totalPages}
            </span>
            <PaginationBtn
              onClick={() => setPage((p) => p + 1)}
              disabled={safePage === totalPages}
              icon={<ChevronRight size={14} />}
            />
            <PaginationBtn
              onClick={() => setPage(totalPages)}
              disabled={safePage === totalPages}
              icon={<ChevronsRight size={14} />}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function PaginationBtn({ onClick, disabled, icon }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150",
        disabled
          ? "text-[--text-tertiary] cursor-not-allowed opacity-40"
          : "text-[--text-secondary] hover:bg-[--bg-muted] hover:text-[--text-primary]",
      )}
    >
      {icon}
    </button>
  );
}
