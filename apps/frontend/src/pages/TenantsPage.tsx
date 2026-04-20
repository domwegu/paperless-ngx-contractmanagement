import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Building2, Wifi, CheckCircle, AlertCircle, ToggleLeft, ToggleRight } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { TopBar } from '../components/layout/TopBar';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { PageSpinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { api } from '../services/api';
import { formatDate } from '../utils/format';

const EMPTY_FORM = {
  name: '', slug: '', paperlessBaseUrl: '', paperlessApiToken: '',
};

export default function TenantsPage() {
  const qc = useQueryClient();
  const [showCreate,  setShowCreate]  = useState(false);
  const [editTenant,  setEditTenant]  = useState<any | null>(null);
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [error,       setError]       = useState('');
  const [testing,     setTesting]     = useState<string | null>(null);
  const [testResult,  setTestResult]  = useState<Record<string, { ok: boolean; message: string }>>({});

  const { data: tenants, isLoading } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => api.get('/tenants').then((r) => r.data),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['tenants'] });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/tenants', data),
    onSuccess: () => { invalidate(); setShowCreate(false); setForm(EMPTY_FORM); setError(''); },
    onError: (e: any) => setError(e.response?.data?.message ?? 'Fehler beim Anlegen'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => api.patch(`/tenants/${id}`, data),
    onSuccess: () => { invalidate(); setEditTenant(null); setError(''); },
    onError: (e: any) => setError(e.response?.data?.message ?? 'Fehler beim Speichern'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: any) => api.patch(`/tenants/${id}`, { isActive }),
    onSuccess: invalidate,
  });

  const testConnection = async (tenantId: string) => {
    setTesting(tenantId);
    try {
      const { data } = await api.post(`/tenants/${tenantId}/paperless-test`);
      setTestResult((r) => ({ ...r, [tenantId]: data }));
    } catch {
      setTestResult((r) => ({ ...r, [tenantId]: { ok: false, message: 'Verbindung fehlgeschlagen' } }));
    } finally { setTesting(null); }
  };

  const openEdit = (t: any) => {
    setForm({ name: t.name, slug: t.slug, paperlessBaseUrl: t.paperlessBaseUrl ?? '', paperlessApiToken: '' });
    setEditTenant(t);
    setError('');
  };

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  return (
    <AppLayout>
      <TopBar
        title="Mandanten"
        subtitle={tenants ? `${tenants.length} Mandanten` : undefined}
        actions={
          <Button icon={<Plus size={15} />} onClick={() => { setForm(EMPTY_FORM); setError(''); setShowCreate(true); }}>
            Neuer Mandant
          </Button>
        }
      />

      <div className="p-6 animate-fade space-y-4">
        {isLoading ? <PageSpinner /> : !tenants?.length ? (
          <Card>
            <EmptyState icon={<Building2 size={40} />} title="Keine Mandanten"
              description="Legen Sie den ersten Mandanten an."
              action={<Button icon={<Plus size={15} />} onClick={() => setShowCreate(true)}>Anlegen</Button>} />
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {tenants.map((t: any) => (
              <Card key={t.id} className={!t.isActive ? 'opacity-60' : ''}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{t.name}</h3>
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-mono">{t.slug}</span>
                      {!t.isActive && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">Inaktiv</span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">Angelegt: {formatDate(t.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(t)}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Bearbeiten">
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => toggleMutation.mutate({ id: t.id, isActive: !t.isActive })}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-orange-500 transition-colors"
                      title={t.isActive ? 'Deaktivieren' : 'Aktivieren'}>
                      {t.isActive ? <ToggleRight size={16} className="text-green-500" /> : <ToggleLeft size={16} />}
                    </button>
                  </div>
                </div>

                {/* Paperless-Status */}
                <div className="border-t border-gray-100 pt-3 mt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-0.5">Paperless-NGX</p>
                      <p className="text-sm text-gray-700 truncate max-w-[220px]">
                        {t.paperlessBaseUrl || <span className="text-gray-400 italic">nicht konfiguriert</span>}
                      </p>
                    </div>
                    <Button size="sm" variant="secondary" icon={<Wifi size={13} />}
                      loading={testing === t.id}
                      onClick={() => testConnection(t.id)}>
                      Testen
                    </Button>
                  </div>
                  {testResult[t.id] && (
                    <div className={`flex items-center gap-1.5 mt-2 text-xs rounded-lg px-2.5 py-1.5
                      ${testResult[t.id].ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                      {testResult[t.id].ok ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                      {testResult[t.id].message}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Neuer Mandant */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Neuer Mandant">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Name *" placeholder="Muster GmbH" value={form.name} onChange={f('name')} />
            <Input label="Slug *" placeholder="muster-gmbh"
              hint="Kleinbuchstaben, Zahlen, Bindestriche"
              value={form.slug} onChange={f('slug')} />
          </div>
          <Input label="Paperless Base-URL" placeholder="http://paperless.intern:8000"
            value={form.paperlessBaseUrl} onChange={f('paperlessBaseUrl')} />
          <Input label="Paperless API-Token" type="password" placeholder="abc123…"
            value={form.paperlessApiToken} onChange={f('paperlessApiToken')} />
        </div>
        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="secondary" onClick={() => setShowCreate(false)}>Abbrechen</Button>
          <Button onClick={() => createMutation.mutate(form)} loading={createMutation.isPending}>Anlegen</Button>
        </div>
      </Modal>

      {/* Modal: Mandant bearbeiten */}
      <Modal open={!!editTenant} onClose={() => setEditTenant(null)} title="Mandant bearbeiten">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Name" value={form.name} onChange={f('name')} />
            <Input label="Slug" value={form.slug} disabled className="opacity-60"
              hint="Slug kann nicht geändert werden" />
          </div>
          <Input label="Paperless Base-URL" placeholder="http://paperless.intern:8000"
            value={form.paperlessBaseUrl} onChange={f('paperlessBaseUrl')} />
          <Input label="Neuer API-Token" type="password" placeholder="Leer lassen = unverändert"
            value={form.paperlessApiToken} onChange={f('paperlessApiToken')}
            hint="Nur ausfüllen wenn der Token geändert werden soll" />
        </div>
        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="secondary" onClick={() => setEditTenant(null)}>Abbrechen</Button>
          <Button loading={updateMutation.isPending}
            onClick={() => updateMutation.mutate({
              id: editTenant.id,
              data: {
                name: form.name,
                paperlessBaseUrl: form.paperlessBaseUrl,
                ...(form.paperlessApiToken ? { paperlessApiToken: form.paperlessApiToken } : {}),
              },
            })}>
            Speichern
          </Button>
        </div>
      </Modal>
    </AppLayout>
  );
}
