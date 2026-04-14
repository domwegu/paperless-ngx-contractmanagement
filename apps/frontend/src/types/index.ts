export type ContractStatus = 'active' | 'expiring' | 'expired' | 'cancelled' | 'draft';
export type RenewalType    = 'manual' | 'auto_renew' | 'fixed_term';
export type DocumentType   = 'contract' | 'amendment' | 'annex' | 'termination' | 'other';
export type InvoiceStatus  = 'open' | 'paid' | 'overdue' | 'cancelled';
export type ReminderType   = 'cancellation_deadline' | 'contract_expiry' | 'invoice_due' | 'custom';
export type ReminderStatus = 'pending' | 'sent' | 'snoozed' | 'done';

export interface Contract {
  id: string;
  title: string;
  contractNumber?: string;
  partner?: string;
  partnerEmail?: string;
  category?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  signedDate?: string;
  renewalType: RenewalType;
  renewalPeriodMonths?: number;
  noticePeriodDays?: number;
  cancellationDeadline?: string;
  nextCancellationDate?: string;
  amount?: number;
  currency?: string;
  paymentIntervalMonths?: number;
  conditions?: string;
  status: ContractStatus;
  paperlessDocumentId?: number;
  notes?: string;
  documents?: ContractDocument[];
  invoices?: Invoice[];
  createdAt: string;
  updatedAt: string;
}

export interface ContractDocument {
  id: string;
  contractId: string;
  type: DocumentType;
  title: string;
  paperlessDocumentId: number;
  fileName: string;
  mimeType: string;
  notes?: string;
  uploadedAt: string;
}

export interface Invoice {
  id: string;
  contractId: string;
  invoiceNumber?: string;
  invoiceDate: string;
  dueDate?: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  paperlessDocumentId?: number;
  notes?: string;
}

export interface Reminder {
  id: string;
  contractId: string;
  contract?: Contract;
  type: ReminderType;
  status: ReminderStatus;
  dueDate: string;
  referenceDate?: string;
  title?: string;
  message?: string;
  daysBefore?: number;
}

export interface ReminderSummary {
  overdue: number;
  next30days: number;
  next90days: number;
  reminders: Reminder[];
}

export interface PaginatedResult<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; pages: number };
}
