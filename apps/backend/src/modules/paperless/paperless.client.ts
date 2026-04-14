import { Injectable, Logger, BadGatewayException } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import * as FormData from 'form-data';
import {
  PaperlessDocument,
  PaperlessTag,
  PaperlessCorrespondent,
  PaperlessDocumentType,
  PaperlessPaginatedResult,
  PaperlessUploadOptions,
} from './paperless.types';

@Injectable()
export class PaperlessClient {
  private readonly logger = new Logger(PaperlessClient.name);

  buildClient(baseUrl: string, apiToken: string): AxiosInstance {
    const client = axios.create({
      baseURL: baseUrl.replace(/\/$/, '') + '/api',
      headers: {
        Authorization: `Token ${apiToken}`,
        Accept: 'application/json; version=4',
      },
      timeout: 30_000,
    });

    client.interceptors.response.use(
      (res) => res,
      (err) => {
        const status  = err.response?.status;
        const message = err.response?.data?.detail ?? err.message;
        this.logger.error(`Paperless API Fehler [${status}]: ${message}`);
        if (status === 401) throw new BadGatewayException('Paperless: Ungültiger API-Token');
        if (status === 404) throw new BadGatewayException('Paperless: Ressource nicht gefunden');
        throw new BadGatewayException(`Paperless API: ${message}`);
      },
    );
    return client;
  }

  // ─── Dokumente ───────────────────────────────

  async getDocuments(http: AxiosInstance, params?: any): Promise<PaperlessPaginatedResult<PaperlessDocument>> {
    const res = await http.get('/documents/', { params });
    return res.data;
  }

  async getDocument(http: AxiosInstance, id: number): Promise<PaperlessDocument> {
    const res = await http.get(`/documents/${id}/`);
    return res.data;
  }

  async getDocumentDownloadUrl(baseUrl: string, id: number): Promise<string> {
    return `${baseUrl.replace(/\/$/, '')}/api/documents/${id}/download/`;
  }

  async getDocumentPreviewUrl(baseUrl: string, id: number): Promise<string> {
    return `${baseUrl.replace(/\/$/, '')}/api/documents/${id}/preview/`;
  }

  async uploadDocument(
    http: AxiosInstance,
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    options: PaperlessUploadOptions = {},
  ): Promise<number> {
    const form = new FormData();
    form.append('document', fileBuffer, { filename: fileName, contentType: mimeType });
    if (options.title)           form.append('title', options.title);
    if (options.created)         form.append('created', options.created);
    if (options.correspondentId) form.append('correspondent', String(options.correspondentId));
    if (options.documentTypeId)  form.append('document_type', String(options.documentTypeId));
    if (options.tags?.length)    options.tags.forEach((t) => form.append('tags', String(t)));

    let taskId: string;
    try {
      const res = await http.post('/documents/post_document/', form, {
        headers: form.getHeaders(),
        timeout: 60_000,
      });
      taskId = res.data?.task_id ?? res.data?.id;
    } catch (err: any) {
      // Paperless gibt manchmal 400 bei Duplikaten — trotzdem nach Titel suchen
      if (err?.response?.status === 400) {
        this.logger.warn(`Upload abgelehnt (400), suche nach bestehendem Dokument: ${options.title}`);
        const existing = await this.findDocumentByTitle(http, options.title ?? fileName);
        if (existing) {
          this.logger.log(`Bestehendes Dokument gefunden: ID ${existing.id}`);
          return existing.id;
        }
      }
      throw err;
    }

    if (!taskId) throw new BadGatewayException('Paperless: Kein Task-ID im Upload-Response');
    return this.pollTaskForDocumentId(http, taskId, options.title ?? fileName);
  }

  async updateDocument(http: AxiosInstance, id: number, patch: any): Promise<PaperlessDocument> {
    const res = await http.patch(`/documents/${id}/`, patch);
    return res.data;
  }

  async deleteDocument(http: AxiosInstance, id: number): Promise<void> {
    await http.delete(`/documents/${id}/`);
  }

  // ─── Tags ────────────────────────────────────

  async getTags(http: AxiosInstance): Promise<PaperlessTag[]> {
    const res = await http.get('/tags/?page_size=500');
    return res.data.results;
  }

  async createTag(http: AxiosInstance, name: string, colour = 1): Promise<PaperlessTag> {
    const res = await http.post('/tags/', { name, colour });
    return res.data;
  }

  async findOrCreateTag(http: AxiosInstance, name: string): Promise<PaperlessTag> {
    const tags = await this.getTags(http);
    return tags.find((t) => t.name.toLowerCase() === name.toLowerCase()) ?? this.createTag(http, name);
  }

  // ─── Korrespondenten ─────────────────────────

  async getCorrespondents(http: AxiosInstance): Promise<PaperlessCorrespondent[]> {
    const res = await http.get('/correspondents/?page_size=500');
    return res.data.results;
  }

  async createCorrespondent(http: AxiosInstance, name: string): Promise<PaperlessCorrespondent> {
    const res = await http.post('/correspondents/', { name });
    return res.data;
  }

  async findOrCreateCorrespondent(http: AxiosInstance, name: string): Promise<PaperlessCorrespondent> {
    const list = await this.getCorrespondents(http);
    return list.find((c) => c.name.toLowerCase() === name.toLowerCase()) ?? this.createCorrespondent(http, name);
  }

  // ─── Document Types ───────────────────────────

  async getDocumentTypes(http: AxiosInstance): Promise<PaperlessDocumentType[]> {
    const res = await http.get('/document_types/?page_size=200');
    return res.data.results;
  }

  async findOrCreateDocumentType(http: AxiosInstance, name: string): Promise<PaperlessDocumentType> {
    const list = await this.getDocumentTypes(http);
    if (list.find((d) => d.name.toLowerCase() === name.toLowerCase())) return list.find((d) => d.name.toLowerCase() === name.toLowerCase())!;
    const res = await http.post('/document_types/', { name });
    return res.data;
  }

  // ─── Verbindungstest ─────────────────────────

  async testConnection(baseUrl: string, apiToken: string): Promise<boolean> {
    try {
      const http = this.buildClient(baseUrl, apiToken);
      await http.get('/documents/?page_size=1');
      return true;
    } catch { return false; }
  }

  // ─── Hilfsmethoden ───────────────────────────

  private async findDocumentByTitle(http: AxiosInstance, title: string): Promise<PaperlessDocument | null> {
    try {
      const res = await http.get('/documents/', { params: { title__icontains: title, page_size: 5 } });
      return res.data.results?.[0] ?? null;
    } catch { return null; }
  }

  private async pollTaskForDocumentId(
    http: AxiosInstance,
    taskId: string,
    fallbackTitle: string,
    maxAttempts = 20,
    intervalMs = 1500,
  ): Promise<number> {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, intervalMs));
      try {
        const res = await http.get(`/tasks/?task_id=${taskId}`);
        const task = res.data?.results?.[0] ?? res.data?.[0];

        if (task?.status === 'SUCCESS' && task?.related_document) {
          return task.related_document;
        }
        if (task?.status === 'FAILURE') {
          // Bei Duplikat-Fehler: Dokument per Titel suchen
          this.logger.warn(`Task fehlgeschlagen: ${task.result} — suche nach bestehendem Dokument`);
          const existing = await this.findDocumentByTitle(http, fallbackTitle);
          if (existing) return existing.id;
          throw new BadGatewayException(`Paperless Verarbeitung fehlgeschlagen: ${task.result}`);
        }
      } catch (e: any) {
        if (e instanceof BadGatewayException) throw e;
      }
    }
    // Timeout: Dokument trotzdem per Titel suchen bevor wir aufgeben
    const existing = await this.findDocumentByTitle(http, fallbackTitle);
    if (existing) return existing.id;
    throw new BadGatewayException('Paperless: Dokument-ID nach Upload nicht ermittelbar (Timeout)');
  }
}
