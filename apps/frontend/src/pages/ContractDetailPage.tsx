import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Edit2, Upload, FileText, Receipt,
  Bell, Calendar, Building2, CreditCard, Link2,
  Trash2, XCircle, ChevronDown, Pencil
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { TopBar } from '../components/layout/TopBar';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ContractStatusBadge, InvoiceStatusBadge } from '../components/ui/Badge';
import { PageSpinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { useContract, useUpdateContract } from '../hooks/useContracts';
import { useQueryClient } from '@tanstack/react-query';
import { formatDate, formatCurrency, formatDaysUntil, paymentIntervalLabel } from '../utils/format';
import { api } from '../services/api';
import { DocumentType, ContractStatus, InvoiceStatus } from '../types';

const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  contract:    'Hauptvertrag',
  amendment:   'Nachtrag',
  annex:       'Anlage',
  termination: 'Kündigung',
  other:       'Sonstiges',
};

const DOC_TYPE_OPTIONS = Object.entries(DOC_TYPE_LABELS).map(([value, label]) => ({ value, label }));

const STATUS_OPTIONS = [
  { value: 'draft',     label: 'Entwurf' },
  { value: 'active',    label: 'Aktiv' },
  { value: 'expiring',  label: 'Läuft ab' },
  { value: 'expired',   label: 'Abgelaufen' },
  { value: 'cancelled', label: 'Gekündigt / Ungültig' },
];

const INVOICE_STATUS_OPTIONS = [
  { value: 'open',      label: 'Offen' },
  { value: 'paid',      label: 'Bezahlt' },
  { value: 'overdue',   label: 'Überfällig' },
  { value: 'cancelled', label: 'Storniert' },
];

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate  = useNavigate();
  const { data: contract, isLoading, refetch } = useContract(id!);
  const updateContract = useUpdateContract(id!);
  const queryClient = useQueryClient();

  // Refs für hidden file inputs
  const docInputRef = useRef<HTMLInputElement>(null);
  const invInputRef = useRef<HTMLInputElement>(null);

  const [uploadingDoc,    setUploadingDoc]    = useState(false);
  const [uploadingInv,    setUploadingInv]    = useState(false);
  const [uploadError,     setUploadError]     = useState<string | null>(null);
  const [docType,         setDocType]         = useState<DocumentType>('contract');
  const [showDocModal,    setShowDocModal]    = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDeleteModal,  setShowDeleteModal]  = useState(false);
  const [editInvoice,      setEditInvoice]      = useState<any | null>(null);
  const [invoiceForm,      setInvoiceForm]      = useState({ invoiceNumber: '', invoiceDate: '', dueDate: '', amount: '', currency: 'EUR', notes: '' });
  const [newStatus,       setNewStatus]       = useState<ContractStatus>('active');
  const [pendingFile,     setPendingFile]     = useState<File | null>(null);

  // ─── Dokument: Datei gewählt → Typ-Modal öffnen ──

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setDocType('contract');
    setShowDocModal(true);
    e.target.value = '';
  };

  // ─── Dokument: Upload nach Typ-Auswahl ───────────

  const confirmDocUpload = async () => {
    if (!pendingFile) return;
    setShowDocModal(false);
    setUploadingDoc(true);
    setUploadError(null);
    const form = new FormData();
    form.append('file', pendingFile);
    form.append('type', docType);
    form.append('title', pendingFile.name.replace(/\.[^/.]+$/, ''));
    try {
      await api.post(`/contracts/${id}/documents`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await queryClient.invalidateQueries({ queryKey: ['contracts', id] });
      await refetch();
    } catch (err: any) {
      setUploadError(err.response?.data?.message ?? 'Upload fehlgeschlagen');
    } finally {
      setUploadingDoc(false);
      setPendingFile(null);
    }
  };

  // ─── Rechnung: Upload ────────────────────────────

  const handleInvoiceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingInv(true);
    setUploadError(null);
    const form = new FormData();
    form.append('file', file);
    form.append('invoiceDate', new Date().toISOString().split('T')[0]);
    form.append('amount', '0');  // wird 0, kann nachträglich bearbeitet werden
    try {
      await api.post(`/contracts/${id}/invoices/upload`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await queryClient.invalidateQueries({ queryKey: ['contracts', id] });
      await refetch();
    } catch (err: any) {
      setUploadError(err.response?.data?.message ?? 'Rechnungs-Upload fehlgeschlagen');
    } finally {
      setUploadingInv(false);
      e.target.value = '';
    }
  };

  const updateInvoiceStatus = async (invoiceId: string, status: InvoiceStatus) => {
    await api.patch(`/contracts/${id}/invoices/${invoiceId}/status`, { status });
    refetch();
  };

  const openEditInvoice = (inv: any) => {
    setInvoiceForm({
      invoiceNumber: inv.invoiceNumber ?? '',
      invoiceDate:   inv.invoiceDate?.split('T')[0] ?? '',
      dueDate:       inv.dueDate?.split('T')[0] ?? '',
      amount:        String(inv.amount ?? '0'),
      currency:      inv.currency ?? 'EUR',
      notes:         inv.notes ?? '',
    });
    setEditInvoice(inv);
  };

  const saveInvoice = async () => {
    if (!editInvoice) return;
    await api.patch(`/contracts/${id}/invoices/${editInvoice.id}`, {
      ...invoiceForm,
      amount: Number(invoiceForm.amount),
    });
    setEditInvoice(null);
    await queryClient.invalidateQueries({ queryKey: ['contracts', id] });
    await refetch();
  };

  const openPaperless = (docId: number) => {
    // Backend-Proxy: JWT wird serverseitig an Paperless weitergegeben
    const token = localStorage.getItem('accessToken');
    const url = `/api/paperless/documents/${docId}/preview`;
    // Neues Fenster mit Token im Header geht nicht direkt —
    // wir öffnen einen Blob-URL
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        if (!r.ok) throw new Error('Nicht erreichbar');
        return r.blob();
      })
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
      })
      .catch(() => alert('Dokument in Paperless nicht erreichbar'));
  };

  const confirmStatusChange = async () => {
    await updateContract.mutateAsync({ status: newStatus });
    setShowStatusModal(false);
    refetch();
  };

  const confirmDelete = async () => {
    await api.delete(`/contracts/${id}`);
    navigate('/contracts');
  };

  if (isLoading) return <AppLayout><PageSpinner /></AppLayout>;
  if (!contract)  return <AppLayout><div className="p-8 text-gray-500">Vertrag nicht gefunden</div></AppLayout>;

  const dl = formatDaysUntil(contract.cancellationDeadline);

  return (
    <AppLayout>
      {/* Versteckte File-Inputs — außerhalb jeglicher Labels/Buttons */}
      <input
        ref={docInputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        className="hidden"
        onChange={handleFileSelect}
      />
      <input
        ref={invInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.tiff"
        className="hidden"
        onChange={handleInvoiceUpload}
      />

      <TopBar
        title={contract.title}
        subtitle={contract.contractNumber ? `Nr. ${contract.contractNumber}` : undefined}
        actions={
          <div className="flex items-center gap-2">
            <ContractStatusBadge status={contract.status} />
            <Button variant="secondary" size="sm" icon={<ChevronDown size={14} />}
              onClick={() => { setNewStatus(contract.status as ContractStatus); setShowStatusModal(true); }}>
              Status
            </Button>
            <Button variant="secondary" size="sm" icon={<Edit2 size={14} />}
              onClick={() => navigate(`/contracts/${id}/edit`)}>
              Bearbeiten
            </Button>
            <Button variant="danger" size="sm" icon={<Trash2 size={14} />}
              onClick={() => setShowDeleteModal(true)}>
              Löschen
            </Button>
          </div>
        }
      />

      <div className="p-6 animate-fade">
        <button onClick={() => navigate('/contracts')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-5 transition-colors">
          <ArrowLeft size={14} /> Zurück zur Liste
        </button>

        {uploadError && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 text-red-700">
            <XCircle size={16} />
            <p className="text-sm flex-1">{uploadError}</p>
            <button onClick={() => setUploadError(null)} className="text-red-400 hover:text-red-600">
              <XCircle size={14} />
            </button>
          </div>
        )}

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

          {/* Linke Spalte */}
          <div className="lg:col-span-2 space-y-5">
            <Card>
              <CardHeader>
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Building2 size={16} className="text-gray-400" /> Vertragspartner
                </h2>
              </CardHeader>
              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
                <DetailRow label="Partner"    value={contract.partner} />
                <DetailRow label="E-Mail"     value={contract.partnerEmail} />
                <DetailRow label="Adresse"    value={contract.partnerAddress} />
                <DetailRow label="Telefon"    value={contract.partnerPhone} />
                <DetailRow label="Kategorie"  value={contract.category} />
                {contract.description && <div className="sm:col-span-2"><DetailRow label="Beschreibung" value={contract.description} /></div>}
              </div>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Calendar size={16} className="text-gray-400" /> Laufzeit & Fristen
                </h2>
              </CardHeader>
              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
                <DetailRow label="Abschluss"        value={formatDate(contract.signedDate)} />
                <DetailRow label="Beginn"           value={formatDate(contract.startDate)} />
                <DetailRow label="Ende"             value={formatDate(contract.endDate)} />
                <DetailRow label="Verlängerungsart" value={contract.renewalType === 'auto_renew' ? 'Automatisch' : contract.renewalType === 'fixed_term' ? 'Befristet' : 'Manuell'} />
                <DetailRow label="Verlängerung um"  value={contract.renewalPeriodMonths ? `${contract.renewalPeriodMonths} Monate` : undefined} />
                <DetailRow label="Kündigungsfrist"  value={contract.noticePeriodDays ? `${contract.noticePeriodDays} Tage` : undefined} />
                <DetailRow label="Kündigung bis"    value={formatDate(contract.cancellationDeadline)} highlight={dl.urgent || dl.overdue} />
                <DetailRow label="Nächster Termin"  value={formatDate(contract.nextCancellationDate)} />
              </div>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <CreditCard size={16} className="text-gray-400" /> Konditionen
                </h2>
              </CardHeader>
              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
                <DetailRow label="Betrag"    value={formatCurrency(contract.amount, contract.currency)} />
                <DetailRow label="Zahlweise" value={paymentIntervalLabel(contract.paymentIntervalMonths)} />
                {contract.conditions && <div className="sm:col-span-2"><DetailRow label="Konditionen" value={contract.conditions} /></div>}
                {contract.notes      && <div className="sm:col-span-2"><DetailRow label="Notizen"     value={contract.notes} /></div>}
              </div>
            </Card>
          </div>

          {/* Rechte Spalte */}
          <div className="space-y-5">

            {/* Dokumente */}
            <Card padding={false}>
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                  <FileText size={15} className="text-gray-400" />
                  Dokumente
                  {!!contract.documents?.length && (
                    <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-1.5 py-0.5">
                      {contract.documents.length}
                    </span>
                  )}
                </h2>
                {/* Button triggert ref statt label-Wrapper */}
                <Button
                  size="sm" variant="ghost"
                  icon={<Upload size={13} />}
                  loading={uploadingDoc}
                  onClick={() => docInputRef.current?.click()}
                >
                  Hochladen
                </Button>
              </div>

              {!contract.documents?.length ? (
                <EmptyState icon={<FileText size={28} />} title="Keine Dokumente"
                  description="Laden Sie Vertragsunterlagen hoch." />
              ) : (
                <ul className="divide-y divide-gray-50">
                  {contract.documents.map((doc) => (
                    <li key={doc.id} className="flex items-center gap-3 px-4 py-2.5">
                      <FileText size={14} className="text-gray-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 truncate">{doc.title}</p>
                        <p className="text-xs text-gray-400">
                          {DOC_TYPE_LABELS[doc.type as DocumentType]} · {formatDate(doc.uploadedAt)}
                        </p>
                      </div>
                      {doc.paperlessDocumentId ? (
                        <button onClick={() => openPaperless(doc.paperlessDocumentId!)}
                          className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors"
                          title="In Paperless öffnen">
                          <Link2 size={13} />
                        </button>
                      ) : (
                        <span className="text-xs text-orange-400 px-1" title="Paperless verarbeitet noch...">⏳</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* Rechnungen */}
            <Card padding={false}>
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                  <Receipt size={15} className="text-gray-400" />
                  Rechnungen
                  {!!contract.invoices?.length && (
                    <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-1.5 py-0.5">
                      {contract.invoices.length}
                    </span>
                  )}
                </h2>
                <Button
                  size="sm" variant="ghost"
                  icon={<Upload size={13} />}
                  loading={uploadingInv}
                  title="Gescannte Rechnung hochladen → wird in Paperless abgelegt und dem Vertrag zugeordnet"
                  onClick={() => invInputRef.current?.click()}
                >
                  Scan
                </Button>
              </div>

              {!contract.invoices?.length ? (
                <EmptyState icon={<Receipt size={28} />} title="Keine Rechnungen"
                  description="PDF oder Scan hochladen — wird automatisch in Paperless abgelegt." />
              ) : (
                <ul className="divide-y divide-gray-50">
                  {contract.invoices.map((inv) => (
                    <li key={inv.id} className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {inv.invoiceNumber ? `Nr. ${inv.invoiceNumber}` : 'Rechnung'}
                          </p>
                          <p className="text-xs text-gray-400">
                            {formatDate(inv.invoiceDate)}
                            {inv.dueDate && ` · fällig ${formatDate(inv.dueDate)}`}
                          </p>
                        </div>
                        <p className="text-sm font-medium tabular text-gray-800 flex-shrink-0">
                          {formatCurrency(inv.amount, inv.currency)}
                        </p>
                        <button onClick={() => openEditInvoice(inv)}
                          className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Rechnung bearbeiten">
                          <Pencil size={13} />
                        </button>
                        {inv.paperlessDocumentId && (
                          <button onClick={() => openPaperless(inv.paperlessDocumentId!)}
                            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors"
                            title="In Paperless öffnen">
                            <Link2 size={13} />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <InvoiceStatusBadge status={inv.status} />
                        <select
                          value={inv.status}
                          onChange={(e) => updateInvoiceStatus(inv.id, e.target.value as InvoiceStatus)}
                          className="text-xs text-gray-500 border-0 bg-transparent cursor-pointer hover:text-gray-800 focus:outline-none"
                        >
                          {INVOICE_STATUS_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Modal: Dokumenttyp */}
      <Modal open={showDocModal} onClose={() => setShowDocModal(false)} title="Dokumenttyp wählen" size="sm">
        <p className="text-sm text-gray-600 mb-4">
          Datei: <span className="font-medium">{pendingFile?.name}</span>
        </p>
        <Select
          label="Dokumenttyp"
          options={DOC_TYPE_OPTIONS}
          value={docType}
          onChange={(e) => setDocType(e.target.value as DocumentType)}
        />
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="secondary" onClick={() => setShowDocModal(false)}>Abbrechen</Button>
          <Button icon={<Upload size={14} />} onClick={confirmDocUpload}>Hochladen</Button>
        </div>
      </Modal>

      {/* Modal: Status */}
      <Modal open={showStatusModal} onClose={() => setShowStatusModal(false)} title="Status ändern" size="sm">
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-gray-600">Aktuell:</span>
          <ContractStatusBadge status={contract.status} />
        </div>
        <Select
          label="Neuer Status"
          options={STATUS_OPTIONS}
          value={newStatus}
          onChange={(e) => setNewStatus(e.target.value as ContractStatus)}
        />
        <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2 mt-3">
          Der Cron-Job aktualisiert den Status täglich automatisch um 07:00.
          Manuelle Änderungen sind jederzeit möglich.
        </p>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="secondary" onClick={() => setShowStatusModal(false)}>Abbrechen</Button>
          <Button onClick={confirmStatusChange} loading={updateContract.isPending}>Speichern</Button>
        </div>
      </Modal>

      {/* Modal: Löschen */}
      <Modal open={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Vertrag löschen" size="sm">
        <div className="flex items-start gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <Trash2 size={18} className="text-red-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900 mb-1">„{contract.title}" löschen?</p>
            <p className="text-sm text-gray-500">
              Der Datensatz wird gelöscht. Dokumente in Paperless bleiben erhalten.
              Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Abbrechen</Button>
          <Button variant="danger" icon={<Trash2 size={14} />} onClick={confirmDelete}>Löschen</Button>
        </div>
      </Modal>
      {/* Modal: Rechnung bearbeiten */}
      <Modal open={!!editInvoice} onClose={() => setEditInvoice(null)} title="Rechnung bearbeiten" size="sm">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Rechnungsnummer" value={invoiceForm.invoiceNumber}
              onChange={(e) => setInvoiceForm(f => ({ ...f, invoiceNumber: e.target.value }))}
              placeholder="RE-2024-001" />
            <Input label="Währung" value={invoiceForm.currency}
              onChange={(e) => setInvoiceForm(f => ({ ...f, currency: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Rechnungsdatum" type="date" value={invoiceForm.invoiceDate}
              onChange={(e) => setInvoiceForm(f => ({ ...f, invoiceDate: e.target.value }))} />
            <Input label="Fällig am" type="date" value={invoiceForm.dueDate}
              onChange={(e) => setInvoiceForm(f => ({ ...f, dueDate: e.target.value }))} />
          </div>
          <Input label="Betrag" type="number" min={0} step="0.01" value={invoiceForm.amount}
            onChange={(e) => setInvoiceForm(f => ({ ...f, amount: e.target.value }))}
            placeholder="0.00" />
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Notizen</label>
            <textarea value={invoiceForm.notes} rows={2}
              onChange={(e) => setInvoiceForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all resize-none"
              placeholder="Optionale Notizen…" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="secondary" onClick={() => setEditInvoice(null)}>Abbrechen</Button>
          <Button onClick={saveInvoice}>Speichern</Button>
        </div>
      </Modal>

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
