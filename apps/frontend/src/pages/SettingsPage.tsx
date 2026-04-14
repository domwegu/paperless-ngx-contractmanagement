import { useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { TopBar } from '../components/layout/TopBar';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { api } from '../services/api';
import { CheckCircle, AlertCircle, Wifi } from 'lucide-react';

export default function SettingsPage() {
  const [url,   setUrl]   = useState('');
  const [token, setToken] = useState('');
  const [saving, setSaving]   = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch('/tenants/my/paperless-settings', { paperlessBaseUrl: url, paperlessApiToken: token });
      setTestResult({ ok: true, message: 'Einstellungen gespeichert' });
    } catch (e: any) {
      setTestResult({ ok: false, message: e.response?.data?.message ?? 'Fehler beim Speichern' });
    } finally { setSaving(false); }
  };

  const test = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { data } = await api.post('/tenants/my/paperless-settings/test');
      setTestResult(data);
    } catch {
      setTestResult({ ok: false, message: 'Verbindungstest fehlgeschlagen' });
    } finally { setTesting(false); }
  };

  return (
    <AppLayout>
      <TopBar title="Einstellungen" />
      <div className="p-6 space-y-5 animate-fade max-w-xl">

        {/* Logo-Hinweis */}
        <Card>
          <h2 className="font-semibold text-gray-900 mb-3">Logo</h2>
          <p className="text-sm text-gray-600 mb-3">
            Legen Sie eine Datei <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">logo.png</code> im
            Ordner <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">apps/frontend/public/</code> ab.
            Das Logo wird automatisch in der Sidebar und im Login angezeigt.
          </p>
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5 text-sm text-blue-700">
            Empfohlen: quadratisches PNG, mind. 64×64 px
          </div>
        </Card>

        {/* Paperless-Einstellungen */}
        <Card>
          <h2 className="font-semibold text-gray-900 mb-1">Paperless-NGX Verbindung</h2>
          <p className="text-sm text-gray-500 mb-4">
            Hinterlegen Sie die URL Ihrer Paperless-Instanz und den API-Token. Diese Einstellungen gelten für Ihren Mandanten.
          </p>

          <div className="space-y-3">
            <Input
              label="Base URL"
              placeholder="http://paperless.intern:8000"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <Input
              label="API Token"
              type="password"
              placeholder="abc123def456…"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          </div>

          {testResult && (
            <div className={`flex items-center gap-2 mt-3 rounded-lg px-3 py-2.5 text-sm
              ${testResult.ok ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
              {testResult.ok ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
              {testResult.message}
            </div>
          )}

          <div className="flex items-center gap-2 mt-4">
            <Button variant="secondary" icon={<Wifi size={14} />} loading={testing} onClick={test}>
              Verbindung testen
            </Button>
            <Button loading={saving} onClick={save}>
              Speichern
            </Button>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
