import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  Query, UseGuards, ParseUUIDPipe, UseInterceptors,
  UploadedFile, HttpCode, HttpStatus
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags, ApiOperation, ApiBearerAuth,
  ApiConsumes, ApiBody, ApiQuery
} from '@nestjs/swagger';
import { ContractsService } from './contracts.service';
import { DocumentsService } from '../documents/documents.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { ContractFilterDto } from './dto/contract-filter.dto';
import { UploadDocumentDto } from '../documents/dto/upload-document.dto';
import { DocumentType } from '../documents/contract-document.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, UserRole } from '../users/user.entity';

@ApiTags('Contracts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('contracts')
export class ContractsController {
  constructor(
    private contractsService: ContractsService,
    private documentsService: DocumentsService,
  ) {}

  // ─── Verträge ────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Neuen Vertrag anlegen' })
  create(@Body() dto: CreateContractDto, @CurrentUser() user: User) {
    return this.contractsService.create(user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Verträge abrufen (gefiltert + paginiert)' })
  findAll(@Query() filter: ContractFilterDto, @CurrentUser() user: User) {
    return this.contractsService.findAll(user.tenantId, filter);
  }

  @Get('deadlines')
  @ApiOperation({ summary: 'Anstehende Kündigungsfristen (Dashboard)' })
  @ApiQuery({ name: 'withinDays', required: false, type: Number, description: 'Default: 90 Tage' })
  getDeadlines(
    @CurrentUser() user: User,
    @Query('withinDays') withinDays?: number,
  ) {
    return this.contractsService.getUpcomingDeadlines(user.tenantId, withinDays ?? 90);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Einzelnen Vertrag abrufen (inkl. Dokumente + Rechnungen)' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.contractsService.findOne(id, user.tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Vertrag aktualisieren' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContractDto,
    @CurrentUser() user: User,
  ) {
    return this.contractsService.update(id, user.tenantId, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Vertrag als gekündigt markieren' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.contractsService.remove(id, user.tenantId);
  }

  // ─── Dokumente zum Vertrag ────────────────────

  @Post(':id/documents')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Dokument (Vertrag/Nachtrag/Anlage) hochladen → automatisch nach Paperless' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file:  { type: 'string', format: 'binary' },
        type:  { type: 'string', enum: Object.values(DocumentType) },
        title: { type: 'string' },
        notes: { type: 'string' },
      },
    },
  })
  uploadDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadDocumentDto,
  ) {
    return this.documentsService.uploadContractDocument(
      user.tenantId,
      id,
      file,
      body.type ?? DocumentType.CONTRACT,
      body.title,
      body.notes,
    );
  }

  @Get(':id/documents')
  @ApiOperation({ summary: 'Alle Dokumente eines Vertrags abrufen' })
  getDocuments(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.documentsService.findByContract(id, user.tenantId);
  }

  @Get(':contractId/documents/:docId/urls')
  @ApiOperation({ summary: 'Paperless Download- und Preview-URL für ein Dokument' })
  getDocumentUrls(
    @Param('docId', ParseUUIDPipe) docId: string,
    @CurrentUser() user: User,
  ) {
    return this.documentsService.getDocumentUrls(docId, user.tenantId);
  }

  @Delete(':contractId/documents/:docId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Dokument aus Vertrag und Paperless löschen' })
  removeDocument(
    @Param('docId', ParseUUIDPipe) docId: string,
    @CurrentUser() user: User,
  ) {
    return this.documentsService.remove(docId, user.tenantId);
  }
}
