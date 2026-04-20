import { useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { TopBar } from '../components/layout/TopBar';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { api } from '../services/api';
import { CheckCircle, AlertCircle, Wifi, KeyRound, Plus, Trash2, Copy, RefreshCw } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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

      {/* API-Tokens */}
      <ApiTokenSection />
    </AppLayout>
  );
}

function ApiTokenSection() {
  const qc = useQueryClient();
  const [newTokenValue, setNewTokenValue] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: tokens } = useQuery({
    queryKey: ['api-tokens'],
    queryFn: () => api.get('/export/tokens').then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: () => api.post('/export/tokens', { name: 'Excel Power Query' }).then((r) => r.data),
    onSuccess: (data) => {
      setNewTokenValue(data.token);
      qc.invalidateQueries({ queryKey: ['api-tokens'] });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/export/tokens/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['api-tokens'] }),
  });

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const baseUrl = window.location.origin.replace('5173', '3000');

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="font-semibold text-gray-900 mb-1">API-Token für Excel / Power Query</h2>
        <p className="text-sm text-gray-500 mb-4">
          Langlebiger Token (5 Jahre) für den Excel Power Query Live-Link. Wird nur einmal angezeigt.
        </p>

        {/* Aktive Tokens */}
        {tokens?.length > 0 && (
          <div className="mb-4 space-y-2">
            {tokens.map((t: any) => (
              <div key={t.id} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{t.name}</p>
                  <p className="text-xs text-gray-400">
                    Gültig bis {new Date(t.expiresAt).toLocaleDateString('de-DE')}
                    {t.lastUsedAt && ` · Zuletzt genutzt: ${new Date(t.lastUsedAt).toLocaleDateString('de-DE')}`}
                  </p>
                </div>
                <button onClick={() => revokeMutation.mutate(t.id)}
                  className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                  title="Token widerrufen">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Neuer Token */}
        {newTokenValue ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
            <p className="text-xs font-medium text-green-700 mb-2">
              ✅ Token generiert — wird nur jetzt einmal angezeigt, danach nicht mehr!
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-white border border-green-200 rounded px-2 py-1.5 font-mono text-green-800 break-all">
                {newTokenValue}
              </code>
              <button onClick={() => copy(newTokenValue)}
                className="flex-shrink-0 p-2 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 transition-colors">
                {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        ) : null}

        <Button
          variant={tokens?.length > 0 ? 'secondary' : 'primary'}
          icon={tokens?.length > 0 ? <RefreshCw size={14} /> : <Plus size={14} />}
          loading={createMutation.isPending}
          onClick={() => { setNewTokenValue(null); createMutation.mutate(); }}
        >
          {tokens?.length > 0 ? 'Token erneuern' : 'Token generieren'}
        </Button>
      </Card>

      {/* Power Query Anleitung */}
      <Card>
        <h2 className="font-semibold text-gray-900 mb-3">Power Query Einrichtung in Excel</h2>
        <ol className="space-y-3 text-sm text-gray-700">
          {[
            { step: '1', text: 'Excel öffnen → Daten → Daten abrufen → Aus dem Web' },
            { step: '2', text: `URL eingeben: ${baseUrl}/api/export/contracts.json` },
            { step: '3', text: 'Bei "Zugriff auf Webinhalt" → Erweitert → HTTP-Anforderungsheader hinzufügen' },
            { step: '4', text: 'Header-Name: Authorization  |  Wert: Bearer <dein-token>' },
            { step: '5', text: 'Verbinden → In Tabelle konvertieren → Laden' },
            { step: '6', text: 'Daten aktualisieren: Daten → Alle aktualisieren (oder beim Öffnen)' },
          ].map((item) => (
            <li key={item.step} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#132d52] text-white text-xs flex items-center justify-center font-semibold mt-0.5">
                {item.step}
              </span>
              <span className="text-gray-600">{item.text}</span>
            </li>
          ))}
        </ol>

        <div className="mt-4 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5">
          <p className="text-xs text-blue-700">
            <strong>Tipp:</strong> Die URL für den direkten Excel-Download ist:<br />
            <code className="font-mono">{baseUrl}/api/export/contracts.xlsx</code><br />
            Diesen Link kannst du auch direkt im Browser aufrufen — der Token wird als Header mitgeschickt.
          </p>
        </div>
      </Card>
    </div>
  );
}
