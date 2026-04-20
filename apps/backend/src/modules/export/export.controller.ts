import { Controller, Get, Res, UseGuards, Query } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ExportService } from './export.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/user.entity';

@ApiTags('Export')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('export')
export class ExportController {
  constructor(private exportService: ExportService) {}

  @Get('contracts.json')
  @ApiOperation({ summary: 'Vertragsdaten als JSON (für Power Query Live-Link)' })
  async contractsJson(@CurrentUser() user: User) {
    return this.exportService.getContractsJson(user.tenantId);
  }

  @Get('contracts.xlsx')
  @ApiOperation({ summary: 'Vertragsdaten als Excel-Datei' })
  async contractsXlsx(@CurrentUser() user: User, @Res() res: Response) {
    const buffer = await this.exportService.generateXlsx(user.tenantId);
    const filename = `Vertraege_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Get('contracts.pdf')
  @ApiOperation({ summary: 'Vertragsliste als PDF' })
  async contractsPdf(@CurrentUser() user: User, @Res() res: Response) {
    const buffer = await this.exportService.generatePdf(user.tenantId);
    const filename = `Vertraege_${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}
