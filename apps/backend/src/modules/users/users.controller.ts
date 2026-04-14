import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards, ParseUUIDPipe
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, UserRole } from './user.entity';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Neuen Benutzer anlegen' })
  create(@Body() dto: CreateUserDto, @CurrentUser() user: User) {
    return this.usersService.create(dto, user);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Alle Benutzer des Mandanten abrufen' })
  findAll(@CurrentUser() user: User) {
    const tenantId = user.role === UserRole.SUPER_ADMIN ? undefined : user.tenantId;
    return this.usersService.findAll(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Einzelnen Benutzer abrufen' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    const tenantId = user.role === UserRole.SUPER_ADMIN ? undefined : user.tenantId;
    return this.usersService.findOne(id, tenantId);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Benutzer aktualisieren' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: User,
  ) {
    const tenantId = user.role === UserRole.SUPER_ADMIN ? undefined : user.tenantId;
    return this.usersService.update(id, dto, tenantId);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Benutzer deaktivieren (Soft Delete)' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    const tenantId = user.role === UserRole.SUPER_ADMIN ? undefined : user.tenantId;
    return this.usersService.remove(id, tenantId);
  }
}
