import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, UserX, UserCheck, KeyRound, Shield } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { TopBar } from '../components/layout/TopBar';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { PageSpinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { api } from '../services/api';
import { useAuthStore } from '../store/auth.store';
import { formatDate } from '../utils/format';

const ROLE_LABELS: Record<string, { label: string; cls: string }> = {
  super_admin:     { label: 'Super-Admin',        cls: 'bg-purple-100 text-purple-700' },
  admin:           { label: 'Admin',              cls: 'bg-blue-100 text-blue-700' },
  contract_editor: { label: 'Vertragsbearbeitung', cls: 'bg-green-100 text-green-700' },
  invoice_editor:  { label: 'Rechnungsbearbeitung', cls: 'bg-yellow-100 text-yellow-700' },
  viewer:          { label: 'Betrachter',          cls: 'bg-gray-100 text-gray-600' },
};

const ROLE_OPTIONS = [
  { value: 'admin',           label: 'Admin' },
  { value: 'contract_editor', label: 'Vertragsbearbeitung' },
  { value: 'invoice_editor',  label: 'Rechnungsbearbeitung' },
  { value: 'viewer',          label: 'Betrachter' },
];

const EMPTY_FORM = { firstName: '', lastName: '', email: '', password: '', role: 'viewer' };
const EMPTY_PW   = { newPassword: '', newPassword2: '' };

export default function UsersPage() {
  const qc = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const [showCreate,   setShowCreate]   = useState(false);
  const [editUser,     setEditUser]     = useState<any | null>(null);
  const [pwUser,       setPwUser]       = useState<any | null>(null);
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [pwForm,       setPwForm]       = useState(EMPTY_PW);
  const [error,        setError]        = useState('');
  const [pwError,      setPwError]      = useState('');

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then((r) => r.data),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['users'] });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/users', data),
    onSuccess: () => { invalidate(); setShowCreate(false); setForm(EMPTY_FORM); setError(''); },
    onError: (e: any) => setError(e.response?.data?.message ?? 'Fehler beim Anlegen'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => api.patch(`/users/${id}`, data),
    onSuccess: () => { invalidate(); setEditUser(null); setError(''); },
    onError: (e: any) => setError(e.response?.data?.message ?? 'Fehler beim Speichern'),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: any) => api.patch(`/users/${id}`, { isActive }),
    onSuccess: invalidate,
  });

  const resetPwMutation = useMutation({
    mutationFn: ({ id, newPassword }: any) => api.patch(`/users/${id}/password`, { newPassword }),
    onSuccess: () => { setPwUser(null); setPwForm(EMPTY_PW); setPwError(''); },
    onError: (e: any) => setPwError(e.response?.data?.message ?? 'Fehler'),
  });

  const openEdit = (u: any) => {
    setForm({ firstName: u.firstName, lastName: u.lastName, email: u.email, password: '', role: u.role });
    setEditUser(u);
    setError('');
  };

  const submitCreate = () => {
    if (!form.firstName || !form.lastName || !form.email || !form.password) {
      setError('Alle Pflichtfelder ausfüllen'); return;
    }
    createMutation.mutate(form);
  };

  const submitEdit = () => {
    if (!editUser) return;
    updateMutation.mutate({ id: editUser.id, data: { firstName: form.firstName, lastName: form.lastName, role: form.role } });
  };

  const submitPw = () => {
    if (pwForm.newPassword.length < 8) { setPwError('Mindestens 8 Zeichen'); return; }
    if (pwForm.newPassword !== pwForm.newPassword2) { setPwError('Passwörter stimmen nicht überein'); return; }
    resetPwMutation.mutate({ id: pwUser.id, newPassword: pwForm.newPassword });
  };

  return (
    <AppLayout>
      <TopBar
        title="Benutzerverwaltung"
        subtitle={users ? `${users.length} Benutzer` : undefined}
        actions={
          <Button icon={<Plus size={15} />} onClick={() => { setForm(EMPTY_FORM); setError(''); setShowCreate(true); }}>
            Neuer Benutzer
          </Button>
        }
      />

      <div className="p-6 animate-fade">
        <Card padding={false}>
          {isLoading ? <PageSpinner /> : !users?.length ? (
            <EmptyState icon={<Shield size={40} />} title="Keine Benutzer" />
          ) : (
            <>
              {/* Tabellenkopf */}
              <div className="grid grid-cols-[2fr_2fr_1.5fr_1fr_auto] gap-4 px-5 py-2.5 border-b border-gray-100 bg-gray-50 rounded-t-xl">
                {['Name', 'E-Mail', 'Rolle', 'Letzter Login', ''].map((h) => (
                  <span key={h} className="text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</span>
                ))}
              </div>

              <ul className="divide-y divide-gray-50">
                {users.map((u: any) => {
                  const roleCfg = ROLE_LABELS[u.role] ?? { label: u.role, cls: 'bg-gray-100 text-gray-600' };
                  const isMe = u.id === currentUser?.id;
                  return (
                    <li key={u.id} className={`grid grid-cols-[2fr_2fr_1.5fr_1fr_auto] gap-4 px-5 py-3.5 items-center ${!u.isActive ? 'opacity-50' : ''}`}>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {u.firstName} {u.lastName}
                          {isMe && <span className="ml-2 text-xs text-blue-500">(ich)</span>}
                        </p>
                      </div>
                      <p className="text-sm text-gray-600 truncate">{u.email}</p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium w-fit ${roleCfg.cls}`}>
                        {roleCfg.label}
                      </span>
                      <p className="text-xs text-gray-400">{u.lastLoginAt ? formatDate(u.lastLoginAt) : '—'}</p>
                      <div className="flex items-center gap-1">
                        {/* Bearbeiten */}
                        {u.role !== 'super_admin' && (
                          <button onClick={() => openEdit(u)}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Bearbeiten">
                            <Pencil size={14} />
                          </button>
                        )}
                        {/* Passwort zurücksetzen */}
                        {u.role !== 'super_admin' && (
                          <button onClick={() => { setPwUser(u); setPwForm(EMPTY_PW); setPwError(''); }}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-orange-600 transition-colors"
                            title="Passwort zurücksetzen">
                            <KeyRound size={14} />
                          </button>
                        )}
                        {/* Aktivieren/Deaktivieren */}
                        {!isMe && u.role !== 'super_admin' && (
                          <button
                            onClick={() => toggleActive.mutate({ id: u.id, isActive: !u.isActive })}
                            className={`p-1.5 rounded hover:bg-gray-100 transition-colors ${u.isActive ? 'text-gray-400 hover:text-red-500' : 'text-gray-400 hover:text-green-600'}`}
                            title={u.isActive ? 'Deaktivieren' : 'Aktivieren'}>
                            {u.isActive ? <UserX size={14} /> : <UserCheck size={14} />}
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </Card>
      </div>

      {/* Modal: Neuer Benutzer */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Neuer Benutzer" size="sm">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Vorname *" value={form.firstName} onChange={(e) => setForm(f => ({ ...f, firstName: e.target.value }))} />
            <Input label="Nachname *" value={form.lastName} onChange={(e) => setForm(f => ({ ...f, lastName: e.target.value }))} />
          </div>
          <Input label="E-Mail *" type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
          <Input label="Passwort *" type="password" value={form.password}
            onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
            hint="Mindestens 8 Zeichen" />
          <Select label="Rolle" options={ROLE_OPTIONS} value={form.role}
            onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))} />
        </div>
        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="secondary" onClick={() => setShowCreate(false)}>Abbrechen</Button>
          <Button onClick={submitCreate} loading={createMutation.isPending}>Anlegen</Button>
        </div>
      </Modal>

      {/* Modal: Benutzer bearbeiten */}
      <Modal open={!!editUser} onClose={() => setEditUser(null)} title="Benutzer bearbeiten" size="sm">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Vorname" value={form.firstName} onChange={(e) => setForm(f => ({ ...f, firstName: e.target.value }))} />
            <Input label="Nachname" value={form.lastName} onChange={(e) => setForm(f => ({ ...f, lastName: e.target.value }))} />
          </div>
          <Input label="E-Mail" value={form.email} disabled className="opacity-60" />
          <Select label="Rolle" options={ROLE_OPTIONS} value={form.role}
            onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))} />
        </div>
        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="secondary" onClick={() => setEditUser(null)}>Abbrechen</Button>
          <Button onClick={submitEdit} loading={updateMutation.isPending}>Speichern</Button>
        </div>
      </Modal>

      {/* Modal: Passwort zurücksetzen */}
      <Modal open={!!pwUser} onClose={() => setPwUser(null)} title={`Passwort zurücksetzen: ${pwUser?.firstName} ${pwUser?.lastName}`} size="sm">
        <div className="space-y-3">
          <Input label="Neues Passwort" type="password" value={pwForm.newPassword}
            onChange={(e) => setPwForm(f => ({ ...f, newPassword: e.target.value }))}
            hint="Mindestens 8 Zeichen" />
          <Input label="Passwort bestätigen" type="password" value={pwForm.newPassword2}
            onChange={(e) => setPwForm(f => ({ ...f, newPassword2: e.target.value }))} />
        </div>
        {pwError && <p className="text-xs text-red-500 mt-2">{pwError}</p>}
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="secondary" onClick={() => setPwUser(null)}>Abbrechen</Button>
          <Button onClick={submitPw} loading={resetPwMutation.isPending}>Zurücksetzen</Button>
        </div>
      </Modal>
    </AppLayout>
  );
}
