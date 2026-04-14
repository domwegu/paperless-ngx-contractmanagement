import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards, ParseUUIDPipe, HttpCode, HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdatePaperlessSettingsDto } from './dto/update-paperless-settings.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';
import { User } from '../users/user.entity';
import { PaperlessService } from '../paperless/paperless.service';

@ApiTags('Tenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tenants')
export class TenantsController {
  constructor(
    private tenantsService: TenantsService,
    private paperlessService: PaperlessService,
  ) {}

  // ─── CRUD (nur Super-Admin) ───────────────────

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Neuen Mandanten anlegen' })
  create(@Body() dto: CreateTenantDto) {
    return this.tenantsService.create(dto);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Alle Mandanten abrufen' })
  findAll() {
    return this.tenantsService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Mandant nach ID abrufen' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Mandant aktualisieren' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: Partial<CreateTenantDto>) {
    return this.tenantsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Mandant deaktivieren' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantsService.remove(id);
  }

  // ─── Paperless-Einstellungen ──────────────────
  // TENANT_ADMIN darf die eigenen Paperless-Settings pflegen

  @Get('my/paperless-settings')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Eigene Paperless-Einstellungen abrufen (ohne Token)' })
  getMyPaperlessSettings(@CurrentUser() user: User) {
    return this.tenantsService.findOne(user.tenantId);
  }

  @Patch('my/paperless-settings')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Paperless Base-URL und API-Token für eigenen Mandanten setzen' })
  updateMyPaperlessSettings(
    @CurrentUser() user: User,
    @Body() dto: UpdatePaperlessSettingsDto,
  ) {
    return this.tenantsService.update(user.tenantId, {
      paperlessBaseUrl:  dto.paperlessBaseUrl,
      paperlessApiToken: dto.paperlessApiToken,
    });
  }

  @Post('my/paperless-settings/test')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Paperless-Verbindung testen' })
  testMyPaperlessConnection(@CurrentUser() user: User) {
    return this.paperlessService.testConnection(user.tenantId);
  }
}
