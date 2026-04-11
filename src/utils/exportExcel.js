/**
 * utils/exportExcel.js
 * Helper terpusat untuk export ke Excel menggunakan SheetJS (xlsx).
 * Semua halaman yang butuh export Excel cukup import dari sini.
 */
import * as XLSX from "xlsx";

/**
 * Export array of objects ke file Excel.
 * @param {Array}  rows      - Data rows (array of plain objects)
 * @param {string} sheetName - Nama sheet
 * @param {string} filename  - Nama file (tanpa .xlsx)
 * @param {Object} [colWidths] - { 'Nama Kolom': width_px }
 */
export function exportToExcel(
  rows,
  sheetName = "Sheet1",
  filename = "export",
  colWidths = {},
) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  // Set lebar kolom
  if (Object.keys(colWidths).length > 0) {
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
    ws["!cols"] = headers.map((h) => ({
      wch: colWidths[h] || Math.max(h.length + 2, 12),
    }));
  }

  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(
    wb,
    `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
}

// ─── Pre-built exporters per modul ───────────────────────────────────────────
export function exportSequencesToExcel(sequences) {
  exportToExcel(
    sequences.map((s) => ({
      ID: s.id,
      Nama: s.name,
      "Accession ID": s.accession_id || "",
      Tipe: s.seq_type,
      "Simbol Gen": s.gene_symbol || "",
      Kromosom: s.chromosome || "",
      "Panjang (bp)": s.sequence_length || "",
      Strand: s.strand || "",
      Status: s.status_processed || "",
    })),
    "Sequences",
    "sequences",
  );
}

export function exportPatientsToExcel(patients) {
  exportToExcel(
    patients.map((p) => ({
      ID: p.id,
      NIK: p.nik,
      "Nama Lengkap": p.full_name,
      "Jenis Kelamin":
        p.gender === "MALE"
          ? "Laki-laki"
          : p.gender === "FEMALE"
            ? "Perempuan"
            : "",
      "Tgl Lahir": p.date_of_birth || "",
      Kota: p.address_city || "",
      Provinsi: p.address_province || "",
      Etnis: p.ethnicity_name || "",
    })),
    "Patients",
    "patients",
  );
}

export function exportMutationsToExcel(mutations) {
  exportToExcel(
    mutations.map((m) => ({
      ID: m.id,
      Kode: m.code || "",
      Tipe: m.mutation_type || "",
      Posisi: m.position || "",
      "Basa Normal": m.normal_base || "",
      "Basa Mutan": m.mutation_base || "",
      Penyakit: m.disease_name || "",
      Sekuens: m.sequence_name || "",
      Deskripsi: m.description || "",
    })),
    "Mutations",
    "mutations",
  );
}

export function exportDiseasesToExcel(diseases) {
  exportToExcel(
    diseases.map((d) => ({
      ID: d.id,
      Nama: d.name,
      "Kode ICD": d.icd_code || "",
      Deskripsi: d.description || "",
      "Jml Etnis": d.ethnicity_count || 0,
      "Jml Mutasi": d.mutation_count || 0,
    })),
    "Diseases",
    "diseases",
  );
}

export function exportAnalisysTasksToExcel(tasks) {
  exportToExcel(
    tasks.map((t) => ({
      "Task ID": t.id,
      Status: t.status,
      "Referensi ID": t.reference_sequence_id || "",
      "Total Mutasi": t.total_mutations ?? "",
      "Panjang Sampel": t.sample_length ?? "",
      "Panjang Referensi": t.reference_length ?? "",
      "Alignment Summary": t.alignment_summary || "",
      Dibuat: t.created_at
        ? new Date(t.created_at).toLocaleString("id-ID")
        : "",
    })),
    "Analysis Tasks",
    "analysis_tasks",
  );
}
