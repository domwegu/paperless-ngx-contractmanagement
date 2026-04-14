import { Injectable, BadRequestException } from '@nestjs/common';
import { AxiosInstance } from 'axios';
import { TenantsService } from '../tenants/tenants.service';
import { PaperlessClient } from './paperless.client';
import { PaperlessUploadOptions } from './paperless.types';

/**
 * PaperlessService
 * Orchestriert PaperlessClient mit den Mandanten-Credentials aus der DB.
 * Alle öffentlichen Methoden nehmen tenantId entgegen.
 */
@Injectable()
export class PaperlessService {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly paperlessClient: PaperlessClient,
  ) {}

  // ─── HTTP-Client für Mandant ──────────────────

  async getHttpClient(tenantId: string): Promise<{ http: AxiosInstance; baseUrl: string }> {
    const tenant = await this.tenantsService.findOneWithToken(tenantId);

    if (!tenant.paperlessBaseUrl || !tenant.paperlessApiToken) {
      throw new BadRequestException(
        'Paperless-NGX ist für diesen Mandanten nicht konfiguriert. ' +
        'Bitte Base-URL und API-Token in den Mandanten-Einstellungen hinterlegen.',
      );
    }

    const http = this.paperlessClient.buildClient(
      tenant.paperlessBaseUrl,
      tenant.paperlessApiToken,
    );
    return { http, baseUrl: tenant.paperlessBaseUrl };
  }

  // ─── Verbindungstest ──────────────────────────

  async testConnection(tenantId: string): Promise<{ ok: boolean; message: string }> {
    const tenant = await this.tenantsService.findOneWithToken(tenantId);
    if (!tenant.paperlessBaseUrl || !tenant.paperlessApiToken) {
      return { ok: false, message: 'Paperless nicht konfiguriert' };
    }
    const ok = await this.paperlessClient.testConnection(
      tenant.paperlessBaseUrl,
      tenant.paperlessApiToken,
    );
    return {
      ok,
      message: ok ? 'Verbindung zu Paperless-NGX erfolgreich' : 'Verbindung fehlgeschlagen — Token oder URL prüfen',
    };
  }

  // ─── Dokument-Upload ──────────────────────────

  async uploadDocument(
    tenantId: string,
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    options: PaperlessUploadOptions = {},
  ): Promise<number> {
    const { http } = await this.getHttpClient(tenantId);
    return this.paperlessClient.uploadDocument(http, fileBuffer, fileName, mimeType, options);
  }

  // ─── Dokumente abrufen ────────────────────────

  async getDocuments(tenantId: string, params?: {
    page?: number;
    search?: string;
    tags?: string;
  }) {
    const { http } = await this.getHttpClient(tenantId);
    return this.paperlessClient.getDocuments(http, {
      page: params?.page,
      search: params?.search,
      tags__id__all: params?.tags,
    });
  }

  async getDocument(tenantId: string, documentId: number) {
    const { http } = await this.getHttpClient(tenantId);
    return this.paperlessClient.getDocument(http, documentId);
  }

  async getDocumentUrls(tenantId: string, documentId: number) {
    const tenant = await this.tenantsService.findOneWithToken(tenantId);
    return {
      download: await this.paperlessClient.getDocumentDownloadUrl(tenant.paperlessBaseUrl, documentId),
      preview:  await this.paperlessClient.getDocumentPreviewUrl(tenant.paperlessBaseUrl, documentId),
    };
  }

  async deleteDocument(tenantId: string, documentId: number): Promise<void> {
    const { http } = await this.getHttpClient(tenantId);
    return this.paperlessClient.deleteDocument(http, documentId);
  }

  // ─── Tags ─────────────────────────────────────

  async getTags(tenantId: string) {
    const { http } = await this.getHttpClient(tenantId);
    return this.paperlessClient.getTags(http);
  }

  async findOrCreateTag(tenantId: string, name: string) {
    const { http } = await this.getHttpClient(tenantId);
    return this.paperlessClient.findOrCreateTag(http, name);
  }

  // ─── Korrespondenten ──────────────────────────

  async getCorrespondents(tenantId: string) {
    const { http } = await this.getHttpClient(tenantId);
    return this.paperlessClient.getCorrespondents(http);
  }

  async findOrCreateCorrespondent(tenantId: string, name: string) {
    const { http } = await this.getHttpClient(tenantId);
    return this.paperlessClient.findOrCreateCorrespondent(http, name);
  }

  // ─── Document Types ───────────────────────────

  async findOrCreateDocumentType(tenantId: string, name: string) {
    const { http } = await this.getHttpClient(tenantId);
    return this.paperlessClient.findOrCreateDocumentType(http, name);
  }

  /**
   * Hochlevel-Hilfsmethode: Upload + automatisch Korrespondent und Tags setzen
   */
  async uploadWithMetadata(
    tenantId: string,
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    meta: {
      title: string;
      correspondentName?: string;
      documentTypeName?: string;
      tagNames?: string[];
      created?: string;
    },
  ): Promise<number> {
    const { http } = await this.getHttpClient(tenantId);

    const options: PaperlessUploadOptions = {
      title: meta.title,
      created: meta.created,
    };

    // Korrespondent
    if (meta.correspondentName) {
      const c = await this.paperlessClient.findOrCreateCorrespondent(http, meta.correspondentName);
      options.correspondentId = c.id;
    }

    // Document Type
    if (meta.documentTypeName) {
      const dt = await this.paperlessClient.findOrCreateDocumentType(http, meta.documentTypeName);
      options.documentTypeId = dt.id;
    }

    // Tags
    if (meta.tagNames?.length) {
      const tagIds: number[] = [];
      for (const name of meta.tagNames) {
        const tag = await this.paperlessClient.findOrCreateTag(http, name);
        tagIds.push(tag.id);
      }
      options.tags = tagIds;
    }

    return this.paperlessClient.uploadDocument(http, fileBuffer, fileName, mimeType, options);
  }
}
