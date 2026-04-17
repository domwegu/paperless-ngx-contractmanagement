import { useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { TopBar } from '../components/layout/TopBar';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { api } from '../services/api';
import { CheckCircle, AlertCircle, Wifi, KeyRound } from 'lucide-react';

export default function SettingsPage() {
  const [url,    setUrl]    = useState('');
  const [token,  setToken]  = useState('');
  const [saving, setSaving]   = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const [pwForm,    setPwForm]    = useState({ current: '', next: '', next2: '' });
  const [pwSaving,  setPwSaving]  = useState(false);
  const [pwResult,  setPwResult]  = useState<{ ok: boolean; message: string } | null>(null);

  const save = async () => {
    setSaving(true); setTestResult(null);
    try {
      await api.patch('/tenants/my/paperless-settings', { paperlessBaseUrl: url, paperlessApiToken: token });
      setTestResult({ ok: true, message: 'Einstellungen gespeichert' });
    } catch (e: any) {
      setTestResult({ ok: false, message: e.response?.data?.message ?? 'Fehler beim Speichern' });
    } finally { setSaving(false); }
  };

  const test = async () => {
    setTesting(true); setTestResult(null);
    try {
      const { data } = await api.post('/tenants/my/paperless-settings/test');
      setTestResult(data);
    } catch {
      setTestResult({ ok: false, message: 'Verbindungstest fehlgeschlagen' });
    } finally { setTesting(false); }
  };

  const changePw = async () => {
    if (pwForm.next.length < 8) { setPwResult({ ok: false, message: 'Mindestens 8 Zeichen' }); return; }
    if (pwForm.next !== pwForm.next2) { setPwResult({ ok: false, message: 'Passwörter stimmen nicht überein' }); return; }
    setPwSaving(true); setPwResult(null);
    try {
      await api.patch('/users/me/password', { currentPassword: pwForm.current, newPassword: pwForm.next });
      setPwResult({ ok: true, message: 'Passwort erfolgreich geändert' });
      setPwForm({ current: '', next: '', next2: '' });
    } catch (e: any) {
      setPwResult({ ok: false, message: e.response?.data?.message ?? 'Fehler beim Ändern' });
    } finally { setPwSaving(false); }
  };

  return (
    <AppLayout>
      <TopBar title="Einstellungen" />
      <div className="p-6 space-y-5 animate-fade max-w-xl">

        {/* Logo */}
        <Card>
          <h2 className="font-semibold text-gray-900 mb-2">Logo</h2>
          <p className="text-sm text-gray-600">
            Datei <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">logo.png</code> in
            <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono ml-1">apps/frontend/public/</code> ablegen.
            Wird automatisch in Sidebar und Login angezeigt.
          </p>
        </Card>

        {/* Paperless */}
        <Card>
          <h2 className="font-semibold text-gray-900 mb-1">Paperless-NGX Verbindung</h2>
          <p className="text-sm text-gray-500 mb-4">URL und Token für diesen Mandanten.</p>
          <div className="space-y-3">
            <Input label="Base URL" placeholder="http://paperless.intern:8000" value={url}
              onChange={(e) => setUrl(e.target.value)} />
            <Input label="API Token" type="password" placeholder="abc123…" value={token}
              onChange={(e) => setToken(e.target.value)} />
          </div>
          {testResult && (
            <div className={`flex items-center gap-2 mt-3 rounded-lg px-3 py-2.5 text-sm
              ${testResult.ok ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
              {testResult.ok ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
              {testResult.message}
            </div>
          )}
          <div className="flex gap-2 mt-4">
            <Button variant="secondary" icon={<Wifi size={14} />} loading={testing} onClick={test}>Testen</Button>
            <Button loading={saving} onClick={save}>Speichern</Button>
          </div>
        </Card>

        {/* Eigenes Passwort */}
        <Card>
          <h2 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
            <KeyRound size={16} className="text-gray-400" /> Passwort ändern
          </h2>
          <p className="text-sm text-gray-500 mb-4">Eigenes Passwort ändern.</p>
          <div className="space-y-3">
            <Input label="Aktuelles Passwort" type="password" value={pwForm.current}
              onChange={(e) => setPwForm(f => ({ ...f, current: e.target.value }))} />
            <Input label="Neues Passwort" type="password" value={pwForm.next}
              onChange={(e) => setPwForm(f => ({ ...f, next: e.target.value }))}
              hint="Mindestens 8 Zeichen" />
            <Input label="Neues Passwort bestätigen" type="password" value={pwForm.next2}
              onChange={(e) => setPwForm(f => ({ ...f, next2: e.target.value }))} />
          </div>
          {pwResult && (
            <div className={`flex items-center gap-2 mt-3 rounded-lg px-3 py-2.5 text-sm
              ${pwResult.ok ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
              {pwResult.ok ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
              {pwResult.message}
            </div>
          )}
          <div className="mt-4">
            <Button loading={pwSaving} onClick={changePw}>Passwort ändern</Button>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
