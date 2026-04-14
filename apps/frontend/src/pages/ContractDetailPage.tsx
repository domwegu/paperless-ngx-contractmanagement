import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Edit2, Upload, FileText, Receipt,
  Bell, Calendar, Building2, CreditCard, Link2, Trash2
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { TopBar } from '../components/layout/TopBar';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ContractStatusBadge, InvoiceStatusBadge } from '../components/ui/Badge';
import { PageSpinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { useContract } from '../hooks/useContracts';
import { formatDate, formatCurrency, formatDaysUntil, paymentIntervalLabel } from '../utils/format';
import { api } from '../services/api';
import { DocumentType } from '../types';

const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  contract:    'Hauptvertrag',
  amendment:   'Nachtrag',
  annex:       'Anlage',
  termination: 'Kündigung',
  other:       'Sonstiges',
};

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: contract, isLoading, refetch } = useContract(id!);
  const [uploadingDoc,  setUploadingDoc]  = useState(false);
  const [uploadingInv,  setUploadingInv]  = useState(false);

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: DocumentType) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDoc(true);
    const form = new FormData();
    form.append('file', file);
    form.append('type', type);
    form.append('title', file.name.replace(/\.[^/.]+$/, ''));
    try {
      await api.post(`/contracts/${id}/documents`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      refetch();
    } finally { setUploadingDoc(false); e.target.value = ''; }
  };

  const handleInvoiceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingInv(true);
    const form = new FormData();
    form.append('file', file);
    form.append('invoiceDate', new Date().toISOString().split('T')[0]);
    form.append('amount', '0');
    try {
      await api.post(`/contracts/${id}/invoices/upload`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      refetch();
    } finally { setUploadingInv(false); e.target.value = ''; }
  };

  const openPaperless = async (docId: number) => {
    const { data } = await api.get(`/paperless/documents/${docId}/urls`);
    window.open(data.preview, '_blank');
  };

  if (isLoading) return <AppLayout><PageSpinner /></AppLayout>;
  if (!contract) return <AppLayout><div className="p-8 text-gray-500">Vertrag nicht gefunden</div></AppLayout>;

  const dl = formatDaysUntil(contract.cancellationDeadline);

  return (
    <AppLayout>
      <TopBar
        title={contract.title}
        subtitle={contract.contractNumber ? `Nr. ${contract.contractNumber}` : undefined}
        actions={
          <div className="flex items-center gap-2">
            <ContractStatusBadge status={contract.status} />
            <Button variant="secondary" size="sm" icon={<Edit2 size={14} />}
              onClick={() => navigate(`/contracts/${id}/edit`)}>
              Bearbeiten
            </Button>
          </div>
        }
      />

      <div className="p-6 animate-fade">
        {/* Zurück */}
        <button onClick={() => navigate('/contracts')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-5 transition-colors">
          <ArrowLeft size={14} /> Zurück zur Liste
        </button>

        {/* Fristwarnung */}
        {(dl.urgent || dl.overdue) && contract.cancellationDeadline && (
          <div className={`flex items-center gap-3 rounded-xl px-4 py-3 mb-5 border
            ${dl.overdue ? 'bg-red-50 border-red-200 text-red-700' : 'bg-orange-50 border-orange-200 text-orange-700'}`}>
            <Bell size={16} />
            <p className="text-sm font-medium">
              Kündigungsfrist {dl.overdue ? 'überschritten' : 'läuft ab'}:
              <span className="ml-1 font-bold">{formatDate(contract.cancellationDeadline)}</span>
              <span className="ml-2 font-normal opacity-75">({dl.label})</span>
            </p>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-5">

          {/* Linke Spalte: Kerndaten */}
          <div className="lg:col-span-2 space-y-5">

            {/* Stammdaten */}
            <Card>
              <CardHeader>
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Building2 size={16} className="text-gray-400" /> Vertragspartner
                </h2>
              </CardHeader>
              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
                <DetailRow label="Partner"        value={contract.partner} />
                <DetailRow label="E-Mail"         value={contract.partnerEmail} />
                <DetailRow label="Adresse"        value={contract.partnerAddress} />
                <DetailRow label="Telefon"        value={contract.partnerPhone} />
                <DetailRow label="Kategorie"      value={contract.category} />
                {contract.description && (
                  <div className="sm:col-span-2">
                    <DetailRow label="Beschreibung" value={contract.description} />
                  </div>
                )}
              </div>
            </Card>

            {/* Laufzeit & Fristen */}
            <Card>
              <CardHeader>
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Calendar size={16} className="text-gray-400" /> Laufzeit & Fristen
                </h2>
              </CardHeader>
              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
                <DetailRow label="Abschluss"         value={formatDate(contract.signedDate)} />
                <DetailRow label="Beginn"            value={formatDate(contract.startDate)} />
                <DetailRow label="Ende"              value={formatDate(contract.endDate)} />
                <DetailRow label="Verlängerungsart"  value={contract.renewalType === 'auto_renew' ? 'Automatisch' : contract.renewalType === 'fixed_term' ? 'Befristet' : 'Manuell'} />
                <DetailRow label="Verlängerung um"   value={contract.renewalPeriodMonths ? `${contract.renewalPeriodMonths} Monate` : undefined} />
                <DetailRow label="Kündigungsfrist"   value={contract.noticePeriodDays ? `${contract.noticePeriodDays} Tage` : undefined} />
                <DetailRow label="Kündigung bis"     value={formatDate(contract.cancellationDeadline)}
                  highlight={dl.urgent || dl.overdue} />
                <DetailRow label="Nächster Termin"   value={formatDate(contract.nextCancellationDate)} />
              </div>
            </Card>

            {/* Konditionen */}
            <Card>
              <CardHeader>
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <CreditCard size={16} className="text-gray-400" /> Konditionen
                </h2>
              </CardHeader>
              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
                <DetailRow label="Betrag"     value={formatCurrency(contract.amount, contract.currency)} />
                <DetailRow label="Zahlweise"  value={paymentIntervalLabel(contract.paymentIntervalMonths)} />
                {contract.conditions && <div className="sm:col-span-2"><DetailRow label="Weitere Konditionen" value={contract.conditions} /></div>}
                {contract.notes && <div className="sm:col-span-2"><DetailRow label="Notizen" value={contract.notes} /></div>}
              </div>
            </Card>
          </div>

          {/* Rechte Spalte: Dokumente + Rechnungen */}
          <div className="space-y-5">

            {/* Dokumente */}
            <Card padding={false}>
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                  <FileText size={15} className="text-gray-400" /> Dokumente
                </h2>
                <label className="cursor-pointer">
                  <input type="file" accept=".pdf,.doc,.docx" className="sr-only"
                    onChange={(e) => handleDocUpload(e, 'contract')} />
                  <Button size="sm" variant="ghost" icon={<Upload size={13} />} loading={uploadingDoc}>
                    Hochladen
                  </Button>
                </label>
              </div>

              {!contract.documents?.length ? (
                <EmptyState icon={<FileText size={28} />} title="Keine Dokumente" description="Laden Sie Vertragsunterlagen hoch." />
              ) : (
                <ul className="divide-y divide-gray-50">
                  {contract.documents.map((doc) => (
                    <li key={doc.id} className="flex items-center gap-3 px-4 py-2.5">
                      <FileText size={14} className="text-gray-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 truncate">{doc.title}</p>
                        <p className="text-xs text-gray-400">{DOC_TYPE_LABELS[doc.type as DocumentType]} · {formatDate(doc.uploadedAt)}</p>
                      </div>
                      <button onClick={() => openPaperless(doc.paperlessDocumentId)}
                        className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors" title="In Paperless öffnen">
                        <Link2 size={13} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* Nachtrag hochladen */}
              <div className="px-4 py-2 border-t border-gray-100">
                <label className="cursor-pointer flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors">
                  <input type="file" accept=".pdf,.doc,.docx" className="sr-only"
                    onChange={(e) => handleDocUpload(e, 'amendment')} />
                  <Upload size={12} /> Nachtrag hochladen
                </label>
              </div>
            </Card>

            {/* Rechnungen */}
            <Card padding={false}>
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                  <Receipt size={15} className="text-gray-400" /> Rechnungen
                </h2>
                <label className="cursor-pointer">
                  <input type="file" accept=".pdf,.jpg,.png" className="sr-only"
                    onChange={handleInvoiceUpload} />
                  <Button size="sm" variant="ghost" icon={<Upload size={13} />} loading={uploadingInv}>
                    Scan
                  </Button>
                </label>
              </div>

              {!contract.invoices?.length ? (
                <EmptyState icon={<Receipt size={28} />} title="Keine Rechnungen" description="Laden Sie gescannte Rechnungen hoch." />
              ) : (
                <ul className="divide-y divide-gray-50">
                  {contract.invoices.map((inv) => (
                    <li key={inv.id} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 truncate">
                          {inv.invoiceNumber ?? 'Rechnung'} · {formatCurrency(inv.amount, inv.currency)}
                        </p>
                        <p className="text-xs text-gray-400">{formatDate(inv.invoiceDate)}</p>
                      </div>
                      <InvoiceStatusBadge status={inv.status} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function DetailRow({ label, value, highlight }: { label: string; value?: string | null; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className={`text-sm font-medium ${highlight ? 'text-orange-600' : 'text-gray-800'}`}>
        {value ?? '—'}
      </p>
    </div>
  );
}
