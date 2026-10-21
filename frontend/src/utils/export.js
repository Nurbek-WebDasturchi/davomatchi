import * as XLSX from 'xlsx';
import api from './api';

export function exportErrorMessage(error) {
  const status = error.response?.status;
  const message = error.response?.data?.error;
  if (message) return message;
  if (status === 404) return "Telegram eksport endpointi serverda topilmadi. Backendni qayta deploy qiling.";
  if (status === 401) return "Kirish sessiyasi tugagan. Ilovaga qayta kiring.";
  if (status === 403) return "Bu akkaunt Excel eksport qilish huquqiga ega emas.";
  if (status === 502) return "Bot Excel faylini yubora olmadi. Bot chatida /start ni bosing.";
  if (!error.response) return "Backend serverga ulanib bo'lmadi. Internet va server holatini tekshiring.";
  return "Excel eksport xatosi (HTTP " + status + ").";
}

export function showExportError(error) {
  const message = exportErrorMessage(error);
  if (window.Telegram?.WebApp?.showAlert) window.Telegram.WebApp.showAlert(message);
  else window.alert(message);
}

export function playAttendanceSuccess() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const now = context.currentTime;
    [659.25, 880].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = now + index * 0.12;
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.16, start + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.19);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.2);
    });
    window.setTimeout(() => context.close(), 500);
  } catch {
    // Audio is an enhancement; attendance marking should work if sound is blocked.
  }
}

export async function downloadAttendanceExcel(params = {}) {
  const telegram = window.Telegram?.WebApp;
  if (telegram?.initData) {
    await api.post('/attendance/export/telegram', params, {
      headers: { 'X-Telegram-Init-Data': telegram.initData },
    });
    playAttendanceSuccess();
    window.dispatchEvent(new CustomEvent('attendance:excel-sent'));
    return;
  }
  const response = await api.get('/attendance/export', {
    params,
    responseType: 'blob',
  });
  const blob = new Blob([response.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = 'davomat.xlsx';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

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
