/**
 * components/ui/EthnicitySelect.jsx
 * Dropdown searchable untuk memilih etnis.
 * Dipakai di: PatientFormPage, DiseaseFormPage
 */
import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Globe, Search, X, ChevronDown, Check } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { ethnicitiesApi } from "../../api/ethnicitiesApi";

export default function EthnicitySelect({
  value, // integer id atau null
  onChange, // (id: number|null) => void
  error,
  placeholder,
  clearable = true,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);
  const searchRef = useRef(null);

  const { data: list = [], isLoading } = useQuery({
    queryKey: ["ethnicities-dropdown"],
    queryFn: () => ethnicitiesApi.listEthnicities({ limit: 1000 }),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50);
  }, [open]);

  const filtered = list.filter((e) => {
    const q = search.toLowerCase();
    return (
      e.name?.toLowerCase().includes(q) ||
      e.region_distribution?.toLowerCase().includes(q)
    );
  });

  const selected = list.find((e) => e.id === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          "input flex items-center gap-2 text-left w-full pr-9 cursor-pointer",
          error && "input-error",
          open &&
            "border-[--border-focus] shadow-[0_0_0_3px_rgba(0,191,191,0.12)]",
        )}
      >
        <Globe size={15} className="text-[--text-tertiary] flex-shrink-0" />
        {selected ? (
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-[--text-primary] block truncate">
              {selected.name}
            </span>
            {selected.region_distribution && (
              <span className="text-xs text-[--text-tertiary] truncate block">
                {selected.region_distribution}
              </span>
            )}
          </div>
        ) : (
          <span className="text-sm text-[--text-tertiary] flex-1">
            {placeholder || "Pilih etnis..."}
          </span>
        )}
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {clearable && selected && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
              className="w-5 h-5 rounded flex items-center justify-center text-[--text-tertiary] hover:text-danger-500 cursor-pointer"
            >
              <X size={13} />
            </span>
          )}
          <ChevronDown
            size={15}
            className={clsx(
              "text-[--text-tertiary] transition-transform duration-200",
              open && "rotate-180",
            )}
          />
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-1.5 z-50 glass rounded-xl shadow-glass-md overflow-hidden"
          >
            <div className="p-2 border-b border-[--border]">
              <div className="relative">
                <Search
                  size={13}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[--text-tertiary] pointer-events-none"
                />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Cari nama etnis atau wilayah..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-7 pr-3 py-1.5 text-sm bg-[--bg-subtle] border border-[--border]
                    rounded-lg outline-none focus:border-[--border-focus] text-[--text-primary]
                    placeholder:text-[--text-tertiary]"
                />
              </div>
            </div>
            <div className="max-h-56 overflow-y-auto">
              {clearable && value && (
                <button
                  type="button"
                  onClick={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[--text-tertiary] hover:bg-danger-500/8 transition-colors"
                >
                  <X size={13} /> Hapus pilihan
                </button>
              )}
              {isLoading ? (
                <div className="px-4 py-6 text-center text-sm text-[--text-tertiary]">
                  Memuat...
                </div>
              ) : filtered.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-[--text-tertiary]">
                  {search
                    ? `Tidak ada etnis "${search}"`
                    : "Belum ada data etnis"}
                </div>
              ) : (
                filtered.map((eth) => (
                  <button
                    key={eth.id}
                    type="button"
                    onClick={() => {
                      onChange(eth.id);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={clsx(
                      "w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors",
                      eth.id === value
                        ? "bg-primary-500/10"
                        : "hover:bg-[--bg-muted]",
                    )}
                  >
                    <div className="w-7 h-7 rounded-lg bg-primary-500/15 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary-500">
                      {eth.name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[--text-primary]">
                        {eth.name}
                      </p>
                      {eth.region_distribution && (
                        <p className="text-xs text-[--text-tertiary] truncate">
                          {eth.region_distribution}
                        </p>
                      )}
                    </div>
                    {eth.id === value && (
                      <Check
                        size={14}
                        className="text-primary-500 flex-shrink-0"
                      />
                    )}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
