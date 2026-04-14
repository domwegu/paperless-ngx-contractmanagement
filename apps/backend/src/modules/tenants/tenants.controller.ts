import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards, ParseUUIDPipe
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

@ApiTags('Tenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)        // Mandanten-Verwaltung nur für Super-Admins
@Controller('tenants')
export class TenantsController {
  constructor(private tenantsService: TenantsService) {}

  @Post()
  @ApiOperation({ summary: 'Neuen Mandanten anlegen' })
  create(@Body() dto: CreateTenantDto) {
    return this.tenantsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Alle Mandanten abrufen' })
  findAll() {
    return this.tenantsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Mandant nach ID abrufen' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mandant aktualisieren (z.B. Paperless-Token)' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: Partial<CreateTenantDto>) {
    return this.tenantsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Mandant deaktivieren' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantsService.remove(id);
  }
}
