import {
  Controller, Get, Post, Delete, Res, UseGuards,
  Param, Body, ParseUUIDPipe, Req, UnauthorizedException,
  Injectable, CanActivate, ExecutionContext
} from '@nestjs/common';
import { Response, Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ExportService } from './export.service';
import { ApiTokenService } from './api-token.service';
import { ExportAuthGuard } from './export-auth.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/user.entity';

class CreateTokenDto {
  @ApiProperty({ example: 'Excel Power Query' })
  @IsString() @IsNotEmpty()
  name: string;
}

@ApiTags('Export')
@ApiBearerAuth()
@Controller('export')
export class ExportController {
  constructor(
    private exportService: ExportService,
    private apiTokenService: ApiTokenService,
  ) {}

  // ─── Export-Endpunkte (JWT oder API-Token) ───

  private resolveTenantId(req: any, user?: User): string {
    if (req.exportTenantId) return req.exportTenantId;
    if (user?.tenantId)     return user.tenantId;
    if (req.user?.tenantId) return req.user.tenantId;
    throw new UnauthorizedException('Nicht authentifiziert');
  }

  @Get('contracts.json')
  @UseGuards(ExportAuthGuard)
  @ApiOperation({ summary: 'Vertragsdaten als JSON (Power Query)' })
  async contractsJson(@Req() req: Request, @CurrentUser() user: User) {
    const tenantId = this.resolveTenantId(req, user);
    return this.exportService.getContractsJson(tenantId);
  }

  @Get('contracts.xlsx')
  @UseGuards(ExportAuthGuard)
  @ApiOperation({ summary: 'Vertragsdaten als Excel' })
  async contractsXlsx(@Req() req: Request, @Res() res: Response, @CurrentUser() user?: User) {
    const tenantId = this.resolveTenantId(req, user);
    const buffer   = await this.exportService.generateXlsx(tenantId);
    const filename = `Vertraege_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Get('contracts.pdf')
  @UseGuards(ExportAuthGuard)
  @ApiOperation({ summary: 'Vertragsliste als PDF' })
  async contractsPdf(@Req() req: Request, @Res() res: Response, @CurrentUser() user?: User) {
    const tenantId = this.resolveTenantId(req, user);
    const buffer   = await this.exportService.generatePdf(tenantId);
    const filename = `Vertraege_${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  // ─── API-Token Verwaltung (nur JWT) ──────────

  @Get('tokens')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'API-Tokens auflisten' })
  listTokens(@CurrentUser() user: User) {
    return this.apiTokenService.findAll(user.tenantId);
  }

  @Post('tokens')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'API-Token generieren' })
  createToken(@Body() dto: CreateTokenDto, @CurrentUser() user: User) {
    return this.apiTokenService.generate(user.tenantId, dto.name);
  }

  @Delete('tokens/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'API-Token widerrufen' })
  revokeToken(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.apiTokenService.revoke(id, user.tenantId);
  }
}
