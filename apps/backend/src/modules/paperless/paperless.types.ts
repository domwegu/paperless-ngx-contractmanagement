export interface PaperlessDocument {
  id: number;
  title: string;
  content: string;
  tags: number[];
  correspondent: number | null;
  document_type: number | null;
  created: string;
  modified: string;
  added: string;
  archive_serial_number: string | null;
  original_file_name: string;
  archived_file_name: string | null;
}

export interface PaperlessTag {
  id: number;
  name: string;
  slug: string;
  colour: number;
  match: string;
  matching_algorithm: number;
  is_insensitive: boolean;
  is_inbox_tag: boolean;
  document_count: number;
}

export interface PaperlessCorrespondent {
  id: number;
  name: string;
  slug: string;
  match: string;
  matching_algorithm: number;
  is_insensitive: boolean;
  document_count: number;
}

export interface PaperlessDocumentType {
  id: number;
  name: string;
  slug: string;
  match: string;
  matching_algorithm: number;
  is_insensitive: boolean;
  document_count: number;
}

export interface PaperlessPaginatedResult<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface PaperlessUploadResult {
  id: number;
  task_id: string;
}

export interface PaperlessUploadOptions {
  title?: string;
  tags?: number[];
  correspondentId?: number;
  documentTypeId?: number;
  created?: string;        // ISO-Date
}
