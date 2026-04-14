import {
  Controller, Get, Delete, Query, Param,
  UseGuards, UseInterceptors, UploadedFile,
  ParseIntPipe, Body, Post, Res
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { PaperlessService } from './paperless.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, UserRole } from '../users/user.entity';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import axios from 'axios';

@ApiTags('Paperless')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('paperless')
export class PaperlessController {
  constructor(private paperlessService: PaperlessService) {}

  @Get('status')
  @ApiOperation({ summary: 'Paperless-Verbindung testen' })
  testConnection(@CurrentUser() user: User) {
    return this.paperlessService.testConnection(user.tenantId);
  }

  @Get('documents')
  @ApiOperation({ summary: 'Dokumente aus Paperless abrufen' })
  getDocuments(
    @CurrentUser() user: User,
    @Query('page') page?: number,
    @Query('search') search?: string,
    @Query('tags') tags?: string,
  ) {
    return this.paperlessService.getDocuments(user.tenantId, { page, search, tags });
  }

  @Get('documents/:id')
  @ApiOperation({ summary: 'Einzelnes Dokument abrufen' })
  getDocument(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.paperlessService.getDocument(user.tenantId, id);
  }

  @Get('documents/:id/urls')
  @ApiOperation({ summary: 'Download- und Preview-URL' })
  getDocumentUrls(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.paperlessService.getDocumentUrls(user.tenantId, id);
  }

  /**
   * Proxy: lädt Dokument von Paperless und streamt es zum Browser.
   * Löst das 401-Problem weil der Auth-Header serverseitig gesetzt wird.
   */
  @Get('documents/:id/preview')
  @ApiOperation({ summary: 'Dokument-Vorschau (proxied durch Backend)' })
  async previewDocument(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const { http, baseUrl } = await this.paperlessService.getHttpClient(user.tenantId);
    const url = `${baseUrl.replace(/\/$/, '')}/api/documents/${id}/preview/`;
    const upstream = await axios.get(url, {
      headers: { Authorization: (http.defaults.headers as any).Authorization },
      responseType: 'stream',
    });
    res.setHeader('Content-Type', upstream.headers['content-type'] ?? 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="document-${id}.pdf"`);
    upstream.data.pipe(res);
  }

  @Get('documents/:id/download')
  @ApiOperation({ summary: 'Dokument-Download (proxied durch Backend)' })
  async downloadDocument(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const { http, baseUrl } = await this.paperlessService.getHttpClient(user.tenantId);
    const url = `${baseUrl.replace(/\/$/, '')}/api/documents/${id}/download/`;
    const upstream = await axios.get(url, {
      headers: { Authorization: (http.defaults.headers as any).Authorization },
      responseType: 'stream',
    });
    const disposition = upstream.headers['content-disposition'] ?? `attachment; filename="document-${id}.pdf"`;
    res.setHeader('Content-Type', upstream.headers['content-type'] ?? 'application/pdf');
    res.setHeader('Content-Disposition', disposition);
    upstream.data.pipe(res);
  }

  @Post('documents/upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Dokument hochladen' })
  async uploadDocument(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: {
      title?: string; correspondentName?: string;
      documentTypeName?: string; tagNames?: string; created?: string;
    },
  ) {
    const documentId = await this.paperlessService.uploadWithMetadata(
      user.tenantId, file.buffer, file.originalname, file.mimetype,
      {
        title: body.title ?? file.originalname,
        correspondentName: body.correspondentName,
        documentTypeName: body.documentTypeName,
        tagNames: body.tagNames?.split(',').map((t) => t.trim()).filter(Boolean),
        created: body.created,
      },
    );
    return { documentId };
  }

  @Delete('documents/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Dokument löschen' })
  deleteDocument(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.paperlessService.deleteDocument(user.tenantId, id);
  }

  @Get('tags')
  getTags(@CurrentUser() user: User) {
    return this.paperlessService.getTags(user.tenantId);
  }

  @Get('correspondents')
  getCorrespondents(@CurrentUser() user: User) {
    return this.paperlessService.getCorrespondents(user.tenantId);
  }
}
