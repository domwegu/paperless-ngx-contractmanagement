import { ContractStatus, InvoiceStatus } from '../../types';

const CONTRACT_STATUS: Record<ContractStatus, { label: string; cls: string }> = {
  active:    { label: 'Aktiv',       cls: 'bg-green-100 text-green-700' },
  expiring:  { label: 'Läuft ab',    cls: 'bg-orange-100 text-orange-700' },
  expired:   { label: 'Abgelaufen',  cls: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Gekündigt',   cls: 'bg-gray-100 text-gray-500' },
  draft:     { label: 'Entwurf',     cls: 'bg-blue-100 text-blue-700' },
};

const INVOICE_STATUS: Record<InvoiceStatus, { label: string; cls: string }> = {
  open:      { label: 'Offen',      cls: 'bg-blue-100 text-blue-700' },
  paid:      { label: 'Bezahlt',    cls: 'bg-green-100 text-green-700' },
  overdue:   { label: 'Überfällig', cls: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Storniert',  cls: 'bg-gray-100 text-gray-500' },
};

export function ContractStatusBadge({ status }: { status: ContractStatus }) {
  const cfg = CONTRACT_STATUS[status] ?? CONTRACT_STATUS.draft;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const cfg = INVOICE_STATUS[status] ?? INVOICE_STATUS.open;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}
