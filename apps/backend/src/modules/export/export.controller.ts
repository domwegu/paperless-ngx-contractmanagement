import {
  Controller, Get, Post, Delete, Res, UseGuards,
  Param, Body, ParseUUIDPipe, Req, UnauthorizedException
} from '@nestjs/common';
import { Response, Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ExportService } from './export.service';
import { ApiTokenService } from './api-token.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/user.entity';

class CreateTokenDto {
  @ApiProperty({ example: 'Excel Power Query' })
  @IsString() @IsNotEmpty()
  name: string;
}

/** Guard der sowohl JWT als auch API-Token akzeptiert */
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { ApiTokenService as ATS } from './api-token.service';

@Injectable()
class ExportAuthGuard implements CanActivate {
  constructor(private apiTokenService: ATS) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request & { exportTenantId?: string }>();
    const auth = req.headers.authorization ?? '';

    // API-Token: "Bearer vv_..."
    if (auth.startsWith('Bearer vv_')) {
      const rawToken = auth.slice(7);
      const entity   = await this.apiTokenService.validate(rawToken);
      if (!entity) throw new UnauthorizedException('Ungültiger oder abgelaufener API-Token');
      req.exportTenantId = entity.tenantId;
      return true;
    }

    // Kein vv_-Token → wird vom JwtAuthGuard geprüft (user ist dann gesetzt)
    return true;
  }
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

  private getTenantId(req: any, user?: User): string {
    if (req.exportTenantId) return req.exportTenantId;
    if (user?.tenantId) return user.tenantId;
    throw new UnauthorizedException('Kein Mandant ermittelbar');
  }

  @Get('contracts.json')
  @UseGuards(ExportAuthGuard, JwtAuthGuard)
  @ApiOperation({ summary: 'Vertragsdaten als JSON (Power Query Live-Link)' })
  async contractsJson(@Req() req: any, @CurrentUser() user?: User) {
    return this.exportService.getContractsJson(this.getTenantId(req, user));
  }

  @Get('contracts.xlsx')
  @UseGuards(ExportAuthGuard)
  @ApiOperation({ summary: 'Vertragsdaten als Excel' })
  async contractsXlsx(@Req() req: any, @Res() res: Response, @CurrentUser() user?: User) {
    const tenantId = req.exportTenantId ?? user?.tenantId;
    if (!tenantId) throw new UnauthorizedException();
    const buffer   = await this.exportService.generateXlsx(tenantId);
    const filename = `Vertraege_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Get('contracts.pdf')
  @UseGuards(ExportAuthGuard)
  @ApiOperation({ summary: 'Vertragsliste als PDF' })
  async contractsPdf(@Req() req: any, @Res() res: Response, @CurrentUser() user?: User) {
    const tenantId = req.exportTenantId ?? user?.tenantId;
    if (!tenantId) throw new UnauthorizedException();
    const buffer   = await this.exportService.generatePdf(tenantId);
    const filename = `Vertraege_${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  // ─── API-Token Verwaltung (nur JWT) ──────────

  @Get('tokens')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Eigene API-Tokens auflisten' })
  listTokens(@CurrentUser() user: User) {
    return this.apiTokenService.findAll(user.tenantId);
  }

  @Post('tokens')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Neuen API-Token generieren (5 Jahre gültig)' })
  async createToken(@Body() dto: CreateTokenDto, @CurrentUser() user: User) {
    return this.apiTokenService.generate(user.tenantId, dto.name);
  }

  @Delete('tokens/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'API-Token widerrufen' })
  revokeToken(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.apiTokenService.revoke(id, user.tenantId);
  }
}
