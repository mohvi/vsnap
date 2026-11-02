const BOM = String.fromCharCode(0xfeff);

export const csvCell = (value) => {
  const s = String(value ?? '');
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// CSV com ";" e BOM: abre directamente no Excel em português.
export function toCsv(rows) {
  return BOM + rows.map((r) => r.map(csvCell).join(';')).join('\r\n');
}

export function downloadCsv(filename, content) {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
