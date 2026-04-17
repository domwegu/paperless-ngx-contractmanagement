import {
  Injectable, NotFoundException, ConflictException,
  ForbiddenException, UnauthorizedException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async create(dto: CreateUserDto, actingUser?: User): Promise<User> {
    // Nur super_admin darf anderen Mandanten zuweisen
    if (dto.tenantId && actingUser?.role !== UserRole.SUPER_ADMIN) {
      if (dto.tenantId !== actingUser?.tenantId) {
        throw new ForbiddenException('Kein Zugriff auf fremden Mandanten');
      }
    }
    // Admin darf keinen super_admin anlegen
    if (dto.role === UserRole.SUPER_ADMIN && actingUser?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Nur Super-Admin darf Super-Admins anlegen');
    }

    const exists = await this.userRepo.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('E-Mail bereits vergeben');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.userRepo.create({
      ...dto,
      passwordHash,
      tenantId: dto.tenantId ?? actingUser?.tenantId,
    });
    return this.userRepo.save(user);
  }

  async findAll(tenantId?: string): Promise<User[]> {
    const where = tenantId ? { tenantId } : {};
    return this.userRepo.find({ where, relations: ['tenant'], order: { lastName: 'ASC' } });
  }

  async findOne(id: string, tenantId?: string): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { id, ...(tenantId ? { tenantId } : {}) },
      relations: ['tenant'],
    });
    if (!user) throw new NotFoundException('Benutzer nicht gefunden');
    return user;
  }

  async update(id: string, dto: UpdateUserDto, tenantId?: string): Promise<User> {
    const user = await this.findOne(id, tenantId);
    // Rolle super_admin kann nicht von außen gesetzt werden
    if ((dto as any).role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Rolle super_admin kann nicht gesetzt werden');
    }
    Object.assign(user, dto);
    return this.userRepo.save(user);
  }

  async remove(id: string, tenantId?: string): Promise<void> {
    const user = await this.findOne(id, tenantId);
    user.isActive = false;
    await this.userRepo.save(user);
  }

  async resetPassword(id: string, newPassword: string, tenantId?: string): Promise<{ message: string }> {
    const user = await this.userRepo.findOne({
      where: { id, ...(tenantId ? { tenantId } : {}) },
      select: ['id', 'tenantId'],
    });
    if (!user) throw new NotFoundException('Benutzer nicht gefunden');
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.userRepo.update(id, { passwordHash });
    return { message: 'Passwort erfolgreich zurückgesetzt' };
  }

  async changeOwnPassword(id: string, currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const user = await this.userRepo.findOne({
      where: { id },
      select: ['id', 'passwordHash'],
    });
    if (!user) throw new NotFoundException('Benutzer nicht gefunden');
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Aktuelles Passwort falsch');
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.userRepo.update(id, { passwordHash });
    return { message: 'Passwort erfolgreich geändert' };
  }
}
