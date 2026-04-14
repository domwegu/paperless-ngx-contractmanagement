import { Bell, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { TopBar } from '../components/layout/TopBar';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { PageSpinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { useReminderSummary, useMarkReminderDone } from '../hooks/useReminders';
import { formatDate, formatDaysUntil } from '../utils/format';
import { ReminderType } from '../types';
import { useNavigate } from 'react-router-dom';

const TYPE_LABELS: Record<ReminderType, { label: string; icon: React.ReactNode }> = {
  cancellation_deadline: { label: 'Kündigungsfrist', icon: <AlertTriangle size={13} /> },
  contract_expiry:       { label: 'Vertragsende',    icon: <Clock size={13} /> },
  invoice_due:           { label: 'Rechnung fällig', icon: <Bell size={13} /> },
  custom:                { label: 'Erinnerung',      icon: <Bell size={13} /> },
};

export default function RemindersPage() {
  const navigate = useNavigate();
  const { data: summary, isLoading } = useReminderSummary();
  const markDone = useMarkReminderDone();

  return (
    <AppLayout>
      <TopBar
        title="Erinnerungen"
        subtitle={summary ? `${summary.next90days} offene Erinnerungen (90 Tage)` : undefined}
      />

      <div className="p-6 space-y-5 animate-fade">

        {/* Zusammenfassung */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Überfällig',    value: summary?.overdue    ?? 0, color: 'text-red-700 bg-red-50',    border: 'border-red-100' },
            { label: 'Nächste 30 T.', value: summary?.next30days ?? 0, color: 'text-orange-700 bg-orange-50', border: 'border-orange-100' },
            { label: 'Nächste 90 T.', value: summary?.next90days ?? 0, color: 'text-blue-700 bg-blue-50',   border: 'border-blue-100' },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl border ${s.border} ${s.color} px-5 py-4`}>
              <p className="text-2xl font-bold tabular">{s.value}</p>
              <p className="text-xs font-medium opacity-70 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Liste */}
        <Card padding={false}>
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm">Offene Erinnerungen</h2>
          </div>

          {isLoading ? <PageSpinner /> : !summary?.reminders?.length ? (
            <EmptyState
              icon={<CheckCircle size={40} className="text-green-300" />}
              title="Keine offenen Erinnerungen"
              description="Alle Fristen sind im grünen Bereich."
            />
          ) : (
            <ul className="divide-y divide-gray-50">
              {summary.reminders.map((r) => {
                const dl  = formatDaysUntil(r.dueDate);
                const cfg = TYPE_LABELS[r.type as ReminderType] ?? TYPE_LABELS.custom;
                return (
                  <li key={r.id} className="flex items-center gap-4 px-5 py-3.5">
                    {/* Status-Dot */}
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-0.5
                      ${dl.overdue ? 'bg-red-500' : dl.urgent ? 'bg-orange-400' : 'bg-blue-400'}`} />

                    {/* Typ-Badge */}
                    <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full flex-shrink-0
                      ${dl.overdue ? 'bg-red-100 text-red-700' : dl.urgent ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                      {cfg.icon} {cfg.label}
                    </div>

                    {/* Inhalt */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {r.title ?? cfg.label}
                      </p>
                      <button
                        onClick={() => r.contract?.id && navigate(`/contracts/${r.contract.id}`)}
                        className="text-xs text-blue-600 hover:underline truncate block text-left"
                      >
                        {r.contract?.title ?? '—'}
                      </button>
                    </div>

                    {/* Datum */}
                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm font-medium tabular
                        ${dl.overdue ? 'text-red-600' : dl.urgent ? 'text-orange-600' : 'text-gray-700'}`}>
                        {dl.label}
                      </p>
                      <p className="text-xs text-gray-400">{formatDate(r.dueDate)}</p>
                    </div>

                    {/* Aktion */}
                    <Button
                      variant="ghost" size="sm"
                      icon={<CheckCircle size={14} />}
                      loading={markDone.isPending}
                      onClick={() => markDone.mutate(r.id)}
                      title="Als erledigt markieren"
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
