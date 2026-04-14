import {
  Injectable, NotFoundException, ConflictException, ForbiddenException
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
    // Nur Super-Admin darf andere Mandanten zuweisen
    if (dto.tenantId && actingUser?.role !== UserRole.SUPER_ADMIN) {
      if (dto.tenantId !== actingUser?.tenantId) {
        throw new ForbiddenException('Kein Zugriff auf fremden Mandanten');
      }
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
    return this.userRepo.find({ where, relations: ['tenant'] });
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
    Object.assign(user, dto);
    return this.userRepo.save(user);
  }

  async remove(id: string, tenantId?: string): Promise<void> {
    const user = await this.findOne(id, tenantId);
    // Soft-Delete: nur deaktivieren
    user.isActive = false;
    await this.userRepo.save(user);
  }
}
