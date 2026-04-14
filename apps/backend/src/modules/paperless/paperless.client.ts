import { Injectable, Logger, BadGatewayException } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import * as FormData from 'form-data';
import {
  PaperlessDocument, PaperlessTag, PaperlessCorrespondent,
  PaperlessDocumentType, PaperlessPaginatedResult, PaperlessUploadOptions,
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

    const uploadedAt = new Date();
    let taskId: string | null = null;

    try {
      const res = await http.post('/documents/post_document/', form, {
        headers: form.getHeaders(),
        timeout: 60_000,
      });

      const body = res.data;
      this.logger.debug(`Upload Response [${res.status}]: ${JSON.stringify(body)}`);

      // Paperless antwortet je nach Version unterschiedlich:
      if (typeof body === 'number')                          return body;           // direkte ID
      if (body?.task_id)                                     taskId = String(body.task_id);
      else if (typeof body === 'string' && body.length > 8)  taskId = body.trim(); // plain-text UUID
      else if (body?.id && typeof body.id === 'number')      return body.id;       // { id: 123 }

    } catch (err: any) {
      if (err?.response?.status === 400) {
        this.logger.warn(`Upload 400 — suche bestehendes Dokument: ${options.title ?? fileName}`);
        const existing = await this.findDocumentByTitle(http, options.title ?? fileName);
        if (existing) return existing.id;
      }
      throw err;
    }

    if (taskId) {
      return this.pollTaskForDocumentId(http, taskId, options.title ?? fileName);
    }

    // Kein Task-ID im Response (Paperless hat Dokument trotzdem angenommen)
    this.logger.warn('Kein Task-ID im Response — Fallback: warte und suche per Titel');
    return this.waitAndFindByTitle(http, options.title ?? fileName, uploadedAt);
  }

  async updateDocument(http: AxiosInstance, id: number, patch: any): Promise<PaperlessDocument> {
    const res = await http.patch(`/documents/${id}/`, patch);
    return res.data;
  }

  async deleteDocument(http: AxiosInstance, id: number): Promise<void> {
    await http.delete(`/documents/${id}/`);
  }

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
    return tags.find((t) => t.name.toLowerCase() === name.toLowerCase())
      ?? this.createTag(http, name);
  }

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
    return list.find((c) => c.name.toLowerCase() === name.toLowerCase())
      ?? this.createCorrespondent(http, name);
  }

  async getDocumentTypes(http: AxiosInstance): Promise<PaperlessDocumentType[]> {
    const res = await http.get('/document_types/?page_size=200');
    return res.data.results;
  }

  async findOrCreateDocumentType(http: AxiosInstance, name: string): Promise<PaperlessDocumentType> {
    const list = await this.getDocumentTypes(http);
    const existing = list.find((d) => d.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing;
    const res = await http.post('/document_types/', { name });
    return res.data;
  }

  async testConnection(baseUrl: string, apiToken: string): Promise<boolean> {
    try {
      const http = this.buildClient(baseUrl, apiToken);
      await http.get('/documents/?page_size=1');
      return true;
    } catch { return false; }
  }

  private async findDocumentByTitle(http: AxiosInstance, title: string): Promise<PaperlessDocument | null> {
    try {
      const res = await http.get('/documents/', {
        params: { title__icontains: title, page_size: 5, ordering: '-added' },
      });
      return res.data.results?.[0] ?? null;
    } catch { return null; }
  }

  private async waitAndFindByTitle(
    http: AxiosInstance,
    title: string,
    uploadedAt: Date,
    maxAttempts = 15,
    intervalMs = 2000,
  ): Promise<number> {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, intervalMs));
      const doc = await this.findDocumentByTitle(http, title);
      if (doc) {
        const diffMs = new Date(doc.added).getTime() - uploadedAt.getTime();
        if (diffMs > -10_000) {  // max 10s Toleranz
          this.logger.log(`Dokument per Titel gefunden: ID ${doc.id}`);
          return doc.id;
        }
      }
    }
    throw new BadGatewayException(
      'Paperless: Dokument wurde hochgeladen, konnte aber nicht automatisch verknüpft werden. ' +
      'Bitte prüfen Sie Paperless und tragen Sie die ID ggf. manuell nach.',
    );
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
        const res  = await http.get(`/tasks/?task_id=${taskId}`);
        const task = res.data?.results?.[0] ?? res.data?.[0];
        this.logger.debug(`Task [${i+1}/${maxAttempts}] status=${task?.status} doc=${task?.related_document}`);

        if (task?.status === 'SUCCESS' && task?.related_document) return task.related_document;
        if (task?.status === 'FAILURE') {
          const doc = await this.findDocumentByTitle(http, fallbackTitle);
          if (doc) return doc.id;
          throw new BadGatewayException(`Paperless Task fehlgeschlagen: ${task.result}`);
        }
      } catch (e: any) {
        if (e instanceof BadGatewayException) throw e;
      }
    }
    const doc = await this.findDocumentByTitle(http, fallbackTitle);
    if (doc) return doc.id;
    throw new BadGatewayException('Paperless: Timeout beim Warten auf Dokument-ID');
  }
}
