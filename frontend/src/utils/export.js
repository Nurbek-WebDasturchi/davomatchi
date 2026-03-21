import * as XLSX from 'xlsx';

// Ma'lumotlarni Excel fayliga eksport qilish
export function exportToExcel(data, filename = 'davomat') {
  if (!data || data.length === 0) {
    alert("Eksport qilish uchun ma'lumot yo'q");
    return;
  }

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();

  // Ustun kengligini avtomatik hisoblash
  const cols = Object.keys(data[0]).map((key) => ({
    wch: Math.max(
      key.length,
      ...data.map((row) => String(row[key] || '').length)
    ) + 2,
  }));
  ws['!cols'] = cols;

  XLSX.utils.book_append_sheet(wb, ws, 'Davomat');

  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `${filename}_${dateStr}.xlsx`);
}

// Sanani formatlash: 2024-01-15 → 15.01.2024
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('uz-UZ', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
}

// Vaqtni formatlash: 09:14
export function formatTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('uz-UZ', {
    hour: '2-digit', minute: '2-digit'
  });
}
