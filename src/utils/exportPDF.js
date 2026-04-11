/**
 * utils/exportPDF.js
 * Fungsi-fungsi export PDF menggunakan jsPDF + html2canvas.
 *
 * Dua pendekatan:
 * 1. exportElementToPDF  → tangkap elemen DOM sebagai gambar (cocok untuk hasil visual)
 * 2. exportDataToPDF     → generate PDF dari data mentah dengan layout tabel (lebih ringan)
 *
 * Cara pakai:
 *   import { exportDataToPDF } from '@/utils/exportPDF'
 *   await exportDataToPDF({ title, columns, rows, filename })
 */

import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// ─── Warna brand ──────────────────────────────────────────────────────────────
const COLORS = {
  primary: [0, 191, 191], // teal #00bfbf
  accent: [45, 108, 255], // blue #2d6cff
  dark: [15, 23, 42], // surface-900
  text: [71, 85, 105], // surface-600
  textLight: [148, 163, 184], // surface-400
  border: [226, 232, 240], // surface-200
  headerBg: [0, 191, 191],
  rowEven: [248, 250, 252], // surface-50
  rowOdd: [255, 255, 255],
  danger: [239, 68, 68],
  success: [34, 197, 94],
  warning: [234, 179, 8],
};

// ─── Helper: set RGB ──────────────────────────────────────────────────────────
function rgb(doc, color, type = "fill") {
  if (type === "fill") doc.setFillColor(...color);
  else doc.setTextColor(...color);
}

// ─── Helper: format tanggal ───────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// ─── Header halaman ───────────────────────────────────────────────────────────
function drawHeader(doc, title, subtitle = "") {
  const W = doc.internal.pageSize.getWidth();

  // Gradient bar atas
  rgb(doc, COLORS.primary, "fill");
  doc.rect(0, 0, W, 18, "F");

  // Logo text kiri
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  rgb(doc, [255, 255, 255], "draw");
  doc.setTextColor(255, 255, 255);
  doc.text("SIB Lab", 14, 12);

  // Tagline kanan
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Sistem Informasi Biomolekuler — Maranatha", W - 14, 12, {
    align: "right",
  });

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  rgb(doc, COLORS.dark, "draw");
  doc.setTextColor(...COLORS.dark);
  doc.text(title, 14, 34);

  // Subtitle
  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.text);
    doc.text(subtitle, 14, 42);
  }

  // Tanggal generate
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.textLight);
  doc.text(
    `Digenerate: ${new Date().toLocaleString("id-ID")}`,
    W - 14,
    subtitle ? 42 : 34,
    { align: "right" },
  );

  // Divider
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.5);
  doc.line(14, subtitle ? 47 : 39, W - 14, subtitle ? 47 : 39);

  return subtitle ? 52 : 44; // return startY untuk konten
}

// ─── Footer tiap halaman ──────────────────────────────────────────────────────
function drawFooter(doc) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const total = doc.internal.getNumberOfPages();

  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.textLight);
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.3);
    doc.line(14, H - 12, W - 14, H - 12);
    doc.text("SIB Lab — Sistem Informasi Biomolekuler", 14, H - 7);
    doc.text(`Halaman ${i} dari ${total}`, W - 14, H - 7, { align: "right" });
  }
}

// ─── Tabel PDF ────────────────────────────────────────────────────────────────
function drawTable(doc, columns, rows, startY) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const MARGIN = 14;
  const usableW = W - MARGIN * 2;
  const ROW_H = 8;
  const HEADER_H = 10;
  const FONT_SIZE = 8;
  const PADDING = 2.5;

  // Hitung lebar kolom (proporsional atau rata)
  const totalFlex = columns.reduce((s, c) => s + (c.flex || 1), 0);
  const colWidths = columns.map((c) => (usableW * (c.flex || 1)) / totalFlex);

  let y = startY;

  function drawRow(cells, isHeader = false, isEven = false) {
    const rowH = isHeader ? HEADER_H : ROW_H;

    // Background
    if (isHeader) {
      rgb(doc, COLORS.headerBg, "fill");
      doc.rect(MARGIN, y, usableW, rowH, "F");
    } else if (isEven) {
      rgb(doc, COLORS.rowEven, "fill");
      doc.rect(MARGIN, y, usableW, rowH, "F");
    }

    // Border bawah baris
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, y + rowH, MARGIN + usableW, y + rowH);

    // Teks tiap sel
    doc.setFontSize(FONT_SIZE);
    if (isHeader) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
    } else {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.dark);
    }

    let x = MARGIN;
    cells.forEach((cell, i) => {
      const text = String(cell ?? "—");
      const maxW = colWidths[i] - PADDING * 2;
      // Truncate jika terlalu panjang
      const truncated = doc.splitTextToSize(text, maxW)[0] || "";
      doc.text(truncated, x + PADDING, y + (isHeader ? HEADER_H : ROW_H) / 2, {
        baseline: "middle",
      });
      x += colWidths[i];
    });

    // Vertical separators
    doc.setDrawColor(...COLORS.border);
    let xLine = MARGIN;
    colWidths.forEach((w) => {
      xLine += w;
      doc.line(xLine, y, xLine, y + rowH);
    });

    y += rowH;
  }

  // Render header & rows (dengan page break)
  function renderHeader() {
    drawRow(
      columns.map((c) => c.header),
      true,
    );
  }

  renderHeader();

  rows.forEach((row, idx) => {
    // Page break check
    if (y + ROW_H > H - 20) {
      doc.addPage();
      y = 20;
      renderHeader();
    }
    const cells = columns.map((c) => {
      const val = row[c.key];
      return c.format ? c.format(val, row) : val;
    });
    drawRow(cells, false, idx % 2 === 0);
  });

  return y + 4;
}

// ─── EXPORT: Data ke PDF (tabel) ──────────────────────────────────────────────
/**
 * @param {Object} options
 * @param {string} options.title       - Judul halaman PDF
 * @param {string} [options.subtitle]  - Subjudul
 * @param {Array}  options.columns     - [{ key, header, flex?, format? }]
 * @param {Array}  options.rows        - Array data
 * @param {string} [options.filename]  - Nama file (tanpa .pdf)
 * @param {Object} [options.summary]   - Object key-value untuk ringkasan di atas tabel
 */
export async function exportDataToPDF({
  title,
  subtitle = "",
  columns,
  rows,
  filename = "export",
  summary = null,
}) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  let y = drawHeader(doc, title, subtitle);

  // Summary boxes jika ada
  if (summary) {
    const entries = Object.entries(summary);
    const boxW = (doc.internal.pageSize.getWidth() - 28) / entries.length;
    entries.forEach(([label, value], i) => {
      const x = 14 + i * boxW;
      doc.setFillColor(...COLORS.rowEven);
      doc.roundedRect(x, y, boxW - 2, 16, 2, 2, "F");
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...COLORS.primary);
      doc.text(String(value), x + boxW / 2 - 1, y + 7, {
        align: "center",
        baseline: "middle",
      });
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.text);
      doc.text(label, x + boxW / 2 - 1, y + 13, {
        align: "center",
        baseline: "middle",
      });
    });
    y += 22;
  }

  // Tabel
  drawTable(doc, columns, rows, y);

  drawFooter(doc);
  doc.save(`${filename}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ─── EXPORT: Elemen DOM ke PDF ────────────────────────────────────────────────
/**
 * Tangkap elemen HTML sebagai gambar dan masukkan ke PDF.
 * Cocok untuk export hasil analisis dengan layout visual.
 *
 * @param {HTMLElement} element  - Elemen yang akan di-capture
 * @param {string}      title    - Judul PDF
 * @param {string}      filename - Nama file
 */
export async function exportElementToPDF(
  element,
  title = "Export",
  filename = "export",
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  let y = drawHeader(doc, title);

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
  });

  const imgData = canvas.toDataURL("image/png");
  const imgW = W - 28;
  const imgH = (canvas.height * imgW) / canvas.width;

  // Potong jika lebih dari satu halaman
  let srcY = 0;
  let remaining = imgH;

  while (remaining > 0) {
    const pageH = Math.min(remaining, H - y - 20);
    const srcH = (pageH / imgH) * canvas.height;
    const slice = document.createElement("canvas");
    slice.width = canvas.width;
    slice.height = srcH;
    const ctx = slice.getContext("2d");
    ctx.drawImage(
      canvas,
      0,
      srcY * (canvas.height / imgH),
      canvas.width,
      srcH,
      0,
      0,
      canvas.width,
      srcH,
    );

    doc.addImage(slice.toDataURL("image/png"), "PNG", 14, y, imgW, pageH);

    remaining -= pageH;
    srcY += pageH;
    if (remaining > 0) {
      doc.addPage();
      y = 20;
    }
  }

  drawFooter(doc);
  doc.save(`${filename}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ─── EXPORT: Hasil Analisis ───────────────────────────────────────────────────
/**
 * Export hasil analisis compare ke PDF dengan format khusus.
 */
export async function exportAnalysisToPDF(task, ethnicityName = "") {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();

  let y = drawHeader(
    doc,
    "Laporan Hasil Analisis Sekuens",
    `Referensi Etnis: ${ethnicityName || task.reference_sequence_id}`,
  );

  // Info task
  const info = [
    ["Task ID", task.id],
    ["Status", task.status],
    [
      "Panjang Sampel",
      task.sample_length ? `${task.sample_length.toLocaleString()} bp` : "—",
    ],
    [
      "Panjang Referensi",
      task.reference_length
        ? `${task.reference_length.toLocaleString()} bp`
        : "—",
    ],
    ["Total Mutasi", task.total_mutations ?? 0],
    ["Tanggal Analisis", formatDate(task.created_at)],
  ];

  // Info grid 2 kolom
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.dark);
  doc.text("Informasi Analisis", 14, y);
  y += 6;

  const COL = (W - 28) / 2;
  info.forEach(([label, val], i) => {
    const x = i % 2 === 0 ? 14 : 14 + COL + 4;
    const rowY = y + Math.floor(i / 2) * 10;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.textLight);
    doc.text(label, x, rowY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.dark);
    doc.text(String(val), x, rowY + 5);
  });
  y += Math.ceil(info.length / 2) * 10 + 6;

  // Alignment Summary
  if (task.alignment_summary) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.dark);
    doc.text("Ringkasan Alignment", 14, y);
    y += 5;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.text);
    const lines = doc.splitTextToSize(task.alignment_summary, W - 28);
    doc.text(lines, 14, y);
    y += lines.length * 5 + 6;
  }

  // Tabel mutasi
  if (task.mutations?.length) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.dark);
    doc.text(`Mutasi Terdeteksi (${task.mutations.length})`, 14, y);
    y += 5;

    const cols = [
      { key: "no", header: "#", flex: 0.4, format: (_, __, i) => i + 1 },
      { key: "position", header: "Posisi", flex: 0.8 },
      { key: "reference_base", header: "Basa Referensi", flex: 1 },
      { key: "sample_base", header: "Basa Sampel", flex: 1 },
      {
        key: "type",
        header: "Tipe",
        flex: 1,
        format: (_, row) => {
          if (row.reference_base === "-") return "Insertion";
          if (row.sample_base === "-") return "Deletion";
          return "Substitusi";
        },
      },
    ];

    const rows = task.mutations.map((m, i) => ({ ...m, no: i + 1 }));
    y = drawTable(doc, cols, rows, y);
  } else {
    doc.setFillColor(...COLORS.rowEven);
    doc.roundedRect(14, y, W - 28, 12, 2, 2, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.success[0], ...COLORS.success);
    doc.setTextColor(34, 197, 94);
    doc.text(
      "Tidak ada mutasi terdeteksi — sekuens identik dengan referensi",
      W / 2,
      y + 6,
      { align: "center", baseline: "middle" },
    );
    y += 16;
  }

  drawFooter(doc);
  doc.save(
    `analisis_${ethnicityName || "result"}_${new Date().toISOString().slice(0, 10)}.pdf`,
  );
}
