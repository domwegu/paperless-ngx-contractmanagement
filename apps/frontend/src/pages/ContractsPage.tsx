import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, FileText, Download, FileSpreadsheet } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { TopBar } from '../components/layout/TopBar';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { ContractStatusBadge } from '../components/ui/Badge';
import { PageSpinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { useContracts } from '../hooks/useContracts';
import { formatDate, formatCurrency, formatDaysUntil } from '../utils/format';
import { ContractStatus } from '../types';

const STATUS_OPTIONS = [
  { value: '', label: 'Alle Status' },
  { value: 'active',    label: 'Aktiv' },
  { value: 'expiring',  label: 'Läuft ab' },
  { value: 'expired',   label: 'Abgelaufen' },
  { value: 'cancelled', label: 'Gekündigt' },
  { value: 'draft',     label: 'Entwurf' },
];

export default function ContractsPage() {
  const navigate  = useNavigate();

  const exportFile = async (type: 'xlsx' | 'pdf') => {
    const token = localStorage.getItem('accessToken');
    const res = await fetch(`/api/export/contracts.${type}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `Vertraege_${new Date().toISOString().split('T')[0]}.${type}`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const [search,  setSearch]  = useState('');
  const [status,  setStatus]  = useState('');
  const [page,    setPage]    = useState(1);

  const { data, isLoading } = useContracts({
    search: search || undefined,
    status: status || undefined,
    page,
    limit: 20,
  });

  return (
    <AppLayout>
      <TopBar
        title="Verträge"
        subtitle={data ? `${data.meta.total} Verträge gesamt` : undefined}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" icon={<FileSpreadsheet size={14} />} onClick={() => exportFile('xlsx')}>
              Excel
            </Button>
            <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={() => exportFile('pdf')}>
              PDF
            </Button>
            <Button icon={<Plus size={15} />} onClick={() => navigate('/contracts/new')}>
              Neuer Vertrag
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-4 animate-fade">

        {/* Filter-Zeile */}
        <div className="flex items-center gap-3">
          <div className="flex-1 max-w-sm">
            <Input
              placeholder="Titel, Partner, Nummer…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              prefix={<Search size={14} />}
            />
          </div>
          <div className="w-44">
            <Select
              options={STATUS_OPTIONS}
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              placeholder=""
            />
          </div>
        </div>

        {/* Tabelle */}
        <Card padding={false}>
          {isLoading ? <PageSpinner /> : !data?.data?.length ? (
            <EmptyState
              icon={<FileText size={40} />}
              title="Keine Verträge gefunden"
              description="Legen Sie einen neuen Vertrag an oder passen Sie die Suchfilter an."
              action={<Button icon={<Plus size={15} />} onClick={() => navigate('/contracts/new')}>Neuer Vertrag</Button>}
            />
          ) : (
            <>
              {/* Tabellenkopf */}
              <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_auto] gap-4 px-5 py-2.5 border-b border-gray-100 bg-gray-50 rounded-t-xl">
                {['Vertrag', 'Partner', 'Laufzeit', 'Kündigung bis', 'Betrag', 'Status'].map((h) => (
                  <span key={h} className="text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</span>
                ))}
              </div>

              {/* Zeilen */}
              <ul className="divide-y divide-gray-50">
                {data.data.map((c) => {
                  const dl = formatDaysUntil(c.cancellationDeadline);
                  return (
                    <li
                      key={c.id}
                      onClick={() => navigate(`/contracts/${c.id}`)}
                      className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3.5 hover:bg-gray-50 cursor-pointer transition-colors items-center"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{c.title}</p>
                        {c.contractNumber && <p className="text-xs text-gray-400 font-mono">{c.contractNumber}</p>}
                      </div>
                      <p className="text-sm text-gray-600 truncate">{c.partner ?? '—'}</p>
                      <div>
                        <p className="text-sm text-gray-600">{formatDate(c.startDate)}</p>
                        <p className="text-xs text-gray-400">{formatDate(c.endDate)}</p>
                      </div>
                      <p className={`text-sm font-medium tabular ${dl.overdue ? 'text-red-600' : dl.urgent ? 'text-orange-600' : 'text-gray-600'}`}>
                        {formatDate(c.cancellationDeadline)}
                        <span className="block text-xs font-normal text-gray-400">{dl.label}</span>
                      </p>
                      <p className="text-sm text-gray-700 tabular">{formatCurrency(c.amount, c.currency)}</p>
                      <ContractStatusBadge status={c.status as ContractStatus} />
                    </li>
                  );
                })}
              </ul>

              {/* Pagination */}
              {data.meta.pages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    Seite {page} von {data.meta.pages} ({data.meta.total} Einträge)
                  </p>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Zurück</Button>
                    <Button variant="secondary" size="sm" disabled={page >= data.meta.pages} onClick={() => setPage(p => p + 1)}>Weiter</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
