export function formatDate(date?: string | Date | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatCurrency(amount?: number | null, currency = 'EUR'): string {
  if (amount == null) return '—';
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(amount);
}

export function formatDaysUntil(date?: string | null): { label: string; urgent: boolean; overdue: boolean } {
  if (!date) return { label: '—', urgent: false, overdue: false };
  const diff = Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000);
  if (diff < 0)  return { label: `${Math.abs(diff)} Tage überfällig`, urgent: true, overdue: true };
  if (diff === 0) return { label: 'Heute', urgent: true, overdue: false };
  if (diff === 1) return { label: 'Morgen', urgent: true, overdue: false };
  if (diff <= 14) return { label: `in ${diff} Tagen`, urgent: true, overdue: false };
  if (diff <= 30) return { label: `in ${diff} Tagen`, urgent: false, overdue: false };
  return { label: `in ${diff} Tagen`, urgent: false, overdue: false };
}

export function paymentIntervalLabel(months?: number | null): string {
  if (!months) return '—';
  const map: Record<number, string> = { 1: 'monatlich', 3: 'vierteljährlich', 6: 'halbjährlich', 12: 'jährlich' };
  return map[months] ?? `alle ${months} Monate`;
}
