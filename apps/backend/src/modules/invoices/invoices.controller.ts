import {
  Controller, Get, Post, Patch, Body, Param,
  UseGuards, ParseUUIDPipe, UseInterceptors,
  UploadedFile, HttpCode, HttpStatus
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoiceStatus } from './invoice.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/user.entity';
import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class UpdateStatusDto {
  @ApiProperty({ enum: InvoiceStatus })
  @IsEnum(InvoiceStatus)
  status: InvoiceStatus;
}

@ApiTags('Invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('contracts/:contractId/invoices')
export class InvoicesController {
  constructor(private invoicesService: InvoicesService) {}

  @Post()
  @ApiOperation({ summary: 'Rechnung manuell einem Vertrag zuordnen (ohne Scan)' })
  create(
    @Param('contractId', ParseUUIDPipe) contractId: string,
    @Body() dto: CreateInvoiceDto,
    @CurrentUser() user: User,
  ) {
    return this.invoicesService.create(user.tenantId, contractId, dto);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Rechnungs-Scan hochladen → automatisch nach Paperless + Vertrag zuordnen' })
  uploadInvoice(
    @Param('contractId', ParseUUIDPipe) contractId: string,
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateInvoiceDto,
  ) {
    return this.invoicesService.uploadAndAssign(user.tenantId, contractId, file, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Alle Rechnungen eines Vertrags' })
  findAll(
    @Param('contractId', ParseUUIDPipe) contractId: string,
    @CurrentUser() user: User,
  ) {
    return this.invoicesService.findByContract(contractId, user.tenantId);
  }

  @Patch(':invoiceId')
  @ApiOperation({ summary: 'Rechnungsdaten bearbeiten' })
  update(
    @Param('contractId', ParseUUIDPipe) contractId: string,
    @Param('invoiceId', ParseUUIDPipe) invoiceId: string,
    @Body() dto: UpdateInvoiceDto,
    @CurrentUser() user: User,
  ) {
    return this.invoicesService.update(invoiceId, user.tenantId, dto);
  }

  @Patch(':invoiceId/status')
  @ApiOperation({ summary: 'Rechnungsstatus aktualisieren (offen/bezahlt/überfällig)' })
  updateStatus(
    @Param('invoiceId', ParseUUIDPipe) invoiceId: string,
    @Body() dto: UpdateStatusDto,
    @CurrentUser() user: User,
  ) {
    return this.invoicesService.updateStatus(invoiceId, user.tenantId, dto.status);
  }
}
