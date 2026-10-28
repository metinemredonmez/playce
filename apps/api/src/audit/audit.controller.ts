import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiPropertyOptional, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Roles } from '../auth/decorators';
import { PrismaService } from '../prisma/prisma.service';

export class AuditQuery {
  @ApiPropertyOptional({ example: 'event' }) @IsOptional() @IsString() @MaxLength(40) entityType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) entityId?: string;
  @ApiPropertyOptional({ description: 'Kullanıcı id ya da "admin-key"' }) @IsOptional() @IsString() @MaxLength(40) actor?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) cursor?: string;
  @ApiPropertyOptional({ default: 50 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
}

@ApiTags('admin')
@ApiBearerAuth()
@ApiSecurity('admin-key')
@Roles('ADMIN')
@Controller('admin/audit')
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  /** Denetim kaydı, yeniden eskiye → { items, nextCursor } */
  @Get()
  async list(@Query() q: AuditQuery) {
    const take = q.limit ?? 50;
    const rows = await this.prisma.auditLog.findMany({
      where: { entityType: q.entityType, entityId: q.entityId, actorId: q.actor },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
    });
    const actors = await this.prisma.user.findMany({
      where: { id: { in: [...new Set(rows.map((r) => r.actorId))] } },
      select: { id: true, email: true, name: true },
    });
    const items = rows.slice(0, take).map((r) => ({ ...r, actor: actors.find((a) => a.id === r.actorId) ?? null }));
    return { items, nextCursor: rows.length > take ? items[items.length - 1].id : null };
  }
}
