import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import type { Request } from 'express';
import { mergeMap } from 'rxjs';
import { AuthUser } from '../auth/decorators';
import { PrismaService } from '../prisma/prisma.service';
import { AUDIT_ACTION } from './audit.decorator';

type AuditedRequest = Request & { user?: AuthUser };

/** @Audit() işaretli uçlarda, işlem başarılı olunca denetim kaydı yazar (hata olursa kayıt yok). */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly log = new Logger('Audit');

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  intercept(ctx: ExecutionContext, next: CallHandler) {
    const action = this.reflector.get<string | undefined>(AUDIT_ACTION, ctx.getHandler());
    if (!action) return next.handle();
    const req = ctx.switchToHttp().getRequest<AuditedRequest>();
    return next.handle().pipe(
      mergeMap(async (result: unknown) => {
        // İşlem yapıldı; kayıt yazılamazsa isteği bozma, logla.
        await this.record(action, req, result).catch((e: Error) => this.log.error(`${action} kaydedilemedi: ${e.message}`));
        return result;
      }),
    );
  }

  private record(action: string, req: AuditedRequest, result: unknown) {
    const r = (result ?? {}) as { id?: unknown; key?: unknown };
    const entityId = r.id ?? r.key ?? req.params.slug ?? req.params.key ?? '?';
    const body = req.body && typeof req.body === 'object' && Object.keys(req.body).length ? (req.body as Prisma.InputJsonObject) : undefined;
    return this.prisma.auditLog.create({
      data: {
        actorId: req.user?.id ?? 'anonymous',
        action,
        entityType: action.split('.')[0],
        entityId: String(entityId),
        diff: body,
      },
    });
  }
}
