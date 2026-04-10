/**
 * components/ui/PatientSelect.jsx
 * Dropdown searchable untuk memilih pasien.
 * - Fetch daftar pasien dari API saat dibuka
 * - Bisa search by nama / NIK
 * - Tampilkan nama + NIK di option
 * - Bisa di-clear (set ke null)
 */
import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, Search, X, ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { patientsApi } from "../../api/patientsApi";

export default function PatientSelect({ value, onChange, error, placeholder }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);
  const searchRef = useRef(null);

  // Fetch semua pasien (limit besar, cukup untuk dropdown)
  const { data: patients = [], isLoading } = useQuery({
    queryKey: ["patients-dropdown"],
    queryFn: () => patientsApi.listPatients({ limit: 1000 }),
    staleTime: 5 * 60 * 1000,
  });

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Focus search input saat dropdown terbuka
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50);
  }, [open]);

  // Filter pasien berdasarkan search
  const filtered = patients.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.full_name?.toLowerCase().includes(q) ||
      p.nik?.toLowerCase().includes(q) ||
      p.address_city?.toLowerCase().includes(q)
    );
  });

  // Pasien yang sedang dipilih
  const selected = patients.find((p) => p.id === value);

  function handleSelect(patient) {
    onChange(patient.id);
    setOpen(false);
    setSearch("");
  }

  function handleClear(e) {
    e.stopPropagation();
    onChange(null);
  }

  return (
    <div ref={ref} className="relative">
      {/* Trigger button */}
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
        <Users size={15} className="text-[--text-tertiary] flex-shrink-0" />
        {selected ? (
          <div className="flex-1 min-w-0">
            <span className="text-sm text-[--text-primary] font-medium truncate block">
              {selected.full_name}
            </span>
            <span className="text-xs text-[--text-tertiary] font-mono">
              NIK: {selected.nik}
            </span>
          </div>
        ) : (
          <span className="text-sm text-[--text-tertiary] flex-1">
            {placeholder || "Pilih pasien..."}
          </span>
        )}

        {/* Clear & chevron */}
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {selected && (
            <span
              onClick={handleClear}
              className="w-5 h-5 rounded flex items-center justify-center text-[--text-tertiary] hover:text-danger-500 hover:bg-danger-500/10 transition-colors cursor-pointer"
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

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-1.5 z-50 glass rounded-xl shadow-glass-md overflow-hidden"
          >
            {/* Search dalam dropdown */}
            <div className="p-2 border-b border-[--border]">
              <div className="relative">
                <Search
                  size={13}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[--text-tertiary] pointer-events-none"
                />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Cari nama atau NIK..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-7 pr-3 py-1.5 text-sm bg-[--bg-subtle] border border-[--border] rounded-lg outline-none focus:border-[--border-focus] text-[--text-primary] placeholder:text-[--text-tertiary]"
                />
              </div>
            </div>

            {/* Opsi "Tidak ada pasien" */}
            <div className="max-h-56 overflow-y-auto">
              {/* Opsi kosongkan pilihan */}
              {value && (
                <button
                  type="button"
                  onClick={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-[--text-tertiary] hover:bg-danger-500/8 transition-colors"
                >
                  <X size={13} />
                  Hapus pilihan
                </button>
              )}

              {isLoading ? (
                <div className="px-4 py-6 text-center text-sm text-[--text-tertiary]">
                  Memuat daftar pasien...
                </div>
              ) : filtered.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-[--text-tertiary]">
                  {search
                    ? `Tidak ada pasien "${search}"`
                    : "Belum ada data pasien"}
                </div>
              ) : (
                filtered.slice(0, 50).map((patient) => (
                  <button
                    key={patient.id}
                    type="button"
                    onClick={() => handleSelect(patient)}
                    className={clsx(
                      "w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors",
                      patient.id === value
                        ? "bg-primary-500/10"
                        : "hover:bg-[--bg-muted]",
                    )}
                  >
                    {/* Avatar inisial */}
                    <div className="w-7 h-7 rounded-lg bg-primary-500/15 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary-500">
                      {patient.full_name?.charAt(0).toUpperCase() || "?"}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[--text-primary] truncate">
                        {patient.full_name}
                      </p>
                      <p className="text-xs text-[--text-tertiary] font-mono">
                        NIK: {patient.nik}
                        {patient.address_city && ` · ${patient.address_city}`}
                      </p>
                    </div>

                    {patient.id === value && (
                      <Check
                        size={14}
                        className="text-primary-500 flex-shrink-0"
                      />
                    )}
                  </button>
                ))
              )}

              {filtered.length > 50 && (
                <p className="px-4 py-2 text-xs text-[--text-tertiary] text-center border-t border-[--border]">
                  Ketik untuk mempersempit hasil ({filtered.length} pasien
                  ditemukan)
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
