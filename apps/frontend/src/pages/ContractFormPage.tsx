import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { TopBar } from '../components/layout/TopBar';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { useContract, useCreateContract, useUpdateContract } from '../hooks/useContracts';

type FormData = {
  title: string; contractNumber: string; partner: string;
  partnerEmail: string; partnerAddress: string; partnerPhone: string;
  category: string; description: string;
  startDate: string; endDate: string; signedDate: string;
  renewalType: string; renewalPeriodMonths: string; noticePeriodDays: string;
  amount: string; currency: string; paymentIntervalMonths: string;
  conditions: string; notes: string;
};

const RENEWAL_OPTIONS = [
  { value: 'auto_renew',  label: 'Automatische Verlängerung' },
  { value: 'fixed_term',  label: 'Befristete Laufzeit' },
  { value: 'manual',      label: 'Manuell (kein Auto-Renewal)' },
];
const CURRENCY_OPTIONS  = [{ value: 'EUR', label: 'EUR' }, { value: 'USD', label: 'USD' }, { value: 'CHF', label: 'CHF' }];
const INTERVAL_OPTIONS  = [
  { value: '1',  label: 'Monatlich' }, { value: '3', label: 'Vierteljährlich' },
  { value: '6',  label: 'Halbjährlich' }, { value: '12', label: 'Jährlich' },
];

export default function ContractFormPage() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id && id !== 'new';
  const navigate = useNavigate();

  const { data: existing } = useContract(isEdit ? id! : '');
  const createMutation = useCreateContract();
  const updateMutation = useUpdateContract(id ?? '');

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    defaultValues: { currency: 'EUR', renewalType: 'auto_renew' },
  });

  useEffect(() => {
    if (existing && isEdit) {
      reset({
        ...existing,
        amount:                String(existing.amount ?? ''),
        renewalPeriodMonths:   String(existing.renewalPeriodMonths ?? ''),
        noticePeriodDays:      String(existing.noticePeriodDays ?? ''),
        paymentIntervalMonths: String(existing.paymentIntervalMonths ?? ''),
        startDate: existing.startDate?.split('T')[0] ?? '',
        endDate:   existing.endDate?.split('T')[0]   ?? '',
        signedDate: existing.signedDate?.split('T')[0] ?? '',
      });
    }
  }, [existing, isEdit, reset]);

  const onSubmit = async (data: FormData) => {
    const payload = {
      ...data,
      amount:                data.amount               ? Number(data.amount)               : undefined,
      renewalPeriodMonths:   data.renewalPeriodMonths  ? Number(data.renewalPeriodMonths)  : undefined,
      noticePeriodDays:      data.noticePeriodDays     ? Number(data.noticePeriodDays)     : undefined,
      paymentIntervalMonths: data.paymentIntervalMonths ? Number(data.paymentIntervalMonths) : undefined,
      startDate:  data.startDate  || undefined,
      endDate:    data.endDate    || undefined,
      signedDate: data.signedDate || undefined,
    };
    try {
      if (isEdit) {
        await updateMutation.mutateAsync(payload);
        navigate(`/contracts/${id}`);
      } else {
        const created = await createMutation.mutateAsync(payload);
        navigate(`/contracts/${created.id}`);
      }
    } catch {}
  };

  return (
    <AppLayout>
      <TopBar
        title={isEdit ? 'Vertrag bearbeiten' : 'Neuer Vertrag'}
        actions={
          <Button type="submit" form="contract-form" loading={isSubmitting} icon={<Save size={14} />}>
            Speichern
          </Button>
        }
      />

      <div className="p-6 animate-fade">
        <button onClick={() => navigate(isEdit ? `/contracts/${id}` : '/contracts')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-5 transition-colors">
          <ArrowLeft size={14} /> Zurück
        </button>

        <form id="contract-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5 max-w-3xl">

          {/* Grunddaten */}
          <Card>
            <h2 className="font-semibold text-gray-900 mb-4">Grunddaten</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Input label="Titel *" placeholder="z.B. Mietvertrag Büro" {...register('title', { required: 'Pflichtfeld' })} error={errors.title?.message} />
              </div>
              <Input label="Vertragsnummer" placeholder="VTR-2024-001" {...register('contractNumber')} />
              <Input label="Kategorie" placeholder="z.B. Miete, Software, Versicherung" {...register('category')} />
              <Input label="Abschlussdatum" type="date" {...register('signedDate')} />
              <Input label="Beschreibung" placeholder="Optionale Beschreibung" {...register('description')} />
            </div>
          </Card>

          {/* Vertragspartner */}
          <Card>
            <h2 className="font-semibold text-gray-900 mb-4">Vertragspartner</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="Name *" placeholder="Firma / Person" {...register('partner')} />
              <Input label="E-Mail" type="email" {...register('partnerEmail')} />
              <Input label="Adresse" placeholder="Straße, PLZ Ort" {...register('partnerAddress')} />
              <Input label="Telefon" {...register('partnerPhone')} />
            </div>
          </Card>

          {/* Laufzeit */}
          <Card>
            <h2 className="font-semibold text-gray-900 mb-4">Laufzeit & Fristen</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="Beginn" type="date" {...register('startDate')} />
              <Input label="Ende" type="date" {...register('endDate')} />
              <Select label="Verlängerungsart" options={RENEWAL_OPTIONS} {...register('renewalType')} />
              <Input label="Verlängerung um (Monate)" type="number" min={1} placeholder="12" {...register('renewalPeriodMonths')} />
              <Input label="Kündigungsfrist (Tage)" type="number" min={0} placeholder="90"
                hint="Wird zur automatischen Berechnung des Kündigungstermins verwendet"
                {...register('noticePeriodDays')} />
            </div>
          </Card>

          {/* Konditionen */}
          <Card>
            <h2 className="font-semibold text-gray-900 mb-4">Konditionen</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="Betrag" type="number" min={0} step="0.01" placeholder="0,00" {...register('amount')} />
              <Select label="Währung" options={CURRENCY_OPTIONS} {...register('currency')} />
              <Select label="Zahlungsintervall" options={INTERVAL_OPTIONS} placeholder="Bitte wählen" {...register('paymentIntervalMonths')} />
            </div>
            <div className="mt-4">
              <label className="text-xs font-medium text-gray-700 block mb-1">Konditionen / Sondervereinbarungen</label>
              <textarea
                {...register('conditions')}
                rows={3}
                className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all resize-none"
                placeholder="Optionale Konditionen…"
              />
            </div>
            <div className="mt-3">
              <label className="text-xs font-medium text-gray-700 block mb-1">Interne Notizen</label>
              <textarea
                {...register('notes')}
                rows={2}
                className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all resize-none"
                placeholder="Interne Notizen (nicht im Dokument)…"
              />
            </div>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" loading={isSubmitting} icon={<Save size={14} />}>
              {isEdit ? 'Änderungen speichern' : 'Vertrag anlegen'}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
