/**
 * pages/genetics/SequenceFormPage.jsx
 *
 * Revisi:
 * 1. Upload file FASTA → otomatis parse dan isi sequence_data
 * 2. Patient ID → dropdown searchable (bukan input angka)
 * 3. rna_type → dropdown dengan pilihan umum + penjelasan singkat
 * 4. protein_functions → dynamic list (tambah/hapus baris)
 * 5. length → tetap otomatis dari sequence_data (tidak bisa diubah manual)
 * 6. status_processed → tidak ditampilkan ke user
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Dna,
  Save,
  Info,
  AlertCircle,
  Hash,
  Loader2,
  Upload,
  FileText,
  X,
  Plus,
  Trash2,
} from "lucide-react";
import clsx from "clsx";

import { geneticsApi } from "../../api/geneticsApi";
import {
  FormField,
  Input,
  Textarea,
  Select,
  FormRow,
} from "../../components/ui/FormField";
import PatientSelect from "../../components/ui/PatientSelect";

// ─── Nilai awal ───────────────────────────────────────────────────────────────
const EMPTY = {
  name: "",
  accession_id: "",
  sequence_data: "",
  seq_type: "DNA",
  chromosome: "",
  gene_symbol: "",
  full_name: "",
  gene_type: "",
  start_position: "",
  end_position: "",
  strand: "",
  rna_type: "",
  protein_name: "",
  molecular_weight: "",
  description: "",
  patient_id: null,
};

// Satu baris protein function kosong
const EMPTY_PF = {
  pf_code: "",
  term: "",
  evidence_code: "",
  go_term: "",
  function_term: "",
};

// Pilihan rna_type dengan penjelasan
const RNA_TYPES = [
  {
    value: "mRNA",
    label: "mRNA — Messenger RNA",
    desc: "Dibaca ribosom untuk sintesis protein",
  },
  {
    value: "tRNA",
    label: "tRNA — Transfer RNA",
    desc: "Membawa asam amino ke ribosom",
  },
  {
    value: "rRNA",
    label: "rRNA — Ribosomal RNA",
    desc: "Komponen struktural ribosom",
  },
  {
    value: "miRNA",
    label: "miRNA — Micro RNA",
    desc: "Regulasi ekspresi gen (post-transkripsi)",
  },
  {
    value: "lncRNA",
    label: "lncRNA — Long non-coding RNA",
    desc: "RNA non-coding panjang, fungsi regulasi",
  },
  {
    value: "siRNA",
    label: "siRNA — Small interfering RNA",
    desc: "Silencing gen via RNA interference",
  },
  {
    value: "snRNA",
    label: "snRNA — Small nuclear RNA",
    desc: "Splicing pre-mRNA di nukleus",
  },
  {
    value: "snoRNA",
    label: "snoRNA — Small nucleolar RNA",
    desc: "Modifikasi rRNA",
  },
  {
    value: "circRNA",
    label: "circRNA — Circular RNA",
    desc: "RNA melingkar, fungsi sponge miRNA",
  },
  { value: "other", label: "Lainnya", desc: "" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const calcLength = (raw) => raw.replace(/\s/g, "").length;

// Baca file teks
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error("Gagal membaca file"));
    reader.readAsText(file);
  });
}

// Parse konten FASTA → ambil sequence terbaik (gabung semua baris non-header)
function parseFasta(content) {
  const lines = content.split(/\r?\n/);
  const entries = [];
  let current = null;

  for (const line of lines) {
    if (line.startsWith(">")) {
      if (current) entries.push(current);
      current = { header: line.slice(1).trim(), sequence: "" };
    } else if (current) {
      current.sequence += line.replace(/\s/g, "");
    }
  }
  if (current) entries.push(current);
  return entries;
}

// Detect tipe sekuens dari konten
function detectSeqType(sequence) {
  const clean = sequence.toUpperCase().replace(/[^A-Z]/g, "");
  if (!clean) return "DNA";
  const dnaChars = /^[ATCGNRYSWKMBDHV]+$/.test(clean);
  const rnaChars = /^[AUCGNRYSWKMBDHV]+$/.test(clean);
  const hasU = clean.includes("U");
  const hasProtChars = /[EFILPQZ]/.test(clean);

  if (hasProtChars) return "PROTEIN";
  if (hasU || rnaChars) return "RNA";
  return "DNA";
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function FormSection({ title, subtitle, children, badge }) {
  return (
    <div className="glass rounded-2xl p-6 space-y-4">
      <div className="border-b border-[--border] pb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-bold text-[--text-primary] flex items-center gap-2">
            {title}
            {badge && (
              <span className="badge badge-primary text-[10px]">{badge}</span>
            )}
          </h2>
          {subtitle && (
            <p className="text-xs text-[--text-secondary] mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

// ─── Upload File FASTA ────────────────────────────────────────────────────────
function FastaUploader({ onParsed, currentSeqType }) {
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [entries, setEntries] = useState([]); // jika multi-entry, tampilkan pilihan
  const [fileName, setFileName] = useState("");
  const inputRef = useRef(null);

  const ACCEPTED = ".fasta,.fa,.fna,.ffn,.faa,.frn,.fas,.txt";

  async function handleFile(file) {
    if (!file) return;
    setFileName(file.name);
    setParsing(true);
    try {
      const text = await readFileAsText(file);
      const parsed = parseFasta(text);

      if (!parsed.length) {
        toast.error("File tidak mengandung sekuens FASTA yang valid");
        return;
      }

      if (parsed.length === 1) {
        // Langsung apply
        applyEntry(parsed[0]);
      } else {
        // Lebih dari 1 entry → tampilkan pilihan
        setEntries(parsed);
      }
    } catch (err) {
      toast.error(err.message || "Gagal membaca file");
    } finally {
      setParsing(false);
    }
  }

  function applyEntry(entry) {
    const detectedType = detectSeqType(entry.sequence);
    onParsed({
      sequence: entry.sequence,
      seqType: detectedType,
      // Coba ambil accession_id dari header (format: >accession description)
      accessionId: entry.header.split(/\s/)[0] || "",
      headerFull: entry.header,
    });
    setEntries([]);
    toast.success(
      `Sekuens berhasil dimuat (${entry.sequence.length.toLocaleString()} bp)`,
    );
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      {!entries.length && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFile(e.dataTransfer.files[0]);
          }}
          onClick={() => inputRef.current?.click()}
          className={clsx(
            "flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 border-dashed cursor-pointer",
            "transition-all duration-200",
            dragging
              ? "border-primary-500 bg-primary-500/10"
              : "border-[--border-hover] hover:border-primary-500/50 hover:bg-primary-500/5",
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED}
            className="hidden"
            onChange={(e) => handleFile(e.target.files[0])}
          />

          {parsing ? (
            <Loader2
              size={20}
              className="text-primary-500 animate-spin flex-shrink-0"
            />
          ) : (
            <Upload
              size={20}
              className={clsx(
                "flex-shrink-0 transition-colors",
                dragging ? "text-primary-500" : "text-[--text-tertiary]",
              )}
            />
          )}

          <div className="min-w-0">
            {parsing ? (
              <p className="text-sm text-[--text-secondary]">Membaca file...</p>
            ) : fileName ? (
              <>
                <p className="text-sm font-medium text-[--text-primary] truncate">
                  {fileName}
                </p>
                <p className="text-xs text-[--text-tertiary]">
                  Klik untuk ganti file
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-[--text-primary]">
                  Upload file FASTA
                </p>
                <p className="text-xs text-[--text-tertiary]">
                  .fasta .fa .fna .ffn .faa .frn .fas .txt · Drag & drop atau
                  klik
                </p>
              </>
            )}
          </div>

          {fileName && !parsing && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFileName("");
                setEntries([]);
              }}
              className="ml-auto w-6 h-6 rounded-lg flex items-center justify-center text-[--text-tertiary] hover:text-danger-500 hover:bg-danger-500/10 transition-colors flex-shrink-0"
            >
              <X size={13} />
            </button>
          )}
        </div>
      )}

      {/* Pilih entry jika multi-sequence FASTA */}
      <AnimatePresence>
        {entries.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border border-primary-500/30 bg-primary-500/5 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-primary-500/15 flex items-center justify-between">
              <p className="text-sm font-semibold text-[--text-primary]">
                File berisi {entries.length} sekuens — pilih satu:
              </p>
              <button
                type="button"
                onClick={() => {
                  setEntries([]);
                  setFileName("");
                }}
                className="text-xs text-[--text-tertiary] hover:text-[--text-primary]"
              >
                Batal
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto divide-y divide-[--border]">
              {entries.map((entry, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => applyEntry(entry)}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-primary-500/8 transition-colors"
                >
                  <FileText
                    size={15}
                    className="text-primary-500 flex-shrink-0 mt-0.5"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[--text-primary] truncate">
                      {entry.header}
                    </p>
                    <p className="text-xs text-[--text-tertiary] font-mono">
                      {entry.sequence.length.toLocaleString()} bp ·{" "}
                      {detectSeqType(entry.sequence)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Sequence Stats ───────────────────────────────────────────────────────────
function SequenceStats({ sequence, seqType }) {
  const clean = sequence.replace(/\s/g, "").toUpperCase();
  const len = clean.length;
  if (!len) return null;

  const counts = [...clean].reduce((acc, ch) => {
    acc[ch] = (acc[ch] || 0) + 1;
    return acc;
  }, {});
  const bases =
    seqType === "PROTEIN"
      ? Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
      : seqType === "RNA"
        ? ["A", "U", "G", "C"].map((b) => [b, counts[b] || 0])
        : ["A", "T", "G", "C"].map((b) => [b, counts[b] || 0]);

  const gcContent =
    seqType !== "PROTEIN"
      ? ((((counts["G"] || 0) + (counts["C"] || 0)) / len) * 100).toFixed(1)
      : null;

  const BASE_COLORS = {
    A: "#2d6cff",
    T: "#22c55e",
    U: "#8b5cf6",
    G: "#ef4444",
    C: "#f59e0b",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-3.5 rounded-xl bg-[--bg-subtle] border border-[--border] space-y-2.5"
    >
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="flex items-center gap-1.5">
          <Hash size={13} className="text-[--text-tertiary]" />
          <span className="text-[--text-secondary]">Panjang:</span>
          <span className="font-mono font-bold text-[--text-primary]">
            {len.toLocaleString()} {seqType === "PROTEIN" ? "aa" : "bp"}
          </span>
        </span>
        {gcContent !== null && (
          <span className="flex items-center gap-1.5">
            <span className="text-[--text-secondary]">GC Content:</span>
            <span className="font-mono font-bold text-primary-500">
              {gcContent}%
            </span>
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="text-[--text-secondary]">Tipe terdeteksi:</span>
          <span className="badge badge-primary text-[10px]">{seqType}</span>
        </span>
      </div>

      {seqType !== "PROTEIN" && (
        <div className="space-y-1.5">
          <div className="flex gap-0.5 h-2 rounded-full overflow-hidden">
            {bases.map(([base, count]) => {
              const pct = ((count / len) * 100).toFixed(1);
              return (
                <div
                  key={base}
                  style={{
                    width: `${pct}%`,
                    background: BASE_COLORS[base] || "#94a3b8",
                  }}
                  title={`${base}: ${count} (${pct}%)`}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-3">
            {bases.map(([base, count]) => (
              <span
                key={base}
                className="flex items-center gap-1 text-[11px] text-[--text-secondary]"
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: BASE_COLORS[base] || "#94a3b8" }}
                />
                {base}:{" "}
                <span className="font-mono font-medium text-[--text-primary]">
                  {count}
                </span>
                <span className="text-[--text-tertiary]">
                  ({((count / len) * 100).toFixed(1)}%)
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── Protein Functions Dynamic List ──────────────────────────────────────────
function ProteinFunctionsEditor({ value, onChange }) {
  function addRow() {
    onChange([...value, { ...EMPTY_PF }]);
  }

  function removeRow(idx) {
    onChange(value.filter((_, i) => i !== idx));
  }

  function setField(idx, field, val) {
    onChange(
      value.map((row, i) => (i === idx ? { ...row, [field]: val } : row)),
    );
  }

  return (
    <div className="space-y-3">
      {/* Info box */}
      <div className="flex items-start gap-2.5 p-3 rounded-lg bg-accent-500/8 border border-accent-500/15 text-xs text-accent-600 dark:text-accent-400">
        <Info size={14} className="flex-shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-semibold">Gene Ontology (GO) Functions.</span>{" "}
          Data fungsi protein berdasarkan standar GO.{" "}
          <span className="font-mono">pf_code</span> = kode GO (mis.{" "}
          <span className="font-mono">GO:0003677</span>),{" "}
          <span className="font-mono">term</span> = nama fungsi (mis.{" "}
          <span className="font-mono">DNA binding</span>),{" "}
          <span className="font-mono">evidence_code</span> = kode bukti
          eksperimental (mis. <span className="font-mono">IDA</span>,{" "}
          <span className="font-mono">ISS</span>).
        </div>
      </div>

      {/* Rows */}
      <div className="space-y-2.5">
        <AnimatePresence>
          {value.map((pf, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.2 }}
              className="p-4 rounded-xl border border-[--border] bg-[--bg-subtle] space-y-3"
            >
              {/* Row header */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[--text-tertiary] uppercase tracking-wider">
                  Fungsi #{idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeRow(idx)}
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-[--text-tertiary] hover:text-danger-500 hover:bg-danger-500/10 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* pf_code — WAJIB */}
                <FormField label="GO Code" required>
                  <Input
                    placeholder="GO:0003677"
                    value={pf.pf_code}
                    onChange={(e) => setField(idx, "pf_code", e.target.value)}
                    maxLength={20}
                    className="font-mono text-xs"
                  />
                </FormField>

                {/* term — WAJIB */}
                <FormField label="Nama Fungsi" required>
                  <Input
                    placeholder="DNA binding"
                    value={pf.term}
                    onChange={(e) => setField(idx, "term", e.target.value)}
                    maxLength={200}
                  />
                </FormField>

                {/* evidence_code */}
                <FormField
                  label="Evidence Code"
                  helper="Mis: IDA, ISS, IEA, TAS"
                >
                  <Input
                    placeholder="IDA"
                    value={pf.evidence_code}
                    onChange={(e) =>
                      setField(
                        idx,
                        "evidence_code",
                        e.target.value.toUpperCase(),
                      )
                    }
                    maxLength={50}
                    className="font-mono uppercase"
                  />
                </FormField>

                {/* go_term */}
                <FormField label="GO Term ID" helper="Mis: GO:0006355">
                  <Input
                    placeholder="GO:0006355"
                    value={pf.go_term}
                    onChange={(e) => setField(idx, "go_term", e.target.value)}
                    maxLength={50}
                    className="font-mono text-xs"
                  />
                </FormField>
              </div>

              {/* function_term — full width */}
              <FormField
                label="Function Term"
                helper="Deskripsi singkat fungsi biologis"
              >
                <Input
                  placeholder="Regulation of transcription, DNA-templated"
                  value={pf.function_term}
                  onChange={(e) =>
                    setField(idx, "function_term", e.target.value)
                  }
                />
              </FormField>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Tambah baris */}
      <button
        type="button"
        onClick={addRow}
        className="btn btn-glass btn-sm w-full border-dashed"
      >
        <Plus size={14} />
        Tambah Protein Function
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SequenceFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [form, setForm] = useState(EMPTY);
  const [proteinFns, setProteinFns] = useState([]); // protein_functions array
  const [errors, setErrors] = useState({});

  // Master data dropdown
  const { data: seqTypes = [] } = useQuery({
    queryKey: ["seq-types"],
    queryFn: geneticsApi.getSequenceTypes,
  });
  const { data: strands = [] } = useQuery({
    queryKey: ["seq-strands"],
    queryFn: geneticsApi.getStrands,
  });

  // Load data existing saat edit
  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ["sequence", id],
    queryFn: () => geneticsApi.getSequence(id),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!existing) return;
    setForm({
      name: existing.name || "",
      accession_id: existing.accession_id || "",
      sequence_data: existing.sequence_data || "",
      seq_type: existing.seq_type || "DNA",
      chromosome: existing.chromosome || "",
      gene_symbol: existing.gene_symbol || "",
      full_name: existing.full_name || "",
      gene_type: existing.gene_type || "",
      start_position: existing.start_position ?? "",
      end_position: existing.end_position ?? "",
      strand: existing.strand || "",
      rna_type: existing.rna_type || "",
      protein_name: existing.protein_name || "",
      molecular_weight: existing.molecular_weight ?? "",
      description: existing.description || "",
      patient_id: existing.patient_id ?? null,
    });
    if (existing.protein_functions?.length) {
      setProteinFns(
        existing.protein_functions.map((pf) => ({
          pf_code: pf.pf_code || "",
          term: pf.term || "",
          evidence_code: pf.evidence_code || "",
          go_term: pf.go_term || "",
          function_term: pf.function_term || "",
        })),
      );
    }
  }, [existing]);

  // Hitung length otomatis
  const autoLength = useMemo(
    () => calcLength(form.sequence_data),
    [form.sequence_data],
  );

  function set(field, val) {
    setForm((p) => ({ ...p, [field]: val }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: "" }));
  }

  // ── Callback dari FastaUploader ────────────────────────────────────────────
  function handleFastaParsed({ sequence, seqType, accessionId, headerFull }) {
    setForm((p) => ({
      ...p,
      sequence_data: sequence,
      seq_type: seqType,
      // Isi accession_id dari header FASTA jika belum ada
      accession_id: p.accession_id || accessionId,
      // Isi name dari header FASTA jika belum ada
      name:
        p.name ||
        headerFull.split(/\s/).slice(1).join(" ").slice(0, 150) ||
        p.name,
    }));
    setErrors((p) => ({ ...p, sequence_data: "" }));
  }

  // ── Validasi ────────────────────────────────────────────────────────────────
  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = "Nama sekuens wajib diisi";
    if (!form.seq_type) e.seq_type = "Tipe sekuens wajib dipilih";
    if (!form.sequence_data.trim())
      e.sequence_data = "Data sekuens wajib diisi (ketik atau upload file)";
    else if (autoLength < 3) e.sequence_data = "Sekuens minimal 3 karakter";

    // Validasi protein_functions
    proteinFns.forEach((pf, idx) => {
      if (!pf.pf_code.trim())
        e[`pf_code_${idx}`] = `Baris #${idx + 1}: GO Code wajib diisi`;
      if (!pf.term.trim())
        e[`pf_term_${idx}`] = `Baris #${idx + 1}: Nama fungsi wajib diisi`;
    });

    return e;
  }

  // ── Build payload ──────────────────────────────────────────────────────────
  function buildPayload() {
    const validPf = proteinFns.filter(
      (pf) => pf.pf_code.trim() && pf.term.trim(),
    );
    return {
      name: form.name.trim(),
      sequence_data: form.sequence_data.trim(),
      seq_type: form.seq_type,
      accession_id: form.accession_id.trim() || null,
      chromosome: form.chromosome.trim() || null,
      gene_symbol: form.gene_symbol.trim() || null,
      full_name: form.full_name.trim() || null,
      gene_type: form.gene_type.trim() || null,
      strand: form.strand || null,
      rna_type: form.rna_type || null,
      protein_name: form.protein_name.trim() || null,
      description: form.description.trim() || null,
      start_position:
        form.start_position !== "" ? Number(form.start_position) : null,
      end_position: form.end_position !== "" ? Number(form.end_position) : null,
      molecular_weight:
        form.molecular_weight !== "" ? Number(form.molecular_weight) : null,
      patient_id: form.patient_id ?? null,
      length: autoLength > 0 ? autoLength : null,
      // protein_functions: array GO (hanya yang sudah terisi lengkap)
      protein_functions: validPf.map((pf) => ({
        pf_code: pf.pf_code.trim(),
        term: pf.term.trim(),
        evidence_code: pf.evidence_code.trim() || null,
        go_term: pf.go_term.trim() || null,
        function_term: pf.function_term.trim() || null,
      })),
    };
  }

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: geneticsApi.createSequence,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["sequences"] });
      toast.success("Sekuens berhasil ditambahkan");
      navigate(`/sequences/${res.id}`);
    },
    onError: (err) => toast.error(err.message || "Gagal menyimpan sekuens"),
  });

  const updateMutation = useMutation({
    mutationFn: (data) => geneticsApi.updateSequence(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sequences"] });
      qc.invalidateQueries({ queryKey: ["sequence", id] });
      toast.success("Sekuens berhasil diperbarui");
      navigate(`/sequences/${id}`);
    },
    onError: (err) => toast.error(err.message || "Gagal memperbarui sekuens"),
  });

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      window.scrollTo({ top: 0, behavior: "smooth" });
      toast.error("Lengkapi field yang wajib diisi");
      return;
    }
    const payload = buildPayload();
    if (isEdit) updateMutation.mutate(payload);
    else createMutation.mutate(payload);
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isEdit && loadingExisting) {
    return (
      <div className="space-y-5 max-w-3xl animate-pulse">
        <div className="skeleton h-8 w-64 rounded-xl" />
        <div className="skeleton h-48 rounded-2xl" />
        <div className="skeleton h-72 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-5">
          {/* ── Breadcrumb + Header Save ── */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <button
              type="button"
              onClick={() => navigate("/sequences")}
              className="flex items-center gap-2 text-sm text-[--text-secondary] hover:text-[--text-primary] transition-colors group"
            >
              <ArrowLeft
                size={16}
                className="group-hover:-translate-x-0.5 transition-transform"
              />
              Kembali ke Daftar Sekuens
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="btn btn-primary"
            >
              {isSaving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              {isEdit ? "Simpan Perubahan" : "Simpan Sekuens"}
            </button>
          </motion.div>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 }}
          >
            <h1 className="page-title flex items-center gap-2">
              <Dna size={22} className="text-primary-500" />
              {isEdit
                ? t("sequences.editSequence")
                : t("sequences.addSequence")}
            </h1>
            {isEdit && existing && (
              <p className="page-subtitle mt-0.5">
                Editing: <span className="font-medium">{existing.name}</span>
              </p>
            )}
          </motion.div>

          {/* ── SECTION 1: Identitas ── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.07 }}
          >
            <FormSection
              title="Identitas Sekuens"
              subtitle="Informasi dasar yang wajib diisi"
            >
              <FormField
                label={t("sequences.name")}
                required
                error={errors.name}
              >
                <Input
                  placeholder="Contoh: BRCA1 Gene, MT-CO1 Mitochondrial"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  error={errors.name}
                  maxLength={150}
                />
              </FormField>

              <FormRow>
                <FormField
                  label={t("sequences.accessionId")}
                  helper="ID dari GenBank/NCBI (opsional)"
                >
                  <Input
                    placeholder="NM_007294"
                    value={form.accession_id}
                    onChange={(e) => set("accession_id", e.target.value)}
                    maxLength={50}
                    className="font-mono"
                  />
                </FormField>
                <FormField
                  label={t("sequences.sequenceType")}
                  required
                  error={errors.seq_type}
                >
                  <Select
                    value={form.seq_type}
                    onChange={(e) => set("seq_type", e.target.value)}
                    error={errors.seq_type}
                  >
                    {seqTypes.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </Select>
                </FormField>
              </FormRow>

              <FormField
                label="Nama Lengkap Gen/Protein"
                helper="Nama ilmiah lengkap (opsional)"
              >
                <Input
                  placeholder="Breast Cancer Type 1 Susceptibility Protein"
                  value={form.full_name}
                  onChange={(e) => set("full_name", e.target.value)}
                  maxLength={200}
                />
              </FormField>
            </FormSection>
          </motion.div>

          {/* ── SECTION 2: Data Sekuens (Upload + Textarea) ── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <FormSection
              title="Data Sekuens"
              subtitle="Upload file FASTA atau ketik langsung di bawah"
            >
              {/* Info tipe */}
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-primary-500/8 border border-primary-500/15 text-xs text-primary-600 dark:text-primary-400">
                <Info size={14} className="flex-shrink-0 mt-0.5" />
                {form.seq_type === "DNA" && (
                  <span>
                    Format IUPAC DNA:{" "}
                    <span className="font-mono font-bold">A T C G</span> (+ N,
                    R, Y, W, S, K, M, B, D, H, V untuk ambigu). Spasi & baris
                    baru diabaikan.
                  </span>
                )}
                {form.seq_type === "RNA" && (
                  <span>
                    Format IUPAC RNA:{" "}
                    <span className="font-mono font-bold">A U C G</span>. Spasi
                    & baris baru diabaikan.
                  </span>
                )}
                {form.seq_type === "PROTEIN" && (
                  <span>
                    Kode 1-huruf asam amino:{" "}
                    <span className="font-mono font-bold">
                      A C D E F G H I K L M N P Q R S T V W Y
                    </span>
                    .
                  </span>
                )}
              </div>

              {/* Upload FASTA */}
              <FastaUploader
                onParsed={handleFastaParsed}
                currentSeqType={form.seq_type}
              />

              {/* Divider "atau ketik" */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-[--border]" />
                <span className="text-xs text-[--text-tertiary] select-none">
                  atau ketik manual
                </span>
                <div className="flex-1 h-px bg-[--border]" />
              </div>

              {/* Textarea — bisa diketik manual atau sudah terisi dari file */}
              <FormField
                label={t("sequences.sequenceData")}
                required
                error={errors.sequence_data}
              >
                <Textarea
                  placeholder={
                    form.seq_type === "PROTEIN"
                      ? "MTEYKLVVVGAGGVGKSALTIQLIQNHFVDEYD..."
                      : form.seq_type === "RNA"
                        ? "AUCGGCUAUCGAUCGAUCGUAGCUAGCUAGCUA..."
                        : "ATCGGCTATCGATCGATCGTAGCTAGCTAGCTA..."
                  }
                  value={form.sequence_data}
                  onChange={(e) => set("sequence_data", e.target.value)}
                  rows={8}
                  error={errors.sequence_data}
                  className="font-mono text-xs tracking-wider leading-relaxed"
                />
              </FormField>

              {/* Stats realtime */}
              <SequenceStats
                sequence={form.sequence_data}
                seqType={form.seq_type}
              />

              {/* Info length otomatis */}
              {autoLength > 0 && (
                <p className="flex items-center gap-1.5 text-xs text-[--text-tertiary]">
                  <Info size={12} />
                  Field{" "}
                  <code className="font-mono px-1 py-0.5 rounded bg-[--bg-muted]">
                    length
                  </code>{" "}
                  akan otomatis terisi:{" "}
                  <strong className="text-[--text-primary] font-mono ml-1">
                    {autoLength.toLocaleString()}
                  </strong>
                  <span className="ml-1">
                    {form.seq_type === "PROTEIN" ? "aa" : "bp"}
                  </span>
                </p>
              )}
            </FormSection>
          </motion.div>

          {/* ── SECTION 3: Informasi Genomik ── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.13 }}
          >
            <FormSection
              title="Informasi Genomik"
              subtitle="Lokasi pada genom (semua opsional)"
            >
              <FormRow>
                <FormField
                  label={t("sequences.chromosome")}
                  helper="Nomor/nama kromosom (1–22, X, Y, MT)"
                >
                  <Input
                    placeholder="17"
                    value={form.chromosome}
                    onChange={(e) => set("chromosome", e.target.value)}
                    maxLength={10}
                  />
                </FormField>
                <FormField
                  label={t("sequences.geneSymbol")}
                  helper="Simbol resmi HGNC"
                >
                  <Input
                    placeholder="BRCA1"
                    value={form.gene_symbol}
                    onChange={(e) =>
                      set("gene_symbol", e.target.value.toUpperCase())
                    }
                    maxLength={20}
                    className="font-mono uppercase"
                  />
                </FormField>
              </FormRow>

              <FormRow>
                <FormField
                  label="Tipe Gen"
                  helper="protein-coding, lncRNA, miRNA, dll"
                >
                  <Input
                    placeholder="protein-coding"
                    value={form.gene_type}
                    onChange={(e) => set("gene_type", e.target.value)}
                    maxLength={50}
                  />
                </FormField>
                <FormField label={t("sequences.strand")}>
                  <Select
                    value={form.strand}
                    onChange={(e) => set("strand", e.target.value)}
                  >
                    <option value="">— Tidak diketahui —</option>
                    {strands.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label} ({s.value})
                      </option>
                    ))}
                  </Select>
                </FormField>
              </FormRow>

              <FormRow>
                <FormField
                  label={t("sequences.startPosition")}
                  helper="Posisi awal pada kromosom (1-based)"
                >
                  <Input
                    type="number"
                    placeholder="43044295"
                    value={form.start_position}
                    onChange={(e) => set("start_position", e.target.value)}
                    min={0}
                  />
                </FormField>
                <FormField
                  label={t("sequences.endPosition")}
                  helper="Posisi akhir pada kromosom"
                >
                  <Input
                    type="number"
                    placeholder="43125364"
                    value={form.end_position}
                    onChange={(e) => set("end_position", e.target.value)}
                    min={0}
                  />
                </FormField>
              </FormRow>

              {/* RNA Type — hanya jika RNA */}
              {form.seq_type === "RNA" && (
                <FormField
                  label="RNA Type"
                  helper="Jenis RNA berdasarkan fungsi biologisnya"
                >
                  <Select
                    value={form.rna_type}
                    onChange={(e) => set("rna_type", e.target.value)}
                  >
                    <option value="">— Pilih tipe RNA —</option>
                    {RNA_TYPES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </Select>
                  {/* Tampilkan deskripsi jenis yang dipilih */}
                  {form.rna_type && (
                    <p className="text-xs text-[--text-secondary] mt-1.5 flex items-center gap-1.5">
                      <Info size={12} />
                      {RNA_TYPES.find((r) => r.value === form.rna_type)?.desc}
                    </p>
                  )}
                </FormField>
              )}
            </FormSection>
          </motion.div>

          {/* ── SECTION 4: Informasi Protein (hanya jika PROTEIN) ── */}
          {form.seq_type === "PROTEIN" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <FormSection
                title="Informasi Protein"
                badge="PROTEIN"
                subtitle="Properti fisikokimia protein"
              >
                <FormRow>
                  <FormField label="Nama Protein">
                    <Input
                      placeholder="Breast cancer type 1 susceptibility protein"
                      value={form.protein_name}
                      onChange={(e) => set("protein_name", e.target.value)}
                      maxLength={150}
                    />
                  </FormField>
                  <FormField
                    label="Molecular Weight"
                    helper="Berat molekul dalam Dalton (Da)"
                  >
                    <Input
                      type="number"
                      placeholder="207721.67"
                      value={form.molecular_weight}
                      onChange={(e) => set("molecular_weight", e.target.value)}
                      step="0.01"
                      min={0}
                    />
                  </FormField>
                </FormRow>
              </FormSection>
            </motion.div>
          )}

          {/* ── SECTION 5: Protein Functions (Gene Ontology) ── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
          >
            <FormSection
              title="Protein Functions (Gene Ontology)"
              subtitle="Anotasi fungsi berdasarkan GO — opsional, bisa ditambahkan nanti"
            >
              <ProteinFunctionsEditor
                value={proteinFns}
                onChange={setProteinFns}
              />
            </FormSection>
          </motion.div>

          {/* ── SECTION 6: Informasi Tambahan ── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.19 }}
            className="relative z-20"
          >
            <FormSection
              title="Informasi Tambahan"
              subtitle="Catatan dan relasi (semua opsional)"
            >
              <FormField
                label={t("common.description")}
                helper="Catatan bebas tentang sekuens ini"
              >
                <Textarea
                  placeholder="Deskripsi fungsi, konteks penelitian, atau catatan penting..."
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  rows={3}
                />
              </FormField>

              {/* Dropdown Pasien — bukan input angka */}
              <FormField
                label="Pasien Terkait"
                helper="Pilih pasien jika sekuens ini berasal dari sampel pasien tertentu"
              >
                <PatientSelect
                  value={form.patient_id}
                  onChange={(val) => set("patient_id", val)}
                  placeholder="Cari dan pilih pasien..."
                />
              </FormField>
            </FormSection>
          </motion.div>
          <div className="h-28" />

          {/* ── Sticky Bottom Bar ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
            className="fixed sm:sticky bottom-0 sm:bottom-4 left-0 right-0 sm:left-auto sm:right-auto z-10 px-4 sm:px-0 pb-4 sm:pb-0 pointer-events-none"
          >
            <div className="glass rounded-2xl px-5 py-3.5 flex items-center justify-between gap-4 shadow-glass-lg pointer-events-auto">
              <div>
                {Object.keys(errors).length > 0 && (
                  <span className="flex items-center gap-1.5 text-sm text-danger-500">
                    <AlertCircle size={15} />
                    Lengkapi field yang wajib diisi
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/sequences")}
                  className="btn btn-ghost"
                  disabled={isSaving}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn btn-primary btn-lg relative overflow-hidden group"
                >
                  {isSaving ? (
                    <Loader2 size={17} className="animate-spin" />
                  ) : (
                    <Save size={17} />
                  )}
                  {isEdit ? "Simpan Perubahan" : "Simpan Sekuens"}
                  <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/15 to-transparent skew-x-12 pointer-events-none" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </form>
    </div>
  );
}
