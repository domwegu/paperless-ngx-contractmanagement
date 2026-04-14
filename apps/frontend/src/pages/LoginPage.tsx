import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Mail, Lock, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message ?? 'Anmeldung fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07111f] flex items-center justify-center p-4">

      {/* Hintergrund-Akzent */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#235191]/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-[#f59e0b]/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">

        {/* Logo + Titel */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#f59e0b] flex items-center justify-center mx-auto mb-4 overflow-hidden">
            <img
              src="/logo.png"
              alt="Logo"
              className="w-full h-full object-contain"
              onError={(e) => {
                const el = e.target as HTMLImageElement;
                el.style.display = 'none';
                el.parentElement!.innerHTML = '<span style="font-size:24px;font-weight:700;color:#07111f">V</span>';
              }}
            />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Vertragsverwaltung</h1>
          <p className="text-white/50 text-sm">Bitte melden Sie sich an</p>
        </div>

        {/* Form-Card */}
        <div className="bg-white/6 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">

            {error && (
              <div className="flex items-center gap-2 bg-red-500/15 border border-red-500/30 rounded-lg px-3 py-2.5">
                <AlertCircle size={15} className="text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium text-white/70">E-Mail</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@firma.de"
                  required
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-white/8 border border-white/15 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#f59e0b]/60 focus:ring-2 focus:ring-[#f59e0b]/15 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-white/70">Passwort</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-white/8 border border-white/15 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#f59e0b]/60 focus:ring-2 focus:ring-[#f59e0b]/15 transition-all"
                />
              </div>
            </div>

            <Button type="submit" loading={loading} className="w-full mt-2 bg-[#f59e0b] hover:bg-[#fbbf24] text-[#07111f] font-semibold">
              Anmelden
            </Button>
          </form>
        </div>

        <p className="text-center text-white/25 text-xs mt-6">
          Vertragsverwaltung mit Paperless-NGX Integration
        </p>
      </div>
    </div>
  );
}
