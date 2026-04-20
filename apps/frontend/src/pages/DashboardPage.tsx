import { AlertTriangle, Clock, TrendingUp, CheckCircle, Bell } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { TopBar } from '../components/layout/TopBar';
import { Card } from '../components/ui/Card';
import { ContractStatusBadge } from '../components/ui/Badge';
import { PageSpinner } from '../components/ui/Spinner';
import { useDeadlines } from '../hooks/useContracts';
import { useReminderSummary } from '../hooks/useReminders';
import { formatDate, formatDaysUntil, formatCurrency } from '../utils/format';
import { useAuthStore } from '../store/auth.store';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const { data: deadlines, isLoading: loadingD } = useDeadlines(90);
  const { data: summary,   isLoading: loadingS } = useReminderSummary();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Guten Morgen' : hour < 18 ? 'Guten Tag' : 'Guten Abend';

  return (
    <AppLayout>
      <TopBar
        title={`${greeting}, ${user?.firstName}`}
        subtitle={formatDate(new Date().toISOString())}
      />

      <div className="p-6 space-y-6 animate-fade">

        {/* KPI-Karten */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Überfällige Fristen"
            value={summary?.overdue ?? 0}
            icon={<AlertTriangle size={18} />}
            accent={summary?.overdue ? 'red' : 'green'}
          />
          <KpiCard
            label="Fristen (30 Tage)"
            value={summary?.next30days ?? 0}
            icon={<Clock size={18} />}
            accent={summary?.next30days ? 'orange' : 'navy'}
          />
          <KpiCard
            label="Fristen (90 Tage)"
            value={summary?.next90days ?? 0}
            icon={<Bell size={18} />}
            accent="navy"
          />
          <KpiCard
            label="Offene Erinnerungen"
            value={summary?.reminders?.filter(r => r.status === 'pending').length ?? 0}
            icon={<TrendingUp size={18} />}
            accent="navy"
          />
        </div>

        {/* Zwei-Spalten Layout */}
        <div className="grid lg:grid-cols-2 gap-6">

          {/* Anstehende Kündigungsfristen */}
          <Card padding={false}>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 text-sm">Anstehende Kündigungsfristen</h2>
              <span className="text-xs text-gray-400">nächste 90 Tage</span>
            </div>
            {loadingD ? <PageSpinner /> : !deadlines?.length ? (
              <div className="flex flex-col items-center py-10 text-center">
                <CheckCircle size={32} className="text-green-300 mb-2" />
                <p className="text-sm text-gray-500">Keine anstehenden Fristen</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {deadlines.slice(0, 8).map((c) => {
                  const dl = formatDaysUntil(c.cancellationDeadline);
                  return (
                    <li
                      key={c.id}
                      onClick={() => navigate(`/contracts/${c.id}`)}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{c.title}</p>
                        <p className="text-xs text-gray-500 truncate">{c.partner ?? '—'}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-xs font-medium tabular ${dl.overdue ? 'text-red-600' : dl.urgent ? 'text-orange-600' : 'text-gray-600'}`}>
                          {dl.label}
                        </p>
                        <p className="text-[11px] text-gray-400">{formatDate(c.cancellationDeadline)}</p>
                      </div>
                      <ContractStatusBadge status={c.status} />
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {/* Offene Erinnerungen */}
          <Card padding={false}>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 text-sm">Offene Erinnerungen</h2>
              <button onClick={() => navigate('/reminders')} className="text-xs text-blue-600 hover:underline">
                Alle anzeigen
              </button>
            </div>
            {loadingS ? <PageSpinner /> : !summary?.reminders?.length ? (
              <div className="flex flex-col items-center py-10 text-center">
                <CheckCircle size={32} className="text-green-300 mb-2" />
                <p className="text-sm text-gray-500">Keine offenen Erinnerungen</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {summary.reminders.slice(0, 8).map((r) => {
                  const dl = formatDaysUntil(r.dueDate);
                  const typeLabel: Record<string,string> = {
                    cancellation_deadline: 'Kündigungsfrist',
                    contract_expiry: 'Vertragsende',
                    invoice_due: 'Rechnung fällig',
                    custom: 'Erinnerung',
                  };
                  return (
                    <li key={r.id} className="flex items-start gap-3 px-5 py-3">
                      <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${dl.overdue ? 'bg-red-500' : dl.urgent ? 'bg-orange-400' : 'bg-blue-400'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{r.title ?? typeLabel[r.type]}</p>
                        <p className="text-xs text-gray-500">{r.contract?.title ?? '—'}</p>
                      </div>
                      <p className={`text-xs font-medium flex-shrink-0 tabular ${dl.overdue ? 'text-red-600' : dl.urgent ? 'text-orange-500' : 'text-gray-500'}`}>
                        {dl.label}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

function KpiCard({ label, value, icon, accent }: {
  label: string; value: number; icon: React.ReactNode;
  accent: 'red' | 'orange' | 'navy' | 'green';
}) {
  const colors = {
    red:    { bg: 'bg-red-50',    icon: 'text-red-500',    val: 'text-red-700' },
    orange: { bg: 'bg-orange-50', icon: 'text-orange-500', val: 'text-orange-700' },
    navy:   { bg: 'bg-blue-50',   icon: 'text-blue-600',   val: 'text-[#132d52]' },
    green:  { bg: 'bg-green-50',  icon: 'text-green-500',  val: 'text-green-700' },
  };
  const c = colors[accent];
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className={`w-9 h-9 rounded-lg ${c.bg} flex items-center justify-center mb-3 ${c.icon}`}>
        {icon}
      </div>
      <p className={`text-2xl font-bold tabular ${c.val}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}
