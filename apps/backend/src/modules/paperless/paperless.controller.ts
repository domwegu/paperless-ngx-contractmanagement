import {
  Controller, Get, Post, Delete, Query, Param,
  UseGuards, UseInterceptors, UploadedFile,
  ParseIntPipe, Body
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { PaperlessService } from './paperless.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, UserRole } from '../users/user.entity';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Paperless')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('paperless')
export class PaperlessController {
  constructor(private paperlessService: PaperlessService) {}

  @Get('status')
  @ApiOperation({ summary: 'Paperless-Verbindung für den eigenen Mandanten testen' })
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
  @ApiOperation({ summary: 'Einzelnes Dokument aus Paperless abrufen' })
  getDocument(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.paperlessService.getDocument(user.tenantId, id);
  }

  @Get('documents/:id/urls')
  @ApiOperation({ summary: 'Download- und Preview-URL für ein Dokument' })
  getDocumentUrls(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.paperlessService.getDocumentUrls(user.tenantId, id);
  }

  @Post('documents/upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Dokument nach Paperless hochladen' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file:             { type: 'string', format: 'binary' },
        title:            { type: 'string' },
        correspondentName: { type: 'string' },
        documentTypeName: { type: 'string' },
        tagNames:         { type: 'string', description: 'Kommagetrennte Tag-Namen' },
        created:          { type: 'string', example: '2024-01-15' },
      },
    },
  })
  async uploadDocument(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: {
      title?: string;
      correspondentName?: string;
      documentTypeName?: string;
      tagNames?: string;
      created?: string;
    },
  ) {
    const documentId = await this.paperlessService.uploadWithMetadata(
      user.tenantId,
      file.buffer,
      file.originalname,
      file.mimetype,
      {
        title:            body.title ?? file.originalname,
        correspondentName: body.correspondentName,
        documentTypeName:  body.documentTypeName,
        tagNames:          body.tagNames?.split(',').map((t) => t.trim()).filter(Boolean),
        created:           body.created,
      },
    );
    return { documentId };
  }

  @Delete('documents/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Dokument aus Paperless löschen (nur Admins)' })
  deleteDocument(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.paperlessService.deleteDocument(user.tenantId, id);
  }

  @Get('tags')
  @ApiOperation({ summary: 'Alle Paperless-Tags des Mandanten abrufen' })
  getTags(@CurrentUser() user: User) {
    return this.paperlessService.getTags(user.tenantId);
  }

  @Get('correspondents')
  @ApiOperation({ summary: 'Alle Korrespondenten aus Paperless abrufen' })
  getCorrespondents(@CurrentUser() user: User) {
    return this.paperlessService.getCorrespondents(user.tenantId);
  }
}
